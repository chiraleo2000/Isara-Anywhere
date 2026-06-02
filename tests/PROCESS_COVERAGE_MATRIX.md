# Process Documentation → Test Coverage Matrix

**Last updated:** 2026-05-27 (Cloud unit gate + Group S responsive + auth/register contracts)

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
| **Priority** | P0 meeting · P1 clinical/admin · P2 secondary |
| **UnitTest** | Vitest under `tests/unit/` |
| **UI** | Playwright project (group letter) |
| **ScreenshotRef** | Expected PNG under `Documents/docs/screenshots/` |

---

## Doctor Portal pages (22)

| ProcessDoc | Domain | UnitTest | UI | Status | Priority | ScreenshotRef |
|------------|--------|----------|-----|--------|----------|---------------|
| Doctor-Portal/00_Doctor_Portal_Overview | Auth | authServer, config | A | covered | P2 | group-A/A01-doctor-dashboard |
| Doctor-Portal/00_Overview | Auth | authServer, config | A | partial | P2 | group-A/A01-doctor-dashboard |
| Doctor-Portal/01_Login | Auth | authServer.test.ts, authServer.http.test.ts | A | covered | P1 | group-A |
| Doctor-Portal/02_Reset_Password | Auth | authServer.http.test.ts | A | covered | P2 | — |
| Doctor-Portal/03_Dashboard | Admin | dashboardFiltering | A, C | covered | P1 | group-A/A01-doctor-dashboard |
| Doctor-Portal/04_Schedule | Appointments | scheduleManagement | C, D | covered | P1 | group-D/D12-schedule |
| Doctor-Portal/05_Patient_Management | Clinical | patientDetailView | C, E | covered | P1 | group-E/E04-patients-list |
| Doctor-Portal/06_Health_Meeting | Meeting | queueManagementWorkflow, queueSocket.test.ts | D, E, Q | covered | P0 | group-D/D09-health-meeting |
| Doctor-Portal/07_Virtual_Meeting | Meeting | virtualMeetingWorkflow | E, Q | covered | P0 | group-Q/Q01b-doctor-host-jitsi |
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
| Doctor-Portal/19_Doctors_Management | Admin | adminDoctorManagement | I | partial | P2 | — |
| Doctor-Portal/20_Appointment_Pool_Management | Appointments | appointmentPoolManagement | D | partial | P0 | group-D/D11-appointment-pool |
| Doctor-Portal/21_Queue_Management | Appointments | queueManagementWorkflow, queueSocket.test.ts | D, E, Q | covered | P0 | group-D/D16b-doctor-queue-assigned |

---

## Patient Portal pages (16)

| ProcessDoc | Domain | UnitTest | UI | Status | Priority | ScreenshotRef |
|------------|--------|----------|-----|--------|----------|---------------|
| Patient-Portal/00_Patient_Portal_Overview | Auth | authRoute, auth-context | A, B | covered | P2 | group-A/A01-patient-dashboard |
| Patient-Portal/00_Overview | Auth | authRoute, auth-context | A, B | covered | P2 | group-A/A01-patient-dashboard |
| Patient-Portal/01_Login | Auth | authRoute | A, B | covered | P1 | group-A |
| Patient-Portal/02_Register | Auth | authPayloadContract | A | covered | P1 | group-A/A2b-auth-registration |
| Patient-Portal/03_Reset_Password | Auth | authPayloadContract | A | covered | P1 | group-A/A2b-auth-registration |
| Patient-Portal/04_Dashboard | Workflows | dashboardWorkflow | B | covered | P1 | group-A/A01-patient-dashboard |
| Patient-Portal/05_Appointments | Appointments | appointmentWorkflow, appointmentSlotLock.test.ts | D, E, Q | covered | P0 | group-D/D01-appointments-list |
| Patient-Portal/06_PHR | Clinical | phrRoute | F | partial | P0 | group-F/F01-phr-page |
| Patient-Portal/07_AI_Doctor | AI | aiRoute, aiTriage.test.ts | J | covered | P2 | group-J |
| Patient-Portal/08_Medical_Content_Library | Content | contentRoute | B, H | covered | P2 | group-H/H10-health-library |
| Patient-Portal/09_Map | Workflows | mapPage | J | covered | P2 | group-J |
| Patient-Portal/10_PDPA | Clinical | pdpaRoute, pdpaAudit.integration.test.ts | G | covered | P2 | group-G |
| Patient-Portal/11_Living_Will | Clinical | livingWillWorkflow | G | covered | P2 | group-G |
| Patient-Portal/12_Profile | Auth | userManagementWorkflow | B | partial | P2 | — |
| Patient-Portal/13_Settings | Workflows | settingsPage | B | covered | P2 | — |
| Patient-Portal/14_Timeline | Workflows | timelinePage | J | covered | P2 | group-J |
| Patient-Portal/15_Notification_System | Notifications | notificationWorkflow | I | covered | P2 | — |

