(()=>{
'use strict';
if(window.__ND_PITCHING_RATES_V172)return;
window.__ND_PITCHING_RATES_V172=true;

const asNumber=v=>{
  if(v===null||v===undefined||v==='')return null;
  const x=Number(v);
  return Number.isFinite(x)?x:null;
};
const count=v=>{
  const x=Number(v);
  return Number.isFinite(x)?x:0;
};

function baaFor(r){
  const stored=asNumber(r?.BAA);
  if(stored!==null)return stored;

  const bf=count(r?.BF);
  const bb=count(r?.Walks ?? r?.BB);
  const hits=count(r?.Hits);
  const abAgainst=bf-bb;

  return abAgainst>0 ? hits/abAgainst : null;
}

function obpaFor(r){
  for(const key of ['OBPA','OBPa','OOBP']){
    const stored=asNumber(r?.[key]);
    if(stored!==null)return stored;
  }

  const bf=count(r?.BF);
  const bb=count(r?.Walks ?? r?.BB);
  const hits=count(r?.Hits);

  return bf>0 ? (hits+bb)/bf : null;
}

/*
  Do not inspect window.mode/window.viewMode here.
  stats/index.html declares those with `let`, so they are global lexical
  bindings rather than window properties.

  Instead identify Full Pitching by the columns the native page returns.
*/
const nativeColumns=window.columns;
window.columns=function(){
  const cols=nativeColumns();

  const isFullPitching=
    cols.includes('Apps') &&
    cols.includes('Starts') &&
    cols.includes('HRs') &&
    cols.includes('WP');

  if(!isFullPitching)return cols;

  const out=[];
  for(const c of cols){
    if(c==='GP')continue;
    if(c==='HRs')out.push('BAA');
    else if(c==='WP')out.push('OBPA');
    else out.push(c);
  }
  return out;
};

const nativeDisplayVal=window.displayVal;
window.displayVal=function(c,v,r){
  if(c==='BAA'){
    const x=baaFor(r);
    return x===null?'—':x.toFixed(3);
  }
  if(c==='OBPA'){
    const x=obpaFor(r);
    return x===null?'—':x.toFixed(3);
  }
  return nativeDisplayVal(c,v,r);
};

const nativeLabel=window.label;
window.label=function(c){
  if(c==='BAA')return 'BAA';
  if(c==='OBPA')return 'OBPA';
  return nativeLabel(c);
};

/*
  sortKey is also a global lexical binding. Referencing it directly is valid
  from a later classic script; window.sortKey is not.
*/
const nativeSortRows=window.sortRows;
window.sortRows=function(rows){
  if(typeof sortKey!=='undefined' && (sortKey==='BAA'||sortKey==='OBPA')){
    const metric=sortKey==='BAA'?baaFor:obpaFor;
    return [...rows].sort((a,b)=>{
      const av=metric(a),bv=metric(b);
      if(av===null&&bv===null)return 0;
      if(av===null)return 1;
      if(bv===null)return -1;
      return sortDir*(av-bv);
    });
  }
  return nativeSortRows(rows);
};

window.ND_PITCHING_RATE_METRICS_V172={baaFor,obpaFor};
})();
