# Izara Telemedicine Platform - Database Schema Documentation

**Version:** 3.0.0  
**Last Updated:** December 2025  
**Storage:** Google Cloud Storage (JSON Documents)

---

## Project Overview

Izara Telemedicine Platform is a comprehensive healthcare system for remote medical services.

### System Components
- **Patient Portal**: Self-service portal for patients to book appointments, manage health records
- **Doctor Portal**: Clinical portal for doctors to manage appointments, create EMR, prescribe medications

### Architecture
- **Storage**: Google Cloud Storage (GCS)
- **Format**: JSON Documents
- **Region**: asia-southeast1 (Singapore)
- **Authentication**: bcrypt (Doctor Portal), Base64 (Patient Portal)
- **Video Meetings**: Jitsi Meet (meet.jit.si)

---

## 5-Bucket Architecture

### Bucket 1: izara-users-credentials
**Purpose**: Authentication & User Identity for BOTH Patient Portal and Doctor Portal

**Tables:**
- `users_auth` - Main authentication records
- `users_index` - Quick lookup index for Doctor Portal user management
- `auth_sessions` - Session management (both portals)
- `user_roles` - Role-based access control
- `service_accounts` - Google API service credentials (EXTERNAL)
- `api_keys` - Google API keys (EXTERNAL)
- `oauth_tokens` - OAuth tokens for Google services
- `google_calendar_sync` - Calendar synchronization status
- `password_reset_tokens` - Password reset functionality

**Key Points:**
- NO clinical data stored here
- Identity and authentication only
- Used by BOTH portals

### Bucket 2: izara-patients-data
**Purpose**: Patient Personal Health Records (PHR) - Self-Entered Data

**Tables:**
- `patient_profiles` - Basic patient information from registration
- `patient_phr` - Personal Health Record (patient-entered via PHRPage.tsx)
- `patient_vital_signs` - Vital signs history (patient-entered)
- `patient_health_logs` - EMR summaries sent FROM Doctor Portal TO patient
- `patient_documents` - Personal document uploads
- `patient_consents` - PDPA and consent records

**Key Points:**
- Contains patient-entered PHR data
- NO EMR data (EMR is in BUCKET 4)
- Receives health logs (EMR summaries) from doctors
- Patients can READ/WRITE their own PHR
- Doctors can READ patient PHR via PatientRecordViewer.tsx

### Bucket 3: izara-doctors-data
**Purpose**: Doctor Profiles, Availability & Meeting Recordings

**Tables:**
- `doctor_profiles` - Professional information and credentials
- `doctor_schedules` - Weekly availability schedules
- `doctor_availability_exceptions` - Holidays and special blocks
- `doctor_meeting_recordings` - Video consultation recordings and transcripts

**Key Points:**
- NO clinical data (EMR/prescriptions are in BUCKET 4)
- Profile and scheduling only
- Meeting recordings stored here
- Transcripts and AI summaries linked to EMR in BUCKET 4

### Bucket 4: izara-appointments
**Purpose**: ALL Appointment & Clinical Data (Complete Episode of Care)

**Tables:**
- `appointments` - Main appointment records (BOTH portals read/write)
- `appointment_pool` - System-assigned appointments awaiting doctor
- `appointment_meeting_links` - Jitsi Meet links
- `emr_records` - Electronic Medical Records (Thai OPD Card format)
- `prescriptions` - E-prescriptions
- `lab_orders` - Laboratory test orders
- `lab_results` - Laboratory test results

**Key Points:**
- **CENTRAL HUB** for all clinical data
- Episode-centric design (all clinical data linked to appointments)
- BOTH portals read from same files (appointments.json)
- When EMR is signed, summary sent to BUCKET 2 (patient_health_logs)

### Bucket 5: izara-meta-data
**Purpose**: Reference Data, System Configuration & Notifications

**Tables:**
- `medical_content` - Health articles, videos, FAQs
- `clinical_resources` - Guidelines, protocols, drug information
- `drug_database` - Complete drug reference with Thai TMT codes
- `icd10_codes` - ICD-10 diagnosis codes
- `system_config` - System configuration
- `notification_templates` - Notification message templates
- `notification_queue` - Notification delivery tracking
- `audit_logs` - System audit logs
- `system_metrics` - Performance metrics
- `feature_flags` - Feature toggle management

