# Process → Test Gate Mapping

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `PROCESS_TO_TEST_GATE.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`PROCESS_TO_TEST_GATE.md`](../PROCESS_TO_TEST_GATE.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่


Maps each Processes document to Vitest contracts, Playwright groups, and gate steps.

## Local-first → cloud → docs (mandatory)

1. **Real Istanbul coverage** — Windows: `USE_DOCKER_COVERAGE=1` + `npm run test:unit:coverage:gate` (or `test:unit:docker:coverage`); thresholds **lines 60 / functions 55 / branches 50 / statements 60**. Stub coverage is not a pass.
2. Full local pre-deploy gate + expanded headed E2E (`test:local:e2e-full` default beyond A–J) + headed UI showup (`test:e2e:ui-showup`) — **all pass**
3. Local screenshot uniqueness (`test:screenshots:all` + `test:screenshots:global`) — archive only; **do not** publish local shots to Documents
4. `cleanup:local-test-only` (post-phase demo purge, no re-seed)
5. Cloud deploy (portals + meeting on **GCE VM Postgres** `35.240.157.230`, not Cloud SQL) → smoke → GATE0 → `test:gate:ui-showup` → `test:cloud:full` — **all pass** (zero residuals)
6. Cloud uniqueness → `docs:sync-screenshots` → `docs:evidence:cloud` → `python scripts/build-portal-user-guides.py` — published images = **cloud UI showup** unique PNGs in `docs/screenshots/` only
7. `cleanup:cloud-test-only` (post-phase purge on **GCE VM PostgreSQL** `35.240.157.230:5432` / `izara_phase1` — **not Cloud SQL**; Secret Manager `db-password` → `CLOUD_DB_PASSWORD`)
8. Installation / Guidelines / User Guides embed those cloud-synced PNGs

**Hard rule:** no cloud until [LOCAL_GREEN_CHECKPOINT.md](../reports/LOCAL_GREEN_CHECKPOINT.md); no Documents refresh until [CLOUD_GREEN_CHECKPOINT.md](../reports/CLOUD_GREEN_CHECKPOINT.md). See [FULL_COVERAGE_REVERIFY_AUDIT.md](../reports/FULL_COVERAGE_REVERIFY_AUDIT.md).

**Ops (2026-07-16 Fix Failures gate baseline `20260716-1318`):** Local + Cloud **PASS**. Deploy + purge + full suite all on GCE VM Postgres `35.240.157.230` / `DB_SSL=false` — never Cloud SQL. Evidence: [LOCAL_GREEN_CHECKPOINT.md](../reports/LOCAL_GREEN_CHECKPOINT.md), [CLOUD_GREEN_CHECKPOINT.md](../reports/CLOUD_GREEN_CHECKPOINT.md), [CLOUD_FULL_COVERAGE_RESULTS.md](../reports/CLOUD_FULL_COVERAGE_RESULTS.md) (88 passed).

## Local pre-deploy gate

```bash
# If Docker stack is already up (skip rebuild — avoids Hub TLS timeouts on Windows):
# PowerShell: $env:GATE_SKIP_DOCKER_BUILD='1'
# Coverage (Windows): $env:USE_DOCKER_COVERAGE='1'; npm run test:unit:coverage:gate
npm run test:local:pre-deploy-gate
```

**Default E2E matrix** (`run-full-coverage.ps1` / `test:local:e2e-full`):  
`A B C D D-queue D-host Q E F L G H I J J-prejoin K R S Defect`  
Follow-ons (explicit): `Q2 M N O P U MEET R1 W-core-*`.

**Fix Failures Full Gate สถานะ (2026-07-16, baseline `20260716-1318`):** Phase 1 unit coverage green (**68.24%** lines/statements; functions **65.61%**; branches **67.09%**) + 12/12 packs + contracts + Sonar/security. Phase 2 local headed matrix (incl. Q2 after MeetingResults รอดำเนินการ soft-exit) + showup + uniqueness + `cleanup:local-test-only` — **PASS** ([LOCAL_GREEN_CHECKPOINT.md](../reports/LOCAL_GREEN_CHECKPOINT.md)). Phase 3 Cloud Run + **GCE VM PostgreSQL** for deploy/runtime/purge (not Cloud SQL) — **PASS** ([CLOUD_GREEN_CHECKPOINT.md](../reports/CLOUD_GREEN_CHECKPOINT.md)): `test:cloud:full` **88 passed**, zero residuals; `cleanup:cloud-test-only` on `35.240.157.230`. Package/docs track: **v1.7.61**.

| ขั้นตอน | Command | Process docs covered |
|------|---------|-------------------|
| UI element audit | `python scripts/audit-ui-element-coverage.py` | All Pages — per-control matrix |
| Unit + coverage | `test:unit:coverage:gate` / `test:unit:docker:coverage` | All workflow contracts + Istanbul floors |
| Security hardening | `test:security-hardening` | VIDEO_MEETING, auth |
| Meeting contracts | `test:meeting-server:contract` | Meeting-Server/00 |
| Sonar | `sonar:lint` | Code quality (SAST-style rules) |
| **OWASP CVE Lite + audit** | `security:scan` | `SECURITY_SCANNING.md` — CVE Lite, `audit:prod`, `security:app-scan` |
| Portal lint/tsc | `test:lint:portals` | All Pages |
| Process Vitest | `test:unit:process-contracts` | FULL_WORKFLOW_CONTRACT, Appointment_Workflows, Health_Records |
| Docker health | `docker:probe-health` | ENV_AND_STACK_CHECK |
| E2E full (Gemini-lite) | `test:local:e2e-full` | Expanded default matrix (beyond A–J) |
| Process audit | `test:audit:process` | Processes/Pages/* |

## Meeting / demo env parity (local Docker + Cloud Run)

Set on **พอร์ทัลผู้ป่วย**, **พอร์ทัลแพทย์**, and **meeting-server** (meeting-server needs `PATIENT_PORTAL_URL` for guest invite links). Canonical template: `.env.docker.example`.

| Variable | Default (prod/demo) | E2E gate only | Purpose |
|----------|---------------------|---------------|---------|
| `DEMO_AUTO_LOGIN` | `1` | — | Silent session login for doctor + patient (no login form) |
| `DEMO_AUTO_MEETING` | `1` | — | Auto-navigate to meeting when appointment context present (doctor: first ready telehealth on Health Meeting load) |
| `stayOnQueue` (query) | unset | `1` on E2E health-meeting URLs only | Test-only: keep queue UI visible; never set in prod demo |
| `DEMO_DOCTOR_EMAIL` / `DEMO_DOCTOR_PASSWORD` | demo creds | — | Doctor portal auto-login |
| `DEMO_PATIENT_EMAIL` / `DEMO_PATIENT_PASSWORD` | demo creds | — | Patient portal auto-login |
| `PATIENT_PORTAL_URL` | `http://127.0.0.1:3005` (local) | — | Guest invite URLs on patient origin |
| `DOCTOR_PORTAL_URL` | `http://127.0.0.1:3010` (local) | — | Doctor portal origin for CORS/links |
| `MEETING_PUBLIC_URL` | `http://127.0.0.1:3020` (local) | — | Browser-reachable meeting API |
| `VITE_AUTO_ADMIT_LOBBY` | `0` | `0` (gate + docker + cloud) | Doctor must click Admit in lobby (Teams/Zoom); E2E uses `admit-all-btn` UI |
| `GUEST_ALLOW_ANONYMOUS_JOIN` | unset / `0` | optional dev | Allow bare `/guest-join/:id` (not production) |
| `PW_INCLUDE_GUEST` | unset | `1` for Q guest steps | Enable Q01d 3-party guest in Playwright |

