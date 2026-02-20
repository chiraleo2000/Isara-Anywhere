# 🔒 Mobile PDPA Privacy & Compliance

**Version:** 1.0  
**Module:** Phase 2 — Mobile App  
**Status:** 📋 Planning  
**Law:** พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA Thailand)  
**Related:** [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md), [11_Mobile_App_Description.md](11_Mobile_App_Description.md)

---

## 1. Overview

The Izara Dr. Anywhere mobile app handles **Protected Health Information (PHI)** and **Personal Data** under the Thai Personal Data Protection Act (PDPA). This document defines how the mobile app collects, stores, processes, and shares personal data with full compliance.

### 1.1 Data Categories

| Category | Thai | Examples | Sensitivity |
| ---------- | ------ | ---------- | ------------ |
| Personal Identity | ข้อมูลส่วนบุคคล | Name, email, phone, national ID, DOB | Standard |
| Health Data | ข้อมูลสุขภาพ | PHR, vitals, medications, allergies, EMR | **Sensitive** |
| Biometric Data | ข้อมูลชีวมิติ | Face ID hash, fingerprint template | **Sensitive** |
| Location Data | ข้อมูลตำแหน่ง | GPS for nearby healthcare map | Standard |
| Financial Data | ข้อมูลทางการเงิน | Payment cards, transaction history | Standard |
| Usage Data | ข้อมูลการใช้งาน | App analytics, screen views, crash logs | Standard |
| Communication Data | ข้อมูลการสื่อสาร | Chat messages with AI, meeting transcripts | **Sensitive** |

### 1.2 PDPA Roles

| PDPA Role | Izara Entity | Responsibility |
| ----------- | ------------- | ---------------- |
| **Data Controller** (ผู้ควบคุมข้อมูล) | Izara Co., Ltd. | Determines purposes and means of processing |
| **Data Processor** (ผู้ประมวลผลข้อมูล) | Backend servers, Google Cloud, Stripe | Processes data on behalf of controller |
| **Data Subject** (เจ้าของข้อมูล) | Patient / Doctor users | The person whose data is collected |

---

## 2. Consent Collection Flow

### 2.1 Patient First-Time Consent

```text
Registration Flow:
│
├── Step 1: Account Creation (email, password)
│
├── Step 2: Profile Details (name, DOB, phone)
│
└── Step 3: PDPA Consent Screen (MANDATORY before first use)
    │
    ┌─────────────────────────────────────────────────┐
    │  🔒 นโยบายความเป็นส่วนตัว                        │
    │     Privacy & Data Protection                    │
    │                                                  │
    │  Izara เก็บรวบรวม ใช้ และเปิดเผยข้อมูลของคุณ     │
    │  ตามพ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562     │
    │                                                  │
    │  ── ความยินยอมที่จำเป็น (Required) ──────────── │
    │                                                  │
    │  ☑ ยินยอมให้เก็บข้อมูลส่วนบุคคลเพื่อให้บริการ    │
    │    Consent to collect personal data for service  │
    │    ℹ️ [อ่านรายละเอียด / Read more]               │
    │                                                  │
    │  ☑ ยินยอมให้เก็บข้อมูลสุขภาพ (ข้อมูลอ่อนไหว)    │
    │    Consent to collect health data (sensitive)     │
    │    ℹ️ [อ่านรายละเอียด / Read more]               │
    │                                                  │
    │  ── ความยินยอมเพิ่มเติม (Optional) ──────────── │
    │                                                  │
    │  ☐ ยินยอมให้แพทย์ผู้รักษาเข้าถึงข้อมูลสุขภาพ    │
    │    Allow treating doctors to access health data  │
    │                                                  │
    │  ☐ ยินยอมให้ใช้ข้อมูลเพื่อวิเคราะห์ AI           │
    │    Allow AI to analyze health data               │
    │                                                  │
    │  ☐ ยินยอมรับข้อมูลข่าวสารทางการแพทย์             │
    │    Receive medical content & updates             │
    │                                                  │
    │  ─────────────────────────────────────────────── │
    │                                                  │
    │  📄 [อ่านนโยบายฉบับเต็ม / Full Privacy Policy]   │
    │                                                  │
    │  [ยอมรับและดำเนินการต่อ / Accept & Continue]      │
    │                                                  │
    │  ※ คุณสามารถเปลี่ยนแปลงความยินยอมได้ทุกเมื่อ     │
    │    ในหน้า Settings > Privacy                     │
    └─────────────────────────────────────────────────┘
```

