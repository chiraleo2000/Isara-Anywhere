# Izara Telemedicine นัดหมาย Workflows

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `Appointment_Workflows.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`Appointment_Workflows.md`](../Appointment_Workflows.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่


This document details the full นัดหมาย workflow for Izara Telemedicine, covering video consultations, EMR documentation, and AI-assisted post-consultation features. This is the **core Phase 1 deliverable** covering the complete end-to-end flow: นัดหมาย → Approval → Meeting (Microsoft Teams-like) → AI Summary → EMR → ผู้ป่วย Delivery.

**อัปเดตล่าสุด:** June 8, 2026 (Calendar sync on ยืนยัน, 3-party meeting lifecycle, zero-skip local gate)

> **GATE 0:** Assigned แพทย์ confirms and is Jitsi HOST; ผู้ดูแลระบบ assigns only. Pool = PostgreSQL `in_pool` (not GCS). See [`GATE0_IMPLEMENTATION_STATUS.md`](GATE0_IMPLEMENTATION_STATUS.md).
>
> **v1.7.51 (2026-06-08):** Doctor confirm now emits `calendarEventUrl` (Google Calendar TEMPLATE link), populates doctor **Schedule** (`/schedule`) and patient **MiniCalendar** sidebar dots, and runs **3-party** E2E (doctor HOST + patient + guest, 10s A/V hold → recording → Gemini EMR). Local gate: **35 Playwright passed, 0 skipped**; Vitest **2982/2982**.

---

## 📋 ภาพรวม

### Phase 1 Feature Summary

| ฟีเจอร์ | สถานะ | คำอธิบาย |
| --------- | -------- | ------------- |
| **ประชุมวิดีโอ (Jitsi)** | ✅ | แพทย์ as HOST, ผู้ป่วย lobby, guest invites |
| **EMR Documentation** | ✅ | SOAP format during/after meeting |
| **PostgreSQL Database** | ✅ | All data stored in PostgreSQL (NO GCS) |
| **AI Pre-Consultation Summary** | ✅ | AI summarizes ผู้ป่วย history before meeting |
| **AI Chat Assistant** | ✅ | Helps แพทย์ during consultation |
| **ผู้ป่วย Instruction Sheet** | ✅ | Auto-generated post-consultation instructions |
| **Clinical Decision Support** | ✅ | Drug interaction & dose adjustment alerts |
| **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) Validation** | ✅ | แพทย์ approval before AI content goes to ผู้ป่วย |
| **Device Speech-to-Text** | ✅ | Free browser-based dictation (Web Speech API) |
| **Transcript Streaming Control** | ✅ | แพทย์ (HOST) starts/stops real-time transcript during meeting |
| **Chat Integration** | ✅ | In-meeting text chat aggregated into AI summary |
| **Multi-Party Meeting** | ✅ | ผู้ป่วย relatives, friends, other doctors, ผู้ดูแลระบบ can join |
| **Guest Self-Registration** | ✅ | Non-registered users create display name from blank and join lobby |
| **หลังประชุม AI Pipeline** | ✅ | AI summarizes from video input + transcript + chats |
| **ผู้ป่วย Instruction Sheet** | ✅ | Auto-generated post-consultation instructions (Thai PDF) |
| **EMR Auto-Population** | ✅ | AI pre-fills SOAP from meeting transcript + summary |
| **ผู้ป่วย Health History** | ✅ | Relevant EMR parts sent to ผู้ป่วย's Health History page |


### Test Credentials

| Role | Email | Password | Portal |
| ------ | ------- | ---------- | -------- |
| ผู้ป่วย | <demo.test@gmail.com> | P@ssw0rd | localhost:3005 |
| ผู้ป่วย | <Somchai.Mankong@gmail.com> | P@ssw0rd | localhost:3005 |
| ผู้ป่วย | <Anan.Khayanrian@gmail.com> | P@ssw0rd | localhost:3005 |
| แพทย์ | <แพทย์.test@izara.com> | IzaraDoctor@2024 | localhost:3010 |
| ผู้ดูแลระบบ | <ผู้ดูแลระบบ.test@izara.com> | IzaraAdmin@2024 | localhost:3010 |


---

## Meeting Feature Summary ✅

| ฟีเจอร์ | สถานะ | คำอธิบาย |
| --------- | -------- | ------------- |
| แพทย์ as HOST | ✅ | Only แพทย์ can start/control meeting |
| ผู้ป่วย Lobby | ✅ | ผู้ป่วย waits for แพทย์ approval |
| Guest Invites | ✅ | Relatives/consultants via email |
| Guest Lobby | ✅ | All guests wait for แพทย์ approval |
| **External Guest Access** | ✅ | **Non-registered users can join via invite links** |
| Camera (Default ON) | ✅ | `startWithVideoMuted=false` |
| Microphone (Default ON) | ✅ | `startWithAudioMuted=false` |
| Text Chat | ✅ | Always available |
| Video Recording | ✅ | Stored to izara-doctors-data |
| Transcription | ✅ | Google Speech-to-Text |
| AI Summary | ✅ | Gemini AI with 30-min sections |
| พอร์ทัลแพทย์ Delivery | ✅ | Summary in reports |


### Test Users

| Role | Email | Password | Portal |
| ------ | ------- | ---------- | -------- |
| แพทย์ | <แพทย์.test@izara.com> | IzaraDoctor@2024 | localhost:3010 |
| ผู้ป่วย | <demo.test@gmail.com> | P@ssw0rd | localhost:3005 |
| ผู้ป่วย Relative (demo2) | <demo2.test@gmail.com> | P@ssw0rd | localhost:3005 |
| Admin/Unit Test แพทย์ | <doctorunit.test@izara.com> | P@ssw0rd | localhost:3010 |


### External Guest Access (Non-Registered Users) ✅

External guests who are **NOT registered** in the Izara system can join meetings:

| Guest Type | Who Can Invite | Example Emails |
| ------------ | ---------------- | ---------------- |
| ผู้ป่วย Relative | ผู้ป่วย | <mother@gmail.com>, <father@hotmail.com> |
| ผู้ป่วย Partner | ผู้ป่วย | <spouse@outlook.com> |
| แพทย์ Specialist | แพทย์ | <dr.cardio@privatehospital.co.th> |
| แพทย์ Advisor | แพทย์ | <professor@university.ac.th> |
| Other | Both | <any.guest@anydomain.xyz> |


## How External Guests Join

1. Doctor/Patient creates invite → System generates secure token
2. Guest receives invite URL (via email or shared link)
3. Guest clicks link → No login required
4. Guest enters lobby → แพทย์ approves
5. Guest joins meeting with video/audio ON

---

## Production Deployment URLs

| Portal | URL | เวอร์ชัน |
| -------- | ----- | --------- |
| พอร์ทัลผู้ป่วย | <https://izara-ผู้ป่วย-portal-724889190329.asia-southeast1.run.app> | v1.4.4 |
| พอร์ทัลแพทย์ | <https://izara-แพทย์-portal-724889190329.asia-southeast1.run.app> | v1.4.4 |


### Docker Images (v1.4.4)

| Portal | Image |
| -------- | ------- |
| พอร์ทัลผู้ป่วย | `asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-patient-portal:1.4.4` |
| พอร์ทัลแพทย์ | `asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-doctor-portal:1.4.4` |


### Video Meeting Provider

- **Jitsi Meet** (meet.jit.si) - FREE, no account required

- แพทย์ acts as HOST with lobby/moderator controls

- ผู้ป่วย joins via personalized URL

---

## 0. Login & Authentication

- **ผู้ป่วย**
  - Logs in via พอร์ทัลผู้ป่วย (`LoginPage.tsx`)
  - Accesses dashboard, นัดหมาย booking, health logs

- **Doctor/Admin**
  - Logs in via พอร์ทัลแพทย์ (`DoctorDashboard.tsx`)
  - ผู้ดูแลระบบ is also a แพทย์ with elevated privileges
  - ผู้ดูแลระบบ can book/accept/assign นัดหมาย + manage แพทย์ roles

---

## 1. Appointment Booking (Patient Side)

- **Options**
  - System-assigned (ผู้ป่วย chooses "Let system มอบหมาย แพทย์") or specific แพทย์ selection
  - Invite relatives/consultants
  - Choose online (telemedicine) or onsite นัดหมาย

- **Process**
  - ผู้ป่วย fills out symptoms (with AI assistance), preferred date/time, แพทย์ selection, invitees
  - Can attach voice recordings or images for symptom คำอธิบาย
  - AI analyzes symptoms and suggests urgency level + specialty
  - Submits request
  - Backend creates นัดหมาย record:
    - ผู้ป่วย info, แพทย์ preference, invitees, symptoms, requested date/time
    - สถานะ: `pending` (if แพทย์ selected) or `in_pool` (if system-assigned)
    - Type: `online` or `onsite`

---

## 2. Patient Queue - Appointments Awaiting Confirmation

### IMPORTANT: Patient Queue shows ALL pending appointments from ALL dates (not just today)

- **Location**: "นัดหมาย & Meetings" page (`HealthMeeting.tsx`) → ผู้ป่วย Queue tab

- **What appears in ผู้ป่วย Queue**:
  - ALL นัดหมาย with สถานะ: `pending`, `in_pool`, `awaiting_doctor_response`, `assigned`
  - Sorted by: Urgency (emergency → urgent → normal) ต่อด้วย by creation date (FIFO)

- **แพทย์ View**:
  - Sees only นัดหมาย assigned to them
  - Can ยืนยัน or decline นัดหมาย

- **ผู้ดูแลระบบ View**:
  - Sees ALL รอดำเนินการ นัดหมาย (regardless of แพทย์ assignment)
  - Can มอบหมาย unassigned นัดหมาย to doctors
  - Can ยืนยัน นัดหมาย directly

- **Confirmation Process**:
  1. Doctor/Admin clicks "ยืนยัน นัดหมาย" on a queue item
  2. Modal shows: ผู้ป่วย info, requested date/time, AI analysis
  3. Doctor/Admin sets ยืนยันแล้ว date and time (can modify from ผู้ป่วย's request)
  4. Doctor/Admin adds optional notes
  5. On ยืนยัน: Meeting link generated, สถานะ → `confirmed` (row **updated**, never deleted)
  6. **Recently Accepted** section: today's `confirmed` rows remain visible in ผู้ป่วย Queue for traceability (`GET /api/appointment-pool?includeAccepted=true`)

- **State machine** (PostgreSQL `appointments.status`):

```
in_pool → awaiting_doctor_response → confirmed → in_progress → completed
         ↘ declined_by_doctor → in_pool (patient portal may cancel)
```

---

## 3. Doctor/Admin Appointment Confirmation

- **From ผู้ป่วย Queue Tab**:
  - View all รอดำเนินการ นัดหมาย requests
  - See ผู้ป่วย details, symptoms, AI triage, urgency level
  - ยืนยัน with date/time selection
  - Decline with reason

- **Process**:
  1. Doctor/Admin reviews ผู้ป่วย request in queue
  2. Clicks "ยืนยัน นัดหมาย"
  3. Sets final นัดหมาย date and time
  4. **For telehealth นัดหมาย**: System generates Jitsi Meet link automatically
  5. สถานะ: `confirmed`
  6. **การแจ้งเตือน sent**:
     - In-app notification to ผู้ป่วย
     - Email with meeting link (Thai template)
     - Meeting link saved to นัดหมาย record
  7. นัดหมาย moves to "Scheduled Meetings" tab
  8. **ผู้ป่วย can see** meeting link in their นัดหมาย page

- **Meeting Link Generation**:
  - Provider: Jitsi Meet (meet.jit.si)

- Format: `<https://meet.jit.si/Izara-{appointmentId}-{timestamp}-{random}`>
  - No account required for ผู้ป่วย or แพทย์
  - Link is clickable from both portals

