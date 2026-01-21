# Izara Telemedicine User Management Workflows

This document details the full user management workflow for both Patient Portal and Doctor Portal, including user creation, authentication, role management, admin privileges, and account lifecycle management.

**Last Updated: December 13, 2025**

---

## 0. System Overview

Izara Telemedicine has **two separate portals** with different user types:

| Portal | URL | User Types | Auth Server |
|--------|-----|------------|-------------|
| **Patient Portal** | `localhost:5174` | Patients | `localhost:3000` (Backend) |
| **Doctor Portal** | `localhost:3010` | Doctors, Admins | `localhost:3011` (Auth Server) |

### Key Differences

| Feature | Patient Portal | Doctor Portal |
|---------|---------------|---------------|
| Password Hashing | bcrypt (secure) | bcrypt (secure) |
| Registration | Immediate access | Admin approval required |
| Role Types | `patient` only | `doctor`, `admin` |
| Session Duration | 15 min inactivity | Session-based |
| Storage Bucket | `izara-users-credentials` | `izara-users-credentials` |

---

## 1. Data Model

### 1.1 Patient User (Patient Portal)

**Storage Location**: `izara-users-credentials/users/{userId}.json`

```typescript
interface PatientUser {
  id: string;                      // Format: user_1234567890_abc123xyz
  patientId: string;               // Format: patient_1234567890_abc123xyz
  email: string;                   // Lowercase, trimmed
  passwordHash: string;            // Base64 encoded (legacy)
  profile: {
    id: string;
    patientId: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    dateOfBirth: string;           // YYYY-MM-DD
    gender: 'male' | 'female' | 'other';
    createdAt: string;             // ISO timestamp
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 1.2 Patient Profile Data

**Storage Location**: `izara-patients-data/patients/{patientId}/profile.json`

```typescript
interface PatientProfile {
  patientId: string;
  userId: string;
  personalInfo: {
    name: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email: string;
    nationalId: string;
    address: string;
  };
  physicalInfo: {
    height: number;                // cm
    weight: number;                // kg
    bloodType: string;             // A+, B-, O+, etc.
    bmi: number;
  };
  medicalInfo: {
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
    bloodPressure: string;
    heartRate: number;
    bloodSugar: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  vitalHistory: VitalRecord[];
  labResults: LabResult[];
  immunizations: Immunization[];
  createdAt: string;
  updatedAt: string;
}
```

### 1.3 Doctor/Admin User (Doctor Portal)

**Storage Location**: `izara-users-credentials/users/{userId}.json`

```typescript
interface DoctorUser {
  id: string;                      // Format: DOC-TIMESTAMP-RANDOM or DOC-DEMO-001
  email: string;                   // Lowercase, trimmed
  passwordHash: string;            // bcrypt hash ($2b$...)
  role: 'doctor' | 'admin';
  doctorId: string;                // Same as id
  medicalLicenseNumber: string;    // Format: MD-123456
  
  // Status Fields
  isAdmin: boolean;                // Admin privileges flag
  isActive: boolean;               // Account active/deactivated
  isApproved: boolean;             // Approval status
  approvalStatus: 'pending' | 'approved' | 'rejected';
  emailVerified: boolean;
  
  // Profile Data
  name: string;
  nameThai?: string;
  phone?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  specialty?: string;
  specialtyThai?: string;
  hospital?: string;
  qualifications?: string[];
  experience?: string;
  
  // Security
  loginAttempts: number;           // Failed login count
  lockedUntil: string | null;      // ISO timestamp when locked
  lastLogin: string | null;
  
