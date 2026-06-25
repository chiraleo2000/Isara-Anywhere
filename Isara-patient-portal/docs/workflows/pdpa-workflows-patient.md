# PDPA — Patient Consent

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §J + Living_Will §4.2 Step 3`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## J. PDPA Consent Workflow


### J1. Privacy Consent Management

**Pages:** `PDPAPage.tsx`
**API:** `PUT /api/pdpa/consent`
**Tables:** `patient_consents`, `audit_logs`

```text
Process:
Tab 1: Privacy Settings
  - Toggle data sharing categories (vitals, medications, conditions, etc.)
  - Each toggle UPDATE patient_consents

Tab 2: Doctor Access
  - View list of doctors with access
  - Grant specific doctor access
  - Revoke doctor access (UPDATE patient_consents.revoked_at)

Tab 3: Access History
  - View audit trail of who accessed what data
  - SELECT audit_logs WHERE patient_id = current user
  - Shows date, doctor name, action, data accessed
```

---

---

## Living Will PDPA sharing (from Living_Will_Processes.md)

#### Step 3: PDPA Consent & Sharing Settings

1. Patient must accept PDPA consent checkbox
2. Patient chooses sharing preference:
   - **🔒 Keep Private** - Only patient can view
   - **🌐 Share with Doctors** - All authorized doctors & admins can view
3. System explains: "If you share, ALL doctors who have treated you and hospital administrators will be able to see your Living Will"
