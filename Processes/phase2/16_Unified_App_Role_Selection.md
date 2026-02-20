# 🔀 Unified App Role Selection System

**Version:** 1.0  
**Module:** Phase 2 — Mobile App  
**Status:** 📋 Planning  
**Related:** [11_Mobile_App_Description.md](11_Mobile_App_Description.md), [01_Mobile_App_Architecture.md](01_Mobile_App_Architecture.md)

---

## 1. Overview

The Izara Dr. Anywhere mobile app is a **single unified application** serving both patients and doctors. The app uses a **role selection system** that determines which authentication flow, navigation structure, API connections, and feature set are displayed to the user.

### 1.1 Key Decisions

| Decision | Choice | Rationale |
| ---------- | -------- | ----------- |
| Separate accounts or shared? | **Separate accounts** | Patient and Doctor have different registration flows, different backends, different data. A person can have both. |
| When is role selected? | **First launch + Settings** | User picks role on first launch. Can switch anytime via Settings. |
| Can one person be both? | **Yes** | A doctor can also be a patient. They log in with different credentials per role. |
| Persistent role? | **Yes** | Last used role remembered. App launches directly into that role's auth/home. |
| Is there an "admin" role? | **Sub-role of Doctor** | Admin features shown to doctors with `role=admin` flag. No separate selection. |

---

## 2. Role Selection Screen

### 2.1 First Launch Flow

```text
┌───────────────────────────────────────┐
│          App First Launch              │
│                                        │
│   ┌─────────────────────────────────┐  │
│   │                                 │  │
│   │     🏥 Izara Dr. Anywhere      │  │
│   │        อิซาร่า หมอทุกที่         │  │
│   │                                 │  │
│   │     [Logo / Animation]          │  │
│   │                                 │  │
│   │   เลือกบทบาทของคุณ              │  │
│   │   Choose your role              │  │
│   │                                 │  │
│   │  ┌─────────────────────────┐    │  │
│   │  │  🧑 ผู้ป่วย / Patient    │    │  │
│   │  │                         │    │  │
│   │  │  นัดหมายแพทย์ ดูแลสุขภาพ │    │  │
│   │  │  ปรึกษา AI ชำระเงิน     │    │  │
│   │  │                         │    │  │
│   │  │  Book appointments,     │    │  │
│   │  │  manage health records, │    │  │
│   │  │  consult AI, pay online │    │  │
│   │  └─────────────────────────┘    │  │
│   │                                 │  │
│   │  ┌─────────────────────────┐    │  │
│   │  │  👨‍⚕️ แพทย์ / Doctor       │    │  │
│   │  │                         │    │  │
│   │  │  จัดการนัดหมาย เขียน EMR │    │  │
│   │  │  วิดีโอคอล AI ช่วยวินิจฉัย│    │  │
│   │  │                         │    │  │
│   │  │  Manage appointments,   │    │  │
│   │  │  write EMR, video calls,│    │  │
│   │  │  AI-assisted diagnosis  │    │  │
│   │  └─────────────────────────┘    │  │
│   │                                 │  │
│   └─────────────────────────────────┘  │
│                                        │
│   ※ You can switch roles anytime       │
│     in Settings                        │
└───────────────────────────────────────┘
```

### 2.2 Subsequent Launches

```text
App Launch
    │
    ▼
Check MMKV: last_active_role
    │
    ├── role = 'patient' ──▶ Check patient auth tokens
    │                              │
    │                     ┌────────┴────────┐
    │                     ▼                 ▼
    │               Token Valid        Token Invalid
    │                     │                 │
    │                     ▼                 ▼
    │              Patient Home      Patient Login
    │
    ├── role = 'doctor' ───▶ Check doctor auth tokens
    │                              │
    │                     ┌────────┴────────┐
    │                     ▼                 ▼
    │               Token Valid        Token Invalid
    │                     │                 │
    │                     ▼                 ▼
    │              Doctor Home       Doctor Login
    │
    └── role = null ───────▶ Role Selection Screen
                                   (first launch)
```

---

## 3. App Structure with Role Selection

### 3.1 Expo Router File Structure

