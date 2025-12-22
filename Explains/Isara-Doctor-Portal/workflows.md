# Izara Doctor Portal - Workflows

## 1. Doctor Registration Workflow

```
┌─────────────────────────────────────┐
│   Doctor visits Registration Page   │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Fill Registration Form:             │
│ - Name, Email, Phone                │
│ - Medical License Number            │
│ - Specialty                         │
│ - Password                          │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ POST /auth/register                 │
│ 1. Validate email uniqueness        │
│ 2. Generate DOC-xxx userId          │
│ 3. Hash password (bcrypt)           │
│ 4. Create credential file           │
│ 5. Add to users index               │
│ 6. Add to pending-approvals         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Status: PENDING APPROVAL            │
│ - isActive: false                   │
│ - isApproved: false                 │
│ - approvalStatus: 'pending'         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Show "Pending Approval" message     │
│ Admin receives notification         │
└─────────────────────────────────────┘
```

---

## 2. Doctor Login Workflow

```
┌─────────────────────────────────────┐
│      Enter Email & Password         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ POST /auth/login                    │
│ Security Checks:                    │
│ 1. Rate limit (10/15min)            │
│ 2. Account lock check               │
│ 3. Find user by email               │
│ 4. Check approval status            │
│ 5. Check account active             │
│ 6. Verify password (bcrypt)         │
│ 7. Reset login attempts             │
│ 8. Create 24-hour session           │
│ 9. Log audit event                  │
└─────────────────┬───────────────────┘
                  ▼
        ┌─────────┴─────────┐
        ▼                   ▼
   [Doctor]            [Admin]
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────┐
│   Dashboard  │  │   Dashboard  │
│  (standard)  │  │ (with admin  │
│              │  │   features)  │
└──────────────┘  └──────────────┘
```

### Login Error Codes

| Error | Message | Action |
|-------|---------|--------|
| RATE_LIMIT | Too many attempts | Wait 15 min |
| ACCOUNT_LOCKED | Account locked | Wait 30 min |
| PENDING_APPROVAL | Awaiting approval | Wait for admin |
| ACCOUNT_REJECTED | Rejected | Contact admin |
| INVALID_CREDENTIALS | Wrong credentials | Check input |

---

## 3. Appointment Confirmation Workflow

```
┌─────────────────────────────────────┐
│ Patient books appointment           │
│ → Status: 'pending' or 'in_pool'    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Doctor sees in Patient Queue:       │
│ - Patient name & symptoms           │
│ - AI urgency analysis               │
│ - Requested date/time               │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Click "Confirm Appointment"         │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Confirmation Modal:                 │
│ - Set confirmed date/time           │
│ - Add notes (optional)              │
│ - Click "Confirm"                   │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ System Actions:                     │
│ 1. Generate Jitsi Meet link         │
│    (meet.jit.si/izara-{appointmentId}) │
│ 2. Update status → 'confirmed'      │
│ 3. Save confirmedDate/Time          │
│ 4. Move to Scheduled Meetings       │
│ 5. Notify patient                   │
└─────────────────────────────────────┘
```

---

## 3a. Video Meeting Workflow (Jitsi Meet)

```
┌─────────────────────────────────────┐
│ MEETING START                       │
├─────────────────────────────────────┤
│ Doctor (HOST):                      │
│ 1. Opens Scheduled Meetings tab     │
│ 2. Clicks "Join Meeting" button     │
│ 3. Enters Jitsi Meet room           │
│ 4. Has recording permissions        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Patient (PARTICIPANT):              │
│ 1. Sees meeting link in dashboard   │
│ 2. Clicks "เข้าห้องประชุม"          │
│ 3. Joins Jitsi room                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ DURING MEETING                      │
│ - Video/audio consultation          │
│ - Screen sharing (if needed)        │
│ - Local recording enabled           │
│ - Thai language support             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ MEETING END                         │
│ Doctor ends meeting                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ POST-MEETING PROCESSING             │
├─────────────────────────────────────┤
│ 1. Recording uploaded to GCS        │
│    Bucket: izara-doctors-data       │
│    Path: doctors/{doctorId}/        │
│          meetings/{appointmentId}/  │
│                                     │
│ 2. Speech-to-Text Transcription     │
│    API: Google Cloud Speech-to-Text │
│    Language: th-TH + en-US          │
│    Output: transcript.txt           │
│                                     │
│ 3. AI Summary Generation            │
│    API: Gemini (gemini-2.5-flash)   │
│    Format: Thai SOAP format         │
│    Output: summary.txt              │
│                                     │
│ 4. Doctor Recommendations           │
│    Output: recommendations.txt      │
│    Includes: differential diagnosis,│
│    treatment suggestions            │
└─────────────────────────────────────┘
```

