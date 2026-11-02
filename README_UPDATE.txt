ND WIFFLE — HISTORICAL STANDINGS + HEAD-TO-HEAD PATCH
Prepared 2026-11-02

WHAT THIS PATCH DOES
- Adds 2021-2025 reconstructed regular-season series history.
- Adds 2021-2025 postseason series history.
- Uses live D1 data for 2026 results.
- Adds historical head-to-head filters and matchup records.
- Updates team pages to show reconstructed historical season W-L instead of superseded hardcoded records.
- Adds dynamic all-time game W-L, series W-L, and postseason history.
- Does not touch accounts, wagers, Grid leaderboard files, commissioner tools, or current 2026 game data.

FILES/FOLDERS TO COPY INTO YOUR ND-WIFFLE REPO
- assets/
- functions/
- migrations/
- teams/

WINDOWS UPDATE METHOD
1. Extract this ZIP somewhere temporary.
2. Open your local nd-wiffle project folder.
3. Copy the four folders above into the project root.
4. Choose "Replace the files in the destination" / merge folders when Windows asks.
   DO NOT delete your existing folders first.

DATABASE — DO THIS BEFORE PUSHING THE WEBSITE
Recommended Cloudflare D1 Console method:
1. Open Cloudflare Dashboard > D1 > your production ND Wiffle database > Console.
2. Open migrations/historical_h2h_console/00_CREATE_HISTORICAL_TABLE.sql and run it.
3. Run 01_IMPORT_HISTORY.sql through 09_IMPORT_HISTORY.sql IN ORDER.
4. Run 10_VERIFY.sql.
5. Expected historical totals:
   regular = 162
   playoff = 27
   total = 189

Alternative if you use your normal migration runner:
- Apply migrations/0036_historical_h2h_schema.sql
- Then migrations/0037_historical_h2h_seed.sql

GIT
From Command Prompt in the nd-wiffle repo:
  git status --short
  git add assets functions migrations teams
  git commit -m "Add historical standings and head-to-head records"
  git push origin main

AFTER DEPLOYMENT — CHECK
1. https://ndwiffle.com/api/public/history
   Expected: ok:true and historical_count:189
2. https://ndwiffle.com/teams/
3. Open several team pages, for example:
   /teams/storm/
   /teams/silverbacks/
   /teams/midnight/
4. Test historical H2H filters and season filters.
5. Confirm existing Grid, Account, Predictions, and Admin pages still load normally.

IMPORTANT DATA NOTES
- 2021 contains source-score conflicts in some logged series; the reconstructed commissioner series ledger is used for displayed W-L.
- Reconstructed 2023 Goobers record is 9-15 even though an older standings image showed 10-14.
- Historical playoff records are team-level series/game records; this patch does not invent historical player playoff batting/pitching stats.
- 2026 remains live from the existing D1 series/games tables.
