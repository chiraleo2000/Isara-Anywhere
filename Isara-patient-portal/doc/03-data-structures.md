# 3. Data Structures

## 3.1 Core Data Types (JSON Schema)

### 3.1.1 User & Authentication

```json
{
  "User": {
    "id": "string - Unique user identifier (user_timestamp_random)",
    "patientId": "string - Associated patient ID",
    "name": "string - Full name",
    "email": "string - Email address",
    "phone": "string? - Phone number",
    "dateOfBirth": "string? - Date of birth (ISO format)",
    "gender": "'male' | 'female' | 'other'",
    "bloodType": "string? - Blood type (A+, B-, etc.)",
    "avatarUrl": "string? - Profile image URL",
    "allergies": "string[]? - List of allergies",
    "chronicConditions": "string[]? - List of chronic conditions",
    "address": "string? - Address",
    "emergencyContact": {
      "name": "string",
      "relationship": "string",
      "phone": "string"
    },
    "createdAt": "Date",
    "updatedAt": "Date"
  }
}
```

```json
{
  "StoredUser": {
    "id": "string",
    "patientId": "string",
    "email": "string",
    "passwordHash": "string - Base64 encoded password",
    "profile": "User",
    "createdAt": "string (ISO)",
    "updatedAt": "string (ISO)"
  }
}
```

```json
{
  "Session": {
    "id": "string - Session ID",
    "userId": "string",
    "token": "string",
    "createdAt": "string (ISO)",
    "expiresAt": "string (ISO)"
  }
}
```

---

### 3.1.2 Appointment

```json
{
  "Appointment": {
    "id": "string - apt_timestamp_random",
    "patientId": "string",
    "patientName": "string",
    "patientEmail": "string",
    "doctorId": "string",
    "doctorName": "string",
    "doctorSpecialty": "string",
    "doctorAvatar": "string?",
    "doctorEmail": "string?",
    "hospitalId": "string?",
    "hospitalName": "string?",
    "date": "Date",
    "appointmentDate": "Date",
    "appointmentTime": "string - HH:mm format",
    "type": "AppointmentType",
    "status": "AppointmentStatus",
    "reason": "string?",
    "notes": "string?",
    "symptoms": "SymptomDetails | string[]",
    "diagnosis": "string?",
    "prescription": "Prescription?",
    "labOrders": "LabOrder[]?",
    "result": "AppointmentResult?",
    "meetingLink": "string? - Google Meet URL",
    "calendarEventId": "string? - Google Calendar event ID",
    "preferredTimeSlots": "string[]?",
    "preferredDates": "string[]?",
    "preferredTimeSlot": "'morning' | 'afternoon' | 'evening'",
    "urgency": "'normal' | 'urgent' | 'emergency'",
    "aiAnalysis": "string?",
    "createdAt": "Date",
    "updatedAt": "Date"
  }
}
```

**Appointment Types:**
| Type | Description |
|------|-------------|
| `telehealth` | Video consultation |
| `in_person` | In-person visit |
| `emergency` | Emergency visit |
| `consultation` | General consultation |
| `follow_up` | Follow-up appointment |

**Appointment Status:**
| Status | Description |
|--------|-------------|
| `pending` | Waiting for confirmation |
| `confirmed` | Confirmed by doctor |
| `in_progress` | Currently ongoing |
| `completed` | Finished |
| `cancelled` | Cancelled |
| `no_show` | Patient did not show up |
| `rescheduled` | Rescheduled to another time |

---

### 3.1.3 Personal Health Record (PHR)

```json
{
  "PersonalHealthRecord": {
    "id": "string",
    "patientId": "string",
    "demographics": "Demographics",
    "vitalSignsHistory": "VitalSigns[]",
    "lifestyle": "LifestyleData",
    "allergies": "string[]?",
    "chronicConditions": "string[]?",
    "currentMedications": "Medication[]?",
    "vaccinations": "Vaccination[]?",
    "documents": "MedicalDocument[]?",
    "wearableData": "WearableData?",
    "updatedAt": "Date"
  }
}
```

```json
{
  "Demographics": {
    "name": "string",
    "dateOfBirth": "string",
    "gender": "'male' | 'female' | 'other'",
    "bloodType": "string?",
    "height": "number? - cm",
    "weight": "number? - kg",
    "ethnicity": "string?",
    "occupation": "string?"
  }
}
```

```json
{
  "VitalSigns": {
    "bloodPressure": {
      "systolic": "number",
      "diastolic": "number",
      "unit": "string - mmHg"
    },
    "heartRate": {
      "value": "number",
      "unit": "string - bpm"
    },
    "temperature": {
      "value": "number",
      "unit": "'celsius' | 'fahrenheit'"
    },
    "respiratoryRate": {
      "value": "number",
      "unit": "string - breaths/min"
    },
    "oxygenSaturation": {
      "value": "number",
      "unit": "string - %"
    },
    "bloodGlucose": {
      "value": "number",
      "unit": "string - mg/dL",
      "testType": "'fasting' | 'random' | 'postprandial'"
    },
    "weight": {
      "value": "number",
      "unit": "string - kg"
    },
    "height": {
      "value": "number",
      "unit": "string - cm"
    },
    "bmi": "number?",
    "measuredAt": "Date?",
    "notes": "string?"
  }
}
```

