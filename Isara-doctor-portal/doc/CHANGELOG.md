# 📜 Changelog

All notable changes to the Izara Doctor Portal project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2025-12-11

### 🚀 Unified Docker Deployment

#### Added
- **Unified Dockerfile** (`Dockerfile.unified`) - Single Docker image for all services
  - Combines frontend (Nginx), Auth Server, GCS API, and Main API
  - Uses Supervisor for process management
  - Optimized for Google Cloud Run deployment
- **Cloud Build Configuration** (`cloudbuild.yaml`) - CI/CD pipeline
  - Automated builds on push to main branch
  - Automatic deployment to Cloud Run
- **Comprehensive Documentation**
  - `doc/deployment.md` - Complete deployment guide for GCP
  - `doc/files-reference.md` - Full project file index
  - Updated `doc/README.md` with new documentation links

#### Changed
- Updated `package.json` with new Docker commands
  - `npm run docker:build` - Build unified image
  - `npm run docker:run` - Run locally
  - `npm run docker:push` - Push to GCR
- Optimized `.dockerignore` for unified build

#### Technical Details
- Port 8080 (external) - Nginx reverse proxy
- Port 3011 (internal) - Auth Server
- Port 3012 (internal) - GCS API Server
- Port 3009 (internal) - Main API Server

---

## [1.0.0] - 2025-12-10

### 🎉 Initial Stable Release

This is the first stable release of the Izara Doctor Portal, a comprehensive AI-powered telemedicine platform.

### ✨ Added

#### Core Features
- **AI Clinical Copilot** - Integrated Google Gemini 2.0 for clinical decision support
  - Real-time symptom analysis
  - ICD-10 diagnosis suggestions
  - Drug interaction checking
  - SOAP note generation
  - Voice transcription during consultations

#### Doctor Portal
- **Dashboard (Health Studio)** - AI-powered clinical dashboard
  - Patient statistics and visualization
  - Quick action shortcuts
  - Real-time queue monitoring
  - AI chat assistant

- **Patient Management**
  - Comprehensive patient records
  - Medical history tracking
  - Demographics management
  - PDPA consent tracking

- **EMR System**
  - SOAP note editor with templates
  - Vital signs with auto-flagging
  - Physical examination documentation
  - Assessment and treatment plans
  - AI-assisted documentation

- **E-Prescribing**
  - Drug database search
  - Automated interaction checking
  - Allergy cross-reference alerts
  - Digital prescription signing
  - Pharmacy transmission

- **Lab Orders**
  - Lab test panel selection
  - Individual test ordering
  - Urgency levels
  - Results tracking
  - Trend analysis

- **Queue Management**
  - Real-time patient queue
  - Priority escalation
  - Wait time estimation
  - Multi-status tracking

- **Telemedicine**
  - Google Meet integration
  - Video/audio controls
  - AI transcription during calls
  - Screen sharing
  - Recording capabilities

- **Schedule Management**
  - Availability settings
  - Calendar views
  - Appointment booking
  - Slot management

#### Admin Portal
- **Doctor Management**
  - Registration approval workflow
  - Account management
  - Profile verification
  - Credential checking

- **Appointment Management**
  - Doctor assignment
  - Status tracking
  - Rescheduling capabilities
  - Cancellation handling

- **System Analytics**
  - Usage statistics
  - Performance metrics
  - Audit logs

#### Backend Services
- **Auth Server** (Port 3011)
  - JWT-based authentication
  - Session management
  - Role-based access control
  - Doctor approval workflow

- **GCS API Server** (Port 3012)
  - Google Cloud Storage proxy
  - File operations
  - Bucket management

- **Main API Server** (Port 3009)
  - Business logic APIs
  - Email notifications
  - Calendar integration
  - Meet link generation

#### Data Storage
- **GCS Buckets**
  - `izara-users-credentials` - User authentication
  - `izara-doctors-data` - Doctor profiles
  - `izara-patients-data` - Patient records & EMRs
  - `izara-appointments` - Scheduling data
  - `izara-meta-data` - Reference data

### 🔒 Security
- PDPA (Thailand Personal Data Protection Act) compliance
- Secure authentication with bcrypt
- Session-based access control
- Audit logging for all operations
- Consent tracking for patient data

### 🌐 Internationalization
- Thai language support
- English language support
- Locale-aware date/time formatting

### 📱 Responsive Design
- Mobile-optimized interface
- Tablet support
- Desktop layouts
- Touch-friendly controls

---

## [0.0.2] - 2025-11-15

### 🚧 Beta Release

#### Added
- Initial beta features
- Basic EMR functionality
- Prototype prescribing module
- Queue management prototype

#### Fixed
- Authentication flow improvements
- GCS bucket organization
- API endpoint standardization

---

## [0.0.1] - 2025-10-01

### 🔬 Alpha Release

#### Added
- Initial project setup
- React + TypeScript foundation
- Basic routing structure
- Authentication prototype
- GCS integration proof of concept

---

## 🗺️ Roadmap

### Planned for v1.1.0
- [ ] Offline mode support
- [ ] Push notifications
- [ ] Enhanced AI diagnostics
- [ ] Integration with external lab systems
- [ ] Insurance claim integration

### Planned for v1.2.0
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-hospital support
- [ ] HL7 FHIR compatibility

### Planned for v2.0.0
- [ ] Patient portal integration
- [ ] Pharmacy network connectivity
- [ ] Wearable device integration
- [ ] Predictive health analytics

---

## 📝 Version Naming Convention

| Version Type | Format | Example |
|--------------|--------|---------|
| Major | X.0.0 | 1.0.0 |
| Minor | X.Y.0 | 1.1.0 |
| Patch | X.Y.Z | 1.0.1 |
| Alpha | X.Y.Z-alpha.N | 0.0.1-alpha.1 |
| Beta | X.Y.Z-beta.N | 0.0.2-beta.1 |
| RC | X.Y.Z-rc.N | 1.0.0-rc.1 |

---

## 🔗 Links

- [Documentation Index](./README.md)
- [GitHub Repository](https://github.com/chiraleo2000/Telemedicine-Google-MoC)
- [Issue Tracker](https://github.com/chiraleo2000/Telemedicine-Google-MoC/issues)
