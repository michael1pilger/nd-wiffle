-- ND Wiffle daily Immaculate Grid + account-linked leaderboards.
-- Higher score is better: current grid scoring normalizes the best possible grid to 1000.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS immaculate_grids (
  grid_id TEXT PRIMARY KEY,
  grid_date TEXT NOT NULL UNIQUE,
  pool_index INTEGER NOT NULL,
  rows_json TEXT NOT NULL,
  cols_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_immaculate_grids_date
  ON immaculate_grids(grid_date);

CREATE TABLE IF NOT EXISTS immaculate_grid_attempts (
  attempt_id TEXT PRIMARY KEY,
  grid_id TEXT NOT NULL REFERENCES immaculate_grids(grid_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES user_accounts(user_id) ON DELETE SET NULL,
  correct_count INTEGER NOT NULL CHECK (correct_count BETWEEN 0 AND 9),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000),
  answers_json TEXT NOT NULL,
  leaderboard_eligible INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_eligible IN (0,1)),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_immaculate_grid_attempts_grid
  ON immaculate_grid_attempts(grid_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_immaculate_grid_attempts_user
  ON immaculate_grid_attempts(user_id, completed_at);

CREATE TABLE IF NOT EXISTS immaculate_grid_leaderboard (
  grid_id TEXT NOT NULL REFERENCES immaculate_grids(grid_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES user_accounts(user_id) ON DELETE CASCADE,
  attempt_id TEXT NOT NULL UNIQUE REFERENCES immaculate_grid_attempts(attempt_id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL CHECK (correct_count BETWEEN 0 AND 9),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000),
  completed_at TEXT NOT NULL,
  PRIMARY KEY (grid_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_immaculate_grid_leaderboard_rank
  ON immaculate_grid_leaderboard(grid_id, correct_count DESC, score DESC, completed_at ASC);
