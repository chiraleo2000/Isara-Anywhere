# Izara Telemedicine — Complete API Endpoint Reference

> Auto-generated from source code analysis. For test planning and documentation.

---

## 1. PATIENT PORTAL SERVER (port 3004/3005)

**File:** `Isara-patient-portal/server/index.ts` + `server/routes/*.ts`

### 1.1 Health & System (index.ts)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Server health check |
| GET | `/api/health` | No | API health check |
| GET | `/api/health/gcs` | No | GCS storage health |
| GET | `/api/health/db` | No | Database health check |
| GET | `/api/storage/health` | No | Storage service health |

### 1.2 Auth Routes (routes/auth.ts → `/api/auth`, `/auth`, `/api/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new patient |
| POST | `/api/auth/login` | No | Patient login |
| POST | `/api/auth/validate` | No | Validate token |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | Yes | Get current user profile |
| PUT | `/api/auth/profile` | Yes | Update user profile |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/request-password-reset` | No | Request password reset email |
| GET | `/api/auth/verify-reset-token/:token` | No | Verify reset token |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| GET | `/api/auth/check-user/:email` | No | Check if user exists |
| POST | `/api/auth/avatar` | Yes | Upload avatar |
| POST | `/api/auth/profile/image` | Yes | Upload profile image |
| GET | `/api/auth/` | Yes | List users (admin) |

### 1.3 PHR Routes (routes/phr.ts → `/api/phr`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/phr/` | Yes | Get own PHR |
| GET | `/api/phr/patient/:patientId` | Yes | Get patient PHR by ID |
| GET | `/api/phr/:patientId` | Yes | Get PHR (alias) |
| PUT | `/api/phr/:patientId` | Yes | Update PHR |
| PUT | `/api/phr/profile/:id` | Yes | Update PHR profile |
| GET | `/api/phr/:patientId/vitals` | Yes | Get vitals |
| POST | `/api/phr/:patientId/vitals` | Yes | Record vitals |
| POST | `/api/phr/vitals` | Yes | Record vitals (no patientId) |
| GET | `/api/phr/:patientId/medications` | Yes | Get medications |
| POST | `/api/phr/:patientId/medications` | Yes | Add medication |
| GET | `/api/phr/:patientId/allergies` | Yes | Get allergies |
| POST | `/api/phr/:patientId/allergies` | Yes | Add allergy |
| GET | `/api/phr/:patientId/health-logs` | Yes | Get health logs |
| GET | `/api/phr/:patientId/health-logs/:entryId` | Yes | Get specific health log |
| GET | `/api/phr/:patientId/timeline` | Yes | Get health timeline |
| GET | `/api/phr/:patientId/living-will` | Yes | Get living will |
| POST | `/api/phr/:patientId/living-will` | Yes | Create living will |
| PUT | `/api/phr/:patientId/living-will` | Yes | Update living will |
| PUT | `/api/phr/:patientId/living-will/share` | Yes | Share living will |
| DELETE | `/api/phr/:patientId/living-will` | Yes | Delete living will |
| POST | `/api/phr/profile/:userId/avatar` | Yes | Upload PHR avatar |
| GET | `/api/phr/profile/:userId/avatar` | Yes | Get PHR avatar |

### 1.4 Appointments Routes (routes/appointments.ts → `/api/appointments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments/history` | Yes | Get appointment history |
| GET | `/api/appointments/my` | Yes | Get my appointments |
| GET | `/api/appointments/` | Yes | List all appointments |
| GET | `/api/appointments/patient/:patientId` | Yes | Get patient appointments |
| GET | `/api/appointments/:appointmentId` | Yes | Get single appointment |
| POST | `/api/appointments/` | Yes | Create appointment |
| PUT | `/api/appointments/:appointmentId/status` | Yes | Update appointment status |
| PUT | `/api/appointments/:appointmentId` | Yes | Update appointment |
| DELETE | `/api/appointments/:appointmentId` | Yes | Cancel/delete appointment |
| GET | `/api/appointments/notifications/:userId` | Yes | Get appointment notifications |
| PUT | `/api/appointments/notifications/:userId/:notificationId/read` | Yes | Mark notification read |
| PUT | `/api/appointments/notifications/:userId/read-all` | Yes | Mark all notifications read |
| GET | `/api/appointments/notifications/:userId/count` | Yes | Get notification count |

