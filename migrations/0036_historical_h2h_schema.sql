-- ND Wiffle historical head-to-head records. This migration is additive.
-- No changes to existing games, series, accounts, bets, rosters, or 2026 records.
CREATE TABLE IF NOT EXISTS historical_h2h_series (
  historical_id TEXT PRIMARY KEY,
  season INTEGER NOT NULL CHECK(season BETWEEN 2021 AND 2025),
  phase TEXT NOT NULL CHECK(phase IN ('regular','playoff')),
  round_name TEXT,
  team_a_id TEXT NOT NULL REFERENCES teams(team_id),
  team_b_id TEXT NOT NULL REFERENCES teams(team_id),
  team_a_game_wins INTEGER NOT NULL CHECK(team_a_game_wins BETWEEN 0 AND 7),
  team_b_game_wins INTEGER NOT NULL CHECK(team_b_game_wins BETWEEN 0 AND 7),
  result_type TEXT NOT NULL DEFAULT 'played',
  evidence_level TEXT NOT NULL DEFAULT 'recorded',
  source TEXT NOT NULL,
  quality_flags TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  CHECK(team_a_id <> team_b_id),
  CHECK(team_a_game_wins <> team_b_game_wins)
);
CREATE INDEX IF NOT EXISTS idx_h2h_season_phase ON historical_h2h_series(season,phase);
CREATE INDEX IF NOT EXISTS idx_h2h_team_a ON historical_h2h_series(team_a_id,season);
CREATE INDEX IF NOT EXISTS idx_h2h_team_b ON historical_h2h_series(team_b_id,season);
-- The prior 2026 games/series continue to be read live from D1.