- **If Declined**:
  - สถานะ: `declined`
  - Reason recorded
  - ผู้ป่วย notified via email
  - นัดหมาย removed from queue

---

## 4. Scheduled Meetings Tab

### Only CONFIRMED appointments appear here

- **Contents**:
  - นัดหมาย with สถานะ: `confirmed`, `scheduled`
  - Shows: ผู้ป่วย name, date/time, meeting link, symptoms

- **Actions**:
  - Join Meeting (opens Google Meet link)
  - Add to Calendar
  - Send Invite (email to participants)
  - Copy Link

---

## 5. Admin-Only: All Appointments Tab

- **Purpose**: Overview of all นัดหมาย in the system

- **Features**:
  - Search by ผู้ป่วย name/email
  - Filter by สถานะ
  - มอบหมาย unassigned นัดหมาย
  - View complete นัดหมาย history

---

## 6. Notification & Calendar Update (Microsoft Teams / Zoom / Google Meet parity)

When the **assigned แพทย์** confirms a telehealth นัดหมาย via `POST /api/appointments/:id/confirm`, the system performs a full calendar + notification sync (not manual-only).

### 6.1 Backend — Confirm API side effects

| ขั้นตอน | Component | Detail |
|------|-----------|--------|
| 1 | `mainApiServer.cjs` | Sets `status=confirmed`, `confirmed_date/time`, `scheduled_date/time`, Jitsi URLs (`meeting_link`, `doctor_meeting_url`, `patient_meeting_url`, `guest_meeting_url`) |
| 2 | `calendarEventLinks.cjs` | Builds `calendarEventUrl` — Google Calendar `action=TEMPLATE` link with title, Bangkok timezone, 30-min window, meeting link in `location` + `details` |
| 3 | `appointmentMapper.cjs` | `GET /api/appointments` returns camelCase aliases (`appointmentDate`, `doctorId`, `meetingLink`) from snake_case PostgreSQL rows |
| 4 | `GET /api/schedule/:doctorId` | Returns `date` = `COALESCE(confirmed_date, scheduled_date, requested_date, appointment_date)` and `meetingLink` |
| 5 | ผู้ป่วย การแจ้งเตือน | `appointment_confirmed` + `meeting_link_ready` with `data.calendarEventUrl`, `meetingLink`, `confirmedDate`, `confirmedTime` |
| 6 | แพทย์ notification | New type `schedule_entry_ready` — in-app reminder with same `calendarEventUrl` + ผู้ป่วย label |

**ยืนยัน response JSON:**

```json
{
  "success": true,
  "appointment": { "id": "...", "appointmentDate": "2026-06-10", "meetingLink": "https://meet.jit.si/izara-..." },
  "meetingLink": "https://meet.jit.si/izara-...",
  "calendarEventUrl": "https://calendar.google.com/calendar/render?action=TEMPLATE&..."
}
```

### 6.2 Doctor portal — Schedule page (`/schedule`)

| UI element | File | Behavior |
|------------|------|----------|
| Route | `DoctorPortal.tsx` → `schedule/CompleteSchedule.tsx` | Canonical component (re-export from `pages/CompleteSchedule.tsx`) |
| Data load | `fetchAllAppointments()` → `GET /api/appointments` | Filter: `doctor_id` / `doctorId` match + สถานะ `confirmed` \| `scheduled` |
| Date/time | `resolveAppointmentSchedule.ts` | Reads `confirmed_date`, `scheduled_date`, `requested_date` (camelCase or snake_case) |
| Today list | Day view | `data-testid="schedule-appointment-{id}"` |
| Join link | Telehealth rows | `data-testid="schedule-meeting-link"` → opens Izara ประชุมวิดีโอ |
| Month view | Emerald dot on days with นัดหมาย | `data-testid="schedule-month-appointment-day"` |
| Page root | — | `data-testid="doctor-schedule-page"` |

**User flow after ยืนยัน:**

```text
Doctor confirms in Health Meeting / Patient Queue
  → Appointment appears on /schedule (today + upcoming)
  → Month grid shows dot on confirmed_date
  → "Join Video Meeting" uses stored meeting_link
  → Optional: open calendarEventUrl from schedule_entry_ready notification
```

### 6.3 Patient portal — Calendar surfaces

| Surface | File | Behavior |
|---------|------|----------|
| Sidebar MiniCalendar | `components/MainLayout.tsx` | Fetches `appointmentService.getByPatient()`; highlights days with `confirmed`/`scheduled` appointments (`data-testid="mini-calendar-appointment-day"`) |
| นัดหมาย list | `AppointmentPages.tsx` | ยืนยันแล้ว tab shows telehealth with join button |
| นัดหมาย detail | `AppointmentPages.tsx` | Auto "Add to Calendar" via `calendarEventUrl` from notification or `buildCalendarEventUrl.ts` fallback (`data-testid="appointment-calendar-link"`) |
| Dashboard | `DashboardPage.tsx` | Upcoming นัดหมาย widget + join when `status=confirmed` && `type=telehealth` |

### 6.4 Notification channels on confirm

| Recipient | Type | Channels | Payload highlights |
|-----------|------|----------|-------------------|
| ผู้ป่วย | `appointment_confirmed` | in-app (+ email if configured) | `calendarEventUrl`, `meetingLink`, `appointmentId` |
| ผู้ป่วย | `meeting_link_ready` | in-app | Same + `meet_link` alias |
| แพทย์ | `schedule_entry_ready` | in-app | `calendarEventUrl`, `patientId`, ยืนยันแล้ว date/time |

### 6.5 E2E verification (local Docker gate)

| Test | ขั้นตอน | Assertion |
|------|------|-----------|
| `group-D` **D4cal** | After D4a confirm | Patient notification `data.calendarEventUrl` present; doctor `/schedule` shows `schedule-appointment-{id}` + `schedule-meeting-link`; patient sidebar may show `mini-calendar-appointment-day` |
| Unit **DPDF-CAL1/CAL2** | `defectIsaraPdfMeetingQueue.test.ts` | `buildTelehealthCalendarUrl` + `mapAppointmentForClient` |
| Unit | `calendarEventLinks.test.ts`, `appointmentMapper.test.ts` | URL format + field mapping |

### 6.6 Relatives / guests / admin

- **Relatives/Consultants:** Guest invite links (token) separate from calendar; join via lobby after แพทย์ admit.
- **ผู้ดูแลระบบ:** Pool assignment การแจ้งเตือน unchanged; calendar sync applies after **แพทย์** ยืนยัน (ผู้ดูแลระบบ cannot ยืนยัน per GATE 0).

---

## 7. Meeting Link Generation (Jitsi Meet)

- **Online Telehealth นัดหมาย**
  - **Provider**: Jitsi Meet (meet.jit.si) - FREE, no account required
  - Meeting links generated when doctor/admin CONFIRMS the นัดหมาย
  - **Room name format**: `Izara-Med-{appointmentId}-{timestamp}-{hash}`
  - **Three URL variants generated**:
    - `doctorMeetingUrl` - แพทย์ joins as HOST (first to join gets moderator rights)
    - `patientMeetingUrl` - ผู้ป่วย URL with pre-filled name (waits in lobby)
    - `guestMeetingUrl` - For family members or other consultants (waits in lobby)
  - **Features enabled**:
    - Lobby ฟีเจอร์ (แพทย์ approves ALL participants)
    - Local recording (browser-based, max 200MB)
    - Thai language interface
    - Screen sharing for medical images
    - No Jitsi account required
    - Camera ON by default
    - Microphone ON by default
    - Text chat always available
  - If meeting link fails to generate, fallback notification is sent to all parties

### Guest Invite System (NEW)

- **ผู้ป่วย Relatives**: Can be invited by แพทย์ via email

- **แพทย์ Consultants/Specialists**: Can be invited for second opinions

- **Process**:
  1. แพทย์ clicks "Invite Guest" in meeting controls
  2. Enters guest email, name, and type (relative/consultant)
  3. System generates unique invite token
  4. Email sent to guest with join link containing invite token
  5. Guest clicks link → waits in lobby
  6. แพทย์ approves guest from lobby
  7. Guest joins meeting

- **Onsite นัดหมาย**
  - No meeting link generated
  - Notification and calendar event sent to แพทย์ with ผู้ป่วย symptoms and details

---

## 7a. Video Meeting Execution

### Meeting Flow (Jitsi Meet with Host Controls)

1. **แพทย์ starts meeting** (acts as HOST/MODERATOR - ONLY แพทย์ CAN START)
   - แพทย์ opens Scheduled Meetings tab
   - Clicks "Join Meeting" / "🎥 เข้าร่วมประชุม"
   - Uses `doctorMeetingUrl` which grants moderator privileges
   - Jitsi pre-join screen shows camera/mic preview
   - **Default: Camera ON, Microphone ON**
   - แพทย์ clicks "Join" to enter room AS HOST
   - **HOST CONTROLS AVAILABLE**:
     - Enable/disable lobby (default: enabled)
     - Kick participants
     - Mute all
     - Start/stop recording
     - Invite additional participants (guests)
     - Approve/reject participants from lobby

2. **ผู้ป่วย joins meeting (WAITS IN LOBBY)**
   - ผู้ป่วย sees meeting link in "นัดหมายของฉัน" page
   - Clicks "เข้าห้องประชุมเลย" button
   - Uses `patientMeetingUrl` with pre-filled display name
   - **ผู้ป่วย enters LOBBY automatically**
   - **Waits for แพทย์ approval**
   - แพทย์ sees "ผู้ป่วย waiting in lobby" notification
   - แพทย์ clicks "Admit" to allow ผู้ป่วย in
   - **Default: Camera ON, Microphone ON**
   - Enters Jitsi room as participant (not moderator)

3. **Guest/Family joins meeting** (LOBBY REQUIRED)
   - แพทย์ sends invite via "Invite Guest" button
   - Guest receives email with unique invite token
   - Guest clicks invite link
   - **Guest enters LOBBY automatically**
   - **Waits for แพทย์ approval**
   - แพทย์ sees "Guest waiting in lobby" notification
   - แพทย์ can see guest name and type (relative/consultant)
   - แพทย์ clicks "Admit" or "Reject"
   - **Default: Camera ON, Microphone ON**
   - Joins as participant (not moderator)

4. **During meeting**
   - Video/audio consultation (all participants)
   - **Text chat available** for all participants — ALL chat messages are captured and included in AI summary
   - **Screen sharing** for medical images
   - **Local recording** (if enabled by แพทย์)
   - Users can mute/unmute their camera/mic at any time
   - **แพทย์ controls transcript streaming**: START / PAUSE / STOP
   - Transcript runs in real-time alongside the meeting
   - Chat messages timestamped and attributed to speakers

5. **Meeting ends**
   - แพทย์ ends the meeting (host control)
   - Recording saved locally on แพทย์'s device
   - **Comprehensive หลังประชุม AI processing**:
     - Video uploaded to PostgreSQL/storage
     - Full transcript compiled from real-time streaming segments
     - All chat messages collected and merged with transcript
     - AI (Gemini) processes: video + transcript + chats
     - AI generates structured summary:
       - 🎯 Chief Complaint / อาการสำคัญ
       - 🔍 Investigation findings / ข้อค้นพบ
       - 📋 Recommendations / คำแนะนำ
       - 💊 Treatment suggestions / แนวทางการรักษา
       - ⚠️ Red flags / อาการที่ต้องเฝ้าระวัง
     - 30-minute sections for long meetings
     - Summary delivered to พอร์ทัลแพทย์ → Health Meeting page
     - แพทย์ reviews (Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)) → Approves → EMR generated
     - EMR report stored in PostgreSQL
     - Relevant parts sent to พอร์ทัลผู้ป่วย → Health History page

