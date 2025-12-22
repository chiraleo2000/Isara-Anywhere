# Izara Doctor Portal - Overview

## 🏥 Introduction

The Izara Doctor Portal is a clinical workflow management platform for healthcare providers. It enables doctors to manage appointments, create EMRs, write prescriptions, and access clinical resources. Admins have additional privileges for user and system management.

## 🌐 Access Information

| Environment | Frontend | Auth Server | GCS API | Main API |
|-------------|----------|-------------|---------|----------|
| Development | http://localhost:3010 | http://localhost:3011 | http://localhost:3012 | http://localhost:3009 |

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |

## 👥 User Types

| Role | Description |
|------|-------------|
| **Doctor** | Healthcare provider who manages patient appointments and records |
| **Admin** | Doctor with elevated privileges for system management |

## 🎯 Core Features

### Doctor Features
| Feature | Description | Status |
|---------|-------------|--------|
| Dashboard | Overview with patient queue and stats | ✅ |
| Patient Queue | Pending appointments to confirm | ✅ |
| Scheduled Meetings | Confirmed appointments with meeting links | ✅ |
| EMR Editor | Thai OPD Card format medical records | ✅ |
| E-Prescribing | Medication prescriptions | ✅ |
| Lab Orders | Laboratory test management | ✅ |
| Clinical Resources | Medical guidelines library | ✅ |
| Medical Consultants | Specialist directory | ✅ |

### Admin Features (Additional)
| Feature | Description | Status |
|---------|-------------|--------|
| Doctor Management | Approve/reject registrations | ✅ |
| Role Management | Promote/demote users | ✅ |
| All Appointments | System-wide appointment view | ✅ |
| Analytics | Usage statistics | ✅ |

## 🏗️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express.js (Node.js) |
| Auth | bcrypt, JWT-like sessions |
| Storage | Google Cloud Storage |
| AI | Google Gemini API |

## 📁 Project Structure

```
Isara-doctor-portal/
├── src/
│   ├── components/          # React components
│   │   ├── CompleteEMREditor.tsx
│   │   ├── CompletePrescribing.tsx
│   │   ├── CompleteLabOrders.tsx
│   │   ├── AIChatCopilot.tsx
│   │   └── common/          # Shared components
│   ├── pages/               # Page components
│   │   ├── DoctorDashboard.tsx
│   │   ├── HealthMeeting.tsx
│   │   ├── AdminDoctorManagement.tsx
│   │   ├── ClinicalResources.tsx
│   │   └── MedicalConsultants.tsx
│   ├── services/            # API services
│   └── types/               # TypeScript types
├── server/
│   ├── authServer.cjs       # Authentication (port 3011)
│   ├── gcsApiServer.cjs     # GCS operations (port 3012)
│   └── security/            # OWASP middleware
└── public/                  # Static assets
```

## 🔐 Authentication

| Property | Value |
|----------|-------|
| Method | Session-based tokens |
| Password | bcrypt (10 rounds) |
| Session | 24 hours |
| Rate Limit | 10 attempts / 15 min |
| Lockout | 30 min after 5 failures |
| Storage | `izara-users-credentials` |

## 📊 Data Buckets

| Bucket | Purpose |
|--------|---------|
| `izara-users-credentials` | Doctor/Admin credentials & sessions |
| `izara-doctors-data` | Doctor profiles |
| `izara-patients-data` | Patient data (read-only for assigned) |
| `izara-appointments` | Appointment & EMR records |
| `izara-meta-data` | Clinical resources, consultants |

---
**Last Updated:** December 15, 2025