```text
app/
├── _layout.tsx                    ← Root layout (role provider, theme)
├── index.tsx                      ← Entry: redirect based on role
├── role-select.tsx                ← Role selection screen
├── about.tsx                      ← App info (shared)
│
├── (patient)/                     ← Patient mode (group)
│   ├── _layout.tsx                ← Patient layout + patient auth guard
│   ├── (auth)/                    ← Patient auth screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   ├── otp-verify.tsx
│   │   ├── pdpa-consent.tsx
│   │   └── onboarding.tsx
│   │
│   ├── (tabs)/                    ← Patient bottom tabs
│   │   ├── _layout.tsx            ← 5-tab TabBar
│   │   ├── index.tsx              ← 🏠 Dashboard
│   │   ├── appointments/          ← 📅 Appointments
│   │   │   ├── index.tsx
│   │   │   ├── book.tsx
│   │   │   └── [id].tsx
│   │   ├── health/                ← 💊 Health Records
│   │   │   ├── index.tsx
│   │   │   ├── vitals.tsx
│   │   │   ├── medications.tsx
│   │   │   ├── allergies.tsx
│   │   │   ├── timeline.tsx
│   │   │   ├── health-logs.tsx
│   │   │   ├── living-will.tsx
│   │   │   ├── devices.tsx
│   │   │   └── scanner.tsx
│   │   ├── ai/                    ← 🤖 AI
│   │   │   ├── index.tsx
│   │   │   ├── symptom-checker.tsx
│   │   │   └── risk-assessment.tsx
│   │   └── profile/               ← 👤 Profile
│   │       ├── index.tsx
│   │       ├── edit.tsx
│   │       ├── settings.tsx
│   │       ├── notifications.tsx
│   │       ├── payments.tsx
│   │       ├── privacy.tsx
│   │       ├── api-connections.tsx
│   │       └── language.tsx
│   │
│   ├── meeting/                   ← Video meeting (full-screen)
│   │   ├── [meetingId].tsx
│   │   ├── [meetingId]/feedback.tsx
│   │   └── invite/[token].tsx
│   │
│   ├── map.tsx                    ← Nearby healthcare
│   ├── health-library.tsx         ← Medical content library
│   ├── notifications.tsx          ← Notification center
│   └── content/[id].tsx           ← Article detail
│
├── (doctor)/                      ← Doctor mode (group)
│   ├── _layout.tsx                ← Doctor layout + doctor auth guard
│   ├── (auth)/                    ← Doctor auth screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── two-factor.tsx
│   │   └── forgot-password.tsx
│   │
│   ├── (tabs)/                    ← Doctor bottom tabs
│   │   ├── _layout.tsx            ← 5-tab TabBar
│   │   ├── index.tsx              ← 📊 Dashboard
│   │   ├── schedule/              ← 📅 Schedule
│   │   │   ├── index.tsx
│   │   │   ├── pending.tsx
│   │   │   ├── pool.tsx
│   │   │   └── [id].tsx
│   │   ├── patients/              ← 👥 Patients
│   │   │   ├── index.tsx
│   │   │   └── [patientId]/
│   │   │       ├── index.tsx
│   │   │       ├── phr.tsx
│   │   │       ├── emr.tsx
│   │   │       ├── emr/new.tsx
│   │   │       ├── emr/[emrId].tsx
│   │   │       ├── prescriptions.tsx
│   │   │       ├── lab-orders.tsx
│   │   │       └── living-will.tsx
│   │   ├── queue/                 ← 🏥 Queue
│   │   │   ├── index.tsx
│   │   │   └── walk-in.tsx
│   │   └── profile/               ← 👤 Profile
│   │       ├── index.tsx
│   │       ├── edit.tsx
│   │       ├── settings.tsx
│   │       ├── notifications.tsx
│   │       ├── api-connections.tsx
│   │       └── language.tsx
│   │
│   ├── meeting/                   ← Video meeting HOST (full-screen)
│   │   ├── [meetingId].tsx
│   │   └── [meetingId]/emr.tsx
│   │
│   ├── ai/                        ← AI Studio
│   │   ├── studio.tsx
│   │   └── calculators.tsx
│   │
│   ├── content/                   ← Medical Content
│   │   ├── library.tsx
│   │   ├── medical-content.tsx
│   │   ├── consultants.tsx
│   │   └── [id].tsx
│   │
│   ├── admin/                     ← Admin-only
│   │   ├── stats.tsx
│   │   ├── doctors.tsx
│   │   ├── appointments.tsx
│   │   └── doctors-directory.tsx
│   │
│   └── notifications.tsx          ← Notification center
│
└── +not-found.tsx                 ← 404 fallback
```

