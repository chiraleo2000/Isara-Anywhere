# Jitsi meeting on Ubuntu LAN (`*.demotoday.net`) — architecture & API

> **Audience:** developers integrating video visits on the Ubuntu + Nginx LAN stack  
> **Related:** [deploy/nginx/DEPLOYMENT.md](../../../../deploy/nginx/DEPLOYMENT.md) · [deploy/jitsi/README.md](../../../../deploy/jitsi/README.md) · [Processes/VIDEO_MEETING_JITSI_GEMINI.md](../../../../Processes/VIDEO_MEETING_JITSI_GEMINI.md) · [meeting-api-smoke](../../../../scripts/docker/meeting-api-smoke.mjs)

---

## Two servers (do not confuse them)

| URL | Role |
|-----|------|
| **`https://meeting.demotoday.net`** | Izara **Meeting Server** — REST API + Socket.IO (lobby, join-config, recording, AI) |
| **`https://meet.demotoday.net`** | **Jitsi video** — WebRTC only (docker-jitsi-meet), proxied by Nginx → `:8000` |

You **cannot** start a telehealth session by POSTing to `meet.demotoday.net`.  
Call **`meeting.demotoday.net`**, obtain `join-config`, then embed Jitsi in the browser via `JitsiMeetExternalAPI`.

```text
Client (portal or custom app)
    │
    ├─ REST/Socket.IO ──► meeting.demotoday.net  (orchestration)
    │
    └─ JitsiMeetExternalAPI + WebRTC ──► meet.demotoday.net  (video/audio)
```

---

## Deploy on Ubuntu (one-time)

```bash
cd ~/Isara-Anywhere
cp .env.docker.lan.https.example .env.docker
nano .env.docker   # secrets, API keys

# Vendor Jitsi (once)
git clone --depth 1 --branch stable-9646 \
  https://github.com/jitsi/docker-jitsi-meet.git deploy/jitsi/docker-jitsi-meet

# Full deploy: Docker + Jitsi + Nginx + mkcert TLS
bash deploy/nginx/redeploy-demotoday.sh
# or: bash deploy/nginx/deploy.sh
```

**Firewall (video requires UDP):**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000:20000/udp
```

**Windows clients:** add hosts entry pointing `*.demotoday.net` to the Ubuntu LAN IP.  
See [deploy/nginx/WINDOWS_CLIENT_SETUP.md](../../../../deploy/nginx/WINDOWS_CLIENT_SETUP.md).

### Service URLs

| Service | URL |
|---------|-----|
| Patient portal | https://patient.demotoday.net/login |
| Doctor portal | https://doctor.demotoday.net/login |
| Meeting API | https://meeting.demotoday.net |
| Jitsi web / External API | https://meet.demotoday.net |
| Meeting health | https://meeting.demotoday.net/health |
| Jitsi health | https://meet.demotoday.net/about/health |

### Key environment variables (`.env.docker`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `JITSI_DOMAIN` | `meet.demotoday.net` | Video domain for portals + meeting-server |
| `VITE_JITSI_DOMAIN` | `meet.demotoday.net` | Browser build-time domain |
| `VITE_MEETING_SERVER_URL` | `https://meeting.demotoday.net` | Browser-facing meeting API |
| `MEETING_SERVER_URL` | `http://meeting-server:3020` | Internal Docker URL |
| `JITSI_APP_ID` | `izara-telemedicine` | JWT `iss` — must match Prosody |
| `JITSI_JWT_SECRET` | *(generated)* | HS256 secret — synced by setup script |

JWT sync:

```bash
node scripts/jitsi/setup-local-jitsi.mjs --sync-docker-env --lan
```

---

## How `meet.demotoday.net` works

