# 📋 Phase 2 Implementation Plan — Izara AI-Based HIS & Mobile Application

**Version:** 2.2.0  
**Date:** February 2026  
**Project Codename:** Dr. Anywhere (หมอทุกที่) — AI-Based HIS  
**System Type:** AI-Based Health Information System + Unified Mobile App  
**Target Platforms:** iOS 15+ / Android 13+  
**Framework:** React Native with Expo  
**Architecture:** Single Unified App with Patient / Doctor / Nurse / Admin Role Selection

---

## 1. Executive Summary

### 1.1 Project Vision

Phase 2 transforms the Izara Telemedicine platform from a web-based consultation system into a **comprehensive AI-Based Health Information System (HIS)** delivered through a unified mobile application. The platform serves **5 facility types** — general clinics, Thai Traditional Medicine (CTM) clinics, elderly care centers, health centers (รพ.สต.), and hospital OPDs — unifying clinical, administrative, and AI capabilities in one ecosystem.

The expansion is built on **4 foundational pillars:**

| Pillar | Thai | Key Components |
| -------- | ------ | ---------------- |
| **1. Smart OPD** | ระบบ OPD อัจฉริยะ | AI History Taking, Smart Queue, Medical Scribe, CDS |
| **2. Connected Care** | ระบบดูแลต่อเนื่อง | Follow-up Tracking, Wearable Sync, Predictive Analytics |
| **3. Inclusive Healthcare** | สาธารณสุขแบบครอบคลุม | CTM (แพทย์แผนไทย), Geriatric Screening, Nursing Dashboard |
| **4. Health Network** | เครือข่ายสุขภาพ | HIS Integration (รพ.สต.), Clinic Network Admin, FHIR R4 |

The mobile app maintains 100% API compatibility with the existing Phase 1 web platform while adding native capabilities including biometric authentication, push notifications, camera-based document scanning, wearable device connectivity, SOS emergency, and offline support.

**Clinical Task Workflow (Task 1–5):**

```text
Task 1 → Task 2 → Task 3 → Task 4 → Task 5
Pre-Visit   Visit     Consult   Post-Visit  Follow-up
(AI Intake) (Queue)   (CDS/Rx)  (Summary)   (Analytics)
```

> **Key Decision:** ONE unified app (not two separate apps). See [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md).  
> **Master Reference:** See [PHASE2_MVP_COMPREHENSIVE.md](../../Phase2/PHASE2_MVP_COMPREHENSIVE.md) for full technical specifications.

### 1.2 Key Deliverables

| # | Deliverable | Priority | Target Sprint |
| --- | ------------- | ---------- | --------------- |
| 1 | **Unified App** — Role Selection + Foundation (iOS + Android) | P0 | Sprint 1 |
| 2 | Patient Mode — All patient screens & workflows | P0 | Sprint 2-3 |
| 3 | Doctor Mode — All doctor screens & clinical workflows | P0 | Sprint 3-4 |
| 4 | Push Notifications (FCM + APNS) + Biometric Auth | P0 | Sprint 1 |
| 5 | Mobile Video Meeting (Jitsi SDK) | P0 | Sprint 4 |
| 6 | Multi-Service API Token Management | P0 | Sprint 2 |
| 7 | Offline Data Sync + SQLite Cache | P1 | Sprint 5 |
| 8 | Document Scanner (Camera + AI OCR) | P1 | Sprint 5 |
| 9 | Wearable Sync (Apple Health / Google Fit) | P1 | Sprint 5 |
| 10 | Payment Gateway (Stripe/Omise/PromptPay) | P1 | Sprint 5 |
| 11 | PDPA Compliance + Privacy Management | P0 | Sprint 2 |
| 12 | Gemini Medical Thai Fine-Tuning | P2 | Sprint 6 |
| 13 | App Store Submission (iOS + Android) | P0 | Sprint 6 |
| 14 | Production Launch (Mobile App v1.0) | P0 | Sprint 6 |
| **AI-HIS Deliverables:** | | | |
| 15 | **AI History Taking** — Interactive & voice-based intake | P0 | Sprint 7 |
| 16 | **FHIR R4 Data Schema** — HL7 FHIR compliant EMR/PHR | P0 | Sprint 7 |
| 17 | **CTM Module** — Thai Traditional Medicine (ธาตุเจ้าเรือน, สมุฏฐาน, Herbal Rx) | P0 | Sprint 7 |
| 18 | **Investigation Reports** — Lab, Radiology, Pathology | P0 | Sprint 7 |
| 19 | **Geriatric Screening Module** — 8-tool battery (ADL, TUG, Mini-Cog, MNA, etc.) | P0 | Sprint 8 |
| 20 | **Nursing Dashboard** — Care plans, vital alerts, shift handover | P0 | Sprint 8 |
| 21 | **SOS Emergency System** — One-tap alert with GPS | P0 | Sprint 8 |
| 22 | **Follow-up Tracking** — Automated recall & compliance | P1 | Sprint 8 |
| 23 | **Predictive Health Analytics** — AI risk scores (DM, CVD, CKD, etc.) | P1 | Sprint 9 |
| 24 | **Executive Health Dashboard** — Analytics for doctors/admins | P1 | Sprint 9 |
| 25 | **HIS Integration (รพ.สต.)** — FHIR-based data exchange | P1 | Sprint 9 |
| 26 | **Admin Clinic Network Dashboard** — Multi-clinic management | P1 | Sprint 9 |
| 27 | **Automated Refer/Medical Report** — AI auto-generate from EMR | P2 | Sprint 10 |
| 28 | **AI-HIS Platform Launch** — Full AI-Based HIS deployment | P0 | Sprint 10 |

