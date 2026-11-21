-- ND Wiffle v168
-- Central honors registry for modern awards + Hall of Fame.
-- Historical 2021-2025 awards remain in the static archive and are merged by the UI.
-- 2026+ awards are managed here. World Series Champion is derived automatically
-- from the published World Series result and series_participants and is NOT seeded here.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS league_awards (
  award_id TEXT PRIMARY KEY,
  season INTEGER NOT NULL CHECK (season BETWEEN 2021 AND 2100),
  player_id TEXT NOT NULL REFERENCES players(player_id),
  award TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  source TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration-v168'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_league_award_identity
  ON league_awards(season,player_id,award,detail);
CREATE INDEX IF NOT EXISTS idx_league_awards_season
  ON league_awards(season,active);
CREATE INDEX IF NOT EXISTS idx_league_awards_player
  ON league_awards(player_id,season);

CREATE TABLE IF NOT EXISTS hall_of_fame_members (
  player_id TEXT PRIMARY KEY REFERENCES players(player_id),
  inducted_season INTEGER CHECK (inducted_season BETWEEN 2021 AND 2100),
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration-v168'
);

-- Existing Hall of Fame + 2026 additions requested by commissioner.
INSERT OR IGNORE INTO hall_of_fame_members(player_id,inducted_season,notes,active,updated_by) VALUES
('michael_pilger',NULL,'',1,'migration-v168'),
('matthew_doty',NULL,'',1,'migration-v168'),
('casey_cavlovich',NULL,'',1,'migration-v168'),
('matt_baldwin',NULL,'',1,'migration-v168'),
('jack_penney',NULL,'',1,'migration-v168'),
('patrick_thompson',NULL,'',1,'migration-v168'),
('jack_glavy',NULL,'',1,'migration-v168'),
('patrick_sullivan',NULL,'',1,'migration-v168'),
('xavier_hirsch',NULL,'',1,'migration-v168'),
('joey_thomalla',2026,'',1,'migration-v168'),
('jimmy_redfern',2026,'',1,'migration-v168');

-- 2026 award winners already recorded on the Awards page.
INSERT OR IGNORE INTO league_awards(award_id,season,player_id,award,detail,active,source,updated_by) VALUES
('2026-luke-gormsen-silver-slugger',2026,'luke_gormsen','Silver Slugger','',1,'season-closeout','migration-v168'),
('2026-gerard-sharkey-silver-slugger',2026,'gerard_sharkey','Silver Slugger','',1,'season-closeout','migration-v168'),
('2026-joey-thomalla-cy-young',2026,'joey_thomalla','Cy Young','',1,'season-closeout','migration-v168'),
('2026-michael-pilger-cy-young',2026,'michael_pilger','Cy Young','',1,'season-closeout','migration-v168'),
('2026-diego-alonso-gold-glove-ss',2026,'diego_alonso','Gold Glove','SS',1,'season-closeout','migration-v168'),
('2026-landon-edwards-gold-glove-of',2026,'landon_edwards','Gold Glove','OF',1,'season-closeout','migration-v168'),
('2026-michael-pilger-gold-glove-flex',2026,'michael_pilger','Gold Glove','FLEX',1,'season-closeout','migration-v168'),
('2026-matt-schuenemann-fourth-man',2026,'matt_schuenemann','Fourth Man of the Year','',1,'season-closeout','migration-v168'),
('2026-luke-gormsen-mvp',2026,'luke_gormsen','MVP','',1,'season-closeout','migration-v168'),
('2026-ian-phelps-roty',2026,'ian_phelps','Rookie of the Year','',1,'season-closeout','migration-v168'),
('2026-jerry-vielhauer-asg-mvp',2026,'jerry_vielhauer','All-Star Game MVP','',1,'season-closeout','migration-v168'),
('2026-joey-thomalla-all-star',2026,'joey_thomalla','All-Star','',1,'season-closeout','migration-v168'),
('2026-michael-pilger-all-star',2026,'michael_pilger','All-Star','',1,'season-closeout','migration-v168'),
('2026-jerry-vielhauer-all-star',2026,'jerry_vielhauer','All-Star','',1,'season-closeout','migration-v168'),
('2026-ben-meyer-all-star',2026,'ben_meyer','All-Star','',1,'season-closeout','migration-v168'),
('2026-evan-reid-all-star',2026,'evan_reid','All-Star','',1,'season-closeout','migration-v168'),
('2026-eddie-mcgettigan-all-star',2026,'eddie_mcgettigan','All-Star','',1,'season-closeout','migration-v168'),
('2026-gerard-sharkey-all-star',2026,'gerard_sharkey','All-Star','',1,'season-closeout','migration-v168'),
('2026-luke-gormsen-all-star',2026,'luke_gormsen','All-Star','',1,'season-closeout','migration-v168'),
('2026-jt-kaiser-all-star',2026,'jt_kaiser','All-Star','',1,'season-closeout','migration-v168'),
('2026-will-stevens-all-star',2026,'will_stevens','All-Star','',1,'season-closeout','migration-v168'),
('2026-eddie-mcgettigan-hrd',2026,'eddie_mcgettigan','Home Run Derby Winner','',1,'season-closeout','migration-v168');

-- Verification
SELECT 'HOF' AS kind, COUNT(*) AS count FROM hall_of_fame_members WHERE active=1
UNION ALL
SELECT '2026 awards', COUNT(*) FROM league_awards WHERE active=1 AND season=2026;

PRAGMA foreign_key_check;
