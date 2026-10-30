function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
const n=v=>Number(v||0);
const REQUIRED={
  user_accounts:["user_id","player_id","email","token_balance","starter_tokens_granted","active","created_at","last_login_at"],
  user_sessions:["session_hash","user_id","expires_at"],
  prediction_markets:["market_id","title","status","options_json"],
  prediction_wagers:["wager_id","market_id","user_id","stake","status","payout"],
  token_ledger:["ledger_id","user_id","amount","reason","balance_after"]
};

async function schemaStatus(DB){
  const tables={};let ready=true;
  for(const [table,required] of Object.entries(REQUIRED)){
    try{
      const r=await DB.prepare(`SELECT name FROM pragma_table_info('${table}')`).all();
      const cols=(r.results||[]).map(x=>String(x.name)),set=new Set(cols),missing=required.filter(x=>!set.has(x));
      tables[table]={exists:cols.length>0,columns:cols,missing,ready:cols.length>0&&!missing.length};
      if(!tables[table].ready)ready=false;
    }catch(err){
      tables[table]={exists:false,columns:[],missing:required,ready:false,error:String(err?.message||err)};
      ready=false;
    }
  }
  return {ready,tables};
}
function prepareScoped(DB,sql,userId){
  const stmt=DB.prepare(sql);
  return userId?stmt.bind(userId):stmt;
}

export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);

  const url=new URL(context.request.url),userId=String(url.searchParams.get("user_id")||"").trim();

  try{
    const schema=await schemaStatus(DB);
    if(!schema.ready){
      return json({
        ok:true,schema_ready:false,schema,
        summary:{accounts:0,active_accounts:0,total_tokens:0,pending_wagers:0,pending_stake:0},
        accounts:[],wagers:[],ledger:[],exposure:[]
      });
    }

    const accountSql=`
      SELECT ua.user_id,ua.player_id,ua.email,ua.token_balance,ua.starter_tokens_granted,ua.active,
             ua.created_at,ua.last_login_at,p.name AS player_name,t.display_name AS team_name,
             (SELECT COUNT(*) FROM prediction_wagers w WHERE w.user_id=ua.user_id) AS wager_count,
             (SELECT COALESCE(SUM(w.stake),0) FROM prediction_wagers w WHERE w.user_id=ua.user_id) AS total_staked,
             (SELECT COALESCE(SUM(w.payout),0) FROM prediction_wagers w WHERE w.user_id=ua.user_id) AS total_payout,
             (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id=ua.user_id AND datetime(s.expires_at)>datetime('now')) AS active_sessions
      FROM user_accounts ua
      JOIN players p ON p.player_id=ua.player_id
      LEFT JOIN team_rosters tr ON tr.player_id=ua.player_id AND tr.season=2026
      LEFT JOIN teams t ON t.team_id=tr.team_id
      ${userId?"WHERE ua.user_id=?":""}
      ORDER BY ua.created_at DESC`;

    const wagerSql=`
      SELECT w.wager_id,w.market_id,w.user_id,w.option_key,w.option_label,w.stake,w.decimal_odds,
             w.potential_payout,w.status,w.payout,w.created_at,w.settled_at,
             m.title AS market_title,m.market_type,m.status AS market_status,
             p.name AS player_name,ua.email
      FROM prediction_wagers w
      JOIN prediction_markets m ON m.market_id=w.market_id
      JOIN user_accounts ua ON ua.user_id=w.user_id
      JOIN players p ON p.player_id=ua.player_id
      ${userId?"WHERE w.user_id=?":""}
      ORDER BY w.created_at DESC
      LIMIT 300`;

    const ledgerSql=`
      SELECT l.ledger_id,l.user_id,l.amount,l.reason,l.market_id,l.wager_id,l.balance_after,l.note,l.created_at,
             p.name AS player_name,ua.email
      FROM token_ledger l
      JOIN user_accounts ua ON ua.user_id=l.user_id
      JOIN players p ON p.player_id=ua.player_id
      ${userId?"WHERE l.user_id=?":""}
      ORDER BY l.created_at DESC
      LIMIT 300`;

    const exposureSql=`
      SELECT m.market_id,m.title,m.status,w.option_key,w.option_label,
             COUNT(*) AS wager_count,COALESCE(SUM(w.stake),0) AS stake,
             COALESCE(SUM(w.potential_payout),0) AS potential_payout
      FROM prediction_markets m
      JOIN prediction_wagers w ON w.market_id=m.market_id
      WHERE w.status='pending'
      GROUP BY m.market_id,m.title,m.status,w.option_key,w.option_label
      ORDER BY m.created_at DESC,w.option_label`;

    const [accountsRes,wagersRes,ledgerRes,exposureRes]=await DB.batch([
      prepareScoped(DB,accountSql,userId),
      prepareScoped(DB,wagerSql,userId),
      prepareScoped(DB,ledgerSql,userId),
      DB.prepare(exposureSql)
    ]);

    const accounts=accountsRes.results||[],wagers=wagersRes.results||[],ledger=ledgerRes.results||[],exposure=exposureRes.results||[];
    const summary={
      accounts:accounts.length,
      active_accounts:accounts.filter(x=>n(x.active)===1).length,
      total_tokens:accounts.reduce((a,x)=>a+n(x.token_balance),0),
      pending_wagers:wagers.filter(x=>x.status==="pending").length,
      pending_stake:wagers.filter(x=>x.status==="pending").reduce((a,x)=>a+n(x.stake),0)
    };

    return json({ok:true,schema_ready:true,schema,summary,accounts,wagers,ledger,exposure});
  }catch(err){
    return json({ok:false,error:"Account administration failed.",detail:String(err?.message||err)},500);
  }
}

