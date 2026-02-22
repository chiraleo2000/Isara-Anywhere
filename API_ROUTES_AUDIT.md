# Complete API Routes Audit — Isara Anywhere

> Generated from source code analysis. Every `app.get/post/put/delete` and `router.get/post/put/delete` across all 3 servers.

---

## 1. PATIENT PORTAL SERVER (port 3005)

Express TypeScript server. Routes are registered via `app.use('/api/<prefix>', router)` in `server/index.ts`.

### Direct routes (index.ts)

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/health` | No | Health check |
| GET | `/api/health` | No | API health check |
| GET | `/api/health/gcs` | No | GCS connection check |
| GET | `/api/health/db` | No | Database health check |
| GET | `/api/consultants` | No | Public consultants list |
| GET | `/api/consultants/specialties` | No | Public specialties |
| GET | `/api/health-records/instructions/:appointmentId` | No | Patient instructions |
| GET | `/api/dashboard/stats` | Yes | Dashboard stats |
| GET | `/api/health-records/treatment-results` | No | Treatment results |
| GET | `/api/health-records` | Yes | All health records |
| POST | `/api/storage/upload` | No | Storage upload |
| PUT | `/api/profile` | Yes | Update profile |
| GET | `/api/profile` | Yes | Get profile |
| GET | `/api/users/profile` | Yes | Alias for profile |
| GET | `/api/medical-content` | No | Alias → content/medical |
| GET | `/api/timeline` | Yes | Health timeline |
| GET | `/api/storage/health` | No | Storage health |
| POST | `/api/profile/image` | Yes | Profile image upload |
| POST | `/api/profile/avatar` | Yes | Avatar upload |
| GET | `/api/emr/patient/:patientId` | Yes | EMR history by patient |
| GET | `/api/emr/my` | Yes | My EMR history |

### Auth routes — prefix `/api/auth` (also aliased as `/api/users` and `/auth`)

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/auth/` | No | Get profile (standalone) |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/validate` | No | Validate session |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PUT | `/api/auth/profile` | Yes | Update user profile |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/request-password-reset` | No | Request password reset |
| GET | `/api/auth/verify-reset-token/:token` | No | Verify reset token |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| GET | `/api/auth/check-user/:email` | No | Debug check user |
| POST | `/api/auth/avatar` | Yes | Upload avatar URL |
| POST | `/api/auth/profile/image` | Yes | Alias for avatar upload |

> **Aliases:** All the above are also available under `/api/users/...` and `/auth/...`

### Appointments — prefix `/api/appointments`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/appointments/history` | Yes | Appointment history |
| GET | `/api/appointments/my` | Yes | My appointments |
| GET | `/api/appointments/` | Yes | All patient appointments |
| GET | `/api/appointments/patient/:patientId` | Yes | By patient ID |
| GET | `/api/appointments/:appointmentId` | Yes | Single appointment |
| POST | `/api/appointments/` | Yes | Create appointment |
| PUT | `/api/appointments/:appointmentId/status` | Yes | Update status |
| PUT | `/api/appointments/:appointmentId` | Yes | Update appointment |
| DELETE | `/api/appointments/:appointmentId` | Yes | Cancel appointment |
| GET | `/api/appointments/notifications/:userId` | Yes | User notifications |
| PUT | `/api/appointments/notifications/:userId/:notificationId/read` | Yes | Mark notification read |
| PUT | `/api/appointments/notifications/:userId/read-all` | Yes | Mark all read |
| GET | `/api/appointments/notifications/:userId/count` | Yes | Unread count |

