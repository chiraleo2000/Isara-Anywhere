# N. Notification Workflow

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §N`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## N. Notification Workflow


### N1. In-App Notification Delivery

**Component:** `NotificationBell.tsx`
**Tables:** `notifications`

```text
Process:
1. Event triggers notification (see types in section 9 of Combined doc)
2. INSERT INTO notifications (user_id, type, title, message, data)
3. PostgreSQL NOTIFY trigger fires
4. pgNotifyListener → Socket.IO emit('notification:new')
5. Client NotificationBell shows badge count
6. User clicks bell → panel opens
7. Click notification → navigate to relevant page
8. UPDATE notifications SET read_at = NOW()
9. "Mark All Read" → bulk update
```

---