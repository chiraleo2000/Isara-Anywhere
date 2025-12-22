# 📚 Izara Telemedicine Documentation
# เอกสารประกอบระบบ Telemedicine อิสระ

---

## 🌟 Project Overview / ภาพรวมโปรเจค

**Izara Telemedicine** is a comprehensive telemedicine platform built for Thailand's healthcare system. The platform consists of two main portals:

1. **Patient Portal** (ระบบผู้ป่วย) - For patients to book appointments, manage health records, and consult with doctors
2. **Doctor Portal** (ระบบแพทย์) - For healthcare providers to manage consultations, EMR, prescriptions, and clinical resources

### Key Features / ฟีเจอร์หลัก
- 📹 Video consultations via Jitsi Meet (free, no account required)
- 🔔 Real-time notification system (in-app + email)
- 📋 Electronic Medical Records (EMR) with SOAP notes
- 💊 E-Prescribing with drug interaction checks
- 🧪 Lab & Imaging order management
- 📁 Personal Health Records (PHR)
- 🗺️ Healthcare facility map
- 🤖 AI-powered health assistant (Google Gemini)
- 📚 Medical content library (Thai-first)
- 🌐 Multi-language support (Thai primary, English)

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
| Patient | demo.test@gmail.com | P@ssw0rd | Patient Portal |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 | Doctor Portal |
| Admin | admin.test@izara.com | IzaraAdmin@2024 | Doctor Portal |

## 🔗 Portal URLs (Development)

| Portal | Frontend | Backend |
|--------|----------|---------|
| Patient | http://localhost:3005 | http://localhost:3004 |
| Doctor | http://localhost:3010 | Auth: 3011, GCS: 3012, Main: 3009 |

---

## 🔗 Live Portal URLs / ลิงก์ระบบ Production

| Portal | URL |
|--------|-----|
| **Patient Portal** | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| **Doctor Portal** | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

---

## ☁️ Google Cloud Storage Buckets / Buckets ใน Cloud Storage

| Bucket | Purpose | Thai |
|--------|---------|------|
| `izara-users-auth` | Authentication & sessions | ข้อมูลยืนยันตัวตน |
| `izara-users-credentials` | Service credentials | ข้อมูลรับรอง |
| `izara-patients-data` | Patient health records | ข้อมูลสุขภาพผู้ป่วย |
| `izara-doctors-data` | Doctor profiles & EMR | ข้อมูลแพทย์และ EMR |
| `izara-appointments` | Appointments & scheduling | ข้อมูลการนัดหมาย |
| `izara-meta-data` | System config & content | เนื้อหาและการตั้งค่า |

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
- 📹 Google Meet API
- 📅 Google Calendar API
- 🗺️ Google Maps JavaScript API
- 🤖 Google Gemini AI API
- 📧 Gmail API

---

## 📋 Presentation Materials / เอกสารนำเสนอ

See `Presentations/` folder for:
- Complete presentation script
- 16 Mermaid workflow diagrams
- Comprehensive DBML database schema

---

## ✅ E2E Test Results (December 15, 2025)

| Test Suite | Tests | Pass Rate |
|------------|-------|-----------|
| Appointment Workflow | 27 | 100% |
| Medical Content | - | 100% |
| Health Records | - | 100% |
| Dual Portal Video Meeting | 24 | 100% |

**All workflows verified with video meeting access (camera/microphone enabled)**

---

**Last Updated:** December 15, 2025
**Version:** 1.2.0
