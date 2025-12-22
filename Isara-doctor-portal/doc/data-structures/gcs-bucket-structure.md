# 🗄️ GCS Bucket Structure

## Overview

The Izara Doctor Portal uses Google Cloud Storage (GCS) for all data persistence. This document details the bucket organization, file naming conventions, and access patterns.

---

## 📦 Bucket Summary

| Bucket Name | Purpose | Access Level |
|-------------|---------|--------------|
| `izara-users-credentials` | User accounts, authentication, sessions | Auth Server Only |
| `izara-doctors-data` | Doctor profiles, schedules, patient queues | Doctor Portal |
| `izara-patients-data` | Patient records, EMRs, prescriptions, lab orders | Doctor Portal |
| `izara-appointments` | Appointments, meetings, calendar integration | Doctor Portal |
| `izara-meta-data` | Reference data, drug database, audit logs | All Services |

---

## 🔐 izara-users-credentials

**Purpose:** Store all user authentication data, credentials, and session information.

**Access:** Auth Server (port 3011) only - restricted access

### Structure

```
izara-users-credentials/
│
├── users/
│   ├── index.json                    # Quick lookup index
│   ├── DOC-0001-001.json            # Admin user
│   ├── DOC-1234-567.json            # Doctor user
│   └── DOC-{XXXX}-{XXX}.json        # Pattern: DOC-{4digits}-{3digits}
│
├── sessions/
│   └── {session-token}.json          # Active session data
│
└── password-resets/
    └── {reset-token}.json            # Password reset tokens (temporary)
```

### File Patterns

| Path Pattern | Content | Update Frequency |
|-------------|---------|------------------|
| `users/index.json` | Array of UserIndexEntry | On user create/delete |
| `users/{id}.json` | Full UserCredential | On profile/login update |
| `sessions/{token}.json` | Session data | On login/logout |

### Index File Format

```json
// users/index.json
[
  { "id": "DOC-0001-001", "email": "admin@izara.health", "role": "admin", "isActive": true },
  { "id": "DOC-1234-567", "email": "dr.smith@izara.health", "role": "doctor", "isActive": true }
]
```

---

## 👨‍⚕️ izara-doctors-data

**Purpose:** Store doctor profiles, availability, and real-time queue management.

**Access:** Doctor Portal, Admin functions

### Structure

```
izara-doctors-data/
│
├── doctors.json                      # Master doctor list
│
├── avatars/
│   └── {doctorId}.jpg               # Doctor profile photos
│
├── queue/
│   └── {doctorId}.json              # Real-time patient queue
│
├── schedules/
│   └── {doctorId}/
│       ├── availability.json         # Weekly availability
│       └── {YYYY-MM}.json           # Monthly schedule
│
└── settings/
    └── {doctorId}.json              # Doctor-specific settings
```

### File Patterns

| Path Pattern | Content | Update Frequency |
|-------------|---------|------------------|
| `doctors.json` | Array of all doctors | On doctor approval/update |
| `queue/{doctorId}.json` | Array of QueuePatient | Real-time (every interaction) |
| `schedules/{id}/availability.json` | Weekly slots | On schedule update |

### Queue File Format

```json
// queue/DOC-1234-567.json
[
  {
    "id": "Q-001",
    "patientId": "PAT-001",
    "patientName": "John Doe",
    "queuePosition": 1,
    "status": "waiting",
    "priority": "urgent"
  }
]
```

---

## 🏥 izara-patients-data

**Purpose:** Store all patient-related medical data including records, EMRs, prescriptions, and lab orders.

**Access:** Doctor Portal (with PDPA consent), Admin (read-only analytics)

### Structure

