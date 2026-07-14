# Database Tables Reference

**Version:** 2.0.0  
**Last Updated:** June 25, 2026  
**Database:** PostgreSQL 18 — `izara_phase1`  
**Master schema:** `scripts/database/izara-database.sql` (v5.1.0)  
**Total tables:** 53+ (including runtime-created tables)

> **Canonical column definitions:** [PostgreSQL_Database_Architecture.md](PostgreSQL_Database_Architecture.md)  
> **Schema tooling:** `scripts/database/db-tool.cjs --verify`

---

## Table of Contents

1. [Overview](#1-overview)
2. [User & Authentication](#2-user--authentication)
3. [Patient Clinical Data](#3-patient-clinical-data)
4. [Doctor Management](#4-doctor-management)
5. [Appointments & Meetings](#5-appointments--meetings)
6. [Clinical Records](#6-clinical-records)
7. [Content & Reference Data](#7-content--reference-data)
8. [AI, Knowledge & Notifications](#8-ai-knowledge--notifications)
9. [Mobile, Sync & User Preferences](#9-mobile-sync--user-preferences)
10. [Extended Clinical Modules](#10-extended-clinical-modules)
11. [Audit & Admin](#11-audit--admin)
12. [Database Views](#12-database-views)
13. [Table → Workflow Index](#13-table--workflow-index)

---

## 1. Overview

All three services (Patient Portal, Doctor Portal, Meeting Server) share one PostgreSQL database. Tables are grouped below by domain. **Workflow** links point to the primary process document that reads or writes the table.

### Migration chain (Docker init)

| Order | Script | Adds |
| ----- | ------ | ---- |
| 01 | `izara-database.sql` | Core 42 tables + 3 views |
| 02 | `v2.0.0-phase2-tables.sql` | Mobile/sync/preferences tables |
| 03 | `v2.1.0-phase2-ai-his.sql` | CTM, geriatric, SOS, nursing, follow-ups |
| 04 | `v2.2.0-notify-triggers.sql` | 8 LISTEN/NOTIFY triggers |
| 05 | `seed-dev-data.sql` | Dev test users and sample data |
| 06–07 | `2025-add-google-sub.sql`, `2025-ensure-appointment-columns.sql` | SSO + column patches |

Additional migrations (manual via `db-tool.cjs`): `v2.2.0-ai-specialty-matching.sql`, `pdpa-access-control-migration.sql`.

---

## 2. User & Authentication

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `users` | Unified accounts for patients, doctors, and admins | `email`, `role`, `password_hash`, `is_approved`, `approval_status`, `preferences` (JSONB) | [User_management_Workflows.md](User_management_Workflows.md) |
| `sessions` | Active login sessions and JWT backing store | `user_id`, `token`, `expires_at`, `logged_out_at` | User management |
| `password_resets` | Time-limited password recovery tokens | `user_id`, `token`, `expires_at`, `used` | User management |
| `device_tokens` | Push notification device registration | `user_id`, `device_token`, `platform`, `is_active` | [Notification_Workflows.md](Notification_Workflows.md) |
| `biometric_credentials` | WebAuthn / biometric login credentials | `user_id`, `credential_type`, `public_key`, `device_id` | User management |
| `refresh_tokens` | JWT refresh token rotation per device | `user_id`, `token_hash`, `device_id`, `is_revoked` | User management |

---

## 3. Patient Clinical Data

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `patient_profiles` | Extended demographics and insurance | `patient_id`, `demographics`, `emergency_contact`, `insurance_info` | [Health_Records_Processes.md](Health_Records_Processes.md) |
| `phr` | Personal Health Record (1:1 with patient) | `allergies`, `chronic_conditions`, `medications`, `vital_signs_history`, `blood_type`, `bmi` | Health Records, PHR pages |
| `vital_signs` | Individual vital sign measurements | `blood_pressure_*`, `heart_rate`, `oxygen_saturation`, `measured_at`, `source` | Health Records, Timeline |
| `living_wills` | Living will document and PDPA consent | `statement`, `treatments`, `representatives`, `status`, `is_shared_with_doctors` | [Living_Will_Processes.md](Living_Will_Processes.md) |
| `living_will_versions` | Version history for living wills | `patient_id`, `version`, `data` (JSONB) | Living Will |
| `patient_consents` | PDPA data-sharing consent per doctor | `consent_type`, `granted`, `doctor_id`, `data_types`, `expires_at` | Living Will, PDPA pages |
| `push_subscriptions` | Legacy per-channel notification toggles | `appointment_reminders`, `lab_results`, `quiet_hours_*` | Notifications |

---

## 4. Doctor Management

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `doctor_profiles` | Professional profile linked to `users` | `specialty`, `qualifications`, `consultation_fee`, `schedule` (JSONB) | User management, Schedule |
| `doctors` | Patient-facing doctor directory listing | `name`, `specialty`, `hospital`, `rating`, `is_available` | Appointments, Find Doctors |
| `doctor_schedules` | Weekly availability slots | `day_of_week`, `start_time`, `end_time`, `slot_duration_minutes` | [Appointment_Workflows.md](Appointment_Workflows.md) |
| `doctor_reviews` | Patient ratings after appointments | `doctor_id`, `patient_id`, `rating`, `comment` | Appointments |
| `consultants` | External specialist directory (admin-managed) | `name`, `specialty`, `hospital`, `is_available`, `admin_notes` | [Medical_Consultants_Workflows.md](Medical_Consultants_Workflows.md) |

---

## 5. Appointments & Meetings

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `appointments` | Booking, pool, confirmation, meeting links | `status`, `symptoms`, `ai_triage`, `jitsi_room_name`, `doctor_meeting_url`, `patient_meeting_url` | [Appointment_Workflows.md](Appointment_Workflows.md) |
| `meeting_records` | Video session lifecycle, AI output, recordings | `status`, `transcript`, `ai_summary`, `recording_data` (BYTEA), `doctor_validation_status`, `ready_for_patient` | [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md), [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md) |
| `patient_documents` | Unified clinical file registry delivered to patients | `source_type` (`emr_report`, `instruction_sheet`, `lab_report`, `imaging_report`, `prescription`, `patient_upload`, …), `file_data` (BYTEA), `status` | [Clinical_Document_Delivery_Workflows.md](Clinical_Document_Delivery_Workflows.md) |
| `meeting_transcripts` | Segment-level speech-to-text | `speaker_role`, `content`, `start_time_seconds`, `confidence` | Video Meeting |
| `meeting_chats` | In-meeting chat messages (Meeting Server runtime) | `meeting_record_id`, `sender_role`, `message`, `type` | Video Meeting |
| `meeting_invites` | Guest invite tokens (Meeting Server runtime) | `meeting_record_id`, `guest_email`, `token`, `expires_at` | Video Meeting |
| `recording_share_tokens` | Time-limited recording share links | `meeting_id`, `token`, `expires_at` | Post-meeting |
| `appointment_ai_suggestions` | AI specialty matching for pool appointments | `suggested_specialty`, `confidence`, `accepted` | Appointment pool (admin) |

**Appointment status flow:** `pending` → `in_pool` → `ai_matched` → `doctor_claimed` → `confirmed` → `in_progress` → `completed` (or `cancelled` / `declined`)

**Meeting status flow:** `scheduled` → `waiting` → `active` / `in_progress` → `completed` → results pipeline → `ready_for_patient`

---

## 6. Clinical Records

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `emr` | SOAP electronic medical record per visit | `subjective`, `objective`, `assessment`, `plan` (JSONB), `ai_summary`, `status` | [Health_Records_Processes.md](Health_Records_Processes.md) |
| `emr_records` | Simplified visit record (v2.1 migration) | `chief_complaint`, `diagnosis`, `treatment`, `visit_date` | Health Records |
| `prescriptions` | E-prescribing linked to EMR | `medications` (JSONB), `cds_warnings`, `status` | Health Records |
| `lab_orders` | Lab test orders and results | `tests` (JSONB), `results`, `ai_analysis`, `result_documents` | Health Records |
| `imaging_orders` | Imaging orders (doctor portal runtime) | `imaging_type`, `body_part`, `results`, `result_documents` | Health Records |
| `patient_instructions` | Post-visit patient instruction sheets | `content`, `content_thai`, `follow_up_date`, `medications` | [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md) |
| `health_timeline` | Chronological patient event log (db-tool legacy) | `event_type`, `event_date`, `title`, `reference_type` | Timeline page |

---

## 7. Content & Reference Data

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `medical_content` | Patient health education articles | `title_thai`, `content_thai`, `category`, `status`, `author_id` | [Medicine_Content_Processes.md](Medicine_Content_Processes.md) |
| `clinical_resources` | Doctor clinical guidelines and protocols | `specialty`, `guideline_year`, `status`, `approved_by` | [Clinical_Resources_&_Medical_Library_Workflows.md](Clinical_Resources_&_Medical_Library_Workflows.md) |
| `icd10_codes` | ICD-10 diagnosis code reference | `code`, `description_english`, `description_thai` | EMR, AI |
| `drugs` | Drug reference with interactions | `generic_name`, `interactions`, `contraindications` | Prescribing, CDS |

---

## 8. AI, Knowledge & Notifications

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `notifications` | In-app notification queue | `type`, `title_thai`, `message_thai`, `data` (JSONB), `read_at` | [Notification_Workflows.md](Notification_Workflows.md) |
| `knowledge_base` | RAG-indexed clinical knowledge (pgvector) | `content`, `embedding` vector(768), `category` | Clinical Resources, AI Studio |
| `ai_chat_history` | Per-session AI chat messages | `session_id`, `role`, `content`, `embedding` | AI Doctor / AI Studio |
| `ai_chat_memory` | Long-term AI memory per user | `memory_type`, `content`, `relevance_score` | AI chat |
| `transcript_embeddings` | Vectorized meeting transcript chunks | `chunk_text`, `embedding`, `speaker_role` | Video Meeting, RAG |
| `ai_document_analysis` | AI analysis of uploaded documents | `document_type`, `summary`, `key_findings`, `validation_status` | AI Studio |
| `cds_logs` | Clinical decision support audit trail | `recommendation_type`, `severity`, `doctor_decision` | EMR, Prescribing |
| `ai_validations` | Doctor man-in-the-loop approval log | `type`, `decision`, `content_snapshot` | Post-meeting, EMR |

---

## 9. Mobile, Sync & User Preferences

Created by `v2.0.0-phase2-tables.sql` (embedded in master schema). Schema-ready; mobile app not yet in production.

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `notification_preferences` | Per-channel notification settings | `channel`, `category`, `enabled` | Notifications |
| `user_settings` | UI and sync preferences | `theme`, `language`, `biometric_enabled`, `auto_sync` | Settings pages |
| `sync_queue` | Offline-first sync queue with conflict resolution | `entity_type`, `operation`, `payload`, `sync_status` | [Data_Sync_Documentation.md](Data_Sync_Documentation.md) |
| `user_api_connections` | Encrypted third-party API tokens | `service_type`, `access_token_encrypted`, `connection_status` | Data Sync |
| `api_connection_audit` | Audit trail for API connections | `action`, `service_type`, `ip_address` | Data Sync, Audit |

---

## 10. Extended Clinical Modules

Created by `v2.1.0-phase2-ai-his.sql`. Tables exist in schema; UI workflows are partial or planned.

| Table | Purpose | Key fields | Planned workflow |
| ----- | ------- | ---------- | ---------------- |
| `ctm_assessments` | Thai Traditional Medicine assessments | `dhatu`, `symptoms`, `herbal_prescription`, `diagnosis` | CTM module |
| `geriatric_screenings` | Elderly screening battery | `scores`, `risk_level`, `recommendations` | Geriatric care |
| `sos_alerts` | Patient emergency SOS alerts | `latitude`, `longitude`, `status`, `acknowledged_by` | Emergency |
| `follow_ups` | Post-visit follow-up tracking | `follow_up_date`, `instructions`, `status` | [Appointment_Workflows.md](Appointment_Workflows.md) §follow-up |
| `nursing_tasks` | Nursing dashboard task list | `task_type`, `priority`, `due_at`, `status` | Nursing dashboard |
| `predictive_analytics` | AI risk scoring results | `analysis_type`, `risk_scores`, `model_version` | Predictive analytics |

---

## 11. Audit & Admin

| Table | Purpose | Key fields | Workflow |
| ----- | ------- | ---------- | -------- |
| `audit_logs` | Platform-wide security and action audit | `action`, `entity_type`, `old_value`, `new_value`, `ip_address` | Security, PDPA |
| `access_audit` | PDPA doctor access to patient data | `doctor_id`, `patient_id`, `access_type`, `expires_at` | PDPA |
| `admin_actions` | Admin action log (pool, assignments) | `admin_id`, `action`, `target_id`, `metadata` | Admin dashboard |

---

## 12. Database Views

| View | Purpose |
| ---- | ------- |
| `v_active_appointments` | Non-completed appointments with patient/doctor names |
| `v_patient_summary` | Patient users joined with PHR summary |
| `v_doctor_summary` | Doctor users joined with profile and rating |

---

## 13. Table → Workflow Index

Reverse lookup: which process documents use each table.

| Workflow document | Tables |
| ----------------- | ------ |
| [User_management_Workflows.md](User_management_Workflows.md) | `users`, `sessions`, `password_resets`, `patient_profiles`, `doctor_profiles`, `biometric_credentials`, `refresh_tokens` |
| [Appointment_Workflows.md](Appointment_Workflows.md) | `appointments`, `doctor_schedules`, `doctors`, `appointment_ai_suggestions`, `follow_ups`, `notifications` |
| [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) | `appointments`, `meeting_records`, `meeting_transcripts`, `meeting_chats`, `meeting_invites`, `transcript_embeddings` |
| [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md) | `meeting_records`, `ai_validations`, `patient_instructions`, `emr`, `recording_share_tokens` |
| [Health_Records_Processes.md](Health_Records_Processes.md) | `phr`, `vital_signs`, `emr`, `prescriptions`, `lab_orders`, `imaging_orders`, `health_timeline`, `patient_documents` |
| [Clinical_Document_Delivery_Workflows.md](Clinical_Document_Delivery_Workflows.md) | `patient_documents`, `emr`, `prescriptions`, `lab_orders`, `imaging_orders`, `meeting_records.recording_url`, `notifications` |
| [Living_Will_Processes.md](Living_Will_Processes.md) | `living_wills`, `living_will_versions`, `patient_consents` |
| [Medicine_Content_Processes.md](Medicine_Content_Processes.md) | `medical_content` |
| [Clinical_Resources_&_Medical_Library_Workflows.md](Clinical_Resources_&_Medical_Library_Workflows.md) | `clinical_resources`, `knowledge_base` |
| [Medical_Consultants_Workflows.md](Medical_Consultants_Workflows.md) | `consultants` |
| [Notification_Workflows.md](Notification_Workflows.md) | `notifications`, `push_subscriptions`, `notification_preferences`, `device_tokens` |
| [Data_Sync_Documentation.md](Data_Sync_Documentation.md) | All NOTIFY-triggered tables + `sync_queue`, `user_api_connections` |

### Post-meeting data pipeline

```text
meeting_records (transcript, recording)
    → meeting_transcripts (segments)
    → transcript_embeddings (RAG chunks)
    → ai_validations (doctor review)
    → emr (SOAP draft → signed)
    → prescriptions, lab_orders, imaging_orders
    → patient_instructions (Thai PDF)
    → notifications (patient delivery)
    → health_timeline (patient history)
```

---

*For ER diagrams and NOTIFY trigger details, see [PostgreSQL_Database_Architecture.md](PostgreSQL_Database_Architecture.md).*
