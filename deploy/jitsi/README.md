# Self-hosted Jitsi for Izara Telemedicine

Izara-jitsi-server is the **meeting orchestration API** (lobby, post-meeting, EMR). Video/WebRTC runs on **docker-jitsi-meet** (Prosody, Jicofo, JVB, coturn).

## Local dev (Windows / Docker Desktop)

1. Vendor stack (once):

   ```powershell
   git clone --depth 1 --branch stable-9646 https://github.com/jitsi/docker-jitsi-meet.git deploy/jitsi/docker-jitsi-meet
   ```

2. Generate Jitsi `.env` and sync JWT secrets:

   ```powershell
   node scripts/jitsi/setup-local-jitsi.mjs --sync-docker-env
   ```

3. Add hosts entry: `127.0.0.1 meet.localhost`

4. Start Izara + Jitsi:

   ```powershell
   docker compose --env-file .env.docker --profile full --profile jitsi up -d --build
   ```

5. Verify: `curl -k https://meet.localhost:8443/about/health`

## JWT integration

| Variable | Purpose |
|----------|---------|
| `JITSI_DOMAIN` | Portal + meeting-server video domain (`meet.localhost` or `meet.demotoday.net`) |
| `JITSI_APP_ID` | JWT `iss` claim — must match Prosody `JWT_APP_ID` |
| `JITSI_JWT_SECRET` | HS256 secret — must match Prosody `JWT_APP_SECRET` |

When `JITSI_DOMAIN` is not `meet.jit.si`, meeting-server sets `JITSI_TOKEN_AUTH_ENABLED=true` and issues doctor moderator JWTs via `createJitsiRoleJwt()`.

**Izara lobby** remains the admission gate; Jitsi `enableLobby` stays `false`.

## Optional Jibri (recording webhook)

Jibri is **not** required for local gate PASS. Browser `MediaRecorder` → `save-recording` is the primary path.

To validate `POST /api/webhooks/jibri-recording`:

```powershell
# Requires extra RAM/CPU; profile optional
docker compose --env-file .env.docker --profile jitsi --profile jibri up -d
```

Set `JIBRI_WEBHOOK_SECRET` in meeting-server `.env.docker` to match Jibri finalization hook. Gate tests: `meeting-server/jibriWebhook.test.ts`.

## Ubuntu LAN

Use `meet.demotoday.net` as `PUBLIC_URL` and `JITSI_DOMAIN`. Nginx TLS terminates at `deploy/nginx/` → Jitsi web `:8443`. Open UDP 10000–20000 for JVB.

See `Processes/VIDEO_MEETING_JITSI_GEMINI.md` Appendix A.

## Optional Jibri (server-side recording)

**Skipped for local signoff (jl-09):** Jibri adds ~2 GB RAM and X11 deps. Izara uses browser `MediaRecorder` → `save-recording` for local/dev. Webhook path is covered by `jibriWebhook.test.ts` + meeting-server contract WH-01..05.

To enable later: add `jibri` service to `deploy/jitsi/docker-compose.jitsi.yml`, set `JIBRI_WEBHOOK_SECRET`, point webhook to meeting-server `/api/webhooks/jibri-recording`.
