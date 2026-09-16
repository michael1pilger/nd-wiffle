function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}
const n=v=>Number(v||0);
function ipDisplay(outs){
  const whole=Math.floor(n(outs)/3),rem=n(outs)%3;
  return rem?`${whole}.${rem}`:String(whole);
}

export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);

  const url=new URL(context.request.url);
  const playerId=String(url.searchParams.get("id")||"").trim();
  const season=Number(url.searchParams.get("season")||2026);

  if(!playerId)return json({ok:false,error:"Missing player id."},400);

  try{
    const [playerRes,rosterRes,batRes,pitRes,decisionRes]=await DB.batch([
      DB.prepare(`
        SELECT player_id,name,class_year,retired
        FROM players WHERE player_id=? LIMIT 1
      `).bind(playerId),

      DB.prepare(`
        SELECT tr.season,tr.team_id,t.display_name AS team_name
        FROM team_rosters tr
        JOIN teams t ON t.team_id=tr.team_id
        WHERE tr.player_id=?
        ORDER BY tr.season
      `).bind(playerId),

      DB.prepare(`
        SELECT
          b.series_id,s.series_date,b.team_id,t.display_name AS team_name,
          b.games_played,b.pa,b.ab,b.runs,b.hits,b.singles,b.doubles,b.triples,
          b.hr,b.rbi,b.bb,b.so,b.hbp
        FROM batting_series_stats b
        JOIN series s ON s.series_id=b.series_id
        JOIN teams t ON t.team_id=b.team_id
        WHERE b.player_id=? AND s.season=?
        ORDER BY s.series_date,b.series_id
      `).bind(playerId,season),

      DB.prepare(`
        SELECT
          ps.series_id,s.series_date,ps.team_id,t.display_name AS team_name,
          ps.games_played,ps.appearances,ps.starts,ps.outs_recorded,ps.bf,
          ps.runs,ps.er,ps.strikeouts,ps.hits,ps.bb,ps.hr,ps.hbp,ps.wp
        FROM pitching_series_stats ps
        JOIN series s ON s.series_id=ps.series_id
        JOIN teams t ON t.team_id=ps.team_id
        WHERE ps.player_id=? AND s.season=?
        ORDER BY s.series_date,ps.series_id
      `).bind(playerId,season),

      DB.prepare(`
        SELECT
          SUM(CASE WHEN g.winning_pitcher_id=? THEN 1 ELSE 0 END) AS wins,
          SUM(CASE WHEN g.losing_pitcher_id=? THEN 1 ELSE 0 END) AS losses,
          SUM(CASE WHEN g.save_pitcher_id=? THEN 1 ELSE 0 END) AS saves
        FROM games g
        JOIN series s ON s.series_id=g.series_id
        WHERE s.season=?
      `).bind(playerId,playerId,playerId,season)
    ]);

    const player=playerRes.results?.[0];
    if(!player)return json({ok:false,error:"Player not found."},404);

    const batting=(batRes.results||[]).map(r=>({
      series_id:r.series_id,date:r.series_date,team_id:r.team_id,team_name:r.team_name,
      GP:n(r.games_played),PA:n(r.pa),AB:n(r.ab),R:n(r.runs),H:n(r.hits),
      "1B":n(r.singles),"2B":n(r.doubles),"3B":n(r.triples),HR:n(r.hr),
      RBI:n(r.rbi),BB:n(r.bb),SO:n(r.so),HBP:n(r.hbp)
    }));

    const pitching=(pitRes.results||[]).map(r=>({
      series_id:r.series_id,date:r.series_date,team_id:r.team_id,team_name:r.team_name,
      GP:n(r.games_played),Apps:n(r.appearances),Starts:n(r.starts),
      Outs:n(r.outs_recorded),IP:ipDisplay(r.outs_recorded),BF:n(r.bf),
      R:n(r.runs),ER:n(r.er),K:n(r.strikeouts),H:n(r.hits),BB:n(r.bb),
      HR:n(r.hr),HBP:n(r.hbp),WP:n(r.wp)
    }));

    return json({
      ok:true,build:"v93",season,
      player,
      rosters:rosterRes.results||[],
      batting_series:batting,
      pitching_series:pitching,
      decisions:decisionRes.results?.[0]||{wins:0,losses:0,saves:0}
    });
  }catch(err){
    return json({ok:false,error:"Player detail query failed.",detail:String(err?.message||err)},500);
  }
}
