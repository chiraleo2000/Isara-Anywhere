# Izara Telemedicine - Data Sync & Flow Documentation

**Version:** 2.0.0  
**Last Updated:** January 19, 2026  
**Status:** 🚧 Migration to PostgreSQL (Phase 1)

---

## 🆕 Phase 1 Database Migration

### Migration Status

| Component | GCS (Old) | PostgreSQL (New) | Status |
|-----------|-----------|------------------|--------|
| User Auth | ✅ | ✅ | Migrated |
| Patient PHR | ✅ | ✅ | Migrated |
| Appointments | ✅ | ✅ | Migrated |
| EMR | ✅ | ✅ | Migrated |
| AI Knowledge Base | - | ✅ | New |
| Chat History | - | ✅ | New |

### PostgreSQL Configuration

```
Host: localhost (local) / CloudSQL (production)
Port: 5432
User: postgres
Password: P@ssw0rd
Databases:
  - izara-users-credentials
  - izara-patients-data
  - izara-doctors-data
  - izara-appointments
  - izara-meta-data
```

---

## 📊 Data Architecture Overview (Phase 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL + pgvector                                │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │
│  │ izara-users-       │  │ izara-patients-    │  │ izara-doctors-     │    │
│  │ credentials        │  │ data               │  │ data               │    │
│  │                    │  │                    │  │                    │    │
│  │ • users            │  │ • phr              │  │ • doctor_profiles  │    │
│  │ • sessions         │  │ • vital_signs      │  │ • consultants      │    │
│  │                    │  │ • living_wills     │  │ • meeting_records  │    │
│  └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘    │
│            │                       │                       │                │
│  ┌─────────┴──────────┐  ┌────────┴───────────┐  ┌────────┴───────────┐   │
│  │ izara-appointments │  │ izara-meta-data    │  │ AI TABLES          │   │
│  │                    │  │                    │  │ (New in Phase 1)   │   │
│  │ • appointments     │  │ • medical_content  │  │ • knowledge_base   │   │
│  │ • emr              │  │ • icd10_codes      │  │ • ai_chat_history  │   │
│  │ • prescriptions    │  │ • drugs            │  │ • ai_doc_analysis  │   │
│  │ • lab_orders       │  │ • clinical_resources│ │ • cds_logs         │   │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   PATIENT PORTAL      │ │    DOCTOR PORTAL      │ │    AI SERVICES        │
│   (Port 3004/3005)    │ │    (Port 3010-3012)   │ │    (Gemini 3 Flash)   │
│                       │ │                       │ │                       │
│ • View PHR            │ │ • Manage patients     │ │ • Pre-summary         │
│ • Book appointments   │ │ • EMR editing         │ │ • CDS alerts          │
│ • Health Studio       │ │ • AI Assistant        │ │ • Doc analysis        │
│ • Video meetings      │ │ • Doc analysis        │ │ • RAG search          │
│ • Patient instructions│ │ • Man-in-the-loop     │ │ • Chat memory         │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 🔄 Data Sync Patterns

### 1. User Authentication Flow

```
Patient Login                          Doctor/Admin Login
     │                                       │
     ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│ Patient     │                        │ Doctor      │
│ Portal      │                        │ Auth Server │
│ Backend     │                        │ (Port 3011) │
│ (Port 3004) │                        └──────┬──────┘
└──────┬──────┘                               │
       │                                      │
       ▼                                      ▼
┌──────────────────────────────────────────────────┐
│         izara-users-credentials (GCS)            │
│                                                  │
│  patients/                                       │
│    └── {patientId}/                             │
│         └── profile.json                        │
│                                                  │
│  doctors/                                        │
│    └── {doctorId}/                              │
│         └── profile.json                        │
└──────────────────────────────────────────────────┘
```

### 2. Appointment Data Flow

