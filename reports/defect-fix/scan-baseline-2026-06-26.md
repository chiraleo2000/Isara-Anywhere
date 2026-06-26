# Scan baseline — 2026-06-26

| ID | Phase | Check | Result | Evidence |
|----|-------|-------|--------|----------|
| P0.01 | P0 | docker compose + probe-health + meeting-api-smoke | **PASS** | All 5 containers healthy; meeting-api-smoke PASS |
| P0.02 | P0 | env:audit | **PASS** | 8 required keys, 0 forbidden |
| P0.03 | P0 | verify:deps | **BLOCKED** | Windows — ENOTEMPTY on npm ci; documented skip per plan |
| P0.04 | P0 | test:guards:static | **PASS** | no-legacy-src, credentials-include, no-dev-testing |
| P0.05 | P0 | eslint-deep inventory | **PASS** | doctor/patient/jitsi exit 0 after registerSW + jitsi bin fix |
| P0.06 | P0 | security:scan | **PASS** | app-scan 0 errors, CVE lite 0 HIGH+, audit:prod 0 |
| P0.07 | P0 | test:audit:process | **PASS** | PROCESS_COVERAGE_GAPS.md 0 gaps |
| P0.08 | P0 | phase:0 | **PASS** | lint-portals-full, meeting-server-contract green |
| P1.07 | P1 | sonar:lint | **PASS** | quality-gate-summary.json passed=true; eslint deadlock fix on Windows |
| P3.09 | P3 | test:local:pre-deploy-gate | **PASS** | Ledger round 9 P0=0; screenshots-global 209 unique hashes |

## Fixes applied this session

- Patient `registerSW.ts` (lib + utils): removed `void` on `Notification.requestPermission()` chain for `promise/catch-or-return`.
- `cloudbuild.yaml`: per-app `dir` for Docker build context (fixes vite missing in Cloud Build).
- `Dockerfile.unified`: `ENV NODE_ENV=development` in frontend builder (both portals).

## Re-verify (2026-06-26T07:05Z — final session)

| Check | Result | Evidence |
|-------|--------|----------|
| `docker:probe-health` | **PASS** | :3005/:3010/:3020 OK |
| `phase:0` | **PASS** | exit 0 (~27m); meeting-server-contract 83/83 |
| `sonar:lint` | **PASS** | `reports/sonar/quality-gate-summary.json` passed=true (2026-06-26T07:05:07Z) |
| `test:audit:process` | **PASS** | `tests/PROCESS_COVERAGE_GAPS.md` 0 gaps |
| `cleanup:project:dry` | **PASS** | exit 0; dry-run only (full cleanup not run) |
| `cloud:smoke` | **PASS** | 3/3 Cloud Run health (2026-06-26T07:00Z) |
| `cloud:deploy -Tag v1.7.55` | **PASS** | build `1b8315d9-c4b3-4c1a-8da3-62eb68afa82b` SUCCESS (after `cloudbuild.yaml` dir fix) |
| `test:cloud:deploy-gate` | **PASS** | 21/21 headed (11.3m); `reports/cloud-deploy-gate-run-2026-06-26.log`; session2 retry FAIL (A01 Firefox flake): `cloud-deploy-gate-failure-2026-06-26.md` |
| `ledger:cloud --round final` | **PASS** | `reports/cloud-error-ledger/round-final-latest.json` p0Count=0 |
| `test:cloud:doc-screenshots` | **FAIL** | 2 failed (A01, W01 doctor dashboard reload timeout); 77 skipped |
| Ping `192.168.10.239` | **BLOCKED** | 100% packet loss — see `lan-gate-deferred-2026-06-26.md` |

## Open / deferred

- P4 Ubuntu LAN: `192.168.10.239` unreachable — W8 deferred; `test:lan:deploy-gate` wired.
- P6.03: subtree push blocked — see `subtree-split-ready-2026-06-26.md`.
- P7.04–05: `test:cloud:full` not run; doc-screenshots retry needed; `guides:all` blocked on PNGs.
- P8.04: git push skipped per user instruction.
- W10: manual 3-party checklist (see completion report).
