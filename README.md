# ND Wiffle League Website v21

Commissioner import prototype:
- New `/admin/` page for five-file series upload/review.
- Parses home/visitor batting + pitching iScore CSVs and Series Results CSV.
- Defaults active statistical participants to 3 GP.
- GP overrides for 1- or 2-game participation are handled in the UI.
- Zero-PA/zero-IP/zero-BF roster entries are ignored.
- Distinguishes R from ER and never overwrites legitimate earned-run differences.
- Validates PA/BF, H, BB, SO/K, HR, scoreboard runs, player names, and pitcher decisions.
- Warnings require review conceptually; publishing is disabled until Cloudflare Worker/D1 is connected.
- Includes corrected sample package for one-click testing.
- Includes `tools/series_importer.py` as a reference CLI validator.
