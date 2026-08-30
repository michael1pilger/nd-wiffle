
function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  const season=Number(new URL(context.request.url).searchParams.get("season")||2026);
  if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:"Invalid season."},400);
  try{
    const rows=await DB.prepare(`
      SELECT tr.season,tr.team_id,t.display_name AS team_name,tr.player_id,p.name,p.class_year,p.retired,tr.role
      FROM team_rosters tr
      JOIN teams t ON t.team_id=tr.team_id
      JOIN players p ON p.player_id=tr.player_id
      WHERE tr.season=?
      ORDER BY t.display_name,
        CASE tr.role WHEN 'captain' THEN 0 WHEN 'protected' THEN 1 ELSE 2 END,
        p.name
    `).bind(season).all();
    return json({ok:true,build:"v69",season,rosters:rows.results||[]});
  }catch(err){
    const msg=String(err?.message||err);
    if(msg.includes("no such table"))return json({ok:true,build:"v69",season,rosters:[],schema_ready:false});
    return json({ok:false,error:"Public roster query failed.",detail:msg},500);
  }
}