### PHR (Personal Health Records) — prefix `/api/phr`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/phr/` | Yes | Get current user's PHR |
| POST | `/api/phr/vitals` | Yes | Add vitals for current user |
| GET | `/api/phr/patient/:patientId` | Yes | Get PHR by patient |
| GET | `/api/phr/:patientId` | Yes | Get PHR |
| PUT | `/api/phr/:patientId` | Yes | Update PHR |
| PUT | `/api/phr/profile/:id` | Yes | Update profile |
| GET | `/api/phr/:patientId/vitals` | Yes | Get vital signs |
| POST | `/api/phr/:patientId/vitals` | Yes | Add vital signs |
| GET | `/api/phr/:patientId/medications` | Yes | Get medications |
| POST | `/api/phr/:patientId/medications` | Yes | Add medication |
| GET | `/api/phr/:patientId/allergies` | Yes | Get allergies |
| POST | `/api/phr/:patientId/allergies` | Yes | Add allergy |
| GET | `/api/phr/:patientId/health-logs` | Yes | Get health logs/EMR |
| GET | `/api/phr/:patientId/health-logs/:entryId` | Yes | Get specific health log |
| GET | `/api/phr/:patientId/timeline` | Yes | Medical timeline |
| GET | `/api/phr/:patientId/living-will` | Yes | Get living will |
| POST | `/api/phr/:patientId/living-will` | Yes | Create/update living will |
| PUT | `/api/phr/:patientId/living-will` | Yes | Update living will |
| PUT | `/api/phr/:patientId/living-will/share` | Yes | Update sharing settings |
| DELETE | `/api/phr/:patientId/living-will` | Yes | Revoke living will |
| POST | `/api/phr/profile/:userId/avatar` | Yes | Upload avatar |
| GET | `/api/phr/profile/:userId/avatar` | Yes | Get avatar |

### AI — prefix `/api/ai`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| POST | `/api/ai/chat` | Yes | Health Q&A chatbot |
| GET | `/api/ai/chat/history` | Yes | Get chat history |
| POST | `/api/ai/chat/clear` | Yes | Clear chat history |
| DELETE | `/api/ai/chat/history` | Yes | Clear chat history (alt) |
| GET | `/api/ai/chat/memory` | Yes | Get long-term memories |
| POST | `/api/ai/chat/memory` | Yes | Save memory |
| POST | `/api/ai/chat/memory/summarize` | Yes | Summarize session |
| DELETE | `/api/ai/chat/memory/:memoryId` | Yes | Delete memory |
| POST | `/api/ai/symptom-checker` | Yes | AI triage |
| POST | `/api/ai/risk-assessment` | Yes | Health risk assessment |
| POST | `/api/ai/health-info` | Yes | Quick health facts |
| GET | `/api/ai/status` | No | AI status check |
| POST | `/api/ai/symptom-analysis` | Yes | Multimodal symptom analysis |
| POST | `/api/ai/symptom-suggest` | Yes | Symptom description suggestions |
| POST | `/api/ai/validate` | No | Man-in-the-loop AI validation |

### Notifications — prefix `/api/notifications`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/notifications/` | No | Get all notifications |
| GET | `/api/notifications/count` | No | Get unread count |
| PUT | `/api/notifications/:id/read` | No | Mark notification read |
| PUT | `/api/notifications/read-all` | No | Mark all read |
| DELETE | `/api/notifications/:id` | No | Delete notification |
| POST | `/api/notifications/test` | No | Create test notification |
| GET | `/api/notifications/settings` | No | Get notification settings |
| PUT | `/api/notifications/settings` | No | Update notification settings |

### PDPA (Data Privacy) — prefix `/api/pdpa`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/pdpa/status` | Yes | Get PDPA status |
| POST | `/api/pdpa/consent` | Yes | Grant consent |
| DELETE | `/api/pdpa/consent` | Yes | Revoke all consents |
| GET | `/api/pdpa/consents/:patientId` | Yes | Get all consents |
| PUT | `/api/pdpa/consents/:patientId/:consentId` | Yes | Update consent |
| POST | `/api/pdpa/consents/:patientId` | Yes | Grant consent to doctor |
| PUT | `/api/pdpa/consents/:patientId/:consentId/revoke` | Yes | Revoke consent |
| POST | `/api/pdpa/verify` | Yes | Verify consent |
| GET | `/api/pdpa/audit/:patientId` | Yes | Get audit logs |
| GET | `/api/pdpa/living-will/:patientId` | Yes | Get living will |
| GET | `/api/pdpa/living-will/:patientId/versions` | Yes | Version history |
| GET | `/api/pdpa/living-will/:patientId/versions/:versionId` | Yes | Specific version |
| POST | `/api/pdpa/living-will/:patientId/rollback/:versionId` | Yes | Rollback version |
| POST | `/api/pdpa/living-will/:patientId` | Yes | Save/update living will |
| POST | `/api/pdpa/living-will/:patientId/signature` | Yes | Upload signature |
| GET | `/api/pdpa/doctor-consents/:patientId` | Yes | Get doctor consents |

### Content — prefix `/api/content`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/content/medical` | No | Get medical content |
| GET | `/api/content/medical/:id` | No | Get specific article |
| POST | `/api/content/medical/:id/view` | No | Track article view |
| GET | `/api/content/clinical-resources` | No | Get clinical resources |

