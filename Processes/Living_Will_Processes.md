# 📝 Living Will Process in Izara Telemedicine

**Version:** 1.5.9  
**Last Updated:** March 15, 2026  
**Status:** ✅ PostgreSQL Implementation

---

## 1. Overview

A **Living Will** (พินัยกรรมชีวิต) is a legal document that allows a patient to specify their wishes regarding medical treatment in situations where they may be unable to communicate. In Izara Telemedicine, the Living Will is part of the patient's Personal Health Record (PHR) and includes **PDPA consent controls** for sharing with healthcare providers.

### Key Features

- ✅ Patient creates and manages their Living Will
- ✅ PDPA-compliant sharing controls (public to all authorized doctors OR private)
- ✅ If shared, visible to ALL doctors with patient history AND admin users
- ✅ Displayed prominently in PHR tab of Patient Record Viewer (Doctor Portal)
- ✅ Full audit trail of access and modifications

### Implementation Status

- ✅ **Patient Portal:** API routes implemented in `server/routes/phr.ts`
- ✅ **Doctor Portal:** API endpoint in `server/mainApiServer.cjs`
- ✅ **Types:** Defined in `Isara-patient-portal/src/types/sharedPHRTypes.ts`
- ✅ **Service:** `getLivingWill()` method in `patientRecordService.ts`
- ✅ **UI:** `LivingWillCard` component in `PatientRecordViewer.tsx`

---

## 2. User Roles & Access Matrix

| Role | Create | View | Update | Delete | Share Settings |
| ---------------- | -------- | ------ | -------- | -------- | ---------------- |
| Patient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Doctor | ❌ | ✅* | ❌ | ❌ | ❌ |
| Admin (Doctor) | ❌ | ✅* | ❌ | ❌ | ❌ |

### ✅* = Only if patient has shared Living Will (PDPA consent granted)

### Doctor/Admin Access Rules

1. **If `isSharedWithDoctors: true`** → All doctors AND admins with ANY history/logs with the patient can view
2. **If `isSharedWithDoctors: false`** → Living Will is hidden (private)
3. Access is logged for audit compliance

---

## 3. Data Structure

### 3.1. Living Will Metadata

**Storage Path:** `patients/{patientId}/living-will.json`

```json
{
  "id": "living-will_{patientId}",
  "patientId": "PATIENT-001",
  "version": "1.0",

  "status": "active",
  "createdAt": "2025-12-12T10:00:00Z",
  "updatedAt": "2025-12-12T10:00:00Z",
  "effectiveDate": "2025-12-12",
  "revokedAt": null,

  "statement": "ข้าพเจ้าประสงค์ที่จะไม่รับการรักษาที่ยืดชีวิตหากอยู่ในภาวะที่ไม่มีทางหายขาด...",

  "treatments": {
    "resuscitation": {
      "allowed": false,
      "notes": "ไม่ต้องการ CPR"
    },
    "mechanicalVentilation": {
      "allowed": false,
      "notes": "ไม่ต้องการเครื่องช่วยหายใจ"
    },
    "artificialNutrition": {
      "allowed": false,
      "notes": "ไม่ต้องการให้อาหารทางสาย"
    },
    "dialysis": {
      "allowed": false,
      "notes": "ไม่ต้องการฟอกไต"
    },
    "antibiotics": {
      "allowed": true,
      "notes": "อนุญาตให้ใช้ยาปฏิชีวนะเพื่อความสะดวกสบาย"
    },
    "painManagement": {
      "allowed": true,
      "notes": "ต้องการการจัดการความเจ็บปวดอย่างเต็มที่"
    },
    "other": "ต้องการการดูแลแบบประคับประคองเท่านั้น"
  },

  "representative": {
    "name": "นางสาวสมหญิง ใจดี",
    "relationship": "spouse",
    "phone": "081-234-5678",
    "email": "somying@example.com",
    "nationalId": "1234567890123",
    "isPrimary": true
  },

  "alternativeRepresentative": {
    "name": "นายสมชาย ใจดี",
    "relationship": "child",
    "phone": "089-876-5432",
    "email": "somchai@example.com"
  },

  "signature": {
    "patientSignature": "base64_encoded_signature_image",
    "signedAt": "2025-12-12T10:00:00Z",
    "witnessName": "นายแพทย์ วิชัย หมอดี",
    "witnessSignature": "base64_encoded_witness_signature"
  },

  "pdpaConsent": {
    "isSharedWithDoctors": true,
    "shareScope": "all_authorized",
    "consentGrantedAt": "2025-12-12T10:00:00Z",
    "consentVersion": "2.0",
    "shareHistory": [
      {
        "action": "shared",
        "timestamp": "2025-12-12T10:00:00Z",
        "scope": "all_authorized"
      }
    ]
  },

  "auditLog": [
    {
      "action": "created",
      "timestamp": "2025-12-12T10:00:00Z",
      "userId": "PATIENT-001",
      "userRole": "patient"
    },
    {
      "action": "shared",
      "timestamp": "2025-12-12T10:00:00Z",
      "userId": "PATIENT-001",
      "userRole": "patient",
      "details": "Shared with all authorized doctors"
    }
  ]
}
```

