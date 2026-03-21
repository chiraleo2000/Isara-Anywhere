# 🏥 Izara Doctor Portal

![Version](https://img.shields.io/badge/version-1.5.9-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)

> AI-powered telemedicine platform for healthcare providers — clinical workflows, EMR/EHR management, video consultations, e-prescribing, and administrative tools.

---

## 🏗 Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│            Frontend (React + Vite — Port 3010)               │
│  Dashboard │ EMR Editor │ Prescribing │ Queue │ Schedule     │
│  Video Meeting │ AI Copilot │ Admin │ Content Management     │
└─────────────────────────┬────────────────────────────────────┘
                          │ REST API + Socket.IO
┌─────────────────────────▼────────────────────────────────────┐
│          Backend API (Express.js — Port 3009)                │
│  mainApiServer │ authServer │ OWASP Security Middleware      │
│  AI Routes │ EMR │ Appointments │ Patients │ Notifications   │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│          PostgreSQL 18 + pgvector (Primary Database)         │
│   Local: Docker port 5433  │  Cloud: Cloud SQL               │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### For Doctors 👨‍⚕️

| Feature | Description |
| --------- | ------------- |
| 📝 EMR Editor | Thai OPD card format with SOAP notes |
| 💊 E-Prescribing | Drug interaction checks, medication management |
| 🧪 Lab & Imaging Orders | Complete diagnostic workflow |
| 📹 Video Consultations | Jitsi Meet with live transcription |
| 🎙️ AI Meeting Summary | Automatic SOAP notes from transcripts |
| 🤖 AI Clinical Copilot | CDS, document analysis, pre-consultation summary |
| 📊 Patient Queue | Priority-based scheduling |
| 📅 Schedule Management | Calendar views, availability settings |
| 📋 Patient Instructions | Auto-generated post-visit care sheets |

### For Administrators 🔧

| Feature | Description |
| --------- | ------------- |
| 👥 User Management | Doctor, patient, and staff accounts |
| ✅ Doctor Approval | Pending doctor registration workflow |
| 📊 Analytics Dashboard | Appointment statistics and insights |
| 📚 Content Management | Medical articles, clinical resources |
| 🏥 Consultant Directory | Specialist management for referrals |
| ⚙️ System Configuration | Specialties, appointment pools |

---

## 🚀 Quick Start

### With Docker (Recommended)

```bash
# From the root Isara-Anywhere directory
docker compose up -d --build
# Doctor Portal: http://localhost:3010
```

### Local Development

```bash
cd Isara-doctor-portal
npm install
cp .env.example .env   # Edit with your API keys
npm run dev             # Starts both frontend + backend
```

### Test Credentials

| Role | Email | Password |
| ------ | ------- | ---------- |
| Doctor | `doctor.test@izara.com` | `IzaraDoctor@2024` |
| Admin | `admin.test@izara.com` | `IzaraAdmin@2024` |

---

## 📁 Project Structure

```text
Isara-doctor-portal/
├── src/                          # Frontend Source
│   ├── components/               # UI Components
│   │   ├── AIChatCopilot.tsx     #   AI Clinical Copilot
│   │   ├── AIClinicalAssistant.tsx #  CDS integration
│   │   ├── CompleteEMREditor.tsx  #   Full EMR editor
│   │   ├── CompletePrescribing.tsx#   E-prescribing module
│   │   ├── CompleteLabOrders.tsx  #   Lab order management
│   │   ├── LiveTranscription.tsx #   Meeting transcription
│   │   ├── PatientRecordViewer.tsx # Patient record viewer
│   │   ├── common/               #   Auth, Layout, Settings
│   │   ├── notifications/        #   DoctorNotificationBell
│   │   └── ui/                   #   Enhanced UI components
│   ├── pages/                    # 19 route pages
│   ├── hooks/                    # Custom hooks (auth, data, etc.)
│   ├── services/                 # 25 service modules
│   └── types/                    # TypeScript definitions
├── server/                       # Backend API
│   ├── mainApiServer.cjs         # Main API server (6800+ lines)
│   ├── authServer.cjs            # Authentication server
│   ├── startAll.cjs              # Multi-server launcher
│   ├── security/                 # OWASP middleware
│   ├── services/                 # PostgreSQL data service
│   └── routes/                   # AI routes
├── doc/                          # Documentation (20+ files)
├── Dockerfile.unified            # Docker image (frontend + backend)
├── package.json                  # Dependencies & scripts
├── vite.config.ts                # Vite configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## 📡 API Endpoints

| Area | Key Endpoints |
| ------ | --------------- |
| Auth | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` |
| Patients | `GET /api/patients`, `GET /api/patients/:id` |
| EMR | `GET /api/emr/:patientId`, `POST /api/emr` |
| Appointments | `GET /api/appointments`, `POST /api/appointments` |
| Prescriptions | `POST /api/prescriptions`, `GET /api/prescriptions/:patientId` |
| Lab Orders | `POST /api/lab-orders`, `GET /api/lab-orders/:patientId` |
| AI | `POST /api/ai/generate-summary`, `POST /api/ai/clinical-decision` |
| Queue | `GET /api/queue`, `PUT /api/queue/:id/status` |
| Content | `GET /api/content/medical`, `POST /api/content/medical` |
| Notifications | `GET /api/notifications`, `POST /api/notifications` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/doctors/pending` |

---

## ⚙️ Environment Configuration

| Variable | Purpose |
| ---------- | --------- |
| `VITE_API_URL` | Backend API URL (default: `http://localhost:3010`) |
| `VITE_MEETING_SERVER_URL` | Jitsi meeting server URL |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |

---

## 🔒 Security

- **OWASP Top 10:2025** compliant middleware
- **bcrypt** password hashing + **JWT** tokens
- **Role-based access** (Doctor, Admin, Staff)
- **Helmet.js** security headers
- **Man-in-the-Loop AI** — doctor validates all AI outputs

---

## 📄 License

MIT License

---

**Izara Doctor Portal v1.5.9** — AI-powered clinical workflows for Thailand’s healthcare 🏥
