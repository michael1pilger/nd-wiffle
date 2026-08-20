# ND Wiffle League Website v23

Admin importer payload hardening:
- Payload schema upgraded to version 2.
- Adds normalized individual batting rows using trusted counting stats only.
- Adds normalized individual pitching rows with innings converted to integer outs_recorded.
- Adds pitcher decision summaries derived only from the three admin-entered games.
- Adds deterministic series_id for duplicate/replace handling.
- Adds season/date consistency validation.
- Adds explicit per-warning commissioner approval checkboxes and records approved warnings in the payload.
- Preserves source totals for reconciliation/audit.
- GP overrides and zero-stat roster exclusion remain unchanged.
- Publish remains disabled until the protected Cloudflare/D1 backend is implemented.
