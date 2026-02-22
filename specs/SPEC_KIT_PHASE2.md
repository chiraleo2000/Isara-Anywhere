# 📱 Spec Kit — Phase 2: AI-Based HIS & Mobile Application

**Version:** 2.2.0  
**Date:** February 22, 2026  
**Status:** 📋 Planning + Partial Backend Implementation  
**Codename:** "Dr. Anywhere" (หมอทุกที่)

---

## 1. Executive Summary

Phase 2 extends the Phase 1 web platform with a unified React Native mobile app (iOS/Android) featuring:
- Single app with patient/doctor role selection
- Offline-first with SQLite + cloud sync
- Biometric authentication
- Push notifications (FCM/APNS)
- Payment integration (Stripe + PromptPay)
- Wearable device data sync
- AI-HIS features (CTM, Geriatric Screening, SOS)

---

## 2. Mobile App Architecture

### 2.1 Unified App Navigation

```
app/
├── _layout.tsx              — Root (providers, theme, role context)
├── index.tsx                — Entry (role-based redirect)
├── (auth)/login|register    — Shared auth screens
├── (patient)/(tabs)/        — Patient tab nav (Dashboard, Appointments, Health, AI, Profile)
├── (doctor)/(tabs)/         — Doctor tab nav (Dashboard, Patients, Schedule, Queue, Profile)
├── meeting/[id]             — Full-screen video meeting
└── settings/                — App settings
```

### 2.2 Data Architecture (3-Layer)

| Layer | Technology | Scope | Sync |
|---|---|---|---|
| Layer 1 | SQLite (expo-sqlite) | Per-user encrypted local DB | Offline-first |
| Layer 2 | TanStack Query Cache | Cross-session shared data | In-memory |
| Layer 3 | PostgreSQL (Cloud) | Source of truth | REST API |

---

## 3. Phase 2 Feature Matrix

### 3.1 Mobile Authentication

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| MOB-AUTH-001 | Role Selection | All | Given app launch, When first time, Then show patient/doctor selection screen |
| MOB-AUTH-002 | Biometric Login | All | Given enrolled biometrics, When authenticating, Then fingerprint/face unlock |
| MOB-AUTH-003 | Secure Token Storage | System | Given tokens, When storing, Then encrypted in expo-secure-store |
| MOB-AUTH-004 | Token Rotation | System | Given refresh, When exchanging token, Then old refresh token revoked |
| MOB-AUTH-005 | Role Switch | All | Given dual-role user, When switching, Then API client and nav swapped without re-login |
| MOB-AUTH-006 | 2FA OTP | Doctor | Given doctor login, When required, Then OTP verification via email/SMS |

### 3.2 Offline & Sync

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| SYNC-001 | Offline Queue | System | Given no network, When user mutates data, Then queued in SQLite `offline_queue` |
| SYNC-002 | Auto Sync | System | Given reconnection, When network available, Then replay queued mutations FIFO |
| SYNC-003 | Conflict Resolution | System | Given server conflict (409), When syncing, Then server-wins merge, user notified |
| SYNC-004 | Cache First | System | Given cached data, When requesting, Then show cache immediately, refresh in background |
| SYNC-005 | Batch Sync | System | Given multiple queued items, When syncing, Then POST /api/sync/batch with idempotency keys |
| SYNC-006 | Delta Pull | System | Given lastSyncedAt, When pulling, Then only receive changes since last sync |

### 3.3 Push Notifications

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| PUSH-001 | Device Registration | System | Given app install, When FCM/APNS token obtained, Then POST /api/device-tokens |
| PUSH-002 | Appointment Reminder | Patient | Given upcoming appointment, When 1h before, Then push notification sent |
| PUSH-003 | Meeting Ready | Patient | Given doctor starts meeting, When ready, Then push with "Join Meeting" action |
| PUSH-004 | EMR Available | Patient | Given EMR finalized, When saved, Then push notification to patient |
| PUSH-005 | Notification Preferences | All | Given settings, When toggling, Then granular push category control |

