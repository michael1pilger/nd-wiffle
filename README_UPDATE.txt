ND Wiffle v172 — Full Pitching Stats correction

Why v171 did not appear
-----------------------
stats/index.html declares mode, viewMode, sortKey and sortDir with top-level `let`.
Those are global lexical bindings, not properties on window.

v171 incorrectly checked:
  window.mode
  window.viewMode
  window.sortKey

So the Full Pitching override never activated even though the deployment succeeded.

v172
----
Full Stats -> Pitching now changes:

REMOVED:
- GP
- HR
- WP

ADDED:
- BAA  (Batting Average Against)
- OBPA (On-Base Percentage Against)

Resulting section of the full pitching table:
  ... IP, BF, R, ER, H, BB, BB%, Pitching K, K%, BAA, OBPA, ERA, WHIP, FIP

Formulas:
  BAA  = H / (BF - BB)
  OBPA = (H + BB) / BF

Historical stored BAA/OOBP values are used where present.
2026 regular season, 2026 playoffs, career, and future D1 rows derive them from BF/BB/H.

Both BAA and OBPA remain sortable.

No SQL migration is required.

Install
-------
Merge assets/, functions/, and BUILD_VERSION.txt into the repo.

CMD:
cd /d "C:\PATH\TO\YOUR\nd-wiffle"
git status --short
git add assets functions BUILD_VERSION.txt
git commit -m "Fix full pitching stats columns"
git push origin main
