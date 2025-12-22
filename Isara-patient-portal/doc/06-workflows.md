# 6. Feature Workflows

## 6.1 User Registration Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    U->>F: Fill registration form
    F->>F: Validate form inputs
    F->>B: POST /api/auth/register
    B->>B: Validate password match
    B->>B: Check password length >= 6
    B->>GCS: Check if email exists (list users/)
    
    alt Email exists
        GCS-->>B: User found
        B-->>F: 400 Email already exists
        F-->>U: Show error message
    else Email available
        GCS-->>B: No user found
        B->>B: Generate userId & patientId
        B->>B: Create user object
        B->>GCS: Write users/{userId}.json
        B->>B: Create PHR data
        B->>GCS: Write patients/{patientId}/profile.json
        B->>GCS: Write patients/{patientId}/phr.json
        B->>B: Create session token
        B->>GCS: Write sessions/{sessionId}.json
        B-->>F: 200 { user, token }
        F->>F: Save to localStorage
        F-->>U: Redirect to Dashboard
    end
```

---

## 6.2 User Login Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    U->>F: Enter email & password
    F->>B: POST /api/auth/login
    B->>GCS: List users/
    B->>GCS: Read each user file
    
    alt User found & password matches
        B->>B: Create session token
        B->>GCS: Write sessions/{sessionId}.json
        B-->>F: 200 { user, token }
        F->>F: Save to localStorage
        F-->>U: Redirect to Dashboard
    else Invalid credentials
        B-->>F: 401 Invalid credentials
        F-->>U: Show error message
    end
```

---

## 6.3 Appointment Booking Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage
    participant GCal as Google Calendar
    participant GMeet as Google Meet

    P->>F: Select doctor & time slot
    P->>F: Fill symptoms & reason
    F->>B: POST /api/appointments
    B->>B: Generate appointmentId
    B->>GCS: Read appointments.json
    B->>GCS: Add to appointments.json
    B->>GCS: Write appointments/{id}/details.json
    
    alt Telehealth appointment
        B->>GCal: Create calendar event
        GCal-->>B: Calendar event ID
        B->>GMeet: Create Meet link
        GMeet-->>B: Meet URL
        B->>GCS: Update appointment with meetingLink
    end
    
    B-->>F: 200 { appointment }
    F-->>P: Show confirmation
    F-->>P: Display meeting details (if telehealth)
```

---

## 6.4 PHR Update Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    P->>F: Edit health information
    F->>B: PUT /api/phr/{userId}
    B->>GCS: Read patients/{patientId}/phr.json
    B->>B: Merge updates
    B->>GCS: Write patients/{patientId}/phr.json
    B-->>F: 200 { success, data }
    F-->>P: Show success message
```

---

## 6.5 Vital Signs Recording Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    P->>F: Enter vital measurements
    F->>F: Validate values
    F->>B: POST /api/phr/{userId}/vitals
    B->>GCS: Read patients/{patientId}/phr.json
    B->>B: Add to vitalHistory array
    B->>B: Calculate BMI if height & weight
    B->>GCS: Write patients/{patientId}/phr.json
    B-->>F: 200 { success, vital }
    F-->>P: Update vitals chart
```

---

## 6.6 Living Will Management Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    Note over P,GCS: Save Living Will
    P->>F: Fill living will form
    P->>F: Add digital signature
    F->>B: POST /api/pdpa/living-will/{patientId}
    B->>GCS: Check existing living will
    
    alt Existing living will
        B->>B: Generate version ID
        B->>GCS: Save current to versions/{versionId}.json
    end
    
    B->>GCS: Write patients/{patientId}/pdpa/living-will.json
    B-->>F: 200 { success, versionId }
    F-->>P: Show version badge

    Note over P,GCS: View Version History
    P->>F: Click "ประวัติเวอร์ชัน"
    F->>B: GET /api/pdpa/living-will/{patientId}/versions
    B->>GCS: List versions/ directory
    B->>GCS: Read each version file
    B-->>F: 200 [versions]
    F-->>P: Display version history modal

    Note over P,GCS: Rollback to Previous Version
    P->>F: Select version to restore
    P->>F: Confirm rollback
    F->>B: POST /api/pdpa/living-will/{patientId}/rollback/{versionId}
    B->>GCS: Read versions/{versionId}.json
    B->>GCS: Save current to new version
    B->>GCS: Restore selected version as current
    B-->>F: 200 { success, data }
    F-->>P: Reload form with restored data
```

---

## 6.7 PDPA Consent Management Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant D as Doctor
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    Note over P,GCS: Doctor Requests Access
    D->>F: Request patient data access
    F->>B: POST /api/pdpa/consents/{patientId}
    B->>GCS: Read consents.json
    B->>B: Create consent request
    B->>GCS: Write consents.json
    B-->>F: Consent request created

    Note over P,GCS: Patient Reviews & Grants
    P->>F: View consent requests
    F->>B: GET /api/pdpa/consents/{patientId}
    B->>GCS: Read consents.json
    B-->>F: 200 { consents, doctorConsents }
    F-->>P: Display consent list

    P->>F: Grant consent to doctor
    F->>B: PUT /api/pdpa/consents/{patientId}/{consentId}
    B->>GCS: Update consent status
    B->>B: Log to audit log
    B->>GCS: Write audit log
    B-->>F: 200 { success }
    F-->>P: Update UI

    Note over P,GCS: Patient Revokes Consent
    P->>F: Revoke consent
    F->>B: PUT /api/pdpa/consents/{patientId}/{consentId}/revoke
    B->>GCS: Update consent (status: revoked)
    B->>B: Log revocation
    B-->>F: 200 { success }
