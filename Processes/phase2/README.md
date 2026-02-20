# 📱 Izara Telemedicine — Phase 2: AI-Based HIS & Mobile Application

**Version:** 2.2.0  
**Date:** February 2026  
**Status:** 📋 Planning & Architecture  
**Platform:** React Native (Expo) — iOS & Android + Web Portal Enhancements  
**Codename:** "Dr. Anywhere" (หมอทุกที่)  
**Architecture:** AI-Based HIS + Single Unified Mobile App with Patient / Doctor Role Selection

---

## 📖 Overview

Phase 2 transforms Izara from a telemedicine platform into a **complete AI-Based HIS (Health Information System)** that goes beyond traditional HIS. It combines a **unified mobile application** ("Izara Dr. Anywhere") with a comprehensive backend expansion covering AI-powered clinical workflows, FHIR-compliant data architecture, Thai Traditional Medicine (CTM) support, clinic network management, and interoperability with government health systems (รพ.สต.).

The platform serves **5 target user groups:** General Clinics (franchise network), CTM Clinics (แพทย์แผนไทย), Elderly Care (Home Care / Retirement Homes), Health Centers (รพ.สต.), and Hospital OPDs — all from a single unified system.

> **Key Decision:** ONE app for both roles (Patient & Doctor), not two separate apps.  
> Rationale: Lower maintenance, single download, shared codebase, easier distribution.

### Phase 2 Vision

> **"หมอทุกที่ — ดูแลสุขภาพได้ทุกที่ทุกเวลา"**  
> (Doctor Anywhere — Healthcare accessible anytime, anywhere)

### The 4 Pillars

| # | Pillar | Description |
| --- | -------- | ------------- |
| 1 | **Smart Data Architecture** | FHIR-compliant data, Vector DB (pgvector) for RAG, Machine-Readable records |
| 2 | **AI Integration Layers** | Medical Scribe, Predictive Analytics, CDS, AI History Taking |
| 3 | **Modern Healthcare UI/UX** | Role-Based Dashboards, Wearable IoT, CTM interfaces |
| 4 | **Security & Compliance** | PDPA/HIPAA, Immutable Audit Logs, RBAC, e-Consent |

### Clinical Task Workflow (Task 1–5)

| Task | Name | Key Features |
| ------ | ------ | ------------- |
| **Task 1** | Patient & Family | AI History Taking, Self-entered Data, Wearable Sync, e-Living Will, PDPA |
| **Task 2** | Healthcare Team | Executive Dashboard, Nursing Dashboard, CTM Dashboard, Geriatric Screening, Predictive Analytics |
| **Task 3** | Investigation | Lab Reports, Radiology Reports, Pathology Reports, Critical Value Alerts |
| **Task 4** | Treatment | Modern Rx, Herbal Rx (CTM), Medical Procedures, Follow-up Tracking |
| **Task 5** | Refer & Data Exchange | Automated Referral PDF, FHIR HIE, รพ.สต. API, SOS Emergency |

---

## 🎯 Phase 2 Goals

| # | Goal | Description |
| --- | ------ | ------------- |
| 1 | **AI-Based HIS** | Transform from telemedicine into a full AI-Based Health Information System |
| 2 | **Unified Mobile App** | Single app with Patient/Doctor role selection for iOS & Android |
| 3 | **FHIR Compliance** | HL7 FHIR data standard for interoperability and HIS connectivity |
| 4 | **AI Clinical Workflows** | AI History Taking, Medical Scribe, CDS, Predictive Analytics |
| 5 | **Thai Traditional Medicine** | CTM recording, ธาตุเจ้าเรือน calculator, herbal prescriptions |
| 6 | **Clinic Network Management** | Multi-facility admin dashboard for franchise networks |
| 7 | **Elderly Care** | Geriatric Screening, Nursing Dashboard, SOS Emergency, Follow-up Tracking |
| 8 | **HIS Integration** | API protocol for data exchange with รพ.สต. and hospital HIS |
| 9 | **Native Capabilities** | Biometrics, push notifications, camera, GPS, offline |
| 10 | **Wearable Sync** | Apple Health / Google Fit vital signs sync |
| 11 | **Payment Integration** | Consultation fee payment via Stripe/PromptPay |
| 12 | **API Compatibility** | Reuse 100% of existing Phase 1 backend APIs |
| 13 | **Gemini Fine-Tuning** | Medical Thai language model optimization |
| 14 | **PDPA Compliance** | Full privacy management, consent, data export, audit logs |

---

## 📁 Documentation Index

### Master Reference

| Document | Description |
| ---------- | ------------- |
| [../../Phase2/PHASE2_MVP_COMPREHENSIVE.md](../../Phase2/PHASE2_MVP_COMPREHENSIVE.md) | **Comprehensive MVP Plan** — 4 Pillars, Task 1-5, DB Schema, API Endpoints, AI Prompts, Mock Data |

