ND WIFFLE SEASON CLOSEOUT + COMMISSIONER HANDOFF v164
======================================================

WHAT THIS PATCH DOES
--------------------
1. Adds /admin/season-tools/ so a commissioner can add/delete No-Hitters and Perfect Games without SQL.
2. Adds D1-backed exact playoff stat scopes for 2026 and future playoff seasons.
3. /stats/ automatically discovers available seasons and shows:
   - Career
   - Playoffs (All Time)
   - 2026 Playoffs (and future playoff seasons automatically)
   - each regular season year
4. Removes the separate Playoff Leaders button from /leaders/; postseason leaders now live in /stats/.
5. A completed World Series causes the champion row in the 2026 bracket to glow.
6. Awards 2026 postseason status is derived from published playoff results, including Champions / Runner-up.
7. Expands /api/admin/health into a commissioner-facing diagnostic check with actionable error messages.
8. Stages Spring League as a separate SPRING_DB architecture. It is NOT connected or initialized yet.

INSTALL - NORMAL FOLDER REPLACEMENT WORKFLOW
--------------------------------------------
1. Extract this ZIP.
2. Copy ALL contents into the root of your existing nd-wiffle repo.
3. Choose Merge / Replace files in destination. DO NOT delete the existing folders first.
4. Commit and push:

   git status --short
   git add .
   git commit -m "Season closeout and commissioner handoff"
   git push origin main

5. In Cloudflare D1 -> PRIMARY production DB -> Console, run ONE migration:

   migrations/0039_pitching_feats_admin.sql

6. DO NOT RUN this file in the primary DB:

   spring/migrations/0001_spring_schema.sql

   That schema is reserved for a future, separate SPRING_DB database.

VERIFY
------
Public browser checks:
  https://ndwiffle.com/api/public/stats-meta
    should include: "build":"stats-meta-v164"

  https://ndwiffle.com/api/public/pitching-feats
    after migration 0039 should include: "build":"pitching-feats-v164"

Admin checks:
  https://ndwiffle.com/admin/season-tools/
    should show: Commissioner Tools · HANDOFF v164

  Health should show:
    - FK Issues = 0
    - playoff game schema supports up to 7
    - pitching feats schema installed
    - World Series champion recognized after the final series is complete

STATS BEHAVIOR
--------------
2021-2025 playoff stats remain the existing inferred historical reconstruction.
2026 and later playoff stats come exactly from published D1 playoff series.
"Playoffs (All Time)" combines the inferred 2021-2025 data with exact D1 postseason data from 2026 onward.
Future playoff years appear automatically once playoff series are published in D1.

SPRING LEAGUE
-------------
See spring/README.md and HANDOFF.md.
The only cross-league connector is player_id.
Spring teams/games/stats must NEVER be inserted into the primary fall career DB.
