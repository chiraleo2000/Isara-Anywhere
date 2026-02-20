# 📱 Izara Dr. Anywhere — Mobile Application Product Description

**Version:** 2.2.0  
**Date:** February 2026  
**Status:** 📋 Planning & Architecture  
**App Name:** "Izara Dr. Anywhere" (อิซาร่า หมอทุกที่)  
**Platform:** React Native (Expo) — iOS & Android  
**App Type:** Unified Single App — Patient & Doctor in One  
**System Type:** AI-Based HIS (Health Information System)

---

## 1. Product Vision

> **"หมอทุกที่ — ดูแลสุขภาพได้ทุกที่ทุกเวลา"**  
> (Doctor Anywhere — Healthcare accessible anytime, anywhere)

Izara Dr. Anywhere is a **single unified mobile application** that serves as the frontend for a **complete AI-Based Health Information System (HIS)**. The app goes beyond traditional telemedicine — it supports the full clinical workflow (Task 1–5): patient intake with AI history taking, healthcare team dashboards, investigation management (Lab/Radiology/Pathology), prescription & treatment (modern + Thai traditional medicine), and referral/data exchange with hospital HIS systems.

The platform serves **5 user groups:** General Clinics, CTM Clinics (แพทย์แผนไทย), Elderly Care facilities, Health Centers (รพ.สต.), and Hospital OPDs. Users select their role at the start and experience a tailored interface for their needs.

### 1.1 The 4 Pillars

| Pillar | Description |
| -------- | ------------- |
| **Smart Data Architecture** | FHIR-compliant records, pgvector for RAG, machine-readable data |
| **AI Integration Layers** | Medical Scribe, Predictive Analytics, CDS, AI History Taking |
| **Modern Healthcare UI/UX** | Role-Based Dashboards, Wearable IoT, CTM-specific interfaces |
| **Security & Compliance** | PDPA/HIPAA, Immutable Audit Logs, RBAC, e-Consent |

### 1.1 Why One App?

| Aspect | Two Separate Apps ❌ | One Unified App ✅ |
| -------- | --------------------- | ------------------- |
| **User Experience** | Users must find/install the right app | One download, choose role |
| **App Store Presence** | Diluted downloads across 2 listings | Single listing, higher visibility |
| **Maintenance** | Update 2 apps, 2 builds, 2 reviews | Single codebase, single release |
| **Code Sharing** | Some duplication | Maximum code reuse, shared packages |
| **Role Switching** | Install the other app | Switch role in settings (if authorized) |
| **Family Use** | Install both apps | Doctor parent, patient child — same app |
| **Brand Consistency** | Risk of divergent branding | Unified Izara brand identity |

### 1.2 Target Users

| User Type | Description | Thai |
| ----------- | ------------- | ------ |
| **Patient** | Anyone seeking healthcare services, booking appointments, tracking health | ผู้ป่วย / ผู้ใช้ทั่วไป |
| **Doctor** | Licensed medical professionals providing telemedicine/in-clinic consultations | แพทย์ / ผู้ให้บริการทางการแพทย์ |
| **CTM Practitioner** | Thai Traditional Medicine practitioners (แพทย์แผนไทย) | แพทย์แผนไทยประยุกต์ |
| **Nurse** | Nursing staff in elderly care facilities, clinics, health centers | พยาบาล / เจ้าหน้าที่ดูแล |
| **Admin** | System administrators managing doctors, clinics, appointments | ผู้ดูแลระบบ |
| **Elderly/Caregiver** | Elderly patients in care facilities or their family caregivers | ผู้สูงอายุ / ผู้ดูแล |

### 1.3 Target Facilities

| Facility | Thai | Key Features |
| ---------- | ------ | ------------- |
| **General Clinics** | คลินิกเวชกรรม (franchise) | AI History Taking, Queue, Prescription |
| **CTM Clinics** | คลินิกแพทย์แผนไทยประยุกต์ | ธาตุเจ้าเรือน, สมุฏฐาน, Herbal Rx |
| **Elderly Care** | ศูนย์ดูแลผู้สูงอายุ / Home Care | Geriatric Screening, Nursing Dashboard, SOS |
| **Health Centers** | รพ.สต. | HIS Integration, PHR Sync, Referral |
| **Hospital OPD** | แผนกผู้ป่วยนอก | Full EMR, Lab/Radiology/Pathology |

### 1.3 App Store Description

**App Name:** Izara Dr. Anywhere — อิซาร่า หมอทุกที่  
**Subtitle:** Telemedicine for Patients & Doctors | การแพทย์ทางไกลสำหรับทุกคน  
**Category:** Medical / Health & Fitness  
**Content Rating:** 12+ (Medical Information)  
**Size Target:** < 80 MB  
**Languages:** Thai (Primary), English

**Short Description:**  
> "แอปเดียวสำหรับทั้งผู้ป่วยและแพทย์ — นัดหมาย ปรึกษาวิดีโอ ดูแลสุขภาพ AI ช่วยเหลือ จ่ายเงินออนไลน์ ทุกอย่างในที่เดียว"

**Long Description:**  
> Izara Dr. Anywhere — AI-Based HIS ครบวงจร รวมทุกอย่างในแอปเดียว ทั้งฝั่งผู้ป่วย แพทย์ พยาบาล และผู้ดูแลระบบ  
> ✅ AI History Taking — ซักประวัติอัจฉริยะ ครอบคลุม OPD Card & Intake Form อัตโนมัติ  
> ✅ Smart Queue — ระบบคิวอัจฉริยะ Real-time ลดเวลารอพบแพทย์  
> ✅ นัดหมายแพทย์ออนไลน์ ง่ายใน 3 ขั้นตอน  
> ✅ วิดีโอคอลปรึกษาแพทย์ HD — AI Medical Scribe ช่วยบันทึกอัตโนมัติ  
> ✅ Gemini CDS — AI ช่วยวินิจฉัยและแนะนำการรักษา  
> ✅ แพทย์แผนไทย (CTM) — วิเคราะห์ธาตุเจ้าเรือน สมุฏฐาน สั่งยาสมุนไพร  
> ✅ ดูแลผู้สูงอายุ — Geriatric Screening (ADL, TUG, Mini-Cog, MNA, GDS)  
> ✅ Nursing Dashboard — แผนดูแลรายบุคคล พร้อม SOS ฉุกเฉิน  
> ✅ เวชระเบียนอิเล็กทรอนิกส์ FHIR R4 + Lab/Radiology/Pathology  
> ✅ Predictive Analytics — AI ทำนายความเสี่ยงสุขภาพ  
> ✅ บันทึกสุขภาพ วัดสัญญาณชีพ เชื่อมต่ออุปกรณ์  
> ✅ จ่ายเงินค่าปรึกษาออนไลน์ (Stripe, PromptPay)  
> ✅ HIS Integration — เชื่อมต่อ รพ.สต. และสถานพยาบาล  
> ✅ ค้นหาสถานพยาบาลใกล้เคียงด้วยแผนที่  