Contract tests: MEET-UX-15 (`.env.docker.example`), MEET-UX-18 (`buildGuestPortalUrls` token URL).

## Cloud deploy gate (after local green)

```bash
npm run test:cloud:deploy-gate
```

| ขั้นตอน | Live Gemini? |
|------|----------------|
| `cloud:smoke` | No |
| `verify:gate0` | No |
| `verify:cloud-meeting-ai` | **Yes — single probe** |
| Playwright A+D+Q smoke | No (PW_SKIP_LIVE_GEMINI=1) |

Full cloud coverage after deploy gate: `npm run test:cloud:full` (must clear residual E2/Q01 class failures).

## Doctor Portal pages

| Process doc | Vitest | Playwright |
|-------------|--------|------------|
| 00_Doctor_Portal_Overview | processPagesContract | A, C |
| 01_Login | authServer.http | A |
| 02_Reset_Password | authServer.http | A |
| 03_Dashboard | dashboardFiltering | A, C |
| 04_Schedule | scheduleManagement | D |
| 05_Patient_Management | patientDetailView | E |
| 06_Health_Meeting | queueManagementWorkflow | D, Q |
| 07_Virtual_Meeting | **REMOVED** — use Meeting-Server/01_Meeting_Room | — |
| 08_EMR_Editor | emrAutosave | E |
| 09_Prescribing | prescribingAllergy | E |
| 10_Lab_Orders | labOrders | F, L |
| 11_Patient_Record_Viewer | healthRecordsEmrWorkflow | F |
| 12–14 Content/Resources | clinicalResources | H |
| 15_Gemini_AI_Studio | geminiService | J (mount-only in gate) |
| 16_Doctor_Profile | meetingJoinContract | C |
| 17–21 Admin/Pool/Queue | appointmentPoolManagement | D, I (page 20 → redirect 06) |
| **U — UI element audit** | pageElementContract | U (explicit follow-on) |