### Meeting Link Format

| Provider | URL Format | Features |
|----------|------------|----------|
| Jitsi Meet | `https://meet.jit.si/izara-{appointmentId}` | FREE, no account needed |

### Storage Structure

```
izara-doctors-data/
└── doctors/{doctorId}/
    └── meetings/{appointmentId}/
        ├── recording.webm
        ├── transcript.txt
        ├── summary.txt
        └── recommendations.txt
```

---

## 4. EMR Creation Workflow

```
┌─────────────────────────────────────┐
│ Doctor joins meeting / sees patient │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Open EMR Editor for appointment     │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Tab S - ประวัติ (Subjective):       │
│ - Chief complaint                   │
│ - History of present illness        │
│ - Past medical history              │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Tab O - ตรวจร่างกาย (Objective):    │
│ - Vital signs                       │
│ - Physical examination              │
│ - General appearance                │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Tab A - การวินิจฉัย (Assessment):   │
│ - Primary diagnosis (ICD-10)        │
│ - Secondary diagnoses               │
│ - Differential diagnoses            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Tab P - การรักษา (Plan):            │
│ - Treatment plan                    │
│ - Medications                       │
│ - Lab orders                        │
│ - Follow-up instructions            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Tab AI - สรุป AI:                   │
│ - Generate AI summary               │
│ - Review & approve                  │
│ - This goes to patient              │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Sign & Save EMR                     │
│ → Status: 'completed'               │
│ → Patient sees treatment results    │
└─────────────────────────────────────┘
```

---

## 5. Prescribing Workflow

```
┌─────────────────────────────────────┐
│ From EMR → Tab P (Treatment Plan)   │
│ Click "Add Prescription"            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Search/Select Medication:           │
│ - Drug name                         │
│ - Dosage form                       │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ System Checks:                      │
│ ⚠️ Patient allergies                │
│ ⚠️ Drug interactions                │
│ ⚠️ Contraindications                │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Fill Prescription Details:          │
│ - Dosage (e.g., 500mg)              │
│ - Frequency (e.g., 3x daily)        │
│ - Duration (e.g., 7 days)           │
│ - Quantity (e.g., 21 tablets)       │
│ - Instructions                      │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Save Prescription                   │
│ → Linked to appointment             │
│ → Print available                   │
│ → Patient can view                  │
└─────────────────────────────────────┘
```

---

## 6. Clinical Resources Workflow

### Doctor Creates Content
```
┌─────────────────────────────────────┐
│ Click "Create Resource"             │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Fill Form:                          │
│ - Title (EN/TH)                     │
│ - Category                          │
│ - Resource Type                     │
│ - Content (Markdown)                │
│ - Tags                              │
│ - References                        │
└─────────────────┬───────────────────┘
                  ▼
        ┌─────────┴─────────┐
        ▼                   ▼
  [Save Draft]     [Submit for Approval]
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────┐
│ Status:      │  │ Status:      │
│ 'draft'      │  │ 'pending'    │
│ Only you see │  │ Admin sees   │
└──────────────┘  └──────────────┘
```

### Admin Reviews
```
┌─────────────────────────────────────┐
│ Admin sees pending badge            │
│ Opens pending list                  │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Review content:                     │
│ - Read full text                    │
│ - Check accuracy                    │
│ - Add comments (optional)           │
└─────────────────┬───────────────────┘
                  ▼
        ┌─────────┴─────────┐
        ▼                   ▼
   [Approve]           [Reject]
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────┐
│ Status:      │  │ Status:      │
│ 'published'  │  │ 'rejected'   │
│ All see      │  │ + reason     │
└──────────────┘  └──────────────┘
```

