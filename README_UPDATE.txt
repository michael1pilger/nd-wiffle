ND Wiffle v171 — Full Pitching Stats rate columns

On /stats/ -> Pitching -> Full Stats:

REMOVED
- HR
- WP

ADDED
- BAA  = Batting Average Against
- OBPA = On-Base Percentage Against

Formulas:
- BAA  = Hits / (BF - BB)
- OBPA = (Hits + BB) / BF

Stored historical BAA/OOBP values are preserved where available.
Modern rows derive the rates from BF, BB and Hits.

Applies to historical seasons, 2026+ regular season, playoffs, career, and cumulative playoffs.
Standard Pitching Stats are unchanged.

No D1 migration is required.
