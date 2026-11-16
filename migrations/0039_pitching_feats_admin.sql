-- ND Wiffle season-closeout v164
-- Moves the no-hitter / perfect-game timeline into D1 so future commissioners
-- can manage it from /admin/season-tools/ instead of editing code or SQL.

CREATE TABLE IF NOT EXISTS pitching_feats (
  feat_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('PG','NH')),
  player_id TEXT,
  pitcher_label TEXT NOT NULL,
  opponent TEXT,
  season INTEGER NOT NULL CHECK (season BETWEEN 2021 AND 2100),
  label TEXT NOT NULL,
  sort_order REAL NOT NULL DEFAULT 0,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT 'migration-v164'
);

CREATE INDEX IF NOT EXISTS idx_pitching_feats_season ON pitching_feats(season,sort_order);
CREATE INDEX IF NOT EXISTS idx_pitching_feats_player ON pitching_feats(player_id);
CREATE INDEX IF NOT EXISTS idx_pitching_feats_kind ON pitching_feats(kind,season);

-- Seed the historical list that was previously hard-coded in awards/index.html.
-- player_id is intentionally NULL for the legacy seed: the old source stored only
-- a display surname. New admin entries validate and store the canonical player_id.
INSERT OR IGNORE INTO pitching_feats(feat_id,kind,pitcher_label,opponent,season,label,sort_order) VALUES
('legacy_2022_pg_pilger_19','PG','Pilger','Underdawgs',2022,'Match 19',19),
('legacy_2022_pg_doty_22','PG','Doty','Stiffies',2022,'Match 22',22),
('legacy_2024_pg_doty_12','PG','Doty','Ball Busters',2024,'Match 12',12),
('legacy_2024_pg_pilger_ws','PG','Pilger','Silverbacks',2024,'World Series',999),
('legacy_2026_pg_thomalla_6','PG','Thomalla','Twin Titans',2026,'Match 6',6),
('legacy_2021_nh_pires_8','NH','Pires','Midnight',2021,'Match 8',8),
('legacy_2021_nh_doty_12','NH','Doty','Midnight',2021,'Match 12',12),
('legacy_2022_nh_fitzgerald_1','NH','Fitzgerald','Silverbacks',2022,'Match 1',1),
('legacy_2022_nh_donegan_2','NH','Donegan','Yard Goats',2022,'Match 2',2),
('legacy_2022_nh_doty_7','NH','Doty','Yard Goats',2022,'Match 7',7),
('legacy_2022_nh_hirsch_12','NH','Hirsch','Silverbacks',2022,'Match 12',12),
('legacy_2022_nh_doty_15','NH','Doty','Zyns',2022,'Match 15',15),
('legacy_2022_nh_doty_17','NH','Doty','Yard Goats',2022,'Match 17',17),
('legacy_2023_nh_sullivan_5','NH','Sullivan','Goobers',2023,'Match 5',5),
('legacy_2023_nh_cavlovich_14','NH','Cavlovich','Ball Busters',2023,'Match 14',14),
('legacy_2023_nh_baldwin_17','NH','Baldwin','Stiffies',2023,'Match 17',17),
('legacy_2024_nh_rotatori_2','NH','Rotatori','Silverbacks',2024,'Match 2',2),
('legacy_2024_nh_dove_2','NH','Dove','Silverbacks',2024,'Match 2',2.1),
('legacy_2024_nh_dwyer_21','NH','Dwyer','Storm',2024,'Match 21',21),
('legacy_2024_nh_pilger_sf','NH','Pilger','Dirty Dawgs',2024,'Semifinals',998),
('legacy_2025_nh_passo_5','NH','Passo','Silverbacks',2025,'Match 5',5),
('legacy_2025_nh_bates_28','NH','Bates','Dirty Dawgs',2025,'Match 28',28),
('legacy_2025_nh_baldwin_wc','NH','Baldwin','Zyns',2025,'Wildcard',997),
('legacy_2026_nh_blanco_2','NH','Blanco','Zyns',2026,'Match 2',2),
('legacy_2026_nh_mato_5','NH','Mato','Silverbacks',2026,'Match 5',5),
('legacy_2026_nh_vielhauer_9','NH','Vielhauer','Zyns',2026,'Match 9',9),
('legacy_2026_nh_bates_20','NH','Bates','Goobers',2026,'Match 20',20),
('legacy_2026_nh_vielhauer_21','NH','Vielhauer','Twin Titans',2026,'Match 21',21),
('legacy_2026_nh_oswald_25','NH','Oswald','Silverbacks',2026,'Match 25',25),
('legacy_2026_nh_vielhauer_31','NH','Vielhauer','Midnight',2026,'Match 31',31);

SELECT kind,COUNT(*) AS total FROM pitching_feats WHERE active=1 GROUP BY kind ORDER BY kind;
