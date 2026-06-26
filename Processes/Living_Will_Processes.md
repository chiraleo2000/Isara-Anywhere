# 📝 Living Will – Process & Implementation Guide (Izara Telemedicine)

**Version:** 2.0.0
**Last Updated:** April 2, 2026
**Status:** ✅ PostgreSQL Implementation + Full DB Schema
**Merged from:** `Living_Will_Processes.md` v1.6.0 + `Living_Will_Implementation_Plan.md` v1.2

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

| Task | File | Status |
| ---- | ---- | ------ |
| TypeScript Types | `Isara-patient-portal/frontend/types/sharedPHRTypes.ts` | ✅ Done |
| Patient API Routes | `Isara-patient-portal/backend/routes/phr.ts` | ✅ Done |
| Doctor Portal Types | `Isara-doctor-portal/frontend/services/patientRecordService.ts` | ✅ Done |
| Doctor GCS Service | `Isara-doctor-portal/frontend/services/gcsDataService.ts` | ✅ Done |
| Doctor API Endpoint | `Isara-doctor-portal/backend/mainApiServer.cjs` | ✅ Done |
| Living Will UI Card | `Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx` | ✅ Done |

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


### 3.2. TypeScript Interfaces

**File:** `Isara-patient-portal/frontend/types/sharedPHRTypes.ts`

```typescript
// ============================================================================
// LIVING WILL - Standardized Structure
// ============================================================================

export interface LivingWillTreatment {
  allowed: boolean;
  notes?: string;
}

export interface LivingWillTreatments {
  resuscitation: LivingWillTreatment;
  mechanicalVentilation: LivingWillTreatment;
  artificialNutrition: LivingWillTreatment;
  dialysis: LivingWillTreatment;
  antibiotics: LivingWillTreatment;
  painManagement: LivingWillTreatment;
  other?: string;
}

export interface LivingWillRepresentative {
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'friend' | 'lawyer' | 'other';
  phone: string;
  email?: string;
  nationalId?: string;
  isPrimary?: boolean;
}

export interface LivingWillSignature {
  patientSignature: string; // base64 encoded
  signedAt: string;
  witnessName?: string;
  witnessSignature?: string;
}

export interface LivingWillPDPAConsent {
  isSharedWithDoctors: boolean;
  shareScope: 'all_authorized' | 'specific_doctors' | 'none';
  consentGrantedAt?: string;
  consentVersion: string;
  shareHistory: {
    action: 'shared' | 'unshared' | 'updated';
    timestamp: string;
    scope: string;
  }[];
}

export interface LivingWillAuditEntry {
  action: 'created' | 'updated' | 'shared' | 'unshared' | 'revoked' | 'viewed';
  timestamp: string;
  userId: string;
  userRole: 'patient' | 'doctor' | 'admin';
  details?: string;
}

export interface LivingWill {
  id: string;
  patientId: string;
  version: string;
  status: 'active' | 'revoked' | 'draft';
  createdAt: string;
  updatedAt: string;
  effectiveDate: string;
  revokedAt?: string;
  statement: string;
  treatments: LivingWillTreatments;
  representative: LivingWillRepresentative;
  alternativeRepresentative?: LivingWillRepresentative;
  signature?: LivingWillSignature;
  pdpaConsent: LivingWillPDPAConsent;
  auditLog: LivingWillAuditEntry[];
}

// For doctor portal view (read-only, consent-gated)
export interface LivingWillForDoctor {
  exists: boolean;
  isShared: boolean;
  status?: 'active' | 'revoked';
  effectiveDate?: string;
  statement?: string;
  treatments?: LivingWillTreatments;
  representative?: LivingWillRepresentative;
  signedAt?: string;
}
```

---


## 4. Patient Portal Workflow


### 4.1. Page & Navigation


- **Page:** `frontend/pages/health/PHRPage.tsx`


- **Tab:** "Living Will" / "พินัยกรรมชีวิต"


- **Component:** `frontend/components/health/LivingWillForm.tsx`


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


- **Page:** `frontend/components/PatientRecordViewer.tsx`


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
| Add Living Will types | `frontend/types/sharedPHRTypes.ts` | P0 |
| Create LivingWillForm component | `frontend/components/health/LivingWillForm.tsx` | P0 |
| Add Living Will tab to PHR page | `frontend/pages/health/PHRPage.tsx` | P0 |
| Create Living Will API routes | `server/routes/phr.ts` | P0 |
| Add PDPA sharing controls | `frontend/components/health/LivingWillShareSettings.tsx` | P0 |
| Digital signature component | `frontend/components/ui/SignatureCanvas.tsx` | P1 |
| Audit logging | `server/routes/phr.ts` | P1 |


