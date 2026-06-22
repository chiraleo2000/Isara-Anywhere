# 📄 Izara Telemedicine — Page-by-Page Documentation

**Version:** 1.7.33
**Last Updated:** 27 May 2026 (v1.7.33 — ENRICH-7: TH Sarabun New 16 pt / FC Iconic / โครงสร้างเทคนิค)
**Status:** ✅ Phase 1 Complete — Web Platform Documentation + Full DB Schema

---

## มาตรฐานเอกสาร (ภาษาไทย)

| ประเภท | แบบอักษร | ขนาด |
|--------|----------|------|
| รายงาน / คู่มือ Word | **TH Sarabun New** | เนื้อหา **16 pt**, หัวข้อ 18–22 pt, ระยะบรรทัด 1.15 |
| สไลด์ PowerPoint | **FC Iconic** | หัวข้อ 32 pt, เนื้อหา 18 pt |

ทุกหน้าในโฟลเดอร์นี้มี **§ มาตรฐานเอกสาร**, **§ คำอธิบายและบริบท (รายงานภาษาไทย)** และ **§ ขั้นตอนการใช้งาน (ละเอียด)** — อัปเดตด้วย `python scripts/enrich-process-pages.py --force-steps`

คู่มือผู้ใช้: `Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` · `Documents/docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx` — `python scripts/build-portal-user-guides.py`

โครงสร้างเทคนิค: `Documents/docs/technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx` · `Documents/docs/technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx` · `Documents/docs/diagrams/diagrams.drawio` · `Documents/docs/technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html` — `npm run guides:technical`

**ล้างข้อมูลทดสอบ (ไม่ re-seed demo):** `npm run cleanup:cloud-test-only` — ต้องมี `DB_PASSWORD` ถูกต้องใน `.env`

---

## 📋 Overview

Each page spec includes **§ Automated verification** (test files, Playwright groups, `data-testid` refs, last verified date). Master registry: [tests/SELECTORS.md](../../tests/SELECTORS.md) · coverage: [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md).

This folder contains **comprehensive page-level documentation** for every page and major component across the Izara Telemedicine platform. Each document describes:


- **Page purpose and layout** — what the page does, how it looks

- **Features and actions** — every button, form, modal, tab

- **Workflows and processes** — step-by-step user flows on that page

- **API endpoints used** — backend calls made from the page

- **Connections to other pages** — navigation and data flow

- **AI agent improvement notes** — future automation opportunities

> **🎯 Phase 1 Core Deliverable:** The meeting workflow documentation covers the complete end-to-end flow:
> Appointment → Multi-Party Meeting (Microsoft Teams-like) → Transcript Streaming → AI Summary Pipeline → EMR → Patient Delivery

---


## 🎯 Meeting Workflow Page Navigation

The core Phase 1 meeting workflow spans across multiple pages. Here’s the flow:

```text
APPOINTMENT BOOKING → MEETING → AI PROCESSING → EMR → PATIENT DELIVERY

🧑 Patient Portal:                          👨‍⚕️ Doctor Portal:
┌─────────────────────────────┐    ┌─────────────────────────────┐
│05_Appointments → Book appt  │    │06_Health_Meeting → Queue    │
└─────────────┬───────────────┘    └─────────────┬───────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│05_Appointments → Join mtg  │    │07_Virtual_Meeting → HOST   │
│  + invite relatives       │    │  + transcript streaming   │
│  + lobby → doctor admits  │    │  + chat + recording       │
└─────────────┬───────────────┘    └─────────────┬───────────────┘
              │                                │
              ▼                                ▼
         Meeting Server (00)        ┌─────────────────────────────┐
         AI Pipeline → Summary      │06_Health_Meeting → Results │
                                    │  + Man-in-the-Loop review  │
                                    └─────────────┬───────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │08_EMR_Editor → SOAP tabs  │
                                    │  + AI pre-filled           │
                                    │  + Sign & Finalize         │
                                    └─────────────┬───────────────┘
              ┌─────────────────────────────┤
              ▼                                │
┌─────────────────────────────┐    PATIENT RECEIVES:
│04_Dashboard → Latest Result│    • Diagnosis + Treatment
│14_Timeline → Treatment Hx  │    • Instruction Sheet (PDF)
│06_PHR → Health Logs        │    • Medications + Dosage
│15_Notifications → Alerts   │    • Follow-up Schedule
└─────────────────────────────┘    • Warning Signs
```

