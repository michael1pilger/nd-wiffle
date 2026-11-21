(()=>{
  if(window.__ND_HOF_V168_LOADED)return;
  window.__ND_HOF_V168_LOADED=true;

  const FALLBACK=[
    {player_id:"michael_pilger",name:"Michael Pilger"},
    {player_id:"matthew_doty",name:"Matthew Doty"},
    {player_id:"casey_cavlovich",name:"Casey Cavlovich"},
    {player_id:"matt_baldwin",name:"Matt Baldwin"},
    {player_id:"jack_penney",name:"Jack Penney"},
    {player_id:"patrick_thompson",name:"Patrick Thompson"},
    {player_id:"jack_glavy",name:"Jack Glavy"},
    {player_id:"patrick_sullivan",name:"Patrick Sullivan"},
    {player_id:"xavier_hirsch",name:"Xavier Hirsch"},
    {player_id:"joey_thomalla",name:"Joey Thomalla"},
    {player_id:"jimmy_redfern",name:"Jimmy Redfern"}
  ];

  if(!document.getElementById('nd-hof-style')){
    const style=document.createElement("style");style.id='nd-hof-style';
    style.textContent=`
      .hof-badge{display:inline-flex;align-items:center;justify-content:center;margin-left:5px;padding:2px 5px;border:1px solid rgba(215,173,72,.55);border-radius:999px;background:rgba(215,173,72,.12);color:#e9c96f;font-size:7px!important;font-weight:950!important;line-height:1!important;letter-spacing:.06em;vertical-align:middle;white-space:nowrap}
      .hof-badge::before{content:"★";font-size:7px;margin-right:3px}
    `;
    document.head.appendChild(style);
  }

  window.ND_HONORS_PROMISE=window.ND_HONORS_PROMISE||fetch('/api/public/honors',{cache:'no-store',headers:{accept:'application/json'}})
    .then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);return j});

  let members=[];
  function annotate(root=document){
    if(!members.length)return;
    const byName=new Map(members.map(x=>[String(x.name||'').toLowerCase(),x]));
    const values=[...members];
    const selectors="a,td,strong,span,h1,h2,h3,.player-name,.seed-name,.award-player";
    root.querySelectorAll(selectors).forEach(el=>{
      if(el.classList?.contains('hof-badge')||el.querySelector?.(':scope > .hof-badge'))return;
      const text=(el.childNodes.length===1&&el.firstChild?.nodeType===Node.TEXT_NODE
        ?el.textContent
        :[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ')
      ).replace(/\s+/g,' ').trim();
      if(!text)return;
      const lower=text.toLowerCase();
      const exact=byName.get(lower);
      const pref=values.find(x=>lower.startsWith(String(x.name||'').toLowerCase())&&(text.length===String(x.name||'').length||/\s/.test(text[String(x.name||'').length]||'')));
      if(!exact&&!pref)return;
      const badge=document.createElement('span');badge.className='hof-badge';badge.textContent='HOF';badge.title='ND Wiffle Hall of Fame';el.appendChild(badge);
    });
  }
  function start(list){
    members=(list||[]).map(x=>({player_id:x.player_id||x.id,name:x.name})).filter(x=>x.name);
    document.querySelectorAll('.hof-badge').forEach(x=>x.remove());
    annotate();
    let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;annotate()})}).observe(document.documentElement,{childList:true,subtree:true});
  }
  window.ND_HONORS_PROMISE.then(j=>start(j.hall_of_fame||FALLBACK)).catch(()=>start(FALLBACK));
})();

/* Central honors/accolades v168. */
(()=>{
  const supported=/^\/(?:awards|players|player|admin)(?:\/|$)/.test(location.pathname);
  if(!supported||document.querySelector('script[data-nd-honors]'))return;
  const js=document.createElement('script');js.src='/assets/honors.js?v=168';js.dataset.ndHonors='1';js.async=false;document.body.appendChild(js);
})();

/* Daily Grid v163 loader. */
(()=>{
  if(!/^\/grid\/?$/.test(location.pathname))return;
  if(!document.querySelector('link[data-nd-grid-daily]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/grid-daily.css?v=163';css.dataset.ndGridDaily='1';document.head.appendChild(css);
  }
  if(!document.querySelector('script[data-nd-grid-daily]')){
    const js=document.createElement('script');js.src='/assets/grid-daily.js?v=163';js.dataset.ndGridDaily='1';js.async=false;document.body.appendChild(js);
  }
})();

/* Season closeout / commissioner handoff. */
(()=>{
  const supported=/^\/(?:stats|leaders|playoffs|awards|admin)(?:\/|$)/.test(location.pathname);
  if(!supported||document.querySelector('script[data-nd-season-closeout]'))return;
  const js=document.createElement('script');js.src='/assets/season-closeout.js?v=164';js.dataset.ndSeasonCloseout='1';js.async=false;document.body.appendChild(js);
})();

/* Modern career aggregation v167. */
(()=>{
  const supported=/^\/(?:stats|players)(?:\/|$)/.test(location.pathname);
  if(!supported||document.querySelector('script[data-nd-career-modern]'))return;
  const js=document.createElement('script');js.src='/assets/career-modern.js?v=167';js.dataset.ndCareerModern='1';js.async=false;document.body.appendChild(js);
})();
