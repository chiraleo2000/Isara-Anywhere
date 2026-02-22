# 🔗 Multi-Service API Token Management

**Version:** 1.0  
**Module:** Phase 2 — Mobile App  
**Status:** 📋 Planning  
**Related:** [11_Mobile_App_Description.md](11_Mobile_App_Description.md), [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md)

---

## 1. Overview

The Izara Dr. Anywhere mobile app manages connections to **multiple APIs and external services** simultaneously. Unlike the web platform that only connects to Izara backend servers, the mobile app acts as a hub that can connect to various healthcare services, wearable devices, payment providers, and external medical record systems — all managed through a unified token management system.

### 1.1 Design Principles

| Principle | Description |
| ----------- | ------------- |
| **User-Controlled** | Users choose which services to connect. No mandatory third-party connections. |
| **Add Later** | Services can be connected at any time, not just during setup |
| **Secure Storage** | All tokens encrypted via hardware-backed keychain/keystore |
| **Independent Lifecycle** | Each service token managed independently (add, refresh, revoke) |
| **Graceful Degradation** | App works without optional services. Only core Izara APIs required. |
| **Role-Aware** | Patient and Doctor modes show different available services |

---

## 2. Service Categories

### 2.1 Core Services (Auto-Managed)

These tokens are managed automatically through the login flow. Users don't manually manage them.

| Service | Base URL | Auth Type | Token Lifecycle | Used By |
| --------- | ---------- | ----------- | ----------------- | --------- |
| **Patient API** | `https://patient-api.izara.app` | JWT (Bearer) | 15min access / 30-day refresh | Patient mode |
| **Doctor Auth Server** | `https://doctor-auth.izara.app` | JWT (Bearer) | 15min access / 30-day refresh | Doctor mode |
| **Doctor Main API** | `https://doctor-api.izara.app` | JWT (Bearer) | Session-linked | Doctor mode |
| **Doctor GCS API** | `https://doctor-gcs.izara.app` | JWT (Bearer) | Session-linked | Doctor mode |
| **Meeting Server** | `https://meeting.izara.app` | JWT + Socket.IO | Per-meeting | Both |

#### Core Token Flow

```text
User Login (Patient or Doctor)
       │
       ▼
  ┌──────────────────────────────────┐
  │ POST /api/auth/login             │
  │  ├── email + password            │
  │  ├── device_id                   │
  │  └── biometric_token (optional)  │
  └──────────┬───────────────────────┘
             │
             ▼
  ┌──────────────────────────────────┐
  │ Response:                        │
  │  ├── access_token  (15min JWT)   │
  │  ├── refresh_token (30-day)      │
  │  ├── user profile + role         │
  │  └── server_endpoints {}         │
  └──────────┬───────────────────────┘
             │
             ▼
  ┌──────────────────────────────────┐
  │ Store in SecureStore:            │
  │  ├── izara_access_token          │
  │  ├── izara_refresh_token         │
  │  ├── izara_user_profile          │
  │  └── izara_active_role           │
  └──────────────────────────────────┘
```

### 2.2 Health & Wearable Services (User-Initiated)

| Service | Platform | Auth Type | Data Categories | Direction |
| --------- | ---------- | ----------- | ----------------- | ----------- |
| **Apple HealthKit** | iOS only | System Permission | Steps, Heart Rate, Sleep, SpO₂, Blood Glucose, Weight | Read + Write |
| **Google Fit / Health Connect** | Android | OAuth2 (Google) | Steps, Heart Rate, Sleep, Activity, Weight | Read + Write |
| **Samsung Health** | Android (Samsung) | SDK Key | Steps, Heart Rate, SpO₂, Blood Pressure | Read Only |
| **Fitbit** | Both | OAuth2 | Steps, Heart Rate, Sleep, Activity | Read Only |
| **Garmin Connect** | Both | OAuth2 | Steps, Heart Rate, Activity, Stress | Read Only |
| **Withings** | Both | OAuth2 | Weight, Blood Pressure, Sleep, SpO₂ | Read Only |

#### Wearable Connection Flow

