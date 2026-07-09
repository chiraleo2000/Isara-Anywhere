# GATE 0 — นัดหมาย Sync (Implementation สถานะ)

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `GATE0_IMPLEMENTATION_STATUS.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`GATE0_IMPLEMENTATION_STATUS.md`](../GATE0_IMPLEMENTATION_STATUS.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่


**อัปเดตล่าสุด:** June 10, 2026 (v1.7.48)  
**Gate rule:** Local `npm run test:local:pre-deploy-gate` must pass before cloud deploy; cloud G1–G10 via `npm run test:cloud:deploy-gate`.

## Jitsi v1.7.15 (no login, meeting room visible)

- `join-config` + `identity` APIs resolve display name from Izara registration
- Izara lobby only; Jitsi `lobbyModeEnabled=false`
- Patient `/meeting/:id` public; guest `/guest-join/:id` (patient, family, admin observer)
- `host-ready` / `host-present` before patient/guest Jitsi embed
- UI test IDs: `patient-meeting-room`, `doctor-meeting-room`, `jitsi-meeting-container`
- Cloud fallback: meeting pages auto-resolve Meeting Server URL from `*.run.app` origin when runtime env incorrectly points to localhost

## Enterprise roles (Teams/Zoom on Jitsi)

| Role | นัดหมาย | Jitsi |
|------|-------------|-------|
| ผู้ป่วย | Creates request (`in_pool` or `pending`) | Participant, lobby |
| ผู้ดูแลระบบ | Triage / มอบหมาย from pool only | Not moderator |
| **Assigned แพทย์** | Confirms `awaiting_doctor_response` → `confirmed` | **HOST** (`moderator=true` on แพทย์ URL) |

## Canonical statuses

| สถานะ | Next ผู้ดำเนินการ |
|--------|------------|
| `in_pool` | Admin assign or doctor claim |
| `awaiting_doctor_response` | **Assigned doctor** confirms (not admin in normal flow) |
| `confirmed` | Doctor starts meeting as HOST |

## Code changes (GATE 0)

| Area | Files |
|------|--------|
| Single pool source | PostgreSQL `appointments` only; ผู้ป่วย GCS pool POST deprecated |
| Pool UI filter | `AppointmentPoolManagement.tsx` — `status` / `in_pool` |
| Rich queue DTO | `appointmentQueueMapper.cjs`, pool GET in `mainApiServer.cjs` |
| WebSocket | Doctor `Dockerfile.unified` `/ws` → port **3009** |
| NOTIFY | `pgNotifyListener.cjs` / `.ts` — dedicated `pg.Client`, rooms `doctor-{id}`, `admin-notifications`, `queue-{id}` |
| เรียลไทม์ UI | `useRealtimeSync.ts`, `DoctorDashboard.tsx`, `DashboardPage.tsx`, `HealthMeeting.tsx` |
| Scale | `cloudbuild.yaml` `--min-instances=1`; optional `REDIS_URL` + `socketRedisAdapter.cjs` |
| Verify | `scripts/verify-cloud-appointment-sync.mjs`, Playwright Group D + `group-D-doctor-host-workflow` |

## Acceptance G1–G10 (local + cloud parity)

| Gate | Local (Docker) | Cloud (dev-testing) |
|------|----------------|---------------------|
| G1–G5 | `npm run verify:gate0:local` — pool → มอบหมาย → ยืนยัน API chain | `npm run verify:gate0` — same script against Cloud Run URLs |
| G6–G8 | Playwright Group D + `D-doctor-host` in `test:local:e2e-full` (`PW_HEADED=1`) | `TEST_ENV=cloud` Group D + D-host smoke in `test:cloud:deploy-gate` |
| G9–G10 | Group Q meeting lifecycle (`PW_SKIP_LIVE_GEMINI=1` locally) | Group Q smoke + **one** live probe `npm run verify:cloud-meeting-ai` |

**Local URLs:** ผู้ป่วย `:3005`, แพทย์ `:3010`, meeting `:3020`, Postgres `:5433`  
**Cloud URLs:** from `.env.cloud` / `deploy-cloud-from-env.ps1` smoke output (dev-testing revision)

```powershell
# Local (mandatory before deploy)
npm run test:local:pre-deploy-gate

# Cloud (after local green)
npm run test:cloud:deploy-gate

# Cloud doc screenshots (Round 2b — PNGs from Cloud Run only)
npm run test:cloud:doc-screenshots
npm run docs:sync-screenshots
npm run guides:all
```

## Related Processes docs

Update these when changing behavior: `Appointment_Workflows.md`, `Data_Sync_Documentation.md`, `VIDEO_MEETING_JITSI_GEMINI.md`, `Pages/Doctor-Portal/06_Health_Meeting_Page.md`, `Pages/Doctor-Portal/20_Appointment_Pool_Management.md`, `Pages/Patient-Portal/05_Appointments_Page.md`, `Notification_Workflows.md`.