# การจัดการสิทธิ (Authentication & Authorization)

> **อัปเดต:** 2 มิถุนายน 2569 | **ชุด:** `Documents/Technical_Documents` · [ดัชนี](../README.md)  
> **ก่อนหน้า:** [01](01_System_Architecture_and_Workflow.md) · **ถัดไป:** [03](03_Data_Storage_Architecture.md) · [05 ขั้นตอน](05_Appendix_Full_Process_Steps.md)

---

## สารบัญ

1. [ภาพรวม](#1-ภาพรวม)
2. [โมเดลการยืนยันตัวตน — สองแบบในระบบเดียว](#2-โมเดลการยืนยันตัวตน--สองแบบในระบบเดียว)
3. [โครงสร้าง RBAC](#3-โครงสร้าง-rbac)
4. [การยืนยันตัวตน (Authentication) แยกพอร์ทัล](#4-การยืนยันตัวตน-authentication-แยกพอร์ทัล)
5. [Google SSO — กฎและรหัสตอบกลับ](#5-google-sso--กฎและรหัสตอบกลับ)
6. [การอนุญาต (Authorization)](#6-การอนุญาต-authorization)
7. [Token, Session และ Refresh](#7-token-session-และ-refresh)
8. [ความปลอดภัยเพิ่มเติม (As-is)](#8-ความปลอดภัยเพิ่มเติม-as-is)
9. [แผนภาพ Mermaid — สถานะการเข้าสู่ระบบ](#9-แผนภาพ-mermaid--สถานะการเข้าสู่ระบบ)
10. [แผนภาพ draw.io — ขอบเขตความปลอดภัย](#10-แผนภาพ-drawio--ขอบเขตความปลอดภัย)
11. [เอกสารอ้างอิง](#11-เอกสารอ้างอิง)
12. [ภาคผนวก — สังเคราะห์จาก Processes (Auth/User/PDPA)](#12-ภาคผนวก--สังเคราะห์จาก-processes-authuserpdpa)

---

## 1. ภาพรวม

ระบบ Izara **ไม่ใช้ Passport.js** — ใช้ middleware บน Express ที่เขียนเอง + `jsonwebtoken` + PostgreSQL

| พอร์ทัล | วิธียืนยันตัวตน | ตารางหลัก | ไฟล์หลัก |
|---------|----------------|-----------|----------|
| **Patient** | Session token (opaque string) | `sessions` | `Isara-patient-portal/backend/routes/auth.ts` |
| **Doctor / Admin** | JWT HS256 + refresh token | `sessions`, `refresh_tokens` | `Isara-doctor-portal/backend/authServer.cjs` |
| **Meeting API** | JWT เดียวกับ Doctor (`JWT_SECRET`) | — | `Izara-jitsi-server/backend/sessionAuth.js` |
| **GCS API (ถ้าเปิด)** | JWT | — | `Isara-doctor-portal/backend/gcsApiServer.cjs` |

**Authorization** ใช้ร่วมกัน: บทบาทจาก `users.role`, middleware ตรวจ token, OWASP `ROLE_PERMISSIONS`, และ PDPA `patient_consents` สำหรับข้อมูลผู้ป่วย

---

## 2. โมเดลการยืนยันตัวตน — สองแบบในระบบเดียว

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT PORTAL                                │
│  Login → bcrypt → INSERT sessions → คืน opaque token            │
│  ทุก API: Authorization: Bearer <opaque> → validateSession()    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DOCTOR / ADMIN PORTAL                         │
│  Login → authServer → bcrypt + lockout → JWT (3h) + refresh     │
│  Main API: Authorization: Bearer <JWT> → jwt.verify()           │
│  Auth Server: /auth/verify รองรับ session row หรือ JWT fallback │
└─────────────────────────────────────────────────────────────────┘
```

**เหตุผลที่แยก (ตามที่ implement จริง):** Patient Portal ออกแบบ session-first; Doctor Portal ออกแบบ JWT-first สำหรับ API หลักและ refresh rotation

---

## 3. โครงสร้าง RBAC

### 3.1 บทบาทในตาราง `users`

คอลัมน์ `role` มี CHECK constraint: `'doctor'`, `'admin'`, `'patient'` (จาก `izara-database.sql`)

| ค่า `role` | พอร์ทัล | ฟิลด์เสริม | คำอธิบาย |
|------------|---------|------------|----------|
| `patient` | Patient | `patient_id` = `users.id` | ผู้ป่วย — ลงทะเบียนที่ `/api/auth/register` |
| `doctor` | Doctor | `doctor_id`, `approval_status`, `is_approved` | แพทย์ — อาจ `pending` จนแอดมินอนุมัติ |
| `admin` | Doctor (เมนู admin) | `is_admin`, `admin_privileges` JSONB | ผู้ดูแลระบบ |

**Admin ไม่ใช่ role แยกใน deployment** — ใช้ Doctor Portal เดียวกัน ตรวจด้วย `role === 'admin'` **หรือ** `is_admin === true`

### 3.2 สิทธิ์ OWASP — Patient Portal

จาก `Isara-patient-portal/backend/middleware/owasp-middleware.ts`:

| บทบาท | สิทธิ์ (`ROLE_PERMISSIONS`) |
|--------|------------------------------|
| `admin` | `read:all`, `write:all`, `delete:all`, `manage:users`, `view:audit` |
| `doctor` | `read:patients`, `write:emr`, `read:appointments`, `write:appointments` |
| `patient` | `read:own`, `write:own`, `read:appointments`, `write:appointments`, `read:phr`, `write:phr` |

ฟังก์ชัน `checkPermission('read:phr')` ตรวจก่อนเข้า route ที่กำหนด

### 3.3 สิทธิ์ OWASP — Doctor Portal

จาก `Isara-doctor-portal/backend/security/owasp-middleware.cjs` (ชุดสิทธิ์กว้างกว่า):

| บทบาท | สิทธิ์ |
|--------|--------|
| `admin` | `read:all`, `write:all`, `delete:all`, `manage:users`, `manage:doctors`, `approve:doctors`, `view:audit` |
| `doctor` | `read:patients`, `write:emr`, `write:prescriptions`, `write:laborders`, `read:appointments`, `write:appointments` |
| `patient` | `read:own`, `write:own`, `read:appointments`, `write:appointments` |

### 3.4 การแยกสิทธิ์ระดับ Route (ตัวอย่างจริง)

| การกระทำ | เงื่อนไข As-is |
|----------|----------------|
| อนุมัติแพทย์ | `authenticateToken` + `requireAdmin` |
| เปิด PHR/EMR ผู้ป่วย | `authenticateToken` + `validateDoctorPatientAccess` + consent |
| API ประชุมสร้างห้อง | `authenticateToken` บน Meeting Server |
| Lobby admit/reject | `authenticateToken` (host) |

---

## 4. การยืนยันตัวตน (Authentication) แยกพอร์ทัล

### 4.1 ผู้ป่วย — ขั้นตอนละเอียด

| ลำดับ | ขั้นตอน | รายละเอียด |
|-------|---------|------------|
| 1 | UI | `LoginPage.tsx` / `RegisterPage.tsx` |
| 2 | Rate limit | `authRateLimit` บน production (`RATE_LIMIT_MAX` ต่อ IP) |
| 3 | Login API | `POST /api/auth/login` body: `{ email, password }` |
| 4 | ตรวจรหัสผ่าน | `bcrypt.compare` กับ `users.password_hash` |
| 5 | Session | invalidate session เก่า (ถ้ามี logic) → `INSERT INTO sessions` อายุ **7 วัน** |
| 6 | Token format | `token_${Date.now()}_...` (opaque) |
| 7 | Response | `{ user, token }` |
| 8 | Client | `AuthContext.tsx` เก็บ `auth_token`, `izara_user` ใน `localStorage` |
| 9 | Protected routes | `authMiddleware` ทุก `/api/*` ที่ต้องล็อกอิน |

**Register:** `POST /api/auth/register` → `role = 'patient'` แบบ hard-code → สร้างแถว `phr` → auto-login session

**Reset password:** `password_resets` table — token ครั้งเดียว + `expires_at`

### 4.2 แพทย์และแอดมิน — ขั้นตอนละเอียด

| ลำดับ | ขั้นตอน | รายละเอียด |
|-------|---------|------------|
| 1 | UI | `LoginPage.tsx`, `AuthProvider.tsx` |
| 2 | Login API | `POST /auth/login` → `authServer.cjs` (พอร์ต **3011** แยกจาก main 3010) |
| 3 | Lockout | `login_attempts`, `locked_until` บน `users` |
| 4 | Approval | ถ้า `approval_status = pending` → 403 `PENDING_APPROVAL` |
| 5 | JWT | `generateJWT()` — อายุ **3 ชม.** |
| 6 | Refresh | `INSERT refresh_tokens` — hash SHA-256, อายุ **30 วัน** |
| 7 | Session row | `pgCreateSession()` (optional parallel track) |
| 8 | Client | `token`, `izara_refresh_token`, `izara_current_user` |
| 9 | Main API | nginx proxy → `mainApiServer.cjs` → `authenticateToken` |

**Register แพทย์:** `POST /auth/register` → `role = 'doctor'`, มัก `approval_status = 'pending'`, `is_approved = false`

**Verify session หลัง reload:** `GET /auth/verify` — ตรวจ session DB หรือ JWT

### 4.3 การลงทะเบียนแพทย์และการอนุมัติ (Admin)

| Endpoint (ตัวอย่าง) | Middleware | ผลลัพธ์ |
|---------------------|------------|---------|
| `GET /auth/admin/pending-doctors` | `authenticateToken`, `requireAdmin` | รายการรออนุมัติ |
| `POST /auth/admin/approve-doctor` | `requireAdmin` | `approval_status = approved` |
| `POST /auth/admin/reject-doctor` | `requireAdmin` | `approval_status = rejected` |
| `POST /auth/admin/update-role` | `requireAdmin` | เปลี่ยน role/privileges |

---

## 5. Google SSO — กฎและรหัสตอบกลับ

ใช้ `@react-oauth/google` ฝั่ง client ส่ง **Google ID token** มาที่ backend ตรวจด้วย `google-auth-library` (`verifyIdToken`)

| พอร์ทัล | Endpoint |
|---------|----------|
| Patient | `POST /api/auth/google-auth` body: `{ idToken, portal: 'patient' }` |
| Doctor | `POST /auth/google-auth` body: `{ idToken }` |

### 5.1 กฎที่ backend บังคับ (Doctor — จาก `authServer.cjs`)

| รหัส `code` | HTTP | ความหมาย |
|-------------|------|----------|
| `MISSING_TOKEN` | 400 | ไม่ส่ง idToken |
| `SSO_DISABLED` | 503 | ไม่ตั้ง `GOOGLE_CLIENT_ID` |
| `INVALID_GOOGLE_TOKEN` | 401 | verify ล้มเหลว |
| `EMAIL_NOT_VERIFIED` | 403 | email Google ยังไม่ verify |
| `NOT_REGISTERED` | 404 | ไม่มีบัญชีในระบบ — **ไม่สร้างอัตโนมัติ** |
| `PASSWORD_NOT_SET` | 403 | บัญชีเป็น stub `!google-sso!` เท่านั้น |
| `GOOGLE_ACCOUNT_MISMATCH` | 409 | `google_sub` ไม่ตรงกับที่เคยผูก |
| `ROLE_MISMATCH` | 403 | ไม่ใช่ doctor/admin |
| `PENDING_APPROVAL` | 403 | แพทย์รออนุมัติ |
| `ACCOUNT_REJECTED` | 403 | ถูกปฏิเสธ |
| `ACCOUNT_DEACTIVATED` | 403 | `is_active = false` |

เมื่อสำเร็จ: ออก **JWT + refresh + session** เหมือน login รหัสผ่าน

### 5.2 Patient Google SSO

กฎคล้ายกัน (existing email only, password required) — คืน **session token** แทน JWT

### 5.3 Config ฝั่ง client

- `GET /auth/public-config` หรือ config service — คืน `googleClientId`, `googleSsoEnabled`
- Env: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID`

---

## 6. การอนุญาต (Authorization)

### 6.1 Middleware หลัก

| Middleware | ไฟล์ | การทำงาน |
|------------|------|-----------|
| `authMiddleware` | Patient `middleware/auth.ts` | `Bearer` → `AuthService.validateSession(token)` → `req.user` |
| `authenticateToken` | Doctor `mainApiServer.cjs`, `authServer.cjs` | `jwt.verify(JWT_SECRET, issuer: izara-telemedicine, HS256)` |
| `requireAdmin` | `authServer.cjs` | `req.user.role === 'admin' \|\| req.user.isAdmin` |
| `requireRole(...)` | Meeting `jwtPolicy.js` | ชุด role ที่อนุญาต + ขยาย doctor/moderator |
| `checkPermission` | OWASP middleware | ตรวจ string permission |
| `verifyResourceOwnership` | OWASP | patient อ่านได้เฉพาะของตัวเอง; admin bypass |

### 6.2 PDPA — `validateDoctorPatientAccess`

ใน `mainApiServer.cjs` ก่อนเปิด PHR/EMR/EHR:

```sql
SELECT id FROM patient_consents
 WHERE patient_id = $1 AND doctor_id = $2
   AND granted = true AND status = 'active'
```

ถ้าไม่มี consent → **403** — แพทย์ไม่เห็นข้อมูลผู้ป่วยคนนั้น

### 6.3 การแยก route ฝั่ง UI

| พอร์ทัล | กลไก |
|---------|------|
| Patient | `App.tsx` — ไม่มี token → redirect `/login` |
| Doctor | `AuthProvider.tsx` — restore จาก localStorage → `/auth/verify` → redirect ตาม role |
| Admin pages | component ตรวจ `user.isAdmin \|\| user.role === 'admin'` |

### 6.4 Meeting Server — การยืนยันตัวตน API

```javascript
// jwtPolicy.js — สรุป
createAuthenticateToken(JWT_SECRET)  // 401 ถ้าไม่มี Bearer
requireRole('doctor', 'admin')       // 403 ถ้า role ไม่ตรง
```

`req.user` มาจาก JWT payload: `userId`, `role`, `isAdmin`, `doctorId`

---

## 7. Token, Session และ Refresh

### 7.1 ตัวแปร Environment (JWT)

| ตัวแปร | ค่าในระบบ | หมายเหตุ |
|---------|-----------|----------|
| `JWT_SECRET` / `VITE_JWT_SECRET` | บังคับ — process อาจ exit ถ้าไม่มี | ใช้ร่วม Doctor + Meeting |
| `JWT_ISSUER` | `izara-telemedicine` | ต้องตรงทุก service |
| `JWT_EXPIRES_IN` | `3h` | access token แพทย์ |
| Algorithm | **HS256 เท่านั้น** | ไม่รับ alg อื่น |

**Payload JWT** (`generateJWT`):

```javascript
{
  userId: user.id,
  email: user.email,
  role: user.role,
  name: user.name,
  doctorId: user.doctor_id || null,
  isAdmin: user.is_admin || false
}
```

### 7.2 Refresh Token Rotation

| รายการ | ค่า |
|--------|-----|
| Endpoint | `POST /auth/refresh` |
| เก็บ | `refresh_tokens.token_hash` (SHA-256 ของ raw token) |
| อายุ | 30 วัน (`REFRESH_TOKEN_EXPIRES_DAYS`) |
| Client ส่ง | `refreshToken` ใน body |
| ผลลัพธ์ | JWT ใหม่ + refresh ใหม่ (rotation) |

### 7.3 Session ผู้ป่วย

| รายการ | ค่า |
|--------|-----|
| ตาราง | `sessions` |
| ตรวจ | `token = $1 AND expires_at > NOW() AND logged_out_at IS NULL` |
| Logout | ตั้ง `logged_out_at` |

### 7.4 localStorage keys (As-is)

| พอร์ทัล | Keys |
|---------|------|
| Patient | `auth_token`, `izara_user`, `izara_patient_last_activity` |
| Doctor | `token`, `izara_refresh_token`, `izara_current_user`, keys กิจกรรม/inactivity |

### 7.5 Client-side Inactivity

| พอร์ทัล | พฤติกรรม |
|---------|----------|
| Patient | `AuthContext` — timeout จาก `izara_patient_last_activity` |
| Doctor | `authServices.ts` / `useAuth.ts` — ~**3 ชั่วโมง** ไม่มีกิจกรรม → logout |

### 7.6 WebSocket บน Auth Server

Socket.IO บน `authServer.cjs`:

- Client ส่ง token ตอน connect
- Server `pgValidateSession(token)` หรือ verify JWT
- Join room `user-{user_id}` สำหรับแจ้งเตือน/auth events

### 7.7 JWT สองชั้น — แอป Izara vs Jitsi room

ระบบใช้ JWT **คนละชุด** — ห้ามสับสน:

| ชั้น | Secret | Issuer | ใช้เมื่อ |
|------|--------|--------|----------|
| **App access** | `JWT_SECRET` (≥32 ตัวอักษร) | `izara-telemedicine` | Doctor login, `Authorization: Bearer` บน Main API และ Meeting API |
| **Jitsi room** | `JITSI_JWT_SECRET` / `JITSI_APP_SECRET` | `JWT_ISSUER` | Self-hosted Jitsi token auth — `createJitsiRoleJwt` |

**Jitsi room payload (HS256):** `aud: 'jitsi'`, `sub: <domain>`, `room: <roomName>`, `context.user.moderator`, `context.user.affiliation` (`owner` / `member` / `none`).

| Role | `moderator` | `affiliation` |
|------|-------------|---------------|
| doctor / host | `true` | `owner` |
| patient | `false` | `member` |
| guest (invite) | `false` | `none` |

**Guest join-config:** anonymous `role=guest` ถูกปฏิเสธ (`GUEST_AUTH_REQUIRED`) จนกว่าจะมี scoped invite token (`type: guest-invite`) — `validateGuestJoinAccess` / `decodeGuestInviteToken` ใน `jwtPolicy.js`.

**Public `meet.jit.si`:** ไม่ส่ง room JWT; แพทย์ใช้ `configOverwrite.moderator: true` ผ่าน `buildDoctorJitsiMountOptions`.

---

## 8. ความปลอดภัยเพิ่มเติม (As-is)

| หัวข้อ | การทำงานใน codebase |
|--------|---------------------|
| Rate limiting | Patient auth routes — per-IP ใน production |
| Login lockout | Doctor — `login_attempts` / `locked_until` |
| Audit | `securityAuditLog` ใน OWASP middleware (ACCESS_DENIED, GOOGLE_SSO_UNKNOWN_EMAIL) |
| CORS | กำหนดต่อ service ใน env |
| ไม่มี Passport | ไม่พบ `passport` ใน dependencies หลัก |
| Meeting guest token | `verifyScopedToken` / `decodeGuestInviteToken` — invite `type: guest-invite` (ไม่มี issuer) |

---

## 9. แผนภาพ Mermaid — สถานะการเข้าสู่ระบบ

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated

    state Unauthenticated {
        [*] --> AtLoginPage
    }

    Unauthenticated --> AuthenticatingPassword : email + password
    Unauthenticated --> AuthenticatingGoogle : Google ID token

    AuthenticatingPassword --> PatientAuthenticated : patient OK
    AuthenticatingPassword --> DoctorAuthenticated : doctor OK approved
    AuthenticatingPassword --> AdminAuthenticated : admin OK
    AuthenticatingPassword --> PendingApproval : doctor pending
    AuthenticatingPassword --> Rejected : doctor rejected
    AuthenticatingPassword --> Locked : locked_until active
    AuthenticatingPassword --> Unauthenticated : wrong password

    AuthenticatingGoogle --> PatientAuthenticated : patient SSO OK
    AuthenticatingGoogle --> DoctorAuthenticated : doctor SSO OK
    AuthenticatingGoogle --> Unauthenticated : NOT_REGISTERED
    AuthenticatingGoogle --> Unauthenticated : PASSWORD_NOT_SET
    AuthenticatingGoogle --> PendingApproval : PENDING_APPROVAL
    AuthenticatingGoogle --> Unauthenticated : GOOGLE_ACCOUNT_MISMATCH

    Locked --> Unauthenticated : wait / admin unlock

    PatientAuthenticated --> Unauthenticated : logout / session expire
    DoctorAuthenticated --> Unauthenticated : logout / JWT expire
    AdminAuthenticated --> Unauthenticated : logout / JWT expire

    state PatientAuthenticated {
        note right: sessions.token 7d opaque
    }
    state DoctorAuthenticated {
        note right: JWT 3h + refresh 30d
    }
```

---

## 10. แผนภาพ draw.io — ขอบเขตความปลอดภัย

```xml
<mxfile host="app.diagrams.net" agent="Isara-Auth-Boundary-v2" version="21.0.0">
  <diagram name="Security Boundaries" id="auth-boundary-as-is">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1300" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" value="Izara — ขอบเขตความปลอดภัย Authentication (As-is)" style="text;html=1;align=center;fontSize=16;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="250" y="15" width="800" height="35" as="geometry" />
        </mxCell>
        <mxCell id="zone_public" value="Zone 1 — Untrusted (Browser)" style="swimlane;startSize=30;fillColor=#FFEBEE;strokeColor=#C62828;dashed=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="70" width="300" height="240" as="geometry" />
        </mxCell>
        <mxCell id="browser" value="React SPA&#xa;localStorage: token / session" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_public">
          <mxGeometry x="25" y="45" width="250" height="55" as="geometry" />
        </mxCell>
        <mxCell id="google" value="Google OAuth&#xa;ID Token (client-side)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF9C4;" vertex="1" parent="zone_public">
          <mxGeometry x="25" y="115" width="250" height="45" as="geometry" />
        </mxCell>
        <mxCell id="guest" value="Guest join link&#xa;(scoped JWT / invite)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFE0B2;" vertex="1" parent="zone_public">
          <mxGeometry x="25" y="175" width="250" height="45" as="geometry" />
        </mxCell>
        <mxCell id="zone_edge" value="Zone 2 — Edge (Cloud Run HTTPS)" style="swimlane;startSize=30;fillColor=#E3F2FD;strokeColor=#1565C0;" vertex="1" parent="1">
          <mxGeometry x="380" y="70" width="340" height="320" as="geometry" />
        </mxCell>
        <mxCell id="patient_api" value="Patient API :3005&#xa;authMiddleware → sessions" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_edge">
          <mxGeometry x="25" y="45" width="290" height="50" as="geometry" />
        </mxCell>
        <mxCell id="main_api" value="Doctor Main API :3010&#xa;authenticateToken (JWT)" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_edge">
          <mxGeometry x="25" y="110" width="290" height="50" as="geometry" />
        </mxCell>
        <mxCell id="meeting_api" value="Meeting :3020&#xa;jwtPolicy + requireRole" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_edge">
          <mxGeometry x="25" y="175" width="290" height="50" as="geometry" />
        </mxCell>
        <mxCell id="pdpa" value="validateDoctorPatientAccess&#xa;patient_consents" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#BBDEFB;" vertex="1" parent="zone_edge">
          <mxGeometry x="25" y="240" width="290" height="45" as="geometry" />
        </mxCell>
        <mxCell id="zone_auth" value="Zone 3 — Auth Server :3011" style="swimlane;startSize=30;fillColor=#E8F5E9;strokeColor=#2E7D32;" vertex="1" parent="1">
          <mxGeometry x="380" y="410" width="340" height="130" as="geometry" />
        </mxCell>
        <mxCell id="auth_srv" value="login | refresh | google-auth&#xa;register | requireAdmin routes" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_auth">
          <mxGeometry x="25" y="45" width="290" height="65" as="geometry" />
        </mxCell>
        <mxCell id="zone_data" value="Zone 4 — Trusted Data (GCE VM Postgres)" style="swimlane;startSize=30;fillColor=#F3E5F5;strokeColor=#6A1B9A;" vertex="1" parent="1">
          <mxGeometry x="760" y="70" width="280" height="470" as="geometry" />
        </mxCell>
        <mxCell id="users_tbl" value="users&#xa;role, is_admin, approval_status" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_data">
          <mxGeometry x="30" y="50" width="220" height="45" as="geometry" />
        </mxCell>
        <mxCell id="sessions_tbl" value="sessions&#xa;patient opaque token" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_data">
          <mxGeometry x="30" y="110" width="220" height="45" as="geometry" />
        </mxCell>
        <mxCell id="refresh_tbl" value="refresh_tokens&#xa;SHA-256 hash" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_data">
          <mxGeometry x="30" y="170" width="220" height="45" as="geometry" />
        </mxCell>
        <mxCell id="consent_tbl" value="patient_consents&#xa;PDPA grant" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_data">
          <mxGeometry x="30" y="230" width="220" height="45" as="geometry" />
        </mxCell>
        <mxCell id="audit_tbl" value="audit_logs / securityAuditLog" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="zone_data">
          <mxGeometry x="30" y="290" width="220" height="45" as="geometry" />
        </mxCell>
        <mxCell id="b1" value="Bearer session" style="endArrow=classic;" edge="1" parent="1" source="browser" target="patient_api">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="b2" value="Bearer JWT" style="endArrow=classic;" edge="1" parent="1" source="browser" target="main_api">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="b3" value="login/refresh" style="endArrow=classic;" edge="1" parent="1" source="browser" target="auth_srv">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="b4" value="SQL TLS" style="endArrow=classic;" edge="1" parent="1" source="auth_srv" target="sessions_tbl">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="b5" value="Bearer JWT" style="endArrow=classic;" edge="1" parent="1" source="browser" target="meeting_api">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## 11. เอกสารอ้างอิง

| ไฟล์ | เนื้อหา |
|------|---------|
| `Isara-doctor-portal/backend/authServer.cjs` | Login, JWT, Google SSO, admin, refresh |
| `Isara-doctor-portal/backend/mainApiServer.cjs` | API JWT, PDPA guard |
| `Isara-doctor-portal/backend/security/owasp-middleware.cjs` | RBAC doctor |
| `Isara-patient-portal/backend/routes/auth.ts` | Patient auth + Google |
| `Isara-patient-portal/backend/middleware/auth.ts` | Session middleware |
| `Izara-jitsi-server/backend/sessionAuth.js` | Meeting API auth |
| `Processes/User_management_Workflows.md` | สเปก workflow ผู้ใช้ |
| `Processes/FULL_WORKFLOW_CONTRACT.md` §1 Auth | regression must-pass |

---

## 12. ภาคผนวก — สังเคราะห์จาก Processes (Auth/User/PDPA)

### 12.1 หน้าจอที่เกี่ยวกับการยืนยันตัวตนและผู้ใช้

| สเปก Processes | ขั้นตอนหลัก (As-is) | Endpoint / ตาราง |
|----------------|---------------------|------------------|
| `Patient-Portal/01_Login_Page.md` | email+password หรือ Google → เก็บ token `localStorage` | `POST /api/auth/login`, `sessions` |
| `Patient-Portal/02_Register_Page.md` | ข้อมูลส่วนตัว + PDPA checkbox | `POST /api/auth/register` |
| `Patient-Portal/03_Reset_Password_Page.md` | อีเมล → ลิงก์ token | `password_resets` |
| `Patient-Portal/12_Profile_Page.md` | แก้ชื่อ/รูป — ต้องมี session | `PATCH` profile APIs |
| `Doctor-Portal/01_Login_Page.md` | tab login/register, lockout | `POST /auth/login` → JWT |
| `Doctor-Portal/02_Reset_Password_Page.md` | forgot → `/reset-password?token=` | `POST /auth/reset-password` |
| `Doctor-Portal/16_Doctor_Profile_Page.md` | แก้ `doctor_profiles` | JWT บน Main API |
| `Doctor-Portal/18_Admin_Doctor_Management.md` | approve/reject แพทย์ใหม่ | `requireAdmin`, `approval_status` |
| `Doctor-Portal/19_Doctors_Management_Page.md` | ดูรายชื่อแพทย์ | admin/doctor directory |

### 12.2 Google SSO (จากสเปกหน้า Login ทั้งสองพอร์ทัล)

| `code` ตอบกลับ | ความหมาย | การปฏิบัติของ UI |
|----------------|----------|------------------|
| (success) | token ถูกต้อง | redirect dashboard |
| `GOOGLE_ACCOUNT_NOT_FOUND` | ไม่มีบัญชี | แนะนำ register |
| `GOOGLE_EMAIL_MISMATCH` | อีเมลไม่ตรง | แสดงข้อความ |
| `DOCTOR_PENDING_APPROVAL` | แพทย์รออนุมัติ | หน้ารอ (Doctor) |
| `DOCTOR_NOT_APPROVED` | ถูกปฏิเสธ | บล็อกเข้า |

### 12.3 PDPA และความยินยอม (`Patient-Portal/10_PDPA_Page.md`)

- ผู้ป่วนเปิด/ปิดการแชร์ข้อมูลต่อแพทย์ → `patient_consents.granted`
- แพทย์เปิด PHR/EMR ต้องผ่าน `validateDoctorPatientAccess` ใน `mainApiServer.cjs`
- Living Will (`11_Living_Will_Page.md`) แยกตาราง `living_wills` — ไม่แทน consent ทั่วไป

### 12.4 สิทธิ์ Admin (จาก `00_Doctor_Portal_Overview` + `17`–`18`)

| การกระทำ | Middleware | หมายเหตุ |
|----------|------------|----------|
| อนุมัติแพทย์ | `requireAdmin` บน authServer | อัปเดต `is_approved`, `approval_status` |
| มอบหมายนัด pool | admin routes Main API | ไม่ได้เป็น Jitsi HOST |
| ดูผู้ป่วยทั้งหมด | `role === 'admin'` | OWASP ขยายสิทธิ์อ่าน |

### 12.5 Must-pass จาก `FULL_WORKFLOW_CONTRACT.md` (โดเมน Auth)

- Patient login/register/reset สร้าง session ถูกต้อง
- Doctor/admin login แยก route guard
- Google SSO โหลดปุ่มและจัดการ redirect/fallback
- API ปฏิเสธ JWT/session ที่หายหรือผิด
- ผู้ป่วยเข้า route แพทย์ไม่ได้ (และกลับกัน)

---

**ไฟล์ถัดไป:** [03_Data_Storage_Architecture.md](03_Data_Storage_Architecture.md)
