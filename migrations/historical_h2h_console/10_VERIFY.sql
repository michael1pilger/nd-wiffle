-- Read only. Expected: regular=162, playoff=27, total=189.
SELECT phase, COUNT(*) AS total_series FROM historical_h2h_series GROUP BY phase;
SELECT season,phase,COUNT(*) AS total_series FROM historical_h2h_series GROUP BY season,phase ORDER BY season,phase;
SELECT COUNT(*) AS year_2023_series FROM historical_h2h_series WHERE season=2023 AND phase='regular';
