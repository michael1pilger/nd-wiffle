
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
  const season=Number(url.searchParams.get("season")||2026);
  if(!Number.isInteger(season)||season<2021||season>2100){
    return json({ok:false,error:"Invalid season."},400);
  }

  try{
    const [seriesRes,gamesRes,batRes,pitRes]=await DB.batch([
      DB.prepare(`
        SELECT
          s.series_id,s.series_date,s.away_team_id,s.home_team_id,
          at.display_name AS away_team,ht.display_name AS home_team,
          s.published_at,s.updated_at
        FROM series s
        JOIN teams at ON at.team_id=s.away_team_id
        JOIN teams ht ON ht.team_id=s.home_team_id
        WHERE s.season=?
        ORDER BY s.series_date DESC,s.series_id DESC
      `).bind(season),
      DB.prepare(`
        SELECT
          g.series_id,s.series_date,g.game_number,g.away_score,g.home_score,
          g.winning_pitcher_id,g.losing_pitcher_id,g.save_pitcher_id,
          wp.name AS winning_pitcher,
          lp.name AS losing_pitcher,
          sv.name AS save_pitcher
        FROM games g
        JOIN series s ON s.series_id=g.series_id
        JOIN players wp ON wp.player_id=g.winning_pitcher_id
        JOIN players lp ON lp.player_id=g.losing_pitcher_id
        LEFT JOIN players sv ON sv.player_id=g.save_pitcher_id
        WHERE s.season=?
        ORDER BY s.series_date DESC,g.series_id,g.game_number
      `).bind(season),
      DB.prepare(`
        SELECT
          b.series_id,b.player_id,p.name,b.team_id,t.display_name AS team_name,b.side,
          b.games_played,b.pa,b.ab,b.runs,b.hits,b.singles,b.doubles,b.triples,b.hr,b.rbi,b.bb,b.so,b.hbp
        FROM batting_series_stats b
        JOIN series s ON s.series_id=b.series_id
        JOIN players p ON p.player_id=b.player_id
        JOIN teams t ON t.team_id=b.team_id
        WHERE s.season=?
        ORDER BY s.series_date DESC,b.series_id,p.name
      `).bind(season),
      DB.prepare(`
        SELECT
          ps.series_id,ps.player_id,p.name,ps.team_id,t.display_name AS team_name,ps.side,
          ps.games_played,ps.appearances,ps.starts,ps.outs_recorded,ps.bf,ps.runs,ps.er,
          ps.strikeouts,ps.hits,ps.bb,ps.hr,ps.hbp,ps.wp
        FROM pitching_series_stats ps
        JOIN series s ON s.series_id=ps.series_id
        JOIN players p ON p.player_id=ps.player_id
        JOIN teams t ON t.team_id=ps.team_id
        WHERE s.season=?
        ORDER BY s.series_date DESC,ps.series_id,p.name
      `).bind(season)
    ]);


    // Annotate each game with each decision pitcher's cumulative season W-L record immediately after that game.
    const pitcherRecords=new Map();
    const recordFor=id=>{
      if(!id)return {W:0,L:0};
      if(!pitcherRecords.has(id))pitcherRecords.set(id,{W:0,L:0});
      return pitcherRecords.get(id);
    };
    const chronological=[...(gamesRes.results||[])].sort((a,b)=>
      String(a.series_date||"").localeCompare(String(b.series_date||"")) ||
      String(a.series_id).localeCompare(String(b.series_id)) ||
      n(a.game_number)-n(b.game_number)
    );
    for(const g of chronological){
      const wr=recordFor(g.winning_pitcher_id);wr.W++;
      const lr=recordFor(g.losing_pitcher_id);lr.L++;
      g.winning_pitcher_record=`${wr.W}-${wr.L}`;
      g.losing_pitcher_record=`${lr.W}-${lr.L}`;
      if(g.save_pitcher_id){const sr=recordFor(g.save_pitcher_id);g.save_pitcher_record=`${sr.W}-${sr.L}`;}
    }

    // Normalize legacy uploads where away/home score columns were accidentally reversed.
    // Pitching-series rows preserve each pitcher's actual side, so the winning pitcher is
    // a reliable cross-check for which side won the game.
    const pitcherSide=new Map();
    for(const p of pitRes.results||[]){
      pitcherSide.set(`${p.series_id}::${p.player_id}`,p.side);
    }
    for(const g of gamesRes.results||[]){
      const winnerSide=pitcherSide.get(`${g.series_id}::${g.winning_pitcher_id}`);
      const scoreSide=n(g.away_score)>n(g.home_score)?"away":n(g.home_score)>n(g.away_score)?"home":null;
      if(winnerSide && scoreSide && winnerSide!==scoreSide){
        const tmp=g.away_score;g.away_score=g.home_score;g.home_score=tmp;
        g.score_orientation_corrected=true;
      }
    }

    const gamesBySeries=new Map();
    for(const g of gamesRes.results||[]){
      if(!gamesBySeries.has(g.series_id))gamesBySeries.set(g.series_id,[]);
      gamesBySeries.get(g.series_id).push(g);
    }

    const batBySeries=new Map();
    for(const b of batRes.results||[]){
      if(!batBySeries.has(b.series_id))batBySeries.set(b.series_id,[]);
      const ab=n(b.ab),hits=n(b.hits),pa=n(b.pa),bb=n(b.bb),hbp=n(b.hbp);
      const tb=n(b.singles)+2*n(b.doubles)+3*n(b.triples)+4*n(b.hr);
      const obpDen=pa||(ab+bb+hbp);
      const ba=ab?hits/ab:0,obp=obpDen?(hits+bb+hbp)/obpDen:0,slg=ab?tb/ab:0;
      batBySeries.get(b.series_id).push({
        player_id:b.player_id,name:b.name,team_id:b.team_id,team_name:b.team_name,side:b.side,
        GP:n(b.games_played),PA:pa,AB:ab,R:n(b.runs),H:hits,"1B":n(b.singles),"2B":n(b.doubles),
        "3B":n(b.triples),HR:n(b.hr),RBI:n(b.rbi),BB:bb,SO:n(b.so),HBP:hbp,
        BA:ba.toFixed(3),OBP:obp.toFixed(3),SLG:slg.toFixed(3),OPS:(obp+slg).toFixed(3)
      });
    }

    const decisionsBySeries=new Map();
    for(const g of gamesRes.results||[]){
      if(!decisionsBySeries.has(g.series_id))decisionsBySeries.set(g.series_id,new Map());
      const m=decisionsBySeries.get(g.series_id);
      const bump=(name,key)=>{
        if(!name)return;
        if(!m.has(name))m.set(name,{W:0,L:0,S:0});
        m.get(name)[key]++;
      };
      bump(g.winning_pitcher,"W");bump(g.losing_pitcher,"L");bump(g.save_pitcher,"S");
    }

    const pitBySeries=new Map();
    for(const p of pitRes.results||[]){
      if(!pitBySeries.has(p.series_id))pitBySeries.set(p.series_id,[]);
      const outs=n(p.outs_recorded),innings=outs/3,er=n(p.er),walks=n(p.bb),hits=n(p.hits);
      const d=decisionsBySeries.get(p.series_id)?.get(p.name)||{W:0,L:0,S:0};
      pitBySeries.get(p.series_id).push({
        player_id:p.player_id,name:p.name,team_id:p.team_id,team_name:p.team_name,side:p.side,
        GP:n(p.games_played),Apps:n(p.appearances),Starts:n(p.starts),Outs:outs,IP:ipDisplay(outs),
        BF:n(p.bf),R:n(p.runs),ER:er,K:n(p.strikeouts),H:hits,BB:walks,HR:n(p.hr),HBP:n(p.hbp),WP:n(p.wp),
        W:n(d.W),L:n(d.L),S:n(d.S),
        ERA:outs>0?((er*3)/innings).toFixed(2):null,
        WHIP:outs>0?((walks+hits)/innings).toFixed(2):null
      });
    }

    const series=(seriesRes.results||[]).map(s=>{
      const games=gamesBySeries.get(s.series_id)||[];
      const away_wins=games.filter(g=>n(g.away_score)>n(g.home_score)).length;
      const home_wins=games.filter(g=>n(g.home_score)>n(g.away_score)).length;
      return {
        ...s,away_wins,home_wins,
        games,
        batting:batBySeries.get(s.series_id)||[],
        pitching:pitBySeries.get(s.series_id)||[]
      };
    });

    return json({ok:true,build:"v70",season,series_count:series.length,series});
  }catch(err){
    return json({ok:false,error:"Public results query failed.",detail:String(err?.message||err)},500);
  }
}