export async function onRequestPost(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);

  let body;
  try{body=await context.request.json()}
  catch{return json({ok:false,error:"Request body must be JSON."},400)}

  const action=String(body.action||""),userId=String(body.user_id||"").trim(),actor=context.data.actorEmail||"unknown-access-user";
  if(!userId)return json({ok:false,error:"user_id is required."},422);

  try{
    const account=await DB.prepare("SELECT user_id,token_balance,active FROM user_accounts WHERE user_id=?").bind(userId).first();
    if(!account)return json({ok:false,error:"Account not found."},404);

    if(action==="adjust_tokens"){
      const amount=Number(body.amount);
      if(!Number.isInteger(amount)||amount===0||Math.abs(amount)>100000){
        return json({ok:false,error:"Adjustment must be a non-zero whole number between -100,000 and 100,000."},422);
      }
      const note=String(body.note||"Commissioner token adjustment").trim().slice(0,240);
      const result=await DB.prepare(
        "UPDATE user_accounts SET token_balance=token_balance+? WHERE user_id=? AND token_balance+?>=0"
      ).bind(amount,userId,amount).run();
      if(n(result.meta?.changes)!==1)return json({ok:false,error:"Adjustment would make the balance negative."},409);

      const fresh=await DB.prepare("SELECT token_balance FROM user_accounts WHERE user_id=?").bind(userId).first();
      await DB.prepare(
        "INSERT INTO token_ledger(user_id,amount,reason,balance_after,note) VALUES(?,?,'admin_adjustment',?,?)"
      ).bind(userId,amount,n(fresh.token_balance),`${note} · ${actor}`).run();

      return json({ok:true,action,balance:n(fresh.token_balance)});
    }

    if(action==="set_active"){
      const active=body.active?1:0;
      await DB.prepare("UPDATE user_accounts SET active=? WHERE user_id=?").bind(active,userId).run();
      if(!active)await DB.prepare("DELETE FROM user_sessions WHERE user_id=?").bind(userId).run();
      return json({ok:true,action,active});
    }

    if(action==="revoke_sessions"){
      const r=await DB.prepare("DELETE FROM user_sessions WHERE user_id=?").bind(userId).run();
      return json({ok:true,action,sessions_revoked:n(r.meta?.changes)});
    }

    return json({ok:false,error:"Unsupported account action."},400);
  }catch(err){
    return json({ok:false,error:"Account action failed.",detail:String(err?.message||err)},500);
  }
}