---

## 7b. COMPREHENSIVE END-TO-END MEETING WORKFLOW (Microsoft Teams-Like Experience)

### ภาพรวม

The meeting experience is designed to work like **Microsoft Teams** — the แพทย์ acts as HOST who controls all aspects of the meeting including admitting participants, starting/stopping transcript streaming, managing recording, and processing the AI summary afterward.

### Participant Types & Invitation Flow

```text
┌── WHO CAN JOIN THE MEETING ─────────────────────────────────────────────┐
│                                                                          │
│  👨‍⚕️ DOCTOR (HOST/MODERATOR)                                            │
│  ├── The doctor who confirmed the appointment                           │
│  ├── Joins with doctorMeetingUrl (moderator privileges)                 │
│  ├── Controls: lobby admission, recording, transcript, mute all        │
│  └── Can invite: other doctors, admin, specialists                     │
│                                                                          │
│  🧑 PATIENT                                                              │
│  ├── The patient who booked the appointment                             │
│  ├── Joins with patientMeetingUrl (waits in lobby)                     │
│  ├── Can invite: relatives, friends (via Patient Portal)               │
│  └── Admitted by doctor from lobby                                     │
│                                                                          │
│  👥 PATIENT'S RELATIVES/FRIENDS (Invited by Patient)                    │
│  ├── Patient sends meeting link to relatives/friends                    │
│  ├── Guest clicks link → Creates display name from BLANK               │
│  ├── Guest enters lobby → Waits for doctor approval                    │
│  └── Doctor sees guest name and admits/rejects from lobby              │
│                                                                          │
│  👨‍⚕️ OTHER DOCTORS/ADMIN (Invited by Doctor)                            │
│  ├── Doctor sends meeting link to colleagues/specialists               │
│  ├── Invited doctor/admin clicks link → Enters lobby                   │
│  ├── HOST doctor approves from lobby                                    │
│  └── Joins as participant (not moderator)                              │
│                                                                          │
│  🌐 EXTERNAL GUESTS (Non-registered users)                              │
│  ├── Receive meeting link (via email or direct share)                  │
│  ├── Click link → No login required                                     │
│  ├── Create username/display name from blank                           │
│  ├── Enter lobby → Wait for doctor approval                            │
│  └── Doctor approves based on guest name                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Test User Mapping for E2E Testing

| Role | Test Email | Test Password | Portal | Meeting Role |
| ---- | ---------- | ------------- | ------ | ------------ |
| แพทย์ (HOST) | `doctor.test@izara.com` | IzaraDoctor@2024 | พอร์ทัลแพทย์ | Moderator |
| ผู้ป่วย | `demo.test@gmail.com` | P@ssw0rd | พอร์ทัลผู้ป่วย | Participant (lobby) |
| ผู้ป่วย Relative | `demo2.test@gmail.com` | P@ssw0rd | พอร์ทัลผู้ป่วย | Guest (lobby) |
| Admin/2nd แพทย์ | `admin.test@izara.com` | IzaraAdmin@2024 | พอร์ทัลแพทย์ | Participant (lobby) |
| External Guest | (any email) | (none) | Direct link | Guest (create name + lobby) |


### Full Meeting Lifecycle (Step-by-Step)

```text
╔══════════════════════════════════════════════════════════════════════════╗
║  PHASE 1: APPOINTMENT BOOKING & APPROVAL                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 1:  Patient logs in → Patient Portal (localhost:3005)              ║
║  Step 2:  Patient books appointment (symptoms + preferred time)          ║
║           - AI analyzes symptoms → urgency level + specialty             ║
║           - Patient can optionally select a specific doctor              ║
║           - Status: pending (specific doctor) or in_pool (unassigned)   ║
║                                                                          ║
║  Step 3:  APPROVAL PATH A — Doctor confirms directly                    ║
║           - Doctor sees pending appointment in Health Meeting → Queue    ║
║           - Reviews patient symptoms and AI analysis                     ║
║           - Clicks "Confirm" → Sets date/time                           ║
║           - System generates Jitsi meeting URLs (doctor/patient/guest)  ║
║           - Status: confirmed                                           ║
║                                                                          ║
║  Step 3:  APPROVAL PATH B — Admin assigns then doctor confirms          ║
║           - Admin sees in_pool appointments in Admin Appointment Mgmt   ║
║           - AI auto-matches specialty (11 categories)                   ║
║           - Admin assigns to specific doctor (manual or AI)             ║
║           - Status: awaiting_doctor_response                            ║
║           - Doctor confirms → Jitsi URLs generated → Status: confirmed  ║
║                                                                          ║
║  Step 4:  NOTIFICATIONS SENT                                             ║
║           - Patient: in-app notification + email with meeting link       ║
║           - Doctor: appointment appears in Scheduled Meetings tab        ║
║           - Calendar event created for both parties                      ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PHASE 2: PRE-MEETING PREPARATION                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 5:  Patient invites relatives/friends (optional)                  ║
║           - Patient shares meeting link via Patient Portal               ║
║           - Patient can also share link externally (email, LINE, etc.)  ║
║           - Recipients do NOT need an account                           ║
║                                                                          ║
║  Step 6:  Doctor invites other doctors/admin/specialists (optional)     ║
║           - Doctor sends invite from Health Meeting page                 ║
║           - System generates token-based invite link                     ║
║           - Invite email sent with join URL                             ║
║                                                                          ║
║  Step 7:  AI Pre-Consultation Summary generated                         ║
║           - POST /api/ai/pre-consultation-summary                       ║
║           - Input: Patient's PHR + EMR history + symptoms + Q&A        ║
║           - Output: Key findings, suggested questions, risk alerts      ║
║           - Requirement 2.2: AI สรุปข้อมูลประวัติผู้ป่วยทั้ง EMR        ║
║           - Doctor reviews in Dashboard → Health Meeting column         ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PHASE 3: MEETING EXECUTION (Microsoft Teams-Like Experience)            ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 8:  Doctor starts meeting (HOST)                                   ║
║           - Clicks "Join Meeting" from Scheduled Meetings tab            ║
║           - Jitsi opens with moderator/HOST privileges                  ║
║           - Pre-join screen: camera/mic preview (both ON by default)    ║
║           - Doctor is FIRST in the room                                 ║
║           - HOST controls activated:                                     ║
║             • Lobby admission (approve/reject each participant)         ║
║             • Start/Stop recording                                       ║
║             • Start/Stop transcript streaming                           ║
║             • Mute/unmute all participants                              ║
║             • Kick participants                                         ║
║                                                                          ║
║  Step 9:  Patient joins (enters LOBBY)                                  ║
║           - Patient clicks meeting link from "นัดหมายของฉัน" page       ║
║           - Uses patientMeetingUrl with pre-filled display name          ║
║           - Enters LOBBY → Waits for doctor to admit                    ║
║           - Doctor sees "Patient waiting in lobby" notification          ║
║           - Doctor clicks "Admit" → Patient joins the room              ║
║                                                                          ║
║  Step 10: Guests join (enter LOBBY → Doctor approves)                   ║
║           - Patient's relatives/friends click shared meeting link        ║
║           - Non-registered users: create display name from BLANK        ║
║           - All guests enter LOBBY → Wait for doctor approval           ║
║           - Doctor sees guest names in lobby queue                       ║
║           - Doctor selectively admits or rejects each guest             ║
║           - Other doctors/admin invited by doctor also enter lobby      ║
║                                                                          ║
║  Step 11: Doctor starts TRANSCRIPT STREAMING                            ║
║           - Doctor clicks "Start Transcription" button                  ║
║           - POST /api/meetings/:id/start-transcription                  ║
║           - Web Speech API begins listening (FREE, browser-based)       ║
║           - Real-time transcript appears in bottom panel                ║
║           - Speaker labels: 👨‍⚕️ Doctor / 🧑 Patient / 👥 Guest          ║
║           - Interim text shown with yellow background (pulsing)         ║
║           - Doctor can PAUSE / RESUME transcript anytime                ║
║           - Doctor can switch language: Thai (th-TH) ↔ English (en-US) ║
║           - Transcript segments saved to PostgreSQL continuously        ║
║           - Requirement 3.2: ระบบ transcript หลังบ้านใน meeting          ║
║           - Requirement 3.5: ใช้ Speech-to-Text บนอุปกรณ์ (ฟรี)         ║
║                                                                          ║
║  Step 12: Video consultation in progress                                ║
║           - All participants have video + audio + chat                  ║
║           - TEXT CHAT available throughout (like Microsoft Teams)        ║
║           - All chat messages are CAPTURED with timestamps              ║
║           - Chat messages attributed to sender (name + role)            ║
║           - Screen sharing for medical images/reports                    ║
║           - Doctor can share screen to show test results                ║
║           - AI Clinical Copilot provides real-time suggestions          ║
║           - Requirement 2.4: Clinical Decision Support active            ║
║                                                                          ║
║  Step 13: Doctor stops transcript streaming                             ║
║           - Doctor clicks "Stop Transcription"                          ║
║           - POST /api/meetings/:id/stop-transcription                   ║
║           - Full transcript compiled from all streaming segments        ║
║           - Transcript stored in meeting_transcripts table              ║
║                                                                          ║
║  Step 14: Doctor ends meeting                                           ║
║           - Doctor clicks "End Meeting" (only HOST can end)             ║
║           - All participants disconnected                               ║
║           - Recording stops and prepares for upload                     ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PHASE 4: POST-MEETING AI PROCESSING (Automatic Pipeline)               ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 15: Video recording uploaded                                      ║
║           - Recording uploaded to PostgreSQL/cloud storage               ║
║           - POST /api/meetings/:id/upload-recording                     ║
║                                                                          ║
║  Step 16: AI processes ALL meeting data                                 ║
║           - INPUT to Gemini AI:                                         ║
║             ① Full transcript from streaming (with speaker labels)      ║
║             ② All chat messages (with timestamps and senders)           ║
║             ③ Video input metadata (duration, participants)             ║
║             ④ Patient's existing PHR/EMR context                        ║
║           - POST /api/meetings/:id/generate-summary                     ║
║           - Requirement 2.1: สรุปอาการผู้ป่วย                            ║
║           - Requirement 3.2: ประเมินช่วงเวลาและสคริปให้ AI สรุป          ║
║                                                                          ║
║  Step 17: AI generates structured output (Thai SOAP format)             ║
║           OUTPUT:                                                        ║
║           ┌────────────────────────────────────────────────────────┐    ║
║           │  🎯 อาการสำคัญ (Chief Complaint)                       │    ║
║           │  📝 อาการที่พบ (Presenting Symptoms)                   │    ║
║           │  🔍 การสืบค้น/ตรวจเพิ่มเติม (Investigation)             │    ║
║           │  📋 การประเมินเบื้องต้น (Preliminary Assessment)        │    ║
║           │  💊 คำแนะนำการรักษา (Treatment Recommendations)        │    ║
║           │  📅 นัดติดตาม (Follow-up Schedule)                     │    ║
║           │  🚩 อาการที่ต้องเฝ้าระวัง (Red Flags)                   │    ║
║           │  🏠 คำแนะนำด้านไลฟ์สไตล์ (Lifestyle Recommendations)   │    ║
║           │  ⚠️ requiresValidation: true (Man-in-the-Loop)        │    ║
║           └────────────────────────────────────────────────────────┘    ║
║           - For meetings > 30 min: 30-minute sectioned summaries       ║
║           - All sections combined into final comprehensive summary     ║
║                                                                          ║
║  Step 18: Doctor recommendations generated (CDS)                       ║
║           - Differential diagnosis suggestions                          ║
║           - Suggested lab tests and imaging                             ║
║           - Drug interaction alerts if prescribing                     ║
║           - Guideline references (2024-2025)                           ║
║           - Requirement 2.4: CDS ช่วยแพทย์ตัดสินใจ                      ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PHASE 5: DOCTOR REVIEW & EMR DOCUMENTATION                             ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 19: Results displayed on Doctor's Health Meeting page             ║
║           - AI summary appears in Health Meeting → meeting results      ║
║           - Doctor reviews on Dashboard → Health Meeting column         ║
║           - Man-in-the-Loop: Doctor validates all AI content            ║
║           - Actions: [✅ Approve] [✏️ Edit] [🔄 Regenerate]            ║
║           - Requirement 2.5: แพทย์ตรวจสอบก่อนส่งข้อมูลถึงคนไข้          ║
║                                                                          ║
║  Step 20: Doctor creates/edits EMR                                      ║
║           - Opens CompleteEMREditor with AI-prefilled SOAP tabs         ║
║           - Tab S: Chief complaint (from AI + transcript)               ║
║           - Tab O: Physical exam + vitals                               ║
║           - Tab A: Diagnosis (ICD-10 codes from AI suggestion)          ║
║           - Tab P: Treatment plan (from AI recommendations)             ║
║           - Voice dictation available (Web Speech API)                  ║
║           - Auto-save every 30 seconds                                  ║
║           - Doctor edits and finalizes EMR                              ║
║           - Requirement 4.1: หมอทำเอกสารรายงานอาการผู้ป่วยลง EMR        ║
║                                                                          ║
║  Step 21: Doctor signs EMR + generates Patient Instruction Sheet        ║
║           - Doctor clicks "Sign & Finalize"                             ║
║           - Digital signature applied                                   ║
║           - AI generates Patient Instruction Sheet:                     ║
║             • วินิจฉัย (Diagnosis in simple Thai)                       ║
║             • ยาที่ได้รับ (Medications with dosage/frequency)            ║
║             • การปฏิบัติตัว (Self-care instructions)                     ║
║             • อาการที่ควรพบแพทย์ทันที (Warning signs)                     ║
║             • นัดหมายครั้งต่อไป (Follow-up schedule)                     ║
║           - Doctor reviews instruction sheet (Man-in-the-Loop)          ║
║           - Approved → Ready to send to patient                        ║
║           - Requirement 2.1: สร้างเอกสารสรุปคำแนะนำให้ผู้ป่วย            ║
║           - Requirement 4.5: Patient Instruction Sheet อัตโนมัติ          ║
║                                                                          ║
║  Step 22: E-Prescribing (optional)                                      ║
║           - Doctor opens CompletePrescribing for medications             ║
║           - Drug search, allergy alerts, interaction warnings           ║
║           - Requirement 2.4: CDS drug interaction alerts                ║
║                                                                          ║
║  Step 23: Lab Orders (optional)                                         ║
║           - Doctor orders follow-up lab tests                           ║
║           - Common panels + individual tests                            ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PHASE 6: PATIENT DELIVERY                                               ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 24: EMR data sent to patient                                      ║
║           - POST /api/patients/:id/health-logs                          ║
║           - Patient receives notification: "แพทย์ส่งผลการตรวจ"           ║
║           - WHAT PATIENT RECEIVES:                                       ║
║             ✅ Chief complaint and diagnosis (patient-friendly)          ║
║             ✅ Treatment plan summary                                    ║
║             ✅ Medications with instructions (วิธีกินยา)                  ║
║             ✅ Patient Instruction Sheet (PDF, Thai)                     ║
║             ✅ Follow-up schedule                                        ║
║             ✅ Warning signs to watch for                                ║
║           - WHAT PATIENT DOES NOT RECEIVE:                              ║
║             ❌ Internal doctor notes                                     ║
║             ❌ Raw AI outputs                                            ║
║             ❌ Doctor-to-doctor communications                           ║
║             ❌ CDS alerts (internal)                                     ║
║                                                                          ║
║  Step 25: Patient views results in Health History pages                 ║
║           - Patient Portal → Dashboard → Latest Appointment Result      ║
║           - Patient Portal → Timeline → Treatment history entry         ║
║           - Patient Portal → PHR → Health logs tab                      ║
║           - Patient Instruction Sheet downloadable as PDF               ║
║           - Appointment status: completed                               ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Meeting Data Flow Diagram

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Patient    │    │   Doctor    │    │  Relatives  │    │ Other Doc   │
│   Portal     │    │   Portal    │    │  (Guest)    │    │ (Invited)   │
└──────┬───────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                   │                  │                  │
       └───────────────────┼──────────────────┼──────────────────┘
                           │                  │
                    ┌──────▼──────────────────▼──────┐
                    │      JITSI MEETING ROOM         │
                    │   (Doctor as HOST/Moderator)     │
                    │                                  │
                    │  📹 Video  🎤 Audio  💬 Chat     │
                    │  🔴 Recording  📝 Transcript     │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │      MEETING SERVER (Port 3020)   │
                    │                                   │
                    │  Collects:                         │
                    │  ① Transcript segments (streaming) │
                    │  ② Chat messages (all)             │
                    │  ③ Recording metadata              │
                    │  ④ Participant info                 │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │      GEMINI AI PROCESSING         │
                    │                                   │
                    │  Input: transcript + chat + PHR   │
                    │  Output: SOAP summary + CDS       │
                    │  requiresValidation: true          │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │      DOCTOR REVIEW (Man-in-Loop)  │
                    │                                   │
                    │  [✅ Approve] [✏️ Edit] [❌ Reject]│
                    └────────┬─────────────┬───────────┘
                             │             │
                    ┌────────▼────┐  ┌─────▼──────────┐
                    │ EMR Report  │  │ Patient        │
                    │ (PostgreSQL)│  │ Instruction    │
                    │             │  │ Sheet (PDF)    │
                    └────────┬────┘  └─────┬──────────┘
                             │             │
                    ┌────────▼─────────────▼───────────┐
                    │  PATIENT PORTAL                    │
                    │  → Dashboard (Latest Result)       │
                    │  → Timeline (Treatment History)    │
                    │  → PHR (Health Logs)                │
                    │  → Instruction Sheet (Download)     │
                    └──────────────────────────────────┘
