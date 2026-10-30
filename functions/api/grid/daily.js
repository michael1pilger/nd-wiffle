import { json, getUser } from "../_account.js";
import { GRID_LAUNCH_DATE, easternDate, allowedGridDate, ensureGrid } from "../_grid.js";

export async function onRequestGet(context) {
  const DB = context.env.DB;
  if (!DB) return json({ok:false,error:"D1 binding DB is missing."},500);
  try {
    const url = new URL(context.request.url);
    const today = easternDate();
    const requested = String(url.searchParams.get("date") || today).trim();
    const allowed = allowedGridDate(requested,today);
    if (!allowed.ok) return json({ok:false,error:allowed.error,current_date:today,launch_date:GRID_LAUNCH_DATE},allowed.status);

    const grid = await ensureGrid(DB,requested);
    const user = await getUser(context);
    let userResult = null;
    if (user) {
      userResult = await DB.prepare(`
        SELECT l.correct_count,l.score,l.completed_at,a.answers_json
        FROM immaculate_grid_leaderboard l
        JOIN immaculate_grid_attempts a ON a.attempt_id=l.attempt_id
        WHERE l.grid_id=? AND l.user_id=?
        LIMIT 1
      `).bind(grid.grid_id,user.user_id).first();
      if (userResult) {
        userResult = {
          correct_count:Number(userResult.correct_count),
          score:Number(userResult.score),
          completed_at:userResult.completed_at,
          answers:JSON.parse(userResult.answers_json || "[]")
        };
      }
    }

    return json({
      ok:true,
      current_date:today,
      launch_date:GRID_LAUNCH_DATE,
      is_today:requested===today,
      authenticated:!!user,
      user:user ? {user_id:user.user_id,account_name:user.account_name,player_name:user.player_name,account_type:user.account_type} : null,
      user_result:userResult,
      grid
    });
  } catch (err) {
    const m=String(err?.message||err);
    if (/no such table/i.test(m)) return json({ok:false,error:"Daily grid database tables are missing. Run migration 0035_immaculate_grid_leaderboards.sql.",detail:m},503);
    return json({ok:false,error:"Daily grid could not be loaded.",detail:m},500);
  }
}
