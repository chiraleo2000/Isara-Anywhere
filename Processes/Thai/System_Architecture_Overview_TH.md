# Izara Telemedicine — System Architecture Overview

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `System_Architecture_Overview.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`System_Architecture_Overview.md`](../System_Architecture_Overview.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.7.57
**อัปเดตล่าสุด:** July 2, 2026
**สถานะ:** ✅ Phase 1 Complete — Web Platform


---


## 📋 สารบัญ

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Three-Portal Architecture](#3-three-portal-architecture)
4. [Network Architecture](#4-network-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Architecture](#7-database-architecture)
8. [AI Integration Architecture](#8-ai-integration-architecture)
9. [Real-Time Communication](#9-real-time-communication)
10. [Security Architecture](#10-security-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Directory Structure](#12-directory-structure)

---


## 1. System ภาพรวม

Izara Telemedicine is a **three-portal telemedicine platform** built for Thai healthcare. It connects patients, doctors, and admins through video consultations with AI-assisted clinical workflows using the **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)** approach.


### Core Principle

> AI serves as a clinical assistant. Doctors retain final decision authority on all clinical outputs.


### Platform Composition

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     IZARA TELEMEDICINE PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ Patient Portal  │  │ Doctor Portal   │  │ Meeting Server  │         │
│  │ React + Express │  │ React + Express │  │ Express+Socket  │         │
│  │ Port 3005       │  │ Port 3010       │  │ Port 3020       │         │
│  │ 15 pages        │  │ 21 pages        │  │ Video + AI      │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           └────────────────────┼──────────────────────┘                  │
│                                ▼                                         │
│           ┌─────────────────────────────────────┐                       │
│           │  PostgreSQL 18 + pgvector           │                       │
│           │  42 tables  ·  izara_phase1          │                       │
│           └─────────────────────────────────────┘                       │
│                                ▼                                         │
│           ┌─────────────────────────────────────┐                       │
│           │  Google Gemini 2.5 Flash Lite (AI)  │                       │
│           │  Jitsi Meet (Video)                  │                       │
│           │  Web Speech API (Transcription)      │                       │
│           └─────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---


## 2. Technology Stack


### Frontend

| Technology | Purpose |
| ---------- | ------- |
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool + dev server |
| Tailwind CSS | Styling (dark/light mode) |
| React Router v6 | Client-side routing |
| Lucide React | Icons |
| Socket.IO Client | Real-time events |


### Backend

| Technology | Purpose |
| ---------- | ------- |
| Express.js | REST API server |
| PostgreSQL 18 | Primary database |
| pgvector | AI embedding similarity search |
| Socket.IO | Real-time WebSocket |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| node-pg | PostgreSQL client |


### AI & Video

| Technology | Purpose |
| ---------- | ------- |
| Google Gemini 2.5 Flash Lite | AI medical assistant, EMR generation, CDS |
| Jitsi Meet (meet.jit.si) | FREE video conferencing with lobby |
| Web Speech API | FREE browser-native speech-to-text |
| pgvector | RAG knowledge base similarity search |


### DevOps

| Technology | Purpose |
| ---------- | ------- |
| Docker Compose | Local development orchestration |
| Google Cloud Run | Production hosting (auto-scaling) |
| Cloud Build | CI/CD pipelines |
| Artifact Registry | Container image storage |
| Playwright | E2E testing (1,287 tests) |

---


## 3. Three-Portal Architecture


### Patient Portal (Port 3005) — 15 Pages

| Route | Page | Purpose |
| ----- | ---- | ------- |
| `/login` | LoginPage | Patient authentication |
| `/register` | RegisterPage | 2-step registration wizard |
| `/reset-password` | ResetPasswordPage | Password reset via email |
| `/` | DashboardPage | Central hub, quick access |
| `/appointments` | AppointmentPages | View/book/detail appointments |
| `/phr` | PHRPage | Health records (5 tabs) |
| `/ai-doctor` | AIDoctorPage | AI health assistant chat |
| `/health-library` | MedicalContentLibrary | Health education articles |
| `/map` | MapPage | Google Maps facility finder |
| `/pdpa` | PDPAPage | Privacy consent management |
| `/living-will` | LivingWillPage | 4-step living will wizard |
| `/profile` | ProfilePage | Edit personal info |
| `/settings` | SettingsPage | App preferences |
| `/timeline` | TimelinePage | Complete treatment history |
| Header | NotificationBell | Real-time การแจ้งเตือน |


### Doctor Portal (Port 3010) — 21 Pages

| Route | Page | Access | Purpose |
| ----- | ---- | ------ | ------- |
| `/login` | LoginPage | Public | Doctor/admin auth |
| `/reset-password` | ResetPasswordPage | Public | Password reset |
| `/` | DashboardPage | Doctor/Admin | Overview & stats |
| `/schedule` | SchedulePage | Doctor/Admin | Appointment calendar |
| `/patients` | PatientManagement | Doctor/Admin | Patient list & search |
| `/health-meeting` | HealthMeetingPage | Doctor/Admin | Video consultation control |
| `/meeting/:id` | MeetingRoom | Doctor/Admin | Full-screen Jitsi meeting room (replaces removed VirtualMeeting) |
| (modal) | EMREditor | Doctor/Admin | SOAP EMR documentation |
| (modal) | CompletePrescribing | Doctor/Admin | E-Prescribing |
| (modal) | CompleteLabOrders | Doctor/Admin | Lab & imaging orders |
| (modal) | PatientRecordViewer | Doctor/Admin | PHR/EMR/EHR viewer |
| `/consultants` | MedicalConsultants | Doctor/Admin | Specialist directory |
| `/medical-content` | MedicalContent | Doctor/Admin | Health article management |
| `/clinical-resources` | ClinicalResources | Doctor/Admin | Clinical guidelines + RAG |
| (FAB) | GeminiAIStudio | Doctor/Admin | AI assistant + calculators |
| `/profile` | DoctorProfilePage | Doctor/Admin | Doctor profile |
| `/admin/appointments` | AdminAppointmentMgmt | Admin only | All appointment management |
| `/admin/doctors` | AdminDoctorMgmt | Admin only | Doctor registration approval |
| `/doctors` | DoctorsManagement | Doctor/Admin | Doctor directory |
| `/appointment-pool` | → `/health-meeting?tab=queue` | Doctor/Admin | Redirect — claim unassigned appointments in Health Meeting queue |
| (embed) | QueueManagement | Doctor/Admin | Real-time ผู้ป่วย queue |


### Meeting Server (Port 3020) — Backend Only

| Capability | คำอธิบาย |
| ---------- | ----------- |
| Room Management | Create/join/end Jitsi rooms |
| Transcript Streaming | Receive & store speech-to-text segments |
| AI Summary Pipeline | Gemini generates EMR/summaries หลังประชุม |
| Recording | Audio/video capture stored as BYTEA in PostgreSQL |
| Socket.IO | Real-time meeting events |

---


## 4. Network Architecture

```text
┌─── Client Browser ──────────────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │Patient SPA   │    │Doctor SPA    │    │Jitsi iframe  │           │
│  │React + Vite  │    │React + Vite  │    │meet.jit.si   │           │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘           │
│         │ HTTP/WS           │ HTTP/WS           │ WebRTC            │
└─────────┼───────────────────┼───────────────────┼───────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─── Docker / Cloud Run ──────────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │Patient Server│  │Doctor Server │  │Meeting Server│              │
│  │Express :3005 │  │Express :3010 │  │Express :3020 │              │
│  │+ Socket.IO   │  │+ Socket.IO   │  │+ Socket.IO   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                      │
│         └──────────────────┼──────────────────┘                     │
│                            ▼                                         │
│               ┌──────────────────────┐                               │
│               │  PostgreSQL 18       │                               │
│               │  + pgvector          │                               │
│               │  :5433 → :5432       │                               │
│               └──────────────────────┘                               │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
          ┌──────────────┐  ┌──────────────┐
          │ Gemini API   │  │ meet.jit.si  │
          │ (Google AI)  │  │ (Jitsi SaaS) │
          └──────────────┘  └──────────────┘
