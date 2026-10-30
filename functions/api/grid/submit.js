import { json, getUser } from "../_account.js";
import { GRID_LAUNCH_DATE, easternDate, allowedGridDate, ensureGrid, leaderboardRows, hypotheticalPlacement } from "../_grid.js";

function validateAnswers(answers,grid){
  if(!Array.isArray(answers)||answers.length!==9)return "A completed grid must contain exactly nine cell attempts.";
  const expected=new Set();for(const r of grid.rows)for(const c of grid.cols)expected.add(`${r}|${c}`);
  const seen=new Set();
  for(const a of answers){
    const row=String(a?.row||""),col=String(a?.col||""),k=`${row}|${col}`;
    if(!expected.has(k))return "Submission contains a cell outside this daily grid.";
    if(seen.has(k))return "Submission contains a duplicate grid cell.";
    seen.add(k);
    if(!String(a?.playerId||"").trim())return "Every attempted cell must include a player.";
    if(typeof a?.correct!=="boolean")return "Every attempted cell must include its result.";
  }
  return null;
}

export async function onRequestPost(context){
  const DB=context.env.DB;if(!DB)return json({ok:false,error:"D1 binding DB is missing."},500);
  let body;try{body=await context.request.json()}catch{return json({ok:false,error:"Request body must be JSON."},400)}
  try{
    const today=easternDate(),gridDate=String(body.grid_date||"").trim();
    const allowed=allowedGridDate(gridDate,today);
    if(!allowed.ok)return json({ok:false,error:allowed.error,current_date:today,launch_date:GRID_LAUNCH_DATE},allowed.status);
    const grid=await ensureGrid(DB,gridDate);
    const error=validateAnswers(body.answers,grid);if(error)return json({ok:false,error},422);
    const derivedCorrect=body.answers.filter(x=>x.correct===true).length;
    const correct=Number(body.correct_count),score=Number(body.score);
    if(!Number.isInteger(correct)||correct!==derivedCorrect||correct<0||correct>9)return json({ok:false,error:"Correct-count validation failed."},422);
    if(!Number.isInteger(score)||score<0||score>1000)return json({ok:false,error:"Score must be a whole number from 0 to 1000."},422);

    const user=await getUser(context),entriesBefore=await leaderboardRows(DB,grid.grid_id);
    const hypothetical=hypotheticalPlacement(entriesBefore,correct,score);
    if(!user){
      return json({ok:true,official:false,eligible:false,reason:"login_required",grid_date:gridDate,hypothetical});
    }

    const answersJson=JSON.stringify(body.answers),isToday=gridDate===today;
    if(!isToday){
      await DB.prepare(`
        INSERT INTO immaculate_grid_attempts(attempt_id,grid_id,user_id,correct_count,score,answers_json,leaderboard_eligible)
        VALUES(?,?,?,?,?,?,0)
      `).bind(crypto.randomUUID(),grid.grid_id,user.user_id,correct,score,answersJson).run();
      return json({ok:true,official:false,eligible:false,reason:"archive_closed",grid_date:gridDate,hypothetical});
    }

    const existing=await DB.prepare(`
      SELECT l.correct_count,l.score,l.completed_at
      FROM immaculate_grid_leaderboard l WHERE l.grid_id=? AND l.user_id=? LIMIT 1
    `).bind(grid.grid_id,user.user_id).first();
    if(existing){
      const entries=await leaderboardRows(DB,grid.grid_id),mine=entries.find(x=>x.user_id===user.user_id)||null;
      return json({ok:true,official:true,eligible:true,already_submitted:true,grid_date:gridDate,result:mine});
    }

    const attemptId=crypto.randomUUID();
    try{
      await DB.batch([
        DB.prepare(`INSERT INTO immaculate_grid_attempts(attempt_id,grid_id,user_id,correct_count,score,answers_json,leaderboard_eligible) VALUES(?,?,?,?,?,?,1)`)
          .bind(attemptId,grid.grid_id,user.user_id,correct,score,answersJson),
        DB.prepare(`INSERT INTO immaculate_grid_leaderboard(grid_id,user_id,attempt_id,correct_count,score,completed_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)`)
          .bind(grid.grid_id,user.user_id,attemptId,correct,score)
      ]);
    }catch(err){
      if(/UNIQUE constraint failed/i.test(String(err?.message||err))){
        const entries=await leaderboardRows(DB,grid.grid_id),mine=entries.find(x=>x.user_id===user.user_id)||null;
        return json({ok:true,official:true,eligible:true,already_submitted:true,grid_date:gridDate,result:mine});
      }
      throw err;
    }
    const entries=await leaderboardRows(DB,grid.grid_id),mine=entries.find(x=>x.user_id===user.user_id)||null;
    return json({ok:true,official:true,eligible:true,already_submitted:false,grid_date:gridDate,result:mine,field_size:entries.length});
  }catch(err){
    const m=String(err?.message||err);
    if(/no such table/i.test(m))return json({ok:false,error:"Daily grid database tables are missing. Run migration 0035_immaculate_grid_leaderboards.sql.",detail:m},503);
    return json({ok:false,error:"Grid result could not be submitted.",detail:m},500);
  }
}
