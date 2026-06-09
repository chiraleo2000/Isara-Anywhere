# Unit Test + UI Screenshot Coverage — v1.7.52

> Generated: 2026-06-09 | Defect track: test hardening gate + Sonar remediation | Registry: [tests/PROCESS_COVERAGE_MATRIX.md](../../../tests/PROCESS_COVERAGE_MATRIX.md)

## Summary

| Metric | Value |
|--------|-------|
| Unit test files passed | **192** |
| Unit tests passed (Vitest) | **3037** |
| Meeting-server HTTP contracts | **78** |
| Combined automated gate (local Docker) | **3115** (3037 + 78) |
| Local E2E core pipeline (A→D→Q→E→F→L) | **35 passed, 0 skipped** (2026-06-08) |
| Jitsi role + prejoin (J + R) | **16/16 PASS** (2026-06-08) |
| Run status | **PASS** (Docker `node:20-alpine`, consecutive full runs) |
| UI screenshot folders | 16 |
| UI PNG artifacts | 212 |
| Defect-regression Playwright (cloud) | **36 passed, 0 skipped** (2026-05-30) |
| Full cloud Playwright (headed) | **85 passed, 0 skipped** (2026-05-31, 7.7m) |
| Docker Group W multi-browser | **18 passed, 0 skipped** (2026-06-05, Chromium + Firefox + WebKit) |
| Process page coverage gate (PCOV) | **49** tests in `processPageCoverage.test.ts` |
| Sonar / quality | `npm run test:quality:gate` PASS |
| Docker Group W PNG (docs) | **39** in `screenshots/group-W/browsers/` (+ 13 canonical) |

## Docker test commands (local)

```bash
# Full Vitest suite in container (matches CI)
npm run test:unit:docker

# Memory-safe: doctor → patient → cross-portal → meeting-server
npm run test:unit:docker:grouped

# Rebuild docker-compose stack + Vitest + meeting-server contracts
npm run test:unit:docker:deploy

# Meeting-server contracts only (on host)
npm run test:meeting-server:contract

# Group W — Chromium + Firefox + WebKit in Docker (DB reset per browser)
npm run test:e2e:docker:core-multibrowser

# Copy green screenshots into Documents/docs/screenshots/group-W/
npm run docs:sync-screenshots
```

Setup guide: [DOCKER_MULTIBROWSER_E2E.md](DOCKER_MULTIBROWSER_E2E.md)

**Registry:** `tests/unit/cross-portal/processWorkflowRegistry.ts` maps 44 `Processes/` docs → Vitest files. Contract suites: `processPagesContract.test.ts` (doctor + patient), `fullWorkflowInvariants.test.ts`, `appointmentWorkflowContract.test.ts`, `healthRecordsWorkflowContract.test.ts`.

## Test hardening packs (v1.7.52)

- `generateSummary.integration.test.ts` — GSUM-01–07 post-meeting pipeline
- `meetingResultsValidation.test.ts` — MRV-01–05 doctor man-in-the-loop
- `emrToPhrDelivery.integration.test.ts` — EPH-01–06 EMR→PHR chain
- `threePartyLobby.integration.test.ts` — TPL-01–05 lobby admission
- `authLoginResponse.test.ts`, `doctorLogin.integration.test.ts`, `adminLogin.test.ts`, `patientLogin.integration.test.ts` — AUTH-*
- `calendarConfirmNotification.test.ts` — CAL-03–05 confirm payloads
- `postMeetingWorkflow.integration.test.ts` — PMW06–07 expanded

## Defect + hardening packs (v1.7.49–v1.7.51)

- `queueAcceptTraceability.test.ts` — accept updates row; `includeAccepted=true`; 7-day window
- `defectIsaraPdfMeetingQueue.test.ts` — Q1/J1/M3 defect PDF items + **DPDF-CAL1/CAL2** (calendar URL + mapper)
- `jitsiRoleJwt.test.ts`, `jitsiDisplayName.behavior.test.ts` — JWT roles + patient display name
- `queueLifecycle.integration.test.ts`, `meetingJoinContract.test.ts` — pool + join-config contracts
- **v1.7.51 calendar:** `calendarEventLinks.test.ts`, `appointmentMapper.test.ts`, `buildCalendarEventUrl.test.ts`
- **v1.7.51 meeting:** `parseLobbyThreeParty.test.ts`; E2E Q01f 3-party 10s hold; **L1** unskipped (doctor login JWT)
- **v1.7.51 E2E:** `group-D` **D4cal** — notification `calendarEventUrl`, doctor schedule testids, patient mini-calendar

## Unit domain → UI proof mapping

Vitest validates logic in isolation; Playwright screenshots prove the same flows on cloud UI.

