# 🏥 Izara Doctor Portal

![Version](https://img.shields.io/badge/version-0.0.4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)

**AI-Powered Telemedicine Platform for Healthcare Providers**

A complete React + TypeScript + Vite telemedicine application with AI-assisted clinical workflows, EMR/EHR management, appointment scheduling, and comprehensive staff management for healthcare administrators.

---

## 📋 Version Information

| Component | Version | Status |
|-----------|---------|--------|
| **Portal Version** | 0.0.4 | 🔧 Beta |
| **API Version** | v1 | ✅ Development |
| **Documentation** | 2.0.0 | ✅ Updated |
| **Last Updated** | January 2025 | |

### 🆕 What's New in v0.0.4
- 🔧 **Appointment Fix** - Doctors can now see all assigned appointments
- 👁️ **Role-Based Access** - Doctors Management hidden from non-admin users
- 📊 **Real Data Integration** - Dashboard stats use real GCS appointment data
- 🗂️ **Patient Filtering** - Doctors see only patients assigned to them
- ✂️ **UI Cleanup** - Removed demo data from Investigation/Treatment/Refer tabs

### 📚 Documentation
See the full project documentation in `/Documents/`:
- [VERSION_CHANGELOG.md](../Documents/VERSION_CHANGELOG.md) - Version history & roadmap
- [CROSS_PORTAL_WORKFLOWS.md](../Documents/CROSS_PORTAL_WORKFLOWS.md) - Workflows & flowcharts
- [DATA_SYNC_ARCHITECTURE.md](../Documents/DATA_SYNC_ARCHITECTURE.md) - Data synchronization details
- [IMPROVEMENT_PLAN.md](../Documents/IMPROVEMENT_PLAN.md) - Development roadmap

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Health Studio** | AI-powered clinical dashboard with patient health data visualization |
| 📋 **Health Meeting** | Manage meetings with patients, doctors, and consultants |
| 👨‍⚕️ **Doctors Management** | Add, verify, and manage all doctors in the system |
| 🏥 **Medical Consultants** | Directory of specialist consultants for referrals |
| 📚 **Medical Content** | Health education library for patients and staff |
| 📅 **Schedule Management** | Calendar views, appointment booking, availability |
| 🎥 **Video Consultations** | Google Meet integration with AI transcription |
| 📊 **Queue Management** | Real-time patient queue with priority indicators |
| 💊 **EMR/EHR Management** | SOAP notes, templates, auto-save, digital signatures |
| 📧 **Email Integration** | Send meeting invites and communications via Gmail API |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IZARA DOCTOR PORTAL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Dashboard  │  │   Health    │  │   Doctors   │  │  Medical  │  │
│  │             │  │   Meeting   │  │ Management  │  │  Content  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Patients   │  │  Schedule   │  │ Consultants │  │ Resources │  │
│  │             │  │             │  │             │  │           │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                          SERVICES LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  Auth │ Patient Data │ EMR │ Appointments │ Gemini AI │ GCS Storage │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE CLOUD PLATFORM                          │
├─────────────────────────────────────────────────────────────────────┤
│  Cloud Storage │ Gemini AI │ Calendar API │ Gmail API │ Meet API   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server (frontend + all backend services)
npm run dev
```

The application will be available at: **http://localhost:3010**

### Demo Login

```
Email:    demo.example@hospitalx.com
Password: Password123!
Role:     Admin Doctor
```

---

## 📁 Project Structure

```
Isara-doctor-portal/
├── src/
│   ├── pages/                    # Main page components
│   │   ├── DoctorPortal.tsx      # Main portal with routing
│   │   ├── DoctorDashboard.tsx   # Health Studio dashboard
│   │   ├── HealthMeeting.tsx     # Meeting management
│   │   ├── MedicalConsultants.tsx # Consultant directory
│   │   ├── DoctorsManagement.tsx # Doctor management
│   │   ├── MedicalContent.tsx    # Health content library
│   │   ├── PatientManagement.tsx # Patient list & details
│   │   ├── CompleteSchedule.tsx  # Calendar & scheduling
│   │   ├── QueueManagement.tsx   # Patient queue
│   │   ├── ClinicalResources.tsx # Medical resources
│   │   ├── VirtualMeeting.tsx    # Video consultations
│   │   ├── GeminiAIStudio.tsx    # AI assistant
│   │   └── LoginPage.tsx         # Authentication
│   │
│   ├── components/               # Reusable UI components
│   │   ├── common/               # Layout & auth components
│   │   │   ├── AuthProvider.tsx
│   │   │   └── ResponsiveLayout.tsx
│   │   ├── ui/                   # UI elements
│   │   ├── CompleteEMREditor.tsx # EMR editor
│   │   ├── CompletePrescribing.tsx
│   │   ├── PatientRecordViewer.tsx
│   │   └── AIChatCopilot.tsx
│   │
│   ├── services/                 # Business logic & API
│   │   ├── authServices.ts       # Authentication
│   │   ├── patientDataService.ts # Patient data
│   │   ├── gcsDataService.ts     # GCS operations
│   │   ├── geminiClinicalService.ts # AI features
│   │   ├── appointmentService.ts # Appointments
│   │   ├── emrService.ts         # EMR operations
│   │   └── ...
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useResponsive.ts
│   │   └── ...
│   │
│   ├── types/                    # TypeScript definitions
│   │   └── index.ts
│   │
│   ├── assets/                   # SVG icons & images
│   │   └── NewSvgIcons.tsx
│   │
│   ├── App.tsx                   # Main app component
│   └── index.tsx                 # Entry point
│
├── server/                       # Backend API servers
│   ├── authServer.cjs            # Authentication server
│   ├── mainApiServer.cjs         # Main API server
│   └── gcsApiServer.cjs          # GCS API server
│
├── public/                       # Static assets
│   └── mockData/                 # Mock data files
│
├── scripts/                      # Utility scripts
│
├── docker/                       # Docker configurations
│   ├── auth.Dockerfile
│   ├── main-api.Dockerfile
│   └── gcs-api.Dockerfile
│
├── Dockerfile                    # Main Dockerfile
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 📚 Documentation

For comprehensive documentation, please see the [`/doc`](./doc/README.md) folder:

| Document | Description |
|----------|-------------|
| [📋 Documentation Index](./doc/README.md) | Main documentation hub |
| [📜 Changelog](./doc/CHANGELOG.md) | Version history & changes |
| [🏗️ Architecture](./doc/overview/architecture.md) | Technical architecture |
| [🔄 Workflows Overview](./doc/workflows/workflows-overview.md) | All system workflows |
| [📊 System Overview](./doc/overview/system-overview.md) | System description |
| [🛠️ Technology Stack](./doc/overview/technology-stack.md) | Technologies used |

---

## 🔧 Workflows & Dataflow

### Authentication Flow
```
User Login → Auth Server → Validate Credentials → GCS User Data → JWT Token → Session
```

### Patient Data Flow
```
Doctor → Select Patient → GCS API → Fetch EMR/Labs/Prescriptions → Display in Health Studio
```

### Meeting Flow
```
Schedule Meeting → Send Invites (Gmail API) → Add to Calendar (Calendar API) → Join Meeting (Meet)
```

### AI Clinical Workflow
```
Patient Data → Gemini AI → Clinical Analysis → Diagnosis Suggestions → Treatment Plan
```

---

## 🗄️ Database Structure

### Google Cloud Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `izara-users-credentials` | User authentication data |
| `izara-doctors-data` | Doctor profiles and settings |
| `izara-patients-data` | Patient records and history |
| `izara-appointments` | Appointment schedules |
| `izara-meta-data` | System metadata |

### Data Schema Overview

```
Patient Record
├── id: string
├── demographics
│   ├── name, age, gender
│   ├── dateOfBirth, idNumber
│   ├── phone, email, address
│   └── photo
├── medicalInfo
│   ├── bloodType, height, weight
│   ├── allergies[]
│   ├── chronicConditions[]
│   └── currentMedications[]
├── consentRecords[]
└── insuranceInfo

Doctor Record
├── id, name, email
├── specialty, department
├── licenseNumber
├── status, isVerified
└── languages[]

Meeting Record
├── id, title
├── date, time, duration
├── meetingLink
├── participants[]
└── type, status
```

---

## 🤖 AI Features (Gemini Integration)

### Health Studio
- Real-time clinical suggestions during consultations
- Differential diagnosis assistance
- Drug interaction warnings
- Treatment recommendations

### AI Chat Copilot
- Clinical queries and responses
- Patient context-aware assistance
- Medical calculations (BMI, GFR, etc.)

### Document Generation
- Auto-fill EMR content from consultation
- Prescription generation
- Discharge summary creation (Thai/English)

---

## 📱 Navigation Menu

| Tab | Description |
|-----|-------------|
| **Dashboard** | Health Studio with patient results and AI |
| **Schedule** | Calendar and appointment management |
| **Patients** | Patient list and medical records |
| **Consultations** | Queue and video consultations |
| **Health Meeting** | Meeting scheduler with participants |
| **Medical Consultants** | Specialist directory |
| **Doctors** | Doctor staff management |
| **Medical Content** | Health education library |
| **Clinical Resources** | Medical guidelines and references |

---

## 🔐 Environment Configuration

Key environment variables in `.env`:

```env
# API URLs
VITE_API_URL=http://localhost:3009
VITE_AUTH_URL=http://localhost:3011/auth
VITE_DOCTOR_URL=http://localhost:3010

# Google Cloud
VITE_GCP_PROJECT_ID=izara-telemedicine
VITE_GOOGLE_CLIENT_ID=your-client-id

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite

# Google APIs
VITE_GOOGLE_CALENDAR_API_KEY=your-api-key
VITE_GOOGLE_MEET_API_KEY=your-api-key
VITE_GOOGLE_GMAIL_API_KEY=your-api-key

# GCS Buckets
VITE_GCS_BUCKET_DOCTOR=izara-doctors-data
VITE_GCS_BUCKET_PATIENT=izara-patients-data
```

---

## 🛠️ Development

### Available Scripts

```bash
# Start development (all services)
npm run dev

# Start frontend only
npm run dev:frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

### Port Configuration

| Service | Port |
|---------|------|
| Frontend | 3010 |
| Main API | 3009 |
| Auth Server | 3011 |
| GCS API | 3012 |

---

## 🚢 Deployment

### Docker Build

```bash
# Build the Docker image
docker build -t izara-doctor-portal .

# Run the container
docker run -p 80:80 izara-doctor-portal
```

---

## 📞 Support

For questions or issues, please contact the Izara development team.

---

## 📄 License

Copyright © 2024 Izara Healthcare. All rights reserved.
