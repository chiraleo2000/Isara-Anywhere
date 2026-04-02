# 📋 Spec Kit — Phase 1: Telemedicine Core Platform

> **⚠️ Superseded:** This document covers Phase 1 features only.
> See **[SPEC_KIT.md](SPEC_KIT.md)** for the unified v1.5.2 specification covering all features, 42 database tables, and complete API endpoints.

**Version:** 1.5.1
**Date:** February 22, 2026
**Status:** ✅ Phase 1 Complete — All Features Verified

---


## 1. Executive Summary

Phase 1 delivers a complete telemedicine platform with three services:

- **Patient Portal** (localhost:3005) — React 18 + Vite + Express + PostgreSQL

- **Doctor Portal** (localhost:3010) — React 18 + Vite + 3 Express servers + PostgreSQL

- **Meeting Server** (localhost:3020) — Express + Socket.IO + Jitsi + Gemini AI

All services share a PostgreSQL database (`izara_phase1`) with pgvector extension.

---


## 2. Feature Matrix


### 2.1 Authentication & User Management

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| AUTH-001 | Patient Registration | Patient | Given new user, When submitting 2-step form (basic + health), Then account created and session token issued |
| AUTH-002 | Patient Login | Patient | Given valid email+password, When submitting login form, Then JWT/session token returned with 30m TTL |
| AUTH-003 | Doctor Login | Doctor/Admin | Given approved doctor credentials, When logging in, Then JWT issued, role (doctor/admin) set |
| AUTH-004 | Password Reset | All | Given valid email, When requesting reset, Then email sent with time-limited token, reset page validates token |
| AUTH-005 | Session Management | All | Given active session, When inactive >30m, Then auto-logout triggered |
| AUTH-006 | Role-Based Access | All | Given user role, When accessing routes, Then RBAC middleware enforces permissions per role matrix |
| AUTH-007 | Account Lockout | All | Given 5 failed login attempts, When next attempt, Then account locked for 15 minutes |
| AUTH-008 | Admin Doctor Approval | Admin | Given new doctor registration, When admin reviews, Then approve/reject with notification sent |



### 2.2 Appointments

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| APPT-001 | Book Appointment | Patient | Given available doctor+slot, When submitting booking, Then appointment created with status `pending` |
| APPT-002 | AI Symptom Analysis | Patient | Given symptom description, When booking, Then Gemini AI suggests specialty and urgency level |
| APPT-003 | Admin Assignment | Admin | Given pending appointment, When AI or manual assignment, Then doctor assigned, status→`confirmed` |
| APPT-004 | Doctor Schedule | Doctor | Given doctor, When viewing schedule, Then calendar shows all appointments by day/week/month |
| APPT-005 | Cancel Appointment | Patient/Doctor | Given active appointment, When cancelling with reason, Then status→`cancelled`, notification sent |
| APPT-006 | Reschedule | Patient/Doctor | Given appointment, When selecting new date/time, Then rescheduled, notifications sent to all parties |
| APPT-007 | Appointment Pool | Doctor | Given unassigned appointments, When doctor views pool, Then can claim matching-specialty appointments |
| APPT-008 | Queue Management | Doctor | Given today's confirmed appointments, When managing queue, Then call/skip/complete with wait-time tracking |
| APPT-009 | Meeting Link | System | Given confirmed appointment, When meeting time approaches, Then Jitsi link generated and attached |



