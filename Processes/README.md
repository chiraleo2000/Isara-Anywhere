# 📄 Izara Telemedicine — Comprehensive Workflows, Processes & Architecture

**Version:** 1.7.54
**Last Updated:** June 25, 2026
**Focus:** Web Application Only (Patient Portal + Doctor Portal + Meeting Server)
**Status:** ✅ Phase 1 Complete — see [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) for diagrams

> **Hub navigation:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) · [Combined_Workflows](Combined_Workflows_And_Actions.md) · [Pages/](Pages/)

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
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | AI model selection |
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


### 3.3 Database Tables — Complete Catalog (53+ Tables)

> **Quick reference:** [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) — all tables with descriptions and workflow mapping.  
> **Connection diagrams:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) — platform topology, pipeline, realtime chain.

See linked docs for full column definitions (do not duplicate table catalogs here).

### 3.4 Real-Time Sync (PostgreSQL NOTIFY Triggers)

Eight triggers on data changes → `pg_notify('data_changes')` → `pgNotifyListener` → Socket.IO.  
**Full diagram + event catalog:** [Data_Sync_Documentation.md](Data_Sync_Documentation.md) · [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) §4.

---


## 4. Core Workflows


### 4.1 Appointment & Meeting Workflow (End-to-End)

> **Connection diagrams:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md)  
> **Step detail:** [Appointment_Workflows.md](Appointment_Workflows.md) · [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) · [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md)  
> **Page map:** [Pages/README.md](Pages/README.md)

```text
Book → pool/assign → confirm → Jitsi (HOST=doctor) → transcript → Gemini SOAP
  → man-in-the-loop → EMR + Rx + labs → patient instructions → notification
```

| # | Scenario | Doc section |
| - | -------- | ----------- |
| 1–3 | Book, assign, confirm | Appointment_Workflows |
| 4–7 | Pre-meeting AI, video, transcript, recording | VIDEO_MEETING_JITSI_GEMINI |
| 8–9 | Post-meeting AI, doctor validation | POST_MEETING_WORKFLOW |
| 10–12 | EMR, orders, patient instructions | Health_Records_Processes |
| 13–14 | Patient delivery, follow-up | Combined_Workflows §1, Appointment §follow-up |

**Tables:** `appointments`, `meeting_records`, `meeting_transcripts`, `ai_validations`, `emr`, `prescriptions`, `lab_orders`, `patient_instructions`, `notifications` — see [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md).

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
| Biometric Auth | Fingerprint/face ID (schema ready) | 📋 |
| JWT Token Rotation | Refresh tokens with device tracking (schema ready) | 📋 |


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
| **Offline Sync** | `sync_queue` table with conflict resolution | On reconnect |


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

> **Canonical specs:** [Pages/Patient-Portal/](Pages/Patient-Portal/) · **Feature map:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) §5