```
Patient Books Appointment
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ appointments    │
│ (Patient Portal)│
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│         izara-appointments (GCS)                 │
│                                                  │
│  appointments/                                   │
│    └── {appointmentId}.json                     │
│         {                                        │
│           "id": "APT-xxx",                      │
│           "patientId": "PATIENT-001",           │
│           "doctorId": "DOC-001",                │
│           "status": "pending",                  │
│           "type": "telehealth",                 │
│           "symptoms": {...},                    │
│           "requestedDateTime": "...",           │
│           "meetingLink": null                   │
│         }                                        │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Doctor Portal   │    │ Admin Portal    │
│ Queue Tab       │    │ All Appts Tab   │
│ (Port 3009)     │    │ (Port 3009)     │
└────────┬────────┘    └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼ (Doctor/Admin Confirms)
┌──────────────────────────────────────────────────┐
│  Updated Appointment:                            │
│  {                                               │
│    "status": "confirmed",                       │
│    "confirmedDateTime": "...",                  │
│    "meetingLink": "https://meet.jit.si/...",   │
│    "doctorMeetingUrl": "...",                  │
│    "patientMeetingUrl": "...",                 │
│    "guestMeetingUrl": "..."                    │
│  }                                               │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Patient Portal  │
│ Appointments    │
│ (Shows meeting) │
└─────────────────┘
```

### 3. PHR (Personal Health Records) Sync

```
Patient Updates Health Data
         │
         ▼
┌─────────────────┐
│ POST /api/phr   │
│ (Patient Portal)│
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│         izara-patients-data (GCS)                │
│                                                  │
│  patients/                                       │
│    └── {patientId}/                             │
│         ├── phr/                                │
│         │    ├── vitals.json                    │
│         │    ├── bmi-history.json               │
│         │    └── health-logs.json               │
│         ├── medications.json                    │
│         ├── allergies.json                      │
│         └── conditions.json                     │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Doctor Portal - Patient Record Viewer   │
│ (Reads PHR data for consultation)       │
└─────────────────────────────────────────┘
```

### 4. Medical Content Sync

```
┌──────────────────────────────────────────────────┐
│         izara-meta-data (GCS)                    │
│                                                  │
│  medical-content/                                │
│    └── articles/                                │
│         ├── article-001.json                    │
│         ├── article-002.json                    │
│         └── ...                                 │
│                                                  │
│  clinical-resources/                             │
│    ├── icd10-codes.json                         │
│    ├── drug-database.json                       │
│    └── treatment-guidelines.json                │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Patient Portal  │    │ Doctor Portal   │
│ Health Studio   │    │ Clinical        │
│ Medical Content │    │ Resources       │
└─────────────────┘    └─────────────────┘
```

---

## 🔐 Access Control Matrix

| Resource | Patient | Doctor | Admin |
|----------|---------|--------|-------|
| Own PHR | Read/Write | Read | Read |
| Other Patient PHR | ❌ | Read (assigned) | Read (all) |
| Appointments (own) | Read/Write | Read/Write | Read/Write |
| Appointments (all) | ❌ | Read (queue) | Read/Write |
| Medical Content | Read | Read/Write | Read/Write |
| User Management | ❌ | ❌ | Read/Write |
| Doctor Schedules | Read | Read/Write (own) | Read/Write |

---

## 📡 API Endpoints & Data Sync

### Patient Portal (Port 3004)

| Endpoint | Method | Data Source | Description |
|----------|--------|-------------|-------------|
| `/api/auth/login` | POST | GCS credentials | Patient authentication |
| `/api/phr` | GET/POST | GCS patients-data | Personal health records |
| `/api/appointments` | GET/POST | GCS appointments | Appointment management |
| `/api/doctors` | GET | GCS doctors-data | Available doctors list |
| `/api/content/articles` | GET | GCS meta-data | Medical articles |
| `/api/video-meeting` | POST | Generated | Create meeting link |

### Doctor Portal Main API (Port 3009)