### 3.2 Root Layout Logic

```text
Root _layout.tsx
│
├── Providers
│   ├── ThemeProvider (NativeWind / dark mode)
│   ├── QueryClientProvider (TanStack Query)
│   ├── RoleProvider (current role context)
│   └── ConnectionProvider (API token management)
│
├── Role Routing Logic (in index.tsx)
│   │
│   │  const role = useRole()          // From MMKV storage
│   │  const patientAuth = usePatientAuth()
│   │  const doctorAuth = useDoctorAuth()
│   │
│   │  if (!role) → redirect('/role-select')
│   │  if (role === 'patient' && !patientAuth) → redirect('/(patient)/(auth)/login')
│   │  if (role === 'patient' && patientAuth) → redirect('/(patient)/(tabs)/')
│   │  if (role === 'doctor' && !doctorAuth) → redirect('/(doctor)/(auth)/login')
│   │  if (role === 'doctor' && doctorAuth) → redirect('/(doctor)/(tabs)/')
│   │
│   └── Auth guards in (patient)/_layout.tsx and (doctor)/_layout.tsx
│       verify tokens before rendering child routes
│
└── Global Layout
    ├── StatusBar configuration
    ├── Toast/Snackbar container
    ├── Network status banner (offline indicator)
    └── Deep link handler
```

---

## 4. Role Switching

### 4.1 Switch Workflow

```text
User is in Patient Mode
│
├── Settings > "เปลี่ยนบทบาท / Switch Role"
│
├── Confirmation Dialog:
│   "คุณต้องการเปลี่ยนเป็นโหมดแพทย์หรือไม่?"
│   "Switch to Doctor mode?"
│   [ยืนยัน / Confirm]  [ยกเลิก / Cancel]
│
├── On Confirm:
│   1. Save current patient state (sync pending data)
│   2. Set active_role = 'doctor' in MMKV
│   3. Deactivate patient API client (keep refresh token)
│   4. Check doctor auth tokens:
│   │   ├── Valid → Navigate to Doctor Home
│   │   └── Invalid → Navigate to Doctor Login
│   5. Update tab bar configuration for Doctor mode
│   6. Update API connection visibility
│
└── The reverse (Doctor → Patient) works the same way
```

### 4.2 Visual Indicator

When in a specific role, the app shows a subtle indicator so users always know which mode they're in:

```text
Patient Mode:                          Doctor Mode:
┌─────────────────────────┐            ┌─────────────────────────┐
│ 🟢 Patient Mode   [≡]  │            │ 🔵 Doctor Mode    [≡]  │
│ ─────────────────────── │            │ ─────────────────────── │
│                         │            │                         │
│    (Patient content)    │            │    (Doctor content)     │
│                         │            │                         │
│ ─────────────────────── │            │ ─────────────────────── │
│ 🏠  📅  💊  🤖  👤    │            │ 📊  📅  👥  🏥  👤    │
│ Home Appt Health AI Me  │            │ Dash Sched Pat Queue Me │
└─────────────────────────┘            └─────────────────────────┘

  Status bar: Green tint                 Status bar: Blue tint
  Tab bar: Green accent                  Tab bar: Blue accent
```

---

## 5. Authentication per Role

### 5.1 Patient Authentication

| Method | Availability | Flow |
| -------- | ------------- | ------ |
| Email + Password | Always | Standard login → JWT |
| Biometric (Face ID / Fingerprint) | After first login | Biometric → verify local key → JWT |
| Social Login (Google) | Optional | OAuth2 → backend creates/links account → JWT |
| Social Login (LINE) | Optional | LINE Login SDK → backend creates/links account → JWT |
| Registration | New users | 2-step: email → profile → PDPA consent |
| Forgot Password | Always | Email → reset link → new password |

### 5.2 Doctor Authentication

