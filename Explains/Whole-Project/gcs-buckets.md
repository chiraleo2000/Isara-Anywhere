# Izara Telehealth - GCS Buckets

## Overview

All data is stored in Google Cloud Storage (GCS) buckets as JSON files.

```
┌────────────────────────────────────────────────────────────────┐
│                    Google Cloud Storage (5 Buckets)            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ izara-users │  │ izara-      │  │ izara-      │            │
│  │ -credentials│  │ patients-   │  │ doctors-    │            │
│  │             │  │ data        │  │ data        │            │
│  │ (All User   │  │             │  │             │            │
│  │  Auth)      │  │ (Patient    │  │ (Doctor     │            │
│  │             │  │  Profiles)  │  │  + Meetings)│            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐                             │
│  │ izara-      │  │ izara-      │                             │
│  │ appointments│  │ meta-data   │                             │
│  │             │  │             │                             │
│  │ (Booking    │  │ (Clinical   │                             │
│  │  Records)   │  │  Resources) │                             │
│  └─────────────┘  └─────────────┘                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 1. izara-users-credentials

**Purpose:** All user authentication data (Patients, Doctors, Admins)

### Structure
```
izara-users-credentials/
├── users/
│   ├── index.json              # List of all patients
│   ├── PAT-xxx-xxx.json        # Individual patient credentials
│   └── ...
├── sessions/
│   ├── {token}.json            # Active sessions
│   └── ...
└── login-history/
    ├── PAT-xxx-xxx.json        # Login audit trail
    └── ...
