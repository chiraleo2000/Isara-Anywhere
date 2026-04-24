# 💊 Doctor Portal — E-Prescribing

**Component:** `src/components/CompletePrescribing.tsx`
**Type:** Modal (launched from DoctorPortal)
**Access:** 🔒 Doctor / Admin
**Thai Title:** ระบบสั่งยาอิเล็กทรอนิกส์ / E-Prescribing

---


## 1. Purpose

Electronic prescription system with real-time drug search, allergy cross-checking, drug interaction warnings, and digital signature.

---


## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💊 E-Prescribing — นายสมชาย มั่นคง                                  │
│                                                                     │
│  ⚠️ Patient Allergies: [Penicillin] [Aspirin]                      │
│  💊 Current Medications: Metformin 500mg, Amlodipine 5mg           │
│                                                                     │
│  🔍 Search Drug: [____________________]                             │
│  ┌── Search Results ─────────────────────────────────────────┐     │
│  │  Paracetamol (Acetaminophen) 500mg        [+ Add]        │     │
│  │  Amoxicillin 500mg                         [+ Add]        │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌── Prescription Items ─────────────────────────────────────┐     │
│  │  1. Paracetamol 500mg                                     │     │
│  │     Route: [Oral ▼]  Frequency: [PRN ▼]                  │     │
│  │     Duration: [7 วัน]  Quantity: [14]  Refills: [0]       │     │
│  │     Instructions: [รับประทานเมื่อมีอาการ ไม่เกิน 4 เม็ด/วัน] │     │
│  │     [🗑️ Remove]                                            │     │
│  │                                                           │     │
│  │  ⚠️ SAFETY ALERTS:                                        │     │
│  │  (none for this prescription)                              │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  [💾 Save Prescription] [🖨️ Print]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Prescription Fields (Per Drug)

| Field | Options |
| ----- | ------- |
| Drug Name | From database search |
| Generic Name | Auto-populated |
| Dosage | Free text |
| Strength | From database |
| Route | Oral, Injection, Topical, Inhaled, Sublingual |
| Frequency | OD, BID, TID, QID, PRN, QHS, QOD |
| Duration | Days |
| Quantity | Number |
| Refills | Number |
| Instructions | Free text (Thai) |

---


## 4. Safety Features


### Allergy Alert

```text
⚠️ ALLERGY WARNING
Drug: Amoxicillin (Penicillin group)
Patient allergy: Penicillin
Action: BLOCKED - Cannot prescribe
```


### Drug Interaction Warning

```text
⚠️ DRUG INTERACTION
Warfarin + Aspirin → Increased bleeding risk
Severity: High
Recommendation: Monitor INR closely or consider alternatives
```

---


## 5. Workflows


### Workflow: Create Prescription

```text
Step 1: Open Prescribing modal for patient
Step 2: System loads patient's allergies and current medications
Step 3: Search for drug in database
Step 4: Click "Add" → Drug added to prescription list
Step 5: System checks for allergy conflicts → Alert if found
Step 6: System checks for drug interactions → Warning if found
Step 7: Fill dosage, route, frequency, duration, quantity, instructions
Step 8: Add more drugs as needed
Step 9: Click "Save Prescription"
Step 10: Digital signature applied
Step 11: POST /api/patients/:id/health-logs → Prescription saved
Step 12: Patient notified of new prescription
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/medications/search` | Search drug database |
| POST | `/api/prescriptions` | Create prescription |
| GET | `/api/patients/:id/allergies` | Get patient allergies |
| GET | `/api/patients/:id/medications` | Get current medications |
| POST | `/api/patients/:id/health-logs` | Save to patient health logs |

---


## 7. AI Agent Improvement Opportunities


- **AI dose calculation**: Adjust doses based on renal/hepatic function


- **Smart drug selection**: AI suggest drugs based on diagnosis


- **Formulary integration**: AI check insurance formulary coverage


- **Adherence prediction**: AI predict medication adherence likelihood


- **Alternative suggestions**: AI suggest equally effective lower-cost alternatives

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| prescriptions | INSERT | Create new prescriptions linked to EMR |
| drugs | SELECT | CDS check: interactions, contraindications, dosage limits |
| cds_logs | INSERT | Clinical Decision Support audit trail |
| emr | SELECT/UPDATE | Link prescription to EMR record |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/prescriptions | POST | INSERT prescriptions; SELECT drugs for CDS check; INSERT cds_logs |


### Clinical Decision Support (CDS)


- **Drug Interaction Check:** SELECT FROM drugs WHERE interactions overlap with patient's current medications


- **Contraindication Check:** Cross-reference patient allergies and conditions


- **Dosage Validation:** Verify dosage within safe range for patient profile


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
