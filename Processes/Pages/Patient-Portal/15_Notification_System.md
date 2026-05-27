# 🔔 Patient Portal — Notification System

**Version:** v1.4.7
**Component:** `src/components/notifications/NotificationBell.tsx`
**Location:** Header (mobile + desktop)
**Access:** 🔒 Authenticated patients


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
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-7** (Word TH Sarabun New 16 pt / PPT FC Iconic / โครงสร้างเทคนิค docs/) |
| โครงสร้างเทคนิค (สถาปัตยกรรม) | `docs/TECHNICAL_ARCHITECTURE_WORD_TH.docx`, `docs/TECHNICAL_ARCHITECTURE_PPT_TH.pptx`, `docs/diagrams.drawio` |
| สร้างเอกสารโครงสร้างเทคนิค | `python scripts/build-technical-architecture-docs.py` |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

---


## 1. Purpose

Real-time notification system providing alerts for appointment updates, meeting links, EMR availability, and system events. Accessible from every page via the header bell icon.

---


## 2. UI Layout

```text
┌── Header ──────────────────────────────────────────────────────────┐
│  ... other header items ...    🔔(3)    ...                         │
│                                 │                                   │
│                                 ▼                                   │
│  ┌─ Notification Panel ──────────────────────────────────────┐     │
│  │  🔔 การแจ้งเตือน                      [อ่านทั้งหมด]        │     │
│  │                                                           │     │
│  │  ┌── Unread ──────────────────────────────────────────┐  │     │
│  │  │  🟢 ● นัดหมายได้รับการยืนยัน                        │  │     │
│  │  │  นพ. ทดสอบ ยืนยันนัดหมาย 22 ม.ค. 09:00           │  │     │
│  │  │  [ดูรายละเอียด] [📹 เข้าร่วม] [📆 Calendar]       │  │     │
│  │  │  เมื่อ 5 นาทีที่แล้ว                                │  │     │
│  │  └────────────────────────────────────────────────────┘  │     │
│  │                                                           │     │
│  │  ┌── Read ────────────────────────────────────────────┐  │     │
│  │  │  ✅ เวชระเบียนพร้อมดู                               │  │     │
│  │  │  EMR สำหรับนัดหมาย 20 ม.ค. พร้อมแล้ว               │  │     │
│  │  │  เมื่อ 1 ชั่วโมงที่แล้ว                              │  │     │
│  │  └────────────────────────────────────────────────────┘  │     │
│  │                                                           │     │
│  │  (max 10 shown)                                           │     │
│  │  [ดูการแจ้งเตือนทั้งหมด →]                                 │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────┘
```

---


## 3. Notification Types


### 3.1 Appointment Status Notifications

| Type | Icon | Color | Thai Description |
| ---- | ---- | ----- | ---------------- |
| confirmed | ✅ | Green | แพทย์ยืนยันนัดหมาย (Appointment confirmed with meeting link) |
| declined | ⚠️ | Amber | นัดหมายถูกปฏิเสธ |
| cancelled | ❌ | Red | นัดหมายถูกยกเลิก |
| rescheduled | 🔄 | Orange | นัดหมายถูกเลื่อน (Appointment rescheduled) |
| completed | 📅 | Emerald | นัดหมายเสร็จสิ้น |


### 3.2 Meeting-Related Notifications (Phase 1 — Telehealth)

| Type | Icon | Color | Thai Message | Trigger |
| ---- | ---- | ----- | ------------ | ------- |
| meeting_confirmed | 📹 | Green | แพทย์ยืนยันนัดหมาย — ลิงก์ประชุมพร้อมใช้งาน | Doctor confirms telehealth appointment |
| meeting_reminder_60m | ⏰ | Blue | การนัดหมายจะเริ่มใน 1 ชั่วโมง | 60 minutes before meeting |
| meeting_reminder_15m | 🔔 | Orange | การนัดหมายจะเริ่มใน 15 นาที — เข้าร่วมได้เลย | 15 minutes before meeting |
| meeting_started | 📹 | Teal | แพทย์เปิดห้องประชุมแล้ว — เข้าร่วมเลย | Doctor opens the meeting room |
| meeting_ended | ✅ | Gray | การประชุมสิ้นสุดแล้ว — รอผลการตรวจจากแพทย์ | Meeting ends |


### 3.3 Post-Meeting Result Notifications

| Type | Icon | Color | Thai Message | Trigger |
| ---- | ---- | ----- | ------------ | ------- |
| results_ready | 📋 | Blue | แพทย์ส่งผลการตรวจ — ดูผลการรักษาของคุณ | Doctor completes EMR |
| emr_ready | 📄 | Blue | เวชระเบียนพร้อมดู | EMR record published |
| instruction_sheet_ready | 📝 | Indigo | เอกสารคำแนะนำพร้อมดาวน์โหลด | Instruction sheet PDF generated |
| followup_scheduled | 📅 | Purple | นัดติดตามผลวันที่ {date} กับ {doctor} | Follow-up appointment created |
| medication_prescribed | 💊 | Cyan | แพทย์สั่งยาใหม่ — ดูรายละเอียดยาและวิธีกินยา | New prescription issued |

