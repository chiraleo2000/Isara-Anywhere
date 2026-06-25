> **SSOT source:** `Processes/VIDEO_MEETING_JITSI_GEMINI.md`, `Processes/Separated_Workflows_And_Functions.md` §C1
> **Portal:** Doctor (`Isara-doctor-portal`)
> **Excerpt:** Doctor as meeting HOST — edit canonical copy in platform `Processes/`.

## Doctor as Meeting HOST

- **Only the assigned doctor** can START the meeting — Doctor URL includes `config.moderator=true`
- Admin and patient are **not** moderators
- Doctor controls lobby admission, recording, and meeting settings
- Single in-app flow: `MeetingRoom.tsx` at `/meeting/:appointmentId` (no external meeting links in UI)

## Doctor Opens Meeting Room (C1)

**Pages:** `HealthMeeting.tsx`, `MeetingRoom.tsx`
**API:** `POST /api/meetings/create`
**Tables:** `meeting_records`

```text
Process:
1. Doctor clicks "Start Meeting" for a confirmed appointment
2. POST to Meeting Server (:3020) → create room
3. INSERT INTO meeting_records (status: 'waiting')
4. Generate URLs: doctor (HOST), patient (lobby), guest (view-only)
5. Doctor sees Jitsi iframe embedded in modal
6. Doctor is HOST with full controls
```

## Meeting Link Generation (on confirm)

- Room name format: `Izara-Med-{appointmentId}-{timestamp}-{hash}`
- Three URL variants: `doctorMeetingUrl` (HOST), `patientMeetingUrl` (lobby), `guestMeetingUrl`
- Lobby feature: doctor approves ALL participants
- Camera/mic ON by default; text chat always available

## During Meeting (doctor controls)

1. Doctor starts meeting via Scheduled Meetings or Health Meeting queue
2. Patient and guests wait in lobby until doctor admits
3. Doctor controls: mute/kick, recording, transcript START/PAUSE/STOP, guest invites
4. Real-time transcript segments saved to `meeting_transcripts`

## End Meeting

1. Doctor clicks "End Meeting"
2. `meeting_records.status` → `completed`; `appointments.status` → `completed`
3. Triggers post-meeting AI pipeline (see `post-meeting-man-in-loop.md`)

**Env:** `VITE_MEETING_SERVER_URL` (browser), `MEETING_SERVER_URL` (server). Session auth uses opaque `sessions` tokens, not JWT on public Jitsi.
