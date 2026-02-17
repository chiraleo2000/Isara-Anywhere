# 📱 Izara Dr. Anywhere — Unified App Screen Specifications

**Version:** 2.1.0  
**Date:** February 2026  
**Framework:** React Native (Expo Router v4)  
**App Type:** Single Unified App — Patient & Doctor  

> ⚠️ **This replaces** the separate Patient_Mobile_Pages.md and Doctor_Mobile_Pages.md specs.  
> The app is ONE app with role-based routing.

---

## 1. Unified Navigation Structure

```
app/
├── _layout.tsx                        — Root (providers, theme, role context)
├── index.tsx                          — Entry point (role-based redirect)
├── role-select.tsx                    — Role selection screen
├── about.tsx                          — App info
│
├── (patient)/                         — Patient route group
│   ├── _layout.tsx                    — Patient auth guard
│   ├── (auth)/
│   │   ├── login.tsx                  — P01: Patient Login
│   │   ├── register.tsx               — P02: Registration (3-step)
│   │   ├── forgot-password.tsx        — P03: Password Reset
│   │   ├── otp-verify.tsx             — P04: OTP Verification
│   │   ├── pdpa-consent.tsx           — P05: PDPA Consent (required)
│   │   └── onboarding.tsx             — P06: Onboarding Walkthrough
│   │
│   ├── (tabs)/
│   │   ├── index.tsx                  — P07: Dashboard / Home
│   │   ├── appointments/
│   │   │   ├── index.tsx              — P08: Appointment List
│   │   │   ├── book.tsx               — P09: Book Appointment (5-step wizard)
│   │   │   └── [id].tsx               — P10: Appointment Detail
│   │   ├── health/
│   │   │   ├── index.tsx              — P11: Health Overview (PHR)
│   │   │   ├── vitals.tsx             — P12: Vital Signs + Charts
│   │   │   ├── medications.tsx        — P13: Medications + Reminders
│   │   │   ├── allergies.tsx          — P14: Allergies
│   │   │   ├── timeline.tsx           — P15: Treatment Timeline
│   │   │   ├── health-logs.tsx        — P16: Health Logs (EMR/Lab/Rx)
│   │   │   ├── living-will.tsx        — P17: Living Will (4-step wizard)
│   │   │   ├── devices.tsx            — P18: Connected Wearables
│   │   │   └── scanner.tsx            — P19: Document Scanner (OCR)
│   │   ├── ai/
│   │   │   ├── index.tsx              — P20: AI Chat (Gemini)
│   │   │   ├── symptom-checker.tsx    — P21: Symptom Checker
│   │   │   └── risk-assessment.tsx    — P22: Health Risk Assessment
│   │   └── profile/
│   │       ├── index.tsx              — P23: Profile Overview + Menu
│   │       ├── edit.tsx               — P24: Edit Profile
│   │       ├── settings.tsx           — P25: App Settings
│   │       ├── notifications.tsx      — P26: Notification Preferences
│   │       ├── payments.tsx           — P27: Payment History + Methods
│   │       ├── privacy.tsx            — P28: PDPA / Privacy Management
│   │       ├── api-connections.tsx    — P29: API Connection Manager
│   │       └── language.tsx           — P30: Language & Theme
│   │
│   ├── meeting/
│   │   ├── [meetingId].tsx            — P31: Video Meeting (Participant)
│   │   ├── [meetingId]/feedback.tsx   — P32: Post-Meeting Feedback
│   │   └── invite/[token].tsx         — P33: Guest Join via Link
│   │
│   ├── map.tsx                        — P34: Nearby Healthcare Map
│   ├── health-library.tsx             — P35: Health Content Library
│   ├── notifications.tsx              — P36: Notification Center
│   └── content/[id].tsx               — P37: Article Detail
│
├── (doctor)/                          — Doctor route group
│   ├── _layout.tsx                    — Doctor auth guard + 2FA check
│   ├── (auth)/
│   │   ├── login.tsx                  — D01: Doctor Login
│   │   ├── two-factor.tsx             — D02: 2FA OTP Verification
│   │   └── forgot-password.tsx        — D03: Password Reset
│   │
│   ├── (tabs)/
│   │   ├── index.tsx                  — D04: Doctor Dashboard
│   │   ├── schedule/
│   │   │   ├── index.tsx              — D05: Schedule (Day/Week/Month)
│   │   │   ├── pending.tsx            — D06: Pending Confirmations
│   │   │   ├── pool.tsx               — D07: Appointment Pool (Claim)
│   │   │   └── [id].tsx               — D08: Appointment Detail + Actions
│   │   ├── patients/
│   │   │   ├── index.tsx              — D09: Patient List + Search
│   │   │   └── [patientId]/
│   │   │       ├── index.tsx          — D10: Patient Detail
│   │   │       ├── phr.tsx            — D11: Patient PHR Viewer
│   │   │       ├── emr.tsx            — D12: EMR History
│   │   │       ├── emr/new.tsx        — D13: Create EMR (SOAP + AI)
│   │   │       ├── emr/[emrId].tsx    — D14: View/Edit EMR
│   │   │       ├── prescriptions.tsx  — D15: E-Prescribing
│   │   │       ├── lab-orders.tsx     — D16: Lab & Imaging Orders
│   │   │       └── living-will.tsx    — D17: Patient Living Will Viewer
│   │   ├── queue/
│   │   │   ├── index.tsx              — D18: Queue Management
│   │   │   └── walk-in.tsx            — D19: Walk-in Registration
│   │   └── profile/
│   │       ├── index.tsx              — D20: Doctor Profile + Menu
│   │       ├── edit.tsx               — D21: Edit Profile
│   │       ├── settings.tsx           — D22: App Settings
│   │       ├── notifications.tsx      — D23: Notification Settings
│   │       ├── api-connections.tsx    — D24: API Connection Manager
│   │       └── language.tsx           — D25: Language & Theme
│   │
│   ├── meeting/
│   │   ├── [meetingId].tsx            — D26: Video Meeting (HOST)
│   │   └── [meetingId]/emr.tsx        — D27: Post-Meeting EMR Creation
│   │
│   ├── ai/
│   │   ├── studio.tsx                 — D28: Gemini AI Studio
│   │   └── calculators.tsx            — D29: Medical Calculators
│   │
│   ├── content/
│   │   ├── library.tsx                — D30: Clinical Resources
│   │   ├── medical-content.tsx        — D31: Health Education Content
│   │   ├── consultants.tsx            — D32: Medical Consultants
│   │   └── [id].tsx                   — D33: Content Detail / Edit
│   │
│   ├── admin/
│   │   ├── stats.tsx                  — D34: System Statistics
│   │   ├── doctors.tsx                — D35: Doctor Management
│   │   ├── appointments.tsx           — D36: Appointment Management
│   │   └── doctors-directory.tsx      — D37: Doctors Directory
│   │
│   └── notifications.tsx              — D38: Notification Center
│
└── +not-found.tsx                     — 404 Fallback
```

