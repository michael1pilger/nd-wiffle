/* ND Wiffle - franchise H2H matrix, series history, and 2026 player-vs-opponent participation. */
(()=>{
'use strict';
const mount=document.getElementById('historicalH2HRoot');
if(!mount)return;
const host=document.getElementById('historicalH2HHost');
const fixedTeam=host?.dataset.h2hContext !== 'all' ? host?.dataset.h2hContext : '';
const TEAMS={
 'ball-busters':{name:'Ball Busters',logo:'/assets/logos/ball-busters.png?v=81'},
 'dirty-dawgs':{name:'Dirty Dawgs',logo:'/assets/logos/dirty-dawgs.png?v=81'},
 'goofy-goobers':{name:'Goofy Goobers',logo:'/assets/logos/goofy-goobers.png?v=81'},
 midnight:{name:'Midnight',logo:'/assets/logos/midnight.png?v=81'},
 silverbacks:{name:'Silverbacks',logo:'/assets/logos/silverbacks.png?v=81'},
 'stiff-wifflers':{name:'Stiff Wifflers',logo:'/assets/logos/stiff-wifflers.png?v=81'},
 storm:{name:'Storm',logo:'/assets/logos/storm.png?v=81'},
 'twin-titans':{name:'Twin Titans',logo:'/assets/logos/twin-titans.png?v=81'},
 underdawgs:{name:'Underdawgs',logo:'/assets/logos/underdawgs.png?v=81'},
 zyns:{name:'Zyns',logo:'/assets/logos/zyns.png?v=81'}
};
const ids=Object.keys(TEAMS).sort((a,b)=>TEAMS[a].name.localeCompare(TEAMS[b].name));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=id=>TEAMS[id]?.name||id;
const logo=id=>TEAMS[id]?.logo||'';
const n=x=>Number(x)||0;
const pct=(w,l)=>w+l?`${(100*w/(w+l)).toFixed(1)}%`:'—';
const tally=()=>({sw:0,sl:0,gw:0,gl:0,total:0});
const state={year:'all',competition:'all',record:'series',team:fixedTeam||'all',opp:'all',expanded:false,playerTeam:fixedTeam||'all',playerOpp:'all'};
let ALL_ROWS=[],PLAYER_ROWS=[],WARNINGS=[],UNRESOLVED=0;

const style=document.createElement('style');
style.textContent=`
.h2h-dashboard{--h2h-gold:#dbb25a;background:#0c1728;border:1px solid #28394f;border-radius:15px;padding:18px;color:#f1f5fa}
.h2h-dashboard *{box-sizing:border-box}.h2h-dashboard .h2h-subtle{color:#acbbd0;font-size:12px;line-height:1.5}.h2h-dashboard h3{font-size:16px;line-height:1.5;color:#e9edf6;margin:22px 0 8px;font-weight:850}
.h2h-top{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}.h2h-metric{padding:14px 12px;border:1px solid #26364a;background:#101e30;border-radius:11px}.h2h-metric small{color:#a8b7ca;display:block;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.08em}.h2h-metric strong{display:block;font-size:22px;line-height:1.4;letter-spacing:-.03em}
.h2h-controlbar{display:flex;gap:13px;align-items:end;flex-wrap:wrap;margin:0 0 14px}.h2h-control{display:flex;flex-direction:column;gap:5px}.h2h-control>span,.h2h-selectors label{color:#adbbcc;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.06em}.h2h-selectors{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:12px 0 18px}.h2h-selectors label{display:flex;flex-direction:column;gap:5px}.h2h-selectors select,.h2h-control select{background:#111f31;color:#f6f6f6;border:1px solid #38506a;border-radius:8px;padding:9px 10px;font:inherit;font-size:12px;min-width:125px}
.h2h-seg{display:flex;border:1px solid #38506a;border-radius:9px;padding:3px;background:#0b1726;gap:3px}.h2h-seg button{border:0;background:transparent;color:#aebfd2;border-radius:6px;padding:7px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.h2h-seg button.active{background:#d9b45e;color:#111722}.h2h-seg button:hover:not(.active){background:#172a40;color:#fff}
.h2h-matrix-wrap{overflow:auto;width:100%;border:1px solid #2b4059;border-radius:12px;background:#0a1422}.h2h-matrix{border-collapse:separate;border-spacing:0;min-width:760px;width:100%;table-layout:fixed}.h2h-matrix th,.h2h-matrix td{border-right:1px solid #23364e;border-bottom:1px solid #23364e;text-align:center}.h2h-matrix tr:last-child th,.h2h-matrix tr:last-child td{border-bottom:0}.h2h-matrix th:last-child,.h2h-matrix td:last-child{border-right:0}.h2h-matrix .corner{width:70px;min-width:70px;background:#14243a;color:#9cafc5;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.h2h-matrix .colhead,.h2h-matrix .rowhead{background:#14243a;padding:8px}.h2h-matrix .colhead{height:74px}.h2h-matrix .rowhead{width:70px}.h2h-matrix .team-logo{width:36px;height:36px;object-fit:contain;display:block;margin:auto;filter:drop-shadow(0 2px 5px rgba(0,0,0,.35))}.h2h-matrix .rowhead .team-logo{width:40px;height:40px}.h2h-matrix td{height:62px;padding:0;background:#0f1d2f}.h2h-cell{width:100%;height:100%;border:0;background:transparent;color:#eef4fb;cursor:default;font:inherit;padding:5px}.h2h-cell.clickable{cursor:pointer}.h2h-cell.clickable:hover{outline:2px solid #d9b45e;outline-offset:-2px;background:#1b2d43}.h2h-cell strong{display:block;font-size:14px}.h2h-cell small{display:block;color:#9fb0c4;font-size:9px;margin-top:2px}.h2h-cell.win{background:rgba(54,158,112,.14)}.h2h-cell.loss{background:rgba(190,75,87,.13)}.h2h-cell.even{background:rgba(219,178,90,.08)}.h2h-cell.empty{color:#61748d}.h2h-diag{background:#0a1422;color:#52657d;font-size:14px}.h2h-focus-head{box-shadow:inset 0 0 0 2px rgba(219,178,90,.75)}
.h2h-table-scroll{overflow-x:auto;width:100%;border:1px solid #2b4059;border-radius:10px}.h2h-table{border-collapse:collapse;font-size:12px;width:100%;min-width:550px}.h2h-table th{text-align:left;background:#16273e;color:#bed0e3;font-size:10px;letter-spacing:.035em;padding:10px 12px;white-space:nowrap}.h2h-table td{padding:10px 12px;border-top:1px solid #26364a;color:#eff3f7;white-space:nowrap}.h2h-table tr:hover td{background:#16253a}.h2h-table tr[data-unverified='yes'] td{background:#322a20}.h2h-table .h2h-right{text-align:right}.h2h-table .h2h-win{color:#74d5a9}.h2h-table .h2h-loss{color:#faad9f}
.h2h-pill{font-size:10px;display:inline-block;padding:3px 7px;border-radius:6px;background:#22334b;color:#bacbdd;margin-left:4px}.h2h-pill.warn{color:#ffcf84;background:#493721}.h2h-dashboard a{color:#edc778}.h2h-button{background:#172c45;border:1px solid #52677c;border-radius:8px;padding:9px 12px;color:white;cursor:pointer;font:inherit;font-size:12px;font-weight:750;margin:11px 0}.h2h-button:hover{background:#234060}.h2h-empty{padding:18px;color:#b8c8d8;border:1px dashed #39506b;border-radius:9px}.h2h-warnings{margin:15px 0 0;border-top:1px solid #26364a;padding-top:12px}
.h2h-player-panel{border:1px solid #2b4059;background:#0b1726;border-radius:12px;padding:14px}.h2h-player-note{border-left:3px solid #d9b45e;padding:8px 10px;background:#151f2d;color:#b9c8da;font-size:11px;line-height:1.5;margin-bottom:12px}.h2h-player-controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.h2h-player-controls label{display:flex;flex-direction:column;gap:5px;color:#adbbcc;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.06em}.h2h-player-controls select{background:#111f31;color:#fff;border:1px solid #38506a;border-radius:8px;padding:8px 10px;min-width:155px}.h2h-player-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}.h2h-player-card{border:1px solid #26364a;background:#101e30;border-radius:9px;padding:10px}.h2h-player-card strong{display:block;font-size:12px}.h2h-player-card span{display:block;color:#aab9ca;font-size:10px;margin-top:3px}.h2h-player-card b{color:#edc778;font-weight:850}
@media(max-width:760px){.h2h-dashboard{padding:12px}.h2h-top{grid-template-columns:repeat(2,minmax(0,1fr))}.h2h-metric strong{font-size:19px}.h2h-controlbar{gap:9px}.h2h-seg button{padding:7px 8px}.h2h-matrix{min-width:680px}.h2h-matrix .team-logo{width:31px;height:31px}.h2h-matrix .rowhead .team-logo{width:34px;height:34px}}
`;
document.head.appendChild(style);
mount.innerHTML='<div class="h2h-dashboard"><p class="h2h-subtle">Loading historical and current season results…</p></div>';

function phaseRows(rows){
 return rows.filter(r=>(state.year==='all'||String(r.season)===state.year)&&(state.competition==='all'||r.phase===state.competition));
}
function selectedRows(rows){
 return phaseRows(rows).filter(r=>{
  if(state.team!=='all' && r.team_a_id!==state.team && r.team_b_id!==state.team)return false;
  if(state.opp!=='all' && r.team_a_id!==state.opp && r.team_b_id!==state.opp)return false;
  return true;
 });
}
function summarize(rows){
 const out=new Map();
 for(const r of rows){
  const a=r.team_a_id,b=r.team_b_id;
  if(!out.has(a))out.set(a,tally());if(!out.has(b))out.set(b,tally());
  const A=out.get(a),B=out.get(b),aw=n(r.team_a_game_wins),bw=n(r.team_b_game_wins);
  A.gw+=aw;A.gl+=bw;B.gw+=bw;B.gl+=aw;A.total++;B.total++;
  if(aw>bw){A.sw++;B.sl++;}else{B.sw++;A.sl++;}
 }
 return out;
}
function pairTotals(rows){
 const pairs=new Map();
 for(const r of rows){
  const [a,b]=[r.team_a_id,r.team_b_id].sort(),key=a+'::'+b;
  if(!pairs.has(key))pairs.set(key,{a,b,...tally()});
  const v=pairs.get(key),wA=r.team_a_id===a?n(r.team_a_game_wins):n(r.team_b_game_wins),wB=r.team_a_id===a?n(r.team_b_game_wins):n(r.team_a_game_wins);
  v.gw+=wA;v.gl+=wB;v.total++;
  if(wA>wB)v.sw++;else v.sl++;
 }
 return [...pairs.values()];
}
function recordBetween(rows,team,opp){
 let w=0,l=0;
 for(const r of rows){
  if(!((r.team_a_id===team&&r.team_b_id===opp)||(r.team_a_id===opp&&r.team_b_id===team)))continue;
  const mine=r.team_a_id===team?n(r.team_a_game_wins):n(r.team_b_game_wins),theirs=r.team_a_id===team?n(r.team_b_game_wins):n(r.team_a_game_wins);
  if(state.record==='games'){w+=mine;l+=theirs;}else if(mine>theirs)w++;else l++;
 }
 return {w,l};
}
function teamImg(id,cls='team-logo'){return `<img class="${cls}" src="${esc(logo(id))}" alt="${esc(label(id))}" title="${esc(label(id))}">`;}
function renderMatrix(rows){
 const matrixRows=phaseRows(rows);
 const recordLabel=state.record==='series'?'series':'games';
 const heads=ids.map(id=>`<th class="colhead ${id===fixedTeam?'h2h-focus-head':''}">${teamImg(id)}</th>`).join('');
 const body=ids.map(row=>`<tr><th class="rowhead ${row===fixedTeam?'h2h-focus-head':''}">${teamImg(row)}</th>${ids.map(col=>{
   if(row===col)return '<td class="h2h-diag">—</td>';
   const x=recordBetween(matrixRows,row,col),total=x.w+x.l;
   const cls=!total?'empty':x.w>x.l?'win':x.w<x.l?'loss':'even';
   const canClick=!fixedTeam||row===fixedTeam||col===fixedTeam;
   const title=`${label(row)} vs ${label(col)}: ${total?`${x.w}-${x.l} ${recordLabel}`:`No ${recordLabel} in selection`}`;
   return `<td><button type="button" class="h2h-cell ${cls} ${canClick?'clickable':''}" data-matrix-row="${esc(row)}" data-matrix-col="${esc(col)}" title="${esc(title)}" aria-disabled="${canClick?'false':'true'}"><strong>${total?`${x.w}–${x.l}`:'—'}</strong><small>${total?pct(x.w,x.l):''}</small></button></td>`;
 }).join('')}</tr>`).join('');
 return `<div class="h2h-matrix-wrap"><table class="h2h-matrix"><thead><tr><th class="corner">Team ↓<br>Opponent →</th>${heads}</tr></thead><tbody>${body}</tbody></table></div><p class="h2h-subtle" style="margin:8px 0 0">Each cell is shown from the row team's perspective. Click a matchup to inspect it below.</p>`;
}
function renderTable(rows){
 const totals=pairTotals(rows).filter(r=>state.team==='all'||r.a===state.team||r.b===state.team)
  .sort((a,b)=>b.total-a.total || Math.abs(b.sw-b.sl)-Math.abs(a.sw-a.sl) || a.a.localeCompare(b.a));
 if(!totals.length)return '<div class="h2h-empty">No head-to-head matchups in the selected filters.</div>';
 const single=state.team!=='all';
 return `<div class="h2h-table-scroll"><table class="h2h-table"><thead><tr><th>${single?'Opponent':'Matchup'}</th><th class="h2h-right">Series W–L</th><th class="h2h-right">Games W–L</th><th class="h2h-right">Games won %</th><th class="h2h-right">Times met</th></tr></thead><tbody>${totals.map(r=>{
  const reverse=single&&r.b===state.team,x=reverse?r.b:r.a,y=reverse?r.a:r.b;
  const sw=reverse?r.sl:r.sw,sl=reverse?r.sw:r.sl,gw=reverse?r.gl:r.gw,gl=reverse?r.gw:r.gl;
  const term=single?`<a href="/teams/${esc(y)}/">${esc(label(y))}</a>`:`<a href="/teams/${esc(x)}/">${esc(label(x))}</a> vs <a href="/teams/${esc(y)}/">${esc(label(y))}</a>`;
  return `<tr><td>${term}</td><td class="h2h-right">${sw}–${sl}</td><td class="h2h-right">${gw}–${gl}</td><td class="h2h-right">${pct(gw,gl)}</td><td class="h2h-right">${r.total}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
function seriesLog(rows){
 const sorted=[...rows].sort((a,b)=>n(b.season)-n(a.season)||String(a.phase).localeCompare(String(b.phase))||String(a.series_id).localeCompare(String(b.series_id)));
 const visible=state.expanded?sorted:sorted.slice(0,15);
 if(!visible.length)return '<div class="h2h-empty">No series recorded for these filters.</div>';
 const records=visible.map(r=>{
  const selected=state.team!=='all'?state.team:r.team_a_id,other=selected===r.team_a_id?r.team_b_id:r.team_a_id;
  const w=selected===r.team_a_id?n(r.team_a_game_wins):n(r.team_b_game_wins),l=selected===r.team_a_id?n(r.team_b_game_wins):n(r.team_a_game_wins),outcome=state.team==='all'?'':(w>l?'W':'L');
  const methods={'conditional_forfeit':'Forfeit','forfeit':'Forfeit','mutual_agreement':'Agreement','agreement':'Agreement','played':'Played'},method=methods[r.result_type]||r.result_type,flag=r.quality_flags||'';
  return `<tr data-unverified="${flag?'yes':'no'}"><td>${esc(r.season)}</td><td>${r.phase==='playoff'?'Playoffs'+(r.round_name?' · '+esc(r.round_name):''):'Regular'}</td><td><a href="/teams/${esc(selected)}/">${esc(label(selected))}</a> vs <a href="/teams/${esc(other)}/">${esc(label(other))}</a></td><td class="${outcome==='W'?'h2h-win':'h2h-loss'}">${outcome?outcome+' ':''}${w}–${l}</td><td>${esc(method)}${flag?'<span class="h2h-pill warn" title="Historical score conflict; series record preserved">Review</span>':''}</td></tr>`;
 });
 return `<div class="h2h-table-scroll"><table class="h2h-table"><thead><tr><th>Year</th><th>Competition</th><th>Matchup</th><th>Result*</th><th>Method</th></tr></thead><tbody>${records.join('')}</tbody></table></div>`+(sorted.length>15?`<button class="h2h-button" id="h2hToggle" type="button">${state.expanded?'Show fewer':'Show all '+sorted.length+' series'}</button>`:'');
}
function combo(labelText,key,value,entries){return `<label>${esc(labelText)}<select data-h2h-select="${esc(key)}">${entries.map(([v,t])=>`<option value="${esc(v)}"${v===value?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function seg(key,value,entries){return `<div class="h2h-seg">${entries.map(([v,t])=>`<button type="button" data-h2h-seg="${esc(key)}" data-value="${esc(v)}" class="${v===value?'active':''}">${esc(t)}</button>`).join('')}</div>`;}
function playerSection(){
 const rows=PLAYER_ROWS.filter(r=>(state.competition==='all'||r.phase===state.competition)&&(state.playerTeam==='all'||r.team_id===state.playerTeam)&&(state.playerOpp==='all'||r.opponent_team_id===state.playerOpp));
 const byPlayer=new Map();
 for(const r of rows){
  if(!byPlayer.has(r.player_id))byPlayer.set(r.player_id,{id:r.player_id,name:r.player_name,classYear:r.class_year,series:new Set(),opps:new Set(),regular:0,playoff:0});
  const x=byPlayer.get(r.player_id);if(!x.series.has(r.series_id)){x.series.add(r.series_id);x[r.phase]++;}x.opps.add(r.opponent_team_id);
 }
 const list=[...byPlayer.values()].sort((a,b)=>b.series.size-a.series.size||a.name.localeCompare(b.name));
 let controls='';
 if(!fixedTeam)controls+=combo('Team','playerTeam',state.playerTeam,[['all','All teams'],...ids.map(id=>[id,label(id)])]);
 controls+=combo('Opponent','playerOpp',state.playerOpp,[['all','Every opponent'],...ids.filter(id=>id!==state.playerTeam).map(id=>[id,label(id)])]);
 const cards=list.length?`<div class="h2h-player-grid">${list.map(x=>`<div class="h2h-player-card"><strong>${esc(x.name)}</strong><span>${x.classYear?`Class '${String(x.classYear).slice(-2)} · `:''}<b>${x.series.size}</b> recorded series</span><span>${x.opps.size} opponent${x.opps.size===1?'':'s'} · ${x.regular} regular · ${x.playoff} playoff</span></div>`).join('')}</div>`:'<div class="h2h-empty">No recorded 2026 participant rows for this selection.</div>';
 return `<div class="h2h-player-panel"><div class="h2h-player-note"><strong>Coverage note:</strong> Player-vs-opponent data currently uses recorded <strong>2026 series participation only</strong>. The 2021–2025 team results are included in the matrix above, but those seasons do not have equivalent participant-level matchup logs, so this is not a complete career opponent history.</div><div class="h2h-player-controls">${controls}</div>${cards}</div>`;
}
function refresh(){
 const match=selectedRows(ALL_ROWS),teams=summarize(match),pair=pairTotals(match);
 let games=0,series=match.length,flagged=0,post=0;for(const r of match){games+=n(r.team_a_game_wins)+n(r.team_b_game_wins);if(r.phase==='playoff')post++;if(r.quality_flags)flagged++;}
 const team=state.team==='all'?null:teams.get(state.team)||tally();
 const statCards=team?[[state.competition==='playoff'?'Playoff games':'Games',`${team.gw}–${team.gl}`],['Series',`${team.sw}–${team.sl}`],['Win %',pct(team.gw,team.gl)],['Series played',team.total]]:[['Completed series',series],['Counted games',games],['Playoff series',post],['Flagged source conflicts',flagged]];
 const years=[['all','All seasons'],...[2021,2022,2023,2024,2025,2026].map(y=>[String(y),String(y)])];
 const selectors=combo('Season','year',state.year,years)+(!fixedTeam?combo('Team','team',state.team,[['all','All franchises'],...ids.map(id=>[id,label(id)])]):'')+(state.team!=='all'?combo('Opponent','opp',state.opp,[['all','Every opponent'],...ids.filter(id=>id!==state.team).map(id=>[id,label(id)])]):'');
 const notes=WARNINGS.map(x=>'<div>'+esc(x)+'</div>').join('');
 mount.innerHTML=`<div class="h2h-dashboard"><div class="h2h-top">${statCards.map(([k,v])=>`<div class="h2h-metric"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}</div>
 <div class="h2h-controlbar"><div class="h2h-control"><span>Competition</span>${seg('competition',state.competition,[['all','All Time'],['regular','Regular Season'],['playoff','Playoffs']])}</div><div class="h2h-control"><span>Matrix record</span>${seg('record',state.record,[['series','Series'],['games','Games']])}</div><div class="h2h-control"><span>Season</span><select data-h2h-select="year">${years.map(([v,t])=>`<option value="${v}"${v===state.year?' selected':''}>${t}</option>`).join('')}</select></div></div>
 <h3>All-franchise matrix</h3>${renderMatrix(ALL_ROWS)}
 <div class="h2h-selectors">${selectors.replace(/<label>Season[\s\S]*?<\/label>/,'')}</div>
 <h3>Head-to-head detail</h3>${renderTable(match)}
 <h3>Series history</h3>${seriesLog(match)}
 <h3>Players vs. opponents</h3>${playerSection()}
 <div class="h2h-warnings h2h-subtle"><strong>Data notes:</strong> Historical 2021 source conflicts are flagged “Review.” Forfeits and agreements count in game and series records, not in run differential or pitcher decisions. 2026 comes from published D1 results; unclassified or unplayed series are excluded. ${UNRESOLVED?`${UNRESOLVED} unfinished/unclassified 2026 entr${UNRESOLVED===1?'y':'ies'} excluded. `:''}${notes}</div></div>`;
 wire();
}
function wire(){
 mount.querySelectorAll('[data-h2h-seg]').forEach(b=>b.addEventListener('click',()=>{state[b.dataset.h2hSeg]=b.dataset.value;state.expanded=false;refresh()}));
 mount.querySelectorAll('[data-h2h-select]').forEach(s=>s.addEventListener('change',()=>{const key=s.dataset.h2hSelect;state[key]=s.value;if(key==='team'){state.opp='all';state.playerTeam=s.value;state.playerOpp='all';}if(key==='playerTeam')state.playerOpp='all';state.expanded=false;refresh()}));
 mount.querySelectorAll('[data-matrix-row]').forEach(b=>b.addEventListener('click',()=>{
   const row=b.dataset.matrixRow,col=b.dataset.matrixCol;
   if(fixedTeam && row!==fixedTeam && col!==fixedTeam)return;
   if(fixedTeam){state.team=fixedTeam;state.opp=row===fixedTeam?col:row;state.playerTeam=fixedTeam;state.playerOpp=state.opp;}
   else{state.team=row;state.opp=col;state.playerTeam=row;state.playerOpp=col;}
   state.expanded=false;refresh();
   mount.querySelector('.h2h-selectors')?.scrollIntoView({behavior:'smooth',block:'center'});
 }));
 mount.querySelector('#h2hToggle')?.addEventListener('click',()=>{state.expanded=!state.expanded;refresh()});
}
function updateTeamDetail(rows) {
 if(!fixedTeam)return;
 const involved=rows.filter(r=>r.team_a_id===fixedTeam||r.team_b_id===fixedTeam),rs=summarize(involved.filter(r=>r.phase==='regular')).get(fixedTeam)||tally(),po=summarize(involved.filter(r=>r.phase==='playoff')).get(fixedTeam)||tally();
 const cards=document.querySelectorAll('.team-summary-grid .team-summary-card'),sets=[[`${rs.gw+po.gw}–${rs.gl+po.gl}`,`RS + playoffs · ${pct(rs.gw+po.gw,rs.gl+po.gl)} win pct`],[`${rs.gw}–${rs.gl}`,`2021–2026 · ${rs.sw}–${rs.sl} series`],[`${po.gw}–${po.gl}`,`${po.sw}–${po.sl} playoff series`]];
 sets.forEach(([score,caption],i)=>{if(!cards[i])return;const strong=cards[i].querySelector('strong'),small=cards[i].querySelector('small');if(strong)strong.textContent=score;if(small)small.textContent=caption;});
 const worldSeries=involved.filter(r=>r.phase==='playoff'&&String(r.round_name).toLowerCase()==='world series'),rings=worldSeries.filter(r=>(r.team_a_game_wins>r.team_b_game_wins?r.team_a_id:r.team_b_id)===fixedTeam).length,runnerUps=worldSeries.length-rings;
 if(cards[3]){const strong=cards[3].querySelector('strong'),small=cards[3].querySelector('small');if(strong)strong.textContent=String(rings);if(small)small.textContent=`${runnerUps} runner-up${runnerUps===1?'':'s'} · ${worldSeries.length} appearances`;}
 const section=[...document.querySelectorAll('.team-detail-section')].find(el=>el.querySelector('h2')?.textContent.trim()==='Playoff Series History'),tbody=section?.querySelector('tbody');
 if(tbody){const playoffs=involved.filter(r=>r.phase==='playoff').sort((a,b)=>n(b.season)-n(a.season)||a.series_id.localeCompare(b.series_id));tbody.innerHTML=playoffs.map(r=>{const opponent=r.team_a_id===fixedTeam?r.team_b_id:r.team_a_id,w=r.team_a_id===fixedTeam?n(r.team_a_game_wins):n(r.team_b_game_wins),l=r.team_a_id===fixedTeam?n(r.team_b_game_wins):n(r.team_a_game_wins);return `<tr class="${w>l?'team-playoff-win':''}"><td>${esc(r.season)}</td><td>${esc(r.round_name)}</td><td><a href="/teams/${esc(opponent)}/">${esc(label(opponent))}</a></td><td>${w>l?'W':'L'} ${w}–${l}</td></tr>`;}).join('')||'<tr><td colspan="4">No recorded playoff series</td></tr>';}
}
fetch('/api/public/history',{cache:'no-store'}).then(r=>r.json()).then(data=>{
 if(!data.ok||!Array.isArray(data.rows))throw new Error(data.error||'History API unavailable');
 ALL_ROWS=data.rows;PLAYER_ROWS=data.player_coverage?.rows||[];WARNINGS=data.warnings||[];UNRESOLVED=n(data.unresolved_2026_count);
 updateTeamDetail(ALL_ROWS);refresh();
}).catch(err=>{mount.innerHTML=`<div class="h2h-dashboard h2h-empty"><strong>Historical comparison not initialized.</strong><p class="h2h-subtle">${esc(err?.message||'Please retry.')} This feature requires migrations 0036 and 0037 in the production D1 database.</p></div>`;});
})();