---


## 4. Features & Actions


### 4.1 Bell Icon

| Feature | Description |
| ------- | ----------- |
| Unread badge | Red circle with count (shows "9+" for >9) |
| Click | Toggle notification panel dropdown |
| Polling | Auto-refresh every 30 seconds |


### 4.2 Notification Panel

| Feature | Description |
| ------- | ----------- |
| Mark all read | "อ่านทั้งหมด" button marks all as read |
| Unread indicator | Green dot + emerald background for unread |
| Relative time | Thai format: "เมื่อสักครู่", "X นาทีที่แล้ว", "X ชั่วโมงที่แล้ว" |
| Action links | Context-specific per notification type |
| Max display | 10 notifications, "view all" link if more |
| Click outside | Closes panel |


### 4.3 Action Links per Type

| Notification Type | Available Actions |
| ----------------- | ----------------- |
| confirmed | View details → `/appointments/:id`, Join meeting (Jitsi), Add to calendar |
| declined | View details → `/appointments/:id` |
| cancelled | View details → `/appointments/:id` |
| rescheduled | View details → `/appointments/:id` |
| meeting_confirmed | [📹 เข้าร่วมประชุม] → Jitsi, [📋 คัดลอกลิงก์] → clipboard, [👥 เชิญญาติ] → share dialog |
| meeting_reminder_60m | [ดูรายละเอียด] → `/appointments/:id` |
| meeting_reminder_15m | [📹 เข้าร่วมประชุม] → Jitsi (direct join) |
| meeting_started | [📹 เข้าร่วมเลย] → Jitsi (direct join, high priority) |
| meeting_ended | [ดูนัดหมาย] → `/appointments/:id` |
| results_ready | [ดูผลการตรวจ] → `/appointments/:id#results` |
| emr_ready | [ดูเวชระเบียน] → EMR detail view |
| instruction_sheet_ready | [📥 ดาวน์โหลด PDF] → direct PDF download |
| followup_scheduled | [ดูนัดหมาย] → `/appointments/:id` |
| medication_prescribed | [ดูรายละเอียดยา] → `/phr#medications` |
| completed | View appointment details |

---


## 5. Workflows


### Workflow 1: Receive Notification

```text
Step 1: Event occurs (e.g., doctor confirms appointment)
Step 2: Notification created in PostgreSQL
Step 3: Next polling cycle (30 seconds) picks up new notification
Step 4: Bell badge count increments
Step 5: Patient clicks bell → Panel shows new notification at top
Step 6: Notification shows with green unread indicator
```


### Workflow 2: Act on Notification

```text
Step 1: Click notification in panel
Step 2: Notification marked as read
Step 3: Action link activated:
        - "ดูรายละเอียด" → Navigate to appointment detail
        - "เข้าร่วม" → Open Jitsi Meet in new tab
        - "Calendar" → Open Google Calendar add URL
Step 4: Panel closes
Step 5: Badge count decreases
```


### Workflow 3: Mark All as Read

```text
Step 1: Click "อ่านทั้งหมด" (Mark All Read)
Step 2: PATCH /api/notifications/{userId}/read-all
Step 3: All notifications lose unread indicator
Step 4: Badge count resets to 0
```


### Workflow 4: Complete Meeting Notification Flow (End-to-End)

```text
──── BOOKING PHASE ────
Step 1:  Patient books appointment → status: pending
         (No notification to patient yet)

Step 2:  Doctor confirms appointment → status: confirmed
         🔔 Notification: "แพทย์ยืนยันนัดหมาย"
         Thai: "นพ. ทดสอบ ระบบ ยืนยันนัดหมาย 22 ม.ค. 2569 เวลา 09:00"
         Actions: [ดูรายละเอียด] [📹 เข้าร่วมประชุม] [📆 Calendar]
         Meeting link included in notification

──── PRE-MEETING PHASE ────
Step 3:  60 minutes before meeting
         🔔 Notification: "การนัดหมายจะเริ่มใน 1 ชั่วโมง"
         Actions: [ดูรายละเอียด]

Step 4:  15 minutes before meeting
         🔔 Notification: "การนัดหมายจะเริ่มใน 15 นาที — เข้าร่วมได้เลย"
         Actions: [📹 เข้าร่วมประชุม] (direct Jitsi link)
         Note: Meeting room lobby opens 10 minutes before scheduled time

──── MEETING PHASE ────
Step 5:  Doctor opens meeting room
         🔔 Notification: "แพทย์เปิดห้องประชุมแล้ว — เข้าร่วมเลย"
         Actions: [📹 เข้าร่วมเลย] (high priority, teal highlight)
         Patient clicks → enters Jitsi LOBBY → waits for doctor admit

Step 6:  Meeting in progress → status: in_progress
         (No notification — patient is in meeting)

Step 7:  Meeting ends → status: completed
         🔔 Notification: "การประชุมสิ้นสุดแล้ว — รอผลการตรวจจากแพทย์"
         Actions: [ดูนัดหมาย]

──── POST-MEETING PHASE ────
Step 8:  Doctor processes AI summary → validates → creates EMR
         🔔 Notification: "แพทย์ส่งผลการตรวจ"
         Thai: "ผลการตรวจสำหรับนัดหมาย 22 ม.ค. 2569 พร้อมแล้ว"
         Actions: [ดูผลการตรวจ]

Step 9:  Patient Instruction Sheet PDF generated
         🔔 Notification: "เอกสารคำแนะนำพร้อมดาวน์โหลด"
         Thai: "เอกสารคำแนะนำผู้ป่วยสำหรับนัดหมาย 22 ม.ค. พร้อมดาวน์โหลด"
         Actions: [📥 ดาวน์โหลด PDF]

Step 10: Follow-up appointment created by doctor
         🔔 Notification: "นัดติดตามผลวันที่ 22 ก.พ. 2569"
         Actions: [ดูนัดหมาย] [📆 Calendar]

Step 11: New prescription issued
         🔔 Notification: "แพทย์สั่งยาใหม่ — ดูรายละเอียดยาและวิธีกินยา"
         Actions: [ดูรายละเอียดยา]
```