**Total Screens:** 37 Patient + 38 Doctor + 2 Shared (Role Select, About) = **77 screens**

---

## 2. Shared Screens

### S01: Role Selection — `role-select.tsx`

| Property | Value |
|----------|-------|
| **When Shown** | First launch, or via Settings "Switch Role" |
| **Components** | App logo, 2 role cards (Patient / Doctor), Continue button |
| **Patient Card** | Icon: 🧑, Title: "ผู้ป่วย / Patient", Subtitle: description of patient features |
| **Doctor Card** | Icon: 👨‍⚕️, Title: "แพทย์ / Doctor", Subtitle: description of doctor features |
| **Actions** | Select role → store in MMKV → navigate to auth or home |
| **State** | Selected role (MMKV persistent), animation state |
| **Note** | Subtitle: "คุณสามารถเปลี่ยนบทบาทได้ทุกเมื่อในหน้า Settings" |

### S02: App Entry — `index.tsx`

| Property | Value |
|----------|-------|
| **Logic** | Check MMKV `active_role` → redirect to appropriate flow |
| **No role** | → `role-select` |
| **Patient + valid token** | → `(patient)/(tabs)/` |
| **Patient + expired token** | → `(patient)/(auth)/login` |
| **Doctor + valid token** | → `(doctor)/(tabs)/` |
| **Doctor + expired token** | → `(doctor)/(auth)/login` |

---

## 3. Patient Screens (P01–P37)

### P01: Patient Login — `(patient)/(auth)/login`

| Property | Value |
|----------|-------|
| **API** | `POST /api/auth/login` (Patient API :3005) |
| **Components** | Logo, Email input, Password input, Login button, Biometric button (if enrolled), Social login (Google/LINE), Forgot password link, Register link, "Switch to Doctor" link |
| **State** | email, password, loading, error, biometricAvailable |
| **Validation** | Email format, password min 8 chars |
| **Flow** | Login → JWT → Store in SecureStore → Check onboarding → Home |
| **Biometric** | Show FaceID/Fingerprint button if enrolled → verify → JWT |
| **Error States** | Invalid credentials, account locked, network error, server error |
| **Thai Text** | Title: "เข้าสู่ระบบ", Button: "เข้าสู่ระบบ" |
| **Switch Role** | Bottom text: "เป็นแพทย์? เข้าสู่ระบบสำหรับแพทย์" → switch to doctor mode |

