-- ND Wiffle v169
-- Add 2026 World Series MVP for Jerry Vielhauer.
-- World Series Champion rings remain derived automatically from the champion season roster.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO league_awards(
  award_id,season,player_id,award,detail,active,source,updated_by
) VALUES(
  '2026-jerry-vielhauer-ws-mvp',
  2026,
  'jerry_vielhauer',
  'World Series MVP',
  '',
  1,
  'season-closeout',
  'migration-v169'
);

-- If this exact record existed but had previously been deactivated, restore it.
UPDATE league_awards
SET active=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration-v169'
WHERE award_id='2026-jerry-vielhauer-ws-mvp';

-- Verification
SELECT a.season,p.name,a.award,a.active
FROM league_awards a
JOIN players p ON p.player_id=a.player_id
WHERE a.award_id='2026-jerry-vielhauer-ws-mvp';

SELECT '2026 active non-ring awards' AS kind,COUNT(*) AS count
FROM league_awards
WHERE season=2026 AND active=1;

PRAGMA foreign_key_check;
