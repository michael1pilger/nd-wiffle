
function json(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
const clean=v=>String(v??"").trim();
const pairKey=(a,b)=>[a,b].sort().join("__");
async function schemaReady(DB){try{await DB.prepare("SELECT 1 FROM scheduled_series LIMIT 1").first();return true}catch{return false}}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 if(!(await schemaReady(DB)))return json({ok:false,code:"SCHEDULE_SCHEMA_MISSING",error:"Series scheduler is not installed. Run migrations/0017_scheduled_series.sql."},503);
 const season=Number(new URL(context.request.url).searchParams.get("season")||2026);
 try{
  const [teams,scheduled,completed,umpires]=await DB.batch([
   DB.prepare("SELECT team_id,display_name FROM teams WHERE active_2026=1 ORDER BY display_name"),
   DB.prepare(`
    SELECT ss.*,ta.display_name AS team_a,tb.display_name AS team_b
    FROM scheduled_series ss
    JOIN teams ta ON ta.team_id=ss.team_a_id
    JOIN teams tb ON tb.team_id=ss.team_b_id
    WHERE ss.season=?
    ORDER BY ss.series_date,COALESCE(ss.series_time,'23:59'),ta.display_name,tb.display_name
   `).bind(season),
   DB.prepare(`
    SELECT series_id,series_date,away_team_id,home_team_id
    FROM series WHERE season=? ORDER BY series_date,series_id
   `).bind(season),
   DB.prepare(`
    SELECT p.player_id,p.name
    FROM players p
    WHERE lower(p.name) IN (
      lower('Jimmy Szpak'),
      lower('Joey Thomalla'),
      lower('Will Stevens'),
      lower('Michael Pilger'),
      lower('Brendan Mato')
    )
    ORDER BY CASE lower(p.name)
      WHEN lower('Jimmy Szpak') THEN 1
      WHEN lower('Joey Thomalla') THEN 2
      WHEN lower('Will Stevens') THEN 3
      WHEN lower('Michael Pilger') THEN 4
      WHEN lower('Brendan Mato') THEN 5
      ELSE 99
    END
   `)
  ]);
  let captain_availability=[];
  try{
    const ar=await DB.prepare(`
      SELECT ca.team_id,t.display_name AS team_name,ca.availability_date,ca.start_time,ca.end_time,ca.notes,ca.captain_email
      FROM captain_availability ca
      JOIN teams t ON t.team_id=ca.team_id
      WHERE ca.season=? AND ca.availability_date>=date('now')
      ORDER BY ca.availability_date,ca.start_time,t.display_name
    `).bind(season).all();
    captain_availability=ar.results||[];
  }catch{}
  const umpireOptions=[...(umpires.results||[]),{player_id:"__other__",name:"Other"}];
  return json({ok:true,build:"v90",season,teams:teams.results||[],scheduled:scheduled.results||[],completed:completed.results||[],umpires:umpireOptions,captain_availability,actor_email:context.data.actorEmail||null});
 }catch(err){return json({ok:false,error:"Schedule query failed.",detail:String(err?.message||err)},500)}
}
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 if(!(await schemaReady(DB)))return json({ok:false,code:"SCHEDULE_SCHEMA_MISSING",error:"Series scheduler is not installed. Run migrations/0017_scheduled_series.sql."},503);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
 const action=clean(body.action||"save"),season=Number(body.season||2026),actor=context.data.actorEmail||"unknown-access-user";
 if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:"Invalid season."},400);
 if(action==="delete"){
  const key=clean(body.pair_key);
  if(!key)return json({ok:false,error:"pair_key is required."},422);
  await DB.prepare("DELETE FROM scheduled_series WHERE season=? AND pair_key=?").bind(season,key).run();
  return json({ok:true,action:"deleted",season,pair_key:key});
 }
 if(action!=="save")return json({ok:false,error:"Unsupported action."},400);
 const a=clean(body.team_a_id),b=clean(body.team_b_id),date=clean(body.series_date),time=clean(body.series_time),
       location=clean(body.location),notes=clean(body.notes),umpire_player_id=clean(body.umpire_player_id),umpire_name=clean(body.umpire_name);
 if(!a||!b||a===b)return json({ok:false,error:"Choose two different teams."},422);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({ok:false,error:"A valid series date is required."},422);
 if(time&&!/^\d{2}:\d{2}$/.test(time))return json({ok:false,error:"Time must use HH:MM format."},422);
 const teamRows=await DB.prepare("SELECT team_id FROM teams WHERE team_id IN (?,?) AND active_2026=1").bind(a,b).all();
 if((teamRows.results||[]).length!==2)return json({ok:false,error:"Unknown or inactive team."},422);
 let verifiedUmpireName=umpire_name;
 let storedUmpirePlayerId=umpire_player_id;
 if(umpire_player_id==="__other__"){
   storedUmpirePlayerId="";
   verifiedUmpireName=umpire_name||"Other";
 }else if(umpire_player_id){
   const allowedNames=["jimmy szpak","joey thomalla","will stevens","michael pilger","brendan mato"];
   const ur=await DB.prepare("SELECT player_id,name FROM players WHERE player_id=?").bind(umpire_player_id).first();
   if(!ur||!allowedNames.includes(String(ur.name||"").toLowerCase())){
     return json({ok:false,error:"That player is not an eligible umpire."},422);
   }
   verifiedUmpireName=ur.name;
 }
 const key=pairKey(a,b),ids=[a,b].sort();
 await DB.prepare(`
  INSERT INTO scheduled_series(season,pair_key,team_a_id,team_b_id,series_date,series_time,location,notes,updated_by,umpire_player_id,umpire_name)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(season,pair_key) DO UPDATE SET
    team_a_id=excluded.team_a_id,team_b_id=excluded.team_b_id,
    series_date=excluded.series_date,series_time=excluded.series_time,
    location=excluded.location,notes=excluded.notes,umpire_player_id=excluded.umpire_player_id,umpire_name=excluded.umpire_name,
    updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by
 `).bind(season,key,ids[0],ids[1],date,time||null,location||null,notes||null,actor,storedUmpirePlayerId||null,verifiedUmpireName||null).run();
 return json({ok:true,action:"saved",season,pair_key:key});
}
