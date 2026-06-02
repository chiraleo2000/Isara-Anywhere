# Pre-Debug Baseline Ledger (template)

| Field | Value |
|-------|-------|
| Environment | local \| cloud |
| Generated | YYYY-MM-DD |
| Commit | `<sha>` |
| Playwright command | `npm run test:baseline:local` / `test:baseline:cloud` |
| Vitest pre-check | `npm run test:unit:baseline` |

## Commands

```powershell
cd c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere
npm run test:unit:baseline
$env:BASELINE_VISUAL="1"; $env:PW_HEADED="1"; $env:PW_WORKERS="1"
npm run test:baseline:local
npm run test:baseline:responsive
# Cloud — requires GEMINI_API_KEY for full meeting pipeline
npm run test:baseline:cloud
npm run ledger:pre-debug -- --env cloud
```

## Results summary

| Passed | Failed | Skipped |
|--------|--------|---------|
| 0 | 0 | 0 |

## Failures

- _None_

## Blockers

- **GEMINI_API_KEY:** Required for cloud headed tests that invoke meeting AI (`run-cloud-tests.ps1`).
- **Local stack:** Patient `:3005`, doctor `:3010`, meeting server per README.

## Screenshots

Stored under `test-results/pre-debug/` when `BASELINE_VISUAL=1`.
