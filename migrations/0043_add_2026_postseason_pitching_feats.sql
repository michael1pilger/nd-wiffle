-- ND Wiffle v170
-- Add final 2026 postseason pitching feats.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO pitching_feats(
  feat_id,kind,player_id,pitcher_label,opponent,season,label,sort_order,notes,active,updated_by
) VALUES
('2026_pg_michael_pilger_semifinals_silverbacks','PG','michael_pilger','Pilger','Silverbacks',2026,'Semifinals',998.5,'2026 postseason',1,'migration-v170'),
('2026_nh_jerry_vielhauer_world_series_storm_1','NH','jerry_vielhauer','Vielhauer','Storm',2026,'World Series',999.1,'2026 World Series no-hitter #1',1,'migration-v170'),
('2026_nh_jerry_vielhauer_world_series_storm_2','NH','jerry_vielhauer','Vielhauer','Storm',2026,'World Series',999.2,'2026 World Series no-hitter #2',1,'migration-v170');

UPDATE pitching_feats
SET active=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration-v170'
WHERE feat_id IN (
  '2026_pg_michael_pilger_semifinals_silverbacks',
  '2026_nh_jerry_vielhauer_world_series_storm_1',
  '2026_nh_jerry_vielhauer_world_series_storm_2'
);

-- New events
SELECT feat_id,kind,pitcher_label,opponent,season,label,active
FROM pitching_feats
WHERE feat_id IN (
  '2026_pg_michael_pilger_semifinals_silverbacks',
  '2026_nh_jerry_vielhauer_world_series_storm_1',
  '2026_nh_jerry_vielhauer_world_series_storm_2'
)
ORDER BY kind,sort_order;

-- Perfect Game leaderboard
SELECT pitcher_label AS pitcher,COUNT(*) AS perfect_games
FROM pitching_feats
WHERE active=1 AND kind='PG'
GROUP BY pitcher_label
ORDER BY perfect_games DESC,pitcher;

-- No-Hitter leaderboard
SELECT pitcher_label AS pitcher,COUNT(*) AS no_hitters
FROM pitching_feats
WHERE active=1 AND kind='NH'
GROUP BY pitcher_label
ORDER BY no_hitters DESC,pitcher;

PRAGMA foreign_key_check;
