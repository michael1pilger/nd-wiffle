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

const TEAM_ABBR={
  "ball-busters":"BB",
  "midnight":"M",
  "goofy-goobers":"GG",
  "twin-titans":"TT",
  "underdawgs":"UD",
  "storm":"ST",
  "dirty-dawgs":"DD",
  "stiff-wifflers":"SW",
  "zyns":"Z",
  "silverbacks":"SB"
};

function dateLabel(date){
  const [y,m,d]=String(date||"").split("-").map(Number);
  return y&&m&&d ? `${m}/${d}` : String(date||"");
}

function ip(outs){
  outs=n(outs);
  return `${Math.floor(outs/3)}.${outs%3}`;
}

function shortName(name){
  const parts=String(name||"").trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return "";
  if(parts.length===1)return parts[0];
  return parts[parts.length-1];
}

function batPts(r){
  return n(r.singles)+2*n(r.doubles)+3*n(r.triples)+4*n(r.hr)+n(r.rbi)+n(r.bb)-n(r.so);
}

function pitPts(r){
  return n(r.outs_recorded)-2*n(r.er)+n(r.strikeouts)-n(r.hits)-n(r.bb);
}

function statToken(value,label,{spaceMulti=false,showZero=false}={}){
  const v=n(value);
  if(v===0)return showZero?`0${label}`:"";
  if(v===1)return label;
  return spaceMulti?`${v} ${label}`:`${v}${label}`;
}

function batStats(r){
  const out=[`${n(r.hits)}/${n(r.ab)}`];
  const vals=[
    statToken(r.hr,"HR"),
    statToken(r.triples,"3B",{spaceMulti:true}),
    statToken(r.doubles,"2B",{spaceMulti:true}),
    statToken(r.rbi,"RBI"),
    statToken(r.bb,"BB"),
    statToken(r.so,"K")
  ].filter(Boolean);
  return out.concat(vals).join(", ");
}

function pitStats(r){
  return [
    `${ip(r.outs_recorded)}IP`,
    `${n(r.er)}ER`,
    statToken(r.strikeouts,"K",{showZero:true}),
    `${n(r.hits)}H`,
    statToken(r.bb,"BB",{showZero:true})
  ].join(", ");
}