### P02: Registration — `(patient)/(auth)/register`

| Property | Value |
|----------|-------|
| **API** | `POST /api/auth/register` |
| **Components** | Step wizard (3 steps) with progress indicator |
| **Step 1** | First name (TH), Last name (TH), Email, Password, Confirm password, Phone, Date of Birth |
| **Step 2** | Blood type, Known conditions (multi-select), Current medications (text), Emergency contact |
| **Step 3** | PDPA consent (2 required + 3 optional checkboxes) — see [14_Mobile_PDPA_Privacy.md](../14_Mobile_PDPA_Privacy.md) |
| **Validation** | Email unique check (debounced), password strength meter, all required fields |
| **Flow** | Submit → Auto-login → Onboarding |

### P05: PDPA Consent — `(patient)/(auth)/pdpa-consent`

| Property | Value |
|----------|-------|
| **API** | `POST /api/pdpa/consent` |
| **When** | First login if consent not given, or when consent version changes |
| **Required Consents** | ☑ Personal data collection, ☑ Health data collection (sensitive) |
| **Optional Consents** | ☐ Doctor access to health data, ☐ AI analysis, ☐ Marketing |
| **Actions** | Accept (required ticked) → proceed, Reject required → cannot use app |
| **Full Policy** | Link to full privacy policy text (in-app WebView) |
| **Thai Text** | Title: "นโยบายความเป็นส่วนตัว" |

### P07: Patient Dashboard — `(patient)/(tabs)/index`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/auth/me`, `GET /api/appointments/my`, `GET /api/phr/:id/vitals`, `GET /api/notifications/` |
| **Layout** | ScrollView with sections |
| **Sections** | 1. Greeting + Avatar 2. Quick Actions (4 icons) 3. Upcoming Appointment card 4. Today's Vitals snapshot 5. Medication Reminders 6. AI Health Score card 7. Health Tips carousel |
| **Quick Actions** | 📅 นัดหมาย (Book), 💬 AI Chat, 🗺️ แผนที่ (Map), 📚 ห้องสมุด (Library) |
| **Offline** | All sections show cached data, "Offline" banner at top |
| **Pull to Refresh** | Yes — refetch all sections |

### P09: Book Appointment — `(patient)/(tabs)/appointments/book`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/ai/symptom-checker`, `GET /api/doctors/`, `GET /api/doctors/:id/slots`, `POST /api/appointments/`, `POST /api/payments/create-intent` |
| **Flow** | 5-step wizard |
| **Step 1: Symptoms** | Text input, 🎤 Voice input (STT), 📷 Photo upload, AI analyzes → suggests specialty |
| **Step 2: Doctor** | Doctor cards filtered by AI-suggested specialty. Show: photo, name, specialty, rating, next available. Sort by rating/availability. |
| **Step 3: Date/Time** | Calendar (react-native-calendars), available time slots grid. Gray = unavailable. |
| **Step 4: Review** | Summary: doctor, date, time, symptoms, cost. Select payment: Card, PromptPay, Apple Pay, Google Pay, or Free. |
| **Step 5: Confirm** | Process payment → Booking confirmed → Add to calendar → Push reminders (24h, 1h, 15m) |
| **Error** | Payment failure → retry. Slot taken → back to step 3. |

### P12: Vital Signs — `(patient)/(tabs)/health/vitals`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/phr/:id/vitals`, `POST /api/phr/:id/vitals` |
| **Components** | Vital type selector (tabs: BP, HR, SpO₂, Temp, Weight, Glucose), Chart (7d/30d/90d toggles), History list, Add button |
| **Chart** | Victory Native line chart with normal range shading. Red dots for abnormal values. |
| **Add Vital** | Bottom sheet: select type, enter value(s), select source (manual/wearable), save |
| **Wearable Badge** | "⌚ From Apple Watch" / "⌚ From Google Fit" for auto-synced entries |
| **Offline** | View cached charts, record vitals locally → sync queue |
| **Alerts** | If vital outside normal range → show warning + suggest booking appointment |

### P17: Living Will — `(patient)/(tabs)/health/living-will`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/living-will`, `POST /api/living-will`, `PUT /api/living-will` |
| **Components** | 4-step wizard or view existing |
| **Step 1** | Personal information + legal identity confirmation |
| **Step 2** | Medical directives: resuscitation, ventilator, tube feeding, pain management |
| **Step 3** | Healthcare proxy designation: name, relationship, contact |
| **Step 4** | Review + digital signature (on-screen drawing) |
| **After Create** | Stored encrypted. Shared with authorized doctors per PDPA consent. |
| **View Mode** | Read existing living will. Edit button. PDF download. |
| **Thai Text** | Title: "พินัยกรรมชีวิต / Living Will" |