```text
┌─────────────────────────────────┐
│ Settings > API Connections      │
│ > Health & Wearable             │
│ > [+ Connect Apple Health]      │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Permission Request              │
│                                 │
│ "Izara ต้องการเข้าถึงข้อมูล     │
│  สุขภาพของคุณ"                  │
│                                 │
│ ☑ อัตราการเต้นหัวใจ (Heart Rate)│
│ ☑ จำนวนก้าว (Steps)            │
│ ☑ การนอนหลับ (Sleep)           │
│ ☑ น้ำหนัก (Weight)              │
│ ☐ SpO₂ (optional)              │
│                                 │
│ [อนุญาต / Allow]  [ไม่อนุญาต]  │
└──────────┬──────────────────────┘
           │ Allow
           ▼
┌─────────────────────────────────┐
│ HealthKit reads data categories │
│ Initial sync: last 30 days     │
│ Background sync: every 15 min  │
│ Store token: healthkit_granted  │
│ Notify backend: POST /vitals/  │
│   batch (vitals array)         │
└─────────────────────────────────┘
```

### 2.3 Payment Services (User-Initiated)

| Service | Auth Type | Storage | When Added |
| --------- | ----------- | --------- | ------------ |
| **Stripe** | Customer Session (server-created) | SecureStore key | First payment or in Settings |
| **Apple Pay** | Apple Wallet integration | Passkit (OS) | In Settings or during payment |
| **Google Pay** | Google Pay API | OS-level | In Settings or during payment |
| **PromptPay** | QR Code scanning | No token needed | Per-transaction |
| **TrueMoney Wallet** | OAuth2 redirect | SecureStore | In Settings |

#### Payment Token Flow

