# 📱 Patient Mobile App — Page Specifications

**Version:** 2.0.0  
**Date:** February 2026  
**Framework:** React Native (Expo Router v4)

---

## Navigation Structure

```
(auth)/               — Unauthenticated screens
  login               — Login screen
  register            — Registration screen
  forgot-password     — Password reset
  pdpa-consent        — PDPA consent
  onboarding          — First-time onboarding

(tabs)/               — Main tab navigation (authenticated)
  index               — Dashboard / Home
  appointments/       — Appointments tab
    index             — My Appointments list
    book              — Book new appointment
    [appointmentId]   — Appointment detail
  health/             — Health Records tab
    index             — Health overview
    vitals            — Vital signs
    medications       — Medications
    allergies         — Allergies
    health-logs       — EMR / Lab / Rx history
    timeline          — Unified timeline
    living-will       — Living will
    devices           — Connected wearables
    scanner           — Document scanner
  ai/                 — AI Assistant tab
    index             — AI Chat
    symptom-checker   — Symptom checker
    risk-assessment   — Health risk
  profile/            — Profile tab
    index             — Profile overview
    edit              — Edit profile
    settings          — App settings
    notifications     — Notification settings
    payments          — Payment history
    privacy           — PDPA / Privacy

meeting/              — Full screen (outside tabs)
  [meetingId]         — Video meeting
  [meetingId]/feedback — Post-meeting feedback
  invite/[token]      — Guest join via invite

map                   — Nearby healthcare map
notifications         — Notification center
```

---

## Screen Specifications

### 1. Login Screen — `(auth)/login`

| Property | Value |
|----------|-------|
| **API** | `POST /api/auth/login` |
| **Components** | Logo, Email input, Password input, Login button, Biometric button, Forgot password link, Register link |
| **State** | Email, password, loading, error, biometricAvailable |
| **Validation** | Email format, password min 8 chars |
| **Actions** | Login → Store JWT → Navigate to `(tabs)/` |
| **Biometric** | If enrolled: Show Face ID / Fingerprint button → `BiometricService.login()` |
| **Error States** | Invalid credentials, account locked, network error |
| **Thai Text** | Title: "เข้าสู่ระบบ", Button: "เข้าสู่ระบบ", Biometric: "เข้าสู่ระบบด้วย Face ID" |

### 2. Register Screen — `(auth)/register`

| Property | Value |
|----------|-------|
| **API** | `POST /api/auth/register` |
| **Components** | Step wizard (3 steps): Personal Info → Medical Info → PDPA Consent |
| **Step 1** | First name, Last name, Email, Password, Confirm password, Phone, DOB |
| **Step 2** | Blood type, Known conditions, Current medications |
| **Step 3** | PDPA consent checkbox, Terms of service |
| **Validation** | Email unique, password strength, all required fields |
| **Actions** | Register → Auto-login → Navigate to onboarding |

### 3. Dashboard — `(tabs)/index`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/auth/me`, `GET /api/appointments/my`, `GET /api/phr/:id/vitals`, `GET /api/notifications/` |
| **Layout** | ScrollView with sections |
| **Sections** | Greeting + avatar, Quick Actions (4 buttons), Upcoming Appointment card, Today's Vitals summary, Medication Reminders, AI Health Score, Health Tips carousel |
| **Quick Actions** | 📅 นัดหมาย, 💬 AI Chat, 📹 ประชุม, 📋 สุขภาพ |
| **Pull to Refresh** | Yes |
| **Offline** | Show cached data with offline banner |

### 4. Appointments List — `(tabs)/appointments/index`

| Property | Value |
|----------|-------|
| **API** | `GET /api/appointments/my`, `GET /api/appointments/history` |
| **Components** | Tab switcher (Upcoming / History), Appointment cards, FAB (+ Book) |
| **Card Info** | Doctor name, specialty, date, time, status badge, action buttons |
| **Status Colors** | Pending(🟡), Confirmed(🟢), In Progress(🔵), Completed(⚪), Cancelled(🔴) |
| **Actions** | Tap → Detail, Long press → Cancel, FAB → Book new |
| **Empty State** | "ยังไม่มีนัดหมาย" with CTA "นัดหมายแพทย์" |

### 5. Book Appointment — `(tabs)/appointments/book`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/ai/symptom-checker`, `GET /api/doctors/`, `GET /api/doctors/:id/slots`, `POST /api/appointments/`, `POST /api/mobile/payments/create-intent` |
| **Flow** | Step wizard: Symptoms → Doctor → Date/Time → Confirm & Pay |
| **Step 1** | Text input for symptoms, 🎤 voice input, 🤖 AI suggested specialty |
| **Step 2** | Doctor list (filterable by specialty, rating), Doctor cards with ratings |
| **Step 3** | Calendar date picker, Time slot grid |
| **Step 4** | Summary, Payment method selection, Confirm button |
| **After Booking** | Add to calendar option, Push reminders scheduled |