```

### Meeting Link Data Structure

```json
{
  "appointmentId": "APT-2025-001",
  "jitsiRoomName": "Izara-Med-APT-2025-abc123-xyz789",
  "doctorUrl": "<https://meet.jit.si/Izara-Med-APT-2025-abc123-xyz789#config...",>
  "patientUrl": "<https://meet.jit.si/Izara-Med-APT-2025-abc123-xyz789#config...",>
  "guestUrl": "<https://meet.jit.si/Izara-Med-APT-2025-abc123-xyz789#config...",>
  "provider": "jitsi",
  "status": "active",
  "scheduledDate": "2025-12-16",
  "scheduledTime": "10:00"
}
```

### Recording Upload (Post-Meeting)

> **Current (PostgreSQL):** Recordings stored in `meeting_records.recording_data` (BYTEA) and/or Meeting Server volume `recordings/`. AI pipeline writes to `meeting_records.ai_summary`, `meeting_transcripts`.

```text
Doctor ends meeting → Meeting Server POST /api/meetings/:id/end
                  └─→ Transcript segments → meeting_transcripts
                  └─→ Recording → meeting_records (BYTEA) + optional filesystem
                  └─→ Gemini SOAP → meeting_records.ai_summary
                  └─→ Doctor man-in-the-loop → ai_validations
                  └─→ Summary in Doctor Portal Meeting Results
