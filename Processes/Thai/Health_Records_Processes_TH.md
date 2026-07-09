# Izara Telemedicine เวชระเบียน (PHR & EMR) Workflows

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `Health_Records_Processes.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`Health_Records_Processes.md`](../Health_Records_Processes.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.6.0
**อัปเดตล่าสุด:** March 31, 2026
**สถานะ:** ✅ PostgreSQL Implementation Complete + Full DB Schema


---


## Phase 1 AI Integration Summary

| ฟีเจอร์ | คำอธิบาย | สถานะ |
| --------- | ------------- | -------- |
| **AI-Generated EMR** | Gemini generates SOAP format EMR from meeting transcripts | ✅ |
| **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)** | แพทย์ validates/edits all AI-generated content | ✅ |
| **ผู้ป่วย Instructions** | AI generates ผู้ป่วย-friendly instruction sheets | ✅ |
| **Document Analysis** | AI analyzes uploaded PDFs and lab results | ✅ |

---


## 0. Login & Authentication


- **ผู้ป่วย**
  - Logs in via พอร์ทัลผู้ป่วย (`LoginPage.tsx`) using their own ผู้ป่วย account (patientId)
  - Accesses dashboard, health logs (PHR), นัดหมาย and lab results associated with their own account
  - **Credentials stored**: PostgreSQL `users` table with bcrypt hashed password


- **Doctor/Admin**
  - Logs in via พอร์ทัลแพทย์ (`DoctorDashboard.tsx`) using their own แพทย์ account (doctorId)
  - Can view and edit full EMR, see ผู้ป่วย PHR, and manage lab results for patients under their care
  - **Credentials stored**: PostgreSQL `users` table with bcrypt hashed password

---


## 1. Health Record Creation & Data Sources


### 1.1 Patient Self-Entered PHR Data


- **พอร์ทัลผู้ป่วย PHR Page (`PHRPage.tsx`)**
  - ผู้ป่วย enters vital signs, medications, allergies, and chronic conditions
  - Data is saved to PostgreSQL: `phr` and `vital_signs` tables
  - All data includes `patient_id` and `recorded_at` timestamp
  - Data is immediately available to authorized doctors


- **Supported PHR Data Types:**
  - Vital Signs (blood pressure, heart rate, temperature, weight, oxygen saturation, blood glucose)
  - Current Medications (name, dosage, frequency, purpose, สถานะ)
  - Allergies (allergen name, type, severity)
  - Chronic Conditions (condition name, diagnosed date, สถานะ)
  - **Lifestyle Data (editable by ผู้ป่วย):**
    - Diet (regular, vegetarian, vegan, keto, low-carb, other)
    - Exercise frequency (none, light, moderate, active)
    - Sleep hours (5-9+ hours/night)
    - Smoking สถานะ (never, former, current)
    - Alcohol consumption (never, occasional, moderate, frequent)
    - Supplements usage (free text)
    - Other treatments (free text for alternative medicine, massage, etc.)
  - Vaccinations
  - Medical Documents (uploaded files)


### 1.2 During Appointment (EMR Data)


- แพทย์ (logged in as doctorId) completes and signs EMR in `CompleteEMREditor.tsx` for the specific ผู้ป่วย (patientId)


- **EMR Format:** Single Thai Health Ministry Standard - OPD Card (มาตรฐานกระทรวงสาธารณสุข)


- **EMR Tabs (Thai labels):**
  - ประวัติ (S) - Subjective: Chief complaint, history of present illness
  - ตรวจร่างกาย (O) - Objective: Vital signs, physical examination
  - การวินิจฉัย (A) - Assessment: Diagnosis with ICD-10 codes
  - การรักษา (P) - Plan: Treatment plan, ใบสั่งยา, follow-up
  - สรุป AI - AI Summary: Gemini-generated summary for ผู้ป่วย


- EMR includes:
  - Manual notes (แพทย์'s clinical details)
  - AI-generated summary (Gemini)
  - Meeting transcript (if telemedicine)
  - Diagnosis and treatment plan
  - Linked lab results (if available)


- **Encounter Types:** ตรวจทั่วไป (General), นัดติดตาม (Follow-up), ฉุกเฉิน (Emergency), หัตถการ (Procedure)


- แพทย์ reviews and approves the summary section for ผู้ป่วย sharing; only the summary for the correct patientId is shared


### 1.3 Lab Results Integration


- If lab tests are ordered, results are uploaded/entered in `CompleteLabOrders.tsx` by the แพทย์ (doctorId) for the correct นัดหมาย and ผู้ป่วย (patientId)


- Lab results are linked to the relevant นัดหมาย and EMR (appointmentId, patientId)


- EMR summary for ผู้ป่วย includes relevant lab findings, only for that ผู้ป่วย

---


## 2. Data Storage & Structure


### 2.1 PostgreSQL ฐานข้อมูล Tables

**IMPORTANT:** All interactive clinical data is stored in PostgreSQL (`izara_phase1`). The unified **`patient_documents`** registry holds delivered files. Legacy GCS references in older diagrams are deprecated — use `DocumentDeliveryService` and `Processes/Clinical_Document_Delivery_Workflows.md`.

| Table | Purpose | Key Fields |
| -------- | --------- | ------- |
| `users` | All user accounts | id, email, password_hash, role (patient/doctor/admin) |
| `patient_profiles` | Patient demographics | patient_id, demographics, emergency_contact |
| `phr` | Personal Health Records | patient_id, vital_signs_history, allergies, medications |
| `vital_signs` | Individual vital measurements | patient_id, blood_pressure, heart_rate, temperature |
| `emr` | Electronic Medical Records | patient_id, doctor_id, subjective, objective, assessment, plan |
| `appointments` | Appointment bookings | patient_id, doctor_id, status, meeting_link |
| `prescriptions` | Medication prescriptions | emr_id, patient_id, medications, status |
| `lab_orders` | Lab test orders | emr_id, patient_id, tests, results |


### 2.2 ผู้ป่วย PHR File (`patients/{patientId}/phr.json`)

```json
{
  "id": "phr_{patientId}",
  "patientId": "PATIENT-001",
  "version": "2.0.0",
  "demographics": {
    "name": "John Demo Patient",
    "dateOfBirth": "1990-01-15",
    "age": 35,
    "gender": "male",
    "bloodType": "A+",
    "height": 175,
    "weight": 70
  },
  "vitalSignsHistory": [],
  "allergies": [
    {
      "id": "allergy_001",
      "allergen": "Penicillin",
      "type": "medication",
      "severity": "severe",
      "reaction": "Anaphylaxis"
    }
  ],
  "chronicConditions": [
    {
      "id": "cond_001",
      "condition": "Hypertension",
      "diagnosedDate": "2020-03-15",
      "status": "managed"
    }
  ],
  "currentMedications": [
    {
      "id": "med_001",
      "name": "Lisinopril",
      "dosage": "10mg",
      "frequency": "once daily",
      "status": "active",
      "source": "prescription"
    }
  ],
  "vaccinations": [],
  "lifestyle": {
    "smokingStatus": "never",
    "alcoholConsumption": "occasional",
    "exerciseFrequency": "moderate",
    "diet": "regular",
    "sleepHours": 7,
    "supplements": "วิตามินซี 500mg วันละ 1 เม็ด",
    "otherTreatments": "นวดแผนไทยเดือนละ 1 ครั้ง"
  },
  "documents": [],
  "emergencyContacts": [],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-12-12T10:30:00.000Z",
  "lastModifiedBy": "patient"
}
```


### 2.3 Vital Signs File (`patients/{patientId}/vital-signs.json`)

```json
[
  {
    "id": "vital_1734012345678",
    "patientId": "PATIENT-001",
    "measuredAt": "2025-12-12T10:30:00.000Z",
    "bloodPressure": {
      "systolic": 120,
      "diastolic": 80,
      "unit": "mmHg"
    },
    "heartRate": {
      "value": 72,
      "unit": "bpm"
    },
    "temperature": {
      "value": 36.5,
      "unit": "celsius"
    },
    "oxygenSaturation": {
      "value": 98,
      "unit": "%"
    },
    "weight": {
      "value": 70,
      "unit": "kg"
    },
    "bloodGlucose": {
      "value": 95,
      "unit": "mg/dL",
      "testType": "random"
    },
    "source": "patient_input"
  }
]
```


### 2.4 Health Logs File (`patients/{patientId}/health-logs.json`)

```json
{
  "entries": [
    {
      "id": "log_001",
      "patientId": "PATIENT-001",
      "appointmentId": "APT-001",
      "emrId": "EMR-001",
      "type": "emr_record",
      "encounterDate": "2025-12-10",
      "encounterType": "consultation",
      "doctorId": "DOC-001",
      "doctorName": "Dr. Sarah Johnson",
      "chiefComplaint": "Regular checkup",
      "diagnosis": [{"description": "Healthy", "status": "confirmed"}],
      "treatmentPlan": "Continue current medications",
      "medications": [
        {
          "id": "med_001",
          "drugName": "Paracetamol",
          "genericName": "Acetaminophen",
          "dosage": "500mg",
          "frequency": "Every 6 hours as needed",
          "duration": "7 days",
          "quantity": 28,
          "instructions": "Take after meals",
          "warnings": ["Do not exceed 4g per day"]
        }
      ],
      "followUpDate": "2025-12-17",
      "followUpInstructions": "Return if symptoms worsen",
      "aiSummary": "Patient is in good health...",
      "signedAt": "2025-12-10T15:00:00.000Z",
      "signedBy": "Dr. Sarah Johnson",
      "createdAt": "2025-12-10T14:30:00.000Z"
    },
    {
      "id": "log_002",
      "patientId": "PATIENT-001",
      "prescriptionId": "RX-001",
      "type": "prescription",
      "encounterDate": "2025-12-11",
      "encounterType": "prescription",
      "doctorId": "DOC-001",
      "doctorName": "Dr. Sarah Johnson",
      "medications": [
        {
          "id": "med_002",
          "drugName": "Amoxicillin",
          "genericName": "Amoxicillin",
          "dosage": "500mg",
          "frequency": "3 times daily",
          "duration": "7 days",
          "quantity": 21,
          "instructions": "Complete full course"
        }
      ],
      "treatmentPlan": "Antibiotics for bacterial infection",
      "signedAt": "2025-12-11T10:00:00.000Z",
      "signedBy": "Dr. Sarah Johnson",
      "createdAt": "2025-12-11T10:00:00.000Z"
    }
  ],
  "lastUpdated": "2025-12-11T10:00:00.000Z"
}
```

---


## 3. Patient Portal: Accessing Health Records


### 3.1 PHR Page ("ประวัติสุขภาพส่วนบุคคล" / `PHRPage.tsx`)


#### Tabs


- **Overview**: ผู้ป่วย demographics, recent vitals summary


- **Vitals**: Full vital signs history with charts, add new vitals


- **Medications**: Current medications list, add/edit medications


- **Allergies**: Allergy list with severity, add allergies


- **Profile**: Personal health profile, chronic conditions


#### API Endpoints


- `GET /api/phr/{patientId}` - Get PHR data


- `PUT /api/phr/{patientId}` - Update PHR data


- `GET /api/phr/{patientId}/vitals` - Get vital signs history


- `POST /api/phr/{patientId}/vitals` - Add new vital signs


- `GET /api/phr/{patientId}/health-logs` - Get EMR summaries from doctors


### 3.2 Health Studio (`HealthStudio.tsx`)


#### Tabs (2)


- **Health Overview**: Quick stats, recent นัดหมาย


- **Treatment Results**: EMR summaries from doctors


- **Health Content**: Educational content based on conditions


### 3.3 Data Flow (Patient)

```text
Patient enters vital signs → POST /api/phr/{patientId}/vitals
                           ↓
                    Data saved to PostgreSQL: phr and vital_signs tables
                           ↓
                    Doctor can view in PatientRecordViewer.tsx
