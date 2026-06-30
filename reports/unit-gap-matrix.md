# Unit gap matrix — Processes → Vitest (2026-06-30)

Auto-audit: `python scripts/audit-process-coverage.py` → **0 gaps** (42 page specs).

## Deep pack mapping (ut-01..ut-14)

| Todo | Domain | Primary test files | Status |
|------|--------|-------------------|--------|
| ut-02 | Doctor mainApiServer (PDPA, content, pool, BFF) | `mainApiServer.test.ts`, `pdpaConsentContract.test.ts`, `contentVisibilityContract.test.ts`, `meetingBffProxyContract.test.ts` | PASS |
| ut-03 | Doctor HealthMeeting + MeetingRoom | `meetingWorkflowHardening.test.ts`, `meetingRoomRoutes.test.ts`, `demoAutoAuth` via `meetingUxContract.test.ts` | PASS |
| ut-04 | Doctor EMR/post-meeting | `meetingBffProxyContract.test.ts`, `doctorDashboardPostMeeting.test.ts`, `emrAiDraft.test.ts`, `meetingResultsPlayback.test.ts` | PASS |
| ut-05 | Patient video-meeting-proxy | `meetingJoinProxy.test.ts`, `resolveMeetingServerUrl.test.ts` | PASS |
| ut-06 | Patient auto-lobby + guest | `meetingUxContract.test.ts`, `devTestingPatientLobby.test.ts` | PASS |
| ut-07 | Patient appointments + PDPA + PHR | `appointmentsRoute.test.ts`, `pdpaRoute.test.ts`, `phrDocuments.test.ts` | PASS |
| ut-08 | Meeting join-config JWT (private domain) | `joinConfigAcceptance.test.ts`, `jitsi-meeting.test.ts`, `selfHostedJitsiJwt.contract.test.ts`, `jitsiRoleJwt.test.ts` | PASS |
| ut-09 | Lobby admit/deny + host-ready | `hostReadyGate.test.ts`, `threePartyLobby.integration.test.ts`, `lobbyFlow` via `teamsLobbyContract.test.ts` | PASS |
| ut-10 | Post-meeting pipeline (mocked) | `postMeetingWorkflow.integration.test.ts`, `postMeetingPipeline.integration` (meeting-server) | PASS |
| ut-11 | Jibri webhook + recording | `jibriWebhook.test.ts`, `recordingRoundTrip.integration.test.ts` | PASS |
| ut-12 | bookToMeetToPhr chain | `bookToMeetToPhrChain.integration.test.ts` | PASS |
| ut-13 | Separated + combined workflows | `separatedWorkflowFunctions.test.ts`, `combinedWorkflowActions.test.ts` | PASS |
| ut-14 | processWorkflowRegistry 100% | `processPageCoverage.test.ts`, `doctor-portal/processPagesContract.test.ts`, `patient-portal/processPagesContract.test.ts` | PASS |

## Gate commands (2026-06-30)

| Gate | Result |
|------|--------|
| `test:unit:groups-sequential` | **17/17 PASS** |
| `test:unit:coverage:gate` | PASS |
| `test:unit:v5-contracts` + `process-contracts` + `meeting-acceptance` | PASS |
| `test:meeting-server:contract` | **84/84 PASS** |
| `test:audit:process` | **0 gaps** |

## Screenshot ↔ Process coupling (ss-06)

Authoritative matrix: `tests/PROCESS_COVERAGE_MATRIX.md` (`ScreenshotRef` column per page).

Validators: `npm run test:screenshots:group-*` + `test:screenshots:global` (153 PNGs synced via `docs:sync-screenshots`).
