# 📅 Patient Portal — Appointments Page

**Version:** v1.4.7  
**Route:** `/appointments`, `/book-appointment`, `/appointments/:id`  
**Component:** `src/pages/appointments/AppointmentPages.tsx`  
**Access:** 🔒 Authenticated patients  
**Thai Title:** นัดหมายของฉัน / ขอนัดหมายแพทย์ / รายละเอียดนัดหมาย

---

## 1. Purpose

Complete appointment management: view existing appointments, book new ones with AI-assisted symptom analysis, and view appointment details with meeting links.

---

## 2. Three Sub-Pages

### 2.1 Appointment List (`/appointments`)

### 2.2 Book Appointment (`/book-appointment`)

### 2.3 Appointment Detail (`/appointments/:id`)

---

## 3. Appointment List Page

### Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📅 นัดหมายของฉัน (My Appointments)                  [+ นัดหมายใหม่] │
│                                                                     │
│  Filter Tabs:                                                       │
│  [ทั้งหมด] [รอดำเนินการ] [ยืนยันแล้ว] [เสร็จสิ้น]                     │
│                                                                     │
│  Sort: [ล่าสุด ▼]                                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟡 รอดำเนินการ                     21 ม.ค. 2569 09:00       │   │
│  │  นพ. ทดสอบ ระบบ · อายุรกรรม                                   │   │
│  │  อาการ: ปวดหัว มึนงง                                          │   │
│  │  📹 Telehealth                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🟢 ยืนยันแล้ว                       22 ม.ค. 2569 14:00       │   │
│  │  นพ. สมชาย แพทย์ · เวชศาสตร์ทั่วไป                             │   │
│  │  อาการ: ติดตามเบาหวาน                                         │   │
│  │  📹 [คัดลอกลิงก์] [เข้าร่วมประชุม]                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Status Badges

| Status | Thai | Color | Description |
| ------ | ---- | ----- | ----------- |
| pending | รอดำเนินการ | Yellow | Awaiting doctor response |
| confirmed | ยืนยันแล้ว | Green | Doctor confirmed + meeting link |
| completed | เสร็จสิ้น | Blue | Consultation completed |
| cancelled | ยกเลิกแล้ว | Red | Appointment cancelled |
| in_pool | รอจัดสรร | Purple | In appointment pool |
| awaiting_doctor_response | รอแพทย์ตอบรับ | Orange | Assigned, waiting response |
| in_progress | กำลังดำเนินการ | Teal | Meeting in progress |
| no_show | ไม่มา | Gray | Patient didn't attend |
| rescheduled | เลื่อนนัด | Amber | Rescheduled to new time |

### Features

- Filter tabs (pending, all, confirmed, completed)
- Sort by newest/oldest
- Symptom preview on each card
- Meeting link with copy + join buttons for confirmed telehealth
- Click card → navigate to detail page

---

## 4. Book Appointment Page (3-Step Wizard)

### Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📅 ขอนัดหมายแพทย์ (Request Appointment)                            │
│                                                                     │
│  Progress: [1. อาการ ✓] ─── [2. กำหนดเวลา] ─── [3. ยืนยัน]        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │             (Current Step Content)                           │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [← ย้อนกลับ]                                    [ถัดไป →]         │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 1: Symptoms (อาการ) — SymptomInputStep Component

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Input Tabs: [💬 ข้อความ] [🎤 เสียง] [📷 รูปภาพ]                    │
│                                                                     │
│  💬 Text Input Tab:                                                 │
│  ┌──────────────────────────────────────────┐                      │
│  │  Common Symptoms (quick buttons):        │                      │
│  │  [ปวดหัว] [ไข้] [ไอ] [ปวดท้อง] [คลื่นไส้] │                      │
│  │  [ปวดหลัง] [นอนไม่หลับ] [ผื่น] ...       │                      │
│  └──────────────────────────────────────────┘                      │
│  รายละเอียดอาการ:                                                   │
│  [textarea: บอกอาการของคุณ...]                                      │
│                                                                     │
│  🤖 AI Suggestion: "คุณอาจต้องการเพิ่มข้อมูล..." [ใช้คำแนะนำ]       │
│                                                                     │
│  📊 Medical Info Section:                                           │
│  ├── ระยะเวลา: [_] [วัน/สัปดาห์/เดือน]                               │
│  ├── ความรุนแรง: [1] [2] [3] [4] [5]                               │
│  ├── ☐ มีไข้ → อุณหภูมิ: [__]°C                                    │
│  ├── ยาที่ใช้อยู่: [__________]                                      │
│  ├── ประวัติแพ้ยา: [__________]                                      │
│  └── การรักษาก่อนหน้า: [__________]                                  │
│                                                                     │
│  [🤖 วิเคราะห์ด้วย AI]                                              │
│  ┌── AI Analysis Results ──────────────────────┐                   │
│  │  🔴 Triage: Urgent                          │                   │
│  │  💡 Reasoning: ...                          │                   │
│  │  🏠 Self-care: ...                          │                   │
│  │  ⚠️ Warning signs: ...                      │                   │
│  │  ⚕️ Specialty: อายุรกรรม                     │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                     │
│  🎤 Voice Input Tab:                                                │
│  [🔴 Record] → Playback → Transcript display                       │
│                                                                     │
│  📷 Image Input Tab:                                                │
│  [Choose Files] [📷 Camera] → Grid preview (max 5, 10MB each)      │
└─────────────────────────────────────────────────────────────────────┘
```

#### AI Symptom Analysis Features

| Feature | Description |
| ------- | ----------- |
| **Triage Level** | Emergency (red), Urgent (orange), Routine (green), Self-Care (blue) |
| **AI Reasoning** | Explanation of triage decision |
| **Self-Care Tips** | Recommendations if appropriate |
| **Warning Signs** | Red flags to watch for |
| **Suggested Specialty** | AI-recommended doctor specialty |
| **AI Description** | Improved symptom description suggestion |

### Step 2: Schedule + Doctor (กำหนดเวลา)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ประเภทนัดหมาย:                                                     │
│  [📹 Telehealth] [🏥 In-person]                                    │
│                                                                     │
│  ความเร่งด่วน:                                                      │
│  [🟢 ปกติ] [🟡 เร่งด่วน] [🔴 ฉุกเฉิน]                                │
│                                                                     │
│  📅 เลือกวันที่ (14-day grid):                                       │
│  [21] [22] [23] [24] [25] [26] [27]                                │
│  [28] [29] [30] [31] [ 1] [ 2] [ 3]                                │
│                                                                     │
│  ⏰ เลือกเวลา:                                                      │
│  เช้า:  [08:00] [08:30] [09:00] [09:30] [10:00] [10:30] [11:00]   │
│  บ่าย: [13:00] [13:30] [14:00] [14:30] [15:00] [15:30] [16:00]   │
│  เย็น: [17:00] [17:30] [18:00]                                     │
│                                                                     │
│  👨‍⚕️ เลือกแพทย์:                     [🔍 ค้นหา]                    │
│  ☐ ให้ระบบจัดสรรแพทย์ให้                                             │
│  ┌──────────────────────────────┐                                   │
│  │  นพ. ทดสอบ ระบบ              │                                   │
│  │  อายุรกรรม · ⭐ 4.8          │                                   │
│  │  [เลือกแพทย์]                │                                   │
│  └──────────────────────────────┘                                   │
│                                                                     │
│  🤖 AI แนะนำ: แผนก อายุรกรรม (based on symptoms)                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Confirm (ยืนยัน)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 ตรวจสอบข้อมูลนัดหมาย                                            │
│                                                                     │
│  👨‍⚕️ แพทย์: นพ. ทดสอบ ระบบ (อายุรกรรม)                              │
│  📅 วันที่: 22 มกราคม 2569                                          │
│  ⏰ เวลา: 09:00                                                    │
│  📹 ประเภท: Telehealth                                              │
│  🚨 ความเร่งด่วน: ปกติ                                               │
│                                                                     │
│  อาการ: ปวดหัว มึนงง ประมาณ 3 วัน                                    │
│  🎤 Voice: 1 recording attached                                     │
│  📷 Images: 2 images attached                                       │
│                                                                     │
│  [      ส่งคำขอนัดหมาย      ]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Appointment Detail Page

### Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  [← กลับ]                                                          │
│                                                                     │
│  ┌── Status Banner ──────────────────────────────────────────┐     │
│  │  🟢 ยืนยันแล้ว — แพทย์ยืนยันนัดหมายของคุณแล้ว                │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  👨‍⚕️ Doctor Info:                                                   │
│  นพ. ทดสอบ ระบบ · อายุรกรรม                                         │
│                                                                     │
│  📅 วันที่: 22 มกราคม 2569                                          │
│  ⏰ เวลา: 09:00 - 09:30                                            │
│  📹 ประเภท: Telehealth                                              │
│                                                                     │
│  📝 Symptom Information:                                            │
│  ├── อาการหลัก: ปวดหัว มึนงง                                        │
│  ├── ระยะเวลา: 3 วัน                                                │
│  ├── ความรุนแรง: 3/5                                                │
│  ├── ไข้: ไม่มี                                                      │
│  ├── ยาที่ใช้: Paracetamol                                          │
│  └── AI วิเคราะห์: Routine - อายุรกรรม                               │
│                                                                     │
│  Actions:                                                           │
│  [📆 Add to Google Calendar]                                        │
│  [📹 เข้าร่วมประชุม] (if confirmed telehealth)                      │
│  [📋 คัดลอกลิงก์] (copy meeting link)                               │
│  [👥 เชิญญาติ/เพื่อน] (invite guests)                               │
│  [❌ ยกเลิกนัดหมาย]                                                  │
│                                                                     │
│  ┌── Meeting Link Section (confirmed telehealth only) ──────┐     │
│  │  📹 ลิงก์การประชุม:                                        │     │
│  │  https://meet.jit.si/isara-{roomId}                       │     │
│  │  [📋 คัดลอก] [📹 เข้าร่วม] [👥 แชร์]                      │     │
│  │                                                           │     │
│  │  ⏰ ห้องประชุมจะเปิดก่อนเวลานัด 10 นาที                    │     │
│  │  👥 ญาติ/เพื่อนสามารถเข้าร่วมได้โดยไม่ต้องล็อกอิน          │     │
│  └───────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌── Post-Meeting Results (completed only) ──────────────────┐     │
│  │  📋 ผลการตรวจ:                                             │     │
│  │  ├── วินิจฉัย: ความดันโลหิตสูง ระยะที่ 1                    │     │
│  │  ├── แผนการรักษา: ปรับยา Amlodipine 5mg                   │     │
│  │  ├── ยา: Amlodipine 5mg วันละ 1 เม็ด หลังอาหารเช้า         │     │
│  │  ├── นัดติดตาม: 22 ก.พ. 2569                               │     │
│  │  └── ⚠️ อาการเฝ้าระวัง: ปวดศีรษะรุนแรง, ตาพร่ามัว          │     │
│  │  [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]                        │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Workflows

### Workflow 1: Book New Appointment

```text
Step 1:  Patient clicks "นัดหมายใหม่" from list or dashboard
Step 2:  Step 1 - Enter symptoms via text/voice/image
Step 3:  (Optional) Click "วิเคราะห์ด้วย AI" → POST /api/ai/symptom-triage
Step 4:  AI returns triage level + specialty recommendation
Step 5:  Fill medical info (duration, severity, fever, meds, allergies)
Step 6:  Click "ถัดไป" → Step 2
Step 7:  Select appointment type (telehealth/in-person)
Step 8:  Select urgency level
Step 9:  Select date from 14-day grid
Step 10: Select time slot
Step 11: Select doctor from list OR check "let system assign"
Step 12: Click "ถัดไป" → Step 3
Step 13: Review all details
Step 14: Click "ส่งคำขอนัดหมาย"
Step 15: If doctor selected → POST /api/appointments
Step 16: If no doctor → POST /api/appointment-pool (pool assignment)
Step 17: Success → Redirect to appointment list
Step 18: Notification sent to doctor/admin
```

### Workflow 2: Join Video Meeting (Full Jitsi Lobby Flow)

```text
Step 1:  Patient sees confirmed appointment with 🟢 ยืนยันแล้ว status
Step 2:  Appointment card shows:
         - [📋 คัดลอกลิงก์] (Copy Meeting Link)
         - [📹 เข้าร่วมประชุม] (Join Meeting)
         - [👥 เชิญญาติ/เพื่อน] (Invite Relatives/Friends)
