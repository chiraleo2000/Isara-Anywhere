# Izara Telemedicine User Management Workflows

Complete user management documentation for the Izara Telemedicine platform, covering authentication, registration, role management, and security.

**Version:** 1.6.0
**Last Updated:** March 31, 2026
**Status:** ✅ PostgreSQL Implementation Complete + Full DB Schema

---


## 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [User Workflows](#4-user-workflows)
5. [Security Features](#5-security-features)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Test Accounts](#7-test-accounts)
8. [Frontend Components](#8-frontend-components)
9. [Error Codes](#9-error-codes)

---


## 1. System Overview

Izara Telemedicine uses a unified PostgreSQL database with two separate portals:

| Portal | URL | User Types | Backend Port |
| -------- | ----- | ------------ | -------------- |
| **Patient Portal** | `localhost:3005` | Patients | 3005 |
| **Doctor Portal** | `localhost:3010` | Doctors, Admins | 3010 |



### Docker Services

| Service | Container Name | Port | Purpose |
| --------- | ---------------- | ------ | --------- |
| PostgreSQL | izara-postgres | 5433 (ext) / 5432 (int) | Primary database |
| Patient Portal | izara-patient-portal | 3005 | Patient frontend + backend |
| Doctor Portal | izara-doctor-portal | 3010 | Doctor frontend + backend |
| pgAdmin | izara-pgadmin | 5050 | Database administration |



### Portal Comparison

| Feature | Patient Portal | Doctor Portal |
| --------- | ---------------- | --------------- |
| Password Hashing | bcrypt | bcrypt |
| Registration | Immediate access | Admin approval required |
| Role Types | `patient` only | `doctor`, `admin` |
| Session Duration | Session-based | Session-based |
| Storage | PostgreSQL `users` table | PostgreSQL `users` table |


---


## 2. Database Schema

All user data is stored in the PostgreSQL database `izara_phase1`.


### 2.1 Users Table

The unified `users` table stores all user types (patients, doctors, admins):

```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'admin', 'patient')),
    name VARCHAR(255) NOT NULL,
    name_thai VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    national_id VARCHAR(20),

    -- Doctor-specific fields
    doctor_id VARCHAR(50),
    medical_license_number VARCHAR(50),
    specialty VARCHAR(100),
    hospital_name VARCHAR(255),

    -- Patient-specific fields
    patient_id VARCHAR(50),

    -- Status fields
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(50),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by VARCHAR(50),

    -- Admin fields
    admin_privileges JSONB,
    is_admin BOOLEAN DEFAULT false,

    -- Settings
    preferences JSONB DEFAULT '{"language": "th", "theme": "light"}'::jsonb,
    notification_settings JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,

    -- Security
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE
);
```


### 2.2 Sessions Table

```sql
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    logged_out_at TIMESTAMP WITH TIME ZONE
);
```


### 2.3 Password Reset Tokens

```sql
CREATE TABLE password_resets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```


### 2.4 Patient Profiles Table

```sql
CREATE TABLE patient_profiles (
    patient_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    demographics JSONB NOT NULL,
    emergency_contact JSONB,
    insurance_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```


### 2.5 User ID Formats

| Role | ID Format | Example |
| ------ | ----------- | --------- |
| Patient | `patient_{timestamp}_{random}` | `patient_1706123456789_abc123` |
| Doctor | `DOC-{TIMESTAMP}-{RANDOM}` | `DOC-1706123456-XYZ789` |
| Admin | `DOC-DEMO-001` or `DOC-{...}` | `DOC-DEMO-001` |


---


## 3. API Endpoints


### 3.1 Patient Portal Authentication (`/api/auth/*`)

| Method | Endpoint | Description | Access |
| -------- | ---------- | ------------- | -------- |
| POST | `/api/auth/register` | Register new patient | Public |
| POST | `/api/auth/login` | Patient login | Public |
| POST | `/api/auth/logout` | End session | Authenticated |
| POST | `/api/auth/validate` | Validate session token | Authenticated |
| GET | `/api/auth/me` | Get current user profile | Authenticated |



### 3.2 Doctor Portal Authentication (`/auth/*`)

| Method | Endpoint | Description | Access |
| -------- | ---------- | ------------- | -------- |
| POST | `/auth/register` | Register new doctor (pending approval) | Public |
| POST | `/auth/login` | Doctor/Admin login | Public |
| POST | `/auth/logout` | End session | Authenticated |
| GET | `/auth/verify` | Verify session & get user | Authenticated |
| POST | `/auth/request-password-reset` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |



### 3.3 Admin Management (`/admin/*`)

| Method | Endpoint | Description | Access |
| -------- | ---------- | ------------- | -------- |
| GET | `/admin/pending-doctors` | List all doctors (all statuses) | Admin |
| POST | `/admin/approve-doctor` | Approve doctor registration | Admin |
| POST | `/admin/reject-doctor` | Reject doctor registration | Admin |
| POST | `/admin/update-role` | Change user role (doctor↔admin) | Admin |


---


## 4. User Workflows


### 4.1 Patient Registration Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT REGISTRATION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Patient Portal Registration Page]                              │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Step 1: Basic Information   │                                │
│  │ • Name, Email, Phone        │                                │
│  │ • Date of Birth, Gender     │                                │
│  │ • Password (min 6 chars)    │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Step 2: Health Information  │                                │
│  │ • Height, Weight, Blood Type│                                │
│  │ • Allergies                 │                                │
│  │ • Chronic Conditions        │                                │
│  │ • Emergency Contact         │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│        POST /api/auth/register                                   │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Backend Actions:            │                                │
│  │ 1. Validate email unique    │                                │
│  │ 2. Generate patient_id      │                                │
│  │ 3. Hash password (bcrypt)   │                                │
│  │ 4. Insert into users table  │                                │
│  │ 5. Create patient_profiles  │                                │
│  │ 6. Create session           │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Auto-login → Dashboard]                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### 4.2 Doctor Registration Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                     DOCTOR REGISTRATION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Doctor Portal Registration Page]                               │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Registration Form:          │                                │
│  │ • Name, Email, Phone        │                                │
│  │ • Medical License Number    │                                │
│  │ • Specialty                 │                                │
│  │ • Password (min 8 chars)    │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│         POST /auth/register                                      │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Backend Actions:            │                                │
│  │ 1. Validate email unique    │                                │
│  │ 2. Generate DOC-xxx ID      │                                │
│  │ 3. Hash password (bcrypt)   │                                │
│  │ 4. Insert user with:        │                                │
│  │    is_active: false         │                                │
│  │    is_approved: false       │                                │
│  │    approval_status: pending │                                │
│  │ 5. Notify admin             │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Show "Pending Approval" Message]                            │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ ⚠️ DOCTOR CANNOT LOGIN      │                                │
│  │                             │                                │
│  │ Doctor must wait for Admin  │                                │
│  │ to verify and approve via   │                                │
│  │ Doctor Management Page      │                                │
│  │ (/admin/doctors)            │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### 4.2.1 Patient vs Doctor Registration Comparison

| Feature | Patient Registration | Doctor Registration |
| ------- | -------------------- | ------------------- |
| **Portal** | Patient Portal (localhost:3005) | Doctor Portal (localhost:3010) |
| **Endpoint** | `POST /api/auth/register` | `POST /auth/register` |
| **Required Fields** | Name, Email, Password, Phone | Name, Email, Password, Medical License, Specialty |
| **Password Minimum** | 6 characters | 8 characters |
| **Health Info** | Height, Weight, Blood Type, Allergies | N/A |
| **Professional Info** | N/A | Medical License Number, Specialty, Hospital |
| **Immediate Access** | ✅ Yes - Can login immediately | ❌ No - Must wait for admin approval |
| **Initial Status** | `is_active: true`, `is_approved: true` | `is_active: false`, `is_approved: false` |
| **Approval Required** | ❌ No | ✅ Yes - Admin must approve |
| **Auto-Login** | ✅ Yes - Logged in after registration | ❌ No - Must wait for approval |



### 4.2.2 Doctor Registration States

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DOCTOR APPROVAL STATES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   PENDING   │ → │  APPROVED   │    │  REJECTED   │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│        ↓                  ↓                  ↓                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ is_active:  │    │ is_active:  │    │ is_active:  │          │
│  │   false     │    │   true      │    │   false     │          │
│  │ is_approved:│    │ is_approved:│    │ is_approved:│          │
│  │   false     │    │   true      │    │   false     │          │
│  │ approval_   │    │ approval_   │    │ approval_   │          │
│  │ status:     │    │ status:     │    │ status:     │          │
│  │  'pending'  │    │  'approved' │    │  'rejected' │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│        ↓                  ↓                  ↓                  │
│  Cannot login       Can login         Cannot login              │
│  Waiting for        Full access       May re-register           │
│  admin approval     to portal         with correct info         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### 4.3 Login Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Enter Email & Password]                                        │
│               ↓                                                  │
│       POST /auth/login (or /api/auth/login)                      │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Security Checks:            │                                │
│  │ 1. Rate limit (10/15min)    │                                │
│  │ 2. Account lock check       │                                │
│  │ 3. Find user by email       │                                │
│  │ 4. Check approval status    │  ← Doctor Portal only          │
│  │ 5. Verify password (bcrypt) │                                │
│  │ 6. Reset login_attempts     │                                │
│  │ 7. Create session           │                                │
│  │ 8. Update last_login        │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Return token + user data]                                   │
│               ↓                                                  │
│     [Redirect to Dashboard]                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### 4.4 Admin: Approve Doctor

