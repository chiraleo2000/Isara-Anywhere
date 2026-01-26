# Video Meeting Implementation - Jitsi Meet + Device Speech-to-Text + Gemini AI

**Version:** 3.0.0  
**Last Updated:** January 21, 2026  
**Status:** ✅ Phase 1 Implementation

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

### 5. Real-Time Transcription (Phase 1 Feature)

- **Device/Browser Speech-to-Text API** (FREE - no Google Cloud cost)
- Real-time transcription during the meeting
- Transcript saved to PostgreSQL `meeting_transcripts` table
- Supports Thai and English languages

### 6. AI-Powered EMR Generation with Man-in-the-Loop

- **Gemini 2.5 Flash** processes full meeting transcript
- Generates SOAP format EMR draft
- **Doctor must validate** before saving (Man-in-the-Loop)
- Doctor can edit, approve, or regenerate

### 7. Patient Instruction Sheet Generation

- AI generates patient-friendly summary from EMR
- Includes diagnosis explanation, medication instructions, warning signs
- Doctor validates before sending to patient
- Patient views in Patient Portal under Health Records

## Storage Architecture (PostgreSQL)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      GCS STORAGE STRUCTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  izara-doctors-data/                                                    │
│  └── doctors/{doctorId}/                                                │
│      └── meetings/{appointmentId}/                                      │
│          ├── recording.webm         # Video recording (doctor as host) │
│          ├── transcript.txt         # Speech-to-Text transcription      │
│          ├── summary.txt            # AI-generated EMR summary          │
│          ├── recommendations.txt    # AI clinical decision support      │
│          ├── section-0-summary.txt  # 30-min section summary (if >30m) │
│          ├── section-1-summary.txt  # Next 30-min section summary      │
│          └── final-combined.txt     # Combined summary from all sections│
│                                                                          │
│  izara-appointments/                                                    │
│  └── appointments/{appointmentId}/                                      │
│      ├── meeting-link.json          # Jitsi room info                   │
│      ├── meeting-data.json          # Complete meeting metadata         │
│      └── guest-invites.json         # Guest invite records              │
│                                                                          │
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
│  3. VIDEO CONSULTATION (Jitsi Meet - FREE)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • All participants in meeting with video/audio/chat             │   │
│  │  • Meeting recorded locally (FREE)                               │   │
│  │  • Doctor acts as HOST with recording permissions                │   │
│  │  • Users can mute mic/camera at any time                         │   │
│  │  • Meeting ends when Doctor closes                               │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  4. VIDEO UPLOAD (GCS - izara-doctors-data)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Video recording uploaded to doctor's storage                  │   │
│  │  • Path: doctors/{doctorId}/meetings/{appointmentId}/           │   │
│  │  • Format: WebM (up to 200MB)                                    │   │
│  │  • Private storage (not public)                                  │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  5. TRANSCRIPTION (Google Cloud Speech-to-Text)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Audio sent to Speech-to-Text API                              │   │
│  │  • Thai/English medical speech recognition                       │   │
│  │  • Returns timestamped transcript with confidence                │   │
│  │  • Output: transcript.txt in GCS                                 │   │
│  │  Cost: ~$0.006 per 15 seconds                                    │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  6. EMR SUMMARY (Gemini AI with 30-Min Sections)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • IF video > 30 min: split into 30-min sections                 │   │
│  │  • Each section generates separate summary                       │   │
│  │  • Sections combined into final comprehensive summary            │   │
│  │  • SOAP format: Chief Complaint, HPI, Exam, Assessment, Plan    │   │
│  │  • Output: summary.txt + section-X-summary.txt in GCS            │   │
│  │  Cost: ~$0.001 per 1K tokens                                     │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  7. DOCTOR RECOMMENDATIONS (Gemini AI)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Generates clinical decision support for doctor                │   │
│  │  • Differential diagnosis suggestions                            │   │
│  │  • Suggested tests and treatment options                         │   │
│  │  • Red flags and clinical notes                                  │   │
│  │  • Output: recommendations.txt in GCS                            │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  8. DOCTOR PORTAL DELIVERY                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Summary and recommendations sent to Doctor Portal             │   │
│  │  • Appears in appointment details and reports                    │   │
│  │  • Doctor reviews and approves summary                           │   │
│  │  • Can be added to patient's medical records                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cost Analysis

