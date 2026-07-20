# Issara Anywhere — Backend & Frontend Overview

**Version:** 1.0.0  
**Last Updated:** July 14, 2026  
**Status:** Active — New-Isara-Anywhere sibling layout  
**Layout:** `issara-workspace` + `../issara-patient` + `../issara-doctor` + `../issara-jitsi`

> **Companion:** [ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md](ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md) · [System_Architecture_Overview.md](System_Architecture_Overview.md) · [Separated_Workflows_And_Functions.md](Separated_Workflows_And_Functions.md)  
> **Page detail (ENRICH-9):** [Pages/Patient-Portal/](Pages/Patient-Portal/) · [Pages/Doctor-Portal/](Pages/Doctor-Portal/) · [Pages/Meeting-Server/](Pages/Meeting-Server/)


## Table of Contents

1. [Platform Split at a Glance](#1-platform-split-at-a-glance)
2. [Backend](#2-backend)
3. [Frontend](#3-frontend)
4. [Data Flow — Patient ↔ Doctor ↔ Meeting](#4-data-flow--patient--doctor--meeting)
5. [Shared Database Touchpoints](#5-shared-database-touchpoints)
6. [Related Processes Docs](#6-related-processes-docs)

---


## 1. Platform Split at a Glance

```text
+-------------------------------------------------------------------------+
|                      FRONTEND (Browser SPA)                             |
|  Patient Vite :3005              Doctor Vite :3010                      |
+---------------+-----------------------------+---------------------------+
                |                             |
                v                             v
+---------------------------+   +-----------------------------------------+
| BACKEND — Patient         |   | BACKEND — Doctor                        |
| Express TS :3004          |   | Auth :3011  ·  Main API :3009           |
+---------------+-----------+   +------------------+----------------------+
                |                                  |
                +------------------+-----------------+
                                   v
                +------------------------------+
                | BACKEND — Meeting            |
                | Express + Socket.IO :3020    |
                +--------------+---------------+
                               v
                +------------------------------+
                | PostgreSQL :5433             |
                | izara_phase1 + pgvector      |
                +------------------------------+
```

| Layer | Patient | Doctor | Meeting |
| ----- | ------- | ------ | ------- |
| Frontend | React+Vite `:3005` | React+Vite `:3010` | *(none — API only)* |
| Backend | Express TS `:3004` | Auth `:3011` + Main `:3009` | Express+Socket.IO `:3020` |
| Repo | `issara-patient` | `issara-doctor` | `issara-jitsi` |

---


# PART A — Backend


## 2. Backend


### 2.1 Patient API (`issara-patient`)

| Item | Value |
| ---- | ----- |
| **Tech stack** | Node.js, Express, TypeScript (`tsx` in dev), `pg`, JWT, bcryptjs, Socket.IO, Gemini SDK |
| **Entry** | `backend/index.ts` |
| **Port** | **3004** (Vite on 3005 proxies `/api` and `/socket.io`) |
| **Auth** | JWT Bearer; lockout / sessions via shared `users` + `sessions` |
| **Meeting bridge** | `backend/routes/video-meeting-proxy.ts` → `MEETING_SERVER_URL` (`:3020`) |
| **Real-time** | Socket.IO server + `backend/pgNotifyListener.ts` (PG LISTEN/NOTIFY) |


#### Main API groups

| Prefix | Purpose |
| ------ | ------- |
| `/api/auth` | Register, login, password reset, session |
| `/api/phr` | Personal health record CRUD |
| `/api/appointments` | Book / list / detail / cancel |
| `/api/appointment-pool` | Unassigned / pool requests |
| `/api/doctors` | Doctor directory for booking |
| `/api/pdpa` | Consent grant / revoke |
| `/api/ai` | Patient AI health chat / triage helpers |
| `/api/content` | Health library articles |
| `/api/video-meeting` | Proxy create/join/status to meeting server |
| `/api/notifications` | In-app notification feed |
| `/api/map` | Facility finder support |
| `/api/settings`, `/api/sync`, `/api/metadata` | Preferences & sync |
| `/api/prescriptions`, `/api/lab-results` | Patient-facing clinical results |
| `/health`, `/api/health` | Liveness / readiness |


#### Sockets (patient)

| Channel / pattern | Use |
| ----------------- | --- |
| Socket.IO on patient API | Notifications, appointment updates |
| PG NOTIFY → broadcast | Cross-service sync (`appointment:updated`, `notification:new`, etc.) |
| Meeting Socket.IO (`:3020`) | Lobby wait, transcript view-only, meeting status (via meeting client) |


#### DB tables touched (high level)

| Domain | Tables |
| ------ | ------ |
| Auth / profile | `users`, `sessions`, `password_resets`, `patient_profiles` |
| Health | `phr`, `vital_signs`, `living_wills`, `patient_consents` |
| Scheduling | `appointments`, appointment pool related rows |
| Content / AI | content tables, AI conversation history (as implemented) |
| Clinical read | `prescriptions`, lab result tables, signed EMR → PHR delivery |
| Comms | `notifications`, `device_tokens` |

---


### 2.2 Doctor Auth + Main API (`issara-doctor`)

| Item | Value |
| ---- | ----- |
| **Tech stack** | Node.js, Express **CommonJS** (`.cjs`), `pg`, JWT, bcrypt, Socket.IO, Gemini, nodemailer |
| **Launcher** | `backend/startAll.cjs` |
| **Auth port** | **3011** — `backend/authServer.cjs` |
| **Main API port** | **3009** — `backend/mainApiServer.cjs` |
| **Uploads / GCS helper** | `backend/gcsApiServer.cjs` |
| **Meeting bridge** | `backend/routes/meetings.cjs` + `/api/video-meeting/*` → `issara-jitsi` |
| **Real-time** | `backend/socketEvents.cjs`, `backend/pgNotifyListener.cjs` |


#### Auth API (`:3011`) — groups

| Area | Purpose |
| ---- | ------- |
| Login / logout | Doctor & admin JWT sessions |
| Registration | Doctor signup → approval workflow |
| Password reset | Tokenized reset |
| Session helpers | `/api/auth/me` style profile aliases (also on main API) |


#### Main API (`:3009`) — groups

| Prefix | Purpose |
| ------ | ------- |
| `/api/dashboard/:doctorId` | Stats for home |
| `/api/doctors`, `/api/doctors/profile` | Directory + own profile |
| `/api/patients`, `/api/patients/:id/phr|emr|ehr` | Patient list + record viewers |
| `/api/emr` | Create / update / sign SOAP EMR |
| `/api/prescriptions` | E-prescribe + patient history |
| `/api/lab-orders`, `/api/imaging-orders` | Orders + results |
| `/api/appointments`, `/api/schedule/:doctorId` | Schedule & appointment CRUD |
| `/api/queue` | Call next / skip / per-doctor queue |
| `/api/ai/*` | Summarize, CDS, pre-consult, chat, specialty match, document analysis |
| `/api/video-meeting/*`, `/api/meetings` | Create/join meeting; proxy to `:3020` |
| `/api/admin/*` | Admin stats, doctor approval, appointment mgmt |
| `/api/notifications` | EMR-signed and clinical notifications |
| `/api/uploads` | Static uploads |


#### Sockets (doctor)

| Channel / pattern | Use |
| ----------------- | --- |
| Socket.IO (doctor backend) | Queue, schedule, notification events |
| Meeting Socket.IO (`:3020`) | Host-present, lobby admit/reject, transcript, summary-ready |
| PG NOTIFY | Same shared channels as patient for cross-portal consistency |


#### DB tables touched (high level)

| Domain | Tables |
| ------ | ------ |
| Users / RBAC | `users`, `sessions`, doctor profile tables |
| Clinical write | EMR tables, `prescriptions`, `lab_orders`, imaging orders |
| Scheduling | `appointments`, queue tables |
| Access | `patient_consents`, audit logs |
| Content / RAG | medical content, `knowledge_base` (+ embeddings) |
| Admin | approval fields on `users`, admin appointment views |

---


### 2.3 Meeting Server (`issara-jitsi`)

| Item | Value |
| ---- | ----- |
| **Tech stack** | Node ≥20, Express ESM, Socket.IO, `pg`, JWT, Gemini, optional Google STT / Whisper |
| **Entry** | `backend/index.js` |
| **Port** | **3020** |
| **Frontend** | None (consumed by both portals) |
| **Video** | Jitsi Meet (JWT bridge for self-hosted when configured) |


#### Main API groups

| Prefix | Purpose |
| ------ | ------- |
| `/api/meetings`, `/api/meetings/create` | List / create meetings |
| `/api/meetings/:id/*` | Status, participants, join-config, identity |
| `/api/meetings/:id/lobby/*` | Join, leave, admit, reject, admit-all |
| `/api/meetings/:id/host-present` | Doctor host signaling |
| Transcript / chat endpoints | Segment ingest; chat aggregation |
| Guest invite / share-link | Tokenized guest join URLs |
| Recording endpoints | Save / serve encrypted recordings |
| Post-meeting AI | Summary / SOAP / CDS / patient instructions pipeline |
| `/health` | Health check |


#### Sockets (meeting)

| Event (representative) | Direction | Meaning |
| ---------------------- | --------- | ------- |
| `join-meeting` / `leave-meeting` | Client → Server | Room presence |
| `transcript-segment` | Client → Server | STT chunk |
| `transcript-update` | Server → Clients | Live transcript |
| Lobby admit / reject | Doctor ↔ Server | Izara lobby control |
| `meeting-summary-ready` | Server → Doctor | AI pipeline finished |
| Chat events | Bidirectional | In-meeting chat |


#### DB tables touched (high level)

| Domain | Tables |
| ------ | ------ |
| Meetings | meeting records, transcripts, chat messages |
| Auth bridge | `sessions` / opaque meeting tokens as implemented |
| Guests | guest invite / token tables |
| AI outputs | summaries linked to appointments / EMR draft fields |
| Recordings | recording metadata (+ files under `RECORDINGS_DIR`) |

> Full table catalog: [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md)

---


# PART B — Frontend


## 3. Frontend


### 3.1 Patient Portal Frontend

| Item | Value |
| ---- | ----- |
| **Tech stack** | React 18, TypeScript, Vite `:3005`, Tailwind (dark/light), React Router v6, Lucide, Socket.IO client |
| **Source root** | `issara-patient/frontend/` |
| **State** | AuthContext, SettingsContext (language/theme), page-local hooks |
| **API base** | Same-origin `/api` → proxied to `:3004` |
| **Meeting** | Full-screen `/meeting/:appointmentId` — wait for host, view-only transcript |


#### Key routes / pages

| Route | Component (typical) | Thai title |
| ----- | ------------------- | ---------- |
| `/login` | LoginPage | เข้าสู่ระบบ |
| `/register` | RegisterPage | สมัครสมาชิก |
| `/reset-password` | ResetPasswordPage | รีเซ็ตรหัสผ่าน |
| `/` | DashboardPage | แดชบอร์ด |
| `/appointments`, `/book-appointment`, `/appointments/:id` | Appointment pages | นัดหมาย |
| `/phr` | PHRPage | ระเบียนสุขภาพ |
| `/ai-doctor` | AIDoctorPage | AI สุขภาพ |
| `/health-library` | MedicalContentLibrary | คลังความรู้ |
| `/map` | MapPage | สถานพยาบาลใกล้เคียง |
| `/pdpa` | PDPAPage | ความเป็นส่วนตัว |
| `/living-will` | LivingWillPage | พินัยกรรมชีวิต |
| `/profile`, `/settings`, `/timeline` | Profile / Settings / Timeline | โปรไฟล์ / ตั้งค่า / ประวัติ |

ENRICH-9 step docs: [Pages/Patient-Portal/00_Patient_Portal_Overview.md](Pages/Patient-Portal/00_Patient_Portal_Overview.md)


#### Layout

```text
+-------------------------------------------------------------------------+
| Header: NotificationBell · Theme · Language · Avatar                    |
+----------+--------------------------------------------------------------+
| Sidebar  |  Page Outlet                                                 |
| Home     |                                                              |
| Appts    |                                                              |
| AI Doc   |                                                              |
| Library  |                                                              |
| PHR      |                                                              |
| Timeline |                                                              |
| Map/PDPA |                                                              |
| Settings |                                                              |
+----------+--------------------------------------------------------------+
```

---


### 3.2 Doctor Portal Frontend

| Item | Value |
| ---- | ----- |
| **Tech stack** | React 18, TypeScript, Vite `:3010`, Tailwind, React Router, Lucide, Socket.IO client, react-big-calendar |
| **Source root** | `issara-doctor/frontend/` |
| **State** | Auth / language / settings hooks; role-gated nav |
| **API** | Proxied to Main API `:3009` and Auth `:3011` |
| **Meeting** | Host `/meeting/:id` — `host-present`, lobby admit-all, STT publish |


#### Key routes / pages

| Route | Component (typical) | Access |
| ----- | ------------------- | ------ |
| `/login`, `/reset-password` | Auth pages | Public |
| `/dashboard` | DoctorDashboard | Doctor/Admin |
| `/schedule` | CompleteSchedule | Doctor/Admin |
| `/patients`, `/patients/:id` | PatientManagement | Doctor/Admin |
| `/health-meeting` | HealthMeeting (queue/pool tabs) | Doctor/Admin |
| `/meeting/:id` | MeetingRoom | Doctor/Admin |
| `/consultants` | MedicalConsultants | Doctor/Admin |
| `/medical-content` | MedicalContent | Doctor/Admin |
| `/clinical-resources` | ClinicalResources | Doctor/Admin |
| `/doctors` | DoctorsManagement | Doctor/Admin |
| `/profile` | DoctorProfilePage | Doctor/Admin |
| `/admin/doctors`, `/admin/appointments` | Admin pages | Admin |


#### Modals / overlays

| Modal | Purpose |
| ----- | ------- |
| EMR Editor | SOAP documentation + AI draft apply |
| Prescribing | E-Rx + CDS checks |
| Lab Orders | Lab & imaging |
| Patient Record Viewer | PHR / EMR / EHR |
| Gemini AI Studio | Clinical chat + calculators |

ENRICH-9 step docs: [Pages/Doctor-Portal/00_Doctor_Portal_Overview.md](Pages/Doctor-Portal/00_Doctor_Portal_Overview.md)

---


### 3.3 Meeting UI surfaces (embedded in portals)

There is **no standalone meeting SPA**. UI lives in portals; logic/state on `:3020`.

| Surface | Portal | Processes page |
| ------- | ------ | -------------- |
| Meeting room (host/patient) | Doctor + Patient | [01_Meeting_Room.md](Pages/Meeting-Server/01_Meeting_Room.md) |
| Meeting results / AI summary | Doctor | [02_Meeting_Results.md](Pages/Meeting-Server/02_Meeting_Results.md) |
| EMR from appointment | Doctor | [03_Emr_Appointment_Page.md](Pages/Meeting-Server/03_Emr_Appointment_Page.md) |

---


## 4. Data Flow — Patient ↔ Doctor ↔ Meeting


### 4.1 Appointment booking → claim → consult

```text
Patient SPA                Patient API              Shared DB               Doctor API                Doctor SPA
    |                          |                       |                        |                         |
    |  POST /api/appointments  |                       |                        |                         |
    |------------------------->|  INSERT appointment   |                        |                         |
    |                          |---------------------->|                        |                         |
    |                          |                       |  NOTIFY / list APIs    |                         |
    |                          |                       |----------------------->|  schedule / pool / queue |
    |                          |                       |                        |------------------------>|
    |                          |                       |  claim / confirm       |                         |
    |                          |                       |<-----------------------|                         |
    |  notification / status   |<----------------------|                        |                         |
    |<-------------------------|                       |                        |                         |
```


### 4.2 Video consult + AI summary

```text
Doctor SPA (:3010)                         Meeting Server (:3020)                         Patient SPA (:3005)
      |                                           |                                              |
      |  create / join + host-present             |                                              |
      |------------------------------------------>|                                              |
      |                                           |  lobby join / waitForHostReady               |
      |                                           |<---------------------------------------------|
      |  lobby/admit-all                          |                                              |
      |------------------------------------------>|  admit -> enter Jitsi                        |
      |                                           |--------------------------------------------->|
      |  transcript-segment (STT)                 |  store + broadcast                           |
      |------------------------------------------>|---------------------- view-only ------------>|
      |  end meeting                              |  Gemini SOAP / CDS / instructions            |
      |------------------------------------------>|                                              |
      |  meeting-summary-ready                    |                                              |
      |<------------------------------------------|                                              |
      |  Apply -> EMR (Doctor Main API :3009)     |                                              |
      |  Sign EMR -> notify patient PHR/timeline  |                                              |
```


### 4.3 Clinical document delivery (post-sign)

```text
Doctor signs EMR / Rx / Lab
        |
        v
Doctor Main API writes clinical tables + notifications
        |
        v
PG NOTIFY / notification APIs
        |
        +---> Patient API -> NotificationBell / Timeline / PHR tabs
        +---> Optional email (doctor SMTP) for confirmations
```

Workflow detail: [Clinical_Document_Delivery_Workflows.md](Clinical_Document_Delivery_Workflows.md) · [Separated_Workflows_And_Functions.md](Separated_Workflows_And_Functions.md) (sections C–G).

---


## 5. Shared Database Touchpoints

All three backends use **`izara_phase1`** on **`localhost:5433`** (local Docker Postgres).

| Portal / service | Primary write domains | Typical read domains |
| ---------------- | --------------------- | -------------------- |
| Patient API | users (patient), phr, appointments (request), consents, living will | doctors, content, signed EMR/Rx/labs, notifications |
| Doctor Auth + Main | users (doctor/admin), EMR, Rx, labs, appointments (confirm/claim), queue | phr (consented), meeting summaries, knowledge_base |
| Meeting server | meetings, transcripts, chat, recordings, AI summary artifacts | appointments/users for room binding |

```text
                    +-----------------+
                    |  izara_phase1   |
                    |  :5433          |
                    +--------+--------+
           +-----------------+-----------------+
           v                 v                 v
    Patient API        Doctor APIs       Meeting Server
       :3004          :3009 / :3011          :3020
```

---


## 6. Related Processes Docs

| Doc | Why |
| --- | --- |
| [ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md](ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md) | Sibling layout, ports, env:sync, npm vs Docker, tests |
| [System_Architecture_Overview.md](System_Architecture_Overview.md) | End-to-end architecture |
| [Separated_Workflows_And_Functions.md](Separated_Workflows_And_Functions.md) | Feature processes A–U |
| [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) | Tables ↔ workflows |
| [Data_Sync_Documentation.md](Data_Sync_Documentation.md) | Sync & NOTIFY |
| [Pages/Patient-Portal/00_Patient_Portal_Overview.md](Pages/Patient-Portal/00_Patient_Portal_Overview.md) | Patient ENRICH-9 hub |
| [Pages/Doctor-Portal/00_Doctor_Portal_Overview.md](Pages/Doctor-Portal/00_Doctor_Portal_Overview.md) | Doctor ENRICH-9 hub |
| [Pages/Meeting-Server/00_Meeting_Server_Overview.md](Pages/Meeting-Server/00_Meeting_Server_Overview.md) | Meeting ENRICH-9 hub |
| [PROCESS_TO_TEST_GATE.md](PROCESS_TO_TEST_GATE.md) | Process → Playwright/Vitest gates |

---

*Backend & Frontend overview for New-Isara-Anywhere sibling layout · July 2026*
