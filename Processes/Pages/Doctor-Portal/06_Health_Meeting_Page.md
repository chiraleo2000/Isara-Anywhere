# 🎥 Doctor Portal — Health Meeting Page

**Route:** `/health-meeting`  
**Component:** `src/pages/HealthMeeting.tsx`  
**Access:** 🔒 Doctor / Admin  
**Thai Title:** การประชุมสุขภาพ / Health Meeting  
**Version:** v1.4.7

---

## 1. Purpose

Manage patient queue, confirm appointments with meeting links, and launch Jitsi video consultations. Admin-specific features include viewing all appointments and assigning from the pool.

---

## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🎥 การประชุมสุขภาพ (Health Meeting)                                 │
│                                                                     │
│  Tabs: [📋 คิวผู้ป่วย (Queue)] [📹 ประชุม (Meetings)]               │
│        [� ผลประชุม (Results)] [📅 ทั้งหมด (All)] ← Admin only      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              (Tab Content Area)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tab: Patient Queue (คิวผู้ป่วย)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 คิวผู้ป่วย (Patient Queue)                                       │
│  Sorted by: Urgency (emergency > urgent > normal), then FIFO       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔴 EMERGENCY  นายสมชาย มั่นคง         09:00                │   │
│  │  อาการ: เจ็บหน้าอก รุนแรง                                    │   │
│  │  ประเภท: Telehealth · สถานะ: Pending                         │   │
│  │  [✅ ยืนยัน (Confirm)] [📋 ดูประวัติ]                          │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🟡 URGENT  นายอานันท์ ขยันเรียน        10:30                │   │
│  │  อาการ: ปวดหัวรุนแรง 5 วัน                                   │   │
│  │  ประเภท: Telehealth · สถานะ: In Pool                         │   │
│  │  [✅ ยืนยัน] [🤖 Auto-Assign] [📋 ดูประวัติ]                  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🟢 NORMAL  นางสมศรี ดีงาม              14:00                │   │
│  │  อาการ: ติดตามความดันโลหิต                                    │   │
│  │  ประเภท: In-person · สถานะ: Awaiting Response                │   │
│  │  [✅ ยืนยัน] [❌ ปฏิเสธ] [📋 ดูประวัติ]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Queue Controls:                                                    │
│  [📢 เรียกคนถัดไป (Call Next)] [⏭️ ข้าม (Skip)]                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Queue Statuses

| Status | Thai | Description |
| ------ | ---- | ----------- |
| pending | รอดำเนินการ | New appointment request |
| in_pool | รอจัดสรร | In unassigned pool |
| awaiting_doctor_response | รอแพทย์ตอบรับ | Assigned, waiting confirmation |
| assigned | มอบหมายแล้ว | Admin assigned to doctor |

---

## 4. Tab: Scheduled Meetings (ประชุม)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📹 ประชุมที่กำหนด (Scheduled Meetings)                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟢 09:00  นายสมชาย มั่นคง                                   │   │
│  │  Telehealth · ยืนยันแล้ว                                      │   │
│  │  📹 Doctor URL: [Copy] [Open]                                │   │
│  │  📹 Patient URL: [Copy]                                      │   │
│  │  👥 Guest URL: [Copy]                                        │   │
│  │                                                              │   │
│  │  [📹 เริ่มประชุม (Start Meeting)]                             │   │
│  │  [📧 ส่งอีเมลยืนยัน (Send Confirmation Email)]               │   │
│  │  [👥 เชิญผู้เข้าร่วม (Invite Participants)]                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 4a. Tab: Meeting Results (📊 ผลประชุม)

Displays completed meetings with AI-generated SOAP summaries awaiting doctor validation.

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📊 ผลประชุม (Meeting Results)                                       │
│                                                                     │
│  Filter: [🟡 Pending Validation] [✅ Approved] [📋 All]             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟡 PENDING VALIDATION                                      │   │
│  │  👤 นายสมชาย มั่นคง · 22 ม.ค. 2569, 09:00-09:45            │   │
│  │  Duration: 45 min · Participants: 3                         │   │
│  │                                                              │   │
│  │  🤖 AI SOAP Summary (Gemini 2.5 Flash Lite):                │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │  S: ปวดหัว 3 วัน ตื้อๆ บริเวณขมับทั้ง 2 ข้าง            │ │   │
│  │  │  O: BP 130/85, HR 78, Temp 36.5°C                      │ │   │
│  │  │  A: Tension headache (ICD-10: G44.2)                   │ │   │
│  │  │  P: Paracetamol 500mg prn, stress reduction,           │ │   │
│  │  │     follow-up 2 weeks                                   │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  📊 30-Min Sections: [Section 1: 09:00-09:30] [Section 2]   │   │
│  │  📝 Transcript: 127 segments · Chat: 8 messages              │   │
│  │                                                              │   │
│  │  [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]          │   │
│  │  [📋 Open EMR Editor] [📄 View Full Transcript]              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Meeting Result Card Details

