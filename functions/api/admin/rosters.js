
function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
const clean=v=>String(v||"").trim();
function baseId(name){
  return clean(name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"player";
}
async function ensureSchema(DB){
  try{await DB.prepare("SELECT 1 FROM team_rosters LIMIT 1").first();return true}
  catch{return false}
}
export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await ensureSchema(DB)))return json({
    ok:false,code:"ROSTER_SCHEMA_MISSING",
    error:"Roster table is not installed. Run migrations/0003_team_rosters.sql on this D1 database."
  },503);
  const season=Number(new URL(context.request.url).searchParams.get("season")||2026);
  if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:"Invalid season."},400);
  try{
    const [playersRes,teamsRes,rostersRes]=await DB.batch([
      DB.prepare("SELECT player_id,name,class_year,retired FROM players ORDER BY name"),
      DB.prepare("SELECT team_id,display_name,active_2026 FROM teams ORDER BY display_name"),
      DB.prepare(`
        SELECT tr.season,tr.player_id,p.name,p.class_year,tr.team_id,t.display_name AS team_name,tr.role
        FROM team_rosters tr
        JOIN players p ON p.player_id=tr.player_id
        JOIN teams t ON t.team_id=tr.team_id
        WHERE tr.season=?
        ORDER BY t.display_name,p.name
      `).bind(season)
    ]);
    return json({
      ok:true,build:"v63",season,
      actor_email:context.data.actorEmail||null,
      players:playersRes.results||[],
      teams:(teamsRes.results||[]).filter(t=>season===2026?Number(t.active_2026)===1:true),
      rosters:rostersRes.results||[]
    });
  }catch(err){return json({ok:false,error:"Roster query failed.",detail:String(err?.message||err)},500)}
}
export async function onRequestPost(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  if(!(await ensureSchema(DB)))return json({
    ok:false,code:"ROSTER_SCHEMA_MISSING",
    error:"Roster table is not installed. Run migrations/0003_team_rosters.sql on this D1 database."
  },503);
  let body;
  try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
  const season=Number(body.season||2026),actor=context.data.actorEmail||"unknown-access-user";
  if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:"Invalid season."},400);
  try{
    if(body.action==="create_player"){
      const name=clean(body.name),class_year=Number(body.class_year),team_id=clean(body.team_id),role=clean(body.role||"player");
      if(name.length<2)return json({ok:false,error:"Player name is required."},422);
      if(!Number.isInteger(class_year)||class_year<2021||class_year>2100)return json({ok:false,error:"Class year is required for a new player."},422);
      if(!["player","captain","protected"].includes(role))return json({ok:false,error:"Invalid role."},422);
      const existingName=await DB.prepare("SELECT player_id,name FROM players WHERE name=? COLLATE NOCASE").bind(name).first();
      if(existingName)return json({ok:false,error:"A player with this name already exists.",existing:existingName},409);
      let id=baseId(name),suffix=2;
      while(await DB.prepare("SELECT 1 FROM players WHERE player_id=?").bind(id).first())id=`${baseId(name)}_${suffix++}`;
      const statements=[
        DB.prepare("INSERT INTO players(player_id,name,class_year,retired) VALUES(?,?,?,0)").bind(id,name,class_year)
      ];
      if(team_id){
        const team=await DB.prepare("SELECT team_id FROM teams WHERE team_id=?").bind(team_id).first();
        if(!team)return json({ok:false,error:"Unknown team."},422);
        statements.push(DB.prepare(`
          INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
          VALUES(?,?,?,?,?)
        `).bind(season,id,team_id,role,actor));
      }
      await DB.batch(statements);
      return json({ok:true,action:"created_player",player:{player_id:id,name,class_year},team_id:team_id||null,role});
    }

    if(body.action!=="save")return json({ok:false,error:"Unsupported roster action."},400);
    const assignments=Array.isArray(body.assignments)?body.assignments:[];
    const [playersRes,teamsRes]=await DB.batch([
      DB.prepare("SELECT player_id FROM players"),
      DB.prepare("SELECT team_id FROM teams")
    ]);
    const playerIds=new Set((playersRes.results||[]).map(r=>r.player_id));
    const teamIds=new Set((teamsRes.results||[]).map(r=>r.team_id));
    const seen=new Set(),errors=[];
    for(const a of assignments){
      if(!playerIds.has(a.player_id))errors.push(`Unknown player: ${a.player_id}`);
      if(!teamIds.has(a.team_id))errors.push(`Unknown team: ${a.team_id}`);
      if(!["player","captain","protected"].includes(a.role||"player"))errors.push(`Invalid role for ${a.player_id}`);
      if(seen.has(a.player_id))errors.push(`Duplicate player assignment: ${a.player_id}`);
      seen.add(a.player_id);
    }
    if(errors.length)return json({ok:false,error:"Roster validation failed.",errors},422);
    const statements=[DB.prepare("DELETE FROM team_rosters WHERE season=?").bind(season)];
    for(const a of assignments){
      statements.push(DB.prepare(`
        INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
        VALUES(?,?,?,?,?)
      `).bind(season,a.player_id,a.team_id,a.role||"player",actor));
    }
    await DB.batch(statements);
    return json({ok:true,action:"saved",season,assigned:assignments.length,actor_email:actor});
  }catch(err){
    return json({ok:false,error:"Roster update failed.",detail:String(err?.message||err)},500);
  }
}
