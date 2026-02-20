# 🏗️ Mobile App Architecture — Izara Dr. Anywhere

**Version:** 2.1.0  
**Date:** February 2026  
**Framework:** React Native (Expo SDK 52)  
**Navigation:** Expo Router v4 (File-based routing)  
**State Management:** Zustand + React Query (TanStack Query)  
**Architecture:** Single Unified App with Role Selection (Patient / Doctor)

> **Key Decision:** ONE unified app with role-based routing — NOT two separate apps.  
> See [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md) for full rationale.  
> See [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) for multi-service token architecture.

---

## 1. System Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 IZARA DR. ANYWHERE — UNIFIED MOBILE APP                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                📱 SINGLE UNIFIED APP                         │           │
│   │               (One Expo Binary — Role Selection)             │           │
│   │                                                              │           │
│   │  ┌─ Role Selection ───────────────────────────────────────┐  │           │
│   │  │  First Launch → Choose: 🩺 ผู้ป่วย | 👨‍⚕️ แพทย์         │  │           │
│   │  │  Next Launch  → Auto-resume last active role           │  │           │
│   │  │  Switch       → Profile → "เปลี่ยนโหมด"               │  │           │
│   │  └────────────────────────────────────────────────────────┘  │           │
│   │                                                              │           │
│   │  ┌─ (patient)/ Route Group ─┐  ┌─ (doctor)/ Route Group ─┐  │           │
│   │  │  Auth:                   │  │  Auth:                   │  │           │
│   │  │  • Login + Register      │  │  • Login + 2FA           │  │           │
│   │  │  • Biometric + PDPA      │  │  • Biometric             │  │           │
│   │  │                          │  │                          │  │           │
│   │  │  Tab Nav (5 tabs):       │  │  Tab Nav (5 tabs):       │  │           │
│   │  │  🏠 หน้าหลัก            │  │  📊 แดชบอร์ด             │  │           │
│   │  │  📅 นัดหมาย             │  │  📅 ตารางเวลา           │  │           │
│   │  │  ❤️ สุขภาพ              │  │  👥 ผู้ป่วย              │  │           │
│   │  │  🤖 AI                  │  │  🤖 AI                   │  │           │
│   │  │  👤 โปรไฟล์             │  │  👤 โปรไฟล์              │  │           │
│   │  └──────────────────────────┘  └──────────────────────────┘  │           │
│   │                                                              │           │
│   │  ┌─ Shared Screens ──────────────────────────────────────┐   │           │
│   │  │  Video Meeting | Map | Scanner | API Connections      │   │           │
│   │  │  PDPA Privacy | Notifications | Settings              │   │           │
│   │  └───────────────────────────────────────────────────────┘   │           │
│   │                                                              │           │
│   │  ┌─ Shared Packages (Turborepo) ─────────────────────────┐   │           │
│   │  │  @izara/api-client (Axios, interceptors, multi-token)  │   │           │
│   │  │  @izara/shared (hooks, contexts, utils, types)         │   │           │
│   │  │  @izara/ui (NativeWind components, theme, tokens)      │   │           │
│   │  └───────────────────────────────────────────────────────┘   │           │
│   └──────────────────────────────────────────────────────────────┘           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                      NATIVE MODULES (Expo)                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Biometric │ │Push Notif│ │Camera    │ │Location  │ │Health    │         │
│  │Auth      │ │FCM/APNS │ │Scanner   │ │GPS       │ │Kit/Fit   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Secure    │ │SQLite    │ │Speech    │ │Maps      │ │Jitsi SDK │         │
│  │Store     │ │Offline   │ │to Text   │ │MapView   │ │Video     │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           │ HTTPS / WSS (Multi-API Token Management)
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1 BACKEND (Unchanged)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐          │
│  │ Patient API     │  │ Doctor API      │  │ Meeting Server     │          │
│  │ Express.js      │  │ Express.js      │  │ Express + Socket.IO│          │
│  │ Port 3005       │  │ Port 3010       │  │ Port 3020          │          │
│  └────────┬────────┘  └────────┬────────┘  └─────────┬──────────┘          │
│           └────────────────────┼──────────────────────┘                     │
│                                ▼                                            │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │            PostgreSQL 18 + pgvector                           │         │
│  │  + NEW: device_tokens, payment_transactions, sync_queue,     │         │
│  │         user_api_connections, api_connection_audit            │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │  EXTERNAL SERVICES                                            │         │
│  │  • Firebase Cloud Messaging (FCM) — Push Notifications        │         │
│  │  • Apple Push Notification Service (APNS)                     │         │
│  │  • Jitsi Meet — Video Conferencing (FREE)                     │         │
│  │  • Google Gemini AI — Chat, CDS, Summaries                   │         │
│  │  • Stripe / Omise — Payments                                  │         │
│  │  • Google Maps — Healthcare Finder                            │         │
│  │  • Apple Health / Google Fit — Wearable Data                  │         │
│  │  • Optional: Hospital EHR / Pharmacy / Lab / Insurance APIs   │         │
│  └───────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Core Framework

