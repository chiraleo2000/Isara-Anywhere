# ประชุมวิดีโอ Implementation - Jitsi Meet + Device Speech-to-Text + Gemini AI

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `VIDEO_MEETING_JITSI_GEMINI.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`VIDEO_MEETING_JITSI_GEMINI.md`](../VIDEO_MEETING_JITSI_GEMINI.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.7.56
**อัปเดตล่าสุด:** June 29, 2026
**สถานะ:** ✅ Phase 1 — 3-party meeting lifecycle (แพทย์ HOST + ผู้ป่วย + guest), 10s A/V hold, calendar sync on ยืนยัน, zero-skip local Docker gate


> **v1.7.53 — Real Jitsi only.** `VirtualMeeting.tsx` and the `/virtual-meeting/:id` route are removed.
> The single in-app flow is `MeetingRoom.tsx` (แพทย์ host) + `PatientMeetingRoom.tsx` (ผู้ป่วย) at
> `/meeting/:appointmentId`. JWT is never sent to public `meet.jit.si` (it causes a blank iframe);
> roles are enforced by the Izara lobby + `configOverwrite.moderator`. API auth uses opaque session
> tokens (`sessions` table), not JWT. No external meeting links in the UI.

> **v1.7.54 — Env consolidation (June 2026).** `.env` uses server-canonical names (`GEMINI_API_KEY`, `JITSI_DOMAIN`, `GOOGLE_MAPS_API_KEY`, `GCP_PROJECT_ID`). Browser URLs use `VITE_MEETING_SERVER_URL` + `resolveEnv()` / `window.ENV`. Docker compose bridges server vars to Vite build-args. Repo layout: `frontend/` + `backend/` per portal; `Izara-jitsi-server/backend/`.

> **v1.7.56 — Meeting stack parity (June 2026).** `DEMO_AUTO_LOGIN=1` + `DEMO_AUTO_MEETING=1` on doctor/patient portals (local `.env.docker` + Cloud Run) for silent session login. Guest invites use **token URL only** (`/guest/join/:token` on patient portal); bare `/guest-join/:id` is blocked unless `GUEST_ALLOW_ANONYMOUS_JOIN=1` (dev). Doctor lobby **manual Admit** always (`VITE_AUTO_ADMIT_LOBBY=0` in docker, gate, and cloud). E2E tests click `admit-all-btn` in the doctor lobby panel. Meeting-server needs `PATIENT_PORTAL_URL` for `buildGuestPortalUrls`.

> This document is the core Phase 1 deliverable describing the complete meeting workflow:
> นัดหมาย → Multi-Party Meeting → Transcript Streaming → AI Summary → EMR → ผู้ป่วย Delivery

---


## ภาพรวม

This document describes the ประชุมวิดีโอ implementation using:


- **Jitsi Meet** (FREE) for video conferencing with lobby control


- **Device/Browser Speech-to-Text** (FREE) for real-time transcription during meeting


- **Gemini 2.5 Flash AI** for EMR summary, pre-consultation summary, and ผู้ป่วย instructions


- **PostgreSQL** for storing transcripts, summaries, and meeting metadata


## Key ฟีเจอร์


### 1. Doctor as Meeting HOST (assigned doctor only)


- **Only the assigned แพทย์** can START the meeting — แพทย์ URL includes `config.moderator=true`; `meeting_config.hostRole = 'doctor'`
- ผู้ดูแลระบบ and ผู้ป่วย are **not** moderators (Teams/Zoom enterprise model)


- แพทย์ controls lobby admission, recording, and meeting settings


- แพทย์ receives meeting link in นัดหมาย timetable/calendar


### 2. Lobby System for Guest Approval


- **ผู้ป่วย waits in lobby** until แพทย์ joins and admits them


- **ผู้ป่วย Relatives** can be invited via email and must be approved by แพทย์


- **แพทย์ Consultants/Specialists** can be invited and must be approved by แพทย์


- Lobby prevents unauthorized access to the consultation


### 3. Guest Invite System


- **Token-based invites** generated for each guest


- Invites sent via email with unique join links


- Invite types: `patient_relative`, `doctor_consultant`, `family_member`


- แพทย์ can revoke invites at any time


### 4. Media Controls (Default: ON)


- **Camera**: Enabled by default (`startWithVideoMuted=false`)


- **Microphone**: Enabled by default (`startWithAudioMuted=false`)


- **Text Chat**: Always available for communication


- Users can mute/unmute at any time


### 5. Real-Time Transcript Streaming (Phase 1 Feature — HOST Control)


- **Device/Browser Web Speech API** (FREE - no Google Cloud cost)


- **แพทย์ (HOST) controls**: START / PAUSE / RESUME / STOP transcript


- Real-time transcript streaming via Socket.IO during the meeting


- Speaker labels: 👨‍⚕️ แพทย์ / 🧑 ผู้ป่วย / 👥 Guest


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


- แพทย์, ผู้ป่วย, relatives, guests can all send chat messages


### 7. Multi-Party Meeting Support


- **ผู้ป่วย can invite**: relatives, friends (via พอร์ทัลผู้ป่วย sharing)


- **แพทย์ can invite**: other doctors, ผู้ดูแลระบบ, specialists (token-based)


- **Non-registered users**: receive guest join page → enter name only → enter LOBBY


- **Guest Join Pages** (public, no login required):
  - **Production (canonical):** Patient Portal `/guest/join/:token` — opaque invite from `POST /api/meetings/:id/guest-invite`; guest enters display name + clicks join → Izara lobby
  - **Deprecated (blocked by default):** `/guest-join/:meetingId` on patient and doctor portals — returns `guest-access-denied` unless `GUEST_ALLOW_ANONYMOUS_JOIN=1` (local dev only)

- **Canonical invite URLs** (Meeting Server `buildGuestPortalUrls` — copy from API only, never hardcode แพทย์ origin):
  - `guestLink` / `guestTokenUrl`: `{PATIENT_PORTAL_URL}/guest/join/{opaqueToken}` — **use this in UI copy-to-clipboard**
  - `guestJoinUrl`: bare `/guest-join/{meetingKey}` — only when `GUEST_ALLOW_ANONYMOUS_JOIN=1`
  - `POST /api/meetings/:id/share-link` and `guest-invite` return token URL; Cloud Build sets `PATIENT_PORTAL_URL` on meeting-server after portal deploy.

- **Guest video mount**: full-height `jitsi-guest-container`; wait for `host-ready` (poll + socket on **all room aliases** via `GET /socket-rooms`) before Jitsi External API; iframe sized 100%×70vh; retry on failure.
- **Socket rooms**: `join-meeting` joins นัดหมาย id + meeting UUID + lobby aliases so `host-ready` and `lobby-update` reach guests.
- **Post-meeting**: `save-recording` → `recording_url` (+ BYTEA); `/end` → Gemini summary → doctor dashboard `getMeetingFiles` → **Insert meeting summary into EMR**.

- แพทย์ as HOST approves/rejects each participant from lobby (like Microsoft Teams)


- ผู้ดูแลระบบ joins as regular lobby participant — แพทย์ must approve


- Up to 8 participants per meeting recommended


- **Backend lobby API**:
  - `POST /api/meetings/:id/lobby/join` — guest joins (name only, auto-generated participantId)
  - `GET /api/meetings/:id/lobby/status/:participantId` — guest polls own สถานะ
  - `POST /api/meetings/:id/lobby/admit` — แพทย์ admits (auth required)
  - `POST /api/meetings/:id/lobby/reject` — แพทย์ rejects (auth required)


### 8. AI-Powered EMR Generation with Man-in-the-Loop


- **Gemini 2.5 Flash Lite** processes: transcript + chats + video metadata + ผู้ป่วย PHR


- Generates SOAP format EMR draft (Thai OPD Card standard)


- **แพทย์ MUST validate** before ผู้ป่วย receives any data (Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย))


- Actions: [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]


- **Requirement 2.5:** แพทย์ตรวจสอบก่อนส่งข้อมูลถึงคนไข้


### 9. Patient Instruction Sheet Auto-Generation


- AI generates ผู้ป่วย-friendly summary in simple Thai


- Content: วินิจฉัย, ยาที่ได้รับ, การปฏิบัติตัว, อาการเตือน, นัดติดตาม


- แพทย์ validates before sending to ผู้ป่วย (Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย))


- ผู้ป่วย views and downloads PDF in พอร์ทัลผู้ป่วย → Health History


- **Requirement 2.1:** สร้างเอกสารสรุปคำแนะนำให้ผู้ป่วย


- **Requirement 4.5:** ผู้ป่วย Instruction Sheet อัตโนมัติ


### 10. Post-Meeting AI Pipeline (Automatic)


- **INPUT to Gemini AI:**
  - ① Full transcript from streaming (with speaker labels and timestamps)
  - ② All chat messages (with timestamps and senders)
  - ③ Video recording metadata (duration, participants)
  - ④ ผู้ป่วย's existing PHR/EMR context


- **OUTPUT:**
  - SOAP summary (Thai) with 30-minute sections for long meetings
  - Clinical Decision Support recommendations
  - ผู้ป่วย Instruction Sheet draft
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


## ขั้นตอนการทำงาน

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
| EMR Summary | Gemini AI (gemini-3.1-flash-lite) | ~$0.001/1K tokens |
| CDS Recommendations | Gemini AI | ~$0.001/1K tokens |
| ผู้ป่วย Instruction Sheet | Gemini AI | ~$0.001/1K tokens |
| Recording | Jitsi Built-in Local Recording | **$0** (FREE) |
| Video Storage | **PostgreSQL** / Cloud Storage | ~$0.02/GB/month |
| **Total per 15-min consultation** | | **~$0.01-0.05** |

> **KEY CHANGE:** Transcription is now **FREE** using Web Speech API (browser-native) instead of Google Cloud Speech-to-Text. This dramatically reduces per-consultation cost.


## API Endpoints


### Patient Portal (`/api/video-meeting`)

| Endpoint | Method | คำอธิบาย |
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

| Endpoint | Method | คำอธิบาย |
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

| Endpoint | Method | คำอธิบาย |
| ---------- | -------- | ------------- |
| `/:appointmentId/invite` | POST | Create guest invite |
| `/:appointmentId/invite/:inviteId` | DELETE | Revoke guest invite |
| `/:appointmentId/join-with-invite` | POST | Join using invite token |
| `/:appointmentId/invites` | GET | List all invites for meeting |


## Guest Invite System


### Invite Types


- **patient_relative**: Family members who can observe/support ผู้ป่วย


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
  "joinUrl": "<https://meet.jit.si/Izara-APT2025-a7b3c9d1?inviteToken=secure-token-abc",>
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
  "joinUrl": "<https://meet.jit.si/Izara-APT2025-a7b3c9d1#config.lobby=true...",>
  "roomName": "Izara-APT2025-a7b3c9d1",
  "guestType": "patient_relative"
}
```


