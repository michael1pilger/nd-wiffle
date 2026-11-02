ND WIFFLE — H2H MATRIX + PLAYER MATCHUP UI PATCH

This patch is designed for the normal folder-replacement workflow.

FILES CHANGED
- assets/historical-h2h.js
- functions/api/public/history.js

NO NEW MIGRATION IS REQUIRED.
The existing historical migrations 0036/0037 stay as-is.

INSTALL
1. Extract this ZIP.
2. Copy the `assets` and `functions` folders into your existing nd-wiffle repo.
3. When Windows asks, choose to merge folders / replace the matching files.
4. From Command Prompt in the repo:

   git status --short
   git add assets functions
   git commit -m "Add historical H2H matrix and player matchup views"
   git push origin main

VERIFY AFTER DEPLOY
- /teams/ should show the 10-team logo matrix.
- Any team page should show the same matrix with that franchise highlighted.
- Competition toggle: All Time / Regular Season / Playoffs.
- Matrix record toggle: Series / Games.
- Clicking a matrix cell should drill the detail sections into that matchup.
- Players vs. opponents should show recorded 2026 series participants and a coverage note.
- /api/public/history should return version `2026-history-v2` and include `player_coverage`.
