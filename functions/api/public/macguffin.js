import {
  GAME_START_2026,SERIES_START_2026,GAME_STATS_2025,SERIES_STATS_2025,
  SERIES_TRANSFERS_2021_2025,GAME_CHECKPOINTS_2021_2025,GAME_DATA_NOTE
} from '../_macguffin_history.js';

function respond(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const n=v=>Number(v)||0;
const TEAMS=['ball-busters','dirty-dawgs','goofy-goobers','midnight','silverbacks','stiff-wifflers','storm','twin-titans','underdawgs','zyns'];
const LABEL={'ball-busters':'Ball Busters','dirty-dawgs':'Dirty Dawgs','goofy-goobers':'Goofy Goobers',midnight:'Midnight',silverbacks:'Silverbacks','stiff-wifflers':'Stiff Wifflers',storm:'Storm','twin-titans':'Twin Titans',underdawgs:'Underdawgs',zyns:'Zyns'};
function readPayload(v){try{return v&&JSON.parse(v)||{}}catch{return{}}}
function cloneGameStats(){const x={};for(const t of TEAMS){const s=GAME_STATS_2025[t];x[t]={reigns:[...s.reigns],defenses:[...s.defenses],title_games:[...s.title_games]}}return x}
function cloneSeriesStats(){const x={};for(const t of TEAMS){const s=SERIES_STATS_2025[t];x[t]={...s}}return x}
function addRange(r,v=1){r[0]+=v;r[1]+=v}
function pair(a,b){return [a,b].sort().join('::')}
function winnerOfGame(g){const a=n(g.away_score),h=n(g.home_score);if(a===h)return null;return a>h?g.away_team_id:g.home_team_id}
function gameLabel(g){return `${LABEL[g.away_team_id]||g.away_team_id} ${n(g.away_score)}–${n(g.home_score)} ${LABEL[g.home_team_id]||g.home_team_id}`}

function buildSeriesEvents(seriesRows,gameRows){
  const bySeries=new Map();for(const g of gameRows){if(!bySeries.has(g.series_id))bySeries.set(g.series_id,[]);bySeries.get(g.series_id).push(g)}
  const out=[], regularGroups=new Map();
  for(const s of seriesRows){
    const p=readPayload(s.payload_json),typ=p.series_type||'played';
    if(String(typ).includes('forfeit'))continue; // full/conditional forfeits are invisible to the MacGuffin
    if(typ==='mutual_agreement'){
      const m=p.mutual_agreement||{},aw=n(m.away_wins),hw=n(m.home_wins);
      if(aw+hw>0&&aw!==hw)out.push({date:s.series_date,series_id:s.series_id,season:n(s.season),phase:'regular',a:s.away_team_id,b:s.home_team_id,aw,bw:hw,winner:aw>hw?s.away_team_id:s.home_team_id,method:'agreement'});
      continue;
    }
    const games=(bySeries.get(s.series_id)||[]).filter(g=>winnerOfGame(g));
    const isPlayoff=typ==='playoff'||String(s.series_id).includes('playoff');
    if(isPlayoff){
      const wins={[s.away_team_id]:0,[s.home_team_id]:0};for(const g of games)wins[winnerOfGame(g)]++;
      const length=Math.max(3,n(p.playoff?.series_length)||3),need=Math.floor(length/2)+1;
      const w=wins[s.away_team_id]>=need?s.away_team_id:wins[s.home_team_id]>=need?s.home_team_id:null;
      if(w)out.push({date:s.series_date,series_id:s.series_id,season:n(s.season),phase:'playoff',a:s.away_team_id,b:s.home_team_id,aw:wins[s.away_team_id],bw:wins[s.home_team_id],winner:w,method:'played'});
    }else if(games.length){
      const k=`${s.season}::${pair(s.away_team_id,s.home_team_id)}`;if(!regularGroups.has(k))regularGroups.set(k,[]);regularGroups.get(k).push({s,games});
    }
  }
  for(const parts of regularGroups.values()){
    const all=[];for(const x of parts)for(const g of x.games)all.push(g);all.sort((a,b)=>String(a.series_date).localeCompare(String(b.series_date))||String(a.series_id).localeCompare(String(b.series_id))||n(a.game_number)-n(b.game_number));
    if(all.length<3)continue;
    // Current league schedule has one regular-season three-game series per pair; resumed fragments are merged here.
    const first=parts[0].s,a=first.away_team_id,b=first.home_team_id,wins={[a]:0,[b]:0};for(const g of all.slice(0,3))wins[winnerOfGame(g)]++;
    if(wins[a]===wins[b])continue;
    out.push({date:all.slice(0,3).map(g=>g.series_date).sort().at(-1),series_id:parts.map(x=>x.s.series_id).sort().join('+'),season:n(first.season),phase:'regular',a,b,aw:wins[a],bw:wins[b],winner:wins[a]>wins[b]?a:b,method:'played'});
  }
  return out.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.series_id).localeCompare(String(b.series_id)));
}