| Technology | Version | Purpose |
| ------------ | --------- | --------- |
| React Native | 0.76+ | Mobile UI framework |
| Expo SDK | 52 | Managed platform services |
| Expo Router | v4 | File-based routing |
| TypeScript | 5.x | Type-safe development |
| Turborepo | Latest | Monorepo management |

### 2.2 State Management

| Technology | Purpose |
| ------------ | --------- |
| Zustand | Global state (auth, settings, offline queue) |
| TanStack Query (React Query) | Server state, caching, background refetch |
| React Context | Theme, locale, auth provider |
| AsyncStorage / SecureStore | Persisted state (tokens, preferences) |

### 2.3 Native Modules (Expo)

| Module | Purpose | Platform |
| -------- | --------- | ---------- |
| expo-local-authentication | Biometric auth (Face ID, fingerprint) | iOS + Android |
| expo-notifications | Push notifications (FCM + APNS) | iOS + Android |
| expo-camera | Document scanner | iOS + Android |
| expo-location | GPS for healthcare map | iOS + Android |
| expo-secure-store | Encrypted token storage | iOS + Android |
| expo-sqlite | Offline data cache | iOS + Android |
| expo-speech | Text-to-speech | iOS + Android |
| expo-image-picker | Photo selection | iOS + Android |
| expo-file-system | File management | iOS + Android |
| expo-haptics | Tactile feedback | iOS + Android |
| react-native-maps | Google Maps | iOS + Android |
| @jitsi/react-native-sdk | Video conferencing | iOS + Android |
| react-native-health | Apple HealthKit | iOS |
| react-native-google-fit | Google Fit | Android |

### 2.4 Networking

| Technology | Purpose |
| ------------ | --------- |
| Axios | HTTP API calls with interceptors |
| Socket.IO Client | Real-time meeting communication |
| NetInfo | Network connectivity monitoring |

### 2.5 UI Framework

| Technology | Purpose |
| ------------ | --------- |
| NativeWind (Tailwind) | Utility-first styling (compatible with web Tailwind) |
| React Native Reanimated | Smooth animations |
| React Native Gesture Handler | Touch gestures |
| React Native SVG | Icons and graphics |
| Lucide React Native | Icon library |
| react-native-safe-area-context | Safe area handling |

---

## 3. Application Layers

### 3.1 Layer Architecture

```text
┌─────────────────────────────────────────────┐
│              PRESENTATION LAYER              │
│  Screens, Components, Navigation             │
│  (Expo Router, NativeWind)                   │
├─────────────────────────────────────────────┤
│              BUSINESS LOGIC LAYER            │
│  Hooks, Services, Contexts                   │
│  (React Query, Zustand, Custom Hooks)        │
├─────────────────────────────────────────────┤
│              DATA ACCESS LAYER               │
│  API Client, Offline Storage, Sync           │
│  (Axios, SQLite, SecureStore)                │
├─────────────────────────────────────────────┤
│              PLATFORM LAYER                  │
│  Native Modules, Device APIs                 │
│  (Expo Modules, Jitsi SDK, HealthKit)        │
└─────────────────────────────────────────────┘
```

### 3.2 Presentation Layer