---


## 🗂️ Folder Structure

```text
Pages/
├── README.md                                    ← This file (index & navigation)
│
├── Patient-Portal/                              ← Patient Portal pages
│   ├── 00_Patient_Portal_Overview.md            ← Portal architecture & navigation
│   ├── 01_Login_Page.md                         ← Authentication & login
│   ├── 02_Register_Page.md                      ← Patient registration
│   ├── 03_Reset_Password_Page.md                ← Password recovery
│   ├── 04_Dashboard_Page.md                     ← Patient home dashboard
│   ├── 05_Appointments_Page.md                  ← Appointment list & booking
│   ├── 06_PHR_Page.md                           ← Personal Health Records
│   ├── 07_AI_Doctor_Page.md                     ← AI Health Assistant chat
│   ├── 08_Medical_Content_Library.md            ← Health knowledge library
│   ├── 09_Map_Page.md                           ← Nearby healthcare map
│   ├── 10_PDPA_Page.md                          ← Privacy & consent management
│   ├── 11_Living_Will_Page.md                   ← Living will management
│   ├── 12_Profile_Page.md                       ← User profile management
│   ├── 13_Settings_Page.md                      ← App settings
│   ├── 14_Timeline_Page.md                      ← Treatment history timeline
│   └── 15_Notification_System.md                ← Notification bell & alerts
│
├── Doctor-Portal/                               ← Doctor Portal pages
│   ├── 00_Doctor_Portal_Overview.md             ← Portal architecture & navigation
│   ├── 01_Login_Page.md                         ← Doctor/admin authentication
│   ├── 02_Reset_Password_Page.md                ← Password recovery
│   ├── 03_Dashboard_Page.md                     ← Doctor home dashboard
│   ├── 04_Schedule_Page.md                      ← Appointment schedule/calendar
│   ├── 05_Patient_Management_Page.md            ← Patient list & records
│   ├── 06_Health_Meeting_Page.md                ← Patient queue & meeting management
│   ├── 07_Virtual_Meeting.md                    ← Video consultation (Jitsi)
│   ├── 08_EMR_Editor.md                         ← Electronic Medical Record editor
│   ├── 09_Prescribing.md                        ← E-Prescribing system
│   ├── 10_Lab_Orders.md                         ← Lab & imaging orders
│   ├── 11_Patient_Record_Viewer.md              ← PHR/EMR/EHR viewer
│   ├── 12_Medical_Consultants_Page.md           ← Specialist directory
│   ├── 13_Medical_Content_Page.md               ← Health education content
│   ├── 14_Clinical_Resources_Page.md            ← Clinical guidelines & protocols
│   ├── 15_Gemini_AI_Studio.md                   ← AI assistant & calculators
│   ├── 16_Doctor_Profile_Page.md                ← Doctor profile management
│   ├── 17_Admin_Appointment_Management.md       ← Admin appointment control
│   ├── 18_Admin_Doctor_Management.md            ← Admin doctor approval
│   ├── 19_Doctors_Management_Page.md            ← Doctor directory management
│   ├── 20_Appointment_Pool_Management.md        ← Unassigned appointment pool
│   └── 21_Queue_Management.md                   ← Real-time patient queue
│
└── Meeting-Server/                              ← Jitsi Meeting Server
    └── 00_Meeting_Server_Overview.md            ← Server architecture & all features
```

---


## 🌐 Portal URLs

| Service | Local URL | Cloud URL |
| ------- | --------- | --------- |
| Patient Portal | <http://localhost:3005> | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <http://localhost:3010> | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |
| Meeting Server | <http://localhost:3020> | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> |



---


## 🔗 Cross-References

| Process Document | Related Page Docs | Meeting Workflow Role |
| ---------------- | ----------------- | --------------------- |
| `Appointment_Workflows.md` | Patient: 05, Doctor: 04, 06, 07, 17, 20 | 🎯 **Core** — Full appointment-to-delivery lifecycle |
| `VIDEO_MEETING_JITSI_GEMINI.md` | Patient: 05, Doctor: 06, 07, 08, Meeting Server | 🎯 **Core** — Meeting implementation details |
| `PHASE1_REQUIREMENTS.md` | All meeting-related pages | 🎯 **Core** — Stakeholder requirements & testing |
| `Health_Records_Processes.md` | Patient: 06, 14, Doctor: 08, 09, 10, 11 | EMR/PHR data flow |
| `User_management_Workflows.md` | Patient: 01-03, 12, Doctor: 01-02, 16, 18-19 | User authentication |
| `Notification_Workflows.md` | Patient: 15, Doctor: 03 | Meeting notifications |
| `Living_Will_Processes.md` | Patient: 10, 11, Doctor: 11 | Patient directives |
| `Medicine_Content_Processes.md` | Patient: 08, Doctor: 13, 14 | Medical knowledge |
| `Medical_Consultants_Workflows.md` | Doctor: 12 | Specialist directory |
| `Data_Sync_Documentation.md` | All pages (database architecture) | PostgreSQL storage |