```

> **Deprecated:** GCS path `izara-doctors-data/doctors/{doctorId}/meetings/` — not used when `USE_POSTGRESQL=true`.

### PostgreSQL meeting tables

```text
meeting_records          # status, ai_summary, recording_data (BYTEA), doctor_id, appointment_id
meeting_transcripts      # segment rows per speaker/time
meeting_chats            # in-meeting chat
ai_validations           # man-in-the-loop approvals
```

### 30-Minute Sectioned Summaries

For meetings longer than 30 minutes:

1. Transcript split into 30-minute sections
2. Each section generates its own summary
3. All sections combined into final comprehensive summary
4. Both individual and combined summaries stored
5. แพทย์ sees combined summary in portal

---

## 8. Patient Cancellation

- **If ผู้ป่วย cancels before meeting time**
  - นัดหมาย is removed immediately
  - สถานะ: `cancelled`
  - Notification sent to แพทย์ and ผู้ดูแลระบบ
  - Dashboard/calendar updated for both ผู้ป่วย and แพทย์

---

## 9. Meeting Execution & Recording

### Online Telehealth (Jitsi Meet)

1. **All participants join via Jitsi meeting link at scheduled time**
2. **แพทย์ acts as HOST** with recording permissions
3. **During meeting:**
   - Video/audio medical consultation
   - Screen sharing for medical images/reports
   - Local recording enabled
4. **Meeting ends:**
   - แพทย์ ends meeting via Meeting Server
   - Recording → `meeting_records` (BYTEA) + transcript → `meeting_transcripts`

### Recording & Transcription Flow

> **Current:** Meeting Server + PostgreSQL. See [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) and [POST_MEETING_WORKFLOW.md](POST_MEETING_WORKFLOW.md).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  POST-MEETING AI PROCESSING (PostgreSQL)                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  1. End meeting → Meeting Server POST /api/meetings/:id/end              │
│  2. Transcript → meeting_transcripts (Web Speech API segments)           │
│  3. Gemini SOAP → meeting_records.ai_summary                             │
│  4. Man-in-the-loop → ai_validations                                     │
│  5. Doctor signs EMR → patient_documents via DocumentDeliveryService     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Onsite Appointments

- ผู้ป่วย arrives at clinic

- แพทย์ refers to calendar and email for symptoms/details

- No recording or transcription needed

---

## 10. Post-Meeting Actions (Doctor Side)

### 10.1 EMR Documentation Flow

1. **แพทย์ opens EMR Editor** (`CompleteEMREditor.tsx`)
   - Uses Thai OPD Card format (มาตรฐานกระทรวงสาธารณสุข)
   - Tabs: ประวัติ (S), ตรวจร่างกาย (O), การวินิจฉัย (A), การรักษา (P), สรุป AI
   - **NEW: AI-generated content from meeting transcript available**

2. **แพทย์ fills EMR sections:**
   - Chief complaint and history (auto-populated from AI if meeting)
   - Physical examination and vital signs
   - Diagnosis (ICD-10 codes)
   - Treatment plan and follow-up instructions

3. **AI Summary Generation:**
   - AI (Gemini) generates ผู้ป่วย-friendly summary
   - AI generates meeting transcript (if telemedicine)
   - **NEW: แพทย์ reviews AI recommendations panel**
   - แพทย์ reviews and may edit AI content

4. **แพทย์ signs EMR:**
   - Clicks "ลงนามและส่งให้ผู้ป่วย" (Sign and Send to ผู้ป่วย)
   - Digital signature applied
   - สถานะ changes to `finalized`

### 10.2 Prescription Documentation

1. **แพทย์ opens E-Prescribing** (`CompletePrescribing.tsx`)
   - Searches for medications
   - System checks for allergies and drug interactions
   - แพทย์ adds medications with dosage and instructions

2. **ใบสั่งยา saved:**
   - ใบสั่งยา saved to `prescriptions.json`
   - **ใบสั่งยา published to `patient_documents`** (source_type `prescription`)
   - ผู้ป่วย can view prescribed medications in Health Studio

### 10.3 EMR Delivery to Patient

## What gets sent to patient's health logs

- Chief complaint

- Diagnosis (descriptions only, not internal notes)

- Treatment plan

- **Medications/ใบสั่งยา** (drug names, dosages, instructions)

- Follow-up date and instructions

- AI Summary (ผู้ป่วย-friendly เวอร์ชัน)

- แพทย์'s signature timestamp

## What does NOT get sent to patient

- Internal แพทย์ comments/notes

- Raw clinical assessments

- Drug interaction warnings marked as internal

- แพทย์-to-แพทย์ communications

## Delivery Flow

1. EMR ลงนามแล้ว → `PUT /api/emr/:id` + `DocumentDeliveryService.publishDocument`
2. Rows in `patient_documents` + `health_timeline`; ผู้ป่วย reads via `GET /api/phr/:id/health-logs` (ลงนามแล้ว only)
3. ผู้ป่วย notification sent (`emr_signed`)
4. ผู้ป่วย views in PHR → ผลการรักษา / เอกสารทางการแพทย์
5. ผู้ป่วย views in Latest นัดหมาย Result on dashboard

See [Clinical_Document_Delivery_Workflows.md](Clinical_Document_Delivery_Workflows.md).

### 10.4 If EMR Not Signed

- ผู้ป่วย cannot access EMR in health logs

- สถานะ: `awaiting signature`

- Notification sent to แพทย์ to complete signature

---

## 11. Error Handling & Edge Cases

- สถานะ: `declined`
  - ผู้ป่วย notified with reason
  - ผู้ป่วย can request new นัดหมาย

  - สถานะ: `cancelled`
  - นัดหมาย removed
  - Doctor/admin notified

  - Fallback notification sent
  - ผู้ดูแลระบบ prompted to resolve

  - No meeting link
  - แพทย์ receives symptoms/details in email and calendar

  - ผู้ป่วย cannot access EMR
  - แพทย์ notified to sign

---

## 11a. Recent UI/UX Edge Case Fixes (2025-12-11)

### 1. "Assign to Doctor" Button in Patient Queue (HealthMeeting.tsx)

**Problem:** ผู้ดูแลระบบ could not see the มอบหมาย button for นัดหมาย already assigned to a แพทย์.
**Fix:** Button now shows for ALL นัดหมาย when ผู้ดูแลระบบ is logged in.

- Button text dynamically changes:
  - `📋 Assign to Doctor` — for unassigned นัดหมาย
  - `🔄 Reassign to Different Doctor` — for already assigned นัดหมาย

### 2. Dashboard Correlation with Appointments & Meetings (DoctorDashboard.tsx)

**Problem:** Dashboard stats cards did not link to the นัดหมาย & Meetings page.
**Fix:** Made 3 relevant stats cards clickable with navigation to `/doctor/{userId}/health-meeting`:

- "Today's นัดหมาย" (blue card) → Clickable

- "In Queue" (orange card) → Clickable

- "ความต้องการ Confirmation" (amber card) → Clickable

- Added visual feedback: `cursor-pointer`, `hover:shadow-lg`, `hover:border-{color}-400`, and `transition-all` for better UX.

### 3. Scheduled Meetings Tab - Full Meeting Details (HealthMeeting.tsx)

**Problem:** Scheduled Meetings tab only showed basic info, lacking prominent meeting link and calendar details.
**Fix:** Complete redesign of Scheduled Meetings display:

- **Date/Time Section**: Prominent card with icons showing scheduled date, time, and duration

- **Meeting Link Section**: Blue highlighted box with:
  - Full meeting link visible (clickable)
  - Copy button with confirmation alert

- **Participants Section**: Enhanced with email addresses visible

- **การกระทำ Buttons**: More prominent with icons:
  - "🎥 Join Now" - Large emerald button
  - "📅 Add to Calendar" - Blue button
  - "✉️ Send Invite" - Purple button
  - "🔗 Copy Link" - Gray button

### 4. Patient Portal - นัดหมายของฉัน (AppointmentPages.tsx)

**Problem:** ยืนยันแล้ว นัดหมาย didn't prominently show meeting details and join options.
**Fix:** Added special display for ยืนยันแล้ว นัดหมาย:

- **Green highlighted card** for ยืนยันแล้ว นัดหมาย

- **Date/Time Grid**: Clear display of scheduled date and time

- **Meeting Link Section** (for telehealth):
  - Full meeting link visible
  - Copy button with Thai confirmation ("คัดลอกลิงก์แล้ว!")

- **Quick Join Button**: "🎥 เข้าห้องประชุมเลย" - One-click to open meeting

- Separate handling for รอดำเนินการ vs ยืนยันแล้ว สถานะ display

### 5. Data Sync Fix - Appointment Details (historical — pre-PostgreSQL)

> **⚠️ Archived:** The following subsections describe **legacy JSON/GCS file sync** (Dec 2025). **Current system** uses PostgreSQL `appointments` table + NOTIFY triggers. See [Data_Sync_Documentation.md](Data_Sync_Documentation.md). Kept for audit trail only.

**Problem (legacy):** พอร์ทัลผู้ป่วย's `getById` only read from individual `details.json` files, missing updates from แพทย์ confirmation.

## Fix

- พอร์ทัลผู้ป่วย now checks `appointments.json` first (most up-to-date after confirmation)

- Falls back to individual `details.json` if not found

- Merges meeting link data from `meeting-link.json` if available

- พอร์ทัลแพทย์ now saves full นัดหมาย details to BOTH `appointments.json` AND `appointments/{id}/details.json`

### 6. Doctor's Scheduled Meetings Not Showing (HealthMeeting.tsx) - 2025-12-11

**Problem:** แพทย์ who assigned and ยืนยันแล้ว นัดหมาย could not see them in the 📅 Scheduled Meetings tab (showing 0) while พอร์ทัลผู้ป่วย correctly showed the meeting.

**Root Cause:** When confirming an นัดหมาย, the `doctorId` and `assignedDoctorId` fields used fallback logic with `||` operator:

```javascript
// OLD (broken): Kept old value like 'unassigned' or another doctor's ID
doctorId: apt.doctorId || doctor.id,
assignedDoctorId: apt.assignedDoctorId || doctor.id,
```

This meant if the ผู้ป่วย booked with `doctorId: 'unassigned'` or selected a different แพทย์ initially, the confirming แพทย์'s ID was NOT set, causing the Scheduled Meetings filter to miss these นัดหมาย.

**Fix:** Changed to ALWAYS set the confirming แพทย์'s ID:

```javascript
// NEW (fixed): Always set confirming doctor as the owner
doctorId: doctor.id,
assignedDoctorId: doctor.id,
adminAssignedDoctorId: apt.adminAssignedDoctorId || doctor.id,
doctorName: doctor.name,
doctorEmail: doctor.email,
```

**Additional Fix in DoctorDashboard.tsx:** Added `confirmedBy` field check to นัดหมาย filtering:

```javascript
const doctorAppointments = allAppointments.filter((apt: any) => {
  return apt.doctorId === doctor.id ||
         apt.assignedDoctorId === doctor.id ||
         apt.adminAssignedDoctorId === doctor.id ||
         apt.confirmedBy === doctor.id;  // Include appointments confirmed by this doctor
});
```

## Additional Fixes for Cache Issues (2025-12-11 Evening)

1. **`gcsDataService.ts`**: Modified `fetchAllAppointments()` to accept options parameter for cache bypass
2. **`HealthMeeting.tsx`**: All `fetchAllAppointments()` calls now use `{ cache: false }` option
3. **`DoctorDashboard.tsx`**: Same cache bypass applied
4. **Added verification ขั้นตอน**: After saving, system verifies the นัดหมาย was actually updated
5. **Added delays**: Small delays (300-500ms → 1000ms) after GCS writes to allow propagation

## CRITICAL ROOT CAUSE FIX (2025-12-11 Late Evening)

**THE REAL BUG #1:** The confirmation handler was using `saveAllAppointments()` which ONLY writes to `appointments.json` master list. It was NOT writing the individual นัดหมาย file at `appointments/{id}.json`. When the พอร์ทัลผู้ป่วย or other components tried to read the updated นัดหมาย details, they got stale data from the individual file!

**Solution #1:** Changed from `saveAllAppointments()` to `saveAppointment()` which:

- Writes to `appointments/{id}.json` (individual file)

- ALSO updates `appointments.json` (master list)

- Invalidates both caches

- Ensures both portals read the same data

## Code Change in HealthMeeting.tsx

```javascript
// OLD (broken): Only updated master list
const updatedAppointments = allAppointments.map(...);
await saveAllAppointments(updatedAppointments);

// NEW (fixed): Updates BOTH individual file AND master list
const updatedAppointment = { ...appointmentToUpdate, ...updates };
await saveAppointment(updatedAppointment);  // Writes to appointments/{id}.json + appointments.json
```

**THE REAL BUG #2 (EVEN MORE CRITICAL):** Some doctors (like <แพทย์.test@izara.com>) have NO `userId` in the system! When confirming นัดหมาย, the code was setting `doctorId: doctor.id` which resulted in `doctorId: undefined` in the saved นัดหมาย. The filter ต่อด้วย couldn't match these นัดหมาย.

**Solution #2:** Use email as fallback identifier:

```javascript
// NEW: Use ID if available, otherwise use email
const doctorIdentifier = doctor.id || doctor.email || 'unknown-doctor';

const updatedAppointment = {
  ...appointmentToUpdate,
  doctorId: doctorIdentifier,  // Now saves email if no ID
  assignedDoctorId: doctorIdentifier,
  confirmedBy: doctorIdentifier,
  confirmedByEmail: doctor.email,  // Store email separately for explicit matching
  doctorEmail: doctor.email
};

// Filter now checks BOTH identifier and email
const matchesDoctorId = apt.doctorId === doctorIdentifier ||
                        apt.assignedDoctorId === doctorIdentifier ||
                        apt.confirmedBy === doctorIdentifier;

const matchesDoctorEmail = doctor.email && (
                           apt.doctorEmail === doctor.email ||
                           apt.confirmedByEmail === doctor.email);

return isRelevantStatus && (matchesDoctorId || matchesDoctorEmail || isAdminSeeingAll);
```

## Impact

- Doctors now see ALL นัดหมาย they ยืนยัน in their Scheduled Meetings tab **EVEN WITHOUT A userId**

- Dashboard stats correctly count today's นัดหมาย

- **Both portals now have synchronized นัดหมาย data** — PostgreSQL `appointments` + NOTIFY (legacy: GCS file sync)

- Cache issues resolved — เรียลไทม์ via Socket.IO (legacy: GCS propagation delays)

- Individual นัดหมาย files now stay in sync with master list

- **Works for doctors with OR without userId in the system**

---

## 12. Status Flow

```text
[Patient creates request]
         ↓
┌─────────────────────────────────┐
│ pending / in_pool               │ ← Appears in Patient Queue
└─────────────────────────────────┘
         ↓ (Admin assigns doctor)
┌─────────────────────────────────┐
│ awaiting_doctor_response        │ ← Still in Patient Queue
└─────────────────────────────────┘
         ↓ (Doctor/Admin confirms with date/time)
