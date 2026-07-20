# Cloud Full Coverage Results

**Date:** 2026-07-17  
**Baseline:** `20260717-1300`  
**Command:** `npm run test:cloud:full` + K/N/O retry  
**Env:** Cloud Run backed by **GCE VM Postgres** `35.240.157.230` (not Cloud SQL)  
**Status:** ALL-PASS  
**Exit:** 0 (after residual retry)

## Summary

| Run | Passed | Failed | Notes |
|-----|--------|--------|-------|
| Initial `test:cloud:full` | 78 | 10 | K/N/O failed: missing Playwright Chromium in sandbox cache |
| Retry K + N + O (`PLAYWRIGHT_BROWSERS_PATH=0`) | 18 | 0 | After `npx playwright install chromium` + SSO seed |
| **Combined** | **88** | **0** | Zero product residuals |

## Evidence

- `reports/baseline-20260717-1300/p3-cloud-full.txt`
- `reports/baseline-20260717-1300/p3-cloud-full-retry-kno.txt`
- Pre-suite purge: GCE `35.240.157.230` (cleanup exit 0)
- SSO seed: Secret Manager `db-password` (exit 0 on retry)