Step 3:  Patient clicks "เข้าร่วมประชุม" → Opens Jitsi Meet in new tab
Step 4:  Jitsi URL format: https://meet.jit.si/{roomName}#{config}
Step 5:  Patient enters LOBBY (ห้องรอ) automatically
         - Shows: "กรุณารอแพทย์อนุมัติเข้าห้องประชุม..."
         - Patient sees own video preview
         - Patient can toggle mic/camera while waiting
Step 6:  Doctor sees patient in lobby → clicks "Admit"
Step 7:  Patient enters meeting room → video consultation begins
Step 8:  During meeting, patient has:
         - ✅ Video (camera on/off toggle)
         - ✅ Audio (microphone on/off toggle)
         - ✅ Text chat (in-meeting chat panel)
         - ✅ Screen share (if needed)
Step 9:  Real-time transcription runs (if enabled by doctor)
Step 10: Doctor ends meeting → Patient sees "การประชุมสิ้นสุดแล้ว"
Step 11: Appointment status changes: in_progress → completed
Step 12: Doctor processes AI summary → validates → creates EMR
Step 13: Patient receives notification: "แพทย์ส่งผลการตรวจ"
```

### Workflow 3: Share Meeting Link with Relatives/Friends (Guest Invite)

```text
Step 1:  Patient views confirmed appointment with meeting link
Step 2:  Clicks "👥 เชิญญาติ/เพื่อน" (Invite Relatives/Friends)
Step 3:  Share dialog appears with options:
         - 📋 Copy link to clipboard
         - 📱 Share via LINE
         - ✉️ Share via email
         - 📲 Share via SMS