| Unit domain | Vitest scope | UI screenshot folders |
|-------------|--------------|------------------------|
| **auth** | doctor-portal/auth*, patient-portal/auth* | group-A, sso (14 PNG) |
| **appointments** | *appointment*, *queue*, *book* | group-D (29 PNG), **group-W** W02–W03 |
| **clinical** | *emr*, *phr*, *prescri*, *lab*, *pdpa* | group-F, group-G (28 PNG), **group-W** W05 |
| **meeting** | meeting-server/*, *meeting*, *jitsi* | group-E, group-J-meeting-jitsi, group-Q (31 PNG), **group-W** W04 |
| **security** | *owasp*, *sanitize*, *jwt*, security/* | group-A (10 PNG) |
| **responsive** | *responsive*, layout* | group-S (4 PNG) |
| **ai** | *ai*, *gemini* | group-J, group-H, **group-W** (Gemini FAB) |
| **admin** | *admin* | group-C, group-I (28 PNG) |
| **defects** | defectRegisterCoverage, clinicalComponentStructure | group-defect (see defect pack) |

## Gate screenshots (cloud verification)

### group-A

- ![A01 admin dashboard](../../screenshots/group-A/A01-admin-dashboard.png)
- ![A01 doctor dashboard](../../screenshots/group-A/A01-doctor-dashboard.png)
- ![A01 patient dashboard](../../screenshots/group-A/A01-patient-dashboard.png)
- ![A02 patient sidebar](../../screenshots/group-A/A02-patient-sidebar.png)
- ![A03 doctor sidebar](../../screenshots/group-A/A03-doctor-sidebar.png)
- ![A04 admin sidebar](../../screenshots/group-A/A04-admin-sidebar.png)
- ![A07 role isolation](../../screenshots/group-A/A07-role-isolation.png)
- ![A09 doctor stats](../../screenshots/group-A/A09-doctor-stats.png)
- ![A09 patient stats](../../screenshots/group-A/A09-patient-stats.png)
- ![A2b auth registration](../../screenshots/group-A/A2b-auth-registration.png)

### group-S

- ![S01 patient dashboard](../../screenshots/group-S/S01-patient-dashboard.png)
- ![S02 doctor dashboard](../../screenshots/group-S/S02-doctor-dashboard.png)
- ![S03 patient deep routes](../../screenshots/group-S/S03-patient-deep-routes.png)
- ![S04 doctor deep views](../../screenshots/group-S/S04-doctor-deep-views.png)

## Docker multi-browser — group-W (2026-06-05)

- ![W01 patient dashboard](../../screenshots/group-W/W01-patient-dashboard.png)
- ![W01 doctor dashboard](../../screenshots/group-W/W01-doctor-dashboard.png)
- ![W01 admin dashboard](../../screenshots/group-W/W01-admin-dashboard.png)
- ![W02 appointments list](../../screenshots/group-W/W02-appointments-list.png)
- ![W02 appointment created](../../screenshots/group-W/W02-appointment-created.png)
- ![W03 health meeting](../../screenshots/group-W/W03-health-meeting.png)
- ![W03 appointment pool](../../screenshots/group-W/W03-appointment-pool.png)
- ![W04 doctor virtual meeting](../../screenshots/group-W/W04-doctor-virtual-meeting.png)
- ![W04 patient meeting room](../../screenshots/group-W/W04-patient-meeting-room.png)
- ![W05 patient detail](../../screenshots/group-W/W05-patient-detail.png)
- ![W05 EMR editor](../../screenshots/group-W/W05-emr-editor.png)
- ![W06 Gemini studio](../../screenshots/group-W/W06-gemini-studio-open.png)
- ![W06 API Connected](../../screenshots/group-W/W06-gemini-api-connected.png)

Per-engine: `screenshots/group-W/browsers/{chromium,firefox,webkit}/` · Guide: [DOCKER_MULTIBROWSER_E2E.md](DOCKER_MULTIBROWSER_E2E.md)

## Sample workflow screenshots

### workflows/auth-login

- ![auth-login/WF01-patient-login-page.png](../../screenshots/workflows/auth-login/WF01-patient-login-page.png)
- ![auth-login/WF02-patient-dashboard-after-login.png](../../screenshots/workflows/auth-login/WF02-patient-dashboard-after-login.png)
- ![auth-login/WF02-patient-login-filled.png](../../screenshots/workflows/auth-login/WF02-patient-login-filled.png)
- ![auth-login/WF03-patient-dashboard.png](../../screenshots/workflows/auth-login/WF03-patient-dashboard.png)
- ![auth-login/WF08-doctor-login-page.png](../../screenshots/workflows/auth-login/WF08-doctor-login-page.png)
- ![auth-login/WF09-doctor-dashboard.png](../../screenshots/workflows/auth-login/WF09-doctor-dashboard.png)

### workflows/appointment-lifecycle

- ![appointment-lifecycle/WF04-patient-appointments-empty.png](../../screenshots/workflows/appointment-lifecycle/WF04-patient-appointments-empty.png)
- ![appointment-lifecycle/WF05-book-appointment-step1.png](../../screenshots/workflows/appointment-lifecycle/WF05-book-appointment-step1.png)
- ![appointment-lifecycle/WF10-appointment-management-pool.png](../../screenshots/workflows/appointment-lifecycle/WF10-appointment-management-pool.png)
- ![appointment-lifecycle/WF11-appointment-confirmed.png](../../screenshots/workflows/appointment-lifecycle/WF11-appointment-confirmed.png)
- ![appointment-lifecycle/WF12-health-meeting-queue.png](../../screenshots/workflows/appointment-lifecycle/WF12-health-meeting-queue.png)
- ![appointment-lifecycle/WF12b-doctor-notifications.png](../../screenshots/workflows/appointment-lifecycle/WF12b-doctor-notifications.png)

## Commands

```powershell
npm run test:unit
npm run test:unit:report
npm run test:quality:gate
npm run test:cloud:full          # 85 headed tests + user guide rebuild
npm run test:gate:ui-showup
npm run test:cloud:unit-gate
```