### 1.3 Success Criteria

| Metric | Target |
| -------- | -------- |
| App Store Rating | ≥ 4.5 stars |
| Video Call Quality | ≥ 720p, <200ms latency |
| Push Notification Delivery | ≥ 98% delivery rate |
| Offline Sync Reliability | 100% data consistency |
| Biometric Login Speed | < 1 second |
| App Size | < 100 MB (single unified app) |
| Crash Rate | < 0.1% |
| **AI History Taking Accuracy** | **≥ 90% structured data extraction** |
| **FHIR R4 Compliance** | **100% resource validation pass** |
| **Geriatric Screening Completion** | **< 15 min average per battery** |
| **SOS Alert Response** | **< 3 sec alert delivery** |
| **Predictive Model AUC-ROC** | **≥ 0.85 for Diabetes/CVD/CKD** |
| **HIS Data Exchange Success** | **≥ 99% sync reliability** |
| **CTM Module Herb Coverage** | **≥ 200 herbs in initial database** |

---

## 2. Phase 1 Status (Completed)

### 2.1 What Exists (v1.4.8)

| Component | Status | Technology |
| ----------- | -------- | ------------ |
| Patient Web Portal | ✅ Production | React 18, TypeScript, Vite, Tailwind |
| Doctor Web Portal | ✅ Production | React 18, TypeScript, Vite, Tailwind |
| Meeting Server | ✅ Production | Express.js, Socket.IO, Jitsi |
| PostgreSQL Database | ✅ Production | PostgreSQL 18 + pgvector |
| AI Integration | ✅ Production | Gemini 2.5 Flash |
| E2E Tests | ✅ 774 Tests Passing | Playwright |
| Cloud Deployment | ✅ Google Cloud Run | Docker containers |
| API Endpoints | ✅ ~402 endpoints | 5 server processes |

### 2.2 Phase 1 Features Available to Mobile

All Phase 1 features are API-accessible and can be consumed by mobile apps:

- ✅ User registration & login (bcrypt + JWT)
- ✅ Appointment booking, scheduling, management
- ✅ Video consultations (Jitsi Meet)
- ✅ PHR management (vitals, medications, allergies, lifestyle)
- ✅ EMR documentation (SOAP format)
- ✅ AI Health Assistant (Gemini chat)
- ✅ Clinical Decision Support (CDS)
- ✅ Patient Instructions (auto-generated)
- ✅ Document analysis (PDF/Lab results)
- ✅ Pre-consultation summaries
- ✅ Notifications (in-app + email)
- ✅ Medical content library
- ✅ Healthcare facility map
- ✅ Living will management
- ✅ PDPA consent management
- ✅ Meeting transcription (Web Speech API)
- ✅ Multi-party meetings with guest invites

---

## 3. Phase 2 Architecture Decision

### 3.1 Technology Selection: React Native (Expo)

| Option | Pros | Cons | Decision |
| -------- | ------ | ------ | ---------- |
| **React Native (Expo)** | Code sharing with web, huge ecosystem, Expo toolchain | Performance gap vs native | ✅ **Selected** |
| Flutter | Fast rendering, great tooling | Different language (Dart), no code sharing | ❌ |
| Native (Swift/Kotlin) | Best performance | 2x development cost, 2x maintenance | ❌ |
| PWA | Cheapest, instant deploy | Limited native features, no App Store | ❌ |

