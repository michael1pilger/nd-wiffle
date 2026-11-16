function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
 try{
  const exists=await DB.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='pitching_feats'").first();
  if(!exists)return json({ok:false,code:'PITCHING_FEATS_SCHEMA_MISSING',error:'Pitching feats admin table is not installed. Run migration 0039.'},503);
  const r=await DB.prepare(`SELECT feat_id,kind,pitcher_label AS pitcher,player_id,opponent,season AS year,label,sort_order AS "order",notes,created_at,updated_at FROM pitching_feats WHERE active=1 ORDER BY season,sort_order,feat_id`).all();
  return json({ok:true,build:'pitching-feats-v164',feats:r.results||[]});
 }catch(err){return json({ok:false,error:'Could not load pitching feats.',detail:String(err?.message||err)},500)}
}