```text
┌─────────────────────────────────────────────────────────────────┐
│                   ADMIN APPROVE DOCTOR FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Admin → Doctor Management Page]                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ View Pending Tab:           │                                │
│  │ • List pending doctors      │                                │
│  │ • Name, Email, License      │                                │
│  │ • Specialty, Reg Date       │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Click "Approve" Button]                                     │
│               ↓                                                  │
│      POST /admin/approve-doctor                                  │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Database Updates:           │                                │
│  │ UPDATE users SET            │                                │
│  │   is_active = true,         │                                │
│  │   is_approved = true,       │                                │
│  │   approval_status = 'approved',                              │
│  │   approved_at = NOW(),      │                                │
│  │   approved_by = {adminId}   │                                │
│  │ WHERE id = {doctorId}       │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Send approval email to doctor]                              │
│               ↓                                                  │
│     [Doctor can now login]                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### 4.4.1 Doctor Management Page (Admin Only)

**Route:** `/admin/doctors` or "จัดการแพทย์" in sidebar
**Component:** `AdminDoctorManagement.tsx`
**Access:** Admin users only (role = 'admin' or is_admin = true)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏥 Doctor Portal                              🔔(3)  👤 Admin User  ⚙️     │
├─────────────────────────────────────────────────────────────────────────────┤
│  📋 แดชบอร์ด                                                                 │
│  📅 ตารางนัดหมาย                                                             │
│  👥 ผู้ป่วย                                                                  │
│  ─────────────────                                                          │
│  👨‍⚕️ จัดการแพทย์  ◀── Admin Only                                            │
│  ✅ อนุมัติแพทย์ใหม่ (3)  ◀── Badge shows pending count                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  👨‍⚕️ Doctor Management / จัดการแพทย์                                    │  │
│  │                                                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │  │
│  │  │ All (15) │ │Pending(3)│ │Approved  │ │Rejected  │                  │  │
│  │  │          │ │    ⚠️    │ │  (10)    │ │   (2)    │                  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 🔍 Search doctors...                          [Filter ▼]       │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │ ⏳ PENDING APPROVAL                                             │  │  │
│  │  ├─────────────────────────────────────────────────────────────────┤  │  │
│  │  │                                                                 │  │  │
│  │  │  👤 Dr. Somchai Jaidee                                          │  │  │
│  │  │  📧 somchai.dr@hospital.co.th                                   │  │  │
│  │  │  🔢 License: ว.12345                                            │  │  │
│  │  │  🏥 Specialty: Internal Medicine                                │  │  │
│  │  │  📅 Registered: Feb 4, 2026                                     │  │  │
│  │  │                                                                 │  │  │
│  │  │  [✓ Approve]  [✗ Reject]  [👁 View Details]                     │  │  │
│  │  │                                                                 │  │  │
│  │  ├─────────────────────────────────────────────────────────────────┤  │  │
│  │  │                                                                 │  │  │
│  │  │  👤 Dr. Wanida Sukjai                                           │  │  │
│  │  │  📧 wanida.dr@clinic.com                                        │  │  │
│  │  │  🔢 License: ว.67890                                            │  │  │
│  │  │  🏥 Specialty: Pediatrics                                       │  │  │
│  │  │  📅 Registered: Feb 3, 2026                                     │  │  │
│  │  │                                                                 │  │  │
│  │  │  [✓ Approve]  [✗ Reject]  [👁 View Details]                     │  │  │
│  │  │                                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```


