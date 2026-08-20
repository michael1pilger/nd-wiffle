# ND Wiffle League Website v22

Admin importer prototype changes:
- /admin now requires only four iScore CSV exports.
- Series metadata, all three game scores, WP/LP/SV, GP overrides, and commissioner notes are entered directly in the admin UI.
- Pitcher dropdowns are populated from active series participants after parsing.
- Players with PA=0 and no IP/BF are ignored.
- Active participants default to 3 GP; 1- or 2-game overrides are handled in the UI.
- Validation reconciles PA/BF, H, BB, SO/K, HR, batting runs vs entered scores, team/pitcher decisions, and R vs scoreboard runs.
- R and ER are preserved separately and never silently overwritten.
- Publish remains disabled until Cloudflare Access + D1 backend writes are implemented.
