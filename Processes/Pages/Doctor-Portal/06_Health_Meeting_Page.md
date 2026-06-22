# 🎥 Doctor Portal — Health Meeting Page

**Route:** `/health-meeting`
**Component:** `frontend/pages/HealthMeeting.tsx`
**Access:** 🔒 Doctor / Admin
**Thai Title:** การประชุมสุขภาพ / Health Meeting
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

Manage patient queue, confirm appointments with meeting links, and launch Jitsi video consultations. Admin-specific features include viewing all appointments and assigning from the pool.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🎥 การประชุมสุขภาพ (Health Meeting)                                 │
│                                                                     │
│  Tabs: [📋 คิวผู้ป่วย (Queue)] [📹 ประชุม (Meetings)]               │
│        [� ผลประชุม (Results)] [📅 ทั้งหมด (All)] ← Admin only      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              (Tab Content Area)                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Tab: Patient Queue (คิวผู้ป่วย)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 คิวผู้ป่วย (Patient Queue)                                       │
│  Sorted by: Urgency (emergency > urgent > normal), then FIFO       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔴 EMERGENCY  นายสมชาย มั่นคง         09:00                │   │
│  │  อาการ: เจ็บหน้าอก รุนแรง                                    │   │
│  │  ประเภท: Telehealth · สถานะ: Pending                         │   │
│  │  [✅ ยืนยัน (Confirm)] [📋 ดูประวัติ]                          │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🟡 URGENT  นายอานันท์ ขยันเรียน        10:30                │   │
│  │  อาการ: ปวดหัวรุนแรง 5 วัน                                   │   │
│  │  ประเภท: Telehealth · สถานะ: In Pool                         │   │
│  │  [✅ ยืนยัน] [🤖 Auto-Assign] [📋 ดูประวัติ]                  │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  🟢 NORMAL  นางสมศรี ดีงาม              14:00                │   │
│  │  อาการ: ติดตามความดันโลหิต                                    │   │
│  │  ประเภท: In-person · สถานะ: Awaiting Response                │   │
│  │  [✅ ยืนยัน] [❌ ปฏิเสธ] [📋 ดูประวัติ]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Queue Controls:                                                    │
│  [📢 เรียกคนถัดไป (Call Next)] [⏭️ ข้าม (Skip)]                    │
└─────────────────────────────────────────────────────────────────────┘
```


### Queue Statuses

| Status | Thai | Description |
| ------ | ---- | ----------- |
| pending | รอดำเนินการ | New appointment request |
| in_pool | รอจัดสรร | In unassigned pool |
| awaiting_doctor_response | รอแพทย์ตอบรับ | Assigned, waiting confirmation |
| assigned | มอบหมายแล้ว | Admin assigned to doctor |



---


## 4. Tab: Scheduled Meetings (ประชุม)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📹 ประชุมที่กำหนด (Scheduled Meetings)                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟢 09:00  นายสมชาย มั่นคง                                   │   │
│  │  Telehealth · ยืนยันแล้ว                                      │   │
│  │  📹 Doctor URL: [Copy] [Open]                                │   │
│  │  📹 Patient URL: [Copy]                                      │   │
│  │  👥 Guest URL: [Copy]                                        │   │
│  │                                                              │   │
│  │  [📹 เริ่มประชุม (Start Meeting)]                             │   │
│  │  [📧 ส่งอีเมลยืนยัน (Send Confirmation Email)]               │   │
│  │  [👥 เชิญผู้เข้าร่วม (Invite Participants)]                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---


### 4a. Tab: Meeting Results (📊 ผลประชุม)

Displays completed meetings with AI-generated SOAP summaries awaiting doctor validation.

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📊 ผลประชุม (Meeting Results)                                       │
│                                                                     │
│  Filter: [🟡 Pending Validation] [✅ Approved] [📋 All]             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟡 PENDING VALIDATION                                      │   │
│  │  👤 นายสมชาย มั่นคง · 22 ม.ค. 2569, 09:00-09:45            │   │
│  │  Duration: 45 min · Participants: 3                         │   │
│  │                                                              │   │
│  │  🤖 AI SOAP Summary (Gemini 2.5 Flash Lite):                │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │  S: ปวดหัว 3 วัน ตื้อๆ บริเวณขมับทั้ง 2 ข้าง            │ │   │
│  │  │  O: BP 130/85, HR 78, Temp 36.5°C                      │ │   │
│  │  │  A: Tension headache (ICD-10: G44.2)                   │ │   │
│  │  │  P: Paracetamol 500mg prn, stress reduction,           │ │   │
│  │  │     follow-up 2 weeks                                   │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  📊 30-Min Sections: [Section 1: 09:00-09:30] [Section 2]   │   │
│  │  📝 Transcript: 127 segments · Chat: 8 messages              │   │
│  │                                                              │   │
│  │  [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]          │   │
│  │  [📋 Open EMR Editor] [📄 View Full Transcript]              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```


