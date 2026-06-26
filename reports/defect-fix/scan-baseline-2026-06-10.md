# Local Pre-Deploy Gate Baseline (v5.2)

Date: 2026-06-26T05:20:49.285Z

| Step | Process doc | Result |
|------|-------------|--------|
| env-audit | Processes/ENV_AND_STACK_CHECK.md | PASS |
| unit-coverage | Processes/FULL_WORKFLOW_CONTRACT.md | PASS |
| unit-auth | — | PASS |
| unit-appointments | — | PASS |
| unit-clinical | — | PASS |
| unit-meeting | — | PASS |
| unit-ai | — | PASS |
| unit-api | — | PASS |
| unit-database | Processes/PostgreSQL_Database_Architecture.md | PASS |
| unit-workflows | Processes/Separated_Workflows_And_Functions.md | PASS |
| unit-security | — | PASS |
| unit-notifications | — | PASS |
| unit-meeting-acceptance | — | PASS |
| security-hardening | — | PASS |
| meeting-contract | — | PASS |
| post-meeting-pipeline | — | PASS |
| sonar-lint | — | PASS |
| security-scan | Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md | PASS |
| lint-portals-full | — | PASS |
| process-contracts | Processes/PROCESS_TO_TEST_GATE.md | PASS |
| v5-contracts | Processes/PROCESS_TO_TEST_GATE.md | PASS |
| docker-compose | Processes/ENV_AND_STACK_CHECK.md | PASS |
| docker-probe | Processes/ENV_AND_STACK_CHECK.md | PASS |
| gate0-local | Processes/GATE0_IMPLEMENTATION_STATUS.md | PASS |
| e2e-full-headed | tests/PROCESS_COVERAGE_MATRIX.md | PASS |
| screenshots-all | — | PASS |
| screenshots-group-e | — | PASS |
| screenshots-group-s | — | PASS |
| screenshots-group-q2 | — | PASS |
| screenshots-global | — | PASS |
| process-audit | Processes/PROCESS_TO_TEST_GATE.md | PASS |

**Overall:** PASS

Policy: PW_HEADED=1, PW_SKIP_LIVE_GEMINI=1, no local docs:sync-screenshots