#### Screen Structure (Unified App — Expo Router with Route Groups)

> Full screen-by-screen specification: [Pages/Unified-App/Unified_App_Pages.md](Pages/Unified-App/Unified_App_Pages.md)

```text
app/
├── _layout.tsx                    # Root layout (providers, fonts, role context)
├── index.tsx                      # Entry: check role → redirect to (patient) or (doctor)
├── role-selection.tsx             # First launch: choose Patient or Doctor
│
├── (patient)/                     # ── PATIENT ROUTE GROUP ──
│   ├── _layout.tsx               # Patient providers, green accent
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # P01 — Email + password + biometric
│   │   ├── register.tsx          # P02 — Registration (3-step)
│   │   ├── reset-password.tsx    # P03
│   │   ├── biometric-setup.tsx   # P04
│   │   └── pdpa-consent.tsx      # P05 — Required PDPA consent
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar (5 tabs, green accent)
│   │   ├── index.tsx             # P07 — Dashboard (Home)
│   │   ├── appointments/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # P08 — Appointment list
│   │   │   ├── book.tsx          # P09 — Multi-step booking
│   │   │   └── [id].tsx          # P10 — Appointment detail
│   │   ├── health/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # P11 — PHR overview
│   │   │   ├── vitals.tsx        # P12 — Vital signs + charts + wearable
│   │   │   ├── medications.tsx   # P13 — Medications
│   │   │   ├── allergies.tsx     # P14 — Allergies
│   │   │   ├── timeline.tsx      # P15 — Health timeline
│   │   │   ├── lifestyle.tsx     # P16 — Lifestyle data
│   │   │   ├── living-will.tsx   # P17 — Living will (4-step wizard)
│   │   │   └── documents.tsx     # P18 — Medical documents
│   │   ├── ai/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # P20 — AI Health Assistant chat
│   │   │   └── content.tsx       # P35 — Health Library
│   │   └── profile/
│   │       ├── _layout.tsx
│   │       ├── index.tsx         # P22 — Profile overview
│   │       ├── settings.tsx      # P23 — App settings
│   │       ├── notifications.tsx # P24 — Notification center
│   │       ├── pdpa.tsx          # P28 — PDPA privacy management
│   │       ├── api-connections.tsx # P29 — Multi-service connections
│   │       └── payments.tsx      # P30 — Payment history
│   ├── meeting/
│   │   ├── [id].tsx              # P31 — Video meeting (Jitsi)
│   │   └── lobby.tsx             # P32 — Meeting lobby
│   ├── map.tsx                   # P34 — Healthcare facility map
│   └── scanner.tsx               # P19 — Document scanner
│
├── (doctor)/                      # ── DOCTOR ROUTE GROUP ──
│   ├── _layout.tsx               # Doctor providers, blue accent
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # D01 — Email + password + biometric
│   │   ├── two-factor.tsx        # D02 — 2FA verification
│   │   ├── reset-password.tsx    # D03
│   │   └── biometric-setup.tsx   # D04b
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar (5 tabs, blue accent)
│   │   ├── index.tsx             # D04 — Doctor Dashboard
│   │   ├── schedule/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # D05 — Calendar view
│   │   │   ├── pending.tsx       # D06 — Pending appointments
│   │   │   ├── pool.tsx          # D07 — Appointment pool
│   │   │   ├── queue.tsx         # D18 — Queue management (Socket.IO)
│   │   │   └── walkin.tsx        # D19 — Walk-in registration
│   │   ├── patients/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # D09 — Patient list + search
│   │   │   ├── [id].tsx          # D10 — Patient detail
│   │   │   ├── [id]/emr.tsx      # D11 — EMR records
│   │   │   ├── [id]/create-emr.tsx # D13 — Create EMR (SOAP + AI)
│   │   │   ├── [id]/prescriptions.tsx # D15 — E-Prescribing
│   │   │   └── [id]/labs.tsx     # D16 — Lab orders
│   │   ├── ai/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # D28 — AI Clinical Copilot
│   │   │   ├── cds.tsx           # D20 — CDS alerts
│   │   │   ├── calculators.tsx   # D29 — Medical calculators (offline)
│   │   │   └── content.tsx       # D30 — Clinical resources management
│   │   └── profile/
│   │       ├── _layout.tsx
│   │       ├── index.tsx         # D32 — Doctor profile
│   │       ├── settings.tsx      # D33 — Settings
│   │       └── notifications.tsx # D22 — Notifications
│   ├── meeting/
│   │   ├── [id].tsx              # D26 — Video HOST (side panels)
│   │   ├── lobby.tsx             # D25 — Lobby management
│   │   └── post-meeting.tsx      # D27 — Post-meeting EMR (AI pre-fill)
│   ├── emr/
│   │   ├── create.tsx            # Quick EMR creation
│   │   └── [id].tsx              # EMR editor
│   └── admin/
│       ├── index.tsx             # D34 — Admin dashboard
│       ├── doctors.tsx           # D35 — Doctor management
│       ├── content-approval.tsx  # D37 — Content approval queue
│       └── stats.tsx             # D36 — Analytics
│
├── meeting/                       # ── SHARED MEETING ──
│   └── [id].tsx                  # Shared video component (role-aware)
├── map.tsx                        # Shared healthcare map
└── scanner.tsx                    # Shared document scanner
```

