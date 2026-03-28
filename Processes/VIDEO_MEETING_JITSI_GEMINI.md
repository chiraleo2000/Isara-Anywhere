# Video Meeting Implementation - Jitsi Meet + Device Speech-to-Text + Gemini AI

**Version:** 1.5.9  
**Last Updated:** March 20, 2026  
**Status:** ✅ Phase 1 — Comprehensive Meeting Workflow (Microsoft Teams-Like Experience)

> This document is the core Phase 1 deliverable describing the complete meeting workflow:
> Appointment → Multi-Party Meeting → Transcript Streaming → AI Summary → EMR → Patient Delivery

---

## Overview

This document describes the video meeting implementation using:

- **Jitsi Meet** (FREE) for video conferencing with lobby control
- **Device/Browser Speech-to-Text** (FREE) for real-time transcription during meeting
- **Gemini 2.5 Flash AI** for EMR summary, pre-consultation summary, and patient instructions
- **PostgreSQL** for storing transcripts, summaries, and meeting metadata

## Key Features

### 1. Doctor as Meeting HOST

- **Only the Doctor can START the meeting** - Doctor acts as moderator/host
- Doctor controls lobby admission, recording, and meeting settings
- Doctor receives meeting link in appointment timetable/calendar

### 2. Lobby System for Guest Approval

- **Patient waits in lobby** until Doctor joins and admits them
- **Patient Relatives** can be invited via email and must be approved by Doctor
- **Doctor Consultants/Specialists** can be invited and must be approved by Doctor
- Lobby prevents unauthorized access to the consultation

### 3. Guest Invite System

- **Token-based invites** generated for each guest
- Invites sent via email with unique join links
- Invite types: `patient_relative`, `doctor_consultant`, `family_member`
- Doctor can revoke invites at any time

### 4. Media Controls (Default: ON)

- **Camera**: Enabled by default (`startWithVideoMuted=false`)
- **Microphone**: Enabled by default (`startWithAudioMuted=false`)
- **Text Chat**: Always available for communication
- Users can mute/unmute at any time

### 5. Real-Time Transcript Streaming (Phase 1 Feature — HOST Control)

- **Device/Browser Web Speech API** (FREE - no Google Cloud cost)
- **Doctor (HOST) controls**: START / PAUSE / RESUME / STOP transcript
- Real-time transcript streaming via Socket.IO during the meeting
- Speaker labels: 👨‍⚕️ Doctor / 🧑 Patient / 👥 Guest
- Interim text shown with yellow pulsing background
- Language switching: Thai (th-TH) ↔ English (en-US)
- Transcript saved to PostgreSQL `meeting_transcripts` table continuously
- **Requirement 3.2:** ระบบ transcript หลังบ้านใน meeting
- **Requirement 3.5:** ใช้ Speech-to-Text บนอุปกรณ์ (ฟรี)

### 6. Chat Integration During Meeting

- **Text chat available to ALL participants** (like Microsoft Teams)
- All chat messages are **CAPTURED with timestamps and sender attribution**
- Chat messages included in AI summary processing alongside transcript
- Chat provides secondary communication channel during consultation
- Doctor, patient, relatives, guests can all send chat messages

### 7. Multi-Party Meeting Support

- **Patient can invite**: relatives, friends (via Patient Portal sharing)
- **Doctor can invite**: other doctors, admin, specialists (token-based)
- **Non-registered users**: receive guest join page → enter name only → enter LOBBY
- **Guest Join Pages** (public, no login required):
  - Patient Portal: `/guest-join/:meetingId`
  - Doctor Portal: `/guest-join/:meetingId`
- Doctor as HOST approves/rejects each participant from lobby (like Microsoft Teams)
- Admin joins as regular lobby participant — doctor must approve
- Up to 8 participants per meeting recommended
- **Backend lobby API**:
  - `POST /api/meetings/:id/lobby/join` — guest joins (name only, auto-generated participantId)
  - `GET /api/meetings/:id/lobby/status/:participantId` — guest polls own status
  - `POST /api/meetings/:id/lobby/admit` — doctor admits (auth required)
  - `POST /api/meetings/:id/lobby/reject` — doctor rejects (auth required)

### 8. AI-Powered EMR Generation with Man-in-the-Loop

- **Gemini 2.5 Flash Lite** processes: transcript + chats + video metadata + patient PHR
- Generates SOAP format EMR draft (Thai OPD Card standard)
- **Doctor MUST validate** before patient receives any data (Man-in-the-Loop)
- Actions: [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]
- **Requirement 2.5:** แพทย์ตรวจสอบก่อนส่งข้อมูลถึงคนไข้

### 9. Patient Instruction Sheet Auto-Generation

- AI generates patient-friendly summary in simple Thai
- Content: วินิจฉัย, ยาที่ได้รับ, การปฏิบัติตัว, อาการเตือน, นัดติดตาม
- Doctor validates before sending to patient (Man-in-the-Loop)
- Patient views and downloads PDF in Patient Portal → Health History
- **Requirement 2.1:** สร้างเอกสารสรุปคำแนะนำให้ผู้ป่วย
- **Requirement 4.5:** Patient Instruction Sheet อัตโนมัติ