| Field | Description |
| ----- | ----------- |
| Patient Name | Patient who attended the meeting |
| Date/Time | Meeting date and time window |
| Duration | Total meeting duration |
| Participants | Count of all participants (doctor, patient, guests) |
| AI SOAP Summary | Gemini 2.5 Flash Lite generated SOAP format summary |
| 30-Min Sections | For meetings > 30 min, sectioned summaries are generated |
| Transcript Segments | Count of transcript segments captured via Web Speech API |
| Chat Messages | Count of text chat messages captured during meeting |
| Validation Status | 🟡 Pending / ✅ Approved / ✏️ Edited / ❌ Rejected |

---

### 4b. Multi-Party Meeting Invitations

Doctors can invite additional participants to create Microsoft Teams-like multi-party consultations.

```text
┌── Invite Participants ──────────────────────────────────────┐
│                                                              │
│  📹 Meeting: นายสมชาย มั่นคง — 22 ม.ค. 2569, 09:00          │
│                                                              │
│  👨‍⚕️ Doctor Invites (registered doctors/admin):               │
│  [🔍 Search doctor...____________]                           │
│  ├── ✅ พญ.สมศรี (Cardiologist) — Invited                   │
│  └── ➕ Add another doctor                                   │
│                                                              │
│  👥 Patient Guest Invites (relatives/friends):               │
│  Patient can share Guest URL with up to 3 guests             │
│  ├── Guest URL: https://meet.jit.si/izara-xxxx?guest=1      │
│  └── 📋 Copy Guest URL                                      │
│                                                              │
│  ⚠️ Non-registered users:                                    │
│  - Enter display name from blank on join                     │
│  - Placed in lobby awaiting doctor approval                  │
│  - Doctor approves/rejects each participant individually     │
│                                                              │
│  [📧 Send Invitations]  [❌ Cancel]                           │
└──────────────────────────────────────────────────────────────┘
```

#### Participant Roles

| Role | Icon | Capabilities | URL Type |
| ---- | ---- | ------------ | -------- |
| Doctor (HOST) | 👨‍⚕️ | Moderator, lobby control, transcript control, mute all | Doctor URL |
| Patient | 🧑 | Video/audio, chat, screen share (limited) | Patient URL |
| Guest (relative/friend) | 👥 | Video/audio, chat only | Guest URL |
| Invited Doctor | 👨‍⚕️ | Video/audio, chat, clinical notes access | Doctor URL |
| Admin | 🔧 | Video/audio, chat, meeting management | Admin URL |

---

### 4c. Man-in-the-Loop Validation Actions

All AI-generated meeting summaries require doctor validation before reaching the patient.

```text
┌── Validation Panel ─────────────────────────────────────────┐
│                                                              │
│  🤖 AI Meeting Summary — นายสมชาย มั่นคง                     │
│  Generated by: Gemini 2.5 Flash Lite                        │
│  Source: Transcript (127 segments) + Chat (8 messages)      │
│  Confidence: 92%                                             │
│                                                              │
│  Actions:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✅ Approve     → Summary sent to EMR Editor as-is      │ │
│  │ ✏️ Edit        → Opens inline editor for modifications │ │
│  │ 🔄 Regenerate  → Re-runs AI pipeline with feedback     │ │
│  │ ❌ Reject      → Discards AI summary, manual entry     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  After Approval:                                             │
│  → 📋 Open EMR Editor (pre-filled with validated summary)   │
│  → 📄 Generate Patient Instruction Sheet                    │
│  → 📧 Notify patient when finalized                         │
│                                                              │
│  Validation History:                                         │
│  [View audit trail of all validation actions]                │
└──────────────────────────────────────────────────────────────┘
```

