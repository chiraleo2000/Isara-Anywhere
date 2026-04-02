# Izara Telemedicine — E2E Test Suite

> **Version:** 10.0.0 | **Updated:** February 19, 2026
> **Spec Files:** 8 (specs 20-27) | **Total Tests:** ~530
> **Users:** 5 simultaneous (patient1, patient2, patient3, doctor, admin)
> **Environments:** Local, Cloud, Cloud-Dev

---

## Quick Start

```powershell
cd tests/e2e
npm install
npx playwright install chromium

# Run all tests locally
npm test

# Run individual spec
npm run test:content-sync    # Critical: content approval → single-refresh visibility

# Run on Cloud
npm run cloud

# View HTML report
npm run report
```

---

## Directory Structure

```text
tests/e2e/
├── playwright.config.ts        # 3 projects: Local, Cloud, Cloud-Dev
├── package.json                # 12 npm scripts
├── README.md
├── lib/
│   ├── test-config.ts          # URLs, 5 user credentials, 50+ endpoints, timeouts
│   └── test-helpers.ts         # Multi-browser helpers, API wrappers, generators, assertions
├── specs/
│   ├── 20-auth-health-multiuser.spec.ts
│   ├── 21-appointment-lifecycle.spec.ts
│   ├── 22-health-records-emr.spec.ts
│   ├── 23-video-meeting-transcription.spec.ts
│   ├── 24-content-sync-approval.spec.ts        ★★★ CRITICAL
│   ├── 25-ai-features-cds.spec.ts
│   ├── 26-multi-user-concurrent.spec.ts
│   └── 27-phase2-ai-his.spec.ts
└── test-results/               # Screenshots, videos, HTML report
```

---

## Test Suite

| # | File | Tests | Sections | Coverage |
| --- | ------ | ------- | ---------- | ---------- |
| 20 | `20-auth-health-multiuser.spec.ts` | ~65 | A–F | Health checks (3 services), multi-user auth, registration, RBAC, multi-browser login, metadata |
| 21 | `21-appointment-lifecycle.spec.ts` | ~80 | A–H | Patient booking → doctor confirm → cancel/reschedule → meeting links → notifications → cross-portal sync |
| 22 | `22-health-records-emr.spec.ts` | ~80 | A–H | PHR CRUD, vitals, EMR SOAP notes, prescriptions, lab orders, living will, timeline, patient record viewer |
| 23 | `23-video-meeting-transcription.spec.ts` | ~65 | A–G | Meeting creation, join/lobby, transcription lifecycle, AI SOAP summary, post-meeting records, multi-browser |
| 24 | `24-content-sync-approval.spec.ts` | ~70 | A–H | ★★★ Medical content CRUD → admin approval → **single-refresh visibility** → multi-browser 3-patient sync |
| 25 | `25-ai-features-cds.spec.ts` | ~60 | A–G | AI chat (EN+TH), CDS drug interactions/dosage/allergy, AI summarization, medical scribe, notifications |
| 26 | `26-multi-user-concurrent.spec.ts` | ~50 | A–F | 5 users in 5 browser windows simultaneously, concurrent appointment/content/meeting/queue flows |
| 27 | `27-phase2-ai-his.spec.ts` | ~60 | A–G | CTM Thai medicine, geriatric screening (8 tools), SOS emergency, follow-up, biometric, offline sync, nursing dashboard |


### ★★★ Critical Test: Content Sync (Spec 24, Section D)

When content is approved, patients see it with **one page refresh**:

| Test | Description |
| ------ | ------------- |
| D01 | API flow: doctor creates → admin approves → patient API returns content |
| D02 | **BROWSER**: Content approved → patient refreshes once → content visible in DOM |
| D03 | **MULTI-BROWSER**: 3 patients in 3 separate browsers all refresh once and see approved content |
| D04 | Clinical resource sync across doctor portal |
| D05 | API verification: approved content visible to all 3 patient tokens |
| D06 | Draft content NOT visible to patients |
| D07 | Rejected content NOT visible to patients |


### Multi-User / Multi-Browser Tests

Tests use Playwright's `browser.newContext()` to open **separate browser windows** per user:

- **Spec 20 Section E**: 5 users logged in simultaneously in 5 browsers

- **Spec 24 Section D**: Doctor + Admin + 3 patients in 5 browsers for content sync

- **Spec 26**: All major workflows with 3-5 concurrent browser windows

---

## npm Scripts

| Script | Description |
| -------- | ------------- |
| `npm test` | Run all 8 specs locally (headed) |
| `npm run test:auth` | Spec 20 — Auth, health, multi-user |
| `npm run test:appointments` | Spec 21 — Appointment lifecycle |
| `npm run test:health` | Spec 22 — Health records & EMR |
| `npm run test:meeting` | Spec 23 — Video meeting & transcription |
| `npm run test:content-sync` | Spec 24 — ★★★ Content sync & approval |
| `npm run test:ai` | Spec 25 — AI features & CDS |
| `npm run test:multi-user` | Spec 26 — Multi-user concurrent |
| `npm run test:phase2` | Spec 27 — Phase 2 AI-HIS features |
| `npm run cloud` | All specs on Cloud Run |
| `npm run cloud-dev` | All specs on Cloud-Dev |
| `npm run report` | Open Playwright HTML report |


