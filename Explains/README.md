# 📚 Izara Telemedicine Documentation

# เอกสารประกอบระบบ Telemedicine อิสระ

> **Version:** 2.1.0 | **Updated:** February 5, 2026  
> **Status:** Phase 1 Complete | Production Ready  
> **Tests:** 92 LOCAL + 92 CLOUD = 184 Total (100% Passing, 0 Skipped)

---

## 🌐 Live URLs

### Local Environment (Docker)

| Service | URL | Port |
|---------|-----|------|
| Patient Portal | http://localhost:3005 | 3005 |
| Doctor Portal | http://localhost:3010 | 3010 |
| Meeting Server | http://localhost:3020 | 3020 |
| PostgreSQL | localhost:5433 | 5433 |
| pgAdmin | http://localhost:5050 | 5050 |

### Cloud Environment (Google Cloud Run)

| Service | URL |
|---------|-----|
| Patient Portal | https://izara-patient-portal-hvht4obouq-as.a.run.app |
| Doctor Portal | https://izara-doctor-portal-hvht4obouq-as.a.run.app |
| Meeting Server | https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app |
| pgAdmin | https://izara-pgadmin-hvht4obouq-as.a.run.app |
| Cloud SQL | 34.143.228.135:5432 |

---

## 🌟 Project Overview / ภาพรวมโปรเจค

**Izara Telemedicine** is a comprehensive telemedicine platform built for Thailand's healthcare system. The platform consists of two main portals:

1. **Patient Portal** (ระบบผู้ป่วย) - For patients to book appointments, manage health records, and consult with doctors
2. **Doctor Portal** (ระบบแพทย์) - For healthcare providers to manage consultations, EMR, prescriptions, and clinical resources
3. **Meeting Server** (ระบบประชุม) - For video consultations with Jitsi, transcription, and AI summaries

### Key Features / ฟีเจอร์หลัก

- 📹 Video consultations via Jitsi Meet (meet.jit.si - FREE)
- 🤖 AI-powered health assistant (Google Gemini 2.5 Flash)
- 🎤 Real-time transcription with AI summary generation
- 📋 Electronic Medical Records (EMR) with SOAP notes
- 💊 E-Prescribing with drug interaction checks (CDS)
- 📁 Personal Health Records (PHR)
- 🔔 Real-time notification system (in-app + email)
- 🧪 Lab & Imaging order management
- 🗺️ Healthcare facility map
- 📚 Medical content library (Thai-first)
- 🌐 Multi-language support (Thai primary, English)
- 🌙 Dark mode toggle

---

## 📁 Documentation Structure / โครงสร้างเอกสาร

```
Explains/
├── README.md                    ← You are here
├── Isara-Patient-Portal/        ← Patient Portal documentation
│   ├── overview.md              - Portal overview & features
│   ├── features.md              - Detailed feature descriptions
│   ├── workflows.md             - User workflows & processes
│   └── database.dbml            - Patient data structure
│
├── Isara-Doctor-Portal/         ← Doctor Portal documentation
│   ├── overview.md              - Portal overview & features
│   ├── features.md              - Detailed feature descriptions
│   ├── workflows.md             - User workflows & processes
│   ├── admin-features.md        - Admin-specific features
│   └── database.dbml            - Doctor data structure
│
└── Whole-Project/               ← System-wide documentation
    ├── architecture.md          - System architecture
    ├── api-reference.md         - API endpoints reference
    ├── gcs-buckets.md           - Google Cloud Storage structure
    ├── security.md              - Security implementation
    ├── database-schema.dbml     - Complete database schema
    └── test-accounts.md         - Test credentials & setup
```

## 🚀 Quick Links

### For Developers

- [System Architecture](Whole-Project/architecture.md)
- [API Reference](Whole-Project/api-reference.md)
- [Database Schema](Whole-Project/database-schema.dbml)
- [GCS Bucket Structure](Whole-Project/gcs-buckets.md)

### For Processes

- [Notification Workflows](../Processes/Notification_Workflows.md)
- [Appointment Workflows](../Processes/Appointment_Workflows.md)
- [User Management](../Processes/User_management_Workflows.md)
- [Video Meeting Jitsi Gemini](../Processes/VIDEO_MEETING_JITSI_GEMINI.md)

### For Patient Portal