#### Validation Status Flow

```text
Meeting Ends → AI Pipeline Processes → 🟡 Pending Validation
    ↓
Doctor Reviews Summary
    ↓
┌─────────┬─────────────┬──────────────┬─────────────┐
│ Approve │ Edit        │ Regenerate   │ Reject      │
│    ↓    │    ↓        │    ↓         │    ↓        │
│ ✅ Done │ ✏️ Modified │ 🔄 Re-queued │ ❌ Manual   │
│    ↓    │    ↓        │    ↓         │    ↓        │
│ EMR     │ EMR Editor  │ New AI Pass  │ EMR Editor  │
│ Editor  │ (pre-fill)  │ → Re-review  │ (blank)     │
└─────────┴─────────────┴──────────────┴─────────────┘
```

---

## 5. Appointment Confirmation Flow

```text
┌── Confirm Appointment ──────────────────────────────────────┐
│                                                              │
│  👤 Patient: นายสมชาย มั่นคง                                 │
│  📅 Date: [2569-01-22]                                      │
│  ⏰ Time: [09:00]                                           │
│                                                              │
│  📧 Send confirmation to:                                    │
│  ☑️ Patient (demo.test@gmail.com)                           │
│  ☐ Additional recipients: [________________]                │
│                                                              │
│  [ยืนยันนัดหมาย (Confirm Appointment)]                       │
│                                                              │
│  → System creates Jitsi meeting link                        │
│  → Sends email with meeting details                         │
│  → Patient receives notification                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Jitsi Meeting URL Generation

When doctor confirms an appointment:

| URL Type | Purpose | Recipient |
| -------- | ------- | --------- |
| Doctor URL | Moderator access with lobby control | Doctor |
| Patient URL | Guest access, enters lobby | Patient |
| Guest URL | Guest access for invitees | Relatives/consultants |

### Jitsi Configuration

| Setting | Value |
| ------- | ----- |
| Prejoin Page | Enabled |
| Lobby | Enabled (doctor approves entry) |
| Default Language | Thai (th) |
| Camera | Default ON |
| Microphone | Default ON |
| Recording | Enabled |
| Chat | Always available |

---

## 7. Workflows

### Workflow 1: Confirm Pending Appointment

```text
Step 1: View pending appointment in Queue tab
Step 2: Click "ยืนยัน" (Confirm)
Step 3: Select date/time in confirmation dialog
Step 4: Select email recipients
Step 5: Click "ยืนยันนัดหมาย"
Step 6: PATCH /api/appointments/:id → status: confirmed
Step 7: POST /api/meetings/create → generates Jitsi URLs
Step 8: Confirmation email sent to patient
Step 9: Appointment moves to Meetings tab
```

### Workflow 2: Start Video Meeting

```text
Step 1: Find confirmed appointment in Meetings tab
Step 2: Click "เริ่มประชุม" (Start Meeting)
Step 3: Jitsi opens in new tab (doctor as HOST)
Step 4: Doctor waits for patient to join lobby
Step 5: Doctor admits patient from lobby
Step 6: Consultation begins with live transcription
```

### Workflow 3: Admin — Assign from Pool

```text
Step 1: Admin views in_pool appointments
Step 2: Click "Auto-Assign" → AI matches specialty
Step 3: Or manually select doctor from dropdown
Step 4: PATCH /api/appointments/:id → assigned to doctor
Step 5: Doctor receives notification
Step 6: Appointment status: awaiting_doctor_response
```

### Workflow 4: Queue Management

```text
Step 1: Click "เรียกคนถัดไป" (Call Next Patient)
Step 2: Next patient by priority called
Step 3: Or click "ข้าม" (Skip) → Skip reason modal
Step 4: Patient skipped with reason logged
Step 5: Next patient in queue called
```

### Workflow 5: Review Meeting Results (Man-in-the-Loop)

```text
Step 1: Meeting ends → AI pipeline triggered automatically
Step 2: Gemini 2.5 Flash Lite processes: transcript + chat + video metadata
Step 3: AI generates SOAP summary (30-min sections for long meetings)
Step 4: Summary appears in Meeting Results tab with 🟡 Pending status
Step 5: Doctor reviews AI summary content
Step 6: Doctor selects action:
        → ✅ Approve: Summary ready for EMR Editor
        → ✏️ Edit: Modify specific fields inline
        → 🔄 Regenerate: Re-run AI with feedback notes
        → ❌ Reject: Discard, proceed with manual EMR entry