### 1.5 Appointment Pool Routes (routes/appointment-pool.ts → `/api/appointment-pool`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointment-pool/` | Yes | List pool items |
| POST | `/api/appointment-pool/` | Yes | Create pool item |
| POST | `/api/appointment-pool/:poolId/claim` | Yes | Doctor claims pool item |
| POST | `/api/appointment-pool/:poolId/admin-assign` | Yes | Admin assigns doctor |
| POST | `/api/appointment-pool/:poolId/approve` | Yes | Approve pool assignment |
| POST | `/api/appointment-pool/:poolId/ai-match` | Yes | AI match doctor to pool |
| GET | `/api/appointment-pool/meeting-check/:appointmentId` | Yes | Check meeting attendance |
| POST | `/api/appointment-pool/missed-meeting/:appointmentId` | Yes | Report missed meeting |
| GET | `/api/appointment-pool/meeting-rules` | Yes | Get meeting rules |
| PUT | `/api/appointment-pool/meeting-rules` | Yes | Update meeting rules |

### 1.6 Doctors Routes (routes/doctors.ts → `/api/doctors`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/doctors/` | Yes | List all doctors |
| GET | `/api/doctors/:doctorId` | Yes | Get doctor profile |
| GET | `/api/doctors/:doctorId/schedule` | Yes | Get doctor schedule |
| GET | `/api/doctors/:doctorId/slots` | Yes | Get available time slots |
| GET | `/api/doctors/search/specialty/:specialty` | Yes | Search by specialty |
| GET | `/api/doctors/search/name/:name` | Yes | Search by name |
| GET | `/api/doctors/:doctorId/reviews` | Yes | Get doctor reviews |

### 1.7 PDPA Routes (routes/pdpa.ts → `/api/pdpa`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/pdpa/status` | Yes | Get PDPA consent status |
| POST | `/api/pdpa/consent` | Yes | Submit PDPA consent |
| DELETE | `/api/pdpa/consent` | Yes | Withdraw consent |
| GET | `/api/pdpa/consents/:patientId` | Yes | Get patient consents |
| PUT | `/api/pdpa/consents/:patientId/:consentId` | Yes | Update consent |
| POST | `/api/pdpa/consents/:patientId` | Yes | Create consent for patient |
| PUT | `/api/pdpa/consents/:patientId/:consentId/revoke` | Yes | Revoke consent |
| POST | `/api/pdpa/verify` | Yes | Verify consent |
| GET | `/api/pdpa/audit/:patientId` | Yes | Get PDPA audit trail |
| GET | `/api/pdpa/living-will/:patientId` | Yes | Get living will (PDPA) |
| GET | `/api/pdpa/living-will/:patientId/versions` | Yes | Get living will versions |
| GET | `/api/pdpa/living-will/:patientId/versions/:versionId` | Yes | Get specific version |
| POST | `/api/pdpa/living-will/:patientId/rollback/:versionId` | Yes | Rollback to version |
| POST | `/api/pdpa/living-will/:patientId` | Yes | Create living will |
| POST | `/api/pdpa/living-will/:patientId/signature` | Yes | Sign living will |
| GET | `/api/pdpa/doctor-consents/:patientId` | Yes | Get doctor consents |

### 1.8 AI Routes (routes/ai.ts → `/api/ai`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/chat` | Yes | AI health chat |
| GET | `/api/ai/chat/history` | Yes | Get chat history |
| POST | `/api/ai/chat/clear` | Yes | Clear chat history |
| DELETE | `/api/ai/chat/history` | Yes | Delete chat history |
| GET | `/api/ai/chat/memory` | Yes | Get AI memory |
| POST | `/api/ai/chat/memory` | Yes | Save AI memory |
| POST | `/api/ai/chat/memory/summarize` | Yes | Summarize AI memory |
| DELETE | `/api/ai/chat/memory/:memoryId` | Yes | Delete memory entry |
| POST | `/api/ai/symptom-checker` | Yes | AI symptom checker |
| POST | `/api/ai/risk-assessment` | Yes | AI health risk assessment |
| POST | `/api/ai/health-info` | Yes | Get AI health info |
| GET | `/api/ai/status` | No | AI service status |
| POST | `/api/ai/symptom-analysis` | Yes | Detailed symptom analysis |
| POST | `/api/ai/symptom-suggest` | Yes | Suggest symptoms |
| POST | `/api/ai/validate` | No | Validate AI output |

