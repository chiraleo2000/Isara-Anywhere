# 🔒 Patient Portal — PDPA Page (Privacy & Consent Management)

**Route:** `/pdpa`
**Component:** `src/pages/pdpa/PDPAPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** การจัดการความเป็นส่วนตัว / Privacy & Consent Management


## มาตรฐานเอกสาร (รายงานภาษาไทย)

เอกสารชุดนี้จัดทำให้สอดคล้อง**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข (โครงสร้าง: วัตถุประสงค์ → ขอบเขต → ขั้นตอน → ผลลัพธ์ → ข้อควรระวัง → อ้างอิง)

| รายการ | ค่าที่ใช้ |
|--------|-----------|
| เอกสาร Word / รายงาน PDF | **TH Sarabun New** — เนื้อหา **16 pt**, หัวข้อระดับ 1 **18 pt**, หัวข้อระดับ 2 **16 pt** (ตัวหนา), ชื่อเรื่อง **22 pt**, ระยะบรรทัด **1.15**, จัดชิดซ้าย |
| สไลด์นำเสนอ PowerPoint | **FC Iconic** — หัวข้อสไลด์ **32 pt**, หัวข้อรอง **22 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |
| ตัวเลขและวันที่ | ใช้ พ.ศ. ในข้อความไทย; คั่นหลักพันแบบไทยเมื่อจำเป็น |
| อ้างอิงคู่มือ | `docs/USER_GUIDE_PATIENT_WORD_TH.docx`, `docs/USER_GUIDE_DOCTOR_WORD_TH.docx`, `docs/USER_GUIDE_*_PPT_TH.pptx` |
| เอกสารปฏิบัติการ Production | `docs/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` |
| สร้าง/อัปเดตคู่มือ | `python scripts/build-portal-user-guides.py` |
| อัปเดตหน้ากระบวนการ | `python scripts/enrich-process-pages.py --force-steps` |
| ล้างข้อมูลทดสอบ (ไม่ re-seed demo) | `npm run cleanup:cloud-test-only` |
| การทดสอบอัตโนมัติ | Playwright Groups A–Q + Vitest — `tests/PROCESS_COVERAGE_MATRIX.md` |
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-6** (Word ตาราง+สารบัญ / PPT รายสไลด์+ตารางขั้นตอนครบ) |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

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

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| patient_consents | SELECT/INSERT/UPDATE | PDPA consent records CRUD |
| users | SELECT | User identity for consent association |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/consents | GET | SELECT patient_consents WHERE patient_id |
| POST /api/consents | POST | INSERT patient_consents |
| PUT /api/consents/:id | PUT | UPDATE patient_consents WHERE id |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **10 PDPA** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

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
- `docs/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook
- `docs/USER_GUIDE_*_WORD_TH.docx` / `docs/USER_GUIDE_*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์

### องค์ประกอบ UI หลัก (data-testid)

- `pdpa-consent-toggle-*`
- `pdpa-audit-log`

*(รุ่นเอกสารหน้านี้: ENRICH-6 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เปิดเมนู PDPA
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** การเปลี่ยนความยินยอมต้องปรากฏใน audit log — ห้ามแก้ย้อนหลัง
   - **UI หลัก:** `pdpa-consent-toggle-*`, `pdpa-audit-log`
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. อ่านคำอธิบายแต่ละประเภทความยินยอม
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. สลับ `pdpa-consent-toggle-*` ตามต้องการ
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** การเปลี่ยนความยินยอมต้องปรากฏใน audit log — ห้ามแก้ย้อนหลัง
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. ตรวจแท็บ Audit — `pdpa-audit-log` (ไม่แก้ไขย้อนหลัง)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** การเปลี่ยนความยินยอมต้องปรากฏใน audit log — ห้ามแก้ย้อนหลัง
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. จัดการสิทธิ์แพทย์ที่เข้าถึงข้อมูล
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
| **Unit tests** | `pdpaRoute, pdpaAudit.integration.test.ts` |
| **UI (Playwright)** | Group G |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `10_PDPA_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

