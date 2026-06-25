# I. Living Will Workflow

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §I`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## I. Living Will Workflow


### I1. Living Will Creation (4-Step Wizard)

**Pages:** `LivingWillPage.tsx`
**API:** `POST /api/phr/living-will`
**Tables:** `living_wills`, `living_will_versions`

```text
Process:
Step 1: Healthcare Representatives (ตัวแทน)
  - Add proxy contacts (name, phone, relation)
  - Set priority order

Step 2: Medical Treatment Preferences (ความต้องการ)
  - CPR preferences
  - Mechanical ventilation
  - Tube feeding
  - Pain management level
  - Organ donation preference

Step 3: Digital Signature (ลายเซ็น)
  - Canvas signature pad
  - Date of signing
  - Witness information

Step 4: Share Settings (แชร์)
  - PDPA consent toggle
  - Share with all authorized doctors OR private
  - Review summary

Final: INSERT living_wills + INSERT living_will_versions (v1)
```

---


### I2. Living Will Sharing

```text
Process:
1. Patient sets is_shared_with_doctors = true
2. All doctors with patient_consents access can see it
3. Displayed prominently in Doctor Portal → Patient Record Viewer → PHR tab
4. Every access logged in living_wills.audit_log JSONB
```

---