# Izara Patient Portal - Workflows

## 1. Registration Workflow

```
┌─────────────────────────────────────┐
│     Patient visits Register Page    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 1: Basic Information           │
│ - Name, Email, Phone                │
│ - Date of Birth, Gender             │
│ - Password, Confirm Password        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 2: Health Information          │
│ - Height, Weight, Blood Type        │
│ - Allergies                         │
│ - Chronic Conditions                │
│ - Emergency Contact                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ System Actions:                     │
│ 1. Validate email uniqueness        │
│ 2. Generate userId & patientId      │
│ 3. Hash password (Base64)           │
│ 4. Create user record in GCS        │
│ 5. Create patient profile           │
│ 6. Create session                   │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  Patient automatically logged in    │
│  → Redirect to Dashboard            │
└─────────────────────────────────────┘
```

---

## 2. Login Workflow

```
┌─────────────────────────────────────┐
│      Enter Email & Password         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ POST /api/auth/login                │
│ 1. Find user by email               │
│ 2. Check password (Base64)          │
│ 3. Create 30-min session            │
│ 4. Return user + token              │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  Store token in localStorage        │
│  → Redirect to Dashboard            │
└─────────────────────────────────────┘
```

---

## 3. Appointment Booking Workflow

```
┌─────────────────────────────────────┐
│   Patient clicks "Book Appointment" │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 1: Enter Symptoms              │
│ - Text description                  │
│ - Voice recording (optional)        │
│ - Image upload (optional)           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 2: AI Analysis (Gemini)        │
│ - Suggest urgency level             │
│ - Suggest specialty                 │
│ - Patient reviews & confirms        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 3: Doctor Selection            │
│ - "Let system assign" OR            │
│ - Choose specific doctor            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 4: Select Date & Time          │
│ - View available slots              │
│ - Choose online or onsite           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 5: Add Invitees (optional)     │
│ - Family members                    │
│ - Other consultants                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Step 6: Review & Submit             │
│ - Confirm all details               │
│ - Submit appointment                │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ System Creates Appointment:         │
│ - Status: "pending" or "in_pool"    │
│ - Saved to izara-appointments       │
│ - Notification to doctor/admin      │
└─────────────────────────────────────┘
```

---

## 4. Health Studio (PHR) Workflow

### 4.1 View Health Data
```
Patient → Health Studio → View Sections:
├── Vital Signs (with history chart)
├── Medications (active/inactive)
├── Allergies (with severity)
├── Chronic Conditions
├── Vaccinations
└── Lifestyle Data
```

### 4.2 Add Vital Signs
```
┌─────────────────────────────────────┐
│   Click "Add Vital Signs"           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Enter measurements:                 │
│ - Blood Pressure                    │
│ - Heart Rate                        │
│ - Temperature                       │
│ - Weight                            │
│ - Oxygen Saturation                 │
│ - Blood Glucose                     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ System saves to:                    │
│ patients/{patientId}/vital-signs.json│
│ + Updates phr.json                  │
└─────────────────────────────────────┘
```

### 4.3 Update Lifestyle
```
Patient → Lifestyle Tab → Edit:
├── Diet type
├── Exercise frequency
├── Sleep hours
├── Smoking status
├── Alcohol consumption
├── Supplements
└── Other treatments
→ Save to phr.json
```

---

## 5. View Treatment Results

```
┌─────────────────────────────────────┐
│ After doctor completes appointment  │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Patient views in Treatment Results: │
│ - EMR Summary (doctor-approved)     │
│ - Diagnosis                         │
│ - Treatment Plan                    │
│ - Prescriptions                     │
│ - Lab Results (if any)              │
│ - Follow-up Instructions            │
└─────────────────────────────────────┘
```

---

## 5a. Video Meeting Workflow (Patient Side)

```
┌─────────────────────────────────────┐
│ BEFORE MEETING                      │
├─────────────────────────────────────┤
│ Patient sees in "นัดหมายของฉัน":    │
│ - Confirmed appointment card        │
│ - Meeting link (Jitsi Meet)         │
│ - Date/Time                         │
│ - "เข้าห้องประชุม" button           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ JOIN MEETING                        │
├─────────────────────────────────────┤
│ 1. Click "เข้าห้องประชุม"           │
│ 2. Opens Jitsi Meet in new tab      │
│ 3. URL: meet.jit.si/izara-{id}      │
│ 4. Patient joins as participant     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ DURING MEETING                      │
├─────────────────────────────────────┤
│ - Video call with doctor            │
│ - Share symptoms/images             │
│ - Ask questions                     │
│ - Thai language support             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ AFTER MEETING                       │
├─────────────────────────────────────┤
│ Patient receives:                   │
│ - Treatment results in Health Studio│
│ - AI-generated summary (Thai)       │
│ - Prescription details              │
│ - Follow-up instructions            │
│                                     │
│ Note: Recording stored with doctor  │
│ (patient privacy protected)         │
└─────────────────────────────────────┘
```

### Meeting Access

| Status | What Patient Sees |
|--------|------------------|
| Pending | "รอการยืนยัน" - No meeting link |
| Confirmed | Green card with meeting link |
| Completed | View results in Health Studio |

---

