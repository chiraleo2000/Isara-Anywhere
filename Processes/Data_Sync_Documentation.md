# Izara Telemedicine - Data Architecture & Sync Documentation

**Version:** 1.6.0  
**Last Updated:** July 10, 2026  
**Status:** ✅ PostgreSQL Implementation Complete + Meeting Server + Cross-Portal Fixes

---

## 📋 Overview

Izara Telemedicine uses PostgreSQL as the primary database, deployed alongside the application portals in Docker containers. This document describes the data architecture, table structure, and data flow patterns.

---

## 🗄️ Database Configuration

### Docker Services

| Service | Container Name | Port | Purpose |
| --------- | ---------------- | ------ | --------- |
| PostgreSQL | izara-postgres | 5433 (external) / 5432 (internal) | Primary database |
| Patient Portal | izara-patient-portal | 3005 | Patient frontend + backend |
| Doctor Portal | izara-doctor-portal | 3010 | Doctor frontend + backend |
| Meeting Server | izara-meeting-server | 3020 | Jitsi transcription + AI summary |
| pgAdmin | izara-pgadmin | 5050 | Database administration |

### Connection Details

```text
Host: localhost (local Docker) / postgres (Docker network)
Port: 5433 (external) / 5432 (internal)
User: postgres
Password: YOUR_TEST_PASSWORD
Database: izara_phase1
```

### Database Extension

- **pgvector** - For AI embedding storage and similarity search

---

## 📊 Data Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE: izara_phase1                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CORE TABLES                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  users            │ All user accounts (patient, doctor, admin)      │   │
│  │  doctor_profiles  │ Doctor-specific profile data                    │   │
│  │  patient_profiles │ Patient-specific profile data                   │   │
│  │  sessions         │ Authentication sessions                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CLINICAL TABLES                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  appointments     │ Appointment scheduling                          │   │
│  │  emr              │ Electronic Medical Records (SOAP format)        │   │
│  │  phr              │ Personal Health Records                         │   │
│  │  vital_signs      │ Patient vital measurements                      │   │
│  │  prescriptions    │ Medication prescriptions                        │   │
│  │  lab_orders       │ Laboratory test orders                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CONTENT TABLES                                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  medical_content     │ Health articles for patients                 │   │
│  │  clinical_resources  │ Clinical guidelines for doctors              │   │
│  │  consultants         │ Specialist directory                         │   │
│  │  notifications       │ User notifications                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AI/CDS TABLES (Phase 1)                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  knowledge_base       │ RAG knowledge entries with embeddings       │   │
│  │  ai_chat_history      │ Doctor AI chat conversation logs            │   │
│  │  ai_document_analysis │ PDF/Lab analysis results                    │   │
│  │  cds_logs             │ Clinical Decision Support audit trail       │   │
│  │  patient_instructions │ Generated patient instruction sheets        │   │
│  │  ai_validations       │ Man-in-the-Loop approval records            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   PATIENT PORTAL      │ │    DOCTOR PORTAL      │ │    AI SERVICES        │
│   (Port 3005)         │ │    (Port 3010)        │ │    (Gemini 2.5 Flash) │
├───────────────────────┤ ├───────────────────────┤ ├───────────────────────┤
│ • View PHR            │ │ • Manage patients     │ │ • Pre-consultation    │
│ • Book appointments   │ │ • EMR documentation   │ │   summary             │
│ • Join video meetings │ │ • AI Chat Assistant   │ │ • Document analysis   │
│ • View instructions   │ │ • Document analysis   │ │ • CDS alerts          │
│ • AI health chat      │ │ • Man-in-the-loop     │ │ • RAG search          │
│ • Health timeline     │ │ • Patient instructions│ │ • Chat memory         │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 🔄 Data Flow Patterns

### 1. User Authentication Flow

```text
Patient Login                          Doctor/Admin Login
     │                                       │
     ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│ Patient     │                        │ Doctor      │
│ Portal      │                        │ Portal      │
│ Backend     │                        │ Backend     │
│ (Port 3005) │                        │ (Port 3010) │
└──────┬──────┘                        └──────┬──────┘
       │                                      │
       └────────────────┬─────────────────────┘
                        ▼
┌──────────────────────────────────────────────────┐
│         PostgreSQL - users table                 │
│                                                  │
│  SELECT * FROM users WHERE email = $1            │
│  AND password_hash = crypt($2, password_hash)    │
│                                                  │
│  Columns:                                        │
│  - id, email, password_hash, role                │
│  - name_th, name_en                             │
│  - created_at, last_login                       │
└──────────────────────────────────────────────────┘
```

