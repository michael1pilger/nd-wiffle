SELECT 1;

DELETE FROM team_rosters
WHERE season=2026
  AND player_id=(SELECT player_id FROM players WHERE name='Anthony Bellone' COLLATE NOCASE LIMIT 1);

INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
SELECT 2026,player_id,'zyns','player','migration-v66'
FROM players
WHERE name='Anthony Bellone' COLLATE NOCASE;