### 2.3 Video Meeting (Core Phase 1 Deliverable)

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| MEET-001 | Create Meeting | Doctor | Given appointment, When starting meeting, Then Jitsi room created, doctor joins as HOST |
| MEET-002 | Patient Join | Patient | Given meeting link + lobby approval, When joining, Then connected to Jitsi room |
| MEET-003 | Guest Invite | Doctor | Given active meeting, When generating invite link, Then guest can join via link |
| MEET-004 | Live Transcription | System | Given active meeting, When participants speak, Then Web Speech API transcribes in real-time |
| MEET-005 | Transcript Streaming | System | Given transcription chunks, When received, Then streamed via Socket.IO to meeting server |
| MEET-006 | AI SOAP Summary | Doctor | Given meeting transcript, When requesting summary, Then Gemini generates SOAP-format clinical summary |
| MEET-007 | AI Patient Instructions | Doctor | Given meeting, When generating instructions, Then bilingual (Thai/EN) patient-friendly instructions |
| MEET-008 | AI Pre-Consultation | Doctor | Given patient history, When starting meeting, Then AI generates pre-consultation summary |
| MEET-009 | CDS Alerts | System | Given prescription/diagnosis, When saving, Then Clinical Decision Support flags interactions/warnings |
| MEET-010 | Man-in-Loop Validation | Doctor | Given AI-generated content, When reviewing, Then doctor must approve/reject before saving |
| MEET-011 | In-Meeting Chat | All | Given active meeting, When sending chat messages, Then real-time Socket.IO delivery |



### 2.4 Health Records

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| PHR-001 | Vital Signs CRUD | Patient | Given PHR page, When recording vitals (BP, HR, temp, SpO2, etc.), Then stored with timestamp |
| PHR-002 | Medication Management | Patient | Given medications tab, When adding/editing medications, Then tracked with dosage and schedule |
| PHR-003 | Allergy Records | Patient | Given allergy tab, When recording allergies, Then stored with severity and allergen type |
| PHR-004 | Health Overview | Patient | Given overview tab, When viewing, Then dashboard shows latest vitals, active meds, allergies |
| EMR-001 | Create EMR | Doctor | Given patient encounter, When creating EMR, Then SOAP format with ICD-10, prescriptions, lab orders |
| EMR-002 | AI Draft EMR | Doctor | Given meeting transcript, When requesting draft, Then Gemini generates SOAP draft for review |
| EMR-003 | E-Prescribing | Doctor | Given EMR, When prescribing, Then drug database lookup, interaction checks, dosage validation |
| EMR-004 | Lab Orders | Doctor | Given EMR, When ordering labs, Then lab test selection with priority and notes |
| EMR-005 | Finalize EMR | Doctor | Given complete EMR, When finalizing with digital signature, Then locked (immutable), versioned |
| EMR-006 | Amend EMR | Doctor | Given finalized EMR, When amending, Then new version created, original preserved |



### 2.5 Living Will

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| LW-001 | Create Living Will | Patient | Given 4-step wizard, When completing all steps, Then living will saved with digital signature |
| LW-002 | Healthcare Proxy | Patient | Given living will, When designating proxy, Then proxy details stored |
| LW-003 | PDPA Sharing | Patient | Given living will, When toggling sharing, Then consent-controlled doctor access |
| LW-004 | Doctor View | Doctor | Given patient consent, When viewing patient record, Then living will visible (read-only) |



### 2.6 Medical Content & Clinical Resources

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| MC-001 | Create Content | Doctor | Given content form, When submitting article, Then status=`draft`, submittable for review |
| MC-002 | Approval Workflow | Admin | Given submitted content, When reviewing, Then approve→published or reject→back to draft |
| MC-003 | Patient Library | Patient | Given published content, When browsing library, Then search/filter by category/type |
| CR-001 | Clinical Guidelines | Doctor | Given clinical resources, When browsing, Then guidelines/protocols/research available |
| CR-002 | RAG Knowledge Base | Doctor | Given clinical resources, When querying AI, Then RAG-indexed content used for responses |
| MC-004 | Medical Consultants | Doctor/Admin | Given consultants directory, When searching, Then find specialists by specialty/location |