```

---


## 4. Doctor Portal: Accessing Patient Records


### 4.1 ผู้ป่วย Record Viewer (`PatientRecordViewer.tsx`)


#### Tabs (3)


- **PHR (Personal Health Record)**: ผู้ป่วย's self-entered data
  - Demographics (name, age, gender, weight, height, BMI)
  - Vital signs history
  - Allergies
  - Chronic conditions
  - Current medications
  - Lifestyle data
  - Wearable device data (if connected)


- **EMR (Electronic Medical Record)**: แพทย์'s clinical notes


- **EHR (Electronic Health Record)**: Timeline of all health events


#### API Endpoints (Doctor Portal)


- `GET /api/phr/{patientId}` - Get ผู้ป่วย PHR data


- `GET /api/phr/{patientId}/vitals` - Get ผู้ป่วย vital signs history


- `GET /api/patients/{patientId}` - Get ผู้ป่วย profile


- `patientRecordService.getPHR(patientId)` - Aggregated PHR data


### 4.2 Data Mapping (Patient → Doctor)

| พอร์ทัลผู้ป่วย Field | พอร์ทัลแพทย์ Field | Data Type |
| --------------------- | --------------------- | ----------- |
| `bloodPressure.systolic` | `demographics.bloodPressure.systolic` | number |
| `bloodPressure.diastolic` | `demographics.bloodPressure.diastolic` | number |
| `heartRate.value` | `vitalSigns[].heartRate` | number |
| `temperature.value` | `vitalSigns[].temperature` | number |
| `oxygenSaturation.value` | `vitalSigns[].oxygenSaturation` | number |
| `weight.value` | `demographics.weight` | number |
| `allergies[]` | `allergies[]` | string[] |
| `chronicConditions[]` | `chronicConditions[]` | string[] |
| `currentMedications[]` | `currentMedications[]` | object[] |
| `lifestyle.smokingStatus` | `lifestyle.smokingStatus` | string |
| `lifestyle.alcoholConsumption` | `lifestyle.alcoholConsumption` | string |
| `lifestyle.exerciseFrequency` | `lifestyle.exercise` | string |
| `lifestyle.diet` | `lifestyle.diet` | string |
| `lifestyle.sleepHours` | `lifestyle.sleep` | string |
| `lifestyle.supplements` | `lifestyle.supplements` | string |
| `lifestyle.otherTreatments` | `lifestyle.otherTreatments` | string |

---


## 5. Cross-Portal Data Sync


### 5.1 Sync Flow Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT PORTAL                                      │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ PHRPage.tsx │    │phrService.ts│    │Server Routes│                      │
│  │             │───>│             │───>│  /api/phr   │                      │
│  │ Add Vitals  │    │ addVitals() │    │             │                      │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                      │
│                                               │                              │
└───────────────────────────────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │          GCS BUCKETS            │
                              │                                 │
                              │  izara-patients-data/           │
                              │    patients/{patientId}/        │
                              │      ├── phr.json              │
                              │      ├── vital-signs.json      │
                              │      └── health-logs.json      │
                              │                                 │
                              └─────────────────┬───────────────┘
                                                │
┌───────────────────────────────────────────────┼──────────────────────────────┐
│                           DOCTOR PORTAL                                       │
│                                                │                              │
│  ┌─────────────────┐    ┌────────────────────┐│    ┌──────────────────────┐ │
│  │PatientRecord    │    │patientRecordService││    │  gcsDataService.ts   │ │
│  │   Viewer.tsx    │<───│    .getPHR()       │<────│ fetchPatientPHR()    │ │
│  │                 │    │                    ││    │ fetchPatientVitals() │ │
│  │ PHR Tab Display │    │ Data Transformation││    │                      │ │
│  └─────────────────┘    └────────────────────┘│    └──────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```