## Patient Portal pages

| Process doc | Vitest | Playwright |
|-------------|--------|------------|
| 00–04 Overview/Dashboard | processPagesContract | A, B |
| 05_Appointments | appointmentWorkflow | D |
| 06_PHR | healthRecordsWorkflowContract | F |
| 07_AI_Doctor | aiTriage | J (excluded from deploy gate) |
| 08–15 Secondary | contentRoute, pdpa, timeline | G, H, I, J |

## ขั้นตอนการทำงาน documents

| Process doc | Vitest | Playwright |
|-------------|--------|------------|
| Appointment_Workflows.md | appointmentWorkflowContract | D |
| VIDEO_MEETING_JITSI_GEMINI.md | jitsiMeetingConfig, meeting-server/* | Q, E, R |
| POST_MEETING_WORKFLOW.md | postMeetingWorkflow.integration | Q, Q2 |
| Health_Records_Processes.md | healthRecordsWorkflowContract | F |
| Clinical_Document_Delivery_Workflows.md | clinicalDocumentDelivery, pageElementContract | E, F, L, U |
| FULL_WORKFLOW_CONTRACT.md | fullWorkflowInvariants | A→F pipeline |
| UI_ELEMENT_COVERAGE_MATRIX.md | pageElementContract, processDocContentContract | U (follow-on) |
| GATE0_IMPLEMENTATION_STATUS.md | verify:gate0 | D, Q |
| TWO_ROUND_CLOUD_TESTING.md | — | local gate = Round 1 |

## PDPA + content approval gates (G15–G16, H-approval)

| Gate | Asserts |
|------|---------|
| G15 | ผู้ป่วย `POST /api/pdpa/doctor-access` → แพทย์ ผู้ป่วย record without PDPA gate |
| G16 | ผู้ป่วย revoke → แพทย์ sees consent required |
| H-approval | แพทย์ draft → not in ผู้ป่วย library → ผู้ดูแลระบบ approve → ผู้ป่วย sees |

Pre-deploy gate (`run-local-pre-deploy-gate.mjs`) runs `browser-core-firefox`, `browser-core-webkit`, `browser-appointments-firefox` before full E2E (`W-core-firefox` / `W-core-webkit` + `D-appointments`). `W-core-chromium` remains an explicit follow-on.

## Gemini-lite mode

Set `PW_SKIP_LIVE_GEMINI=1` for local E2E. Q02d accepts `summary-degraded-badge` OR `summary-structured`.

## LAN deploy gate (after local green)

```bash
# On Ubuntu: bash deploy/nginx/deploy.sh (see deploy/nginx/DEPLOYMENT.md)
# On Windows client: deploy/nginx/WINDOWS_CLIENT_SETUP.md (hosts + mkcert)
npm run test:lan:deploy-gate   # TEST_ENV=lan, Q+R+B headed, BASELINE_VISUAL=1
```

| ขั้นตอน | URLs |
|------|------|
| API smoke | `https://meeting.demotoday.net` via `docker:meeting-api-smoke` |
| Headed E2E | `patient.demotoday.net`, `doctor.demotoday.net`, `meeting.demotoday.net` |

## Release ladder (local → LAN → cloud)

1. Phase 1: `USE_DOCKER_COVERAGE=1` + `test:unit:coverage:gate` — real Istanbul thresholds met
2. `npm run test:local:pre-deploy-gate` / expanded `test:local:e2e-full` + UI showup + uniqueness — **required before cloud**
3. `cleanup:local-test-only` (post-phase demo purge)
4. `npm run test:lan:deploy-gate` — only when Ubuntu LAN reachable
5. `npm run cloud:deploy -- -Tag v1.7.61` + `cloud:smoke` + `verify:gate0` + `test:gate:ui-showup` + `test:cloud:full`
6. `docs:sync-screenshots` + `docs:evidence:cloud` + `python scripts/build-portal-user-guides.py` (after [CLOUD_GREEN_CHECKPOINT.md](../reports/CLOUD_GREEN_CHECKPOINT.md))
7. `cleanup:cloud-test-only` (GCE VM Postgres `35.240.157.230` purge only — not Cloud SQL; requires `CLOUD_DB_PASSWORD`)