# 🏥 Izara Telemedicine Platform

![Version](https://img.shields.io/badge/version-1.5.3-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web%20%7C%20mobile-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Tests](https://img.shields.io/badge/Unit%20tests-409%20passing-brightgreen.svg)
![Tests](https://img.shields.io/badge/E2E%20tests-808%20passing-brightgreen.svg)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-deployed-blue.svg)
![Mobile](https://img.shields.io/badge/mobile-Expo%20%2B%20React%20Native-blueviolet.svg)
![Security](https://img.shields.io/badge/security-OWASP%20hardened-green.svg)

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

### Cloud Environment — Production (v1.5.3) (Google Cloud Run)

| Service | URL |
| ------- | --- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> |

### Mobile App (Expo + React Native)

| Config | Value |
| ------ | ----- |
| Framework | Expo SDK 52 + React Native 0.76 |
| Package | `isara-mobile` (monorepo with Turborepo) |
| Local Storage | expo-sqlite (9 tables: user_profile, appointments, vital_signs, medications, medication_logs, phr_cache, notifications, sync_queue, sync_metadata) |
| Sync Engine | Offline-first with conflict resolution (keep-local / keep-server / merge) |
| State | Zustand 5.0 (authStore + syncStore) |
| Patient Tabs | Dashboard, Appointments, Health Records, AI Chat, Profile |
| Doctor Tabs | Dashboard, Queue, Schedule, Patients, Profile |
| Run | `cd Isara-mobile && npx expo start` |

---

## 🧪 Testing

### Test Architecture (v1.5.3)

#### Unit Tests (Vitest — 409 tests)
- **15 test suites** in `tests/unit/` — pure logic, no server required
- **Coverage areas**: Drug database, config, PHR types, API service, mobile utils, API client, sync engine, Jitsi meeting, security validation, database schema
- **Framework**: Vitest 2.1.9, runs in < 2 seconds
- **Run**: `cd tests/unit && npx vitest run`

#### E2E Tests (Playwright — 808 tests)
- **10 E2E spec files** (01-10): comprehensive workflow, API, UI, and mobile viewport testing
- **808 total tests** across 10 spec files
- **5 simultaneous demo user accounts** (patient1, patient2, patient3, doctor, admin)
- **5 Playwright projects**: Local, Cloud, Cloud-Dev, Mobile-Local, Mobile-Cloud-Dev
- **Mobile viewport tests**: Pixel 7 (393×851), iPhone 13 (390×844), iPhone SE (375×667), iPad Mini (768×1024)
- **0 skipped tests** — every test must pass
- **Serial + parallel execution** for workflow integrity

#### Combined: 1,217 tests (409 unit + 808 E2E)

### E2E Test Specs

| Spec | Name | Tests | Coverage |
| ---- | ---- | ----- | -------- |
| 01 | Auth, Health & Multi-User | ~82 | Health checks, 5-user auth, registration, RBAC |
| 02 | Appointment Lifecycle | ~92 | Create, confirm, cancel, reschedule, cross-portal sync |
| 03 | Health Records & EMR | ~95 | PHR, vitals, EMR SOAP, prescriptions, lab orders, living will |
| 04 | Video Meeting & Transcription | ~87 | Jitsi meeting, transcription, AI SOAP, multi-browser |
| 05 | Content Sync & Approval | ~82 | Content CRUD, admin approval, real-time sync verification |
| 06 | AI Features & CDS | ~72 | AI chat, CDS drug checks, summarization, doctor AI tools |
| 07 | Multi-User Concurrent | ~60 | 4-browser concurrent flows, stress testing, cross-portal |
| 08 | Phase 2 AI-HIS | ~72 | CTM assessment, geriatric screening (8 tools), SOS, follow-up |
| 09 | User Accounts Demo & Pages | ~91 | All 5 demo accounts display, password reset, all portal pages |
| 10 | Mobile Viewport & Data Sync | ~85 | Mobile responsive, data streaming, multi-device viewports |

### Run Tests

```powershell
# ── Unit Tests (311 tests, < 2 seconds) ──
cd tests/unit
npx vitest run              # Run all 311 unit tests
npx vitest run --coverage    # With coverage report
npx vitest watch             # Watch mode during development

# ── E2E Tests (808 tests, requires Docker services running) ──
cd tests/e2e

# Run ALL Local tests (headless)
$env:HEADLESS="1"; npx playwright test --project=Local --workers=2

# Run ALL Cloud-Dev tests
$env:TEST_ENV="cloud-dev"; npx playwright test --project="Cloud-Dev" --workers=2

# Run Mobile viewport tests (local)
$env:HEADLESS="1"; npx playwright test --project="Mobile-Local"

# Run Mobile viewport tests (cloud-dev)
$env:TEST_ENV="cloud-dev"; npx playwright test --project="Mobile-Cloud-Dev"

# Run specific spec (headed, visible browser)
npx playwright test "09-user-accounts" --project=Local

# View HTML Report
npx playwright show-report
```

### Unit Test Suites (tests/unit/)

| Suite | Tests | Coverage Area |
| ----- | ----- | ------------- |
| doctor-portal/drugDatabase | 25 | Drug data integrity, search, interaction checking |
| doctor-portal/config | 25 | GCS buckets, feature flags, WebSocket URLs |
| patient-portal/sharedPHRTypes | 28 | PHR factory, living will, doctor view transforms |
| patient-portal/api-service | 30 | Endpoint registry, query params, auth headers |
| mobile/shared-utils | 32 | Thai date/currency formatters, validators |
| mobile/api-client | 26 | Error normalization, token refresh, URL construction |
| mobile/sync-engine | 31 | Offline queue, conflict resolution, delta sync |
| meeting-server/jitsi-meeting | 31 | Transcript chunking, CDS rules, room names |
| security/security-validation | 38 | Password policy, JWT, CORS, rate limiting, OWASP |
| database/schema-validation | 45 | Table registry, appointment FSM, RBAC, PDPA |
| doctor-portal/labOrders | 18 | Lab order CRUD, validation, result upload, imaging |
| doctor-portal/adminService | 22 | Admin getAllUsers SQL fix, doctor approval flow |
| doctor-portal/prescriptions | 16 | Prescription validation, SQL builder, patient query |
| doctor-portal/apiEndpoints | 25 | Route config, response format, error handling |
| database/embeddedPg | 17 | Embedded PG config, connection validation, migrations |

### Test Coverage — 18 Sections

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
| P | Mobile Viewport (Android/iOS) | Pixel 7, iPhone 13, iPhone SE, iPad Mini |
| Q | Data Streaming & Sync | PHR, appointments, content streaming across users |
| R | Phase 2 AI-HIS | CTM, Geriatric Screening, SOS, Nursing Dashboard |

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
│                     IZARA TELEMEDICINE v1.5.3                               │
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
│   │         PostgreSQL 16 + pgvector (Primary Database)               │  │
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
| Database | PostgreSQL 16 + pgvector | Primary data store |
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

### Cloud URLs (Production — v1.5.3)

| Service | URL |
| ------- | --- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> |

### No Dev Environment

Dev testing removed to reduce Cloud Run costs. Test locally via Docker, then deploy directly to production.

---

## 📁 Project Structure

```text
Isara-Anywhere/
├── Isara-patient-portal/     # Patient-facing application
│   ├── src/                  # React components & pages
│   ├── server/               # Express.js backend + routes
│   └── doc/                  # Portal documentation
├── Isara-doctor-portal/      # Doctor/Admin application
│   ├── src/                  # React components & pages
│   ├── server/               # Express.js backend servers
│   └── doc/                  # Portal documentation
├── Izara-jitsi-server/       # Meeting server with transcription
│   ├── server/               # Express + Socket.IO
│   └── client/               # Transcription components
├── Isara-mobile/             # Mobile app (Expo + React Native)
│   ├── app/                  # Expo Router screens
│   ├── src/                  # Stores (auth, sync) & services (syncEngine)
│   └── packages/             # Shared packages (api-client, ui, shared)
│       └── shared/src/db/    # SQLite schema, localDb, offlineQueue
├── tests/
│   ├── unit/                 # Vitest unit tests (409 tests, 15 suites)
│   └── e2e/                  # Playwright E2E tests (808 tests, 10 specs)
│       ├── specs/            # 10 test spec files (01-10)
│       └── lib/              # Shared test config & helpers
├── specs/                    # Specification documents
│   ├── SPEC_KIT_PHASE1.md    # Phase 1 combined requirements
│   └── SPEC_KIT_PHASE2.md    # Phase 2 mobile + sync requirements
├── Processes/                # Workflow documentation (13 docs)
├── Presentations/            # Project presentations & diagrams
├── scripts/                  # Utility & deployment scripts
└── docker-compose.yml        # Docker orchestration
```

---

## 📚 Documentation

| Document | Description |
| -------- | ----------- |
| [Spec Kit — Phase 1](specs/SPEC_KIT_PHASE1.md) | Combined Phase 1 requirements & feature matrix |
| [Spec Kit — Phase 2](specs/SPEC_KIT_PHASE2.md) | Mobile app specifications, SQLite sync, security |
| [Patient Portal Doc](Isara-patient-portal/doc/) | Patient portal architecture, features & APIs |
| [Doctor Portal Doc](Isara-doctor-portal/doc/) | Doctor portal architecture, features & APIs |
| [Workflow Processes](Processes/) | 13 workflow & process documents |
| [Presentations](Presentations/) | Technical diagrams & project presentations |
| [E2E Coverage Report](tests/E2E_COVERAGE_REPORT.md) | Per-spec E2E test coverage analysis |

---

## 🔒 Security (v1.5.3 Hardened)

- **Authentication**: bcrypt password hashing (10 rounds), JWT + session tokens
- **JWT Secrets**: Consistent `JWT_SECRET_FINAL` usage across all verify calls (sign/verify mismatch fixed)
- **Password Policy**: Unified 12-character minimum with uppercase, lowercase, digit, and special character requirements across all portals
- **Session Management**: Secure token-based sessions (24hr expiry)
- **Rate Limiting**: 10 login attempts per 15 minutes
- **OWASP Security Headers**: Helmet.js (CSP, XSS protection, HSTS, X-Frame, X-Content-Type)
- **Body Limits**: 10KB JSON payload limit to prevent DoS
- **Error Handling**: Global error handlers with sanitized error messages (no stack traces in production)
- **IDOR Protection**: User-scoped data access enforcement
- **Input Validation**: XSS prevention, SQL injection protection
- **CORS**: Strict origin validation — no localhost in production, regex restricted to `izara-*` Cloud Run services
- **Service Account Paths**: Credentials stored in `credentials/` directory (not in public/)
- **PDPA Compliance**: Thailand's data protection standards
- **Man-in-the-Loop AI**: Doctor validates all AI outputs before delivery

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