### Metadata — prefix `/api/metadata`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/metadata/medications` | Yes | Get medications |
| GET | `/api/metadata/medications/search` | Yes | Search medications |
| GET | `/api/metadata/drug-interactions` | Yes | Get drug interactions |
| GET | `/api/metadata/lab-tests` | Yes | Get lab tests |
| GET | `/api/metadata/reference-ranges` | Yes | Get reference ranges |
| GET | `/api/metadata/icd10-codes` | Yes | Get ICD-10 codes |
| GET | `/api/metadata/icd10-codes/search` | Yes | Search ICD-10 codes |
| GET | `/api/metadata/specialties` | Yes | Get specialties |
| GET | `/api/metadata/health-tips` | Yes | Get health tips |
| GET | `/api/metadata/medical-content` | Yes | Get medical content |

### Doctors — prefix `/api/doctors`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/doctors/` | Yes | Get all doctors |
| GET | `/api/doctors/:doctorId` | Yes | Get doctor by ID |
| GET | `/api/doctors/:doctorId/schedule` | Yes | Get schedule |
| GET | `/api/doctors/:doctorId/slots` | Yes | Get available slots |
| GET | `/api/doctors/search/specialty/:specialty` | Yes | Search by specialty |
| GET | `/api/doctors/search/name/:name` | Yes | Search by name |
| GET | `/api/doctors/:doctorId/reviews` | Yes | Get reviews |

### Video Meeting — prefix `/api/video-meeting`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/video-meeting/config` | No | Get config |
| POST | `/api/video-meeting/create` | No | Create meeting |
| GET | `/api/video-meeting/health` | No | Meeting service health |
| GET | `/api/video-meeting/:appointmentId` | No | Get meeting |
| POST | `/api/video-meeting/:appointmentId/join` | No | Join meeting |
| POST | `/api/video-meeting/:appointmentId/transcript` | No | Add transcript entry |
| POST | `/api/video-meeting/:appointmentId/transcribe-audio` | No | Transcribe audio |
| POST | `/api/video-meeting/:appointmentId/end` | No | End meeting + generate summary |
| GET | `/api/video-meeting/:appointmentId/transcript` | No | Get transcript |
| POST | `/api/video-meeting/:appointmentId/summarize` | No | Generate summary |
| POST | `/api/video-meeting/:appointmentId/recommendations` | No | Generate recommendations |
| POST | `/api/video-meeting/:appointmentId/invite` | No | Create guest invite |
| POST | `/api/video-meeting/join-with-invite` | No | Join via invite token |
| GET | `/api/video-meeting/:appointmentId/invites` | No | Get invites |
| DELETE | `/api/video-meeting/:appointmentId/invite/:token` | No | Revoke invite |

### GCS (Google Cloud Storage) — prefix `/api/gcs`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/gcs/status` | No | GCS status |
| GET | `/api/gcs/signed-url/download` | No | Get download URL |
| GET | `/api/gcs/signed-url/upload` | No | Get upload URL |
| GET | `/api/gcs/read` | No | Read file from GCS |
| POST | `/api/gcs/write` | No | Write file to GCS |
| DELETE | `/api/gcs/delete` | No | Delete file from GCS |
| GET | `/api/gcs/list` | No | List files |
| GET | `/api/gcs/exists` | No | Check file existence |

### Appointment Pool — prefix `/api/appointment-pool`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/appointment-pool/` | Yes | Get pool items |
| POST | `/api/appointment-pool/` | Yes | Add to pool |
| POST | `/api/appointment-pool/:poolId/claim` | Yes | Doctor claims appointment |
| POST | `/api/appointment-pool/:poolId/admin-assign` | Yes | Admin assigns doctor |
| POST | `/api/appointment-pool/:poolId/approve` | Yes | Approve pool appointment |
| POST | `/api/appointment-pool/:poolId/ai-match` | Yes | AI-based doctor matching |
| GET | `/api/appointment-pool/meeting-check/:appointmentId` | Yes | Check meeting eligibility |
| POST | `/api/appointment-pool/missed-meeting/:appointmentId` | Yes | Report missed meeting |
| GET | `/api/appointment-pool/meeting-rules` | Yes | Get meeting rules |
| PUT | `/api/appointment-pool/meeting-rules` | Yes | Update meeting rules |

