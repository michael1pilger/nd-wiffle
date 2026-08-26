SELECT 1;
UPDATE players SET name='Stephen Sclafani'
WHERE name='Stephen Scalfani' COLLATE NOCASE
AND NOT EXISTS (SELECT 1 FROM players WHERE name='Stephen Sclafani' COLLATE NOCASE);
INSERT OR REPLACE INTO player_aliases(alias,player_id)
SELECT 'Stephen Scalfani',player_id FROM players WHERE name='Stephen Sclafani' COLLATE NOCASE;
