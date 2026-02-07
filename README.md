# 🏥 Izara Telemedicine Platform

![Version](https://img.shields.io/badge/version-1.4.5-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Local Tests](https://img.shields.io/badge/local%20tests-123%20passing-brightgreen.svg)
![Cloud Tests](https://img.shields.io/badge/cloud%20tests-123%20passing-brightgreen.svg)
![Skipped Tests](https://img.shields.io/badge/skipped%20tests-0-brightgreen.svg)
![SonarQube](https://img.shields.io/badge/SonarQube-passed-brightgreen.svg)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-deployed-blue.svg)

## A comprehensive telemedicine platform built for Thailand's healthcare system

[Features](#-key-features) • [Installation](#-installation--setup) • [Testing](#-testing) • [Deployment](#-cloud-deployment)

---

## 📖 Overview

**Izara Telemedicine** (อิสระ เทเลเมดิซิน) is a full-stack telemedicine platform designed specifically for Thailand's healthcare ecosystem. It provides seamless video consultations, electronic medical records (EMR), e-prescribing, and AI-powered health assistance.

The platform consists of three main services:

| Service | Description | Port | Target Users |
| -------- | ------------- | ---- | -------------- |
| **Patient Portal** | Book appointments, manage health records, video consultations | 3005 | Patients, Caregivers |
| **Doctor Portal** | Clinical workflows, EMR/EHR management, prescriptions, admin tools | 3010 | Doctors, Nurses, Admins |
| **Meeting Server** | Jitsi integration with live transcription & AI summaries | 3020 | Video Consultations |

---

## 🧪 Testing

### Test Coverage

Comprehensive E2E testing with 123+ tests passing on both local and cloud environments.

```powershell
# Run LOCAL tests
cd tests/e2e
npx playwright test --timeout=180000 --workers=4

# Run with visible browser
npx playwright test --headed

# Run specific test category
npx playwright test --grep "Video Meeting"

# View HTML Report
npx playwright show-report
```

### Test Credentials

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient 1 | `demo.test@gmail.com` | See `.env.docker` |
| Patient 2 | `Somchai.Mankong@gmail.com` | See `.env.docker` |
| Patient 3 | `Anan.Khayanrian@gmail.com` | See `.env.docker` |
| Doctor | `doctor.test@izara.com` | See `.env.docker` |
| Admin | `admin.test@izara.com` | See `.env.docker` |

---

## ✨ Key Features

### For Patients 👤

- 📅 **Appointment Booking** - Multi-step booking with AI symptom analysis
- 📹 **Video Consultations** - Jitsi Meet integration (FREE, no account required)
- 🎙️ **Live Transcription** - Real-time speech-to-text during consultations
- 👥 **Invite Family Members** - External guests can join meetings via invite links
- 📋 **Personal Health Records (PHR)** - Vitals, allergies, medications, lifestyle data
- 🔔 **Real-time Notifications** - Appointment updates, meeting reminders
- 🤖 **AI Health Assistant** - Powered by Google Gemini with chat history
- 🗺️ **Healthcare Map** - Find nearby clinics and hospitals
- 📚 **Medical Content Library** - Health education articles with images
- 🌐 **Multi-language** - Thai (primary) and English

### For Healthcare Providers 👨‍⚕️

- 📝 **Electronic Medical Records (EMR)** - Thai OPD card format with SOAP notes
- 📹 **Video Meeting HOST Controls** - Doctor as moderator with lobby management
- 🎥 **Meeting Recording** - Save consultations to cloud storage
- 🎙️ **AI Transcription & Summary** - Automatic SOAP notes from meeting transcripts
- 👥 **Invite Specialists** - External consultants can join via invite links
- 💊 **E-Prescribing** - Drug interaction checks, medication management
- 🧪 **Lab & Imaging Orders** - Complete diagnostic workflow
- 📊 **Patient Queue Management** - Priority-based scheduling
- 📚 **Clinical Resources** - Medical library and references
- 🔒 **PDPA Compliance** - Thailand's data protection standards

### For Administrators 🔧

- 👥 **User Management** - Doctor, patient, and staff accounts
- 📊 **Analytics Dashboard** - Appointment statistics and insights
- ⚙️ **System Configuration** - Specialties, appointment pools
- 📋 **Medical Consultant Management** - Specialist directory

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                   IZARA TELEMEDICINE v1.4.5                              │
├──────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│   │  Patient Portal │  │  Doctor Portal  │  │  Meeting Server        │   │
│   │  (React + Vite) │  │  (React + Vite) │  │  (Express + Socket.IO) │   │
│   │  localhost:3005 │  │  localhost:3010 │  │  localhost:3020        │   │
│   └────────┬────────┘  └────────┬────────┘  └─────────┬──────────────┘   │
│            │                    │                     │                   │
│            └────────────────────┼─────────────────────┘                   │
│                                 ▼                                         │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │         PostgreSQL 16 + pgvector (Primary Database)               │  │
│   │           Port: 5433 (Docker service on local and cloud)         │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                     EXTERNAL SERVICES                            │    │
│   │  • Jitsi Meet (meet.jit.si) - Video Conferencing (FREE)         │    │
│   │  • Google Gemini AI - Chat, CDS, SOAP Summaries                 │    │
│   │  • Web Speech API - FREE Live Transcription                     │    │
│   │  • Google Maps - Healthcare Facilities Map                       │    │
│   │  • Cloud Run - Container hosting (Production)                    │    │
│   │  • PostgreSQL Docker - Database (NO Cloud SQL)                   │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
| ------------ | --------- |
| React 18 | UI Framework |
| TypeScript | Type-safe JavaScript |
| Vite 7 | Build tool & dev server |
| Tailwind CSS | Styling |
| React Router | Navigation |
| Socket.io Client | Real-time updates |

### Backend

| Technology | Purpose |
| ------------ | --------- |
| Node.js 22 | Runtime |
| Express.js | API Framework |
| PostgreSQL 16 | Primary database with pgvector |
| bcrypt | Password hashing |
| Socket.io | WebSocket server |

### Google Cloud Services

| Service | Purpose |
| --------- | --------- |
| Cloud Storage | JSON-based database |
| Cloud Run | Container hosting (Production) |
| Gemini AI | Health assistant, EMR summarization |
| Maps API | Healthcare facility locator |
| Speech-to-Text | Voice symptom input |

---

## 📦 Installation & Setup

### Quick Start (5 Minutes)

### Option A: Using PowerShell Deployment Script (Recommended)

```powershell
# Fresh install - wipes database and starts clean
.\scripts\deploy.ps1 -Fresh

# Normal local deployment
.\scripts\deploy.ps1 -Target local

# Cloud deployment
.\scripts\deploy.ps1 -Target cloud

# Skip tests
.\scripts\deploy.ps1 -SkipTests

# Skip rebuilding containers
.\scripts\deploy.ps1 -SkipBuild
```

### Option B: Manual Docker Setup

### 1. Copy Environment Template

```bash
# Windows PowerShell
Copy-Item .env.docker.example .env.docker

# Linux/Mac  
cp .env.docker.example .env.docker
```

### 2. Get Your API Keys

| API Key | Get From | Purpose |
| --------- | ---------- | --------- |
| **Google Maps** | [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials) | Patient portal maps |
| **Gemini AI** | [Google AI Studio](https://aistudio.google.com/app/apikey) | AI chat & clinical assistant |
| **Speech-to-Text** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Meeting transcription |
| **OAuth Client** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Google Sign-In |

### 3. Add API Keys to `.env.docker`

Open `.env.docker` in your editor and replace these placeholders:

```env
# Google Maps API (REQUIRED for patient portal map features)
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_KEY_HERE
VITE_GOOGLE_MAPS_MAP_ID=YOUR_ACTUAL_MAP_ID_HERE

# Gemini AI API (REQUIRED for AI features)
GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE
VITE_GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE

# Google Speech-to-Text (REQUIRED for transcription)
GOOGLE_SPEECH_API_KEY=YOUR_ACTUAL_KEY_HERE

# Google OAuth (REQUIRED for Google Sign-In)
VITE_GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID
VITE_GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET
```

### 4. Start Docker Services

```bash
# Build and start all services
docker-compose up --build

# Or start in background
docker-compose up -d --build
```

### 5. Access Applications

| Service | URL | Credentials |
| --------- | ----- | ------------- |
| **Patient Portal** | <http://localhost:3005> | See test credentials below |
| **Doctor Portal** | <http://localhost:3010> | See test credentials below |
| **pgAdmin** | <http://localhost:5050> | `admin@izara.com` / (from .env.docker) |

### Prerequisites

- Node.js >= 22.0.0
- npm >= 9.0.0
- Docker & Docker Compose
- PostgreSQL 16 (if not using Docker)

### Clone the Repository

```bash
git clone https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere
```

---

## ⚙️ Configuration

### Environment Variables

### File Structure

```text
Isara-Anywhere/
├── .env.docker              # Main environment file for Docker Compose (DO NOT commit)
├── .env.docker.example      # Template file (safe to commit)
├── docker-compose.yml       # Docker Compose configuration
├── Isara-patient-portal/
│   └── .env                 # Patient portal specific variables
├── Isara-doctor-portal/
│   └── .env                 # Doctor portal specific variables
└── Izara-jitsi-server/
    └── .env                 # Meeting server specific variables
```

### Environment Loading Order

Docker Compose loads environment variables in this order (later values override earlier ones):

1. `.env.docker` (root - shared variables)
2. Service-specific `.env` files
3. `environment` section in `docker-compose.yml`

### Required API Keys

| Variable | Description | Get From |
| ---------- | ------------- | --------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API Key | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GOOGLE_MAPS_MAP_ID` | Google Maps Map ID | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GEMINI_API_KEY` | Gemini AI API Key | [Google AI Studio](https://aistudio.google.com) |
| `GEMINI_API_KEY` | Gemini AI API Key (backend) | [Google AI Studio](https://aistudio.google.com) |
| `GOOGLE_SPEECH_API_KEY` | Speech-to-Text API | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GOOGLE_CLIENT_SECRET` | OAuth Client Secret | [Google Cloud Console](https://console.cloud.google.com) |

### Optional Configuration (change for production)

```env
# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD
POSTGRES_DB=izara_phase1

# Security Keys (generate new ones for production)
JWT_SECRET=YOUR_JWT_SECRET
PGADMIN_DEFAULT_PASSWORD=YOUR_PGADMIN_PASSWORD

# GCP Project Configuration
GCP_PROJECT_ID=your-actual-project-id
VITE_GCP_PROJECT_ID=your-actual-project-id
```

See `.env.docker.example` for complete configuration template.

---

## 🌐 Portal URLs

### Local Environment (Docker)

| Service | URL |
| ------- | --- |
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Meeting Server | http://localhost:3020 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

### Cloud Environment (Google Cloud Run)

| Service | URL |
| ------- | --- |
| Patient Portal | https://izara-patient-portal-hvht4obouq-as.a.run.app |
| Doctor Portal | https://izara-doctor-portal-hvht4obouq-as.a.run.app |
| Meeting Server | https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app |
| pgAdmin | https://izara-pgadmin-hvht4obouq-as.a.run.app |

---

## 🚀 Running the Application

### Daily Development Workflow

```bash
# Start all services (recommended)
docker-compose up -d

# View logs for debugging
docker-compose logs -f

# Stop services
docker-compose down

# Restart a specific service
docker-compose restart patient-portal

# Rebuild after code changes
docker-compose up --build -d
```

### Database Management

### Automatic Initialization

The database is automatically initialized on first run using `scripts/database/izara-database.sql`.

### Manual Reinitialization

```bash
# Stop all services
docker-compose down -v

# Start PostgreSQL only
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
Start-Sleep -Seconds 10

# Import schema
Get-Content "scripts\database\izara-database.sql" | docker exec -i izara-postgres psql -U postgres -d izara_phase1

# Start all services
docker-compose up -d
```

### Verification

Test that environment variables are loaded correctly:

```bash
# Check if variables are loaded
docker-compose config

# Verify patient portal environment
docker-compose exec patient-portal env | grep GEMINI_API_KEY

# Verify doctor portal environment
docker-compose exec doctor-portal env | grep GEMINI_API_KEY
```

### Development Mode (without Docker)

### Patient Portal

```bash
cd Isara-patient-portal
npm run dev:all        # Frontend + Backend
```

Access at: <http://localhost:3005>

### Doctor Portal

```bash
cd Isara-doctor-portal
npm run dev            # Frontend + Backend (concurrent)
```

Access at: <http://localhost:3010>

### Production Build

```bash
# Patient Portal
cd Isara-patient-portal
npm run build

# Doctor Portal
cd Isara-doctor-portal
npm run build:prod
```

---

## 🚢 Cloud Deployment

Use the unified PowerShell deployment script:

```powershell
# Deploy locally with Docker Compose
.\scripts\deploy.ps1 -Target local

# Deploy to Google Cloud Run
.\scripts\deploy.ps1 -Target cloud

# Fresh deployment (reset all data)
.\scripts\deploy.ps1 -Target local -Fresh

# Show help
.\scripts\deploy.ps1 -Help
```

### Script Features

- 🔄 Automatic data initialization with demo data
- 🏥 Health checks for all services
- 🗃️ Database setup and migrations
- 📊 Deployment status report
- ⚠️ Error handling and validation

---

## 🛠️ Troubleshooting

### ❌ "variable not set" error

**Fix**: Make sure `.env.docker` exists and contains all variables from `.env.docker.example`

### ❌ Maps not loading

**Fix**:

1. Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly in `.env.docker`
2. Check Google Cloud Console for API restrictions
3. Add `<http://localhost:3005>` to HTTP referrer restrictions
4. Enable required APIs (Maps JavaScript, Places, Geocoding)

### ❌ AI features not working

**Fix**:

1. Verify `GEMINI_API_KEY` is set correctly in `.env.docker`
2. Check API quota in Google AI Studio
3. Restart services after changing .env.docker

### ❌ Can't connect to database

**Fix**:

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### ❌ Port already in use

**Fix**: Change ports in `docker-compose.yml`:

```yaml
ports:
  - "3006:3005"  # Change 3005 to 3006 on host
```

### ❌ Google Maps "For development purposes only" watermark

**Cause**: Billing not enabled or API restrictions too strict
**Fix**:

1. Enable billing in Google Cloud Console
2. Temporarily remove all API key restrictions
3. Test if it works
4. Add restrictions back gradually

### ❌ "RefererNotAllowedMapError"

**Cause**: HTTP referrer restrictions blocking localhost
**Fix**: Add to API key referrers:

```text
http://localhost:3005/*
http://localhost:3010/*
```

---

## 🔒 Security Best Practices

### ✅ DO

- Keep `.env.docker` with real API keys out of version control
- Use `.env.docker.example` as a template
- Generate strong, unique passwords for production
- Rotate API keys regularly
- Use different credentials for development and production

### ❌ DON'T

- Commit `.env.docker` with real API keys to Git
- Share API keys in public repositories
- Use default passwords in production
- Hardcode credentials in `docker-compose.yml`

**Remember**: `.env.docker` contains your API keys and should NEVER be committed to Git!

---

## 🌐 Services & Ports

| Service | Port | Description |
| --------- | ------ | ------------- |
| Patient Portal | 3005 | Unified patient web application + API |
| Doctor Portal | 3010 | Unified doctor/admin web application + API |
| Meeting Server | 3020 | Jitsi integration with transcription |
| PostgreSQL | 5433 | Primary database |
| pgAdmin | 5050 | Database management UI |

---

## 📁 Project Structure

```text
Isara-anywhere-V0.0.3/
├── Isara-patient-portal/          # Patient-facing application
│   ├── src/                       # React components & pages
│   ├── server/                    # Express.js backend
│   ├── public/                    # Static assets
│   └── doc/                       # Portal documentation
│
├── Isara-doctor-portal/           # Doctor/Admin application
│   ├── src/                       # React components & pages
│   ├── server/                    # Express.js backend servers
│   ├── scripts/                   # Seed data & utilities
│   └── doc/                       # Portal documentation
│
├── Explains/                      # Project documentation
│   ├── Isara-Patient-Portal/      # Patient portal docs
│   ├── Isara-Doctor-Portal/       # Doctor portal docs
│   └── Whole-Project/             # System-wide docs
│
├── Processes/                     # Workflow documentation
│   ├── Appointment_Workflows.md
│   ├── Notification_Workflows.md
│   └── ...
│
├── Presentations/                 # Project presentations
├── scripts/                       # Utility scripts
├── data/                          # Data schemas & structures
└── README.md                      # This file
```

---

## 📚 Documentation

Detailed documentation is available in the `Explains/` directory:

| Document | Description |
| ---------- | ------------- |
| [Architecture](Explains/Whole-Project/architecture.md) | System architecture & data flow |
| [API Reference](Explains/Whole-Project/api-reference.md) | API endpoints documentation |
| [Database Schema](Explains/Whole-Project/database-schema.dbml) | Data models (DBML format) |
| [Security](Explains/Whole-Project/security.md) | Security implementation |
| [Patient Features](Explains/Isara-Patient-Portal/features.md) | Patient portal features |
| [Doctor Features](Explains/Isara-Doctor-Portal/features.md) | Doctor portal features |

---

## 🔒 Security

The platform implements security best practices:

- **Authentication**: bcrypt password hashing (10 rounds)
- **Session Management**: Secure token-based sessions (24hr expiry)
- **Rate Limiting**: 10 login attempts per 15 minutes
- **Security Headers**: Helmet.js (CSP, XSS protection, HSTS)
- **Input Validation**: XSS prevention, SQL injection protection
- **CORS**: Strict origin validation
- **PDPA Compliance**: Thailand's data protection standards

---

## 🧪 Testing

### Seed Demo Data

```bash
# Doctor Portal - Generate demo data
cd Isara-doctor-portal
npm run generate:demo
npm run upload:gcs

# Complete setup
npm run setup:complete
```

### Run Tests

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

---

## 📊 Demo Results & API Tests

### Patient Portal API Tests

| Endpoint | Method | Status | Response Time | Description |
| -------- | ------ | ------ | ------------- | ----------- |
| `/api/health` | GET | ✅ 200 | <50ms | Health check |
| `/api/auth/login` | POST | ✅ 200 | <200ms | User authentication |
| `/api/phr` | GET | ✅ 200 | <100ms | Get PHR data |
| `/api/phr/vitals` | POST | ✅ 200 | <150ms | Save vital signs |
| `/api/appointments` | GET | ✅ 200 | <100ms | List appointments |
| `/api/appointments` | POST | ✅ 200 | <200ms | Create appointment |
| `/api/content` | GET | ✅ 200 | <100ms | Medical content list |
| `/api/ai/chat` | POST | ✅ 200 | <2000ms | AI health assistant |
| `/api/ai/chat/history` | GET | ✅ 200 | <100ms | Chat history |
| `/api/notifications` | GET | ✅ 200 | <100ms | User notifications |

### Doctor Portal API Tests

| Endpoint | Method | Status | Response Time | Description |
| -------- | ------ | ------ | ------------- | ----------- |
| `/api/health` | GET | ✅ 200 | <50ms | Health check |
| `/api/auth/login` | POST | ✅ 200 | <200ms | Doctor authentication |
| `/api/patients` | GET | ✅ 200 | <100ms | Patient list |
| `/api/appointments` | GET | ✅ 200 | <100ms | Doctor appointments |
| `/api/consultants` | GET | ✅ 200 | <100ms | Medical consultants |
| `/api/content` | GET | ✅ 200 | <100ms | Medical content CRUD |
| `/api/emr` | GET | ✅ 200 | <100ms | EMR records |
| `/admin/doctors` | GET | ✅ 200 | <100ms | Doctor management |
| `/admin/pending-doctors` | GET | ✅ 200 | <100ms | Pending approvals |

### Demo Workflow Examples

#### 1. Patient Appointment Booking

### Input

```json
{
  "doctorId": "dr-001",
  "specialty": "อายุรกรรม",
  "date": "2025-01-20",
  "time": "10:00",
  "type": "video",
  "symptoms": "มีไข้ ปวดศีรษะ 2 วัน"
}
```

### Output

```json
{
  "success": true,
  "appointment": {
    "id": "apt-12345",
    "status": "pending",
    "meetingLink": "https://meet.jit.si/izara-apt-12345",
    "confirmationRequired": true
  }
}
```

#### 2. AI Health Assistant Chat

### Input (2)

```json
{
  "message": "ผมมีอาการปวดหัวมา 2 วันแล้ว ควรทำอย่างไร?",
  "sessionId": "session-abc123"
}
```

### Output (2)

```json
{
  "success": true,
  "response": "อาการปวดหัวที่เกิดขึ้น 2 วันอาจมีสาเหตุหลายประการ...",
  "suggestions": [
    "พักผ่อนให้เพียงพอ",
    "ดื่มน้ำให้เพียงพอ",
    "หากอาการไม่ดีขึ้นควรปรึกษาแพทย์"
  ],
  "disclaimer": "ข้อมูลนี้เป็นเพียงคำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัยโรค"
}
```

#### 3. PHR Vitals Save

### Input (3)

```json
{
  "temperature": 37.2,
  "bloodPressure": { "systolic": 120, "diastolic": 80 },
  "heartRate": 72,
  "weight": 65.5,
  "height": 170,
  "recordedAt": "2025-01-15T10:30:00Z"
}
```

### Output (3)

```json
{
  "success": true,
  "message": "Vital signs saved successfully",
  "record": {
    "id": "vital-67890",
    "patientId": "pat-001",
    "bmi": 22.7
  }
}
```

#### 4. Video Meeting Summary (AI Generated)

### Meeting Transcript Input

```text
Patient: สวัสดีครับคุณหมอ ผมมีอาการไข้มา 3 วันแล้ว
Doctor: อุณหภูมิเท่าไหร่ครับ?
Patient: ประมาณ 38.5 องศาครับ
Doctor: มีอาการอื่นไหม เช่น ไอ หรือ เจ็บคอ?
Patient: มีไอแห้งๆ บ้างครับ
```

### AI Summary Output

```json
{
  "success": true,
  "summary": {
    "chiefComplaint": "ไข้มา 3 วัน",
    "presentIllness": "อุณหภูมิ 38.5°C ร่วมกับอาการไอแห้ง",
    "assessment": "สงสัยติดเชื้อทางเดินหายใจส่วนบน",
    "plan": [
      "ให้ยาลดไข้ Paracetamol 500mg",
      "นัดติดตามอาการ 3 วัน"
    ],
    "manInTheLoopRequired": true
  }
}
```

---

## 🚢 Deployment

### Automated Deployment Script (Recommended) (2)

Use the unified PowerShell deployment script for easy local and cloud deployment:

```powershell
# Deploy locally with Docker Compose
.\scripts\deploy.ps1 -Target local

# Deploy to Google Cloud Run
.\scripts\deploy.ps1 -Target cloud

# Deploy everything (local + cloud)
.\scripts\deploy.ps1 -Target all

# Fresh deployment (reset all data)
.\scripts\deploy.ps1 -Target local -Fresh

# Skip health checks for faster deployment
.\scripts\deploy.ps1 -Target local -SkipTests

# Show help
.\scripts\deploy.ps1 -Help
```

### Script Features (2)

- 🔄 Detects existing data and preserves it (unless `-Fresh`)
- 🏥 Health checks for all services
- 🗃️ Automatic database initialization with demo data
- 📊 Deployment status report
- ⚠️ Error handling and rollback

### Local Deployment (Docker Compose)

```bash
# Start all services
docker-compose up -d --build

# Check status
docker ps

# Stop services
docker-compose down
```

### Local URLs

| Service | URL |
| --------- | ----- |
| Patient Portal | <http://localhost:3005> |
| Doctor Portal | <http://localhost:3010> |
| pgAdmin | <http://localhost:5050> |

### Google Cloud Run Deployment

```bash
# Deploy Patient Portal to Cloud Run
cd Isara-patient-portal
gcloud builds submit --config=cloudbuild.yaml

# Deploy Doctor Portal to Cloud Run
cd Isara-doctor-portal
gcloud builds submit --config=cloudbuild.yaml
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

### Izara Telemedicine Development Team

- Healthcare technology innovation for Thailand
- Focused on accessibility and user experience
- PDPA-compliant data handling

---

## 📞 Support

For support and inquiries:

- 📧 Email: <chirapathleo.saeliM@gmail.com> / <chirapath.s@betimes.biz>
- � **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- 🐛 Issues: GitHub Issues

---

### Made with ❤️ for Thailand's Healthcare

© 2024-2026 Izara Telemedicine. All rights reserved.