### Google Services — prefix `/api/google`

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/google/health` | No | Google services health |
| GET | `/api/google/maps/config` | Yes | Get Maps API config |
| POST | `/api/google/calendar/event` | Yes | Create calendar event |
| GET | `/api/google/calendar/availability` | Yes | Check calendar availability |
| POST | `/api/google/meet/create` | Yes | Create Google Meet |
| GET | `/api/google/meet/:appointmentId` | Yes | Get Meet info |
| GET | `/api/google/places/nearby` | No | Nearby places search |
| GET | `/api/google/maps/nearby` | No | Nearby map search |
| GET | `/api/google/maps/place/:placeId` | No | Get place details |
| GET | `/api/google/maps/photo` | No | Get place photo |
| GET | `/api/google/maps/geocode` | No | Geocode address |
| GET | `/api/google/maps/directions` | No | Get directions |
| GET | `/api/google/status` | No | Google services status |

> Patient Portal Total: ~170 routes

---

## 2. DOCTOR PORTAL SERVER (port 3010)

Three separate CJS Express servers behind an nginx proxy:

### 2a. Auth Server (authServer.cjs — port 3011)

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/health` | No | Health check |
| POST | `/auth/register` | No | Register doctor |
| POST | `/auth/login` | No | Login |
| POST | `/auth/logout` | No | Logout |
| POST | `/auth/request-password-reset` | No | Request password reset |
| GET | `/auth/verify-reset-token/:token` | No | Verify reset token |
| POST | `/auth/reset-password` | No | Reset password |
| POST | `/auth/send-email` | No | Send email |
| GET | `/admin/pending-doctors` | Yes | Get pending doctors (admin) |
| GET | `/auth/admin/pending-doctors` | Yes | Get pending doctors (alias) |
| POST | `/auth/admin/approve-doctor` | Yes | Approve doctor (admin) |
| POST | `/auth/admin/reject-doctor` | Yes | Reject doctor (admin) |
| POST | `/auth/admin/update-role` | Yes | Update user role (admin) |
| POST | `/admin/update-doctor-status` | Yes | Update doctor status |
| POST | `/admin/remove-admin` | Yes | Remove admin role |
| GET | `/auth/pending-approvals` | Yes | Get pending approvals |
| POST | `/auth/approve-doctor` | Yes | Approve doctor |
| POST | `/auth/reject-doctor` | Yes | Reject doctor |
| POST | `/admin/approve-doctor` | Yes | Approve doctor (admin alias) |
| POST | `/admin/reject-doctor` | Yes | Reject doctor (admin alias) |
| GET | `/auth/verify` | Yes | Verify session/token |
| GET | `/api/profile` | Yes | Get profile |
| PUT | `/auth/profile` | Yes | Update profile |
| PUT | `/api/auth/profile` | Yes | Update profile (alias) |
| GET | `/auth/me` | Yes | Get current user |
| POST | `/api/profile/avatar` | Yes | Upload avatar |
| POST | `/api/users/avatar` | Yes | Upload avatar (alias) |
| POST | `/test/reset-rate-limits` | No | Reset rate limits (test) |
| GET | `/test/check-user/:email` | No | Check user (test) |