### 3.3 Business Logic Layer

#### Custom Hooks

```typescript
// Authentication
useAuth()                    // Login, logout, token management
useBiometric()               // Biometric auth enrollment & verification
useSecureToken()             // Secure token storage

// Data
useAppointments()            // Appointment CRUD & queries
usePHR(patientId)            // PHR data with caching
useVitals(patientId)         // Vital signs with charts
useMedications(patientId)    // Medication management
useEMR(patientId)            // EMR records
useNotifications()           // Notification list & actions

// AI
useAIChat()                  // AI health assistant
useCDS(patientId)            // Clinical Decision Support
usePreConsultation(aptId)    // Pre-consultation summary

// Meeting
useMeeting(appointmentId)    // Meeting lifecycle
useTranscript(meetingId)     // Real-time transcript
useMeetingChat(meetingId)    // Meeting chat

// Device
useLocation()                // GPS location
useHealthKit()               // Apple Health / Google Fit
useDocumentScanner()         // Camera OCR
useOfflineSync()             // Offline data management
usePushNotifications()       // Push notification handler
```

#### Zustand Stores

```typescript
// Global State Stores
useAuthStore           // { user, token, isAuthenticated, login, logout }
useRoleStore           // { activeRole, lastRole, switchRole, roleHistory }
useSettingsStore       // { theme, language, notifications, biometric }
useOfflineStore        // { queue, pendingSync, lastSyncAt, syncNow }
useMeetingStore        // { activeMeeting, transcript, participants }
useNotificationStore   // { unreadCount, notifications, markRead }
useApiConnectionStore  // { connections, addService, removeService, refreshToken }  
                       // See 12_Multi_API_Token_Management.md
```

### 3.4 Data Access Layer

#### API Client Architecture

```typescript
// @izara/api-client/src/client.ts

import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

class IzaraApiClient {
  private instance: AxiosInstance;
  private offlineQueue: OfflineRequest[] = [];

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Auth interceptor
    this.instance.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Offline interceptor
    this.instance.interceptors.request.use(async (config) => {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected && config.method !== 'get') {
        this.offlineQueue.push({ config, timestamp: Date.now() });
        throw new OfflineError('Queued for sync');
      }
      return config;
    });

    // Response interceptor (token refresh, error handling)
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.handleTokenExpiry();
        }
        throw error;
      }
    );
  }
}
```

#### Offline Storage Schema (SQLite)

```sql
-- Local cache for offline access
CREATE TABLE cached_appointments (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,            -- JSON serialized
  synced_at INTEGER,
  modified_locally INTEGER DEFAULT 0
);

CREATE TABLE cached_phr (
  patient_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  synced_at INTEGER,
  modified_locally INTEGER DEFAULT 0
);

CREATE TABLE cached_vitals (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  data TEXT NOT NULL,
  synced_at INTEGER,
  pending_upload INTEGER DEFAULT 0
);

CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  body TEXT,
  created_at INTEGER,
  status TEXT DEFAULT 'pending'     -- pending | synced | failed
);

CREATE TABLE cached_content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,               -- medical_content | clinical_resource
  data TEXT NOT NULL,
  synced_at INTEGER
);
```

