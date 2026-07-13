# Local Pre-Deploy Gate Baseline (v5.2)

Date: 2026-07-13T05:34:26.715Z

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
| browser-core-firefox | — | PASS |
| browser-core-webkit | — | PASS |
| browser-appointments-firefox | — | PASS |
| e2e-full-headed | tests/PROCESS_COVERAGE_MATRIX.md | FAIL (1) |

**Blocked at:** e2e-full-headed (tests/PROCESS_COVERAGE_MATRIX.md)

Policy: PW_HEADED=1, PW_SKIP_LIVE_GEMINI=1, no local docs:sync-screenshots