### 10. Post-Meeting AI Pipeline (Automatic)

- **INPUT to Gemini AI:**
  - ① Full transcript from streaming (with speaker labels and timestamps)
  - ② All chat messages (with timestamps and senders)
  - ③ Video recording metadata (duration, participants)
  - ④ Patient's existing PHR/EMR context
- **OUTPUT:**
  - SOAP summary (Thai) with 30-minute sections for long meetings
  - Clinical Decision Support recommendations
  - Patient Instruction Sheet draft
  - Red flags and follow-up schedule
- All outputs marked `requiresValidation: true`

## Storage Architecture (PostgreSQL)

**IMPORTANT:** All meeting data is stored in PostgreSQL database. NO GCS bucket storage is used.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                   PostgreSQL DATABASE STRUCTURE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  meeting_records table:                                              │
│    ├── id (UUID)                # Primary key                        │
│    ├── appointment_id           # Links to appointments              │
│    ├── doctor_id, patient_id    # Participant IDs                    │
│    ├── room_name, jitsi_domain  # Jitsi room info                    │
│    ├── meeting_url, doctor_url  # Meeting URLs                       │
│    ├── transcript               # Full meeting transcript (TEXT)     │
│    ├── ai_summary               # Gemini-generated summary           │
│    ├── ai_recommendations       # Clinical decision support          │
│    ├── section_summaries        # 30-min section summaries (JSONB)   │
│    └── status, started_at, ended_at, duration_minutes              │
│                                                                       │
│  meeting_transcripts table:                                          │
│    ├── id (UUID)                # Primary key                        │
│    ├── meeting_record_id        # Links to meeting_records           │
│    ├── speaker_id, speaker_role # Who is speaking                    │
│    ├── content                  # Transcribed text                   │
│    ├── language (th/en)         # Speech language                    │
│    └── start_time_seconds, end_time_seconds                        │
│                                                                       │
│  emr table:                                                          │
│    ├── ai_summary               # AI-generated EMR summary           │
│    ├── ai_transcript            # Meeting transcript for EMR         │
│    └── patient_instructions     # AI-generated patient instructions  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      MEETING WORKFLOW WITH LOBBY                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  0. MEETING CREATION (Appointment Calendar/Timetable)                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Meeting link generated when appointment is confirmed          │   │
│  │  • Link appears in doctor's timetable/calendar                   │   │
│  │  • Link available in patient's appointment details               │   │
│  │  • Guest invites can be sent to relatives/consultants            │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  1. DOCTOR STARTS MEETING (HOST CONTROL)                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Only Doctor can START the meeting                             │   │
│  │  • Doctor acts as HOST/MODERATOR                                 │   │
│  │  • Doctor enables lobby, recording, chat                         │   │
│  │  • Default: Camera ON, Microphone ON, Chat ON                    │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  2. PATIENT & GUESTS JOIN VIA LOBBY                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Patient clicks join → waits in lobby                          │   │
│  │  • Patient relatives receive invite email → wait in lobby        │   │
│  │  • Doctor consultants receive invite email → wait in lobby       │   │
│  │  • Doctor APPROVES each participant from lobby                   │   │
│  │  • Unauthorized guests are rejected by Doctor                    │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  3. VIDEO CONSULTATION + TRANSCRIPT STREAMING + CHAT                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • All participants in meeting with video/audio/chat             │   │
│  │  • Meeting recorded locally (FREE)                               │   │
│  │  • Doctor acts as HOST with full control                         │   │
│  │  • Users can mute mic/camera at any time                         │   │
│  │  ──────────────────────────────────────────────────              │   │
│  │  TRANSCRIPT STREAMING (Doctor HOST controls):                    │   │
│  │  • Doctor clicks [▶ Start Transcription]                         │   │
│  │  • Web Speech API begins listening (FREE, browser-based)         │   │
│  │  • Real-time transcript with speaker labels (Socket.IO)          │   │
│  │  • Doctor can [⏸ Pause] / [▶ Resume] / [⏹ Stop]                 │   │
│  │  • Language: Thai (th-TH) ↔ English (en-US)                     │   │
│  │  • Transcript segments saved to PostgreSQL continuously          │   │
│  │  ──────────────────────────────────────────────────              │   │
│  │  CHAT (All participants):                                        │   │
│  │  • Text chat available throughout (like Microsoft Teams)         │   │
│  │  • All messages CAPTURED with timestamps + sender name           │   │
│  │  • Chat included in AI summary processing                       │   │
│  │  ──────────────────────────────────────────────────              │   │
│  │  Cost: $0 (FREE - Web Speech API + Jitsi + local recording)     │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  4. MEETING ENDS (Doctor HOST control)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Doctor clicks [End Meeting] → All participants disconnected   │   │
│  │  • Recording stops and prepares for upload                       │   │
│  │  • Full transcript compiled from streaming segments              │   │
│  │  • All chat messages collected and merged with transcript        │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  5. VIDEO UPLOAD (PostgreSQL / Cloud Storage)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Video recording uploaded to PostgreSQL/cloud storage          │   │
│  │  • Format: WebM (up to 200MB)                                    │   │
│  │  • Private storage (not public)                                  │   │
│  │  Cost: ~$0.02/GB/month (PostgreSQL storage)                      │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  6. AI PROCESSES ALL MEETING DATA (Gemini 2.5 Flash Lite)               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  INPUT to Gemini:                                                │   │
│  │  ① Full transcript (with speaker labels + timestamps)            │   │
│  │  ② All chat messages (with timestamps + senders)                 │   │
│  │  ③ Video metadata (duration, participants)                       │   │
│  │  ④ Patient's existing PHR/EMR context                            │   │
│  │                                                                  │   │
│  │  PROCESSING:                                                     │   │
│  │  • IF meeting > 30 min: split into 30-min sections               │   │
│  │  • Each section generates separate summary                       │   │
│  │  • Sections combined into final comprehensive summary            │   │
│  │  • SOAP format (Thai OPD Card standard)                          │   │
│  │                                                                  │   │
│  │  OUTPUT:                                                         │   │
│  │  • 🎯 อาการสำคัญ (Chief Complaint)                                │   │
│  │  • 📝 อาการที่พบ (Presenting Symptoms)                            │   │
│  │  • 🔍 การสืบค้น (Investigation / Findings)                        │   │
│  │  • 📋 การประเมิน (Assessment)                                     │   │
│  │  • 💊 แผนการรักษา (Treatment Plan)                                │   │
│  │  • 🚩 อาการเตือน (Red Flags)                                     │   │
│  │  • 📅 นัดติดตาม (Follow-up Schedule)                              │   │
│  │  • ⚠️ requiresValidation: true (Man-in-the-Loop)                │   │
│  │                                                                  │   │
│  │  Cost: ~$0.001 per 1K tokens (Gemini Flash Lite)                 │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  7. CLINICAL DECISION SUPPORT (Gemini AI)                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Differential diagnosis suggestions                            │   │
│  │  • Suggested tests and imaging                                   │   │
│  │  • Drug interaction alerts if prescribing                        │   │
│  │  • Guideline references (2024-2025)                              │   │
│  │  • Red flags and clinical notes                                  │   │
│  │  • Requirement 2.4: CDS ช่วยแพทย์ตัดสินใจ                         │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  8. DOCTOR REVIEW (Man-in-the-Loop) — Health Meeting Page               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • AI summary appears in Doctor Portal → Health Meeting page     │   │
│  │  • Doctor reviews summary + CDS recommendations                  │   │
│  │  • Actions: [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]   │   │
│  │  • Requirement 2.5: แพทย์ตรวจสอบก่อนส่งข้อมูลถึงคนไข้             │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  9. EMR DOCUMENTATION + PATIENT INSTRUCTION SHEET                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Doctor opens EMR Editor → AI-prefilled SOAP tabs              │   │
│  │  • Doctor edits, signs, and finalizes EMR                        │   │
│  │  • AI generates Patient Instruction Sheet:                       │   │
│  │    - วินิจฉัย (Diagnosis in simple Thai)                         │   │
│  │    - ยาที่ได้รับ (Medications with dosage)                        │   │
│  │    - การปฏิบัติตัว (Self-care instructions)                       │   │
│  │    - อาการเตือน (Warning signs)                                   │   │
│  │    - นัดติดตาม (Follow-up schedule)                               │   │
│  │  • Doctor validates instruction sheet (Man-in-the-Loop)          │   │
│  │  • EMR stored in PostgreSQL                                      │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  10. PATIENT DELIVERY                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Approved data sent to Patient Portal → Health History         │   │
│  │  • Patient receives notification: "แพทย์ส่งผลการตรวจ"             │   │
│  │  • Patient views: Dashboard → Timeline → PHR                    │   │
│  │  • Patient downloads Instruction Sheet as PDF                    │   │
│  │  • Appointment status → completed                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cost Analysis (Phase 1 — Optimized for FREE)