---

## 4. Authentication Architecture

### 4.1 Auth Flow (Unified App with Role Selection)

```text
┌─────────────────────────────────────────────────────────────┐
│                 UNIFIED APP AUTH FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ App      │───>│ Check MMKV   │───>│ Has last_active  │   │
│  │ Launch   │    │ last_active   │    │ _role?           │   │
│  └──────────┘    │ _role         │    └────────┬─────────┘   │
│                  └──────────────┘              │             │
│                                          Yes / No           │
│                   ┌────────────────────────────┘             │
│                   │                                          │
│              No   │   Yes                                    │
│                   ▼                                          │
│            ┌──────────────┐    ┌──────────────────┐         │
│            │ Role Selection│    │ Check Stored     │         │
│            │ Screen        │    │ Token (per-role) │         │
│            │ Patient/Doctor│    └────────┬─────────┘         │
│            └──────┬───────┘              │                   │
│                   │                 Has Token?               │
│              Chose Role                  │                   │
│                   │            ┌─────────┼──────────┐        │
│                   ▼            │         │          │        │
│            ┌──────────────┐   No       Yes         │        │
│            │ Role-specific│    │         │          │        │
│            │ Login Screen │    │    ┌────▼────────┐ │        │
│            │ (Patient or  │◄───┘   │ Biometric   │ │        │
│            │  Doctor)     │        │ Verification │ │        │
│            └──────┬───────┘        └────┬────────┘ │        │
│                   │                     │          │        │
│              Success              Success / Fail   │        │
│                   │                     │          │        │
│                   ▼                     ▼          │        │
│            ┌──────────────┐    ┌──────────────┐   │        │
│            │ Store Token  │    │ Valid → Home  │   │        │
│            │ (per-role    │    │ Invalid →     │   │        │
│            │  SecureStore)│    │ Login Screen  │   │        │
│            └──────────────┘    └──────────────┘   │        │
│                                                    │        │
│  Key: Tokens are stored per-role in SecureStore    │        │
│  patient_access_token / doctor_access_token        │        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

> **Full auth spec:** [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md)  
> **Role selection design:** [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md)  
> **Multi-API tokens:** [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md)

### 4.2 Token Management (Per-Role + Multi-Service)

```typescript
// Token lifecycle — tokens are scoped per role (patient / doctor)
interface TokenManager {
  // Core auth tokens (per-role)
  storeToken(role: 'patient' | 'doctor', token: string): Promise<void>;
  getToken(role: 'patient' | 'doctor'): Promise<string | null>;  
  removeToken(role: 'patient' | 'doctor'): Promise<void>;
  isTokenValid(role: 'patient' | 'doctor'): Promise<boolean>;
  refreshToken(role: 'patient' | 'doctor'): Promise<string>;
  bindBiometric(role: 'patient' | 'doctor', token: string): Promise<void>;
  
  // Multi-service API connections (add later by user)
  // See 12_Multi_API_Token_Management.md for full architecture
  addServiceToken(serviceId: string, token: string): Promise<void>;
  getServiceToken(serviceId: string): Promise<string | null>;
  removeServiceToken(serviceId: string): Promise<void>;
}
```

---

## 5. Push Notification Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                PUSH NOTIFICATION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend Event (appointment confirmed, EMR signed, etc.)     │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────┐                                       │
│  │ Notification     │  Stores in DB: notifications table    │
│  │ Service          │  + device_tokens table                │
│  └────────┬─────────┘                                       │
│           │                                                  │
│     ┌─────┼─────┐                                           │
│     ▼     ▼     ▼                                           │
│  ┌─────┐ ┌───┐ ┌──────┐                                    │
│  │ FCM │ │APN│ │Email │   Three delivery channels           │
│  │     │ │ S │ │      │                                     │
│  └──┬──┘ └─┬─┘ └──┬───┘                                    │
│     │      │      │                                          │
│     ▼      ▼      ▼                                          │
│  ┌──────────────────┐                                       │
│  │  Mobile Device   │                                       │
│  │  • Lock screen   │                                       │
│  │  • Notification   │                                       │
│  │    center        │                                       │
│  │  • In-app badge  │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Offline Architecture

### 6.1 Sync Strategy

```text
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE SYNC FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    Online    ┌──────────────┐                 │
│  │ API Call  │────────────>│ Server API   │                 │
│  └──────────┘              └──────────────┘                 │
│       │                                                      │
│       │ Offline                                              │
│       ▼                                                      │
│  ┌──────────────┐                                           │
│  │ SQLite Cache │  Read: serve from cache                   │
│  │              │  Write: queue in sync_queue                │
│  └──────┬───────┘                                           │
│         │                                                    │
│         │ Network Restored                                   │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │ Sync Service │  Process sync_queue FIFO                  │
│  │              │  Conflict: server wins (with user prompt) │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Cacheable Data (Read Offline)