### P20: AI Chat — `(patient)/(tabs)/ai/index`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/ai/chat`, `GET /api/ai/chat/history`, `POST /api/ai/chat/clear` |
| **Components** | Chat bubble list (FlatList), text input bar, voice button, camera button |
| **Input Modes** | ⌨️ Text typing, 🎤 Voice (hold-to-record → STT → send), 📷 Photo (camera → AI visual analysis) |
| **Message Types** | Text bubble, AI suggestion cards, quick reply chips, doctor recommendation card, booking CTA |
| **AI Model** | Gemini 2.5 Flash via backend |
| **Language** | Thai primary, English supported. Auto-detect. |
| **Safety** | Every AI response shows: "⚠️ ไม่ใช่คำวินิจฉัยทางการแพทย์ กรุณาปรึกษาแพทย์" |
| **Context** | AI has access to PHR data (if PDPA consented) for personalized responses |
| **Offline** | Show cached FAQ, "AI ต้องการอินเทอร์เน็ต" for new queries |

### P28: PDPA Privacy — `(patient)/(tabs)/profile/privacy`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/pdpa/consent`, `PUT /api/pdpa/consent`, `GET /api/pdpa/audit-log`, `GET /api/pdpa/access-list`, `POST /api/pdpa/export-request`, `DELETE /api/users/me` |
| **Tabs** | 3 tabs: Consent | Doctor Access | Audit Log |
| **Consent Tab** | Toggle switches for each consent category. Required consents locked ON. |
| **Doctor Access** | List of doctors with access. Grant/revoke toggle. Request history. |
| **Audit Log** | Scrollable list: who accessed what data when. Filterable by date. |
| **Data Actions** | Export button (PDF/JSON) → request → push when ready. Delete Account button → confirmation + 30-day grace. |
| **See** | [14_Mobile_PDPA_Privacy.md](../14_Mobile_PDPA_Privacy.md) for full spec |

### P29: API Connections — `(patient)/(tabs)/profile/api-connections`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/connections`, `POST /api/connections`, `DELETE /api/connections/:id`, `POST /api/connections/:id/test` |
| **Sections** | Core (auto-managed), Health & Wearables, Payment Methods, External Medical Services |
| **Each Service** | Status icon (✅⬜⚠️❌), name, last sync time, [Connect]/[Manage]/[Remove] |
| **Add Flow** | Tap "Connect" → OAuth or API key input → validate → store SecureStore → show ✅ |
| **See** | [12_Multi_API_Token_Management.md](../12_Multi_API_Token_Management.md) for full spec |

### P31: Video Meeting (Patient) — `(patient)/meeting/[meetingId]`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/video-meeting/:appointmentId`, `POST /api/video-meeting/:appointmentId/join` |
| **Pre-Join** | Camera preview, mic test, doctor info, appointment summary, recording consent dialog |
| **Meeting** | JitsiMeetingView (full screen), controls bar at bottom |
| **Controls** | 🎤 Mute, 📷 Camera, 💬 Chat, 📱 PiP, 🔊 Speaker, 📞 End call |
| **PiP** | Auto-enter when home button pressed. Resume by tapping PiP window. |
| **Connection** | Quality indicator (🟢excellent / 🟡fair / 🔴poor), auto-reconnect |
| **End** | Leave meeting → feedback form (P32) |

### P34: Nearby Map — `(patient)/map`

| Property | Value |
|----------|-------|
| **API** | `GET /api/google/maps/nearby` |
| **Components** | MapView (react-native-maps), markers, bottom sheet with list |
| **Permissions** | `expo-location` - request "While Using" permission |
| **Markers** | 🏥 Hospitals (red), 🩺 Clinics (blue), 💊 Pharmacies (green) |
| **Filter** | Toggle by type above map |
| **Bottom Sheet** | Draggable list of facilities sorted by distance. Each: name, address, distance, rating, phone. |
| **Actions** | Tap card → show on map + info callout. "Directions" → open native maps app. "Call" → phone dialer. |
| **Offline** | Show cached last-viewed map region. No search capability. |

