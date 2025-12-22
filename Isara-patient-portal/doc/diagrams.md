# Isara Patient Portal - Visual Diagrams

**Version:** 1.0.0  
**Last Updated:** December 10, 2025

Collection of all Mermaid diagrams for the patient portal system.

> 📌 **Note:** For more detailed flowcharts with step-by-step processes, see [16-detailed-flowcharts.md](./16-detailed-flowcharts.md)

---

## 1. System Architecture

```mermaid
graph TB
    subgraph "Frontend - React + TypeScript"
        UI[User Interface]
        RC[React Components]
        CTX[Context Providers]
        API_LIB[API Library]
    end
    
    subgraph "Backend - Express + TypeScript"
        EXPRESS[Express Server]
        AUTH_MW[Auth Middleware]
        ROUTES[Route Handlers]
    end
    
    subgraph "Google Cloud Platform"
        GCS[(Google Cloud Storage)]
        GEMINI[Gemini AI]
        MAPS[Maps API]
        CALENDAR[Calendar API]
        MEET[Meet API]
    end
    
    UI --> RC
    RC --> CTX
    CTX --> API_LIB
    API_LIB -->|HTTP| EXPRESS
    EXPRESS --> AUTH_MW
    AUTH_MW --> ROUTES
    ROUTES --> GCS
    ROUTES --> GEMINI
    ROUTES --> MAPS
    ROUTES --> CALENDAR
    ROUTES --> MEET
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage
    
    U->>F: Enter credentials
    F->>B: POST /api/auth/login
    B->>GCS: Fetch user data
    GCS-->>B: User JSON
    B->>B: Verify password
    B->>B: Generate session token
    B->>GCS: Store session
    B-->>F: Session token + user data
    F->>F: Store in localStorage
    F-->>U: Redirect to dashboard
```

---

## 3. Appointment Booking Flow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant GCS as GCS
    participant CAL as Google Calendar
    participant MEET as Google Meet
    
    P->>F: Select doctor & time
    F->>B: GET /api/doctors/:id/availability
    B->>CAL: Check calendar slots
    CAL-->>B: Available times
    B-->>F: Time slots
    
    P->>F: Confirm booking
    F->>B: POST /api/appointments
    B->>GCS: Save appointment
    
    alt Online Appointment
        B->>MEET: Create Meet room
        MEET-->>B: Meet link
    end
    
    B->>CAL: Create calendar event
    CAL-->>B: Event ID
    B-->>F: Appointment confirmed
    F-->>P: Show confirmation
```

---

## 4. PHR Data Flow

```mermaid
flowchart TD
    A[Patient] -->|View/Update| B[PHR Page]
    B -->|Read| C[API: GET /api/phr/:userId]
    B -->|Update| D[API: POST /api/phr/:userId]
    
    C --> E[Backend]
    D --> E
    
    E -->|Fetch| F[(GCS: patients-data)]
    E -->|Store| F
    
    subgraph "PHR Components"
        G[Vital Signs]
        H[Medications]
        I[Allergies]
        J[Lab Results]
        K[Documents]
    end
    
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
```

---

## 5. AI Health Assistant Flow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant AI as Gemini AI
    
    P->>F: Type health question
    F->>B: POST /api/ai/chat
    Note over B: Prepare context with PHR data
    B->>AI: Send prompt with context
    AI-->>B: AI Response
    B->>B: Filter response for safety
    B-->>F: Formatted response
    F-->>P: Display AI message
```

---

## 6. PDPA Consent Flow

```mermaid
stateDiagram-v2
    [*] --> Pending: User registers
    Pending --> Accepted: User accepts consent
    Pending --> Declined: User declines
    Accepted --> Withdrawn: User withdraws consent
    Declined --> Accepted: User accepts later
    Withdrawn --> Accepted: User re-accepts
    Accepted --> [*]: Active consent
```

---

## 7. Living Will Versioning

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant GCS as GCS
    
    U->>F: Edit Living Will
    F->>B: POST /api/pdpa/:userId/living-will
    
    B->>GCS: Fetch current version
    GCS-->>B: Current document
    
    B->>B: Create new version
    B->>GCS: Save to versions/v{n}.json
    B->>GCS: Update current living-will.json
    
    B-->>F: Success + version info
    F-->>U: Show confirmation
    
    Note over U,F: User wants to rollback
    U->>F: Select previous version
    F->>B: POST /api/.../rollback
    B->>GCS: Fetch version
    B->>GCS: Create new version from old
    B-->>F: Rollback complete
```

---

## 8. Video Consultation Flow

```mermaid
sequenceDiagram
    participant P as Patient
    participant D as Doctor
    participant B as Backend
    participant MEET as Google Meet
    participant CAL as Calendar
    
    Note over P,D: Appointment time approaches
    
    P->>B: GET /api/appointments/:id
    B-->>P: Appointment with Meet link
    
    P->>MEET: Join video call
    D->>MEET: Join video call
    
    Note over P,D: Consultation in progress
    
    D->>B: Update appointment notes
    B->>B: Save consultation data
    D->>B: Complete appointment
    B->>CAL: Update event status