```json
{
  "LifestyleData": {
    "smokingStatus": "'never' | 'former' | 'current'",
    "alcoholConsumption": "'never' | 'occasional' | 'moderate' | 'heavy'",
    "exerciseFrequency": "'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'",
    "dietType": "'omnivore' | 'vegetarian' | 'vegan' | 'other'",
    "sleepHours": "number?",
    "stressLevel": "'low' | 'moderate' | 'high'",
    "occupation": "string?"
  }
}
```

---

### 3.1.4 Medication & Prescription

```json
{
  "Medication": {
    "id": "string",
    "name": "string",
    "genericName": "string?",
    "dosage": "string",
    "frequency": "string",
    "route": "'oral' | 'injection' | 'topical' | 'inhalation' | 'other'",
    "startDate": "Date",
    "endDate": "Date?",
    "prescribedBy": "string?",
    "purpose": "string?",
    "sideEffects": "string[]?",
    "instructions": "string?",
    "refillsRemaining": "number?",
    "status": "'active' | 'completed' | 'discontinued'"
  }
}
```

```json
{
  "Prescription": {
    "id": "string",
    "appointmentId": "string?",
    "patientId": "string",
    "doctorId": "string",
    "doctorName": "string",
    "date": "Date",
    "medications": "Medication[]",
    "instructions": "string?",
    "status": "'active' | 'completed' | 'cancelled'",
    "refillsAllowed": "number?",
    "validUntil": "Date?"
  }
}
```

---

### 3.1.5 Lab & Imaging Orders

```json
{
  "LabOrder": {
    "id": "string",
    "appointmentId": "string?",
    "patientId": "string",
    "doctorId": "string",
    "orderDate": "Date",
    "testName": "string",
    "testCode": "string?",
    "priority": "'routine' | 'urgent' | 'stat'",
    "instructions": "string?",
    "status": "'ordered' | 'collected' | 'processing' | 'completed' | 'cancelled'",
    "result": "LabResult?"
  }
}
```

```json
{
  "LabResult": {
    "testName": "string",
    "value": "string | number",
    "unit": "string?",
    "normalRange": "string?",
    "status": "'normal' | 'abnormal' | 'critical'",
    "date": "Date",
    "notes": "string?"
  }
}
```

```json
{
  "ImagingOrder": {
    "id": "string",
    "appointmentId": "string?",
    "patientId": "string",
    "doctorId": "string",
    "orderDate": "Date",
    "imagingType": "'x-ray' | 'ct' | 'mri' | 'ultrasound' | 'other'",
    "bodyPart": "string",
    "priority": "'routine' | 'urgent' | 'stat'",
    "instructions": "string?",
    "status": "'ordered' | 'scheduled' | 'completed' | 'cancelled'",
    "scheduledDate": "Date?",
    "result": "ImagingResult?"
  }
}
```

---

### 3.1.6 Living Will

```json
{
  "LivingWill": {
    "id": "string",
    "patientId": "string",
    "healthcareProxy": {
      "primary": "Person",
      "alternate": "Person?"
    },
    "preferences": {
      "cpr": "boolean",
      "mechanicalVentilation": "boolean",
      "artificialNutrition": "boolean",
      "dialysis": "boolean",
      "organDonation": "boolean",
      "painManagement": "string",
      "additionalWishes": "string"
    },
    "religiousPreferences": "string?",
    "digitalSignature": "string",
    "witnessSignatures": "string[]?",
    "createdAt": "Date",
    "updatedAt": "Date",
    "sharedWith": "string[] - Doctor IDs"
  }
}
```

```json
{
  "LivingWillVersion": {
    "id": "string - version_timestamp_random",
    "versionNumber": "number",
    "data": "LivingWill",
    "createdAt": "string (ISO)",
    "reason": "string? - Reason for change"
  }
}
```

---

### 3.1.7 PDPA Consent

```json
{
  "PDPAConsent": {
    "id": "string",
    "patientId": "string",
    "doctorId": "string",
    "doctorName": "string",
    "hospitalId": "string?",
    "hospitalName": "string?",
    "dataTypes": "PDPADataType[]",
    "purpose": "string?",
    "status": "'pending' | 'granted' | 'revoked' | 'expired'",
    "grantedAt": "Date?",
    "expiresAt": "Date?",
    "revokedAt": "Date?",
    "revokeReason": "string?",
    "digitalSignature": "string",
    "ipAddress": "string",
    "userAgent": "string?",
    "auditLog": "AccessLog[]"
  }
}
```

