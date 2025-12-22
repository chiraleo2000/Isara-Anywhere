# 🔐 Admin Access Control

## Overview

This document describes the access control and permission system for administrator users in the Izara Doctor Portal.

---

## 👤 Admin User Structure

### User with Admin Privileges

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'doctor' | 'admin';       // Primary role
  isAdmin?: boolean;              // Admin flag
  adminPrivileges?: AdminPrivileges;
}

interface AdminPrivileges {
  canManageDoctors: boolean;      // Approve/reject doctors
  canManagePatients: boolean;     // Manage patient accounts
  canManageAppointments: boolean; // Assign appointments
  canViewAnalytics: boolean;      // Access analytics
  canManageSettings: boolean;     // System settings
  canAssignRoles: boolean;        // Assign admin roles
  level: 'super_admin' | 'admin' | 'moderator';
}
```

---

## 🛡️ Admin Privilege Levels

### Super Admin
Full system access with all privileges.

| Privilege | Status |
|-----------|--------|
| Manage Doctors | ✅ Yes |
| Manage Patients | ✅ Yes |
| Manage Appointments | ✅ Yes |
| View Analytics | ✅ Yes |
| Manage Settings | ✅ Yes |
| Assign Roles | ✅ Yes |

### Admin
Standard administrative access.

| Privilege | Status |
|-----------|--------|
| Manage Doctors | ✅ Yes |
| Manage Patients | ✅ Yes |
| Manage Appointments | ✅ Yes |
| View Analytics | ✅ Yes |
| Manage Settings | ❌ No |
| Assign Roles | ❌ No |

### Moderator
Limited administrative access.

| Privilege | Status |
|-----------|--------|
| Manage Doctors | ❌ No (view only) |
| Manage Patients | ❌ No (view only) |
| Manage Appointments | ✅ Yes |
| View Analytics | ✅ Yes |
| Manage Settings | ❌ No |
| Assign Roles | ❌ No |

---

## 🔑 Admin Access Verification

### Code Implementation

```typescript
// Check if user is admin
const isAdmin = user.isAdmin || user.role === 'admin';

// In React component
useEffect(() => {
  if (authLoading) return;
  
  if (!isAuthenticated || !user) {
    navigate('/login');
    return;
  }
  
  const isAdmin = user.isAdmin || user.role === 'admin';
  if (!isAdmin) {
    navigate(-1); // Go back for non-admins
    return;
  }
}, [authLoading, isAuthenticated, user, navigate]);
```

### Route Protection

```typescript
// In DoctorPortal.tsx
{(user.isAdmin || user.role === 'admin') && (
  <Route 
    path="doctor-management" 
    element={<AdminDoctorManagement />} 
  />
)}