---

## 2. Unified App Architecture

### 2.1 Role Selection Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                     APP LAUNCH                                   │
│                                                                  │
│        ┌──────────────────────────────┐                          │
│        │      🏥 Izara Dr. Anywhere   │                          │
│        │                              │                          │
│        │   Welcome / ยินดีต้อนรับ      │                          │
│        │                              │                          │
│        │  ┌──────────┐ ┌──────────┐   │                          │
│        │  │ 🧑 ผู้ป่วย │ │ 👨‍⚕️ แพทย์ │   │                          │
│        │  │ Patient  │ │ Doctor   │   │                          │
│        │  └──────────┘ └──────────┘   │                          │
│        │                              │                          │
│        │   [Continue / ดำเนินการต่อ]   │                          │
│        └──────────────────────────────┘                          │
│                        │                                         │
│           ┌────────────┴────────────┐                            │
│           ▼                         ▼                            │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │ Patient Flow │         │ Doctor Flow  │                     │
│   │ Login/Reg    │         │ Login/2FA    │                     │
│   │ 5-tab Nav    │         │ 5-tab Nav    │                     │
│   │ Patient APIs │         │ Doctor APIs  │                     │
│   └──────────────┘         └──────────────┘                     │
│                                                                  │
│   ※ Role stored in app. User can switch via Settings.            │
│   ※ A doctor can also log in as patient (separate account).      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 App Navigation Map

```text
Izara Dr. Anywhere (Single App)
│
├── 🔀 Role Selection Screen ──────────────── First launch / switch role
│
├── ======= PATIENT MODE ========
│   ├── (auth)/
│   │   ├── login                             — Email/Password + Biometric
│   │   ├── register                          — 2-step registration
│   │   ├── forgot-password                   — Reset via email
│   │   ├── otp-verify                        — OTP verification
│   │   └── onboarding                        — First-time walkthrough
│   │
│   ├── (tabs)/                               — 5-tab bottom navigation
│   │   ├── 🏠 home (index)                   — Dashboard
│   │   ├── 📅 appointments                   — My Appointments
│   │   │   ├── index                         — Appointment list
│   │   │   ├── book                          — Book new (5-step wizard)
│   │   │   └── [id]                          — Appointment detail
│   │   ├── 💊 health                         — Health Records
│   │   │   ├── index                         — Health overview (PHR)
│   │   │   ├── vitals                        — Vital signs chart + entry
│   │   │   ├── medications                   — Medication list
│   │   │   ├── allergies                     — Allergy management
│   │   │   ├── timeline                      — Treatment timeline
│   │   │   ├── health-logs                   — EMR / Lab / Rx logs
│   │   │   ├── living-will                   — พินัยกรรมชีวิต
│   │   │   ├── devices                       — Connected wearables
│   │   │   └── scanner                       — Document scanner (OCR)
│   │   ├── 🤖 ai                             — AI Health Assistant
│   │   │   ├── index                         — AI Chat (Gemini)
│   │   │   ├── symptom-checker               — Symptom analysis
│   │   │   └── risk-assessment               — Health risk evaluation
│   │   └── 👤 profile                        — Profile & Settings
│   │       ├── index                         — Profile overview
│   │       ├── edit                          — Edit profile
│   │       ├── settings                      — App settings
│   │       ├── notifications                 — Notification preferences
│   │       ├── payments                      — Payment history + methods
│   │       ├── privacy                       — PDPA consent management
│   │       ├── api-connections               — Connected services / API tokens
│   │       └── language                      — Language (TH/EN) + theme
│   │
│   ├── meeting/                              — Full screen (outside tabs)
│   │   ├── [meetingId]                       — Video meeting (Jitsi)
│   │   ├── [meetingId]/feedback              — Post-meeting feedback
│   │   └── invite/[token]                    — Guest join via invite link
│   │
│   ├── map                                   — Nearby healthcare (Google Maps)
│   ├── health-library                        — Medical content library (read-only)
│   ├── notifications                         — Full notification center
│   └── content/[id]                          — Medical article detail
│
├── ======= DOCTOR MODE ========
│   ├── (auth)/
│   │   ├── login                             — Email/Password + Biometric
│   │   ├── two-factor                        — 2FA OTP verification
│   │   └── forgot-password                   — Reset via email
│   │
│   ├── (tabs)/                               — 5-tab bottom navigation
│   │   ├── 📊 dashboard (index)              — Doctor Dashboard (3-column on tablet)
│   │   ├── 📅 schedule                       — Schedule & Appointments
│   │   │   ├── index                         — Day/Week/Month calendar
│   │   │   ├── pending                       — Pending confirmations
│   │   │   ├── pool                          — Appointment pool (claim)
│   │   │   └── [id]                          — Appointment detail + actions
│   │   ├── 👥 patients                       — Patient Management
│   │   │   ├── index                         — Patient list + search
│   │   │   ├── [patientId]/                  — Patient detail
│   │   │   │   ├── index                     — Patient overview
│   │   │   │   ├── phr                       — Patient PHR viewer
│   │   │   │   ├── emr                       — EMR history
│   │   │   │   ├── emr/new                   — Create new EMR (SOAP + AI)
│   │   │   │   ├── emr/[emrId]              — View/edit EMR
│   │   │   │   ├── prescriptions             — E-Prescribing
│   │   │   │   ├── lab-orders                — Lab & imaging orders
│   │   │   │   └── living-will               — Patient living will viewer
│   │   ├── 🏥 queue                          — Queue Management
│   │   │   ├── index                         — Today's queue
│   │   │   └── walk-in                       — Walk-in registration
│   │   └── 👤 profile                        — Doctor Profile & Tools
│   │       ├── index                         — Doctor profile
│   │       ├── edit                          — Edit profile
│   │       ├── settings                      — App settings
│   │       ├── notifications                 — Notification settings
│   │       ├── api-connections               — Connected services / API tokens
│   │       └── language                      — Language + theme
│   │
│   ├── meeting/                              — Full screen meeting
│   │   ├── [meetingId]                       — Video meeting (HOST mode)
│   │   │   ├── side-panel: Patient info      — View patient PHR/history
│   │   │   ├── side-panel: AI Copilot        — CDS, diagnosis suggest
│   │   │   ├── side-panel: Transcription     — Live speech-to-text
│   │   │   └── side-panel: EMR Draft         — Quick EMR during meeting
│   │   └── [meetingId]/emr                   — Post-meeting EMR creation
│   │
│   ├── ai/                                   — AI Studio (FAB accessible)
│   │   ├── studio                            — Gemini AI Studio chat
│   │   └── calculators                       — Medical calculators
│   │
│   ├── content/                              — Medical Content Management
│   │   ├── library                           — Clinical resources (view/create)
│   │   ├── medical-content                   — Health education content
│   │   ├── consultants                       — Medical consultants directory
│   │   └── [id]                              — Content detail / edit
│   │
│   ├── admin/                                — Admin-only screens
│   │   ├── stats                             — System statistics
│   │   ├── doctors                           — Doctor management (approve/reject)
│   │   ├── appointments                      — All appointment management
│   │   └── doctors-directory                 — Doctors directory
│   │
│   └── notifications                         — Full notification center
│
└── ======= SHARED ========
    ├── role-select                            — Role selection / switch
    ├── api-connections                        — Multi-service API token management
    └── about                                  — App info, version, licenses
```