### 3.4 Video Meeting (Mobile)

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| MOB-MEET-001 | Jitsi RN SDK | All | Given meeting, When joining, Then @jitsi/react-native-sdk renders full-screen |
| MOB-MEET-002 | PiP Mode | Patient | Given active meeting, When backgrounding app, Then Picture-in-Picture continues |
| MOB-MEET-003 | Host Controls | Doctor | Given meeting as host, Then mute/kick/lobby controls available |
| MOB-MEET-004 | Guest Invite | Doctor | Given meeting, When generating link, Then shareable invite for external participants |

### 3.5 AI-HIS Features

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| HIS-001 | CTM Assessment | Doctor | Given patient, When performing CTM, Then ธาตุเจ้าเรือน assessment with herbal recommendations |
| HIS-002 | Geriatric Screening | Doctor | Given elderly patient, When screening, Then MoCA/Barthel/GDS-15/TUGT/MNA/ADL/IADL/FAB battery |
| HIS-003 | SOS Alert | Patient | Given emergency, When pressing SOS, Then alert with GPS sent to care team |
| HIS-004 | Follow-Up Schedule | Doctor | Given completed appointment, When scheduling, Then follow-up with automated reminders |
| HIS-005 | Nursing Dashboard | Nurse | Given nursing role, When viewing dashboard, Then patient list with task assignments |
| HIS-006 | Predictive Analytics | Doctor | Given patient data, When analyzing, Then ML risk predictions displayed |

### 3.6 Payment Integration

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| PAY-001 | Stripe Payment | Patient | Given appointment fee, When paying, Then Stripe checkout with card/Apple Pay/Google Pay |
| PAY-002 | PromptPay QR | Patient | Given Thai payment, When selecting PromptPay, Then QR code generated |
| PAY-003 | Payment History | Patient | Given past payments, When viewing, Then list with receipts and status |

### 3.7 Health Records (Mobile Enhanced)

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| MOB-PHR-001 | Camera Scan OCR | Patient | Given document, When scanning with camera, Then AI extracts medical data |
| MOB-PHR-002 | Wearable Sync | Patient | Given connected wearable, When data arrives, Then vitals auto-recorded |
| MOB-PHR-003 | Offline Vitals | Patient | Given no network, When recording vitals, Then stored locally, synced later |
| MOB-PHR-004 | AI Voice Chat | Patient | Given AI page, When speaking, Then voice-to-text + AI response + text-to-speech |

### 3.8 PDPA & Privacy (Mobile)

| Feature ID | Feature | Actor | Acceptance Criteria |
|---|---|---|---|
| MOB-PDPA-001 | Consent on Install | Patient | Given first launch, When onboarding, Then PDPA consent collection before any data processing |
| MOB-PDPA-002 | Data Export | Patient | Given PDPA request, When exporting, Then all personal data downloadable as JSON/PDF |
| MOB-PDPA-003 | Data Deletion | Patient | Given PDPA request, When requesting deletion, Then all personal data purged within 30 days |
| MOB-PDPA-004 | Encryption at Rest | System | Given local SQLite, When storing PHI, Then database encrypted with user-specific key |

---

## 4. Phase 2 API Endpoints (Additions to Phase 1)

### Patient Portal Extensions

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/device-tokens | Auth | Register push notification device |
| GET | /api/device-tokens | Auth | List registered devices |
| DELETE | /api/device-tokens/:token | Auth | Deactivate device token |
| POST | /api/biometric/register | Auth | Register biometric credential |
| POST | /api/biometric/verify | Auth | Verify biometric login |
| GET | /api/biometric/status | Auth | Get biometric enrollment status |
| POST | /api/sync/push | Auth | Push offline mutations |
| GET | /api/sync/pull | Auth | Pull changes since timestamp |
| GET | /api/sync/conflicts | Auth | Get unresolved conflicts |
| POST | /api/sync/conflicts/:id/resolve | Auth | Resolve sync conflict |
| GET | /api/sync/status | Auth | Get sync status |
| POST | /api/sync/batch | Auth | Batch sync mutations (idempotent) |
| GET | /api/connections | Auth | List API connections |
| POST | /api/connections | Auth | Connect external service |
| DELETE | /api/connections/:type | Auth | Disconnect service |
| GET | /api/settings | Auth | Get user settings |
| PUT | /api/settings | Auth | Update user settings |