### Phase 2: Doctor Portal (Week 2-3)

| Task | File | Priority |
| ------ | ------ | ---------- |
| Add Living Will types | `frontend/types/index.ts` | P0 |
| Update PHRData interface | `frontend/services/patientRecordService.ts` | P0 |
| Add Living Will section to PHRView | `frontend/components/PatientRecordViewer.tsx` | P0 |
| Create LivingWillCard component | `frontend/components/LivingWillCard.tsx` | P0 |
| Add access control check | `frontend/services/patientRecordService.ts` | P0 |
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


- Living Will stored encrypted in PostgreSQL (pgcrypto extension)


- Signature data stored as base64 in JSONB column


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


## 11. Component Implementation Details


### 11.1. Patient Portal Components

**`Isara-patient-portal/frontend/components/health/LivingWillForm.tsx`** — Key sections:
1. Statement of wishes (textarea)
2. Treatment preferences (checkboxes with notes)
3. Representative information (form fields)
4. PDPA consent and sharing toggle
5. Digital signature canvas
6. Save/Cancel buttons

**`Isara-patient-portal/frontend/components/health/LivingWillView.tsx`** — Display existing Living Will with:


- Status badge (Active/Revoked)


- Statement display


- Treatment preferences list


- Representative contact


- Share settings status


- Edit/Revoke buttons

**`Isara-patient-portal/frontend/pages/health/PHRPage.tsx`** — Tab integration:

```tsx
<Tab id="living-will" label="พินัยกรรมชีวิต">
  <LivingWillTab patientId={patientId} />
</Tab>
```

**`Isara-patient-portal/backend/routes/phr.ts`** — API route stubs:

```typescript
// GET /api/phr/:patientId/living-will
// POST /api/phr/:patientId/living-will
// PUT /api/phr/:patientId/living-will
// PUT /api/phr/:patientId/living-will/share
// DELETE /api/phr/:patientId/living-will
```

---


### 11.2. Doctor Portal Components

**`Isara-doctor-portal/frontend/services/patientRecordService.ts`** — Service methods:

```typescript
async getLivingWill(patientId: string): Promise<LivingWillForDoctor>
async checkLivingWillAccess(patientId: string, doctorId: string): Promise<boolean>
```

**`Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx`** — Living Will at top of PHR tab:

```tsx
const PHRView = ({ phrData, patient }) => {
  const [livingWill, setLivingWill] = useState<LivingWillForDoctor | null>(null);

  useEffect(() => {
    loadLivingWill(patient.id);
  }, [patient.id]);

  return (
    <>
      {/* Living Will - FIRST SECTION */}
      <LivingWillCard livingWill={livingWill} />

      {/* Existing PHR sections... */}
      <PatientDemographicsCard />
      <MedicalHistoryCard />
    </>
  );
};
```

**`Isara-doctor-portal/backend/mainApiServer.cjs`** — Doctor API endpoint:

```javascript
// GET /api/patients/:patientId/living-will
app.get('/api/patients/:patientId/living-will', authMiddleware, async (req, res) => {
  const { patientId } = req.params;
  const doctorId = req.user.id;

  const hasAccess = await checkDoctorAccess(doctorId, patientId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this patient' });
  }

  const livingWill = await loadLivingWill(patientId);

  if (!livingWill) {
    return res.json({ exists: false, isShared: false });
  }

  if (!livingWill.pdpaConsent.isSharedWithDoctors) {
    return res.json({ exists: true, isShared: false });
  }

  await logLivingWillAccess(patientId, doctorId);

  return res.json({
    exists: true,
    isShared: true,
    status: livingWill.status,
    effectiveDate: livingWill.effectiveDate,
    statement: livingWill.statement,
    treatments: livingWill.treatments,
    representative: livingWill.representative,
    signedAt: livingWill.signature?.signedAt
  });
});
```

---


## 12. Testing Plan


### 12.1. Unit Tests

