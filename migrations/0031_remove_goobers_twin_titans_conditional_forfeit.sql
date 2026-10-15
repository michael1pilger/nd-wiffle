-- v143: remove the 2026 Goofy Goobers vs Twin Titans conditional forfeit.
-- The series is expected to be physically played, so the temporary standings
-- adjustment must be removed before the played series is published.
DELETE FROM series
WHERE season=2026
  AND (
    (away_team_id='goofy-goobers' AND home_team_id='twin-titans')
    OR
    (away_team_id='twin-titans' AND home_team_id='goofy-goobers')
  )
  AND json_extract(payload_json,'$.series_type')='conditional_forfeit';