### P35: Health Library — `(patient)/health-library`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/content/articles`, `GET /api/content/categories` |
| **Components** | Search bar, category chips, article cards (image + title + date + views) |
| **Sort** | Latest, Most viewed, Bookmarked |
| **Bookmark** | 🔖 icon → save for offline reading (SQLite + download images) |
| **Share** | ↗️ icon → native share sheet |
| **Offline** | Show bookmarked articles only |
| **See** | [13_Mobile_Content_Library_Workflows.md](../13_Mobile_Content_Library_Workflows.md) |

---

## 4. Doctor Screens (D01–D38)

### D01: Doctor Login — `(doctor)/(auth)/login`

| Property | Value |
|----------|-------|
| **API** | `POST /auth/login` (Doctor Auth :3011) |
| **Components** | Logo (doctor variant), Email input, Password input, Login button, Biometric button, "Switch to Patient" link |
| **Security** | Rate-limited: 10 attempts / 15 min, IP tracking, mandatory 2FA |
| **Flow** | Login → 2FA OTP screen (D02) → Dashboard |
| **Biometric** | If enrolled: skip 2FA → direct to Dashboard |
| **Thai Text** | Title: "เข้าสู่ระบบสำหรับแพทย์" |
| **Switch Role** | "เป็นผู้ป่วย? เข้าสู่ระบบสำหรับผู้ป่วย" → switch to patient mode |

### D02: 2FA Verification — `(doctor)/(auth)/two-factor`

| Property | Value |
|----------|-------|
| **API** | `POST /auth/verify-2fa` (Doctor Auth :3011) |
| **Components** | OTP code input (6 digits), Resend button, Timer |
| **Methods** | SMS OTP or Email OTP (user preference) |
| **Timer** | 60-second countdown before resend enabled |
| **Flow** | Enter OTP → verify → Store JWT → Dashboard |
| **Biometric Enrollment** | After first successful 2FA: prompt to enroll biometric for future logins |

### D04: Doctor Dashboard — `(doctor)/(tabs)/index`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/dashboard/:doctorId`, `GET /api/queue/doctor/:doctorId`, `GET /api/appointments/doctor/:doctorId` |
| **Layout Phone** | ScrollView with stat cards + sections |
| **Layout Tablet** | 3-column: Queue | Next Patient | Stats (see [16_Unified_App_Role_Selection.md](../16_Unified_App_Role_Selection.md)) |
| **Stats Cards** | Today's appointments, Patients in queue, Pending confirmations, Completed today |
| **Quick Actions** | 📅 ดูตาราง, 📋 คิวคนไข้, 🔔 รอยืนยัน, 📹 เริ่มประชุม |
| **Upcoming** | Next 3 appointments with patient name, symptoms, countdown |
| **AI Pre-consult** | If next patient has PHR: AI summary preview card |
| **Pull to Refresh** | Yes |
| **Offline** | Cached stats, no real-time queue updates |

### D05: Schedule — `(doctor)/(tabs)/schedule/index`

| Property | Value |
|----------|-------|
| **API** | `GET /api/appointments/doctor/:doctorId` |
| **Components** | Calendar header (Day/Week/Month switcher), appointment list/grid |
| **Day View** | Vertical timeline with appointment blocks (colored by status) |
| **Week View** | 7-column grid with colored blocks |
| **Month View** | Calendar with dot indicators for appointment days |
| **Card Info** | Patient name, time, symptoms summary, status badge |
| **Actions** | Tap card → D08 detail. Long press → quick actions (confirm/start meeting). |
| **Color** | ⚪ Free, 🟡 Pending, 🟢 Confirmed, 🔵 In Progress, ✅ Completed, 🔴 Cancelled |

### D06: Pending Confirmations — `(doctor)/(tabs)/schedule/pending`

| Property | Value |
|----------|-------|
| **API** | `GET /api/appointments/pending/:doctorId` |
| **Components** | Pending appointment cards with large CTA buttons |
| **Card Info** | Patient avatar + name, AI symptom analysis preview, requested date/time, symptoms text |
| **Actions** | ✅ Confirm → `POST /api/appointments/:id/confirm` → push to patient. ❌ Decline → reason input → `POST /api/appointments/:id/decline` → push to patient. 👤 View Patient → D10 |
| **Badge** | Count shown on tab bar icon |

### D07: Appointment Pool — `(doctor)/(tabs)/schedule/pool`

| Property | Value |
|----------|-------|
| **API** | `GET /api/appointments/pool`, `POST /api/appointments/:id/claim` |
| **Components** | List of unassigned appointments matching doctor's specialty |
| **Card Info** | Patient name (anonymized), symptoms, preferred date/time, urgency level |
| **Actions** | [Claim] → assigns appointment to this doctor → notification to patient |
| **Filter** | By specialty, by date range, by urgency |
| **Empty State** | "ไม่มีนัดหมายรอรับ" — No appointments in pool |