export async function onRequestGet(context){
  const DB=context.env.DB;if(!DB)return respond({ok:false,error:'D1 binding DB is unavailable.'},503);
  try{
    const [sr,gr]=await DB.batch([
      DB.prepare(`SELECT series_id,season,series_date,away_team_id,home_team_id,payload_json FROM series WHERE season>=2026 ORDER BY series_date,series_id`),
      DB.prepare(`SELECT g.series_id,g.game_number,g.away_score,g.home_score,s.season,s.series_date,s.away_team_id,s.home_team_id FROM games g JOIN series s ON s.series_id=g.series_id WHERE s.season>=2026 ORDER BY s.series_date,g.series_id,g.game_number`)
    ]);
    const seriesRows=sr.results||[],games=(gr.results||[]).filter(g=>winnerOfGame(g));

    // Game MacGuffin: exact from 2026 onward; historical per-team totals remain ranges.
    let gameHolder=GAME_START_2026, gameStats=cloneGameStats(),gameTransfers=[];
    let gameReignSince={season:2025,event:'RS-2025-36',label:'Underdawgs finish 2025 as holder'},gameReignDefenses=null;
    for(const g of games){
      const winner=winnerOfGame(g);if(!winner)continue;
      if(gameHolder===g.away_team_id||gameHolder===g.home_team_id){
        addRange(gameStats[gameHolder].title_games);
        if(winner===gameHolder){addRange(gameStats[gameHolder].defenses);if(gameReignDefenses!==null)gameReignDefenses++;}
        else{
          const old=gameHolder;gameHolder=winner;addRange(gameStats[gameHolder].reigns);
          gameReignSince={date:g.series_date,series_id:g.series_id,game:n(g.game_number),label:gameLabel(g)};gameReignDefenses=0;
          gameTransfers.push({date:g.series_date,series_id:g.series_id,game:n(g.game_number),from:old,to:gameHolder,label:gameLabel(g)});
        }
      }
    }

    // Series MacGuffin.
    let seriesHolder=SERIES_START_2026,seriesStats=cloneSeriesStats(),seriesTransfers=[];
    let seriesReignSince={season:2025,event:'RS-2025-36',label:'Underdawgs finish 2025 as holder'},seriesReignDefenses=3;
    const liveSeries=buildSeriesEvents(seriesRows,games);
    for(const e of liveSeries){
      if(seriesHolder!==e.a&&seriesHolder!==e.b)continue;
      seriesStats[seriesHolder].title_series++;
      if(e.winner===seriesHolder){seriesStats[seriesHolder].defenses++;seriesReignDefenses++;}
      else{
        const old=seriesHolder;seriesHolder=e.winner;seriesStats[seriesHolder].reigns++;
        seriesReignSince={date:e.date,series_id:e.series_id,label:`${LABEL[e.a]} ${e.aw}–${e.bw} ${LABEL[e.b]}`};seriesReignDefenses=0;
        seriesTransfers.push({date:e.date,series_id:e.series_id,season:e.season,phase:e.phase,from:old,to:seriesHolder,label:seriesReignSince.label,method:e.method});
      }
    }

    return respond({
      ok:true,version:'macguffin-v1',generated_at:new Date().toISOString(),
      rules:{
        lineal:'The holder keeps the MacGuffin until it loses the corresponding game or series.',
        forfeit:'A fully forfeited series is treated as if it never happened. Unplayed/forfeited individual games do not move the Game MacGuffin.',
        agreement:'A mutual agreement can count as an official Series result, but creates no Game MacGuffin event.'
      },
      game:{holder:gameHolder,holder_name:LABEL[gameHolder],first_holder:'storm',first_event:'RS-2021-01 Game 1',reign_since:gameReignSince,current_reign_defenses:gameReignDefenses,stats:gameStats,historical_checkpoints:GAME_CHECKPOINTS_2021_2025,live_transfers:gameTransfers,data_note:GAME_DATA_NOTE},
      series:{holder:seriesHolder,holder_name:LABEL[seriesHolder],first_holder:'storm',first_event:'RS-2021-01',reign_since:seriesReignSince,current_reign_defenses:seriesReignDefenses,stats:seriesStats,transfers:SERIES_TRANSFERS_2021_2025.concat(seriesTransfers)},
      live_series_count:liveSeries.length,live_game_count:games.length
    });
  }catch(err){return respond({ok:false,error:'MacGuffin history could not be calculated.',detail:String(err?.message||err)},500)}
}
