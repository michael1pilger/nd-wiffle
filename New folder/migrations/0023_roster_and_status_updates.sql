SELECT 1;

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ryan_allen','Ryan Allen',NULL,0);
UPDATE players SET name='Ryan Allen', retired=0 WHERE player_id='ryan_allen';
DELETE FROM team_rosters WHERE season=2026 AND player_id='ryan_allen';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'ryan_allen','zyns','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('tim_gannon','Tim Gannon',NULL,0);
UPDATE players SET name='Tim Gannon', retired=0 WHERE player_id='tim_gannon';
DELETE FROM team_rosters WHERE season=2026 AND player_id='tim_gannon';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'tim_gannon','zyns','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('bennett_ruskusky','Bennett Ruskusky',NULL,0);
UPDATE players SET name='Bennett Ruskusky', retired=0 WHERE player_id='bennett_ruskusky';
DELETE FROM team_rosters WHERE season=2026 AND player_id='bennett_ruskusky';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'bennett_ruskusky','zyns','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('dom_ford','Dom Ford',NULL,0);
UPDATE players SET name='Dom Ford', retired=0 WHERE player_id='dom_ford';
DELETE FROM team_rosters WHERE season=2026 AND player_id='dom_ford';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'dom_ford','storm','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('smith_mcgruder','Smith McGruder',NULL,0);
UPDATE players SET name='Smith McGruder', retired=0 WHERE player_id='smith_mcgruder';
DELETE FROM team_rosters WHERE season=2026 AND player_id='smith_mcgruder';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'smith_mcgruder','zyns','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('charlie_van_dyke','Charlie Van Dyke',NULL,0);
UPDATE players SET name='Charlie Van Dyke', retired=0 WHERE player_id='charlie_van_dyke';
DELETE FROM team_rosters WHERE season=2026 AND player_id='charlie_van_dyke';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'charlie_van_dyke','silverbacks','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jose_aranda','Jose Aranda',NULL,0);
UPDATE players SET name='Jose Aranda', retired=0 WHERE player_id='jose_aranda';
DELETE FROM team_rosters WHERE season=2026 AND player_id='jose_aranda';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'jose_aranda','silverbacks','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('matt_gough','Matt Gough',NULL,0);
UPDATE players SET name='Matt Gough', retired=0 WHERE player_id='matt_gough';
DELETE FROM team_rosters WHERE season=2026 AND player_id='matt_gough';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'matt_gough','zyns','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('connor_wible','Connor Wible',NULL,0);
UPDATE players SET name='Connor Wible', retired=0 WHERE player_id='connor_wible';
DELETE FROM team_rosters WHERE season=2026 AND player_id='connor_wible';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'connor_wible','zyns','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('peter_dolezal','Peter Dolezal',NULL,0);
UPDATE players SET name='Peter Dolezal', retired=0 WHERE player_id='peter_dolezal';
DELETE FROM team_rosters WHERE season=2026 AND player_id='peter_dolezal';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'peter_dolezal','dirty-dawgs','player','migration-v86');

INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('matthew_nugent','Matthew Nugent',NULL,0);
UPDATE players SET name='Matthew Nugent', retired=0 WHERE player_id='matthew_nugent';
DELETE FROM team_rosters WHERE season=2026 AND player_id='matthew_nugent';
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) VALUES(2026,'matthew_nugent','zyns','player','migration-v86');

UPDATE players SET retired=0 WHERE player_id='ralph_gonzalez';
