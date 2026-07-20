# Issara Anywhere — Project คำอธิบาย (New Sibling Layout)

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md`](../ISSARA_ANYWHERE_PROJECT_DESCRIPTION.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.0.0  
**อัปเดตล่าสุด:** July 14, 2026  
**สถานะ:** Active — New-Isara-Anywhere sibling layout  
**Workspace file:** `issara-workspace.code-workspace`


> **Related:** [System_Architecture_Overview.md](System_Architecture_Overview.md) · [BACKEND_AND_FRONTEND_OVERVIEW.md](BACKEND_AND_FRONTEND_OVERVIEW.md) · [Separated_Workflows_And_Functions.md](Separated_Workflows_And_Functions.md) · [Pages/](Pages/) (**ENRICH-9** page docs)


## สารบัญ

1. [What Is Issara Anywhere](#1-what-is-issara-anywhere)
2. [Sibling Repository Layout](#2-sibling-repository-layout)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Frontend Overview](#4-frontend-overview)
5. [Backend Overview](#5-backend-overview)
6. [Ports & Network Map](#6-ports--network-map)
7. [Environment & Env Sync](#7-environment--env-sync)
8. [Local Run (npm vs Docker)](#8-local-run-npm-vs-docker)
9. [Test Strategy](#9-test-strategy)
10. [Links to Existing Processes Docs](#10-links-to-existing-processes-docs)

---


## 1. What Is Issara Anywhere

**Issara Anywhere** (Izara / อิสรา) is a **three-portal telemedicine platform** for Thai healthcare. It connects patients, doctors, and admins through video consultations with AI-assisted clinical workflows using the **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)** principle:

> AI serves as a clinical assistant. Doctors retain final decision authority on all clinical outputs.

This document describes the **New-Isara-Anywhere** layout: four sibling folders under one parent directory, orchestrated from `issara-workspace`.


### Core Capabilities

| Area | Summary |
| ---- | ------- |
| พอร์ทัลผู้ป่วย | จองนัด นัดหมาย, join video visits, manage PHR / PDPA / หนังสือแสดงเจตจำนอง, AI health chat |
| พอร์ทัลแพทย์ | Schedule, EMR, prescribe, labs, queue, AI clinical studio, ผู้ดูแลระบบ approval |
| Meeting Server | Lobby, transcript, recording, Gemini หลังประชุม SOAP pipeline |
| Shared DB | PostgreSQL `izara_phase1` + pgvector (LISTEN/NOTIFY for real-time sync) |

---


## 2. Sibling Repository Layout

```text
New-Isara-Anywhere/
├── issara-workspace/          <- Orchestration hub (open this in Cursor/VS Code)
│   ├── Processes/             <- Workflow & page documentation (this folder)
│   ├── scripts/               <- env sync, DB tools, utilities
│   ├── tests/                 <- Playwright UI + Vitest unit
│   ├── docker-compose.yml     <- Optional containerized portal stack
│   ├── package.json           <- npm run install:all / dev / test:*
│   ├── .env.docker            <- Canonical secrets for local npm + sync
│   ├── .env                   <- Generated for workspace tests
│   └── issara-workspace.code-workspace
│
├── issara-patient/            <- Patient portal (React+Vite :3005, Express TS :3004)
├── issara-doctor/             <- Doctor portal (Vite :3010, Auth :3011, Main API :3009)
└── issara-jitsi/              <- Meeting server (Express + Socket.IO :3020)
```


### Role of `issara-workspace`

| Responsibility | How |
| -------------- | --- |
| Multi-root IDE | `issara-workspace.code-workspace` opens workspace + three siblings |
| Install all | `npm run install:all` |
| Run all locally | `npm run dev` (concurrently jitsi + ผู้ป่วย + แพทย์) |
| Env distribution | `npm run env:sync` from `.env.docker` → portal `.env` + workspace `.env` |
| Tests | Vitest (`test:unit`) + Playwright headed UI (`test:e2e:*`) |
| Process docs | `Processes/` including ENRICH-9 page specs under `Pages/` |

---


## 3. Architecture Diagram

```text
+-----------------------------------------------------------------------------+
|                 ISSARA ANYWHERE (New-Isara-Anywhere)                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +---------------------+  +---------------------+  +---------------------+  |
|  |  issara-patient     |  |  issara-doctor      |  |  issara-jitsi       |  |
|  |  Patient Portal     |  |  Doctor Portal      |  |  Meeting Server     |  |
|  |                     |  |                     |  |                     |  |
|  |  Vite SPA  :3005    |  |  Vite SPA  :3010    |  |  Express+Socket.IO  |  |
|  |  Express TS :3004   |  |  Auth API  :3011    |  |  :3020              |  |
|  |  (proxy /api->3004) |  |  Main API  :3009    |  |  Lobby / Transcript |  |
|  |  15+ pages          |  |  21 pages + modals  |  |  AI pipeline / Rec  |  |
|  +----------+----------+  +----------+----------+  +----------+----------+  |
|             | HTTP / WS              | HTTP / WS              | HTTP / WS   |
|             +------------------------+------------------------+             |
|                                      |                                      |
|                                      v                                      |
|             +---------------------------------------------+                 |
|             |  PostgreSQL 18 + pgvector                   |                 |
|             |  Docker host port :5433 -> DB izara_phase1  |                 |
|             |  LISTEN/NOTIFY -> Socket.IO broadcast       |                 |
|             +---------------------------------------------+                 |
|                                      |                                      |
|             +------------------------+------------------------+             |
|             v                        v                        v             |
|      +-------------+          +-------------+          +-------------+      |
|      | Gemini AI   |          | Jitsi Meet  |          | Web Speech  |      |
|      | (SOAP/CDS)  |          | (WebRTC)    |          | API (STT)   |      |
|      +-------------+          +-------------+          +-------------+      |
|                                                                             |
|  Orchestration: issara-workspace (compose / concurrently / env:sync / tests)|
+-----------------------------------------------------------------------------+
```


### Cross-Portal Meeting Flow (high level)

```text
Patient SPA (:3005)          Doctor SPA (:3010)           Meeting Server (:3020)
      |                            |                              |
      |  /api/video-meeting/*      |  /api/video-meeting/*        |
      |  (patient backend proxy)   |  (doctor meetings routes)    |
      +------------+---------------+--------------+---------------+
                   |                              |
                   +-------- HTTP + Socket.IO ----+
                                  |
                                  v
                         Jitsi room + lobby
                         transcript / chat / AI summary
```

---


## 4. Frontend ภาพรวม


### พอร์ทัลผู้ป่วย (`issara-patient`)

| Item | Detail |
| ---- | ------ |
| Stack | React 18 + TypeScript, Vite, Tailwind, React Router v6, Socket.IO client |
| Dev URL | `http://localhost:3005` |
| Entry | `frontend/` (alias `@` → frontend) |
| Layout | `MainLayout` — sidebar + header (การแจ้งเตือน, theme, language, avatar) |
| Language | Thai primary / English toggle |
| Meeting UI | In-app full-screen room `/meeting/:appointmentId` (`PatientMeetingRoom`) — doctor hosts; patient waits in Izara lobby |

**Key routes (see ENRICH-9 pages for ขั้นตอน-level detail):**

| Route | Page | Processes doc |
| ----- | ---- | ------------- |
| `/login`, `/register`, `/reset-password` | Auth | [Pages/Patient-Portal/01–03](Pages/Patient-Portal/) |
| `/` | Dashboard | [04_Dashboard_Page.md](Pages/Patient-Portal/04_Dashboard_Page.md) |
| `/appointments`, `/book-appointment` | Appointments | [05_Appointments_Page.md](Pages/Patient-Portal/05_Appointments_Page.md) |
| `/phr` | PHR | [06_PHR_Page.md](Pages/Patient-Portal/06_PHR_Page.md) |
| `/ai-doctor` | AI Health | [07_AI_Doctor_Page.md](Pages/Patient-Portal/07_AI_Doctor_Page.md) |
| `/health-library` | Content | [08_Medical_Content_Library.md](Pages/Patient-Portal/08_Medical_Content_Library.md) |
| `/map`, `/pdpa`, `/living-will` | Map / PDPA / Will | [09–11](Pages/Patient-Portal/) |
| `/profile`, `/settings`, `/timeline` | Profile / Settings / Timeline | [12–14](Pages/Patient-Portal/) |


### พอร์ทัลแพทย์ (`issara-doctor`)

| Item | Detail |
| ---- | ------ |
| Stack | React 18 + TypeScript, Vite, Tailwind, React Router, Socket.IO client |
| Dev URL | `http://localhost:3010` |
| Entry | `frontend/` |
| Roles | แพทย์ + ผู้ดูแลระบบ (RBAC on ผู้ดูแลระบบ routes) |
| Meeting UI | Host room `/meeting/:appointmentId` (`MeetingRoom` + Izara lobby admit) |

**Key routes:**

| Route | Page | Access |
| ----- | ---- | ------ |
| `/login`, `/reset-password` | Auth | Public |
| `/dashboard` | Doctor dashboard | Doctor/Admin |
| `/schedule` | Calendar | Doctor/Admin |
| `/patients`, `/patients/:id` | Patient management | Doctor/Admin |
| `/health-meeting` | Appointments, queue, pool | Doctor/Admin |
| `/meeting/:id` | Full-screen Jitsi host | Doctor/Admin |
| `/consultants`, `/medical-content`, `/clinical-resources` | Clinical tools | Doctor/Admin |
| `/profile` | Doctor profile | Doctor/Admin |
| `/admin/doctors`, `/admin/appointments` | Admin | Admin only |

**Modals (clinical workflow):** EMR Editor · Prescribing · คำสั่งตรวจแล็บ · ผู้ป่วย Record Viewer · Gemini AI Studio

Page-level ENRICH-9 docs: [Pages/Doctor-Portal/](Pages/Doctor-Portal/)

---


## 5. Backend ภาพรวม


### ผู้ป่วย API (`issara-patient` — Express TypeScript `:3004`)

| Item | Detail |
| ---- | ------ |
| Entry | `backend/index.ts` (`tsx watch` in dev) |
| Auth | JWT + bcrypt; routes under `/api/auth` |
| Proxy pattern | Vite `:3005` proxies `/api`, `/socket.io` → `:3004` |
| Meeting | `backend/routes/video-meeting-proxy.ts` → `issara-jitsi:3020` |
| Real-time | Socket.IO + `pgNotifyListener.ts` |

**Main API groups:** `/api/auth`, `/api/phr`, `/api/appointments`, `/api/appointment-pool`, `/api/doctors`, `/api/pdpa`, `/api/ai`, `/api/content`, `/api/video-meeting`, `/api/notifications`, `/api/map`, `/api/settings`, `/api/sync`


### แพทย์ Auth + Main API (`issara-doctor`)

| Process | Port | Entry |
| ------- | ---- | ----- |
| Auth server | **3011** | `backend/authServer.cjs` — login, register, session |
| Main API | **3009** | `backend/mainApiServer.cjs` — clinical + ผู้ดูแลระบบ APIs |
| GCS/uploads helper | (via startAll) | `backend/gcsApiServer.cjs` |
| Launcher | — | `backend/startAll.cjs` (`npm run backend`) |

**Main API groups:** `/api/dashboard`, `/api/doctors`, `/api/patients` (+ phr/emr/ehr), `/api/emr`, `/api/prescriptions`, `/api/lab-orders`, `/api/imaging-orders`, `/api/appointments`, `/api/schedule`, `/api/queue`, `/api/ai/*`, `/api/video-meeting/*`, `/api/meetings`, `/api/admin/*`, `/api/notifications`


### Meeting Server (`issara-jitsi` — Express + Socket.IO `:3020`)

| Item | Detail |
| ---- | ------ |
| Entry | `backend/index.js` (ESM, nodemon in dev) |
| Responsibilities | Room create/join/end, Izara lobby, transcript segments, chat, guest invites, recordings, Gemini หลังประชุม pipeline |
| Video | Jitsi Meet (domain from env — e.g. `meet.jit.si` or self-hosted) |
| Docs | [Pages/Meeting-Server/00_Meeting_Server_Overview.md](Pages/Meeting-Server/00_Meeting_Server_Overview.md) |

---


## 6. Ports & Network Map

| Port | Service | Repo |
| ---- | ------- | ---- |
| **3004** | ผู้ป่วย Express API | `issara-patient` |
| **3005** | ผู้ป่วย Vite SPA (+ proxies API) | `issara-patient` |
| **3009** | แพทย์ Main API | `issara-doctor` |
| **3010** | แพทย์ Vite SPA | `issara-doctor` |
| **3011** | แพทย์ Auth API | `issara-doctor` |
| **3020** | Meeting Server | `issara-jitsi` |
| **5433** | PostgreSQL (Docker on host) → `izara_phase1` | Shared |

```text
Browser
  ├── http://localhost:3005  → Patient UI  --proxy--> :3004 Patient API
  ├── http://localhost:3010  → Doctor UI   --proxy--> :3009 / :3011
  └── http://localhost:3020  → Meeting API / Socket.IO (direct or via portal proxies)
         |
         └── PostgreSQL localhost:5433 / izara_phase1
```

---


## 7. Environment & Env Sync

Canonical secrets live in **`issara-workspace/.env.docker`**.

```powershell
# From issara-workspace
npm run env:sync        # write portal + workspace .env files
npm run env:sync:dry    # preview only
```

| Output path | Purpose |
| ----------- | ------- |
| `../issara-patient/.env` | Patient API + Vite (canonical keys; no `VITE_*` required) |
| `../issara-doctor/.env` | Doctor auth + main API + frontend |
| `../issara-jitsi/.env` | Meeting server |
| `issara-workspace/.env` | Vitest / Playwright / gate scripts |

**Local DB defaults after sync:** `DB_HOST=localhost`, `DB_PORT=5433`, `DB_NAME=izara_phase1`.

> Re-run `env:sync` after changing shared secrets (JWT, Gemini, Jitsi, DB password) in `.env.docker`.

---


## 8. Local Run (npm vs Docker)


### Recommended: npm concurrent dev (sibling layout)

```powershell
# 1) Ensure Postgres is up on localhost:5433 / izara_phase1

# 2) From issara-workspace
npm install
npm run install:all
npm run env:sync
npm run dev
```

| Script | Effect |
| ------ | ------ |
| `npm run install:all` | `npm install` in jitsi + patient + doctor |
| `npm run env:sync` | Propagate `.env.docker` |
| `npm run dev` | Concurrently: jitsi · patient (`dev:all`) · doctor (`dev`) |
| `npm run dev:patient` | Patient only |
| `npm run dev:doctor` | Doctor only |
| `npm run dev:jitsi` | Meeting server only |

**Open:** ผู้ป่วย `http://localhost:3005` · แพทย์ `http://localhost:3010` · Meeting health `http://localhost:3020/health`


### Optional: Docker Compose

`docker-compose.yml` builds/runs `issara-jitsi`, `issara-patient`, `issara-doctor` on the shared Docker network and connects to PostgreSQL via `DB_HOST` / `DB_INTERNAL_PORT` from `.env`.

| Mode | When to use |
| ---- | ----------- |
| **npm run dev** | Day-to-day ฟีเจอร์ work, hot reload, Playwright headed UI |
| **docker compose** | Closer-to-prod container stack / shared server deploy |

> Compose contexts and paths may assume a layout where portal folders are compose build contexts; for the **sibling** layout, prefer `npm run dev` unless your compose file has been adjusted for `../issara-*` contexts.

---


## 9. Test Strategy


### Unit — Vitest

```powershell
npm run test:unit       # tests/unit
npm run test:unit:ui    # Vitest UI
```

Fast, headless checks for helpers, mappers, and pure logic under `tests/unit`.


### UI / E2E — Playwright (headed + screenshots)

Config: `playwright.config.ts` — matches `tests/group-*.ui-test.ts`, screenshots **on**, Thai locale, 1440×900.

```powershell
npm run test:e2e              # default (headless unless PW_HEADED)
npm run test:e2e:headed       # PW_HEADED=1 --headed
npm run test:e2e:auth         # project A-auth headed
npm run test:e2e:ui-showup    # A-auth + B-patient + C-doctor + BASELINE_VISUAL=1
```

| Project | Scope | Base URL |
| ------- | ----- | -------- |
| `A-auth` | Auth / access | Patient `:3005` |
| `B-patient` | Patient portal flows | Patient `:3005` |
| `C-doctor` | Doctor portal flows | Doctor `:3010` |
| `P-workflow-screenshots` | Workflow screenshot capture | Patient |
| `S-responsive` | Responsive checks | Patient |
| `U-ui-audit` | UI element audit | Patient |

**Prerequisites:** portals + Meeting Server running (`npm run dev`), env synced, Postgres available. Artifacts: `tests/output/test-results`, HTML report `reports/playwright-html`.

**Coverage matrix / gates:** see [PROCESS_TO_TEST_GATE.md](PROCESS_TO_TEST_GATE.md) and `tests/PROCESS_COVERAGE_MATRIX.md` when present.

---


## 10. Links to Existing Processes Docs


### Architecture & workflows

| Document | Purpose |
| -------- | ------- |
| [System_Architecture_Overview.md](System_Architecture_Overview.md) | Full platform architecture (stack, AI, security, deploy) |
| [BACKEND_AND_FRONTEND_OVERVIEW.md](BACKEND_AND_FRONTEND_OVERVIEW.md) | Sibling-layout BE/FE split (ports, APIs, data flow) |
| [Separated_Workflows_And_Functions.md](Separated_Workflows_And_Functions.md) | Process A–U by ฟีเจอร์ |
| [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md) | Connection diagrams |
| [README.md](README.md) | Processes hub / document index |
| [DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md) | Table → workflow index |
| [PostgreSQL_Database_Architecture.md](PostgreSQL_Database_Architecture.md) | Schema detail |
| [Data_Sync_Documentation.md](Data_Sync_Documentation.md) | Cross-portal sync |
| [Clinical_Document_Delivery_Workflows.md](Clinical_Document_Delivery_Workflows.md) | Post-visit ส่งมอบเอกสาร |
| [PROCESS_TO_TEST_GATE.md](PROCESS_TO_TEST_GATE.md) | Process → test mapping |


### ENRICH-9 page documentation

Page docs under `Processes/Pages/*` follow the **ENRICH-9** standard (รายงานภาษาไทย structure: context → 8–12 steps with `data-testid` → expected outcomes · Word TH Sarabun New / PPT FC Iconic).

| Portal | Index |
| ------ | ----- |
| ผู้ป่วย | [Pages/Patient-Portal/00_Patient_Portal_Overview.md](Pages/Patient-Portal/00_Patient_Portal_Overview.md) |
| แพทย์ | [Pages/Doctor-Portal/00_Doctor_Portal_Overview.md](Pages/Doctor-Portal/00_Doctor_Portal_Overview.md) |
| Meeting | [Pages/Meeting-Server/00_Meeting_Server_Overview.md](Pages/Meeting-Server/00_Meeting_Server_Overview.md) |
| Pages README | [Pages/README.md](Pages/README.md) |


### Thai translations

| Hub | Path |
| --- | ---- |
| Thai Processes | [Thai/README_TH.md](Thai/README_TH.md) |
| Thai Pages | [Thai/Pages/README_TH.md](Thai/Pages/README_TH.md) |

---

*Issara Anywhere project คำอธิบาย for New-Isara-Anywhere sibling layout · July 2026*