Step 4:  Guest receives meeting link (no login required)
Step 5:  Guest clicks link → Enters Jitsi LOBBY
Step 6:  Doctor sees guest in lobby → admits them
Step 7:  Guest joins meeting as observer (video + audio + chat)

Note: Guests do NOT need an Isara account.
      Guests do NOT have access to medical records.
      The meeting link is valid only for the scheduled appointment time.
      Maximum 5 guests per meeting.
```

### Workflow 4: Post-Meeting Results (What Patient Receives)

```text
Step 1:  After meeting ends, doctor completes consultation:
         - AI generates meeting summary from transcription
         - Doctor validates and edits summary
         - Doctor creates EMR record
Step 2:  Patient receives the following (patient-friendly Thai format):
         ✅ Chief complaint and diagnosis (ภาษาไทยที่เข้าใจง่าย)
         ✅ Treatment plan summary (แผนการรักษา)
         ✅ Medications with instructions (ยาและวิธีกินยา)
         ✅ Patient Instruction Sheet PDF (เอกสารคำแนะนำผู้ป่วย)
         ✅ Follow-up schedule (กำหนดนัดติดตาม)
         ✅ Warning signs to watch for (อาการที่ต้องเฝ้าระวัง)
Step 3:  Patient does NOT receive:
         ❌ Internal doctor notes (บันทึกภายในของแพทย์)
         ❌ Raw AI outputs (ข้อมูลดิบจาก AI)
         ❌ Doctor-to-doctor communications
         ❌ CDS alerts (การแจ้งเตือนสนับสนุนการตัดสินใจทางคลินิก)
