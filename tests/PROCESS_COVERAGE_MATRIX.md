# Process Documentation → Test Coverage Matrix

**Last updated:** 2026-07-13 (v1.7.60 full-pass) — 602 controls, P0 covered=30 / partial=0 / missing=0; process gaps=0; Group U **31/31**; UI showup **69/69**; unit groups **17/17**; `phase:9:strict` ledger **P0=0**; `test:cloud:deploy-gate` **21/21** (smoke+GATE0+meeting-ai+A/D/Q)

## UI element coverage (Group U)

| Artifact | Role |
|----------|------|
| [`UI_ELEMENT_COVERAGE_MATRIX.md`](UI_ELEMENT_COVERAGE_MATRIX.md) | Per-control testid registry (602 controls; P0 missing=0; 30 P0 covered; 164 covered after promote) |
| [`_coverage_gap_backlog.md`](_coverage_gap_backlog.md) | Real vs inventory-noise classification for remaining P1 missing |
| `group-U-ui-element-audit.ui-test.ts` | Headed click/type + screenshot — auth, dashboards, PHR, schedule/queue, EMR/Rx/lab, PDPA/LW, meeting results, admin/content |
| `pageElementContract.test.ts` | Vitest: P0 testids exist in frontend |
| `processDocContentContract.test.ts` | Vitest: all 42 pages have UI Controls Inventory |

**Regenerate:** `python scripts/audit-ui-element-coverage.py` then `python scripts/promote-group-u-p0-covered.py`

## Requirements-driven unit packs (v1.7.60)

| Pack | File |
|------|------|
| Workflow connections / Security / Two-round | `workflowConnectionsContract`, `securityScanningContract`, `twoRoundCloudTestingContract`, `envForbiddenKeys` |
| Auth | `authLockoutContract`, `crossRoleApiDenialContract`, `googleSsoContract` |
| Appointments / GATE0 | `adminCannotConfirmContract`, `declineToPoolContract`, `confirmTripleNotifyContract` |
| Meeting / MITL | `transcriptHostControlsContract`, `guestAnonymousDenyContract`, `mitlValidateContract`, `adminLobbyModeratorDenyContract` |
| Clinical delivery | `emrSignDeliveryContract`, `imagingRxLabDeliveryContract`, `phrCrudContract`, `notifySocketRoomMapContract` |
| PDPA / Content / Notify | `pdpaG15G16Contract`, `livingWillShareContract`, `contentApprovalStateMachine`, `notificationDedupContract` |
| Profile / Schedule | `doctorProfileCrudContract`, `scheduleCalendarMapperContract` |

## v5.2 contract packs

| Pack | File | IDs |
|------|------|-----|
| EMR AI draft | `doctor-portal/emrAiDraft.test.ts` | EAD-01–08 |
| Meeting routes | `doctor-portal/meetingRoomRoutes.test.ts` | MRR-01–08 |
| PHR documents | `patient-portal/phrDocuments.test.ts` | PHD-01–08 |
| Profile workflow | `patient-portal/profileWorkflow.test.ts` | PRF-01–06 |
| Telemed dashboard | `doctor-portal/telemedDashboard.test.ts` | TDK-01–05 |
| Combined workflows | `cross-portal/combinedWorkflowActions.test.ts` | CWA-01–10 |
| Separated workflows | `cross-portal/separatedWorkflowFunctions.test.ts` | SWF-01–10 |
| Notifications | `cross-portal/notificationWorkflowContract.test.ts` | NTF-01–06 |
| Living will | `cross-portal/livingWillContract.test.ts` | LWL-01–05 |
| Env audit | `cross-portal/doctorEnvAudit.test.ts` | ENV-01–04 |
| Appointment UX | `cross-portal/appointmentUxContract.test.ts` | APPT-UX-01–09 |
| Meeting UX | `cross-portal/meetingUxContract.test.ts` | MEET-UX-01–07 |
| PHR/EMR UX | `cross-portal/phrEmrUxContract.test.ts` | PHR-UX-01–04 |
| Breadcrumbs | `doctor-portal/clinicalBreadcrumb.test.ts` | BREAD-01–03 |

