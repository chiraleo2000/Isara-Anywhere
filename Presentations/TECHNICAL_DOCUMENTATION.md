# Izara Telemedicine Platform - Technical Documentation

> **Version:** 2.1.0 (Updated February 5, 2026)  
> **Status:** Phase 1 Complete (Production Ready)  
> **Database:** PostgreSQL 18 + pgvector  
> **Stack:** PostgreSQL / Express / React / Jitsi / Gemini AI / Google Cloud  
> **Tests:** 92 LOCAL + 92 CLOUD = 184 Total (100% Passing, 0 Skipped)

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
├── Presentations/                  # 📚 Documentation Hub (You are here)
│   ├── database/                   # DBML Schemas
│   ├── diagrams/                   # Mermaid.js Workflow Diagrams
│   └── html-diagrams/              # Interactive HTML Visualizations
├── scripts/                        # 🛠️ DevOps & Database Tools
│   ├── izara-cli.ps1               # ⭐ Unified Deployment CLI
│   ├── cloud-db-tool.cjs           # Database Operations Tool
│   ├── database/                   # SQL Init Scripts
│   └── deprecated/                 # Old scripts (archived)
├── tests/                          # 🧪 Testing
│   └── e2e/
│       ├── run-tests.ps1           # ⭐ Unified Test Runner
│       └── specs/                  # Playwright Test Specs
│           └── phase1-full-coverage.spec.ts  # ⭐ Main test file (92 tests)
└── docker-compose.yml              # Local Orchestration Config
```

### 1.2 Core Services

| Service | Port | Description | Technology |
| --------- | ------ | ------------- | ------------ |
| **Patient Portal** | 3005 | Telehealth booking, PHR, Health Assistant | React + Express |
| **Doctor Portal** | 3010 | EMR, Prescribing, Tele-consultation | React + Express |
| **Meeting Server** | 3020 | Jitsi Meet, Recording, AI Transcription | Node.js + Jitsi |
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
| **Frontend** | React, TypeScript, Tailwind CSS, Vite | React 18, Vite 5 |
| **Backend** | Node.js, Express.js | Node 22, Express 4 |
| **Database** | PostgreSQL with pgvector | PostgreSQL 18 |
| **Hosting** | Docker, Google Cloud Run | Latest |
| **AI** | Google Gemini | 2.5 Flash |
| **Video** | Jitsi Meet (meet.jit.si - FREE) | Latest |
| **Maps** | Google Maps Platform | v3 |
| **Testing** | Playwright | v2.0 |

### 2.3 Visualization

> 📊 **Interactive Diagrams:** [Open All Diagrams](html-diagrams/index.html)

| Diagram | Description | View |
| --------- | ------------- | ------ |
| System Architecture | High-level overview | [View](html-diagrams/01-system-architecture.html) |
| Patient Features | Patient portal capabilities | [View](html-diagrams/02-patient-features.html) |
| Doctor Features | Doctor portal capabilities | [View](html-diagrams/03-doctor-features.html) |
| Appointment Workflow | Booking flow | [View](html-diagrams/04-appointment-workflow.html) |
| EMR Workflow | Clinical documentation | [View](html-diagrams/06-emr-workflow.html) |
| AI Integration | Gemini AI features | [View](html-diagrams/07-ai-integration.html) |
| Video Meeting Flow | Jitsi + transcription | [View](html-diagrams/10-video-meeting-flow.html) |
| PHR Management | Personal health records | [View](html-diagrams/11-phr-management.html) |
| Prescription Workflow | E-prescribing with CDS | [View](html-diagrams/12-prescription-workflow.html) |

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
| `database/izara-complete-schema-v4.dbml` | Visual schema (DBML format) |
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

### 7.1 Test Summary (February 5, 2026)

| Environment | Tests Passed | Tests Skipped | Tests Failed | Duration |
| --- | --- | --- | --- | --- |
| **LOCAL** | 92 | 0 | 0 | ~1.2 min |
| **CLOUD** | 92 | 0 | 0 | ~48.9s |
| **TOTAL** | 184 | 0 | 0 | **100% Pass** |

### 7.2 Test Categories (20 Total)

| # | Category | Tests | Description |
| --- | --- | --- | --- |
| 1 | API Health & Database | 6 | Health endpoints, DB connection |
| 2 | User Management | 8 | Login (5 users), profiles, sessions |
| 3 | Appointment Workflow | 7 | Book, list, pool, history |
| 4 | Video Meeting (Jitsi) | 8 | Transcription, AI summary |
| 5 | Health Records (PHR) | 7 | Vitals, medications, allergies |
| 6 | EMR Workflow | 4 | SOAP format, AI summary |
| 7 | Patient Instructions | 2 | Generate & list |
| 8 | AI Features | 4 | Chat, CDS, Document Analysis |
| 9 | PDPA & Living Will | 3 | Consent management |
| 10 | Clinical Resources | 4 | Medical content |
| 11 | Notifications | 3 | Patient/Doctor alerts |
| 12 | Patient Portal UI | 6 | Dashboard, appointments |
| 13 | Doctor Portal UI | 5 | Dashboard, patients |
| 14 | Admin Portal UI | 3 | Admin features |
| 15 | Theme & Language | 2 | Dark mode, Thai/English |
| 16 | Doctor Data Services | 3 | Doctors list, specialties |
| 17 | Multi-Portal Parallel | 3 | Simultaneous multi-user |
| 18 | Full Workflow E2E | 2 | Appointment→Meeting→EMR |
| 19 | Error Handling | 4 | Invalid credentials |
| 20 | Phase 1 Requirements | 8 | Stakeholder verification |

### 7.3 Run Tests

```powershell
# Navigate to test directory
cd tests/e2e