```

---

## 6.8 AI Health Chat Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant AI as Gemini AI

    P->>F: Type health question
    F->>F: Add to conversation history
    F->>B: POST /api/ai/chat
    B->>B: Build AI prompt with context
    B->>AI: Send to Gemini API
    AI-->>B: AI response
    B->>B: Filter medical advice
    B-->>F: 200 { reply }
    F->>F: Add to conversation
    F-->>P: Display AI response
```

---

## 6.9 Map Location Search Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant Geo as Browser Geolocation
    participant B as Backend
    participant GMaps as Google Maps API

    P->>F: Open Map page
    F->>Geo: Request location permission
    
    alt Permission granted
        Geo-->>F: { lat, lng }
        F->>F: Set high accuracy options
        F->>Geo: watchPosition()
        
        loop Continuous tracking
            Geo-->>F: Updated position
            F->>F: Update user marker
        end
        
        F->>B: GET /api/google/maps/nearby
        B->>GMaps: Places API nearbySearch
        GMaps-->>B: Results
        B-->>F: 200 { results }
        F-->>P: Display facilities on map
    else Permission denied
        Geo-->>F: Error
        F-->>P: Show permission request UI
        P->>F: Click "เปิดใช้งานตำแหน่ง"
        F->>Geo: Request again
    end
```

---

## 6.10 Treatment Results Filter Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant B as Backend
    participant GCS as Google Cloud Storage

    P->>F: Open Health Studio
    F->>B: GET /api/appointments/patient/{patientId}
    B->>GCS: Read appointments.json
    B->>B: Filter by patientId
    B-->>F: 200 [appointments]
    F->>F: Store all appointments
    F-->>P: Display with default filter (5 รายการล่าสุด)

    P->>F: Select filter (6 เดือน)
    F->>F: Filter locally by date
    F->>F: Calculate summary stats
    F-->>P: Update display

    P->>F: Select filter (1 ปี)
    F->>F: Filter appointments > 1 year ago
    F-->>P: Update display with grouped months
```

---

## 6.11 Telehealth Session Workflow

```mermaid
sequenceDiagram
    participant P as Patient
    participant D as Doctor
    participant F as Frontend
    participant B as Backend
    participant GMeet as Google Meet

    Note over P,GMeet: Before Appointment
    P->>F: View appointment details
    F->>B: GET /api/appointments/{id}
    B-->>F: { appointment with meetingLink }
    F-->>P: Display "Join Meeting" button

    Note over P,GMeet: Join Meeting
    P->>F: Click "Join Meeting"
    F->>F: Open meetingLink in new tab
    P->>GMeet: Join video call
    D->>GMeet: Join video call

    Note over P,GMeet: During Session
    P->>GMeet: Video consultation
    D->>GMeet: Examine patient

    Note over P,GMeet: After Session
    D->>F: Add diagnosis & prescription
    F->>B: PUT /api/appointments/{id}
    B->>GCS: Update appointment with results
    B-->>F: 200 { updated appointment }
    P->>F: View results in Treatment Results
```

---

## 6.12 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    OVERALL DATA FLOW                             │
└─────────────────────────────────────────────────────────────────┘

                         ┌─────────────┐
                         │   Patient   │
                         └──────┬──────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Health  │ │Appointment│ │  PDPA/   │
             │  Data    │ │  Booking │ │  Legal   │
             └────┬─────┘ └────┬─────┘ └────┬─────┘
                  │            │            │
                  └────────────┼────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Backend Server    │
                    │   (Express.js)      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │    GCS      │     │   Google    │     │   Gemini    │
   │   Storage   │     │   APIs      │     │     AI      │
   └─────────────┘     └─────────────┘     └─────────────┘
         │                    │
         │            ┌───────┴───────┐
         │            │               │
         │     ┌──────┴────┐   ┌──────┴────┐
         │     │ Calendar  │   │   Maps    │
         │     │   Meet    │   │           │
         │     └───────────┘   └───────────┘
         │
   ┌─────┴─────────────────────────────────────┐
   │                                           │
   ▼           ▼           ▼           ▼       │
┌──────┐  ┌────────┐  ┌────────┐  ┌────────┐  │
│Users │  │Patients│  │Doctors │  │Appoint-│  │
│Bucket│  │ Bucket │  │ Bucket │  │ ments  │  │
└──────┘  └────────┘  └────────┘  └────────┘  │
                                              │
```

---

[← Previous: API Reference](./05-api-reference.md) | [Next: Authentication →](./07-authentication.md)
