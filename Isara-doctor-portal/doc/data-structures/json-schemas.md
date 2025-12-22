# 📦 JSON Schemas & Examples

## Overview

This document provides JSON schema examples for all data entities in the Izara Doctor Portal, showing the actual structure stored in Google Cloud Storage.

---

## 🗄️ Storage Bucket Organization

```
📁 izara-users-credentials/
├── users/
│   ├── index.json          # Array of UserIndexEntry
│   └── {userId}.json       # Full UserCredential
└── sessions/
    └── {token}.json        # Session data

📁 izara-doctors-data/
├── doctors.json            # Array of Doctor
└── queue/
    └── {doctorId}.json     # Array of QueuePatient

📁 izara-patients-data/
├── patients.json           # Array of PatientRecord (index)
├── patients/
│   ├── {patientId}.json    # Full PatientRecord
│   └── {patientId}/
│       └── pdpa/
│           └── consents.json
├── emr/
│   └── {patientId}/
│       └── {emrId}.json    # EMR Record
├── prescriptions/
│   └── {patientId}/
│       └── {rxId}.json     # Prescription
└── lab-orders/
    └── {patientId}/
        └── {orderId}.json  # Lab Order

📁 izara-appointments/
├── appointments.json       # Array of Appointment (index)
├── appointments/
│   └── {id}.json          # Full Appointment
└── meetings/
    └── {id}.json          # Meeting Session

📁 izara-meta-data/
├── medications.json        # Drug database
├── lab-tests.json          # Lab test codes
├── icd-10-codes.json       # ICD-10 codes
└── audit/
    └── {YYYY-MM-DD}.json   # Daily audit logs
```

---

## 👤 User Schemas

### UserCredential (Full)

**Path:** `izara-users-credentials/users/{id}.json`

```json
{
  "id": "DOC-1234-567",
  "email": "dr.somchai@example.com",
  "passwordHash": "a1b2c3d4e5f6789...sha256hash",
  "role": "doctor",
  "doctorId": "DOC-1234-567",
  "medicalLicenseNumber": "MD-123456",
  "isAdmin": false,
  "isActive": true,
  "emailVerified": true,
  "approvalStatus": "approved",
  "isApproved": true,
  "createdAt": "2024-01-15T08:00:00.000Z",
  "lastLogin": "2024-06-20T14:30:00.000Z",
  "loginAttempts": 0,
  "lockedUntil": null,
  "name": "Dr. Somchai Prasert",
  "phone": "+66-81-234-5678",
  "dateOfBirth": "1980-05-15",
  "avatarUrl": "https://storage.googleapis.com/izara-doctors-data/avatars/DOC-1234-567.jpg",
  "specialty": "Internal Medicine",
  "preferences": {
    "theme": "light",
    "language": "th",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    }
  }
}
```

### Admin User with Privileges

```json
{
  "id": "DOC-0001-001",
  "email": "admin@izara.health",
  "passwordHash": "xyz789...sha256hash",
  "role": "admin",
  "doctorId": "DOC-0001-001",
  "medicalLicenseNumber": "MD-000001",
  "isAdmin": true,
  "isActive": true,
  "emailVerified": true,
  "approvalStatus": "approved",
  "isApproved": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLogin": "2024-06-20T16:00:00.000Z",
  "loginAttempts": 0,
  "lockedUntil": null,
  "name": "System Administrator",
  "phone": "+66-2-123-4567",
  "specialty": "System Administration",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "sms": true
    }
  },
  "adminPrivileges": {
    "canManageDoctors": true,
    "canManagePatients": true,
    "canManageAppointments": true,
    "canViewAnalytics": true,
    "canManageSettings": true,
    "canAssignRoles": true,
    "level": "super_admin"
  }
}
```

### User Index

**Path:** `izara-users-credentials/users/index.json`

```json
[
  {
    "id": "DOC-0001-001",
    "email": "admin@izara.health",
    "role": "admin",
    "isActive": true,
    "approvalStatus": "approved"
  },
  {
    "id": "DOC-1234-567",
    "email": "dr.somchai@example.com",
    "role": "doctor",
    "isActive": true,
    "approvalStatus": "approved"
  },
  {
    "id": "DOC-5678-901",
    "email": "dr.pending@example.com",
    "role": "doctor",
    "isActive": false,
    "approvalStatus": "pending"
  }
]
```