export async function onRequestGet(context){
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);

  const url=new URL(context.request.url);
  const season=Number(url.searchParams.get("season")||2026);
  let date=String(url.searchParams.get("date")||"").trim();

  try{
    const datesRes=await DB.prepare(`
      SELECT DISTINCT series_date
      FROM series
      WHERE season=? AND series_date IS NOT NULL
      ORDER BY series_date DESC
    `).bind(season).all();

    const available_dates=(datesRes.results||[]).map(x=>x.series_date);
    if(!date)date=available_dates[0]||"";

    if(!date){
      return json({ok:true,build:"v93",season,available_dates,date:"",batting:[],pitching:[],recap:{games:[]}});
    }

    const [batRes,pitRes,dayGamesRes,allGamesRes]=await DB.batch([
      DB.prepare(`
        SELECT
          b.player_id,p.name,b.team_id,
          SUM(b.ab) AS ab,SUM(b.hits) AS hits,SUM(b.singles) AS singles,
          SUM(b.doubles) AS doubles,SUM(b.triples) AS triples,SUM(b.hr) AS hr,
          SUM(b.rbi) AS rbi,SUM(b.bb) AS bb,SUM(b.so) AS so
        FROM batting_series_stats b
        JOIN series s ON s.series_id=b.series_id
        JOIN players p ON p.player_id=b.player_id
        WHERE s.season=? AND s.series_date=?
        GROUP BY b.player_id,p.name,b.team_id
      `).bind(season,date),

      DB.prepare(`
        SELECT
          ps.player_id,p.name,ps.team_id,
          SUM(ps.outs_recorded) AS outs_recorded,
          SUM(ps.er) AS er,SUM(ps.strikeouts) AS strikeouts,
          SUM(ps.hits) AS hits,SUM(ps.bb) AS bb
        FROM pitching_series_stats ps
        JOIN series s ON s.series_id=ps.series_id
        JOIN players p ON p.player_id=ps.player_id
        WHERE s.season=? AND s.series_date=?
        GROUP BY ps.player_id,p.name,ps.team_id
      `).bind(season,date),

      DB.prepare(`
        SELECT
          s.series_id,s.series_date,s.away_team_id,s.home_team_id,
          g.game_number,g.away_score,g.home_score,
          g.winning_pitcher_id,g.losing_pitcher_id,
          wp.name AS winning_pitcher_name,
          lp.name AS losing_pitcher_name
        FROM games g
        JOIN series s ON s.series_id=g.series_id
        LEFT JOIN players wp ON wp.player_id=g.winning_pitcher_id
        LEFT JOIN players lp ON lp.player_id=g.losing_pitcher_id
        WHERE s.season=? AND s.series_date=?
        ORDER BY s.series_id,g.game_number
      `).bind(season,date),

      DB.prepare(`
        SELECT
          s.series_id,s.series_date,g.game_number,
          g.winning_pitcher_id,g.losing_pitcher_id
        FROM games g
        JOIN series s ON s.series_id=g.series_id
        WHERE s.season=? AND s.series_date<=?
        ORDER BY s.series_date,s.series_id,g.game_number
      `).bind(season,date)
    ]);

    const batting=(batRes.results||[])
      .map(r=>({
        player_id:r.player_id,
        name:r.name,
        team_id:r.team_id,
        team:TEAM_ABBR[r.team_id]||r.team_id,
        points:batPts(r),
        stats:batStats(r)
      }))
      .sort((a,b)=>b.points-a.points || a.name.localeCompare(b.name))
      .slice(0,5);

    const pitching=(pitRes.results||[])
      .map(r=>({
        player_id:r.player_id,
        name:r.name,
        team_id:r.team_id,
        team:TEAM_ABBR[r.team_id]||r.team_id,
        points:pitPts(r),
        stats:pitStats(r)
      }))
      .sort((a,b)=>b.points-a.points || a.name.localeCompare(b.name))
      .slice(0,5);

    // Build cumulative pitcher records after each game.
    const records=new Map();
    const recordAfter=new Map();
    for(const g of (allGamesRes.results||[])){
      if(g.winning_pitcher_id){
        const r=records.get(g.winning_pitcher_id)||{w:0,l:0};
        r.w++;
        records.set(g.winning_pitcher_id,r);
      }
      if(g.losing_pitcher_id){
        const r=records.get(g.losing_pitcher_id)||{w:0,l:0};
        r.l++;
        records.set(g.losing_pitcher_id,r);
      }
      const key=`${g.series_id}__${g.game_number}`;
      recordAfter.set(key,{
        win:g.winning_pitcher_id ? {...(records.get(g.winning_pitcher_id)||{w:0,l:0})} : {w:0,l:0},
        loss:g.losing_pitcher_id ? {...(records.get(g.losing_pitcher_id)||{w:0,l:0})} : {w:0,l:0}
      });
    }

    const recapGames=(dayGamesRes.results||[]).map(g=>{
      const rec=recordAfter.get(`${g.series_id}__${g.game_number}`)||{win:{w:0,l:0},loss:{w:0,l:0}};
      const decision=`W - ${shortName(g.winning_pitcher_name)} (${rec.win.w}-${rec.win.l}) L - ${shortName(g.losing_pitcher_name)} (${rec.loss.w}-${rec.loss.l})`;
      return {
        series_id:g.series_id,
        game_number:n(g.game_number),
        away_team:TEAM_ABBR[g.away_team_id]||g.away_team_id,
        home_team:TEAM_ABBR[g.home_team_id]||g.home_team_id,
        away_score:n(g.away_score),
        home_score:n(g.home_score),
        decision
      };
    });

    return json({
      ok:true,
      build:"v93",
      season,
      date,
      date_label:dateLabel(date),
      available_dates,
      batting,
      pitching,
      recap:{games:recapGames}
    });
  }catch(err){
    return json({ok:false,error:"Social graphics query failed.",detail:String(err?.message||err)},500);
  }
}
