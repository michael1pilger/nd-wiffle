(function(){
  const SKIP_SELECTOR='.sortable,.best-table,.pool-table,[data-no-auto-sort]';
  const state=new WeakMap();
  const numRe=/^[+\-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
  function cleanText(cell){return (cell?.innerText||cell?.textContent||'').replace(/\s+/g,' ').trim();}
  function value(cell){
    const t=cleanText(cell).replace(/,/g,'').replace(/%$/,'');
    if(!t||t==='—'||t==='-') return {type:'empty',v:null};
    if(numRe.test(t)) return {type:'num',v:Number(t)};
    const m=t.match(/^([+\-]?\d+(?:\.\d+)?)\b/);
    if(m) return {type:'num',v:Number(m[1])};
    return {type:'text',v:t.toLowerCase()};
  }
  function enhance(table){
    if(!table||table.matches(SKIP_SELECTOR)||table.dataset.autoSortReady==='1')return;
    const head=table.tHead?.rows?.[0];
    if(!head)return;
    table.dataset.autoSortReady='1';
    table.classList.add('auto-sort-table');
    [...head.cells].forEach((th,idx)=>{
      th.classList.add('auto-sort-head');
      th.tabIndex=0;
      th.setAttribute('role','button');
      th.setAttribute('aria-label',`${cleanText(th)}: sort column`);
      const doSort=()=>sortTable(table,idx,th);
      th.addEventListener('click',doSort);
      th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();doSort();}});
    });
  }
  function sortTable(table,idx,th){
    const tbody=table.tBodies?.[0]; if(!tbody)return;
    const rows=[...tbody.rows]; if(rows.length<2)return;
    const prev=state.get(table)||{};
    let dir;
    if(prev.idx===idx)dir=-prev.dir;
    else{
      const vals=rows.map(r=>value(r.cells[idx])).filter(x=>x.type!=='empty');
      const mostlyNum=vals.length&&vals.filter(x=>x.type==='num').length>=vals.length*.7;
      const label=cleanText(th).toLowerCase();
      dir=(label==='rk'||label==='#'||label.includes('rank')||!mostlyNum)?1:-1;
    }
    rows.forEach((r,i)=>r.dataset.sortOriginal=i);
    rows.sort((a,b)=>{
      const av=value(a.cells[idx]),bv=value(b.cells[idx]);
      if(av.type==='empty'&&bv.type!=='empty')return 1;
      if(bv.type==='empty'&&av.type!=='empty')return -1;
      let cmp=0;
      if(av.type==='num'&&bv.type==='num')cmp=av.v-bv.v;
      else cmp=String(av.v??'').localeCompare(String(bv.v??''),undefined,{numeric:true,sensitivity:'base'});
      return dir*cmp || Number(a.dataset.sortOriginal)-Number(b.dataset.sortOriginal);
    });
    rows.forEach(r=>tbody.appendChild(r));
    state.set(table,{idx,dir});
    [...table.tHead.rows[0].cells].forEach(h=>{h.classList.remove('sort-asc','sort-desc');h.removeAttribute('aria-sort');});
    th.classList.add(dir===1?'sort-asc':'sort-desc');
    th.setAttribute('aria-sort',dir===1?'ascending':'descending');
  }

  // Fixed cloned headers are used instead of CSS sticky cells. This works even when
  // a table sits inside a horizontally scrollable .tablewrap.
  const clones=new Map();
  function ensureClone(table){
    if(table.classList.contains('floating-table-head')||clones.has(table)||!table.tHead)return;
    const clone=document.createElement('table');
    clone.className=(table.className||'')+' floating-table-head';
    clone.dataset.noAutoSort='1';
    clone.setAttribute('aria-hidden','true');
    const thead=table.tHead.cloneNode(true);
    clone.appendChild(thead);
    if(!table.matches(SKIP_SELECTOR)){
      [...thead.rows[0].cells].forEach((cell,i)=>{
        cell.style.pointerEvents='auto';
        cell.addEventListener('click',()=>table.tHead?.rows?.[0]?.cells?.[i]?.click());
      });
    }
    document.body.appendChild(clone);
    clones.set(table,clone);
  }
  function syncClone(table,clone){
    const rect=table.getBoundingClientRect();
    const sitebar=document.querySelector('.sitebar');
    const top=sitebar?Math.max(0,sitebar.getBoundingClientRect().bottom):0;
    const head=table.tHead;
    if(!head){clone.style.display='none';return;}
    const h=head.getBoundingClientRect().height;
    const show=rect.top<top && rect.bottom>top+h;
    if(!show){clone.style.display='none';return;}
    clone.style.display='table';
    clone.style.top=`${top}px`;
    clone.style.left=`${rect.left}px`;
    clone.style.width=`${rect.width}px`;
    const src=[...head.rows[0].cells],dst=[...clone.tHead.rows[0].cells];
    src.forEach((cell,i)=>{if(dst[i])dst[i].style.width=`${cell.getBoundingClientRect().width}px`;});
  }
  let ticking=false;
  function updateFloating(){
    ticking=false;
    document.querySelectorAll('table:not(.floating-table-head)').forEach(table=>{
      if(!table.tHead)return;
      ensureClone(table);syncClone(table,clones.get(table));
    });
  }
  function requestUpdate(){if(!ticking){ticking=true;requestAnimationFrame(updateFloating);}}
  function scan(){document.querySelectorAll('table').forEach(enhance);requestUpdate();}
  const mo=new MutationObserver(scan);
  function init(){
    scan();
    mo.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('scroll',requestUpdate,{passive:true});
    window.addEventListener('resize',requestUpdate);
    document.addEventListener('scroll',requestUpdate,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
