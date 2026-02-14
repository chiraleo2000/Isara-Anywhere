# 🔒 Patient Portal — PDPA Page (Privacy & Consent Management)

**Route:** `/pdpa`  
**Component:** `src/pages/pdpa/PDPAPage.tsx`  
**Access:** 🔒 Authenticated patients  
**Thai Title:** การจัดการความเป็นส่วนตัว / Privacy & Consent Management

---

## 1. Purpose

PDPA (Personal Data Protection Act) compliance management — patients control their data sharing consent, manage doctor access permissions, and review data access audit logs.

---

## 2. Page Layout (3 Tabs)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔒 การจัดการความเป็นส่วนตัว (Privacy & Consent Management)          │
│                                                                     │
│  Tabs: [ตั้งค่าความเป็นส่วนตัว] [การเข้าถึงของแพทย์] [ประวัติการเข้าถึง] │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              (Tab Content Area)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tab Details

### Tab 1: ตั้งค่าความเป็นส่วนตัว (Privacy Settings)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🛡️ Consent Toggles:                                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ✅ Essential Data (จำเป็น)                    [🔒 Required] │   │
│  │  การเก็บข้อมูลที่จำเป็นสำหรับการรักษาพยาบาล                    │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ☐ Health Data Sharing (ข้อมูลสุขภาพ)          [  Toggle  ] │   │
│  │  อนุญาตให้แชร์ข้อมูลสุขภาพกับแพทย์ที่ได้รับอนุญาต               │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ☐ Data Sharing (แชร์ข้อมูล)                   [  Toggle  ] │   │
│  │  อนุญาตให้แชร์ข้อมูลกับบุคลากรทางการแพทย์                      │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ☐ Analytics (วิเคราะห์)                       [  Toggle  ] │   │
│  │  ข้อมูลนิรนามเพื่อปรับปรุงบริการ                                │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ☐ Marketing (การตลาด)                         [  Toggle  ] │   │
│  │  รับข่าวสารด้านสุขภาพ                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📋 Data Sharing Terms & Conditions (5 clauses):                    │
│  1. ข้อมูลจะใช้เพื่อการรักษาพยาบาลเท่านั้น                           │
│  2. แพทย์ที่ได้รับอนุญาตเท่านั้นที่สามารถเข้าถึง                       │
│  3. คุณสามารถเพิกถอนความยินยอมได้ตลอดเวลา                         │
│  4. ข้อมูลจะถูกเก็บรักษาอย่างปลอดภัย                                │
│  5. มีบันทึกการเข้าถึงข้อมูลทุกครั้ง                                  │
│                                                                     │
│  Status: 🟢 Enabled / 🔴 Not yet consented                         │
│  🔒 Security: ข้อมูลเข้ารหัสและปฏิบัติตาม PDPA                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab 2: การเข้าถึงของแพทย์ (Doctor Access)

- Rendered via consent system and doctor search
- Shows which doctors have access to patient's data
- Manage individual doctor permissions

### Tab 3: ประวัติการเข้าถึง (Access History / Audit Log)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 ประวัติการเข้าถึงข้อมูล (Data Access History)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ✅ CONSENT_GRANTED           21 ม.ค. 2569 09:00           │   │
│  │  ให้ความยินยอมแชร์ข้อมูลสุขภาพ                                 │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  📄 DATA_ACCESSED             20 ม.ค. 2569 14:30           │   │
│  │  นพ. ทดสอบ ระบบ เข้าดูข้อมูล PHR                              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  📝 LIVING_WILL_CREATED       19 ม.ค. 2569 10:00           │   │
│  │  สร้างพินัยกรรมชีวิต                                          │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🔄 LIVING_WILL_UPDATED       18 ม.ค. 2569 15:00           │   │
│  │  อัปเดตพินัยกรรมชีวิต                                         │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  ❌ CONSENT_REVOKED           17 ม.ค. 2569 11:00           │   │
│  │  เพิกถอนความยินยอมการตลาด                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Audit Event Types

| Event | Icon | Description |
| ----- | ---- | ----------- |
| CONSENT_GRANTED | ✅ | Patient granted data sharing consent |
| CONSENT_REVOKED | ❌ | Patient revoked consent |
| LIVING_WILL_CREATED | 📝 | Living will created |
| LIVING_WILL_UPDATED | 🔄 | Living will updated |
| DATA_ACCESSED | 📄 | Doctor accessed patient data |

---

## 4. Workflows

### Workflow 1: Manage Consent Settings

```text
Step 1: Navigate to /pdpa → Privacy Settings tab
Step 2: View current consent status for each category
Step 3: Toggle consent switches as desired
Step 4: POST /api/pdpa/consent with updated preferences
Step 5: Audit log entry created for each change
Step 6: Doctors' access updated immediately
```

### Workflow 2: Review Access History

```text
Step 1: Navigate to /pdpa → Access History tab
Step 2: GET /api/pdpa/audit-log
Step 3: View chronological list of all data access events
Step 4: Each entry shows: event type, who accessed, when, what data
```

### Workflow 3: Revoke All Consent

```text
Step 1: Turn off all optional consent toggles
Step 2: Confirmation dialog appears
Step 3: Confirm → POST /api/pdpa/consent (all false)
Step 4: All doctor access immediately revoked
Step 5: Audit log records CONSENT_REVOKED events
Step 6: Essential data consent remains (cannot be revoked)
```

---

## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/pdpa/consent` | Get current consent settings |
| POST | `/api/pdpa/consent` | Update consent settings |
| GET | `/api/pdpa/audit-log` | Get access history |
| GET | `/api/pdpa/doctors` | Get doctors with access |
| POST | `/api/pdpa/doctors/:id/revoke` | Revoke specific doctor access |
| GET | `/api/pdpa/status` | Get overall PDPA status |
| POST | `/api/pdpa/accept` | Accept PDPA terms |

---

## 6. Consent Categories

| Category | Required | Description |
| -------- | -------- | ----------- |
| essential | ✅ Yes | Core medical data for treatment |
| health_data | ❌ No | Share health records with doctors |
| data_sharing | ❌ No | Share with healthcare professionals |
| analytics | ❌ No | Anonymous data for service improvement |
| marketing | ❌ No | Health news and updates |

---

## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Living Will link | → Living Will Page (`/living-will`) |
| Doctor access management | ↔ Doctor portal patient records |
| Consent affects | → PHR visibility to doctors |
| Consent affects | → EMR access by doctors |
| Audit log | ← Records from all doctor access events |

---

## 8. AI Agent Improvement Opportunities

- **Consent recommendations**: AI explain impact of each consent choice
- **Privacy dashboard**: AI-generated privacy health score
- **Anomaly detection**: AI flag unusual data access patterns
- **Auto-notifications**: AI alert when new doctor accesses data
- **Consent expiry**: AI manage time-limited consent periods
- **PDPA compliance report**: AI generate downloadable compliance report
