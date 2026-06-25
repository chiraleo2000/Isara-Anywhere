> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §A`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Doctor login (A3) and password reset (A4) — edit canonical copy in platform `Processes/`.

### A3. Doctor/Admin Login

**Pages:** `LoginPage.tsx` (Doctor Portal)
**API:** `POST /api/auth/login`
**Tables:** `users`, `sessions`

```text
Process:
1. Same as patient login
2. Additional check: is_approved must be true
3. Additional check: approval_status = 'approved'
4. If not approved: return "Account pending approval" error
5. Role determines available features (doctor vs admin)
```


## Features


- Same login flow as patient


- Approval gate (admin must approve first)


- Role-based redirect (doctor dashboard vs admin dashboard)

---


### A4. Password Reset

**Pages:** `ResetPasswordPage.tsx`
**API:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
**Tables:** `users`, `password_resets`

```text
Process:
1. User enters email on forgot-password form
2. POST /api/auth/forgot-password
3. Server generates secure token (crypto.randomBytes)
4. INSERT INTO password_resets (token, expires_at = +1 hour)
5. Send email via Gmail API with reset link
6. User clicks link → /reset-password?token=xxx
7. Frontend shows new password form
8. POST /api/auth/reset-password (token + new password)
9. Server validates token (not expired, not used)
10. UPDATE users SET password_hash = new hash
11. UPDATE password_resets SET used = true
```

---
