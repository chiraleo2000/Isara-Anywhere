# Izara Telemedicine - UI Pages & Workflows

**Version:** 1.5.7  
**Last Updated:** March 15, 2026  
**Status:** Phase 1 Implementation

---

## 📋 Overview

This document provides comprehensive UI/UX specifications for all pages across the Izara Telemedicine platform, covering three user types across two portals.

### Portal Structure

| Portal | URL | User Types |
| -------- | ----- | ------------ |
| **Patient Portal** | localhost:3005 | Patient |
| **Doctor Portal** | localhost:3010 | Doctor, Admin |

### User Role Matrix

| Feature | Patient | Doctor | Admin |
| --------- | --------- | -------- | ------- |
| View Dashboard | ✅ | ✅ | ✅ |
| Book Appointments | ✅ | ❌ | ❌ |
| Conduct Meetings | Join Only | Host | Host |
| Manage EMR | View Summary | Full CRUD | Full CRUD |
| AI Chat Assistant | Basic | Full | Full |
| Approve Content | ❌ | ❌ | ✅ |
| Manage Doctors | ❌ | ❌ | ✅ |

---

## 🏥 DOCTOR PORTAL

## Doctor Portal Navigation Structure

```text
Doctor Portal (localhost:3010)
├── 📊 แดชบอร์ด (Dashboard)
├── 📅 ตารางนัดหมาย (Appointment Schedule)
├── 👥 ผู้ป่วย (Patients)
├── 🎥 นัดหมาย & ประชุม (Appointments & Meetings)
├── 👨‍⚕️ ที่ปรึกษาแพทย์ (Medical Consultants)
├── 📚 เนื้อหาทางการแพทย์ (Medical Content)
├── 📋 ทรัพยากรทางคลินิก (Clinical Resources)
├── [Admin Only] 👥 จัดการแพทย์ (Manage Doctors)
└── [Admin Only] ✅ อนุมัติแพทย์ใหม่ (Approve New Doctors)
```

---

## 1. แดชบอร์ด (Dashboard)

**Route:** `/dashboard`  
**Access:** Doctor, Admin  
**Component:** `DoctorDashboard.tsx`

### Purpose

Central hub displaying today's appointments, pending tasks, notifications, and quick access to AI assistance.

### UI Layout

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🏥 Izara Doctor Portal                    🔔(3)  👤 Dr. Test  ⚙️      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  สวัสดี, นพ. ทดสอบ ระบบ                              วันอังคารที่ 21 ม.ค. │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  📅 นัดหมายวันนี้  │  │  ⏳ รอดำเนินการ  │  │  ✅ เสร็จสิ้นแล้ว │          │
│  │       5         │  │       2         │  │       12        │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📋 นัดหมายถัดไป                                                   │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  🟢 09:00  นายสมชาย มั่นคง - เบาหวาน Follow-up                    │   │
│  │           [ดูประวัติ] [AI สรุปก่อนพบ] [เริ่มประชุม]                  │   │
│  │                                                                    │   │
│  │  🟡 10:30  นายอนันต์ ขยันเรียน - เบาหวาน + CKD                     │   │
│  │           [ดูประวัติ] [AI สรุปก่อนพบ] [เริ่มประชุม]                  │   │
│  │           ⚠️ CDS Alert: ปรับยา Metformin สำหรับ eGFR 38           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🤖 AI Assistant            │  │  📄 เอกสารรอตรวจสอบ              │   │
│  │  ─────────────────────────  │  │  ─────────────────────────────  │   │
│  │  💬 "มีอะไรให้ช่วยครับ?"     │  │  • EMR สรุป AI (2)              │   │
│  │  [เริ่มสนทนา]               │  │  • คำแนะนำผู้ป่วย (1)            │   │
│  │                             │  │  • ผลวิเคราะห์เอกสาร (3)         │   │
│  │  📊 วิเคราะห์เอกสาร         │  │  [ดูทั้งหมด]                     │   │
│  │  [อัปโหลด PDF/Lab]          │  │                                  │   │
│  └─────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Actions & Buttons

| Button | Action | Backend API |
| -------- | -------- | ------------- |
| **ดูประวัติ** (View History) | Opens patient record viewer modal | `GET /api/patients/:id` |
| **AI สรุปก่อนพบ** (AI Pre-Summary) | Generates AI pre-consultation summary | `POST /api/ai/pre-consultation-summary` |
| **เริ่มประชุม** (Start Meeting) | Opens Jitsi meeting as HOST | `POST /api/meetings/start` |
| **เริ่มสนทนา** (Start Chat) | Opens AI Chat Assistant panel | Opens sidebar |
| **อัปโหลด PDF/Lab** | Opens document upload modal | `POST /api/ai/analyze-document` |
| **ดูทั้งหมด** (View All) | Navigate to pending validations | `/validations` |

### Workflows

#### WF-DASH-001: View AI Pre-Consultation Summary

```text
1. Doctor clicks [AI สรุปก่อนพบ] on appointment card
2. System fetches patient EMR history, PHR, past Q&A
3. AI generates summary with key points
4. Modal displays:
   - Patient demographics
   - Current medications & allergies
   - Recent vital signs
   - Past consultations summary
   - AI-identified concerns/alerts
5. Doctor reviews and closes modal or proceeds to meeting
```

#### WF-DASH-002: CDS Alert Interaction

```text
1. Appointment card shows ⚠️ CDS Alert badge
2. Doctor clicks alert to expand
3. System shows:
   - Alert type (dose adjustment, drug interaction, etc.)
   - Current prescription vs recommended
   - Guideline reference (e.g., KDIGO 2024)
   - Evidence level
4. Actions: [Accept] [Modify] [Reject with reason]
5. Decision logged to cds_logs table
```

---

## 2. ตารางนัดหมาย (Appointment Schedule)

