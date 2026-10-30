import {json,makePassword,normalizeEmail} from "../_account.js";

const REQUIRED_ACCOUNT_COLUMNS=[
  "user_id","player_id","email","password_salt","password_hash","password_iterations",
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
  if(/no such table/i.test(m))return "The player-account tables are missing. Run migration 0034 against the production D1 database.";
  if(/no column|has no column/i.test(m))return "The player-account schema is incomplete or outdated. Re-run/repair migration 0034 on the production D1 database.";
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

  const email=normalizeEmail(body.email),password=String(body.password||""),playerId=String(body.player_id||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({ok:false,error:"Enter a valid email address."},422);
  if(password.length<8||password.length>128)return json({ok:false,error:"Password must be 8–128 characters."},422);
  if(!playerId)return json({ok:false,error:"Select your league player profile."},422);

  let stage="schema_check";
  try{
    const schema=await accountSchemaStatus(DB);
    if(!schema.ready){
      return json({
        ok:false,
        error:"Player account database setup is incomplete.",
        detail:schema.missing.length?`Missing user_accounts columns: ${schema.missing.join(", ")}`:(schema.error||"Migration 0034 is not fully applied."),
        code:"ACCOUNT_SCHEMA_INCOMPLETE"
      },503);
    }

    stage="player_lookup";
    const player=await DB.prepare(`
      SELECT p.player_id,p.name
      FROM players p
      JOIN team_rosters tr ON tr.player_id=p.player_id
      WHERE p.player_id=? AND tr.season=2026
      LIMIT 1
    `).bind(playerId).first();
    if(!player)return json({ok:false,error:"That 2026 player profile could not be found.",code:"PLAYER_NOT_FOUND"},404);

    stage="duplicate_check";
    const taken=await DB.prepare(`
      SELECT email,player_id
      FROM user_accounts
      WHERE email=? COLLATE NOCASE OR player_id=?
      LIMIT 1
    `).bind(email,playerId).first();
    if(taken){
      return json({
        ok:false,
        error:taken.player_id===playerId?"That player profile has already been claimed.":"An account already exists for that email.",
        code:taken.player_id===playerId?"PLAYER_ALREADY_CLAIMED":"EMAIL_ALREADY_USED"
      },409);
    }

    stage="password_hash";
    const pw=await makePassword(password);

    stage="account_insert";
    const id=crypto.randomUUID();
    await DB.prepare(`
      INSERT INTO user_accounts(
        user_id,player_id,email,password_salt,password_hash,password_iterations
      ) VALUES(?,?,?,?,?,?)
    `).bind(id,playerId,email,pw.salt,pw.hash,pw.iterations).run();

    return json({
      ok:true,user_id:id,player_id:playerId,player_name:player.name,
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