### Lobby Behavior


- All guests join via lobby first


- แพทย์ (HOST) sees notification of waiting guests


- แพทย์ can **Approve** or **Reject** each guest


- Approved guests join the meeting


- Rejected guests receive error message


### Meeting Server Validation & Delivery Endpoints (v1.5.9)

| Endpoint | Method | คำอธิบาย |
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


- 👨‍⚕️ **แพทย์**: Speaker detected from แพทย์'s audio stream


- 🧑 **ผู้ป่วย**: Speaker detected from ผู้ป่วย's audio stream


- 👥 **Guest**: Speaker detected from guest audio streams (by display name)


- Timestamps: Each segment includes `start_time_seconds` and `end_time_seconds`


- Language: Each segment tagged with detected language (th/en)


### Medical Speech Recognition ฟีเจอร์


- **Continuous Mode**: Uninterrupted transcription during consultation


- **Interim Results**: Real-time display of partial recognition (pulsing yellow)


- **Thai + English**: Primary Thai with English switching by HOST


- **No Cost**: Browser-native API, zero API charges


- **Browser Support**: Chrome, Edge, Safari (WebKit)


## Jitsi Meet Configuration


### URL Format for Doctor (HOST)

```text
<https://meet.jit.si/Izara-{appointmentId}-{hash}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.lobby.enabled=true&config.moderator=true&userInfo.displayName={doctorName}>
```


