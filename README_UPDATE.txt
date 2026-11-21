ND Wiffle v168 — Central Honors / HOF / Championship Accolades

What changes
------------
1. Joey Thomalla and Jimmy Redfern are added to the Hall of Fame.
2. A new D1 honors registry becomes the single source for 2026+ award winners and HOF membership.
3. 2026 non-World-Series award winners already recorded on the Awards page are seeded into D1.
4. World Series Champion accolades are derived automatically from the completed World Series winner and the winning team's recorded World Series participants.
5. Players directory accolades now include the modern D1 award registry.
6. Individual player pages now show accolade chips and Hall of Fame status.
7. Awards page replaces its hard-coded 2026 honors/HOF display with the D1 registry after load.
8. /admin/honors/ lets future commissioners add/edit/delete awards and add/remove HOF members without SQL.
9. /api/admin/health now checks the honors registry, current award count, HOF count, D1 foreign keys, and derived World Series champion participants.
10. Global HTML middleware injects the v168 HOF/honors loader on every HTML page so stale ?v=147/152 references cannot prevent the update.

World Series rule
-----------------
Do NOT manually add "World Series Champion" in the Honors admin.
For 2026 onward it is derived from:
  completed World Series result -> winning team -> series_participants on that winning team.
This keeps bracket/champion/player rings synchronized.
World Series MVP remains a manual award because it cannot be inferred from game results.

Production migration required
-----------------------------
Run:
  migrations/0041_honors_registry.sql
in the production Cloudflare D1 console.

Expected migration verification
-------------------------------
HOF          11
2026 awards  22
PRAGMA foreign_key_check should return no rows.

After deployment verify
-----------------------
/api/public/honors
  build = honors-v168
  hall_of_fame contains joey_thomalla and jimmy_redfern
  awards contains the 2026 award records
  champions contains the completed 2026 World Series if published

/api/admin/health
  build = health-v168
  schema.honors_registry = true
  honors.hof_members = 11
  honors.current_season_awards = 22
  database.foreign_key_issues = 0

/admin/honors/
  should show the D1 registry, HOF list, and derived World Series champion participants.

Install
-------
Copy the folders/files into the repo root and Merge/Replace.
Then run the 0041 migration in D1.

Windows CMD:
  cd /d "C:\PATH\TO\YOUR\nd-wiffle"
  git status --short
  git add assets functions admin migrations BUILD_VERSION.txt
  git commit -m "Centralize honors and Hall of Fame"
  git push origin main