**Rationale:** React Native shares React knowledge with the existing web team, TypeScript across all codebases, and Expo provides managed native modules (camera, biometrics, push, etc.) with simplified OTA updates.

### 3.2 Monorepo Strategy (Single Unified App)

```text
Isara-mobile/                          # Expo monorepo
├── app/                               # Expo Router — SINGLE APP
│   ├── _layout.tsx                    # Root layout (providers, role context)
│   ├── index.tsx                      # Entry → role check → redirect
│   ├── role-selection.tsx             # First launch role picker
│   ├── (patient)/                     # Patient route group
│   │   ├── _layout.tsx               # Patient providers, green accent
│   │   ├── (auth)/                   # Patient auth stack
│   │   └── (tabs)/                   # Patient tab navigator
│   └── (doctor)/                      # Doctor route group
│       ├── _layout.tsx               # Doctor providers, blue accent
│       ├── (auth)/                   # Doctor auth stack (+ 2FA)
│       └── (tabs)/                   # Doctor tab navigator
├── packages/
│   ├── api-client/                    # Shared API client
│   │   ├── src/
│   │   │   ├── client.ts             # Axios/fetch wrapper
│   │   │   ├── auth.ts               # Auth API calls (per-role)
│   │   │   ├── api-connections.ts    # Multi-service token management
│   │   │   ├── appointments.ts       # Appointment APIs
│   │   │   ├── phr.ts                # PHR APIs
│   │   │   ├── ai.ts                 # AI APIs
│   │   │   ├── meetings.ts           # Meeting APIs
│   │   │   ├── notifications.ts      # Notification APIs
│   │   │   └── types.ts              # Shared TypeScript types
│   │   └── package.json
│   ├── shared/                        # Shared utilities
│   │   ├── src/
│   │   │   ├── hooks/                # Custom hooks
│   │   │   ├── contexts/             # React contexts (role, theme)
│   │   │   ├── stores/               # Zustand stores (auth, role, etc.)
│   │   │   ├── utils/                # Helper functions
│   │   │   ├── constants/            # App constants
│   │   │   └── types/                # TypeScript types
│   │   └── package.json
│   └── ui/                            # Shared UI components
│       ├── src/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   ├── Input.tsx
│       │   ├── Modal.tsx
│       │   ├── Avatar.tsx
│       │   ├── RoleSwitcher.tsx       # Role switch component
│       │   └── theme.ts              # Design tokens (per-role colors)
│       └── package.json
├── assets/                            # Images, fonts (TH Sarabun New)
├── app.json                           # Single Expo config
├── package.json                       # Root workspace
├── tsconfig.base.json
└── turbo.json                         # Turborepo config
```

> **Code sharing:** ~55% of code is shared between patient and doctor modes via `packages/`.  
> See [01_Mobile_App_Architecture.md](01_Mobile_App_Architecture.md) for full screen structure.

---

## 4. Sprint Plan

### Sprint 1: Foundation (Weeks 1-4)

**Goal:** Unified app setup, role selection, authentication, navigation, push notifications

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S1-01 | Initialize Expo monorepo with Turborepo (single app) | P0 | 2 |
| S1-02 | Configure TypeScript, ESLint, Prettier | P0 | 1 |
| S1-03 | Build Role Selection screen (Patient / Doctor) | P0 | 2 |
| S1-04 | Set up Expo Router with (patient)/ and (doctor)/ route groups | P0 | 3 |
| S1-05 | Build shared API client package (@izara/api-client) | P0 | 3 |
| S1-06 | Implement Patient login/register screens | P0 | 3 |
| S1-07 | Implement Doctor login + 2FA screens | P0 | 3 |
| S1-08 | Add biometric authentication (expo-local-authentication) | P0 | 3 |
| S1-09 | Implement per-role secure token storage (expo-secure-store) | P0 | 2 |
| S1-10 | Set up FCM + APNS push notifications (expo-notifications) | P0 | 4 |
| S1-11 | Build push notification backend service | P0 | 3 |
| S1-12 | Create shared UI component library (@izara/ui) | P0 | 4 |
| S1-13 | Implement theme system (light/dark + role-based accent) | P1 | 2 |
| S1-14 | Set up CI/CD pipeline (EAS Build) + environments | P1 | 3 |
| S1-15 | Role switching mechanism (profile menu) | P0 | 2 |