### 1.9 Metadata Routes (routes/metadata.ts → `/api/metadata`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/metadata/medications` | Yes | List medications |
| GET | `/api/metadata/medications/search` | Yes | Search medications |
| GET | `/api/metadata/drug-interactions` | Yes | Get drug interactions |
| GET | `/api/metadata/lab-tests` | Yes | List lab tests |
| GET | `/api/metadata/reference-ranges` | Yes | Get reference ranges |
| GET | `/api/metadata/icd10-codes` | Yes | List ICD-10 codes |
| GET | `/api/metadata/icd10-codes/search` | Yes | Search ICD-10 codes |
| GET | `/api/metadata/specialties` | Yes | List medical specialties |
| GET | `/api/metadata/health-tips` | Yes | Get health tips |
| GET | `/api/metadata/medical-content` | Yes | Get medical content |

### 1.10 Content Routes (routes/content.ts → `/api/content`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/content/medical` | No | List medical articles |
| GET | `/api/content/medical/:id` | No | Get article by ID |
| POST | `/api/content/medical/:id/view` | No | Record article view |
| GET | `/api/content/clinical-resources` | No | List clinical resources |
| GET | `/api/content/health-tips` | No | Get health tips |
| GET | `/api/content/health-education` | No | Get health education |
| GET | `/api/content/tags/:type` | No | Get tags by type |
| GET | `/api/content/categories` | No | Get content categories |

### 1.11 Video Meeting Routes (routes/video-meeting.ts → `/api/video-meeting`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/video-meeting/config` | No | Get video config |
| GET | `/api/video-meeting/health` | No | Video meeting health |
| POST | `/api/video-meeting/create` | Yes | Create video meeting |
| GET | `/api/video-meeting/:appointmentId` | Yes | Get meeting details |
| POST | `/api/video-meeting/:appointmentId/join` | Yes | Join meeting |
| POST | `/api/video-meeting/:appointmentId/transcript` | Yes | Add transcript entry |
| POST | `/api/video-meeting/:appointmentId/transcribe-audio` | Yes | Transcribe audio |
| POST | `/api/video-meeting/:appointmentId/end` | Yes | End meeting |
| GET | `/api/video-meeting/:appointmentId/transcript` | Yes | Get meeting transcript |
| POST | `/api/video-meeting/:appointmentId/summarize` | Yes | Generate summary |
| POST | `/api/video-meeting/:appointmentId/recommendations` | Yes | Generate recommendations |
| POST | `/api/video-meeting/:appointmentId/invite` | Yes | Send meeting invite |
| POST | `/api/video-meeting/join-with-invite` | No | Join via invite token |
| GET | `/api/video-meeting/:appointmentId/invites` | Yes | List meeting invites |
| DELETE | `/api/video-meeting/:appointmentId/invite/:token` | Yes | Revoke invite |

### 1.12 GCS Storage Routes (routes/gcs.ts → `/api/gcs`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gcs/status` | No | GCS status |
| GET | `/api/gcs/signed-url/download` | No | Get download signed URL |
| GET | `/api/gcs/signed-url/upload` | No | Get upload signed URL |
| GET | `/api/gcs/read` | No | Read file from GCS |
| POST | `/api/gcs/write` | No | Write file to GCS |
| DELETE | `/api/gcs/delete` | No | Delete file from GCS |
| GET | `/api/gcs/list` | No | List files in GCS |
| GET | `/api/gcs/exists` | No | Check file existence |

### 1.13 Google Services Routes (routes/google-services.ts → `/api/google`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/google/health` | No | Google services health |
| GET | `/api/google/status` | No | Google services status |
| GET | `/api/google/maps/config` | Yes | Get Maps API config |
| POST | `/api/google/calendar/event` | Yes | Create calendar event |
| GET | `/api/google/calendar/availability` | Yes | Check availability |
| POST | `/api/google/meet/create` | Yes | Create Google Meet |
| GET | `/api/google/meet/:appointmentId` | Yes | Get Google Meet link |
| GET | `/api/google/places/nearby` | No | Search nearby places |
| GET | `/api/google/maps/nearby` | No | Search nearby (maps) |
| GET | `/api/google/maps/place/:placeId` | No | Get place details |
| GET | `/api/google/maps/photo` | No | Get place photo |
| GET | `/api/google/maps/geocode` | No | Geocode address |
| GET | `/api/google/maps/directions` | No | Get directions |

### 1.14 Notifications Routes (routes/notifications.ts → `/api/notifications`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications/` | No | List notifications |
| GET | `/api/notifications/count` | No | Get unread count |
| PUT | `/api/notifications/:id/read` | No | Mark as read |
| PUT | `/api/notifications/read-all` | No | Mark all as read |
| DELETE | `/api/notifications/:id` | No | Delete notification |
| POST | `/api/notifications/test` | No | Create test notification |
| GET | `/api/notifications/settings` | No | Get notification settings |
| PUT | `/api/notifications/settings` | No | Update notification settings |

