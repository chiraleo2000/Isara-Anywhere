# 🔄 Admin Workflows

## Overview

This document describes the key workflows that administrators follow when managing the Izara Doctor Portal.

---

## 1️⃣ Doctor Approval Workflow

### Purpose
Process new doctor registration requests to grant or deny system access.

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Doctor     │────▶│   Email      │────▶│   Admin      │
│   Registers  │     │   Sent to    │     │   Opens      │
│              │     │   Admin      │     │   Portal     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Navigate   │
                                          │   to Doctor  │
                                          │   Management │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Review     │
                                          │   Application│
                                          └──────┬───────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           │                     │                     │
                           ▼                     │                     ▼
                    ┌──────────────┐             │              ┌──────────────┐
                    │   Approve    │             │              │   Reject     │
                    │   Doctor     │             │              │   Doctor     │
                    └──────┬───────┘             │              └──────┬───────┘
                           │                     │                     │
                           ▼                     │                     ▼
                    ┌──────────────┐             │              ┌──────────────┐
                    │   Email      │             │              │   Email      │
                    │   Approval   │             │              │   Rejection  │
                    │   Notice     │             │              │   Notice     │
                    └──────────────┘             │              └──────────────┘
                           │                     │                     │
                           ▼                     │                     │
                    ┌──────────────┐             │                     │
                    │   Doctor     │             │                     │
                    │   Can Login  │             │                     │
                    └──────────────┘             │                     │
```

### Detailed Steps

#### Step 1: Receive Notification
- New doctor registers on the portal
- Admin receives email notification
- Email contains: doctor name, email, specialty, registration time

#### Step 2: Access Admin Portal
- Admin logs into the portal
- Navigates to `/doctor/{adminId}/doctor-management`
- Selects "Pending" tab to view pending approvals

#### Step 3: Review Application
- Click on doctor card or "View Details"
- Review the following information:
  - Full name
  - Email address
  - Medical license number
  - Specialty
  - Qualifications
  - Experience
  - Contact information
  - Registration date

#### Step 4: Make Decision

**Option A: Approve**
1. Click "Approve" button
2. Confirmation modal appears
3. Confirm approval
4. System updates doctor status to "Approved"
5. Doctor receives approval email
6. Doctor can now login

**Option B: Reject**
1. Click "Reject" button
2. Confirmation modal appears
3. Optionally enter rejection reason
4. Confirm rejection
5. System updates doctor status to "Rejected"
6. Doctor receives rejection email
7. Doctor cannot login

#### Step 5: Post-Action
- Record appears in approval history
- Admin can view decision history
- Action logged for audit trail

### API Calls

```javascript
// Approve Doctor
POST /admin/approve-doctor
{
  "userId": "DOC-XXX-XXX",
  "adminId": "ADMIN-XXX",
  "adminEmail": "admin@izara.com"
}

// Reject Doctor
POST /admin/reject-doctor
{
  "userId": "DOC-XXX-XXX",
  "adminId": "ADMIN-XXX",
  "reason": "Incomplete documentation"
}
```

---

## 2️⃣ Appointment Assignment Workflow

### Purpose
Assign incoming patient appointment requests to appropriate doctors.

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Patient    │────▶│   Request    │────▶│   Admin      │
│   Requests   │     │   Created    │     │   Reviews    │
│   Appointment│     │   (Pending)  │     │   Request    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Check      │
                                          │   Doctor     │
                                          │   Availability│
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Select     │
                                          │   Doctor     │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Set        │
                                          │   Date/Time  │
                                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │   Assign     │
                                          │   Appointment│
                                          └──────┬───────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           │                     │                     │
                           ▼                     ▼                     ▼
                    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                    │   Notify     │      │   Notify     │      │   Update     │
                    │   Patient    │      │   Doctor     │      │   Calendar   │
                    └──────────────┘      └──────────────┘      └──────────────┘
```

### Detailed Steps

#### Step 1: View Pending Appointments
- Navigate to `/doctor/{adminId}/appointment-management`
- View "Pending" tab
- See list of unassigned appointment requests

