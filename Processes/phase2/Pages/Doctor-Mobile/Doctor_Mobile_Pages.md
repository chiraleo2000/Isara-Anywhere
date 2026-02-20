# 👨‍⚕️ Doctor Mobile App — Page Specifications

**Version:** 2.0.0  
**Date:** February 2026  
**Framework:** React Native (Expo Router v4)

---

## Navigation Structure

```text
(auth)/               — Unauthenticated screens
  login               — Doctor login (rate-limited)
  forgot-password     — Password reset
  otp-verify          — 2FA OTP verification

(tabs)/               — Main tab navigation (authenticated)
  index               — Dashboard
  appointments/       — Appointments tab
    index             — Schedule view
    pending           — Pending confirmations
    [appointmentId]   — Appointment detail
  patients/           — Patients tab
    index             — Patient list
    [patientId]/      — Patient detail
      index           — Overview
      phr             — Patient PHR
      emr             — EMR history
      emr/new         — Create new EMR
      prescriptions   — Prescriptions
  queue/              — Queue Management tab
    index             — Today's queue
  profile/            — Profile tab
    index             — Doctor profile
    edit              — Edit profile
    settings          — App settings
    notifications     — Notification settings

meeting/              — Full screen meeting
  [meetingId]         — Video meeting (HOST)
  [meetingId]/emr     — Post-meeting EMR creation

admin/                — Admin screens (admin role)
  stats               — System statistics
  pending-doctors     — Doctor approvals

content/              — Medical content (optional)
  library             — Clinical resources
  consultants         — Medical consultants

notifications         — Notification center
```

---

## Screen Specifications

### 1. Doctor Login — `(auth)/login`

| Property | Value |
| ---------- | ------- |
| **API** | `POST /auth/login` (port 3011) |
| **Components** | Logo, Email input, Password input, Login button, Biometric button |
| **Security** | Rate-limited (10 attempts / 15 min), IP blocking, 2FA for admin |
| **2FA Flow** | Login success → OTP screen → Enter 6-digit code → Dashboard |
| **Biometric** | Available after first successful login + enrollment |
| **Thai Text** | Title: "เข้าสู่ระบบสำหรับแพทย์" |

### 2. Dashboard — `(tabs)/index`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /api/dashboard/:doctorId` |
| **Layout** | ScrollView with stats cards and quick actions |
| **Stats Cards** | Today's appointments (count), Patients in queue, Pending confirmations, Completed today |
| **Quick Actions** | 📅 ดูตาราง, 📋 คิวคนไข้, 🔔 รอยืนยัน, 📹 เริ่มประชุม |
| **Upcoming** | Next 3 appointments with countdown timer |
| **Notifications** | Recent notification badges |
| **Pull to Refresh** | Yes |

### 3. Schedule View — `(tabs)/appointments/index`

| Property | Value |
| ---------- | ------- |
| **APIs** | `GET /api/appointments/doctor/:doctorId` |
| **Components** | Calendar header (day/week view switcher), Time slot list, Appointment cards |
| **Day View** | Vertical timeline with appointment blocks |
| **Week View** | Calendar grid with colored blocks |
| **Card Info** | Patient name, Symptoms, Time, Status, Action buttons |
| **Quick Actions** | Start meeting (if confirmed), View patient info |
| **Color Coding** | Pending(🟡), Confirmed(🟢), In Progress(🔵), Completed(⚪) |

### 4. Pending Appointments — `(tabs)/appointments/pending`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /api/appointments/pending/:doctorId` |
| **Components** | Pending appointment list with large action buttons |
| **Card Info** | Patient name, AI symptom analysis preview, Requested date/time |
| **Actions** | ✅ Confirm, ❌ Decline, 👤 View patient |
| **Confirm Flow** | Tap confirm → Confirmation dialog → `POST /api/appointments/:id/confirm` → Push to patient |
| **Decline Flow** | Tap decline → Reason input → `POST /api/appointments/:id/decline` → Push to patient |
| **Badge** | Shows count on tab bar |

### 5. Patient List — `(tabs)/patients/index`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /api/patients` |
| **Components** | Search bar, Patient cards, Sort/Filter options |
| **Search** | By name, patient ID |
| **Filter** | All, Recent, Scheduled today |
| **Card Info** | Avatar, Name, Age, Last visit date, Conditions |
| **Actions** | Tap → Patient detail |

### 6. Patient Detail — `(tabs)/patients/[patientId]/index`

| Property | Value |
| ---------- | ------- |
| **APIs** | `GET /api/patients/:patientId`, `GET /api/ai/pre-summary/:patientId` |
| **Layout** | Header with patient info + Tab navigation (Overview, PHR, EMR, Rx) |
| **Overview Sections** | Demographics, Active conditions, Allergies (⚠️ prominent), Current medications, AI Pre-consultation summary |
| **AI Summary** | Pre-visit summary from AI — key points, risk factors, suggested questions |
| **Quick Actions** | 📝 Create EMR, 📹 Start Meeting, 💊 Prescribe |
| **Alert Banner** | Show drug allergies prominently in red |

### 7. Patient PHR View — `(tabs)/patients/[patientId]/phr`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /api/phr/patient/:patientId` |
| **Components** | Read-only view of patient's PHR data |
| **Sections** | Vital signs charts, Medications, Allergies, Lifestyle, Wearable data |
| **Charts** | BP trend, HR trend, SpO2, Weight over time |
| **Note** | Doctor can view but not edit patient PHR |

### 8. EMR History — `(tabs)/patients/[patientId]/emr`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /api/patients/:patientId/emr` |
| **Components** | EMR record list (chronological), Detail view |
| **Card Info** | Date, Doctor name, Chief complaint, Diagnosis, Signed status |
| **Detail** | Full EMR content: CC, HPI, PE, Assessment, Plan, Prescriptions |
| **Actions** | 📥 Download PDF, 📝 Create follow-up EMR |

