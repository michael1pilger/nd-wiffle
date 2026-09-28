CREATE TABLE IF NOT EXISTS exhibition_events (
  event_id TEXT PRIMARY KEY,
  season INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_title TEXT,
  team_a_name TEXT NOT NULL,
  team_a_logo TEXT,
  team_b_name TEXT NOT NULL,
  team_b_logo TEXT,
  event_date TEXT NOT NULL,
  event_time TEXT,
  location TEXT,
  notes TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exhibition_events_season_date
  ON exhibition_events(season,event_date,event_time);
