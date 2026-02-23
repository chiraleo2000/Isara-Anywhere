# Isara-Anywhere — Developer Handoff Plan

## 1. Implementation Phases

### Phase 1: Core MCP Integration (Current)
- OpenClaw MCP service module
- Message router and channel normalization
- Webhook gateway with signature validation
- Comprehensive unit tests

### Phase 2: Omnichannel Webhooks
- LINE webhook handler with signature verification
- WhatsApp webhook handler with token verification
- Telegram bot webhook handler
- Messages integration

### Phase 3: Clinical Task Implementation
- Tasks 1–5 workflow handlers via MCP
- Google Services backend integration
- Real-time data synchronization

### Phase 4: UI Components
- Healthcare team monitoring dashboard
- Consent management UI
- RBAC-protected views

## 2. Environment Variables Required

```env
# OpenClaw MCP Configuration
OPENCLAW_MCP_URL=http://localhost:3030
OPENCLAW_API_KEY=<your-openclaw-api-key>
OPENCLAW_MODEL=openclaw-medical-v1

# LINE Channel Configuration
LINE_CHANNEL_ACCESS_TOKEN=<your-line-token>
LINE_CHANNEL_SECRET=<your-line-secret>

# WhatsApp Business API
WHATSAPP_API_TOKEN=<your-whatsapp-token>
WHATSAPP_VERIFY_TOKEN=<your-verify-token>
WHATSAPP_PHONE_NUMBER_ID=<your-phone-id>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>

# Security
WEBHOOK_ENCRYPTION_KEY=<32-byte-hex-key>
JWT_SECRET=<your-jwt-secret>
```

## 3. Directory Structure (New Modules)

```
services/
  mcp/
    mcpClient.ts          — OpenClaw MCP client
    mcpContextManager.ts  — Patient context state management
    mcpTaskRouter.ts      — Clinical task routing (Tasks 1–5)
  omnichannel/
    webhookGateway.ts     — Unified webhook entry point
    messageRouter.ts      — Channel detection and routing
    channelAdapters/
      lineAdapter.ts      — LINE message parsing and sending
      whatsappAdapter.ts  — WhatsApp message parsing and sending
      telegramAdapter.ts  — Telegram message parsing and sending
  security/
    webhookValidator.ts   — Webhook signature validation
    consentManager.ts     — PDPA consent workflows
    rbacGuard.ts          — Role-based access control
```

## 4. Testing Strategy

- All services use pure function patterns for testability
- Tests validate: happy path, error cases, edge cases, all HTTP status codes
- Coverage targets: ≥ 90% for all new modules
- Security tests: webhook signature validation, RBAC enforcement, input sanitization
