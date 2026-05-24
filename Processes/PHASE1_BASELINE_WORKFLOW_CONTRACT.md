# Phase 1 Baseline Must-Pass Workflow Contract

This contract defines the minimum workflow behavior that must pass before deep regression cycles.
Source of truth: `Processes/Appointment_Workflows.md`, `Processes/VIDEO_MEETING_JITSI_GEMINI.md`, `Processes/GATE0_IMPLEMENTATION_STATUS.md`, `Processes/Data_Sync_Documentation.md`, `Processes/System_Architecture_Overview.md`.

## Canonical Runtime Topology

- Patient portal: frontend `http://localhost:3005`, API process `:3004` (dev) or unified `:3005` (docker)
- Doctor portal: frontend `http://localhost:3010`, auth API `:3011`, main API + Socket.IO `:3009` (`/ws`)
- Jitsi meeting server: API + Socket.IO `http://localhost:3020`
- PostgreSQL (single source of truth): `izara_phase1` on `:5432` internal / `:5433` docker host
- Real-time path: PostgreSQL `NOTIFY data_changes` -> `pgNotifyListener` -> Socket.IO room emits

## Must-Pass Workflow Contract

1. **Auth + access control**
   - Patient/doctor/admin login succeeds with JWT and role-scoped route access.
   - Doctor/admin pages are protected from patient tokens and vice versa.

2. **Appointment lifecycle**
   - Booking creates `pending` (doctor selected) or `in_pool` (system assigned).
   - Admin can assign pool requests to doctor -> `awaiting_doctor_response`.
   - Assigned doctor confirms -> `confirmed` with generated meeting URLs.
   - Decline and cancel flows set terminal statuses and trigger notifications.

3. **Meeting role and lobby contract**
   - Assigned doctor is HOST/moderator for confirmed appointment meeting.
   - Patient and guests join lobby and require host admission.
   - Guest join (including non-registered) requires token/display-name path and host approval.

4. **Realtime sync contract**
   - Appointment updates propagate to doctor/admin/patient rooms without manual refresh.
   - Queue/pool/dashboard updates arrive from DB-triggered events (not file polling).

5. **Post-meeting clinical contract**
   - Meeting transcript/chat can be persisted and used for AI summary generation.
   - AI output requires doctor validation (approve/edit/reject) before patient delivery.
   - Signed EMR/instruction output is visible to patient history flows.

## Baseline Environment Prerequisites

- `JWT_SECRET` must be set consistently across doctor, patient, and jitsi services.
- `DATABASE_URL` (or DB host/user/password parts) must point all services to same `izara_phase1` database.
- `CORS_ORIGINS` must include local patient/doctor origins and any cloud run origins in use.
- Socket.IO path must be `/ws` for portal clients and backend servers.
- DB triggers for realtime sync must be installed (`scripts/database/v2.2.0-notify-triggers.sql`).
- `pgNotifyListener` must run in doctor and patient backends (dedicated LISTEN client).
- Jitsi/Gemini variables required for meeting/AI flows:
  - `JITSI_DOMAIN` (default `meet.jit.si`)
  - `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY`

## Fast Quality Gate (Phase 1 baseline)

- Doctor portal: `lint`, `type-check`, `build`
- Patient portal: `lint`, `type-check`, `build`
- Jitsi server: `build` (no lint/type-check scripts defined in package)

Passing this contract is required before full regression and workflow hardening phases.