| # | Page | Route | Spec |
| - | ---- | ----- | ---- |
| 1 | Login | `/login` | [01_Login_Page.md](Pages/Patient-Portal/01_Login_Page.md) |
| 2 | Register | `/register` | [02_Register_Page.md](Pages/Patient-Portal/02_Register_Page.md) |
| 3 | Reset Password | `/reset-password` | [03_Reset_Password_Page.md](Pages/Patient-Portal/03_Reset_Password_Page.md) |
| 4 | Dashboard | `/` | [04_Dashboard_Page.md](Pages/Patient-Portal/04_Dashboard_Page.md) |
| 5 | Appointments | `/appointments` | [05_Appointments_Page.md](Pages/Patient-Portal/05_Appointments_Page.md) |
| 6 | PHR | `/phr` | [06_PHR_Page.md](Pages/Patient-Portal/06_PHR_Page.md) |
| 7 | AI Doctor | `/ai-doctor` | [07_AI_Doctor_Page.md](Pages/Patient-Portal/07_AI_Doctor_Page.md) |
| 8 | Health Library | `/health-library` | [08_Medical_Content_Library.md](Pages/Patient-Portal/08_Medical_Content_Library.md) |
| 9 | Map | `/map` | [09_Map_Page.md](Pages/Patient-Portal/09_Map_Page.md) |
| 10 | PDPA | `/pdpa` | [10_PDPA_Page.md](Pages/Patient-Portal/10_PDPA_Page.md) |
| 11 | Living Will | `/living-will` | [11_Living_Will_Page.md](Pages/Patient-Portal/11_Living_Will_Page.md) |
| 12 | Profile | `/profile` | [12_Profile_Page.md](Pages/Patient-Portal/12_Profile_Page.md) |
| 13 | Settings | `/settings` | [13_Settings_Page.md](Pages/Patient-Portal/13_Settings_Page.md) |
| 14 | Timeline | `/timeline` | [14_Timeline_Page.md](Pages/Patient-Portal/14_Timeline_Page.md) |
| 15 | Notifications | header bell | [15_Notification_System.md](Pages/Patient-Portal/15_Notification_System.md) |

---


## 6. Doctor Portal Pages (21 Pages)

> **Canonical specs:** [Pages/Doctor-Portal/](Pages/Doctor-Portal/) · Meeting route: `/meeting/:id` → [01_Meeting_Room.md](Pages/Meeting-Server/01_Meeting_Room.md)

| # | Page | Route | Spec |
| - | ---- | ----- | ---- |
| 1–2 | Login, Reset | `/login`, `/reset-password` | [01](Pages/Doctor-Portal/01_Login_Page.md), [02](Pages/Doctor-Portal/02_Reset_Password_Page.md) |
| 3–4 | Dashboard, Schedule | `/dashboard`, `/schedule` | [03](Pages/Doctor-Portal/03_Dashboard_Page.md), [04](Pages/Doctor-Portal/04_Schedule_Page.md) |
| 5–11 | Patients, Meeting, EMR, Rx, Labs, Records | `/patients`, `/health-meeting`, modals | [05–11](Pages/Doctor-Portal/05_Patient_Management_Page.md) |
| 12 | Consultants | `/consultants` | [12_Medical_Consultants_Page.md](Pages/Doctor-Portal/12_Medical_Consultants_Page.md) |
| 13–14 | Content, Resources | `/medical-content`, `/clinical-resources` | [13](Pages/Doctor-Portal/13_Medical_Content_Page.md), [14](Pages/Doctor-Portal/14_Clinical_Resources_Page.md) |
| 15–16 | AI Studio, Profile | FAB, `/profile` | [15](Pages/Doctor-Portal/15_Gemini_AI_Studio.md), [16](Pages/Doctor-Portal/16_Doctor_Profile_Page.md) |
| 17–21 | Admin + pool + queue | `/admin/*`, `/appointment-pool-management` | [17–21](Pages/Doctor-Portal/17_Admin_Appointment_Management.md) |

Legacy: [07_Virtual_Meeting.md](Pages/Doctor-Portal/07_Virtual_Meeting.md) (stub — use Meeting Server spec).

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


### 11.3 Automated Test Suite (June 8, 2026 — v1.7.51)

| Category | Count | Description |
| ---------- | -------| ------------- |
| Vitest (Docker `test:unit:docker`) | **2982** | Unit + integration across doctor/patient/cross-portal/meeting-server |
| Meeting-server HTTP contracts | **78** | `test:meeting-server:contract` |
| Local E2E core pipeline | **35 passed, 0 skipped** | A-auth → D (incl. **D4cal** calendar) → D-doctor-host → Q (3-party 10s) → E → F → L (**L1 unskipped**) |
| Jitsi prejoin + role matrix (J + R) | **16/16** | Patient lobby + JWT moderator rules |
| Cloud full Playwright (headed) | **85/85** | Cloud Run verification (2026-05-31) |
| Docker Group W multi-browser | **18/18** | Chromium + Firefox + WebKit (2026-06-05) |
| Quality gate | PASS | `npm run test:quality:gate` (Sonar) |

