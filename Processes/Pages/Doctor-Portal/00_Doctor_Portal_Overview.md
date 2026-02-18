# 🏥 Doctor Portal — Architecture & Navigation Overview

**Version:** 3.2.0  
**Last Updated:** February 10, 2026  
**Portal URL:** `localhost:3010`  
**Component:** `DoctorPortal.tsx` (main router)

---

## 1. Technology Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS (dark/light mode) |
| Routing | React Router v6 (nested routes) |
| Icons | Lucide React |
| Language | Bilingual Thai (primary) / English |
| State | React Hooks (useAuth, useLanguage, useSettings) |
| Backend | Express.js (CJS) + PostgreSQL |
| AI Engine | Google Gemini 2.5 Flash Lite |
| Video | Jitsi Meet integration |
| Compliance | PDPA, HIPAA |

---

## 2. User Roles

| Role | Permissions |
| ---- | ----------- |
| **Doctor** | View assigned patients, manage appointments, write EMR, prescribe, order labs, AI chat |
| **Admin** | All doctor permissions + manage doctors, approve registrations, manage all appointments, view all patients |

---

## 3. Route Map

| Route | Page Component | Thai Title | Access |
| ----- | -------------- | ---------- | ------ |
| `/login` | LoginPage | เข้าสู่ระบบ | Public |
| `/reset-password` | ResetPasswordPage | รีเซ็ตรหัสผ่าน | Public |
| `/dashboard` | DoctorDashboard | แดชบอร์ดแพทย์ | 🔒 Doctor/Admin |
| `/schedule` | CompleteSchedule | ตารางนัดหมาย | 🔒 Doctor/Admin |
| `/patients` | PatientManagement | การจัดการผู้ป่วย | 🔒 Doctor/Admin |
| `/patients/:id` | PatientManagement | ข้อมูลผู้ป่วย | 🔒 Doctor/Admin |
| `/consultants` | MedicalConsultants | แพทย์ที่ปรึกษา | 🔒 Doctor/Admin |
| `/doctors` | DoctorsManagement | จัดการแพทย์ | 🔒 Doctor/Admin |
| `/medical-content` | MedicalContent | เนื้อหาทางการแพทย์ | 🔒 Doctor/Admin |
| `/health-meeting` | HealthMeeting | การประชุมสุขภาพ | 🔒 Doctor/Admin |
| `/clinical-resources` | ClinicalResources | ทรัพยากรทางคลินิก | 🔒 Doctor/Admin |
| `/profile` | DoctorProfilePage | โปรไฟล์แพทย์ | 🔒 Doctor/Admin |
| `/admin/doctors` | AdminDoctorManagement | จัดการแพทย์ (Admin) | 🔒 Admin only |
| `/admin/appointments` | AdminAppointmentManagement | จัดการนัดหมาย (Admin) | 🔒 Admin only |

### Modal Components (launched from DoctorPortal)

| Modal | Component | Purpose |
| ----- | --------- | ------- |
| EMR Editor | CompleteEMREditor | Create/edit Electronic Medical Records |
| Prescribing | CompletePrescribing | E-Prescribing with drug safety |
| Lab Orders | CompleteLabOrders | Lab & imaging test orders |
| AI Studio | GeminiAIStudio | AI chat + medical calculators |
| Virtual Meeting | VirtualMeeting | Jitsi video consultation |
| Patient Record | PatientRecordViewer | PHR/EMR/EHR viewer |

---

## 4. Layout Structure

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOCTOR PORTAL LAYOUT                            │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │  Header: Search · Notifications · Theme · Avatar        │
│   Sidebar    ├──────────────────────────────────────────────────────────┤
│   (collapsible)│                                                        │
│              │                                                          │
│  📊 Dashboard│              Page Content (Outlet)                       │
│  📅 Schedule │                                                          │
│  👥 Patients │                                                          │
│  🎥 Meeting  │                                                          │
│  👨‍⚕️ Consult │              + Side Panels (patient list, etc.)         │
│  📚 Content  │                                                          │
│  📋 Clinical │                                                          │
│  [Admin Only]│                                                          │
│  👥 Doctors  │                                                          │
│  ✅ Approve  │                                                          │
│              │                                                          │
│  Profile     │              🤖 AI FAB Button (floating)                │
│  Logout      │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

