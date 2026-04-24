# 🔐 Patient Portal — Login Page

**Route:** `/login`
**Component:** `src/pages/auth/LoginPage.tsx`
**Access:** Public (unauthenticated users only)
**Thai Title:** เข้าสู่ระบบ

---


## 1. Purpose

Entry point for patient authentication. Provides login form, forgot password flow, and link to registration.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  [🌙 Theme Toggle]  [🌐 Language Toggle]                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              🏥 Izara Patient Portal                        │   │
│  │              อิสระ เทเลเมดิซิน                                │   │
│  │                                                             │   │
│  │  ┌──────────────────────────────────┐                       │   │
│  │  │  📧 อีเมล                         │                       │   │
│  │  │  [email input                   ]│                       │   │
│  │  │                                  │                       │   │
│  │  │  🔑 รหัสผ่าน                      │                       │   │
│  │  │  [password input          ] [👁️] │                       │   │
│  │  │                                  │                       │   │
│  │  │  [       เข้าสู่ระบบ        ]     │                       │   │
│  │  │                                  │                       │   │
│  │  │  ลืมรหัสผ่าน?                     │                       │   │
│  │  │  ยังไม่มีบัญชี? สมัครสมาชิก        │                       │   │
│  │  └──────────────────────────────────┘                       │   │
│  │                                                             │   │
│  │  🔒 ข้อมูลของคุณได้รับการคุ้มครองตาม PDPA                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. View Modes


### 3.1 Login Form (Default)

| Element | Type | Details |
| ------- | ---- | ------- |
| Email input | Text field | Required, email validation |
| Password input | Password field | Required, show/hide toggle (eye icon) |
| Login button | Button (emerald) | Triggers authentication |
| Forgot password link | Text link | Switches to forgot password view |
| Register link | Text link | Navigates to `/register` |
| PDPA notice | Footer text | Data protection statement |


### 3.2 Forgot Password

| Element | Type | Details |
| ------- | ---- | ------- |
| Email input | Text field | Required, email format |
| Send reset link button | Button | Sends password reset email |
| Back to login link | Text link | Returns to login form |


### 3.3 Reset Link Sent

| Element | Type | Details |
| ------- | ---- | ------- |
| Success message | Text | Confirms email sent |
| Expiry notice | Text | "Link expires in 1 hour" |
| Back to login button | Button | Returns to login form |

---


## 4. Workflows


### Workflow 1: Standard Login

```text
Step 1: Patient enters email and password
Step 2: Clicks "เข้าสู่ระบบ" (Login) button
Step 3: System calls AuthContext.login(email, password)
Step 4: POST /api/auth/login → Backend validates credentials
Step 5: Success → Session created → Redirect to Dashboard (/)
Step 6: Failure → Error message displayed ("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
```


### Workflow 2: Forgot Password

```text
Step 1: Patient clicks "ลืมรหัสผ่าน?" (Forgot password)
Step 2: View switches to forgot password form
Step 3: Patient enters registered email
Step 4: Clicks "ส่งลิงก์รีเซ็ต" (Send reset link)
Step 5: POST /api/auth/request-password-reset
Step 6: Success → Shows confirmation with 1-hour expiry
Step 7: Patient receives email with reset link
Step 8: Clicks link → Redirects to /reset-password?token=xxx
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/login` | Authenticate with email + password |
| POST | `/api/auth/request-password-reset` | Send password reset email |

---


## 6. Validation Rules

| Field | Rule |
| ----- | ---- |
| Email | Required, valid email format |
| Password | Required, minimum length enforced |

---


## 7. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Successful login | → Dashboard (`/`) |
| Register link | → Register Page (`/register`) |
| Reset password email | → Reset Password Page (`/reset-password`) |

---


## 8. AI Agent Improvement Opportunities


- **Biometric login**: Face/fingerprint authentication


- **Smart login**: Remember device, auto-fill


- **Suspicious activity detection**: Alert on unusual login patterns


- **Multi-factor authentication**: SMS/TOTP second factor

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT | Query by email, verify password_hash |
| sessions | INSERT | Create session token on successful login |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/auth/login | POST | SELECT users WHERE email; verify crypt(password, password_hash); INSERT sessions |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
