# Izara Telemedicine Mock Data Reference

> **Last Updated:** January 20, 2026  
> **Version:** 3.0.0  
> **Phase 1 Status:** 🚧 In Development  
> **Test Pass Rate:** Pending (Comprehensive Test Suite v3.0)

---

## Overview

This document provides comprehensive reference for all mock data used in automated testing of the Izara Telemedicine Platform. The mock data covers all user roles, clinical workflows, AI features, and edge cases necessary for thorough Phase 1 testing.

### Phase 1 Features Coverage

| Feature | Status | Reference |
|---------|--------|-----------|
| Video Meeting + EMR | ✅ | Dr.Isara 2.1, 4.1 |
| AI Chat Assistant | ✅ | P.Beer 3.3, 4.2 |
| Pre-consultation Summary | ✅ | Dr.Isara 2.2 |
| Document/PDF Analysis | ✅ | Dr.Isara 2.3, 4.4 |
| Clinical Decision Support | ✅ | Dr.Isara 2.4 |
| Man-in-the-Loop Validation | ✅ | Dr.Isara 2.5, 4.3 |
| Patient Instruction Sheet | ✅ | Dr.Isara 2.1, 4.5 |
| PostgreSQL Database | ✅ | P.Beer 3.1 |
| Meeting Transcription | ✅ | P.Beer 3.2 |
| Web Speech API | ✅ | P.Beer 3.5 |

---

## Test User Credentials

### 👨‍💼 Admin User

| Field | Value |
|-------|-------|
| **Email** | `admin.test@izara.com` |
| **Password** | `IzaraAdmin@2024` |
| **ID** | `ADMIN-001` |
| **Role** | `admin` |
| **Status** | `approved` |
| **Name** | Admin Test |
| **Thai Name** | ผู้ดูแลระบบ ทดสอบ |

**Permissions:**
- Doctor management (approve/reject pending doctors)
- Medical content approval
- Clinical resources approval
- Appointment pool oversight
- System configuration
- User account management

---

### 👨‍⚕️ Approved Doctor (Primary Test User)

| Field | Value |
|-------|-------|
| **Email** | `doctor.test@izara.com` |
| **Password** | `IzaraDoctor@2024` |
| **ID** | `DOC-001` |
| **Role** | `doctor` |
| **Status** | `approved` |
| **Name** | Dr. Somchai Jaidee |
| **Thai Name** | นพ. สมชาย ใจดี |
| **License** | ว.12345 |
| **Specialty** | Internal Medicine |

**Capabilities:**
- Full dashboard access
- Patient management
- EMR creation (Thai Ministry Standard OPD Card)
- Prescription writing with CDS alerts
- Lab/Imaging ordering
- Queue management
- AI Chat Assistant access
- Document analysis
- Video meeting with transcription
- Patient instruction sheet generation

---

### 👨‍⚕️ Second Doctor (Cardiologist)

| Field | Value |
|-------|-------|
| **Email** | `cardio.doctor@izara.com` |
| **Password** | `IzaraDoctor@2024` |
| **ID** | `DOC-003` |
| **Role** | `doctor` |
| **Status** | `approved` |
| **Name** | Dr. Wichai Chuchart |
| **Thai Name** | นพ. วิชัย ชูชาติ |
| **License** | ว.54321 |
| **Specialty** | Cardiology |

---

### 👨‍⚕️ Pending Doctor (Needs Admin Approval)

| Field | Value |
|-------|-------|
| **Email** | `doctor02.test@izara.com` |
| **Password** | `IzaraDoctor@2024` |
| **ID** | `DOC-002` |
| **Role** | `doctor` |
| **Status** | `pending` |
| **Name** | Dr. Wanida Thongdee |
| **Thai Name** | พญ. วนิดา ทองดี |
| **License** | ว.67890 |
| **Specialty** | Gastroenterology |

**Testing Purpose:**
- Admin approval workflow testing
- Pending doctor login rejection verification
- Doctor management interface testing

---

### 👤 Primary Patient User

