PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS team_rosters (
  season INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','captain','protected')),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT NOT NULL,
  PRIMARY KEY (season, player_id)
);

CREATE INDEX IF NOT EXISTS idx_team_rosters_season_team
  ON team_rosters(season, team_id);