### 2.2 Consent Storage

```text
Backend:
  POST /api/pdpa/consent
  {
    "user_id": "uuid",
    "consents": [
      { "type": "personal_data_collection", "granted": true, "required": true },
      { "type": "health_data_collection", "granted": true, "required": true },
      { "type": "doctor_access", "granted": false, "required": false },
      { "type": "ai_analysis", "granted": true, "required": false },
      { "type": "marketing", "granted": false, "required": false }
    ],
    "consent_version": "2.0",
    "device_info": { "platform": "ios", "app_version": "2.1.0" },
    "ip_address": "auto-captured",
    "timestamp": "auto-captured"
  }

Mobile (MMKV cache):
  pdpa_consent_version = "2.0"
  pdpa_consent_date = "2026-02-15T10:30:00Z"
  pdpa_consents = { personal_data: true, health_data: true, doctor_access: false, ... }
```

---

## 3. Privacy Management Screen (Patient)

### 3.1 Navigation

`Profile > Privacy (Settings > ความเป็นส่วนตัว)`

### 3.2 Screen Layout

```text
┌──────────────────────────────────────────┐
│  🔒 ความเป็นส่วนตัว                       │
│     Privacy & Data Protection            │
│                                          │
│  ── Tab 1: ความยินยอม / Consent ──────── │
│                                          │
│  ☑ เก็บข้อมูลส่วนบุคคล (จำเป็น)           │
│    Personal data collection (Required)   │
│    Granted: 15 Feb 2026                  │
│                                          │
│  ☑ เก็บข้อมูลสุขภาพ (จำเป็น)              │
│    Health data collection (Required)     │
│    Granted: 15 Feb 2026                  │
│                                          │
│  🔘 แพทย์เข้าถึงข้อมูลสุขภาพ              │
│    Doctor access to health records       │
│    [ON]  ← Toggle                        │
│                                          │
│  🔘 AI วิเคราะห์ข้อมูลสุขภาพ              │
│    AI health data analysis               │
│    [ON]  ← Toggle                        │
│                                          │
│  🔘 รับข้อมูลข่าวสาร                      │
│    Marketing communications              │
│    [OFF] ← Toggle                        │
│                                          │
│  ── Tab 2: การเข้าถึงของแพทย์ ─────────── │
│                                          │
│  Doctors with access to your records:    │
│                                          │
│  ✅ นพ.สมชาย แพทย์ดี                     │
│     Granted: 10 Feb 2026   [Revoke]      │
│     Access: PHR, Vitals, Medications     │
│                                          │
│  ✅ พญ.สมศรี รักษาดี                     │
│     Granted: 5 Jan 2026    [Revoke]      │
│     Access: PHR, EMR, Allergies          │
│                                          │
│  ❌ นพ.สมบัติ สุขใจ (Revoked)            │
│     Revoked: 1 Feb 2026                  │
│                                          │
│  ── Tab 3: บันทึกการเข้าถึง ──────────── │
│                                          │
│  Audit log of data access:              │
│                                          │
│  📋 15 Feb 2026, 14:30                   │
│     นพ.สมชาย viewed your Vitals          │
│     During appointment #APT-2026-0234    │
│                                          │
│  📋 15 Feb 2026, 14:15                   │
│     AI analyzed your Medications          │
│     For symptom analysis request         │
│                                          │
│  📋 10 Feb 2026, 10:00                   │
│     นพ.สมชาย viewed your PHR             │
│     During appointment #APT-2026-0198    │
│                                          │
│  [Load More / โหลดเพิ่ม]                 │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  🔽 Data Actions:                        │
│  [📥 ดาวน์โหลดข้อมูล / Export My Data]   │
│  [🗑️ ลบบัญชีและข้อมูล / Delete Account]  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 4. Data Subject Rights

PDPA provides 8 rights to data subjects. Here's how each is implemented in the mobile app:

| # | Right (Thai) | Right (English) | Mobile Implementation |
| --- | ------------- | ----------------- | ---------------------- |
| 1 | สิทธิในการเข้าถึง | Right of Access | View profile, health records, audit logs anytime |
| 2 | สิทธิในการแก้ไข | Right to Rectification | Edit profile, health records. Request doctor to fix EMR. |
| 3 | สิทธิในการลบ | Right to Erasure | Settings > Delete Account. Removes all data within 30 days. |
| 4 | สิทธิในการจำกัด | Right to Restriction | Toggle consent per category. Stop specific processing. |
| 5 | สิทธิในการโอนย้าย | Right to Portability | Export data as PDF or JSON from Settings. |
| 6 | สิทธิในการคัดค้าน | Right to Object | Opt out of AI analysis, marketing. Revoke doctor access. |
| 7 | สิทธิในการถอนความยินยอม | Right to Withdraw Consent | Toggle consents OFF in Privacy settings anytime. |
| 8 | สิทธิในการร้องเรียน | Right to Lodge Complaint | In-app: Settings > Privacy > File Complaint. Links to PDPC office. |

### 4.1 Data Export (Portability)

```text
User: Settings > Privacy > Export My Data
│
├── Format Selection:
│   ○ PDF (readable document)
│   ○ JSON (machine-readable)
│
├── Data Scope:
│   ☑ Profile Information
│   ☑ Health Records (PHR)
│   ☑ Appointment History
│   ☑ AI Chat History
│   ☑ Payment History
│   ☑ Consent History
│
├── [Request Export / ขอดาวน์โหลด]
│
├── Backend: POST /api/pdpa/export-request
│   → Generates file asynchronously
│   → Sends push notification when ready
│   → Download link valid for 48 hours
│
└── Notification: "ข้อมูลของคุณพร้อมดาวน์โหลดแล้ว"
    → Tap to download encrypted ZIP file
