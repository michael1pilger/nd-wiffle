# ND Wiffle League Website v39

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

## v31: homepage series results
- Adds a live `Recent Series` section immediately below the 2026 season banner.
- Reads official 2026 games from the existing public D1 API.
- Groups each three-game set into one series card.
- Shows series winner, series record, individual game scores, team logos, and series date.
- Displays the six most recent published series.
- Shows a clean preseason empty state until the first 2026 series is published.

## v32
- Adds the user-supplied South Quad wiffleball photo beside `The Home of ND Wiffleball`.
- Uses the actual supplied photo, with web compression only.
- New default Grid:
  - Rows: 10+ Career RBI / Goobers / .900+ Career OPS
  - Columns: 5+ Career HR / 50+ Career PA / Midnight
- All existing Grid rarity, scoring, compact team-logo, answer-rank, and New Grid behavior is retained.

## v33: public results experience
- Adds `GET /api/public/results?season=2026` for normalized series-level public data.
- Homepage Recent Series cards now show top batter, top pitcher, and `View Series`.
- Adds `/results/` as a chronological archive of every published 2026 series.
- Results cards expand to show:
  - all three game scores
  - WP / LP / SV for each game
  - top batter and top pitcher
  - full series batting box scores for both teams
  - full series pitching box scores for both teams
- `View Series` links from the homepage deep-link to the correct expanded series.
- Adds Results to the site navigation.

## v34: live schedule
- Keeps the authoritative 36-series 2026 home/away schedule.
- Treats each matchup as one three-game series event rather than three separate scheduled games.
- Normal public state is intentionally simple: `Upcoming` or `Final`.
- When a completed series is published through `/admin`, the matching schedule card automatically becomes Final.
- Final cards show the series record, all three game scores, official date from D1, and a `View Series` deep-link.
- Adds All / Upcoming / Final and team filters.
- Rare weather delays require no special normal workflow; the commissioner publishes after the three-game set is complete.

## v35: roster management + league format
- Adds `migrations/0003_team_rosters.sql`.
- Adds Access-protected `/admin/rosters/`.
- Commissioners can assign existing registry players to 2026 teams and mark them Player / Captain / Protected.
- Commissioners can create new players before games begin; class year is required for newly created players.
- Adds `/api/admin/rosters` and read-only `/api/public/rosters?season=2026`.
- Active team pages now show a live 2026 roster.
- Player directory merges published 2026 roster assignments into team history, even before a player appears in a game.
- Homepage now contains `How ND Wiffle Works` immediately after Recent Series and before League History, covering:
  - season timing
  - 24-game schedule and 7-team playoff format
  - attendance / 4v4 norms / typical game windows
  - protected-player and compensatory-pick draft system
  - three-game series structure
  - six major ND Wiffle rule differences

## v36: Zyns return + Instagram series leaders
- Zyns are active for the 2026 season, creating a 10-team league.
- Adds `migrations/0004_activate_zyns_2026.sql` for existing D1 databases.
- 2026 schedule now contains 40 total series.
- Every team still plays exactly 8 series / 24 games.
- Every team has exactly 4 home series and 4 away series.
- The five matchups not played in 2026 are:
  - Ball Busters vs Goofy Goobers
  - Dirty Dawgs vs Stiff Wifflers
  - Midnight vs Underdawgs
  - Silverbacks vs Zyns
  - Storm vs Twin Titans
- Standings and homepage 2026 team counts now include Zyns.
- `/admin/` validation now shows an `Instagram Top 5 Performers` panel after every series.
- Batting points = total bases + RBI + BB - K.
- Pitching points = outs recorded - (2 × ER) + K - H - BB.
- Rankings use corrected normalized stats, so approved manual corrections are reflected before the commissioner copies the leaders for Instagram.
- Deterministic tie-breaks:
  - batting: total bases, RBI, BB, fewer K, name
  - pitching: K, outs, fewer ER, fewer H, fewer BB, name
- The top-five leader data is also saved in `payload.instagram_leaders` for audit/history.

## v37: League Leaders + new Grid
- Adds public `/leaders/` powered directly by the live 2026 D1 league API.
- Batting leader categories: AVG, OPS, H, HR, RBI, BB, fantasy points.
- Pitching leader categories: ERA, WHIP, K, W, saves, fantasy points.
- Adds All Players / Qualified Only toggle.
  - batting qualification: 50 PA
  - pitching qualification: 18 IP
- Adds team filtering across all 10 active 2026 teams once they have published participants.
- Fantasy points use the same formulas as the commissioner Instagram Top 5 workflow:
  - batting = TB + RBI + BB - K
  - pitching = outs - 2×ER + K - H - BB
- Adds a combined full 2026 leaderboard table for quick league-wide comparison.
- Adds Leaders to public navigation.
- Replaces the default Immaculate Grid with:
  - Rows: .400+ BA in a Season / Played for 2+ Franchises / 15+ Career Pitching K
  - Columns: Storm / .350+ Career BA / 40+ Career RBI
- All 9 new grid intersections remain prevalidated with at least 3 valid answers.

## v38: Playoff Picture + public player privacy
- Adds `/playoffs/` as a live "if the regular season ended today" playoff projection.
- Pulls current seeds directly from the 2026 D1 standings.
- Top 7 qualify and the No. 1 seed receives the first-round bye.
- First-round projection displays 2 vs 7, 3 vs 6, and 4 vs 5.
- Semifinal and World Series slots are shown as future advancement slots rather than inventing winners.
- Current seed list shows all 10 teams and clearly marks teams outside the projected playoff field.
- Adds Playoffs to public navigation.
- Max Partovi remains in the underlying database/history but is excluded from public player-facing website surfaces:
  - Players directory
  - Stats tables
  - League Leaders
  - Results box scores/top-performer summaries
  - Homepage recent-series top performers
  - live team roster tables

## v39: reusable matchup screen
- Adds `/matchup/` as a contextual screen, not a navigation tab.
- Schedule cards are now clickable and open the selected matchup.
- Homepage Recent Series links open the same matchup screen.
- Matchup names in the Results archive open the matchup screen while the rest of the result card still expands normally.
- Projected first-round matchups on the Playoff Picture can also open matchup previews.
- Matchup screen includes:
  - current standings rank
  - current W-L record and winning percentage
  - run differential
  - top 3 hitters for each team
  - top 3 pitchers for each team
  - recent three-series form
  - final three-game result when that matchup has already been played
  - link to the full box score for completed series
- Max Partovi remains filtered from matchup player-leader displays.
