# 📄 Izara Telemedicine — Comprehensive Workflows, Processes & Architecture

**Version:** 1.6.0
**Last Updated:** March 31, 2026
**Focus:** Web Application Only (Patient Portal + Doctor Portal + Meeting Server)
**Status:** ✅ Phase 1 Complete — All Workflows Verified + Full DB Schema

---

## 📋 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Deployment Architecture](#2-deployment-architecture)
3. [Database Architecture (PostgreSQL VM)](#3-database-architecture-postgresql-vm)
4. [Core Workflows](#4-core-workflows)
5. [Patient Portal Pages (15 Pages)](#5-patient-portal-pages-15-pages)
6. [Doctor Portal Pages (21 Pages)](#6-doctor-portal-pages-21-pages)
7. [Meeting Server](#7-meeting-server)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Security & Compliance](#9-security--compliance)
10. [Cross-Reference Matrix](#10-cross-reference-matrix)
11. [Test Credentials & Verification](#11-test-credentials--verification)
12. [Document Index](#12-document-index)

> **📖 For the complete specification (features, database, API endpoints), see [specs/SPEC_KIT.md](../specs/SPEC_KIT.md)**

---

## 1. System Architecture Overview

### 1.1 Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          IZARA TELEMEDICINE PLATFORM                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐                 │
│   │  PATIENT      │    │  DOCTOR       │    │  MEETING          │                │
│   │  PORTAL       │    │  PORTAL       │    │  SERVER           │                │
│   │  (Cloud Run)  │    │  (Cloud Run)  │    │  (Cloud Run)      │                │
│   │  Port: 3005   │    │  Port: 3010   │    │  Port: 3020       │                │
│   │  1CPU / 1GB   │    │  1CPU / 1GB   │    │  1CPU / 2GB       │                │
│   │               │    │               │    │                    │                │
│   │  React 18     │    │  React 18     │    │  Express +         │                │
│   │  + Express    │    │  + Express    │    │  Socket.IO         │                │
│   │  + Socket.IO  │    │  + Nginx      │    │  + Gemini AI       │                │
│   └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘                 │
│          │                    │                      │                           │
│          └────────────────────┼──────────────────────┘                           │
│                               │                                                 │
│                    ┌──────────▼──────────┐                                      │
│                    │  POSTGRESQL 18       │                                      │
│                    │  + pgvector          │                                      │
│                    │  GCE VM              │                                      │
│                    │  35.240.157.230:5432 │                                      │
│                    │  Database:           │                                      │
│                    │    izara_phase1      │                                      │
│                    │  40+ Tables          │                                      │
│                    │  8 NOTIFY Triggers   │                                      │
│                    └─────────────────────┘                                      │
│                                                                                 │
│   EXTERNAL SERVICES (ALL FREE TIER):                                            │
│   ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐                 │
│   │ Jitsi Meet    │  │ Gemini 2.5 Flash │  │ Web Speech API   │                 │
│   │ (meet.jit.si) │  │ Lite (AI)        │  │ (Browser STT)    │                 │
│   │ FREE Video    │  │ FREE AI Model    │  │ FREE Transcript  │                 │
│   └──────────────┘  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
| ------- | -----------| --------- |
| **Frontend** | React 18 + TypeScript | SPA for both portals |
| **Build** | Vite | Fast HMR, production bundling |
| **Styling** | Tailwind CSS | Dark/light mode, responsive |
| **Backend** | Express.js | REST API + SSR |
| **Real-Time** | Socket.IO | WebSocket events, live transcript |
| **Database** | PostgreSQL 18 + pgvector | Primary data store + AI embeddings |
| **AI Model** | Google Gemini 2.5 Flash Lite | SOAP summary, chat, document analysis |
| **Video** | Jitsi Meet (meet.jit.si) | FREE video conferencing |
| **Transcription** | Web Speech API (browser) | FREE real-time speech-to-text |
| **Language** | Thai (primary) / English | Bilingual UI throughout |
| **Compliance** | PDPA, HIPAA | Data privacy, audit trails |

### 1.3 Service Summary

| Service | Container | Local Port | Cloud Port | Tech | Role |
| --------- | -----------| ----------- | -----------| ------ | ------ |
| Patient Portal | izara-patient-portal | 3005 | 3005 | React + Express (TS) | Patient-facing UI + API |
| Doctor Portal | izara-doctor-portal | 3010 | 8080 | React + Express + Nginx (CJS) | Doctor/Admin UI + API |
| Meeting Server | izara-meeting-server | 3020 | 3020 | Express + Socket.IO (ESM) | Jitsi orchestration, AI pipeline |
| PostgreSQL | izara-postgres | 5433→5432 | 5432 | PostgreSQL 18 + pgvector | All data storage |
| pgAdmin | izara-pgadmin | 5050 | — | pgAdmin 4 | DB administration (local only) |

---

## 2. Deployment Architecture

### 2.1 Local Development (Docker Compose v1.5.6)

All 5 services run via `docker-compose up --build`:

```text
┌─────────────────────────────────────────────────────────────────┐
│                   DOCKER COMPOSE (izara-network)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐   postgres:5432 (internal)             │
│  │ PostgreSQL 18        │◄─── All portals connect here          │
│  │ pgvector/pgvector:pg18                                       │
│  │ Port: 5433 (ext)    │   Init Scripts (mounted volumes):      │
│  │ DB: izara_phase1    │   01-init.sql (v5.1.0 main schema)    │
│  │ User: postgres      │   02-phase2.sql (mobile/push tables)  │
│  │ Healthcheck: 10s    │   03-phase2-ai-his.sql (AI/HIS)       │
│  └─────────────────────┘   04-notify-triggers.sql (8 triggers) │
│                             05-seed-dev.sql (test data)          │
│                                                                  │
│  ┌─────────────────────┐   ┌─────────────────────┐             │
│  │ Patient Portal       │   │ Doctor Portal        │             │
│  │ Port: 3005           │   │ Port: 3010→8080      │             │
│  │ depends_on: postgres │   │ depends_on: postgres  │             │
│  │ Healthcheck: /health │   │ Healthcheck: /health  │             │
│  └─────────────────────┘   └─────────────────────┘             │
│                                                                  │
│  ┌─────────────────────┐   ┌─────────────────────┐             │
│  │ Meeting Server       │   │ pgAdmin              │             │
│  │ Port: 3020           │   │ Port: 5050            │             │
│  │ depends_on: postgres │   │ depends_on: postgres  │             │
│  │ Volume: recordings   │   │ admin@izara.com       │             │
│  └─────────────────────┘   └─────────────────────┘             │
│                                                                  │
│  Volumes: postgres_data, pgadmin_data, meeting_recordings        │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Configuration

| Variable | Value | Purpose |
| ---------- | -------| --------- |
| `USE_POSTGRESQL` | `true` | All portals use PostgreSQL |
| `USE_GCS` | `false` | GCS disabled for live data |
| `DEMO_MODE` | `false` | Real PostgreSQL (no mocks) |
| `JWT_SECRET` | Shared across all portals | Session authentication |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | AI model selection |
| `JITSI_DOMAIN` | `meet.jit.si` | Free Jitsi video |
| `RATE_LIMIT_MAX` | `999999` | High limit for dev/testing |

### 2.2 Cloud Production (Google Cloud Platform)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    GCP — asia-southeast1 (Singapore)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CLOUD RUN (Serverless Containers)                                  │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │                                                              │    │
│   │  izara-patient-portal-dev-testing    1CPU / 1GB / max 2     │    │
│   │  izara-doctor-portal-dev-testing     1CPU / 1GB / max 2     │    │
│   │  izara-meeting-server-dev-testing    1CPU / 2GB / max 2     │    │
│   │                                                              │    │
│   │  • gen2 execution environment                                │    │
│   │  • cpu-boost enabled                                         │    │
│   │  • allow-unauthenticated (public)                            │    │
│   │  • timeout: 300s (portals), 600s (meeting server)            │    │
│   │  • min-instances: 0 (scale to zero)                          │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   GCE VM (Persistent Database)                                       │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  PostgreSQL 18 + pgvector                                    │    │
│   │  IP: 35.240.157.230 : 5432                                   │    │
│   │  Database: izara_phase1                                      │    │
│   │  User: postgres                                              │    │
│   │  NOT Cloud SQL — direct GCE VM for cost savings              │    │
│   │  NOT embedded PG — external persistent storage               │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   ARTIFACT REGISTRY                                                  │
│   asia-southeast1-docker.pkg.dev/{PROJECT}/isara-anywhere-portals    │
│                                                                      │
│   SECRET MANAGER                                                     │
│   • gemini-api-key       • db-password                               │
│   • jwt-secret           • database-url                              │
│   • google-maps-api-key                                              │
│                                                                      │
│   CLOUD BUILD                                                        │
│   • Machine: E2_HIGHCPU_8           • Timeout: 1200s (portals)       │
│   • Logging: CLOUD_LOGGING_ONLY     • Timeout: 600s (meeting)        │
└─────────────────────────────────────────────────────────────────────┘
```

## Cloud Run Service URLs

| Service | URL |
| --------- | ----- |
| Patient Portal | `<https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app`> |
| Doctor Portal | `<https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app`> |
| Meeting Server | `<https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app`> |

### 2.3 PostgreSQL Database VM (GCE)

The PostgreSQL database runs on a dedicated Google Compute Engine VM, shared by all three Cloud Run services. This is the **single source of truth** for the entire platform.

| Property | Value |
| ---------- | ------- |
| **VM Type** | Google Compute Engine (GCE) |
| **IP Address** | `35.240.157.230` |
| **Port** | `5432` |
| **PostgreSQL Version** | 18 |
| **Database Name** | `izara_phase1` |
| **Extensions** | pgvector, uuid-ossp, pgcrypto |
| **Encoding** | UTF-8 |
| **Why NOT Cloud SQL** | Cost savings — GCE VM with self-managed PostgreSQL is significantly cheaper for dev/testing |
| **Why NOT Embedded PG** | Persistence — Cloud Run containers are ephemeral; data would be lost on restart |
| **Backup** | VM disk snapshots (automated) |

## Why a Dedicated Database VM

1. **Shared State** — All three Cloud Run services (Patient Portal, Doctor Portal, Meeting Server) read/write to the same `izara_phase1` database, ensuring data consistency across portals
2. **Persistence** — Cloud Run instances scale to zero and restart frequently. An external database ensures no data loss
3. **Real-Time Sync** — PostgreSQL `NOTIFY/LISTEN` triggers push change events to all connected services via `pgNotifyListener`, enabling cross-portal real-time updates without polling
4. **AI Embeddings** — The `pgvector` extension stores vector embeddings for RAG-based clinical search (knowledge base, transcript similarity)
5. **Cost Efficiency** — A single GCE VM running PostgreSQL costs less than Cloud SQL while providing full control over extensions and configuration

### 2.4 Docker Build Architecture

Each portal uses a **unified Docker image** containing both frontend and backend:

| Portal | Dockerfile | Stage 1 (Build) | Stage 2 (Production) |
| -------- | -----------| ----------------- | --------------------- |
| Patient Portal | `Dockerfile.unified` | Node 22 Alpine → Vite build → `/app/dist` | Node 22 Alpine + PostgreSQL16-client → Express serves API + static files on port 3005 |
| Doctor Portal | `Dockerfile.unified` | Node 22 Alpine → Vite build → `/app/dist` | Node 22 Alpine + Nginx + Supervisor + PostgreSQL16 → Nginx serves frontend on 8080, Express serves API |
| Meeting Server | `Dockerfile` | Single stage | Node 22 Alpine → Express + Socket.IO on port 3020, non-root user, recordings volume |

---

## 3. Database Architecture (PostgreSQL VM)

### 3.1 Configuration

```text
PostgreSQL 18 + pgvector
Database: izara_phase1
Extensions: uuid-ossp, pgcrypto, vector
Encoding: UTF-8, Locale: C
Connection Pool: 30 max (production), 20 max (development)
```

### 3.2 Schema Migration Chain

The database is initialized via Docker entrypoint scripts (local) or manual migration (cloud):

```text
01-init.sql ─────────────── izara-database.sql (v5.1.0)
  │                          Core tables: users, sessions, profiles,
  │                          appointments, emr, phr, vital_signs,
  │                          prescriptions, lab_orders, notifications,
  │                          medical_content, clinical_resources, etc.
  │
02-phase2.sql ───────────── v2.0.0-phase2-tables.sql
  │                          Mobile: device_tokens, biometric_credentials,
  │                          refresh_tokens, push_subscriptions, sync_queue,
  │                          user_api_connections, notification_preferences
  │
03-phase2-ai-his.sql ───── v2.1.0-phase2-ai-his.sql
  │                          AI-HIS: ctm_assessments, geriatric_screenings,
  │                          sos_alerts, follow_ups, nursing_tasks,
  │                          predictive_analytics, ai_chat_history
  │
04-notify-triggers.sql ──── v2.2.0-notify-triggers.sql
  │                          8 NOTIFY triggers for real-time cross-service sync
  │
05-seed-dev.sql ─────────── seed-dev-data.sql
                             7 test users, doctor profiles, patient profiles,
                             PHR records, doctor schedules
```

### 3.3 Database Tables — Complete Catalog (40+ Tables)

#### 3.3.1 Core User & Authentication Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `users` | All user accounts (unified patient/doctor/admin) | id, email, password_hash, role, name, name_thai, is_active, is_verified, is_approved, approval_status, admin_privileges (JSONB), login_attempts, locked_until, preferences (JSONB), notification_settings (JSONB) |
| `sessions` | Active login sessions | user_id, token, ip_address, user_agent, expires_at, logged_out_at |
| `password_resets` | Password recovery tokens | user_id (UNIQUE), token, expires_at, used, used_at |
| `patient_profiles` | Patient demographics | patient_id → users, demographics (JSONB), emergency_contact (JSONB), insurance_info (JSONB) |
| `doctor_profiles` | Doctor professional data | doctor_id → users, specialty, sub_specialties (JSONB), qualifications, experience_years, hospital_name, department, languages (JSONB), rating (DECIMAL), consultation_fee, is_available, schedule (JSONB) |
| `doctor_schedules` | Weekly availability | doctor_id → users, day_of_week, start_time, end_time, slot_duration_minutes |

#### 3.3.2 Clinical Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `appointments` | Appointment scheduling & tracking | patient_id, doctor_id, status (requested/confirmed/completed/cancelled), appointment_type, confirmed_date, jitsi_room_name, follow_up, symptoms (JSONB), ai_symptom_analysis (JSONB) |
| `emr` | Electronic Medical Records (SOAP) | patient_id, doctor_id, appointment_id, subjective (JSONB), objective (JSONB), assessment (JSONB), plan (JSONB), diagnosis, ai_summary (TEXT), ai_suggestions (JSONB), requires_validation (BOOL), icd_codes, status (draft/signed), doctor_signature, signed_at |
| `phr` | Personal Health Records | patient_id, vital_signs_history (JSONB), allergies (JSONB), chronic_conditions (JSONB), medications (JSONB), vaccinations (JSONB), family_history (JSONB), surgical_history (JSONB), lifestyle (JSONB), blood_type, height_cm, weight_kg, bmi |
| `vital_signs` | Individual vital measurements | patient_id, blood_pressure_systolic/diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, blood_glucose (with type), weight, height, bmi, measured_at, source |
| `prescriptions` | Medication orders | patient_id, doctor_id, appointment_id, drug_name, dosage, frequency, duration, notes, status |
| `lab_orders` | Lab test orders & results | patient_id, doctor_id, appointment_id, test_type, results (JSONB), status, normal_ranges, flags (high/low/critical) |
| `drugs` | Drug database | name, generic_name, dosage_forms, interactions, contraindications |
| `icd10_codes` | ICD-10 diagnosis codes | code, description, description_thai, category |
| `patient_consents` | PDPA consent records | patient_id, consent_type, granted (BOOL), doctor_id, data_types (JSONB), status (pending/active), granted_at, expires_at, revoked_at |

#### 3.3.3 Living Will Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `living_wills` | Patient living will documents | patient_id, statement, treatments (JSONB), representatives (JSONB), signature (JSONB), pdpa_consent (JSONB), status (active/revoked), is_shared_with_doctors, version, decisions (JSONB), witness_info (JSONB), audit_log (JSONB) |
| `living_will_versions` | Version history | patient_id, version (INT), data (JSONB), note (TEXT) |

#### 3.3.4 Meeting & Transcription Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `meeting_records` | Meeting lifecycle & results | appointment_id, patient_id, doctor_id, status (in_progress/completed/cancelled), started_at, ended_at, transcript (TEXT), ai_summary (TEXT), recording_data (BYTEA), recording_url, doctor_validation_status, validated_at, ready_for_patient, ai_recommendations (JSONB), section_summaries (JSONB) |
| `meeting_transcripts` | Segment-by-segment transcript | meeting_id, speaker_role (doctor/patient/guest), speaker_name, content (TEXT), timestamp, language |
| `meeting_chats` | In-meeting chat messages | meeting_id, sender_id, sender_name, message (XSS-sanitized TEXT), timestamp |
| `meeting_invites` | Guest invitation tokens | meeting_id, invite_token, invitee_email, invitee_type (patient_relative/doctor_consultant/family_member), status, expires_at |
| `ai_validations` | Man-in-the-loop approval records | meeting_id, doctor_id, validation_type, original_content, validated_content, status (pending/approved/rejected), validated_at |
| `transcript_embeddings` | Vector chunks for search | meeting_id, chunk_text, embedding (vector), chunk_index |
| `patient_instructions` | AI-generated post-visit instructions | appointment_id, patient_id, doctor_id, content (TEXT/Thai PDF), status, validated_by |

#### 3.3.5 Content Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `medical_content` | Health education articles for patients | id (MC-xxx), title, title_thai, content (TEXT), category, status (draft/pending/published), author_id, approved_by, tags (JSONB), images (JSONB) |
| `clinical_resources` | Clinical guidelines for doctors | id (CR-xxx), title, title_thai, content, category, resource_type, status (draft/pending/published), author_id, source, references (JSONB) |
| `consultants` | Specialist directory | id (CONS-xxx), name, specialty, hospital, email, phone, is_available, rating, reviews (JSONB), admin_notes |

#### 3.3.6 AI & Knowledge Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `ai_chat_history` | AI chat sessions (doctor + patient) | user_id, session_id, role (user/assistant/system), content (TEXT), context (JSONB) |
| `ai_document_analysis` | AI PDF/document analysis results | document_id, user_id, analysis_type, original_text, ai_analysis (JSONB) |
| `knowledge_base` | RAG-indexed clinical knowledge | id, content, embedding (vector), source, category, metadata (JSONB) |
| `cds_logs` | Clinical Decision Support logs | patient_id, doctor_id, alert_type, alert_content, action_taken |

#### 3.3.7 Phase 2 — AI-HIS Tables (Deployed)

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `fhir_observations` | FHIR-compliant vital signs | patient_id, loinc_code, value, unit, effective_datetime |
| `clinical_impressions` | AI history taking summaries | patient_id, doctor_id, summary_thai, findings (JSONB) |
| `ctm_assessments` | Thai Traditional Medicine | patient_id, doctor_id, dhatu (ธาตุดิน), symptoms (JSONB), diagnosis, herbal_prescription (JSONB) |
| `herbal_prescriptions` | Herbal treatments | patient_id, herb_name, preparation_method (ต้ม/บด/ชง/ทา), dosage |
| `investigation_reports` | Radiology, lab, pathology reports | patient_id, report_type, findings, ai_analysis (JSONB) |
| `referral_records` | Patient referrals | patient_id, from_doctor, to_doctor, reason, pdpa_consent_token |
| `emergency_logs` | SOS alerts | patient_id, alert_type, latitude, longitude, status (active/acknowledged/resolved) |
| `patient_queue` | Real-time queue | patient_id, doctor_id, queue_number, ai_triage_score, status |
| `nursing_tasks` | Nursing workflow | nurse_id, patient_id, task_type, priority (1-5), status, due_at |
| `predictive_analytics` | AI risk predictions | patient_id, analysis_type, risk_scores (JSONB), model_version |
| `follow_ups` | Follow-up tracking | patient_id, doctor_id, appointment_id, follow_up_date, status (active/completed/overdue) |
| `geriatric_screenings` | Elderly assessments | patient_id, screener_id, scores (JSONB), risk_level, recommendations (JSONB) |

#### 3.3.8 Mobile & Integration Tables (Phase 2 — Deployed)

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `device_tokens` | Push notification registration | user_id, device_token, platform (ios/android/web), device_name, app_version |
| `biometric_credentials` | Fingerprint/face auth | user_id, credential_type (fingerprint/face_id/iris), public_key, device_id |
| `refresh_tokens` | JWT token rotation | user_id, token_hash, device_id, expires_at, is_revoked, replaced_by |
| `push_subscriptions` | Notification preferences | user_id, appointment_reminders, medication_reminders, health_tips, lab_results, quiet_hours |
| `sync_queue` | Offline sync for mobile | user_id, entity_type, entity_id, operation (create/update/delete), payload (JSONB), sync_status (pending/synced/conflict), retry_count |
| `user_api_connections` | Third-party APIs | user_id, service_type (google_fit/apple_health/pharmacy_api/lab_api/hospital_his/line_notify/thai_id), access_token_encrypted, connection_status |
| `api_connection_audit` | API audit trail | connection_id, user_id, action, service_type, ip_address |

#### 3.3.9 System Tables

| Table | Purpose | Key Fields |
| ------- | ---------| ----------- |
| `notifications` | In-app notification queue | user_id, type (appointment_*/meeting_*/emr_*/system_*), title, message, is_read, link, metadata (JSONB) |
| `notification_preferences` | Per-user channel settings | user_id, channel (push/email/sms/in_app/line), category, enabled |
| `user_settings` | User preferences | user_id, theme (light/dark/system), language, font_size, biometric_enabled, auto_sync |
| `health_timeline` | Chronological event log | patient_id, event_type, event_data (JSONB), timestamp |
| `audit_logs` | Security audit trail | user_id, action, entity_type, entity_id, ip_address, details (JSONB) |

### 3.4 Real-Time Sync (PostgreSQL NOTIFY Triggers)

Eight database triggers fire `pg_notify('data_changes', payload)` on data changes, enabling cross-service real-time synchronization:

```text
┌────────────────────┐    pg_notify()    ┌─────────────────────────────┐
│  PostgreSQL Trigger │ ──────────────── │  pgNotifyListener (each     │
│  (AFTER INSERT /    │                  │  portal) receives event and │
│   UPDATE / DELETE)  │                  │  pushes via Socket.IO       │
└────────────────────┘                  └─────────────────────────────┘

Trigger                      Table              Events
─────────────────────────────────────────────────────────
trg_appointments_notify      appointments       INSERT, UPDATE, DELETE
trg_emr_notify               emr                INSERT, UPDATE
trg_prescriptions_notify     prescriptions      INSERT, UPDATE
trg_lab_orders_notify        lab_orders         INSERT, UPDATE
trg_notifications_notify     notifications      INSERT, UPDATE
trg_vital_signs_notify       vital_signs        INSERT, UPDATE
trg_phr_notify               phr                INSERT, UPDATE
trg_doctor_schedules_notify  doctor_schedules   INSERT, UPDATE, DELETE

Payload format: { "table", "operation", "id", "patient_id", "doctor_id" }
```

## How it works

1. A service (e.g., Doctor Portal) writes data to PostgreSQL (e.g., confirms an appointment)
2. The `trg_appointments_notify` trigger fires and calls `pg_notify('data_changes', ...)`
3. Each portal's `pgNotifyListener` (running in the Express server) receives the notification via the PostgreSQL `LISTEN` channel
4. The listener emits a Socket.IO event to all connected frontend clients
5. React components subscribed to that event update in real-time without polling

---

## 4. Core Workflows

### 4.1 Appointment & Meeting Workflow (End-to-End)

> **Full Documentation:** [Appointment_Workflows.md](Appointment_Workflows.md), [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md)

This is the **core Phase 1 deliverable** — the complete end-to-end flow from appointment booking to patient delivery.

#### Overview

```text
Patient Books ──→ AI Analysis ──→ Admin Assigns / Doctor Confirms ──→ Meeting Link
    ──→ Multi-Party Video (Jitsi) + Live Transcript (Web Speech API) + Chat
    ──→ AI SOAP Summary (Gemini) ──→ Doctor Man-in-Loop Review
    ──→ EMR + Prescriptions + Lab Orders + Imaging Orders
    ──→ Patient Instruction Sheet (Thai PDF) ──→ Follow-up Scheduled
```

#### Step-by-Step Scenarios

## Scenario 1: Patient Books Appointment

1. Patient logs into Patient Portal → navigates to Appointments → clicks "ขอนัดหมายแพทย์" (Book Appointment)
2. Fills 3-step wizard: select specialty/doctor (or "Any Doctor"), describe symptoms, choose preferred date/time
3. AI analyzes symptoms via Gemini (symptom analysis, urgency scoring)
4. Appointment created in `appointments` table with status `requested`
5. Notification sent to admin/assigned doctor

## Scenario 2: Admin Assigns Doctor (Unassigned Appointments)

1. Admin sees unassigned appointments in Appointment Pool Management page
2. Reviews AI symptom analysis and recommended specialty
3. Manually assigns a doctor or uses AI-matching (specialty + availability)
4. Appointment status changes to `assigned`
5. Assigned doctor receives notification

## Scenario 3: Doctor Confirms Appointment

1. Doctor sees appointment in Health Meeting page queue
2. Reviews patient history + AI pre-consultation summary
3. Confirms appointment → status becomes `confirmed`
4. System generates Jitsi room with 3 distinct URLs:
   - **Doctor URL:** Full host controls (recording, transcript, lobby management)
   - **Patient URL:** Lobby entry, participant controls
   - **Guest URL:** Lobby entry with name-only registration
5. Meeting link stored in `appointments.jitsi_room_name`
6. Patient receives notification with meeting link + calendar event

## Scenario 4: Pre-Meeting AI Preparation

1. Doctor clicks "AI สรุปก่อนพบ" (AI Pre-Consultation Summary) on dashboard
2. Gemini AI processes: patient PHR, previous EMRs, current medications, allergies, lab results, appointment symptoms
3. Returns structured summary: patient history overview, risk factors, medication interactions, suggested questions
4. CDS (Clinical Decision Support) alerts shown if applicable (e.g., "ปรับยา Metformin สำหรับ eGFR 38")

## Scenario 5: Multi-Party Video Meeting

1. **Doctor starts meeting** (HOST) — opens Jitsi room with full moderator controls
2. **Patient enters lobby** — waits for doctor to admit
3. **Guest invites** — Doctor or patient can invite:
   - Patient relatives/friends (via Patient Portal sharing)
   - Other doctors/specialists (via token-based invite)
   - Non-registered users (guest join page → enter name → lobby)
4. **Doctor admits participants** from lobby (like Microsoft Teams)
5. **Camera & microphone** default ON for all (`startWithVideoMuted=false`, `startWithAudioMuted=false`)
6. **Text chat** always available — all messages captured with timestamps and sender attribution
7. Up to 8 participants per meeting recommended

## Scenario 6: Real-Time Transcript Streaming

1. **Doctor (HOST) controls transcript**: START → PAUSE → RESUME → STOP buttons
2. Web Speech API (browser-native, FREE) captures speech
3. Real-time transcript streams via Socket.IO to all participants
4. Speaker labels: 👨‍⚕️ Doctor / 🧑 Patient / 👥 Guest
5. Interim text shown with yellow pulsing background
6. Language switching: Thai (th-TH) ↔ English (en-US)
7. Transcript saved segment-by-segment to `meeting_transcripts` table
8. Chat messages captured to `meeting_chats` table

## Scenario 7: Recording

1. Doctor can start/stop video recording
2. Recording consent dialog shown to all participants
3. Recording stored as BYTEA in `meeting_records.recording_data` (primary)
4. Filesystem fallback if PostgreSQL write fails

## Scenario 8: Post-Meeting AI Pipeline

1. Doctor ends meeting → status changes to `completed`
2. Meeting Server triggers AI processing:
   - Collects: transcript segments + chat messages + meeting duration
   - Gemini AI generates structured SOAP summary (30-minute sections for long meetings)
   - Outputs: subjective, objective, assessment, plan, red flags, patient instructions
3. AI summary stored in `meeting_records.ai_summary`
4. Section summaries in `meeting_records.section_summaries` (JSONB)
5. AI recommendations in `meeting_records.ai_recommendations` (JSONB)

## Scenario 9: Man-in-the-Loop Validation

1. Doctor Portal shows AI-generated summary in Health Meeting results panel
2. Doctor reviews, edits, approves or rejects each section
3. Validation record stored in `ai_validations` table
4. Status: `pending` → `approved` / `rejected`
5. Only doctor-approved content proceeds to EMR and patient delivery
6. `meeting_records.doctor_validation_status` and `validated_at` updated

## Scenario 10: EMR Creation (AI-Prefilled)

1. Doctor opens EMR Editor modal (CompleteEMREditor.tsx)
2. EMR auto-populated from validated AI summary:
   - ประวัติ (S) — Subjective: Chief complaint, history of present illness
   - ตรวจร่างกาย (O) — Objective: Physical examination findings
   - วินิจฉัย (A) — Assessment: Diagnosis, ICD-10 codes
   - แผนการรักษา (P) — Plan: Treatment orders, follow-up
   - สรุป AI — AI Summary for patient
3. Doctor edits/completes each SOAP tab
4. Voice dictation available (Web Speech API, device-based)
5. Auto-save during editing
6. Doctor signs digitally → EMR status becomes `signed`
7. EMR stored in `emr` table

## Scenario 11: Prescriptions, Lab Orders, Imaging Orders

1. From EMR Editor, doctor opens E-Prescribing → searches drugs → selects dosage/frequency/duration → drug interaction check → signs
2. Lab Orders: selects test types → enters clinical indication → orders saved to `lab_orders`
3. Imaging Orders: selects modality → enters clinical question → orders saved
4. All orders linked to appointment_id and patient_id

## Scenario 12: Patient Instruction Sheet

1. AI generates patient-friendly instruction sheet in Thai
2. Content includes: diagnosis summary, medications with dosage instructions, lifestyle recommendations, warning signs, follow-up date
3. Doctor validates (man-in-the-loop) before sending to patient
4. Patient receives as PDF (Thai) via Patient Portal
5. Stored in `patient_instructions` table

## Scenario 13: Patient Receives Results

1. Patient logs into Patient Portal → Dashboard shows latest appointment result
2. Timeline page shows chronological treatment history
3. PHR page updated with new vital signs, diagnosis, medications
4. Notification received: "เวชระเบียนพร้อมดู" (EMR Ready)
5. Patient Instruction Sheet available for download

## Scenario 14: Follow-up Scheduling

1. Doctor sets follow-up date in EMR plan
2. System creates follow-up record in `follow_ups` table
3. Patient receives reminder notification 24 hours before
4. Patient can book follow-up appointment directly from the reminder

**Database Tables Used:** `appointments`, `emr`, `meeting_records`, `meeting_transcripts`, `meeting_chats`, `meeting_invites`, `ai_validations`, `patient_instructions`, `prescriptions`, `lab_orders`, `follow_ups`, `notifications`, `health_timeline`

**API Endpoints:** See [Appointment_Workflows.md](Appointment_Workflows.md) and [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) for complete endpoint lists.

---

### 4.2 User Management & Authentication

> **Full Documentation:** [User_management_Workflows.md](User_management_Workflows.md)

Handles all user lifecycle operations across both portals with role-based access control.

#### Features & Functions

| Feature | Description | Status |
| --------- | -------------| -------- |
| Patient Registration | 2-step wizard, immediate access | ✅ |
| Doctor Registration | Full profile, requires admin approval | ✅ |
| Login/Logout | Email + password, session-based | ✅ |
| Password Reset | Token via email, time-limited | ✅ |
| Role-Based Access | patient / doctor / admin | ✅ |
| Account Locking | After failed login attempts | ✅ |
| Admin Doctor Approval | Admin reviews, approves/rejects doctor registration | ✅ |
| Biometric Auth | Fingerprint/face ID (Phase 2 tables deployed) | 📋 |
| JWT Token Rotation | Refresh tokens with device tracking (Phase 2) | 📋 |

#### Scenarios

## Patient Registration

1. Patient navigates to `/register` → fills 2-step wizard (personal info + credentials)
2. Password hashed with bcrypt → user record created in `users` table with role `patient`
3. `patient_profiles` record created with demographics, emergency contact
4. Immediate access granted (no admin approval required)
5. Session token generated → stored in `sessions` table

## Doctor Registration

1. Doctor navigates to `/login` → Registration tab → fills detailed form (name, specialty, license, hospital)
2. Password hashed with bcrypt → user record created with role `doctor`, `is_approved: false`, `approval_status: pending`
3. `doctor_profiles` record created with specialty, qualifications, experience
4. Admin receives notification of new doctor registration
5. Doctor sees "Pending Approval" screen until admin approves

## Admin Approves/Rejects Doctor

1. Admin navigates to Admin Doctor Management page
2. Reviews pending registrations with license verification
3. Approves → `is_approved: true`, `approval_status: approved`, `approved_at` timestamp
4. Rejects → `approval_status: rejected`, `rejected_at` timestamp
5. Doctor receives notification of approval/rejection

## Login Flow

1. User enters email + password → POST `/api/auth/login` (patient) or `/auth/login` (doctor)
2. bcrypt compares password hash → checks `is_active`, `locked_until`, `is_approved`
3. Session created: token, IP, user_agent, expiration
4. Returns user profile with role → frontend routes based on role

## Password Reset

1. User clicks "Forgot password" → enters email
2. Reset token generated → stored in `password_resets` with expiration
3. Email sent with reset link containing token
4. User clicks link → enters new password → token validated → password updated
5. Token marked as used → all active sessions invalidated

## Account Security

- `login_attempts` incremented on each failed login

- After threshold (e.g., 5 attempts) → `locked_until` set (e.g., 30 minutes)

- Session timeout: configurable per portal

- All sessions log IP and user_agent for audit

**Database Tables Used:** `users`, `sessions`, `password_resets`, `patient_profiles`, `doctor_profiles`, `doctor_schedules`, `audit_logs`

## API Endpoints

| Method | Endpoint | Portal | Description |
| -------- | ----------| -------- | ------------- |
| POST | `/api/auth/register` | Patient | Register new patient |
| POST | `/api/auth/login` | Patient | Patient login |
| POST | `/api/auth/logout` | Patient | End session |
| POST | `/api/auth/validate` | Patient | Validate session token |
| GET | `/api/auth/me` | Patient | Get current user profile |
| POST | `/api/auth/request-password-reset` | Patient | Request password reset |
| POST | `/api/auth/reset-password` | Patient | Reset password with token |
| POST | `/auth/login` | Doctor | Doctor/admin login |
| POST | `/auth/register` | Doctor | Doctor registration |
| POST | `/auth/logout` | Doctor | End session |
| GET | `/auth/me` | Doctor | Get current user profile |
| POST | `/auth/request-password-reset` | Doctor | Request reset |
| POST | `/auth/reset-password` | Doctor | Reset password |
| GET | `/api/admin/doctors/pending` | Doctor (Admin) | List pending registrations |
| POST | `/api/admin/doctors/:id/approve` | Doctor (Admin) | Approve doctor |
| POST | `/api/admin/doctors/:id/reject` | Doctor (Admin) | Reject doctor |

---

### 4.3 Health Records (PHR + EMR)

> **Full Documentation:** [Health_Records_Processes.md](Health_Records_Processes.md)

Covers patient self-entered data (PHR), doctor clinical records (EMR), prescriptions, lab orders, and AI integration.

#### Features & Functions

| Feature | Description | Status |
| --------- | -------------| -------- |
| PHR Self-Entry | Vital signs, medications, allergies, lifestyle | ✅ |
| EMR (SOAP Format) | Thai Ministry Standard OPD Card | ✅ |
| AI-Generated EMR | Gemini generates SOAP from meeting transcript | ✅ |
| Man-in-the-Loop | Doctor validates all AI-generated content | ✅ |
| E-Prescribing | Drug search, interaction checks, digital signature | ✅ |
| Lab Orders | Order, track, enter results with flags | ✅ |
| Imaging Orders | Full CRUD with result upload | ✅ |
| Patient Instructions | AI-generated post-visit instructions (Thai PDF) | ✅ |
| Voice Dictation | Web Speech API for hands-free EMR entry | ✅ |
| Document Analysis | AI analyzes uploaded PDFs and lab results | ✅ |

#### Scenarios

## Patient Self-Entry (PHR)

1. Patient navigates to PHR page → 5 tabs: Overview, Vitals, Medications, Allergies, Profile
2. **Vitals**: Records blood pressure (systolic/diastolic), heart rate, temperature, respiratory rate, oxygen saturation, blood glucose (fasting/random/post-meal), weight, height → auto-calculates BMI
3. **Medications**: Lists current medications with dosage, frequency, start date
4. **Allergies**: Drug allergies with severity (mild/moderate/severe/life-threatening), reaction description
5. **Chronic Conditions**: Ongoing conditions (e.g., diabetes, hypertension, CKD)
6. **Lifestyle**: Smoking status, alcohol use, exercise frequency
7. All data stored in `phr` table (JSONB fields) and `vital_signs` table (individual measurements)
8. Data immediately available to authorized doctors

## EMR Creation During/After Appointment

1. Doctor opens CompleteEMREditor → selects encounter type: ตรวจทั่วไป (General), นัดติดตาม (Follow-up), ฉุกเฉิน (Emergency), หัตถการ (Procedure)
2. If post-meeting: EMR auto-populated from AI-validated SOAP summary
3. **Tab ประวัติ (S)**: Chief complaint, history of present illness, review of systems
4. **Tab ตรวจร่างกาย (O)**: Physical examination, vital signs, findings
5. **Tab วินิจฉัย (A)**: Diagnosis with ICD-10 codes, differential diagnosis
6. **Tab แผนการรักษา (P)**: Treatment plan, medications, follow-up orders
7. **Tab สรุป AI**: AI summary validated by doctor for patient sharing
8. Voice dictation on any text field (Web Speech API)
9. Auto-save periodically during editing
10. Digital signature → EMR status: `signed` → `signed_at` timestamp

## Prescriptions (E-Prescribing)

1. Doctor opens CompletePrescribing modal → real-time drug search from `drugs` table
2. Selects drug → auto-fills dosage forms, common dosages
3. **Drug Interaction Check**: Cross-references patient's allergies (`phr.allergies`) and current medications
4. **CDS Alerts**: Flags dose adjustments for renal/hepatic impairment (e.g., Metformin for CKD)
5. Doctor sets: dosage, frequency, duration, instructions (Thai), quantity
6. Digital signature → prescription stored in `prescriptions` table
7. Linked to appointment_id and patient_id

## Lab Orders & Results

1. Doctor orders lab tests → selects from categorized test menu
2. Orders stored in `lab_orders` table with status `ordered`
3. When results available: doctor enters values, system checks against normal ranges
4. Flags: normal (green), high (orange), low (blue), critical (red)
5. Results linked to EMR → patient notified
6. AI can analyze lab trends across appointments

**Database Tables Used:** `phr`, `vital_signs`, `emr`, `prescriptions`, `lab_orders`, `drugs`, `icd10_codes`, `patient_instructions`, `ai_document_analysis`, `health_timeline`

---

### 4.4 Video Meeting & AI Pipeline

> **Full Documentation:** [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md)

Describes the Jitsi Meet integration, real-time transcription, and Gemini AI post-meeting processing.

#### Features & Functions

| Feature | Description | Cost | Status |
| --------- | -------------| ------ | -------- |
| Jitsi Meet Video | Multi-party video conferencing | FREE | ✅ |
| Lobby System | Doctor approves each participant | — | ✅ |
| Guest Self-Registration | Non-registered users enter name + join lobby | — | ✅ |
| Real-Time Transcript | Web Speech API, browser-native | FREE | ✅ |
| HOST Transcript Control | Doctor starts/pauses/resumes/stops | — | ✅ |
| Language Switching | Thai (th-TH) ↔ English (en-US) | — | ✅ |
| In-Meeting Chat | All participants, captured for AI | — | ✅ |
| Video Recording | Stored as BYTEA in PostgreSQL | — | ✅ |
| Gemini SOAP Summary | 30-minute section processing | FREE | ✅ |
| Patient Instruction Sheet | Thai PDF, AI-generated | — | ✅ |
| Clinical Decision Support | Drug interaction & dose alerts | — | ✅ |
| Man-in-the-Loop | Doctor approval before patient delivery | — | ✅ |

#### Jitsi Room URL Generation

Each confirmed appointment generates 3 distinct Jitsi URLs:

| URL Type | Recipient | Features | Access |
| ---------- | -----------| ---------- | -------- |
| Doctor URL | Host doctor | Full moderator controls, recording, transcript | JWT authenticated |
| Patient URL | Booked patient | Lobby entry, participant controls | Appointment-linked |
| Guest URL | Invited guests | Lobby entry, name-only registration, no login required | Token-based |

## Guest Join Pages (Public, No Login)

- Patient Portal: `/guest-join/:meetingId`

- Doctor Portal: `/guest-join/:meetingId`

#### Meeting Server Backend

The Meeting Server (port 3020) provides:

| API Endpoint | Method | Description | Auth |
| ------------- | --------| ------------- | ------ |
| `/api/meetings` | POST | Create new meeting room | JWT |
| `/api/meetings/:id` | GET | Get meeting details | JWT |
| `/api/meetings/:id/start` | POST | Start meeting | JWT (doctor) |
| `/api/meetings/:id/end` | POST | End meeting | JWT (doctor) |
| `/api/meetings/:id/lobby/join` | POST | Guest joins lobby | Public |
| `/api/meetings/:id/lobby/admit` | POST | Doctor admits from lobby | JWT (doctor) |
| `/api/meetings/:id/lobby/reject` | POST | Doctor rejects from lobby | JWT (doctor) |
| `/api/meetings/:id/lobby/pending` | GET | Get lobby participants | JWT (doctor) |
| `/api/meetings/:id/transcript` | POST | Save transcript segment | JWT |
| `/api/meetings/:id/chat` | POST | Save chat message | JWT |
| `/api/meetings/:id/invite` | POST | Generate guest invite | JWT |
| `/api/meetings/:id/recording` | POST | Save recording data | JWT |
| `/api/meetings/:id/ai-summary` | POST | Trigger AI processing | JWT |
| `/api/meetings/:id/validate` | POST | Man-in-the-loop validate | JWT (doctor) |

#### Socket.IO Events (Real-Time)

| Event | Direction | Purpose |
| ------- | -----------| --------- |
| `transcript:start` | Client → Server | Doctor starts transcription |
| `transcript:pause` | Client → Server | Doctor pauses transcription |
| `transcript:data` | Client ↔ Server | Transcript segment broadcast |
| `transcript:stop` | Client → Server | Doctor stops transcription |
| `lobby:join` | Client → Server | Participant enters lobby |
| `lobby:admit` | Server → Client | Doctor admits participant |
| `lobby:reject` | Server → Client | Doctor rejects participant |
| `meeting:started` | Server → Clients | Meeting has begun |
| `meeting:ended` | Server → Clients | Meeting has ended |
| `chat:message` | Client ↔ Server | Chat message broadcast |

**Database Tables Used:** `meeting_records`, `meeting_transcripts`, `meeting_chats`, `meeting_invites`, `ai_validations`, `transcript_embeddings`, `patient_instructions`

---

### 4.5 Medical Content & Clinical Resources

> **Full Documentation:** [Medicine_Content_Processes.md](Medicine_Content_Processes.md), [Clinical_Resources_&_Medical_Library_Workflows.md](Clinical_Resources_&_Medical_Library_Workflows.md)

Two content systems serving different audiences — health articles for patients and clinical guidelines for doctors.

#### Medical Content (คลังความรู้สุขภาพ — Patient-Facing)

| Feature | Description |
| --------- | ------------- |
| **Thai-First Policy** | Thai is required; English optional |
| **CRUD** | Doctors and admins create/edit/delete articles |
| **Approval Workflow** | Admin must approve before publishing |
| **Patient Library** | Read-only access in Patient Portal Health Studio |
| **Image Support** | `[image:URL:description]` inline syntax |
| **RAG Knowledge Base** | Articles indexed for AI search via pgvector embeddings |

## Approval Workflow

1. Doctor creates article → status: `draft`
2. Doctor submits for review → status: `pending`
3. Admin reviews → approves (`published`) or rejects (back to `draft` with feedback)
4. Published articles appear in Patient Portal Medical Content Library
5. If doctor edits published article → status reverts to `pending` for re-approval

## Categories (10 Fixed)
diagnosis, treatment, pharmacology, radiology, laboratory, pathology, emergency, nursing, research, case-studies

#### Clinical Resources (แหล่งข้อมูลทางการแพทย์ — Doctor-Facing)

Same approval workflow as Medical Content but for clinical guidelines, protocols, and research papers visible only to doctors. Indexed into RAG knowledge base for AI-powered search during consultations.

## API Endpoints

| Method | Endpoint | Description | Access |
| -------- | ----------| ------------- | -------- |
| GET | `/api/content/medical` | List medical content | All |
| GET | `/api/content/medical/:id` | Get single article | All |
| POST | `/api/content/medical` | Create article | Doctor/Admin |
| PUT | `/api/content/medical/:id` | Update article | Owner |
| DELETE | `/api/content/medical/:id` | Delete article | Owner |
| POST | `/api/content/medical/:id/review` | Approve/Reject | Admin |
| GET | `/api/content/clinical` | List clinical resources | Doctor/Admin |
| POST | `/api/content/clinical` | Create resource | Doctor |
| POST | `/api/content/clinical/:id/review` | Approve/Reject | Admin |
| GET | `/api/content/tags/*` | Get/create tags | All |

**Database Tables Used:** `medical_content`, `clinical_resources`, `knowledge_base`

---

### 4.6 Notification System

> **Full Documentation:** [Notification_Workflows.md](Notification_Workflows.md)

Manages all in-app, email, push, and system notifications across both portals.

#### Notification Channels

| Channel | Thai | Implementation | Status |
| --------- | ------| --------------- | -------- |
| In-App | แจ้งเตือนในแอป | PostgreSQL `notifications` table + Socket.IO real-time | ✅ |
| Email | อีเมล | Gmail API | ✅ |
| Push | Push Notification | Browser push via `push_subscriptions` | ✅ |
| SMS | SMS | Future enhancement | 📋 |

#### Notification Types (15+)

## Appointments (นัดหมาย)

- `appointment_requested` — Patient submitted new appointment

- `appointment_confirmed` — Doctor confirmed + meeting link

- `appointment_declined` — Doctor declined, seeking another doctor

- `appointment_cancelled` — Appointment cancelled

- `appointment_assigned` — Admin assigned doctor

- `appointment_rescheduled` — Appointment time changed

- `appointment_reminder` — 24h and 1h before appointment

## Video Meeting (การประชุมออนไลน์)

- `meeting_link_ready` — Jitsi meeting link generated

- `meeting_link_failed` — Meeting link generation failed

- `meeting_started` — Doctor started the meeting room

- `meeting_reminder` — 15 minutes before meeting

## Medical Records (เวชระเบียน)

- `emr_signed` — Doctor signed the EMR

- `emr_ready_for_review` — AI summary ready for doctor validation

- `prescription_ready` — Prescription available

- `lab_results_ready` — Lab results ready for viewing

## System (ระบบ)

- `account_verified` — Account verification complete

- `password_reset` — Password reset requested

- `system_maintenance` — Scheduled maintenance alert

#### Real-Time Delivery

1. **PostgreSQL NOTIFY trigger** fires when new row inserted into `notifications` table
2. **pgNotifyListener** in each portal receives the event
3. **Socket.IO** pushes to connected client in real-time
4. **NotificationBell** component (header) polls every 30 seconds as fallback
5. Unread count badge updates immediately

#### User Preferences

Users can configure notification preferences per channel and category via `notification_preferences` table and `push_subscriptions` table (quiet hours, language preference).

**Database Tables Used:** `notifications`, `notification_preferences`, `push_subscriptions`, `user_settings`

---

### 4.7 Living Will & PDPA Compliance

> **Full Documentation:** [Living_Will_Processes.md](Living_Will_Processes.md), [Living_Will_Implementation_Plan.md](Living_Will_Implementation_Plan.md)

Enables patients to create legally-binding Living Will documents with PDPA-compliant sharing controls.

#### Features & Functions

| Feature | Description | Status |
| --------- | -------------| -------- |
| 4-Step Wizard | Statement → Treatment Preferences → Representatives → Signature | ✅ |
| PDPA Consent | Explicit sharing toggle with explanation | ✅ |
| Share/Private Toggle | Public to all authorized doctors OR private | ✅ |
| Digital Signature | Canvas-based signature + optional witness | ✅ |
| Version History | Every edit creates a new version | ✅ |
| Audit Trail | All access and modifications logged | ✅ |
| Doctor Portal View | LivingWillCard in PatientRecordViewer | ✅ |

#### Scenarios

## Patient Creates Living Will

1. Patient navigates to PHR → Living Will tab → "Create Living Will"
2. **Step 1 — Statement**: Free text describing wishes for end-of-life care
3. **Step 2 — Treatment Preferences**: Checkboxes with notes for:
   - Resuscitation (CPR)
   - Mechanical ventilation
   - Artificial nutrition/hydration
   - Dialysis
   - Antibiotics for terminal illness
   - Pain management preferences
   - Other custom preferences
4. **Step 3 — Representatives**: Primary and alternative healthcare proxy:
   - Name, relationship, phone, email
   - Authority scope (all decisions / limited)
5. **Step 4 — PDPA Consent & Signature**:
   - Patient must accept PDPA consent checkbox
   - Choose: 🔒 Keep Private OR 🌐 Share with Doctors
   - If shared: "ALL doctors who have treated you and hospital administrators can view"
   - Digital signature canvas
   - Optional witness signature
   - System records timestamp and IP

## Doctor Views Living Will

1. Doctor opens Patient Record Viewer → PHR tab → Living Will card
2. If `is_shared_with_doctors: true` → Full document visible (read-only)
3. If `is_shared_with_doctors: false` → Card shows "Living Will exists (private)"
4. Access logged in `living_wills.audit_log` (JSONB)

## Living Will Access Rules

| Condition | Doctor Access | Admin Access |
| ----------- | --------------| ------------- |
| `is_shared_with_doctors: true` + has patient history | ✅ Full view | ✅ Full view |
| `is_shared_with_doctors: true` + no patient history | ❌ No access | ❌ No access |
| `is_shared_with_doctors: false` | ❌ Hidden | ❌ Hidden |

**Database Tables Used:** `living_wills`, `living_will_versions`, `patient_consents`, `audit_logs`

---

### 4.8 Medical Consultants

> **Full Documentation:** [Medical_Consultants_Workflows.md](Medical_Consultants_Workflows.md)

Specialist directory for patient referrals and inter-doctor consultation.

#### Features & Functions

| Feature | Actor | Description |
| --------- | -------| ------------- |
| Add Consultant | Admin | Full profile: name, specialty, hospital, email, phone, languages, experience, bio |
| Edit Consultant | Admin | Update any field with audit trail |
| Toggle Availability | Admin | green (available) / gray (unavailable) badge |
| Delete Consultant | Admin | Permanent removal with confirmation |
| Rate Consultant | Doctor | 1-5 stars + optional comment, average recalculated |
| Contact Consultant | Doctor | Email (mailto:) or Call (tel:) links |
| View Details | All | Full profile modal with reviews |
| Filter by Specialty | All | Specialty dropdown filter |

## API Endpoints

| Method | Endpoint | Description | Access |
| -------- | ----------| ------------- | -------- |
| GET | `/api/consultants` | List all | Doctor/Admin |
| GET | `/api/consultants/:id` | Get single | Doctor/Admin |
| POST | `/api/consultants` | Create | Admin |
| PUT | `/api/consultants/:id` | Update | Admin |
| DELETE | `/api/consultants/:id` | Delete | Admin |
| POST | `/api/consultants/:id/availability` | Toggle | Admin |
| POST | `/api/consultants/:id/review` | Rate | Doctor |
| GET | `/api/consultants/specialties/list` | Specialties | All |

**Database Tables Used:** `consultants`

---

### 4.9 Data Synchronization

> **Full Documentation:** [Data_Sync_Documentation.md](Data_Sync_Documentation.md)

Ensures consistent data across the three independent services via PostgreSQL as single source of truth.

#### Sync Architecture

```text
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│ Patient Portal │     │ Doctor Portal  │     │ Meeting Server     │
│ (port 3005)    │     │ (port 3010)    │     │ (port 3020)        │
│                │     │                │     │                    │
│ pgNotify       │     │ pgNotify       │     │ pgNotify           │
│ Listener       │     │ Listener       │     │ Listener           │
└──────┬─────────┘     └──────┬─────────┘     └────────┬───────────┘
       │                      │                         │
       └──────────┬───────────┴─────────────────────────┘
                  │
        ┌─────────▼──────────┐
        │  PostgreSQL         │
        │  izara_phase1       │
        │                     │
        │  NOTIFY triggers    │
        │  on 8 tables:       │
        │  appointments       │
        │  emr                │
        │  prescriptions      │
        │  lab_orders         │
        │  notifications      │
        │  vital_signs        │
        │  phr                │
        │  doctor_schedules   │
        └─────────────────────┘
```

## Sync Patterns

| Pattern | Mechanism | Latency |
| --------- | -----------| --------- |
| **Real-Time** | PostgreSQL NOTIFY → pgNotifyListener → Socket.IO | <100ms |
| **Polling Fallback** | Frontend polls API every 30 seconds | 30s max |
| **Offline Sync** (Phase 2) | `sync_queue` table with conflict resolution | On reconnect |

## Cross-Portal Data Flow Examples

| Scenario | Source | Target | Mechanism |
| ---------- | --------| -------- | ----------- |
| Doctor confirms appointment | Doctor Portal | Patient Portal | `trg_appointments_notify` → Socket.IO |
| Patient enters vitals | Patient Portal | Doctor Portal | `trg_vital_signs_notify` → Socket.IO |
| EMR signed | Doctor Portal | Patient Portal | `trg_emr_notify` → Socket.IO |
| Lab results entered | Doctor Portal | Patient Portal | `trg_lab_orders_notify` → Socket.IO |
| AI summary ready | Meeting Server | Doctor Portal | `trg_emr_notify` + WebSocket event |
| Doctor schedule updated | Doctor Portal | Patient Portal (booking) | `trg_doctor_schedules_notify` → Socket.IO |

**Database Tables Used:** `audit_logs`, `sync_queue`, all 8 trigger tables

---

## 5. Patient Portal Pages (15 Pages)

> **Full Page Documentation:** [Pages/Patient-Portal/](Pages/Patient-Portal/)
> **Portal URL:** `localhost:3005`
> **Technology:** React 18 + TypeScript + Vite + Tailwind CSS + Express.js backend

### Authentication Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 1 | [Login](Pages/Patient-Portal/01_Login_Page.md) | `/login` | `LoginPage.tsx` | Email + password authentication. Thai-first UI with language toggle. Error handling for locked accounts, invalid credentials. Redirects to dashboard on success. |
| 2 | [Register](Pages/Patient-Portal/02_Register_Page.md) | `/register` | `RegisterPage.tsx` | 2-step wizard: personal information (name, name_thai, DOB, gender, phone) + credentials (email, password with strength meter). Immediate access upon registration. PDPA consent checkbox required. |
| 3 | [Reset Password](Pages/Patient-Portal/03_Reset_Password_Page.md) | `/reset-password` | `ResetPasswordPage.tsx` | Enter email → receive reset link → enter new password with confirmation. Token validation and expiration handling. |

### Dashboard & Navigation

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 4 | [Dashboard](Pages/Patient-Portal/04_Dashboard_Page.md) | `/` | `DashboardPage.tsx` | Central patient hub with 2-column layout. Left (2/5): Quick actions (book appointment, AI chat, view records) + upcoming appointments with countdown. Right (3/5): Health Studio with recent health data, notifications, medical content recommendations. Latest appointment results shown prominently. |

### Clinical Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 5 | [Appointments](Pages/Patient-Portal/05_Appointments_Page.md) | `/appointments`, `/book-appointment`, `/appointments/:id` | `AppointmentPages.tsx` | **List View**: All appointments with status badges (requested/confirmed/completed/cancelled), filter by status. **Book New**: 3-step wizard (specialty/doctor → symptoms with AI analysis → date/time). **Detail View**: Meeting link (if confirmed), join button, invite relatives, Google Calendar integration, view results after completion. |
| 6 | [PHR (Health Records)](Pages/Patient-Portal/06_PHR_Page.md) | `/phr` | `PHRPage.tsx` | 5-tab health data management. **Overview**: Summary of all health data + charts. **Vitals**: Record/view blood pressure, heart rate, temperature, O2 sat, blood glucose (with fasting/random/post-meal type), weight/height/BMI. **Medications**: Current medication list with dosage, frequency. **Allergies**: Drug allergies with severity flags. **Profile**: Demographics, emergency contact, insurance, chronic conditions. Includes **Living Will** management sub-tab. |
| 7 | [Timeline](Pages/Patient-Portal/14_Timeline_Page.md) | `/timeline` | `TimelinePage.tsx` | Chronological timeline of ALL medical events: appointments (with status), medications (start/change/stop), lab results (with flags), procedures, diagnoses. Filter by event type. Click any event → navigate to detail page. Prescription PDFs and Patient Instruction Sheets downloadable. |

### AI & Content Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 8 | [AI Doctor](Pages/Patient-Portal/07_AI_Doctor_Page.md) | `/ai-doctor` | `AIDoctorPage.tsx` | AI health assistant powered by Gemini 2.5 Flash Lite. Toggleable sidebar with saved chat sessions. Medical context-aware: uses patient PHR, medications, allergies for personalized responses. Symptom assessment, medication questions, health education. Thai-first with English support. Disclaimer: "AI is not a substitute for professional medical advice." |
| 9 | [Medical Content Library](Pages/Patient-Portal/08_Medical_Content_Library.md) | `/health-library` | `MedicalContentLibrary.tsx` | Read-only library of published medical content in "คลังความรู้สุขภาพ" (Health Knowledge) tab in Health Studio. Search by title/tag, filter by category (10 categories). Content shown in Thai (primary) with optional English. Inline images supported. Links to related articles. |

### Health Management Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 10 | [PDPA](Pages/Patient-Portal/10_PDPA_Page.md) | `/pdpa` | `PDPAPage.tsx` | Privacy & data consent management. View/revoke data sharing consents. PDPA policy display. Consent history with timestamps. Data access audit log showing who accessed patient data and when. |
| 11 | [Living Will](Pages/Patient-Portal/11_Living_Will_Page.md) | `/living-will` | `LivingWillPage.tsx` | 4-step wizard for creating/editing Living Will (see workflow 4.7). View existing document with status badge (Active/Revoked). Share settings toggle. Version history. Edit/Revoke buttons. |

### System Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 12 | [Map](Pages/Patient-Portal/09_Map_Page.md) | `/map` | `MapPage.tsx` | Google Maps integration showing nearby healthcare facilities: hospitals, clinics, pharmacies, health centers. Search by type, distance filter. Click marker → facility details, directions. |
| 13 | [Profile](Pages/Patient-Portal/12_Profile_Page.md) | `/profile` | `ProfilePage.tsx` | User profile management: name, name_thai, email, phone, DOB, gender, avatar. Password change. Account deletion request. |
| 14 | [Settings](Pages/Patient-Portal/13_Settings_Page.md) | `/settings` | `SettingsPage.tsx` | Theme (light/dark/system), language (Thai/English), font size (small/medium/large), notification preferences, data sync settings. |
| 15 | [Notifications](Pages/Patient-Portal/15_Notification_System.md) | Header component | `NotificationBell.tsx` + `NotificationDropdown.tsx` | Bell icon with unread count badge. Dropdown list of recent notifications. Click → navigate to relevant page (appointment detail, lab results, etc.). Mark as read. Mark all as read. Polling every 30 seconds + real-time Socket.IO updates. |

---

## 6. Doctor Portal Pages (21 Pages)

> **Full Page Documentation:** [Pages/Doctor-Portal/](Pages/Doctor-Portal/)
> **Portal URL:** `localhost:3010`
> **Technology:** React 18 + TypeScript + Vite + Tailwind CSS + Express.js (CJS) + Nginx

### Authentication Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 1 | [Login](Pages/Doctor-Portal/01_Login_Page.md) | `/login` | `LoginPage.tsx` | Doctor/admin login with email + password. Registration tab for new doctor sign-up (requires admin approval). Thai-first UI. |
| 2 | [Reset Password](Pages/Doctor-Portal/02_Reset_Password_Page.md) | `/reset-password` | `ResetPasswordPage.tsx` | Token-based password recovery identical to patient portal flow. |

### Dashboard & Schedule

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 3 | [Dashboard](Pages/Doctor-Portal/03_Dashboard_Page.md) | `/dashboard` | `DoctorDashboard.tsx` | Central clinical hub with 3-column layout: **Health Data** (patient stats, AI analysis), **Health Meeting** (today's appointments with AI pre-consultation buttons, CDS alerts), **Health Studio** (documents pending review, AI assistant). Shows: today's appointment count, pending tasks, completed consultations. Quick actions: start meeting, view patient record, AI pre-consultation summary. |
| 4 | [Schedule](Pages/Doctor-Portal/04_Schedule_Page.md) | `/schedule` | `CompleteSchedule.tsx` | Day/week/month calendar views. Each appointment shows: patient name, time, status badge, specialty. Click → open appointment detail. "Join Meeting" button for confirmed appointments with Jitsi link. Color-coded by status. Drag-and-drop rescheduling. |

### Clinical Workflow Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 5 | [Patient Management](Pages/Doctor-Portal/05_Patient_Management_Page.md) | `/patients`, `/patients/:id` | `PatientManagement.tsx` | Patient list with search, filter by status/condition. Patient detail: demographics, appointment history, PHR summary, EMR history. Quick actions: create EMR, prescribe, order labs, start consultation. |
| 6 | [Health Meeting](Pages/Doctor-Portal/06_Health_Meeting_Page.md) | `/health-meeting` | `HealthMeeting.tsx` | **Primary workflow page.** Patient queue with status tabs (waiting/in-progress/completed). For each appointment: patient info, AI pre-consultation summary button, "Start Meeting" button (creates Jitsi room), view meeting results. Post-meeting: AI summary review, man-in-the-loop validation, create EMR button. Admin view: all appointments across doctors, assign from pool. |
| 7 | [Virtual Meeting](Pages/Doctor-Portal/07_Virtual_Meeting.md) | Modal | `VirtualMeeting.tsx` | Full-screen Jitsi video consultation modal. **HOST controls**: camera/mic toggle, recording consent + start/stop, live transcript controls (start/pause/resume/stop), lobby management (admit/reject participants). **Sidebar panels**: participant list, chat (always available), transcript viewer (real-time with speaker labels and interim text highlighting). AI Clinical Copilot: queries during consultation. Post-meeting: auto-trigger AI SOAP summary pipeline. Duration tracking. |
| 8 | [EMR Editor](Pages/Doctor-Portal/08_EMR_Editor.md) | Modal | `CompleteEMREditor.tsx` | Thai Ministry of Public Health OPD Card format. **5 tabs**: ประวัติ (S—Subjective), ตรวจร่างกาย (O—Objective), วินิจฉัย (A—Assessment with ICD-10 search), แผนการรักษา (P—Plan), สรุป AI (AI Summary for patient). Features: AI pre-fill from meeting transcript, voice dictation (Web Speech API), auto-save, encounter type selection, linked prescriptions/labs/imaging. Digital signature to finalize. |
| 9 | [E-Prescribing](Pages/Doctor-Portal/09_Prescribing.md) | Modal | `CompletePrescribing.tsx` | Real-time drug search from database. Auto-fill dosage forms. **Safety checks**: allergy cross-reference, drug-drug interaction, dose adjustment for renal/hepatic impairment. Prescription list with dosage, frequency, duration, quantity, instructions (Thai). Digital signature. Print/export capability. CDS alerts inline. |
| 10 | [Lab & Imaging Orders](Pages/Doctor-Portal/10_Lab_Orders.md) | Modal | `CompleteLabOrders.tsx` | **Lab Orders**: Categorized test menu, clinical indication field, urgency level. **Imaging Orders**: Modality selection (X-ray, CT, MRI, Ultrasound), clinical question, body part. **Results Entry**: Numeric values with normal ranges, automatic flag calculation (normal/high/low/critical). Result history with trend visualization. |
| 11 | [Patient Record Viewer](Pages/Doctor-Portal/11_Patient_Record_Viewer.md) | Modal | `PatientRecordViewer.tsx` | Comprehensive patient viewer with tabs: **PHR** (vitals, medications, allergies, demographics, Living Will card), **EMR History** (all past records, SOAP view), **EHR** (combined health record). Timeline view of all events. Lab results with trend charts. Prescription history. |

### Patient Queue

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 12 | [Queue Management](Pages/Doctor-Portal/21_Queue_Management.md) | Embedded | `QueueManagement.tsx` | Real-time patient queue for today's confirmed appointments. Queue state: waiting → called → in-consultation → completed. Actions: call next patient, skip, complete. Wait time tracking with color-coded urgency. AI triage score display (from `patient_queue.ai_triage_score`). |

### Content Management Pages

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 13 | [Medical Consultants](Pages/Doctor-Portal/12_Medical_Consultants_Page.md) | `/consultants` | `MedicalConsultants.tsx` | Specialist directory with search/filter. Card view: photo, name, specialty, hospital, rating, availability badge. Actions: view details, rate (1-5 stars + comment), contact (email/phone). Admin: add, edit, delete, toggle availability. |
| 14 | [Medical Content](Pages/Doctor-Portal/13_Medical_Content_Page.md) | `/medical-content` | `MedicalContent.tsx` | Health education content management. Create/edit articles with rich text editor. Thai-first: Thai fields required, English optional. Image upload/inline support. Category and tag management. Status workflow: draft → pending → published. Admin approval queue with pending count badge. |
| 15 | [Clinical Resources](Pages/Doctor-Portal/14_Clinical_Resources_Page.md) | `/clinical-resources` | `ClinicalResources.tsx` | Clinical guidelines and protocols. Same CRUD and approval workflow as Medical Content. Resource types: guideline, protocol, research paper, case study. RAG-indexed for AI search. References and source citation support. |

### AI Tools

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 16 | [Gemini AI Studio](Pages/Doctor-Portal/15_Gemini_AI_Studio.md) | FAB Modal (all pages) | `GeminiAIStudio.tsx` | Floating action button (bottom-right) accessible from ANY page. **AI Chat**: Context-aware medical assistant powered by Gemini 2.5 Flash Lite. Uses patient data, EMR, clinical resources as context. **Medical Calculators**: BMI, eGFR (CKD-EPI), MELD Score, CHA₂DS₂-VASc, CURB-65, Wells Score, etc. Chat history saved per session. |

### Profile

| # | Page | Route | Component | Description |
| --- | ------| ------- | -----------| ------------- |
| 17 | [Doctor Profile](Pages/Doctor-Portal/16_Doctor_Profile_Page.md) | `/profile` | `DoctorProfilePage.tsx` | Profile management: name, name_thai, specialty, sub-specialties, hospital, department, qualifications, experience years, consultation fee, bio, bio_thai, languages, avatar. Schedule management: weekly availability slots. |

### Admin-Only Pages

| # | Page | Route | Component | Description | Access |
| --- | ------| ------- | -----------| ------------- | -------- |
| 18 | [Admin Appointment Management](Pages/Doctor-Portal/17_Admin_Appointment_Management.md) | `/admin/appointments` | `AdminAppointmentManagement.tsx` | View ALL appointments across all doctors. Assign unassigned appointments to doctors. Override appointment status. Reschedule on behalf of doctors. Statistics dashboard: daily/weekly/monthly appointment counts. | 🔒 Admin |
| 19 | [Admin Doctor Management](Pages/Doctor-Portal/18_Admin_Doctor_Management.md) | `/admin/doctors` | `AdminDoctorManagement.tsx` | Review pending doctor registrations. Approve/reject with reason. View all doctor profiles. Edit doctor details. Deactivate/reactivate accounts. License verification. | 🔒 Admin |
| 20 | [Doctors Management](Pages/Doctor-Portal/19_Doctors_Management_Page.md) | `/doctors` | `DoctorsManagement.tsx` | Doctor directory for all portal users. View doctor profiles with specialty, hospital, availability, rating. Search and filter. Different from admin management — no approval controls. | Doctor/Admin |
| 21 | [Appointment Pool](Pages/Doctor-Portal/20_Appointment_Pool_Management.md) | `/appointment-pool-management` | `AppointmentPoolManagement.tsx` | Unassigned appointment queue. Doctors view appointments matching their specialty. Actions: claim appointment, view patient summary. Flow: pending → AI-matched → claimed → admin-assigned. Prevents double-claiming with optimistic locking. | Doctor/Admin |

---

## 7. Meeting Server

> **Full Page Documentation:** [Pages/Meeting-Server/00_Meeting_Server_Overview.md](Pages/Meeting-Server/00_Meeting_Server_Overview.md)

| Property | Value |
| ---------- | ------- |
| **Port** | 3020 (local), 3020 (Cloud Run) |
| **Runtime** | Node.js 22 + Express + Socket.IO (ES Modules) |
| **AI** | Gemini 2.5 Flash Lite (SOAP generation) |
| **Video** | Jitsi Meet (meet.jit.si) |
| **Transcription** | Web Speech API (browser-native, FREE) |
| **Database** | PostgreSQL (izara_phase1) with pgvector |
| **Connection Pool** | 30 max (production), 20 max (dev) |
| **Memory** | 2GB (Cloud Run — more than portals for AI processing) |
| **Auth** | JWT (rotating secrets, exits if missing in production) |
| **Healthcheck** | `/health` endpoint, 30s interval |

## Core Responsibilities

1. **Meeting Lifecycle**: Create Jitsi rooms → manage lobby → start/end meetings
2. **Real-Time Transcription**: Socket.IO events for transcript streaming with speaker labels
3. **Chat Aggregation**: Capture and store all in-meeting chat messages
4. **AI Post-Processing**: Gemini 2.5 Flash Lite generates SOAP summaries from transcript + chat
5. **Recording Storage**: BYTEA column in PostgreSQL (primary), filesystem fallback
6. **Man-in-the-Loop**: Doctor approval workflow for AI-generated content
7. **Patient Delivery**: Validated summaries and instruction sheets sent to patient

---

## 8. Data Flow Diagrams

### 8.1 Appointment → Meeting → EMR Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT → MEETING → EMR FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PATIENT PORTAL                    DOCTOR PORTAL                             │
│  ┌─────────────────┐              ┌─────────────────┐                       │
│  │ 1. Book Appt    │──SQL INSERT──│ 2. Confirm Appt │                       │
│  │    /appointments │  ──NOTIFY──→│    /health-mtg   │                       │
│  └────────┬────────┘              └────────┬────────┘                       │
│           │                                 │                                │
│           │                                 ▼                                │
│           │                        ┌─────────────────┐                       │
│           │                        │ 3. AI Pre-Consult│                       │
│           │                        │    Gemini summary│                       │
│           │                        └────────┬────────┘                       │
│           │                                 │                                │
│           ▼                                 ▼                                │
│  ┌─────────────────┐              ┌─────────────────┐                       │
│  │ 4. Join Lobby    │     Jitsi   │ 5. Start Meeting │                       │
│  │    (wait for     │◄───Meet────►│    (HOST)         │                       │
│  │     admission)   │             │    + Transcript   │                       │
│  └────────┬────────┘              │    + Chat          │                      │
│           │                        │    + Recording     │                      │
│           │                        └────────┬────────┘                       │
│           │                                 │                                │
│           │              MEETING SERVER      │                                │
│           │              ┌──────────────┐    │                                │
│           │              │ 6. AI Pipeline│◄──┘                                │
│           │              │    Gemini SOAP│                                    │
│           │              │    + Summary  │                                    │
│           │              └──────┬───────┘                                    │
│           │                     │                                             │
│           │                     ▼                                             │
│           │              ┌──────────────┐                                    │
│           │              │ 7. Man-in-   │                                    │
│           │              │    the-Loop   │──→ Doctor validates                │
│           │              └──────┬───────┘                                    │
│           │                     │                                             │
│           │                     ▼                                             │
│           │              ┌──────────────┐                                    │
│           │              │ 8. EMR Editor │                                    │
│           │              │    AI-prefill  │                                    │
│           │              │    SOAP tabs   │                                    │
│           │              │    + Sign       │                                   │
│           │              └──────┬───────┘                                    │
│           │                     │                                             │
│           ▼                     ▼                                             │
│  ┌─────────────────┐  ┌──────────────────┐                                  │
│  │ 9. Receive       │  │ Prescriptions +   │                                  │
│  │    - EMR Summary  │  │ Lab Orders +      │                                  │
│  │    - Instructions │  │ Imaging Orders    │                                  │
│  │    - Follow-up    │  │ + Follow-up       │                                  │
│  └─────────────────┘  └──────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 AI Summary Pipeline

```text
┌─────────────────────────────────────────────────────────────────┐
│                      AI SUMMARY PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT (from meeting)                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Transcript   │  │ Chat Msgs   │  │ Duration    │             │
│  │ (segments)   │  │ (captured)  │  │ (metadata)  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┼─────────────────┘                     │
│                          ▼                                       │
│               ┌─────────────────────┐                            │
│               │  Gemini 2.5 Flash   │                            │
│               │  Lite Processing    │                            │
│               │                     │                            │
│               │  • Chunk into 30min │                            │
│               │    sections (long   │                            │
│               │    meetings)        │                            │
│               │  • SOAP format      │                            │
│               │  • Thai language    │                            │
│               │  • Red flags        │                            │
│               └──────────┬──────────┘                            │
│                          │                                       │
│  OUTPUT                  ▼                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ SOAP Summary│  │ Patient     │  │ Red Flags   │             │
│  │ (S/O/A/P)   │  │ Instructions│  │ & Alerts    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                 │                     │
│         ▼                ▼                 ▼                     │
│  ┌──────────────────────────────────────────────┐               │
│  │          DOCTOR MAN-IN-THE-LOOP              │               │
│  │  Review → Edit → Approve/Reject each section │               │
│  └──────────────────────┬───────────────────────┘               │
│                         │                                        │
│            ┌────────────┼────────────┐                           │
│            ▼            ▼            ▼                           │
│      ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│      │  EMR     │ │ Patient  │ │ Follow-up│                    │
│      │ (signed) │ │ Sheet    │ │ Schedule │                    │
│      └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Cross-Portal Data Sync

```text
┌─────────────────────────────────────────────────────────────────┐
│                  CROSS-PORTAL DATA SYNC                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PostgreSQL NOTIFY → pgNotifyListener → Socket.IO → React State  │
│                                                                  │
│  Example: Doctor confirms appointment                            │
│                                                                  │
│  Doctor Portal                  PostgreSQL                       │
│  ┌──────────────┐              ┌──────────────┐                 │
│  │ UPDATE appts │──────SQL────►│ appointments  │                 │
│  │ SET status=  │              │ table updated │                 │
│  │  'confirmed' │              └──────┬───────┘                 │
│  └──────────────┘                     │                          │
│                                       ▼                          │
│                          ┌────────────────────┐                  │
│                          │ trg_appointments_  │                  │
│                          │ notify FIRES       │                  │
│                          │ pg_notify(          │                  │
│                          │  'data_changes',   │                  │
│                          │  {table, op, id})  │                  │
│                          └─────────┬──────────┘                  │
│                                    │                             │
│              ┌─────────────────────┼─────────────────┐           │
│              ▼                     ▼                  ▼           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ Patient Portal  │  │ Doctor Portal  │  │ Meeting Server │    │
│  │ pgNotifyListener│  │ pgNotifyListener│  │ pgNotifyListener│   │
│  │      │          │  │      │         │  │      │         │    │
│  │      ▼          │  │      ▼         │  │      ▼         │    │
│  │  Socket.IO emit │  │  Socket.IO emit│  │  Socket.IO emit│    │
│  │      │          │  │      │         │  │      │         │    │
│  │      ▼          │  │      ▼         │  │      ▼         │    │
│  │  React updates  │  │  React updates │  │  Event handler │    │
│  │  appointment UI │  │  schedule view │  │  meeting state │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Notification Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGER EVENT                                                   │
│  (appointment confirmed, EMR signed, lab results, etc.)          │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │ INSERT INTO       │                                           │
│  │ notifications     │                                           │
│  │ (user_id, type,   │                                           │
│  │  title, message,  │                                           │
│  │  link, metadata)  │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ trg_notifications │────►│ pgNotifyListener  │                  │
│  │ _notify           │     │ → Socket.IO emit  │                  │
│  └──────────────────┘     └────────┬─────────┘                  │
│                                     │                            │
│              ┌──────────────────────┤                            │
│              ▼                      ▼                            │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ REAL-TIME           │  │ FALLBACK            │                 │
│  │ Socket.IO → React   │  │ Polling every 30s   │                 │
│  │ NotificationBell    │  │ GET /api/notifs     │                 │
│  │ updates instantly   │  │ unread count        │                 │
│  └────────────────────┘  └────────────────────┘                 │
│                                                                  │
│  ADDITIONAL CHANNELS (based on notification_preferences):        │
│  ├── Email (Gmail API) — appointment confirmations, EMR ready    │
│  ├── Browser Push — meeting reminders, urgent alerts             │
│  └── LINE Notify (Phase 2) — Thai messaging integration         │
└─────────────────────────────────────────────────────────────────┘
```

### 8.5 Authentication Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐     POST /api/auth/login                           │
│  │ Patient  │────────────────────────────┐                       │
│  │ Portal   │     (email + password)     │                       │
│  └─────────┘                             │                       │
│                                          ▼                       │
│  ┌─────────┐     POST /auth/login  ┌──────────────┐            │
│  │ Doctor   │──────────────────────►│ Express       │            │
│  │ Portal   │                       │ Auth Handler  │            │
│  └─────────┘                        └──────┬───────┘            │
│                                             │                    │
│                              ┌──────────────┤                    │
│                              ▼              ▼                    │
│                    ┌──────────────┐  ┌──────────────┐           │
│                    │ Query users  │  │ bcrypt verify │           │
│                    │ table        │  │ password_hash │           │
│                    └──────┬───────┘  └──────┬───────┘           │
│                           │                  │                   │
│                           ▼                  ▼                   │
│                    ┌───────────────────────────────┐             │
│                    │ CHECK:                         │             │
│                    │ • is_active = true             │             │
│                    │ • locked_until < now           │             │
│                    │ • is_approved = true (doctor)  │             │
│                    └──────────────┬────────────────┘             │
│                                   │                              │
│                         ┌─────────┴──────────┐                   │
│                         ▼                    ▼                   │
│                  ┌─────────────┐     ┌─────────────┐            │
│                  │ SUCCESS      │     │ FAILURE      │            │
│                  │              │     │              │            │
│                  │ Create       │     │ Increment    │            │
│                  │ session in   │     │ login_attempts│           │
│                  │ sessions tbl │     │              │            │
│                  │              │     │ If > threshold│           │
│                  │ Return token │     │ → lock account│           │
│                  │ + user profile│    │              │            │
│                  │ + role        │     │ Return error │            │
│                  └─────────────┘     └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Security & Compliance

### 9.1 OWASP Security Measures

| Control | Implementation |
| --------- | --------------- |
| **Authentication** | bcrypt password hashing, session-based auth with expiring tokens |
| **Authorization** | Role-based access control (patient/doctor/admin), middleware checks |
| **Input Validation** | XSS sanitization on all user inputs (chat messages, form fields) |
| **Rate Limiting** | Per-IP rate limiting (5000 req/min production, configurable) |
| **Security Headers** | X-Content-Type-Options: nosniff, X-Frame-Options: DENY, CSP, HSTS |
| **SQL Injection** | Parameterized queries throughout (PostgreSQL `pg` library) |
| **CORS** | Whitelist-based origin validation (Cloud Run regex, localhost) |
| **Session Management** | Server-side sessions with IP/user_agent logging, forced logout on password change |
| **Secrets** | Google Cloud Secret Manager for production; `.env` files for local only |
| **Audit Trail** | All data access logged in `audit_logs` table |

### 9.2 PDPA Compliance (Thai Personal Data Protection Act)

| Requirement | Implementation |
| ------------- | --------------- |
| **Consent** | Explicit consent checkbox on registration, data sharing, living will |
| **Data Access** | Patients can view who accessed their data via audit log |
| **Data Portability** | Patient can export health records |
| **Right to Erasure** | Account deletion request flow |
| **Data Minimization** | Only necessary data collected per feature |
| **Consent Tracking** | `patient_consents` table with granted_at, expires_at, revoked_at |
| **Living Will** | PDPA-specific sharing controls with audit trail |

### 9.3 HIPAA Considerations

| Measure | Implementation |
| --------- | --------------- |
| **Encryption in Transit** | HTTPS enforced on Cloud Run |
| **Access Control** | Role-based, session-based, patient consent-gated |
| **Audit Logging** | All PHI access logged with timestamp, user, IP |
| **Session Timeout** | Configurable per portal |
| **Password Policy** | Minimum complexity enforced on registration |

---

## 10. Cross-Reference Matrix

### Workflow → Pages → Database Tables

| Workflow | Patient Portal Pages | Doctor Portal Pages | Database Tables |
| ---------- | ---------------------| ------------------- | ---------------- |
| **4.1 Appointment & Meeting** | 04 Dashboard, 05 Appointments, 14 Timeline, 15 Notifications | 03 Dashboard, 04 Schedule, 06 Health Meeting, 07 Virtual Meeting, 08 EMR Editor, 09 Prescribing, 10 Lab Orders, 17 Admin Appointments, 20 Pool, 21 Queue | appointments, emr, meeting_records, meeting_transcripts, meeting_chats, meeting_invites, ai_validations, patient_instructions, prescriptions, lab_orders, follow_ups |
| **4.2 User Management** | 01 Login, 02 Register, 03 Reset Password, 12 Profile | 01 Login, 02 Reset Password, 16 Doctor Profile, 18 Admin Doctor Mgmt, 19 Doctors Mgmt | users, sessions, password_resets, patient_profiles, doctor_profiles, doctor_schedules |
| **4.3 Health Records** | 06 PHR, 14 Timeline | 05 Patient Mgmt, 08 EMR Editor, 09 Prescribing, 10 Lab Orders, 11 Patient Record Viewer | phr, vital_signs, emr, prescriptions, lab_orders, drugs, icd10_codes, health_timeline |
| **4.4 Video Meeting & AI** | 05 Appointments (join) | 06 Health Meeting, 07 Virtual Meeting, 15 AI Studio | meeting_records, meeting_transcripts, meeting_chats, transcript_embeddings, ai_validations |
| **4.5 Content & Resources** | 08 Medical Content Library | 13 Medical Content, 14 Clinical Resources | medical_content, clinical_resources, knowledge_base |
| **4.6 Notifications** | 15 Notification System | 03 Dashboard (alerts) | notifications, notification_preferences, push_subscriptions |
| **4.7 Living Will & PDPA** | 10 PDPA, 11 Living Will | 11 Patient Record Viewer | living_wills, living_will_versions, patient_consents, audit_logs |
| **4.8 Consultants** | — | 12 Medical Consultants | consultants |
| **4.9 Data Sync** | All (via Socket.IO) | All (via Socket.IO) | All 8 trigger tables, sync_queue, audit_logs |

---

## 11. Test Credentials & Verification

### 11.1 Test User Accounts (from seed-dev-data.sql)

| Role | ID | Email | Password | Name (Thai) | Portal |
| ------ | -----| ------- | ----------| ------------- | -------- |
| Admin | ADMIN-TEST-001 | <admin.test@izara.com> | IzaraAdmin@2024 | นพ. ผู้ดูแลระบบ ใจดี | Doctor Portal |
| Doctor | DOC-TEST-001 | <doctor.test@izara.com> | IzaraDoctor@2024 | นพ. ทดสอบ แพทย์ดี | Doctor Portal |
| Doctor | DOC-SOMCHAI-001 | <somchai.prasert@izara.com> | IzaraDoctor@2024 | นพ.สมชาย ประเสริฐ | Doctor Portal |
| Doctor | DOC-SIRIPORN-001 | <siriporn.thongchai@izara.com> | IzaraDoctor@2024 | พญ.ศิริพร ทองชัย | Doctor Portal |
| Patient | PATIENT-DEMO | <demo.test@gmail.com> | P@ssw0rd | นาย ทดสอบ ระบบ | Patient Portal |
| Patient | PATIENT-SOMCHAI | <Somchai.Mankong@gmail.com> | P@ssw0rd | นายสมชาย มั่นคง | Patient Portal |
| Patient | PATIENT-ANAN | <Anan.Khayanrian@gmail.com> | P@ssw0rd | นายอนันต์ ขยันเรียน | Patient Portal |

### 11.2 Doctor Profiles (Seeded)

| Doctor | Specialty | Hospital | Rating | Fee |
| -------- | -----------| ---------- | --------| ----- |
| DOC-TEST-001 | Internal Medicine | Izara Test Hospital | 5.0 (10 reviews) | ฿300 |
| DOC-SOMCHAI-001 | Cardiology | Bangkok General Hospital | 4.8 (125 reviews) | ฿500 |
| DOC-SIRIPORN-001 | Endocrinology | Bumrungrad Hospital | 4.9 (200 reviews) | ฿800 |

### 11.3 Playwright Test Suite

| Category | Tests | Description |
| ---------- | -------| ------------- |
| Local Tests | 941 | Full feature coverage |
| Cloud Tests | 311 | Cloud Run deployment verification |
| Fetch Detection | 35 | API endpoint validation |
| **Total** | **1,287** | All passing ✅ |

### 11.4 Access URLs

| Environment | Patient | Doctor | Meeting | pgAdmin |
| ------------- | ---------| -------- | ---------| --------- |
| Local | <http://localhost:3005> | <http://localhost:3010> | <http://localhost:3020> | <http://localhost:5050> |
| Cloud | [Patient Portal](<https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app)> | [Doctor Portal](<https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app)> | [Meeting Server](<https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app)> | — |

---

## 12. Document Index

### Core Workflow Documents (9)

| Document | Description | Key Scenarios |
| ---------- | -------------| --------------- |
| [Appointment_Workflows.md](Appointment_Workflows.md) | Booking → assignment → confirmation → meeting → follow-up | 14 end-to-end scenarios |
| [User_management_Workflows.md](User_management_Workflows.md) | Registration, login, roles, admin approval, password reset | Patient & doctor registration, admin approval, account locking |
| [Health_Records_Processes.md](Health_Records_Processes.md) | PHR, EMR (SOAP), prescriptions, lab orders, imaging | Self-entry, AI-generated EMR, drug interactions, lab flags |
| [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) | Video meeting, Jitsi integration, transcription, AI summary | Multi-party meeting, lobby, transcript streaming, AI SOAP pipeline |
| [Medicine_Content_Processes.md](Medicine_Content_Processes.md) | Medical content CRUD, approval workflow, patient library | Thai-first policy, admin approval, RAG indexing |
| [Clinical_Resources_&_Medical_Library_Workflows.md](Clinical_Resources_&_Medical_Library_Workflows.md) | Clinical guidelines, protocols, RAG knowledge base | Doctor CRUD, admin approval, AI search |
| [Medical_Consultants_Workflows.md](Medical_Consultants_Workflows.md) | Specialist directory, consultant management | Admin CRUD, doctor rating, availability toggle |
| [Notification_Workflows.md](Notification_Workflows.md) | In-app, email, push notifications, preferences | 15+ event types, real-time via NOTIFY, polling fallback |
| [Data_Sync_Documentation.md](Data_Sync_Documentation.md) | PostgreSQL sync, NOTIFY triggers, audit trail | 8 triggers, Socket.IO events, cross-portal sync |

### Living Will & PDPA Documents (2)

| Document | Description |
| ---------- | ------------- |
| [Living_Will_Processes.md](Living_Will_Processes.md) | 4-step wizard, healthcare proxy, PDPA sharing controls, audit trail |
| [Living_Will_Implementation_Plan.md](Living_Will_Implementation_Plan.md) | TypeScript interfaces, API design, database schema, component specs |

### UI & Requirements Documents (2)

| Document | Description |
| ---------- | ------------- |
| [UI_Pages_Workflows.md](UI_Pages_Workflows.md) | Cross-page navigation flows and UI patterns |
| [PHASE1_REQUIREMENTS.md](PHASE1_REQUIREMENTS.md) | Original Phase 1 stakeholder requirements (Dr. Isara + P. Beer) |

### Page-by-Page Documentation (37 Pages)

| Folder | Pages | Description |
| -------- | -------| ------------- |
| [Pages/Patient-Portal/](Pages/Patient-Portal/) | 15 pages | Login, Register, Reset Password, Dashboard, Appointments, PHR, AI Doctor, Medical Library, Map, PDPA, Living Will, Profile, Settings, Timeline, Notifications |
| [Pages/Doctor-Portal/](Pages/Doctor-Portal/) | 21 pages | Login, Reset Password, Dashboard, Schedule, Patient Mgmt, Health Meeting, Virtual Meeting, EMR Editor, Prescribing, Lab Orders, Patient Record Viewer, Consultants, Medical Content, Clinical Resources, AI Studio, Profile, Admin Appointments, Admin Doctors, Doctors Mgmt, Appointment Pool, Queue Mgmt |
| [Pages/Meeting-Server/](Pages/Meeting-Server/) | 1 page | Meeting Server architecture, API endpoints, Socket.IO events, AI pipeline |

### Thai Translations (7)

| Document | Description |
| ---------- | ------------- |
| [Thai/](Thai/) | Thai-language versions: Appointment, Data Sync, Health Records, Notification, User Management, Video Meeting workflows |

---

## 🆕 Version History

### v1.5.9 (March 2026) — Current

- All Phase 1 features verified and tested (1,287 Playwright tests)

- PostgreSQL as sole data store (GCS disabled for live data)

- Camera/Mic default ON fix

- Zoom UX improvements

- Cloud deployment verified on GCE VM database

### v1.5.6 (February 2026)

- Docker Compose updated to 5 services

- Meeting Server separated as independent service

- Imaging Orders added (full CRUD)

### v1.5.2 (January 2026)

- Lab Orders & Prescriptions migrated to PostgreSQL

- Embedded PG for Cloud Run (later replaced by GCE VM)

- Mobile docs archived (web-only scope)
