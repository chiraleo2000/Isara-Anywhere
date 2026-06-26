# Cloud E2E navigation fixes — 2026-06-26

## Symptom

`test:cloud:deploy-gate` failed intermittently on Cloud Run:

- A2b: `page.reload` timeout on `/register` (misclassified as login redirect)
- A01 fixture warmup: Admin Firefox sparse-content `reload` hung 180s on heavy dashboard

## Fixes (`tests/helpers/multi-portal.ts`)

1. Login redirect recovery uses `page.goto(url)` instead of `reload`
2. `/register` no longer triggers auth re-injection path
3. Public auth shells skip sparse-content recovery (`/register`, `/reset-password`, `/login`, `/forgot-password`)
4. Sparse recovery uses `goto(url, waitUntil: 'commit')` with catch-and-proceed
5. Cloud content-wait increased 12s → 25s (role-scaled)
6. Cloud storageState context timeout 60s → 120s

## Result

`npm run test:cloud:deploy-gate` — **21/21 PASS** (run 4, `reports/cloud-deploy-gate-run-4.log`, exit 0)
