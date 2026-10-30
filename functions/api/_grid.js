import { GRID_DEFAULT, GRID_POOL } from "./_grid_pool.js";

export const GRID_LAUNCH_DATE = "2026-10-30";
const STEP = 37;
const DAY_MS = 86400000;

export function easternDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}`;
}

export function validIsoDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}

function utcDayNumber(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

function sameBoard(a,b) {
  return JSON.stringify(a?.rows || []) === JSON.stringify(b?.rows || []) &&
         JSON.stringify(a?.cols || []) === JSON.stringify(b?.cols || []);
}

export function scheduledBoard(gridDate) {
  if (!GRID_POOL?.length) throw new Error("Daily grid pool is empty. Re-run the installer to regenerate _grid_pool.js.");
  const base = Math.max(0, GRID_POOL.findIndex(g => sameBoard(g, GRID_DEFAULT)));
  const offset = utcDayNumber(gridDate) - utcDayNumber(GRID_LAUNCH_DATE);
  const index = ((base + (offset * STEP)) % GRID_POOL.length + GRID_POOL.length) % GRID_POOL.length;
  const board = GRID_POOL[index];
  return { pool_index:index, rows:[...board.rows], cols:[...board.cols] };
}

export async function ensureGrid(DB, gridDate) {
  let row = await DB.prepare(`
    SELECT grid_id,grid_date,pool_index,rows_json,cols_json,created_at
    FROM immaculate_grids WHERE grid_date=? LIMIT 1
  `).bind(gridDate).first();
  if (row) return normalize(row);

  const board = scheduledBoard(gridDate);
  const gridId = `daily_${gridDate.replace(/-/g,"_")}`;
  await DB.prepare(`
    INSERT OR IGNORE INTO immaculate_grids(grid_id,grid_date,pool_index,rows_json,cols_json)
    VALUES(?,?,?,?,?)
  `).bind(gridId,gridDate,board.pool_index,JSON.stringify(board.rows),JSON.stringify(board.cols)).run();

  row = await DB.prepare(`
    SELECT grid_id,grid_date,pool_index,rows_json,cols_json,created_at
    FROM immaculate_grids WHERE grid_date=? LIMIT 1
  `).bind(gridDate).first();
  if (!row) throw new Error("Could not create daily grid record.");
  return normalize(row);
}

function normalize(row) {
  return {
    grid_id: row.grid_id,
    grid_date: row.grid_date,
    pool_index: Number(row.pool_index),
    rows: JSON.parse(row.rows_json || "[]"),
    cols: JSON.parse(row.cols_json || "[]"),
    created_at: row.created_at
  };
}

export function allowedGridDate(requested, today = easternDate()) {
  if (!validIsoDate(requested)) return { ok:false, status:400, error:"Grid date must be YYYY-MM-DD." };
  if (requested < GRID_LAUNCH_DATE) return { ok:false, status:404, error:`Daily grid archive starts ${GRID_LAUNCH_DATE}.` };
  if (requested > today) return { ok:false, status:404, error:"Future daily grids are not available yet." };
  return { ok:true };
}

export async function leaderboardRows(DB, gridId, limit = 200) {
  const r = await DB.prepare(`
    SELECT l.user_id,
           COALESCE(p.name,ua.display_name,ua.email) AS display_name,
           ua.account_type,
           l.correct_count,l.score,l.completed_at
    FROM immaculate_grid_leaderboard l
    JOIN user_accounts ua ON ua.user_id=l.user_id
    LEFT JOIN players p ON p.player_id=ua.player_id
    WHERE l.grid_id=?
    ORDER BY l.correct_count DESC,l.score DESC,l.completed_at ASC,l.user_id ASC
    LIMIT ?
  `).bind(gridId,limit).all();
  return (r.results || []).map((x,i) => ({
    rank:i+1,
    user_id:x.user_id,
    display_name:x.display_name,
    account_type:x.account_type,
    correct_count:Number(x.correct_count),
    score:Number(x.score),
    completed_at:x.completed_at
  }));
}

export function hypotheticalPlacement(entries, correctCount, score) {
  const better = entries.filter(x =>
    x.correct_count > correctCount ||
    (x.correct_count === correctCount && x.score > score)
  ).length;
  const ties = entries.filter(x => x.correct_count === correctCount && x.score === score).length;
  return { rank:better + 1, ties, tied:ties > 0, field_size:entries.length };
}