| Method | Availability | Flow |
| -------- | ------------- | ------ |
| Email + Password + 2FA | Always | Login → OTP (SMS/Email) → JWT |
| Biometric (Face ID / Fingerprint) | After first 2FA login | Biometric → verify → skip 2FA → JWT |
| Medical License Verification | Registration | Upload license → admin approval → activate |
| Forgot Password | Always | Email → reset link → new password → 2FA on next login |

### 5.3 Token Isolation

Patient and Doctor tokens are stored separately in SecureStore:

```text
SecureStore Keys:
├── patient_access_token      ← Patient JWT (15min)
├── patient_refresh_token     ← Patient refresh (30 days)
├── patient_profile           ← Cached patient profile
├── doctor_access_token       ← Doctor JWT (15min)
├── doctor_refresh_token      ← Doctor refresh (30 days)
├── doctor_profile            ← Cached doctor profile
├── active_role               ← 'patient' | 'doctor'
├── biometric_patient_key     ← Patient biometric binding
├── biometric_doctor_key      ← Doctor biometric binding
└── device_id                 ← Shared device identifier
```

This isolation means:
- Switching roles doesn't require re-login (if tokens are valid)
- Logging out of patient mode doesn't affect doctor session
- Each role has independent token lifecycle

---

## 6. Deep Linking

### 6.1 Universal Links

The app handles deep links with role context:

| Link Pattern | Action |
| ------------- | -------- |
| `izara://role/patient` | Switch to patient mode, open home |
| `izara://role/doctor` | Switch to doctor mode, open home |
| `izara://patient/appointment/:id` | Open specific appointment (patient) |
| `izara://patient/book` | Open booking wizard |
| `izara://doctor/patient/:id` | Open patient detail (doctor) |
| `izara://doctor/meeting/:id` | Join meeting as host |
| `izara://meeting/:id` | Detect role, join meeting appropriately |
| `izara://meeting/invite/:token` | Guest join meeting |

### 6.2 Push Notification Deep Links

Push notifications include a deep link payload. When user taps:

```text
Notification: "Your appointment with Dr. สมชาย starts in 15 min"
  → deep_link: izara://patient/appointment/uuid-123
  → App opens in Patient mode → Appointment detail screen

Notification: "New patient waiting: คุณสมศรี"
  → deep_link: izara://doctor/queue
  → App opens in Doctor mode → Queue screen
```

---

## 7. Shared Code between Roles

### 7.1 Shared Packages (Turborepo)

```text
packages/
├── shared/              ← Shared between patient & doctor
│   ├── types/           ← TypeScript interfaces
│   ├── utils/           ← Date helpers, formatters, validators
│   ├── constants/       ← API URLs, Thai text, error codes
│   └── hooks/           ← useNetwork, useOffline, useAuth
│
├── ui/                  ← Shared UI components
│   ├── Button, Input, Card, Modal, Avatar
│   ├── TabBar, Header, LoadingSpinner
│   ├── NotificationBadge, StatusPill
│   ├── MeetingControls, ChatBubble
│   └── Charts (Victory Native wrappers)
│
└── api-client/          ← Shared API client
    ├── http client (axios/ky with interceptors)
    ├── auth interceptor (auto-refresh)
    ├── offline queue
    └── API type definitions
```

### 7.2 Code Sharing Estimate

| Code Area | Shared | Patient-Only | Doctor-Only |
| ----------- | :------: | :------------: | :-----------: |
| UI Components | 70% | 15% | 15% |
| API Client | 90% | 5% | 5% |
| Auth Logic | 50% | 25% | 25% |
| Type Definitions | 60% | 20% | 20% |
| Utilities | 95% | 3% | 2% |
| Screens/Pages | 10% | 45% | 45% |
| Navigation | 20% | 40% | 40% |
| **Overall** | **~55%** | **~22%** | **~23%** |

---

## 8. Onboarding Flow per Role

### 8.1 Patient Onboarding (First Login)

