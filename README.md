# 🏥 Izara Telemedicine Platform


![Version](https://img.shields.io/badge/version-1.3.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

A comprehensive telemedicine platform built for Thailand's healthcare system

[Demo](#-demo-accounts) • [Features](#-key-features) • [Installation](#-installation) • [Cloud Deployment](#-cloud-deployment)

---

## 📖 Overview


**Izara Telemedicine** (อิสระ เทเลเมดิซิน) is a full-stack telemedicine platform designed specifically for Thailand's healthcare ecosystem. It provides seamless video consultations, electronic medical records (EMR), e-prescribing, and AI-powered health assistance.

The platform consists of two main portals:

| Portal | Description | Target Users |
| -------- | ------------- | -------------- |
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


```text
┌─────────────────────────────────────────────────────────────────────┐
│                   IZARA TELEMEDICINE v1.3.2                         │
├─────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐         ┌─────────────────┐                   │
│   │  Patient Portal │         │  Doctor Portal  │                   │
│   │  (React + Vite) │         │  (React + Vite) │                   │
│   │  localhost:3005 │         │  localhost:3010 │                   │
│   └────────┬────────┘         └────────┬────────┘                   │
│            │                           │                            │
│            └───────────┬───────────────┘                            │
│                        ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                  Unified Backend Services                    │  │
│   │  (nginx + Auth Server + Main API + GCS API in container)    │  │
│   └───────────────────────────┬─────────────────────────────────┘  │
│                               ▼                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │         PostgreSQL 16 + pgvector (Primary Database)         │  │
│   │           Port: 5433 (local) / Cloud SQL (cloud)            │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
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
| ---------- | ------------- |
| `VITE_GCP_PROJECT_ID` | Google Cloud Project ID |
| `VITE_GEMINI_API_KEY` | Gemini AI API Key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API Key |
| `VITE_GCS_BUCKET_*` | Cloud Storage bucket names |

See `.env.example` in each portal for complete configuration.

### Google Cloud Storage Buckets


| Bucket | Purpose |
| -------- | --------- |
| `izara-users-credentials` | Patient/Doctor/Admin authentication |
| `izara-patients-data` | Patient PHR, profiles, living will |
| `izara-doctors-data` | Doctor profiles, EMR, meeting recordings |
| `izara-appointments` | Appointment records |
| `izara-meta-data` | Clinical resources, specialties |

---

## 🚀 Running the Application


### Development Mode


#### Patient Portal:

```bash
cd Isara-patient-portal
npm run dev:all        # Frontend + Backend
```

Access at: <http://localhost:3005>

#### Doctor Portal:

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
| --------- | ------ | ------------- |
| Patient Portal | 3005 | Unified patient web application + API |
| Doctor Portal | 3010 | Unified doctor/admin web application + API |
| PostgreSQL | 5433 | Primary database |
| pgAdmin | 5050 | Database management UI |

---

## 🧪 Demo Accounts


### Patient Accounts

| Email | Password | Portal |
| ------- | ---------- | -------- |
| `Somchai.Mankong@gmail.com` | `P@ssw0rd` | <http://localhost:3005> |
| `Anan.Khayanrian@gmail.com` | `P@ssw0rd` | <http://localhost:3005> |

### Doctor Account

| Email | Password | Portal |
| ------- | ---------- | -------- |
| `somchai.prasert@izara.com` | `P@ssw0rd` | <http://localhost:3010> |
| `siriporn.thongchai@izara.com` | `P@ssw0rd` | <http://localhost:3010> |

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

## 🚢 Deployment


### Local Deployment (Docker Compose)


```bash
# Start all services
docker-compose up -d --build

# Check status
docker ps

# Stop services
docker-compose down
```


#### Local URLs:

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


#### Production URLs:

| Portal | URL |
| -------- | ----- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |

### Cloud SQL Database Setup


```bash
# Connect to Cloud SQL and run schema
gcloud sql connect izara-db-instance --user=izara_localdb_admin

# Run schema initialization
\i scripts/database/postgresql-schema-complete.sql
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


#### Izara Telemedicine Development Team

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

Made with ❤️ for Thailand's Healthcare

© 2024-2026 Izara Telemedicine. All rights reserved.
