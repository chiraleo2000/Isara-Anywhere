# Two-Round Cloud Testing & Screenshot Documentation

**Release tag:** `v1.7.53`  
**Last updated:** June 13, 2026

## Round 3 signoff (2026-06-13) — BMS telemed parity (real Jitsi only, JWT removed, Gemini key renewed)

| Check | Result | Notes |
|-------|--------|-------|
| Local pre-deploy gate | **PASS** | unit 3156/3156, security:scan 4/4, sonar 0 errors, docker health, gate0 G1–G5, **87/87 headed E2E (single clean run, 11.8m)**, process audit 0 gaps; ledger `reports/defect-fix/scan-baseline-2026-06-13.md` |
| Cloud deploy | **PASS** | `cloud:deploy` tag `v1.7.12`; Cloud Build `0f993742-4b93-439b-ba90-11bcb8e99fbf` (SUCCESS 4m11s) |
| Cloud deploy gate | **PASS** | smoke 3/3 (200) + gate0 G1–G5 + `verify:cloud-meeting-ai` (sttAvailable=true, renewed Gemini key) + **21/21 headed A+D+Q** |
| Cloud full coverage | **PASS** | `test:cloud:full` **85/85** headed (9.7m) — all groups A–P including meeting lifecycle + clinical |
| Cloud doc screenshots | **PASS** | `test:cloud:doc-screenshots` **78/78** (8.7m) → `docs:sync-screenshots` + guides rebuilt |

**Cloud Run revisions (dev-testing) — Round 3:**

| Service | Revision |
|---------|----------|
| Doctor portal | `izara-doctor-portal-dev-testing-00155-6k5` |
| Patient portal | `izara-patient-portal-dev-testing-00123-zlm` |

**Key changes in this round:** removed all demo/virtual-meeting code (single real Jitsi `/meeting/:id` flow), JWT removed from Jitsi mounts/URLs (session-token auth only), SonarQube fixes, fullscreen video-first meeting UX, env consolidation + Gemini key renewal across all `.env` files.

## Round 2 signoff (2026-06-11)

| Check | Result | Notes |
|-------|--------|-------|
| Local pre-deploy gate | **PASS** | `test:local:pre-deploy-gate` exit 0 — 87/87 headed E2E, no skip flags; ledger `reports/defect-fix/scan-baseline-2026-06-10.md` |
| Cloud deploy | **PASS** | `cloud:deploy` tag `v1.7.12`; build `63fa0572-9ff8-4a6d-ac5b-ffd32f22819a` |
| Cloud deploy gate | **PASS** | smoke + gate0 + `verify:cloud-meeting-ai` (sttAvailable=true) + 21/21 headed A+D+Q |
| Cloud doc screenshots | **PASS** | 74/74 Round 2b; `docs:sync-screenshots` + guides rebuilt; process audit 0 gaps |

**Cloud Run revisions (dev-testing):**

| Service | Revision |
|---------|----------|
| Doctor portal | `izara-doctor-portal-dev-testing-00154-sw9` |
| Patient portal | `izara-patient-portal-dev-testing-00122-nwr` |

## v5.2 gate model

| Round | Environment | Command |
|-------|-------------|---------|
| **Round 1** | Local (mandatory) | `npm run test:local:pre-deploy-gate` |
| **Round 2** | Cloud (after Round 1 exit 0) | `npm run test:cloud:deploy-gate` |
| **Round 2b** | Cloud doc screenshots | `npm run test:cloud:doc-screenshots` → `npm run docs:sync-screenshots` |

Round 1: `PW_HEADED=1`, `PW_SKIP_LIVE_GEMINI=1`, full Vitest + docker probe + headed E2E — **no** local `docs:sync-screenshots`.

Round 2: cloud smoke + `verify:gate0` + **one** live Gemini probe (`verify:cloud-meeting-ai`). Playwright smoke uses `PW_SKIP_LIVE_GEMINI=1`.

Round 2b: capture PNGs from Cloud Run only (`BASELINE_VISUAL=1`, groups P/W/D/E/F/S), then rebuild guides.

## Legacy orchestrator (full hardening — optional)

```powershell
# Full dual loop (deploy → test → ledger × 2; cleanup after Round 2 pass)
npm run test:cloud:hardening

# Single round
npm run test:cloud:hardening:round1
npm run test:cloud:hardening:round2

# Ledger only (after Playwright)
npm run ledger:cloud -- --round 1
```

**Immutable error ledger:** `reports/cloud-error-ledger/round-{N}-{ISO}.json` and `CLOUD_E2E_ERROR_LEDGER_ROUND{N}.md` at repo root. **Do not apply fixes until the ledger for that round is written.**

## Round 1 — Deploy + API / smoke

1. Deploy all services:
   ```powershell
   cd Isara-Anywhere
   .\scripts\deploy-cloud-from-env.ps1 -Tag v1.7.12
   ```