## 6. AI Health Chat Workflow

```
┌─────────────────────────────────────┐
│   Patient opens AI Health Chat      │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Patient types health question       │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ POST /api/ai/chat                   │
│ - Send to Gemini API                │
│ - Context: health-focused           │
│ - Returns helpful response          │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Display AI response                 │
│ (with disclaimer about consulting   │
│  real doctor for diagnosis)         │
└─────────────────────────────────────┘
```

---

## 7. Appointment Status Changes

| Current Status | Patient Action | New Status |
|----------------|----------------|------------|
| pending | Wait | confirmed/declined |
| confirmed | Cancel | cancelled |
| confirmed | Join meeting | completed |
| declined | Book new | pending |

### What Patient Sees by Status

| Status | Patient View |
|--------|--------------|
| pending | "Waiting for doctor confirmation" |
| confirmed | Meeting link + Join button |
| completed | View treatment results |
| declined | Reason + Book again option |
| cancelled | Cancelled notice |

---

## 8. Notification Workflows

### 8.1 Notification System Overview
```
┌─────────────────────────────────────┐
│ NOTIFICATION CHANNELS               │
├─────────────────────────────────────┤
│ 🔔 In-App Notifications             │
│    - Real-time in NotificationBell  │
│    - Stored in GCS                  │
│    - Max 100 per user               │
│                                     │
│ 📧 Email Notifications (Planned)    │
│    - Gmail API integration          │
│    - Thai/English templates         │
│    - Appointment confirmations      │
│    - Meeting links                  │
└─────────────────────────────────────┘
```

### 8.2 Notification Types (Patient)
| Type | Thai | Trigger Event |
|------|------|---------------|
| appointment_requested | ขอนัดหมายสำเร็จ | Patient submits booking |
| appointment_confirmed | นัดหมายได้รับการยืนยัน | Doctor confirms |
| appointment_declined | นัดหมายถูกปฏิเสธ | Doctor declines |
| appointment_cancelled | นัดหมายถูกยกเลิก | Either party cancels |
| emr_signed | เวชระเบียนพร้อมแล้ว | Doctor signs EMR |
| meeting_link_ready | ลิงก์ประชุมพร้อม | Meeting link generated |

### 8.3 Notification Bell Flow
```
┌─────────────────────────────────────┐
│ Patient logs in                     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ NotificationBell component loads    │
│ → GET /api/notifications/{patientId}│
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Display:                            │
│ - Unread count badge (🔴)           │
│ - Dropdown list on click            │
│ - "Mark all as read" option         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Click notification → Navigate to:   │
│ - Appointment details               │
│ - Treatment results                 │
│ - Meeting link                      │
└─────────────────────────────────────┘
```

### 8.4 Notification When Appointment Confirmed
```
┌─────────────────────────────────────┐
│ Doctor confirms appointment         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Backend actions:                    │
│ 1. Generate Jitsi meeting link      │
│ 2. Create notification record       │
│ 3. Store in patient's notifications │
│ 4. (Future) Send email with link    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Patient sees:                       │
│ - Bell badge increments             │
│ - New notification with:            │
│   • Title: นัดหมายได้รับการยืนยัน  │
│   • Doctor name                     │
│   • Meeting link                    │
│   • Date/Time                       │
└─────────────────────────────────────┘
```

### 8.5 Notification Storage
```
Storage: Google Cloud Storage
Bucket: izara-meta-data

Path:
notifications/
└── patients/
    └── {patientId}/
        └── notifications.json

Format:
{
  "notifications": [
    {
      "id": "notif-uuid",
      "type": "appointment_confirmed",
      "title": "นัดหมายได้รับการยืนยัน",
      "message": "แพทย์ได้ยืนยันนัดหมาย...",
      "data": {
        "appointmentId": "apt-xxx",
        "meetingLink": "https://meet.jit.si/izara-xxx"
      },
      "isRead": false,
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

## 9. Meeting Link Flow (Patient Perspective)

### 9.1 How Meeting Links are Generated
```
┌─────────────────────────────────────┐
│ When doctor confirms appointment:   │
│ → notificationService.              │
│   generateMeetingLink(appointmentId)│
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Meeting link format:                │
│ https://meet.jit.si/izara-{id}-{ts} │
│                                     │
│ Example:                            │
│ https://meet.jit.si/izara-apt12345- │
│   1234567890-abc123                 │
└─────────────────────────────────────┘
```

### 9.2 Patient Meeting Access
| Status | What Patient Sees | Can Join? |
|--------|------------------|-----------|
| pending | "รอการยืนยัน" | ❌ No link |
| confirmed | Green card + 🔗 link + "เข้าห้องประชุม" button | ✅ Yes |
| completed | Results in Health Studio | ❌ Meeting ended |

### 9.3 Joining a Meeting
```
┌─────────────────────────────────────┐
│ Patient clicks "เข้าห้องประชุม"     │
│ (Join Meeting button)               │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Jitsi Meet opens in new browser tab │
│ - No login required                 │
│ - Allow camera/microphone           │
│ - Enter display name                │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Wait for doctor (HOST) to start     │
│ room or join if already started     │
└─────────────────────────────────────┘
```

---
**Last Updated:** January 7, 2025
