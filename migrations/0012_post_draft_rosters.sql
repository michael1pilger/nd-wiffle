PRAGMA foreign_keys = ON;

-- v50: authoritative post-draft roster state.
CREATE TABLE IF NOT EXISTS team_rosters (
  season INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(team_id),
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','captain','protected')),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by TEXT NOT NULL,
  PRIMARY KEY (season, player_id)
);
CREATE INDEX IF NOT EXISTS idx_team_rosters_season_team ON team_rosters(season, team_id);

-- Preserve identities already created during the draft while using final roster names.
UPDATE players SET name='Joe Dachnowicz' WHERE name='Joseph Dachnowicz' COLLATE NOCASE
  AND NOT EXISTS (SELECT 1 FROM players WHERE name='Joe Dachnowicz' COLLATE NOCASE);
UPDATE players SET name='Stephen Sclafani' WHERE name='Stephen Sclafani' COLLATE NOCASE
  AND NOT EXISTS (SELECT 1 FROM players WHERE name='Stephen Sclafani' COLLATE NOCASE);
UPDATE players SET name='Max Busk' WHERE name='Maximilian Busk' COLLATE NOCASE
  AND NOT EXISTS (SELECT 1 FROM players WHERE name='Max Busk' COLLATE NOCASE);

-- Remove old 2026 assignments for the nine drafted teams. Zyns are left untouched.
DELETE FROM team_rosters WHERE season=2026 AND team_id<>'zyns';

