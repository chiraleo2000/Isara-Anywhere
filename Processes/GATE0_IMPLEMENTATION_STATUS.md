# GATE 0 — Appointment Sync (Implementation Status)

**Last updated:** May 22, 2026 (v1.7.15)  
**Gate rule:** No Phase 1 (Jitsi/Lab/SSO) work until G1–G10 pass on Cloud.

## Jitsi v1.7.15 (no login, meeting room visible)

- `join-config` + `identity` APIs resolve display name from Izara registration
- Izara lobby only; Jitsi `lobbyModeEnabled=false`
- Patient `/meeting/:id` public; guest `/guest-join/:id` (patient, family, admin observer)
- `host-ready` / `host-present` before patient/guest Jitsi embed
- UI test IDs: `patient-meeting-room`, `doctor-meeting-room`, `jitsi-meeting-container`
- Cloud fallback: meeting pages auto-resolve Meeting Server URL from `*.run.app` origin when runtime env incorrectly points to localhost

## Enterprise roles (Teams/Zoom on Jitsi)

| Role | Appointment | Jitsi |
|------|-------------|-------|
| Patient | Creates request (`in_pool` or `pending`) | Participant, lobby |
| Admin | Triage / assign from pool only | Not moderator |
| **Assigned doctor** | Confirms `awaiting_doctor_response` → `confirmed` | **HOST** (`moderator=true` on doctor URL) |

## Canonical statuses

| Status | Next actor |
|--------|------------|
| `in_pool` | Admin assign or doctor claim |
| `awaiting_doctor_response` | **Assigned doctor** confirms (not admin in normal flow) |
| `confirmed` | Doctor starts meeting as HOST |

## Code changes (GATE 0)

| Area | Files |
|------|--------|
| Single pool source | PostgreSQL `appointments` only; patient GCS pool POST deprecated |
| Pool UI filter | `AppointmentPoolManagement.tsx` — `status` / `in_pool` |
| Rich queue DTO | `appointmentQueueMapper.cjs`, pool GET in `mainApiServer.cjs` |
| WebSocket | Doctor `Dockerfile.unified` `/ws` → port **3009** |
| NOTIFY | `pgNotifyListener.cjs` / `.ts` — dedicated `pg.Client`, rooms `doctor-{id}`, `admin-notifications`, `queue-{id}` |
| Realtime UI | `useRealtimeSync.ts`, `DoctorDashboard.tsx`, `DashboardPage.tsx`, `HealthMeeting.tsx` |
| Scale | `cloudbuild.yaml` `--min-instances=1`; optional `REDIS_URL` + `socketRedisAdapter.cjs` |
| Verify | `scripts/verify-cloud-appointment-sync.mjs`, Playwright Group D + `group-D-doctor-host-workflow` |

## Acceptance G1–G10

| Gate | Verification |
|------|----------------|
| G1–G5 | `node scripts/verify-cloud-appointment-sync.mjs` |
| G6–G8 | Playwright Group D + `D-doctor-host` |
| G9–G10 | Playwright **Group Q** (`group-Q-meeting-lifecycle.ui-test.ts`) — 3-party admit + recording/Gemini |

```powershell
$env:TEST_ENV='cloud'
npm run test:e2e:pipeline
```

## Related Processes docs

Update these when changing behavior: `Appointment_Workflows.md`, `Data_Sync_Documentation.md`, `VIDEO_MEETING_JITSI_GEMINI.md`, `Pages/Doctor-Portal/06_Health_Meeting_Page.md`, `Pages/Doctor-Portal/20_Appointment_Pool_Management.md`, `Pages/Patient-Portal/05_Appointments_Page.md`, `Notification_Workflows.md`.
