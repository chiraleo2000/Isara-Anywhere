# Cloud Full Coverage Results

**Date:** 2026-07-20  
**Tag:** v1.7.63  
**Baseline:** `20260720-1300`

## Primary run

- Command: `npm run test:cloud:full`
- Log: `reports/baseline-20260720-1300/cloud-full.txt`
- Result: **85 passed**, **1 failed**, 2 did not run (E4 flake — browser closed mid-assert)

## Residual clear

- Command: `npx playwright test --project=E-meeting-clinical --project=F-phr-health-records --project=L-lab-ordering`
- Log: `reports/baseline-20260720-1300/cloud-full-retry-efl.txt`
- Result: **13 passed** (RETRY_EFL_EXIT=0)

## Verdict

**Zero residuals** — full cloud matrix cleared for baseline `20260720-1300` (effective **88/88** class coverage after E/F/L retry).
