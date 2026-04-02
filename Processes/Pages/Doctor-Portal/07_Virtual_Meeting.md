# 📹 Doctor Portal — Virtual Meeting (Jitsi Video Consultation)

**Component:** `src/pages/VirtualMeeting.tsx`
**Type:** Modal (launched from DoctorPortal)
**Access:** 🔒 Doctor / Admin
**Thai Title:** การประชุมออนไลน์ / Virtual Meeting
**Version:** v1.4.7

---

## 1. Purpose

Full video consultation experience with Jitsi Meet integration, recording consent, live transcription, AI-assisted clinical copilot, and post-meeting report generation.

---

## 2. Meeting States

```text
time_check → consent → meeting → ended
```

### State 1: Time Check

```text
┌── Meeting Time Check ───────────────────────────────────────┐
│                                                              │
│  ⏰ Checking meeting time window...                          │
│                                                              │
│  Appointment: 22 ม.ค. 2569, 09:00                          │
│  Current: 08:50                                              │
│  Status: ✅ Within join window                               │
│                                                              │
│  (Or: ⚠️ Too early / ❌ Too late → Auto-reschedule)         │
└──────────────────────────────────────────────────────────────┘
```

### State 2: Consent

```text
┌── Recording Consent ────────────────────────────────────────┐
│                                                              │
│  📹 การยินยอมบันทึกการประชุม                                  │
│                                                              │
│  ☑️ Video recording consent                                 │
│  ☑️ Audio recording consent                                 │
│  ☑️ Text/voice chat consent                                 │
│  ☑️ AI analysis consent                                     │
│                                                              │
│  🔒 HIPAA/PDPA Compliance:                                  │
│  ข้อมูลจะถูกเก็บอย่างปลอดภัยตาม PDPA                        │
│                                                              │
│  [ยอมรับและเริ่มประชุม (Accept & Start)]                     │
└──────────────────────────────────────────────────────────────┘
```

### State 3: Active Meeting

```text
┌── Virtual Meeting ──────────────────────────────────────────────────┐
│                                                                      │
│  ┌── Video Area (Jitsi iframe) ────────────────────────────────┐   │
│  │                                                              │   │
│  │     Doctor + Patient video feeds                             │   │
│  │     Jitsi controls (mute, camera, chat, etc.)               │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── AI Clinical Copilot (side panel) ─────────────────────────┐   │
│  │  🤖 AI Clinical Copilot                                      │   │
│  │  Quick: [Differential Dx] [Tests] [Red Flags] [Treatment]   │   │
│  │                                                              │   │
│  │  Patient: นายสมชาย, 65, Hypertension + DM2                  │   │
│  │  🤖: Consider checking renal function given...               │   │
│  │  ⚠️ Warning: Metformin + new contrast media risk            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌── Live Transcription (bottom panel) ────────────────────────┐   │
│  │  🔴 LIVE  ภาษา: [TH/EN]                                     │   │
│  │  👨‍⚕️ Doctor: สวัสดีครับ คุณสมชาย วันนี้เป็นอย่างไรบ้าง...     │   │
│  │  🧑 Patient: สวัสดีครับหมอ ปวดหัวมา 3 วัน...                │   │
│  │  👨‍⚕️ Doctor: ความดันวันนี้...  (interim, pulsing cursor)     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Controls: [🎙️ Record] [⏸️ Pause] [📝 Export] [🛑 End Meeting]     │
└──────────────────────────────────────────────────────────────────────┘
```

### State 4: Meeting Ended

