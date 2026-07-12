# Clinical Document Delivery — Operations Guide

## Purpose

Ensure every signed clinical output reaches the patient **เอกสารทางการแพทย์** inbox with audit trail and notifications.

## Operator Checklist (Local Gate)

1. `docker compose --env-file .env.docker up -d`
2. Apply migration `v2.3.0-patient-documents-and-messages.sql`
3. `npm run docker:probe-health`
4. Doctor: sign EMR → verify patient Documents + Treatment Results
5. Doctor: lab PDF upload → verify patient Lab tab + download
6. Doctor: prescription save → verify patient Prescriptions tab
7. `npm run phase:0` … `phase:9`

## Output Specs

- **EMR report:** UTF-8 text or PDF; title `รายงานการรักษา EMR`
- **Instruction sheet:** Thai plain language; `instruction_sheet` type
- **Lab/Imaging:** PDF or image; max 10MB per file
- **Prescription:** Medication list + sig block

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Empty Documents tab | `patient_documents` table exists; EMR status `signed` |
| 401 on health-logs | Doctor token in CompleteEMREditor fetch headers |
| Lab PDF missing | `PUT .../results` includes `documents[]` base64 |

## Notification Types

- `emr_signed`, `lab_results`, `imaging_results`, `prescription_ready`, `doctor_message`, `document_delivered`
