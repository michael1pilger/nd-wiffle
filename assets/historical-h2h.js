/* ND Wiffle - franchise head-to-head dashboard. Historical series come from D1, 2026 is live. */
(()=>{
'use strict';
const mount=document.getElementById('historicalH2HRoot');
if(!mount)return;
const host=document.getElementById('historicalH2HHost');
const fixedTeam=host?.dataset.h2hContext !== 'all' ? host.dataset.h2hContext : '';
const TEAMS={
 'ball-busters':'Ball Busters','dirty-dawgs':'Dirty Dawgs','goofy-goobers':'Goofy Goobers',
 midnight:'Midnight',silverbacks:'Silverbacks','stiff-wifflers':'Stiff Wifflers',
 storm:'Storm','twin-titans':'Twin Titans',underdawgs:'Underdawgs',zyns:'Zyns'
};
const ids=Object.keys(TEAMS).sort((a,b)=>TEAMS[a].localeCompare(TEAMS[b]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>TEAMS[s]||s;
const n=x=>Number(x)||0;
const pct=(w,l)=>w+l?`${(100*w/(w+l)).toFixed(1)}%`:'—';
const tally=()=>({sw:0,sl:0,gw:0,gl:0,total:0});
const state={year:'all',phase:'all',team:fixedTeam||'all',opp:'all',expanded:false};
const style=document.createElement('style');
style.textContent=`
.h2h-dashboard{--h2h-gold:#dbb25a;background:#0c1728;border:1px solid #28394f;border-radius:15px;padding:18px;color:#f1f5fa}
.h2h-dashboard *{box-sizing:border-box}.h2h-dashboard .h2h-subtle{color:#acbbd0;font-size:12px;line-height:1.5}
.h2h-top{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.h2h-metric{padding:14px 12px;border:1px solid #26364a;background:#101e30;border-radius:11px}
.h2h-metric small{color:#a8b7ca;display:block;font-size:10px;font-weight:750;text-transform:uppercase;letter-spacing:.08em}
.h2h-metric strong{display:block;font-size:22px;line-height:1.4;letter-spacing:-.03em}
.h2h-selectors{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-bottom:18px}
.h2h-selectors label{display:flex;flex-direction:column;gap:5px;color:#adbbcc;font-size:11px;font-weight:800}
.h2h-selectors select{background:#111f31;color:#f6f6f6;border:1px solid #38506a;border-radius:8px;padding:9px 10px;font:inherit;font-size:12px;min-width:115px}
.h2h-dashboard h3{font-size:16px;line-height:1.5;color:#e9edf6;margin:20px 0 8px;font-weight:850}
.h2h-table-scroll{overflow-x:auto;width:100%;border:1px solid #2b4059;border-radius:10px}
.h2h-table{border-collapse:collapse;font-size:12px;width:100%;min-width:550px}
.h2h-table th{text-align:left;background:#16273e;color:#bed0e3;font-size:10px;letter-spacing:.035em;padding:10px 12px;white-space:nowrap}
.h2h-table td{padding:10px 12px;border-top:1px solid #26364a;color:#eff3f7;white-space:nowrap}
.h2h-table tr:hover td{background:#16253a}.h2h-table tr[data-unverified='yes'] td{background:#322a20}
.h2h-table .h2h-right{text-align:right}.h2h-table .h2h-win{color:#74d5a9}.h2h-table .h2h-loss{color:#faad9f}
.h2h-pill{font-size:10px;display:inline-block;padding:3px 7px;border-radius:6px;background:#22334b;color:#bacbdd;margin-left:4px}
.h2h-pill.warn{color:#ffcf84;background:#493721}
.h2h-dashboard a{color:#edc778}.h2h-button{background:#172c45;border:1px solid #52677c;border-radius:8px;padding:9px 12px;color:white;cursor:pointer;font:inherit;font-size:12px;font-weight:750;margin:11px 0}
.h2h-button:hover{background:#234060}.h2h-empty{padding:18px;color:#b8c8d8;border:1px dashed #39506b;border-radius:9px}
.h2h-warnings{margin:15px 0 0;border-top:1px solid #26364a;padding-top:12px}
@media(max-width:760px){.h2h-dashboard{padding:12px}.h2h-top{grid-template-columns:repeat(2,minmax(0,1fr))}.h2h-metric strong{font-size:19px}.h2h-selectors select{min-width:104px}}
`;
document.head.appendChild(style);
mount.innerHTML='<div class="h2h-dashboard"><p class="h2h-subtle">Loading historical and current season results…</p></div>';
function selectedRows(rows){
 return rows.filter(r=>(state.year==='all'||String(r.season)===state.year)&&
  (state.phase==='all'||r.phase===state.phase)&&
  (state.team==='all'||r.team_a_id===state.team||r.team_b_id===state.team)&&
  (state.opp==='all'||r.team_a_id===state.opp||r.team_b_id===state.opp));
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
  const a=[r.team_a_id,r.team_b_id].sort()[0],b=[r.team_a_id,r.team_b_id].sort()[1], key=a+'::'+b;
  if(!pairs.has(key))pairs.set(key,{a,b,...tally()});
  const v=pairs.get(key);const wA=r.team_a_id===a?n(r.team_a_game_wins):n(r.team_b_game_wins),wB=r.team_a_id===a?n(r.team_b_game_wins):n(r.team_a_game_wins);
  v.gw+=wA;v.gl+=wB;v.total++;
  if(wA>wB)v.sw++; else v.sl++;
 }
 return [...pairs.values()];
}
function renderTable(rows){
 const totals=pairTotals(rows).filter(r=>state.team==='all'||r.a===state.team||r.b===state.team)
  .sort((a,b)=>b.total-a.total || Math.abs(b.sw-b.sl)-Math.abs(a.sw-a.sl) || a.a.localeCompare(b.a));
 if(!totals.length)return '<div class="h2h-empty">No head-to-head matchups in the selected filters.</div>';
 const single=state.team!=='all';
 return `<div class="h2h-table-scroll"><table class="h2h-table"><thead><tr>
 <th>${single?'Opponent':'Matchup'}</th><th class="h2h-right">Series W–L</th><th class="h2h-right">Games W–L</th><th class="h2h-right">Games won %</th><th class="h2h-right">Times met</th></tr></thead><tbody>${totals.map(r=>{
  const reverse=single&&r.b===state.team, x=reverse?r.b:r.a,y=reverse?r.a:r.b;
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
  const selected=state.team!=='all'?state.team:r.team_a_id;
  const other=selected===r.team_a_id?r.team_b_id:r.team_a_id;
  const w=selected===r.team_a_id?n(r.team_a_game_wins):n(r.team_b_game_wins),l=selected===r.team_a_id?n(r.team_b_game_wins):n(r.team_a_game_wins);
  const outcome=state.team==='all'?'':(w>l?'W':'L');
  const methods={'conditional_forfeit':'Forfeit','forfeit':'Forfeit','mutual_agreement':'Agreement','agreement':'Agreement','played':'Played'};
  const method=methods[r.result_type]||r.result_type;
  const flag=r.quality_flags||'';
  return `<tr data-unverified="${flag?'yes':'no'}"><td>${esc(r.season)}</td><td>${r.phase==='playoff'?'Playoffs'+(r.round_name?' · '+esc(r.round_name):''):'Regular'}</td>
  <td><a href="/teams/${esc(selected)}/">${esc(label(selected))}</a> vs <a href="/teams/${esc(other)}/">${esc(label(other))}</a></td>
  <td class="${outcome==='W'?'h2h-win':'h2h-loss'}">${outcome?outcome+' ':''}${w}–${l}</td><td>${esc(method)}${flag?'<span class="h2h-pill warn" title="Historical score conflict; series record preserved">Review</span>':''}</td></tr>`;
 });
 return `<div class="h2h-table-scroll"><table class="h2h-table"><thead><tr><th>Year</th><th>Competition</th><th>Matchup</th><th>Result*</th><th>Method</th></tr></thead><tbody>${records.join('')}</tbody></table></div>`+
 (sorted.length>15?`<button class="h2h-button" id="h2hToggle" type="button">${state.expanded?'Show fewer':'Show all '+sorted.length+' series'}</button>`:'');
}
function combo(id,value,entries){return `<label>${id}<select data-h2h-select="${id.toLowerCase()}">${entries.map(([v,t])=>`<option value="${esc(v)}"${v===value?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function refresh(rows,unresolved,warnings){
 const match=selectedRows(rows), teams=summarize(match),pair=pairTotals(match);
 let games=0, series=match.length, flagged=0,post=0;
 for(const r of match){games+=n(r.team_a_game_wins)+n(r.team_b_game_wins);if(r.phase==='playoff')post++;if(r.quality_flags)flagged++;}
 const leaders=pair.filter(p=>p.total>=2 && p.sw!==p.sl).sort((a,b)=>Math.abs(b.sw-b.sl)-Math.abs(a.sw-a.sl)||b.total-a.total).slice(0,3);
 const team=state.team==='all'?null:teams.get(state.team)||tally();
 const statCards=team?[
 ['Games',`${team.gw}–${team.gl}`],['Series',`${team.sw}–${team.sl}`],['Win %',pct(team.gw,team.gl)],['Series played',team.total]
 ]:[['Completed series',series],['Counted games',games],['Playoff series',post],['Flagged source conflicts',flagged]];
 const years=[['all','All seasons'],...[2021,2022,2023,2024,2025,2026].map(y=>[String(y),String(y)])];
 let controls=combo('Season',state.year,years)+combo('Phase',state.phase,[['all','All'],['regular','Regular season'],['playoff','Playoffs']]);
 if(!fixedTeam)controls+=combo('Team',state.team,[['all','All franchises'],...ids.map(id=>[id,label(id)])]);
 if(state.team!=='all')controls+=combo('Opponent',state.opp,[['all','Every opponent'],...ids.filter(id=>id!==state.team).map(id=>[id,label(id)])]);
 const notes=warnings.map(x=>'<div>'+esc(x)+'</div>').join('');
 mount.innerHTML=`<div class="h2h-dashboard">
 <div class="h2h-top">${statCards.map(([k,v])=>`<div class="h2h-metric"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}</div>
 <div class="h2h-selectors">${controls}</div>
 <h3>Head-to-head comparison</h3>${renderTable(match)}
 ${state.team==='all'&&leaders.length?`<p class="h2h-subtle" style="margin-top:10px">Largest series leads (among recurring matchups): ${leaders.map(x=>`${esc(label(x.sw>x.sl?x.a:x.b))} over ${esc(label(x.sw>x.sl?x.b:x.a))} (${Math.max(x.sw,x.sl)}–${Math.min(x.sw,x.sl)})`).join(' · ')}.</p>`:''}
 <h3>Series history</h3>${seriesLog(match)}
 <div class="h2h-warnings h2h-subtle"><strong>Data notes:</strong> Historical 2021 source conflicts are flagged “Review.” Forfeits and agreements count in game and series records, not in run differential or pitcher decisions. 2026 comes from published D1 results; unclassified or unplayed series are excluded. ${unresolved?`${unresolved} unfinished/unclassified 2026 entr${unresolved===1?'y':'ies'} excluded. `:''}${notes}</div>
 </div>`;
 mount.querySelectorAll('[data-h2h-select]').forEach(s=>s.addEventListener('change',()=>{
  const name=s.dataset.h2hSelect;state[name==='season'?'year':name==='opponent'?'opp':name]=s.value;
  if(name==='team')state.opp='all';state.expanded=false;refresh(rows,unresolved,warnings);
 }));
 mount.querySelector('#h2hToggle')?.addEventListener('click',()=>{state.expanded=!state.expanded;refresh(rows,unresolved,warnings)});
}
function updateTeamDetail(rows) {
 if(!fixedTeam)return;
 const involved=rows.filter(r=>r.team_a_id===fixedTeam||r.team_b_id===fixedTeam);
 const rs=summarize(involved.filter(r=>r.phase==='regular')).get(fixedTeam)||tally();
 const po=summarize(involved.filter(r=>r.phase==='playoff')).get(fixedTeam)||tally();
 const cards=document.querySelectorAll('.team-summary-grid .team-summary-card');
 const sets=[
  [`${rs.gw+po.gw}–${rs.gl+po.gl}`,`RS + playoffs · ${pct(rs.gw+po.gw,rs.gl+po.gl)} win pct`],
  [`${rs.gw}–${rs.gl}`,`2021–2026 · ${rs.sw}–${rs.sl} series`],
  [`${po.gw}–${po.gl}`,`${po.sw}–${po.sl} playoff series`]
 ];
 sets.forEach(([score,caption],i)=>{
  if(!cards[i])return;const strong=cards[i].querySelector('strong'),small=cards[i].querySelector('small');
  if(strong)strong.textContent=score;if(small)small.textContent=caption;
 });
 const worldSeries=involved.filter(r=>r.phase==='playoff'&&String(r.round_name).toLowerCase()==='world series');
 const rings=worldSeries.filter(r=>(r.team_a_game_wins>r.team_b_game_wins?r.team_a_id:r.team_b_id)===fixedTeam).length;
 const runnerUps=worldSeries.length-rings;
 if(cards[3]){
  const strong=cards[3].querySelector('strong'),small=cards[3].querySelector('small');
  if(strong)strong.textContent=String(rings);
  if(small)small.textContent=`${runnerUps} runner-up${runnerUps===1?'':'s'} · ${worldSeries.length} appearances`;
 }
 const section=[...document.querySelectorAll('.team-detail-section')].find(el=>el.querySelector('h2')?.textContent.trim()==='Playoff Series History');
 const tbody=section?.querySelector('tbody');
 if(tbody){
  const playoffs=involved.filter(r=>r.phase==='playoff').sort((a,b)=>n(b.season)-n(a.season)||a.series_id.localeCompare(b.series_id));
  tbody.innerHTML=playoffs.map(r=>{
   const opponent=r.team_a_id===fixedTeam?r.team_b_id:r.team_a_id;
   const w=r.team_a_id===fixedTeam?n(r.team_a_game_wins):n(r.team_b_game_wins),l=r.team_a_id===fixedTeam?n(r.team_b_game_wins):n(r.team_a_game_wins);
   return `<tr class="${w>l?'team-playoff-win':''}"><td>${esc(r.season)}</td><td>${esc(r.round_name)}</td><td><a href="/teams/${esc(opponent)}/">${esc(label(opponent))}</a></td><td>${w>l?'W':'L'} ${w}–${l}</td></tr>`;
  }).join('')||'<tr><td colspan="4">No recorded playoff series</td></tr>';
 }
}
fetch('/api/public/history',{cache:'no-store'})
 .then(r=>r.json()).then(data=>{
  if(!data.ok||!Array.isArray(data.rows))throw new Error(data.error||'History API unavailable');
  updateTeamDetail(data.rows);
  refresh(data.rows,n(data.unresolved_2026_count),data.warnings||[]);
 }).catch(err=>{
  mount.innerHTML=`<div class="h2h-dashboard h2h-empty"><strong>Historical comparison not initialized.</strong><p class="h2h-subtle">${esc(err?.message||'Please retry.')} This feature requires migrations 0036 and 0037 in the production D1 database.</p></div>`;
 });
})();