┌─────────────────────────────────┐
│ confirmed                       │ ← Moves to Scheduled Meetings
└─────────────────────────────────┘
         ↓ (Meeting completed)
┌─────────────────────────────────┐
│ completed                       │
└─────────────────────────────────┘

Alternative paths:

- declined (Doctor declines) → Patient notified

- cancelled (Patient cancels) → All notified

```

---

## 13. UI Architecture

### นัดหมาย & Meetings Page (`HealthMeeting.tsx`)

| Tab | Visible To | Content |
| ----- | ----------- | --------- |
| ผู้ป่วย Queue | All (Doctor/Admin) | ALL รอดำเนินการ นัดหมาย awaiting confirmation |
| Scheduled Meetings | All (Doctor/Admin) | ยืนยันแล้ว นัดหมาย with meeting links |
| All นัดหมาย | ผู้ดูแลระบบ only | Complete list with search/filter |


### Key Points

- **ผู้ป่วย Queue**: Shows นัดหมาย from ALL dates (not just today)

- **No separate "ผู้ป่วย Pool" tab** - merged into ผู้ป่วย Queue

- ผู้ดูแลระบบ sees all นัดหมาย; แพทย์ sees only assigned นัดหมาย

- Confirmation modal allows setting/changing date and time

---

## 14. Metadata Structure

```json
{
  "appointmentId": "string",
  "patientId": "string",
  "doctorId": "string",
  "requestedDate": "ISODate",
  "requestedTime": "string",
  "confirmedDate": "ISODate",
  "confirmedTime": "string",
  "status": "pending|in_pool|awaiting_doctor_response|assigned|confirmed|completed|cancelled|declined",
  "type": "online|onsite",
  "symptoms": ["string"],
  "notes": "string",
  "meetingLink": "string|null",
  "participants": ["patientId", "doctorId", "relativeId", "consultantId"],
  "notifications": ["email", "in-app", "calendar"],
  "emr": {
    "manualEntry": "string",
    "aiSummary": "string",
    "transcript": "string",
    "signedBy": "doctorId|null"
  },
  "aiAnalysis": {
    "triageLevel": "string",
    "suggestedSpecialty": "string",
    "reasoning": "string"
  }
}
```

---

## 15. Summary Table

| ขั้นตอน | User | Page/Component | การกระทำ/Option | Metadata/สถานะ Update |
| --------------------- | --------- | --------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| Login | ผู้ป่วย | LoginPage.tsx | Login | session |
| Login | แพทย์ | DoctorDashboard.tsx | Login | session |
| จองนัด นัดหมาย | ผู้ป่วย | AppointmentPages.tsx | Select แพทย์ or system-มอบหมาย, symptoms, date/time | สถานะ: รอดำเนินการ/รอจัดสรร |
| View Queue | Doctor/Admin | HealthMeeting.tsx (ผู้ป่วย Queue) | See ALL รอดำเนินการ นัดหมาย | - |
| มอบหมาย แพทย์ | ผู้ดูแลระบบ | HealthMeeting.tsx (ผู้ป่วย Queue) | มอบหมาย unassigned นัดหมาย to แพทย์ | สถานะ: awaiting_doctor_response |
| ยืนยัน นัดหมาย | Doctor/Admin | HealthMeeting.tsx (ผู้ป่วย Queue) | Set date/time, generate Jitsi meeting link | สถานะ: ยืนยันแล้ว, meetingLink |
| Decline | แพทย์ | HealthMeeting.tsx | Decline with reason, แจ้งผู้ป่วย | สถานะ: declined |
| View Scheduled | Doctor/Admin | HealthMeeting.tsx (Scheduled) | View ยืนยันแล้ว นัดหมาย, join meeting | - |
| Manage All | ผู้ดูแลระบบ | HealthMeeting.tsx (All นัดหมาย) | Search, filter, manage all นัดหมาย | - |
| ผู้ป่วย Cancel | ผู้ป่วย | DashboardPage.tsx | Cancel, notify doctor/admin | สถานะ: cancelled |
| Join Meeting | All | Jitsi Meet (meet.jit.si) | Join via Jitsi link (online) | meetingLink, participants |
| End Meeting | แพทย์ | Jitsi + API | End meeting, upload recording | videoUrl, transcript |
| AI Processing | System | Speech-to-Text + Gemini | Transcribe, summarize, recommend | transcript, summary |
| หลังประชุม | แพทย์ | CompleteEMREditor.tsx | Write/ลงนาม EMR with AI assistance | emr, สถานะ: completed |
| View EMR | ผู้ป่วย | PHRPage.tsx | View EMR in health logs (if ลงนามแล้ว) | emr, results |


---

## 16. E2E Testing — Comprehensive Meeting ขั้นตอนการทำงาน

### Testing Environments

| Environment | พอร์ทัลผู้ป่วย | พอร์ทัลแพทย์ | Meeting Server | Database |
| ----------- | ------------- | ------------- | -------------- | -------- |
| **Local (Docker)** | localhost:3005 | localhost:3010 | localhost:3020 | localhost:5432 (izara_phase1) |
| **Cloud (GCP)** | ผู้ป่วย-portal-xxxxx.run.app | แพทย์-portal-xxxxx.run.app | meeting-server-xxxxx.run.app | CloudSQL (izara_phase1) |


### Test Credentials (Deployment)

| Role | Email | Password | Portal |
| ---- | ----- | -------- | ------ |
| แพทย์ (HOST) | `doctor.test@izara.com` | IzaraDoctor@2024 | พอร์ทัลแพทย์ |
| ผู้ป่วย | `demo.test@gmail.com` | P@ssw0rd | พอร์ทัลผู้ป่วย |
| ผู้ดูแลระบบ | `admin.test@izara.com` | IzaraAdmin@2024 | พอร์ทัลแพทย์ |
| External Guest | (no login required) | (none) | Direct meeting link |


### Dual Portal Testing

The นัดหมาย workflow is tested end-to-end using the Selenium test suite that runs both ผู้ป่วย and แพทย์ portals simultaneously:

```bash

# Run full dual-portal meeting workflow test (local)
node scripts/tests/e2e/dualPortalMeetingTests.cjs

# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless

# Run standard appointment workflow tests
node scripts/tests/e2e/appointmentWorkflowTests.cjs

# Run cloud environment tests
node scripts/tests/e2e/dualPortalMeetingTests.cjs --env=cloud
```

### Comprehensive Test Coverage Matrix

| # | Phase | Test Scenario | Portal(s) | Validates |
| - | ----- | ------------- | --------- | --------- |
| 1 | **Pre-Meeting** | ผู้ป่วย logs in and books นัดหมาย | ผู้ป่วย | Auth + booking flow |
| 2 | **Pre-Meeting** | AI analyzes symptoms and sets urgency | System | Gemini integration |
| 3 | **Pre-Meeting** | แพทย์ sees รอดำเนินการ นัดหมาย in queue | แพทย์ | Health Meeting queue |
| 4 | **Pre-Meeting** | แพทย์ confirms นัดหมาย with date/time | แพทย์ | สถานะ → ยืนยันแล้ว |
| 5 | **Pre-Meeting** | System generates Jitsi meeting URLs | System | 3 URLs: doctor/patient/guest |
| 6 | **Pre-Meeting** | ผู้ป่วย receives notification with link | ผู้ป่วย | Notification system |
| 7 | **Pre-Meeting** | AI generates pre-consultation summary | System | Requirement 2.2 |
| 8 | **Pre-Meeting** | ผู้ป่วย invites relatives/friends (share link) | ผู้ป่วย | Guest invite flow |
| 9 | **Pre-Meeting** | แพทย์ invites other doctors (token invite) | แพทย์ | Multi-party invite |
| 10 | **Meeting** | แพทย์ starts meeting (HOST/moderator) | แพทย์ | Jitsi HOST controls |
| 11 | **Meeting** | ผู้ป่วย enters LOBBY → แพทย์ admits | Both | Lobby admission |
| 12 | **Meeting** | Guest creates display name from BLANK → LOBBY | Guest | Guest self-registration |
| 13 | **Meeting** | แพทย์ admits/rejects guests from lobby | แพทย์ | Selective admission |
| 14 | **Meeting** | แพทย์ starts transcript streaming | แพทย์ | Web Speech API activation |
| 15 | **Meeting** | Real-time transcript appears with speaker labels | Both | Socket.IO streaming |
| 16 | **Meeting** | All participants can send text chat | All | Chat capture system |
| 17 | **Meeting** | แพทย์ pauses/resumes transcript | แพทย์ | HOST transcript control |
| 18 | **Meeting** | แพทย์ stops transcript | แพทย์ | Transcript finalization |
| 19 | **Meeting** | Screen sharing for medical images | แพทย์ | Jitsi screen share |
| 20 | **Meeting** | Demo meeting with simulated video/audio | Both | Local testing |
| 21 | **หลังประชุม** | แพทย์ ends meeting | แพทย์ | HOST end control |
| 22 | **หลังประชุม** | Recording uploaded to PostgreSQL | System | Storage pipeline |
| 23 | **หลังประชุม** | AI processes transcript + chats + video | System | Gemini summary pipeline |
| 24 | **หลังประชุม** | AI generates SOAP summary (Thai) | System | Requirement 2.1, 3.2 |
| 25 | **หลังประชุม** | 30-min sectioned summaries for long meetings | System | Section splitting |
| 26 | **หลังประชุม** | Summary displayed on แพทย์'s Health Meeting | แพทย์ | Results display |
| 27 | **หลังประชุม** | แพทย์ reviews AI summary (Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)) | แพทย์ | Requirement 2.5 |
| 28 | **หลังประชุม** | แพทย์ approves/edits/rejects summary | แพทย์ | Validation UI |
| 29 | **EMR** | EMR Editor pre-filled with AI SOAP data | แพทย์ | Auto-population |
| 30 | **EMR** | แพทย์ edits and finalizes EMR | แพทย์ | EMR workflow |
| 31 | **EMR** | แพทย์ signs EMR (digital signature) | แพทย์ | Sign & finalize |
| 32 | **EMR** | ผู้ป่วย Instruction Sheet auto-generated | System | Requirement 4.5 |
| 33 | **EMR** | แพทย์ reviews instruction sheet | แพทย์ | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) |
| 34 | **Delivery** | EMR data sent to ผู้ป่วย | System | POST health-logs |
| 35 | **Delivery** | ผู้ป่วย views results in Dashboard | ผู้ป่วย | Latest Result widget |
| 36 | **Delivery** | ผู้ป่วย views results in Timeline | ผู้ป่วย | Treatment history |
| 37 | **Delivery** | ผู้ป่วย downloads Instruction Sheet (PDF) | ผู้ป่วย | PDF generation |
| 38 | **Delivery** | นัดหมาย สถานะ → completed | Both | Final สถานะ |


### Demo Meeting Test Procedure

For testing on local environment with simulated video/audio:

```text
Step 1:  Start Docker → docker-compose up -d (all 4 services)
Step 2:  Open Patient Portal (localhost:3005) → Login as patient
Step 3:  Book appointment with Thai symptoms (ปวดหัว ไข้สูง 2 วัน)
Step 4:  Open Doctor Portal (localhost:3010) → Login as doctor
Step 5:  See appointment in Health Meeting → Queue tab
Step 6:  Confirm appointment → Set time → Jitsi URLs generated
Step 7:  Patient gets notification → Sees meeting link in Appointments
Step 8:  (Optional) Patient shares guest link with test email
Step 9:  Doctor clicks "Join Meeting" → Enters as HOST
Step 10: Patient clicks "Join Meeting" → Enters LOBBY
Step 11: Doctor admits patient from lobby
Step 12: (Optional) Guest opens link → Creates name → LOBBY → Doctor admits
Step 13: Doctor clicks "Start Transcription" → Speak test phrases
Step 14: Verify: real-time transcript appears with speaker labels
Step 15: Use chat to send text messages → Verify chat is captured
Step 16: Doctor clicks "Stop Transcription"
Step 17: Doctor clicks "End Meeting"
Step 18: Verify: AI processes transcript + chat → Summary generated
Step 19: Verify: Summary appears in Health Meeting → Results
Step 20: Doctor reviews and approves summary
Step 21: Doctor opens EMR → Verify AI pre-filled SOAP tabs
Step 22: Doctor signs EMR → Patient Instruction Sheet generated
Step 23: Verify: Patient sees results in Dashboard + Timeline
Step 24: Verify: Patient can download Instruction Sheet PDF
```

### Generate Test Audio Files

```bash