### Phase 2 HIS Endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/phase2/ctm-assessment | Auth | Create CTM assessment |
| GET | /api/phase2/ctm-assessment/:patientId | Auth | Get CTM history |
| POST | /api/phase2/geriatric-screening | Auth | Submit screening results |
| GET | /api/phase2/geriatric-screening/:patientId | Auth | Get screening history |
| POST | /api/phase2/sos-alert | Auth | Trigger SOS emergency |
| POST | /api/phase2/follow-up | Auth | Schedule follow-up |
| GET | /api/phase2/nursing-dashboard | Auth | Nursing task list |
| GET | /api/phase2/predictive-analytics/:patientId | Auth | Get risk predictions |

---

## 5. Phase 2 Database Additions (10 new tables)

### v2.0.0 Migration
```
device_tokens, biometric_credentials, refresh_tokens,
push_subscriptions, api_connections, offline_sync_queue, user_settings
```

### v2.1.0 Migration (AI-HIS)
```
ctm_assessments, geriatric_screenings, sos_alerts,
follow_up_schedules, nursing_dashboard, predictive_analytics
```

---

## 6. Mobile Local SQLite Schema

```sql
-- Per-user encrypted database
CREATE TABLE phr_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  data_type TEXT NOT NULL,  -- 'vitals' | 'medications' | 'allergies' | 'overview'
  payload TEXT NOT NULL,     -- JSON string
  synced_at TEXT,
  version INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  appointment_id TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  synced_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,       -- 'POST' | 'PUT' | 'DELETE'
  payload TEXT NOT NULL,       -- JSON string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'syncing' | 'completed' | 'failed'
  error TEXT,
  synced_at TEXT
);

CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  last_synced_at TEXT,
  etag TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_chat_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  messages TEXT NOT NULL,      -- JSON array
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  notification_id TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  synced_at TEXT
);
```

---

## 7. Security Requirements (Combined Phase 1 + Phase 2)

| Requirement | Phase 1 | Phase 2 |
|---|---|---|
| Password Policy | Min 8 chars (patient), 12 chars (doctor) | Unified: min 12 chars + upper/lower/digit/special |
| Session TTL | JWT 30m access, 7d refresh | Same + refresh token rotation |
| Rate Limiting | In-memory sliding window | Redis-backed (production) |
| CSRF | Doctor portal only | All portals |
| CORS | Whitelist | Same + mobile origins |
| Security Headers | Custom CSP/HSTS | `helmet()` + custom CSP |
| Audit Logging | File-based JSONL | PostgreSQL audit_logs table |
| Mobile Encryption | N/A | SQLite encrypted, SecureStore for tokens |
| Biometric | N/A | expo-local-authentication |
| Certificate Pinning | N/A | Production Cloud Run TLS pinning |

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Google Cloud Run                     │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Patient      │  │ Doctor       │  │ Meeting   │ │
│  │ Portal       │  │ Portal       │  │ Server    │ │
│  │ :3005        │  │ :8080        │  │ :3020     │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         └──────────┬───────┘               │        │
│                    ▼                       │        │
│           ┌───────────────┐                │        │
│           │  PostgreSQL   │◄───────────────┘        │
│           │  + pgvector   │                          │
│           └───────────────┘                          │
└─────────────────────────────────────────────────────┘
         ▲                    ▲
         │ REST API           │ REST API + Socket.IO
    ┌────┴─────┐         ┌───┴────┐
    │ Web      │         │ Mobile │
    │ Browsers │         │ App    │
    └──────────┘         └────────┘
                          ├── SQLite (local cache)
                          ├── SecureStore (tokens)
                          └── Push (FCM/APNS)
```
