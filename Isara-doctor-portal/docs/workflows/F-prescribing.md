> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §F`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** E-prescribing workflow — edit canonical copy in platform `Processes/`.

## F. Prescriptions Workflow


### F1. E-Prescribing

**Pages:** `CompletePrescribing.tsx` (modal)
**API:** `POST /api/prescriptions`
**Tables:** `prescriptions`, `drugs`, `phr`, `cds_logs`

```text
Process:
1. Doctor opens prescribing modal from EMR
2. Patient allergies displayed prominently
3. Current medications shown
4. Doctor searches drug database
5. Select drug → auto-populate dosage forms
6. Set: dose, frequency, duration, route, instructions
7. CDS checks run automatically:
   - Allergy alert (if match found)
   - Drug interaction alert (if conflict)
   - Dose adjustment alert (if renal/hepatic)
8. Doctor reviews warnings, decides to proceed or modify
9. Add multiple medications to prescription
10. Submit → INSERT prescriptions
11. Notification → patient
```


## Features


- Real-time drug search


- Allergy cross-check


- Drug interaction warnings


- Dosage form auto-complete


- Multi-medication prescription


- CDS audit trail

---
