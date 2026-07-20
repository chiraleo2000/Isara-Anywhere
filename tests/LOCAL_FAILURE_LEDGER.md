# Local Failure & Bug Ledger (DO NOT FIX YET)

**Date:** 2026-07-14  
**Env:** Local npm `dev` (sibling layout) + Postgres Docker `izara-postgres:5433`  
**Stack:** Old Docker portals removed; fresh `npm run env:sync` from `.env.docker`; `npm run dev` from `issara-workspace`  
**Workspace:** `issara-workspace.code-workspace`

> Status: **inventory only** — product code fixes deferred per request.

---

## 0. Run summary

| Suite | Result | Notes |
|-------|--------|-------|
| `npm install` + `install:all` | PASS | workspace, jitsi, patient, doctor |
| `npm run env:sync` | PASS | writes `../issara-{patient,doctor,jitsi}/.env` + root `.env` |
| Remove old Docker portals | PASS | removed `izara-patient-portal`, `izara-doctor-portal`, `izara-meeting-server`, `transcription-service`; kept `izara-postgres` + `izara-pgadmin` |
| `npm run dev` (after UPLOADS_DIR in sync) | PASS | 3005 / 3009 / 3010 / 3020 health OK |
| Vitest unit (`tests/unit`) | **FAIL** | **294 failed / 3104 passed** (3398 total); **113 failed files / 160 passed** (273) |
| Playwright headed A+B+C | (see §3) | UI showup + screenshots |

---

## 1. Runtime / deploy bugs (observed while starting local)

| ID | Severity | Area | Observation | Expected | Fix deferred |
|----|----------|------|-------------|----------|--------------|
| R-ENV-001 | **P0** | Doctor Main API | First boot crashed: `UPLOADS_DIR` unset → `express.static` throws `TypeError: root path required` → port **3009** down | Main API starts with uploads dir | Env sync now emits `UPLOADS_DIR=./uploads` (config only). Product should fail soft or default. |
| R-DEP-001 | P1 | Doctor Main API | `Cannot find module 'zod'` during env validation (`backend/lib/schema.cjs`) | `zod` in doctor dependencies | Add dependency (not done) |
| R-AUTH-001 | P1 | Doctor Vite proxy | Log: `http proxy error: /api/auth/login` ECONNREFUSED when Main API down; auth lives on **3011** (`/auth`) | Login path must hit Auth server | Confirm frontend uses `/auth/login` not `/api/auth/login` |
| R-MAIL-001 | P2 | Doctor Auth | Gmail SA key missing — email simulated | Documented for local | — |
| R-SMTP-001 | P2 | Doctor Main API | No SMTP — simulation mode | Documented for local | — |
| R-STT-001 | P1 | Meeting post-process | Google STT: `Could not load the default credentials` | Local ADC or API-key path | — |
| R-WHISPER-001 | P1 | Meeting post-process | Whisper API **429** quota exceeded | Fallback transcript without paid Whisper | — |
| R-REDIS-001 | P3 | Doctor WS | Redis adapter skipped (`REDIS_URL` not set) | OK for single instance local | — |
| R-FK-001 | P2 | Meeting create | FK refs nullified: missing `appointment` / `patient` for synthetic IDs during tests | Seeded FK or soft-null OK | — |

---

## 2. Unit test failures (294) — grouped

### 2.1 Layout / path adaptation gaps (tests vs sibling folders)

Many contracts resolve `root = New-Isara-Anywhere` then open files that still live under **`issara-workspace/`** (Processes, scripts, helpers):

| Pattern | Example ENOENT |
|---------|----------------|
| Processes docs | `New-Isara-Anywhere/Processes/...` (actual: `issara-workspace/Processes/...`) |
| Gate scripts | `New-Isara-Anywhere/scripts/gates/...` |
| Helpers | `New-Isara-Anywhere/tests/helpers/multi-portal.ts` |
| Nested wrong | `issara-workspace/issara-doctor/package.json` |
| Env example | `New-Isara-Anywhere/.env.docker.example` |

**Impact:** Large clusters such as `processPageCoverage.test.ts` (**67 failed**), page/process contracts, gate contracts.

### 2.2 Missing product files / symbols (contract mismatches)

| Area | Missing / not matching |
|------|-------------------------|
| Patient | `frontend/utils/demoAutoAuth.ts`, `frontend/pages/appointments/AppointmentPages.tsx`, `isDemoAutoLoginEnabled`, `shouldBypassLoginRedirectForMeeting`, `wireJitsiSkipPrejoin`, `buildPatientMeetingPath`, `resolvePatientMeetingApiBase`, PHR tab testids / `PrescriptionsTab` / `useRealtimeSync` |
| Doctor | `frontend/utils/demoAutoAuth.ts`, `frontend/public/env-config.js`, `isDemoAutoMeetingEnabled`, `publishEmrReportDocument`, `notifyDocumentDelivered`, `imagingGroups`, `/api/patients/:id/meetings`, PatientRecordViewer strings (`ประวัติการจ่ายยา`, `MeetingsView`), dashboard `dashboard-search-treatment-history`, `validate-summary-btn` |
| Meeting | `ensureMeetingRecordForAppointment`, `appointedDoctorId`, `req.query.download` on recording path |
| Cross | Guest invite `data.guestLink`, host/patient lobby status strings (`host_starting` / `lobby_starting`) |