1. **docker-jitsi-meet** runs Prosody, Jicofo, JVB on the Ubuntu host.
2. **Nginx** terminates TLS and proxies `meet.demotoday.net` → `http://127.0.0.1:8000` (Jitsi web HTTP; TLS ends at Nginx).
3. On a **private domain** (not `meet.jit.si`), meeting-server sets `JITSI_TOKEN_AUTH_ENABLED=true`.
4. **`GET /join-config`** returns an HS256 JWT:
   - **Doctor:** `context.user.moderator: true`, `affiliation: owner`
   - **Patient / guest:** `moderator: false`, `affiliation: member`
5. **Izara lobby** (meeting-server API) controls admission. **Jitsi’s built-in lobby is disabled** (`enableLobby: false`).

---

## Meeting lifecycle (sequence)

```text
1. Login portal          → session token (opaque, DB-backed)
2. POST /meetings/create → room_name + meetingId
3. Doctor host-present   → { inJitsi: true }  (after videoConferenceJoined)
4. GET join-config       → domain, roomName, jwt, configOverwrite
5. Mount JitsiMeetExternalAPI on meet.demotoday.net
6. Patient lobby/join    → status: waiting
7. Doctor lobby/admit    → patient admitted
8. Patient join-config   → non-moderator JWT → mount Jitsi
9. POST /end             → pipeline, EMR, notifications
```

**Portal routes (UI — no direct Jitsi URL needed):**

| Role | Route |
|------|-------|
| Doctor (HOST) | `/doctor/:userId/meeting/:appointmentId` |
| Patient | `/meeting/:appointmentId` |
| Guest | `/guest/join/:token` on patient portal |

---

## API authentication

Meeting-server uses **opaque session tokens** from portal login (`sessions` table), **not** the Jitsi JWT.

```http
Authorization: Bearer <session_token>
```

Obtain token:

```bash
# Doctor
curl -sk -X POST https://doctor.demotoday.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor.test@izara.com","password":"IzaraDoctor@2024"}'

# Patient
curl -sk -X POST https://patient.demotoday.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd"}'
```

Use `body.token` (or `accessToken`) on `https://meeting.demotoday.net`.

---

## API reference (essential endpoints)

Base: `MEETING=https://meeting.demotoday.net`  
`:id` = `appointmentId` or `meetingId` (aliases registered at create time).

### Health & config

```bash
curl -sk $MEETING/health
curl -sk $MEETING/api/config
# → { "jitsiDomain": "meet.demotoday.net", ... }
```

### Create meeting

```bash
curl -sk -X POST $MEETING/api/meetings/create \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "apt-demo-001",
    "patientId": "PAT-TEST-001",
    "doctorId": "DOC-TEST-001",
    "patientName": "Demo Patient",
    "doctorName": "Demo Doctor"
  }'
```

Response fields: `meetingId`, `appointmentId`, `roomName` (e.g. `izara-apt-demo-001-m5xyz`).

### Host presence (doctor must be in Jitsi)

```bash
curl -sk -X POST $MEETING/api/meetings/apt-demo-001/host-present \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inJitsi": true}'

curl -sk $MEETING/api/meetings/apt-demo-001/host-ready
```

### Join config (mount Jitsi)

```bash
# Doctor
curl -sk "$MEETING/api/meetings/apt-demo-001/join-config?role=doctor" \
  -H "Authorization: Bearer $DOCTOR_TOKEN"

# Patient (after admit)
curl -sk "$MEETING/api/meetings/apt-demo-001/join-config?role=patient" \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

Example response:

```json
{
  "success": true,
  "domain": "meet.demotoday.net",
  "roomName": "izara-apt-demo-001-m5xyz",
  "role": "doctor",
  "jwt": "eyJhbG...",
  "tokenAuthEnabled": true,
  "configOverwrite": { "moderator": true, "enableLobby": false },
  "interfaceConfigOverwrite": { "APP_NAME": "Izara Telemedicine" }
}
```

### Izara lobby

```bash
# Patient enters lobby
curl -sk -X POST $MEETING/api/meetings/apt-demo-001/lobby/join \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"participantName":"Demo Patient","role":"patient"}'

# Doctor admits all waiting
curl -sk -X POST $MEETING/api/meetings/apt-demo-001/lobby/admit-all \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"admittedBy":"DOC-TEST-001"}'

