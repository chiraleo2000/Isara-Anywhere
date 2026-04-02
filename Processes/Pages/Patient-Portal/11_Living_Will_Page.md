# 📜 Patient Portal — Living Will Page

**Route:** `/living-will`
**Component:** `src/pages/pdpa/LivingWillPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** พินัยกรรมชีวิต / Living Will

---

## 1. Purpose

Create, manage, and share a legally-compliant Living Will (พินัยกรรมชีวิต) specifying medical treatment preferences when the patient cannot communicate. Includes digital signature, healthcare proxy designation, and PDPA-compliant doctor sharing.

---

## 2. Page Layout (4-Step Wizard)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📜 พินัยกรรมชีวิต (Living Will)                                     │
│                                                                     │
│  Progress:                                                          │
│  [1.ตัวแทน ✓] ─── [2.ความต้องการ] ─── [3.ลายเซ็น] ─── [4.แชร์]    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              (Current Step Content)                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [← ย้อนกลับ]                                    [ถัดไป →]         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step Details

### Step 1: Healthcare Proxy (ตัวแทนดูแลสุขภาพ)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👤 ตัวแทนดูแลสุขภาพหลัก (Primary Healthcare Proxy)                  │
│                                                                     │
│  ชื่อ-นามสกุล*: [________________]                                   │
│  ความสัมพันธ์*: [________________]                                   │
│  เบอร์โทร*:    [________________]                                   │
│  อีเมล:        [________________]                                   │
│  ที่อยู่:        [________________]                                   │
│                                                                     │
│  [+ เพิ่มตัวแทนสำรอง (Add Alternate Proxy)]                          │
│                                                                     │
│  👤 ตัวแทนสำรอง (optional):                                          │
│  ชื่อ: [____]  ความสัมพันธ์: [____]  เบอร์: [____]  [❌ ลบ]         │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: Treatment Preferences (ความต้องการการรักษา)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💊 ความต้องการการรักษา (Treatment Preferences)                       │
│                                                                     │
│  การกู้ชีพ (CPR):                                                    │
│  [✅ ต้องการ]  [❌ ไม่ต้องการ]                                        │
│                                                                     │
│  เครื่องช่วยหายใจ (Mechanical Ventilation):                           │
│  [✅ ต้องการ]  [❌ ไม่ต้องการ]                                        │
│                                                                     │
│  การให้อาหารเทียม (Artificial Nutrition):                             │
│  [✅ ต้องการ]  [❌ ไม่ต้องการ]                                        │
│                                                                     │
│  การฟอกไต (Dialysis):                                               │
│  [✅ ต้องการ]  [❌ ไม่ต้องการ]                                        │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  การบริจาคอวัยวะ (Organ Donation):                                   │
│  [  Toggle Switch  ] ☐ ยินยอม / ☐ ไม่ยินยอม                       │
│                                                                     │
│  การจัดการความเจ็บปวด (Pain Management):                             │
│  [○ สบาย (Comfort)] [○ น้อยที่สุด (Minimal)] [● สมดุล (Balanced)]   │
│                                                                     │
│  ความต้องการทางศาสนา (Religious Preferences):                        │
│  [textarea: .......................................]                 │
│                                                                     │
│  ความต้องการเพิ่มเติม (Additional Wishes):                            │
│  [textarea: .......................................]                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Digital Signature (ลายเซ็นดิจิทัล)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ✍️ ลายเซ็นดิจิทัล (Digital Signature)                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                                                         │       │
│  │          (Canvas for signature drawing)                  │       │
│  │          Mouse + Touch support                           │       │
│  │                                                         │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  [🗑️ ล้างลายเซ็น (Clear)]                                           │
│                                                                     │
│  ⚖️ Legal Notice:                                                   │
│  พินัยกรรมชีวิตนี้มีผลบังคับใช้ตาม                                     │
│  พ.ร.บ. ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์                               │
│  (Thai Electronic Transactions Act)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 4: Share with Doctors (แชร์กับแพทย์)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👨‍⚕️ แชร์กับแพทย์ (Share with Doctors)                               │
│                                                                     │
│  [+ เพิ่มแพทย์ (Add Doctor)] → Opens Doctor Search Modal            │
│                                                                     │
│  Shared Doctors:                                                    │
│  ├── นพ. ทดสอบ ระบบ (อายุรกรรม)                    [❌ ลบ]          │
│  └── นพ. สมชาย แพทย์ (เวชศาสตร์ทั่วไป)              [❌ ลบ]          │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                    │
│                                                                     │
│  📋 Summary Review:                                                 │
│  ├── ตัวแทน: คุณสมหญิง (แม่)                                        │
│  ├── CPR: ✅ ต้องการ                                                 │
│  ├── เครื่องช่วยหายใจ: ❌ ไม่ต้องการ                                   │
│  ├── บริจาคอวัยวะ: ✅ ยินยอม                                         │
│  ├── ลายเซ็น: ✅ ลงนามแล้ว                                           │
│  └── แพทย์ที่แชร์: 2 ท่าน                                            │
│                                                                     │
│  [     💾 บันทึกพินัยกรรมชีวิต     ]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Modals

### Doctor Selection Modal

```text
┌── Select Doctor ────────────────────────┐
│  🔍 [Search doctor name...       ]     │
│                                         │
│  ├── นพ. ทดสอบ ระบบ      [+ เพิ่ม]     │
│  ├── นพ. สมชาย แพทย์     [+ เพิ่ม]     │
│  └── นพ. สมศรี รักษา     [+ เพิ่ม]     │
│                                         │
│  [ปิด]                                  │
└─────────────────────────────────────────┘
```

### Version History Modal

```text
┌── Version History ──────────────────────┐
│  📋 ประวัติเวอร์ชัน                      │
│                                         │
│  v3 - 21 ม.ค. 2569            [ดู] [↩️] │
│  v2 - 15 ม.ค. 2569            [ดู] [↩️] │
│  v1 - 10 ม.ค. 2569            [ดู]      │
│                                         │
│  [ปิด]                                  │
└─────────────────────────────────────────┘
```

---

## 5. Workflows

### Workflow 1: Create Living Will

```text
Step 1:  Navigate to /living-will
Step 2:  System checks for existing Living Will → GET /api/phr/{userId}/living-will
Step 3:  If none exists → Shows 4-step wizard
Step 4:  Step 1: Enter primary healthcare proxy (name*, relationship*, phone*)
Step 5:  (Optional) Add alternate proxy
Step 6:  Click "Next" → Step 2
Step 7:  Set treatment preferences (CPR, ventilation, nutrition, dialysis)
Step 8:  Set organ donation preference
Step 9:  Select pain management level
Step 10: Add religious preferences / additional wishes
Step 11: Click "Next" → Step 3
Step 12: Draw digital signature on canvas
Step 13: Click "Next" → Step 4
Step 14: Add doctors to share with (search + add)
Step 15: Review summary of all selections
Step 16: Click "บันทึก" → POST /api/phr/{userId}/living-will
Step 17: Living Will saved → Audit log entry created
Step 18: Shared doctors can now view in PatientRecordViewer
```

### Workflow 2: Edit Existing Living Will

```text
Step 1: Navigate to /living-will
Step 2: Existing Living Will loaded
Step 3: Click "Edit" → Wizard opens with pre-filled data
Step 4: Modify any step
Step 5: Save → Creates new version (old version preserved)
Step 6: Audit log: LIVING_WILL_UPDATED
```

### Workflow 3: View Version History

```text
Step 1: Click "Version History" button
Step 2: Modal shows all versions with dates
Step 3: Click "View" to preview a version
Step 4: Click "Rollback" to revert to a previous version
Step 5: Rollback creates new version (non-destructive)
```

---

## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/phr/{userId}/living-will` | Get current Living Will |
| POST | `/api/phr/{userId}/living-will` | Create Living Will |
| PUT | `/api/phr/{userId}/living-will` | Update Living Will |
| GET | `/api/phr/{userId}/living-will/versions` | Get version history |
| POST | `/api/phr/{userId}/living-will/rollback` | Rollback to version |
| GET | `/api/doctors` | Search doctors for sharing |

