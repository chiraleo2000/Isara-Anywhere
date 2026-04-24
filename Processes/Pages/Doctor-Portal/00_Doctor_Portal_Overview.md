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

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT/INSERT/UPDATE | User accounts (doctors, patients, admins) |
| sessions | INSERT/DELETE | Authentication session tokens |
| doctor_profiles | SELECT/UPDATE | Doctor-specific profile data |
| patient_profiles | SELECT | Patient demographic information |
| appointments | SELECT/INSERT/UPDATE | Appointment scheduling and management |
| doctor_schedules | SELECT/INSERT/UPDATE/DELETE | Doctor availability time slots |
| emr | SELECT/INSERT/UPDATE | Electronic Medical Records (SOAP JSONB) |
| prescriptions | SELECT/INSERT | Medication prescriptions with CDS checks |
| lab_orders | SELECT/INSERT/UPDATE | Laboratory test orders and results |
| phr | SELECT | Personal Health Records |
| vital_signs | SELECT | Patient vital sign measurements |
| meeting_records | SELECT/INSERT/UPDATE | Health meeting session records |
| meeting_transcripts | SELECT/INSERT | Real-time meeting transcripts |
| transcriptions_embeddings | SELECT/INSERT | Vector embeddings for transcript search |
| ai_validations | SELECT/INSERT | AI validation results for EMR/meetings |
| ai_chat_history | SELECT/INSERT | AI chat conversation logs |
| ai_chat_memory | SELECT/INSERT/UPDATE | AI contextual memory per patient |
| ai_document_analysis | SELECT/INSERT | AI document analysis results |
| knowledge_base | SELECT/INSERT | Medical knowledge base for RAG |
| drugs | SELECT | Drug database for CDS |
| cds_logs | INSERT | Clinical Decision Support audit logs |
| notifications | SELECT/INSERT/UPDATE | User notification records |
| push_subscriptions | SELECT/INSERT | Web push subscription endpoints |
| medical_content | SELECT/INSERT/UPDATE | Health articles and educational content |
| clinical_resources | SELECT/INSERT/UPDATE | Clinical guidelines and protocols |
| consultants | SELECT/INSERT/UPDATE/DELETE | Medical consultant directory |
| doctor_reviews | SELECT/INSERT | Doctor review submissions |
| living_wills | SELECT | Living will documents |
| patient_consents | SELECT | PDPA consent records |
| password_resets | INSERT/UPDATE | Password reset token management |


### Backend Server


- **Runtime:** Express.js CommonJS (mainApiServer.cjs)


- **Port:** 3010


- **Database:** PostgreSQL izara_phase1


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/auth/* | POST | users, sessions CRUD |
| /api/dashboard/* | GET | appointments, users, notifications, emr SELECT |
| /api/appointments/* | GET/POST/PUT | appointments CRUD |
| /api/schedules/* | GET/PUT | doctor_schedules CRUD |
| /api/patients/* | GET | users, patient_profiles, phr, vital_signs SELECT |
| /api/meetings/* | POST | meeting_records, meeting_transcripts CRUD |
| /api/emr/* | POST/PUT | emr, ai_validations CRUD |
| /api/prescriptions/* | POST | prescriptions, drugs, cds_logs INSERT |
| /api/lab-orders/* | POST/PUT | lab_orders CRUD |
| /api/ai/* | POST | ai_chat_history, knowledge_base, ai_document_analysis |
| /api/consultants/* | GET/POST/PUT/DELETE | consultants, doctor_reviews CRUD |
| /api/content/* | GET/POST/PUT | medical_content, clinical_resources, knowledge_base CRUD |
| /api/profile/* | GET/PUT | users, doctor_profiles SELECT/UPDATE |
| /api/admin/* | GET/PUT | users, doctor_profiles admin operations |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
