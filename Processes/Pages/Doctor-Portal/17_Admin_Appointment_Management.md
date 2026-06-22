# ✅ Doctor Portal — Admin Appointment Management

**Route:** `/admin/appointments`
**Component:** `frontend/pages/AdminAppointmentManagement.tsx`
**Access:** 🔒 Admin only
**Thai Title:** จัดการนัดหมาย / Appointment Management
**Version:** v1.4.7


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

Admin-only page for managing all appointment requests: auto-assign doctors using AI specialty matching, manually assign, or reject appointments.

---


## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ✅ จัดการนัดหมาย (Appointment Management)                           │
│                                                                     │
│  Stats: [📊 Total: 25] [⏳ Pending: 8] [✅ Assigned: 17]           │
│                                                                     │
│  Tabs: [⏳ Pending] [✅ Assigned] [📋 All]                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟡 นายสมชาย มั่นคง           21 ม.ค. 2569                  │   │
│  │  อาการ: ปวดหัว มึนงง ประมาณ 3 วัน                            │   │
│  │  ประเภท: Telehealth · ความเร่งด่วน: ปกติ                     │   │
│  │  🤖 AI Match: อายุรกรรม (Confidence: 85%)                    │   │
│  │                                                              │   │
│  │  [🤖 Auto-Assign] [👨‍⚕️ Assign Doctor] [❌ Reject]            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [🤖 Auto-Assign All Pending]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. AI Auto-Assign Logic


### Specialty Matching (11 categories)

| Category | Keywords (Thai + English) |
| -------- | ------------------------ |
| General | ทั่วไป, ตรวจสุขภาพ, general, checkup |
| Cardiology | หัวใจ, เจ็บหน้าอก, heart, chest pain |
| Dermatology | ผิวหนัง, ผื่น, skin, rash |
| Neurology | ปวดหัว, ชา, headache, numbness |
| Orthopedics | กระดูก, ปวดหลัง, bone, back pain |
| Pediatrics | เด็ก, ไข้เด็ก, child, fever child |
| Psychiatry | นอนไม่หลับ, เครียด, insomnia, stress |
| Gynecology | ประจำเดือน, ตั้งครรภ์, menstrual, pregnancy |
| Internal Medicine | เบาหวาน, ความดัน, diabetes, hypertension |
| ENT | หู, คอ, จมูก, ear, throat, nose |
| Ophthalmology | ตา, สายตา, eye, vision |



---


## 4. Manual Assign Modal

```text
┌── Assign Doctor ────────────────────────────────────────────┐
│  Patient: นายสมชาย มั่นคง                                    │
│                                                              │
│  👨‍⚕️ Select Doctor: [____________ ▼]                         │
│  📅 Date: [2569-01-22]                                      │
│  ⏰ Time: [09:00]                                           │
│  📝 Notes: [________________________________]               │
│                                                              │
│  [ยกเลิก (Cancel)]           [มอบหมาย (Assign)]             │
└──────────────────────────────────────────────────────────────┘
```

---


## 5. Workflows


### Workflow 1: AI Auto-Assign

```text
Step 1: Admin views pending appointments
Step 2: Clicks "Auto-Assign" on specific appointment
Step 3: AI analyzes symptoms/reason with keyword matching
Step 4: Finds available doctor matching specialty
Step 5: PATCH /api/appointments/:id → assigned to matched doctor
Step 6: Doctor notified of assignment
```


### Workflow 2: Batch Auto-Assign

```text
Step 1: Admin clicks "Auto-Assign All Pending"
Step 2: AI processes all pending appointments in sequence
Step 3: Each assigned to best-matching available doctor
Step 4: Results summary shown
```


### Workflow 3: Manual Assign

```text
Step 1: Admin clicks "Assign Doctor" on appointment
Step 2: Modal opens with doctor dropdown, date, time, notes
Step 3: Select doctor and schedule
Step 4: Click "Assign"
Step 5: PATCH /api/appointments/:id → assigned
Step 6: Doctor and patient notified
```


### Workflow 4: Reject

```text
Step 1: Admin clicks "Reject" on appointment
Step 2: Reason prompt appears
Step 3: Admin enters rejection reason
Step 4: PATCH /api/appointments/:id → rejected
Step 5: Patient notified with reason
```


### Workflow 5: Pool Appointment → Doctor Assignment → Meeting Lifecycle

```text
Step 1:  Patient creates appointment (from Patient Portal)
Step 2:  Appointment enters pool with status: in_pool
Step 3:  AI analyzes symptoms → matches specialty (11 categories)
Step 4:  Admin reviews AI recommendation (confidence %)
Step 5:  Admin clicks "Auto-Assign" or manually assigns doctor
Step 6:  Doctor notified → status: awaiting_doctor_response
Step 7:  Doctor confirms → status: confirmed
Step 8:  Jitsi meeting URLs generated (Doctor, Patient, Guest)
Step 9:  Patient notified with meeting link
Step 10: Meeting day: Doctor starts meeting as HOST
Step 11: Participants join via lobby → Doctor admits
Step 12: Meeting conducted with transcript streaming
Step 13: Meeting ends → AI pipeline generates SOAP summary
Step 14: Doctor validates summary (Man-in-the-Loop)
Step 15: Doctor finalizes EMR → status: completed
Step 16: Admin can track full lifecycle in "All" tab
```

---


## 6. Appointment Status Lifecycle

Complete tracking through the meeting lifecycle.