**Registry:** `processWorkflowRegistry.ts` maps **50+** Processes docs → Vitest (`npm run test:unit:process-contracts`).

**Screenshot policy:** `docs:sync-screenshots` runs **only after** `npm run test:cloud:doc-screenshots` (cloud PNGs). Never sync from local headed runs.

## Test hardening packs (v1.7.52)

| Pack | File | IDs |
|------|------|-----|
| Post-meeting summary | `meeting-server/generateSummary.integration.test.ts` | GSUM-01–07 |
| Meeting validation | `doctor-portal/meetingResultsValidation.test.ts` | MRV-01–05 |
| EMR→PHR delivery | `cross-portal/emrToPhrDelivery.integration.test.ts` | EPH-01–06 |
| 3-party lobby | `meeting-server/threePartyLobby.integration.test.ts` | TPL-01–05 |
| Auth login | `authLoginResponse`, `doctorLogin`, `adminLogin`, `patientLogin` | AUTH-* |
| Calendar confirm | `cross-portal/calendarConfirmNotification.test.ts` | CAL-03–05 |

## Clinical delivery + queue consolidation (2026-07-10)

| Pack | File | IDs |
|------|------|-----|
| Document mapping | `patient-portal/documentDeliveryMapping.test.ts` | DOC-01–05 |
| Pool → Health Meeting redirect | `doctor-portal/appointmentPoolRedirect.test.ts` | APR-01–04 |
| Doctor message notify | `doctor-portal/doctorMessageNotification.test.ts` | DMN-01–04 |
| Patient Jitsi loader | `patient-portal/loadJitsiExternalApiScript.test.ts` | JIT-P01–04 |
| Doctor Jitsi stub-safe loader | `doctor-portal/loadJitsiExternalApiScript.stubs.test.ts` | JIT-D01–03 |

## Session auth + unified queue (v1.7.52)

| Area | Unit tests | UI |
|------|------------|-----|
| Session auth (no JWT) | `meeting-server/jitsiRoleJwt.test.ts`, `doctor-portal/jwtPolicyAlignment.test.ts`, `Izara-jitsi-server/tests/sessionAuth.test.mjs` | group-Q, group-J |
| Unified patient Queue tab | `patient-portal/unifiedQueueFilter.test.ts` | group-D |
| Confirm sets confirmed_date | `doctor-portal/confirmSetsConfirmedDate.test.ts` | group-D-queue-accept |
| splitQueueSections | `doctor-portal/queueAcceptTraceability.test.ts`, `cross-portal/defectIsaraPdfMeetingQueue.test.ts` | group-D |

**E2E policy (v5.2):** local gate uses `PW_HEADED=1` + `PW_SKIP_LIVE_GEMINI=1` (`test:local:e2e-full`); never `PW_HEADLESS` in pre-deploy gate. Cloud smoke: `TEST_ENV=cloud` + headed. Live Gemini: **only** `verify:cloud-meeting-ai`.

## UX plan checklist (2026-05-27)

- [x] Patient register UI + validation (`group-A` A2b)
- [x] Patient reset-password UI (`group-A` A2b)
- [x] Patient direct-route deep links PHR/profile/settings/timeline (`group-S` S03, `group-B`)
- [x] Guest/pre-join meeting access UI (`group-E` E10j)
- [x] Doctor profile page navigation (`group-C` C17)
- [x] Mobile / tablet / desktop layout stability (`group-S` + `S-responsive-*` projects)
- [x] Unit payload contracts auth + join (`authPayloadContract`, `meetingJoinContract`)  
**Canonical contract:** [Processes/FULL_WORKFLOW_CONTRACT.md](../Processes/FULL_WORKFLOW_CONTRACT.md)