### 5.2 Data Consistency Guarantees

1. **ผู้ป่วย ID Association**: All records include `patientId` field
2. **Timestamp Tracking**: `measuredAt`, `createdAt`, `updatedAt` fields
3. **Source Tracking**: `source` field indicates data origin (patient_input, device, clinic)
4. **เวอร์ชัน Control**: PHR records include `version` field for schema compatibility

---


## 6. ขั้นตอนการทำงาน Steps


### 6.1 Patient Creates PHR Data

1. ผู้ป่วย logs in to พอร์ทัลผู้ป่วย with their credentials
2. Navigates to PHR page (`/phr`)
3. Adds vital signs, medications, or allergies
4. Data is validated and saved to PostgreSQL tables (`phr`, `vital_signs`)
5. Confirmation shown to ผู้ป่วย


### 6.2 Patient Edits Lifestyle Data

1. ผู้ป่วย logs in to พอร์ทัลผู้ป่วย
2. Navigates to PHR page → "ข้อมูลส่วนตัว" (Profile) tab
3. Clicks "แก้ไข" (Edit) button in "ข้อมูลสุขภาพส่วนตัว" section
4. Fills in lifestyle information:
   - **การกินอาหาร** (Diet): regular/vegetarian/vegan/keto/low-carb/other
   - **การออกกำลังกาย** (Exercise): none/light/moderate/active
   - **การนอน** (Sleep): 5-9+ hours/night
   - **การสูบบุหรี่** (Smoking): never/former/current
   - **การดื่มแอลกอฮอล์** (Alcohol): never/occasional/moderate/frequent
   - **การใช้อาหารเสริม** (Supplements): free text
   - **การรักษาอื่นๆ** (Other treatments): free text