```
izara-patients-data/
│
├── patients.json                     # Patient index (summary)
│
├── patients/
│   ├── {patientId}.json             # Full patient record
│   └── {patientId}/
│       └── pdpa/
│           ├── consents.json        # PDPA consent records
│           └── audit.json           # Data access audit
│
├── photos/
│   └── {patientId}.jpg              # Patient photos
│
├── emr/
│   └── {patientId}/
│       ├── index.json               # EMR list for patient
│       └── {emrId}.json             # Individual EMR record
│
├── prescriptions/
│   └── {patientId}/
│       ├── index.json               # Prescription list
│       └── {rxId}.json              # Individual prescription
│
├── lab-orders/
│   └── {patientId}/
│       ├── index.json               # Lab order list
│       └── {orderId}.json           # Individual lab order
│
└── documents/
    └── {patientId}/
        ├── {documentId}.pdf         # Uploaded documents
        └── signatures/
            └── {consentId}.png      # Digital signatures
```

### File Patterns

| Path Pattern | Content | Update Frequency |
|-------------|---------|------------------|
| `patients.json` | Array of patient summaries | On patient create/update |
| `patients/{id}.json` | Full PatientRecord | On demographic update |
| `emr/{patientId}/{emrId}.json` | EMR Record | Per encounter |
| `prescriptions/{patientId}/{rxId}.json` | Prescription | Per prescription |
| `lab-orders/{patientId}/{orderId}.json` | Lab Order | Per order |

### Patient Folder Structure

```
patients/
└── PAT-2024-0001/
    ├── PAT-2024-0001.json           # Main patient file (redundant)
    └── pdpa/
        ├── consents.json            # All consent records
        └── audit.json               # Access log
```

### EMR Folder Structure

```
emr/
└── PAT-2024-0001/
    ├── index.json                   # List of all EMRs
    ├── EMR-2024-0001-001.json       # First EMR
    ├── EMR-2024-0001-002.json       # Second EMR
    └── EMR-2024-0001-003.json       # Third EMR
```

---

## 📅 izara-appointments

**Purpose:** Store appointment scheduling, meeting sessions, and calendar integration data.

**Access:** Doctor Portal, Patient Portal (limited), Admin

### Structure

```
izara-appointments/
│
├── appointments.json                 # Appointment index
│
├── appointments/
│   └── {appointmentId}.json         # Full appointment record
│
├── meetings/
│   └── {meetingId}.json             # Meeting session data
│
├── calendar/
│   └── {doctorId}/
│       └── {YYYY-MM}.json           # Monthly calendar events
│
└── recordings/
    └── {meetingId}/
        ├── audio.mp3                # Audio recording (if consented)
        └── transcript.json          # AI transcription
```

### File Patterns

| Path Pattern | Content | Update Frequency |
|-------------|---------|------------------|
| `appointments.json` | Array of appointment summaries | On appointment change |
| `appointments/{id}.json` | Full Appointment | Per status change |
| `meetings/{id}.json` | MeetingSession | Real-time during call |
| `calendar/{doctorId}/{YYYY-MM}.json` | Monthly events | On schedule change |

### Appointment Naming Convention

```
APT-{YYYY}-{MMDD}-{SEQ}

Examples:
- APT-2024-0615-001  (June 15, 2024, first appointment)
- APT-2024-0615-002  (June 15, 2024, second appointment)
```

---

## 📚 izara-meta-data

**Purpose:** Store reference data, system configuration, and audit logs.

**Access:** All services (read), Admin (write)

### Structure

```
izara-meta-data/
│
├── medications.json                  # Drug database
├── lab-tests.json                    # Lab test codes
├── icd-10-codes.json                # ICD-10 diagnosis codes
├── specialties.json                  # Medical specialties
├── hospitals.json                    # Hospital/clinic directory
│
├── templates/
│   ├── emr-templates.json           # EMR templates
│   ├── prescription-templates.json  # Rx templates
│   └── report-templates.json        # Report templates
│
├── audit/
│   └── {YYYY-MM-DD}.json            # Daily audit logs
│
├── analytics/
│   └── {YYYY-MM}/
│       ├── appointments.json        # Monthly appointment stats
│       ├── consultations.json       # Consultation stats
│       └── revenue.json             # Revenue analytics
│
└── config/
    ├── system.json                  # System configuration
    ├── features.json                # Feature flags
    └── notifications.json           # Notification templates
```