### 2b. Main API Server (mainApiServer.cjs — port 3009)

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/api/health` | No | Health check |
| GET | `/health` | No | Health check |
| GET | `/health/db` | No | Database health |
| GET | `/api/health/db` | No | Database health (alias) |
| **Dashboard** | | | |
| GET | `/api/dashboard/:doctorId` | Yes | Doctor dashboard |
| **Doctors** | | | |
| GET | `/api/doctors` | No | Get all doctors |
| GET | `/api/doctors/:doctorId` | No | Get doctor by ID |
| GET | `/api/doctors/:doctorId/profile` | No | Get doctor profile |
| GET | `/api/doctors/profile` | Yes | Get own profile |
| PUT | `/api/doctors/profile` | Yes | Update own profile |
| PUT | `/api/auth/profile` | Yes | Update auth profile |
| PUT | `/auth/profile` | Yes | Update auth profile (alias) |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/api/auth/me` | Yes | Get current user (alias) |
| GET | `/api/users/me` | Yes | Get current user (alias) |
| **Admin** | | | |
| GET | `/api/admin/stats` | Yes | Admin stats |
| POST | `/api/auth/change-password` | Yes | Change password |
| GET | `/api/admin/pending-doctors` | Yes | Get pending doctors |
| PUT | `/api/admin/doctors/:doctorId/approve` | Yes | Approve doctor |
| PUT | `/api/admin/doctors/:doctorId/reject` | Yes | Reject doctor |
| POST | `/api/admin/approve-doctor` | Yes | Approve doctor (alt) |
| POST | `/api/admin/reject-doctor` | Yes | Reject doctor (alt) |
| POST | `/api/admin/update-role` | Yes | Update role |
| POST | `/api/admin/remove-admin` | Yes | Remove admin role |
| PUT | `/api/admin/users/:userId/role` | Yes | Update user role |
| GET | `/api/admin/users` | Yes | Get all users |
| GET | `/api/admin/users/:userId/privileges` | Yes | Get user privileges |
| PUT | `/api/admin/users/:userId/privileges` | Yes | Update user privileges |
| GET | `/api/admin/dashboard-stats` | Yes | Dashboard statistics |
| GET | `/api/admin/analytics` | Yes | Analytics data |
| **Patients** | | | |
| GET | `/api/patients` | Yes | Get all patients |
| GET | `/api/patients/:patientId` | Yes | Get patient by ID |
| GET | `/api/patients/:patientId/emr` | Yes | Get patient EMR |
| GET | `/api/patients/:patientId/health-logs` | Yes | Get patient health logs |
| POST | `/api/patients/:patientId/health-logs` | Yes | Add health log entry |
| GET | `/api/patients/:patientId/living-will` | Yes | Get patient living will |
| **EMR** | | | |
| POST | `/api/emr` | Yes | Create EMR record |
| GET | `/api/emr/patient/:patientId` | Yes | Get EMR by patient |
| GET | `/api/emr` | Yes | Get EMR records |
| POST | `/api/emr/:emrId/sign` | Yes | Sign EMR (by ID) |
| POST | `/api/emr/sign` | Yes | Sign EMR |
| POST | `/api/emr/validate` | Yes | Validate EMR |
| **AI/Clinical Decision Support** | | | |
| GET | `/api/ai/health` | No | AI health check |
| POST | `/api/ai/summarize` | Yes | Summarize text |
| POST | `/api/ai/emr-summary` | Yes | Generate EMR summary |
| POST | `/api/ai/analyze-lab` | Yes | Analyze lab results |
| POST | `/api/ai/chat` | Yes | AI clinical chat |
| GET | `/api/ai/pre-summary/:patientId` | Yes | Pre-consultation summary |
| POST | `/api/ai/validate` | Yes | AI validation |
| POST | `/api/ai/cds` | Yes | Clinical decision support |
| POST | `/api/ai/patient-instructions` | Yes | Generate patient instructions |
| POST | `/api/ai/validation` | Yes | AI-assisted validation |
| POST | `/api/ai/pre-consultation-summary` | Yes | Pre-consultation summary (alt) |
| POST | `/api/ai/analyze-document` | Yes | Analyze document |
| POST | `/api/ai/document-analysis` | Yes | Document analysis (alias) |
| GET | `/api/ai/knowledge` | Yes | Knowledge base query |
| POST | `/api/ai/cds/drug-interactions` | Yes | Drug interaction check |
| GET | `/api/ai/validations` | Yes | Get AI validations |
| POST | `/api/ai/validations/:id/approve` | Yes | Approve AI validation |
| POST | `/api/ai/knowledge/search` | Yes | Search knowledge base |
| POST | `/api/ai/generate-summary` | Yes | Generate meeting summary |
| **Meetings** | | | |
| POST | `/api/meetings/create` | Yes | Create meeting |
| POST | `/api/meeting/transcript` | Yes | Save meeting transcript |
| GET | `/api/meeting/transcript/:appointmentId` | Yes | Get transcript |
| POST | `/api/meeting/transcript/summary` | Yes | Generate transcript summary |
| **Video Meeting** | | | |
| GET | `/api/video-meeting/health` | No | Video meeting health |
| POST | `/api/video-meeting/create` | Yes | Create video meeting |
| GET | `/api/video-meeting/:appointmentId` | Yes | Get meeting info |
| POST | `/api/video-meeting/:appointmentId/join` | Yes | Join meeting |
| POST | `/api/video-meeting/:appointmentId/transcript` | Yes | Add transcript entry |
| POST | `/api/video-meeting/:appointmentId/transcribe-audio` | Yes | Transcribe audio |
| POST | `/api/video-meeting/:appointmentId/end` | Yes | End meeting |
| POST | `/api/video-meeting/:appointmentId/upload-recording` | Yes | Upload recording |
| GET | `/api/video-meeting/:appointmentId/files` | Yes | Get meeting files |
| POST | `/api/video-meeting/:appointmentId/recommendations` | Yes | Generate recommendations |
| GET | `/api/video-meeting/:appointmentId/transcript` | Yes | Get transcript |
| GET | `/api/video-meeting/history/:doctorId` | Yes | Get meeting history |
| **Queue Management** | | | |
| GET | `/api/queue/doctor/:doctorId` | Yes | Get doctor queue |
| POST | `/api/queue/call-next` | Yes | Call next in queue |
| POST | `/api/queue/skip` | Yes | Skip queue entry |
| **Appointments** | | | |
| GET | `/api/appointments` | Yes | Get appointments |
| GET | `/api/appointments/:appointmentId` | Yes | Get appointment by ID |
| GET | `/api/appointments/pending/:doctorId` | Yes | Get pending appointments |
| POST | `/api/appointments/:appointmentId/confirm` | Yes | Confirm appointment |
| POST | `/api/appointments/:appointmentId/decline` | Yes | Decline appointment |
| POST | `/api/appointments/:appointmentId/reject` | Yes | Reject appointment |
| PUT | `/api/appointments/:appointmentId/status` | Yes | Update appointment status |
| GET | `/api/appointments/patient/:patientId` | Yes | Appointments by patient |
| GET | `/api/appointments/doctor/:doctorId` | Yes | Appointments by doctor |
| POST | `/api/appointments` | Yes | Create appointment |
| **Appointment Pool** | | | |
| GET | `/api/appointment-pool` | Yes | Get appointment pool |
| POST | `/api/appointment-pool/:poolId/claim` | Yes | Claim pool appointment |
| POST | `/api/appointment-pool/:poolId/admin-assign` | Yes | Admin assign appointment |
| **PHR** | | | |
| GET | `/api/phr/patient/:patientId` | Yes | Get patient PHR |
| GET | `/api/phr/patient/:patientId/vitals/history` | Yes | Get vitals history |
| **Prescriptions** | | | |
| POST | `/api/prescriptions` | Yes | Create prescription |
| GET | `/api/prescriptions/patient/:patientId` | Yes | Get patient prescriptions |
| GET | `/api/prescriptions/pending/count/:doctorId` | Yes | Pending count |
| GET | `/api/prescriptions/pending/:doctorId` | Yes | Pending prescriptions |
| **Lab Orders** | | | |
| POST | `/api/lab-orders` | Yes | Create lab order |
| GET | `/api/lab-orders/patient/:patientId` | Yes | Get patient lab orders |
| **Notifications** | | | |
| GET | `/api/notifications` | Yes | Get notifications |
| GET | `/api/notifications/count` | Yes | Get unread count |
| POST | `/api/notifications` | Yes | Create notification |
| PUT | `/api/notifications/:id/read` | Yes | Mark read |
| PUT | `/api/notifications/mark-all-read` | Yes | Mark all read |
| POST | `/api/notifications/emr-signed` | Yes | EMR signed notification |
| POST | `/api/patient-instructions` | Yes | Save patient instructions |
| **Medical Content** | | | |
| GET | `/api/medical-content` | No | Get medical content |
| POST | `/api/medical-content` | Yes | Create medical content |
| GET | `/api/medical-content/pending` | Yes | Get pending content |
| PUT | `/api/medical-content/:contentId/approve` | Yes | Approve content |
| PUT | `/api/medical-content/:contentId/reject` | Yes | Reject content |
| GET | `/api/content/medical` | No | Get medical content |
| GET | `/api/content/medical/pending` | Yes | Pending medical content |
| GET | `/api/content/medical/:id` | No | Get article by ID |
| POST | `/api/content/medical` | Yes | Create medical content |
| PUT | `/api/content/medical/:id` | Yes | Update medical content |
| DELETE | `/api/content/medical/:id` | Yes | Delete medical content |
| POST | `/api/content/medical/:id/review` | Yes | Review medical content |
| GET | `/api/content/tags/medical` | No | Get medical tags |
| **Clinical Content** | | | |
| GET | `/api/content/clinical` | No | Get clinical content |
| GET | `/api/content/clinical/pending` | Yes | Pending clinical content |
| GET | `/api/content/clinical/:id` | No | Get clinical by ID |
| POST | `/api/content/clinical` | Yes | Create clinical content |
| PUT | `/api/content/clinical/:id` | Yes | Update clinical content |
| DELETE | `/api/content/clinical/:id` | Yes | Delete clinical content |
| POST | `/api/content/clinical/:id/review` | Yes | Review clinical content |
| GET | `/api/content/tags/clinical` | No | Get clinical tags |
| **Clinical Resources** | | | |
| GET | `/api/clinical-resources` | Yes | Get clinical resources |
| POST | `/api/clinical-resources` | Yes | Create clinical resource |
| PUT | `/api/clinical-resources/:resourceId/approve` | Yes | Approve resource |
| **Consultants** | | | |
| GET | `/api/consultants` | No | Get consultants |
| GET | `/api/consultants/specialties` | No | Get specialties |
| GET | `/api/consultants/specialties/list` | No | List specialties |
| POST | `/api/consultants` | Yes | Create consultant |
| **Users / Profile** | | | |
| GET | `/api/users` | Yes | List users |
| POST | `/api/profile/avatar` | Yes | Upload avatar |
| POST | `/api/users/avatar` | Yes | Upload avatar (alias) |
| PUT | `/api/profile` | Yes | Update profile |
| **Storage** | | | |
| POST | `/api/storage/upload` | Yes | Upload file |
| GET | `/api/storage/health` | No | Storage health |
| **Metadata** | | | |
| GET | `/api/metadata/medications` | No | Get medications |
| GET | `/api/metadata/lab-tests` | No | Get lab tests |
| GET | `/api/metadata/icd10-codes` | No | Get ICD-10 codes |
| GET | `/api/metadata/drug-interactions` | No | Get drug interactions |

