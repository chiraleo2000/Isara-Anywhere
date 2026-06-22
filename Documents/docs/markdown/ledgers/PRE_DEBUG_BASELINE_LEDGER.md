# Pre-Debug Baseline Ledger

| Field | Value |
|-------|-------|
| Environment | local Docker + cloud (dev-testing) |
| Generated | 2026-06-22 |
| Release track | v1.7.53 |

| Passed | ~3200 (unit, Docker) + 78 meeting contracts + phase gates 0–9 wired |
| Failed | See `reports/local-error-ledger/*-latest.json` after `npm run ledger:local` |

## Local pre-deploy gate (v1.7.53)

`npm run test:local:pre-deploy-gate` — phase 9 full gate with pre-phase smoke, groups A–S screenshots, static guards.

## Failures

Pruned by `npm run cleanup:project`. Regenerate ledger: `npm run ledger:local -- --round N`.