### File Patterns

| Path Pattern | Content | Update Frequency |
|-------------|---------|------------------|
| `medications.json` | Drug database | Monthly/On update |
| `lab-tests.json` | Lab test catalog | On update |
| `icd-10-codes.json` | ICD-10 codes | Yearly |
| `audit/{date}.json` | Daily audit log | Append only |
| `analytics/{month}/*.json` | Statistics | Daily aggregation |

---

## 🔑 Access Control Matrix

| Bucket | Auth Server | GCS API | Main API | Doctor Portal |
|--------|-------------|---------|----------|---------------|
| `izara-users-credentials` | R/W | - | - | - |
| `izara-doctors-data` | R | R/W | R/W | R (via API) |
| `izara-patients-data` | - | R/W | R/W | R (via API) |
| `izara-appointments` | - | R/W | R/W | R (via API) |
| `izara-meta-data` | R | R/W | R/W | R (via API) |

---

## 📝 Naming Conventions

### ID Formats

| Entity | Format | Example |
|--------|--------|---------|
| User/Doctor ID | `DOC-{XXXX}-{XXX}` | `DOC-1234-567` |
| Patient ID | `PAT-{YYYY}-{NNNN}` | `PAT-2024-0001` |
| EMR ID | `EMR-{YYYY}-{NNNN}-{SEQ}` | `EMR-2024-0001-001` |
| Prescription ID | `RX-{YYYY}-{NNNN}-{SEQ}` | `RX-2024-0001-001` |
| Lab Order ID | `LAB-{YYYY}-{NNNN}-{SEQ}` | `LAB-2024-0001-001` |
| Appointment ID | `APT-{YYYY}-{MMDD}-{SEQ}` | `APT-2024-0615-001` |
| Queue ID | `Q-{YYYY}-{SEQ}` | `Q-2024-001` |
| Meeting ID | `MEET-{YYYY}-{MMDD}-{SEQ}` | `MEET-2024-0615-001` |
| Consent ID | `CON-{YYYY}-{SEQ}` | `CON-2024-001` |

### File Naming Rules

1. **JSON files:** lowercase with hyphens (`patient-data.json`)
2. **Date-based files:** ISO format (`2024-06-15.json`)
3. **Month-based files:** YYYY-MM format (`2024-06.json`)
4. **Index files:** Always named `index.json`
5. **Images:** `{entity-id}.{format}` (`PAT-2024-0001.jpg`)

---

## 🔄 Caching Strategy

### Client-Side Caching

```typescript
// gcsDataService.ts caching
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cached paths:
// - Reference data (medications, lab-tests, icd-10-codes)
// - Doctor list
// - Patient index
```

### Cache Invalidation

| Event | Invalidated Cache |
|-------|-------------------|
| Patient update | `patients.json`, `patients/{id}.json` |
| EMR create | `emr/{patientId}/index.json` |
| Queue update | `queue/{doctorId}.json` |
| Appointment change | `appointments.json` |

---

## 🛡️ Security Considerations

### Sensitive Data Locations

| Path | Sensitivity | Encryption |
|------|-------------|------------|
| `users/*.json` | HIGH | Password hashed (SHA256) |
| `sessions/*.json` | HIGH | Token encrypted |
| `patients/**/*` | HIGH | PDPA protected |
| `emr/**/*` | CRITICAL | Medical data |
| `prescriptions/**/*` | CRITICAL | Medical data |

### Access Logging

All access to `izara-patients-data` is logged to:
```
izara-patients-data/patients/{patientId}/pdpa/audit.json
izara-meta-data/audit/{YYYY-MM-DD}.json
```

### Retention Policy

| Data Type | Retention | Location |
|-----------|-----------|----------|
| Sessions | 24 hours | `sessions/` |
| Password resets | 1 hour | `password-resets/` |
| Audit logs | 7 years | `audit/` |
| Medical records | Permanent | `emr/`, `prescriptions/` |
| Appointments | 5 years | `appointments/` |
