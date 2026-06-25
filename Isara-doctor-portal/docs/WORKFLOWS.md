# Isara Doctor Portal — Workflows

## E2E projects (standalone smoke)

- `A-auth`
- `C-doctor-portal`
- `D-appointments`
- `E-meeting-clinical`
- `F-phr-health-records`
- `L-lab-ordering`

## Platform sources

- Processes/Appointment_Workflows.md (pool admin, schedule)
- Processes/VIDEO_MEETING_JITSI_GEMINI.md (doctor HOST)
- Processes/POST_MEETING_WORKFLOW.md (man-in-loop)
- Processes/Separated_Workflows_And_Functions.md (A,B,E–G,O,P,K,L)

## Standalone mode

Set `STANDALONE_MODE=1` and base URL `http://localhost:3010` when running `npm run test:standalone`.
