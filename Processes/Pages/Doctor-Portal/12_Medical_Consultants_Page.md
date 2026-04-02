# 👨‍⚕️ Doctor Portal — Medical Consultants Page

**Route:** `/consultants`
**Component:** `src/pages/MedicalConsultants.tsx`
**Access:** 🔒 Doctor (read + rate) / Admin (full CRUD)
**Thai Title:** แพทย์ที่ปรึกษา / Medical Consultants

---

## 1. Purpose

Specialist directory for patient referrals. Admin manages consultant profiles; doctors can view, rate, and contact consultants.

---

## 2. Features by Role

| Feature | Doctor | Admin |
| ------- | ------ | ----- |
| View consultants | ✅ | ✅ |
| Search/filter | ✅ | ✅ |
| Rate & review | ✅ | ✅ |
| Contact (email/call) | ✅ | ✅ |
| Add consultant | ❌ | ✅ |
| Edit consultant | ❌ | ✅ |
| Delete consultant | ❌ | ✅ |
| Toggle availability | ❌ | ✅ |

---

## 3. Consultant Profile Fields

| Field | Description |
| ----- | ----------- |
| Name | Full name (Thai/English) |
| Specialty | From 20 predefined specialties |
| Hospital | Affiliated hospital |
| Phone | Contact number |
| Email | Contact email |
| Languages | Spoken languages |
| Experience | Years of experience |
| Bio | Professional biography |
| Rating | Average star rating |
| Available | Toggle (green/gray badge) |
| Admin Notes | Internal notes (admin only) |

---

## 4. Workflows

### Admin: Add Consultant → Edit → Toggle → Delete

### Doctor: View → Rate → Contact (email/phone)

See [Medical_Consultants_Workflows.md](../../Processes/Medical_Consultants_Workflows.md) for detailed workflows.

---

## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/consultants` | List all consultants |
| POST | `/api/consultants` | Add consultant (admin) |
| PUT | `/api/consultants/:id` | Edit consultant (admin) |
| DELETE | `/api/consultants/:id` | Delete consultant (admin) |
| POST | `/api/consultants/:id/review` | Add rating/review |
| POST | `/api/consultants/:id/availability` | Toggle availability |

---

## 6. AI Agent Improvement Opportunities

- **Smart matching**: AI match patient condition to best specialist

- **Availability prediction**: AI predict consultant availability

- **Referral letter generation**: AI draft referral letters

---

## PostgreSQL Database Integration

### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| consultants | SELECT/INSERT/UPDATE/DELETE | Medical consultant directory CRUD |
| doctor_reviews | SELECT/INSERT | Doctor review submissions and ratings |

### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/consultants | GET | SELECT consultants |
| POST /api/consultants | POST | INSERT consultants |
| PUT /api/consultants/:id | PUT | UPDATE consultants WHERE id |
| DELETE /api/consultants/:id | DELETE | DELETE consultants WHERE id |
| POST /api/consultants/:id/review | POST | INSERT doctor_reviews |

### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
