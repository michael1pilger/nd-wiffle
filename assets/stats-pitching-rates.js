(()=>{
'use strict';
if(window.__ND_PITCHING_RATES_V171)return;
window.__ND_PITCHING_RATES_V171=true;

const asNum=v=>{
  if(v===null||v===undefined||v==='')return null;
  const x=Number(v);
  return Number.isFinite(x)?x:null;
};
const count=v=>{
  const x=Number(v);
  return Number.isFinite(x)?x:0;
};

function baaFor(r){
  const stored=asNum(r?.BAA);
  if(stored!==null)return stored;
  const bf=count(r?.BF),bb=count(r?.Walks ?? r?.BB),hits=count(r?.Hits);
  const abAgainst=bf-bb;
  return abAgainst>0?hits/abAgainst:null;
}

function obpaFor(r){
  for(const key of ['OBPA','OBPa','OOBP']){
    const stored=asNum(r?.[key]);
    if(stored!==null)return stored;
  }
  const bf=count(r?.BF),bb=count(r?.Walks ?? r?.BB),hits=count(r?.Hits);
  return bf>0?(hits+bb)/bf:null;
}

const priorColumns=window.columns;
window.columns=function(){
  const cols=priorColumns();
  if(window.mode==='pit'&&window.viewMode==='full'){
    return cols.map(c=>c==='HRs'?'BAA':c==='WP'?'OBPA':c);
  }
  return cols;
};

const priorDisplayVal=window.displayVal;
window.displayVal=function(c,v,r){
  if(c==='BAA'||c==='OBPA'){
    const x=c==='BAA'?baaFor(r):obpaFor(r);
    return x===null?'—':x.toFixed(3);
  }
  return priorDisplayVal(c,v,r);
};

const priorLabel=window.label;
window.label=function(c){
  if(c==='BAA')return 'BAA';
  if(c==='OBPA')return 'OBPA';
  return priorLabel(c);
};

const priorSortRows=window.sortRows;
window.sortRows=function(rows){
  if(window.mode==='pit'&&(window.sortKey==='BAA'||window.sortKey==='OBPA')){
    const metric=window.sortKey==='BAA'?baaFor:obpaFor;
    return [...rows].sort((a,b)=>{
      const av=metric(a),bv=metric(b);
      if(av===null&&bv===null)return 0;
      if(av===null)return 1;
      if(bv===null)return -1;
      return window.sortDir*(av-bv);
    });
  }
  return priorSortRows(rows);
};

window.ND_PITCHING_RATE_METRICS={baaFor,obpaFor};
})();
