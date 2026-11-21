function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const n=v=>Number(v||0);
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.',warnings:[{level:'error',code:'DB_BINDING_MISSING',message:'The primary D1 database is not bound to this deployment.',action:'Check the Pages/Workers DB binding before attempting any admin publish.'}]},500);
 try{
  const [players,teams,series,tables,gamesDef,latest,seasonRows,playoffRows]=await DB.batch([
   DB.prepare('SELECT COUNT(*) AS count FROM players'),
   DB.prepare('SELECT COUNT(*) AS count FROM teams'),
   DB.prepare('SELECT COUNT(*) AS count FROM series'),
   DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('games','series_participants','batting_series_stats','pitching_series_stats','pitching_feats','league_awards','hall_of_fame_members')"),
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

  const honorsReady=names.has('league_awards')&&names.has('hall_of_fame_members');
  let honors={ready:honorsReady,award_records:0,hof_members:0,current_season_awards:0,derived_ws_champion_participants:0};
  if(!honorsReady){warnings.push({level:'warning',code:'HONORS_SCHEMA_MISSING',message:'The central awards/Hall of Fame registry is not installed.',action:'Run migrations/0041_honors_registry.sql.'})}
  else{
    const [awardCount,hofCount,currentAwardCount]=await DB.batch([
      DB.prepare('SELECT COUNT(*) AS count FROM league_awards WHERE active=1'),
      DB.prepare('SELECT COUNT(*) AS count FROM hall_of_fame_members WHERE active=1'),
      DB.prepare('SELECT COUNT(*) AS count FROM league_awards WHERE active=1 AND season=?').bind(currentSeason)
    ]);
    honors.award_records=n(awardCount.results?.[0]?.count);honors.hof_members=n(hofCount.results?.[0]?.count);honors.current_season_awards=n(currentAwardCount.results?.[0]?.count);
    if(currentSeason===2026&&honors.current_season_awards<22)warnings.push({level:'warning',code:'HONORS_2026_AWARDS_INCOMPLETE',message:`Only ${honors.current_season_awards} of the 22 recorded 2026 non-WS award records are active.`,action:'Open /admin/honors/ and review the 2026 award registry.'});
    if(currentSeason===2026&&honors.hof_members<11)warnings.push({level:'warning',code:'HOF_2026_INCOMPLETE',message:`Only ${honors.hof_members} HOF members are active; v168 expects 11 including Joey Thomalla and Jimmy Redfern.`,action:'Open /admin/honors/ and review HOF membership.'});
    if(champion&&world){const p=await DB.prepare('SELECT COUNT(DISTINCT player_id) AS count FROM series_participants WHERE series_id=? AND team_id=?').bind(world.series_id,champion).first();honors.derived_ws_champion_participants=n(p?.count);if(!honors.derived_ws_champion_participants)warnings.push({level:'warning',code:'WS_CHAMPION_PARTICIPANTS_MISSING',message:'A World Series champion is detected but no winning World Series participants were found for automatic ring accolades.',action:'Check series_participants for the published World Series.'})}
  }
  return json({ok:true,build:'health-v168',actor_email:context.data.actorEmail||null,database:{players:n(players.results?.[0]?.count),teams:n(teams.results?.[0]?.count),series:n(series.results?.[0]?.count),seasons:(seasonRows.results||[]).map(x=>n(x.season)),latest_series:latest.results?.[0]||null,foreign_key_issues:fk.length},schema:{playoff_games_up_to_7:!/BETWEEN\s+1\s+AND\s+3/i.test(gamesSql),pitching_feats:names.has('pitching_feats'),honors_registry:honorsReady},postseason:{season:currentSeason,champion_team_id:champion,incomplete_series:incomplete.map(x=>({series_id:x.series_id,round:x.playoff_round,games:n(x.games),away_wins:n(x.away_wins),home_wins:n(x.home_wins)}))},honors,spring:{binding_present:!!context.env.SPRING_DB,isolated_database_expected:true},warnings});
 }catch(err){return json({ok:false,error:'Admin health check failed.',detail:String(err?.message||err),warnings:[{level:'error',code:'HEALTH_QUERY_FAILED',message:'The site could not complete its database diagnostics.',action:'Use the detail field to identify the failing table or migration before publishing more data.'}]},500)}
}