```text
┌──────────────────────────────────────────────────────────────┐
│ First Payment or Settings > Payment Methods > [+ Add Card]  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 1. Backend: POST /api/payments/create-customer          │ │
│  │    → Stripe customer_id created                         │ │
│  │                                                         │ │
│  │ 2. Backend: POST /api/payments/setup-intent             │ │
│  │    → Stripe setup_intent.client_secret returned         │ │
│  │                                                         │ │
│  │ 3. Mobile: @stripe/stripe-react-native                  │ │
│  │    → Show payment sheet with client_secret              │ │
│  │    → User enters card / Apple Pay / Google Pay          │ │
│  │                                                         │ │
│  │ 4. Stripe webhook → Backend                             │ │
│  │    → Payment method saved to customer                   │ │
│  │                                                         │ │
│  │ 5. Mobile: store stripe_customer_id in SecureStore      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 External Medical Services (User-Initiated)

These are optional integrations where users connect to external healthcare providers that expose APIs.

| Service | Auth Type | How User Adds | Data Exchange | Thai Example |
| --------- | ----------- | --------------- | --------------- | ------------- |
| **Hospital EHR** | API Key | Paste key from hospital portal | Pull EMR, lab results | BNH, Bumrungrad |
| **Pharmacy API** | API Key | Paste key from pharmacy | Prescription status, refills | Boots, Fasino |
| **Lab Service** | API Key | Paste key from lab portal | Lab results, orders | N-Health, BPK9 |
| **Insurance Provider** | OAuth2 | OAuth redirect to insurer | Coverage lookup, pre-auth | เมืองไทยประกัน, AIA |
| **Government Health** | Thai Digital ID | National ID verification | Vaccination records | สปสช., Digital Health Pass |

#### External API Key Connection Flow

```text
┌──────────────────────────────────────────────────────────────┐
│ Settings > API Connections > External Medical                │
│ > [+ Add Hospital EHR Connection]                            │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  เชื่อมต่อระบบโรงพยาบาล                                   │  │
│ │  Connect Hospital EHR                                    │ │
│ │                                                          │ │
│ │  Service Name:  [Bangkok Hospital_____________]          │ │
│ │  API Base URL:  [https://api.bangkokhospital.com]        │ │
│ │  API Key:       [sk_live_xxxxxxxxxxxxx________]          │ │
│ │                                                          │ │
│ │  ℹ️ Obtain your API key from your hospital's patient     │ │
│ │     portal under "API Access" or "Developer Settings"    │ │
│ │                                                          │ │
│ │  [Test Connection]     [Save / บันทึก]                   │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ On Save:                                                     │
│  1. Validate API key (test endpoint)                         │
│  2. Encrypt with AES-256                                     │
│  3. Store in SecureStore: ext_api_{service_id}               │
│  4. Register connection on Izara backend                     │
│  5. Show ✅ Connected status                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Token Storage Architecture

### 3.1 Storage Layers

```text
┌─────────────────────────────────────────────────────────────┐
│                     TOKEN STORAGE                            │
│                                                              │
│  Layer 1: SecureStore (Primary)                              │
│  ├── Uses iOS Keychain / Android Keystore                    │
│  ├── Hardware-backed encryption                              │
│  ├── Encrypted with device + user biometric binding          │
│  ├── Keys:                                                   │
│  │   ├── izara_access_token      (JWT, 15min)                │
│  │   ├── izara_refresh_token     (JWT, 30 days)              │
│  │   ├── izara_user_profile      (JSON, cached)              │
│  │   ├── izara_active_role       (string: patient|doctor)    │
│  │   ├── biometric_key           (RSA keypair ref)           │
│  │   ├── stripe_customer_id      (string)                    │
│  │   ├── ext_api_{service_id}    (encrypted API key)         │
│  │   ├── oauth_{provider}        (encrypted tokens)          │
│  │   └── device_registration_id  (FCM/APNS token)           │
│  │                                                           │
│  Layer 2: SQLite (Metadata)                                  │
│  ├── Uses expo-sqlite (encrypted)                            │
│  ├── Stores connection metadata (non-sensitive):             │
│  │   ├── service_name, service_type                          │
│  │   ├── connected_at, last_sync_at                          │
│  │   ├── status (active|expired|error)                       │
│  │   ├── data_categories (array)                             │
│  │   └── sync_frequency                                      │
│  │                                                           │
│  Layer 3: MMKV (Runtime Cache)                               │
│  ├── Fast key-value store                                    │
│  ├── Non-sensitive runtime data:                             │
│  │   ├── connection_count                                    │
│  │   ├── last_token_check_time                               │
│  │   └── pending_sync_count                                  │
│  │                                                           │
│  ❌ NEVER STORE:                                             │
│  ├── Tokens in AsyncStorage                                  │
│  ├── API keys in plaintext files                             │
│  ├── Tokens in React state (persist)                         │
│  └── Tokens in console.log / crash reports                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Encryption Details

| Item | Encryption | Key Derivation |
| ------ | ----------- | ---------------- |
| JWT Access Token | SecureStore default (AES-256-GCM on iOS, AES-256-CBC on Android) | Device hardware key |
| JWT Refresh Token | SecureStore + biometric binding | Hardware key + biometric |
| External API Keys | AES-256-GCM (app-level, then SecureStore) | PBKDF2 from user PIN + device ID |
| OAuth2 Tokens | SecureStore default | Device hardware key |
| Biometric Private Key | Secure Enclave (iOS) / StrongBox (Android) | Hardware-bound, non-exportable |

---

## 4. Token Management State Machine

### 4.1 Per-Service State

```text
                                    ┌──────────┐
                        ┌──────────▶│NOT ADDED │◀──── User removes
                        │           └────┬─────┘     service
                        │                │
                        │                │ User clicks
                        │                │ "Connect"
                        │                ▼
                        │           ┌──────────┐
               Remove   │   ┌──────▶│ PENDING  │     Awaiting auth /
               Service  │   │       └────┬─────┘     validation
                        │   │            │
                        │   │ Retry      │ Auth success +
                        │   │            │ token stored
                        │   │            ▼
                        │   │       ┌──────────┐
                        ├───┤       │  ACTIVE  │──── Token valid,
                        │   │       │  (Green) │     service connected
                        │   │       └────┬─────┘
                        │   │            │
                        │   │            │ Token expires
                        │   │            ▼
                        │   │       ┌──────────┐
                        │   │       │ REFRESHING│     Auto-refresh
                        │   │       └──┬────┬──┘     in progress
                        │   │          │    │
                        │   │  Success │    │ Fail
                        │   │          │    │
                        │   │          ▼    ▼
                        │   │     ACTIVE   ┌──────────┐
                        │   │              │ EXPIRED  │
                        │   └──────────────│ (Orange) │
                        │                  └────┬─────┘
                        │                       │
                        │                       │ Multiple retries fail
                        │                       ▼
                        │                  ┌──────────┐
                        └──────────────────│  ERROR   │
                                           │  (Red)   │
                                           └──────────┘
```

### 4.2 Status Display

| Status | Icon | Color | User Action |
| -------- | ------ | ------- | ------------- |
| Not Added | ⬜ | Gray | "Connect" button |
| Pending | ⏳ | Blue | "Waiting..." spinner |
| Active | ✅ | Green | "Manage" / "Disconnect" |
| Refreshing | 🔄 | Blue | Auto, no action needed |
| Expired | ⚠️ | Orange | "Re-authenticate" |
| Error | ❌ | Red | "Retry" / "Remove" |

---

## 5. API Connection Manager (Code Architecture)

### 5.1 Zustand Store

```text
apiConnectionStore
├── connections: Map<serviceId, ConnectionState>
├── coreTokens: {
│   ├── accessToken: string | null
│   ├── refreshToken: string | null
│   └── activeRole: 'patient' | 'doctor'
│   }
│
├── Actions:
│   ├── addConnection(serviceId, config) → Promise<void>
│   ├── removeConnection(serviceId) → Promise<void>
│   ├── refreshToken(serviceId) → Promise<void>
│   ├── getToken(serviceId) → string | null
│   ├── getConnectionStatus(serviceId) → ConnectionStatus
│   ├── syncAllConnections() → Promise<SyncResult>
│   └── validateAllTokens() → Promise<ValidationResult>
│
├── Hooks:
│   ├── useConnection(serviceId) → { status, connect, disconnect }
│   ├── useAllConnections() → ConnectionState[]
│   ├── useConnectionStatus(serviceId) → status
│   └── useCoreAuth() → { login, logout, switchRole }
│
└── Middleware:
    ├── Token Auto-Refresh (background interval)
    ├── Connection Health Check (every 5 min)
    └── Persist metadata to SQLite
```

### 5.2 API Client Factory

```text
Request Pipeline:
                                                  
  Feature Code                                    
       │                                          
       ▼                                          
  apiClient.get('/vitals')                        
       │                                          
       ▼                                          
  ┌─────────────────────────────────────────┐     
  │ API Client Factory                      │     
  │                                         │     
  │ 1. Determine service (Patient/Doctor/   │     
  │    Meeting/External)                    │     
  │                                         │     
  │ 2. Get token from apiConnectionStore    │     
  │                                         │     
  │ 3. If expired → auto-refresh            │     
  │    If still expired → throw AuthError   │     
  │                                         │     
  │ 4. Attach Bearer token to headers       │     
  │                                         │     
  │ 5. Send request (axios/ky)              │     
  │                                         │     
  │ 6. Handle response:                     │     
  │    ├── 200-299: return data             │     
  │    ├── 401: try refresh → retry         │     
  │    ├── 403: token valid but no access   │     
  │    ├── Network Error: queue for offline │     
  │    └── 5xx: retry with backoff         │     
  └─────────────────────────────────────────┘     
```

---

## 6. Role-Based Service Visibility

### 6.1 Services by Role

| Service | Patient Mode | Doctor Mode | Notes |
| --------- | :----------: | :----------: | ------- |
| Izara Patient API | ✅ | — | Auto-connected on patient login |
| Izara Doctor Auth | — | ✅ | Auto-connected on doctor login |
| Izara Doctor API | — | ✅ | Auto-connected on doctor login |
| Izara Doctor GCS | — | ✅ | Auto-connected on doctor login |
| Izara Meeting Server | ✅ | ✅ | Per-meeting token |
| Apple HealthKit | ✅ | — | Patient health data |
| Google Fit | ✅ | — | Patient health data |
| Samsung Health | ✅ | — | Patient health data |
| Stripe Payments | ✅ | — | Consultation payments |
| Apple Pay / Google Pay | ✅ | — | Payment method |
| PromptPay | ✅ | — | Thai QR payment |
| Hospital EHR | ✅ | ✅ | Patient: own records. Doctor: patient records (PDPA) |
| Lab Service | ✅ | ✅ | Patient: own results. Doctor: order/view results |
| Insurance Provider | ✅ | — | Coverage verification |
| Pharmacy API | ✅ | — | Prescription status |

### 6.2 Settings Screen Layout by Role

**Patient Mode:**

```text
API Connections
├── 🔐 Core (Auto-managed)
│   └── ✅ Izara Patient API
├── ❤️ Health & Wearables
│   ├── ✅ Apple Health
│   ├── ⬜ Google Fit
│   └── ⬜ Samsung Health
├── 💳 Payment Methods
│   ├── ✅ Visa •••• 4242
│   ├── ⬜ PromptPay
│   └── ⬜ Apple Pay
└── 🏥 Medical Services
    ├── ⬜ Hospital EHR
    ├── ⬜ Lab Service
    ├── ⬜ Insurance
    └── ⬜ Pharmacy
```

**Doctor Mode:**

```text
API Connections
├── 🔐 Core (Auto-managed)
│   ├── ✅ Izara Doctor API
│   ├── ✅ Izara Doctor Auth
│   └── ✅ Izara GCS API
└── 🏥 Medical Services
    ├── ⬜ Hospital EHR
    └── ⬜ Lab Service
```

---

## 7. Background Token Management

### 7.1 Auto-Refresh Schedule

```text
┌──────────────────────────────────────────────────────────┐
│ Background Token Manager (runs on app foreground + timer)│
│                                                          │
│ Every 5 minutes:                                         │
│  1. Check all active connection token expiry             │
│  2. If token expires in < 2 minutes → refresh now        │
│  3. If refresh fails → mark as EXPIRED                   │
│  4. If EXPIRED for > 24 hours → mark as ERROR            │
│  5. Log all refresh events to audit table                │
│                                                          │
│ On App Resume (from background):                         │
│  1. Check core token validity                            │
│  2. Refresh if needed                                    │
│  3. If core token invalid → navigate to login            │
│  4. Sync pending offline queue                           │
│                                                          │
│ On Wearable Sync Timer (every 15 minutes):               │
│  1. Check HealthKit/Google Fit for new data              │
│  2. Batch upload to backend: POST /api/phr/vitals/batch  │
│  3. Update last_sync_at timestamp                        │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Token Conflict Resolution

When user switches between Patient and Doctor role:

```text
Switch Role: Patient → Doctor
  1. Deactivate patient access token (don't delete refresh)
  2. Check if doctor refresh token exists
     ├── YES: Use refresh token to get new access token
     └── NO:  Navigate to doctor login screen
  3. Update izara_active_role = 'doctor'
  4. Reconfigure API client base URLs
  5. Hide patient-only services, show doctor-only services
  6. Keep shared services active (Hospital EHR, Lab)
```

---

## 8. Security Considerations

### 8.1 Thread Model

| Threat | Mitigation |
| -------- | ----------- |
| Token theft (compromised device) | Hardware-backed SecureStore, app lock after timeout |
| Man-in-the-middle | TLS 1.3, certificate pinning for Izara APIs |
| Token replay | Short-lived JWT (15min), jti claim for single use |
| API key stored in plaintext | Double encryption: app-level AES-256 + SecureStore |
| Brute force on external API | Rate limiting on external calls, exponential backoff |
| Cross-service data leakage | Each service sandboxed, no cross-service token sharing |
| Stale tokens after logout | Clear ALL SecureStore keys on logout, backend token revocation |
| Rooted/jailbroken device | Detect + warn user. Disable biometric on compromised devices. |

### 8.2 Audit Logging

All token operations logged to backend:

| Event | Logged Data | PDPA |
| ------- | ------------- | ------ |
| Login | device_id, ip, timestamp, method | Required |
| Token Refresh | service_id, success/fail, timestamp | Internal |
| Service Connected | service_type, service_name, timestamp | User consent |
| Service Disconnected | service_type, reason, timestamp | Internal |
| Token Error | service_id, error_type, timestamp | Internal |
| Wearable Sync | data_categories, record_count, timestamp | User consent |
| External API Call | service_id, endpoint, status_code | For debugging |

---

## 9. Database Schema for API Connections

### 9.1 Backend (PostgreSQL)

```sql
-- Store user service connections (metadata only, no tokens)
CREATE TABLE user_api_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    service_type VARCHAR(50) NOT NULL,       -- 'healthkit', 'google_fit', 'hospital_ehr', etc.
    service_name VARCHAR(200),               -- User-friendly name
    service_url VARCHAR(500),                -- Base URL for external services
    status VARCHAR(20) DEFAULT 'active',     -- active, expired, error, disconnected
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    data_categories TEXT[],                  -- ['heart_rate', 'steps', 'sleep']
    sync_frequency_minutes INT DEFAULT 15,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, service_type, service_name)
);

-- Audit log for token/connection events
CREATE TABLE api_connection_audit (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    connection_id UUID REFERENCES user_api_connections(id),
    event_type VARCHAR(50) NOT NULL,         -- 'connected', 'disconnected', 'refreshed', 'error', 'synced'
    event_data JSONB DEFAULT '{}',
    device_id VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_connections_user ON user_api_connections(user_id);
CREATE INDEX idx_api_connections_status ON user_api_connections(status);
CREATE INDEX idx_api_audit_user ON api_connection_audit(user_id);
CREATE INDEX idx_api_audit_created ON api_connection_audit(created_at);
```

### 9.2 Mobile (SQLite — expo-sqlite)

```sql
-- Local connection metadata (synced from backend)
CREATE TABLE connections (
    service_id TEXT PRIMARY KEY,
    service_type TEXT NOT NULL,
    service_name TEXT,
    service_url TEXT,
    status TEXT DEFAULT 'active',
    connected_at TEXT NOT NULL,
    last_sync_at TEXT,
    last_error TEXT,
    data_categories TEXT,          -- JSON array as text
    sync_frequency_minutes INTEGER DEFAULT 15,
    secure_store_key TEXT NOT NULL -- Reference to SecureStore key name
);
```

---

## 10. Backend API Endpoints

### 10.1 Connection Management APIs

| Method | Endpoint | Description | Auth |
| -------- | ---------- | ------------- | ------ |
| `GET` | `/api/connections` | List all user's connections | JWT |
| `POST` | `/api/connections` | Register new connection | JWT |
| `PUT` | `/api/connections/:id` | Update connection metadata | JWT |
| `DELETE` | `/api/connections/:id` | Remove connection | JWT |
| `POST` | `/api/connections/:id/test` | Test connection health | JWT |
| `GET` | `/api/connections/:id/audit` | Get audit log for connection | JWT |
| `POST` | `/api/connections/sync` | Sync connection status from mobile | JWT |

### 10.2 Request/Response Examples

**Register New Connection:**

```json
// POST /api/connections
{
    "service_type": "hospital_ehr",
    "service_name": "Bangkok Hospital",
    "service_url": "https://api.bangkokhospital.com/v1",
    "data_categories": ["emr", "lab_results", "prescriptions"],
    "sync_frequency_minutes": 30
}

// Response 201
{
    "id": "uuid-...",
    "service_type": "hospital_ehr",
    "service_name": "Bangkok Hospital",
    "status": "active",
    "connected_at": "2026-02-15T10:30:00Z"
}
```

**List Connections:**

```json
// GET /api/connections
// Response 200
{
    "connections": [
        {
            "id": "uuid-1",
            "service_type": "healthkit",
            "service_name": "Apple Health",
            "status": "active",
            "last_sync_at": "2026-02-15T10:28:00Z",
            "data_categories": ["heart_rate", "steps", "sleep"]
        },
        {
            "id": "uuid-2",
            "service_type": "stripe",
            "service_name": "Payment (Visa •••• 4242)",
            "status": "active",
            "last_sync_at": null,
            "data_categories": ["payments"]
        }
    ],
    "total": 2
}
```

---

## 11. Related Documents

| Document | Relationship |
| ---------- | ------------- |
| [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md) | Core auth flow, JWT strategy |
| [09_Mobile_Payment_Integration.md](09_Mobile_Payment_Integration.md) | Stripe/payment token details |
| [07_Mobile_Health_Records.md](07_Mobile_Health_Records.md) | Wearable data sync details |
| [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Overall app API connections section |
| [15_Mobile_Offline_Sync.md](15_Mobile_Offline_Sync.md) | Offline token behavior |

---

### End of Multi-Service API Token Management — February 2026
