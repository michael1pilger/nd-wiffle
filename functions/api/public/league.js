
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
  const whole=Math.floor(n(outs)/3), rem=n(outs)%3;
  return rem ? `${whole}.${rem}` : String(whole);
}
function rate(num,den,digits=3){
  return den>0 ? (num/den).toFixed(digits) : "0.000";
}

export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);

  const url=new URL(context.request.url);
  const season=Number(url.searchParams.get("season")||2026);
  if(!Number.isInteger(season)||season<2021||season>2100){
    return json({ok:false,error:"Invalid season."},400);
  }

  try{
    const [
      teamsRes,gamesRes,batRes,pitRes,decisionsRes,participantsRes,seriesCountRes
    ]=await DB.batch([
      DB.prepare(`
        SELECT team_id, display_name
        FROM teams
        WHERE active_2026=1
        ORDER BY display_name
      `),
      DB.prepare(`
        SELECT
          s.series_id,s.series_date,
          s.away_team_id,s.home_team_id,
          at.display_name AS away_team,
          ht.display_name AS home_team,
          g.game_number,g.away_score,g.home_score
        FROM games g
        JOIN series s ON s.series_id=g.series_id
        JOIN teams at ON at.team_id=s.away_team_id
        JOIN teams ht ON ht.team_id=s.home_team_id
        WHERE s.season=?
        ORDER BY s.series_date,s.series_id,g.game_number
      `).bind(season),
      DB.prepare(`
        SELECT
          b.player_id,p.name,p.class_year,p.retired,
          SUM(b.games_played) AS gp,
          SUM(b.pa) AS pa,SUM(b.ab) AS ab,SUM(b.runs) AS runs,
          SUM(b.hits) AS hits,SUM(b.singles) AS singles,
          SUM(b.doubles) AS doubles,SUM(b.triples) AS triples,SUM(b.hr) AS hr,
          SUM(b.rbi) AS rbi,SUM(b.bb) AS bb,SUM(b.so) AS so,SUM(b.hbp) AS hbp
        FROM batting_series_stats b
        JOIN series s ON s.series_id=b.series_id
        JOIN players p ON p.player_id=b.player_id
        WHERE s.season=?
        GROUP BY b.player_id,p.name,p.class_year,p.retired
        ORDER BY p.name
      `).bind(season),
      DB.prepare(`
        SELECT
          ps.player_id,p.name,p.class_year,p.retired,
          SUM(ps.games_played) AS gp,
          SUM(ps.appearances) AS apps,SUM(ps.starts) AS starts,
          SUM(ps.outs_recorded) AS outs_recorded,SUM(ps.bf) AS bf,
          SUM(ps.runs) AS runs,SUM(ps.er) AS er,SUM(ps.strikeouts) AS strikeouts,
          SUM(ps.hits) AS hits,SUM(ps.bb) AS bb,SUM(ps.hr) AS hr,
          SUM(ps.hbp) AS hbp,SUM(ps.wp) AS wp
        FROM pitching_series_stats ps
        JOIN series s ON s.series_id=ps.series_id
        JOIN players p ON p.player_id=ps.player_id
        WHERE s.season=?
        GROUP BY ps.player_id,p.name,p.class_year,p.retired
        ORDER BY p.name
      `).bind(season),
      DB.prepare(`
        SELECT player_id,
          SUM(wins) AS wins,SUM(losses) AS losses,SUM(saves) AS saves
        FROM (
          SELECT g.winning_pitcher_id AS player_id, COUNT(*) AS wins,0 AS losses,0 AS saves
          FROM games g JOIN series s ON s.series_id=g.series_id
          WHERE s.season=? GROUP BY g.winning_pitcher_id
          UNION ALL
          SELECT g.losing_pitcher_id AS player_id,0,COUNT(*),0
          FROM games g JOIN series s ON s.series_id=g.series_id
          WHERE s.season=? GROUP BY g.losing_pitcher_id
          UNION ALL
          SELECT g.save_pitcher_id AS player_id,0,0,COUNT(*)
          FROM games g JOIN series s ON s.series_id=g.series_id
          WHERE s.season=? AND g.save_pitcher_id IS NOT NULL
          GROUP BY g.save_pitcher_id
        )
        GROUP BY player_id
      `).bind(season,season,season),
      DB.prepare(`
        SELECT DISTINCT sp.player_id,p.name,sp.team_id,t.display_name AS team_name
        FROM series_participants sp
        JOIN series s ON s.series_id=sp.series_id
        JOIN players p ON p.player_id=sp.player_id
        JOIN teams t ON t.team_id=sp.team_id
        WHERE s.season=?
        ORDER BY p.name,t.display_name
      `).bind(season),
      DB.prepare("SELECT COUNT(*) AS count FROM series WHERE season=?").bind(season)
    ]);

    const teams=teamsRes.results||[];
    const games=gamesRes.results||[];
    const standings=new Map(teams.map(t=>[t.team_id,{
      team_id:t.team_id,team:t.display_name,W:0,L:0,RS:0,RA:0
    }]));
    for(const g of games){
      const away=standings.get(g.away_team_id),home=standings.get(g.home_team_id);
      if(!away||!home)continue;
      away.RS+=n(g.away_score);away.RA+=n(g.home_score);
      home.RS+=n(g.home_score);home.RA+=n(g.away_score);
      if(n(g.away_score)>n(g.home_score)){away.W++;home.L++;}
      else{home.W++;away.L++;}
    }
    let rows=[...standings.values()].map(r=>{
      const gp=r.W+r.L;
      return {...r,GP:gp,PCT:gp?r.W/gp:0,DIFF:r.RS-r.RA};
    }).sort((a,b)=>
      b.PCT-a.PCT || b.W-a.W || b.DIFF-a.DIFF || b.RS-a.RS || a.team.localeCompare(b.team)
    );
    const leader=rows[0]||{W:0,L:0};
    rows=rows.map((r,i)=>({
      ...r,
      rank:i+1,
      GB:i===0?0:((leader.W-r.W)+(r.L-leader.L))/2
    }));

    const decisions=new Map((decisionsRes.results||[]).map(r=>[r.player_id,r]));
    const batting=(batRes.results||[]).map(r=>{
      const pa=n(r.pa),ab=n(r.ab),hits=n(r.hits),bb=n(r.bb),hbp=n(r.hbp);
      const tb=n(r.singles)+2*n(r.doubles)+3*n(r.triples)+4*n(r.hr);
      const obpDen=pa || (ab+bb+hbp);
      const ba=ab?hits/ab:0,obp=obpDen?(hits+bb+hbp)/obpDen:0,slg=ab?tb/ab:0;
      return {
        Player_ID:r.player_id,Name:r.name,Class_Year:r.class_year,Retired:String(r.retired||0),
        Season:String(season),GP:n(r.gp),PAs:pa,ABs:ab,Runs:n(r.runs),Hits:hits,
        Singles:n(r.singles),Doubles:n(r.doubles),Triples:n(r.triples),HRs:n(r.hr),
        RBI:n(r.rbi),BB:bb,Ks:n(r.so),HBP:hbp,
        BA:ba.toFixed(3),OBP:obp.toFixed(3),SLG:slg.toFixed(3),OPS:(obp+slg).toFixed(3)
      };
    });
    const pitching=(pitRes.results||[]).map(r=>{
      const outs=n(r.outs_recorded),ip=outs/3,er=n(r.er),walks=n(r.bb),hits=n(r.hits);
      const d=decisions.get(r.player_id)||{};
      return {
        Player_ID:r.player_id,Name:r.name,Class_Year:r.class_year,Retired:String(r.retired||0),
        Season:String(season),GP:n(r.gp),Apps:n(r.apps),Starts:n(r.starts),
        W:n(d.wins),L:n(d.losses),S:n(d.saves),Outs:outs,IP:ipDisplay(outs),
        BF:n(r.bf),Runs:n(r.runs),ER:er,Walks:walks,Hits:hits,Ks:n(r.strikeouts),
        HRs:n(r.hr),HBP:n(r.hbp),WP:n(r.wp),
        ERA:ip?((er*3)/ip).toFixed(2):"0.00",
        WHIP:ip?((walks+hits)/ip).toFixed(2):"0.00"
      };
    });

    return json({
      ok:true,build:"v38",season,
      series_count:n(seriesCountRes.results?.[0]?.count),
      standings:rows,
      batting,
      pitching,
      participants:participantsRes.results||[],
      games
    });
  }catch(err){
    return json({ok:false,error:"Public league query failed.",detail:String(err?.message||err)},500);
  }
}