2. Post-deploy smoke:
   ```powershell
   .\scripts\deploy-cloud-from-env.ps1 -SmokeOnly
   node scripts/verify-cloud-appointment-sync.mjs
   ```
3. Meeting API checks:
   - `GET /health` — meeting server
   - `GET /api/meetings/{appointmentId}/join-config?role=doctor` (with doctor JWT)
   - `GET /api/meetings/{appointmentId}/host-ready`
   - URLs must include `requireDisplayName=false`, `enableLobby=false`

## Round 2 — Playwright A → D → D-host → **Q** → E → F (serial pipeline)

```powershell
$env:TEST_ENV='cloud'
npm run test:e2e:pipeline
# or explicitly:
npx playwright test --project=D-appointments --project=D-doctor-host --project=Q-meeting-lifecycle --project=E-meeting-clinical --project=F-phr-health-records --workers=1
```

### Group Q — Meeting lifecycle P0 (v1.7.21+)

| Test | Description |
|------|-------------|
| Q01 | Doctor HOST (internal JWT) + patient + named guest → lobby admit → 10s stable → end |
| Q02 | `save-recording` (audioBase64) → `GET /results` → `generate-summary` on MeetingResults UI |

Requires `IZARA_DEV_TESTING=1` on meeting server for `GET /api/meetings/:id/runtime` polling.

**Required env (cloud meeting server):** `GEMINI_API_KEY` — Group Q02 fails if missing or if `generate-summary` returns 5xx.

```powershell
npm run test:e2e:meeting-lifecycle
```

### Meeting acceptance (E10 / E10d)

| Step | Actor | Expect |
|------|--------|--------|
| E10c | Doctor | `jitsi-meeting-container` + `iframe` visible in MeetingRoom |
| E10d | Patient | Public `/meeting/{id}` — no portal login; Jitsi iframe after lobby + host-ready |
| E21+ | Guest / admin guest | `/guest-join/{id}?guestType=admin` — lobby → admit → iframe, camera/mic |

### Screenshot groups (auto under `Documents/docs/screenshots/`)

| Group | Content |
|-------|---------|
| D | Appointment pool, assign, queue counts |
| E | Meeting create, doctor room, patient room, lobby admit, guest join |
| F | PHR / lab after E2a |
| J-meeting-jitsi | Jitsi iframe visible (doctor + patient) |

Playwright saves via `snap()` helper → `Documents/docs/screenshots/group-{D|E|F|J}/`.

### Troubleshooting

- Fixture health gate fails after cold start: wait 30s and re-run, or `$env:E2E_SKIP_HEALTH_GATE='1'` for a focused E re-run only.
- Patient sees “waiting for moderator”: redeploy **meeting server + both portals** (v1.7.12+).
- Guest no video: doctor must be **host-present** first; guest flow waits `host-ready` then mounts Jitsi.

## Jitsi / identity summary (v1.7.52)

- **Session auth:** API uses PostgreSQL opaque session tokens — **no JWT** on portal or meeting API.
- **Jitsi roles:** Izara lobby + `configOverwrite.moderator` — no Jitsi JWT in `JitsiMeetExternalAPI` mount options.
- **Registered users:** display name from session identity via `join-config` / `identity` APIs.
- **Guests / admin observer:** `/guest-join/{appointmentId}` — opaque invite token; doctor admits; then host-ready.
- **Doctor:** HOST — joins first, `host-present`, Izara lobby admit-all.
- **E2E browsers:** headed always (`PW_HEADED=1`); **no Google Chrome channel** (`PW_NO_CHROME=1`) — Firefox, Edge, WebKit only.

## Jitsi / identity summary (v1.7.12 — superseded details)

- **Registered users:** name/email from session + `users` table via `join-config` / `identity` APIs.
- **Guests / admin observer:** `/guest-join/{appointmentId}` — no Izara login; doctor admits; then host-ready; Jitsi with camera/mic toolbar.
- **Doctor:** HOST — joins first, `host-present`, Izara lobby admit-all.
- **No Jitsi login** — `prejoinPageEnabled=false`, `requireDisplayName=false`, Jitsi lobby disabled.

## Post-run cleanup (after Round 2 pass)

```powershell
npm run cleanup:cloud-test-only
Remove-Item tests/e2e/.workflow-state.json -ErrorAction SilentlyContinue
```

Purges E2E-generated PostgreSQL rows and meeting mock artifacts without re-seeding demo users.

## Group Q production assertions (no stubs on cloud)

| Step | Requirement |
|------|-------------|
| Q01e | Doctor clicks `admit-all-btn` (UI), not API-only |
| Q01f | `recording-indicator` ON before 10s hold; meeting end saves real WebM |
| Q02a | No fake `save-recording` fallback when `TEST_ENV=cloud` |
| Q02b | Recording bytes &gt; 1 KB; served from disk or PostgreSQL `recording_data` |
| Q02d | `generate-summary-btn` + `summary-structured` on UI (no stub transcript POST) |
