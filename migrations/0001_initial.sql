PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  active_2026 INTEGER NOT NULL DEFAULT 0 CHECK (active_2026 IN (0,1))
);

CREATE TABLE IF NOT EXISTS team_aliases (
  alias TEXT PRIMARY KEY COLLATE NOCASE,
  team_id TEXT NOT NULL REFERENCES teams(team_id)
);

CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  class_year INTEGER,
  retired INTEGER NOT NULL DEFAULT 0 CHECK (retired IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_aliases (
  alias TEXT PRIMARY KEY COLLATE NOCASE,
  player_id TEXT NOT NULL REFERENCES players(player_id)
);

CREATE TABLE IF NOT EXISTS series (
  series_id TEXT PRIMARY KEY,
  season INTEGER NOT NULL,
  series_date TEXT NOT NULL,
  away_team_id TEXT NOT NULL REFERENCES teams(team_id),
  home_team_id TEXT NOT NULL REFERENCES teams(team_id),
  schema_version INTEGER NOT NULL,
  source TEXT NOT NULL,
  commissioner_email TEXT NOT NULL,
  commissioner_notes TEXT,
  warning_count INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (away_team_id <> home_team_id)
);

CREATE INDEX IF NOT EXISTS idx_series_season ON series(season);
CREATE INDEX IF NOT EXISTS idx_series_date ON series(series_date);

CREATE TABLE IF NOT EXISTS games (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK (game_number BETWEEN 1 AND 3),
  away_score INTEGER NOT NULL CHECK (away_score >= 0),
  home_score INTEGER NOT NULL CHECK (home_score >= 0),
  winning_pitcher_id TEXT NOT NULL REFERENCES players(player_id),
  losing_pitcher_id TEXT NOT NULL REFERENCES players(player_id),
  save_pitcher_id TEXT REFERENCES players(player_id),
  PRIMARY KEY (series_id, game_number),
  CHECK (away_score <> home_score),
  CHECK (winning_pitcher_id <> losing_pitcher_id)
);

CREATE TABLE IF NOT EXISTS series_participants (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  side TEXT NOT NULL CHECK (side IN ('away','home')),
  games_played INTEGER NOT NULL CHECK (games_played BETWEEN 1 AND 3),
  PRIMARY KEY (series_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_player ON series_participants(player_id);

CREATE TABLE IF NOT EXISTS batting_series_stats (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  side TEXT NOT NULL CHECK (side IN ('away','home')),
  games_played INTEGER NOT NULL CHECK (games_played BETWEEN 1 AND 3),
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
  hbp INTEGER NOT NULL DEFAULT 0 CHECK (hbp >= 0),
  PRIMARY KEY (series_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_batting_player ON batting_series_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_batting_team ON batting_series_stats(team_id);

CREATE TABLE IF NOT EXISTS pitching_series_stats (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  side TEXT NOT NULL CHECK (side IN ('away','home')),
  games_played INTEGER NOT NULL CHECK (games_played BETWEEN 1 AND 3),
  appearances INTEGER NOT NULL CHECK (appearances BETWEEN 1 AND 3),
  starts INTEGER NOT NULL CHECK (starts BETWEEN 0 AND 3),
  outs_recorded INTEGER NOT NULL DEFAULT 0 CHECK (outs_recorded >= 0),
  bf INTEGER NOT NULL DEFAULT 0 CHECK (bf >= 0),
  runs INTEGER NOT NULL DEFAULT 0 CHECK (runs >= 0),
  er INTEGER NOT NULL DEFAULT 0 CHECK (er >= 0),
  strikeouts INTEGER NOT NULL DEFAULT 0 CHECK (strikeouts >= 0),
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK (bb >= 0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK (hr >= 0),
  hbp INTEGER NOT NULL DEFAULT 0 CHECK (hbp >= 0),
  wp INTEGER NOT NULL DEFAULT 0 CHECK (wp >= 0),
  PRIMARY KEY (series_id, player_id),
  CHECK (starts <= appearances)
);

CREATE INDEX IF NOT EXISTS idx_pitching_player ON pitching_series_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pitching_team ON pitching_series_stats(team_id);

CREATE TABLE IF NOT EXISTS manual_corrections (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  correction_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  player_id TEXT REFERENCES players(player_id),
  team_id TEXT REFERENCES teams(team_id),
  field TEXT NOT NULL,
  original_value REAL,
  corrected_value REAL,
  reason TEXT NOT NULL,
  PRIMARY KEY (series_id, correction_id)
);

CREATE TABLE IF NOT EXISTS warning_approvals (
  series_id TEXT NOT NULL REFERENCES series(series_id) ON DELETE CASCADE,
  warning_id TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  reason TEXT NOT NULL,
  PRIMARY KEY (series_id, warning_id)
);

CREATE TABLE IF NOT EXISTS import_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('publish','replace')),
  actor_email TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_history_series ON import_history(series_id);
