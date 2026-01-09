# 🏥 Izara Telemedicine Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Tests](https://img.shields.io/badge/tests-420%2B%20passing-brightgreen.svg)

**A comprehensive telemedicine platform built for Thailand's healthcare system**

[Demo](#-demo-accounts) • [Features](#-key-features) • [Installation](#-installation) • [Documentation](#-documentation)

</div>

---

## 📖 Overview

**Izara Telemedicine** (อิสระ เทเลเมดิซิน) is a full-stack telemedicine platform designed specifically for Thailand's healthcare ecosystem. It provides seamless video consultations, electronic medical records (EMR), e-prescribing, and AI-powered health assistance.

The platform consists of two main portals:

| Portal | Description | Target Users |
|--------|-------------|--------------|
| **Patient Portal** | Book appointments, manage health records, video consultations | Patients, Caregivers |
| **Doctor Portal** | Clinical workflows, EMR/EHR management, prescriptions, admin tools | Doctors, Nurses, Admins |

---

## ✨ Key Features

### For Patients 👤
- 📅 **Appointment Booking** - Multi-step booking with AI symptom analysis
- 📹 **Video Consultations** - Jitsi Meet integration (FREE, no account required)
- 👥 **Invite Family Members** - External guests can join meetings via invite links
- 📋 **Personal Health Records (PHR)** - Vitals, allergies, medications, lifestyle data
- 🔔 **Real-time Notifications** - Appointment updates, meeting reminders
- 🤖 **AI Health Assistant** - Powered by Google Gemini
- 🗺️ **Healthcare Map** - Find nearby clinics and hospitals
- 🌐 **Multi-language** - Thai (primary) and English

### For Healthcare Providers 👨‍⚕️
- 📝 **Electronic Medical Records (EMR)** - Thai OPD card format with SOAP notes
- 📹 **Video Meeting HOST Controls** - Doctor as moderator with lobby management
- 🎥 **Meeting Recording** - Save consultations to cloud storage
- 🤖 **AI Meeting Summaries** - Gemini-powered clinical summaries
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

```
┌─────────────────────────────────────────────────────────────────────┐
│                          IZARA TELEMEDICINE                         │
├─────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐         ┌─────────────────┐                   │
│   │  Patient Portal │         │  Doctor Portal  │                   │
│   │  (React + Vite) │         │  (React + Vite) │                   │
│   │  localhost:3005 │         │  localhost:3010 │                   │
│   └────────┬────────┘         └────────┬────────┘                   │
│            │                           │                             │
│            └───────────┬───────────────┘                             │
│                        ▼                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     Backend Services                        │   │
│   ├───────────────┬─────────────────┬─────────────────────────┤    │
│   │ Patient API   │   Auth Server   │     GCS API Server      │    │
│   │ (Port 3004)   │   (Port 3011)   │     (Port 3012)         │    │
│   └───────────────┴────────┬────────┴─────────────────────────┘    │
│                            │                                         │
│                            ▼                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              Google Cloud Storage (5 Buckets)               │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │ izara-users-credentials │ izara-patients-data │ izara-appointments │
│   │ izara-doctors-data │ izara-meta-data                          │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type-safe JavaScript |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| React Router | Navigation |
| Socket.io Client | Real-time updates |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | API Framework |
| Google Cloud Storage | Data persistence |
| bcrypt | Password hashing |
| Socket.io | WebSocket server |

### Google Cloud Services
| Service | Purpose |
|---------|---------|
| Cloud Storage | JSON-based database |
| Cloud Run | Container hosting (Production) |
| Gemini AI | Health assistant, EMR summarization |
| Maps API | Healthcare facility locator |
| Speech-to-Text | Voice symptom input |

---

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Google Cloud** account with service account credentials
- **Git**

### Clone the Repository

```bash
git clone https://github.com/your-org/izara-telemedicine.git
cd izara-telemedicine
```

### Setup Patient Portal

```bash
cd Isara-patient-portal
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev:all
```

### Setup Doctor Portal

```bash
cd Isara-doctor-portal
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` files in both portal directories. Key configurations:

| Variable | Description |
|----------|-------------|
| `VITE_GCP_PROJECT_ID` | Google Cloud Project ID |
| `VITE_GEMINI_API_KEY` | Gemini AI API Key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API Key |
| `VITE_GCS_BUCKET_*` | Cloud Storage bucket names |

See `.env.example` in each portal for complete configuration.

### Google Cloud Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `izara-users-credentials` | Patient/Doctor/Admin authentication |
| `izara-patients-data` | Patient PHR, profiles, living will |
| `izara-doctors-data` | Doctor profiles, EMR, meeting recordings |
| `izara-appointments` | Appointment records |
| `izara-meta-data` | Clinical resources, specialties |

---

## 🚀 Running the Application

### Development Mode

**Patient Portal:**
```bash
cd Isara-patient-portal
npm run dev:all        # Frontend + Backend
```
Access at: http://localhost:3005

**Doctor Portal:**
```bash
cd Isara-doctor-portal
npm run dev            # Frontend + Backend (concurrent)
```
Access at: http://localhost:3010

### Production Build

```bash
# Patient Portal
cd Isara-patient-portal
npm run build

# Doctor Portal
cd Isara-doctor-portal
npm run build:prod
```

### Docker

```bash
# Build unified container
cd Isara-doctor-portal
npm run docker:build
npm run docker:run
```

---

## 🌐 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Patient Portal Frontend | 3005 | Patient web application |
| Patient Portal Backend | 3004 | Patient API server |
| Doctor Portal Frontend | 3010 | Doctor web application |
| Doctor Main API | 3009 | Clinical operations API |
| Auth Server | 3011 | Authentication service |
| GCS API Server | 3012 | Cloud Storage proxy |

---

## 🧪 Demo Accounts

### Patient Accounts
| Field | Value |
|-------|-------|
| Email | `demo.test@gmail.com` |
| Password | `P@ssw0rd` |
| Portal | http://localhost:3005 |

| Field | Value |
|-------|-------|
| Email | `demo2.test@gmail.com` (Patient Relative) |
| Password | `P@ssw0rd` |
| Portal | http://localhost:3005 |

### Doctor Account
| Field | Value |
|-------|-------|
| Email | `doctor.test@izara.com` |
| Password | `IzaraDoctor@2024` |
| Portal | http://localhost:3010 |

### Unit Test Doctor Account
| Field | Value |
|-------|-------|
| Email | `doctorunit.test@izara.com` |
| Password | `P@ssw0rd` |
| Portal | http://localhost:3010 |

### Admin Account
| Field | Value |
|-------|-------|
| Email | `admin.test@izara.com` |
| Password | `IzaraAdmin@2024` |
| Portal | http://localhost:3010 |

---

## 📁 Project Structure

```
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
|----------|-------------|
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

## 🚢 Deployment

### Google Cloud Run

The application is designed for Google Cloud Run deployment:

```bash
# Build and push to GCR
./scripts/build-and-push-gcr.ps1

# Deploy to Cloud Run
./scripts/deploy-to-cloud-run.ps1
```

### Production URLs

| Portal | URL |
|--------|-----|
| Patient Portal | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| Doctor Portal | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

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

**Izara Telemedicine Development Team**

- Healthcare technology innovation for Thailand
- Focused on accessibility and user experience
- PDPA-compliant data handling

---

## 📞 Support

For support and inquiries:
- 📧 Email: chirapathleo.saeliM@gmail.com / chirapath.s@betimes.biz
- 📖 Documentation: [Explains/README.md](Explains/README.md)
- 🐛 Issues: GitHub Issues

---

<div align="center">

**Made with ❤️ for Thailand's Healthcare**

© 2024-2026 Izara Telemedicine. All rights reserved.

</div>
