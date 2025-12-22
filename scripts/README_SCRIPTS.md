# Scripts Folder Organization

This folder contains all scripts for the IZARA Telemedicine platform, organized into logical categories.

## 📁 Folder Structure

```
scripts/
├── generators/              # Data generation scripts
│   ├── generateComprehensiveMockData.cjs
│   ├── generateContentData.cjs
│   ├── generateHealthContent.cjs
│   ├── generateInterconnectedMockData.cjs
│   ├── generateUnifiedDemoData.cjs
│   └── definiteMockData.cjs
│
├── seeders/                 # Database seeding scripts
│   ├── seedAllData.cjs
│   ├── seedMedicalContent.cjs
│   ├── seedMinimalData.cjs
│   ├── seedMinimalDataToGCS.cjs
│   └── initializeAllUsers.cjs
│
├── tests/                   # All test-related scripts
│   ├── e2e/                 # End-to-end Selenium tests
│   │   ├── appointmentWorkflowTests.cjs    # Pre/During/Post meeting flows
│   │   ├── medicalContentTests.cjs         # Content creation/viewing
│   │   └── healthRecordsTests.cjs          # PHR, EMR, Health logs
│   │
│   ├── unit/                # Unit tests (future)
│   │
│   ├── utils/               # Shared test utilities
│   │   ├── testConfig.cjs   # URLs, credentials, test data
│   │   └── testHelpers.cjs  # Selenium helpers, logging
│   │
│   └── runAllE2ETests.cjs   # Master test runner
│
├── utilities/               # Helper scripts
│   ├── cleanDatabase.cjs
│   ├── cleanupDoctors.cjs
│   ├── uploadToGCS.cjs
│   └── uploadToGCS.ps1
│
├── debug/                   # Debugging scripts
│   ├── dashboardDebug.cjs
│   ├── deepLoginDebug.cjs
│   ├── formDebug.cjs
│   ├── loginDiagnostic.cjs
│   ├── navDebug.cjs
│   ├── reactDebug.cjs
│   └── dashboard_debug.html
│
└── legacy/                  # Old test scripts (for reference)
    ├── appointmentWorkflowSeleniumTests.cjs
    ├── comprehensiveSeleniumTests.cjs
    ├── contentAndAppointmentTests.cjs
    ├── dataSyncSeleniumTests.cjs
    ├── lifestyleAndEMRSeleniumTests.cjs
    ├── phrDataSyncSeleniumTests.cjs
    ├── seleniumTests.cjs
    └── visualSeleniumTests.cjs
```

## 🚀 Quick Start

### Run All E2E Tests
```bash
# Run all test suites
node scripts/tests/runAllE2ETests.cjs

# Run in headless mode
node scripts/tests/runAllE2ETests.cjs --headless

# Run specific suite
node scripts/tests/runAllE2ETests.cjs --suite=appointment
node scripts/tests/runAllE2ETests.cjs --suite=content
node scripts/tests/runAllE2ETests.cjs --suite=health

# Generate HTML report
node scripts/tests/runAllE2ETests.cjs --headless --report
```

### Run Individual Test Suites
```bash
# Appointment workflow (booking → meeting → EMR)
node scripts/tests/e2e/appointmentWorkflowTests.cjs

# Medical content (doctor creates → patient views)
node scripts/tests/e2e/medicalContentTests.cjs

# Health records (PHR → BMI → EMR → logs)
node scripts/tests/e2e/healthRecordsTests.cjs
```

### Generate Mock Data
```bash
# Generate comprehensive demo data
node scripts/generators/generateUnifiedDemoData.cjs

# Generate medical content
node scripts/generators/generateHealthContent.cjs
```

### Seed Database
```bash
# Seed all demo data
node scripts/seeders/seedAllData.cjs

# Seed minimal data for testing
node scripts/seeders/seedMinimalData.cjs

# Initialize user accounts
node scripts/seeders/initializeAllUsers.cjs
```

### Utilities
```bash
# Clean database
node scripts/utilities/cleanDatabase.cjs

# Upload to GCS
node scripts/utilities/uploadToGCS.cjs
```

## 📋 Test Suites

### 1. Appointment Workflow Tests
Tests the complete appointment lifecycle:
- **Pre-Meeting**: Patient books, doctor confirms, meeting link generated
- **During Meeting**: Access meeting links, verify participants
- **Post-Meeting**: EMR creation, prescription, AI summary, patient view

### 2. Medical Content Tests
Tests content creation and viewing:
- **Doctor**: Create article, add images, publish
- **Patient**: Browse, search, view details, AI summaries

### 3. Health Records Tests
Tests health data management:
- **PHR**: Demographics, vitals, lifestyle
- **BMI**: Auto-calculation, Thai categories
- **EMR**: View treatment history
- **Health Logs**: View from appointments

## 🔧 Test Configuration

See `tests/utils/testConfig.cjs` for:
- Portal URLs (localhost:3005, 3010)
- Test credentials
- Timeouts
- Test data

## 📸 Screenshots

Test screenshots are saved to:
- `test-results/screenshots/<suite-name>/`

## 📊 Reports

Generated reports:
- `test-results/e2e-report.html` - Visual HTML report
- `test-results/e2e-report.json` - Machine-readable JSON
- `test-results/<suite>-results.json` - Per-suite results

## ⚙️ Prerequisites

1. Chrome browser installed
2. ChromeDriver (auto-downloaded)
3. Node.js 18+
4. Portals running:
   - Patient Portal: http://localhost:3005
   - Doctor Portal: http://localhost:3010

## 🔐 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Patient | demo.test@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |
