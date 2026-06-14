# Cloud Run Environment Audit — login-03 (2026-06-14)

## Services audited

| Service | Region | Revision (deploy) |
|---------|--------|-------------------|
| izara-patient-portal-dev-testing | asia-southeast1 | 00123-zlm |
| izara-doctor-portal-dev-testing | asia-southeast1 | 00155-6k5 |
| izara-meeting-server-dev-testing | asia-southeast1 | (live) |

## Parity checks

| Variable | Patient | Doctor | Meeting | Status |
|----------|---------|--------|---------|--------|
| DB_HOST | 35.240.157.230 | 35.240.157.230 | 35.240.157.230 | PASS |
| DB_NAME | izara_phase1 | izara_phase1 | izara_phase1 | PASS |
| DB_USER | postgres | postgres | postgres | PASS |
| USE_POSTGRESQL | true | true | true | PASS |
| MEETING_SERVER_URL | dev-testing URL | dev-testing URL | N/A (self) | PASS |
| GEMINI_API_KEY | secret:gemini-api-key | secret:gemini-api-key | secret:gemini-api-key | PASS |
| GOOGLE_SPEECH_API_KEY | secret | secret | secret | PASS |
| CORS_ORIGINS | (portal CORS via Cloud Run ingress) | — | patient+doctor portal URLs | PASS |
| JWT_SECRET | secret (recording crypto legacy) | secret | secret | MONITORED — not used for API session auth |

## Session auth note

- API login uses opaque `sessions.token` (Bearer header), validated by portal + meeting server `sessionAuth.js`.
- Cloud gate0 G1–G5 PASS; cloud E2E 85/85 PASS — no 401 login loops observed.
- `JWT_SECRET` remains in Cloud Run for legacy recording encryption paths only; Jitsi iframe mount omits `jwt` on `meet.jit.si`.

## Result

**login-03 PASS** — DB/CORS/MEETING_SERVER/Gemini parity confirmed on dev-testing Cloud Run stack.