#### Meeting Result Card Details

| Field | Description |
| ----- | ----------- |
| Patient Name | Patient who attended the meeting |
| Date/Time | Meeting date and time window |
| Duration | Total meeting duration |
| Participants | Count of all participants (doctor, patient, guests) |
| AI SOAP Summary | Gemini 2.5 Flash Lite generated SOAP format summary |
| 30-Min Sections | For meetings > 30 min, sectioned summaries are generated |
| Transcript Segments | Count of transcript segments captured via Web Speech API |
| Chat Messages | Count of text chat messages captured during meeting |
| Validation Status | 🟡 Pending / ✅ Approved / ✏️ Edited / ❌ Rejected |



---


### 4b. Multi-Party Meeting Invitations

Doctors can invite additional participants to create Microsoft Teams-like multi-party consultations.

```text
┌── Invite Participants ──────────────────────────────────────┐
│                                                              │
│  📹 Meeting: นายสมชาย มั่นคง — 22 ม.ค. 2569, 09:00          │
│                                                              │
│  👨‍⚕️ Doctor Invites (registered doctors/admin):               │
│  [🔍 Search doctor...____________]                           │
│  ├── ✅ พญ.สมศรี (Cardiologist) — Invited                   │
│  └── ➕ Add another doctor                                   │
│                                                              │
│  👥 Patient Guest Invites (relatives/friends):               │
│  Patient can share Guest URL with up to 3 guests             │
│  ├── Guest URL: <https://meet.jit.si/izara-xxxx?guest=1>      │
│  └── 📋 Copy Guest URL                                      │
│                                                              │
│  ⚠️ Non-registered users:                                    │
│  - Enter display name from blank on join                     │
│  - Placed in lobby awaiting doctor approval                  │
│  - Doctor approves/rejects each participant individually     │
│                                                              │
│  [📧 Send Invitations]  [❌ Cancel]                           │
└──────────────────────────────────────────────────────────────┘
```


#### Participant Roles

| Role | Icon | Capabilities | URL Type |
| ---- | ---- | ------------ | -------- |
| Doctor (HOST) | 👨‍⚕️ | Moderator, lobby control, transcript control, mute all | Doctor URL |
| Patient | 🧑 | Video/audio, chat, screen share (limited) | Patient URL |
| Guest (relative/friend) | 👥 | Video/audio, chat only | Guest URL |
| Invited Doctor | 👨‍⚕️ | Video/audio, chat, clinical notes access | Doctor URL |
| Admin | 🔧 | Video/audio, chat, meeting management | Admin URL |



---


### 4c. Man-in-the-Loop Validation Actions

All AI-generated meeting summaries require doctor validation before reaching the patient.

```text
┌── Validation Panel ─────────────────────────────────────────┐
│                                                              │
│  🤖 AI Meeting Summary — นายสมชาย มั่นคง                     │
│  Generated by: Gemini 2.5 Flash Lite                        │
│  Source: Transcript (127 segments) + Chat (8 messages)      │
│  Confidence: 92%                                             │
│                                                              │
│  Actions:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✅ Approve     → Summary sent to EMR Editor as-is      │ │
│  │ ✏️ Edit        → Opens inline editor for modifications │ │
│  │ 🔄 Regenerate  → Re-runs AI pipeline with feedback     │ │
│  │ ❌ Reject      → Discards AI summary, manual entry     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  After Approval:                                             │
│  → 📋 Open EMR Editor (pre-filled with validated summary)   │
│  → 📄 Generate Patient Instruction Sheet                    │
│  → 📧 Notify patient when finalized                         │
│                                                              │
│  Validation History:                                         │
│  [View audit trail of all validation actions]                │
└──────────────────────────────────────────────────────────────┘
```


#### Validation Status Flow

