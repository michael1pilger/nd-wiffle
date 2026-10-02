
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
  let exhibitions=[],exhibition_schema_ready=true;
  try{
    const er=await DB.prepare(`
      SELECT event_id,season,event_type,event_title,team_a_name,team_a_logo,team_b_name,team_b_logo,
             event_date,event_time,location,notes,updated_at
      FROM exhibition_events WHERE season=?
      ORDER BY event_date,COALESCE(event_time,'23:59'),event_title,team_a_name
    `).bind(season).all();
    exhibitions=er.results||[];
  }catch(err){
    exhibition_schema_ready=false;
  }
  const umpireOptions=[...(umpires.results||[]),{player_id:"__other__",name:"Other"}];
  return json({ok:true,build:"v129",season,teams:teams.results||[],scheduled:scheduled.results||[],completed:completed.results||[],exhibitions,exhibition_schema_ready,umpires:umpireOptions,captain_availability,actor_email:context.data.actorEmail||null});
 }catch(err){return json({ok:false,error:"Schedule query failed.",detail:String(err?.message||err)},500)}
}
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 if(!(await schemaReady(DB)))return json({ok:false,code:"SCHEDULE_SCHEMA_MISSING",error:"Series scheduler is not installed. Run migrations/0017_scheduled_series.sql."},503);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
 const action=clean(body.action||"save"),season=Number(body.season||2026),actor=context.data.actorEmail||"unknown-access-user";
 if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:"Invalid season."},400);

 if(action==="save_exhibition"){
  const type=clean(body.event_type),title=clean(body.event_title),aName=clean(body.team_a_name),bName=clean(body.team_b_name),
        aLogo=clean(body.team_a_logo),bLogo=clean(body.team_b_logo),date=clean(body.event_date),time=clean(body.event_time),
        location=clean(body.location),notes=clean(body.notes);
  if(!["all_star","exhibition"].includes(type))return json({ok:false,error:"Choose All-Star Game or Exhibition Game."},422);
  if(!aName||!bName)return json({ok:false,error:"Enter both exhibition team names."},422);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({ok:false,error:"A valid event date is required."},422);
  if(time&&!/^\d{2}:\d{2}$/.test(time))return json({ok:false,error:"Time must use HH:MM format."},422);
  let eventId=clean(body.event_id);
  if(!eventId){
    const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"event";
    eventId=`exh_${season}_${date}_${slug(title||`${aName}-${bName}`)}_${Date.now().toString(36)}`;
  }
  try{
   await DB.prepare(`
    INSERT INTO exhibition_events(event_id,season,event_type,event_title,team_a_name,team_a_logo,team_b_name,team_b_logo,event_date,event_time,location,notes,updated_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(event_id) DO UPDATE SET
      season=excluded.season,event_type=excluded.event_type,event_title=excluded.event_title,
      team_a_name=excluded.team_a_name,team_a_logo=excluded.team_a_logo,
      team_b_name=excluded.team_b_name,team_b_logo=excluded.team_b_logo,
      event_date=excluded.event_date,event_time=excluded.event_time,location=excluded.location,notes=excluded.notes,
      updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP
   `).bind(eventId,season,type,title||null,aName,aLogo||null,bName,bLogo||null,date,time||null,location||null,notes||null,actor).run();
   return json({ok:true,action:"saved_exhibition",season,event_id:eventId});
  }catch(err){
   const msg=String(err?.message||err);
   if(msg.includes("no such table"))return json({ok:false,code:"EXHIBITION_SCHEMA_MISSING",error:"Special-event scheduling is not installed. Run migrations/0027_exhibition_events.sql."},503);
   return json({ok:false,error:"Could not save special event.",detail:msg},500);
  }
 }
 if(action==="delete_exhibition"){
  const eventId=clean(body.event_id);if(!eventId)return json({ok:false,error:"event_id is required."},422);
  try{await DB.prepare("DELETE FROM exhibition_events WHERE event_id=? AND season=?").bind(eventId,season).run();return json({ok:true,action:"deleted_exhibition",event_id:eventId});}
  catch(err){const msg=String(err?.message||err);if(msg.includes("no such table"))return json({ok:false,code:"EXHIBITION_SCHEMA_MISSING",error:"Special-event scheduling is not installed. Run migrations/0027_exhibition_events.sql."},503);return json({ok:false,error:"Could not remove special event.",detail:msg},500)}
 }

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
