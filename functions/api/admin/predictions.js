import {settleAllMarkets,voidMarket,parseOptions,effectiveMarketType} from "../_predictions.js";
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
const num=v=>Number(v);
const clean=v=>String(v??"").trim();
const fmtSigned=v=>`${Number(v)>=0?"+":""}${Number(v)}`;
async function teamMap(DB,a,b){const r=await DB.prepare("SELECT team_id,display_name FROM teams WHERE team_id IN (?,?)").bind(a,b).all();return new Map((r.results||[]).map(x=>[x.team_id,x.display_name]))}
async function normalizeMarket(DB,body){
 const requested=clean(body.market_type),teamA=clean(body.team_a_id),teamB=clean(body.team_b_id),round=clean(body.playoff_round)||null,closeAt=clean(body.close_at);
 const allowed=["game_winner","series_moneyline","series_winner","series_spread","series_total","player_over_under"];
 if(!allowed.includes(requested))return {error:"Choose a valid market type."};
 if(!teamA||!teamB||teamA===teamB)return {error:"Choose two different teams."};
 if(!closeAt||!Number.isFinite(Date.parse(closeAt)))return {error:"Choose a valid close time."};
 const tm=await teamMap(DB,teamA,teamB);if(tm.size!==2)return {error:"One or both teams are invalid."};
 const oddsA=num(body.odds_a),oddsB=num(body.odds_b);if(!(oddsA>=1.01&&oddsB>=1.01))return {error:"Both decimal odds must be at least 1.01."};
 let title=clean(body.title),marketType=requested,statKey=null,line=null,gameNumber=null,playerId=null,options=[];
 if(requested==="series_moneyline"||requested==="series_winner")marketType="series_winner";
 if(requested==="series_spread")marketType="series_winner";
 if(requested==="series_total")marketType="series_winner";
 if(requested==="game_winner"){
  gameNumber=Number(body.game_number);if(!Number.isInteger(gameNumber)||gameNumber<1||gameNumber>7)return {error:"Game number must be 1–7."};
  options=[{key:`team:${teamA}`,label:tm.get(teamA),odds:oddsA},{key:`team:${teamB}`,label:tm.get(teamB),odds:oddsB}];
  if(!title)title=`Game ${gameNumber}: ${tm.get(teamA)} vs ${tm.get(teamB)}`;
 }
 if(requested==="series_moneyline"||requested==="series_winner"){
  options=[{key:`team:${teamA}`,label:tm.get(teamA),odds:oddsA},{key:`team:${teamB}`,label:tm.get(teamB),odds:oddsB}];
  if(!title)title=`Series Moneyline: ${tm.get(teamA)} vs ${tm.get(teamB)}`;
 }
 if(requested==="series_spread"){
  statKey="series_spread";line=Number(body.line);if(!Number.isFinite(line)||line===0)return {error:"Enter Team A's signed series-game spread, such as -1.5."};
  options=[{key:"team_a_cover",label:`${tm.get(teamA)} ${fmtSigned(line)}`,odds:oddsA},{key:"team_b_cover",label:`${tm.get(teamB)} ${fmtSigned(-line)}`,odds:oddsB}];
  if(!title)title=`Series Spread: ${tm.get(teamA)} ${fmtSigned(line)} vs ${tm.get(teamB)} ${fmtSigned(-line)}`;
 }
 if(requested==="series_total"){
  statKey="series_total_runs";line=Number(body.line);if(!Number.isFinite(line)||line<=0)return {error:"Enter a positive series run total."};
  options=[{key:"over",label:`Over ${line}`,odds:oddsA},{key:"under",label:`Under ${line}`,odds:oddsB}];
  if(!title)title=`Series Total Runs: ${tm.get(teamA)} vs ${tm.get(teamB)} O/U ${line}`;
 }
 if(requested==="player_over_under"){
  playerId=clean(body.player_id);statKey=clean(body.stat_key);line=Number(body.line);
  const allowedStats=["hits","hr","rbi","runs","bb","so","doubles","triples","pa","pitching_k","pitching_outs","pitching_er","hits_allowed","walks_allowed","hr_allowed","wins"];
  if(!playerId||!allowedStats.includes(statKey)||!Number.isFinite(line))return {error:"Choose a player, stat, and valid line."};
  const p=await DB.prepare("SELECT p.name,tr.team_id FROM players p LEFT JOIN team_rosters tr ON tr.player_id=p.player_id AND tr.season=2026 WHERE p.player_id=? LIMIT 1").bind(playerId).first();
  if(!p)return {error:"Player not found."};if(p.team_id&&![teamA,teamB].includes(p.team_id))return {error:"For automatic settlement, the selected player must belong to one of the two teams."};
  options=[{key:"over",label:`Over ${line}`,odds:oddsA},{key:"under",label:`Under ${line}`,odds:oddsB}];
  if(!title)title=`${p.name}: ${statKey.replace(/_/g," ")} O/U ${line}`;
 }
 return {value:{season:2026,title,market_type:marketType,effective_type:requested==="series_winner"?"series_moneyline":requested,team_a_id:teamA,team_b_id:teamB,playoff_round:round,game_number:gameNumber,player_id:playerId,stat_key:statKey,line,options_json:JSON.stringify(options),options,close_at:new Date(closeAt).toISOString()}};
}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 try{
  const r=await DB.prepare(`SELECT pm.*,p.name AS player_name,ptr.team_id AS player_team_id,ta.display_name AS team_a,tb.display_name AS team_b,(SELECT COUNT(*) FROM prediction_wagers w WHERE w.market_id=pm.market_id) AS wager_count,(SELECT COALESCE(SUM(stake),0) FROM prediction_wagers w WHERE w.market_id=pm.market_id) AS token_volume FROM prediction_markets pm LEFT JOIN players p ON p.player_id=pm.player_id LEFT JOIN team_rosters ptr ON ptr.player_id=pm.player_id AND ptr.season=pm.season LEFT JOIN teams ta ON ta.team_id=pm.team_a_id LEFT JOIN teams tb ON tb.team_id=pm.team_b_id ORDER BY pm.created_at DESC`).all();
  return json({ok:true,markets:(r.results||[]).map(m=>({...m,effective_type:effectiveMarketType(m)==="series_winner"?"series_moneyline":effectiveMarketType(m),options:parseOptions(m.options_json),options_json:undefined}))});
 }catch(err){const m=String(err?.message||err);if(m.includes("no such table"))return json({ok:true,markets:[],schema_ready:false});return json({ok:false,error:"Admin prediction query failed.",detail:m},500)}
}
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be JSON."},400)}
 const action=body.action||"create",actor=context.data.actorEmail||"unknown-access-user";
 try{
  if(action==="settle_all"){const settled=await settleAllMarkets(DB);return json({ok:true,settled_count:settled.length,settled})}
  if(action==="void"){const r=await voidMarket(DB,clean(body.market_id),clean(body.note)||"Market voided by commissioner");return r.ok?json({ok:true,...r}):json({ok:false,error:"Market could not be voided."},409)}
  if(action==="delete"){
   const marketId=clean(body.market_id);if(!marketId)return json({ok:false,error:"market_id is required."},422);
   const current=await DB.prepare(`SELECT pm.market_id,pm.title,(SELECT COUNT(*) FROM prediction_wagers w WHERE w.market_id=pm.market_id) AS wager_count FROM prediction_markets pm WHERE pm.market_id=?`).bind(marketId).first();
   if(!current)return json({ok:false,error:"Market not found."},404);
   if(Number(current.wager_count||0)>0)return json({ok:false,error:"This market already has wagers. Void + Refund it instead so wager and token history remain auditable."},409);
   await DB.prepare("DELETE FROM prediction_markets WHERE market_id=?").bind(marketId).run();
   return json({ok:true,deleted:true,market_id:marketId,title:current.title});
  }
  if(action==="create"){
   const parsed=await normalizeMarket(DB,body);if(parsed.error)return json({ok:false,error:parsed.error},422);const v=parsed.value;
   if(Date.parse(v.close_at)<=Date.now())return json({ok:false,error:"Close time must be in the future."},422);
   const id=crypto.randomUUID();
   await DB.prepare(`INSERT INTO prediction_markets(market_id,season,title,market_type,team_a_id,team_b_id,playoff_round,game_number,player_id,stat_key,line,options_json,close_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,v.season,v.title,v.market_type,v.team_a_id,v.team_b_id,v.playoff_round,v.game_number,v.player_id,v.stat_key,v.line,v.options_json,v.close_at,actor).run();
   return json({ok:true,market_id:id,title:v.title},201);
  }
  if(action==="update"){
   const marketId=clean(body.market_id);if(!marketId)return json({ok:false,error:"market_id is required."},422);
   const current=await DB.prepare(`SELECT pm.*,(SELECT COUNT(*) FROM prediction_wagers w WHERE w.market_id=pm.market_id) AS wager_count FROM prediction_markets pm WHERE pm.market_id=?`).bind(marketId).first();
   if(!current)return json({ok:false,error:"Market not found."},404);if(!["open","locked"].includes(current.status))return json({ok:false,error:"Only open or locked markets can be edited."},409);
   const parsed=await normalizeMarket(DB,body);if(parsed.error)return json({ok:false,error:parsed.error},422);const v=parsed.value,wagers=Number(current.wager_count||0);
   if(wagers>0){
    const structuralChanged=current.market_type!==v.market_type||current.team_a_id!==v.team_a_id||current.team_b_id!==v.team_b_id||String(current.playoff_round||"")!==String(v.playoff_round||"")||Number(current.game_number||0)!==Number(v.game_number||0)||String(current.player_id||"")!==String(v.player_id||"")||String(current.stat_key||"")!==String(v.stat_key||"")||Number(current.line||0)!==Number(v.line||0)||JSON.stringify(parseOptions(current.options_json))!==JSON.stringify(v.options);
    if(structuralChanged)return json({ok:false,error:"This market already has wagers. You may edit only its title or close time; void and recreate it to change teams, line, player, or odds."},409);
    await DB.prepare("UPDATE prediction_markets SET title=?,close_at=?,status=CASE WHEN datetime(?)>datetime('now') THEN 'open' ELSE 'locked' END WHERE market_id=?").bind(v.title,v.close_at,v.close_at,marketId).run();
    return json({ok:true,market_id:marketId,title:v.title,limited:true});
   }
   await DB.prepare(`UPDATE prediction_markets SET title=?,market_type=?,team_a_id=?,team_b_id=?,playoff_round=?,game_number=?,player_id=?,stat_key=?,line=?,options_json=?,close_at=?,status=CASE WHEN datetime(?)>datetime('now') THEN 'open' ELSE 'locked' END WHERE market_id=?`).bind(v.title,v.market_type,v.team_a_id,v.team_b_id,v.playoff_round,v.game_number,v.player_id,v.stat_key,v.line,v.options_json,v.close_at,v.close_at,marketId).run();
   return json({ok:true,market_id:marketId,title:v.title});
  }
  return json({ok:false,error:"Unsupported action."},400);
 }catch(err){const m=String(err?.message||err);if(m.includes("no such table"))return json({ok:false,error:"Prediction schema is not ready. Run migration 0034."},503);return json({ok:false,error:"Prediction admin action failed.",detail:m},500)}
}
