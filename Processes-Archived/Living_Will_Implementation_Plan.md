# 📋 Living Will Implementation Plan

**Version:** 1.1  
**Created:** December 12, 2025  
**Status:** ✅ IMPLEMENTED

---

## Executive Summary

This document outlines the implementation plan for adding Living Will functionality to both the Patient Portal and Doctor Portal with full PDPA compliance and consent-based sharing controls.

### Implementation Completed:

| Task | File | Status |
|------|------|--------|
| TypeScript Types | `Isara-patient-portal/src/types/sharedPHRTypes.ts` | ✅ Done |
| Patient API Routes | `Isara-patient-portal/server/routes/phr.ts` | ✅ Done |
| Doctor Portal Types | `Isara-doctor-portal/src/services/patientRecordService.ts` | ✅ Done |
| Doctor GCS Service | `Isara-doctor-portal/src/services/gcsDataService.ts` | ✅ Done |
| Doctor API Endpoint | `Isara-doctor-portal/server/mainApiServer.cjs` | ✅ Done |
| Living Will UI Card | `Isara-doctor-portal/src/components/PatientRecordViewer.tsx` | ✅ Done |

---

## 1. Patient Portal Implementation

### 1.1. Add Living Will Types to Shared Types

**File:** `Isara-patient-portal/src/types/sharedPHRTypes.ts`

Add the following interfaces:

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

// For doctor portal view
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

### 1.2. Create Living Will Form Component

**File:** `Isara-patient-portal/src/components/health/LivingWillForm.tsx`

Key sections:
1. Statement of wishes (textarea)
2. Treatment preferences (checkboxes with notes)
3. Representative information (form fields)
4. PDPA consent and sharing toggle
5. Digital signature canvas
6. Save/Cancel buttons

### 1.3. Create Living Will View Component

**File:** `Isara-patient-portal/src/components/health/LivingWillView.tsx`

Display existing Living Will with:
- Status badge (Active/Revoked)
- Statement display
- Treatment preferences list
- Representative contact
- Share settings status
- Edit/Revoke buttons

### 1.4. Add Living Will Tab to PHR Page

**File:** `Isara-patient-portal/src/pages/health/PHRPage.tsx`

Add new tab:
```tsx
<Tab id="living-will" label="พินัยกรรมชีวิต">
  <LivingWillTab patientId={patientId} />
</Tab>
```

### 1.5. Create API Routes

**File:** `Isara-patient-portal/server/routes/phr.ts`

Add endpoints:
```typescript
// GET /api/phr/:patientId/living-will
// POST /api/phr/:patientId/living-will
// PUT /api/phr/:patientId/living-will
// PUT /api/phr/:patientId/living-will/share
// DELETE /api/phr/:patientId/living-will
```

---

## 2. Doctor Portal Implementation

### 2.1. Add Living Will Types

**File:** `Isara-doctor-portal/src/types/index.ts`

Copy or import the Living Will types from shared types.

### 2.2. Update Patient Record Service

**File:** `Isara-doctor-portal/src/services/patientRecordService.ts`

Add methods:
```typescript
async getLivingWill(patientId: string): Promise<LivingWillForDoctor>
async checkLivingWillAccess(patientId: string, doctorId: string): Promise<boolean>
```

### 2.3. Create Living Will Card Component

**File:** `Isara-doctor-portal/src/components/LivingWillCard.tsx`

Display Living Will in patient record with:
- Prominent alert if exists and shared
- Treatment preferences (clear refused/allowed list)
- Representative contact
- Private indicator if not shared
- No document indicator if none exists

### 2.4. Update Patient Record Viewer

**File:** `Isara-doctor-portal/src/components/PatientRecordViewer.tsx`

Add Living Will section at the TOP of PHR tab:
```tsx
const PHRView = ({ phrData, patient }) => {
  const [livingWill, setLivingWill] = useState<LivingWillForDoctor | null>(null);
  
  useEffect(() => {
    loadLivingWill(patient.id);
  }, [patient.id]);
  
  return (
    <div className="space-y-6">
      {/* Living Will - FIRST SECTION */}
      <LivingWillCard livingWill={livingWill} />
      
      {/* Existing PHR sections... */}
      <PatientDemographicsCard />
      <MedicalHistoryCard />
      {/* etc. */}
    </div>
  );
};
```

### 2.5. Add API Endpoint

**File:** `Isara-doctor-portal/server/mainApiServer.cjs`

Add endpoint:
```javascript
// GET /api/patients/:patientId/living-will
app.get('/api/patients/:patientId/living-will', authMiddleware, async (req, res) => {
  const { patientId } = req.params;
  const doctorId = req.user.id;
  
  // Check access rights
  const hasAccess = await checkDoctorAccess(doctorId, patientId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this patient' });
  }
  
  // Load Living Will
  const livingWill = await loadLivingWill(patientId);
  
  // Check sharing consent
  if (!livingWill) {
    return res.json({ exists: false, isShared: false });
  }
  
  if (!livingWill.pdpaConsent.isSharedWithDoctors) {
    return res.json({ exists: true, isShared: false });
  }
  
  // Log access
  await logLivingWillAccess(patientId, doctorId);
  
  // Return Living Will data
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

## 3. Testing Plan

### 3.1. Unit Tests

| Test Case | Expected Result |
|-----------|-----------------|
| Create Living Will | Success, saved to GCS |
| Update Living Will | Success, version incremented |
| Revoke Living Will | Status changed to revoked |
| Share Living Will | isSharedWithDoctors = true |
| Unshare Living Will | isSharedWithDoctors = false |
| Doctor access (shared) | Returns full Living Will |
| Doctor access (not shared) | Returns { exists: true, isShared: false } |
| Doctor access (no history) | Returns 403 error |
| Admin access (shared) | Returns full Living Will |

### 3.2. E2E Tests

**File:** `scripts/tests/e2e/livingWillTests.cjs`

Scenarios:
1. Patient creates Living Will with sharing enabled
2. Patient updates Living Will
3. Patient revokes sharing
4. Doctor views shared Living Will
5. Doctor cannot view unshared Living Will
6. Admin views shared Living Will

---

## 4. Task Checklist

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

## 5. Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | Week 1-2 | Patient Portal implementation |
| Phase 2 | Week 2-3 | Doctor Portal implementation |
| Phase 3 | Week 3-4 | Testing & documentation |
| Phase 4 | Week 4 | Review & deployment |

---

## 6. Dependencies

- Both portals running
- GCS access configured
- Authentication working
- PDPA consent system in place

---

**End of Implementation Plan**
