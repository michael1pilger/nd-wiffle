
import {json,clean,buildSlate,scoreEntries,isLocked} from "../_fantasy.js";
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 const u=new URL(context.request.url),date=clean(u.searchParams.get("date"));
 if(!validDate(date))return json({ok:false,error:"A YYYY-MM-DD date is required."},400);
 try{
  const slate=await buildSlate(DB,date),leaderboard=await scoreEntries(DB,date);
  return json({ok:true,build:"v65",date,...slate,leaderboard});
 }catch(err){
  const msg=String(err?.message||err);
  if(msg.includes("no such table"))return json({ok:false,code:"FANTASY_SCHEMA_MISSING",error:"Daily Fantasy is not installed yet. Run migrations/0020_daily_fantasy.sql."},503);
  return json({ok:false,error:"Fantasy slate failed.",detail:msg},500);
 }
}
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
 const date=clean(body.date),name=clean(body.display_name),bat=Array.isArray(body.batters)?body.batters:[],pit=Array.isArray(body.pitchers)?body.pitchers:[];
 if(!validDate(date))return json({ok:false,error:"Invalid slate date."},422);
 if(name.length<1||name.length>40)return json({ok:false,error:"Enter a name or Instagram handle (40 characters max)."},422);
 if(bat.length!==3||new Set(bat).size!==3)return json({ok:false,error:"Select exactly 3 different batters."},422);
 if(pit.length!==2||new Set(pit).size!==2)return json({ok:false,error:"Select exactly 2 different pitchers."},422);
 // The same player may appear once as a batter and once as a pitcher.
 try{
  const slate=await buildSlate(DB,date);
  if(slate.locked)return json({ok:false,code:"SLATE_LOCKED",error:"This Daily Fantasy slate is locked."},423);
  const byId=new Map(slate.players.map(p=>[p.player_id,p]));
  for(const id of bat)if(!byId.get(id)?.batting_eligible)return json({ok:false,error:"One selected batter is not eligible for this slate."},422);
  for(const id of pit)if(!byId.get(id)?.pitching_eligible)return json({ok:false,error:"One selected pitcher is not eligible for this slate."},422);
  const key=name.toLowerCase().replace(/\s+/g," ").trim();
  await DB.prepare(`
   INSERT INTO fantasy_entries(slate_date,display_name,display_key)
   VALUES(?,?,?)
   ON CONFLICT(slate_date,display_key) DO UPDATE SET display_name=excluded.display_name,updated_at=CURRENT_TIMESTAMP
  `).bind(date,name,key).run();
  const entry=await DB.prepare("SELECT entry_id FROM fantasy_entries WHERE slate_date=? AND display_key=?").bind(date,key).first();
  const stmts=[DB.prepare("DELETE FROM fantasy_picks WHERE entry_id=?").bind(entry.entry_id)];
  bat.forEach((id,i)=>stmts.push(DB.prepare("INSERT INTO fantasy_picks(entry_id,slot_type,slot_number,player_id,multiplier) VALUES(?,'bat',?,?,?)").bind(entry.entry_id,i+1,id,byId.get(id).batting_multiplier)));
  pit.forEach((id,i)=>stmts.push(DB.prepare("INSERT INTO fantasy_picks(entry_id,slot_type,slot_number,player_id,multiplier) VALUES(?,'pit',?,?,?)").bind(entry.entry_id,i+1,id,byId.get(id).pitching_multiplier)));
  await DB.batch(stmts);
  return json({ok:true,action:"saved",entry_id:entry.entry_id,locked:false});
 }catch(err){return json({ok:false,error:"Could not save fantasy lineup.",detail:String(err?.message||err)},500)}
}
