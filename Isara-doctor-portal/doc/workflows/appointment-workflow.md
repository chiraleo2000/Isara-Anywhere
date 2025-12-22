# 📋 Appointment Workflow

## Overview

This document details the complete appointment lifecycle in the Izara Doctor Portal, from booking through completion.

---

## 📊 Appointment States

```
┌──────────┐     ┌───────────┐     ┌─────────────┐     ┌───────────┐
│ Pending  │────▶│ Confirmed │────▶│ In Progress │────▶│ Completed │
└──────────┘     └───────────┘     └─────────────┘     └───────────┘
     │                │                   │                  
     │                │                   │                  
     ▼                ▼                   ▼                  
┌──────────┐     ┌───────────┐     ┌───────────┐
│Cancelled │     │Rescheduled│     │  No Show  │
└──────────┘     └───────────┘     └───────────┘
```

### State Definitions

| State | Description | Next States |
|-------|-------------|-------------|
| **Pending** | Newly created, awaiting confirmation | Confirmed, Cancelled, Rescheduled |
| **Confirmed** | Doctor/staff confirmed | In Progress, Cancelled, No Show, Rescheduled |
| **In Progress** | Consultation active | Completed, Cancelled |
| **Completed** | Consultation finished | - (Final state) |
| **Cancelled** | Cancelled by patient/doctor | - (Final state) |
| **No Show** | Patient didn't attend | Rescheduled |
| **Rescheduled** | Moved to new date | Pending (new appointment) |

---

## 🔄 Booking Flow

### Patient Booking (From Patient Portal)

```mermaid
sequenceDiagram
    participant P as Patient
    participant PP as Patient Portal
    participant API as GCS API
    participant G as GCS
    participant D as Doctor Portal
    
    P->>PP: Select doctor & time slot
    PP->>API: GET /api/doctors/{id}/availability
    API->>G: Read schedules/{doctorId}/availability.json
    G-->>API: Available slots
    API-->>PP: Available times
    
    P->>PP: Confirm booking
    PP->>API: POST /api/appointments
    API->>G: Write appointments/{id}.json
    API->>G: Update appointments.json (index)
    G-->>API: Appointment created
    API-->>PP: Booking confirmed
    
    Note over D: Real-time notification
    API->>D: WebSocket: appointment:new
    D->>D: Update appointment list
```

### Staff Booking (From Doctor Portal)

```mermaid
sequenceDiagram
    participant S as Staff/Doctor
    participant DP as Doctor Portal
    participant API as GCS API
    participant G as GCS
    
    S->>DP: Navigate to Schedule
    DP->>API: GET /api/appointments?doctorId={id}&date={date}
    API->>G: Read appointments.json
    G-->>API: Day's appointments
    API-->>DP: Appointment list
    
    S->>DP: Click "Add Appointment"
    S->>DP: Search patient
    DP->>API: GET /api/patients?search={query}
    API-->>DP: Patient results
    
    S->>DP: Select patient & details
    DP->>API: POST /api/appointments
    API->>G: Create appointment
    G-->>API: Created
    API-->>DP: Appointment created
    DP->>DP: Refresh schedule view
```

---

## ✅ Confirmation Flow

```mermaid
sequenceDiagram
    participant S as Staff
    participant DP as Doctor Portal
    participant API as GCS API
    participant G as GCS
    participant N as Notification Service
    
    S->>DP: View pending appointments
    DP->>API: GET /api/appointments?status=Pending
    API-->>DP: Pending list
    
    S->>DP: Click "Confirm"
    DP->>API: PUT /api/appointments/{id}/status
    Note right of API: { status: "Confirmed" }
    API->>G: Update appointment status
    API->>N: Trigger confirmation notification
    N->>N: Send email/SMS to patient
    G-->>API: Updated
    API-->>DP: Status updated
```

---

## 📱 Telehealth Appointment Flow

### Pre-Consultation

```mermaid
flowchart TD
    A[Confirmed Telehealth Appointment] --> B[15 min before: Send reminder]
    B --> C{Patient checks in?}
    C -->|Yes| D[Add to Doctor's Queue]
    C -->|No, 5 min| E[Send final reminder]
    E --> F{Patient checks in?}
    F -->|Yes| D
    F -->|No| G[Mark as No Show candidate]
    
    D --> H[Generate Meet Link]
    H --> I[Wait for Doctor]
    I --> J{Doctor starts consultation?}
    J -->|Yes| K[Status: In Progress]
    J -->|No, 15 min| L[Notify Doctor]
```

### During Consultation

```mermaid
sequenceDiagram
    participant P as Patient
    participant D as Doctor
    participant DP as Doctor Portal
    participant M as Meeting Service
    participant AI as Gemini AI
    
    D->>DP: Click "Start Consultation"
    DP->>M: POST /api/meetings/create
    M-->>DP: Meeting link + ID
    
    DP->>DP: Open video meeting
    P->>DP: Join meeting via link
    
    Note over D,P: Video consultation in progress
    
    D->>DP: Open AI Copilot
    DP->>AI: Stream patient conversation
    AI-->>DP: Real-time suggestions
    
    D->>DP: Record notes
    D->>DP: Add diagnosis
    D->>DP: Write prescription
    
    D->>DP: End consultation
    DP->>M: POST /api/meetings/{id}/end
    M->>AI: Generate summary
    AI-->>M: AI summary
    M-->>DP: Meeting ended + summary
```

---

## 🏥 In-Person Appointment Flow

### Check-In Process

