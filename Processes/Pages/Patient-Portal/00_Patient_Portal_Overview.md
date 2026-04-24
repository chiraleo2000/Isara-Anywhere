# 🏥 Patient Portal — Architecture & Navigation Overview

**Version:** 3.2.0
**Last Updated:** February 10, 2026
**Portal URL:** `localhost:3005`
**Component:** `App.tsx` → `MainLayout.tsx`

---


## 1. Technology Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS (dark/light mode) |
| Routing | React Router v6 |
| Icons | Lucide React |
| Language | Bilingual Thai (primary) / English |
| State | React Context (AuthContext, SettingsContext) |
| Backend | Express.js + PostgreSQL |
| AI | Google Gemini 2.5 Flash Lite |

---


## 2. Route Map

| Route | Page Component | Thai Title | Access |
| ----- | -------------- | ---------- | ------ |
| `/login` | LoginPage | เข้าสู่ระบบ | Public |
| `/register` | RegisterPage | สมัครสมาชิก | Public |
| `/reset-password` | ResetPasswordPage | รีเซ็ตรหัสผ่าน | Public |
| `/` | DashboardPage | แดชบอร์ด | 🔒 Auth |
| `/appointments` | AppointmentListPage | นัดหมายของฉัน | 🔒 Auth |
| `/book-appointment` | BookAppointmentPage | ขอนัดหมายแพทย์ | 🔒 Auth |
| `/appointments/:id` | AppointmentDetailPage | รายละเอียดนัดหมาย | 🔒 Auth |
| `/phr` | PHRPage | ระเบียนสุขภาพ | 🔒 Auth |
| `/ai-doctor` | AIDoctorPage | AI สุขภาพ | 🔒 Auth |
| `/health-library` | MedicalContentLibrary | คลังความรู้สุขภาพ | 🔒 Auth |
| `/map` | MapPage | สถานพยาบาลใกล้เคียง | 🔒 Auth |
| `/pdpa` | PDPAPage | ความเป็นส่วนตัว | 🔒 Auth |
| `/living-will` | LivingWillPage | พินัยกรรมชีวิต | 🔒 Auth |
| `/profile` | ProfilePage | โปรไฟล์ | 🔒 Auth |
| `/settings` | SettingsPage | ตั้งค่า | 🔒 Auth |
| `/timeline` | TimelinePage | ประวัติการรักษา | 🔒 Auth |

---


## 3. Layout Structure

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          MAIN LAYOUT                                     │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │  Header: NotificationBell · Theme · Language · Avatar    │
│   Sidebar    ├──────────────────────────────────────────────────────────┤
│   (64px)     │                                                          │
│              │                                                          │
│  🏠 Home     │              Page Content (Outlet)                       │
│  📅 Appts    │                                                          │
│  🤖 AI Doc   │                                                          │
│  📚 Library  │                                                          │
│  💊 PHR      │                                                          │
│  📋 Timeline │                                                          │
│  🗺️ Map      │                                                          │
│  🔒 PDPA     │                                                          │
│  ⚙️ Settings │                                                          │
│              │                                                          │
│  MiniMap     │                                                          │
│  Calendar    │                                                          │
│  User Info   │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```


### Mobile Layout


- Sidebar hidden behind hamburger menu


- Header: Hamburger · Logo · NotificationBell · Language · Avatar


- Full-width content area

---


## 4. Sidebar Components


### Navigation Items (9 items)

1. **🏠 หน้าหลัก** (Home) → `/`
2. **📅 นัดหมาย** (Appointments) → `/appointments`
3. **🤖 AI สุขภาพ** (AI Doctor) → `/ai-doctor`
4. **📚 คลังความรู้** (Health Library) → `/health-library`
5. **💊 ระเบียนสุขภาพ** (Health Records) → `/phr`
6. **📋 ประวัติการรักษา** (Timeline) → `/timeline`
7. **🗺️ สถานพยาบาล** (Nearby Healthcare) → `/map`
8. **🔒 PDPA & Living Will** → `/pdpa`
9. **⚙️ ตั้งค่า** (Settings) → `/settings`


### MiniMapWidget


- Compact healthcare facility types display (Hospital, Clinic, Pharmacy, Health Center)


- Click → navigates to full Map page


### MiniCalendar


- Monthly calendar with Thai/English month names


- Buddhist/Gregorian year support


- Today highlighted


- Previous/next month navigation


### User Info


- Avatar, name, email


- Link to Profile page


- Logout button

---


## 5. Authentication Flow

```text
[Unauthenticated] → /login → Enter email + password
                          → AuthContext.login() → POST /api/auth/login
                          → Success → Redirect to /
                          → Failure → Show error message

