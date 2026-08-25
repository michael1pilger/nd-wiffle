# ND Wiffle League Website v58

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

## v40: Live Draft
- Adds `migrations/0005_draft_2026.sql`.
- Adds protected `/admin/draft/` and public `/draft/`.
- Zyns are explicitly non-drafting.
- Seeds 68 numbered slots, eight reserved selections, and the current 64-player board.
- Pick 61 Stiff Wifflers is treated as the forfeited slot marked `X` on the supplied board.
- Making a pick updates D1 immediately and automatically assigns the player to the drafting team's 2026 roster.
- Existing registry players are reused; a class year is required only if a brand-new player must be created.
- Supports adding more prospects later, syncing reserved selections already in the registry, and undoing the most recent normal pick.
- Public board shows On the Clock, full order, reserved/forfeited slots, Best Available, and team draft classes.

## v41: updated 2026 draft board
- Corrects Pick #61: Stiff Wifflers is a normal draft pick, not forfeited.
- Updates the numbered draft order from 68 to 76 picks.
- Zyns remain excluded from the draft because their roster is predetermined.
- Silverbacks now have numbered selections at #52 and #75 in addition to reserved players.
- Updated reserved selections:
  - after #20: Ryan Soenen → Silverbacks
  - after #22: Will Carter V → Stiff Wifflers
  - after #25: Ben Hicks → Silverbacks
  - after #26: Jason Marrs → Silverbacks
  - after #34: Jose Aranda → Silverbacks
  - after #50: Camden Kirchgessner → Silverbacks
  - after #58: Jack Romkema → Silverbacks
  - after #66: Kirby Bach → Silverbacks
- Replaces the draft pool with the current 70-player board and its updated projection metadata.
- Adds `migrations/0006_refresh_2026_draft_board.sql` for databases that already installed v40's draft migration.
- Commissioners can still add additional prospects later from `/admin/draft/`.

## v42: latest 2026 draft-board refresh
- Keeps the 76 numbered draft picks.
- Zyns remain excluded from the draft.
- Pick #61 remains a normal Stiff Wifflers pick.
- Pick #52 is now a pre-filled numbered Silverbacks selection: Adam Skrzypczyck.
- Current reserved selections:
  - after #20: Ryan Soenen → Silverbacks
  - after #22: Will Carter V → Stiff Wifflers
  - after #25: Ben Hicks → Silverbacks
  - after #26: Jason Marrs → Silverbacks
  - after #34: Camden Kirchgessner → Silverbacks
  - after #42: Jose Aranda → Silverbacks
  - after #50: Oscar Uy → Silverbacks
  - after #58: Kirby Bach → Silverbacks
- Removes Jack Romkema from the reserved list.
- Replaces the prospect pool with the latest 69-player draft board.
- Adam Skrzypczyck is not in the available pool because his #52 Silverbacks selection is already locked.
- Adds `migrations/0007_refresh_2026_draft_board.sql` for D1 databases that already installed earlier draft-board migrations.

## v43: draft-room usability + new Grid
- Public and commissioner draft pages now show the on-the-clock team logo.
- Only the on-the-clock hero/card receives the current team's color treatment; the rest of the draft interface remains neutral.
- Best Available is now a full interactive sortable table.
- Draft-board columns:
  - Overall (projected pick / overall rank)
  - Player
  - Projected Series Played
  - Batter Rating
  - Pitcher Rating
- Default sorting is Overall ascending.
- Clicking a column toggles ascending/descending; first click on Series/Batter/Pitcher sorts highest first.
- Search filters the board immediately.
- Public Best Available shows available players only; commissioner view includes availability/drafted/reserved status.
- The commissioner player selector now labels prospects by Overall rank.
- New default Grid:
  - Rows: 20+ Career Wins / Zyns / 1.50 or Lower ERA in a Season
  - Columns: Class of '25 / 50+ Career Hits / .450+ Career OBP
- Grid answer counts: 3, 4, 4 / 12, 5, 6 / 4, 5, 9.

