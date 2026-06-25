> **SSOT source:** `Processes/POST_MEETING_WORKFLOW.md`, `Processes/Appointment_Workflows.md` §10
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Man-in-the-loop validation and EMR delivery — edit canonical copy in platform `Processes/`.

## Post-Meeting Pipeline Overview

After the doctor ends a telehealth consultation:

1. Stop recording and persist media to meeting server / storage
2. Finalize transcript segments (Web Speech + optional Google STT)
3. Generate Gemini AI summary (SOAP-oriented)
4. Present results on **MeetingResults** page for doctor review
5. Doctor validates → EMR auto-fill → patient instruction sheet delivery

## Status State Machine

```text
in_progress → ended → processing → results_ready
```

## Doctor Workflow Steps

| Step | Actor | Action | Component |
|------|-------|--------|-----------|
| 1 | Doctor | Click **End meeting** | `MeetingRoom.tsx` → `POST /api/meetings/:id/end` |
| 2 | System | Stop recording | `POST /api/meetings/:id/stop-recording` |
| 3 | System | Generate Gemini summary | `POST /api/meetings/:id/generate-summary` |
| 4 | Doctor | Open Meeting Results | `MeetingResults.tsx` → `GET /api/meetings/:id/results` |
| 5 | Doctor | Validate & approve | `POST /api/meetings/:id/validate` |
| 6 | System | Unlock patient delivery | Patient polls `GET /api/meetings/:id/consultation-result` |

## Man-in-the-Loop EMR Flow

1. AI generates SOAP draft from transcript + PHR context
2. Doctor opens EMR Editor — approve, edit, or reject each section
3. All decisions logged in `ai_validations`
4. Doctor signs EMR → `status='signed'` → patient notification
5. Patient-visible content excludes internal CDS warnings and doctor-only notes

## Key Tables

- `meeting_records` — `ai_summary`, `doctor_validation_status`, `ready_for_patient`
- `ai_validations` — doctor approval audit trail
- `emr`, `patient_instructions` — signed clinical output

**Tests:** `postMeetingWorkflow.integration.test.ts` (PMW01–05), `meetingResultsValidation.test.ts` (MRV-01–05), E2E group Q.
