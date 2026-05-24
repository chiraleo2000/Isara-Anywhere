# 📊 Doctor Portal — Dashboard Page

**Route:** `/dashboard`
**Component:** `src/pages/DoctorDashboard.tsx`
**Access:** 🔒 Doctor / Admin
**Thai Title:** แดชบอร์ดแพทย์ / Doctor Dashboard
**Version:** v1.4.7


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
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-4** (หลัง v1.7.33 — ล้าง demo + ขั้นตอนและคำอธิบายละเอียด) |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

---


## 1. Purpose

Central clinical hub with 3-column layout: Health Data (patient info), Health Meeting (investigation & treatment), and Health Studio (clinical tools). Provides real-time stats, AI pre-consultation summaries, and quick actions for the clinical workflow.

---


## 2. Page Layout (3 Columns)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 แดชบอร์ดแพทย์                                                          │
│                                                                             │
│  Stats: [📅 Today:5] [👁️ Seen:12] [💊 Rx:2] [📧 Msg:3] [⏱️ Wait:15m]      │
│         [👥 Queue:3] [⏳ Pending:2]                                         │
│                                                                             │
├──────────────────┬──────────────────────┬───────────────────────────────────┤
│  HEALTH DATA     │  HEALTH MEETING       │  HEALTH STUDIO                   │
│  (Patient Info)  │  (Investigation &     │  (Clinical Tools)                │
│                  │   Treatment)          │                                   │
│  Tabs:           │  Tabs:                │  Quick Access Modals:            │
│  [Patient]       │  [Investigation]      │  [📄 Diagnosis]                  │
│  [Doctor]        │  [Treatment]          │  [💊 Treatment Plan]             │
│  [Healthcare     │  [Refer]              │  [📋 System Report]              │
│   Team]          │                       │  [📷 Radiology]                  │
│                  │                       │  [🔬 Laboratory]                 │
│  Patient List    │  Selected Patient:    │  [🔬 Pathology]                  │
│  ├── นายสมชาย    │  Investigation:       │                                   │
│  │   🟡 Pending  │  - Patient details    │  → Navigate to Patients page     │
│  ├── นายอานันท์   │  - AI Pre-consult     │    with category filter          │
│  │   🟢 Confirm  │    summary            │                                   │
│  └── ...         │                       │                                   │
│                  │  Treatment:           │                                   │
│  Search:         │  [Protocols]          │                                   │
│  [🔍 ________]   │  [Prescribe]          │                                   │
│                  │  [History]            │                                   │
│  Select patient  │                       │                                   │
│  → loads details │  Refer:              │                                   │
│  in column 2     │  Referral workflow    │                                   │
└──────────────────┴──────────────────────┴───────────────────────────────────┘
```

---


## 3. Dashboard Statistics (Top Bar)

| Stat | Thai | Data Source | Description |
| ---- | ---- | ----------- | ----------- |
| Today's Appointments | นัดหมายวันนี้ | `/api/appointments` | Count of today's appointments |
| Patients Seen | ผู้ป่วยที่ตรวจ | `/api/appointments` | Completed today |
| Pending Prescriptions | ใบสั่งยารอ | `/api/prescriptions/pending/count/:doctorId` | Unfinished prescriptions |
| Unread Messages | ข้อความยังไม่อ่าน | `/api/notifications/:id/unread-count` | Notification count |
| Average Wait Time | เวลารอเฉลี่ย | Calculated | Minutes per patient |
| Patients in Queue | ผู้ป่วยรอ | `/api/appointments` | Waiting for consultation |
| Pending Confirmations | รอยืนยัน | `/api/appointments` | Unconfirmed appointments |

---


## 4. Column 1: Health Data


### Patient List Tabs

| Tab | Content |
| --- | ------- |
| Patient | Patient list with appointments |
| Doctor | Doctor's own patient panel |
| Healthcare Team | Team members and shared patients |


### Patient Card Features


- Name, age, gender


- Status badge (pending, confirmed, in_progress)


- Urgency level


- Chief complaint preview


- Click → loads patient in Column 2

---


## 5. Column 2: Health Meeting


### Tab: Investigation

```text
┌── Investigation ────────────────────────────────────────────────┐
│  👤 Patient: นายสมชาย มั่นคง (65, Male)                          │
│  📅 Appointment: 21 ม.ค. 2569, 09:00                            │
│  🏥 Type: Telehealth                                             │
│                                                                   │
│  🤖 AI Pre-Consultation Summary:                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ Key Findings:                                          │ │
│  │  - ผู้ป่วยมีประวัติเบาหวานชนิดที่ 2 (HbA1c: 7.2%)         │ │
│  │  - ความดันโลหิตสูง (BP: 145/90)                             │ │
│  │  - ยาปัจจุบัน: Metformin 500mg, Amlodipine 5mg            │ │
│  │                                                            │ │
│  │  📋 Suggested Questions:                                    │ │
│  │  1. สอบถามอาการข้างเคียงของยา Metformin                     │ │
│  │  2. ตรวจสอบการปฏิบัติตาม diet plan                          │ │
│  │  3. ถามเกี่ยวกับอาการชาปลายมือปลายเท้า                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [📹 เริ่มประชุม (Start Meeting)] → Opens Jitsi                  │
└──────────────────────────────────────────────────────────────────┘
```


### Tab: Treatment


#### Sub-tab: Protocols (Evidence-Based Guidelines)

| Protocol | Thai | Guidelines |
| -------- | ---- | ---------- |
| Hypertension | ความดันโลหิตสูง | THA/JNC/AHA 2024-2025 |
| Diabetes | เบาหวาน | ADA/EASD 2024-2025 |
| Dyslipidemia | ไขมันในเลือดสูง | ESC/EAS 2024-2025 |
| Respiratory | โรคทางเดินหายใจ | GOLD/GINA 2024-2025 |


#### Sub-tab: Prescribe


- Quick prescription form with current medications displayed


- Drug search, dosage, frequency, duration


- Safety checks (allergy, interaction)


#### Sub-tab: History


- Previous prescriptions for the selected patient


### Tab: Refer


- Referral workflow to specialists


- Referral form with reason, urgency, notes

---


## 6. Column 3: Health Studio

Quick access modals navigating to the Patients page with category filter:

| Modal | Category | Description |
| ----- | -------- | ----------- |
| 📄 Diagnosis | diagnosis | Diagnostic workup tools |
| 💊 Treatment Plan | treatment | Treatment planning |
| 📋 System Report | medical-record | Medical record generation |
| 📷 Radiology | radiology | Imaging orders and results |
| 🔬 Laboratory | laboratory | Lab orders and results |
| 🔬 Pathology | pathology | Pathology reports |

---


## 7. AI Features on Dashboard


### AI Pre-Consultation Summary

```text
Source: POST /api/ai/pre-consultation-summary
Input: Patient's PHR, EMR history, current symptoms
Output: Key findings, suggested questions, risk alerts
Purpose: Help doctor prepare before meeting
```


### Man-in-the-Loop Validation

```text
Source: POST /api/ai/validation
Actions: Approve / Reject / Use-in-EMR
Purpose: Doctor validates all AI-generated content before use
```


### Jitsi Meeting Launch

```text
Step 1: Select patient from Column 1
Step 2: Click "เริ่มประชุม" in Column 2
Step 3: Creates Jitsi meeting URL (doctor as moderator)
Step 4: Doctor URL opens in new tab
Step 5: Patient meeting link copied to clipboard
Step 6: Patient receives notification with meeting link
```


### Health Meeting Results Column

Column 2 (Health Meeting) displays latest meeting results alongside investigation and treatment.

```text
┌── Latest Meeting Results ───────────────────────────────────┐
│                                                              │
│  📹 Last Meeting: 22 ม.ค. 2569, 09:00-09:45                  │
│  Participants: Doctor + Patient + 1 Guest                    │
│                                                              │
│  🤖 AI Summary Status: 🟡 Pending Validation                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  S: ปวดหัว 3 วัน (truncated preview...)                │ │
│  │  A: Tension headache (G44.2) · Confidence: 92%          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]          │
│  [📋 Open EMR Editor] [📄 View Full Summary]                │
└──────────────────────────────────────────────────────────────┘
```


### Pending Validation Quick Links

Top bar and sidebar quick links to items requiring doctor attention.

```text
┌── Quick Action Alerts ──────────────────────────────────────┐
│                                                              │
│  🔔 Pending Actions:                                         │
│                                                              │
│  🟡 3 Meeting Summaries Awaiting Validation                  │
│     → Click to open Health Meeting > Results tab             │
│                                                              │
│  🟠 2 EMR Drafts Pending Finalization                        │
│     → Click to open EMR Editor                               │
│                                                              │
│  🔵 1 Patient Instruction Sheet Pending Approval             │
│     → Click to open instruction review                       │
│                                                              │
│  🟢 5 Appointments Confirmed Today                           │
│     → Click to open Health Meeting > Meetings tab            │
└──────────────────────────────────────────────────────────────┘
```

| Quick Link | Target Page | Status Filter |
| ---------- | ----------- | ------------- |
| Meeting Summaries | Health Meeting > Results | pending_validation |
| EMR Drafts | EMR Editor | draft |
| Instruction Sheets | EMR Editor > Instructions | pending_approval |
| Today's Meetings | Health Meeting > Meetings | confirmed |
| Patient Queue | Health Meeting > Queue | pending |

---


## 8. Workflows


### Workflow 1: Morning Dashboard Review

```text
Step 1: Doctor logs in → Dashboard loads
Step 2: Stats bar shows today's appointments, pending tasks
Step 3: Column 1 displays today's patient queue
Step 4: Doctor clicks first patient
Step 5: Column 2 loads AI pre-consultation summary
Step 6: Doctor reviews patient history and AI suggestions
Step 7: Doctor prepares for consultation
```


### Workflow 2: Start Video Consultation

```text
Step 1: Select patient in Column 1
Step 2: Review AI summary in Column 2 (Investigation tab)
Step 3: Click "เริ่มประชุม" (Start Meeting)
Step 4: Jitsi opens in new tab (doctor as HOST)
Step 5: Patient joins from their portal via meeting link
Step 6: Patient enters lobby → Doctor admits
Step 7: Consultation begins with live transcription
```


### Workflow 3: Post-Consultation Documentation

```text
Step 1: Meeting ends
Step 2: AI generates SOAP summary from transcript
Step 3: Doctor reviews summary (Man-in-the-Loop)
Step 4: Opens EMR Editor → Approves/edits AI content
Step 5: Opens Prescribing → Writes prescription
Step 6: Opens Lab Orders → Orders follow-up tests
Step 7: Signs EMR → Patient notified
```

---


## 9. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Today's appointments |
| GET | `/api/prescriptions/pending/count/:doctorId` | Pending prescription count |
| GET | `/api/notifications/:id/unread-count` | Unread notification count |
| GET | `/api/patients` | Patient list |
| POST | `/api/ai/pre-consultation-summary` | AI pre-consultation summary |
| POST | `/api/ai/validation` | Man-in-the-Loop validation |
| POST | `/api/meetings/create` | Create Jitsi meeting |
| GET | `/api/meetings/pending-validation` | Meetings awaiting validation |
| GET | `/api/meetings/:id/results` | Get meeting results with AI summary |
| GET | `/api/emr/drafts/:doctorId` | Get pending EMR drafts |
| GET | `/api/patients/:id/instruction-sheets/pending` | Pending instruction sheets |

---


## 10. AI Agent Improvement Opportunities


- **Smart patient prioritization**: AI sort queue by clinical urgency


- **Auto-documentation**: AI draft full SOAP note from meeting transcript


- **Decision support alerts**: AI surface critical drug interactions proactively


- **Workflow optimization**: AI suggest optimal patient order for the day


- **Real-time clinical copilot**: AI provide suggestions during consultation


- **Pending action aggregation**: AI prioritize validation queue by urgency


- **Pre-consultation insights**: AI surface relevant lab results and trends before meeting


- **Meeting readiness check**: AI verify all prerequisites before meeting start

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT | Today's appointments for logged-in doctor |
| users | SELECT | Patient count and basic info |
| notifications | SELECT | Unread notification count |
| emr | SELECT | Recent EMR entries for quick access |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/dashboard/stats | GET | SELECT COUNT from appointments, users, notifications |
| GET /api/appointments/today | GET | SELECT appointments WHERE date = TODAY AND doctor_id |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **03 Dashboard** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

### ขอบเขตและบทบาท

แพทย์เป็น **HOST** ของวิดีโอคอล: Admit lobby, บันทึก, จบประชุม, ตรวจสอบ AI Summary ก่อนลง EMR
ผู้ดูแลระบบ (admin) จัดการ Pool นัด อนุมัติบัญชี และเนื้อหา — ไม่แทนแพทย์ในการลงนาม EMR

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

- `dashboard-page`
- `dashboard-kpi-*`

*(รุ่นเอกสารหน้านี้: ENRICH-4 — อัปเดตหลังล้างข้อมูลทดสอบ cloud และ release v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** ตรวจว่า session มี JWT และไม่ถูก redirect กลับหน้า login
   - **UI หลัก:** `dashboard-page`, `dashboard-kpi-*`
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. เปิดหน้า «03 Dashboard Page» จากเมนูหลัก
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. ดำเนินการตามฟอร์มบนหน้าจอทีละขั้น
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. ตรวจข้อความแจ้งเตือนและสถานะ API
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. ยืนยันผลลัพธ์กับข้อมูลใน PostgreSQL (เมื่อเกี่ยวข้อง)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
6. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม workflow
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 6 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
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
| **Unit tests** | `dashboardFiltering` |
| **UI (Playwright)** | Group A, C |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `03_Dashboard_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

