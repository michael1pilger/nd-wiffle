ND Wiffle v169 — World Series accolade correction

Fixes
-----
1. Jerry Vielhauer now has the 2026 World Series MVP award in the central honors registry.
2. World Series Champion rings for 2026+ are now derived from the FULL season roster of the champion team.
   For 2026 this means every rostered Underdawgs player receives the WS Champion accolade.
3. If a season roster is unavailable, the API falls back to World Series series_participants.
4. Jerry's historical 2025 World Series championship + derived 2026 championship aggregate to:
      WS Champion ×2
   and his 2026 World Series MVP displays separately as:
      WS MVP
5. Awards, Players, Player profiles, and Admin Honors are forced onto the v169 honors bundle to avoid stale v168 cache behavior.

Database
--------
Run migrations/0042_2026_world_series_mvp.sql in the production D1 database.

Expected after migration:
- Jerry Vielhauer has an active 2026 World Series MVP record.
- 2026 active non-ring award records = 23.
- WS Champion rings are NOT stored manually; they are derived from the published champion + team_rosters.
- PRAGMA foreign_key_check returns no rows.

Verify
------
/api/public/honors
  build should be honors-v169.
  champions[2026].champion_player_source should be season_roster.
  Jerry Vielhauer should have a derived 2026 World Series Champion record and a 2026 World Series MVP record.

/api/admin/health
  build should be health-v169.
  honors.derived_ws_source should be season_roster.
  honors.derived_ws_champion_players should match the 2026 Underdawgs roster count.
