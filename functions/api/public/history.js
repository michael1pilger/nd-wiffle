// Public historical series and live 2026 head-to-head records.
// All historical records are in historical_h2h_series; 2026 remains in native D1 series/games.
// Forfeits/agreements count as games won/lost but never fabricate scores, runs, or pitcher decisions.
function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
const num = v => Number(v) || 0;
const isValidId = s => typeof s === 'string' && /^[a-z0-9-]+$/.test(s);
const pair = (a,b) => [a,b].sort().join('::');
function readPayload(v) { try { return v && JSON.parse(v) || {}; } catch { return {}; } }

function liveSeries(rows, allGames) {
  const gs = new Map();
  for (const g of allGames) {
    if (!gs.has(g.series_id)) gs.set(g.series_id, []);
    const x = {...g};
    const scoredSide = num(x.away_score) > num(x.home_score) ? 'away' : 'home';
    // Same legacy score-orientation correction used by /api/public/league.
    if (x.winning_pitcher_side && x.winning_pitcher_side !== scoredSide) {
      const temp = x.away_score; x.away_score = x.home_score; x.home_score = temp;
    }
    gs.get(g.series_id).push(x);
  }
  const groups = new Map();
  const playoff = [];
  const pending = [];
  for (const s of rows) {
    const payload = readPayload(s.payload_json);
    const typ = payload.series_type || 'played';
    const base = {...s, _payload:payload, _type:typ, _games:gs.get(s.series_id)||[]};
    if (typ==='playoff') playoff.push(base);
    else {
      const key=pair(s.away_team_id,s.home_team_id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(base);
    }
  }
  const out = [];
  function normalize(group,phase) {
    group.sort((a,b) => String(a.series_date).localeCompare(String(b.series_date)) || String(a.series_id).localeCompare(String(b.series_id)));
    const first=group[0], a=first.away_team_id,b=first.home_team_id;
    let aw=0,bw=0,count=0;
    const types=[];
    const length = phase==='playoff' ? Math.max(3,num(first._payload.playoff?.series_length)||3) : 3;
    for(const entry of group){
      const tp=entry._type;
      types.push(tp);
      if(tp==='conditional_forfeit') {
        const forfeiting=entry._payload.conditional_forfeit?.forfeiting_side;
        if(forfeiting!=='home' && forfeiting!=='away'){pending.push({series_id:entry.series_id, reason:'forfeit side missing'});continue;}
        const loser=forfeiting==='away'?entry.away_team_id:entry.home_team_id;
        if(loser===a) bw+=3;
        else if(loser===b) aw+=3;
        count+=3;
      } else if(tp==='mutual_agreement') {
        const m=entry._payload.mutual_agreement||{};
        const awayWins=num(m.away_wins), homeWins=num(m.home_wins);
        if(awayWins+homeWins!==3 || awayWins===homeWins){pending.push({series_id:entry.series_id, reason:'agreement is incomplete'});continue;}
        if(entry.away_team_id===a){aw+=awayWins;bw+=homeWins;}
        else {aw+=homeWins;bw+=awayWins;}
        count+=awayWins+homeWins;
      } else {
        for(const g of entry._games){
          const w=num(g.away_score)>num(g.home_score)?entry.away_team_id:entry.home_team_id;
          if(w===a)aw++; else if(w===b)bw++;
          count++;
        }
      }
    }
    const complete=phase==='playoff'?Math.max(aw,bw)>length/2:count===3;
    if(!complete || aw===bw){pending.push({series_id:group.map(x=>x.series_id).join('+'),reason:'series not complete',games_accounted:count});return;}
    out.push({
      series_id:group.map(x=>x.series_id).join('+'),
      season:2026,phase,
      round_name:phase==='playoff'?String(first._payload.playoff?.round||'Playoffs'):'',
      team_a_id:a, team_b_id:b,team_a_game_wins:aw, team_b_game_wins:bw,
      result_type:types.length===1?types[0]:types.includes('conditional_forfeit')?'mixed_forfeit':types.includes('mutual_agreement')?'mixed_agreement':'played',
      evidence_level:'published_live_d1',source:'live_d1',quality_flags:'',notes:'',series_date:first.series_date
    });
  }
  // 2026 regular season is single-round-robin by pair; resumed fragments are merged by pair.
  for(const group of groups.values()){
    const played=group.filter(s=>s._type==='played' && s._games.length>0);
    const blank=group.filter(s=>s._type==='played' && s._games.length===0);
    for(const s of blank)pending.push({series_id:s.series_id,reason:'no played game result / disposition not recorded'});
    const gameCount=played.reduce((n,s)=>n+s._games.length,0);
    // Merge only real game fragments, never a forfeit/agreement with a separate played series.
    if(played.length>1 && gameCount<=3)normalize(played,'regular');
    else for(const s of played) normalize([s],'regular');
    for(const s of group.filter(s=>s._type==='conditional_forfeit' || s._type==='mutual_agreement'))normalize([s],'regular');
  }
  for(const s of playoff) normalize([s],'playoff');
  return {out,pending};
}

export async function onRequestGet(context) {
  const DB=context.env.DB;
  if(!DB) return respond({ok:false,error:'D1 binding DB is unavailable.'},503);
  try {
    const [history,source,game] = await DB.batch([
      DB.prepare(`SELECT historical_id AS series_id,season,phase,round_name,team_a_id,team_b_id,
        team_a_game_wins,team_b_game_wins,result_type,evidence_level,source,quality_flags,notes
        FROM historical_h2h_series ORDER BY season,phase,series_id`),
      DB.prepare(`SELECT series_id,season,series_date,away_team_id,home_team_id,payload_json
        FROM series WHERE season=2026 ORDER BY series_date,series_id`),
      DB.prepare(`SELECT g.series_id,g.game_number,g.away_score,g.home_score,
        (SELECT ps.side FROM pitching_series_stats ps
          WHERE ps.series_id=g.series_id AND ps.player_id=g.winning_pitcher_id LIMIT 1) AS winning_pitcher_side
        FROM games g JOIN series s ON s.series_id=g.series_id
        WHERE s.season=2026 ORDER BY g.series_id,g.game_number`)
    ]);
    const old=(history.results||[]).map(r=>({...r,team_a_game_wins:num(r.team_a_game_wins),team_b_game_wins:num(r.team_b_game_wins)}));
    const live=liveSeries(source.results||[],game.results||[]);
    const entries=old.concat(live.out);
    const warnings=[];
    if(old.length!==189) warnings.push('Expected 189 historical series (162 regular, 27 playoff), found '+old.length+'.');
    if(live.pending.length)warnings.push(live.pending.length+' live 2026 entries are incomplete/unclassified and excluded from final records.');
    // Never expose raw payload_json or commissioner details to the public endpoint.
    return respond({ok:true,version:'2026-history-v1',historical_count:old.length,
      live_2026_count:live.out.length,rows:entries,unresolved_2026_count:live.pending.length,warnings});
  } catch(err) {
    // Missing table before migration: respond with actionable error; do not expose SQL internals.
    return respond({ok:false,error:'Historical head-to-head data are not initialized. Apply migrations 0036 and 0037, then retry.'},503);
  }
}
