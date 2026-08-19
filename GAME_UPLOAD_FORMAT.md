# 2026 iScore Game Upload Naming

Do not edit the CSV rows produced by iScore.

For each game, create one folder:

YYYY-MM-DD_away-team_home-team_gN

Example:
2026-08-28_midnight_storm_g1/

Inside it, rename the four iScore exports exactly:

away_batting.csv
away_pitching.csv
home_batting.csv
home_pitching.csv

From the folder name and these filenames, an automated updater can infer:
- season
- date
- away team
- home team
- game number
- batting vs pitching
- home vs away

The updater should rebuild all 2026 totals from the raw game folders each run instead of incrementally adding new rows. This prevents duplicate counting and makes corrections safe.
