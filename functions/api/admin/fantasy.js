
import {json,clean,buildSlate,scoreEntries,ensureSlate,roundMult} from "../_fantasy.js";
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)}
export async function onRequestGet(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 const date=clean(new URL(context.request.url).searchParams.get("date"));
 if(!validDate(date))return json({ok:false,error:"A YYYY-MM-DD date is required."},400);
 try{return json({ok:true,build:"v65",date,...await buildSlate(DB,date),leaderboard:await scoreEntries(DB,date)})}
 catch(err){return json({ok:false,error:"Fantasy admin query failed.",detail:String(err?.message||err)},500)}
}
export async function onRequestPost(context){
 const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
 let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be valid JSON."},400)}
 const date=clean(body.date),actor=context.data.actorEmail||"commissioner";
 if(!validDate(date))return json({ok:false,error:"Invalid date."},422);
 try{
  await ensureSlate(DB,date,actor);
  if(body.action==="status"){
    if(!["open","locked","final"].includes(body.status))return json({ok:false,error:"Invalid status."},422);
    await DB.prepare("UPDATE fantasy_slates SET status=?,updated_at=CURRENT_TIMESTAMP,updated_by=? WHERE slate_date=?").bind(body.status,actor,date).run();
  }else if(body.action==="player"){
    const id=clean(body.player_id),bat=body.batting_eligible?1:0,pit=body.pitching_eligible?1:0;
    const bm=body.batting_multiplier_override===""||body.batting_multiplier_override===null?null:roundMult(Number(body.batting_multiplier_override));
    const pm=body.pitching_multiplier_override===""||body.pitching_multiplier_override===null?null:roundMult(Number(body.pitching_multiplier_override));
    if((bm!==null&&(bm<1||bm>6))||(pm!==null&&(pm<1||pm>6)))return json({ok:false,error:"Multiplier overrides must be between 1x and 6x."},422);
    await DB.prepare(`
     INSERT INTO fantasy_player_settings(slate_date,player_id,batting_eligible,pitching_eligible,batting_multiplier_override,pitching_multiplier_override)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(slate_date,player_id) DO UPDATE SET batting_eligible=excluded.batting_eligible,pitching_eligible=excluded.pitching_eligible,batting_multiplier_override=excluded.batting_multiplier_override,pitching_multiplier_override=excluded.pitching_multiplier_override
    `).bind(date,id,bat,pit,bm,pm).run();
  }else if(body.action!=="refresh")return json({ok:false,error:"Unsupported fantasy action."},400);
  return json({ok:true,date,...await buildSlate(DB,date),leaderboard:await scoreEntries(DB,date)});
 }catch(err){return json({ok:false,error:"Fantasy admin update failed.",detail:String(err?.message||err)},500)}
}