---

## Playwright Projects (3)

| Project | Base URL | Purpose |
| --------- | ---------- | --------- |
| `Local` | localhost:3005 | Local Docker |
| `Cloud` | Cloud Run | Production |
| `Cloud-Dev` | Cloud-Dev | Dev/staging |


---

## Test Users (5)

| Role | Email | Portal | ID |
| ------ | ------- | -------- | ---- |
| patient1 | `demo.test@gmail.com` | Patient Portal | PATIENT-DEMO |
| patient2 | `Somchai.Mankong@gmail.com` | Patient Portal | PATIENT-SOMCHAI |
| patient3 | `Anan.Khayanrian@gmail.com` | Patient Portal | PATIENT-ANAN |
| doctor | `doctor.test@izara.com` | Doctor Portal | DOC-TEST-001 |
| admin | `admin.test@izara.com` | Doctor Portal | ADMIN-TEST-001 |


---

## Service URLs

### Local (Docker)

| Service | URL |
| --------- | ----- |
| Patient Portal | <http://localhost:3005> |
| Doctor Portal | <http://localhost:3010> |
| Meeting Server | <http://localhost:3020> |


### Cloud (Google Cloud Run)

| Service | URL |
| --------- | ----- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-meeting-server-724889190329.asia-southeast1.run.app> |


### Cloud-Dev

| Service | URL |
| --------- | ----- |
| Patient Portal | <https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app> |


---

## Shared Libraries

### test-config.ts

50+ API endpoints across 12 groups:

| Group | Endpoints |
| ------- | ----------- |
| `auth` | login, register |
| `appointments` | appointments, appointmentPool, queue |
| `healthRecords` | phr, emr, vitals, prescriptions, labOrders, livingWill, timeline, treatmentResults |
| `content` | medicalContent, contentMedical, contentClinical, clinicalResources |
| `meetings` | create, health, list, config, invite, transcription |
| `ai` | chat, summarize, analyze, knowledge + 8 sub-endpoints |
| `cds` | check, alerts, logs |
| `admin` | doctors, pendingDoctors, approveDoctor, rejectDoctor, stats |
| `metadata` | specialties, labTests, icd10, medications |
| `settings` | general, notifications, role, onboarding |
| `phase2` | ctmAssessment, geriatricScreening, sosAlert, followUp, nursingDashboard, predictiveAnalytics |
| `device` | deviceTokens, biometric (register/verify/status), sync (push/pull/conflicts/status) |


### test-helpers.ts

| Category | Exports |
| ---------- | --------- |
| **Types** | `UserRole`, `AuthenticatedUser`, `MultiUserSession`, `ContentItem` |
| **Auth** | `authenticateAllUsers()`, `authenticateUser()` |
| **Multi-Browser** | `createMultiUserSession()`, `closeMultiUserSession()`, `loginViaBrowser()` |
| **API Wrappers** | `patientApi()`, `doctorApi()`, `meetingApi()`, `apiRequest()` |
| **Data Generators** | `generateAppointmentData()`, `generatePHRVitals()`, `generateEMRData()`, `generatePrescriptionData()`, `generateLabOrder()`, `generateMedicalContent()`, `generateClinicalResource()`, `generateGeriatricScreening()`, `generateCTMAssessment()`, `generateSOSAlert()`, `generateFollowUpSchedule()` |
| **Assertions** | `assertSuccess()`, `assertOk()`, `assertUnauthorized()`, `assertNoJSErrors()` |
| **Workflows** | `waitForContentAfterRefresh()`, `appointmentLifecycle()`, `contentApprovalLifecycle()` |


---

## Configuration

```typescript
{
  workers: 1,              // Serial execution (multi-user flows)
  timeout: 180_000,        // 3 min per test
  expect: { timeout: 30_000 },
  headless: false,         // HEADED MODE — UI visible
  screenshot: 'on',
  video: 'on',
  slowMo: 50,
  viewport: { width: 1920, height: 1080 },
}
```

---

## Prerequisites

1. **Node.js >= 22** and **npm**
2. **Docker containers running**: `docker compose up -d`
3. **Playwright browsers**: `npx playwright install chromium`
4. **Test users seeded in database** (5 users with credentials above)

## Troubleshooting

| Issue | Solution |
| ------- | ---------- |
| Connection refused | `docker compose up -d` — ensure all 3 services are running |
| Auth fails | Verify test credentials exist in database |
| Timeout | Increase `timeout` in playwright.config.ts or check service health |
| Browser not found | `npx playwright install chromium` |
| Content sync fails | Confirm admin approved the content and patient portal serves `/api/content/medical` |


```powershell

# Debug a single test
DEBUG=pw:api npx playwright test --project=Local --headed -g "D02"

# List all tests without running
npx playwright test --project=Local --list

# Run with trace for debugging
npx playwright test --project=Local --headed --trace on
```
