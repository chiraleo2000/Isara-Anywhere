# Environment and Stack Check (Doctor + Patient + Jitsi)

Last verified: 2026-06-22 (v1.7.53 — LAN Mode B CORS, patient runtime env-config, phase gates)

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

- Dev placeholder: `GEMINI_API_KEY=xxxxx` in `.env.example` (resolved by `scripts/env/geminiKey.js`; AI routes skip live calls until a real key is set).
- Meeting server **must** have a real `GEMINI_API_KEY` in cloud dev-testing for Group **Q02** (`generate-summary` mandatory).
- Playwright cloud runner (`scripts/run-cloud-tests.ps1`) exits early if `GEMINI_API_KEY` / `CLOUD_GEMINI_API_KEY` is unset.

### Recordings filesystem

- Meeting server: `RECORDINGS_DIR` (default `/app/recordings` in Docker, volume `izara_recordings`).
- `POST /api/meetings/:id/save-recording` verifies file exists on disk before returning success.

### JWT and Auth

- Doctor portal, patient portal, and meeting server enforce fail-fast behavior when `JWT_SECRET` is missing.
- **Env schema:** `scripts/env/schema.js` (Zod) validates `JWT_SECRET`, `GEMINI_API_KEY`, optional `DATABASE_URL` / `JITSI_DOMAIN` at doctor portal boot.
- **Jitsi roles (public meet.jit.si):** Session auth via Izara lobby + `configOverwrite.moderator`; `createJitsiRoleJwt` in `Izara-jitsi-server/backend/sessionAuth.js` returns null on public Jitsi.
- **Display names:** `getIzaraDisplayName` from auth state → `userInfo.displayName`; `prejoinPageEnabled: false` on all portal Jitsi inits.
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

## Local E2E — portal image rebuild (v1.7.51)

Server and UI changes for calendar sync (`calendarEventLinks.cjs`, `appointmentMapper.cjs`, `CompleteSchedule.tsx`, patient `MainLayout` MiniCalendar) are **baked into Docker images**. After pulling or editing these files:

```bash
docker compose --env-file .env.docker build doctor-portal patient-portal
docker compose --env-file .env.docker up -d
# Optional DB reset for E2E baseline:
node -e "import('./scripts/docker/e2eDockerCommon.mjs').then(m => m.resetDatabaseBaseline())"
```

**E2E env:** `PW_NO_CHROME=1`, `PW_HEADLESS=1`, `PW_WORKERS=1`  
**June 8 gate:** Vitest **2982/2982**; core pipeline **35 passed, 0 skipped**; J+R **16/16**

## Local pre-deploy gate (v3 — mandatory before cloud)

```bash
npm run test:local:pre-deploy-gate
```

Chains: unit coverage → security hardening → meeting contracts → **sonar:lint** → **security:scan** (OWASP [CVE Lite](https://owasp.org/cve-lite-cli/) + `audit:prod` + app pattern scan) → portal lint/tsc → process Vitest contracts → Docker health (optional) → full E2E Gemini-lite (`PW_SKIP_LIVE_GEMINI=1`) → process audit.

See `Processes/SECURITY_SCANNING.md` for the full Sonar + CVE Lite remediation loop.

## v5.2 env audit (doctor portal)

Run before local pre-deploy gate:

```bash
npm run env:audit
# or: node scripts/env/audit-doctor-portal-env.mjs
```

**Required keys:** `MEETING_SERVER_URL`, `VITE_MEETING_SERVER_URL`, `GOOGLE_CLIENT_ID`, `JITSI_APP_ID`, `CORS_ORIGINS` (include `:3020`), `JWT_SECRET`, `GEMINI_API_KEY`, `DATABASE_URL`, `GCP_PROJECT_ID`, `GOOGLE_MAPS_API_KEY`

**Consolidated (server canonical — no duplicate VITE_ in .env):** `GEMINI_API_KEY`, `GEMINI_MODEL`, `JITSI_DOMAIN`, `GOOGLE_MAPS_API_KEY`, `USE_POSTGRESQL`, `GCP_PROJECT_ID`. Docker compose bridges these to `VITE_*` build-args.

**Forbidden keys:** `VITE_GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET` in portal `.env` (server-only), `VITE_ENABLE_RAG`, `VITE_RAG_CHUNK_SIZE`, `CLOUD_RUN_DOCTOR_URL`

**Folder layout (v3.8):** `Isara-*-portal/frontend` + `backend`; `Izara-jitsi-server/backend` only.

Sync rules: copy shared keys to `Isara-patient-portal/.env` and `Izara-jitsi-server/.env`; use `.env.docker` for compose.

Ledger: `reports/defect-fix/scan-baseline-2026-06-10.md`

## Cloud deploy gate (after local green)

```bash
npm run test:cloud:deploy-gate
```

Live Gemini: **only** `npm run verify:cloud-meeting-ai` (single probe). Playwright cloud smoke uses `PW_SKIP_LIVE_GEMINI=1`.

## Result

Environment prerequisites for DB/JWT/CORS/Socket/NOTIFY are configured across local and cloud paths and are ready for workflow regression execution.