| Component | Provider | Cost |
| --------- | -------- | ---- |
| Video Conferencing | Jitsi Meet (meet.jit.si) | **$0** (FREE) |
| Transcription | **Web Speech API** (browser-based) | **$0** (FREE) |
| Chat Messaging | Jitsi + Socket.IO | **$0** (FREE) |
| EMR Summary | Gemini AI (gemini-2.5-flash-lite) | ~$0.001/1K tokens |
| CDS Recommendations | Gemini AI | ~$0.001/1K tokens |
| Patient Instruction Sheet | Gemini AI | ~$0.001/1K tokens |
| Recording | Jitsi Built-in Local Recording | **$0** (FREE) |
| Video Storage | **PostgreSQL** / Cloud Storage | ~$0.02/GB/month |
| **Total per 15-min consultation** | | **~$0.01-0.05** |

> **KEY CHANGE:** Transcription is now **FREE** using Web Speech API (browser-native) instead of Google Cloud Speech-to-Text. This dramatically reduces per-consultation cost.

## API Endpoints

### Patient Portal (`/api/video-meeting`)

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/create` | POST | Create new video meeting |
| `/:appointmentId` | GET | Get meeting details |
| `/:appointmentId/join` | POST | Generate join URL (waits in lobby) |
| `/:appointmentId/transcript` | POST | Add transcript entry (manual) |
| `/:appointmentId/transcribe-audio` | POST | **Transcribe audio with Speech-to-Text** |
| `/:appointmentId/end` | POST | End meeting, transcribe, generate summary & recommendations |
| `/:appointmentId/transcript` | GET | Get full transcript |
| `/:appointmentId/summarize` | POST | Generate EMR summary + recommendations |
| `/:appointmentId/recommendations` | POST | Generate doctor recommendations only |
| `/health` | GET | Health check |

### Doctor Portal (`/api/video-meeting`)

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/create` | POST | Create new video meeting (Doctor as HOST) |
| `/:appointmentId` | GET | Get meeting details |
| `/:appointmentId/join` | POST | Generate doctor join URL (HOST) |
| `/:appointmentId/invite` | POST | **Send guest invite (relatives/consultants)** |
| `/:appointmentId/join-with-invite` | POST | **Join meeting with invite token** |
| `/:appointmentId/transcript` | POST | Add transcript entry |
| `/:appointmentId/transcribe-audio` | POST | **Transcribe audio with Speech-to-Text** |
| `/:appointmentId/end` | POST | End meeting with full AI processing + video upload |
| `/:appointmentId/upload-recording` | POST | **Upload video recording separately** |
| `/:appointmentId/files` | GET | **Get meeting files (video, transcript, summary)** |
| `/:appointmentId/recommendations` | POST | Generate doctor recommendations |
| `/health` | GET | Health check |

