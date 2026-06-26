# Process → Test Gate Mapping

Maps each Processes document to Vitest contracts, Playwright groups, and gate steps.

## Local pre-deploy gate

```bash
npm run test:local:pre-deploy-gate
```

| Step | Command | Process docs covered |
|------|---------|-------------------|
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
| 17–21 Admin/Pool/Queue | appointmentPoolManagement | D, I |

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
| FULL_WORKFLOW_CONTRACT.md | fullWorkflowInvariants | A→F pipeline |
| GATE0_IMPLEMENTATION_STATUS.md | verify:gate0 | D, Q |
| TWO_ROUND_CLOUD_TESTING.md | — | local gate = Round 1 |

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

1. `npm run test:local:pre-deploy-gate` — ledger round 9 P0=0
2. `npm run test:lan:deploy-gate` — W8 manual second device optional
3. `npm run cloud:deploy -- -Tag v1.7.55` then `npm run test:cloud:deploy-gate`
4. `npm run test:cloud:doc-screenshots` + `docs:sync-screenshots` + `guides:all`
