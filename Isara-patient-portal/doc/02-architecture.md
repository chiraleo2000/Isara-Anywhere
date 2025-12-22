# 2. System Architecture

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ISARA PATIENT PORTAL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                        FRONTEND (React + TypeScript)                │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │     │
│  │  │Dashboard│  │Appoint- │  │   PHR   │  │AI Doctor│  │   Map   │  │     │
│  │  │  Page   │  │  ments  │  │  Page   │  │  Page   │  │  Page   │  │     │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │     │
│  │  │  PDPA   │  │ Living  │  │ Profile │  │Settings │               │     │
│  │  │  Page   │  │  Will   │  │  Page   │  │  Page   │               │     │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    │ HTTP/REST API                           │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                        BACKEND (Express + TypeScript)               │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │     │
│  │  │  Auth   │  │Appoint- │  │   PHR   │  │  PDPA   │  │   AI    │  │     │
│  │  │ Routes  │  │  ments  │  │ Routes  │  │ Routes  │  │ Routes  │  │     │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │     │
│  │  │ Doctors │  │Metadata │  │   GCS   │  │ Google  │               │     │
│  │  │ Routes  │  │ Routes  │  │ Routes  │  │Services │               │     │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                    │                                         │
│                                    │ GCS Client / APIs                       │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                        GOOGLE CLOUD PLATFORM                        │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │     │
│  │  │   Google    │  │   Google    │  │   Google    │  │  Google   │  │     │
│  │  │   Cloud     │  │  Calendar   │  │    Meet     │  │   Maps    │  │     │
│  │  │   Storage   │  │    API      │  │    API      │  │   API     │  │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │     │
│  │  ┌─────────────┐                                                    │     │
│  │  │   Gemini    │                                                    │     │
│  │  │     AI      │                                                    │     │
│  │  └─────────────┘                                                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2.2 Frontend Architecture

### 2.2.1 Component Structure

```
src/
├── App.tsx                    # Main application with routing
├── main.tsx                   # React entry point
├── types.ts                   # TypeScript type definitions
│
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx     # Main layout wrapper with navigation
│   │
│   ├── health/
│   │   ├── HealthStudio.tsx   # Health dashboard component
│   │   ├── TreatmentResults.tsx # Treatment history with filters
│   │   ├── VitalsChart.tsx    # Vital signs chart
│   │   ├── MedicalContent.tsx # Health articles
│   │   ├── AIHealthChat.tsx   # AI chat widget
│   │   └── LatestAppointmentResult.tsx
│   │
│   └── ui/
│       ├── Button.tsx         # Reusable button component
│       ├── Card.tsx           # Card component
│       ├── Input.tsx          # Input component
│       ├── Modal.tsx          # Modal component
│       ├── Tabs.tsx           # Tabs component
│       └── ...
│
├── contexts/
│   └── AuthContext.tsx        # Authentication context provider
│
├── lib/
│   ├── api.ts                 # Axios API client configuration
│   └── services.ts            # Service layer for API calls
│
└── pages/
    ├── auth/
    │   ├── LoginPage.tsx
    │   └── RegisterPage.tsx
    ├── dashboard/
    │   └── DashboardPage.tsx
    ├── appointments/
    │   └── AppointmentPages.tsx
    ├── health/
    │   ├── PHRPage.tsx
    │   └── AIDoctorPage.tsx
    ├── pdpa/
    │   ├── PDPAPage.tsx
    │   └── LivingWillPage.tsx
    ├── map/
    │   └── MapPage.tsx
    ├── profile/
    │   └── ProfilePage.tsx
    ├── settings/
    │   └── SettingsPage.tsx
    └── timeline/
        └── TimelinePage.tsx
```

### 2.2.2 State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATE MANAGEMENT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   AuthContext (Global)                   │    │
│  │  • user: User | null                                    │    │
│  │  • token: string | null                                 │    │
│  │  • isAuthenticated: boolean                             │    │
│  │  • login(), logout(), register()                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Component Local State                   │    │
│  │  • useState() for UI state                              │    │
│  │  • useEffect() for data fetching                        │    │
│  │  • Custom hooks for reusable logic                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Local Storage                          │    │
│  │  • izara_user - User profile                            │    │
│  │  • auth_token - Authentication token                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.3 Backend Architecture

### 2.3.1 Server Structure

```
server/
├── index.ts                   # Express server entry point
│
├── middleware/
│   └── auth.ts                # Authentication middleware
│
└── routes/
    ├── auth.ts                # Authentication routes
    ├── appointments.ts        # Appointment management
    ├── phr.ts                 # Personal Health Records
    ├── doctors.ts             # Doctor information
    ├── pdpa.ts                # PDPA consent management
    ├── metadata.ts            # System metadata
    ├── ai.ts                  # AI services
    ├── gcs.ts                 # GCS file operations
    └── google-services.ts     # Google API integrations
```

### 2.3.2 Express Server Configuration

