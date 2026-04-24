# 👥 Doctor Portal — Admin Doctor Management

**Route:** `/admin/doctors`
**Component:** `src/pages/AdminDoctorManagement.tsx`
**Access:** 🔒 Admin only
**Thai Title:** จัดการแพทย์ / Doctor Management

---


## 1. Purpose

Admin-only page for managing doctor registrations: approve/reject new doctor accounts, change roles (doctor ↔ admin), and manage existing doctor access.

---


## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👥 จัดการแพทย์ (Doctor Management)                                  │
│                                                                     │
│  🔍 [Search by name, email, specialty...                    ]      │
│                                                                     │
│  Tabs: [ทั้งหมด (5)] [รอ (2)] [อนุมัติ (2)] [ปฏิเสธ (0)] [Admin (1)] │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟡 PENDING                                                  │   │
│  │  นพ. สมศรี รักษา · ศัลยกรรม · License: 12345               │   │
│  │  Registered: 20 ม.ค. 2569                                    │   │
│  │                                                              │   │
│  │  [✅ Approve] [❌ Reject]                                    │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🟢 APPROVED · Doctor                                        │   │
│  │  นพ. ทดสอบ ระบบ · อายุรกรรม · License: 67890                │   │
│  │  Approved: 15 ม.ค. 2569                                      │   │
│  │                                                              │   │
│  │  [🔄 Change Role] [🗑️ Remove]                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Actions

| Action | Description | Target Status |
| ------ | ----------- | ------------- |
| Approve | Approve pending registration | approved |
| Reject | Reject with reason | rejected |
| Change Role | Doctor ↔ Admin toggle | Role change |
| Demote Admin | Remove admin privileges | Back to doctor |
| Remove | Remove from platform | Deactivated |



---


## 4. Workflows


### Workflow 1: Approve New Doctor

```text
Step 1: Admin sees pending registration in "รอ" tab
Step 2: Reviews doctor details (name, specialty, license)
Step 3: Clicks "Approve"
Step 4: PATCH /api/admin/doctors/:id/approve
Step 5: Doctor receives approval email notification
Step 6: Doctor can now log in to the portal
```


### Workflow 2: Reject Registration

```text
Step 1: Admin reviews pending doctor
Step 2: Clicks "Reject"
Step 3: Enters rejection reason
Step 4: PATCH /api/admin/doctors/:id/reject
Step 5: Doctor receives rejection email with reason
```


### Workflow 3: Change Role

```text
Step 1: Admin clicks "Change Role" on approved doctor
Step 2: Role modal opens (doctor → admin or admin → doctor)
Step 3: Select new role
Step 4: PATCH /api/admin/doctors/:id/role
Step 5: Role updated immediately
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/admin/doctors` | List all doctors |
| PATCH | `/api/admin/doctors/:id/approve` | Approve registration |
| PATCH | `/api/admin/doctors/:id/reject` | Reject registration |
| PATCH | `/api/admin/doctors/:id/role` | Change role |
| DELETE | `/api/admin/doctors/:id` | Remove doctor |
| POST | `/api/admin/doctors/:id/notification` | Send notification |



---


## 6. AI Agent Improvement Opportunities


- **License verification**: AI auto-verify Thai medical license numbers

- **Background screening**: AI cross-reference with medical boards

- **Activity monitoring**: AI flag inactive or underperforming accounts

- **Onboarding automation**: AI guide new doctors through portal setup

---


## PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT/UPDATE | Doctor user accounts (role='doctor') |
| doctor_profiles | SELECT/UPDATE | Doctor profile approval/rejection |




### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/admin/doctors | GET | SELECT users JOIN doctor_profiles WHERE role='doctor' |
| PUT /api/admin/doctors/:id/approve | PUT | UPDATE users SET status='approved' WHERE id |
| PUT /api/admin/doctors/:id/reject | PUT | UPDATE users SET status='rejected' WHERE id |




### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

