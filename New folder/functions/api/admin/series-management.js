function json(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
const clean=v=>String(v??"").trim();

export async function onRequestPost(context){
 const DB=context.env.DB;
 if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
 const action=clean(body.action);
 if(action!=="delete")return json({ok:false,error:"Unsupported action."},400);
 const seriesId=clean(body.series_id),confirmation=clean(body.confirmation);
 if(!seriesId)return json({ok:false,error:"series_id is required."},422);
 if(confirmation!==seriesId)return json({ok:false,error:"Deletion confirmation did not match the Series ID."},422);
 const row=await DB.prepare(`
   SELECT s.series_id,s.season,s.series_date,s.away_team_id,s.home_team_id,
          a.display_name AS away_team,h.display_name AS home_team,
          (SELECT COUNT(*) FROM games g WHERE g.series_id=s.series_id) AS game_count
   FROM series s
   JOIN teams a ON a.team_id=s.away_team_id
   JOIN teams h ON h.team_id=s.home_team_id
   WHERE s.series_id=?
 `).bind(seriesId).first();
 if(!row)return json({ok:false,error:"Series not found. It may already have been deleted."},404);
 try{
   // All active child tables reference series with ON DELETE CASCADE. import_history
   // intentionally remains as an audit/recovery record and has no FK to series.
   await DB.prepare("DELETE FROM series WHERE series_id=?").bind(seriesId).run();
   return json({
     ok:true,action:"deleted",series_id:seriesId,season:row.season,series_date:row.series_date,
     away_team:row.away_team,home_team:row.home_team,game_count:Number(row.game_count||0),
     actor_email:context.data.actorEmail||"unknown-access-user",
     audit_history_retained:true
   });
 }catch(err){
   return json({ok:false,error:"Could not delete series.",detail:String(err?.message||err)},500);
 }
}
