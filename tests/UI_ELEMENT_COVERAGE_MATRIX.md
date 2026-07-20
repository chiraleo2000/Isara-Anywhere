# UI Element Coverage Matrix

**Generated:** auto (`scripts/audit-ui-element-coverage.py`)
**Controls:** 602 | **covered:** 164 | **partial:** 62 | **missing:** 376
**P0 missing:** 0

| Page | Control | testid | Type | Group | Group U | Priority | Status | Screenshot |
|------|---------|--------|------|-------|---------|----------|--------|------------|
| Doctor-Portal/01_Login_Page.md | Email input | `login-email` | input | A | U-A | P0 | covered | U-login-email |
| Doctor-Portal/01_Login_Page.md | Password input | `login-password` | input | A | U-A | P0 | covered | U-login-password |
| Doctor-Portal/01_Login_Page.md | Login submit | `login-submit` | button | A | U-A | P0 | covered | U-login-submit |
| Patient-Portal/01_Login_Page.md | Email input | `login-email` | input | A | U-A | P0 | covered | U-login-email |
| Patient-Portal/01_Login_Page.md | Password input | `login-password` | input | A | U-A | P0 | covered | U-login-password |
| Patient-Portal/01_Login_Page.md | Login submit | `login-submit` | button | A | U-A | P0 | covered | U-login-submit |
| Patient-Portal/06_PHR_Page.md | Overview tab | `phr-tab-overview` | tab | F | U-B | P0 | covered | U-phr-tab-overview |
| Patient-Portal/06_PHR_Page.md | Vitals tab | `phr-tab-vitals` | tab | F | U-B | P0 | covered | U-phr-tab-vitals |
| Patient-Portal/06_PHR_Page.md | Medications tab | `phr-tab-medications` | tab | F | U-B | P0 | covered | U-phr-tab-medications |
| Patient-Portal/06_PHR_Page.md | Allergies tab | `phr-tab-allergies` | tab | F | U-B | P0 | covered | U-phr-tab-allergies |
| Patient-Portal/06_PHR_Page.md | Lab tab | `phr-tab-lab-imaging` | tab | F | U-B | P0 | covered | U-phr-tab-lab-imaging |
| Patient-Portal/06_PHR_Page.md | Prescriptions tab | `phr-tab-prescriptions` | tab | F | U-B | P0 | covered | U-phr-tab-prescriptions |
| Patient-Portal/06_PHR_Page.md | Documents tab | `phr-tab-documents` | tab | F | U-B | P0 | covered | U-phr-tab-documents |
| Patient-Portal/06_PHR_Page.md | Profile tab | `phr-tab-profile` | tab | F | U-B | P0 | covered | U-phr-tab-profile |
| Patient-Portal/06_PHR_Page.md | Document upload | `phr-document-upload` | input | F | U-B | P0 | covered | U-phr-document-upload |
| Doctor-Portal/06_Health_Meeting_Page.md | Page root | `health-meeting-page` | container | D | U-C | P0 | covered | U-health-meeting-page |
| Doctor-Portal/06_Health_Meeting_Page.md | Queue list | `queue-list` | container | D | U-C | P0 | covered | U-queue-list |
| Doctor-Portal/06_Health_Meeting_Page.md | Queue KPI | `queue-count` | display | D | U-C | P0 | covered | U-queue-count |
| Doctor-Portal/06_Health_Meeting_Page.md | Claim appointment | `queue-claim-btn` | button | D | U-C | P0 | covered | U-queue-claim-btn |
| Doctor-Portal/06_Health_Meeting_Page.md | AI match | `queue-ai-match-btn` | button | D | U-C | P0 | covered | U-queue-ai-match-btn |
| Doctor-Portal/06_Health_Meeting_Page.md | Confirm appointment | `confirm-appointment-btn` | button | D | U-C | P0 | covered | U-confirm-appointment-btn |
| Doctor-Portal/05_Patient_Management_Page.md | Send message | `patient-message-send-btn` | button | E | U-C | P0 | covered | U-patient-message-send-btn |
| Doctor-Portal/10_Lab_Orders.md | Lab PDF upload | `lab-report-upload-btn` | button | L | U-C | P0 | covered | U-lab-report-upload-btn |
| Doctor-Portal/10_Lab_Orders.md | Imaging upload | `imaging-report-upload-btn` | button | L | U-C | P0 | covered | U-imaging-report-upload-btn |
| Doctor-Portal/09_Prescribing.md | Prescribe submit | `prescribe-submit` | button | E | U-C | P0 | covered | U-prescribe-submit |
| Doctor-Portal/08_EMR_Editor.md | EMR autosave | `emr-autosave-status` | display | E | U-C | P0 | covered | U-emr-autosave-status |
| Meeting-Server/01_Meeting_Room.md | End meeting | `end-meeting-btn` | button | Q | U-E | P0 | covered | U-end-meeting-btn |
| Meeting-Server/01_Meeting_Room.md | Admit all lobby | `admit-all-btn` | button | Q | U-E | P0 | covered | U-admit-all-btn |
| Meeting-Server/02_Meeting_Results.md | Generate summary | `generate-summary-btn` | button | Q2 | U-E | P0 | covered | U-generate-summary-btn |
| Meeting-Server/02_Meeting_Results.md | Results modal | `meeting-results` | modal | Q2 | U-E | P0 | covered | U-meeting-results |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Host Present | `host-present` | control | B | U-B | P1 | missing | U-host-present |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Jitsimeetingshell | `JitsiMeetingShell` | control | B | U-B | P1 | missing | U-JitsiMeetingShell |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Waitforhostready | `waitForHostReady` | control | B | U-B | P1 | missing | U-waitForHostReady |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Success | `success` | control | B | U-B | P1 | missing | U-success |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Message | `message` | control | B | U-B | P1 | missing | U-message |
| Doctor-Portal/00_Doctor_Portal_Overview.md | Code | `code` | control | B | U-B | P1 | missing | U-code |
| Doctor-Portal/01_Login_Page.md | Data Testid | `data-testid` | control | A | U-A | P1 | missing | U-data-testid |
| Doctor-Portal/01_Login_Page.md | Confirmed | `confirmed` | control | A | U-A | P1 | missing | U-confirmed |
| Doctor-Portal/01_Login_Page.md | Google Sign In Btn | `google-sign-in-btn` | control | A | U-A | P1 | covered | U-google-sign-in-btn |
| Doctor-Portal/01_Login_Page.md | Appointmentid | `appointmentId` | control | A | U-A | P1 | missing | U-appointmentId |
| Doctor-Portal/01_Login_Page.md | Meetingid | `meetingId` | control | A | U-A | P1 | missing | U-meetingId |
| Doctor-Portal/01_Login_Page.md | Pending | `pending` | control | A | U-A | P1 | missing | U-pending |
| Doctor-Portal/01_Login_Page.md | Dashboard Page | `dashboard-page` | control | A | U-A | P1 | missing | U-dashboard-page |
| Doctor-Portal/01_Login_Page.md | Authroute | `authRoute` | control | A | U-A | P1 | missing | U-authRoute |
| Doctor-Portal/02_Reset_Password_Page.md | Data Testid | `data-testid` | control | A | U-A | P1 | missing | U-data-testid |
| Doctor-Portal/02_Reset_Password_Page.md | Confirmed | `confirmed` | control | A | U-A | P1 | missing | U-confirmed |
| Doctor-Portal/02_Reset_Password_Page.md | Appointmentid | `appointmentId` | control | A | U-A | P1 | missing | U-appointmentId |
| Doctor-Portal/02_Reset_Password_Page.md | Meetingid | `meetingId` | control | A | U-A | P1 | missing | U-meetingId |
| Doctor-Portal/03_Dashboard_Page.md | Data Testid | `data-testid` | control | C | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/03_Dashboard_Page.md | Confirmed | `confirmed` | control | C | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/03_Dashboard_Page.md | Dashboard Page | `dashboard-page` | control | C | U-C | P1 | missing | U-dashboard-page |
| Doctor-Portal/03_Dashboard_Page.md | Appointmentid | `appointmentId` | control | C | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/03_Dashboard_Page.md | Meetingid | `meetingId` | control | C | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/03_Dashboard_Page.md | Success | `success` | control | C | U-C | P1 | missing | U-success |
| Doctor-Portal/03_Dashboard_Page.md | Message | `message` | control | C | U-C | P1 | missing | U-message |
| Doctor-Portal/03_Dashboard_Page.md | Code | `code` | control | C | U-C | P1 | missing | U-code |
| Doctor-Portal/03_Dashboard_Page.md | Dashboardfiltering | `dashboardFiltering` | control | C | U-C | P1 | missing | U-dashboardFiltering |
| Doctor-Portal/04_Schedule_Page.md | Data Testid | `data-testid` | control | C | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/04_Schedule_Page.md | Doctorid | `doctorId` | control | C | U-C | P1 | missing | U-doctorId |
| Doctor-Portal/04_Schedule_Page.md | Appointmentdate | `appointmentDate` | control | C | U-C | P1 | missing | U-appointmentDate |
| Doctor-Portal/04_Schedule_Page.md | Mapappointmentforclient | `mapAppointmentForClient` | control | C | U-C | P1 | missing | U-mapAppointmentForClient |
| Doctor-Portal/04_Schedule_Page.md | Resolveappointmentschedule | `resolveAppointmentSchedule` | control | C | U-C | P1 | missing | U-resolveAppointmentSchedule |
| Doctor-Portal/04_Schedule_Page.md | Confirmeddate | `confirmedDate` | control | C | U-C | P1 | missing | U-confirmedDate |
| Doctor-Portal/04_Schedule_Page.md | Appointmenttime | `appointmentTime` | control | C | U-C | P1 | missing | U-appointmentTime |
| Doctor-Portal/04_Schedule_Page.md | Meetinglink | `meetingLink` | control | C | U-C | P1 | missing | U-meetingLink |
| Doctor-Portal/04_Schedule_Page.md | Patientname | `patientName` | control | C | U-C | P1 | missing | U-patientName |
| Doctor-Portal/04_Schedule_Page.md | Status | `status` | control | C | U-C | P1 | missing | U-status |
| Doctor-Portal/04_Schedule_Page.md | Confirmed | `confirmed` | control | C | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/04_Schedule_Page.md | Scheduled | `scheduled` | control | C | U-C | P1 | missing | U-scheduled |
| Doctor-Portal/04_Schedule_Page.md | Pending | `pending` | control | C | U-C | P1 | missing | U-pending |
| Doctor-Portal/04_Schedule_Page.md | Assigned | `assigned` | control | C | U-C | P1 | missing | U-assigned |
| Doctor-Portal/04_Schedule_Page.md | Buildtelehealthcalendarurl | `buildTelehealthCalendarUrl` | control | C | U-C | P1 | missing | U-buildTelehealthCalendarUrl |
| Doctor-Portal/04_Schedule_Page.md | Buildgooglecalendarurl | `buildGoogleCalendarUrl` | control | C | U-C | P1 | missing | U-buildGoogleCalendarUrl |
| Doctor-Portal/04_Schedule_Page.md | Calendareventurl | `calendarEventUrl` | control | C | U-C | P1 | missing | U-calendarEventUrl |
| Doctor-Portal/04_Schedule_Page.md | Mini Calendar Appointment Day | `mini-calendar-appointment-day` | control | C | U-C | P1 | covered | U-mini-calendar-appointment-day |
| Doctor-Portal/04_Schedule_Page.md | Doctor Portal | `doctor-portal` | control | C | U-C | P1 | missing | U-doctor-portal |
| Doctor-Portal/04_Schedule_Page.md | Appointmentid | `appointmentId` | control | C | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/04_Schedule_Page.md | Meetingid | `meetingId` | control | C | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/04_Schedule_Page.md | Success | `success` | control | C | U-C | P1 | missing | U-success |
| Doctor-Portal/04_Schedule_Page.md | Message | `message` | control | C | U-C | P1 | missing | U-message |
| Doctor-Portal/04_Schedule_Page.md | Code | `code` | control | C | U-C | P1 | missing | U-code |
| Doctor-Portal/05_Patient_Management_Page.md | Data Testid | `data-testid` | control | E | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/05_Patient_Management_Page.md | Confirmed | `confirmed` | control | E | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/05_Patient_Management_Page.md | Appointmentid | `appointmentId` | control | E | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/05_Patient_Management_Page.md | Meetingid | `meetingId` | control | E | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/05_Patient_Management_Page.md | Success | `success` | control | E | U-C | P1 | missing | U-success |
| Doctor-Portal/05_Patient_Management_Page.md | Message | `message` | control | E | U-C | P1 | missing | U-message |
| Doctor-Portal/05_Patient_Management_Page.md | Code | `code` | control | E | U-C | P1 | missing | U-code |
| Doctor-Portal/05_Patient_Management_Page.md | Patientdetailview | `patientDetailView` | control | E | U-C | P1 | missing | U-patientDetailView |
| Doctor-Portal/06_Health_Meeting_Page.md | Data Testid | `data-testid` | control | D | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/06_Health_Meeting_Page.md | Confirmed | `confirmed` | control | D | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/06_Health_Meeting_Page.md | Lobby Waiting Screen | `lobby-waiting-screen` | control | D | U-C | P1 | covered | U-lobby-waiting-screen |
| Doctor-Portal/06_Health_Meeting_Page.md | Admit All Btn | `admit-all-btn` | control | D | U-C | P1 | covered | U-admit-all-btn |
| Doctor-Portal/06_Health_Meeting_Page.md | Jitsi Doctor Container | `jitsi-doctor-container` | control | D | U-C | P1 | missing | U-jitsi-doctor-container |
| Doctor-Portal/06_Health_Meeting_Page.md | Jitsi Guest Container | `jitsi-guest-container` | control | D | U-C | P1 | covered | U-jitsi-guest-container |
| Doctor-Portal/06_Health_Meeting_Page.md | Insert Meeting Summary Emr Btn | `insert-meeting-summary-emr-btn` | control | D | U-C | P1 | covered | U-insert-meeting-summary-emr-btn |
| Doctor-Portal/06_Health_Meeting_Page.md | Host Ready | `host-ready` | control | D | U-C | P1 | missing | U-host-ready |
| Doctor-Portal/06_Health_Meeting_Page.md | Notifyhostpresent | `notifyHostPresent` | control | D | U-C | P1 | missing | U-notifyHostPresent |
| Doctor-Portal/06_Health_Meeting_Page.md | Appointmentid | `appointmentId` | control | D | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/06_Health_Meeting_Page.md | Meetingid | `meetingId` | control | D | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/06_Health_Meeting_Page.md | Guestjoinurl | `guestJoinUrl` | control | D | U-C | P1 | missing | U-guestJoinUrl |
| Doctor-Portal/06_Health_Meeting_Page.md | Share Link | `share-link` | control | D | U-C | P1 | missing | U-share-link |
| Doctor-Portal/06_Health_Meeting_Page.md | Guest Invite | `guest-invite` | control | D | U-C | P1 | missing | U-guest-invite |
| Doctor-Portal/06_Health_Meeting_Page.md | Guest Lobby Waiting | `guest-lobby-waiting` | control | D | U-C | P1 | covered | U-guest-lobby-waiting |
| Doctor-Portal/06_Health_Meeting_Page.md | Frame Src | `frame-src` | control | D | U-C | P1 | missing | U-frame-src |
| Doctor-Portal/06_Health_Meeting_Page.md | Connect Src | `connect-src` | control | D | U-C | P1 | missing | U-connect-src |
| Doctor-Portal/06_Health_Meeting_Page.md | Guest Transcript Segment | `guest-transcript-segment` | control | D | U-C | P1 | missing | U-guest-transcript-segment |
| Doctor-Portal/06_Health_Meeting_Page.md | Recordingurl | `recordingUrl` | control | D | U-C | P1 | missing | U-recordingUrl |
| Doctor-Portal/06_Health_Meeting_Page.md | Meeting Summary Ready | `meeting-summary-ready` | control | D | U-C | P1 | missing | U-meeting-summary-ready |
| Doctor-Portal/06_Health_Meeting_Page.md | End Meeting Btn | `end-meeting-btn` | control | D | U-C | P1 | covered | U-end-meeting-btn |
| Doctor-Portal/06_Health_Meeting_Page.md | Recording Indicator | `recording-indicator` | control | D | U-C | P1 | covered | U-recording-indicator |
| Doctor-Portal/06_Health_Meeting_Page.md | Meeting Results | `meeting-results` | control | D | U-C | P1 | covered | U-meeting-results |
| Doctor-Portal/06_Health_Meeting_Page.md | Recording Player | `recording-player` | control | D | U-C | P1 | covered | U-recording-player |
| Doctor-Portal/06_Health_Meeting_Page.md | Generate Summary Btn | `generate-summary-btn` | control | D | U-C | P1 | covered | U-generate-summary-btn |
| Doctor-Portal/06_Health_Meeting_Page.md | Defectisarapdfmeetingqueue | `defectIsaraPdfMeetingQueue` | control | D | U-C | P1 | missing | U-defectIsaraPdfMeetingQueue |
| Doctor-Portal/06_Health_Meeting_Page.md | Pending | `pending` | control | D | U-C | P1 | missing | U-pending |
| Doctor-Portal/06_Health_Meeting_Page.md | Assigned | `assigned` | control | D | U-C | P1 | missing | U-assigned |
| Doctor-Portal/07_Virtual_Meeting.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Doctor-Portal/07_Virtual_Meeting.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Doctor-Portal/07_Virtual_Meeting.md | Lobby Waiting Screen | `lobby-waiting-screen` | control | B | U-B | P1 | covered | U-lobby-waiting-screen |
| Doctor-Portal/07_Virtual_Meeting.md | Admit All Btn | `admit-all-btn` | control | B | U-B | P1 | covered | U-admit-all-btn |
| Doctor-Portal/07_Virtual_Meeting.md | Jitsi Doctor Container | `jitsi-doctor-container` | control | B | U-B | P1 | missing | U-jitsi-doctor-container |
| Doctor-Portal/07_Virtual_Meeting.md | Jitsi Guest Container | `jitsi-guest-container` | control | B | U-B | P1 | covered | U-jitsi-guest-container |
| Doctor-Portal/07_Virtual_Meeting.md | Insert Meeting Summary Emr Btn | `insert-meeting-summary-emr-btn` | control | B | U-B | P1 | covered | U-insert-meeting-summary-emr-btn |
| Doctor-Portal/07_Virtual_Meeting.md | Host Ready | `host-ready` | control | B | U-B | P1 | missing | U-host-ready |
| Doctor-Portal/07_Virtual_Meeting.md | Notifyhostpresent | `notifyHostPresent` | control | B | U-B | P1 | missing | U-notifyHostPresent |
| Doctor-Portal/07_Virtual_Meeting.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Doctor-Portal/07_Virtual_Meeting.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Doctor-Portal/07_Virtual_Meeting.md | Guestjoinurl | `guestJoinUrl` | control | B | U-B | P1 | missing | U-guestJoinUrl |
| Doctor-Portal/07_Virtual_Meeting.md | Share Link | `share-link` | control | B | U-B | P1 | missing | U-share-link |
| Doctor-Portal/07_Virtual_Meeting.md | Guest Invite | `guest-invite` | control | B | U-B | P1 | missing | U-guest-invite |
| Doctor-Portal/07_Virtual_Meeting.md | Guest Lobby Waiting | `guest-lobby-waiting` | control | B | U-B | P1 | covered | U-guest-lobby-waiting |
| Doctor-Portal/07_Virtual_Meeting.md | Frame Src | `frame-src` | control | B | U-B | P1 | missing | U-frame-src |
| Doctor-Portal/07_Virtual_Meeting.md | Connect Src | `connect-src` | control | B | U-B | P1 | missing | U-connect-src |
| Doctor-Portal/07_Virtual_Meeting.md | Guest Transcript Segment | `guest-transcript-segment` | control | B | U-B | P1 | missing | U-guest-transcript-segment |
| Doctor-Portal/07_Virtual_Meeting.md | Recordingurl | `recordingUrl` | control | B | U-B | P1 | missing | U-recordingUrl |
| Doctor-Portal/07_Virtual_Meeting.md | Meeting Summary Ready | `meeting-summary-ready` | control | B | U-B | P1 | missing | U-meeting-summary-ready |
| Doctor-Portal/08_EMR_Editor.md | Data Testid | `data-testid` | control | E | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/08_EMR_Editor.md | Confirmed | `confirmed` | control | E | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/08_EMR_Editor.md | Emr Editor Modal | `emr-editor-modal` | control | E | U-C | P1 | covered | U-emr-editor-modal |
| Doctor-Portal/08_EMR_Editor.md | Emr Sign Btn | `emr-sign-btn` | control | E | U-C | P1 | covered | U-emr-sign-btn |
| Doctor-Portal/08_EMR_Editor.md | Appointmentid | `appointmentId` | control | E | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/08_EMR_Editor.md | Meetingid | `meetingId` | control | E | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/09_Prescribing.md | Data Testid | `data-testid` | control | E | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/09_Prescribing.md | Confirmed | `confirmed` | control | E | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/09_Prescribing.md | Appointmentid | `appointmentId` | control | E | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/09_Prescribing.md | Meetingid | `meetingId` | control | E | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/09_Prescribing.md | Allergy Block Banner | `allergy-block-banner` | control | E | U-C | P1 | covered | U-allergy-block-banner |
| Doctor-Portal/10_Lab_Orders.md | Data Testid | `data-testid` | control | L | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/10_Lab_Orders.md | Confirmed | `confirmed` | control | L | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/10_Lab_Orders.md | Appointmentid | `appointmentId` | control | L | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/10_Lab_Orders.md | Meetingid | `meetingId` | control | L | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/10_Lab_Orders.md | Success | `success` | control | L | U-C | P1 | missing | U-success |
| Doctor-Portal/10_Lab_Orders.md | Message | `message` | control | L | U-C | P1 | missing | U-message |
| Doctor-Portal/10_Lab_Orders.md | Code | `code` | control | L | U-C | P1 | missing | U-code |
| Doctor-Portal/10_Lab_Orders.md | Laborders | `labOrders` | control | L | U-C | P1 | missing | U-labOrders |
| Doctor-Portal/11_Patient_Record_Viewer.md | Data Testid | `data-testid` | control | F | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/11_Patient_Record_Viewer.md | Confirmed | `confirmed` | control | F | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/11_Patient_Record_Viewer.md | Appointmentid | `appointmentId` | control | F | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/11_Patient_Record_Viewer.md | Meetingid | `meetingId` | control | F | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/11_Patient_Record_Viewer.md | Healthrecordsemrworkflow | `healthRecordsEmrWorkflow` | control | F | U-C | P1 | missing | U-healthRecordsEmrWorkflow |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Summary | `patient-record-tab-summary` | control | F | U-C | P1 | covered | U-patient-record-tab-summary |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Emr | `patient-record-tab-emr` | control | F | U-C | P1 | covered | U-patient-record-tab-emr |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Labs | `patient-record-tab-labs` | control | F | U-C | P1 | covered | U-patient-record-tab-labs |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Rx | `patient-record-tab-rx` | control | F | U-C | P1 | covered | U-patient-record-tab-rx |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Docs | `patient-record-tab-docs` | control | F | U-C | P1 | covered | U-patient-record-tab-docs |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Meetings | `patient-record-tab-meetings` | control | F | U-C | P1 | covered | U-patient-record-tab-meetings |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Tab Pdpa | `patient-record-tab-pdpa` | control | F | U-C | P1 | covered | U-patient-record-tab-pdpa |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Lab Download | `patient-record-lab-download` | control | F | U-C | P1 | covered | U-patient-record-lab-download |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Rx Download | `patient-record-rx-download` | control | F | U-C | P1 | covered | U-patient-record-rx-download |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Doc Download | `patient-record-doc-download` | control | F | U-C | P1 | covered | U-patient-record-doc-download |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Doc Upload | `patient-record-doc-upload` | control | F | U-C | P1 | covered | U-patient-record-doc-upload |
| Doctor-Portal/11_Patient_Record_Viewer.md | Patient Record Video Download | `patient-record-video-download` | control | F | U-C | P1 | covered | U-patient-record-video-download |
| Doctor-Portal/11_Patient_Record_Viewer.md | Dashboard Search Treatment History | `dashboard-search-treatment-history` | control | F | U-C | P1 | covered | U-dashboard-search-treatment-history |
| Doctor-Portal/11_Patient_Record_Viewer.md | Externalrecords | `externalRecords` | control | F | U-C | P1 | missing | U-externalRecords |
| Doctor-Portal/11_Patient_Record_Viewer.md | Userealtimesync | `useRealtimeSync` | control | F | U-C | P1 | missing | U-useRealtimeSync |
| Doctor-Portal/12_Medical_Consultants_Page.md | Data Testid | `data-testid` | control | H | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/12_Medical_Consultants_Page.md | Confirmed | `confirmed` | control | H | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/12_Medical_Consultants_Page.md | Appointmentid | `appointmentId` | control | H | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/12_Medical_Consultants_Page.md | Meetingid | `meetingId` | control | H | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/12_Medical_Consultants_Page.md | Success | `success` | control | H | U-C | P1 | missing | U-success |
| Doctor-Portal/12_Medical_Consultants_Page.md | Message | `message` | control | H | U-C | P1 | missing | U-message |
| Doctor-Portal/12_Medical_Consultants_Page.md | Code | `code` | control | H | U-C | P1 | missing | U-code |
| Doctor-Portal/12_Medical_Consultants_Page.md | Medicalconsultants | `medicalConsultants` | control | H | U-C | P1 | missing | U-medicalConsultants |
| Doctor-Portal/13_Medical_Content_Page.md | Data Testid | `data-testid` | control | H | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/13_Medical_Content_Page.md | Confirmed | `confirmed` | control | H | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/13_Medical_Content_Page.md | Appointmentid | `appointmentId` | control | H | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/13_Medical_Content_Page.md | Meetingid | `meetingId` | control | H | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/13_Medical_Content_Page.md | Success | `success` | control | H | U-C | P1 | missing | U-success |
| Doctor-Portal/13_Medical_Content_Page.md | Message | `message` | control | H | U-C | P1 | missing | U-message |
| Doctor-Portal/13_Medical_Content_Page.md | Code | `code` | control | H | U-C | P1 | missing | U-code |
| Doctor-Portal/13_Medical_Content_Page.md | Medicalcontentworkflow | `medicalContentWorkflow` | control | H | U-C | P1 | missing | U-medicalContentWorkflow |
| Doctor-Portal/14_Clinical_Resources_Page.md | Data Testid | `data-testid` | control | H | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/14_Clinical_Resources_Page.md | Confirmed | `confirmed` | control | H | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/14_Clinical_Resources_Page.md | Appointmentid | `appointmentId` | control | H | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/14_Clinical_Resources_Page.md | Meetingid | `meetingId` | control | H | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/14_Clinical_Resources_Page.md | Success | `success` | control | H | U-C | P1 | missing | U-success |
| Doctor-Portal/14_Clinical_Resources_Page.md | Message | `message` | control | H | U-C | P1 | missing | U-message |
| Doctor-Portal/14_Clinical_Resources_Page.md | Code | `code` | control | H | U-C | P1 | missing | U-code |
| Doctor-Portal/14_Clinical_Resources_Page.md | Clinicalresources | `clinicalResources` | control | H | U-C | P1 | missing | U-clinicalResources |
| Doctor-Portal/15_Gemini_AI_Studio.md | Data Testid | `data-testid` | control | J | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/15_Gemini_AI_Studio.md | Confirmed | `confirmed` | control | J | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/15_Gemini_AI_Studio.md | Appointmentid | `appointmentId` | control | J | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/15_Gemini_AI_Studio.md | Meetingid | `meetingId` | control | J | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/15_Gemini_AI_Studio.md | Geminiservice | `geminiService` | control | J | U-C | P1 | missing | U-geminiService |
| Doctor-Portal/16_Doctor_Profile_Page.md | Data Testid | `data-testid` | control | C | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/16_Doctor_Profile_Page.md | Confirmed | `confirmed` | control | C | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/16_Doctor_Profile_Page.md | Appointmentid | `appointmentId` | control | C | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/16_Doctor_Profile_Page.md | Meetingid | `meetingId` | control | C | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/16_Doctor_Profile_Page.md | Success | `success` | control | C | U-C | P1 | missing | U-success |
| Doctor-Portal/16_Doctor_Profile_Page.md | Message | `message` | control | C | U-C | P1 | missing | U-message |
| Doctor-Portal/16_Doctor_Profile_Page.md | Code | `code` | control | C | U-C | P1 | missing | U-code |
| Doctor-Portal/17_Admin_Appointment_Management.md | Data Testid | `data-testid` | control | I | U-D | P1 | missing | U-data-testid |
| Doctor-Portal/17_Admin_Appointment_Management.md | Confirmed | `confirmed` | control | I | U-D | P1 | missing | U-confirmed |
| Doctor-Portal/17_Admin_Appointment_Management.md | Appointment Join Meeting Btn | `appointment-join-meeting-btn` | control | I | U-D | P1 | covered | U-appointment-join-meeting-btn |
| Doctor-Portal/17_Admin_Appointment_Management.md | Appointmentid | `appointmentId` | control | I | U-D | P1 | missing | U-appointmentId |
| Doctor-Portal/17_Admin_Appointment_Management.md | Meetingid | `meetingId` | control | I | U-D | P1 | missing | U-meetingId |
| Doctor-Portal/17_Admin_Appointment_Management.md | Queue Count | `queue-count` | control | I | U-D | P1 | covered | U-queue-count |
| Doctor-Portal/17_Admin_Appointment_Management.md | Queue List | `queue-list` | control | I | U-D | P1 | covered | U-queue-list |
| Doctor-Portal/17_Admin_Appointment_Management.md | Adminappointmentmanagement | `adminAppointmentManagement` | control | I | U-D | P1 | missing | U-adminAppointmentManagement |
| Doctor-Portal/18_Admin_Doctor_Management.md | Data Testid | `data-testid` | control | I | U-D | P1 | missing | U-data-testid |
| Doctor-Portal/18_Admin_Doctor_Management.md | Confirmed | `confirmed` | control | I | U-D | P1 | missing | U-confirmed |
| Doctor-Portal/18_Admin_Doctor_Management.md | Appointmentid | `appointmentId` | control | I | U-D | P1 | missing | U-appointmentId |
| Doctor-Portal/18_Admin_Doctor_Management.md | Meetingid | `meetingId` | control | I | U-D | P1 | missing | U-meetingId |
| Doctor-Portal/18_Admin_Doctor_Management.md | Success | `success` | control | I | U-D | P1 | missing | U-success |
| Doctor-Portal/18_Admin_Doctor_Management.md | Message | `message` | control | I | U-D | P1 | missing | U-message |
| Doctor-Portal/18_Admin_Doctor_Management.md | Code | `code` | control | I | U-D | P1 | missing | U-code |
| Doctor-Portal/18_Admin_Doctor_Management.md | Admindoctormanagement | `adminDoctorManagement` | control | I | U-D | P1 | missing | U-adminDoctorManagement |
| Doctor-Portal/19_Doctors_Management_Page.md | Data Testid | `data-testid` | control | I | U-D | P1 | missing | U-data-testid |
| Doctor-Portal/19_Doctors_Management_Page.md | Confirmed | `confirmed` | control | I | U-D | P1 | missing | U-confirmed |
| Doctor-Portal/19_Doctors_Management_Page.md | Appointmentid | `appointmentId` | control | I | U-D | P1 | missing | U-appointmentId |
| Doctor-Portal/19_Doctors_Management_Page.md | Meetingid | `meetingId` | control | I | U-D | P1 | missing | U-meetingId |
| Doctor-Portal/19_Doctors_Management_Page.md | Success | `success` | control | I | U-D | P1 | missing | U-success |
| Doctor-Portal/19_Doctors_Management_Page.md | Message | `message` | control | I | U-D | P1 | missing | U-message |
| Doctor-Portal/19_Doctors_Management_Page.md | Code | `code` | control | I | U-D | P1 | missing | U-code |
| Doctor-Portal/19_Doctors_Management_Page.md | Admindoctormanagement | `adminDoctorManagement` | control | I | U-D | P1 | missing | U-adminDoctorManagement |
| Doctor-Portal/20_Appointment_Pool_Management.md | Data Testid | `data-testid` | control | D | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/20_Appointment_Pool_Management.md | Confirmed | `confirmed` | control | D | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/20_Appointment_Pool_Management.md | Appointment Join Meeting Btn | `appointment-join-meeting-btn` | control | D | U-C | P1 | covered | U-appointment-join-meeting-btn |
| Doctor-Portal/20_Appointment_Pool_Management.md | Appointmentid | `appointmentId` | control | D | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/20_Appointment_Pool_Management.md | Meetingid | `meetingId` | control | D | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/20_Appointment_Pool_Management.md | Queue Count | `queue-count` | control | D | U-C | P1 | covered | U-queue-count |
| Doctor-Portal/20_Appointment_Pool_Management.md | Queue List | `queue-list` | control | D | U-C | P1 | covered | U-queue-list |
| Doctor-Portal/20_Appointment_Pool_Management.md | Appointmentpoolmanagement | `appointmentPoolManagement` | control | D | U-C | P1 | missing | U-appointmentPoolManagement |
| Doctor-Portal/20_Appointment_Pool_Management.md | Defectisarapdfmeetingqueue | `defectIsaraPdfMeetingQueue` | control | D | U-C | P1 | missing | U-defectIsaraPdfMeetingQueue |
| Doctor-Portal/21_Queue_Management.md | Data Testid | `data-testid` | control | D | U-C | P1 | missing | U-data-testid |
| Doctor-Portal/21_Queue_Management.md | Confirmed | `confirmed` | control | D | U-C | P1 | missing | U-confirmed |
| Doctor-Portal/21_Queue_Management.md | Appointmentid | `appointmentId` | control | D | U-C | P1 | missing | U-appointmentId |
| Doctor-Portal/21_Queue_Management.md | Meetingid | `meetingId` | control | D | U-C | P1 | missing | U-meetingId |
| Doctor-Portal/21_Queue_Management.md | Queue Count | `queue-count` | control | D | U-C | P1 | covered | U-queue-count |
| Doctor-Portal/21_Queue_Management.md | Queue List | `queue-list` | control | D | U-C | P1 | covered | U-queue-list |
| Meeting-Server/00_Meeting_Server_Overview.md | Izara Meeting Server | `izara-meeting-server` | control | B | U-B | P1 | missing | U-izara-meeting-server |
| Meeting-Server/00_Meeting_Server_Overview.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Meeting-Server/00_Meeting_Server_Overview.md | Guest Invite | `guest-invite` | control | B | U-B | P1 | missing | U-guest-invite |
| Meeting-Server/00_Meeting_Server_Overview.md | Share Link | `share-link` | control | B | U-B | P1 | missing | U-share-link |
| Meeting-Server/00_Meeting_Server_Overview.md | Guestjoinurl | `guestJoinUrl` | control | B | U-B | P1 | missing | U-guestJoinUrl |
| Meeting-Server/00_Meeting_Server_Overview.md | Guesttokenurl | `guestTokenUrl` | control | B | U-B | P1 | missing | U-guestTokenUrl |
| Meeting-Server/00_Meeting_Server_Overview.md | Buildguestportalurls | `buildGuestPortalUrls` | control | B | U-B | P1 | missing | U-buildGuestPortalUrls |
| Meeting-Server/00_Meeting_Server_Overview.md | Meetinglobbies | `meetingLobbies` | control | B | U-B | P1 | missing | U-meetingLobbies |
| Meeting-Server/00_Meeting_Server_Overview.md | Join Meeting | `join-meeting` | control | B | U-B | P1 | missing | U-join-meeting |
| Meeting-Server/00_Meeting_Server_Overview.md | Leave Meeting | `leave-meeting` | control | B | U-B | P1 | missing | U-leave-meeting |
| Meeting-Server/00_Meeting_Server_Overview.md | Transcript Segment | `transcript-segment` | control | B | U-B | P1 | missing | U-transcript-segment |
| Meeting-Server/00_Meeting_Server_Overview.md | Chat Message | `chat-message` | control | B | U-B | P1 | missing | U-chat-message |
| Meeting-Server/00_Meeting_Server_Overview.md | Meeting Status | `meeting-status` | control | B | U-B | P1 | missing | U-meeting-status |
| Meeting-Server/00_Meeting_Server_Overview.md | Participant Joined | `participant-joined` | control | B | U-B | P1 | missing | U-participant-joined |
| Meeting-Server/00_Meeting_Server_Overview.md | Participant Left | `participant-left` | control | B | U-B | P1 | missing | U-participant-left |
| Meeting-Server/00_Meeting_Server_Overview.md | Meeting Ended | `meeting-ended` | control | B | U-B | P1 | missing | U-meeting-ended |
| Meeting-Server/00_Meeting_Server_Overview.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Meeting-Server/00_Meeting_Server_Overview.md | Lobby Waiting Screen | `lobby-waiting-screen` | control | B | U-B | P1 | covered | U-lobby-waiting-screen |
| Meeting-Server/00_Meeting_Server_Overview.md | Admit All Btn | `admit-all-btn` | control | B | U-B | P1 | covered | U-admit-all-btn |
| Meeting-Server/00_Meeting_Server_Overview.md | Jitsi Doctor Container | `jitsi-doctor-container` | control | B | U-B | P1 | missing | U-jitsi-doctor-container |
| Meeting-Server/00_Meeting_Server_Overview.md | Jitsi Guest Container | `jitsi-guest-container` | control | B | U-B | P1 | covered | U-jitsi-guest-container |
| Meeting-Server/00_Meeting_Server_Overview.md | Insert Meeting Summary Emr Btn | `insert-meeting-summary-emr-btn` | control | B | U-B | P1 | covered | U-insert-meeting-summary-emr-btn |
| Meeting-Server/00_Meeting_Server_Overview.md | Host Ready | `host-ready` | control | B | U-B | P1 | missing | U-host-ready |
| Meeting-Server/00_Meeting_Server_Overview.md | Notifyhostpresent | `notifyHostPresent` | control | B | U-B | P1 | missing | U-notifyHostPresent |
| Meeting-Server/00_Meeting_Server_Overview.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Meeting-Server/00_Meeting_Server_Overview.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Meeting-Server/00_Meeting_Server_Overview.md | Guest Lobby Waiting | `guest-lobby-waiting` | control | B | U-B | P1 | covered | U-guest-lobby-waiting |
| Meeting-Server/00_Meeting_Server_Overview.md | Frame Src | `frame-src` | control | B | U-B | P1 | missing | U-frame-src |
| Meeting-Server/00_Meeting_Server_Overview.md | Connect Src | `connect-src` | control | B | U-B | P1 | missing | U-connect-src |
| Meeting-Server/00_Meeting_Server_Overview.md | Guest Transcript Segment | `guest-transcript-segment` | control | B | U-B | P1 | missing | U-guest-transcript-segment |
| Meeting-Server/00_Meeting_Server_Overview.md | Recordingurl | `recordingUrl` | control | B | U-B | P1 | missing | U-recordingUrl |
| Meeting-Server/00_Meeting_Server_Overview.md | Meeting Summary Ready | `meeting-summary-ready` | control | B | U-B | P1 | missing | U-meeting-summary-ready |
| Meeting-Server/00_Meeting_Server_Overview.md | End Meeting Btn | `end-meeting-btn` | control | B | U-B | P1 | covered | U-end-meeting-btn |
| Meeting-Server/00_Meeting_Server_Overview.md | Recording Indicator | `recording-indicator` | control | B | U-B | P1 | covered | U-recording-indicator |
| Meeting-Server/00_Meeting_Server_Overview.md | Meeting Results | `meeting-results` | control | B | U-B | P1 | covered | U-meeting-results |
| Meeting-Server/00_Meeting_Server_Overview.md | Recording Player | `recording-player` | control | B | U-B | P1 | covered | U-recording-player |
| Meeting-Server/00_Meeting_Server_Overview.md | Generate Summary Btn | `generate-summary-btn` | control | B | U-B | P1 | covered | U-generate-summary-btn |
| Meeting-Server/01_Meeting_Room.md | Host Present | `host-present` | control | Q | U-E | P1 | missing | U-host-present |
| Meeting-Server/01_Meeting_Room.md | Waitforhostready | `waitForHostReady` | control | Q | U-E | P1 | missing | U-waitForHostReady |
| Meeting-Server/01_Meeting_Room.md | Jitsi Meeting Container | `jitsi-meeting-container` | control | Q | U-E | P1 | covered | U-jitsi-meeting-container |
| Meeting-Server/01_Meeting_Room.md | Meeting Agreement | `meeting-agreement` | control | Q | U-E | P1 | missing | U-meeting-agreement |
| Meeting-Server/01_Meeting_Room.md | Join Meeting Btn | `join-meeting-btn` | control | Q | U-E | P1 | missing | U-join-meeting-btn |
| Meeting-Server/01_Meeting_Room.md | Host Waiting Screen | `host-waiting-screen` | control | Q | U-E | P1 | covered | U-host-waiting-screen |
| Meeting-Server/01_Meeting_Room.md | Data Testid | `data-testid` | control | Q | U-E | P1 | missing | U-data-testid |
| Meeting-Server/01_Meeting_Room.md | Confirmed | `confirmed` | control | Q | U-E | P1 | missing | U-confirmed |
| Meeting-Server/01_Meeting_Room.md | Lobby Waiting Screen | `lobby-waiting-screen` | control | Q | U-E | P1 | covered | U-lobby-waiting-screen |
| Meeting-Server/01_Meeting_Room.md | Jitsi Doctor Container | `jitsi-doctor-container` | control | Q | U-E | P1 | missing | U-jitsi-doctor-container |
| Meeting-Server/01_Meeting_Room.md | Jitsi Guest Container | `jitsi-guest-container` | control | Q | U-E | P1 | covered | U-jitsi-guest-container |
| Meeting-Server/01_Meeting_Room.md | Insert Meeting Summary Emr Btn | `insert-meeting-summary-emr-btn` | control | Q | U-E | P1 | covered | U-insert-meeting-summary-emr-btn |
| Meeting-Server/01_Meeting_Room.md | Host Ready | `host-ready` | control | Q | U-E | P1 | missing | U-host-ready |
| Meeting-Server/01_Meeting_Room.md | Notifyhostpresent | `notifyHostPresent` | control | Q | U-E | P1 | missing | U-notifyHostPresent |
| Meeting-Server/01_Meeting_Room.md | Appointmentid | `appointmentId` | control | Q | U-E | P1 | missing | U-appointmentId |
| Meeting-Server/01_Meeting_Room.md | Meetingid | `meetingId` | control | Q | U-E | P1 | missing | U-meetingId |
| Meeting-Server/01_Meeting_Room.md | Guestjoinurl | `guestJoinUrl` | control | Q | U-E | P1 | missing | U-guestJoinUrl |
| Meeting-Server/01_Meeting_Room.md | Share Link | `share-link` | control | Q | U-E | P1 | missing | U-share-link |
| Meeting-Server/01_Meeting_Room.md | Guest Invite | `guest-invite` | control | Q | U-E | P1 | missing | U-guest-invite |
| Meeting-Server/01_Meeting_Room.md | Guest Lobby Waiting | `guest-lobby-waiting` | control | Q | U-E | P1 | covered | U-guest-lobby-waiting |
| Meeting-Server/01_Meeting_Room.md | Frame Src | `frame-src` | control | Q | U-E | P1 | missing | U-frame-src |
| Meeting-Server/01_Meeting_Room.md | Connect Src | `connect-src` | control | Q | U-E | P1 | missing | U-connect-src |
| Meeting-Server/01_Meeting_Room.md | Guest Transcript Segment | `guest-transcript-segment` | control | Q | U-E | P1 | missing | U-guest-transcript-segment |
| Meeting-Server/01_Meeting_Room.md | Recordingurl | `recordingUrl` | control | Q | U-E | P1 | missing | U-recordingUrl |
| Meeting-Server/01_Meeting_Room.md | Meeting Summary Ready | `meeting-summary-ready` | control | Q | U-E | P1 | missing | U-meeting-summary-ready |
| Meeting-Server/02_Meeting_Results.md | Meeting Summary Degraded | `meeting-summary-degraded` | control | Q2 | U-E | P1 | missing | U-meeting-summary-degraded |
| Meeting-Server/02_Meeting_Results.md | Validate Summary Btn | `validate-summary-btn` | control | Q2 | U-E | P1 | covered | U-validate-summary-btn |
| Meeting-Server/02_Meeting_Results.md | Apply Summary Emr Btn | `apply-summary-emr-btn` | control | Q2 | U-E | P1 | covered | U-apply-summary-emr-btn |
| Meeting-Server/02_Meeting_Results.md | Data Testid | `data-testid` | control | Q2 | U-E | P1 | missing | U-data-testid |
| Meeting-Server/02_Meeting_Results.md | Confirmed | `confirmed` | control | Q2 | U-E | P1 | missing | U-confirmed |
| Meeting-Server/02_Meeting_Results.md | Lobby Waiting Screen | `lobby-waiting-screen` | control | Q2 | U-E | P1 | covered | U-lobby-waiting-screen |
| Meeting-Server/02_Meeting_Results.md | Admit All Btn | `admit-all-btn` | control | Q2 | U-E | P1 | covered | U-admit-all-btn |
| Meeting-Server/02_Meeting_Results.md | Jitsi Doctor Container | `jitsi-doctor-container` | control | Q2 | U-E | P1 | missing | U-jitsi-doctor-container |
| Meeting-Server/02_Meeting_Results.md | Jitsi Guest Container | `jitsi-guest-container` | control | Q2 | U-E | P1 | covered | U-jitsi-guest-container |
| Meeting-Server/02_Meeting_Results.md | Insert Meeting Summary Emr Btn | `insert-meeting-summary-emr-btn` | control | Q2 | U-E | P1 | covered | U-insert-meeting-summary-emr-btn |
| Meeting-Server/02_Meeting_Results.md | Host Ready | `host-ready` | control | Q2 | U-E | P1 | missing | U-host-ready |
| Meeting-Server/02_Meeting_Results.md | Notifyhostpresent | `notifyHostPresent` | control | Q2 | U-E | P1 | missing | U-notifyHostPresent |
| Meeting-Server/02_Meeting_Results.md | Appointmentid | `appointmentId` | control | Q2 | U-E | P1 | missing | U-appointmentId |
| Meeting-Server/02_Meeting_Results.md | Meetingid | `meetingId` | control | Q2 | U-E | P1 | missing | U-meetingId |
| Meeting-Server/02_Meeting_Results.md | Guestjoinurl | `guestJoinUrl` | control | Q2 | U-E | P1 | missing | U-guestJoinUrl |
| Meeting-Server/02_Meeting_Results.md | Share Link | `share-link` | control | Q2 | U-E | P1 | missing | U-share-link |
| Meeting-Server/02_Meeting_Results.md | Guest Invite | `guest-invite` | control | Q2 | U-E | P1 | missing | U-guest-invite |
| Meeting-Server/02_Meeting_Results.md | Guest Lobby Waiting | `guest-lobby-waiting` | control | Q2 | U-E | P1 | covered | U-guest-lobby-waiting |
| Meeting-Server/02_Meeting_Results.md | Frame Src | `frame-src` | control | Q2 | U-E | P1 | missing | U-frame-src |
| Meeting-Server/02_Meeting_Results.md | Connect Src | `connect-src` | control | Q2 | U-E | P1 | missing | U-connect-src |
| Meeting-Server/02_Meeting_Results.md | Guest Transcript Segment | `guest-transcript-segment` | control | Q2 | U-E | P1 | missing | U-guest-transcript-segment |
| Meeting-Server/02_Meeting_Results.md | Recordingurl | `recordingUrl` | control | Q2 | U-E | P1 | missing | U-recordingUrl |
| Meeting-Server/02_Meeting_Results.md | Meeting Summary Ready | `meeting-summary-ready` | control | Q2 | U-E | P1 | missing | U-meeting-summary-ready |
| Meeting-Server/03_Emr_Appointment_Page.md | Completeemreditor | `CompleteEMREditor` | control | E | U-E | P1 | missing | U-CompleteEMREditor |
| Meeting-Server/03_Emr_Appointment_Page.md | Emr Ai Draft | `emr-ai-draft` | control | E | U-E | P1 | missing | U-emr-ai-draft |
| Meeting-Server/03_Emr_Appointment_Page.md | Data Testid | `data-testid` | control | E | U-E | P1 | missing | U-data-testid |
| Meeting-Server/03_Emr_Appointment_Page.md | Confirmed | `confirmed` | control | E | U-E | P1 | missing | U-confirmed |
| Meeting-Server/03_Emr_Appointment_Page.md | Appointment Join Meeting Btn | `appointment-join-meeting-btn` | control | E | U-E | P1 | covered | U-appointment-join-meeting-btn |
| Meeting-Server/03_Emr_Appointment_Page.md | Appointmentid | `appointmentId` | control | E | U-E | P1 | missing | U-appointmentId |
| Meeting-Server/03_Emr_Appointment_Page.md | Meetingid | `meetingId` | control | E | U-E | P1 | missing | U-meetingId |
| Meeting-Server/03_Emr_Appointment_Page.md | Queue Count | `queue-count` | control | E | U-E | P1 | covered | U-queue-count |
| Meeting-Server/03_Emr_Appointment_Page.md | Queue List | `queue-list` | control | E | U-E | P1 | covered | U-queue-list |
| Patient-Portal/00_Patient_Portal_Overview.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Patient-Portal/00_Patient_Portal_Overview.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Patient-Portal/00_Patient_Portal_Overview.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/00_Patient_Portal_Overview.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Patient-Portal/00_Patient_Portal_Overview.md | Success | `success` | control | B | U-B | P1 | missing | U-success |
| Patient-Portal/00_Patient_Portal_Overview.md | Message | `message` | control | B | U-B | P1 | missing | U-message |
| Patient-Portal/00_Patient_Portal_Overview.md | Code | `code` | control | B | U-B | P1 | missing | U-code |
| Patient-Portal/01_Login_Page.md | Data Testid | `data-testid` | control | A | U-A | P1 | missing | U-data-testid |
| Patient-Portal/01_Login_Page.md | Confirmed | `confirmed` | control | A | U-A | P1 | missing | U-confirmed |
| Patient-Portal/01_Login_Page.md | Google Sign In Btn | `google-sign-in-btn` | control | A | U-A | P1 | covered | U-google-sign-in-btn |
| Patient-Portal/01_Login_Page.md | Appointmentid | `appointmentId` | control | A | U-A | P1 | missing | U-appointmentId |
| Patient-Portal/01_Login_Page.md | Meetingid | `meetingId` | control | A | U-A | P1 | missing | U-meetingId |
| Patient-Portal/01_Login_Page.md | Pending | `pending` | control | A | U-A | P1 | missing | U-pending |
| Patient-Portal/01_Login_Page.md | Dashboard Page | `dashboard-page` | control | A | U-A | P1 | missing | U-dashboard-page |
| Patient-Portal/01_Login_Page.md | Authroute | `authRoute` | control | A | U-A | P1 | missing | U-authRoute |
| Patient-Portal/02_Register_Page.md | Data Testid | `data-testid` | control | A | U-A | P1 | missing | U-data-testid |
| Patient-Portal/02_Register_Page.md | Confirmed | `confirmed` | control | A | U-A | P1 | missing | U-confirmed |
| Patient-Portal/02_Register_Page.md | Register Submit | `register-submit` | control | A | U-A | P1 | covered | U-register-submit |
| Patient-Portal/02_Register_Page.md | Appointmentid | `appointmentId` | control | A | U-A | P1 | missing | U-appointmentId |
| Patient-Portal/02_Register_Page.md | Meetingid | `meetingId` | control | A | U-A | P1 | missing | U-meetingId |
| Patient-Portal/02_Register_Page.md | Registerroute | `registerRoute` | control | A | U-A | P1 | missing | U-registerRoute |
| Patient-Portal/03_Reset_Password_Page.md | Data Testid | `data-testid` | control | A | U-A | P1 | missing | U-data-testid |
| Patient-Portal/03_Reset_Password_Page.md | Confirmed | `confirmed` | control | A | U-A | P1 | missing | U-confirmed |
| Patient-Portal/03_Reset_Password_Page.md | Appointmentid | `appointmentId` | control | A | U-A | P1 | missing | U-appointmentId |
| Patient-Portal/03_Reset_Password_Page.md | Meetingid | `meetingId` | control | A | U-A | P1 | missing | U-meetingId |
| Patient-Portal/03_Reset_Password_Page.md | Resetpasswordroute | `resetPasswordRoute` | control | A | U-A | P1 | missing | U-resetPasswordRoute |
| Patient-Portal/04_Dashboard_Page.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Patient-Portal/04_Dashboard_Page.md | Diagnosis | `diagnosis` | control | B | U-B | P1 | missing | U-diagnosis |
| Patient-Portal/04_Dashboard_Page.md | Prescriptions | `prescriptions` | control | B | U-B | P1 | missing | U-prescriptions |
| Patient-Portal/04_Dashboard_Page.md | Appointments | `appointments` | control | B | U-B | P1 | missing | U-appointments |
| Patient-Portal/04_Dashboard_Page.md | Healthstudio | `HealthStudio` | control | B | U-B | P1 | missing | U-HealthStudio |
| Patient-Portal/04_Dashboard_Page.md | Aihealthchat | `AIHealthChat` | control | B | U-B | P1 | missing | U-AIHealthChat |
| Patient-Portal/04_Dashboard_Page.md | Latestappointmentresult | `LatestAppointmentResult` | control | B | U-B | P1 | missing | U-LatestAppointmentResult |
| Patient-Portal/04_Dashboard_Page.md | Treatmentresults | `TreatmentResults` | control | B | U-B | P1 | missing | U-TreatmentResults |
| Patient-Portal/04_Dashboard_Page.md | Medicalcontent | `MedicalContent` | control | B | U-B | P1 | missing | U-MedicalContent |
| Patient-Portal/04_Dashboard_Page.md | Vitalschart | `VitalsChart` | control | B | U-B | P1 | missing | U-VitalsChart |
| Patient-Portal/04_Dashboard_Page.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Patient-Portal/04_Dashboard_Page.md | Dashboard Page | `dashboard-page` | control | B | U-B | P1 | missing | U-dashboard-page |
| Patient-Portal/04_Dashboard_Page.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/04_Dashboard_Page.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Patient-Portal/04_Dashboard_Page.md | Success | `success` | control | B | U-B | P1 | missing | U-success |
| Patient-Portal/04_Dashboard_Page.md | Message | `message` | control | B | U-B | P1 | missing | U-message |
| Patient-Portal/04_Dashboard_Page.md | Code | `code` | control | B | U-B | P1 | missing | U-code |
| Patient-Portal/04_Dashboard_Page.md | Dashboardworkflow | `dashboardWorkflow` | control | B | U-B | P1 | missing | U-dashboardWorkflow |
| Patient-Portal/05_Appointments_Page.md | Data Testid | `data-testid` | control | D | U-B | P1 | missing | U-data-testid |
| Patient-Portal/05_Appointments_Page.md | Status | `status` | control | D | U-B | P1 | missing | U-status |
| Patient-Portal/05_Appointments_Page.md | Confirmed | `confirmed` | control | D | U-B | P1 | missing | U-confirmed |
| Patient-Portal/05_Appointments_Page.md | Scheduled | `scheduled` | control | D | U-B | P1 | missing | U-scheduled |
| Patient-Portal/05_Appointments_Page.md | Calendareventurl | `calendarEventUrl` | control | D | U-B | P1 | missing | U-calendarEventUrl |
| Patient-Portal/05_Appointments_Page.md | Buildtelehealthcalendarurl | `buildTelehealthCalendarUrl` | control | D | U-B | P1 | missing | U-buildTelehealthCalendarUrl |
| Patient-Portal/05_Appointments_Page.md | Appointmentdate | `appointmentDate` | control | D | U-B | P1 | missing | U-appointmentDate |
| Patient-Portal/05_Appointments_Page.md | Appointment Join Meeting Btn | `appointment-join-meeting-btn` | control | D | U-B | P1 | covered | U-appointment-join-meeting-btn |
| Patient-Portal/05_Appointments_Page.md | Appointmentid | `appointmentId` | control | D | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/05_Appointments_Page.md | Meetingid | `meetingId` | control | D | U-B | P1 | missing | U-meetingId |
| Patient-Portal/05_Appointments_Page.md | Queue Count | `queue-count` | control | D | U-B | P1 | covered | U-queue-count |
| Patient-Portal/05_Appointments_Page.md | Queue List | `queue-list` | control | D | U-B | P1 | covered | U-queue-list |
| Patient-Portal/05_Appointments_Page.md | Defectisarapdfmeetingqueue | `defectIsaraPdfMeetingQueue` | control | D | U-B | P1 | missing | U-defectIsaraPdfMeetingQueue |
| Patient-Portal/05_Appointments_Page.md | Pending | `pending` | control | D | U-B | P1 | missing | U-pending |
| Patient-Portal/05_Appointments_Page.md | Userealtimesync | `useRealtimeSync` | control | D | U-B | P1 | missing | U-useRealtimeSync |
| Patient-Portal/05_Appointments_Page.md | Onappointmentchange | `onAppointmentChange` | control | D | U-B | P1 | missing | U-onAppointmentChange |
| Patient-Portal/06_PHR_Page.md | Userealtimesync | `useRealtimeSync` | control | F | U-B | P1 | missing | U-useRealtimeSync |
| Patient-Portal/06_PHR_Page.md | Data Testid | `data-testid` | control | F | U-B | P1 | missing | U-data-testid |
| Patient-Portal/06_PHR_Page.md | Confirmed | `confirmed` | control | F | U-B | P1 | missing | U-confirmed |
| Patient-Portal/06_PHR_Page.md | Phr Page | `phr-page` | control | F | U-B | P1 | covered | U-phr-page |
| Patient-Portal/06_PHR_Page.md | Appointmentid | `appointmentId` | control | F | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/06_PHR_Page.md | Meetingid | `meetingId` | control | F | U-B | P1 | missing | U-meetingId |
| Patient-Portal/06_PHR_Page.md | Phrroute | `phrRoute` | control | F | U-B | P1 | missing | U-phrRoute |
| Patient-Portal/07_AI_Doctor_Page.md | Data Testid | `data-testid` | control | J | U-B | P1 | missing | U-data-testid |
| Patient-Portal/07_AI_Doctor_Page.md | Confirmed | `confirmed` | control | J | U-B | P1 | missing | U-confirmed |
| Patient-Portal/07_AI_Doctor_Page.md | Appointmentid | `appointmentId` | control | J | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/07_AI_Doctor_Page.md | Meetingid | `meetingId` | control | J | U-B | P1 | missing | U-meetingId |
| Patient-Portal/08_Medical_Content_Library.md | Data Testid | `data-testid` | control | H | U-B | P1 | missing | U-data-testid |
| Patient-Portal/08_Medical_Content_Library.md | Confirmed | `confirmed` | control | H | U-B | P1 | missing | U-confirmed |
| Patient-Portal/08_Medical_Content_Library.md | Appointmentid | `appointmentId` | control | H | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/08_Medical_Content_Library.md | Meetingid | `meetingId` | control | H | U-B | P1 | missing | U-meetingId |
| Patient-Portal/08_Medical_Content_Library.md | Success | `success` | control | H | U-B | P1 | missing | U-success |
| Patient-Portal/08_Medical_Content_Library.md | Message | `message` | control | H | U-B | P1 | missing | U-message |
| Patient-Portal/08_Medical_Content_Library.md | Code | `code` | control | H | U-B | P1 | missing | U-code |
| Patient-Portal/08_Medical_Content_Library.md | Contentroute | `contentRoute` | control | H | U-B | P1 | missing | U-contentRoute |
| Patient-Portal/09_Map_Page.md | Data Testid | `data-testid` | control | J | U-B | P1 | missing | U-data-testid |
| Patient-Portal/09_Map_Page.md | Confirmed | `confirmed` | control | J | U-B | P1 | missing | U-confirmed |
| Patient-Portal/09_Map_Page.md | Appointmentid | `appointmentId` | control | J | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/09_Map_Page.md | Meetingid | `meetingId` | control | J | U-B | P1 | missing | U-meetingId |
| Patient-Portal/09_Map_Page.md | Success | `success` | control | J | U-B | P1 | missing | U-success |
| Patient-Portal/09_Map_Page.md | Message | `message` | control | J | U-B | P1 | missing | U-message |
| Patient-Portal/09_Map_Page.md | Code | `code` | control | J | U-B | P1 | missing | U-code |
| Patient-Portal/09_Map_Page.md | Mappage | `mapPage` | control | J | U-B | P1 | missing | U-mapPage |
| Patient-Portal/10_PDPA_Page.md | Data Testid | `data-testid` | control | G | U-B | P1 | missing | U-data-testid |
| Patient-Portal/10_PDPA_Page.md | Confirmed | `confirmed` | control | G | U-B | P1 | missing | U-confirmed |
| Patient-Portal/10_PDPA_Page.md | Pdpa Audit Log | `pdpa-audit-log` | control | G | U-B | P1 | covered | U-pdpa-audit-log |
| Patient-Portal/10_PDPA_Page.md | Appointmentid | `appointmentId` | control | G | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/10_PDPA_Page.md | Meetingid | `meetingId` | control | G | U-B | P1 | missing | U-meetingId |
| Patient-Portal/11_Living_Will_Page.md | Data Testid | `data-testid` | control | G | U-B | P1 | missing | U-data-testid |
| Patient-Portal/11_Living_Will_Page.md | Confirmed | `confirmed` | control | G | U-B | P1 | missing | U-confirmed |
| Patient-Portal/11_Living_Will_Page.md | Appointmentid | `appointmentId` | control | G | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/11_Living_Will_Page.md | Meetingid | `meetingId` | control | G | U-B | P1 | missing | U-meetingId |
| Patient-Portal/11_Living_Will_Page.md | Living Will Signature | `living-will-signature` | control | G | U-B | P1 | covered | U-living-will-signature |
| Patient-Portal/11_Living_Will_Page.md | Livingwillworkflow | `livingWillWorkflow` | control | G | U-B | P1 | missing | U-livingWillWorkflow |
| Patient-Portal/12_Profile_Page.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Patient-Portal/12_Profile_Page.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Patient-Portal/12_Profile_Page.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/12_Profile_Page.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Patient-Portal/12_Profile_Page.md | Success | `success` | control | B | U-B | P1 | missing | U-success |
| Patient-Portal/12_Profile_Page.md | Message | `message` | control | B | U-B | P1 | missing | U-message |
| Patient-Portal/12_Profile_Page.md | Code | `code` | control | B | U-B | P1 | missing | U-code |
| Patient-Portal/12_Profile_Page.md | Usermanagementworkflow | `userManagementWorkflow` | control | B | U-B | P1 | missing | U-userManagementWorkflow |
| Patient-Portal/13_Settings_Page.md | Data Testid | `data-testid` | control | B | U-B | P1 | missing | U-data-testid |
| Patient-Portal/13_Settings_Page.md | Confirmed | `confirmed` | control | B | U-B | P1 | missing | U-confirmed |
| Patient-Portal/13_Settings_Page.md | Appointmentid | `appointmentId` | control | B | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/13_Settings_Page.md | Meetingid | `meetingId` | control | B | U-B | P1 | missing | U-meetingId |
| Patient-Portal/13_Settings_Page.md | Success | `success` | control | B | U-B | P1 | missing | U-success |
| Patient-Portal/13_Settings_Page.md | Message | `message` | control | B | U-B | P1 | missing | U-message |
| Patient-Portal/13_Settings_Page.md | Code | `code` | control | B | U-B | P1 | missing | U-code |
| Patient-Portal/13_Settings_Page.md | Settingspage | `settingsPage` | control | B | U-B | P1 | missing | U-settingsPage |
| Patient-Portal/14_Timeline_Page.md | Data Testid | `data-testid` | control | J | U-B | P1 | missing | U-data-testid |
| Patient-Portal/14_Timeline_Page.md | Appointments | `appointments` | control | J | U-B | P1 | missing | U-appointments |
| Patient-Portal/14_Timeline_Page.md | Confirmed | `confirmed` | control | J | U-B | P1 | missing | U-confirmed |
| Patient-Portal/14_Timeline_Page.md | Appointmentid | `appointmentId` | control | J | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/14_Timeline_Page.md | Meetingid | `meetingId` | control | J | U-B | P1 | missing | U-meetingId |
| Patient-Portal/14_Timeline_Page.md | Success | `success` | control | J | U-B | P1 | missing | U-success |
| Patient-Portal/14_Timeline_Page.md | Message | `message` | control | J | U-B | P1 | missing | U-message |
| Patient-Portal/14_Timeline_Page.md | Code | `code` | control | J | U-B | P1 | missing | U-code |
| Patient-Portal/14_Timeline_Page.md | Timelinepage | `timelinePage` | control | J | U-B | P1 | missing | U-timelinePage |
| Patient-Portal/14_Timeline_Page.md | Timeline Download | `timeline-download` | control | J | U-B | P1 | covered | U-timeline-download |
| Patient-Portal/14_Timeline_Page.md | Userealtimesync | `useRealtimeSync` | control | J | U-B | P1 | missing | U-useRealtimeSync |
| Patient-Portal/15_Notification_System.md | Data Testid | `data-testid` | control | I | U-B | P1 | missing | U-data-testid |
| Patient-Portal/15_Notification_System.md | Confirmed | `confirmed` | control | I | U-B | P1 | missing | U-confirmed |
| Patient-Portal/15_Notification_System.md | Appointmentid | `appointmentId` | control | I | U-B | P1 | missing | U-appointmentId |
| Patient-Portal/15_Notification_System.md | Meetingid | `meetingId` | control | I | U-B | P1 | missing | U-meetingId |
| Patient-Portal/15_Notification_System.md | Success | `success` | control | I | U-B | P1 | missing | U-success |
| Patient-Portal/15_Notification_System.md | Message | `message` | control | I | U-B | P1 | missing | U-message |
| Patient-Portal/15_Notification_System.md | Code | `code` | control | I | U-B | P1 | missing | U-code |
| Patient-Portal/15_Notification_System.md | Notificationworkflow | `notificationWorkflow` | control | I | U-B | P1 | missing | U-notificationWorkflow |

## Regenerate

```bash
python scripts/audit-ui-element-coverage.py
python scripts/enrich-process-ui-inventory.py
```