---

## 3. Complete Feature Matrix — Web vs Mobile

This table ensures **every single webapp feature** is present in the mobile app. The mobile app is NOT a subset — it is a full mobile replacement.

### 3.1 Patient Features

| # | Feature (Web) | Web Page | Mobile Screen | Status | Notes |
| --- | --------------- | ---------- | --------------- | -------- | ------- |
| 1 | Login | `/login` | `(auth)/login` | ✅ | + Biometric, PIN |
| 2 | Registration | `/register` | `(auth)/register` | ✅ | 2-step wizard |
| 3 | Password Reset | `/reset-password` | `(auth)/forgot-password` | ✅ | Same flow |
| 4 | PDPA Consent (first time) | Inline at register | `(auth)/pdpa-consent` | ✅ | Required before first use |
| 5 | Dashboard | `/` | `(tabs)/index` | ✅ | Quick actions, upcoming appts, health summary |
| 6 | Appointment List | `/appointments` | `(tabs)/appointments/index` | ✅ | Tabs: upcoming/past/cancelled |
| 7 | Book Appointment | `/book-appointment` | `(tabs)/appointments/book` | ✅ | 5-step wizard with AI symptom analysis |
| 8 | Appointment Detail | `/appointments/:id` | `(tabs)/appointments/[id]` | ✅ | Status, doctor info, meeting link, cancel/reschedule |
| 9 | PHR Overview | `/phr` (Overview tab) | `(tabs)/health/index` | ✅ | 5 sections like web |
| 10 | Vital Signs | `/phr` (Vitals tab) | `(tabs)/health/vitals` | ✅ | + Wearable auto-sync |
| 11 | Medications | `/phr` (Meds tab) | `(tabs)/health/medications` | ✅ | + Medication reminders (push) |
| 12 | Allergies | `/phr` (Allergies tab) | `(tabs)/health/allergies` | ✅ | Same CRUD |
| 13 | Treatment Timeline | `/timeline` | `(tabs)/health/timeline` | ✅ | Chronological medical events |
| 14 | Health Logs (EMR/Lab/Rx) | `/phr` (Health Logs) | `(tabs)/health/health-logs` | ✅ | View EMR results from doctors |
| 15 | Living Will | `/living-will` | `(tabs)/health/living-will` | ✅ | 4-step wizard, digital signature |
| 16 | AI Health Assistant | `/ai-doctor` | `(tabs)/ai/index` | ✅ | + Voice input, photo symptom |
| 17 | Symptom Checker | Part of booking | `(tabs)/ai/symptom-checker` | ✅ | Standalone + in booking flow |
| 18 | Health Risk Assessment | Part of AI | `(tabs)/ai/risk-assessment` | ✅ | Based on PHR data |
| 19 | Medical Content Library | `/health-library` | `health-library` | ✅ | Read-only articles, search |
| 20 | Nearby Healthcare Map | `/map` | `map` | ✅ | Native MapView + GPS |
| 21 | PDPA Privacy Management | `/pdpa` | `profile/privacy` | ✅ | 3 tabs: consent, doctor access, audit |
| 22 | Profile | `/profile` | `profile/index + edit` | ✅ | Avatar, contact, emergency |
| 23 | Settings | `/settings` | `profile/settings` | ✅ | Theme, language, notifications |
| 24 | Notification Center | Header bell | `notifications` | ✅ | Full page + push manager |
| 25 | Video Meeting (Join) | Jitsi embed | `meeting/[id]` | ✅ | Jitsi RN SDK, PiP |
| 26 | Post-Meeting Feedback | Part of meeting | `meeting/[id]/feedback` | ✅ | Rating + comments |
| 27 | Guest Meeting Join | Invite link | `meeting/invite/[token]` | ✅ | Deep link / Universal link |
| **28** | **Payment (NEW)** | ❌ Not in web | `profile/payments` | 🆕 | Stripe, PromptPay, Apple/Google Pay |
| **29** | **Document Scanner (NEW)** | ❌ Not in web | `health/scanner` | 🆕 | Camera OCR + AI analysis |
| **30** | **Wearable Devices (NEW)** | ❌ Not in web | `health/devices` | 🆕 | Apple Health / Google Fit |
| **31** | **API Connections (NEW)** | ❌ Not in web | `profile/api-connections` | 🆕 | Multi-service token management |
| **32** | **Biometric Login (NEW)** | ❌ Not in web | Auth flow | 🆕 | Face ID / Fingerprint |
| **33** | **Offline Mode (NEW)** | ❌ Not in web | Throughout app | 🆕 | SQLite cache + sync queue |
| **34** | **Medication Reminders (NEW)** | ❌ Not in web | Push notifications | 🆕 | Scheduled local notifications |
| **35** | **AI History Taking (NEW)** | ❌ Not in web | `(tabs)/ai/history-taking` | 🆕 | Interactive & voice-based, auto-generates OPD Card |
| **36** | **SOS Emergency (NEW)** | ❌ Not in web | `sos/emergency` | 🆕 | One-tap emergency alert with GPS location |
| **37** | **Follow-up Tracking (NEW)** | ❌ Not in web | `health/follow-ups` | 🆕 | View upcoming follow-up reminders & compliance |
| **38** | **Predictive Health (NEW)** | ❌ Not in web | `(tabs)/ai/predictive` | 🆕 | AI risk scores for diabetes, CVD, CKD, etc. |

### 3.2 Doctor Features