```

### 4.2 Account Deletion (Erasure)

```text
User: Settings > Privacy > Delete Account
│
├── Warning Screen:
│   "การลบบัญชีจะไม่สามารถกู้คืนได้"
│   "Account deletion is permanent and irreversible"
│   
│   Data to be deleted:
│   • Profile and personal information
│   • Health records and vital signs
│   • Appointment and payment history
│   • AI conversation history
│   • All API connections and tokens
│
├── Confirmation: Enter password + type "DELETE"
│
├── Backend: DELETE /api/users/me
│   → Mark account as "pending_deletion"
│   → 30-day grace period (can cancel)
│   → After 30 days: hard delete all data
│   → Anonymize audit logs (keep for legal compliance)
│
├── Mobile: 
│   → Clear ALL SecureStore tokens
│   → Clear ALL SQLite data
│   → Clear MMKV cache
│   → Navigate to Role Selection screen
│
└── Email: Confirmation of deletion request sent
```

---

## 5. Doctor-Side PDPA (Accessing Patient Data)

### 5.1 Consent Verification

Before a doctor can view any patient data on the mobile app:

```text
Doctor taps "View Patient PHR" or "View Patient Record"
│
├── Backend: GET /api/patients/:id/pdpa-status
│   {
│     "consented": true,
│     "consent_types": ["personal_data", "health_data", "doctor_access"],
│     "granted_to_this_doctor": true,
│     "consent_date": "2026-02-10T10:00:00Z"
│   }
│
├── If consented = true AND granted_to_this_doctor = true:
│   → Show patient data normally
│   → Log access in audit trail
│
├── If consented = true BUT granted_to_this_doctor = false:
│   → Show "Patient has not granted you access"
│   → Option: "Request Access" (sends notification to patient)
│
└── If consented = false:
    → Show "Patient has not consented to data sharing"
    → Cannot view any health data
    → Can still confirm/decline appointment (basic info only)
```

### 5.2 Access Request Flow

```text
Doctor: "Request Access to Patient Data"
│
├── POST /api/pdpa/access-request
│   { doctor_id, patient_id, requested_categories: ["phr", "vitals", "medications"] }
│
├── Patient receives Push Notification:
│   "นพ.สมชาย ขออนุญาตเข้าถึงข้อมูลสุขภาพของคุณ"
│   "Dr. Somchai requests access to your health data"
│   [Allow / อนุญาต]  [Deny / ปฏิเสธ]
│
├── On Allow:
│   → POST /api/pdpa/access-grant
│   → Doctor can now view patient data
│   → Audit log entry created
│   → Doctor notified: "Access granted by patient"
│
└── On Deny:
    → POST /api/pdpa/access-deny
    → Doctor notified: "Patient declined your request"
    → No data access
