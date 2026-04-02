# Izara Telemedicine - Data Architecture & Sync Documentation

**Version:** 1.6.1
**Last Updated:** March 31, 2026
**Status:** ✅ PostgreSQL Implementation Complete + Meeting Server + Cross-Portal Fixes + Full Schema

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

- **uuid-ossp** - UUID generation for primary keys

- **pgcrypto** - Password hashing and encryption

### Production Deployment (Google Cloud)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Google Cloud Run (asia-southeast1)                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Patient Portal    │  │ Doctor Portal     │  │ Meeting Server   │      │
│  │ 1 CPU / 1 GB      │  │ 1 CPU / 1 GB      │  │ 1 CPU / 2 GB     │      │
│  │ 0-2 instances     │  │ 0-2 instances     │  │ 0-2 instances    │      │
│  │ gen2 + CPU Boost  │  │ gen2 + CPU Boost  │  │ gen2 + CPU Boost │      │
│  │ Timeout: 300s     │  │ Timeout: 300s     │  │ Timeout: 600s    │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘      │
│           └─────────────────────┼──────────────────────┘                │
│                                 ▼                                        │
│                    ┌──────────────────────┐                              │
│                    │ PostgreSQL VM (GCE)  │                              │
│                    │ 35.240.157.230:5432  │                              │
│                    │ DB: izara_phase1     │                              │
│                    │ NOT Cloud SQL        │                              │
│                    │ pgvector + pgcrypto  │                              │
│                    │ + uuid-ossp          │                              │
│                    └──────────────────────┘                              │
│                                                                          │
│  Artifact Registry: asia-southeast1-docker.pkg.dev                       │
│  ├── izara-patient-portal:v1.5.8                                         │
│  ├── izara-doctor-portal:v1.5.8                                          │
│  └── izara-jitsi-meeting:v1.5.10                                         │
│                                                                          │
│  Cloud Build: Automated CI/CD via cloudbuild.yaml per service            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Initialization Scripts

| Order | Script | Purpose |
| ----- | ------ | ------- |
| 1 | `scripts/database/izara-database.sql` | Main schema (37+ tables, extensions, indexes) |
| 2 | `scripts/database/migrations/v2.0.0-phase2-tables.sql` | Phase 2 enhancement tables |
| 3 | `scripts/database/migrations/v2.1.0-phase2-ai-his.sql` | AI & HIS tables |
| 4 | `scripts/database/v2.2.0-notify-triggers.sql` | LISTEN/NOTIFY triggers |
| 5 | `scripts/database/seed-dev-data.sql` | Test data (7 seed users) |

### Complete Table Inventory (37+ Tables)

#### User Management (6 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **users** | id, email, password_hash, role, name, name_thai, phone, date_of_birth, national_id, doctor_id, patient_id, is_active, is_verified, is_approved, approval_status, preferences (JSONB), notification_settings (JSONB), login_attempts, locked_until | Unified user table for all roles |
| **sessions** | id, user_id, token, ip_address, user_agent, expires_at, logged_out_at | JWT session tracking |
| **password_resets** | id, user_id, token, expires_at, used, used_at | Password reset tokens |
| **device_tokens** | id, user_id, device_token, platform, device_name, is_active | Push notification devices |
| **biometric_credentials** | id, user_id, credential_type, public_key, device_id, is_active | Biometric auth (Phase 2) |
| **refresh_tokens** | id, user_id, token_hash, device_id, expires_at, is_revoked | JWT refresh rotation (Phase 2) |

#### Patient Data (7 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **patient_profiles** | patient_id, demographics (JSONB), emergency_contact (JSONB), insurance_info (JSONB) | Patient demographics |
| **phr** | id, patient_id, demographics (JSONB), vital_signs_history (JSONB), allergies (JSONB), chronic_conditions (JSONB), medications (JSONB), vaccinations (JSONB), lifestyle (JSONB), family_history (JSONB), blood_type, height_cm, weight_kg, bmi | Personal Health Records |
| **vital_signs** | id (UUID), patient_id, blood_pressure_systolic/diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, blood_glucose, weight, height, measured_at, source | Individual vital measurements |
| **living_wills** | id, patient_id, statement, treatments (JSONB), representatives (JSONB), signature (JSONB), pdpa_consent (JSONB), status, is_shared_with_doctors, version, audit_log (JSONB) | Advance directives |
| **living_will_versions** | id, patient_id, version, data (JSONB), note | Version history |
| **patient_consents** | id, patient_id, consent_type, granted, doctor_id, data_types (JSONB), status | PDPA consent management |
| **push_subscriptions** | id, user_id, appointment_reminders, medication_reminders, quiet_hours_start/end | Push notification preferences |