5. Clicks "บันทึก" (Save) button
6. Data saved to PostgreSQL `phr` table in lifestyle JSONB column
7. แพทย์ can immediately view updated data in PatientRecordViewer


### 6.3 Doctor Views Patient PHR

1. แพทย์ logs in to พอร์ทัลแพทย์ with their credentials
2. Searches for ผู้ป่วย or selects from นัดหมาย list
3. Opens ผู้ป่วย Record Viewer
4. Clicks PHR tab to view ผู้ป่วย's self-entered data
5. PHR data is fetched from PostgreSQL and transformed for display
6. แพทย์ sees formatted vital signs, allergies, medications, lifestyle (including supplements and other treatments)


### 6.4 Doctor Creates and Signs EMR (Thai OPD Card Format)

1. แพทย์ opens ผู้ป่วย record during/after นัดหมาย
2. Clicks "สร้าง EMR" (Create EMR) button
3. EMR editor opens with Thai OPD Card format:
   - **ประเภทการเข้าพบ** (Encounter type): Select from dropdown
   - **ประวัติ (S)** tab: Enter chief complaint, HPI, medications, allergies
   - **ตรวจร่างกาย (O)** tab: Enter vital signs, physical examination
   - **การวินิจฉัย (A)** tab: Add diagnosis with ICD-10 codes
   - **การรักษา (P)** tab: Enter treatment plan, ใบสั่งยา, follow-up instructions
   - **สรุป AI** tab: Review Gemini-generated summary
4. แพทย์ clicks "ลงนามและส่งให้ผู้ป่วย" (Sign and Send to ผู้ป่วย)
5. System:
   - Sets EMR สถานะ to `signed`
   - Generates AI summary if not already present
   - **Includes medications/ใบสั่งยา in health log entry**
   - POSTs EMR summary to ผู้ป่วย's health-logs.json
6. ผู้ป่วย receives notification and can view AI summary in Treatment Results


### 6.5 Doctor Creates Prescription (E-Prescribing)

1. แพทย์ opens E-Prescribing (`CompletePrescribing.tsx`)
2. Searches for medications in drug database
3. System automatically checks:
   - ผู้ป่วย allergies
   - Drug-drug interactions
   - Contraindications
4. แพทย์ adds medications with:
   - Drug name and generic name
   - Dosage and frequency
   - Duration and quantity
   - Special instructions
5. แพทย์ saves ใบสั่งยา
6. System:
   - Saves ใบสั่งยา to `prescriptions.json`
   - **Sends ใบสั่งยา to ผู้ป่วย's health-logs.json**
   - Type: `prescription`
7. ผู้ป่วย can view medications in Health Studio → ผลการรักษา (Treatment Results)


### 6.6 What Patient Sees (Health Log Entry)

When แพทย์ signs EMR or creates ใบสั่งยา, ผู้ป่วย receives:


#### Visible to Patient

| Field | คำอธิบาย |
| ------- | ------------- |
| `chiefComplaint` | Main reason for visit |
| `diagnosis` | Diagnosis descriptions (not ICD codes) |
| `treatmentPlan` | Treatment instructions |
| `medications` | Prescribed drugs with dosage, frequency, instructions |
| `aiSummary` | Patient-friendly AI-generated summary |
| `followUpDate` | Next appointment date |
| `followUpInstructions` | What to do before next visit |
| `signedBy` | Doctor who signed |
| `signedAt` | Signature timestamp |


#### NOT Visible to Patient

| Field | Reason |
| ------- | -------- |
| Internal comments | แพทย์-to-แพทย์ notes |
| Clinical assessment raw text | Too technical |
| Drug warnings marked "internal" | Not ผู้ป่วย-relevant |
| ICD-10 codes | Technical medical codes |
| แพทย์'s private notes | Confidential |


### 6.7 EMR & PHR Integration (Legacy)

1. แพทย์ completes นัดหมาย
2. แพทย์ fills out EMR in `CompleteEMREditor.tsx`
3. EMR is ลงนามแล้ว and สถานะ set to `signed`
4. Summary section is pushed to ผู้ป่วย's health-logs.json
5. ผู้ป่วย sees EMR summary in Health Studio / Treatment Results

