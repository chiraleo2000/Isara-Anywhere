# Appointment Workflows — Patient

> **SSOT source:** `Processes/Appointment_Workflows.md §0–2`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## 0. Login & Authentication

- **Patient**
  - Logs in via Patient Portal (`LoginPage.tsx`)
  - Accesses dashboard, appointment booking, health logs

- **Doctor/Admin**
  - Logs in via Doctor Portal (`DoctorDashboard.tsx`)
  - Admin is also a doctor with elevated privileges
  - Admin can book/accept/assign appointments + manage doctor roles

---

## 1. Appointment Booking (Patient Side)

- **Options**
  - System-assigned (Patient chooses "Let system assign doctor") or specific doctor selection
  - Invite relatives/consultants
  - Choose online (telemedicine) or onsite appointment

- **Process**
  - Patient fills out symptoms (with AI assistance), preferred date/time, doctor selection, invitees
  - Can attach voice recordings or images for symptom description
  - AI analyzes symptoms and suggests urgency level + specialty
  - Submits request
  - Backend creates appointment record:
    - Patient info, doctor preference, invitees, symptoms, requested date/time
    - Status: `pending` (if doctor selected) or `in_pool` (if system-assigned)
    - Type: `online` or `onsite`

---

## 2. Patient Queue - Appointments Awaiting Confirmation

### IMPORTANT: Patient Queue shows ALL pending appointments from ALL dates (not just today)

- **Location**: "Appointments & Meetings" page (`HealthMeeting.tsx`) → Patient Queue tab

- **What appears in Patient Queue**:
  - ALL appointments with status: `pending`, `in_pool`, `awaiting_doctor_response`, `assigned`
  - Sorted by: Urgency (emergency → urgent → normal) then by creation date (FIFO)

- **Doctor View**:
  - Sees only appointments assigned to them
  - Can confirm or decline appointments

- **Admin View**:
  - Sees ALL pending appointments (regardless of doctor assignment)
  - Can assign unassigned appointments to doctors
  - Can confirm appointments directly

- **Confirmation Process**:
  1. Doctor/Admin clicks "Confirm Appointment" on a queue item
  2. Modal shows: Patient info, requested date/time, AI analysis
  3. Doctor/Admin sets CONFIRMED date and time (can modify from patient's request)
  4. Doctor/Admin adds optional notes
  5. On confirm: Meeting link generated, status → `confirmed` (row **updated**, never deleted)
  6. **Recently Accepted** section: today's `confirmed` rows remain visible in Patient Queue for traceability (`GET /api/appointment-pool?includeAccepted=true`)

- **State machine** (PostgreSQL `appointments.status`):

```
in_pool → awaiting_doctor_response → confirmed → in_progress → completed
         ↘ declined_by_doctor → in_pool (patient portal may cancel)
```
