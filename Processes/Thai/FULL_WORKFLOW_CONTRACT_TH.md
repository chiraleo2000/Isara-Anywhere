# Full Workflow Contract (Canonical Hardening Baseline)

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `FULL_WORKFLOW_CONTRACT.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`FULL_WORKFLOW_CONTRACT.md`](../FULL_WORKFLOW_CONTRACT.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่


อัปเดตล่าสุด: 2026-07-09  
Source references: `Appointment_Workflows.md`, `VIDEO_MEETING_JITSI_GEMINI.md`, `GATE0_IMPLEMENTATION_STATUS.md`, `System_Architecture_Overview.md`, `Data_Sync_Documentation.md`

## วัตถุประสงค์

Define one authoritative pass contract for end-to-end workflow hardening across:

- `Isara-patient-portal`
- `Isara-doctor-portal`
- `Izara-jitsi-server`

This contract is the baseline acceptance reference for all regression runs and documentation updates.

## Global Invariants (Must Always Hold)

- Authentication and role guards block cross-role or unauthenticated access.
- นัดหมาย lifecycle follows allowed statuses only and preserves ownership integrity.
- Assigned แพทย์ is the only meeting host/moderator; patient/guest/admin are non-host participants.
- Meeting lobby admission is แพทย์-controlled and enforced for non-host joiners.
- Real-time updates propagate from PostgreSQL NOTIFY to Socket.IO and render once (no missed/duplicate UI state transitions).
- Clinical AI outputs are treated as draft until แพทย์ validation (Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)).
- ผู้ป่วย-visible outputs exclude internal แพทย์-only notes.

## Baseline Runtime Topology (from Phase 1 baseline contract)

| Service | Local URLs | Notes |
| ------- | ---------- | ----- |
| พอร์ทัลผู้ป่วย | UI `:3005`, API `:3004` (dev) / unified `:3005` (Docker) | Session auth |
| Doctor portal | UI `:3010`, auth `:3011`, API + Socket.IO `:3009` (`/ws`) | JWT + session |
| Meeting Server | `:3020` | Jitsi orchestration + AI pipeline |
| PostgreSQL | `izara_phase1` — host `:5433` / internal `:5432` | NOTIFY → Socket.IO |

**Prerequisites:** Shared `JWT_SECRET`, single `DATABASE_URL`, `CORS_ORIGINS` for all portals, triggers from `scripts/database/v2.2.0-notify-triggers.sql`, `pgNotifyListener` in ผู้ป่วย + แพทย์ backends.

Connection diagrams: [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md).

## Must-Pass Behaviors by Domain

### 1) Auth and Access

- ผู้ป่วย login/register/reset-password flows succeed and produce valid session state.
- Doctor/admin login works with role-specific routes and UI.
- Google SSO button/config loads and handles known success/redirect/fallback scenarios.
- Protected APIs reject missing/invalid JWT.
- Route guards prevent ผู้ป่วย access to doctor/admin routes and vice versa.

### 2) Appointment Lifecycle

- ผู้ป่วย booking creates นัดหมาย with valid initial state (`pending` or `in_pool`).
- ผู้ดูแลระบบ assignment transitions unassigned นัดหมาย to `awaiting_doctor_response`.
- Assigned แพทย์ confirmation transitions to `confirmed` with stable meeting metadata.
- Decline/cancel transitions are reflected to all relevant users and การแจ้งเตือน.
- Ownership fields (`doctorId`, `assignedDoctorId`, `confirmedBy`, fallback identifiers) remain consistent for queue/dashboard filtering.

### 3) Meeting Host/Lobby and Room Resolution

- แพทย์ join URL resolves as host and host controls appear.
- Patient/guest/admin join flows resolve to lobby-gated access where required.
- Invite and guest join links resolve to expected room identity and role.
- Transcript start/pause/resume/stop controls are host-scoped and persist meeting transcript state.
- Meeting room routes for doctor/patient/guest remain deterministic for the same นัดหมาย.

### 4) Realtime Sync (PG NOTIFY -> Socket.IO -> UI)

- นัดหมาย updates emit to expected rooms/channels.
- แพทย์ dashboard, นัดหมาย queue/pool, and ผู้ป่วย นัดหมาย views update without manual refresh.
- Notification streams appear once per event and avoid duplicate rendering.
- Listener wiring remains healthy under Cloud Run baseline settings (warm instance constraints).

### 5) Clinical ขั้นตอนการทำงานs (PHR/EMR/Prescribing/Lab)

- แพทย์ can open and submit EMR flows with นัดหมาย context.
- Prescribing and lab-order actions persist with correct appointment/patient linkage.
- PHR and health-record views display finalized ผู้ป่วย-safe data.
- Clinical permissions prevent unauthorized edits/reads across patients/roles.

### 6) Secondary ขั้นตอนการทำงานs

- PDPA consent and หนังสือแสดงเจตจำนอง flows are navigable, saveable, and retrievable.
- การแจ้งเตือน, timeline, settings, profile, AI/content/resources pages load and perform core actions.
- Major integrations degrade gracefully when optional providers are unavailable.

## Execution Gates

### Fast Quality Gate

- Lint passes for both portals.
- Type-check passes for both portals.
- Build passes for both portals.

### Regression Gate

- Full selected workflow regression suite passes twice consecutively after final fixes.
- No P0/P1 failures in auth, นัดหมาย, meeting/lobby, เรียลไทม์ sync, clinical workflows.

## Evidence to Capture

- Command history used for lint/type/build and regression suites.
- **Immutable error ledgers:** `reports/cloud-error-ledger/round-{N}-*.json` and `CLOUD_E2E_ERROR_LEDGER_ROUND{N}.md` (generate via `npm run ledger:cloud -- --round N`). No fixes until ledger exists for that round.
- Two consecutive successful full regression run summaries (`npm run test:cloud:hardening`).
- Updated manuals/docs/screenshot references reflecting validated behavior.

---

## Automated verification (Expanded Testing Program)

| Domain | Primary tests |
|--------|----------------|
| Auth | `tests/group-A-auth.ui-test.ts`, `tests/unit/patient-portal/authRoute.test.ts`, `tests/unit/doctor-portal/authServer.http.test.ts` |
| นัดหมาย | `tests/group-D-appointments.ui-test.ts`, `tests/unit/patient-portal/appointmentsRollback.test.ts` |
| Meeting / lobby | `tests/group-Q-meeting-lifecycle.ui-test.ts`, `tests/group-E-meeting-clinical.ui-test.ts`, `Izara-jitsi-server/tests/*.test.mjs` |
| เรียลไทม์ | `tests/group-I-notifications.ui-test.ts`, `tests/unit/doctor-portal/queueSocket.test.ts` |
| Clinical | `tests/group-E-meeting-clinical.ui-test.ts`, `tests/group-F-phr-health-records.ui-test.ts`, `emrAutosave.test.ts`, `prescribingAllergy.test.ts` |
| PDPA / หนังสือแสดงเจตจำนอง | `tests/group-G-pdpa-living-will.ui-test.ts`, `pdpaAudit.integration.test.ts` |
| Sync | `tests/unit/cross-portal/syncQueue.integration.test.ts` |

**Coverage matrix:** [tests/PROCESS_COVERAGE_MATRIX.md](../tests/PROCESS_COVERAGE_MATRIX.md)  
**Cloud pipeline:** `npm run test:e2e:pipeline` (includes Group Q)