### Guest Invite Endpoints (New)

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/:appointmentId/invite` | POST | Create guest invite |
| `/:appointmentId/invite/:inviteId` | DELETE | Revoke guest invite |
| `/:appointmentId/join-with-invite` | POST | Join using invite token |
| `/:appointmentId/invites` | GET | List all invites for meeting |

## Guest Invite System

### Invite Types

- **patient_relative**: Family members who can observe/support patient
- **doctor_consultant**: Specialist doctors for second opinions
- **family_member**: General family members

### Create Guest Invite

```http
POST /api/video-meeting/:appointmentId/invite
Authorization: Bearer <doctor-token>
Content-Type: application/json

{
  "guestEmail": "relative@example.com",
  "guestName": "คุณแม่ของผู้ป่วย",
  "guestType": "patient_relative",
  "doctorId": "DOC-001"
}

Response:
{
  "success": true,
  "inviteId": "invite-uuid-123",
  "inviteToken": "secure-token-abc",
  "joinUrl": "https://meet.jit.si/Izara-APT2025-a7b3c9d1?inviteToken=secure-token-abc",
  "expiresAt": "2025-01-15T15:00:00Z"
}
```

### Join with Invite Token

```http
POST /api/video-meeting/:appointmentId/join-with-invite
Content-Type: application/json

{
  "inviteToken": "secure-token-abc",
  "displayName": "คุณแม่ของผู้ป่วย"
}

Response:
{
  "success": true,
  "joinUrl": "https://meet.jit.si/Izara-APT2025-a7b3c9d1#config.lobby=true...",
  "roomName": "Izara-APT2025-a7b3c9d1",
  "guestType": "patient_relative"
}
```

### Lobby Behavior

- All guests join via lobby first
- Doctor (HOST) sees notification of waiting guests
- Doctor can **Approve** or **Reject** each guest
- Approved guests join the meeting
- Rejected guests receive error message

### Meeting Server Validation & Delivery Endpoints (v1.5.9)

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/api/meetings/:id/validate` | POST | Doctor validates AI summary (approve/edit/reject/regenerate) |
| `/api/meetings/:id` | DELETE | Delete meeting record |
| `/api/meetings/:id/patient-instruction` | POST | Generate patient instruction sheet from approved summary |
| `/api/meetings/:id/consultation-result` | GET | Patient polls for approved consultation results |

#### Validate Meeting Summary (Doctor → Man-in-the-Loop)

```http
POST /api/meetings/:id/validate
Authorization: Bearer <doctor-token>
Content-Type: application/json

{
  "action": "approve",           // approve | edit | reject | regenerate
  "editedSummary": "...",        // Only for action=edit
  "rejectionReason": "..."       // Only for action=reject
}

Response:
{
  "success": true,
  "status": "approved",
  "patientInstruction": "..."    // Auto-generated on approve
}
```

