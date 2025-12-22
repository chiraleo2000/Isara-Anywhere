# IZARA TELEMEDICINE - 5-BUCKET ARCHITECTURE

## Overview
All data is organized into 5 Google Cloud Storage buckets with clear separation of concerns and proper relationships.

---

## 📊 BUCKET STRUCTURE (5 Columns)

```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│   BUCKET 1          │   BUCKET 2          │   BUCKET 3          │   BUCKET 4          │   BUCKET 5          │
│   CREDENTIALS       │   PATIENTS          │   DOCTORS           │   APPOINTMENTS      │   META-DATA         │
├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│                     │                     │                     │                     │                     │
│ 7 TABLES            │ 6 TABLES            │ 8 TABLES            │ 4 TABLES            │ 8 TABLES            │
│                     │                     │                     │                     │                     │
├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│                     │                     │                     │                     │                     │
│ ✓ users_auth        │ ✓ patient_profiles  │ ✓ doctor_profiles   │ ✓ appointments      │ ✓ medical_content   │
│ ✓ auth_sessions     │ ✓ medical_history   │ ✓ schedules         │ ✓ appointment_slots │ ✓ clinical_rsrc     │
│ ✓ user_roles        │ ✓ vital_signs       │ ✓ exceptions        │ ✓ calendar_events   │ ✓ drug_database     │
│ ✓ service_accounts  │ ✓ documents         │ ✓ emr_records       │ ✓ meet_sessions     │ ✓ icd10_codes       │
│ ✓ api_keys          │ ✓ medications       │ ✓ prescriptions     │                     │ ✓ system_config     │
│ ✓ oauth_tokens      │ ✓ lab_results       │ ✓ lab_orders        │                     │ ✓ notif_templates   │
│ ✓ calendar_sync     │                     │ ✓ imaging_orders    │                     │ ✓ audit_logs        │
│                     │                     │                     │                     │ ✓ gemini_ai         │
│                     │                     │                     │                     │                     │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## 🔗 TABLE RELATIONSHIPS

### BUCKET 1: izara-users-credentials (7 tables)
**Purpose**: Authentication, authorization, and API credentials

| # | Table | Relationships | Type |
|---|-------|---------------|------|
| 1 | **users_auth** | ROOT TABLE | Core |
| | | → patient_profiles [B2] | 1:1 |
| | | → doctor_profiles [B3] | 1:1 |
| | | → gemini_ai_interactions [B5] | 1:N |
| 2 | auth_sessions | → users_auth | N:1 |
| 3 | user_roles | → users_auth | 1:1 |
| 4 | oauth_tokens | → users_auth | N:1 |
| 5 | google_calendar_sync | → users_auth | N:1 |
| 6 | service_accounts | STANDALONE | Config |
| 7 | api_keys | STANDALONE | Config |

---

### BUCKET 2: izara-patients-data (6 tables)
**Purpose**: Patient health records and personal health information

| # | Table | Relationships | Type |
|---|-------|---------------|------|
| 1 | **patient_profiles** | ← users_auth [B1] | 1:1 |
| | | → medical_history | 1:1 |
| | | → vital_signs | 1:N |
| | | → documents | 1:N |
| | | → medications | 1:N |
| | | → lab_results | 1:N |
| | | → appointments [B4] | 1:N |
| | | → emr_records [B3] | 1:N |
| 2 | patient_medical_history | → patient_profiles | 1:1 |
| 3 | patient_vital_signs | → patient_profiles | N:1 |
| 4 | patient_documents | → patient_profiles | N:1 |
| 5 | patient_medications | → patient_profiles | N:1 |
| | | → doctor_profiles [B3] | N:1 |
| 6 | patient_lab_results | → patient_profiles | N:1 |
| | | → lab_orders [B3] | N:1 |

---

### BUCKET 3: izara-doctors-data (8 tables)
**Purpose**: Doctor profiles, EMR, prescriptions, and clinical orders

| # | Table | Relationships | Type |
|---|-------|---------------|------|
| 1 | **doctor_profiles** | ← users_auth [B1] | 1:1 |
| | | → schedules | 1:N |
| | | → exceptions | 1:N |
| | | → emr_records | 1:N |
| | | → prescriptions | 1:N |
| | | → lab_orders | 1:N |
| | | → imaging_orders | 1:N |
| | | → appointments [B4] | 1:N |
| | | → medical_content [B5] | 1:N |
| 2 | doctor_schedules | → doctor_profiles | N:1 |
| 3 | doctor_availability_exceptions | → doctor_profiles | N:1 |
| 4 | emr_records | → doctor_profiles | N:1 |
| | | → patient_profiles [B2] | N:1 |
| | | → appointments [B4] | 1:1 |
| 5 | prescriptions | → emr_records | N:1 |
| | | → doctor_profiles | N:1 |
| | | → patient_profiles [B2] | N:1 |
| | | → appointments [B4] | N:1 |
| 6 | lab_orders | → emr_records | N:1 |
| | | → doctor_profiles | N:1 |
| | | → patient_profiles [B2] | N:1 |
| 7 | imaging_orders | → emr_records | N:1 |
| | | → doctor_profiles | N:1 |
| | | → patient_profiles [B2] | N:1 |

---

### BUCKET 4: izara-appointments (4 tables)
**Purpose**: Appointment scheduling, calendar, and video meetings

| # | Table | Relationships | Type |
|---|-------|---------------|------|
| 1 | **appointments** | → patient_profiles [B2] | N:1 |
| | | → doctor_profiles [B3] | N:1 |
| | | → emr_records [B3] | 1:1 |
| | | → calendar_events | 1:1 |
| | | → meet_sessions | 1:1 |
| 2 | appointment_slots | → doctor_profiles [B3] | N:1 |
| | | → appointments | 1:1 |
| 3 | calendar_events | → appointments | 1:1 |
| 4 | google_meet_sessions | → appointments | 1:1 |

---

### BUCKET 5: izara-meta-data (8 tables)
**Purpose**: System configuration, reference data, and logging

| # | Table | Relationships | Type |
|---|-------|---------------|------|
| 1 | medical_content | → doctor_profiles [B3] | N:1 |
| 2 | clinical_resources | STANDALONE | Reference |
| 3 | drug_database | STANDALONE | Reference |
| 4 | icd10_codes | → icd10_codes (parent) | N:1 |
| 5 | system_config | STANDALONE | Config |
| 6 | notification_templates | STANDALONE | Config |
| 7 | audit_logs | STANDALONE | Logging |
| 8 | gemini_ai_interactions | → users_auth [B1] | N:1 |

---

## 📈 DATA FLOW PATTERNS

### 1. User Registration & Authentication
```
[B1] users_auth 
  └─> [B2] patient_profiles  OR  [B3] doctor_profiles
