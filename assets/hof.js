
(()=>{
  const HOF=[
    {id:"michael_pilger",name:"Michael Pilger"},
    {id:"matthew_doty",name:"Matthew Doty"},
    {id:"casey_cavlovich",name:"Casey Cavlovich"},
    {id:"matt_baldwin",name:"Matt Baldwin"},
    {id:"jack_penney",name:"Jack Penney"},
    {id:"patrick_thompson",name:"Patrick Thompson"},
    {id:"jack_glavy",name:"Jack Glavy"},
    {id:"patrick_sullivan",name:"Patrick Sullivan"},
    {id:"xavier_hirsch",name:"Xavier Hirsch"}
  ];
  const names=new Map(HOF.map(x=>[x.name.toLowerCase(),x]));

  const style=document.createElement("style");
  style.textContent=`
    .hof-badge{display:inline-flex;align-items:center;justify-content:center;margin-left:5px;padding:2px 5px;border:1px solid rgba(215,173,72,.55);border-radius:999px;background:rgba(215,173,72,.12);color:#e9c96f;font-size:7px!important;font-weight:950!important;line-height:1!important;letter-spacing:.06em;vertical-align:middle;white-space:nowrap}
    .hof-badge::before{content:"★";font-size:7px;margin-right:3px}
  `;
  document.head.appendChild(style);

  function annotate(root=document){
    const selectors="a,td,strong,span,h1,h2,h3,.player-name,.seed-name,.award-player";
    root.querySelectorAll(selectors).forEach(el=>{
      if(el.querySelector?.(".hof-badge"))return;
      const text=(el.childNodes.length===1 && el.firstChild?.nodeType===Node.TEXT_NODE
        ? el.textContent
        : [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(" ")
      ).replace(/\s+/g," ").trim();
      if(!text)return;
      const exact=names.get(text.toLowerCase());
      const pref=[...names.values()].find(x=>text.toLowerCase().startsWith(x.name.toLowerCase()) && (text.length===x.name.length || /\s/.test(text[x.name.length]||"")));
      const hof=exact||pref;
      if(!hof)return;
      const badge=document.createElement("span");
      badge.className="hof-badge";
      badge.textContent="HOF";
      badge.title="ND Wiffle Hall of Fame";
      el.appendChild(badge);
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>annotate());
  else annotate();
  new MutationObserver(()=>annotate()).observe(document.documentElement,{childList:true,subtree:true});
})();