### D09: Patient List — `(doctor)/(tabs)/patients/index`

| Property | Value |
|----------|-------|
| **API** | `GET /api/patients` |
| **Components** | Search bar (name, ID, email, phone), patient cards, filter/sort |
| **Filter** | All, Recent (last 7 days), Today's appointments, By condition |
| **Sort** | Name A-Z, Last visit, Appointment date |
| **Card Info** | Avatar, full name, age, last visit date, conditions list (pills), PDPA consent status |
| **Actions** | Tap → D10 Patient Detail |
| **PDPA Badge** | 🟢 Consented, 🔴 Not consented (limited data viewable) |

### D10: Patient Detail — `(doctor)/(tabs)/patients/[patientId]/index`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/patients/:patientId`, `GET /api/ai/pre-summary/:patientId`, `GET /api/patients/:patientId/pdpa-status` |
| **Layout** | Header (avatar, name, demographics) + tab bar (Overview, PHR, EMR, Rx, Labs) |
| **PDPA Check** | First check consent → if not granted, show limited view with "Request Access" button |
| **Overview** | Demographics, active conditions, ⚠️ allergies (RED prominent), current meds, AI summary |
| **AI Pre-consult** | AI summary card: risk factors, key history, suggested questions for consultation |
| **Quick Actions** | 📝 Create EMR, 📹 Start Meeting, 💊 Prescribe, 🧪 Order Labs |
| **Alert Banner** | Drug allergies shown in RED banner at top |

### D13: Create EMR — `(doctor)/(tabs)/patients/[patientId]/emr/new`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/emr`, `POST /api/emr/:id/sign`, `POST /api/ai/cds`, `POST /api/ai/emr-summary`, `GET /api/icd10/search` |
| **Layout** | SOAP form with AI assistance panel |
| **Fields** | Chief Complaint (CC), History of Present Illness (HPI), Past Medical History (PMH), Physical Examination (BP, HR, Temp, RR, SpO₂, Weight, Height), Assessment (ICD-10 search autocomplete), Plan, Follow-up instructions |
| **AI Features** | 🤖 Auto-fill from meeting transcript (if post-meeting). AI-suggested ICD-10 codes. CDS alerts panel (drug interactions, contraindications, care gaps). |
| **ICD-10** | Thai + English searchable autocomplete. Multiple codes allowed. |
| **Templates** | Quick templates: General Visit, Follow-up, Chronic Disease, Emergency |
| **Voice Input** | 🎤 Dictation for any text field (Thai STT) |
| **Actions** | Save Draft (local + server), Sign & Submit (digital signature), Add Prescription (→ D15), Order Labs (→ D16) |
| **Validation** | Required: CC, Assessment (ICD-10), Plan. CDS alerts must be reviewed. |
| **After Sign** | Push to patient: "เวชระเบียนของคุณพร้อมดูแล้ว" |
| **Offline** | Save draft to SQLite → sync queue when online |

### D15: E-Prescribing — `(doctor)/(tabs)/patients/[patientId]/prescriptions`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/prescriptions`, `GET /api/drugs/search`, `POST /api/ai/cds/drug-interactions` |
| **Components** | Drug search bar, prescription item list, AI safety panel |
| **Drug Search** | Thai + English drug name autocomplete. Shows: generic name, brand, dose forms, route |
| **Per Item** | Drug name, Dose, Route, Frequency, Duration (days), Quantity, Patient instructions (Thai) |
| **AI Safety** | ⚠️ Allergy cross-check (from patient PHR), Drug-drug interactions, Contraindications, Dose validation |
| **Alert Levels** | 🔴 Critical (blocked unless overridden), 🟡 Warning (acknowledge required), 🟢 Info |
| **Actions** | Add drug (+), Remove drug (×), Submit prescription, Print/PDF |
| **After Submit** | Push to patient: "แพทย์สั่งยาให้คุณแล้ว" |

### D16: Lab Orders — `(doctor)/(tabs)/patients/[patientId]/lab-orders`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/lab-orders`, `GET /api/lab-tests/catalog`, `GET /api/patients/:id/lab-results` |
| **Components** | Test catalog search, selected tests list, existing results |
| **Order Flow** | Search test → Select → Add notes → Submit order |
| **Test Categories** | Hematology, Chemistry, Urinalysis, Microbiology, Imaging, Pathology |
| **Results View** | Value, unit, normal range, flag (H/L/C = High/Low/Critical), trend chart |
| **Critical Flag** | 🔴 values highlighted, push notification sent immediately |

