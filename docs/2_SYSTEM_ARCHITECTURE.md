# Isara-Anywhere — System Architecture

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Omnichannel Layer                       │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │  LINE  │ │ WhatsApp │ │ Telegram │ │   Messages     │ │
│  └───┬────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘ │
│      └───────────┼────────────┼───────────────┘           │
│                  ▼                                         │
│         ┌─────────────────┐                               │
│         │ Webhook Gateway │  (signature validation)       │
│         └────────┬────────┘                               │
│                  ▼                                         │
│  ┌──────────────────────────────┐                         │
│  │     Message Router           │                         │
│  │  (channel detection + RBAC)  │                         │
│  └──────────┬───────────────────┘                         │
│             ▼                                              │
│  ┌──────────────────────────────┐                         │
│  │     OpenClaw MCP Server      │                         │
│  │  (context + AI reasoning)    │                         │
│  └──────────┬───────────────────┘                         │
│             ▼                                              │
│  ┌──────────────────────────────┐                         │
│  │   Google Services Backend    │                         │
│  │  (PostgreSQL, GCS, Gemini)   │                         │
│  └──────────────────────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

## 2. Dual Backend Architecture

### OpenClaw MCP Server
- Handles contextual AI reasoning
- Manages conversation state (MCP protocol)
- Routes clinical task workflows (Tasks 1–5)

### Google Services Backend (Existing)
- PostgreSQL database for structured data
- GCS for file storage
- Gemini AI for clinical assistance
- Authentication and authorization

## 3. Service Communication

| Source | Target | Protocol | Encryption |
|--------|--------|----------|------------|
| Webhook Gateway | Message Router | Internal HTTP | TLS 1.3 |
| Message Router | OpenClaw MCP | MCP Protocol | TLS 1.3 |
| OpenClaw MCP | Google Services | REST API | TLS 1.3 |
| OpenClaw MCP | PostgreSQL | TCP/SSL | SSL |

## 4. Data Flow

1. Patient sends message via social chat app
2. Platform webhook delivers message to Webhook Gateway
3. Gateway validates signature and forwards to Message Router
4. Router identifies channel, checks RBAC, routes to MCP
5. OpenClaw MCP processes with context, calls Google Services as needed
6. Response sent back through the same channel to patient

## 5. Port Allocation

| Service | Port | Description |
|---------|------|-------------|
| Patient Portal | 3005 | Existing patient frontend + backend |
| Doctor Portal | 3010 | Existing doctor frontend + backend |
| Meeting Server | 3020 | Jitsi meeting + transcription |
| MCP Gateway | 3030 | OpenClaw MCP service |
| Webhook Gateway | 3040 | Omnichannel webhook handlers |
