SELECT 1;

-- Nick Hulgrave: correct the most recent erroneous 2026 pitching row from 1 ER to 0 ER.
UPDATE pitching_series_stats
SET er=0
WHERE player_id=(SELECT player_id FROM players WHERE name='Nick Hulgrave' COLLATE NOCASE LIMIT 1)
  AND er=1
  AND series_id=(
    SELECT ps.series_id
    FROM pitching_series_stats ps
    JOIN series s ON s.series_id=ps.series_id
    WHERE s.season=2026
      AND ps.player_id=(SELECT player_id FROM players WHERE name='Nick Hulgrave' COLLATE NOCASE LIMIT 1)
      AND ps.er=1
    ORDER BY s.series_date DESC, ps.series_id DESC
    LIMIT 1
  );

-- Noah Cerniglia: correct the most recent erroneous 2026 pitching row from 2 ER to 3 ER.
UPDATE pitching_series_stats
SET er=3
WHERE player_id=(SELECT player_id FROM players WHERE name='Noah Cerniglia' COLLATE NOCASE LIMIT 1)
  AND er=2
  AND series_id=(
    SELECT ps.series_id
    FROM pitching_series_stats ps
    JOIN series s ON s.series_id=ps.series_id
    WHERE s.season=2026
      AND ps.player_id=(SELECT player_id FROM players WHERE name='Noah Cerniglia' COLLATE NOCASE LIMIT 1)
      AND ps.er=2
    ORDER BY s.series_date DESC, ps.series_id DESC
    LIMIT 1
  );

-- Matt Gough: unretire and move to the 2026 Zyns roster.
UPDATE players SET retired=0 WHERE name='Matt Gough' COLLATE NOCASE;

DELETE FROM team_rosters
WHERE season=2026
  AND player_id=(SELECT player_id FROM players WHERE name='Matt Gough' COLLATE NOCASE LIMIT 1);

INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
SELECT 2026,player_id,'zyns','player','migration-v64'
FROM players
WHERE name='Matt Gough' COLLATE NOCASE;

-- Matthew Nugent: create if needed, mark active, and assign to Zyns.
INSERT OR IGNORE INTO players(player_id,name,class_year,retired)
VALUES('matthew_nugent','Matthew Nugent',NULL,0);

UPDATE players SET retired=0 WHERE name='Matthew Nugent' COLLATE NOCASE;

DELETE FROM team_rosters
WHERE season=2026
  AND player_id=(SELECT player_id FROM players WHERE name='Matthew Nugent' COLLATE NOCASE LIMIT 1);

INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
SELECT 2026,player_id,'zyns','player','migration-v64'
FROM players
WHERE name='Matthew Nugent' COLLATE NOCASE;