| Field | Value |
|-------|-------|
| **Email** | `demo.test@gmail.com` |
| **Password** | `P@ssw0rd` |
| **ID** | `PATIENT-001` |
| **Role** | `patient` |
| **Status** | `active` |
| **Name** | Demo Test User |
| **Thai Name** | นาย ทดสอบ ระบบ |
| **Blood Type** | O+ |
| **Allergies** | None |

**PHR Data:**
- Height: 175 cm
- Weight: 70 kg
- BMI: 22.9
- Conditions: None (baseline healthy patient)
- Purpose: Basic workflow testing

---

### 👤 Phase 1 Complex Patient - Hypertension (NEW)

| Field | Value |
|-------|-------|
| **Email** | `Somchai.Mankong@gmail.com` |
| **Password** | `P@ssw0rd` |
| **ID** | `PATIENT-SOMCHAI` |
| **Role** | `patient` |
| **Status** | `active` |
| **Name** | Somchai Mankong |
| **Thai Name** | นายสมชาย มั่นคง |
| **Age** | 65 years |
| **Blood Type** | A+ |
| **Allergies** | Penicillin |
| **Chronic Conditions** | Hypertension |

**PHR Data:**
- Height: 168 cm
- Weight: 72 kg
- BMI: 25.5 (Overweight)
- Latest BP: 145/92 mmHg (Elevated)
- Medications: Amlodipine 10mg OD

**Testing Purpose:**
- Blood pressure monitoring workflows
- CDS alerts for hypertension guidelines
- Pre-consultation summary generation
- Man-in-the-Loop validation

---

### 👤 Phase 1 Complex Patient - DM + CKD (NEW)

| Field | Value |
|-------|-------|
| **Email** | `Anan.Khayanrian@gmail.com` |
| **Password** | `P@ssw0rd` |
| **ID** | `PATIENT-ANAN` |
| **Role** | `patient` |
| **Status** | `active` |
| **Name** | Anan Khayanrian |
| **Thai Name** | นายอนันต์ ขยันเรียน |
| **Age** | 60 years |
| **Blood Type** | O+ |
| **Allergies** | Sulfa drugs, NSAIDs |
| **Chronic Conditions** | Type 2 Diabetes, CKD Stage 3b |

**PHR Data:**
- Height: 165 cm
- Weight: 78 kg
- BMI: 28.7 (Overweight)
- Latest FBS: 185 mg/dL (Elevated)
- HbA1c: 8.2% (Poor control)
- eGFR: 45 mL/min (CKD Stage 3b)
- Medications: Metformin 500mg BID (reduced for CKD), Glipizide 5mg OD

**Testing Purpose:**
- Complex drug dose adjustments (Metformin for CKD)
- Drug interaction checking (NSAID contraindication)
- Multi-condition CDS alerts
- Guideline-based recommendations (KDIGO 2024, Thai Diabetes 2024)
- Document analysis (lab results interpretation)

---

## Edge Case Users

### 📝 Inactive Doctor

| Field | Value |
|-------|-------|
| **Email** | `inactive.doctor@izara.com` |
| **Password** | `InactiveDoc@2024` |
| **ID** | `DOC-INACTIVE-001` |
| **Status** | `approved` |
| **Active** | `false` |

**Testing Purpose:** Verify inactive account login rejection

---

### 📝 Rejected Doctor

| Field | Value |
|-------|-------|
| **Email** | `rejected.doctor@izara.com` |
| **Password** | `RejectedDoc@2024` |
| **ID** | `DOC-REJECTED-001` |
| **Status** | `rejected` |
| **Rejection Reason** | Failed license verification |

**Testing Purpose:** Verify rejected application handling

---

### 📝 Locked Account

| Field | Value |
|-------|-------|
| **Email** | `locked.doctor@izara.com` |
| **Password** | `LockedDoc@2024` |
| **ID** | `DOC-LOCKED-001` |
| **Status** | `approved` |
| **Account Locked** | `true` |
| **Failed Attempts** | 5 |

**Testing Purpose:** Verify account lockout security feature

---

## Clinical Data

### 📋 EMR Records

