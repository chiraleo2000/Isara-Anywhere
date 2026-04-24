# 📋 Izara Telemedicine — Unified Specification Kit

**Version:** 1.5.2
**Date:** March 1, 2026
**Status:** ✅ Phase 1 Complete — Web Platform
**Focus:** Web Application Only (Patient Portal + Doctor Portal + Meeting Server)

---


## 1. Executive Summary

Izara Telemedicine (อิสระ เทเลเมดิซิน) is a full-stack web-based telemedicine platform designed for Thailand's healthcare ecosystem. It provides video consultations, EMR/EHR management, e-prescribing, lab & imaging orders, AI-powered clinical assistance, and PDPA-compliant data handling.


### 1.1 Services

| Service | Port | Stack | Users |
| ---------|------|-------|------- |
| **Patient Portal** | 3005 | React 18 + Vite + Express + PostgreSQL | Patients, Caregivers |
| **Doctor Portal** | 3010 | React 18 + Vite + 3 Express servers + Nginx + PostgreSQL | Doctors, Admins |
| **Meeting Server** | 3020 | Express + Socket.IO + Jitsi + Gemini AI | Video Consultations |




### 1.2 Key Metrics

| Metric | Value |
| --------|------- |
| Unit Tests | 409 (Vitest, 15 suites) |
| E2E Tests | 808 (Playwright, 10 specs) |
| Database Tables | 42 |
| Patient Portal Pages | 15 |
| Doctor Portal Pages | 21 |
| API Endpoints | 100+ |
| Languages | Thai (primary) + English |



---


