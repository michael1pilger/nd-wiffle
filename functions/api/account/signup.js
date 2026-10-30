import {json,makePassword,normalizeEmail} from "../_account.js";
export async function onRequestPost(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be JSON."},400)}
  const email=normalizeEmail(body.email),password=String(body.password||""),playerId=String(body.player_id||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({ok:false,error:"Enter a valid email address."},422);
  if(password.length<8||password.length>128)return json({ok:false,error:"Password must be 8–128 characters."},422);
  if(!playerId)return json({ok:false,error:"Select your league player profile."},422);
  try{
    const player=await DB.prepare(`SELECT p.player_id,p.name FROM players p JOIN team_rosters tr ON tr.player_id=p.player_id WHERE p.player_id=? AND tr.season=2026 LIMIT 1`).bind(playerId).first();
    if(!player)return json({ok:false,error:"That 2026 player profile could not be found."},404);
    const taken=await DB.prepare("SELECT email,player_id FROM user_accounts WHERE email=? COLLATE NOCASE OR player_id=? LIMIT 1").bind(email,playerId).first();
    if(taken)return json({ok:false,error:taken.player_id===playerId?"That player profile has already been claimed.":"An account already exists for that email."},409);
    const pw=await makePassword(password),id=crypto.randomUUID();
    await DB.prepare(`INSERT INTO user_accounts(user_id,player_id,email,password_salt,password_hash,password_iterations) VALUES(?,?,?,?,?,?)`).bind(id,playerId,email,pw.salt,pw.hash,pw.iterations).run();
    return json({ok:true,user_id:id,player_id:playerId,player_name:player.name,message:"Account created. Log in to receive your 1,000 starter tokens."},201);
  }catch(err){const m=String(err?.message||err);if(m.includes("no such table"))return json({ok:false,error:"Player accounts are not enabled yet. Run migration 0034."},503);return json({ok:false,error:"Account creation failed.",detail:m},500)}
}