**Route:** `/schedule`  
**Access:** Doctor, Admin  
**Component:** `AppointmentSchedule.tsx`

### Purpose (2)

Calendar view of all appointments with filtering, status management, and quick actions.

### UI Layout (2)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 ตารางนัดหมาย                                     [+ สร้างนัดหมาย]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [วัน] [สัปดาห์] [เดือน]     ◀ มกราคม 2026 ▶      🔍 ค้นหาผู้ป่วย       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ จันทร์ 20  │ อังคาร 21 │  พุธ 22   │ พฤหัส 23 │ ศุกร์ 24  │ เสาร์ 25 │    │
│  ├────────────┼───────────┼───────────┼──────────┼──────────┼─────────┤    │
│  │ 09:00      │ 🟢 09:00  │           │ 10:00    │          │         │    │
│  │ สมชาย     │ Demo Test │           │ อนันต์   │          │         │    │
│  │ [Telehealth]│[Telehealth]│          │[F2F]    │          │         │    │
│  │            │           │           │          │          │         │    │
│  │ 14:00      │ 🟡 10:30  │ 11:00     │          │ 15:00    │         │    │
│  │ ผู้ป่วยใหม่ │ สมชาย     │ นัดติดตาม │          │ ฉุกเฉิน   │         │    │
│  └────────────┴───────────┴───────────┴──────────┴──────────┴─────────┘    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📋 รายละเอียดนัดหมาย - 21 ม.ค. 2026 09:00                        │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  ผู้ป่วย: Demo Test Patient (นายทดสอบ ระบบ)                       │   │
│  │  ประเภท: Telehealth                                               │   │
│  │  อาการ: ปวดหัว ไข้ต่ำ 2 วัน                                        │   │
│  │  สถานะ: 🟢 ยืนยันแล้ว                                              │   │
│  │                                                                    │   │
│  │  [ดูประวัติผู้ป่วย] [AI สรุปก่อนพบ] [เริ่มประชุม] [ยกเลิกนัด]        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Status Legend

| Status | Icon | Thai | Description |
| -------- | ------ | ------ | ------------- |
| Pending | 🟠 | รอยืนยัน | Awaiting doctor confirmation |
| Confirmed | 🟢 | ยืนยันแล้ว | Confirmed, meeting link ready |
| In Progress | 🔵 | กำลังดำเนินการ | Meeting in progress |
| Completed | ✅ | เสร็จสิ้น | Consultation completed |
| Cancelled | ❌ | ยกเลิก | Cancelled by patient/doctor |

### Actions & Buttons (2)

| Button | Action | Backend API |
| -------- | -------- | ------------- |
| **+ สร้างนัดหมาย** | Opens create appointment modal | `POST /api/appointments` |
| **ดูประวัติผู้ป่วย** | Opens patient record viewer | `GET /api/patients/:id` |
| **AI สรุปก่อนพบ** | Generate pre-consultation summary | `POST /api/ai/pre-consultation-summary` |
| **เริ่มประชุม** | Start Jitsi meeting as host | `POST /api/meetings/start` |
| **ยกเลิกนัด** | Cancel appointment with reason | `PUT /api/appointments/:id/cancel` |
| **เลื่อนนัด** | Reschedule appointment | `PUT /api/appointments/:id/reschedule` |

---

## 3. ผู้ป่วย (Patients)

**Route:** `/patients`  
**Access:** Doctor, Admin  
**Component:** `PatientList.tsx`, `PatientRecordViewer.tsx`

### Purpose (3)

Patient directory with search, filtering, and comprehensive health record viewing.

### UI Layout - Patient List

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  👥 ผู้ป่วย                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔍 ค้นหาผู้ป่วย...          [โรคเรื้อรัง ▼] [สถานะ ▼] [เรียงตาม ▼]     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 👤 รูป │ ชื่อ-นามสกุล      │ อายุ │ โรคประจำตัว    │ นัดล่าสุด   │ ⚡ │   │
│  ├────────┼──────────────────┼──────┼───────────────┼────────────┼────┤   │
│  │  [📷]  │ Demo Test Patient│  40  │ Hypertension  │ 21/01/2026 │ 🔵 │   │
│  │  [📷]  │ สมชาย มั่นคง      │  47  │ DM, HTN      │ 21/01/2026 │ ⚠️ │   │
│  │  [📷]  │ อนันต์ ขยันเรียน  │  35  │ DM, CKD 3b   │ 22/01/2026 │ 🔴 │   │
│  └────────┴──────────────────┴──────┴───────────────┴────────────┴────┘   │
│                                                                          │
│  แสดง 1-3 จาก 3 ราย                                   ◀ 1 ▶              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Risk Indicators

| Icon | Meaning | Condition |
| ------ | --------- | ----------- |
| 🔵 | Low Risk | Normal vitals, no chronic conditions |
| ⚠️ | Moderate Risk | Controlled chronic conditions |
| 🔴 | High Risk | Multiple comorbidities, CDS alerts active |