[Register] → /register → 2-step wizard → AuthContext.register()
                       → POST /api/auth/register → Immediate access

[Password Reset] → /login → "Forgot password" → Enter email
                 → POST /api/auth/request-password-reset
                 → Email with token → /reset-password?token=xxx
                 → POST /api/auth/reset-password
```

---


## 6. Global Features

| Feature | Implementation |
| ------- | -------------- |
| **Dark Mode** | SettingsContext toggle, Tailwind dark: classes |
| **Language** | Thai (default) / English toggle via SettingsContext |
| **Notifications** | NotificationBell with 30-second polling |
| **Scroll Restore** | ScrollToTop component on route change |
| **PWA** | Service worker registration, manifest.json |
| **PDPA Compliance** | Consent management on login, data access audit |

---


## 7. Cross-Page Navigation Map

```text
Dashboard ──→ Book Appointment ──→ Appointment List
    │              │                      │
    ├──→ AI Doctor │                      ├──→ Appointment Detail
    ├──→ PHR       │                      │       ├──→ Join Meeting (Jitsi)
    ├──→ Library   │                      │       └──→ Google Calendar
    │              │                      │
    └──→ Health Studio                    └──→ Book Another

Profile ←──→ Settings
PDPA ←──→ Living Will
Sidebar Map Widget ──→ Full Map Page
NotificationBell ──→ Appointment Detail / Meeting Join
```

---


## 8. AI Agent Improvement Opportunities

| Area | Current | Future Improvement |
| ---- | ------- | ------------------ |
| Navigation | Manual sidebar clicks | AI-guided navigation based on user intent |
| Appointment Booking | 3-step wizard | AI auto-fill from symptom description |
| Health Records | Manual data entry | AI extraction from uploaded documents |
| Notifications | Simple list | AI-prioritized smart notifications |
| Content | Manual browsing | AI-recommended content based on conditions |

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT/INSERT/UPDATE | Patient user accounts |
| sessions | INSERT/DELETE | Authentication session tokens |
| patient_profiles | SELECT/INSERT/UPDATE | Patient demographic and health profile |
| appointments | SELECT/INSERT/UPDATE | Appointment booking and management |
| doctors | SELECT | Available doctor list |
| doctor_schedules | SELECT | Doctor availability for booking |
| phr | SELECT/INSERT/UPDATE | Personal Health Records |
| vital_signs | SELECT/INSERT | Vital sign measurements |
| emr | SELECT | Electronic Medical Records (read-only for patients) |
| prescriptions | SELECT | Prescription history (read-only) |
| lab_orders | SELECT | Lab results (read-only) |
| ai_chat_history | SELECT/INSERT | AI health chat conversation logs |
| knowledge_base | SELECT | Medical knowledge base for RAG |
| medical_content | SELECT | Published health articles |
| notifications | SELECT/UPDATE | Notification records |
| push_subscriptions | SELECT/INSERT | Web push subscription endpoints |
| patient_consents | SELECT/INSERT/UPDATE | PDPA consent management |
| living_wills | SELECT/INSERT/UPDATE | Living will documents |
| living_will_versions | SELECT/INSERT | Living will version history |
| password_resets | INSERT/UPDATE | Password reset token management |


### Backend Server


- **Runtime:** Express.js TypeScript (index.ts, 16 route modules)


- **Port:** 3005


- **Database:** PostgreSQL izara_phase1


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/auth/* | POST | users, sessions CRUD |
| /api/dashboard/* | GET | appointments, notifications, medical_content SELECT |
| /api/appointments/* | GET/POST | appointments CRUD |
| /api/phr/* | GET/POST | phr, vital_signs CRUD |
| /api/vital-signs/* | POST | vital_signs INSERT |
| /api/ai/health-chat | POST | ai_chat_history, knowledge_base |
| /api/content/articles | GET | medical_content SELECT |
| /api/consents/* | GET/POST/PUT | patient_consents CRUD |
| /api/phr/:id/living-will | GET/POST/PUT | living_wills, living_will_versions CRUD |
| /api/profile/* | GET/PUT | users, patient_profiles SELECT/UPDATE |
| /api/settings/* | GET/PUT | users preferences JSONB UPDATE |
| /api/timeline/* | GET | appointments, emr, prescriptions, lab_orders, vital_signs SELECT |
| /api/notifications/* | GET/PUT | notifications SELECT/UPDATE |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
