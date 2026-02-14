# 👤 Doctor Portal — Doctor Profile Page

**Route:** `/profile`  
**Component:** `src/pages/DoctorProfilePage.tsx`  
**Access:** 🔒 Doctor / Admin  
**Thai Title:** โปรไฟล์แพทย์ / Doctor Profile

---

## 1. Purpose

View and edit doctor/admin profile including avatar, contact info, specialty, and password management.

---

## 2. Features

| Feature | Description |
| ------- | ----------- |
| View/Edit toggle | Switch between read and edit modes |
| Avatar upload | JPG/PNG/WebP, max 5MB, base64 |
| Specialty select | 12 Thai medical specialties |
| Password change | Modal with current + new + confirm |
| Role badge | Shows doctor/admin role |

---

## 3. Editable Fields

| Field | Editable | Type |
| ----- | -------- | ---- |
| Name | ✅ | Text |
| Phone | ✅ | Tel |
| Date of Birth | ✅ | Date |
| Specialty | ✅ | Select (12 options) |
| Email | ❌ (display only) | — |

---

## 4. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/auth/profile` | Get profile |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/avatar` | Upload avatar |

---

## 5. AI Agent Improvement Opportunities

- **Credential verification**: AI auto-verify medical credentials
- **Profile analytics**: AI show consultation statistics
- **Peer comparison**: AI anonymized performance benchmarks
