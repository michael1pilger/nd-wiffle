-- v147: Luke Gormsen batting correction
-- Convert one 2026 home run into a triple in his most recent series containing an HR.
UPDATE batting_series_stats
SET hr = hr - 1,
    triples = triples + 1
WHERE player_id='luke_gormsen'
  AND hr > 0
  AND series_id=(
    SELECT bs.series_id
    FROM batting_series_stats bs
    JOIN series s ON s.series_id=bs.series_id
    WHERE s.season=2026 AND bs.player_id='luke_gormsen' AND bs.hr>0
    ORDER BY s.series_date DESC, bs.series_id DESC
    LIMIT 1
  );
