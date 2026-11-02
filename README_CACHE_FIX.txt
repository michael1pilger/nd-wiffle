ND Wiffle H2H Matrix v2 - frontend cache-bust fix

Copy the assets and teams folders into the root of your nd-wiffle repo and choose Replace/Merge.
No SQL migration is needed.

This patch:
- installs the v2 historical-h2h.js matrix/player frontend
- changes every team page from historical-h2h.js?v=1 to historical-h2h.js?v=2
  so browsers/CDNs request the new frontend bundle

Then run:
  git status --short
  git add assets teams
  git commit -m "Fix H2H matrix frontend cache version"
  git push origin main

After deployment, hard-refresh /teams/ with Ctrl+Shift+R.