## v44: draft fixes
- Moves Best Available above the full draft order so it is immediately visible instead of appearing after the long 84-slot board.
- Leaders navigation now includes Draft, and public navigation is normalized so Draft does not disappear when changing pages.
- Admin `Class Year if New` defaults to 2030 and resets to 2030 after each pick.
- New-prospect class year also defaults to 2030.
- Draft API no longer relies on the previous `ON CONFLICT ... DO UPDATE` roster write. It preflights the roster row and uses an explicit INSERT or UPDATE inside the D1 batch.
- New players also fall back to class year 2030 server-side if the commissioner leaves the class field untouched.
- Draft failures now include the underlying D1 error in the visible admin message instead of only saying `Draft update failed`.
- New default Grid:
  - Rows: Stiffies / Dirty Dawgs / 2.00 or Lower Career ERA
  - Columns: 5+ Career IP / 15+ Career Pitching K / .300+ Career BA
  - Answer counts: 9, 7, 3 / 5, 3, 3 / 13, 13, 5.

## v45: draft-page tabs
- Public `/draft/` now has two views under the Draft page:
  - Draft Board
  - Players Available
- Commissioner `/admin/draft/` uses the same two-tab structure.
- Draft Board contains the live pick order and draft classes.
- Players Available contains the searchable/sortable prospect table.
- Admin Players Available also contains Add Prospect.
- No D1 migration is required.

## v46: team_rosters dependency fix
- Adds `migrations/0008_ensure_team_rosters.sql`.
- This safely creates the `team_rosters` table and index if they are missing.
- Draft admin now explicitly checks for `team_rosters` before allowing draft writes.
- If the table is missing, the admin API now tells commissioners exactly which migration to run instead of failing with `no such table: team_rosters`.

## v48: latest draft board + round/pick visuals
- 79 numbered picks.
- 14 unnumbered locked/reserved selections.
- Pick #70 Silverbacks is pre-filled with Kirby Bach.
- 77-player current prospect board.
- Stephen Sclafani is locked to Underdawgs and is automatically removed from Best Available.
- Explicit Round 1–11 separators follow the commissioner's round markers.
- Every pick row shows a subdued team logo before selection.
- Completed/locked picks light up with team colors and a full-color logo.
- The current on-the-clock row has its own highlight.
- `migrations/0010_latest_2026_draft_board.sql` also creates `team_rosters` if needed.

## v49: final pre-draft update
- 79 numbered picks.
- 15 reserved/locked selections.
- 79-player prospect board.
- 12 round markers.
- Team-order changes include Ball Busters at #15, Stiffies at #68, Kirby Bach moved to a reserved Silverbacks slot after #77, Underdawgs at #78, and Storm at #79.
- Adds latest prospects including Paul Sparacello, Vasco Esquivel, and George Devlin.
- `migrations/0011_final_2026_draft_board.sql` is self-contained and also creates `team_rosters` if needed.

## v50: post-draft season state
- Replaces the nine drafted-team 2026 rosters with the final post-trade rosters supplied by the commissioner.
- Preserves any existing Zyns roster because the Zyns were not part of the draft table supplied for this update.
- Clears class years for 58 final-roster players who were absent from the original pre-draft player registry.
- Keeps historical class years for established players.
- Reactivates every player listed on a final 2026 roster.
- Schedule now displays all 45 possible 10-team pairings.
- Four listed pairings will ultimately go unplayed under the first-come, first-served format.
- Twin Titans vs Storm is scheduled for August 25, 2026; time remains TBD.
- Schedule result matching is now direction-independent, so an eventual uploaded home/away orientation can differ from the preseason pair display.
- Homepage ticker now points to Twin Titans vs Storm rather than the completed draft.
- Run `migrations/0012_post_draft_rosters.sql` after deploying v50.

## v51: post-draft public cleanup
- Removes the public Draft navigation tab across the website.
- Removes explicit 2026 pre-draft sections from all team detail pages.
- Places each team's 2026 Active Roster directly below Captain History.
- Zyns active roster is intentionally blank.
- Zyns 2026 captain is Bennett Ruskusky.
- Twin Titans vs Storm on August 25 is set to 5:00 PM.
- Homepage ticker is updated to 5:00 PM.
- Removes the homepage Draft & Protected Players card because the draft is complete.
- No new D1 migration is required beyond the v50 post-draft roster migration (`0012_post_draft_rosters.sql`).