### Core Documents

| # | Document | Description |
| --- | ---------- | ------------- |
| 0 | [00_Phase2_Implementation_Plan.md](00_Phase2_Implementation_Plan.md) | Master implementation plan, timeline, resources |
| 1 | [01_Mobile_App_Architecture.md](01_Mobile_App_Architecture.md) | Technical architecture, tech stack, patterns |
| 2 | [02_Mobile_API_Specifications.md](02_Mobile_API_Specifications.md) | API endpoints, mobile-specific additions |
| 3 | [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md) | Auth flows, biometrics, token management |
| 4 | [04_Mobile_Notification_Workflows.md](04_Mobile_Notification_Workflows.md) | Push notifications, FCM/APNS, in-app alerts |
| 5 | [05_Mobile_Video_Meeting.md](05_Mobile_Video_Meeting.md) | Mobile video consultations, Jitsi SDK |
| 6 | [06_Mobile_Appointment_Workflows.md](06_Mobile_Appointment_Workflows.md) | Booking, management, reminders on mobile |
| 7 | [07_Mobile_Health_Records.md](07_Mobile_Health_Records.md) | PHR/EMR on mobile, offline sync, wearables |
| 8 | [08_Mobile_AI_Features.md](08_Mobile_AI_Features.md) | AI assistant, voice input, CDS on mobile |
| 9 | [09_Mobile_Payment_Integration.md](09_Mobile_Payment_Integration.md) | Payment gateway, consultation fees |
| 10 | [10_Gemini_Fine_Tuning.md](10_Gemini_Fine_Tuning.md) | LLM fine-tuning for medical Thai |

### New Documents (Unified App Architecture)

