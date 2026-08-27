
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
  const [teams,scheduled]=await DB.batch([
   DB.prepare("SELECT team_id,display_name FROM teams WHERE active_2026=1 ORDER BY display_name"),
   DB.prepare(`
    SELECT ss.*,ta.display_name AS team_a,tb.display_name AS team_b
    FROM scheduled_series ss
    JOIN teams ta ON ta.team_id=ss.team_a_id
    JOIN teams tb ON tb.team_id=ss.team_b_id
    WHERE ss.season=?
    ORDER BY ss.series_date,COALESCE(ss.series_time,'23:59'),ta.display_name,tb.display_name
   `).bind(season)
  ]);
  return json({ok:true,build:"v66",season,teams:teams.results||[],scheduled:scheduled.results||[],actor_email:context.data.actorEmail||null});
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
       location=clean(body.location),notes=clean(body.notes);
 if(!a||!b||a===b)return json({ok:false,error:"Choose two different teams."},422);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({ok:false,error:"A valid series date is required."},422);
 if(time&&!/^\d{2}:\d{2}$/.test(time))return json({ok:false,error:"Time must use HH:MM format."},422);
 const teamRows=await DB.prepare("SELECT team_id FROM teams WHERE team_id IN (?,?) AND active_2026=1").bind(a,b).all();
 if((teamRows.results||[]).length!==2)return json({ok:false,error:"Unknown or inactive team."},422);
 const key=pairKey(a,b),ids=[a,b].sort();
 await DB.prepare(`
  INSERT INTO scheduled_series(season,pair_key,team_a_id,team_b_id,series_date,series_time,location,notes,updated_by)
  VALUES(?,?,?,?,?,?,?,?,?)
  ON CONFLICT(season,pair_key) DO UPDATE SET
    team_a_id=excluded.team_a_id,team_b_id=excluded.team_b_id,
    series_date=excluded.series_date,series_time=excluded.series_time,
    location=excluded.location,notes=excluded.notes,
    updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by
 `).bind(season,key,ids[0],ids[1],date,time||null,location||null,notes||null,actor).run();
 return json({ok:true,action:"saved",season,pair_key:key});
}