### 2. Appointment Data Flow

```text
Patient Books Appointment
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ appointments    │
│ (Patient Portal)│
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│         PostgreSQL - appointments table          │
│                                                  │
│  INSERT INTO appointments (                      │
│    id, patient_id, doctor_id, status,           │
│    appointment_type, symptoms,                   │
│    requested_date_time, meeting_link             │
│  )                                               │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Doctor Portal   │    │ Admin Portal    │
│ Schedule Tab    │    │ All Appts Tab   │
│ (Port 3010)     │    │ (Port 3010)     │
└────────┬────────┘    └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼ (Doctor/Admin Confirms)
┌──────────────────────────────────────────────────┐
│  UPDATE appointments SET                         │
│    status = 'confirmed',                         │
│    confirmed_date_time = NOW(),                  │
│    meeting_link = 'https://meet.jit.si/...',    │
│    doctor_meeting_url = '...',                  │
│    patient_meeting_url = '...'                  │
│  WHERE id = $1                                   │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│ Appointments    │
│ (Shows meeting) │
└─────────────────┘
```

### 3. AI-Assisted EMR Flow (Phase 1 Feature)

```text
Video Meeting Completes
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Device Speech-to-Text (Browser API)             │
│  - Real-time transcription during call           │
│  - Saves to meeting_transcripts table            │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│  Gemini AI - Meeting Summary Generation          │
│                                                  │
│  Input: Full transcript + Patient history (RAG)  │
│  Output: SOAP format EMR draft                   │
│         + AI-generated summary                   │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│  Man-in-the-Loop Validation                      │
│                                                  │
│  Doctor reviews AI-generated EMR:                │
│  ┌────────────────────────────────────────────┐ │
│  │ S: ผู้ป่วยมาด้วยอาการปวดศีรษะ 2 วัน...       │ │
│  │ O: BP 120/80, T 37.5°C...                   │ │
│  │ A: Tension headache                         │ │
│  │ P: Paracetamol 500mg prn, rest              │ │
│  │                                             │ │
│  │     [✓ Approve]  [✏️ Edit]  [✗ Reject]      │ │
│  └────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
 (If Approved)           (If Edited/Rejected)
┌───────────────┐      ┌────────────────────────┐
│ INSERT INTO   │      │ Doctor edits manually  │
│ emr           │      │ or AI regenerates      │
│ ai_validations│      └────────────────────────┘
└───────────────┘
```

### 4. Patient Instruction Sheet Generation

```text
Doctor Completes EMR
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Gemini AI - Patient Instruction Generation      │
│                                                  │
│  Input: EMR (SOAP) + Prescription + Guidelines   │
│  Output: Patient-friendly instruction sheet      │
│         - Diagnosis summary (lay terms)          │
│         - Medication instructions                │
│         - Lifestyle recommendations              │
│         - Warning signs to watch                │
│         - Follow-up appointment info             │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│  Man-in-the-Loop Validation                      │
│                                                  │
│  Doctor approves/edits instruction sheet         │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────────────┐
│ INSERT INTO     │    │ Patient Portal          │
│ patient_        │──▶│ Health Records > View   │
│ instructions    │    │ Instruction Sheet       │
└─────────────────┘    └─────────────────────────┘
```

---

## 🔐 Access Control Matrix

| Resource | Patient | Doctor | Admin |
| ---------- | --------- | -------- | ------- |
| Own PHR | Read/Write | Read | Read |
| Other Patient PHR | ❌ | Read (assigned) | Read (all) |
| Appointments (own) | Read/Write | Read/Write | Read/Write |
| Appointments (all) | ❌ | Read (queue) | Read/Write |
| Medical Content | Read | Read/Write | Read/Write |
| Clinical Resources | ❌ | Read | Read/Write |
| AI Chat Assistant | ❌ | Read/Write | Read/Write |
| AI Validations | ❌ | Write (own) | Read (audit) |
| User Management | ❌ | ❌ | Read/Write |

