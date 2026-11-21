ND Wiffle v167 — Career stats include modern playoffs

Problem fixed
-------------
Career totals on /stats/ and /players/ were using:
  historical career through 2025 + 2026 regular season

They were NOT adding the exact 2026 playoff rows that already exist in D1.

v167 changes the aggregation rule to:
  historical career through 2025
  + every D1 regular-season stat from 2026 onward
  + every D1 playoff stat from 2026 onward

This means 2026 playoff batting/pitching and pitcher decisions now count toward career totals.

Files
-----
assets/hof.js
assets/career-modern.js
functions/stats/_middleware.js
functions/players/_middleware.js
BUILD_VERSION.txt

No SQL / D1 migration is required.

Why the middleware exists
-------------------------
The current HTML still references older cache keys such as /assets/hof.js?v=147.
The route middleware rewrites that request to /assets/hof.js?v=167 and sends the
Stats/Players HTML with cache-control: no-store. This prevents an old browser/CDN
copy from silently bypassing the fix.

Verification
------------
1. Deploy the folders/files.
2. Open /stats/ and choose Career.
3. Confirm the note says career totals include exact D1 regular season + playoffs.
4. Compare a known 2026 playoff contributor against the 2026 Playoffs view.
   Career should equal the historical career baseline + 2026 regular + 2026 playoffs.
5. Open /players/. The player cards should include the same postseason production.
6. Individual /player/?id=... pages already included 2026 playoffs and were not changed.

Install
-------
Copy assets/, functions/, and BUILD_VERSION.txt into the repo root and merge/replace.

CMD:
  git status --short
  git add assets functions BUILD_VERSION.txt
  git commit -m "Include modern playoffs in career stats"
  git push origin main
