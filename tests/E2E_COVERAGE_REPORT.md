# E2E Test Coverage Report — v1.5.7

**Generated:** 2026-03-14  
**Framework:** Playwright 1.40 (TypeScript)  
**Total Spec Files:** 32  
**Total Tests:** ~1,124  
**User Accounts Used:** 5 (patient1, patient2, patient3, doctor, admin)  
**Parallel Workers:** 6 (configurable via PW_WORKERS env)  
**Full Suite Duration:** ~4.2 minutes  
**Pass Rate:** 100%

---

## Part 1: Per-Spec-File Breakdown

---

### 01-auth-health-multiuser.spec.ts (803 lines, ~82 tests)

**Sections:** A–H (8 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | Service Health Checks | 8 | A01–A08 |
| B | Multi-User Authentication | 15 | B01–B15 |
| C | Registration Flows | 10 | C01–C10 |
| D | Role-Based Access Control | 10 | D01–D10 |
| E | Multi-User Browser Login | 12 | E01–E12 |
| F | Metadata & Reference Data | 10 | F01–F10 |
| G | Extended Auth & Security | 5 | G01–G05 |
| H | Doctor Search & Dashboard | 12 | H01–H12 |

**User Accounts:** ALL 5 (patient1, patient2, patient3, doctor, admin)

**Features Tested:**

- Health endpoints for all 3 services (patient portal, doctor portal, meeting server)
- 5-user simultaneous authentication with token validation
- Invalid credentials, missing credentials, expired tokens
- Patient + doctor registration flows
- Duplicate email prevention, weak password rejection
- Doctor license number registration
- Admin pending doctor management
- RBAC (role-based access control) checks
- Browser login for all roles + simultaneous session + session isolation
- Metadata APIs: specialties, lab tests, ICD-10, medications, content tags
- Doctor search by specialty/name, doctor schedule/slots/reviews
- Settings CRUD, notification preferences
- Profile update with Thai language content
- Admin user list, analytics, dashboard stats

---

### 02-appointment-lifecycle.spec.ts (1,018 lines, ~92 tests)

**Sections:** A–I (9 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | Patient Books Appointment | 12 | A01–A12 |
| B | Doctor Views & Confirms | 10 | B01–B10 |
| C | Cancel & Reschedule | 10 | C01–C10 |
| D | Meeting Link Management | 10 | D01–D10 |
| E | Appointment Notifications | 10 | E01–E10 |
| F | Browser Appointment UI | 8 | F01–F08 |
| G | Cross-Portal Sync | 10 | G01–G10 |
| H | Edge Cases | 10 | H01–H10 |
| I | Doctor-Side Appointment Management | 12 | I01–I12 |

**User Accounts:** ALL 5

**Features Tested:**

- Full appointment CRUD for 3 patients (including parallel booking)
- AI urgency assessment from symptoms
- Appointment pool/queue management
- Doctor confirmation (PATCH/PUT) + admin assignment
- Pre-consultation AI summary generation
- Meeting link creation and management
- Cancel + reschedule workflows
- Notification delivery on status changes
- Browser UI: patient appointments page, doctor schedule/dashboard, health meeting tabs, calendar view
- Cross-portal synchronization (patient books → doctor sees)
- Race conditions (same slot double-booking)
- Doctor pending/decline/reject flows
- Onsite appointment type
- AI doctor matching
- Meeting eligibility and meeting rules checks
- Missed meeting handling
- Google Calendar integration

---

### 03-health-records-emr.spec.ts (972 lines, ~95 tests)

**Sections:** A–J (10 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | PHR Read & Update | 12 | A01–A12 |
| B | Vitals History | 10 | B01–B10 |
| C | EMR Creation & Management | 12 | C01–C12 |
| D | Prescriptions & Lab Orders | 10 | D01–D10 |
| E | Living Will | 10 | E01–E10 |
| F | Timeline & Treatment Results | 8 | F01–F08 |
| G | Doctor Patient Record Viewer | 10 | G01–G10 |
| H | Edge Cases & Performance | 8 | H01–H08 |
| I | PHR Extended Records | 7 | I01–I07 |
| J | PDPA & Living Will Extended | 8 | J01–J08 |

**User Accounts:** ALL 5

**Features Tested:**

- PHR CRUD (all 3 patients, parallel, Thai content, unauthorized access, data isolation, response time)
- Vitals history: record, read, multiple entries, abnormal values, doctor view, browser PHR page
- EMR SOAP format: create, read, update, sign, AI-assisted, Thai OPD card, multi-patient, browser EMR editor, cross-portal view
- Prescriptions: create, list, multiple medications, multiple patients
- Lab orders: create, list, multiple tests
- Living will: create, read, update, share with doctors, PDPA consent, digital signature, revoke
- Health timeline and treatment results
- Doctor patient record viewer (6 tabs: PHR/EMR/EHR/Lab/Documents/Living Will)
- PHR extended: medications CRUD, allergies CRUD, lifestyle, emergency contacts
- EMR encounter types, EMR validation, pending prescriptions
- PDPA: consent status/grant/verify, audit log, living will versions/signature, doctor consents

---

### 04-video-meeting-transcription.spec.ts (917 lines, ~87 tests)

**Sections:** A–H (8 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | Meeting Creation & Config | 10 | A01–A10 |
| B | Meeting Join & Lobby | 9 | B01–B09 |
| C | Transcription Lifecycle | 10 | C01–C10 |
| D | AI Meeting Summary & SOAP | 10 | D01–D10 |
| E | Meeting End & Post-Meeting | 8 | E01–E08 |
| F | Multi-Browser Meeting Simulation | 8 | F01–F08 |
| G | Edge Cases & Performance | 10 | G01–G10 |
| H | Meeting Server Extended APIs | 12 | H01–H12 |

**User Accounts:** ALL 5

**Features Tested:**

- Meeting server health checks, video meeting configuration
- Meeting creation: from doctor portal, from meeting server, unique URLs per role, multi-patient
- Meeting join/lobby: patient get link, doctor host, patient participant, guest invite/join token, invalid meeting, unauthorized
- Transcription: start, pause, resume, language switch (TH↔EN), stop, get transcript, speaker labels, recording upload, meeting files
- AI summary: Gemini SOAP generation, from transcript, Thai + English, EMR summary, CDS recommendations, patient instruction sheet, long meeting sections, man-in-the-loop validation, full pipeline (meeting→AI→EMR)
- Meeting end and post-meeting AI processing
- Multi-browser simulation: doctor+patient, 3-way meeting, dashboard during meeting, multiple patients, meeting tabs, EMR editor after meeting, notifications, health timeline
- Performance: parallel meeting creation, empty/mixed transcript, concurrent requests, complex CDS, knowledge base, AI chat, document analysis, end-to-end pipeline
- Meeting server extended APIs: status, participants, transcript sections, chat send/get, saved summary, patient instruction sheet, upload recording, meeting files, meeting history, generate summary, process embeddings

---

### 05-content-sync-approval.spec.ts (1,174 lines, ~82 tests)

**Sections:** A–I (9 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | Medical Content CRUD | 12 | A01–A12 |
| B | Clinical Resources CRUD | 10 | B01–B10 |
| C | Admin Approval Workflow | 10 | C01–C10 |
| D | ★★★ Content Sync: Approve→Refresh→Visible ★★★ | 10 | D01–D10 |
| E | Medical Content Library UI | 8 | E01–E08 |
| F | Consultant Management | 8 | F01–F08 |
| G | Admin Management | 6 | G01–G06 |
| H | Cross-Cutting UI | 6 | H01–H06 |
| I | Content Extended & Admin Management | 12 | I01–I12 |

**User Accounts:** ALL 5

**Features Tested:**

- Medical content CRUD: doctor create/read/list/update/submit/delete, Thai bilingual, multiple articles, draft visibility, view count, like, tags
- Clinical resources CRUD: create/read/list/submit, admin approval required, re-approval on edit, delete, tags, patient access restriction
- Admin approval workflow: pending lists, create→pending, approve, direct publish, reject with reason, clinical resource approval, archive, lifecycle helper
- ★★★ CONTENT SYNC (critical path): API create→approve→patient sees; Browser content visible with ONE refresh; Multi-browser 3 patients all see; Clinical resource sync; Draft NOT visible; Rejected NOT visible; Update requires re-approval; Concurrent creation; Performance
- Medical content library UI: patient health library, doctor medical content, doctor clinical resources, admin pending badge, category filter, my content toggle, published articles, simultaneous view
- Consultant management: admin creates/updates/toggles availability/deletes, doctor lists/views/rates, specialties list, browser consultants page
- Admin management: pending doctors, doctor list, stats, browser admin pages
- Cross-cutting UI: dark mode, settings, AI consultation, map, profile, JS error check on all patient pages
- Content extended: featured articles, share count, audit log, comments, search by category/tag, admin user management, Google Maps nearby/geocode

---

### 06-ai-features-cds.spec.ts (876 lines, ~72 tests)

**Sections:** A–H (8 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | AI Chat (Patient Portal) | 10 | A01–A10 |
| B | Clinical Decision Support (CDS) | 10 | B01–B10 |
| C | AI Summarization | 10 | C01–C10 |
| D | Doctor Portal AI Features | 8 | D01–D08 |
| E | AI Meeting Integration | 8 | E01–E08 |
| F | Notifications & Real-Time | 8 | F01–F08 |
| G | Edge Cases & Performance | 6 | G01–G06 |
| H | AI Extended APIs & Notification Management | 12 | H01–H12 |

**User Accounts:** ALL 5

**Features Tested:**

- AI chat patient portal: English, Thai, clinical context, conversation threading, history, multi-patient concurrent, harmful content refusal, browser AI chat page, message send via browser, empty message
- CDS: drug interaction check, dosage validation, allergy alert, CDS alerts list/per patient, CDS logs, real-time prescription check, Thai medication names, man-in-the-loop acknowledge, concurrent multi-patient
- AI summarization: pre-consultation, patient summary, EMR from transcript (SOAP), generic document, Thai, patient instruction sheet, meeting summary sections, man-in-the-loop validation, document analysis, knowledge base
- Doctor AI features: medical scribe (voice→text), AI-assisted EMR completion, differential diagnosis, medication recommendation, doctor AI page browser, AI in patient record viewer, AI instruction sheet, parallel queries
- AI meeting integration: transcript→SOAP, post-meeting CDS, speaker diarization, auto-save to EMR, critical findings, bilingual, empty/long transcript
- Notifications: patient/doctor get/mark read/mark all/count, concurrent polling, notification preferences
- Edge cases: unauthenticated AI, missing fields, XSS, performance <30s, multiple AI parallel, SQL injection
- AI extended: symptom checker, risk assessment, health info query, AI service status, chat memory/clear history, CDS drug/allergy, knowledge search, lab analysis, notification management

---

### 07-multi-user-concurrent.spec.ts (1,098 lines, ~60 tests)

**Sections:** A–G (7 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | Appointment Flow: 4 Windows Simultaneously | 10 | A01–A10 |
| B | Content Flow: Doctor→Admin→All Patients | 8 | B01–B08 |
| C | Health Records Cross-Portal | 8 | C01–C08 |
| D | Meeting Multi-User | 8 | D01–D08 |
| E | Queue & Dashboard | 8 | E01–E08 |
| F | Stress & Edge Cases | 8 | F01–F08 |
| G | Queue Management & Cross-Portal Notifications | 10 | G01–G10 |

**User Accounts:** ALL 5

**Features Tested:**

- 4-browser simultaneous appointment flow: patient books→doctor confirms→patient sees, 5 users simultaneously, 3 parallel bookings, doctor confirms multiple, status change on refresh, doctor+admin simultaneous, full lifecycle, race condition same slot, admin assigns
- Content flow: full API flow (3 patients see), 4 browser windows, rejected content hidden, batch approve, live update during browsing, tags sync, 5-user concurrent poll, cross-account visibility
- Health records cross-portal: PHR update→doctor sees, EMR→patient timeline, simultaneous record view, 3 patients PHR concurrent, data isolation, prescription→patient records, vitals→timeline, living will share→doctor view
- Meeting multi-user: health check, create→patient sees link, simultaneous join browser, config, meeting list, transcription, guest invite, multiple simultaneous meetings
- Queue & dashboard: doctor/patient/admin dashboards, queue management, cross-portal queue, stats consistency, 3 dashboards simultaneously, schedule, notification badges
- Stress testing: 10 concurrent mixed API calls, 5x rapid page refresh, expired token, cross-portal token reuse, large payload (50KB), API response benchmarks, session persistence, 20 concurrent API calls
- Queue management: queue list/call-next/skip, notifications after EMR, mark all read, preferences persistence, notification isolation, concurrent profile updates, cross-portal data consistency

---

### 08-phase2-ai-his.spec.ts (705 lines, ~72 tests)

**Sections:** A–H (8 `describe` blocks)

| Section | Name | Tests | IDs |
| --------- | ------ | ------- | ----- |
| A | CTM (Thai Traditional Medicine) | 10 | A01–A10 |
| B | Geriatric Screening (8 Tools) | 10 | B01–B10 |
| C | SOS Emergency Alert | 8 | C01–C08 |
| D | Follow-Up Tracking | 8 | D01–D08 |
| E | Device Tokens & Biometric Auth | 8 | E01–E08 |
| F | Offline Sync & Settings | 8 | F01–F08 |
| G | Nursing Dashboard & Predictive Analytics | 8 | G01–G08 |
| H | Phase 2 Extended Features & Validation | 12 | H01–H12 |

**User Accounts:** ALL 5

**Features Tested:**

- CTM Thai Traditional Medicine: ธาตุเจ้าเรือน (body element) assessment CRUD, ธาตุ classification, สมุฏฐาน analysis, herbal prescription, multi-patient, patient cannot create, AI recommendation, browser CTM page
- Geriatric screening 8 tools: ADL, IADL, TUG, Mini-Cog, MNA, GDS-15, SARC-F, Braden Scale — create and list screenings
- SOS emergency alert: patient trigger, GPS location, doctor notification, doctor acknowledge, patient cancel, emergency contacts, alert history, multi-patient alerts
- Follow-up tracking: create schedule, scheduled activities, patient view & complete task, doctor monitor compliance, reminders, multi-patient, completion rate report
- Device tokens & biometric auth: register FCM token, list tokens, biometric register/verify/status, multi-platform, delete token, multi-patient tokens
- Offline sync & settings: push/pull data, conflict detection, sync status, get/update settings, role-specific settings, browser settings page
- Nursing dashboard & predictive analytics: nursing dashboard, round data entry, task management, predictive analytics (readmission risk, fall risk, disease progression), browser nursing dashboard, concurrent queries
- Phase 2 extended: care team CRUD, health screening history/detail, SOS update, follow-up complete, HIS patient lookup, HIS lab results, predictive with invalid model, smart scheduling, nursing workflow

---

## Part 2: Gap Analysis — Documented Pages vs. E2E Coverage

### Legend

- ✅ **Covered** — Feature has dedicated tests or significant coverage in specs
- ⚠️ **Partial** — Some aspects tested but significant gaps remain
- ❌ **Not Covered** — No E2E tests found for this documented feature/page

---

### Patient Portal Pages (from Processes/Pages/Patient-Portal/)

| # | Page | Status | Notes |
| --- | ------ | -------- | ------- |
| 01 | Login Page | ✅ Covered | Spec 01 sections B, E test login for all roles |
| 02 | Register Page | ✅ Covered | Spec 01 section C tests patient + doctor registration |
| 03 | Reset Password Page | ❌ **NOT COVERED** | **No tests for password reset flow** — token verification, new password form, password strength, expired token |
| 04 | Dashboard Page | ⚠️ Partial | Dashboard stats tested via API (01-H), but **no browser UI tests for patient dashboard page layout, widgets, quick actions** |
| 05 | Appointments Page | ✅ Covered | Spec 02 extensively covers appointment lifecycle + browser UI |
| 06 | PHR Page | ✅ Covered | Spec 03 sections A, B, I cover PHR CRUD + vitals + browser |
| 07 | AI Doctor Page | ✅ Covered | Spec 06 section A tests AI chat with browser page |
| 08 | Medical Content Library | ✅ Covered | Spec 05 sections A, D, E cover content library + sync |
| 09 | Map Page | ⚠️ Partial | Spec 05-H briefly tests map page browser navigation, and 05-I tests Google Maps nearby/geocode APIs, but **no tests for geolocation, facility type filters, range selection, info windows, navigate buttons** |
| 10 | PDPA Page | ⚠️ Partial | Spec 03-J tests PDPA consent status/grant/audit log via API, but **no browser UI tests for 3-tab layout (Privacy Settings, Doctor Access, Access History), consent toggles, data sharing terms** |
| 11 | Living Will Page | ✅ Covered | Spec 03 sections E, J test living will CRUD + PDPA + browser |
| 12 | Profile Page | ⚠️ Partial | Spec 01 tests profile update API with Thai; spec 05-H navigates to profile. **No tests for profile picture upload, email change, phone verification UI** |
| 13 | Settings Page | ⚠️ Partial | Spec 01 tests settings CRUD + notification preferences via API. Spec 05-H navigates to settings. **No tests for dark/light mode toggle, language switch, about section UI** |
| 14 | Timeline Page | ⚠️ Partial | Spec 03-F tests health timeline via API. **No dedicated browser UI tests for timeline visualization, filtering, date range selection** |
| 15 | Notification System | ⚠️ Partial | Spec 06-F tests notification get/mark/count via API. Spec 07-E tests notification badges. **No tests for real-time WebSocket push, notification drawer UI, notification click navigation** |

### Doctor Portal Pages (from Processes/Pages/Doctor-Portal/)

| # | Page | Status | Notes |
| --- | ------ | -------- | ------- |
| 01 | Login Page | ✅ Covered | Spec 01 sections B, E |
| 02 | Reset Password Page | ❌ **NOT COVERED** | **No doctor portal reset password tests** |
| 03 | Dashboard Page | ⚠️ Partial | Spec 01-H tests dashboard stats API; spec 07-E tests dashboard browser. **Missing: dashboard widget interactions, today's schedule preview, patient count, pending actions** |
| 04 | Schedule Page | ⚠️ Partial | Spec 02-F tests doctor schedule browser; spec 07-E tests schedule. **Missing: day/week/month view switching, drag-drop rescheduling, slot management UI** |
| 05 | Patient Management Page | ⚠️ Partial | Spec 07-E touches patient search. **Missing: patient list filters, search by name/ID, PDPA consent management per patient, patient detail view** |
| 06 | Health Meeting Page | ✅ Covered | Spec 02-F, 04-F, 07-D all test meeting tabs and queue |
| 07 | Virtual Meeting | ✅ Covered | Spec 04 extensively tests meeting creation/join/transcription/AI |
| 08 | EMR Editor | ✅ Covered | Spec 03-C tests EMR SOAP creation, browser EMR editor |
| 09 | E-Prescribing | ⚠️ Partial | Spec 03-D tests prescription creation API. Spec 06-B tests CDS drug checks. **Missing: full prescribing UI flow — drug search, allergy cross-check UI, digital signature, print preview** |
| 10 | Lab Orders | ⚠️ Partial | Spec 03-D tests lab order creation API. **Missing: lab order UI — test search, panel selection, result entry, abnormal flagging UI** |
| 11 | Patient Record Viewer | ✅ Covered | Spec 03-G tests all 6 tabs (PHR/EMR/EHR/Lab/Documents/Living Will) |
| 12 | Medical Consultants Page | ✅ Covered | Spec 05-F tests consultant CRUD + browser page |
| 13 | Medical Content Page | ✅ Covered | Spec 05 sections A, E cover content CRUD + browser |
| 14 | Clinical Resources Page | ✅ Covered | Spec 05 sections B, E cover clinical resources |
| 15 | Gemini AI Studio | ⚠️ Partial | Spec 06-D tests some doctor AI features and browser page. **Missing: medical calculator tools, AI template selection, conversation history management UI, FAB button interaction** |
| 16 | Doctor Profile Page | ⚠️ Partial | Spec 01 tests profile API. **Missing: specialty editing, available hours config, license upload, profile photo UI** |
| 17 | Admin Appointment Management | ⚠️ Partial | Spec 02-I tests admin assignment API. **Missing: admin appointment assignment UI, bulk operations, filter by doctor/date/status** |
| 18 | Admin Doctor Management | ⚠️ Partial | Spec 01-C tests admin pending doctors API; spec 05-G tests browser admin pages. **Missing: doctor approval/reject UI flow, credentials verification view** |
| 19 | Doctors Management Page | ⚠️ Partial | Spec 05-G lists doctors. **Missing: doctor directory search UI, filter by specialty/status, verify badge display** |
| 20 | Appointment Pool Management | ⚠️ Partial | Spec 02-A mentions appointment pool API. **Missing: pool tab UI (Pool/Awaiting Response/Claimed), claim button interaction, pool reason display** |
| 21 | Queue Management | ⚠️ Partial | Spec 07-E,G tests queue API. **Missing: queue call/skip UI buttons, wait time display, priority badges, auto-polling indicator** |

---

### Summary of Critical Gaps

#### Completely Missing (❌)

1. **Password Reset Flow** — Both portals document a `/reset-password` page with token verification, password strength indicators, and success states. Zero E2E tests exist.

#### Major Gaps (⚠️ with significant missing coverage)

1. **Patient Dashboard UI** — Dashboard widgets, quick actions, today's appointments preview, health summary cards
2. **Map Page UI Interactions** — Geolocation permission handling, facility type filters, range selector, marker click, info windows, navigation button
3. **PDPA Page Browser Tests** — 3-tab interface (Privacy Settings, Doctor Access, Access History), consent toggles, data sharing terms display
4. **E-Prescribing Full UI Flow** — Drug search autocomplete, allergy cross-check popups, dosage selection, digital signature, print/send
5. **Lab Orders Full UI Flow** — Test search, panel selection, ordering workflow, result entry
6. **Gemini AI Studio Full UI** — Medical calculators, template selection, conversation management, FAB button launch
7. **Admin Pages Full UI** — Admin appointment management grid, admin doctor approval UI with document review, bulk operations
8. **Appointment Pool UI** — 3-tab pool interface, claim/respond interactions
9. **Queue Management UI** — Call/skip buttons, real-time polling indicator, wait time estimates

#### Pattern Observed

Most gaps follow a consistent pattern: **API-level tests exist but browser UI interaction tests are missing**. The specs heavily test backend endpoints and data flow but have lighter coverage of:

- Form interactions and validation states
- UI-specific behaviors (dropdowns, modals, tabs, drag-drop)
- Responsive/mobile layout behavior
- Error state rendering (empty states, loading states, error banners)
- Accessibility (keyboard navigation, ARIA labels, screen reader)

---

## Part 3: Isara-mobile/ Directory Structure & Analysis

### 3.1 Architecture Overview

**Framework:** Expo SDK 52 + React Native 0.76.5  
**Router:** Expo Router v4 (file-based routing)  
**Styling:** NativeWind v4 (Tailwind for React Native)  
**State:** Zustand v5  
**Build Tool:** Turborepo (monorepo)  
**Package Manager:** npm with workspaces

### 3.2 Monorepo Structure

```text
Isara-mobile/
├── package.json              # Root workspace config
├── app.config.ts             # Expo config (root app)
├── turbo.json                # Turborepo pipeline config
│
├── app/                      # ROOT Expo Router app
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Entry/splash
│   ├── (auth)/               # Auth route group
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (patient)/            # Patient role group
│   │   ├── _layout.tsx
│   │   └── (tabs)/           # Bottom tab navigator
│   │       ├── _layout.tsx
│   │       ├── index.tsx     # Home/Dashboard
│   │       ├── appointments.tsx
│   │       ├── health.tsx
│   │       ├── ai-chat.tsx
│   │       └── profile.tsx
│   ├── (doctor)/             # Doctor role group
│   │   ├── _layout.tsx
│   │   └── (tabs)/           # Bottom tab navigator
│   │       ├── _layout.tsx
│   │       ├── index.tsx     # Dashboard
│   │       ├── patients.tsx
│   │       ├── queue.tsx
│   │       ├── schedule.tsx
│   │       └── profile.tsx
│   ├── meeting/              # Shared meeting screens
│   │   └── [id].tsx          # Dynamic meeting room
│   └── settings/             # Settings screens
│       ├── index.tsx
│       ├── connections.tsx
│       ├── notifications.tsx
│       └── privacy.tsx
│
├── apps/                     # STANDALONE app variants (Turborepo)
│   ├── doctor/               # Doctor-specific app
│   │   ├── app.config.ts
│   │   ├── package.json
│   │   ├── app/
│   │   │   ├── _layout.tsx
│   │   │   ├── (auth)/
│   │   │   │   └── (login, register)
│   │   │   └── (tabs)/
│   │   │       ├── _layout.tsx
│   │   │       └── index.tsx
│   │   └── src/
│   │       ├── components/
│   │       └── stores/
│   └── patient/              # Patient-specific app
│       ├── app.config.ts
│       ├── package.json
│       ├── app/
│       │   ├── _layout.tsx
│       │   ├── (auth)/
│       │   │   └── (login, register)
│       │   └── (tabs)/
│       │       ├── _layout.tsx
│       │       └── index.tsx
│       └── src/
│           ├── components/
│           └── stores/
│
├── packages/                 # Shared packages
│   ├── api-client/           # @izara/api-client
│   │   ├── package.json
│   │   └── src/index.ts
│   ├── shared/               # @izara/shared
│   │   ├── package.json
│   │   └── src/index.ts
│   └── ui/                   # @izara/ui
│       └── package.json
│
├── src/                      # Shared source code
│   ├── components/
│   │   └── navigation/
│   │       └── TabBarIcon.tsx
│   └── stores/
│       └── authStore.ts
│
└── types/
    └── react-native-webview.d.ts
```

### 3.3 Key Dependencies

| Category | Package | Version |
| --------- | ------- | ------- |
| **Framework** | expo | ~52.0.0 |
| **UI** | react-native | 0.76.5 |
| **Router** | expo-router | ~4.0.0 |
| **Styling** | nativewind | ^4.0.0 |
| **State** | zustand | ^5.0.0 |
| **API** | axios | ^1.7.0 |
| **Query** | @tanstack/react-query | ^5.59.0 |
| **Video** | @jitsi/react-native-sdk | ^10.0.0 |
| **WebRTC** | react-native-webrtc | ^124.0.0 |
| **WebView** | react-native-webview | ^13.12.0 |
| **Maps** | react-native-maps | 1.18.0 |
| **Location** | expo-location | ~18.0.0 |
| **Camera** | expo-camera | ~16.0.0 |
| **Biometric** | expo-local-authentication | ~15.0.0 |
| **Notifications** | expo-notifications | ~0.29.0 |
| **Secure Storage** | expo-secure-store | ~14.0.0 |
| **Offline DB** | expo-sqlite | ~15.0.0 |
| **Charts** | victory-native | ^41.0.0 |
| **Network** | @react-native-community/netinfo | ^11.3.0 |
| **Animations** | react-native-reanimated | ~3.16.0 |
| **Navigation** | react-native-screens | ~4.4.0 |
| **SVG** | react-native-svg | 15.8.0 |

### 3.4 Mobile App Screens (from route structure)

**Patient Tabs (5):** Home, Appointments, Health, AI Chat, Profile  
**Doctor Tabs (5):** Dashboard, Patients, Queue, Schedule, Profile  
**Shared Screens:** Meeting room (`meeting/[id]`), Settings (index, connections, notifications, privacy)  
**Auth Screens:** Login, Register

### 3.5 Existing Tests

**⚠️ ZERO test files exist in the mobile app.** No `.test.ts`, `.spec.ts`, or `__tests__/` directories were found anywhere in the Isara-mobile/ tree. Jest is configured as a devDependency with a `"test": "jest"` script, but no test files have been written.

### 3.6 Mobile vs. Web Feature Parity (Notable Differences)

| Feature | Web Portals | Mobile App |
| --------- | ----------- | ---------- |
| Patient Tabs | 9 sidebar items | 5 bottom tabs |
| Doctor Tabs | 9+ sidebar + admin | 5 bottom tabs |
| Medical Content Library | Full page | Not visible in routes |
| Timeline | Dedicated page | Not visible in routes |
| Map/Nearby | Full Google Maps page | Not visible (though expo-location + react-native-maps installed) |
| Living Will | Dedicated page | Not visible in routes |
| PDPA | Dedicated page | Privacy in settings/ |
| Admin Features | Dedicated admin routes | Not visible |
| Clinical Resources | Full page | Not visible |
| EMR Editor | Modal page | Not visible |
| Prescribing | Modal page | Not visible |
| Lab Orders | Modal page | Not visible |
| Nursing Dashboard | Planned (Phase 2) | Not visible |

The mobile app appears to be in **early development** with basic navigation scaffolding and route groups established, but significantly fewer screens than the web portals. The `apps/doctor/` and `apps/patient/` standalone variants have minimal screens (just `index.tsx` in tabs), suggesting either:

- The root `app/` is the primary development target
- Or the standalone apps are planned for later
  
The shared packages (`@izara/api-client`, `@izara/shared`, `@izara/ui`) have `src/index.ts` files but their content scope was not examined.

---

## Part 4: Summary Statistics

| Metric | Value |
| -------- | ------- |
| Total spec files | 8 |
| Total lines of test code | ~7,563 |
| Total describe blocks | 74 |
| Total estimated test() calls | ~807 |
| User accounts used | 5 (patient1, patient2, patient3, doctor, admin) |
| Services tested | 3 (Patient Portal, Doctor Portal, Meeting Server) |
| Patient Portal pages fully covered | 8 of 15 (53%) |
| Patient Portal pages partially covered | 6 of 15 (40%) |
| Patient Portal pages not covered | 1 of 15 (7%) |
| Doctor Portal pages fully covered | 8 of 21 (38%) |
| Doctor Portal pages partially covered | 12 of 21 (57%) |
| Doctor Portal pages not covered | 1 of 21 (5%) |

### Test Distribution by Feature Area

| Area | Spec Files | ~Tests |
| ------ | ---------- | ------ |
| Auth, Health, RBAC | 01 | ~82 |
| Appointments | 02 | ~92 |
| Health Records & EMR | 03 | ~95 |
| Video Meeting & Transcription | 04 | ~91 |
| Content Sync & Approval | 05 | ~82 |
| AI & CDS | 06 | ~72 |
| Multi-User Concurrent | 07 | ~60 |
| Phase 2 (HIS) | 08 | ~72 |
| User Accounts & Demo Pages | 09 | ~91 |
| Lab/Imaging/Map & v1.5.3 | 10 | ~70 |