#### Doctor Management Page Features

| Feature | Description |
| ------- | ----------- |
| **Tabs** | All, Pending, Approved, Rejected |
| **Pending Badge** | Shows count of doctors waiting for approval |
| **Search** | Search by name, email, license number |
| **Filter** | Filter by specialty, registration date |
| **Approve Button** | Approve doctor - enables login |
| **Reject Button** | Reject with reason - doctor cannot login |
| **View Details** | Full profile, documents, registration info |
| **Role Management** | Promote doctor to admin or demote admin to doctor |



### 4.5 Admin: Reject Doctor

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN REJECT DOCTOR FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Select Doctor → Click "Reject"]                                │
│               ↓                                                  │
│     [Enter Rejection Reason]                                     │
│               ↓                                                  │
│       POST /admin/reject-doctor                                  │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Database Updates:           │                                │
│  │ UPDATE users SET            │                                │
│  │   is_active = false,        │                                │
│  │   is_approved = false,      │                                │
│  │   approval_status = 'rejected',                              │
│  │   rejected_at = NOW(),      │                                │
│  │   rejected_by = {adminId}   │                                │
│  │ WHERE id = {doctorId}       │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Send rejection email with reason]                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### 4.6 Password Reset Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                     PASSWORD RESET FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Click "Forgot Password"]                                       │
│               ↓                                                  │
│     [Enter email address]                                        │
│               ↓                                                  │
│    POST /auth/request-password-reset                             │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Backend Actions:            │                                │
│  │ 1. Find user by email       │                                │
│  │ 2. Generate reset token     │                                │
│  │ 3. Insert into password_resets                               │
│  │    (expires in 1 hour)      │                                │
│  │ 4. Send reset email         │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [User clicks email link]                                     │
│               ↓                                                  │
│     [Enter new password]                                         │
│               ↓                                                  │
│      POST /auth/reset-password                                   │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ Validation:                 │                                │
│  │ 1. Verify token exists      │                                │
│  │ 2. Check not expired        │                                │
│  │ 3. Check not already used   │                                │
│  │ 4. Update password_hash     │                                │
│  │ 5. Mark token as used       │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│     [Password Reset Success]                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---


