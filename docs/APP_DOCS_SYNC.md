# App docs sync procedure

Per-app documentation under `{app}/docs/` is **generated and synced** from the platform monorepo.

## One-command refresh

```bash
npm run docs:sync-to-apps
```

This runs:

1. `scripts/docs/sync-process-pages-to-apps.mjs` — 42 page specs from `Processes/Pages/`
2. `scripts/docs/generate-app-database-docs.mjs` — `DATABASE.md` from `scripts/docs/table-ownership.json`
3. `scripts/docs/generate-app-doc-stubs.mjs` — README, WORKFLOWS, FEATURES, API, TEST_COVERAGE

## Idempotency

Re-running `docs:sync-to-apps` overwrites generated files with the same content when sources are unchanged. Page copies and DATABASE.md are always refreshed; doc stubs are overwritten each run.

## Database bundle

```bash
npm run db:bundle:apps
```

Copies platform `scripts/database/` SSOT into each app's `scripts/database/` for standalone Docker.

## Ownership

| Path | Owner stream |
|------|----------------|
| `Isara-patient-portal/docs/**` | STREAM-PATIENT |
| `Isara-doctor-portal/docs/**` | STREAM-DOCTOR |
| `Izara-jitsi-server/docs/**` | STREAM-MEETING |
| `scripts/docs/table-ownership.json` | STREAM-PLATFORM |
| `Processes/Pages/**` | Platform (source only) |

## Merge gate

```bash
npm run docs:sync-to-apps
npm run test:audit:process   # expect 0 gaps
```
