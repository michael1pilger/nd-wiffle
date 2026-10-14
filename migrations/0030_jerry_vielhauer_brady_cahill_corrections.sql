-- v141: consolidated 2026 stat corrections
-- Run this migration instead of the superseded 0029 migration.

-- Jerry Vielhauer: add one recorded pitching out to his most recent 2026 series.
UPDATE pitching_series_stats
SET outs_recorded = outs_recorded + 1
WHERE player_id='jerry_vielhauer'
  AND series_id=(
    SELECT ps.series_id
    FROM pitching_series_stats ps
    JOIN series s ON s.series_id=ps.series_id
    WHERE s.season=2026 AND ps.player_id='jerry_vielhauer'
    ORDER BY s.series_date DESC, ps.series_id DESC
    LIMIT 1
  );

-- Brady Cahill: correct his most recent 2026 batting series to:
-- 5-for-11, 3 singles, 0 doubles, 1 triple, 1 HR, 4 BB, 6 K, 6 RBI.
-- PA remains 15. Runs and games_played are intentionally left unchanged.
UPDATE batting_series_stats
SET pa=15,
    ab=11,
    hits=5,
    singles=3,
    doubles=0,
    triples=1,
    hr=1,
    rbi=6,
    bb=4,
    so=6
WHERE player_id='brady_cahill'
  AND series_id=(
    SELECT bs.series_id
    FROM batting_series_stats bs
    JOIN series s ON s.series_id=bs.series_id
    WHERE s.season=2026 AND bs.player_id='brady_cahill'
    ORDER BY s.series_date DESC, bs.series_id DESC
    LIMIT 1
  );