**Sprint 1 Deliverable:** Unified app with role selection, both login flows, biometrics + push notifications

---

### Sprint 2: Patient Mode MVP (Weeks 5-8)

**Goal:** Core patient screens — Dashboard, Appointments, PHR, AI Chat, PDPA, API Connections

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S2-01 | Patient Dashboard screen (P07) | P0 | 3 |
| S2-02 | Appointment list screen (P08) | P0 | 3 |
| S2-03 | Appointment booking flow — 5-step wizard (P09) | P0 | 5 |
| S2-04 | Appointment detail screen with Jitsi link (P10) | P0 | 2 |
| S2-05 | PHR overview screen (tabs: vitals, meds, allergies) (P11) | P0 | 4 |
| S2-06 | Vital signs recording with charts + wearable badges (P12) | P0 | 3 |
| S2-07 | Medication management screen (P13) | P0 | 2 |
| S2-08 | Allergy management screen (P14) | P0 | 2 |
| S2-09 | AI Health Assistant chat screen (P20) | P0 | 4 |
| S2-10 | Voice input for AI chat (expo-speech) (P21) | P1 | 2 |
| S2-11 | PDPA consent flow — 3-step (P05) | P0 | 3 |
| S2-12 | PDPA Privacy Management screen (P28) | P0 | 2 |
| S2-13 | Multi-Service API Connections screen (P29) | P0 | 3 |
| S2-14 | Notification center screen (P24) | P0 | 2 |
| S2-15 | Profile & settings screen (P22, P23) | P0 | 2 |
| S2-16 | Health Library — article list + viewer (P35) | P1 | 3 |
| S2-17 | Healthcare map with GPS (P34) | P1 | 3 |
| S2-18 | Pull-to-refresh + skeleton loading patterns | P1 | 2 |

**Sprint 2 Deliverable:** Patient mode functional with all core workflows + PDPA + API connections

---

### Sprint 3: Doctor Mode MVP (Weeks 9-12)

**Goal:** Core doctor screens — Dashboard, Schedule, Patient Management, EMR, Content Management

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S3-01 | Doctor Dashboard screen (D04) — phone + tablet layouts | P0 | 4 |
| S3-02 | Schedule/Calendar view — Day/Week/Month (D05) | P0 | 4 |
| S3-03 | Pending appointments (D06) | P0 | 2 |
| S3-04 | Appointment pool management (D07) | P0 | 3 |
| S3-05 | Patient list + search with PDPA badges (D09) | P0 | 3 |
| S3-06 | Patient detail screen (PDPA check + AI pre-consult) (D10) | P0 | 4 |
| S3-07 | EMR viewer + history (D11) | P0 | 3 |
| S3-08 | Create EMR — SOAP + AI assist + ICD-10 + offline draft (D13) | P0 | 5 |
| S3-09 | E-Prescribing with drug interaction AI (D15) | P0 | 3 |
| S3-10 | Lab order management (D16) | P0 | 2 |
| S3-11 | Queue management — Socket.IO real-time (D18) | P0 | 3 |
| S3-12 | Walk-in registration (D19) | P1 | 2 |
| S3-13 | AI Clinical Copilot (CDS alerts) (D20, D28) | P1 | 3 |
| S3-14 | Medical calculators — offline capable (D29) | P1 | 2 |
| S3-15 | Clinical resources management + content approval (D30, D37) | P1 | 3 |
| S3-16 | Doctor notification center (D22) | P0 | 2 |
| S3-17 | Doctor profile & settings (D32, D33) | P0 | 2 |
| S3-18 | Admin screens: dashboard, doctor mgmt, analytics (D34-D36) | P2 | 3 |

**Sprint 3 Deliverable:** Doctor mode functional with full clinical workflows

---

### Sprint 4: Video Meeting Integration (Weeks 13-16)

**Goal:** Mobile video consultations with Jitsi SDK, transcription, AI pipeline

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S4-01 | Integrate Jitsi Meet React Native SDK | P0 | 5 |
| S4-02 | Meeting lobby UI (patient waits for HOST) | P0 | 3 |
| S4-03 | Doctor HOST controls (admit/reject, mute) | P0 | 3 |
| S4-04 | Native speech-to-text for transcription | P0 | 4 |
| S4-05 | Real-time transcript display during meeting | P0 | 3 |
| S4-06 | In-meeting chat (Socket.IO) | P0 | 2 |
| S4-07 | Guest invite flow (share link via native share) | P1 | 2 |
| S4-08 | Post-meeting AI summary display | P0 | 3 |
| S4-09 | Man-in-the-Loop validation UI (mobile) | P0 | 3 |
| S4-10 | Patient instruction sheet viewer | P0 | 2 |
| S4-11 | Meeting history screen | P1 | 2 |
| S4-12 | Picture-in-Picture mode for meetings | P2 | 3 |