### Patient Record Viewer (Modal/Page)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  👤 ประวัติผู้ป่วย: นายอนันต์ ขยันเรียน                      [❌ ปิด]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ข้อมูลทั่วไป] [PHR] [EMR] [ผล Lab] [เอกสาร] [Living Will]              │
│                                                                          │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  👤 ข้อมูลผู้ป่วย        │  │  ⚠️ CDS Alerts                       │   │
│  │  ────────────────────  │  │  ────────────────────────────────── │   │
│  │  ชื่อ: อนันต์ ขยันเรียน  │  │  🔴 Metformin dose adjustment      │   │
│  │  อายุ: 35 ปี           │  │     eGFR 38 → ลดขนาด 50%           │   │
│  │  เลือด: B+             │  │     [ดูรายละเอียด]                   │   │
│  │  แพ้ยา: ไม่มี          │  │                                      │   │
│  │  โรคประจำตัว:          │  │  🟡 HbA1c target review             │   │
│  │  - Type 2 DM          │  │     Current: 7.1%, Target: 7-8%     │   │
│  │  - CKD Stage 3b       │  │     [ดูรายละเอียด]                   │   │
│  └────────────────────────┘  └──────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📊 Vital Signs (ล่าสุด)                                          │   │
│  │  BP: 132/85 mmHg  |  HR: 76 bpm  |  Temp: 36.5°C  |  SpO2: 98%   │   │
│  │  Weight: 81.5 kg  |  Height: 170 cm  |  BMI: 28.2               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  💊 ยาปัจจุบัน                                                    │   │
│  │  ─────────────────────────────────────────────────────────────── │   │
│  │  • Metformin 500mg BID ⚠️                                        │   │
│  │  • Losartan 50mg OD                                              │   │
│  │  • Atorvastatin 20mg HS                                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [🤖 AI สรุปประวัติ] [📝 เปิด EMR ใหม่] [📄 อัปโหลดเอกสาร]              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Actions & Buttons (3)

| Button | Action | Backend API |
| -------- | -------- | ------------- |
| **AI สรุปประวัติ** | Generate AI patient summary | `POST /api/ai/patient-summary` |
| **เปิด EMR ใหม่** | Create new EMR for walk-in | `POST /api/emr` |
| **อัปโหลดเอกสาร** | Upload PDF/lab for AI analysis | `POST /api/ai/analyze-document` |
| **ดูรายละเอียด** (CDS) | View CDS recommendation details | Opens CDS modal |

---

## 4. นัดหมาย & ประชุม (Appointments & Meetings)

**Route:** `/appointments`  
**Access:** Doctor, Admin  
**Component:** `AppointmentManagement.tsx`, `MeetingRoom.tsx`

### Purpose (4)

Manage appointment queue, conduct video meetings, document EMR, and generate patient instructions.

### UI Layout - Meeting Room

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🎥 ห้องประชุม - นายสมชาย มั่นคง                    🔴 REC  [ออกจากห้อง]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────┐  │
│  │                                     │  │  📋 EMR Editor (SOAP)    │  │
│  │                                     │  │  ─────────────────────── │  │
│  │         🎥 VIDEO FEED               │  │  [S] ประวัติ (Subjective)│  │
│  │         Jitsi Meet                  │  │  CC: เบาหวาน follow-up   │  │
│  │                                     │  │  HPI: _______________   │  │
│  │                                     │  │                          │  │
│  │  ┌─────────┐  ┌─────────┐           │  │  [O] ตรวจร่างกาย         │  │
│  │  │ 🎤 Mute │  │ 📹 Cam  │  💬 Chat  │  │  VS: BP ___  HR ___     │  │
│  │  └─────────┘  └─────────┘           │  │  PE: _______________    │  │
│  └─────────────────────────────────────┘  │                          │  │
│                                           │  [A] วินิจฉัย            │  │
│  ┌─────────────────────────────────────┐  │  Dx: E11.9 DM Type 2    │  │
│  │  🤖 AI Assistant                    │  │                          │  │
│  │  ─────────────────────────────────  │  │  [P] แผนการรักษา         │  │
│  │  💬 "มีอะไรให้ช่วยครับ?"             │  │  • Continue Metformin   │  │
│  │  ┌─────────────────────────────┐   │  │  • Diet control         │  │
│  │  │ พิมพ์ข้อความ...        [ส่ง]│   │  │  • F/U 3 months         │  │
│  │  └─────────────────────────────┘   │  │                          │  │
│  │                                     │  │  [🤖 AI สรุป EMR]        │  │
│  │  📎 แนบไฟล์ Lab/PDF                 │  │  [💾 บันทึก] [✅ ลงนาม]   │  │
│  └─────────────────────────────────────┘  └──────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Meeting Features (Phase 1)

| Feature | Status | Description |
| --------- | -------- | ------------- |
| Video Call (Jitsi) | ✅ | Doctor as HOST, patient in lobby |
| Audio/Video Controls | ✅ | Mute, camera toggle |
| Text Chat | ✅ | In-meeting chat |
| Screen Share | ✅ | Share screen for education |
| Recording | 🚧 | Record to GCS |
| Transcription | 🚧 | Device Speech-to-Text |
| EMR Editor | ✅ | SOAP format documentation |
| AI Chat Assistant | ✅ | Side panel AI help |
| Document Upload | ✅ | Lab/PDF for AI analysis |

### Post-Meeting Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ สิ้นสุดการประชุม                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📋 สรุป EMR                                    🟡 รอตรวจสอบ       │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  AI สรุป:                                                         │   │
│  │  "ผู้ป่วยเบาหวาน type 2 มาติดตามผล HbA1c ดีขึ้น (7.1%)             │   │
│  │   ควบคุมอาหารได้ดี ไม่มีอาการ hypoglycemia..."                     │   │
│  │                                                                    │   │
│  │  [✏️ แก้ไข]  [✅ อนุมัติ]  [❌ ปฏิเสธ]                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📄 คำแนะนำผู้ป่วย (Patient Instruction)        🟡 รอตรวจสอบ       │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  AI สร้าง:                                                        │   │
│  │  "คำแนะนำหลังพบแพทย์                                               │   │
│  │   1. รับประทานยา Metformin 500mg วันละ 2 ครั้ง หลังอาหาร          │   │
│  │   2. ควบคุมอาหาร ลดแป้ง น้ำตาล                                    │   │
│  │   3. ออกกำลังกาย 30 นาที/วัน..."                                  │   │
│  │                                                                    │   │
│  │  [✏️ แก้ไข]  [✅ อนุมัติ & ส่ง]  [❌ ไม่ส่ง]                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  💊 ใบสั่งยา (Prescription)                                       │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  • Metformin 500mg #60 - 1x2 หลังอาหาร                           │   │
│  │  • Losartan 50mg #30 - 1x1 เช้า                                  │   │
│  │                                                                    │   │
│  │  [✏️ แก้ไขยา]  [🖨️ พิมพ์]  [✅ ยืนยัน]                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [📅 นัดหมายถัดไป]  [เสร็จสิ้น]                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Man-in-the-Loop Validation Flow

