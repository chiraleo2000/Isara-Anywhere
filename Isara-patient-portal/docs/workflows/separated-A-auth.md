# A. Authentication & User Management (Patient)

> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §A`
> **Synced:** 2025-06-25
> **Portal:** Patient (`Isara-patient-portal`)
> **Use:** Workflow excerpt — edit canonical copy in platform `Processes/`; refresh via `npm run docs:sync-to-apps`.

---
## A. Authentication & User Management


### A1. Patient Registration

**Pages:** `RegisterPage.tsx`
**API:** `POST /api/auth/register`
**Tables:** `users`, `patient_profiles`, `phr`

```text
Process:
1. Patient fills Step 1: name, email, password, phone, DOB, gender
2. Patient fills Step 2: blood type, allergies, chronic conditions, medications
3. Frontend validates all fields
4. POST /api/auth/register with all data
5. Server checks email uniqueness
6. Server hashes password (bcrypt)
7. INSERT INTO users (role='patient')
8. INSERT INTO patient_profiles
9. INSERT INTO phr (initial health data)
10. Return JWT token → auto-login
```


## Features


- 2-step wizard with progress indicator


- Thai/English bilingual form


- Client-side validation (email format, password strength)


- Server-side validation (email uniqueness)


- Auto-login after registration

---


### A2. Patient Login

**Pages:** `LoginPage.tsx`
**API:** `POST /api/auth/login`
**Tables:** `users`, `sessions`

```text
Process:
1. Patient enters email + password
2. POST /api/auth/login
3. Server SELECT user by email
4. Check account locked (login_attempts >= 5)
5. Verify password with bcrypt
6. If fail: INCREMENT login_attempts, check lockout
7. If success: RESET login_attempts
8. INSERT INTO sessions (token, ip, user_agent, expires_at)
9. UPDATE users SET last_login = NOW()
10. Return JWT + user profile
```


## Features


- Email/password login


- Account lockout after 5 failures (15-min cooldown)


- Session tracking with IP + user-agent


- 3-hour session timeout


- "Forgot Password" link → email flow

---



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
