# ND Wiffle League Website v24

Admin importer enhancements:
- Adds required pitching appearances and starts inputs for every detected pitcher.
- Validates Apps 1–3, Starts 0–3, Starts <= Apps, and normally 3 team starts per three-game series.
- Adds player-level manual pitching stat corrections.
- Manual corrections require pitcher, field, corrected value, and reason.
- Original iScore source values remain preserved; corrections are stored separately in manual_corrections.
- Corrected player pitching rows drive corrected team aggregate validation.
- Warning approval remains available as an alternative, but an explanation is required for every approved warning.
- Payload schema upgraded to version 3 and includes pitching_usage and manual_corrections.
- Publish remains disabled until the Cloudflare Access + D1 backend is connected.