| EMR ID | Patient | Doctor | Date | Chief Complaint | Diagnosis |
|--------|---------|--------|------|-----------------|-----------|
| EMR-SOMCHAI-001 | PATIENT-SOMCHAI | DOC-001 | 7 days ago | Headache, dizziness | I16.0 Hypertensive urgency |
| EMR-ANAN-001 | PATIENT-ANAN | DOC-001 | 14 days ago | High blood sugar, polyuria | E11.65 Uncontrolled T2DM with CKD |

**EMR Structure (Thai Ministry Standard OPD Card):**
- **S** (Subjective): Chief complaint, HPI, ROS
- **O** (Objective): Vital signs, physical exam, lab results
- **A** (Assessment): Primary/secondary diagnoses, ICD-10 codes
- **P** (Plan): Medications, investigations, lifestyle, follow-up
- **AI Summary**: Gemini-generated summary (requires doctor approval)
- **Patient Instructions**: Thai/English instructions for patient

---

### 💊 Prescriptions

| RX ID | Patient | Doctor | Medications | CDS Warnings | Status |
|-------|---------|--------|-------------|--------------|--------|
| RX-SOMCHAI-001 | PATIENT-SOMCHAI | DOC-001 | Amlodipine 10mg x 30 | None | dispensed |
| RX-ANAN-001 | PATIENT-ANAN | DOC-001 | Metformin 500mg BID, Glipizide 5mg OD | Reduced Metformin for CKD | dispensed |

---

### 🔬 Lab Orders

| LAB ID | Patient | Doctor | Tests | Status |
|--------|---------|--------|-------|--------|
| LAB-SOMCHAI-001 | PATIENT-SOMCHAI | DOC-001 | CBC, BMP, Lipid Panel | completed |
| LAB-ANAN-001 | PATIENT-ANAN | DOC-001 | HbA1c, BMP, Urine ACR | completed |

---

## Appointments

### 📅 Phase 1 Appointments

| APT ID | Patient | Doctor | Status | Type | Date | Features |
|--------|---------|--------|--------|------|------|----------|
| APT-SOMCHAI-PAST1 | PATIENT-SOMCHAI | DOC-001 | completed | Follow-up | 7 days ago | EMR, Prescription |
| APT-SOMCHAI-001 | PATIENT-SOMCHAI | DOC-001 | confirmed | Telemedicine | Tomorrow | Video meeting |
| APT-ANAN-PAST1 | PATIENT-ANAN | DOC-001 | completed | Follow-up | 14 days ago | EMR, CDS alerts |
| APT-ANAN-001 | PATIENT-ANAN | DOC-001 | pending | Telemedicine | 3 days | AI pre-summary |

---

### 📋 Appointment Pool

| Pool ID | Patient | Reason | Status | Priority |
|---------|---------|--------|--------|----------|
| POOL-001 | PATIENT-001 | Patient didn't select doctor | awaiting_assignment | normal |
| POOL-002 | PATIENT-001 | Max missed attempts by doctor | awaiting_admin_approval | high |

---

## AI Features Data (Phase 1)

### 🤖 AI Chat Sessions

| Session ID | Doctor | Patient | Type | Messages |
|------------|--------|---------|------|----------|
| AI-CHAT-SESSION-001 | DOC-001 | PATIENT-SOMCHAI | pre_consultation | 8 messages |
| AI-CHAT-SESSION-002 | DOC-001 | PATIENT-ANAN | document_analysis | 6 messages |
| AI-CHAT-SESSION-003 | DOC-001 | - | general_query | 4 messages |

**Chat Session Structure:**
```json
{
  "sessionId": "AI-CHAT-SESSION-001",
  "doctorId": "DOC-001",
  "patientId": "PATIENT-SOMCHAI",
  "sessionType": "pre_consultation",
  "messages": [
    {
      "id": "msg-001",
      "role": "system",
      "content": "You are Izara AI Assistant...",
      "timestamp": "2026-01-19T08:00:00Z"
    },
    {
      "id": "msg-002",
      "role": "user",
      "content": "สรุปประวัติผู้ป่วยก่อนพบ",
      "context": { "patientId": "PATIENT-SOMCHAI" }
    },
    {
      "id": "msg-003",
      "role": "assistant",
      "content": "ผู้ป่วยสมชาย มั่นคง อายุ 65 ปี...",
      "aiMetadata": {
        "model": "gemini-1.5-pro",
        "tokensUsed": 450,
        "confidence": 0.92
      }
    }
  ]
}
```

