# B. Appointment Workflow (Patient)

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §B`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## B. Appointment Workflow


### B1. Patient Booking

**Pages:** `AppointmentPages.tsx` → Book Appointment
**API:** `POST /api/appointments`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Patient navigates to /book-appointment
2. Step 1: Select specialty category
3. Step 2: Optionally select specific doctor
4. Step 3: Describe symptoms (text + structured)
5. AI Triage: Gemini analyzes symptoms
   → Urgency level (1-10)
   → Recommended specialty
   → Suggested doctor match
6. Step 4: Choose date and time slot
7. Submit booking
8. INSERT INTO appointments (status: 'pending')
9. INSERT INTO notifications (admin/doctor)
10. pg_notify → Socket.IO broadcast
```


## Features


- Multi-step booking wizard


- AI-assisted symptom analysis


- Doctor selection (optional — can be pool)


- Urgency triage


- Thai/English symptom input

---

---

### B4. Appointment Status State Machine

```text
pending ──→ in_pool ──→ ai_matched ──→ doctor_claimed ──→ confirmed
   │                                                          │
   └──→ declined                                      in_progress
                                                          │
                                                      completed
                                                          │
                                                      (or cancelled at any stage)
```

---