**Key Points:**
- Mostly READ-ONLY reference data
- NO patient-specific data
- Used by BOTH portals

---

## Key Data Flow Rules

### 1. Patient Registration
1. Auth created in BUCKET 1 (`users_auth`)
2. Profile created in BUCKET 2 (`patient_profiles`)

### 2. Doctor Registration
1. Auth created in BUCKET 1 (`users_auth`) with `approval_status`
2. Profile created in BUCKET 3 (`doctor_profiles`)
3. Admin approves via Doctor Portal

### 3. PHR Data (Patient-Entered)
- Patient enters vitals, allergies, medications → BUCKET 2
- Stored in: `patient_phr`, `patient_vital_signs`
- Doctors can READ via PatientRecordViewer.tsx

### 4. Appointment Booking
1. Patient books appointment via Patient Portal
2. Appointment saved to BUCKET 4
3. Files written:
   - `appointments.json` (master list - BOTH portals read)
   - `appointments/{id}.json` (individual record)
4. Status: `pending` → awaiting doctor

### 5. EMR Creation (Doctor)
1. Doctor creates EMR during consultation → BUCKET 4 (`emr_records`)
2. EMR follows Thai OPD Card format (SOAP notes)
3. When signed:
   - AI summary generated if not present
   - Patient-safe summary sent to BUCKET 2 (`patient_health_logs`)
   - Private notes excluded from patient view
4. Patient views filtered summary in Treatment Results

### 6. Prescriptions
1. Doctor creates prescription via CompletePrescribing.tsx
2. Saved to BUCKET 4 (`prescriptions`)
3. Copy sent to BUCKET 2 (`patient_health_logs`) for patient viewing
4. Patient can view in Treatment Results

### 7. Meeting Recordings
1. Video consultations recorded via Jitsi Meet
2. Files saved to BUCKET 3 (`doctor_meeting_recordings`):
   - `recording.webm` (video file, max 200MB)
   - `transcript.txt` (Thai transcription via Speech-to-Text)
   - `summary.txt` (AI-generated SOAP summary via Gemini)
   - `recommendations.txt` (Clinical decision support)
3. Transcripts/summaries linked to EMR in BUCKET 4

---

## File Path Patterns

### BUCKET 1: izara-users-credentials/
```
users/{userId}.json
users/index.json
sessions/{sessionToken}.json
oauth/{uid}/{provider}.json
calendar-sync/{user_id}.json
password-reset/{tokenId}.json
service-accounts/{account_id}.json
api-keys/{key_id}.json
```

### BUCKET 2: izara-patients-data/
```
patients/{patientId}/
├── profile.json
├── phr.json
├── vital-signs.json
├── health-logs.json      ← EMR summaries FROM doctor
├── documents/{documentId}/
└── consents/{consentId}.json
```

### BUCKET 3: izara-doctors-data/
```
doctors/{doctorId}/
├── profile.json (or doctors/{doctorId}.json)
├── schedules.json
├── exceptions/{exceptionId}.json
└── meetings/{appointmentId}/
    ├── recording.webm
    ├── transcript.txt
    ├── summary.txt
    └── recommendations.txt
```

### BUCKET 4: izara-appointments/
```
appointments.json              ← Master list (BOTH portals read)
appointments/{appointmentId}.json
appointments/{appointmentId}/
├── details.json               ← Legacy
├── meeting-link.json
├── emr.json
├── prescriptions.json
├── lab-orders.json
└── lab-results.json
pool/pending.json
```

### BUCKET 5: izara-meta-data/
```
medical-content/{contentType}/{contentId}.json
clinical-resources/{resourceType}/{resourceId}.json
drug-database/{drugId}.json
icd-codes/{chapter}/{code}.json
config/{category}/{configKey}.json
notifications/
├── templates/{templateId}.json
└── queue/{notificationId}.json
audit-logs/{YYYY}/{MM}/{DD}/{logId}.json
metrics/{YYYY-MM-DD}/{metricId}.json
```

---

## Table-Specific Documentation

### BUCKET 1: Users & Authentication

