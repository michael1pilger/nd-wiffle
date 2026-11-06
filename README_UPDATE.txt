ND WIFFLE — PLAYOFF SERIES CLINCH FIX (v156)

WHAT THIS FIXES
- Best-of playoff series no longer require every possible game to be played.
- Best of 3 ends when a team reaches 2 wins: valid finals 2-0 or 2-1.
- Best of 5 ends when a team reaches 3 wins: valid finals 3-0, 3-1, or 3-2.
- Best of 7 ends when a team reaches 4 wins: valid finals 4-0, 4-1, 4-2, or 4-3.
- On the Series Upload page, entering the clinching game's score automatically changes "Games Completed" to the actual number of games played and hides unused games.
- Validation rejects games entered after a playoff series was already clinched.
- Server-side validation uses the same clinching rules.
- Related regular-season fix: a normal regular-season series is complete only after all 3 games. A partial 2-0 upload remains in progress and can be appended later.

FILES IN THIS PATCH
admin/series-entry/index.html
functions/api/admin/publish.js

INSTALL
1. Extract this zip.
2. Copy the admin and functions folders into the root of your existing nd-wiffle project.
3. In Windows, choose to merge folders / replace files in the destination.
4. No D1 migration is required.
5. From Command Prompt in the nd-wiffle project:

   git status --short
   git add admin functions
   git commit -m "Fix playoff series clinch validation"
   git push origin main

TEST
For your semifinal:
- Series Context: Playoffs
- Round: Semifinal
- Maximum Series Length: Best of 5
- Enter the four actual games.
- Once Game 4 produces a 3-1 series result, the form should set Games Completed to 4 and hide Game 5.
- Validation should show the playoff series as complete after 4 games.
