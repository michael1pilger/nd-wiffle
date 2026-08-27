function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
const clean=v=>String(v||"").trim();
function baseId(name){return clean(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"player"}
async function ready(DB){
 try{
  await DB.prepare("SELECT 1 FROM draft_slots LIMIT 1").first();
  await DB.prepare("SELECT 1 FROM draft_pool LIMIT 1").first();
  return true;
 }catch{return false}
}
async function rosterReady(DB){
 try{await DB.prepare("SELECT 1 FROM team_rosters LIMIT 1").first();return true}catch{return false}
}
async function state(DB,season){const [s,p,t,pl]=await DB.batch([DB.prepare(`SELECT ds.*,t.display_name team_name,p.name player_name FROM draft_slots ds JOIN teams t ON t.team_id=ds.team_id LEFT JOIN players p ON p.player_id=ds.selected_player_id WHERE ds.season=? ORDER BY ds.sequence`).bind(season),DB.prepare(`SELECT dp.*,p.name linked_name FROM draft_pool dp LEFT JOIN players p ON p.player_id=dp.player_id WHERE dp.season=? ORDER BY CASE WHEN dp.projected_pick IS NULL THEN 1 ELSE 0 END,dp.projected_pick,dp.name`).bind(season),DB.prepare("SELECT team_id,display_name,active_2026 FROM teams ORDER BY display_name"),DB.prepare("SELECT player_id,name,class_year,retired FROM players ORDER BY name")]);return{slots:s.results||[],pool:p.results||[],teams:t.results||[],players:pl.results||[]}}
async function resolvePlayer(DB,name,classYear){const e=await DB.prepare("SELECT player_id,name,class_year FROM players WHERE name=? COLLATE NOCASE").bind(name).first();if(e)return e;const cy=Number(classYear);if(!Number.isInteger(cy)||cy<2021||cy>2100)throw new Error("CLASS_YEAR_REQUIRED");let id=baseId(name),i=2;while(await DB.prepare("SELECT 1 FROM players WHERE player_id=?").bind(id).first())id=`${baseId(name)}_${i++}`;await DB.prepare("INSERT INTO players(player_id,name,class_year,retired) VALUES(?,?,?,0)").bind(id,name,cy).run();return{player_id:id,name,class_year:cy}}
async function rosterStatement(DB,season,playerId,teamId,actor){
 const existing=await DB.prepare("SELECT team_id,role FROM team_rosters WHERE season=? AND player_id=?").bind(season,playerId).first();
 if(existing){
  return DB.prepare("UPDATE team_rosters SET team_id=?,role='player',assigned_by=? WHERE season=? AND player_id=?").bind(teamId,actor,season,playerId);
 }
 return DB.prepare("INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(?,?,?,'player',?)").bind(season,playerId,teamId,actor);
}
export async function onRequestGet(context){const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);if(!(await ready(DB)))return json({ok:false,code:"DRAFT_SCHEMA_MISSING",error:"Run migrations/0011_final_2026_draft_board.sql on this D1 database."},503);if(!(await rosterReady(DB)))return json({ok:false,code:"TEAM_ROSTERS_SCHEMA_MISSING",error:"The team_rosters table is missing. Run migrations/0011_final_2026_draft_board.sql on this D1 database."},503);const season=Number(new URL(context.request.url).searchParams.get("season")||2026);try{return json({ok:true,build:"v64",season,actor_email:context.data.actorEmail||null,...await state(DB,season)})}catch(e){return json({ok:false,error:"Draft query failed.",detail:String(e?.message||e)},500)}}
export async function onRequestPost(context){const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);if(!(await ready(DB)))return json({ok:false,code:"DRAFT_SCHEMA_MISSING",error:"Run migrations/0011_final_2026_draft_board.sql on this D1 database."},503);if(!(await rosterReady(DB)))return json({ok:false,code:"TEAM_ROSTERS_SCHEMA_MISSING",error:"The team_rosters table is missing. Run migrations/0011_final_2026_draft_board.sql on this D1 database."},503);let b;try{b=await context.request.json()}catch{return json({ok:false,error:"Invalid JSON body."},400)}const season=Number(b.season||2026),actor=context.data.actorEmail||"unknown-access-user";try{
if(b.action==="add_prospect"){const name=clean(b.name),cy=b.class_year?Number(b.class_year):null;if(name.length<2)return json({ok:false,error:"Prospect name is required."},422);await DB.prepare(`INSERT INTO draft_pool(season,name,class_year,projected_pick,projected_series_played,projected_batter_rank,projected_pitcher_rank,status) VALUES(?,?,?,?,?,?,?,'available')`).bind(season,name,cy||null,b.projected_pick||null,b.projected_series_played||null,b.projected_batter_rank||null,b.projected_pitcher_rank||null).run();return json({ok:true,action:"added_prospect",...await state(DB,season)})}
if(b.action==="make_pick"){
 const pick=Number(b.pick_number),pid=Number(b.prospect_id);
 const slot=await DB.prepare("SELECT * FROM draft_slots WHERE season=? AND pick_number=?").bind(season,pick).first();
 if(!slot)return json({ok:false,error:"Draft pick not found."},404);
 if(slot.slot_type!=="pick")return json({ok:false,error:"This slot is not an active draft pick."},409);
 if(slot.selected_player_name)return json({ok:false,error:"This pick has already been filled."},409);
 const pool=await DB.prepare("SELECT * FROM draft_pool WHERE season=? AND prospect_id=?").bind(season,pid).first();
 if(!pool||pool.status!=="available")return json({ok:false,error:"That player is no longer available."},409);
 const requestedClass=b.class_year||pool.class_year||2030;
 let p;
 try{p=await resolvePlayer(DB,pool.name,requestedClass)}
 catch(e){
  if(String(e.message)==="CLASS_YEAR_REQUIRED")return json({ok:false,code:"CLASS_YEAR_REQUIRED",error:"Enter a valid class year before drafting this new player."},422);
  throw e;
 }
 const rosterStmt=await rosterStatement(DB,season,p.player_id,slot.team_id,actor);
 await DB.batch([
  DB.prepare("UPDATE draft_slots SET selected_player_id=?,selected_player_name=?,selected_class_year=?,selected_at=CURRENT_TIMESTAMP,selected_by=? WHERE season=? AND pick_number=?")
    .bind(p.player_id,p.name,p.class_year||requestedClass,actor,season,pick),
  DB.prepare("UPDATE draft_pool SET player_id=?,class_year=COALESCE(class_year,?),status='drafted' WHERE season=? AND prospect_id=?")
    .bind(p.player_id,p.class_year||requestedClass,season,pid),
  rosterStmt
 ]);
 return json({ok:true,action:"made_pick",pick_number:pick,player:p,team_id:slot.team_id,...await state(DB,season)});
}
if(b.action==="undo_pick"){const pick=Number(b.pick_number),slot=await DB.prepare("SELECT * FROM draft_slots WHERE season=? AND pick_number=?").bind(season,pick).first();if(!slot||slot.slot_type!=="pick"||!slot.selected_player_name)return json({ok:false,error:"No completed pick to undo."},409);const stm=[DB.prepare("UPDATE draft_slots SET selected_player_id=NULL,selected_player_name=NULL,selected_class_year=NULL,selected_at=NULL,selected_by=NULL WHERE season=? AND pick_number=?").bind(season,pick),DB.prepare("UPDATE draft_pool SET status='available' WHERE season=? AND (player_id=? OR name=? COLLATE NOCASE)").bind(season,slot.selected_player_id||"",slot.selected_player_name)];if(slot.selected_player_id)stm.push(DB.prepare("DELETE FROM team_rosters WHERE season=? AND player_id=? AND team_id=?").bind(season,slot.selected_player_id,slot.team_id));await DB.batch(stm);return json({ok:true,action:"undid_pick",pick_number:pick,...await state(DB,season)})}
if(b.action==="sync_reserved"){
 const rows=(await DB.prepare("SELECT * FROM draft_slots WHERE season=? AND slot_type='reserved'").bind(season).all()).results||[];
 let synced=0,missing=[];
 for(const r of rows){
  const p=await DB.prepare("SELECT player_id,name,class_year FROM players WHERE name=? COLLATE NOCASE").bind(r.reserved_player_name).first();
  if(!p){missing.push(r.reserved_player_name);continue}
  const rosterStmt=await rosterStatement(DB,season,p.player_id,r.team_id,actor);
  await DB.batch([
   DB.prepare("UPDATE draft_slots SET selected_player_id=?,selected_player_name=?,selected_class_year=?,selected_by=? WHERE season=? AND sequence=?")
    .bind(p.player_id,p.name,p.class_year||null,actor,season,r.sequence),
   rosterStmt
  ]);
  synced++;
 }
 return json({ok:true,action:"synced_reserved",synced,needs_registry_entry:missing,...await state(DB,season)});
}
return json({ok:false,error:"Unsupported draft action."},400)}catch(e){return json({ok:false,error:`Draft update failed: ${String(e?.message||e)}`,detail:String(e?.message||e)},500)}}
