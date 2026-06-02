# การเชื่อมโยง Jitsi และโค้ดตัวอย่าง (Jitsi Integration & Code Examples)

> **อัปเดต:** 2 มิถุนายน 2569 | **ขอบเขต:** As-is ตาม codebase Isara-Anywhere เท่านั้น  
> **เอกสารก่อนหน้า:** [01 Architecture](01_System_Architecture_and_Workflow.md) · [02 Auth](02_Authentication_and_Authorization.md) · [03 Data Storage](03_Data_Storage_Architecture.md) · **ขั้นตอนเต็ม:** [05 Appendix](05_Appendix_Full_Process_Steps.md)

---

## สารบัญ

1. [ภาพรวมการเชื่อมต่อ](#1-ภาพรวมการเชื่อมต่อ)
2. [สถาปัตยกรรมสามชั้น](#2-สถาปัตยกรรมสามชั้น)
3. [Izara Lobby vs Jitsi Lobby](#3-izara-lobby-vs-jitsi-lobby)
4. [API และ Webhook](#4-api-และ-webhook)
5. [Socket.IO Events](#5-socketio-events)
6. [Pipeline หลังประชุม](#6-pipeline-หลังประชุม)
7. [โค้ดตัวอย่าง — ทีมพี่เบียร์ (Frontend)](#7-โค้ดตัวอย่าง--ทีมพี่เบียร์-frontend)
8. [โค้ดตัวอย่าง — ทีมพี่ต้นชนินทร์ (Backend / Infrastructure)](#8-โค้ดตัวอย่าง--ทีมพี่ต้นชนินทร์-backend--infrastructure)
9. [Environment Variables](#9-environment-variables)
10. [แผนภาพ Mermaid — Flowchart](#10-แผนภาพ-mermaid--flowchart)
11. [แผนภาพ draw.io — Network Topology](#11-แผนภาพ-drawio--network-topology)
12. [เอกสารอ้างอิง](#12-เอกสารอ้างอิง)
13. [ภาคผนวก — สังเคราะห์จาก Processes (ประชุม/หน้าจอ)](#13-ภาคผนวก--สังเคราะห์จาก-processes-ประชุมหน้าจอ)

---

## 1. ภาพรวมการเชื่อมต่อ

| องค์ประกอบ | ค่าที่ใช้จริง (production) |
|------------|---------------------------|
| โดเมน Jitsi | `meet.jit.si` (SaaS สาธารณะ) |
| Meeting Server | `Izara-jitsi-server` — พอร์ต **3020** |
| ฐานข้อมูล | PostgreSQL `meeting_records`, `meeting_transcripts` |
| Host ประชุม | แพทย์ที่ได้รับมอบหมายเท่านั้น (`hostRole: 'doctor'`) |
| ผู้ป่วย/แขก | รอ **Izara Lobby** จนแพทย์ admit |

บน `meet.jit.si`:

- **ไม่ส่ง** JWT moderator ของ Jitsi (public SaaS ไม่รองรับ custom JWT ตามที่ระบบ implement)
- ปิด Jitsi lobby ใน config (`enableLobby: false`) — ใช้ Izara lobby แทน
- แพทย์ควรเข้าห้อง Jitsi ก่อน → บน public Jitsi คนแรกในห้องมักได้ moderator

---

## 2. สถาปัตยกรรมสามชั้น

```text
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — Control Plane (Meeting Server + PostgreSQL)            │
│  สร้างห้อง, lobby, transcript, recording, AI summary             │
│  REST + Socket.IO + JWT แอป Izara                                │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2 — Signaling / Admission (Izara Lobby)                    │
│  ผู้ป่วย/แขกรอ admit — แพทย์กด host-ready                        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3 — Media Plane (Jitsi meet.jit.si)                        │
│  WebRTC วิดีโอ/เสียง — ตรงจากเบราว์เซอร์ ไม่ผ่าน Meeting Server   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Izara Lobby vs Jitsi Lobby

| หัวข้อ | Izara Lobby | Jitsi Lobby (ปิดในระบบ) |
|--------|-------------|-------------------------|
| ที่ implement | Meeting Server `lobbySession.js` | `jitsiConfig.js` ตั้ง `enableLobby=false` |
| ใคร admit | แพทย์ (HOST) ผ่าน API | ไม่ใช้บน meet.jit.si |
| สถานะรอ | ใน-memory `meetingLobbies` Map + sync DB key | — |
| เหตุผล | ควบคุม UX ภาษาไทย, ผูก appointment, RBAC | public Jitsi ไม่ honor JWT moderator |

---

## 4. API และ Webhook

### 4.1 สร้างและเข้าห้อง

| Method | Path | Auth | หน้าที่ |
|--------|------|------|---------|
| POST | `/api/meetings/create` | `authenticateToken` | สร้าง room + INSERT `meeting_records` (idempotent ตาม `appointment_id`) |
| POST | `/api/meeting/create` | เหมือนกัน | alias |
| GET | `/api/meetings/:id/join-config` | Bearer (แนะนำ) | คืน `domain`, `roomName`, `jwt?`, `configOverwrite` |
| POST | `/api/meetings/:id/host-present` | Bearer | แจ้งว่าแพทย์อยู่ในห้อง/พร้อม |
| GET | `/api/meetings/:id/host-ready` | — | ตรวจว่า host พร้อม admit แล้วหรือยัง |

### 4.2 Izara Lobby

| Method | Path | หน้าที่ |
|--------|------|---------|
| POST | `/api/meetings/:id/lobby/join` | ผู้ป่วย/แขกเข้าคิวรอ |
| POST | `/api/meetings/:id/lobby/leave` | ออกจาก lobby (disconnect) |
| POST | `/api/meetings/:id/lobby/admit` | แพทย์ admit ผู้เข้าร่วม |
| POST | `/api/meetings/:id/lobby/reject` | แพทย์ปฏิเสธ |

แพทย์/admin ที่ authenticated อาจ **bypass lobby** (`Host bypasses lobby`)

### 4.3 บันทึกและ Pipeline

| Method | Path | หน้าที่ |
|--------|------|---------|
| POST | `/api/meetings/:id/save-recording` | Client ส่ง base64/webm |
| POST | `/api/meetings/:id/end` | จบการประชุม |
| POST | `/api/webhooks/jibri-recording` | Jibri self-hosted เท่านั้น |

### 4.4 ชื่อห้อง (Room Name)

รูปแบบที่ generate:

```text
izara-{appointmentId 12 ตัวแรก}-{timestamp base36}
```

หรือรับ `roomName` จาก request body ถ้ามี

### 4.5 JWT สำหรับ Jitsi (self-hosted เท่านั้น)

เปิดเมื่อ (`JITSI_TOKEN_AUTH_ENABLED`):

- มี `JITSI_JWT_SECRET` / `JITSI_APP_SECRET`
- โดเมน **ไม่ใช่** `meet.jit.si`
- ไม่ตั้ง `JITSI_FORCE_JWT_ON_PUBLIC=1`

---

## 5. Socket.IO Events

| Event | ทิศทาง | ความหมาย |
|-------|--------|----------|
| `lobby-update` | Server → clients | คิว lobby เปลี่ยน (join/leave/admit) |
| `host-ready` | Server → clients | แพทย์พร้อม — ผู้ป่วยเริ่ม join Jitsi ได้ |
| `meeting:updated` | Server → clients | อัปเดต `meeting_records` จาก NOTIFY |

Client join room ตาม `lobbyKey` / `meetingId` / `appointmentId` (มี alias map ใน server)

---

## 6. Pipeline หลังประชุม

ลำดับ As-is ใน `postMeetingPipeline.js`:

| ลำดับ | ขั้นตอน |
|-------|---------|
| 1 | รับ recording (client upload หรือ Jibri webhook) |
| 2 | เก็บ path ชั่วคราว `{RECORDINGS_DIR}/meetings/...` |
| 3 | Persist → `meeting_records.recording_data` (BYTEA) และ/หรือ GCS |
| 4 | STT (Google Speech-to-Text ถ้าเปิด env) |
| 5 | Gemini สรุป → `ai_summary`, `section_summaries` |
| 6 | `doctor_validation_status = pending_review` |
| 7 | ลบไฟล์ local ตาม `RECORDING_LOCAL_RETENTION` |

---

## 7. โค้ดตัวอย่าง — ทีมพี่เบียร์ (Frontend)

ไฟล์หลัก:

- `Isara-doctor-portal/src/utils/jitsiMeetingConfig.ts` (patient portal มี copy คล้ายกัน)
- `Isara-doctor-portal/src/pages/meetings/MeetingRoom.tsx`
- `Isara-doctor-portal/src/features/meeting/components/JitsiMeetingShell.tsx`

### 7.1 ดึง Join Config พร้อม Bearer Token

```typescript
/**
 * เรียก Meeting Server เพื่อรับการตั้งค่าเข้าห้อง Jitsi
 * @param meetingServerUrl - จาก VITE_MEETING_SERVER_URL
 * @param meetingId - UUID meeting_records หรือ appointment id ตามที่ระบบ resolve
 * @param role - 'doctor' | 'patient' | 'guest' | 'admin' | 'host'
 * @param token - JWT แพทย์/ผู้ป่วยจาก auth (ส่งใน Authorization header)
 */
export async function fetchMeetingJoinConfig(
  meetingServerUrl: string,
  meetingId: string,
  role: JitsiMeetingRole,
  displayName?: string,
  token?: string | null,
): Promise<MeetingJoinConfig | null> {
  try {
    const q = new URLSearchParams({ role });
    if (displayName?.trim()) q.set('name', displayName.trim());
    const headers: Record<string, string> = {};
    // ส่ง token แอป Izara — Meeting Server ตรวจด้วย jwtPolicy (issuer izara-telemedicine)
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      `${meetingServerUrl}/api/meetings/${meetingId}/join-config?${q}`,
      { headers },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

### 7.2 เลือก JWT สำหรับ Jitsi iframe

```typescript
/**
 * บน meet.jit.si ไม่ส่ง jwt — คืน undefined เสมอ
 * บน Jitsi self-hosted ใช้ cfg.jwt จาก join-config
 */
export function pickJitsiJwt(
  cfg: MeetingJoinConfig | null | undefined,
  explicit?: string | null,
): string | undefined {
  if (cfg?.tokenAuthEnabled === false) return undefined;
  const domain = cfg?.domain || resolveJitsiDomain();
  // โดเมนสาธารณะ jit.si ไม่รองรับ custom JWT ใน production ปัจจุบัน
  if (domain === 'meet.jit.si' || domain.endsWith('.jit.si')) return undefined;
  const token = cfg?.jwt || explicit;
  return token && String(token).length > 10 ? String(token) : undefined;
}
```

### 7.3 แจ้งว่าแพทย์เข้าห้องแล้ว

```typescript
/** แพทย์เข้าห้อง — แจ้ง Meeting Server เพื่อเริ่มกระบวนการ host-ready */
export async function notifyHostPresent(
  meetingServerUrl: string,
  meetingId: string,
  token?: string | null,
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(`${meetingServerUrl}/api/meetings/${meetingId}/host-present`, {
      method: 'POST',
      headers,
    });
  } catch { /* silent — UI อาจ retry */ }
}
```

### 7.4 รอแพทย์พร้อมก่อน mount Jitsi (ผู้ป่วย/แขก)

```typescript
/**
 * Poll ทุก 2 วินาที สูงสุด 120 วินาที — ผู้ป่วยรอแพทย์ admit
 */
export async function waitForHostReady(
  meetingServerUrl: string,
  meetingId: string,
  maxMs = 120_000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isHostReady(meetingServerUrl, meetingId)) return true;
    await new Promise<void>(r => setTimeout(r, 2000));
  }
  return false;
}
```

### 7.5 โหลด Jitsi External API Script

```typescript
/** โหลด https://{domain}/external_api.js ครั้งเดียวต่อหน้า */
export function loadJitsiExternalApiScript(domain = resolveJitsiDomain()): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((globalThis as any).JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Jitsi'));
    document.head.appendChild(script);
  });
}
```

### 7.6 ตั้งค่า External API — ภาษาไทย, ปิด Jitsi lobby

```typescript
export function getJitsiExternalApiOptions(role: JitsiMeetingRole, displayName: string) {
  const isHost = role === 'doctor' || role === 'admin' || role === 'host';
  return {
    configOverwrite: {
      ...JITSI_QUIET_CONFIG,
      prejoinPageEnabled: false,
      defaultLanguage: 'th',
      // Izara lobby จัดการ admission — ไม่ใช้ lobby ของ Jitsi
      enableLobby: false,
      lobbyModeEnabled: false,
      startWithAudioMuted: !isHost,
      startWithVideoMuted: false,
    },
    interfaceConfigOverwrite: {
      APP_NAME: 'Izara Telemedicine',
      SHOW_JITSI_WATERMARK: false,
      DEFAULT_LOCAL_DISPLAY_NAME: displayName,
    },
  };
}
```

### 7.7 MeetingRoom — Header สำหรับ API ประชุม

```typescript
// MeetingRoom.tsx — ใช้ JWT แพทย์จาก authServices
function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** อัปโหลดบันทึกหลังประชุม */
async function postRecordingBase64(
  meetingServerUrl: string,
  appointmentId: string,
  base64: string,
  duration: number,
): Promise<void> {
  const res = await fetch(
    `${meetingServerUrl}/api/meetings/${appointmentId}/save-recording`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        audioBase64: base64,
        mimeType: 'audio/webm',
        durationMs: duration,
        triggerTranscription: true,
      }),
    },
  );
  if (!res.ok) throw new Error(`save-recording ${res.status}`);
}
```

### 7.8 Checklist ทีม Frontend

| ลำดับ | งาน |
|-------|-----|
| 1 | ส่ง `Authorization: Bearer` ทุก call ไป Meeting Server |
| 2 | เรียก `notifyHostPresent` เมื่อแพทย์เข้า pre-join |
| 3 | ผู้ป่วย `waitForHostReady` ก่อน `JitsiMeetExternalAPI` |
| 4 | ใช้ `pickJitsiJwt` — อย่าส่ง jwt บน meet.jit.si |
| 5 | ใช้ `JitsiMeetingShell` สำหรับ responsive layout |

---

## 8. โค้ดตัวอย่าง — ทีมพี่ต้นชนินทร์ (Backend / Infrastructure)

ไฟล์หลัก:

- `Izara-jitsi-server/server/index.js`
- `Izara-jitsi-server/server/jitsiConfig.js`
- `Izara-jitsi-server/server/jwtPolicy.js`
- `Izara-jitsi-server/server/postMeetingPipeline.js`
- `Izara-jitsi-server/server/jibriWebhook.js`

### 8.1 สร้าง JWT บทบาท Jitsi (self-hosted)

```javascript
/**
 * สร้าง JWT สำหรับ Jitsi — ใช้ได้เมื่อ JITSI_TOKEN_AUTH_ENABLED = true
 * แพทย์/host ได้ moderator: true ใน context.user
 */
function createJitsiRoleJwt(roomName, user = {}, role = 'guest') {
  if (!JITSI_TOKEN_AUTH_ENABLED) return null;
  const normalizedRole = String(role || '').toLowerCase();
  const isModerator =
    normalizedRole === 'doctor' ||
    normalizedRole === 'host' ||
    normalizedRole === 'moderator';
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      aud: 'jitsi',
      iss: JITSI_TOKEN_ISSUER,
      sub: JITSI_DOMAIN,
      room: roomName,
      nbf: now - 10,
      exp: now + 4 * 60 * 60,
      context: {
        user: {
          id: user.id || '',
          name: user.name || 'Guest',
          email: user.email || '',
          affiliation: isModerator ? 'owner' : 'member',
          moderator: isModerator,
        },
      },
    },
    JITSI_SIGNING_SECRET,
    { algorithm: 'HS256' },
  );
}
```

### 8.2 สร้างห้องและบันทึก PostgreSQL

```javascript
// POST /api/meetings/create — สรุปจาก index.js
const meetingId = uuidv4();
const roomName =
  providedRoomName ||
  `izara-${appointmentId?.substring(0, 12) || meetingId.substring(0, 8)}-${Date.now().toString(36)}`;

const doctorJwt = createJitsiRoleJwt(
  roomName,
  { id: doctorId, name: doctorName || 'Doctor' },
  'doctor',
);
const urls = buildMeetingUrls(JITSI_DOMAIN, roomName, {
  doctorJwt,
  patientJwt: createJitsiRoleJwt(roomName, { id: patientId, name: patientName }, 'patient'),
  guestJwt: createJitsiRoleJwt(roomName, { name: 'Guest' }, 'guest'),
  language: 'th',
});

const result = await pool.query(
  `INSERT INTO meeting_records (
    id, appointment_id, doctor_id, patient_id, room_name, jitsi_domain,
    meeting_url, doctor_url, patient_url, guest_url, status, meeting_config, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
  RETURNING *`,
  [
    meetingId,
    safeAppointmentId,
    safeDoctorId,
    safePatientId,
    roomName,
    JITSI_DOMAIN,
    urls.patient,
    urls.doctor,
    urls.patient,
    urls.guest,
    'scheduled',
    JSON.stringify({
      lobbyEnabled: true,
      recordingEnabled: true,
      transcriptionEnabled: true,
      hostRole: 'doctor',
      tokenAuthEnabled: JITSI_TOKEN_AUTH_ENABLED,
      organizerDoctorId: safeDoctorId,
    }),
  ],
);
```

### 8.3 ปิด Jitsi Lobby ใน URL hash

```javascript
// jitsiConfig.js — Izara lobby เป็นผู้ควบคุม admission
params.set('config.enableLobby', 'false');
params.set('config.lobbyModeEnabled', 'false');
params.set('config.lobbyModeEnabled', 'false');
params.set('config.enableLobbyChat', 'false');
```

### 8.4 ตรวจ JWT แอปก่อนเข้า API

```javascript
// jwtPolicy.js
export function createAuthenticateToken(secret) {
  return (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
      req.user = verifyAccessToken(token, secret); // issuer izara-telemedicine, HS256
      next();
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
  };
}
```

### 8.5 Webhook Jibri (self-hosted infrastructure)

```javascript
// jibriWebhook.js
export function validateJibriWebhookRequest(body, { expectedSecret, providedSecret } = {}) {
  if (expectedSecret && providedSecret !== expectedSecret) {
    return { ok: false, status: 401, error: 'Invalid webhook secret' };
  }
  const hasPayload = Boolean(body?.localFilePath || body?.videoBase64);
  if (!body?.meetingId || !hasPayload) {
    return { ok: false, status: 400, error: 'meetingId and payload required' };
  }
  return { ok: true };
}
```

### 8.6 Checklist ทีม Backend / Infra

| ลำดับ | งาน |
|-------|-----|
| 1 | ตั้ง `JWT_SECRET` ให้ตรง Doctor Portal และ Meeting Server |
| 2 | Cloud Run: `RECORDINGS_DIR=/tmp/recordings`, `RECORDING_LOCAL_RETENTION=delete_after_persist` |
| 3 | ถ้าใช้ GCS: ตั้ง `GCS_BUCKET` + service account |
| 4 | Self-hosted Jitsi: ตั้ง `JITSI_JWT_SECRET`, `JIBRI_WEBHOOK_SECRET` |
| 5 | ตรวจ health `GET /health` หลัง deploy |

---

## 9. Environment Variables

จาก `Izara-jitsi-server/.env.example` (สรุปที่เกี่ยวข้อง):

```bash
# พอร์ตและ DB
PORT=3020
DATABASE_URL=postgresql://postgres:***@localhost:5432/izara_phase1

# Jitsi
JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=izara-telemedicine

# JWT แอป (ต้องตรงกับ Doctor Portal)
JWT_SECRET=***
JWT_ISSUER=izara-telemedicine

# บันทึก
RECORDINGS_DIR=/tmp/recordings
GCS_BUCKET=
RECORDING_LOCAL_RETENTION=delete_after_persist

# AI หลังประชุม
GEMINI_API_KEY=***
GEMINI_MODEL=gemini-3.1-flash-lite
GOOGLE_STT_ENABLED=true

# Self-hosted only
# JITSI_JWT_SECRET=
# JIBRI_WEBHOOK_SECRET=
```

Frontend (Doctor/Patient):

```bash
VITE_MEETING_SERVER_URL=http://localhost:3020
VITE_JITSI_DOMAIN=meet.jit.si
```

---

## 10. แผนภาพ Mermaid — Flowchart

```mermaid
flowchart TB
    subgraph DoctorUI [Doctor Portal]
        D1[Health Meeting / MeetingRoom]
        D2[notifyHostPresent]
        D3[loadJitsiExternalApiScript]
        D4[JitsiMeetExternalAPI moderator]
    end

    subgraph PatientUI [Patient Portal]
        P1[Pre-join / Agreement]
        P2[lobby/join API]
        P3[waitForHostReady]
        P4[JitsiMeetExternalAPI participant]
    end

    subgraph MS [Meeting Server :3020]
        C[POST /api/meetings/create]
        J[GET /api/meetings/id/join-config]
        L[lobby join admit]
        H[host-present host-ready]
        R[save-recording]
        P[postMeetingPipeline]
    end

    subgraph DB [Cloud SQL]
        MR[(meeting_records)]
        MT[(meeting_transcripts)]
    end

    subgraph JITSI [meet.jit.si WebRTC]
        IFRAME[Jitsi iframe media]
    end

    D1 --> C
    C --> MR
    D1 --> J
    P1 --> L
    L --> H
    D2 --> H
    P3 --> H
    D3 --> D4
    P3 --> P4
    D4 --> IFRAME
    P4 --> IFRAME
    D4 --> R
    R --> P
    P --> MR
    P --> MT
    P -.->|GCS_BUCKET| GCS[(GCS)]
```

---

## 11. แผนภาพ draw.io — Network Topology

```xml
<mxfile host="app.diagrams.net" agent="Isara-Jitsi-Topology-v2" version="21.0.0">
  <diagram name="Jitsi Network Topology" id="jitsi-net-as-is">
    <mxGraphModel dx="1200" dy="750" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1300" pageHeight="750" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" value="Jitsi Integration — Network Topology (As-is)" style="text;html=1;align=center;fontSize=16;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="280" y="12" width="640" height="30" as="geometry" />
        </mxCell>
        <mxCell id="browser_doc" value="Doctor Browser&#xa;JWT Bearer" style="rounded=1;fillColor=#E8F5E9;" vertex="1" parent="1">
          <mxGeometry x="50" y="70" width="150" height="55" as="geometry" />
        </mxCell>
        <mxCell id="browser_pat" value="Patient Browser&#xa;session/JWT" style="rounded=1;fillColor=#E3F2FD;" vertex="1" parent="1">
          <mxGeometry x="50" y="150" width="150" height="55" as="geometry" />
        </mxCell>
        <mxCell id="browser_guest" value="Guest Browser&#xa;invite link" style="rounded=1;fillColor=#FFE0B2;" vertex="1" parent="1">
          <mxGeometry x="50" y="230" width="150" height="50" as="geometry" />
        </mxCell>
        <mxCell id="cr_meeting" value="Cloud Run Meeting Server :3020&#xa;REST + Socket.IO + Lobby" style="rounded=1;fillColor=#FFF3E0;strokeColor=#FF9800;" vertex="1" parent="1">
          <mxGeometry x="280" y="90" width="240" height="90" as="geometry" />
        </mxCell>
        <mxCell id="cr_portals" value="Cloud Run Patient/Doctor&#xa;VITE_MEETING_SERVER_URL" style="rounded=1;fillColor=#E8EAF6;" vertex="1" parent="1">
          <mxGeometry x="280" y="210" width="240" height="60" as="geometry" />
        </mxCell>
        <mxCell id="jitsi_ext" value="meet.jit.si&#xa;WebRTC (media only)" style="ellipse;whiteSpace=wrap;html=1;fillColor=#FCE4EC;" vertex="1" parent="1">
          <mxGeometry x="580" y="75" width="180" height="85" as="geometry" />
        </mxCell>
        <mxCell id="cloudsql" value="Cloud SQL&#xa;meeting_records transcripts" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;size=12;fillColor=#B39DDB;" vertex="1" parent="1">
          <mxGeometry x="580" y="200" width="180" height="75" as="geometry" />
        </mxCell>
        <mxCell id="gcs_opt" value="GCS optional&#xa;meetings/doctorId/meetingId" style="shape=folder;fillColor=#CFD8DC;" vertex="1" parent="1">
          <mxGeometry x="580" y="300" width="180" height="60" as="geometry" />
        </mxCell>
        <mxCell id="gemini" value="Google Gemini / STT&#xa;post-meeting API" style="rounded=1;fillColor=#FFF9C4;" vertex="1" parent="1">
          <mxGeometry x="280" y="300" width="240" height="50" as="geometry" />
        </mxCell>
        <mxCell id="e1" value="HTTPS API" style="endArrow=classic;" edge="1" parent="1" source="browser_doc" target="cr_meeting" />
        <mxCell id="e2" value="HTTPS API" style="endArrow=classic;" edge="1" parent="1" source="browser_pat" target="cr_meeting" />
        <mxCell id="e3" value="WebRTC" style="endArrow=classic;dashed=1;" edge="1" parent="1" source="browser_doc" target="jitsi_ext" />
        <mxCell id="e4" value="WebRTC" style="endArrow=classic;dashed=1;" edge="1" parent="1" source="browser_pat" target="jitsi_ext" />
        <mxCell id="e5" value="SQL" style="endArrow=classic;" edge="1" parent="1" source="cr_meeting" target="cloudsql" />
        <mxCell id="e6" value="upload" style="endArrow=classic;dashed=1;" edge="1" parent="1" source="cr_meeting" target="gcs_opt" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## 12. เอกสารอ้างอิง

| ไฟล์ | เนื้อหา |
|------|---------|
| `Processes/VIDEO_MEETING_JITSI_GEMINI.md` | Workflow ประชุมฉบับเต็ม |
| `Processes/Appointment_Workflows.md` | นัด→ประชุม→ส่งผู้ป่วย |
| `Processes/Pages/Meeting-Server/00_Meeting_Server_Overview.md` | API รวม Meeting Server |
| `Izara-jitsi-server/server/index.js` | API + lobby + create |
| `Izara-jitsi-server/server/jitsiConfig.js` | URL และ External API config |
| `Isara-doctor-portal/src/utils/jitsiMeetingConfig.ts` | Frontend utilities |
| `Isara-doctor-portal/src/pages/meetings/MeetingRoom.tsx` | UI ประชุมหลัก |

---

## 13. ภาคผนวก — สังเคราะห์จาก Processes (ประชุม/หน้าจอ)

### 13.1 หน้าจอที่เกี่ยวกับวิดีโอ (ครบตามสเปก)

| สเปก Processes | บทบาท | ขั้นตอนสำคัญ |
|----------------|--------|--------------|
| `Patient-Portal/05_Appointments_Page.md` | ผู้ป่วย | agreement → pre-join → lobby → join; share guest link |
| `Doctor-Portal/06_Health_Meeting_Page.md` | แพทย์ | คิว, confirm, `POST /api/meetings/create`, validate AI |
| `Doctor-Portal/07_Virtual_Meeting.md` | แพทย์ HOST | transcript start/stop, recording, in-meeting chat |
| `Doctor-Portal/21_Queue_Management.md` | แพทย์/แอดมิน | realtime คิว (รวมใน health-meeting) |
| `Meeting-Server/00_Meeting_Server_Overview.md` | backend | lobby, pipeline, Socket, env |

### 13.2 จาก `VIDEO_MEETING_JITSI_GEMINI.md` — คุณสมบัติที่ implement

| คุณสมบัติ | As-is |
|-----------|-------|
| Doctor HOST เท่านั้น | `config.moderator=true`, `hostRole: 'doctor'` |
| Patient/Guest lobby | Izara lobby ก่อน iframe Jitsi |
| Multi-party + external guest | invite token, ไม่ต้อง login เต็มรูปแบบ |
| Web Speech STT | ระหว่างประชุม (แพทย์ควบคุม) |
| Post-meeting Gemini | สรุป 30 นาที/ส่วน, `pending_review` |
| Man-in-the-loop | `POST .../validate` ก่อนส่งผู้ป่วย |
| Instruction sheet PDF | `GET .../instruction-sheet` |
| บันทึกวิดีโอ | MediaRecorder → save-recording |

### 13.3 API จากสเปก Doctor 06 / Patient 05 / Meeting 00

| Method | Path | ใช้เมื่อ |
|--------|------|----------|
| POST | `/api/meetings/create` | ยืนยันนัดแล้วสร้างห้อง |
| POST | `/api/meetings/:id/end` | จบประชุม → เริ่ม pipeline |
| POST | `/api/meetings/:id/save-recording` | อัปโหลด webm |
| POST | `/api/meetings/:id/transcript` | เก็บ segment |
| POST | `/api/meetings/:id/validate` | แพทย์อนุมัติ/แก้ AI สรุป |
| POST | `/api/meetings/:id/regenerate` | สรุปใหม่ด้วย feedback |
| POST | `/api/meetings/:id/lobby` | admit/reject ผู้เข้าร่วม |
| GET | `/api/meetings/:id/pipeline-status` | ตรวจ stage pipeline |
| GET | `/api/appointments/:id/meeting-link` | ผู้ป่วยได้ลิงก์ |
| POST | `/api/appointments/:id/share-link` | สร้าง guest link |

### 13.4 ลำดับหลังจบประชุม (จากสเปกขั้นตอน ENRICH-9)

1. แพทย์กดจบ → `save-recording` (ถ้ามีไฟล์)
2. `POST .../end` → STT + Gemini → `meeting_records`
3. Socket `meeting-summary-ready` → Health Meeting results tab
4. แพทย์ validate → เปิด EMR pre-fill (`08_EMR_Editor`)
5. ผู้ป่วยเห็นผลเมื่อ `ready_for_patient` + แจ้งเตือน (`15_Notification_System`)

### 13.5 GATE0 / Contract ที่เกี่ยวกับประชุม

จาก `GATE0_IMPLEMENTATION_STATUS.md` และ `FULL_WORKFLOW_CONTRACT.md` §3:

- Admin **ไม่** เป็น HOST — เฉพาะแพทย์ที่มอบหมาย
- Pool = สถานะ `in_pool` ใน PostgreSQL (ไม่ใช่ object storage แยก)
- Lobby admission บังคับสำหรับ non-host
- Room URL คงที่ต่อ `appointment_id` (deterministic routes)

### 13.6 ทดสอบอัตโนมัติ (อ้างอิงจาก Processes)

- Playwright Groups D, video-meeting workflow screenshots ใน `screenshots/workflow/`
- คำสั่งตัวอย่างใน `VIDEO_MEETING_JITSI_GEMINI.md` § testing
- Registry: `tests/PROCESS_COVERAGE_MATRIX.md`, `tests/SELECTORS.md`

---

ชุดเอกสาร Technical Documents (01–04) รวมสาระจาก `Processes/Pages` และ `Processes/*.md` ตาม As-is บน Google Cloud
