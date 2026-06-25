> **SSOT source:** `Processes/Separated_Workflows_And_Functions.md §O`
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Doctor registration and admin approval — edit canonical copy in platform `Processes/`.

## O. Doctor Registration & Approval Workflow


### O1. Doctor Registration

**Pages:** LoginPage.tsx (Doctor Portal) → Register tab
**API:** `POST /api/auth/register`
**Tables:** `users`

```text
Process:
1. Doctor fills registration form:
   - Name (Thai + English)
   - Email, password
   - Medical license number
   - Specialty
   - Hospital
2. INSERT INTO users (role='doctor', approval_status='pending', is_approved=false)
3. INSERT notifications → all admin users
4. Doctor sees "Pending Approval" screen on login
```

---


### O2. Admin Approval

**Pages:** `AdminDoctorManagement.tsx`
**API:** `PUT /api/admin/doctors/:id/approve`
**Tables:** `users`, `notifications`

```text
Process:
1. Admin views pending registrations tab
2. Review doctor credentials
3. Decision:
   - APPROVE: UPDATE is_approved=true, approval_status='approved'
   - REJECT: UPDATE approval_status='rejected', rejected_at
4. Notification → doctor
5. Approved doctor can now login
```

---


### O3. Role Management

```text
Process:
1. Admin views approved doctor list
2. Click "Change Role" → doctor ↔ admin toggle
3. UPDATE users SET role = new_role, role_updated_at, role_updated_by
4. Doctor gains/loses admin capabilities
```

---
