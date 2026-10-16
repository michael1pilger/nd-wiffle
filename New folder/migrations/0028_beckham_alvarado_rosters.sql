-- v125 roster updates
INSERT OR IGNORE INTO players(player_id,name,class_year,retired)
VALUES('grayson_beckham','Grayson Beckham',NULL,0);

DELETE FROM team_rosters
WHERE season=2026 AND player_id='grayson_beckham';

INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
VALUES(2026,'grayson_beckham','goofy-goobers','player','v125-roster-update');

DELETE FROM team_rosters
WHERE season=2026 AND player_id='bennett_alvarado';

INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by)
VALUES(2026,'bennett_alvarado','zyns','player','v125-roster-update');

UPDATE players SET retired=0 WHERE player_id IN ('grayson_beckham','bennett_alvarado');