#### Get Consultation Result (Patient Polling)

```http
GET /api/meetings/:id/consultation-result
Authorization: Bearer <patient-token>

Response (when approved):
{
  "success": true,
  "hasResult": true,
  "consultationResult": {
    "summary": "AI-validated SOAP summary...",
    "patientInstruction": "Patient care instructions...",
    "status": "approved",
    "approvedAt": "2026-03-20T10:00:00Z"
  }
}
```

## 30-Minute Sectioned Summaries

For long consultations (>30 minutes), the system automatically creates sectioned summaries:

### Section Processing

```javascript
// If meeting duration > 30 minutes
// Split transcript into 30-minute sections
// Generate summary for each section
// Combine all section summaries into final summary

const SECTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function splitIntoSections(transcript, totalDuration) {
  const sections = [];
  const numSections = Math.ceil(totalDuration / SECTION_DURATION_MS);

  for (let i = 0; i < numSections; i++) {
    const startTime = i * SECTION_DURATION_MS;
    const endTime = Math.min((i + 1) * SECTION_DURATION_MS, totalDuration);
    sections.push({
      sectionIndex: i,
      startTime,
      endTime,
      transcript: getTranscriptForTimeRange(transcript, startTime, endTime)
    });
  }
  return sections;
}
```

### Section Summary Output

```json
{
  "sections": [
    {
      "sectionIndex": 0,
      "timeRange": "0:00 - 30:00",
      "summary": {
        "chiefComplaint": "อาการหลักที่กล่าวถึงใน 30 นาทีแรก",
        "discussion": "รายละเอียดการสนทนา..."
      }
    },
    {
      "sectionIndex": 1,
      "timeRange": "30:00 - 60:00",
      "summary": {
        "examination": "การตรวจร่างกาย...",
        "discussion": "รายละเอียดการสนทนา..."
      }
    }
  ],
  "combinedSummary": {
    "chiefComplaint": "สรุปอาการหลักรวม",
    "presentIllness": "ประวัติการเจ็บป่วยปัจจุบันรวม",
    "assessment": "การประเมินรวม",
    "plan": "แผนการรักษารวม"
  },
  "totalDuration": 3720,
  "totalSections": 2
}
```

### Storage for Sectioned Summaries

```text
PostgreSQL meeting_records table:
├── section_summaries (JSONB)     # Array of 30-min section summaries
├── ai_summary (TEXT)             # Final combined summary
├── transcript (TEXT)             # Full meeting transcript
└── ai_recommendations (TEXT)     # CDS recommendations
```

## New Endpoints for Video Recording

### Upload Video Recording

```http
POST /api/video-meeting/:appointmentId/upload-recording
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoBase64": "<base64-encoded-video>",
  "videoMimeType": "video/webm",
  "doctorId": "DOC-001",
  "doctorName": "Dr. Smith"
}

Response:
{
  "success": true,
  "videoUrl": "pg://meeting_records/{meetingId}/recording",
  "path": "meetings/{meetingId}/recording.webm",
  "size": 52428800,
  "sizeFormatted": "50.00MB",
  "storage": "postgresql"
}
```

### Get Meeting Files

```http
GET /api/video-meeting/:appointmentId/files?doctorId=DOC-001
Authorization: Bearer <token>

Response:
{
  "success": true,
  "appointmentId": "APT-123",
  "meetingId": "meet-uuid-123",
  "duration": 900,
  "files": {
    "video": "pg://meeting_records/meet-uuid-123/recording",
    "transcript": "pg://meeting_records/meet-uuid-123/transcript",
    "summary": "pg://meeting_records/meet-uuid-123/ai_summary",
    "recommendations": "pg://meeting_records/meet-uuid-123/ai_recommendations",
    "chats": "pg://meeting_records/meet-uuid-123/chat_messages"
  },
  "transcript": [...],
  "summary": {...},
  "recommendations": {...},
  "chatMessages": [...],
  "storage": "postgresql"
}
```

## Web Speech API Integration (FREE — Browser-Native)

### Configuration

```typescript
// Web Speech API - FREE, no API key required
const SPEECH_CONFIG = {
  api: 'Web Speech API (SpeechRecognition)',
  cost: 'FREE',
  languages: ['th-TH', 'en-US'],
  continuous: true,
  interimResults: true,
  maxAlternatives: 1
};

// Initialize Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'th-TH';  // or 'en-US'
recognition.continuous = true;
recognition.interimResults = true;
```

### HOST Transcript Control Flow

```typescript
// Doctor (HOST) controls transcript streaming
// Step 1: Doctor clicks [Start Transcription]
POST /api/meetings/:id/start-transcription
// → Activates Web Speech API on doctor's browser
// → Socket.IO broadcasts transcript segments to all participants

// Step 2: Real-time streaming
// → recognition.onresult fires with interim and final results
// → Final results saved to PostgreSQL meeting_transcripts table
// → Interim results shown with yellow pulsing background

// Step 3: Doctor clicks [Pause] / [Resume]
POST /api/meetings/:id/pause-transcription
// → recognition.stop() / recognition.start()

// Step 4: Doctor clicks [Stop Transcription]
POST /api/meetings/:id/stop-transcription
// → recognition.stop()
// → Full transcript compiled from all segments
```

