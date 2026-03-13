# 🏥 Izara Telemedicine Platform

![Version](https://img.shields.io/badge/version-1.5.6-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Tests](https://img.shields.io/badge/Unit%20tests-1%2C814%20passing-brightgreen.svg)
![Tests](https://img.shields.io/badge/E2E%20tests-1%2C191%20passing-brightgreen.svg)
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

### Cloud Environment — Production (v1.5.6) (Google Cloud Run)

| Service | URL |
| ------- | --- |
| Patient Portal | <https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app> |

---

## 🧪 Testing

### Test Architecture (v1.5.6)

#### Unit Tests (Vitest — 1,814 tests)
- **58 test files** in `tests/unit/` — pure logic, no server required
- **Coverage areas**: Doctor portal (20 files), Patient portal (15 files), Meeting server (5 files), Security (2 files), Database (4 files)
- **Framework**: Vitest 2.1.9, runs in ~3.8 seconds
- **Run**: `cd tests/unit && npx vitest run`

#### E2E Tests (Playwright — 1,191 tests)
- **24 E2E spec files** (01-24): comprehensive workflow, API, and UI testing
- **1,191 total tests** across 24 spec files
- **5 simultaneous demo user accounts** (patient1, patient2, patient3, doctor, admin)
- **3 Playwright projects**: Local, Cloud, Cloud-Dev
- **0 skipped tests** — every test must pass
- **Serial + parallel execution** for workflow integrity

#### Combined: 3,005 tests (1,814 unit + 1,191 E2E)

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

### Run Tests

```powershell
# ── Unit Tests (1,814 tests, ~3.8 seconds) ──
cd tests/unit
npx vitest run              # Run all 1,814 unit tests
npx vitest run --coverage    # With coverage report
npx vitest watch             # Watch mode during development

# ── E2E Tests (1,191 tests, requires Docker services running) ──
cd tests/e2e

# Run ALL Local tests
$env:CI="true"; npx playwright test --project=Local --workers=6

# Run ALL Cloud-Dev tests
$env:TEST_ENV="cloud-dev"; npx playwright test --project="Cloud-Dev" --workers=2

# Run specific spec
npx playwright test "09-phase2" --project=Local

# View HTML Report
npx playwright show-report
```

### Unit Test Suites (tests/unit/) — 46 Files

| Category | Files | Coverage Area |
| ----- | ----- | ------------- |
| doctor-portal | 20 | Auth, API routes, EMR, prescriptions, GCS, Gemini AI, OWASP, storage, appointments |
| patient-portal | 15 | Auth, routes, PHR, AI, content, PDPA, notifications, video meeting |
| meeting-server | 5 | Jitsi meeting, AI summary, socket events, meeting routes |
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
│                     IZARA TELEMEDICINE v1.5.6                               │
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
│   │         PostgreSQL 18 + pgvector (Primary Database)               │  │
│   │         Local: Docker port 5433 | Cloud: Embedded PG in Cloud Run│  │
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

### Cloud URLs (Production — v1.5.6)

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
│   ├── unit/                 # Vitest unit tests (1,814 tests, 58 files)
│   └── e2e/                  # Playwright E2E tests (1,191 tests, 24 specs)
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

## 🔒 Security (v1.5.6 — SonarQube Clean)

- **Authentication**: bcrypt password hashing (10 rounds), JWT + session tokens
- **JWT Secrets**: Consistent `JWT_SECRET_FINAL` usage across all verify calls (sign/verify mismatch fixed)
- **Password Policy**: Unified 12-character minimum with uppercase, lowercase, digit, and special character requirements across all portals
- **Session Management**: Secure token-based sessions (24hr expiry)
- **Rate Limiting**: 10 login attempts per 15 minutes
- **OWASP Security Headers**: Helmet.js (CSP, XSS protection, HSTS, X-Frame, X-Content-Type)
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

### v1.5.6 (March 14, 2026)

- **SonarQube S6551 Fix**: Created `errMsg()` utility — replaced 109 unsafe inline error ternaries across 8 server files
- **SonarQube S3776 Fix**: Reduced cognitive complexity in auth.ts, video-meeting.ts, postgresDataService.ts by extracting helper functions
- **Unit Tests Expanded**: 1,814 tests across 58 files (up from 1,419/46) — all passing
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
- Comprehensive test layer: 1,419 unit + 1,191 E2E = 2,610 tests at 100% pass rate
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