## 5. Security Features


### 5.1 Rate Limiting

| Endpoint | Limit | Window | Action on Exceed |
| ---------- | ------- | -------- | ------------------ |
| Login | 10 requests | 15 minutes | Return 429 error |
| Password Reset | 5 requests | 1 hour | Return 429 error |
| General API | 500 requests | 15 minutes | Return 429 error |



### 5.2 Account Lockout

After 5 failed login attempts:


- Account is locked for 30 minutes

- `locked_until` timestamp is set

- Security event is logged

```sql
UPDATE users
SET login_attempts = login_attempts + 1,
    locked_until = CASE
      WHEN login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
      ELSE locked_until
    END
WHERE email = $1;
```


### 5.3 Password Security

| Feature | Implementation |
| --------- | ---------------- |
| Algorithm | bcrypt (all portals) |
| Salt Rounds | 10 |
| Min Length | 6 chars (patient) / 8 chars (doctor) |



### 5.4 Session Security


- **Token Format**: 64-character cryptographic random hex string

- **IP Binding**: Sessions track client IP address

- **User-Agent**: Sessions track browser information

- **Invalidation**: Sessions marked with `logged_out_at` on logout

---


## 6. Role-Based Access Control


### 6.1 Patient Portal Access

| Feature | Patient |
| --------- | --------- |
| View Dashboard | ✅ |
| Book Appointments | ✅ |
| View Health Records | ✅ (own only) |
| AI Health Chat | ✅ |
| Cancel Appointments | ✅ (own only) |



### 6.2 Doctor Portal Access

| Feature | Doctor | Admin |
| --------- | -------- | ------- |
| View Dashboard | ✅ | ✅ |
| View Patient Queue | ✅ (assigned) | ✅ (all) |
| Confirm Appointments | ✅ | ✅ |
| View Scheduled Meetings | ✅ (own) | ✅ (all) |
| Complete EMR | ✅ | ✅ |
| Write Prescriptions | ✅ | ✅ |
| AI Chat Assistant | ✅ | ✅ |
| Doctor Management | ❌ | ✅ |
| Approve Registrations | ❌ | ✅ |
| Assign Roles | ❌ | ✅ |
| View Analytics | ❌ | ✅ |



### 6.3 Admin Privileges (JSONB)

```json
{
  "canManageDoctors": true,
  "canManagePatients": true,
  "canManageAppointments": true,
  "canViewAnalytics": true,
  "canManageSettings": true,
  "canAssignRoles": true,
  "level": "admin"
}
```


### 6.4 Checking Admin Status

```typescript
// Check if user is admin
const isAdmin = user.is_admin || user.role === 'admin';

// Check specific privilege
const canManageDoctors = user.admin_privileges?.canManageDoctors || user.is_admin;
```