### D18: Queue Management — `(doctor)/(tabs)/queue/index`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/queue/doctor/:doctorId`, `POST /api/queue/call-next`, `POST /api/queue/:id/skip`, `POST /api/queue/:id/complete` |
| **Layout** | Current patient header + queue list |
| **Header** | "กำลังตรวจ: คุณ[Name]" with timer (duration) or "ว่าง" (empty) |
| **Queue List** | Numbered cards: patient name, symptoms, wait time, status |
| **Status** | 🔵 Being seen, 🔴 Waiting, ✅ Completed, ⏭️ Skipped, ❌ No-show |
| **Actions** | [Call Next] → push to patient "ถึงคิวของคุณแล้ว", [Skip] → move to end, [Complete] → mark done → navigate to EMR |
| **Real-time** | Socket.IO updates for queue changes |
| **Walk-in** | Button → D19 quick registration form |

### D19: Walk-in Registration — `(doctor)/(tabs)/queue/walk-in`

| Property | Value |
|----------|-------|
| **API** | `POST /api/queue/walk-in` |
| **Components** | Quick form: patient name, phone, symptoms, urgency |
| **For Existing Patient** | Search by name/phone → auto-fill |
| **For New Patient** | Minimal info → add to queue → full registration later |
| **After Submit** | Patient added to today's queue |

### D26: Video Meeting HOST — `(doctor)/meeting/[meetingId]`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/video-meeting/create`, `POST /api/video-meeting/:appointmentId/end`, `POST /api/ai/cds/realtime`, Socket.IO |
| **Pre-Join** | Camera/mic test, patient info summary, consent dialog |
| **Meeting** | JitsiMeetingView (HOST mode), controls bar, side panels |
| **HOST Controls** | 🔇 Mute all, 👋 Admit from lobby, 🚫 Remove participant, 🔴 End for all, 📹 Toggle recording |
| **Side Panels** (swipe or tablet split): | |
| → Patient Info | PHR summary, allergies (⚠️), medications, risk flags |
| → AI Copilot | CDS alerts from live transcript, diagnosis suggestions, drug interaction warnings |
| → Transcription | Live Thai STT, editable transcript, downloadable |
| → Quick EMR | SOAP notepad during meeting |
| **End Meeting** | End → AI generates meeting summary → navigate to D27 (Post-Meeting EMR) |
| **CallKit/ConnectionService** | Incoming call UI when patient is waiting |
| **PiP** | Picture-in-Picture when backgrounded |

### D27: Post-Meeting EMR — `(doctor)/meeting/[meetingId]/emr`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/meetings/:id/summary`, `POST /api/emr`, `POST /api/ai/validate` |
| **Components** | AI-generated EMR draft + edit capability |
| **AI Pre-fill** | From meeting transcript: auto-fills CC, HPI, Assessment (suggested ICD-10), Plan |
| **Man-in-Loop** | ✅ Accept AI suggestion, ✏️ Edit, ❌ Reject & write manually |
| **Additional** | Add prescriptions (D15), Order labs (D16), Generate patient instructions |
| **Patient Instructions** | AI-generated Thai instructions → doctor reviews → sends to patient |
| **Flow** | Review AI draft → Edit → Sign → Prescribe → Labs → Instructions → Done |

### D28: AI Studio — `(doctor)/ai/studio`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/ai/chat` (doctor context), `GET /api/ai/chat/history` |
| **Components** | Chat interface similar to P20 but with medical context |
| **Capabilities** | Medical Q&A, Drug information lookup, Differential diagnosis assistance, Treatment protocol queries, Literature search |
| **Context Aware** | If accessed from patient view → chat pre-loaded with patient context |
| **Accessible Via** | Tab menu + FAB (floating action button) from any doctor screen |
| **Disclaimer** | "AI provides clinical decision support only. Clinical judgment remains with the physician." |

### D29: Medical Calculators — `(doctor)/ai/calculators`

| Property | Value |
|----------|-------|
| **Components** | Calculator grid, input forms, result cards |
| **Calculators** | BMI, BSA, eGFR (CKD-EPI), CHA₂DS₂-VASc, HAS-BLED, CURB-65, Wells Score (DVT/PE), HEART Score, SOFA Score, Child-Pugh, MELD, Corrected Calcium, Anion Gap |
| **Each Calculator** | Input fields → Calculate → Result with interpretation + color-coded risk |
| **Offline** | ✅ All calculators work offline (no network needed) |

### D30-D33: Content Management

See [13_Mobile_Content_Library_Workflows.md](../13_Mobile_Content_Library_Workflows.md) for full specifications of:
- D30: Clinical Resources (view/create guidelines)
- D31: Medical Content (create patient-facing articles)
- D32: Medical Consultants (specialist directory)
- D33: Content Detail / Edit

