# Izara Telemedicine Appointment Workflows

This document details the full appointment workflow for Izara Telemedicine, including all user roles, notification logic, error handling, and business rules. Use this as a reference for implementation, agent training, and troubleshooting.

**Last Updated: December 16, 2025 (Jitsi Meet Host Controls + Deployment)**

---

## Production Deployment URLs

| Portal | URL | Registry |
|--------|-----|----------|
| Patient Portal | https://izara-patient-portal-724889190329.asia-southeast1.run.app | asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-patient-portal |
| Doctor Portal | https://izara-doctor-portal-724889190329.asia-southeast1.run.app | asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals/isara-doctor-portal |

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

**IMPORTANT: Patient Queue shows ALL pending appointments from ALL dates (not just today)**

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
  - Format: `https://meet.jit.si/Izara-{appointmentId}-{timestamp}-{random}`
  - No account required for patient or doctor
  - Link is clickable from both portals

- **If Declined**:
  - Status: `declined`
  - Reason recorded
  - Patient notified via email
  - Appointment removed from queue

---

## 4. Scheduled Meetings Tab

**Only CONFIRMED appointments appear here**

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
    - `patientMeetingUrl` - Patient URL with pre-filled name
    - `guestMeetingUrl` - For family members or other consultants
  - **Features enabled**:
    - Lobby feature (doctor approves participants)
    - Local recording (browser-based)
    - Thai language interface
    - Screen sharing for medical images
    - No Jitsi account required
  - If meeting link fails to generate, fallback notification is sent to all parties

- **Onsite Appointments**
  - No meeting link generated
  - Notification and calendar event sent to doctor with patient symptoms and details

---

## 7a. Video Meeting Execution

### Meeting Flow (Jitsi Meet with Host Controls)

1. **Doctor starts meeting** (acts as HOST/MODERATOR)
   - Doctor opens Scheduled Meetings tab
   - Clicks "Join Meeting" / "🎥 เข้าร่วมประชุม"
   - Uses `doctorMeetingUrl` which grants moderator privileges
   - Jitsi pre-join screen shows camera/mic preview
   - Doctor clicks "Join" to enter room AS HOST
   - **HOST CONTROLS AVAILABLE**:
     - Enable/disable lobby
     - Kick participants
     - Mute all
     - Start/stop recording
     - Invite additional participants

2. **Patient joins meeting**
   - Patient sees meeting link in "นัดหมายของฉัน" page
   - Clicks "เข้าห้องประชุมเลย" button
   - Uses `patientMeetingUrl` with pre-filled display name
   - **If lobby enabled**: Patient waits in lobby until doctor approves
   - Enters Jitsi room as participant (not moderator)

3. **Guest/Family joins meeting** (optional)
   - Uses `guestMeetingUrl` shared by doctor
   - Must enter display name
   - Waits in lobby for doctor approval
   - Joins as participant

4. **During meeting**
   - Video/audio consultation
   - Optional screen sharing for medical images
   - Local recording (if enabled by doctor)
   - Chat available for messaging

5. **Meeting ends**
   - Doctor ends the meeting (host control)
   - Recording saved locally on doctor's device

### Meeting Link Data Structure
```json
{
  "appointmentId": "APT-2025-001",
  "jitsiRoomName": "Izara-Med-APT-2025-abc123-xyz789",
  "doctorUrl": "https://meet.jit.si/Izara-Med-APT-2025-abc123-xyz789#config...",
  "patientUrl": "https://meet.jit.si/Izara-Med-APT-2025-abc123-xyz789#config...",
  "guestUrl": "https://meet.jit.si/Izara-Med-APT-2025-abc123-xyz789#config...",
  "provider": "jitsi",
  "status": "active",
  "scheduledDate": "2025-12-16",
  "scheduledTime": "10:00"
}
```