```text
Appointment Lifecycle Flow:

[Patient Creates] → pending
       │
       ▼
[Enter Pool] → in_pool
       │
       ├── AI Auto-Assign → assigned
       └── Manual Assign → assigned
       │
       ▼
[Doctor Notified] → awaiting_doctor_response
       │
       ├── Doctor Accepts → confirmed
       └── Doctor Declines → back to in_pool
       │
       ▼
[Meeting Created] → meeting_scheduled
       │
       ▼
[Meeting Active] → in_progress
       │
       ▼
[Meeting Ended] → meeting_completed
       │
       ▼
[AI Summary Generated] → pending_validation
       │
       ▼
[Doctor Validates] → emr_pending
       │
       ▼
[EMR Finalized] → completed
       │
       └── Patient receives results
```


### Status Tracking Table

| Status | Thai | Phase | Admin Visible |
| ------ | ---- | ----- | ------------- |
| pending | รอดำเนินการ | Pre-assignment | ✅ |
| in_pool | รอจัดสรร | Pool | ✅ |
| assigned | มอบหมายแล้ว | Assignment | ✅ |
| awaiting_doctor_response | รอแพทย์ตอบรับ | Confirmation | ✅ |
| confirmed | ยืนยันแล้ว | Pre-meeting | ✅ |
| meeting_scheduled | นัดประชุมแล้ว | Scheduled | ✅ |
| in_progress | กำลังประชุม | Active meeting | ✅ |
| meeting_completed | ประชุมเสร็จ | Post-meeting | ✅ |
| pending_validation | รอตรวจสอบ | AI summary review | ✅ |
| emr_pending | รอบันทึก EMR | EMR finalization | ✅ |
| completed | เสร็จสิ้น | Done | ✅ |
| rejected | ปฏิเสธ | Rejected | ✅ |
| cancelled | ยกเลิก | Cancelled | ✅ |
| no_show | ไม่มา | No-show | ✅ |



---


## 7. AI Auto-Assign Specialty Matching Details

The AI matching system analyzes patient symptoms using keyword matching across 11 medical specialties.

```text
AI Matching Flow:

Step 1: Patient submits appointment with symptoms/reason (Thai or English)
Step 2: AI tokenizes and analyzes symptom text
Step 3: Keyword matching against 11 specialty categories
Step 4: Confidence score calculated (0-100%)
Step 5: Available doctors filtered by:
        → Matching specialty
        → Schedule availability
        → Current workload (load balancing)
Step 6: Best match presented to admin with confidence %
Step 7: Admin approves or overrides assignment
```

| Confidence | Action | Description |
| ---------- | ------ | ----------- |
| ≥ 85% | Auto-assignable | High confidence, admin can approve directly |
| 60-84% | Review recommended | Moderate confidence, admin should review |
| < 60% | Manual assignment | Low confidence, admin should assign manually |



---


## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List all appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |
| GET | `/api/doctors` | List available doctors |
| POST | `/api/appointments/:id/assign` | Assign to doctor |
| POST | `/api/appointments/auto-assign-all` | Batch auto-assign all pending |
| GET | `/api/appointments/lifecycle/:id` | Get full appointment lifecycle history |
| GET | `/api/appointments/stats` | Get appointment statistics by status |
| GET | `/api/meetings/:id/status` | Get meeting status for appointment |
| GET | `/api/doctors/availability` | Check doctor schedule availability |
| GET | `/api/doctors/workload` | Get doctor workload for load balancing |



---


## 9. AI Agent Improvement Opportunities


- **Smart load balancing**: AI distribute appointments evenly across doctors

- **Priority scheduling**: AI factor in urgency for assignment order

- **Availability optimization**: AI consider doctor schedules and workload

- **Patient preferences**: AI match based on language, gender preferences

- **Lifecycle analytics**: AI identify bottlenecks in appointment-to-completion flow

- **No-show prediction**: AI predict and flag high-risk no-show appointments

- **Auto-escalation**: AI escalate stalled appointments (e.g., awaiting_doctor_response > 24h)

- **Meeting preparation alerts**: AI notify admin when meeting prerequisites not met

---


## PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT/UPDATE | All appointment statuses, admin management |
| users | SELECT | Patient and doctor info for assignment |
| doctor_schedules | SELECT | Doctor availability for assignment matching |




### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/appointments | GET | SELECT appointments with all statuses (admin view) |
| PUT /api/appointments/:id/assign | PUT | UPDATE appointments SET doctor_id, status WHERE id |




### Admin Operations

- Admin assigns doctor to unassigned appointments

- Admin can reassign or cancel appointments


### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **17 Admin Appointment Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

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
- `docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook
- `docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` / `*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์

### องค์ประกอบ UI หลัก (data-testid)

- `appointment-wizard-*`
- `appointment-join-meeting-btn`

*(รุ่นเอกสารหน้านี้: ENRICH-9 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. ตรวจสอบสถานะนัดปัจจุบัน (pending / in_pool / awaiting_doctor_response / confirmed)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI หลัก:** `appointment-wizard-*`, `appointment-join-meeting-btn`
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. ดำเนินการตามบทบาท: ผู้ป่วยจอง | แอดมินจัดสรร | แพทย์ยืนยัน
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. ตรวจ KPI คิว (`queue-count`) และรายการใน `queue-list`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. อัปเดต realtime ผ่าน Socket.IO / รีเฟรช
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. เริ่มวิดีโอคอลเมื่อสถานะ confirmed
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
6. บันทึก EMR/สั่งยา/แล็บหลังจบการพบ
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 6 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** EMR จาก AI ต้อง `ai_summary_approved = false` จนแพทย์ตรวจและลงนาม
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
| **Unit tests** | `adminAppointmentManagement` |
| **UI (Playwright)** | Group D, I |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `17_Admin_Appointment_Management` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