### Session

**Path:** `izara-users-credentials/sessions/{token}.json`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "DOC-1234-567",
  "createdAt": "2024-06-20T14:30:00.000Z",
  "expiresAt": "2024-06-21T14:30:00.000Z",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "ipAddress": "192.168.1.100",
  "isValid": true
}
```

---

## 👨‍⚕️ Doctor Schema

**Path:** `izara-doctors-data/doctors.json`

```json
[
  {
    "id": "DOC-1234-567",
    "name": "Dr. Somchai Prasert",
    "specialty": "Internal Medicine",
    "email": "dr.somchai@example.com",
    "avatarUrl": "https://storage.googleapis.com/izara-doctors-data/avatars/DOC-1234-567.jpg",
    "rating": 4.8,
    "experience": "15 years",
    "qualifications": [
      "MD - Chulalongkorn University",
      "Board Certified - Internal Medicine",
      "Fellowship - Cardiology"
    ],
    "availableSlots": [
      "Monday 09:00-12:00",
      "Monday 13:00-17:00",
      "Wednesday 09:00-12:00",
      "Friday 13:00-17:00"
    ],
    "isApproved": true,
    "medicalLicenseNumber": "MD-123456"
  }
]
```

---

## 🏥 Patient Schema

### Full Patient Record

**Path:** `izara-patients-data/patients/{id}.json`

```json
{
  "id": "PAT-2024-0001",
  "demographics": {
    "name": "Somsak Wongchai",
    "dateOfBirth": "1985-03-20",
    "age": 39,
    "gender": "male",
    "photo": "https://storage.googleapis.com/izara-patients-data/photos/PAT-2024-0001.jpg",
    "idNumber": "1-1234-56789-01-2"
  },
  "contact": {
    "phone": "+66-89-123-4567",
    "email": "somsak.w@email.com",
    "address": "123/45 Sukhumvit Road, Klongtoey, Bangkok 10110",
    "emergencyContact": {
      "name": "Somying Wongchai",
      "relationship": "Spouse",
      "phone": "+66-89-987-6543",
      "email": "somying.w@email.com"
    }
  },
  "medicalInfo": {
    "bloodType": "O+",
    "allergies": [
      "Penicillin",
      "Shellfish"
    ],
    "chronicConditions": [
      "Type 2 Diabetes",
      "Hypertension"
    ],
    "currentMedications": [
      "Metformin 500mg twice daily",
      "Amlodipine 5mg once daily"
    ]
  },
  "lastVisit": "2024-06-15T10:30:00.000Z",
  "nextAppointment": "2024-07-15T10:00:00.000Z",
  "consentStatus": {
    "hasConsent": true,
    "dataTypesAllowed": [
      "medical_records",
      "prescriptions",
      "lab_results",
      "telemedicine_recording"
    ],
    "expiresAt": "2025-06-15T10:30:00.000Z"
  },
  "riskLevel": "medium",
  "isActive": true
}
```

### Patient Index

**Path:** `izara-patients-data/patients.json`

```json
[
  {
    "id": "PAT-2024-0001",
    "name": "Somsak Wongchai",
    "dateOfBirth": "1985-03-20",
    "gender": "male",
    "phone": "+66-89-123-4567",
    "riskLevel": "medium",
    "isActive": true
  },
  {
    "id": "PAT-2024-0002",
    "name": "Malee Sriporn",
    "dateOfBirth": "1992-08-10",
    "gender": "female",
    "phone": "+66-81-555-1234",
    "riskLevel": "low",
    "isActive": true
  }
]
```

---

## 📝 EMR Schema

**Path:** `izara-patients-data/emr/{patientId}/{emrId}.json`

```json
{
  "id": "EMR-2024-0001-001",
  "patientId": "PAT-2024-0001",
  "doctorId": "DOC-1234-567",
  "doctorName": "Dr. Somchai Prasert",
  "encounterDate": "2024-06-15T10:30:00.000Z",
  "encounterType": "consultation",
  "chiefComplaint": "Chest pain and shortness of breath for 2 days",
  "historyOfPresentIllness": "Patient reports intermittent chest pain, worse with exertion, mild shortness of breath. No radiation to arm or jaw. No diaphoresis. Patient has history of hypertension and diabetes.",
  "reviewOfSystems": {
    "constitutional": "No fever, no weight loss",
    "cardiovascular": "Chest pain as described, no palpitations, no leg swelling",
    "respiratory": "Mild dyspnea on exertion, no cough, no wheezing",
    "gastrointestinal": "No nausea, no vomiting, normal appetite",
    "neurological": "No headache, no dizziness, no syncope"
  },
  "physicalExamination": {
    "generalAppearance": "Alert, oriented, mild distress",
    "cardiovascular": "Regular rhythm, no murmurs, no JVD",
    "respiratory": "Clear to auscultation bilaterally",
    "abdomen": "Soft, non-tender, no organomegaly"
  },
  "vitalSigns": {
    "bloodPressure": {
      "systolic": 145,
      "diastolic": 92,
      "unit": "mmHg"
    },
    "heartRate": {
      "value": 88,
      "unit": "bpm"
    },
    "temperature": {
      "value": 36.8,
      "unit": "celsius"
    },
    "respiratoryRate": {
      "value": 18,
      "unit": "breaths/min"
    },
    "oxygenSaturation": {
      "value": 97,
      "unit": "%"
    },
    "weight": {
      "value": 78,
      "unit": "kg"
    },
    "height": {
      "value": 172,
      "unit": "cm"
    },
    "bmi": 26.4,
    "measuredAt": "2024-06-15T10:35:00.000Z"
  },
  "assessment": "Atypical chest pain, likely musculoskeletal origin. Hypertension not well controlled. Diabetes stable.",
  "diagnosis": [
    {
      "code": "R07.9",
      "description": "Chest pain, unspecified",
      "type": "primary",
      "status": "active"
    },
    {
      "code": "I10",
      "description": "Essential (primary) hypertension",
      "type": "secondary",
      "status": "chronic"
    },
    {
      "code": "E11.9",
      "description": "Type 2 diabetes mellitus without complications",
      "type": "secondary",
      "status": "chronic"
    }
  ],
  "treatmentPlan": "1. ECG to rule out cardiac cause\n2. Adjust antihypertensive medication\n3. Continue current diabetes regimen\n4. Follow up in 2 weeks",
  "prescriptions": [
    {
      "id": "RX-2024-0001",
      "medication": "Amlodipine",
      "dosage": "10mg",
      "frequency": "Once daily in the morning",
      "duration": "30 days",
      "instructions": "Take with or without food. May cause ankle swelling.",
      "refillsAllowed": 2
    }
  ],
  "investigations": [
    {
      "type": "ECG",
      "indication": "Rule out cardiac cause of chest pain",
      "priority": "routine",
      "status": "ordered"
    }
  ],
  "followUpInstructions": "Return immediately if chest pain worsens, spreads to arm/jaw, or accompanied by sweating/nausea. Follow up in 2 weeks for BP check.",
  "followUpDate": "2024-06-29T10:00:00.000Z",
  "createdAt": "2024-06-15T11:00:00.000Z",
  "lastModified": "2024-06-15T11:30:00.000Z",
  "status": "finalized",
  "digitalSignature": "DR-SOMCHAI-2024-06-15-EMR001",
  "version": 1
}
```

---

## 💊 Prescription Schema

**Path:** `izara-patients-data/prescriptions/{patientId}/{rxId}.json`

```json
{
  "id": "RX-2024-0001-001",
  "patientId": "PAT-2024-0001",
  "doctorId": "DOC-1234-567",
  "encounterDate": "2024-06-15T10:30:00.000Z",
  "medications": [
    {
      "drugName": "Amlodipine Besylate",
      "genericName": "Amlodipine",
      "brandName": "Norvasc",
      "dosage": "1 tablet",
      "strength": "10mg",
      "route": "oral",
      "frequency": "Once daily in the morning",
      "duration": "30 days",
      "quantity": 30,
      "refills": 2,
      "instructions": "Take with or without food. May cause ankle swelling or dizziness.",
      "interactions": [
        {
          "drug": "Simvastatin",
          "severity": "moderate",
          "description": "May increase simvastatin levels. Monitor for muscle pain."
        }
      ]
    },
    {
      "drugName": "Metformin Hydrochloride",
      "genericName": "Metformin",
      "brandName": "Glucophage",
      "dosage": "1 tablet",
      "strength": "500mg",
      "route": "oral",
      "frequency": "Twice daily with meals",
      "duration": "30 days",
      "quantity": 60,
      "refills": 2,
      "instructions": "Take with food to reduce GI upset. Stay hydrated.",
      "interactions": []
    }
  ],
  "pharmacyId": "PHARM-001",
  "status": "sent",
  "digitalSignature": "DR-SOMCHAI-RX-2024-06-15",
  "createdAt": "2024-06-15T11:00:00.000Z",
  "validUntil": "2024-09-15T11:00:00.000Z"
}
```

---

## 🧪 Lab Order Schema

**Path:** `izara-patients-data/lab-orders/{patientId}/{orderId}.json`

```json
{
  "id": "LAB-2024-0001-001",
  "patientId": "PAT-2024-0001",
  "doctorId": "DOC-1234-567",
  "orderDate": "2024-06-15T11:00:00.000Z",
  "tests": [
    {
      "id": "TEST-001",
      "testCode": "CBC",
      "testName": "Complete Blood Count",
      "category": "Hematology",
      "specimenType": "Blood",
      "instructions": "Fasting not required"
    },
    {
      "id": "TEST-002",
      "testCode": "CMP",
      "testName": "Comprehensive Metabolic Panel",
      "category": "Chemistry",
      "specimenType": "Blood",
      "instructions": "Fasting 8-12 hours required"
    },
    {
      "id": "TEST-003",
      "testCode": "HBA1C",
      "testName": "Hemoglobin A1c",
      "category": "Diabetes",
      "specimenType": "Blood",
      "instructions": "Fasting not required"
    }
  ],
  "clinicalIndication": "Routine monitoring for diabetes and hypertension. Follow-up after medication adjustment.",
  "urgency": "routine",
  "status": "completed",
  "results": [
    {
      "testName": "Hemoglobin",
      "value": "14.2",
      "unit": "g/dL",
      "referenceRange": "12.0-17.5",
      "status": "normal"
    },
    {
      "testName": "Fasting Glucose",
      "value": "142",
      "unit": "mg/dL",
      "referenceRange": "70-100",
      "status": "abnormal",
      "notes": "Elevated - consistent with diabetes"
    },
    {
      "testName": "HbA1c",
      "value": "7.2",
      "unit": "%",
      "referenceRange": "<5.7",
      "status": "abnormal",
      "notes": "Above target. Goal <7% for diabetic patients."
    },
    {
      "testName": "Creatinine",
      "value": "1.0",
      "unit": "mg/dL",
      "referenceRange": "0.7-1.3",
      "status": "normal"
    }
  ],
  "completedAt": "2024-06-16T14:00:00.000Z"
}
```

---

## 📅 Appointment Schema

**Path:** `izara-appointments/appointments/{id}.json`

```json
{
  "id": "APT-2024-0615-001",
  "userId": "USR-PAT-001",
  "patientId": "PAT-2024-0001",
  "user": {
    "id": "USR-PAT-001",
    "name": "Somsak Wongchai",
    "email": "somsak.w@email.com"
  },
  "date": "2024-06-15T10:00:00.000Z",
  "type": "Telehealth",
  "status": "Completed",
  "doctor": {
    "id": "DOC-1234-567",
    "name": "Dr. Somchai Prasert",
    "specialty": "Internal Medicine"
  },
  "doctorId": "DOC-1234-567",
  "symptoms": [
    "Chest pain",
    "Shortness of breath"
  ],
  "notes": "Patient requested telehealth appointment for chest discomfort",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "calendarEventId": "google-cal-event-12345",
  "diagnosis": "Atypical chest pain, hypertension not controlled",
  "treatmentPlan": [
    "ECG ordered",
    "Medication adjustment",
    "Follow up in 2 weeks"
  ],
  "summary": "Telehealth consultation for chest pain. Likely musculoskeletal. BP elevated, medication adjusted.",
  "result": {
    "id": "RES-2024-0615-001",
    "appointmentId": "APT-2024-0615-001",
    "diagnosis": "Atypical chest pain (R07.9), Hypertension (I10)",
    "differentialDiagnosis": [
      "Costochondritis",
      "GERD",
      "Anxiety"
    ],
    "prescriptions": [
      {
        "id": "RX-001",
        "medication": "Amlodipine",
        "dosage": "10mg daily",
        "duration": "30 days"
      }
    ],
    "labOrders": [
      {
        "id": "LAB-001",
        "testName": "ECG",
        "status": "ordered"
      }
    ],
    "followUpDate": "2024-06-29",
    "aiSummary": "Patient presented with atypical chest pain, likely musculoskeletal. BP elevated at 145/92. Amlodipine increased to 10mg. ECG ordered. Follow up in 2 weeks.",
    "createdAt": "2024-06-15T11:30:00.000Z",
    "vitalSigns": {
      "bloodPressure": { "systolic": 145, "diastolic": 92 },
      "heartRate": { "value": 88 }
    },
    "payment": {
      "id": "PAY-2024-0615-001",
      "totalAmount": 800,
      "paidAmount": 800,
      "currency": "THB",
      "status": "completed",
      "paymentMethod": "credit_card"
    }
  },
  "createdAt": "2024-06-14T15:00:00.000Z",
  "updatedAt": "2024-06-15T11:30:00.000Z",
  "confirmedAt": "2024-06-14T16:00:00.000Z",
  "paymentStatus": "paid"
}
```

---

## 📊 Queue Schema

**Path:** `izara-doctors-data/queue/{doctorId}.json`

```json
[
  {
    "id": "Q-2024-001",
    "patientId": "PAT-2024-0001",
    "patientName": "Somsak Wongchai",
    "appointmentId": "APT-2024-0615-001",
    "appointmentTime": "2024-06-15T10:00:00.000Z",
    "checkInTime": "2024-06-15T09:45:00.000Z",
    "reasonForVisit": "Chest pain, follow up",
    "reason": "Chest pain",
    "priority": "urgent",
    "status": "waiting",
    "estimatedWaitTime": 15,
    "queuePosition": 1,
    "queueNumber": 101,
    "doctorId": "DOC-1234-567",
    "addedAt": "2024-06-15T09:45:00.000Z"
  },
  {
    "id": "Q-2024-002",
    "patientId": "PAT-2024-0002",
    "patientName": "Malee Sriporn",
    "appointmentId": "APT-2024-0615-002",
    "appointmentTime": "2024-06-15T10:30:00.000Z",
    "checkInTime": "2024-06-15T10:15:00.000Z",
    "reasonForVisit": "Annual checkup",
    "reason": "Routine",
    "priority": "routine",
    "status": "waiting",
    "estimatedWaitTime": 30,
    "queuePosition": 2,
    "queueNumber": 102,
    "doctorId": "DOC-1234-567",
    "addedAt": "2024-06-15T10:15:00.000Z"
  }
]
```

---

## 🎥 Meeting Session Schema

**Path:** `izara-appointments/meetings/{id}.json`

```json
{
  "id": "MEET-2024-0615-001",
  "appointmentId": "APT-2024-0615-001",
  "startTime": "2024-06-15T10:02:00.000Z",
  "endTime": "2024-06-15T10:28:00.000Z",
  "participants": [
    {
      "userId": "DOC-1234-567",
      "role": "doctor",
      "joinedAt": "2024-06-15T10:00:00.000Z",
      "leftAt": "2024-06-15T10:28:00.000Z",
      "videoEnabled": true,
      "audioEnabled": true
    },
    {
      "userId": "PAT-2024-0001",
      "role": "patient",
      "joinedAt": "2024-06-15T10:02:00.000Z",
      "leftAt": "2024-06-15T10:28:00.000Z",
      "videoEnabled": true,
      "audioEnabled": true
    }
  ],
  "recordingUrl": null,
  "duration": 26,
  "notes": "Successful telehealth consultation",
  "status": "completed",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "calendarEventId": "google-cal-event-12345",
  "patientJoinedAt": "2024-06-15T10:02:00.000Z",
  "doctorJoinedAt": "2024-06-15T10:00:00.000Z",
  "consentRecorded": true,
  "aiSummary": {
    "id": "AISUM-001",
    "meetingId": "MEET-2024-0615-001",
    "chiefComplaint": "Chest pain and shortness of breath for 2 days",
    "symptoms": [
      "Intermittent chest pain",
      "Worse with exertion",
      "Mild shortness of breath"
    ],
    "diagnosis": "Atypical chest pain, likely musculoskeletal",
    "treatmentPlan": [
      "ECG to rule out cardiac cause",
      "Increase Amlodipine to 10mg",
      "Continue diabetes medications",
      "Follow up in 2 weeks"
    ],
    "prescriptions": [
      {
        "medication": "Amlodipine",
        "dosage": "10mg",
        "frequency": "Once daily"
      }
    ],
    "labOrders": ["ECG"],
    "followUpRecommended": true,
    "followUpDate": "2024-06-29",
    "redFlags": [],
    "patientEducation": [
      "Watch for warning signs: chest pain spreading to arm/jaw, sweating, nausea",
      "Take medication as prescribed",
      "Monitor blood pressure at home"
    ],
    "generatedAt": "2024-06-15T10:30:00.000Z",
    "confidence": 0.92
  }
}
```

---

## 🔐 Consent Record Schema

**Path:** `izara-patients-data/patients/{patientId}/pdpa/consents.json`

```json
[
  {
    "id": "CON-2024-001",
    "patientId": "PAT-2024-0001",
    "doctorId": "DOC-1234-567",
    "consentType": "phr-access",
    "granted": true,
    "grantedAt": "2024-06-15T10:00:00.000Z",
    "expiresAt": "2025-06-15T10:00:00.000Z",
    "scope": [
      "view_medical_records",
      "view_prescriptions",
      "view_lab_results",
      "create_emr"
    ],
    "signatureUrl": "https://storage.googleapis.com/izara-patients-data/signatures/PAT-2024-0001/consent-001.png",
    "witnessName": "Nurse Pranee"
  },
  {
    "id": "CON-2024-002",
    "patientId": "PAT-2024-0001",
    "doctorId": "DOC-1234-567",
    "consentType": "recording",
    "granted": true,
    "grantedAt": "2024-06-15T10:01:00.000Z",
    "expiresAt": "2024-06-15T11:00:00.000Z",
    "scope": [
      "audio_recording",
      "video_recording",
      "transcription"
    ],
    "signatureUrl": null,
    "witnessName": null
  }
]
```

---

## 📚 Reference Data Schemas

### Medications Reference

**Path:** `izara-meta-data/medications.json`

```json
[
  {
    "id": "MED-001",
    "name": "Amlodipine Besylate",
    "genericName": "Amlodipine",
    "brandNames": ["Norvasc", "Amlor"],
    "category": "Calcium Channel Blocker",
    "dosageForms": ["Tablet", "Capsule"],
    "strengths": ["2.5mg", "5mg", "10mg"],
    "contraindications": "Hypersensitivity to dihydropyridines, severe aortic stenosis",
    "sideEffects": "Peripheral edema, dizziness, flushing, fatigue",
    "interactions": "Simvastatin (moderate), CYP3A4 inhibitors"
  }
]
```

### Lab Tests Reference

**Path:** `izara-meta-data/lab-tests.json`

```json
[
  {
    "id": "LT-001",
    "code": "CBC",
    "name": "Complete Blood Count",
    "category": "Hematology",
    "specimenType": "Whole Blood (EDTA)",
    "referenceRanges": {
      "hemoglobin": {
        "male": "13.5-17.5 g/dL",
        "female": "12.0-16.0 g/dL"
      },
      "wbc": "4,500-11,000 /µL",
      "platelets": "150,000-400,000 /µL"
    },
    "description": "Measures red blood cells, white blood cells, and platelets"
  }
]
```

### ICD-10 Codes Reference

**Path:** `izara-meta-data/icd-10-codes.json`

```json
[
  {
    "code": "I10",
    "description": "Essential (primary) hypertension",
    "category": "Diseases of the circulatory system",
    "chapter": "IX"
  },
  {
    "code": "E11.9",
    "description": "Type 2 diabetes mellitus without complications",
    "category": "Endocrine, nutritional and metabolic diseases",
    "chapter": "IV"
  },
  {
    "code": "R07.9",
    "description": "Chest pain, unspecified",
    "category": "Symptoms, signs and abnormal findings",
    "chapter": "XVIII"
  }
]
```