```

---


## 5. Frontend Architecture


### Component Hierarchy

```text
App.tsx
├── AuthContext (authentication state)
├── SettingsContext (language, theme)
├── MainLayout.tsx
│   ├── Header (logo, nav, notifications, avatar)
│   ├── Sidebar (navigation links by role)
│   └── <Outlet /> (page content)
└── Routes
    ├── Public: Login, Register, ResetPassword
    └── Protected: Dashboard, Appointments, PHR, ...
```


### State Management

| Layer | Technology | Scope |
| ----- | ---------- | ----- |
| Auth State | React Context (AuthContext) | Global — user, token, role |
| Settings | React Context (SettingsContext) | Global — language, theme |
| Page State | React useState/useReducer | Local — page-specific data |
| Real-Time | Socket.IO events | Global — การแจ้งเตือน, updates |
| API Cache | Custom hooks with useState | Per-component data fetching |


### Bilingual Support


- **Primary:** Thai (ภาษาไทย) — all content Thai-first


- **Secondary:** English — toggle in header


- **Pattern:** Thai field names appear first in forms, English fallback


- **Storage:** `preferences.language` in users table JSONB

---


## 6. Backend Architecture


### Server Structure (per portal)

```text
server/
├── mainApiServer.cjs        # Express app + all routes
├── routes/
│   ├── auth.ts              # Login, register, password reset
│   ├── appointments.ts      # CRUD appointments
│   ├── phr.ts               # Personal health records
│   ├── emr.ts               # Electronic medical records
│   └── ...
├── services/
│   ├── postgresDataService.ts  # PostgreSQL queries
│   ├── geminiService.ts        # AI API calls
│   └── socketService.ts        # Socket.IO events
└── middleware/
    ├── auth.ts              # JWT verification
    └── rbac.ts              # Role-based access