---

## 4. Patient Portal Workflow

### 4.1. Page & Navigation

- **Page:** `src/pages/health/PHRPage.tsx`
- **Tab:** "Living Will" / "พินัยกรรมชีวิต"
- **Component:** `src/components/health/LivingWillForm.tsx`

### 4.2. Step-by-Step Process

#### Step 1: Access Living Will Tab

1. Patient logs into Patient Portal
2. Navigates to **Health Studio** → **PHR** → **Living Will** tab
3. If no Living Will exists, shows "Create Living Will" button
4. If Living Will exists, shows current document with Edit/Revoke options

#### Step 2: Create/Edit Living Will

1. Patient clicks "Create Living Will" or "Edit"
2. Form displays with sections:
   - **Statement of Wishes** (free text)
   - **Treatment Preferences** (checkboxes with notes)
   - **Legal Representative** (contact details)
   - **Alternative Representative** (optional)

#### Step 3: PDPA Consent & Sharing Settings

1. Patient must accept PDPA consent checkbox
2. Patient chooses sharing preference:
   - **🔒 Keep Private** - Only patient can view
   - **🌐 Share with Doctors** - All authorized doctors & admins can view
3. System explains: "If you share, ALL doctors who have treated you and hospital administrators will be able to see your Living Will"

#### Step 4: Digital Signature

1. Patient signs digitally (canvas signature)
2. Optional: Witness signature
3. System records timestamp and IP

#### Step 5: Save & Confirm

1. Patient reviews summary
2. Clicks "Save Living Will"
3. System stores to GCS: `patients/{patientId}/living-will.json`
4. Confirmation message with share status displayed

### 4.3. UI Mockup (Patient Portal)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  📋 PHR  │  💊 Medications  │  🩺 Vitals  │  📜 Living Will          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📜 พินัยกรรมชีวิต (Living Will)                                     │
│  ─────────────────────────────────────────────────                   │
│                                                                      │
│  Status: ● ACTIVE                    Effective: 12/12/2025           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ คำแถลงความประสงค์:                                              │ │
│  │ ข้าพเจ้าประสงค์ที่จะไม่รับการรักษาที่ยืดชีวิต...                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  การรักษาที่ไม่ประสงค์:                                              │
│  ❌ CPR / การกู้ชีพ                                                  │
│  ❌ เครื่องช่วยหายใจ                                                 │
│  ❌ ให้อาหารทางสาย                                                   │
│  ❌ ฟอกไต                                                           │
│  ✅ ยาปฏิชีวนะ (เพื่อความสบาย)                                       │
│  ✅ การจัดการความเจ็บปวด                                             │
│                                                                      │
│  ผู้แทนทางกฎหมาย: นางสาวสมหญิง ใจดี (คู่สมรส)                         │
│  โทร: 081-234-5678                                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 🔐 PDPA Sharing Settings                                        │ │
│  │                                                                 │ │
│  │ ◉ Share with Doctors - แพทย์และผู้ดูแลระบบสามารถดูได้           │ │
│  │ ○ Keep Private - เฉพาะคุณเท่านั้นที่เห็น                        │ │
│  │                                                                 │ │
│  │ ℹ️ หากแชร์ แพทย์ทุกคนที่เคยรักษาคุณและผู้ดูแลระบบจะเห็น          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [✏️ Edit]  [🗑️ Revoke]  [📤 Share Settings]                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Doctor Portal Workflow