---


## 7. Test Accounts


### 7.1 Pre-seeded Accounts

| Portal | Email | Password | Role |
| -------- | ------- | ---------- | ------ |
| Doctor Portal | `admin.test@izara.com` | `IzaraAdmin@2024` | Admin |
| Doctor Portal | `doctor.test@izara.com` | `IzaraDoctor@2024` | Doctor |
| Patient Portal | `demo.test@gmail.com` | `P@ssw0rd` | Patient |
| Patient Portal | `Somchai.Mankong@gmail.com` | `P@ssw0rd` | Patient |
| Patient Portal | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` | Patient |



### 7.2 Seeding Data

```powershell

# Seed database with test data
cd scripts/database
node seed-database.cjs


# Or use cloud-db-tool
cd scripts
node cloud-db-tool.cjs seed
```

---


## 8. Frontend Components


### 8.1 Patient Portal Components

| Component | Path | Purpose |
| ----------- | ------ | --------- |
| `LoginPage` | `/pages/auth/LoginPage.tsx` | Patient login |
| `RegisterPage` | `/pages/auth/RegisterPage.tsx` | Patient registration |
| `AuthContext` | `/contexts/AuthContext.tsx` | Auth state management |



### 8.2 Doctor Portal Components

| Component | Path | Purpose |
| ----------- | ------ | --------- |
| `DoctorLogin` | `/pages/DoctorLogin.tsx` | Doctor/Admin login |
| `DoctorRegister` | `/pages/DoctorRegister.tsx` | Doctor registration |
| `AuthProvider` | `/components/common/AuthProvider.tsx` | Auth state management |
| `AdminDoctorManagement` | `/pages/AdminDoctorManagement.tsx` | Admin: manage doctors |


---


## 9. Error Codes

| Code | HTTP Status | Description |
| ------ | ------------- | ------------- |
| `MISSING_CREDENTIALS` | 400 | Email or password missing |
| `INVALID_EMAIL` | 400 | Email format invalid |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `PENDING_APPROVAL` | 403 | Account awaiting admin approval |
| `ACCOUNT_REJECTED` | 403 | Registration was rejected |
| `ACCOUNT_DEACTIVATED` | 403 | Account is disabled |
| `ACCOUNT_LOCKED` | 423 | Too many failed attempts |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `LOGIN_ERROR` | 500 | Server error during login |


---


## Summary

| Action | User | Portal | Status After |
| -------- | ------ | -------- | -------------- |
| Register | Patient | Patient | Active immediately |
| Register | Doctor | Doctor | Pending approval |
| Login | Patient | Patient | Session created |
| Login | Doctor | Doctor | Checked for approval |
| Approve | Admin | Doctor | approved, is_active=true |
| Reject | Admin | Doctor | rejected, is_active=false |
| Grant Admin | Admin | Doctor | role=admin, is_admin=true |
| Reset Password | Any | Both | Password updated |
| Logout | Any | Both | Session invalidated |


---

This document reflects the current PostgreSQL-based implementation of Izara Telemedicine (Phase 1 Complete).

---


## 10. PostgreSQL Database Architecture for User Management


### Database Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **users** | Unified user table (all roles) | id, email, password_hash (bcrypt via pgcrypto), role (patient/doctor/admin), name, name_thai, phone, date_of_birth, national_id, doctor_id, patient_id, is_active, is_verified, is_approved, approval_status (pending/approved/rejected), preferences (JSONB), notification_settings (JSONB), login_attempts, locked_until |
| **sessions** | JWT session tracking | id, user_id, token, ip_address, user_agent, expires_at, logged_out_at |
| **password_resets** | Password reset tokens | id, user_id, token (hashed), expires_at (1 hour), used (boolean), used_at |
| **device_tokens** | Push notification devices | id, user_id, device_token, platform (web/ios/android), device_name, is_active |
| **biometric_credentials** | Biometric auth (Phase 2) | id, user_id, credential_type, public_key, device_id, is_active |
| **refresh_tokens** | JWT refresh rotation (Phase 2) | id, user_id, token_hash, device_id, expires_at, is_revoked |
| **patient_profiles** | Patient-specific data | patient_id, demographics (JSONB), emergency_contact (JSONB), insurance_info (JSONB) |
| **doctor_profiles** | Doctor-specific data | doctor_id, specialty, sub_specialties (JSONB), qualifications, experience_years, hospital_name, department, languages (JSONB), rating, consultation_fee, is_available, schedule (JSONB) |
| **audit_logs** | All user actions tracked | id, user_id, action, entity_type='user', details (JSONB), ip_address, user_agent |



### Authentication Data Flow

```text
Patient Portal (port 3005)                 Doctor Portal (port 3010)
┌──────────────────────────┐              ┌──────────────────────────┐
│ LoginPage.tsx            │              │ DoctorLoginPage.tsx       │
│ POST /api/auth/login     │              │ POST /api/auth/login      │
└──────────┬───────────────┘              └──────────┬───────────────┘
           │                                         │
           └─────────────────┬───────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PostgreSQL - izara_phase1                                           │