**PDPA Data Types:**
| Type | Description |
|------|-------------|
| `demographics` | Personal information |
| `medical_history` | Medical history |
| `medications` | Current medications |
| `allergies` | Allergy information |
| `lab_results` | Laboratory results |
| `imaging_results` | Imaging/X-ray results |
| `prescriptions` | Prescription history |
| `vital_signs` | Vital signs history |
| `emr_records` | EMR records |
| `phr` | Personal Health Records |
| `living_will` | Living will document |
| `all` | All data types |

---

### 3.1.8 Doctor

```json
{
  "Doctor": {
    "id": "string",
    "name": "string",
    "specialty": "string",
    "subSpecialty": "string?",
    "hospital": "string?",
    "hospitalId": "string?",
    "avatarUrl": "string?",
    "email": "string?",
    "phone": "string?",
    "rating": "number?",
    "reviewCount": "number?",
    "experience": "string?",
    "education": "string[]?",
    "languages": "string[]?",
    "consultationFee": "number?",
    "availability": [
      {
        "day": "string - Day of week",
        "slots": "string[] - Time slots"
      }
    ],
    "createdAt": "Date?",
    "updatedAt": "Date?"
  }
}
```

---

### 3.1.9 AI & Chat

```json
{
  "ChatSession": {
    "id": "string",
    "patientId": "string",
    "title": "string",
    "messages": "ChatMessage[]",
    "context": "string?",
    "aiModel": "string",
    "createdAt": "Date",
    "updatedAt": "Date"
  }
}
```

```json
{
  "ChatMessage": {
    "id": "string",
    "role": "'user' | 'assistant' | 'system'",
    "content": "string",
    "timestamp": "Date",
    "metadata": "Record<string, any>?"
  }
}
```

```json
{
  "SymptomAnalysis": {
    "symptoms": "string[]",
    "additionalInfo": "string?",
    "triage": "'emergency' | 'urgent' | 'routine' | 'self_care'",
    "summary": "string",
    "recommendations": "string[]",
    "suggestedActions": "string[]",
    "warningSign": "boolean",
    "possibleConditions": "string[]?",
    "confidenceScore": "number?"
  }
}
```

---

### 3.1.10 Google Services Types

```json
{
  "CalendarEvent": {
    "id": "string?",
    "summary": "string - Event title",
    "description": "string?",
    "location": "string?",
    "start": {
      "dateTime": "string (ISO)",
      "timeZone": "string"
    },
    "end": {
      "dateTime": "string (ISO)",
      "timeZone": "string"
    },
    "attendees": [
      {
        "email": "string",
        "displayName": "string?"
      }
    ],
    "reminders": {
      "useDefault": "boolean",
      "overrides": [
        {
          "method": "'email' | 'popup'",
          "minutes": "number"
        }
      ]
    },
    "conferenceData": {
      "createRequest": {
        "requestId": "string",
        "conferenceSolutionKey": {
          "type": "'hangoutsMeet'"
        }
      }
    },
    "hangoutLink": "string?",
    "status": "'confirmed' | 'tentative' | 'cancelled'"
  }
}
```

```json
{
  "MapLocation": {
    "id": "string",
    "name": "string",
    "type": "'hospital' | 'clinic' | 'pharmacy' | 'health_center'",
    "address": "string",
    "coords": {
      "lat": "number",
      "lng": "number"
    },
    "phone": "string?",
    "rating": "number?",
    "userRatingsTotal": "number?",
    "openNow": "boolean?",
    "website": "string?"
  }
}
```

---

## 3.2 Data Relationships Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA RELATIONSHIPS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User ─────────────────┬──────────────────────────────────────  │
│    │                   │                                         │
│    │ 1:1               │ 1:N                                     │
│    ▼                   ▼                                         │
│  Patient ──────────┬───────────────────────────────────────────  │
│    │               │                                             │
│    │               │                                             │
│    ▼               ▼                                             │
│  ┌─────┐      ┌──────────┐      ┌──────────┐      ┌─────────┐  │
│  │ PHR │      │Appointment│      │  PDPA    │      │ Living  │  │
│  └─────┘      └──────────┘      │ Consent  │      │  Will   │  │
│    │               │            └──────────┘      └─────────┘  │
│    │               │                 │                  │       │
│    ▼               ▼                 │                  │       │
│  ┌─────────┐  ┌──────────┐          │                  │       │
│  │ Vitals  │  │  Result  │          │                  │       │
│  │ History │  │Prescription│         │                  │       │
│  │Documents│  │ Lab Orders│          │                  │       │
│  └─────────┘  └──────────┘          │                  │       │
│                    │                 │                  │       │
│                    ▼                 │                  │       │
│               ┌──────────┐          │                  │       │
│               │  Doctor  │◀─────────┴──────────────────┘       │
│               └──────────┘                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

[← Previous: Architecture](./02-architecture.md) | [Next: Database Schema (DBML) →](./04-database-schema.dbml)