### 2c. GCS API Server (gcsApiServer.cjs — port 3012)

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| **Storage** | | | |
| GET | `/api/health` | No | Health check |
| GET | `/api/storage/health` | No | Storage health |
| GET | `/api/storage/read` | No | Read JSON from GCS |
| POST | `/api/storage/write` | No | Write JSON to GCS |
| POST | `/api/storage/upload` | No | Upload file to GCS |
| POST | `/api/storage/upload-base64` | No | Upload base64 file |
| DELETE | `/api/storage/delete` | No | Delete file |
| GET | `/api/storage/list` | No | List files |
| POST | `/api/storage/batch-read` | No | Batch read files |
| POST | `/api/storage/batch-write` | No | Batch write files |
| **Medical Content** | | | |
| GET | `/api/content/medical` | No | Get medical content |
| GET | `/api/content/medical/:id` | No | Get article by ID |
| POST | `/api/content/medical` | No | Create medical content |
| PUT | `/api/content/medical/:id` | No | Update medical content |
| DELETE | `/api/content/medical/:id` | No | Delete medical content |
| GET | `/api/content/medical/pending` | No | Get pending content |
| POST | `/api/content/medical/:id/review` | No | Review content |
| **Clinical Content** | | | |
| GET | `/api/content/clinical` | No | Get clinical content |
| GET | `/api/content/clinical/pending` | No | Pending clinical content |
| GET | `/api/content/clinical/:id` | No | Get clinical by ID |
| POST | `/api/content/clinical` | No | Create clinical content |
| PUT | `/api/content/clinical/:id` | No | Update clinical content |
| DELETE | `/api/content/clinical/:id` | No | Delete clinical content |
| POST | `/api/content/clinical/:id/review` | No | Review clinical content |
| **Consultants** | | | |
| GET | `/api/consultants` | No | Get consultants |
| GET | `/api/consultants/:id` | No | Get consultant by ID |
| POST | `/api/consultants` | No | Create consultant |
| PUT | `/api/consultants/:id` | No | Update consultant |
| DELETE | `/api/consultants/:id` | No | Delete consultant |
| POST | `/api/consultants/:id/availability` | No | Set availability |
| POST | `/api/consultants/:id/review` | No | Review consultant |
| GET | `/api/consultants/specialties/list` | No | List specialties |
| **Content Tags** | | | |
| GET | `/api/content/tags/:type` | No | Get tags by type |
| POST | `/api/content/tags/:type` | No | Create tag |
| **Content Comments** | | | |
| POST | `/api/content/:type/:id/comments` | No | Add comment |
| **Patient Data (GCS fallback)** | | | |
| POST | `/api/patients/:patientId/health-logs` | No | Add health log |
| GET | `/api/patients/:patientId/health-logs` | No | Get health logs |
| POST | `/api/notifications/emr-signed` | No | EMR signed notification |
| PUT | `/api/appointments/:appointmentId/status` | No | Update appointment status |
| POST | `/api/emr` | No | Create EMR |
| GET | `/api/emr/:emrId` | No | Get EMR by ID |
| PUT | `/api/emr/:emrId` | No | Update EMR |
| GET | `/api/emr/patient/:patientId` | No | Get EMR by patient |
| GET | `/api/patients/:patientId` | No | Get patient |
| GET | `/api/patients` | No | Get all patients |
| GET | `/api/appointments/completed` | No | Get completed appointments |
| GET | `/api/appointments` | No | Get appointments |
| GET | `/api/appointments/:appointmentId` | No | Get appointment |
| **Notifications (GCS)** | | | |
| GET | `/api/notifications/doctor/:doctorId` | No | Get doctor notifications |
| PUT | `/api/notifications/:notificationId/read` | No | Mark read |
| PUT | `/api/notifications/doctor/:doctorId/read-all` | No | Mark all read |
| POST | `/api/notifications/doctor` | No | Create doctor notification |