```text
┌── Post-Meeting Report ──────────────────────────────────────┐
│                                                              │
│  🤖 AI Consultation Report:                                  │
│                                                              │
│  🎯 Chief Complaint: ปวดหัว 3 วัน                           │
│  📝 Presenting Symptoms: ปวดตื้อ ๆ บริเวณขมับทั้ง 2 ข้าง     │
│  🔍 Preliminary Assessment: Tension headache                 │
│  📋 Recommendations:                                         │
│     - Paracetamol 500mg prn                                 │
│     - ลดความเครียด                                           │
│  💊 Prescriptions: Paracetamol 500mg                        │
│  📅 Follow-up: 2 สัปดาห์                                    │
│  🚩 Red Flags: ปวดหัวรุนแรงขึ้น, ตาพร่า                     │
│  🏠 Lifestyle: ออกกำลังกายสม่ำเสมอ                           │
│                                                              │
│  ⚠️ requiresValidation: true                                │
│  [✅ Approve for EMR] [✏️ Edit] [🔄 Regenerate]             │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Features

### 3.1 Recording

| Feature | Technology | Format |
| ------- | ---------- | ------ |
| Video recording | MediaRecorder API | WebM |
| Upload | Cloud Storage service | Auto after meeting |
| Transcription | Generated from recording | Text |

### 3.2 Live Transcription (LiveTranscription component)

| Feature | Description |
| ------- | ----------- |
| Engine | Web Speech API (FREE, Chrome recommended) |
| Languages | Thai (th-TH) / English (en-US), switchable |
| Speaker ID | Doctor 👨‍⚕️ / Patient 🧑 / Guest 👥 with colors |
| Interim text | Yellow background, italic, pulsing cursor |
| Confidence | ⚠️ indicator for < 0.8 confidence |
| Auto-save | Saves to backend periodically |
| Export | Download as .txt file |
| Status | Color dot: green=listening, yellow=paused, red=error |

### 3.3 AI Clinical Copilot (AIChatCopilot component)

| Feature | Description |
| ------- | ----------- |
| Quick Actions | Differential Dx, Suggested Tests, Red Flags, Treatment |
| Patient Context | Shows patient name, age, conditions |
| Real-time suggestions | AI provides suggestions during consultation |
| Message types | Warning (yellow), Suggestion (green), Info (blue) |
| Minimizable | FAB button when minimized |

### 3.4 HOST Controls (Doctor as Moderator)

The doctor is always the HOST/moderator of all meetings, with full control over the meeting experience.

```text
┌── HOST Control Panel ───────────────────────────────────────┐
│                                                              │
│  👨‍⚕️ HOST Controls (Doctor Only):                             │
│                                                              │
│  🚪 Lobby Management:                                        │
│  ├── 🧑 สมชาย มั่นคง (Patient) — [✅ Admit] [❌ Reject]      │
│  ├── 👥 สมหญิง มั่นคง (Guest) — [✅ Admit] [❌ Reject]       │
│  └── 👥 Unknown User — [✅ Admit] [❌ Reject]                │
│                                                              │
│  🎙️ Transcript Streaming:                                    │
│  [▶️ START] [⏸️ PAUSE] [▶️ RESUME] [⏹️ STOP]                │
│  Status: 🟢 Active · Language: TH · Segments: 47            │
│                                                              │
│  🔇 Audio Controls:                                          │
│  [🔇 Mute All Participants] [🔊 Unmute All]                  │
│                                                              │
│  📹 Recording:                                                │
│  [🔴 Start Recording] [⏹️ Stop Recording]                    │
│  Status: Recording · Duration: 12:34                         │
│                                                              │
│  👥 Participant Management:                                   │
│  [Remove Participant] [Promote to Moderator]                 │
│                                                              │
│  🛑 Meeting:                                                  │
│  [🛑 End Meeting for All]                                     │
└──────────────────────────────────────────────────────────────┘
```

#### HOST Control Actions

| Control | API | Description |
| ------- | --- | ----------- |
| Lobby Admit | Jitsi External API | Approve participant from lobby into meeting |
| Lobby Reject | Jitsi External API | Deny participant entry with optional message |
| Transcript START | `POST /api/meetings/:id/start-transcription` | Begin Web Speech API capture via Socket.IO |
| Transcript PAUSE | Socket.IO event | Temporarily halt transcription, keep session |
| Transcript RESUME | Socket.IO event | Resume transcription from paused state |
| Transcript STOP | `POST /api/meetings/:id/stop-transcription` | End transcription, compile full transcript |
| Mute All | Jitsi External API | Mute all participant microphones |
| End Meeting | Jitsi External API + backend | Close meeting room, trigger AI pipeline |

### 3.5 Multi-Party Participant Management

Supports Microsoft Teams-like multi-party meetings with role-based controls.

```text
┌── Participants Panel ───────────────────────────────────────┐
│                                                              │
│  👥 Participants (4/10 max):                                 │
│                                                              │
│  👨‍⚕️ Dr. สมเกียรติ (HOST)          🎙️ ON  📹 ON             │
│  🧑 นายสมชาย (Patient)             🎙️ ON  📹 ON             │
│  👥 นางสมหญิง (Guest - Wife)       🎙️ OFF 📹 ON             │
│  👨‍⚕️ Dr. สมศรี (Invited Doctor)     🎙️ ON  📹 ON             │
│                                                              │
│  🚪 In Lobby (2):                                            │
│  ├── "สมาน" (non-registered) — [✅ Admit] [❌ Reject]       │
│  └── "พิชัย" (non-registered) — [✅ Admit] [❌ Reject]       │
│                                                              │
│  Participant Limits:                                         │
│  Doctor invites: Up to 3 additional doctors/admin            │
│  Patient guests: Up to 3 relatives/friends                   │
│  Non-registered: Must create display name, enter lobby       │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 Chat Integration During Meeting

