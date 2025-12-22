# IZARA TELEMEDICINE PLATFORM - OVERALL STRUCTURE & DOCUMENTATION

> **Version:** 2.0.0
> **Last Updated:** November 25, 2025
> **Platform:** React + TypeScript + Google Cloud Platform

---

## TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [GCS Bucket Structure](#3-gcs-bucket-structure)
4. [Data Models](#4-data-models)
5. [Feature Process Flows](#5-feature-process-flows)
6. [Patient Portal Workflows](#6-patient-portal-workflows)
7. [Doctor Portal Workflows](#7-doctor-portal-workflows)
8. [Data Synchronization](#8-data-synchronization)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [AI Integration](#10-ai-integration)
11. [Security & Compliance](#11-security--compliance)
12. [Demo Accounts](#12-demo-accounts)

---

## 1. PLATFORM OVERVIEW

### 1.1 What is Izara Telemedicine?

Izara is a comprehensive **cloud-native telemedicine platform** consisting of two interconnected portals:

| Portal | Purpose | Users |
|--------|---------|-------|
| **Patient Portal** | Health records management, appointment booking, AI health assistant | Patients |
| **Doctor Portal** | Clinical workflows, EMR management, e-prescribing, video consultations | Healthcare providers |

### 1.2 Key Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IZARA TELEMEDICINE PLATFORM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PATIENT PORTAL                    │    DOCTOR PORTAL                       │
│  ─────────────────                 │    ──────────────                      │
│  • Personal Health Records (PHR)   │    • Electronic Medical Records (EMR)  │
│  • Appointment Booking             │    • Patient Queue Management          │
│  • AI Health Assistant             │    • E-Prescribing                     │
│  • Symptom Checker                 │    • Lab & Imaging Orders              │
│  • Living Will Management          │    • Video Consultations               │
│  • PDPA Consent Management         │    • AI Clinical Assistant             │
│  • Medical Timeline                │    • Clinical Resources                │
│  • Healthcare Provider Finder      │    • Health Studio Dashboard           │
│  • Document Management             │    • Treatment Planning                │
│                                    │                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend Storage | Google Cloud Storage (Serverless) |
| Authentication | Google OAuth 2.0, Custom Email/Password |
| AI | Google Gemini AI (gemini-2.5-flash-lite) |
| Video | Google Meet Integration |
| Calendar | Google Calendar API |
| Maps | Google Maps & Places API |

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                       │
│    ┌─────────────────────┐              ┌─────────────────────┐              │
│    │   Patient Portal    │              │    Doctor Portal    │              │
│    │   (React + Vite)    │              │   (React + Vite)    │              │
│    │   Port: 3000        │              │   Port: 3010        │              │
│    └──────────┬──────────┘              └──────────┬──────────┘              │
└───────────────┼─────────────────────────────────────┼─────────────────────────┘
                │                                     │
                ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Service │  │ GCS Service  │  │  AI Service  │  │Calendar Svc  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PHR Service  │  │ EMR Service  │  │ PDPA Service │  │ Maps Service │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD STORAGE                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         5 GCS BUCKETS                                    │ │
│  │                                                                          │ │
│  │  izara-users-credentials  ←→ Authentication data (both portals)         │ │
│  │  izara-doctors-data      ←→ Doctor-specific data (EMRs, prescriptions)  │ │
│  │  izara-patients-data     ←→ Patient-specific data (PHR, living will)    │ │
│  │  izara-appointments      ←→ Shared appointment data (both portals)      │ │
│  │  izara-meta-data         ←→ Reference data (medications, ICD-10, etc.)  │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL GOOGLE APIS                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Gemini AI    │  │Google Calendar│  │ Google Meet  │  │ Google Maps  │     │
│  │    API       │  │    API        │  │              │  │ Places API   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Architecture

```
PATIENT PORTAL                              DOCTOR PORTAL
     │                                           │
     ├──► Create Appointment ───────────────────►├──► View in Queue
     │                                           │
     ├──► Update PHR ──────► Shared via ────────►├──► View Patient Record
     │                      PDPA Consent         │
     │                                           │
     ├◄── View Prescription ◄───────────────────├◄── Create Prescription
     │                                           │
     ├◄── View Lab Results ◄────────────────────├◄── Order Lab Tests
     │                                           │
     ├◄── Receive Diagnosis ◄───────────────────├◄── Finalize EMR
     │                                           │
     └──► AI Health Chat                         └──► AI Clinical Assistant
```

---

## 3. GCS BUCKET STRUCTURE

### 3.1 Bucket Overview

| Bucket Name | Environment Variable | Purpose | Access |
|-------------|---------------------|---------|--------|
| `izara-users-credentials` | `VITE_GCS_BUCKET_AUTH` | User authentication | Private |
| `izara-doctors-data` | `VITE_GCS_BUCKET_DOCTOR` | Doctor portal data | Private |
| `izara-patients-data` | `VITE_GCS_BUCKET_PATIENT` | Patient portal data | Private |
| `izara-appointments` | `VITE_GCS_BUCKET_APPOINTMENTS` | Shared appointments | Private |
| `izara-meta-data` | `VITE_GCS_BUCKET_METADATA` | Reference/temp data | Public (read) |

### 3.2 Detailed Bucket Structure

```
izara-users-credentials/
├── patients/
│   └── {patientId}.json           # Patient credentials & preferences
└── doctors/
    └── {doctorId}.json            # Doctor credentials & preferences

izara-doctors-data/
├── profile/
│   └── {doctorId}.json            # Doctor profile & statistics
├── patients/
│   └── patients.json              # Patient records (from doctor view)
├── emrs/
│   └── emrs.json                  # Electronic Medical Records
├── prescriptions/
│   └── prescriptions.json         # E-prescriptions
├── lab-orders/
│   └── lab-orders.json            # Laboratory orders & results
├── imaging-orders/
│   └── imaging-orders.json        # Radiology orders & reports
└── queue/
    └── queue.json                 # Patient queue

izara-patients-data/
└── users/
    └── {patientId}/
        ├── phr.json               # Personal Health Record
        ├── living-will.json       # Living will document
        ├── pdpa-consents.json     # PDPA consent records
        ├── chat-sessions.json     # AI chat history
        ├── timeline.json          # Medical timeline events
        └── documents/             # Medical documents (uploaded)
            └── {timestamp}_{filename}

izara-appointments/
├── appointments/
│   └── appointments.json          # All appointments
└── results/
    └── results.json               # Appointment results/summaries

izara-meta-data/
├── doctors.json                   # Doctor directory (public list)
├── specialties.json               # Medical specialties
├── medications.json               # Drug database
├── lab-tests.json                 # Lab test catalog
├── icd10-codes.json               # ICD-10 diagnosis codes
├── hospitals-facilities.json      # Healthcare facilities
├── health-tips.json               # Health tips content
└── health-education-articles.json # สุขศึกษา (Health education)
```

### 3.3 Data Ownership & Access

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA OWNERSHIP & ACCESS MATRIX                        │
├─────────────────────┬──────────────────┬──────────────────┬─────────────┤
│ Data Type           │ Created By       │ Patient Access   │Doctor Access│
├─────────────────────┼──────────────────┼──────────────────┼─────────────┤
│ PHR (Patient Health)│ Patient          │ Full             │ Via PDPA    │
│ Living Will         │ Patient          │ Full             │ Via sharing │
│ PDPA Consents       │ Patient          │ Full             │ Read only   │
│ AI Chat (Patient)   │ Patient          │ Full             │ None        │
│ EMR                 │ Doctor           │ Read (via PDPA)  │ Full        │
│ Prescriptions       │ Doctor           │ Read             │ Full        │
│ Lab Orders/Results  │ Doctor           │ Read             │ Full        │
│ Imaging Orders      │ Doctor           │ Read             │ Full        │
│ Appointments        │ Both             │ Own appointments │ Assigned    │
│ Queue               │ System           │ Own position     │ Full        │
│ Reference Data      │ Admin            │ Read             │ Read        │
└─────────────────────┴──────────────────┴──────────────────┴─────────────┘
```

---

## 4. DATA MODELS

### 4.1 Core Entities

#### User (Patient)
```typescript
interface User {
  id: string;                    // PAT-XXXXX
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodType?: string;
  avatarUrl?: string;
  allergies?: string[];
  chronicConditions?: string[];
  address?: string;
  emergencyContact?: EmergencyContact;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Doctor
```typescript
interface Doctor {
  id: string;                    // DOC-XXXXX
  name: string;
  email: string;
  medicalLicenseNumber: string;
  specialty: string;
  phone?: string;
  avatarUrl?: string;
  hospital?: string;
  department?: string;
  qualifications?: string[];
  experience?: string;
  languages?: string[];
  consultationFee?: number;
  availableHours?: AvailabilitySchedule;
  statistics?: DoctorStatistics;
  createdAt: Date;
}
```

#### Appointment
```typescript
interface Appointment {
  id: string;                    // APT-XXXXX
  patientId: string;
  patientName: string;
  patientEmail: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  dateTime: Date;
  appointmentTime: string;
  duration: number;              // minutes
  type: 'telehealth' | 'in_person' | 'emergency' | 'follow_up';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  reason?: string;
  symptoms?: string[];
  notes?: string;
  diagnosis?: string;
  meetingLink?: string;          // Google Meet link
  calendarEventId?: string;
  result?: AppointmentResult;
  createdAt: Date;
  updatedAt: Date;
}
```

#### EMR (Electronic Medical Record)
```typescript
interface EMR {
  id: string;                    // EMR-XXXXX
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: Date;
  encounterType: 'consultation' | 'follow-up' | 'emergency';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  vitalSigns: VitalSigns;
  physicalExamination: PhysicalExam;
  diagnosis: DiagnosisEntry[];   // ICD-10 codes
  treatmentPlan: string;
  medications: MedicationEntry[];
  labOrders: string[];           // LAB-XXXXX IDs
  imagingOrders: string[];       // IMG-XXXXX IDs
  followUpDate?: Date;
  followUpReason?: string;
  status: 'draft' | 'finalized';
  createdAt: Date;
  updatedAt: Date;
}
```

#### PHR (Personal Health Record)
```typescript
interface PersonalHealthRecord {
  id: string;
  patientId: string;
  demographics: Demographics;
  vitalSignsHistory: VitalSigns[];
  lifestyle: LifestyleData;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: Medication[];
  vaccinations?: Vaccination[];
  documents?: MedicalDocument[];
  wearableData?: WearableData;
  updatedAt: Date;
}
```

### 4.2 Supporting Types

```typescript
// Vital Signs
interface VitalSigns {
  bloodPressure: { systolic: number; diastolic: number; unit: string };
  heartRate: { value: number; unit: string };
  temperature: { value: number; unit: 'celsius' | 'fahrenheit' };
  respiratoryRate?: { value: number; unit: string };
  oxygenSaturation?: { value: number; unit: string };
  weight?: { value: number; unit: string };
  height?: { value: number; unit: string };
  bmi?: number;
  measuredAt?: Date;
}

// Diagnosis Entry
interface DiagnosisEntry {
  code: string;                  // ICD-10 code (e.g., "I10")
  description: string;
  type: 'primary' | 'secondary';
}

// PDPA Consent
interface PDPAConsent {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  dataTypes: ('phr' | 'emr' | 'prescriptions' | 'labs' | 'imaging')[];
  status: 'pending' | 'granted' | 'revoked' | 'expired';
  grantedAt?: Date;
  expiresAt?: Date;
  digitalSignature: string;
  ipAddress: string;
  auditLog: AccessLog[];
}

// Living Will
interface LivingWill {
  id: string;
  patientId: string;
  healthcareProxy: { primary: Person; alternate?: Person };
  preferences: {
    cpr: boolean;
    mechanicalVentilation: boolean;
    artificialNutrition: boolean;
    dialysis: boolean;
    organDonation: boolean;
    painManagement: string;
    additionalWishes: string;
  };
  religiousPreferences?: string;
  digitalSignature: string;
  createdAt: Date;
  updatedAt: Date;
  sharedWith: string[];          // Doctor IDs
}
```

---

## 5. FEATURE PROCESS FLOWS

### 5.1 Appointment Booking Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPOINTMENT BOOKING PROCESS                             │
└─────────────────────────────────────────────────────────────────────────────┘

PATIENT PORTAL                              DOCTOR PORTAL
     │                                           │
     ▼                                           │
[1] Select Doctor & Specialty                    │
     │                                           │
     ▼                                           │
[2] Choose Date & Time Slot                      │
     │                                           │
     ▼                                           │
[3] Enter Symptoms & Reason                      │
     │                                           │
     ▼                                           │
[4] Select Appointment Type                      │
     │  (Telehealth/In-person)                   │
     │                                           │
     ▼                                           │
[5] Submit Appointment ─────────────────────────►│
     │                                           ▼
     │                                    [6] Notification
     │                                           │
     │                                           ▼
     │◄───────────────────────────────── [7] Confirm/Reschedule
     │                                           │
     ▼                                           │
[8] Receive Confirmation                         │
     │  + Calendar Event                         │
     │  + Meet Link (if telehealth)              │
     │                                           │
     ▼                                           ▼
[9] Appointment Day ─────────────────────────── [9] Consultation
     │                                           │
     ▼                                           ▼
[10] Receive Results ◄────────────────────────── [10] Finalize EMR
```

### 5.2 Consultation & EMR Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONSULTATION & EMR WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

DOCTOR PORTAL - Health Studio Dashboard
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────┐  ┌──────────────────────┐  ┌────────────────────────────┐  │
│ │ Health Data │  │   Health Meeting     │  │     Health Studio          │  │
│ │ (Left Col)  │  │   (Center Col)       │  │     (Right Col)            │  │
│ │             │  │                      │  │                            │  │
│ │ • Queue     │  │ • Video Call Area    │  │ [Diagnosis Tab]            │  │
│ │ • Patient   │  │ • AI Summary         │  │ • Patient Info             │  │
│ │   Search    │  │ • History Summary    │  │ • Vital Signs              │  │
│ │ • View All  │  │ • Meeting Summary    │  │ • Current Conditions       │  │
│ │             │  │                      │  │ • ICD-10 Selection         │  │
│ │             │  │ Tab Filters:         │  │                            │  │
│ │             │  │ • Investigation      │  │ [Treatment Tab]            │  │
│ │             │  │ • Treatment          │  │ • E-Prescribing            │  │
│ │             │  │ • Refer              │  │                            │  │
│ │             │  │                      │  │ [System Report Tab]        │  │
│ │             │  │                      │  │ • HPI, Physical Exam       │  │
│ │             │  │                      │  │                            │  │
│ │             │  │                      │  │ [Radiology Tab]            │  │
│ │             │  │                      │  │ • Order X-Ray, CT, MRI     │  │
│ │             │  │                      │  │                            │  │
│ │             │  │                      │  │ [Laboratory Tab]           │  │
│ │             │  │                      │  │ • Order Lab Tests          │  │
│ │             │  │                      │  │ • View Results             │  │
│ └─────────────┘  └──────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
              ┌─────────────────────────────────────────┐
              │           EMR CREATION STEPS            │
              ├─────────────────────────────────────────┤
              │ 1. Record Chief Complaint               │
              │ 2. Document History of Present Illness  │
              │ 3. Enter Vital Signs                    │
              │ 4. Physical Examination                 │
              │ 5. Select ICD-10 Diagnosis              │
              │ 6. Create Treatment Plan                │
              │ 7. E-Prescribe Medications              │
              │ 8. Order Lab/Imaging Tests              │
              │ 9. Set Follow-up Date                   │
              │ 10. Finalize & Sign EMR                 │
              └─────────────────────────────────────────┘
```

### 5.3 PDPA Consent Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PDPA CONSENT WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

PATIENT                                      DOCTOR
   │                                           │
   ▼                                           │
[1] Doctor requests access ◄──────────────────►[1] Request patient data
   │                                           │
   ▼                                           │
[2] Review consent request                     │
   │  • Doctor name                            │
   │  • Data types requested                   │
   │  • Purpose                                │
   │  • Duration                               │
   │                                           │
   ▼                                           │
[3] Grant/Deny consent                         │
   │  • Digital signature                      │
   │  • IP address logged                      │
   │                                           │
   ▼                                           │
[4] Consent recorded ─────────────────────────►│
   │  + Audit log entry                        ▼
   │                                    [5] Access granted
   │                                           │
   │                                           ▼
   │                                    [6] View patient data
   │                                           │
   │◄──────────────────────────────────────────│
   │         (Audit log updated)               │
   │                                           │
   ▼                                           │
[7] View audit log                             │
   │  • Who accessed                           │
   │  • What data                              │
   │  • When                                   │
   │  • Purpose                                │
   │                                           │
   ▼                                           │
[8] Revoke consent (optional) ────────────────►│
                                               ▼
                                        Access revoked
```

---

## 6. PATIENT PORTAL WORKFLOWS

### 6.1 Home Dashboard Flow

```
Login
  │
  ▼
Home Dashboard
  ├─► Upcoming Appointments (Widget)
  ├─► Recent Activity
  ├─► Health Summary
  ├─► Quick Actions:
  │     ├─► Book Appointment
  │     ├─► AI Doctor Chat
  │     ├─► View PHR
  │     └─► Find Healthcare Provider
  │
  ▼
Navigation Menu:
  ├─► Appointments
  │     ├─► View All
  │     ├─► Book New
  │     └─► Past Appointments
  │
  ├─► AI Doctor
  │     ├─► Health Chat
  │     └─► Symptom Checker
  │
  ├─► PHR (Personal Health Record)
  │     ├─► Demographics
  │     ├─► Vital Signs
  │     ├─► Medications
  │     ├─► Allergies
  │     ├─► Vaccinations
  │     └─► Documents
  │
  ├─► Medical Journey (Timeline)
  │
  ├─► Living Will
  │     ├─► Create/Edit
  │     └─► Share with Doctors
  │
  ├─► PDPA Consent
  │     ├─► View Consents
  │     ├─► Grant New
  │     └─► Revoke
  │
  ├─► Healthcare Map
  │     ├─► Find Hospitals
  │     ├─► Find Clinics
  │     └─► Find Pharmacies
  │
  └─► Settings
        ├─► Profile
        ├─► Notifications
        └─► Language
```

### 6.2 PHR Management Flow

```
PHR Page
  │
  ├─► Demographics Section
  │     ├─► View/Edit personal info
  │     ├─► Blood type
  │     └─► Emergency contact
  │
  ├─► Vital Signs
  │     ├─► Add new reading
  │     │     ├─► Blood Pressure
  │     │     ├─► Heart Rate
  │     │     ├─► Temperature
  │     │     ├─► Weight/Height (BMI auto-calc)
  │     │     └─► Blood Glucose
  │     │
  │     └─► View history chart
  │
  ├─► Medications
  │     ├─► View current medications
  │     ├─► Add self-medication
  │     └─► View prescriptions (from doctors)
  │
  ├─► Allergies
  │     ├─► Add allergy
  │     └─► Edit severity
  │
  ├─► Chronic Conditions
  │     └─► Add/Edit conditions
  │
  ├─► Vaccinations
  │     ├─► View vaccination record
  │     └─► Add vaccination
  │
  └─► Documents
        ├─► Upload document
        │     ├─► Lab results
        │     ├─► Imaging
        │     ├─► Prescriptions
        │     └─► Reports
        │
        ├─► View documents
        └─► Download/Delete
```

### 6.3 AI Health Assistant Flow

```
AI Doctor Page
  │
  ├─► Health Chat Mode
  │     │
  │     ▼
  │   User asks health question
  │     │
  │     ▼
  │   Gemini AI processes with context:
  │     • User's PHR (if available)
  │     • Allergies
  │     • Current medications
  │     │
  │     ▼
  │   AI provides response with:
  │     • Medical information
  │     • Recommendations
  │     • Warning signs
  │     • When to see doctor
  │
  └─► Symptom Checker Mode
        │
        ▼
      Select symptoms from list
        │
        ▼
      Add duration & severity
        │
        ▼
      AI Analysis:
        ├─► Triage level (emergency/urgent/routine/self-care)
        ├─► Possible conditions
        ├─► Recommendations
        ├─► Warning signs to watch
        └─► Option to book appointment
```

---

## 7. DOCTOR PORTAL WORKFLOWS

### 7.1 Dashboard Flow

```
Login (Doctor)
  │
  ▼
Doctor Dashboard (3-Column Layout)
  │
  ├─► KPI Cards (Top)
  │     ├─► Today's Appointments
  │     ├─► Patients Seen
  │     ├─► Queue Length
  │     ├─► Pending Prescriptions
  │     ├─► Unread Messages
  │     └─► Average Wait Time
  │
  ├─► Column 1: Health Data
  │     ├─► Patient Queue
  │     │     └─► Click to select patient
  │     ├─► Patient Search
  │     └─► View All Patients
  │
  ├─► Column 2: Health Meeting
  │     ├─► Video Call Area
  │     │     └─► Google Meet integration
  │     ├─► AI Summary Boxes
  │     │     ├─► History Summary
  │     │     └─► Meeting Summary
  │     └─► Tab Filters
  │           ├─► Investigation
  │           ├─► Treatment
  │           └─► Refer
  │
  └─► Column 3: Health Studio
        ├─► [Diagnosis Tab]
        │     └─► ICD-10, assessment
        ├─► [Treatment Tab]
        │     └─► E-Prescribing
        ├─► [System Report Tab]
        │     └─► HPI, physical exam
        ├─► [Radiology Tab]
        │     └─► Imaging orders
        ├─► [Laboratory Tab]
        │     └─► Lab orders/results
        └─► [Pathology Tab]
              └─► Pathology services
```

### 7.2 E-Prescribing Flow

```
Treatment Tab → E-Prescribing
  │
  ▼
[1] Search medication database
  │     • Drug name
  │     • Generic name
  │     • Category
  │
  ▼
[2] Select medication
  │
  ▼
[3] Configure prescription:
  │     ├─► Dosage & strength
  │     ├─► Frequency
  │     ├─► Route (oral/injection/etc)
  │     ├─► Duration
  │     ├─► Quantity
  │     ├─► Refills allowed
  │     └─► Special instructions
  │
  ▼
[4] Drug interaction check (AI-powered)
  │     ├─► Check against current medications
  │     ├─► Check against allergies
  │     └─► Contraindication warnings
  │
  ▼
[5] Add to prescription
  │     └─► Multiple medications allowed
  │
  ▼
[6] Review complete prescription
  │
  ▼
[7] Sign & submit
  │     ├─► Digital signature
  │     └─► Pharmacy notes
  │
  ▼
[8] Prescription saved
      └─► Available to patient portal
```

### 7.3 Lab Order Flow

```
Laboratory Tab
  │
  ▼
[1] Select test category:
  │     ├─► Hematology
  │     ├─► Chemistry
  │     ├─► Lipid Profile
  │     ├─► Renal Function
  │     ├─► Liver Function
  │     ├─► Endocrinology
  │     └─► Urinalysis
  │
  ▼
[2] Select specific tests
  │
  ▼
[3] Configure order:
  │     ├─► Priority (routine/urgent/stat)
  │     ├─► Fasting required?
  │     ├─► Clinical indication
  │     └─► Special instructions
  │
  ▼
[4] Submit order
  │
  ▼
[5] Lab performs tests
  │
  ▼
[6] Results available
  │     ├─► Normal/Abnormal flags
  │     ├─► Reference ranges
  │     └─► Doctor interpretation
  │
  ▼
[7] Patient notified
      └─► Results visible in patient portal
```

---

## 8. DATA SYNCHRONIZATION

### 8.1 Real-time vs Cached Data

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA SYNCHRONIZATION STRATEGY                            │
├─────────────────────┬─────────────────┬─────────────────────────────────────┤
│ Data Type           │ Sync Method     │ Cache TTL                           │
├─────────────────────┼─────────────────┼─────────────────────────────────────┤
│ Appointments        │ Real-time fetch │ 1 minute                            │
│ Queue               │ Real-time fetch │ 30 seconds                          │
│ EMRs                │ Cached          │ 5 minutes                           │
│ Patient Records     │ Cached          │ 5 minutes                           │
│ Lab Results         │ Real-time fetch │ 2 minutes                           │
│ Prescriptions       │ Real-time fetch │ 2 minutes                           │
│ Reference Data      │ Cached          │ 1 hour                              │
│ PHR                 │ On-demand       │ Session-based                       │
│ Chat Sessions       │ Real-time       │ No cache                            │
└─────────────────────┴─────────────────┴─────────────────────────────────────┘
```

### 8.2 Cross-Portal Data Sharing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CROSS-PORTAL DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                    izara-appointments (Shared)
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
      Patient Portal                  Doctor Portal
            │                               │
            │   PDPA Consent Required       │
            │◄─────────────────────────────►│
            │                               │
            ▼                               ▼
   izara-patients-data            izara-doctors-data
         │                               │
         │    Read Access via            │
         │    PDPA Consent               │
         │◄─────────────────────────────►│
         │                               │
    Patient-created:              Doctor-created:
    • PHR                         • EMRs
    • Living Will                 • Prescriptions
    • AI Chat                     • Lab Orders
    • Documents                   • Imaging Orders
                                  • Queue
```

---

## 9. AUTHENTICATION & AUTHORIZATION

### 9.1 Authentication Methods

| Method | Portal | Implementation |
|--------|--------|----------------|
| Email/Password | Both | Custom auth with GCS credentials storage |
| Google OAuth 2.0 | Both | Production-ready, preferred method |
| Demo Mode | Both | Development only, pre-loaded accounts |

### 9.2 OAuth Scopes

```javascript
// Required OAuth Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/devstorage.read_write',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];
```

### 9.3 Authorization Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AUTHORIZATION MATRIX                                   │
├─────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│ Resource            │ Patient     │ Doctor      │ Admin       │ Public      │
├─────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Own PHR             │ CRUD        │ R (consent) │ CRUD        │ -           │
│ Own Appointments    │ CRUD        │ RU          │ CRUD        │ -           │
│ Own Living Will     │ CRUD        │ R (shared)  │ CRUD        │ -           │
│ Own Chat Sessions   │ CRUD        │ -           │ R           │ -           │
│ EMRs                │ R (own)     │ CRUD        │ CRUD        │ -           │
│ Prescriptions       │ R (own)     │ CRUD        │ CRUD        │ -           │
│ Lab Orders          │ R (own)     │ CRUD        │ CRUD        │ -           │
│ Patient Queue       │ R (own)     │ CRUD        │ CRUD        │ -           │
│ Doctor Profiles     │ R           │ RU (own)    │ CRUD        │ R           │
│ Reference Data      │ R           │ R           │ CRUD        │ R           │
└─────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

Legend: C=Create, R=Read, U=Update, D=Delete
```

---

## 10. AI INTEGRATION

### 10.1 Gemini AI Services

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI SERVICE CAPABILITIES                              │
├─────────────────────┬───────────────────────────────────────────────────────┤
│ Service             │ Description                                           │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Symptom Analysis    │ Analyze symptoms, provide triage recommendations      │
│ Health Q&A          │ Answer general health questions                       │
│ ICD-10 Suggestion   │ Suggest diagnosis codes based on clinical notes       │
│ Drug Interaction    │ Check for medication interactions                     │
│ Treatment Suggest   │ Recommend treatments based on diagnosis               │
│ SOAP Note Gen       │ Generate structured clinical notes from transcription │
│ Risk Assessment     │ Calculate cardiovascular/diabetes risk                │
│ Lab Interpretation  │ Interpret laboratory results                          │
│ Medical Calculator  │ BMI, eGFR, CHADS2, etc.                              │
│ Transcription       │ Voice-to-text using Web Speech API                    │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

### 10.2 AI Model Configuration

```javascript
// Environment Configuration
VITE_GEMINI_API_KEY=your-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite  // Default model
```

### 10.3 AI Safety & Disclaimers

All AI responses include:
- Medical disclaimer
- Recommendation to consult healthcare professional
- Emergency warning signs
- Not a replacement for professional medical advice

---

## 11. SECURITY & COMPLIANCE

### 11.1 PDPA Compliance (Thailand)

| Requirement | Implementation |
|-------------|----------------|
| Consent Management | Granular consent with specific data types |
| Audit Logging | All data access logged with timestamp, IP, purpose |
| Right to Access | Patient can view all their data |
| Right to Erasure | Patient can delete their data |
| Data Portability | Export data in standard format |
| Breach Notification | Audit log for security monitoring |

### 11.2 Security Features

```
✅ Implemented:
• HTTPS only (enforced in nginx.conf)
• OAuth 2.0 authentication
• User-scoped data isolation
• Digital signatures for consents
• IP address logging
• Session management with timeout
• Content Security Policy headers

⚠️ Recommended for Production:
• bcrypt/Argon2 password hashing
• JWT with expiration
• Rate limiting
• Email verification
• Two-factor authentication (2FA)
• Data encryption at rest
• Regular security audits
```

### 11.3 Audit Log Structure

```typescript
interface AuditLog {
  timestamp: Date;
  userId: string;
  userType: 'patient' | 'doctor' | 'admin';
  action: 'read' | 'write' | 'delete' | 'consent_grant' | 'consent_revoke';
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  purpose?: string;
  details?: Record<string, any>;
}
```

---

## 12. DEMO ACCOUNTS

### 12.1 Patient Demo Account

```
Name:     demotest (นาย ทดสอบ ระบบ)
Email:    demo.test@gmail.com
ID:       PAT-DEMO-001
Blood:    O+
Allergies: Penicillin
Condition: Hypertension
Medication: Amlodipine 5mg daily
```

### 12.2 Doctor Demo Account

```
Name:     Dr.example (นพ. ตัวอย่าง ใจดี)
Email:    example.test@xhospital.com
ID:       DOC-DEMO-001
License:  MD-DEMO-001
Specialty: General Practice
Hospital: X Hospital Bangkok
```

### 12.3 Demo Data Includes

- 2 EMR records (initial consultation + follow-up)
- 2 Lab orders with complete results (Lipid Profile + Renal Function)
- 2 Prescriptions (active + completed)
- 1 Imaging order with report (Chest X-Ray)
- 3 Appointments (1 upcoming, 2 completed)
- 1 Queue entry
- Complete PHR with vital signs history
- Living will document
- PDPA consent with audit log
- AI chat session history
- Medical timeline events

### 12.4 Generating Demo Data

```bash
# Navigate to scripts folder
cd Isara-anywhere-V0.0.2/scripts

# Generate demo data
node generateUnifiedDemoData.cjs

# Output will be in ./scripts/output/ organized by bucket
```

---

## APPENDIX A: Environment Variables

### Patient Portal (.env)

```env
VITE_APP_NAME=Izara Patient Portal
VITE_APP_ENV=development

VITE_GCP_PROJECT_ID=izara-telemedicine
VITE_GOOGLE_CLIENT_ID=your-client-id

VITE_GCS_BUCKET_AUTH=izara-users-credentials
VITE_GCS_BUCKET_DOCTOR=izara-doctors-data
VITE_GCS_BUCKET_PATIENT=izara-patients-data
VITE_GCS_BUCKET_APPOINTMENTS=izara-appointments
VITE_GCS_BUCKET_METADATA=izara-meta-data

VITE_GEMINI_API_KEY=your-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite

VITE_GOOGLE_CALENDAR_API_KEY=your-calendar-key
VITE_GOOGLE_MAPS_API_KEY=your-maps-key

VITE_PDPA_ENABLED=true
VITE_AI_DOCTOR_ENABLED=true
VITE_LIVING_WILL_ENABLED=true
VITE_MAP_ENABLED=true
```

### Doctor Portal (.env)

```env
VITE_APP_NAME=Izara Doctor Portal
VITE_APP_ENV=development

VITE_GCP_PROJECT_ID=izara-telemedicine
VITE_GOOGLE_CLIENT_ID=your-client-id

VITE_GCS_BUCKET_AUTH=izara-users-credentials
VITE_GCS_BUCKET_DOCTOR=izara-doctors-data
VITE_GCS_BUCKET_PATIENT=izara-patients-data
VITE_GCS_BUCKET_APPOINTMENTS=izara-appointments
VITE_GCS_BUCKET_METADATA=izara-meta-data

VITE_GEMINI_API_KEY=your-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite

VITE_PDPA_ENABLED=true
VITE_AI_CLINICAL_ASSIST=true
VITE_E_PRESCRIBING_ENABLED=true
VITE_VIDEO_CONSULTATION_ENABLED=true
```

---

## APPENDIX B: API Endpoints Reference

### Google Cloud Storage

```
Base URL: https://storage.googleapis.com

Upload:  POST /upload/storage/v1/b/{bucket}/o?uploadType=media&name={path}
Read:    GET /{bucket}/{path}
List:    GET /storage/v1/b/{bucket}/o?prefix={prefix}
Delete:  DELETE /storage/v1/b/{bucket}/o/{encodedPath}
```

### Google Calendar

```
Base URL: https://www.googleapis.com/calendar/v3

Create Event:  POST /calendars/primary/events?conferenceDataVersion=1
Update Event:  PATCH /calendars/primary/events/{eventId}
Delete Event:  DELETE /calendars/primary/events/{eventId}
List Events:   GET /calendars/primary/events
```

### Google Gemini AI

```
Base URL: https://generativelanguage.googleapis.com/v1

Generate:  POST /models/{model}:generateContent
Stream:    POST /models/{model}:streamGenerateContent
```

---

**Document Version:** 2.0.0
**Last Updated:** November 25, 2025
**Maintained By:** Izara Development Team
