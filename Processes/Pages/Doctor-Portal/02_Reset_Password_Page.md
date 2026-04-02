# 🔑 Doctor Portal — Reset Password Page

**Route:** `/reset-password?token=xxx`
**Component:** `src/pages/ResetPasswordPage.tsx`
**Access:** Public (via email link)
**Thai Title:** รีเซ็ตรหัสผ่าน

---

## 1. Purpose

Password reset for doctors and admins using a time-limited token received via email. Identical flow to patient portal but scoped to doctor portal credentials.

---

## 2. Page States & Workflow

```text
[Email Link] → Verify Token → Show Form → Submit → Success
                    │
                    └── Invalid → Error + Back to Login
```

### Password Strength Requirements

- ✅ Minimum 8 characters

- ✅ Contains at least 1 number

- ✅ Contains at least 1 letter

---

## 3. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/auth/verify-reset-token` | Validate token |
| POST | `/auth/reset-password` | Submit new password |

---

## 4. Connections

| Action | Destination |
| ------ | ----------- |
| Success | → Login Page (`/login`) |
| Invalid token | → Login Page (`/login`) |

For full layout details, see Patient Portal [03_Reset_Password_Page.md](../Patient-Portal/03_Reset_Password_Page.md) — same UX pattern.

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