All chat messages are captured for post-meeting AI summary generation.

| Feature | Description |
| ------- | ----------- |
| Text Chat | Available to all participants during meeting |
| Chat Capture | All messages saved to PostgreSQL via Socket.IO |
| Chat in AI Summary | Gemini processes chat messages alongside transcript |
| File Sharing | Share medical images, documents via chat |
| Chat Export | Download chat log as .txt after meeting |
| Speaker Labels | 👨‍⚕️ Doctor / 🧑 Patient / 👥 Guest with color coding |

### 3.7 Screen Sharing for Medical Images

| Feature | Description |
| ------- | ----------- |
| Screen Share | Share desktop/window/tab via Jitsi |
| Medical Images | Display X-rays, MRI, CT scans for discussion |
| Lab Results | Share lab result screens during consultation |
| Annotation | Point-and-highlight on shared screen |
| Recording | Screen share content captured in meeting recording |

---

## 4. Workflows

### Workflow 1: Complete Video Consultation

```text
Step 1:  Doctor clicks "Start Meeting" from Health Meeting page
Step 2:  Time check validates meeting window
Step 3:  Consent screen shown → Doctor accepts recording terms
Step 4:  Jitsi video loads in iframe (doctor as moderator)
Step 5:  Patient joins lobby → Doctor admits
Step 6:  Doctor starts live transcription
Step 7:  AI Copilot panel provides real-time suggestions
Step 8:  Doctor conducts consultation
Step 9:  Doctor clicks "End Meeting"
Step 10: Recording stops and uploads
Step 11: AI generates consultation report (SOAP format)
Step 12: Doctor reviews AI report (Man-in-the-Loop)
Step 13: Approves → Content available for EMR
```

### Workflow 2: Live Transcription During Meeting

```text
Step 1: Doctor clicks "Start Transcription"
Step 2: POST /api/meetings/:id/start-transcription
Step 3: Web Speech API begins listening
Step 4: Real-time transcript displays with speaker labels
Step 5: Segments saved to PostgreSQL periodically
Step 6: Doctor can pause/resume transcription
Step 7: Switch language (TH ↔ EN) as needed
Step 8: On meeting end → POST /api/meetings/:id/stop-transcription
Step 9: Full transcript compiled for AI summary
```

### Workflow 3: Multi-Party Meeting Management

```text
Step 1:  Doctor starts meeting as HOST/moderator
Step 2:  Patient joins via Patient URL → enters lobby
Step 3:  Doctor admits patient from lobby panel
Step 4:  Patient's relatives join via Guest URL → enter lobby
Step 5:  Non-registered guests enter display name → enter lobby
Step 6:  Doctor reviews each lobby participant → Admit or Reject
Step 7:  Invited doctors join via Doctor URL → auto-admitted (moderator role)
Step 8:  All admitted participants visible in Participants Panel
Step 9:  Doctor controls: mute individual/all, remove participant
Step 10: All participants can use text chat (captured for AI summary)
```

### Workflow 4: Meeting End → AI Summary Pipeline

```text
Step 1:  Doctor clicks "End Meeting for All" (HOST control)
Step 2:  Jitsi meeting room closes for all participants
Step 3:  Backend triggers: POST /api/meetings/:id/end
Step 4:  System compiles:
         → Full transcript (Web Speech API segments via Socket.IO)
         → All chat messages (Socket.IO captured)
         → Meeting metadata (duration, participants, recording URL)
Step 5:  POST /api/meetings/:id/generate-summary
Step 6:  Gemini 2.5 Flash Lite processes all meeting data
Step 7:  For meetings > 30 min: generates sectioned summaries (30-min intervals)
Step 8:  AI generates SOAP format summary:
         S = Subjective (from patient statements in transcript)
         O = Objective (from doctor observations in transcript)
         A = Assessment (AI-suggested diagnoses from clinical context)
         P = Plan (treatment discussion + follow-up from transcript)
Step 9:  Summary saved to PostgreSQL with status: pending_validation
Step 10: Doctor notified → Meeting Results tab shows new pending item
Step 11: Doctor reviews via Man-in-the-Loop validation (see Health Meeting page)
Step 12: Approved summary → pre-fills EMR Editor for finalization
```