---


## 🗄️ PostgreSQL Database Architecture

All page documentation now includes a **PostgreSQL Database Integration** section mapping each page to its database tables, API endpoints, and deployment targets.

| Component | Detail |
| --------- | ------ |
| **Database** | PostgreSQL 18 + pgvector (izara_phase1) |
| **Extensions** | uuid-ossp, pgcrypto, pgvector |
| **Tables** | 37+ across 8 groups (User Mgmt, Patient Data, Doctor Mgmt, Appointments, Clinical, Content, AI/CDS, Audit) |
| **Local Docker** | izara-postgres:5432 (external 5433) via docker-compose.yml |
| **Production** | GCE VM at 35.240.157.230:5432 (asia-southeast1, NOT Cloud SQL) |
| **Real-time** | LISTEN/NOTIFY triggers → pgNotifyListener → Socket.IO rooms |
| **AI** | Gemini 2.5 Flash Lite, pgvector embeddings for RAG |




### Page-to-Database Coverage

| Portal | Pages | Tables Referenced | Key Data Flows |
| ------ | ----- | ----------------- | -------------- |
| **Doctor Portal** | 22 pages | users, doctor_profiles, appointments, meeting_records, emr, prescriptions, lab_orders, ai_chat_history, medical_content, clinical_resources, consultants, drugs, cds_logs | Login → Dashboard → Schedule → Meeting → EMR → Prescribe → Lab Orders |
| **Patient Portal** | 16 pages | users, patient_profiles, appointments, phr, vital_signs, living_wills, ai_chat_history, medical_content, notifications, patient_consents, push_subscriptions | Login → Register → Dashboard → Book Appointment → Join Meeting → View EMR/PHR |
| **Meeting Server** | 1 page | meeting_records, meeting_transcripts, transcriptions_embeddings, appointments, emr, ai_validations, ai_chat_history, ai_chat_memory | Start Meeting → Transcribe → AI Summary → Man-in-the-Loop → EMR |




### 📋 Meeting Workflow Page Map

| Step | Action | Page Doc(s) |
| ---- | ------ | ----------- |
| 1 | Patient books appointment | Patient/05_Appointments |
| 2 | Admin assigns (pool) or Doctor confirms | Doctor/17_Admin_Appointment, Doctor/06_Health_Meeting |
| 3 | Patient invites relatives/friends | Patient/05_Appointments |
| 4 | Doctor invites other doctors/admin | Doctor/06_Health_Meeting |
| 5 | AI pre-consultation summary | Doctor/15_Gemini_AI_Studio, Doctor/03_Dashboard |
| 6 | Doctor starts meeting (HOST) | Doctor/07_Virtual_Meeting |
| 7 | Patient + Guests enter LOBBY | Patient/05_Appointments, Meeting-Server/00 |
| 8 | Doctor starts transcript streaming | Doctor/07_Virtual_Meeting |
| 9 | Video + Audio + Chat | Doctor/07_Virtual_Meeting, Meeting-Server/00 |
| 10 | Doctor ends meeting | Doctor/07_Virtual_Meeting |
| 11 | AI processes transcript + chat | Meeting-Server/00, Doctor/15_Gemini_AI_Studio |
| 12 | Doctor reviews AI summary | Doctor/06_Health_Meeting |
| 13 | Doctor creates EMR (AI-prefilled) | Doctor/08_EMR_Editor |
| 14 | Doctor generates Patient Instruction | Doctor/08_EMR_Editor, Doctor/15_Gemini_AI_Studio |
| 15 | Patient receives results | Patient/04_Dashboard, Patient/14_Timeline |
| 16 | Patient downloads Instruction PDF | Patient/14_Timeline, Patient/05_Appointments |
| 17 | Meeting notifications throughout | Patient/15_Notification_System |