| Column | Meaning |
|--------|---------|
| **Status** | `covered` · `partial` · `missing` |
| **ElementCoverage** | P0 control status from `UI_ELEMENT_COVERAGE_MATRIX.md` |
| **Priority** | P0 meeting · P1 clinical/admin · P2 secondary |
| **UnitTest** | Vitest under `tests/unit/` |
| **UI** | Playwright project (group letter) |
| **ScreenshotRef** | Expected PNG under `docs/screenshots/` |

---

## Doctor Portal pages (22)

| ProcessDoc | Domain | UnitTest | UI | Status | Priority | ScreenshotRef |
|------------|--------|----------|-----|--------|----------|---------------|
| Doctor-Portal/00_Doctor_Portal_Overview | Auth | authServer, config | A | covered | P2 | group-A/A01-doctor-dashboard |
| Doctor-Portal/01_Login | Auth | authServer.test.ts, authServer.http.test.ts | A | covered | P1 | group-A |
| Doctor-Portal/02_Reset_Password | Auth | authServer.http.test.ts | A | covered | P2 | — |
| Doctor-Portal/03_Dashboard | Admin | dashboardFiltering | A, C | covered | P1 | group-A/A01-doctor-dashboard |
| Doctor-Portal/04_Schedule | Appointments | scheduleManagement | C, D | covered | P1 | group-D/D12-schedule |
| Doctor-Portal/05_Patient_Management | Clinical | patientDetailView | C, E | covered | P1 | group-E/E04-patients-list |
| Doctor-Portal/06_Health_Meeting | Meeting | queueManagementWorkflow, meetingRoomRoutes, meetingUxContract | D, E, Q | covered | P0 | group-D/D09-health-meeting |
| Doctor-Portal/07_Virtual_Meeting | Meeting | **REMOVED** — use Meeting-Server/01_Meeting_Room | — | removed | — | group-Q/Q01b-doctor-host-jitsi |
| Doctor-Portal/08_EMR_Editor | Clinical | emrService, emrAutosave.test.ts | E | covered | P1 | group-E/E07-clinical-actions |
| Doctor-Portal/09_Prescribing | Clinical | prescriptions, prescribingAllergy.test.ts | E | covered | P1 | — |
| Doctor-Portal/10_Lab_Orders | Clinical | labOrders | E, F, L | covered | P0 | group-F/F09-lab-results-tab |
| Doctor-Portal/11_Patient_Record_Viewer | Clinical | healthRecordsEmrWorkflow | E, F | covered | P1 | group-F |
| Doctor-Portal/12_Medical_Consultants | Content | medicalConsultants | H | covered | P2 | group-H |
| Doctor-Portal/13_Medical_Content | Content | medicalContentWorkflow | H | covered | P2 | group-H |
| Doctor-Portal/14_Clinical_Resources | Content | clinicalResources | H | covered | P2 | group-H |
| Doctor-Portal/15_Gemini_AI_Studio | AI | geminiService | J | covered | P2 | group-J |
| Doctor-Portal/16_Doctor_Profile | Auth | meetingJoinContract | C | covered | P2 | group-C/C17-doctor-profile |
| Doctor-Portal/17_Admin_Appointment_Management | Admin | adminAppointmentManagement | D, I | covered | P1 | group-D/D14-admin-meeting |
| Doctor-Portal/18_Admin_Doctor_Management | Admin | adminDoctorManagement | I | covered | P1 | group-A/C03 |
| Doctor-Portal/19_Doctors_Management | Admin | adminDoctorManagement, processPagesContract | I | covered | P2 | — |
| Doctor-Portal/20_Appointment_Pool_Management | Appointments | appointmentPoolManagement, queueLifecycle, queueAcceptTraceability | D | covered | P0 | group-D/D11-appointment-pool (redirect → health-meeting queue) |
| Doctor-Portal/21_Queue_Management | Appointments | queueManagementWorkflow, queueSocket.test.ts | D, E, Q | covered | P0 | group-D/D16b-doctor-queue-assigned |

