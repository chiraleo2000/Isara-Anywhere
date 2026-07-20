# 📜 Patient Portal — Living Will Page

**Route:** `/living-will`
**Component:** `frontend/pages/pdpa/LivingWillPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** พินัยกรรมชีวิต / Living Will


## มาตรฐานเอกสาร (รายงานภาษาไทย)

เอกสารชุดนี้จัดทำให้สอดคล้อง**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข (โครงสร้าง: วัตถุประสงค์ → ขอบเขต → ขั้นตอน → ผลลัพธ์ → ข้อควรระวัง → อ้างอิง)

| รายการ | ค่าที่ใช้ |
|--------|-----------|
| เอกสาร Word / รายงาน PDF | **TH Sarabun New** — เนื้อหา **16 pt**, หัวข้อระดับ 1 **18 pt**, หัวข้อระดับ 2 **16 pt** (ตัวหนา), ชื่อเรื่อง **22 pt**, ระยะบรรทัด **1.15**, จัดชิดซ้าย |
| สไลด์นำเสนอ PowerPoint | **FC Iconic** — หัวข้อสไลด์ **32 pt**, หัวข้อรอง **22 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |
| ตัวเลขและวันที่ | ใช้ พ.ศ. ในข้อความไทย; คั่นหลักพันแบบไทยเมื่อจำเป็น |
| อ้างอิงคู่มือ | `docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx`, `docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx`, `docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx` |
| เอกสารปฏิบัติการ Production | `docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` |
| สร้าง/อัปเดตคู่มือ | `python scripts/build-portal-user-guides.py` |
| อัปเดตหน้ากระบวนการ | `python scripts/enrich-process-pages.py --force-steps` |
| ล้างข้อมูลทดสอบ (ไม่ re-seed demo) | `npm run cleanup:cloud-test-only` |
| การทดสอบอัตโนมัติ | Playwright Groups A–Q + Vitest — `tests/PROCESS_COVERAGE_MATRIX.md` |
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-9** (Word TH Sarabun New 16 pt / PPT FC Iconic — ขั้นตอน 8–12 รายการ + คำอธิบายเชิงรายงานทุกหน้า) |
| โครงสร้างเทคนิค (สถาปัตยกรรม) | `docs/technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx`, `docs/technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx`, `docs/diagrams/diagrams.drawio` |
| สร้างเอกสารโครงสร้างเทคนิค | `python scripts/build-technical-architecture-docs.py` |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

---
## UI Controls Inventory

| # | Control | testid | Action | Expected | Screenshot |
|---|---------|--------|--------|----------|------------|
| 1 | Data Testid | `data-testid` | click | Documented control | U-data-testid |
| 2 | Confirmed | `confirmed` | click | Documented control | U-confirmed |
| 3 | Appointmentid | `appointmentId` | click | Documented control | U-appointmentId |
| 4 | Meetingid | `meetingId` | click | Documented control | U-meetingId |
| 5 | Living Will Signature | `living-will-signature` | click | Documented control | U-living-will-signature |
| 6 | Livingwillworkflow | `livingWillWorkflow` | click | Documented control | U-livingWillWorkflow |

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

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **11 Living Will** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

### ขอบเขตและบทบาท

ผู้ป่วยดำเนินการบนข้อมูลของตนเองเท่านั้น (JWT `role=patient`) — จองนัด เข้าร่วมประชุม ดู PHR/EMR ที่แพทย์เผยแพร่แล้ว
ลิงก์ Guest ต้องออกจาก **Patient Portal** เท่านั้น

### ลำดับความสัมพันธ์กับ workflow อื่น

1. **นัดหมาย** — สถานะ `confirmed` ก่อนเปิดวิดีโอ (`Processes/Appointment_Workflows.md`)
2. **ประชุม** — Izara Lobby → Jitsi → บันทึก → สรุป AI (`Processes/VIDEO_MEETING_JITSI_GEMINI.md`)
3. **บันทึกทางการแพทย์** — EMR / สั่งยา / แล็บ หลังแพทย์ตรวจสอบ AI

### การตรวจสอบคุณภาพ (QA)

| ลำดับ | รายการตรวจ | วิธี |
|------|------------|------|
| 1 | UI แจ้งเตือน | ไม่มี toast error / banner แดง |
| 2 | API | DevTools Network — status 2xx |
| 3 | ทดสอบอัตโนมัติ | Playwright + data-testid ใน tests/SELECTORS.md |
| 4 | เอกสาร | Word TH Sarabun New 16 pt / PPT FC Iconic จาก build-portal-user-guides.py |

### ผลลัพธ์ที่คาดหวังหลังใช้งานหน้านี้

- ผู้ใช้บรรลุวัตถุประสงค์ของหน้าโดยไม่ต้องขอความช่วยเหลือจากทีม IT
- ข้อมูลที่บันทึกปรากฏบนแดชบอร์ด/PHR/EMR ตามสิทธิ์
- เหตุการณ์สำคัญ (login, จองนัด, admit, จบประชุม) มี log ตรวจสอบได้ใน Cloud Logging

**เอกสารอ้างอิงหลัก:**

- `Processes/VIDEO_MEETING_JITSI_GEMINI.md` — วิดีโอ, lobby, บันทึก, AI
- `Processes/Appointment_Workflows.md` — Pool และสถานะนัด
- `docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook
- `docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` / `*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์

### องค์ประกอบ UI หลัก (data-testid)

- ดู `tests/SELECTORS.md` สำหรับหน้านี้

*(รุ่นเอกสารหน้านี้: ENRICH-9 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เปิดหนังสือแสดงเจตนา (4 ขั้นตอน)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI หลัก:** ดู `tests/SELECTORS.md` สำหรับหน้านี้
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. กรอกผู้รับมอบฉันทะและความต้องการการรักษา
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. ลงลายมือชื่อบน `living-will-signature`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. บันทึกและเลือกแชร์ให้แพทย์
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. ตรวจว่าแพทย์เห็นใน Patient Record Viewer
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง

### ผลลัพธ์ที่คาดหวัง (สรุป)

- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)
- ไม่มี HTTP 4xx/5xx บนฟังก์ชันหลักของหน้านี้
- ข้อมูลใน PostgreSQL สอดคล้อง UI (เมื่อมีนัด/ประชุม/EMR)
- `data-testid` ตรงกับ `tests/SELECTORS.md`

### ข้อควรระวัง

- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล
- อย่าแชร์ลิงก์ประชุมหรือ JWT ทางช่องทางไม่ปลอดภัย
- ผลลัพธ์ AI ไม่ใช่การวินิจฉัย — แพทย์ต้องตรวจก่อนลง EMR


---

## Automated verification

| Field | Value |
|-------|-------|
| **Status** | covered |
| **Unit tests** | `livingWillWorkflow` |
| **UI (Playwright)** | Group G |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `11_Living_Will_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

