# Izara Telemedicine - Scripts

This folder contains unified scripts for generating and managing demo data, testing, and automation for both Patient and Doctor portals.

## Files

| File | Description |
|------|-------------|
| `runTests.cjs` | **Main test orchestrator** - Cleans DB, generates data, runs all tests |
| `cleanDatabase.cjs` | Database cleaning script - removes all data from GCS buckets |
| `generateComprehensiveMockData.cjs` | Generates comprehensive mock data with edge cases |
| `seleniumTests.cjs` | Selenium test suite for both portals |
| `generateUnifiedDemoData.cjs` | Legacy: Generates comprehensive demo data |
| `uploadToGCS.cjs` | Node.js script to upload data to GCS |
| `uploadToGCS.ps1` | PowerShell script to upload data to GCS (Windows) |
| `cors.json` | CORS configuration for GCS buckets |
| `overall_structure_details.md` | Complete platform documentation |
| `output/` | Generated demo data (created after running generator) |

## New Files (Video Meeting Tests)

| File | Description |
|------|-------------|
| `tests/e2e/dualPortalMeetingTests.cjs` | **Dual-portal video meeting workflow test** - Tests Patient + Doctor simultaneously |
| `generators/generateTestAudio.cjs` | **Test audio generator** - Creates transcripts for Speech-to-Text testing |

## Quick Start - Testing

### Run Complete Test Suite

```bash
# Navigate to workspace root
cd Isara-anywhere-V0.0.2

# Start the GCS API server (in separate terminal)
cd Isara-doctor-portal
node server/gcsApiServer.cjs

# Run complete test workflow (cleans DB, generates data, runs tests)
node scripts/runTests.cjs
```

### Video Meeting Workflow Tests

```bash
# Run dual-portal meeting workflow test (Patient + Doctor portals)
node scripts/tests/e2e/dualPortalMeetingTests.cjs

# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless

# Run appointment workflow tests
node scripts/tests/e2e/appointmentWorkflowTests.cjs
```

### Generate Test Audio Files

```bash
# Generate test audio files for Speech-to-Text testing
node scripts/generators/generateTestAudio.cjs
```

### Individual Scripts

```bash
# Clean database only
node scripts/cleanDatabase.cjs

# Generate mock data only
node scripts/generateComprehensiveMockData.cjs

# Run Selenium tests only (requires servers running)
node scripts/seleniumTests.cjs
```

### Headless Testing

```bash
HEADLESS=true node scripts/runTests.cjs
```

## Test Credentials

| Role | Email | Password | ID |
|------|-------|----------|-----|
| Admin | admin.test@izara.com | IzaraAdmin@2024 | ADMIN-001 |
| Doctor (Approved) | doctor.test@izara.com | IzaraDoctor@2024 | DOC-001 |
| Doctor (Pending) | doctor02.test@izara.com | IzaraDoctor@2024 | DOC-002 |
| Patient | demo.test@gmail.com | P@ssw0rd | PATIENT-001 |

### Edge Case Users

| Status | Email | Password |
|--------|-------|----------|
| Inactive | inactive.doctor@izara.com | InactiveDoc@2024 |
| Rejected | rejected.doctor@izara.com | RejectedDoc@2024 |
| Locked | locked.doctor@izara.com | LockedDoc@2024 |

## Test Coverage

### Authentication Tests
- ✅ Valid login (Admin, Doctor, Patient)
- ✅ Invalid credentials rejection
- ✅ Pending doctor login rejection
- ✅ Inactive user login rejection
- ✅ Account lockout after failed attempts

### Admin Tests
- ✅ Doctor management access
- ✅ Pending doctor list
- ✅ Doctor approval workflow
- ✅ Doctor rejection workflow

### Doctor Tests
- ✅ EMR access and creation
- ✅ Prescription management
- ✅ Lab order management
- ✅ Imaging order management
- ✅ Patient lookup with PDPA consent

### Patient Tests
- ✅ Appointment booking
- ✅ PHR access
- ✅ PDPA consent management
- ✅ Living will management

## Quick Start

### 1. Generate Demo Data

```bash
cd Isara-anywhere-V0.0.2
node scripts/generateUnifiedDemoData.cjs
```

This creates demo data in `scripts/output/` organized by GCS bucket:
- `izara-users-credentials/` - User authentication
- `izara-doctors-data/` - Doctor portal data
- `izara-patients-data/` - Patient portal data
- `izara-appointments/` - Shared appointments
- `izara-meta-data/` - Reference data

### 2. Upload to GCS

#### Option A: Using Node.js
```bash
node scripts/uploadToGCS.cjs
```

#### Option B: Using PowerShell (Windows)
```powershell
.\scripts\uploadToGCS.ps1
```

#### Option C: Manual gsutil commands
```bash
gsutil -m cp -r scripts/output/izara-users-credentials/* gs://izara-users-credentials/
gsutil -m cp -r scripts/output/izara-doctors-data/* gs://izara-doctors-data/
gsutil -m cp -r scripts/output/izara-patients-data/* gs://izara-patients-data/
gsutil -m cp -r scripts/output/izara-appointments/* gs://izara-appointments/
gsutil -m cp -r scripts/output/izara-meta-data/* gs://izara-meta-data/
```

### 3. Configure CORS

```bash
gsutil cors set scripts/cors.json gs://izara-users-credentials
gsutil cors set scripts/cors.json gs://izara-doctors-data
gsutil cors set scripts/cors.json gs://izara-patients-data
gsutil cors set scripts/cors.json gs://izara-appointments
gsutil cors set scripts/cors.json gs://izara-meta-data
```

## Demo Accounts

### Patient
- **Name:** demotest
- **Email:** demo.test@gmail.com
- **ID:** PAT-DEMO-001

### Doctor
- **Name:** Dr.example
- **Email:** example.test@xhospital.com
- **ID:** DOC-DEMO-001

## GCS Bucket Structure

```
izara-users-credentials/     # User authentication
├── patients/
│   └── PAT-DEMO-001.json
└── doctors/
    └── DOC-DEMO-001.json

izara-doctors-data/          # Doctor-specific data
├── profile/
├── patients/
├── emrs/
├── prescriptions/
├── lab-orders/
├── imaging-orders/
└── queue/

izara-patients-data/         # Patient-specific data
└── users/
    └── PAT-DEMO-001/
        ├── phr.json
        ├── living-will.json
        ├── pdpa-consents.json
        ├── chat-sessions.json
        └── timeline.json

izara-appointments/          # Shared appointments
├── appointments/
└── results/

izara-meta-data/             # Reference data
├── doctors.json
├── specialties.json
├── medications.json
├── lab-tests.json
├── icd10-codes.json
├── hospitals-facilities.json
├── health-tips.json
└── health-education-articles.json
```

## Prerequisites

1. **Node.js 18+** - For running generator scripts
2. **Google Cloud SDK** - For uploading to GCS
3. **GCS Authentication** - Run `gcloud auth application-default login`

## Documentation

See `overall_structure_details.md` for complete platform documentation including:
- System architecture
- Data models
- Feature workflows
- Security & compliance
- API references
