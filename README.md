# 🏥 Izara Telemedicine Platform

![Version](https://img.shields.io/badge/version-1.5.9-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Tests](https://img.shields.io/badge/Unit%20tests-2%2C013%20passing-brightgreen.svg)
![Tests](https://img.shields.io/badge/E2E%20tests-1%2C149%20passing-brightgreen.svg)
![Cloud UI](https://img.shields.io/badge/UI%20tests-209%20passing-brightgreen.svg)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-deployed-blue.svg)
![Security](https://img.shields.io/badge/security-SonarQube%20clean-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict%20safe-blue.svg)

## A comprehensive telemedicine platform built for Thailand's healthcare system

[Features](#-key-features) • [Portal URLs](#-portal-urls) • [Installation](#-installation--setup) • [Testing](#-testing) • [Deployment](#-cloud-deployment)

---

## 📖 Overview

**Izara Telemedicine** (อิสระ เทเลเมดิซิน) is a full-stack telemedicine platform designed specifically for Thailand's healthcare ecosystem. It provides seamless video consultations, electronic medical records (EMR), e-prescribing, AI-powered health assistance, and PDPA-compliant data handling.

The platform consists of three main services:

| Service | Description | Local Port | Target Users |
| -------- | ------------- | ---- | -------------- |
| **Patient Portal** | Book appointments, manage health records, video consultations | 3005 | Patients, Caregivers |
| **Doctor Portal** | Clinical workflows, EMR/EHR management, prescriptions, admin tools | 3010 | Doctors, Nurses, Admins |
| **Meeting Server** | Jitsi integration with live transcription & AI summaries | 3020 | Video Consultations |

---

## 🌐 Portal URLs

### Local Environment (Docker)

| Service | URL |
| ------- | --- |
| Patient Portal | <http://localhost:3005> |
| Doctor Portal | <http://localhost:3010> |
| Meeting Server | <http://localhost:3020> |
| PostgreSQL | localhost:5433 |
| pgAdmin | <http://localhost:5050> |

### Cloud Environment — Production (v1.5.9) (Google Cloud Run)

| Service | URL |
| ------- | --- |
| Patient Portal | <https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app> |

---

## 🧪 Testing

### Test Architecture (v1.5.9)

#### Unit Tests (Vitest — 2,013 tests)
- **58 test files** in `tests/unit/` — pure logic, no server required
- **Coverage areas**: Doctor portal (24 files), Patient portal (22 files), Meeting server (6 files), Security (2 files), Database (4 files)
- **Framework**: Vitest 2.1.9, runs in ~4.3 seconds
- **Run**: `cd tests/unit && npx vitest run`

#### E2E Tests (Playwright — 1,124 tests)
- **33 E2E spec files** (01-31): comprehensive workflow, API, and UI testing
- **1,149 total tests** across 33 spec files
- **5 simultaneous demo user accounts** (patient1, patient2, patient3, doctor, admin)
- **3 Playwright projects**: Local, Cloud, Cloud-Dev
- **0 skipped tests** — every test must pass
- **Serial + parallel execution** for workflow integrity

#### UI Tests (Playwright — 209 headed tests, 9 test files)

- **9 test files** in `tests/*.ui-test.ts` — local Docker & Cloud Run targets
- **ui-pages**: 44 tests (14 patient + 12 doctor portal pages + 16 API + 2 auth)
- **workflow-screenshots**: 25 tests (complete appointment lifecycle with screenshots)
- **cloud-ui-screenshots**: 39 tests (14 patient + 12 doctor + 13 API health)
- **meeting-multi-user**: 27 tests (3-browser parallel: admin + doctor + patient meeting flows)
- **cloud-workflow-multiuser**: 42 tests (8 workflow sections: User Mgmt, Appointments, Health Records, Content, Notifications, Living Will, Medical Consultants, AI)
- **meeting-recording**: 8 tests (recording controls, transcript, diarization, SOAP summary)
- **admin-workflows**: 8 tests (user mgmt, doctor mgmt, appointment mgmt, system admin)
- **post-meeting-actions**: 7 tests (EMR create, prescriptions, lab orders with forms)
- **phr-ai-features**: 9 tests (PHR dashboard/records/vitals/timeline/living will + AI pre-consult/CDS/docs/SOAP)
- **Headed mode** (1 worker, `slowMo: 300`, 1280×720 viewport)
- **160 screenshots** saved to `screenshots/` across 35 subfolders
- **Run**: `npx playwright test --project=UI-Verification --reporter=list`

#### Combined: 3,371 tests (2,013 unit + 1,149 local E2E + 209 UI)

### E2E Test Specs

| Spec | Name | Tests | Coverage |
| ---- | ---- | ----- | -------- |
| 01 | User Accounts, Demo & Pages | ~50 | All 5 demo accounts, password reset, all pages |
| 02 | Auth, Health & Multi-User | ~82 | Health checks, 5-user auth, registration, RBAC |
| 03 | Appointment Lifecycle | ~92 | Create, confirm, cancel, reschedule, cross-portal sync |
| 04 | Health Records & EMR | ~95 | PHR, vitals, EMR SOAP, prescriptions, lab orders, living will |
| 05 | Video Meeting & Transcription | ~81 | Jitsi meeting, transcription, AI SOAP, multi-browser |
| 06 | Content Sync & Approval | ~82 | Content CRUD, admin approval, real-time sync verification |
| 07 | AI Features & CDS | ~72 | AI chat, CDS drug checks, summarization, doctor AI tools |
| 08 | Multi-User Concurrent | ~60 | 4-browser concurrent flows, stress testing, cross-portal |
| 09 | Phase 2 AI-HIS | ~72 | CTM assessment, geriatric screening, SOS, follow-up |
| 10 | Lab, Imaging & Map Features | ~42 | Lab orders, imaging, healthcare map |
| 11 | Doctor Portal Workflows | ~44 | Doctor-specific clinical workflows |
| 12 | Patient Portal Workflows | ~42 | Patient-specific portal workflows |
| 13 | Multi-User Appointment | ~36 | Cross-user appointment workflows |
| 14 | Admin Management Workflows | ~40 | Admin panel, doctor approval, content management |
| 15 | PHR-EMR Data Flow | ~46 | Cross-portal PHR/EMR data synchronization |
| 16 | Medical Content Workflows | ~38 | Content publishing, categorization, search |
| 17 | Notification & Settings | ~36 | Notification triggers, user settings |
| 18 | Appointment Pipeline E2E | ~44 | Full appointment pipeline from booking to completion |
| 19 | PHR Cross-Portal Sync | ~42 | PHR data consistency across portals |
| 20 | AI Pipeline Man-in-Loop | ~44 | AI validation with doctor approval workflow |
| 21 | Content Rejection Recovery | ~36 | Content rejection, revision, re-approval flow |
| 22 | Notification Triggers | ~38 | Event-driven notification verification |
| 23 | Mixed Simultaneous Workflows | ~40 | Concurrent multi-feature workflows |
| 24 | Registration Approval E2E | ~39 | Full registration to approval pipeline |
| 25 | Register & Login Doctor | ~20 | Doctor registration, login, page navigation |
| 26 | Register & Login Patient | ~24 | Patient registration, login, page refresh |
| 27 | Lab Data Doctor-to-Patient | ~18 | Lab data flow from doctor to patient portal |
| 28a | Patient Pages Verification | ~15 | All patient portal pages load correctly |
| 28b | Doctor Pages Verification | ~15 | All doctor portal pages load correctly |
| 28c | API Health Verification | ~12 | All API health endpoints return 200 |
| 29 | Chat AI Summary Cloud | ~10 | AI chat and summary on cloud |
| 30 | Appointment Meeting AI Pipeline | ~12 | Full appointment → meeting → AI pipeline |
| 31 | Meeting Recording Pipeline | ~25 | MediaRecorder, save-recording, AI SOAP, man-in-the-loop, multi-user |

### Run Tests

```powershell
# ── Unit Tests (2,013 tests, ~4.3 seconds) ──
cd tests/unit
npx vitest run              # Run all 2,013 unit tests
npx vitest run --coverage    # With coverage report
npx vitest watch             # Watch mode during development

# ── E2E Tests (1,124 tests, requires Docker services running) ──
cd tests/e2e

# Run ALL Local tests
$env:CI="true"; npx playwright test --project=Local --workers=6

# Run ALL Cloud-Dev tests
$env:TEST_ENV="cloud-dev"; npx playwright test --project="Cloud-Dev" --workers=2

# Run specific spec
npx playwright test "09-phase2" --project=Local

# View HTML Report
npx playwright show-report

# ── UI Tests (209 tests, headed browser with screenshots) ──
npx playwright test --project=UI-Verification --reporter=list  # All 209 UI tests
npx playwright test tests/ui-pages.ui-test.ts              # 44 page checks (local)
npx playwright test tests/workflow-screenshots.ui-test.ts  # 25 workflow screens
npx playwright test tests/cloud-ui-screenshots.ui-test.ts  # 39 cloud screenshots
npx playwright test tests/meeting-multi-user.ui-test.ts    # 27 meeting multi-user
npx playwright test tests/cloud-workflow-multiuser.ui-test.ts  # 42 workflows
npx playwright test tests/meeting-recording.ui-test.ts     # 8 recording/diarization
npx playwright test tests/admin-workflows.ui-test.ts       # 8 admin workflows
npx playwright test tests/post-meeting-actions.ui-test.ts  # 7 EMR/Rx/Labs
npx playwright test tests/phr-ai-features.ui-test.ts       # 9 PHR + AI features
```

### Unit Test Suites (tests/unit/) — 58 Files

| Category | Files | Coverage Area |
| ----- | ----- | ------------- |
| doctor-portal | 24 | Auth, API routes, EMR, prescriptions, GCS, Gemini AI, OWASP, storage, appointments, queue, medical content, health records workflows |
| patient-portal | 22 | Auth, routes, PHR, AI, content, PDPA, notifications, video meeting, appointments, dashboard, data sync, living will, user management workflows |
| meeting-server | 6 | Jitsi meeting, AI summary, socket events, meeting routes, video meeting workflow |
| security | 2 | CORS, rate limiting, OWASP headers, SQL/XSS injection detection |
| database | 4 | Schema validation, seed data, embedded PG, data integrity |

### Test Coverage — 17 Sections

| Section | Coverage Area | Process Documents |
| ------- | ------------- | ----------------- |
| A | Smoke & Health Checks | All portals reachable, DB connected |
| B | User Management & Multi-User Auth | 5 demo accounts (3 patients, doctor, admin) |
| C | Appointments | Book, confirm, cancel, pool, queue, history |
| D | Video Meeting | Create, join, transcript, AI summary, EMR |
| E | Health Records (PHR) | Vitals, medications, allergies, timeline |
| F | EMR & Prescriptions | SOAP notes, prescriptions, lab orders |
| G | AI Features | Chat, CDS, document analysis, instructions |
| H | Living Will & PDPA | Create will, consent, audit trail |
| I | Notifications & Settings | CRUD, mark read, notification preferences |
| J | Medical Content & Sync | Articles, clinical resources, tags, real-time sync |
| K | Consultants & Metadata | Specialist directory, admin stats, ICD-10 |
| L | Cross-Portal Data Integrity | Token isolation, role-based access, data sync |
| M | Password Reset Flow | Forgot password, reset token validation |
| N | All Pages Navigation (Patient) | 15 pages return 200 |
| O | All Pages Navigation (Doctor) | 21 pages return 200 |
| P | Data Streaming & Sync | PHR, appointments, content streaming across users |
| Q | Phase 2 AI-HIS | CTM, Geriatric Screening, SOS, Nursing Dashboard |

### Test Credentials

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient 1 | `demo.test@gmail.com` | `P@ssw0rd` |
| Patient 2 | `Somchai.Mankong@gmail.com` | `P@ssw0rd` |
| Patient 3 | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` |
| Doctor | `doctor.test@izara.com` | `IzaraDoctor@2024` |
| Admin | `admin.test@izara.com` | `IzaraAdmin@2024` |

---

## ✨ Key Features

### For Patients 👤

- 📅 **Appointment Booking** — Multi-step booking with AI symptom analysis
- 📹 **Video Consultations** — Jitsi Meet integration (FREE, no account required)
- 🎙️ **Live Transcription** — Real-time speech-to-text during consultations
- 👥 **Invite Family Members** — External guests can join meetings via invite links
- 📋 **Personal Health Records (PHR)** — Vitals, allergies, medications, lifestyle data
- 🔔 **Real-time Notifications** — Appointment updates, meeting reminders
- 🤖 **AI Health Assistant** — Powered by Google Gemini with chat history
- 🗺️ **Healthcare Map** — Find nearby clinics/hospitals (1/5/10/15/20 km range)
- 📚 **Medical Content Library** — Health education articles with images
- 🌐 **Multi-language** — Thai (primary) and English
- 📄 **Living Will** — Digital advance directive management
- 🔒 **PDPA Consent** — Thailand's data protection compliance

### For Healthcare Providers 👨‍⚕️

- 📝 **Electronic Medical Records (EMR)** — Thai OPD card format with SOAP notes
- 📹 **Video Meeting HOST Controls** — Doctor as moderator with lobby management
- 🎥 **Meeting Transcription & AI Summary** — Automatic SOAP notes from transcripts
- 👥 **Invite Specialists** — External consultants join via invite links
- 💊 **E-Prescribing** — Drug interaction checks, medication management
- 🧪 **Lab & Imaging Orders** — Complete diagnostic workflow
- 📊 **Patient Queue Management** — Priority-based scheduling
- 📚 **Clinical Resources** — Medical library and references
- 🤖 **AI Clinical Copilot** — CDS, document analysis, pre-consultation summary
- 📋 **Patient Instructions** — Auto-generated post-visit care sheets
- 🔒 **Man-in-the-Loop AI** — Doctor reviews/validates all AI outputs

### For Administrators 🔧

- 👥 **User Management** — Doctor, patient, and staff accounts
- ✅ **Doctor Approval** — Pending doctor registration workflow
- 📊 **Analytics Dashboard** — Appointment statistics and insights
- ⚙️ **System Configuration** — Specialties, appointment pools
- 📋 **Medical Consultant Management** — Specialist directory

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     IZARA TELEMEDICINE v1.5.9                               │
├──────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│   │  Patient Portal │  │  Doctor Portal  │  │  Meeting Server        │   │
│   │  (React + Vite) │  │  (React + Vite) │  │  (Express + Socket.IO) │   │
│   │  localhost:3005 │  │  localhost:3010 │  │  localhost:3020        │   │
│   └────────┬────────┘  └────────┬────────┘  └─────────┬──────────────┘   │
│            │                    │                     │                   │
│            └────────────────────┼─────────────────────┘                   │
│                                 ▼                                         │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │       PostgreSQL 18 + pgvector (42 tables, Primary Database)      │  │
│   │       Local: Docker port 5433 | Cloud: VM 35.240.157.230:5432    │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                     EXTERNAL SERVICES                            │    │
│   │  • Jitsi Meet (meet.jit.si) — Video Conferencing (FREE)         │    │
│   │  • Google Gemini AI — Chat, CDS, SOAP Summaries                 │    │
│   │  • Web Speech API — FREE Live Transcription                     │    │
│   │  • Google Maps — Healthcare Facilities Map                       │    │
│   │  • Cloud Run — Container hosting (Production)                    │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| Frontend | React 18, TypeScript, Vite 7, Tailwind CSS | UI |
| Backend | Node.js 22, Express.js | API servers |
| Database | PostgreSQL 18 + pgvector | Primary data store |
| Auth | bcrypt + JWT (doctor) / Session tokens (patient) | Authentication |
| Realtime | Socket.io | WebSocket |
| AI | Google Gemini | Chat, CDS, summaries |
| Video | Jitsi Meet | Consultations |
| Maps | Google Maps + Places API | Healthcare finder |
| Hosting | Google Cloud Run | Production |
| CI/CD | Google Cloud Build | Automated deployment |

---

## 📦 Installation & Setup

### Prerequisites

- Node.js >= 22.0.0
- Docker & Docker Compose
- Git

### Quick Start

```bash
# 1. Clone
git clone https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere

# 2. Copy environment file
cp .env.docker.example .env.docker
# Edit .env.docker with your API keys

# 3. Start all services
docker-compose up -d --build

# 4. Access
# Patient Portal: http://localhost:3005
# Doctor Portal:  http://localhost:3010
# pgAdmin:        http://localhost:5050
```

### Required API Keys (add to `.env.docker`)

| Variable | Get From | Purpose |
| -------- | -------- | ------- |
| `VITE_GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | Maps |
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) | AI |
| `GOOGLE_SPEECH_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) | Transcription |
| `VITE_GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) | OAuth |

---

## 🚀 Running the Application

```bash
# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Full reset (wipes database)
docker-compose down -v && docker-compose up -d --build
```

### Services & Ports

| Service | Port | Description |
| ------- | ---- | ----------- |
| Patient Portal | 3005 | Patient web app + API |
| Doctor Portal | 3010 | Doctor/admin web app + API |
| Meeting Server | 3020 | Jitsi + transcription + AI |
| PostgreSQL | 5433 | Primary database |
| pgAdmin | 5050 | Database UI |

---

## 🚢 Cloud Deployment

### Google Cloud Run

```bash
# Deploy Patient Portal
cd Isara-patient-portal
gcloud builds submit --config=cloudbuild.yaml

# Deploy Doctor Portal
cd Isara-doctor-portal
gcloud builds submit --config=cloudbuild.yaml

# Deploy Meeting Server
cd Izara-jitsi-server
gcloud builds submit --config=cloudbuild.yaml
```

### Cloud URLs (Production — v1.5.9)

| Service | URL |
| ------- | --- |
| Patient Portal | <https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app> |

### No Dev Environment

Dev testing removed to reduce Cloud Run costs. Test locally via Docker, then deploy directly to production.

---

## 📁 Project Structure

```text
Isara-Anywhere/
├── Isara-patient-portal/     # Patient-facing application
│   ├── src/                  # React components & pages (flat structure)
│   │   ├── pages/            # 17 page components (flattened from subfolders)
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layer
│   │   └── types/            # TypeScript type definitions
│   ├── server/               # Express.js backend (unified)
│   │   ├── index.ts          # Main server entry point
│   │   ├── routes/           # 17 merged route modules
│   │   ├── middleware/       # Auth, security middleware
│   │   └── services/         # PostgreSQL data service
│   └── Dockerfile.unified    # Production container
├── Isara-doctor-portal/      # Doctor/Admin application
│   ├── src/                  # React components & pages
│   ├── server/               # Express.js backend servers
│   └── Dockerfile.unified    # Production container
├── Izara-jitsi-server/       # Meeting server with transcription
│   └── server/               # Express + Socket.IO
├── tests/
│   ├── unit/                 # Vitest unit tests (2,013 tests, 58 files)
│   ├── e2e/                  # Playwright E2E tests (1,149 tests, 33 specs)
│   └── cloud-ui-screenshots.ui-test.ts  # Cloud UI screenshot tests (39 tests)
├── screenshots/
│   ├── cloud/               # Cloud UI page screenshots organized by portal
│   │   ├── patient/         # Patient portal page captures
│   │   ├── doctor/          # Doctor portal page captures
│   │   └── api/             # API health check captures
│   ├── cloud-workflows/     # Multi-user workflow screenshots
│   │   ├── auth/            # Authentication workflows
│   │   ├── appointments/    # Appointment booking workflows
│   │   ├── doctor-queue/    # Doctor queue management
│   │   ├── video-meeting/   # Video consultation captures
│   │   ├── emr/             # EMR documentation workflows
│   │   ├── prescriptions/   # Prescription workflows
│   │   ├── admin/           # Admin panel workflows
│   │   └── content/         # Content management workflows
│   ├── meeting/             # Meeting multi-user workflows
│   │   ├── setup/           # Meeting setup & lobby
│   │   ├── video/           # Active video session
│   │   ├── transcript/      # Real-time transcription
│   │   ├── ai-summary/      # AI SOAP summary
│   │   └── documentation/   # Post-meeting documentation
│   ├── workflow/            # General workflow screenshots
│   │   ├── patient-flow/    # Patient journey flows
│   │   ├── doctor-flow/     # Doctor workflow flows
│   │   ├── phr/             # PHR management captures
│   │   ├── living-will/     # Living will workflows
│   │   └── notifications/   # Notification workflows
│   └── ui-pages/            # Local Docker UI page screenshots (25 PNGs)
│       ├── patient-portal/  # P01-P12: Dashboard, Appointments, PHR, AI Doctor, etc.
│       ├── doctor-portal/   # D01-D11: Dashboard, Schedule, Patients, Content, etc.
│       └── public-pages/    # P13-P14, D12: Login & Register pages
├── specs/                    # Specification documents
├── Processes/                # Workflow documentation (13 docs)
├── Presentations/            # Project presentations & diagrams
├── scripts/                  # Utility & deployment scripts
└── docker-compose.yml        # Docker orchestration (5 services)
```

---

## 📚 Documentation

| Document | Description |
| -------- | ----------- |
| [Spec Kit — Phase 1](specs/SPEC_KIT_PHASE1.md) | Combined Phase 1 requirements & feature matrix |
| [Spec Kit — Full](specs/SPEC_KIT.md) | Complete specification kit |
| [Phase 2 MVP](Phase2/PHASE2_MVP_COMPREHENSIVE.md) | Phase 2 MVP comprehensive plan |
| [Workflow Processes](Processes/) | 13 workflow & process documents |
| [Presentations](Presentations/) | Technical diagrams & project presentations |
| [Technical Documentation](Presentations/TECHNICAL_DOCUMENTATION.md) | Main technical reference |
| [E2E Coverage Report](tests/E2E_COVERAGE_REPORT.md) | Per-spec E2E test coverage analysis |

---

## 🔒 Security (v1.5.9 — SonarQube Clean)

- **Authentication**: bcrypt password hashing (10 rounds), JWT + session tokens
- **JWT Secrets**: Consistent `JWT_SECRET_FINAL` usage across all verify calls (sign/verify mismatch fixed)
- **Password Policy**: Unified 12-character minimum with uppercase, lowercase, digit, and special character requirements across all portals
- **Session Management**: Secure token-based sessions (24hr expiry)
- **Rate Limiting**: 10 login attempts per 15 minutes
- **OWASP Security Headers**: Helmet.js (CSP, XSS protection, HSTS, X-Frame, X-Content-Type)
- **Permissions-Policy**: `camera=(self "https://meet.jit.si")`, `microphone=(self "https://meet.jit.si")` — scoped to Jitsi iframe only
- **CSP Media Integration**: `frame-src meet.jit.si 8x8.vc`, `media-src mediastream:`, `worker-src blob:` for secure video conferencing
- **Body Limits**: 10KB JSON payload limit to prevent DoS
- **TypeScript Strict Safety**: Zero `error: any` in server code — all catch blocks use `error: unknown` with proper type narrowing
- **SonarQube Compliance**: No S6551 (unsafe string interpolation), no S4325 (unnecessary type assertions), no non-null assertions in frontend
- **Error Handling**: Global error handlers with sanitized error messages (no stack traces in production)
- **IDOR Protection**: User-scoped data access enforcement
- **Input Validation**: XSS prevention, SQL injection protection
- **CORS**: Strict origin validation — no localhost in production, regex restricted to `izara-*` Cloud Run services
- **Service Account Paths**: Credentials stored in `credentials/` directory (not in public/)
- **PDPA Compliance**: Thailand's data protection standards
- **Man-in-the-Loop AI**: Doctor validates all AI outputs before delivery

---

## 📋 Changelog

### v1.5.9 (March 22, 2026)

- **Meeting Recording Pipeline**: MediaRecorder API captures real audio during video consultations → base64 encoding → server-side Google Cloud Speech-to-Text with speaker diarization → AI SOAP summary generation
- **Recording Server Endpoints**: 2 new endpoints — `POST /api/meetings/:id/save-recording` (audio → STT → DB), `POST /api/meetings/:id/stop-recording` (stop + socket event)
- **Accessibility Fixes (axe/SonarQube)**: aria-labels on MeetingResults.tsx (textarea, close button, SVG), PatientMeetingRoom.tsx (invite inputs), MeetingRoom.tsx (chat input); inline styles → Tailwind CSS (`[transform:scaleX(-1)]`); html-diagrams/index.html (viewport meta, CSS class, `rel="noopener noreferrer"`)
- **Nesting Depth Refactor**: Extracted `saveRecordingBlob` useCallback helper in MeetingRoom.tsx — both `toggleRecording` and `handleMeetingEnd` use shared helper, eliminating 4+ level nesting warnings
- **E2E Test: Recording Pipeline** (Spec 31): New `31-meeting-recording-pipeline.spec.ts` — 25 tests in 5 sections (A: Appointment Setup, B: Recording Controls, C: Meeting End & AI Summary, D: Man-in-the-Loop Validation, E: Multi-User UI)
- **UI Test Screenshots**: 52/52 passing (27 meeting-multi-user + 25 workflow-screenshots) — 122 total screenshots across 5 categories (cloud: 26, cloud-workflows: 28, meeting: 12, ui-pages: 26, workflow: 30)
- **Unit Tests**: 2,013/2,013 passing across 58 files (meeting-server: 6 files/195 tests, doctor-portal: 24 files/830 tests)

### v1.5.9 (March 20, 2026)

- **Meeting System E2E Fix**: Complete end-to-end meeting pipeline — doctor validates AI summary (approve/edit/reject/regenerate), patient instructions auto-generated, consultation results delivered to patient portal with real-time polling
- **Meeting Server Backend**: 4 new endpoints (`/validate`, `/delete`, `/patient-instruction`, `/consultation-result`), 9 new DB columns + `meeting_chats` table for chat persistence
- **Doctor MeetingResults UI**: Full validation interface with approve/edit/reject/regenerate buttons, patient instruction generation, EMR navigation integration
- **Patient Consultation Results**: `PatientMeetingRoom.tsx` polls for approved results every 10s, displays AI summary + patient instructions on meeting end
- **UI Page Screenshots**: 25 full-page PNG screenshots captured via Playwright headed mode across all patient portal (14), doctor portal (11), and public (2) pages — saved to `screenshots/ui-pages/`
- **Camera/Microphone Fix**: Fixed `Permissions-Policy: camera=(), microphone=()` that completely blocked camera/mic access in Cloud Run and Docker deployments — updated across 5 server files (mainApiServer.cjs, owasp-middleware.cjs, owasp-middleware.ts, nginx.conf, Dockerfile.unified)
- **CSP Headers Updated**: Added `frame-src meet.jit.si 8x8.vc`, `connect-src *.run.app wss://*.run.app`, `media-src mediastream:`, `worker-src blob:` across 4 locations for secure Jitsi video conferencing
- **Jitsi iframe Allow Attribute**: Explicit `allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *"` in both MeetingRoom.tsx and PatientMeetingRoom.tsx
- **Zoom-like UX**: SVG icons for mic/camera/phone/record controls, 480×320 camera preview with mirror effect, Thai labels (ไมค์เปิด/กล้องเปิด), larger pre-join layout
- **env-config.template.js**: Added MEETING_SERVER_URL and JITSI_DOMAIN environment variables for Docker/Cloud Run
- **Cloud Tests**: 177/177 passing across 5 test suites — cloud-ui-screenshots (39), cloud-workflow-multiuser (42), meeting-multi-user (27), workflow-screenshots (25), ui-pages (44)
- **Local UI Tests**: 44/44 passing — all portal pages verified with headed browser screenshots
- **Cloud Deployment**: All 3 services deployed to Cloud Run v1.5.9 with updated CORS

### v1.5.9 (March 16, 2026)

- **SonarQube Full Clean**: Fixed all 26 remaining issues (S3776, S2004, S6853, S6582, S1128, S2068, S1854) across MeetingRoom.tsx, PatientMeetingRoom.tsx, cloud-workflow-multiuser, meeting-multi-user, workflow-screenshots
- **Screenshot Restructuring**: All 4 test files now organize screenshots into per-workflow subdirectories (22 subdirectories total)
- **Cognitive Complexity**: Extracted module-level helper functions from MeetingRoom.tsx (6 utilities) and PatientMeetingRoom.tsx (4 utilities) to reduce component complexity
- **Cloud Tests**: 177/177 passing across 5 test suites — cloud-ui-screenshots (39), cloud-workflow-multiuser (42), meeting-multi-user (27), workflow-screenshots (25), ui-pages (44)
- **Accessibility**: Added aria-labels to interactive video meeting controls (mic, camera, leave buttons)
- **Version Bump**: All packages updated to v1.5.9

### v1.5.7 (March 15, 2026)

- **Cloud UI Screenshot Tests**: NEW — 39 tests capturing 26 full-page screenshots (14 Patient + 12 Doctor pages) on Cloud Run with 1920×1080 viewport + 13 Cloud API health checks
- **Unit Tests Expanded**: 2,013 tests across 58 files (up from 1,814) — all 11 workflow test files enhanced with continuous chain sections (+199 new tests)
- **E2E Tests Verified**: 1,124 Local + 667 Cloud tests — all passing on LOCAL and Cloud (100% pass rate)
- **Cloud Workflow Tests**: 58/58 endpoints passing (100%) across all 11 workflows
- **Continuous Workflow Chains**: Added step-by-step lifecycle chains to all workflow tests — appointment, user management, video meeting, health records, dashboard, notification, living will, data sync, PDPA, queue management, medical content
- **SonarQube S6551 Fix**: Resolved 42 unsafe `String()` calls across content.ts, doctors.ts, gcs.ts, google-services.ts — proper `instanceof Error` + `typeof` narrowing
- **SonarQube S6698 Fix**: Removed hardcoded PGPASSWORD pattern in e2e-test.ps1
- **Cloud Build Fix**: Corrected Dockerfile path and build context in cloudbuild.yaml
- **Cloud Deployment**: All 3 services deployed to Cloud Run — health checks passing, 667 Cloud E2E tests verified
- **Documentation Updated**: All process docs, workflows, database schema updated to v1.5.9

### v1.5.6 (March 14, 2026)

- **SonarQube S6551 Fix**: Created `errMsg()` utility — replaced 109 unsafe inline error ternaries across 8 server files
- **SonarQube S3776 Fix**: Reduced cognitive complexity in auth.ts, video-meeting.ts, postgresDataService.ts by extracting helper functions
- **Unit Tests Expanded**: 2,013 tests across 58 files (up from 1,419/46) — all passing
- **API Endpoints**: 38/38 GET endpoints + 4/4 write operations verified returning 200 OK
- **Cloud Deployment**: All 3 Cloud Run services deployed v1.5.6 — health checks passing

### v1.5.5 (March 13, 2026)

- **TypeScript Strict Safety**: All server-side catch blocks use `error: unknown` with proper type narrowing (eliminated ~250 `error: any` patterns)
- **SonarQube Clean**: Fixed S6551 (unsafe string interpolation), S4325 (unnecessary assertions), non-null assertions
- **Codebase Restructuring**: Patient portal pages flattened from nested subfolders, server routes merged into 17 consolidated modules
- **Error Handling**: Proper `instanceof Error` type guards throughout; named error variables (`dbError`, `aiError`, `insertError`) for clarity
- **AuthenticatedRequest Interface**: Strongly-typed with explicit `patientId`, `userId`, and union role type
- **Docker Deployment**: All 5 services (patient-portal, doctor-portal, meeting-server, postgres, pgadmin) healthy
- **Cloud Deployment**: All 3 Cloud Run services deployed — health checks passing
- **PostgreSQL 18**: Updated all documentation to reflect actual database version

### v1.5.4 (March 8, 2026)

- Security hardening: JWT sign/verify consistency, OWASP headers, unified password policies
- Comprehensive test layer: 1,419 unit + 1,191 E2E = 2,610 tests at 100% pass rate (now 3,314 total in v1.5.9)
- Phase 2 AI-HIS tables and endpoints

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Team

### Izara Telemedicine Development Team

- Healthcare technology innovation for Thailand
- Focused on accessibility and user experience
- PDPA-compliant data handling

## 📞 Support

- 📧 Email: <chirapathleo.saeliM@gmail.com> / <chirapath.s@betimes.biz>
- 🐛 Issues: [GitHub Issues](https://github.com/chiraleo2000/Isara-Anywhere/issues)

---

### Made with ❤️ for Thailand's Healthcare

© 2024-2026 Izara Telemedicine. All rights reserved.