| # | Feature (Web) | Web Page | Mobile Screen | Status | Notes |
| --- | --------------- | ---------- | --------------- | -------- | ------- |
| 1 | Login | `/login` | `(auth)/login` | ✅ | + Biometric |
| 2 | 2FA Verification | Part of login | `(auth)/two-factor` | ✅ | SMS/Email OTP |
| 3 | Password Reset | `/reset-password` | `(auth)/forgot-password` | ✅ | Same flow |
| 4 | Dashboard (3-column) | `/dashboard` | `(tabs)/index` | ✅ | Responsive: scroll/tabs on phone, columns on tablet |
| 5 | Schedule (Day/Week/Month) | `/schedule` | `(tabs)/schedule/index` | ✅ | Calendar views with appointment cards |
| 6 | Pending Appointments | Part of schedule | `(tabs)/schedule/pending` | ✅ | Confirm/decline actions |
| 7 | Appointment Pool | `/appointment-pool` | `(tabs)/schedule/pool` | ✅ | Claim appointments matching specialty |
| 8 | Patient Management | `/patients` | `(tabs)/patients/index` | ✅ | Search, filter, PDPA consent |
| 9 | Patient Detail | `/patients/:id` | `patients/[id]/index` | ✅ | Overview with quick actions |
| 10 | Patient PHR Viewer | Modal: PatientRecordViewer | `patients/[id]/phr` | ✅ | PHR/EMR/EHR tabs |
| 11 | EMR History | Part of PatientRecord | `patients/[id]/emr` | ✅ | List of past EMRs |
| 12 | EMR Editor (Create) | Modal: CompleteEMREditor | `patients/[id]/emr/new` | ✅ | SOAP format + AI auto-fill |
| 13 | EMR Editor (View/Edit) | Modal: CompleteEMREditor | `patients/[id]/emr/[emrId]` | ✅ | View or edit existing EMR |
| 14 | E-Prescribing | Modal: CompletePrescribing | `patients/[id]/prescriptions` | ✅ | Drug search, allergy check, interactions |
| 15 | Lab & Imaging Orders | Modal: CompleteLabOrders | `patients/[id]/lab-orders` | ✅ | Order + view results |
| 16 | Patient Living Will | Part of PatientRecord | `patients/[id]/living-will` | ✅ | View patient's living will |
| 17 | Queue Management | `/health-meeting` Queue tab | `(tabs)/queue/index` | ✅ | Call, skip, complete, timer |
| 18 | Walk-in Registration | Part of queue | `(tabs)/queue/walk-in` | ✅ | Quick walk-in patient entry |
| 19 | Health Meeting | `/health-meeting` | via `schedule` + `queue` | ✅ | Split into schedule & queue tabs |
| 20 | Virtual Meeting (HOST) | Modal: VirtualMeeting | `meeting/[id]` | ✅ | Jitsi SDK, side panels, HOST controls |
| 21 | Meeting Transcription | Part of meeting | `meeting/[id]` side panel | ✅ | Native STT (Thai/English) |
| 22 | AI Copilot (during meeting) | Part of meeting | `meeting/[id]` side panel | ✅ | CDS, diagnosis suggestions |
| 23 | Post-Meeting EMR | After meeting | `meeting/[id]/emr` | ✅ | Auto-filled from transcript |
| 24 | Gemini AI Studio | FAB: GeminiAIStudio | `ai/studio` | ✅ | AI chat + accessible from FAB |
| 25 | Medical Calculators | Part of AI Studio | `ai/calculators` | ✅ | BMI, eGFR, CHA₂DS₂-VASc, etc. |
| 26 | Medical Content Management | `/medical-content` | `content/medical-content` | ✅ | Create, edit, submit for approval |
| 27 | Clinical Resources | `/clinical-resources` | `content/library` | ✅ | View, create, approval workflow |
| 28 | Medical Consultants | `/consultants` | `content/consultants` | ✅ | Specialist directory, ratings |
| 29 | Doctor Profile | `/profile` | `profile/index + edit` | ✅ | Avatar, specialty, license |
| 30 | Doctors Directory | `/doctors` | admin/doctors-directory | ✅ | View all doctors, status |
| 31 | Notification Center | Header bell | `notifications` | ✅ | Full page + push manager |
| **Admin-only Features:** | | | | | |
| 32 | Admin Appointment Management | `/admin/appointments` | `admin/appointments` | ✅ | Auto-assign, manual assign |
| 33 | Admin Doctor Management | `/admin/doctors` | `admin/doctors` | ✅ | Approve/reject doctors, roles |
| 34 | System Statistics | Part of dashboard | `admin/stats` | ✅ | Usage analytics, metrics |
| **AI-HIS Features:** | | | | | |
| **35** | **Nursing Dashboard (NEW)** | ❌ Not in web | `(tabs)/nursing` | 🆕 | Care plans, vital alerts, shift handover, resident profiles |
| **36** | **Geriatric Screening (NEW)** | ❌ Not in web | `patients/[id]/geriatric` | 🆕 | ADL/IADL, TUG, Mini-Cog, MNA, GDS-15, SARC-F, Braden |
| **37** | **CTM Dashboard (NEW)** | ❌ Not in web | `(tabs)/ctm` | 🆕 | ธาตุเจ้าเรือน, สมุฏฐาน, herbal prescription |
| **38** | **Investigation Reports (NEW)** | ❌ Not in web | `patients/[id]/investigations` | 🆕 | Lab, Radiology, Pathology reports & orders |
| **39** | **Follow-up Tracking (NEW)** | ❌ Not in web | `patients/[id]/follow-ups` | 🆕 | Automated recall scheduler, compliance dashboard |
| **40** | **Executive Dashboard (NEW)** | ❌ Not in web | `(tabs)/executive` | 🆕 | Patient stats, revenue, AI insights per doctor |
| **41** | **SOS Monitor (NEW)** | ❌ Not in web | `(tabs)/sos-alerts` | 🆕 | Real-time SOS emergency alerts with GPS |
| **42** | **Clinic Network Admin (NEW)** | ❌ Not in web | `admin/network` | 🆕 | Multi-clinic analytics, doctor management |
| **43** | **HIS Integration (NEW)** | ❌ Not in web | `admin/his-exchange` | 🆕 | Data sync with รพ.สต. via HL7 FHIR |
| **44** | **Automated Refer Report (NEW)** | ❌ Not in web | `patients/[id]/refer` | 🆕 | AI auto-generate referral from EMR/AI notes |

---

## 4. Multi-Service API Token Management

### 4.1 Concept Overview

The mobile app supports connecting to **multiple external services** via API tokens. Users can add/remove service connections over time. This allows the app to integrate with third-party health services, medical record systems, and other healthcare providers.