  // Admin Specific
  adminPrivileges?: AdminPrivileges;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'th';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}
```

### 1.4 Admin Privileges

```typescript
interface AdminPrivileges {
  canManageDoctors: boolean;       // Approve/reject doctor registrations
  canManagePatients: boolean;      // View/manage patient data
  canManageAppointments: boolean;  // Manage all appointments
  canViewAnalytics: boolean;       // Access analytics dashboard
  canManageSettings: boolean;      // System settings
  canAssignRoles: boolean;         // Promote/demote users
  level: 'super_admin' | 'admin' | 'moderator';
}
```

### 1.5 User Index (Doctor Portal)

**Storage Location**: `izara-users-credentials/users/index.json`

```typescript
interface UserIndexEntry {
  id: string;
  email: string;
  role: 'doctor' | 'admin';
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

// Array of all users for quick lookup
type UsersIndex = UserIndexEntry[];
```

### 1.6 Session Data

**Storage Location**: `izara-users-credentials/sessions/{sessionToken}.json`

```typescript
interface Session {
  id: string;                      // Session token (64 hex chars)
  userId: string;
  email: string;
  role: 'doctor' | 'admin' | 'patient';
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  ip: string;                      // Client IP
  userAgent: string;               // Browser info
  isValid?: boolean;               // Set to false on logout
  loggedOutAt?: string;
}
```

---

## 2. API Endpoints

### 2.1 Patient Portal Authentication (`/api/auth/*`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new patient | Public |
| POST | `/api/auth/login` | Patient login | Public |
| POST | `/api/auth/logout` | End session | Authenticated |
| POST | `/api/auth/validate` | Validate session token | Authenticated |
| GET | `/api/auth/me` | Get current user profile | Authenticated |

### 2.2 Doctor Portal Authentication (`/auth/*`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new doctor (pending approval) | Public |
| POST | `/auth/login` | Doctor/Admin login | Public |
| POST | `/auth/logout` | End session | Authenticated |
| GET | `/auth/verify` | Verify session & get user | Authenticated |
| POST | `/auth/request-password-reset` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |

### 2.3 Admin Management (`/admin/*`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/pending-doctors` | List all doctors (all statuses) | Admin |
| POST | `/admin/approve-doctor` | Approve doctor registration | Admin |
| POST | `/admin/reject-doctor` | Reject doctor registration | Admin |
| POST | `/admin/update-role` | Change user role (doctor↔admin) | Admin |

---

## 3. Workflows

### 3.1 Patient Registration Flow

```
[Patient visits Registration Page]
         ↓
┌─────────────────────────────────┐
│ Step 1: Basic Information       │
│ - Name, Email, Phone            │
│ - Date of Birth, Gender         │
│ - Password, Confirm Password    │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Step 2: Health Information      │
│ - Height, Weight, Blood Type    │
│ - Allergies                     │
│ - Chronic Conditions            │
│ - Current Medications           │
│ - Emergency Contact             │
└─────────────────────────────────┘
         ↓
[POST /api/auth/register]
         ↓
┌─────────────────────────────────┐
│ System Actions:                 │
│ 1. Validate email uniqueness    │
│ 2. Generate userId & patientId  │
│ 3. Hash password (Base64)       │
│ 4. Create user record           │
│ 5. Create patient profile       │
│ 6. Create session               │
│ 7. Log registration audit       │
└─────────────────────────────────┘
         ↓
[Patient automatically logged in]
         ↓
[Redirect to Dashboard]
```

**Code Reference**: `Isara-patient-portal/server/routes/auth.ts` - `/register` endpoint

### 3.2 Doctor Registration Flow

```
[Doctor visits Registration Page]
         ↓
┌─────────────────────────────────┐
│ Registration Form:              │
│ - Name, Email, Phone            │
│ - Medical License Number        │
│ - Specialty                     │
│ - Password, Confirm Password    │
└─────────────────────────────────┘
         ↓
[POST /auth/register]
         ↓
┌─────────────────────────────────┐
│ System Actions:                 │
│ 1. Validate email uniqueness    │
│ 2. Generate DOC-xxx userId      │
│ 3. Hash password (bcrypt)       │
│ 4. Create user credential       │
│ 5. Add to users index           │
│ 6. Create doctor profile        │
│ 7. Add to pending-approvals     │
│ 8. Send email to admin          │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Status: PENDING APPROVAL        │
│ - isActive: false               │
│ - isApproved: false             │
│ - approvalStatus: 'pending'     │
└─────────────────────────────────┘
         ↓
[Show "Pending Approval" message]
```

**Code Reference**: `Isara-doctor-portal/server/authServer.cjs` - `/auth/register` endpoint

### 3.3 Patient Login Flow

```
[Patient visits Login Page]
         ↓
[Enter Email & Password]
         ↓
[POST /api/auth/login]
         ↓
┌─────────────────────────────────┐
│ Validation Steps:               │
│ 1. Find user by email           │
│ 2. Check password (Base64)      │
│ 3. Create 30-min session        │
│ 4. Return user + token          │
└─────────────────────────────────┘
         ↓
[Store token in localStorage]
         ↓
[Redirect to Dashboard]
```

### 3.4 Doctor/Admin Login Flow

```
[Doctor visits Login Page]
         ↓
[Enter Email & Password]
         ↓
[POST /auth/login]
         ↓
┌─────────────────────────────────┐
│ Security Checks (OWASP):        │
│ 1. Rate limit check (10/15min)  │
│ 2. Account lock check           │
│ 3. Find user by email           │
│ 4. Check approval status        │
│ 5. Check account active         │
│ 6. Verify password (bcrypt)     │
│ 7. Reset login attempts         │
│ 8. Create 24-hour session       │
│ 9. Log to audit history         │
└─────────────────────────────────┘
         ↓
[Return token + user data]
         ↓
[Redirect based on role]
   ├─→ Admin: /doctor/{id}/dashboard (with admin features)
   └─→ Doctor: /doctor/{id}/dashboard
```

### 3.5 Login Error Handling

| Error Code | Message | Action |
|------------|---------|--------|
| `RATE_LIMIT_EXCEEDED` | Too many attempts | Wait 15 minutes |
| `ACCOUNT_LOCKED` | Account locked | Wait 30 minutes or contact admin |
| `PENDING_APPROVAL` | Awaiting approval | Wait for admin approval |
| `ACCOUNT_REJECTED` | Application rejected | Contact administrator |
| `ACCOUNT_DEACTIVATED` | Account disabled | Contact administrator |
| `INVALID_CREDENTIALS` | Wrong email/password | Check credentials |

### 3.6 Admin: Approve Doctor Registration

```
[Admin logs into Doctor Portal]
         ↓
[Navigate to "Doctor Management" page]
         ↓
┌─────────────────────────────────┐
│ View Pending Tab:               │
│ - See all pending registrations │
│ - Doctor name, email, license   │
│ - Specialty, registration date  │
└─────────────────────────────────┘
         ↓
[Click "Approve" button]
         ↓
[Confirmation Modal]
         ↓
[POST /admin/approve-doctor]
         ↓
┌─────────────────────────────────┐
│ System Updates:                 │
│ 1. Set isActive: true           │
│ 2. Set isApproved: true         │
│ 3. Set approvalStatus: approved │
│ 4. Set approvedAt timestamp     │
│ 5. Set approvedBy admin ID      │
│ 6. Update users index           │
│ 7. Update doctors.json          │
│ 8. Remove from pending list     │
│ 9. Send approval email          │
└─────────────────────────────────┘
         ↓
[Doctor can now log in]
```

**Code Reference**: `Isara-doctor-portal/server/authServer.cjs` - `/admin/approve-doctor` endpoint

### 3.7 Admin: Reject Doctor Registration

```
[Admin selects doctor to reject]
         ↓
[Click "Reject" button]
         ↓
[Enter rejection reason]
         ↓
[POST /admin/reject-doctor]
         ↓
┌─────────────────────────────────┐
│ System Updates:                 │
│ 1. Set isActive: false          │
│ 2. Set isApproved: false        │
│ 3. Set approvalStatus: rejected │
│ 4. Set rejectedAt timestamp     │
│ 5. Set rejectedBy admin ID      │
│ 6. Set rejectionReason          │
│ 7. Update users index           │
│ 8. Send rejection email         │
└─────────────────────────────────┘
         ↓
[Doctor receives rejection email]
```

### 3.8 Admin: Grant Admin Privileges

```
[Admin navigates to Doctor Management]
         ↓
[Find approved doctor]
         ↓
[Click "Manage Role" button]
         ↓
┌─────────────────────────────────┐
│ Role Modal:                     │
│ ○ Doctor (regular access)       │
│ ● Admin (elevated privileges)   │
│                                 │
│ [Cancel] [Save Changes]         │
└─────────────────────────────────┘
         ↓
[POST /admin/update-role]
         ↓
┌─────────────────────────────────┐
│ System Updates:                 │
│ 1. Update role: 'admin'         │
│ 2. Set isAdmin: true            │
│ 3. Add adminPrivileges object   │
│ 4. Update users index           │
│ 5. Log role change audit        │
└─────────────────────────────────┘
         ↓
[Doctor now has admin access]
```

**IMPORTANT**: The `/admin/update-role` endpoint needs to be implemented in the backend.

### 3.9 Password Reset Flow

```
[User clicks "Forgot Password"]
         ↓
[Enter email address]
         ↓
[POST /auth/request-password-reset]
         ↓
┌─────────────────────────────────┐
│ System Actions:                 │
│ 1. Find user by email           │
│ 2. Generate reset token (64chr) │
│ 3. Set 1-hour expiration        │
│ 4. Store token in GCS           │
│ 5. Send reset email             │
└─────────────────────────────────┘
         ↓
[User receives email with link]
         ↓
[User clicks reset link]
         ↓
[Enter new password]
         ↓
[POST /auth/reset-password]
         ↓
┌─────────────────────────────────┐
│ Validation:                     │
│ 1. Verify token exists          │
│ 2. Check not expired            │
│ 3. Check not already used       │
│ 4. Update password hash         │
│ 5. Mark token as used           │
└─────────────────────────────────┘
         ↓
[Show "Password Reset Success"]
```

---

## 4. Security Features (OWASP Top 10:2025)

### 4.1 Rate Limiting (A07)

| Endpoint | Limit | Window | Action on Exceed |
|----------|-------|--------|------------------|
| `/auth/login` | 10 requests | 15 minutes | Return 429 error |
| `/auth/request-password-reset` | 5 requests | 1 hour | Return 429 error |
| General API | 500 requests | 15 minutes | Return 429 error |

### 4.2 Account Lockout (A07)

```
Failed Login Attempt
         ↓
[Increment loginAttempts]
         ↓
[loginAttempts >= 5?]
    │
    ├─→ Yes: Lock account for 30 minutes
    │        Set lockedUntil timestamp
    │        Log security event
    │
    └─→ No: Continue normal flow
```

### 4.3 Password Security (A04)

| Portal | Hash Algorithm | Salt Rounds | Min Length |
|--------|---------------|-------------|------------|
| Patient Portal | Base64 (legacy) | N/A | 6 chars |
| Doctor Portal | bcrypt | 10 | 8 chars |

**Note**: Patient portal should be upgraded to bcrypt in future.

### 4.4 Session Security (A07)

- **Doctor Portal**: Sessions bound to IP and User-Agent
- **Session invalidation**: Marked as `isValid: false` on logout
- **Token format**: 64-character cryptographic random hex string

### 4.5 Audit Logging (A09)

All security events are logged:
- Login success/failure
- Registration
- Password reset requests
- Account lockouts
- Role changes
- Admin actions

**Storage**: `izara-users-credentials/login-history/{userId}.json`

---

## 5. Role-Based Access Control (RBAC)

### 5.1 Patient Portal Access

| Feature | Patient |
|---------|---------|
| View Dashboard | ✅ |
| Book Appointments | ✅ |
| View Health Records | ✅ (own only) |
| AI Health Chat | ✅ |
| Cancel Appointments | ✅ (own only) |

### 5.2 Doctor Portal Access

| Feature | Doctor | Admin |
|---------|--------|-------|
| View Dashboard | ✅ | ✅ |
| View Patient Queue | ✅ (assigned) | ✅ (all) |
| Confirm Appointments | ✅ | ✅ |
| View Scheduled Meetings | ✅ (own) | ✅ (all) |
| Complete EMR | ✅ | ✅ |
| Write Prescriptions | ✅ | ✅ |
| Doctor Management | ❌ | ✅ |
| Approve Registrations | ❌ | ✅ |
| Assign Roles | ❌ | ✅ |
| View Analytics | ❌ | ✅ |
| Manage All Appointments | ❌ | ✅ |

### 5.3 Checking Admin Status in Code

```typescript
// Check if user is admin
const isAdmin = user.isAdmin || user.role === 'admin';

// Check specific privilege
const canManageDoctors = user.adminPrivileges?.canManageDoctors || user.isAdmin;
```

---

## 6. Data Storage Structure

### 6.1 GCS Bucket Layout

```
izara-users-credentials/
├── users/
│   ├── index.json                    # All users index
│   ├── DOC-DEMO-001.json            # Admin user
│   ├── DOC-DEMO-002.json            # Doctor user
│   └── DOC-xxx-xxx.json             # Other doctors
├── sessions/
│   └── {sessionToken}.json          # Active sessions
├── password-resets/
│   └── {resetToken}.json            # Password reset tokens
├── login-history/
│   └── {userId}.json                # Login audit trail
├── pending-approvals.json           # Pending doctor registrations
└── email-logs.json                  # Sent email log

# All users (patients, doctors, admins) stored in izara-users-credentials
# Patients: users/PATIENT-xxx.json
# Doctors: doctors/DOC-xxx.json  
# Admins: admins/ADMIN-xxx.json

izara-patients-data/
├── patients.json                    # Patients index
└── patients/
    └── {patientId}/
        ├── profile.json             # Patient profile
        └── phr.json                 # Health records

izara-doctors-data/
├── doctors.json                     # Doctors index
└── doctors/
    └── {doctorId}/
        └── profile.json             # Doctor profile
```

---

## 7. Email Notifications

### 7.1 Notification Triggers

| Event | Recipient | Template |
|-------|-----------|----------|
| Doctor Registration | Admin | New registration alert |
| Doctor Approved | Doctor | Approval confirmation |
| Doctor Rejected | Doctor | Rejection with reason |
| Password Reset | User | Reset link email |
| Role Changed | Doctor | New privileges notification |

### 7.2 Email Service

**Code Reference**: `Isara-doctor-portal/server/emailService.cjs`

```javascript
// Available methods
emailService.sendAdminNotification(adminEmail, doctorInfo)
emailService.sendApprovalNotification(doctorEmail, doctorName)
emailService.sendRejectionNotification(doctorEmail, doctorName, reason)
emailService.sendPasswordResetEmail(email, resetToken, userName)
```

---

## 8. Frontend Components

### 8.1 Patient Portal

| Component | Path | Purpose |
|-----------|------|---------|
| `LoginPage` | `/pages/auth/LoginPage.tsx` | Patient login |
| `RegisterPage` | `/pages/auth/RegisterPage.tsx` | Patient registration |
| `AuthContext` | `/contexts/AuthContext.tsx` | Auth state management |

### 8.2 Doctor Portal

| Component | Path | Purpose |
|-----------|------|---------|
| `DoctorLogin` | `/pages/DoctorLogin.tsx` | Doctor/Admin login |
| `DoctorRegister` | `/pages/DoctorRegister.tsx` | Doctor registration |
| `AuthProvider` | `/components/common/AuthProvider.tsx` | Auth state management |
| `AdminDoctorManagement` | `/pages/AdminDoctorManagement.tsx` | Admin: manage doctors |

---

## 9. Default Test Accounts

### 9.1 Pre-seeded Accounts

| Portal | Email | Password | Role |
|--------|-------|----------|------|
| Doctor | `admin.test@izara.com` | `P@ssw0rd` | Admin |
| Doctor | `doctor.test@izara.com` | `P@ssw0rd` | Doctor |
| Patient | `patient.test@izara.com` | `P@ssw0rd` | Patient |
| Patient | `demo.test@gmail.com` | `P@ssw0rd` | Patient (auto-created) |

### 9.2 Seeding Data

```bash
# Seed minimal test data
cd scripts/seeders
node seedMinimalDataToGCS.cjs

# Or seed all data
node seedAllData.cjs
```

---

## 10. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
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

## 11. Implementation TODOs

### 11.1 Missing Backend Endpoint

**Issue**: The frontend calls `/admin/update-role` but the endpoint doesn't exist.

**Required Implementation**:
```javascript
// Add to authServer.cjs
app.post('/admin/update-role', async (req, res) => {
  const { userId, adminId, role, isAdmin } = req.body;
  
  // 1. Verify admin permissions
  // 2. Fetch user credential
  // 3. Update role and isAdmin flag
  // 4. Set adminPrivileges if promoting to admin
  // 5. Update users index
  // 6. Log audit event
  // 7. Send notification email
});
```

### 11.2 Security Improvements

- [ ] Upgrade Patient Portal to bcrypt password hashing
- [ ] Add two-factor authentication (2FA)
- [ ] Implement refresh tokens
- [ ] Add CAPTCHA to registration forms
- [ ] Implement session revocation for all devices

### 11.3 Feature Enhancements

- [ ] Email verification for new registrations
- [ ] Profile photo upload
- [ ] Account deletion/PDPA compliance
- [ ] Admin activity audit dashboard

---

## 12. Summary Table

| Step | User | Portal | Page/Component | Action | Status Update |
|------|------|--------|----------------|--------|---------------|
| Register | Patient | Patient | RegisterPage | Fill form, submit | Active immediately |
| Register | Doctor | Doctor | DoctorRegister | Fill form, submit | Pending approval |
| Login | Patient | Patient | LoginPage | Enter credentials | Session created |
| Login | Doctor | Doctor | DoctorLogin | Enter credentials | Checked for approval |
| Approve | Admin | Doctor | AdminDoctorManagement | Click approve | approved, isActive=true |
| Reject | Admin | Doctor | AdminDoctorManagement | Click reject | rejected, isActive=false |
| Grant Admin | Admin | Doctor | AdminDoctorManagement | Change role | role=admin, isAdmin=true |
| Revoke Admin | Admin | Doctor | AdminDoctorManagement | Change role | role=doctor, isAdmin=false |
| Reset Password | Any | Both | Forgot Password | Request + new password | Password updated |
| Logout | Any | Both | Header/Menu | Click logout | Session invalidated |

---

**This workflow document covers all user management scenarios for the Izara Telemedicine platform. Developers and AI agents should reference this for implementing and maintaining user-related features.**