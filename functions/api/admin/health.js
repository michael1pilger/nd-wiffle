function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const n=v=>Number(v||0);
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.',warnings:[{level:'error',code:'DB_BINDING_MISSING',message:'The primary D1 database is not bound to this deployment.',action:'Check the Pages/Workers DB binding before attempting any admin publish.'}]},500);
 try{
  const [players,teams,series,tables,gamesDef,latest,seasonRows,playoffRows]=await DB.batch([
   DB.prepare('SELECT COUNT(*) AS count FROM players'),
   DB.prepare('SELECT COUNT(*) AS count FROM teams'),
   DB.prepare('SELECT COUNT(*) AS count FROM series'),
   DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('games','series_participants','batting_series_stats','pitching_series_stats','pitching_feats')"),
   DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='games'"),
   DB.prepare(`SELECT series_id,season,series_date,away_team_id,home_team_id,json_extract(payload_json,'$.series_type') AS series_type,published_at FROM series ORDER BY season DESC,series_date DESC,published_at DESC LIMIT 1`),
   DB.prepare('SELECT DISTINCT season FROM series ORDER BY season DESC'),
   DB.prepare(`SELECT s.series_id,s.season,s.series_date,s.away_team_id,s.home_team_id,json_extract(s.payload_json,'$.playoff.round') AS playoff_round,CAST(json_extract(s.payload_json,'$.playoff.series_length') AS INTEGER) AS max_games,
     SUM(CASE WHEN g.away_score>g.home_score THEN 1 ELSE 0 END) AS away_wins,SUM(CASE WHEN g.home_score>g.away_score THEN 1 ELSE 0 END) AS home_wins,COUNT(g.game_number) AS games
     FROM series s LEFT JOIN games g ON g.series_id=s.series_id WHERE json_extract(s.payload_json,'$.series_type')='playoff'
     GROUP BY s.series_id,s.season,s.series_date,s.away_team_id,s.home_team_id,s.payload_json ORDER BY s.season DESC,s.series_date DESC`)
  ]);
  let fk=[];try{const r=await DB.prepare('PRAGMA foreign_key_check').all();fk=r.results||[]}catch{}
  const names=new Set((tables.results||[]).map(x=>x.name)),warnings=[];
  const gamesSql=String(gamesDef.results?.[0]?.sql||'');
  if(!names.has('pitching_feats'))warnings.push({level:'warning',code:'PITCHING_FEATS_SCHEMA_MISSING',message:'Admin-managed no-hitter/perfect-game data is not installed.',action:'Run migrations/0039_pitching_feats_admin.sql.'});
  if(/BETWEEN\s+1\s+AND\s+3/i.test(gamesSql))warnings.push({level:'error',code:'PLAYOFF_GAME_LIMIT_OLD',message:'The games table still caps game_number at 3.',action:'Run migrations/0038_expand_playoff_series_game_limits.sql before publishing a best-of-5 or best-of-7 series.'});
  if(fk.length)warnings.push({level:'error',code:'FOREIGN_KEY_CHECK',message:`D1 reports ${fk.length} foreign-key integrity issue${fk.length===1?'':'s'}.`,action:'Export a backup before making further database edits and inspect PRAGMA foreign_key_check.'});
  const po=playoffRows.results||[],currentSeason=n(seasonRows.results?.[0]?.season||2026),world=po.find(x=>n(x.season)===currentSeason&&x.playoff_round==='World Series');
  let champion=null;
  if(world){const need=Math.floor(n(world.max_games||7)/2)+1,aw=n(world.away_wins),hw=n(world.home_wins);if(Math.max(aw,hw)>=need)champion=aw>hw?world.away_team_id:world.home_team_id;else warnings.push({level:'warning',code:'WORLD_SERIES_INCOMPLETE',message:`${currentSeason} World Series exists but is not yet clinched.`,action:'Publish the remaining World Series game(s), or verify the series result.'})}
  else if(po.some(x=>n(x.season)===currentSeason))warnings.push({level:'warning',code:'WORLD_SERIES_MISSING',message:`${currentSeason} playoff data exists but no World Series series is published.`,action:'Verify the playoff bracket and publish the World Series series when available.'});
  const incomplete=po.filter(x=>{const max=n(x.max_games||3),need=Math.floor(max/2)+1;return Math.max(n(x.away_wins),n(x.home_wins))<need});
  if(incomplete.length)warnings.push({level:'info',code:'INCOMPLETE_PLAYOFF_SERIES',message:`${incomplete.length} published playoff series ${incomplete.length===1?'is':'are'} still in progress.`,action:'This is normal during the postseason; review after the season if any should be complete.'});
  return json({ok:true,build:'health-v164',actor_email:context.data.actorEmail||null,database:{players:n(players.results?.[0]?.count),teams:n(teams.results?.[0]?.count),series:n(series.results?.[0]?.count),seasons:(seasonRows.results||[]).map(x=>n(x.season)),latest_series:latest.results?.[0]||null,foreign_key_issues:fk.length},schema:{playoff_games_up_to_7:!/BETWEEN\s+1\s+AND\s+3/i.test(gamesSql),pitching_feats:names.has('pitching_feats')},postseason:{season:currentSeason,champion_team_id:champion,incomplete_series:incomplete.map(x=>({series_id:x.series_id,round:x.playoff_round,games:n(x.games),away_wins:n(x.away_wins),home_wins:n(x.home_wins)}))},spring:{binding_present:!!context.env.SPRING_DB,isolated_database_expected:true},warnings});
 }catch(err){return json({ok:false,error:'Admin health check failed.',detail:String(err?.message||err),warnings:[{level:'error',code:'HEALTH_QUERY_FAILED',message:'The site could not complete its database diagnostics.',action:'Use the detail field to identify the failing table or migration before publishing more data.'}]},500)}
}