### 4.2 Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                  API CONNECTION MANAGER                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Core Service (Always Connected)                       │  │
│  │  ├── Izara Patient API   → JWT token (auto-managed)    │  │
│  │  ├── Izara Doctor API    → JWT token (auto-managed)    │  │
│  │  └── Izara Meeting API   → JWT token (auto-managed)    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Optional Services (User Adds Later)                   │  │
│  │  ├── 🍎 Apple Health     → HealthKit permission        │  │
│  │  ├── 💪 Google Fit       → OAuth2 token                │  │
│  │  ├── ⌚ Samsung Health   → SDK key                     │  │
│  │  ├── 💳 Stripe           → Customer session token      │  │
│  │  ├── 🏥 Hospital EHR     → API key (user provides)     │  │
│  │  ├── 💊 Pharmacy API     → API key (user provides)     │  │
│  │  ├── 🧪 Lab Service      → API key (user provides)     │  │
│  │  └── 📋 Insurance API    → OAuth2 / API key            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Storage: expo-secure-store (encrypted, per-device)          │
│  Management: Settings > API Connections                      │
│  Tokens: Individually encrypted, rotatable                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Token Types

| Type | Example Services | Auth Method | Storage |
| ------ | ----------------- | ------------- | --------- |
| **JWT (Auto-managed)** | Izara APIs | Login → auto-refresh | SecureStore |
| **OAuth2** | Google Fit, Insurance | OAuth flow → refresh token | SecureStore |
| **API Key** | Hospital EHR, Lab Service | User pastes key in settings | SecureStore (encrypted) |
| **SDK Permission** | Apple HealthKit | System permission dialog | OS-level |
| **Session Token** | Stripe Payments | Backend creates customer | SecureStore |

### 4.4 Token Lifecycle

```text
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
│  Add    │───▶│ Validate │───▶│ Store       │───▶│ Active   │
│ Service │    │ Token    │    │ SecureStore  │    │ (Green)  │
└─────────┘    └──────────┘    └─────────────┘    └────┬─────┘
                    │                                    │
                    │ Invalid                    Token expires
                    ▼                                    │
              ┌──────────┐                         ┌────▼─────┐
              │  Error   │                         │  Refresh │
              │  (Red)   │                         │  Flow    │
              └──────────┘                         └────┬─────┘
                                                        │
                                              Success ──┤── Fail
                                                 │           │
                                                 ▼           ▼
                                           ┌─────────┐ ┌──────────┐
                                           │ Active  │ │ Expired  │
                                           │ (Green) │ │ Re-auth  │
                                           └─────────┘ └──────────┘
```

### 4.5 API Connection Settings Screen

```text
┌─────────────────────────────────────────┐
│  🔗 การเชื่อมต่อบริการ                    │
│     API Connections                      │
│                                          │
│  ── Core Services (เชื่อมต่ออัตโนมัติ) ── │
│                                          │
│  ✅ Izara Patient API      Connected     │
│     Last sync: 2 min ago                 │
│                                          │
│  ✅ Izara Meeting Server   Connected     │
│     Last sync: 5 min ago                 │
│                                          │
│  ── Health & Wearable Connections ────── │
│                                          │
│  ✅ Apple Health           Connected     │
│     Steps, Heart Rate, Sleep   [Manage]  │
│                                          │
│  ⬜ Google Fit             Not Connected │
│     [+ Connect Google Fit]               │
│                                          │
│  ⬜ Samsung Health         Not Connected │
│     [+ Connect Samsung Health]           │
│                                          │
│  ── External Medical Services ────────── │
│                                          │
│  ✅ Bangkok Hospital EHR   Connected     │
│     API Key: ****-****-1234   [Remove]   │
│                                          │
│  ⬜ Lab Service            Not Connected │
│     [+ Add API Key]                      │
│                                          │
│  ⬜ Insurance Provider     Not Connected │
│     [+ Connect Insurance]                │
│                                          │
│  ── Payment Services ──────────────────  │
│                                          │
│  ✅ Stripe                 Connected     │
│     Visa •••• 4242          [Manage]     │
│                                          │
│  ⬜ PromptPay              Not Connected │
│     [+ Add PromptPay]                    │
│                                          │
│  ─────────────────────────────────────── │
│  🔒 Tokens stored with AES-256 encryption│
│  📋 PDPA: Data sharing controlled by you │
└─────────────────────────────────────────┘
```

---

## 5. What the App Does — Feature Descriptions

### 5.1 Patient Mode Features

#### 5.1.1 🏠 Dashboard

The patient dashboard is the central hub showing a personalized greeting, upcoming appointment cards with "Join Video" buttons, quick action shortcuts (Book Appointment, AI Chat, My Medications, Nearby Map), health summary (latest vitals), unread notification count, and medication reminders. Pull-to-refresh updates all data. Matches the webapp dashboard but optimized for mobile with card-based layout.

#### 5.1.2 📅 Appointment Booking

Full appointment workflow matching the webapp:

1. **Symptom Input** — Text description + AI symptom analysis (Gemini). Voice input option (speech-to-text). Photo upload for visual symptoms.
2. **Doctor Selection** — Browse by specialty with AI recommendation based on symptoms. View doctor profiles, ratings, availability.
3. **Date & Time** — Calendar picker showing available slots per doctor. Time zone aware.
4. **Confirmation & Payment** — Review booking summary. Pay consultation fee (Stripe/PromptPay/Apple Pay/Google Pay). Free option for covered patients.
5. **Success** — Booking confirmed with calendar integration (add to device calendar). Push notification scheduled for reminders (24h, 1h, 15min before).

Patients can view all appointments (upcoming/past/cancelled), see appointment details, cancel (with refund policy), and reschedule within allowed timeframes. Video appointments show a "Join Meeting" button that opens the Jitsi video consultation.

#### 5.1.3 💊 Health Records (PHR)

Complete Personal Health Record management identical to web PHR page:

- **Overview** — Health profile with conditions, lifestyle, BMI visualization
- **Vital Signs** — Record blood pressure, heart rate, temperature, weight, blood glucose, SpO₂. Charts with trend lines (Victory Native). Auto-sync from connected wearables (Apple Health/Google Fit).
- **Medications** — Active/inactive medication list with dosage, frequency, prescriber. Set medication reminders (local push notifications). Scan medication label with camera.
- **Allergies** — Allergy list with severity, reactions, reporter. Cross-referenced during appointments.
- **Health Timeline** — Chronological view of all medical events: appointments, prescriptions, lab results, EMR summaries. Filterable by category. Matches the webapp Timeline page.
- **Health Logs** — EMR results shared by doctors, lab results, prescription history. Read-only patient view of medical records.
- **Living Will** — Create, edit, and manage living will with 4-step wizard matching the webapp. Digital signature, healthcare proxy designation, PDPA sharing controls. Viewable by authorized doctors.
- **Connected Devices** — Manage wearable connections (Apple Health, Google Fit, Samsung Health). View sync status, data categories, last sync time.
- **Document Scanner** — Use camera to scan medical documents (prescriptions, lab results, referrals). AI-powered OCR extracts text. Documents attached to health record.

