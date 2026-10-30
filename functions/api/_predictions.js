const n=v=>Number(v||0);
const norm=v=>String(v||"").toLowerCase();
export function parseOptions(v){try{return Array.isArray(v)?v:JSON.parse(v||"[]")}catch{return []}}
export function effectiveMarketType(m){if(m?.market_type==="series_winner"&&m?.stat_key==="series_spread")return "series_spread";if(m?.market_type==="series_winner"&&m?.stat_key==="series_total_runs")return "series_total";return m?.market_type||""}
function pairMatches(m,s){return [m.team_a_id,m.team_b_id].sort().join("|")===[s.away_team_id,s.home_team_id].sort().join("|")}
function seriesComplete(payload,games){
 const type=payload?.series_type||"played";
 if(type==="playoff"){const len=Number(payload?.playoff?.series_length||3),need=Math.floor(len/2)+1,aw=games.filter(g=>n(g.away_score)>n(g.home_score)).length,hw=games.filter(g=>n(g.home_score)>n(g.away_score)).length;return Math.max(aw,hw)>=need}
 return games.length>=3;
}
async function findSeries(DB,m){
 const rows=await DB.prepare(`SELECT series_id,season,away_team_id,home_team_id,payload_json,series_date FROM series WHERE season=? AND ((away_team_id=? AND home_team_id=?) OR (away_team_id=? AND home_team_id=?)) ORDER BY series_date DESC,published_at DESC`).bind(m.season,m.team_a_id,m.team_b_id,m.team_b_id,m.team_a_id).all();
 for(const s of rows.results||[]){let p={};try{p=JSON.parse(s.payload_json||"{}")}catch{}const r=p?.playoff?.round||null;if(m.playoff_round){if(m.playoff_round!==r)continue}else if(p?.series_type==="playoff")continue;return {...s,payload:p}}
 return null;
}
async function statValue(DB,seriesId,playerId,key){
 const bat=await DB.prepare(`SELECT pa,ab,runs,hits,singles,doubles,triples,hr,rbi,bb,so FROM batting_series_stats WHERE series_id=? AND player_id=?`).bind(seriesId,playerId).first();
 const pit=await DB.prepare(`SELECT outs_recorded,bf,runs,er,strikeouts,hits,bb,hr FROM pitching_series_stats WHERE series_id=? AND player_id=?`).bind(seriesId,playerId).first();
 const map={pa:bat?.pa,ab:bat?.ab,runs:bat?.runs,hits:bat?.hits,singles:bat?.singles,doubles:bat?.doubles,triples:bat?.triples,hr:bat?.hr,rbi:bat?.rbi,bb:bat?.bb,so:bat?.so,pitching_outs:pit?.outs_recorded,pitching_bf:pit?.bf,pitching_runs:pit?.runs,pitching_er:pit?.er,pitching_k:pit?.strikeouts,hits_allowed:pit?.hits,walks_allowed:pit?.bb,hr_allowed:pit?.hr};
 if(key==="wins"){const r=await DB.prepare("SELECT COUNT(*) AS c FROM games WHERE series_id=? AND winning_pitcher_id=?").bind(seriesId,playerId).first();return n(r?.c)}
 return map[key]===undefined||map[key]===null?null:n(map[key]);
}
async function resolveMarket(DB,m){
 const s=await findSeries(DB,m);if(!s)return null;const gr=await DB.prepare("SELECT game_number,away_score,home_score FROM games WHERE series_id=? ORDER BY game_number").bind(s.series_id).all(),games=gr.results||[];
 if(m.market_type==="game_winner"){
  const g=games.find(x=>n(x.game_number)===n(m.game_number));if(!g)return null;const winner=n(g.away_score)>n(g.home_score)?s.away_team_id:s.home_team_id;return {winning:`team:${winner}`,value:null,note:`Game ${g.game_number}: ${g.away_score}-${g.home_score}`,series_id:s.series_id};
 }
 if(m.market_type==="series_winner"){
  if(!seriesComplete(s.payload,games))return null;
  const aw=games.filter(g=>n(g.away_score)>n(g.home_score)).length,hw=games.filter(g=>n(g.home_score)>n(g.away_score)).length;
  const winsByTeam={[s.away_team_id]:aw,[s.home_team_id]:hw};
  if(m.stat_key==="series_spread"){
   const aWins=n(winsByTeam[m.team_a_id]),bWins=n(winsByTeam[m.team_b_id]),adjusted=(aWins-bWins)+Number(m.line||0),winning=adjusted>0?"team_a_cover":adjusted<0?"team_b_cover":"push";
   return {winning,value:aWins-bWins,note:`Series games ${aWins}-${bWins}; ${m.team_a_id} spread ${Number(m.line||0)>=0?"+":""}${Number(m.line||0)}`,series_id:s.series_id};
  }
  if(m.stat_key==="series_total_runs"){
   const total=games.reduce((sum,g)=>sum+n(g.away_score)+n(g.home_score),0),line=Number(m.line),winning=total>line?"over":total<line?"under":"push";
   return {winning,value:total,note:`Series total runs: ${total} vs ${line}`,series_id:s.series_id};
  }
  const winner=aw>hw?s.away_team_id:s.home_team_id;return {winning:`team:${winner}`,value:null,note:`Series ${aw}-${hw}`,series_id:s.series_id};
 }
 if(m.market_type==="player_over_under"){
  if(!seriesComplete(s.payload,games))return null;const value=await statValue(DB,s.series_id,m.player_id,m.stat_key);if(value===null)return null;const line=Number(m.line),winning=value>line?"over":value<line?"under":"push";return {winning,value,note:`${m.stat_key}: ${value} vs ${line}`,series_id:s.series_id};
 }
 return null;
}
export async function settleMarket(DB,m){
 const result=await resolveMarket(DB,m);if(!result)return {settled:false};const wr=await DB.prepare("SELECT * FROM prediction_wagers WHERE market_id=? AND status='pending'").bind(m.market_id).all(),wagers=wr.results||[],stmts=[];
 stmts.push(DB.prepare("UPDATE prediction_markets SET status='settled',winning_option_key=?,result_value=?,result_note=?,settled_at=CURRENT_TIMESTAMP WHERE market_id=? AND status IN ('open','locked')").bind(result.winning,result.value,result.note,m.market_id));
 for(const w of wagers){
  if(result.winning==="push"){
   stmts.push(DB.prepare("UPDATE prediction_wagers SET status='push',payout=stake,settled_at=CURRENT_TIMESTAMP WHERE wager_id=?").bind(w.wager_id));
   stmts.push(DB.prepare("UPDATE user_accounts SET token_balance=token_balance+? WHERE user_id=?").bind(w.stake,w.user_id));
   stmts.push(DB.prepare("INSERT INTO token_ledger(user_id,amount,reason,market_id,wager_id,balance_after,note) SELECT ?,?,'push',?,?,token_balance,? FROM user_accounts WHERE user_id=?").bind(w.user_id,w.stake,m.market_id,w.wager_id,result.note,w.user_id));
  }else if(w.option_key===result.winning){
   const payout=Math.floor(n(w.stake)*Number(w.decimal_odds));
   stmts.push(DB.prepare("UPDATE prediction_wagers SET status='won',payout=?,settled_at=CURRENT_TIMESTAMP WHERE wager_id=?").bind(payout,w.wager_id));
   stmts.push(DB.prepare("UPDATE user_accounts SET token_balance=token_balance+? WHERE user_id=?").bind(payout,w.user_id));
   stmts.push(DB.prepare("INSERT INTO token_ledger(user_id,amount,reason,market_id,wager_id,balance_after,note) SELECT ?,?,'win',?,?,token_balance,? FROM user_accounts WHERE user_id=?").bind(w.user_id,payout,m.market_id,w.wager_id,result.note,w.user_id));
  }else stmts.push(DB.prepare("UPDATE prediction_wagers SET status='lost',payout=0,settled_at=CURRENT_TIMESTAMP WHERE wager_id=?").bind(w.wager_id));
 }
 await DB.batch(stmts);return {settled:true,market_id:m.market_id,wagers:wagers.length,result};
}
export async function settleMarketsForSeries(DB,seriesId){
 const s=await DB.prepare("SELECT season,away_team_id,home_team_id,payload_json FROM series WHERE series_id=?").bind(seriesId).first();if(!s)return [];
 let payload={};try{payload=JSON.parse(s.payload_json||"{}")}catch{}const round=payload?.playoff?.round||null;
 const mr=await DB.prepare("SELECT * FROM prediction_markets WHERE season=? AND status IN ('open','locked') AND ((team_a_id=? AND team_b_id=?) OR (team_a_id=? AND team_b_id=?))").bind(s.season,s.away_team_id,s.home_team_id,s.home_team_id,s.away_team_id).all(),out=[];
 for(const m of mr.results||[]){if(m.playoff_round&&m.playoff_round!==round)continue;const r=await settleMarket(DB,m);if(r.settled)out.push(r)}return out;
}
export async function settleAllMarkets(DB){const r=await DB.prepare("SELECT * FROM prediction_markets WHERE status IN ('open','locked') ORDER BY created_at").all(),out=[];for(const m of r.results||[]){const x=await settleMarket(DB,m);if(x.settled)out.push(x)}return out}
export async function voidMarket(DB,marketId,note="Market voided by commissioner"){
 const m=await DB.prepare("SELECT * FROM prediction_markets WHERE market_id=?").bind(marketId).first();if(!m||!["open","locked"].includes(m.status))return {ok:false};const wr=await DB.prepare("SELECT * FROM prediction_wagers WHERE market_id=? AND status='pending'").bind(marketId).all(),stmts=[DB.prepare("UPDATE prediction_markets SET status='void',result_note=?,settled_at=CURRENT_TIMESTAMP WHERE market_id=?").bind(note,marketId)];
 for(const w of wr.results||[]){stmts.push(DB.prepare("UPDATE prediction_wagers SET status='void',payout=stake,settled_at=CURRENT_TIMESTAMP WHERE wager_id=?").bind(w.wager_id));stmts.push(DB.prepare("UPDATE user_accounts SET token_balance=token_balance+? WHERE user_id=?").bind(w.stake,w.user_id));stmts.push(DB.prepare("INSERT INTO token_ledger(user_id,amount,reason,market_id,wager_id,balance_after,note) SELECT ?,?,'void_refund',?,?,token_balance,? FROM user_accounts WHERE user_id=?").bind(w.user_id,w.stake,marketId,w.wager_id,note,w.user_id))}
 await DB.batch(stmts);return {ok:true,refunded:(wr.results||[]).length};
}
