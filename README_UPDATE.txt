ND WIFFLE PLAYOFF DATABASE FIX v157
==================================

WHY THIS IS NEEDED
------------------
The original D1 schema was designed around 3-game regular-season series and contains CHECK constraints capped at 3. The playoff admin now correctly supports best-of-3, best-of-5, and best-of-7 series, but D1 will reject Game 4+ until this migration is applied.

THIS MIGRATION EXPANDS:
- games.game_number: 1-3 -> 1-7
- series_participants.games_played: 1-3 -> 1-7
- batting_series_stats.games_played: 1-3 -> 1-7
- pitching_series_stats.games_played: 1-3 -> 1-7
- pitching_series_stats.appearances: 1-3 -> 1-7
- pitching_series_stats.starts: 0-3 -> 0-7

Existing data is copied into replacement tables and retained.

INSTALL
-------
1. Paste/merge the migrations folder into the root of your nd-wiffle repo.
2. In Cloudflare D1 -> your production database -> Console, open and run:
   migrations/0038_expand_playoff_series_game_limits.sql
3. PRAGMA foreign_key_check should return no rows.
4. Re-try publishing the semifinal series.

IMPORTANT
---------
This is a DATABASE migration. Merely git-pushing the SQL file does not change the production D1 schema unless your deployment process automatically executes migrations. If you normally run migrations manually in the D1 Console, run 0038 there before publishing.

No existing series, games, batting stats, pitching stats, or participants should be deleted by this migration.
