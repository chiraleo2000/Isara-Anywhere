# Cloud E2E Error Ledger - Round 1

**Generated:** 2026-05-23T11:53:43.796Z (immutable)

| Metric | Value |
|--------|-------|
| Expected pass | 19 |
| Failures | 1 |
| P0 | 1 |
| P1 | 0 |

## Rule

Do not apply application fixes until this ledger file exists for the round.

## Failures

### [P0] Group Q - Meeting Lifecycle (3-party) > Q02 - Recording on disk/DB, dashboard playback, Gemini summary UI

- **Project:** Q-meeting-lifecycle
- **Category:** recording
- **Service:** meeting
- **Message:** Error: recordingUrl not available within 180000ms for meeting f206c681-db4e-4596-84a8-690b5397a3ad
- **Screenshots:** test-results\group-A-auth-access.ui-tes-10ff0-s-persist-in-all-3-browsers-A-auth\test-finished-1.png, test-results\group-A-auth-access.ui-tes-10ff0-s-persist-in-all-3-browsers-A-auth\test-finished-2.png, test-results\group-A-auth-access.ui-tes-10ff0-s-persist-in-all-3-browsers-A-auth\test-finished-3.png, test-results\group-A-auth-access.ui-tes-1826a-returns-429-after-threshold-A-auth\test-finished-1.png, test-results\group-A-auth-access.ui-tes-1826a-returns-429-after-threshold-A-auth\test-finished-2.png