```


### API Design Pattern


- RESTful endpoints with `/api/` prefix


- JWT Bearer authentication


- Role-based middleware (ผู้ป่วย / แพทย์ / ผู้ดูแลระบบ)


- JSONB for flexible data structures


- COALESCE for date field compatibility

---


## 7. ฐานข้อมูล Architecture

> See **[PostgreSQL_Database_Architecture.md](PostgreSQL_Database_Architecture.md)** for complete schema documentation.


### Quick Summary


- **37+ tables** in single `izara_phase1` database


- **pgvector** for AI embedding similarity search


- **LISTEN/NOTIFY** triggers for real-time sync


- **BYTEA** storage for meeting recordings


- **JSONB** extensively for flexible clinical data

---


## 8. AI Integration Architecture


### AI Pipeline

```text
┌────────────────────────────────────────────────────────────────────┐
│                    GEMINI AI INTEGRATION                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INPUT SOURCES                   AI PROCESSING           OUTPUTS   │
│  ────────────                    ─────────────           ───────   │
│                                                                     │
│  Meeting Transcript ──→ ┌───────────────────┐ ──→ EMR Draft (SOAP)│
│  Patient History    ──→ │ Gemini 2.5 Flash  │ ──→ AI Summary      │
│  PHR Data           ──→ │ Lite API          │ ──→ Patient Instruct│
│  Drug Database      ──→ │                   │ ──→ CDS Alerts      │
│  Clinical Guidelines──→ │ + RAG Context     │ ──→ Triage Urgency  │
│  ICD-10 Codes       ──→ │ (pgvector search) │ ──→ Chat Responses  │
│                         └─────────┬─────────┘                      │
│                                   │                                 │
│                         ┌─────────▼─────────┐                      │
│                         │ Man-in-the-Loop   │                      │
│                         │ Doctor Validation  │                      │
│                         │ ✅ Approve         │                      │
│                         │ ✏️ Edit            │                      │
│                         │ ❌ Reject          │                      │
│                         └───────────────────┘                      │
└────────────────────────────────────────────────────────────────────┘
```


### AI ฟีเจอร์ (Phase 1)

| ฟีเจอร์ | Trigger | Model | Output |
| ------- | ------- | ----- | ------ |
| Pre-Consultation Summary | Before meeting starts | Gemini 2.5 Flash Lite | ผู้ป่วย overview for แพทย์ |
| Real-Time Transcription | During meeting | Web Speech API (browser) | Live transcript segments |
| Meeting AI Summary | After meeting ends | Gemini 2.5 Flash Lite | SOAP EMR draft |
| ผู้ป่วย Instructions | After EMR ลงนามแล้ว | Gemini 2.5 Flash Lite | ผู้ป่วย-friendly instruction sheet |
| AI Triage | นัดหมาย booking | Gemini 2.5 Flash Lite | Urgency level + specialty match |
| CDS Alerts | Prescribing | Gemini 2.5 Flash Lite | Drug interaction warnings |
| RAG Search | AI chat query | pgvector + Gemini | Guideline-informed answers |
| Document Analysis | PDF upload | Gemini 2.5 Flash Lite | Lab/document summary |


### RAG Architecture

```text
Doctor asks clinical question
         │
         ▼
┌─────────────────────┐
│ Generate embedding   │ ← Gemini embedding API
│ for query            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ pgvector similarity  │ ← SELECT * FROM knowledge_base
│ search (cosine)      │   ORDER BY embedding <=> $1
│ Top-K results        │   LIMIT 5
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Gemini Chat +       │ ← Query + RAG context + conversation history
│ Retrieved context    │
└─────────┬───────────┘
          │
          ▼
    AI Response with citations
```

---


## 9. Real-Time Communication


### Socket.IO Event Architecture

```text
┌──── Patient Portal ────┐    ┌──── Doctor Portal ────┐
│ Socket.IO Client        │    │ Socket.IO Client       │
│ Events:                 │    │ Events:                │
│ • appointment:updated   │    │ • appointment:updated  │
│ • notification:new      │    │ • notification:new     │
│ • meeting:updated       │    │ • meeting:updated      │
│ • emr:updated            │    │ • emr:updated           │
│ • phr:updated            │    │ • schedule:updated      │
└──────────┬──────────────┘    └──────────┬─────────────┘
           │                               │
           └───────────────┬───────────────┘
                           ▼
              ┌─── PostgreSQL LISTEN/NOTIFY ───┐
              │                                  │
              │  pg_notify('channel', payload)  │
              │  → pgNotifyListener             │
              │  → Socket.IO broadcast           │
              └──────────────────────────────────┘
