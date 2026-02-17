# Isara-Anywhere v1.4.9 — Release Notes

**Release Date:** 2026-02-17  
**Test Results:** 1373 passed, 0 failed, 109 skipped (full Playwright e2e suite)

---

## Bug Fixes

### Patient Portal
- **Device Tokens Endpoint**: Fixed POST `/api/device-tokens` to accept both `token` and `deviceToken` field names, plus `deviceInfo` object for browser/OS metadata
- **Rate Limiting**: Increased production rate limit from 200 req/min to 2000 req/min (configurable via `RATE_LIMIT_MAX` env var) to prevent 429 errors during high-throughput testing
- **Meeting Fallback**: GET `/api/video-meeting/:appointmentId` now falls back to querying the Jitsi meeting server when a meeting isn't found locally (DB or in-memory)
- **Password Reset**: Fixed `ON CONFLICT (user_id)` error by ensuring `password_resets.user_id` has a UNIQUE constraint
- **socket.io-client**: Added missing `socket.io-client` dependency (was dynamically imported but not in package.json, causing Vite build failure)

### Doctor Portal
- **Rate Limiting**: Increased production rate limit from hardcoded 200 req/min to 2000 req/min (configurable via `RATE_LIMIT_MAX` env var)

### Meeting Server (Jitsi)
- **Duplicate Variable**: Fixed `SyntaxError: Identifier 'isProduction' has already been declared` that crashed the container on startup
- **Meeting List API**: GET `/api/meetings` now merges in-memory meetings (from FK-skipped inserts) with database records, ensuring meetings created with temporary appointment IDs are still retrievable

## Configuration
- Both portals now support `RATE_LIMIT_MAX` environment variable to override default rate limits
- Default: 2000/min in production, 10000/min in development

## Files Changed
- `Isara-patient-portal/package.json` — Added socket.io-client, version bump
- `Isara-patient-portal/server/index.ts` — Rate limit env var support
- `Isara-patient-portal/server/routes/device-tokens.ts` — Accept both token field names
- `Isara-patient-portal/server/routes/video-meeting.ts` — Meeting server fallback
- `Isara-doctor-portal/server/gcsApiServer.cjs` — Rate limit env var support
- `Izara-jitsi-server/server/index.js` — Fixed duplicate const, merged in-memory meetings
- `docker-compose.yml` — No changes (env vars are additive)
