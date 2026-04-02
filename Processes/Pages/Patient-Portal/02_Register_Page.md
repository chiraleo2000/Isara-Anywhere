# 📝 Patient Portal — Register Page

**Route:** `/register`
**Component:** `src/pages/auth/RegisterPage.tsx`
**Access:** Public (unauthenticated users only)
**Thai Title:** สมัครสมาชิก

---


## 1. Purpose

New patient registration with a 2-step wizard: basic information and health information. Provides immediate access upon registration.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│           🏥 สมัครสมาชิก Izara Patient Portal                       │
│                                                                     │
│  ┌─ Step Indicator ──────────────────────────────────────────┐     │
│  │  [1. ข้อมูลพื้นฐาน] ──── [2. ข้อมูลสุขภาพ]              │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌─ Form Content ────────────────────────────────────────────┐     │
│  │                                                           │     │
│  │  (Step 1 or Step 2 fields displayed here)                 │     │
│  │                                                           │     │
│  │  [ย้อนกลับ]                              [ถัดไป / สมัคร]  │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  มีบัญชีแล้ว? เข้าสู่ระบบ                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Step 1: Basic Information (ข้อมูลพื้นฐาน)

| Field | Type | Required | Validation |
| ----- | ---- | -------- | ---------- |
| ชื่อ-นามสกุล (Full Name) | Text | ✅ | Non-empty |
| อีเมล (Email) | Email | ✅ | Valid email format |
| เบอร์โทรศัพท์ (Phone) | Tel | ✅ | Phone format |
| วันเกิด (Date of Birth) | Date | ✅ | Valid date |
| เพศ (Gender) | Select | ✅ | male / female / other |
| รหัสผ่าน (Password) | Password | ✅ | Min 6 characters |
| ยืนยันรหัสผ่าน (Confirm) | Password | ✅ | Must match password |


---


## 4. Step 2: Health Information (ข้อมูลสุขภาพ)

| Field | Type | Required | Options |
| ----- | ---- | -------- | ------- |
| ส่วนสูง (Height cm) | Number | ❌ | — |
| น้ำหนัก (Weight kg) | Number | ❌ | — |
| กรุ๊ปเลือด (Blood Type) | Select | ❌ | A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown |
| ประวัติแพ้ยา (Allergies) | Text | ❌ | Free text |
| โรคประจำตัว (Chronic Conditions) | Text | ❌ | Free text |
| ยาที่ใช้ปัจจุบัน (Current Medications) | Text | ❌ | Free text |
| **ผู้ติดต่อฉุกเฉิน (Emergency Contact)** | | | |
| ↳ ชื่อ (Contact Name) | Text | ❌ | — |
| ↳ เบอร์โทร (Contact Phone) | Tel | ❌ | — |
| ↳ ความสัมพันธ์ (Relationship) | Text | ❌ | — |


---


## 5. Workflow


### Registration Flow

```text
Step 1: Patient clicks "สมัครสมาชิก" from login page
Step 2: Fills basic info (name, email, phone, DOB, gender, password)
Step 3: Clicks "ถัดไป" (Next) → validates Step 1 fields
Step 4: Fills optional health info (height, weight, blood type, allergies, etc.)
Step 5: Fills optional emergency contact
Step 6: Clicks "สมัครสมาชิก" (Register)
Step 7: AuthContext.register() → POST /api/auth/register
Step 8: Success → Auto-login → Redirect to Dashboard (/)
Step 9: Failure → Error message (e.g., "Email already registered")
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/register` | Create new patient account |



### Request Payload

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "gender": "male|female|other",
  "password": "string",
  "height": "number?",
  "weight": "number?",
  "bloodType": "string?",
  "allergies": "string?",
  "chronicConditions": "string?",
  "currentMedications": "string?",
  "emergencyContact": {
    "name": "string?",
    "phone": "string?",
    "relationship": "string?"
  }
}
```

---


## 7. Validation Rules

| Rule | Details |
| ---- | ------- |
| All Step 1 fields required | Cannot proceed without completing |
| Password min 6 chars | Enforced before next step |
| Password match | Confirm must equal password |
| Email format | Standard email validation |
| Step 2 optional | Can skip health info entirely |


---


## 8. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Successful registration | → Dashboard (`/`) |
| "Already have account" link | → Login Page (`/login`) |


---


## 9. AI Agent Improvement Opportunities


- **Smart health profile**: AI pre-fill chronic conditions from description

- **Medication auto-complete**: Drug database lookup during registration

- **Health risk assessment**: AI initial risk screening from health data

- **Document OCR**: Upload existing health card for auto-extraction

---


## PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | INSERT | Create new user account (role='patient', immediate approval) |
| patient_profiles | INSERT | Create patient profile with health information |



### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/auth/register | POST | INSERT users (role='patient', status='approved'); INSERT patient_profiles |



### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

