# Spring League isolation plan

Spring League is under ND Wiffleball, but its competitive records must remain separate from the fall/career database.

## Non-negotiable boundary

- Primary fall database binding: `DB`
- Spring database binding: `SPRING_DB`
- **Do not run `spring/migrations/0001_spring_schema.sql` in `DB`.**
- The only shared identifier is `player_id`.
- Spring teams, rosters, games, batting, and pitching are stored only in `SPRING_DB`.
- Spring tables do not contain foreign keys to the fall `players` table. The application copies the canonical `player_id` string when a Spring roster is created.

## When Spring League details are finalized

1. Create a new Cloudflare D1 database for Spring League.
2. Bind it to the Pages project as `SPRING_DB`.
3. Run `spring/migrations/0001_spring_schema.sql` against that database only.
4. Build Spring admin/public routes using `functions/api/_spring.js::requireSpringDb()` so no route can silently fall back to `DB`.
5. Import Spring rosters by canonical `player_id` from the fall player registry.

This repository intentionally does not publish Spring stats into `/api/public/league`, `/stats/`, or career totals.
