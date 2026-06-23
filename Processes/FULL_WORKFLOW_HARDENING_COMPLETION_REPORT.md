# Full Workflow Hardening — Completion Report

**Date:** 2026-06-22 (local Docker gate v1.7.53 — final)  
**Plan:** Isara Full Hardening (9 phases) + Teams Post-Meeting  
**Target:** Local Docker (`127.0.0.1:3005` / `3010` / `3020`)

## Phase 10–12 ladder (LAN → CI → Cloud)

| Phase | Status | Command / artifact |
|-------|--------|-------------------|
| 10 LAN Nginx Mode B | **Ready** | `.env.docker.lan.example`, `deploy/nginx/isara-system.conf`, `diagnose-502.sh`, [Redeploy section](../deploy/nginx/LOCAL_DOCKER_DEPLOYMENT.md#redeploy-existing-ubuntu-server) |
| 11 CI tiers | **Restored** | `.github/workflows/ci.yml` — PR fast / `run-docker-e2e` label / nightly `phase:9` |
| 12 Cloud gate | **Wired** | See [TWO_ROUND_CLOUD_TESTING.md](TWO_ROUND_CLOUD_TESTING.md) chain below |

### Cloud release chain (after local Phase 9 P0=0)

```powershell
npm run test:local:pre-deploy-gate          # must exit 0 first
npm run test:cloud:deploy-gate                # smoke + gate0 + verify:cloud-meeting-ai + A+D+Q
npm run test:cloud:full                     # 85 headed tests
npm run test:cloud:doc-screenshots          # Round 2b PNGs
npm run docs:sync-screenshots
npm run ledger:cloud -- --round final
```

`ledger:cloud` uses `TEST_ENV=cloud` and writes `reports/cloud-error-ledger/round-final-*.json`.

Or: `npm run test:cloud:release-gate` (single orchestrator for deploy-gate → full → doc-screenshots → ledger final).

### Acceleration overlay (phases 2–9 during execution)

| Tactic | Artifact |
|--------|----------|
| Pre-phase smoke | `scripts/gates/lib/run-pre-phase-smoke.mjs` — probe + meeting-api-smoke + DB reset |
| Failure archive | `scripts/gates/lib/archive-failure.mjs` → `reports/local-failures/round-N/` |
| Fixture isolation | `resetDatabaseBaseline()` between E2E project groups; `PW_WORKERS=1` |
| Static guards | `scripts/guards/*` wired in Phase 8 via `test:guards:static` |
| Socket.IO live test | `tests/integration/meeting-socket-lobby.test.mjs` (Phase 4) |

### Screenshot gate (Phase 9)

`test:screenshots:all` and phase-9 gates now include **group-E** (meeting/clinical) and **group-S** (responsive) alongside A/B/D/Q/Q2.

## Manual sign-off checklist (cannot be fully automated)

Run once after Phase 12 with real users/devices. Record pass/fail and date when complete.

### 3-party multi-browser meeting

| # | Check | Browser / actor | Done |
|---|-------|-----------------|------|
| 1 | 3-party meeting: doctor hosts, patient + guest join lobby → admit → stable video | Doctor **Chrome**, patient **Firefox**, guest **Safari** or mobile | [ ] |
| 2 | Deny mic/camera → graceful error (not blank Jitsi iframe) | Any | [ ] |
| 3 | Doctor ends meeting → patient redirected; recording on Results within **3 min** | Doctor + patient | [ ] |
| 4 | Admin pool notification after patient books (D16b visual) | Admin Firefox | [ ] |
| 5 | PHR receives post-meeting clinical note (Phase 7) | Patient | [ ] |

### LAN second-device access

| # | Check | Done |
|---|-------|------|
| 6 | Second PC on same subnet opens `http://patient.isara.local/login` (not server localhost) | [ ] |
| 7 | Same PC: doctor login at `http://doctor.isara.local/login` | [ ] |
| 8 | Meeting health at `http://meeting.isara.local/health` from client PC | [ ] |
| 9 | `bash deploy/nginx/diagnose-502.sh` — section 6 login smokes + section 8 Socket.IO **PASS** on server | [ ] |

**Sign-off:** _________________ **Date:** ___________

## Local gate status (2026-06-22 final)

| Phase | Result | Notes |
|-------|--------|-------|
| 0–2 | **PASS** | Structure, Docker, unit waves, auth E2E |
| 3–4 | **PASS** | Post-meeting Q/Q2, live meeting Q/R |
| 5–6 | **PASS** | Appointments/admin D/C/I, patient UI B/G/H/J |
| 7 | **PASS** | Clinical E/F/L + group-E screenshots; ledger round 6 P0=0 |
| 8 | **PASS** | Defect/K/S + ledger round 7 P0=0 |
| 9 | **PASS** | Full pre-deploy gate exit 0 — 89 E2E passed (38.6m); screenshots-all; ledger round 9 P0=0 |

| Gate | Result |
|------|--------|
| Docker stack | **healthy** — patient, doctor, meeting-server |
| `resetDatabaseBaseline` / `docker:cleanup-e2e-data` | **PASS** — APT-* cleared; seed users restored |
| `npm run test:unit:groups-sequential` | **PASS — 17/17 groups** |
| `npm run docker:probe-health` | **PASS** |
| `npm run docker:meeting-api-smoke` | **PASS** — save-recording → recordingUrl |
| `npm run test:local:pre-deploy-gate` | **PASS** — exit 0 (2026-06-22); phases 0–9 green |

### Fixes applied (2026-06-22 final)

| ID | Fix | File(s) |
|----|-----|---------|
| BFF-01 | **`/api/meetings/recording-stream` registered before `/:id`** — Express was matching `recording-stream` as meeting id and proxying to nonexistent upstream path (404) | `Isara-doctor-portal/backend/routes/meetings.cjs` |
| BFF-02 | `fetchMeetingApi` adds `credentials: 'include'`; no cross-origin fallback for `recording-stream` | `MeetingResults.tsx` |
| NET-01 | Playwright/E2E use `127.0.0.1` not `localhost` (IPv6 `::1` vs Docker bind) | `multi-portal.ts`, `playwright.config.ts`, `global-setup.ts` |
| CSP-01 | Patient portal CSP allows `127.0.0.1:*` WebSocket for Socket.IO | `backend/middleware/owasp-middleware.ts`, `nginx.conf` |
| E2E-01 | `pollRecordingUrl` polls meeting-server + doctor BFF; workflow state fsync | `meeting-lifecycle-fixture.ts`, `workflow-state.ts` |
| E2E-02 | Q2 BFF retry chain + `credentials:include` on save-recording | `MeetingRoom.tsx`, `group-Q2-post-meeting-doctor.ui-test.ts` |
| E2E-03 | E2E project order: D→Q pipeline before B/C; `E2E_PRESERVE_WORKFLOW=1` in gate | `package.json`, `run-local-pre-deploy-gate.mjs` |
| E2E-04 | `resolveWorkflowAppointmentId` API fallback; D-queue saves workflow state | `meeting-lifecycle-fixture.ts`, `group-D-queue-accept-traceability.ui-test.ts` |
| E2E-05 | Defect DM*: create meeting on `:3020` + `proxyLocalMeetingServer` | `group-Defect-meeting.ui-test.ts` |
| DK-01 | Docker `shared/corsPolicy.cjs` in all portal images | `docker-compose.yml`, `*/Dockerfile*` |

**Orchestration:** `npm run test:local:pre-deploy-gate` → `scripts/gates/phase-9-full.mjs`

---

**Date:** 2026-06-22 (local Docker gate v1.7.53 — round 2)  
**Plan:** Isara Full Hardening (9 phases) + Teams Post-Meeting  
**Target:** Local Docker (`localhost:3005` / `3010` / `3020`)

## Local gate status (2026-06-19)

| Gate | Result |
|------|--------|
| `npm run phase:0` | PASS — lint, typecheck, meeting-server contract (81 tests) |
| `npm run test:unit:groups-sequential` | PASS — 17/17 groups |
| `cd tests/unit && npm test` | PASS — 3201 tests |
| `npm run docker:probe-health` | PASS — patient, doctor, meeting-server |
| `npm run docker:meeting-api-smoke` | PASS — create→host-present→lobby→admit→recording |
| `npm run test:screenshots:all` | PASS — group-A,B,D,E,Q,Q2,S distinct |
| Structure | `backend/` + `frontend/` only (no `src/` or `server/`) |
| Phase scripts | `npm run phase:0` … `phase:9` |

**Orchestration:** `npm run test:local:pre-deploy-gate` → `scripts/gates/phase-9-full.mjs`

---

**Date:** 2026-05-23  
**Plan:** Cloud E2E Hardening (`cloud_e2e_hardening_e3c6b8e6`)  
**Target:** Cloud Run dev-testing (`*.run.app`)

## Summary

Cloud-first hardening with immutable error ledgers, production-grade Group Q (UI admit, real recording, UI Gemini), PostgreSQL `recording_data` BYTEA fallback for Cloud Run, and orchestrator `npm run test:cloud:hardening`.

## Orchestration

| Command | Purpose |
|---------|---------|
| `npm run test:cloud:hardening:round1` | Deploy (optional), smoke, gate0, full A–P, ledger Round 1 |
| `npm run test:cloud:hardening:round2` | Second regression + cleanup on pass |
| `npm run ledger:cloud -- --round N` | Regenerate ledger from `test-results/full-coverage-results.json` |

**Ledger paths:** `reports/cloud-error-ledger/round-{N}-*.json`, `CLOUD_E2E_ERROR_LEDGER_ROUND{N}.md`

## Code deliverables

- `scripts/run-two-round-cloud-hardening.ps1` — dual-round runner (single Playwright invocation)
- `scripts/aggregate-cloud-error-ledger.mjs` — immutable failure ledger
- `tests/group-Q-meeting-lifecycle.ui-test.ts` — no cloud stubs; UI `admit-all-btn`, `recording-indicator`, `generate-summary-btn`
- `Izara-jitsi-server/server/index.js` — `recording_data` BYTEA + GET recordings DB fallback
- `Isara-doctor-portal/.../MeetingRoom.tsx` — await `save-recording` before `/end`
- `cloudbuild.yaml` — `RECORDINGS_DIR=/tmp/recordings`; `PATIENT_PORTAL_URL` / `DOCTOR_PORTAL_URL` on meeting server after portal deploy

## Documentation refresh (2026-05-23)

| Item | Action |
|------|--------|
| Cloud DB | `npm run cleanup:cloud-test-only` — purge E2E rows, no demo re-seed (last run: 2026-05-23) |
| Process pages v1.7.26 | `enrich-process-pages.py --force-steps` — TH Sarabun / FC Iconic standards + detailed steps |
| User guides v1.7.26 | `build-portal-user-guides.py` — Word 16pt + PPT FC Iconic regenerated |
| `Processes/Pages/**` | 39 pages — มาตรฐานเอกสาร + คำอธิบาย + ขั้นตอนละเอียด (`enrich-process-pages.py --force-steps`) |
| User guides | `Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` (TH Sarabun New **16 pt**), `*_PPT_TH.pptx` (**FC Iconic**) v1.7.25 |

## Teams-like meeting production (2026-05-23)

| Area | Change |
|------|--------|
| Guest blank video | Full-height Jitsi container + host-ready overlay (patient + doctor `GuestMeetingJoin`) |
| Guest URLs | `buildGuestPortalUrls`; API-only copy in `MeetingRoom` / patient `share-link` |
| Transcript | Guest role label `แขก`; `POST .../guest-transcript-segment` |
| Dashboard EMR | `insert-meeting-summary-emr-btn` + improved `getMeetingFiles` summary load |
| Deploy tag | `v1.7.24-meeting` via `scripts/deploy-cloud-from-env.ps1 -Tag v1.7.24-meeting` |

## Unit / contract evidence

| Suite | Result |
|-------|--------|
| Vitest | 2619/2619 pass |
| Meeting contract (`*.test.mjs`) | 9/9 pass (incl. `buildGuestPortalUrls`) |
| Cloud smoke | PASS (all three services) |

## Playwright cloud regression

Run locally/CI:

```powershell
npm run test:cloud:hardening:round1
# fix from CLOUD_E2E_ERROR_LEDGER_ROUND1.md
npm run test:cloud:hardening:round2
```

**Sign-off criteria:** Round 2 ledger with zero P0/P1 in auth, appointments, meeting/lobby, webrtc, recording, gemini, clinical.

**Latest cloud run (2026-05-23):**

| Scope | Result |
|-------|--------|
| Round 2 full A–P (headless) | 56 passed, 1 failed (D2 nav — fixed) |
| Group D (full) | 17/17 passed |
| D-host | passed |
| Group Q | Q01c consent/lobby fix applied (`joinMeetingToLobby`); re-run after `v1.7.22-hardening` deploy |

**Next:** `npm run cloud:deploy` (wait for build `v1.7.22-hardening`) → `npm run test:cloud:hardening:round2` → `npm run cleanup:cloud-test-only`

---

## Local Docker zero-skip gate (2026-06-08 — v1.7.51)

| Area | Change |
|------|--------|
| Calendar on confirm | `calendarEventLinks.cjs` + `appointmentMapper.cjs`; patient `calendarEventUrl` in notifications; doctor `/schedule` + patient MiniCalendar |
| 3-party meeting | Q01f holds doctor + patient + guest for **10s** (`MEETING_HOLD_MS`); `assertThreePartyInMeeting` |
| L1 unskip | `group-L-lab-ordering.ui-test.ts` obtains doctor JWT via login API (no `DOCTOR_API_TOKEN` skip) |
| D4cal | Calendar + schedule assertions after D4 confirm |

### Gate results (June 8, 2026)

| Suite | Result |
|-------|--------|
| Vitest (`npm run test:unit:docker`) | **2982/2982 PASS** |
| E2E A-auth → D → D-doctor-host → Q → E → F → L | **35 passed, 0 skipped** |
| J + R (by file path) | **16/16 PASS** |
| `npm run test:quality:gate` | **PASS** |

**Rebuild required after server/UI changes:**

```bash
docker compose --env-file .env.docker build doctor-portal patient-portal
```

**Evidence:** `reports/defect-fix/DEFECT_REGISTER.md` — June 8 local gate section.

**Documentation updated:** `Appointment_Workflows.md`, `Notification_Workflows.md`, `VIDEO_MEETING_JITSI_GEMINI.md`, `POST_MEETING_WORKFLOW.md`, `Pages/Doctor-Portal/04_Schedule_Page.md`, `Pages/Patient-Portal/05_Appointments_Page.md`, `Documents/` technical + testing ledgers.

## Teams-like meeting + post-meeting results (2026-06-19 — v1.7.53)

| ID | Fix | File(s) |
|----|-----|---------|
| PM-01 | Dashboard `loadMeetingSummary` uses completed appointments (not upcoming filter) | `DoctorDashboard.tsx`, `postMeetingAppointments.ts` |
| PM-02 | Authenticated recording playback via BFF blob stream + video MIME | `MeetingResults.tsx`, `meetings.cjs` |
| PM-03 | Pipeline-status poll (~3 min) before `/results` fetch | `MeetingResults.tsx` |
| PM-04 | BFF proxies `pipeline-status` + `recording-stream` | `meetings.cjs` |
| TM-01 | Early `host-present` on Join Meeting (pre-Jitsi) | `MeetingRoom.tsx` |
| TM-02 | Auto `lobby/admit-all` gated behind `VITE_AUTO_ADMIT_LOBBY=1` (default off) | `MeetingRoom.tsx` |
| TM-03 | E2E recording seed only when `PW_ALLOW_RECORDING_SEED=1` | `meeting-lifecycle-fixture.ts`, gate script |

### Teams-like checklist

| Step | Status |
|------|--------|
| Izara lobby + manual admit (default) | ✅ `VITE_AUTO_ADMIT_LOBBY` off; lobby panel + admit-all UI |
| Doctor host-first (`host-present` on join) | ✅ |
| In-app Jitsi + recording indicator | ✅ auto-record on conference join |
| Save recording before `/end` | ✅ `flushMeetingRecording` awaited; errors surfaced |
| Results: recording + transcript + SOAP | ✅ BFF playback + pipeline poll |
| Dashboard AI summary from completed meeting | ✅ + “View full meeting results” link |
| Health Meeting completed row → Results primary | ✅ |

### Test gates (June 19, 2026)

| Suite | Result |
|-------|--------|
| `npm run test:unit:meeting` | **409/409 PASS** |
| Phase 1 new unit tests (dashboard, playback, BFF, lobby) | **18/18 PASS** |
| `npm run docker:meeting-api-smoke` | **PASS** (admit → auto-record → save-recording → recordingUrl) |
| Playwright `Q-meeting-lifecycle` + `Q2-post-meeting-doctor` | **23/23 PASS** (D→Q→Q2 chain, headed) |
| Screenshot uniqueness `group-Q` + `group-Q2` | **PASS** |
| Ledger round 2 | **P0=0** |
| `test:audit:process` | **0 gaps** |
| Full `test:local:pre-deploy-gate` (89 E2E) | Intermittent GT-01 flakes in long headed run; unit steps **17/17 PASS** |

### Manual 3-party sign-off (doctor + patient + guest)

1. Doctor: Health Meeting → Start Meeting → patient joins lobby → manual admit → 10s hold → End meeting.
2. Auto-navigate to `/doctor/:id/meeting/:appointmentId/results` — recording plays, transcript + summary visible.
3. Dashboard → select patient → AI Summary tab shows pipeline completed + summary text.
4. Guest joins via invite link; admitted after host present; no >30s host-waiting stall.

**Screenshots:** Q02a–Q02f (group-Q) + dashboard summary — distinct SHA256 via `validate-screenshot-uniqueness.mjs`.

## Documentation

- `Processes/TWO_ROUND_CLOUD_TESTING.md` — orchestrator + ledger + Group Q assertions + cleanup
- `Processes/FULL_WORKFLOW_CONTRACT.md` — ledger evidence requirement
- `tests/SELECTORS.md` — meeting selector registry (Group Q)
- User guides: `python scripts/build-portal-user-guides.py` (TH Sarabun New 16 pt / FC Iconic)

## Residual notes

1. **Deploy** — Meeting BYTEA + portal recording-order fixes require `npm run cloud:deploy` before cloud Q02 passes against live code.
2. **Headed browsers** — Default `Workers=1` in hardening script avoids parallel headed launch failures on Windows.
3. **gate0** — API chain may fail while UI pipeline passes; both are logged in the ledger.

## Local Docker regression (v1.7.49 — Defect PDF items 1–3)

| Gate | Result |
|------|--------|
| Command | `npm run test:unit:docker:deploy` |
| Stack | `docker compose up -d --build` (postgres, patient, doctor, meeting-server) |
| Unit tests | **2817** PASS in `node:20-alpine` |
| Meeting contracts | **78** PASS (`Izara-jitsi-server/tests/*.test.mjs`) |
| Defect PDF regression | `cross-portal/defectIsaraPdfMeetingQueue.test.ts` (DPDF-Q/N/M*) |
| Process coverage map | `cross-portal/processPageCoverage.test.ts` |

**Fixes verified:** queue traceability after accept/decline (`includeAccepted`, patient Confirmed tab); patient Jitsi auto display name (`prejoinPageEnabled=false`, `requireDisplayName=false`); doctor host join (`resolveMountJwt`, layout-first mount, doctor joins before patient on public `meet.jit.si`).

## Local Full-Stack Hardening v2 (2026-06-18)

| Gate | Result |
|------|--------|
| Unit groups (17) | **17/17 PASS** — `reports/local-unit-gate-2026-06-18T15-43-32.log` |
| Extended `docker:meeting-api-smoke` | PASS — admit-all, auto-record, save-recording, `recordingUrl` |
| `sonar:lint` | PASS — 0 errors (`reports/sonar/quality-gate-summary.json`) |
| `security:scan` | PASS — audit-prod + security-hardening green |
| `test:lint:portals:full` | PASS |
| `test:local:e2e-full` | **88/88 PASS** (headed, `PW_WORKERS=1`) |
| `test:screenshots:all` | PASS — distinct A/D/Q PNGs |
| `ledger:local` round 1 & 2 | **0 failures** (P0=0) |
| `test:audit:process` | **0 gaps** vs `Processes/Pages/*` |
| **`npm run test:local:pre-deploy-gate`** | **EXIT 0** (~16 min, `GATE_SKIP_DOCKER_BUILD=1`) |

**Structure / E2E fixes (this round):**

- Tailwind `content` → `./frontend/**` (both portals); CSS health asserts in Group A
- Patient `vite.config.ts` `publicDir` → repo `public/` (PWA manifest)
- `E2E_ALLOW_PARALLEL_SESSIONS=1` — patient login no longer invalidates parallel Playwright sessions
- `tests/helpers/auth-refresh.ts` + `refreshPageAuth()` — 401 retry on pool/notification/API helpers
- Defect profile test `AUTH_DIR` → `.auth-states`

**Manual smoke (automated proxy):** Groups A/B/D/Q/E/F/R cover doctor login → 3-party meeting → post-meeting results; patient book/join; dashboard/health-meeting/meeting-room without UI crash.

**Cloud deploy gate:** deferred per `TWO_ROUND_CLOUD_TESTING.md` Round 1.
