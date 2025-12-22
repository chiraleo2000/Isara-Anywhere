# 🔐 Doctor Access Control

## Overview

This document describes the access control and permissions system for doctor users in the Izara Doctor Portal.

---

## 👤 User Roles

### Doctor Role
The `doctor` role is the primary role for healthcare providers using the portal.

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'admin';
  doctorId: string;
  medicalLicenseNumber: string;
  isActive: boolean;
  emailVerified: boolean;
  specialty?: string;
  isAdmin?: boolean;          // Additional admin privileges
  adminPrivileges?: AdminPrivileges;
}
```

---

## 🛡️ Permission Levels

### Standard Doctor Permissions

| Permission | Description | Status |
|------------|-------------|--------|
| View Own Dashboard | Access personal dashboard | ✅ Allowed |
| View Patient List | See patients in system | ✅ Allowed |
| View Patient Records | Access patient EMRs | ✅ Allowed (with consent) |
| Create EMR | Create electronic medical records | ✅ Allowed |
| Edit Own EMR | Edit EMRs created by self | ✅ Allowed |
| Create Prescriptions | Write e-prescriptions | ✅ Allowed |
| Order Labs | Order laboratory tests | ✅ Allowed |
| Start Consultations | Conduct virtual meetings | ✅ Allowed |
| View Queue | See patient queue | ✅ Allowed |
| Manage Own Schedule | Set availability | ✅ Allowed |
| Use AI Assistant | Access clinical AI | ✅ Allowed |
| View Medical Content | Access resources | ✅ Allowed |
| View Consultants | Access consultant directory | ✅ Allowed |

### Restricted Actions for Doctors

| Action | Description | Status |
|--------|-------------|--------|
| Approve Doctors | Approve new registrations | ❌ Admin Only |
| Manage All Appointments | Assign to other doctors | ❌ Admin Only |
| View All Doctor Accounts | See all system doctors | ❌ Admin Only |
| System Settings | Modify system config | ❌ Admin Only |
| Delete Patient Records | Remove patient data | ❌ Admin Only |
| Edit Other Doctor's EMR | Modify others' records | ❌ Restricted |

---

## 🔄 Registration & Approval Process

### Registration Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Doctor     │────▶│   Submit     │────▶│   Pending    │
│   Registers  │     │   Form       │     │   Approval   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                          ┌──────┴──────┐
                                          │   Admin     │
                                          │   Reviews   │
                                          └──────┬──────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           │                     │                     │
                           ▼                     ▼                     ▼
                    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                    │   Approved   │      │   Rejected   │      │   Pending    │
                    │   (Active)   │      │   (Inactive) │      │   (Waiting)  │
                    └──────────────┘      └──────────────┘      └──────────────┘
```

### Approval Status States

| Status | Description | Can Login |
|--------|-------------|-----------|
| `pending` | Awaiting admin review | ❌ No |
| `approved` | Approved by admin | ✅ Yes |
| `rejected` | Rejected by admin | ❌ No |

### Required Registration Fields

```typescript
interface RegisterData {
  email: string;              // Required
  password: string;           // Required, min 8 chars
  confirmPassword: string;    // Must match password
  name: string;               // Required
  medicalLicenseNumber: string; // Required, format: MD-XXXXXX
  specialty?: string;         // Optional
  dateOfBirth?: string;       // Optional
  phone?: string;             // Optional
}
```

---

## 🔑 Authentication Flow

### Login Process

```
1. Enter Credentials
       │
       ▼
2. Verify Password (SHA256)
       │
       ├── Invalid → Show Error (Max 5 attempts)
       │
       ▼
3. Check Account Status
       │
       ├── Locked → Show Lockout Message
       ├── Pending → Show "Awaiting Approval"
       ├── Rejected → Show Rejection Message
       ├── Inactive → Show Deactivation Message
       │
       ▼
4. Create Session Token
       │
       ▼
5. Redirect to Dashboard
```

### Session Management

```typescript
const STORAGE_KEYS = {
  CURRENT_USER: 'izara_current_user',
  AUTH_TOKEN: 'izara_auth_token',
  SESSION_EXPIRY: 'izara_session_expiry',
};

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
```

### Account Lockout Policy

| Trigger | Action |
|---------|--------|
| 5 failed login attempts | Account locked for 15 minutes |
| Lockout expires | Account automatically unlocked |
| Admin unlock | Manual unlock by administrator |

---

## 📋 PDPA Consent Requirements

### Consent-Based Access

Doctors can only access patient data when:
1. Patient has granted consent
2. Consent has not expired
3. Requested data type is in allowed scope

```typescript
interface ConsentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  consentType: 'phr-access' | 'ehr-access' | 'data-sharing' | 'research' | 'recording';
  granted: boolean;
  grantedAt?: Date;
  expiresAt?: Date;
  scope: string[];
}
```

### Consent Verification

```typescript
// Before accessing patient data
const consent = await patientDataService.verifyConsent(
  patientId,
  doctorId,
  ['ehr-access']
);

if (!consent || !consent.granted) {
  throw new Error('Patient consent required');
}
```

### Data Types Requiring Consent

| Data Type | Consent Type |
|-----------|--------------|
| PHR (Personal Health Record) | `phr-access` |
| EHR (Electronic Health Record) | `ehr-access` |
| Data Sharing | `data-sharing` |
| Research Data | `research` |
| Meeting Recording | `recording` |

