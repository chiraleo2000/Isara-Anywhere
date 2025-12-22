# Izara Doctor Portal - Admin Features

## Overview

Admin users are doctors with elevated privileges. They have all doctor capabilities plus system management features.

## Admin Identification

```typescript
// Check admin status
const isAdmin = user.isAdmin || user.role === 'admin';
```

---

## 1. Doctor Management

### Location
Dashboard → Doctor Management (sidebar)

### Features

#### View All Doctors
- Approved doctors
- Pending registrations
- Rejected applications

#### Approve Registration
```
1. View pending doctor in list
2. Review details (name, license, specialty)
3. Click "Approve"
4. System updates:
   - isActive: true
   - isApproved: true
   - approvalStatus: 'approved'
   - approvedAt: timestamp
   - approvedBy: adminId
5. Doctor can now log in
```

#### Reject Registration
```
1. View pending doctor
2. Click "Reject"
3. Enter rejection reason
4. System updates:
   - isActive: false
   - approvalStatus: 'rejected'
   - rejectedAt: timestamp
   - rejectionReason: text
5. Doctor notified via email
```

#### Change User Role
```
1. Find approved doctor
2. Click "Manage Role"
3. Select: Doctor ↔ Admin
4. Confirm change
5. POST /admin/update-role
6. User privileges updated
```

---

## 2. All Appointments Tab

### Location
Appointments & Meetings → All Appointments tab

### Features
- View ALL appointments (not just assigned)
- Search by patient name/email
- Filter by status
- Filter by date range
- Assign unassigned appointments
- Reassign appointments

### Visibility

| Field | Doctor | Admin |
|-------|--------|-------|
| Own appointments | ✅ | ✅ |
| Other doctors' appointments | ❌ | ✅ |
| Unassigned pool | ❌ | ✅ |
| Assign/Reassign | ❌ | ✅ |

---

## 3. Clinical Resources Approval

### Workflow
```
Doctor submits → Admin reviews → Approve/Reject
```

### Admin Actions
- View pending submissions (badge count)
- Read full content
- Add feedback comments
- Approve (→ published)
- Reject (→ with reason)

### Pending Badge
Red badge on Clinical Resources showing pending count.

---

## 4. Medical Consultants Management

### Admin-Only Actions
| Action | Doctor | Admin |
|--------|--------|-------|
| View consultants | ✅ | ✅ |
| Rate/Review | ✅ | ✅ |
| Add new | ❌ | ✅ |
| Edit details | ❌ | ✅ |
| Toggle availability | ❌ | ✅ |
| Delete | ❌ | ✅ |
| View admin notes | ❌ | ✅ |

---

## 5. Role Permissions Matrix

| Feature | Doctor | Admin |
|---------|--------|-------|
| View Dashboard | ✅ | ✅ |
| View Assigned Queue | ✅ | ✅ |
| View ALL Queue | ❌ | ✅ |
| Confirm Appointments | ✅ | ✅ |
| Assign Appointments | ❌ | ✅ |
| Create EMR | ✅ | ✅ |
| Write Prescriptions | ✅ | ✅ |
| View Clinical Resources | ✅ | ✅ |
| Create Resources | ✅ | ✅ |
| Approve Resources | ❌ | ✅ |
| Manage Consultants | ❌ | ✅ |
| Doctor Management | ❌ | ✅ |
| Role Management | ❌ | ✅ |
| View Analytics | ❌ | ✅ |

---

## 6. Admin Privileges Object

```typescript
interface AdminPrivileges {
  canManageDoctors: boolean;      // Approve/reject doctors
  canManagePatients: boolean;     // View/manage patient data
  canManageAppointments: boolean; // Manage all appointments
  canViewAnalytics: boolean;      // Access analytics
  canManageSettings: boolean;     // System settings
  canAssignRoles: boolean;        // Promote/demote users
  level: 'super_admin' | 'admin' | 'moderator';
}
```

---

## 7. Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/pending-doctors` | List all doctors |
| POST | `/admin/approve-doctor` | Approve registration |
| POST | `/admin/reject-doctor` | Reject registration |
| POST | `/admin/update-role` | Change user role |

---

## 8. Audit Trail

All admin actions are logged:
- Login/logout
- Doctor approval/rejection
- Role changes
- Appointment assignments
- Resource approvals

### Log Location
`izara-users-credentials/login-history/{userId}.json`

### Log Format
```json
{
  "event": "USER_ROLE_CHANGED",
  "severity": "HIGH",
  "userId": "DOC-xxx",
  "previousRole": "doctor",
  "newRole": "admin",
  "changedBy": "admin-id",
  "timestamp": "2025-12-14T10:00:00Z",
  "ip": "xxx.xxx.xxx.xxx"
}
```

---
**Last Updated:** December 14, 2025
