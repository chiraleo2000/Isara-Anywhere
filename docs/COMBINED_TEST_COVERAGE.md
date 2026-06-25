# Combined test coverage — Separated Workflows A–P

**Platform release matrix:** standalone per-app CI + combined monorepo gate.

| ID | Workflow | Standalone proof | Combined proof | Unit pack |
|----|----------|------------------|----------------|-----------|
| A | Authentication & User Management | Patient/Doctor `test:standalone` A-auth | `phase:2`, `test:unit:auth` | authServer, patientLogin |
| B | Appointment Workflow | Patient B + Doctor D | `phase:5`, `test:unit:appointments` | appointmentWorkflowContract |
| C | Video Meeting | Meeting contract + Q | `phase:4`, `test:unit:meeting` | meetingUxContract |
| D | AI Processing Pipeline | Meeting post-meeting | `phase:3`, post-meeting pipeline | generateSummary.integration |
| E | EMR Documentation | Doctor E-meeting-clinical | `phase:7`, emrAiDraft | emrAiDraft.test.ts |
| F | Prescriptions | Doctor clinical | `phase:7`, prescribing | prescribingAllergy |
| G | Lab Orders | Doctor L-lab-ordering | `phase:7` | lab ordering unit |
| H | PHR Management | Patient B, F-phr | `phase:6`, phrDocuments | phrEmrUxContract |
| I | Living Will | Patient G-livingwill-pdpa | `phase:6` | livingWillContract |
| J | PDPA Consent | Patient G | `phase:6` | pdpaAudit.integration |
| K | Content Management | Patient H | `phase:6` | contentRoute |
| L | Clinical Resources | Doctor clinical | `phase:7` | clinical resources |
| M | Notifications | Patient I | `phase:6`, notifications unit | notificationWorkflowContract |
| N | Admin / Dashboard | Doctor C, I | `phase:2`, dashboard | telemedDashboard |
| O | Queue Management | Doctor D-queue | `phase:5` | queueAcceptTraceability |
| P | Workflow Screenshots | N/A (cloud doc gate) | `test:cloud:doc-screenshots` | P-workflow-screenshots |

## Gate commands

| Mode | Command |
|------|---------|
| Standalone (per app) | `npm run test:standalone` in each app repo |
| Standalone (all) | `npm run test:standalone:all` |
| Combined local | `npm run test:local:pre-deploy-gate` |
| Combined cloud | `npm run test:cloud:deploy-gate` |
| Process audit | `npm run test:audit:process` |

## Port matrix

See `scripts/multitask/port-matrix.json` — standalone PG 5434/5435/5436; platform full stack PG 5433.
