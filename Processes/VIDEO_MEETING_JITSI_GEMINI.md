# Video Meeting Implementation - Jitsi Meet + Google Speech-to-Text + Gemini AI

## Overview

This document describes the video meeting implementation using:
- **Jitsi Meet** (FREE) for video conferencing
- **Google Cloud Speech-to-Text** for accurate post-meeting transcription
- **Gemini AI** for EMR summary and doctor recommendation generation
- **GCS Storage** for video recording, transcript, and summary files

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GCS STORAGE STRUCTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  izara-doctors-data/                                                    │
│  └── doctors/{doctorId}/                                                │
│      └── meetings/{appointmentId}/                                      │
│          ├── recording.webm      # Video recording (doctor as host)    │
│          ├── transcript.txt      # Speech-to-Text transcription         │
│          ├── summary.txt         # AI-generated EMR summary             │
│          └── recommendations.txt # AI clinical decision support         │
│                                                                          │
│  izara-appointments/                                                    │
│  └── appointments/{appointmentId}/                                      │
│      ├── meeting-link.json       # Jitsi room info                      │
│      └── meeting-data.json       # Complete meeting metadata            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      POST-MEETING WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. VIDEO MEETING (Jitsi Meet - FREE)                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Doctor and Patient join Jitsi meeting                        │   │
│  │  • Meeting recorded locally (FREE)                               │   │
│  │  • Doctor acts as HOST with recording permissions               │   │
│  │  • Meeting ends                                                   │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  2. VIDEO UPLOAD (GCS - izara-doctors-data)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Video recording uploaded to doctor's storage                  │   │
│  │  • Path: doctors/{doctorId}/meetings/{appointmentId}/           │   │
│  │  • Format: WebM (up to 200MB)                                    │   │
│  │  • Private storage (not public)                                  │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  3. TRANSCRIPTION (Google Cloud Speech-to-Text)                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Audio sent to Speech-to-Text API                              │   │
│  │  • Thai/English medical speech recognition                       │   │
│  │  • Returns timestamped transcript with confidence                │   │
│  │  • Output: transcript.txt in GCS                                 │   │
│  │  Cost: ~$0.006 per 15 seconds                                    │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  4. EMR SUMMARY (Gemini AI)                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Transcript sent to Gemini                                     │   │
│  │  • Generates structured Thai medical summary                     │   │
│  │  • SOAP format: Chief Complaint, HPI, Exam, Assessment, Plan    │   │
│  │  • Output: summary.txt in GCS                                    │   │
│  │  Cost: ~$0.001 per 1K tokens                                     │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  5. DOCTOR RECOMMENDATIONS (Gemini AI)                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Generates clinical decision support for doctor                │   │
│  │  • Differential diagnosis suggestions                            │   │
│  │  • Suggested tests and treatment options                         │   │
│  │  • Red flags and clinical notes                                  │   │
│  │  • Output: recommendations.txt in GCS                            │   │
│  └───────────────────────────┬─────────────────────────────────────┘   │
│                              ▼                                          │
│  6. EMR INTEGRATION                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  • Results saved to GCS for patient health records              │   │
│  │  • Doctor reviews and approves summary                           │   │
│  │  • Patient can view in Health Studio                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cost Analysis

| Component | Provider | Cost |
|-----------|----------|------|
| Video Conferencing | Jitsi Meet (meet.jit.si) | **$0** (FREE) |
| Transcription | Google Cloud Speech-to-Text | ~$0.006/15s |
| EMR Summary | Gemini AI (gemini-2.5-flash-lite) | ~$0.001/1K tokens |
| Doctor Recommendations | Gemini AI | ~$0.001/1K tokens |
| Recording | Jitsi Built-in Local Recording | **$0** (FREE) |
| Video Storage | GCS (izara-doctors-data) | ~$0.02/GB/month |
| **Total per 15-min consultation** | | **~$0.50-1.00** |

## API Endpoints

### Patient Portal (`/api/video-meeting`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create` | POST | Create new video meeting |
| `/:appointmentId` | GET | Get meeting details |
| `/:appointmentId/join` | POST | Generate join URL |
| `/:appointmentId/transcript` | POST | Add transcript entry (manual) |
| `/:appointmentId/transcribe-audio` | POST | **Transcribe audio with Speech-to-Text** |
| `/:appointmentId/end` | POST | End meeting, transcribe, generate summary & recommendations |
| `/:appointmentId/transcript` | GET | Get full transcript |
| `/:appointmentId/summarize` | POST | Generate EMR summary + recommendations |
| `/:appointmentId/recommendations` | POST | Generate doctor recommendations only |
| `/health` | GET | Health check |

### Doctor Portal (`/api/video-meeting`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create` | POST | Create new video meeting |
| `/:appointmentId` | GET | Get meeting details |
| `/:appointmentId/join` | POST | Generate doctor join URL |
| `/:appointmentId/transcript` | POST | Add transcript entry |
| `/:appointmentId/transcribe-audio` | POST | **Transcribe audio with Speech-to-Text** |
| `/:appointmentId/end` | POST | End meeting with full AI processing + video upload |
| `/:appointmentId/upload-recording` | POST | **Upload video recording separately** |
| `/:appointmentId/files` | GET | **Get meeting files (video, transcript, summary)** |
| `/:appointmentId/recommendations` | POST | Generate doctor recommendations |
| `/health` | GET | Health check |

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

### URL Format
```
https://meet.jit.si/Izara-{appointmentId}-{hash}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName={displayName}
```

### Features Enabled
- **Pre-join Page**: Allows users to test camera/mic before joining
- **Google Login**: Users can sign in with Google account
- **Anonymous Access**: Patients can join without account
- **Screen Sharing**: For sharing medical images, reports
- **Local Recording**: FREE recording stored locally
- **End-to-End Encryption**: Secure communication

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
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appointmentId: 'APT-2025-001',
    doctorId: 'DR-001',
    patientId: 'PT-001',
    scheduledTime: '2025-01-15T14:00:00Z'
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
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'PT-001',
    userType: 'patient',
    displayName: 'สมศักดิ์ รักษ์สุขภาพ'
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
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
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
