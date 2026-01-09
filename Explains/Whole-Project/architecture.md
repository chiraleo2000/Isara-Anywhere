# Izara Telehealth - System Architecture

## 🏗️ Overview

Izara is a telehealth platform with two web portals sharing cloud backend services.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          IZARA TELEHEALTH                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐         ┌─────────────────┐                  │
│   │  Patient Portal │         │  Doctor Portal  │                  │
│   │  (React + Vite) │         │  (React + Vite) │                  │
│   │  localhost:3005 │         │  localhost:3010 │                  │
│   └────────┬────────┘         └────────┬────────┘                  │
│            │                           │                            │
│            └───────────┬───────────────┘                            │
│                        │                                            │
│            ┌───────────┴───────────┐                                │
│            ▼                       ▼                                │
│   ┌─────────────────┐     ┌─────────────────┐                      │
│   │   Auth Server   │     │   GCS API       │                      │
│   │   (Express.js)  │     │   (Express.js)  │                      │
│   │   port: 3011    │     │   port: 3012    │                      │
│   └────────┬────────┘     └────────┬────────┘                      │
│            │                       │                                │
│            └───────────┬───────────┘                                │
│                        │                                            │
│                        ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │              Google Cloud Storage (5 Buckets)               │  │
│   ├───────────┬────────────┬────────────┬──────────┬────────────┤  │
│   │ users-    │ users-     │ patients-  │ doctors- │ appoint-   │  │
│   │ auth      │ credentials│ data       │ data     │ ments      │  │
│   └───────────┴────────────┴────────────┴──────────┴────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Services

| Service | Port | Purpose |
|---------|------|---------|
| Patient Portal | 3005 | Patient web app (Vite dev server) |
| Doctor Portal | 3010 | Doctor/Admin web app (Vite dev server) |
| Patient Backend | 3004 | Patient-specific backend API |
| Doctor Main API | 3009 | Doctor clinical operations |
| Auth Server | 3011 | Authentication with bcrypt |
| GCS API | 3012 | Google Cloud Storage proxy |

---

## 📦 GCS Buckets

| Bucket | Purpose |
|--------|---------|
| `izara-users-auth` | Patient auth data |
| `izara-users-credentials` | Doctor/Admin auth data |
| `izara-patients-data` | Patient PHR and profiles |
| `izara-doctors-data` | Doctor profiles |
| `izara-appointments` | Appointment records |
| `izara-meta-data` | Clinical resources, consultants |

---

## 🔄 Data Flow

### Patient Booking → Doctor Consultation

```
Patient Portal                      Doctor Portal
     │                                   │
     │ 1. Book appointment               │
     │    POST /api/appointments         │
     │         │                         │
     │         ▼                         │
     │   ┌──────────────┐               │
     │   │ izara-appt   │               │
     │   │ status:      │               │
     │   │ 'pending'    │               │
     │   └──────────────┘               │
     │         │                         │
     │         │ 2. Appears in queue     │
     │         └─────────────────────────▶
     │                                   │
     │                              3. Doctor confirms
     │                                 POST /api/appointments/confirm
     │                                   │
     │                                   ▼
     │                            ┌──────────────┐
     │                            │ status:      │
     │                            │ 'confirmed'  │
     │                            │ + meetLink   │
     │                            └──────────────┘
     │                                   │
     │◀──────────────────────────────────┘
     │  4. Status update visible
     │
```

### EMR Creation → Treatment Results

```
Doctor Portal                       Patient Portal
     │                                   │
     │ 1. Create EMR                     │
     │    in appointment                 │
     │         │                         │
     │         ▼                         │
     │   ┌──────────────┐               │
     │   │ EMR Saved    │               │
     │   │ aiSummary    │               │
     │   │ status:done  │               │
     │   └──────────────┘               │
     │         │                         │
     │         │ 2. Appears in results   │
     │         └─────────────────────────▶
     │                                   │
     │                              3. Patient views
     │                                 treatment summary
```

---

## 🔐 Authentication Architecture

### Patient Auth (izara-users-auth)
```
┌─────────────────────────────────────┐
│           Patient Auth              │
├─────────────────────────────────────┤
│ Sessions: sessions/{token}.json     │
│ Users:    users/index.json          │
│           users/{userId}.json       │
│ History:  login-history/{id}.json   │
└─────────────────────────────────────┘
```

### Doctor Auth (izara-users-credentials)
```
┌─────────────────────────────────────┐
│           Doctor Auth               │
├─────────────────────────────────────┤
│ Sessions: sessions/{token}.json     │
│ Users:    users/index.json          │
│           users/{userId}.json       │
│ History:  login-history/{id}.json   │
│ Pending:  pending-approvals.json    │
└─────────────────────────────────────┘
```

---

## 🛡️ Security Layers

```
┌─────────────────────────────────────┐
│          Client Request             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│       Rate Limiting (10/15min)      │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│         CORS Validation             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│         Helmet Security             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│      XSS/SQL Injection Check        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│       Session Validation            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│       Route Authorization           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│         Business Logic              │
└─────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
Isara-anywhere-V0.0.3/
├── Isara-patient-portal/     # Patient web app
│   ├── src/                  # React source
│   ├── server/               # Express backends
│   └── Dockerfile            # Container config
│
├── Isara-doctor-portal/      # Doctor web app
│   ├── src/                  # React source
│   ├── server/               # Express backends
│   └── Dockerfile            # Container config
│
├── Explains/                 # Organized documentation
├── Presentations/            # Workflow diagrams & HTML presentations
├── Processes/                # Business process documentation
├── scripts/                  # Utilities & tests
└── data/                     # Schema references
```

---

## 🚀 Startup Commands

### Development

```powershell
# Patient Portal (all services)
cd Isara-patient-portal
npm run dev

# Doctor Portal (all services)
cd Isara-doctor-portal
npm run dev
```

### Individual Services

```powershell
# Auth Server (port 3011)
cd Isara-doctor-portal/server
node authServer.cjs

# GCS API (port 3012)
cd Isara-doctor-portal/server
node gcsApiServer.cjs

# Patient Frontend (port 5174)
cd Isara-patient-portal
npm run dev

# Doctor Frontend (port 5173)
cd Isara-doctor-portal
npm run dev
```

---
**Last Updated:** January 9, 2026
**Version:** 1.2.1
