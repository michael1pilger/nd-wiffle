
function csvEscape(v){
  if(v===null||v===undefined)return "";
  const s=String(v);
  return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
}
function csv(rows,cols){
  const head=cols.map(x=>csvEscape(x[0])).join(",");
  const body=rows.map(r=>cols.map(([,k])=>csvEscape(r[k])).join(",")).join("\n");
  return head+(body?"\n"+body:"")+"\n";
}
function response(text,name){
  return new Response(text,{headers:{
    "content-type":"text/csv; charset=utf-8",
    "content-disposition":`attachment; filename="${name}"`,
    "cache-control":"no-store"
  }});
}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}
const SEASON=v=>{const n=Number(v||2026);return Number.isInteger(n)&&n>=2021&&n<=2100?n:2026};

export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 const u=new URL(context.request.url),type=u.searchParams.get("type")||"batting_series",season=SEASON(u.searchParams.get("season"));
 try{
  if(type==="batting_series"){
   const q=await DB.prepare(`
    SELECT s.season,s.series_date,b.series_id,b.team_id,t.display_name AS team,p.name,b.player_id,
      b.side,b.games_played AS GP,b.pa AS PA,b.ab AS AB,b.runs AS R,b.hits AS H,b.singles AS "1B",
      b.doubles AS "2B",b.triples AS "3B",b.hr AS HR,b.rbi AS RBI,b.bb AS BB,b.so AS K,b.hbp AS HBP
    FROM batting_series_stats b JOIN series s ON s.series_id=b.series_id
    JOIN players p ON p.player_id=b.player_id JOIN teams t ON t.team_id=b.team_id
    WHERE s.season=? ORDER BY s.series_date,b.series_id,t.display_name,p.name
   `).bind(season).all();
   const cols=[["Season","season"],["Date","series_date"],["Series_ID","series_id"],["Team","team"],["Team_ID","team_id"],["Player","name"],["Player_ID","player_id"],["Side","side"],["GP","GP"],["PA","PA"],["AB","AB"],["R","R"],["H","H"],["1B","1B"],["2B","2B"],["3B","3B"],["HR","HR"],["RBI","RBI"],["BB","BB"],["K","K"],["HBP","HBP"]];
   return response(csv(q.results||[],cols),`${season}_Batting_By_Series.csv`);
  }
  if(type==="pitching_series"){
   const q=await DB.prepare(`
    SELECT s.season,s.series_date,ps.series_id,ps.team_id,t.display_name AS team,p.name,ps.player_id,
      ps.side,ps.games_played AS GP,ps.appearances AS Apps,ps.starts AS Starts,ps.outs_recorded AS Outs,
      ps.bf AS BF,ps.runs AS R,ps.er AS ER,ps.strikeouts AS K,ps.hits AS H,ps.bb AS BB,ps.hr AS HR,
      ps.hbp AS HBP,ps.wp AS WP
    FROM pitching_series_stats ps JOIN series s ON s.series_id=ps.series_id
    JOIN players p ON p.player_id=ps.player_id JOIN teams t ON t.team_id=ps.team_id
    WHERE s.season=? ORDER BY s.series_date,ps.series_id,t.display_name,p.name
   `).bind(season).all();
   const cols=[["Season","season"],["Date","series_date"],["Series_ID","series_id"],["Team","team"],["Team_ID","team_id"],["Player","name"],["Player_ID","player_id"],["Side","side"],["GP","GP"],["Apps","Apps"],["Starts","Starts"],["Outs","Outs"],["BF","BF"],["R","R"],["ER","ER"],["K","K"],["H","H"],["BB","BB"],["HR","HR"],["HBP","HBP"],["WP","WP"]];
   return response(csv(q.results||[],cols),`${season}_Pitching_By_Series.csv`);
  }
  if(type==="games"){
   const q=await DB.prepare(`
    SELECT s.season,s.series_date,g.series_id,g.game_number,at.display_name AS away_team,ht.display_name AS home_team,
      g.away_score,g.home_score,wp.name AS winning_pitcher,lp.name AS losing_pitcher,sp.name AS save_pitcher
    FROM games g JOIN series s ON s.series_id=g.series_id
    JOIN teams at ON at.team_id=s.away_team_id JOIN teams ht ON ht.team_id=s.home_team_id
    LEFT JOIN players wp ON wp.player_id=g.winning_pitcher_id
    LEFT JOIN players lp ON lp.player_id=g.losing_pitcher_id
    LEFT JOIN players sp ON sp.player_id=g.save_pitcher_id
    WHERE s.season=? ORDER BY s.series_date,g.series_id,g.game_number
   `).bind(season).all();
   const cols=[["Season","season"],["Date","series_date"],["Series_ID","series_id"],["Game","game_number"],["Away","away_team"],["Home","home_team"],["Away_Score","away_score"],["Home_Score","home_score"],["WP","winning_pitcher"],["LP","losing_pitcher"],["SV","save_pitcher"]];
   return response(csv(q.results||[],cols),`${season}_Games.csv`);
  }
  if(type==="series"){
   const q=await DB.prepare(`
    SELECT s.season,s.series_date,s.series_id,at.display_name AS away_team,ht.display_name AS home_team,
      s.commissioner_email,s.commissioner_notes,s.warning_count,s.published_at,s.updated_at
    FROM series s JOIN teams at ON at.team_id=s.away_team_id JOIN teams ht ON ht.team_id=s.home_team_id
    WHERE s.season=? ORDER BY s.series_date,s.series_id
   `).bind(season).all();
   const cols=[["Season","season"],["Date","series_date"],["Series_ID","series_id"],["Away","away_team"],["Home","home_team"],["Commissioner","commissioner_email"],["Notes","commissioner_notes"],["Warnings","warning_count"],["Published_At","published_at"],["Updated_At","updated_at"]];
   return response(csv(q.results||[],cols),`${season}_Series.csv`);
  }
  if(type==="rosters"){
   const q=await DB.prepare(`
    SELECT tr.season,t.display_name AS team,tr.team_id,p.name,tr.player_id,p.class_year,tr.role
    FROM team_rosters tr JOIN teams t ON t.team_id=tr.team_id JOIN players p ON p.player_id=tr.player_id
    WHERE tr.season=? ORDER BY t.display_name,CASE tr.role WHEN 'captain' THEN 0 WHEN 'protected' THEN 1 ELSE 2 END,p.name
   `).bind(season).all();
   const cols=[["Season","season"],["Team","team"],["Team_ID","team_id"],["Player","name"],["Player_ID","player_id"],["Class_Year","class_year"],["Role","role"]];
   return response(csv(q.results||[],cols),`${season}_Rosters.csv`);
  }
  return json({ok:false,error:"Unknown export type."},400);
 }catch(e){return json({ok:false,error:"Export failed.",detail:String(e?.message||e)},500)}
}
