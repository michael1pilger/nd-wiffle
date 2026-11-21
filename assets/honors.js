(()=>{
'use strict';
if(window.__ND_HONORS_UI_V169)return;window.__ND_HONORS_UI_V169=true;
const path=(location.pathname.replace(/\/+$/,'')||'/');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICON={'All-Star':'⭐','All-Star Game MVP':'🌠','Gold Glove':'🧤','Fourth Man':'4️⃣','HRD Winner':'💥','Silver Slugger':'🏏','Cy Young':'⚾','ROTY':'🌟','MVP':'🏆','WS Champion':'💍','WS MVP':'💎'};
const ORDER=['All-Star','All-Star Game MVP','Gold Glove','Fourth Man','HRD Winner','Silver Slugger','Cy Young','ROTY','MVP','WS Champion','WS MVP'];
const ALIAS={
  'All Star':'All-Star','All-Star':'All-Star','All-Star Game MVP':'All-Star Game MVP','ASG MVP':'All-Star Game MVP',
  'Gold Gloves':'Gold Glove','Gold Glove':'Gold Glove','4th Man':'Fourth Man','Fourth Man':'Fourth Man','Fourth Man of the Year':'Fourth Man',
  'HRD winner':'HRD Winner','HRD Winner':'HRD Winner','Home Run Derby Winner':'HRD Winner',
  'Silver Sluggers':'Silver Slugger','Silver Slugger':'Silver Slugger','Cy Youngs':'Cy Young','Cy Young':'Cy Young',
  'Rookie of the Year':'ROTY','ROTY':'ROTY','MVP':'MVP',
  'World Series Champion':'WS Champion','World Series Winner':'WS Champion','WS Champion':'WS Champion',
  'WSMVP':'WS MVP','World Series MVP':'WS MVP','WS MVP':'WS MVP'
};
const canon=a=>ALIAS[a]||a;
function key(a){return `${a.Season}|${a.Player_ID}|${canon(a.Award)}|${a.Detail||''}`}
function dedupe(rows){const seen=new Set(),out=[];for(const a of rows||[]){const k=key(a);if(seen.has(k))continue;seen.add(k);out.push(a)}return out}
function combined(data){return dedupe([...(window.ND_DATA?.awards||[]),...(data.awards||[])]);}
function honorsPromise(){return window.ND_HONORS_PROMISE||fetch('/api/public/honors',{cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);return j})}
function ensureStyles(){if(document.getElementById('nd-honors-style'))return;const s=document.createElement('style');s.id='nd-honors-style';s.textContent=`
.nd-accolades{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.nd-accolade{display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(215,173,72,.34);background:rgba(215,173,72,.08);border-radius:999px;padding:5px 7px;font-size:8px;font-weight:900;color:#f0ddb0}.nd-accolade .count{color:#fff}.nd-accolade.hof{border-color:rgba(215,173,72,.7);background:rgba(215,173,72,.15)}
.nd-honors-source{margin-top:8px;color:var(--muted);font-size:9px}.nd-admin-honors-card{border-color:rgba(215,173,72,.55)!important;background:linear-gradient(145deg,rgba(215,173,72,.09),rgba(10,19,32,.95))!important}
`;document.head.appendChild(s)}
ensureStyles();

function awardsForPlayer(rows,pid){return (rows||[]).filter(a=>a.Player_ID===pid)}
function summarize(rows){
  const m=new Map();
  for(const a of rows||[]){
    const c=canon(a.Award);if(!ORDER.includes(c))continue;
    const x=m.get(c)||{award:c,count:0,years:[],details:[]};
    x.count++;x.years.push(String(a.Season));if(a.Detail)x.details.push(a.Detail);m.set(c,x);
  }
  return ORDER.map(k=>m.get(k)).filter(Boolean);
}
function chipHtml(x){
  const extra=[...new Set(x.details)].filter(Boolean);
  const years=[...new Set(x.years)].sort();
  const title=years.join(', ')+(extra.length?` · ${extra.join(', ')}`:'');
  return `<span class="nd-accolade" title="${esc(title)}"><span>${ICON[x.award]||'•'}</span><span>${esc(x.award)}</span>${x.count>1?`<span class="count">×${x.count}</span>`:''}</span>`;
}

function syncPlayers(data){
  if(typeof accoladesById==='undefined'||typeof renderPlayers!=='function')return;
  if(typeof accoladeOrder!=='undefined')accoladeOrder.splice(0,accoladeOrder.length,...ORDER);
  if(typeof accoladeAliases!=='undefined')Object.assign(accoladeAliases,ALIAS);
  if(typeof accoladeIcon!=='undefined')Object.assign(accoladeIcon,ICON);
  for(const k of Object.keys(accoladesById))delete accoladesById[k];
  for(const a of combined(data)){
    const c=canon(a.Award);if(!ORDER.includes(c)||!a.Player_ID)continue;
    const obj=(accoladesById[a.Player_ID]??={});obj[c]=(obj[c]||0)+1;
  }
  renderPlayers();
}

function syncPlayerPage(data){
  const pid=new URLSearchParams(location.search).get('id')||'';if(!pid)return;
  const hero=document.querySelector('.hero > div');if(!hero)return;
  let wrap=document.getElementById('playerAccolades');
  if(!wrap){
    wrap=document.createElement('div');wrap.id='playerAccolades';wrap.className='nd-accolades';
    const meta=document.getElementById('playerMeta');(meta||hero.firstElementChild)?.insertAdjacentElement('afterend',wrap);
  }
  const rows=awardsForPlayer(combined(data),pid),summary=summarize(rows),hof=(data.hall_of_fame||[]).some(x=>x.player_id===pid);
  wrap.innerHTML=(hof?'<span class="nd-accolade hof"><span>★</span><span>Hall of Fame</span></span>':'')+summary.map(chipHtml).join('');
  wrap.style.display=wrap.innerHTML?'flex':'none';
  if(rows.length){
    let src=document.getElementById('playerHonorsSource');
    if(!src){src=document.createElement('div');src.id='playerHonorsSource';src.className='nd-honors-source';wrap.insertAdjacentElement('afterend',src)}
    src.textContent='Accolades are synced from the league honors registry; modern World Series champion rings are derived from the champion season roster.';
  }
}

function renderHofGrid(data){
  const el=document.getElementById('hofGrid');if(!el)return;
  el.innerHTML=(data.hall_of_fame||[]).map(x=>`<a class="hof-card" href="/player/?id=${encodeURIComponent(x.player_id)}"><img src="/assets/headshots/${encodeURIComponent(x.player_id)}.png" alt="${esc(x.name)}" onerror="this.style.display='none'"><div><strong>${esc(x.name)}</strong><small>Hall of Fame${x.inducted_season?` · ${x.inducted_season}`:''}</small></div></a>`).join('');
}

function syncAwardsPage(data){
  if(typeof awards==='undefined'||typeof chron==='undefined'||typeof running==='undefined'||typeof at==='undefined')return;
  const merged=combined(data);
  awards.splice(0,awards.length,...merged);
  chron.splice(0,chron.length,...merged.sort((a,b)=>Number(a.Season)-Number(b.Season)||(typeof idx==='function'?idx(a.Award):0)-(typeof idx==='function'?idx(b.Award):0)));
  for(const k of Object.keys(running))delete running[k];at.clear();
  for(const a of chron){
    const c=typeof canon==='function'?canon(a.Award):a.Award,k=`${a.Player_ID}|${c}`;
    running[k]=(running[k]||0)+1;at.set(`${a.Season}|${a.Player_ID}|${c}`,running[k]);
  }
  if(typeof HOF_MEMBERS!=='undefined')HOF_MEMBERS.splice(0,HOF_MEMBERS.length,...(data.hall_of_fame||[]).map(x=>({id:x.player_id,name:x.name})));
  renderHofGrid(data);
  if(typeof renderSeason==='function')renderSeason();
}

function syncAdminHome(){
  const grid=document.querySelector('.admin-grid');if(!grid||grid.querySelector('[data-honors-card]'))return;
  const card=document.createElement('a');card.href='/admin/honors/';card.className='admin-card primary nd-admin-honors-card';card.dataset.honorsCard='1';
  card.innerHTML='<div class="admin-card-tag">League History</div><div style="font-size:31px;line-height:1;margin-top:12px" aria-hidden="true">★</div><h2>Honors & Hall of Fame</h2><p>Edit modern award winners and Hall of Fame membership in one place. World Series champion rings are derived automatically from the champion season roster.</p><div class="admin-card-link">Manage Honors →</div>';
  grid.prepend(card);
}

if(path==='/admin')syncAdminHome();
honorsPromise().then(data=>{
  if(path==='/players')syncPlayers(data);
  else if(path==='/player')syncPlayerPage(data);
  else if(path==='/awards')syncAwardsPage(data);
}).catch(err=>console.error('Honors registry unavailable:',err));
})();