### 1.15 Direct Endpoints in index.ts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/consultants` | No | List consultants |
| GET | `/api/consultants/specialties` | No | List specialties |
| GET | `/api/health-records/instructions/:appointmentId` | No | Get treatment instructions |
| GET | `/api/dashboard/stats` | Yes | Dashboard statistics |
| GET | `/api/health-records/treatment-results` | No | Get treatment results |
| GET | `/api/health-records` | Yes | Get health records |
| POST | `/api/storage/upload` | Yes | Upload file |
| PUT | `/api/profile` | Yes | Update profile |
| GET | `/api/profile` | Yes | Get profile |
| GET | `/api/users/profile` | Yes | Get user profile (alias) |
| GET | `/api/medical-content` | No | Get medical content |
| GET | `/api/timeline` | Yes | Get timeline |
| POST | `/api/profile/image` | Yes | Upload profile image |
| POST | `/api/profile/avatar` | Yes | Upload avatar |
| GET | `/api/emr/patient/:patientId` | Yes | Get patient EMR |
| GET | `/api/emr/my` | Yes | Get own EMR |

---

## 2. DOCTOR PORTAL — AUTH SERVER (port 3011)

**File:** `Isara-doctor-portal/server/authServer.cjs`

### 2.1 Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |

### 2.2 Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register doctor |
| POST | `/auth/login` | No | Doctor login (rate-limited) |
| POST | `/auth/logout` | No | Logout |
| POST | `/auth/request-password-reset` | No | Request password reset (rate-limited) |
| GET | `/auth/verify-reset-token/:token` | No | Verify reset token |
| POST | `/auth/reset-password` | No | Reset password |
| POST | `/auth/send-email` | No | Send email |
| GET | `/auth/verify` | Yes | Verify session/token |
| GET | `/auth/me` | Yes | Get current user |
| PUT | `/auth/profile` | Yes | Update profile |

### 2.3 Admin — Doctor Approval
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/pending-doctors` | Yes | List pending doctors |
| GET | `/auth/admin/pending-doctors` | Yes | List pending (alias) |
| POST | `/auth/admin/approve-doctor` | Yes | Approve doctor registration |
| POST | `/auth/admin/reject-doctor` | Yes | Reject doctor registration |
| POST | `/auth/admin/update-role` | Yes | Update user role |
| POST | `/admin/update-doctor-status` | Yes | Update doctor status |
| POST | `/admin/remove-admin` | Yes | Remove admin privileges |
| GET | `/auth/pending-approvals` | Yes | List pending approvals |
| POST | `/auth/approve-doctor` | Yes | Approve doctor (alias) |
| POST | `/auth/reject-doctor` | Yes | Reject doctor (alias) |
| POST | `/admin/approve-doctor` | Yes | Approve (alias) |
| POST | `/admin/reject-doctor` | Yes | Reject (alias) |

### 2.4 Profile & Storage
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile` | Yes | Get profile |
| PUT | `/api/auth/profile` | Yes | Update profile (alias) |
| POST | `/api/profile/avatar` | Yes | Upload avatar |
| POST | `/api/users/avatar` | Yes | Upload avatar (alias) |
| ALL | `/api/storage/*` | Yes | Proxy to GCS API server |

### 2.5 Test-Only (dev environment)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/test/reset-rate-limits` | No | Reset rate limiters |
| GET | `/test/check-user/:email` | No | Check user by email |

---

## 3. DOCTOR PORTAL — MAIN API SERVER (port 3009)

**File:** `Isara-doctor-portal/server/mainApiServer.cjs` (6880 lines, 152 endpoints)

### 3.1 Health & System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | API health |
| GET | `/health` | No | Server health |
| GET | `/health/db` | No | Database health |
| GET | `/api/health/db` | No | Database health (alias) |
| GET | `/api/storage/health` | No | Storage health |

### 3.2 Dashboard & Admin Stats
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/:doctorId` | Yes | Doctor dashboard data |
| GET | `/api/admin/stats` | Yes | Admin statistics |
| GET | `/api/admin/dashboard-stats` | Yes | Admin dashboard stats |
| GET | `/api/admin/analytics` | Yes | Admin analytics |

### 3.3 Doctor Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/doctors` | No | List all doctors |
| GET | `/api/doctors/:doctorId` | No | Get doctor by ID |
| GET | `/api/doctors/:doctorId/profile` | No | Get doctor profile |
| GET | `/api/doctors/profile` | Yes | Get own profile |
| PUT | `/api/doctors/profile` | Yes | Update own profile |