---


## 7. Notification & Access Control


- **ผู้ป่วย**
  - Receives notification when a new EMR summary is available for their account
  - Can only see the summary section, not full clinical notes or raw lab data, and only for their own records
  - PHR data is private to the ผู้ป่วย unless shared via PDPA consent


- **แพทย์**
  - Can see and edit the full EMR and all lab results for patients under their care
  - Can view ผู้ป่วย's PHR (with PDPA consent if enabled)
  - Always accesses data for the correct ผู้ป่วย


- **ผู้ดูแลระบบ**
  - May access all records for audit and troubleshooting

---


## 8. Error Handling & Edge Cases


- **Unsigned EMR:**

  Not visible to ผู้ป่วย; แพทย์ receives reminder to sign.


- **Lab Results รอดำเนินการ:**

  EMR summary is updated when lab results are finalized and ลงนามแล้ว by แพทย์, for the correct ผู้ป่วย.


- **Data Sync Failure:**

  Health logs may be missing or outdated in ผู้ป่วย or พอร์ทัลแพทย์.


- **PHR Not Found:**

  พอร์ทัลแพทย์ displays "No PHR data available" message.


- **Vital Signs Array Empty:**

  แพทย์ sees empty vitals section with appropriate message.

---


## 9. Status Flow

```text
[Patient enters PHR data]
         ↓
┌─────────────────────────────────┐
│ Data saved to GCS               │
│ patients/{patientId}/phr.json   │
│ patients/{patientId}/vital-signs│
└─────────────────────────────────┘
         ↓ (Immediate availability)
┌─────────────────────────────────┐
│ Doctor can view PHR             │
│ via PatientRecordViewer.tsx     │
└─────────────────────────────────┘

[Appointment completed]
         ↓
┌─────────────────────────────────┐
│ EMR drafted (awaiting_signature)│
└─────────────────────────────────┘
         ↓ (Doctor signs EMR)
┌─────────────────────────────────┐
│ EMR signed                      │
└─────────────────────────────────┘
         ↓ (Summary pushed to correct patient)
┌─────────────────────────────────┐
│ Health logs updated for patient │
└─────────────────────────────────┘
```

---


## 10. UI Architecture


### Health Records Pages

| Page/Component | Portal | User | Content/การกระทำ |
| ---------------- | -------- | ------ | ---------------- |
| PHRPage.tsx | ผู้ป่วย | ผู้ป่วย | Enter/view vitals, medications, allergies |
| HealthStudio.tsx | ผู้ป่วย | ผู้ป่วย | Overview, EMR summaries, health content |
| TreatmentResults.tsx | ผู้ป่วย | ผู้ป่วย | แพทย์'s EMR summaries for ผู้ป่วย |
| PatientRecordViewer.tsx | แพทย์ | แพทย์ | View ผู้ป่วย PHR, EMR, EHR timeline |
| CompleteEMREditor.tsx | แพทย์ | แพทย์ | Create/ลงนาม EMR for ผู้ป่วย |
| CompleteLabOrders.tsx | แพทย์ | แพทย์ | Enter lab results for ผู้ป่วย |

---


## 11. Shared PHR Types (Patient ↔ Doctor)

Both portals now use a shared type definition for PHR data to ensure consistency:


### File Locations


- พอร์ทัลผู้ป่วย: `frontend/types/sharedPHRTypes.ts`


- พอร์ทัลแพทย์: `frontend/types/sharedPHRTypes.ts`


#### Key Types

```typescript
// Vital Signs
interface SharedVitalSigns {
  bloodPressure?: { systolic: number; diastolic: number; unit: 'mmHg' };
  heartRate?: { value: number; unit: string };
  temperature?: { value: number; unit: 'celsius' | 'fahrenheit' };
  oxygenSaturation?: { value: number; unit: string };
  bloodGlucose?: { value: number; unit: string; testType?: string };
  weight?: { value: number; unit: string };
  measuredAt: string;
  source?: 'patient_input' | 'device' | 'clinic' | 'wearable';
}

// Demographics
interface SharedDemographics {
  name: string;
  dateOfBirth?: string;
  age?: number;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  height?: number;
  weight?: number;
}

// Medication
interface SharedMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  status: 'active' | 'completed' | 'discontinued';
  source: 'prescription' | 'self_reported' | 'otc';
}

// Full PHR Record
interface SharedPHRRecord {
  id: string;
  patientId: string;
  version: string;
  demographics: SharedDemographics;
  vitalSignsHistory: SharedVitalSigns[];
  allergies: SharedAllergy[];
  chronicConditions: SharedChronicCondition[];
  currentMedications: SharedMedication[];
  lifestyle: SharedLifestyleData;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: 'patient' | 'doctor' | 'system';
}
```

---


## 12. Testing PHR Data Sync


### Selenium Test: `phrDataSyncSeleniumTests.cjs`


#### Test Flow

1. Login as ผู้ป่วย to พอร์ทัลผู้ป่วย
2. Navigate to PHR page
3. Add vital signs (BP: 120/80, HR: 72, Temp: 36.5°C)
4. Add medication (Test Medication, 500mg, twice daily)
5. Add allergy (Selenium Test Allergy)
6. Wait for GCS sync
7. Login as แพทย์ to พอร์ทัลแพทย์
8. Search for ผู้ป่วย and open record
9. Verify vital signs match ผู้ป่วย-entered values
10. Verify medication appears in list