| Data | Cache Duration | Priority |
| ------ | --------------- | ---------- |
| Appointments (own) | 24 hours | P0 |
| PHR (own) | 24 hours | P0 |
| Recent vitals | 24 hours | P0 |
| Medications | 7 days | P0 |
| Allergies | 7 days | P0 |
| Medical content articles | 30 days | P1 |
| Doctor profiles | 7 days | P1 |
| Notification history | 24 hours | P1 |

### 6.3 Offline-Capable Actions (Write Queued)

| Action | Queue Strategy |
| -------- | --------------- |
| Record vital signs | Queue → sync on reconnect |
| Update medications | Queue → sync on reconnect |
| Update allergies | Queue → sync on reconnect |
| AI chat messages | Require online (not queued) |
| Book appointment | Require online (not queued) |
| Video meeting | Require online (not queued) |

---

## 7. Performance Guidelines

### 7.1 Performance Budgets

| Metric | Target |
| -------- | -------- |
| App launch (cold start) | < 2 seconds |
| Screen transition | < 300ms |
| API response display | < 1 second |
| List scroll FPS | 60 FPS constant |
| Image loading | Progressive with placeholder |
| Bundle size (JS) | < 15 MB |
| App download size | < 80 MB |
| Memory usage | < 200 MB |

### 7.2 Optimization Techniques

| Technique | Implementation |
| ----------- | --------------- |
| Lazy loading | Dynamic imports for non-critical screens |
| Image optimization | expo-image with caching + WebP format |
| List virtualization | FlashList for large lists (appointments, patients) |
| Query caching | React Query with stale-while-revalidate |
| Background fetch | Sync data in background (expo-background-fetch) |
| Bundle splitting | Hermes engine for faster parsing |
| Memoization | React.memo + useMemo for expensive components |

---

## 8. Security Architecture

### 8.1 Security Layers