| Test Case | Expected Result |
| ----------- | ----------------- |
| Create Living Will | Success, saved to PostgreSQL |
| Update Living Will | Success, version incremented |
| Revoke Living Will | Status changed to revoked |
| Share Living Will | `isSharedWithDoctors = true` |
| Unshare Living Will | `isSharedWithDoctors = false` |
| Doctor access (shared) | Returns full Living Will |
| Doctor access (not shared) | Returns `{ exists: true, isShared: false }` |
| Doctor access (no history) | Returns 403 error |
| Admin access (shared) | Returns full Living Will |


### 12.2. E2E Tests

**File:** `scripts/tests/e2e/livingWillTests.cjs`

Scenarios:
1. Patient creates Living Will with sharing enabled
2. Patient updates Living Will
3. Patient revokes sharing
4. Doctor views shared Living Will
5. Doctor cannot view unshared Living Will
6. Admin views shared Living Will

---


## 13. Task Checklist


### Patient Portal


- [ ] Add Living Will types to `sharedPHRTypes.ts`


- [ ] Create `LivingWillForm.tsx` component


- [ ] Create `LivingWillView.tsx` component


- [ ] Create `LivingWillTab.tsx` wrapper component


- [ ] Create `SignatureCanvas.tsx` component


- [ ] Add Living Will tab to PHR page


- [ ] Add API routes for Living Will CRUD


- [ ] Add audit logging for Living Will actions


- [ ] Add PDPA sharing controls


- [ ] Write unit tests for Living Will APIs


- [ ] Write E2E tests for patient workflows


### Doctor Portal


- [ ] Add Living Will types to types file


- [ ] Create `LivingWillCard.tsx` component


- [ ] Update `PatientRecordViewer.tsx` with Living Will section


- [ ] Update `patientRecordService.ts` with Living Will methods


- [ ] Add API endpoint for fetching Living Will


- [ ] Add access control logic (history check)


- [ ] Add audit logging for Living Will access


- [ ] Write unit tests for access control


- [ ] Write E2E tests for doctor workflows


### Shared


- [ ] Copy Living Will types to doctor portal


- [ ] Update documentation


- [ ] Create user guides


- [ ] Test cross-portal workflow

---


## 14. Timeline & Dependencies


### Timeline

| Phase | Duration | Tasks |
| ------- | ---------- | ------- |
| Phase 1 | Week 1-2 | Patient Portal implementation |
| Phase 2 | Week 2-3 | Doctor Portal implementation |
| Phase 3 | Week 3-4 | Testing & documentation |
| Phase 4 | Week 4 | Review & deployment |


### Dependencies


- Both portals running with PostgreSQL connection


- PostgreSQL extensions: `uuid-ossp`, `pgcrypto`


- Authentication via `sessions` table


- PDPA consent system via `patient_consents` table

---


## 15. PostgreSQL Database Architecture


### 15.1. Database Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **living_wills** | Main living will document | `id`, `patient_id`, `statement` (text), `treatments` (JSONB), `representatives` (JSONB), `signature` (JSONB), `pdpa_consent` (JSONB), `status` (draft/finalized/revoked), `is_shared_with_doctors` (boolean), `version` (int), `audit_log` (JSONB) |
| **living_will_versions** | Immutable version history | `id`, `patient_id`, `version` (int), `data` (JSONB snapshot), `note` (text) |
| **patient_consents** | PDPA consent records | `id`, `patient_id`, `consent_type` ('living_will_sharing'), `granted` (boolean), `doctor_id`, `data_types` (JSONB), `status` |
| **audit_logs** | All access and modification events | `id`, `user_id`, `patient_id`, `action`, `entity_type` ('living_will'), `entity_id`, `details` (JSONB), `ip_address` |


### 15.2. Database Operations by Portal

```text
Patient Portal (port 3005) — phr.ts routes
  POST   /api/phr/:id/living-will       → INSERT INTO living_wills
  PUT    /api/phr/:id/living-will       → UPDATE living_wills + INSERT living_will_versions
  PUT    /api/phr/:id/living-will/share → UPDATE living_wills (is_shared) + UPSERT patient_consents
  GET    /api/phr/:id/living-will       → SELECT FROM living_wills WHERE patient_id=$1
  DELETE /api/phr/:id/living-will       → UPDATE living_wills SET status='revoked'

Doctor Portal (port 3010) — mainApiServer.cjs
  GET    /api/patients/:id/living-will  → SELECT FROM living_wills
                                           WHERE patient_id=$1 AND is_shared_with_doctors=true
                                         + INSERT INTO audit_logs (action='view_living_will')
```