#### users_auth
- **UID Format**: `user_xxxx` (Patient), `DOC-xxxx` (Doctor)
- **Password Hashing**: Base64 (Patient Portal legacy), bcrypt (Doctor Portal)
- **Role Values**: `patient`, `doctor`, `admin`
- **Approval Flow**: Doctor accounts require approval (`approval_status`: pending → approved/rejected)

#### auth_sessions
- **Session Token**: 64 hex characters
- **Used By**: Both Patient and Doctor portals
- **Expiry**: Configurable per portal
- **Logout**: Set `is_valid = false`, record `logged_out_at`

#### user_roles
- **Portal Access**: `["patient-portal"]` or `["doctor-portal"]`
- **Admin Privileges** (Doctor Portal only):
  - `canManageDoctors`, `canManagePatients`, `canManageAppointments`
  - `canViewAnalytics`, `canManageSettings`, `canAssignRoles`
  - Admin level: `super_admin`, `admin`, `moderator`

### BUCKET 2: Patient Health Records

#### patient_phr
- **Version**: 2.0.0
- **Used By**: PHRPage.tsx (Patient Portal), PatientRecordViewer.tsx (Doctor Portal)
- **Editable By**: Patient
- **Contains**: Vitals, allergies, chronic conditions, current medications, vaccinations, lifestyle data

#### patient_health_logs
- **Source**: EMR summaries from Doctor Portal
- **Type Values**: `emr_record`, `prescription`
- **Patient-Safe**: NO internal doctor notes, NO ICD-10 codes (only descriptions)
- **Used By**: TreatmentResults.tsx, LatestAppointmentResult.tsx, HealthStudio.tsx

### BUCKET 3: Doctor Profiles & Schedules

#### doctor_profiles
- **Doctor ID Format**: `DOC-TIMESTAMP-RANDOM` or `DOC-DEMO-xxx`
- **Medical License**: Thai medical license number (MD-123456)
- **Specialty**: Primary specialty + subspecialties array
- **Status Values**: `active`, `inactive`, `suspended`

#### doctor_schedules
- **Day of Week**: 0=Sunday, 6=Saturday
- **Slot Configuration**: Duration (default 30 min), buffer time (default 5 min)
- **Consultation Type**: `video`, `in-person`, `both`

#### doctor_meeting_recordings
- **Max Recording Size**: 200MB
- **File Types**: .webm (video), .txt (transcript/summary/recommendations)
- **AI Processing**: Gemini generates SOAP summary and clinical recommendations

### BUCKET 4: Appointments & Clinical Data

#### appointments
- **Booking Reference Format**: `APT-YYYYMMDD-XXXX`
- **Status Workflow**:
  ```
  pending/in_pool → awaiting_doctor_response → assigned → confirmed → 
  scheduled → in-progress → completed
  
  Or:
  pending → cancelled/declined
  confirmed → no-show/rescheduled
  ```
- **Consultation Mode**: `online` (telemedicine), `onsite` (in-person)
- **Meeting Platform**: Jitsi Meet
- **Room Name Format**: `Izara-{appointmentId}-{hash}`

#### emr_records
- **Format**: Thai OPD Card (มาตรฐานกระทรวงสาธารณสุข)
- **Structure**: SOAP Notes
  - **S (Subjective)**: ประวัติ - History of present illness, symptoms
  - **O (Objective)**: ตรวจร่างกาย - Vital signs, physical examination
  - **A (Assessment)**: การวินิจฉัย - Diagnoses with ICD-10 codes
  - **P (Plan)**: การรักษา - Treatment plan, medications, follow-up
- **Status Values**: `draft`, `in-progress`, `completed`, `signed`, `amended`
- **Created By**: CompleteEMREditor.tsx
- **AI Integration**: Gemini generates patient-friendly summary
- **When Signed**: Summary sent to BUCKET 2 (`patient_health_logs`)

#### prescriptions
- **RX Number Format**: `RX-YYYYMMDD-XXXX`
- **Created By**: CompletePrescribing.tsx
- **Safety Checks**: Allergy checking, drug-drug interactions, dose validation
- **Status Values**: `draft`, `active`, `dispensed`, `partially-dispensed`, `expired`, `cancelled`

#### lab_orders & lab_results
- **Order Number Format**: `LAB-YYYYMMDD-XXXX`
- **Priority Levels**: `stat`, `urgent`, `routine`
- **Abnormal Flags**: N (Normal), L (Low), H (High), LL, HH, A (Abnormal)