# Run LOCAL tests (92 tests)
$env:TEST_ENV="local"
npx playwright test specs/phase1-full-coverage.spec.ts --timeout=180000 --workers=4

# Run CLOUD tests (92 tests)
$env:TEST_ENV="cloud"
npx playwright test specs/phase1-full-coverage.spec.ts --timeout=180000 --workers=4

# Run with visible browser (headed mode)
npx playwright test specs/phase1-full-coverage.spec.ts --headed

# Run specific test category
npx playwright test specs/phase1-full-coverage.spec.ts --grep "Video Meeting"

# View HTML Report
npx playwright show-report
```

### 7.4 Test File Location

Main test file: `tests/e2e/specs/phase1-full-coverage.spec.ts`

This comprehensive test file covers ALL Phase 1 requirements with **ZERO skipped tests**.

---

## 8. Future Roadmap

### Phase 2: Intelligence & Optimization

- [ ] **Advanced RAG**: Full knowledge_base vector search for clinical decision support
- [ ] **Mobile App**: React Native wrapper for Patient Portal
- [ ] **IoMT Integration**: Wearable device sync for vitals
- [ ] **Payment Gateway**: Stripe/Omise for consultation fees

### Phase 3: Scaling

- [ ] **Microservices Split**: Decouple Auth, Notifications, AI services
- [ ] **Multi-Region**: GCS bucket replication, DB read replicas
- [ ] **FHIR Compliance**: HL7 FHIR R4 for interoperability

---

## Quick Reference

### Test Credentials

| Role | Email | Password |
| ------ | ------- | ---------- |
| Patient | <demo.test@gmail.com> | P@ssw0rd |
| Doctor | <doctor.test@izara.com> | IzaraDoctor@2024 |
| Admin | <admin.test@izara.com> | IzaraAdmin@2024 |

### Key Files

| File | Purpose |
| ------ | --------- |
| `scripts/izara-cli.ps1` | Deployment & management |
| `scripts/cloud-db-tool.cjs` | Database operations |
| `tests/e2e/run-tests.ps1` | Test runner |
| `scripts/database/izara-database.sql` | DB schema (v5.1.0) |

---

### Last Updated: February 4, 2026