### 5.1. Page & Navigation

- **Page:** `src/components/PatientRecordViewer.tsx`
- **Tab:** "Personal Health Record (PHR)"
- **Section:** Living Will Card (prominent display)

### 5.2. Access Control Logic

```typescript
// Doctor Portal - Check Living Will Access
async function canViewLivingWill(doctorId: string, patientId: string): Promise<boolean> {
  // 1. Load Living Will
  const livingWill = await loadLivingWill(patientId);

  if (!livingWill || livingWill.status === 'revoked') {
    return false;
  }

  // 2. Check PDPA sharing consent
  if (!livingWill.pdpaConsent.isSharedWithDoctors) {
    return false; // Private - not shared
  }

  // 3. Verify doctor has history with patient
  const hasHistory = await checkDoctorPatientHistory(doctorId, patientId);

  // 4. Or check if doctor is admin
  const isAdmin = await checkDoctorIsAdmin(doctorId);

  return hasHistory || isAdmin;
}

async function checkDoctorPatientHistory(doctorId: string, patientId: string): Promise<boolean> {
  // Check appointments, EMR records, or health logs
  const appointments = await getAppointments(patientId);
  const hasAppointment = appointments.some(apt => apt.doctorId === doctorId);

  const emrRecords = await getEMRRecords(patientId);
  const hasEMR = emrRecords.some(emr => emr.doctorId === doctorId);

  const healthLogs = await getHealthLogs(patientId);
  const hasHealthLog = healthLogs.some(log => log.doctorId === doctorId);

  return hasAppointment || hasEMR || hasHealthLog;
}
```

### 5.3. Display in PHR Tab

When a doctor views a patient's PHR, the Living Will section should appear at the TOP of the page:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Patient Record - นายสมชาย ใจดี                              [X]    │
├─────────────────┬────────────────────┬───────────────────────────────┤
│ PHR (Selected)  │ Electronic Medical │ Electronic Health Record      │
├─────────────────┴────────────────────┴───────────────────────────────┤
│                                                                      │
│  ⚠️ LIVING WILL ON FILE (พินัยกรรมชีวิต)                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Status: ● ACTIVE        Effective: 12 Dec 2025                │ │
│  │                                                                 │ │
│  │  Statement:                                                     │ │
│  │  "ข้าพเจ้าประสงค์ที่จะไม่รับการรักษาที่ยืดชีวิต..."              │ │
│  │                                                                 │ │
│  │  ❌ Treatments REFUSED:                                         │ │
│  │     • CPR/Resuscitation                                        │ │
│  │     • Mechanical Ventilation                                   │ │
│  │     • Artificial Nutrition (Tube Feeding)                      │ │
│  │     • Dialysis                                                 │ │
│  │                                                                 │ │
│  │  ✅ Treatments ALLOWED:                                         │ │
│  │     • Antibiotics (for comfort)                                │ │
│  │     • Pain Management                                          │ │
│  │                                                                 │ │
│  │  📞 Representative: นางสาวสมหญิง ใจดี (Spouse)                   │ │
│  │     Phone: 081-234-5678                                        │ │
│  │                                                                 │ │
│  │  ✍️ Signed: 12 Dec 2025 10:00 AM                                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Patient Demographics                                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Name: นายสมชาย ใจดี     Age: 65 years    Sex: Male            │ │
│  │  Weight: 70 kg          Height: 170 cm    BMI: 24.2           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.4. When Living Will is NOT Shared

If the patient has not shared their Living Will:

```text
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  📜 Living Will                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  🔒 Patient has not shared their Living Will                   │ │
│  │                                                                 │ │
│  │  The patient has a Living Will on file but has chosen to       │ │
│  │  keep it private. Please discuss with the patient directly     │ │
│  │  if this information is needed for care decisions.             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.5. When No Living Will Exists

```text
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  📜 Living Will                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ℹ️ No Living Will on file                                      │ │
│  │                                                                 │ │
│  │  This patient has not created a Living Will.                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. API Endpoints

