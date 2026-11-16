function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const clean=v=>String(v??'').trim();
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'feat';
async function schemaReady(DB){return !!(await DB.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='pitching_feats'").first())}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
 if(!(await schemaReady(DB)))return json({ok:false,code:'PITCHING_FEATS_SCHEMA_MISSING',error:'Season tools are not installed yet. Run migrations/0039_pitching_feats_admin.sql in D1.'},503);
 try{
  const [players,teams,feats]=await DB.batch([
   DB.prepare("SELECT player_id,name,class_year,retired FROM players ORDER BY retired,name"),
   DB.prepare("SELECT team_id,display_name,active_2026 FROM teams ORDER BY display_name"),
   DB.prepare(`SELECT feat_id,kind,player_id,pitcher_label,opponent,season,label,sort_order,notes,active,created_at,updated_at FROM pitching_feats ORDER BY season DESC,sort_order DESC,feat_id DESC`)
  ]);
  return json({ok:true,build:'season-tools-v164',actor_email:context.data.actorEmail||null,players:players.results||[],teams:teams.results||[],feats:feats.results||[]});
 }catch(err){return json({ok:false,error:'Could not load season tools.',detail:String(err?.message||err)},500)}
}
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:'D1 binding DB is missing.'},500);
 if(!(await schemaReady(DB)))return json({ok:false,code:'PITCHING_FEATS_SCHEMA_MISSING',error:'Season tools are not installed yet. Run migrations/0039_pitching_feats_admin.sql in D1.'},503);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:'Request body must be valid JSON.'},400)}
 const action=clean(body.action),actor=context.data.actorEmail||'unknown-access-user';
 if(action==='delete_pitching_feat'){
  const featId=clean(body.feat_id);if(!featId)return json({ok:false,error:'feat_id is required.'},422);
  const found=await DB.prepare('SELECT feat_id FROM pitching_feats WHERE feat_id=?').bind(featId).first();if(!found)return json({ok:false,error:'That pitching feat no longer exists.'},404);
  await DB.prepare('DELETE FROM pitching_feats WHERE feat_id=?').bind(featId).run();
  return json({ok:true,action:'deleted',feat_id:featId,actor_email:actor});
 }
 if(action!=='save_pitching_feat')return json({ok:false,error:'Unsupported action.'},400);
 const kind=clean(body.kind).toUpperCase(),season=Number(body.season),playerId=clean(body.player_id),opponent=clean(body.opponent),label=clean(body.label),notes=clean(body.notes),sortOrder=Number(body.sort_order||0);
 if(!['PG','NH'].includes(kind))return json({ok:false,error:'Choose Perfect Game or No-Hitter.'},422);
 if(!Number.isInteger(season)||season<2021||season>2100)return json({ok:false,error:'Enter a valid season.'},422);
 if(!playerId)return json({ok:false,error:'Choose a pitcher.'},422);
 const player=await DB.prepare('SELECT player_id,name FROM players WHERE player_id=?').bind(playerId).first();if(!player)return json({ok:false,error:'Selected pitcher was not found in the player registry.'},422);
 const parts=String(player.name||'').trim().split(/\s+/),pitcherLabel=parts[parts.length-1]||player.name;
 const featId=clean(body.feat_id)||`${season}_${kind.toLowerCase()}_${slug(player.name)}_${Date.now().toString(36)}`;
 try{
  await DB.prepare(`INSERT INTO pitching_feats(feat_id,kind,player_id,pitcher_label,opponent,season,label,sort_order,notes,active,updated_by)
    VALUES(?,?,?,?,?,?,?,?,?,1,?)
    ON CONFLICT(feat_id) DO UPDATE SET kind=excluded.kind,player_id=excluded.player_id,pitcher_label=excluded.pitcher_label,opponent=excluded.opponent,season=excluded.season,label=excluded.label,sort_order=excluded.sort_order,notes=excluded.notes,active=1,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
   .bind(featId,kind,playerId,pitcherLabel,opponent||null,season,label||'Manual entry',Number.isFinite(sortOrder)?sortOrder:0,notes||null,actor).run();
  return json({ok:true,action:'saved',feat_id:featId,pitcher:player.name,kind,season,actor_email:actor});
 }catch(err){return json({ok:false,error:'Could not save pitching feat.',detail:String(err?.message||err)},500)}
}
