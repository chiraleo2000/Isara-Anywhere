# Isara Telemedicine - E2E Test Suite

> **Updated:** February 5, 2026  
> **Tests:** 123 LOCAL + 123 CLOUD = 246 Total (100% Passing, 0 Skipped)

## 🚀 Quick Start

```powershell
# Navigate to test directory
cd tests/e2e

# Run ALL Phase 1 tests on LOCAL (123 tests, 0 skipped)
$env:TEST_ENV="local"
npx playwright test specs/phase1-full-coverage.spec.ts specs/phase1-comprehensive-meeting.spec.ts --timeout=180000 --workers=4

# Run ALL Phase 1 tests on CLOUD (123 tests, 0 skipped)
$env:TEST_ENV="cloud"
npx playwright test specs/phase1-full-coverage.spec.ts specs/phase1-comprehensive-meeting.spec.ts --timeout=180000 --workers=4

# Run with visible browser (headed mode)
npx playwright test specs/phase1-full-coverage.spec.ts --headed

# View HTML Report
npx playwright show-report
```

---

## 🌐 Portal URLs

### Local Environment (Docker)

| Service | URL | Port |
|---------|-----|------|
| Patient Portal | http://localhost:3005 | 3005 |
| Doctor Portal | http://localhost:3010 | 3010 |
| Meeting Server | http://localhost:3020 | 3020 |

### Cloud Environment (Google Cloud Run)

| Service | URL |
|---------|-----|
| Patient Portal | https://izara-patient-portal-hvht4obouq-as.a.run.app |
| Doctor Portal | https://izara-doctor-portal-hvht4obouq-as.a.run.app |
| Meeting Server | https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app |

---

## 📁 Directory Structure

```text
tests/e2e/
├── run-tests.ps1               # ⭐ MAIN TEST RUNNER - Use this!
├── lib/
│   └── test-config.ts          # Shared configuration (URLs, credentials)
├── specs/
│   ├── phase1-full-coverage.spec.ts  # ⭐ MAIN TEST FILE (92 tests, 0 skipped)
│   ├── smoke-test.spec.ts      # Quick health checks
│   ├── api-status.spec.ts      # API endpoint tests
│   └── ...                     # Other workflow tests
├── fixtures/                   # Test data
└── playwright.config.ts        # Playwright configuration
```

---

## 🧪 Test Categories (20 Total - 92 Tests)

| # | Category | Tests | Description |
| - | -------- | ----- | ----------- |
| 1 | API Health & Database | 6 | Health endpoints, DB connection |
| 2 | User Management | 8 | Login (5 users), profiles, sessions |
| 3 | Appointment Workflow | 7 | Book, list, pool, history |
| 4 | Video Meeting (Jitsi) | 8 | Transcription, AI summary |
| 5 | Health Records (PHR) | 7 | Vitals, medications, allergies |
| 6 | EMR Workflow | 4 | SOAP format, AI summary |
| 7 | Patient Instructions | 2 | Generate & list |
| 8 | AI Features | 4 | Chat, CDS, Document Analysis |
| 9 | PDPA & Living Will | 3 | Consent management |
| 10 | Clinical Resources | 4 | Medical content |
| 11 | Notifications | 3 | Patient/Doctor alerts |
| 12 | Patient Portal UI | 6 | Dashboard, appointments |
| 13 | Doctor Portal UI | 5 | Dashboard, patients |
| 14 | Admin Portal UI | 3 | Admin features |
| 15 | Theme & Language | 2 | Dark mode, Thai/English |
| 16 | Doctor Data Services | 3 | Doctors list, specialties |
| 17 | Multi-Portal Parallel | 3 | Simultaneous multi-user |
| 18 | Full Workflow E2E | 2 | Appointment→Meeting→EMR |
| 19 | Error Handling | 4 | Invalid credentials |
| 20 | Phase 1 Requirements | 8 | Stakeholder verification |

---

## 🧪 Test Commands

### Using Playwright Directly (Recommended)