### 6.1. Patient Portal APIs

| Method | Endpoint | Description |
| -------- | ---------- | ------------- |
| GET | `/api/phr/{patientId}/living-will` | Get Living Will |
| POST | `/api/phr/{patientId}/living-will` | Create Living Will |
| PUT | `/api/phr/{patientId}/living-will` | Update Living Will |
| PUT | `/api/phr/{patientId}/living-will/share` | Update sharing settings |
| DELETE | `/api/phr/{patientId}/living-will` | Revoke Living Will |

### 6.2. Doctor Portal APIs

| Method | Endpoint | Description |
| -------- | ---------- | ------------- |
| GET | `/api/patients/{patientId}/living-will` | Get Living Will (if shared) |
| GET | `/api/patients/{patientId}/living-will/status` | Check if Living Will exists and is shared |

---

## 7. Audit & Compliance

### 7.1. Audit Log Events

| Event | Logged Data |
| ------- | ------------- |
| `LIVING_WILL_CREATED` | patientId, timestamp, version |
| `LIVING_WILL_UPDATED` | patientId, timestamp, changedFields |
| `LIVING_WILL_SHARED` | patientId, timestamp, shareScope |
| `LIVING_WILL_UNSHARED` | patientId, timestamp |
| `LIVING_WILL_REVOKED` | patientId, timestamp, reason |
| `LIVING_WILL_VIEWED` | patientId, viewerId, viewerRole, timestamp |

### 7.2. Data Retention

- Active Living Wills: Retained indefinitely
- Revoked Living Wills: Retained for 10 years (legal requirement)
- Audit logs: Retained for 10 years

---

## 8. Implementation Plan

### Phase 1: Patient Portal (Week 1-2)

| Task | File | Priority |
| ------ | ------ | ---------- |
| Add Living Will types | `src/types/sharedPHRTypes.ts` | P0 |
| Create LivingWillForm component | `src/components/health/LivingWillForm.tsx` | P0 |
| Add Living Will tab to PHR page | `src/pages/health/PHRPage.tsx` | P0 |
| Create Living Will API routes | `server/routes/phr.ts` | P0 |
| Add PDPA sharing controls | `src/components/health/LivingWillShareSettings.tsx` | P0 |
| Digital signature component | `src/components/ui/SignatureCanvas.tsx` | P1 |
| Audit logging | `server/routes/phr.ts` | P1 |

### Phase 2: Doctor Portal (Week 2-3)

| Task | File | Priority |
| ------ | ------ | ---------- |
| Add Living Will types | `src/types/index.ts` | P0 |
| Update PHRData interface | `src/services/patientRecordService.ts` | P0 |
| Add Living Will section to PHRView | `src/components/PatientRecordViewer.tsx` | P0 |
| Create LivingWillCard component | `src/components/LivingWillCard.tsx` | P0 |
| Add access control check | `src/services/patientRecordService.ts` | P0 |
| API endpoint for fetching | `server/mainApiServer.cjs` | P0 |
| Audit logging for doctor access | `server/mainApiServer.cjs` | P1 |

### Phase 3: Testing & Documentation (Week 3-4)

| Task | Description | Priority |
| ------ | ------------- | ---------- |
| E2E Tests | Test full workflow patient → doctor | P0 |
| Unit Tests | Test access control logic | P0 |
| User Guide | Document for patients and doctors | P1 |
| Admin Guide | Document for system administrators | P1 |

---

## 9. Security & Privacy Considerations

### 9.1. PDPA Compliance

- Explicit consent required before sharing
- Patient can revoke sharing at any time
- All access logged for audit

### 9.2. Data Encryption

- Living Will stored encrypted in GCS
- Signature data encrypted separately
- Access tokens required for all API calls

### 9.3. Access Control

- Doctors must have history with patient OR be admin
- Rate limiting on API endpoints
- Session validation on every request

---

## 10. References

- Thai Ministry of Public Health: Living Will Guidelines (พ.ร.บ.สุขภาพแห่งชาติ พ.ศ. 2550)
- PDPA Thailand: Personal Data Protection Act B.E. 2562 (2019)
- Medical Council of Thailand: End-of-Life Care Guidelines

---

### End of Living Will Process Documentation v2.0
