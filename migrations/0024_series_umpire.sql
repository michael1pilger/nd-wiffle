ALTER TABLE scheduled_series ADD COLUMN umpire_player_id TEXT REFERENCES players(player_id);
ALTER TABLE scheduled_series ADD COLUMN umpire_name TEXT;
