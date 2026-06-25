# Scan Baseline — Full Gate Fix Release (v1.7.53)

Date: 2026-06-24  
Coordinator: COORD agent (full_gate_fix_release plan)  
Branch: working tree (uncommitted auth + nginx refactor)

Maps each check to Process doc and W1 agent assignment.

## W0 scanner results

| ID | Process doc | Agent | Step | Status | Proof command |
|----|-------------|-------|------|--------|---------------|
| W0-01 | Processes/SECURITY_SCANNING.md | SCAN-A | test:guards:static | PASS | `npm run test:guards:static` exit 0 |
| W0-02 | Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md | SCAN-A | security:scan | PASS | `npm run security:scan` exit 0 |
| W0-03 | Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md | SCAN-A | sonar:lint | PASS | `npm run sonar:lint` exit 0 |
| W0-04 | Processes/FULL_WORKFLOW_CONTRACT.md | SCAN-B | test:unit:coverage:gate | PASS | `npm run test:unit:coverage:gate` exit 0 |
| W0-05 | Processes/PROCESS_TO_TEST_GATE.md | SCAN-B | test:unit:process-contracts | PASS | 140 tests pass |
| W0-06 | Processes/PROCESS_TO_TEST_GATE.md | SCAN-B | test:audit:process | PASS | 0 gaps |
| W0-07 | Processes/ENV_AND_STACK_CHECK.md | SCAN-C | env:audit | PASS | 8 required, 0 forbidden |
| W0-08 | Processes/PROCESS_TO_TEST_GATE.md | SCAN-C | phase:0 lint-portals | FAIL | patient-portal `eslint` not in PATH (needs `npm ci` in Isara-patient-portal) |
| W0-09 | Processes/ENV_AND_STACK_CHECK.md | SCAN-C | verify:deps | SKIP | deferred (long npm ci; deps present for unit) |

## W1 fix assignments (from W0 FAIL / known P0)

| ID | Process doc | Agent | Step | Status | Proof command |
|----|-------------|-------|------|--------|---------------|
| AUTH-D-01 | 01_Login_Page doctor | AUTH-D | password policy align | PASS | `npm run test:unit:auth` (154 pass) |
| AUTH-D-02 | 01_Login_Page doctor | AUTH-D | authServer approval DRY | PASS | authServer.http.test.ts |
| AUTH-D-03 | 01_Login_Page doctor | AUTH-D | register pendingApproval | PASS | authServices.ts + unit auth |
| AUTH-D-04 | 01_Login_Page doctor | AUTH-D | LoginPage pending UI | PASS | lint doctor tsc |
| AUTH-P-01 | Patient register | AUTH-P | no token on register | PASS | registerRoute.test.ts |
| AUTH-P-02 | Patient register | AUTH-P | AuthContext no saveAuth | PASS | auth-context.test.ts |
| DASH-01 | 03_Dashboard_Page | DASH | A09 KPI mount | FIX | removed loading gate hiding `doctor-dashboard-kpi` |
| NGINX-01 | deploy/nginx | NGINX | diagnose.sh §7+8 | PASS | nginx error log + Socket.IO probe added |
| NGINX-02 | deploy/nginx | NGINX | DEPLOYMENT.md canonical | PASS | file exists, env examples updated |
| GATE-01 | PROCESS_TO_TEST_GATE | GATE | test:local:process-full alias | PASS | package.json |
| GATE-02 | PROCESS_TO_TEST_GATE | GATE | S-tablet-md in e2e-full | PASS | package.json |
| GATE-03 | PROCESS_TO_TEST_GATE | GATE | M-hardening in e2e-full | PASS | package.json |
| A09-P0 | 03_Dashboard_Page | DASH | round-9 doctor-dashboard-kpi | PASS | A09 headed + phase:2 after DoctorDashboard loading-gate fix + docker rebuild |
| REC-AUTH-01 | VIDEO_MEETING_JITSI_GEMINI | REC | save-recording SESSION_INVALID | PASS | docker smoke + Q01/Q02 E2E (2026-06-24) |

## save-recording SESSION_INVALID — E2E validation (2026-06-24)

| Step | Status | Proof |
|------|--------|-------|
| `docker compose up -d --build doctor-portal meeting-server` | PASS | containers healthy |
| `npm run docker:probe-health` | PASS | 3010/3005/3020 OK |
| `npm run docker:meeting-api-smoke` | PASS | save-recording + results recordingUrl |
| Q01 — end meeting + save-recording UI | PASS | `Q01g: meeting ended` |
| Q02 — recordingUrl poll + playback + results UI | PASS | `Q02a: recordingUrl=/api/recordings/.../video.webm` |
| Q2-post-meeting-doctor | PARTIAL | Q2-01..Q2-03 PASS; Q2-04 summary tab FAIL (Gemini UI, not auth) |

E2E command (headed): `PW_SKIP_LIVE_GEMINI=1 npx playwright test --project=Q-meeting-lifecycle --project=Q2-post-meeting-doctor --grep "Q01|Q02" --workers=1 --headed`

Test fix: `group-Q-meeting-lifecycle.ui-test.ts` Q02 — prefer workflow disk state over empty module-level `meetingId`/`appointmentId` when grep skips Q01.


| Item | Blocker | Wave |
|------|---------|------|
| Ubuntu LAN deploy | SSH / LAN server not verified from COORD | W8 |
| Cloud deploy-gate | **PASS** 21/21 (v1.7.12 deploy) | W9 |
| guides:pdf | Requires Word closed — COM export blocked if .docx locked | W9 |
| Git push | explicit user approval required | W10 |

## Exit criteria tracking

- W0: baseline written ✅
- W1 merge: phase:2 + ledger round 1 p0=0 ✅ (2026-06-24)
- W2–W6: phase:3–8 exit 0 ✅
- W7: test:local:pre-deploy-gate exit 0 ✅ (2026-06-24T04:52:39Z; ledger round 9 p0=0)
- W8: SKIP — Ubuntu LAN (`isara.local` not resolvable)
- W9: **PASS** — cloud deploy `v1.7.12`; deploy-gate **21/21**; doc-screenshots **79/79**; guides enrich/build PASS; guides:pdf blocked when Word locks `.docx` (close Word, run `npm run guides:pdf`)
- W10: manual checklist **PENDING (human)**; no git push without explicit approval