## 2. System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     IZARA TELEMEDICINE v1.5.2                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│   │  Patient Portal │  │  Doctor Portal  │  │  Meeting Server        │  │
│   │  React + Vite   │  │  React + Vite   │  │  Express + Socket.IO   │  │
│   │  Express (tsx)  │  │  Nginx → 3 APIs │  │  Jitsi + Gemini AI     │  │
│   │  Port 3005      │  │  Port 3010→8080 │  │  Port 3020             │  │
│   └────────┬────────┘  └────────┬────────┘  └─────────┬──────────────┘  │
│            │                    │                      │                 │
│            └────────────────────┼──────────────────────┘                 │
│                                 ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │         PostgreSQL 16 + pgvector (42 tables)                      │  │
│   │         Local: Docker port 5433 | Cloud: Embedded in Cloud Run    │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                     EXTERNAL SERVICES                            │    │
│   │  • Jitsi Meet (meet.jit.si) — Video Conferencing (FREE)         │    │
│   │  • Google Gemini AI — Chat, CDS, SOAP Summaries (FREE tier)     │    │
│   │  • Web Speech API — Live Transcription (FREE, browser-native)   │    │
│   │  • Google Maps — Healthcare Map (API key required)               │    │
│   │  • Google Cloud Run — Production hosting (pay-per-use)           │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```


### 2.1 Doctor Portal Internal Architecture

```text
Client Request → Nginx (port 8080)
                    ├── /auth/*        → authServer.cjs (port 3011)
                    ├── /api/gcs/*     → gcsApiServer.cjs (port 3012)
                    ├── /api/*         → mainApiServer.cjs (port 3009)
                    └── /*             → Static React build
```


### 2.2 Technology Stack

| Layer | Technology | Cost |
| -------|-----------|------ |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS | Free |
| Backend | Node.js 22, Express.js | Free |
| Database | PostgreSQL 16 + pgvector + pgcrypto | Free |
| Video | Jitsi Meet (meet.jit.si) | Free |
| Transcription | Web Speech API (browser-native) | Free |
| AI | Google Gemini 2.5 Flash Lite | Free tier |
| Maps | Google Maps JavaScript API | API key |
| Container | Docker + Docker Compose | Free |
| Cloud | Google Cloud Run (embedded PG) | Pay-per-use |
| CI/CD | Google Cloud Build | Pay-per-use |



---


## 3. Complete Feature Matrix


### 3.1 Authentication & User Management

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| AUTH-001 | Patient Registration (2-step form) | Patient | ✅ |
| AUTH-002 | Patient Login (session token, 30m TTL) | Patient | ✅ |
| AUTH-003 | Doctor Login (JWT, role: doctor/admin) | Doctor | ✅ |
| AUTH-004 | Password Reset (email token) | All | ✅ |
| AUTH-005 | Session Auto-Logout (30m inactivity) | All | ✅ |
| AUTH-006 | Role-Based Access Control (RBAC middleware) | All | ✅ |
| AUTH-007 | Account Lockout (5 attempts → 15m lock) | All | ✅ |
| AUTH-008 | Admin Doctor Approval workflow | Admin | ✅ Fixed v1.5.2 |




### 3.2 Appointments

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| APPT-001 | Book Appointment (multi-step) | Patient | ✅ |
| APPT-002 | AI Symptom Analysis (Gemini) | Patient | ✅ |
| APPT-003 | Admin Assignment (manual/AI) | Admin | ✅ |
| APPT-004 | Doctor Schedule (day/week/month calendar) | Doctor | ✅ |
| APPT-005 | Cancel Appointment (with reason) | Patient/Doctor | ✅ |
| APPT-006 | Reschedule Appointment | Patient/Doctor | ✅ |
| APPT-007 | Appointment Pool (doctor claims) | Doctor | ✅ |
| APPT-008 | Queue Management (call/skip/complete) | Doctor | ✅ |
| APPT-009 | Meeting Link Generation (Jitsi) | System | ✅ |




### 3.3 Video Meeting & Transcription

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| MEET-001 | Create Meeting Room (doctor as HOST) | Doctor | ✅ |
| MEET-002 | Patient Join (lobby approval) | Patient | ✅ |
| MEET-003 | Guest Invite (link-based) | Doctor | ✅ |
| MEET-004 | Live Transcription (Web Speech API) | System | ✅ |
| MEET-005 | Transcript Streaming (Socket.IO) | System | ✅ |
| MEET-006 | AI SOAP Summary (Gemini) | Doctor | ✅ |
| MEET-007 | AI Patient Instructions (Thai/EN) | Doctor | ✅ |
| MEET-008 | AI Pre-Consultation Summary | Doctor | ✅ |
| MEET-009 | CDS Alerts (drug interactions) | System | ✅ |
| MEET-010 | Man-in-Loop AI Validation | Doctor | ✅ |
| MEET-011 | In-Meeting Chat (Socket.IO) | All | ✅ |




### 3.4 Health Records

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| PHR-001 | Vital Signs CRUD | Patient | ✅ |
| PHR-002 | Medication Management | Patient | ✅ |
| PHR-003 | Allergy Records | Patient | ✅ |
| PHR-004 | Health Overview Dashboard | Patient | ✅ |
| EMR-001 | Create EMR (SOAP + ICD-10) | Doctor | ✅ |
| EMR-002 | AI Draft EMR (from transcript) | Doctor | ✅ |
| EMR-003 | E-Prescribing (PostgreSQL) | Doctor | ✅ Fixed v1.5.2 |
| EMR-004 | Lab Orders (PostgreSQL CRUD) | Doctor | ✅ Fixed v1.5.2 |
| EMR-005 | Lab Result Upload (document/image) | Doctor | ✅ New v1.5.2 |
| EMR-006 | Imaging Orders (CRUD + results) | Doctor | ✅ New v1.5.2 |
| EMR-007 | Finalize EMR (digital signature, immutable) | Doctor | ✅ |
| EMR-008 | Amend EMR (versioned) | Doctor | ✅ |




### 3.5 Living Will & PDPA

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| LW-001 | Create Living Will (4-step wizard) | Patient | ✅ |
| LW-002 | Healthcare Proxy Designation | Patient | ✅ |
| LW-003 | PDPA-Controlled Sharing | Patient | ✅ |
| LW-004 | Doctor Read-Only View | Doctor | ✅ |
| PDPA-001 | Consent Management (granular) | Patient | ✅ |
| PDPA-002 | Doctor Access Control | Patient | ✅ |
| PDPA-003 | Audit Log (all data access) | System | ✅ |




### 3.6 Medical Content & Resources

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| MC-001 | Create Content (draft/submit) | Doctor | ✅ |
| MC-002 | Approval Workflow (admin) | Admin | ✅ |
| MC-003 | Patient Library (search/filter) | Patient | ✅ |
| CR-001 | Clinical Guidelines/Protocols | Doctor | ✅ |
| CR-002 | RAG Knowledge Base (pgvector) | Doctor | ✅ |
| MC-004 | Medical Consultant Directory | Doctor/Admin | ✅ |




### 3.7 AI Features

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| AI-001 | AI Health Chat (Gemini) | Patient | ✅ |
| AI-002 | Gemini AI Studio (FAB) | Doctor | ✅ |
| AI-003 | Document Analysis (PDF) | Doctor | ✅ |
| AI-004 | CDS Drug Interaction Check | System | ✅ |
| AI-005 | Knowledge Base RAG Search | Doctor | ✅ |




### 3.8 Notifications & System

| ID | Feature | Actor | Status |
| ----|---------|-------|-------- |
| NOTIF-001 | In-App Notification Bell | All | ✅ |
| NOTIF-002 | Mark as Read | All | ✅ |
| MAP-001 | Healthcare Map (1-20km range) | Patient | ✅ |
| TIME-001 | Treatment Timeline | Patient | ✅ |
| DASH-001 | Patient Dashboard | Patient | ✅ |
| DASH-002 | Doctor Dashboard | Doctor | ✅ |
| SET-001 | Patient Settings | Patient | ✅ |



---


## 4. Portal Pages


### 4.1 Patient Portal (15 pages)

| # | Page | Route | Description |
| ---|------|-------|------------- |
| 01 | Login | `/login` | Email+password authentication |
| 02 | Register | `/register` | 2-step registration (basic + health) |
| 03 | Reset Password | `/reset-password` | Token-based password reset |
| 04 | Dashboard | `/` | Upcoming appointments, health summary |
| 05 | Appointments | `/appointments` | Book, view, cancel, reschedule |
| 06 | PHR | `/health-records` | Vitals, medications, allergies, overview |
| 07 | AI Doctor | `/ai-doctor` | AI health chat (Gemini) |
| 08 | Medical Content | `/content` | Health education library |
| 09 | Healthcare Map | `/map` | Nearby hospitals/clinics (Google Maps) |
| 10 | PDPA | `/pdpa` | Privacy consent management |
| 11 | Living Will | `/living-will` | Advance directive wizard |
| 12 | Profile | `/profile` | Personal info, avatar, emergency contact |
| 13 | Settings | `/settings` | Language, theme, notification prefs |
| 14 | Timeline | `/timeline` | Chronological treatment history |
| 15 | Notifications | Header bell | In-app notification panel |




### 4.2 Doctor Portal (21 pages)

| # | Page | Route | Description |
| ---|------|-------|------------- |
| 01 | Login | `/login` | JWT authentication |
| 02 | Reset Password | `/reset-password` | Token-based reset |
| 03 | Dashboard | `/dashboard` | Today's schedule, stats, tasks |
| 04 | Schedule | `/schedule` | Calendar view (day/week/month) |
| 05 | Patient Management | `/patients` | Patient list + record viewer |
| 06 | Health Meeting | `/meetings` | Meeting list + video launch |
| 07 | Virtual Meeting | `/meeting/:id` | Jitsi video room + transcription |
| 08 | EMR Editor | `/emr/:id` | SOAP note editor + AI assist |
| 09 | Prescribing | `/prescriptions` | Drug search + interaction check |
| 10 | Lab Orders | `/lab-orders` | Lab order CRUD + result upload |
| 11 | Patient Record | `/patients/:id` | Full patient EMR/PHR viewer |
| 12 | Consultants | `/consultants` | Specialist directory |
| 13 | Medical Content | `/content` | Article CRUD + approval |
| 14 | Clinical Resources | `/resources` | Guidelines, protocols, research |
| 15 | AI Studio | FAB button | Gemini AI + calculators |
| 16 | Doctor Profile | `/profile` | Personal + professional info |
| 17 | Admin: Appointments | `/admin/appointments` | All appointment management |
| 18 | Admin: Doctor Mgmt | `/admin/doctors` | Approve/reject doctors |
| 19 | Doctors Management | `/admin/doctor-list` | Active doctor listing |
| 20 | Appointment Pool | `/pool` | Unassigned appointment claiming |
| 21 | Queue Management | `/queue` | Today's patient queue |



---


## 5. Database Schema (42 tables)


### 5.1 Core Tables

```text
AUTH & USERS (6)
├── users                    — All user accounts (patient/doctor/admin)
├── sessions                 — Active login sessions
├── password_resets           — Password reset tokens
├── refresh_tokens            — JWT refresh tokens
├── biometric_credentials     — Biometric auth data
└── device_tokens             — Push notification tokens

PATIENT HEALTH (6)
├── patient_profiles          — Patient demographic data
├── phr                       — Personal Health Records
├── vital_signs               — Vital sign measurements
├── living_wills              — Living will documents
├── living_will_versions      — Living will version history
└── patient_consents          — PDPA consent records

DOCTOR & CLINICAL (5)
├── doctor_profiles           — Doctor professional profiles
├── doctors                   — Doctor scheduling/availability
├── doctor_schedules          — Weekly schedule templates
├── doctor_reviews            — Patient reviews of doctors
└── consultants               — Medical consultant directory

APPOINTMENTS & MEETINGS (3)
├── appointments              — All appointments (FSM: pending→confirmed→completed)
├── meeting_records           — Video meeting metadata
└── meeting_transcripts       — Meeting transcription data

EMR & ORDERS (5)
├── emr                       — Electronic Medical Records (SOAP)
├── prescriptions             — E-prescriptions
├── lab_orders                — Lab test orders + results + documents
├── imaging_orders            — Imaging orders + results (NEW v1.5.2)
└── icd10_codes               — ICD-10 diagnosis codes

CONTENT & KNOWLEDGE (4)
├── medical_content           — Health education articles
├── clinical_resources        — Clinical guidelines/protocols
├── drugs                     — Drug database
└── knowledge_base            — RAG-indexed clinical content

AI & ANALYTICS (5)
├── ai_chat_history           — AI conversation logs
├── ai_chat_memory            — AI context memory
├── ai_document_analysis      — Document analysis results
├── cds_logs                  — CDS alert logs
└── ai_validations            — Man-in-loop AI validations

NOTIFICATIONS & AUDIT (4)
├── notifications             — In-app notifications
├── notification_preferences  — User notification settings
├── push_subscriptions        — Web push subscriptions
└── audit_logs                — Data access audit trail

SYNC & SETTINGS (4)
├── transcript_embeddings     — pgvector transcript embeddings
├── sync_queue                — Data sync queue
├── user_settings             — User preferences
└── user_api_connections      — External API connections
```


### 5.2 Key Relationships

```text
users ──┬── patient_profiles ──── phr ──── vital_signs
        │                        └─── living_wills
        ├── doctor_profiles ──── doctor_schedules
        │
        └── appointments ──┬── meeting_records ──── meeting_transcripts
                           ├── emr ──┬── prescriptions
                           │         ├── lab_orders
                           │         └── imaging_orders
                           └── notifications
```

---


## 6. API Endpoints Summary


### 6.1 Patient Portal (localhost:3005) — 30+ endpoints

| Category | Method | Endpoint | Auth |
| ----------|--------|----------|------ |
| Auth | POST | `/api/auth/login` | Public |
| Auth | POST | `/api/auth/register` | Public |
| Auth | POST | `/api/auth/logout` | Auth |
| Auth | GET | `/api/auth/profile` | Auth |
| Auth | PUT | `/api/auth/profile` | Auth |
| Auth | POST | `/api/auth/forgot-password` | Public |
| Auth | POST | `/api/auth/reset-password` | Public |
| Health | GET | `/api/health` | Public |
| Health | GET | `/api/health/db` | Public |
| PHR | GET/PUT | `/api/phr` | Auth |
| PHR | GET/POST | `/api/phr/vitals` | Auth |
| PHR | GET/PUT | `/api/phr/:id/living-will` | Auth |
| Appts | GET/POST | `/api/appointments` | Auth |
| Appts | GET | `/api/appointments/:id` | Auth |
| Appts | PUT | `/api/appointments/:id/cancel` | Auth |
| Doctors | GET | `/api/doctors` | Auth |
| Doctors | GET | `/api/doctors/:id` | Auth |
| Notif | GET | `/api/notifications` | Auth |
| Notif | PUT | `/api/notifications/:id/read` | Auth |
| Timeline | GET | `/api/timeline` | Auth |
| Content | GET | `/api/content/medical` | Auth |
| AI | POST | `/api/ai/chat` | Auth |
| PDPA | GET/PUT | `/api/pdpa/consents` | Auth |




### 6.2 Doctor Portal (localhost:3010) — 50+ endpoints

| Category | Method | Endpoint | Auth |
| ----------|--------|----------|------ |
| Auth | POST | `/auth/login` | Public |
| Auth | POST | `/auth/register` | Public |
| Appts | GET/PUT | `/api/appointments` | Auth |
| Queue | GET | `/api/queue` | Auth |
| Pool | GET/POST | `/api/appointment-pool` | Auth |
| Patients | GET | `/api/patients` | Auth |
| Patients | GET | `/api/patients/:id` | Auth |
| EMR | GET/POST | `/api/emr` | Auth |
| EMR | GET/PUT | `/api/emr/:id` | Auth |
| Rx | POST | `/api/prescriptions` | Auth |
| Rx | GET | `/api/prescriptions/patient/:id` | Auth |
| Lab | POST/GET | `/api/lab-orders` | Auth |
| Lab | GET | `/api/lab-orders/:id` | Auth |
| Lab | PUT | `/api/lab-orders/:id/results` | Auth |
| Lab | POST | `/api/lab-orders/:id/documents` | Auth |
| Imaging | POST | `/api/imaging-orders` | Auth |
| Imaging | GET | `/api/imaging-orders/patient/:id` | Auth |
| Imaging | PUT | `/api/imaging-orders/:id/results` | Auth |
| Content | GET/POST | `/api/content/medical` | Auth |
| Content | GET/POST | `/api/content/clinical-resources` | Auth |
| Consult | GET/POST | `/api/consultants` | Auth |
| AI | POST | `/api/ai/chat` | Auth |
| AI | POST | `/api/ai/cds-check` | Auth |
| Admin | GET | `/api/admin/users` | Admin |
| Admin | POST | `/auth/admin/approve-doctor` | Admin |




### 6.3 Meeting Server (localhost:3020) — 15 endpoints

| Category | Method | Endpoint | Auth |
| ----------|--------|----------|------ |
| Health | GET | `/api/health` | Public |
| Meeting | POST | `/api/meetings/create` | Auth |
| Meeting | GET | `/api/meetings/:id` | Auth |
| Meeting | POST | `/api/meetings/:id/join` | Auth |
| Meeting | POST | `/api/meetings/:id/end` | Auth |
| Transcript | POST | `/api/meetings/transcription` | Auth |
| AI | POST | `/api/ai/emr-summary` | Auth |
| AI | POST | `/api/ai/patient-instruction` | Auth |
| AI | POST | `/api/ai/pre-consultation-summary` | Auth |
| AI | POST | `/api/ai/validate` | Auth |
| AI | POST | `/api/ai/cds-check` | Auth |
| AI | POST | `/api/ai/analyze-document` | Auth |
| AI | GET | `/api/ai/knowledge` | Auth |



---


## 7. Workflows & Processes


### 7.1 Appointment Lifecycle

```text
Patient Books → AI Symptom Analysis → Admin Assigns Doctor
    → Doctor Confirms → Meeting Link Generated
    → Video Consultation → AI Transcript
    → Doctor Creates EMR + Prescriptions + Lab Orders
    → Patient Receives Instructions → Follow-up Scheduled
```


### 7.2 EMR & Clinical Workflow

```text
Pre-Consultation: AI Summary (patient history + PHR)
    → Video Meeting: Live Transcription (Web Speech API)
    → AI Draft: Gemini generates SOAP note
    → Doctor Review: Man-in-Loop validation
    → E-Prescribing: Drug DB + CDS interaction check
    → Lab Orders: Create + results upload + document attach
    → Imaging Orders: Create + results upload
    → Finalize EMR: Digital signature → immutable record
```


### 7.3 Lab Order Flow (Fixed v1.5.2)

```text
Doctor Creates Lab Order (POST /api/lab-orders)
    → Status: "ordered" → PostgreSQL lab_orders table
    → Lab Processes Tests
    → Doctor Uploads Results (PUT /api/lab-orders/:id/results)
        → Includes: test results JSONB + document attachments (base64)
    → Doctor Uploads Additional Documents (POST /api/lab-orders/:id/documents)
        → PDF reports, images, DICOM files
    → Status: "completed"
    → Patient Views Results (GET /api/lab-orders/patient/:patientId)
        → Sees: test values, reference ranges, attached documents
```


### 7.4 Doctor Registration & Approval (Fixed v1.5.2)

```text
New Doctor Registers → is_active=false, approval_status="pending"
    → Admin views pending doctors (GET /api/admin/users?role=doctor)
        → SQL fixed: status filters use boolean is_active for active/inactive
        → Other statuses (pending/approved/rejected) filter via approval_status
    → Admin Approves → is_active=true, approval_status="approved"
    → Doctor Can Login → JWT issued with role
```


### 7.5 Content Management

```text
Doctor Creates Article (status: draft)
    → Submits for Review (status: submitted)
    → Admin Reviews → Approve (published) or Reject (draft)
    → Published content visible to patients in Medical Library
```

---


## 8. Security

| Control | Implementation |
| ---------|--------------- |
| Password Hashing | bcrypt (10 rounds) |
| Auth Tokens | JWT (doctor) + Session tokens (patient) |
| Password Policy | 12+ chars, upper/lower/digit/special |
| Rate Limiting | 10 attempts per 15 minutes |
| Security Headers | Helmet.js (CSP, XSS, HSTS, X-Frame) |
| Body Size Limit | 10KB JSON (DoS prevention) |
| Error Handling | Sanitized messages, no stack traces in production |
| CORS | Strict origin — no localhost in production |
| IDOR Protection | User-scoped data access enforcement |
| Input Validation | XSS prevention, SQL parameterized queries |
| PDPA Compliance | Granular consent, audit trail, data portability |
| AI Safety | Man-in-the-Loop: doctor validates all AI outputs |



---


## 9. Deployment


### 9.1 Local (Docker Compose)

```bash
docker-compose up -d --build

# Patient: <http://localhost:3005>

# Doctor:  <http://localhost:3010>

# Meeting: <http://localhost:3020>

# pgAdmin: <http://localhost:5050>

# PostgreSQL: localhost:5433
```


### 9.2 Production (Google Cloud Run — Embedded PG)

Each Cloud Run service embeds PostgreSQL 16 directly in the container — **no separate Cloud SQL instance** — to minimize costs.

```bash

# Deploy Patient Portal
cd Isara-patient-portal && gcloud builds submit --config=cloudbuild.yaml


# Deploy Doctor Portal
cd Isara-doctor-portal && gcloud builds submit --config=cloudbuild.yaml


# Deploy Meeting Server
cd Izara-jitsi-server && gcloud builds submit --config=cloudbuild.yaml
```

| Service | Production URL |
| ---------|--------------- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> |



---


## 10. Testing

| Type | Count | Framework | Command |
| ------|-------|-----------|--------- |
| Unit | 409 | Vitest | `cd tests/unit && npx vitest run` |
| E2E | 808 | Playwright | `cd tests/e2e && npx playwright test --project=Local` |




### Test Credentials

| Role | Email | Password |
| ------|-------|---------- |
| Patient 1 | demo.test@gmail.com | P@ssw0rd |
| Patient 2 | Somchai.Mankong@gmail.com | P@ssw0rd |
| Patient 3 | Anan.Khayanrian@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |



---


## 11. v1.5.2 Changelog

| Issue | Root Cause | Fix |
| -------|-----------|----- |
| Lab upload broken | Endpoints used GCS mock returning empty arrays | Replaced with PostgreSQL LabOrderService |
| Prescription endpoints broken | Same GCS mock issue | Replaced with PostgreSQL PrescriptionService |
| "Failed to load doctor accounts" | Invalid SQL: `(is_active = ($n = 'active'))` | Fixed to use boolean `is_active` for active/inactive, `approval_status` for other states |
| Lab result documents missing | No upload endpoint existed | Added PUT /api/lab-orders/:id/results + POST /api/lab-orders/:id/documents |
| No imaging orders | Feature not implemented | Added imaging_orders table + full CRUD endpoints |
| Cloud SQL cost | External Cloud SQL at $50+/month | Embedded PostgreSQL 16 directly in Cloud Run containers |
| Dev environment cost | Separate dev-testing Cloud Run services | Removed dev environment; test locally, deploy to production |


