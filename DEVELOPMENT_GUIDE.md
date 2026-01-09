# Izara Telemedicine - Development & Deployment Guide

## 🚀 Quick Start

### Local Development

1. **Start all servers:**
   ```powershell
   # Option 1: Using start script (recommended)
   .\scripts\start-local-dev.ps1 -Test
   
   # Option 2: Manual start
   # Terminal 1: Patient Portal
   cd Isara-patient-portal
   npx concurrently "npx tsx watch server/index.ts" "npx vite"
   
   # Terminal 2: Doctor Portal
   cd Isara-doctor-portal
   node server/startAll.cjs
   ```

2. **Run local tests:**
   ```powershell
   cd scripts\tests
   node localDevTests.cjs
   ```

3. **Access the portals:**
   - Patient Portal: http://localhost:3005
   - Doctor Portal: http://localhost:3010

### Development Ports

| Service | Port | Description |
|---------|------|-------------|
| Patient Portal Backend | 3004 | Express API Server |
| Patient Portal Frontend | 3005 | Vite Dev Server |
| Doctor Portal Main API | 3009 | Clinical operations |
| Doctor Portal Frontend | 3010 | Vite Dev Server |
| Doctor Portal Auth | 3011 | Authentication server |
| Doctor Portal GCS API | 3012 | GCS storage operations |

---

## 📋 Deployment Workflow

### Recommended Workflow

```
Local Development → Local Tests → Build → Deploy → Cloud Tests
```

### Step 1: Local Development & Testing

```powershell
# Run local tests first (all tests must pass)
cd scripts\tests
node localDevTests.cjs

# Expected: 100% pass rate
```

### Step 2: Build Docker Images

```powershell
# Build and push to Google Container Registry
.\scripts\build-and-push-gcr.ps1 -Version "1.1.5"
```

### Step 3: Deploy to Cloud Run

```powershell
# Deploy to Cloud Run
.\scripts\deploy-to-cloud-run.ps1 -Version "1.1.5"
```

### Step 4: Cloud E2E Tests

```powershell
# Run comprehensive cloud tests
cd scripts\tests
node cloudRunTests.cjs
```

### Automated Workflow

Use the deployment workflow script for automated deployment:

```powershell
# Full workflow (local tests → build → deploy → cloud tests)
.\scripts\deploy-workflow.ps1 -Version "1.1.5" -Environment sit

# Local testing only
.\scripts\deploy-workflow.ps1 -LocalOnly

# Skip tests (not recommended for production)
.\scripts\deploy-workflow.ps1 -Version "1.1.5" -SkipTests
```

---

## 🔗 GCS Bucket Configuration

Both local and cloud deployments use the same Google Cloud Storage buckets:

| Bucket Name | Purpose |
|-------------|---------|
| izara-users-credentials | User authentication data |
| izara-patients-data | Patient health records |
| izara-doctors-data | Doctor profiles and data |
| izara-appointments | Appointment records |
| izara-meta-data | Medical content, clinical resources |

### Medical Content Sync

- **Doctor Portal** writes to: `izara-meta-data/medical-content/articles.json`
- **Patient Portal** reads from: `izara-meta-data/medical-content/articles.json`
- Both portals sync data through GCS (no local storage)

---

## 🧪 Test Suites

### Local Development Tests (`localDevTests.cjs`)

18 API tests covering:
- Server health checks
- GCS connectivity
- Medical content fetching
- Authentication endpoints
- Video meeting service
- Patient/Doctor data APIs

### Cloud E2E Tests (`cloudRunTests.cjs`)

51 comprehensive tests including:
- All API tests
- Browser-based authentication
- Multi-user login scenarios
- Page scroll behavior
- Admin features
- Video meeting workflows

---

## 🔐 Environment Configuration

### Patient Portal (.env)

```dotenv
GCP_PROJECT_ID=izara-telemedicine
GCS_BUCKET_AUTH=izara-users-credentials
GCS_BUCKET_PATIENT=izara-patients-data
GCS_BUCKET_DOCTOR=izara-doctors-data
GCS_BUCKET_APPOINTMENTS=izara-appointments
GCS_BUCKET_METADATA=izara-meta-data
```

### Doctor Portal (.env)

```dotenv
GCP_PROJECT_ID=izara-telemedicine
GCS_API_URL=http://localhost:3012
```

### Credentials

- Patient Portal: `Isara-patient-portal/credentials/service-account.json`
- Doctor Portal: `Isara-doctor-portal/public/izara-telemedicine-dd0b6abe2bc8.json`

---

## 🌐 Cloud Run URLs

| Service | URL |
|---------|-----|
| Patient Portal | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| Doctor Portal | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.2.1 | 2026-01-09 | Meeting AI summary storage to GCS, doctor portal display, .gitignore |
| 1.2.0 | 2026-01-08 | Theme/language sync, scroll position fixes, notification improvements |
| 1.1.4 | 2026-01-07 | Rate limit fixes, test improvements |
| 1.1.3 | 2026-01-06 | Video meeting, admin features |
| 1.1.0 | 2025-12-15 | Initial Cloud Run deployment |

---

## 🛠️ Troubleshooting

### Local server not starting

```powershell
# Kill any existing processes on development ports
.\scripts\start-local-dev.ps1 -Kill

# Then restart
.\scripts\start-local-dev.ps1
```

### GCS connection errors

1. Verify service account credentials exist
2. Check `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. Ensure service account has Storage Object Admin role

### Medical content not showing

1. Check if articles exist in GCS: `izara-meta-data/medical-content/articles.json`
2. Verify articles have `status: "published"`
3. Check browser console for API errors

### Test failures

```powershell
# Run with verbose logging
node localDevTests.cjs --verbose

# Check specific test output
node cloudRunTests.cjs 2>&1 | Select-String "FAILED"
```

---

## 📁 Project Structure

```
Isara-anywhere-V0.0.3/
├── Isara-patient-portal/      # Patient-facing web app
│   ├── server/                # Express backend
│   │   ├── routes/            # API routes
│   │   └── security/          # OWASP middleware
│   └── src/                   # React frontend
├── Isara-doctor-portal/       # Doctor/Admin web app
│   ├── server/                # Backend servers
│   │   ├── mainApiServer.cjs  # Clinical operations
│   │   ├── authServer.cjs     # Authentication
│   │   └── gcsApiServer.cjs   # GCS operations
│   └── src/                   # React frontend
├── scripts/
│   ├── build-and-push-gcr.ps1 # Docker build script
│   ├── deploy-to-cloud-run.ps1 # Cloud Run deployment
│   ├── deploy-workflow.ps1    # Automated workflow
│   ├── start-local-dev.ps1    # Local dev startup
│   └── tests/
│       ├── localDevTests.cjs  # Local API tests
│       └── cloudRunTests.cjs  # Cloud E2E tests
```

---

## ✅ Pre-Deployment Checklist

- [ ] All local tests pass (`node localDevTests.cjs`)
- [ ] GCS buckets accessible
- [ ] Service account credentials configured
- [ ] Version number updated in package.json
- [ ] Docker images build successfully
- [ ] Cloud tests pass after deployment

---

For more details, see:
- [API Reference](Explains/Whole-Project/api-reference.md)
- [Architecture](Explains/Whole-Project/architecture.md)
- [Security](Explains/Whole-Project/security.md)