```typescript
// Server configuration flow
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER SETUP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Load Environment Variables (dotenv)                         │
│  2. Initialize Google Cloud Storage                             │
│  3. Configure CORS Middleware                                   │
│  4. Configure JSON Body Parser                                  │
│  5. Configure Request Logging                                   │
│  6. Register Route Handlers                                     │
│  7. Configure Error Handling                                    │
│  8. Verify GCS Connection                                       │
│  9. Start Server on PORT 3004                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.4 Data Flow Architecture

### 2.4.1 Request/Response Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│ Browser │────▶│   Vite      │────▶│   Express   │────▶│   GCS   │
│         │     │   Proxy     │     │   Server    │     │         │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
     │                                     │
     │                                     │
     ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                          DATA FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Action (Click/Submit)                                  │
│  2. React Component calls Service Function                      │
│  3. Service sends HTTP request via Axios                        │
│  4. Vite Proxy forwards /api/* to Backend                       │
│  5. Express Router handles request                              │
│  6. Route Handler reads/writes to GCS                           │
│  7. Response sent back to Frontend                              │
│  8. React updates UI with new data                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

           ┌──────────┐                    ┌──────────┐
           │  Login   │                    │ Register │
           │  Page    │                    │   Page   │
           └────┬─────┘                    └────┬─────┘
                │                               │
                ▼                               ▼
         ┌──────────────────────────────────────────┐
         │           POST /api/auth/login            │
         │           POST /api/auth/register         │
         └──────────────────┬───────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────┐
         │         Validate Credentials              │
         │         Create Session Token              │
         │         Store User in GCS                 │
         └──────────────────┬───────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────┐
         │         Return { user, token }            │
         └──────────────────┬───────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────┐
         │     Save to LocalStorage                  │
         │     • izara_user                          │
         │     • auth_token                          │
         └──────────────────┬───────────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────────┐
         │     Redirect to Dashboard                 │
         └──────────────────────────────────────────┘
```

---

## 2.5 Cloud Storage Architecture

### 2.5.1 GCS Bucket Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                   GOOGLE CLOUD STORAGE BUCKETS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  izara-users-credentials/                                       │
│  ├── users/                                                     │
│  │   └── {userId}.json          # User credentials & profile    │
│  └── sessions/                                                  │
│      └── {sessionId}.json       # Active sessions               │
│                                                                  │
│  izara-patients-data/                                           │
│  └── patients/                                                  │
│      └── {patientId}/                                           │
│          ├── profile.json       # Patient profile               │
│          ├── phr.json           # Personal Health Record        │
│          └── pdpa/                                              │
│              ├── consents.json  # PDPA consents                 │
│              ├── living-will.json                               │
│              └── versions/      # Living will versions          │
│                  └── {versionId}.json                           │
│                                                                  │
│  izara-doctors-data/                                            │
│  └── doctors/                                                   │
│      └── {doctorId}.json        # Doctor profile                │
│                                                                  │
│  izara-appointments/                                            │
│  ├── appointments.json          # All appointments list         │
│  └── appointments/                                              │
│      └── {appointmentId}/                                       │
│          └── details.json       # Appointment details           │
│                                                                  │
│  izara-meta-data/                                               │
│  ├── medications.json           # Medication catalog            │
│  ├── specialties.json           # Doctor specialties            │
│  └── health-tips.json           # Health tips                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.6 API Layer Architecture

### 2.6.1 Service Layer

```typescript
// Frontend Service Layer Structure
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  authService                                                    │
│  ├── login(email, password)                                     │
│  ├── register(data)                                             │
│  ├── logout(token)                                              │
│  └── validateSession(token)                                     │
│                                                                  │
│  phrService                                                     │
│  ├── get(userId)                                                │
│  ├── update(userId, data)                                       │
│  ├── getVitals(userId)                                          │
│  └── addVitals(userId, vitals)                                  │
│                                                                  │
│  appointmentService                                             │
│  ├── getByPatient(userId)                                       │
│  ├── getById(id)                                                │
│  ├── create(data)                                               │
│  ├── update(id, data)                                           │
│  └── cancel(id)                                                 │
│                                                                  │
│  doctorService                                                  │
│  ├── getAll()                                                   │
│  ├── getById(id)                                                │
│  └── searchBySpecialty(specialty)                               │
│                                                                  │
│  pdpaService                                                    │
│  ├── getConsents(userId)                                        │
│  ├── updateConsent(userId, consentId, granted)                  │
│  ├── getLivingWill(userId)                                      │
│  ├── saveLivingWill(userId, data)                               │
│  ├── getLivingWillVersions(userId)                              │
│  └── rollbackLivingWill(userId, versionId)                      │
│                                                                  │
│  aiService                                                      │
│  ├── chat(message, history)                                     │
│  ├── symptomCheck(symptoms, context)                            │
│  └── riskAssessment(patientData)                                │
│                                                                  │
│  googleService                                                  │
│  ├── createCalendarEvent(eventData)                             │
│  ├── createMeetLink(appointmentData)                            │
│  ├── searchNearby(params)                                       │
│  └── getDirections(origin, destination)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.7 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Client-Side                                           │
│  ├── ProtectedRoute component                                   │
│  ├── Token stored in LocalStorage                               │
│  └── Automatic redirect on auth failure                         │
│                                                                  │
│  Layer 2: API Gateway                                           │
│  ├── CORS configuration                                         │
│  ├── Request logging                                            │
│  └── Rate limiting (TODO)                                       │
│                                                                  │
│  Layer 3: Authentication Middleware                             │
│  ├── Token validation                                           │
│  ├── Session verification                                       │
│  └── User context injection                                     │
│                                                                  │
│  Layer 4: Data Access                                           │
│  ├── Patient can only access own data                           │
│  ├── PDPA consent required for doctor access                    │
│  └── Audit logging for all access                               │
│                                                                  │
│  Layer 5: Storage                                                │
│  ├── GCS IAM permissions                                        │
│  ├── Service account authentication                             │
│  └── Bucket-level access control                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

[← Previous: Overview](./01-overview.md) | [Next: Data Structures →](./03-data-structures.md)
