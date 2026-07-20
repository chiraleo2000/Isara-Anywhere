# Cloud Green Checkpoint

**Date:** 2026-07-20  
**Baseline:** `20260720-1300`  
**Status:** PASS  
**Evidence root:** `reports/baseline-20260720-1300/`  
**Tag:** **v1.7.63**

## DB (mandatory)

**DB = GCE VM Postgres `35.240.157.230:5432` / `izara_phase1` / `DB_SSL=false` — not Cloud SQL**  
**Effective via discrete `DB_*` (`DATABASE_URL` not mounted on Cloud Run)**

| Proof | Evidence |
|-------|----------|
| Deploy + smoke | `cloud-deploy.txt` — build `c9d56385-…` SUCCESS; traffic 100%; health 200 |
| Cleanup host | `cloud-cleanup.txt` — GCE VM `35.240.157.230` |

## Cleared

| Gate | Evidence |
|------|----------|
| Local green prerequisite | `LOCAL_GREEN_CHECKPOINT.md` (baseline `20260720-local`) |
| `cloud:deploy` v1.7.63 + smoke + traffic shift | `cloud-deploy.txt` |
| `test:cloud:deploy-gate` (smoke → GATE0 → meeting AI → A/D/Q) | `cloud-deploy-gate.txt` — 19 passed |
| Cloud UI showup A/B/C (+ S) | `cloud-ui-showup.txt` / `CLOUD_UI_SHOWUP_RESULTS.md` — 31 passed |
| `test:cloud:full` | `CLOUD_FULL_COVERAGE_RESULTS.md` — **88 effective pass** (85 + E/F/L retry 13; zero residuals) |
| Screenshot uniqueness | `screenshots-all.txt` + `screenshots-global.txt` (375 PNGs) |
| `docs:sync-screenshots` + `docs:evidence:cloud` | `docs-sync.txt`, `docs-evidence.txt` |
| `cleanup:cloud-test-only` (no reseed) | `cloud-cleanup.txt` / `CLOUD_DEMO_DATA_CLEANUP.md` |

**Phase 4 docs may proceed** (cloud-synced `docs/screenshots/` only; document GCE VM Postgres as cloud DB; Cloud Run uses `DB_*` not `DATABASE_URL`).

## Supersedes

Prior baseline `20260717-1300` is historical only — see `reports/baseline-20260720-1300/STALE_AUDIT.md`.