| # | Document | Description |
| --- | ---------- | ------------- |
| 11 | [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Complete product description & feature matrix |
| 12 | [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | Multi-service API token architecture |
| 13 | [13_Mobile_Content_Library_Workflows.md](13_Mobile_Content_Library_Workflows.md) | Medical content, clinical resources, consultants |
| 14 | [14_Mobile_PDPA_Privacy.md](14_Mobile_PDPA_Privacy.md) | Thailand PDPA compliance for mobile |
| 15 | [15_Mobile_Offline_Sync.md](15_Mobile_Offline_Sync.md) | Offline mode & data sync architecture |
| 16 | [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md) | Role selection system design |

### Page Specifications

| Portal | Document | Description |
| -------- | ---------- | ------------- |
| **Unified App** | [Pages/Unified-App/Unified_App_Pages.md](Pages/Unified-App/Unified_App_Pages.md) | **All 77 screen specifications** (Patient + Doctor + Shared) |
| ~~Patient~~ | ~~Pages/Patient-Mobile/~~ | _Deprecated — superseded by Unified App spec_ |
| ~~Doctor~~ | ~~Pages/Doctor-Mobile/~~ | _Deprecated — superseded by Unified App spec_ |

---

## 🔗 Phase 1 → Phase 2 Compatibility Matrix

### Backend Reuse (100% API Compatible)

| Component | Phase 1 | Phase 2 | Change |
| ----------- | --------- | --------- | -------- |
| Patient Portal API | Express.js (port 3005) | Same — mobile calls same APIs | None |
| Doctor Portal API | Express.js (port 3010) | Same — mobile calls same APIs | None |
| Meeting Server | Express.js (port 3020) | Same — mobile uses Socket.IO | None |
| Database | PostgreSQL 18 + pgvector | Same database | Add mobile tables |
| Auth | bcrypt + JWT | Same + biometric layer | Add device tokens |
| AI | Gemini 2.5 Flash | Same + fine-tuned model | Add fine-tuning |

### New Backend Additions for Phase 2

| Component | Purpose | Priority |
| ----------- | --------- | ---------- |
| Push Notification Service | FCM + APNS delivery | P0 |
| Device Registration API | Store device tokens | P0 |
| Biometric Auth Endpoints | Fingerprint/FaceID binding | P0 |
| Multi-API Connection API | User service connection management | P0 |
| PDPA Consent API | Mobile consent collection + management | P0 |
| Payment Gateway API | Stripe/Omise/PromptPay integration | P1 |
| Wearable Sync API | Apple Health/Google Fit data | P1 |
| Offline Sync API | Conflict resolution endpoints | P1 |
| Document Scanner API | OCR + AI analysis pipeline | P2 |

---

## 📊 Feature Comparison: Phase 1 vs Phase 2

| Feature | Phase 1 (Web) ✅ | Phase 2 (AI-HIS + Mobile) 📱 |
| --------- | ----------------- | --------------------- |
| Login | Email/Password | Email/Password + Biometric |
| Role Selection | Separate portals | Single app with role picker |
| Data Standard | PostgreSQL (custom) | FHIR-compliant + pgvector (RAG) |
| AI History Taking | ❌ None | ✅ Automated CC/PI (chat + voice, OPQRST) |
| CTM (Thai Medicine) | ❌ None | ✅ ธาตุเจ้าเรือน, สมุฏฐาน, herbal Rx |
| Geriatric Screening | ❌ None | ✅ ADL, fall risk, cognitive, nutrition |
| Nursing Dashboard | ❌ None | ✅ Vital grid, MAR, alerts, SOS receiver |
| Predictive Analytics | ❌ None | ✅ Readmission, Sarcopenia, EWS |
| Investigation Reports | Basic Lab | ✅ Lab + Radiology + Pathology (structured) |
| Herbal Prescriptions | ❌ None | ✅ CTM herbal Rx with preparation instructions |
| Follow-up Tracking | ❌ None | ✅ Recovery scoring, care team alerts |
| Clinic Network Mgmt | ❌ None | ✅ Multi-facility admin dashboard |
| HIS Integration | ❌ None | ✅ API protocol for รพ.สต. and hospital HIS |
| SOS Emergency | ❌ None | ✅ Real-time alert to Nursing Dashboard |
| Notifications | In-app + Email | Push + In-app + Email |
| Video Meeting | Jitsi Web embed | Jitsi Mobile SDK (PiP) |
| Speech-to-Text | Web Speech API | Native iOS/Android STT |
| Document Upload | File picker | Camera scanner + File picker |
| Maps | Google Maps embed | Native Maps (MapView) |
| Health Data | Manual entry | Manual + Wearable auto-sync |
| Offline | ❌ None | ✅ SQLite local cache |
| Payment | ❌ None | ✅ Stripe/PromptPay |
| Referral Reports | ❌ None | ✅ Auto-generated PDF with FHIR Bundle |
| PDPA Management | Basic consent | Full privacy management + data export |
| Living Will | ✅ Web form | ✅ 4-step wizard + digital signature |

---

## 🏗️ Project Structure

```text
Isara-Anywhere/
├── Isara-patient-portal/          # Phase 1 Web (unchanged)
├── Isara-doctor-portal/           # Phase 1 Web (unchanged)
├── Izara-jitsi-server/            # Phase 1 Meeting (unchanged)
├── Isara-mobile/                  # 📱 NEW — Phase 2 Mobile
│   ├── app/                        # Single unified app (Expo Router)
│   │   ├── (patient)/              # Patient route group
│   │   └── (doctor)/               # Doctor route group
│   ├── packages/
│   │   ├── shared/                # Shared components & utils
│   │   ├── api-client/            # API client library
│   │   └── ui/                    # Shared UI components
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
└── Processes/phase2/              # 📄 Phase 2 Documentation (16 docs)
```

---

## 🗓️ Timeline

| Phase | Duration | Deliverable |
| ------- | ---------- | ------------- |
| **Sprint 1** | Weeks 1-4 | Unified app setup, role selection, auth, push notifications |
| **Sprint 2** | Weeks 5-8 | Patient mode MVP (appointments, PHR, AI, PDPA, API connections) |
| **Sprint 3** | Weeks 9-12 | Doctor mode MVP (schedule, EMR, patients, content management) |
| **Sprint 4** | Weeks 13-16 | Video meeting mobile SDK, transcription, post-meeting AI |
| **Sprint 5** | Weeks 17-20 | Wearables, payment, document scanner, offline, living will |
| **Sprint 6** | Weeks 21-24 | AI-HIS Backend: FHIR schema, AI History Taking, CTM module |
| **Sprint 7** | Weeks 25-28 | Investigation reports (Lab/Radiology/Pathology), Herbal Rx, Follow-up |
| **Sprint 8** | Weeks 29-32 | Nursing Dashboard, Geriatric Screening, SOS Emergency, Predictive Analytics |
| **Sprint 9** | Weeks 33-36 | Clinic Network Admin, HIS integration (รพ.สต.), Referral system |
| **Sprint 10** | Weeks 37-40 | Testing, Gemini fine-tuning, App Store submission, production launch |

---

## 📚 Related Phase 1 Documents

| Document | Description |
| ---------- | ------------- |
| [../PHASE1_REQUIREMENTS.md](../PHASE1_REQUIREMENTS.md) | Phase 1 requirements (completed) |
| [../Appointment_Workflows.md](../Appointment_Workflows.md) | Appointment workflows |
| [../Health_Records_Processes.md](../Health_Records_Processes.md) | PHR/EMR processes |
| [../VIDEO_MEETING_JITSI_GEMINI.md](../VIDEO_MEETING_JITSI_GEMINI.md) | Video meeting system |
| [../Notification_Workflows.md](../Notification_Workflows.md) | Notification system |
| [../User_management_Workflows.md](../User_management_Workflows.md) | User management |
| [../../API_ENDPOINTS_COMPLETE.md](../../API_ENDPOINTS_COMPLETE.md) | Complete API reference |

---

### End of Phase 2 README — v2.2.0 — February 2026
