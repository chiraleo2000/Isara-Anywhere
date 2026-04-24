# 🔑 Patient Portal — Reset Password Page

**Route:** `/reset-password?token=xxx`
**Component:** `src/pages/auth/ResetPasswordPage.tsx`
**Access:** Public (via email link)
**Thai Title:** รีเซ็ตรหัสผ่าน

---


## 1. Purpose

Allows patients to reset their password using a time-limited token received via email.

---


## 2. Page States


### State 1: Verifying Token

```text
┌────────────────────────────────────────┐
│                                        │
│     ⏳ กำลังตรวจสอบลิงก์...              │
│     Verifying your reset link...       │
│                                        │
└────────────────────────────────────────┘
```


### State 2: Invalid/Expired Token

```text
┌────────────────────────────────────────┐
│                                        │
│     ❌ ลิงก์ไม่ถูกต้องหรือหมดอายุ        │
│     Invalid or expired reset link      │
│                                        │
│     [กลับไปหน้าเข้าสู่ระบบ]              │
│                                        │
└────────────────────────────────────────┘
```


### State 3: Reset Form

```text
┌────────────────────────────────────────┐
│                                        │
│     🔑 ตั้งรหัสผ่านใหม่                  │
│                                        │
│     รหัสผ่านใหม่:                        │
│     [________________] [👁️]            │
│                                        │
│     ยืนยันรหัสผ่าน:                      │
│     [________________] [👁️]            │
│                                        │
│     ความปลอดภัย:                        │
│     [■■■■□□□□] ปานกลาง                 │
│     ✅ อย่างน้อย 8 ตัวอักษร               │
│     ✅ มีตัวเลข                          │
│     ⬜ มีตัวอักษร                        │
│                                        │
│     [     รีเซ็ตรหัสผ่าน     ]            │
│                                        │
└────────────────────────────────────────┘
```


### State 4: Success

```text
┌────────────────────────────────────────┐
│                                        │
│     ✅ รีเซ็ตรหัสผ่านสำเร็จ!             │
│     Password reset successful!         │
│                                        │
│     [ไปหน้าเข้าสู่ระบบ]                  │
│                                        │
└────────────────────────────────────────┘
```

---


## 3. Password Strength Indicators

| Indicator | Requirement |
| --------- | ----------- |
| ✅ Minimum length | 8+ characters |
| ✅ Has number | At least 1 digit |
| ✅ Has letter | At least 1 letter |

Visual progress bar shows strength level with color coding.

---


## 4. Workflow

```text
Step 1: Patient clicks reset link from email
Step 2: Page extracts token from URL query parameter
Step 3: GET /api/auth/verify-reset-token?token=xxx
Step 4: Token valid → Shows reset form
Step 5: Patient enters new password (with strength indicators)
Step 6: Patient confirms password (must match)
Step 7: Clicks "รีเซ็ตรหัสผ่าน" (Reset Password)
Step 8: POST /api/auth/reset-password { token, newPassword }
Step 9: Success → Shows success message → Link to login
Step 10: Invalid token → Shows error → Link to login
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/auth/verify-reset-token` | Validate reset token |
| POST | `/api/auth/reset-password` | Submit new password |

---


## 6. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Success → Login link | → Login Page (`/login`) |
| Invalid token → Login link | → Login Page (`/login`) |

---


## 7. AI Agent Improvement Opportunities


- **Breach detection**: Check if new password appears in known breaches


- **Password suggestions**: AI-generated secure password suggestions


- **Activity verification**: Additional identity verification before reset

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT/UPDATE | Look up user by email, update password_hash |
| password_resets | INSERT/UPDATE | Create reset token, mark token as used |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/auth/reset-request | POST | SELECT users WHERE email; INSERT password_resets |
| POST /api/auth/reset-password | POST | SELECT password_resets WHERE token; UPDATE users SET password_hash; UPDATE password_resets SET used |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