```text
Meeting Ends → AI Pipeline Processes → 🟡 Pending Validation
    ↓
Doctor Reviews Summary
    ↓
┌─────────┬─────────────┬──────────────┬─────────────┐
│ Approve │ Edit        │ Regenerate   │ Reject      │
│    ↓    │    ↓        │    ↓         │    ↓        │
│ ✅ Done │ ✏️ Modified │ 🔄 Re-queued │ ❌ Manual   │
│    ↓    │    ↓        │    ↓         │    ↓        │
│ EMR     │ EMR Editor  │ New AI Pass  │ EMR Editor  │
│ Editor  │ (pre-fill)  │ → Re-review  │ (blank)     │
└─────────┴─────────────┴──────────────┴─────────────┘
```

---


## 5. Appointment Confirmation Flow

```text
┌── Confirm Appointment ──────────────────────────────────────┐
│                                                              │
│  👤 Patient: นายสมชาย มั่นคง                                 │
│  📅 Date: [2569-01-22]                                      │
│  ⏰ Time: [09:00]                                           │
│                                                              │
│  📧 Send confirmation to:                                    │
│  ☑️ Patient (demo.test@gmail.com)                           │
│  ☐ Additional recipients: [________________]                │
│                                                              │
│  [ยืนยันนัดหมาย (Confirm Appointment)]                       │
│                                                              │
│  → System creates Jitsi meeting link                        │
│  → Sends email with meeting details                         │
│  → Patient receives notification                            │
└──────────────────────────────────────────────────────────────┘
```

---


## 6. Jitsi Meeting URL Generation

When doctor confirms an appointment:

| URL Type | Purpose | Recipient |
| -------- | ------- | --------- |
| Doctor URL | Moderator access with lobby control | Doctor |
| Patient URL | Guest access, enters lobby | Patient |
| Guest URL | Guest access for invitees | Relatives/consultants |




### Jitsi Configuration

| Setting | Value |
| ------- | ----- |
| Prejoin Page | Enabled |
| Lobby | Enabled (doctor approves entry) |
| Default Language | Thai (th) |
| Camera | Default ON |
| Microphone | Default ON |
| Recording | Enabled |
| Chat | Always available |



---


## 7. Workflows


### Workflow 1: Confirm Pending Appointment

```text
Step 1: View pending appointment in Queue tab
Step 2: Click "ยืนยัน" (Confirm)
Step 3: Select date/time in confirmation dialog
Step 4: Select email recipients
Step 5: Click "ยืนยันนัดหมาย"
Step 6: PATCH /api/appointments/:id → status: confirmed
Step 7: POST /api/meetings/create → generates Jitsi URLs
Step 8: Confirmation email sent to patient
Step 9: Appointment moves to Meetings tab
```


### Workflow 2: Start Video Meeting

```text
Step 1: Find confirmed appointment in Meetings tab
Step 2: Click "เริ่มประชุม" (Start Meeting)
Step 3: In-app MeetingRoom opens at /doctor/:userId/meeting/:appointmentId (doctor as HOST)
Step 4: Doctor Jitsi iframe mounts; host-present fires on videoConferenceJoined
Step 5: Patient waits in Izara lobby until host-ready
Step 6: Doctor admits patient from lobby panel
Step 7: Consultation begins with live transcription (Web Speech API)
```


### Workflow 3: Admin — Assign from Pool

```text
Step 1: Admin views in_pool appointments
Step 2: Click "Auto-Assign" → AI matches specialty
Step 3: Or manually select doctor from dropdown
Step 4: PATCH /api/appointments/:id → assigned to doctor
Step 5: Doctor receives notification
Step 6: Appointment status: awaiting_doctor_response
```


### Workflow 4: Queue Management

```text
Step 1: Click "เรียกคนถัดไป" (Call Next Patient)
Step 2: Next patient by priority called
Step 3: Or click "ข้าม" (Skip) → Skip reason modal
Step 4: Patient skipped with reason logged
Step 5: Next patient in queue called
```


### Workflow 5: Review Meeting Results (Man-in-the-Loop)

```text
Step 1: Meeting ends → AI pipeline triggered automatically
Step 2: Gemini 2.5 Flash Lite processes: transcript + chat + video metadata
Step 3: AI generates SOAP summary (30-min sections for long meetings)
Step 4: Summary appears in Meeting Results tab with 🟡 Pending status
Step 5: Doctor reviews AI summary content
Step 6: Doctor selects action:
        → ✅ Approve: Summary ready for EMR Editor
        → ✏️ Edit: Modify specific fields inline
        → 🔄 Regenerate: Re-run AI with feedback notes
        → ❌ Reject: Discard, proceed with manual EMR entry
Step 7: POST /api/meetings/:id/validate → Updates validation status
Step 8: Approved content available in EMR Editor pre-filled
```