### URL Format for Patient (LOBBY)

```text
<https://meet.jit.si/Izara-{appointmentId}-{hash}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName={patientName}>
```


### URL Format for Guest (INVITE + LOBBY)

```text
<https://meet.jit.si/Izara-{appointmentId}-{hash}?inviteToken={token}#config.prejoinConfig.enabled=true&config.startWithVideoMuted=false&config.startWithAudioMuted=false&userInfo.displayName={guestName}>
```


### ฟีเจอร์ Enabled


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
  model: 'gemini-3.1-flash-lite',
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
    "model": "gemini-3.1-flash-lite",
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
JITSI_APP_ID=izara-telemedicine



# Speech-to-Text: Web Speech API (FREE - browser-native, no API key needed)


# No environment variable required for transcription



# Gemini AI Configuration (for summary, CDS, patient instructions)
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-3.1-flash-lite
VITE_GEMINI_TEMPERATURE=0.3
VITE_GEMINI_MAX_TOKENS=8192



# PostgreSQL Database
DATABASE_URL=postgresql://izara_user:password@localhost:5432/izara_phase1



# Meeting Server
MEETING_SERVER_PORT=3020
MEETING_SERVER_URL=<http://localhost:3020>

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


## Automated E2E (Group Q — local Docker + cloud gate)

### Q01 — Full 3-party lifecycle (v1.7.51)

**File:** `tests/group-Q-meeting-lifecycle.ui-test.ts`  
**Fixture:** `tests/helpers/meeting-lifecycle-fixture.ts`

| ขั้นตอน | ผู้ดำเนินการ | การกระทำ | Assertion / `data-testid` |
|------|--------|--------|---------------------------|
| Q01a | แพทย์ | `POST /api/meetings/create` with session JWT | Meeting record + Jitsi room; แพทย์ is HOST |
| Q01b | Doctor | Mount Jitsi in `MeetingRoom.tsx` (`/meeting/:id`) | Doctor iframe loaded; `configOverwrite.moderator: true` |
| Q01c | ผู้ป่วย | `joinMeetingToLobby` → Izara lobby | `lobby-waiting-screen` visible; **not** in Jitsi yet |
| Q01d | Guest | Open `guest_meeting_url` + token | `guest-name-input` → submit → `guest-lobby-waiting` |
| Q01e | แพทย์ | Click `admit-all-btn` | Lobby API สถานะ `admitted` for ผู้ป่วย + guest |
| Q01f | **All 3** | `holdWithMediaChecks` for `MEETING_HOLD_MS` (**10s**) | `assertThreePartyInMeeting`: 3 Jitsi iframe shells; `minSamples: 3` media checks (fake camera/mic in CI via Playwright flags) |
| Q01g | แพทย์ | `end-meeting-btn` | Meeting สถานะ `completed`; triggers หลังประชุม pipeline |
| Q02 | แพทย์ | Meeting Results page | `recordingUrl` + `recording-player` + `generate-summary-btn` (requires real `GEMINI_API_KEY` locally) |

**3-party hold details (Q01f):**

```text
holdWithMediaChecks({
  pages: [doctorPage, patientPage, guestPage],
  holdMs: MEETING_HOLD_MS,   // 10000
  minSamples: 3,             // one sample per party
})
```

- Guest page participates in the same 10s hold as แพทย์ and ผู้ป่วย (not แพทย์-only).
- `assertThreePartyInMeeting` verifies three distinct Jitsi mount contexts without strict participant-count API (Jitsi external API can lag in Docker).
- Optional `assertThreePartyLobbyAdmitted` removed from Q01e path due to post-admit Jitsi mount flakiness in headless CI.

**Related tests:**