### 15.3. Data Flow: Create → Version → Share → Access

```text
Patient Portal (port 3005)                      Doctor Portal (port 3010)
┌────────────────────────────┐                  ┌─────────────────────────────┐
│ LivingWillPage.tsx         │                  │ PatientRecordViewer.tsx      │
│                            │                  │ └─ LivingWillCard component  │
│ POST /api/phr/:id/         │                  │                             │
│   living-will              │                  │ GET /api/patients/:id/       │
│ PUT  /api/phr/:id/         │                  │   living-will               │
│   living-will/share        │                  │ (Only if isSharedWithDoctors)│
└──────────┬─────────────────┘                  └───────────┬─────────────────┘
           │                                                │
           ▼                                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL - izara_phase1                              │
│                                                                          │
│  Patient creates Living Will:                                            │
│  INSERT INTO living_wills (patient_id, statement, treatments,           │
│    representatives, signature, pdpa_consent, status='draft', version=1)  │
│                                                                          │
│  Patient finalizes:                                                      │
│  UPDATE living_wills SET status='finalized' WHERE patient_id=$1          │
│  INSERT INTO living_will_versions (patient_id, version, data=$snapshot)  │
│                                                                          │
│  Patient enables sharing:                                                │
│  UPDATE living_wills SET is_shared_with_doctors=true WHERE patient_id=$1 │
│  INSERT INTO patient_consents (patient_id, consent_type=                 │
│    'living_will_sharing', granted=true)                                   │
│  INSERT INTO audit_logs (action='share_living_will')                     │
│                                                                          │
│  Doctor views (if shared):                                               │
│  SELECT * FROM living_wills WHERE patient_id=$1                          │
│    AND is_shared_with_doctors = true                                     │
│  INSERT INTO audit_logs (action='view_living_will',                      │
│    user_id=$doctorId, patient_id=$1)                                     │
│                                                                          │
│  Version history:                                                        │
│  SELECT * FROM living_will_versions WHERE patient_id=$1                  │
│    ORDER BY version DESC                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```


### 15.4. PDPA Compliance Data Flow

```text
Patient toggles sharing
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  BEGIN TRANSACTION                                               │
│                                                                  │
│  UPDATE living_wills SET is_shared_with_doctors = $shared        │
│  WHERE patient_id = $1                                           │
│                                                                  │
│  UPSERT patient_consents SET granted = $shared,                 │
│    consent_type = 'living_will_sharing'                          │
│  WHERE patient_id = $1                                           │
│                                                                  │
│  INSERT INTO audit_logs (action=$shared ? 'grant' : 'revoke',  │
│    entity_type='living_will_consent')                            │
│                                                                  │
│  COMMIT                                                          │
└──────────────────────────────────────────────────────────────────┘
```


### 15.5. Deployment Architecture

| Environment | Service | Access | Database |
| ----------- | ------- | ------ | -------- |
| Local Docker | Patient Portal (3005) | Full CRUD on own living will | izara-postgres:5432 |
| Local Docker | Doctor Portal (3010) | Read-only (if shared) | izara-postgres:5432 |
| Production | Patient Portal (Cloud Run) | Full CRUD on own living will | 35.240.157.230:5432 |
| Production | Doctor Portal (Cloud Run) | Read-only (if shared) | 35.240.157.230:5432 |


### 15.6. Scenario Coverage

| # | Scenario | Actor | DB Tables |
| - | -------- | ----- | --------- |
| 1 | Create draft living will | Patient | living_wills, audit_logs |
| 2 | Finalize living will | Patient | living_wills, living_will_versions, audit_logs |
| 3 | Update finalized will (new version) | Patient | living_wills, living_will_versions, audit_logs |
| 4 | Enable sharing with doctors | Patient | living_wills, patient_consents, audit_logs |
| 5 | Revoke sharing (PDPA right) | Patient | living_wills, patient_consents, audit_logs |
| 6 | Doctor views shared living will | Doctor | living_wills (read), audit_logs |
| 7 | Doctor sees "not shared" message | Doctor | living_wills (existence check only) |
| 8 | Admin views for compliance | Admin | living_wills, audit_logs |
| 9 | Revoke/delete living will | Patient | living_wills (status='revoked'), audit_logs |

---

*End of Living Will Process & Implementation Guide v2.0.0*
