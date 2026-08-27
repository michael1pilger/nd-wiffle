
export const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export const pairKey=(a,b)=>[a,b].sort().join("__");
export const clean=v=>String(v??"").trim();
export const num=v=>Number(v||0);
export const roundMult=v=>Math.max(1,Math.min(6,Math.round(v*20)/20)); // nearest .05x

export function ndNow(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Indiana/Indianapolis",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
 const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return {date:`${o.year}-${o.month}-${o.day}`,time:`${o.hour}:${o.minute}`};
}
export function isLocked(date,lockTime,status){
 if(status==="locked"||status==="final")return true;
 if(!lockTime)return false;
 const now=ndNow();
 return now.date>date||(now.date===date&&now.time>=lockTime);
}
export async function ensureSlate(DB,date,actor="system"){
 const sched=await DB.prepare("SELECT MIN(series_time) AS lock_time FROM scheduled_series WHERE season=2026 AND series_date=?").bind(date).first();
 const lock=sched?.lock_time||null;
 await DB.prepare(`
  INSERT INTO fantasy_slates(slate_date,season,lock_time,status,updated_by)
  VALUES(?,2026,?,'open',?)
  ON CONFLICT(slate_date) DO UPDATE SET lock_time=excluded.lock_time,updated_at=CURRENT_TIMESTAMP
 `).bind(date,lock,actor).run();
 return DB.prepare("SELECT * FROM fantasy_slates WHERE slate_date=?").bind(date).first();
}
function normalizeMean(values,target,fixedMask){
 const out=[...values];
 const adjustable=out.map((_,i)=>i).filter(i=>!fixedMask[i]);
 if(!adjustable.length)return out.map(roundMult);
 for(let iter=0;iter<8;iter++){
   const mean=out.reduce((a,b)=>a+b,0)/out.length;
   const delta=target-mean;
   if(Math.abs(delta)<.002)break;
   const movable=adjustable.filter(i=>(delta>0&&out[i]<6)||(delta<0&&out[i]>1));
   if(!movable.length)break;
   const step=delta*out.length/movable.length;
   for(const i of movable)out[i]=Math.max(1,Math.min(6,out[i]+step));
 }
 return out.map(roundMult);
}
export function assignMultipliers(rows,kind){
 // Higher expected production = lower multiplier.
 // Experienced distribution is symmetric around 2.25: 1.00x best to 3.50x worst.
 // True rookies have the user's fixed 3.00x starting multiplier.
 const expectedKey=kind==="bat"?"bat_expected":"pit_expected";
 const rookieKey=kind==="bat"?"bat_rookie":"pit_rookie";
 const experienced=rows.filter(r=>!r[rookieKey]&&Number.isFinite(r[expectedKey])).sort((a,b)=>b[expectedKey]-a[expectedKey]);
 const raw=new Map();
 if(experienced.length===1)raw.set(experienced[0].player_id,2.25);
 experienced.forEach((r,i)=>{
   const q=experienced.length<=1?.5:i/(experienced.length-1);
   raw.set(r.player_id,1+(2.5*q)); // 1.00 to 3.50, centered at 2.25
 });
 const values=rows.map(r=>r[rookieKey]?3:(raw.get(r.player_id)??3));
 const fixed=rows.map(r=>!!r[rookieKey]);
 const normalized=normalizeMean(values,2.25,fixed);
 return new Map(rows.map((r,i)=>[r.player_id,normalized[i]]));
}
export async function buildSlate(DB,date){
 const slate=await ensureSlate(DB,date);
 const [schedRes,rosterRes,currentBat,currentPit,settingsRes]=await DB.batch([
  DB.prepare(`
   SELECT ss.*,ta.display_name AS team_a,tb.display_name AS team_b
   FROM scheduled_series ss JOIN teams ta ON ta.team_id=ss.team_a_id JOIN teams tb ON tb.team_id=ss.team_b_id
   WHERE ss.season=2026 AND ss.series_date=? ORDER BY COALESCE(ss.series_time,'23:59'),ta.display_name
  `).bind(date),
  DB.prepare(`
   SELECT DISTINCT tr.player_id,p.name,p.class_year,tr.team_id,t.display_name AS team_name,
          fb.batting_fp_per_game,fb.career_pa,fb.career_batting_gp,
          fb.pitching_fp_per_app,fb.career_pitching_apps,fb.career_pitching_outs
   FROM team_rosters tr JOIN players p ON p.player_id=tr.player_id JOIN teams t ON t.team_id=tr.team_id
   LEFT JOIN fantasy_player_baselines fb ON fb.player_id=tr.player_id
   WHERE tr.season=2026 AND p.retired=0 AND tr.team_id IN (
     SELECT team_a_id FROM scheduled_series WHERE season=2026 AND series_date=?
     UNION SELECT team_b_id FROM scheduled_series WHERE season=2026 AND series_date=?
   ) ORDER BY t.display_name,p.name
  `).bind(date,date),
  DB.prepare(`
   SELECT b.player_id,SUM(b.games_played) gp,SUM(b.pa) pa,
    SUM(b.singles+2*b.doubles+3*b.triples+4*b.hr+b.rbi+b.bb-b.so) fp
   FROM batting_series_stats b JOIN series s ON s.series_id=b.series_id
   WHERE s.season=2026 AND s.series_date<? GROUP BY b.player_id
  `).bind(date),
  DB.prepare(`
   SELECT ps.player_id,SUM(ps.appearances) apps,SUM(ps.outs_recorded) outs,
    SUM(ps.outs_recorded-2*ps.er+ps.strikeouts-ps.hits-ps.bb) fp
   FROM pitching_series_stats ps JOIN series s ON s.series_id=ps.series_id
   WHERE s.season=2026 AND s.series_date<? GROUP BY ps.player_id
  `).bind(date),
  DB.prepare("SELECT * FROM fantasy_player_settings WHERE slate_date=?").bind(date)
 ]);
 const sched=schedRes.results||[], roster=rosterRes.results||[];
 const bcur=new Map((currentBat.results||[]).map(r=>[r.player_id,r])),pcur=new Map((currentPit.results||[]).map(r=>[r.player_id,r]));
 const settings=new Map((settingsRes.results||[]).map(r=>[r.player_id,r]));
 const rows=roster.map(r=>{
   const b=bcur.get(r.player_id),p=pcur.get(r.player_id);
   const enoughBat=num(b?.pa)>=15;
   const enoughPit=num(p?.outs)>=9;
   const careerBat=r.batting_fp_per_game===null||r.batting_fp_per_game===undefined?null:Number(r.batting_fp_per_game);
   const careerPit=r.pitching_fp_per_app===null||r.pitching_fp_per_app===undefined?null:Number(r.pitching_fp_per_app);
   const batExpected=enoughBat&&num(b?.gp)>0?num(b.fp)/num(b.gp):careerBat;
   const pitExpected=enoughPit&&num(p?.apps)>0?num(p.fp)/num(p.apps):careerPit;
   const set=settings.get(r.player_id)||{};
   return {...r,
    bat_expected:Number.isFinite(batExpected)?batExpected:null,pit_expected:Number.isFinite(pitExpected)?pitExpected:null,
    bat_rookie:!enoughBat&&!Number.isFinite(careerBat),pit_rookie:!enoughPit&&!Number.isFinite(careerPit),
    batting_eligible:set.batting_eligible===undefined?1:num(set.batting_eligible),
    pitching_eligible:set.pitching_eligible===undefined?1:num(set.pitching_eligible),
    batting_multiplier_override:set.batting_multiplier_override,
    pitching_multiplier_override:set.pitching_multiplier_override
   };
 });
 const bm=assignMultipliers(rows,"bat"),pm=assignMultipliers(rows,"pit");
 const players=rows.map(r=>({
   player_id:r.player_id,name:r.name,class_year:r.class_year,team_id:r.team_id,team_name:r.team_name,
   batting_eligible:r.batting_eligible,pitching_eligible:r.pitching_eligible,
   batting_rookie:r.bat_rookie,pitching_rookie:r.pit_rookie,
   batting_multiplier:r.batting_multiplier_override!==null&&r.batting_multiplier_override!==undefined?roundMult(Number(r.batting_multiplier_override)):bm.get(r.player_id),
   pitching_multiplier:r.pitching_multiplier_override!==null&&r.pitching_multiplier_override!==undefined?roundMult(Number(r.pitching_multiplier_override)):pm.get(r.player_id)
 }));
 return {slate,scheduled:sched,players,locked:isLocked(date,slate?.lock_time,slate?.status)};
}
export async function scoreEntries(DB,date){
 const [entries,picks,bat,pit]=await DB.batch([
  DB.prepare("SELECT * FROM fantasy_entries WHERE slate_date=? ORDER BY submitted_at").bind(date),
  DB.prepare(`SELECT fp.*,p.name FROM fantasy_picks fp JOIN fantasy_entries fe ON fe.entry_id=fp.entry_id JOIN players p ON p.player_id=fp.player_id WHERE fe.slate_date=? ORDER BY fp.entry_id,fp.slot_type,fp.slot_number`).bind(date),
  DB.prepare(`SELECT b.player_id,SUM(b.singles+2*b.doubles+3*b.triples+4*b.hr+b.rbi+b.bb-b.so) fp FROM batting_series_stats b JOIN series s ON s.series_id=b.series_id WHERE s.season=2026 AND s.series_date=? GROUP BY b.player_id`).bind(date),
  DB.prepare(`SELECT ps.player_id,SUM(ps.outs_recorded-2*ps.er+ps.strikeouts-ps.hits-ps.bb) fp FROM pitching_series_stats ps JOIN series s ON s.series_id=ps.series_id WHERE s.season=2026 AND s.series_date=? GROUP BY ps.player_id`).bind(date)
 ]);
 const bmap=new Map((bat.results||[]).map(r=>[r.player_id,num(r.fp)])),pmap=new Map((pit.results||[]).map(r=>[r.player_id,num(r.fp)]));
 const byEntry=new Map();
 for(const p of picks.results||[]){
   const base=p.slot_type==="bat"?(bmap.get(p.player_id)||0):(pmap.get(p.player_id)||0);
   const final=base*num(p.multiplier);
   if(!byEntry.has(p.entry_id))byEntry.set(p.entry_id,[]);
   byEntry.get(p.entry_id).push({...p,base_points:base,final_points:Math.round(final*100)/100});
 }
 return (entries.results||[]).map(e=>{
   const ps=byEntry.get(e.entry_id)||[];
   return {...e,picks:ps,total_points:Math.round(ps.reduce((a,p)=>a+p.final_points,0)*100)/100};
 }).sort((a,b)=>b.total_points-a.total_points||a.submitted_at.localeCompare(b.submitted_at));
}