---

## 📡 API Endpoints

### Patient Portal (Port 3005)

| Endpoint | Method | Data Source | Description |
| ---------- | -------- | ------------- | ------------- |
| `/api/auth/login` | POST | PostgreSQL users | Patient authentication |
| `/api/phr` | GET/POST | PostgreSQL phr | Personal health records |
| `/api/appointments` | GET/POST | PostgreSQL appointments | Appointment management |
| `/api/doctors` | GET | PostgreSQL doctor_profiles | Available doctors list |
| `/api/content/articles` | GET | PostgreSQL medical_content | Medical articles |
| `/api/video-meeting` | POST | Jitsi API | Create meeting link |
| `/api/patient-instructions/:id` | GET | PostgreSQL patient_instructions | View instruction sheet |

### Doctor Portal (Port 3010)

| Endpoint | Method | Data Source | Description |
| ---------- | -------- | ------------- | ------------- |
| `/api/auth/login` | POST | PostgreSQL users | Doctor authentication |
| `/api/patients` | GET | PostgreSQL patient_profiles | Patient list |
| `/api/appointments` | GET/PUT | PostgreSQL appointments | Appointment management |
| `/api/emr` | GET/POST | PostgreSQL emr | EMR records |
| `/api/prescriptions` | POST | PostgreSQL prescriptions | Prescriptions |
| `/api/clinical-resources` | GET | PostgreSQL clinical_resources | Clinical guidelines |
| `/api/ai/chat` | POST | Gemini + RAG | AI Chat Assistant |
| `/api/ai/document-analysis` | POST | Gemini | PDF/Lab analysis |
| `/api/ai/meeting-summary` | POST | Gemini | Meeting transcription summary |
| `/api/ai/patient-instructions` | POST | Gemini | Generate instruction sheet |
| `/api/ai/validate` | POST | PostgreSQL ai_validations | Man-in-the-Loop approval |

---

## 🔍 Data Validation Rules

### Appointment Data

