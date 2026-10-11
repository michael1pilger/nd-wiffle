-- v134: Jerry Vielhauer pitching correction (+1 out recorded)
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
