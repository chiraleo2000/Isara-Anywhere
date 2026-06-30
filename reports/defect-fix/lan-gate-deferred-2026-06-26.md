# P4 Ubuntu LAN — SKIPPED (2026-06-26) → **DEPLOYED** (2026-06-30)

## Status: **DEPLOYED** on `192.168.10.239`

LAN HTTPS (`*.demotoday.net`) + self-hosted Jitsi (`meet.demotoday.net`) are live. Sign-off: [round6-local-lan-signoff-2026-06-30.md](../signoff/round6-local-lan-signoff-2026-06-30.md). Video guide (TH): [LAN_VIDEO_CLIENT_TH.md](../../Documents/docs/markdown/operations/LAN_VIDEO_CLIENT_TH.md).

**Original skip (2026-06-26):** Full Gate Release close-out approved skipping P4 — host was unreachable (100% ping loss). Re-run when Ubuntu host `192.168.10.239` is on subnet.

## Prior environment blockers (for reference)

| Check | Result |
|-------|--------|
| Ping `192.168.10.239` (2026-06-26T10:23Z close-out) | **TIMEOUT** — 2/2 packets lost (100%) |
| Ping `192.168.10.239` (2026-06-26T09:02Z final session) | **TIMEOUT** — 3/3 packets lost (100%) |
| Ping `192.168.10.239` (2026-06-26T06:37Z retry) | **TIMEOUT** — 3/3 packets lost (100%) |
| Ping `192.168.10.239` (2026-06-26T06:15Z retry) | **TIMEOUT** — 100% packet loss |
| SSH | Not attempted (host unreachable) |
| `test:lan:deploy-gate` | Not run — requires LAN URLs |

## Prerequisites (when on subnet)

1. Ubuntu server: copy `deploy/nginx/lan.https.example` → `.env.docker`, set `POSTGRES_DATA_DIR`
2. `bash deploy/nginx/deploy.sh` → `verify-stack` + `diagnose` PASS
3. Windows: `deploy/nginx/windows-update-hosts.ps1` + mkcert per `WINDOWS_CLIENT_SETUP.md`
4. API: `cross-env MEETING_URL=https://meeting.demotoday.net DOCTOR_URL=https://doctor.demotoday.net npm run docker:meeting-api-smoke`
5. E2E: `npm run test:lan:deploy-gate` (Q+R+B headed, `TEST_ENV=lan`, `BASELINE_VISUAL=1`)

## W8 manual

Second-device login on subnet — checklist item in `Processes/FULL_WORKFLOW_HARDENING_COMPLETION_REPORT.md`.