### 2.3 Highest-fail unit files (from run)

| Failed | File |
|--------|------|
| 67 | `cross-portal/processPageCoverage.test.ts` |
| 21 | `cross-portal/sharedClinicalHistory.contract.test.ts` |
| 18 | `cross-portal/meetingUxContract.test.ts` |
| 9 | `cross-portal/meetingPhrShareRedoContract.test.ts` |
| 8 | `cross-portal/pageWorkflowCoverageContract.test.ts` |
| 7 | `cross-portal/clinicalDocumentDelivery.test.ts` |
| 6 | `cross-portal/pageElementContract.test.ts` |
| 5 | `cross-portal/bookToMeetToPhrChain.integration.test.ts` |
| 5 | `cross-portal/phrEmrUxContract.test.ts` |
| 4 | `doctor-portal/doctorRouteStructural.p0b.test.ts` |
| 4 | `cross-portal/gate0ImplementationContract.test.ts` |
| 3+ | meeting guest UI, session auth, defect register, combined workflows, … |

Full log: `reports/unit-test-run-local.txt`

### 2.4 Integration soft-fails

| File | Note |
|------|------|
| `byteShareChain.integration.test.ts` | 1 failed — document id null / download chain |
| `queueLifecycle.integration.test.ts` | 1 failed |
| `threePartyLobby.integration.test.ts` | 1 failed |
| `postMeetingWorkflow.integration.test.ts` | 2 failed |

---

## 3. Playwright UI / UX screenshot run

### 3.1 Full groups A/B/C — BLOCKED

| ID | Issue |
|----|-------|
| T-PW-002 | Legacy `tests/e2e/global-setup.ts` ESM load failure (`Unexpected token 'export'`) when wrong config/setup pulled in |
| T-PW-003 | Canonical `group-A/B/C-*.ui-test.ts` depend on tri-browser `portals` fixture + auth storage; not runnable until auth refresh + channel browsers fully wired for sibling layout |

Log: `reports/playwright-ui-showup-local.txt` → **No tests found** / SyntaxError

### 3.2 Local smoke UX (headed + screenshots) — PASS

Command:

```powershell
$env:PW_HEADED='1'; $env:TEST_ENV='local'
npx playwright test --config=playwright.config.ts --project=smoke-ux --headed
```

| Result | Tests |
|--------|-------|
| **PASS** | SMOKE-01 patient login UI + screenshot |
| **PASS** | SMOKE-02 doctor login UI + screenshot |
| **PASS** | SMOKE-03 meeting health + patient login attempt + screenshot |

Screenshots: `tests/output/screenshots/local-smoke/SMOKE-*.png`  
Log: `reports/playwright-smoke-ux-local.txt`

---

## 4. Known product gap ledger (from prior docs — re-verify)

Earlier `tests/MEETING_PHR_SHARE_GAP_LEDGER.md` claimed Stage-2 fixes closed. **Local unit contracts disagree** on this snapshot (e.g. `ensureMeetingRecordForAppointment`, EMR publish, PHR readiness). Treat as **regressed or not present in this tree** until re-proven:

- M-GET-001, M-GUEST-001, M-URL-001  
- C-EMR-001, C-VAL-001, C-VID-001, C-ACL-001, C-LAB-001, C-RX-001, C-PHR-*  

---

## 5. Infra / tooling gaps for this sibling layout

| ID | Issue |
|----|-------|
| T-PKG-001 | Root `package.json` was minimal (no `env:sync` / Playwright scripts) — restored locally for gates |
| T-PW-001 | Root `playwright.config.ts` was missing — added for headed UI projects A/B/C/P/S/U |
| T-PATH-001 | Vitest aliases + hundreds of unit files still assumed monorepo folder names `Isara-*` / `Izara-*`; adapted to `issara-*` but Processes root depth still inconsistent |
| T-WS-001 | Open `issara-workspace.code-workspace` before run (folders: workspace + jitsi + patient + doctor) |

---

## 6. What is working locally

- Postgres healthy on `127.0.0.1:5433`
- Patient portal health + login API (`demo.test@gmail.com`)
- Doctor Auth login (`doctor.test@izara.com`) when Auth :3011 up
- Meeting server health + Gemini model init
- Doctor Main API health after `UPLOADS_DIR` present
- Frontend Vite :3005 and :3010 serving

---

## 7. Next actions (when allowed to fix)

1. Soft-default `UPLOADS_DIR` in doctor Main API (R-ENV-001)  
2. Add `zod` to doctor deps (R-DEP-001)  
3. Finish path root helper for unit tests (`issara-workspace` vs sibling portals)  
4. Reconcile missing meeting/PHR/EMR symbols vs Process contracts  
5. Re-run headed Playwright full matrix + copy screenshots to `docs/screenshots/`  
6. Expand unit coverage only after path root is stable  

---

**Owner note:** This ledger intentionally does **not** include product patches.
