# E2E Selector Registry (`data-testid`)

Use **only** these selectors in Playwright tests (Group K a11y may use `getByRole`).

## Meeting — Doctor ([`MeetingRoom.tsx`](../Isara-doctor-portal/src/pages/meetings/MeetingRoom.tsx))

| testid | Purpose |
|--------|---------|
| `doctor-meeting-room` | Root meeting shell |
| `meeting-loading` | Init spinner |
| `meeting-agreement` | Consent step |
| `consent-recording` / `consent-transcript` / `consent-data-sharing` | Consent toggles |
| `agree-continue-btn` | Continue after consent |
| `pre-join-screen` | Pre-join |
| `join-meeting-btn` | Enter lobby/Jitsi |
| `lobby-waiting-screen` | Patient waiting (patient portal) |
| `lobby-panel` | Doctor lobby sidebar |
| `admit-all-btn` | Admit all lobby guests |
| `lobby-participant-{id}` | Lobby row |
| `admit-btn` / `reject-btn` | Per-participant actions |
| `jitsi-meeting-container` | Jitsi iframe host |
| `end-meeting-btn` | End call (doctor HOST) |
| `recording-indicator` | Toggle recording (inactive label: บันทึก; active: REC text sibling) |
| `recording-indicator-active` | Optional: set `data-recording="true"` when REC on (Group Q) |

## Meeting — Patient ([`PatientMeetingRoom.tsx`](../Isara-patient-portal/src/pages/PatientMeetingRoom.tsx))

Same as doctor where applicable; root: `patient-meeting-room`.

## Guest ([`GuestMeetingJoin.tsx`](../Isara-patient-portal/src/pages/GuestMeetingJoin.tsx))

| testid | Purpose |
|--------|---------|
| `guest-meeting-room` | Root |
| `guest-join-form` | Name entry |
| `guest-name-input` | Display name |
| `guest-join-btn` | Request lobby |
| `guest-lobby-waiting` | Waiting state |
| `guest-lobby-rejected` | Rejected |
| `jitsi-guest-container` | Jitsi after admit (full-height; no `h-0` hide) |
| `host-waiting-screen` | Overlay while waiting for doctor host-ready |
| `guest-connecting-overlay` | Overlay while Jitsi mounts |
| `guest-join-url-hint` | Doctor invite panel — open link URL |
| `guest-token-url-hint` | Doctor invite panel — JWT link (24h) |
| `insert-meeting-summary-emr-btn` | Doctor dashboard → EMR from meeting AI summary |
| `dashboard-meeting-ai-summary` | Doctor dashboard meeting summary textarea |
| `lobby-role-badge-guest` | Lobby waiting list guest badge |

## Meeting results ([`MeetingResults.tsx`](../Isara-doctor-portal/src/pages/meetings/MeetingResults.tsx))

| testid | Purpose |
|--------|---------|
| `meeting-results` | Modal root |
| `recording-player` | Audio playback |
| `transcript-panel` | Transcript tab content |
| `generate-summary-btn` | Trigger Gemini summary |
| `summary-structured` | SOAP structured output |

## Clinical modals (Wave 2+)

| testid | Component |
|--------|-----------|
| `emr-autosave-status` | EMR editor save indicator |
| `prescribe-submit` | Prescribing submit |
| `allergy-block-banner` | Allergy conflict block |
| `queue-list` | Health meeting queue |
| `queue-count` | KPI queue count |

## Auth — Doctor ([`LoginPage.tsx`](../Isara-doctor-portal/src/pages/auth/LoginPage.tsx))

| testid | Purpose |
|--------|---------|
| `login-email` | Email field |
| `login-password` | Password field |
| `login-submit` | Submit login |

## Dashboard — meeting history ([`HealthMeeting.tsx`](../Isara-doctor-portal/src/pages/meetings/HealthMeeting.tsx))

| testid | Purpose |
|--------|---------|
| `meeting-history-row` | Open Meeting Results for appointment |
| `recording-player` | Playback in MeetingResults modal |

## Patient PDPA / Living Will

| testid | Purpose |
|--------|---------|
| `pdpa-consent-toggle-{id}` | Consent switch |
| `pdpa-audit-log` | Immutable audit list |
| `living-will-signature` | Signature canvas |