**Sprint 4 Deliverable:** Full video consultation flow working on mobile

---

### Sprint 5: Advanced Features (Weeks 17-20)

**Goal:** Wearables, payment, camera scanner, offline mode

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S5-01 | Offline data cache (SQLite via expo-sqlite) | P1 | 5 |
| S5-02 | Background sync service | P1 | 3 |
| S5-03 | Conflict resolution for offline edits | P1 | 3 |
| S5-04 | Document scanner (expo-camera + AI OCR) | P1 | 4 |
| S5-05 | Lab result photo → AI analysis pipeline | P1 | 3 |
| S5-06 | Apple Health integration (expo-health) | P1 | 4 |
| S5-07 | Google Fit integration | P1 | 3 |
| S5-08 | Auto-sync wearable vitals to PHR | P1 | 2 |
| S5-09 | Payment gateway setup (Stripe/Omise/PromptPay SDK) | P1 | 4 |
| S5-10 | Consultation fee payment flow | P1 | 3 |
| S5-11 | Payment history & receipts | P1 | 2 |
| S5-12 | Living will mobile flow — 4-step wizard (P17) | P0 | 3 |
| S5-13 | Health timeline screen (P15) | P0 | 2 |
| S5-14 | Medication reminder notifications | P2 | 3 |

**Sprint 5 Deliverable:** Full feature parity with web + mobile-exclusive features

---

### Sprint 6: Polish & Launch (Weeks 21-24)

**Goal:** Testing, optimization, App Store submission, production launch

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S6-01 | Performance optimization (bundle size, lazy loading) | P0 | 3 |
| S6-02 | Accessibility audit (VoiceOver, TalkBack) | P0 | 3 |
| S6-03 | Thai language complete review | P0 | 2 |
| S6-04 | Security audit (OWASP Mobile Top 10) | P0 | 3 |
| S6-05 | E2E testing with Detox | P0 | 5 |
| S6-06 | Beta testing (TestFlight + Google Play Internal) | P0 | 5 |
| S6-07 | Gemini fine-tuning with medical Thai data | P2 | 5 |
| S6-08 | App Store assets (screenshots, descriptions, icons) | P0 | 3 |
| S6-09 | iOS App Store submission | P0 | 2 |
| S6-10 | Google Play Store submission | P0 | 2 |
| S6-11 | Production deployment verification | P0 | 2 |
| S6-12 | Launch monitoring & hotfix readiness | P0 | 3 |

**Sprint 6 Deliverable:** Both apps live on App Store & Google Play

---

### Sprint 7: AI-HIS Core — History Taking, CTM, FHIR (Weeks 25-28)

**Goal:** Deploy AI History Taking engine, CTM module, FHIR data schema, Investigation reports

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S7-01 | FHIR R4 data schema migration (Patient, Encounter, Observation, etc.) | P0 | 5 |
| S7-02 | AI History Taking — Gemini-powered interactive intake flow | P0 | 5 |
| S7-03 | AI History Taking — Voice input (Thai/English STT) | P0 | 3 |
| S7-04 | AI History Taking → OPD Card auto-generation | P0 | 3 |
| S7-05 | CTM module — ธาตุเจ้าเรือน (Element Assessment) UI | P0 | 3 |
| S7-06 | CTM module — สมุฏฐาน (Pathogenesis) assessment engine | P0 | 3 |
| S7-07 | CTM module — Herbal prescription (ตำรับยาสมุนไพร) with DDI check | P0 | 4 |
| S7-08 | Investigation Orders — Lab, Radiology, Pathology order forms | P0 | 3 |
| S7-09 | Investigation Results — structured result viewer with AI interpretation | P0 | 3 |
| S7-10 | pgvector embeddings for RAG-based clinical decision support | P1 | 4 |
| S7-11 | FHIR-compliant EMR/PHR endpoints refactoring | P0 | 4 |

**Sprint 7 Deliverable:** AI History Taking live, CTM module functional, FHIR schema deployed

---

### Sprint 8: Elderly Care & Emergency Systems (Weeks 29-32)

