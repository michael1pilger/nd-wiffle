function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
const clean=v=>String(v??"").trim();
function accessEmail(request){
  const direct=clean(request.headers.get("Cf-Access-Authenticated-User-Email"));
  if(direct)return direct.toLowerCase();
  const token=clean(request.headers.get("Cf-Access-Jwt-Assertion"));
  if(!token)return "";
  try{
    const p=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
    const padded=p+"=".repeat((4-p.length%4)%4);
    const payload=JSON.parse(atob(padded));
    return clean(payload.email||payload.common_name).toLowerCase();
  }catch{return ""}
}
async function schemaReady(DB){try{await DB.prepare("SELECT 1 FROM captain_access LIMIT 1").first();await DB.prepare("SELECT 1 FROM captain_availability LIMIT 1").first();return true}catch{return false}}
async function captainRecord(DB,season,email){return await DB.prepare(`
  SELECT ca.season,ca.email,ca.team_id,ca.display_name,t.display_name AS team_name
  FROM captain_access ca JOIN teams t ON t.team_id=ca.team_id
  WHERE ca.season=? AND lower(ca.email)=lower(?)
  LIMIT 1
`).bind(season,email).first()}
export async function onRequestGet(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await schemaReady(DB)))return json({ok:false,code:"CAPTAIN_SCHEMA_MISSING",error:"Captain portal schema is not installed. Run migrations/0022_captain_availability.sql."},503);
  const season=Number(new URL(context.request.url).searchParams.get("season")||2026),email=accessEmail(context.request);
  if(!email)return json({ok:false,error:"Cloudflare Access email was not available for this request."},401);
  const captain=await captainRecord(DB,season,email);
  if(!captain)return json({ok:false,code:"CAPTAIN_NOT_ASSIGNED",error:`${email} is authenticated but is not assigned to a 2026 team.`},403);
  const [availability,scheduled]=await DB.batch([
    DB.prepare(`SELECT availability_id,availability_date,start_time,end_time,notes,updated_at FROM captain_availability WHERE season=? AND team_id=? AND availability_date>=date('now') ORDER BY availability_date,start_time`).bind(season,captain.team_id),
    DB.prepare(`SELECT ss.pair_key,ss.team_a_id,ss.team_b_id,ss.series_date,ss.series_time,ss.location,ta.display_name AS team_a,tb.display_name AS team_b FROM scheduled_series ss JOIN teams ta ON ta.team_id=ss.team_a_id JOIN teams tb ON tb.team_id=ss.team_b_id WHERE ss.season=? AND (ss.team_a_id=? OR ss.team_b_id=?) AND ss.series_date>=date('now') ORDER BY ss.series_date,COALESCE(ss.series_time,'23:59')`).bind(season,captain.team_id,captain.team_id)
  ]);
  return json({ok:true,build:"v75",season,captain,availability:availability.results||[],scheduled:scheduled.results||[]});
}
export async function onRequestPost(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await schemaReady(DB)))return json({ok:false,code:"CAPTAIN_SCHEMA_MISSING",error:"Captain portal schema is not installed."},503);
  let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
  const season=Number(body.season||2026),email=accessEmail(context.request);
  if(!email)return json({ok:false,error:"Cloudflare Access email was not available."},401);
  const captain=await captainRecord(DB,season,email);if(!captain)return json({ok:false,error:"Authenticated email is not assigned to a team."},403);
  const windows=Array.isArray(body.windows)?body.windows:[];
  const cleaned=[];
  for(const w of windows){
    const date=clean(w.date),start=clean(w.start),end=clean(w.end),notes=clean(w.notes);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end))continue;
    if(end<=start)continue;
    cleaned.push({date,start,end,notes:notes.slice(0,180)});
  }
  await DB.prepare("DELETE FROM captain_availability WHERE season=? AND team_id=? AND availability_date>=date('now')").bind(season,captain.team_id).run();
  if(cleaned.length){
    await DB.batch(cleaned.map(w=>DB.prepare(`INSERT INTO captain_availability(season,team_id,captain_email,availability_date,start_time,end_time,notes) VALUES(?,?,?,?,?,?,?)`).bind(season,captain.team_id,email,w.date,w.start,w.end,w.notes||null)));
  }
  return json({ok:true,season,team_id:captain.team_id,saved:cleaned.length});
}
