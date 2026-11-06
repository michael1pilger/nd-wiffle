-- ND Wiffle v157
-- Expand series/game stat constraints to support playoff series up to best-of-7.
-- Existing regular-season behavior remains enforced by application validation.
-- This migration preserves all existing rows.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1) games: allow Game 1 through Game 7
-- ---------------------------------------------------------------------------
CREATE TABLE games_v157 (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK (game_number BETWEEN 1 AND 7),
  away_score INTEGER NOT NULL CHECK (away_score >= 0),
  home_score INTEGER NOT NULL CHECK (home_score >= 0),
  winning_pitcher_id TEXT NOT NULL REFERENCES players(player_id),
  losing_pitcher_id TEXT NOT NULL REFERENCES players(player_id),
  save_pitcher_id TEXT REFERENCES players(player_id),
  PRIMARY KEY (series_id, game_number),
  CHECK (away_score <> home_score),
  CHECK (winning_pitcher_id <> losing_pitcher_id)
);

INSERT INTO games_v157 (
  series_id, game_number, away_score, home_score,
  winning_pitcher_id, losing_pitcher_id, save_pitcher_id
)
SELECT
  series_id, game_number, away_score, home_score,
  winning_pitcher_id, losing_pitcher_id, save_pitcher_id
FROM games;

DROP TABLE games;
ALTER TABLE games_v157 RENAME TO games;

-- ---------------------------------------------------------------------------
-- 2) series_participants: a player may appear in up to 7 games
-- ---------------------------------------------------------------------------
CREATE TABLE series_participants_v157 (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  side TEXT NOT NULL CHECK (side IN ('away','home')),
  games_played INTEGER NOT NULL CHECK (games_played BETWEEN 1 AND 7),
  PRIMARY KEY (series_id, player_id)
);

INSERT INTO series_participants_v157 (
  series_id, player_id, team_id, side, games_played
)
SELECT series_id, player_id, team_id, side, games_played
FROM series_participants;

DROP TABLE series_participants;
ALTER TABLE series_participants_v157 RENAME TO series_participants;
CREATE INDEX IF NOT EXISTS idx_participants_player ON series_participants(player_id);

-- ---------------------------------------------------------------------------
-- 3) batting_series_stats: GP may be up to 7
-- HBP intentionally omitted; migration 0025 removed it from the live schema.
-- ---------------------------------------------------------------------------
CREATE TABLE batting_series_stats_v157 (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  side TEXT NOT NULL CHECK (side IN ('away','home')),
  games_played INTEGER NOT NULL CHECK (games_played BETWEEN 1 AND 7),
  pa INTEGER NOT NULL DEFAULT 0 CHECK (pa >= 0),
  ab INTEGER NOT NULL DEFAULT 0 CHECK (ab >= 0),
  runs INTEGER NOT NULL DEFAULT 0 CHECK (runs >= 0),
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  singles INTEGER NOT NULL DEFAULT 0 CHECK (singles >= 0),
  doubles INTEGER NOT NULL DEFAULT 0 CHECK (doubles >= 0),
  triples INTEGER NOT NULL DEFAULT 0 CHECK (triples >= 0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK (hr >= 0),
  rbi INTEGER NOT NULL DEFAULT 0 CHECK (rbi >= 0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK (bb >= 0),
  so INTEGER NOT NULL DEFAULT 0 CHECK (so >= 0),
  PRIMARY KEY (series_id, player_id)
);

INSERT INTO batting_series_stats_v157 (
  series_id, player_id, team_id, side, games_played,
  pa, ab, runs, hits, singles, doubles, triples, hr, rbi, bb, so
)
SELECT
  series_id, player_id, team_id, side, games_played,
  pa, ab, runs, hits, singles, doubles, triples, hr, rbi, bb, so
FROM batting_series_stats;

DROP TABLE batting_series_stats;
ALTER TABLE batting_series_stats_v157 RENAME TO batting_series_stats;
CREATE INDEX IF NOT EXISTS idx_batting_player ON batting_series_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_batting_team ON batting_series_stats(team_id);

-- ---------------------------------------------------------------------------
-- 4) pitching_series_stats: GP / appearances / starts may be up to 7
-- HBP intentionally omitted; migration 0025 removed it from the live schema.
-- ---------------------------------------------------------------------------
CREATE TABLE pitching_series_stats_v157 (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  side TEXT NOT NULL CHECK (side IN ('away','home')),
  games_played INTEGER NOT NULL CHECK (games_played BETWEEN 1 AND 7),
  appearances INTEGER NOT NULL CHECK (appearances BETWEEN 1 AND 7),
  starts INTEGER NOT NULL CHECK (starts BETWEEN 0 AND 7),
  outs_recorded INTEGER NOT NULL DEFAULT 0 CHECK (outs_recorded >= 0),
  bf INTEGER NOT NULL DEFAULT 0 CHECK (bf >= 0),
  runs INTEGER NOT NULL DEFAULT 0 CHECK (runs >= 0),
  er INTEGER NOT NULL DEFAULT 0 CHECK (er >= 0),
  strikeouts INTEGER NOT NULL DEFAULT 0 CHECK (strikeouts >= 0),
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK (bb >= 0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK (hr >= 0),
  wp INTEGER NOT NULL DEFAULT 0 CHECK (wp >= 0),
  PRIMARY KEY (series_id, player_id),
  CHECK (starts <= appearances)
);

INSERT INTO pitching_series_stats_v157 (
  series_id, player_id, team_id, side, games_played,
  appearances, starts, outs_recorded, bf, runs, er,
  strikeouts, hits, bb, hr, wp
)
SELECT
  series_id, player_id, team_id, side, games_played,
  appearances, starts, outs_recorded, bf, runs, er,
  strikeouts, hits, bb, hr, wp
FROM pitching_series_stats;

DROP TABLE pitching_series_stats;
ALTER TABLE pitching_series_stats_v157 RENAME TO pitching_series_stats;
CREATE INDEX IF NOT EXISTS idx_pitching_player ON pitching_series_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pitching_team ON pitching_series_stats(team_id);

-- ---------------------------------------------------------------------------
-- Verification: both statements below should return clean/expected results.
-- ---------------------------------------------------------------------------
PRAGMA foreign_key_check;

SELECT name, sql
FROM sqlite_master
WHERE type='table'
  AND name IN ('games','series_participants','batting_series_stats','pitching_series_stats')
ORDER BY name;
