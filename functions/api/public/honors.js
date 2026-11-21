function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const n=v=>Number(v||0);
async function tableReady(DB,name){return !!(await DB.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=?").bind(name).first())}

async function championPlayers(DB,season,teamId,seriesId){
  try{
    const roster=await DB.prepare(`
      SELECT DISTINCT tr.player_id,p.name,tr.team_id
      FROM team_rosters tr
      JOIN players p ON p.player_id=tr.player_id
      WHERE tr.season=? AND tr.team_id=?
      ORDER BY p.name
    `).bind(season,teamId).all();
    if((roster.results||[]).length)return {rows:roster.results||[],source:'season_roster'};
  }catch{}
  const fallback=await DB.prepare(`
    SELECT DISTINCT sp.player_id,p.name,sp.team_id
    FROM series_participants sp
    JOIN players p ON p.player_id=sp.player_id
    WHERE sp.series_id=? AND sp.team_id=?
    ORDER BY p.name
  `).bind(seriesId,teamId).all();
  return {rows:fallback.results||[],source:'series_participants_fallback'};
}

async function worldSeriesChampions(DB){
  const rows=await DB.prepare(`
    SELECT s.series_id,s.season,s.away_team_id,s.home_team_id,
      ta.display_name AS away_team,th.display_name AS home_team,
      COALESCE(CAST(json_extract(s.payload_json,'$.playoff.series_length') AS INTEGER),7) AS max_games,
      SUM(CASE WHEN g.away_score>g.home_score THEN 1 ELSE 0 END) AS away_wins,
      SUM(CASE WHEN g.home_score>g.away_score THEN 1 ELSE 0 END) AS home_wins
    FROM series s
    LEFT JOIN games g ON g.series_id=s.series_id
    JOIN teams ta ON ta.team_id=s.away_team_id
    JOIN teams th ON th.team_id=s.home_team_id
    WHERE s.season>=2026
      AND json_extract(s.payload_json,'$.series_type')='playoff'
      AND json_extract(s.payload_json,'$.playoff.round')='World Series'
    GROUP BY s.series_id,s.season,s.away_team_id,s.home_team_id,ta.display_name,th.display_name,s.payload_json
    ORDER BY s.season
  `).all();

  const out=[];
  for(const r of rows.results||[]){
    const need=Math.floor(n(r.max_games||7)/2)+1,aw=n(r.away_wins),hw=n(r.home_wins);
    if(Math.max(aw,hw)<need||aw===hw)continue;
    const winnerId=aw>hw?r.away_team_id:r.home_team_id;
    const runnerId=aw>hw?r.home_team_id:r.away_team_id;
    const winner=aw>hw?r.away_team:r.home_team;
    const runner=aw>hw?r.home_team:r.away_team;
    const cp=await championPlayers(DB,n(r.season),winnerId,r.series_id);
    out.push({
      season:n(r.season),series_id:r.series_id,team_id:winnerId,team:winner,
      runner_up_team_id:runnerId,runner_up_team:runner,away_wins:aw,home_wins:hw,
      participants:cp.rows,champion_player_source:cp.source
    });
  }
  return out;
}

export async function onRequestGet(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
  try{
    const awardsReady=await tableReady(DB,'league_awards'),hofReady=await tableReady(DB,'hall_of_fame_members');
    if(!awardsReady||!hofReady)return json({ok:false,code:'HONORS_SCHEMA_MISSING',error:'Honors registry is not installed. Run migration 0041_honors_registry.sql.'},503);

    const [awardsRes,hofRes,champions]=await Promise.all([
      DB.prepare(`SELECT a.award_id,a.season,a.player_id,p.name AS player_name,a.award,a.detail,a.source,a.updated_at
        FROM league_awards a JOIN players p ON p.player_id=a.player_id
        WHERE a.active=1 ORDER BY a.season,a.award,p.name`).all(),
      DB.prepare(`SELECT h.player_id,p.name,h.inducted_season,h.notes,h.updated_at
        FROM hall_of_fame_members h JOIN players p ON p.player_id=h.player_id
        WHERE h.active=1 ORDER BY p.name`).all(),
      worldSeriesChampions(DB)
    ]);

    const awards=(awardsRes.results||[]).map(r=>({
      award_id:r.award_id,Season:String(r.season),Player_ID:r.player_id,Player_Name:r.player_name,
      Award:r.award,Detail:r.detail||'',source:r.source||'database',derived:false,updated_at:r.updated_at
    }));

    for(const c of champions){
      for(const p of c.participants||[]){
        awards.push({
          award_id:`derived-ws-${c.season}-${p.player_id}`,
          Season:String(c.season),Player_ID:p.player_id,Player_Name:p.name,
          Award:'World Series Champion',Detail:'',source:'derived_world_series_roster',
          derived:true,series_id:c.series_id,team_id:c.team_id,team:c.team
        });
      }
    }

    const seen=new Set(),dedup=[];
    for(const a of awards){
      const k=`${a.Season}|${a.Player_ID}|${a.Award}|${a.Detail||''}`;
      if(seen.has(k))continue;
      seen.add(k);dedup.push(a);
    }
    const seasons=[...new Set(dedup.map(a=>Number(a.Season)).filter(Number.isFinite))].sort((a,b)=>a-b);

    return json({
      ok:true,build:'honors-v169',awards:dedup,
      hall_of_fame:(hofRes.results||[]).map(r=>({
        player_id:r.player_id,name:r.name,
        inducted_season:r.inducted_season===null?null:n(r.inducted_season),
        notes:r.notes||'',updated_at:r.updated_at
      })),
      champions,seasons
    });
  }catch(err){
    return json({ok:false,error:'Could not load league honors.',detail:String(err?.message||err)},500);
  }
}