---

### 📊 Clinical Decision Support (CDS) Logs

| CDS ID | Patient | Type | Recommendation | Decision |
|--------|---------|------|----------------|----------|
| CDS-001 | PATIENT-SOMCHAI | blood_pressure_alert | BP 152/96 exceeds target | accepted |
| CDS-002 | PATIENT-ANAN | dose_adjustment | Reduce Metformin for CKD | accepted |
| CDS-003 | PATIENT-ANAN | nsaid_contraindication | NSAIDs contraindicated in CKD | accepted |

**CDS Types:**
- `blood_pressure_alert`: BP outside target range
- `drug_interaction`: Potential drug-drug interaction
- `dose_adjustment`: Renal/hepatic dose adjustment
- `guideline_alert`: Deviation from clinical guidelines
- `nsaid_contraindication`: NSAID use in CKD

---

### 📄 Document Analysis

| Analysis ID | Patient | Document Type | Status | Key Findings |
|-------------|---------|--------------|--------|--------------|
| DOC-SOMCHAI-001 | PATIENT-SOMCHAI | lab_result | completed | Normal CBC, BMP |
| DOC-ANAN-001 | PATIENT-ANAN | lab_result | completed | HbA1c 8.2%, eGFR 45 |

---

### 📝 Patient Instruction Sheets

| PI ID | Patient | Appointment | Language | Status |
|-------|---------|-------------|----------|--------|
| PI-SOMCHAI-001 | PATIENT-SOMCHAI | APT-SOMCHAI-PAST1 | Thai/English | delivered |
| PI-ANAN-001 | PATIENT-ANAN | APT-ANAN-PAST1 | Thai/English | delivered |

**Instruction Sheet Contents:**
- Medication instructions (วิธีการกินยา)
- Lifestyle recommendations (การปฏิบัติตัว)
- Warning signs (อาการที่ต้องพบแพทย์)
- Follow-up appointment (นัดติดตาม)
- Doctor contact information

---

### 📹 Meeting Records

| Record ID | Appointment | Duration | Transcription | AI Summary |
|-----------|-------------|----------|---------------|------------|
| MEETING-RECORD-001 | APT-SOMCHAI-PAST1 | 25 min | Thai | Available |

**Meeting Record Structure:**
- Recording URL (GCS storage)
- Transcript (Thai/English)
- AI Summary (30-min sections for long meetings)
- Doctor notes

---

## Medical Content (Health Library)

### 📚 Published Articles

| ID | Title (Thai) | Title (English) | Category | Status |
|----|--------------|-----------------|----------|--------|
| MC-BP-001 | ทำความเข้าใจความดันโลหิต | Understanding Blood Pressure | general-health | published |
| MC-DM-001 | อยู่กับเบาหวาน | Living with Diabetes | chronic-disease | published |
| MC-SLEEP-001 | นอนหลับดี สุขภาพดี | Better Sleep for Better Health | wellness | published |
| MC-HEART-001 | ดูแลหัวใจให้แข็งแรง | Heart Health Basics | cardiovascular | published |
| MC-KIDNEY-001 | ดูแลไต ป้องกันโรคไตเรื้อรัง | Kidney Care & CKD Prevention | nephrology | published |

---

### 🏥 Clinical Resources (Doctor Reference)

