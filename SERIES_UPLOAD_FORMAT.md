# 2026 iScore Series Upload Workflow

Because iScore keeps all three games of a series in one stat export, do NOT split the batting/pitching CSV totals into three fake game files.

Use one folder per series:

YYYY-MM-DD_away-team_home-team_series/

Example:
2026-08-28_midnight_storm_series/

Inside:
away_batting.csv
away_pitching.csv
home_batting.csv
home_pitching.csv
series_games.csv

The four iScore CSVs contain the aggregate statistics from the entire 3-game series.

series_games.csv contains only game-level information that cannot safely be recovered from the aggregate stat files:

game,away_score,home_score,winning_pitcher,losing_pitcher,save_pitcher
1,4,2,Michael Pilger,Jack Terry,
2,1,3,Joey Thomalla,William Stevens,
3,6,5,Michael Pilger,Joey Thomalla,Patrick Sullivan

save_pitcher may be blank.

The updater should:
1. Aggregate batting and pitching counting stats from the four iScore series CSVs.
2. Ignore W, L, and SV columns from the aggregate pitching exports.
3. Rebuild pitcher W/L/S from series_games.csv instead.
4. Count three team games from series_games.csv for standings and game totals.
5. Use away_score/home_score to update W/L, RS, RA, DIFF and GB.
6. Rebuild all 2026 totals from all series folders every run.

This prevents aggregate 9-inning series exports from incorrectly treating the entire series as one pitching decision.
