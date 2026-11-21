function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const clean=v=>String(v??'').trim();
const n=v=>Number(v||0);
async function tableReady(DB,name){return !!(await DB.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=?").bind(name).first())}
async function schemaReady(DB){return (await tableReady(DB,'league_awards'))&&(await tableReady(DB,'hall_of_fame_members'))}
async function champions(DB){
  const rows=await DB.prepare(`SELECT s.series_id,s.season,s.away_team_id,s.home_team_id,ta.display_name AS away_team,th.display_name AS home_team,
    COALESCE(CAST(json_extract(s.payload_json,'$.playoff.series_length') AS INTEGER),7) AS max_games,
    SUM(CASE WHEN g.away_score>g.home_score THEN 1 ELSE 0 END) AS away_wins,SUM(CASE WHEN g.home_score>g.away_score THEN 1 ELSE 0 END) AS home_wins
    FROM series s LEFT JOIN games g ON g.series_id=s.series_id JOIN teams ta ON ta.team_id=s.away_team_id JOIN teams th ON th.team_id=s.home_team_id
    WHERE s.season>=2026 AND json_extract(s.payload_json,'$.series_type')='playoff' AND json_extract(s.payload_json,'$.playoff.round')='World Series'
    GROUP BY s.series_id,s.season,s.away_team_id,s.home_team_id,ta.display_name,th.display_name,s.payload_json ORDER BY s.season DESC`).all();
  const out=[];
  for(const r of rows.results||[]){const aw=n(r.away_wins),hw=n(r.home_wins),need=Math.floor(n(r.max_games||7)/2)+1;if(Math.max(aw,hw)<need||aw===hw)continue;const tid=aw>hw?r.away_team_id:r.home_team_id,team=aw>hw?r.away_team:r.home_team;const p=await DB.prepare(`SELECT DISTINCT sp.player_id,p.name FROM series_participants sp JOIN players p ON p.player_id=sp.player_id WHERE sp.series_id=? AND sp.team_id=? ORDER BY p.name`).bind(r.series_id,tid).all();out.push({season:n(r.season),series_id:r.series_id,team_id:tid,team,away_wins:aw,home_wins:hw,participants:p.results||[]})}
  return out;
}
export async function onRequestGet(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
  if(!(await schemaReady(DB)))return json({ok:false,code:'HONORS_SCHEMA_MISSING',error:'Honors registry is not installed. Run migrations/0041_honors_registry.sql.'},503);
  try{
    const [players,awards,hof,champs,fk]=await Promise.all([
      DB.prepare(`SELECT player_id,name,class_year,retired FROM players ORDER BY retired,name`).all(),
      DB.prepare(`SELECT a.award_id,a.season,a.player_id,p.name AS player_name,a.award,a.detail,a.source,a.updated_at FROM league_awards a JOIN players p ON p.player_id=a.player_id WHERE a.active=1 ORDER BY a.season DESC,a.award,p.name`).all(),
      DB.prepare(`SELECT h.player_id,p.name,h.inducted_season,h.notes,h.updated_at FROM hall_of_fame_members h JOIN players p ON p.player_id=h.player_id WHERE h.active=1 ORDER BY p.name`).all(),
      champions(DB),
      DB.prepare('PRAGMA foreign_key_check').all()
    ]);
    const currentSeason=Math.max(2026,...(awards.results||[]).map(x=>n(x.season)),...champs.map(x=>n(x.season)));
    return json({ok:true,build:'admin-honors-v168',actor_email:context.data.actorEmail||null,players:players.results||[],awards:awards.results||[],hall_of_fame:hof.results||[],champions:champs,health:{foreign_key_issues:(fk.results||[]).length,current_season:currentSeason,current_season_awards:(awards.results||[]).filter(x=>n(x.season)===currentSeason).length,hof_members:(hof.results||[]).length,world_series_derived:champs.some(x=>n(x.season)===currentSeason)}});
  }catch(err){return json({ok:false,error:'Could not load honors manager.',detail:String(err?.message||err)},500)}
}
export async function onRequestPost(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
  if(!(await schemaReady(DB)))return json({ok:false,code:'HONORS_SCHEMA_MISSING',error:'Honors registry is not installed. Run migrations/0041_honors_registry.sql.'},503);
  let body;try{body=await context.request.json()}catch{return json({ok:false,error:'Request body must be valid JSON.'},400)}
  const action=clean(body.action),actor=context.data.actorEmail||'unknown-access-user';
  try{
    if(action==='save_award'){
      const season=Number(body.season),playerId=clean(body.player_id),award=clean(body.award),detail=clean(body.detail),awardId=clean(body.award_id)||crypto.randomUUID();
      if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:'Enter a valid award season.'},422);
      if(!playerId)return json({ok:false,error:'Choose a player.'},422);
      if(!award)return json({ok:false,error:'Enter an award name.'},422);
      if(/^(world series champion|ws champion|world series winner)$/i.test(award))return json({ok:false,error:'World Series Champion is derived automatically from the published World Series and cannot be entered manually.'},422);
      const player=await DB.prepare('SELECT player_id FROM players WHERE player_id=?').bind(playerId).first();if(!player)return json({ok:false,error:'Selected player was not found.'},422);
      await DB.prepare(`INSERT INTO league_awards(award_id,season,player_id,award,detail,active,source,updated_by) VALUES(?,?,?,?,?,1,'admin',?)
        ON CONFLICT(award_id) DO UPDATE SET season=excluded.season,player_id=excluded.player_id,award=excluded.award,detail=excluded.detail,active=1,source='admin',updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by`).bind(awardId,season,playerId,award,detail,actor).run();
      return json({ok:true,action:'saved',award_id:awardId});
    }
    if(action==='delete_award'){
      const awardId=clean(body.award_id);if(!awardId)return json({ok:false,error:'award_id is required.'},422);
      await DB.prepare(`UPDATE league_awards SET active=0,updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE award_id=?`).bind(actor,awardId).run();
      return json({ok:true,action:'deleted',award_id:awardId});
    }
    if(action==='add_hof'){
      const playerId=clean(body.player_id),season=body.inducted_season===null||body.inducted_season===''?null:Number(body.inducted_season),notes=clean(body.notes);
      if(!playerId)return json({ok:false,error:'Choose a player.'},422);
      if(season!==null&&(!Number.isInteger(season)||season<2021||season>2100))return json({ok:false,error:'Enter a valid induction season or leave it blank.'},422);
      const player=await DB.prepare('SELECT player_id FROM players WHERE player_id=?').bind(playerId).first();if(!player)return json({ok:false,error:'Selected player was not found.'},422);
      await DB.prepare(`INSERT INTO hall_of_fame_members(player_id,inducted_season,notes,active,updated_by) VALUES(?,?,?,1,?)
        ON CONFLICT(player_id) DO UPDATE SET inducted_season=excluded.inducted_season,notes=excluded.notes,active=1,updated_at=CURRENT_TIMESTAMP,updated_by=excluded.updated_by`).bind(playerId,season,notes,actor).run();
      return json({ok:true,action:'hof_added',player_id:playerId});
    }
    if(action==='remove_hof'){
      const playerId=clean(body.player_id);if(!playerId)return json({ok:false,error:'player_id is required.'},422);
      await DB.prepare(`UPDATE hall_of_fame_members SET active=0,updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE player_id=?`).bind(actor,playerId).run();
      return json({ok:true,action:'hof_removed',player_id:playerId});
    }
    return json({ok:false,error:'Unsupported action.'},400);
  }catch(err){return json({ok:false,error:'Honors update failed.',detail:String(err?.message||err)},500)}
}