```


### Meeting Real-Time Events

| Event | Direction | คำอธิบาย |
| ----- | --------- | ----------- |
| `join-meeting` | Client → Server | Participant joins room |
| `leave-meeting` | Client → Server | Participant leaves |
| `transcript-segment` | Client → Server | New STT text |
| `transcript-update` | Server → Clients | Broadcast transcript |
| `meeting-summary-ready` | Server → Doctor | AI summary generated |
| `recording-started` | Server → Clients | Recording began |
| `lobby-request` | Client → Doctor | Patient waiting |
| `lobby-admit` | Doctor → Server | Admit patient |

---


## 10. ความปลอดภัย Architecture


### Authentication

| ฟีเจอร์ | Implementation |
| ------- | -------------- |
| Password Hashing | bcrypt via pgcrypto |
| JWT Tokens | 3-hour expiry |
| Session Tracking | `sessions` table with IP + user-agent |
| Account Lockout | 5 failed attempts → 15-min lock |
| Password Reset | Time-limited tokens via email |


### Authorization (RBAC)

```text
Public Routes: /login, /register, /reset-password
           │
           ▼
   JWT Middleware → Verify token → Extract role
           │
           ├── Patient: /phr, /appointments, /ai-doctor, /health-library
           ├── Doctor:  /patients, /schedule, /emr, /clinical-resources
           └── Admin:   /admin/*, all doctor routes + approval
```


### PDPA Compliance

| Control | Implementation |
| ------- | -------------- |
| Data Consent | `patient_consents` table — granular consent types |
| Access Logging | `audit_logs` table — every data access recorded |
| Data Minimization | Role-based data filtering at API level |
| แพทย์ Access Control | ผู้ป่วย explicitly grants per-แพทย์ access |
| Consent Revocation | Patients can revoke at any time via PDPA page |

---


## 11. Deployment Architecture


### Local Development

```powershell


# Start all services
docker compose up -d



# Initialize database
node scripts/database/db-tool.cjs --all



# Access


# Patient: <http://localhost:3005>


# Doctor:  <http://localhost:3010>


# pgAdmin: <http://localhost:5050>
```


### Production (Google Cloud)

```text
CI/CD Pipeline:
  git push → Cloud Build → Docker image → Artifact Registry → Cloud Run deploy

Cloud Run Services:
  ├── izara-patient-portal  (1 CPU, 1 GB, 0-2 instances, 300s timeout)
  ├── izara-doctor-portal   (1 CPU, 1 GB, 0-2 instances, 300s timeout)
  └── izara-meeting-server  (1 CPU, 1 Gi, 0-2 instances, 600s timeout)

Database:
  └── PostgreSQL VM (GCE) 35.240.157.230:5432 (NOT Cloud SQL)
```

---


## 12. Directory Structure

```text
Isara-Anywhere/
├── docker-compose.yml          # Local dev orchestration
├── package.json                # Root dependencies
├── playwright.config.ts        # E2E test config
│
├── Isara-patient-portal/       # Patient Portal (React + Express)
│   ├── src/
│   │   ├── pages/              # 15 page components
│   │   ├── components/         # Shared UI components
│   │   ├── contexts/           # AuthContext, SettingsContext
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client services
│   │   └── types/              # TypeScript types
│   ├── server/
│   │   ├── mainApiServer.cjs   # Express API server
│   │   ├── routes/             # API route handlers
│   │   └── services/           # PostgreSQL data service
│   └── public/                 # Static assets
│
├── Isara-doctor-portal/        # Doctor Portal (React + Express)
│   ├── src/                    # 21 pages + modals
│   ├── server/                 # Express API server
│   └── public/
│
├── Izara-jitsi-server/         # Meeting Server (Express + Socket.IO)
│   ├── server/
│   │   ├── index.js            # Main server
│   │   └── services/           # Meeting, AI, transcript services
│   └── recordings/             # Local recording storage
│
├── scripts/
│   ├── database/
│   │   ├── izara-database.sql  # Master schema v5.1.0
│   │   ├── seed-dev-data.sql   # Test data
│   │   ├── db-tool.cjs         # DB management CLI
│   │   └── migrations/         # Schema migrations
│   └── *.ps1 / *.cjs           # Utility scripts
│
├── Processes/                  # Documentation
│   ├── Pages/                  # Page-by-page docs (37 files)
│   ├── Thai/                   # Thai translations
│   └── *.md                    # Workflow docs
│
├── tests/                      # Playwright E2E tests
├── specs/                      # Test specifications
└── Presentations/              # Slides, diagrams, DBML
```

---

Architecture document for Izara Telemedicine Platform v1.6.0