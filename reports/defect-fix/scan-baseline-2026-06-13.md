# Scan Baseline — BMS Telemed Parity (v1.7.53)

Date: 2026-06-13
Branch: v1.7.52-test-hardening

Records the local scan + unit results after removing demo/virtual-meeting, JWT cleanup,
SonarQube fixes, and meeting host/UX hardening. Maps each check to its Process doc.

| Step | Process doc | Result |
|------|-------------|--------|
| verify-deps | Processes/ENV_AND_STACK_CHECK.md | PASS |
| env-audit (8 required, 0 forbidden) | Processes/ENV_AND_STACK_CHECK.md | PASS |
| sonar:lint (15 accepted CORS warns, 0 errors) | Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md | PASS |
| security:scan — app-security-scan | Processes/SECURITY_SCANNING.md | PASS |
| security:scan — cve-lite (0 HIGH+ in doctor/patient/jitsi) | Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md | PASS |
| security:scan — audit-prod | Processes/SECURITY_SCANNING.md | PASS |
| security:scan — security-hardening | Processes/SECURITY_SCANNING.md | PASS |
| doctor-portal type-check (tsc) | Processes/PROCESS_TO_TEST_GATE.md | PASS |
| patient-portal type-check (tsc) | Processes/PROCESS_TO_TEST_GATE.md | PASS |
| unit suite (3156 tests / 204 files) | Processes/FULL_WORKFLOW_CONTRACT.md | PASS |
| meeting-server contract (79 tests) | Processes/Pages/Meeting-Server/00_Meeting_Server_Overview.md | PASS |
| post-meeting-pipeline + recordingCrypto | Processes/POST_MEETING_WORKFLOW.md | PASS |
| process-audit (0 gaps) | Processes/PROCESS_TO_TEST_GATE.md | PASS |
| secret scan (.env gitignored, none tracked) | Processes/SECURITY_SCANNING.md | PASS |

## Key changes validated

- Removed both `VirtualMeeting.tsx` pages, the `/virtual-meeting/:id` route, and all external
  `meet.jit.si` browser-tab links. All consultations use the in-app `/meeting/:id` real Jitsi flow
  through the Izara meeting server (lobby + doctor host + transcript + Gemini summary).
- JWT removed from Jitsi mounts and URL builders; session-token auth retained (`sessions` table).
- SonarQube issues fixed in `HealthMeeting.tsx`, `run-local-pre-deploy-gate.mjs`,
  `run-security-scan.mjs`, and `tests/helpers/multi-portal.ts`.
- PatientMeetingRoom no longer bypasses the lobby on API failure; Jitsi mount stays gated on
  `waitForHostReady`. Header typos fixed (Izara Meeting / Transcript / Live Transcript).

## Pending (environment / approval gated)

- Docker compose + probe-health, full headed Playwright gate (87 E2E) — require Docker Desktop.
- Cloud deploy + cloud gate + live Gemini probe + cloud doc screenshots — require GCP credentials.
- User-guide Word/PPT/PDF rebuild — requires the Python/pandoc doc toolchain.
- Git commit/push/tag — requires explicit user approval per repo policy.

**Overall (local deterministic scope):** PASS