### 3.4 Auth & Profile (Main API aliases)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/api/auth/profile` | Yes | Update profile |
| PUT | `/auth/profile` | Yes | Update profile (alias) |
| GET | `/auth/me` | Yes | Get current user |
| GET | `/api/auth/me` | Yes | Get current user (alias) |
| GET | `/api/users/me` | Yes | Get current user (alias) |
| POST | `/api/auth/change-password` | Yes | Change password |
| PUT | `/api/profile` | Yes | Update profile |
| POST | `/api/profile/avatar` | Yes | Upload avatar |
| POST | `/api/users/avatar` | Yes | Upload avatar (alias) |
| GET | `/api/users` | Yes | List users |
| POST | `/api/storage/upload` | Yes | Upload file to storage |

### 3.5 Patient Records
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/patients` | Yes | List patients |
| GET | `/api/patients/:patientId` | Yes | Get patient details |
| GET | `/api/patients/:patientId/emr` | Yes | Get patient EMR records |
| POST | `/api/patients/:patientId/health-logs` | Yes | Create health log |
| GET | `/api/patients/:patientId/health-logs` | Yes | Get health logs |
| GET | `/api/patients/:patientId/living-will` | Yes | Get living will |

### 3.6 EMR (Electronic Medical Records)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/emr` | Yes | Create EMR record |
| GET | `/api/emr/patient/:patientId` | Yes | Get EMRs for patient |
| GET | `/api/emr` | Yes | List EMR records |
| POST | `/api/emr/:emrId/sign` | Yes | Sign EMR |
| POST | `/api/emr/sign` | Yes | Sign EMR (alias) |
| POST | `/api/emr/validate` | Yes | Validate EMR data |

### 3.7 PHR (doctor-side access)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/phr/patient/:patientId` | Yes | Get patient PHR |
| GET | `/api/phr/patient/:patientId/vitals/history` | Yes | Get vitals history |

### 3.8 Prescriptions & Lab Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/prescriptions` | Yes | Create prescription |
| GET | `/api/prescriptions/patient/:patientId` | Yes | Get patient prescriptions |
| GET | `/api/prescriptions/pending/count/:doctorId` | Yes | Pending prescriptions count |
| GET | `/api/prescriptions/pending/:doctorId` | Yes | Get pending prescriptions |
| POST | `/api/lab-orders` | Yes | Create lab order |
| GET | `/api/lab-orders/patient/:patientId` | Yes | Get patient lab orders |

### 3.9 Appointments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointments` | Yes | List appointments |
| GET | `/api/appointments/:appointmentId` | Yes | Get appointment |
| POST | `/api/appointments` | Yes | Create appointment |
| GET | `/api/appointments/patient/:patientId` | Yes | Patient appointments |
| GET | `/api/appointments/doctor/:doctorId` | Yes | Doctor appointments |
| GET | `/api/appointments/pending/:doctorId` | Yes | Pending appointments |
| POST | `/api/appointments/:appointmentId/confirm` | Yes | Confirm appointment |
| POST | `/api/appointments/:appointmentId/decline` | Yes | Decline appointment |
| POST | `/api/appointments/:appointmentId/reject` | Yes | Reject appointment |
| PUT | `/api/appointments/:appointmentId/status` | Yes | Update status |

### 3.10 Appointment Pool
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/appointment-pool` | Yes | List pool items |
| POST | `/api/appointment-pool/:poolId/claim` | Yes | Claim pool item |
| POST | `/api/appointment-pool/:poolId/admin-assign` | Yes | Admin assign doctor |

### 3.11 Queue Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/queue/doctor/:doctorId` | Yes | Get doctor's queue |
| POST | `/api/queue/call-next` | Yes | Call next patient |
| POST | `/api/queue/skip` | Yes | Skip patient in queue |