### 2.7 AI Features

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| AI-001 | AI Health Chat | Patient | Given AI doctor page, When chatting, Then Gemini provides health advice with disclaimer |
| AI-002 | Gemini AI Studio | Doctor | Given FAB button, When opening studio, Then chat + clinical calculators available |
| AI-003 | Document Analysis | Doctor | Given uploaded PDF, When analyzing, Then AI extracts medical entities and summarizes |
| AI-004 | CDS Drug Check | System | Given medications, When checking interactions, Then flags contraindications and allergies |
| AI-005 | Knowledge Base Search | Doctor | Given query, When searching, Then pgvector RAG returns relevant clinical resources |



### 2.8 Notifications & PDPA

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| NOTIF-001 | In-App Notifications | All | Given events (appointment, meeting, EMR), When triggered, Then notification bell shows unread count |
| NOTIF-002 | Mark Read | All | Given notification, When clicking, Then marked as read, count decremented |
| PDPA-001 | Consent Management | Patient | Given PDPA page, When toggling consents, Then granular data sharing preferences saved |
| PDPA-002 | Doctor Access Control | Patient | Given consent settings, When doctor requests data, Then access granted/denied per consent |
| PDPA-003 | Audit Log | System | Given any data access, When accessed, Then audit trail entry created with timestamp |



### 2.9 Other Features

| Feature ID | Feature | Actor | Acceptance Criteria |
| ---|---|---|--- |
| MAP-001 | Nearby Healthcare | Patient | Given location permission, When viewing map, Then Google Maps shows hospitals/clinics/pharmacies |
| PROF-001 | Patient Profile | Patient | Given profile page, When editing, Then avatar, contact, emergency contact updated |
| PROF-002 | Doctor Profile | Doctor | Given profile page, When editing, Then specialty, contact, avatar updated |
| TIME-001 | Treatment Timeline | Patient | Given timeline page, When viewing, Then chronological medical events with type filters |
| SET-001 | Settings | Patient | Given settings page, When changing preferences, Then language/theme/notifications saved |
| DASH-001 | Patient Dashboard | Patient | Given dashboard, When viewing, Then upcoming appointments, health overview, quick actions |
| DASH-002 | Doctor Dashboard | Doctor | Given dashboard, When viewing, Then today's schedule, pending tasks, patient count |


---


## 3. API Endpoints (Phase 1)


### Patient Portal (localhost:3005)

| Method | Endpoint | Auth | Purpose |
| ---|---|---|--- |
| POST | /api/auth/login | Public | Patient login |
| POST | /api/auth/register | Public | Patient registration |
| POST | /api/auth/logout | Auth | Logout |
| GET | /api/auth/profile | Auth | Get current user profile |
| PUT | /api/auth/profile | Auth | Update profile |
| POST | /api/auth/forgot-password | Public | Request password reset |
| POST | /api/auth/reset-password | Public | Reset password with token |
| GET | /api/health | Public | Health check |
| GET | /api/health/db | Public | Database health check |
| GET | /api/phr | Auth | Get patient PHR |
| PUT | /api/phr | Auth | Update PHR |
| GET | /api/phr/vitals | Auth | Get vital signs |
| POST | /api/phr/vitals | Auth | Record vital signs |
| GET/POST | /api/phr/:id/living-will | Auth | Living will CRUD |
| GET | /api/appointments | Auth | List appointments |
| POST | /api/appointments | Auth | Book appointment |
| GET | /api/appointments/:id | Auth | Appointment detail |
| PUT | /api/appointments/:id/cancel | Auth | Cancel appointment |
| GET | /api/doctors | Auth | List doctors |
| GET | /api/doctors/:id | Auth | Doctor profile |
| GET | /api/doctors/:id/availability | Auth | Doctor availability |
| GET | /api/notifications | Auth | List notifications |
| PUT | /api/notifications/:id/read | Auth | Mark notification read |
| GET | /api/timeline | Auth | Treatment timeline |
| GET | /api/content/medical | Auth | Published medical content |
| POST | /api/ai/chat | Auth | AI health chat |
| GET | /api/pdpa/consents | Auth | PDPA consents |
| PUT | /api/pdpa/consents | Auth | Update consents |