```mermaid
sequenceDiagram
    participant P as Patient
    participant R as Reception
    participant DP as Doctor Portal
    participant Q as Queue System
    participant D as Doctor
    
    P->>R: Arrive at clinic
    R->>DP: Search patient appointment
    R->>DP: Click "Check In"
    DP->>Q: Add to doctor's queue
    Q-->>DP: Queue position assigned
    DP-->>R: Queue number: 105
    R-->>P: "Please wait, #105"
    
    Note over Q: Queue display updates
    
    D->>DP: View Queue
    D->>DP: Call next patient
    DP->>Q: Update status: in-consultation
    Q-->>Q: Display: "105 - Room 3"
    
    D->>DP: Complete consultation
    DP->>Q: Update status: completed
    Q-->>Q: Remove from queue
```

---

## 📝 Consultation Documentation

### EMR Creation During Appointment

```mermaid
flowchart TD
    A[Start Consultation] --> B[Appointment status: In Progress]
    B --> C[Open Patient Record]
    C --> D[Record Vital Signs]
    D --> E[Document Chief Complaint]
    E --> F[History of Present Illness]
    F --> G[Physical Examination]
    G --> H[AI-Assisted Analysis]
    H --> I{Need additional tests?}
    I -->|Yes| J[Order Lab Tests]
    I -->|No| K[Assess & Diagnose]
    J --> K
    K --> L[Create Treatment Plan]
    L --> M{Need prescriptions?}
    M -->|Yes| N[Write Prescriptions]
    M -->|No| O[Document Follow-up]
    N --> O
    O --> P[Finalize EMR]
    P --> Q[Digital Signature]
    Q --> R[Complete Appointment]
```

---

## 💰 Post-Consultation Workflow

### Billing & Completion

```mermaid
sequenceDiagram
    participant D as Doctor
    participant DP as Doctor Portal
    participant API as GCS API
    participant B as Billing System
    participant P as Patient
    
    D->>DP: Click "Complete Consultation"
    DP->>DP: Validate required fields
    
    alt EMR not finalized
        DP-->>D: "Please finalize EMR first"
        D->>DP: Finalize EMR
    end
    
    DP->>API: PUT /api/appointments/{id}/status
    Note right of API: { status: "Completed", result: {...} }
    
    API->>API: Calculate service costs
    API->>B: Create invoice
    B-->>API: Invoice created
    
    API-->>DP: Appointment completed
    
    DP->>DP: Show billing summary
    D->>DP: Process payment
    DP->>B: POST /api/payments
    B-->>DP: Payment processed
    
    B->>P: Send receipt via email
```

---

## 🔄 Rescheduling Flow

```mermaid
sequenceDiagram
    participant U as User (Patient/Staff)
    participant P as Portal
    participant API as GCS API
    participant G as GCS
    participant N as Notification
    
    U->>P: Request reschedule
    P->>API: GET /api/doctors/{id}/availability
    API-->>P: Available slots
    
    U->>P: Select new date/time
    P->>API: PUT /api/appointments/{id}
    Note right of API: { date: newDate, status: "Rescheduled" }
    
    API->>G: Update original appointment
    Note over G: Mark as Rescheduled
    
    API->>G: Create new appointment
    Note over G: Link to original
    
    API->>N: Send reschedule notification
    N-->>U: Confirmation email/SMS
    
    API-->>P: Reschedule complete
```

---

## ❌ Cancellation Flow

```mermaid
flowchart TD
    A[Cancellation Request] --> B{Appointment Status}
    B -->|Pending| C[Cancel immediately]
    B -->|Confirmed| D{Time until appointment}
    D -->|> 24 hours| C
    D -->|< 24 hours| E[Late cancellation warning]
    E --> F{Proceed?}
    F -->|Yes| G[Cancel with fee]
    F -->|No| H[Keep appointment]
    
    C --> I[Update status: Cancelled]
    G --> I
    I --> J[Free up time slot]
    J --> K[Send cancellation notice]
    K --> L{Refund applicable?}
    L -->|Yes| M[Process refund]
    L -->|No| N[Complete]
    M --> N
```

---

## 📊 Appointment Types

### Telehealth

| Aspect | Details |
|--------|---------|
| Duration | 15-30 minutes |
| Requirements | Video-capable device, stable internet |
| Meet Link | Generated 15 min before |
| Recording | With patient consent |
| AI Features | Real-time transcription, suggestions |

### In-Person

| Aspect | Details |
|--------|---------|
| Duration | 15-60 minutes |
| Check-in | Required at reception |
| Queue | Physical queue system |
| Documentation | Same-day EMR required |

### Emergency

| Aspect | Details |
|--------|---------|
| Priority | Highest |
| Queue Position | Immediate/Front |
| Documentation | Can be retrospective |
| Billing | Emergency rates apply |

### Follow-up

| Aspect | Details |
|--------|---------|
| Duration | 10-20 minutes |
| Link | Connected to previous appointment |
| Preparation | Previous EMR loaded |
| Billing | Reduced rate |

---

## 🔔 Notifications

### Notification Timeline

| Timing | Notification Type | Channel |
|--------|-------------------|---------|
| Booking | Confirmation | Email + SMS |
| 24 hours before | Reminder | Email + SMS + Push |
| 1 hour before | Final reminder | Push |
| 15 min before (Telehealth) | Join link | Email + SMS |
| After completion | Summary + follow-up | Email |
| Payment received | Receipt | Email |

---

## 📈 Reporting & Analytics

### Appointment Metrics Tracked

- Total appointments by type
- Completion rate
- No-show rate
- Average consultation duration
- Time to confirmation
- Rescheduling frequency
- Revenue per appointment
- Patient satisfaction scores