### 9. Create EMR — `(tabs)/patients/[patientId]/emr/new`

| Property | Value |
| ---------- | ------- |
| **APIs** | `POST /api/emr`, `POST /api/emr/:id/sign`, `POST /api/ai/cds`, `POST /api/ai/emr-summary` |
| **Components** | Form with AI pre-fill capability |
| **Fields** | Chief Complaint, Present Illness (HPI), Past Medical History, Physical Exam (BP, HR, Temp, RR, SpO2, Weight), Assessment (ICD-10 search), Plan, Notes |
| **AI Features** | 🤖 Auto-fill from meeting transcript, ICD-10 suggestions, CDS alerts |
| **CDS Panel** | Drug interactions, Contraindications, Care gaps |
| **ICD-10 Search** | Searchable autocomplete (Thai + English) |
| **Actions** | Save draft, Sign & submit, Add prescription, Order labs |
| **Validation** | All required fields filled, ICD-10 selected, CDS alerts reviewed |
| **After Sign** | Push notification to patient → "เวชระเบียนพร้อมดู" |

### 10. Write Prescription — `prescriptions` (modal)

| Property | Value |
| ---------- | ------- |
| **APIs** | `POST /api/prescriptions`, `POST /api/ai/cds/drug-interactions` |
| **Components** | Drug search, Dosage fields, Add multiple drugs |
| **Drug Search** | Thai + English name search, Auto-complete from medication DB |
| **Per Drug** | Name, Dose, Route, Frequency, Duration, Quantity, Instructions |
| **AI Check** | Automatic drug interaction check, Allergy cross-reference |
| **Alert** | ⚠️ Red alert for interactions/allergies, Yellow for caution |
| **Actions** | Add drug, Remove drug, Submit prescription |

### 11. Queue Management — `(tabs)/queue/index`

| Property | Value |
| ---------- | ------- |
| **APIs** | `GET /api/queue/doctor/:doctorId`, `POST /api/queue/call-next` |
| **Components** | Current patient card, Queue list, Call next button |
| **Header** | "กำลังตรวจ: [patient name]" or "ว่าง" |
| **Queue List** | Numbered list with patient name, symptoms, wait time |
| **Status Indicators** | 🔵 Currently being seen, 🔴 Waiting, ✅ Completed, ⏭️ Skipped |
| **Actions** | Call next patient → Push notification, Skip patient, Mark complete |
| **Timer** | Show wait time for each patient |

### 12. Video Meeting (HOST) — `meeting/[meetingId]`

| Property | Value |
| ---------- | ------- |
| **APIs** | `POST /api/video-meeting/create`, `POST /api/video-meeting/:appointmentId/end` |
| **Components** | JitsiMeetingView (HOST), Side panel (tablet), Floating controls |
| **HOST Controls** | Start/Stop transcription, Toggle AI CDS, End meeting for all |
| **Side Panel** | Tabs: Patient Info, Live CDS, Quick EMR notes |
| **Transcription** | Auto-start, Show live transcript for doctor reference |
| **CDS Alerts** | Real-time AI suggestions based on conversation |
| **End Meeting** | End → AI generates summary → Navigate to EMR creation |

### 13. Post-Meeting EMR — `meeting/[meetingId]/emr`

| Property | Value |
| ---------- | ------- |
| **APIs** | `GET /api/meetings/:id/summary`, `POST /api/emr`, `POST /api/ai/validate` |
| **Components** | AI-generated EMR draft with edit capability |
| **Sections** | Meeting summary, Draft EMR fields (AI pre-filled), Prescription builder, Lab order builder, Patient instructions generator |
| **Man-in-Loop** | ✅ Accept AI, ✏️ Edit, ❌ Reject (write manually) |
| **Patient Instructions** | AI-generated → Doctor review → Send to patient |
| **Flow** | Review → Edit → Sign → Prescribe → Order labs → Send instructions → Done |

### 14. Admin — Stats & Approvals — `admin/`

| Property | Value |
| ---------- | ------- |
| **APIs** | `GET /api/admin/stats`, `GET /api/admin/pending-doctors`, `PUT /api/admin/doctors/:id/approve` |
| **Access** | Admin role only |
| **Stats Screen** | Total patients, Total doctors, Appointments today, Active meetings, System health |
| **Pending Doctors** | List of new doctor registrations with documents |
| **Actions** | View credentials, ✅ Approve, ❌ Reject with reason |

### 15. Doctor Profile — `(tabs)/profile/index`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /auth/me` |
| **Sections** | Avatar + name + specialty, Menu items |
| **Menu** | Edit Profile (specialty, bio, schedule), Notification Settings, Availability Schedule, Security Settings (2FA), Language, About, Logout |
| **Availability** | Set weekly schedule (available time slots) |
| **Security** | Enable/Disable biometric, Change password, Active sessions |

### 16. Notification Center — `notifications`

| Property | Value |
| ---------- | ------- |
| **API** | `GET /api/notifications/` |
| **Types** | New appointment requests, Patient queue updates, AI analysis complete, System alerts |
| **Actions** | Tap → Navigate to relevant screen |
| **Filters** | All, Appointments, Queue, System |

---

## Responsive Layout Strategy

| Screen Size | Layout |
| ------------- | -------- |
| Phone Portrait | Single column, bottom tabs |
| Phone Landscape | Side-by-side in meeting, single column elsewhere |
| Tablet Portrait | Split view (list + detail), bottom tabs |
| Tablet Landscape | Full split view, side panel in meetings |

---

### End of Doctor Mobile Pages — February 2026
