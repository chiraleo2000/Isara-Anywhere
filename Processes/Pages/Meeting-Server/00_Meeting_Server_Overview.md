# 🎥 Jitsi Meeting Server — Overview

> **Version:** v1.4.7 · **Updated:** 2026-02-10

**Port:** `localhost:3020`  
**Component:** `Izara-jitsi-server/`  
**Runtime:** Node.js 22 + Express + Socket.IO  
**AI Engine:** Gemini 2.5 Flash Lite (API)  
**Video:** Jitsi Meet (meet.jit.si)  
**Transcription:** Web Speech API (browser-native, FREE)  
**Database:** PostgreSQL (izara_phase1) with pgvector  
**Docker Service:** `izara-meeting-server`  
**Thai Title:** เซิร์ฟเวอร์ประชุมออนไลน์ / Meeting Server

---

## 1. Purpose

The Meeting Server (Port 3020) is the **central backend for all meeting operations** in the Isara telemedicine platform. It orchestrates the complete video consultation lifecycle from creation through AI-powered post-meeting analysis and delivery.

### Core Responsibilities

| Area | Description |
| ---- | ----------- |
| **Meeting Creation & Room Management** | Generate Jitsi rooms with 3 distinct URLs (doctor / patient / guest) |
| **Lobby Management** | Track who enters; doctor approves or rejects participants |
| **Real-time Transcript Streaming** | Receive Web Speech API segments via Socket.IO, store continuously |
| **Chat Message Aggregation** | Capture all chat messages with timestamps and sender attribution |
| **Post-Meeting AI Pipeline** | Compile transcript + chats → send to Gemini 2.5 Flash Lite → SOAP summary |
| **30-Minute Sectioned Summaries** | Automatic sectioning of long meeting transcripts for digestible review |
| **CDS Recommendations** | Generate Clinical Decision Support recommendations from consultation data |
| **Patient Instruction Sheets** | Auto-generate patient-facing instruction documents |
| **Guest Invite Token Management** | Create and validate one-time guest invite tokens for 3rd-party participants |
| **Meeting Record Storage** | Persist all results in PostgreSQL (meeting_records, meeting_transcripts, meeting_chat_messages, EMR tables) |

---

