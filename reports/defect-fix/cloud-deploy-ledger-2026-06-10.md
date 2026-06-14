# Cloud Deploy Ledger — v3 Parity Gate

Date: 2026-06-10T18:12:00Z (updated 2026-06-11 v5.2 verification)  
Release tag: **v1.7.48** (parity implementation; no Cloud Run redeploy this session)

## v5.2 re-verification (2026-06-11)

| Check | Result |
|-------|--------|
| `npm run env:audit` | PASS |
| `npm run test:unit:v5-contracts` | PASS (93) |
| `npm run test:unit:process-contracts` | PASS (141) |
| `npm run test:audit:process` | PASS (0 gaps) |
| `npm run test:lint:portals:full` | PASS |
| `npm run cloud:smoke` | PASS |
| `npm run verify:gate0` | PASS (G1–G5) |
| `npm run verify:cloud-meeting-ai` | PASS |
| `npm run test:local:pre-deploy-gate` | **BLOCKED** — Docker Desktop not running (docker-probe + headed e2e) |

**Git remotes:** `origin`/`azure` → Azure DevOps OK. **`github` remote not configured** — add before Phase 8 push:  
`git remote add github https://github.com/chiraleo2000/Isara-Anywhere.git`

## Services verified

| Service | URL | Health |
|---------|-----|--------|
| Patient portal | `izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app` | 200 |
| Doctor portal | `izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app` | 200 |
| Meeting server | `izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app` | 200 |

## Gate results

| Check | Result |
|-------|--------|
| `npm run cloud:smoke` | PASS |
| `npm run verify:gate0` | PASS (G1–G5) |
| `npm run verify:cloud-meeting-ai` | PASS |
| `npm run test:cloud:deploy-gate` | PASS (21 Playwright tests) |

## Deploy action

Redeploy skipped — existing dev-testing revision already satisfies smoke + GATE0 + meeting-AI probe + A/D/Q Playwright.

To push local parity code changes:

```powershell
.\scripts\deploy-cloud-from-env.ps1 -Tag v1.7.48
npm run test:cloud:deploy-gate
```

## Known non-blocking warnings (Playwright)

- Jitsi `Could not start video source` in headless CI (no camera)
- `Timeout waiting for Google APIs` on doctor meeting page (maps optional)
- `chrome-extension://invalid` blocked by client (ad-blocker noise)