| Group | Coverage |
|-------|----------|
| **J** | ผู้ป่วย prejoin / lobby consent (`group-J-patient-jitsi-prejoin.ui-test.ts`) |
| **R** | JWT role matrix — แพทย์ moderator, patient/guest non-moderator (`group-R-jitsi-role-permissions.ui-test.ts`) |
| **D** | นัดหมาย ยืนยัน → meeting links + **D4cal** calendar (`group-D-appointment-workflows.ui-test.ts`) |
| **E** | EMR after meeting |
| **F** | Clinical records |

See [TWO_ROUND_CLOUD_TESTING.md](TWO_ROUND_CLOUD_TESTING.md), [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md), and `reports/defect-fix/DEFECT_REGISTER.md` (June 8 gate).

## Docker Configuration


### Dockerfile.unified ARG

```dockerfile


# Jitsi Meet Video Conferencing (FREE)
ARG JITSI_DOMAIN=meet.jit.si
ARG VITE_JITSI_DOMAIN=meet.jit.si
ARG JITSI_APP_ID=izara-telemedicine
```


### docker-compose.yml

```yaml
services:
  patient-frontend:
    build:
      args:
        JITSI_DOMAIN: "meet.jit.si"
        VITE_JITSI_DOMAIN: "meet.jit.si"
        JITSI_APP_ID: "izara-telemedicine"
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
  "meetingUrl": "<https://meet.jit.si/Izara-APT2025-a7b3c9d1",>
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
  "joinUrl": "<https://meet.jit.si/Izara-APT2025-a7b3c9d1#config...",>
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


## ความปลอดภัย Considerations

1. **Room Name Hashing**: Room names include secure hash to prevent guessing
2. **Role-based auto-join**: Authenticated doctors and patients auto-enter meetings with account display names; only URL guests enter a name manually
3. **No Persistent Storage**: Meeting URLs expire after meeting ends
4. **PDPA Compliance**: Transcripts stored according to PDPA guidelines
5. **End-to-End Encryption**: Jitsi supports E2EE for sensitive consultations
6. **PostgreSQL Storage**: All meeting data stored in PostgreSQL (not public cloud buckets)
7. **File Size Limits**: 200MB max for video uploads
8. **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)**: All AI outputs require แพทย์ validation before ผู้ป่วย delivery
9. **Guest Lobby Control**: Non-registered users cannot enter meeting without HOST approval
10. **Chat Privacy**: Meeting chat messages are private to the consultation and stored securely
11. **Permissions-Policy**: `camera=(self "<https://meet.jit.si")`,> `microphone=(self "<https://meet.jit.si")`> — scoped to Jitsi iframe only (v1.5.9 fix)
12. **CSP for Video**: `frame-src meet.jit.si 8x8.vc`, `media-src mediastream:`, `worker-src blob:`, `connect-src *.run.app wss://*.run.app`
13. **Iframe Allow Attribute**: Explicit `allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *"` on Jitsi iframe


## Testing


### Test Environments

| Environment | พอร์ทัลผู้ป่วย | พอร์ทัลแพทย์ | Meeting Server | Database |
| ----------- | ------------- | ------------- | -------------- | -------- |
| **Local** | localhost:3005 | localhost:3010 | localhost:3020 | localhost:5432 |
| **Cloud** | ผู้ป่วย-portal-xxxxx.run.app | แพทย์-portal-xxxxx.run.app | meeting-server-xxxxx.run.app | CloudSQL |


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


### Comprehensive Meeting Test สถานการณ์

| # | Test | Validates |
| - | ---- | --------- |
| 1 | แพทย์ creates meeting as HOST | Jitsi URL generation, moderator flag |
| 2 | ผู้ป่วย enters lobby, แพทย์ admits | Lobby system, admission control |
| 3 | Guest creates display name from blank, enters lobby | Guest self-registration |
| 4 | แพทย์ selectively admits/rejects guests | HOST lobby control |
| 5 | แพทย์ starts transcript streaming | Web Speech API activation |
| 6 | Real-time transcript with speaker labels | Socket.IO streaming + speaker ID |
| 7 | แพทย์ pauses/resumes transcript | HOST transcript control |
| 8 | All participants send chat messages | Chat capture with timestamps |
| 9 | แพทย์ stops transcript | Transcript finalization |
| 10 | แพทย์ ends meeting | All disconnected, data compiled |
| 11 | AI processes transcript + chats | Gemini summary pipeline |
| 12 | 30-min sectioned summaries for long meetings | Section splitting |
| 13 | แพทย์ reviews AI summary (Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)) | Validation UI |
| 14 | EMR Editor pre-filled with AI SOAP data | Auto-population |
| 15 | ผู้ป่วย Instruction Sheet generated | AI + แพทย์ validation |
| 16 | ผู้ป่วย receives results in Health History | ผู้ป่วย delivery pipeline |


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
curl -X POST <http://localhost:3009/api/video-meeting/create> \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "APT-TEST-001", "doctorId": "DOC-001"}'



# Test video upload
curl -X POST <http://localhost:3009/api/video-meeting/APT-TEST-001/upload-recording> \
  -H "Content-Type: application/json" \
  -d '{"videoBase64": "<base64>", "doctorId": "DOC-001"}'



# Test get meeting files
curl <http://localhost:3009/api/video-meeting/APT-TEST-001/files?doctorId=DOC-001>
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
2. Check นัดหมาย สถานะ is not cancelled
3. Verify appointmentId is correct