```text
Step 1: Welcome
  "ยินดีต้อนรับสู่ Izara"
  "Welcome to Izara Dr. Anywhere"
  [เริ่มต้นใช้งาน / Get Started]

Step 2: PDPA Consent (Required)
  "นโยบายความเป็นส่วนตัว"
  "Privacy & Data Protection"
  ☑ I agree to PDPA data processing
  ☑ I consent to health data sharing
  [ยอมรับ / Accept]

Step 3: Enable Notifications (Optional)
  "เปิดการแจ้งเตือน"
  "Enable push notifications for appointment reminders"
  [Allow] [Skip]

Step 4: Biometric Setup (Optional)
  "ตั้งค่า Face ID / ลายนิ้วมือ"
  "Enable biometric login for faster access"
  [Enable] [Skip]

Step 5: Connect Health Devices (Optional)
  "เชื่อมต่อสุขภาพ"
  "Connect Apple Health / Google Fit for auto vital tracking"
  [Connect] [Skip]

→ Patient Home Dashboard
```

### 8.2 Doctor Onboarding (First Login)

```text
Step 1: Welcome
  "ยินดีต้อนรับ แพทย์"
  "Welcome, Doctor"
  [เริ่มต้นใช้งาน / Get Started]

Step 2: Enable Notifications (Recommended)
  "เปิดการแจ้งเตือน"
  "Get notified for new appointments, patient queue, and lab results"
  [Allow]

Step 3: Biometric Setup (Recommended)
  "ตั้งค่า Face ID / ลายนิ้วมือ"
  "Skip 2FA on this device with biometric login"
  [Enable] [Skip]

Step 4: Quick Tour
  "ดูภาพรวม"
  Swipeable cards showing key doctor features:
  - Dashboard & Queue
  - EMR Editor
  - AI Copilot
  - Video Meeting

→ Doctor Home Dashboard
```

---

## 9. Tablet-Specific Layout

The unified app adapts its layout for tablets:

### 9.1 Patient Mode (Tablet)

```text
┌──────────────────────────────────────────────────────┐
│  🟢 Patient Mode                            [🔔][≡] │
│──────────┬───────────────────────────────────────────│
│          │                                           │
│  🏠 Home │   ┌─────────────┐  ┌──────────────────┐  │
│          │   │ Upcoming    │  │ Health Summary   │  │
│  📅 Appt │   │ Appointment │  │ Vitals Chart     │  │
│          │   │ Cards       │  │ Medications      │  │
│  💊 Health│   └─────────────┘  └──────────────────┘  │
│          │                                           │
│  🤖 AI  │   ┌────────────────────────────────────┐  │
│          │   │ Quick Actions                      │  │
│  👤 Profile│  │ [Book] [AI Chat] [Map] [Library]  │  │
│          │   └────────────────────────────────────┘  │
│          │                                           │
│ [Switch  │                                           │
│  Role]   │                                           │
└──────────┴───────────────────────────────────────────┘
  Side Tab                  Content Area
```

### 9.2 Doctor Mode (Tablet - 3 Column)

```text
┌────────────────────────────────────────────────────────────────┐
│  🔵 Doctor Mode                                      [🔔][≡] │
│──────────┬──────────────────┬──────────────────┬──────────────│
│          │                  │                  │              │
│ 📊 Dash  │ Today's Queue    │ Next Patient     │ Statistics   │
│          │                  │                  │              │
│ 📅 Sched │ 1. คุณสมชาย ✅   │ คุณสมศรี          │ Seen: 12    │
│          │ 2. คุณสมศรี ⏳   │ Symptoms: ปวดหัว  │ Pending: 5  │
│ 👥 Patients│ 3. คุณสมหญิง ⬜│ PHR Summary      │ Revenue: ฿   │
│          │ 4. คุณสมบัติ ⬜  │ Risk Flags: ⚠️    │ Avg Wait:   │
│ 🏥 Queue │                  │                  │   12 min    │
│          │ [Call Next]      │ [Start Meeting]  │              │
│ 👤 Profile│                 │ [View EMR]       │              │
│          │                  │ [Prescribe]      │              │
│ [Switch  │                  │                  │              │
│  Role]   │                  │                  │              │
└──────────┴──────────────────┴──────────────────┴──────────────┘
  Side Tab     Queue Panel      Detail Panel     Stats Panel
```

---

## 10. Related Documents

| Document | Relationship |
| ---------- | ------------- |
| [01_Mobile_App_Architecture.md](01_Mobile_App_Architecture.md) | Technical architecture (needs update for unified app) |
| [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md) | Auth flows per role |
| [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Complete feature matrix |
| [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | Role-based service visibility |

---

### End of Unified App Role Selection System — February 2026
