# Cloud Green Checkpoint

**Date:** 2026-07-17  
**Baseline:** `20260717-1300`  
**Status:** PASS  
**Evidence root:** `reports/baseline-20260717-1300/`

## DB (mandatory)

**DB = GCE VM Postgres `35.240.157.230:5432` / `izara_phase1` / `DB_SSL=false` — not Cloud SQL**  
**Effective via discrete `DB_*` (`DATABASE_URL` not mounted on Cloud Run)**

| Proof | Evidence |
|-------|----------|
| TCP reachability | `p3-gce-db-tcp.txt` |
| `db-tool --target cloud` | `p3-db-tool-cloud-status.txt` |
| Cloudbuild (no DATABASE_URL mount) | `pA-db-lock-cloudbuild-grep.txt` |
| Secret hygiene | `pA-db-lock-secret-database-url.txt` + `pA-db-lock-secret-hygiene-fix.txt` — `database-url` host is GCE; `db-password` synced; do not mount URL |
| Cloud Run env | `p3-cloudrun-db-env-after.txt` — `DB_HOST=35.240.157.230`, no `DATABASE_URL`, cloudsql cleared (meeting cleared live) |
| Cleanup host | `CLOUD_DEMO_DATA_CLEANUP.md` — prints GCE host `35.240.157.230` |

## Cleared

| Gate | Evidence |
|------|----------|
| Local green prerequisite | `LOCAL_GREEN_CHECKPOINT.md` (baseline 1318 retained) |
| `cloud:deploy` v1.7.62 + smoke + traffic shift | `p3-cloud-deploy.txt`, `p3-shift-traffic.txt` |
| `verify:gate0` cloud | `p3-gate0-cloud.txt` |
| Cloud UI showup A/B/C (+ S) | `CLOUD_UI_SHOWUP_RESULTS.md` — 31 passed |
| `test:cloud:full` | `CLOUD_FULL_COVERAGE_RESULTS.md` — **88 passed**, zero residuals |
| Screenshot uniqueness | `p3-screenshots-all.txt` + `p3-screenshots-global.txt` (375 PNGs) |
| `docs:sync-screenshots` + `docs:evidence:cloud` | `p3-docs-sync.txt`, `p3-docs-evidence-cloud.txt` |
| `cleanup:cloud-test-only` (no reseed) | `CLOUD_DEMO_DATA_CLEANUP.md` |

**Phase 4 docs may proceed** (cloud-synced `docs/screenshots/` only; document GCE VM Postgres as cloud DB; Cloud Run uses `DB_*` not `DATABASE_URL`).