### 3.12 Video Meeting — Jitsi + Gemini AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/video-meeting/health` | No | Video meeting health |
| POST | `/api/video-meeting/create` | Yes | Create meeting |
| GET | `/api/video-meeting/:appointmentId` | Yes | Get meeting |
| POST | `/api/video-meeting/:appointmentId/join` | Yes | Join meeting |
| POST | `/api/video-meeting/:appointmentId/transcript` | Yes | Add transcript |
| POST | `/api/video-meeting/:appointmentId/transcribe-audio` | Yes | Transcribe audio |
| POST | `/api/video-meeting/:appointmentId/end` | Yes | End meeting (generates AI summary) |
| POST | `/api/video-meeting/:appointmentId/upload-recording` | Yes | Upload recording |
| GET | `/api/video-meeting/:appointmentId/files` | Yes | Get meeting files |
| POST | `/api/video-meeting/:appointmentId/recommendations` | Yes | Generate recommendations |
| GET | `/api/video-meeting/:appointmentId/transcript` | Yes | Get transcript |
| GET | `/api/video-meeting/history/:doctorId` | Yes | Meeting history |

### 3.13 Meeting Transcript (alternative endpoint set)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/meeting/transcript` | Yes | Save transcript entry |
| GET | `/api/meeting/transcript/:appointmentId` | Yes | Get transcripts |
| POST | `/api/meeting/transcript/summary` | Yes | Generate transcript summary |
| POST | `/api/meetings/create` | Yes | Create meeting (alias) |

### 3.14 Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications |
| GET | `/api/notifications/count` | Yes | Get unread count |
| POST | `/api/notifications` | Yes | Create notification |
| PUT | `/api/notifications/:id/read` | Yes | Mark as read |
| PUT | `/api/notifications/mark-all-read` | Yes | Mark all as read |
| POST | `/api/notifications/emr-signed` | Yes | EMR signed notification |

### 3.15 AI — Gemini 2.5 Flash Lite
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/ai/health` | No | AI service health |
| POST | `/api/ai/summarize` | Yes | Summarize text |
| POST | `/api/ai/emr-summary` | Yes | Generate EMR summary |
| POST | `/api/ai/analyze-lab` | Yes | Analyze lab results |
| POST | `/api/ai/chat` | Yes | AI clinical chat |
| GET | `/api/ai/pre-summary/:patientId` | Yes | Pre-consultation summary |
| POST | `/api/ai/pre-consultation-summary` | Yes | Pre-consultation (POST) |
| POST | `/api/ai/validate` | Yes | Validate AI output |
| POST | `/api/ai/validation` | Yes | Log validation decision |
| POST | `/api/ai/cds` | Yes | Clinical Decision Support |
| POST | `/api/ai/cds/drug-interactions` | Yes | Check drug interactions |
| POST | `/api/ai/patient-instructions` | Yes | Generate patient instructions |
| POST | `/api/ai/analyze-document` | Yes | Analyze medical document |
| POST | `/api/ai/document-analysis` | Yes | Document analysis (alias) |
| GET | `/api/ai/knowledge` | Yes | Query knowledge base |
| POST | `/api/ai/knowledge/search` | Yes | Search knowledge base |
| GET | `/api/ai/validations` | Yes | List AI validations |
| POST | `/api/ai/validations/:id/approve` | Yes | Approve AI validation |
| POST | `/api/ai/generate-summary` | Yes | Generate summary |
| POST | `/api/patient-instructions` | Yes | Patient instructions (alias) |

### 3.16 Medical Content
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/medical-content` | No | List articles |
| POST | `/api/medical-content` | Yes | Create article |
| GET | `/api/medical-content/pending` | Yes | List pending articles |
| PUT | `/api/medical-content/:contentId/approve` | Yes | Approve article |
| PUT | `/api/medical-content/:contentId/reject` | Yes | Reject article |
| GET | `/api/content/medical` | No | List articles (v2 format) |
| GET | `/api/content/medical/pending` | Yes | Pending articles (v2) |
| GET | `/api/content/medical/:id` | No | Get article (v2) |
| POST | `/api/content/medical` | Yes | Create article (v2) |
| PUT | `/api/content/medical/:id` | Yes | Update article (v2) |
| DELETE | `/api/content/medical/:id` | Yes | Archive article (v2) |
| POST | `/api/content/medical/:id/review` | Yes | Review article (v2) |
| GET | `/api/content/tags/medical` | No | Get medical tags |

