# 5. Developer Handoff Plan

## Phase 0 — Environment Setup

### New environment variables (add to `.env` and `.env.docker.template`)

```
# OpenClaw MCP Server
OPENCLAW_MCP_PORT=3016
OPENCLAW_MCP_ENCRYPTION_KEY=<32-byte hex — generate with: openssl rand -hex 32>
OPENCLAW_MCP_INTERNAL_SECRET=<random 64-char string>

# Omnichannel Webhook Server
OMNICHANNEL_WEBHOOK_PORT=3015

# LINE Messaging API
LINE_CHANNEL_SECRET=<from LINE Developers Console>
LINE_CHANNEL_ACCESS_TOKEN=<from LINE Developers Console>

# WhatsApp Cloud API (Meta)
WHATSAPP_APP_SECRET=<from Meta Developer Console>
WHATSAPP_ACCESS_TOKEN=<from Meta Developer Console>
WHATSAPP_PHONE_NUMBER_ID=<from Meta Developer Console>
WHATSAPP_VERIFY_TOKEN=<random string you define for webhook verification>

# Telegram
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CARE_TEAM_CHAT_ID=<negative group chat ID>
```

---

## Phase 1 — Backend: OpenClaw MCP Server

**File:** `Isara-doctor-portal/server/openclaw-mcp-server.cjs`

### Responsibilities
1. Expose MCP HTTP endpoints:
   - `POST /mcp/ingest` — receive normalised OmnichannelMessage, extract entities via Gemini, update session context
   - `GET /mcp/context/:patientId` — return full session context snapshot
   - `DELETE /mcp/context/:patientId` — delete session on consent revocation
   - `POST /mcp/team-brief/:patientId` — generate and dispatch Telegram team brief
   - `POST /mcp/referral/:patientId` — generate referral document
2. Maintain an in-memory session store (Map) with GCS persistence on each write
3. Call Gemini API for entity extraction and document generation
4. Emit Socket.io events to Main API Server on context updates

### Key Implementation Steps
```
1. npm install @line/bot-sdk node-telegram-bot-api  (inside Isara-doctor-portal/)
2. Create server/openclaw-mcp-server.cjs
3. Add to server/startAll.cjs servers[] array (port 3016)
```

---

## Phase 2 — Backend: Omnichannel Webhook Server

**File:** `Isara-doctor-portal/server/omnichannel-webhook-server.cjs`

### Responsibilities
1. LINE webhook: `POST /webhook/line` — validate X-Line-Signature, normalise, forward to MCP
2. WhatsApp webhook: `GET /webhook/whatsapp` (verify) + `POST /webhook/whatsapp` (messages)
3. Telegram updates: polling or webhook `POST /webhook/telegram`
4. Consent gate: check GCS consent record; if absent, send consent link then halt processing
5. Reply dispatch: `POST /api/omnichannel/reply` — route message to correct channel SDK

### Key Implementation Steps
```
1. Create server/omnichannel-webhook-server.cjs
2. Add to server/startAll.cjs servers[] array (port 3015)
3. Register webhook URLs in LINE / Meta / Telegram consoles
```

---

## Phase 3 — Frontend Services

### `src/services/mcpContextService.ts`
- `getPatientContext(patientId)` → `GET /mcp/context/:id` via internal proxy
- `requestTeamBrief(patientId, question)` → `POST /mcp/team-brief/:id`
- `generateReferral(patientId, facility)` → `POST /mcp/referral/:id`
- `revokeConsent(patientId)` → `DELETE /mcp/context/:id` + `DELETE /api/consent/:id`

### `src/services/omnichannelService.ts`
- `getMessages(filters)` → `GET /api/omnichannel/messages`
- `getSessions()` → `GET /api/omnichannel/sessions`
- `replyToPatient(patientId, channel, text)` → `POST /api/omnichannel/reply`
- `subscribeToEvents(callback)` → Socket.io listener for `omnichannel:message` events

---

## Phase 4 — Frontend UI

### `src/components/OmnichannelMonitor.tsx`
Full monitoring panel (see doc 4). Key implementation notes:
- Use `useEffect` + socket.io-client to subscribe to live events
- Virtualise the message feed (`react-window`) for performance
- PatientContextPanel fetches MCP context on row selection
- AIActionPanel renders approve/reject for each pending AI suggestion

### `src/pages/OmnichannelMonitorPage.tsx`
Thin wrapper providing page title, breadcrumb, and RBAC guard.

---

## Phase 5 — Configuration & Startup Updates

### `src/services/config.ts`
Add `omnichannel` and `mcp` sections to the exported `config` object.

### `server/startAll.cjs`
Add two new server entries:
```js
{ name: 'Omnichannel Webhook Server', script: 'omnichannel-webhook-server.cjs', port: 3015 }
{ name: 'OpenClaw MCP Server',        script: 'openclaw-mcp-server.cjs',        port: 3016 }
```

---

## Phase 6 — Security Validation

- Run `npm run lint` inside `Isara-doctor-portal/` — zero new warnings
- Verify HMAC test cases in `tests/unit/doctor-portal/`
- Confirm consent lifecycle with Playwright spec `tests/e2e/specs/`

---

## Success Metrics

| Metric | Target |
|---|---|
| All 5 Doctor AI tasks routed via MCP | 100 % coverage |
| Webhook signature validation | Reject rate = 100 % for invalid sigs |
| PDPA consent stored before any PHI | 0 PHI writes without consent record |
| OmnichannelMonitor renders in < 2 s | Lighthouse performance ≥ 85 |
| No new ESLint errors | 0 new lint warnings |
