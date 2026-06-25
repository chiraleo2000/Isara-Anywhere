> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §P`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Real-time patient queue — edit canonical copy in platform `Processes/`.

## P. Queue Management Workflow


### P1. Real-Time Patient Queue

**Pages:** `QueueManagement.tsx` (embedded in Health Meeting)
**Tables:** `appointments`

```text
Process:
1. Shows today's confirmed appointments ordered by time
2. Stats: average wait time, seen count, remaining
3. Doctor actions per patient:
   - CALL → status: 'in_progress', open meeting
   - SKIP → move to back of queue
   - COMPLETE → status: 'completed'
   - NO SHOW → mark absent
4. Wait time calculated per patient
5. Estimated remaining time displayed
```

---
