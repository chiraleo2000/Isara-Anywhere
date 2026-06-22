# Local Docker Test Gate

Runbook for screenshot-driven local acceptance on Docker Compose (`3005` / `3010` / `3020`).

## Phase scripts (canonical)

| Phase | Command | Focus |
|-------|---------|-------|
| 0 | `npm run phase:0` | Structure: lint, typecheck, meeting-server contract |
| 1 | `npm run phase:1` | Docker + unit waves (17 groups) |
| 2 | `npm run phase:2` | Auth (A) + group-A screenshots |
| 3 | `npm run phase:3` | Post-meeting (Q, Q2) + group-Q2 screenshots |
| 4 | `npm run phase:4` | Live meeting (Q, R) + group-Q screenshots |
| 5 | `npm run phase:5` | Appointments/admin (D, C, I) + group-D |
| 6 | `npm run phase:6` | Patient UI (B, G, H, J) + group-B |
| 7 | `npm run phase:7` | Clinical (E, F, L) + group-E |
| 8 | `npm run phase:8` | Defect regression, a11y, responsive |
| 9 | `npm run phase:9` | Full pre-deploy gate + all screenshot audits |

Full gate: `npm run test:local:pre-deploy-gate` (alias for `phase:9`).

**Status (2026-06-22):** Phases 0–9 **PASS** on local Docker. Ledger rounds 1–9 all **P0=0**. Last full gate: 89 E2E passed, `test:screenshots:all` + `docs:sync-screenshots` green.

## Prerequisites

1. Docker Desktop running
2. Copy [`.env.docker.example`](../.env.docker.example) → `.env.docker`
3. Required values:
   - `VITE_MEETING_SERVER_URL=http://127.0.0.1:3020` (prefer `127.0.0.1` over `localhost` on Windows — avoids IPv6 `::1` ECONNREFUSED)
   - `MEETING_SERVER_URL=http://meeting-server:3020`
   - `CORS_ORIGINS=http://127.0.0.1:3005,http://127.0.0.1:3010,http://127.0.0.1:3020`
   - `GEMINI_API_KEY` — real key for live summary, or `xxxxx` + `PW_SKIP_LIVE_GEMINI=1`

## Phase 0 — Bootstrap

```bash
docker compose --env-file .env.docker build --no-cache doctor-portal patient-portal meeting-server
docker compose --env-file .env.docker up -d
npm run docker:probe-health
npm run docker:meeting-api-smoke
```

Optional fresh DB (purge E2E rows + restore seed users):

```bash
npm run docker:cleanup-e2e-data
```

Removes test appointments (`APT-*` from runs), meetings, notifications, sessions; clears `tests/e2e/.workflow-state.json` and `test-results/`. Keeps seed logins (`PATIENT-DEMO`, `DOC-TEST-001`, `ADMIN-TEST-001`). Does **not** delete `docs/screenshots/`.

Seed logins: `doctor.test@izara.com` / `IzaraDoctor@2024`, `demo.test@gmail.com` / `P@ssw0rd`.

## Phase 1 — Unit tests

```bash
npm run test:unit:groups-sequential
# Pass 2 confirm:
cd tests/unit && npm test && npm test
```

Logs: `reports/local-unit-gate-*.log`, `reports/local-unit-gate-latest.json`.

## Phase 2 — Headed E2E (screenshots)

```powershell
$env:BASELINE_VISUAL="1"
$env:PW_HEADED="1"
$env:PW_WORKERS="1"
$env:PW_SKIP_LIVE_GEMINI="1"
npx playwright test --project=A-auth --workers=1
npx playwright test --project=D-appointments --workers=1
npx playwright test --project=Q-meeting-lifecycle --workers=1
npx playwright test --project=E-meeting-clinical --workers=1
```

Or bundle:

```bash
npm run test:e2e:docker:meeting-lifecycle
```

Screenshots land in `docs/screenshots/group-{A,D,Q,E}/` and `tests/output/screenshots/chromium/`.

## Phase 3 — Screenshot uniqueness gate (mandatory)

```bash
npm run test:screenshots:group-q
```

Report: `reports/screenshot-audit-group-Q.json`.

### Expected distinct visuals (Group Q)

| File | Must show |
|------|-----------|
| `Q01b-doctor-host-jitsi.png` | Doctor `jitsi-meeting-container` + iframe |
| `Q01c-patient-lobby-waiting.png` | Lobby waiting — **no Jitsi** |
| `Q01d-guest-lobby-waiting.png` | Guest lobby — **no Jitsi** |
| `Q01e-doctor-admitted.png` | Doctor admit panel |
| `Q01f-three-party-held.png` | In-meeting Jitsi shell (distinct from Q01b) |
| `Q02c-dashboard-recording.png` | Results / recording — **not** Jitsi toolbar |

**Hard fail:** identical SHA256 across Q01b–Q01f → meeting server or Jitsi mount broken.

## Duplicate screenshot diagnosis

| Symptom | Fix |
|---------|-----|
| Login on all snaps | Cookie auth / `credentials: include`; rerun global-setup |
| Health Meeting list only | Confirm appointment; route `/doctor/:id/meeting/:id` |
| Blank Jitsi iframe | Rebuild portals after `VITE_MEETING_SERVER_URL`; no JWT on `meet.jit.si` |
| Patient stuck on host-waiting | Doctor `host-present` after join |
| Guest never admitted | CORS `:3020`; doctor `admit-all-btn` |
| Q02 same as Q01f | End meeting; navigate to `/results` before snap |
| Q2 BFF 404 on `recording-stream` | Ensure `recording-stream` route is registered **before** `/:id` in `meetings.cjs`; rebuild doctor-portal |

## Failure ledger

```bash
npm run ledger:local -- --round 1
```

Output: `reports/local-error-ledger/round-1-latest.json`.

## Phase 9 — Full pre-deploy gate

```powershell
$env:GATE_SKIP_DOCKER_BUILD='1'
$env:PW_HEADED='1'
$env:PW_WORKERS='1'
$env:PW_SKIP_LIVE_GEMINI='1'
$env:TEST_ENV='local'
npm run test:local:pre-deploy-gate
# or: npm run phase:9
```

Resume from E2E only (skip unit/lint if already green):

```powershell
$env:GATE_FROM_STEP='e2e-full-headed'
npm run phase:9
```

Ledger after phase 9: `npm run ledger:local -- --round 9` — assert `p0Count: 0` in `reports/local-error-ledger/round-9-latest.json`.

## Sync screenshots to docs

```bash
npm run docs:sync-screenshots
```

Syncs group-W, group-Q, group-D manifests under `docs/screenshots/*/manifest.json`.
