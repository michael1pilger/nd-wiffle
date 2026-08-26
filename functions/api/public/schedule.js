
function json(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 const season=Number(new URL(context.request.url).searchParams.get("season")||2026);
 if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:"Invalid season."},400);
 try{
  const rows=await DB.prepare(`
   SELECT ss.season,ss.pair_key,ss.team_a_id,ta.display_name AS team_a,
          ss.team_b_id,tb.display_name AS team_b,
          ss.series_date,ss.series_time,ss.location,ss.notes,ss.updated_at
   FROM scheduled_series ss
   JOIN teams ta ON ta.team_id=ss.team_a_id
   JOIN teams tb ON tb.team_id=ss.team_b_id
   WHERE ss.season=?
   ORDER BY ss.series_date,COALESCE(ss.series_time,'23:59'),ta.display_name,tb.display_name
  `).bind(season).all();
  return json({ok:true,build:"v62",season,scheduled:rows.results||[]});
 }catch(err){
  const msg=String(err?.message||err);
  if(msg.includes("no such table"))return json({ok:true,build:"v62",season,scheduled:[],schema_ready:false});
  return json({ok:false,error:"Public schedule query failed.",detail:msg},500);
 }
}
