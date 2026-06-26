# P7 Cloud deploy gate failure — 2026-06-26

## Run

| Field | Value |
|-------|-------|
| Command | `npm run test:cloud:deploy-gate` |
| Log | `reports/cloud-deploy-gate-run-2026-06-26-session2.log` |
| Exit | **1** |
| Tests | 1 failed, 20 skipped (fail-fast) |

## Pre-E2E (all PASS)

- `cloud:smoke` — 3/3 Cloud Run health
- `verify:gate0` — G1–G5 API chain
- `verify:cloud-meeting-ai` — sttAvailable=true

## Failure

| Test | Symptom |
|------|---------|
| A01 — All 3 portals loaded healthy after auth | Admin dashboard (Firefox): `locator('body').innerText()` timeout 20s |

Patient (Chrome) and Doctor (Edge) dashboards passed. Admin screenshot also timed out (15s).

## Retry

```powershell
npm run test:cloud:deploy-gate
# Or narrow repro:
cross-env TEST_ENV=cloud PW_SKIP_LIVE_GEMINI=1 PW_HEADED=1 npx playwright test --headed --project=A-auth --grep "A01" --workers=1
```

Consider using Chrome for admin fixture on cloud if Firefox flake persists.
