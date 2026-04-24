# 📋 Doctor Portal — Appointment Pool Management

**Component:** `src/pages/AppointmentPoolManagement.tsx`
**Access:** 🔒 Doctor / Admin
**Thai Title:** กลุ่มนัดหมายรอจัดสรร / Appointment Pool

---


## 1. Purpose

Doctors view and claim unassigned appointments matching their specialty. Manages the pool of appointments where patients didn't select a specific doctor or the selected doctor was unavailable.

---


## 2. Pool Flow

```text
Patient books without doctor → pending (pool)
       ↓
AI matches specialty → ai_matched
       ↓
Doctor claims → doctor_claimed
       ↓
Admin assigns → admin_assigned
       ↓
Confirmed → confirmed
       ↓
(or) Expired → expired
```

---


## 3. Tabs

| Tab | Content | Description |
| --- | ------- | ----------- |
| Pool | Pending + AI-matched | Available for claiming |
| Awaiting Response | Patient selected this doctor | Doctor must accept/reject |
| Claimed | Doctor already claimed | Awaiting admin confirmation |

---


## 4. Pool Reasons

| Reason | Description |
| ------ | ----------- |
| no_doctor_selected | Patient didn't choose a doctor |
| doctor_unavailable | Selected doctor unavailable |
| doctor_rejected | Doctor rejected the appointment |
| meeting_missed | Original meeting was missed |
| rescheduled | Rescheduled appointment |

---


## 5. Workflows


### Workflow 1: Claim from Pool

```text
Step 1: Doctor views pool appointments matching their specialty
Step 2: Reviews patient symptoms and urgency
Step 3: Clicks "Claim" → Proposes date/time
Step 4: POST /api/appointment-pool/:id/claim
Step 5: Status: doctor_claimed
Step 6: Awaits admin confirmation or direct confirmation
```


### Workflow 2: Respond to Patient Selection

```text
Step 1: Patient selected this doctor
Step 2: Doctor sees in "Awaiting Response" tab
Step 3: Click "Accept" → propose time → appointment confirmed
Step 4: Or "Reject" → appointment returns to pool
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointment-pool` | List pool appointments |
| POST | `/api/appointment-pool/:id/claim` | Claim appointment |
| PATCH | `/api/appointment-pool/:id/respond` | Accept/reject |
| POST | `/api/appointment-pool/:id/ai-match` | Trigger AI matching |

---


## 7. AI Agent Improvement Opportunities


- **Smart matching**: AI improve specialty matching accuracy


- **Workload balancing**: AI distribute pool assignments evenly


- **Predictive claiming**: AI suggest best-fit appointments for each doctor

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT/UPDATE | Pool appointments (status='in_pool', unassigned) |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/appointments/pool | GET | SELECT appointments WHERE status='in_pool' AND doctor_id IS NULL |
| PUT /api/appointments/:id/assign | PUT | UPDATE appointments SET doctor_id, status WHERE id |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
