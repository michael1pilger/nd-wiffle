# ND Wiffle League Website v25

v25 introduces the first production database backend.

## New backend
- Cloudflare Pages Functions under `/functions/api/admin/`
- D1 binding name: `DB`
- `/api/admin/health`
- `/api/admin/publish`
- server-side Cloudflare Access JWT verification
- commissioner identity captured from the verified Access token
- duplicate-series detection and explicit replace flow
- D1 batch transaction for publish/replace
- audit/import history

## Database
- `migrations/0001_initial.sql`: normalized league import schema
- `migrations/0002_seed_registry.sql`: 10 teams + 181 current site players
- historical rate stats are not copied into D1 yet
- future season/career totals should be derived from normalized series rows

## Admin
- Publish Series is now connected to `/api/admin/publish`
- button remains disabled until validation passes
- duplicate series triggers a replace confirmation
- publish result displays commissioner email and series ID

See `D1_SETUP.md` for exact Cloudflare setup steps.

<</3>>
<</3>>