**Goal:** Geriatric screening, Nursing dashboard, SOS emergency, Follow-up tracking

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S8-01 | Geriatric Screening — ADL/Barthel Index UI + scoring | P0 | 2 |
| S8-02 | Geriatric Screening — IADL/Lawton Scale | P0 | 2 |
| S8-03 | Geriatric Screening — TUG (Timed Up & Go) with timer | P0 | 2 |
| S8-04 | Geriatric Screening — Mini-Cog (cognitive) | P0 | 2 |
| S8-05 | Geriatric Screening — MNA (nutritional), GDS-15, SARC-F, Braden | P0 | 4 |
| S8-06 | Geriatric risk score dashboard with trend charts | P0 | 3 |
| S8-07 | Nursing Dashboard — Resident profiles & care plan management | P0 | 4 |
| S8-08 | Nursing Dashboard — Vital alert matrix & shift handover | P0 | 3 |
| S8-09 | SOS Emergency — One-tap alert with GPS coordinates | P0 | 3 |
| S8-10 | SOS Emergency — Real-time alert broadcast (Socket.IO) | P0 | 3 |
| S8-11 | SOS Emergency — Caregiver/facility notification chain | P0 | 2 |
| S8-12 | Follow-up Tracking — Automated recall scheduler | P1 | 3 |
| S8-13 | Follow-up Tracking — Compliance dashboard + patient reminders | P1 | 3 |
| S8-14 | Nurse role in role-selection (new role addition) | P0 | 2 |

**Sprint 8 Deliverable:** Geriatric screening battery, Nursing dashboard, SOS system live

---

### Sprint 9: Predictive Analytics & Network Integration (Weeks 33-36)

**Goal:** AI predictive models, Executive dashboard, HIS integration, Clinic network admin

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S9-01 | Predictive Analytics — Diabetes risk model (Thai population) | P1 | 3 |
| S9-02 | Predictive Analytics — CVD risk model (Framingham + Thai adj.) | P1 | 3 |
| S9-03 | Predictive Analytics — CKD, Readmission, Fall risk models | P1 | 4 |
| S9-04 | Predictive Analytics — Drug interaction severity scoring | P1 | 3 |
| S9-05 | Executive Health Dashboard — Doctor analytics (patients, revenue, AI) | P1 | 4 |
| S9-06 | Executive Health Dashboard — Admin analytics (clinic-wide) | P1 | 3 |
| S9-07 | HIS Integration — FHIR R4 data exchange with รพ.สต. | P1 | 5 |
| S9-08 | HIS Integration — PHR ↔ HIS bidirectional sync | P1 | 4 |
| S9-09 | Admin Clinic Network Dashboard — Multi-clinic overview | P1 | 3 |
| S9-10 | Admin Clinic Network Dashboard — Doctor network management | P1 | 3 |
| S9-11 | Admin Clinic Network Dashboard — Network analytics & reports | P1 | 3 |

**Sprint 9 Deliverable:** Predictive analytics live, HIS integration tested, Network admin functional

---

### Sprint 10: AI-HIS Polish & Full Platform Launch (Weeks 37-40)

**Goal:** Automated reports, AI fine-tuning, full integration testing, AI-HIS platform launch

| Task | Description | Priority | Days |
| ------ | ------------- | ---------- | ------ |
| S10-01 | Automated Medical Report — AI auto-generate from EMR/transcript | P2 | 4 |
| S10-02 | Automated Referral Report — cross-facility refer document | P2 | 3 |
| S10-03 | CTM fine-tuning — Herbal medicine AI accuracy improvement | P2 | 3 |
| S10-04 | Geriatric AI — Care plan recommendation engine | P2 | 3 |
| S10-05 | Full E2E testing of AI-HIS features (Detox + manual) | P0 | 5 |
| S10-06 | FHIR compliance validation (HL7 Validator suite) | P0 | 3 |
| S10-07 | Security audit — AI endpoints, PHI encryption, consent | P0 | 3 |
| S10-08 | Performance optimization — AI response times < 3s | P0 | 3 |
| S10-09 | Thai localization review for all AI-HIS screens | P0 | 2 |
| S10-10 | App Store update submission (v2.0 with AI-HIS) | P0 | 2 |
| S10-11 | Production deployment — AI-HIS services | P0 | 3 |
| S10-12 | Launch monitoring & hotfix readiness | P0 | 3 |

**Sprint 10 Deliverable:** Complete AI-Based HIS platform live

---

## 5. Resource Requirements

### 5.1 Team Composition