---

## 🛣️ Route Protection

### Protected Routes

All routes under `/doctor/:userId/*` are protected by `ProtectedRoute` component.

```typescript
<Route
  path="/doctor/:userId/*"
  element={
    <ProtectedRoute allowedRoles={['doctor', 'admin']}>
      <DoctorPortal />
    </ProtectedRoute>
  }
/>
```

### Route Access by Role

| Route | Doctor | Admin |
|-------|--------|-------|
| `/doctor/:userId/dashboard` | ✅ | ✅ |
| `/doctor/:userId/patients` | ✅ | ✅ |
| `/doctor/:userId/schedule` | ✅ | ✅ |
| `/doctor/:userId/consultations` | ✅ | ✅ |
| `/doctor/:userId/medical-consultants` | ✅ | ✅ |
| `/doctor/:userId/doctors` | ✅ | ✅ |
| `/doctor/:userId/medical-content` | ✅ | ✅ |
| `/doctor/:userId/health-meeting` | ✅ | ✅ |
| `/doctor/:userId/availability` | ✅ | ✅ |
| `/doctor/:userId/clinical-resources` | ✅ | ✅ |
| `/doctor/:userId/doctor-management` | ❌ | ✅ |
| `/doctor/:userId/appointment-management` | ❌ | ✅ |

---

## 🔒 Data Access Control

### Patient Data Access

```
Request Patient Data
       │
       ▼
Verify User Authentication
       │
       ▼
Check User Role
       │
       ▼
Verify PDPA Consent
       │
       ▼
Log Access (Audit Trail)
       │
       ▼
Return Data
```

### EMR Access Rules

| Action | Rule |
|--------|------|
| View EMR | Doctor must have consent or be creating doctor |
| Edit Draft EMR | Only creating doctor |
| Edit Finalized EMR | Amendment only (creates new version) |
| Delete EMR | Admin only |

### Audit Logging

All data access is logged for compliance:

```typescript
interface AuditLog {
  timestamp: Date;
  userId: string;
  action: 'view' | 'create' | 'update' | 'delete';
  resourceType: 'patient' | 'emr' | 'prescription' | 'lab-order';
  resourceId: string;
  ipAddress?: string;
  details?: string;
}
```

---

## 🔐 Security Measures

### Password Requirements

- Minimum 8 characters
- Stored as SHA256 hash
- Never stored in plain text

### Token Security

- Cryptographically random tokens
- Tokens stored in GCS sessions bucket
- Tokens expire after 30 minutes of inactivity

### Session Security

| Measure | Implementation |
|---------|----------------|
| Token expiration | 30-minute timeout |
| Secure storage | Session data in GCS |
| Client storage | localStorage for token only |
| HTTPS | Required in production |

---

## 📊 Access Control Matrix

### Feature Access by Status

| Feature | Approved Doctor | Pending Doctor | Rejected |
|---------|-----------------|----------------|----------|
| Login | ✅ | ❌ | ❌ |
| View Dashboard | ✅ | ❌ | ❌ |
| View Patients | ✅ | ❌ | ❌ |
| Create EMR | ✅ | ❌ | ❌ |
| Prescribe | ✅ | ❌ | ❌ |
| Order Labs | ✅ | ❌ | ❌ |
| Virtual Consult | ✅ | ❌ | ❌ |
| Update Profile | ✅ | ❌ | ❌ |

### Data Access by Consent

| Data | No Consent | With Consent | Expired Consent |
|------|------------|--------------|-----------------|
| Basic Demographics | ❌ | ✅ | ❌ |
| Medical History | ❌ | ✅ | ❌ |
| EMR Records | ❌ | ✅ | ❌ |
| Lab Results | ❌ | ✅ | ❌ |
| Prescriptions | ❌ | ✅ | ❌ |
| Imaging | ❌ | ✅ | ❌ |

---

## ⚠️ Error Messages

### Authentication Errors

| Error | Message |
|-------|---------|
| Invalid credentials | "Invalid email or password" |
| Account locked | "Account is locked. Try again in X minutes" |
| Pending approval | "Your account is awaiting administrator approval" |
| Account deactivated | "Account is deactivated. Please contact administrator" |

### Authorization Errors

| Error | Message |
|-------|---------|
| No consent | "Patient consent required to access this data" |
| Expired consent | "Patient consent has expired" |
| Admin only | "This feature requires administrator privileges" |
| Invalid session | "Session expired. Please login again" |

---

## 🔄 Doctor Status Lifecycle

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ Register  │────▶│  Pending  │────▶│  Approved │────▶│  Active   │
└───────────┘     └─────┬─────┘     └───────────┘     └─────┬─────┘
                       │                                    │
                       ▼                                    ▼
                ┌───────────┐                        ┌───────────┐
                │  Rejected │                        │ Deactivated│
                └───────────┘                        └───────────┘
```

| Status | Can Login | Can Access Data | Can Be Reactivated |
|--------|-----------|-----------------|-------------------|
| Pending | ❌ | ❌ | N/A (not yet approved) |
| Approved | ✅ | ✅ | N/A (active) |
| Rejected | ❌ | ❌ | Requires new registration |
| Active | ✅ | ✅ | N/A (already active) |
| Deactivated | ❌ | ❌ | ✅ (Admin can reactivate) |