---

## 3. MEETING SERVER (Izara-jitsi-server — port 3020)

Express ESM JavaScript server.

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | `/health` | No | Health check |
| GET | `/api/health` | No | API health check |
| **Meetings** | | | |
| POST | `/api/meetings/create` | Yes | Create meeting (strict auth) |
| POST | `/api/meeting/create` | Optional | Create meeting (optional auth) |
| GET | `/api/meetings/:id` | Optional | Get meeting |
| GET | `/api/meetings/:id/status` | No | Get meeting status |
| GET | `/api/meetings/:id/participants` | No | Get participants |
| **Transcription** | | | |
| POST | `/api/meetings/:id/start-transcription` | Yes | Start transcription |
| POST | `/api/meetings/:id/pause-transcription` | Yes | Pause transcription |
| POST | `/api/meetings/:id/transcript` | Yes | Add transcript entry |
| POST | `/api/meetings/:id/stop-transcription` | Yes | Stop transcription |
| GET | `/api/meetings/:id/transcript` | Optional | Get transcript |
| GET | `/api/meetings/:id/transcript/sections` | Optional | Get transcript sections |
| **Chat** | | | |
| POST | `/api/meetings/:id/chat` | Optional | Send chat message |
| GET | `/api/meetings/:id/chats` | Optional | Get chat messages |
| **Invites** | | | |
| POST | `/api/meetings/:id/invite` | Optional | Create invite |
| GET | `/api/meetings/:id/invites` | Optional | Get invites |
| **AI/Summary** | | | |
| POST | `/api/meetings/:id/generate-summary` | Yes | Generate meeting summary |
| POST | `/api/meetings/:id/process-embeddings` | Yes | Process embeddings |
| GET | `/api/meetings/:id/summary` | Optional | Get meeting summary |
| POST | `/api/ai/pre-consultation-summary` | Optional | Pre-consultation summary |
| POST | `/api/ai/patient-instruction-sheet` | Optional | Patient instruction sheet |
| POST | `/api/ai/document-analysis` | Optional | Analyze document |
| POST | `/api/ai/cds-check` | Optional | Clinical decision support check |
| GET | `/api/ai/validations` | Optional | Get AI validations |
| POST | `/api/ai/validate` | Optional | Validate AI output |

---

## Summary

| Server | Port | Route Count |
| -------- | ------ | ------------- |
| Patient Portal | 3005 | ~170 |
| Doctor Portal — Auth Server | 3011 | 29 |
| Doctor Portal — Main API Server | 3009 | ~130 |
| Doctor Portal — GCS API Server | 3012 | 52 |
| Meeting Server (Jitsi) | 3020 | 26 |
| **Total** | | **~407** |

### Base Path Conventions

- **All servers** use `/api/...` as the primary prefix
- **Patient Portal** additionally has `/health` (root-level health check)
- **Doctor Portal Auth** has some routes under `/auth/...` and `/admin/...` (without `/api` prefix)
- **Doctor Portal Auth** has test routes under `/test/...`
- **Meeting Server** has a root-level `/health` in addition to `/api/...`
