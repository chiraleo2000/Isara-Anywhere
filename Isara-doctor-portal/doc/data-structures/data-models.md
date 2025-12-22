# 📊 Data Models

## Overview

This document describes all data models used in the Izara Doctor Portal, including their structures, relationships, and storage locations.

---

## 🗂️ Storage Overview

### Google Cloud Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `izara-users-credentials` | User accounts, sessions, auth data | Auth Server |
| `izara-doctors-data` | Doctor profiles, schedules, queues | Doctor Portal |
| `izara-patients-data` | Patient records, EMRs, prescriptions | Doctor Portal |
| `izara-appointments` | Appointments, meeting links | Doctor Portal |
| `izara-meta-data` | Reference data, drug DB, lab codes | All Services |

---

## 👤 User Models

### UserCredential (Full Record)

**Storage:** `izara-users-credentials/users/{id}.json`

```typescript
interface UserCredential {
  id: string;                      // Format: DOC-XXXX-XXX
  email: string;                   // Lowercase, trimmed
  passwordHash: string;            // SHA256 hash
  role: 'doctor' | 'admin' | 'patient';
  doctorId?: string;               // Same as id for doctors
  patientId?: string;              // For patient users
  medicalLicenseNumber?: string;   // Format: MD-123456 (doctors only)
  isAdmin: boolean;                // Admin privileges flag
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;               // ISO timestamp
  lastLogin: string | null;        // ISO timestamp
  loginAttempts: number;           // Failed login attempts
  lockedUntil: string | null;      // ISO timestamp when locked
  preferences: UserPreferences;
  // Additional profile data
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  specialty?: string;
  // Admin specific
  adminPrivileges?: AdminPrivileges;
  // Approval status
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isApproved?: boolean;
}
```

### UserPreferences

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'th';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}
```

### AdminPrivileges

```typescript
interface AdminPrivileges {
  canManageDoctors: boolean;
  canManagePatients: boolean;
  canManageAppointments: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canAssignRoles: boolean;
  level: 'super_admin' | 'admin' | 'moderator';
}
```

### User (Public/Frontend)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'admin';
  doctorId: string;
  medicalLicenseNumber: string;
  isActive: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  dateOfBirth?: string;
  phone?: string;
  specialty?: string;
  preferences: UserPreferences;
  isAdmin?: boolean;
  adminPrivileges?: AdminPrivileges;
}
```

### UserIndexEntry

**Storage:** `izara-users-credentials/users/index.json`

```typescript
interface UserIndexEntry {
  id: string;
  email: string;
  role: 'doctor' | 'admin';
  isActive: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}
```

---

## 👨‍⚕️ Doctor Models

### Doctor

**Storage:** `izara-doctors-data/doctors.json`

```typescript
interface Doctor {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  email?: string;
  rating?: number;
  experience?: string;
  qualifications?: string[];
  availableSlots?: string[];
  isApproved?: boolean;
  medicalLicenseNumber?: string;
}
```

---

## 🏥 Patient Models

### PatientRecord