```

### 2. Appointment Booking
```
[B2] patient_profiles ─┐
                       ├─> [B4] appointments
[B3] doctor_profiles ──┘
                       └─> [B4] calendar_events, meet_sessions
```

### 3. Video Consultation
```
[B4] appointments 
  └─> [B3] emr_records 
       └─> [B3] prescriptions, lab_orders, imaging_orders
```

### 4. Prescription Flow
```
[B3] prescriptions 
  └─> [B2] patient_medications
```

### 5. Lab Results Flow
```
[B3] lab_orders 
  └─> [B2] patient_lab_results
```

### 6. Medical Content Authoring
```
[B3] doctor_profiles 
  └─> [B5] medical_content
```

### 7. AI Interactions
```
[B1] users_auth 
  └─> [B5] gemini_ai_interactions
```

---

## ✅ DESIGN PRINCIPLES

### 1. **Clear Separation of Concerns**
- Each bucket has a specific purpose
- No functional overlap between buckets

### 2. **All Tables Connected**
- Every table has at least one foreign key relationship
- Exception: Standalone reference/config tables (clearly marked)

### 3. **Cross-Bucket References**
- Users (B1) → Patients (B2) & Doctors (B3)
- Patients & Doctors → Appointments (B4)
- Appointments → EMR (B3)
- Doctors → Medical Content (B5)

### 4. **Data Integrity**
- Foreign key relationships enforce referential integrity
- Orphaned records are not possible

### 5. **Scalability**
- Bucket-level access control
- Independent scaling per bucket
- Clear data boundaries

---

## 🔒 SECURITY MODEL

| Bucket | Access Level | Who Can Access |
|--------|-------------|----------------|
| **B1: Credentials** | HIGHEST | System only, encrypted |
| **B2: Patients** | HIGH | Patient + authorized doctors |
| **B3: Doctors** | HIGH | Doctor + authorized patients (EMR sync) |
| **B4: Appointments** | MEDIUM | Patient + Doctor |
| **B5: Meta-data** | LOW-MEDIUM | Public (content) / System (config) |

---

## 📊 TABLE COUNT SUMMARY

| Bucket | Tables | Connected | Standalone | Total |
|--------|--------|-----------|------------|-------|
| B1: Credentials | 7 | 5 | 2 | 7 |
| B2: Patients | 6 | 6 | 0 | 6 |
| B3: Doctors | 8 | 8 | 0 | 8 |
| B4: Appointments | 4 | 4 | 0 | 4 |
| B5: Meta-data | 8 | 2 | 6 | 8 |
| **TOTAL** | **33** | **25** | **8** | **33** |

**Note**: Standalone tables are reference data (drug database, ICD-10 codes, etc.) or system configuration that don't need foreign keys but are essential for the system.

---

## 🎯 VALIDATION CHECKLIST

- ✅ 5 buckets clearly defined
- ✅ 33 tables organized by bucket
- ✅ All tables either connected OR standalone reference data
- ✅ Cross-bucket relationships documented
- ✅ Data flow patterns clear
- ✅ No orphaned tables
- ✅ Security model defined
- ✅ Scalability considerations
