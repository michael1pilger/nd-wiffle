/* ND Wiffle Daily Grid v163
   Extends the existing grid/index.html without replacing its embedded history/scoring engine. */
(() => {
  "use strict";
  const D = window.NDGridDaily = {
    launchDate:"2026-10-30", currentDate:null, date:null, grid:null, isToday:false,
    authenticated:false, user:null, userResult:null, scheduleReady:false, baseReady:false,
    loading:false, completionHandled:false, forfeited:false, officialScore:null
  };

  const baseFinish = finish;
  const baseGuess = guess;
  const baseNormalized = normalizedGridScore;
  const baseReset = reset;
  // This extension can be loaded by assets/hof.js after the original grid has already initialized.
  // Detect that case so the scheduled daily board is applied immediately instead of waiting for another reset().
  try { D.baseReady = !!(state && Array.isArray(state.rows) && Array.isArray(state.cols)); } catch {}
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const fmtDate = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
  const isoDateUTC = d => d.toISOString().slice(0,10);
  const dateAdd = (iso,days) => {const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return isoDateUTC(d)};

  function api(url,opts={}){
    return fetch(url,{cache:"no-store",...opts}).then(async r=>{
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.ok===false)throw new Error([j.error,j.detail].filter(Boolean).join(" — ")||`HTTP ${r.status}`);
      return j;
    });
  }

  function progressKey(){return `ndw-daily-grid:${D.date}`}
  function serializeAnswers(){
    if(!state?.rows||!state?.cols)return[];
    const out=[];
    for(const r of state.rows)for(const c of state.cols){
      const x=state.cells?.[key(r,c)];
      if(x)out.push({row:r,col:c,playerId:x.playerId,playerName:x.playerName,correct:!!x.correct,rarity:Number(x.rarity||0),rank:x.rank??null,totalValid:Number(x.totalValid||0)});
    }
    return out;
  }
  function saveProgress(){
    if(!D.date||D.userResult)return;
    try{localStorage.setItem(progressKey(),JSON.stringify({date:D.date,rows:state.rows,cols:state.cols,guesses:state.guesses,correct:state.correct,rarityPoints:state.rarityPoints,rarityPicks:state.rarityPicks,cells:state.cells,forfeited:D.forfeited}))}catch{}
  }
  function readProgress(){
    try{const x=JSON.parse(localStorage.getItem(progressKey())||"null");if(x&&JSON.stringify(x.rows)===JSON.stringify(D.grid.rows)&&JSON.stringify(x.cols)===JSON.stringify(D.grid.cols))return x}catch{}
    return null;
  }

  function installUI(){
    if($("dailyGridBar"))return;
    const bar=document.createElement("div");bar.id="dailyGridBar";bar.className="daily-grid-bar";
    bar.innerHTML=`<div class="daily-grid-meta"><div><div class="daily-grid-kicker">Daily Grid</div><div class="daily-grid-date" id="dailyGridDate">Loading…</div></div><div class="daily-grid-user" id="dailyGridUser"></div></div><div class="daily-grid-actions"><button id="dailyTodayBtn">Today</button><button id="dailyArchiveBtn">Archive</button><button id="dailyLeaderboardBtn">Leaderboard</button></div>`;
    const stats=document.querySelector(".stats");stats?.parentNode?.insertBefore(bar,stats);

    document.body.insertAdjacentHTML("beforeend",`<div class="daily-overlay" id="dailyArchiveOverlay"><div class="daily-dialog"><div class="daily-dialog-head"><div><h2>Grid Archive</h2><div class="sub">Past grids stay playable, but archived scores never enter the official leaderboard.</div></div><button class="daily-close" data-close="dailyArchiveOverlay">Close</button></div><div class="daily-picker"><input id="dailyArchiveDate" type="date"><button id="dailyArchiveGo">Play date</button></div><div class="daily-archive-grid" id="dailyArchiveList"></div><div class="daily-status" id="dailyArchiveStatus"></div></div></div>`);
    document.body.insertAdjacentHTML("beforeend",`<div class="daily-overlay" id="dailyLeaderboardOverlay"><div class="daily-dialog"><div class="daily-dialog-head"><div><h2 id="dailyLeaderboardTitle">Daily Leaderboard</h2><div class="sub" id="dailyLeaderboardSub"></div></div><button class="daily-close" data-close="dailyLeaderboardOverlay">Close</button></div><div id="dailyLeaderboardBody"></div><div class="daily-status" id="dailyLeaderboardStatus"></div></div></div>`);

    $("dailyTodayBtn").onclick=()=>loadGrid(null);
    $("dailyArchiveBtn").onclick=openArchive;
    $("dailyLeaderboardBtn").onclick=()=>openLeaderboard();
    $("dailyArchiveGo").onclick=()=>{const v=$("dailyArchiveDate").value;if(v)loadGrid(v).then(()=>closeOverlay("dailyArchiveOverlay"))};
    document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeOverlay(b.dataset.close));
    document.querySelectorAll(".daily-overlay").forEach(o=>o.addEventListener("click",e=>{if(e.target===o)o.classList.remove("open")}));

    replaceExistingButtons();
  }

  function replaceExistingButtons(){
    const oldNew=$("newGridBtn");
    if(oldNew){const b=oldNew.cloneNode(true);oldNew.replaceWith(b);b.id="newGridBtn";b.textContent="Archive";b.classList.remove("primary");b.onclick=openArchive;}
    const oldReveal=$("revealBtn");
    if(oldReveal){const b=oldReveal.cloneNode(true);oldReveal.replaceWith(b);b.id="revealBtn";b.textContent="Give Up / Reveal";b.onclick=()=>{if(!state||state.guesses>=9)return;if(!confirm("Reveal the answers? This ends this attempt and cannot create an official leaderboard score."))return;D.forfeited=true;state.guesses=9;saveProgress();baseFinish(true);decorateEnd({message:"This attempt was forfeited and is not leaderboard-eligible."});};}
  }

  function closeOverlay(id){$(id)?.classList.remove("open")}
  function updateHeader(){
    if(!D.date)return;
    $("dailyGridDate").textContent=`${fmtDate(D.date)}${D.isToday?" · Today's grid":" · Archive"}`;
    $("dailyGridUser").innerHTML=D.authenticated?`Signed in as <strong>${esc(D.user?.account_name||D.user?.player_name||"account")}</strong>`:`<a href="/account/" style="color:var(--gold2)">Log in</a> before finishing today's grid to enter the leaderboard.`;
    if($("gridStat"))$("gridStat").textContent=fmtDate(D.date).replace(/,.*$/,'');
    if($("dailyTodayBtn"))$("dailyTodayBtn").style.display=D.isToday?"none":"inline-block";
  }

  function setStateFromResult(result){
    const cells={};let rarityPoints=0;
    for(const a of result.answers||[]){
      cells[key(a.row,a.col)]={playerId:a.playerId,playerName:a.playerName,correct:!!a.correct,rarity:Number(a.rarity||0),rank:a.rank??null,totalValid:Number(a.totalValid||0)};
      if(a.correct)rarityPoints+=Number(a.rarity||0);
    }
    state={rows:[...D.grid.rows],cols:[...D.grid.cols],guesses:9,correct:Number(result.correct_count||0),rarityPoints,rarityPicks:Number(result.correct_count||0),cells,officialStoredScore:Number(result.score)};
    D.officialScore=Number(result.score);D.completionHandled=true;D.forfeited=false;
  }

  function applyScheduledState(){
    if(!D.scheduleReady||!D.baseReady||!D.grid)return;
    D.completionHandled=false;D.forfeited=false;D.officialScore=null;
    if(D.userResult){
      setStateFromResult(D.userResult);activeCell=null;render();$("endPanel").classList.remove("show");baseFinish(false);decorateEnd({message:`Official result saved ${D.userResult.correct_count}/9 · ${D.userResult.score}/1000.`,official:true});
      return;
    }
    const p=readProgress();
    if(p){state={rows:[...D.grid.rows],cols:[...D.grid.cols],guesses:Number(p.guesses||0),correct:Number(p.correct||0),rarityPoints:Number(p.rarityPoints||0),rarityPicks:Number(p.rarityPicks||0),cells:p.cells||{}};D.forfeited=!!p.forfeited;}
    else state={rows:[...D.grid.rows],cols:[...D.grid.cols],guesses:0,correct:0,rarityPoints:0,rarityPicks:0,cells:{}};
    activeCell=null;render();$("endPanel").classList.remove("show");
    if(D.forfeited){state.guesses=9;render();baseFinish(true);decorateEnd({message:"This attempt was forfeited. You can view the historical leaderboard, but this score will not be submitted."});}
    updateHeader();
  }

  reset = function(){
    if(!D.baseReady){D.baseReady=true;if(D.scheduleReady)applyScheduledState();return;}
    if(D.scheduleReady)applyScheduledState();else baseReset(false);
  };
  normalizedGridScore = function(){return Number.isInteger(state?.officialStoredScore)?state.officialStoredScore:baseNormalized()};
  guess = function(p){baseGuess(p);setTimeout(saveProgress,15)};
  finish = function(force=false){
    if(force){baseFinish(true);return;}
    baseFinish(false);saveProgress();
    if(D.completionHandled||D.forfeited||state.guesses<9)return;
    D.completionHandled=true;submitCompletion();
  };

  async function loadGrid(date){
    if(D.loading)return;D.loading=true;
    try{
      const qs=date?`?date=${encodeURIComponent(date)}`:"";
      const j=await api(`/api/grid/daily${qs}`);
      D.currentDate=j.current_date;D.launchDate=j.launch_date||D.launchDate;D.date=j.grid.grid_date;D.grid=j.grid;D.isToday=!!j.is_today;D.authenticated=!!j.authenticated;D.user=j.user;D.userResult=j.user_result;D.scheduleReady=true;
      updateHeader();renderArchiveList();
      if(D.baseReady)applyScheduledState();
    }catch(e){
      D.scheduleReady=false;
      const bar=$("dailyGridDate");if(bar)bar.textContent="Daily grid unavailable";
      const user=$("dailyGridUser");if(user)user.innerHTML=`<span style="color:#ee8794">${esc(e.message)}</span>`;
      console.error(e);
    }finally{D.loading=false}
  }

  async function submitCompletion(){
    const score=normalizedGridScore(),answers=serializeAnswers();
    decorateEnd({message:"Checking leaderboard eligibility…"});
    try{
      const j=await api("/api/grid/submit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({grid_date:D.date,correct_count:state.correct,score,answers})});
      if(j.official&&j.result){
        D.userResult={correct_count:j.result.correct_count,score:j.result.score,completed_at:j.result.completed_at,answers};D.officialScore=j.result.score;
        try{localStorage.removeItem(progressKey())}catch{}
        decorateEnd({official:true,message:`Official leaderboard result: #${j.result.rank} · ${j.result.correct_count}/9 · ${j.result.score}/1000.`});
      }else if(j.reason==="archive_closed"){
        const h=j.hypothetical;decorateEnd({message:h?`${h.tied?"Would tie":"Would rank"} #${h.rank} on the original leaderboard (${h.field_size} official entr${h.field_size===1?"y":"ies"}). Archived scores are not added.`:"Archived scores are not added to the leaderboard."});
      }else if(j.reason==="login_required"){
        const h=j.hypothetical;decorateEnd({message:`Not submitted: you were not logged in when the grid was completed.${h?` This score ${h.tied?"would tie":"would rank"} #${h.rank}.`:""} <a href="/account/" style="color:var(--gold2)">Log in for future daily grids.</a>`});
      }
    }catch(e){decorateEnd({message:`Leaderboard submission failed: ${esc(e.message)}`,error:true})}
  }

  function decorateEnd({message,official=false,error=false}={}){
    const panel=$("endPanel");if(!panel)return;
    let box=$("dailyResultCallout");if(!box){box=document.createElement("div");box.id="dailyResultCallout";box.className="daily-result-callout";$("endText")?.insertAdjacentElement("afterend",box)}
    box.innerHTML=`${official?"<strong>Official leaderboard entry</strong><br>":""}${message||""}${D.date?`<br><button id="dailyEndLeaderboard" class="btn" style="margin-top:8px">View ${D.isToday?"Today's":"Original"} Leaderboard</button>`:""}`;
    box.style.borderColor=error?"rgba(184,75,90,.7)":"";
    setTimeout(()=>{const b=$("dailyEndLeaderboard");if(b)b.onclick=()=>openLeaderboard()},0);
  }

  async function openLeaderboard(){
    if(!D.date)return;
    $("dailyLeaderboardOverlay").classList.add("open");$("dailyLeaderboardTitle").textContent=`Leaderboard · ${fmtDate(D.date)}`;
    $("dailyLeaderboardSub").textContent=D.isToday?"Official results submitted before the Eastern-time daily rollover.":"Historical leaderboard is closed; archive replays do not alter it.";
    $("dailyLeaderboardBody").innerHTML='<div class="daily-empty">Loading…</div>';$("dailyLeaderboardStatus").textContent="";
    try{
      const j=await api(`/api/grid/leaderboard?date=${encodeURIComponent(D.date)}`),rows=j.entries||[];
      $("dailyLeaderboardBody").innerHTML=rows.length?`<table class="daily-leaderboard"><thead><tr><th>Rank</th><th>Account</th><th class="num">Correct</th><th class="num">Score</th><th>Completed</th></tr></thead><tbody>${rows.map(x=>`<tr class="${j.my_result?.user_id===x.user_id?"me":""}"><td><strong>#${x.rank}</strong></td><td>${esc(x.display_name)}</td><td class="num">${x.correct_count}/9</td><td class="num"><strong>${x.score}</strong></td><td>${new Date(x.completed_at+(/Z$/.test(x.completed_at)?"":"Z")).toLocaleString()}</td></tr>`).join("")}</tbody></table>`:'<div class="daily-empty">No official scores yet.</div>';
      if(!D.isToday&&state?.guesses>=9&&!D.forfeited&&!D.userResult){
        const score=normalizedGridScore(),h=hypotheticalFromEntries(rows,state.correct,score);$("dailyLeaderboardStatus").innerHTML=`Your archive replay: <strong>${state.correct}/9 · ${score}</strong> — ${h.tied?"tied for":"would rank"} <strong>#${h.rank}</strong>. It is not added to this leaderboard.`;
      }
    }catch(e){$("dailyLeaderboardBody").innerHTML='<div class="daily-empty">Leaderboard unavailable.</div>';$("dailyLeaderboardStatus").textContent=e.message;$("dailyLeaderboardStatus").className="daily-status err";}
  }
  function hypotheticalFromEntries(rows,correct,score){const better=rows.filter(x=>x.correct_count>correct||(x.correct_count===correct&&x.score>score)).length,ties=rows.filter(x=>x.correct_count===correct&&x.score===score).length;return{rank:better+1,tied:ties>0}}

  function openArchive(){renderArchiveList();$("dailyArchiveOverlay").classList.add("open")}
  function renderArchiveList(){
    if(!D.currentDate)return;
    const input=$("dailyArchiveDate");if(input){input.min=D.launchDate;input.max=D.currentDate;input.value=D.date||D.currentDate}
    const list=$("dailyArchiveList");if(!list)return;const days=[];let x=D.currentDate;
    for(let i=0;i<30&&x>=D.launchDate;i++,x=dateAdd(x,-1))days.push(x);
    list.innerHTML=days.map(x=>`<button class="daily-archive-btn ${x===D.date?"active":""}" data-date="${x}"><strong>${x===D.currentDate?"Today":fmtDate(x)}</strong><small>${x===D.currentDate?"Current leaderboard":"Playable archive"}</small></button>`).join("");
    list.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>loadGrid(b.dataset.date).then(()=>closeOverlay("dailyArchiveOverlay")));
    $("dailyArchiveStatus").textContent=days.length?"Showing the most recent 30 daily grids. Use the date picker for older grids.":"No archived grids yet.";
  }

  function easternDateClient(d=new Date()){
    const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d),m=Object.fromEntries(p.map(x=>[x.type,x.value]));return`${m.year}-${m.month}-${m.day}`;
  }
  function msToNextEasternDate(){
    const now=Date.now(),today=easternDateClient(new Date(now));let lo=now,hi=now+30*60*60*1000;
    while(easternDateClient(new Date(hi))===today)hi+=6*60*60*1000;
    while(hi-lo>1000){const mid=Math.floor((lo+hi)/2);if(easternDateClient(new Date(mid))===today)lo=mid;else hi=mid;}
    return Math.max(1000,hi-now+250);
  }
  function scheduleRollover(){setTimeout(async()=>{const wasToday=D.isToday;await loadGrid(wasToday?null:D.date);scheduleRollover()},msToNextEasternDate())}

  installUI();
  loadGrid(null);
  scheduleRollover();
})();