| ID | Title (Thai) | Category | Specialty | Source |
|----|--------------|----------|-----------|--------|
| CR-HTN-001 | แนวทางการรักษาความดันโลหิตสูง 2024 | treatment | Cardiology | Thai HTN Society |
| CR-DM-001 | แนวทางการดูแลผู้ป่วยเบาหวาน 2024 | treatment | Endocrinology | Thai DM Association |
| CR-CKD-001 | แนวทาง KDIGO 2024 โรคไตเรื้อรัง | treatment | Nephrology | KDIGO |
| CR-DRUG-001 | ตารางปรับขนาดยาในผู้ป่วยโรคไต | pharmacology | Pharmacy | NKDEP |
| CR-INTERACT-001 | ข้อมูลปฏิกิริยาระหว่างยา | pharmacology | Pharmacy | DrugBank |

---

## Knowledge Base (RAG)

### 📖 Knowledge Base Entries

| Category | Language | Topics | Source |
|----------|----------|--------|--------|
| hypertension | Thai/English | BP targets, medications, lifestyle | Thai HTN Society 2024 |
| diabetes | Thai/English | HbA1c targets, medications, monitoring | Thai DM Association 2024 |
| nephrology | Thai/English | CKD staging, drug adjustments | KDIGO 2024 |
| drug_interactions | English | Common interactions, contraindications | DrugBank |
| emergency | Thai/English | Red flag symptoms, urgent referral | Thai CPR 2024 |

---

## Metadata Reference

### 🏥 Medical Specialties

- Internal Medicine (อายุรกรรม)
- Cardiology (หทัยวิทยา)
- Endocrinology (ต่อมไร้ท่อ)
- Nephrology (โรคไต)
- Gastroenterology (ทางเดินอาหาร)
- Pulmonology (โรคปอด)
- Neurology (ประสาทวิทยา)
- Dermatology (ผิวหนัง)
- Orthopedics (กระดูกและข้อ)
- Psychiatry (จิตเวช)

---

### 🏛️ ICD-10 Codes Used

| Code | Description (English) | Description (Thai) |
|------|----------------------|-------------------|
| E11.65 | T2DM with hyperglycemia | เบาหวานชนิด 2 น้ำตาลสูง |
| E11.22 | T2DM with CKD | เบาหวานชนิด 2 ร่วมโรคไต |
| I10 | Essential Hypertension | ความดันโลหิตสูง |
| I16.0 | Hypertensive Urgency | ความดันโลหิตสูงฉุกเฉิน |
| N18.3 | CKD Stage 3 | โรคไตเรื้อรังระยะ 3 |
| N18.4 | CKD Stage 4 | โรคไตเรื้อรังระยะ 4 |
| K21.0 | GERD with Esophagitis | กรดไหลย้อน |
| J06.9 | URI | ติดเชื้อทางเดินหายใจส่วนบน |
| M54.5 | Low Back Pain | ปวดหลังส่วนล่าง |
| R51 | Headache | ปวดศีรษะ |

---

### 💊 Drug Database

| Medication | Strength | Form | Renal Adjustment |
|------------|----------|------|------------------|
| Metformin | 500mg, 850mg, 1000mg | Tablet | Reduce if eGFR 30-45, Stop if <30 |
| Amlodipine | 5mg, 10mg | Tablet | No adjustment |
| Glipizide | 5mg, 10mg | Tablet | Use with caution in CKD |
| Lisinopril | 5mg, 10mg, 20mg | Tablet | Start low in CKD |
| Omeprazole | 20mg, 40mg | Capsule | No adjustment |
| Aspirin | 81mg, 325mg | Tablet | Caution in CKD |

---

## Meeting Time Rules

| Setting | Value | Description |
|---------|-------|-------------|
| **Doctor Join Window** | 15 min before | Doctor can join meeting 15 minutes before scheduled time |
| **Patient Join Window** | 30 min after | Patient must join within 30 minutes of start |
| **No-Show Threshold** | 15 min | Appointment marked as no-show after 15 minutes |
| **Auto-Reschedule** | Enabled | Missed appointments auto-reschedule to next week |
| **Lobby Control** | Doctor only | Only doctor can admit from lobby |
| **Recording** | Doctor consent | Stored to izara-doctors-data bucket |
| **Transcription** | Web Speech API | Client-side free transcription |

---

## PDPA & Consent

### 📜 PDPA Consent