**Key workflow tests:** `group-D-appointment-workflows` (D4cal), `group-Q-meeting-lifecycle` (Q01f 3-party), `group-L-lab-ordering` (L1 login JWT), `group-J-patient-jitsi-prejoin`, `group-R-jitsi-role-permissions`

**Evidence:** `reports/defect-fix/DEFECT_REGISTER.md` · Matrix: `tests/PROCESS_COVERAGE_MATRIX.md` · Coverage doc: `Documents/docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md`


### 11.4 Access URLs

| Environment | Patient | Doctor | Meeting | pgAdmin |
| ------------- | ---------| -------- | ---------| --------- |
| Local | <http://localhost:3005> | <http://localhost:3010> | <http://localhost:3020> | <http://localhost:5050> |
| Cloud | [Patient Portal](<https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app)> | [Doctor Portal](<https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app)> | [Meeting Server](<https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app)> | — |

---


## 12. Document Index


### Database Documents (3)

| Document | Description |
| ---------- | ------------- |
| [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) | **Platform topology, pipeline, realtime, feature matrix (diagrams)** |
| [PostgreSQL_Database_Architecture.md](PostgreSQL_Database_Architecture.md) | Full schema, ER diagram, NOTIFY triggers, migrations |
| [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) | All 53+ tables with descriptions and workflow mapping |

### Workflow index documents (2)

| Document | Description |
| ---------- | ------------- |
| [Combined_Workflows_And_Actions.md](Combined_Workflows_And_Actions.md) | End-to-end patient/doctor/admin journeys |
| [Separated_Workflows_And_Functions.md](Separated_Workflows_And_Functions.md) | Atomic domain sections A–U |

### Contracts & gates (5)

| Document | Description |
| ---------- | ------------- |
| [FULL_WORKFLOW_CONTRACT.md](FULL_WORKFLOW_CONTRACT.md) | Canonical acceptance contract (+ baseline topology) |
| [PHASE1_REQUIREMENTS.md](PHASE1_REQUIREMENTS.md) | Stakeholder requirements |
| [GATE0_IMPLEMENTATION_STATUS.md](GATE0_IMPLEMENTATION_STATUS.md) | Appointment pool / host contract status |
| [PROCESS_TO_TEST_GATE.md](PROCESS_TO_TEST_GATE.md) | Process doc → test commands |
| [ENV_AND_STACK_CHECK.md](ENV_AND_STACK_CHECK.md) | Ports, env, Docker health |

### Core Workflow Documents (10)

| Document | Description | Key Scenarios |
| ---------- | -------------| --------------- |
| [Appointment_Workflows.md](Appointment_Workflows.md) | Booking → assignment → confirmation → **calendar sync** → meeting → follow-up | 14+ scenarios incl. D4cal |
| [User_management_Workflows.md](User_management_Workflows.md) | Registration, login, roles, admin approval, password reset | Patient & doctor registration, admin approval, account locking |
| [Health_Records_Processes.md](Health_Records_Processes.md) | PHR, EMR (SOAP), prescriptions, lab orders, imaging | Self-entry, AI-generated EMR, drug interactions, lab flags |
| [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) | Video meeting, Jitsi integration, transcription, AI summary | Multi-party meeting, lobby, transcript streaming, AI SOAP pipeline |
| [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md) | Post-meeting recording, Gemini summary, MeetingResults, patient delivery | End meeting → results_ready pipeline |
| [Medicine_Content_Processes.md](Medicine_Content_Processes.md) | Medical content CRUD, approval workflow, patient library | Thai-first policy, admin approval, RAG indexing |
| [Clinical_Resources_&_Medical_Library_Workflows.md](Clinical_Resources_&_Medical_Library_Workflows.md) | Clinical guidelines, protocols, RAG knowledge base | Doctor CRUD, admin approval, AI search |
| [Medical_Consultants_Workflows.md](Medical_Consultants_Workflows.md) | Specialist directory, consultant management | Admin CRUD, doctor rating, availability toggle |
| [Notification_Workflows.md](Notification_Workflows.md) | In-app, email, push notifications, preferences | 16+ event types incl. `schedule_entry_ready` + `calendarEventUrl` on confirm |
| [Data_Sync_Documentation.md](Data_Sync_Documentation.md) | PostgreSQL sync, NOTIFY triggers, audit trail | 8 triggers, Socket.IO events, cross-portal sync |


