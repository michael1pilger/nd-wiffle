function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
const clean=v=>String(v??"").trim();
const pairKey=(a,b)=>[a,b].sort().join("__");
function jwtEmail(token){
  token=clean(token);if(!token)return "";
  try{
    const part=token.split(".")[1];if(!part)return "";
    const p=part.replace(/-/g,"+").replace(/_/g,"/");
    const padded=p+"=".repeat((4-p.length%4)%4);
    const payload=JSON.parse(atob(padded));
    return clean(payload.email||payload.common_name).toLowerCase();
  }catch{return ""}
}
async function accessIdentity(context){
  try{
    if(context.access&&typeof context.access.getIdentity==="function"){
      const identity=await context.access.getIdentity();
      const email=clean(identity?.email).toLowerCase();
      if(email)return {email,source:"context.access"};
    }
  }catch{}
  const direct=clean(context.request.headers.get("Cf-Access-Authenticated-User-Email")).toLowerCase();
  if(direct)return {email:direct,source:"email-header"};
  const assertion=clean(context.request.headers.get("Cf-Access-Jwt-Assertion"));
  const fromAssertion=jwtEmail(assertion);
  if(fromAssertion)return {email:fromAssertion,source:"jwt-header"};
  const cookie=context.request.headers.get("Cookie")||"";
  const hasAccessCookie=/(?:^|;\s*)CF_Authorization=/.test(cookie);
  return {email:"",source:"none",hasAccessCookie,hasAssertion:!!assertion,host:new URL(context.request.url).hostname};
}
async function schemaReady(DB){try{await DB.prepare("SELECT 1 FROM captain_access LIMIT 1").first();await DB.prepare("SELECT 1 FROM captain_availability LIMIT 1").first();return true}catch{return false}}
async function captainRecord(DB,season,email){return await DB.prepare(`
  SELECT ca.season,ca.email,ca.team_id,ca.display_name,t.display_name AS team_name
  FROM captain_access ca JOIN teams t ON t.team_id=ca.team_id
  WHERE ca.season=? AND lower(ca.email)=lower(?)
  LIMIT 1
`).bind(season,email).first()}
function noIdentity(id){
  const preview=/\.pages\.dev$/i.test(id.host||"");
  const hint=preview
    ? "This request is using a pages.dev preview hostname. Test the portal at https://ndwiffle.com/captains so the ndwiffle.com Access application can run."
    : id.hasAccessCookie
      ? "A CF_Authorization cookie reached the browser request, but Cloudflare did not forward a verified Access identity to the Function. Confirm the Access application destination covers ndwiffle.com/captains* (including /captains/api) and that the Allow policy is attached to that application."
      : "Cloudflare Access did not appear to run on this request. Confirm the self-hosted Access application protects ndwiffle.com/captains* and test on the custom ndwiffle.com hostname.";
  return json({ok:false,code:"ACCESS_IDENTITY_MISSING",error:"Cloudflare Access did not provide an authenticated email for this request.",hint,diagnostic:{host:id.host,access_cookie:id.hasAccessCookie,access_assertion:id.hasAssertion}},401);
}
export async function onRequestGet(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await schemaReady(DB)))return json({ok:false,code:"CAPTAIN_SCHEMA_MISSING",error:"Captain portal schema is not installed. Run migrations/0022_captain_availability.sql."},503);
  const season=Number(new URL(context.request.url).searchParams.get("season")||2026),id=await accessIdentity(context);
  if(!id.email)return noIdentity(id);
  const captain=await captainRecord(DB,season,id.email);
  if(!captain)return json({ok:false,code:"CAPTAIN_NOT_ASSIGNED",error:`${id.email} is authenticated but is not assigned to a 2026 team.`},403);
  const [teams,availability,scheduled,completed]=await DB.batch([
    DB.prepare(`SELECT team_id,display_name FROM teams WHERE active_2026=1 ORDER BY display_name`),
    DB.prepare(`
      SELECT ca.availability_id,ca.team_id,t.display_name AS team_name,ca.captain_email,
             ca.availability_date,ca.start_time,ca.end_time,ca.notes,ca.updated_at
      FROM captain_availability ca
      JOIN teams t ON t.team_id=ca.team_id
      WHERE ca.season=? AND ca.availability_date BETWEEN '2026-09-06' AND '2026-09-19'
      ORDER BY ca.availability_date,ca.start_time,t.display_name
    `).bind(season),
    DB.prepare(`
      SELECT ss.pair_key,ss.team_a_id,ss.team_b_id,ss.series_date,ss.series_time,ss.location,
             ta.display_name AS team_a,tb.display_name AS team_b
      FROM scheduled_series ss
      JOIN teams ta ON ta.team_id=ss.team_a_id
      JOIN teams tb ON tb.team_id=ss.team_b_id
      WHERE ss.season=?
      ORDER BY ss.series_date,COALESCE(ss.series_time,'23:59')
    `).bind(season),
    DB.prepare(`SELECT series_id,series_date,away_team_id,home_team_id FROM series WHERE season=? ORDER BY series_date,series_id`).bind(season)
  ]);
  const allAvailability=availability.results||[];
  const allScheduled=scheduled.results||[];
  const ownAvailability=allAvailability.filter(x=>x.team_id===captain.team_id);
  const ownScheduled=allScheduled.filter(x=>x.team_a_id===captain.team_id||x.team_b_id===captain.team_id);
  const completedPairs=[...new Set((completed.results||[]).map(x=>pairKey(x.away_team_id,x.home_team_id)))];
  const scheduledPairs=[...new Set(allScheduled.map(x=>pairKey(x.team_a_id,x.team_b_id)))];
  return json({ok:true,build:"v78",season,captain,teams:teams.results||[],availability:ownAvailability,all_availability:allAvailability,scheduled:ownScheduled,all_scheduled:allScheduled,completed_pairs:completedPairs,scheduled_pairs:scheduledPairs});
}
export async function onRequestPost(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await schemaReady(DB)))return json({ok:false,code:"CAPTAIN_SCHEMA_MISSING",error:"Captain portal schema is not installed. Run migrations/0022_captain_availability.sql."},503);
  let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
  const season=Number(body.season||2026),id=await accessIdentity(context);
  if(!id.email)return noIdentity(id);
  const captain=await captainRecord(DB,season,id.email);if(!captain)return json({ok:false,error:"Authenticated email is not assigned to a team."},403);
  const windows=Array.isArray(body.windows)?body.windows:[];
  const cleaned=[];
  const toMin=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
  for(const w of windows){
    const date=clean(w.date),start=clean(w.start),end=clean(w.end),notes=clean(w.notes);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end))continue;
    if(date<"2026-09-06"||date>"2026-09-19")continue;
    const d=new Date(date+"T12:00:00Z"),weekend=d.getUTCDay()===0||d.getUTCDay()===6,s=toMin(start),e=toMin(end),first=weekend?11*60:15*60+30,lastStart=18*60+30,maxEnd=22*60;
    if(s<first||s>lastStart||s%15!==0||e%15!==0||e-s<90||e>maxEnd)continue;
    cleaned.push({date,start,end,notes:notes.slice(0,180)});
  }
  await DB.prepare("DELETE FROM captain_availability WHERE season=? AND team_id=? AND availability_date BETWEEN '2026-09-06' AND '2026-09-19'").bind(season,captain.team_id).run();
  if(cleaned.length){
    await DB.batch(cleaned.map(w=>DB.prepare(`INSERT INTO captain_availability(season,team_id,captain_email,availability_date,start_time,end_time,notes) VALUES(?,?,?,?,?,?,?)`).bind(season,captain.team_id,id.email,w.date,w.start,w.end,w.notes||null)));
  }
  return json({ok:true,build:"v78",season,team_id:captain.team_id,saved:cleaned.length});
}
