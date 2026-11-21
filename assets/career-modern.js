(()=>{
'use strict';

const pathname=(location.pathname.replace(/\/+$/,'')||'/');
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};

async function getJson(url){
  const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'}});
  let j=null;
  try{j=await r.json()}catch{}
  if(!r.ok||!j?.ok)throw new Error(j?.error||j?.detail||`HTTP ${r.status}`);
  return j;
}

function ipToOuts(v){
  const s=String(v??'').trim();
  if(!s)return 0;
  const x=parseFloat(s);
  if(!Number.isFinite(x))return 0;
  const whole=Math.floor(x);
  const frac=s.includes('.')?s.split('.')[1].replace(/0+$/,''):'';
  if(['1','10','33','3'].includes(frac))return whole*3+1;
  if(['2','20','67','66','7'].includes(frac))return whole*3+2;
  return Math.round(x*3);
}
function outsToIp(v){
  const o=Math.max(0,Math.round(n(v))),w=Math.floor(o/3),r=o%3;
  return r?`${w}.${r}`:String(w);
}

function aggregateBat(rows){
  const map=new Map();
  for(const r of rows||[]){
    const id=r.Player_ID;if(!id)continue;
    const x=map.get(id)||{
      Player_ID:id,Name:r.Name,Class_Year:r.Class_Year,Retired:r.Retired,
      Team_ID:r.Team_ID||null,Team:r.Team||null,
      GP:0,PAs:0,ABs:0,Runs:0,Hits:0,Singles:0,Doubles:0,Triples:0,HRs:0,RBI:0,BB:0,Ks:0
    };
    for(const k of ['GP','PAs','ABs','Runs','Hits','Singles','Doubles','Triples','HRs','RBI','BB','Ks'])x[k]+=n(r[k]);
    if(r.Team_ID){x.Team_ID=r.Team_ID;x.Team=r.Team}
    if(r.Name)x.Name=r.Name;
    if(r.Class_Year)x.Class_Year=r.Class_Year;
    if(r.Retired!==undefined)x.Retired=r.Retired;
    map.set(id,x);
  }
  return [...map.values()].map(x=>{
    const tb=x.Singles+2*x.Doubles+3*x.Triples+4*x.HRs;
    const ba=x.ABs?x.Hits/x.ABs:0;
    const obp=x.PAs?(x.Hits+x.BB)/x.PAs:0;
    const slg=x.ABs?tb/x.ABs:0;
    return {...x,BA:ba.toFixed(3),OBP:obp.toFixed(3),SLG:slg.toFixed(3),OPS:(obp+slg).toFixed(3)};
  });
}
function aggregatePit(rows){
  const map=new Map();
  for(const r of rows||[]){
    const id=r.Player_ID;if(!id)continue;
    const x=map.get(id)||{
      Player_ID:id,Name:r.Name,Class_Year:r.Class_Year,Retired:r.Retired,
      Team_ID:r.Team_ID||null,Team:r.Team||null,
      GP:0,Apps:0,Starts:0,W:0,L:0,S:0,Outs:0,BF:0,Runs:0,ER:0,Walks:0,Hits:0,Ks:0,HRs:0,WP:0
    };
    x.Outs+=r.Outs!==undefined?n(r.Outs):ipToOuts(r.IP);
    for(const k of ['GP','Apps','Starts','W','L','S','BF','Runs','ER','Walks','Hits','Ks','HRs','WP'])x[k]+=n(r[k]);
    if(r.Team_ID){x.Team_ID=r.Team_ID;x.Team=r.Team}
    if(r.Name)x.Name=r.Name;
    if(r.Class_Year)x.Class_Year=r.Class_Year;
    if(r.Retired!==undefined)x.Retired=r.Retired;
    map.set(id,x);
  }
  return [...map.values()].map(x=>{
    const innings=x.Outs/3;
    return {
      ...x,
      IP:outsToIp(x.Outs),
      ERA:x.Outs?((x.ER*3)/innings).toFixed(2):null,
      WHIP:x.Outs?((x.Walks+x.Hits)/innings).toFixed(2):null,
      FIP:x.Outs?((13*x.HRs+3*x.Walks-2*x.Ks)/x.Outs).toFixed(3):null
    };
  });
}

async function loadModern(){
  const meta=await getJson('/api/public/stats-meta');
  const regular=[...new Set((meta.regular_seasons||[]).map(Number).filter(y=>y>=2026))];
  const playoffs=[...new Set((meta.playoff_seasons||[]).map(Number).filter(y=>y>=2026))];
  const jobs=[
    ...regular.map(year=>({year,phase:'regular'})),
    ...playoffs.map(year=>({year,phase:'playoffs'}))
  ];
  const entries=await Promise.all(jobs.map(async job=>{
    const data=await getJson(`/api/public/stats-live?season=${job.year}&phase=${job.phase}`);
    return [`${job.phase}-${job.year}`,{...job,data}];
  }));
  return {meta,cache:new Map(entries),regular,playoffs};
}

function addWarInto(total,one){
  for(const [id,w] of one||[]){
    const x=total.get(id)||{oWAR:0,pWAR:0,WAR:0,wOBA:0,wRCplus:100};
    x.oWAR+=n(w.oWAR);
    x.pWAR+=n(w.pWAR);
    x.WAR=x.oWAR+x.pWAR;
    total.set(id,x);
  }
}

async function initStats(){
  if(window.__ND_CAREER_MODERN_STATS)return;
  window.__ND_CAREER_MODERN_STATS=true;

  if(typeof sourceRows!=='function'||typeof render!=='function'||typeof historicalCareerBat==='undefined'||typeof historicalCareerPit==='undefined')return;

  let modern;
  try{modern=await loadModern()}
  catch(err){
    console.error('Modern career stats failed to load',err);
    const c=document.getElementById('statsCount');
    if(c&&document.getElementById('scopeSel')?.value==='career')c.textContent=`Career stats warning: ${err.message}`;
    return;
  }

  const allModern=[...modern.cache.values()];
  const modernBat=aggregateBat(allModern.flatMap(x=>x.data.batting||[]));
  const modernPit=aggregatePit(allModern.flatMap(x=>x.data.pitching||[]));

  function careerBatRows(){
    const map=new Map((historicalCareerBat||[]).map(r=>[r.Player_ID,{...r}]));
    for(const l of modernBat){
      const h=map.get(l.Player_ID)||{Player_ID:l.Player_ID,Name:l.Name,Retired:l.Retired,Class_Year:l.Class_Year};
      const out={...h,Team:l.Team||h.Team,Team_ID:l.Team_ID||h.Team_ID,Name:l.Name||h.Name,Class_Year:l.Class_Year||h.Class_Year,Retired:l.Retired??h.Retired};
      for(const k of ['PAs','ABs','Runs','Hits','Singles','Doubles','Triples','HRs','RBI','BB','Ks','GP'])out[k]=n(h[k])+n(l[k]);
      const tb=n(out.Singles)+2*n(out.Doubles)+3*n(out.Triples)+4*n(out.HRs);
      const ab=n(out.ABs),pa=n(out.PAs),hits=n(out.Hits),bb=n(out.BB);
      out.BA=ab?(hits/ab).toFixed(3):'0.000';
      out.OBP=(pa||ab+bb)?((hits+bb)/(pa||ab+bb)).toFixed(3):'0.000';
      out.SLG=ab?(tb/ab).toFixed(3):'0.000';
      out.OPS=(n(out.OBP)+n(out.SLG)).toFixed(3);
      map.set(l.Player_ID,out);
    }
    return [...map.values()];
  }

  function careerPitRows(){
    const map=new Map((historicalCareerPit||[]).map(r=>[r.Player_ID,{...r,_outs:ipToOuts(r.IP)}]));
    for(const l of modernPit){
      const h=map.get(l.Player_ID)||{Player_ID:l.Player_ID,Name:l.Name,Retired:l.Retired,Class_Year:l.Class_Year,_outs:0};
      const out={...h,Team:l.Team||h.Team,Team_ID:l.Team_ID||h.Team_ID,Name:l.Name||h.Name,Class_Year:l.Class_Year||h.Class_Year,Retired:l.Retired??h.Retired};
      for(const k of ['Apps','Starts','W','L','S','BF','ER','Walks','Hits','Ks'])out[k]=n(h[k])+n(l[k]);
      // Older cumulative pitching did not reliably track GP, runs allowed, HR allowed or WP.
      // Preserve those as unknown for players with historical innings instead of silently treating missing history as zero.
      const historicalOuts=n(h._outs);
      for(const k of ['GP','Runs','HRs','WP']){
        const historicalKnown=h[k]!==undefined&&h[k]!==null&&h[k]!=='';
        out[k]=(historicalOuts>0&&!historicalKnown)?null:n(h[k])+n(l[k]);
      }
      out._outs=historicalOuts+n(l.Outs);
      out.Outs=out._outs;
      out.IP=outsToIp(out._outs);
      const innings=out._outs/3;
      out.ERA=out._outs?((n(out.ER)*3)/innings).toFixed(2):null;
      out.WHIP=out._outs?((n(out.Walks)+n(out.Hits))/innings).toFixed(2):null;
      out.FIP=(out._outs&&out.HRs!==null&&out.HRs!==undefined)?((13*n(out.HRs)+3*n(out.Walks)-2*n(out.Ks))/out._outs).toFixed(3):null;
      map.set(l.Player_ID,out);
    }
    return [...map.values()];
  }

  const priorSource=sourceRows;
  const priorWar=typeof warForScope==='function'?warForScope:null;

  if(priorWar&&typeof seasonWarMap==='function'){
    warForScope=function(){
      if(document.getElementById('scopeSel')?.value!=='career')return priorWar();

      const total=new Map();
      const years=new Set();
      for(const r of (ND_DATA?.battingSeasons||[]))if(Number(r.Season)<=2025)years.add(String(r.Season));
      for(const r of (ND_DATA?.pitchingSeasons||[]))if(Number(r.Season)<=2025)years.add(String(r.Season));

      for(const y of [...years].sort((a,b)=>Number(a)-Number(b))){
        addWarInto(total,seasonWarMap(
          (ND_DATA?.battingSeasons||[]).filter(r=>String(r.Season)===y),
          (ND_DATA?.pitchingSeasons||[]).filter(r=>String(r.Season)===y)
        ));
      }
      if(typeof PLAYOFF_BAT!=='undefined'&&typeof PLAYOFF_PIT!=='undefined')addWarInto(total,seasonWarMap(PLAYOFF_BAT||[],PLAYOFF_PIT||[]));

      const modernKeys=[...modern.cache.keys()].sort((a,b)=>{
        const ay=Number(a.split('-').pop()),by=Number(b.split('-').pop());
        if(ay!==by)return ay-by;
        return a.startsWith('regular-')?-1:1;
      });
      for(const key of modernKeys){
        const d=modern.cache.get(key).data;
        addWarInto(total,seasonWarMap(d.batting||[],d.pitching||[]));
      }
      return total;
    };
  }

  sourceRows=function(){
    if(document.getElementById('scopeSel')?.value!=='career')return priorSource();

    let rows=(mode==='bat'?careerBatRows():careerPitRows());
    rows=rows.filter(typeof publicVisibleStatRow==='function'?publicVisibleStatRow:()=>true);
    if(typeof attachWar==='function')rows=attachWar(rows);

    if(mode==='bat'){
      rows=rows.map(r=>{
        const den=n(r.ABs)-n(r.Ks)-n(r.HRs);
        return {...r,BABIP:den>0?(n(r.Hits)-n(r.HRs))/den:null};
      });
    }else{
      rows=rows.map(r=>{
        const outs=r.Outs!==undefined?n(r.Outs):ipToOuts(r.IP);
        const hasHr=r.HRs!==undefined&&r.HRs!==null&&r.HRs!=='';
        return {...r,FIP:outs>0&&hasHr?(13*n(r.HRs)+3*n(r.Walks)-2*n(r.Ks))/outs:null};
      });
    }
    return rows;
  };

  const hint=document.getElementById('qualifierHint');
  if(hint&&!document.getElementById('careerModernNote')){
    const note=document.createElement('div');
    note.id='careerModernNote';
    note.className='qualifier-hint';
    note.textContent='Career totals include historical career through 2025 plus every exact D1 regular-season and playoff statistic from 2026 onward.';
    hint.insertAdjacentElement('afterend',note);
  }

  if(document.getElementById('scopeSel')?.value==='career')render();
}

async function initPlayers(){
  if(window.__ND_CAREER_MODERN_PLAYERS)return;
  window.__ND_CAREER_MODERN_PLAYERS=true;

  if(typeof batById==='undefined'||typeof pitById==='undefined'||typeof mergeLiveBatCareer!=='function'||typeof mergeLivePitCareer!=='function')return;

  let modern;
  try{modern=await loadModern()}
  catch(err){console.error('Modern player career stats failed to load',err);return}

  // /players/ already merges 2026 regular season from /api/public/league.
  // Add every modern playoff season, plus regular seasons after 2026.
  const additions=[...modern.cache.values()].filter(x=>x.phase==='playoffs'||x.year>2026);

  for(const entry of additions){
    const {year,phase,data}=entry;
    for(const l of (data.batting||[])){
      batById[l.Player_ID]=mergeLiveBatCareer(batById[l.Player_ID],l);
      if(phase==='regular'&&year>2026&&typeof batSeasonsById!=='undefined'){
        const arr=(batSeasonsById[l.Player_ID]??=[]);
        if(!arr.some(x=>String(x.Season)===String(year)))arr.push({...l,Season:String(year)});
      }
    }
    for(const l of (data.pitching||[])){
      pitById[l.Player_ID]=mergeLivePitCareer(pitById[l.Player_ID],l);
      if(phase==='regular'&&year>2026&&typeof pitSeasonsById!=='undefined'){
        const arr=(pitSeasonsById[l.Player_ID]??=[]);
        if(!arr.some(x=>String(x.Season)===String(year)))arr.push({...l,Season:String(year)});
      }
    }

    if(phase==='regular'&&year>2026&&typeof rostersById!=='undefined'){
      for(const r of (data.participants||[])){
        const arr=(rostersById[r.player_id]??=[]);
        if(!arr.some(x=>String(x.Season)===String(year)&&String(x.Team||'')===String(r.team_name||''))){
          arr.push({Player_ID:r.player_id,Season:String(year),Team:r.team_name});
        }
      }
    }
  }

  if(typeof populateFilters==='function')populateFilters();
  if(typeof renderPlayers==='function')renderPlayers();

  const count=document.getElementById('playerCount');
  if(count&&!count.dataset.modernCareer){
    count.dataset.modernCareer='1';
    count.textContent=count.textContent.replace(/\s·\scareer includes postseason$/,'')+' · career includes postseason';
  }
}

if(pathname==='/stats')initStats();
else if(pathname==='/players')initPlayers();
})();
