# Izara Doctor Portal - Complete Project Documentation

## 🏥 Overview

Izara Doctor Portal is a comprehensive telemedicine platform designed for healthcare professionals with a **separated backend and frontend architecture**. It provides AI-assisted clinical workflows, EMR/EHR management, video consultations, e-prescribing, and laboratory ordering capabilities with full Google Cloud Storage integration.

**Technology Stack:**
- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express.js (3 separate servers)
- **Real-time:** Socket.IO for WebSocket communication
- **Storage:** Google Cloud Storage (5 dedicated buckets)
- **AI:** Google Gemini AI API
- **Video:** Google Meet Integration
- **Authentication:** JWT-based sessions with bcrypt password hashing

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Services](#backend-services)
3. [Frontend Structure](#frontend-structure)
4. [Data Flow](#data-flow)
5. [API Endpoints](#api-endpoints)
6. [WebSocket Events](#websocket-events)
7. [GCS Bucket Structure](#gcs-bucket-structure)
8. [Core Components](#core-components)
9. [Services Layer](#services-layer)
10. [Authentication Flow](#authentication-flow)
11. [Health Studio Feature](#health-studio-feature)
12. [Demo Accounts](#demo-accounts)
13. [Development Setup](#development-setup)
14. [Data Models](#data-models)
15. [Security & Compliance](#security--compliance)
16. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                              │
│                     http://localhost:3010                           │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             │
┌────────────────────────────┴───────────────────────────────────────┐
│                    FRONTEND (Vite Dev Server)                       │
│                         Port 3010                                   │
│                  React + TypeScript + Tailwind                      │
│                                                                      │
│  Components: Dashboard, EMR, Prescribing, Labs, Queue, etc.        │
└──────────────────┬─────────────────────┬───────────────────────────┘
                   │                     │
                   │ API Calls           │ API Calls
                   │                     │
        ┌──────────┴──────────┐   ┌─────┴──────────┐
        │                     │   │                 │
        ▼                     │   ▼                 │
┌──────────────┐              │  ┌──────────────┐  │
│  Main API    │              │  │    Auth      │  │
│   Server     │              │  │   Server     │  │
│   Port 3010  │              │  │  Port 3011   │  │
│              │              │  │              │  │
│ • Dashboard  │              │  │ • Register   │  │
│ • Patients   │              │  │ • Login      │  │
│ • EMR        │              │  │ • Sessions   │  │
│ • Rx         │              │  │ • Verify     │  │
│ • Labs       │              │  │              │  │
│ • Queue      │              │  │ Storage      │  │
│ • Appts      │              │  │ Proxy ───────┼──┐
│              │              │  │              │  │
│ WebSocket    │              │  │ WebSocket    │  │
│ (Queue)      │              │  │ (Auth)       │  │
└──────┬───────┘              │  └──────┬───────┘  │
       │                      │         │          │
       │ Fetch Data           │         │ Proxy    │
       │                      │         │          │
       ▼                      │         ▼          │
┌──────────────┐              │  ┌──────────────┐  │
│     GCS      │◄─────────────┼──│  GCS API     │◄─┘
│   Buckets    │   Internal   │  │   Server     │
│              │     Only      │  │  Port 3012   │
│ 5 Buckets:   │              │  │              │
│ • credentials│              │  │ Internal     │
│ • doctors    │              │  │ Storage Ops  │
│ • patients   │              │  │              │
│ • appts      │              │  │ • Read       │
│ • metadata   │              │  │ • Write      │
└──────────────┘              │  │ • Delete     │
                              │  │ • List       │
                              │  └──────────────┘
                              │
                              │ All servers connect to GCS
                              └─────────────────────────────┘
```

### Server Separation Rationale

The architecture uses **4 separate processes**:

1. **Frontend (Vite)** - Serves React UI, handles routing
2. **Main API Server** - Handles clinical operations (EMR, Rx, Labs, Queue, Appointments)
3. **Auth Server** - Manages authentication, sessions, and proxies storage operations
4. **GCS API Server** - Internal service for direct GCS operations (not exposed to frontend)

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Independent scaling of each service
- ✅ Security isolation (GCS API is internal only)
- ✅ Better debugging and monitoring
- ✅ Easier to add new services

---

## 🔧 Backend Services

### 1. GCS API Server (Port 3012)

**File:** `server/gcsApiServer.cjs`

**Purpose:** Internal service for direct Google Cloud Storage operations. Not exposed to frontend.

**Key Features:**
- Direct GCS SDK integration
- Service account authentication
- Bucket management
- File upload/download
- Batch operations

**Endpoints:**
```
GET  /api/health                   - Health check
GET  /api/storage/read             - Read JSON from GCS
POST /api/storage/write            - Write JSON to GCS
POST /api/storage/upload           - Upload file (multipart)
DELETE /api/storage/delete         - Delete from GCS
GET  /api/storage/list             - List files in folder
POST /api/storage/batch-read       - Read multiple files
POST /api/storage/batch-write      - Write multiple files
```

**Authentication:**
- Uses service account: `public/izara-telemedicine-dd0b6abe2bc8.json`
- Falls back to Application Default Credentials if service account not found

**Startup Verification:**
- Checks service account file exists
- Verifies bucket access
- Lists available buckets

---

### 2. Auth Server (Port 3011)

**File:** `server/authServer.cjs`

**Purpose:** Authentication, session management, and storage proxy for frontend.

**Key Features:**
- User registration and login
- Session token management
- Password hashing with bcrypt
- JWT-like token generation
- Storage operation proxy
- WebSocket support

**Authentication Endpoints:**
```
POST /auth/register               - Register new doctor
POST /auth/login                  - Doctor login
POST /auth/logout                 - Logout
GET  /auth/verify                 - Verify session token
```

**Storage Proxy:**
```
ALL  /api/storage/*               - Proxies to GCS API Server (3012)
```

**WebSocket Events:**
```
authenticate                      - Authenticate socket connection
```

**Security Features:**
- Password hashing with bcrypt (10 salt rounds)
- Account lockout after 5 failed attempts (30 minutes)
- Session expiration (24 hours)
- Login history tracking

**Data Storage:**
- Users: `izara-users-credentials/users/{id}.json`
- Sessions: `izara-users-credentials/sessions/{id}.json`
- Login history: `izara-users-credentials/login-history/{id}.json`

---

### 3. Main API Server (Port 3010)

**File:** `server/mainApiServer.cjs`

**Purpose:** Clinical operations - EMR, prescriptions, lab orders, queue management, appointments.

**Key Features:**
- Doctor dashboard data
- Patient management
- EMR creation and retrieval
- E-prescribing
- Lab order management
- Queue management with real-time updates
- Appointment scheduling
- Metadata access (medications, ICD-10, etc.)
- PDPA audit logging

**Clinical Endpoints:**

**Dashboard:**
```
GET /api/dashboard/:doctorId      - Doctor dashboard with stats, queue, schedule
```

**Patient Management:**
```
GET /api/patients                 - List all patients
GET /api/patients/:patientId      - Get patient details with PHR, consents, timeline
```

**EMR Operations:**
```
POST /api/emr                     - Create EMR record
GET  /api/emr/patient/:patientId  - Get patient EMRs
```

**E-Prescribing:**
```
POST /api/prescriptions                    - Create prescription
GET  /api/prescriptions/patient/:patientId - Get patient prescriptions
```

**Lab Orders:**
```
POST /api/lab-orders                    - Create lab order
GET  /api/lab-orders/patient/:patientId - Get patient lab orders
```

**Queue Management:**
```
GET  /api/queue/doctor/:doctorId  - Get doctor's queue
POST /api/queue/call-next         - Call next patient
POST /api/queue/skip              - Skip patient with reason
```

**Appointments:**
```
GET /api/appointments             - List all appointments
GET /api/appointments/:id         - Get appointment with meeting link
```

**Metadata (Reference Data):**
```
GET /api/metadata/medications     - Medications database
GET /api/metadata/lab-tests       - Lab tests catalog
GET /api/metadata/icd10-codes     - ICD-10 diagnosis codes
GET /api/metadata/drug-interactions - Drug interactions database
```

**WebSocket Events:**
```
join-doctor-room                  - Join doctor's room for updates
join-queue-room                   - Join queue room for real-time updates
queue-updated                     - Queue status changed (emitted)
```

**PDPA Compliance:**
- All patient data access is logged to `audit/access-logs/{patientId}_{date}.json`
- Audit log includes: userId, action, patientId, resourceId, timestamp
- Automatic audit logging for: READ_EMR, CREATE_EMR, CREATE_PRESCRIPTION, CREATE_LAB_ORDER

**GCS Integration:**
- Fetches data from GCS via internal fetch to GCS API Server (port 3012)
- Writes data back to GCS after operations
- Updates multiple files (e.g., EMR list + patient timeline)

---

### 4. Master Startup Script

**File:** `server/startAll.cjs`

**Purpose:** Orchestrates startup of all backend servers in correct order.

**Startup Sequence:**
1. GCS API Server (3012) - Must start first for storage operations
2. Auth Server (3011) - Depends on GCS API for user data
3. Main API Server (3010) - Depends on GCS API for clinical data

**Features:**
- Sequential startup with 2-second delays
- Colored console output per server
- Unified logging with timestamps
- Graceful shutdown (Ctrl+C kills all servers)
- Error handling and status reporting

**Usage:**
```bash
npm run backend        # Start all backend servers
npm run dev           # Start backend + frontend
```

---

## 🖥️ Frontend Structure

### Directory Structure

```
Isara-doctor-portal/
├── App.tsx                      # Main application entry, routing, auth
├── index.tsx                    # React DOM mount point
├── types.ts                     # TypeScript type definitions
├── vite.config.ts              # Vite configuration (port 3010)
├── tailwind.config.js          # Tailwind CSS configuration
├── .env                        # Environment variables
│
├── components/                  # React UI Components
│   ├── DoctorDashboard.tsx     # 3-column dashboard with Health Studio
│   ├── CompleteEMREditor.tsx   # EMR creation/editing modal
│   ├── CompletePrescribing.tsx # E-prescribing module
│   ├── CompleteLabOrders.tsx   # Lab ordering system
│   ├── CompleteSchedule.tsx    # Appointment scheduling calendar
│   ├── PatientManagement.tsx   # Patient list & search
│   ├── PatientRecordViewer.tsx # Full patient record viewer
│   ├── QueueManagement.tsx     # Patient queue with real-time updates
│   ├── GeminiAIStudio.tsx      # AI assistant chat interface
│   ├── ClinicalResources.tsx   # Medical guidelines & resources
│   ├── VirtualMeeting.tsx      # Google Meet video consultation
│   ├── ResponsiveLayout.tsx    # Main layout wrapper with navigation
│   ├── LayoutAndAuthComponents.tsx # Auth forms & nav components
│   └── ui/
│       └── EnhancedUI.tsx      # Reusable UI components
│
├── services/                    # Business Logic & Data Services
│   ├── apiServices.ts          # API calls to Main API Server (3010)
│   ├── authServices.ts         # Auth calls to Auth Server (3011)
│   ├── gcsDataService.ts       # GCS data operations via Auth Server
│   ├── simpleAuth.ts           # Client-side auth helpers
│   ├── emrService.ts           # EMR operations
│   ├── appointmentService.ts   # Appointment operations
│   ├── patientDataService.ts   # Patient data operations
│   ├── patientRecordService.ts # Patient record management
│   ├── doctorDataService.ts    # Doctor data operations
│   ├── referenceDataService.ts # Reference data (meds, ICD-10, etc.)
│   ├── auditLogService.ts      # PDPA audit logging
│   ├── geminiService.ts        # Gemini AI integration
│   ├── geminiClinicalService.ts # Clinical AI functions
│   ├── drugDatabase.ts         # Medication database
│   ├── labTestDatabase.ts      # Lab test catalog
│   ├── externalServices.ts     # Google Calendar/Meet integration
│   ├── enhancedMeetingService.ts # Video meeting management
│   └── config.ts               # App configuration
│
├── hooks/                       # Custom React Hooks
│   └── useLocalStorage.ts      # localStorage hook
│
├── scripts/                     # Build & Data Scripts
│   ├── generateDemoData.cjs    # Generate demo data (MAIN)
│   ├── uploadToGCS.cjs         # Upload data to GCS
│   ├── generateDoctorMockData.cjs
│   ├── generateDoctorUsers.cjs
│   └── generateLocalData.cjs
│
├── server/                      # Backend Server Files
│   ├── startAll.cjs            # Master startup script
│   ├── mainApiServer.cjs       # Main API Server (3010)
│   ├── authServer.cjs          # Auth Server (3011)
│   └── gcsApiServer.cjs        # GCS API Server (3012)
│
├── public/
│   ├── mockData/               # Local JSON data files (development)
│   │   ├── doctors.json
│   │   ├── patients.json
│   │   ├── appointments.json
│   │   ├── queue.json
│   │   ├── emrs.json
│   │   ├── prescriptions.json
│   │   ├── lab-orders.json
│   │   ├── imaging-orders.json
│   │   ├── medications.json
│   │   ├── lab-tests.json
│   │   └── icd10-codes.json
│   └── izara-telemedicine-dd0b6abe2bc8.json  # GCS service account
│
└── READ/                        # Comprehensive Documentation
    ├── doctor_app_requirements.md
    ├── izara-ultra-comprehensive-dataflow.html
    ├── izara-all-feature-workflows.html
    ├── QUICK_REFERENCE.md
    └── README.md
```

---

## 🔄 Data Flow

### Complete Request Flow Example: Create EMR

```
1. USER ACTION
   └─> User clicks "Save EMR" in CompleteEMREditor.tsx

2. FRONTEND COMPONENT
   └─> CompleteEMREditor.tsx
       └─> Calls: emrService.create(emrData)

3. FRONTEND SERVICE
   └─> services/emrService.ts
       └─> POST http://localhost:3010/api/emr
           Headers: Authorization: Bearer {sessionToken}
           Body: { patientId, doctorId, diagnosis, ... }

4. MAIN API SERVER (Port 3010)
   └─> server/mainApiServer.cjs
       └─> authenticateToken() middleware
           ├─> Validates session token
           └─> Adds req.user
       └─> POST /api/emr handler
           ├─> Generate EMR ID
           ├─> Fetch all EMRs: fetchFromGCS('patient', 'emrs.json')
           │   └─> Internal fetch to GCS API Server (3012)
           ├─> Add new EMR to array
           ├─> Write back: writeToGCS('patient', 'emrs.json', allEMRs)
           │   └─> Internal POST to GCS API Server (3012)
           ├─> Update patient timeline
           │   └─> writeToGCS('patient', 'patients/{id}/timeline.json')
           ├─> Log audit access
           │   └─> logAuditAccess({ action: 'CREATE_EMR', ... })
           │       └─> writeToGCS('patient', 'audit/access-logs/{id}.json')
           └─> Return response

5. GCS API SERVER (Port 3012)
   └─> server/gcsApiServer.cjs
       └─> POST /api/storage/write
           ├─> Authenticate with service account
           ├─> Get GCS bucket
           ├─> Save JSON file
           ├─> Make public (optional)
           └─> Return success

6. GOOGLE CLOUD STORAGE
   └─> izara-patients-data bucket
       ├─> emrs.json updated
       ├─> patients/{id}/timeline.json updated
       └─> audit/access-logs/{id}_{date}.json updated

7. RESPONSE BACK TO FRONTEND
   └─> Main API Server responds with created EMR
       └─> Frontend updates UI
           └─> Shows success notification
```

### Authentication Flow

```
1. USER ENTERS CREDENTIALS
   └─> LoginForm component
       └─> Calls: authService.login(email, password)

2. AUTH SERVICE (Frontend)
   └─> services/authServices.ts
       └─> POST http://localhost:3011/auth/login
           Body: { email, password }

3. AUTH SERVER (Port 3011)
   └─> server/authServer.cjs
       └─> POST /auth/login handler
           ├─> Fetch users index: fetchFromGCS('credentials', 'users/index.json')
           ├─> Find user by email
           ├─> Fetch full user: fetchFromGCS('credentials', 'users/{id}.json')
           ├─> Check account lockout
           ├─> Verify password with bcrypt.compareSync()
           ├─> If valid:
           │   ├─> Reset login attempts
           │   ├─> Update last login
           │   ├─> Generate session token (crypto.randomBytes)
           │   ├─> Create session object
           │   ├─> Write session: writeToGCS('credentials', 'sessions/{token}.json')
           │   ├─> Update login history
           │   └─> Return { token, user, expiresAt }
           └─> If invalid:
               ├─> Increment login attempts
               ├─> Lock account if attempts >= 5
               └─> Return error

4. GCS OPERATIONS (via GCS API Server)
   └─> Auth Server → GCS API Server (3012)
       └─> Write session and update user

5. FRONTEND RECEIVES TOKEN
   └─> authService.login() returns { token, user }
       └─> Store in memory/localStorage
       └─> Set Authorization header for future requests
       └─> Redirect to dashboard
```

### Real-Time Queue Updates Flow

```
1. PATIENT CHECKED IN
   └─> Queue system adds patient to queue.json

2. DOCTOR CALLS NEXT PATIENT
   └─> Frontend: queueService.callNext(doctorId)
       └─> POST http://localhost:3010/api/queue/call-next

3. MAIN API SERVER
   └─> Updates queue status in GCS
       └─> Emits WebSocket event
           └─> io.to(`queue-${doctorId}`).emit('queue-updated', { queue })

4. CONNECTED CLIENTS
   └─> All doctors in that room receive update
       └─> Update UI automatically
           └─> No page refresh needed
```

---

## 📡 API Endpoints

### Auth Server (Port 3011)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/register` | No | Register new doctor account |
| POST | `/auth/login` | No | Login with email/password |
| POST | `/auth/logout` | Yes | Logout and delete session |
| GET | `/auth/verify` | Yes | Verify session token validity |
| GET | `/api/health` | No | Health check |
| ALL | `/api/storage/*` | No | Proxy to GCS API Server |

### Main API Server (Port 3010)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/dashboard/:doctorId` | Yes | Dashboard data (stats, queue, schedule) |
| GET | `/api/patients` | Yes | List all patients |
| GET | `/api/patients/:patientId` | Yes | Patient details with PHR, consents, timeline |
| POST | `/api/emr` | Yes | Create EMR record |
| GET | `/api/emr/patient/:patientId` | Yes | Get patient's EMR records |
| POST | `/api/prescriptions` | Yes | Create prescription |
| GET | `/api/prescriptions/patient/:patientId` | Yes | Get patient's prescriptions |
| POST | `/api/lab-orders` | Yes | Create lab order |
| GET | `/api/lab-orders/patient/:patientId` | Yes | Get patient's lab orders |
| GET | `/api/queue/doctor/:doctorId` | Yes | Get doctor's patient queue |
| POST | `/api/queue/call-next` | Yes | Call next patient in queue |
| POST | `/api/queue/skip` | Yes | Skip patient with reason |
| GET | `/api/appointments` | Yes | List all appointments |
| GET | `/api/appointments/:id` | Yes | Get appointment with meeting link |
| GET | `/api/metadata/medications` | No | Medications database |
| GET | `/api/metadata/lab-tests` | No | Lab tests catalog |
| GET | `/api/metadata/icd10-codes` | No | ICD-10 diagnosis codes |
| GET | `/api/metadata/drug-interactions` | No | Drug interactions database |

### GCS API Server (Port 3012) - Internal Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/storage/read` | Read JSON from GCS |
| POST | `/api/storage/write` | Write JSON to GCS |
| POST | `/api/storage/upload` | Upload file (multipart) |
| DELETE | `/api/storage/delete` | Delete from GCS |
| GET | `/api/storage/list` | List files in folder |
| POST | `/api/storage/batch-read` | Read multiple files at once |
| POST | `/api/storage/batch-write` | Write multiple files at once |

---

## 🔌 WebSocket Events

### Connection Setup

**Auth Server (Port 3011):**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3011', {
  path: '/ws'
});

// Authenticate socket
socket.emit('authenticate', sessionToken);
```

**Main API Server (Port 3010):**
```javascript
const socket = io('http://localhost:3010', {
  path: '/ws'
});

// Join doctor room
socket.emit('join-doctor-room', doctorId);

// Join queue room for real-time updates
socket.emit('join-queue-room', doctorId);
```

### Events

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `authenticate` | Client → Server | `sessionToken` | Authenticate WebSocket connection |
| `join-doctor-room` | Client → Server | `doctorId` | Join doctor's room for updates |
| `join-queue-room` | Client → Server | `doctorId` | Join queue room for real-time updates |
| `queue-updated` | Server → Client | `{ queue: QueueItem[] }` | Queue status changed |
| `appointment-confirmed` | Server → Client | `{ appointment: Appointment }` | New appointment confirmed |
| `new-prescription` | Server → Client | `{ prescription: Prescription }` | New prescription created |
| `disconnect` | Bidirectional | - | Connection closed |

---

## 📦 GCS Bucket Structure

### 1. izara-users-credentials

**Purpose:** Authentication and user management

```
izara-users-credentials/
├── users/
│   ├── index.json                    # User index for email lookups
│   └── {userId}.json                 # Individual user credentials
├── sessions/
│   └── {sessionToken}.json           # Active sessions
├── oauth/
│   └── tokens/{userId}.json          # OAuth tokens
└── login-history/
    └── {userId}.json                 # Login history logs
```

**Example: users/DOC-123.json**
```json
{
  "id": "DOC-123",
  "email": "doctor@hospital.com",
  "passwordHash": "$2a$10$...",
  "role": "doctor",
  "doctorId": "DOC-123",
  "medicalLicenseNumber": "MD-123456",
  "isActive": true,
  "emailVerified": true,
  "createdAt": "2025-11-27T10:00:00Z",
  "lastLogin": "2025-11-27T14:30:00Z",
  "loginAttempts": 0,
  "lockedUntil": null,
  "preferences": { "theme": "light", "language": "en" }
}
```

### 2. izara-doctors-data

**Purpose:** Doctor profiles, schedules, and patient queue

```
izara-doctors-data/
├── doctors.json                      # All doctor profiles (array)
├── queue.json                        # Patient queue (shared across doctors)
└── doctors/
    └── {doctorId}/
        ├── schedule.json             # Doctor's schedule/availability
        └── stats.json                # Doctor statistics
```

**Example: doctors.json**
```json
[
  {
    "id": "DOC-123",
    "name": "Dr. John Smith",
    "specialty": "General Practice",
    "email": "doctor@hospital.com",
    "medicalLicenseNumber": "MD-123456",
    "avatarUrl": "https://...",
    "rating": 4.8,
    "experience": "10 years",
    "qualifications": ["MD", "Board Certified"],
    "availableSlots": ["09:00", "10:00", "11:00"]
  }
]
```

### 3. izara-patients-data

**Purpose:** All patient clinical data

```
izara-patients-data/
├── patients.json                     # Patient demographics (array)
├── emrs.json                         # All EMR records (array)
├── prescriptions.json                # All prescriptions (array)
├── lab-orders.json                   # All lab orders (array)
├── imaging-orders.json               # All imaging orders (array)
├── patients/
│   └── {patientId}/
│       ├── phr.json                  # Personal Health Record
│       ├── vital-signs.json          # Vital signs history
│       ├── timeline.json             # Medical timeline
│       └── pdpa/
│           ├── consents.json         # PDPA consents
│           └── living-will.json      # Living will
└── audit/
    └── access-logs/
        └── {patientId}_{date}.json   # Audit logs per patient per day
```

**Example: emrs.json**
```json
[
  {
    "id": "emr_123",
    "patientId": "PAT-001",
    "doctorId": "DOC-123",
    "doctorName": "Dr. John Smith",
    "encounterDate": "2025-11-27T14:00:00Z",
    "encounterType": "consultation",
    "chiefComplaint": "Headache",
    "historyOfPresentIllness": "Patient reports...",
    "vitalSigns": { "bloodPressure": "120/80", ... },
    "physicalExamination": { "general": "Alert", ... },
    "diagnosis": [
      { "code": "G44.1", "description": "Tension headache", "type": "primary" }
    ],
    "treatmentPlan": "Prescribe analgesics...",
    "status": "finalized",
    "createdAt": "2025-11-27T14:30:00Z",
    "lastModified": "2025-11-27T14:30:00Z"
  }
]
```

### 4. izara-appointments

**Purpose:** Appointment scheduling and Google Meet links

```
izara-appointments/
├── appointments.json                 # Appointment index (array)
├── appointments/
│   └── {appointmentId}/
│       ├── details.json              # Full appointment details
│       └── meeting-link.json         # Google Meet link
└── {doctorId}/
    └── {date}.json                   # Doctor's appointments for specific date
```

**Example: appointments/APT-123/meeting-link.json**
```json
{
  "appointmentId": "APT-123",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "calendarEventId": "event_123",
  "createdAt": "2025-11-27T10:00:00Z",
  "expiresAt": "2025-11-27T15:00:00Z"
}
```

### 5. izara-meta-data

**Purpose:** Reference data and clinical databases

```
izara-meta-data/
├── medications.json                  # Drug database
├── lab-tests.json                    # Lab test catalog
├── icd10-codes.json                  # ICD-10 diagnosis codes
├── drug-interactions.json            # Drug interaction database
└── reference-ranges.json             # Lab test normal ranges
```

**Example: medications.json**
```json
[
  {
    "id": "MED-001",
    "name": "Amoxicillin",
    "genericName": "Amoxicillin",
    "brandNames": ["Amoxil", "Trimox"],
    "category": "Antibiotic",
    "strength": ["250mg", "500mg"],
    "route": ["oral"],
    "indications": ["Bacterial infections"],
    "contraindications": ["Penicillin allergy"],
    "sideEffects": ["Nausea", "Diarrhea"]
  }
]
```

---

## 🧩 Core Components

### 1. App.tsx - Application Entry Point

**Purpose:** Main router, authentication, and state management.

**Key State:**
```typescript
const [user, setUser] = useState<User | null>(null);
const [currentView, setCurrentView] = useState('dashboard');
const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
const [showEMREditor, setShowEMREditor] = useState(false);
const [showPrescribing, setShowPrescribing] = useState(false);
const [showLabOrders, setShowLabOrders] = useState(false);
const [showAIStudio, setShowAIStudio] = useState(false);
const [showMeeting, setShowMeeting] = useState(false);
```

**Authentication:**
- Checks for session on load
- Redirects to login if no session
- Loads doctor profile from GCS

**Routing:**
- Dashboard, Schedule, Patients, Queue, Clinical Resources
- Modal management for EMR, Prescribing, Labs

---

### 2. DoctorDashboard.tsx - Main Dashboard

**Layout:** 3-column clinical workspace

```
┌─────────────────────────────────────────────────────────────────┐
│                    KPI Dashboard Cards (6 cards)                │
├─────────────┬────────────────────────┬──────────────────────────┤
│             │                        │                          │
│  HEALTH     │    HEALTH MEETING      │   HEALTH STUDIO         │
│   DATA      │                        │                          │
│             │  ┌─────────────────┐   │  [การวินิจฉัย]         │
│ Patient     │  │ Video Call Area │   │  [แผนการรักษา]         │
│  Queue      │  └─────────────────┘   │  [รายงานเชิงระบบ]      │
│             │                        │  [ภาพวินิจฉัย]          │
│  [Search]   │  AI Summary Boxes      │  [ห้องปฏิบัติการ]      │
│  [View All] │  • History Summary     │  [พยาธิวิทยา]          │
│             │  • Meeting Summary     │                          │
│             │                        │  [Clinical Resources]    │
│             │  Tab Filters:          │                          │
│             │  • Investigation       │                          │
│             │  • Treatment           │                          │
│             │  • Refer               │                          │
└─────────────┴────────────────────────┴──────────────────────────┘
```

**Data Loading:**
- Queue from `/api/queue/doctor/:doctorId`
- Patient demographics from `/api/patients`
- Clinical data when patient selected (EMRs, labs)

**Health Studio Tabs:**
1. **Diagnosis (การวินิจฉัย)** - Patient info, vitals, diagnosis, treatment plan
2. **Treatment (แผนการรักษา)** - Opens e-prescribing modal
3. **System Report (รายงานเชิงระบบ)** - HPI, physical exam, EMR history
4. **Radiology (ภาพวินิจฉัย)** - Imaging orders and results
5. **Laboratory (ห้องปฏิบัติการ)** - Lab results with reference ranges
6. **Pathology (พยาธิวิทยา)** - Pathology services

---

### 3. CompleteEMREditor.tsx - EMR Creation

**Purpose:** Create and edit Electronic Medical Records.

**Features:**
- SOAP note template
- ICD-10 code search (via Gemini AI)
- Vital signs entry
- Physical examination by system
- Treatment plan
- Digital signature

**API Calls:**
```typescript
// Save EMR
POST /api/emr
Body: {
  patientId, doctorId, encounterDate, chiefComplaint,
  historyOfPresentIllness, vitalSigns, physicalExamination,
  diagnosis, treatmentPlan, medications, labOrders
}
```

---

### 4. CompletePrescribing.tsx - E-Prescribing

**Purpose:** Electronic prescription creation with safety checks.

**Features:**
- Medication search from database
- Dosage calculator
- Drug interaction checking
- Allergy verification
- Prescription history

**Safety Checks:**
1. Check drug-drug interactions
2. Check patient allergies
3. Verify dosage ranges
4. Check duplicate prescriptions

**API Calls:**
```typescript
// Get medications
GET /api/metadata/medications

// Check interactions
GET /api/metadata/drug-interactions

// Create prescription
POST /api/prescriptions
```

---

### 5. QueueManagement.tsx - Patient Queue

**Purpose:** Real-time patient queue management.

**Features:**
- Live queue updates via WebSocket
- Call next patient
- Skip patient with reason
- Priority indicators
- Wait time estimation

**WebSocket Integration:**
```typescript
socket.on('queue-updated', (data) => {
  setQueue(data.queue);
});
```

**API Calls:**
```typescript
// Get queue
GET /api/queue/doctor/:doctorId

// Call next
POST /api/queue/call-next
Body: { doctorId }

// Skip patient
POST /api/queue/skip
Body: { patientId, reason }
```

---

## 🔐 Authentication Flow

### Complete Authentication Sequence

```
1. USER OPENS APP
   └─> App.tsx useEffect()
       └─> Check for stored session token

2. NO TOKEN FOUND
   └─> Show LoginForm

3. USER ENTERS CREDENTIALS
   └─> LoginForm.tsx
       └─> authService.login(email, password)
           └─> POST http://localhost:3011/auth/login

4. AUTH SERVER PROCESSES
   └─> Verify credentials
   └─> Generate session token
   └─> Store session in GCS
   └─> Return { token, user, expiresAt }

5. FRONTEND RECEIVES RESPONSE
   └─> Store token in memory
   └─> setUser(user)
   └─> Redirect to dashboard

6. SUBSEQUENT API CALLS
   └─> Include header: Authorization: Bearer {token}

7. API SERVER VALIDATES
   └─> authenticateToken() middleware
       └─> Extract token
       └─> Fetch session from GCS
       └─> Verify not expired
       └─> Attach user to request
       └─> Continue to handler
```

### Session Management

**Session Object:**
```json
{
  "id": "session_token_here",
  "userId": "DOC-123",
  "email": "doctor@hospital.com",
  "role": "doctor",
  "createdAt": "2025-11-27T10:00:00Z",
  "expiresAt": "2025-11-28T10:00:00Z",
  "lastActivity": "2025-11-27T14:30:00Z"
}
```

**Expiration:**
- Default: 24 hours
- Configurable via `VITE_SESSION_TIMEOUT`
- Automatic logout on expiration

---

## 🩺 Health Studio Feature

### Overview

Health Studio is the clinical workspace in the right column of the dashboard. It provides 6 specialized tools for patient care.

### Data Flow

```
User clicks Health Studio tab
        │
        ▼
handleStudioAction(action)
        │
        ├── If 'treatment' → setShowPrescribing(true)
        │
        └── Otherwise → setStudioModal(action)
                │
                ▼
        renderStudioModalContent()
                │
                ├── Fetch latestEMR = selectedPatientEMRs[0]
                ├── Get patientName = selectedPatient?.demographics?.name
                ├── Get allergies = selectedPatient?.medicalInfo?.allergies
                ├── Get conditions = selectedPatient?.medicalInfo?.chronicConditions
                └── For labs: selectedPatientLabs
```

### Modal Content Details

#### 1. Diagnosis Modal (การวินิจฉัย)

**Data Sources:**
- Latest EMR for vital signs and diagnosis
- Patient record for demographics, allergies, conditions
- Medications from patient record

**Sections:**
- Patient header (name, chief complaint, allergies)
- Clinical assessment (vital signs from EMR)
- Current conditions
- Current medications
- Diagnosis (ICD-10 codes with labels)
- Treatment plan

#### 2. System Report Modal (รายงานเชิงระบบ)

**Data Sources:**
- Latest EMR for HPI and physical exam
- All patient EMRs for history timeline

**Sections:**
- Patient header
- History of Present Illness (from EMR)
- Physical Examination (all systems from EMR)
- EMR History Timeline (all previous EMRs)

#### 3. Laboratory Modal (ห้องปฏิบัติการ)

**Data Sources:**
- Lab orders filtered by patient ID
- Lab results with reference ranges

**Features:**
- Results table per lab order
- Abnormal value highlighting
- Interpretation notes
- Order new labs button

#### 4. Radiology Modal (ภาพวินิจฉัย)

**Data Sources:**
- Imaging orders filtered by patient ID

**Features:**
- Imaging order list with status
- Order new imaging buttons (X-Ray, CT, MRI, Ultrasound)
- Important notes (contrast, allergies)

---

## 🧪 Demo Accounts

### Patient Account

**Basic Info:**
```
Name: demotest
Email: demo.test@gmail.com
ID: PAT-DEMO-001
Age: 45
Gender: Male
Blood Type: O+
```

**Medical Info:**
- Allergies: Penicillin
- Chronic Conditions: Hypertension, Type 2 Diabetes
- Current Medications: Amlodipine 5mg OD, Metformin 500mg BD

**Demo Data Includes:**
- 2 EMR records (initial consultation, follow-up)
- 2 Lab orders (Lipid Profile, Renal Function with results)
- 2 Prescriptions (active and completed)
- 1 Imaging order (Chest X-Ray with report)
- 3 Appointments (1 scheduled, 2 completed)

### Doctor Account

**Basic Info:**
```
Name: Dr. Example Test
Email: example.test@hospital.com
ID: DOC-DEMO-001
Specialty: General Practice
License: MD-DEMO-001
Hospital: X Hospital Bangkok
```

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud Platform account
- Service account key file

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Edit .env file with your credentials

# 3. Generate demo data
npm run generate:demo

# 4. Upload to GCS (optional, requires auth)
npm run upload:gcs

# 5. Start development
npm run dev
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all servers + frontend |
| `npm run backend` | Start all backend servers only |
| `npm run backend:main` | Start main API server only |
| `npm run backend:auth` | Start auth server only |
| `npm run backend:gcs` | Start GCS API server only |
| `npm run frontend` | Start Vite frontend only |
| `npm run build` | Build for production |
| `npm run generate:demo` | Generate demo data |
| `npm run upload:gcs` | Upload data to GCS |
| `npm run setup:complete` | Generate + upload |

---

## 📊 Data Models

### User / Doctor

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor';
  doctorId: string;
  medicalLicenseNumber: string;
  isActive: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  specialty?: string;
  preferences: UserPreferences;
}
```

### Patient Record

```typescript
interface PatientRecord {
  id: string;
  demographics: {
    name: string;
    dateOfBirth: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    photo?: string;
    idNumber: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
    emergencyContact: EmergencyContact;
  };
  medicalInfo: {
    bloodType?: string;
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
  };
  consentStatus: ConsentStatus;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive';
}
```

### EMR Record

```typescript
interface EMRRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: string;
  encounterType: 'consultation' | 'follow-up' | 'emergency';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  vitalSigns: VitalSigns;
  physicalExamination: Record<string, string>;
  diagnosis: DiagnosisEntry[];
  treatmentPlan: string;
  medications: MedicationEntry[];
  status: 'draft' | 'finalized';
  createdAt: string;
  lastModified: string;
}
```

### Prescription

```typescript
interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  encounterDate: string;
  medications: PrescriptionItem[];
  status: 'pending' | 'sent' | 'dispensed' | 'cancelled';
  digitalSignature: string;
  createdAt: string;
}
```

### Lab Order

```typescript
interface LabOrder {
  id: string;
  patientId: string;
  doctorId: string;
  orderDate: string;
  tests: LabTestResult[];
  testCategory: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'collected' | 'completed';
  interpretation: string;
}
```

---

## 🔒 Security & Compliance

### PDPA Compliance (Thailand Personal Data Protection Act)

**Implementation:**
- All patient data access is logged
- Audit logs stored in GCS: `audit/access-logs/{patientId}_{date}.json`
- Logs include: userId, action, patientId, resourceId, timestamp
- Automatic logging for: READ_EMR, CREATE_EMR, CREATE_PRESCRIPTION, CREATE_LAB_ORDER

**Audit Log Entry:**
```json
{
  "id": "audit_123",
  "userId": "DOC-123",
  "action": "READ_EMR",
  "patientId": "PAT-001",
  "resourceId": "emr_456",
  "timestamp": "2025-11-27T14:30:00Z",
  "consentVerified": true
}
```

### Authentication Security

- Passwords hashed with bcrypt (10 salt rounds)
- Account lockout after 5 failed attempts (30 minutes)
- Session tokens generated with crypto.randomBytes (32 bytes)
- Sessions expire after 24 hours
- Login history tracked per user

### Data Encryption

- All data transmitted over HTTPS
- Passwords never stored in plain text
- Service account key secured (not in repository)
- Environment variables for sensitive data

### Feature Flags

```env
VITE_PDPA_ENABLED=true              # Enable PDPA compliance
VITE_CONSENT_REQUIRED=true          # Require consent checks
VITE_AUDIT_LOGGING_ENABLED=true     # Enable audit logging
VITE_ENCRYPTION_ENABLED=true        # Enable data encryption
VITE_SESSION_TIMEOUT=1800000        # 30 minutes
VITE_MFA_ENABLED=false              # Multi-factor authentication
```

---

## 🐛 Troubleshooting

### "GCS connection failed"

**Symptoms:**
- Backend servers show "GCS connection failed"
- Data operations fail

**Solutions:**
1. Check service account file exists: `public/izara-telemedicine-dd0b6abe2bc8.json`
2. Verify GCS API Server is running: `curl http://localhost:3012/api/health`
3. Check GCS bucket permissions in Google Cloud Console
4. Verify service account has Storage Admin role

### "Port already in use"

**Symptoms:**
- Server fails to start with EADDRINUSE error

**Solutions:**
```bash
# Windows
netstat -ano | findstr :3010
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3010 | xargs kill -9
```

### "No data showing in dashboard"

**Symptoms:**
- Dashboard is empty
- No patients in queue

**Solutions:**
1. Generate demo data: `npm run generate:demo`
2. Upload to GCS: `npm run upload:gcs`
3. Check browser console for API errors
4. Verify backend servers are running

### "Authentication fails"

**Symptoms:**
- Login returns 401 error
- Session not persisting

**Solutions:**
1. Check Auth Server is running on port 3011
2. Clear browser localStorage: `localStorage.clear()`
3. Verify user exists in GCS: check `users/index.json`
4. Check password hash is correct

### "WebSocket not connecting"

**Symptoms:**
- No real-time updates
- Queue not updating automatically

**Solutions:**
1. Check servers are running
2. Verify WebSocket URLs in .env
3. Check browser console for WebSocket errors
4. Ensure no firewall blocking WebSocket connections

---

## 📞 Contact & Support

**Project:** Izara Doctor Portal
**Version:** 1.0.0
**Architecture:** Separated Backend (3 servers) + Frontend
**Platform:** React + TypeScript + Node.js + Express
**Styling:** Tailwind CSS
**AI:** Google Gemini API
**Storage:** Google Cloud Storage (5 buckets)
**Real-time:** Socket.IO

**Documentation:**
- Setup Guide: `SETUP.md`
- Requirements: `READ/doctor_app_requirements.md`
- Data Flow: `READ/izara-ultra-comprehensive-dataflow.html`
- Workflows: `READ/izara-all-feature-workflows.html`
- Quick Reference: `READ/QUICK_REFERENCE.md`

---

*Last Updated: November 27, 2025*
*Architecture: Separated Backend/Frontend with GCS Integration*
