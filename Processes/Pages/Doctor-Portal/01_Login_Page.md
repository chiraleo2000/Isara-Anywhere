# 🔐 Doctor Portal — Login Page

**Route:** `/login`
**Component:** `src/pages/LoginPage.tsx`
**Access:** Public (unauthenticated users only)
**Thai Title:** เข้าสู่ระบบ Izara Doctor Portal

---


## 1. Purpose

Authentication and registration entry point for doctors and administrators. Supports login, registration (with admin approval requirement), and password reset.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌── Left Column (Branding) ───────┬── Right Column (Form) ─────────┐ │
│  │                                 │                                 │ │
│  │  🏥 Izara Doctor Portal         │  View: [Login | Register]      │ │
│  │                                 │                                 │ │
│  │  "ระบบจัดการสำหรับแพทย์          │  ┌── Login Form ─────────────┐ │ │
│  │   อิสระ เทเลเมดิซิน"             │  │ 📧 Email: [____________] │ │ │
│  │                                 │  │ 🔑 Password: [_____] [👁️] │ │ │
│  │  Features:                      │  │                           │ │ │
│  │  ✅ การนัดหมายออนไลน์            │  │ [    เข้าสู่ระบบ    ]      │ │ │
│  │  ✅ บันทึกเวชระเบียน             │  │                           │ │ │
│  │  ✅ สั่งยาอิเล็กทรอนิกส์          │  │ ลืมรหัสผ่าน?              │ │ │
│  │  ✅ AI ผู้ช่วยแพทย์              │  └───────────────────────────┘ │ │
│  │                                 │                                 │ │
│  └─────────────────────────────────┴─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---


## 3. View Modes


### 3.1 Login Form

| Field | Type | Required | Details |
| ----- | ---- | -------- | ------- |
| Email | Text | ✅ | Email validation |
| Password | Password | ✅ | Show/hide toggle, min 8 chars |


### 3.2 Registration Form

| Field | Type | Required | Options |
| ----- | ---- | -------- | ------- |
| ชื่อ-นามสกุล (Name) | Text | ✅ | — |
| อีเมล (Email) | Email | ✅ | Email validation |
| เลขใบอนุญาตประกอบวิชาชีพ (License) | Text | ✅ | Medical license number |
| เบอร์โทร (Phone) | Tel | ✅ | — |
| วันเกิด (Date of Birth) | Date | ✅ | — |
| สาขาเฉพาะทาง (Specialty) | Select | ✅ | 14 specialties |
| รหัสผ่าน (Password) | Password | ✅ | Min 8 characters |
| ยืนยันรหัสผ่าน (Confirm) | Password | ✅ | Must match |


### Specialties Available (14)

| Thai | English |
| ---- | ------- |
| เวชศาสตร์ทั่วไป | General Practice |
| อายุรกรรม | Internal Medicine |
| กุมารเวชศาสตร์ | Pediatrics |
| สูติ-นรีเวชวิทยา | Obstetrics & Gynecology |
| ศัลยกรรม | Surgery |
| กระดูกและข้อ | Orthopedics |
| จักษุวิทยา | Ophthalmology |
| โสต ศอ นาสิก | Otolaryngology (ENT) |
| จิตเวชศาสตร์ | Psychiatry |
| ผิวหนัง | Dermatology |
| หัวใจ | Cardiology |
| ระบบประสาท | Neurology |
| วิสัญญีวิทยา | Anesthesiology |
| เวชศาสตร์ฉุกเฉิน | Emergency Medicine |


### 3.3 Forgot Password

| Field | Type | Required |
| ----- | ---- | -------- |
| Email | Text | ✅ |


### 3.4 Pending Approval Screen

Shown after registration — doctor must wait for admin approval.

---


## 4. Workflows


### Workflow 1: Doctor Login

```text
Step 1: Doctor navigates to localhost:3010/login
Step 2: Enters email and password
Step 3: Clicks "เข้าสู่ระบบ" (Login)
Step 4: POST /auth/login → validates credentials
Step 5: Checks user role (doctor/admin) and approval status
Step 6: If approved → Redirect to /dashboard
Step 7: If pending → Shows "Pending Approval" screen
Step 8: If rejected → Error message
```


### Workflow 2: Doctor Registration

```text
Step 1: Click "Register" tab on login page
Step 2: Fill all required fields (name, email, specialty, license, etc.)
Step 3: Click "สมัครสมาชิก" (Register)
Step 4: POST /auth/register → Creates user with 'pending' status
Step 5: Email notification sent to admin
Step 6: "Pending Approval" screen shown
Step 7: Admin reviews → Approve/Reject via Admin Doctor Management
Step 8: Doctor receives email notification of decision
Step 9: If approved → Can login normally
```


### Workflow 3: Password Reset

```text
Step 1: Click "ลืมรหัสผ่าน?" (Forgot password)
Step 2: Enter registered email
Step 3: POST /auth/request-password-reset
Step 4: Email sent with reset link
Step 5: Click link → /reset-password?token=xxx
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/auth/login` | Authenticate doctor/admin |
| POST | `/auth/register` | Register new doctor (pending approval) |
| POST | `/auth/request-password-reset` | Send password reset email |

---


## 6. Key Difference from Patient Login

| Feature | Patient Portal | Doctor Portal |
| ------- | -------------- | ------------- |
| Registration access | Immediate | Requires admin approval |
| Roles | patient only | doctor, admin |
| Specialty field | ❌ | ✅ Required |
| License number | ❌ | ✅ Required |
| Branding | Patient-focused | Clinical features |

---


## 7. AI Agent Improvement Opportunities


- **License verification**: AI auto-verify medical license numbers


- **Specialty matching**: AI suggest specialty based on background


- **Fraud detection**: AI detect suspicious registration patterns


- **SSO integration**: AI-managed single sign-on with hospital systems

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT | Query by email, verify password_hash via pgcrypto crypt() |
| sessions | INSERT | Create session token on successful login |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/auth/login | POST | SELECT users WHERE email, verify crypt(password, password_hash) |
| POST /api/auth/register | POST | INSERT INTO users (doctor registration) |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