### D34-D37: Admin Screens

Only visible to doctors with `role = admin`.

### D34: System Statistics — `(doctor)/admin/stats`

| Property | Value |
|----------|-------|
| **API** | `GET /api/admin/stats` |
| **Cards** | Total patients, Total doctors, Today's appointments, Active meetings, Average wait time, Revenue |
| **Charts** | Appointments per day (7d/30d), Peak hours, Specialty distribution |
| **Refresh** | Pull to refresh, auto-refresh every 30s |

### D35: Doctor Management — `(doctor)/admin/doctors`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/admin/doctors`, `PUT /api/admin/doctors/:id/approve`, `PUT /api/admin/doctors/:id/reject`, `PUT /api/admin/doctors/:id/role` |
| **Components** | Doctor list with filters, detail view |
| **Filters** | All, Pending Approval, Active, Inactive |
| **Actions** | ✅ Approve (verify medical license), ❌ Reject (with reason), 🔄 Change role (doctor↔admin), ⏸️ Suspend |
| **Detail** | Name, email, specialty, license #, registration date, submitted documents |

### D36: Appointment Management — `(doctor)/admin/appointments`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/admin/appointments`, `POST /api/admin/appointments/:id/assign`, `POST /api/admin/appointments/:id/auto-assign` |
| **Components** | All appointments list, assign modal |
| **Actions** | AI auto-assign (by specialty match), manual assign (pick doctor), reject (with reason) |
| **Filters** | Status, date range, specialty, doctor |

### D38: Doctor Notification Center — `(doctor)/notifications`

| Property | Value |
|----------|-------|
| **API** | `GET /api/notifications/` |
| **Types** | 📅 New appointment request, 🔔 Patient queue update, 🧪 Lab results ready, 💊 Prescription filled, 📝 Content approval status, ⚙️ System alerts |
| **Actions** | Tap → deep link to relevant screen |
| **Filters** | All, Appointments, Queue, Lab, System |
| **Mark** | Mark read, mark all read, delete |

---

## 5. Tab Bar Configuration

### Patient Mode (5 Tabs)

| Tab | Icon | Label (TH) | Label (EN) | Badge |
|-----|------|-----------|-----------|-------|
| 1 | 🏠 | หน้าหลัก | Home | — |
| 2 | 📅 | นัดหมาย | Appointments | Upcoming count |
| 3 | 💊 | สุขภาพ | Health | — |
| 4 | 🤖 | AI | AI | — |
| 5 | 👤 | โปรไฟล์ | Profile | — |

### Doctor Mode (5 Tabs)

| Tab | Icon | Label (TH) | Label (EN) | Badge |
|-----|------|-----------|-----------|-------|
| 1 | 📊 | แดชบอร์ด | Dashboard | — |
| 2 | 📅 | ตาราง | Schedule | Pending count |
| 3 | 👥 | ผู้ป่วย | Patients | — |
| 4 | 🏥 | คิว | Queue | Queue count |
| 5 | 👤 | โปรไฟล์ | Profile | — |

### Role Visual Indicator

| Attribute | Patient Mode | Doctor Mode |
|-----------|:----------:|:----------:|
| Status bar | Green tint | Blue tint |
| Tab bar accent | #22C55E (green) | #3B82F6 (blue) |
| Header subtitle | "🟢 Patient Mode" | "🔵 Doctor Mode" |

---

## 6. Responsive Layout Matrix

| Screen Type | Phone Portrait | Phone Landscape | Tablet Portrait | Tablet Landscape |
|-------------|:-------------:|:--------------:|:--------------:|:---------------:|
| Dashboard | Single column | Single column | 2-column grid | 3-column grid |
| Lists (Appts, Patients) | Full width cards | Full width | Split: list + detail | Split: list + detail |
| Forms (EMR, Booking) | Full width | Full width | Centered 70% | Centered 60% |
| Video Meeting | Full screen | Full screen | Full + side panel | Full + side panel |
| Maps | Full screen | Full screen | Map + list side | Map + list side |
| Chat (AI) | Full width | Full width | Centered 70% | Split: chat + sidebar |

---

## 7. Deprecated Documents

The following separate page specs are **superseded** by this unified document:

| Old Document | Status |
|-------------|--------|
| `Pages/Patient-Mobile/Patient_Mobile_Pages.md` | ⚠️ Deprecated — use this document |
| `Pages/Doctor-Mobile/Doctor_Mobile_Pages.md` | ⚠️ Deprecated — use this document |

---

### End of Unified App Screen Specifications — February 2026
