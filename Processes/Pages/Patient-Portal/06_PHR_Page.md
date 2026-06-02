# 💊 Patient Portal — PHR Page (Personal Health Records)

**Route:** `/phr`
**Component:** `src/pages/health/PHRPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** ระเบียนสุขภาพส่วนบุคคล


## มาตรฐานเอกสาร (รายงานภาษาไทย)

เอกสารชุดนี้จัดทำให้สอดคล้อง**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข (โครงสร้าง: วัตถุประสงค์ → ขอบเขต → ขั้นตอน → ผลลัพธ์ → ข้อควรระวัง → อ้างอิง)

| รายการ | ค่าที่ใช้ |
|--------|-----------|
| เอกสาร Word / รายงาน PDF | **TH Sarabun New** — เนื้อหา **16 pt**, หัวข้อระดับ 1 **18 pt**, หัวข้อระดับ 2 **16 pt** (ตัวหนา), ชื่อเรื่อง **22 pt**, ระยะบรรทัด **1.15**, จัดชิดซ้าย |
| สไลด์นำเสนอ PowerPoint | **FC Iconic** — หัวข้อสไลด์ **32 pt**, หัวข้อรอง **22 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |
| ตัวเลขและวันที่ | ใช้ พ.ศ. ในข้อความไทย; คั่นหลักพันแบบไทยเมื่อจำเป็น |
| อ้างอิงคู่มือ | `Documents/Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx`, `Documents/Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx`, `Documents/Documents/docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx` |
| เอกสารปฏิบัติการ Production | `Documents/docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` |
| สร้าง/อัปเดตคู่มือ | `python scripts/build-portal-user-guides.py` |
| อัปเดตหน้ากระบวนการ | `python scripts/enrich-process-pages.py --force-steps` |
| ล้างข้อมูลทดสอบ (ไม่ re-seed demo) | `npm run cleanup:cloud-test-only` |
| การทดสอบอัตโนมัติ | Playwright Groups A–Q + Vitest — `tests/PROCESS_COVERAGE_MATRIX.md` |
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-9** (Word TH Sarabun New 16 pt / PPT FC Iconic — ขั้นตอน 8–12 รายการ + คำอธิบายเชิงรายงานทุกหน้า) |
| โครงสร้างเทคนิค (สถาปัตยกรรม) | `Documents/docs/technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx`, `Documents/docs/technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx`, `Documents/docs/diagrams/diagrams.drawio` |
| สร้างเอกสารโครงสร้างเทคนิค | `python scripts/build-technical-architecture-docs.py` |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

---


## 1. Purpose

Central health data management for patients — vital signs tracking, medication management, allergy records, and lifestyle data entry. All data stored in PostgreSQL.

---


## 2. Page Layout (5 Tabs)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💊 ระเบียนสุขภาพ (Personal Health Record)                           │
│                                                                     │
│  Tabs: [ภาพรวม] [สัญญาณชีพ] [ยา] [แพ้ยา] [โปรไฟล์]                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              (Tab Content Area)                              │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Tab Details


### Tab 1: ภาพรวม (Overview)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Quick Stats (4 cards):                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                      │
│  │ 🫀 BP   │ │ ❤️ HR   │ │ ⚖️ WT   │ │ 🌡️ Temp │                      │
│  │ 120/80  │ │ 72bpm  │ │ 70kg   │ │ 36.5°C │                      │
│  │ ↑ trend │ │ → same │ │ ↓ down │ │ → same │                      │
│  └────────┘ └────────┘ └────────┘ └────────┘                      │
│                                                                     │
│  📋 Basic Info:                                                     │
│  Blood Type: A+  |  Height: 170cm  |  Weight: 70kg  |  BMI: 24.2  │
│  Chronic Conditions: Hypertension, Type 2 Diabetes                  │
│                                                                     │
│  Quick Actions:                                                     │
│  [บันทึกสัญญาณชีพ] [จัดการยา] [ดูประวัติแพ้ยา]                       │
└─────────────────────────────────────────────────────────────────────┘
```


