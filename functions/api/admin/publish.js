function json(body, status=200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
const norm = v => String(v || "").trim().toLowerCase();
const int = v => Number.isInteger(v) ? v : null;
function nonnegInt(v){ return Number.isInteger(v) && v >= 0; }
function sum(rows, key){ return rows.reduce((a,r)=>a+Number(r[key]||0),0); }

async function registry(DB) {
  const [playersRes, teamsRes, aliasesRes] = await DB.batch([
    DB.prepare("SELECT player_id,name FROM players"),
    DB.prepare("SELECT team_id,display_name FROM teams"),
    DB.prepare("SELECT alias,team_id FROM team_aliases")
  ]);
  const playersByName = new Map((playersRes.results||[]).map(r=>[norm(r.name),r]));
  const teamsByName = new Map((teamsRes.results||[]).map(r=>[norm(r.display_name),r.team_id]));
  for (const r of aliasesRes.results||[]) teamsByName.set(norm(r.alias),r.team_id);
  return {playersByName,teamsByName};
}
function collectPlayerNames(payload){
  const names=new Set();
  for(const p of payload.participants||[]) names.add(p.name);
  for(const p of payload.batting||[]) names.add(p.player);
  for(const p of payload.pitching||[]) names.add(p.player);
  for(const g of payload.games||[]){
    names.add(g.winning_pitcher); names.add(g.losing_pitcher);
    if(g.save_pitcher) names.add(g.save_pitcher);
  }
  for(const c of payload.manual_corrections||[]) if(c.player) names.add(c.player);
  return [...names].filter(Boolean);
}
function serverValidate(payload, teamIds, playerIds){
  const errors=[], warnings=[];
  if(payload.schema_version!==3) errors.push("Unsupported schema_version; expected 3.");
  if(!payload.series_id) errors.push("series_id is required.");
  const s=payload.series||{};
  if(!Number.isInteger(s.season) || s.season<2021 || s.season>2100) errors.push("Invalid season.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s.date||""))) errors.push("Invalid series date.");
  if(!teamIds.away || !teamIds.home) errors.push("Unknown home or away team.");
  if(teamIds.away && teamIds.home && teamIds.away===teamIds.home) errors.push("Home and away team cannot match.");

  const games=payload.games||[];
  if(games.length!==3) errors.push("Exactly 3 games are required.");
  const participantByName=new Map((payload.participants||[]).map(p=>[norm(p.name),p]));
  const participantNames=new Set();
  for(const p of payload.participants||[]){
    if(participantNames.has(norm(p.name))) errors.push(`Duplicate participant: ${p.name}`);
    participantNames.add(norm(p.name));
    if(!playerIds.get(norm(p.name))) errors.push(`Unknown participant: ${p.name}`);
    if(!["away","home"].includes(p.side)) errors.push(`Invalid participant side: ${p.name}`);
    if(!Number.isInteger(p.games_played)||p.games_played<1||p.games_played>3) errors.push(`Invalid GP for ${p.name}`);
  }

  let awayRS=0, homeRS=0;
  for(const g of games){
    if(!Number.isInteger(g.game)||g.game<1||g.game>3) errors.push("Invalid game number.");
    if(!nonnegInt(g.away_score)||!nonnegInt(g.home_score)) errors.push(`Game ${g.game}: invalid score.`);
    if(g.away_score===g.home_score) errors.push(`Game ${g.game}: tie score is not allowed.`);
    awayRS+=Number(g.away_score||0); homeRS+=Number(g.home_score||0);
    const wp=participantByName.get(norm(g.winning_pitcher));
    const lp=participantByName.get(norm(g.losing_pitcher));
    if(!wp||!lp) errors.push(`Game ${g.game}: pitcher decision references a non-participant.`);
    else{
      const winnerSide=g.away_score>g.home_score?"away":"home";
      const loserSide=winnerSide==="away"?"home":"away";
      if(wp.side!==winnerSide) warnings.push(`Game ${g.game}: winning pitcher team does not match game winner.`);
      if(lp.side!==loserSide) warnings.push(`Game ${g.game}: losing pitcher team does not match game loser.`);
    }
    if(g.save_pitcher){
      const sv=participantByName.get(norm(g.save_pitcher));
      const winnerSide=g.away_score>g.home_score?"away":"home";
      if(!sv) errors.push(`Game ${g.game}: save pitcher is not a participant.`);
      else if(sv.side!==winnerSide) warnings.push(`Game ${g.game}: save pitcher team does not match game winner.`);
      if(norm(g.save_pitcher)===norm(g.winning_pitcher)) warnings.push(`Game ${g.game}: winning pitcher is also save pitcher.`);
    }
  }

  for(const b of payload.batting||[]){
    if(!playerIds.get(norm(b.player))) errors.push(`Unknown batting player: ${b.player}`);
    if(!["away","home"].includes(b.side)) errors.push(`Invalid batting side: ${b.player}`);
    for(const k of ["games_played","PA","AB","R","H","1B","2B","3B","HR","RBI","BB","SO","HBP"]){
      if(!nonnegInt(b[k])) errors.push(`${b.player}: batting ${k} must be a non-negative integer.`);
    }
  }
  const awayBatR=sum((payload.batting||[]).filter(r=>r.side==="away"),"R");
  const homeBatR=sum((payload.batting||[]).filter(r=>r.side==="home"),"R");
  if(awayBatR!==awayRS) warnings.push(`Away batting R (${awayBatR}) != away scoreboard runs (${awayRS}).`);
  if(homeBatR!==homeRS) warnings.push(`Home batting R (${homeBatR}) != home scoreboard runs (${homeRS}).`);

  const starts={away:0,home:0};
  for(const p of payload.pitching||[]){
    if(!playerIds.get(norm(p.player))) errors.push(`Unknown pitching player: ${p.player}`);
    if(!["away","home"].includes(p.side)) errors.push(`Invalid pitching side: ${p.player}`);
    if(!Number.isInteger(p.appearances)||p.appearances<1||p.appearances>3) errors.push(`${p.player}: Apps must be 1-3.`);
    if(!Number.isInteger(p.starts)||p.starts<0||p.starts>3||p.starts>p.appearances) errors.push(`${p.player}: invalid Starts.`);
    starts[p.side]=(starts[p.side]||0)+Number(p.starts||0);
    for(const k of ["games_played","outs_recorded","BF","R","ER","K","H","BB","HR","HBP","WP"]){
      if(!nonnegInt(p[k])) errors.push(`${p.player}: pitching ${k} must be a non-negative integer.`);
    }
  }
  if(starts.away!==3) warnings.push(`Away team has ${starts.away} pitching starts, expected 3.`);
  if(starts.home!==3) warnings.push(`Home team has ${starts.home} pitching starts, expected 3.`);
  const awayPitR=sum((payload.pitching||[]).filter(r=>r.side==="away"),"R");
  const homePitR=sum((payload.pitching||[]).filter(r=>r.side==="home"),"R");
  if(awayPitR!==homeRS) warnings.push(`Away pitching R (${awayPitR}) != home scoreboard runs (${homeRS}).`);
  if(homePitR!==awayRS) warnings.push(`Home pitching R (${homePitR}) != away scoreboard runs (${awayRS}).`);

  for(const c of payload.manual_corrections||[]){
    if(!c.reason || !String(c.reason).trim()) errors.push(`${c.id||"Correction"}: correction reason is required.`);
    if(c.corrected_value===null || c.corrected_value===undefined || Number(c.corrected_value)<0) errors.push(`${c.id||"Correction"}: corrected value is invalid.`);
  }
  const clientWarnings=Number(payload.validation?.warning_count||0);
  const approvals=payload.validation?.warnings_approved||[];
  if(clientWarnings>0){
    if(!payload.validation?.all_warnings_approved) errors.push("Client validation still has unapproved warnings.");
    if(approvals.length<clientWarnings) errors.push("Not all client warnings include approval records.");
    if(approvals.some(a=>!String(a.reason||"").trim())) errors.push("Every approved warning requires an explanation.");
  }
  if(warnings.length>0 && !payload.validation?.all_warnings_approved){
    errors.push("Server revalidation found warnings that are not approved.");
  }
  return {errors,warnings};
}

export async function onRequestPost(context) {
  const DB=context.env.DB;
  if(!DB) return json({ok:false,error:"D1 binding DB is missing."},500);

  let payload;
  try { payload=await context.request.json(); }
  catch { return json({ok:false,error:"Request body must be valid JSON."},400); }

  const replace=new URL(context.request.url).searchParams.get("replace")==="1";
  const actor=context.data.actorEmail || "unknown-access-user";
  const reg=await registry(DB);
  const awayTeamId=reg.teamsByName.get(norm(payload.series?.away_team));
  const homeTeamId=reg.teamsByName.get(norm(payload.series?.home_team));
  const names=collectPlayerNames(payload);
  const unknown=names.filter(name=>!reg.playersByName.has(norm(name)));
  if(unknown.length){
    return json({ok:false,error:"Unknown players must be added to the player registry before publishing.",unknown_players:unknown.sort()},422);
  }
  const playerIds=new Map(names.map(name=>[norm(name),reg.playersByName.get(norm(name)).player_id]));
  const validation=serverValidate(payload,{away:awayTeamId,home:homeTeamId},playerIds);
  if(validation.errors.length){
    return json({ok:false,error:"Server validation failed.",errors:validation.errors,warnings:validation.warnings},422);
  }

  const existing=await DB.prepare("SELECT series_id,published_at,commissioner_email FROM series WHERE series_id=?").bind(payload.series_id).first();
  if(existing && !replace){
    return json({
      ok:false,
      code:"SERIES_EXISTS",
      error:"This series already exists.",
      existing,
      can_replace:true
    },409);
  }

  const pId=name=>playerIds.get(norm(name));
  const statements=[];
  if(existing){
    statements.push(DB.prepare("DELETE FROM series WHERE series_id=?").bind(payload.series_id));
  }
  statements.push(DB.prepare(`
    INSERT INTO series(
      series_id,season,series_date,away_team_id,home_team_id,schema_version,source,
      commissioner_email,commissioner_notes,warning_count,payload_json,published_at,updated_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
  `).bind(
    payload.series_id,payload.series.season,payload.series.date,awayTeamId,homeTeamId,
    payload.schema_version,payload.source||"ndwiffle_admin_v24",actor,payload.commissioner_notes||null,
    Number(payload.validation?.warning_count||0),JSON.stringify(payload)
  ));

  for(const g of payload.games||[]){
    statements.push(DB.prepare(`
      INSERT INTO games(series_id,game_number,away_score,home_score,winning_pitcher_id,losing_pitcher_id,save_pitcher_id)
      VALUES(?,?,?,?,?,?,?)
    `).bind(payload.series_id,g.game,g.away_score,g.home_score,pId(g.winning_pitcher),pId(g.losing_pitcher),g.save_pitcher?pId(g.save_pitcher):null));
  }
  for(const p of payload.participants||[]){
    statements.push(DB.prepare(`
      INSERT INTO series_participants(series_id,player_id,team_id,side,games_played) VALUES(?,?,?,?,?)
    `).bind(payload.series_id,pId(p.name),p.side==="away"?awayTeamId:homeTeamId,p.side,p.games_played));
  }
  for(const b of payload.batting||[]){
    statements.push(DB.prepare(`
      INSERT INTO batting_series_stats(
        series_id,player_id,team_id,side,games_played,pa,ab,runs,hits,singles,doubles,triples,hr,rbi,bb,so,hbp
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      payload.series_id,pId(b.player),b.side==="away"?awayTeamId:homeTeamId,b.side,b.games_played,
      b.PA,b.AB,b.R,b.H,b["1B"],b["2B"],b["3B"],b.HR,b.RBI,b.BB,b.SO,b.HBP
    ));
  }
  for(const p of payload.pitching||[]){
    statements.push(DB.prepare(`
      INSERT INTO pitching_series_stats(
        series_id,player_id,team_id,side,games_played,appearances,starts,outs_recorded,bf,runs,er,strikeouts,hits,bb,hr,hbp,wp
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      payload.series_id,pId(p.player),p.side==="away"?awayTeamId:homeTeamId,p.side,p.games_played,
      p.appearances,p.starts,p.outs_recorded,p.BF,p.R,p.ER,p.K,p.H,p.BB,p.HR,p.HBP,p.WP
    ));
  }
  for(const c of payload.manual_corrections||[]){
    statements.push(DB.prepare(`
      INSERT INTO manual_corrections(
        series_id,correction_id,scope,player_id,team_id,field,original_value,corrected_value,reason
      ) VALUES(?,?,?,?,?,?,?,?,?)
    `).bind(
      payload.series_id,c.id,c.scope||"pitching_player",c.player?pId(c.player):null,
      c.team?reg.teamsByName.get(norm(c.team)):null,c.field,c.original_value,c.corrected_value,c.reason
    ));
  }
  for(const w of payload.validation?.warnings_approved||[]){
    statements.push(DB.prepare(`
      INSERT INTO warning_approvals(series_id,warning_id,title,detail,reason) VALUES(?,?,?,?,?)
    `).bind(payload.series_id,w.id,w.title,w.detail||null,w.reason));
  }
  statements.push(DB.prepare(`
    INSERT INTO import_history(series_id,action,actor_email,payload_json) VALUES(?,?,?,?)
  `).bind(payload.series_id,existing?"replace":"publish",actor,JSON.stringify(payload)));

  try{
    await DB.batch(statements);
    return json({
      ok:true,
      action:existing?"replaced":"published",
      series_id:payload.series_id,
      actor_email:actor,
      server_warnings:validation.warnings,
      rows:{
        games:(payload.games||[]).length,
        participants:(payload.participants||[]).length,
        batting:(payload.batting||[]).length,
        pitching:(payload.pitching||[]).length,
        corrections:(payload.manual_corrections||[]).length
      }
    });
  }catch(err){
    return json({ok:false,error:"Database publish failed.",detail:String(err?.message||err)},500);
  }
}
