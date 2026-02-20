# 📴 Mobile Offline Mode & Data Synchronization

**Version:** 1.0  
**Module:** Phase 2 — Mobile App  
**Status:** 📋 Planning  
**Related:** [11_Mobile_App_Description.md](11_Mobile_App_Description.md), [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md)

---

## 1. Overview

The Izara Dr. Anywhere mobile app must provide a meaningful experience even without internet connectivity. Users should be able to view cached data, record health information, draft EMRs (doctors), and queue actions for sync when connectivity returns.

### 1.1 Offline Strategy: Cache-First + Sync Queue

```text
┌──────────────────────────────────────────────────────────┐
│                   OFFLINE ARCHITECTURE                    │
│                                                          │
│   ┌─────────────┐     ┌──────────────┐                   │
│   │ App UI      │────▶│ Data Layer   │                   │
│   │ (Screens)   │◀────│ (Zustand +   │                   │
│   └─────────────┘     │  TanStack Q) │                   │
│                       └──────┬───────┘                   │
│                              │                           │
│                    ┌─────────┴─────────┐                 │
│                    ▼                   ▼                  │
│            ┌──────────────┐   ┌──────────────┐           │
│            │ SQLite Cache │   │ Sync Queue   │           │
│            │ (Read Cache) │   │ (Write Queue)│           │
│            └──────┬───────┘   └──────┬───────┘           │
│                   │                  │                    │
│         ┌────────┴────────┐         │                    │
│         ▼        ▼        ▼         ▼                    │
│     Appointments PHR  Notifs   Pending Writes            │
│     Profiles    Content         (POST/PUT/DELETE)        │
│                                                          │
│   ──── Network Boundary ──────────────────────────────── │
│                                                          │
│            ┌──────────────────────────┐                   │
│            │   Backend API Servers    │                   │
│            │   (Izara REST + WS)     │                   │
│            └──────────────────────────┘                   │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Principles

| Principle | Description |
| ----------- | ------------- |
| **Cache-First** | Always show cached data first, then update from network |
| **Optimistic Updates** | Apply changes locally immediately, sync to server in background |
| **Conflict Resolution** | Server wins (last-write-wins for simple data), manual merge for complex data |
| **Queue Persistence** | Offline actions survive app restart (SQLite) |
| **Sync Indicator** | Show sync status: "Up to date", "Syncing...", "X changes pending" |
| **Selective Caching** | Cache only what's needed; sensitive data encrypted |
| **Battery Conscious** | Don't sync too frequently; batch small writes |

---

## 2. Feature-Level Offline Behavior

### 2.1 Patient Mode

| Feature | View Offline | Create/Edit Offline | Sync Behavior |
| --------- | :----------: | :------------------: | --------------- |
| Dashboard | ✅ Cached | — | Refresh on reconnect |
| Appointment List | ✅ Cached | ❌ Cannot book | Refresh on reconnect |
| Appointment Detail | ✅ Cached | ❌ Cannot cancel/reschedule | — |
| PHR Overview | ✅ Cached | ✅ Edit offline → queue | Sync edits on reconnect |
| Vital Signs | ✅ Cached + charts | ✅ Record offline → queue | Batch sync vitals |
| Medications | ✅ Cached | ✅ Add/edit → queue | Sync on reconnect |
| Allergies | ✅ Cached | ✅ Add/edit → queue | Sync on reconnect |
| Timeline | ✅ Cached | — | Refresh on reconnect |
| Health Logs | ✅ Cached | — | Read-only |
| Living Will | ✅ Cached | ✅ Draft offline | Sync on reconnect |
| AI Chat | ❌ Requires network | ❌ | Show FAQ cache |
| Symptom Checker | ❌ Requires network | ❌ | Show "Requires connection" |
| Health Library | ✅ Bookmarked only | — | Download on bookmark |
| Map (Nearby) | ⚠️ Last viewed | ❌ No GPS search | Cached map tiles |
| Video Meeting | ❌ Requires network | ❌ | Show "Requires connection" |
| Profile | ✅ Cached | ✅ Edit → queue | Sync edits on reconnect |
| Notifications | ✅ Cached | — | New ones arrive when online |
| Medication Reminders | ✅ Local notifications | — | Work offline (scheduled) |
| PDPA Settings | ✅ Cached | ❌ | Changes need network |
| Payment | ❌ Requires network | ❌ | — |

### 2.2 Doctor Mode

| Feature | View Offline | Create/Edit Offline | Sync Behavior |
| --------- | :----------: | :------------------: | --------------- |
| Dashboard | ✅ Cached | — | Refresh on reconnect |
| Schedule | ✅ Cached | ❌ Cannot confirm/decline | Refresh on reconnect |
| Patient List | ✅ Cached recent | — | — |
| Patient PHR Viewer | ✅ Cached if viewed | — | Read-only cache |
| Create EMR | — | ✅ Draft → queue | Sync on reconnect |
| View EMR | ✅ Cached if viewed | — | Read-only cache |
| E-Prescribing | — | ✅ Draft → queue | Requires review before sync |
| Lab Orders | — | ✅ Draft → queue | Requires network to submit |
| Queue Management | ✅ Cached | ✅ Mark status → queue | Sync on reconnect |
| Video Meeting | ❌ Requires network | ❌ | — |
| AI Studio | ❌ Requires network | ❌ | Show cached FAQ |
| Medical Calculators | ✅ All work offline | ✅ | No network needed |
| Content Management | ✅ Cached my articles | ✅ Draft → queue | Sync on reconnect |
| Admin Functions | ✅ Cached stats | ❌ Actions need network | — |

---

## 3. SQLite Cache Schema

### 3.1 Cache Tables (expo-sqlite + SQLCipher)

```sql
-- Generic cache table for API responses
CREATE TABLE api_cache (
    cache_key TEXT PRIMARY KEY,           -- e.g., "/api/appointments?page=1"
    data TEXT NOT NULL,                    -- JSON response body (compressed)
    etag TEXT,                             -- Server ETag for conditional requests
    cached_at TEXT NOT NULL,               -- ISO timestamp
    expires_at TEXT,                        -- TTL expiry (nullable = forever)
    role TEXT NOT NULL,                     -- 'patient' or 'doctor'
    content_type TEXT DEFAULT 'json'        -- 'json', 'html', 'image'
);