### Tab 2: สัญญาณชีพ (Vitals)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📊 บันทึกสัญญาณชีพ (Record New Vitals)                              │
│                                                                     │
│  ┌── Form ──────────────────────────────────────────────────┐      │
│  │  ความดันตัวบน (Systolic): [___] mmHg                      │      │
│  │  ความดันตัวล่าง (Diastolic): [___] mmHg                   │      │
│  │  อัตราหัวใจ (Heart Rate): [___] bpm                       │      │
│  │  น้ำหนัก (Weight): [___] kg                               │      │
│  │  อุณหภูมิ (Temperature): [___] °C (35-42 range)          │      │
│  │  น้ำตาลในเลือด (Blood Glucose): [___] mg/dL              │      │
│  │  ออกซิเจนในเลือด (SpO2): [___] %                         │      │
│  │                                                           │      │
│  │  [   💾 บันทึก   ]                                        │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                     │
│  📜 ประวัติสัญญาณชีพ (Vitals History):                               │
│  ├── 21 ม.ค. 2569 09:00 — BP: 125/82, HR: 74, Temp: 36.6         │
│  ├── 20 ม.ค. 2569 08:30 — BP: 130/85, HR: 78, Temp: 36.5         │
│  └── 19 ม.ค. 2569 09:15 — BP: 120/80, HR: 72, Temp: 36.4         │
│  (Last 10 entries, sorted newest first)                             │
└─────────────────────────────────────────────────────────────────────┘
```


### Tab 3: ยา (Medications)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💊 ยาปัจจุบัน (Current Medications)                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Metformin 500mg                                  🟢 Active │   │
│  │  ขนาด: 500mg · ความถี่: 2 เวลา/วัน · เพื่อ: เบาหวาน         │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Amlodipine 5mg                                   🟢 Active │   │
│  │  ขนาด: 5mg · ความถี่: 1 เวลา/วัน · เพื่อ: ความดันโลหิตสูง    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [+ เพิ่มยา]                                                        │
│  ┌── Add Form ─────────────────────────────┐                       │
│  │  ชื่อยา: [____________]                  │                       │
│  │  ขนาด: [____________]                   │                       │
│  │  ความถี่: [____________]                 │                       │
│  │  วัตถุประสงค์: [____________]             │                       │
│  │  [เพิ่ม]                                 │                       │
│  └──────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```