---

## 7. Admin: Doctor Approval Workflow

```
┌─────────────────────────────────────┐
│ New doctor registers                │
│ → Status: 'pending'                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Admin → Doctor Management           │
│ → Pending tab                       │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Review:                             │
│ - Name, Email                       │
│ - Medical License                   │
│ - Specialty                         │
└─────────────────┬───────────────────┘
                  ▼
        ┌─────────┴─────────┐
        ▼                   ▼
   [Approve]           [Reject]
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────┐
│ isActive:true│  │ isActive:    │
│ isApproved:  │  │  false       │
│  true        │  │ + reason     │
│ Can login    │  │ Cannot login │
└──────────────┘  └──────────────┘
```

---

## 8. Admin: Role Change Workflow

```
┌─────────────────────────────────────┐
│ Admin → Doctor Management           │
│ → Find approved doctor              │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Click "Manage Role"                 │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Select New Role:                    │
│ ○ Doctor (regular)                  │
│ ● Admin (elevated)                  │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ POST /admin/update-role             │
│ 1. Update role field                │
│ 2. Set isAdmin flag                 │
│ 3. Add/remove adminPrivileges       │
│ 4. Update index                     │
│ 5. Audit log                        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ User now has new permissions        │
│ (effective next login)              │
└─────────────────────────────────────┘
```

---

## 9. Notification Workflows (Doctor Portal)

### 9.1 Notification System Overview
```
┌─────────────────────────────────────┐
│ DOCTOR NOTIFICATION CHANNELS        │
├─────────────────────────────────────┤
│ 🔔 In-App (DoctorNotificationBell)  │
│    - Real-time notification bell    │
│    - Badge shows unread count       │
│    - Dropdown list of notifications │
│                                     │
│ 📧 Email (Future)                   │
│    - New appointment requests       │
│    - Urgent patient alerts          │
└─────────────────────────────────────┘
```

### 9.2 Notification Types (Doctor)
| Type | Thai | Trigger Event |
|------|------|---------------|
| appointment_requested | มีผู้ป่วยขอนัดหมายใหม่ | Patient submits booking |
| appointment_assigned | ได้รับมอบหมายนัดหมาย | Admin assigns appointment |
| appointment_cancelled | ผู้ป่วยยกเลิกนัดหมาย | Patient cancels |
| new_patient_queue | มีผู้ป่วยในคิวรอ | Patient added to pool |
| emr_needs_signature | เวชระเบียนรอลงนาม | EMR ready for signing |
| system_alert | แจ้งเตือนจากระบบ | System notification |

### 9.3 DoctorNotificationBell Component
```
Location: src/components/notifications/DoctorNotificationBell.tsx

┌─────────────────────────────────────┐
│ Component Load Flow:                │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ GET /api/notifications/doctor/{id}  │
│ From: GCS API Server (port 3012)    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Display in header:                  │
│ - Bell icon (🔔)                    │
│ - Red badge with unread count       │
│ - Click to show dropdown            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Dropdown options:                   │
│ - List of notifications             │
│ - Click to navigate to context      │
│ - "Mark all as read" button         │
│ - "ดูทั้งหมด" (View all) link       │
└─────────────────────────────────────┘
```

### 9.4 Notification When Patient Requests Appointment
```
┌─────────────────────────────────────┐
│ Patient submits appointment request │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Backend actions:                    │
│ 1. Create appointment (status:      │
│    'pending' or 'in_pool')          │
│ 2. If specific doctor selected:     │
│    → Create notification for doctor │
│ 3. Store in doctor's notifications  │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Doctor sees:                        │
│ - Bell badge increments (🔴)        │
│ - New notification:                 │
│   • "มีผู้ป่วยขอนัดหมายใหม่"        │
│   • Patient name                    │
│   • Symptoms summary                │
│   • Requested date/time             │
│ - Patient appears in queue          │
└─────────────────────────────────────┘
```