**Storage:** `izara-patients-data/patients.json` (index)
**Storage:** `izara-patients-data/patients/{id}.json` (individual)

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
  lastVisit?: Date;
  nextAppointment?: Date;
  consentStatus: {
    hasConsent: boolean;
    dataTypesAllowed: string[];
    expiresAt?: Date;
  };
  riskLevel?: 'low' | 'medium' | 'high';
  isActive?: boolean;
}
```

### EmergencyContact

```typescript
interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}
```

---

## 📝 EMR Models

### EMR (Electronic Medical Record)

**Storage:** `izara-patients-data/emr/{patientId}/{emrId}.json`

```typescript
interface EMR {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  encounterDate: Date;
  encounterType: 'consultation' | 'follow-up' | 'emergency' | 'procedure';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  reviewOfSystems: ReviewOfSystems;
  physicalExamination: PhysicalExam;
  vitalSigns: VitalSigns;
  assessment: string;
  diagnosis: DiagnosisCode[];
  treatmentPlan: string;
  prescriptions: Prescription[];
  investigations: Investigation[];
  followUpInstructions: string;
  followUpDate?: Date;
  createdAt: Date;
  lastModified: Date;
  status: 'draft' | 'finalized' | 'amended';
  digitalSignature?: string;
  version: number;
  previousVersions?: string[];
}
```

### VitalSigns

```typescript
interface VitalSigns {
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    unit: 'mmHg';
  };
  heartRate?: {
    value: number;
    unit: 'bpm';
  };
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  respiratoryRate?: {
    value: number;
    unit: 'breaths/min';
  };
  oxygenSaturation?: {
    value: number;
    unit: '%';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
  };
  height?: {
    value: number;
    unit: 'cm' | 'inches';
  };
  bmi?: number;
  measuredAt?: Date;
}
```

### DiagnosisCode

```typescript
interface DiagnosisCode {
  code: string;           // ICD-10 code
  description: string;
  type: 'primary' | 'secondary';
  onset?: Date;
  status: 'active' | 'resolved' | 'chronic';
}
```

### ReviewOfSystems

```typescript
interface ReviewOfSystems {
  constitutional?: string;
  eyes?: string;
  entNoseThroat?: string;
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  genitourinary?: string;
  musculoskeletal?: string;
  integumentary?: string;
  neurological?: string;
  psychiatric?: string;
  endocrine?: string;
  hematologicLymphatic?: string;
  allergicImmunologic?: string;
}
```

---

## 💊 Prescription Models

### Prescription

```typescript
interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  refillsAllowed: number;
  prescribedBy?: string;
  prescribedDate?: string;
  pharmacyInstructions?: string;
  sideEffects?: string[];
  contraindications?: string[];
}
```

### PrescriptionFull

**Storage:** `izara-patients-data/prescriptions/{patientId}/{rxId}.json`

```typescript
interface PrescriptionFull {
  id: string;
  patientId: string;
  doctorId: string;
  encounterDate: Date;
  medications: PrescriptionItem[];
  pharmacyId?: string;
  status: 'pending' | 'sent' | 'dispensed' | 'cancelled';
  digitalSignature: string;
  createdAt: Date;
  validUntil?: Date;
}
```

### PrescriptionItem

```typescript
interface PrescriptionItem {
  drugName: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  strength: string;
  route: 'oral' | 'injection' | 'topical' | 'inhaled' | 'rectal' | 'other';
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  interactions?: DrugInteraction[];
}
```

---

## 🧪 Lab Order Models

### LabOrder

```typescript
interface LabOrder {
  id: string;
  testName: string;
  labName: string;
  status: string;
  orderedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  instructions?: string;
  results?: LabResult[];
  orderedBy?: string;
  priority?: 'routine' | 'urgent' | 'stat';
}
```

### LabOrderFull

**Storage:** `izara-patients-data/lab-orders/{patientId}/{orderId}.json`

```typescript
interface LabOrderFull {
  id: string;
  patientId: string;
  doctorId: string;
  orderDate: Date;
  tests: LabTest[];
  clinicalIndication: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'collected' | 'in_progress' | 'completed' | 'cancelled';
  results?: LabResultFull[];
  completedAt?: Date;
}
```

### LabResult

```typescript
interface LabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  notes?: string;
}
```

---

## 📅 Appointment Models

### Appointment

**Storage:** `izara-appointments/appointments.json` (index)
**Storage:** `izara-appointments/appointments/{id}.json` (individual)

```typescript
interface Appointment {
  id: string;
  user: User;
  userId?: string;
  patientId?: string;
  date: Date;
  type: AppointmentType;
  status: AppointmentStatus;
  doctor?: Doctor;
  doctorId?: string;
  symptoms: string[];
  notes: string;
  meetLink?: string;
  calendarEventId?: string;
  diagnosis?: string;
  treatmentPlan?: string[] | TreatmentPlan;
  summary?: string;
  result?: AppointmentResult;
  createdAt?: Date;
  updatedAt?: Date;
  confirmedAt?: Date;
  paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'refunded';
}
```

### AppointmentStatus

```typescript
enum AppointmentStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  NoShow = 'No Show',
  Rescheduled = 'Rescheduled',
}
```

### AppointmentType

```typescript
enum AppointmentType {
  Telehealth = 'Telehealth',
  InPerson = 'In-person',
  Emergency = 'Emergency',
  FollowUp = 'Follow-up',
  Consultation = 'Consultation',
}
```

### AppointmentResult

```typescript
interface AppointmentResult {
  id: string;
  appointmentId: string;
  diagnosis: string;
  differentialDiagnosis?: string[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
  treatmentPlan?: TreatmentPlan;
  followUpDate?: string;
  referral?: HospitalReferral;
  aiSummary?: string;
  createdAt: string;
  payment?: PaymentTransaction;
  vitalSigns?: VitalSigns;
  clinicalNotes?: string;
}
```

---

## 📊 Queue Models

### QueuePatient

**Storage:** `izara-doctors-data/queue/{doctorId}.json`

```typescript
interface QueuePatient {
  id: string;
  patientId: string;
  patientName: string;
  patient?: PatientRecord;
  appointmentId: string;
  appointmentTime: Date;
  checkInTime?: Date;
  reasonForVisit?: string;
  reason: string;
  priority: 'routine' | 'urgent' | 'emergency' | 'high';
  status: 'waiting' | 'in-consultation' | 'in-progress' | 'completed' | 'no-show' | 'skipped';
  estimatedWaitTime?: number;
  queuePosition: number;
  queueNumber?: number;
  doctorId?: string;
  addedAt?: Date;
  updatedAt?: Date;
}
```

---

## 🎥 Meeting Models

### MeetingSession

```typescript
interface MeetingSession {
  id: string;
  appointmentId: string;
  startTime: Date;
  endTime?: Date;
  participants: MeetingParticipant[];
  recordingUrl?: string;
  duration?: number;
  notes?: string;
  status: 'scheduled' | 'waiting' | 'active' | 'completed' | 'cancelled';
  meetLink?: string;
  calendarEventId?: string;
  transcription?: MeetingTranscription;
  aiSummary?: MeetingAISummary;
  patientJoinedAt?: Date;
  doctorJoinedAt?: Date;
  consentRecorded?: boolean;
}
```

### MeetingAISummary

```typescript
interface MeetingAISummary {
  id: string;
  meetingId: string;
  chiefComplaint: string;
  symptoms: string[];
  diagnosis?: string;
  treatmentPlan: string[];
  prescriptions: SuggestedPrescription[];
  labOrders: string[];
  followUpRecommended: boolean;
  followUpDate?: string;
  redFlags: string[];
  patientEducation: string[];
  generatedAt: Date;
  confidence: number;
}
```

---

## 💰 Payment Models

### PaymentTransaction

```typescript
interface PaymentTransaction {
  id: string;
  appointmentId: string;
  transactionDate: string;
  totalAmount: number;          // Thai Baht
  paidAmount: number;           // Thai Baht
  remainingBalance: number;     // Thai Baht
  currency: 'THB';
  paymentMethod: PaymentMethod;
  serviceCosts: ServiceCost[];
  status: 'pending' | 'partial' | 'completed' | 'refunded' | 'cancelled' | 'failed';
  receiptUrl?: string;
  invoiceUrl?: string;
  notes?: string;
  transactionReference?: string;
}
```

---

## 🔐 Consent Models

### ConsentRecord

**Storage:** `izara-patients-data/patients/{patientId}/pdpa/consents.json`

```typescript
interface ConsentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  consentType: 'phr-access' | 'ehr-access' | 'data-sharing' | 'research' | 'recording';
  granted: boolean;
  grantedAt?: Date;
  expiresAt?: Date;
  scope: string[];
  signatureUrl?: string;
  witnessName?: string;
}
```

---

## 📋 Clinical Template Models

### ClinicalTemplate

```typescript
interface ClinicalTemplate {
  id: string;
  name: string;
  type: 'soap' | 'sbar' | 'admission' | 'discharge' | 'progress';
  specialty?: string;
  content: {
    sections: TemplateSection[];
  };
  createdBy: string;
  isDefault: boolean;
}

interface TemplateSection {
  id: string;
  title: string;
  content: string;
  order: number;
  required: boolean;
}
```

---

## 📊 Analytics Models

### DashboardStats

```typescript
interface DashboardStats {
  upcomingAppointments: number;
  completedAppointments: number;
  pendingPayments: number;
  unreadMessages: number;
  prescriptionsToRefill: number;
  nextAppointment?: Appointment;
  healthScore?: number;
  recentActivity: ActivityLog[];
}
```

### ActivityLog

```typescript
interface ActivityLog {
  id: string;
  userId: string;
  type: 'appointment' | 'payment' | 'prescription' | 'lab' | 'message';
  action: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```
