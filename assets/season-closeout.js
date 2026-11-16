(()=>{
'use strict';
const path=(location.pathname.replace(/\/+$/,'')||'/');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function getJson(url){
  const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'}});
  let j=null;try{j=await r.json()}catch{}
  if(!r.ok||!j?.ok)throw new Error(j?.error||j?.detail||`HTTP ${r.status}`);
  return j;
}
function styleOnce(){
  if(document.getElementById('nd-season-closeout-style'))return;
  const s=document.createElement('style');s.id='nd-season-closeout-style';s.textContent=`
    .nd-world-champion{position:relative!important;background:linear-gradient(90deg,rgba(var(--nd-champ-rgb,215,173,72),.22),rgba(var(--nd-champ-rgb,215,173,72),.06))!important;box-shadow:inset 0 0 0 1px rgba(var(--nd-champ-rgb,215,173,72),.95),0 0 18px rgba(var(--nd-champ-rgb,215,173,72),.48),0 0 38px rgba(var(--nd-champ-rgb,215,173,72),.22)!important;animation:ndChampionPulse 2.3s ease-in-out infinite}
    .nd-world-champion::after{content:'WORLD SERIES CHAMPION';position:absolute;right:10px;top:5px;font-size:7px;font-weight:950;letter-spacing:.08em;color:rgb(var(--nd-champ-rgb,215,173,72));text-shadow:0 0 10px rgba(var(--nd-champ-rgb,215,173,72),.35)}
    @keyframes ndChampionPulse{0%,100%{box-shadow:inset 0 0 0 1px rgba(var(--nd-champ-rgb,215,173,72),.75),0 0 12px rgba(var(--nd-champ-rgb,215,173,72),.28),0 0 25px rgba(var(--nd-champ-rgb,215,173,72),.12)}50%{box-shadow:inset 0 0 0 1px rgba(var(--nd-champ-rgb,215,173,72),1),0 0 24px rgba(var(--nd-champ-rgb,215,173,72),.55),0 0 44px rgba(var(--nd-champ-rgb,215,173,72),.24)}}
    .history-team-row.nd-champion-row{background:linear-gradient(90deg,rgba(215,173,72,.18),transparent 65%)!important;box-shadow:inset 3px 0 0 #d7ad48}.history-team-row.nd-runner-row{background:linear-gradient(90deg,rgba(185,194,210,.09),transparent 55%)!important}
    .nd-admin-handoff-card{border-color:rgba(215,173,72,.52)!important;background:linear-gradient(145deg,rgba(215,173,72,.08),rgba(10,19,32,.95))!important}
    .nd-inline-error{margin:10px 0;padding:10px 12px;border:1px solid rgba(229,103,116,.45);border-radius:10px;background:rgba(229,103,116,.08);color:#f3b2ba;font-size:11px;line-height:1.5}
    .nd-playoff-stats-note{margin-top:6px;color:var(--muted);font-size:10px;line-height:1.45}
  `;document.head.appendChild(s);
}
styleOnce();

function championFromSeries(series){
  const ws=(series||[]).filter(x=>x.series_type==='playoff'&&x.playoff_round==='World Series'&&x.series_status==='complete').sort((a,b)=>String(b.series_date||'').localeCompare(String(a.series_date||'')))[0];
  if(!ws)return null;
  const aw=Number(ws.away_wins||0),hw=Number(ws.home_wins||0);
  if(aw===hw)return null;
  return {series:ws,champion_id:aw>hw?ws.away_team_id:ws.home_team_id,champion_name:aw>hw?ws.away_team:ws.home_team,runner_id:aw>hw?ws.home_team_id:ws.away_team_id,runner_name:aw>hw?ws.home_team:ws.away_team};
}

async function initPlayoffs(){
  let data;try{data=await getJson('/api/public/results?season=2026')}catch{return}
  const champ=championFromSeries(data.series);if(!champ)return;
  const rgb=(typeof TEAM_GLOW!=='undefined'&&TEAM_GLOW?.[champ.champion_id])||'215,173,72';
  function apply(){
    const ws=document.querySelector('[data-bracket-node="ws"]');if(!ws)return;
    let winner=null;
    for(const row of ws.querySelectorAll('.seed-team')){
      const img=row.querySelector('img');const name=(row.querySelector('.seed-name')?.textContent||'').trim();
      if((img?.src||'').includes(`/assets/logos/${champ.champion_id}.png`)||name===champ.champion_name)winner=row;
    }
    if(winner){winner.classList.add('nd-world-champion');winner.style.setProperty('--nd-champ-rgb',rgb)}
    const meta=document.getElementById('pictureMeta');
    if(meta&&!meta.querySelector('[data-world-champ-chip]'))meta.insertAdjacentHTML('afterbegin',`<span class="picture-chip" data-world-champ-chip><strong>${esc(champ.champion_name)}</strong> · 2026 World Series Champions</span>`);
  }
  apply();
  const root=document.getElementById('pictureRoot');if(root)new MutationObserver(apply).observe(root,{childList:true,subtree:true});
}

function initLeaders(){
  const btn=document.getElementById('playoffBtn');
  if(btn){
    if(typeof playoffMode!=='undefined'&&playoffMode&&typeof activateLeaderMode==='function')activateLeaderMode('all');
    btn.remove();
  }
  const note=document.getElementById('qualNote');
  if(note&&!note.dataset.ndPostseasonMoved){note.dataset.ndPostseasonMoved='1';note.insertAdjacentHTML('beforeend',' <span class="nd-playoff-stats-note">Postseason leaderboards are now in <a href="/stats/">Stats</a>, including exact 2026 playoff totals and cumulative playoff totals.</span>')}
}

async function initAwards(){
  // Replace the hard-coded pitching-feat list only when the admin-managed table is available.
  try{
    const feats=await getJson('/api/public/pitching-feats');
    if(Array.isArray(feats.feats)&&typeof PITCHING_FEATS!=='undefined'){
      PITCHING_FEATS.splice(0,PITCHING_FEATS.length,...feats.feats.map(x=>({kind:x.kind,pitcher:x.pitcher,opponent:x.opponent,year:Number(x.year),label:x.label,order:Number(x.order)})));
      if(typeof renderPitchingFeats==='function')renderPitchingFeats();
    }
  }catch(e){console.warn('Pitching feats admin table unavailable; using bundled historical list.',e)}

  // Make the current postseason status derive from published playoff series, including champion / runner-up.
  try{
    const [league,results]=await Promise.all([getJson('/api/public/league?season=2026'),getJson('/api/public/results?season=2026')]);
    if(typeof LIVE_2026!=='undefined')LIVE_2026={loaded:true,standings:league.standings||[],playoffs:(results.series||[]).filter(x=>x.series_type==='playoff')};
    if(typeof live2026Postseason==='function'){
      live2026Postseason=function(team){
        const row=(LIVE_2026.standings||[]).find(x=>x.team_id===team.team_id);if(!row||Number(row.rank)>7)return 'No';
        const po=(LIVE_2026.playoffs||[]),champ=championFromSeries(po);
        if(champ?.champion_id===team.team_id)return 'Champions';
        if(champ?.runner_id===team.team_id)return 'Runner-up';
        const rank={'First Round':1,'Semifinal':2,'World Series':3};
        const completed=po.filter(s=>s.series_status==='complete'&&(s.away_team_id===team.team_id||s.home_team_id===team.team_id)).sort((a,b)=>(rank[b.playoff_round]||0)-(rank[a.playoff_round]||0)||String(b.series_date||'').localeCompare(String(a.series_date||'')));
        if(!completed.length)return Number(row.rank)===1?'First-round bye':'Playoffs';
        const latest=completed[0],winner=Number(latest.away_wins)>Number(latest.home_wins)?latest.away_team_id:latest.home_team_id;
        return winner===team.team_id?'Advanced':`Eliminated · ${latest.playoff_round||'Playoffs'}`;
      };
    }
    if(typeof renderSeason==='function'&&document.getElementById('seasonSelect')?.value==='2026')renderSeason();
    const markRows=()=>document.querySelectorAll('#historicalStandings tbody tr').forEach(tr=>{const t=tr.textContent||'';tr.classList.toggle('nd-champion-row',t.includes('Champions'));tr.classList.toggle('nd-runner-row',t.includes('Runner-up'))});
    markRows();const hs=document.getElementById('historicalStandings');if(hs)new MutationObserver(markRows).observe(hs,{childList:true,subtree:true});
  }catch(e){console.warn('Could not refresh 2026 postseason status.',e)}
}

function aggregateBat(rows){
  const m=new Map();
  for(const r of rows||[]){const id=r.Player_ID;if(!id)continue;const x=m.get(id)||{...r,GP:0,PAs:0,ABs:0,Runs:0,Hits:0,Singles:0,Doubles:0,Triples:0,HRs:0,RBI:0,BB:0,Ks:0};for(const k of ['GP','PAs','ABs','Runs','Hits','Singles','Doubles','Triples','HRs','RBI','BB','Ks'])x[k]+=Number(r[k]||0);if(!x.Team_ID&&r.Team_ID){x.Team_ID=r.Team_ID;x.Team=r.Team}m.set(id,x)}
  return [...m.values()].map(x=>{const tb=x.Singles+2*x.Doubles+3*x.Triples+4*x.HRs,ba=x.ABs?x.Hits/x.ABs:0,obp=x.PAs?(x.Hits+x.BB)/x.PAs:0,slg=x.ABs?tb/x.ABs:0;return {...x,BA:ba.toFixed(3),OBP:obp.toFixed(3),SLG:slg.toFixed(3),OPS:(obp+slg).toFixed(3)}});
}
function ipToOutsSafe(v){if(typeof historicalIpToOuts==='function')return historicalIpToOuts(v);const s=String(v??'');const [w,f='']=s.split('.');return (Number(w)||0)*3+(f==='1'?1:f==='2'?2:0)}
function outsToIpSafe(v){const o=Number(v||0),w=Math.floor(o/3),r=o%3;return r?`${w}.${r}`:String(w)}
function aggregatePit(rows){
  const m=new Map();
  for(const r of rows||[]){const id=r.Player_ID;if(!id)continue;const x=m.get(id)||{...r,GP:0,Apps:0,Starts:0,W:0,L:0,S:0,Outs:0,BF:0,Runs:0,ER:0,Walks:0,Hits:0,Ks:0,HRs:0,WP:0};x.Outs+=r.Outs!==undefined?Number(r.Outs||0):ipToOutsSafe(r.IP);for(const k of ['GP','Apps','Starts','W','L','S','BF','Runs','ER','Walks','Hits','Ks','HRs','WP'])x[k]+=Number(r[k]||0);if(!x.Team_ID&&r.Team_ID){x.Team_ID=r.Team_ID;x.Team=r.Team}m.set(id,x)}
  return [...m.values()].map(x=>{const ip=x.Outs/3;return {...x,IP:outsToIpSafe(x.Outs),ERA:x.Outs?((x.ER*3)/ip).toFixed(2):null,WHIP:x.Outs?((x.Walks+x.Hits)/ip).toFixed(2):null,FIP:x.Outs?((13*x.HRs+3*x.Walks-2*x.Ks)/x.Outs).toFixed(3):null}});
}

async function initStats(){
  if(typeof sourceRows!=='function'||!document.getElementById('scopeSel'))return;
  const sel=document.getElementById('scopeSel'),cache=new Map();let meta=null;
  const oldSource=sourceRows,oldWar=(typeof warForScope==='function'?warForScope:null),oldUpdate=(typeof updateQualifierText==='function'?updateQualifierText:null),oldRender=render;
  const staticHistoricalPlayoffBat=(typeof PLAYOFF_BAT!=='undefined'?PLAYOFF_BAT:[]),staticHistoricalPlayoffPit=(typeof PLAYOFF_PIT!=='undefined'?PLAYOFF_PIT:[]);

  async function loadSeason(year,phase){const key=`${phase}-${year}`;if(cache.has(key))return cache.get(key);const j=await getJson(`/api/public/stats-live?season=${encodeURIComponent(year)}&phase=${phase}`);cache.set(key,j);return j}
  async function ensureScope(scope){
    if(scope==='playoffs'){
      const years=(meta?.playoff_seasons||[]).filter(y=>Number(y)>=2026);await Promise.all(years.map(y=>loadSeason(y,'playoffs')));return;
    }
    const pm=String(scope).match(/^playoffs-(\d{4})$/);if(pm)return loadSeason(Number(pm[1]),'playoffs');
    if(/^\d{4}$/.test(String(scope))&&Number(scope)>=2027)return loadSeason(Number(scope),'regular');
  }
  function playoffAll(type){const exact=[...cache.entries()].filter(([k])=>k.startsWith('playoffs-')).flatMap(([,j])=>type==='bat'?(j.batting||[]):(j.pitching||[]));return type==='bat'?aggregateBat([...(staticHistoricalPlayoffBat||[]),...exact]):aggregatePit([...(staticHistoricalPlayoffPit||[]),...exact])}
  function customRows(){
    const scope=sel.value;let rows=null;
    if(scope==='playoffs')rows=playoffAll(mode);
    else {const pm=scope.match(/^playoffs-(\d{4})$/);if(pm){const j=cache.get(`playoffs-${pm[1]}`);rows=j?(mode==='bat'?j.batting:j.pitching):[]}
      else if(/^\d{4}$/.test(scope)&&Number(scope)>=2027){const j=cache.get(`regular-${scope}`);rows=j?(mode==='bat'?j.batting:j.pitching):[]}}
    if(rows===null)return null;
    rows=(rows||[]).filter(typeof publicVisibleStatRow==='function'?publicVisibleStatRow:()=>true);
    if(typeof attachWar==='function')rows=attachWar(rows);
    if(mode==='bat')rows=rows.map(r=>{const den=Number(r.ABs||0)-Number(r.Ks||0)-Number(r.HRs||0);return {...r,BABIP:den>0?(Number(r.Hits||0)-Number(r.HRs||0))/den:null}});
    else rows=rows.map(r=>{const outs=r.Outs!==undefined?Number(r.Outs||0):ipToOutsSafe(r.IP),hasHr=r.HRs!==undefined&&r.HRs!==null&&r.HRs!=='';return {...r,FIP:outs>0&&hasHr?(13*Number(r.HRs||0)+3*Number(r.Walks||0)-2*Number(r.Ks||0))/outs:null}});
    return rows;
  }
  sourceRows=function(){const rows=customRows();return rows===null?oldSource():rows};
  if(oldWar)warForScope=function(){const scope=sel.value;if(scope==='playoffs'){const bat=playoffAll('bat'),pit=playoffAll('pit');return seasonWarMap(bat,pit)}const pm=scope.match(/^playoffs-(\d{4})$/);if(pm){const j=cache.get(`playoffs-${pm[1]}`)||{};return seasonWarMap(j.batting||[],j.pitching||[])}if(/^\d{4}$/.test(scope)&&Number(scope)>=2027){const j=cache.get(`regular-${scope}`)||{};return seasonWarMap(j.batting||[],j.pitching||[])}return oldWar()};
  if(oldUpdate)updateQualifierText=function(){const scope=sel.value;if(scope==='playoffs'){document.getElementById('qualLabel').textContent=mode==='bat'?'Qualified only (50+ PA)':'Qualified only (18+ IP)';document.getElementById('qualifierHint').textContent='Cumulative postseason totals combine inferred 2021–2025 playoff data with exact series-by-series playoff data from 2026 onward.';return}const pm=scope.match(/^playoffs-(\d{4})$/);if(pm){document.getElementById('qualLabel').textContent=mode==='bat'?'Qualified only (50+ PA)':'Qualified only (18+ IP)';document.getElementById('qualifierHint').textContent=`${pm[1]} Playoffs uses exact published playoff series and game statistics from D1. Leave qualification off to see every postseason player.`;return}return oldUpdate()};
  render=function(){const scope=sel.value,needs=scope==='playoffs'||/^playoffs-\d{4}$/.test(scope)||(/^\d{4}$/.test(scope)&&Number(scope)>=2027);if(needs){const missing=scope==='playoffs'?(meta?.playoff_seasons||[]).filter(y=>Number(y)>=2026).some(y=>!cache.has(`playoffs-${y}`)):scope.startsWith('playoffs-')?!cache.has(scope):!cache.has(`regular-${scope}`);if(missing){const c=document.getElementById('statsCount');if(c)c.textContent='Loading database stats…';ensureScope(scope).then(()=>oldRender()).catch(e=>{if(c)c.textContent=`Stats unavailable: ${e.message}`});return}}return oldRender()};

  try{
    meta=await getJson('/api/public/stats-meta');
    const years=[...new Set([2021,2022,2023,2024,2025,2026,...(meta.regular_seasons||[]).map(Number)])].sort((a,b)=>b-a);
    const playoffYears=new Set((meta.playoff_seasons||[]).map(Number).filter(y=>y>=2026));
    const prior=sel.value;sel.innerHTML='<option value="career">Career</option><option value="playoffs">Playoffs (All Time)</option>'+years.map(y=>`${playoffYears.has(y)?`<option value="playoffs-${y}">${y} Playoffs</option>`:''}<option value="${y}">${y}</option>`).join('');if([...sel.options].some(o=>o.value===prior))sel.value=prior;
    const intro=document.querySelector('.pagehead .muted');if(intro)intro.textContent='Explore career, regular-season, exact modern postseason, or cumulative playoff batting and pitching statistics. 2026+ playoff totals come directly from published series.';
    const footer=document.querySelector('footer .container');if(footer)footer.textContent='ND Wiffle · League database · Historical regular season, inferred 2021–2025 playoffs, and exact 2026+ postseason results.';
  }catch(e){console.warn('Stats scope metadata unavailable.',e)}
  sel.addEventListener('change',()=>{ensureScope(sel.value).then(()=>render()).catch(e=>{const c=document.getElementById('statsCount');if(c)c.textContent=`Stats unavailable: ${e.message}`})});
}

async function initAdminHome(){
  const grid=document.querySelector('.admin-grid');if(!grid||grid.querySelector('[data-season-tools-card]'))return;
  const card=document.createElement('a');card.href='/admin/season-tools/';card.className='admin-card primary nd-admin-handoff-card';card.dataset.seasonToolsCard='1';card.innerHTML='<div class="admin-card-tag">Season Closeout & Handoff</div><div style="font-size:31px;line-height:1;margin-top:12px" aria-hidden="true">✓</div><h2>Health, Pitching Feats & Handoff</h2><p>Manage no-hitters/perfect games without SQL, review database health, verify postseason completion, and see Spring League isolation readiness.</p><div class="admin-card-link">Open Season Tools →</div>';grid.prepend(card);
}

if(path==='/playoffs')initPlayoffs();
else if(path==='/leaders')initLeaders();
else if(path==='/awards')initAwards();
else if(path==='/stats')initStats();
else if(path==='/admin')initAdminHome();
})();