│                                                                      │
│  Login:                                                              │
│  SELECT * FROM users WHERE email = $1                               │
│  → Verify: password_hash = crypt($password, password_hash)          │
│  → Check: is_active = true, approval_status = 'approved'            │
│  → Check: login_attempts < 5 AND locked_until < NOW()               │
│  INSERT INTO sessions (user_id, token, ip_address, user_agent,      │
│    expires_at) VALUES ($1, $jwt, $ip, $ua, NOW() + '24h')          │
│  INSERT INTO audit_logs (action='login', user_id=$1)                │
│                                                                      │
│  Register (Patient):                                                 │
│  INSERT INTO users (email, password_hash, role='patient', name,     │
│    is_active=true, is_approved=true, approval_status='approved')     │
│  INSERT INTO patient_profiles (patient_id=$newId)                   │
│                                                                      │
│  Register (Doctor):                                                  │
│  INSERT INTO users (email, password_hash, role='doctor', name,      │
│    is_active=false, is_approved=false, approval_status='pending')    │
│  INSERT INTO doctor_profiles (doctor_id=$newId, specialty=$1)       │
│  → Admin approval required before first login                        │
│                                                                      │
│  Admin approves doctor:                                              │
│  UPDATE users SET is_active=true, is_approved=true,                 │
│    approval_status='approved' WHERE id=$doctorId                     │
│  INSERT INTO audit_logs (action='approve_doctor')                    │
│                                                                      │
│  Logout:                                                             │
│  UPDATE sessions SET logged_out_at=NOW() WHERE token=$jwt           │
│                                                                      │
│  Password Reset:                                                     │
│  INSERT INTO password_resets (user_id, token, expires_at=NOW()+'1h')│
│  → Email sent with reset link                                        │
│  UPDATE users SET password_hash=crypt($newPwd, gen_salt('bf'))      │
│    WHERE id=$userId                                                  │
│  UPDATE password_resets SET used=true, used_at=NOW()                │
└──────────────────────────────────────────────────────────────────────┘
```


### Deployment Architecture

| Environment | Service | Auth Scope | Database |
| ----------- | ------- | ---------- | -------- |
| Local Docker | Patient Portal (3005) | Patient registration + login | izara-postgres:5432 |
| Local Docker | Doctor Portal (3010) | Doctor/admin login + user mgmt | izara-postgres:5432 |
| Production | Patient Portal (Cloud Run) | Same | 35.240.157.230:5432 |
| Production | Doctor Portal (Cloud Run) | Same | 35.240.157.230:5432 |



### Security Features in PostgreSQL

| Feature | Implementation |
| ------- | -------------- |
| Password hashing | pgcrypto: crypt() + gen_salt('bf') |
| Session management | JWT stored in sessions table, 24h expiry |
| Account lockout | login_attempts counter, locked_until timestamp |
| Audit trail | Every auth action logged to audit_logs |
| PDPA compliance | patient_consents table for data consent |



### Scenario Coverage

| # | Scenario | Actor | DB Tables |
| - | -------- | ----- | --------- |
| 1 | Patient registers | Patient | users, patient_profiles, audit_logs |
| 2 | Doctor registers | Doctor | users, doctor_profiles, audit_logs |
| 3 | Admin approves doctor | Admin | users, audit_logs |
| 4 | Admin rejects doctor | Admin | users, audit_logs |
| 5 | Patient login | Patient | users, sessions, audit_logs |
| 6 | Doctor login | Doctor | users (check approval), sessions, audit_logs |
| 7 | Password reset request | Any | password_resets |
| 8 | Password reset complete | Any | users, password_resets, audit_logs |
| 9 | Logout | Any | sessions (logged_out_at) |
| 10 | Grant admin role | Admin | users (role='admin'), audit_logs |
| 11 | Account lockout | System | users (login_attempts, locked_until) |