---


## 13. PostgreSQL ฐานข้อมูล Architecture for Health Records


### ฐานข้อมูล Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **phr** | Personal เวชระเบียน (aggregated) | id, patient_id, demographics (JSONB), vital_signs_history (JSONB), allergies (JSONB), chronic_conditions (JSONB), medications (JSONB), vaccinations (JSONB), lifestyle (JSONB), family_history (JSONB), blood_type, height_cm, weight_kg, bmi |
| **vital_signs** | Individual measurements | id (UUID), patient_id, blood_pressure_systolic/diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, blood_glucose, weight, height, measured_at, source |
| **emr** | Electronic Medical Records (SOAP) | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, ai_summary_approved, patient_instructions, สถานะ (draft/ลงนามแล้ว), doctor_signature, signed_at |
| **ใบสั่งยา** | E-Prescribing | id, emr_id, appointment_id, patient_id, doctor_id, medications (JSONB), pharmacy_instructions, cds_warnings (JSONB), สถานะ |
| **lab_orders** | Laboratory test orders | id, emr_id, appointment_id, patient_id, doctor_id, tests (JSONB), priority, results (JSONB), ai_analysis, สถานะ |
| **ai_validations** | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) records | id, type, patient_id, doctor_id, decision, content_snapshot (JSONB), validated_at |
| **patient_instructions** | AI-generated instruction sheets | id, appointment_id, patient_id, doctor_id, content (JSONB), validation_status |
| **patient_consents** | PDPA consent management | id, patient_id, consent_type, granted, doctor_id, data_types (JSONB), สถานะ |


### PHR Data Flow (Patient → DB → Doctor)

```text
Patient Portal (port 3005)                     Doctor Portal (port 3010)
┌──────────────────────────┐                   ┌──────────────────────────┐
│ PHRPage.tsx              │                   │ PatientDetailPage.tsx     │
│ POST /api/phr            │                   │ GET /api/patients/:id/phr│
│ POST /api/vital-signs    │                   │ GET /api/emr/:patientId  │
└──────────┬───────────────┘                   └──────────┬───────────────┘
           │                                              │
           ▼                                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL - izara_phase1                          │
│                                                                      │
│  Patient writes PHR:                                                 │
│  UPDATE phr SET vital_signs_history = $1, allergies = $2,           │
│    chronic_conditions = $3, medications = $4                         │
│  WHERE patient_id = $5                                               │
│                                                                      │
│  Patient records vital signs:                                        │
│  INSERT INTO vital_signs (patient_id, blood_pressure_systolic,      │
│    blood_pressure_diastolic, heart_rate, temperature, measured_at)   │
│  VALUES ($1, $2, $3, $4, $5, NOW())                                 │
│                                                                      │
│  Doctor reads patient history:                                       │
│  SELECT * FROM phr WHERE patient_id = $1                            │
│  SELECT * FROM vital_signs WHERE patient_id = $1                    │
│    ORDER BY measured_at DESC                                         │
│  SELECT * FROM emr WHERE patient_id = $1                            │
│    ORDER BY created_at DESC                                          │
│                                                                      │
│  LISTEN/NOTIFY: phr changes trigger notify_phr_change               │
│  → Socket.IO emits phr:updated to doctor-room                       │
└──────────────────────────────────────────────────────────────────────┘
```


### EMR Creation Flow (Meeting → AI → Doctor Validation → DB)

```text
Meeting Server (port 3020)          Doctor Portal (port 3010)
┌─────────────────────┐            ┌──────────────────────────────┐
│ Transcript capture   │            │ Man-in-the-Loop Validation   │
│ → meeting_transcripts│            │ Doctor reviews AI-generated  │
│ → ai_summary via     │            │ SOAP EMR draft               │
│   Gemini 2.5 Flash   │            │                              │
└────────┬────────────┘            │ [✓ Approve] [✏️ Edit] [✗]   │
         │                         └──────────┬───────────────────┘
         ▼                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│  INSERT INTO emr (appointment_id, patient_id, doctor_id,        │
│    subjective, objective, assessment, plan, ai_summary,          │
│    ai_summary_approved, status)                                  │
│  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'signed')       │
│                                                                  │
│  INSERT INTO ai_validations (type='emr', patient_id, doctor_id, │
│    decision='approved', content_snapshot=$json)                   │
│                                                                  │
│  LISTEN/NOTIFY: emr INSERT triggers notify_emr_change            │
│  → Socket.IO emits emr:updated to patient-room & doctor-room    │
└──────────────────────────────────────────────────────────────────┘
```


### Prescription & Lab Order Data Flow

```text
Doctor creates prescription after EMR
┌──────────────────────────────────────────────────────────────────┐
│  INSERT INTO prescriptions (emr_id, appointment_id, patient_id, │
│    doctor_id, medications=$json, cds_warnings=$warnings)         │
│                                                                  │
│  CDS check performed:                                            │
│  SELECT contraindications FROM drugs WHERE generic_name = $1     │
│  → If interaction found: INSERT INTO cds_logs                    │
│  → WARNING displayed to doctor before prescribing                │
│                                                                  │
│  LISTEN/NOTIFY: prescription INSERT triggers notify_prescription │
│  → Socket.IO emits prescription:updated                          │
└──────────────────────────────────────────────────────────────────┘

Doctor orders lab tests
┌──────────────────────────────────────────────────────────────────┐
│  INSERT INTO lab_orders (emr_id, appointment_id, patient_id,    │
│    doctor_id, tests=$json, priority, status='ordered')           │
│                                                                  │
│  When results uploaded:                                          │
│  UPDATE lab_orders SET results=$json, ai_analysis=$analysis,    │
│    status='completed' WHERE id = $1                              │
│                                                                  │
│  LISTEN/NOTIFY: lab_orders UPDATE triggers notify_lab_order      │
│  → Socket.IO emits lab-order:updated                             │
└──────────────────────────────────────────────────────────────────┘
```