### Living Will & PDPA Documents (2)

| Document | Description |
| ---------- | ------------- |
| [Living_Will_Processes.md](Living_Will_Processes.md) | 4-step wizard, healthcare proxy, PDPA sharing controls, audit trail |

> Archived: [Living_Will_Implementation_Plan.md](Living_Will_Implementation_Plan.md) (merged) · [UI_Pages_Workflows.md](UI_Pages_Workflows.md) (use `Pages/`)

### UI & Requirements Documents (1)

| Document | Description |
| ---------- | ------------- |
| [PHASE1_REQUIREMENTS.md](PHASE1_REQUIREMENTS.md) | Original Phase 1 stakeholder requirements (Dr. Isara + P. Beer) |


### Page-by-Page Documentation (37 Pages)

| Folder | Pages | Description |
| -------- | -------| ------------- |
| [Pages/Patient-Portal/](Pages/Patient-Portal/) | 15 pages | Login, Register, Reset Password, Dashboard, Appointments, PHR, AI Doctor, Medical Library, Map, PDPA, Living Will, Profile, Settings, Timeline, Notifications |
| [Pages/Doctor-Portal/](Pages/Doctor-Portal/) | 21 pages | Login, Reset Password, Dashboard, Schedule, Patient Mgmt, Health Meeting, Virtual Meeting, EMR Editor, Prescribing, Lab Orders, Patient Record Viewer, Consultants, Medical Content, Clinical Resources, AI Studio, Profile, Admin Appointments, Admin Doctors, Doctors Mgmt, Appointment Pool, Queue Mgmt |
| [Pages/Meeting-Server/](Pages/Meeting-Server/) | 4 pages | Meeting Server architecture, Meeting Room, Meeting Results, EMR page |


### Thai Translations (7)

| Document | Description |
| ---------- | ------------- |
| [Thai/](Thai/) | Thai-language versions: Appointment, Data Sync, Health Records, Notification, User Management, Video Meeting workflows |

---


## 🆕 Version History


### v1.7.54 (June 25, 2026) — Current

- New [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) — mermaid topology, pipeline, feature matrix
- README trimmed: table catalog, 14 scenarios, page blurbs → links to domain docs and `Pages/`
- Archived stubs: `UI_Pages_Workflows`, `07_Virtual_Meeting`, `PHASE1_BASELINE` (merged into FULL_WORKFLOW_CONTRACT)

### v1.7.52 (June 25, 2026)

- Database tables reference: [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) — 53+ tables with workflow mapping
- Removed unimplemented Phase 2 planning docs; schema tables documented against actual migrations
- Project cleanup: old reports, redirect stubs, deprecated scripts

### v1.7.51 (June 8, 2026)

- Calendar sync on doctor confirm: `calendarEventUrl`, doctor `/schedule`, patient MiniCalendar + detail link
- 3-party meeting E2E Q01f (10s A/V hold); L1 unskip via doctor login JWT
- Local gate: **2982** Vitest, **35** E2E core (0 skipped), J+R **16/16**
- Docs: `Appointment_Workflows` §6, `Notification_Workflows` §3.4, `04_Schedule_Page`, `05_Appointments_Page`, `Documents/` technical + testing ledgers

### v1.5.9 (March 2026)


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