### 6. Appointment Detail — `(tabs)/appointments/[appointmentId]`

| Property | Value |
|----------|-------|
| **API** | `GET /api/appointments/:appointmentId` |
| **Sections** | Status header, Doctor info, Date/Time, Symptoms, Actions |
| **Actions (Pending)** | Cancel appointment |
| **Actions (Confirmed)** | Join meeting (if live), Add to calendar, Cancel |
| **Actions (Completed)** | View EMR, Download PDF, Rate doctor |
| **Meeting Button** | Prominent green button "📹 เข้าร่วมประชุม" when meeting is live |

### 7. Health Overview — `(tabs)/health/index`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/phr/`, `GET /api/phr/:id/vitals` |
| **Layout** | Grid of health categories with latest values |
| **Cards** | BP card, Heart Rate card, SpO2 card, Weight card, Medications count, Allergies count |
| **Each Card** | Latest value, trend indicator (↑↓→), mini sparkline chart |
| **Navigation** | Tap card → detailed view |

### 8. Vital Signs — `(tabs)/health/vitals`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/phr/:id/vitals`, `POST /api/phr/:id/vitals` |
| **Components** | Vital type tabs, Chart (7d/30d/90d), History list, Add button |
| **Chart** | Victory Native line chart with normal range band |
| **Input** | Bottom sheet modal for recording new vital |
| **Wearable** | Badge "⌚ From Apple Watch" for auto-synced data |

### 9. Medications — `(tabs)/health/medications`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/phr/:id/medications`, `POST /api/phr/:id/medications` |
| **Sections** | Active medications, Past medications |
| **Card Info** | Drug name, dosage, frequency, prescribing doctor, reminder toggle |
| **Actions** | Add medication, Set reminder times, Mark as stopped |
| **Reminders** | Local scheduled notifications via `expo-notifications` |

### 10. Health Logs — `(tabs)/health/health-logs`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/phr/:id/health-logs`, `GET /api/emr/my` |
| **Filters** | All, EMR, Prescriptions, Lab Results, Instructions |
| **Card Info** | Type icon, Date, Doctor, Diagnosis/Title, Status |
| **Detail View** | Full EMR content, PDF download, Share |
| **Camera** | FAB "📷 สแกนเอกสาร" → Document scanner flow |

### 11. AI Chat — `(tabs)/ai/index`

| Property | Value |
|----------|-------|
| **APIs** | `POST /api/ai/chat`, `GET /api/ai/chat/history`, `POST /api/ai/chat/clear` |
| **Components** | Chat message list, Text input, Voice button, Photo button |
| **Message Types** | Text, Quick replies, Cards (doctor recommendation, booking CTA) |
| **Voice** | Hold-to-record → Transcribe → Send as text |
| **Photo** | Camera → Describe symptom visually |
| **Disclaimer** | Persistent footer "⚠️ ไม่ใช่การวินิจฉัยโรค" |

### 12. Video Meeting — `meeting/[meetingId]`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/video-meeting/:appointmentId`, `POST /api/video-meeting/:appointmentId/join` |
| **Components** | JitsiMeetingView (full screen), Pre-join screen with camera preview |
| **Controls** | Mute, Camera, Chat, PiP, Speaker, End call |
| **PiP** | Auto-enter when app goes to background |
| **Transcription** | Auto-start on join, send segments via Socket.IO |
| **Network** | Quality indicator, auto-reconnect on drop |

### 13. Profile — `(tabs)/profile/index`

| Property | Value |
|----------|-------|
| **API** | `GET /api/auth/me` |
| **Sections** | Avatar + name, Menu items |
| **Menu** | Edit Profile, Notification Settings, Payment History, Connected Devices, Privacy & PDPA, Language, About, Logout |
| **Biometric** | Enable/Disable biometric login toggle |
| **Language** | Thai / English switcher |

### 14. Notification Center — `notifications`

| Property | Value |
|----------|-------|
| **APIs** | `GET /api/notifications/`, `PUT /api/notifications/:id/read` |
| **Components** | Notification list, Mark all read button, Filters |
| **Card Info** | Icon, Title, Body, Time (relative), Read/Unread dot |
| **Actions** | Tap → Navigate to deep link, Swipe → Delete |
| **Badge** | Updates tab bar badge count |

### 15. Nearby Map — `map`

| Property | Value |
|----------|-------|
| **API** | `GET /api/google/maps/nearby` |
| **Components** | MapView (react-native-maps), Location markers, List sheet |
| **Permissions** | Location permission required |
| **Markers** | Hospitals (🏥), Clinics (🩺), Pharmacies (💊) |
| **Actions** | Tap marker → Info card, Get directions (open Maps app) |

---

### End of Patient Mobile Pages — February 2026