### Deployment Architecture

| Environment | Service | เวชระเบียน Access | Database |
| ----------- | ------- | -------------------- | -------- |
| Local Docker | พอร์ทัลผู้ป่วย (3005) | PHR read/write, vital signs, view EMR/ใบสั่งยา | izara-postgres:5432 |
| Local Docker | พอร์ทัลแพทย์ (3010) | Full EMR CRUD, ใบสั่งยา, คำสั่งตรวจแล็บ, view PHR | izara-postgres:5432 |
| Local Docker | Meeting Server (3020) | EMR draft generation via AI, transcript storage | izara-postgres:5432 |
| Production | All Cloud Run services | Same access patterns | 35.240.157.230:5432 |


### API Endpoints with DB Operations

| Portal | Endpoint | Method | DB Operation |
| ------ | -------- | ------ | ------------ |
| Patient | `/api/phr` | GET | SELECT FROM phr WHERE patient_id=$1 |
| Patient | `/api/phr` | POST/PUT | UPSERT phr SET ... WHERE patient_id=$1 |
| Patient | `/api/vital-signs` | POST | INSERT INTO vital_signs |
| Patient | `/api/vital-signs` | GET | SELECT FROM vital_signs WHERE patient_id=$1 |
| Patient | `/api/health-records/emr` | GET | SELECT FROM emr WHERE patient_id=$1 |
| Patient | `/api/prescriptions` | GET | SELECT FROM prescriptions WHERE patient_id=$1 |
| Doctor | `/api/patients/:id/phr` | GET | SELECT FROM phr + vital_signs |
| Doctor | `/api/emr` | GET/POST | SELECT/INSERT emr |
| Doctor | `/api/emr/:id` | PUT | UPDATE emr SET ... WHERE id=$1 |
| Doctor | `/api/prescriptions` | POST | INSERT INTO prescriptions + CDS check |
| Doctor | `/api/lab-orders` | POST | INSERT INTO lab_orders |
| Doctor | `/api/ai/validate` | POST | INSERT INTO ai_validations |
| Meeting | `/api/meetings/:id/summary` | POST | INSERT INTO emr (AI draft) |
| Meeting | `/api/transcripts` | POST | INSERT INTO meeting_transcripts |


### Scenario Coverage

| # | Scenario | ผู้ดำเนินการ | DB Tables |
| - | -------- | ----- | --------- |
| 1 | ผู้ป่วย enters vital signs | ผู้ป่วย | vital_signs, phr |
| 2 | ผู้ป่วย updates allergies/medications | ผู้ป่วย | phr |
| 3 | แพทย์ views ผู้ป่วย PHR | แพทย์ | phr, vital_signs |
| 4 | AI generates EMR from meeting | Meeting Server | meeting_transcripts, emr |
| 5 | แพทย์ validates AI EMR | แพทย์ | emr, ai_validations |
| 6 | แพทย์ edits/signs EMR | แพทย์ | emr, audit_logs |
| 7 | แพทย์ creates ใบสั่งยา | แพทย์ | ใบสั่งยา, drugs (CDS check), cds_logs |
| 8 | แพทย์ orders lab test | แพทย์ | lab_orders |
| 9 | Lab results uploaded | แพทย์ | lab_orders, ai_document_analysis |
| 10 | AI generates ผู้ป่วย instructions | แพทย์ | patient_instructions, ai_validations |
| 11 | ผู้ป่วย views EMR summary | ผู้ป่วย | emr (read-only) |
| 12 | ผู้ป่วย views ใบสั่งยา | ผู้ป่วย | ใบสั่งยา (read-only) |
| 13 | PDPA consent granted/revoked | ผู้ป่วย | patient_consents, audit_logs |

1. Verify allergy is displayed


#### Run Test

```bash
node scripts/phrDataSyncSeleniumTests.cjs


# Or headless mode:
node scripts/phrDataSyncSeleniumTests.cjs --headless
```


### Selenium Test: `lifestyleAndEMRSeleniumTests.cjs`


#### Test Flow for Lifestyle Data

1. Login as ผู้ป่วย to พอร์ทัลผู้ป่วย
2. Navigate to PHR page → ข้อมูลส่วนตัว tab
3. Click Edit in lifestyle section
4. Fill diet, exercise, sleep, smoking, alcohol, supplements, other treatments
5. Save lifestyle data
6. Login as แพทย์ to พอร์ทัลแพทย์
7. Find ผู้ป่วย and view PHR
8. Verify lifestyle data appears with all fields


#### Test Flow for EMR

1. แพทย์ opens ผู้ป่วย record
2. Creates EMR using Thai OPD Card format
3. Fills all tabs (S, O, A, P)
4. Signs EMR and sends to ผู้ป่วย
5. ผู้ป่วย logs in and checks Treatment Results
6. Verify AI summary is visible
7. **Verify medications are visible** (new)


