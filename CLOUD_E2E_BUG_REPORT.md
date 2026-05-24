# Cloud E2E Bug Report (GATE 0)

**Generated:** 2026-05-22 (cloud dev-testing) · **Current release:** v1.7.22-hardening

## Cloud hardening (2026-05-23)

| Item | Status |
|------|--------|
| Orchestrator | `npm run test:cloud:hardening` |
| Error ledger | `CLOUD_E2E_ERROR_LEDGER_ROUND{N}.md` + `reports/cloud-error-ledger/` |
| Unit + contract | 2619/2619 Vitest, 8/8 meeting contract |
| Headless launch fix | Minimal Chromium args on Windows (`PW_HEADLESS=1`) |
| Group Q | UI admit-all, recording-indicator, no cloud stubs |
| Recording persist | BYTEA + `RECORDINGS_DIR=/tmp/recordings` (deploy required) |
| Deploy submitted | `v1.7.22-hardening` (async Cloud Build) |

See immutable ledgers for Round 1/2 failure details.

## Final validation (2026-05-22)

| Suite | Result |
|-------|--------|
| Vitest | 2597/2597 |
| Cloud smoke | PASS |
| Playwright A–P (headed) | **79/79** (×2 after v1.7.19 / v1.7.20) |
| Demo data cleanup | `npm run cleanup:cloud-test` before + after test cycles |
| Deploy | v1.7.19 → v1.7.21 (storage read + JWT on client) |
| User guides | Regenerated DOCX/PPTX (patient 76, doctor 93 screenshots) |

**Resolved:** Doctor portal `GET /api/storage/read` missing on Main API (404); client now sends `Authorization` bearer (401).

## Environment

| Service | URL |
|---------|-----|
| Patient | `https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app` |
| Doctor | `https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app` |
| Meeting | `https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app` |

## GATE 0 checklist

| ID | Result | Notes |
|----|--------|-------|
| G1 Patient book → `in_pool` | PASS | `verify:gate0` passed after v1.7.12 deploy |
| G2 Admin pool ≤30s | PASS | Queue sync from `/api/appointment-pool` |
| G3 Admin assign | PASS | D workflow green in Round 1 |
| G4 Doctor queue + symptoms | PASS | HealthMeeting normalization fix validated |
| G5 Doctor confirm (not admin) | PASS | D flow passed |
| G6 Patient status update | PASS | Appointment status propagation OK |
| G7–G10 Playwright D/E | PARTIAL | E2 failed once due meeting create 500 (fixed) |

## API verify

```bash
npm run verify:gate0
```

## Failures

### Round 1 cloud suite (A..P)

- Result: **65 passed, 3 failed, 11 not run** (20.1m)
- Command: `.\scripts\run-cloud-tests.ps1 --project=A-auth ... --project=P-workflow-screenshots --workers=1`

Failures:

1. **E-meeting-clinical / E2 / E10 create meeting**  
   - Error: expected 200, got 500 from `POST /api/meetings/create`  
   - Root cause: undefined `patientJwt`/`guestJwt` reference in meeting server `activeMeetings` payload  
   - Fix: define both JWT vars before usage in `Izara-jitsi-server/server/index.js`  
   - Artifacts:  
     - `test-results/group-E-meeting-clinical.u-6f720-nical-flow-meeting-creation-E-meeting-clinical/test-failed-1.png`  
     - `test-results/group-E-meeting-clinical.u-6f720-nical-flow-meeting-creation-E-meeting-clinical/test-failed-2.png`  
     - `test-results/group-E-meeting-clinical.u-6f720-nical-flow-meeting-creation-E-meeting-clinical/test-failed-3.png`

2. **I-admin-notifications / I1 / I02 manage doctors**  
   - Error: `page.goto` timeout on `/doctor/ADMIN-TEST-001/doctors`  
   - Fix: add one retry in `navDoctor` for cloud cold-start route transition

3. **D-doctor-host / G8-G9 doctor JWT assertion**  
   - Error: strict `doctorUrl` JWT expectation on public `meet.jit.si`  
   - Fix: assert JWT only when token auth is enabled/present; keep HOST-role assertion

### Round 2 rerun status (v1.7.15)

- Unit tests: **2563/2563 pass**
- Cloud smoke: **pass** (patient/doctor/meeting health all 200)
- `verify:gate0`: **fails at G4** (`doctor queue missing` newly created appointment)
- Gate Playwright rerun (A, D, E, F, N, O, P): **2 residual failures**

Residual blockers:

1. **E-meeting-clinical / E2a Lab report back**  
   - Error: `Patient can list lab orders via PHR API` assertion failed in `group-E-meeting-clinical.ui-test.ts`
2. **GATE0 script / G4 queue visibility**  
   - Error: doctor queue not reflecting newly assigned appointment within current verify window
3. **P-workflow-screenshots / P2 fixture setup**
   - Error: `browser.newContext: Target page, context or browser has been closed` in `tests/helpers/multi-portal.ts`