#### Doctor Management (5 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **doctor_profiles** | doctor_id, specialty, sub_specialties (JSONB), qualifications, experience_years, hospital_name, department, languages (JSONB), rating, consultation_fee, is_available, schedule (JSONB) | Extended doctor info |
| **doctors** | id, name, name_thai, specialty, specialty_thai, hospital, avatar_url, rating, is_available | Patient-facing doctor listing |
| **doctor_schedules** | id, doctor_id, day_of_week (0-6), start_time, end_time, slot_duration_minutes, is_available | Availability slots |
| **doctor_reviews** | id, doctor_id, patient_id, appointment_id, rating (1-5), comment | Patient feedback |
| **consultants** | id, name, specialty, email, phone, hospital, languages (JSONB), is_available, rating, reviews (JSONB), admin_notes | External specialist directory |

#### Appointments & Meetings (4 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **appointments** | id, patient_id, doctor_id, requested_date/time, confirmed_date/time, appointment_type, status, urgency_level, symptoms (JSONB), ai_triage (JSONB), meet_link, jitsi_room_name, invitees (JSONB) | Consultation scheduling |
| **meeting_records** | id (UUID), appointment_id, doctor_id, patient_id, room_name, jitsi_domain, status, meeting_config (JSONB), transcript, ai_summary, ai_recommendations, section_summaries (JSONB), doctor_validation_status, patient_instructions, recording_data (BYTEA), duration_minutes | Video sessions + AI |
| **meeting_transcripts** | id (UUID), meeting_record_id, speaker_id, speaker_role, speaker_name, content, language, confidence, start_time_seconds, is_final | STT segments |
| **ai_chat_history** | id, user_id, session_id, role, content, context (JSONB), embedding (vector) | Chat with AI embeddings |

#### Clinical Data (5 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **emr** | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, ai_summary_approved, patient_instructions, doctor_signature, signed_at, status (draft/signed) | SOAP medical records |
| **prescriptions** | id, emr_id, appointment_id, patient_id, doctor_id, medications (JSONB), pharmacy_instructions, cds_warnings (JSONB), status | E-prescribing |
| **lab_orders** | id, emr_id, appointment_id, patient_id, doctor_id, tests (JSONB), priority, results (JSONB), ai_analysis, status | Lab test orders |
| **transcriptions_embeddings** | meeting_record_id, chunk_text, speaker_role, start/end_time_seconds, embedding (vector), metadata (JSONB) | Vectorized transcript chunks |
| **ai_chat_memory** | id, user_id, memory_type, title, content, source_session_id, embedding (vector), relevance_score, is_active | Long-term AI memory |

#### Content & Knowledge (6 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **medical_content** | id, title_thai, title_english, content_thai, content_english, category, tags (JSONB), author_id, status (draft/published), image_url, view_count | Patient education |
| **clinical_resources** | id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, tags (JSONB), status (pending/approved), author_id, approved_by | Doctor reference |
| **icd10_codes** | code (PK), description_english, description_thai, category, chapter | Diagnosis codes |
| **drugs** | id, generic_name, brand_names (JSONB), drug_class, dosage_forms (JSONB), indications (JSONB), contraindications (JSONB), interactions (JSONB), pregnancy_category, renal_adjustment (JSONB) | Drug database |
| **knowledge_base** | id, title, content, source, category, guideline_year, language, embedding (vector), is_active | RAG knowledge base |
| **ai_document_analysis** | id, patient_id, doctor_id, document_type, filename, summary, key_findings (JSONB), abnormal_values (JSONB), validation_status | AI doc analysis |