---

## Meeting Server (1)

| ProcessDoc | Domain | UnitTest | UI | Status | Priority | ScreenshotRef |
|------------|--------|----------|-----|--------|----------|---------------|
| Meeting-Server/00_Meeting_Server_Overview | Meeting | meeting-server/*, meetingRuntimeApi, saveRecordingContract | E, Q | covered | P0 | group-Q/ |
| Meeting-Server/00_Overview | Meeting | meeting-server/*, meetingRuntimeApi, saveRecordingContract | E, Q | covered | P0 | group-Q/ |

---

## Workflow documents

| ProcessDoc | UnitTest | UI | Status | Priority |
|------------|----------|-----|--------|----------|
| Appointment_Workflows.md | appointmentService, appointmentWorkflow, bookAppointment | D | covered | P0 |
| VIDEO_MEETING_JITSI_GEMINI.md | meeting-server/*, jitsiMeetingConfig | E, Q | covered | P0 |
| FULL_WORKFLOW_CONTRACT.md | cross-portal/* | A–Q | covered | P0 |
| Data_Sync_Documentation.md | syncQueue.integration.test.ts | — | covered | P1 |
| Notification_Workflows.md | notificationWorkflow | I | covered | P2 |
| Health_Records_Processes.md | phrRoute, emr*, healthRecordsEmrWorkflow | F | partial | P1 |
| GATE0_IMPLEMENTATION_STATUS.md | verify:gate0 script | D, E | partial | P0 |
| TWO_ROUND_CLOUD_TESTING.md | — | A→D→D-host→Q→E→F | covered | P0 |
| ENV_AND_STACK_CHECK.md | serviceReadiness, globalSetupLogic | M | partial | P2 |
| User_management_Workflows.md | auth*, userManagementWorkflow | A, B | partial | P1 |
| Living_Will_Processes.md | livingWillWorkflow, pdpa* | G | covered | P2 |
| Medical_Consultants_Workflows.md | medicalConsultants | H | covered | P2 |
| Medicine_Content_Processes.md | medicalContentWorkflow, contentRoute | H | covered | P2 |
| Clinical_Resources_* | clinicalResources | H | covered | P2 |
| PHASE1_* / System_Architecture_* | schemaAndSeed, embeddedPg | — | partial | P2 |

---

## Playwright Group Q (meeting lifecycle P0)

| Test | Description |
|------|-------------|
| Q01 | 3-party cloud: doctor HOST + patient + guest lobby → admit → 10s → end |
| Q02 | recording on disk + dashboard player + generate-summary (mandatory Gemini) |

**Run:** `npm run test:e2e:meeting-lifecycle` (requires `D-appointments`, `D-doctor-host` first)

## Wave test packs (Vitest)

| Wave | New unit tests |
|------|----------------|
| 1 | `meetingRuntimeApi.test.ts`, `Izara-jitsi-server/tests/saveRecordingContract.test.mjs` |
| 2 | `authServer.http.test.ts`, `emrAutosave.test.ts`, `prescribingAllergy.test.ts`, `queueSocket.test.ts` |
| 3 | `appointmentSlotLock.test.ts`, `pdpaAudit.integration.test.ts`, `aiTriage.test.ts` |
| 4 | `appointmentsRollback.test.ts`, `syncQueue.integration.test.ts` |

**Audit:** `python scripts/audit-process-coverage.py` → `tests/PROCESS_COVERAGE_GAPS.md`

**Selectors:** [tests/SELECTORS.md](SELECTORS.md)