```powershell
cd tests/e2e

# Run LOCAL tests (92 tests)
$env:TEST_ENV="local"
npx playwright test specs/phase1-full-coverage.spec.ts --timeout=180000 --workers=4

# Run CLOUD tests (92 tests)
$env:TEST_ENV="cloud"
npx playwright test specs/phase1-full-coverage.spec.ts --timeout=180000 --workers=4

# Run specific category
npx playwright test specs/phase1-full-coverage.spec.ts --grep "Video Meeting"
npx playwright test specs/phase1-full-coverage.spec.ts --grep "Multi-Portal"

# Run with visible browser
npx playwright test specs/phase1-full-coverage.spec.ts --headed

# View report
npx playwright show-report
```

### Using run-tests.ps1

```powershell
# Test suites
.\tests\e2e\run-tests.ps1 smoke    # Quick health check (~2 min)
.\tests\e2e\run-tests.ps1 api      # API tests (~5 min)
.\tests\e2e\run-tests.ps1 ui       # UI tests with browser (~10 min)
.\tests\e2e\run-tests.ps1 full     # Full tests (~15 min)
.\tests\e2e\run-tests.ps1 all      # Everything (~20 min)

# Target environment
.\tests\e2e\run-tests.ps1 full local   # Local Docker
.\tests\e2e\run-tests.ps1 full cloud   # Cloud Run

# Options
.\tests\e2e\run-tests.ps1 full -Headed     # Visible browser
.\tests\e2e\run-tests.ps1 full -Workers 4  # 4 parallel workers
```

---

## 📋 Test Suites

| Suite | Files | Duration |
|-------|-------|----------|
| `smoke` | smoke-test.spec.ts | ~2 min |
| `api` | api-status.spec.ts, health-records-api.spec.ts | ~5 min |
| `ui` | comprehensive-parallel-ui.spec.ts, ui-pages-workflow.spec.ts | ~10 min |
| `full` | phase1-full-coverage.spec.ts | ~1.2 min |

---

## 🔧 Configuration

### Import from test-config.ts

```typescript
import { 
  PATIENT_PORTAL_URL, 
  DOCTOR_PORTAL_URL, 
  CREDENTIALS, 
  getAuthToken,
  logTestSuccess
} from '../lib/test-config';
```

### Environment Variables

```powershell
# Test environment
$env:TEST_ENV = "local"  # or "cloud"

# Override credentials (optional)
$env:TEST_PATIENT_PASSWORD = "your_password"
$env:TEST_DOCTOR_PASSWORD = "your_password"
```

---

## 📦 Key Test Files

| File | Description |
|------|-------------|
| `core-e2e.spec.ts` | ⭐ Consolidated core tests - run this first |
| `smoke-test.spec.ts` | Quick portal accessibility |
| `api-status.spec.ts` | API endpoint verification |
| `comprehensive-parallel-ui.spec.ts` | Full UI workflow |
| `appointment-workflow.spec.ts` | Appointment booking |
| `meeting-workflow.spec.ts` | Video meeting workflow |

---

## 📝 Version: 2.0.0 (February 4, 2026)

**Security note:** Use CI secrets or local `.env` files for real values. Do not commit credentials.

### Available Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `TEST_ENV` | Test environment (local/cloud) | local |
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
2. **Docker containers running** (Patient Portal, Doctor Portal, PostgreSQL)
3. **Playwright browsers installed**

## Quick Start

```bash
# Navigate to tests directory
cd tests/e2e

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run all tests
npm test

# Run with visible browser (UI mode)
npm run test:headed
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm test` | Run all tests |
| `npm run test:ui` | Open Playwright UI |
| `npm run test:headed` | Run with visible browser |
| `npm run test:local` | Run against local environment |
| `npm run test:cloud` | Run against cloud environment |
| `npm run test:api` | Run API status tests only |
| `npm run test:appointment` | Run appointment workflow tests |
| `npm run test:meeting` | Run meeting workflow tests |
| `npm run report` | Open HTML test report |

## Test Structure

```text
tests/e2e/
├── specs/
│   ├── api-status.spec.ts          # API endpoint tests (19 tests)
│   ├── process-docs-unit.spec.ts   # Unit tests from Process docs (30 tests)
│   ├── appointment-workflow.spec.ts # Appointment UI workflow tests
│   └── meeting-workflow.spec.ts    # Meeting UI workflow tests
├── fixtures/
│   ├── demo-meeting-data.json      # Sample meeting data for testing
│   └── README.md                   # Fixtures documentation
├── playwright.config.ts            # Playwright configuration
├── global-setup.ts                 # Auth state setup
└── package.json                    # Dependencies and scripts
```