### Tab 4: แพ้ยา (Allergies)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ ประวัติแพ้ยา (Allergy Records)                                   │
│                                                                     │
│  Tags: [Penicillin ×] [Aspirin ×] [Sulfa ×]                       │
│                                                                     │
│  [+ เพิ่มประวัติแพ้ยา]                                                │
│  ┌── Add Form ─────────────────────────────┐                       │
│  │  สารที่แพ้: [____________]               │                       │
│  │  [เพิ่ม]                                 │                       │
│  └──────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```


### Tab 5: โปรไฟล์ (Profile/Lifestyle)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👤 ข้อมูลส่วนตัว (Personal Info)                                    │
│  ├── ส่วนสูง: [170] cm                                              │
│  ├── กรุ๊ปเลือด: [A+]                                               │
│  └── โรคประจำตัว: [Hypertension] [×] [Diabetes] [×] [+ เพิ่ม]     │
│                                                                     │
│  🏃 ข้อมูลสุขภาพ (Lifestyle & Self-Entered Data)                    │
│  ├── อาหาร (Diet): [____________]                                   │
│  ├── ออกกำลังกาย (Exercise): [ความถี่ ▼]                             │
│  ├── การนอน (Sleep): [___] ชั่วโมง/คืน                               │
│  ├── สูบบุหรี่ (Smoking): [สถานะ ▼]                                  │
│  ├── แอลกอฮอล์ (Alcohol): [ระดับ ▼]                                 │
│  ├── อาหารเสริม (Supplements): [____________]                       │
│  └── การรักษาทางเลือก (Alt. Treatments): [____________]             │
│                                                                     │
│  [   💾 บันทึก   ]                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 4. Workflows


### Workflow 1: Record Vital Signs

```text
Step 1: Navigate to PHR page → Vitals tab
Step 2: Enter vital readings (any combination of fields)
Step 3: Click "บันทึก" (Save)
Step 4: POST /api/phr/{userId}/vitals
Step 5: New entry appears at top of history list
Step 6: Overview tab stats update with new readings
Step 7: Trend arrows update (↑ up / ↓ down / → same vs previous)
```


### Workflow 2: Manage Medications

```text
Step 1: Navigate to PHR page → Medications tab
Step 2: View current medications list
Step 3: Click "เพิ่มยา" (Add Medication)
Step 4: Fill in name, dosage, frequency, purpose
Step 5: Click "เพิ่ม" (Add)
Step 6: POST /api/phr/{userId}/medications
Step 7: New medication appears in list as "Active"
Step 8: Can mark medication as "Stopped" if discontinued
```


### Workflow 3: Update Lifestyle Data

```text
Step 1: Navigate to PHR page → Profile tab
Step 2: Edit lifestyle fields (diet, exercise, sleep, etc.)
Step 3: Click "บันทึก" (Save)
Step 4: PUT /api/phr/{userId}/profile
Step 5: Data saved and visible to authorized doctors
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/phr/{userId}` | Get full PHR data |
| GET | `/api/phr/{userId}/vitals` | Get vital signs history |
| POST | `/api/phr/{userId}/vitals` | Record new vitals |
| GET | `/api/phr/{userId}/medications` | Get medications list |
| POST | `/api/phr/{userId}/medications` | Add medication |
| PUT | `/api/phr/{userId}/profile` | Update profile/lifestyle |

---


## 6. Data Visible to Doctors

When PDPA consent is granted, doctors can see:

| Data Type | Doctor Access |
| --------- | ------------- |
| Vital signs history | ✅ Full history |
| Current medications | ✅ Active + stopped |
| Allergies | ✅ Full list |
| Chronic conditions | ✅ Full list |
| Lifestyle data | ✅ If shared |
| Blood type, height, weight | ✅ Always |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Overview quick actions | → Vitals tab, Medications tab, Allergies tab |
| Dashboard health stats | ← Pulls from PHR data |
| Doctor's PatientRecordViewer | ← Reads PHR data |
| AI Doctor chat | ← References PHR for context |

---


## 8. AI Agent Improvement Opportunities


- **Smart vital interpretation**: AI analyze vital trends and alert on concerning patterns


- **Medication interaction check**: AI cross-check all medications for interactions


- **Auto-import**: AI extract vitals from wearable devices (Apple Health, Google Fit)


- **Predictive health**: AI predict health risks from PHR trends


- **Medication reminders**: AI generate personalized medication schedules


- **Allergy severity classification**: AI categorize allergy severity automatically

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| phr | UPSERT | Personal Health Records (allergies, conditions, medications) |
| vital_signs | INSERT | Patient vital measurements (BP, HR, temp, weight) |
| patient_profiles | SELECT / UPDATE | Patient demographic data linked to PHR |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/phr | GET | SELECT phr WHERE patient_id = current |
| /api/phr | POST | UPSERT phr |
| /api/vital-signs | POST | INSERT vital_signs |


### Real-time Events


- **NOTIFY:** phr_changes → Socket.IO PHR update notifications


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **06 PHR** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `Documents/Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

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
- `Documents/docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook
- `Documents/Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` / `Documents/Documents/docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์

### องค์ประกอบ UI หลัก (data-testid)

- `phr-page`
- `phr-tab-*`

*(รุ่นเอกสารหน้านี้: ENRICH-9 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เลือกผู้ป่วย (แพทย์) หรือเปิดเมนู PHR (ผู้ป่วย)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI หลัก:** `phr-page`, `phr-tab-*`
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. เลือกแท็บ Vitals / Meds / Allergies / EMR
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** EMR จาก AI ต้อง `ai_summary_approved = false` จนแพทย์ตรวจและลงนาม
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. ตรวจข้อมูลล่าสุดจากการซิงค์
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. ไม่แก้ไขข้อมูลที่แพทย์ล็อกแล้ว
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. ดาวน์โหลด/พิมพ์ตามสิทธิ์
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
| **Status** | partial |
| **Unit tests** | `phrRoute` |
| **UI (Playwright)** | Group F |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `06_PHR_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

