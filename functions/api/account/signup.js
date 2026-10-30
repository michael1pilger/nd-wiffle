import {json,makePassword,normalizeEmail} from "../_account.js";

const REQUIRED_ACCOUNT_COLUMNS=[
  "user_id","player_id","display_name","account_type","email","password_salt","password_hash","password_iterations",
  "token_balance","starter_tokens_granted","active","created_at","last_login_at"
];

async function accountSchemaStatus(DB){
  try{
    const r=await DB.prepare("SELECT name FROM pragma_table_info('user_accounts')").all();
    const cols=new Set((r.results||[]).map(x=>String(x.name)));
    return {ready:REQUIRED_ACCOUNT_COLUMNS.every(x=>cols.has(x)),missing:REQUIRED_ACCOUNT_COLUMNS.filter(x=>!cols.has(x)),columns:[...cols]};
  }catch(err){
    return {ready:false,missing:REQUIRED_ACCOUNT_COLUMNS,columns:[],error:String(err?.message||err)};
  }
}
function friendlyDbError(message){
  const m=String(message||"");
  if(/no such table/i.test(m))return "The account tables are missing. Run migrations 0034 and 0035 against the production D1 database.";
  if(/no column|has no column/i.test(m))return "The account schema is outdated. Run migration 0035 on the production D1 database.";
  if(/UNIQUE constraint failed: user_accounts\.player_id/i.test(m))return "That player profile has already been claimed.";
  if(/UNIQUE constraint failed: user_accounts\.email/i.test(m))return "An account already exists for that email.";
  if(/FOREIGN KEY constraint failed|foreign key mismatch/i.test(m))return "The selected player profile could not be linked to the account database.";
  return null;
}

export async function onRequestPost(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);

  let body;
  try{body=await context.request.json()}
  catch{return json({ok:false,error:"Request body must be JSON."},400)}

  const email=normalizeEmail(body.email),password=String(body.password||"");
  const requestedPlayer=String(body.player_id||"").trim();
  const guest=body.account_type==="guest"||requestedPlayer==="__guest__";
  const playerId=guest?null:requestedPlayer;
  const displayName=guest?String(body.display_name||"").trim():null;

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({ok:false,error:"Enter a valid email address."},422);
  if(password.length<8||password.length>128)return json({ok:false,error:"Password must be 8–128 characters."},422);
  if(guest){
    if(displayName.length<2||displayName.length>40)return json({ok:false,error:"Enter a display name between 2 and 40 characters."},422);
  }else if(!playerId){
    return json({ok:false,error:"Select your player profile or choose Not an active player."},422);
  }

  let stage="schema_check";
  try{
    const schema=await accountSchemaStatus(DB);
    if(!schema.ready){
      return json({
        ok:false,
        error:"Player account database setup is incomplete.",
        detail:schema.missing.length?`Missing user_accounts columns: ${schema.missing.join(", ")}. Run migration 0035.`:(schema.error||"Migration 0035 is not fully applied."),
        code:"ACCOUNT_SCHEMA_INCOMPLETE"
      },503);
    }

    let player=null;
    if(!guest){
      stage="player_lookup";
      player=await DB.prepare(`
        SELECT p.player_id,p.name
        FROM players p
        JOIN team_rosters tr ON tr.player_id=p.player_id
        WHERE p.player_id=? AND tr.season=2026
        LIMIT 1
      `).bind(playerId).first();
      if(!player)return json({ok:false,error:"That 2026 player profile could not be found.",code:"PLAYER_NOT_FOUND"},404);
    }

    stage="duplicate_check";
    const taken=await DB.prepare(`
      SELECT email,player_id
      FROM user_accounts
      WHERE email=? COLLATE NOCASE OR (? IS NOT NULL AND player_id=?)
      LIMIT 1
    `).bind(email,playerId,playerId).first();
    if(taken){
      const samePlayer=playerId&&taken.player_id===playerId;
      return json({
        ok:false,
        error:samePlayer?"That player profile has already been claimed.":"An account already exists for that email.",
        code:samePlayer?"PLAYER_ALREADY_CLAIMED":"EMAIL_ALREADY_USED"
      },409);
    }

    stage="password_hash";
    const pw=await makePassword(password);

    stage="account_insert";
    const id=crypto.randomUUID();
    await DB.prepare(`
      INSERT INTO user_accounts(
        user_id,player_id,display_name,account_type,email,password_salt,password_hash,password_iterations
      ) VALUES(?,?,?,?,?,?,?,?)
    `).bind(id,playerId,displayName,guest?"guest":"player",email,pw.salt,pw.hash,pw.iterations).run();

    return json({
      ok:true,user_id:id,player_id:playerId,account_type:guest?"guest":"player",
      player_name:player?.name||displayName,account_name:player?.name||displayName,
      message:"Account created. Log in to receive your 1,000 starter tokens."
    },201);
  }catch(err){
    const raw=String(err?.message||err),friendly=friendlyDbError(raw);
    return json({
      ok:false,
      error:friendly||`Account creation failed during ${stage.replace(/_/g," ")}.`,
      detail:raw,
      code:"ACCOUNT_CREATE_FAILED",
      stage
    },500);
  }
}
