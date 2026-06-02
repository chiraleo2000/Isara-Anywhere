# Issue Triage — Test discovery pass (2026-05-22)

## Latest full cloud run (headed + screenshots) — 2026-05-22

| Step | Result |
|------|--------|
| Demo/test data cleanup | `npm run cleanup:cloud-test` — E2E appointments, meetings, vitals, workflow state removed; baseline + SSO re-seeded |
| Cloud deploy | **v1.7.21** (storage read API + JWT on `gcsDataService` fetches) |
| Vitest | **2597/2597** |
| Cloud smoke | **PASS** |
| Playwright **A–P** | **79/79 pass** (8.3m) after v1.7.19 |
| User guides | Regenerated — **Word Sarabun 16 pt**, **PPT FC Iconic**, ขั้นตอน/กระบวนการละเอียด (`build-portal-user-guides.py`) |
| Demo cleanup (final) | `npm run cleanup:cloud-test` หลังอัปเดตเอกสาร |

Groups exercised: A, B, C, D, D-host, E, F, G, H, I, J, K, M, N, O, P — headed UI (`PW_HEADED=1`), PNGs under `Documents/docs/screenshots/group-*`.

## Expanded Testing Program (Waves 0–5) — 2026-05-22

| Wave | Deliverable | Status |
|------|-------------|--------|
| 0 | `Q-meeting-lifecycle` project, `tests/SELECTORS.md`, `meeting-lifecycle-fixture.ts`, `audit-process-coverage.py`, matrix expansion | Done |
| 1 | Group Q (`group-Q-meeting-lifecycle.ui-test.ts`), meeting testids, runtime API, jitsi contract tests | Implemented — run `npm run test:e2e:meeting-lifecycle` on cloud after D/D-host |
| 2–4 | Wave unit packs (`test:unit:wave2`–`wave4`) | **17/17** pass |
| 5 | § Automated verification on all `Processes/Pages/*.md`, contract/matrix doc sync | Done |

```powershell
npm run test:e2e:pipeline          # D → D-host → Q → E → F
npm run test:meeting-server:contract
npm run test:audit:process
```

**Fix v1.7.20–21:** Main API `GET /api/storage/read` (PostgreSQL mapper). Client `gcsDataService` sends `Authorization: Bearer` so reads are not 401.

## Vitest baseline

| Run | Result | Notes |
|-----|--------|-------|
| Full suite (`tests/unit`) | **2597/2597 pass** | +34 new tests (meeting acceptance, portal gaps) |

## Environment blockers

| Item | Status | Action |
|------|--------|--------|
| Docker Desktop | **Not running** | Local Playwright requires `docker-compose up -d`; use cloud suite instead |
| Cloud Playwright Group A | **11/11 pass** | `E2E_SKIP_HEALTH_GATE=1` + `scripts/run-cloud-tests.ps1 --headed` |
| Cloud D→E→F pipeline | **30/30 pass** | D→D-host→E→F headed (`E2E_SKIP_HEALTH_GATE=1`, 3.7m) |
| Local Playwright | **Skipped** | Docker not running; cloud suite used instead |

## Playwright / GATE0 (from prior CLOUD_E2E_BUG_REPORT)

| ID | Area | Status | Notes |
|----|------|--------|-------|
| E2a | Group E lab → PHR API | **pass** (detail endpoint fallback if list delayed) | — |
| Q01–Q02 | Group Q 3-party lifecycle + Gemini mandatory | **implemented** | Requires `GEMINI_API_KEY` on cloud |
| A12 | Doctor reset-password 429 rate limit | **implemented** | Group A |
| L | Lab ordering Playwright project | **wired** | After E |
| G4 | verify:gate0 doctor queue | **pass** (in E2E pipeline) | — |
| I1 | Group I admin doctors timeout | **pass** | — |
| P2 | Group P multi-portal fixture | **pass** | — |
| Storage 404 | `patients.json` on doctor portal | **fixed v1.7.20** | `mainApiServer.cjs` `/api/storage/read` |

## Fixes applied this pass

- Cloud: `cleanup:cloud-test` npm script; demo E2E rows purged from Cloud SQL
- Doctor API: `GET /api/storage/read` on Main API (PostgreSQL); `gcsApiServer` PG fallback for local GCS mode
- Unit: `joinConfigAcceptance`, `meetingCreateAcceptance`, `hostReadyGate`, `jitsiMeetingConfig`
- Unit: `virtualMeetingWorkflow`, `guestMeetingJoin`, `registerRoute`, `resetPasswordRoute`, `appointmentPoolManagement`
- E2E: `E10j` join-config acceptance for doctor/patient/guest in Group E
- `test:e2e:pipeline` includes `D-doctor-host`
- `tests/PROCESS_COVERAGE_MATRIX.md` created

## Rerun commands

```powershell
npm run test:unit
$env:PW_HEADED='1'
.\scripts\run-full-coverage.ps1 -Workers 4 -Headed
python scripts/build-portal-user-guides.py
```