| Role | Count | Responsibility |
| ------ | ------- | ---------------- |
| Mobile Tech Lead | 1 | Architecture, code review, standards |
| React Native Developer | 2 | Feature development (1 patient, 1 doctor) |
| Backend Developer | 1.5 | Mobile APIs + AI-HIS backend services |
| AI/ML Engineer | 1 | AI History Taking, Predictive Analytics, CDS, RAG pipeline |
| UI/UX Designer | 1 | Mobile screen designs, Thai localization |
| QA Engineer | 1 | Mobile testing, device matrix |
| DevOps Engineer | 0.5 | EAS Build, CI/CD, App Store deployment |
| **Clinical Advisor (CTM)** | **0.5** | **Thai Traditional Medicine domain expertise** |
| **Clinical Advisor (Geriatric)** | **0.5** | **Geriatric screening & elderly care protocols** |

### 5.2 Infrastructure Requirements

| Service | Purpose | Cost Estimate (Monthly) |
| --------- | --------- | ------------------------ |
| Expo EAS Build | CI/CD for iOS + Android | $99 (Production plan) |
| Apple Developer Program | iOS App Store | $99/year |
| Google Play Developer | Android Play Store | $25 one-time |
| Firebase (FCM) | Push notifications | Free tier (sufficient) |
| Sentry | Error tracking | $26/mo (Team plan) |
| Additional Cloud Run CPU | Mobile + AI-HIS API traffic | ~$150-250/mo |
| **Gemini API (AI-HIS)** | **History Taking, CDS, Predictive, Scribe** | **~$100-300/mo (usage-based)** |
| **pgvector Extension** | **RAG embeddings for clinical AI** | **Included in PostgreSQL** |
| **FHIR Validator** | **HL7 FHIR R4 compliance testing** | **Free (open-source)** |

### 5.3 Development Environment

| Tool | Version | Purpose |
| ------ | --------- | --------- |
| Node.js | 22 LTS | Runtime |
| Expo SDK | 52+ | React Native framework |
| Expo Router | v4 | File-based navigation |
| TypeScript | 5.x | Type safety |
| React Native | 0.76+ | Mobile framework |
| Turborepo | Latest | Monorepo management |
| EAS CLI | Latest | Build & deployment |

---

## 6. Risk Assessment

| Risk | Impact | Probability | Mitigation |
| ------ | -------- | ------------- | ------------ |
| Jitsi SDK compatibility | High | Medium | Test early in Sprint 1, have WebView fallback |
| App Store rejection | High | Low | Follow guidelines strictly, prepare for review |
| Performance on low-end devices | Medium | Medium | Performance budgets, lazy loading, profiling |
| Offline sync conflicts | Medium | Medium | Last-write-wins with manual conflict resolution |
| Biometric API differences (iOS vs Android) | Low | Medium | Use expo-local-authentication abstraction |
| Push notification delivery | Medium | Low | FCM + APNS with retry logic |
| **AI History Taking hallucination** | **High** | **Medium** | **Man-in-the-Loop validation, confidence scoring** |
| **FHIR migration data loss** | **High** | **Low** | **Staged migration, parallel run, rollback plan** |
| **CTM domain accuracy** | **Medium** | **Medium** | **Clinical advisor review, herb DB curation** |
| **Geriatric screening tool licensing** | **Low** | **Low** | **Use public-domain tools (Barthel, TUG, etc.)** |
| **HIS interoperability (รพ.สต.)** | **High** | **Medium** | **FHIR R4 standard, pilot with 1-2 facilities** |
| **Predictive model bias** | **Medium** | **Medium** | **Thai population training data, regular revalidation** |
| **SOS false alarm rate** | **Medium** | **Medium** | **Confirmation step, auto-cancel timer** |

---

## 7. Testing Strategy

### 7.1 Test Pyramid

| Level | Tool | Coverage Target |
| ------- | ------ | ----------------- |
| Unit Tests | Jest + React Native Testing Library | 80% |
| Integration Tests | Jest + MSW (API mocking) | Key workflows |
| E2E Tests | Detox | Critical user journeys |
| Manual Testing | Device matrix (iOS + Android) | Full regression |
| Performance | React Native Performance Monitor | All screens < 60fps |

### 7.2 Device Matrix

| Platform | Devices | OS Versions |
| ---------- | --------- | ------------- |
| iOS | iPhone 13, 14, 15, 16 | iOS 15, 16, 17, 18 |
| Android | Samsung Galaxy S22+, Pixel 7, Xiaomi | Android 13, 14, 15 |
| Tablet | iPad (optional Phase 2.1) | iPadOS 16+ |

