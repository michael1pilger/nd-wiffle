-- ND Wiffle does not track hit-by-pitch.
-- Deploy v102 code first, then run these statements ONE AT A TIME in D1.
ALTER TABLE batting_series_stats DROP COLUMN hbp;
ALTER TABLE pitching_series_stats DROP COLUMN hbp;