# List lobby
curl -sk $MEETING/api/meetings/apt-demo-001/lobby \
  -H "Authorization: Bearer $DOCTOR_TOKEN"
```

### Guest invite

```bash
curl -sk -X POST $MEETING/api/meetings/apt-demo-001/guest-invite \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"guestName":"Family Member","guestEmail":"guest@example.com"}'
# → guestTokenUrl: https://patient.demotoday.net/guest/join/<token>
```

### During / after meeting

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/meetings/:id/status` | optional | Meeting status |
| GET | `/api/meetings/:id/socket-rooms` | optional | Socket.IO room aliases |
| POST | `/api/meetings/:id/save-recording` | doctor | Browser recording → pipeline |
| POST | `/api/meetings/:id/end` | doctor | End meeting + AI pipeline |
| GET | `/api/meetings/:id/results` | doctor | Transcript, summary, recordings |
| GET | `/api/meetings/:id/pipeline-status` | doctor | Post-meeting progress |

---

## Embed Jitsi in browser (after join-config)

```html
<script src="https://meet.demotoday.net/external_api.js"></script>
<div id="jitsi-container" style="width:100%;min-height:70vh"></div>
<script>
  async function mountMeeting(appointmentId, doctorToken) {
    const res = await fetch(
      `https://meeting.demotoday.net/api/meetings/${appointmentId}/join-config?role=doctor`,
      { headers: { Authorization: 'Bearer ' + doctorToken } }
    );
    const cfg = await res.json();

    const api = new JitsiMeetExternalAPI(cfg.domain, {
      roomName: cfg.roomName,
      parentNode: document.getElementById('jitsi-container'),
      jwt: cfg.jwt,
      configOverwrite: cfg.configOverwrite,
      interfaceConfigOverwrite: cfg.interfaceConfigOverwrite,
      userInfo: { displayName: cfg.displayName },
    });

    api.addListener('videoConferenceJoined', () => {
      fetch(`https://meeting.demotoday.net/api/meetings/${appointmentId}/host-present`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + doctorToken,
        },
        body: JSON.stringify({ inJitsi: true }),
      });
    });
    return api;
  }
</script>
```

Patients: wait for `host-ready` + lobby admit, then same pattern with `role=patient`.

---

## Socket.IO (realtime)

Connect to `https://meeting.demotoday.net`:

| Event | When |
|-------|------|
| `join-meeting` | Client emits with `{ meetingId, userName, role }` |
| `host-ready` | Doctor joined Jitsi — patient may mount iframe |
| `lobby-update` | Join / admit / reject |

---

## Automated smoke test

```bash
MEETING_URL=https://meeting.demotoday.net \
DOCTOR_URL=https://doctor.demotoday.net \
PATIENT_URL=https://patient.demotoday.net \
node scripts/docker/meeting-api-smoke.mjs
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Site unreachable from Windows | Hosts file must include **`meet.demotoday.net`** → Ubuntu IP; `ping patient.demotoday.net` |
| Certificate errors | Install mkcert `rootCA.pem` on client; `bash deploy/nginx/fix-tls.sh` |
| **Cam/mic blocked / Start Meeting spins** | Use **doctor laptop** Chrome/Edge; allow camera/mic; portal CSP must allow `meet.demotoday.net` (rebuild doctor-portal) |
| Video connects, no A/V | `sudo ufw allow 10000/udp`; `JVB_ADVERTISE_IPS` = LAN IP |
| `external_api.js` fails | `meet.demotoday.net` missing from hosts — add before other demotoday names |
| `join-config` 401 | Doctor/patient roles need portal session token on private domain |
| Blank Jitsi iframe | JWT mismatch — rerun `setup-local-jitsi.mjs --sync-docker-env --lan` |
| Patient stuck in lobby | Doctor must join Jitsi (`host-present`) + `lobby/admit` |

---

*Izara v1.7.54 · Last updated: 2026-06-30*