```text
1. AI generates content (EMR summary, patient instructions)
2. Content shows 🟡 "รอตรวจสอบ" (Pending Review) badge
3. Doctor reviews content
4. Options:
   a. [✏️ แก้ไข] - Edit inline, then approve
   b. [✅ อนุมัติ] - Approve as-is → 🟢 badge, sent to patient
   c. [❌ ปฏิเสธ] - Reject, provide reason
5. Only ✅ approved content reaches patient
6. Audit log records all decisions
```

---

## 5. ที่ปรึกษาแพทย์ (Medical Consultants)

**Route:** `/consultants`  
**Access:** Doctor, Admin (Admin has full CRUD)  
**Component:** `MedicalConsultants.tsx`

### Purpose (5)

Directory of specialist consultants for referrals and second opinions.

### UI Layout (3)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  👨‍⚕️ ที่ปรึกษาแพทย์                                   [+ เพิ่มที่ปรึกษา]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔍 ค้นหา...                    [สาขา ▼] [โรงพยาบาล ▼] [พร้อมให้คำปรึกษา]│
│                                                                          │
│  ┌───────────────────────┐  ┌───────────────────────┐                   │
│  │  👤 Dr. Wichai        │  │  👤 Dr. Somying       │                   │
│  │  ──────────────────── │  │  ──────────────────── │                   │
│  │  🏥 Bumrungrad        │  │  🏥 Siriraj          │                   │
│  │  🔬 Cardiology        │  │  🔬 Nephrology       │                   │
│  │  📞 02-011-1111       │  │  📞 02-022-2222      │                   │
│  │  ⭐ 4.8 (24 reviews)  │  │  ⭐ 4.9 (18 reviews) │                   │
│  │  🟢 พร้อมให้คำปรึกษา   │  │  🟢 พร้อมให้คำปรึกษา  │                   │
│  │                       │  │                       │                   │
│  │  [📧 Email] [📞 Call] │  │  [📧 Email] [📞 Call] │                   │
│  │  [👁️ ดู] [⭐ Rate]    │  │  [👁️ ดู] [⭐ Rate]   │                   │
│  └───────────────────────┘  └───────────────────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Actions (By Role)

| Action | Doctor | Admin |
| -------- | -------- | ------- |
| View consultant details | ✅ | ✅ |
| Email consultant | ✅ | ✅ |
| Call consultant | ✅ | ✅ |
| Rate/Review | ✅ | ✅ |
| Add new consultant | ❌ | ✅ |
| Edit consultant | ❌ | ✅ |
| Delete consultant | ❌ | ✅ |
| Toggle availability | ❌ | ✅ |

---

## 6. เนื้อหาทางการแพทย์ (Medical Content)

**Route:** `/medical-content`  
**Access:** Doctor, Admin  
**Component:** `MedicalContent.tsx`

### Purpose (6)

Health education articles for patients. Doctors create, admin approves before publishing.

### UI Layout (4)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📚 เนื้อหาทางการแพทย์                               [+ สร้างบทความใหม่]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ทั้งหมด] [เผยแพร่แล้ว] [รอตรวจสอบ (3)] [แบบร่าง] [ปฏิเสธ]             │
│                                                                          │
│  🔍 ค้นหา...                    [หมวดหมู่ ▼] [เรียงตาม ▼]                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📄 การดูแลสุขภาพหัวใจ                                 🟢 เผยแพร่  │   │
│  │  Heart Health Care                                                │   │
│  │  หมวด: cardiovascular | 👁️ 150 views | ✍️ DOC-SPECIALIST-001     │   │
│  │  [👁️ ดู] [✏️ แก้ไข] [🗑️ ลบ]                                       │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  📄 การจัดการโรคเบาหวาน                               🟡 รอตรวจสอบ │   │
│  │  Diabetes Management                                              │   │
│  │  หมวด: endocrinology | ✍️ DOC-TEST-001                           │   │
│  │  [👁️ ดู] [✏️ แก้ไข] [Admin: ✅/❌]                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Content Workflow

```text
1. Doctor creates article (Draft)
2. Doctor submits for review → Status: Pending
3. Admin reviews content
4. Admin: Approve → Status: Published (visible to patients)
   Admin: Reject → Status: Rejected (with feedback)
5. Published content syncs to Patient Portal health library
```

---

## 7. ทรัพยากรทางคลินิก (Clinical Resources)

**Route:** `/clinical-resources`  
**Access:** Doctor, Admin  
**Component:** `ClinicalResources.tsx`

### Purpose (7)

Medical guidelines, protocols, and research papers for healthcare professionals only.

### Categories

| Category | Thai | Description |
| ---------- | ------ | ------------- |
| diagnosis | แนวทางการวินิจฉัย | Diagnosis guidelines |
| treatment | แนวทางการรักษา | Treatment protocols |
| pharmacology | เภสัชวิทยา | Drug information |
| emergency | เวชศาสตร์ฉุกเฉิน | Emergency protocols |

### UI Similar to Medical Content

Same layout as Medical Content but:

- Only visible to doctors
- Includes guideline year and source
- References medical guidelines (KDIGO, ADA, etc.)

---

## 8. จัดการแพทย์ (Manage Doctors) - Admin Only

**Route:** `/admin/doctors`  
**Access:** Admin only  
**Component:** `ManageDoctors.tsx`