-- Ensure every final-roster player exists. Existing players keep their historical identity.
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('michael_pilger','Michael Pilger',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('will_stevens','Will Stevens',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('gerard_sharkey','Gerard Sharkey',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('landon_edwards','Landon Edwards',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('xavier_hirsch','Xavier Hirsch',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jimmy_suter','Jimmy Suter',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('collin_barker','Collin Barker',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('vasco_esquivel','Vasco Esquivel',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('anthony_bellone','Anthony Bellone',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('freddy_rudolph','Freddy Rudolph',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('johnny_carey','Johnny Carey',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('john_savage','John Savage',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('liam_lyon','Liam Lyon',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('brendan_mato','Brendan Mato',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('sam_spolyar','Sam Spolyar',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('tommy_wollscheid','Tommy Wollscheid',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('brady_cahill','Brady Cahill',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('quinn_brown','Quinn Brown',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('nick_swiderski','Nick Swiderski',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jaden_lukose','Jaden Lukose',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('will_carter_v','Will Carter V',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('alex_tsvetkov','Alex Tsvetkov',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jack_conners','Jack Conners',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('patrick_gareau','Patrick Gareau',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jacob_clark','Jacob Clark',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('joey_thomalla','Joey Thomalla',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jimmy_szpak','Jimmy Szpak',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('diego_alonso','Diego Alonso',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('logan_bettinger','Logan Bettinger',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('freddy_zeckser','Freddy Zeckser',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('bennett_alvarado','Bennett Alvarado',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('zach_zywiec','Zach Zywiec',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('anthony_lucatuorto','Anthony Lucatuorto',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('aiden_o_reilly','Aiden O''Reilly',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ben_jollay','Ben Jollay',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('charlie_doherty','Charlie Doherty',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('andrew_le','Andrew Le',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jacob_olejnik','Jacob Olejnik',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ian_phelps','Ian Phelps',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('chase_niemeyer','Chase Niemeyer',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('dean_zervos','Dean Zervos',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('nik_husarik','Nik Husarik',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('danny_kennedy','Danny Kennedy',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('rainier_gilliss','Rainier Gilliss',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('charlie_chevalier','Charlie Chevalier',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('michael_budd','Michael Budd',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('kevin_harnish','Kevin Harnish',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('chuck_menard','Chuck Menard',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jimmy_redfern','Jimmy Redfern',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('johnny_toole','Johnny Toole',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('andrew_frey','Andrew Frey',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('kevin_curran','Kevin Curran',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('joe_o_melveny','Joe O''Melveny',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('connor_savage','Connor Savage',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jacob_bailey','Jacob Bailey',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('liam_kaseburg','Liam Kaseburg',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('christopher_marvel','Christopher Marvel',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('liam_hill','Liam Hill',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('donny_edwards','Donny Edwards',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('sebastian_borjas','Sebastian Borjas',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('evan_reid','Evan Reid',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jt_kaiser','JT Kaiser',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('alex_rivera','Alex Rivera',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jp_cardenas','JP Cardenas',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('tim_baldwin','Tim Baldwin',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('nick_hulgrave','Nick Hulgrave',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jeb_blanco','Jeb Blanco',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('james_baird','James Baird',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('teddy_skendzel','Teddy Skendzel',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jack_powers','Jack Powers',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('noah_adkins','Noah Adkins',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('nathan_skendzel','Nathan Skendzel',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('noah_cerniglia','Noah Cerniglia',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('luke_gormsen','Luke Gormsen',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('eddie_mcgettigan','Eddie McGettigan',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('will_cohn','Will Cohn',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ben_meyer','Ben Meyer',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('silas_carder','Silas Carder',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('matt_schuenemann','Matt Schuenemann',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jacob_bechtel','Jacob Bechtel',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('patrick_collins','Patrick Collins',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('michael_camilleri','Michael Camilleri',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('max_busk','Max Busk',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('patrick_jackson','Patrick Jackson',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('justin_murray','Justin Murray',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('tad_bates','Tad Bates',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ryan_soenen','Ryan Soenen',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ben_hicks','Ben Hicks',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jason_marrs','Jason Marrs',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('camden_kirchgessner','Camden Kirchgessner',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jason_aranda','Jason Aranda',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('oscar_uy','Oscar Uy',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('adam_skrzypczyck','Adam Skrzypczyck',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('kirby_bach','Kirby Bach',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ryan_mccain','Ryan McCain',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jerry_vielhauer','Jerry Vielhauer',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('isaac_oswald','Isaac Oswald',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('bobby_wolff','Bobby Wolff',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('joe_dachnowicz','Joe Dachnowicz',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ryan_hyer','Ryan Hyer',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('jack_dunn','Jack Dunn',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('stephen_scalfani','Stephen Sclafani',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('robby_diamond','Robby Diamond',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('george_devlin','George Devlin',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('ryan_walsh','Ryan Walsh',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('rob_marshall','Rob Marshall',NULL,0);
INSERT OR IGNORE INTO players(player_id,name,class_year,retired) VALUES('dan_smith','Dan Smith',NULL,0);

-- Every player on a final 2026 roster is active.
UPDATE players SET retired=0 WHERE name IN ('Michael Pilger','Will Stevens','Gerard Sharkey','Landon Edwards','Xavier Hirsch','Jimmy Suter','Collin Barker','Vasco Esquivel','Anthony Bellone','Freddy Rudolph','Johnny Carey','John Savage','Liam Lyon','Brendan Mato','Sam Spolyar','Tommy Wollscheid','Brady Cahill','Quinn Brown','Nick Swiderski','Jaden Lukose','Will Carter V','Alex Tsvetkov','Jack Conners','Patrick Gareau','Jacob Clark','Joey Thomalla','Jimmy Szpak','Diego Alonso','Logan Bettinger','Freddy Zeckser','Bennett Alvarado','Zach Zywiec','Anthony Lucatuorto','Aiden O''Reilly','Ben Jollay','Charlie Doherty','Andrew Le','Jacob Olejnik','Ian Phelps','Chase Niemeyer','Dean Zervos','Nik Husarik','Danny Kennedy','Rainier Gilliss','Charlie Chevalier','Michael Budd','Kevin Harnish','Chuck Menard','Jimmy Redfern','Johnny Toole','Andrew Frey','Kevin Curran','Joe O''Melveny','Connor Savage','Jacob Bailey','Liam Kaseburg','Christopher Marvel','Liam Hill','Donny Edwards','Sebastian Borjas','Evan Reid','JT Kaiser','Alex Rivera','JP Cardenas','Tim Baldwin','Nick Hulgrave','Jeb Blanco','James Baird','Teddy Skendzel','Jack Powers','Noah Adkins','Nathan Skendzel','Noah Cerniglia','Luke Gormsen','Eddie McGettigan','Will Cohn','Ben Meyer','Silas Carder','Matt Schuenemann','Jacob Bechtel','Patrick Collins','Michael Camilleri','Max Busk','Patrick Jackson','Justin Murray','Tad Bates','Ryan Soenen','Ben Hicks','Jason Marrs','Camden Kirchgessner','Jason Aranda','Oscar Uy','Adam Skrzypczyck','Kirby Bach','Ryan McCain','Jerry Vielhauer','Isaac Oswald','Bobby Wolff','Joe Dachnowicz','Ryan Hyer','Jack Dunn','Stephen Sclafani','Robby Diamond','George Devlin','Ryan Walsh','Rob Marshall','Dan Smith');

-- Clear class year only for players who were not in the pre-draft registry.
UPDATE players SET class_year=NULL WHERE name IN ('Landon Edwards','Jimmy Suter','Collin Barker','Freddy Rudolph','Johnny Carey','John Savage','Liam Lyon','Sam Spolyar','Tommy Wollscheid','Brady Cahill','Nick Swiderski','Will Carter V','Jack Conners','Patrick Gareau','Logan Bettinger','Freddy Zeckser','Bennett Alvarado','Zach Zywiec','Ben Jollay','Charlie Doherty','Andrew Le','Ian Phelps','Dean Zervos','Rainier Gilliss','Kevin Harnish','Chuck Menard','Andrew Frey','Kevin Curran','Jacob Bailey','Liam Kaseburg','Christopher Marvel','Liam Hill','Donny Edwards','Alex Rivera','Tim Baldwin','Noah Adkins','Eddie McGettigan','Will Cohn','Silas Carder','Jacob Bechtel','Patrick Collins','Max Busk','Ryan Soenen','Ben Hicks','Jason Marrs','Camden Kirchgessner','Jason Aranda','Oscar Uy','Adam Skrzypczyck','Kirby Bach','Joe Dachnowicz','Ryan Hyer','Stephen Sclafani','Robby Diamond','George Devlin','Ryan Walsh','Rob Marshall','Dan Smith');

-- Load the final post-trade rosters.
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','captain','post-draft-v50' FROM players WHERE name='Michael Pilger' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','protected','post-draft-v50' FROM players WHERE name='Will Stevens' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Gerard Sharkey' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Landon Edwards' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Xavier Hirsch' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Jimmy Suter' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Collin Barker' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Vasco Esquivel' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Anthony Bellone' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Freddy Rudolph' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Johnny Carey' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='John Savage' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'storm','player','post-draft-v50' FROM players WHERE name='Liam Lyon' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','captain','post-draft-v50' FROM players WHERE name='Brendan Mato' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Sam Spolyar' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Tommy Wollscheid' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Brady Cahill' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Quinn Brown' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Nick Swiderski' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Jaden Lukose' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Will Carter V' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Alex Tsvetkov' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Jack Conners' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'stiff-wifflers','player','post-draft-v50' FROM players WHERE name='Patrick Gareau' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','captain','post-draft-v50' FROM players WHERE name='Jacob Clark' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','protected','post-draft-v50' FROM players WHERE name='Joey Thomalla' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Jimmy Szpak' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Diego Alonso' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Logan Bettinger' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Freddy Zeckser' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Bennett Alvarado' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Zach Zywiec' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Anthony Lucatuorto' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Aiden O''Reilly' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Ben Jollay' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Charlie Doherty' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'midnight','player','post-draft-v50' FROM players WHERE name='Andrew Le' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','captain','post-draft-v50' FROM players WHERE name='Jacob Olejnik' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Ian Phelps' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Chase Niemeyer' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Dean Zervos' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Nik Husarik' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Danny Kennedy' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Rainier Gilliss' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Charlie Chevalier' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Michael Budd' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Kevin Harnish' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'goofy-goobers','player','post-draft-v50' FROM players WHERE name='Chuck Menard' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','captain','post-draft-v50' FROM players WHERE name='Jimmy Redfern' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','protected','post-draft-v50' FROM players WHERE name='Johnny Toole' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Andrew Frey' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Kevin Curran' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Joe O''Melveny' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Connor Savage' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Jacob Bailey' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Liam Kaseburg' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Christopher Marvel' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Liam Hill' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Donny Edwards' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'dirty-dawgs','player','post-draft-v50' FROM players WHERE name='Sebastian Borjas' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','captain','post-draft-v50' FROM players WHERE name='Evan Reid' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','protected','post-draft-v50' FROM players WHERE name='JT Kaiser' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Alex Rivera' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='JP Cardenas' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Tim Baldwin' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Nick Hulgrave' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Jeb Blanco' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='James Baird' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Teddy Skendzel' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Jack Powers' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Noah Adkins' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Nathan Skendzel' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'ball-busters','player','post-draft-v50' FROM players WHERE name='Noah Cerniglia' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','captain','post-draft-v50' FROM players WHERE name='Luke Gormsen' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Eddie McGettigan' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Will Cohn' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Ben Meyer' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Silas Carder' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Matt Schuenemann' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Jacob Bechtel' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Patrick Collins' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Michael Camilleri' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Max Busk' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Patrick Jackson' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'twin-titans','player','post-draft-v50' FROM players WHERE name='Justin Murray' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','captain','post-draft-v50' FROM players WHERE name='Tad Bates' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Ryan Soenen' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Ben Hicks' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Jason Marrs' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Camden Kirchgessner' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Jason Aranda' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Oscar Uy' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Adam Skrzypczyck' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Kirby Bach' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'silverbacks','player','post-draft-v50' FROM players WHERE name='Ryan McCain' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','captain','post-draft-v50' FROM players WHERE name='Jerry Vielhauer' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','protected','post-draft-v50' FROM players WHERE name='Isaac Oswald' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Bobby Wolff' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Joe Dachnowicz' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Ryan Hyer' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Jack Dunn' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Stephen Sclafani' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Robby Diamond' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='George Devlin' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Ryan Walsh' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Rob Marshall' COLLATE NOCASE;
INSERT INTO team_rosters(season,player_id,team_id,role,assigned_by) SELECT 2026,player_id,'underdawgs','player','post-draft-v50' FROM players WHERE name='Dan Smith' COLLATE NOCASE;
