# Isara-Anywhere — Pages and Features

## 1. Healthcare Team Monitoring Dashboard (New)

### Omnichannel Message Monitor
- Real-time feed of incoming patient messages across all channels
- Channel indicators (LINE, WhatsApp, Telegram, Messages icons)
- Message status indicators (pending, processing, responded, escalated)
- Filter by channel, patient, status, date range

### Patient Context Panel
- Current patient summary pulled from MCP context
- Active medications, allergies, conditions
- Recent vital signs and lab results
- Conversation history across channels

### Clinical Task Queue
- Pending investigation requests (Task 3)
- Prescription drafts awaiting approval (Task 4)
- Referral documents in progress (Task 5)
- Priority sorting and assignment

## 2. Consent Management UI

### Patient Onboarding Flow
- PDPA consent form display
- Multi-language support (Thai, English)
- Digital signature capture
- Consent status tracking

## 3. API Group Features

### Webhook Endpoints
- `POST /api/webhooks/line` — LINE message webhook
- `POST /api/webhooks/whatsapp` — WhatsApp message webhook
- `POST /api/webhooks/telegram` — Telegram message webhook
- `GET /api/webhooks/line` — LINE webhook verification
- `GET /api/webhooks/whatsapp` — WhatsApp webhook verification

### MCP Integration Endpoints
- `POST /api/mcp/chat` — Send message to MCP for processing
- `GET /api/mcp/context/:patientId` — Get patient context
- `POST /api/mcp/task` — Execute clinical task
- `GET /api/mcp/health` — MCP service health check

### Omnichannel Endpoints
- `GET /api/omnichannel/channels` — List available channels
- `GET /api/omnichannel/conversations/:patientId` — Get patient conversations
- `POST /api/omnichannel/send` — Send message to patient channel
- `GET /api/omnichannel/status` — Channel connection status

## 4. Error Pages and Status Handling

| Status Code | Page/Response | Description |
|-------------|---------------|-------------|
| 400 | Bad Request | Invalid webhook payload or missing fields |
| 401 | Unauthorized | Invalid or expired authentication token |
| 403 | Forbidden | Insufficient RBAC permissions |
| 404 | Not Found | Unknown endpoint or resource |
| 408 | Request Timeout | MCP or external service timeout |
| 422 | Unprocessable | Valid format but semantic errors |
| 429 | Rate Limited | Too many requests from same source |
| 500 | Internal Error | Unexpected server failure |
| 502 | Bad Gateway | MCP or Google Services unreachable |
| 503 | Service Unavailable | Service temporarily down |
| 504 | Gateway Timeout | Upstream service timeout |
