# 📋 CHANGELOG — Izara Telemedicine Platform

> **Current Version:** v1.5.1  
> **Last Updated:** February 23, 2026  
> **Status:** Phase 1 Complete + Phase 2 + Phase 2.1 AI-HIS

---

## [v1.5.1] — 2026-02-23

### 🎉 Major Features Added

#### Omnichannel Integration
- **Omnichannel Webhook Server** (Port 3015)
  - Handles LINE Official Account webhooks
  - Handles WhatsApp Business Cloud API webhooks
  - Handles Telegram Bot API webhooks
  - HMAC-SHA256 signature validation per platform
  - Message normalization to canonical schema
  - PDPA consent gate (checks consent before processing)

#### OpenClaw MCP Server
- **MCP Protocol Server** (Port 3016)
  - HTTP-based Model Context Protocol implementation
  - Stateful session context store (in-memory + GCS persistence)
  - Entity extraction via Google Gemini API
  - Doctor AI Task router (5 tasks)
  - AES-256-GCM encryption for sensitive payload routing

#### 5 Doctor AI Tasks

| Task # | Task Name | Description |
|--------|-----------|-------------|
| **Task 1** | History Taking | NLP extraction of symptoms, HPI, vitals from patient chat |
| **Task 2** | Care Team Conference | Auto-generate Telegram team brief from MCP context |
| **Task 3** | Investigation Request | AI-suggested lab/radiology orders with approval workflow |
| **Task 4** | Prescription & Follow-up | Draft prescription + automated follow-up message dispatch |
| **Task 5** | Referral Package | Generate referral letter from full patient context |

#### Frontend Enhancements
- **OmnichannelMonitor** component (Doctor Portal)
  - Real-time message feed (Socket.io)
  - Patient context panel (MCP context viewer)
  - AI action approval panel
  - Reply composer for multi-channel responses

---

### 📊 Database Changes

#### Phase 2.0 Tables (v2.0.0-phase2-tables.sql)
Added 8 new tables for mobile app support:

1. **device_tokens** — Push notification device registration (iOS/Android/Web)
2. **biometric_credentials** — Biometric authentication (fingerprint, Face ID, iris)
3. **refresh_tokens** — JWT refresh token rotation for mobile sessions
4. **push_subscriptions** — Per-user notification preferences (medication, appointments, etc.)
5. **notification_preferences** — Channel × category matrix (push, email, SMS, LINE)
6. **user_api_connections** — Multi-API connection manager (HIS, wearables, pharmacy, LINE Notify)
7. **api_connection_audit** — Audit trail for API connection events
8. **sync_queue** — Offline-first sync queue for mobile app
9. **user_settings** — App settings (theme, language, biometric, accessibility)

#### Phase 2.1 AI-HIS Tables (v2.1.0-phase2-ai-his.sql)
Added 7 new tables for AI-powered Health Information System:

1. **ctm_assessments** — Thai Traditional Medicine (CTM) assessments (dhatu, herbal prescriptions)
2. **geriatric_screenings** — Comprehensive elderly screening battery (risk scores, recommendations)
3. **sos_alerts** — Emergency SOS alerts with geolocation (latitude, longitude)
4. **follow_ups** — Follow-up tracking system (appointment-linked, status workflow)
5. **nursing_tasks** — Nursing dashboard task management (priority, due dates)
6. **predictive_analytics** — AI-driven predictive analytics (risk scores, model versioning)
7. **emr_records** — Extended EMR records (complementary to existing emr table)

**Total Tables:** 40 (Phase 1: 25 + Phase 2: 8 + Phase 2.1: 7)

---

### 🔐 Security Enhancements

#### Webhook Security
- **HMAC-SHA256 Validation**
  - LINE: `X-Line-Signature` header validation with `LINE_CHANNEL_SECRET`
  - WhatsApp: `X-Hub-Signature-256` header validation with `WHATSAPP_APP_SECRET`
  - Telegram: Bot token validation in webhook URL
  - All invalid signatures rejected with `401 Unauthorized`

#### Data Encryption
- **AES-256-GCM** for payload encryption between OpenClaw MCP and GCS
- Encryption key stored in GCP Secret Manager
- PHI encrypted at rest in GCS buckets

#### PDPA Compliance
- Explicit consent workflow before any PHI processing
- Consent record stored in GCS: `consent/{patientId}.json`
- Consent revocation triggers full MCP session deletion
- Audit logging for all PHI access events

---

### 🌐 Environment Variables Added

```bash
# OpenClaw MCP Server
OPENCLAW_MCP_PORT=3016
OPENCLAW_MCP_ENCRYPTION_KEY=<32-byte hex>
OPENCLAW_MCP_INTERNAL_SECRET=<random 64-char>

# Omnichannel Webhook Server
OMNICHANNEL_WEBHOOK_PORT=3015

# LINE Messaging API
LINE_CHANNEL_SECRET=<from LINE Developers Console>
LINE_CHANNEL_ACCESS_TOKEN=<from LINE Developers Console>

# WhatsApp Cloud API (Meta)
WHATSAPP_APP_SECRET=<from Meta Developer Console>
WHATSAPP_ACCESS_TOKEN=<from Meta Developer Console>
WHATSAPP_PHONE_NUMBER_ID=<from Meta Developer Console>
WHATSAPP_VERIFY_TOKEN=<random string>

# Telegram Bot API
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CARE_TEAM_CHAT_ID=<negative group chat ID>
```