```text
┌─────────────────────────────────────────────────────────────┐
│                   MOBILE SECURITY LAYERS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Device Security                                    │
│  ├── Biometric authentication (Face ID / Fingerprint)       │
│  ├── App lock after background timeout (5 minutes)          │
│  └── Jailbreak / Root detection                             │
│                                                              │
│  Layer 2: Data Security                                      │
│  ├── SecureStore for tokens (Keychain / Keystore)           │
│  ├── SQLite encryption (SQLCipher)                          │
│  ├── Certificate pinning (SSL)                              │
│  └── No sensitive data in logs                              │
│                                                              │
│  Layer 3: Network Security                                   │
│  ├── HTTPS only (TLS 1.3)                                   │
│  ├── JWT with 24h expiry                                    │
│  ├── Request signing for mutations                          │
│  └── Rate limiting (server-side, existing)                  │
│                                                              │
│  Layer 4: Application Security                               │
│  ├── Input validation (same as web)                         │
│  ├── XSS prevention (React Native safe by default)          │
│  ├── PDPA consent enforcement                               │
│  └── Audit logging (all AI validations)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 OWASP Mobile Top 10 Compliance

| # | Risk | Mitigation |
| --- | ------ | ------------ |
| M1 | Improper Platform Usage | Follow iOS/Android security guidelines |
| M2 | Insecure Data Storage | SecureStore + SQLCipher encryption |
| M3 | Insecure Communication | Certificate pinning + TLS 1.3 |
| M4 | Insecure Authentication | Biometric + JWT + token rotation |
| M5 | Insufficient Cryptography | AES-256 for local data |
| M6 | Insecure Authorization | Server-side RBAC (existing) |
| M7 | Client Code Quality | TypeScript + ESLint + code review |
| M8 | Code Tampering | Integrity checks, obfuscation |
| M9 | Reverse Engineering | ProGuard (Android), code obfuscation |
| M10 | Extraneous Functionality | Remove debug endpoints in production |

---

## 9. Design System

### 9.1 Design Tokens (NativeWind / Tailwind Compatible)

```typescript
// @izara/ui/src/theme.ts
export const theme = {
  colors: {
    primary: '#2563EB',        // Blue-600 (Izara brand)
    primaryDark: '#1D4ED8',    // Blue-700
    secondary: '#059669',      // Emerald-600 (health)
    accent: '#F59E0B',         // Amber-500 (warnings)
    danger: '#DC2626',         // Red-600 (critical)
    background: '#F8FAFC',     // Slate-50
    surface: '#FFFFFF',        // White
    text: '#1E293B',           // Slate-800
    textSecondary: '#64748B',  // Slate-500
    border: '#E2E8F0',         // Slate-200
    // Dark mode
    darkBackground: '#0F172A', // Slate-900
    darkSurface: '#1E293B',    // Slate-800
    darkText: '#F1F5F9',       // Slate-100
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  borderRadius: {
    sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
  },
  typography: {
    heading: { fontFamily: 'THSarabunNew-Bold', fontSize: 24 },
    subheading: { fontFamily: 'THSarabunNew-Bold', fontSize: 18 },
    body: { fontFamily: 'THSarabunNew', fontSize: 16 },
    caption: { fontFamily: 'THSarabunNew', fontSize: 14 },
  },
};
```

### 9.2 Component Library (@izara/ui)

| Component | Description |
| ----------- | ------------- |
| `IzaraButton` | Primary, secondary, outline, danger variants |
| `IzaraCard` | Content container with shadow |
| `IzaraInput` | Text input with validation states |
| `IzaraAvatar` | User avatar with fallback initials |
| `IzaraModal` | Bottom sheet / center modal |
| `IzaraBadge` | Status badges (pending, confirmed, etc.) |
| `IzaraList` | Optimized list with FlashList |
| `IzaraChart` | Vital signs charts (react-native-chart-kit) |
| `IzaraTimeline` | Health timeline component |
| `IzaraSkeleton` | Loading skeleton screens |
| `IzaraToast` | Toast notifications |
| `IzaraTabBar` | Custom bottom tab bar |

---

## 10. Monitoring & Analytics

| Tool | Purpose |
| ------ | --------- |
| Sentry | Crash reporting + error tracking |
| Expo Updates | OTA update delivery tracking |
| Firebase Analytics | User behavior analytics |
| React Native Performance | FPS monitoring, render tracking |
| Custom Backend Logging | API call metrics, response times |

---

## 11. Related Documents

| Document | Relevance |
| ---------- | ----------- |
| [11_Mobile_App_Description.md](11_Mobile_App_Description.md) | Complete product description & feature matrix |
| [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | Multi-service API token architecture |
| [13_Mobile_Content_Library_Workflows.md](13_Mobile_Content_Library_Workflows.md) | Content & clinical resources workflows |
| [14_Mobile_PDPA_Privacy.md](14_Mobile_PDPA_Privacy.md) | PDPA compliance for mobile |
| [15_Mobile_Offline_Sync.md](15_Mobile_Offline_Sync.md) | Offline sync architecture detail |
| [16_Unified_App_Role_Selection.md](16_Unified_App_Role_Selection.md) | Role selection system design |
| [Pages/Unified-App/Unified_App_Pages.md](Pages/Unified-App/Unified_App_Pages.md) | All 77 screen specifications |

---

### End of Mobile App Architecture — v2.1.0 — February 2026
