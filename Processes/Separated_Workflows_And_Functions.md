# 📑 Izara Telemedicine — Separated Workflows, Processes, Features & Functions

**Version:** 1.7.54
**Last Updated:** June 25, 2026
**Status:** ✅ Phase 1 Complete

> **Connection diagrams:** [WORKFLOW_CONNECTIONS.md](WORKFLOW_CONNECTIONS.md)

---


## 📋 Table of Contents


- [A. Authentication & User Management](#a-authentication--user-management)


- [B. Appointment Workflow](#b-appointment-workflow)


- [C. Video Meeting Workflow](#c-video-meeting-workflow)


- [D. AI Processing Pipeline](#d-ai-processing-pipeline)


- [E. EMR Documentation Workflow](#e-emr-documentation-workflow)


- [F. Prescriptions Workflow](#f-prescriptions-workflow)


- [G. Lab Orders Workflow](#g-lab-orders-workflow)


- [H. PHR Management Workflow](#h-phr-management-workflow)


- [I. Living Will Workflow](#i-living-will-workflow)


- [J. PDPA Consent Workflow](#j-pdpa-consent-workflow)


- [K. Content Management Workflow](#k-content-management-workflow)


- [L. Clinical Resources Workflow](#l-clinical-resources-workflow)


- [M. Medical Consultants Workflow](#m-medical-consultants-workflow)


- [N. Notification Workflow](#n-notification-workflow)


- [O. Doctor Registration & Approval Workflow](#o-doctor-registration--approval-workflow)


- [P. Queue Management Workflow](#p-queue-management-workflow)


- [Q. AI Health Chat (Patient)](#q-ai-health-chat-patient)


- [R. AI Studio (Doctor)](#r-ai-studio-doctor)


- [S. Timeline & History](#s-timeline--history)


- [T. Map & Facility Finder](#t-map--facility-finder)


- [U. Database Tables Reference](#u-database-tables-reference)

---


## A. Authentication & User Management


### A1. Patient Registration

**Pages:** `RegisterPage.tsx`
**API:** `POST /api/auth/register`
**Tables:** `users`, `patient_profiles`, `phr`

```text
Process:
1. Patient fills Step 1: name, email, password, phone, DOB, gender
2. Patient fills Step 2: blood type, allergies, chronic conditions, medications
3. Frontend validates all fields
4. POST /api/auth/register with all data
5. Server checks email uniqueness
6. Server hashes password (bcrypt)
7. INSERT INTO users (role='patient')
8. INSERT INTO patient_profiles
9. INSERT INTO phr (initial health data)
10. Return JWT token → auto-login
```


## Features


- 2-step wizard with progress indicator


- Thai/English bilingual form


- Client-side validation (email format, password strength)


- Server-side validation (email uniqueness)


- Auto-login after registration

---


### A2. Patient Login

**Pages:** `LoginPage.tsx`
**API:** `POST /api/auth/login`
**Tables:** `users`, `sessions`

```text
Process:
1. Patient enters email + password
2. POST /api/auth/login
3. Server SELECT user by email
4. Check account locked (login_attempts >= 5)
5. Verify password with bcrypt
6. If fail: INCREMENT login_attempts, check lockout
7. If success: RESET login_attempts
8. INSERT INTO sessions (token, ip, user_agent, expires_at)
9. UPDATE users SET last_login = NOW()
10. Return JWT + user profile
```


## Features


- Email/password login


- Account lockout after 5 failures (15-min cooldown)


- Session tracking with IP + user-agent


- 3-hour session timeout


- "Forgot Password" link → email flow

---


### A3. Doctor/Admin Login

**Pages:** `LoginPage.tsx` (Doctor Portal)
**API:** `POST /api/auth/login`
**Tables:** `users`, `sessions`

```text
Process:
1. Same as patient login
2. Additional check: is_approved must be true
3. Additional check: approval_status = 'approved'
4. If not approved: return "Account pending approval" error
5. Role determines available features (doctor vs admin)
```


## Features


- Same login flow as patient


- Approval gate (admin must approve first)


- Role-based redirect (doctor dashboard vs admin dashboard)

---


### A4. Password Reset

**Pages:** `ResetPasswordPage.tsx`
**API:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
**Tables:** `users`, `password_resets`

```text
Process:
1. User enters email on forgot-password form
2. POST /api/auth/forgot-password
3. Server generates secure token (crypto.randomBytes)
4. INSERT INTO password_resets (token, expires_at = +1 hour)
5. Send email via Gmail API with reset link
6. User clicks link → /reset-password?token=xxx
7. Frontend shows new password form
8. POST /api/auth/reset-password (token + new password)
9. Server validates token (not expired, not used)
10. UPDATE users SET password_hash = new hash
11. UPDATE password_resets SET used = true
```

---


## B. Appointment Workflow


### B1. Patient Booking

**Pages:** `AppointmentPages.tsx` → Book Appointment
**API:** `POST /api/appointments`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Patient navigates to /book-appointment
2. Step 1: Select specialty category
3. Step 2: Optionally select specific doctor
4. Step 3: Describe symptoms (text + structured)
5. AI Triage: Gemini analyzes symptoms
   → Urgency level (1-10)
   → Recommended specialty
   → Suggested doctor match
6. Step 4: Choose date and time slot
7. Submit booking
8. INSERT INTO appointments (status: 'pending')
9. INSERT INTO notifications (admin/doctor)
10. pg_notify → Socket.IO broadcast
```


## Features


- Multi-step booking wizard


- AI-assisted symptom analysis


- Doctor selection (optional — can be pool)


- Urgency triage


- Thai/English symptom input

---


### B2. Admin Appointment Assignment

**Pages:** `AdminAppointmentManagement.tsx`
**API:** `PUT /api/admin/appointments/:id/assign`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Admin views all pending appointments
2. Options:
   a. AI Auto-Assign: Gemini matches specialty → doctor
   b. Manual Assign: Admin picks doctor from dropdown
   c. Reject: Admin rejects with reason
3. UPDATE appointments SET doctor_id, status = 'confirmed'
4. Generate Jitsi room name and meeting links
5. INSERT notifications (patient: confirmed + link)
6. INSERT notifications (doctor: new patient assigned)
```


## Features


- AI specialty-to-doctor matching


- Manual override


- Reject with reason


- Stats dashboard (pending/assigned/total)


- Tab-based filtering

---


### B3. Doctor Appointment Claim (Pool)

**Pages:** `AppointmentPoolManagement.tsx`
**API:** `PUT /api/appointments/:id/claim`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Doctor views pool of unassigned appointments
2. Filter by matching specialty
3. Doctor clicks "Claim" on appointment
4. UPDATE appointments SET doctor_id = claiming doctor
5. Status: pending → doctor_claimed → confirmed
6. Generate meeting links
7. Notify patient of assignment
```

---


### B4. Appointment Status State Machine

```text
pending ──→ in_pool ──→ ai_matched ──→ doctor_claimed ──→ confirmed
   │                                                          │
   └──→ declined                                      in_progress
                                                          │
                                                      completed
                                                          │
                                                      (or cancelled at any stage)
```

---


## C. Video Meeting Workflow


### C1. Doctor Opens Meeting Room

**Pages:** `HealthMeeting.tsx`, `MeetingRoom.tsx` (`/meeting/:id` — VirtualMeeting removed v1.7.53)
**API:** `POST /api/meetings/create`
**Tables:** `meeting_records`

```text
Process:
1. Doctor clicks "Start Meeting" for a confirmed appointment
2. POST to Meeting Server (:3020) → create room
3. INSERT INTO meeting_records (status: 'waiting')
4. Generate URLs:
   - Doctor URL: full host controls
   - Patient URL: lobby entry
   - Guest URL: view-only link
5. Doctor sees Jitsi iframe embedded in modal
6. Doctor is HOST with full controls
```


## Features


- Doctor as HOST (mute/kick/lobby control)


- Lobby mode (patient waits for admission)


- Guest invite links


- Screen sharing


- Chat within meeting

---


### C2. Patient Joins Meeting

**Pages:** Appointment Detail → Join button
**Flow:** Patient click → Jitsi lobby → Doctor admits

```text
Process:
1. Patient clicks "Join Meeting" on appointment detail
2. Redirects to meeting URL with lobby enabled
3. Patient enters lobby (camera/mic check)
4. Doctor sees lobby notification
5. Doctor admits patient
6. Video call begins
7. Browser Speech API starts (if enabled)
```

---


### C3. Real-Time Transcription

**Tables:** `meeting_transcripts`
**Technology:** Web Speech API (browser-native, FREE)

```text
Process:
1. Web Speech API listens to audio
2. onresult callback fires with transcript segment
3. Segment includes: speaker_role, content, language, confidence
4. Client emits Socket.IO 'transcript-segment' event
5. Meeting Server receives and saves to meeting_transcripts
6. Server broadcasts 'transcript-update' to all participants
7. Live transcript panel shows real-time text
8. When is_final = true, segment is committed
```

---


### C4. Meeting Recording

**Tables:** `meeting_records.recording_data` (BYTEA)

```text
Process:
1. Doctor clicks "Start Recording"
2. MediaRecorder API captures audio/video
3. On stop: blob data collected
4. POST recording blob to Meeting Server
5. Server saves as BYTEA in meeting_records table
6. Recording metadata: filename, mimetype, size_bytes
7. Can be replayed from PostgreSQL
```

---


### C5. End Meeting

**Tables:** `meeting_records`, `appointments`

```text
Process:
1. Doctor clicks "End Meeting"
2. UPDATE meeting_records SET status='completed', ended_at=NOW()
3. Calculate duration_minutes
4. Save final transcript
5. UPDATE appointments SET status='completed'
6. Trigger AI processing pipeline (Stage D)
7. Socket: 'meeting-ended' → all participants
```

---


## D. AI Processing Pipeline


### D1. Post-Meeting AI Summary

**API:** Meeting Server internal
**Tables:** `meeting_records`, `ai_validations`

```text
Process:
1. Meeting ends → trigger summary generation
2. Collect full transcript from meeting_transcripts
3. Collect patient PHR context via RAG
4. Send to Gemini 2.5 Flash Lite:
   Prompt: "Generate SOAP EMR from this medical transcript"
   Context: Patient history, allergies, medications
5. Receive structured SOAP response
6. UPDATE meeting_records SET ai_summary = response
7. INSERT ai_validations (status: 'pending_review')
8. Socket.IO: 'meeting-summary-ready' → doctor
```

---


### D2. AI Triage (Appointment Booking)

**API:** `POST /api/ai/triage`
**Tables:** `appointments.ai_triage`

```text
Process:
1. Patient submits symptom description
2. Send to Gemini:
   Prompt: "Analyze urgency and recommend specialty"
   Input: Symptoms, duration, severity
3. Response: { urgency: 1-10, specialty: "...", reasoning: "..." }
4. Save to appointments.ai_triage JSONB
5. Used for auto-assignment matching
```

---


### D3. Pre-Consultation AI Summary

**API:** Internal (Doctor Portal backend)
**Tables:** `phr`, `vital_signs`, `appointments`, `emr`

```text
Process:
1. Doctor opens patient record before meeting
2. Fetch: PHR, vital signs trend, past EMRs, medications
3. Send to Gemini:
   Prompt: "Generate pre-consultation summary"
4. Response: Key points, alerts, medication review
5. Displayed to doctor as briefing card
```

---


### D4. Patient Instruction Generation

**API:** `POST /api/ai/patient-instructions`
**Tables:** `emr.patient_instructions`, `ai_validations`

```text
Process:
1. After EMR is signed
2. Collect: EMR SOAP, prescriptions, lab orders
3. Send to Gemini:
   Prompt: "Generate patient-friendly instruction sheet in Thai"
4. Response includes:
   - Diagnosis summary (lay terms)
   - Medication instructions
   - Lifestyle recommendations
   - Warning signs
   - Follow-up information
5. Doctor reviews → approve/edit/reject
6. If approved → notification sent to patient
```

---


### D5. Clinical Decision Support (CDS)

**Tables:** `cds_logs`, `drugs`, `phr`

```text
Process:
1. Doctor prescribes medication
2. System checks:
   a. Drug-allergy cross-reference (phr.allergies vs drug)
   b. Drug-drug interaction (drugs.interactions)
   c. Renal dose adjustment (drugs.renal_adjustment vs patient GFR)
   d. Pregnancy category check
3. If alert found:
   INSERT INTO cds_logs (severity, recommendation)
4. Doctor sees warning popup
5. Doctor decision: accept / reject / modify
6. Decision logged in cds_logs.doctor_decision
```

---


## E. EMR Documentation Workflow


### E1. AI-Assisted EMR Creation

**Pages:** `EMREditor.tsx` (modal)
**API:** `POST /api/emr`
**Tables:** `emr`, `ai_validations`

```text
Process:
1. Post-meeting: AI generates SOAP draft
2. Doctor opens EMR Editor modal
3. Sees AI-generated sections:
   S (Subjective): Patient complaints, history
   O (Objective): Exam findings, vitals
   A (Assessment): Diagnosis (ICD-10 searchable)
   P (Plan): Treatment plan
4. Doctor can:
   - ✅ Approve each section
   - ✏️ Edit any section
   - ❌ Reject and regenerate
5. All changes tracked in ai_validations
6. Doctor signs EMR digitally
7. Status: draft → signed
```


## Features


- SOAP format editor


- AI pre-filled from transcript


- ICD-10 code search


- Digital signature


- Man-in-the-Loop validation

---


### E2. EMR Signing

```text
Process:
1. Doctor reviews all SOAP sections
2. Clicks "Sign EMR"
3. Confirmation modal appears
4. UPDATE emr SET status='signed', signed_at=NOW(), doctor_signature=name
5. INSERT notifications → patient ("Your medical record is ready")
6. EMR becomes read-only after signing
7. Patient can view summary via timeline
```

---


## F. Prescriptions Workflow


### F1. E-Prescribing

**Pages:** `CompletePrescribing.tsx` (modal)
**API:** `POST /api/prescriptions`
**Tables:** `prescriptions`, `drugs`, `phr`, `cds_logs`

```text
Process:
1. Doctor opens prescribing modal from EMR
2. Patient allergies displayed prominently
3. Current medications shown
4. Doctor searches drug database
5. Select drug → auto-populate dosage forms
6. Set: dose, frequency, duration, route, instructions
7. CDS checks run automatically:
   - Allergy alert (if match found)
   - Drug interaction alert (if conflict)
   - Dose adjustment alert (if renal/hepatic)
8. Doctor reviews warnings, decides to proceed or modify
9. Add multiple medications to prescription
10. Submit → INSERT prescriptions
11. Notification → patient
```


## Features


- Real-time drug search


- Allergy cross-check


- Drug interaction warnings


- Dosage form auto-complete


- Multi-medication prescription


- CDS audit trail

---


## G. Lab Orders Workflow


### G1. Lab & Imaging Orders

**Pages:** `CompleteLabOrders.tsx` (modal)
**API:** `POST /api/lab-orders`
**Tables:** `lab_orders`

```text
Process:
1. Doctor opens lab orders modal
2. Tab 1: Order Tests
   - Search test catalog
   - Select tests (CBC, metabolic, imaging, etc.)
   - Set priority (normal/urgent/stat)
   - Add clinical indication
3. Submit → INSERT lab_orders (status: 'ordered')
4. Tab 2: View Results (when available)
   - Results with normal ranges
   - Flag indicators (H = high, L = low, C = critical)
   - AI analysis interpretation
5. Doctor uploads results manually or via integration
6. UPDATE lab_orders SET results = JSONB
7. Notification → patient ("Lab results ready")
```


## Features


- Test catalog search


- Priority levels


- Normal range display


- Flag indicators (H/L/C)


- AI interpretation

---


## H. PHR Management Workflow


### H1. Vital Signs Recording

**Pages:** `PHRPage.tsx` → Vital Signs tab
**API:** `POST /api/phr/vital-signs`
**Tables:** `vital_signs`, `phr`

```text
Process:
1. Patient navigates to PHR → Vital Signs tab
2. Enter measurements:
   - Blood pressure (systolic/diastolic)
   - Heart rate
   - Temperature
   - Respiratory rate
   - Oxygen saturation
   - Blood glucose
   - Weight / Height
3. Submit → INSERT vital_signs
4. Calculate BMI if weight+height provided
5. UPDATE phr SET vital_signs_history (append)
6. Display trend charts over time
```

---


### H2. Medication Management

**Pages:** `PHRPage.tsx` → Medications tab
**API:** `PUT /api/phr`
**Tables:** `phr.medications`

```text
Process:
1. Patient views current medications list
2. Add new: name, dose, frequency, start_date
3. Edit existing medication
4. Mark as discontinued
5. UPDATE phr SET medications = updated JSONB array
```

---


### H3. Allergy Management

**Pages:** `PHRPage.tsx` → Allergies tab
**API:** `PUT /api/phr`
**Tables:** `phr.allergies`

```text
Process:
1. Patient views allergy list
2. Add: allergen, reaction, severity
3. Edit or remove existing
4. UPDATE phr SET allergies = updated JSONB array
5. Cross-referenced during prescribing (CDS)
```

---


## I. Living Will Workflow


### I1. Living Will Creation (4-Step Wizard)

**Pages:** `LivingWillPage.tsx`
**API:** `POST /api/phr/living-will`
**Tables:** `living_wills`, `living_will_versions`

```text
Process:
Step 1: Healthcare Representatives (ตัวแทน)
  - Add proxy contacts (name, phone, relation)
  - Set priority order

Step 2: Medical Treatment Preferences (ความต้องการ)
  - CPR preferences
  - Mechanical ventilation
  - Tube feeding
  - Pain management level
  - Organ donation preference

Step 3: Digital Signature (ลายเซ็น)
  - Canvas signature pad
  - Date of signing
  - Witness information

Step 4: Share Settings (แชร์)
  - PDPA consent toggle
  - Share with all authorized doctors OR private
  - Review summary

Final: INSERT living_wills + INSERT living_will_versions (v1)
```

---


### I2. Living Will Sharing

```text
Process:
1. Patient sets is_shared_with_doctors = true
2. All doctors with patient_consents access can see it
3. Displayed prominently in Doctor Portal → Patient Record Viewer → PHR tab
4. Every access logged in living_wills.audit_log JSONB
```

---


## J. PDPA Consent Workflow


### J1. Privacy Consent Management

**Pages:** `PDPAPage.tsx`
**API:** `PUT /api/pdpa/consent`
**Tables:** `patient_consents`, `audit_logs`

```text
Process:
Tab 1: Privacy Settings
  - Toggle data sharing categories (vitals, medications, conditions, etc.)
  - Each toggle UPDATE patient_consents

Tab 2: Doctor Access
  - View list of doctors with access
  - Grant specific doctor access
  - Revoke doctor access (UPDATE patient_consents.revoked_at)

Tab 3: Access History
  - View audit trail of who accessed what data
  - SELECT audit_logs WHERE patient_id = current user
  - Shows date, doctor name, action, data accessed
```

---


## K. Content Management Workflow


### K1. Medical Content Creation (Doctor)

**Pages:** `MedicalContent.tsx`
**API:** `POST /api/medical-content`
**Tables:** `medical_content`

```text
Process:
1. Doctor navigates to /medical-content
2. Click "Create New Article"
3. Fill form:
   - Title (Thai required, English optional)
   - Content (Thai required, English optional)
   - Category (from fixed list)
   - Tags
   - Cover image
4. Save as Draft → INSERT medical_content (status: 'draft')
5. Submit for Review → UPDATE status = 'pending'
6. Admin receives notification
```

---


### K2. Content Approval (Admin)

**Pages:** `MedicalContent.tsx` (admin view)
**API:** `PUT /api/medical-content/:id/approve`
**Tables:** `medical_content`, `notifications`

```text
Process:
1. Admin sees pending articles in review queue
2. Read full article content
3. Decision:
   - APPROVE → status = 'published' → visible to patients
   - REJECT → status = 'draft' → notification to author
4. Author notified of decision
```

---


## L. Clinical Resources Workflow


### L1. Resource Creation & RAG Integration

**Pages:** `ClinicalResources.tsx`
**API:** `POST /api/clinical-resources`
**Tables:** `clinical_resources`, `knowledge_base`

```text
Process:
1. Doctor creates clinical resource (guideline/protocol/research)
2. INSERT clinical_resources (status: 'pending')
3. Admin approves → status = 'approved'
4. On approval:
   a. Extract text content
   b. Generate embedding via Gemini
   c. INSERT INTO knowledge_base (embedding = vector)
   d. Now searchable via AI RAG chat
```


## Resource Types


- `guideline` — Clinical practice guidelines


- `protocol` — Treatment protocols


- `research` — Research papers


- `template` — Clinical templates


- `reference` — Reference materials

---


## M. Medical Consultants Workflow


### M1. Consultant Management (Admin)

**Pages:** `MedicalConsultants.tsx`
**API:** `POST/PUT/DELETE /api/consultants`
**Tables:** `consultants`

```text
Process:
1. Admin adds consultant: name, specialty, email, phone, hospital
2. INSERT INTO consultants
3. Admin can edit, toggle availability, delete
4. Doctors can view, rate, and contact consultants
5. Ratings aggregated in consultants.rating
```

---


### M2. Doctor Rating & Contact

```text
Process:
1. Doctor views consultant directory
2. Filter by specialty, availability
3. Click "Rate" → submit rating (1-5) + comment
4. Stored in consultants.reviews JSONB array
5. Click "Contact" → email or phone link
```

---


## N. Notification Workflow


### N1. In-App Notification Delivery

**Component:** `NotificationBell.tsx`
**Tables:** `notifications`

```text
Process:
1. Event triggers notification (see types in section 9 of Combined doc)
2. INSERT INTO notifications (user_id, type, title, message, data)
3. PostgreSQL NOTIFY trigger fires
4. pgNotifyListener → Socket.IO emit('notification:new')
5. Client NotificationBell shows badge count
6. User clicks bell → panel opens
7. Click notification → navigate to relevant page
8. UPDATE notifications SET read_at = NOW()
9. "Mark All Read" → bulk update
```

---


## O. Doctor Registration & Approval Workflow


### O1. Doctor Registration

**Pages:** LoginPage.tsx (Doctor Portal) → Register tab
**API:** `POST /api/auth/register`
**Tables:** `users`

```text
Process:
1. Doctor fills registration form:
   - Name (Thai + English)
   - Email, password
   - Medical license number
   - Specialty
   - Hospital
2. INSERT INTO users (role='doctor', approval_status='pending', is_approved=false)
3. INSERT notifications → all admin users
4. Doctor sees "Pending Approval" screen on login
```

---


### O2. Admin Approval

**Pages:** `AdminDoctorManagement.tsx`
**API:** `PUT /api/admin/doctors/:id/approve`
**Tables:** `users`, `notifications`

```text
Process:
1. Admin views pending registrations tab
2. Review doctor credentials
3. Decision:
   - APPROVE: UPDATE is_approved=true, approval_status='approved'
   - REJECT: UPDATE approval_status='rejected', rejected_at
4. Notification → doctor
5. Approved doctor can now login
```

---


### O3. Role Management

```text
Process:
1. Admin views approved doctor list
2. Click "Change Role" → doctor ↔ admin toggle
3. UPDATE users SET role = new_role, role_updated_at, role_updated_by
4. Doctor gains/loses admin capabilities
```

---


## P. Queue Management Workflow


### P1. Real-Time Patient Queue

**Pages:** `QueueManagement.tsx` (embedded in Health Meeting)
**Tables:** `appointments`

```text
Process:
1. Shows today's confirmed appointments ordered by time
2. Stats: average wait time, seen count, remaining
3. Doctor actions per patient:
   - CALL → status: 'in_progress', open meeting
   - SKIP → move to back of queue
   - COMPLETE → status: 'completed'
   - NO SHOW → mark absent
4. Wait time calculated per patient
5. Estimated remaining time displayed
```

---


## Q. AI Health Chat (Patient)


### Q1. Patient AI Doctor

**Pages:** `AIDoctorPage.tsx`
**API:** `/api/ai/health-chat`
**Tables:** `ai_chat_history`

```text
Process:
1. Patient opens AI Doctor page
2. Types health question
3. POST to backend with message
4. Backend sends to Gemini with:
   - System prompt: "You are a medical AI assistant. Provide preliminary advice."
   - Patient PHR context (allergies, conditions, medications)
   - Disclaimer: "Not a medical diagnosis"
5. Response displayed in chat
6. INSERT ai_chat_history (role='user' + role='assistant')
7. Sidebar shows conversation history
```

---


## R. AI Studio (Doctor)


### R1. Gemini AI Chat for Doctors

**Pages:** `GeminiAIStudio.tsx` (FAB modal)
**API:** `/api/ai/chat`
**Tables:** `ai_chat_history`, `knowledge_base`

```text
Process:
1. Doctor opens via floating action button (any page)
2. Tab 1: Chat
   - Type clinical question
   - RAG search: generate embedding → similarity search knowledge_base
   - Top-K results + query → Gemini
   - Response with source citations
3. Tab 2: Clinical Calculators
   - GFR Calculator
   - BMI Calculator
   - Drug Dose Calculator
   - APACHE Score
   - (more calculators)
4. All conversations saved in ai_chat_history
```

---


## S. Timeline & History


### S1. Treatment Timeline

**Pages:** `TimelinePage.tsx`
**API:** `/api/timeline`
**Tables:** `appointments`, `emr`, `prescriptions`, `lab_orders`, `vital_signs`

```text
Process:
1. Patient opens Timeline page
2. Fetch all medical events for patient:
   - Appointments (with status)
   - EMR records (SOAP summaries)
   - Prescriptions
   - Lab results
   - Vital sign records
3. Sort chronologically (newest first)
4. Filter by type: All / Appointments / Medications / Labs / Procedures / Diagnoses
5. Each event shows:
   - Date, type icon, title, summary
   - Click → expand details
```

---


## T. Map & Facility Finder


### T1. Nearby Healthcare Map

**Pages:** `MapPage.tsx`
**API:** Google Maps JavaScript API + Places API

```text
Process:
1. Patient opens Map page
2. Request geolocation permission
3. Show Google Maps centered on patient location
4. Fetch nearby facilities via Places API:
   - Hospitals (🏥)
   - Clinics (🏪)
   - Pharmacies (💊)
   - Health Centers (🏢)
5. Filter by type and radius (1-20 km)
6. Click facility → show details (name, address, rating, distance)
7. Click "Directions" → open Google Maps navigation
```


## Features


- GPS geolocation


- Radius filter (1, 5, 10, 15, 20 km)


- Category filter


- Facility details popup


- Navigation link

---


## Reference: Document Cross-Links

| Domain | Combined Doc Section | Separated Doc Section | Detailed Page Doc |
| ------ | -------------------- | --------------------- | ----------------- |
| Authentication | §1, §8 (Auth Actions) | A1-A4 | 01_Login_Page.md, 02_Register_Page.md |
| Appointments | §4 (Pipeline) | B1-B4 | 05_Appointments_Page.md, 17_Admin_Appointment_Management.md |
| Meetings | §4 (Stage 3-5) | C1-C5 | 06_Health_Meeting_Page.md, 07_Virtual_Meeting.md |
| AI | §6 (AI Pipeline) | D1-D5 | 15_Gemini_AI_Studio.md, 07_AI_Doctor_Page.md |
| EMR | §4 (Stage 6) | E1-E2 | 08_EMR_Editor.md |
| Prescriptions | §8 (Clinical Actions) | F1 | 09_Prescribing.md |
| Lab Orders | §8 (Clinical Actions) | G1 | 10_Lab_Orders.md |
| PHR | §8 (PHR Actions) | H1-H3 | 06_PHR_Page.md |
| Living Will | §8 (PHR Actions) | I1-I2 | 11_Living_Will_Page.md |
| PDPA | §8 (PHR Actions) | J1 | 10_PDPA_Page.md |
| Content | §10 (Lifecycle) | K1-K2 | 13_Medical_Content_Page.md, 08_Medical_Content_Library.md |
| Clinical Resources | §10 (Lifecycle) | L1 | 14_Clinical_Resources_Page.md |
| Consultants | §8 (Admin Actions) | M1-M2 | 12_Medical_Consultants_Page.md |
| Notifications | §9 (Notification Flow) | N1 | 15_Notification_System.md |
| Doctor Mgmt | §3 (Admin Workflow) | O1-O3 | 18_Admin_Doctor_Management.md |
| Queue | §2 (Doctor Workflow) | P1 | 21_Queue_Management.md |
| AI Chat (Patient) | §1 (Ongoing Care) | Q1 | 07_AI_Doctor_Page.md |
| AI Studio (Doctor) | §2 (Between Consults) | R1 | 15_Gemini_AI_Studio.md |
| Timeline | §1 (Post-Consultation) | S1 | 14_Timeline_Page.md |
| Map | §1 (Ongoing Care) | T1 | 09_Map_Page.md |

---


## U. Database Tables Reference

All PostgreSQL tables (53+) are documented with descriptions, key fields, and workflow cross-links in:

**[DATABASE_TABLES_REFERENCE.md](DATABASE_TABLES_REFERENCE.md)**

| Domain | Primary tables |
| ------ | -------------- |
| Auth | `users`, `sessions`, `password_resets`, `refresh_tokens` |
| Appointments | `appointments`, `doctor_schedules`, `appointment_ai_suggestions` |
| Meetings | `meeting_records`, `meeting_transcripts`, `meeting_chats`, `ai_validations` |
| Clinical | `emr`, `prescriptions`, `lab_orders`, `imaging_orders`, `phr` |
| Post-meeting | `patient_instructions`, `health_timeline`, `follow_ups` |
| Content | `medical_content`, `clinical_resources`, `knowledge_base` |
| Sync | `sync_queue`, `user_api_connections`, NOTIFY triggers on 8 tables |

Full ER diagram and migration order: [PostgreSQL_Database_Architecture.md](PostgreSQL_Database_Architecture.md).

---

Separated workflows document for Izara Telemedicine Platform v1.7.52