| Consent ID | Patient | Status | Date |
|------------|---------|--------|------|
| CONSENT-SOMCHAI-001 | PATIENT-SOMCHAI | granted | 2026-01-10 |
| CONSENT-ANAN-001 | PATIENT-ANAN | granted | 2026-01-05 |

**Consent Types:**
- `data_collection` - Store health data
- `data_processing` - Use data for treatment
- `data_sharing` - Share with assigned doctors
- `ai_processing` - Allow AI to analyze data
- `marketing` - Receive health tips (optional)

---

### 📝 Living Will

| Document ID | Patient | Status | Shared with Doctors |
|-------------|---------|--------|---------------------|
| LW-001 | PATIENT-001 | registered | Yes (PDPA consent) |

---

## File Structure

```
scripts/output/
├── izara-users-credentials/
│   ├── users/
│   │   ├── index.json
│   │   ├── ADMIN-001.json
│   │   ├── DOC-001.json
│   │   ├── DOC-002.json
│   │   ├── DOC-003.json
│   │   ├── PATIENT-001.json
│   │   ├── PATIENT-SOMCHAI.json
│   │   └── PATIENT-ANAN.json
│   ├── admins/
│   └── doctors/
│
├── izara-patients-data/
│   ├── patients.json
│   └── users/
│       ├── PATIENT-001/
│       │   ├── phr.json
│       │   ├── living-will.json
│       │   ├── pdpa-consents.json
│       │   └── chat-sessions.json
│       ├── PATIENT-SOMCHAI/
│       │   └── phr.json
│       └── PATIENT-ANAN/
│           └── phr.json
│
├── izara-doctors-data/
│   ├── doctors.json
│   ├── profile/
│   │   ├── DOC-001.json
│   │   ├── DOC-002.json
│   │   └── DOC-003.json
│   ├── emrs/
│   │   ├── emrs.json
│   │   ├── EMR-SOMCHAI-001.json
│   │   └── EMR-ANAN-001.json
│   ├── prescriptions/
│   ├── lab-orders/
│   ├── imaging-orders/
│   ├── queue/
│   ├── ai-chat-history/
│   │   ├── sessions.json
│   │   ├── AI-CHAT-SESSION-001.json
│   │   ├── AI-CHAT-SESSION-002.json
│   │   └── AI-CHAT-SESSION-003.json
│   ├── cds-logs/
│   │   └── cds-logs.json
│   ├── document-analysis/
│   │   └── analyses.json
│   ├── patient-instructions/
│   │   ├── instructions.json
│   │   └── PI-ANAN-001.json
│   └── meeting-records/
│       ├── meeting-records.json
│       └── MEETING-RECORD-001.json
│
├── izara-appointments/
│   ├── appointments/
│   │   ├── appointments.json
│   │   └── appointments-phase1.json
│   └── results/
│
└── izara-meta-data/
    ├── medical-content.json
    ├── clinical-resources.json
    ├── health-education-articles.json
    ├── medications.json
    ├── icd10-codes.json
    ├── lab-tests.json
    ├── specialties.json
    ├── doctors.json
    ├── hospitals-facilities.json
    └── knowledge-base/
        └── knowledge-base.json
```

---

## Quick Start Commands

```powershell
# Generate all mock data
node scripts/generators/generateUnifiedDemoData.cjs
node scripts/generators/generatePhase1DemoData.cjs
node scripts/generators/generateContentData.cjs

# Run comprehensive tests
node scripts/tests/comprehensive-phase1-tests.cjs

# Run unit tests
node scripts/tests/unit/runAllUnitTests.cjs

# Start local development (includes data seeding)
.\scripts\start-local-dev.ps1

# Deploy with startup data
.\scripts\deploy-cloud-with-startup-data.ps1
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | Jan 20, 2026 | Phase 1 features, AI data, complex patients |
| 2.0.0 | Dec 8, 2024 | Initial structured mock data |
| 1.0.0 | Nov 2024 | Basic test users |

---

**This document is maintained as part of the Izara Telemedicine Platform Phase 1 development. For questions, contact the development team.**