### 9.5 Notification Storage (Doctor)
```
Storage: Google Cloud Storage
Bucket: izara-meta-data

Path:
notifications/
└── doctors/
    └── {doctorId}/
        └── notifications.json

Format:
{
  "notifications": [
    {
      "id": "notif-uuid",
      "type": "appointment_requested",
      "title": "มีผู้ป่วยขอนัดหมายใหม่",
      "message": "คุณ ชื่อผู้ป่วย ขอนัดพบแพทย์...",
      "data": {
        "appointmentId": "apt-xxx",
        "patientId": "PAT-xxx",
        "patientName": "ชื่อ นามสกุล"
      },
      "isRead": false,
      "createdAt": "2025-01-01T10:00:00Z"
    }
  ]
}
```

### 9.6 Notification API Endpoints (GCS Server)
```
Base URL: http://localhost:3012

GET  /api/notifications/doctor/{doctorId}
     → Returns list of doctor's notifications

PUT  /api/notifications/{notificationId}/read
     → Mark single notification as read

PUT  /api/notifications/doctor/{doctorId}/read-all
     → Mark all notifications as read

POST /api/notifications/doctor
     → Create new notification for doctor
```

---

## 10. Doctor Meeting Workflow (HOST Role)

### 10.1 Doctor as Meeting HOST
```
┌─────────────────────────────────────┐
│ DOCTOR RESPONSIBILITIES AS HOST     │
├─────────────────────────────────────┤
│ ✅ Start the meeting first          │
│ ✅ Control room access              │
│ ✅ Record meeting (local)           │
│ ✅ End meeting when consultation    │
│    is complete                      │
└─────────────────────────────────────┘
```

### 10.2 Pre-Meeting Checklist
```
┌─────────────────────────────────────┐
│ Before Starting Meeting:            │
├─────────────────────────────────────┤
│ 1. Review patient's PHR             │
│ 2. Check previous EMRs              │
│ 3. Prepare consultation notes       │
│ 4. Ensure camera/mic are working    │
│ 5. Click "เข้าห้องประชุม" button    │
└─────────────────────────────────────┘
```

### 10.3 Doctor Meeting Flow
```
┌─────────────────────────────────────┐
│ Go to Scheduled Meetings tab        │
│ (นัดหมายที่กำหนด)                   │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Find confirmed appointment          │
│ Click "Join Meeting" button         │
│ (เข้าห้องประชุม)                    │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Jitsi Meet opens in new tab         │
│ - Doctor enters as HOST             │
│ - Can enable recording              │
│ - Can admit patients to room        │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ Patient joins meeting               │
│ - Conduct video consultation        │
│ - Thai language supported           │
│ - Share screen if needed            │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│ End meeting                         │
│ - Recording saved locally           │
│ - Return to portal                  │
│ - Complete EMR                      │
└─────────────────────────────────────┘
```

### 10.4 Post-Meeting Processing
```
┌─────────────────────────────────────┐
│ After Meeting Ends:                 │
├─────────────────────────────────────┤
│ 1. Recording uploaded to GCS        │
│    Path: doctors/{doctorId}/        │
│          meetings/{appointmentId}/  │
│                                     │
│ 2. Speech-to-Text Transcription     │
│    API: Google Cloud Speech-to-Text │
│    Languages: th-TH, en-US          │
│                                     │
│ 3. AI Summary Generation            │
│    API: Gemini gemini-2.5-flash     │
│    Format: Thai SOAP format         │
│                                     │
│ 4. Doctor writes/reviews EMR        │
│    - Can use AI suggestions         │
│    - Manual edits allowed           │
│                                     │
│ 5. Sign EMR                         │
│    - Patient gets notification      │
│    - Results visible in portal      │
└─────────────────────────────────────┘
```

### 10.5 Meeting Recording Storage
```
izara-doctors-data/
└── doctors/{doctorId}/
    └── meetings/{appointmentId}/
        ├── recording.webm       # Video recording
        ├── transcript.txt       # Speech-to-Text output
        ├── summary.txt          # AI-generated summary
        └── recommendations.txt  # AI recommendations
```

---
**Last Updated:** January 7, 2025
