# ND Wiffle v25 — Cloudflare D1 Setup

This version adds a real Pages Functions backend for commissioner publishing.

## 1. Create the production D1 database

Cloudflare Dashboard:
1. Workers & Pages
2. D1 SQL Database
3. Create database
4. Name: `nd-wiffle-prod`

## 2. Apply the schema and registry seed

Open the new D1 database, then open its SQL Console.

Run these files in order:
1. `migrations/0001_initial.sql`
2. `migrations/0002_seed_registry.sql`

Expected seed counts:
- 10 teams
- 181 players

The second migration is generated from the site's current player registry.

## 3. Bind D1 to the Pages project

Cloudflare Dashboard:
1. Workers & Pages
2. Open the `nd-wiffle` Pages project
3. Settings
4. Bindings
5. Add binding
6. D1 database
7. Variable name: `DB`
8. Select `nd-wiffle-prod`
9. Save
10. Redeploy the Pages project

The Pages Functions access the database as `context.env.DB`.

## 4. Protect the API route with the same Access application

In Zero Trust > Access controls > Applications, edit the commissioner application.

Keep the existing admin destinations and also add:
- `ndwiffle.com/api/admin/*`

Use the same commissioner Allow policy.

## 5. Add server-side Access verification variables

The backend additionally validates the `Cf-Access-Jwt-Assertion` JWT before any database action.

Pages project:
1. Settings
2. Variables and Secrets
3. Add production variables:

`ACCESS_TEAM_DOMAIN`
- Example format: `your-team.cloudflareaccess.com`
- This is your Cloudflare Zero Trust team domain.

`ACCESS_AUD`
- Zero Trust > Access controls > Applications
- Configure the commissioner application
- Additional settings
- Copy `Application Audience (AUD) Tag`

Redeploy after adding the variables.

## 6. Test the protected backend

While signed into `/admin/`, visit:

`https://ndwiffle.com/api/admin/health`

Expected response shape:

```json
{
  "ok": true,
  "actor_email": "commissioner@example.com",
  "database": {
    "players": 181,
    "teams": 10,
    "series": 0
  }
}
```

If this works, Access JWT verification and D1 are both connected.

## 7. Publish the validated sample

Return to `/admin/`.

The Publish button becomes enabled only when:
- validation errors = 0
- every warning is resolved or approved with a reason

On publish:
- the backend revalidates the payload
- checks every player against the seeded registry
- blocks duplicate series
- inserts series, games, participants, batting, pitching, corrections, warning approvals, and import history in one D1 batch transaction
- records the authenticated commissioner email

If the series ID already exists, the admin UI asks whether to replace it. Replacement deletes the current normalized series rows and writes the new version atomically, while `import_history` preserves the audit trail.

## Current database model

Primary source-of-truth tables:
- `teams`
- `players`
- `series`
- `games`
- `series_participants`
- `batting_series_stats`
- `pitching_series_stats`
- `manual_corrections`
- `warning_approvals`
- `import_history`

Career and season rate statistics are intentionally not stored yet. They should be derived from the normalized counting stats so corrected/replaced series automatically produce correct totals.
