# ND Wiffle League Website v7

Changes:
- Added a demo upcoming-series ticker to the homepage using Stiff Wifflers at Midnight (Fri Aug 28, 5:00 PM).
- Marked the same Stiff Wifflers/Midnight matchup as a demo scheduled series on the schedule page.
- Players now recognize Stiffies/Stiff Wifflers and Goobers/Goofy Goobers aliases, use cumulative stats for class where available, and fall back to Teams_Played if roster history is incomplete.
- Awards repeat wins are highlighted only in the season row where the 2nd/3rd/etc. win occurs; removed the repeat-winners summary section.
- Stats loads /assets/data.js?v=7 to avoid stale cached data.
- Stats includes canonical Patrick Thompson and Patrick Fitzgerald career rows as a defensive fallback.
- Added Qualified Only toggle: 50+ PA for batting and 18+ IP for pitching.
- Career and 2021-2025 views remain sortable by every column.