---

## Patient Portal pages (16)

| ProcessDoc | Domain | UnitTest | UI | Status | Priority | ScreenshotRef |
|------------|--------|----------|-----|--------|----------|---------------|
| Patient-Portal/00_Patient_Portal_Overview | Auth | authRoute, auth-context | A, B | covered | P2 | group-A/A01-patient-dashboard |
| Patient-Portal/01_Login | Auth | authRoute | A, B | covered | P1 | group-A |
| Patient-Portal/02_Register | Auth | authPayloadContract | A | covered | P1 | group-A/A2b-auth-registration |
| Patient-Portal/03_Reset_Password | Auth | authPayloadContract | A | covered | P1 | group-A/A2b-auth-registration |
| Patient-Portal/04_Dashboard | Workflows | dashboardWorkflow | B | covered | P1 | group-A/A01-patient-dashboard |
| Patient-Portal/05_Appointments | Appointments | appointmentWorkflow, appointmentSlotLock.test.ts | D, E, Q | covered | P0 | group-D/D01-appointments-list |
| Patient-Portal/06_PHR | Clinical | phrRoute, healthRecordsWorkflowContract | F | covered | P0 | group-F/F01-phr-page |
| Patient-Portal/07_AI_Doctor | AI | aiRoute, aiTriage.test.ts | J | covered | P2 | group-J |
| Patient-Portal/08_Medical_Content_Library | Content | contentRoute | B, H | covered | P2 | group-H/H10-health-library |
| Patient-Portal/09_Map | Workflows | mapPage | J | covered | P2 | group-J |
| Patient-Portal/10_PDPA | Clinical | pdpaRoute, pdpaAudit.integration.test.ts | G | covered | P2 | group-G |
| Patient-Portal/11_Living_Will | Clinical | livingWillWorkflow | G | covered | P2 | group-G |
| Patient-Portal/12_Profile | Auth | userManagementWorkflow, profileWorkflow | B | covered | P2 | group-B |
| Patient-Portal/13_Settings | Workflows | settingsPage | B | covered | P2 | — |
| Patient-Portal/14_Timeline | Workflows | timelinePage | J | covered | P2 | group-J |
| Patient-Portal/15_Notification_System | Notifications | notificationWorkflow | I | covered | P2 | — |

---

## Meeting Server (1)

