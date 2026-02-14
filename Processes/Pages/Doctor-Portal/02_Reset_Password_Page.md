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
