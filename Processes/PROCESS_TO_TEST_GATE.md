# Process → Test Gate Mapping

Maps each Processes document to Vitest contracts, Playwright groups, and gate steps.

## Local pre-deploy gate

```bash
# If Docker stack is already up (skip rebuild — avoids Hub TLS timeouts on Windows):
# PowerShell: $env:GATE_SKIP_DOCKER_BUILD='1'
npm run test:local:pre-deploy-gate
```

**Latest:** 2026-07-09 — Group U UI element audit; `UI_ELEMENT_COVERAGE_MATRIX.md`; page 20 DEPRECATED → health-meeting queue.

| Step | Command | Process docs covered |
|------|---------|-------------------|
| UI element audit | `python scripts/audit-ui-element-coverage.py` | All Pages — per-control matrix |
| Unit + coverage | `test:unit:coverage` | All workflow contracts |
| Security hardening | `test:security-hardening` | VIDEO_MEETING, auth |
| Meeting contracts | `test:meeting-server:contract` | Meeting-Server/00 |
| Sonar | `sonar:lint` | Code quality (SAST-style rules) |
| **OWASP CVE Lite + audit** | `security:scan` | `SECURITY_SCANNING.md` — CVE Lite, `audit:prod`, `security:app-scan` |
| Portal lint/tsc | `test:lint:portals` | All Pages |
| Process Vitest | `test:unit:process-contracts` | FULL_WORKFLOW_CONTRACT, Appointment_Workflows, Health_Records |
| Docker health | `docker:probe-health` | ENV_AND_STACK_CHECK |
| E2E full (Gemini-lite) | `test:local:e2e-full` | All Pages A–S |
| Process audit | `test:audit:process` | Processes/Pages/* |

## Meeting / demo env parity (local Docker + Cloud Run)

Set on **patient portal**, **doctor portal**, and **meeting-server** (meeting-server needs `PATIENT_PORTAL_URL` for guest invite links). Canonical template: `.env.docker.example`.

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

| Step | Live Gemini? |
|------|----------------|
| `cloud:smoke` | No |
| `verify:gate0` | No |
| `verify:cloud-meeting-ai` | **Yes — single probe** |
| Playwright A+D+Q smoke | No (PW_SKIP_LIVE_GEMINI=1) |

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
| **U — UI element audit** | pageElementContract | U (parallel with B/C/G/H/I/J) |

## Patient Portal pages

| Process doc | Vitest | Playwright |
|-------------|--------|------------|
| 00–04 Overview/Dashboard | processPagesContract | A, B |
| 05_Appointments | appointmentWorkflow | D |
| 06_PHR | healthRecordsWorkflowContract | F |
| 07_AI_Doctor | aiTriage | J (excluded from deploy gate) |
| 08–15 Secondary | contentRoute, pdpa, timeline | G, H, I, J |

## Workflow documents

| Process doc | Vitest | Playwright |
|-------------|--------|------------|
| Appointment_Workflows.md | appointmentWorkflowContract | D |
| VIDEO_MEETING_JITSI_GEMINI.md | jitsiMeetingConfig, meeting-server/* | Q, E, R |
| POST_MEETING_WORKFLOW.md | postMeetingWorkflow.integration | Q |
| Health_Records_Processes.md | healthRecordsWorkflowContract | F |
| Clinical_Document_Delivery_Workflows.md | clinicalDocumentDelivery, pageElementContract | E, F, L, U |
| FULL_WORKFLOW_CONTRACT.md | fullWorkflowInvariants | A→F pipeline |
| UI_ELEMENT_COVERAGE_MATRIX.md | pageElementContract, processDocContentContract | U (parallel) |
| GATE0_IMPLEMENTATION_STATUS.md | verify:gate0 | D, Q |
| TWO_ROUND_CLOUD_TESTING.md | — | local gate = Round 1 |

## PDPA + content approval gates (G15–G16, H-approval)

| Gate | Asserts |
|------|---------|
| G15 | Patient `POST /api/pdpa/doctor-access` → doctor patient record without PDPA gate |
| G16 | Patient revoke → doctor sees consent required |
| H-approval | Doctor draft → not in patient library → admin approve → patient sees |
| `npm run test:browser:full-gate` | lint + unit workflows + W-firefox/webkit + D-firefox |

Pre-deploy gate (`run-local-pre-deploy-gate.mjs`) also runs `browser-core-firefox`, `browser-core-webkit`, `browser-appointments-firefox` before full E2E.

## Gemini-lite mode

Set `PW_SKIP_LIVE_GEMINI=1` for local E2E. Q02d accepts `summary-degraded-badge` OR `summary-structured`.

## LAN deploy gate (after local green)

```bash
# On Ubuntu: bash deploy/nginx/deploy.sh (see deploy/nginx/DEPLOYMENT.md)
# On Windows client: deploy/nginx/WINDOWS_CLIENT_SETUP.md (hosts + mkcert)
npm run test:lan:deploy-gate   # TEST_ENV=lan, Q+R+B headed, BASELINE_VISUAL=1
```

| Step | URLs |
|------|------|
| API smoke | `https://meeting.demotoday.net` via `docker:meeting-api-smoke` |
| Headed E2E | `patient.demotoday.net`, `doctor.demotoday.net`, `meeting.demotoday.net` |

## Release ladder (local → LAN → cloud)

1. `npm run test:local:pre-deploy-gate` — ledger round 9 P0=0 ✅
2. `npm run test:lan:deploy-gate` — **BLOCKED** until Ubuntu LAN reachable
3. Self-hosted Jitsi LAN (`meet.demotoday.net`) — j8 deferred with LAN
4. `gcloud builds submit` with `_MIN_INSTANCES=0,_MAX_INSTANCES=2` then `npm run test:cloud:deploy-gate` — **BLOCKED** pending user approval
5. `npm run test:cloud:doc-screenshots` + `docs:sync-screenshots` + `guides:all` (optional after cloud green)