```javascript
{
  id: "APT-{uuid}",                    // Required, unique
  patient_id: "PATIENT-{id}",          // Required, FK to users
  doctor_id: "DOC-{id}" | null,        // Optional (for pool)
  status: enum["pending", "in_pool", "assigned", "confirmed", "in_progress", "completed", "cancelled", "declined"],
  appointment_type: enum["telehealth", "onsite"],
  urgency: enum["normal", "urgent", "emergency"],
  symptoms: {
    main: string,                       // Required
    description: string,
    duration: string,
    severity: number (1-10)
  },
  requested_date_time: TIMESTAMP,       // Required
  confirmed_date_time: TIMESTAMP | null,
  meeting_link: URL | null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### EMR Data (SOAP Format)

```javascript
{
  id: "EMR-{uuid}",
  appointment_id: "APT-{uuid}",         // FK to appointments
  patient_id: "PATIENT-{id}",           // FK to users
  doctor_id: "DOC-{id}",                // FK to users
  subjective: text,                     // Patient complaints, history
  objective: text,                      // Physical exam, vitals
  assessment: text,                     // Diagnosis (ICD-10)
  plan: text,                           // Treatment plan
  ai_generated: boolean,                // Was this AI-generated?
  ai_validation_status: enum["pending", "approved", "rejected", "edited"],
  validated_by: "DOC-{id}" | null,
  validated_at: TIMESTAMP | null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### AI Validation Record (Man-in-the-Loop)

```javascript
{
  id: "VAL-{uuid}",
  content_type: enum["emr", "patient_instruction", "summary", "document_analysis"],
  content_id: "{uuid}",                 // Reference to the content
  ai_model: "gemini-2.5-flash-lite",
  original_content: JSONB,              // AI-generated original
  validated_content: JSONB,             // Doctor-approved final
  validation_status: enum["pending", "approved", "rejected", "edited"],
  doctor_id: "DOC-{id}",
  doctor_notes: text | null,            // Reason for edit/reject
  created_at: TIMESTAMP,
  validated_at: TIMESTAMP | null
}
```

---

## ✅ Testing Coverage

### Playwright Tests (26 tests)

- Patient Portal: 10 tests
- Doctor Portal: 10 tests
- Admin workflows: 6 tests

### Run Tests

```powershell
# Complete test suite (Playwright)
cd Isara-doctor-portal
npx playwright test

# Specific test file
npx playwright test tests/doctor-portal.spec.ts

# With UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Test Users

| Role | Email | Password |
| ------ | ------- | ---------- |
| Patient | `demo.test@gmail.com` | `YOUR_TEST_PASSWORD` |
| Patient | `Somchai.Mankong@gmail.com` | `YOUR_TEST_PASSWORD` |
| Patient | `Anan.Khayanrian@gmail.com` | `YOUR_TEST_PASSWORD` |
| Doctor | `doctor.test@izara.com` | `YOUR_TEST_DOCTOR_PASSWORD` |
| Admin | `admin.test@izara.com` | `YOUR_TEST_ADMIN_PASSWORD` |

---

## 🚀 Deployment Checklist

### Local Development

- [ ] Docker containers running (postgres, patient-portal, doctor-portal, pgadmin)
- [ ] Database seeded with `seed-local.sql`
- [ ] Patient Portal accessible at <http://localhost:3005>
- [ ] Doctor Portal accessible at <http://localhost:3010>
- [ ] pgAdmin accessible at <http://localhost:5050>

### Production Deployment

- [ ] Cloud Run services deployed
- [ ] Cloud SQL PostgreSQL configured
- [ ] Database seeded with `seed-cloud.sql`
- [ ] Gemini API key configured
- [ ] CORS and security headers configured
- [ ] All Playwright tests pass

---

Documentation generated for Izara Telemedicine Platform v3.0.0
Phase 1: AI-Assisted Consultation with Man-in-the-Loop Validation

---

## 📝 Changelog — v1.6.0 (July 2026)

### Bug Fixes Applied

| # | Issue | Files Changed | Fix |
|---|-------|---------------|-----|
| 1 | Appointment queries used non-existent `scheduled_date`/`scheduled_time` columns | `postgresDataService.ts`, `appointments.ts` | Use `COALESCE(confirmed_date, requested_date, appointment_date)`; remove demo data fallback |
| 2 | Session timeout too short (15 min) | `AuthContext.tsx`, `auth.ts`, `authServices.ts`, `config.ts`, `useAuth.ts` | Changed to 3-hour inactivity timeout across all portals |
| 3 | Medical content library: "Failed to create article" | `MedicalContent.tsx` | Unwrap `result.article \|\| result` from backend response; add auth headers to all fetch calls |
| 4 | Lab result upload sends no patient notification | `mainApiServer.cjs` | Added `createNotification()` call with type `lab_results` after lab upload |
| 5 | Dashboard shows all patients (privacy violation) | `apiDataService.ts`, `DoctorDashboard.tsx`, `mainApiServer.cjs` | Filter patients by `doctorId` via appointment relationship; added 30s auto-refresh |
| 6 | Meeting room camera/mic toggle desync | `PatientMeetingRoom.tsx`, `MeetingRoom.tsx` | Set `cameraOn`/`micOn` to false when permission denied |
| 7 | AI summary silently skips when Gemini unconfigured | `index.js` (meeting server) | Emit `meeting-summary-ready` socket event with error message |
| 8 | Consultant page freezes on add/update | `MedicalConsultants.tsx` | Unwrap `result.consultant \|\| result` from backend response |
| 9 | Specialties query references wrong table | `mainApiServer.cjs` | Changed `medical_consultants` → `consultants` |
| 10 | Meeting transcript POST with undefined appointmentId | `MeetingRoom.tsx` | Guard against undefined `appointmentId` before REST save |
| 11 | Validation errors silently logged | `MeetingResults.tsx` | Added user-facing `setError()` for regenerate and validation failures |

### Multi-Browser Playwright Configuration

| Project | Browser | Role | Base URL |
|---------|---------|------|----------|
| `Patient-Chrome` | Chrome | Patient | `http://localhost:3005` |
| `Doctor-Edge` | Microsoft Edge | Doctor | `http://localhost:3010` |
| `Admin-Firefox` | Firefox | Admin | `http://localhost:3010` |

New test spec: `tests/e2e/specs/32-cross-portal-sync.spec.ts` — validates all 11 fixes above.
