ND WIFFLE MACGUFFIN — FOLDER REPLACEMENT PATCH
================================================

WHAT THIS ADDS
- Game MacGuffin: the first recorded game winner starts the lineal title. Beat the holder in a played game and you take it.
- Series MacGuffin: the first recorded series winner starts the lineal title. Beat the holder in an official series and you take it.
- Full-series forfeits are ignored completely.
- Unplayed/forfeited individual games do not move the Game MacGuffin.
- Mutual agreements can count as official Series decisions but create no Game event.
- Current holders, current reigns, possession board, defenses, and transfer lineage on /teams/.
- 2026+ updates automatically from D1 as new games/series are published.

CURRENT RESULT FROM THE DATA USED TO BUILD THIS PATCH
- Game MacGuffin: Storm
  Current reign began: Oct. 1, 2026, Game 1 vs Ball Busters (Storm won 2-0)
  Successful defenses in the current reign through the supplied data: 8
- Series MacGuffin: Storm
  Current reign began: Oct. 1, 2026, 3-0 series win vs Ball Busters
  Successful series defenses through the supplied data: 2
- Original holder of both: Storm (2021, first recorded Midnight-Storm series)

DATA PRECISION
The Series lineage is exact from the reconstructed chronological series ledger.
The Game lineage is exact where individual game order survives. Several 2023 2-1 series and some older playoff series do not preserve complete game order. Those periods are branched mathematically instead of guessed. Every valid path reconverges, and Underdawgs is the unique Game holder entering 2026; the current Storm holder is therefore certain. Historical Game possession counts display ranges when necessary.

FILES
assets/macguffin.js
functions/api/_macguffin_history.js
functions/api/public/macguffin.js
teams/index.html

INSTALL
1. Extract this ZIP.
2. Copy the assets, functions, and teams folders into your existing nd-wiffle project folder.
3. Choose Replace/Merge when Windows asks. Do NOT delete the original folders first.
4. No D1 migration is required.
5. Commit and push:

   git status --short
   git add assets functions teams
   git commit -m "Add ND Wiffle MacGuffin history"
   git push origin main

VERIFY AFTER DEPLOYMENT
Open in the browser:
https://ndwiffle.com/api/public/macguffin

Look for:
"version":"macguffin-v1"
"holder":"storm"

Then open:
https://ndwiffle.com/teams/

Hard refresh with Ctrl+Shift+R if needed.
