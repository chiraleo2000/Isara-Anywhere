# 📱 Izara Telemedicine — Phase 2: Mobile Application

**Version:** 2.1.0  
**Date:** February 2026  
**Status:** 📋 Planning & Architecture  
**Platform:** React Native (Expo) — iOS & Android  
**Codename:** "Dr. Anywhere" (หมอทุกที่)  
**Architecture:** Single Unified App with Patient / Doctor Role Selection

---

## 📖 Overview

Phase 2 transforms the Izara Telemedicine web platform into a mobile-first experience using React Native (Expo). A **single unified app** ("Izara Dr. Anywhere") enables both patients and doctors to access telemedicine services on iOS and Android devices. Users select their role on first launch — Patient or Doctor — and the app provides the complete feature set for that role, identical to the corresponding web portal. The app includes native capabilities like biometric authentication, push notifications, camera-based document scanning, wearable device integration, multi-service API token management, and offline support.

> **Key Decision:** ONE app for both roles, not two separate apps.  
> Rationale: Lower maintenance, single download, shared codebase, easier user distribution.

### Phase 2 Vision

> **"หมอทุกที่ — ดูแลสุขภาพได้ทุกที่ทุกเวลา"**  
> (Doctor Anywhere — Healthcare accessible anytime, anywhere)

---

## 🎯 Phase 2 Goals

| # | Goal | Description |
|---|------|-------------|
| 1 | **Unified Mobile App** | Single app with Patient/Doctor role selection for iOS & Android |
| 2 | **Full Webapp Feature Parity** | Every feature from both web portals available on mobile |
| 3 | **Native Capabilities** | Biometrics, push notifications, camera, GPS, offline |
| 4 | **Multi-Service API Tokens** | User-controlled connections to external services (add later) |
| 5 | **API Compatibility** | Reuse 100% of existing Phase 1 backend APIs |
| 6 | **Gemini Fine-Tuning** | Medical Thai language model optimization |
| 7 | **Payment Integration** | Consultation fee payment via Stripe/Omise/PromptPay |
| 8 | **Wearable Sync** | Apple Health / Google Fit vital signs sync |
| 9 | **PDPA Compliance** | Full privacy management, consent, data export |

---

## 📁 Documentation Index

### Core Documents

| # | Document | Description |
|---|----------|-------------|
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
|---|----------|-------------|
| 11 | [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Complete product description & feature matrix |
| 12 | [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | Multi-service API token architecture |
| 13 | [13_Mobile_Content_Library_Workflows.md](13_Mobile_Content_Library_Workflows.md) | Medical content, clinical resources, consultants |
| 14 | [14_Mobile_PDPA_Privacy.md](14_Mobile_PDPA_Privacy.md) | Thailand PDPA compliance for mobile |
| 15 | [15_Mobile_Offline_Sync.md](15_Mobile_Offline_Sync.md) | Offline mode & data sync architecture |
| 16 | [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md) | Role selection system design |

### Page Specifications

| Portal | Document | Description |
|--------|----------|-------------|
| **Unified App** | [Pages/Unified-App/Unified_App_Pages.md](Pages/Unified-App/Unified_App_Pages.md) | **All 77 screen specifications** (Patient + Doctor + Shared) |
| ~~Patient~~ | ~~Pages/Patient-Mobile/~~ | _Deprecated — superseded by Unified App spec_ |
| ~~Doctor~~ | ~~Pages/Doctor-Mobile/~~ | _Deprecated — superseded by Unified App spec_ |

---

## 🔗 Phase 1 → Phase 2 Compatibility Matrix

### Backend Reuse (100% API Compatible)

| Component | Phase 1 | Phase 2 | Change |
|-----------|---------|---------|--------|
| Patient Portal API | Express.js (port 3005) | Same — mobile calls same APIs | None |
| Doctor Portal API | Express.js (port 3010) | Same — mobile calls same APIs | None |
| Meeting Server | Express.js (port 3020) | Same — mobile uses Socket.IO | None |
| Database | PostgreSQL 18 + pgvector | Same database | Add mobile tables |
| Auth | bcrypt + JWT | Same + biometric layer | Add device tokens |
| AI | Gemini 2.5 Flash | Same + fine-tuned model | Add fine-tuning |

### New Backend Additions for Phase 2

| Component | Purpose | Priority |
|-----------|---------|----------|
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

## 📊 Feature Comparison: Web vs Mobile

| Feature | Web (Phase 1) ✅ | Mobile (Phase 2) 📱 |
|---------|-----------------|---------------------|
| Login | Email/Password | Email/Password + Biometric |
| Role Selection | Separate portals | Single app with role picker |
| Notifications | In-app + Email | Push + In-app + Email |
| Video Meeting | Jitsi Web embed | Jitsi Mobile SDK (PiP) |
| Speech-to-Text | Web Speech API | Native iOS/Android STT |
| Document Upload | File picker | Camera scanner + File picker |
| Maps | Google Maps embed | Native Maps (MapView) |
| Health Data | Manual entry | Manual + Wearable auto-sync |
| Offline | ❌ None | ✅ SQLite local cache |
| Payment | ❌ None | ✅ Stripe/Omise/PromptPay |
| GPS | Browser geolocation | Native GPS (background) |
| API Connections | ❌ None | ✅ Multi-service token management |
| PDPA Management | Basic consent | Full privacy management + data export |
| Living Will | ✅ Web form | ✅ 4-step wizard |
| Medical Content | ✅ Read | ✅ Read + offline caching |
| Clinical Resources | ✅ Manage | ✅ Manage + approval workflow |

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
|-------|----------|-------------|
| **Sprint 1** | Weeks 1-4 | Unified app setup, role selection, auth, push notifications |
| **Sprint 2** | Weeks 5-8 | Patient mode MVP (appointments, PHR, AI, PDPA, API connections) |
| **Sprint 3** | Weeks 9-12 | Doctor mode MVP (schedule, EMR, patients, content management) |
| **Sprint 4** | Weeks 13-16 | Video meeting mobile SDK, transcription, post-meeting AI |
| **Sprint 5** | Weeks 17-20 | Wearables, payment, document scanner, offline, living will |
| **Sprint 6** | Weeks 21-24 | Testing, App Store submission, production launch |

---

## 📚 Related Phase 1 Documents

| Document | Description |
|----------|-------------|
| [../PHASE1_REQUIREMENTS.md](../PHASE1_REQUIREMENTS.md) | Phase 1 requirements (completed) |
| [../Appointment_Workflows.md](../Appointment_Workflows.md) | Appointment workflows |
| [../Health_Records_Processes.md](../Health_Records_Processes.md) | PHR/EMR processes |
| [../VIDEO_MEETING_JITSI_GEMINI.md](../VIDEO_MEETING_JITSI_GEMINI.md) | Video meeting system |
| [../Notification_Workflows.md](../Notification_Workflows.md) | Notification system |
| [../User_management_Workflows.md](../User_management_Workflows.md) | User management |
| [../../API_ENDPOINTS_COMPLETE.md](../../API_ENDPOINTS_COMPLETE.md) | Complete API reference |

---

### End of Phase 2 README — v2.1.0 — February 2026