### Purpose (8)

View all doctors, manage accounts, and handle administrative tasks.

### UI Layout (5)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  👥 จัดการแพทย์                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ทั้งหมด] [ใช้งาน] [ระงับ] [ไม่ใช้งาน]           🔍 ค้นหา...           │
│                                                                          │
│  ┌──────┬────────────────┬─────────────┬──────────┬────────┬─────────┐  │
│  │ รูป  │ ชื่อ-นามสกุล    │ สาขา        │ โรงพยาบาล │ สถานะ  │ การจัดการ│  │
│  ├──────┼────────────────┼─────────────┼──────────┼────────┼─────────┤  │
│  │ [📷] │ Doctor Test    │ Internal Med│ Izara MC │ 🟢 ใช้งาน│ [⚙️]    │  │
│  │ [📷] │ Specialist Test│ Cardiology  │ Heart Ctr│ 🟢 ใช้งาน│ [⚙️]    │  │
│  └──────┴────────────────┴─────────────┴──────────┴────────┴─────────┘  │
│                                                                          │
│  [⚙️] Actions: [ดูโปรไฟล์] [แก้ไข] [ระงับ] [ลบ]                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. อนุมัติแพทย์ใหม่ (Approve New Doctors) - Admin Only

**Route:** `/admin/pending-doctors`  
**Access:** Admin only  
**Component:** `PendingDoctorApproval.tsx`

### Purpose (9)

Review and approve/reject new doctor registration requests.

### UI Layout (6)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ อนุมัติแพทย์ใหม่                                      🔴 รอดำเนินการ: 2│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  👤 นพ. ใหม่ ลงทะเบียน                              📅 20/01/2026   │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  📧 new.doctor@hospital.com                                       │   │
│  │  🏥 โรงพยาบาลรัฐ                                                  │   │
│  │  🔬 อายุรศาสตร์                                                   │   │
│  │  📜 ใบอนุญาต: กว. 12345                                          │   │
│  │  📄 เอกสารแนบ: [ใบปริญญา.pdf] [ใบอนุญาต.pdf]                      │   │
│  │                                                                    │   │
│  │  [👁️ ดูรายละเอียด]  [✅ อนุมัติ]  [❌ ปฏิเสธ]                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Approval Workflow

```text
1. New doctor registers via Doctor Portal
2. Status: Pending → appears in admin queue
3. Admin reviews:
   - Credentials
   - License documents
   - Hospital affiliation
4. Admin decides:
   a. [✅ อนุมัติ] → Status: Approved, doctor can login
   b. [❌ ปฏิเสธ] → Status: Rejected, with reason
5. Doctor receives email notification
```

---

## 👤 PATIENT PORTAL

## Patient Portal Navigation Structure

```text
Patient Portal (localhost:3005)
├── 🏠 หน้าหลัก (Home/Dashboard)
├── 📅 นัดหมาย (Appointments)
├── 🤖 ปรึกษา AI (AI Consultation)
├── 📚 คลังความรู้สุขภาพ (Health Knowledge Library)
├── 📋 ประวัติสุขภาพ (Health Records/PHR)
├── 🛤️ เส้นทางสุขภาพ (Health Timeline)
├── 📜 PDPA & Living Will
├── 🗺️ แผนที่ (Map)
└── ⚙️ ตั้งค่า (Settings)
```

---

## 1. หน้าหลัก (Home/Dashboard)

**Route:** `/` or `/home`  
**Access:** Patient  
**Component:** `PatientDashboard.tsx`

### Purpose (10)

Overview of health status, upcoming appointments, and quick actions.

### UI Layout (7)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🏥 Izara Patient Portal                        🔔(2)  👤 Demo Test  ⚙️  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  สวัสดี, คุณทดสอบ ระบบ 👋                                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  📅 นัดหมายถัดไป                                                  │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  🟢 วันนี้ 09:00 - นพ. ทดสอบ ระบบ                                 │    │
│  │     อายุรศาสตร์ | Telehealth                                      │    │
│  │     [ดูรายละเอียด]  [เข้าห้องประชุม]                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │  💊 ยาของฉัน         │  │  📊 สัญญาณชีพล่าสุด  │                       │
│  │  ─────────────────  │  │  ─────────────────  │                       │
│  │  • Amlodipine 5mg   │  │  BP: 120/80        │                       │
│  │  • Metformin 500mg  │  │  HR: 72 bpm        │                       │
│  │  [ดูทั้งหมด]         │  │  [บันทึกใหม่]        │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  📄 เอกสารคำแนะนำจากแพทย์                                         │    │
│  │  ──────────────────────────────────────────────────────────────  │    │
│  │  📋 คำแนะนำหลังพบแพทย์ (14/01/2026)                 [ดู] [⬇️ PDF] │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  🤖 มีคำถามเรื่องสุขภาพ?  [ปรึกษา AI]                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Actions & Buttons (4)

| Button | Action | Backend API |
| -------- | -------- | ------------- |
| **ดูรายละเอียด** | View appointment details | `GET /api/appointments/:id` |
| **เข้าห้องประชุม** | Join Jitsi meeting (lobby) | Opens Jitsi URL |
| **ดูทั้งหมด** (medications) | Navigate to PHR page | `/phr` |
| **บันทึกใหม่** (vitals) | Open vital signs form | Opens modal |
| **ดู** (instruction) | View patient instruction | Opens PDF viewer |
| **⬇️ PDF** | Download patient instruction | Downloads PDF |
| **ปรึกษา AI** | Navigate to AI chat | `/ai-chat` |

---

## 2. นัดหมาย (Appointments)

**Route:** `/appointments`  
**Access:** Patient  
**Component:** `PatientAppointments.tsx`

### Purpose (11)

View, book, and manage appointments.

