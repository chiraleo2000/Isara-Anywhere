# Izara Telemedicine - Test Suite Documentation

**Version:** 1.0.0  
**Last Updated:** January 7, 2026  
**Status:** ✅ All Tests Passing (96 total tests)

---

## 📋 Test Suite Overview

The Izara Telemedicine test suite provides comprehensive coverage for both the **Patient Portal** and **Doctor Portal**, validating:

- **Unit functionality** - Core business logic
- **API endpoints** - Server health and routes
- **GCS connectivity** - Google Cloud Storage sync
- **Cross-portal integration** - Data consistency

---

## 🚀 Quick Start

### Prerequisites
Ensure all servers are running:
```bash
# Patient Portal (ports 3004, 3005)
cd Isara-patient-portal && npm run dev

# Doctor Portal (ports 3009-3012)
cd Isara-doctor-portal && npm run dev
```

### Run All Tests
```bash
# Unit + Local Dev tests (recommended first)
node scripts/tests/runCompleteTestSuite.cjs --skip-e2e

# Full suite including E2E browser tests
node scripts/tests/runCompleteTestSuite.cjs --full

# Unit tests only (fast)
node scripts/tests/runCompleteTestSuite.cjs --unit-only

# Verbose mode for debugging
node scripts/tests/runCompleteTestSuite.cjs --skip-e2e --verbose
```

---

## 📊 Test Suites Summary

| Suite | Tests | Duration | Description |
|-------|-------|----------|-------------|
| **Authentication** | 11 | ~7s | Patient/Doctor login, token validation |
| **PHR** | 14 | ~0.3s | Vitals, BMI calculations, health logs |
| **Appointments** | 13 | ~0.3s | Booking workflows, status transitions |
| **Medical Content** | 12 | ~0.4s | Articles, ICD-10, drug database |
| **GCS Sync** | 17 | ~3.4s | Bucket connectivity, read/write ops |
| **EMR & Prescribing** | 11 | ~0.4s | EMR structure, prescriptions, labs |
| **Local Dev** | 18 | ~2s | Server health, API endpoints |
| **TOTAL** | **96** | **~15s** | |

---

## 📁 Test File Structure

```
scripts/tests/
├── runCompleteTestSuite.cjs    # Master test runner
├── localDevTests.cjs           # API endpoint tests
├── unit/
│   ├── runAllUnitTests.cjs     # Unit test runner
│   ├── authTests.cjs           # Authentication tests
│   ├── phrTests.cjs            # Personal Health Records tests
│   ├── appointmentTests.cjs    # Appointment workflow tests
│   ├── medicalContentTests.cjs # Medical content tests
│   ├── gcsSyncTests.cjs        # GCS connectivity tests
│   └── emrPrescribingTests.cjs # EMR & prescribing tests
└── e2e/
    ├── runAllE2ETests.cjs      # E2E test runner
    ├── appointmentFlow.cjs     # Appointment booking flow
    ├── healthRecordsFlow.cjs   # Health records access
    ├── medicalContentFlow.cjs  # Medical content browsing
    └── videoMeetingFlow.cjs    # Video consultation flow
```

---

## 🔍 Detailed Test Coverage

### Authentication Tests (11 tests)
- ✅ Patient valid login
- ✅ Patient invalid login rejection
- ✅ Doctor valid login
- ✅ Doctor invalid login rejection
- ✅ Malformed request handling
- ✅ Token validation
- ✅ Session management

### PHR Tests (14 tests)
- ✅ PHR endpoint availability
- ✅ BMI calculation (normal weight)
- ✅ BMI calculation (underweight)
- ✅ BMI calculation (overweight)
- ✅ BMI calculation (obese)
- ✅ Blood pressure validation
- ✅ Heart rate validation
- ✅ Temperature validation
- ✅ Oxygen saturation validation

### Appointment Tests (13 tests)
- ✅ Status transitions (all states)
- ✅ Appointment types validation
- ✅ Urgency priority levels
- ✅ Meeting link generation
- ✅ Symptom field validation
- ✅ Date range validation

### Medical Content Tests (12 tests)
- ✅ GCS article retrieval
- ✅ Article structure validation
- ✅ ICD-10 code lookup
- ✅ Drug database search
- ✅ Content categorization
- ✅ Thai language support

### GCS Sync Tests (17 tests)
- ✅ Patient portal GCS connection
- ✅ Doctor portal GCS connection
- ✅ User credentials bucket access
- ✅ Patients data bucket access
- ✅ Doctors data bucket access
- ✅ Appointments bucket access
- ✅ Meta data bucket access
- ✅ Read medical articles
- ✅ Cross-portal data sync

### EMR & Prescribing Tests (11 tests)
- ✅ EMR structure validation
- ✅ Thai OPD Card format
- ✅ Prescription validation
- ✅ Drug interaction structure
- ✅ Lab order validation
- ✅ Clinical notes format

---

## 🌐 Server Ports Reference

| Service | Port | Description |
|---------|------|-------------|
| Patient Backend | 3004 | API server |
| Patient Frontend | 3005 | Vite dev server |
| Doctor Main API | 3009 | Main API server |
| Doctor Frontend | 3010 | Vite dev server |
| Doctor Auth | 3011 | Authentication server |
| Doctor GCS API | 3012 | GCS operations server |

---

## ☁️ GCS Buckets

| Bucket | Purpose |
|--------|---------|
| `izara-users-credentials` | User authentication data |
| `izara-patients-data` | Patient records & PHR |
| `izara-doctors-data` | Doctor profiles & schedules |
| `izara-appointments` | Appointment records |
| `izara-meta-data` | Medical content & metadata |

---

## 🐛 Troubleshooting

### Tests failing due to server not running
```bash
# Check if servers are running
curl http://localhost:3004/health
curl http://localhost:3009/health
```

### GCS connection failures
1. Verify credentials file exists at `credentials/service-account.json`
2. Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. Ensure service account has Storage Object Viewer/Creator roles

### Authentication test failures
1. Ensure auth server is running on port 3011
2. Check database connectivity
3. Verify test user credentials exist

### E2E tests not working
1. Install Chrome/Chromium for Selenium
2. Install chromedriver: `npm install chromedriver`
3. Run in headless mode: `--headless`

---

## 📈 Deployment Workflow

```
1. Run local tests
   └── node runCompleteTestSuite.cjs --skip-e2e

2. If all pass, run E2E tests
   └── node runCompleteTestSuite.cjs --full

3. Build Docker images
   └── powershell build-and-push-gcr.ps1 -Version "1.x.x"

4. Deploy to Cloud Run
   └── powershell deploy-to-cloud-run.ps1 -Version "1.x.x"

5. Run cloud tests
   └── node cloudRunTests.cjs
```

---

## 📝 Test Results Location

Test results are saved as JSON files in:
- `scripts/test-results/` - Unit test results
- `test-results/` - Combined test results
- `test-screenshots/` - E2E test screenshots

---

## ✨ Best Practices

1. **Always run tests before deployment**
2. **Use `--skip-e2e` for quick validation**
3. **Use `--verbose` for debugging failures**
4. **Clean old test results periodically**
5. **Run full suite (`--full`) before major releases**

---

*Documentation generated for Izara Telemedicine Platform*
