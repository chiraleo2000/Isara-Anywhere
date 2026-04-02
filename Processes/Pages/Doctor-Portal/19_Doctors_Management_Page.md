# 👨‍⚕️ Doctor Portal — Doctors Management Page

**Route:** `/doctors`
**Component:** `src/pages/DoctorsManagement.tsx`
**Access:** 🔒 Doctor / Admin
**Thai Title:** จัดการแพทย์ / Doctors Management

---

## 1. Purpose

Operational doctor directory for viewing doctor profiles, verification status, and availability. Different from Admin Doctor Management (which handles registration approval).

---

## 2. Features

| Feature | Description |
| ------- | ----------- |
| Search | Name, specialty, email |
| Department filter | 8 departments |
| Status filter | Active / Inactive / On-leave |
| Add Doctor | Admin only - quick add form |
| Verify Doctor | Admin only - verify credentials |
| Toggle Status | Admin only - active/inactive toggle |

---

## 3. Department List

| Department | Thai |
| ---------- | ---- |
| Internal Medicine | อายุรกรรม |
| Surgery | ศัลยกรรม |
| Pediatrics | กุมารเวชศาสตร์ |
| OB-GYN | สูติ-นรีเวชวิทยา |
| Orthopedics | กระดูกและข้อ |
| Cardiology | หัวใจ |
| Neurology | ระบบประสาท |
| Emergency | เวชศาสตร์ฉุกเฉิน |

---

## 4. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/doctors` | List all doctors |
| POST | `/api/doctors` | Add doctor (admin) |
| PATCH | `/api/doctors/:id/verify` | Verify doctor |
| PATCH | `/api/doctors/:id/status` | Toggle status |

---

## PostgreSQL Database Integration

### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT | Doctor accounts (role='doctor') |
| doctor_profiles | SELECT | Doctor specialty, license, credentials |
| doctor_schedules | SELECT | Doctor availability schedules |

### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/doctors | GET | SELECT users JOIN doctor_profiles JOIN doctor_schedules WHERE role='doctor' |

### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
