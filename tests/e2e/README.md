# Isara Telemedicine - E2E Test Suite

> **Version:** 3.0.0 | **Updated:** February 6, 2026  
> **Files:** 6 spec files | **Coverage:** Full Phase 1 (all workflows, all users, all pages)

## 🚀 Quick Start

```powershell
cd tests/e2e

# Smoke test (quick health check)
npm run smoke

# All local tests
npm run full

# Cloud tests
npm run cloud

# View HTML report
npm run report
```

---

## 📁 Directory Structure

```text
tests/e2e/
├── run-tests.ps1               # ⭐ Main test runner (PowerShell)
├── playwright.config.ts        # Playwright config (3 projects: Local, Cloud, All)
├── package.json                # npm scripts
├── global-setup.ts             # Pre-authenticates users
├── lib/
│   └── test-config.ts          # Shared URLs, credentials, helpers
├── specs/
│   ├── 01-smoke.spec.ts        # Portal accessibility + health checks
│   ├── 02-api-status.spec.ts   # All API endpoints → 200 (both portals)
│   ├── 03-workflow.spec.ts     # Appointment → Meeting → EMR → AI → Notifications
│   ├── 04-ui-navigation.spec.ts # All pages: Patient (9) + Doctor (8) + Admin (10)
│   ├── 05-cloud.spec.ts        # Cloud Run health, infra, latency, OWASP
│   └── 06-registration.spec.ts # Patient & Doctor registration flows
├── fixtures/                   # Test data & audio transcripts
├── deprecated/
│   └── specs/                  # Archived old test files (42 files)
└── test-results/               # Screenshots, videos, reports
```

---

## 🧪 Test Files & Coverage

| # | File | Tests | Coverage |
|---|------|-------|----------|
| 1 | `01-smoke.spec.ts` | 8 | Portal loads, login pages, API health, DB health, meeting server |
| 2 | `02-api-status.spec.ts` | ~40 | Auth (5 users), Patient endpoints (11), Doctor endpoints (7), Admin endpoints (6), Meeting (3), System (4) |
| 3 | `03-workflow.spec.ts` | ~25 | Appointments, video meeting, health records/EMR, notifications, AI features, multi-patient |
| 4 | `04-ui-navigation.spec.ts` | ~35 | Login (5 users), Patient pages (8), Doctor pages (8), Admin pages (10), Appointment UI flow |
| 5 | `05-cloud.spec.ts` | ~20 | Cloud patient health (6), Cloud doctor health (4), Infrastructure (5), Connectivity (2), Cloud auth (3) |
| 6 | `06-registration.spec.ts` | 6 | Patient registration (3), Doctor registration (3) |

### Total: ~134 tests covering ALL Phase 1 requirements

---

## 📋 npm Scripts

| Script | Command | What it runs |
|--------|---------|--------------|
| `npm run smoke` | `01-smoke` | Quick health check (~1 min) |
| `npm run api` | `02-api-status` | All API endpoints (~3 min) |
| `npm run workflow` | `03-workflow` | Full workflow (~3 min) |
| `npm run ui` | `04-ui-navigation` | All UI pages, headed (~5 min) |
| `npm run registration` | `06-registration` | Registration flows, headed (~2 min) |
| `npm run cloud` | `05-cloud` | Cloud deployment tests (~3 min) |
| `npm run local` | All local specs | Everything except cloud (~10 min) |
| `npm run full` | All local specs | Same as local, headed (~10 min) |
| `npm run all` | All specs | Local + cloud (~15 min) |

---

## 🔧 PowerShell Runner

```powershell
.\tests\e2e\run-tests.ps1 smoke                   # Quick local smoke test
.\tests\e2e\run-tests.ps1 api                      # API endpoints
.\tests\e2e\run-tests.ps1 workflow                  # Appointment/Meeting/EMR
.\tests\e2e\run-tests.ps1 ui -Headed               # UI tests with browser
.\tests\e2e\run-tests.ps1 registration              # Registration tests
.\tests\e2e\run-tests.ps1 full local               # Full local tests
.\tests\e2e\run-tests.ps1 cloud                    # Cloud tests
.\tests\e2e\run-tests.ps1 all -Workers 4           # All tests, 4 workers
```

---

## 🌐 Portal URLs

### Local (Docker)

| Service | URL |
|---------|-----|
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Meeting Server | http://localhost:3020 |

### Cloud (Google Cloud Run)

| Service | URL |
|---------|-----|
| Patient Portal | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| Doctor Portal | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

---

## 🔧 Configuration

### Shared Config (`lib/test-config.ts`)

