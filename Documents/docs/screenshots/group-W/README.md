# Group W — Docker multi-browser UI evidence

Verified by `npm run test:e2e:docker:core-multibrowser` (2026-06-05).

| File | Workflow step |
|------|---------------|
| `W01-patient-dashboard.png` | Patient portal dashboard after auth |
| `W01-doctor-dashboard.png` | Doctor portal dashboard |
| `W01-admin-dashboard.png` | Admin dashboard |
| `W02-appointments-list.png` | Patient appointments list |
| `W02-appointment-created.png` | Confirmed appointment in list |
| `W03-health-meeting.png` | Doctor Health Meeting / queue |
| `W03-appointment-pool.png` | Appointment Pool management |
| `W04-doctor-virtual-meeting.png` | Doctor virtual meeting route |
| `W04-patient-meeting-room.png` | Patient meeting room shell |
| `W05-patient-detail.png` | Doctor patient detail view |
| `W05-emr-editor.png` | EMR editor with autosave status |
| `W06-gemini-studio-open.png` | Gemini AI Studio (FAB modal) |
| `W06-gemini-api-connected.png` | API Connected badge |

- **Canonical PNGs** (this folder): Chromium captures for guides
- **`browsers/`**: per-engine copies (chromium, firefox, webkit)
- **Refresh:** `npm run docs:sync-screenshots` after a green E2E run
- **Guide:** [../markdown/testing/DOCKER_MULTIBROWSER_E2E.md](../markdown/testing/DOCKER_MULTIBROWSER_E2E.md)

Demo data only — seeded test users (`PATIENT-DEMO`, `DOC-TEST-001`, `ADMIN-TEST-001`).