### Workflow 5: Real-Time Transcript Display

```text
Step 1:  Doctor presses [▶️ START] transcript streaming
Step 2:  Web Speech API activates in browser (FREE, Chrome recommended)
Step 3:  Socket.IO streams transcript segments to Meeting Server (port 3020)
Step 4:  Live transcript panel displays with speaker identification:
         👨‍⚕️ Doctor: สวัสดีครับ คุณสมชาย วันนี้เป็นอย่างไรบ้าง...
         🧑 Patient: สวัสดีครับหมอ ปวดหัวมา 3 วัน...
         👥 Guest: (wife) หมอคะ สามีนอนไม่หลับด้วย...
Step 5:  Interim text shown with yellow background + pulsing cursor
Step 6:  Confidence < 0.8 shows ⚠️ indicator
Step 7:  Doctor can [⏸️ PAUSE] during breaks
Step 8:  Doctor can [▶️ RESUME] to continue
Step 9:  Language switchable: Thai (th-TH) ↔ English (en-US)
Step 10: Segments auto-saved to PostgreSQL periodically
Step 11: Doctor presses [⏹️ STOP] at meeting end
Step 12: Full transcript compiled and stored
```

---

## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/meetings/:id/start-transcription` | Start transcription session |
| POST | `/api/meetings/:id/transcript` | Add transcript segment |
| POST | `/api/meetings/:id/stop-transcription` | Stop and compile transcript |
| POST | `/api/meetings/:id/generate-summary` | Generate AI SOAP summary |
| GET | `/api/meetings/:id/summary` | Get stored AI summary |
| GET | `/api/meetings/:id/transcript` | Get full transcript |
| POST | `/api/meetings/:id/end` | End meeting and trigger AI pipeline |
| POST | `/api/meetings/:id/lobby` | Approve/reject lobby participant |
| GET | `/api/meetings/:id/participants` | List all meeting participants |
| POST | `/api/meetings/:id/mute-all` | Mute all participants (HOST only) |
| POST | `/api/meetings/:id/remove-participant` | Remove participant from meeting |
| POST | `/api/meetings/:id/chat` | Send/capture chat message |
| GET | `/api/meetings/:id/chat` | Get all chat messages |
| POST | `/api/meetings/:id/screen-share` | Start/stop screen sharing |
| POST | `/api/meetings/:id/recording/start` | Start meeting recording |
| POST | `/api/meetings/:id/recording/stop` | Stop meeting recording |

---

## 6. Meeting Technology Stack

| Component | Technology | Cost | Details |
| --------- | ---------- | ---- | ------- |
| Video Platform | Jitsi Meet (meet.jit.si) | FREE | With lobby, moderator controls |
| Transcription | Web Speech API (browser-native) | FREE | Chrome recommended, TH/EN support |
| AI Processing | Gemini 2.5 Flash Lite | FREE tier | SOAP summary generation |
| Real-time Transport | Socket.IO | FREE | Transcript streaming to port 3020 |
| Meeting Server | Express.js (port 3020) | Self-hosted | Manages meeting state |
| Database | PostgreSQL (izara_phase1) | Self-hosted | Stores transcripts, summaries, chat |

---

## 7. AI Agent Improvement Opportunities

- **Auto-dictation**: AI transcribe doctor's verbal notes directly to EMR fields

- **Real-time diagnosis support**: AI suggest differential diagnosis during conversation

- **Auto-summary**: AI generate meeting summary in real-time as conversation progresses

- **Sentiment analysis**: AI detect patient distress or confusion

- **Follow-up extraction**: AI automatically identify follow-up items from conversation

- **Speaker diarization enhancement**: AI improve speaker identification accuracy

- **Multi-language real-time translation**: AI translate between Thai and English in real-time

- **Clinical keyword highlighting**: AI highlight medical terms in transcript for quick review

- **Automatic section markers**: AI detect topic changes and mark 30-min summary boundaries

---

## PostgreSQL Database Integration

### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| meeting_records | SELECT/UPDATE | Track meeting session state and duration |
| meeting_transcripts | INSERT | Store transcript segments from Web Speech API |

### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| Meeting server endpoints (port 3020) | POST | INSERT meeting_transcripts via Socket.IO |

### Integration

- **Jitsi Meet:** iframe-based video conferencing

- **Web Speech API:** Browser-native speech recognition

- **Socket.IO:** Real-time transcript:segment event streaming

### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
