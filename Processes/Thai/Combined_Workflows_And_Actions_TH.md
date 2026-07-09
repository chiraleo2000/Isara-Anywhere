# 🔄 Izara Telemedicine — Combined Workflows, Processes & Actions

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `Combined_Workflows_And_Actions.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`Combined_Workflows_And_Actions.md`](../Combined_Workflows_And_Actions.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.7.54
**อัปเดตล่าสุด:** June 25, 2026
**สถานะ:** ✅ Phase 1 Complete


> **Start here for diagrams:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) — platform topology, pipeline, ฟีเจอร์ matrix.

---


## 📋 สารบัญ

1. [End-to-End ผู้ป่วย Journey](#1-end-to-end-ผู้ป่วย-journey)
2. [End-to-End แพทย์ Workflow](#2-end-to-end-แพทย์-workflow)
3. [End-to-End ผู้ดูแลระบบ Workflow](#3-end-to-end-ผู้ดูแลระบบ-workflow)
4. [Complete นัดหมาย-to-Delivery Pipeline](#4-complete-นัดหมาย-to-delivery-pipeline)
5. [Cross-Portal Data Synchronization](#5-cross-portal-data-synchronization)
6. [AI-Assisted Clinical Pipeline](#6-ai-assisted-clinical-pipeline)
7. [Complete ฟีเจอร์ Matrix](#7-complete-ฟีเจอร์-matrix)
8. [All System Actions by Category](#8-all-system-actions-by-category)
9. [Notification Flow Across System](#9-notification-flow-across-system)
10. [Content Lifecycle (Create → Approve → Publish)](#10-content-lifecycle)

---


## 1. End-to-End Patient Journey

The complete ผู้ป่วย experience from registration to post-consultation.

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
| Onboarding | Dashboard | View upcoming นัดหมาย, view การแจ้งเตือน, view health snapshot |
| Pre-Consultation | PHR | Record vitals, update medications, manage allergies, update lifestyle |
| Pre-Consultation | จองนัด นัดหมาย | Select doctor/specialty, describe symptoms, AI triage, choose date/time |
| Consultation | นัดหมาย Detail | View meeting link, join lobby, enter video call |
| Post-Consultation | Timeline | View treatment history, filter by type, view EMR summaries |
| Ongoing | AI แพทย์ | Chat health questions, get preliminary advice |
| Ongoing | Health Library | Search articles, browse by category, read content |
| Ongoing | หนังสือแสดงเจตจำนอง | 4-ขั้นตอน wizard, digital signature, share with doctors |
| Privacy | PDPA | Manage consent, control แพทย์ access, view audit trail |
| Account | Profile/Settings | Edit info, change password, set การแจ้งเตือน, theme/language |

---


## 2. End-to-End Doctor ขั้นตอนการทำงาน

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


## 3. End-to-End Admin ขั้นตอนการทำงาน

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


### All ฟีเจอร์ by Portal & Role

| # | ฟีเจอร์ | พอร์ทัลผู้ป่วย | พอร์ทัลแพทย์ (แพทย์) | พอร์ทัลแพทย์ (ผู้ดูแลระบบ) |
| - | ------- | -------------- | ---------------------- | --------------------- |
| 1 | Register/Login | ✅ | ✅ | ✅ |
| 2 | Password Reset | ✅ | ✅ | ✅ |
| 3 | Dashboard | ✅ Stats + Quick Actions | ✅ ผู้ป่วย Queue + Stats | ✅ System-wide Stats |
| 4 | จองนัด นัดหมาย | ✅ | — | — |
| 5 | View นัดหมาย | ✅ (own) | ✅ (assigned) | ✅ (all) |
| 6 | Manage นัดหมาย | — | ✅ Confirm/Decline | ✅ Assign/Reject |
| 7 | นัดหมาย Pool | — | ✅ Claim | ✅ Manual มอบหมาย |
| 8 | ประชุมวิดีโอ | ✅ Join (Lobby) | ✅ Host | ✅ Host |
| 9 | Queue Management | — | ✅ Call/Skip/Complete | ✅ |
| 10 | PHR Management | ✅ Full CRUD | ✅ Read (assigned) | ✅ Read (all) |
| 11 | Vital Signs | ✅ Record | ✅ View (assigned) | ✅ View (all) |
| 12 | EMR Records | ✅ View Summary | ✅ Full CRUD | ✅ Full CRUD |
| 13 | ใบสั่งยา | ✅ View | ✅ Create/Sign | ✅ Create/Sign |
| 14 | คำสั่งตรวจแล็บ | ✅ View Results | ✅ Order/View | ✅ Order/View |
| 15 | ผู้ป่วย Record Viewer | — | ✅ PHR/EMR/EHR tabs | ✅ |
| 16 | หนังสือแสดงเจตจำนอง | ✅ Create/Manage/Share | ✅ View (if shared) | ✅ View (if shared) |
| 17 | AI Health Chat | ✅ Basic Advice | — | — |
| 18 | AI Studio (Gemini) | — | ✅ Medical AI + Calcs | ✅ |
| 19 | AI EMR Generation | — | ✅ Review/Approve | ✅ |
| 20 | AI ผู้ป่วย Instructions | — | ✅ Generate/Approve | ✅ |
| 21 | Medical Content | ✅ Read (published) | ✅ Create/Edit Own | ✅ Full CRUD + Approve |
| 22 | Clinical Resources | — | ✅ Create/Edit Own | ✅ Full CRUD + Approve |
| 23 | Medical Consultants | — | ✅ View/Rate/Contact | ✅ Full CRUD |
| 24 | แพทย์ Directory | — | ✅ View | ✅ Add/Verify/Toggle |
| 25 | แพทย์ Management | — | — | ✅ Approve/Reject/Roles |
| 26 | PDPA Consent | ✅ Full Control | — | — |
| 27 | การแจ้งเตือน | ✅ Receive + Read | ✅ Receive + Read | ✅ Receive + Read |
| 28 | Profile Management | ✅ Edit | ✅ Edit | ✅ Edit |
| 29 | Settings | ✅ Theme/Language/Notif | — | — |
| 30 | Timeline | ✅ Full History | — | — |
| 31 | Map (Healthcare) | ✅ Nearby Facilities | — | — |
| 32 | Audit Trail | — | — | ✅ View |

---


## 8. All System Actions by Category


### Authentication Actions

| การกระทำ | Trigger | Tables Affected | Notification |
| ------ | ------- | --------------- | ------------ |
| Register (ผู้ป่วย) | Register form submit | INSERT users, patient_profiles | — |
| Register (แพทย์) | Register form submit | INSERT users → สถานะ: รอดำเนินการ | ผู้ดูแลระบบ notified |
| Login | Login form | UPDATE users.last_login, INSERT sessions | — |
| Logout | Logout button | UPDATE sessions.logged_out_at | — |
| Forgot Password | Email form | INSERT password_resets | Email sent |
| Reset Password | Reset form | UPDATE users.password_hash, UPDATE password_resets.used | — |


### Appointment Actions

| การกระทำ | ผู้ดำเนินการ | Tables Affected | การแจ้งเตือน |
| ------ | ----- | --------------- | ------------- |
| จองนัด นัดหมาย | ผู้ป่วย | INSERT นัดหมาย | ผู้ดูแลระบบ + แพทย์ notified |
| AI triage | System | UPDATE นัดหมาย.ai_triage | — |
| Auto-มอบหมาย แพทย์ | Admin/System | UPDATE นัดหมาย.doctor_id | แพทย์ notified |
| Claim from pool | แพทย์ | UPDATE นัดหมาย.doctor_id | ผู้ป่วย notified |
| ยืนยัน นัดหมาย | แพทย์ | UPDATE สถานะ='ยืนยันแล้ว', generate Jitsi link | ผู้ป่วย notified |
| Decline นัดหมาย | แพทย์ | UPDATE สถานะ='declined' | ผู้ป่วย + ผู้ดูแลระบบ notified |
| Cancel นัดหมาย | Patient/Doctor | UPDATE สถานะ='cancelled' | Other party notified |


### Meeting Actions

| การกระทำ | ผู้ดำเนินการ | Tables Affected | Events |
| ------ | ----- | --------------- | ------ |
| Create meeting room | แพทย์ | INSERT meeting_records | Socket: meeting:created |
| Join lobby | ผู้ป่วย | — | Socket: lobby-request |
| Admit from lobby | แพทย์ | — | Socket: lobby-admit |
| Start transcription | System | — | Socket: transcript-start |
| Save transcript segment | System | INSERT meeting_transcripts | Socket: transcript-update |
| Start recording | แพทย์ | UPDATE meeting_records | Socket: recording-started |
| Stop recording | แพทย์ | UPDATE meeting_records (BYTEA) | Socket: recording-stopped |
| End meeting | แพทย์ | UPDATE meeting_records.สถานะ | Socket: meeting-ended |


### Clinical Documentation Actions

| การกระทำ | ผู้ดำเนินการ | Tables Affected | การแจ้งเตือน |
| ------ | ----- | --------------- | ------------- |
| AI generate EMR | System | INSERT emr (draft), INSERT ai_validations | แพทย์ sees draft |
| Approve AI EMR | แพทย์ | UPDATE emr, UPDATE ai_validations | — |
| Edit AI EMR | แพทย์ | UPDATE emr, INSERT ai_validations | — |
| ลงนาม EMR | แพทย์ | UPDATE emr.signed_at, สถานะ='ลงนามแล้ว' | ผู้ป่วย notified |
| Create ใบสั่งยา | แพทย์ | INSERT ใบสั่งยา | ผู้ป่วย notified |
| Order labs | แพทย์ | INSERT lab_orders | ผู้ป่วย notified |
| Upload lab results | แพทย์ | UPDATE lab_orders.results | ผู้ป่วย notified |
| Generate instructions | System (AI) | UPDATE emr.patient_instructions | — |
| Approve instructions | แพทย์ | UPDATE ai_validations | ผู้ป่วย notified |


### PHR Actions

| การกระทำ | ผู้ดำเนินการ | Tables Affected |
| ------ | ----- | --------------- |
| Record vital signs | ผู้ป่วย | INSERT vital_signs, UPDATE phr |
| Update medications | ผู้ป่วย | UPDATE phr.medications JSONB |
| Update allergies | ผู้ป่วย | UPDATE phr.allergies JSONB |
| Update lifestyle | ผู้ป่วย | UPDATE phr.lifestyle JSONB |
| Create หนังสือแสดงเจตจำนอง | ผู้ป่วย | INSERT living_wills |
| Update หนังสือแสดงเจตจำนอง | ผู้ป่วย | UPDATE living_wills, INSERT living_will_versions |
| Share หนังสือแสดงเจตจำนอง | ผู้ป่วย | UPDATE living_wills.is_shared_with_doctors |


### Content Management Actions

| การกระทำ | ผู้ดำเนินการ | Tables Affected | Workflow |
| ------ | ----- | --------------- | -------- |
| Create article | แพทย์ | INSERT medical_content (สถานะ:draft) | → Submit → รอดำเนินการ |
| Submit for review | แพทย์ | UPDATE medical_content (สถานะ:รอดำเนินการ) | → ผู้ดูแลระบบ queue |
| Approve article | ผู้ดูแลระบบ | UPDATE medical_content (สถานะ:published) | → Visible to patients |
| Reject article | ผู้ดูแลระบบ | UPDATE medical_content (สถานะ:draft) | → Back to author |
| Create clinical resource | แพทย์ | INSERT clinical_resources (สถานะ:รอดำเนินการ) | → ผู้ดูแลระบบ queue |
| Approve resource | ผู้ดูแลระบบ | UPDATE clinical_resources (สถานะ:approved) | → RAG indexed |


### Admin-Only Actions

| การกระทำ | Tables Affected | คำอธิบาย |
| ------ | --------------- | ----------- |
| Approve แพทย์ registration | UPDATE users.approval_status, is_approved | แพทย์ can now login |
| Reject แพทย์ registration | UPDATE users.approval_status, rejected_at | แพทย์ account denied |
| Change user role | UPDATE users.role, role_updated_at | แพทย์ ↔ ผู้ดูแลระบบ |
| Toggle แพทย์ สถานะ | UPDATE users.is_active | Enable/disable account |
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