---

## 5. Navigation Items

### Doctor Navigation (9 items)

1. **📊 แดชบอร์ด** (Dashboard) → `/dashboard`
2. **📅 ตารางนัดหมาย** (Schedule) → `/schedule`
3. **👥 ผู้ป่วย** (Patients) → `/patients`
4. **🎥 นัดหมาย & ประชุม** (Appointments & Meetings) → `/health-meeting`
5. **👨‍⚕️ ที่ปรึกษาแพทย์** (Medical Consultants) → `/consultants`
6. **📚 เนื้อหาทางการแพทย์** (Medical Content) → `/medical-content`
7. **📋 ทรัพยากรทางคลินิก** (Clinical Resources) → `/clinical-resources`
8. **👤 โปรไฟล์** (Profile) → `/profile`
9. **🚪 ออกจากระบบ** (Logout)

### Admin-Only Navigation (2 additional items)

1. **👥 จัดการแพทย์** (Manage Doctors) → `/admin/doctors`
2. **✅ จัดการนัดหมาย** (Manage Appointments) → `/admin/appointments`

---

## 6. Side Panel System

The DoctorPortal includes inline side panels:

### Quick Actions Panel (per patient)

| Action | Description |
| ------ | ----------- |
| View Record | Opens PatientRecordViewer modal |
| Create EMR | Opens CompleteEMREditor modal |
| Prescribe | Opens CompletePrescribing modal |
| Order Lab | Opens CompleteLabOrders modal |
| Start Consult | Opens VirtualMeeting modal |

### Results Panel (tabbed)

| Tab | Content |
| --- | ------- |
| Patients | Patient list with search |
| Results | EMR/lab/prescription results |
| Orders | Pending lab/prescription orders |

---

## 7. AI FAB Button

- Floating action button (bottom-right corner) on all pages
- Click → Opens GeminiAIStudio modal
- Provides AI chat + medical calculators from any page
- Always accessible during clinical workflow

---

## 8. Authentication Flow

```text
[Unauthenticated] → /login → Enter email + password
                          → POST /auth/login
                          → Success → Check role (doctor/admin)
                          → Redirect to /dashboard
                          → Failure → Error message

[Register] → /login → Registration tab → Fill details
           → POST /auth/register → Requires admin approval
           → Shows "Pending Approval" screen

[Password Reset] → /login → "Forgot password" → Enter email
                 → POST /auth/request-password-reset → Email sent
                 → /reset-password?token=xxx → POST /auth/reset-password
```

---

## 9. Cross-Page Navigation Map

```text
Dashboard ──→ Health Meeting ──→ Virtual Meeting (Jitsi)
    │              │                    │
    │              └──→ EMR Editor ──→ Prescribing ──→ Lab Orders
    │                                   │
    ├──→ Patient Mgmt ──→ Patient Record Viewer
    │              │
    ├──→ Schedule  │
    │              │
    └──→ AI Studio │

Admin Dashboard ──→ Doctor Management (approve/reject)
       │
       └──→ Appointment Management (assign/auto-assign)
```

---

## 10. AI Agent Improvement Opportunities

| Area | Current | Future Improvement |
| ---- | ------- | ------------------ |
| Navigation | Manual sidebar | AI-driven contextual navigation |
| Patient selection | Search + click | AI voice command "open patient X" |
| EMR writing | Manual + AI assist | AI auto-draft from meeting transcript |
| Prescribing | Manual with safety checks | AI auto-suggest based on diagnosis |
| Scheduling | Manual calendar | AI optimize schedule based on patient needs |
| Admin approval | Manual review | AI pre-screen registrations |
