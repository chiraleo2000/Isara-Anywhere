# 🗄️ PostgreSQL Database Architecture & Schema

**Version:** 2.0.0
**Last Updated:** June 25, 2026
**Database:** PostgreSQL 18 + pgvector
**Schema:** `izara_phase1`
**Status:** ✅ Production schema — 53+ tables (see [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md))

---


## 📋 Table of Contents

1. [Database Overview](#1-database-overview)
2. [Extensions & Configuration](#2-extensions--configuration)
3. [Deployment Architecture](#3-deployment-architecture)
4. [Complete Table Schema](#4-complete-table-schema)
5. [Entity-Relationship Diagram](#5-entity-relationship-diagram)
6. [Data Flow Patterns](#6-data-flow-patterns)
7. [LISTEN/NOTIFY Real-Time Triggers](#7-listennotify-real-time-triggers)
8. [Indexes & Performance](#8-indexes--performance)
9. [Migration Scripts](#9-migration-scripts)
10. [Access Control Matrix](#10-access-control-matrix)
11. [Backup & Recovery](#11-backup--recovery)

---


## 1. Database Overview

Izara Telemedicine uses a **single PostgreSQL 18 database** (`izara_phase1`) as the only data store. No GCS buckets, no Cloud SQL — PostgreSQL runs either as a Docker container (local dev) or a GCE VM (production). All portals connect to the same database.


### Key Facts

| Property | Value |
| -------- | ----- |
| Database Name | `izara_phase1` |
| PostgreSQL Version | 18 |
| Extensions | pgvector, uuid-ossp, pgcrypto |
| Total Tables | 53+ |
| Master Schema | `scripts/database/izara-database.sql` (v5.1.0) |
| Seed Data | `scripts/database/seed-dev-data.sql` |
| DB Tool | `scripts/database/db-tool.cjs` |


### Table Category Summary

| Category | Tables | Count |
| -------- | ------ | ----- |
| User Management | users, sessions, password_resets, device_tokens, biometric_credentials, refresh_tokens | 6 |
| Patient Data | patient_profiles, phr, vital_signs, living_wills, living_will_versions, patient_consents, push_subscriptions | 7 |
| Doctor Management | doctor_profiles, doctors, doctor_schedules, doctor_reviews, consultants | 5 |
| Appointments & Meetings | appointments, meeting_records, meeting_transcripts, meeting_chats, meeting_invites, recording_share_tokens, appointment_ai_suggestions | 7 |
| Clinical Data | emr, emr_records, prescriptions, lab_orders, imaging_orders, patient_instructions, health_timeline | 7 |
| Content & Knowledge | medical_content, clinical_resources, icd10_codes, drugs, knowledge_base, ai_document_analysis | 6 |
| AI & Decision Support | ai_chat_history, ai_chat_memory, transcript_embeddings, cds_logs, ai_validations, notifications | 6 |
| Mobile & Sync | notification_preferences, user_settings, sync_queue, user_api_connections, api_connection_audit | 5 |
| Extended Clinical | ctm_assessments, geriatric_screenings, sos_alerts, follow_ups, nursing_tasks, predictive_analytics | 6 |
| Audit & Admin | audit_logs, access_audit, admin_actions | 3 |

> **Quick reference with workflow mapping:** [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md)

---


## 2. Extensions & Configuration


### Required PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation for primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Password hashing (bcrypt) and encryption
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector for AI embedding similarity search
```


### Connection Configuration


#### Local Docker

```text
Host:     localhost (external) / postgres (Docker network)
Port:     5433 (external) / 5432 (internal)
User:     postgres
Database: izara_phase1
```


#### Production (Google Cloud GCE VM)

```text
Host:     35.240.157.230
Port:     5432
User:     izara_user
Database: izara_phase1
Extensions: pgvector + pgcrypto + uuid-ossp
```


### Docker Services

| Service | Container | Port | Purpose |
| ------- | --------- | ---- | ------- |
| PostgreSQL | izara-postgres | 5433→5432 | Primary database |
| Patient Portal | izara-patient-portal | 3005 | Patient frontend + backend |
| Doctor Portal | izara-doctor-portal | 3010 | Doctor frontend + backend |
| Meeting Server | izara-meeting-server | 3020 | Jitsi + AI summary |
| pgAdmin | izara-pgadmin | 5050 | Database administration |

---


## 3. Deployment Architecture


### Local Development (Docker Compose)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL DOCKER ENVIRONMENT                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │Patient Portal│  │Doctor Portal │  │Meeting Server│              │
│  │  :3005       │  │  :3010       │  │  :3020       │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         └─────────────────┼──────────────────┘                      │
│                           ▼                                          │
│              ┌──────────────────────┐                                │
│              │  PostgreSQL 18       │                                │
│              │  izara-postgres      │                                │
│              │  :5433 → :5432       │                                │
│              │  DB: izara_phase1    │                                │
│              │  pgvector + pgcrypto │                                │
│              └──────────────────────┘                                │
│                           │                                          │
│              ┌──────────────────────┐                                │
│              │  pgAdmin :5050       │                                │
│              └──────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```


### Production (Google Cloud)

```text
┌─────────────────────────────────────────────────────────────────────┐
│              PRODUCTION — Google Cloud (asia-southeast1)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Cloud Run (auto-scaling 0-2 instances each)                        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐             │
│  │Patient Portal │ │Doctor Portal  │ │Meeting Server │             │
│  │1 CPU / 1 GB   │ │1 CPU / 1 GB   │ │1 CPU / 2 GB   │             │
│  │gen2+CPU Boost │ │gen2+CPU Boost │ │gen2+CPU Boost │             │
│  │Timeout: 300s  │ │Timeout: 300s  │ │Timeout: 600s  │             │
│  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘             │
│          └─────────────────┼──────────────────┘                     │
│                            ▼                                         │
│               ┌──────────────────────┐                               │
│               │ PostgreSQL VM (GCE)  │                               │
│               │ 35.240.157.230:5432  │                               │
│               │ DB: izara_phase1     │                               │
│               │ NOT Cloud SQL        │                               │
│               └──────────────────────┘                               │
│                                                                      │
│  Artifact Registry: asia-southeast1-docker.pkg.dev                   │
│  CI/CD: Cloud Build via cloudbuild.yaml per service                  │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 4. Complete Table Schema


### 4.1 User Management (6 Tables)


#### `users` — Unified user table for all roles

```sql
CREATE TABLE users (
    id              VARCHAR(50) PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'admin', 'patient')),
    name            VARCHAR(255) NOT NULL,
    name_thai       VARCHAR(255),
    avatar_url      TEXT,
    phone           VARCHAR(50),
    date_of_birth   DATE,
    gender          VARCHAR(20),
    national_id     VARCHAR(20),
    -- Doctor-specific
    doctor_id       VARCHAR(50),
    medical_license_number VARCHAR(50),
    specialty       VARCHAR(100),
    hospital_name   VARCHAR(255),
    -- Patient-specific
    patient_id      VARCHAR(50),
    -- Status
    is_active       BOOLEAN DEFAULT true,
    is_verified     BOOLEAN DEFAULT false,
    is_approved     BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',
    -- Settings
    preferences     JSONB DEFAULT '{"language":"th","theme":"light","notifications":true}',
    notification_settings JSONB,
    -- Security
    login_attempts  INTEGER DEFAULT 0,
    locked_until    TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP WITH TIME ZONE
);
```


#### `sessions` — JWT session tracking

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(128) PK | Session ID |
| user_id | VARCHAR(50) FK→users | User reference |
| token | TEXT | JWT token |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser info |
| expires_at | TIMESTAMPTZ | Token expiry |
| logged_out_at | TIMESTAMPTZ | Explicit logout |


#### `password_resets` — Password reset tokens

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Reset ID |
| user_id | VARCHAR(50) FK→users UNIQUE | One active per user |
| token | VARCHAR(128) UNIQUE | Reset token |
| expires_at | TIMESTAMPTZ | Token expiry |
| used | BOOLEAN | Was it consumed |


#### `device_tokens` — Push notification devices

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Device token ID |
| user_id | VARCHAR(50) FK→users | User reference |
| device_token | TEXT | FCM/APNS token |
| platform | VARCHAR(20) | ios/android/web |
| is_active | BOOLEAN | Currently active |


#### `biometric_credentials` — Biometric auth (Phase 2)

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Credential ID |
| user_id | VARCHAR(50) FK→users | User reference |
| credential_type | VARCHAR(50) | fingerprint/face |
| public_key | TEXT | WebAuthn public key |
| is_active | BOOLEAN | Currently active |


#### `refresh_tokens` — JWT refresh rotation (Phase 2)

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Token ID |
| user_id | VARCHAR(50) FK→users | User reference |
| token_hash | TEXT | Hashed refresh token |
| expires_at | TIMESTAMPTZ | Token expiry |
| is_revoked | BOOLEAN | Revoked flag |

---


### 4.2 Patient Data (7 Tables)


#### `patient_profiles` — Patient demographics

| Column | Type | Description |
| ------ | ---- | ----------- |
| patient_id | VARCHAR(50) PK FK→users | Patient user ID |
| demographics | JSONB NOT NULL | Age, address, etc. |
| emergency_contact | JSONB | Emergency info |
| insurance_info | JSONB | Insurance details |


#### `phr` — Personal Health Records

```sql
CREATE TABLE phr (
    id              VARCHAR(50) PRIMARY KEY,
    patient_id      VARCHAR(50) REFERENCES users(id),
    demographics    JSONB,
    vital_signs_history JSONB DEFAULT '[]',
    allergies       JSONB DEFAULT '[]',
    chronic_conditions JSONB DEFAULT '[]',
    medications     JSONB DEFAULT '[]',
    vaccinations    JSONB DEFAULT '[]',
    lifestyle       JSONB,
    family_history  JSONB DEFAULT '[]',
    surgical_history JSONB DEFAULT '[]',
    blood_type      VARCHAR(10),
    height_cm       DECIMAL(5,1),
    weight_kg       DECIMAL(5,1),
    bmi             DECIMAL(4,1)
);
```


#### `vital_signs` — Individual vital measurements

```sql
CREATE TABLE vital_signs (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id               VARCHAR(50) REFERENCES users(id),
    blood_pressure_systolic  INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate               INTEGER,
    temperature              DECIMAL(4,1),
    respiratory_rate         INTEGER,
    oxygen_saturation        INTEGER,
    blood_glucose            INTEGER,
    weight                   DECIMAL(5,1),
    height                   DECIMAL(5,1),
    measured_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source                   VARCHAR(20) DEFAULT 'patient_input'
);
```


#### `living_wills` — Advance directives

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Will ID |
| patient_id | VARCHAR(50) FK→users | Patient |
| statement | TEXT | Will statement |
| treatments | JSONB | Treatment preferences |
| representatives | JSONB | Healthcare proxy |
| signature | JSONB | Digital signature data |
| pdpa_consent | JSONB | Consent settings |
| is_shared_with_doctors | BOOLEAN | Doctor visibility |
| version | INTEGER | Version number |
| audit_log | JSONB DEFAULT '[]' | Access trail |


#### `living_will_versions` — Version history

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Version ID |
| patient_id | VARCHAR(50) FK→users | Patient |
| version | INTEGER NOT NULL | Version number |
| data | JSONB NOT NULL | Full snapshot |
| note | TEXT | Version note |


#### `patient_consents` — PDPA consent management

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Consent ID |
| patient_id | VARCHAR(50) FK→users | Patient |
| consent_type | VARCHAR(100) | Type of consent |
| granted | BOOLEAN | Is granted |
| doctor_id | VARCHAR(50) | Specific doctor |
| data_types | JSONB DEFAULT '["all"]' | Data scopes |
| status | VARCHAR(20) | pending/active/revoked |


#### `push_subscriptions` — Push notification preferences

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Subscription ID |
| user_id | VARCHAR(50) FK→users | User |
| appointment_reminders | BOOLEAN | Apt reminders |
| medication_reminders | BOOLEAN | Med reminders |
| quiet_hours_start | TIME | Quiet start |
| quiet_hours_end | TIME | Quiet end |

---


### 4.3 Doctor Management (5 Tables)


#### `doctor_profiles` — Extended doctor information

```sql
CREATE TABLE doctor_profiles (
    doctor_id         VARCHAR(50) PK REFERENCES users(id),
    specialty         VARCHAR(100),
    sub_specialties   JSONB,
    qualifications    TEXT,
    experience_years  INTEGER,
    hospital_name     VARCHAR(255),
    department        VARCHAR(100),
    languages         JSONB DEFAULT '["Thai","English"]',
    rating            DECIMAL(2,1),
    total_reviews     INTEGER DEFAULT 0,
    consultation_fee  DECIMAL(10,2),
    is_available      BOOLEAN DEFAULT true,
    schedule          JSONB
);
```


#### `doctors` — Patient-facing doctor listing

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Doctor listing ID |
| name | VARCHAR(255) | English name |
| name_thai | VARCHAR(255) | Thai name |
| specialty | VARCHAR(100) | Specialty |
| specialty_thai | VARCHAR(100) | Thai specialty |
| hospital | VARCHAR(255) | Hospital |
| rating | DECIMAL(2,1) | Average rating |
| is_available | BOOLEAN | Currently available |


#### `doctor_schedules` — Availability slots

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Schedule ID |
| doctor_id | VARCHAR(50) FK→users | Doctor |
| day_of_week | INTEGER (0-6) | Day of week |
| start_time | TIME | Slot start |
| end_time | TIME | Slot end |
| slot_duration_minutes | INTEGER DEFAULT 30 | Duration |
| is_available | BOOLEAN | Is active |


#### `doctor_reviews` — Patient ratings

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Review ID |
| doctor_id | VARCHAR(50) FK→users | Doctor |
| patient_id | VARCHAR(50) FK→users | Patient |
| appointment_id | VARCHAR(50) | Related appointment |
| rating | INTEGER (1-5) | Star rating |
| comment | TEXT | Review text |


#### `consultants` — External specialist directory

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Consultant ID |
| name | VARCHAR(255) NOT NULL | Name |
| specialty | VARCHAR(100) NOT NULL | Specialty |
| email | VARCHAR(255) | Contact email |
| phone | VARCHAR(50) | Contact phone |
| hospital | VARCHAR(255) | Affiliated hospital |
| languages | JSONB | Languages spoken |
| is_available | BOOLEAN | Currently available |
| rating | DECIMAL(2,1) | Average rating |
| reviews | JSONB DEFAULT '[]' | Inline reviews |
| admin_notes | TEXT | Internal notes |

---


### 4.4 Appointments & Meetings (4 Tables)


#### `appointments` — Consultation scheduling

```sql
CREATE TABLE appointments (
    id               VARCHAR(50) PRIMARY KEY,
    patient_id       VARCHAR(50) REFERENCES users(id),
    doctor_id        VARCHAR(50) REFERENCES users(id),
    requested_date   DATE,
    requested_time   TIME,
    confirmed_date   DATE,
    confirmed_time   TIME,
    appointment_type VARCHAR(50) DEFAULT 'Telehealth',
    status           VARCHAR(50) DEFAULT 'pending',
    urgency_level    VARCHAR(20) DEFAULT 'normal',
    symptoms         JSONB DEFAULT '[]',
    symptom_description TEXT,
    ai_triage        JSONB,         -- AI urgency/specialty analysis
    meet_link        TEXT,
    jitsi_room_name  VARCHAR(255),
    invitees         JSONB DEFAULT '[]',
    cancellation_reason TEXT
);
```


## Status State Machine

```text
pending → in_pool → ai_matched → doctor_claimed → confirmed → in_progress → completed
   │         │                                                                    │
   └→ declined                                                              → cancelled
```


#### `meeting_records` — Video consultation sessions

```sql
CREATE TABLE meeting_records (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id           VARCHAR(50) REFERENCES appointments(id),
    doctor_id                VARCHAR(50) REFERENCES users(id),
    patient_id               VARCHAR(50) REFERENCES users(id),
    room_name                VARCHAR(255),
    jitsi_domain             VARCHAR(255),
    status                   VARCHAR(20) CHECK (status IN ('scheduled','waiting','active','in_progress','completed','cancelled')),
    meeting_config           JSONB,
    -- AI-generated content
    transcript               TEXT,
    ai_summary               TEXT,
    ai_recommendations       TEXT,
    section_summaries        JSONB,
    -- Doctor validation
    doctor_validation_status VARCHAR(30) DEFAULT 'pending_review',
    ready_for_patient        BOOLEAN DEFAULT FALSE,
    patient_instructions     TEXT,
    -- Recording (BYTEA stored in PostgreSQL)
    recording_data           BYTEA,
    recording_filename       TEXT,
    recording_mimetype       TEXT DEFAULT 'audio/webm',
    recording_size_bytes     INTEGER,
    -- Timing
    duration_minutes         INTEGER,
    started_at               TIMESTAMPTZ,
    ended_at                 TIMESTAMPTZ
);
```


#### `meeting_transcripts` — Speech-to-text segments

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | UUID PK | Segment ID |
| meeting_record_id | UUID FK→meeting_records | Meeting reference |
| speaker_id | VARCHAR(50) FK→users | Who spoke |
| speaker_role | VARCHAR(20) | doctor/patient/guest |
| content | TEXT NOT NULL | Transcribed text |
| language | VARCHAR(10) DEFAULT 'th' | Language |
| confidence | DECIMAL(3,2) | STT confidence |
| start_time_seconds | INTEGER | Segment start |
| is_final | BOOLEAN DEFAULT true | Finalized |


#### `ai_chat_history` — AI chat conversations

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Message ID |
| user_id | VARCHAR(50) FK→users | User |
| session_id | VARCHAR(50) | Chat session |
| role | VARCHAR(20) | user/assistant |
| content | TEXT | Message content |
| context | JSONB | Additional context |
| embedding | vector(768) | Content embedding |

---


### 4.5 Clinical Data (5 Tables)


#### `emr` — Electronic Medical Records (SOAP)

```sql
CREATE TABLE emr (
    id                     VARCHAR(50) PRIMARY KEY,
    appointment_id         VARCHAR(50) REFERENCES appointments(id),
    patient_id             VARCHAR(50) REFERENCES users(id),
    doctor_id              VARCHAR(50) REFERENCES users(id),
    subjective             JSONB,    -- Patient complaints
    objective              JSONB,    -- Physical exam / vitals
    assessment             JSONB,    -- Diagnosis
    plan                   JSONB,    -- Treatment plan
    ai_summary             TEXT,
    ai_summary_approved    BOOLEAN DEFAULT false,
    patient_instructions   TEXT,
    patient_instructions_thai TEXT,
    doctor_signature       TEXT,
    signed_at              TIMESTAMPTZ,
    status                 VARCHAR(20) DEFAULT 'draft'  -- draft / signed
);
```


#### `prescriptions` — E-Prescribing

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Prescription ID |
| emr_id | VARCHAR(50) FK→emr | Linked EMR |
| appointment_id | VARCHAR(50) FK→appointments | Appointment |
| patient_id | VARCHAR(50) FK→users | Patient |
| doctor_id | VARCHAR(50) FK→users | Prescribing doctor |
| medications | JSONB | Medication list with dosing |
| pharmacy_instructions | TEXT | Pharmacist instructions |
| cds_warnings | JSONB | Drug interaction warnings |
| status | VARCHAR(20) | draft/signed/dispensed |


#### `lab_orders` — Laboratory test orders

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Order ID |
| emr_id | VARCHAR(50) FK→emr | Linked EMR |
| appointment_id | VARCHAR(50) FK→appointments | Appointment |
| patient_id | VARCHAR(50) FK→users | Patient |
| doctor_id | VARCHAR(50) FK→users | Ordering doctor |
| tests | JSONB | Ordered tests list |
| priority | VARCHAR(20) | normal/urgent/stat |
| results | JSONB | Test results |
| ai_analysis | TEXT | AI interpretation |
| status | VARCHAR(20) | ordered/in_progress/completed |


#### `transcriptions_embeddings` — Vectorized transcript chunks

| Column | Type | Description |
| ------ | ---- | ----------- |
| meeting_record_id | UUID FK→meeting_records | Meeting |
| chunk_text | TEXT | Text chunk |
| speaker_role | VARCHAR(20) | Speaker |
| start_time_seconds | INTEGER | Start time |
| end_time_seconds | INTEGER | End time |
| embedding | vector(768) | Chunk embedding |
| metadata | JSONB | Extra metadata |


#### `ai_chat_memory` — Long-term AI memory

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Memory ID |
| user_id | VARCHAR(50) FK→users | User |
| memory_type | VARCHAR(50) | Type categorization |
| title | VARCHAR(255) | Memory title |
| content | TEXT | Memory content |
| embedding | vector(768) | Content vector |
| relevance_score | DECIMAL(3,2) | Relevance weight |
| is_active | BOOLEAN | Active flag |

---


### 4.6 Content & Knowledge (6 Tables)


#### `medical_content` — Patient education articles

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Content ID |
| title_thai | VARCHAR(255) | Thai title (required) |
| title_english | VARCHAR(255) | English title |
| content_thai | TEXT | Thai body (required) |
| content_english | TEXT | English body |
| category | VARCHAR(50) | Content category |
| tags | JSONB | Searchable tags |
| author_id | VARCHAR(50) FK→users | Author (doctor) |
| status | VARCHAR(20) | draft/pending/published |
| view_count | INTEGER DEFAULT 0 | Read count |


#### `clinical_resources` — Doctor reference materials

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Resource ID |
| title_thai | VARCHAR(255) | Thai title |
| title_english | VARCHAR(255) | English title |
| content_thai | TEXT | Thai body |
| content_english | TEXT | English body |
| category | VARCHAR(50) | guideline/protocol/research |
| specialty | VARCHAR(100) | Target specialty |
| guideline_year | INTEGER | Year of guideline |
| status | VARCHAR(20) | pending/approved |
| author_id | VARCHAR(50) FK→users | Author |
| approved_by | VARCHAR(50) FK→users | Approver (admin) |


#### `icd10_codes` — Diagnosis codes

| Column | Type | Description |
| ------ | ---- | ----------- |
| code | VARCHAR(10) PK | ICD-10 code |
| description_english | TEXT | English description |
| description_thai | TEXT | Thai description |
| category | VARCHAR(100) | Code category |
| chapter | INTEGER | ICD-10 chapter |


#### `drugs` — Drug reference database

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Drug ID |
| generic_name | VARCHAR(255) | Generic name |
| brand_names | JSONB | Brand name list |
| drug_class | VARCHAR(100) | Drug class |
| dosage_forms | JSONB | Available forms |
| indications | JSONB | Approved uses |
| contraindications | JSONB | Contraindications |
| interactions | JSONB | Drug interactions |
| pregnancy_category | VARCHAR(5) | Pregnancy risk |
| renal_adjustment | JSONB | Renal dosing |


#### `knowledge_base` — RAG knowledge base

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Entry ID |
| title | VARCHAR(255) | Entry title |
| content | TEXT | Full content |
| source | VARCHAR(255) | Data source |
| category | VARCHAR(100) | Category |
| language | VARCHAR(10) | th/en |
| embedding | vector(768) | Content vector |
| is_active | BOOLEAN | Active flag |


#### `ai_document_analysis` — AI document analysis results

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Analysis ID |
| patient_id | VARCHAR(50) FK→users | Patient |
| doctor_id | VARCHAR(50) FK→users | Requesting doctor |
| document_type | VARCHAR(50) | PDF/lab/imaging |
| filename | VARCHAR(255) | Original filename |
| summary | TEXT | AI-generated summary |
| key_findings | JSONB | Extracted findings |
| abnormal_values | JSONB | Flagged values |
| validation_status | VARCHAR(20) | Validation state |

---


### 4.7 AI & Decision Support (3 Tables)


#### `cds_logs` — Clinical Decision Support audit

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Log ID |
| patient_id | VARCHAR(50) | Patient |
| doctor_id | VARCHAR(50) | Doctor |
| appointment_id | VARCHAR(50) | Appointment |
| recommendation_type | VARCHAR(50) | Alert type |
| severity | VARCHAR(20) | info/warning/critical |
| title | VARCHAR(255) | Alert title |
| description | TEXT | Alert details |
| guideline_source | VARCHAR(255) | Evidence source |
| doctor_decision | VARCHAR(20) | accepted/rejected/modified |


#### `ai_validations` — Man-in-the-Loop log

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Validation ID |
| type | VARCHAR(50) | emr/instruction/summary |
| patient_id | VARCHAR(50) | Patient |
| doctor_id | VARCHAR(50) | Validating doctor |
| decision | VARCHAR(20) | approved/rejected |
| content_snapshot | JSONB | Original AI content |
| validated_at | TIMESTAMPTZ | Validation time |


#### `notifications` — User notifications

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | UUID PK | Notification ID |
| user_id | VARCHAR(50) FK→users | Target user |
| type | VARCHAR(50) | Notification type |
| title | VARCHAR(255) | English title |
| title_thai | VARCHAR(255) | Thai title |
| message | TEXT | English message |
| message_thai | TEXT | Thai message |
| data | JSONB | Action metadata |
| read_at | TIMESTAMPTZ | Read timestamp |

---


### 4.8 Audit (1 Table)


#### `audit_logs` — Compliance audit trail

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | VARCHAR(50) PK | Log ID |
| user_id | VARCHAR(50) | Acting user |
| patient_id | VARCHAR(50) | Affected patient |
| action | VARCHAR(50) | Action performed |
| entity_type | VARCHAR(50) | Table/entity affected |
| entity_id | VARCHAR(50) | Entity ID |
| details | JSONB | Action details |
| old_value | JSONB | Previous state |
| new_value | JSONB | New state |
| ip_address | VARCHAR(45) | Client IP |
| user_agent | TEXT | Browser info |
| performed_by | VARCHAR(50) | Actor reference |

---


### 4.9 Mobile, Sync & Preferences (5 Tables)

> Created by `migrations/v2.0.0-phase2-tables.sql`. See [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) §9.

| Table | Purpose |
| ----- | ------- |
| `notification_preferences` | Per-user channel/category notification toggles |
| `user_settings` | Theme, language, biometric, sync preferences |
| `sync_queue` | Offline sync queue with conflict resolution |
| `user_api_connections` | Encrypted third-party API tokens (Google Fit, LINE, etc.) |
| `api_connection_audit` | Audit trail for API connection changes |

---


### 4.10 Extended Clinical Modules (6 Tables)

> Created by `migrations/v2.1.0-phase2-ai-his.sql`. Schema deployed; UI partial.

| Table | Purpose |
| ----- | ------- |
| `ctm_assessments` | Thai Traditional Medicine — dhatu, symptoms, herbal prescription |
| `geriatric_screenings` | Elderly screening scores and risk level |
| `sos_alerts` | Patient emergency SOS with geolocation |
| `follow_ups` | Post-visit follow-up scheduling and reminders |
| `nursing_tasks` | Nursing dashboard task workflow |
| `predictive_analytics` | AI risk scoring per patient |
| `emr_records` | Simplified visit record (parallel to full SOAP `emr`) |

---


### 4.11 Meeting Server Runtime Tables (3 Tables)

> Created at Meeting Server startup if missing (`Izara-jitsi-server/backend/index.js`).

| Table | Purpose |
| ----- | ------- |
| `meeting_chats` | In-meeting chat messages (XSS-sanitized) |
| `meeting_invites` | Guest invite tokens with expiry |
| `recording_share_tokens` | Time-limited recording share links |

---


### 4.12 Additional Tables (Runtime / Migration)

| Table | Source | Purpose |
| ----- | ------ | ------- |
| `imaging_orders` | Doctor portal runtime | Imaging orders and result documents |
| `patient_instructions` | db-tool / post-meeting | Thai patient instruction sheets |
| `health_timeline` | db-tool legacy | Chronological patient event log |
| `access_audit` | PDPA migration | Doctor access consent audit |
| `appointment_ai_suggestions` | v2.2.0 migration | AI specialty matching for pool |
| `admin_actions` | v2.2.0 migration | Admin action log |

---


## 5. Entity-Relationship Diagram

```text
┌──────────┐     ┌──────────────┐      ┌──────────────┐
│  users   │────<│   sessions   │      │password_resets│
│  (PK:id) │     └──────────────┘      └──────────────┘
│          │
│ role:    │──────────────────────────────────────────────────┐
│ patient  │     ┌──────────────┐                             │
│ doctor   │────<│patient_profiles│                           │
│ admin    │     └──────────────┘                             │
└────┬─────┘                                                  │
     │                                                        │
     ├────<┌──────┐────<┌────────────┐                       │
     │     │ phr  │     │vital_signs │                       │
     │     └──────┘     └────────────┘                       │
     │                                                        │
     ├────<┌──────────────┐                                  │
     │     │ living_wills │────<┌───────────────────┐        │
     │     └──────────────┘     │living_will_versions│        │
     │                          └───────────────────┘        │
     │                                                        │
     ├────<┌──────────────────┐                              │
     │     │patient_consents  │                              │
     │     └──────────────────┘                              │
     │                                                        │
     ├────<┌────────────────┐     ┌──────────────────────┐   │
     │     │doctor_profiles │     │   doctor_schedules   │   │
     │     └────────────────┘     └──────────────────────┘   │
     │                                                        │
     ├────<┌──────────────┐                                  │
     │     │appointments  │───────────────────────────┐      │
     │     └──────┬───────┘                           │      │
     │            │                                    │      │
     │            ├────<┌────────────────┐             │      │
     │            │     │meeting_records │             │      │
     │            │     └───────┬────────┘             │      │
     │            │             │                      │      │
     │            │             └────<┌──────────────────────┐│
     │            │                   │meeting_transcripts   ││
     │            │                   └──────────────────────┘│
     │            │                                           │
     │            ├────<┌─────┐────<┌───────────────┐        │
     │            │     │ emr │     │ prescriptions │        │
     │            │     └─────┘     └───────────────┘        │
     │            │        │                                  │
     │            │        └────<┌────────────┐              │
     │            │              │ lab_orders │              │
     │            │              └────────────┘              │
     │            │                                           │
     │            └────<┌──────────────┐                     │
     │                  │notifications │<────────────────────┘
     │                  └──────────────┘
     │
     └────<┌──────────────┐     ┌─────────────────────┐
           │ audit_logs   │     │medical_content      │
           └──────────────┘     │clinical_resources   │
                                │knowledge_base       │
                                └─────────────────────┘
```

---


## 6. Data Flow Patterns


### 6.1 Authentication Flow

```text
User → Portal → POST /api/auth/login
                        │
                        ▼
                 ┌──────────────┐
                 │ users table  │ ← SELECT WHERE email=$1
                 └──────┬───────┘   AND password_hash = crypt($2)
                        │
                        ▼
                 ┌──────────────┐
                 │sessions table│ ← INSERT new session + JWT
                 └──────┬───────┘
                        │
                        ▼
                 JWT Token → Client
```


### 6.2 Appointment → Meeting → EMR Flow

```text
Patient Books        Admin/Doctor         Doctor Hosts        AI Processes
─────────────       ──────────────       ────────────       ────────────
     │                    │                    │                  │
  INSERT INTO        UPDATE SET            INSERT INTO        Gemini API
  appointments ──→  status='confirmed' ──→ meeting_records       │
     │                    │                    │                  │
     │               NOTIFY via           Transcript          AI Summary
     │               pg_notify            segments ──→      ──→ EMR Draft
     │                    │               meeting_             │
     │                    │               transcripts          │
     │                    │                    │                │
     │                    │                Doctor Validates     │
     │                    │                ai_validations  ←───┘
     │                    │                    │
     │                    │                INSERT emr
     │                    │                INSERT prescriptions
     │                    │                INSERT lab_orders
     │                    │                    │
     └────── Patient sees notification + instructions ────────────┘
```


### 6.3 Real-Time Sync via LISTEN/NOTIFY

```text
Table UPDATE/INSERT
        │
        ▼
┌──────────────────┐
│ PostgreSQL       │
│ NOTIFY trigger   │──→ pg_notify('channel', payload)
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ pgNotifyListener │  (Node.js backend)
│ via pg module    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Socket.IO emit   │──→ Connected clients (real-time UI update)
└──────────────────┘
```

---


## 7. LISTEN/NOTIFY Real-Time Triggers

| Trigger Name | Table | Events | Socket.IO Event |
| ------------ | ----- | ------ | --------------- |
| notify_appointment_change | appointments | INSERT, UPDATE, DELETE | `appointment:updated` |
| notify_emr_change | emr | INSERT, UPDATE | `emr:updated` |
| notify_prescription_change | prescriptions | INSERT, UPDATE | `prescription:updated` |
| notify_lab_order_change | lab_orders | INSERT, UPDATE | `lab-order:updated` |
| notify_phr_change | phr | UPDATE | `phr:updated` |
| notify_schedule_change | doctor_schedules | INSERT, UPDATE, DELETE | `schedule:updated` |
| notify_notification_insert | notifications | INSERT | `notification:new` |
| notify_meeting_change | meeting_records | INSERT, UPDATE | `meeting:updated` |


### Trigger Example

```sql
CREATE OR REPLACE FUNCTION notify_appointment_change() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('appointment_changes',
        json_build_object(
            'operation', TG_OP,
            'id', COALESCE(NEW.id, OLD.id),
            'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
            'doctor_id', COALESCE(NEW.doctor_id, OLD.doctor_id),
            'status', NEW.status
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_change
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION notify_appointment_change();
```

---


## 8. Indexes & Performance


### Key Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Patient data
CREATE INDEX idx_phr_patient ON phr(patient_id);
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_measured ON vital_signs(measured_at);

-- Appointments
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(COALESCE(confirmed_date, requested_date));

-- Clinical
CREATE INDEX idx_emr_appointment ON emr(appointment_id);
CREATE INDEX idx_emr_patient ON emr(patient_id);
CREATE INDEX idx_meeting_records_appointment ON meeting_records(appointment_id);

-- AI Vector search (HNSW for fast similarity)
CREATE INDEX idx_knowledge_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chat_embedding ON ai_chat_history USING hnsw (embedding vector_cosine_ops);
```

---


## 9. Migration Scripts

| Order | Script | Version | Purpose |
| ----- | ------ | ------- | ------- |
| 1 | `izara-database.sql` | v5.1.0 | Master schema (37+ tables) |
| 2 | `migrations/v1.4.3-fix-categories.sql` | v1.4.3 | Category format fixes |
| 3 | `migrations/v1.6.0-fix-content-approval.sql` | v1.6.0 | Content approval fixes |
| 4 | `migrations/v2.0.0-phase2-tables.sql` | v2.0.0 | Phase 2 tables |
| 5 | `migrations/v2.1.0-phase2-ai-his.sql` | v2.1.0 | AI & HIS tables |
| 6 | `v2.2.0-notify-triggers.sql` | v2.2.0 | LISTEN/NOTIFY triggers |
| 7 | `seed-dev-data.sql` | — | Test data (7 seed users) |


### DB Tool Commands

```powershell


# All-in-one: fix schema + seed + verify
node scripts/database/db-tool.cjs --all



# Individual operations
node scripts/database/db-tool.cjs --fix
node scripts/database/db-tool.cjs --seed
node scripts/database/db-tool.cjs --verify



# Migrations
node scripts/database/db-tool.cjs --migrate-phase2
node scripts/database/db-tool.cjs --migrate-ai



# Target environments
node scripts/database/db-tool.cjs --target cloud --all
node scripts/database/db-tool.cjs --target dev-cloud --verify
```

---


## 10. Access Control Matrix

| Resource | Patient | Doctor | Admin |
| -------- | ------- | ------ | ----- |
| Own PHR | Read/Write | Read (assigned) | Read (all) |
| Other Patient PHR | ❌ | Read (assigned) | Read (all) |
| Appointments (own) | Read/Write | Read/Write | Read/Write |
| Appointments (all) | ❌ | Read (queue) | Read/Write |
| EMR | View summary | Full CRUD | Full CRUD |
| Prescriptions | View | Create/Sign | Create/Sign |
| Lab Orders | View results | Create/View | Create/View |
| Medical Content | Read | Create/Edit own | Full CRUD + Approve |
| Clinical Resources | ❌ | Read/Create | Full CRUD + Approve |
| AI Chat | Basic | Full | Full |
| AI Validations | ❌ | Write (own) | Read (audit) |
| User Management | ❌ | ❌ | Full CRUD |
| Audit Logs | ❌ | ❌ | Read |

---


## 11. Backup & Recovery


### Docker Volume Backup

```powershell


# Backup PostgreSQL data
docker exec izara-postgres pg_dump -U postgres izara_phase1 > backup_$(Get-Date -Format yyyyMMdd).sql



# Restore
Get-Content backup_20260401.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```


### Production Export/Import

```powershell


# Export from production
node scripts/database/db-tool.cjs --export



# Import to local
node scripts/database/db-tool.cjs --import-local



# Import to dev cloud
node scripts/database/db-tool.cjs --import-dev
```

---

*Document generated from `scripts/database/izara-database.sql` v5.1.0 and `Processes/Data_Sync_Documentation.md` v1.6.1*
