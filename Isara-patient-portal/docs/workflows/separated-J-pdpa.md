# J. PDPA Consent Workflow

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §J`
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