| ProcessDoc | Domain | UnitTest | UI | Status | Priority | ScreenshotRef |
|------------|--------|----------|-----|--------|----------|---------------|
| Meeting-Server/00_Meeting_Server_Overview | Meeting | meeting-server/*, meetingRuntimeApi, saveRecordingContract | E, Q | covered | P0 | group-Q/ |
| Meeting-Server/01_Meeting_Room | Meeting | meetingRoomRoutes, meetingUxContract, jitsiMeetingConfig | E, Q, R | covered | P0 | group-E/ (cloud capture) |
| Meeting-Server/02_Meeting_Results | Meeting | meetingResultsValidation, meetingUxContract, postMeetingWorkflow | Q | covered | P0 | group-Q/ (cloud capture) |
| Meeting-Server/03_Emr_Appointment_Page | Clinical | emrAiDraft, meetingRoomRoutes, phrEmrUxContract | E, F | covered | P0 | group-E/ (cloud capture) |

---

## Workflow documents

| ProcessDoc | UnitTest | UI | Status | Priority |
|------------|----------|-----|--------|----------|
| Appointment_Workflows.md | appointmentService, appointmentWorkflow, bookAppointment | D | covered | P0 |
| VIDEO_MEETING_JITSI_GEMINI.md | meeting-server/*, jitsiMeetingConfig | E, Q | covered | P0 |
| FULL_WORKFLOW_CONTRACT.md | cross-portal/* | A–Q | covered | P0 |
| Data_Sync_Documentation.md | syncQueue.integration.test.ts | — | covered | P1 |
| Notification_Workflows.md | notificationWorkflow | I | covered | P2 |
| Health_Records_Processes.md | phrRoute, emr*, healthRecordsWorkflowContract, clinicalDocumentDelivery | F, E, L | covered | P1 |
| Clinical_Document_Delivery_Workflows.md | clinicalDocumentDelivery.test.ts, phrDocuments.test.ts | E, F | covered | P0 |
| GATE0_IMPLEMENTATION_STATUS.md | gate0ImplementationContract, verify:gate0:local | D, E | covered | P0 |
| TWO_ROUND_CLOUD_TESTING.md | — | A→D→D-host→Q→E→F | covered | P0 |
| ENV_AND_STACK_CHECK.md | doctorEnvAudit, envSchema | M | covered | P2 |
| User_management_Workflows.md | auth*, userManagementWorkflow, adminDoctorManagement | A, B | covered | P1 |
| Living_Will_Processes.md | livingWillWorkflow, pdpa* | G | covered | P2 |
| Medical_Consultants_Workflows.md | medicalConsultants | H | covered | P2 |
| Medicine_Content_Processes.md | medicalContentWorkflow, contentRoute | H | covered | P2 |
| Clinical_Resources_* | clinicalResources | H | covered | P2 |
| PHASE1_* / System_Architecture_* | phase1RequirementsContract, schemaAndSeed, embeddedPg | — | covered | P2 |

---

## Playwright Group Q (meeting lifecycle P0)

| Test | Description |
|------|-------------|
| Q01 | 3-party cloud: doctor HOST + patient + guest lobby → admit → 10s → end |
| Q02 | recording on disk + dashboard player + generate-summary (live Gemini) or degraded badge when `PW_SKIP_LIVE_GEMINI=1` |

**Run:** `npm run test:e2e:meeting-lifecycle` (requires `D-appointments`, `D-doctor-host` first)

## Wave test packs (Vitest)

| Wave | New unit tests |
|------|----------------|
| 1 | `meetingRuntimeApi.test.ts`, `Izara-jitsi-server/tests/saveRecordingContract.test.mjs` |
| 2 | `authServer.http.test.ts`, `emrAutosave.test.ts`, `prescribingAllergy.test.ts`, `queueSocket.test.ts` |
| 3 | `appointmentSlotLock.test.ts`, `pdpaAudit.integration.test.ts`, `aiTriage.test.ts` |
| 4 | `appointmentsRollback.test.ts`, `syncQueue.integration.test.ts` |

**Audit:** `python scripts/audit-process-coverage.py` → `tests/PROCESS_COVERAGE_GAPS.md`

**Registry gate:** `tests/unit/cross-portal/processWorkflowRegistry.ts` + `processPageCoverage.test.ts` (44 process docs → Vitest files)

**Contract suites (2026-06-05):**

| Suite | Process docs | Tests |
|-------|----------------|-------|
| `doctor-portal/processPagesContract.test.ts` | Doctor 00–21 | Route/role matrix |
| `patient-portal/processPagesContract.test.ts` | Patient 00–15 | Auth/route matrix |
| `cross-portal/fullWorkflowInvariants.test.ts` | FULL_WORKFLOW_CONTRACT | Global invariants |
| `cross-portal/appointmentWorkflowContract.test.ts` | Appointment_Workflows | Lifecycle FSM |
| `cross-portal/healthRecordsWorkflowContract.test.ts` | Health_Records_Processes | PHR/EMR boundaries |

**Docker grouped run (memory-safe):** `npm run test:unit:docker:grouped` or `npm run test:unit:docker:grouped -- doctor patient cross`

**Selectors:** [tests/SELECTORS.md](SELECTORS.md)