Step 4:  Results appear in:
         - 📊 Dashboard → Latest Result widget
         - 📋 Timeline → Treatment History entry
         - 💊 PHR → Health Logs
Step 5:  Patient can download Patient Instruction Sheet as PDF:
         - Click "📥 ดาวน์โหลดเอกสารคำแนะนำ"
         - PDF in Thai with: diagnosis, medications, instructions,
           follow-up date, warning signs
Step 6:  Appointment card status updates to 🔵 เสร็จสิ้น (Completed)
         with link: [ดูผลการรักษา] (View Results)
```

### Workflow 5: Cancel Appointment

```text
Step 1: Patient views appointment detail
Step 2: Clicks "ยกเลิกนัดหมาย" (Cancel)
Step 3: Confirmation dialog appears
Step 4: Patient confirms → PATCH /api/appointments/:id
Step 5: Status changes to "cancelled"
Step 6: Notification sent to doctor
```

---

## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List patient's appointments |
| GET | `/api/appointments/:id` | Get appointment details |
| POST | `/api/appointments` | Create new appointment |
| PATCH | `/api/appointments/:id` | Update/cancel appointment |
| POST | `/api/appointment-pool` | Submit to unassigned pool |
| GET | `/api/doctors` | List available doctors |
| GET | `/api/appointments/:id/meeting-link` | Get meeting link for confirmed appointment |
| POST | `/api/appointments/:id/share-link` | Generate shareable guest link |
| GET | `/api/appointments/:id/results` | Get post-meeting consultation results |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/emr-summary` | Get patient-friendly EMR summary |

---

## 8. Meeting Technology

| Component | Detail |
| --------- | ------ |
| **Video Platform** | Jitsi Meet (FREE, meet.jit.si) |
| **Lobby** | Enabled — patient waits until doctor admits |
| **Guest Access** | Via shared link, no login required |
| **Max Guests** | 5 per meeting (relatives/friends) |
| **Features** | Video, audio, text chat, screen share |
| **Recording** | Not recorded (privacy) |
| **Transcription** | Real-time AI transcription (doctor-side) |
| **Patient Portal** | Port 3005 |
| **Data Storage** | PostgreSQL |

---

## 9. Patient Data Privacy in Meetings

| What Patient RECEIVES | What Patient Does NOT Receive |
| --------------------- | ----------------------------- |
| ✅ Chief complaint & diagnosis (patient-friendly Thai) | ❌ Internal doctor notes |
| ✅ Treatment plan summary | ❌ Raw AI outputs |
| ✅ Medications with instructions (วิธีกินยา) | ❌ Doctor-to-doctor communications |
| ✅ Patient Instruction Sheet (PDF, Thai) | ❌ CDS alerts (internal clinical decision support) |
| ✅ Follow-up schedule | ❌ AI confidence scores |
| ✅ Warning signs to watch for | ❌ Billing/insurance internal codes |
| POST | `/api/ai/symptom-triage` | AI symptom analysis |
| POST | `/api/ai/symptom-suggest` | AI description improvement |

---

## 8. Connections to Other Pages

| From | Action | Destination |
| ---- | ------ | ----------- |
| Dashboard | Quick Action | → Book Appointment |
| Appointment List | Click card | → Appointment Detail |
| Appointment Detail | Join Meeting | → Jitsi Meet (external) |
| Appointment Detail | Add to Calendar | → Google Calendar (external) |
| Notification | Click notification | → Appointment Detail |

---

## 9. AI Agent Improvement Opportunities

- **Smart symptom interview**: AI conversational symptom gathering
- **Auto-schedule optimization**: AI find optimal time based on urgency + doctor availability
- **Waiting time prediction**: AI estimate wait time for each doctor
- **Follow-up booking**: AI auto-suggest follow-up appointments after consultation
- **Multilingual symptom input**: AI translate symptoms from any language
- **Image diagnosis**: AI preliminary analysis of uploaded medical images
