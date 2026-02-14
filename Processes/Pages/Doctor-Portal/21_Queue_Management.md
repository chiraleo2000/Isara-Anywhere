# 📋 Doctor Portal — Queue Management

**Component:** `src/pages/QueueManagement.tsx`  
**Type:** Component (embedded in Health Meeting)  
**Access:** 🔒 Doctor / Admin  
**Thai Title:** จัดการคิว / Queue Management

---

## 1. Purpose

Real-time patient queue for today's confirmed appointments with call/skip/complete functionality and wait time tracking.

---

## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 Queue Management                                                │
│                                                                     │
│  Stats: [⏱️ Avg Wait: 15 min] [✅ Seen: 5] [⏳ Remaining: 3]      │
│         (estimated 15 min/patient)                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔵 IN PROGRESS  นายสมชาย มั่นคง        09:00              │   │
│  │  เบาหวาน Follow-up · Routine                                │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ⏳ WAITING  นายอานันท์ ขยันเรียน        10:00               │   │
│  │  ปวดหัว · Urgent                                             │   │
│  │  [📢 Call] [⏭️ Skip]                                        │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ⏳ WAITING  นางสมศรี ดีงาม              10:30               │   │
│  │  ความดัน Follow-up · Routine                                 │   │
│  │  [📢 Call] [⏭️ Skip]                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [📢 เรียกคนถัดไป (Call Next Patient)]                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Queue States

| State | Icon | Description |
| ----- | ---- | ----------- |
| waiting | ⏳ | Patient waiting in queue |
| in-progress | 🔵 | Currently being seen |
| completed | ✅ | Consultation done |
| skipped | ⏭️ | Skipped with reason |

---

## 4. Features

| Feature | Description |
| ------- | ----------- |
| **Auto-sort** | By appointment time |
| **Priority badges** | Urgent / Routine visual indicators |
| **Call Next** | Calls next patient in queue |
| **Call Specific** | Call any waiting patient |
| **Skip** | Skip with reason (modal) |
| **Polling** | Refreshes every 30 seconds |
| **Wait estimate** | 15 min/patient calculation |

---

## 5. Workflows

### Workflow: Process Patient Queue

```text
Step 1: Queue loads today's confirmed appointments
Step 2: Auto-polling refreshes every 30 seconds
Step 3: Doctor clicks "Call Next Patient"
Step 4: Top waiting patient marked as in-progress
Step 5: Doctor conducts consultation
Step 6: After meeting → Patient marked completed
Step 7: Next patient automatically highlighted
Step 8: Skip with reason if patient unavailable
```

---

## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Today's confirmed appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |

---

## 7. AI Agent Improvement Opportunities

- **Dynamic wait times**: AI calculate realistic per-patient estimates
- **No-show prediction**: AI identify likely no-shows early
- **Queue optimization**: AI suggest reordering based on urgency changes
- **Patient notifications**: AI send wait time updates to patients