---

## 7. Doctor Portal Visibility

When shared, the Living Will appears in the PatientRecordViewer's PHR tab showing:

| Field | Display |
| ----- | ------- |
| Treatment preferences | CPR, Ventilation, Nutrition, Dialysis with ✅/❌ badges |
| Organ donation | ✅/❌ status |
| Pain management | Level display |
| Personal statement | Full text |
| Representative | Name + relationship |
| Signature status | Signed / Not signed |

---

## 8. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| PDPA page link | ← Accessible from PDPA page |
| Doctor PatientRecordViewer | → Living Will card shown in PHR tab |
| Audit log | → Entries in PDPA access history |

---

## 9. AI Agent Improvement Opportunities

- **Guided creation**: AI walk patient through choices with explanations

- **Legal compliance check**: AI verify document completeness

- **Translation**: AI translate Living Will for multilingual families

- **Reminder**: AI prompt periodic review of Living Will

- **Template suggestions**: AI suggest common treatment preference combinations

- **Family notification**: AI automated notification when Living Will is updated

---

## PostgreSQL Database Integration

### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| living_wills | CRUD | Living Will document management |
| living_will_versions | INSERT / SELECT | Version history for Living Will changes |
| patient_consents | SELECT / UPDATE | Consent records linked to Living Will sharing |

### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/phr/:id/living-will | GET | SELECT living_wills, living_will_versions |
| /api/phr/:id/living-will | POST | INSERT living_wills, INSERT living_will_versions |
| /api/phr/:id/living-will | PUT | UPDATE living_wills, INSERT living_will_versions |
| /api/phr/:id/living-will/share | PUT | UPDATE living_wills (share settings), UPDATE patient_consents |

### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
