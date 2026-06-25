> **SSOT source:** `Processes/Appointment_Workflows.md`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Pool admin, schedule, and confirm flows — edit canonical copy in platform `Processes/`.

## Doctor/Admin Appointment Confirmation

- **From Patient Queue Tab**:
  - View all pending appointment requests
  - See patient details, symptoms, AI triage, urgency level
  - Confirm with date/time selection
  - Decline with reason

- **Process**:
  1. Doctor/Admin reviews patient request in queue
  2. Clicks "Confirm Appointment"
  3. Sets final appointment date and time
  4. **For telehealth appointments**: System generates Jitsi Meet link automatically
  5. Status: `confirmed`
  6. **Notifications sent**:
     - In-app notification to patient
     - Email with meeting link (Thai template)
     - Meeting link saved to appointment record
  7. Appointment moves to "Scheduled Meetings" tab

**Status flow:**

```text
in_pool → awaiting_doctor_response → confirmed → in_progress → completed
         ↘ declined_by_doctor → in_pool (patient portal may cancel)
```

## Admin-Only: All Appointments Tab

- Search by patient name/email
- Filter by status
- Assign unassigned appointments
- View complete appointment history

## Notification & Calendar Update on Confirm

When the **assigned doctor** confirms via `POST /api/appointments/:id/confirm`:

| Step | Component | Detail |
|------|-----------|--------|
| 1 | `mainApiServer.cjs` | Sets `status=confirmed`, Jitsi URLs (`doctor_meeting_url`, `patient_meeting_url`, `guest_meeting_url`) |
| 2 | `calendarEventLinks.cjs` | Builds `calendarEventUrl` — Google Calendar TEMPLATE link |
| 3 | `GET /api/schedule/:doctorId` | Returns confirmed dates and `meetingLink` |
| 4 | Patient notifications | `appointment_confirmed` + `meeting_link_ready` |
| 5 | Doctor notification | `schedule_entry_ready` with `calendarEventUrl` |

## Doctor portal — Schedule page (`/schedule`)

| UI element | File | Behavior |
|------------|------|----------|
| Route | `DoctorPortal.tsx` → `schedule/CompleteSchedule.tsx` | Canonical schedule component |
| Data load | `fetchAllAppointments()` → `GET /api/appointments` | Filter by `doctor_id` + status `confirmed` \| `scheduled` |
| Join link | Telehealth rows | `data-testid="schedule-meeting-link"` → Izara Video Meeting |

> **GATE 0:** Assigned doctor confirms and is Jitsi HOST; admin assigns only. Pool = PostgreSQL `in_pool`.
