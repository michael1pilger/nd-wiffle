SELECT 1;

CREATE TABLE IF NOT EXISTS scheduled_series (
  season INTEGER NOT NULL,
  pair_key TEXT NOT NULL,
  team_a_id TEXT NOT NULL REFERENCES teams(team_id),
  team_b_id TEXT NOT NULL REFERENCES teams(team_id),
  series_date TEXT NOT NULL,
  series_time TEXT,
  location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (season, pair_key),
  CHECK (team_a_id <> team_b_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_series_date
ON scheduled_series(season, series_date);

INSERT INTO scheduled_series(
  season,pair_key,team_a_id,team_b_id,series_date,series_time,location,notes,updated_by
)
VALUES(
  2026,'storm__twin-titans','storm','twin-titans','2026-08-25','17:00','South Quad',NULL,'migration-v58'
)
ON CONFLICT(season,pair_key) DO UPDATE SET
  series_date=excluded.series_date,
  series_time=excluded.series_time,
  location=excluded.location,
  updated_at=CURRENT_TIMESTAMP,
  updated_by=excluded.updated_by;