### 3.17 Clinical Resources
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/clinical-resources` | Yes | List resources (legacy) |
| POST | `/api/clinical-resources` | Yes | Create resource (legacy) |
| PUT | `/api/clinical-resources/:resourceId/approve` | Yes | Approve (legacy) |
| GET | `/api/content/clinical` | No | List resources (v2) |
| GET | `/api/content/clinical/pending` | Yes | Pending resources (v2) |
| GET | `/api/content/clinical/:id` | No | Get resource (v2) |
| POST | `/api/content/clinical` | Yes | Create resource (v2) |
| PUT | `/api/content/clinical/:id` | Yes | Update resource (v2) |
| DELETE | `/api/content/clinical/:id` | Yes | Archive resource (v2) |
| POST | `/api/content/clinical/:id/review` | Yes | Review resource (v2) |
| GET | `/api/content/tags/clinical` | No | Get clinical tags |

### 3.18 Consultants (External Specialists)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/consultants` | No | List consultants |
| GET | `/api/consultants/specialties` | No | List specialties |
| GET | `/api/consultants/specialties/list` | No | List specialties (alias) |
| POST | `/api/consultants` | Yes | Create consultant |

### 3.19 Admin — User Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/pending-doctors` | Yes | Pending doctor registrations |
| PUT | `/api/admin/doctors/:doctorId/approve` | Yes | Approve doctor |
| PUT | `/api/admin/doctors/:doctorId/reject` | Yes | Reject doctor |
| POST | `/api/admin/approve-doctor` | Yes | Approve (POST alias) |
| POST | `/api/admin/reject-doctor` | Yes | Reject (POST alias) |
| POST | `/api/admin/update-role` | Yes | Update user role |
| POST | `/api/admin/remove-admin` | Yes | Remove admin |
| PUT | `/api/admin/users/:userId/role` | Yes | Update role (RESTful) |
| GET | `/api/admin/users` | Yes | List all users |
| GET | `/api/admin/users/:userId/privileges` | Yes | Get user privileges |
| PUT | `/api/admin/users/:userId/privileges` | Yes | Update privileges |

### 3.20 Metadata
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/metadata/medications` | No | Medication list |
| GET | `/api/metadata/lab-tests` | No | Lab test list |
| GET | `/api/metadata/icd10-codes` | No | ICD-10 codes |
| GET | `/api/metadata/drug-interactions` | No | Drug interactions |

---

## 4. DOCTOR PORTAL — GCS API SERVER (port 3012)

**File:** `Isara-doctor-portal/server/gcsApiServer.cjs`

### 4.1 Health & Storage
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/storage/health` | No | Storage health |
| GET | `/api/storage/read` | No | Read from GCS |
| POST | `/api/storage/write` | No | Write to GCS |
| POST | `/api/storage/upload` | No | Upload file |
| POST | `/api/storage/upload-base64` | No | Upload base64 file |
| DELETE | `/api/storage/delete` | No | Delete from GCS |
| GET | `/api/storage/list` | No | List files |
| POST | `/api/storage/batch-read` | No | Batch read |
| POST | `/api/storage/batch-write` | No | Batch write |

### 4.2 Medical Content (GCS-backed)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/content/medical` | No | List medical content |
| GET | `/api/content/medical/:id` | No | Get article by ID |
| POST | `/api/content/medical` | No | Create article |
| PUT | `/api/content/medical/:id` | No | Update article |
| DELETE | `/api/content/medical/:id` | No | Delete article |
| GET | `/api/content/medical/pending` | No | List pending |
| POST | `/api/content/medical/:id/review` | No | Review article |

### 4.3 Clinical Resources (GCS-backed)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/content/clinical` | No | List clinical resources |
| GET | `/api/content/clinical/pending` | No | Pending resources |
| GET | `/api/content/clinical/:id` | No | Get resource |
| POST | `/api/content/clinical` | No | Create resource |
| PUT | `/api/content/clinical/:id` | No | Update resource |
| DELETE | `/api/content/clinical/:id` | No | Delete resource |
| POST | `/api/content/clinical/:id/review` | No | Review resource |

### 4.4 Consultants (GCS-backed)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/consultants` | No | List consultants |
| GET | `/api/consultants/:id` | No | Get consultant |
| POST | `/api/consultants` | No | Create consultant |
| PUT | `/api/consultants/:id` | No | Update consultant |
| DELETE | `/api/consultants/:id` | No | Delete consultant |
| POST | `/api/consultants/:id/availability` | No | Update availability |
| POST | `/api/consultants/:id/review` | No | Review consultant |
| GET | `/api/consultants/specialties/list` | No | List specialties |

### 4.5 Content Metadata
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/content/tags/:type` | No | Get tags by type |
| POST | `/api/content/tags/:type` | No | Create tag |
| POST | `/api/content/:type/:id/comments` | No | Add comment |

### 4.6 Patient Data (GCS-backed fallback)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/patients/:patientId/health-logs` | No | Create health log |
| GET | `/api/patients/:patientId/health-logs` | No | Get health logs |
| GET | `/api/patients/:patientId` | No | Get patient |
| GET | `/api/patients` | No | List patients |