```

---

## 6. Data Handling on Device

### 6.1 What Data Stays on Device

| Data | Where | Encrypted | Clear on Logout |
| ------ | ------- | ----------- | ---------------- |
| JWT Tokens | SecureStore | ✅ Hardware-backed | ✅ Yes |
| User Profile (cached) | MMKV | ✅ MMKV encryption | ✅ Yes |
| PHR Data (cached) | SQLite | ✅ SQLCipher | ✅ Yes |
| Offline Queue | SQLite | ✅ SQLCipher | ❌ Sync first |
| Push Token (FCM/APNS) | SecureStore | ✅ | ✅ Unregister |
| Biometric Key | Secure Enclave | ✅ Hardware-bound | ✅ Remove |
| External API Keys | SecureStore | ✅ Double-encrypted | ✅ Yes |
| Wearable Data | SQLite (temp) | ✅ SQLCipher | ✅ Yes |
| Meeting Recording | Never on device | N/A | N/A |
| AI Chat History | Backend only | N/A | N/A |

### 6.2 On Logout

```text
Logout Action (Patient or Doctor):
│
├── Sync pending offline data (if connected)
├── POST /api/auth/logout (invalidate server tokens)
├── Unregister device push token (per role)
│
├── Clear SecureStore keys for this role:
│   ├── {role}_access_token → DELETE
│   ├── {role}_refresh_token → DELETE
│   ├── {role}_profile → DELETE
│   └── biometric_{role}_key → DELETE
│
├── Clear SQLite data for this role:
│   ├── cached PHR data → DELETE
│   ├── cached appointments → DELETE
│   └── cached notifications → DELETE
│
├── Clear MMKV for this role:
│   ├── cached counts, timestamps → DELETE
│   └── active_role → null (if logging out of current role)
│
├── Keep (NOT deleted):
│   ├── Other role's tokens (if both logged in)
│   ├── App settings (theme, language)
│   ├── PDPA consent version (to know if re-consent needed)
│   └── Device ID
│
└── Navigate to Role Selection (if both roles logged out)
    or other role's home (if still logged in)
```

---

## 7. Consent Version Management

When the privacy policy changes, users must re-consent:

```text
App Launch → Check consent version
│
├── Backend: GET /api/pdpa/current-version
│   { "version": "2.1", "updated_at": "2026-03-01" }
│
├── Local: MMKV pdpa_consent_version = "2.0"
│
├── If versions differ (2.0 ≠ 2.1):
│   → Navigate to PDPA re-consent screen
│   → Show diff: "What changed in Privacy Policy v2.1"
│   → User must accept to continue using app
│   → New consent recorded with version "2.1"
│
└── If versions match:
    → Continue to home screen
```

---

## 8. API Endpoints for PDPA

| Method | Endpoint | Description |
| -------- | ---------- | ------------- |
| `GET` | `/api/pdpa/current-version` | Get current privacy policy version |
| `POST` | `/api/pdpa/consent` | Submit consent (registration) |
| `PUT` | `/api/pdpa/consent` | Update consents (toggle categories) |
| `GET` | `/api/pdpa/consent` | Get user's current consents |
| `GET` | `/api/pdpa/audit-log` | Get data access audit log |
| `POST` | `/api/pdpa/access-request` | Doctor requests patient data access |
| `POST` | `/api/pdpa/access-grant` | Patient grants doctor access |
| `POST` | `/api/pdpa/access-deny` | Patient denies doctor access |
| `DELETE` | `/api/pdpa/access/:doctorId` | Patient revokes doctor access |
| `GET` | `/api/pdpa/access-list` | Patient: list all doctor access |
| `POST` | `/api/pdpa/export-request` | Request data export |
| `GET` | `/api/pdpa/export/:id/download` | Download exported data |
| `DELETE` | `/api/users/me` | Delete account (30-day grace) |
| `POST` | `/api/users/me/cancel-deletion` | Cancel pending deletion |

---

## 9. Related Documents

| Document | Relationship |
| ---------- | ------------- |
| [03_Mobile_Authentication_Security.md](03_Mobile_Authentication_Security.md) | Security controls for data protection |
| [12_Multi_API_Token_Management.md](12_Multi_API_Token_Management.md) | External service data sharing |
| Web PDPA Implementation: [Living_Will_Processes.md](../Living_Will_Processes.md) | Existing web PDPA workflows |

---

### End of Mobile PDPA Privacy & Compliance — February 2026