---

## 8. Deployment Strategy

### 8.1 Environments

| Environment | Purpose | API Target |
| ------------- | --------- | ------------ |
| Development | Local development | localhost:3005/3010/3020 |
| Staging | QA testing | dev-testing Cloud Run URLs |
| Production | Live users | Production Cloud Run URLs |

### 8.2 Release Strategy

| Channel | Purpose | Audience |
| --------- | --------- | ---------- |
| Internal Testing | Daily builds for dev team | Developers |
| Closed Beta | Pre-release testing | Dr. Isara + selected patients |
| Open Beta | Public beta | TestFlight / Google Play Beta |
| Production | General release | All users |

### 8.3 OTA Updates

Expo OTA (Over-the-Air) updates for JavaScript bundle changes without re-submission:

- Bug fixes → OTA push (immediate)
- UI changes → OTA push (immediate)
- Native module changes → Full App Store build required

---

## 9. Acceptance Criteria Summary

| Requirement | Acceptance Test |
| ------------- | ----------------- |
| Role selection works | First launch shows patient/doctor choice; subsequent launches auto-resume |
| Role switching works | User can switch between patient and doctor modes from profile menu |
| Patient can book appointment from mobile | Complete 5-step booking flow, receive push confirmation |
| Patient can join video consultation | Jitsi SDK loads, audio/video works, lobby system |
| Doctor can manage schedule from mobile | View/confirm/decline appointments, queue management |
| Doctor can create EMR on mobile | SOAP notes with AI assist, ICD-10, offline draft |
| E-Prescribing works | Drug interaction AI check, prescription creation |
| Biometric login works | Face ID / fingerprint unlocks app in < 1 second (per-role) |
| Push notifications delivered | Appointment reminders arrive on time (± 30 seconds) |
| Offline mode works | PHR data accessible without network, syncs on reconnect |
| Wearable data syncs | Heart rate from Apple Watch appears in PHR |
| Payment completes | Full Stripe/PromptPay checkout flow for consultation fee |
| Multi-API connections | User can add/remove external services from Connections screen |
| PDPA compliance | Consent flow, privacy management, data export, account deletion |
| Living will complete | Full 4-step wizard with legal requirements on mobile |
| Content library works | Health articles (patient), Clinical resources (doctor) |
| Thai language throughout | All screens render correctly in Thai |
| Full webapp feature parity | Every webapp feature available on mobile |
| **AI-HIS Acceptance Criteria:** | |
| **AI History Taking works** | **Patient completes voice/text intake → structured OPD Card generated with ≥ 90% accuracy** |
| **CTM module works** | **Practitioner completes ธาตุเจ้าเรือน assessment → herbal prescription generated** |
| **Geriatric screening complete** | **Nurse completes all 8 screening tools → risk score dashboard populated** |
| **Nursing dashboard works** | **Nurse views residents, creates care plans, receives vital alerts** |
| **SOS emergency works** | **Patient taps SOS → facility/caregiver receives alert with GPS within 3 seconds** |
| **Follow-up tracking works** | **System auto-schedules follow-ups → patient receives reminders → compliance tracked** |
| **Predictive analytics works** | **Patient PHR data → AI generates risk scores for DM/CVD/CKD with confidence** |
| **HIS integration works** | **FHIR R4 data syncs between app and รพ.สต. with 99% reliability** |
| **Investigation reports work** | **Doctor orders Lab/Rad/Path → results display with AI interpretation** |
| **Clinic network admin works** | **Admin views multi-clinic analytics, manages doctors across network** |
| **Executive dashboard works** | **Doctor/Admin sees patient stats, revenue, AI insights per period** |
| **Automated referral works** | **AI generates referral report from EMR → ready for cross-facility sharing** |

---

## 10. Related Documents

| Document | Relevance |
| ---------- | ----------- |
| [PHASE2_MVP_COMPREHENSIVE.md](../../Phase2/PHASE2_MVP_COMPREHENSIVE.md) | 🏗️ Master comprehensive plan — AI-Based HIS full specifications |
| [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Complete product description & feature matrix |
| [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | Multi-service API token architecture |
| [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md) | Role selection system design |
| [Pages/Unified-App/Unified_App_Pages.md](Pages/Unified-App/Unified_App_Pages.md) | All screen specifications |

---

### End of Phase 2 Implementation Plan — v2.2.0 — AI-Based HIS & Mobile Application — February 2026
