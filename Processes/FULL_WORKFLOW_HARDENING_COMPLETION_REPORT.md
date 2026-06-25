# Full workflow hardening — completion report

**Updated:** June 25, 2026 (Part B P5B gate green � ledger round 9 p0Count=0 @ 06:06 UTC)

## Environment matrix

| Environment | Standalone PASS | Combined PASS | Notes |
|-------------|-----------------|---------------|-------|
| Local Windows | Per-app `test:standalone` on PG 5434–5436 | `test:local:pre-deploy-gate` on PG 5433 | Stop standalone stacks before full compose |
| Ubuntu LAN | Single-portal smoke (W8 deferred) | Full stack Q+R+B | Requires SSH to 192.168.10.239 |
| Cloud | Per-service smoke | `test:cloud:deploy-gate` | W9 complete |
| Isolated VM | patient/doctor/meeting-only compose | Platform full compose | Multitask port-matrix |

## Part A (Gate Release)

| Wave | Status |
|------|--------|
| W0–W7 | ✅ pre-deploy-gate P0=0 |
| W8 Ubuntu LAN | ⏸ deferred |
| W9–W10 | ✅ cloud deploy-gate, manual checklist |

## Part B (Platform Split)

| Phase | Deliverable | Standalone | Combined |
|-------|-------------|------------|----------|
| P0 | port-matrix, table-ownership, multitask:ports | — | — |
| P1 | 42 pages, per-app docs, docs:sync-to-apps | docs in each app | audit:process |
| P2 | Standalone Dockerfiles + vendored corsPolicy | docker build ×3 | — |
| P3 | compose.standalone PG 5434–5436 | health curl | docker:probe-health |
| P3B | test:standalone per app | test:standalone:all | — |
| P4 | env:sync, connection docs, clone-siblings | env:audit | — |
| P5B | COMBINED_TEST_COVERAGE.md | test:standalone:all | pre-deploy-gate |
| P5 | SPLIT_REPOS.md | — | — |
| P6 | CI workflows per repo | PR lint/unit/build | nightly combined |
| P7 | This report | ✅ columns | ✅ columns |

## Commands

```bash
npm run multitask:ports
npm run docs:sync-to-apps
npm run test:standalone:all
npm run test:local:pre-deploy-gate
```


## Latest gate proof (2026-06-25)

- `npm run test:standalone:all -- --serial` ? exit 0
- `npm run test:local:pre-deploy-gate` ? exit 0 (log: reports/local-error-ledger/p5b-gate-run-2.log)
- `reports/local-error-ledger/round-9-latest.json` ? p0Count=0