#### AI & Decision Support (3 tables)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **cds_logs** | id, patient_id, doctor_id, appointment_id, recommendation_type, severity, title, description, guideline_source, doctor_decision (accepted/rejected/modified) | CDS audit trail |
| **ai_validations** | id, type, patient_id, doctor_id, decision (approved/rejected), content_snapshot, validated_at | Man-in-the-Loop log |
| **notifications** | id (UUID), user_id, type, title, title_thai, message, message_thai, data (JSONB), read_at | User notifications |

#### Audit (1 table)

| Table | Key Columns | Purpose |
| ----- | ----------- | ------- |
| **audit_logs** | id, user_id, patient_id, action, entity_type, entity_id, details (JSONB), old_value (JSONB), new_value (JSONB), ip_address, user_agent, performed_by | Compliance audit trail |

### PostgreSQL LISTEN/NOTIFY Triggers

| Trigger | Table | Events | Socket.IO Event |
| ------- | ----- | ------ | --------------- |
| notify_appointment_change | appointments | INSERT, UPDATE, DELETE | appointment:updated |
| notify_emr_change | emr | INSERT, UPDATE | emr:updated |
| notify_prescription_change | prescriptions | INSERT, UPDATE | prescription:updated |
| notify_lab_order_change | lab_orders | INSERT, UPDATE | lab-order:updated |
| notify_phr_change | phr | UPDATE | phr:updated |
| notify_schedule_change | doctor_schedules | INSERT, UPDATE, DELETE | schedule:updated |
| notify_notification_insert | notifications | INSERT | notification:new |
| notify_meeting_change | meeting_records | INSERT, UPDATE | meeting:updated |

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
│    meeting_link = '<https://meet.jit.si/...',>    │
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
| --- | ------- | --------------- | ----- |
| 1 | Appointment queries used non-existent `scheduled_date`/`scheduled_time` columns | `postgresDataService.ts`, `appointments.ts` | Use `COALESCE(confirmed_date, requested_date, appointment_date)`; remove demo data fallback |
| 2 | Session timeout too short (15 min) | `AuthContext.tsx`, `auth.ts`, `authServices.ts`, `config.ts`, `useAuth.ts` | Changed to 3-hour inactivity timeout across all portals |
| 3 | Medical content library: "Failed to create article" | `MedicalContent.tsx` | Unwrap `result.article \| \| result` from backend response; add auth headers to all fetch calls |
| 4 | Lab result upload sends no patient notification | `mainApiServer.cjs` | Added `createNotification()` call with type `lab_results` after lab upload |
| 5 | Dashboard shows all patients (privacy violation) | `apiDataService.ts`, `DoctorDashboard.tsx`, `mainApiServer.cjs` | Filter patients by `doctorId` via appointment relationship; added 30s auto-refresh |
| 6 | Meeting room camera/mic toggle desync | `PatientMeetingRoom.tsx`, `MeetingRoom.tsx` | Set `cameraOn`/`micOn` to false when permission denied |
| 7 | AI summary silently skips when Gemini unconfigured | `index.js` (meeting server) | Emit `meeting-summary-ready` socket event with error message |
| 8 | Consultant page freezes on add/update | `MedicalConsultants.tsx` | Unwrap `result.consultant \| \| result` from backend response |
| 9 | Specialties query references wrong table | `mainApiServer.cjs` | Changed `medical_consultants` → `consultants` |
| 10 | Meeting transcript POST with undefined appointmentId | `MeetingRoom.tsx` | Guard against undefined `appointmentId` before REST save |
| 11 | Validation errors silently logged | `MeetingResults.tsx` | Added user-facing `setError()` for regenerate and validation failures |

### Multi-Browser Playwright Configuration

| Project | Browser | Role | Base URL |
| --------- | --------- | ------ | ---------- |
| `Patient-Chrome` | Chrome | Patient | `<http://localhost:3005`> |
| `Doctor-Edge` | Microsoft Edge | Doctor | `<http://localhost:3010`> |
| `Admin-Firefox` | Firefox | Admin | `<http://localhost:3010`> |

New test spec: `tests/e2e/specs/32-cross-portal-sync.spec.ts` — validates all 11 fixes above.
