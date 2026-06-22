# Izara Jitsi Meeting Server — Architecture

## Layout

```
Izara-jitsi-server/
├── backend/     # Express ESM API (port 3020)
└── tests/       # Contract and integration tests (*.test.mjs)
```

## Backend

- Entry: `backend/index.js`
- Routes: `backend/routes/` (meetings, lobby, webhooks)
- Post-meeting pipeline: `backend/services/postMeetingPipeline.js`

## No frontend

This package is API-only. Portals embed Jitsi via `meet.jit.si` iframe.

## Docker

- `Dockerfile` — single Node service on 3020
