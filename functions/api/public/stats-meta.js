function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
 try{
  const [regular,playoffs]=await DB.batch([
   DB.prepare(`SELECT DISTINCT season FROM series WHERE COALESCE(json_extract(payload_json,'$.series_type'),'played')!='playoff' ORDER BY season`),
   DB.prepare(`SELECT DISTINCT season FROM series WHERE json_extract(payload_json,'$.series_type')='playoff' ORDER BY season`)
  ]);
  return json({ok:true,build:'stats-meta-v164',regular_seasons:(regular.results||[]).map(r=>Number(r.season)),playoff_seasons:(playoffs.results||[]).map(r=>Number(r.season))});
 }catch(err){return json({ok:false,error:'Could not read available stat seasons.',detail:String(err?.message||err)},500)}
}
