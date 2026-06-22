# 📋 Patient Portal — Timeline Page

**Version:** v1.4.7
**Route:** `/timeline`
**Component:** `frontend/pages/timeline/TimelinePage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** ประวัติการรักษา / Complete Treatment History


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


## 1. Purpose

Chronological timeline of all medical events — appointments, medications, lab results, procedures, and diagnoses — providing a complete treatment history at a glance.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 ประวัติการรักษา (Complete Treatment History)                      │
│                                                                     │
│  Filter: [ทั้งหมด] [📅 นัดหมาย] [💊 ยา] [🔬 ผลแล็บ]                │
│          [🏥 หัตถการ] [📄 การวินิจฉัย]                                │
│                                                                     │
│  ─── มกราคม 2569 ──────────────────────────────────────────────    │
│                                                                     │
│  │ 🟢 21 ม.ค.                                                      │
│  ├── 📅 นัดหมายกับ นพ. ทดสอบ ระบบ                                    │
│  │   Telehealth · อายุรกรรม                                         │
│  │   ▼ รายละเอียด:                                                  │
│  │   วินิจฉัย: ความดันโลหิตสูง ระยะที่ 1                              │
│  │   การรักษา: ปรับยา Amlodipine                                    │
│  │                                                                  │
│  │ 🔵 18 ม.ค.                                                      │
│  ├── 💊 เริ่มยา Metformin 500mg                                     │
│  │   2 เวลา/วัน · สำหรับเบาหวาน                                     │
│  │                                                                  │
│  │ 🟣 15 ม.ค.                                                      │
│  ├── 🔬 ผลแล็บ CBC                                                  │
│  │   ▼ รายละเอียด: Hb 12.5, WBC 8,000                              │
│  │                                                                  │
│                                                                     │
│  ─── ธันวาคม 2568 ──────────────────────────────────────────────   │
│                                                                     │
│  │ 🟠 28 ธ.ค.                                                      │
│  ├── 🏥 หัตถการ: ตรวจสายตา                                           │
│  │                                                                  │
│  │ 🔴 20 ธ.ค.                                                      │
│  ├── 📄 วินิจฉัย: เบาหวานชนิดที่ 2                                   │
│  │   โดย นพ. ทดสอบ · ICD-10: E11                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Event Types

| Type | Icon | Color | Thai Name |
| ---- | ---- | ----- | --------- |
| appointment | 📅 | Emerald (green) | นัดหมาย |
| consultation | 📹 | Teal | ผลการปรึกษา (Telehealth) |
| medication | 💊 | Blue | ยา |
| lab | 🔬 | Purple | ผลแล็บ |
| procedure | 🏥 | Orange | หัตถการ |
| diagnosis | 📄 | Red | การวินิจฉัย |
| instruction_sheet | 📝 | Indigo | เอกสารคำแนะนำผู้ป่วย |

---


## 4. Features & Actions

| Feature | Description |
| ------- | ----------- |
| **Type filter** | Button-based filter by event type |
| **Monthly grouping** | Events grouped by month with headers |
| **Visual timeline** | Vertical line with color-coded dots |
| **Expandable details** | Click event to expand details |
| **Reverse chronological** | Newest events first |

---


## 5. Workflows


### Workflow 1: Browse Treatment History

```text
Step 1: Navigate to /timeline
Step 2: GET /api/health/timeline (or combined appointment/PHR data)
Step 3: Events loaded and grouped by month
Step 4: Newest events displayed first
Step 5: Scroll through chronological timeline
```


### Workflow 2: Filter by Event Type

```text
Step 1: Click filter button (e.g., "💊 ยา")
Step 2: Only medication events displayed
Step 3: Click "ทั้งหมด" to show all events again
```


### Workflow 3: View Event Details

```text
Step 1: Click on a timeline event card
Step 2: Card expands to show full details
Step 3: Shows relevant information based on event type:
        - Appointment: doctor, diagnosis, treatment, prescription
        - Consultation: meeting outcome, diagnosis, treatment plan, medications
        - Medication: name, dosage, frequency, purpose
        - Lab: test name, results, normal ranges
        - Procedure: type, doctor, notes
        - Diagnosis: ICD-10 code, description, doctor
        - Instruction Sheet: PDF download, summary of instructions
```


### Workflow 4: View Completed Meeting Results in Timeline

```text
Step 1: After telehealth consultation is completed:
        - Doctor processes AI summary → validates → creates EMR
        - EMR data flows to timeline as new entries
Step 2: Patient navigates to /timeline
Step 3: New timeline entries appear for the completed consultation:

        📹 Consultation Entry (ผลการปรึกษา):
        ├── Doctor name and specialty
        ├── Meeting date and time
        ├── Type: Telehealth (📹)
        ├── Diagnosis (patient-friendly Thai):
        │   "ความดันโลหิตสูง ระยะที่ 1"
        ├── Treatment Plan:
        │   "ปรับยา Amlodipine, ลดอาหารเค็ม, ออกกำลังกาย"
        ├── Medications with Instructions (วิธีกินยา):
        │   "Amlodipine 5mg วันละ 1 เม็ด หลังอาหารเช้า"
        ├── Follow-up: 22 ก.พ. 2569
        └── Warning Signs: ปวดศีรษะรุนแรง, ตาพร่ามัว

        📝 Patient Instruction Sheet Entry (เอกสารคำแนะนำ):
        ├── Generated date
        ├── Associated appointment reference
        ├── Summary of key instructions
        └── [📥 ดาวน์โหลด PDF] button

