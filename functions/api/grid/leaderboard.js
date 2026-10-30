import { json, getUser } from "../_account.js";
import { GRID_LAUNCH_DATE, easternDate, allowedGridDate, ensureGrid, leaderboardRows, hypotheticalPlacement } from "../_grid.js";

export async function onRequestGet(context) {
  const DB=context.env.DB;
  if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  try{
    const url=new URL(context.request.url),today=easternDate();
    const requested=String(url.searchParams.get("date")||today).trim();
    const allowed=allowedGridDate(requested,today);
    if(!allowed.ok)return json({ok:false,error:allowed.error,current_date:today,launch_date:GRID_LAUNCH_DATE},allowed.status);
    const grid=await ensureGrid(DB,requested),entries=await leaderboardRows(DB,grid.grid_id);
    const user=await getUser(context);
    const mine=user?entries.find(x=>x.user_id===user.user_id)||null:null;

    let hypothetical=null;
    const c=url.searchParams.get("correct_count"),s=url.searchParams.get("score");
    if(c!==null&&s!==null){
      const correct=Number(c),score=Number(s);
      if(Number.isInteger(correct)&&correct>=0&&correct<=9&&Number.isInteger(score)&&score>=0&&score<=1000){
        hypothetical=hypotheticalPlacement(entries,correct,score);
      }
    }
    return json({ok:true,current_date:today,grid_date:requested,is_today:requested===today,entries,my_result:mine,hypothetical});
  }catch(err){
    const m=String(err?.message||err);
    if(/no such table/i.test(m))return json({ok:false,error:"Daily grid database tables are missing. Run migration 0035_immaculate_grid_leaderboards.sql.",detail:m},503);
    return json({ok:false,error:"Leaderboard could not be loaded.",detail:m},500);
  }
}