# Generate test audio files for transcription testing
node scripts/generators/generateTestAudio.cjs
```

This generates:

- Thai medical consultation transcripts

- SSML files for TTS API

- Reference metadata for validation

---

## 17. API Endpoints Reference

### Appointment Endpoints (Patient Portal - Port 3005)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/appointments` | POST | Create new appointment |
| `/api/appointments/:id` | GET | Get appointment details |
| `/api/appointments/:id/meeting-link` | GET | Get patient meeting URL |
| `/api/appointments/:id/invite-guest` | POST | Generate guest invite link |


### Video Meeting Endpoints (Doctor Portal - Port 3009)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/video-meeting/create` | POST | Create Jitsi meeting (generates 3 URLs) |
| `/api/video-meeting/:id` | GET | Get meeting details + participant list |
| `/api/video-meeting/:id/join` | POST | Join meeting (sets lobby status) |
| `/api/video-meeting/:id/end` | POST | End meeting + trigger AI pipeline |
| `/api/video-meeting/:id/upload-recording` | POST | Upload video recording |
| `/api/video-meeting/:id/files` | GET | Get meeting files/recordings |
| `/api/video-meeting/:id/invite` | POST | Send invite to other doctor/admin |
| `/api/video-meeting/health` | GET | Health check |


### Transcript Streaming Endpoints (Meeting Server - Port 3020)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/meetings/:id/start-transcription` | POST | Start transcript streaming (HOST only) |
| `/api/meetings/:id/stop-transcription` | POST | Stop transcript streaming (HOST only) |
| `/api/meetings/:id/pause-transcription` | POST | Pause transcript streaming (HOST only) |
| `/api/meetings/:id/transcript` | GET | Get full transcript with speaker labels |
| `/api/meetings/:id/transcript/sections` | GET | Get 30-min sectioned transcript |
| `/api/meetings/:id/chats` | GET | Get all chat messages |
| `Socket.IO: transcript-segment` | WS | Real-time transcript segment broadcast |
| `Socket.IO: chat-message` | WS | Real-time chat message broadcast |


### AI Processing Endpoints (Meeting Server - Port 3020)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/meetings/:id/generate-summary` | POST | Generate AI summary from transcript + chats |
| `/api/meetings/:id/summary` | GET | Get AI-generated SOAP summary |
| `/api/meetings/:id/recommendations` | GET | Get CDS recommendations |
| `/api/ai/pre-consultation-summary` | POST | Generate pre-consultation summary (Req 2.2) |
| `/api/ai/patient-instruction-sheet` | POST | Generate patient instruction sheet (Req 4.5) |
| `/api/ai/document-analysis` | POST | Analyze uploaded PDF/lab results (Req 2.3) |


### EMR Endpoints (Doctor Portal - Port 3009)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/emr/:id` | GET | Get EMR record |
| `/api/emr` | POST | Create new EMR (AI-prefilled SOAP) |
| `/api/emr/:id` | PUT | Update EMR |
| `/api/emr/:id/sign` | POST | Sign and finalize EMR |
| `/api/emr/:id/instruction-sheet` | GET | Get patient instruction sheet |


### Patient Delivery Endpoints (Patient Portal - Port 3005)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/patients/:id/health-logs` | POST | Receive EMR data from doctor |
| `/api/patients/:id/health-logs` | GET | Get patient health history |
| `/api/patients/:id/instruction-sheets` | GET | Get instruction sheets |
| `/api/patients/:id/instruction-sheets/:id/pdf` | GET | Download instruction sheet PDF |


### Guest Meeting Endpoints (Public - No Auth Required)

| Endpoint | Method | คำอธิบาย |
| -------- | ------ | ----------- |
| `/api/guest/meeting/:token` | GET | Validate guest meeting token |
| `/api/guest/meeting/:token/join` | POST | Join meeting as guest (display name required) |


---

**This workflow covers the COMPLETE นัดหมาย-to-delivery lifecycle including multi-party meetings, transcript streaming, AI summary pipeline, EMR documentation, and ผู้ป่วย delivery — the core Phase 1 deliverable.**

**อัปเดตล่าสุด:** June 8, 2026 (v1.7.51 — see §6 Calendar sync, D4cal, 3-party Q01)

---

## 15. PostgreSQL ฐานข้อมูล Architecture

### 15.1 Deployment Infrastructure

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT WORKFLOW — DEPLOYMENT                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LOCAL (Docker Compose v1.5.6)                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Patient Portal    │  │ Doctor Portal     │  │ Meeting Server   │      │
│  │ localhost:3005    │  │ localhost:3010    │  │ localhost:3020   │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘      │
│           │                     │                      │                │
│           └─────────────────────┼──────────────────────┘                │
│                                 ▼                                        │
│                    ┌──────────────────────┐                              │
│                    │ PostgreSQL 18        │                              │
│                    │ + pgvector           │                              │
│                    │ izara-postgres:5433  │                              │
│                    │ DB: izara_phase1     │                              │
│                    └──────────────────────┘                              │
│                                                                          │
│  PRODUCTION (Google Cloud)                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Patient Portal    │  │ Doctor Portal     │  │ Meeting Server   │      │
│  │ Cloud Run         │  │ Cloud Run         │  │ Cloud Run        │      │
│  │ 1CPU/1GB          │  │ 1CPU/1GB          │  │ 1CPU/2GB         │      │
│  │ asia-southeast1   │  │ asia-southeast1   │  │ asia-southeast1  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘      │
│           │                     │                      │                │
│           └─────────────────────┼──────────────────────┘                │
│                                 ▼                                        │
│                    ┌──────────────────────┐                              │
│                    │ PostgreSQL VM (GCE)  │                              │
│                    │ 35.240.157.230:5432  │                              │
│                    │ DB: izara_phase1     │                              │
│                    │ pgvector + pgcrypto  │                              │
│                    └──────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 15.2 ฐานข้อมูล Tables Used in Appointment ขั้นตอนการทำงานs

| Table | Purpose in นัดหมาย Flow | Key Columns |
| ----- | --------------------------- | ----------- |
| **นัดหมาย** | Core นัดหมาย records with full lifecycle | id, patient_id, doctor_id, requested_date/time, confirmed_date/time, สถานะ, meet_link, jitsi_room_name, urgency_level, symptoms (JSONB), ai_triage (JSONB), invitees (JSONB) |
| **meeting_records** | Video consultation session tracking | id (UUID), appointment_id, doctor_id, patient_id, room_name, jitsi_domain, สถานะ, meeting_config (JSONB), transcript, ai_summary, ai_recommendations, section_summaries (JSONB), doctor_validation_status, patient_instructions |
| **meeting_transcripts** | Speech-to-text segments from Web Speech API | id (UUID), meeting_record_id, speaker_id, speaker_role (doctor/patient/guest), content, language, confidence, start_time_seconds, is_final |
| **emr** | Electronic Medical Records (SOAP format) | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, patient_instructions, doctor_signature, signed_at, สถานะ (draft/ลงนามแล้ว) |
| **ใบสั่งยา** | E-ใบสั่งยา linked to EMR | id, emr_id, appointment_id, patient_id, medications (JSONB), cds_warnings (JSONB), สถานะ |
| **lab_orders** | Laboratory test orders from consultation | id, emr_id, appointment_id, tests (JSONB), results (JSONB), ai_analysis, สถานะ |
| **การแจ้งเตือน** | In-app การแจ้งเตือน for all participants | id (UUID), user_id, type, title/title_thai, message/message_thai, data (JSONB), read_at |
| **cds_logs** | Clinical Decision Support audit trail | id, patient_id, doctor_id, recommendation_type, severity, title, guideline_source, doctor_decision |
| **ai_validations** | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) validation records | id, type, patient_id, doctor_id, decision, content_snapshot, validated_at |
| **transcriptions_embeddings** | Vectorized transcript chunks for AI search | meeting_record_id, chunk_text, speaker_role, embedding (vector) |
| **users** | ผู้ป่วย & แพทย์ identity resolution | id, email, name, name_thai, role, doctor_id, patient_id |
| **audit_logs** | Compliance audit trail for all actions | user_id, patient_id, การกระทำ, entity_type, details (JSONB) |


### 15.3 Appointment Status State Machine in PostgreSQL

```sql
-- Appointment status transitions stored in appointments table
-- Valid statuses: pending, in_pool, awaiting_doctor_response, assigned, confirmed, completed, cancelled, declined

-- Patient creates request
INSERT INTO appointments (id, patient_id, doctor_id, status, ...) VALUES ($1, $2, $3, 'pending', ...);
-- OR: in_pool for system-assigned

-- Admin assigns doctor
UPDATE appointments SET doctor_id = $2, status = 'awaiting_doctor_response', updated_at = NOW() WHERE id = $1;

-- Doctor confirms with meeting link
UPDATE appointments SET status = 'confirmed', confirmed_date = $2, confirmed_time = $3,
  meeting_link = $4, jitsi_room_name = $5, confirmed_at = NOW() WHERE id = $1;

-- Meeting completed
UPDATE appointments SET status = 'completed', completed_at = NOW() WHERE id = $1;

-- Cancelled or declined
UPDATE appointments SET status = 'cancelled', cancellation_reason = $2, cancelled_at = NOW() WHERE id = $1;
```

### 15.4 PostgreSQL LISTEN/NOTIFY for Real-Time Updates

```sql
-- Trigger on appointments table fires on INSERT/UPDATE/DELETE
-- pgNotifyListener bridges PostgreSQL → Socket.IO
CREATE OR REPLACE FUNCTION notify_appointment_change() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('db_changes', json_build_object(
    'table', 'appointments',
    'operation', TG_OP,
    'id', COALESCE(NEW.id, OLD.id)
  )::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Real-time flow

```text
PostgreSQL appointments table UPDATE
  → pg_notify('db_changes', {...})
  → pgNotifyListener.cjs / pgNotifyListener.ts catches event
  → Socket.IO emits 'appointment:updated' to relevant rooms
  → Patient Portal: updates appointment status in real-time
  → Doctor Portal: updates Patient Queue / Scheduled Meetings
