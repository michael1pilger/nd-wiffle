# ND Wiffle League Website v30

v26 connects the public 2026 league pages to D1.

## Public D1 API
- `GET /api/public/league?season=2026`
- public/read-only; no commissioner Access token required on production
- returns published games, standings, normalized batting, normalized pitching, pitcher decisions, and participant/team history
- response uses short cache headers and the pages request `no-store` while testing

## 2026 Standings
- `/standings/` now loads W, L, PCT, GB, RS, RA, and DIFF from D1
- all nine active 2026 teams remain visible before their first game
- top seven playoff cutoff remains
- static preseason table is retained as a fallback if the API is unavailable

## Stats
- adds a 2026 season option
- 2026 batting/pitching rows come from D1
- Career view combines the static 2021–2025 cumulative database with official D1 2026 counting stats
- derived batting rates are recalculated from combined counting stats
- pitching IP is aggregated internally as outs; ERA and WHIP are recalculated

## Players
- career stat cards automatically add official 2026 D1 totals
- 2026 is eligible for best-season summaries
- team history is augmented from published 2026 series participants

## Important
The current static historical database is treated as the authoritative 2021–2025 base. D1 is treated as the authoritative source for 2026 onward. Do not manually add 2026 cumulative totals to `assets/data.js` while this hybrid model is in use, or career totals would double count 2026.


## v27 safety fix
- WP, LP, and SV dropdowns only include players detected in the uploaded pitching files.
- Server-side publish validation rejects WP/LP/SV values for players who do not appear in normalized pitching stats.
- Included Storm/Stiffies sample uses Brendan Mato as Game 2 WP, Will Stevens as LP, and no save.
- This prevents a non-pitcher such as Jack Foster from accidentally being stored as a pitcher decision.


## v28 deployment verification
- Admin page visibly displays BUILD v28.
- `/api/admin/health` returns `build: "v28"`.
- `/api/public/league` returns `build: "v28"`.
- Public API caching is disabled while the publishing pipeline is being verified.
- Retains v27 pitcher-only decision enforcement.

## v29 deployment verification
- Admin page visibly shows `BUILD v29`.
- `/api/admin/health` returns `"build":"v29"`.
- `/api/public/league` returns `"build":"v29"`.
- `BUILD_VERSION.txt` is a new root file so GitHub Desktop must show a change.
- Public API uses `Cache-Control: no-store` during verification.

## v30: automatic rookie creation with commissioner review
- `/admin/` checks every active uploaded name against D1 after parsing.
- Exact player-name and player-alias matches resolve automatically.
- Similar names are flagged with up to three possible existing matches.
- Names with no plausible match are still visibly flagged; they are never silently created.
- A commissioner must explicitly choose `Confirm as new player` for a new player.
- Class year is mandatory for a confirmed new player only. Existing players do not require class-year entry.
- Publish generates a deterministic D1 player ID and inserts the new player in the same D1 batch as the series.
- The original iScore name remains in the payload for auditability through `player_resolutions`.
- Server-side validation repeats the identity checks and refuses unconfirmed/invalid new players.
