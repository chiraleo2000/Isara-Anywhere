# Izara Telemedicine Appointment Workflows

This document details the full appointment workflow for Izara Telemedicine, covering video consultations, EMR documentation, and AI-assisted post-consultation features. This is the **core Phase 1 deliverable** covering the complete end-to-end flow: Appointment → Approval → Meeting (Microsoft Teams-like) → AI Summary → EMR → Patient Delivery.

**Last Updated:** March 31, 2026 (v1.6.0 - PostgreSQL Database Architecture, Deployment Descriptions, Dataflow Coverage)

---

## 📋 Overview

### Phase 1 Feature Summary

| Feature | Status | Description |
| --------- | -------- | ------------- |
| **Video Meeting (Jitsi)** | ✅ | Doctor as HOST, patient lobby, guest invites |
| **EMR Documentation** | ✅ | SOAP format during/after meeting |
| **PostgreSQL Database** | ✅ | All data stored in PostgreSQL (NO GCS) |
| **AI Pre-Consultation Summary** | ✅ | AI summarizes patient history before meeting |
| **AI Chat Assistant** | ✅ | Helps doctor during consultation |
| **Patient Instruction Sheet** | ✅ | Auto-generated post-consultation instructions |
| **Clinical Decision Support** | ✅ | Drug interaction & dose adjustment alerts |
| **Man-in-the-Loop Validation** | ✅ | Doctor approval before AI content goes to patient |
| **Device Speech-to-Text** | ✅ | Free browser-based dictation (Web Speech API) |
| **Transcript Streaming Control** | ✅ | Doctor (HOST) starts/stops real-time transcript during meeting |
| **Chat Integration** | ✅ | In-meeting text chat aggregated into AI summary |
| **Multi-Party Meeting** | ✅ | Patient relatives, friends, other doctors, admin can join |
| **Guest Self-Registration** | ✅ | Non-registered users create display name from blank and join lobby |
| **Post-Meeting AI Pipeline** | ✅ | AI summarizes from video input + transcript + chats |
| **Patient Instruction Sheet** | ✅ | Auto-generated post-consultation instructions (Thai PDF) |
| **EMR Auto-Population** | ✅ | AI pre-fills SOAP from meeting transcript + summary |
| **Patient Health History** | ✅ | Relevant EMR parts sent to patient's Health History page |

### Test Credentials

| Role | Email | Password | Portal |
| ------ | ------- | ---------- | -------- |
| Patient | <demo.test@gmail.com> | P@ssw0rd | localhost:3005 |
| Patient | <Somchai.Mankong@gmail.com> | P@ssw0rd | localhost:3005 |
| Patient | <Anan.Khayanrian@gmail.com> | P@ssw0rd | localhost:3005 |
| Doctor | <doctor.test@izara.com> | IzaraDoctor@2024 | localhost:3010 |
| Admin | <admin.test@izara.com> | IzaraAdmin@2024 | localhost:3010 |

---

## Meeting Feature Summary ✅

| Feature | Status | Description |
| --------- | -------- | ------------- |
| Doctor as HOST | ✅ | Only doctor can start/control meeting |
| Patient Lobby | ✅ | Patient waits for doctor approval |
| Guest Invites | ✅ | Relatives/consultants via email |
| Guest Lobby | ✅ | All guests wait for doctor approval |
| **External Guest Access** | ✅ | **Non-registered users can join via invite links** |
| Camera (Default ON) | ✅ | `startWithVideoMuted=false` |
| Microphone (Default ON) | ✅ | `startWithAudioMuted=false` |
| Text Chat | ✅ | Always available |
| Video Recording | ✅ | Stored to izara-doctors-data |
| Transcription | ✅ | Google Speech-to-Text |
| AI Summary | ✅ | Gemini AI with 30-min sections |
| Doctor Portal Delivery | ✅ | Summary in reports |

### Test Users

| Role | Email | Password | Portal |
| ------ | ------- | ---------- | -------- |
| Doctor | <doctor.test@izara.com> | IzaraDoctor@2024 | localhost:3010 |
| Patient | <demo.test@gmail.com> | P@ssw0rd | localhost:3005 |
| Patient Relative (demo2) | <demo2.test@gmail.com> | P@ssw0rd | localhost:3005 |
| Admin/Unit Test Doctor | <doctorunit.test@izara.com> | P@ssw0rd | localhost:3010 |

### External Guest Access (Non-Registered Users) ✅

External guests who are **NOT registered** in the Izara system can join meetings:

| Guest Type | Who Can Invite | Example Emails |
| ------------ | ---------------- | ---------------- |
| Patient Relative | Patient | <mother@gmail.com>, <father@hotmail.com> |
| Patient Partner | Patient | <spouse@outlook.com> |
| Doctor Specialist | Doctor | <dr.cardio@privatehospital.co.th> |
| Doctor Advisor | Doctor | <professor@university.ac.th> |
| Other | Both | <any.guest@anydomain.xyz> |

## How External Guests Join

1. Doctor/Patient creates invite → System generates secure token
2. Guest receives invite URL (via email or shared link)
3. Guest clicks link → No login required
4. Guest enters lobby → Doctor approves
5. Guest joins meeting with video/audio ON

---

## Production Deployment URLs

| Portal | URL | Version |
| -------- | ----- | --------- |
| Patient Portal | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> | v1.4.4 |
| Doctor Portal | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> | v1.4.4 |

