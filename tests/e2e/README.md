# Isara Telemedicine - E2E Test Suite

## Overview
This test suite provides comprehensive End-to-End (E2E) testing for the Isara Telemedicine platform using Playwright.

## Test Results Summary

| Test Category | Tests | Status |
|--------------|-------|--------|
| API Status Tests | 19 | ✅ All Passing |
| Process Documentation Unit Tests | 30 | ✅ All Passing |
| Meeting Workflow Tests | 12 | ✅ API Tests Passing |
| **Total Passing** | **49** | ✅ |

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
|---------|-------------|
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

```
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

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_ENV` | `local` | Environment to test (`local` or `cloud`) |
| `TEST_URL` | `http://localhost:3005` | Base URL for tests |

### Test Credentials
| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Patient | demo.test@gmail.com | P@ssw0rd | localhost:3005 |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 | localhost:3010 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 | localhost:3010 |

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