### Speaker Label Assignment

- 👨‍⚕️ **Doctor**: Speaker detected from doctor's audio stream
- 🧑 **Patient**: Speaker detected from patient's audio stream
- 👥 **Guest**: Speaker detected from guest audio streams (by display name)
- Timestamps: Each segment includes `start_time_seconds` and `end_time_seconds`
- Language: Each segment tagged with detected language (th/en)

### Medical Speech Recognition Features

- **Continuous Mode**: Uninterrupted transcription during consultation
- **Interim Results**: Real-time display of partial recognition (pulsing yellow)
- **Thai + English**: Primary Thai with English switching by HOST
- **No Cost**: Browser-native API, zero API charges
- **Browser Support**: Chrome, Edge, Safari (WebKit)

## Jitsi Meet Configuration

### URL Format for Doctor (HOST)

```text
https://meet.jit.si/Izara-{appointmentId}-{hash}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.lobby.enabled=true&config.moderator=true&userInfo.displayName={doctorName}
```

### URL Format for Patient (LOBBY)

```text
https://meet.jit.si/Izara-{appointmentId}-{hash}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName={patientName}
```

### URL Format for Guest (INVITE + LOBBY)

```text
https://meet.jit.si/Izara-{appointmentId}-{hash}?inviteToken={token}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName={guestName}
```

### Features Enabled

- **Pre-join Page**: Allows users to test camera/mic before joining
- **Lobby Mode**: All non-host participants wait for approval
- **Google Login**: Users can sign in with Google account
- **Anonymous Access**: Guests can join with invite token
- **Screen Sharing**: For sharing medical images, reports
- **Local Recording**: FREE recording stored locally
- **End-to-End Encryption**: Secure communication
- **Text Chat**: Always enabled for communication
- **Default Media**: Camera ON, Microphone ON (can be muted by user)

### Room Naming Convention

```javascript
// Pattern: Izara-{appointmentId}-{secureHash}
// Example: Izara-APT12345-a7b3c9d1
```

## Gemini AI Integration

### Model Configuration

```typescript
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash-lite',
  apiKey: process.env.VITE_GEMINI_API_KEY,
  temperature: 0.3,
  maxTokens: 8192
};
```

### Transcription

```typescript
// Input: Audio blob (base64 encoded)
// Output: Thai/English text transcription
POST /api/video-meeting/:appointmentId/transcribe-audio
{
  "audio": "base64-encoded-audio-data",
  "mimeType": "audio/webm"
}
```

### EMR Summary Generation

```typescript
// Input: Full meeting transcript
// Output: Structured Thai medical summary
POST /api/video-meeting/:appointmentId/summarize
{
  "transcript": "Full meeting transcript text...",
  "patientInfo": {
    "name": "Patient Name",
    "dateOfBirth": "1990-01-01"
  }
}
```

### Summary Output Format (Thai)

```json
{
  "summary": {
    "chiefComplaint": "อาการสำคัญ...",
    "presentIllness": "ประวัติการเจ็บป่วยปัจจุบัน...",
    "assessment": "การประเมิน...",
    "plan": "แผนการรักษา...",
    "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"],
    "followUp": "การนัดติดตาม..."
  },
  "metadata": {
    "generatedAt": "2025-01-15T10:30:00Z",
    "model": "gemini-2.5-flash-lite",
    "language": "th"
  }
}
```

## Environment Variables

### Required Variables

```env
# Jitsi Meet Configuration (FREE)
JITSI_DOMAIN=meet.jit.si
VITE_JITSI_DOMAIN=meet.jit.si
VITE_JITSI_APP_ID=izara-telemedicine

# Speech-to-Text: Web Speech API (FREE - browser-native, no API key needed)
# No environment variable required for transcription

# Gemini AI Configuration (for summary, CDS, patient instructions)
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
VITE_GEMINI_TEMPERATURE=0.3
VITE_GEMINI_MAX_TOKENS=8192

# PostgreSQL Database
DATABASE_URL=postgresql://izara_user:password@localhost:5432/izara_phase1

# Meeting Server
MEETING_SERVER_PORT=3020
MEETING_SERVER_URL=http://localhost:3020

```

## Doctor Recommendations Output

```json
{
  "differentialDiagnosis": [
    "การวินิจฉัยแยกโรค 1",
    "การวินิจฉัยแยกโรค 2"
  ],
  "suggestedTests": [
    "การตรวจที่แนะนำ 1",
    "การตรวจที่แนะนำ 2"
  ],
  "treatmentOptions": [
    "ทางเลือกการรักษา 1",
    "ทางเลือกการรักษา 2"
  ],
  "redFlags": [
    "อาการเตือนที่ต้องระวัง"
  ],
  "clinicalNotes": "หมายเหตุทางคลินิกสำหรับแพทย์",
  "references": [
    "แนวทางเวชปฏิบัติที่เกี่ยวข้อง"
  ],
  "generatedAt": "2025-12-15T10:30:00Z"
}
```