### Recording Upload (Post-Meeting)
```
Doctor's device → POST /api/video-meeting/:appointmentId/end
                  └─→ Video uploaded to GCS (izara-doctors-data)
                  └─→ Audio transcribed via Speech-to-Text
                  └─→ AI summary generated via Gemini
                  └─→ Recommendations generated for doctor
```

### GCS Storage Structure
```
izara-doctors-data/
└── doctors/{doctorId}/
    └── meetings/{appointmentId}/
        ├── recording.webm      # Video recording (max 200MB)
        ├── transcript.txt      # Thai transcription
        ├── summary.txt         # AI-generated SOAP summary
        └── recommendations.txt # Clinical decision support
```

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
```
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

**What gets sent to patient's health logs:**
- Chief complaint
- Diagnosis (descriptions only, not internal notes)
- Treatment plan
- **Medications/Prescriptions** (drug names, dosages, instructions)
- Follow-up date and instructions
- AI Summary (patient-friendly version)
- Doctor's signature timestamp

**What does NOT get sent to patient:**
- Internal doctor comments/notes
- Raw clinical assessments
- Drug interaction warnings marked as internal
- Doctor-to-doctor communications

**Delivery Flow:**
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
**Fix:** 
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

**Additional Fixes for Cache Issues (2025-12-11 Evening):**
1. **`gcsDataService.ts`**: Modified `fetchAllAppointments()` to accept options parameter for cache bypass
2. **`HealthMeeting.tsx`**: All `fetchAllAppointments()` calls now use `{ cache: false }` option
3. **`DoctorDashboard.tsx`**: Same cache bypass applied
4. **Added verification step**: After saving, system verifies the appointment was actually updated
5. **Added delays**: Small delays (300-500ms → 1000ms) after GCS writes to allow propagation

**CRITICAL ROOT CAUSE FIX (2025-12-11 Late Evening):**
**THE REAL BUG #1:** The confirmation handler was using `saveAllAppointments()` which ONLY writes to `appointments.json` master list. It was NOT writing the individual appointment file at `appointments/{id}.json`. When the patient portal or other components tried to read the updated appointment details, they got stale data from the individual file!

**Solution #1:** Changed from `saveAllAppointments()` to `saveAppointment()` which:
- Writes to `appointments/{id}.json` (individual file) 
- ALSO updates `appointments.json` (master list)
- Invalidates both caches
- Ensures both portals read the same data

**Code Change in HealthMeeting.tsx:**
```javascript
// OLD (broken): Only updated master list
const updatedAppointments = allAppointments.map(...);
await saveAllAppointments(updatedAppointments);

// NEW (fixed): Updates BOTH individual file AND master list
const updatedAppointment = { ...appointmentToUpdate, ...updates };
await saveAppointment(updatedAppointment);  // Writes to appointments/{id}.json + appointments.json
```

**THE REAL BUG #2 (EVEN MORE CRITICAL):** Some doctors (like doctor.test@izara.com) have NO `userId` in the system! When confirming appointments, the code was setting `doctorId: doctor.id` which resulted in `doctorId: undefined` in the saved appointment. The filter then couldn't match these appointments.

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

**Impact:**
- Doctors now see ALL appointments they confirm in their Scheduled Meetings tab **EVEN WITHOUT A userId**
- Dashboard stats correctly count today's appointments
- **Both portals now have synchronized appointment data** - reads from SAME GCS files
- Cache issues resolved - data always fresh from GCS
- Individual appointment files now stay in sync with master list
- **Works for doctors with OR without userId in the system**

---

## 12. Status Flow

```
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
|-----|-----------|---------|
| Patient Queue | All (Doctor/Admin) | ALL pending appointments awaiting confirmation |
| Scheduled Meetings | All (Doctor/Admin) | CONFIRMED appointments with meeting links |
| All Appointments | Admin only | Complete list with search/filter |

### Key Points:
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