#### Run Test (2)

```bash
node scripts/lifestyleAndEMRSeleniumTests.cjs


# Or headless mode:
node scripts/lifestyleAndEMRSeleniumTests.cjs --headless
```


#### Test Results Location


- Screenshots: `scripts/test-screenshots/phr-sync/` and `scripts/test-screenshots/lifestyle-emr/`


- Results JSON: `scripts/test-results/`

---


## 13. Summary Table

| ขั้นตอน | User | Page/Component | การกระทำ/Option | Data/สถานะ Update |
| ------ | ------ | ---------------- | --------------- | -------------------- |
| Enter Vitals | ผู้ป่วย | PHRPage.tsx | Add blood pressure, heart rate, etc. | vital-signs.json updated |
| Edit Lifestyle | ผู้ป่วย | PHRPage.tsx | Edit diet, exercise, smoking, alcohol, etc. | phr.json lifestyle updated |
| Add Medication | ผู้ป่วย | PHRPage.tsx | Add medication with dosage | phr.json medications updated |
| Add Allergy | ผู้ป่วย | PHRPage.tsx | Add allergy with severity | phr.json allergies updated |
| View PHR | แพทย์ | PatientRecordViewer.tsx | View ผู้ป่วย's self-entered data + lifestyle | Read from PostgreSQL `phr` / `vital_signs` |
| Complete EMR | แพทย์ | CompleteEMREditor.tsx | Write/ลงนาม EMR (Thai OPD Card format) | นัดหมาย.json, health-logs.json |
| **Prescribe Medication** | แพทย์ | CompletePrescribing.tsx | Add medications with dosage/instructions | ใบสั่งยา.json, **health-logs.json** |
| Enter Lab Results | แพทย์ | CompleteLabOrders.tsx | Enter lab results for นัดหมาย | lab-results.json, EMR updated |
| View EMR Summary | ผู้ป่วย | HealthStudio.tsx | View แพทย์'s ลงนามแล้ว EMR + AI summary | Read from health-logs.json |
| **View ใบสั่งยา** | ผู้ป่วย | TreatmentResults.tsx | View medications from health-logs | Read from health-logs.json |

---


## 14. End-to-End Flow: Doctor to Patient Delivery


### Complete Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOCTOR PORTAL (After Meeting)                        │
│                                                                             │
│  1. Complete EMR               2. Write Prescription     3. Sign & Send    │
│  ┌─────────────────┐          ┌─────────────────────┐    ┌──────────────┐  │
│  │CompleteEMREditor│          │ CompletePrescribing │    │ลงนามและส่งให้│  │
│  │                 │          │                     │    │   ผู้ป่วย    │  │
│  │ - Chief Complnt │          │ - Search drugs      │    │              │  │
│  │ - Diagnosis     │          │ - Check allergies   │    │ Digital Sign │  │
│  │ - Treatment     │          │ - Add medications   │    │              │  │
│  │ - AI Summary    │          │ - Set dosage/freq   │    └──────┬───────┘  │
│  └────────┬────────┘          └──────────┬──────────┘           │          │
│           │                              │                       │          │
└───────────┼──────────────────────────────┼───────────────────────┼──────────┘
            │                              │                       │
            ▼                              ▼                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              POST /api/patients/{patientId}/health-logs       │
│                                                                               │
│  Health Log Entry:                                                            │
│  {                                                                            │
│    type: "emr_record" | "prescription",                                       │
│    chiefComplaint, diagnosis, treatmentPlan,                                  │
│    medications: [...],  ← PRESCRIPTIONS INCLUDED                              │
│    aiSummary,                                                                 │
│    signedBy, signedAt                                                         │
│  }                                                                            │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              GCS: izara-patients-data                         │
│                         patients/{patientId}/health-logs.json                 │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             PATIENT PORTAL                                     │
│                                                                               │
│  Health Studio (HealthStudio.tsx)                                             │
│  ├── ผลการรักษา (TreatmentResults.tsx)                                        │
│  │   ├── EMR Records (type: emr_record)                                       │
│  │   │   ├── Chief Complaint                                                  │
│  │   │   ├── Diagnosis                                                        │
│  │   │   ├── Treatment Plan                                                   │
│  │   │   ├── 💊 Medications (NEW)                                             │
│  │   │   ├── AI Summary                                                       │
│  │   │   └── Follow-up Info                                                   │
│  │   └── Prescriptions (type: prescription)                                   │
│  │       └── 💊 Medications list                                              │
│  └── LatestAppointmentResult.tsx                                              │
│      └── Shows most recent appointment with prescriptions                     │
└───────────────────────────────────────────────────────────────────────────────┘
```


### Data Privacy Filtering

| แพทย์ Creates | What ผู้ป่วย Sees | What's Filtered Out |
| ---------------- | ------------------- | --------------------- |
| Full EMR with all clinical notes | Summarized เวอร์ชัน | Internal assessments |
| ICD-10 diagnosis codes | Diagnosis descriptions | Technical codes |
| Drug interaction warnings | Safe warnings only | Internal warnings |
| แพทย์ comments | N/A | All private comments |
| ใบสั่งยา | Full medication list | Internal notes |

---


#### All data exchanges and record updates are always performed under the correct user account (patientId for patients, doctorId for doctors), ensuring privacy, data integrity, and correct access control