Step 4: Patient clicks on consultation entry → expands to full details
Step 5: Patient clicks "📥 ดาวน์โหลด PDF" → downloads instruction sheet
```


### Workflow 5: Download Patient Instruction Sheet from Timeline

```text
Step 1: Patient scrolls to consultation entry with 📝 icon
Step 2: Clicks the entry to expand
Step 3: Sees instruction sheet summary:
        - Diagnosis in patient-friendly Thai
        - Medication list with dosage and instructions
        - Follow-up appointment date
        - Warning signs to watch for
        - Doctor's name and contact info
Step 4: Clicks [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]
Step 5: PDF downloads with Thai content:
        - เอกสารคำแนะนำผู้ป่วย (Patient Instruction Sheet)
        - Date and doctor information
        - Diagnosis and treatment plan
        - Medications with วิธีกินยา (how to take)
        - Warning signs (อาการที่ต้องเฝ้าระวัง)
        - Follow-up date and instructions
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/health/timeline` | Get complete treatment timeline |
| GET | `/api/health/timeline?type=consultation` | Filter timeline by consultation events |
| GET | `/api/appointments/:id/results` | Get patient-friendly consultation results |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/emr-summary` | Get patient-visible EMR summary |

---


## 7. Data Sources

| Event Type | Data Source |
| ---------- | ----------- |
| Appointments | `appointments` table |
| Consultations | `appointments` (completed telehealth) + `emr_records` |
| Medications | PHR medications + prescriptions |
| Lab Results | `lab_orders` table |
| Procedures | EMR records |
| Diagnoses | EMR diagnosis entries |
| Instruction Sheets | `patient_instruction_sheets` table (generated PDFs) |

---


## 8. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Dashboard | → | Quick link from treatment results |
| Appointments | ← | Completed appointments feed into timeline |
| PHR | ← | Medications appear in timeline |
| Doctor EMR | ← | EMR data feeds diagnosis/procedure events |

---


## 9. Consultation Result Display (Patient-Friendly Format)

When a telehealth consultation is completed, the timeline shows results in patient-friendly Thai format:

```text
┌── 📹 ผลการปรึกษา — 22 ม.ค. 2569 ──────────────────────────────┐
│                                                                 │
│  👨‍⚕️ นพ. ทดสอบ ระบบ · อายุรกรรม                                  │
│  📹 Telehealth · ⏱️ 25 นาที                                     │
│                                                                 │
│  🏥 การวินิจฉัย (Diagnosis):                                     │
│  ความดันโลหิตสูง ระยะที่ 1                                       │
│                                                                 │
│  📋 แผนการรักษา (Treatment Plan):                                │
│  • ปรับยา Amlodipine จาก 2.5mg เป็น 5mg                        │
│  • ลดอาหารเค็ม                                                   │
│  • ออกกำลังกายอย่างน้อย 30 นาที/วัน                              │
│                                                                 │
│  💊 ยาที่สั่ง (Medications):                                      │
│  ├── Amlodipine 5mg — วันละ 1 เม็ด หลังอาหารเช้า                │
│  └── Aspirin 81mg — วันละ 1 เม็ด หลังอาหารเย็น                  │
│                                                                 │
│  📅 นัดติดตาม: 22 ก.พ. 2569                                     │
│                                                                 │
│  ⚠️ อาการที่ต้องเฝ้าระวัง:                                        │
│  • ปวดศีรษะรุนแรง                                                │
│  • ตาพร่ามัว                                                     │
│  • เจ็บหน้าอก หายใจลำบาก                                        │
│  → หากมีอาการเหล่านี้ ให้พบแพทย์ทันที                            │
│                                                                 │
│  [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]                              │
└─────────────────────────────────────────────────────────────────┘
```


## Patient Data Privacy in Timeline

| Visible to Patient | NOT Visible to Patient |
| ------------------- | ---------------------- |
| ✅ Diagnosis (patient-friendly Thai) | ❌ Internal doctor notes |
| ✅ Treatment plan summary | ❌ Raw AI outputs / transcription |
| ✅ Medications + instructions (วิธีกินยา) | ❌ Doctor-to-doctor communications |
| ✅ Patient Instruction Sheet (PDF) | ❌ CDS alerts (clinical decision support) |
| ✅ Follow-up schedule | ❌ AI confidence scores |
| ✅ Warning signs | ❌ Internal billing codes |

---


## 10. AI Agent Improvement Opportunities


- **Smart summary**: AI generate overall health trajectory summary


- **Trend analysis**: AI identify patterns in treatment history


- **Predictive timeline**: AI forecast upcoming needed appointments/tests


- **Export/Print**: AI format timeline for sharing with other providers


- **Comparison view**: AI compare current vs past health metrics


- **Event correlation**: AI link related events (diagnosis → medication → lab)

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT | Appointment history for timeline events |
| emr | SELECT | EMR records as timeline entries |
| prescriptions | SELECT | Prescription events in timeline |
| lab_orders | SELECT | Lab order events in timeline |
| vital_signs | SELECT | Vital sign entries in timeline |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/timeline | GET | SELECT appointments, emr, prescriptions, lab_orders, vital_signs WHERE patient_id ORDER BY date |


### Note


- **Aggregated read-only timeline** combining data from 5 tables sorted chronologically


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **14 Timeline** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

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

1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** ตรวจว่า session มี JWT และไม่ถูก redirect กลับหน้า login
   - **UI หลัก:** ดู `tests/SELECTORS.md` สำหรับหน้านี้
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. เปิดหน้า «14 Timeline Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** การเปลี่ยนความยินยอมต้องปรากฏใน audit log — ห้ามแก้ย้อนหลัง
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 6 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 7 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 8 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 9 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 10 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
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
| **Unit tests** | `timelinePage` |
| **UI (Playwright)** | Group J |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `14_Timeline_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

