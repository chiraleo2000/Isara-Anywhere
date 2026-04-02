# 📅 Doctor Portal — Schedule Page

**Route:** `/schedule`
**Component:** `src/pages/CompleteSchedule.tsx`
**Access:** 🔒 Doctor / Admin
**Thai Title:** ตารางนัดหมาย / Schedule

---

## 1. Purpose

View and manage the doctor's appointment schedule with day/week/month views, meeting join links, and status tracking.

---

## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📅 ตารางนัดหมาย (Schedule)                                         │
│                                                                     │
│  View: [วัน (Day)] [สัปดาห์ (Week)] [เดือน (Month)]                 │
│                                                                     │
│  ┌── Today's Schedule ─────────────────────────────────────────┐   │
│  │  🟢 09:00  นายสมชาย มั่นคง — เบาหวาน Follow-up              │   │
│  │           Telehealth · 🟢 Confirmed                         │   │
│  │           [📹 Join Meeting]                                  │   │
│  │                                                              │   │
│  │  🟡 10:30  นายอานันท์ ขยันเรียน — ปวดหัว                     │   │
│  │           Telehealth · 🟡 Pending                            │   │
│  │                                                              │   │
│  │  🟢 14:00  นางสมศรี ดีงาม — ความดันโลหิตสูง                  │   │
│  │           In-person · 🟢 Confirmed                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌── Upcoming Appointments ────────────────────────────────────┐   │
│  │  22 ม.ค.  09:00  นายสมชาย — Follow-up     🟢 Confirmed     │   │
│  │  23 ม.ค.  11:00  นางสมศรี — Lab Review    🟡 Pending       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Features

| Feature | Description |
| ------- | ----------- |
| **View modes** | Day / Week / Month (list-based) |
| **Today's schedule** | Highlighted section for today's appointments |
| **Status badges** | Completed (green), Confirmed (emerald), Cancelled (red), Pending (blue) |
| **Join Meeting** | Google Meet/Jitsi join button for telehealth appointments |
| **Upcoming** | Future appointments list |
| **Filter by doctor** | Auto-filtered by logged-in doctor's ID |

---

## 4. Workflows

### Workflow: View Daily Schedule

```text
Step 1: Navigate to /schedule
Step 2: GET /api/appointments filtered by doctorId
Step 3: Today's appointments displayed with times
Step 4: Confirmed telehealth shows "Join Meeting" button
Step 5: Click "Join Meeting" → Opens Jitsi in new tab
```

---

## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Fetch doctor's appointments |

---

## 6. AI Agent Improvement Opportunities

- **Smart scheduling**: AI optimize appointment spacing

- **No-show prediction**: AI predict likelihood of patient no-shows

- **Buffer management**: AI suggest break times based on appointment complexity

- **Calendar sync**: AI sync with external calendars (Google, Apple)

---

## PostgreSQL Database Integration

### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| doctor_schedules | SELECT/INSERT/UPDATE/DELETE | CRUD time slots for doctor availability |
| appointments | SELECT | View scheduled appointments in calendar |

### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/schedules | GET | SELECT doctor_schedules WHERE doctor_id |
| PUT /api/schedules | PUT | INSERT/UPDATE/DELETE doctor_schedules |
| GET /api/appointments | GET | SELECT appointments WHERE doctor_id |

### Real-time Events

- **NOTIFY:** schedule_changes channel → Socket.IO schedule:updated event

### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
