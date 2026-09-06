-- Captain portal + team availability
CREATE TABLE IF NOT EXISTS captain_access (
  season INTEGER NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (season, email)
);
CREATE INDEX IF NOT EXISTS idx_captain_access_team ON captain_access(season, team_id);

CREATE TABLE IF NOT EXISTS captain_availability (
  availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
  season INTEGER NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  captain_email TEXT NOT NULL COLLATE NOCASE,
  availability_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season, team_id, availability_date, start_time, end_time)
);
CREATE INDEX IF NOT EXISTS idx_captain_availability_team_date
ON captain_availability(season, team_id, availability_date);
