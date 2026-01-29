# 🏥 Izara Patient Portal

**Version 0.0.4** - A cloud-native telemedicine platform with AI-powered health assistance using Gemini AI, Personal Health Record (PHR) management, secure GCS storage, and modern calendar-based appointment booking.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![GCP](https://img.shields.io/badge/GCP-Ready-4285F4.svg)](https://cloud.google.com/)

---

## 🆕 What's New in v0.0.4

- 🔗 **Appointment Sync** - Improved synchronization with Doctor Portal
- 📊 **Real-time Data** - Appointments flow correctly to assigned doctors
- 🔒 **PDPA Compliance** - Thailand's data protection compliance

### 📚 Documentation
See the full project documentation in `/Documents/`:
- [VERSION_CHANGELOG.md](../Documents/VERSION_CHANGELOG.md) - Version history & roadmap
- [CROSS_PORTAL_WORKFLOWS.md](../Documents/CROSS_PORTAL_WORKFLOWS.md) - Workflows & flowcharts
- [DATA_SYNC_ARCHITECTURE.md](../Documents/DATA_SYNC_ARCHITECTURE.md) - Data synchronization details
- [IMPROVEMENT_PLAN.md](../Documents/IMPROVEMENT_PLAN.md) - Development roadmap

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Dataflow](#-dataflow)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Environment Configuration](#-environment-configuration)
- [Workflows](#-workflows)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vite - Port 3005)            │
│  Dashboard │ Health Studio │ Appointments │ PHR │ AI Chat       │
│  Medical Contents │ Calendar Integration │ Notifications        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST API
┌───────────────────────────────▼─────────────────────────────────┐
│                    Backend API (Express - Port 3004)            │
│  Auth │ PHR │ Appointments │ Doctors │ PDPA │ GCS │ AI (Gemini) │
│  Google Calendar │ Google Meet │ Google Maps │ Notifications    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ ADC/Service Account
┌───────────────────────────────▼─────────────────────────────────┐
│                      Google Cloud Platform                       │
├─────────────────────────────────────────────────────────────────┤
│  Google Cloud Storage (5 Buckets)                               │
│  ├── izara-users-credentials    # Auth, sessions, login history │
│  ├── izara-patients-data        # PHR, EMR, documents, consents │
│  ├── izara-doctors-data         # Doctor profiles, schedules    │
│  ├── izara-appointments         # Appointments, meetings        │
│  └── izara-meta-data            # Medications, tips, content    │
├─────────────────────────────────────────────────────────────────┤
│  Google APIs                                                    │
│  ├── Gemini AI (gemini-2.5-flash-lite) - Symptom analysis       │
│  ├── Google Calendar API - Appointment scheduling               │
│  ├── Google Meet API - Video consultations                      │
│  └── Google Maps API - Facility search                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🏠 Patient Dashboard & Health Studio
- **Health Studio**: Large right-side panel displaying health metrics, AI insights, and personalized recommendations
- **Latest Appointment Results**: View recent consultation outcomes and follow-up actions
- **Medical Content Tabs**: Read-only educational content from doctors/admin portal
- **Quick Actions**: Book appointment, AI chat, PHR access, facility search

### 📅 Smart Appointment Booking
- **Step 1 - Symptom Input**: 
  - Audio recording with microphone access
  - Image upload for visual symptoms
  - AI analysis using Gemini model for severity prediction
  - Disease/condition suggestions
- **Step 2 & 3 - Calendar-based Selection**:
  - Microsoft/Google Calendar-style interface
  - View doctor weekly availability
  - Date/time selection correlated with doctor schedules
  - Auto-matching based on AI-suggested specialty
  - Option to request admin scheduling if no match

### 🔔 Integrated Notifications
- Meeting notifications in messages
- Calendar sync with email and Google Calendar
- Appointment links to video meetings
- Email confirmations and reminders

### 🤖 AI-Powered Health Assistant
- Gemini AI symptom checker with audio/image analysis
- Severity prediction and triage recommendations
- Suggested specialties based on symptoms
- 24/7 health Q&A chatbot
- Risk assessment and health insights

### 📋 Personal Health Record (PHR)
- Demographics and vital signs tracking
- Medication management
- Allergy and chronic condition records
- Document upload (lab reports, prescriptions)
- Wearable device data integration

### 🔐 Privacy & Compliance
- PDPA consent management
- Living will documentation
- Granular data access controls
- Audit logging for all data access

### 🎨 Theme & Internationalization
- **Dark Mode**: Full support across all pages and components
  - Toggleable via settings or header icon
  - Persisted in `localStorage` as `patient-portal-theme`
  - Applied via `html.dark` class with Tailwind CSS
- **Multi-language (i18n)**: Thai and English support
  - Language toggle in settings and header
  - Persisted in `localStorage` as `patient-portal-language`
  - All UI text uses translation function `t(key)`
  - Includes: dashboard, booking, PHR, library, timeline, map, PDPA, living will

---

## 📁 Project Structure

```
Isara-patient-portal/
├── src/                          # Frontend Source
│   ├── components/               # Reusable UI Components
│   │   ├── layout/              # Layout components (MainLayout, Sidebar, Header)
│   │   ├── ui/                  # Base UI components (buttons, cards, modals)
│   │   ├── appointment/         # Appointment-related components
│   │   │   ├── SymptomInput.tsx       # Audio/image symptom input
│   │   │   ├── CalendarSelector.tsx   # Calendar-based time selection
│   │   │   ├── DoctorAvailability.tsx # Weekly availability view
│   │   │   └── AIAnalysisPanel.tsx    # Gemini analysis display
│   │   ├── health/              # Health-related components
│   │   │   ├── HealthStudio.tsx       # Main health studio panel
│   │   │   ├── VitalsChart.tsx        # Vital signs visualization
│   │   │   └── MedicalContent.tsx     # Educational content tabs
│   │   └── notification/        # Notification components
│   │       ├── NotificationBell.tsx   # Notification indicator
│   │       └── MeetingReminder.tsx    # Meeting notifications
│   ├── pages/                   # Page Components
│   │   ├── dashboard/           # Dashboard with Health Studio
│   │   ├── appointments/        # Appointment list, booking, details
│   │   ├── health/              # PHR, AI Doctor, Medical Records
│   │   ├── auth/                # Login, Register, OAuth callback
│   │   ├── profile/             # User profile management
│   │   ├── settings/            # App settings
│   │   ├── pdpa/                # PDPA consents, living will
│   │   ├── map/                 # Facility search map
│   │   └── timeline/            # Medical history timeline
│   ├── lib/                     # Utilities & Services
│   │   ├── api.ts               # Axios API client configuration
│   │   ├── services.ts          # Service layer (auth, PHR, appointments)
│   │   └── gemini.ts            # Gemini AI integration helpers
│   ├── contexts/                # React Contexts
│   │   ├── AuthContext.tsx      # Authentication state
│   │   ├── SettingsContext.tsx  # Theme, language & translations
│   │   └── NotificationContext.tsx # Notification state
│   ├── hooks/                   # Custom React Hooks
│   │   ├── useAudioRecorder.ts  # Audio recording hook
│   │   ├── useCalendar.ts       # Calendar integration hook
│   │   └── useNotifications.ts  # Notification management
│   ├── types/                   # TypeScript Definitions
│   │   └── index.ts             # All type definitions
│   ├── App.tsx                  # Main App with routing
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles (Tailwind)
├── server/                      # Backend API
│   ├── index.ts                 # Express server entry
│   ├── middleware/              # Express middleware
│   │   └── auth.ts              # JWT authentication
│   └── routes/                  # API Routes
│       ├── auth.ts              # Authentication endpoints
│       ├── phr.ts               # PHR CRUD operations
│       ├── appointments.ts      # Appointment management
│       ├── doctors.ts           # Doctor data & availability
│       ├── ai.ts                # Gemini AI endpoints
│       ├── google-services.ts   # Calendar, Meet, Maps APIs
│       ├── gcs.ts               # GCS signed URL operations
│       ├── pdpa.ts              # PDPA consent management
│       └── metadata.ts          # Medications, specialties, content
├── public/                      # Static assets
│   ├── manifest.json            # PWA manifest
│   └── service-worker.js        # PWA service worker
├── Dockerfile                   # Frontend Docker image
├── Dockerfile.backend           # Backend Docker image
├── nginx.conf                   # Nginx configuration
├── package.json                 # Dependencies & scripts
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── .env                         # Environment variables
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud SDK (authenticated)
- GCS buckets created (see Database Schema section)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Isara-patient-portal

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start development (frontend + backend)
npm run dev:all
```

### Access

- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:3004

### NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server (port 3005) |
| `npm run dev:server` | Start backend dev server (port 3004) |
| `npm run dev:all` | Start both frontend and backend |
| `npm run build` | Build frontend for production |
| `npm run build:server` | Build backend for production |
| `npm run preview` | Preview production build |

---

## 🔄 Dataflow

### Authentication Flow
```
Patient → Login Page → Backend Auth API → Validate credentials from GCS
    ↓
JWT Token generated → Stored in localStorage → AuthContext updated
    ↓
Protected routes accessible → API calls include Bearer token
```

### Appointment Booking Flow (New)
```
Step 1: Symptom Input
┌─────────────────────────────────────────────────────────────┐
│ Patient records audio → Uploads images → Text description   │
│                         ↓                                   │
│              Gemini AI Analysis                             │
│     ↓                   ↓                    ↓              │
│ Severity Level   Possible Conditions   Suggested Specialty  │
└─────────────────────────────────────────────────────────────┘
                          ↓
Step 2 & 3: Calendar Selection
┌─────────────────────────────────────────────────────────────┐
│ Calendar View (Microsoft/Google style)                      │
│     ↓                                                       │
│ Select Date → View available doctors for that date          │
│     ↓                                                       │
│ Select Time Slot → Doctor availability check                │
│     ↓                                                       │
│ Confirm Booking → Notifications sent → Calendar sync        │
└─────────────────────────────────────────────────────────────┘
```

### PHR Data Flow
```
Patient → Add Vital Signs → Backend API → Store in GCS (izara-patients-data)
                                      ↓
                          Retrieve historical data
                                      ↓
                          Charts & visualizations displayed
```

### AI Symptom Analysis Flow
```
Audio/Image/Text Input → Backend AI Route → Gemini API
                                        ↓
         Structured Response: {
           severity: "emergency" | "urgent" | "routine" | "self-care",
           conditions: ["possible condition 1", "possible condition 2"],
           specialties: ["recommended specialty"],
           recommendations: ["self-care tips"],
           warningSigngs: ["when to seek emergency care"]
         }
```

---

## 🗄 Database Schema

### GCS Bucket Structure

#### 1. `izara-users-credentials`
```
users/
  └── {user_id}.json           # User profile and credentials
sessions/
  └── {session_id}.json        # Active sessions
login-history/
  └── {user_id}/
      └── {timestamp}.json     # Login attempt logs
oauth-tokens/
  └── {user_id}.json           # OAuth refresh tokens
```

#### 2. `izara-patients-data`
```
patients/
  └── {patient_id}.json        # Patient demographics
phr/
  └── {patient_id}.json        # Personal Health Record
vitals/
  └── {patient_id}/
      └── {date}.json          # Daily vital signs
documents/
  └── {patient_id}/
      └── {document_id}        # Uploaded files
emr/
  └── {patient_id}/
      └── {encounter_id}.json  # Electronic Medical Records
prescriptions/
  └── {patient_id}/
      └── {prescription_id}.json
consents/
  └── {patient_id}/
      └── pdpa.json            # PDPA consents
living-will/
  └── {patient_id}.json        # Living will document
```

#### 3. `izara-doctors-data`
```
doctors/
  └── {doctor_id}.json         # Doctor profile
schedules/
  └── {doctor_id}/
      └── weekly.json          # Weekly availability
      └── {date}.json          # Daily appointments
```

#### 4. `izara-appointments`
```
appointments/
  └── {appointment_id}.json    # Appointment details
meetings/
  └── {appointment_id}.json    # Google Meet links
patient-appointments/
  └── {patient_id}/
      └── index.json           # Patient's appointment list
doctor-appointments/
  └── {doctor_id}/
      └── index.json           # Doctor's appointment list
```

#### 5. `izara-meta-data`
```
medications/
  └── database.json            # Medications database
specialties/
  └── list.json                # Medical specialties
health-tips/
  └── tips.json                # Health tips (deprecated)
medical-content/
  └── articles/
      └── {article_id}.json    # Educational articles from admin
  └── categories.json          # Content categories
hospitals/
  └── facilities.json          # Hospital/clinic list
```

### Key Data Types

```typescript
// User
interface User {
  id: string;
  patientId?: string;
  email: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodType?: string;
  avatarUrl?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

// Appointment
interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  appointmentTime: string;
  type: 'telehealth' | 'in_person';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  symptoms?: {
    audio?: string;      // GCS URI for audio
    images?: string[];   // GCS URIs for images
    description: string;
    aiAnalysis?: AISymptomAnalysis;
  };
  meetLink?: string;
  calendarEventId?: string;
}

// AI Analysis Result
interface AISymptomAnalysis {
  severity: 'emergency' | 'urgent' | 'routine' | 'self-care';
  possibleConditions: string[];
  suggestedSpecialties: string[];
  recommendations: string[];
  warningsSigns: string[];
  confidence: number;
}

// Doctor Availability
interface DoctorAvailability {
  doctorId: string;
  weeklySchedule: {
    [day: string]: TimeSlot[];
  };
  bookedSlots: {
    [date: string]: string[];  // Array of booked times
  };
}
```

---

## 📡 API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/validate` | POST | Validate session token |

### PHR (Personal Health Record)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/phr/:userId` | GET | Get PHR data |
| `/api/phr/:userId` | PUT | Update PHR data |
| `/api/phr/:userId/vitals` | GET | Get vital signs history |
| `/api/phr/:userId/vitals` | POST | Add vital signs |
| `/api/phr/:userId/timeline` | GET | Get medical timeline |

### Appointments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments/patient/:id` | GET | Get patient appointments |
| `/api/appointments/:id` | GET | Get appointment details |
| `/api/appointments` | POST | Create appointment |
| `/api/appointments/:id` | PUT | Update appointment |
| `/api/appointments/:id` | DELETE | Cancel appointment |

### Doctors
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/doctors` | GET | Get all doctors |
| `/api/doctors/:id` | GET | Get doctor details |
| `/api/doctors/:id/schedule` | GET | Get doctor schedule |
| `/api/doctors/:id/availability` | GET | Get weekly availability |

### AI Services
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | AI health chat |
| `/api/ai/symptom-checker` | POST | Analyze symptoms |
| `/api/ai/analyze-audio` | POST | Analyze audio symptom |
| `/api/ai/analyze-image` | POST | Analyze symptom image |
| `/api/ai/risk-assessment` | POST | Health risk assessment |

### Google Services
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/google/calendar/event` | POST | Create calendar event |
| `/api/google/calendar/availability` | GET | Check availability |
| `/api/google/meet/create` | POST | Create Meet link |
| `/api/google/maps/nearby` | GET | Search nearby facilities |

### Metadata
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metadata/medications` | GET | Get medications list |
| `/api/metadata/specialties` | GET | Get specialties |
| `/api/metadata/medical-content` | GET | Get educational content |
| `/api/metadata/health-tips` | GET | Get health tips (deprecated) |

---

## ⚙️ Environment Configuration

### Frontend Variables (VITE_ prefix - public)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_NAME` | Application name | Izara Patient Portal |
| `VITE_API_URL` | Backend API URL | http://localhost:3004 |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID | xxx.apps.googleusercontent.com |
| `VITE_GCS_BUCKET_PATIENT` | Patient data bucket | izara-patients-data |
| `VITE_GCS_BUCKET_APPOINTMENTS` | Appointments bucket | izara-appointments |
| `VITE_GOOGLE_CALENDAR_API_KEY` | Calendar API key | `YOUR_GOOGLE_CALENDAR_API_KEY` |
| `VITE_GOOGLE_MAPS_API_KEY` | Maps API key | `YOUR_GOOGLE_MAPS_API_KEY` |

### Backend Variables (server-side only)

| Variable | Description |
|----------|-------------|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCS_BUCKET_*` | Bucket names for each data type |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GEMINI_API_KEY` | Gemini AI API key |
| `GEMINI_MODEL` | Gemini model name (gemini-2.5-flash-lite) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |

---

## 📱 Workflows

### New Appointment Booking Workflow

1. **Patient initiates booking** from Dashboard or Appointments page
2. **Step 1 - Describe Symptoms**:
   - Record audio description (microphone permission required)
   - Upload images of visible symptoms
   - Add text description
   - AI analyzes inputs and suggests severity/specialty
3. **Step 2 & 3 - Select Time & Doctor**:
   - View calendar with available slots
   - Filter by AI-suggested specialty
   - See doctor availability in weekly view
   - Select date and time
   - Confirm booking
4. **Post-booking**:
   - Appointment created with pending status
   - Notification sent to patient and doctor
   - Calendar event created
   - Email confirmation sent
5. **Doctor confirms** appointment time
6. **Patient receives** final confirmation with meeting link

### Medical Content Access Workflow

1. Admin/Doctor creates content in Admin Portal
2. Content stored in `izara-meta-data/medical-content`
3. Patient opens Medical Content tab in Health Studio
4. Browse by category tabs
5. Read-only access to articles

### Notification Workflow

1. Appointment status changes (confirmed, rescheduled)
2. Backend creates notification record
3. Frontend polls/receives WebSocket update
4. Notification appears in:
   - Header notification bell
   - Messages page
   - Calendar view
5. Links to appointment details with meeting access

---

## 🔒 Security

- **JWT Authentication**: Token-based auth with expiry
- **PDPA Compliance**: Granular consent management
- **Signed URLs**: Secure file upload/download
- **Server-side secrets**: API keys never exposed to frontend
- **Audit Logging**: All data access logged

---

## 📄 License

MIT License - See LICENSE file

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Izara Telemedicine Platform** - Empowering patients with AI-driven healthcare access 🏥