| Component | Provider | Cost |
| ----------- | ---------- | ------ |
| Video Conferencing | Jitsi Meet (meet.jit.si) | **$0** (FREE) |
| Transcription | Google Cloud Speech-to-Text | ~$0.006/15s |
| EMR Summary | Gemini AI (gemini-2.5-flash-lite) | ~$0.001/1K tokens |
| Doctor Recommendations | Gemini AI | ~$0.001/1K tokens |
| Recording | Jitsi Built-in Local Recording | **$0** (FREE) |
| Video Storage | GCS (izara-doctors-data) | ~$0.02/GB/month |
| **Total per 15-min consultation** |  | **~$0.50-1.00** |

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
izara-doctors-data/doctors/{doctorId}/meetings/{appointmentId}/
├── section-0-summary.txt    # First 30-min summary
├── section-1-summary.txt    # Second 30-min summary
├── section-2-summary.txt    # Third 30-min summary (if needed)
├── final-combined.txt       # Combined summary from all sections
└── summary.txt              # Same as final-combined.txt
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
  "videoUrl": "gs://izara-doctors-data/doctors/DOC-001/meetings/APT-123/recording.webm",
  "path": "doctors/DOC-001/meetings/APT-123/recording.webm",
  "size": 52428800,
  "sizeFormatted": "50.00MB"
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
    "video": "gs://izara-doctors-data/doctors/DOC-001/meetings/APT-123/recording.webm",
    "transcript": "gs://izara-doctors-data/doctors/DOC-001/meetings/APT-123/transcript.txt",
    "summary": "gs://izara-doctors-data/doctors/DOC-001/meetings/APT-123/summary.txt",
    "recommendations": "gs://izara-doctors-data/doctors/DOC-001/meetings/APT-123/recommendations.txt"
  },
  "transcript": [...],
  "summary": {...},
  "recommendations": {...}
}
```

## Google Cloud Speech-to-Text Integration

### API Configuration

```typescript
const GOOGLE_SPEECH_API_KEY = process.env.VITE_GOOGLE_SPEECH_API_KEY;

// Request to Speech-to-Text API
POST https://speech.googleapis.com/v1/speech:recognize?key={API_KEY}
{
  "config": {
    "encoding": "WEBM_OPUS",
    "sampleRateHertz": 48000,
    "languageCode": "th-TH",
    "alternativeLanguageCodes": ["en-US"],
    "enableAutomaticPunctuation": true,
    "enableWordTimeOffsets": true,
    "model": "latest_long",
    "useEnhanced": true,
    "speechContexts": [{
      "phrases": ["อาการ", "ปวดหัว", "ไข้", "medication", "diagnosis"],
      "boost": 20
    }]
  },
  "audio": {
    "content": "base64-encoded-audio-data"
  }
}
```

### Medical Speech Recognition Features

- **Enhanced Model**: Uses `latest_long` model optimized for conversations
- **Thai + English**: Primary Thai with English alternative
- **Medical Context**: Boosted recognition for medical terms
- **Word Timestamps**: For timeline-aligned transcripts

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

# Google Cloud Speech-to-Text API (for transcription)
VITE_GOOGLE_SPEECH_API_KEY=your-google-api-key
GOOGLE_SPEECH_API_KEY=your-google-api-key

# Gemini AI Configuration (for summary & recommendations)
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
VITE_GEMINI_TEMPERATURE=0.3
VITE_GEMINI_MAX_TOKENS=8192

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
6. **Doctor-Owned Storage**: Video recordings stored in doctor's GCS folder (not public)
7. **File Size Limits**: 200MB max for video uploads

## Testing

### E2E Test Suite

```bash
# Run dual-portal meeting workflow tests
node scripts/tests/e2e/dualPortalMeetingTests.cjs

# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless
```

### 4-User Meeting UI Test (NEW)

```bash
# Test with 4 visible browser windows (Doctor, Patient, Relative, Admin)
node scripts/tests/fourUserMeetingUITest.cjs

# Run against cloud deployments
node scripts/tests/fourUserMeetingUITest.cjs --cloud

# Test users:
# - Doctor: doctor@demo.com
# - Patient: patient@demo.com
# - Patient Relative: demo2@demo.com (invited by doctor)
# - Admin: admin@demo.com
```

### Comprehensive Meeting Tests (NEW)

```bash
# Run comprehensive meeting API tests
node scripts/tests/comprehensiveMeetingTests.cjs

# Run against cloud deployments
node scripts/tests/comprehensiveMeetingTests.cjs --cloud

# Tests cover:
# - Health check endpoints
# - Meeting creation (Doctor as HOST)
# - Host control verification
# - Patient joining (waits in lobby)
# - Guest invite creation
# - Guest joining with token
# - Transcript entries
# - AI summary generation
# - 30-minute sectioned summaries
# - Meeting end workflow
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

## Future Improvements

1. **Self-hosted Jitsi**: For complete control, can deploy own Jitsi server
2. **Real-time Transcription**: Stream audio to Speech-to-Text for live captions
3. **Multi-party Calls**: Support for family members in consultations
4. **Chunked Upload**: Support for large video files via chunked upload
5. **Video Playback**: In-portal video playback for doctor review

## References

- [Jitsi Meet API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs)
- [Gemini AI API](https://ai.google.dev/docs)
- [WebRTC Standards](https://webrtc.org/)

**Last Updated:** December 2025