#### Step 2: Review Request Details
- Click on appointment request
- Review:
  - Patient name and contact
  - Requested date/time
  - Reason for visit
  - Symptoms (if provided)
  - Urgency level

#### Step 3: Check Doctor Availability
- View list of approved doctors
- Check doctor's schedule
- Consider specialty match
- Consider workload distribution

#### Step 4: Assign Appointment
1. Click "Assign to Doctor" button
2. Assignment modal opens
3. Select doctor from dropdown
4. Choose date
5. Select time slot
6. Add any notes
7. Click "Confirm Assignment"

#### Step 5: System Updates
- Appointment status changes to "Assigned"
- Doctor's schedule updated
- Patient notified
- Doctor notified
- Calendar event created (if enabled)

### Assignment Criteria

| Criteria | Consideration |
|----------|---------------|
| **Specialty Match** | Match patient needs with doctor specialty |
| **Availability** | Check doctor's open slots |
| **Workload** | Balance appointments across doctors |
| **Urgency** | Prioritize high-urgency appointments |
| **Patient Preference** | Consider requested date/time |

### Urgency Handling

| Urgency | Response Time | Action |
|---------|---------------|--------|
| Emergency 🔴 | Immediate | Assign to first available doctor |
| High 🟠 | Same day | Priority assignment |
| Medium 🟡 | 24-48 hours | Normal processing |
| Low 🟢 | 3-5 days | Standard queue |

---

## 3️⃣ Doctor Account Management Workflow

### Purpose
Manage doctor accounts including activation, deactivation, and profile updates.

### View All Doctors
```
1. Navigate to Doctor Management
2. Select "All" tab
3. View complete doctor list
4. Use search/filter to find specific doctors
```

### Filter Options
| Filter | Values |
|--------|--------|
| Status | All, Pending, Approved, Rejected |
| Specialty | All specialties, specific specialty |
| Search | Name, Email, License number |

### Account Actions

#### Deactivate Account (Planned)
```
1. Find doctor in list
2. Click "Deactivate"
3. Enter reason
4. Confirm deactivation
5. Doctor cannot login
```

#### Reactivate Account (Planned)
```
1. Find deactivated doctor
2. Click "Reactivate"
3. Confirm reactivation
4. Doctor can login again
```

---

## 4️⃣ System Monitoring Workflow (Planned)

### Purpose
Monitor system health and usage metrics.

### Daily Checks
```
1. Login to admin portal
2. View dashboard statistics:
   - Active users today
   - Appointments completed
   - Pending approvals
   - System alerts
3. Review any error reports
4. Check pending tasks
```

### Weekly Review
```
1. Review approval statistics
2. Check appointment completion rates
3. Review doctor activity
4. Identify any bottlenecks
5. Plan for upcoming capacity needs
```

---

## 5️⃣ Bulk Operations Workflow (Planned)

### Bulk Approve
```
1. Select multiple pending doctors
2. Click "Bulk Approve"
3. Review selected doctors
4. Confirm bulk approval
5. All selected doctors approved
```

### Bulk Assignment
```
1. Select multiple pending appointments
2. Click "Bulk Assign"
3. Select doctor
4. Review assignments
5. Confirm bulk assignment
```

---

## 📋 Admin Workflow Quick Reference

| Workflow | Trigger | Duration | Frequency |
|----------|---------|----------|-----------|
| Doctor Approval | New registration | 5-10 min | As needed |
| Appointment Assignment | New request | 2-5 min | Multiple/day |
| Account Management | Request/issue | 5-10 min | As needed |
| System Monitoring | Daily | 10-15 min | Daily |
| Weekly Review | Weekly | 30-60 min | Weekly |

---

## ⚠️ Error Handling

### Common Issues

| Issue | Resolution |
|-------|------------|
| Approval fails | Check network, retry operation |
| Assignment fails | Verify doctor availability |
| Email not sent | Check email service status |
| Doctor not visible | Check filter settings |

### Escalation Path
1. Retry operation
2. Check system logs
3. Contact technical support
4. Document issue for review