## Future Improvements (Phase 2)

1. **Self-hosted Jitsi**: For complete control, deploy own Jitsi server
2. **Gemini LLM Fine-Tuning**: Fine-tune on Thai medical data (Requirement 3.4)
3. **Multi-language Support**: Automatic language detection during transcription
4. **Chunked Upload**: Support for large video files via chunked upload
5. **Video Playback**: In-portal video playback for แพทย์ review
6. **Waiting Room UI**: Enhanced lobby with estimated wait time
7. **AI Chat History**: Long-term AI knowledge base from meeting data (Requirement 3.3)


## References


- [Jitsi Meet API](<https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)>


- [Web Speech API (MDN)](<https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)>


- [Gemini AI API](<https://ai.google.dev/docs)>


- [WebRTC Standards](<https://webrtc.org/)>


- [Socket.IO Documentation](<https://socket.io/docs/v4/)>

**อัปเดตล่าสุด:** January 2025 (v1.4.7)

---


## PostgreSQL ฐานข้อมูล Architecture for Video Meetings


### ฐานข้อมูล Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **meeting_records** | Video session metadata + AI output | id (UUID), appointment_id, doctor_id, patient_id, room_name, jitsi_domain, สถานะ (waiting/active/completed/ended), meeting_config (JSONB), transcript (text), ai_summary (text), ai_recommendations (text), section_summaries (JSONB), doctor_validation_status (รอดำเนินการ/approved/rejected), patient_instructions (text), recording_data (BYTEA), duration_minutes |
| **meeting_transcripts** | Speech-to-Text segments | id (UUID), meeting_record_id (FK), speaker_id, speaker_role (doctor/patient/guest), speaker_name, content (text), language (th/en), confidence (decimal), start_time_seconds (decimal), is_final (boolean) |
| **transcriptions_embeddings** | Vectorized transcript chunks for RAG | meeting_record_id, chunk_text, speaker_role, start_time_seconds, end_time_seconds, embedding (vector), metadata (JSONB) |
| **นัดหมาย** | Meeting scheduling context | id, patient_id, doctor_id, สถานะ, meet_link, jitsi_room_name, confirmed_date_time |
| **emr** | AI-generated SOAP from meeting | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, ai_summary_approved, สถานะ |
| **ai_validations** | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) approvals | id, type ('meeting_summary'/'emr'), patient_id, doctor_id, decision, content_snapshot (JSONB) |
| **ai_chat_history** | Meeting-context AI conversations | id, user_id, session_id, role, content, context (JSONB), embedding (vector) |
| **ai_chat_memory** | Long-term AI knowledge from meetings | id, user_id, memory_type, title, content, source_session_id, embedding (vector), relevance_score, is_active |


### Complete Meeting Data Flow (End-to-End)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MEETING LIFECYCLE DATA FLOW                                │
│                                                                              │
│  1. APPOINTMENT SCHEDULING                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Patient Portal (3005): POST /api/appointments                          │  │
│  │ → INSERT INTO appointments (patient_id, doctor_id, status='pending')   │  │
│  │                                                                        │  │
│  │ Doctor Portal (3010): PUT /api/appointments/:id/confirm               │  │
│  │ → UPDATE appointments SET status='confirmed',                         │  │
│  │     jitsi_room_name='izara-{aptId}-{ts}', meet_link=$jitsiUrl         │  │
│  │ → NOTIFY appointment_changes → Socket.IO: appointment:updated         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  2. MEETING START (Doctor as Host)                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Meeting Server (3020): POST /api/meetings/start                        │  │
│  │ → INSERT INTO meeting_records (appointment_id, doctor_id, patient_id,  │  │
│  │     room_name, jitsi_domain='meet.jit.si', status='waiting',           │  │
│  │     meeting_config=$json)                                              │  │
│  │ → UPDATE appointments SET status='in_progress'                        │  │
│  │ → Jitsi iframe loads with lobby enabled                               │  │
│  │ → NOTIFY meeting_changes → Socket.IO: meeting:updated                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  3. REAL-TIME TRANSCRIPTION (Web Speech API — FREE)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Browser: SpeechRecognition API captures audio → text                   │  │
│  │ → Socket.IO emit: 'transcript:segment' (speaker, content, confidence)  │  │
│  │ → Meeting Server: INSERT INTO meeting_transcripts (meeting_record_id,  │  │
│  │     speaker_id, speaker_role, speaker_name, content, language,         │  │
│  │     confidence, start_time_seconds, is_final)                          │  │
│  │ → Broadcast to all participants via Socket.IO: 'transcript:update'     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  4. MEETING END + AI SUMMARY PIPELINE                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Doctor ends meeting → Meeting Server: POST /api/meetings/:id/end       │  │
│  │                                                                        │  │
│  │ Step 1: Gather full transcript                                        │  │
│  │ SELECT content, speaker_role FROM meeting_transcripts                 │  │
│  │   WHERE meeting_record_id = $1 ORDER BY start_time_seconds            │  │
│  │                                                                        │  │
│  │ Step 2: Send to Gemini 2.5 Flash Lite                                 │  │
│  │ → AI generates: ai_summary, ai_recommendations, section_summaries     │  │
│  │ → AI generates: SOAP format EMR draft (subjective, objective,         │  │
│  │     assessment, plan)                                                  │  │
│  │ → AI generates: patient_instructions (lay-term summary)               │  │
│  │                                                                        │  │
│  │ Step 3: Store AI output                                               │  │
│  │ UPDATE meeting_records SET ai_summary=$1, ai_recommendations=$2,      │  │
│  │   section_summaries=$3, patient_instructions=$4, status='completed',   │  │
│  │   duration_minutes=$5                                                  │  │
│  │                                                                        │  │
│  │ Step 4: Create vector embeddings for RAG                              │  │
│  │ INSERT INTO transcriptions_embeddings (meeting_record_id, chunk_text, │  │
│  │   speaker_role, start_time_seconds, end_time_seconds,                 │  │
│  │   embedding=$vector, metadata=$json)                                   │  │
│  │                                                                        │  │
│  │ Step 5: NOTIFY meeting_changes → Socket.IO: meeting:completed         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  5. MAN-IN-THE-LOOP VALIDATION (Doctor Portal)                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Doctor reviews AI-generated SOAP EMR:                                  │  │
│  │ → [✓ Approve] → INSERT INTO emr (ai_summary_approved=true,            │  │
│  │     status='signed') + INSERT ai_validations (decision='approved')     │  │
│  │ → [✏️ Edit]   → INSERT INTO emr (doctor-modified version)              │  │
│  │     + INSERT ai_validations (decision='edited')                        │  │
│  │ → [✗ Reject]  → INSERT ai_validations (decision='rejected')           │  │
│  │     + Doctor writes EMR manually                                       │  │
│  │                                                                        │  │
│  │ UPDATE meeting_records SET doctor_validation_status=$decision          │  │
│  │ NOTIFY emr_changes → Socket.IO: emr:updated                          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  6. PATIENT DELIVERY                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Patient Portal (3005): GET /api/health-records/emr                     │  │
│  │ → SELECT FROM emr WHERE patient_id=$1 AND status='signed'             │  │
│  │                                                                        │  │
│  │ Patient views: EMR summary, prescriptions, patient instructions       │  │
│  │ All linked to the original appointment and meeting                     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```


### PostgreSQL LISTEN/NOTIFY for Meetings

```sql
-- Trigger on meeting_records table
CREATE OR REPLACE FUNCTION notify_meeting_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('meeting_changes',
    json_build_object(
      'operation', TG_OP,
      'id', COALESCE(NEW.id, OLD.id),
      'appointment_id', COALESCE(NEW.appointment_id, OLD.appointment_id),
      'status', NEW.status
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- pgNotifyListener bridges to Socket.IO
-- PostgreSQL LISTEN meeting_changes → io.to(roomName).emit('meeting:updated', data)
```


### Deployment Architecture

| Environment | Service | Meeting Role | Database |
| ----------- | ------- | ------------ | -------- |
| Local Docker | พอร์ทัลผู้ป่วย (3005) | Join meeting (participant) | izara-postgres:5432 |
| Local Docker | พอร์ทัลแพทย์ (3010) | Host meeting + validate AI EMR | izara-postgres:5432 |
| Local Docker | Meeting Server (3020) | Jitsi control + transcript + AI pipeline | izara-postgres:5432 |
| Production | All Cloud Run | Same roles, higher timeout (600s for meetings) | 35.240.157.230:5432 |
| External | meet.jit.si | Jitsi SaaS (FREE, no server cost) | N/A |


### API Endpoints with DB Operations

| Portal | Endpoint | Method | DB Operation |
| ------ | -------- | ------ | ------------ |
| Meeting | `/api/meetings/start` | POST | INSERT meeting_records, UPDATE appointments |
| Meeting | `/api/meetings/:id/end` | POST | UPDATE meeting_records + AI pipeline |
| Meeting | `/api/meetings/:id/transcript` | POST | INSERT meeting_transcripts |
| Meeting | `/api/meetings/:id/summary` | GET | SELECT FROM meeting_records |
| Meeting | `/api/meetings/:id/validate` | POST | UPDATE meeting_records + INSERT ai_validations |
| Doctor | `/api/emr` | POST | INSERT emr (from AI or manual) |
| Doctor | `/api/emr/:id/approve` | PUT | UPDATE emr + INSERT ai_validations |
| Patient | `/api/health-records/emr` | GET | SELECT emr WHERE status='signed' |
| Meeting | Socket.IO `transcript:segment` | emit | INSERT meeting_transcripts |
| Meeting | Socket.IO `meeting:updated` | emit | Triggered by PG NOTIFY |


### Scenario Coverage

| # | Scenario | ผู้ดำเนินการ | DB Tables |
| - | -------- | ----- | --------- |
| 1 | แพทย์ starts meeting | แพทย์ | meeting_records, นัดหมาย |
| 2 | ผู้ป่วย joins via lobby | ผู้ป่วย | meeting_records (สถานะ update) |
| 3 | Real-time transcription | Both | meeting_transcripts |
| 4 | Meeting ends, AI summary | Meeting Server | meeting_records, transcriptions_embeddings |
| 5 | แพทย์ approves AI EMR | แพทย์ | emr, ai_validations, meeting_records |
| 6 | แพทย์ edits AI EMR | แพทย์ | emr, ai_validations |
| 7 | แพทย์ rejects AI EMR | แพทย์ | ai_validations, emr (manual) |
| 8 | ผู้ป่วย views EMR result | ผู้ป่วย | emr (read-only) |
| 9 | AI creates ผู้ป่วย instructions | Meeting Server | patient_instructions, ai_validations |
| 10 | Transcript embedded for RAG | Meeting Server | transcriptions_embeddings |
| 11 | AI chat references past meetings | แพทย์ | ai_chat_history, transcriptions_embeddings |
| 12 | Multi-party meeting (invitees) | แพทย์+Guests | meeting_records, meeting_transcripts |

---

## Automated verification (Group Q — cloud P0)

| Scenario | Test | Notes |
|----------|------|-------|
| Q01 — 3-party lifecycle | `tests/group-Q-meeting-lifecycle.ui-test.ts` | แพทย์ HOST via internal JWT; ผู้ป่วย + guest `lobbyJoinUnauth`; แพทย์ `lobbyAdmitAll`; **10s** hold (`MEETING_HOLD_MS`); optional `GET /api/meetings/:id/runtime` when `IZARA_DEV_TESTING=1` |
| Q02 — Recording + Gemini | Same file, test Q02 | `POST .../save-recording` body **`audioBase64`** (not `recordingData`); immediate `GET .../results`; UI `data-testid`: `recording-player`, `generate-summary-btn`, `summary-structured` |
| Meeting Server contracts | `Izara-jitsi-server/tests/*.test.mjs` | `npm run test:meeting-server:contract` |
| Selectors | `tests/SELECTORS.md` | `end-meeting-btn`, `recording-indicator`, `meeting-results` |

**Run (after Group D + D-host):**

```bash
npm run test:e2e:meeting-lifecycle
```

**Cloud persistence (v1.7.22+):** `save-recording` dual-writes WebM to `RECORDINGS_DIR` (`/tmp/recordings` on Cloud Run) and PostgreSQL `meeting_records.recording_data` (BYTEA). `GET /api/recordings/:id/:file` serves disk first, then BYTEA fallback.

**Error ledger:** `npm run ledger:cloud -- --round N` after each cloud run; fix only after `CLOUD_E2E_ERROR_LEDGER_ROUND{N}.md` exists.

**No stubs on cloud:** Group Q must not use fake `save-recording` or stub `generate-summary` transcripts when `TEST_ENV=cloud`.

---

## Post-meeting pipeline (recording → transcript → AI summary)

**Module:** `Izara-jitsi-server/backend/services/postMeetingPipeline.js`

| Stage | What happens | Failure handling |
|-------|----------------|------------------|
| Storage | Browser `save-recording` or Jibri webhook → `meetings/{doctorId}/{meetingId}/video.{ext}` + BYTEA + optional `GCS_BUCKET` | 50MB upload cap; WebM/MP4 header validation; 422 on interrupted capture |
| Transcribe | Live `meeting_transcripts` first; else Google STT (≤50MB sync); else OpenAI Whisper (≤25MB) | Partial pipeline if no audio; `stage: partial` in `meeting_config.postMeetingPipeline` |
| AI summary | Gemini clinical JSON + Thai SOAP narrative → `ai_summary`, `ai_summary_structured` | Socket `meeting-summary-ready`; แพทย์ must validate before EMR |
| UI | แพทย์ dashboard `GET /api/video-meeting/:appointmentId/files`; AI Summary tab | `summaryText` / `aiSummary`; pipeline สถานะ in `postMeetingPipeline` |

**Production (meet.jit.si):** MediaRecorder → `POST /api/meetings/:id/save-recording` → `queuePostMeetingPipeline`. Jibri webhook is for self-hosted Jitsi only.

---

## Self-hosted Jitsi (local Docker + LAN)

**Stack:** `deploy/jitsi/docker-jitsi-meet` (vendored stable-9646) via `docker compose --profile jitsi`.

| Environment | `JITSI_DOMAIN` | TLS | E2E notes |
|-------------|----------------|-----|-----------|
| Local Windows | `meet.localhost:8443` | Jitsi web self-ลงนามแล้ว | Chromium `--host-resolver-rules=MAP meet.localhost 127.0.0.1` |
| Ubuntu LAN | `meet.demotoday.net` | Nginx (`deploy/nginx/`) | `TEST_ENV=lan`; hosts/DNS on client PCs |

**Setup:** `node scripts/jitsi/setup-local-jitsi.mjs --sync-docker-env` syncs `JITSI_JWT_SECRET` / `JITSI_APP_ID` into Prosody and `.env.docker`.

**Role JWT (private domain only):**

| Role | JWT claim | `configOverwrite.moderator` |
|------|-----------|----------------------------|
| แพทย์ | `moderator: true` | `true` |
| ผู้ป่วย | `moderator: false` | `false` |
| Guest | `moderator: false` | `false` |

**Recording:** แพทย์ manual toggle only (`MeetingRoom.tsx` — no auto-record on join). Browser `save-recording` path is primary for local/LAN; optional Jibri profile (`docker compose --profile jibri`) for webhook-only validation — not required for gate PASS.

**Gate evidence:** `phase:4` Q+R headed; `selfHostedJitsiJwt.contract.test.ts`; ledger round 9 P0=0; JROLE01 Chromium + JROLE02 Firefox (Edge แพทย์ hybrid) run in full/parallel gate with zero skips.

---

**APIs:**

- `POST /api/meetings/:id/save-recording` — hierarchical storage + async pipeline
- `POST /api/meetings/:id/end` — queues pipeline when recording exists but transcript/summary incomplete
- `GET /api/meetings/:id/pipeline-status` — แพทย์-scoped progress
- `POST /api/webhooks/jibri-recording` — `X-Jibri-Webhook-Secret` (self-hosted)
- `GET /api/recordings/meetings/:doctorId/:meetingId/:filename` — isolated playback (Range requests)

**Env:** `GEMINI_API_KEY`, `GCP_SERVICE_ACCOUNT_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`, optional `OPENAI_API_KEY` (Whisper), `GCS_BUCKET`, `JIBRI_WEBHOOK_SECRET`, `POST_MEETING_PIPELINE_TIMEOUT_MS` (default 900000).

**HIPAA / PDPA:** Recordings namespaced by `doctor_id`; playback and pipeline-สถานะ enforce `doctor_id === JWT user` (ผู้ดูแลระบบ exempt). PHI in PostgreSQL BYTEA — restrict DB access; prefer GCS with CMEK for long-term archive.

---

## Regression verification (v1.7.49 — Defect PDF items 2–3)

| Check | Implementation | Test |
|-------|----------------|------|
| ผู้ป่วย display name auto-filled | `getIzaraDisplayName`, `prejoinPageEnabled=false`, `requireDisplayName=false` | `jitsiDisplayName.behavior`, `defectIsaraPdfMeetingQueue` DPDF-N* |
| No JWT on public `meet.jit.si` | `resolveMountJwt` / `pickJitsiJwt` | `meetingWorkflowHardening` MWH01–08 |
| แพทย์ joins first (host on public Jitsi) | `notifyHostPresent`, `waitForHostReady`, `host-ready` gate | `hostReadyGate`, DPDF-M* |
| แพทย์ layout-first mount | `prepareLayoutThenMount` in `MeetingRoom.tsx` | `virtualMeetingLayoutFirst` |

**Local Docker gate:** `npm run test:unit:docker:deploy` — **2817** Vitest + **78** meeting-server contracts PASS.

---

## Detailed ขั้นตอนการทำงาน — Roles, Host-Ready, Prejoin (v1.7.51)

### Role matrix

| Role | Portal login | Enter meeting | Lobby / admit | Jitsi moderator | Toolbar |
|------|--------------|---------------|---------------|-----------------|---------|
| แพทย์ | `DEMO_AUTO_LOGIN=1` → silent session (`AuthProvider`) | Auto host consent + Jitsi mount; display name from account; **Health Meeting** auto-enters first ready telehealth when `DEMO_AUTO_MEETING=1` (`?stayOnQueue=1` test-only opt-out) | **HOST** — sees lobby panel; clicks **Admit** (`VITE_AUTO_ADMIT_LOBBY=0` prod) | `true` | participants-pane, recording |
| ผู้ป่วย | `DEMO_AUTO_LOGIN=1` → silent session (`AuthContext`) | Auto `lobby_starting` → Izara lobby; waits `host-ready` + admit | Waits until แพทย์ admits | `false` | no host controls |
| Guest | Manual name on `/guest/join/:token` only | Name form + `guest-join-btn` → Izara lobby | Waits until doctor admits | `false` | limited |

| Role | JWT affiliation (legacy doc) |
|------|------------------------------|
| แพทย์ | `owner` |
| ผู้ป่วย | `member` |
| Guest | `none` |

### Host-ready timing (critical)

- **Do NOT** mark host online on socket `connect` or `join-meeting` alone  
- **DO** call `POST /api/meetings/:id/host-present` on แพทย์ `videoConferenceJoined`  
- Patients wait via `waitForHostReady()` before mounting Jitsi iframe  

### Room name persistence

- Canonical: `jitsi_room_name` on นัดหมาย row after ยืนยัน  
- Fallback (deterministic): `izara-{appointmentId[0:12]}-meeting` via `stableRoomNameForAppointment()`  
- Avoid ad-hoc `Date.now()` room names in in-app join paths  

### Patient display name (Defect J1)

- `prejoinPageEnabled: false`, `requireDisplayName: false`  
- Name from `resolvePatientMeetingDisplayName()` → auth profile → Jitsi `userInfo.displayName`  
- Logged-in patients: **no manual name entry** on Izara pre-join screen  

### Post-meeting pipeline

See [`POST_MEETING_WORKFLOW.md`](POST_MEETING_WORKFLOW.md).

**Tests:** DPDF-M*, DPDF-N*, `group-J-patient-jitsi-prejoin`, `group-R-jitsi-role-permissions`, `group-Q-meeting-lifecycle`

### Session authentication (v1.7.52 — JWT removed)

| Layer | Mechanism |
|-------|-----------|
| Portal + meeting API | PostgreSQL opaque session token (`Authorization: Bearer`) |
| Guest invite | Opaque token in `meeting_invites` table |
| Recording share | Opaque token in `recording_share_tokens` table |
| Jitsi roles | Izara lobby + `configOverwrite.moderator`; **HS256 JWT on private domain** (`meet.localhost`, LAN) — แพทย์ moderator, patient/guest not |

### E2E testing policy (v1.7.52)

- **Headed UI always** — set `PW_HEADED=1` (default in quality gates).
- **No Google Chrome** — set `PW_NO_CHROME=1`; use Firefox (patient/admin), Edge (แพทย์), WebKit (Group W).