{(user.isAdmin || user.role === 'admin') && (
  <Route 
    path="appointment-management" 
    element={<AdminAppointmentManagement />} 
  />
)}
```

---

## 📋 Permission Matrix

### Route Access

| Route | Doctor | Admin | Super Admin |
|-------|--------|-------|-------------|
| `/doctor/:id/dashboard` | ✅ | ✅ | ✅ |
| `/doctor/:id/patients` | ✅ | ✅ | ✅ |
| `/doctor/:id/schedule` | ✅ | ✅ | ✅ |
| `/doctor/:id/consultations` | ✅ | ✅ | ✅ |
| `/doctor/:id/health-meeting` | ✅ | ✅ | ✅ |
| `/doctor/:id/doctors` | ✅ | ✅ | ✅ |
| `/doctor/:id/medical-consultants` | ✅ | ✅ | ✅ |
| `/doctor/:id/medical-content` | ✅ | ✅ | ✅ |
| `/doctor/:id/clinical-resources` | ✅ | ✅ | ✅ |
| `/doctor/:id/availability` | ✅ | ✅ | ✅ |
| `/doctor/:id/doctor-management` | ❌ | ✅ | ✅ |
| `/doctor/:id/appointment-management` | ❌ | ✅ | ✅ |

### Feature Access

| Feature | Doctor | Admin | Super Admin |
|---------|--------|-------|-------------|
| View patient records | ✅ | ✅ | ✅ |
| Create EMR | ✅ | ✅ | ✅ |
| Write prescriptions | ✅ | ✅ | ✅ |
| Order labs | ✅ | ✅ | ✅ |
| Start consultations | ✅ | ✅ | ✅ |
| Approve doctors | ❌ | ✅ | ✅ |
| Reject doctors | ❌ | ✅ | ✅ |
| Assign appointments | ❌ | ✅ | ✅ |
| View all doctors | ❌ | ✅ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| Assign admin roles | ❌ | ❌ | ✅ |

### API Endpoint Access

| Endpoint | Doctor | Admin |
|----------|--------|-------|
| `GET /admin/pending-doctors` | ❌ | ✅ |
| `POST /admin/approve-doctor` | ❌ | ✅ |
| `POST /admin/reject-doctor` | ❌ | ✅ |
| `GET /api/appointments` (all) | ❌ | ✅ |
| `PUT /api/appointments/:id` (assign) | ❌ | ✅ |

---

## 🔄 Admin Role Assignment

### Creating Admin User

Admins are typically created through:
1. Direct database/GCS insertion (initial setup)
2. Super admin assignment (ongoing)
3. Migration from existing doctor account

### Admin User Record Example

```json
{
  "id": "ADMIN-001",
  "email": "admin@izara.com",
  "passwordHash": "sha256-hash",
  "role": "admin",
  "isAdmin": true,
  "adminPrivileges": {
    "canManageDoctors": true,
    "canManagePatients": true,
    "canManageAppointments": true,
    "canViewAnalytics": true,
    "canManageSettings": false,
    "canAssignRoles": false,
    "level": "admin"
  },
  "name": "System Administrator",
  "isActive": true,
  "emailVerified": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "preferences": {
    "theme": "light",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    }
  }
}
```

---

## 🔒 Security Considerations

### Authentication Requirements

| Requirement | Implementation |
|-------------|----------------|
| Valid session | Token verified against GCS sessions |
| Active account | `isActive: true` |
| Admin privilege | `isAdmin: true` OR `role: 'admin'` |
| Not locked | No active lockout |

### Session Security

- Admin sessions use same timeout as doctor sessions (30 min)
- Session stored in GCS: `sessions/{token}.json`
- Token required for all admin API calls

### Audit Logging

All admin actions are logged:

```typescript
interface AdminAuditLog {
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  action: 'approve_doctor' | 'reject_doctor' | 'assign_appointment' | 'deactivate_user' | 'modify_settings';
  targetId: string;
  targetType: 'doctor' | 'appointment' | 'user' | 'setting';
  details: string;
  ipAddress?: string;
}
```

---

## 📊 Admin Actions Audit Trail

### Logged Actions

| Action | Details Logged |
|--------|----------------|
| Approve Doctor | Doctor ID, Admin ID, Timestamp |
| Reject Doctor | Doctor ID, Admin ID, Reason, Timestamp |
| Assign Appointment | Appointment ID, Doctor ID, Admin ID, Timestamp |
| Deactivate User | User ID, Admin ID, Reason, Timestamp |
| Modify Settings | Setting key, Old value, New value, Admin ID |

### Audit Log Storage

```
izara-users-credentials/
├── audit/
│   ├── admin-actions/
│   │   ├── 2024-12-01.json
│   │   ├── 2024-12-02.json
│   │   └── ...
│   └── login-history/
│       └── {userId}.json
```

---

## ⚠️ Access Denial Handling

### Non-Admin Access Attempt

When a non-admin tries to access admin routes:

1. Route protection check fails
2. User redirected to previous page (`navigate(-1)`)
3. No error message shown (silent redirect)
4. Attempt logged (planned)

### API Access Denial

When a non-admin calls admin API:

```json
{
  "error": "Unauthorized",
  "message": "Admin privileges required",
  "code": "ADMIN_REQUIRED"
}
```

---

## 🔐 Best Practices

### For Administrators

1. **Use strong passwords** - Minimum 12 characters
2. **Log out when done** - Don't leave sessions open
3. **Verify before approving** - Check doctor credentials
4. **Document rejections** - Include clear reasons
5. **Review audit logs** - Regular review of admin actions

### For System Setup

1. **Limit admin count** - Only necessary personnel
2. **Regular access reviews** - Quarterly privilege audits
3. **Separation of duties** - Different admins for different functions
4. **Emergency access plan** - Backup admin account procedure

---

## 📋 Admin Quick Reference

### Check Admin Status

```typescript
// In any component
const { user } = useAuth();
const isAdmin = user?.isAdmin || user?.role === 'admin';

if (isAdmin) {
  // Show admin features
}
```

### Admin-Only UI Elements

```tsx
{(user.isAdmin || user.role === 'admin') && (
  <NavItem
    icon={ShieldCheckIcon}
    label="Doctor Management"
    view="doctor-management"
  />
)}
```

### Admin API Authorization

```javascript
// Server-side check
async function adminOnly(req, res, next) {
  const user = await getUserFromToken(req.headers.authorization);
  
  if (!user || (!user.isAdmin && user.role !== 'admin')) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
}
```