| Endpoint | Method | Data Source | Description |
|----------|--------|-------------|-------------|
| `/api/patients` | GET | GCS patients-data | Patient list |
| `/api/appointments` | GET/PUT | GCS appointments | Appointment management |
| `/api/queue` | GET | GCS appointments | Patient queue |
| `/api/emr` | GET/POST | GCS patients-data | EMR records |
| `/api/prescriptions` | POST | GCS patients-data | Prescriptions |
| `/api/clinical-resources` | GET | GCS meta-data | Clinical content |

### Doctor Portal GCS API (Port 3012)

| Endpoint | Method | Data Source | Description |
|----------|--------|-------------|-------------|
| `/api/gcs/status` | GET | GCS | Bucket connectivity |
| `/api/gcs/read` | GET | GCS | Read from bucket |
| `/api/gcs/write` | POST | GCS | Write to bucket |
| `/api/gcs/list` | GET | GCS | List bucket contents |

---

## 🔍 Data Validation Rules

### Appointment Data
```javascript
{
  id: "APT-{uuid}",                    // Required, unique
  patientId: "PATIENT-{id}",           // Required, exists in users
  doctorId: "DOC-{id}" | null,         // Optional (for pool)
  status: enum["pending", "in_pool", "assigned", "confirmed", "completed", "cancelled", "declined"],
  type: enum["telehealth", "onsite"],
  urgency: enum["normal", "urgent", "emergency"],
  symptoms: {
    main: string,                       // Required
    description: string,
    duration: string,
    severity: number (1-10)
  },
  requestedDateTime: ISO8601,           // Required
  confirmedDateTime: ISO8601 | null,
  meetingLink: URL | null,
  createdAt: ISO8601,
  updatedAt: ISO8601
}
```

### PHR Data
```javascript
{
  patientId: "PATIENT-{id}",
  vitals: {
    bloodPressure: { systolic: number, diastolic: number },
    heartRate: number,
    temperature: number,
    oxygenSaturation: number,
    recordedAt: ISO8601
  },
  bmi: {
    weight: number (kg),
    height: number (cm),
    bmi: number,
    category: enum["underweight", "normal", "overweight", "obese"],
    calculatedAt: ISO8601
  },
  medications: [...],
  allergies: [...],
  conditions: [...]
}
```

---

## ✅ Testing Coverage

### Unit Tests (78 tests)
- Authentication: 11 tests
- PHR & Vitals: 14 tests
- Appointments: 13 tests
- Medical Content: 12 tests
- GCS Sync: 17 tests
- EMR & Prescribing: 11 tests

### Integration Tests (18 tests)
- Server health checks
- GCS connectivity
- API endpoint validation
- Cross-portal data sync

### UI Tests (40 tests)
- Patient workflows: 7 tests
- Doctor workflows: 8 tests
- Admin workflows: 4 tests
- Cross-portal: 1 test
- Cloud deployment: 20 tests

### Run Tests
```bash
# All unit tests
node scripts/tests/unit/runAllUnitTests.cjs

# Complete test suite
node scripts/tests/runCompleteTestSuite.cjs --skip-e2e

# UI tests (local)
node scripts/tests/comprehensiveUITests.cjs

# Cloud deployment tests
node scripts/tests/cloudDeploymentTests.cjs

# UI tests (cloud)
node scripts/tests/comprehensiveUITests.cjs --cloud --headless
```

---

## 🚀 Deployment Checklist

- [ ] All unit tests pass (78/78)
- [ ] All local dev tests pass (18/18)
- [ ] Build Docker images
- [ ] Push to GCR
- [ ] Deploy to Cloud Run
- [ ] Run cloud deployment tests (24/24)
- [ ] Run cloud UI tests (20/20)
- [ ] Verify GCS connectivity
- [ ] Test cross-portal data sync

---

*Documentation generated for Izara Telemedicine Platform v1.1.5*