## v52: class years + historical matchup previews
- Adds `migrations/0013_class_year_clarifications.sql`.
- Applies the commissioner-supplied class-year corrections.
- All active Silverbacks except Ryan McCain are Class of 2028.
- Matchup previews use 2026 stats when available.
- If an active roster has not produced current-season batting/pitching data yet, the preview falls back to historical career stats for active players.
- Matchups with no prior 2026 head-to-head series explicitly label the historical fallback.
- This gives early-season previews meaningful established-player matchups instead of empty leader panels.

## v53: Batter-v-Pitcher matchup previews
- Adds the uploaded historical BvP matrix as `assets/bvp.js`.
- Matchup previews now include exactly up to four `Matchups to Watch` cards.
- Selection targets two hitters from each team against opposing pitchers.
- The selector prioritizes two distinct hitters and two distinct pitchers per direction when the historical matrix supports that combination.
- Matchups are ranked by historical sample plus impact indicators such as HR/3B/2B, walks, strikeouts, and extreme batting results.
- The existing v52 career-stat fallback remains in place.
- Adds `migrations/0014_postdraft_rosters_and_classes.sql` so a database that has not yet received v50/v52 can be brought current with one migration instead of running 0012 and 0013 separately.

## v54: clean D1 post-draft migration
- Adds `migrations/0015_postdraft_rosters_and_classes_clean.sql`.
- Use 0015 instead of 0014 if neither 0012 nor 0013 has been run.
- 0015 removes PRAGMA/comment-only setup and begins with `SELECT 1;` so Cloudflare D1 receives an explicit query immediately.
- The roster and class-year changes are otherwise the same as 0014.

## v55: full stats + data exports
- Stats page adds Standard / Full Stats toggle.
- Every season stat row includes team identity with a mini logo and subtle team-color row treatment.
- 2026 team identity comes from the live D1 roster assignment.
- Historical single-season team identity comes from the preserved season dataset.
- Career tables use the current 2026 team when available, otherwise the most recent historical team.
- Adds protected `/admin/exports/`.
- Adds D1 CSV exports for batting by series, pitching by series, games, series metadata, and rosters.
- Adds 2026 cumulative batting and pitching downloads.
- Adds preserved 2021–2025 season batting/pitching downloads.
- Adds a browser-generated complete league ZIP containing historical and current D1 exports.

## v56: Admin dashboard
- `/admin/` is now the commissioner homepage rather than the series-upload form.
- The existing series upload/publish workflow moved to `/admin/series/`.
- Admin homepage cards link to Series Entry, Roster Manager, Stat & Data Exports, and Draft Manager.
- All admin pages now share a visible Admin Home / Series Entry / Rosters / Draft / Export Data navigation bar.
- The dashboard shows a live D1 health indicator and published-series count.
- No D1 migration is required for this navigation change.

## v57: stat logos, class repair, refreshed Grid
- Repairs team-logo resolution on Stats by resolving both team IDs and historical team names.
- Adds current-roster fallback team assignments so 2026/career rows can show team identity even before D1 roster metadata reaches a stat row.
- Maps historical `Dr` rows to the Twin Titans lineage/logo.
- Adds `migrations/0016_class_year_repairs.sql`, an idempotent class-year-only repair migration.
- Admin Roster Manager also uses the commissioner-supplied class values as a display fallback when D1 still has a blank class.
- Refreshes the default Grid to a new prevalidated board:
  - Rows: Dirty Dawgs / Gold Glove / 5+ Career Wins
  - Columns: Silverbacks / 25+ Career Pitching K / 5+ Career HR

## v58: D1-backed Series Scheduler
- Adds protected `/admin/schedule/`.
- Commissioners can schedule, reschedule, edit, or remove an upcoming matchup without GitHub.
- Adds `/api/admin/schedule` and `/api/public/schedule`.
- Adds `migrations/0017_scheduled_series.sql`.
- Seeds Twin Titans vs Storm on August 25, 2026 at 5:00 PM on South Quad.
- Public `/schedule/` keeps the 45-pair round-robin pool but overlays scheduled date/time/location from D1.
- Homepage Upcoming Events ticker automatically uses the next scheduled D1 series.
