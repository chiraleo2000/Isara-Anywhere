# 👥 Doctor Portal — Patient Management Page

**Route:** `/patients`, `/patients/:id`  
**Component:** `src/pages/PatientManagement.tsx`  
**Access:** 🔒 Doctor / Admin  
**Thai Title:** การจัดการผู้ป่วย / Patient Management

---

## 1. Purpose

View and manage patient list with search, filters, and PDPA consent management. Doctors see only their assigned patients; admins see all patients.

---

## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👥 การจัดการผู้ป่วย (Patient Management)                            │
│                                                                     │
│  🔍 [Search name, ID, email, phone...                       ]      │
│                                                                     │
│  Filters: [Gender ▼] [Risk Level ▼] [Age: min-max] [Consent ▼]    │
│                                                                     │
│  Health Records Tabs (from URL/Health Studio):                      │
│  [ทั้งหมด] [วินิจฉัย] [การรักษา] [เวชระเบียน] [รังสี] [แล็บ] [พยาธิ] │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                           │
│  │ นายสมชาย │ │ นายอานันท์ │ │ นางสมศรี  │                           │
│  │ 65, Male │ │ 45, Male │ │ 55, Fem  │                           │
│  │ 🟢 Consent│ │ 🔴 No    │ │ 🟡 Partial│                           │
│  │ [ดู] [EMR]│ │ [ดู]     │ │ [ดู] [EMR]│                           │
│  └──────────┘ └──────────┘ └──────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Features

| Feature | Description |
| ------- | ----------- |
| **Search** | Name, ID, email, phone search |
| **Gender filter** | Male / Female / All |
| **Risk level filter** | High / Medium / Low |
| **Age range filter** | Min and max age |
| **Consent filter** | Consented / Not consented |
| **PDPA consent badge** | Green (full), Yellow (partial), Red (none) |
| **Consent dialog** | View data types allowed, expiration, request consent |
| **Category tabs** | Filter by health record category (from Health Studio) |
| **Responsive grid** | 1-col mobile, 2-col tablet, 3-col desktop |

### Access Control

| Role | Patient Visibility |
| ---- | ------------------ |
| Doctor | Only patients with appointments assigned to this doctor |
| Admin | All patients in the system |

---

## 4. PDPA Consent Management

### Consent Badge Colors

| Color | Status | Description |
| ----- | ------ | ----------- |
| 🟢 Green | Full consent | Patient shared all health data |
| 🟡 Yellow | Partial | Some data types consented |
| 🔴 Red | None | No consent given |

### Consent Dialog

```text
┌── PDPA Consent ─────────────────────────┐
│  Patient: นายสมชาย มั่นคง                │
│                                          │
│  Allowed Data Types:                     │
│  ✅ Vital Signs                          │
│  ✅ Medications                          │
│  ✅ Allergies                            │
│  ❌ Lifestyle Data                       │
│                                          │
│  Consent Expiry: 21 ม.ค. 2570           │
│                                          │
│  [ขอความยินยอม (Request Consent)]        │
└──────────────────────────────────────────┘
```

---

## 5. Workflows

### Workflow 1: Search for Patient

```text
Step 1: Navigate to /patients
Step 2: GET /api/patients (filtered by role)
Step 3: Type in search box → filters in real-time
Step 4: Apply additional filters (gender, risk, age, consent)
Step 5: Click patient card → Opens PatientRecordViewer modal
```

### Workflow 2: View Patient Records

```text
Step 1: Click "ดู" (View) on patient card
Step 2: GET /api/patients/:id with PDPA consent check
Step 3: PatientRecordViewer modal opens with PHR/EMR/EHR tabs
Step 4: View patient data according to consent level
```

### Workflow 3: Request PDPA Consent

```text
Step 1: Click consent badge on patient card
Step 2: ConsentDialog opens showing current permissions
Step 3: Click "ขอความยินยอม" (Request Consent)
Step 4: System sends consent request to patient
Step 5: Patient receives notification to grant/deny
```

---

## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/patients` | List patients (role-filtered) |
| GET | `/api/patients/:id` | Get patient details |
| GET | `/api/patients/:id/consent` | Check PDPA consent status |
| POST | `/api/patients/:id/consent/request` | Request data consent |

---

## 7. AI Agent Improvement Opportunities

- **Risk stratification**: AI auto-classify patient risk levels
- **Smart search**: AI understand natural language patient queries
- **Patient matching**: AI suggest patients needing follow-up
- **Consent automation**: AI manage consent expiry and renewals
