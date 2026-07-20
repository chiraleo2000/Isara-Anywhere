# Local Green Checkpoint

**Date:** 2026-07-20  
**Baseline:** `20260720-local`  
**Status:** PASS  
**Evidence root:** `reports/baseline-20260720-local/`  
**Tag track:** package `1.7.63` (cloud deploy next)

## Cleared

| Gate | Evidence |
|------|----------|
| Unit packs + Docker Istanbul (lines/stmts 68.24, branches 67.09, functions 65.61) | `unit-coverage-gate-retry.txt` — 286 files / 3657 tests |
| PM-03 MeetingResults `results-pipeline-stage` | doctor `3294a03` + coverage retry PASS |
| Contracts / sonar / security / portal lint | prior pre-deploy steps in `pre-deploy-gate.txt` |
| GATE0 local | `pre-deploy-gate.txt` |
| Browser core W firefox + webkit + D firefox | `pre-deploy-gate-resume.txt` |
| Headed full matrix (A–F/B/C then G–Defect resume) | `pre-deploy-gate-resume.txt`, `e2e-remaining.txt` |
| Screenshot uniqueness + global (375 PNGs) | `pre-deploy-from-screenshots.txt` |
| Process audit (0 gaps) | `pre-deploy-from-screenshots.txt` |
| Local UI showup | `ui-showup.txt` — 15 passed |
| Local purge (retain seed) | `local-cleanup.txt` |

**Cloud may proceed** — Phase 2 must use GCE VM Postgres `35.240.157.230` only (not Cloud SQL), deploy tag **v1.7.63**.

## Notes

- Prior baseline `20260717-1300` / local `20260716-1318` superseded for this re-prove.
- Playwright browsers installed into sandbox cache before W-core firefox/webkit.
- Docker Desktop restarted mid-run; stack re-probed healthy before E2E remaining groups.