```

---

## 9. GCS Bucket Structure

```mermaid
graph TD
    subgraph "izara-users-credentials"
        UC1[users/]
        UC2[sessions/]
        UC1 --> UC1A[user1.json]
        UC1 --> UC1B[user2.json]
        UC2 --> UC2A[session1.json]
    end
    
    subgraph "izara-patients-data"
        PD1[patient1/]
        PD2[patient2/]
        PD1 --> PD1A[phr.json]
        PD1 --> PD1B[documents/]
    end
    
    subgraph "izara-doctors-data"
        DD1[doctor1/]
        DD1 --> DD1A[profile.json]
        DD1 --> DD1B[schedule.json]
    end
    
    subgraph "izara-appointments"
        AP1[appointments/]
        AP1 --> AP1A[apt1.json]
        AP1 --> AP1B[apt2.json]
    end
    
    subgraph "izara-meta-data"
        MD1[content/]
        MD2[settings/]
    end
```

---

## 10. Frontend Component Tree

```mermaid
graph TD
    A[App.tsx] --> B[AuthProvider]
    B --> C[Router]
    
    C --> D[Public Routes]
    C --> E[Protected Routes]
    
    D --> D1[LoginPage]
    D --> D2[RegisterPage]
    
    E --> F[MainLayout]
    
    F --> G[DashboardPage]
    F --> H[Health]
    F --> I[Appointments]
    F --> J[Map]
    F --> K[PDPA]
    
    H --> H1[HealthStudio]
    H --> H2[PHRPage]
    
    H1 --> H1A[VitalsChart]
    H1 --> H1B[TreatmentResults]
    H1 --> H1C[MedicalContent]
    H1 --> H1D[AIHealthChat]
    
    K --> K1[PDPAPage]
    K --> K2[LivingWillPage]
```

---

## 11. API Request Flow

```mermaid
flowchart LR
    A[Client Request] --> B{Auth Required?}
    
    B -->|Yes| C[Auth Middleware]
    B -->|No| D[Route Handler]
    
    C --> E{Valid Session?}
    E -->|Yes| D
    E -->|No| F[401 Unauthorized]
    
    D --> G{Operation}
    G -->|Read| H[GCS Get]
    G -->|Write| I[GCS Save]
    G -->|AI| J[Gemini API]
    G -->|Calendar| K[Google Calendar]
    
    H --> L[Response]
    I --> L
    J --> L
    K --> L
    
    L --> M[Client]
```

---

## 12. Data Entity Relationships

```mermaid
erDiagram
    USER ||--o{ APPOINTMENT : books
    USER ||--|| PHR : has
    USER ||--o{ CONSENT : gives
    USER ||--o| LIVING_WILL : creates
    
    DOCTOR ||--o{ APPOINTMENT : handles
    DOCTOR ||--|| SCHEDULE : has
    
    APPOINTMENT ||--o{ CONSULTATION_NOTE : contains
    APPOINTMENT ||--o| GOOGLE_MEET : uses
    
    PHR ||--o{ VITAL_SIGN : contains
    PHR ||--o{ MEDICATION : contains
    PHR ||--o{ ALLERGY : contains
    PHR ||--o{ LAB_RESULT : contains
    
    LIVING_WILL ||--o{ VERSION : has
```

---

## 13. Treatment Results Filter Logic

```mermaid
flowchart TD
    A[All Appointments] --> B{Filter Selection}
    
    B -->|Last 5| C[Take last 5 items]
    B -->|6 Months| D[Filter by date >= 6 months ago]
    B -->|1 Year| E[Filter by date >= 1 year ago]
    B -->|All| F[Return all]
    
    C --> G[Sort by date DESC]
    D --> G
    E --> G
    F --> G
    
    G --> H[Display Results]
    
    H --> I[Show Summary Card]
    I --> J[Doctor Info]
    I --> K[Diagnosis]
    I --> L[Medications]
    I --> M[Follow-up Date]
```

---

## 14. Health Studio Tabs

```mermaid
graph LR
    A[Health Studio] --> B[Tab Navigation]
    
    B --> C[ภาพรวม<br>Overview]
    B --> D[ผลการรักษา<br>Treatment Results]
    B --> E[เนื้อหาสุขภาพ<br>Medical Content]
    B --> F[AI Assistant]
    
    C --> C1[VitalsChart]
    C --> C2[LatestAppointment]
    C --> C3[QuickStats]
    
    D --> D1[Filter Options]
    D --> D2[Results List]
    
    E --> E1[Categories]
    E --> E2[Featured Articles]
    E --> E3[Article Cards]
    
    F --> F1[Chat Interface]
    F --> F2[Voice Input]
```

---

## 15. Session Management

```mermaid
stateDiagram-v2
    [*] --> NoSession: App Load
    
    NoSession --> CheckingStorage: Check localStorage
    CheckingStorage --> ValidatingToken: Token found
    CheckingStorage --> NoSession: No token
    
    ValidatingToken --> Authenticated: Valid
    ValidatingToken --> NoSession: Invalid/Expired
    
    Authenticated --> NoSession: Logout
    Authenticated --> Authenticated: Token refresh
    
    NoSession --> LoginFlow: User login
    LoginFlow --> Authenticated: Success
    LoginFlow --> NoSession: Failed
```

---

## Usage Notes

To render these diagrams:

1. **GitHub/GitLab**: Diagrams render automatically in markdown
2. **VS Code**: Use "Markdown Preview Mermaid Support" extension
3. **Web**: Use [Mermaid Live Editor](https://mermaid.live)
4. **Documentation**: Export as SVG/PNG from live editor

---

[Back to README →](./README.md)
