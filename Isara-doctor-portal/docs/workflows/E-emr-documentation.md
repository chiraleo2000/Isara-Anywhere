> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §E`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** EMR creation and signing — edit canonical copy in platform `Processes/`.

## E. EMR Documentation Workflow


### E1. AI-Assisted EMR Creation

**Pages:** `EMREditor.tsx` (modal)
**API:** `POST /api/emr`
**Tables:** `emr`, `ai_validations`

```text
Process:
1. Post-meeting: AI generates SOAP draft
2. Doctor opens EMR Editor modal
3. Sees AI-generated sections:
   S (Subjective): Patient complaints, history
   O (Objective): Exam findings, vitals
   A (Assessment): Diagnosis (ICD-10 searchable)
   P (Plan): Treatment plan
4. Doctor can:
   - ✅ Approve each section
   - ✏️ Edit any section
   - ❌ Reject and regenerate
5. All changes tracked in ai_validations
6. Doctor signs EMR digitally
7. Status: draft → signed
```


## Features


- SOAP format editor


- AI pre-filled from transcript


- ICD-10 code search


- Digital signature


- Man-in-the-Loop validation

---


### E2. EMR Signing

```text
Process:
1. Doctor reviews all SOAP sections
2. Clicks "Sign EMR"
3. Confirmation modal appears
4. UPDATE emr SET status='signed', signed_at=NOW(), doctor_signature=name
5. INSERT notifications → patient ("Your medical record is ready")
6. EMR becomes read-only after signing
7. Patient can view summary via timeline
```

---