Step 7: POST /api/meetings/:id/validate → Updates validation status
Step 8: Approved content available in EMR Editor pre-filled
```

### Workflow 6: Invite Multi-Party Participants

```text
Step 1: Doctor opens confirmed appointment in Meetings tab
Step 2: Clicks "เชิญผู้เข้าร่วม" (Invite Participants)
Step 3: Search and add other doctors/admin by name or specialty
Step 4: POST /api/meetings/:id/invite → Sends invitation + meeting URL
Step 5: Patient separately shares Guest URL with relatives/friends
Step 6: Non-registered guests create display name on join page
Step 7: All guests enter lobby on meeting day
Step 8: Doctor (HOST) approves/rejects each lobby participant
Step 9: Admitted participants join multi-party video meeting
```

### Workflow 7: Post-Meeting → EMR Editor Flow

```text
Step 1: Doctor approves AI meeting summary (Workflow 5)
Step 2: Clicks "Open EMR Editor" from Meeting Results
Step 3: EMR Editor opens with AI SOAP data pre-filled in tabs:
        → Tab S (Subjective): Chief complaint + HPI from transcript
        → Tab O (Objective): Vital signs + examination findings
        → Tab A (Assessment): AI-suggested diagnoses with ICD-10
        → Tab P (Plan): Treatment plan + follow-up instructions
Step 4: Doctor reviews and edits each tab as needed
Step 5: AI generates Patient Instruction Sheet (ใบแนะนำผู้ป่วย)
Step 6: Doctor validates Patient Instruction Sheet
Step 7: Doctor signs & finalizes EMR
Step 8: Patient receives: EMR summary + Instruction Sheet + Meeting recording
Step 9: Data appears in Patient Dashboard + Timeline + Health History
```

---

## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List queue appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |
| POST | `/api/meetings/create` | Create Jitsi meeting room |
| POST | `/api/appointments/:id/confirm` | Confirm with meeting link |
| GET | `/api/doctors` | List all doctors (admin) |
| POST | `/api/appointments/:id/assign` | Assign doctor (admin) |
| GET | `/api/meetings/:id/results` | Get meeting results with AI summary |
| POST | `/api/meetings/:id/validate` | Validate AI summary (approve/edit/reject) |
| POST | `/api/meetings/:id/regenerate` | Regenerate AI summary with feedback |
| POST | `/api/meetings/:id/invite` | Invite participants to meeting |
| GET | `/api/meetings/:id/participants` | List meeting participants and roles |
| POST | `/api/meetings/:id/lobby` | Approve/reject lobby participants |
| GET | `/api/meetings/pending-validation` | List meetings awaiting validation |
| POST | `/api/meetings/:id/patient-instruction` | Generate Patient Instruction Sheet |

---

## 9. Meeting Technology Stack

| Component | Technology | Cost |
| --------- | ---------- | ---- |
| Video Meeting | Jitsi Meet (meet.jit.si) with lobby | FREE |
| Transcription | Web Speech API (browser-native) | FREE |
| AI Summary | Gemini 2.5 Flash Lite | FREE tier |
| Real-time Streaming | Socket.IO on Meeting Server (port 3020) | Self-hosted |
| Database | PostgreSQL (izara_phase1) | Self-hosted |
| Chat | Jitsi built-in + Socket.IO capture | FREE |

---

## 10. AI Agent Improvement Opportunities

- **Smart queue prioritization**: AI dynamically reprioritize based on clinical urgency
- **Auto-confirmation**: AI auto-confirm standard follow-ups
- **Meeting preparation**: AI prepare room with patient context
- **Wait time notifications**: AI notify patients of estimated wait
- **No-show detection**: AI identify and handle potential no-shows
- **Multi-party scheduling**: AI coordinate availability across multiple doctors
- **Post-meeting auto-routing**: AI auto-route validated summaries to EMR Editor
- **Summary quality scoring**: AI self-assess confidence and flag low-confidence sections
- **Patient instruction personalization**: AI tailor instruction sheets to patient literacy level