### UI Layout (8)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 นัดหมาย                                           [+ นัดหมายใหม่]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ทั้งหมด] [ที่จะถึง] [เสร็จสิ้น] [ยกเลิก]                               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📅 21 ม.ค. 2026 | 09:00                           🟢 ยืนยันแล้ว   │   │
│  │  ──────────────────────────────────────────────────────────────  │   │
│  │  👨‍⚕️ นพ. ทดสอบ ระบบ                                               │   │
│  │  🏥 Izara Medical Center | อายุรศาสตร์                            │   │
│  │  📍 Telehealth                                                    │   │
│  │  📝 อาการ: ปวดหัว ไข้ต่ำ                                           │   │
│  │                                                                    │   │
│  │  [ดูรายละเอียด]  [เข้าห้องประชุม]  [เลื่อนนัด]  [ยกเลิก]             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📅 14 ม.ค. 2026 | 10:00                           ✅ เสร็จสิ้น    │   │
│  │  ──────────────────────────────────────────────────────────────  │   │
│  │  👨‍⚕️ นพ. ทดสอบ ระบบ                                               │   │
│  │  วินิจฉัย: J00 หวัด                                               │   │
│  │                                                                    │   │
│  │  [ดู EMR สรุป]  [ดูคำแนะนำ]  [นัดติดตาม]                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Book New Appointment Flow

```text
1. Patient clicks [+ นัดหมายใหม่]
2. Step 1: Select specialty/doctor
3. Step 2: Select date/time from available slots
4. Step 3: Describe symptoms
5. Step 4: Select appointment type (Telehealth/In-person)
6. Step 5: Confirm & submit
7. Status: Pending → waiting for doctor confirmation
8. When confirmed: Patient receives notification + meeting link
```

---

## 3. ปรึกษา AI (AI Consultation)

**Route:** `/ai-chat`  
**Access:** Patient  
**Component:** `AIChatPage.tsx`

### Purpose (12)

AI health assistant for basic health questions and symptom checking.

### UI Layout (9)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🤖 ปรึกษา AI                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⚠️ หมายเหตุ: AI นี้ให้ข้อมูลเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยโรค       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                    │   │
│  │  🤖 สวัสดีครับ! ผมคือผู้ช่วย AI ด้านสุขภาพ                          │   │
│  │     มีอะไรให้ช่วยไหมครับ?                                          │   │
│  │                                                                    │   │
│  │  👤 ปวดหัวมา 2 วัน ไข้ต่ำๆ ควรทำอย่างไรดีครับ                       │   │
│  │                                                                    │   │
│  │  🤖 จากอาการที่คุณอธิบาย ขอแนะนำดังนี้:                             │   │
│  │     1. พักผ่อนให้เพียงพอ                                           │   │
│  │     2. ดื่มน้ำมากๆ                                                 │   │
│  │     3. ทานยาพาราเซตามอลเมื่อมีไข้                                  │   │
│  │                                                                    │   │
│  │     หากอาการไม่ดีขึ้นใน 2-3 วัน แนะนำให้พบแพทย์                     │   │
│  │     [📅 นัดหมายแพทย์]                                              │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ พิมพ์ข้อความ...                                      [ส่ง] │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  💡 คำถามแนะนำ:                                                         │
│  [อาการเบื้องต้น] [วิธีดูแลตัวเอง] [เมื่อไหร่ควรพบแพทย์]                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Patient AI Features

| Feature | Description |
| --------- | ------------- |
| Symptom Checker | Basic symptom assessment |
| Health Tips | General health advice |
| Medication Info | Drug information (non-prescriptive) |
| Appointment Suggestion | Recommend when to see doctor |

**Note:** Patient AI is limited compared to Doctor AI. No clinical decision support.

---

## 4. คลังความรู้สุขภาพ (Health Knowledge Library)

**Route:** `/health-library`  
**Access:** Patient  
**Component:** `MedicalContentLibrary.tsx`

### Purpose (13)

Read health education articles created by doctors.

### UI Layout (10)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📚 คลังความรู้สุขภาพ                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🔍 ค้นหาบทความ...                              [หมวดหมู่ ▼]            │
│                                                                          │
│  [ทั้งหมด] [หัวใจ] [เบาหวาน] [สุขภาพทั่วไป] [สุขภาพจิต]                  │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │  ❤️ การดูแลสุขภาพ    │  │  💉 การจัดการโรค     │                       │
│  │     หัวใจ            │  │     เบาหวาน          │                       │
│  │  ────────────────── │  │  ────────────────── │                       │
│  │  หัวใจเป็นอวัยวะ     │  │  เบาหวานเป็นโรค     │                       │
│  │  สำคัญที่...         │  │  เรื้อรังที่...       │                       │
│  │                     │  │                      │                       │
│  │  👁️ 150 | ⭐ 4.8    │  │  👁️ 200 | ⭐ 4.9    │                       │
│  │  [อ่านต่อ]           │  │  [อ่านต่อ]           │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. ประวัติสุขภาพ (Health Records/PHR)

**Route:** `/phr`  
**Access:** Patient  
**Component:** `PHRPage.tsx`

### Purpose (14)

Personal Health Record management - vitals, medications, allergies.

### Tabs

| Tab | Thai | Content |
| ----- | ------ | --------- |
| Overview | ภาพรวม | Summary of health data |
| Vitals | สัญญาณชีพ | Blood pressure, heart rate, etc. |
| Medications | ยา | Current medications |
| Allergies | แพ้ยา/อาหาร | Allergy list |
| Profile | โปรไฟล์ | Personal health profile |