#### 5.1.4 🤖 AI Health Assistant

Gemini-powered health chat matching the webapp AI Doctor page:

- **Chat Interface** — Natural language conversation about health questions (Thai primary, English supported). Message history preserved.
- **Voice Input** — Tap microphone button, speak symptoms in Thai/English. Speech-to-text converts to chat message.
- **Photo Symptoms** — Take photo of skin condition, rash, wound. AI analyzes image and provides preliminary guidance.
- **Symptom Checker** — Structured symptom questionnaire with body diagram. AI generates preliminary assessment with urgency level.
- **Health Risk Assessment** — Based on PHR data (vitals, conditions, lifestyle), AI provides personalized risk assessment for common conditions.
- **Safety Disclaimer** — Every AI response includes: "AI provides preliminary advice only. Always consult a healthcare professional."

#### 5.1.5 📹 Video Meeting

Patient joins video consultation:

- Pre-join screen showing doctor info, appointment details, camera/mic test
- Recording consent (Thai legal requirement)
- Jitsi React Native SDK for HD video
- Picture-in-Picture (PiP) mode when app is backgrounded
- Meeting controls: mute, camera toggle, chat, screen share
- Post-meeting feedback form (rating + comments)
- Connection quality indicator with auto-reconnect
- Deep link support for guest invites

#### 5.1.6 🗺️ Nearby Healthcare

Google Maps integration matching the webapp Map page:

- Interactive map using react-native-maps (native MapView)
- GPS location detection (expo-location)
- Filter by facility type: hospitals, clinics, pharmacies, health centers
- Facility cards with name, distance, rating, phone, directions
- "Navigate to" opens native maps app (Apple Maps / Google Maps)
- Search by name or address

#### 5.1.7 📚 Medical Content Library

Read-only access to health education content matching the webapp Health Library:

- Browse articles by category (Thai health topics)
- Search articles by keyword
- Article detail view with rich text, images
- Bookmark articles for offline reading
- Share articles via iOS/Android share sheet

#### 5.1.8 🔒 PDPA Privacy Management

Full privacy controls matching the webapp PDPA page:

- **Consent Management** — View and modify data sharing consents
- **Doctor Access** — Control which doctors can view health records. Grant/revoke individual doctor access.
- **Audit Log** — View who accessed your health data and when
- Data export request, data deletion request

#### 5.1.9 👤 Profile & Settings

Complete profile management matching webapp Profile + Settings pages:

- **Profile** — View/edit name, phone, email, avatar (camera or gallery), emergency contact, date of birth, gender, blood type, national ID
- **Settings** — Theme (light/dark/auto), language (Thai/English), notification preferences, font size, biometric login toggle
- **Notification Settings** — Toggle push notifications by category (appointments, medications, lab results, AI, system)
- **Payment Methods** — Saved cards, PromptPay, Apple Pay/Google Pay setup. Payment history with receipts.
- **API Connections** — Multi-service token management (see Section 4)
- **Account Security** — Change password, biometric enrollment, session management, deauthorize devices

### 5.2 Doctor Mode Features

#### 5.2.1 📊 Doctor Dashboard

Clinical hub matching the webapp Doctor Dashboard:

- **Statistics** — Today's appointments (total, completed, pending), waiting patients, average wait time
- **Today's Queue** — Quick view of current patient queue with call button
- **Upcoming Appointments** — Next 5 appointments with patient name, symptoms, time
- **Quick Actions** — Start meeting, create EMR, view queue, search patient
- **AI Pre-consultation Summary** — For the next patient: PHR summary, risk flags, previous visits
- **Notification Alerts** — New appointment requests, lab results ready, system notices
- On tablet: 3-column layout matching web. On phone: scrollable cards.

#### 5.2.2 📅 Schedule & Appointments

Complete schedule management matching webapp Schedule + Health Meeting pages:

- **Calendar Views** — Day/Week/Month with appointment blocks. Color-coded by status.
- **Pending Confirmations** — Review and confirm/decline appointment requests with reason
- **Appointment Pool** — View unassigned appointments matching doctor's specialty. Claim from pool.
- **Appointment Detail** — Patient info, symptoms, AI summary, actions (confirm, decline, reschedule, start meeting)

#### 5.2.3 👥 Patient Management

Full patient management matching webapp Patient Management page:

- **Patient List** — Search by name, ID, email, phone. Filter by status, PDPA consent.
- **Patient Detail** — Demographics, contact, appointment history, quick actions
- **Patient PHR Viewer** — View patient's health record (with PDPA consent). 3 tabs: PHR, EMR, EHR matching the webapp PatientRecordViewer modal.
- **EMR History** — List of all EMRs for this patient. Tap to view SOAP details.
- **Create EMR** — Full SOAP-format EMR editor with:
  - AI auto-fill from meeting transcript (if available)
  - Voice dictation for Thai text input
  - ICD-10 diagnosis code search
  - Digital signature
  - Template selection
- **E-Prescribing** — Drug search, dosage, frequency, route. Allergy cross-check with auto-warnings. Drug interaction alerts.
- **Lab & Imaging Orders** — Order laboratory tests with test catalog. View results with normal range indicators (high/low/critical flags).
- **Patient Living Will** — View living will if patient has shared (PDPA consent)

#### 5.2.4 🏥 Queue Management

Real-time queue matching webapp Queue Management:

- Today's confirmed appointments as queue items
- **Call** — Call next patient (sends push notification to patient)
- **Skip** — Skip patient (mark as no-show after timeout)
- **Complete** — Mark as examined, proceed to EMR
- Average wait time display
- Walk-in patient registration with quick form

#### 5.2.5 📹 Video Meeting (HOST)

Doctor as meeting HOST with full clinical tools:

