# Izara Telemedicine — Phase 1 v1.4.7 Change Log

## Summary of All Changes

**Date:** February 10, 2026  
**Version:** 1.4.7  
**Scope:** Meeting service rewrite, Google Cloud STT removal, comprehensive E2E tests, Docker deployment  

---

## 1. Meeting Server — COMPLETE REWRITE

**File:** `Izara-jitsi-server/server/index.js`  
**Action:** Deleted old file (795 lines) → Created new file with ALL Phase 1 endpoints  

### New Endpoints Added
| Endpoint | Method | Description |
|---|---|---|
| `/api/meetings/:id/pause-transcription` | POST | Toggle pause/resume transcription |
| `/api/meetings/:id/chat` | POST | Send chat message |
| `/api/meetings/:id/chats` | GET | Get chat messages |
| `/api/meetings/:id/invite` | POST | Add guest invite |
| `/api/meetings/:id/invites` | GET | Get guest invites |
| `/api/meetings/:id/transcript/sections` | GET | 30-minute split sections |
| `/api/ai/pre-consultation-summary` | POST | AI pre-consultation summary |
| `/api/ai/patient-instruction-sheet` | POST | AI patient instruction sheet |
| `/api/ai/document-analysis` | POST | AI document analysis |
| `/api/ai/cds-check` | POST | Clinical Decision Support |
| `/api/ai/validations` | GET | Get pending AI validations |
| `/api/ai/validate` | POST | Approve/reject AI content (man-in-the-loop) |

### Other Meeting Server Changes
- Added `optionalAuth` middleware for endpoints that work with or without auth
- Added in-memory Maps for chat, invites, AI validations
- Added new Socket.IO events: `chat-message`, `meeting-status`, `participant-joined/left`
- Fixed: transcript accepts both `content` and `text` fields (backward compatibility)
- Fixed: `isPaused` state in transcription sessions
- Fixed: `ai_validations` INSERT matches actual DB schema columns
- Health endpoint returns version 1.4.7 and feature flags

---

## 2. Meeting Server `package.json` — Cleaned Up

**File:** `Izara-jitsi-server/package.json`

| Change | Before | After |
|---|---|---|
| Version | 1.0.0 | 1.4.7 |
| `@google-cloud/speech` | Included | **REMOVED** (not needed) |
| `react`, `react-dom` | Included | **REMOVED** (server-only) |
| `socket.io-client` | Included | **REMOVED** (server-only) |
| `ws` | Included | **REMOVED** (socket.io handles WS) |
| `@types/react*` | devDeps | **REMOVED** |
| `typescript` | devDeps | **REMOVED** (plain JS server) |

---

## 3. Patient Portal `video-meeting.ts` — Updated

**File:** `Isara-patient-portal/server/routes/video-meeting.ts`

### Changes
- **Header comments**: Updated to reflect Web Speech API instead of Google Cloud STT
- **Removed**: `GOOGLE_SPEECH_API_KEY` configuration constant
- **Replaced**: `transcribeWithSpeechToText()` function — now a no-op stub with deprecation notice
- **Updated**: `/config` endpoint — `transcription: true` (always available, browser-native)
- **Updated**: `/health` endpoint — reflects Web Speech API, version 1.4.7
- **Updated**: Cost documentation — transcription now `$0 (browser-native)`
- **Updated**: Workflow comments — real-time Web Speech API instead of post-meeting audio upload
- **Updated**: EMR data `apiUsed.transcription` → "Web Speech API (browser-native, FREE)"

---

## 4. Docker Compose — Updated

**File:** `docker-compose.yml`

- **Removed**: `GOOGLE_SPEECH_API_KEY` from meeting-server environment
- **Added**: Comment documenting Web Speech API (browser-native, FREE)
- **Fixed**: `GEMINI_MODEL` default value

---

## 5. Environment Template — Created

**File:** `.env.docker.template` (NEW)

- Template with all required environment variables
- Clear documentation and setup instructions
- Groups: POSTGRES, JWT_SECRET, GEMINI, JITSI, GOOGLE_MAPS, PGADMIN

---

## 6. Comprehensive E2E Tests — Created

**File:** `tests/e2e/specs/01-meeting-workflows.spec.ts` (NEW — 82 tests)

### Test Sections
| Section | Tests | Coverage |
|---|---|---|
| P: Meeting Server Health & Config | 8 | Health endpoints, feature flags, version |
| Q: Meeting Creation & Room Management | 12 | Create from all portals, multi-patient, guest invites |
| R: Transcription Lifecycle | 10 | Start, segments, pause/resume, stop, backward compat |
| S: In-Meeting Chat | 8 | Send/get, validation, parallel, structure |
| T: Guest Invite Management | 6 | Add invite, roles, validation, list |
| U: AI Summary & Validation | 8 | Man-in-the-loop approve/reject, validations list |
| V: AI Advanced Features | 8 | CDS, pre-consultation, instructions, document analysis |
| W: Full Meeting Lifecycle | 8 | Create→transcribe→chat→stop→CDS→validate end-to-end |
| X: Multi-Patient Workflows | 8 | 3 patients, parallel, all services |
| Y: Cross-Service Integration | 6 | Patient→Doctor→Meeting server flows |

---

## 7. Deployment Script — Created

**File:** `scripts/deploy-local.ps1` (NEW)

- PowerShell script for local Docker deployment
- Steps: env setup → Docker check → build → health checks
- Parameters: `-NoBuild`, `-Down`, `-Logs`, `-SkipHealthCheck`

---

## Architecture Summary (Phase 1 v1.4.7)

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Patient Portal  │   │  Doctor Portal   │   │  Meeting Server  │
│   :3005          │   │   :3010          │   │   :3020          │
│  React + Vite    │   │  React + Vite    │   │  Node.js Express │
│  Express backend │   │  Express backend │   │  Socket.IO       │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    PostgreSQL 17      │
                    │    + pgvector         │
                    │    izara_phase1       │
                    │    :5432 (int) :5433  │
                    └──────────────────────┘

Technology Stack (ALL FREE / Low-cost):
  • Video:         Jitsi Meet (FREE)
  • Transcription: Web Speech API (browser-native, FREE)
  • AI Summary:    Gemini 2.5 Flash Lite (~$0.001/1K tokens)
  • CDS:           Rule-based + Gemini AI
  • Database:      PostgreSQL + pgvector
  • Deployment:    Docker Compose (local)
```