```typescript
import {
  PATIENT_PORTAL_URL, DOCTOR_PORTAL_URL, MEETING_URL,
  CREDENTIALS, getAuthToken, authHeaders, logTestSuccess,
  URLS, TEST_ENV, TIMEOUTS, ENDPOINTS, REGISTRATION_DATA
} from '../lib/test-config';
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_ENV` | Environment (local/cloud) | `local` |
| `TEST_PATIENT_PASSWORD` | Override patient password | `P@ssw0rd` |
| `TEST_DOCTOR_PASSWORD` | Override doctor password | `IzaraDoctor@2024` |
| `TEST_ADMIN_PASSWORD` | Override admin password | `IzaraAdmin@2024` |
| `CLOUD_PATIENT_URL` | Cloud patient URL | (auto) |
| `CLOUD_DOCTOR_URL` | Cloud doctor URL | (auto) |

---

## 📝 Consolidation History (v3.0.0)

**Reduced from 42 → 6 spec files** while maintaining full coverage.

Old files are archived in `deprecated/specs/` for reference.

| Removed (archived) | Absorbed into |
|---------------------|---------------|
| smoke-test, core-e2e | `01-smoke` |
| api-status, health-records-*, clinical-resources-*, medical-consultants-*, medicine-content-*, notifications-*, living-will-*, video-meeting-jitsi, user-management-* | `02-api-status` |
| appointment-workflow, full-appointment-*, full-meeting-*, meeting-workflow, complete-workflow-*, process-docs-unit*, all phase1-* workflow files | `03-workflow` |
| ui-pages-workflow, ui-workflow-tests, workflow-ui-tests, comprehensive-parallel-ui, comprehensive-local-tests, multi-window-parallel-test, parallel-comprehensive-workflow, phase1-parallel-ui-workflow | `04-ui-navigation` |
| cloud-e2e-workflow, cloud-health-tests, full-workflow-cloud-tests | `05-cloud` |
| comprehensive-registration-workflow, registration-and-full-workflow | `06-registration` |
| `LOCAL_PATIENT_URL` | Local patient portal URL | <http://localhost:3005> |
| `LOCAL_DOCTOR_URL` | Local doctor portal URL | <http://localhost:3010> |
| `CLOUD_PATIENT_URL` | Cloud patient portal URL | (Cloud Run URL) |
| `CLOUD_DOCTOR_URL` | Cloud doctor portal URL | (Cloud Run URL) |
| `TEST_PATIENT_PASSWORD` | Patient test password | YOUR_TEST_PASSWORD |
| `TEST_DOCTOR_PASSWORD` | Doctor test password | YOUR_TEST_DOCTOR_PASSWORD |
| `TEST_ADMIN_PASSWORD` | Admin test password | YOUR_TEST_ADMIN_PASSWORD |

## Test Results Summary (Latest: 2025-01-28)

| Test Category | Tests | Status |
| --- | --- | --- |
| **Full Local E2E Suite** | **528** | ✅ All Passing |
| Process Documentation Unit Tests | 31 | ✅ All Passing |
| UI Pages Workflow (Headed) | 38 | ✅ All Passing |
| Cloud E2E Tests | 65 | ✅ All Passing |
| Full Appointment Workflow | 36 | ✅ All Passing |
| Full Meeting Workflow | 27 | ✅ All Passing |
| **Total Tests** | **528** | ✅ **ALL GREEN** |

### Test Breakdown by User Role

| Portal | User Type | Pages Tested | Status |
| --- | --- | --- | --- |
| Patient Portal | Patient (3 users) | 9 pages | ✅ All Passing |
| Doctor Portal | Doctor | 8 pages | ✅ All Passing |
| Doctor Portal | Admin | 10 pages | ✅ All Passing |

### API Endpoints - All Return Status 200

| Endpoint Category | Count | Status |
| --- | --- | --- |
| Health Check APIs | 6 | ✅ 200 |
| Authentication APIs | 5 | ✅ 200 |
| Appointment APIs | 8 | ✅ 200 |
| PHR/Health Records | 4 | ✅ 200 |
| Video Meeting (Jitsi) | 4 | ✅ 200 |
| Medical Content | 3 | ✅ 200 |
| Consultants | 2 | ✅ 200 |
| Notifications | 2 | ✅ 200 |
| Clinical Resources | 2 | ✅ 200 |

## Prerequisites

1. **Node.js 18+**
## 🛠 Prerequisites

1. **Node.js ≥ 22** and **npm**
2. **Docker containers running** (Patient Portal, Doctor Portal, PostgreSQL)
3. **Playwright browsers installed** (`npx playwright install chromium`)

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Ensure Docker containers are running: `docker compose up -d` |
| Auth fails | Verify test credentials in database |
| Timeout | Increase timeout or run with `--headed` to debug |
| Browser not found | Run `npx playwright install chromium` |

```powershell
# Debug mode
DEBUG=pw:api npx playwright test specs/01-smoke.spec.ts

# Run single test
npx playwright test -g "SMOKE-01" --headed
```