- All patient meeting features PLUS:
- **HOST Controls** — Lobby management, admit/deny participants, mute all, remove participant
- **Side Panel: Patient Info** — Quick PHR view, allergies, medications, risk flags
- **Side Panel: AI Copilot** — CDS (Clinical Decision Support), diagnosis suggestions based on symptoms + transcript
- **Side Panel: Transcription** — Live speech-to-text in Thai/English. Editable transcript.
- **Side Panel: EMR Draft** — Quick SOAP entry during meeting
- **Recording Consent** — Legal compliance with consent popup
- **Post-Meeting** — Auto-generates EMR draft from AI summary of transcript + patient data
- Multi-party support (guest invites)
- CallKit integration (iOS) / ConnectionService (Android)

#### 5.2.6 🤖 AI Studio

Gemini AI assistant matching webapp Gemini AI Studio:

- **AI Chat** — Medical question/answer with Thai medical terminology
- **Medical Calculators** — BMI, eGFR, CHA₂DS₂-VASc, CURB-65, Wells Score, HEART Score, etc.
- Accessible via floating action button (FAB) from any screen
- Context-aware: if viewing a patient, chat pre-loaded with patient context

#### 5.2.7 📚 Medical Content & Resources

Content management matching webapp Medical Content + Clinical Resources + Medical Consultants:

- **Clinical Resources** — View/create guidelines, protocols, research papers. Approval workflow (doctor creates → admin approves).
- **Medical Content** — Create health education articles for patients. Same approval workflow.
- **Medical Consultants** — Specialist directory for referrals. View profiles, ratings, contact info. Admin can add/edit/remove.

#### 5.2.8 🔧 Admin Features (Admin role only)

- **Appointment Management** — View all appointments. AI auto-assign to doctors by specialty. Manual assign/reject.
- **Doctor Management** — Approve/reject new doctor registrations. Change roles (doctor ↔ admin). Toggle active/inactive.
- **System Statistics** — Usage metrics, appointment counts, response times
- **Doctors Directory** — View all doctors with verification status, availability

---

## 6. Technical Requirements

### 6.1 Performance Budgets

| Metric | Target |
| -------- | -------- |
| Cold Start | < 2 seconds |
| Screen Transition | < 300ms |
| API Response (cached) | < 100ms |
| API Response (network) | < 2 seconds |
| Video Join Time | < 5 seconds |
| Push Delivery | < 3 seconds |
| Biometric Auth | < 1 second |
| App Size (iOS) | < 80 MB |
| App Size (Android) | < 65 MB |
| Memory Usage | < 300 MB |
| Battery Drain (idle) | < 5%/hour |
| Battery Drain (video) | < 15%/hour |
| Crash Rate | < 0.1% |
| ANR Rate (Android) | < 0.2% |

### 6.2 Offline Support

| Feature | Offline Behavior |
| --------- | ----------------- |
| Dashboard | Show cached data with "Last updated" timestamp |
| Appointments | View cached appointments. New bookings queued for sync. |
| Vitals | Record vitals locally (SQLite). Auto-sync when online. |
| Medications | View cached list. Reminders work offline. |
| AI Chat | Show cached FAQ responses. Full AI requires network. |
| EMR | Doctor can draft EMR offline. Saved to sync queue. |
| Notifications | View cached. New notifications arrive when online. |
| Profile | View cached. Edits queued for sync. |

### 6.3 Device Support Matrix

| Platform | Minimum | Recommended |
| ---------- | --------- | ------------- |
| iOS | iPhone SE (2nd gen), iOS 15.0 | iPhone 12+, iOS 17+ |
| Android | Android 10 (API 29), 3GB RAM | Android 13+, 4GB+ RAM |
| Tablet | iPad (9th gen), Android 10" | iPad Air/Pro, Galaxy Tab S |

### 6.4 Accessibility

| Feature | Implementation |
| --------- | ---------------- |
| VoiceOver (iOS) | All UI elements labeled in Thai + English |
| TalkBack (Android) | Same accessibility labels |
| Dynamic Type | Text scales with system font size (1x to 2x) |
| Color Contrast | WCAG 2.1 AA minimum (4.5:1 ratio) |
| Reduced Motion | Respect system `prefers-reduced-motion` |
| Touch Targets | Minimum 44x44pt (iOS) / 48x48dp (Android) |

---

## 7. Security & Compliance

### 7.1 Data Protection

| Requirement | Implementation |
| ------------- | ---------------- |
| Encryption at Rest | AES-256 via SecureStore (Keychain/Keystore) |
| Encryption in Transit | TLS 1.3, certificate pinning |
| Token Storage | expo-secure-store with hardware-backed keys |
| Biometric Data | Never leaves device. Only auth result sent to server. |
| PHI (Protected Health Info) | Encrypted in transit + at rest. PDPA compliant. |
| Session Timeout | 15min access token, configurable app lock |
| Remote Wipe | Server can invalidate all tokens for a user/device |

### 7.2 PDPA Compliance (Thailand)

| Requirement | Mobile Implementation |
| ------------- | ---------------------- |
| Consent Collection | First-launch PDPA consent screen. Granular toggles. |
| Data Access Control | Patient controls doctor access via PDPA settings |
| Audit Trail | All data access logged with timestamp + accessor |
| Data Portability | Export health data as PDF/JSON from settings |
| Right to Erasure | Delete account + all data from settings |
| Data Minimization | Only collect necessary data per feature |

### 7.3 OWASP Mobile Top 10

| Risk | Mitigation |
| ------ | ------------ |
| M1: Improper Credential Usage | SecureStore, no plaintext tokens |
| M2: Inadequate Supply Chain Security | Dependency auditing, SRI |
| M3: Insecure Authentication/Authorization | JWT, biometric, MFA for doctors |
| M4: Insufficient Input/Output Validation | Zod schemas, sanitization |
| M5: Insecure Communication | TLS 1.3, cert pinning, HSTS |
| M6: Inadequate Privacy Controls | PDPA consent, audit logs |
| M7: Insufficient Binary Protections | ProGuard, code obfuscation |
| M8: Security Misconfiguration | Env-based config, no secrets in code |
| M9: Insecure Data Storage | SecureStore only, no AsyncStorage for sensitive |
| M10: Insufficient Cryptography | AES-256, SHA-256, industry standards |

---

## 8. Integration with Phase 1 Web Platform

### 8.1 Shared Backend

The mobile app connects to the **exact same backend servers** as the web platform. No backend duplication.

```text
┌──────────────────────┐     ┌──────────────────────┐
│    Web (Phase 1)     │     │  Mobile (Phase 2)    │
│  Patient Portal      │     │  Izara Dr. Anywhere  │
│  Doctor Portal       │     │  (Single App)        │
└─────────┬────────────┘     └─────────┬────────────┘
          │                            │
          │      Same REST APIs        │
          │      Same WebSocket        │
          └──────────┬─────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Backend Servers    │
          │  ┌───────────────┐  │
          │  │ Patient API   │  │  Port 3005
          │  │ Doctor Auth   │  │  Port 3011
          │  │ Doctor API    │  │  Port 3009
          │  │ Doctor GCS    │  │  Port 3012
          │  │ Meeting Server│  │  Port 3020
          │  └───────────────┘  │
          │                     │
          │  ┌───────────────┐  │
          │  │  PostgreSQL   │  │
          │  │  + pgvector   │  │
          │  └───────────────┘  │
          └─────────────────────┘
```

