# 📝 หนังสือแสดงเจตจำนอง – Process & Implementation Guide (Izara Telemedicine)

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `Living_Will_Processes.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`Living_Will_Processes.md`](../Living_Will_Processes.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 2.1.0
**อัปเดตล่าสุด:** July 9, 2026
**สถานะ:** ✅ PostgreSQL Implementation + Full DB Schema
**Canonical doc:** Single source for หนังสือแสดงเจตจำนอง workflows (implementation plan merged here in v2.0)


---


## 1. ภาพรวม

A **หนังสือแสดงเจตจำนอง** (พินัยกรรมชีวิต) is a legal document that allows a ผู้ป่วย to specify their wishes regarding medical treatment in situations where they may be unable to communicate. In Izara Telemedicine, the หนังสือแสดงเจตจำนอง is part of the ผู้ป่วย's Personal Health Record (PHR) and includes **PDPA consent controls** for sharing with healthcare providers.


### Key ฟีเจอร์


- ✅ ผู้ป่วย creates and manages their หนังสือแสดงเจตจำนอง


- ✅ PDPA-compliant sharing controls (public to all authorized doctors OR private)


- ✅ If shared, visible to ALL doctors with ผู้ป่วย history AND ผู้ดูแลระบบ users


- ✅ Displayed prominently in PHR tab of ผู้ป่วย Record Viewer (พอร์ทัลแพทย์)


- ✅ Full audit trail of access and modifications


### Implementation Status

| Task | File | สถานะ |
| ---- | ---- | ------ |
| TypeScript Types | `Isara-patient-portal/frontend/types/sharedPHRTypes.ts` | ✅ Done |
| ผู้ป่วย API Routes | `Isara-patient-portal/backend/routes/phr.ts` | ✅ Done |
| พอร์ทัลแพทย์ Types | `Isara-doctor-portal/frontend/services/patientRecordService.ts` | ✅ Done |
| แพทย์ API Endpoint | `Isara-doctor-portal/backend/mainApiServer.cjs` | ✅ Done |
| แพทย์ PostgreSQL read | `postgresDataService.cjs` → `living_wills` | ✅ Done |
| หนังสือแสดงเจตจำนอง UI Card | `Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx` | ✅ Done |

---


## 2. User Roles & Access Matrix

| Role | Create | View | Update | Delete | Share Settings |
| ---------------- | -------- | ------ | -------- | -------- | ---------------- |
| ผู้ป่วย | ✅ | ✅ | ✅ | ✅ | ✅ |
| แพทย์ | ❌ | ✅* | ❌ | ❌ | ❌ |
| ผู้ดูแลระบบ (แพทย์) | ❌ | ✅* | ❌ | ❌ | ❌ |


### ✅* = Only if patient has shared Living Will (PDPA consent granted)


### Doctor/Admin Access Rules

1. **If `isSharedWithDoctors: true`** → All doctors AND admins with ANY history/logs with the ผู้ป่วย can view
2. **If `isSharedWithDoctors: false`** → หนังสือแสดงเจตจำนอง is hidden (private)
3. Access is logged for audit compliance

---


## 3. Data Structure


### 3.1. Living Will Metadata

**Storage:** PostgreSQL table `living_wills` (primary). Legacy path `patients/{patientId}/living-will.json` is **deprecated** — do not use for new implementations.

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


## 4. Patient Portal ขั้นตอนการทำงาน


### 4.1. Page & Navigation


- **Page:** `frontend/pages/health/PHRPage.tsx`


- **Tab:** "หนังสือแสดงเจตจำนอง" / "พินัยกรรมชีวิต"


- **Component:** `frontend/components/health/LivingWillForm.tsx`


### 4.2. Step-by-Step Process


#### Step 1: Access Living Will Tab

1. ผู้ป่วย logs into พอร์ทัลผู้ป่วย
2. Navigates to **Health Studio** → **PHR** → **หนังสือแสดงเจตจำนอง** tab
3. If no หนังสือแสดงเจตจำนอง exists, shows "Create หนังสือแสดงเจตจำนอง" button
4. If หนังสือแสดงเจตจำนอง exists, shows current document with Edit/Revoke options


#### Step 2: Create/Edit Living Will

1. ผู้ป่วย clicks "Create หนังสือแสดงเจตจำนอง" or "Edit"
2. Form displays with sections:
   - **Statement of Wishes** (free text)
   - **Treatment Preferences** (checkboxes with notes)
   - **Legal Representative** (contact details)
   - **Alternative Representative** (optional)


#### Step 3: PDPA Consent & Sharing Settings

1. ผู้ป่วย must accept PDPA consent checkbox
2. ผู้ป่วย chooses sharing preference:
   - **🔒 Keep Private** - Only ผู้ป่วย can view
   - **🌐 Share with Doctors** - All authorized doctors & admins can view
3. System explains: "If you share, ALL doctors who have treated you and hospital administrators will be able to see your หนังสือแสดงเจตจำนอง"


#### Step 4: Digital Signature

1. ผู้ป่วย signs digitally (canvas signature)
2. Optional: Witness signature
3. System records timestamp and IP


#### Step 5: Save & Confirm

1. ผู้ป่วย reviews summary
2. Clicks "Save หนังสือแสดงเจตจำนอง"
3. System persists to PostgreSQL: `INSERT/UPDATE living_wills` (+ `living_will_versions` on finalize/edit)
4. Confirmation message with share สถานะ displayed


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


## 5. Doctor Portal ขั้นตอนการทำงาน


### 5.1. Page & Navigation


- **Page:** `frontend/components/PatientRecordViewer.tsx`


- **Tab:** "Personal Health Record (PHR)"


- **Section:** หนังสือแสดงเจตจำนอง Card (prominent display)


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

When a แพทย์ views a ผู้ป่วย's PHR, the หนังสือแสดงเจตจำนอง section should appear at the TOP of the page:

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

If the ผู้ป่วย has not shared their หนังสือแสดงเจตจำนอง:

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

| Method | Endpoint | คำอธิบาย |
| -------- | ---------- | ------------- |
| GET | `/api/phr/{patientId}/living-will` | Get Living Will |
| POST | `/api/phr/{patientId}/living-will` | Create Living Will |
| PUT | `/api/phr/{patientId}/living-will` | Update Living Will |
| PUT | `/api/phr/{patientId}/living-will/share` | Update sharing settings |
| DELETE | `/api/phr/{patientId}/living-will` | Revoke Living Will |


### 6.2. Doctor Portal APIs

| Method | Endpoint | คำอธิบาย |
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
| Add หนังสือแสดงเจตจำนอง types | `frontend/types/sharedPHRTypes.ts` | P0 |
| Create LivingWillForm component | `frontend/components/health/LivingWillForm.tsx` | P0 |
| Add หนังสือแสดงเจตจำนอง tab to PHR page | `frontend/pages/health/PHRPage.tsx` | P0 |
| Create หนังสือแสดงเจตจำนอง API routes | `server/routes/phr.ts` | P0 |
| Add PDPA sharing controls | `frontend/components/health/LivingWillShareSettings.tsx` | P0 |
| Digital signature component | `frontend/components/ui/SignatureCanvas.tsx` | P1 |
| Audit logging | `server/routes/phr.ts` | P1 |


### Phase 2: Doctor Portal (Week 2-3)

| Task | File | Priority |
| ------ | ------ | ---------- |
| Add หนังสือแสดงเจตจำนอง types | `frontend/types/index.ts` | P0 |
| Update PHRData interface | `frontend/services/patientRecordService.ts` | P0 |
| Add หนังสือแสดงเจตจำนอง section to PHRView | `frontend/components/PatientRecordViewer.tsx` | P0 |
| Create LivingWillCard component | `frontend/components/LivingWillCard.tsx` | P0 |
| Add access control check | `frontend/services/patientRecordService.ts` | P0 |
| API endpoint for fetching | `server/mainApiServer.cjs` | P0 |
| Audit logging for แพทย์ access | `server/mainApiServer.cjs` | P1 |


### Phase 3: Testing & Documentation (Week 3-4)

| Task | คำอธิบาย | Priority |
| ------ | ------------- | ---------- |
| E2E Tests | Test full workflow ผู้ป่วย → แพทย์ | P0 |
| Unit Tests | Test access control logic | P0 |
| User Guide | Document for patients and doctors | P1 |
| ผู้ดูแลระบบ Guide | Document for system administrators | P1 |

---


## 9. ความปลอดภัย & Privacy Considerations


### 9.1. PDPA Compliance


- Explicit consent required before sharing


- ผู้ป่วย can revoke sharing at any time


- All access logged for audit


### 9.2. Data Encryption


- หนังสือแสดงเจตจำนอง stored encrypted in PostgreSQL (pgcrypto extension)


- Signature data stored as base64 in JSONB column


- Access tokens required for all API calls


### 9.3. Access Control


- Doctors must have history with ผู้ป่วย OR be ผู้ดูแลระบบ


- Rate limiting on API endpoints


- Session validation on every request

---


## 10. References


- Thai Ministry of Public Health: หนังสือแสดงเจตจำนอง Guidelines (พ.ร.บ.สุขภาพแห่งชาติ พ.ศ. 2550)


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

**`Isara-patient-portal/frontend/components/health/LivingWillView.tsx`** — Display existing หนังสือแสดงเจตจำนอง with:


- สถานะ badge (Active/Revoked)


- Statement display


- Treatment preferences list


- Representative contact


- Share settings สถานะ


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

**`Isara-doctor-portal/frontend/components/PatientRecordViewer.tsx`** — หนังสือแสดงเจตจำนอง at top of PHR tab:

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

**`Isara-doctor-portal/backend/mainApiServer.cjs`** — แพทย์ API endpoint:

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
| Create หนังสือแสดงเจตจำนอง | Success, saved to PostgreSQL |
| Update หนังสือแสดงเจตจำนอง | Success, เวอร์ชัน incremented |
| Revoke หนังสือแสดงเจตจำนอง | สถานะ changed to revoked |
| Share หนังสือแสดงเจตจำนอง | `isSharedWithDoctors = true` |
| Unshare หนังสือแสดงเจตจำนอง | `isSharedWithDoctors = false` |
| แพทย์ access (shared) | Returns full หนังสือแสดงเจตจำนอง |
| แพทย์ access (not shared) | Returns `{ exists: true, isShared: false }` |
| แพทย์ access (no history) | Returns 403 error |
| ผู้ดูแลระบบ access (shared) | Returns full หนังสือแสดงเจตจำนอง |


### 12.2. E2E Tests

**File:** `scripts/tests/e2e/livingWillTests.cjs`

Scenarios:
1. ผู้ป่วย creates หนังสือแสดงเจตจำนอง with sharing enabled
2. ผู้ป่วย updates หนังสือแสดงเจตจำนอง
3. ผู้ป่วย revokes sharing
4. แพทย์ views shared หนังสือแสดงเจตจำนอง
5. แพทย์ cannot view unshared หนังสือแสดงเจตจำนอง
6. ผู้ดูแลระบบ views shared หนังสือแสดงเจตจำนอง

---


## 13. Task Checklist


### Patient Portal


- [ ] Add หนังสือแสดงเจตจำนอง types to `sharedPHRTypes.ts`


- [ ] Create `LivingWillForm.tsx` component


- [ ] Create `LivingWillView.tsx` component


- [ ] Create `LivingWillTab.tsx` wrapper component


- [ ] Create `SignatureCanvas.tsx` component


- [ ] Add หนังสือแสดงเจตจำนอง tab to PHR page


- [ ] Add API routes for หนังสือแสดงเจตจำนอง CRUD


- [ ] Add audit logging for หนังสือแสดงเจตจำนอง actions


- [ ] Add PDPA sharing controls


- [ ] Write unit tests for หนังสือแสดงเจตจำนอง APIs


- [ ] Write E2E tests for ผู้ป่วย workflows


### Doctor Portal


- [ ] Add หนังสือแสดงเจตจำนอง types to types file


- [ ] Create `LivingWillCard.tsx` component


- [ ] Update `PatientRecordViewer.tsx` with หนังสือแสดงเจตจำนอง section


- [ ] Update `patientRecordService.ts` with หนังสือแสดงเจตจำนอง methods


- [ ] Add API endpoint for fetching หนังสือแสดงเจตจำนอง


- [ ] Add access control logic (history check)


- [ ] Add audit logging for หนังสือแสดงเจตจำนอง access


- [ ] Write unit tests for access control


- [ ] Write E2E tests for แพทย์ workflows


### Shared


- [ ] Copy หนังสือแสดงเจตจำนอง types to พอร์ทัลแพทย์


- [ ] Update documentation


- [ ] Create user guides


- [ ] Test cross-portal workflow

---


## 14. Timeline & Dependencies


### Timeline

| Phase | Duration | Tasks |
| ------- | ---------- | ------- |
| Phase 1 | Week 1-2 | พอร์ทัลผู้ป่วย implementation |
| Phase 2 | Week 2-3 | พอร์ทัลแพทย์ implementation |
| Phase 3 | Week 3-4 | Testing & documentation |
| Phase 4 | Week 4 | Review & deployment |


### Dependencies


- Both portals running with PostgreSQL connection


- PostgreSQL extensions: `uuid-ossp`, `pgcrypto`


- Authentication via `sessions` table


- PDPA consent system via `patient_consents` table

---


## 15. PostgreSQL ฐานข้อมูล Architecture


### 15.1. ฐานข้อมูล Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **living_wills** | Main หนังสือแสดงเจตจำนอง document | `id`, `patient_id`, `statement` (text), `treatments` (JSONB), `representatives` (JSONB), `signature` (JSONB), `pdpa_consent` (JSONB), `status` (draft/finalized/revoked), `is_shared_with_doctors` (boolean), `version` (int), `audit_log` (JSONB) |
| **living_will_versions** | Immutable เวอร์ชัน history | `id`, `patient_id`, `version` (int), `data` (JSONB snapshot), `note` (text) |
| **patient_consents** | PDPA consent records | `id`, `patient_id`, `consent_type` ('living_will_sharing'), `granted` (boolean), `doctor_id`, `data_types` (JSONB), `status` |
| **audit_logs** | All access and modification events | `id`, `user_id`, `patient_id`, `action`, `entity_type` ('living_will'), `entity_id`, `details` (JSONB), `ip_address` |


### 15.2. ฐานข้อมูล Operations by Portal

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
| Local Docker | พอร์ทัลผู้ป่วย (3005) | Full CRUD on own หนังสือแสดงเจตจำนอง | izara-postgres:5432 |
| Local Docker | พอร์ทัลแพทย์ (3010) | Read-only (if shared) | izara-postgres:5432 |
| Production | พอร์ทัลผู้ป่วย (Cloud Run) | Full CRUD on own หนังสือแสดงเจตจำนอง | 35.240.157.230:5432 |
| Production | พอร์ทัลแพทย์ (Cloud Run) | Read-only (if shared) | 35.240.157.230:5432 |


### 15.6. Scenario Coverage

| # | Scenario | ผู้ดำเนินการ | DB Tables |
| - | -------- | ----- | --------- |
| 1 | Create draft หนังสือแสดงเจตจำนอง | ผู้ป่วย | living_wills, audit_logs |
| 2 | Finalize หนังสือแสดงเจตจำนอง | ผู้ป่วย | living_wills, living_will_versions, audit_logs |
| 3 | Update finalized will (new เวอร์ชัน) | ผู้ป่วย | living_wills, living_will_versions, audit_logs |
| 4 | Enable sharing with doctors | ผู้ป่วย | living_wills, patient_consents, audit_logs |
| 5 | Revoke sharing (PDPA right) | ผู้ป่วย | living_wills, patient_consents, audit_logs |
| 6 | แพทย์ views shared หนังสือแสดงเจตจำนอง | แพทย์ | living_wills (read), audit_logs |
| 7 | แพทย์ sees "not shared" message | แพทย์ | living_wills (existence check only) |
| 8 | ผู้ดูแลระบบ views for compliance | ผู้ดูแลระบบ | living_wills, audit_logs |
| 9 | Revoke/delete หนังสือแสดงเจตจำนอง | ผู้ป่วย | living_wills (สถานะ='revoked'), audit_logs |

---

*End of หนังสือแสดงเจตจำนอง Process & Implementation Guide v2.0.0*