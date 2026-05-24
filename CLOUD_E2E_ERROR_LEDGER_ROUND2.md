# Cloud E2E Error Ledger - Round 2

**Generated:** 2026-05-23T05:45:02.394Z (immutable)

| Metric | Value |
|--------|-------|
| Expected pass | 67 |
| Failures | 1 |
| P0 | 1 |
| P1 | 0 |

## Rule

Do not apply application fixes until this ledger file exists for the round.

## Failures

### [P0] Group Q - Meeting Lifecycle (3-party) > Q01 - Doctor HOST, patient + guest lobby, admit, 10s media, end

- **Project:** Q-meeting-lifecycle
- **Category:** lobby
- **Service:** meeting
- **Message:** Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed
- **Screenshots:** test-results\group-A-auth-access.ui-tes-10ff0-s-persist-in-all-3-browsers-A-auth\test-finished-1.png, test-results\group-A-auth-access.ui-tes-10ff0-s-persist-in-all-3-browsers-A-auth\test-finished-2.png, test-results\group-A-auth-access.ui-tes-10ff0-s-persist-in-all-3-browsers-A-auth\test-finished-3.png, test-results\group-A-auth-access.ui-tes-1826a-returns-429-after-threshold-A-auth\test-finished-1.png, test-results\group-A-auth-access.ui-tes-1826a-returns-429-after-threshold-A-auth\test-finished-2.png
