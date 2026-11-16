-- RUN THIS ONLY IN THE SEPARATE SPRING_DB D1 DATABASE.
-- Never run it against the primary fall/career ND Wiffle DB.
-- player_id is the ONLY cross-database connector. There are intentionally no
-- foreign keys to the fall DB because D1 databases cannot enforce cross-DB FKs.

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS spring_seasons (
  season INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spring_teams (
  season INTEGER NOT NULL REFERENCES spring_seasons(season) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  logo_path TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  PRIMARY KEY(season,team_id)
);

CREATE TABLE IF NOT EXISTS spring_rosters (
  season INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  display_name_snapshot TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(season,player_id),
  FOREIGN KEY(season,team_id) REFERENCES spring_teams(season,team_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_spring_rosters_player ON spring_rosters(player_id);

CREATE TABLE IF NOT EXISTS spring_series (
  series_id TEXT PRIMARY KEY,
  season INTEGER NOT NULL REFERENCES spring_seasons(season),
  series_date TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_team_id TEXT NOT NULL,
  series_type TEXT NOT NULL DEFAULT 'regular',
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(season,away_team_id) REFERENCES spring_teams(season,team_id),
  FOREIGN KEY(season,home_team_id) REFERENCES spring_teams(season,team_id),
  CHECK(away_team_id<>home_team_id)
);

CREATE TABLE IF NOT EXISTS spring_games (
  series_id TEXT NOT NULL REFERENCES spring_series(series_id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL CHECK(game_number BETWEEN 1 AND 9),
  away_score INTEGER NOT NULL CHECK(away_score>=0),
  home_score INTEGER NOT NULL CHECK(home_score>=0),
  PRIMARY KEY(series_id,game_number),
  CHECK(away_score<>home_score)
);

CREATE TABLE IF NOT EXISTS spring_batting_stats (
  series_id TEXT NOT NULL REFERENCES spring_series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0 CHECK(games_played>=0),
  pa INTEGER NOT NULL DEFAULT 0 CHECK(pa>=0),
  ab INTEGER NOT NULL DEFAULT 0 CHECK(ab>=0),
  runs INTEGER NOT NULL DEFAULT 0 CHECK(runs>=0),
  hits INTEGER NOT NULL DEFAULT 0 CHECK(hits>=0),
  singles INTEGER NOT NULL DEFAULT 0 CHECK(singles>=0),
  doubles INTEGER NOT NULL DEFAULT 0 CHECK(doubles>=0),
  triples INTEGER NOT NULL DEFAULT 0 CHECK(triples>=0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK(hr>=0),
  rbi INTEGER NOT NULL DEFAULT 0 CHECK(rbi>=0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK(bb>=0),
  so INTEGER NOT NULL DEFAULT 0 CHECK(so>=0),
  PRIMARY KEY(series_id,player_id)
);
CREATE INDEX IF NOT EXISTS idx_spring_batting_player ON spring_batting_stats(player_id);

CREATE TABLE IF NOT EXISTS spring_pitching_stats (
  series_id TEXT NOT NULL REFERENCES spring_series(series_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0 CHECK(games_played>=0),
  appearances INTEGER NOT NULL DEFAULT 0 CHECK(appearances>=0),
  starts INTEGER NOT NULL DEFAULT 0 CHECK(starts>=0),
  outs_recorded INTEGER NOT NULL DEFAULT 0 CHECK(outs_recorded>=0),
  bf INTEGER NOT NULL DEFAULT 0 CHECK(bf>=0),
  runs INTEGER NOT NULL DEFAULT 0 CHECK(runs>=0),
  er INTEGER NOT NULL DEFAULT 0 CHECK(er>=0),
  strikeouts INTEGER NOT NULL DEFAULT 0 CHECK(strikeouts>=0),
  hits INTEGER NOT NULL DEFAULT 0 CHECK(hits>=0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK(bb>=0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK(hr>=0),
  wp INTEGER NOT NULL DEFAULT 0 CHECK(wp>=0),
  PRIMARY KEY(series_id,player_id),
  CHECK(starts<=appearances)
);
CREATE INDEX IF NOT EXISTS idx_spring_pitching_player ON spring_pitching_stats(player_id);