### BUCKET 5: Reference Data

#### drug_database
- **TMT Code**: Thai Medicines Terminology (primary identifier)
- **ATC Code**: Anatomical Therapeutic Chemical Classification
- **Controlled Substances**: Schedule tracking for controlled drugs

#### icd10_codes
- **Structure**: Hierarchical (chapter → block → code)
- **Billable Flag**: Indicates if code can be used for billing
- **Self-Referencing**: `parent_code` creates hierarchy

---

## Important Implementation Notes

### 1. Appointment Data Synchronization
- **Master File**: `appointments.json` contains ALL appointments
- **Individual Files**: `appointments/{id}.json` for detailed records
- **Both Portals**: Read from appointments.json AND individual files
- **Write Strategy**: Doctor portal writes to BOTH when confirming

### 2. Doctor ID Handling
- Some doctors may have `userId = undefined`
- Use `email` as fallback identifier for matching
- Match logic: Check `confirmed_by`, `confirmed_by_email`, `admin_assigned_doctor_id`

### 3. Health Logs vs EMR
- **EMR (BUCKET 4)**: Full clinical record, doctor-facing, includes private notes
- **Health Logs (BUCKET 2)**: Filtered copy for patient viewing
- **Exclusions in Health Logs**: Internal notes, ICD-10 codes (show descriptions only)

### 4. Video Meeting Configuration
- **Provider**: Jitsi Meet (FREE, no API key required)
- **Domain**: meet.jit.si
- **Room Format**: `Izara-{appointmentId}-{hash}`
- **Features**: Recording, screen sharing, Thai language support

### 5. Authentication Methods
- **Patient Portal**: Base64 password encoding (legacy), direct GCS storage
- **Doctor Portal**: bcrypt password hashing, session management, OWASP security
- **NO Firebase**: Despite old documentation, Firebase is NOT used

### 6. PDPA Compliance
- All patient consents tracked in `patient_consents`
- Required consent types: `pdpa`, `data-sharing`, `telemedicine`, `marketing`, `research`
- IP address and timestamp logged for audit trail

---

## Data Access Patterns

### Patient Portal
**Can Access:**
- Own profile (BUCKET 2: `patient_profiles`)
- Own PHR (BUCKET 2: `patient_phr`, `patient_vital_signs`)
- Own appointments (BUCKET 4: `appointments`)
- Own health logs (BUCKET 2: `patient_health_logs`)
- Medical content (BUCKET 5: `medical_content`)

**Cannot Access:**
- Other patients' data
- Raw EMR records (only summaries)
- Doctor private notes
- System configuration

### Doctor Portal
**Can Access:**
- Own profile (BUCKET 3: `doctor_profiles`)
- Own schedule (BUCKET 3: `doctor_schedules`)
- Assigned appointments (BUCKET 4: `appointments`)
- Patient PHR (READ-ONLY from BUCKET 2)
- Create/edit EMR (BUCKET 4: `emr_records`)
- Create prescriptions (BUCKET 4: `prescriptions`)
- Clinical resources (BUCKET 5)
- Drug database (BUCKET 5)

**Admin Can Access:**
- All doctor profiles
- All appointments (assign, confirm, manage)
- User management (approve doctors)
- System configuration

---