### Docker Images (v1.4.4)

| Portal | Image |
| -------- | ------- |
| Patient Portal | `asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-patient-portal:1.4.4` |
| Doctor Portal | `asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-doctor-portal:1.4.4` |

### Video Meeting Provider

- **Jitsi Meet** (meet.jit.si) - FREE, no account required

- Doctor acts as HOST with lobby/moderator controls

- Patient joins via personalized URL

---

## 0. Login & Authentication

- **Patient**
  - Logs in via Patient Portal (`LoginPage.tsx`)
  - Accesses dashboard, appointment booking, health logs

- **Doctor/Admin**
  - Logs in via Doctor Portal (`DoctorDashboard.tsx`)
  - Admin is also a doctor with elevated privileges
  - Admin can book/accept/assign appointments + manage doctor roles

---

## 1. Appointment Booking (Patient Side)

- **Options**
  - System-assigned (Patient chooses "Let system assign doctor") or specific doctor selection
  - Invite relatives/consultants
  - Choose online (telemedicine) or onsite appointment

- **Process**
  - Patient fills out symptoms (with AI assistance), preferred date/time, doctor selection, invitees
  - Can attach voice recordings or images for symptom description
  - AI analyzes symptoms and suggests urgency level + specialty
  - Submits request
  - Backend creates appointment record:
    - Patient info, doctor preference, invitees, symptoms, requested date/time
    - Status: `pending` (if doctor selected) or `in_pool` (if system-assigned)
    - Type: `online` or `onsite`

---

## 2. Patient Queue - Appointments Awaiting Confirmation

### IMPORTANT: Patient Queue shows ALL pending appointments from ALL dates (not just today)

- **Location**: "Appointments & Meetings" page (`HealthMeeting.tsx`) → Patient Queue tab

- **What appears in Patient Queue**:
  - ALL appointments with status: `pending`, `in_pool`, `awaiting_doctor_response`, `assigned`
  - Sorted by: Urgency (emergency → urgent → normal) then by creation date (FIFO)

- **Doctor View**:
  - Sees only appointments assigned to them
  - Can confirm or decline appointments

- **Admin View**:
  - Sees ALL pending appointments (regardless of doctor assignment)
  - Can assign unassigned appointments to doctors
  - Can confirm appointments directly

