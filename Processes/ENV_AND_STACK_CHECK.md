# Environment and Stack Check (Doctor + Patient + Jitsi)

Last verified: 2026-05-23

## Scope

Validated configuration parity and prerequisites for:

- Local Docker stack (`docker-compose.yml`)
- Cloud deploy pipeline (`cloudbuild.yaml`, `cloudbuild-patient-hotfix2.yaml`)
- Service runtime guards (DB, JWT, CORS, Socket/NOTIFY listeners)

## Service Matrix

| Service | Local Port | Cloud Run Port | DB Source | Notes |
| --- | --- | --- | --- | --- |
| Patient Portal | `3005` | `3005` | PostgreSQL (`DATABASE_URL`) | Unified frontend+backend, Socket.IO room joins enabled |
| Doctor Portal | `3010` (mapped to container `8080`) | `8080` | PostgreSQL (`DATABASE_URL`) | Main API + auth routes, PG NOTIFY listener and Socket emit paths |
| Meeting Server | `3020` | `3020` | PostgreSQL (`DATABASE_URL`) | Lobby/transcript/summary pipeline, Socket.IO room fanout |
| PostgreSQL | host `5433` -> container `5432` | external VM `35.240.157.230:5432` | primary source | `pg_notify` trigger migration included in deploy flow |

## Prerequisite Checks

### Database

- Local compose sets `DATABASE_URL` and explicit `DB_*` vars for all 3 services.
- Cloud build injects `DATABASE_URL`, `DB_PASSWORD`, and host/port/name/user values.
- Auto-apply migration step includes `v2.2.0-notify-triggers.sql` (required for realtime).

### Socket and Realtime

- Doctor and patient services include dedicated `pgNotifyListener` implementations listening on `LISTEN data_changes`.
- Meeting server has dedicated PG listener wiring and Socket.IO room emission for appointment/meeting events.
- Optional Redis adapter support exists for multi-instance scaling (`REDIS_URL`) in doctor service.
- Cloud deploy uses `--min-instances=1` in main pipeline for warm websocket baseline.

### Gemini (cloud E2E gate)

- Meeting server **must** have `GEMINI_API_KEY` set in cloud dev-testing for Group **Q02** (`generate-summary` mandatory).
- Playwright cloud runner (`scripts/run-cloud-tests.ps1`) exits early if `GEMINI_API_KEY` / `CLOUD_GEMINI_API_KEY` is unset.

### Recordings filesystem

- Meeting server: `RECORDINGS_DIR` (default `/app/recordings` in Docker, volume `izara_recordings`).
- `POST /api/meetings/:id/save-recording` verifies file exists on disk before returning success.

### JWT and Auth

- Doctor portal, patient portal, and meeting server enforce fail-fast behavior when `JWT_SECRET` is missing.
- Token verification paths are present in auth and protected route middleware.
- Cloud deploy injects JWT secret from Secret Manager.

### CORS

- Doctor/patient servers enforce origin-validated CORS middleware and allow local + env-configured origins.
- Meeting server supports explicit origin list and wildcard patterns (for Cloud Run hostnames).
- Cloud build final step updates meeting server `CORS_ORIGINS` to deployed portal URLs.

## Cloud Parity Notes

- Build args set `VITE_USE_POSTGRESQL=true` and disable GCS storage path usage.
- Meeting server is deployed first; portal deploys consume captured meeting URL for runtime env parity.
- SSO client ID is injected at build/runtime for both portals.

## Result

Environment prerequisites for DB/JWT/CORS/Socket/NOTIFY are configured across local and cloud paths and are ready for workflow regression execution.
