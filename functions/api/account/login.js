import {json,verifyPassword,normalizeEmail,createSession,sessionCookie} from "../_account.js";
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be JSON."},400)}
 const email=normalizeEmail(body.email),password=String(body.password||"");
 try{
  const row=await DB.prepare("SELECT * FROM user_accounts WHERE email=? COLLATE NOCASE LIMIT 1").bind(email).first();
  if(!row||!row.active||!(await verifyPassword(password,row)))return json({ok:false,error:"Invalid email or password."},401);
  let starterGranted=false;
  if(!Number(row.starter_tokens_granted||0)){
    const up=await DB.prepare("UPDATE user_accounts SET token_balance=token_balance+1000,starter_tokens_granted=1 WHERE user_id=? AND starter_tokens_granted=0").bind(row.user_id).run();
    if(Number(up.meta?.changes||0)>0){const b=await DB.prepare("SELECT token_balance FROM user_accounts WHERE user_id=?").bind(row.user_id).first();await DB.prepare("INSERT INTO token_ledger(user_id,amount,reason,balance_after,note) VALUES(?,1000,'starter',?,'First-login starter tokens')").bind(row.user_id,Number(b?.token_balance||1000)).run();starterGranted=true}
  }
  await DB.prepare("UPDATE user_accounts SET last_login_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(row.user_id).run();
  const sess=await createSession(DB,row.user_id),fresh=await DB.prepare(`SELECT ua.user_id,ua.player_id,ua.email,ua.token_balance,p.name AS player_name FROM user_accounts ua JOIN players p ON p.player_id=ua.player_id WHERE ua.user_id=?`).bind(row.user_id).first();
  return json({ok:true,user:fresh,starter_tokens_granted:starterGranted},200,{"set-cookie":sessionCookie(sess.token)});
 }catch(err){const m=String(err?.message||err);if(m.includes("no such table"))return json({ok:false,error:"Player accounts are not enabled yet. Run migration 0034."},503);return json({ok:false,error:"Login failed.",detail:m},500)}
}