| Step                | User    | Page/Component                        | Action/Option                                      | Metadata/Status Update         |
|---------------------|---------|---------------------------------------|----------------------------------------------------|-------------------------------|
| Login               | Patient | LoginPage.tsx                         | Login                                              | session                       |
| Login               | Doctor  | DoctorDashboard.tsx                   | Login                                              | session                       |
| Book Appointment    | Patient | AppointmentPages.tsx                  | Select doctor or system-assign, symptoms, date/time | status: pending/in_pool       |
| View Queue          | Doctor/Admin | HealthMeeting.tsx (Patient Queue) | See ALL pending appointments                       | -                             |
| Assign Doctor       | Admin   | HealthMeeting.tsx (Patient Queue)     | Assign unassigned appointment to doctor            | status: awaiting_doctor_response |
| Confirm Appointment | Doctor/Admin | HealthMeeting.tsx (Patient Queue) | Set date/time, generate Jitsi meeting link         | status: confirmed, meetingLink |
| Decline             | Doctor  | HealthMeeting.tsx                     | Decline with reason, notify patient                | status: declined              |
| View Scheduled      | Doctor/Admin | HealthMeeting.tsx (Scheduled)     | View confirmed appointments, join meeting          | -                             |
| Manage All          | Admin   | HealthMeeting.tsx (All Appointments)  | Search, filter, manage all appointments            | -                             |
| Patient Cancel      | Patient | DashboardPage.tsx                     | Cancel, notify doctor/admin                        | status: cancelled             |
| Join Meeting        | All     | Jitsi Meet (meet.jit.si)              | Join via Jitsi link (online)                       | meetingLink, participants     |
| End Meeting         | Doctor  | Jitsi + API                           | End meeting, upload recording                      | videoUrl, transcript          |
| AI Processing       | System  | Speech-to-Text + Gemini               | Transcribe, summarize, recommend                   | transcript, summary           |
| Post-Meeting        | Doctor  | CompleteEMREditor.tsx                 | Write/sign EMR with AI assistance                  | emr, status: completed        |
| View EMR            | Patient | PHRPage.tsx                           | View EMR in health logs (if signed)                | emr, results                  |

---

## 16. E2E Testing

### Dual Portal Testing
The appointment workflow can be tested end-to-end using the Selenium test suite that runs both Patient and Doctor portals simultaneously:

```bash
# Run full dual-portal meeting workflow test
node scripts/tests/e2e/dualPortalMeetingTests.cjs

# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless

# Run standard appointment workflow tests
node scripts/tests/e2e/appointmentWorkflowTests.cjs
```

### Test Coverage
| Phase | Test | Portal |
|-------|------|--------|
| Pre-Meeting | Patient books appointment | Patient |
| Pre-Meeting | Doctor confirms with Jitsi link | Doctor |
| During Meeting | Both access meeting links | Both |
| Post-Meeting | Recording upload to GCS | Doctor |
| Post-Meeting | Speech-to-Text transcription | System |
| Post-Meeting | AI summary generation | System |
| Post-Meeting | Doctor creates EMR | Doctor |
| Post-Meeting | EMR signed and sent | Doctor |
| Post-Meeting | Patient views results | Patient |

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

### Video Meeting Endpoints (Doctor Portal - Port 3009)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/video-meeting/create` | POST | Create Jitsi meeting |
| `/api/video-meeting/:id` | GET | Get meeting details |
| `/api/video-meeting/:id/join` | POST | Join meeting |
| `/api/video-meeting/:id/end` | POST | End meeting + upload + AI processing |
| `/api/video-meeting/:id/upload-recording` | POST | Upload video separately |
| `/api/video-meeting/:id/files` | GET | Get meeting files |
| `/api/video-meeting/:id/transcribe-audio` | POST | Transcribe audio |
| `/api/video-meeting/:id/recommendations` | POST | Generate AI recommendations |
| `/api/video-meeting/health` | GET | Health check |

---

**This workflow covers all scenarios, notifications, error handling, video meeting, and AI processing for appointments, so agents can follow every step without missing any point.**

**Last Updated:** December 2025