### UI Layout - Vitals Tab

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 ประวัติสุขภาพ                                      [+ บันทึกใหม่]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ภาพรวม] [สัญญาณชีพ] [ยา] [แพ้ยา] [โปรไฟล์]                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📊 ความดันโลหิต (7 วันล่าสุด)                                     │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │      140│    ╭─╮                                                 │   │
│  │         │   ╱   ╲  ╭──╮                                          │   │
│  │      120│──╱─────╲╱────╲────────────────────── target           │   │
│  │         │                                                        │   │
│  │      100│                                                        │   │
│  │         └────────────────────────────────────────                │   │
│  │          15   16   17   18   19   20   21                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📅 วันที่      │ ความดัน   │ ชีพจร  │ น้ำหนัก │ หมายเหตุ          │   │
│  ├─────────────────┼───────────┼───────┼────────┼─────────────────┤   │
│  │  21/01/2026    │ 120/80    │ 72    │ 70.0   │ หลังออกกำลังกาย  │   │
│  │  20/01/2026    │ 118/78    │ 70    │ 69.5   │ -               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. เส้นทางสุขภาพ (Health Timeline)

**Route:** `/health-timeline`  
**Access:** Patient  
**Component:** `HealthTimeline.tsx`

### Purpose (15)

Chronological view of all health events, consultations, and records.

### UI Layout (11)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🛤️ เส้นทางสุขภาพ                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [2026] [2025] [2024]                        🔍 ค้นหา...                 │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                    │   │
│  │  ● 21/01/2026 ─────────────────────────────────────────────────  │   │
│  │  │  📅 นัดหมาย: เบาหวาน follow-up                                 │   │
│  │  │  👨‍⚕️ นพ. ทดสอบ ระบบ                                            │   │
│  │  │  [ดู EMR สรุป]                                                 │   │
│  │  │                                                                │   │
│  │  ● 14/01/2026 ─────────────────────────────────────────────────  │   │
│  │  │  📅 นัดหมาย: หวัด                                              │   │
│  │  │  วินิจฉัย: J00 Acute nasopharyngitis                          │   │
│  │  │  [ดู EMR สรุป] [ดูคำแนะนำ]                                     │   │
│  │  │                                                                │   │
│  │  ● 10/01/2026 ─────────────────────────────────────────────────  │   │
│  │  │  📊 บันทึกสัญญาณชีพ                                            │   │
│  │  │  BP: 122/82 | HR: 74                                          │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. PDPA & Living Will

**Route:** `/pdpa-consent`  
**Access:** Patient  
**Component:** `PDPAConsentPage.tsx`, `LivingWillForm.tsx`

### Purpose (16)

Manage data privacy consent and living will documentation.

### Tabs (2)

| Tab | Content |
| ----- | --------- |
| PDPA Consent | Data sharing preferences |
| Living Will | End-of-life care wishes |

### Living Will Features

- Create/edit living will document
- Treatment preferences (resuscitation, ventilation, etc.)
- Designate healthcare representative
- Share settings (private or share with doctors)
- Digital signature
- Audit trail

---

## 8. แผนที่ (Map)

**Route:** `/map`  
**Access:** Patient  
**Component:** `MapPage.tsx`

### Purpose (17)

Find nearby hospitals, clinics, and pharmacies.

### Features

| Feature | Description |
| --------- | ------------- |
| Location Search | Find by name or address |
| Category Filter | Hospitals, clinics, pharmacies |
| Distance Filter | Within X km |
| Directions | Open in Google Maps |
| Hospital Details | Hours, services, contact |

---

## 9. ตั้งค่า (Settings)

**Route:** `/settings`  
**Access:** Patient  
**Component:** `SettingsPage.tsx`

### Purpose (18)

Account and notification preferences.

### Sections

| Section | Options |
| --------- | --------- |
| Profile | Name, contact, photo |
| Password | Change password |
| Notifications | Email, push, SMS preferences |
| Language | Thai/English |
| Theme | Light/Dark mode |
| Privacy | Data sharing settings |
| Delete Account | Account deletion request |

---

## 🎨 Theme & Internationalization (i18n)

## Overview

The Patient Portal supports both **Dark Mode** and **Multi-language** (Thai/English) throughout all pages and components. These settings are persisted in `localStorage` and applied globally via the `SettingsContext`.

## Dark Mode Implementation

### How It Works

1. **Settings Storage:** Theme preference is stored in `localStorage` as `patient-portal-theme` with values `'light'` or `'dark'`
2. **CSS Class Toggle:** When dark mode is enabled, the `html` element receives the class `dark`
3. **Tailwind Dark Mode:** Uses Tailwind's `class` strategy for dark mode with CSS overrides in `index.css`

### Dark Mode Requirements

All UI components MUST support dark mode. This includes:

| Component Type | Light Mode | Dark Mode |
| ---------------- | ------------ | ----------- |
| **Cards/Boxes** | `bg-white border-gray-100` | `bg-slate-800 border-slate-700` |
| **Text - Primary** | `text-slate-900` | `text-slate-100` |
| **Text - Secondary** | `text-gray-600` | `text-slate-400` |
| **Input Fields** | `bg-white border-gray-300` | `bg-slate-700 border-slate-600` |
| **Buttons (Primary)** | Standard teal/blue | Same with adjusted hover |
| **Modals/Popups** | White background | `bg-slate-800` |
| **Navigation** | Light sidebar | Dark sidebar |

### Implementation Pattern

```tsx
// Use the useSettings hook to get dark mode state
const { isDarkMode } = useSettings();

// Apply conditional classes
<div className={`rounded-xl border ${
  isDarkMode 
    ? 'bg-slate-800 border-slate-700 text-slate-100' 
    : 'bg-white border-gray-100 text-slate-900'
}`}>
  Content here
```

### CSS Override Rules (index.css)

The `index.css` file contains comprehensive dark mode overrides using the `html.dark` selector:

```css
/* Force dark backgrounds on dynamically styled elements */
html.dark .bg-white {
  background-color: rgb(30 41 59) !important; /* slate-800 */
}

html.dark [class*="bg-gradient-to-"] {
  background: linear-gradient(to br, rgb(30 41 59), rgb(51 65 85)) !important;
}
```