-- Sync queue for offline writes
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,                  -- 'POST', 'PUT', 'DELETE'
    endpoint TEXT NOT NULL,                -- API endpoint path
    body TEXT,                              -- JSON request body
    headers TEXT,                           -- JSON additional headers
    role TEXT NOT NULL,                     -- 'patient' or 'doctor'
    priority INTEGER DEFAULT 5,            -- 1 (highest) to 10 (lowest)
    status TEXT DEFAULT 'pending',         -- 'pending', 'syncing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    idempotency_key TEXT UNIQUE            -- Prevent duplicate submissions
);

-- Vital signs recorded offline
CREATE TABLE offline_vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,                    -- 'blood_pressure', 'heart_rate', etc.
    value TEXT NOT NULL,                    -- JSON: { systolic: 120, diastolic: 80 }
    measured_at TEXT NOT NULL,
    source TEXT DEFAULT 'manual',          -- 'manual', 'healthkit', 'googlefit'
    synced INTEGER DEFAULT 0,
    sync_queue_id INTEGER,
    created_at TEXT NOT NULL
);

-- EMR drafts saved offline (doctor)
CREATE TABLE offline_emr_drafts (
    id TEXT PRIMARY KEY,                   -- UUID
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    soap_data TEXT NOT NULL,               -- JSON SOAP format
    status TEXT DEFAULT 'draft',           -- 'draft', 'queued_for_sync'
    synced INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Bookmarked articles for offline reading
CREATE TABLE offline_articles (
    article_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,                 -- Full HTML/markdown
    cover_image_path TEXT,                 -- Local file path
    category TEXT,
    author TEXT,
    cached_at TEXT NOT NULL
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority);
CREATE INDEX idx_api_cache_role ON api_cache(role);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
```

---

## 4. Cache Strategy (TanStack Query)

### 4.1 Cache Timing

| Data Type | staleTime | cacheTime (gcTime) | Background Refetch |
| ----------- | ----------- | ------- | ------------------- |
| User Profile | 5 min | 24 hours | On app resume |
| Appointment List | 1 min | 1 hour | Every 60 seconds |
| Appointment Detail | 2 min | 1 hour | On screen focus |
| PHR Data | 5 min | 24 hours | On tab focus |
| Vital Signs | 5 min | 24 hours | On scroll to section |
| Medication List | 10 min | 24 hours | On tab focus |
| AI Chat History | 30 sec | 30 min | On chat open |
| Health Library | 30 min | 7 days | On library open |
| Doctor Queue | 15 sec | 5 min | Every 15 seconds |
| Patient List (Doctor) | 2 min | 1 hour | On search |
| Notifications | 30 sec | 1 hour | On bell tap |

### 4.2 Conditional Requests (ETag)

```text
First request:
  GET /api/appointments
  → Response: { data: [...], headers: { ETag: "abc123" } }
  → Cache in SQLite with etag = "abc123"

Subsequent request:
  GET /api/appointments
  Headers: { If-None-Match: "abc123" }
  
  → 304 Not Modified: Use cached data (save bandwidth)
  → 200 OK: New data, update cache
```

### 4.3 Persisted Query Cache

```text
TanStack Query + SQLite Persistence:

App Launch:
  1. Load cached queries from SQLite → hydrate TanStack Query cache
  2. Render screens immediately with stale data
  3. Refetch in background for fresh data
  4. Update UI when fresh data arrives

App Backgrounded:
  1. Serialize active query cache to SQLite
  2. Persist pending mutations (sync queue)

Result: Instant app start → data visible in < 100ms
```

---

## 5. Sync Queue System

### 5.1 Queue Processing

```text
┌──────────────────────────────────────────────────────────┐
│                    SYNC QUEUE PROCESSOR                    │
│                                                          │
│  Triggers:                                               │
│  1. Network status changes: offline → online             │
│  2. App foreground resume (if online)                    │
│  3. Manual "Sync Now" button                             │
│  4. Background fetch (iOS) / WorkManager (Android)       │
│                                                          │
│  Process:                                                │
│  1. Check network connectivity                           │
│  2. Get pending items sorted by priority (ASC)           │
│  3. For each item:                                       │
│     a. Set status = 'syncing'                            │
│     b. Send request to API                               │
│     c. If success:                                       │
│        - Set status = 'completed'                        │
│        - Update local cache with server response         │
│        - Delete from queue                               │
│     d. If failure (4xx):                                 │
│        - Set status = 'failed'                           │
│        - Store error message                             │
│        - Don't retry (client error)                      │
│        - Notify user                                     │
│     e. If failure (5xx / network):                       │
│        - Increment retry_count                           │
│        - If retry_count < 5: keep as 'pending'           │
│        - If retry_count >= 5: mark 'failed', notify user │
│        - Exponential backoff: 2^n seconds                │
│  4. Emit sync progress events (for UI)                   │
│  5. Update "Last synced" timestamp                       │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Priority Levels

| Priority | Category | Example |
| :--------: | ---------- | --------- |
| 1 | Authentication | Token refresh |
| 2 | Medical Critical | EMR submission, prescription |
| 3 | Appointment Actions | Booking confirmation |
| 4 | Health Data | Vital signs upload, PHR edits |
| 5 | Profile Updates | Profile changes |
| 6 | Non-critical | Bookmarks, read receipts |
| 7 | Analytics | Usage tracking |

### 5.3 Idempotency

Every write action includes an idempotency key to prevent duplicate submissions:

```text
User records blood pressure offline:
  → Generate UUID: "vital-bp-2026-02-15-14-30-uuid123"
  → Store in sync_queue with idempotency_key

When syncing:
  → POST /api/phr/vitals
  → Headers: { X-Idempotency-Key: "vital-bp-2026-02-15-14-30-uuid123" }
  
Server checks:
  → If key seen before → return cached response (no duplicate)
  → If key new → process and store key
```

---

## 6. Conflict Resolution

### 6.1 Strategy: Last-Write-Wins with Merge

```text
Scenario: User edits profile offline, another change happens on web

1. User edits phone number on mobile (offline at 14:00)
   Local: { phone: "0812345678", updated_at: "14:00" }
   Queue: PUT /api/profile { phone: "0812345678" }

2. User edits email on web (at 14:05)
   Server: { email: "new@email.com", updated_at: "14:05" }

3. Mobile comes online (14:10), syncs queue
   PUT /api/profile { phone: "0812345678" }
   
4. Server applies:
   Merge non-conflicting fields:
   { phone: "0812345678", email: "new@email.com", updated_at: "14:10" }
   
   If same field changed → Server value wins (newer timestamp)
```

### 6.2 Complex Conflict (EMR)

For medical records, auto-merge is dangerous. Use manual resolution:

```text
Doctor drafts EMR offline → queues for sync
Server already has EMR for same appointment (edited by another doctor)

Conflict detected:
  → Don't auto-merge
  → Show conflict resolution screen:
  
  ┌────────────────────────────────────────┐
  │  ⚠️ Conflict Detected                  │
  │                                        │
  │  EMR for appointment #APT-2026-0234    │
  │  has been modified by another user.    │
  │                                        │
  │  [View Server Version]                 │
  │  [View Your Version]                   │
  │  [Keep Server] [Keep Mine] [Merge]     │
  └────────────────────────────────────────┘
```

---

## 7. Network Status UI

### 7.1 Network Indicator Banner

```text
Online (default):
  → No banner shown
  → Normal app operation

Offline:
  ┌────────────────────────────────────────┐
  │ 📴 ออฟไลน์ — ข้อมูลอาจไม่เป็นปัจจุบัน  │
  │    Offline — Data may not be current   │
  └────────────────────────────────────────┘
  → Orange banner at top of screen
  → All screens show cached data
  → Write actions stored in queue

Syncing:
  ┌────────────────────────────────────────┐
  │ 🔄 กำลังซิงค์ (3 รายการ)...             │
  │    Syncing (3 items)...                │
  └────────────────────────────────────────┘
  → Blue banner with progress bar

Sync Error:
  ┌────────────────────────────────────────┐
  │ ❌ ซิงค์ไม่สำเร็จ 2 รายการ               │
  │    2 items failed to sync  [View]      │
  └────────────────────────────────────────┘
  → Red banner with "View" to see failed items
```

### 7.2 Per-Screen Staleness

```text
Appointment List:
  ┌────────────────────────────────────────┐
  │  📅 Appointments                       │
  │  อัปเดตเมื่อ 5 นาทีที่แล้ว              │
  │  Last updated 5 minutes ago            │
  │                                        │
  │  [Appointment Card 1]                  │
  │  [Appointment Card 2]                  │
  └────────────────────────────────────────┘
  → Shows "Last updated X ago" when data is stale
  → Pull-to-refresh triggers network fetch
```

---

## 8. Background Sync

### 8.1 iOS Background Fetch

```text
Using expo-background-fetch:
  
  Register background task: "IZARA_SYNC_TASK"
  Minimum interval: 15 minutes (iOS controls actual timing)
  
  Task:
  1. Check if there are pending sync items
  2. If yes → process sync queue
  3. If wearable connected → fetch latest health data
  4. Update badge count for notifications
  5. Return .newData / .noData / .failed
```

### 8.2 Android WorkManager

```text
Using expo-task-manager + WorkManager:
  
  Register periodic task: "IZARA_SYNC_WORK"
  Interval: 15 minutes
  Constraints: { networkType: 'connected', batteryNotLow: true }
  
  Task:
  1. Process sync queue
  2. Fetch wearable data
  3. Update notification badge
  4. Respect battery optimization settings
```

---

## 9. Data Size Management

### 9.1 Cache Limits

| Cache Type | Max Size | Eviction Policy |
| ----------- | ---------- | ----------------- |
| API Response Cache | 50 MB | LRU (Least Recently Used) |
| Offline Articles | 100 MB | Manual delete by user |
| Article Images | 50 MB | LRU, oldest first |
| EMR Drafts | 10 MB | Never auto-delete |
| Sync Queue | 20 MB | Completed items deleted |
| Wearable Data Buffer | 5 MB | Cleared after sync |
| **Total Max** | **~235 MB** | |

### 9.2 Cache Cleanup

```text
Periodic cleanup (daily):
  1. Delete completed sync items older than 7 days
  2. Delete expired API cache entries
  3. Evict LRU items if cache > limit
  4. Compact SQLite database (VACUUM)
  5. Report cache size in Settings > Storage

Settings > Storage:
  ┌────────────────────────────────────────┐
  │  💾 Storage Usage                      │
  │                                        │
  │  API Cache:         12.3 MB            │
  │  Offline Articles:  23.1 MB            │
  │  EMR Drafts:         1.2 MB            │
  │  Sync Queue:         0.5 MB            │
  │  Total:             37.1 MB            │
  │                                        │
  │  [Clear Cache]  [Clear Articles]       │
  └────────────────────────────────────────┘
```

---

## 10. Backend Sync Endpoints

| Method | Endpoint | Description |
| -------- | ---------- | ------------- |
| `POST` | `/api/sync/pull` | Pull latest data changes since timestamp |
| `POST` | `/api/sync/push` | Push queued changes from device |
| `POST` | `/api/sync/resolve` | Resolve conflicts |
| `GET` | `/api/sync/status` | Check sync status |
| `POST` | `/api/phr/vitals/batch` | Batch upload multiple vitals |
| `POST` | `/api/phr/wearable-sync` | Wearable data batch upload |

### 10.1 Pull Request

```json
// POST /api/sync/pull
{
    "last_sync_at": "2026-02-15T14:00:00Z",
    "role": "patient",
    "tables": ["appointments", "vitals", "medications", "notifications"]
}

// Response 200
{
    "changes": {
        "appointments": {
            "created": [...],
            "updated": [...],
            "deleted": ["uuid-1"]
        },
        "vitals": {
            "created": [...],
            "updated": [],
            "deleted": []
        }
    },
    "sync_at": "2026-02-15T14:10:00Z"
}
```

### 10.2 Push Request

```json
// POST /api/sync/push
{
    "changes": [
        {
            "table": "vitals",
            "method": "POST",
            "data": { "type": "blood_pressure", "value": { "systolic": 120, "diastolic": 80 } },
            "idempotency_key": "vital-bp-uuid123",
            "offline_created_at": "2026-02-15T14:00:00Z"
        },
        {
            "table": "profile",
            "method": "PUT",
            "data": { "phone": "0812345678" },
            "idempotency_key": "profile-update-uuid456",
            "offline_created_at": "2026-02-15T14:02:00Z"
        }
    ]
}

// Response 200
{
    "results": [
        { "idempotency_key": "vital-bp-uuid123", "status": "success", "server_id": "uuid-new" },
        { "idempotency_key": "profile-update-uuid456", "status": "success" }
    ],
    "conflicts": []
}
```

---

## 11. Related Documents

| Document | Relationship |
| ---------- | ------------- |
| [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | Token management during offline |
| [02_Mobile_API_Specifications.md](02_Mobile_API_Specifications.md) | API endpoints used for sync |
| [07_Mobile_Health_Records.md](07_Mobile_Health_Records.md) | Wearable sync detail |

---

### End of Mobile Offline Mode & Data Synchronization — February 2026
