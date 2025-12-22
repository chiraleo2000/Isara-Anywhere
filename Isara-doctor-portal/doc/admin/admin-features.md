# 🔧 Admin Portal Features

## Overview

The Admin Portal provides system administrators with tools to manage doctors, appointments, and system-wide settings. Admin features are accessible to users with `isAdmin: true` or `role: 'admin'`.

---

## 🔐 Admin Access

### Eligibility
Admin features are available to users who have:
- `role: 'admin'` in their user profile
- OR `isAdmin: true` flag set

### Admin Privileges Structure

```typescript
interface AdminPrivileges {
  canManageDoctors: boolean;      // Approve/reject doctor registrations
  canManagePatients: boolean;     // View/edit patient accounts
  canManageAppointments: boolean; // Assign appointments to doctors
  canViewAnalytics: boolean;      // Access system analytics
  canManageSettings: boolean;     // Modify system settings
  canAssignRoles: boolean;        // Assign admin roles to others
  level: 'super_admin' | 'admin' | 'moderator';
}
```

---

## 👨‍⚕️ Doctor Management

### Feature Location
`/doctor/:userId/doctor-management`

### Capabilities

| Feature | Description |
|---------|-------------|
| **View All Doctors** | See all registered doctors |
| **Filter by Status** | All, Pending, Approved, Rejected |
| **Search** | Search by name, email, specialty |
| **Approve Doctor** | Approve pending registrations |
| **Reject Doctor** | Reject pending registrations |
| **View History** | See approval/rejection history |

### Doctor Status Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCTOR MANAGEMENT                             │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [All] [Pending] [Approved] [Rejected]                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Doctor Card                                                 │ │
│  │ ┌──────┐  Name: Dr. John Smith                             │ │
│  │ │ 📷   │  Email: john.smith@hospital.com                   │ │
│  │ │      │  Specialty: Cardiology                            │ │
│  │ └──────┘  License: MD-123456                               │ │
│  │           Status: ⏳ Pending                                │ │
│  │           Registered: Dec 5, 2024                          │ │
│  │                                                             │ │
│  │  [✅ Approve]  [❌ Reject]  [👁️ View Details]              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Doctor Information Displayed

| Field | Description |
|-------|-------------|
| Name | Doctor's full name |
| Email | Contact email |
| Specialty | Medical specialty |
| Medical License | License number (MD-XXXXXX) |
| Phone | Contact phone |
| Created At | Registration date |
| Status | Pending/Approved/Rejected |
| Qualifications | List of qualifications |
| Experience | Years of experience |
| Hospital | Affiliated hospital |
| Last Login | Most recent login time |

### Approval Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Doctor     │────▶│   Admin      │────▶│   Approved   │
│   Registers  │     │   Reviews    │     │   (Active)   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                           │
                           │
                           ▼
                    ┌──────────────┐
                    │   Rejected   │
                    │   (Inactive) │
                    └──────────────┘
```

### Actions

#### Approve Doctor
- Click "Approve" button
- Confirmation modal appears
- Doctor receives email notification
- Status changes to "Approved"
- Doctor can now login

#### Reject Doctor
- Click "Reject" button
- Confirmation modal appears
- Optional rejection reason
- Status changes to "Rejected"
- Doctor cannot login

### API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/pending-doctors` | GET | Get all doctors with status |
| `/admin/approve-doctor` | POST | Approve a doctor |
| `/admin/reject-doctor` | POST | Reject a doctor |

---

## 📅 Appointment Management

### Feature Location
`/doctor/:userId/appointment-management`

### Capabilities

| Feature | Description |
|---------|-------------|
| **View All Appointments** | See all appointment requests |
| **Filter by Status** | Pending, Assigned, All |
| **Assign to Doctor** | Assign appointments to specific doctors |
| **Track Status** | Monitor appointment lifecycle |
| **Search** | Search by patient name, date |

### Appointment Request Structure

```typescript
interface AppointmentRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  requestedDate: string;
  preferredTime?: string;
  reason: string;
  symptoms?: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'assigned' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedDateTime?: string;
  createdAt: string;
  notes?: string;
}
```

### Appointment Status Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Pending    │────▶│   Assigned   │────▶│  Confirmed   │────▶│  Completed   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                                                               │
       │                                                               │
       ▼                                                               ▼