### 8.2 New Backend Endpoints for Mobile

| Category | Endpoints | Purpose |
| ---------- | ----------- | --------- |
| Device Registration | `POST /api/devices/register`, `DELETE /api/devices/:id` | Push notification tokens |
| Biometric Auth | `POST /api/auth/biometric-enroll`, `POST /api/auth/biometric-login` | Biometric binding |
| Push Delivery | `POST /api/notifications/push/send` | Send push via FCM/APNS |
| Payment | `POST /api/payments/create-intent`, `POST /api/payments/confirm` | Stripe integration |
| Wearable Sync | `POST /api/phr/vitals/batch`, `POST /api/phr/wearable-sync` | Bulk vital upload |
| Offline Sync | `POST /api/sync/pull`, `POST /api/sync/push`, `POST /api/sync/resolve` | Sync queue management |
| OCR Scanner | `POST /api/documents/scan`, `POST /api/documents/analyze` | Document OCR pipeline |
| API Tokens | `GET /api/connections`, `POST /api/connections`, `DELETE /api/connections/:id` | External service management |
| **AI History Taking** | `POST /api/ai/history-taking/start`, `POST /api/ai/history-taking/respond` | **AI-driven intake interview** |
| **CTM Assessment** | `POST /api/ctm/assessment`, `GET /api/ctm/herbs` | **Thai Traditional Medicine** |
| **Geriatric Screening** | `POST /api/geriatric/screening`, `GET /api/geriatric/tools` | **8-tool geriatric battery** |
| **Follow-up Tracking** | `GET /api/follow-ups`, `POST /api/follow-ups/schedule` | **Automated recall system** |
| **SOS Emergency** | `POST /api/sos/alert`, `GET /api/sos/active` | **Emergency alert with GPS** |
| **Predictive Analytics** | `GET /api/analytics/risk-scores`, `POST /api/analytics/predict` | **AI health risk prediction** |
| **HIS Integration** | `POST /api/his/sync`, `GET /api/his/exchange-log` | **รพ.สต. data exchange** |
| **Nursing Dashboard** | `GET /api/nursing/residents`, `POST /api/nursing/care-plans` | **Care plan management** |
| **Investigations** | `POST /api/investigations/order`, `GET /api/investigations/results` | **Lab/Rad/Pathology reports** |

### 8.3 Data Consistency

Both web and mobile apps read/write to the same database. Changes made on web are immediately visible on mobile and vice versa. Real-time features (notifications, queue updates) use the same WebSocket/Socket.IO channels.

---

## 9. App Release Strategy

### 9.1 Build & Distribution

| Stage | Platform | Method |
| ------- | ---------- | -------- |
| Development | iOS Simulator + Android Emulator | `expo start` |
| Internal Testing | Physical devices | EAS Build → Internal distribution |
| Beta Testing | Testers | TestFlight (iOS) + Internal Testing (Android) |
| Production | Public | App Store + Google Play Store |
| OTA Updates | Hotfixes | EAS Update (instant, no store review) |

### 9.2 App Store Requirements

| Requirement | iOS (App Store) | Android (Google Play) |
| ------------- | ----------------- | ---------------------- |
| Developer Account | Apple Developer Program ($99/year) | Google Play Console ($25 one-time) |
| Review Time | 1-3 business days | 1-7 business days |
| Health Disclaimer | Required (medical app) | Required |
| Privacy Policy | Required (PDPA link) | Required |
| Age Rating | 12+ (Medical Info) | Everyone / Teen |
| Screenshots | 6.5" + 5.5" + iPad | Phone + 7" + 10" tablet |

---

## 10. Document Index (Complete)

| # | Document | Description |
| --- | ---------- | ------------- |
| — | **[README.md](README.md)** | Phase 2 overview (this file needs update) |
| 0 | **[00_Phase2_Implementation_Plan.md](00_Phase2_Implementation_Plan.md)** | Master timeline & resources |
| 1 | **[01_Mobile_App_Architecture.md](01_Mobile_App_Architecture.md)** | Technical architecture |
| 2 | **[02_Mobile_API_Specifications.md](02_Mobile_API_Specifications.md)** | API endpoints |
| 3 | **[03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md)** | Auth & security |
| 4 | **[04_Mobile_Notification_Workflows.md](04_Mobile_Notification_Workflows.md)** | Push notifications |
| 5 | **[05_Mobile_Video_Meeting.md](05_Mobile_Video_Meeting.md)** | Video consultations |
| 6 | **[06_Mobile_Appointment_Workflows.md](06_Mobile_Appointment_Workflows.md)** | Appointment workflows |
| 7 | **[07_Mobile_Health_Records.md](07_Mobile_Health_Records.md)** | PHR/EMR/wearables |
| 8 | **[08_Mobile_AI_Features.md](08_Mobile_AI_Features.md)** | AI assistant |
| 9 | **[09_Mobile_Payment_Integration.md](09_Mobile_Payment_Integration.md)** | Payments |
| 10 | **[10_Gemini_Fine_Tuning.md](10_Gemini_Fine_Tuning.md)** | AI fine-tuning |
| 11 | **[11_Mobile_App_Description.md](11_Mobile_App_Description.md)** | App description (THIS document) |
| 12 | **[12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md)** | Multi-service tokens |
| 13 | **[13_Mobile_Content_Library_Workflows.md](13_Mobile_Content_Library_Workflows.md)** | Content management |
| 14 | **[14_Mobile_PDPA_Privacy.md](14_Mobile_PDPA_Privacy.md)** | PDPA compliance mobile |
| 15 | **[15_Mobile_Offline_Sync.md](15_Mobile_Offline_Sync.md)** | Offline mode & sync |
| 16 | **[16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md)** | Role selection system |
| — | **[PHASE2_MVP_COMPREHENSIVE.md](../../Phase2/PHASE2_MVP_COMPREHENSIVE.md)** | 🏗️ Master comprehensive plan (AI-Based HIS) |
| — | **[Pages/Unified-App/](Pages/Unified-App/)** | All screen specifications (unified) |

---

### End of AI-Based HIS & Mobile Application Product Description v2.2.0 — February 2026