### Doctor Portal (localhost:3010)

| Method | Endpoint | Auth | Purpose |
| ---|---|---|--- |
| POST | /auth/login | Public | Doctor/admin login |
| POST | /auth/register | Public | Doctor registration |
| GET | /api/appointments | Auth | All appointments |
| GET | /api/appointments/:id | Auth | Appointment detail |
| PUT | /api/appointments/:id | Auth | Update appointment |
| GET | /api/queue | Auth | Today's queue |
| GET | /api/appointment-pool | Auth | Unassigned pool |
| POST | /api/appointment-pool/:id/claim | Auth | Claim appointment |
| GET | /api/patients | Auth | Patient list |
| GET | /api/patients/:id | Auth | Patient record |
| GET | /api/emr | Auth | EMR list |
| POST | /api/emr | Auth | Create EMR |
| GET | /api/emr/:id | Auth | Get EMR |
| PUT | /api/emr/:id | Auth | Update EMR |
| POST | /api/prescriptions | Auth | Create prescription |
| POST | /api/lab-orders | Auth | Create lab order |
| GET | /api/content/medical | Auth | Medical content list |
| POST | /api/content/medical | Auth | Create content |
| PUT | /api/content/medical/:id | Auth | Update content |
| GET | /api/content/clinical-resources | Auth | Clinical resources |
| POST | /api/content/clinical-resources | Auth | Create resource |
| GET | /api/consultants | Auth | Consultant directory |
| POST | /api/ai/chat | Auth | AI clinical chat |
| POST | /api/ai/cds-check | Auth | CDS check |
| GET | /admin/pending-doctors | Admin | Pending doctor approvals |
| POST | /auth/admin/approve-doctor | Admin | Approve doctor |



### Meeting Server (localhost:3020)

| Method | Endpoint | Auth | Purpose |
| ---|---|---|--- |
| GET | /api/health | Public | Health check |
| POST | /api/meetings/create | Auth | Create meeting room |
| GET | /api/meetings/:id | Auth | Meeting status |
| POST | /api/meetings/:id/join | Auth | Join meeting |
| POST | /api/meetings/:id/end | Auth | End meeting |
| POST | /api/meetings/transcription | Auth | Upload transcript chunk |
| POST | /api/ai/emr-summary | Auth | Generate SOAP summary |
| POST | /api/ai/patient-instruction | Auth | Generate patient instructions |
| POST | /api/ai/pre-consultation-summary | Auth | Pre-consultation summary |
| POST | /api/ai/validate | Auth | Man-in-loop AI validation |
| POST | /api/ai/cds-check | Auth | CDS medication check |
| POST | /api/ai/analyze-document | Auth | Document analysis |
| GET | /api/ai/knowledge | Auth | Knowledge base search |


---


## 4. Database Schema (Phase 1 — 27 core tables)

```
users, sessions, password_resets, patient_profiles, phr, vital_signs,
living_wills, living_will_versions, patient_consents, doctor_profiles,
doctors, doctor_schedules, doctor_reviews, consultants, appointments,
meeting_records, meeting_transcripts, emr, prescriptions, lab_orders,
icd10_codes, drugs, medical_content, clinical_resources, notifications,
knowledge_base, ai_chat_history, ai_document_analysis, cds_logs,
ai_validations, audit_logs
```

---


## 5. Technology Stack

| Layer | Technology | Cost |
| ---|---|--- |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | Free |
| Backend | Express.js + TypeScript/CJS | Free |
| Database | PostgreSQL 18 + pgvector + pgcrypto | Free |
| Video | Jitsi Meet (meet.jit.si) | Free |
| Transcription | Web Speech API (browser-native) | Free |
| AI | Gemini 2.5 Flash Lite | Free tier |
| Maps | Google Maps JavaScript API | Paid (key) |
| Container | Docker + Docker Compose | Free |
| Cloud | Google Cloud Run | Pay-per-use |