┌──────────────┐                                               ┌──────────────┐
│   Rejected   │                                               │  Cancelled   │
└──────────────┘                                               └──────────────┘
```

### Appointment Management UI

```
┌─────────────────────────────────────────────────────────────────┐
│                  APPOINTMENT MANAGEMENT                          │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Pending] [Assigned] [All]           [🔍 Search]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Appointment Request                                         │ │
│  │                                                             │ │
│  │ Patient: Somying Wattana                                   │ │
│  │ Email: somying.w@email.com                                 │ │
│  │ Phone: +66-8x-xxx-1111                                     │ │
│  │ Requested Date: Dec 10, 2024                               │ │
│  │ Reason: Diabetes Follow-up                                 │ │
│  │ Urgency: 🟡 Medium                                         │ │
│  │ Status: ⏳ Pending                                         │ │
│  │                                                             │ │
│  │  [📋 Assign to Doctor]  [❌ Reject]  [👁️ View Details]    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Assignment Modal

When assigning an appointment:

| Field | Description |
|-------|-------------|
| **Doctor** | Select from approved doctors |
| **Date** | Appointment date |
| **Time** | Appointment time slot |
| **Notes** | Admin notes |

### Urgency Levels

| Level | Color | Description |
|-------|-------|-------------|
| Low | 🟢 Green | Routine appointment |
| Medium | 🟡 Yellow | Standard priority |
| High | 🟠 Orange | Priority attention needed |
| Emergency | 🔴 Red | Immediate attention |

---

## 📊 Admin Dashboard Analytics (Planned)

### Metrics

| Metric | Description |
|--------|-------------|
| Total Doctors | Count of registered doctors |
| Active Doctors | Doctors who logged in this month |
| Pending Approvals | Doctors awaiting approval |
| Total Appointments | All appointments in system |
| Today's Appointments | Scheduled for today |
| Completion Rate | % of completed appointments |

### Charts (Planned)

- Appointments over time
- Doctor activity
- Patient wait times
- Specialty distribution

---

## 🔔 Admin Notifications

### Email Notifications

Admin receives email when:
- New doctor registers (pending approval)
- Emergency appointment requested
- System alerts

### In-App Notifications

- Pending approval count badge
- New appointment requests
- System status updates

---

## ⚙️ System Settings (Planned)

### Configuration Areas

| Setting | Description |
|---------|-------------|
| Working Hours | Default clinic hours |
| Appointment Duration | Default slot length |
| Max Appointments | Daily limit per doctor |
| Auto-Approval | Enable/disable auto-approve |
| Email Templates | Customize notification emails |

---

## 🔒 Admin Security

### Admin-Only Routes

These routes check for admin privileges:

```typescript
{(user.isAdmin || user.role === 'admin') && (
  <Route path="doctor-management" element={<AdminDoctorManagement />} />
)}
{(user.isAdmin || user.role === 'admin') && (
  <Route path="appointment-management" element={<AdminAppointmentManagement />} />
)}
```

### Access Control Check

```typescript
useEffect(() => {
  if (authLoading) return;
  
  if (!isAuthenticated || !user) {
    navigate('/login');
    return;
  }
  
  const isAdmin = user.isAdmin || user.role === 'admin';
  if (!isAdmin) {
    navigate(-1); // Go back - non-admin cannot access
    return;
  }
}, [authLoading, isAuthenticated, user, navigate]);
```

### Audit Trail

All admin actions are logged:
- Doctor approvals/rejections
- Appointment assignments
- Setting changes
- User account modifications

---

## 📋 Admin Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Doctor Approval | ✅ Active | Approve/reject doctor registrations |
| Doctor List | ✅ Active | View all doctors with filtering |
| Appointment Assignment | ✅ Active | Assign appointments to doctors |
| Appointment Tracking | ✅ Active | Track appointment status |
| System Analytics | 🔄 Planned | Dashboard statistics |
| User Management | 🔄 Planned | Manage user accounts |
| System Settings | 🔄 Planned | Configure system parameters |
| Email Templates | 🔄 Planned | Customize notifications |
| Audit Logs | 🔄 Planned | View system audit trail |