### 4.7 EMR (GCS-backed fallback)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/emr` | No | Create EMR |
| GET | `/api/emr/:emrId` | No | Get EMR |
| PUT | `/api/emr/:emrId` | No | Update EMR |
| GET | `/api/emr/patient/:patientId` | No | Get patient EMRs |

### 4.8 Appointments (GCS-backed)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/api/appointments/:appointmentId/status` | No | Update appointment status |
| GET | `/api/appointments/completed` | No | Get completed appointments |
| GET | `/api/appointments` | No | List appointments |
| GET | `/api/appointments/:appointmentId` | No | Get appointment |

### 4.9 Notifications (GCS-backed)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/notifications/emr-signed` | No | EMR signed notification |
| GET | `/api/notifications/doctor/:doctorId` | No | Get doctor notifications |
| PUT | `/api/notifications/:notificationId/read` | No | Mark notification read |
| PUT | `/api/notifications/doctor/:doctorId/read-all` | No | Mark all read |
| POST | `/api/notifications/doctor` | No | Create doctor notification |

---

## 5. MEETING SERVER — Izara Jitsi Server (port 3020)

**File:** `Izara-jitsi-server/server/index.js`

### 5.1 Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Server health |
| GET | `/api/health` | No | API health |

### 5.2 Meeting CRUD
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/meetings/create` | Yes | Create meeting |
| POST | `/api/meeting/create` | Optional | Create meeting (alias) |
| GET | `/api/meetings/:id` | Optional | Get meeting details |
| GET | `/api/meetings/:id/status` | No | Get meeting status |
| GET | `/api/meetings/:id/participants` | No | Get participants |

### 5.3 Transcription
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/meetings/:id/start-transcription` | Yes | Start transcription |
| POST | `/api/meetings/:id/pause-transcription` | Yes | Pause transcription |
| POST | `/api/meetings/:id/transcript` | Yes | Add transcript entry |
| POST | `/api/meetings/:id/stop-transcription` | Yes | Stop transcription |
| GET | `/api/meetings/:id/transcript` | Optional | Get full transcript |
| GET | `/api/meetings/:id/transcript/sections` | Optional | Get transcript sections |

### 5.4 Chat & Invites
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/meetings/:id/chat` | Optional | Send chat message |
| GET | `/api/meetings/:id/chats` | Optional | Get chat history |
| POST | `/api/meetings/:id/invite` | Optional | Send meeting invite |
| GET | `/api/meetings/:id/invites` | Optional | List invites |

### 5.5 AI Features
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/meetings/:id/generate-summary` | Yes | Generate meeting summary |
| POST | `/api/meetings/:id/process-embeddings` | Yes | Process transcript embeddings |
| GET | `/api/meetings/:id/summary` | Optional | Get meeting summary |
| POST | `/api/ai/pre-consultation-summary` | Optional | Pre-consultation summary |
| POST | `/api/ai/patient-instruction-sheet` | Optional | Patient instruction sheet |
| POST | `/api/ai/document-analysis` | Optional | Document analysis |
| POST | `/api/ai/cds-check` | Optional | Clinical Decision Support |
| GET | `/api/ai/validations` | Optional | List AI validations |
| POST | `/api/ai/validate` | Optional | Validate AI output |

### 5.6 Socket.IO Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `join-meeting` | Client→Server | Join a meeting room |
| `leave-meeting` | Client→Server | Leave meeting room |
| `transcript-segment` | Client→Server | Send transcript segment |
| `chat-message` | Client→Server | Send chat message |
| `meeting-status` | Server→Client | Meeting status updates |

---

## Summary Statistics

| Server | Port | Endpoint Count |
|--------|------|---------------|
| Patient Portal | 3004/3005 | ~159 routes (13 route files + index.ts) |
| Doctor Auth Server | 3011 | ~25 endpoints |
| Doctor Main API | 3009 | ~152 endpoints |
| Doctor GCS API | 3012 | ~40 endpoints |
| Meeting Server | 3020 | ~26 endpoints + 5 Socket.IO events |
| **Total** | | **~402 API endpoints** |

> **Note:** Many endpoints exist as aliases (same logic, different paths) for backward compatibility. The Auth column shows "Yes" = JWT required, "Optional" = works with or without auth, "No" = public.