- [Patient Portal Overview](Isara-Patient-Portal/overview.md)
- [Patient Features](Isara-Patient-Portal/features.md)
- [Patient Workflows](Isara-Patient-Portal/workflows.md)

### For Doctor Portal

- [Doctor Portal Overview](Isara-Doctor-Portal/overview.md)
- [Doctor Features](Isara-Doctor-Portal/features.md)
- [Admin Features](Isara-Doctor-Portal/admin-features.md)

## 📊 Test Accounts

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Patient | <demo.test@gmail.com> | YOUR_TEST_PASSWORD | Patient Portal |
| Patient Relative | <demo2.test@gmail.com> | YOUR_TEST_PASSWORD | Patient Portal |
| Doctor | <doctor.test@izara.com> | YOUR_TEST_DOCTOR_PASSWORD | Doctor Portal |
| Admin/Unit Test | <doctorunit.test@izara.com> | YOUR_TEST_PASSWORD | Doctor Portal |

## 🔗 Portal URLs (Development)

| Portal | Frontend | Backend |
|--------|----------|---------|
| Patient | <http://localhost:3005> | <http://localhost:3004> |
| Doctor | <http://localhost:3010> | Auth: 3011, GCS: 3012, Main: 3009 |

---

## 🔗 Live Portal URLs / ลิงก์ระบบ Production (Updated February 4, 2026)

| Portal | URL |
|--------|-----|
| **Patient Portal** | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> |
| **Doctor Portal** | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> |
| **Meeting Server** | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> |

---

## ☁️ Google Cloud Storage Buckets / Buckets ใน Cloud Storage

| Bucket | Purpose | Thai |
|--------|---------|------|
| `izara-users-credentials` | Authentication & credentials | ข้อมูลยืนยันตัวตน |
| `izara-patients-data` | Patient health records & PHR | ข้อมูลสุขภาพผู้ป่วย |
| `izara-doctors-data` | Doctor profiles, EMR & meeting recordings | ข้อมูลแพทย์และ EMR |
| `izara-appointments` | Appointments & scheduling | ข้อมูลการนัดหมาย |
| `izara-meta-data` | System config, clinical resources & content | เนื้อหาและการตั้งค่า |

---

## 🛠️ Tech Stack / เทคโนโลยีที่ใช้

### Frontend

- ⚛️ React 18 with TypeScript
- ⚡ Vite build tool
- 🎨 Tailwind CSS

### Backend

- 🟢 Node.js 22
- 🚂 Express.js
- 🔥 Firebase Auth
- ☁️ Google Cloud Storage SDK

### Google Services

- 📹 Jitsi Meet (meet.jit.si) - FREE video conferencing
- 📅 Google Calendar API
- 🗺️ Google Maps JavaScript API
- 🤖 Google Gemini AI API (gemini-2.5-flash-lite)
- 🗣️ Google Speech-to-Text API
- 📧 Gmail API

### Video Meeting Features

- 👨‍⚕️ Doctor as HOST with lobby/moderator controls
- 🚪 Patient joins via lobby (doctor approval)
- 👥 External guest invites (non-registered users)
- 🎥 Video recording & transcription
- 🤖 AI-powered meeting summaries

---

## 📋 Presentation Materials / เอกสารนำเสนอ

See `Presentations/` folder for:

- Complete presentation script
- 16 Mermaid workflow diagrams
- Comprehensive DBML database schema

---

## ✅ E2E Test Results (January 9, 2026 - v1.2.1)

| Test Suite | Tests | Pass Rate |
|------------|-------|-----------|
| Meeting API Tests (Local) | 53 | ✅ 100% |
| Meeting API Tests (Cloud) | 53 | ✅ 100% |
| Cloud Run E2E Tests | 51 | ✅ 100% |
| Unit Tests | 40 | ✅ 100% |
| 4-User Meeting UI Tests (Local) | 33 | ✅ 100% |
| 4-User Meeting UI Tests (Cloud) | 33 | ✅ 100% |
| External Guest Access Tests (Local) | 105 | ✅ 100% |
| External Guest Access Tests (Cloud) | 105 | ✅ 100% |
| **Total** | **420+** | ✅ **100%** |

- ✅ AI-powered meeting summaries saved to GCS
- ✅ Meeting summaries visible in Doctor Portal
- ✅ All email domains supported (Gmail, Hotmail, Yahoo, Outlook, .co.th, etc.)

---

**Last Updated:** January 9, 2026
**Version:** 1.2.1