## Test Categories

### 1. API Status Tests (api-status.spec.ts)

Tests that all API endpoints return HTTP 200:

- Health Check endpoints
- Authentication (login)
- Appointments
- PHR (Personal Health Records)
- Consultants
- Doctors
- Notifications
- Video Meeting endpoints

### 2. Process Documentation Unit Tests (process-docs-unit.spec.ts)

Tests generated from the Process documentation files:

- **Appointment Workflow** (APT-001 to APT-006)
- **Meeting Workflow** (MEET-001 to MEET-005)
- **PHR Workflow** (PHR-001 to PHR-006)
- **EMR Workflow** (EMR-001 to EMR-005)
- **AI Integration** (AI-001 to AI-004)
- **Notifications** (NOTIF-001, NOTIF-002)
- **Clinical Resources** (CR-001, CR-002)

### 3. Meeting Workflow Tests (meeting-workflow.spec.ts)

Tests for video consultation features:

- Patient creates meeting with guest invites
- Doctor invites specialist consultants
- Host lobby management
- Transcript streaming (start/stop)
- AI meeting summary
- EMR generation from meeting
- Man-in-the-Loop validation
- Patient health history display

### 4. Appointment Workflow Tests (appointment-workflow.spec.ts)

Tests for appointment booking and management:

- Patient views appointments
- Patient books new appointment
- Doctor views pending appointments
- Doctor confirms appointments
- Admin manages appointments

## Test Configuration

### Runtime Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `TEST_ENV` | `local` | Environment to test (`local` or `cloud`) |
| `TEST_URL` | `http://localhost:3005` | Base URL for tests |

### Test Credentials

| Role | Email | Password | Portal |
| --- | --- | --- | --- |
| Patient | `demo.test@gmail.com` | `YOUR_TEST_PASSWORD` | `localhost:3005` |
| Doctor | `doctor.test@izara.com` | `YOUR_TEST_DOCTOR_PASSWORD` | `localhost:3010` |
| Admin | `admin.test@izara.com` | `YOUR_TEST_ADMIN_PASSWORD` | `localhost:3010` |

## Running Against Different Environments

### Local Testing

```bash
# Make sure containers are running
docker-compose up -d

# Run tests
npm run test:local
```

### Cloud Testing

```bash
# Set environment
$env:TEST_ENV = "cloud"

# Run tests
npm run test:cloud
```

## Demo Meeting Data

Sample meeting data is available in `fixtures/demo-meeting-data.json` for testing:

- 15-minute consultation (900 seconds)
- 3 participants (Patient, Doctor, Relative)
- Thai language transcript with timestamps
- Chat messages
- Pre-generated AI summary

## Troubleshooting

### Common Issues

1. **Tests fail with "connection refused"**
   - Ensure Docker containers are running
   - Check ports 3005, 3010, 5433 are available

2. **Auth fails during tests**
   - Verify test credentials in database
   - Check JWT secret configuration

3. **Browser tests timeout**
   - Increase timeout in playwright.config.ts
   - Run with `--headed` to debug visually

### Debug Mode

```bash
# Run with debug logging
DEBUG=pw:api npx playwright test

# Run single test with visibility
npx playwright test -g "API Health Check" --headed
```

## Adding New Tests

1. Create test file in `specs/` directory
2. Import Playwright test utilities
3. Follow naming convention: `feature-name.spec.ts`
4. Use existing helper functions from other specs

Example:

```typescript
import { test, expect } from '@playwright/test';

test.describe('New Feature', () => {
  test('should do something', async ({ request }) => {
    const response = await request.get('http://localhost:3005/api/health');
    expect(response.status()).toBe(200);
  });
});
```

## Integration with CI/CD

The test suite can be integrated with GitHub Actions or Cloud Build:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    cd tests/e2e
    npm ci
    npx playwright install chromium
    npm test
```

## Reports

After running tests, HTML report is generated:

```bash
npm run report
```

This opens an interactive report showing:

- Test results summary
- Screenshots on failure
- Video recordings (on retry)
- Trace files for debugging
