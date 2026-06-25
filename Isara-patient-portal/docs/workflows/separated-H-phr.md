# H. PHR Management Workflow

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §H`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## H. PHR Management Workflow


### H1. Vital Signs Recording

**Pages:** `PHRPage.tsx` → Vital Signs tab
**API:** `POST /api/phr/vital-signs`
**Tables:** `vital_signs`, `phr`

```text
Process:
1. Patient navigates to PHR → Vital Signs tab
2. Enter measurements:
   - Blood pressure (systolic/diastolic)
   - Heart rate
   - Temperature
   - Respiratory rate
   - Oxygen saturation
   - Blood glucose
   - Weight / Height
3. Submit → INSERT vital_signs
4. Calculate BMI if weight+height provided
5. UPDATE phr SET vital_signs_history (append)
6. Display trend charts over time
```

---


### H2. Medication Management

**Pages:** `PHRPage.tsx` → Medications tab
**API:** `PUT /api/phr`
**Tables:** `phr.medications`

```text
Process:
1. Patient views current medications list
2. Add new: name, dose, frequency, start_date
3. Edit existing medication
4. Mark as discontinued
5. UPDATE phr SET medications = updated JSONB array
```

---


### H3. Allergy Management

**Pages:** `PHRPage.tsx` → Allergies tab
**API:** `PUT /api/phr`
**Tables:** `phr.allergies`

```text
Process:
1. Patient views allergy list
2. Add: allergen, reaction, severity
3. Edit or remove existing
4. UPDATE phr SET allergies = updated JSONB array
5. Cross-referenced during prescribing (CDS)
```

---