```

### 15.5 Cross-Service Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                  APPOINTMENT DATA FLOW ACROSS SERVICES                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PATIENT PORTAL (port 3005)                                              │
│  ├── POST /api/appointments → INSERT INTO appointments (pending)         │
│  ├── GET /api/appointments/my → SELECT FROM appointments WHERE patient   │
│  ├── GET /api/doctors → SELECT FROM doctors (for selection)              │
│  └── WebSocket: appointment:updated → real-time status changes           │
│                                                                          │
│  DOCTOR PORTAL (port 3010)                                               │
│  ├── GET /api/dashboard/:id → SELECT FROM appointments + emr + stats     │
│  ├── PUT /api/appointments/:id → UPDATE appointments (confirm/decline)   │
│  ├── POST /api/meetings/create → INSERT INTO meeting_records             │
│  ├── POST /api/emr → INSERT INTO emr (SOAP documentation)               │
│  ├── POST /api/emr/:id/sign → UPDATE emr SET status='signed'            │
│  ├── POST /api/prescriptions → INSERT INTO prescriptions                 │
│  └── WebSocket: appointment:updated, emr:updated → real-time updates     │
│                                                                          │
│  MEETING SERVER (port 3020)                                              │
│  ├── POST /api/meetings/create → INSERT INTO meeting_records             │
│  ├── POST /api/meetings/:id/transcript → INSERT INTO meeting_transcripts │
│  ├── POST /api/meetings/:id/generate-summary → Gemini AI → UPDATE       │
│  ├── POST /api/meetings/:id/end → UPDATE meeting_records                 │
│  └── WebSocket: transcript segments + meeting state changes               │
│                                                                          │
│  ALL SERVICES → SAME PostgreSQL (izara_phase1)                           │
│  ├── Local: izara-postgres:5432 (Docker internal)                        │
│  └── Cloud: 35.240.157.230:5432 (GCE VM)                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 15.6 Meeting AI Pipeline ฐานข้อมูล Flow

```text
Step 1: Meeting created → INSERT INTO meeting_records (status: 'scheduled')
Step 2: Doctor starts → UPDATE meeting_records SET status='active', started_at=NOW()
Step 3: Transcript streaming → INSERT INTO meeting_transcripts (each segment)
Step 4: Chat messages → POST /api/meetings/:id/chat (stored in meeting record)
Step 5: Meeting ends → UPDATE meeting_records SET status='completed', ended_at=NOW()
Step 6: AI processes → POST /api/meetings/:id/generate-summary
  → Gemini receives: transcript + chats + patient PHR context
  → UPDATE meeting_records SET ai_summary=$1, ai_recommendations=$2, section_summaries=$3
Step 7: Doctor validates → POST /api/meetings/:id/validate
  → UPDATE meeting_records SET doctor_validation_status='approved', validated_at=NOW()
Step 8: EMR created → INSERT INTO emr (pre-filled from AI summary)
Step 9: EMR signed → UPDATE emr SET status='signed', doctor_signature=$1, signed_at=NOW()
Step 10: Patient notified → INSERT INTO notifications (type: 'emr_signed')
Step 11: Embeddings → INSERT INTO transcriptions_embeddings (vectorized chunks for future AI search)
```

---

## 16. Appointment Scenario Coverage Matrix

| # | Scenario | ผู้ป่วย การกระทำ | Doctor/Admin การกระทำ | สถานะ Flow | DB Tables Affected |
| - | -------- | -------------- | ------------------- | ----------- | ------------------ |
| 1 | Normal booking (specific แพทย์) | จองนัด with แพทย์ selected | แพทย์ confirms | รอดำเนินการ → ยืนยันแล้ว | นัดหมาย, การแจ้งเตือน |
| 2 | Pool booking (system-assigned) | จองนัด without แพทย์ | ผู้ดูแลระบบ assigns → แพทย์ confirms | รอจัดสรร → awaiting_doctor_response → ยืนยันแล้ว | นัดหมาย, การแจ้งเตือน |
| 3 | ผู้ดูแลระบบ direct ยืนยัน | จองนัด นัดหมาย | ผู้ดูแลระบบ confirms directly | รอดำเนินการ → ยืนยันแล้ว | นัดหมาย, การแจ้งเตือน |
| 4 | แพทย์ declines | จองนัด นัดหมาย | แพทย์ declines with reason | รอดำเนินการ → declined | นัดหมาย, การแจ้งเตือน |
| 5 | ผู้ป่วย cancels | Cancel นัดหมาย | — | any → cancelled | นัดหมาย, การแจ้งเตือน |
| 6 | Meeting completed (telehealth) | Join meeting | Host meeting → EMR → Sign | ยืนยันแล้ว → completed | นัดหมาย, meeting_records, meeting_transcripts, emr, ใบสั่งยา, lab_orders, การแจ้งเตือน |
| 7 | Meeting completed (onsite) | Visit clinic | Document EMR | ยืนยันแล้ว → completed | นัดหมาย, emr, ใบสั่งยา |
| 8 | AI triage with urgency | Describe symptoms | Review AI triage level | รอดำเนินการ (with ai_triage JSONB) | นัดหมาย |
| 9 | Multi-party meeting | Invite relatives | Invite specialists → Admit all | ยืนยันแล้ว → completed | นัดหมาย, meeting_records |
| 10 | Guest join (non-registered) | Share link externally | Admit from lobby | — | meeting_records |
| 11 | Rescheduled นัดหมาย | — | Admin/Doctor reschedules | ยืนยันแล้ว → ยืนยันแล้ว (new date) | นัดหมาย, การแจ้งเตือน |
| 12 | E-Prescribing after meeting | — | Create ใบสั่งยา | — | ใบสั่งยา, cds_logs |
| 13 | Lab order after meeting | — | Order lab tests | — | lab_orders |
| 14 | AI pre-consultation summary | — | Review AI summary before meeting | — | phr, emr (read), ai_validations |
| 15 | CDS drug interaction alert | — | Accept/reject/modify | — | cds_logs, ใบสั่งยา |
| 16 | ผู้ป่วย instruction sheet | View instructions | Generate + validate | — | emr, ai_validations, การแจ้งเตือน |


---

## 17. API Endpoints Summary (Appointment ขั้นตอนการทำงาน)

### Patient Portal APIs

| Method | Endpoint | คำอธิบาย | DB Operation |
| ------ | -------- | ----------- | ------------ |
| POST | `/api/appointments` | Create appointment request | INSERT appointments |
| GET | `/api/appointments/my` | List patient's appointments | SELECT appointments WHERE patient_id |
| GET | `/api/appointments/:id` | Get appointment details | SELECT appointments WHERE id |
| PUT | `/api/appointments/:id/status` | Update status (cancel) | UPDATE appointments |
| DELETE | `/api/appointments/:id` | Cancel appointment | UPDATE appointments SET status='cancelled' |
| GET | `/api/doctors` | List available doctors | SELECT FROM doctors |
| GET | `/api/doctors/:id/slots` | Get doctor's available slots | SELECT FROM doctor_schedules |


### Doctor Portal APIs

| Method | Endpoint | คำอธิบาย | DB Operation |
| ------ | -------- | ----------- | ------------ |
| GET | `/api/dashboard/:doctorId` | Dashboard with appointment stats | SELECT appointments + emr + stats |
| PUT | `/api/appointments/:id` | Confirm/decline appointment | UPDATE appointments |
| POST | `/api/meetings/create` | Create meeting session | INSERT meeting_records |
| POST | `/api/emr` | Create EMR record | INSERT emr |
| POST | `/api/emr/:id/sign` | Sign and finalize EMR | UPDATE emr SET status='signed' |
| POST | `/api/prescriptions` | Create prescription | INSERT prescriptions |
| POST | `/api/lab-orders` | Create lab order | INSERT lab_orders |
| GET | `/api/ai/pre-summary/:patientId` | AI pre-consultation summary | SELECT phr, emr → Gemini AI |


### Meeting Server APIs

| Method | Endpoint | คำอธิบาย | DB Operation |
| ------ | -------- | ----------- | ------------ |
| POST | `/api/meetings/create` | Create meeting room | INSERT meeting_records |
| POST | `/api/meetings/:id/start-transcription` | Start transcript | UPDATE meeting_records |
| POST | `/api/meetings/:id/transcript` | Submit transcript segment | INSERT meeting_transcripts |
| POST | `/api/meetings/:id/generate-summary` | AI summary generation | UPDATE meeting_records (ai_summary) |
| POST | `/api/meetings/:id/validate` | Doctor validates AI output | UPDATE meeting_records, INSERT ai_validations |
| POST | `/api/meetings/:id/end` | End meeting | UPDATE meeting_records SET status='completed' |

---

## PostgreSQL transactional rollback (interrupted booking)

ผู้ป่วย booking runs inside a database transaction. If the client disconnects or the server errors after a slot lock but before commit, the transaction rolls back so:

- No orphan `appointments` row remains in `in_pool` without valid slot metadata

### v1.7.49 verification (Defect PDF item 1)

- แพทย์ accept: row **updates** to `confirmed` — visible in แพทย์ **Recently Accepted** and ผู้ป่วย **ยืนยันแล้ว** tab
- แพทย์ decline: สถานะ returns to `in_pool` for reassignment
- Automated: `npm run test:unit:docker:deploy` (**2817** tests), `defectIsaraPdfMeetingQueue.test.ts` DPDF-Q*
- Queue counters stay consistent with `appointments` สถานะ

**Automated tests:** `tests/unit/patient-portal/appointmentsRollback.test.ts`, `tests/unit/patient-portal/appointmentSlotLock.test.ts`

**Cloud validation:** Group D (`tests/group-D-appointment-workflows.ui-test.ts`) after `npm run verify:gate0`

---

## Detailed ขั้นตอนการทำงาน — Queue Traceability (v1.7.51)

### Status state machine (PostgreSQL)

```text
in_pool → awaiting_doctor_response → confirmed → in_progress → completed
         ↘ declined/rejected → in_pool (reassignable)
```

### Confirm API contract (doctor portal — canonical)

All ยืนยัน paths **UPDATE** the row (never delete):

- `POST /api/appointments/:id/confirm`  
- `PUT /api/appointments/:id/status` with `status: confirmed`  

Required fields: `doctor_id`, `confirmed_by`, `confirmed_by_email`, `confirmed_at`, `jitsi_room_name`, meet URLs.

### Traceability rules

| Portal | รอดำเนินการ view | After แพทย์ accept |
|--------|--------------|---------------------|
| แพทย์ Health Meeting | ผู้ป่วย Queue (รอดำเนินการ statuses) | **Recently Accepted** (`data-testid="accepted-queue-list"`) |
| แพทย์ Pool Management | Pool / Awaiting tabs | Accepted rows with `includeAccepted=true` |
| ผู้ป่วย นัดหมาย | **รอดำเนินการ** tab | **ยืนยันแล้ว** tab (`data-testid="confirmed-tab-hint"`) |

### 7-day accepted window

แพทย์ pool API includes `confirmed` only when `confirmed_at` (or `updated_at`) is within **7 days** (`ACCEPTED_VISIBILITY_DAYS`).

### Troubleshooting

| Symptom | Resolution |
|---------|------------|
| Gone from ผู้ป่วย รอดำเนินการ | Expected — check **ยืนยันแล้ว** tab |
| Gone from แพทย์ รอดำเนินการ queue | Expected — check **Recently Accepted** |
| Empty pool with no error | Check API — pool errors now return HTTP 500, not `[]` |
| แพทย์ without specialty sees empty pool | Pool loads without specialty filter (v1.7.51) |

**Tests:** `defectIsaraPdfMeetingQueue.test.ts` DPDF-Q*, `group-D-queue-accept-traceability.ui-test.ts`

### Unified patient Queue tab (v1.7.52)

- Default filter **Queue** shows รอดำเนินการ statuses **plus** `confirmed` within 7 days (recently accepted stay visible).
- **ยืนยันแล้ว** tab lists all ยืนยันแล้ว นัดหมาย.
- Session auth only — no JWT on API calls.