### Workflow 5: Meeting Status Change Notifications

```text
Status changes that trigger notifications:

  pending → confirmed
  🔔 "แพทย์ยืนยันนัดหมาย" + meeting link

  confirmed → in_progress
  🔔 "แพทย์เปิดห้องประชุมแล้ว"

  in_progress → completed
  🔔 "การประชุมสิ้นสุดแล้ว"

  completed → results_ready (EMR created)
  🔔 "แพทย์ส่งผลการตรวจ"

  confirmed → cancelled
  🔔 "นัดหมายถูกยกเลิก"

  confirmed → rescheduled
  🔔 "นัดหมายถูกเลื่อน" + new date/time

  patient no-show
  🔔 "คุณพลาดนัดหมาย — กรุณาติดต่อเพื่อนัดหมายใหม่"
```

---


## 6. Relative Time Display (Thai)

| Time Range | Display |
| ---------- | ------- |
| < 1 minute | เมื่อสักครู่ |
| 1-59 minutes | X นาทีที่แล้ว |
| 1-23 hours | X ชั่วโมงที่แล้ว |
| 1+ days | X วันที่แล้ว |

---


## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/notifications/{userId}` | Fetch all notifications |
| GET | `/api/notifications/{userId}?type=meeting` | Fetch meeting-related notifications only |
| PATCH | `/api/notifications/:id/read` | Mark single as read |
| PATCH | `/api/notifications/{userId}/read-all` | Mark all as read |
| POST | `/api/notifications/meeting-reminder` | Trigger meeting reminder (server-side cron) |
| POST | `/api/notifications/results-ready` | Notify patient of available results (triggered by doctor) |

---


## 8. Notification Delivery Channels

| Channel | Used For | Technology |
| ------- | -------- | ---------- |
| **In-App** | All notifications | PostgreSQL + 30-second polling |
| **Email** | Appointment confirmed, results ready, instruction sheet | SMTP / SendGrid |
| **Dashboard Banner** | New results, upcoming meeting reminders | Real-time dashboard widget |

> **Note:** Push notifications (mobile/browser) planned for Phase 2. Phase 1 uses in-app + email only.

---


## 9. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Click appointment notification | → `/appointments/:id` |
| Click meeting join | → Jitsi Meet (external) |
| Click calendar | → Google Calendar (external) |
| View all | → Notifications list page |

---


## 10. AI Agent Improvement Opportunities


- **Priority sorting**: AI rank notifications by importance (meeting starting > results ready > general)


- **Smart batching**: AI group related notifications (e.g., results + instruction sheet + follow-up)


- **Push notifications**: AI determine when to use push vs in-app


- **Predictive alerts**: AI notify before appointment (24h, 1h, 15min) — implemented in Phase 1


- **Natural language summaries**: AI summarize notification clusters


- **Action suggestions**: AI recommend next action based on notification


- **Meeting prep reminders**: AI remind patient to prepare questions before telehealth meeting


- **Result comprehension**: AI explain medical terms in notifications using patient-friendly language


- **Follow-up compliance**: AI track if patient acknowledges results and follows up as scheduled

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| notifications | SELECT / UPDATE | Unread notifications, mark as read |
| push_subscriptions | SELECT | Web push subscription endpoints for delivery |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/notifications | GET | SELECT notifications WHERE patient_id = current ORDER BY created_at DESC |
| /api/notifications/:id/read | PUT | UPDATE notifications SET read = true |


### Real-time Events


- **Socket.IO:**
otification:new → real-time push to connected clients


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **15 Notification System** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

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

- ดู `tests/SELECTORS.md` สำหรับหน้านี้

*(รุ่นเอกสารหน้านี้: ENRICH-7 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เข้าสู่ระบบพอร์ทัลผู้ป่วย
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** ตรวจว่า session มี JWT และไม่ถูก redirect กลับหน้า login
   - **UI หลัก:** ดู `tests/SELECTORS.md` สำหรับหน้านี้
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. เปิดหน้า «15 Notification System» จากเมนูหลัก
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
| **Unit tests** | `notificationWorkflow` |
| **UI (Playwright)** | Group I |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `15_Notification_System` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

