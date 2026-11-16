# ND Wiffle Commissioner Handoff

## Normal operating rule

Use the website admin tools first. SQL migrations are for schema changes, not routine stat corrections or pitching-feat counters.

## End-of-season checklist

1. Open `/admin/season-tools/` and confirm no red health warnings.
2. Confirm `foreign_key_issues = 0`.
3. Confirm the completed World Series produces a recognized champion.
4. Export a complete backup from `/admin/exports/`.
5. Review `/admin/series-archive/` for any series still marked in progress unintentionally.
6. Transfer GitHub, Cloudflare, domain, and external-service ownership using the providers' account controls.

## Playoff stats

- 2021–2025 playoff stats remain inferred from the historical career-vs-regular reconstruction.
- 2026 onward uses exact series/game data from D1.
- `/stats/` exposes each exact playoff season from 2026 onward plus cumulative playoff totals.
- The old playoff toggle on `/leaders/` is intentionally removed.

## Pitching feats

Use `/admin/season-tools/` to add/delete no-hitters and perfect games. Do not edit the Awards page or run an ad-hoc SQL update.

## Spring League

See `spring/README.md`. Spring uses a separate `SPRING_DB` D1 database. The only shared key is `player_id`.