## Docker Configuration

### Dockerfile.unified ARG

```dockerfile
# Jitsi Meet Video Conferencing (FREE)
ARG JITSI_DOMAIN=meet.jit.si
ARG VITE_JITSI_DOMAIN=meet.jit.si
ARG VITE_JITSI_APP_ID=izara-telemedicine
```

### docker-compose.yml

```yaml
services:
  patient-frontend:
    build:
      args:
        JITSI_DOMAIN: "meet.jit.si"
        VITE_JITSI_DOMAIN: "meet.jit.si"
        VITE_JITSI_APP_ID: "izara-telemedicine"
```

## Usage Examples

### Creating a Meeting (Doctor)

```typescript
const response = await fetch('/api/video-meeting/create', {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    appointmentId: "APT-2025-001",
    doctorId: "DR-001",
    patientId: "PT-001",
    scheduledTime: "2025-01-15T14:00:00Z"
  })
});

// Response
{
  "success": true,
  "meetingUrl": "https://meet.jit.si/Izara-APT2025-a7b3c9d1",
  "roomName": "Izara-APT2025-a7b3c9d1",
  "meetingId": "meet-uuid-123"
}
```

### Joining a Meeting (Patient)

```typescript
const response = await fetch('/api/video-meeting/APT-2025-001/join', {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "PT-001",
    userType: "patient",
    displayName: "สมศักดิ์ รักษ์สุขภาพ"
  })
});

// Response
{
  "success": true,
  "joinUrl": "https://meet.jit.si/Izara-APT2025-a7b3c9d1#config...",
  "roomName": "Izara-APT2025-a7b3c9d1"
}
```

### Generating EMR Summary

```typescript
const response = await fetch('/api/video-meeting/APT-2025-001/summarize', {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    transcript: "หมอ: สวัสดีครับ คุณสมศักดิ์ มีอาการอย่างไรบ้าง...",
    patientInfo: {
      name: "สมศักดิ์ รักษ์สุขภาพ",
      dateOfBirth: "1985-03-15"
    }
  })
});

// Response
{
  "success": true,
  "summary": {
    "chiefComplaint": "ปวดศีรษะเรื้อรังมา 2 สัปดาห์",
    "assessment": "Tension headache",
    "plan": "ให้ยาแก้ปวด...",
    ...
  }
}
```

## Security Considerations

1. **Room Name Hashing**: Room names include secure hash to prevent guessing
2. **Pre-join Verification**: Users must click "Join" button, can't auto-join
3. **No Persistent Storage**: Meeting URLs expire after meeting ends
4. **PDPA Compliance**: Transcripts stored according to PDPA guidelines
5. **End-to-End Encryption**: Jitsi supports E2EE for sensitive consultations
6. **PostgreSQL Storage**: All meeting data stored in PostgreSQL (not public cloud buckets)
7. **File Size Limits**: 200MB max for video uploads
8. **Man-in-the-Loop**: All AI outputs require doctor validation before patient delivery
9. **Guest Lobby Control**: Non-registered users cannot enter meeting without HOST approval
10. **Chat Privacy**: Meeting chat messages are private to the consultation and stored securely
11. **Permissions-Policy**: `camera=(self "https://meet.jit.si")`, `microphone=(self "https://meet.jit.si")` — scoped to Jitsi iframe only (v1.5.9 fix)
12. **CSP for Video**: `frame-src meet.jit.si 8x8.vc`, `media-src mediastream:`, `worker-src blob:`, `connect-src *.run.app wss://*.run.app`
13. **Iframe Allow Attribute**: Explicit `allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *"` on Jitsi iframe

## Testing

### Test Environments

| Environment | Patient Portal | Doctor Portal | Meeting Server | Database |
| ----------- | ------------- | ------------- | -------------- | -------- |
| **Local** | localhost:3005 | localhost:3010 | localhost:3020 | localhost:5432 |
| **Cloud** | patient-portal-xxxxx.run.app | doctor-portal-xxxxx.run.app | meeting-server-xxxxx.run.app | CloudSQL |

### E2E Test Suite

```bash
# Run dual-portal meeting workflow tests
node scripts/tests/e2e/dualPortalMeetingTests.cjs

# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless
```

### 4-User Meeting UI Test

```bash
# Test with 4 visible browser windows (Doctor, Patient, Relative, Admin)
node scripts/tests/fourUserMeetingUITest.cjs

# Run against cloud deployments
node scripts/tests/fourUserMeetingUITest.cjs --cloud

# Test users:
# - Doctor HOST: doctor.test@izara.com (IzaraDoctor@2024)
# - Patient: demo.test@gmail.com (P@ssw0rd)
# - Patient Relative: (no login - creates display name from blank)
# - Admin: admin.test@izara.com (IzaraAdmin@2024)
```