## Visual Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    IZARA TELEMEDICINE DATA ARCHITECTURE                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│  BUCKET 1           │  BUCKET 2           │  BUCKET 3           │  BUCKET 4           │  BUCKET 5           │
│  CREDENTIALS        │  PATIENTS PHR       │  DOCTORS PROFILE    │  APPOINTMENTS       │  META-DATA          │
│  izara-users-creds  │  izara-patients-data│  izara-doctors-data │  izara-appointments │  izara-meta-data    │
├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│ BOTH Portals        │ Patient Portal      │ Doctor Portal       │ BOTH Portals        │ BOTH Portals        │
│ Auth & Identity     │ Patient-Entered     │ Doctor Profiles     │ Episode-Centric     │ Reference Data      │
├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│                     │                     │                     │                     │                     │
│ users_auth          │ patient_profiles    │ doctor_profiles     │ appointments        │ medical_content     │
│ users_index         │ patient_phr         │ doctor_schedules    │   └─meeting_links   │ clinical_resources  │
│ auth_sessions       │ patient_vital_signs │ doctor_exceptions   │   └─emr_records     │ drug_database       │
│ user_roles          │ patient_health_logs │ meeting_recordings  │   └─prescriptions   │ icd10_codes         │
│ service_accounts    │ patient_documents   │                     │   └─lab_orders      │ system_config       │
│ api_keys            │ patient_consents    │                     │   └─lab_results     │ notification_tmpl   │
│ oauth_tokens        │                     │                     │ appointment_pool    │ notification_queue  │
│ calendar_sync       │                     │                     │                     │ audit_logs          │
│ password_reset      │                     │                     │                     │ system_metrics      │
│                     │                     │                     │                     │ feature_flags       │
├─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│ NO CLINICAL DATA    │ NO EMR DATA         │ NO CLINICAL DATA    │ ALL CLINICAL DATA   │ NO PATIENT DATA     │
│ Identity only       │ Patient-entered PHR │ Profile & Schedule  │ Complete episodes   │ Reference only      │
│                     │ + Health Logs (copy)│ + Meeting records   │                     │                     │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## Relationships Summary

### Primary Relationships

**users_auth (BUCKET 1)** connects to:
- `patient_profiles.uid` (BUCKET 2)
- `doctor_profiles.uid` (BUCKET 3)
- `auth_sessions.uid` (BUCKET 1)
- `user_roles.uid` (BUCKET 1)
- `oauth_tokens.uid` (BUCKET 1)

**patient_profiles (BUCKET 2)** connects to:
- `patient_phr.patient_id` (BUCKET 2)
- `patient_vital_signs.patient_id` (BUCKET 2)
- `patient_health_logs.patient_id` (BUCKET 2)
- `patient_documents.patient_id` (BUCKET 2)
- `patient_consents.patient_id` (BUCKET 2)

**doctor_profiles (BUCKET 3)** connects to:
- `doctor_schedules.doctor_id` (BUCKET 3)
- `doctor_availability_exceptions.doctor_id` (BUCKET 3)
- `doctor_meeting_recordings.doctor_id` (BUCKET 3)

**appointments (BUCKET 4)** connects to:
- `appointment_pool.appointment_id` (BUCKET 4)
- `appointment_meeting_links.appointment_id` (BUCKET 4)
- `emr_records.appointment_id` (BUCKET 4)
- `prescriptions.appointment_id` (BUCKET 4)
- `lab_orders.appointment_id` (BUCKET 4)

**emr_records (BUCKET 4)** connects to:
- `prescriptions.emr_id` (BUCKET 4)
- `lab_orders.emr_id` (BUCKET 4)

**lab_orders (BUCKET 4)** connects to:
- `lab_results.order_id` (BUCKET 4)

**Reference Tables (BUCKET 5):**
- `icd10_codes` self-references via `parent_code`
- `notification_templates` connects to `notification_queue.template_id`

---

## Version History

### Version 3.0.0 (December 2025)
- Complete restructure to 5-bucket architecture
- Removed orphaned tables (15+ tables)
- Added 7 new tables matching actual implementation
- Updated to match actual Patient Portal and Doctor Portal code
- Removed Firebase references (not used)
- Added comprehensive documentation
- Episode-centric design for clinical data

### Version 2.0.0 (Previous)
- Initial bucket structure
- Basic table definitions
- Some orphaned tables not connected to buckets

---

## Maintenance Guidelines

### Adding New Tables
1. Identify which bucket the table belongs to
2. Ensure proper foreign key relationships
3. Add to appropriate bucket section in DBML
4. Update this documentation
5. Update file path patterns

### Modifying Existing Tables
1. Check impact on both Patient and Doctor portals
2. Update related documentation
3. Maintain backward compatibility where possible
4. Update version number if breaking changes

### Deprecating Tables
1. Mark as deprecated in comments
2. Provide migration path
3. Keep in schema for 1 version
4. Remove in subsequent version

---

## Support & Contact

For questions about the schema or implementation:
1. Review this documentation
2. Check actual implementation in portal codebases
3. Refer to process documents in `/Processes/` folder
4. Contact development team