```

### users/index.json
```json
[
  {
    "id": "PAT-1702500000000-abc123",
    "email": "patient@example.com",
    "isActive": true,
    "role": "patient"
  }
]
```

### users/{userId}.json
```json
{
  "id": "PAT-1702500000000-abc123",
  "email": "patient@example.com",
  "passwordHash": "$2b$10$xxx...",
  "name": "John Doe",
  "phone": "0812345678",
  "isActive": true,
  "emailVerified": true,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Doctor Credentials Structure
```
izara-users-credentials/
├── users/                      # Patient credentials  
│   ├── PATIENT-xxx.json        # Individual patient
│   └── ...
├── doctors/                    # Doctor credentials
│   ├── DOC-xxx.json            # Individual doctor
│   └── ...
├── admins/                     # Admin credentials
│   ├── ADMIN-xxx.json          # Individual admin
│   └── ...
├── sessions/                   # Active sessions
│   ├── {token}.json            
│   └── ...
├── login-history/              # Audit trail
│   └── ...
└── pending-approvals.json      # Doctors awaiting approval
```

### doctors/{userId}.json (Doctor)
```json
{
  "id": "DOC-1702500000000-abc123",
  "email": "doctor@hospital.com",
  "passwordHash": "$2b$10$xxx...",
  "role": "doctor",
  "name": "Dr. Jane Smith",
  "medicalLicenseNumber": "MD-123456",
  "specialty": "Internal Medicine",
  "isActive": true,
  "isApproved": true,
  "approvalStatus": "approved"
}
```

### users/{userId}.json (Admin)
```json
{
  "id": "DOC-ADMIN-001",
  "email": "admin@izara.com",
  "role": "admin",
  "isAdmin": true,
  "adminPrivileges": {
    "canManageDoctors": true,
    "canManagePatients": true,
    "canManageAppointments": true,
    "level": "super_admin"
  }
}
```

---

## 2. izara-patients-data

**Purpose:** Patient profiles and health records

### Structure
```
izara-patients-data/
├── patients/
│   ├── index.json              # List of all patients
│   ├── PAT-xxx-xxx/
│   │   ├── profile.json        # Demographics
│   │   └── phr.json            # Health records
│   └── ...
```

### patients/{patientId}/profile.json
```json
{
  "patientId": "PAT-xxx",
  "demographics": {
    "name": "John Doe",
    "nameThai": "จอห์น โด",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "bloodType": "A+",
    "phone": "0812345678",
    "email": "john@example.com",
    "address": "123 Main St, Bangkok"
  }
}
```

### patients/{patientId}/phr.json
```json
{
  "patientId": "PAT-xxx",
  "vitalSigns": {
    "height": 175,
    "weight": 70,
    "bloodPressure": { "systolic": 120, "diastolic": 80 },
    "heartRate": 72,
    "lastUpdated": "2025-12-14T10:00:00Z"
  },
  "allergies": [
    {
      "allergen": "Penicillin",
      "severity": "severe",
      "reaction": "Anaphylaxis"
    }
  ],
  "medications": [
    {
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "twice daily"
    }
  ]
}
```

---

## 3. izara-doctors-data

**Purpose:** Doctor public profiles and meeting recordings

### Structure
```
izara-doctors-data/
├── doctors/
│   ├── index.json              # List of all doctors
│   ├── DOC-xxx-xxx/
│   │   ├── profile.json        # Doctor profile
│   │   └── meetings/           # Meeting recordings (NEW v1.1.8)
│   │       └── APT-xxx/
│   │           ├── recording.webm
│   │           ├── transcript.json
│   │           └── ai-summary.json
│   └── ...
```

### doctors/{doctorId}.json
```json
{
  "id": "DOC-xxx",
  "name": "Dr. Jane Smith",
  "specialty": "Internal Medicine",
  "hospital": "Bangkok General Hospital",
  "phone": "0812345678",
  "email": "dr.jane@hospital.com",
  "photo": "https://storage.googleapis.com/...",
  "qualifications": ["MD", "Board Certified"],
  "experience": 15,
  "rating": 4.8,
  "available": true
}
```

---

## 4. izara-appointments

**Purpose:** Appointment and EMR records

### Structure
```
izara-appointments/
├── appointments/
│   ├── index.json              # All appointments
│   ├── APT-xxx-xxx.json        # Individual appointment
│   └── ...
└── pool/
    └── unassigned.json         # Unassigned appointments
```

### appointments/{appointmentId}.json
```json
{
  "id": "APT-xxx",
  "patientId": "PAT-xxx",
  "doctorId": "DOC-xxx",
  "status": "confirmed",
  "appointmentType": "online",
  "symptoms": "Headache and fever",
  "requestedDate": "2025-12-20",
  "confirmedDate": "2025-12-20",
  "confirmedTime": "10:00",
  "meetLink": "https://meet.google.com/xxx",
  "emr": {
    "subjective": { "chiefComplaint": "..." },
    "objective": { "vitalSigns": {...} },
    "assessment": { "primaryDiagnosis": "..." },
    "plan": { "treatmentPlan": "..." },
    "aiSummary": "..."
  }
}
```

### Appointment Statuses
| Status | Description |
|--------|-------------|
| `pending` | Awaiting doctor confirmation |
| `in_pool` | Unassigned pool |
| `confirmed` | Doctor confirmed |
| `completed` | Consultation done |
| `declined` | Doctor declined |
| `cancelled` | Patient cancelled |

---

## 5. izara-meta-data

**Purpose:** Clinical resources and consultants

### Structure
```
izara-meta-data/
├── clinical-resources/
│   └── resources.json          # All clinical resources
└── consultants/
    └── consultants.json        # All medical consultants
```

### clinical-resources/resources.json
```json
[
  {
    "id": "CR-001",
    "title": "Diabetes Management Guide",
    "category": "Treatment Protocols",
    "resourceType": "guideline",
    "status": "published",
    "content": "## Overview\n...",
    "createdBy": "DOC-xxx",
    "createdAt": "2025-12-01T00:00:00Z"
  }
]
```

### consultants/consultants.json
```json
[
  {
    "id": "CONS-001",
    "name": "Dr. Expert Specialist",
    "specialty": "Cardiology",
    "hospital": "Heart Center",
    "phone": "0812345678",
    "email": "expert@hospital.com",
    "available": true,
    "rating": 4.9
  }
]
```

---

## Access Permissions

| Bucket | Patient | Doctor | Admin |
|--------|---------|--------|-------|
| izara-users-credentials | Own only | Own only | All |
| izara-patients-data | Own only | Assigned | All |
| izara-doctors-data | Read all | Own + Meetings | All |
| izara-appointments | Own only | Assigned | All |
| izara-meta-data | Read | Read/Write | Full |

---
**Last Updated:** January 9, 2026
**Version:** 1.2.1