---

### 📈 Workflow Changes

#### Omnichannel Message Processing State Machine

```
RECEIVED 
  → SIGNATURE_VALIDATED 
    → CONSENT_CHECKED 
      → NORMALISED 
        → MCP_INGESTED 
          → GCS_WRITTEN 
            → UI_NOTIFIED
```

**Rejection Paths:**
- Invalid signature → `401 Unauthorized`
- No consent → Send consent link, halt processing
- Parsing error → `400 Bad Request`

#### MCP Session Lifecycle

| Event | MCP Action |
|-------|------------|
| Patient first message (post-consent) | `createSession(patientId, channel)` |
| Each subsequent message | `updateContext(sessionId, entities)` |
| Doctor requests context | `getContext(patientId)` → full snapshot |
| Appointment completed | `archiveSession(patientId)` → move to GCS long-term store |
| Patient revokes consent | `deleteSession(patientId)` → purge all context |

---

### 🎨 New Diagrams

| Diagram | File | Description |
|---------|------|-------------|
| **13 — Omnichannel Workflow** | `13-omnichannel-workflow.mmd` | Patient (LINE/WhatsApp/Telegram) → Webhook Server → MCP → Doctor Portal |
| **14 — MCP Session Lifecycle** | `14-mcp-session-lifecycle.mmd` | Sequence diagram showing 5 Doctor AI Tasks and session management |

Updated diagrams:
- **01 — System Architecture** updated to include Omnichannel Webhook Server and OpenClaw MCP Server

---

### 📦 New Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| **Omnichannel Webhook Server** | 3015 | Node.js (CJS) | LINE/WhatsApp/Telegram webhook ingestion, validation, normalization |
| **OpenClaw MCP Server** | 3016 | Node.js (CJS) | MCP protocol handler, session context, NLP, AI task routing |

---

### 🧪 Testing Updates

No changes to test suite in this release. All 1,119 tests (311 unit + 808 E2E) remain passing.

**Test Coverage:**
- ✅ Unit Tests: 311 tests (Vitest)
- ✅ E2E Tests: 808 tests (Playwright)
- ✅ Total: 1,119 tests across 5 Playwright projects

---

### 🔄 Migration Guide

#### For Developers

1. **Update `.env.docker`** with new environment variables (see above)
2. **Run database migrations:**
   ```bash
   cd scripts/database/migrations
   psql -h localhost -p 5433 -U postgres -d izara_db -f v2.0.0-phase2-tables.sql
   psql -h localhost -p 5433 -U postgres -d izara_db -f v2.1.0-phase2-ai-his.sql
   ```
3. **Install new dependencies:**
   ```bash
   cd Isara-doctor-portal
   npm install @line/bot-sdk node-telegram-bot-api
   ```
4. **Register webhooks** in LINE/WhatsApp/Telegram consoles (see `docs/5_DEVELOPER_HANDOFF_PLAN.md`)

#### For Operators

- No downtime required (new services are optional)
- Existing services continue to function independently
- Omnichannel features activate only after webhook registration

---

### 📚 Documentation Updates

- **DBML Schema**: Updated to `izara-complete-schema-v5.dbml` (v5.1)
- **README.md**: Added "What's New" section
- **TECHNICAL_DOCUMENTATION.md**: Added section 9 (Omnichannel & MCP Integration)
- **CHANGELOG.md**: This file (new)

---

## [v1.5.0] — 2026-02-22

### Phase 1 Complete
- All core features implemented
- 1,119 tests passing (311 unit + 808 E2E)
- Mobile app architecture established
- Security hardening complete

---

## [v1.4.8] — 2026-02-15

### Features
- Unified CLI (`izara-cli.ps1`)
- Phase 2 mobile app structure
- Cloud SQL migrations

---

## [v1.4.0] — 2026-02-01

### Features
- AI-powered health assistant (Gemini 2.5 Flash)
- Clinical decision support (CDS)
- Prescription workflow with drug interaction checking

---

## [v1.3.0] — 2026-01-15

### Features
- Video consultation with Jitsi Meet
- Real-time transcription (Speech-to-Text)
- AI-generated SOAP notes

---

## [v1.2.0] — 2025-12-20

### Features
- Doctor approval workflow
- EMR with SOAP note structure
- Lab order management

---

## [v1.1.0] — 2025-12-01

### Features
- Patient portal (appointment booking, PHR)
- Doctor portal (schedule, patient queue)
- Appointment workflow

---

## [v1.0.0] — 2025-11-15

### Initial Release
- Authentication system (JWT, bcrypt, Google OAuth)
- PostgreSQL 18 database with pgvector
- Docker Compose orchestration
- Basic React frontends (Patient + Doctor portals)

---

### Legend

- 🎉 Major Feature
- 🐛 Bug Fix
- 🔧 Maintenance
- 🔐 Security
- 📊 Database
- 🌐 API
- 🎨 UI/UX
- 📚 Documentation
- 🧪 Testing
- 🔄 Migration

---

**End of Changelog**
