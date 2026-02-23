# Izara Telemedicine Platform - Technical Documentation

> **Version:** 1.5.1 (Updated February 23, 2026)  
> **Status:** Phase 1 Complete + Phase 2 + Phase 2.1 AI-HIS  
> **Database:** PostgreSQL 18 + pgvector  
> **Stack:** PostgreSQL / Express / React / Jitsi / Gemini AI / Google Cloud  
> **Tests:** 311 Unit Tests (Vitest) + 808 E2E Tests (Playwright) = 1,119 total across Local + Cloud-Dev

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [User Management & RBAC](#4-user-management--rbac)
5. [Core Workflows](#5-core-workflows)
6. [DevOps & Deployment](#6-devops--deployment)
7. [Testing](#7-testing)
8. [Future Roadmap](#8-future-roadmap)
9. [Omnichannel & MCP Integration](#9-omnichannel--mcp-integration) ⭐ NEW

---

## 1. Project Overview

### 1.1 Project Structure

```text
Isara-Anywhere/
├── credentials/                    # GCP Service Account Keys (gitignored)
├── Isara-patient-portal/           # 📱 Patient Front-end Application
│   ├── src/                        # React Source Code
│   ├── server/                     # Express Backend API (Port 3005)
│   └── Dockerfile.unified          # Production Container Config
├── Isara-doctor-portal/            # 💻 Doctor Clinical Application
│   ├── src/                        # React Source Code
│   ├── server/                     # Express Backend API (Port 3010)
│   └── Dockerfile.unified          # Production Container Config
├── Izara-jitsi-server/             # 📹 Video Meeting & Transcription (Port 3020)
├── Isara-mobile/                   # 📱 Mobile App (Expo SDK 52 + React Native)
│   ├── app/                        # Expo Router screens & tabs
│   ├── src/stores/                 # Zustand stores (authStore, syncStore)
│   ├── src/services/               # Sync engine coordinator
│   └── packages/                   # Monorepo shared packages
│       ├── api-client/             # Typed API client (Patient + Doctor)
│       ├── shared/src/db/          # SQLite schema, localDb, offlineQueue
│       └── ui/                     # Shared UI components
├── specs/                          # 📑 Specification Documents
│   ├── SPEC_KIT_PHASE1.md          # Phase 1 combined requirements
│   └── SPEC_KIT_PHASE2.md          # Phase 2 mobile + sync requirements
├── Presentations/                  # 📚 Documentation Hub (You are here)
│   ├── database/                   # DBML Schemas
│   ├── diagrams/                   # Mermaid.js Workflow Diagrams
│   └── html-diagrams/              # Interactive HTML Visualizations
├── scripts/                        # 🛠️ DevOps & Database Tools
│   ├── izara-cli.ps1               # ⭐ Unified Deployment CLI
│   ├── cloud-db-tool.cjs           # Database Operations Tool
│   ├── database/                   # SQL Init Scripts
│   └── deprecated/                 # Old scripts (archived)
├── tests/                          # 🧪 Testing (1,119 total tests)
│   ├── unit/                       # ⭐ Vitest unit tests (311 tests, 10 suites)
│   │   ├── doctor-portal/          # Drug DB, config tests
│   │   ├── patient-portal/         # PHR, API service tests
│   │   ├── mobile/                 # Utils, API client, sync tests
│   │   ├── meeting-server/         # Jitsi, CDS rule tests
│   │   ├── security/               # OWASP, password policy tests
│   │   └── database/               # Schema, FSM, RBAC tests
│   └── e2e/                        # Playwright E2E tests (808 tests, 10 specs)
│       ├── specs/                  # 10 Playwright spec files (01-10)
│       └── lib/                    # Shared test config & helpers
└── docker-compose.yml              # Local Orchestration Config
```

### 1.2 Core Services

| Service | Port | Description | Technology |
| --------- | ------ | ------------- | ------------ |
| **Patient Portal** | 3005 | Telehealth booking, PHR, Health Assistant | React + Express |
| **Doctor Portal** | 3010 | EMR, Prescribing, Tele-consultation | React + Express |
| **Meeting Server** | 3020 | Jitsi Meet, Recording, AI Transcription | Node.js + Jitsi |
| **⭐ Omnichannel Webhook** | 3015 | LINE/WhatsApp/Telegram ingestion | Node.js CJS |
| **⭐ OpenClaw MCP** | 3016 | AI context + 5 Doctor AI Tasks | Node.js CJS |
| **PostgreSQL** | 5433 | Primary relational database | PostgreSQL 18 |
| **pgAdmin** | 5050 | Database management UI | pgAdmin 4 |

### 1.3 Live URLs

#### Local Environment (Docker)

| Service | URL |
| --------- | ----- |
| Patient Portal | `http://localhost:3005` |
| Doctor Portal | `http://localhost:3010` |
| Meeting Server | `http://localhost:3020` |
| PostgreSQL | localhost:5433 |
| pgAdmin | `http://localhost:5050` |

#### Cloud Environment (Google Cloud Run)

| Service | URL |
| --------- | ----- |
| Patient Portal | `https://izara-patient-portal-hvht4obouq-as.a.run.app` |
| Doctor Portal | `https://izara-doctor-portal-hvht4obouq-as.a.run.app` |
| Meeting Server | `https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app` |
| pgAdmin | `https://izara-pgadmin-hvht4obouq-as.a.run.app` |
| Cloud SQL | 34.143.228.135:5432 |

---

## 2. System Architecture

### 2.1 High-Level Architecture

The platform uses a **Hybrid Cloud-Native Architecture**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           USERS                                          │
│   🧑‍🤝‍🧑 Patients                              👨‍⚕️ Doctors                    │
└─────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    🐳 DOCKER CONTAINERS                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │   📱 Patient Portal     │    │   💻 Doctor Portal      │            │
│  │   React + Node.js       │    │   React + Node.js       │            │
│  │   Port: 3005            │    │   Port: 3010            │            │
│  └───────────┬─────────────┘    └───────────┬─────────────┘            │
│              │                              │                           │
│              └──────────────┬───────────────┘                           │
│                             │                                           │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │   📹 Meeting Server (Jitsi + AI)    Port: 3020          │           │
│  └─────────────────────────────────────────────────────────┘           │
└─────────────────────────────┼───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        💾 DATA LAYER                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │   🐘 PostgreSQL 18      │    │   📦 Google Cloud       │            │
│  │   + pgvector            │    │   Storage (5 Buckets)   │            │
│  │   Port: 5433            │    │   Documents, Images     │            │
│  └─────────────────────────┘    └─────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     🔗 EXTERNAL SERVICES                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 📹 Jitsi    │  │ 🤖 Gemini   │  │ 🗺️ Maps    │  │ 📧 Email    │   │
│  │ meet.jit.si │  │ AI 2.5     │  │ API         │  │ SMTP        │   │
│  │ (FREE)      │  │ Flash      │  │             │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version |
| ------- | ------------ | --------- |
| **Frontend** | React, TypeScript, Tailwind CSS, Vite | React 18, Vite 7 |
| **Mobile** | Expo, React Native, NativeWind | Expo 52, RN 0.76 |
| **Backend** | Node.js, Express.js | Node 22, Express 4 |
| **Database** | PostgreSQL with pgvector | PostgreSQL 18 |
| **Hosting** | Docker, Google Cloud Run | Latest |
| **AI** | Google Gemini | 2.5 Flash |
| **Video** | Jitsi Meet (meet.jit.si - FREE) | Latest |
| **Maps** | Google Maps Platform | v3 |
| **Testing** | Playwright, Vitest | Playwright 1.58, Vitest 2.1 |

### 2.3 Visualization

> 📊 **Interactive Diagrams:** [Open All Diagrams](html-diagrams/index.html)

| Diagram | Description | View |
| --------- | ------------- | ------ |
| System Architecture | High-level overview (updated with omnichannel) | [View](html-diagrams/01-system-architecture.html) |
| Patient Features | Patient portal capabilities | [View](html-diagrams/02-patient-features.html) |
| Doctor Features | Doctor portal capabilities | [View](html-diagrams/03-doctor-features.html) |
| Appointment Workflow | Booking flow | [View](html-diagrams/04-appointment-workflow.html) |
| EMR Workflow | Clinical documentation | [View](html-diagrams/06-emr-workflow.html) |
| AI Integration | Gemini AI features | [View](html-diagrams/07-ai-integration.html) |
| Video Meeting Flow | Jitsi + transcription | [View](html-diagrams/10-video-meeting-flow.html) |
| PHR Management | Personal health records | [View](html-diagrams/11-phr-management.html) |
| Prescription Workflow | E-prescribing with CDS | [View](html-diagrams/12-prescription-workflow.html) |
| ⭐ **Omnichannel Workflow** | LINE/WhatsApp/Telegram → MCP → Doctor Portal | [View](html-diagrams/13-omnichannel-workflow.html) |
| ⭐ **MCP Session Lifecycle** | 5 Doctor AI Tasks & session management | [View](html-diagrams/14-mcp-session-lifecycle.html) |

---

## 3. Database Design

### 3.1 Schema Overview

The system uses a robust **PostgreSQL Relational Database** with:

- **Referential Integrity**: Foreign keys ensure data consistency
- **JSONB**: Flexible storage for clinical data (symptoms, medications)
- **pgvector**: AI embeddings for knowledge base RAG
- **Audit Logging**: Complete trail for PDPA/HIPAA compliance

### 3.2 Schema Reference

| File | Purpose |
| ------ | --------- |
| `database/izara-complete-schema-v5.dbml` | Visual schema (DBML format) — v5.1 (40 tables) |
| `scripts/database/izara-database.sql` | SQL implementation (v5.1.0) |

### 3.3 Table Groups

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                 │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│  AUTH TABLES        │  PATIENT TABLES     │  DOCTOR TABLES              │
│  ├─ users           │  ├─ patient_profiles│  ├─ doctor_profiles         │
│  ├─ sessions        │  ├─ phr             │  ├─ doctors                 │
│  └─ password_resets │  ├─ vital_signs     │  ├─ doctor_schedules        │
│                     │  ├─ living_wills    │  ├─ doctor_reviews          │
│                     │  └─ patient_consents│  └─ consultants             │
├─────────────────────┼─────────────────────┼─────────────────────────────┤
│  APPOINTMENT        │  CLINICAL           │  CONTENT                    │
│  ├─ appointments    │  ├─ emr             │  ├─ medical_content         │
│  ├─ meeting_records │  ├─ prescriptions   │  ├─ clinical_resources      │
│  └─ meeting_transcripts  └─ lab_orders    │  ├─ icd10_codes             │
│                     │                     │  └─ drugs                   │
├─────────────────────┼─────────────────────┼─────────────────────────────┤
│  AI TABLES          │  AUDIT              │                             │
│  ├─ notifications   │  └─ audit_logs      │                             │
│  ├─ knowledge_base  │                     │                             │
│  ├─ ai_chat_history │                     │                             │
│  ├─ ai_document_analysis                  │                             │
│  ├─ cds_logs        │                     │                             │
│  └─ ai_validations  │                     │                             │
└─────────────────────┴─────────────────────┴─────────────────────────────┘
```

### 3.4 Key Tables Detail

#### Users (Unified)

```sql
users (
  id, email, password_hash, role,         -- Core identity
  name, name_thai, phone,                 -- Profile
  doctor_id, medical_license_number,      -- Doctor fields
  patient_id,                             -- Patient fields
  is_active, is_approved, approval_status -- Status
)
```

#### Appointments

```sql
appointments (
  id, patient_id, doctor_id,              -- Participants
  confirmed_date, confirmed_time,          -- Scheduling
  status, urgency_level, symptoms,         -- Clinical
  jitsi_room_name, meeting_link            -- Video meeting
)
```

#### EMR (SOAP Notes)

```sql
emr (
  id, appointment_id, patient_id, doctor_id,
  subjective, objective, assessment, plan,  -- SOAP format (JSONB)
  ai_summary, ai_summary_approved,          -- AI assistance
  patient_instructions, doctor_signature    -- Instructions
)
```

---

## 4. User Management & RBAC

### 4.1 User Roles

| Role | Access Level | Capabilities |
| ------ | -------------- | -------------- |
| **Patient** | Basic | View own PHR, book appointments, health assistant |
| **Doctor** | Elevated | View assigned patients, create EMR, prescribe (requires admin approval) |
| **Admin** | System | Manage users, approve doctors, manage content |

### 4.2 Authentication Flow

```text
User Login → bcrypt Verify → Create Session → Store in DB → Return JWT
     ↓
API Request → Validate JWT → Check Session in DB → Authorize → Process
```

### 4.3 Doctor Approval Workflow

```text
1. Doctor registers → status = 'pending'
2. Admin reviews credentials
3. Admin approves/rejects → updates approval_status
4. Doctor gains access to clinical features
```

---

## 5. Core Workflows

### 5.1 Appointment Flow

```text
Patient                     System                      Doctor
   │                          │                           │
   │ 1. Select symptoms       │                           │
   │ ─────────────────────────>                           │
   │                          │                           │
   │ 2. AI analyzes urgency   │                           │
   │ <─────────────────────────                           │
   │                          │                           │
   │ 3. Select doctor & slot  │                           │
   │ ─────────────────────────>                           │
   │                          │ 4. Notify doctor          │
   │                          │ ─────────────────────────>│
   │                          │                           │
   │                          │ 5. Doctor confirms        │
   │                          │ <─────────────────────────│
   │                          │                           │
   │ 6. Jitsi link generated  │                           │
   │ <─────────────────────────                           │
   │                          │                           │
   │ ═══════════════ VIDEO CONSULTATION ════════════════ │
   │                          │                           │
   │                          │ 7. AI transcribes         │
   │                          │ 8. Generate EMR draft     │
   │                          │ ─────────────────────────>│
   │                          │                           │
   │                          │ 9. Doctor reviews & signs │
   │ 10. Patient sees summary │ <─────────────────────────│
   │ <─────────────────────────                           │
```

### 5.2 EMR Documentation (SOAP)

| Section | Content | AI Assistance |
| --------- | --------- | --------------- |
| **S** - Subjective | Patient symptoms, HPI | Extracted from transcript |
| **O** - Objective | Vitals, PE findings, labs | Lab result analysis |
| **A** - Assessment | Diagnosis (ICD-10) | Suggested diagnoses |
| **P** - Plan | Treatment, prescriptions | Drug interaction check |

### 5.3 Prescribing with CDS

```text
Doctor selects medication
        ↓
CDS checks: Drug-drug interactions
           Drug-allergy conflicts
           Dosage appropriateness
        ↓
If warnings → Display alert (severity: info/warning/critical)
        ↓
Doctor reviews → Accept/Reject/Modify
        ↓
Log decision in cds_logs (Man-in-the-Loop)
        ↓
Create prescription
```

---

## 6. DevOps & Deployment

### 6.1 Unified CLI (izara-cli.ps1)

```powershell
# Deploy locally
.\scripts\izara-cli.ps1 deploy local

# Deploy to cloud
.\scripts\izara-cli.ps1 deploy cloud

# Database operations
.\scripts\izara-cli.ps1 db -DbAction seed
.\scripts\izara-cli.ps1 db -DbAction verify
.\scripts\izara-cli.ps1 db -DbAction backup

# Health checks
.\scripts\izara-cli.ps1 health local
.\scripts\izara-cli.ps1 status

# Cleanup
.\scripts\izara-cli.ps1 clean -Full
```

### 6.2 Environment Configuration

```bash
# .env.docker (gitignored)
GEMINI_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
DB_PASSWORD=your_password
```

### 6.3 Docker Services

```yaml
services:
  izara-patient-portal:  # Port 3005
  izara-doctor-portal:   # Port 3010
  izara-meeting-server:  # Port 3020
  izara-postgres:        # Port 5433
  izara-pgadmin:         # Port 5050
```

---

## 7. Testing

### 7.1 Test Summary (February 22, 2026)

| Layer | Framework | Suites | Tests | Duration |
| --- | --- | --- | --- | --- |
| **Unit Tests** | Vitest 2.1.9 | 10 | 311 | ~1s |
| **E2E — Local Desktop** | Playwright 1.58 | 10 | 808 | ~35 min |
| **E2E — Cloud-Dev Desktop** | Playwright 1.58 | 10 | 808 | ~18 min |
| **E2E — Mobile-Local** | Playwright 1.58 | 1 (spec 10) | 85 | ~25s |
| **E2E — Mobile-Cloud-Dev** | Playwright 1.58 | 1 (spec 10) | 85 | ~30s |
| **TOTAL** | | **10 unit + 10×5 E2E** | **1,119** | **100% Pass** |

### 7.1.1 Unit Test Suites (tests/unit/)

| Suite | Tests | Coverage |
| --- | --- | --- |
| doctor-portal/drugDatabase | 25 | Drug data integrity, search, interactions |
| doctor-portal/config | 25 | GCS bucket names/URLs, feature flags, WebSocket |
| patient-portal/sharedPHRTypes | 28 | PHR factory, living will, doctor view transforms |
| patient-portal/api-service | 30 | Endpoint registry, query params, auth headers |
| mobile/shared-utils | 32 | Thai date/currency formatters, ID/phone validators |
| mobile/api-client | 26 | Error normalization, token refresh, URL construction |
| mobile/sync-engine | 31 | Offline queue, conflict resolution, delta sync |
| meeting-server/jitsi-meeting | 31 | Transcript chunking (incl. Thai), CDS rules, rooms |
| security/security-validation | 38 | Password policy (12-char), JWT, CORS, OWASP headers |
| database/schema-validation | 45 | Table registry, appointment FSM, RBAC, PDPA |

### 7.2 E2E Test Specs (10 Total)

| # | Spec | Tests | Coverage |
| --- | --- | --- | --- |
| 01 | Auth, Health & Multi-User | ~82 | Health checks, 5-user auth, RBAC, registration |
| 02 | Appointment Lifecycle | ~92 | Create, confirm, cancel, reschedule, cross-portal sync |
| 03 | Health Records & EMR | ~95 | PHR, vitals, EMR SOAP, prescriptions, lab orders |
| 04 | Video Meeting & Transcription | ~87 | Jitsi, transcription, AI SOAP, multi-browser |
| 05 | Content Sync & Approval | ~82 | Content CRUD, admin approval, real-time sync |
| 06 | AI Features & CDS | ~72 | AI chat, CDS drug checks, summarization |
| 07 | Multi-User Concurrent | ~60 | 4-browser concurrent flows, stress testing |
| 08 | Phase 2 AI-HIS | ~72 | CTM, geriatric screening, SOS, nursing dashboard |
| 09 | User Accounts Demo & Pages | ~91 | All 5 demo accounts, password reset, all pages |
| 10 | Mobile Viewport & Data Sync | ~85 | Mobile responsive, data streaming, multi-device |

### 7.3 Demo User Accounts

| Role | Email | Password | Portal |
| --- | --- | --- | --- |
| Patient 1 (Demo) | `demo.test@gmail.com` | P@ssw0rd | Patient |
| Patient 2 (Somchai) | `Somchai.Mankong@gmail.com` | P@ssw0rd | Patient |
| Patient 3 (Anan) | `Anan.Khayanrian@gmail.com` | P@ssw0rd | Patient |
| Doctor | `doctor.test@izara.com` | IzaraDoctor@2024 | Doctor |
| Admin | `admin.test@izara.com` | IzaraAdmin@2024 | Doctor |

### 7.4 Playwright Projects

| Project | Viewport | Target | Headless |
| --- | --- | --- | --- |
| Local | 1920×1080 | localhost:3005/3010/3020 | Configurable |
| Cloud | 1920×1080 | Cloud Run production | Configurable |
| Cloud-Dev | 1920×1080 | Cloud Run dev-testing | true |
| Mobile-Local | 393×851 (Pixel 7) | localhost:3005/3010 | Configurable |
| Mobile-Cloud-Dev | 393×851 (Pixel 7) | Cloud Run dev-testing | true |

### 7.5 Run Tests

```powershell
# ── Unit Tests (311 tests, < 2 seconds) ──
cd tests/unit
npx vitest run              # All 311 unit tests
npx vitest run --coverage    # With coverage report
npx vitest watch             # Watch mode

# ── E2E Tests (808 tests, requires Docker running) ──
cd tests/e2e

# Run ALL Local tests (800+ tests)
$env:HEADLESS="1"; npx playwright test --project=Local --workers=2

# Run ALL Cloud-Dev tests
$env:TEST_ENV="cloud-dev"; npx playwright test --project="Cloud-Dev" --workers=2

# Run Mobile viewport tests
$env:HEADLESS="1"; npx playwright test --project="Mobile-Local"

# Run specific spec
npx playwright test "09-user-accounts" --project=Local

# View HTML Report
npx playwright show-report
```

---

## 8. Future Roadmap

### Phase 2: Intelligence & Optimization (In Progress)

- [x] **Mobile App Architecture**: Expo 52 + React Native monorepo with Turborepo
- [x] **Security Hardening**: JWT sign/verify consistency, OWASP headers, unified 12-char passwords, CORS production tightening, credential path security
- [x] **Unit Test Layer**: 311 Vitest tests across 10 suites — pure logic, no server needed
- [x] **E2E Test Expansion**: 808 tests across 10 Playwright specs
- [x] **Mobile Viewport Testing**: Playwright simulation (Pixel 7, iPhone 13, iPad)
- [x] **Phase 2 AI-HIS Tables**: CTM, Geriatric Screening, SOS, Follow-up, Nursing
- [x] **Spec Kits**: Phase 1 + Phase 2 combined specification documents
- [x] **Mobile Offline-First Sync**: SQLite schema (9 tables), offline queue repository, Zustand sync store, sync engine coordinator
- [x] **Omnichannel Integration**: LINE, WhatsApp, Telegram webhooks with HMAC validation
- [x] **OpenClaw MCP Server**: AI context management with 5 Doctor AI Tasks
- [x] **PDPA Consent Gate**: Explicit consent workflow before PHI processing
- [ ] **Advanced RAG**: Full knowledge_base vector search for clinical decision support
- [ ] **IoMT Integration**: Wearable device sync for vitals
- [ ] **Payment Gateway**: Stripe/Omise for consultation fees
- [ ] **Native Mobile Release**: App Store / Play Store submission

### Phase 3: Scaling

- [ ] **Microservices Split**: Decouple Auth, Notifications, AI services
- [ ] **Multi-Region**: GCS bucket replication, DB read replicas
- [ ] **FHIR Compliance**: HL7 FHIR R4 for interoperability

---

## 9. Omnichannel & MCP Integration

### 9.1 Overview

The Omnichannel & MCP (Model Context Protocol) integration enables patients to interact with the healthcare team via popular messaging platforms (LINE, WhatsApp, Telegram) while maintaining a stateful AI context for intelligent clinical assistance.

**Architecture:**
```
Patient (LINE/WhatsApp/Telegram) 
  → Omnichannel Webhook Server (Port 3015)
    → OpenClaw MCP Server (Port 3016)
      → Google Gemini AI + GCS
        → Doctor Portal UI (Port 3010)
```

### 9.2 Omnichannel Webhook Server (Port 3015)

**Responsibilities:**
- Receive and validate webhooks from LINE, WhatsApp, Telegram
- HMAC-SHA256 signature validation per platform
- PDPA consent gate (check consent before processing any PHI)
- Message normalization to canonical `OmnichannelMessage` schema
- Route to OpenClaw MCP Server via internal REST API

**Supported Channels:**

| Channel | SDK | Signature Header | Secret Key |
|---------|-----|------------------|------------|
| LINE Official Account | `@line/bot-sdk` | `X-Line-Signature` | `LINE_CHANNEL_SECRET` |
| WhatsApp Business | Meta Cloud API | `X-Hub-Signature-256` | `WHATSAPP_APP_SECRET` |
| Telegram Bot | `node-telegram-bot-api` | Token in URL | `TELEGRAM_BOT_TOKEN` |

**Message Normalization:**
```javascript
OmnichannelMessage {
  messageId: string,
  patientId: string,
  channel: 'line' | 'whatsapp' | 'telegram',
  text: string,
  timestamp: ISO8601,
  metadata: {
    senderName?: string,
    mediaUrls?: string[],
    location?: { lat, lon }
  }
}
```

### 9.3 OpenClaw MCP Server (Port 3016)

**Responsibilities:**
- MCP protocol handler (HTTP/SSE-based)
- Stateful session context store (in-memory Map + GCS persistence)
- NLP entity extraction via Google Gemini API
- Doctor AI Task router (5 tasks)
- GCS bucket read/write for patient data persistence
- Socket.io event emission to Doctor Portal

**MCP Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/mcp/ingest` | Ingest normalized message, extract entities, update context |
| GET | `/mcp/context/:patientId` | Retrieve full session context snapshot |
| DELETE | `/mcp/context/:patientId` | Delete session (consent revocation) |
| POST | `/mcp/team-brief/:patientId` | Generate & dispatch Telegram team brief (Task 2) |
| POST | `/mcp/investigate/:patientId` | Create investigation orders (Task 3) |
| POST | `/mcp/prescribe/:patientId` | Draft prescription & follow-up (Task 4) |
| POST | `/mcp/referral/:patientId` | Generate referral package (Task 5) |

### 9.4 The 5 Doctor AI Tasks

#### Task 1: History Taking (ซักประวัติ)
- **Trigger:** Patient sends symptom description via chat
- **Process:**
  1. OpenClaw receives normalized message
  2. Gemini API extracts medical entities (symptoms, vitals, HPI)
  3. Structured data written to GCS: `patients/{id}/hpi.json`
  4. Socket.io event emitted to Doctor Portal
- **Output:** Updated patient context, follow-up question sent to patient

#### Task 2: Care Team Conference (ปรึกษาทีม)
- **Trigger:** Doctor clicks "Request Team Consult" in EMR UI
- **Process:**
  1. Doctor specifies question & urgency
  2. OpenClaw retrieves full MCP context from GCS
  3. Gemini generates team brief summary (<500 words)
  4. Brief posted to secure Telegram care team group
- **Output:** Telegram message with de-identified patient summary

#### Task 3: Investigation Request (สั่งตรวจ)
- **Trigger:** Doctor approves AI-suggested lab orders or manually creates orders
- **Process:**
  1. Orders submitted to OpenClaw MCP
  2. Lab order record written to GCS patient bucket
  3. Patient notified via preferred channel
- **Output:** Lab orders created, patient notification sent

#### Task 4: Prescription & Automated Follow-up (สั่งยา)
- **Trigger:** Doctor approves treatment plan in EMR
- **Process:**
  1. OpenClaw generates prescription draft via Gemini
  2. Doctor reviews and signs
  3. Prescription persisted to GCS
  4. Follow-up message dispatched to patient's channel
  5. Follow-up reminders scheduled (T+24h, T+72h)
- **Output:** Signed prescription, automated follow-up messages

#### Task 5: Referral Package Generation (ส่งต่อ)
- **Trigger:** Doctor clicks "Generate Referral" in EMR UI
- **Process:**
  1. OpenClaw retrieves full patient context (history, labs, meds, assessments)
  2. Gemini generates referral letter (demographics, HPI, assessment, treatment, reason for referral)
  3. PDF-ready JSON referral document written to GCS
  4. Patient notified
- **Output:** Referral package ready for download/transmission

### 9.5 Security Architecture

#### Webhook Authenticity
- **LINE:** HMAC-SHA256 validation using `X-Line-Signature` header
- **WhatsApp:** HMAC-SHA256 validation using `X-Hub-Signature-256` header
- **Telegram:** Bot token validation in webhook URL path
- **Rejection:** Invalid signatures → `401 Unauthorized` + audit log entry

#### PDPA Consent Lifecycle
```
1. Patient sends first message
2. Webhook server checks GCS consent record
3. If no consent → Send consent link + PDPA summary, halt processing
4. Patient clicks consent link, submits opt-in
5. Consent record written to GCS: consent/{patientId}.json
   {
     consentedAt: ISO8601,
     pdpaVersion: '1.0',
     channels: ['line', 'whatsapp'],
     scope: 'full'
   }
6. Subsequent messages processed normally
7. If consent revoked → DELETE /mcp/context/{patientId} → purge all PHI
```

#### PHI Encryption
- **In Transit:** TLS 1.3 enforced; internal services communicate via localhost
- **At Rest:** AES-256-GCM applied before writing to GCS
- **Key Management:** Encryption key stored in GCP Secret Manager

### 9.6 Workflow State Machine

**Omnichannel Message Processing:**
```
RECEIVED 
  → SIGNATURE_VALIDATED (or → 401 Reject)
    → CONSENT_CHECKED (or → CONSENT_REQUESTED)
      → NORMALISED
        → MCP_INGESTED
          → GCS_WRITTEN
            → UI_NOTIFIED
```

**MCP Session Lifecycle:**
```
createSession(patientId, channel)
  ↓
updateContext(sessionId, entities) — repeated per message
  ↓
getContext(patientId) — doctor requests full snapshot
  ↓
archiveSession(patientId) — appointment completed
  OR
deleteSession(patientId) — consent revoked
```

### 9.7 Frontend: OmnichannelMonitor Component

**Location:** `Isara-doctor-portal/src/components/OmnichannelMonitor.tsx`

**Sub-components:**

| Component | Purpose |
|-----------|---------|
| `ChannelFilterBar` | Toggle LINE / WhatsApp / Telegram / All |
| `MessageFeed` | Real-time scrolling feed (Socket.io) |
| `PatientContextPanel` | Display MCP context (HPI, meds, labs) |
| `AIActionPanel` | Approve/reject AI-suggested actions |
| `ReplyComposer` | Send message to patient via their channel |
| `ConsentStatusBadge` | Inline PDPA consent status indicator |

**RBAC:** Requires role `doctor`, `nurse`, or `admin`

### 9.8 External APIs & Credentials

| API | Purpose | Secret Key Name |
|-----|---------|-----------------|
| LINE Messaging API | Receive/send patient messages | `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` |
| Meta WhatsApp Cloud API | Receive/send patient messages | `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| Telegram Bot API | Secure care-team groups | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CARE_TEAM_CHAT_ID` |
| Google Gemini API | NLP & clinical AI reasoning | `GEMINI_API_KEY` (existing) |
| Google Cloud Storage | Patient data persistence | `GOOGLE_APPLICATION_CREDENTIALS` (existing) |

### 9.9 Deployment Notes

**Docker Compose Services:**
```yaml
izara-omnichannel-webhook:
  build: ./Isara-doctor-portal
  command: node server/omnichannel-webhook-server.cjs
  ports:
    - "3015:3015"
  environment:
    - LINE_CHANNEL_SECRET
    - WHATSAPP_APP_SECRET
    - TELEGRAM_BOT_TOKEN

izara-openclaw-mcp:
  build: ./Isara-doctor-portal
  command: node server/openclaw-mcp-server.cjs
  ports:
    - "3016:3016"
  environment:
    - OPENCLAW_MCP_ENCRYPTION_KEY
    - GEMINI_API_KEY
```

**Health Checks:**
- `GET /health` on both ports 3015 and 3016
- Expected response: `{ status: 'ok', timestamp: ISO8601 }`

### 9.10 Monitoring & Logging

**Audit Logging:**
- All PHI access events written to `izara-users-credentials/audit/`
- Log retention: ≥ 1 year (PDPA compliance)

**Key Metrics:**
- Webhook signature validation rejection rate
- MCP context retrieval latency (target: ≤ 2s P95)
- Socket.io event delivery rate
- Consent opt-in rate

**Alert Thresholds:**
- Signature rejection rate > 5%
- MCP latency > 5s P99
- Consent opt-out spike (> 10 in 1 hour)

---

## Quick Reference

### Test Credentials

| Role | Email | Password |
| ------ | ------- | ---------- |
| Patient 1 | `demo.test@gmail.com` | P@ssw0rd |
| Patient 2 | `Somchai.Mankong@gmail.com` | P@ssw0rd |
| Patient 3 | `Anan.Khayanrian@gmail.com` | P@ssw0rd |
| Doctor | `doctor.test@izara.com` | IzaraDoctor@2024 |
| Admin | `admin.test@izara.com` | IzaraAdmin@2024 |

### Key Files

| File | Purpose |
| ------ | --------- |
| `scripts/izara-cli.ps1` | Deployment & management |
| `scripts/cloud-db-tool.cjs` | Database operations |
| `tests/e2e/run-tests.ps1` | Test runner |
| `scripts/database/izara-database.sql` | DB schema (v5.1.0) |

---

### Last Updated: February 23, 2026
