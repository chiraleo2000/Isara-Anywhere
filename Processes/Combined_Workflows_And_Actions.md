# 🔄 Izara Telemedicine — Combined Workflows, Processes & Actions

**Version:** 1.7.54
**Last Updated:** June 25, 2026
**Status:** ✅ Phase 1 Complete

> **Start here for diagrams:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) — platform topology, pipeline, feature matrix.

---


## 📋 Table of Contents

1. [End-to-End Patient Journey](#1-end-to-end-patient-journey)
2. [End-to-End Doctor Workflow](#2-end-to-end-doctor-workflow)
3. [End-to-End Admin Workflow](#3-end-to-end-admin-workflow)
4. [Complete Appointment-to-Delivery Pipeline](#4-complete-appointment-to-delivery-pipeline)
5. [Cross-Portal Data Synchronization](#5-cross-portal-data-synchronization)
6. [AI-Assisted Clinical Pipeline](#6-ai-assisted-clinical-pipeline)
7. [Complete Feature Matrix](#7-complete-feature-matrix)
8. [All System Actions by Category](#8-all-system-actions-by-category)
9. [Notification Flow Across System](#9-notification-flow-across-system)
10. [Content Lifecycle (Create → Approve → Publish)](#10-content-lifecycle)

---


## 1. End-to-End Patient Journey

The complete patient experience from registration to post-consultation.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE PATIENT JOURNEY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. ONBOARDING                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Register │→│  Fill     │→│  Create  │→│Dashboard │               │
│  │ 2-step   │  │  Health   │  │  PHR     │  │  Home    │               │
│  │ wizard   │  │  Profile  │  │  Baseline│  │  Page    │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  2. PRE-CONSULTATION                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Update   │→│  Book     │→│  AI      │→│  Wait    │               │
│  │ PHR/     │  │  Appoint- │  │  Triage  │  │  for     │               │
│  │ Vitals   │  │  ment     │  │  Analysis │  │  Confirm │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  3. CONSULTATION                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Receive  │→│  Join     │→│  Video   │→│  End     │               │
│  │ Confirm  │  │  Lobby    │  │  Meeting │  │  Meeting │               │
│  │ + Link   │  │  (Wait)   │  │  + Text  │  │          │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  4. POST-CONSULTATION                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Receive  │→│  View     │→│  View    │→│  Rate    │               │
│  │ Notif +  │  │  Instruct-│  │  Timeline │  │  Doctor  │               │
│  │ EMR Ready│  │  ions     │  │  + EMR   │  │  Review  │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  5. ONGOING CARE                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Track    │→│  AI       │→│  Health  │→│  Manage  │               │
│  │ Vitals   │  │  Doctor   │  │  Library │  │  Living  │               │
│  │ Daily    │  │  Chat     │  │  Reading │  │  Will    │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```


### Patient Pages & Actions Summary

| Phase | Page | Actions |
| ----- | ---- | ------- |
| Onboarding | Register | Fill basic info, fill health info, choose language |
| Onboarding | Dashboard | View upcoming appointments, view notifications, view health snapshot |
| Pre-Consultation | PHR | Record vitals, update medications, manage allergies, update lifestyle |
| Pre-Consultation | Book Appointment | Select doctor/specialty, describe symptoms, AI triage, choose date/time |
| Consultation | Appointment Detail | View meeting link, join lobby, enter video call |
| Post-Consultation | Timeline | View treatment history, filter by type, view EMR summaries |
| Ongoing | AI Doctor | Chat health questions, get preliminary advice |
| Ongoing | Health Library | Search articles, browse by category, read content |
| Ongoing | Living Will | 4-step wizard, digital signature, share with doctors |
| Privacy | PDPA | Manage consent, control doctor access, view audit trail |
| Account | Profile/Settings | Edit info, change password, set notifications, theme/language |

---


## 2. End-to-End Doctor Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE DOCTOR WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. START OF DAY                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                              │
│  │ Login    │→│ Dashboard │→│ Review   │                              │
│  │          │  │ Stats    │  │ Schedule │                              │
│  └──────────┘  └──────────┘  └──────────┘                              │
│        │                                                                 │
│        ▼                                                                 │
│  2. PRE-CONSULTATION                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Claim/   │→│ Review   │→│ Pre-     │→│ Open     │               │
│  │ Accept   │  │ Patient  │  │ Consult  │  │ Meeting  │               │
│  │ Appoint  │  │ Records  │  │ AI Brief │  │ Room     │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  3. DURING MEETING                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Admit    │→│ Video    │→│ Real-    │→│ Record  │               │
│  │ Patient  │  │ Consult  │  │ Time     │  │ Audio/  │               │
│  │ from     │  │ + Chat   │  │ Transcrip│  │ Video   │               │
│  │ Lobby    │  │          │  │ tion     │  │         │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  4. POST-MEETING DOCUMENTATION                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ AI Gen   │→│ Review/  │→│ Write    │→│ Order   │               │
│  │ EMR      │  │ Edit AI  │  │ Prescrip-│  │ Labs    │               │
│  │ Draft    │  │ Summary  │  │ tions    │  │         │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                          │
│  5. FINALIZATION                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                              │
│  │ Sign     │→│ Generate │→│ Send to  │                              │
│  │ EMR      │  │ Patient  │  │ Patient  │                              │
│  │ Digital  │  │ Instruct │  │ + Notify │                              │
│  └──────────┘  └──────────┘  └──────────┘                              │
│                                                                          │
│  6. BETWEEN CONSULTATIONS                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ AI       │→│ Create   │→│ Manage   │→│ Review   │               │
│  │ Studio   │  │ Content  │  │ Clinical │  │ Patient  │               │
│  │ (Chat/   │  │ Articles │  │ Resources│  │ Records  │               │
│  │ Calcs)   │  │          │  │ + RAG    │  │ PHR/EMR  │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

---


## 3. End-to-End Admin Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE ADMIN WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  USER MANAGEMENT        APPOINTMENT MGMT       CONTENT APPROVAL          │
│  ─────────────────      ──────────────────      ─────────────────        │
│  │                      │                       │                        │
│  ├ Review doctor        ├ View all pending      ├ Review medical         │
│  │ registrations        │ appointments          │ content (articles)     │
│  │                      │                       │                        │
│  ├ Approve/reject       ├ Auto-assign via       ├ Approve/reject         │
│  │ doctor accounts      │ AI specialty match    │ for publication        │
│  │                      │                       │                        │
│  ├ Change roles         ├ Manual assign         ├ Review clinical        │
│  │ (doctor ↔ admin)     │ to specific doctor    │ resources              │
│  │                      │                       │                        │
│  ├ Toggle doctor        ├ Reject with reason    ├ Approve/reject         │
│  │ active/inactive      │                       │ for doctor use         │
│  │                      │                       │                        │
│  └ View all patient     └ Track appointment     └ Index into RAG         │
│    and doctor data        statistics              knowledge base         │
│                                                                          │
│  CONSULTANT MGMT        SYSTEM MONITORING       ALL DOCTOR FEATURES      │
│  ─────────────────      ──────────────────      ─────────────────        │
│  │                      │                       │                        │
│  ├ Add/edit/delete      ├ View audit logs       ├ All doctor portal      │
│  │ consultants          │                       │ features available     │
│  │                      │                       │                        │
│  ├ Toggle availability  ├ Monitor notifications ├ Conduct meetings       │
│  │                      │                       │                        │
│  └ Manage reviews       └ Database tools        └ Write EMR, prescribe  │
└─────────────────────────────────────────────────────────────────────────┘
```

---


## 4. Complete Appointment-to-Delivery Pipeline

This is the **core Phase 1 deliverable** — the end-to-end flow.

```text
STAGE 1: BOOKING                          STAGE 2: ASSIGNMENT
───────────────                           ──────────────────
Patient → /book-appointment               Admin/Doctor/AI
  ├ Select specialty or doctor              ├ AI auto-match specialty
  ├ Describe symptoms                       ├ or Doctor claims from pool
  ├ AI triage (urgency + specialty)         ├ or Admin manual assigns
  ├ Choose date/time                        ├ Confirm appointment
  └ Submit → status: "pending"              └ Update → status: "confirmed"
     │                                         │
     ▼ INSERT appointments                     ▼ UPDATE appointments
     ▼ INSERT notifications (patient)          ▼ Generate Jitsi room + links
     ▼ pg_notify → Socket.IO                   ▼ INSERT notifications (patient + doctor)
                                               ▼ pg_notify → Socket.IO

STAGE 3: PRE-MEETING                      STAGE 4: MEETING
────────────────────                      ──────────────
Doctor prepares                           Video consultation
  ├ Review patient PHR                      ├ Doctor opens meeting room
  ├ AI pre-consultation summary             ├ Patient joins lobby → admitted
  ├ Review medication history               ├ Video call (Jitsi iframe)
  ├ Check allergies & alerts                ├ Browser speech-to-text active
  └ Open meeting room                       ├ Transcript segments → PostgreSQL
                                            ├ Recording captured
                                            └ Meeting ended
     │                                         │
     ▼ SELECT FROM phr, vital_signs            ▼ INSERT meeting_records
     ▼ Gemini API: pre-consult summary         ▼ INSERT meeting_transcripts (streaming)
                                               ▼ Socket.IO: transcript-update events

STAGE 5: AI PROCESSING                   STAGE 6: DOCUMENTATION
───────────────────                       ─────────────────────
Post-meeting AI pipeline                  Doctor documents care
  ├ Full transcript → Gemini                ├ Review AI-generated EMR draft
  ├ Generate SOAP EMR draft                 ├ Edit/approve/reject sections
  ├ Generate AI summary                     ├ Write prescriptions
  ├ Identify key clinical points            ├ Order lab tests
  └ Draft patient instructions              ├ Sign EMR digitally
                                            └ Approve patient instructions
     │                                         │
     ▼ Gemini API: meeting summary             ▼ INSERT/UPDATE emr
     ▼ Gemini API: patient instructions        ▼ INSERT prescriptions
     ▼ INSERT ai_validations (pending)         ▼ INSERT lab_orders
                                               ▼ UPDATE ai_validations (approved)

STAGE 7: DELIVERY                         STAGE 8: FOLLOW-UP
──────────────                            ─────────────────
Patient receives outcomes                 Ongoing care
  ├ Notification: "EMR ready"               ├ Patient views timeline
  ├ View instruction sheet                  ├ Tracks medications
  ├ View EMR summary                        ├ Records vitals
  ├ View prescriptions                      ├ Uses AI health chat
  └ View lab results when ready             └ Books follow-up appointment
     │                                         │
     ▼ INSERT notifications (patient)          ▼ Patient portal pages
     ▼ pg_notify → Socket.IO                   ▼ Cycle repeats
     ▼ Patient accesses via timeline
```

---


## 5. Cross-Portal Data Synchronization


### How Data Flows Between Portals

```text
┌─── Patient Portal (:3005) ───┐      ┌─── Doctor Portal (:3010) ───┐
│                                │      │                              │
│  WRITES:                       │      │  WRITES:                     │
│  • PHR data                    │      │  • EMR records               │
│  • Vital signs                 │      │  • Prescriptions             │
│  • Living wills                │      │  • Lab orders                │
│  • Appointments (create)       │      │  • Appointments (confirm)    │
│  • Patient consents            │      │  • AI validations            │
│  • Doctor reviews              │      │  • Medical content           │
│  • AI health chat              │      │  • Clinical resources        │
│                                │      │  • Notifications             │
│  READS:                        │      │                              │
│  • Appointments (own)          │      │  READS:                      │
│  • Notifications               │      │  • PHR (assigned patients)   │
│  • EMR summaries               │      │  • Appointments (own/pool)   │
│  • Medical content (published) │      │  • Patient consents          │
│  • Doctor list                 │      │  • Living wills (if shared)  │
│  • Patient instructions        │      │  • Meeting records           │
└────────────┬───────────────────┘      └────────────┬─────────────────┘
             │                                        │
             └────────────────┬───────────────────────┘
                              ▼
                    ┌────────────────────┐
                    │  PostgreSQL        │ ← Single source of truth
                    │  izara_phase1      │
                    │                    │
                    │  LISTEN/NOTIFY     │ ← Real-time sync triggers
                    │  → Socket.IO      │ ← Push to all connected clients
                    └────────────────────┘
                              ▲
                              │
             ┌────────────────┴─────────────────┐
             │                                   │
    ┌────────────────┐               ┌────────────────────┐
    │Meeting Server  │               │  Gemini AI API     │
    │(:3020)         │               │                    │
    │                │               │  WRITES:           │
    │ WRITES:        │               │  • ai_chat_history │
    │ • meeting_     │               │  • ai_validations  │
    │   records      │               │  • cds_logs        │
    │ • meeting_     │               │  • knowledge_base  │
    │   transcripts  │               │    (embeddings)    │
    │ • ai_summary   │               │                    │
    └────────────────┘               └────────────────────┘
```

---


## 6. AI-Assisted Clinical Pipeline


### Complete AI Feature Chain

```text
1. APPOINTMENT BOOKING                    2. PRE-CONSULTATION
   ──────────────────                        ──────────────────
   Patient symptoms → Gemini                 Patient PHR + History → Gemini
   ├ Analyze urgency (1-10)                  ├ Generate summary
   ├ Match specialty                         ├ Flag drug allergies
   ├ Suggest doctor                          ├ Highlight chronic conditions
   └ Save to ai_triage JSONB                 └ Present to doctor before meeting

3. DURING MEETING                         4. POST-MEETING AI
   ────────────────                          ─────────────────
   Web Speech API (browser)                  Full transcript → Gemini
   ├ Real-time speech-to-text                ├ SOAP EMR draft
   ├ Thai + English support                  ├ Key clinical decisions
   ├ Save segments to DB                     ├ Recommended follow-up
   └ Display live transcript                 └ Save as meeting_records.ai_summary

5. MAN-IN-THE-LOOP                       6. PATIENT DELIVERY
   ─────────────────                         ──────────────────
   Doctor reviews ALL AI output              Approved EMR → Gemini
   ├ ✅ Approve as-is                        ├ Generate patient-friendly summary
   ├ ✏️ Edit then approve                    ├ Medication instructions
   ├ ❌ Reject & regenerate                  ├ Lifestyle recommendations
   └ All decisions logged                    ├ Warning signs
                                             └ Follow-up information

7. AI CHAT (ONGOING)                      8. CDS (CLINICAL DECISION SUPPORT)
   ─────────────────                         ────────────────────────────────
   Doctor asks clinical question             During prescribing/orders
   ├ Query → embedding                       ├ Drug interaction check
   ├ RAG search knowledge_base               ├ Allergy cross-reference
   ├ Top-K context + query → Gemini          ├ Dose adjustment (renal)
   └ Response with citations                 ├ Guideline alerts
                                             └ All logged in cds_logs
```

---


## 7. Complete Feature Matrix


### All Features by Portal & Role

| # | Feature | Patient Portal | Doctor Portal (Doctor) | Doctor Portal (Admin) |
| - | ------- | -------------- | ---------------------- | --------------------- |
| 1 | Register/Login | ✅ | ✅ | ✅ |
| 2 | Password Reset | ✅ | ✅ | ✅ |
| 3 | Dashboard | ✅ Stats + Quick Actions | ✅ Patient Queue + Stats | ✅ System-wide Stats |
| 4 | Book Appointment | ✅ | — | — |
| 5 | View Appointments | ✅ (own) | ✅ (assigned) | ✅ (all) |
| 6 | Manage Appointments | — | ✅ Confirm/Decline | ✅ Assign/Reject |
| 7 | Appointment Pool | — | ✅ Claim | ✅ Manual Assign |
| 8 | Video Meeting | ✅ Join (Lobby) | ✅ Host | ✅ Host |
| 9 | Queue Management | — | ✅ Call/Skip/Complete | ✅ |
| 10 | PHR Management | ✅ Full CRUD | ✅ Read (assigned) | ✅ Read (all) |
| 11 | Vital Signs | ✅ Record | ✅ View (assigned) | ✅ View (all) |
| 12 | EMR Records | ✅ View Summary | ✅ Full CRUD | ✅ Full CRUD |
| 13 | Prescriptions | ✅ View | ✅ Create/Sign | ✅ Create/Sign |
| 14 | Lab Orders | ✅ View Results | ✅ Order/View | ✅ Order/View |
| 15 | Patient Record Viewer | — | ✅ PHR/EMR/EHR tabs | ✅ |
| 16 | Living Will | ✅ Create/Manage/Share | ✅ View (if shared) | ✅ View (if shared) |
| 17 | AI Health Chat | ✅ Basic Advice | — | — |
| 18 | AI Studio (Gemini) | — | ✅ Medical AI + Calcs | ✅ |
| 19 | AI EMR Generation | — | ✅ Review/Approve | ✅ |
| 20 | AI Patient Instructions | — | ✅ Generate/Approve | ✅ |
| 21 | Medical Content | ✅ Read (published) | ✅ Create/Edit Own | ✅ Full CRUD + Approve |
| 22 | Clinical Resources | — | ✅ Create/Edit Own | ✅ Full CRUD + Approve |
| 23 | Medical Consultants | — | ✅ View/Rate/Contact | ✅ Full CRUD |
| 24 | Doctor Directory | — | ✅ View | ✅ Add/Verify/Toggle |
| 25 | Doctor Management | — | — | ✅ Approve/Reject/Roles |
| 26 | PDPA Consent | ✅ Full Control | — | — |
| 27 | Notifications | ✅ Receive + Read | ✅ Receive + Read | ✅ Receive + Read |
| 28 | Profile Management | ✅ Edit | ✅ Edit | ✅ Edit |
| 29 | Settings | ✅ Theme/Language/Notif | — | — |
| 30 | Timeline | ✅ Full History | — | — |
| 31 | Map (Healthcare) | ✅ Nearby Facilities | — | — |
| 32 | Audit Trail | — | — | ✅ View |

---


## 8. All System Actions by Category


### Authentication Actions

| Action | Trigger | Tables Affected | Notification |
| ------ | ------- | --------------- | ------------ |
| Register (Patient) | Register form submit | INSERT users, patient_profiles | — |
| Register (Doctor) | Register form submit | INSERT users → status: pending | Admin notified |
| Login | Login form | UPDATE users.last_login, INSERT sessions | — |
| Logout | Logout button | UPDATE sessions.logged_out_at | — |
| Forgot Password | Email form | INSERT password_resets | Email sent |
| Reset Password | Reset form | UPDATE users.password_hash, UPDATE password_resets.used | — |


### Appointment Actions

| Action | Actor | Tables Affected | Notifications |
| ------ | ----- | --------------- | ------------- |
| Book appointment | Patient | INSERT appointments | Admin + Doctor notified |
| AI triage | System | UPDATE appointments.ai_triage | — |
| Auto-assign doctor | Admin/System | UPDATE appointments.doctor_id | Doctor notified |
| Claim from pool | Doctor | UPDATE appointments.doctor_id | Patient notified |
| Confirm appointment | Doctor | UPDATE status='confirmed', generate Jitsi link | Patient notified |
| Decline appointment | Doctor | UPDATE status='declined' | Patient + Admin notified |
| Cancel appointment | Patient/Doctor | UPDATE status='cancelled' | Other party notified |


### Meeting Actions

| Action | Actor | Tables Affected | Events |
| ------ | ----- | --------------- | ------ |
| Create meeting room | Doctor | INSERT meeting_records | Socket: meeting:created |
| Join lobby | Patient | — | Socket: lobby-request |
| Admit from lobby | Doctor | — | Socket: lobby-admit |
| Start transcription | System | — | Socket: transcript-start |
| Save transcript segment | System | INSERT meeting_transcripts | Socket: transcript-update |
| Start recording | Doctor | UPDATE meeting_records | Socket: recording-started |
| Stop recording | Doctor | UPDATE meeting_records (BYTEA) | Socket: recording-stopped |
| End meeting | Doctor | UPDATE meeting_records.status | Socket: meeting-ended |


### Clinical Documentation Actions

| Action | Actor | Tables Affected | Notifications |
| ------ | ----- | --------------- | ------------- |
| AI generate EMR | System | INSERT emr (draft), INSERT ai_validations | Doctor sees draft |
| Approve AI EMR | Doctor | UPDATE emr, UPDATE ai_validations | — |
| Edit AI EMR | Doctor | UPDATE emr, INSERT ai_validations | — |
| Sign EMR | Doctor | UPDATE emr.signed_at, status='signed' | Patient notified |
| Create prescription | Doctor | INSERT prescriptions | Patient notified |
| Order labs | Doctor | INSERT lab_orders | Patient notified |
| Upload lab results | Doctor | UPDATE lab_orders.results | Patient notified |
| Generate instructions | System (AI) | UPDATE emr.patient_instructions | — |
| Approve instructions | Doctor | UPDATE ai_validations | Patient notified |


### PHR Actions

| Action | Actor | Tables Affected |
| ------ | ----- | --------------- |
| Record vital signs | Patient | INSERT vital_signs, UPDATE phr |
| Update medications | Patient | UPDATE phr.medications JSONB |
| Update allergies | Patient | UPDATE phr.allergies JSONB |
| Update lifestyle | Patient | UPDATE phr.lifestyle JSONB |
| Create living will | Patient | INSERT living_wills |
| Update living will | Patient | UPDATE living_wills, INSERT living_will_versions |
| Share living will | Patient | UPDATE living_wills.is_shared_with_doctors |


### Content Management Actions

| Action | Actor | Tables Affected | Workflow |
| ------ | ----- | --------------- | -------- |
| Create article | Doctor | INSERT medical_content (status:draft) | → Submit → Pending |
| Submit for review | Doctor | UPDATE medical_content (status:pending) | → Admin queue |
| Approve article | Admin | UPDATE medical_content (status:published) | → Visible to patients |
| Reject article | Admin | UPDATE medical_content (status:draft) | → Back to author |
| Create clinical resource | Doctor | INSERT clinical_resources (status:pending) | → Admin queue |
| Approve resource | Admin | UPDATE clinical_resources (status:approved) | → RAG indexed |


### Admin-Only Actions

| Action | Tables Affected | Description |
| ------ | --------------- | ----------- |
| Approve doctor registration | UPDATE users.approval_status, is_approved | Doctor can now login |
| Reject doctor registration | UPDATE users.approval_status, rejected_at | Doctor account denied |
| Change user role | UPDATE users.role, role_updated_at | Doctor ↔ Admin |
| Toggle doctor status | UPDATE users.is_active | Enable/disable account |
| Manage consultants | INSERT/UPDATE/DELETE consultants | Specialist directory |
| View audit logs | SELECT audit_logs | Compliance review |

---


## 9. Notification Flow Across System


### Notification Types & Triggers

```text
📅 APPOINTMENT NOTIFICATIONS
├── appointment_requested    → Admin (patient booked new appointment)
├── appointment_confirmed    → Patient (doctor confirmed + meeting link)
├── appointment_declined     → Patient (doctor declined)
├── appointment_cancelled    → Other party (cancelled by either)
├── appointment_reminder     → Both (30 min before meeting)
└── appointment_assigned     → Doctor (admin assigned from pool)

📹 MEETING NOTIFICATIONS
├── meeting_started          → Patient (doctor opened room)
├── meeting_ended            → Patient (consultation complete)
└── meeting_summary_ready    → Doctor (AI summary generated)

📋 CLINICAL NOTIFICATIONS
├── emr_ready                → Patient (EMR signed by doctor)
├── prescription_created     → Patient (new prescription)
├── lab_results              → Patient (lab results uploaded)
├── patient_instructions     → Patient (instruction sheet ready)
└── cds_alert                → Doctor (drug interaction warning)

📝 CONTENT NOTIFICATIONS
├── content_submitted        → Admin (article pending review)
├── content_approved         → Doctor (article published)
└── content_rejected         → Doctor (article needs revision)

👤 ADMIN NOTIFICATIONS
├── doctor_registered        → Admin (new doctor registration)
├── doctor_approved          → Doctor (account approved)
└── doctor_rejected          → Doctor (account rejected)
```


### Notification Delivery Path

```text
Event occurs (e.g., EMR signed)
         │
         ▼
INSERT INTO notifications (user_id, type, title, message, data)
         │
         ▼
PostgreSQL NOTIFY trigger fires
         │
         ▼
pgNotifyListener catches event
         │
         ▼
Socket.IO emit('notification:new', payload)
         │
         ▼
Client NotificationBell component updates badge count
         │
         ▼
User clicks → reads notification → UPDATE notifications.read_at
```

---


## 10. Content Lifecycle


### Medical Content (Patient-Facing Articles)

```text
Doctor Creates Article
    │
    ▼ status: 'draft'
    │
    ├─ Edit, preview, save
    │
    ▼ Doctor submits for review
    │  status: 'pending'
    │  → notification to admin
    │
    ├─ Admin reviews
    │
    ├──→ APPROVED → status: 'published' → Visible in Patient Health Library
    │    → notification to author
    │
    └──→ REJECTED → status: 'draft' → Back to author with reason
         → notification to author
         → Author can edit and resubmit

Edit published content → Re-triggers approval cycle
```


### Clinical Resources (Doctor-Facing Guidelines)

```text
Doctor Creates Resource
    │
    ▼ status: 'pending'
    │
    ├─ Admin reviews
    │
    ├──→ APPROVED → status: 'approved'
    │    → Indexed into RAG knowledge_base (pgvector embeddings)
    │    → Available in AI chat search
    │    → notification to author
    │
    └──→ REJECTED → status: 'draft'
         → notification to author
```