### Comprehensive Meeting Test Scenarios

| # | Test | Validates |
| - | ---- | --------- |
| 1 | Doctor creates meeting as HOST | Jitsi URL generation, moderator flag |
| 2 | Patient enters lobby, doctor admits | Lobby system, admission control |
| 3 | Guest creates display name from blank, enters lobby | Guest self-registration |
| 4 | Doctor selectively admits/rejects guests | HOST lobby control |
| 5 | Doctor starts transcript streaming | Web Speech API activation |
| 6 | Real-time transcript with speaker labels | Socket.IO streaming + speaker ID |
| 7 | Doctor pauses/resumes transcript | HOST transcript control |
| 8 | All participants send chat messages | Chat capture with timestamps |
| 9 | Doctor stops transcript | Transcript finalization |
| 10 | Doctor ends meeting | All disconnected, data compiled |
| 11 | AI processes transcript + chats | Gemini summary pipeline |
| 12 | 30-min sectioned summaries for long meetings | Section splitting |
| 13 | Doctor reviews AI summary (Man-in-the-Loop) | Validation UI |
| 14 | EMR Editor pre-filled with AI SOAP data | Auto-population |
| 15 | Patient Instruction Sheet generated | AI + doctor validation |
| 16 | Patient receives results in Health History | Patient delivery pipeline |

### Demo Meeting Test Procedure (Local)

```text
1. docker-compose up -d (start all 4 services)
2. Login as doctor (localhost:3010) and patient (localhost:3005)
3. Patient books appointment with Thai symptoms
4. Doctor confirms appointment → Jitsi URLs generated
5. Doctor clicks "Join Meeting" → enters as HOST
6. Patient clicks meeting link → enters LOBBY → Doctor admits
7. (Optional) Open incognito window → Guest link → Create name → LOBBY
8. Doctor clicks "Start Transcription" → Speak test phrases
9. Verify real-time transcript with speaker labels
10. Send chat messages → Verify captured
11. Doctor clicks "Stop Transcription" then "End Meeting"
12. Verify AI summary generated → Doctor reviews on Health Meeting page
13. Doctor opens EMR Editor → Verify AI pre-filled SOAP tabs
14. Doctor signs EMR → Patient sees results in Dashboard + Timeline
```

### Generate Test Audio

```bash
# Generate test audio files for transcription testing
node scripts/generators/generateTestAudio.cjs
```

### Test Files Generated

- `thai-headache-consultation-transcript.txt` - Reference Thai transcript
- `thai-fever-consultation-transcript.txt` - Reference Thai transcript
- `english-general-consultation-transcript.txt` - Reference English transcript
- `*-ssml.xml` - SSML for Google TTS API
- `*-metadata.json` - Test metadata

### API Testing

```bash
# Test meeting creation
curl -X POST http://localhost:3009/api/video-meeting/create \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "APT-TEST-001", "doctorId": "DOC-001"}'

# Test video upload
curl -X POST http://localhost:3009/api/video-meeting/APT-TEST-001/upload-recording \
  -H "Content-Type: application/json" \
  -d '{"videoBase64": "<base64>", "doctorId": "DOC-001"}'

# Test get meeting files
curl http://localhost:3009/api/video-meeting/APT-TEST-001/files?doctorId=DOC-001
```

## Troubleshooting

### Meeting Won't Start

1. Check browser permissions for camera/microphone
2. Ensure HTTPS is enabled (required for WebRTC)
3. Try a different browser (Chrome/Edge recommended)

### Transcription Not Working

1. Verify GOOGLE_SPEECH_API_KEY is set correctly
2. Check audio format is supported (webm, mp3, wav)
3. Ensure audio quality is sufficient
4. Check API quota limits

### Video Upload Failed

1. Check file size (max 200MB)
2. Verify content type (video/webm, video/mp4)
3. Check GCS API server is running
4. Verify bucket permissions

### Meeting Link Invalid

1. Meetings expire 30 minutes after scheduled end time
2. Check appointment status is not cancelled
3. Verify appointmentId is correct

## Future Improvements (Phase 2)

1. **Self-hosted Jitsi**: For complete control, deploy own Jitsi server
2. **Gemini LLM Fine-Tuning**: Fine-tune on Thai medical data (Requirement 3.4)
3. **Multi-language Support**: Automatic language detection during transcription
4. **Chunked Upload**: Support for large video files via chunked upload
5. **Video Playback**: In-portal video playback for doctor review
6. **Waiting Room UI**: Enhanced lobby with estimated wait time
7. **AI Chat History**: Long-term AI knowledge base from meeting data (Requirement 3.3)

## References

- [Jitsi Meet API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Gemini AI API](https://ai.google.dev/docs)
- [WebRTC Standards](https://webrtc.org/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)

**Last Updated:** January 2025 (v1.4.7)
