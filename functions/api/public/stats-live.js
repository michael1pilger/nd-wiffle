function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const n=v=>Number(v||0);
function ipDisplay(outs){const whole=Math.floor(n(outs)/3),rem=n(outs)%3;return rem?`${whole}.${rem}`:String(whole)}
function phaseSql(phase,alias='s'){return phase==='playoffs'?`json_extract(${alias}.payload_json,'$.series_type')='playoff'`:`COALESCE(json_extract(${alias}.payload_json,'$.series_type'),'played')!='playoff'`}
function primaryTeam(rows,weightKey){
  const byPlayer=new Map();
  for(const r of rows||[]){const w=n(r[weightKey]),prior=byPlayer.get(r.player_id);if(!prior||w>prior.w)byPlayer.set(r.player_id,{team_id:r.team_id,team_name:r.team_name,w})}
  return byPlayer;
}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
 const url=new URL(context.request.url),season=Number(url.searchParams.get('season')||2026),phase=String(url.searchParams.get('phase')||'regular').toLowerCase();
 if(!Number.isInteger(season)||season<2026||season>2100)return json({ok:false,error:'season must be 2026 or later.'},400);
 if(!['regular','playoffs'].includes(phase))return json({ok:false,error:'phase must be regular or playoffs.'},400);
 const where=phaseSql(phase);
 try{
  const [batByTeam,pitByTeam,participants,decisions,seriesCount]=await DB.batch([
   DB.prepare(`SELECT b.player_id,p.name,p.class_year,p.retired,b.team_id,t.display_name AS team_name,
     SUM(b.games_played) AS gp,SUM(b.pa) AS pa,SUM(b.ab) AS ab,SUM(b.runs) AS runs,SUM(b.hits) AS hits,SUM(b.singles) AS singles,SUM(b.doubles) AS doubles,SUM(b.triples) AS triples,SUM(b.hr) AS hr,SUM(b.rbi) AS rbi,SUM(b.bb) AS bb,SUM(b.so) AS so
     FROM batting_series_stats b JOIN series s ON s.series_id=b.series_id JOIN players p ON p.player_id=b.player_id JOIN teams t ON t.team_id=b.team_id
     WHERE s.season=? AND ${where} GROUP BY b.player_id,p.name,p.class_year,p.retired,b.team_id,t.display_name`).bind(season),
   DB.prepare(`SELECT ps.player_id,p.name,p.class_year,p.retired,ps.team_id,t.display_name AS team_name,
     SUM(ps.games_played) AS gp,SUM(ps.appearances) AS apps,SUM(ps.starts) AS starts,SUM(ps.outs_recorded) AS outs_recorded,SUM(ps.bf) AS bf,SUM(ps.runs) AS runs,SUM(ps.er) AS er,SUM(ps.strikeouts) AS strikeouts,SUM(ps.hits) AS hits,SUM(ps.bb) AS bb,SUM(ps.hr) AS hr,SUM(ps.wp) AS wp
     FROM pitching_series_stats ps JOIN series s ON s.series_id=ps.series_id JOIN players p ON p.player_id=ps.player_id JOIN teams t ON t.team_id=ps.team_id
     WHERE s.season=? AND ${where} GROUP BY ps.player_id,p.name,p.class_year,p.retired,ps.team_id,t.display_name`).bind(season),
   DB.prepare(`SELECT sp.player_id,p.name,sp.team_id,t.display_name AS team_name,SUM(sp.games_played) AS gp
     FROM series_participants sp JOIN series s ON s.series_id=sp.series_id JOIN players p ON p.player_id=sp.player_id JOIN teams t ON t.team_id=sp.team_id
     WHERE s.season=? AND ${where} GROUP BY sp.player_id,p.name,sp.team_id,t.display_name`).bind(season),
   DB.prepare(`SELECT player_id,SUM(wins) AS wins,SUM(losses) AS losses,SUM(saves) AS saves FROM (
      SELECT g.winning_pitcher_id AS player_id,COUNT(*) AS wins,0 AS losses,0 AS saves FROM games g JOIN series s ON s.series_id=g.series_id WHERE s.season=? AND ${where} GROUP BY g.winning_pitcher_id
      UNION ALL SELECT g.losing_pitcher_id,0,COUNT(*),0 FROM games g JOIN series s ON s.series_id=g.series_id WHERE s.season=? AND ${where} GROUP BY g.losing_pitcher_id
      UNION ALL SELECT g.save_pitcher_id,0,0,COUNT(*) FROM games g JOIN series s ON s.series_id=g.series_id WHERE s.season=? AND ${where} AND g.save_pitcher_id IS NOT NULL GROUP BY g.save_pitcher_id
    ) GROUP BY player_id`).bind(season,season,season),
   DB.prepare(`SELECT COUNT(*) AS count FROM series s WHERE s.season=? AND ${where}`).bind(season)
  ]);
  const batTeam=primaryTeam(batByTeam.results,'pa'),pitTeam=primaryTeam(pitByTeam.results,'outs_recorded'),partTeam=primaryTeam(participants.results,'gp'),dmap=new Map((decisions.results||[]).map(r=>[r.player_id,r]));
  const batMap=new Map();for(const r of batByTeam.results||[]){const x=batMap.get(r.player_id)||{...r,gp:0,pa:0,ab:0,runs:0,hits:0,singles:0,doubles:0,triples:0,hr:0,rbi:0,bb:0,so:0};for(const k of ['gp','pa','ab','runs','hits','singles','doubles','triples','hr','rbi','bb','so'])x[k]+=n(r[k]);batMap.set(r.player_id,x)}
  const batting=[...batMap.values()].map(r=>{const pa=n(r.pa),ab=n(r.ab),hits=n(r.hits),bb=n(r.bb),tb=n(r.singles)+2*n(r.doubles)+3*n(r.triples)+4*n(r.hr),obpDen=pa||(ab+bb),ba=ab?hits/ab:0,obp=obpDen?(hits+bb)/obpDen:0,slg=ab?tb/ab:0,babipDen=ab-n(r.so)-n(r.hr),team=batTeam.get(r.player_id)||partTeam.get(r.player_id)||{};return {Player_ID:r.player_id,Name:r.name,Class_Year:r.class_year,Retired:String(r.retired||0),Season:String(season),Phase:phase,Team_ID:team.team_id||null,Team:team.team_name||null,GP:n(r.gp),PAs:pa,ABs:ab,Runs:n(r.runs),Hits:hits,Singles:n(r.singles),Doubles:n(r.doubles),Triples:n(r.triples),HRs:n(r.hr),RBI:n(r.rbi),BB:bb,Ks:n(r.so),BA:ba.toFixed(3),OBP:obp.toFixed(3),SLG:slg.toFixed(3),OPS:(obp+slg).toFixed(3),BABIP:babipDen>0?((hits-n(r.hr))/babipDen).toFixed(3):null}});
  const pitMap=new Map();for(const r of pitByTeam.results||[]){const x=pitMap.get(r.player_id)||{...r,gp:0,apps:0,starts:0,outs_recorded:0,bf:0,runs:0,er:0,strikeouts:0,hits:0,bb:0,hr:0,wp:0};for(const k of ['gp','apps','starts','outs_recorded','bf','runs','er','strikeouts','hits','bb','hr','wp'])x[k]+=n(r[k]);pitMap.set(r.player_id,x)}
  const pitching=[...pitMap.values()].map(r=>{const outs=n(r.outs_recorded),ip=outs/3,er=n(r.er),walks=n(r.bb),hits=n(r.hits),d=dmap.get(r.player_id)||{},team=pitTeam.get(r.player_id)||partTeam.get(r.player_id)||{};return {Player_ID:r.player_id,Name:r.name,Class_Year:r.class_year,Retired:String(r.retired||0),Season:String(season),Phase:phase,Team_ID:team.team_id||null,Team:team.team_name||null,GP:n(r.gp),Apps:n(r.apps),Starts:n(r.starts),W:n(d.wins),L:n(d.losses),S:n(d.saves),Outs:outs,IP:ipDisplay(outs),BF:n(r.bf),Runs:n(r.runs),ER:er,Walks:walks,Hits:hits,Ks:n(r.strikeouts),HRs:n(r.hr),WP:n(r.wp),ERA:outs?((er*3)/ip).toFixed(2):null,WHIP:outs?((walks+hits)/ip).toFixed(2):null,FIP:outs?((13*n(r.hr)+3*walks-2*n(r.strikeouts))/outs).toFixed(3):null}});
  return json({ok:true,build:'stats-live-v164',season,phase,series_count:n(seriesCount.results?.[0]?.count),batting,pitching,participants:participants.results||[]});
 }catch(err){return json({ok:false,error:'Could not build league statistics.',detail:String(err?.message||err)},500)}
}
