> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §B`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Admin assignment, pool claim, status FSM (B2–B4) — edit canonical copy in platform `Processes/`.

### B2. Admin Appointment Assignment

**Pages:** `AdminAppointmentManagement.tsx`
**API:** `PUT /api/admin/appointments/:id/assign`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Admin views all pending appointments
2. Options:
   a. AI Auto-Assign: Gemini matches specialty → doctor
   b. Manual Assign: Admin picks doctor from dropdown
   c. Reject: Admin rejects with reason
3. UPDATE appointments SET doctor_id, status = 'confirmed'
4. Generate Jitsi room name and meeting links
5. INSERT notifications (patient: confirmed + link)
6. INSERT notifications (doctor: new patient assigned)
```


## Features


- AI specialty-to-doctor matching


- Manual override


- Reject with reason


- Stats dashboard (pending/assigned/total)


- Tab-based filtering

---


### B3. Doctor Appointment Claim (Pool)

**Pages:** `AppointmentPoolManagement.tsx`
**API:** `PUT /api/appointments/:id/claim`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Doctor views pool of unassigned appointments
2. Filter by matching specialty
3. Doctor clicks "Claim" on appointment
4. UPDATE appointments SET doctor_id = claiming doctor
5. Status: pending → doctor_claimed → confirmed
6. Generate meeting links
7. Notify patient of assignment
```

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
