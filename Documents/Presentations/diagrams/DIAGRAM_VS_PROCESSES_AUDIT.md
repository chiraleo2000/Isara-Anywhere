# Diagram vs Processes Audit

**Date:** 2026-07-09  
**Scope:** `Documents/Presentations/diagrams/*.mmd` aligned to `Processes/` after unified document delivery remediation.

| Diagram | Processes source | Status | Notes |
|---------|------------------|--------|-------|
| 01-system-architecture | System_Overview | OK | No change required |
| 02-patient-features | Patient_Portal_Features | OK | PHR documents implied via 11 |
| 03-doctor-features | Doctor_Portal_Features | **Updated** | Added patient messaging + `patient_documents` delivery on orders |
| 04-appointment-workflow | Appointment_Workflows | OK | Pool consolidated into Health Meeting (route redirect) |
| 05-database-schema | izara-database.sql | Partial | `patient_documents` in SQL; diagram refresh via `diagrams:report` |
| 06-emr-workflow | EMR_Workflows | **Updated** | Sign → `patient_documents` (emr_report + instruction_sheet) |
| 07-ai-integration | AI_Integration | OK | — |
| 08-security-rbac | Security_RBAC | OK | PDPA gates unchanged |
| 09-deployment | Deployment | OK | — |
| 10-video-meeting-flow | Meeting_Workflows | OK | Validate publishes instruction_sheet |
| 11-phr-management | PHR_Processes | **Updated** | Added MEDICAL DOCUMENTS subgraph (`patient_documents`) |
| 12-prescription-workflow | Prescription_Workflows | **Updated** | Dispatch includes `patient_documents` + notification |
| 24-document-delivery-flow | Clinical_Document_Delivery_Workflows | **New** | Canonical unified delivery diagram |

## Gaps closed in this remediation

- All clinical artifacts (EMR, lab, imaging, Rx, instruction sheet, patient upload) route through `patient_documents`.
- Doctor→patient messaging documented in `Notification_Workflows.md` (`doctor_message` type).
- Appointment pool UI merged into `/health-meeting?tab=queue` with `AppointmentQueueCard`.

## Regeneration

Run after code changes:

```bash
npm run diagrams:report
npm run guides:all
```
