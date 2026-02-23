# 2. System Architecture

## 2.1 High-Level Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PATIENT CHANNELS                                │
│  LINE Official Account  │  WhatsApp Business  │  Telegram  │  SMS/iMsg │
└────────────┬───────────────────────┬──────────────────┬────────────────┘
             │  Webhooks (HTTPS)     │                  │
             ▼                       ▼                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│           OMNICHANNEL WEBHOOK SERVER  (port 3015)                      │
│  • HMAC-SHA256 signature validation per platform                       │
│  • Consent gate (checks GCS consent record)                            │
│  • Message normaliser → canonical OmnichannelMessage schema            │
│  • Routes to OpenClaw MCP Server via internal REST                     │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
             ┌──────────────────▼──────────────────┐
             │   OPENCLAW MCP SERVER  (port 3016)   │
             │  • MCP protocol handler               │
             │  • Stateful session context store     │
             │  • NLP → structured medical data      │
             │  • Doctor AI Task router (Tasks 1–5)  │
             │  • Calls Google AI (Gemini) API       │
             └──────┬─────────────────────┬──────────┘
                    │                     │
          ┌─────────▼──────┐   ┌──────────▼──────────┐
          │  GOOGLE CLOUD  │   │  MAIN API SERVER     │
          │  SERVICES (GCS)│   │  (port 3009)         │
          │  • Patient data│   │  • EMR / Prescription│
          │  • Doctor data │   │  • Lab orders        │
          │  • Appointments│   │  • Queue / Appts     │
          │  • Metadata    │   │  • WebSocket events  │
          └────────────────┘   └─────────────────────-┘
                                        │
                              ┌─────────▼──────────────┐
                              │  DOCTOR PORTAL UI       │
                              │  (port 3010 — React)   │
                              │  • OmnichannelMonitor  │
                              │  • EMR, Prescriptions  │
                              │  • AI Copilot          │
                              └────────────────────────┘
```

---

## 2.2 Service Inventory

| Service | Port | Language | Responsibility |
|---|---|---|---|
| GCS API Server | 3012 | Node.js CJS | Read/write Google Cloud Storage buckets |
| Auth Server | 3011 | Node.js CJS | JWT issuance, OAuth 2.0, session management |
| Main API Server | 3009 | Node.js CJS | Clinical EMR, prescriptions, appointments, sockets |
| **Omnichannel Webhook Server** | **3015** | **Node.js CJS** | **LINE/WhatsApp/Telegram ingestion** |
| **OpenClaw MCP Server** | **3016** | **Node.js CJS** | **MCP context, NLP, AI task routing** |
| Doctor Portal UI | 3010 | React/TypeScript | Frontend web app |

> **Bold rows** are new services introduced by this upgrade.

---

## 2.3 Technology Stack

### Existing (Maintained)
- **Runtime:** Node.js 20 LTS
- **Frontend:** React 18, TypeScript, Vite 7, Tailwind CSS
- **AI:** Google Gemini (`gemini-2.5-flash-lite`) via `@google/generative-ai`
- **Storage:** Google Cloud Storage (5 buckets), PostgreSQL
- **Auth:** JWT (`jsonwebtoken`), bcrypt, Google OAuth 2.0
- **Realtime:** Socket.io 4

### New Additions
- **MCP Protocol:** OpenClaw (HTTP/SSE-based Model Context Protocol server)
- **Omnichannel SDKs:**
  - LINE: `@line/bot-sdk` for webhook & messaging
  - WhatsApp: Meta Cloud API (webhook + send-message REST calls)
  - Telegram: `node-telegram-bot-api` for bot integration
- **Crypto:** Node.js built-in `crypto` (HMAC-SHA256 for webhook validation, AES-256-GCM for payload encryption)
- **Consent Store:** GCS `izara-users-credentials` bucket (new `consent/` folder)

---

## 2.4 Data Flow — Patient Sends Symptom Message

```
Patient (LINE)
    │ POST /webhook/line  (signed)
    ▼
Omnichannel Webhook Server
    ├─ validateSignature()     → reject if invalid
    ├─ checkConsent(userId)    → prompt consent if none
    ├─ normaliseMessage()      → OmnichannelMessage{}
    └─ POST /mcp/ingest  ──────────────────────────────┐
                                                       ▼
                                          OpenClaw MCP Server
                                              ├─ resolveSession(patientId)
                                              ├─ extractMedicalEntities() → Gemini
                                              ├─ updateMCPContext()
                                              ├─ persistToGCS(patient bucket)
                                              └─ emit socket event → Doctor Portal UI
```

---

## 2.5 External APIs & Credentials

| API | Purpose | Secret Key Name |
|---|---|---|
| LINE Messaging API | Receive/send patient messages | `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` |
| Meta WhatsApp Cloud API | Receive/send patient messages | `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| Telegram Bot API | Secure care-team groups | `TELEGRAM_BOT_TOKEN` |
| Google Gemini API | NLP & clinical AI reasoning | `GEMINI_API_KEY` (existing) |
| Google Cloud Storage | Patient data persistence | `GOOGLE_APPLICATION_CREDENTIALS` (existing) |

---

## 2.6 Security Architecture

| Control | Implementation |
|---|---|
| Webhook authenticity | HMAC-SHA256 per-platform signature validation on every inbound request |
| PHI encryption in transit | TLS 1.3 enforced; internal service calls over localhost only |
| PHI encryption at rest | AES-256-GCM applied before writing to GCS; key stored in GCP Secret Manager |
| RBAC | JWT claims carry `role`; middleware enforces per-route permission |
| Consent lifecycle | Explicit opt-in stored in GCS before any PHI is processed; opt-out deletes session context |
| Audit logging | All PHI access events written to `izara-users-credentials/audit/` |
| PDPA compliance | Consent timestamp, scope, and version recorded; data retention limited to 5 years |