## 2. Architecture

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│                        MEETING SERVER (Port 3020)                             │
├──────────────────┬───────────────────┬────────────────────────────────────────┤
│  REST API        │  WebSocket        │  AI Services                           │
│  (Express)       │  (Socket.IO)      │  (Gemini 2.5 Flash Lite)              │
│                  │                   │                                        │
│  /api/health     │  join-meeting     │  SOAP Summary Generation              │
│  /api/meetings   │  leave-meeting    │  30-Min Sectioned Summaries           │
│  /api/meetings/  │  transcript-seg   │  CDS Recommendations                  │
│   :id/transcript │  chat-message     │  Patient Instruction Sheets           │
│  /api/meetings/  │  meeting-status   │  Pre-Consultation Summary             │
│   :id/chats      │  participant-     │  Document Analysis                    │
│  /api/ai/*       │   joined/left     │                                        │
│                  │                   │  Web Speech API                        │
│                  │                   │  (Browser-native, FREE)               │
├──────────────────┴───────────────────┴────────────────────────────────────────┤
│                        PostgreSQL (izara_phase1) + pgvector                   │
│  Tables: meeting_records · meeting_transcripts · meeting_chat_messages        │
│  EMR tables: emr_consultations · emr_soap_notes · emr_cds_recommendations    │
│  Fallback: In-memory storage when DB unavailable                              │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```text
  Browser (Web Speech API)          Browser (Chat UI)
        │                                 │
        │  transcript-segment             │  chat-message
        ▼                                 ▼
  ┌─────────────── Socket.IO ───────────────────┐
  │           Meeting Server (3020)              │
  │   ┌──────────┐    ┌──────────────────┐      │
  │   │Transcript│    │  Chat Messages   │      │
  │   │ Storage  │    │   Aggregation    │      │
  │   └────┬─────┘    └───────┬──────────┘      │
  │        │                  │                  │
  │        └───────┬──────────┘                  │
  │                ▼                             │
  │   ┌──────────────────────────┐               │
  │   │  Post-Meeting AI Pipeline│               │
  │   │  Transcript + Chats + PHR│               │
  │   │        ▼                 │               │
  │   │  Gemini 2.5 Flash Lite   │               │
  │   │        ▼                 │               │
  │   │  SOAP Summary            │               │
  │   │  Section Summaries       │               │
  │   │  CDS Recommendations     │               │
  │   │  Patient Instructions    │               │
  │   └──────────┬───────────────┘               │
  │              ▼                               │
  │   PostgreSQL (izara_phase1)                  │
  └──────────────────────────────────────────────┘
```

---

## 3. REST API Endpoints

### Health Check

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/health` | Server health + DB status |
| GET | `/api/test` | Simple connection test |

### Meeting Management

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/meetings` | Create new meeting record; generates Jitsi room with 3 URLs (doctor/patient/guest) |
| GET | `/api/meetings/:meetingId` | Get meeting details including URLs, status, participants |
| PUT | `/api/meetings/:meetingId` | Update meeting (status, duration, ended_at) |
| GET | `/api/meetings` | List meetings (by doctor/patient, with filters) |

### Transcription Control (HOST only)

| Method | Endpoint | Auth | Purpose |
| ------ | -------- | ---- | ------- |
| POST | `/api/meetings/:id/start-transcription` | HOST | Initialize transcription session — begins capturing Web Speech API segments |
| POST | `/api/meetings/:id/pause-transcription` | HOST | Pause live transcription — segments stop being captured |
| POST | `/api/meetings/:id/start-transcription` (resume) | HOST | Resume paused transcription — continues from where it left off |
| POST | `/api/meetings/:id/stop-transcription` | HOST | Stop and compile full transcript — triggers final assembly |
| GET | `/api/meetings/:id/transcript` | Any | Get full compiled transcript (all segments joined) |
| GET | `/api/meetings/:id/transcript/sections` | Any | Get 30-minute sectioned transcript summaries for long meetings |

### Chat Messages

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/meetings/:id/chats` | Get all chat messages with timestamps and sender attribution |

### AI Summary & Recommendations

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/meetings/:id/generate-summary` | Trigger post-meeting AI pipeline: transcript + chats + PHR → Gemini → SOAP summary |
| GET | `/api/meetings/:id/summary` | Get stored SOAP summary |
| GET | `/api/meetings/:id/recommendations` | Get CDS (Clinical Decision Support) recommendations |

### AI Services

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/ai/pre-consultation-summary` | Generate pre-consultation summary from patient PHR before meeting |
| POST | `/api/ai/patient-instruction-sheet` | Generate patient-facing instruction sheet after consultation |
| POST | `/api/ai/document-analysis` | Analyze uploaded medical documents using Gemini |

---

## 4. JWT Authentication

- All API endpoints (except `/api/health` and `/api/test`) require JWT token
- Token passed via `Authorization: Bearer <token>` header
- Secret: `JWT_SECRET` environment variable
- Validates user identity for all meeting operations

---

## 5. Database Schema

### `meeting_records` Table

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | SERIAL PK | Auto-increment ID |
| appointment_id | INTEGER | Linked appointment |
| doctor_id | INTEGER FK | Doctor user |
| patient_id | INTEGER FK | Patient user |
| room_name | VARCHAR(255) | Jitsi room name (e.g., `izara-{meetingId}`) |
| jitsi_domain | VARCHAR(255) | Jitsi server domain (default: `meet.jit.si`) |
| meeting_url | TEXT | Base meeting URL |
| doctor_url | TEXT | Doctor-specific URL (HOST/moderator privileges) |
| transcript | TEXT | Compiled full transcript text |
| ai_summary | TEXT | AI-generated SOAP summary (Gemini output) |
| ai_recommendations | TEXT | CDS recommendations generated by AI |
| section_summaries | JSONB | 30-minute sectioned summaries for long meetings |
| status | VARCHAR(50) | scheduled / in_progress / completed / cancelled |
| started_at | TIMESTAMP | Meeting start time |
| ended_at | TIMESTAMP | Meeting end time |
| duration_minutes | INTEGER | Computed duration in minutes |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

### `meeting_transcripts` Table

Stores individual transcript segments received via Socket.IO during the meeting.

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | SERIAL PK | Auto-increment ID |
| meeting_record_id | INTEGER FK | References meeting_records.id |
| speaker_id | INTEGER | Speaker user ID |
| speaker_role | VARCHAR(50) | doctor / patient / guest |
| content | TEXT | Transcript text segment |
| language | VARCHAR(10) | th-TH / en-US |
| start_time_seconds | FLOAT | Segment start time (seconds from meeting start) |
| end_time_seconds | FLOAT | Segment end time (seconds from meeting start) |
| created_at | TIMESTAMP | Segment creation |

### `meeting_chat_messages` Table *(New)*

Captures all in-meeting chat messages for inclusion in the AI summary pipeline.

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | SERIAL PK | Auto-increment ID |
| meeting_record_id | INTEGER FK | References meeting_records.id |
| sender_id | INTEGER | Sender user ID |
| sender_name | VARCHAR(255) | Display name of sender |
| sender_role | VARCHAR(50) | doctor / patient / guest |
| message | TEXT | Chat message content |
| timestamp | TIMESTAMP | When the message was sent |

### Related EMR Tables

| Table | Purpose |
| ----- | ------- |
| `emr_consultations` | Stores finalized consultation records linked to meeting |
| `emr_soap_notes` | Doctor-approved SOAP notes derived from AI summary |
| `emr_cds_recommendations` | Clinical Decision Support recommendations |

---

## 6. WebSocket Events (Socket.IO)

Socket.IO provides the real-time communication layer for live transcription, chat, and meeting status updates.

### Client → Server

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `join-meeting` | `{ meetingId, userId, role }` | User joins meeting Socket.IO room |
| `leave-meeting` | `{ meetingId, userId }` | User leaves meeting room |
| `transcript-segment` | `{ meetingId, text, speakerId, role, lang, startTime, endTime }` | New transcription segment from Web Speech API |
| `chat-message` | `{ meetingId, senderId, senderName, senderRole, message }` | Chat message sent during meeting |

### Server → Client (Broadcast to room)

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `transcript-segment` | `{ speakerId, speakerRole, text, language, startTime, endTime, timestamp }` | Broadcast transcript segment to all participants |
| `chat-message` | `{ senderId, senderName, senderRole, message, timestamp }` | Broadcast chat message to all participants |
| `meeting-status` | `{ meetingId, status, transcriptionActive }` | Meeting status change (started, paused, ended) |
| `participant-joined` | `{ userId, role, displayName }` | Participant joined the meeting |
| `participant-left` | `{ userId, role }` | Participant left the meeting |
| `meeting-ended` | `{ meetingId, duration }` | Meeting ended — triggers post-meeting pipeline |

### Connection Flow

```text
1. Client connects → Socket.IO handshake with JWT auth
2. Client emits join-meeting → Server adds to room, broadcasts participant-joined
3. HOST starts transcription → meeting-status broadcast (transcriptionActive: true)
4. Transcript segments flow bidirectionally in real-time
5. Chat messages captured and broadcast to all participants
6. HOST stops transcription → meeting-status broadcast (transcriptionActive: false)
7. Client emits leave-meeting → Server broadcasts participant-left
8. Last participant leaves → Server triggers meeting end + AI pipeline
```

---

## 7. Post-Meeting AI Pipeline

The AI pipeline is triggered after the meeting ends (via `POST /api/meetings/:id/generate-summary`). It uses **Gemini 2.5 Flash Lite** to process the complete meeting data.

### Pipeline Input

```text
┌─────────────────────────────────────────────────────┐
│  INPUT TO GEMINI 2.5 FLASH LITE                     │
│                                                     │
│  1. Full compiled transcript (all segments joined)  │
│  2. All chat messages (with sender attribution)     │
│  3. Patient Health Record (PHR) context             │
│     - Allergies, chronic conditions, medications    │
│     - Recent lab results, vital signs               │
│                                                     │
│  → Gemini processes all three data sources           │
│  → Generates structured clinical outputs            │
└─────────────────────────────────────────────────────┘
```

### Pipeline Outputs

| # | Output | Storage | Description |
| - | ------ | ------- | ----------- |
| 1 | **SOAP Summary** | `meeting_records.ai_summary` | Structured summary in Thai (Subjective, Objective, Assessment, Plan) |
| 2 | **30-Min Section Summaries** | `meeting_records.section_summaries` (JSONB) | For meetings > 30 min: auto-sectioned summaries for digestible review |
| 3 | **CDS Recommendations** | `meeting_records.ai_recommendations` | Clinical Decision Support — drug interactions, guideline alerts, follow-up suggestions |
| 4 | **Patient Instruction Sheet** | Returned via `/api/ai/patient-instruction-sheet` | Patient-friendly instructions in Thai — what to do, medications, warning signs |

### SOAP Summary Format (Thai)

```text
Gemini Prompt Context:
- Role: Medical AI assistant for Thai telemedicine
- Input: Transcript + Chat messages + Patient PHR
- Output language: Thai (with English medical terms where appropriate)

Format:
- อาการสำคัญ (Chief Complaint / S - Subjective): ...
- อาการที่พบ (Presenting Symptoms / O - Objective): ...
- การประเมินเบื้องต้น (Preliminary Assessment / A - Assessment): ...
- แผนการรักษา (Treatment Plan / P - Plan): ...
- คำแนะนำ (Recommendations): ...
- ใบสั่งยา (Prescriptions): ...
- นัดติดตาม (Follow-up): ...
- อาการที่ต้องเฝ้าระวัง (Red Flags): ...
- คำแนะนำด้านไลฟ์สไตล์ (Lifestyle Recommendations): ...

requiresValidation: true → Doctor MUST approve before use (Man-in-the-Loop)
```

### 30-Minute Sectioned Summaries

For meetings longer than 30 minutes, the AI automatically divides the transcript into 30-minute sections and generates a focused summary for each.

```json
// section_summaries JSONB structure
[
  {
    "section": 1,
    "startMinute": 0,
    "endMinute": 30,
    "summary": "ผู้ป่วยอธิบายอาการปวดหัวเรื้อรัง...",
    "keyTopics": ["headache", "medication history"]
  },
  {
    "section": 2,
    "startMinute": 30,
    "endMinute": 60,
    "summary": "แพทย์ทำการตรวจร่างกายผ่านวิดีโอ...",
    "keyTopics": ["physical exam", "differential diagnosis"]
  }
]
```

### CDS Recommendations

Generated alongside the SOAP summary, CDS provides:
- **Drug interaction alerts** — cross-referenced with patient's current medications
- **Clinical guideline references** — relevant Thai/international guidelines
- **Follow-up suggestions** — recommended follow-up timeline and tests
- **Red flag warnings** — urgent findings that require immediate action

### Pre-Consultation Summary

`POST /api/ai/pre-consultation-summary` — Called **before** the meeting starts to give the doctor a quick overview of the patient's PHR, recent visits, and relevant history.

---

## 8. Complete Meeting Lifecycle

The meeting server manages 10 distinct phases from creation through delivery:

```text
┌─ 1. CREATE ──────────────────────────────────────────────────────┐
│  POST /api/meetings                                               │
│  • Creates meeting_record with status: scheduled                  │
│  • Generates Jitsi room name: izara-{meetingId}                   │
│  • Creates 3 URLs: doctor_url (HOST), patient_url, guest_url     │
│  • Generates guest invite tokens (if applicable)                  │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 2. LOBBY ───────────────────────────────────────────────────────┐
│  Participants connect to Jitsi room                               │
│  • Doctor joins → Bypasses lobby (HOST/moderator)                │
│  • Patient joins → Enters lobby, doctor approves/rejects         │
│  • Guest joins → Enters lobby with invite token, doctor approves │
│  • Socket.IO: participant-joined broadcast to room                │
│  • meeting-status event: { status: 'lobby' }                     │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 3. START ───────────────────────────────────────────────────────┐
│  Doctor starts the meeting                                        │
│  • PUT /api/meetings/:id → status: in_progress, started_at       │
│  • POST /start-transcription (HOST only)                         │
│  • Web Speech API begins capturing audio → text in browser       │
│  • meeting-status broadcast: { transcriptionActive: true }       │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 4. TRANSCRIPT STREAMING ────────────────────────────────────────┐
│  Real-time bidirectional transcript flow                          │
│  • Client: Web Speech API captures audio → text (FREE, native)   │
│  • Client emits transcript-segment via Socket.IO                 │
│  • Server stores segment in meeting_transcripts table            │
│  • Server broadcasts segment to all room participants            │
│  • Supports Thai (th-TH) and English (en-US)                    │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 5. CHAT MESSAGES ───────────────────────────────────────────────┐
│  All chat messages captured and aggregated                        │
│  • Client emits chat-message via Socket.IO                       │
│  • Server stores in meeting_chat_messages table                  │
│  • Each message has: sender_id, sender_name, sender_role,        │
│    message content, and timestamp                                │
│  • Messages broadcast to all room participants                   │
│  • Chat data included in post-meeting AI pipeline                │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 6. TRANSCRIPT CONTROL (HOST) ───────────────────────────────────┐
│  Doctor (HOST) controls transcription lifecycle:                   │
│  • PAUSE  → POST /pause-transcription — segments stop capturing  │
│  • RESUME → POST /start-transcription — resume from pause        │
│  • meeting-status broadcast on each state change                 │
│  • All control restricted to HOST role only                      │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 7. MEETING END ─────────────────────────────────────────────────┐
│  POST /stop-transcription (HOST only)                             │
│  • Compiles all transcript segments into full transcript          │
│  • PUT /api/meetings/:id → status: completed, ended_at           │
│  • duration_minutes computed automatically                       │
│  • meeting-ended broadcast to all participants                   │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 8. AI PIPELINE ─────────────────────────────────────────────────┐
│  POST /generate-summary                                           │
│  Gemini 2.5 Flash Lite processes:                                 │
│    Input:  Full transcript + All chat messages + Patient PHR     │
│    Output: SOAP summary (Thai)                                   │
│            30-min sectioned summaries (for long meetings)         │
│            CDS recommendations                                    │
│            Patient instruction sheet                              │
│  All results stored in meeting_records + EMR tables               │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 9. REVIEW (Man-in-the-Loop) ────────────────────────────────────┐
│  Doctor reviews AI-generated outputs:                             │
│  • SOAP summary → Approve / Edit / Regenerate                   │
│  • CDS recommendations → Accept or dismiss                       │
│  • Patient instructions → Review before sending                  │
│  • requiresValidation: true on all AI outputs                    │
│  • Approved content flows to EMR Editor                          │
└───────────────────────────────────────────────────────────────────┘
         ↓
┌─ 10. DELIVERY ───────────────────────────────────────────────────┐
│  Results distributed across the platform:                         │
│  • SOAP note → Doctor Portal EMR Editor                          │
│  • Patient instructions → Patient Portal notifications           │
│  • CDS alerts → Doctor's dashboard                               │
│  • Consultation record → Patient health record                   │
│  • Meeting transcript → Archived for compliance                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 9. Jitsi Meet Configuration

### URL Construction

```text
Base URL: JITSI_SERVER_URL (default: https://meet.jit.si)
Room: izara-{meetingId}
Config params:
  - config.prejoinConfig.enabled=true
  - config.defaultLanguage=th
  - config.startWithAudioMuted=false
  - config.startWithVideoMuted=false
  - config.disableDeepLinking=true
  - config.lobby.enabled=true
  - config.recording.enabled=true
```

### Role-Based Access

| Role | Access | Lobby |
| ---- | ------ | ----- |
| Doctor | Moderator (HOST) | Bypasses lobby |
| Patient | Participant | Enters lobby, doctor admits |
| Guest | Participant | Enters lobby, doctor admits |

---

## 10. Client Components

### LiveTranscriptionService (Singleton)

| Property | Description |
| -------- | ----------- |
| Pattern | Singleton (one instance per browser) |
| Engine | Web Speech API (SpeechRecognition) |
| Languages | Thai (th-TH), English (en-US) |
| Features | Start, stop, pause, resume, switch language |
| Transport | Socket.IO emits `transcript-segment` |
| Retry | Auto-restart on speech error with exponential backoff |

### MeetingTranscription (React UI)

| Feature | Description |
| ------- | ----------- |
| Transcript display | Scrollable with auto-scroll |
| Speaker labels | Doctor 👨‍⚕️ / Patient 🧑 / Guest 👥 |
| Interim text | Yellow background, italic, pulsing cursor |
| Low confidence | ⚠️ badge for < 0.8 confidence |
| Language switcher | TH ↔ EN toggle |
| Export | Download transcript as .txt |
| Status indicator | Green (listening), Yellow (paused), Red (error) |

---

## 11. In-Memory Fallback

When PostgreSQL is unavailable, the server falls back to in-memory storage:

```text
inMemoryStore = {
  meetings: Map<meetingId, meetingRecord>,
  transcripts: Map<meetingId, transcriptSegment[]>,
  summaries: Map<meetingId, aiSummary>
}
```

- ⚠️ Data lost on server restart
- Logs warning: "Database unavailable, using in-memory storage"
- All API endpoints still functional

---

## 12. Docker Configuration

| Setting | Value |
| ------- | ----- |
| Service Name | `izara-meeting-server` |
| Dockerfile | `Izara-jitsi-server/Dockerfile` |
| Base Image | node:22-slim |
| Port | 3020 (host) → 3020 (container) |
| User | Non-root (node) |
| Healthcheck | `curl -f http://localhost:3020/api/health` |
| Interval | 30s |
| Depends On | PostgreSQL, Jitsi Meet |

### docker-compose.yml snippet

```yaml
izara-meeting-server:
  build:
    context: ./Izara-jitsi-server
    dockerfile: Dockerfile
  ports:
    - "3020:3020"
  environment:
    - PORT=3020
    - NODE_ENV=production
    - DB_HOST=postgres
    - DB_PORT=5432
    - DB_NAME=izara_phase1
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - JWT_SECRET=${JWT_SECRET}
    - JITSI_SERVER_URL=https://meet.jit.si
  depends_on:
    postgres:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3020/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## 13. Environment Variables

### Application

| Variable | Default | Description |
| -------- | ------- | ----------- |
| PORT | 3020 | Server port |
| NODE_ENV | development | Environment |
| CORS_ORIGIN | * | Allowed origins |

### Database

| Variable | Default | Description |
| -------- | ------- | ----------- |
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | izara_phase1 | Database name |
| DB_USER | postgres | DB username |
| DB_PASSWORD | postgres | DB password |

### Jitsi

| Variable | Default | Description |
| -------- | ------- | ----------- |
| JITSI_SERVER_URL | https://meet.jit.si | Jitsi server |
| JITSI_APP_ID | — | App ID for auth |
| JITSI_APP_SECRET | — | App secret |

### AI / Speech

| Variable | Default | Description |
| -------- | ------- | ----------- |
| GEMINI_API_KEY | — | Google Gemini API key |
| GOOGLE_APPLICATION_CREDENTIALS | — | Service account path |

### Authentication

| Variable | Default | Description |
| -------- | ------- | ----------- |
| JWT_SECRET | — | JWT signing secret |

---

## 14. Cross-System Integration

```text
Patient Portal ←→ Meeting Server ←→ Doctor Portal

1. Doctor confirms appointment → Meeting Server creates room
2. Patient receives meeting link via notification
3. Both join Jitsi via Meeting Server URLs
4. Live transcription flows through Socket.IO
5. AI summary generated after meeting
6. Summary sent to Doctor Portal → EMR Editor
7. Completed consultation updates Patient Portal
```

---

## 15. Testing Scenarios

### Unit Tests

| Test | Description |
| ---- | ----------- |
| Meeting CRUD | Create, read, update meeting records |
| Transcript Storage | Store and retrieve transcript segments |
| Chat Storage | Store and retrieve chat messages |
| JWT Auth | Valid/invalid/expired token handling |
| HOST-only Endpoints | Verify non-HOST users get 403 on transcription control |
| AI Summary Generation | Mock Gemini response, verify SOAP parsing |
| Section Summaries | Verify 30-min sectioning logic for long transcripts |

### Integration Tests

| Test | Description |
| ---- | ----------- |
| Full Meeting Lifecycle | Create → Start → Transcript → Chat → End → Summary |
| Socket.IO Events | Connect, join room, emit/receive transcript + chat events |
| Database Persistence | Verify all data written to PostgreSQL correctly |
| Gemini API Integration | End-to-end AI pipeline with real/mock Gemini responses |
| Guest Invite Flow | Token generation → guest joins → lobby approval → participation |
| In-Memory Fallback | Verify server works when PostgreSQL is unavailable |

### E2E / Manual Test Scenarios

| # | Scenario | Steps | Expected Result |
| - | -------- | ----- | --------------- |
| 1 | **Basic consultation** | Doctor creates meeting → Both join → Transcript → End → Summary | SOAP summary generated in Thai |
| 2 | **Long meeting (>30 min)** | 45-min simulated meeting | Section summaries generated (2 sections) |
| 3 | **Chat + Transcript** | Mix of spoken transcript and typed chat | AI summary incorporates both sources |
| 4 | **Guest participant** | Doctor invites guest → Guest uses token → Lobby → Approved | Guest can participate, transcript includes guest |
| 5 | **Transcript pause/resume** | HOST pauses → speaks off-record → resumes | Paused period not in transcript |
| 6 | **Network interruption** | Socket.IO disconnects mid-meeting → reconnects | Transcript resumes without data loss |
| 7 | **CDS recommendations** | Meeting with drug interaction scenario | CDS flags interaction alert |
| 8 | **Patient instruction sheet** | Complete meeting → generate instructions | Patient-friendly document in Thai |
| 9 | **Pre-consultation summary** | Call before meeting with patient PHR | Doctor receives patient context summary |
| 10 | **Concurrent meetings** | Multiple meetings running simultaneously | Each meeting isolated, no data leakage |

---

## 16. AI Agent Improvement Opportunities

- **Speaker diarization**: AI improve speaker identification accuracy
- **Real-time medical NER**: AI extract medical entities during conversation
- **Multi-language support**: Add more languages beyond Thai/English
- **Auto-coding**: AI auto-assign ICD-10 codes from transcript
- **Quality scoring**: AI rate consultation quality metrics
- **Sentiment tracking**: AI monitor patient satisfaction in real-time
- **Follow-up extraction**: AI automatically identify action items
- **Integration with wearables**: Real-time vital data overlay during meeting

---

*Document version: v1.4.7 — Last updated: 2026-02-10*