- **Confirmation Process**:
  1. Doctor/Admin clicks "Confirm Appointment" on a queue item
  2. Modal shows: Patient info, requested date/time, AI analysis
  3. Doctor/Admin sets CONFIRMED date and time (can modify from patient's request)
  4. Doctor/Admin adds optional notes
  5. On confirm: Meeting link generated, status → `confirmed`, appointment moves to Scheduled Meetings

---

## 3. Doctor/Admin Appointment Confirmation

- **From Patient Queue Tab**:
  - View all pending appointment requests
  - See patient details, symptoms, AI triage, urgency level
  - Confirm with date/time selection
  - Decline with reason

- **Process**:
  1. Doctor/Admin reviews patient request in queue
  2. Clicks "Confirm Appointment"
  3. Sets final appointment date and time
  4. **For telehealth appointments**: System generates Jitsi Meet link automatically
  5. Status: `confirmed`
  6. **Notifications sent**:
     - In-app notification to patient
     - Email with meeting link (Thai template)
     - Meeting link saved to appointment record
  7. Appointment moves to "Scheduled Meetings" tab
  8. **Patient can see** meeting link in their appointments page

- **Meeting Link Generation**:
  - Provider: Jitsi Meet (meet.jit.si)

- Format: `<https://meet.jit.si/Izara-{appointmentId}-{timestamp}-{random}`>
  - No account required for patient or doctor
  - Link is clickable from both portals

- **If Declined**:
  - Status: `declined`
  - Reason recorded
  - Patient notified via email
  - Appointment removed from queue

---

## 4. Scheduled Meetings Tab

### Only CONFIRMED appointments appear here

- **Contents**:
  - Appointments with status: `confirmed`, `scheduled`
  - Shows: Patient name, date/time, meeting link, symptoms

- **Actions**:
  - Join Meeting (opens Google Meet link)
  - Add to Calendar
  - Send Invite (email to participants)
  - Copy Link

---

## 5. Admin-Only: All Appointments Tab

- **Purpose**: Overview of all appointments in the system

- **Features**:
  - Search by patient name/email
  - Filter by status
  - Assign unassigned appointments
  - View complete appointment history

---

## 6. Notification & Calendar Update

- **Patient**
  - Sees appointment in dashboard calendar (`DashboardPage.tsx`)
  - Receives meeting link and CONFIRMED time (online)
  - Receives onsite details (onsite)

- **Doctor**
  - Sees appointment in Scheduled Meetings tab
  - Receives meeting link and time (online)
  - Receives onsite details (onsite)

- **Relatives/Consultants**
  - Receive email/calendar invite with meeting link (online)

- **Admin**
  - Receives notifications for declined appointments and cancellations

---

## 7. Meeting Link Generation (Jitsi Meet)

- **Online Telehealth Appointments**
  - **Provider**: Jitsi Meet (meet.jit.si) - FREE, no account required
  - Meeting links generated when doctor/admin CONFIRMS the appointment
  - **Room name format**: `Izara-Med-{appointmentId}-{timestamp}-{hash}`
  - **Three URL variants generated**:
    - `doctorMeetingUrl` - Doctor joins as HOST (first to join gets moderator rights)
    - `patientMeetingUrl` - Patient URL with pre-filled name (waits in lobby)
    - `guestMeetingUrl` - For family members or other consultants (waits in lobby)
  - **Features enabled**:
    - Lobby feature (doctor approves ALL participants)
    - Local recording (browser-based, max 200MB)
    - Thai language interface
    - Screen sharing for medical images
    - No Jitsi account required
    - Camera ON by default
    - Microphone ON by default
    - Text chat always available
  - If meeting link fails to generate, fallback notification is sent to all parties

### Guest Invite System (NEW)

- **Patient Relatives**: Can be invited by doctor via email

- **Doctor Consultants/Specialists**: Can be invited for second opinions

- **Process**:
  1. Doctor clicks "Invite Guest" in meeting controls
  2. Enters guest email, name, and type (relative/consultant)
  3. System generates unique invite token
  4. Email sent to guest with join link containing invite token
  5. Guest clicks link → waits in lobby
  6. Doctor approves guest from lobby
  7. Guest joins meeting

- **Onsite Appointments**
  - No meeting link generated
  - Notification and calendar event sent to doctor with patient symptoms and details

---

## 7a. Video Meeting Execution

### Meeting Flow (Jitsi Meet with Host Controls)

1. **Doctor starts meeting** (acts as HOST/MODERATOR - ONLY DOCTOR CAN START)
   - Doctor opens Scheduled Meetings tab
   - Clicks "Join Meeting" / "🎥 เข้าร่วมประชุม"
   - Uses `doctorMeetingUrl` which grants moderator privileges
   - Jitsi pre-join screen shows camera/mic preview
   - **Default: Camera ON, Microphone ON**
   - Doctor clicks "Join" to enter room AS HOST
   - **HOST CONTROLS AVAILABLE**:
     - Enable/disable lobby (default: enabled)
     - Kick participants
     - Mute all
     - Start/stop recording
     - Invite additional participants (guests)
     - Approve/reject participants from lobby

2. **Patient joins meeting (WAITS IN LOBBY)**
   - Patient sees meeting link in "นัดหมายของฉัน" page
   - Clicks "เข้าห้องประชุมเลย" button
   - Uses `patientMeetingUrl` with pre-filled display name
   - **Patient enters LOBBY automatically**
   - **Waits for doctor approval**
   - Doctor sees "Patient waiting in lobby" notification
   - Doctor clicks "Admit" to allow patient in
   - **Default: Camera ON, Microphone ON**
   - Enters Jitsi room as participant (not moderator)

3. **Guest/Family joins meeting** (LOBBY REQUIRED)
   - Doctor sends invite via "Invite Guest" button
   - Guest receives email with unique invite token
   - Guest clicks invite link
   - **Guest enters LOBBY automatically**
   - **Waits for doctor approval**
   - Doctor sees "Guest waiting in lobby" notification
   - Doctor can see guest name and type (relative/consultant)
   - Doctor clicks "Admit" or "Reject"
   - **Default: Camera ON, Microphone ON**
   - Joins as participant (not moderator)

4. **During meeting**
   - Video/audio consultation (all participants)
   - **Text chat available** for all participants — ALL chat messages are captured and included in AI summary
   - **Screen sharing** for medical images
   - **Local recording** (if enabled by doctor)
   - Users can mute/unmute their camera/mic at any time
   - **Doctor controls transcript streaming**: START / PAUSE / STOP
   - Transcript runs in real-time alongside the meeting
   - Chat messages timestamped and attributed to speakers

5. **Meeting ends**
   - Doctor ends the meeting (host control)
   - Recording saved locally on doctor's device
   - **Comprehensive post-meeting AI processing**:
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
     - Summary delivered to Doctor Portal → Health Meeting page
     - Doctor reviews (Man-in-the-Loop) → Approves → EMR generated
     - EMR report stored in PostgreSQL
     - Relevant parts sent to Patient Portal → Health History page

---

## 7b. COMPREHENSIVE END-TO-END MEETING WORKFLOW (Microsoft Teams-Like Experience)

### Overview

The meeting experience is designed to work like **Microsoft Teams** — the doctor acts as HOST who controls all aspects of the meeting including admitting participants, starting/stopping transcript streaming, managing recording, and processing the AI summary afterward.

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
| Doctor (HOST) | `doctor.test@izara.com` | IzaraDoctor@2024 | Doctor Portal | Moderator |
| Patient | `demo.test@gmail.com` | P@ssw0rd | Patient Portal | Participant (lobby) |
| Patient Relative | `demo2.test@gmail.com` | P@ssw0rd | Patient Portal | Guest (lobby) |
| Admin/2nd Doctor | `admin.test@izara.com` | IzaraAdmin@2024 | Doctor Portal | Participant (lobby) |
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

```text
Doctor's device → POST /api/video-meeting/:appointmentId/end
                  └─→ Video uploaded to GCS (izara-doctors-data)
                  └─→ Audio transcribed via Speech-to-Text
                  └─→ AI summary generated via Gemini
                  └─→ 30-min section summaries (for long meetings)
                  └─→ Recommendations generated for doctor
                  └─→ Summary delivered to Doctor Portal
```

### GCS Storage Structure

```text
izara-doctors-data/
└── doctors/{doctorId}/
    └── meetings/{appointmentId}/
        ├── recording.webm         # Video recording (max 200MB)
        ├── transcript.txt         # Thai transcription
        ├── summary.txt            # AI-generated SOAP summary
        ├── recommendations.txt    # Clinical decision support
        ├── section-0-summary.txt  # First 30-min section (if >30 min)
        ├── section-1-summary.txt  # Second 30-min section
        └── final-combined.txt     # Combined summary from all sections
```

### 30-Minute Sectioned Summaries

For meetings longer than 30 minutes:

1. Transcript split into 30-minute sections
2. Each section generates its own summary
3. All sections combined into final comprehensive summary
4. Both individual and combined summaries stored
5. Doctor sees combined summary in portal

---

## 8. Patient Cancellation

- **If patient cancels before meeting time**
  - Appointment is removed immediately
  - Status: `cancelled`
  - Notification sent to doctor and admin
  - Dashboard/calendar updated for both patient and doctor

---

## 9. Meeting Execution & Recording

### Online Telehealth (Jitsi Meet)

1. **All participants join via Jitsi meeting link at scheduled time**
2. **Doctor acts as HOST** with recording permissions
3. **During meeting:**
   - Video/audio medical consultation
   - Screen sharing for medical images/reports
   - Local recording enabled
4. **Meeting ends:**
   - Doctor ends meeting
   - Recording uploaded to GCS via API

### Recording & Transcription Flow

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  POST-MEETING AI PROCESSING                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Video Upload                                                          │
│     └─→ POST /api/video-meeting/:id/end                                  │
│     └─→ Video → GCS: izara-doctors-data/doctors/{doctorId}/meetings/     │
│                                                                           │
│  2. Speech-to-Text Transcription                                          │
│     └─→ Audio extracted → Google Cloud Speech-to-Text API                │
│     └─→ Thai/English medical speech recognition                          │
│     └─→ Output: transcript.txt                                           │
│                                                                           │
│  3. AI Summary Generation (Gemini)                                        │
│     └─→ Transcript → Gemini AI                                           │
│     └─→ Thai SOAP format: อาการสำคัญ, ประวัติ, การตรวจ, การวินิจฉัย      │
│     └─→ Output: summary.txt                                              │
│                                                                           │
│  4. Doctor Recommendations (Gemini)                                       │
│     └─→ Clinical decision support                                        │
│     └─→ Differential diagnosis suggestions                               │
│     └─→ Output: recommendations.txt                                      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Onsite Appointments

- Patient arrives at clinic

- Doctor refers to calendar and email for symptoms/details

- No recording or transcription needed

---

## 10. Post-Meeting Actions (Doctor Side)

### 10.1 EMR Documentation Flow

1. **Doctor opens EMR Editor** (`CompleteEMREditor.tsx`)
   - Uses Thai OPD Card format (มาตรฐานกระทรวงสาธารณสุข)
   - Tabs: ประวัติ (S), ตรวจร่างกาย (O), การวินิจฉัย (A), การรักษา (P), สรุป AI
   - **NEW: AI-generated content from meeting transcript available**

2. **Doctor fills EMR sections:**
   - Chief complaint and history (auto-populated from AI if meeting)
   - Physical examination and vital signs
   - Diagnosis (ICD-10 codes)
   - Treatment plan and follow-up instructions

3. **AI Summary Generation:**
   - AI (Gemini) generates patient-friendly summary
   - AI generates meeting transcript (if telemedicine)
   - **NEW: Doctor reviews AI recommendations panel**
   - Doctor reviews and may edit AI content

4. **Doctor signs EMR:**
   - Clicks "ลงนามและส่งให้ผู้ป่วย" (Sign and Send to Patient)
   - Digital signature applied
   - Status changes to `finalized`

### 10.2 Prescription Documentation

1. **Doctor opens E-Prescribing** (`CompletePrescribing.tsx`)
   - Searches for medications
   - System checks for allergies and drug interactions
   - Doctor adds medications with dosage and instructions

2. **Prescription saved:**
   - Prescription saved to `prescriptions.json`
   - **Prescription sent to patient health logs** (`health-logs.json`)
   - Patient can view prescribed medications in Health Studio

### 10.3 EMR Delivery to Patient

## What gets sent to patient's health logs

- Chief complaint

- Diagnosis (descriptions only, not internal notes)

- Treatment plan

- **Medications/Prescriptions** (drug names, dosages, instructions)

- Follow-up date and instructions

- AI Summary (patient-friendly version)

- Doctor's signature timestamp

## What does NOT get sent to patient

- Internal doctor comments/notes

- Raw clinical assessments

- Drug interaction warnings marked as internal

- Doctor-to-doctor communications

## Delivery Flow

1. EMR signed → POST to `/api/patients/{patientId}/health-logs`
2. Data saved to GCS: `patients/{patientId}/health-logs.json`
3. Patient notification sent
4. Patient views in Health Studio → ผลการรักษา (Treatment Results)
5. Patient views in Latest Appointment Result on dashboard

### 10.4 If EMR Not Signed

- Patient cannot access EMR in health logs

- Status: `awaiting signature`

- Notification sent to doctor to complete signature

---

## 11. Error Handling & Edge Cases

- Status: `declined`
  - Patient notified with reason
  - Patient can request new appointment

  - Status: `cancelled`
  - Appointment removed
  - Doctor/admin notified

  - Fallback notification sent
  - Admin prompted to resolve

  - No meeting link
  - Doctor receives symptoms/details in email and calendar

  - Patient cannot access EMR
  - Doctor notified to sign

---

## 11a. Recent UI/UX Edge Case Fixes (2025-12-11)

### 1. "Assign to Doctor" Button in Patient Queue (HealthMeeting.tsx)

**Problem:** Admin could not see the assign button for appointments already assigned to a doctor.
**Fix:** Button now shows for ALL appointments when admin is logged in.

- Button text dynamically changes:
  - `📋 Assign to Doctor` — for unassigned appointments
  - `🔄 Reassign to Different Doctor` — for already assigned appointments

### 2. Dashboard Correlation with Appointments & Meetings (DoctorDashboard.tsx)

**Problem:** Dashboard stats cards did not link to the Appointments & Meetings page.
**Fix:** Made 3 relevant stats cards clickable with navigation to `/doctor/{userId}/health-meeting`:

- "Today's Appointments" (blue card) → Clickable

- "In Queue" (orange card) → Clickable

- "Need Confirmation" (amber card) → Clickable

- Added visual feedback: `cursor-pointer`, `hover:shadow-lg`, `hover:border-{color}-400`, and `transition-all` for better UX.

### 3. Scheduled Meetings Tab - Full Meeting Details (HealthMeeting.tsx)

**Problem:** Scheduled Meetings tab only showed basic info, lacking prominent meeting link and calendar details.
**Fix:** Complete redesign of Scheduled Meetings display:

- **Date/Time Section**: Prominent card with icons showing scheduled date, time, and duration

- **Meeting Link Section**: Blue highlighted box with:
  - Full meeting link visible (clickable)
  - Copy button with confirmation alert

- **Participants Section**: Enhanced with email addresses visible

- **Action Buttons**: More prominent with icons:
  - "🎥 Join Now" - Large emerald button
  - "📅 Add to Calendar" - Blue button
  - "✉️ Send Invite" - Purple button
  - "🔗 Copy Link" - Gray button

### 4. Patient Portal - นัดหมายของฉัน (AppointmentPages.tsx)

**Problem:** Confirmed appointments didn't prominently show meeting details and join options.
**Fix:** Added special display for confirmed appointments:

- **Green highlighted card** for confirmed appointments

- **Date/Time Grid**: Clear display of scheduled date and time

- **Meeting Link Section** (for telehealth):
  - Full meeting link visible
  - Copy button with Thai confirmation ("คัดลอกลิงก์แล้ว!")

- **Quick Join Button**: "🎥 เข้าห้องประชุมเลย" - One-click to open meeting

- Separate handling for pending vs confirmed status display

### 5. Data Sync Fix - Appointment Details (appointments.ts backend)

**Problem:** Patient portal's `getById` only read from individual `details.json` files, missing updates from doctor confirmation.

## Fix

- Patient portal now checks `appointments.json` first (most up-to-date after confirmation)

- Falls back to individual `details.json` if not found

- Merges meeting link data from `meeting-link.json` if available

- Doctor portal now saves full appointment details to BOTH `appointments.json` AND `appointments/{id}/details.json`

### 6. Doctor's Scheduled Meetings Not Showing (HealthMeeting.tsx) - 2025-12-11

**Problem:** Doctor who assigned and confirmed appointments could not see them in the 📅 Scheduled Meetings tab (showing 0) while patient portal correctly showed the meeting.

**Root Cause:** When confirming an appointment, the `doctorId` and `assignedDoctorId` fields used fallback logic with `||` operator:

```javascript
// OLD (broken): Kept old value like 'unassigned' or another doctor's ID
doctorId: apt.doctorId || doctor.id,
assignedDoctorId: apt.assignedDoctorId || doctor.id,
```

This meant if the patient booked with `doctorId: 'unassigned'` or selected a different doctor initially, the confirming doctor's ID was NOT set, causing the Scheduled Meetings filter to miss these appointments.

**Fix:** Changed to ALWAYS set the confirming doctor's ID:

```javascript
// NEW (fixed): Always set confirming doctor as the owner
doctorId: doctor.id,
assignedDoctorId: doctor.id,
adminAssignedDoctorId: apt.adminAssignedDoctorId || doctor.id,
doctorName: doctor.name,
doctorEmail: doctor.email,
```

**Additional Fix in DoctorDashboard.tsx:** Added `confirmedBy` field check to appointment filtering:

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
4. **Added verification step**: After saving, system verifies the appointment was actually updated
5. **Added delays**: Small delays (300-500ms → 1000ms) after GCS writes to allow propagation

## CRITICAL ROOT CAUSE FIX (2025-12-11 Late Evening)

**THE REAL BUG #1:** The confirmation handler was using `saveAllAppointments()` which ONLY writes to `appointments.json` master list. It was NOT writing the individual appointment file at `appointments/{id}.json`. When the patient portal or other components tried to read the updated appointment details, they got stale data from the individual file!

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

**THE REAL BUG #2 (EVEN MORE CRITICAL):** Some doctors (like <doctor.test@izara.com>) have NO `userId` in the system! When confirming appointments, the code was setting `doctorId: doctor.id` which resulted in `doctorId: undefined` in the saved appointment. The filter then couldn't match these appointments.

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

- Doctors now see ALL appointments they confirm in their Scheduled Meetings tab **EVEN WITHOUT A userId**

- Dashboard stats correctly count today's appointments

- **Both portals now have synchronized appointment data** - reads from SAME GCS files

- Cache issues resolved - data always fresh from GCS

- Individual appointment files now stay in sync with master list

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

### Appointments & Meetings Page (`HealthMeeting.tsx`)

| Tab | Visible To | Content |
| ----- | ----------- | --------- |
| Patient Queue | All (Doctor/Admin) | ALL pending appointments awaiting confirmation |
| Scheduled Meetings | All (Doctor/Admin) | CONFIRMED appointments with meeting links |
| All Appointments | Admin only | Complete list with search/filter |

### Key Points

- **Patient Queue**: Shows appointments from ALL dates (not just today)

- **No separate "Patient Pool" tab** - merged into Patient Queue

- Admin sees all appointments; Doctor sees only assigned appointments

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

| Step | User | Page/Component | Action/Option | Metadata/Status Update |
| --------------------- | --------- | --------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| Login | Patient | LoginPage.tsx | Login | session |
| Login | Doctor | DoctorDashboard.tsx | Login | session |
| Book Appointment | Patient | AppointmentPages.tsx | Select doctor or system-assign, symptoms, date/time | status: pending/in_pool |
| View Queue | Doctor/Admin | HealthMeeting.tsx (Patient Queue) | See ALL pending appointments | - |
| Assign Doctor | Admin | HealthMeeting.tsx (Patient Queue) | Assign unassigned appointment to doctor | status: awaiting_doctor_response |
| Confirm Appointment | Doctor/Admin | HealthMeeting.tsx (Patient Queue) | Set date/time, generate Jitsi meeting link | status: confirmed, meetingLink |
| Decline | Doctor | HealthMeeting.tsx | Decline with reason, notify patient | status: declined |
| View Scheduled | Doctor/Admin | HealthMeeting.tsx (Scheduled) | View confirmed appointments, join meeting | - |
| Manage All | Admin | HealthMeeting.tsx (All Appointments) | Search, filter, manage all appointments | - |
| Patient Cancel | Patient | DashboardPage.tsx | Cancel, notify doctor/admin | status: cancelled |
| Join Meeting | All | Jitsi Meet (meet.jit.si) | Join via Jitsi link (online) | meetingLink, participants |
| End Meeting | Doctor | Jitsi + API | End meeting, upload recording | videoUrl, transcript |
| AI Processing | System | Speech-to-Text + Gemini | Transcribe, summarize, recommend | transcript, summary |
| Post-Meeting | Doctor | CompleteEMREditor.tsx | Write/sign EMR with AI assistance | emr, status: completed |
| View EMR | Patient | PHRPage.tsx | View EMR in health logs (if signed) | emr, results |

---

## 16. E2E Testing — Comprehensive Meeting Workflow

### Testing Environments

| Environment | Patient Portal | Doctor Portal | Meeting Server | Database |
| ----------- | ------------- | ------------- | -------------- | -------- |
| **Local (Docker)** | localhost:3005 | localhost:3010 | localhost:3020 | localhost:5432 (izara_phase1) |
| **Cloud (GCP)** | patient-portal-xxxxx.run.app | doctor-portal-xxxxx.run.app | meeting-server-xxxxx.run.app | CloudSQL (izara_phase1) |

### Test Credentials (Deployment)

| Role | Email | Password | Portal |
| ---- | ----- | -------- | ------ |
| Doctor (HOST) | `doctor.test@izara.com` | IzaraDoctor@2024 | Doctor Portal |
| Patient | `demo.test@gmail.com` | P@ssw0rd | Patient Portal |
| Admin | `admin.test@izara.com` | IzaraAdmin@2024 | Doctor Portal |
| External Guest | (no login required) | (none) | Direct meeting link |

### Dual Portal Testing

The appointment workflow is tested end-to-end using the Selenium test suite that runs both Patient and Doctor portals simultaneously:

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
| 1 | **Pre-Meeting** | Patient logs in and books appointment | Patient | Auth + booking flow |
| 2 | **Pre-Meeting** | AI analyzes symptoms and sets urgency | System | Gemini integration |
| 3 | **Pre-Meeting** | Doctor sees pending appointment in queue | Doctor | Health Meeting queue |
| 4 | **Pre-Meeting** | Doctor confirms appointment with date/time | Doctor | Status → confirmed |
| 5 | **Pre-Meeting** | System generates Jitsi meeting URLs | System | 3 URLs: doctor/patient/guest |
| 6 | **Pre-Meeting** | Patient receives notification with link | Patient | Notification system |
| 7 | **Pre-Meeting** | AI generates pre-consultation summary | System | Requirement 2.2 |
| 8 | **Pre-Meeting** | Patient invites relatives/friends (share link) | Patient | Guest invite flow |
| 9 | **Pre-Meeting** | Doctor invites other doctors (token invite) | Doctor | Multi-party invite |
| 10 | **Meeting** | Doctor starts meeting (HOST/moderator) | Doctor | Jitsi HOST controls |
| 11 | **Meeting** | Patient enters LOBBY → Doctor admits | Both | Lobby admission |
| 12 | **Meeting** | Guest creates display name from BLANK → LOBBY | Guest | Guest self-registration |
| 13 | **Meeting** | Doctor admits/rejects guests from lobby | Doctor | Selective admission |
| 14 | **Meeting** | Doctor starts transcript streaming | Doctor | Web Speech API activation |
| 15 | **Meeting** | Real-time transcript appears with speaker labels | Both | Socket.IO streaming |
| 16 | **Meeting** | All participants can send text chat | All | Chat capture system |
| 17 | **Meeting** | Doctor pauses/resumes transcript | Doctor | HOST transcript control |
| 18 | **Meeting** | Doctor stops transcript | Doctor | Transcript finalization |
| 19 | **Meeting** | Screen sharing for medical images | Doctor | Jitsi screen share |
| 20 | **Meeting** | Demo meeting with simulated video/audio | Both | Local testing |
| 21 | **Post-Meeting** | Doctor ends meeting | Doctor | HOST end control |
| 22 | **Post-Meeting** | Recording uploaded to PostgreSQL | System | Storage pipeline |
| 23 | **Post-Meeting** | AI processes transcript + chats + video | System | Gemini summary pipeline |
| 24 | **Post-Meeting** | AI generates SOAP summary (Thai) | System | Requirement 2.1, 3.2 |
| 25 | **Post-Meeting** | 30-min sectioned summaries for long meetings | System | Section splitting |
| 26 | **Post-Meeting** | Summary displayed on Doctor's Health Meeting | Doctor | Results display |
| 27 | **Post-Meeting** | Doctor reviews AI summary (Man-in-the-Loop) | Doctor | Requirement 2.5 |
| 28 | **Post-Meeting** | Doctor approves/edits/rejects summary | Doctor | Validation UI |
| 29 | **EMR** | EMR Editor pre-filled with AI SOAP data | Doctor | Auto-population |
| 30 | **EMR** | Doctor edits and finalizes EMR | Doctor | EMR workflow |
| 31 | **EMR** | Doctor signs EMR (digital signature) | Doctor | Sign & finalize |
| 32 | **EMR** | Patient Instruction Sheet auto-generated | System | Requirement 4.5 |
| 33 | **EMR** | Doctor reviews instruction sheet | Doctor | Man-in-the-Loop |
| 34 | **Delivery** | EMR data sent to patient | System | POST health-logs |
| 35 | **Delivery** | Patient views results in Dashboard | Patient | Latest Result widget |
| 36 | **Delivery** | Patient views results in Timeline | Patient | Treatment history |
| 37 | **Delivery** | Patient downloads Instruction Sheet (PDF) | Patient | PDF generation |
| 38 | **Delivery** | Appointment status → completed | Both | Final status |

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

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/appointments` | POST | Create new appointment |
| `/api/appointments/:id` | GET | Get appointment details |
| `/api/appointments/:id/meeting-link` | GET | Get patient meeting URL |
| `/api/appointments/:id/invite-guest` | POST | Generate guest invite link |

### Video Meeting Endpoints (Doctor Portal - Port 3009)

| Endpoint | Method | Description |
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

| Endpoint | Method | Description |
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

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/meetings/:id/generate-summary` | POST | Generate AI summary from transcript + chats |
| `/api/meetings/:id/summary` | GET | Get AI-generated SOAP summary |
| `/api/meetings/:id/recommendations` | GET | Get CDS recommendations |
| `/api/ai/pre-consultation-summary` | POST | Generate pre-consultation summary (Req 2.2) |
| `/api/ai/patient-instruction-sheet` | POST | Generate patient instruction sheet (Req 4.5) |
| `/api/ai/document-analysis` | POST | Analyze uploaded PDF/lab results (Req 2.3) |

### EMR Endpoints (Doctor Portal - Port 3009)

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/emr/:id` | GET | Get EMR record |
| `/api/emr` | POST | Create new EMR (AI-prefilled SOAP) |
| `/api/emr/:id` | PUT | Update EMR |
| `/api/emr/:id/sign` | POST | Sign and finalize EMR |
| `/api/emr/:id/instruction-sheet` | GET | Get patient instruction sheet |

### Patient Delivery Endpoints (Patient Portal - Port 3005)

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/patients/:id/health-logs` | POST | Receive EMR data from doctor |
| `/api/patients/:id/health-logs` | GET | Get patient health history |
| `/api/patients/:id/instruction-sheets` | GET | Get instruction sheets |
| `/api/patients/:id/instruction-sheets/:id/pdf` | GET | Download instruction sheet PDF |

### Guest Meeting Endpoints (Public - No Auth Required)

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/guest/meeting/:token` | GET | Validate guest meeting token |
| `/api/guest/meeting/:token/join` | POST | Join meeting as guest (display name required) |

---

**This workflow covers the COMPLETE appointment-to-delivery lifecycle including multi-party meetings, transcript streaming, AI summary pipeline, EMR documentation, and patient delivery — the core Phase 1 deliverable.**

**Last Updated:** March 31, 2026 (v1.6.0)

---

## 15. PostgreSQL Database Architecture

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

### 15.2 Database Tables Used in Appointment Workflows

| Table | Purpose in Appointment Flow | Key Columns |
| ----- | --------------------------- | ----------- |
| **appointments** | Core appointment records with full lifecycle | id, patient_id, doctor_id, requested_date/time, confirmed_date/time, status, meet_link, jitsi_room_name, urgency_level, symptoms (JSONB), ai_triage (JSONB), invitees (JSONB) |
| **meeting_records** | Video consultation session tracking | id (UUID), appointment_id, doctor_id, patient_id, room_name, jitsi_domain, status, meeting_config (JSONB), transcript, ai_summary, ai_recommendations, section_summaries (JSONB), doctor_validation_status, patient_instructions |
| **meeting_transcripts** | Speech-to-text segments from Web Speech API | id (UUID), meeting_record_id, speaker_id, speaker_role (doctor/patient/guest), content, language, confidence, start_time_seconds, is_final |
| **emr** | Electronic Medical Records (SOAP format) | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, patient_instructions, doctor_signature, signed_at, status (draft/signed) |
| **prescriptions** | E-prescriptions linked to EMR | id, emr_id, appointment_id, patient_id, medications (JSONB), cds_warnings (JSONB), status |
| **lab_orders** | Laboratory test orders from consultation | id, emr_id, appointment_id, tests (JSONB), results (JSONB), ai_analysis, status |
| **notifications** | In-app notifications for all participants | id (UUID), user_id, type, title/title_thai, message/message_thai, data (JSONB), read_at |
| **cds_logs** | Clinical Decision Support audit trail | id, patient_id, doctor_id, recommendation_type, severity, title, guideline_source, doctor_decision |
| **ai_validations** | Man-in-the-Loop validation records | id, type, patient_id, doctor_id, decision, content_snapshot, validated_at |
| **transcriptions_embeddings** | Vectorized transcript chunks for AI search | meeting_record_id, chunk_text, speaker_role, embedding (vector) |
| **users** | Patient & doctor identity resolution | id, email, name, name_thai, role, doctor_id, patient_id |
| **audit_logs** | Compliance audit trail for all actions | user_id, patient_id, action, entity_type, details (JSONB) |

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

### 15.6 Meeting AI Pipeline Database Flow

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

| # | Scenario | Patient Action | Doctor/Admin Action | Status Flow | DB Tables Affected |
| - | -------- | -------------- | ------------------- | ----------- | ------------------ |
| 1 | Normal booking (specific doctor) | Book with doctor selected | Doctor confirms | pending → confirmed | appointments, notifications |
| 2 | Pool booking (system-assigned) | Book without doctor | Admin assigns → Doctor confirms | in_pool → awaiting_doctor_response → confirmed | appointments, notifications |
| 3 | Admin direct confirm | Book appointment | Admin confirms directly | pending → confirmed | appointments, notifications |
| 4 | Doctor declines | Book appointment | Doctor declines with reason | pending → declined | appointments, notifications |
| 5 | Patient cancels | Cancel appointment | — | any → cancelled | appointments, notifications |
| 6 | Meeting completed (telehealth) | Join meeting | Host meeting → EMR → Sign | confirmed → completed | appointments, meeting_records, meeting_transcripts, emr, prescriptions, lab_orders, notifications |
| 7 | Meeting completed (onsite) | Visit clinic | Document EMR | confirmed → completed | appointments, emr, prescriptions |
| 8 | AI triage with urgency | Describe symptoms | Review AI triage level | pending (with ai_triage JSONB) | appointments |
| 9 | Multi-party meeting | Invite relatives | Invite specialists → Admit all | confirmed → completed | appointments, meeting_records |
| 10 | Guest join (non-registered) | Share link externally | Admit from lobby | — | meeting_records |
| 11 | Rescheduled appointment | — | Admin/Doctor reschedules | confirmed → confirmed (new date) | appointments, notifications |
| 12 | E-Prescribing after meeting | — | Create prescription | — | prescriptions, cds_logs |
| 13 | Lab order after meeting | — | Order lab tests | — | lab_orders |
| 14 | AI pre-consultation summary | — | Review AI summary before meeting | — | phr, emr (read), ai_validations |
| 15 | CDS drug interaction alert | — | Accept/reject/modify | — | cds_logs, prescriptions |
| 16 | Patient instruction sheet | View instructions | Generate + validate | — | emr, ai_validations, notifications |

---

## 17. API Endpoints Summary (Appointment Workflow)

### Patient Portal APIs

| Method | Endpoint | Description | DB Operation |
| ------ | -------- | ----------- | ------------ |
| POST | `/api/appointments` | Create appointment request | INSERT appointments |
| GET | `/api/appointments/my` | List patient's appointments | SELECT appointments WHERE patient_id |
| GET | `/api/appointments/:id` | Get appointment details | SELECT appointments WHERE id |
| PUT | `/api/appointments/:id/status` | Update status (cancel) | UPDATE appointments |
| DELETE | `/api/appointments/:id` | Cancel appointment | UPDATE appointments SET status='cancelled' |
| GET | `/api/doctors` | List available doctors | SELECT FROM doctors |
| GET | `/api/doctors/:id/slots` | Get doctor's available slots | SELECT FROM doctor_schedules |

### Doctor Portal APIs

| Method | Endpoint | Description | DB Operation |
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

| Method | Endpoint | Description | DB Operation |
| ------ | -------- | ----------- | ------------ |
| POST | `/api/meetings/create` | Create meeting room | INSERT meeting_records |
| POST | `/api/meetings/:id/start-transcription` | Start transcript | UPDATE meeting_records |
| POST | `/api/meetings/:id/transcript` | Submit transcript segment | INSERT meeting_transcripts |
| POST | `/api/meetings/:id/generate-summary` | AI summary generation | UPDATE meeting_records (ai_summary) |
| POST | `/api/meetings/:id/validate` | Doctor validates AI output | UPDATE meeting_records, INSERT ai_validations |
| POST | `/api/meetings/:id/end` | End meeting | UPDATE meeting_records SET status='completed' |