### Workflow 6: Invite Multi-Party Participants

```text
Step 1: Doctor opens confirmed appointment in Meetings tab
Step 2: Clicks "เชิญผู้เข้าร่วม" (Invite Participants)
Step 3: Search and add other doctors/admin by name or specialty
Step 4: POST /api/meetings/:id/invite → Sends invitation + meeting URL
Step 5: Patient separately shares Guest URL with relatives/friends
Step 6: Non-registered guests create display name on join page
Step 7: All guests enter lobby on meeting day
Step 8: Doctor (HOST) approves/rejects each lobby participant
Step 9: Admitted participants join multi-party video meeting
```


### Workflow 7: Post-Meeting → EMR Editor Flow

```text
Step 1: Doctor approves AI meeting summary (Workflow 5)
Step 2: Clicks "Open EMR Editor" from Meeting Results
Step 3: EMR Editor opens with AI SOAP data pre-filled in tabs:
        → Tab S (Subjective): Chief complaint + HPI from transcript
        → Tab O (Objective): Vital signs + examination findings
        → Tab A (Assessment): AI-suggested diagnoses with ICD-10
        → Tab P (Plan): Treatment plan + follow-up instructions
Step 4: Doctor reviews and edits each tab as needed
Step 5: AI generates Patient Instruction Sheet (ใบแนะนำผู้ป่วย)
Step 6: Doctor validates Patient Instruction Sheet
Step 7: Doctor signs & finalizes EMR
Step 8: Patient receives: EMR summary + Instruction Sheet + Meeting recording
Step 9: Data appears in Patient Dashboard + Timeline + Health History
```

---


## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List queue appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |
| POST | `/api/meetings/create` | Create Jitsi meeting room |
| POST | `/api/appointments/:id/confirm` | Confirm with meeting link |
| GET | `/api/doctors` | List all doctors (admin) |
| POST | `/api/appointments/:id/assign` | Assign doctor (admin) |
| GET | `/api/meetings/:id/results` | Get meeting results with AI summary |
| POST | `/api/meetings/:id/validate` | Validate AI summary (approve/edit/reject) |
| POST | `/api/meetings/:id/regenerate` | Regenerate AI summary with feedback |
| POST | `/api/meetings/:id/invite` | Invite participants to meeting |
| GET | `/api/meetings/:id/participants` | List meeting participants and roles |
| POST | `/api/meetings/:id/lobby` | Approve/reject lobby participants |
| GET | `/api/meetings/pending-validation` | List meetings awaiting validation |
| POST | `/api/meetings/:id/patient-instruction` | Generate Patient Instruction Sheet |



---


## 9. Meeting Technology Stack

| Component | Technology | Cost |
| --------- | ---------- | ---- |
| Video Meeting | Jitsi Meet (meet.jit.si) with lobby | FREE |
| Transcription | Web Speech API (browser-native) | FREE |
| AI Summary | Gemini 2.5 Flash Lite | FREE tier |
| Real-time Streaming | Socket.IO on Meeting Server (port 3020) | Self-hosted |
| Database | PostgreSQL (izara_phase1) | Self-hosted |
| Chat | Jitsi built-in + Socket.IO capture | FREE |



---


## 10. AI Agent Improvement Opportunities


- **Smart queue prioritization**: AI dynamically reprioritize based on clinical urgency

- **Auto-confirmation**: AI auto-confirm standard follow-ups

- **Meeting preparation**: AI prepare room with patient context

- **Wait time notifications**: AI notify patients of estimated wait

- **No-show detection**: AI identify and handle potential no-shows

- **Multi-party scheduling**: AI coordinate availability across multiple doctors

- **Post-meeting auto-routing**: AI auto-route validated summaries to EMR Editor

- **Summary quality scoring**: AI self-assess confidence and flag low-confidence sections

- **Patient instruction personalization**: AI tailor instruction sheets to patient literacy level

---


## PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT/UPDATE | Meeting-linked appointment status management |
| meeting_records | INSERT/UPDATE | Create and update meeting session records |
| meeting_transcripts | INSERT | Store real-time meeting transcripts |
| transcriptions_embeddings | INSERT | Vector embeddings for transcript semantic search |
| emr | INSERT/UPDATE | Auto-generate EMR from meeting summary |
| ai_validations | INSERT | AI validation results for meeting summaries |




### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/meetings/start | POST | INSERT meeting_records; UPDATE appointments SET status |
| POST /api/meetings/:id/end | POST | UPDATE meeting_records SET ended_at; trigger AI summary |
| POST /api/meetings/:id/transcript | POST | INSERT meeting_transcripts; INSERT transcriptions_embeddings |




### Real-time Events

- **NOTIFY:** meeting_changes channel → Socket.IO meeting events


### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **06 Health Meeting** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

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

- `lobby-waiting-screen`
- `admit-all-btn`
- `jitsi-doctor-container`
- `jitsi-guest-container`
- `insert-meeting-summary-emr-btn`

*(รุ่นเอกสารหน้านี้: ENRICH-9 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. แพทย์ (HOST) สร้าง/เปิดห้องประชุมก่อน — ระบบตั้ง `host-ready` ผ่าน Socket.IO (`notifyHostPresent`)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** รอ Socket `host-ready` ก่อน mount Jitsi (Guest/Patient) — ป้องกันหน้าจอว่าง
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. คัดลอก `guestJoinUrl` จาก Patient Portal API (`share-link` / `guest-invite`) — ห้ามแชร์ URL พอร์ทัลแพทย์
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. ผู้ป่วยและ Guest รอใน Izara Lobby (`lobby-waiting-screen` / `guest-lobby-waiting`) — ไม่ใช้ Jitsi lobby บน meet.jit.si
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** รอ Socket `host-ready` ก่อน mount Jitsi (Guest/Patient) — ป้องกันหน้าจอว่าง
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. แพทย์กด Admit รายคน หรือ `admit-all-btn` — ตรวจ badge Guest/Patient บน Meeting Room
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** รอ Socket `host-ready` ก่อน mount Jitsi (Guest/Patient) — ป้องกันหน้าจอว่าง
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. Guest: รอ overlay host-ready แล้ว mount Jitsi (`jitsi-guest-container` เต็มจอ ไม่ซ่อนด้วย h-0)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** รอ Socket `host-ready` ก่อน mount Jitsi (Guest/Patient) — ป้องกันหน้าจอว่าง
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
6. ทุกฝ่ายเข้า Jitsi บน `meet.jit.si` — เปิดกล้อง/ไมค์; ตรวจ CSP `frame-src` / `connect-src`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 6 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
7. ระหว่างประชุม: ส่ง transcript segment (`/transcript`, `guest-transcript-segment`)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 7 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
8. จบประชุม: MediaRecorder → `POST /api/meetings/:id/save-recording` (≤50MB) → path `meetings/{doctorId}/{meetingId}/video.webm`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 8 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** Response ต้องมี `recordingUrl` และ `postMeetingPipeline: queued`
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
9. เรียก `POST /api/meetings/:id/end` — pipeline สรุป AI (Gemini) + Socket `meeting-summary-ready`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 9 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
10. แดชบอร์ดแพทย์: `GET /api/video-meeting/:appointmentId/files` → แท็บ AI Summary / `insert-meeting-summary-emr-btn`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 10 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** EMR จาก AI ต้อง `ai_summary_approved = false` จนแพทย์ตรวจและลงนาม
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
11. ตรวจ `GET /api/meetings/:id/pipeline-status` หากสรุปยังไม่ขึ้น (stage: completed)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 11 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
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
| **Unit tests** | `queueManagementWorkflow, queueSocket.test.ts` |
| **UI (Playwright)** | Group D, E, Q |
| **data-testid** | `end-meeting-btn`, `recording-indicator`, `meeting-results`, `recording-player`, `generate-summary-btn` — [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `06_Health_Meeting_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

**v1.7.49 regression:** Accepted appointments remain in **Recently Accepted** via `GET /api/appointment-pool?includeAccepted=true`. Vitest: `queueLifecycle.integration`, `defectIsaraPdfMeetingQueue` DPDF-Q*. Docker: `npm run test:unit:docker:deploy`.

---

## Detailed Workflow — Patient Queue + Recently Accepted (v1.7.51)

1. Load queue: `GET /api/appointment-pool?includeAccepted=true`  
2. **Pending** section: `data-testid="queue-list"` — statuses `in_pool`, `awaiting_doctor_response`, `pending`, `assigned`  
3. Doctor confirms → row moves to **Recently Accepted**: `data-testid="accepted-queue-list"`  
4. Pool API errors show `data-testid="queue-load-error"` (HTTP 500, not silent empty list)  
5. Confirm via `POST /api/appointments/:id/confirm` sets `doctor_id`, `confirmed_by`, meet links  