## Language/Internationalization (i18n)

### Supported Languages

| Language | Code | Storage Key |
| ---------- | ------ | ------------- |
| Thai | `th` | Default |
| English | `en` | Option |

### How It Works (2)

1. **Settings Storage:** Language preference is stored in `localStorage` as `patient-portal-language`
2. **Translation Function:** The `t(key)` function from `SettingsContext` returns the translated string
3. **Fallback:** If a translation key is missing, the key name is returned

### Translation Keys Structure

```tsx
const translations = {
  th: {
    'dashboard.hello': 'สวัสดี',
    'dashboard.upcomingAppointments': 'นัดหมายที่จะถึง',
    'booking.title': 'นัดหมายปรึกษาแพทย์',
    'phr.vitalSigns': 'สัญญาณชีพ',
    // ... more keys
  },
  en: {
    'dashboard.hello': 'Hello',
    'dashboard.upcomingAppointments': 'Upcoming Appointments',
    'booking.title': 'Book Medical Consultation',
    'phr.vitalSigns': 'Vital Signs',
    // ... more keys
  }
};
```

### Implementation Pattern (2)

```tsx
// Use the useSettings hook to get translation function
const { t, language } = useSettings();

// Use t() function for all user-facing text
<h2 className="text-xl font-bold">
  {t('dashboard.hello')}, {userName}
</h2>

<button>
  {t('booking.next')}
</button>
```

### Required Translation Keys by Page

| Page | Required Keys |
| ------ | --------------- |
| **Dashboard** | `dashboard.hello`, `dashboard.upcomingAppointments`, `dashboard.quickActions` |
| **Booking** | `booking.title`, `booking.symptoms`, `booking.next`, `booking.confirm` |
| **PHR** | `phr.vitalSigns`, `phr.medications`, `phr.allergies`, `phr.conditions` |
| **Library** | `library.title`, `library.search`, `library.categories` |
| **Timeline** | `timeline.title`, `timeline.year`, `timeline.appointment` |
| **PDPA/Living Will** | `pdpa.consent`, `livingWill.title`, `livingWill.signature` |
| **Map** | `map.title`, `map.search`, `map.nearbyHospitals` |
| **Settings** | `settings.title`, `settings.theme`, `settings.language` |

## UX Guidelines

### Theme Toggle

- Toggle location: Settings page AND navigation header
- Icon: ☀️ for light mode, 🌙 for dark mode
- Transition: Use `transition-colors duration-200` for smooth switching

### Language Toggle

- Toggle location: Settings page AND navigation header
- Display: Flag icons or "TH/EN" text toggle
- Instant: Changes should apply immediately without page reload

### Scroll Behavior

When navigating between steps (e.g., in appointment booking):

- Always scroll to top when changing steps
- Use smooth scrolling: `globalThis.scrollTo({ top: 0, behavior: 'smooth' })`

---

## 🔌 Backend API Reference

## Core Endpoints

| Category | Endpoint | Method | Description |
| ---------- | ---------- | -------- | ------------- |
| **Auth** | `/api/auth/login` | POST | User login |
| **Auth** | `/api/auth/logout` | POST | User logout |
| **Appointments** | `/api/appointments` | GET/POST | List/create appointments |
| **Appointments** | `/api/appointments/:id` | GET/PUT/DELETE | Single appointment |
| **Patients** | `/api/patients` | GET | List patients (doctor) |
| **Patients** | `/api/patients/:id` | GET | Patient details |
| **PHR** | `/api/phr/:patientId` | GET/PUT | PHR data |
| **EMR** | `/api/emr` | GET/POST | EMR records |
| **EMR** | `/api/emr/:id` | GET/PUT | Single EMR |
| **Meetings** | `/api/meetings/start` | POST | Start Jitsi meeting |
| **Meetings** | `/api/meetings/:id/join` | GET | Get join URL |

## AI Endpoints (Phase 1)

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/api/ai/chat` | POST | AI chat (doctor) |
| `/api/ai/pre-consultation-summary` | POST | Generate pre-consultation summary |
| `/api/ai/patient-summary` | POST | Generate patient history summary |
| `/api/ai/analyze-document` | POST | Analyze uploaded PDF/lab |
| `/api/ai/emr-summary` | POST | Generate EMR summary |
| `/api/ai/patient-instruction` | POST | Generate patient instruction sheet |

## CDS Endpoints

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/api/cds/check` | POST | Check for CDS alerts |
| `/api/cds/alerts/:patientId` | GET | Get patient CDS alerts |
| `/api/cds/logs` | GET/POST | CDS decision logs |

## Validation Endpoints (Man-in-the-Loop)

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/api/validations/pending` | GET | List pending validations |
| `/api/validations/:id/approve` | POST | Approve AI content |
| `/api/validations/:id/reject` | POST | Reject with reason |
| `/api/validations/:id/edit` | PUT | Edit before approve |

---

## 📊 Database Tables Reference

## Core Tables

| Table | Description |
| ------- | ------------- |
| `users` | All user accounts |
| `doctor_profiles` | Doctor-specific data |
| `patient_profiles` | Patient-specific data |
| `appointments` | Appointment records |
| `emr` | Electronic medical records |
| `phr` | Personal health records |
| `vital_signs` | Vital sign measurements |
| `notifications` | User notifications |

## AI/CDS Tables

| Table | Description |
| ------- | ------------- |
| `knowledge_base` | RAG knowledge entries |
| `ai_chat_history` | Doctor AI chat history |
| `cds_logs` | CDS decision logs |
| `ai_document_analysis` | Document analysis results |
| `patient_instructions` | Generated patient instructions |

---

### End of UI Pages Workflows Documentation v1.0
