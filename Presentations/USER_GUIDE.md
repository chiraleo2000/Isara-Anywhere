# 📖 IZARA Telemedicine — คู่มือการใช้งาน (User Guide)

**Version 1.5.10** | **Updated: March 29, 2026**

> คู่มือฉบับสมบูรณ์สำหรับผู้ป่วย แพทย์ และผู้ดูแลระบบ
> Complete User Guide for Patients, Doctors, and Administrators
> ทดสอบอัตโนมัติ 2,013 รายการ + UI ทดสอบบนคลาวด์ 101 รายการ ผ่าน 100%

---

## 📑 Table of Contents

1. [Getting Started — เริ่มต้นการใช้งาน](#1-getting-started)
2. [Patient Portal — ระบบผู้ป่วย](#2-patient-portal--ระบบผู้ป่วย)
3. [Doctor Portal — ระบบแพทย์](#3-doctor-portal--ระบบแพทย์)
4. [Admin Features — ระบบผู้ดูแล](#4-admin-features--ระบบผู้ดูแล)
5. [Telemedicine Consultation Workflow — กระบวนการให้คำปรึกษาทางไกล](#5-telemedicine-consultation-workflow)
6. [Doctor Onboarding Workflow — กระบวนการลงทะเบียนแพทย์ใหม่](#6-doctor-onboarding-workflow)
7. [Video Meeting System & Jitsi — ระบบวิดีโอประชุม](#7-video-meeting-system--jitsi)
8. [AI Features & Gemini — ฟีเจอร์ AI](#8-ai-features--gemini)
9. [Meeting Recording & Transcription — ระบบบันทึกและถอดเสียง](#9-meeting-recording--transcription)
10. [Notifications — ระบบแจ้งเตือน](#10-notifications)
11. [Content & Resource Management — การจัดการเนื้อหา](#11-content--resource-management)
12. [Security & PDPA — ความปลอดภัยและ PDPA](#12-security--pdpa)
13. [Troubleshooting & FAQ — คำถามที่พบบ่อย](#13-troubleshooting--faq)

---

## 1. Getting Started

### 1.1 System Overview — ภาพรวมระบบ

IZARA Telemedicine consists of 3 main systems:

| System | URL | For |
|--------|-----|-----|
| **Patient Portal** | `patient-portal.run.app` | Patients — book appointments, view PHR, consult AI |
| **Doctor Portal** | `doctor-portal.run.app` | Doctors + Admins — manage appointments, EMR, prescriptions |
| **Meeting Server** | `meeting-server.run.app` | Jitsi video meeting + Socket.IO server |

**Technology Stack:** React + TypeScript, Node.js, PostgreSQL, Jitsi Meet, Gemini AI 2.5 Flash, Google Cloud Run

---

### 1.2 Patient Registration — การลงทะเบียนผู้ป่วย

New patients can self-register through the Patient Portal.

**Steps:**
1. Open the Patient Portal URL
2. Click **"ลงทะเบียน" (Register)**
3. Fill in: Full Name, Email, Password, Phone, Basic Health Profile
4. Click **"ลงทะเบียน" (Submit)** → redirected to Dashboard immediately

![Patient Registration Page](../screenshots/cloud/patient-portal/patient-02-register.png)
![Registration Success](../screenshots/cloud-workflows/user-management/WC01-patient-register.png)

> 📌 **Tip:** After registration, fill in your health profile (allergies, medications, chronic conditions) in the PHR section for better AI-assisted consultations.

---

### 1.3 Patient Login — เข้าสู่ระบบผู้ป่วย

1. Open the Patient Portal
2. Enter **Email** and **Password**
3. Click **"เข้าสู่ระบบ" (Login)** → redirected to Dashboard

![Patient Login Page](../screenshots/workflow/auth-login/WF01-patient-login-page.png)
![Patient Login Filled](../screenshots/workflow/auth-login/WF02-patient-login-filled.png)

> 🔑 Sessions expire in 30 minutes. Re-login required after expiration.

---

### 1.4 Doctor Login — เข้าสู่ระบบแพทย์

Doctors and Admins log in through the Doctor Portal.

1. Open the Doctor Portal URL
2. Enter **Email** and **Password**
3. Click **"Sign In to Portal"**

![Doctor Login Page](../screenshots/workflow/auth-login/WF08-doctor-login-page.png)

> ⚠️ New doctors must be **approved by an admin** before they can log in. See [Section 6](#6-doctor-onboarding-workflow).

---

### 1.5 Password Reset — รีเซ็ตรหัสผ่าน

1. Click **"ลืมรหัสผ่าน?" (Forgot Password?)** on the login page
2. Enter your registered email
3. System sends a password reset link → click it → set new password

> 📧 Reset link expires in 15 minutes.

---

### 1.6 Role-Based Access Control (RBAC) — การควบคุมสิทธิ์ตามบทบาท

| Role | Access |
|------|--------|
| **Patient** | Full Patient Portal — appointments, PHR, AI Doctor |
| **Doctor** | Doctor Portal — appointments, EMR, prescriptions, meetings |
| **Admin** | Doctor Portal + Admin menu — doctor management, content approval |

> 🔒 Patients cannot access the Doctor Portal (API returns 401). JWT + role verification on every request.

---

## 2. Patient Portal — ระบบผู้ป่วย

### 2.1 Dashboard — หน้าหลัก

The main page shows a comprehensive health overview:

- **Quick Actions:** Book appointment, AI consultation, health records, health library
- **Health Studio:** Vital signs overview (blood pressure, heart rate, BMI, treatments)
- **AI Health Insight:** Personalized recommendations based on your PHR
- **Upcoming Appointments:** Latest appointments with view-all button
- **Healthcare Map:** Nearby facilities shown at the bottom
- **Notification Bell:** Top-right corner

![Patient Dashboard](../screenshots/workflow/auth-login/WF03-patient-dashboard.png)
![Dashboard on Cloud](../screenshots/cloud/patient-portal/patient-03-dashboard.png)
![Dashboard Workflow](../screenshots/cloud-workflows/user-management/WC02-patient-dashboard.png)

---

### 2.2 Appointments — การนัดหมายแพทย์

#### 2.2.1 View Appointments

Click **"นัดหมาย" (Appointments)** in the sidebar.

**Status Filters:**
- **Pending** — Request sent, awaiting doctor review
- **All** — All statuses
- **Confirmed** — Doctor confirmed, meeting link ready
- **Completed** — Consultation done, view summary/EMR

**Sort:** By date (newest or oldest first)

![Appointments Page](../screenshots/workflow/appointment-lifecycle/WF04-patient-appointments-empty.png)
![Confirmed Appointments](../screenshots/cloud-workflows/appointment-lifecycle/WC07-patient-appointments.png)

#### 2.2.2 Book New Appointment

Click **"+ ขอนัดหมายใหม่" (Book New Appointment)** for a 3-step booking process:

**Step 1 — Symptoms (Voice/Image):**
- Select main symptoms: headache, fever, cough, sore throat, nausea, etc.
- Describe symptoms in detail (text / voice recording / image attachment)
- AI auto-analyzes urgency level

![Booking Step 1 — Symptoms](../screenshots/workflow/appointment-lifecycle/WF05-book-appointment-step1.png)
![Booking on Cloud](../screenshots/cloud/patient-portal/patient-05-book-appointment.png)

**Step 2 — Time + Doctor:**
- Select doctor or let AI auto-match by specialty
- Choose date/time (calendar) + type (online / in-person)
- Invite relatives/external participants via email (optional)

**Step 3 — Confirm:**
- Review all details → click **"ยืนยัน" (Confirm)**
- Status becomes **"Pending"** → doctor receives notification immediately

![Appointment Created](../screenshots/workflow/appointment-lifecycle/WF06-appointment-created.png)
![Created on Cloud](../screenshots/cloud-workflows/appointment-lifecycle/WC08-appointment-created.png)

#### 2.2.3 Appointment Details

Click an appointment card to view:
- Current status (color + icon)
- Doctor photo, name
- Date, time, location
- Reported symptoms (tags)
- **"เข้าร่วมการประชุม" (Join Meeting)** button (when confirmed)

![Detail — Pending](../screenshots/workflow/appointment-lifecycle/WF07-appointment-detail-pending.png)
![Detail — Confirmed](../screenshots/workflow/appointment-lifecycle/WF13c-patient-appointment-detail-confirmed.png)

---

### 2.3 Appointment Lifecycle — วงจรสถานะการนัดหมาย

```
📝 Patient Books → ⏳ Pending → 👨‍⚕️ Doctor Reviews → ✅ Confirmed → 📹 Meeting → ✔️ Completed
```

| Status | Thai | Color | Description |
|--------|------|-------|-------------|
| **Pending** | รอดำเนินการ | 🟡 Yellow | Request sent, awaiting doctor review |
| **Finding Doctor** | กำลังจัดหาแพทย์ | 🟠 Orange | Admin matching a doctor |
| **Assigned** | มอบหมายแล้ว | 🔵 Blue | Admin assigned to a doctor |
| **Confirmed** | ยืนยันแล้ว | 🟢 Green | Doctor confirmed — meeting link ready |
| **In Progress** | กำลังดำเนินการ | 🔴 Red | Video meeting active |
| **Completed** | เสร็จสิ้น | ⚪ Gray | Consultation done, EMR available |
| **Cancelled** | ยกเลิก | ⬛ Black | Cancelled by patient or doctor |

When **Confirmed** → notification + video link + **"Join Meeting"** button

![Appointment Confirmed](../screenshots/workflow/appointment-lifecycle/WF13-patient-appointment-confirmed.png)
![Confirmed on Cloud](../screenshots/cloud-workflows/appointment-lifecycle/WC12-appointment-confirmed.png)

---

### 2.4 Joining a Video Call — เข้าร่วมวิดีโอคอล

**Step 1: Accept Agreement** — 3 consent items:
- ☑️ Video recording consent (for medical purposes)
- ☑️ Transcription consent (for medical records)
- ☑️ Data sharing consent (per PDPA)

![Patient Agreement](../screenshots/workflow/video-meeting/WF15a-patient-agreement.png)

**Step 2: Pre-Join Screen** — Microsoft Teams style:
- Test camera/microphone (shows OK status)
- View participant info (doctor name, role)
- View invite link for family/caregivers

![Pre-Join Screen](../screenshots/workflow/video-meeting/WF15b-patient-pre-join-invite.png)

**Step 3: Enter Meeting Room** — Click **"เข้าร่วม" (Join)** → enter Lobby, wait for doctor approval
- 🎥 Camera ON/OFF
- 🎤 Microphone ON/OFF
- 💬 Text chat (Socket.IO)
- 📱 Screen sharing
- ⌛ Wait in Lobby with timer

**Step 4: Post-Meeting** — AI auto-generates consultation summary → view in PHR + Timeline

![AI Summary Post-Meeting](../screenshots/workflow/video-meeting/WF16-meeting-ended-ai-summary.png)

---

### 2.5 Guest Join & Lobby — เชิญผู้เข้าร่วม (Microsoft Teams Style)

Patients can invite **family, friends, or external participants** — guests **do not need an account**.

**How Guests Join:**

1. **Receive invite link** from patient — URL: `/guest-join/:meetingId`
2. **Enter name** on Guest Join page (no login, no email required)
3. **Click "ขอเข้าร่วม" (Request to Join)** → doctor notified instantly (Socket.IO)
4. **Wait for approval** — waiting screen with timer displayed
5. **Enter meeting** — when doctor clicks "Admit", Jitsi video call opens
6. **If rejected** — red screen: "แพทย์ไม่อนุญาตให้เข้าร่วม" + back button

**For the Doctor (Host):**
- **Waiting Room** panel shows all pending participants
- Click **"อนุญาต" (✓ Admit)** or **"ปฏิเสธ" (✗ Reject)** per person
- Admin users also join through Lobby — doctor must approve

---

### 2.6 Personal Health Records (PHR) — ประวัติสุขภาพ

Click **"ประวัติสุขภาพ" (PHR)** in the sidebar. 7 tabs:

| Tab | Thai | Content |
|-----|------|---------|
| **Overview** | ภาพรวม | Latest vitals, meds, allergies, chronic conditions |
| **Vital Signs** | สัญญาณชีพ | Blood pressure, heart rate, temperature, weight, glucose, O₂ — trend graphs |
| **Medications** | ยาที่ใช้ | Drug name, dosage, frequency, status (active/stopped) |
| **Allergies** | การแพ้ | Allergens, type, severity, symptoms — auto-alerts on prescriptions |
| **Lab & Imaging** | ผลแลป/ภาพถ่าย | Lab results, X-ray, CT, MRI — AI analysis available |
| **Profile** | ข้อมูลส่วนตัว | Height, weight, blood type, DOB |
| **Lifestyle** | วิถีชีวิต | Diet, exercise, sleep, smoking, alcohol — AI recommendations |

![PHR Page](../screenshots/cloud/patient-portal/patient-06-phr.png)
![PHR Updated](../screenshots/cloud-workflows/health-records/WC17-patient-phr-updated.png)
![PHR Data](../screenshots/cloud-workflows/health-records/WC15-patient-phr.png)

**Adding Data:** Select tab → click **"เพิ่ม" (Add)** → fill values → click **"บันทึก" (Save)**

**Lab Reports from Doctor:** When doctors order and record results, they appear in the Lab & Imaging tab automatically.

![Lab Results](../screenshots/lab-orders/LAB03-lab-results.png)

---

### 2.7 Health Timeline — ไทม์ไลน์สุขภาพ

Click **"เส้นทางสุขภาพ" (Timeline)** for chronological medical events:

- 📅 Appointment dates + status
- 💊 Medication changes
- 🔬 Lab results received
- 📝 EMR entries from doctors
- 🩺 Diagnosis records
- 🏥 Video consultation summaries
- 📋 PHR updates

**Filter:** By event type + date range. Click cards to expand details.

![Timeline](../screenshots/cloud-workflows/health-records/WC20-patient-timeline.png)
![Timeline PHR](../screenshots/phr-timeline/PHR04-timeline.png)

---

### 2.8 AI Doctor Consultation — ปรึกษา AI

Chat with Gemini AI for general health advice:

1. Click **"ปรึกษา AI" (AI Doctor)** in the sidebar
2. Type health questions (Thai or English)
3. AI responds with advice — multi-turn conversation supported
4. AI references your PHR data for personalized answers
5. Save sessions or browse past sessions

**Example Questions:**
- "ปวดหัวบ่อย ๆ ควรทำอย่างไร" (Frequent headaches — what should I do?)
- "ยา Paracetamol กินกับ Ibuprofen ได้ไหม" (Can I take Paracetamol with Ibuprofen?)
- "ค่า BMI เท่าไหร่ จากข้อมูลของฉัน" (What's my BMI from my data?)

![AI Doctor](../screenshots/cloud-workflows/ai-features/WC39-patient-ai-doctor.png)
![AI Doctor Cloud](../screenshots/cloud/patient-portal/patient-07-ai-doctor.png)

> ⚠️ AI Doctor provides general health information only — **not a medical diagnosis**. Always consult a real doctor.

---

### 2.9 Health Library — คลังความรู้สุขภาพ

Click **"คลังความรู้สุขภาพ" (Health Library)** to read doctor-published articles:

- Search by keyword or category (diseases, medications, wellness, prevention)
- Thai-language content with images
- Click article for full detail view
- Shows author, publish date, category

![Health Library](../screenshots/cloud/patient-portal/patient-08-health-library.png)
![Library Workflow](../screenshots/cloud-workflows/ai-features/WC40-patient-health-library.png)
![Content Library](../screenshots/cloud-workflows/content-management/WC25-patient-content-library.png)

---

### 2.10 Nearby Healthcare Map — แผนที่สถานพยาบาล

Click **"แผนที่สถานพยาบาล" (Map)** → allow GPS location.

- **Interactive Map** (Google Maps) — hospitals, clinics, pharmacies, health centers
- **Distance Filter:** 1, 3, 5 (default), 10, 15, 20 km
- **Facility Info:** Name, address, phone, distance, hours
- **Summary Count:** Hospitals XX, Clinics XX, Pharmacies XX, Centers XX
- **Navigation:** One-tap Google Maps navigation

![Healthcare Map](../screenshots/cloud-workflows/ai-features/WC41-patient-map.png)
![Map Cloud](../screenshots/cloud/patient-portal/patient-10-map.png)

---

### 2.11 Living Will — พินัยกรรมชีวิต

Click **"PDPA & หนังสือแสดงเจตนา"** → **"พินัยกรรมชีวิต" tab**

4-step wizard for advance healthcare directives:

| Step | Content |
|------|---------|
| **1. Primary Proxy** | Name, relationship, contact (phone, email, address) |
| **2. Alternate Proxy** | Backup proxy if primary unavailable (optional) |
| **3. Treatment Preferences** | CPR, ventilator, tube feeding, dialysis, antibiotics, pain management, organ donation |
| **4. Digital Signature** | Digital signature + toggle doctor sharing |

**Document Status:**
- **Draft** — Created but not signed
- **Active** — Signed, doctors can view (per PDPA consent)
- **Revoked** — Document cancelled

![Living Will](../screenshots/cloud-workflows/living-will/WC31-patient-living-will.png)
![Living Will PHR](../screenshots/phr-timeline/PHR05-living-will.png)

---

### 2.12 PDPA Consent — ความยินยอม PDPA

Click **"PDPA & หนังสือแสดงเจตนา"** → **"PDPA" tab**

Manage data privacy consent under Thailand's Personal Data Protection Act:

| Data Type | Description |
|-----------|-------------|
| Demographics | Name, age, address, phone |
| Medical History | All treatment records |
| Medications | Current and past medications |
| Allergies | Drug and substance allergy history |
| Lab Results | Laboratory test results |
| Prescriptions | Doctor prescriptions |
| Vital Signs | Blood pressure, heart rate, weight |
| PHR | Personal health records |
| EMR | Electronic medical records |
| Living Will | Advance directive documents |

- Toggle ON/OFF per data type
- Set different sharing per doctor
- Revoke consent at any time

![PDPA Consent](../screenshots/cloud-workflows/living-will/WC32-patient-pdpa.png)
![PDPA Cloud](../screenshots/cloud/patient-portal/patient-11-pdpa.png)

---

### 2.13 Profile & Settings — โปรไฟล์และการตั้งค่า

**Profile:** Edit avatar, name, contact details, emergency contact, insurance info.

![Profile](../screenshots/cloud/patient-portal/patient-13-profile.png)

**Settings:**
- 🌐 **Language:** Thai ↔ English (instant switch)
- 🎨 **Theme:** Light / Dark
- 🔔 **Notifications:** In-app / Email / Push — toggle per type
- 🔒 **Privacy:** PDPA consent management
- 📱 **Devices:** Manage active sessions

![Settings](../screenshots/cloud-workflows/notifications/WC29-patient-settings.png)
![Settings Cloud](../screenshots/cloud/patient-portal/patient-14-settings.png)

---

## 3. Doctor Portal — ระบบแพทย์

### 3.1 Doctor Dashboard — แดชบอร์ดแพทย์

Overview of all key information on one page:

**Summary Bar (6 cards):**
| Metric | Description |
|--------|-------------|
| Today's Appointments | Scheduled for today |
| Patients Seen | Total patients treated |
| In Queue | Patients currently waiting |
| Pending Prescriptions | Uncompleted prescriptions |
| Unread Messages | Unread notifications |
| Avg Wait Time (min) | Average patient wait time |

**3 Main Areas:**
1. **Health Data** — Patient queue and records
2. **Health Meeting** — Video consultation + patient/doctor/team views
3. **Health Studio** — Clinical tools (diagnosis, treatment plans, EMR, radiology, lab reports)

**AI Patient Summary:** Select a patient to view auto-generated AI history summary (status: awaiting review)

![Doctor Dashboard](../screenshots/workflow/auth-login/WF09-doctor-dashboard.png)
![Dashboard Cloud](../screenshots/cloud/doctor-portal/doctor-02-dashboard.png)
![Dashboard Workflow](../screenshots/cloud-workflows/user-management/WC03-doctor-dashboard.png)

---

### 3.2 Schedule Management — จัดการตารางเวลา

Click **"ตารางนัดหมาย" (Schedule)** in the sidebar.

**Features:**
- Click date/time slots to set **Available** or **Unavailable**
- Set recurring patterns (daily / weekly / monthly)
- Switch views: Day / Week / Month
- View confirmed appointments on calendar
- Color-coded: online / in-person / holiday

![Schedule](../screenshots/cloud/doctor-portal/doctor-03-schedule.png)
![Schedule Workflow](../screenshots/cloud-workflows/appointment-lifecycle/WC13-doctor-schedule.png)

---

### 3.3 Patient Queue & Health Meeting — คิวนัดหมาย

Click **"นัดหมาย & ประชุม" (Appointments & Meeting)** in the sidebar.

**Summary Bar:**
- **Awaiting Confirmation** — Count pending
- **Completed** — Count finished

**Patient Queue:**
- List of pending appointments
- Click **"Refresh"** to update
- View symptoms + AI urgency analysis
- Click **"ยืนยัน" (Confirm)** → auto-generates Jitsi link + notifies patient
- Click **"ปฏิเสธ" (Decline)** → enter reason + notify patient
- **Call Next Patient** button for auto-queue advancement

![Queue](../screenshots/workflow/appointment-lifecycle/WF12-health-meeting-queue.png)
![Queue Cloud](../screenshots/cloud-workflows/appointment-lifecycle/WC14-health-meeting-queue.png)
![Appointment Pool](../screenshots/workflow/appointment-lifecycle/WF10-appointment-management-pool.png)

---

### 3.4 Conducting Video Meetings — การดำเนินการประชุมวิดีโอ

**Step 1:** Accept meeting agreement (recording, transcription, PDPA)

![Doctor Agreement](../screenshots/workflow/video-meeting/WF14a-doctor-agreement.png)

**Step 2:** Pre-join screen — test camera/mic, view participant status

![Doctor Pre-Join](../screenshots/workflow/video-meeting/WF14b-doctor-pre-join.png)

**Step 3:** Join as **HOST** (moderator — highest privileges)

**Host Features:**
- 🔑 **Lobby Control:** Admit/reject patients, guests, admins from Waiting Room
- 🎙️ **Transcription:** ▶️ Start → ⏸️ Pause → ⏯️ Resume → ⏹️ Stop
- 🗣️ **Speaker Diarization:** Auto-identifies doctor/patient/guest speech
- 🌐 **Language Toggle:** Thai ↔ English transcription
- 📹 **Video Recording:** Start/stop recording (200MB limit)
- 💬 **Chat:** Send messages during meeting (Socket.IO)
- 📱 **Screen Sharing:** Share documents/images via screen

![Meeting Room](../screenshots/meeting-recording/MR04-meeting-room-controls.png)

**Step 4:** Click **"วางสาย" (Hang Up)** → AI processing begins automatically

---

### 3.5 Post-Meeting: AI Summary & EMR — หลังการประชุม

After the meeting, Gemini AI auto-generates:

| Output | Format |
|--------|--------|
| **SOAP Summary** | S (Subjective), O (Objective), A (Assessment), P (Plan) |
| **Patient Instructions** | Easy-language care advice (Thai + English) |
| **CDS** | Drug interaction alerts, dosage checks, allergy contraindications |

![AI SOAP Summary](../screenshots/meeting-recording/MR06-ai-summary-soap.png)

**Doctor Validation (Man-in-the-Loop):**

| Action | Description |
|--------|-------------|
| ✅ **Approve** | Accept AI output as-is → lock EMR |
| ✏️ **Edit** | Modify specific sections (S/O/A/P) before approval |
| 🔄 **Regenerate** | Ask AI to regenerate with refined context |
| ❌ **Reject** | Discard AI output → write manually |

![Post-Meeting Actions](../screenshots/meeting-recording/MR07-post-meeting-actions.png)

**After Approval:**
- EMR locked + digitally signed
- Patient sees summary in PHR + Timeline immediately
- Notification sent to patient

---

### 3.6 EMR — Electronic Medical Records — เวชระเบียน

Access from dashboard → **"Medical Record (รายงานเวชระเบียน)"**

**SOAP Format:**
| Section | Content |
|---------|---------|
| **S** (Subjective) | Patient history — symptoms, duration, triggers |
| **O** (Objective) | Physical exam — vital signs, lab results |
| **A** (Assessment) | Diagnosis — ICD-10 code + description |
| **P** (Plan) | Treatment plan — medications, follow-up, referral |

**Features:**
- Digital signature to lock → version history maintained
- Reference lab results, prescriptions, images
- AI auto-drafts from transcription
- Export as PDF

![EMR Page](../screenshots/emr-prescriptions/EMR01-emr-page.png)

---

### 3.7 Prescriptions — ใบสั่งยา

Access from dashboard → **"Treatment Plan (แผนการรักษา / Prescribe)"**

**Steps:**
1. Search drug name (autocomplete from Thai drug database)
2. Set dosage, frequency, duration, instructions
3. AI auto-checks:
   - ⚠️ Drug interactions
   - ⚠️ PHR allergy records
   - ⚠️ Inappropriate dosage
4. Confirm → prescription appears in patient's PHR

![Prescriptions](../screenshots/emr-prescriptions/RX01-prescriptions-page.png)

---

### 3.8 Lab Orders — คำสั่งตรวจแลป

Access from dashboard → **"Laboratory Reports (รายงานทางห้องปฏิบัติการ)"**

**Steps:**
1. Select tests from standardized list
2. Set priority: **Routine / Stat / Urgent**
3. Add clinical notes
4. Submit lab order → await lab results
5. Record results → appears in patient's PHR automatically
6. AI analyzes results and alerts on abnormal values

![Create Lab Order](../screenshots/lab-orders/LAB02-lab-order-create.png)
![Lab Results](../screenshots/lab-orders/LAB03-lab-results.png)

---

### 3.9 Patient Management — จัดการผู้ป่วย

Click **"ผู้ป่วย" (Patients)** to view treated patients.

**Features:**
- Search by name, email, or ID
- View demographics (per PDPA consent)
- View PHR: vital signs, medications, allergies, lab results
- View appointment history + past EMR records
- View prescriptions + lab orders
- View Living Will (if patient authorized)

**Patient Record Viewer:** Click a patient name for full detail view.

![Patient Management](../screenshots/cloud/doctor-portal/doctor-04-patients.png)
![Patient List](../screenshots/cloud-workflows/health-records/WC18-doctor-patients.png)

---

### 3.10 Medical Content Creation — สร้างเนื้อหาทางการแพทย์

Click **"เนื้อหาทางการแพทย์" (Medical Content)** to create health articles for the patient Health Library.

**Steps:**
1. Click **"สร้างบทความ" (Create Article)**
2. Enter title, content (Thai primary), category, tags
3. Save as **Draft** or **Submit for Approval**
4. Admin reviews → Approve → published in Health Library

**Content Lifecycle:**
```
📝 Draft → 📤 Submitted → 👑 Admin Reviews → ✅ Published
                                            → ❌ Rejected (revise)
```

![Medical Content](../screenshots/cloud-workflows/content-management/WC21-doctor-medical-content.png)

---

### 3.11 Clinical Resources — ทรัพยากรทางคลินิก

Click **"ทรัพยากรทางคลินิก" (Clinical Resources)** to access:

- **Clinical Practice Guidelines** (แนวทางเวชปฏิบัติ)
- **Research Papers** (งานวิจัยทางการแพทย์)
- **Treatment Protocols** (โปรโตคอลการรักษา)
- **Reference Materials** (คู่มืออ้างอิง)

**Features:**
- Search with keywords (RAG + Gemini AI powered)
- Filter by type/category
- Rate (1-5 stars) with reviews
- Save favorites

![Clinical Resources](../screenshots/cloud/doctor-portal/doctor-09-clinical-resources.png)
![Resources Workflow](../screenshots/cloud-workflows/content-management/WC22-doctor-clinical-resources.png)

---

### 3.12 Medical Consultants & Doctors Directory — แพทย์ที่ปรึกษา

**Medical Consultants:**
Click **"แพทย์ที่ปรึกษา" (Medical Consultants)** — specialist expert directory.

- Name, specialty, hospital, email, phone
- Search by subspecialty
- View ratings and reviews from other doctors
- Rate (1-5 stars) with comments

![Medical Consultants](../screenshots/cloud-workflows/medical-consultants/WC35-doctor-consultants.png)

**Doctors Directory:**
Click **"ทำเนียบแพทย์" (Doctors Directory)** — all system doctors.

- Search by name/specialty
- View contact info and profiles

![Doctors Directory](../screenshots/cloud-workflows/medical-consultants/WC36-doctor-directory.png)
![Directory Cloud](../screenshots/cloud/doctor-portal/doctor-06-doctors-directory.png)

---

### 3.13 Gemini AI Studio — เครื่องมือ AI สำหรับแพทย์

Access from dashboard → purple AI button (bottom-right corner).

| Feature | Description |
|---------|-------------|
| **Diagnosis / Differential Diagnosis** | AI analyzes symptoms → suggests differential diagnosis |
| **Treatment Plan** | AI recommends treatment based on clinical guidelines |
| **Document Analysis** | AI reads PDF lab reports, images → extracts data |
| **Patient History Summary** | AI summarizes PHR + EMR before consultation |
| **CDS (Clinical Decision Support)** | Checks drug interactions, dosage, contraindications |

> 🤖 Gemini AI Studio is a **clinical decision support tool** — not a diagnostician. Doctor verification required for all outputs.

---

### 3.14 Doctor Profile — โปรไฟล์แพทย์

Click **"โปรไฟล์" (Profile)** to manage professional information:

- Avatar, full name
- Medical license number
- Specialty (subspecialty)
- Hospital/clinic
- Phone, email
- Experience, qualifications

![Doctor Profile](../screenshots/cloud/doctor-portal/doctor-10-profile.png)
![Profile Workflow](../screenshots/cloud-workflows/notifications/WC30-doctor-profile.png)
![Profile Workflow 2](../screenshots/workflow/post-meeting/WF18b-doctor-profile.png)

---

## 4. Admin Features — ระบบผู้ดูแล

Admin features are in the Doctor Portal for users with the **admin** role.

### 4.1 Admin Dashboard — แดชบอร์ดผู้ดูแล

Same as doctor dashboard but with additional menus + system-wide overview:
- System-wide appointment count
- Pending doctor approvals count
- Content submissions for review
- Usage statistics

![Admin Dashboard](../screenshots/cloud-workflows/user-management/WC04-admin-dashboard.png)

---

### 4.2 Doctor Management & Approval — อนุมัติและจัดการแพทย์

Click **"จัดการแพทย์" (Doctor Management)** for all doctors with status.

**Tabs:**
| Tab | Description |
|-----|-------------|
| All | Every doctor in the system |
| Pending | Registered, awaiting review |
| Approved | Active doctors |
| Rejected | Declined applications |
| Admins | Users with admin privileges |

**Actions:**
- ✅ **Approve** — Activate doctor account → send notification
- ❌ **Reject** — Decline with reason → send notification
- 👑 **Promote to Admin** — Grant admin privileges
- 🔒 **Deactivate** — Suspend account temporarily
- 📋 **View Details** — Full profile view (license, experience, etc.)

![Doctor Management](../screenshots/cloud/doctor-portal/doctor-11-doctor-management.png)
![Management Workflow](../screenshots/cloud-workflows/user-management/WC05-admin-doctor-mgmt.png)

---

### 4.3 System Appointment Management — จัดการนัดหมายทั้งระบบ

Click **"จัดการนัดหมาย" (Appointment Management)** for system-wide view.

**Features:**
- View all statuses: pending, assigned, confirmed, completed, cancelled
- **Assign Doctor:** Select by specialty (AI-assisted recommendation)
- **Bulk Operations:** Assign/cancel multiple appointments at once
- **Filter:** By doctor, status, date, type
- **Search:** By patient/doctor name or appointment ID

![Appointment Management](../screenshots/cloud/doctor-portal/doctor-12-appointment-management.png)

---

### 4.4 Content & Resource Approval — อนุมัติเนื้อหา

Review articles/resources submitted by doctors:

1. View content pending approval
2. Read full content — verify accuracy
3. Click **"อนุมัติ" (Approve)** → published in Health Library
4. Click **"ปฏิเสธ" (Reject)** → return to doctor with comments

![Content Review](../screenshots/cloud-workflows/content-management/WC24-admin-content-review.png)

---

### 4.5 Schedule & User Management — จัดตาราง & จัดการผู้ใช้

**Additional Admin features:**
- View all doctors' schedules — combined view
- Manage notification templates
- Review PDPA compliance reports
- View system usage statistics

---

## 5. Telemedicine Consultation Workflow

### 5.1 End-to-End Process Overview

```
Patient Books → Admin Assigns → Doctor Confirms → Accept Agreement → Video Meeting
→ AI SOAP Summary → Doctor Validates → Sign EMR → Patient Views in PHR/Timeline
```

### 5.2 Detailed Step-by-Step

| Step | Actor | Action | Screenshot |
|------|-------|--------|------------|
| 1 | Patient | Book appointment (symptoms + date/time + invite guests) | ![](../screenshots/workflow/appointment-lifecycle/WF06-appointment-created.png) |
| 2 | Admin | Assign doctor (by specialty / AI recommendation) | ![](../screenshots/cloud-workflows/appointment-lifecycle/WC09-doctor-queue.png) |
| 3 | Doctor | Confirm appointment + set meeting time | ![](../screenshots/workflow/appointment-lifecycle/WF11-appointment-confirmed.png) |
| 4 | Both | Accept agreement (recording + PDPA) | ![](../screenshots/workflow/video-meeting/WF14a-doctor-agreement.png) |
| 5 | Both | Enter video meeting room (Jitsi) | ![](../screenshots/workflow/video-meeting/WF14b-doctor-pre-join.png) |
| 6 | Doctor | Conduct consultation + transcription + recording | ![](../screenshots/meeting-recording/MR04-meeting-room-controls.png) |
| 7 | AI | Generate SOAP summary + patient instructions + CDS | ![](../screenshots/meeting-recording/MR06-ai-summary-soap.png) |
| 8 | Doctor | Validate → approve/edit/regenerate/reject | ![](../screenshots/meeting-recording/MR07-post-meeting-actions.png) |
| 9 | Doctor | Prescribe medications + order labs (if needed) | ![](../screenshots/emr-prescriptions/RX01-prescriptions-page.png) |
| 10 | System | Send results to PHR/Timeline + notify patient | ![](../screenshots/cloud-workflows/health-records/WC20-patient-timeline.png) |

---

## 6. Doctor Onboarding Workflow

### 6.1 Registration Lifecycle

```
1. Doctor Registers → 2. Status "Pending" → 3. Admin Reviews
→ 4. Approve/Reject → 5. (Optional) Promote to Admin → 6. Doctor Can Login
```

### 6.2 Detailed Steps

| Step | Action | Details | Screenshot |
|------|--------|---------|------------|
| 1 | Doctor registers | Name, email, password, license number, specialty → status: **pending** | ![](../screenshots/cloud-workflows/admin-register-doctor/AR03-doctor-register.png) |
| 2 | System creates account | Account created but **cannot login** until approved | |
| 3 | Admin reviews | Doctor Management → Pending tab → review credentials | |
| 4 | Admin approves | Click "Approve" → status: **approved** → send notification | ![](../screenshots/cloud-workflows/admin-register-doctor/AR04-admin-approve-doctor.png) |
| 5 | Promote to admin | (Optional) Click "Promote to Admin" → grant admin privileges | ![](../screenshots/cloud-workflows/admin-register-doctor/AR05-admin-promote-doctor.png) |
| 6 | Doctor logs in | Login with registered email/password | ![](../screenshots/cloud-workflows/admin-register-doctor/AR06-new-admin-access.png) |

> ⚠️ **Security:** Rejected or suspended doctors cannot log in. JWT is immediately revoked.

---

## 7. Video Meeting System & Jitsi

### 7.1 Meeting System Architecture

```
Patient (Patient Portal)  ─→  Meeting Server (Socket.IO)  ←─  Doctor (Doctor Portal)
                                       ↕
                                Jitsi Meet (WebRTC)
                                       ↕
                             Gemini AI (SOAP Summary)
```

### 7.2 Meeting Room Feature Matrix

| Feature | Patient | Doctor (Host) | Guest |
|---------|---------|---------------|-------|
| Video/Audio | ✅ | ✅ | ✅ |
| Text Chat | ✅ | ✅ | ✅ |
| Screen Sharing | ✅ | ✅ | ❌ |
| Transcription | — | ✅ (controls) | — |
| Video Recording | — | ✅ | — |
| Lobby Control | — | ✅ | — |
| Mute Others | — | ✅ | — |
| End Meeting for All | — | ✅ | — |

### 7.3 Lobby System — Microsoft Teams Style

```
Guest/Patient enters link → Enter name → Wait in Lobby → Doctor admits/rejects → Enter/Exit room
```

**For Doctors:**
- See list of waiting participants (name, type: patient/guest/admin)
- ✓ **Admit** — Participant enters meeting immediately
- ✗ **Reject** — Participant sees red screen in Thai + exit button

### 7.4 Guest Join — No Account Required

Patients can send `/guest-join/:meetingId` link to family/caregivers:

1. Open link → Guest Join page shows meeting name
2. Enter name (no login, no email)
3. Test camera/mic → click Join → enter Lobby
4. When admitted → enter Jitsi room with settings:
   - Skip secondary lobby for pre-approved participants
   - Default muted on entry
   - Recording buttons hidden for guests

---

## 8. AI Features & Gemini

### 8.1 AI Feature Overview

| Feature | Portal | Description |
|---------|--------|-------------|
| **AI Doctor Chat** | Patient | Multi-turn health Q&A with PHR context |
| **AI Triage** | Patient | Auto-analyze symptom urgency during booking |
| **AI Patient Summary** | Doctor | Pre-consultation PHR+EMR summary |
| **AI SOAP Summary** | Doctor | Post-meeting SOAP note from transcription |
| **AI Patient Instructions** | Doctor | Auto-generate patient care instructions |
| **AI CDS** | Doctor | Drug interaction, dosage, allergy checks |
| **AI Document Analysis** | Doctor | Extract data from PDF/images |
| **AI Diagnosis Assist** | Doctor | Differential diagnosis suggestions |

### 8.2 Man-in-the-Loop Principle

All AI-generated medical outputs **require doctor validation** before being published to patients:

```
AI generates → Doctor reviews → Approve / Edit / Regenerate / Reject → Patient receives
```

- AI **never** auto-publishes diagnoses, prescriptions, or EMR
- All AI outputs are marked with "AI-generated, awaiting review" status
- Audit trail maintained for every AI interaction

---

## 9. Meeting Recording & Transcription

### 9.1 Video Recording

- Meeting video/audio recorded and stored in database (BYTEA format)
- Recordings linked to appointments
- Doctor can review recordings post-meeting
- Maximum recording size: 200MB

![Meeting Controls](../screenshots/meeting-recording/MR04-meeting-room-controls.png)

### 9.2 Real-Time Transcription

- Real-time speech-to-text using Web Speech API
- **Speaker diarization** — identifies who is speaking (doctor/patient/guest)
- Supports Thai and English with language toggle
- Transcript stored in PostgreSQL

![Transcript & Diarization](../screenshots/meeting-recording/MR05-transcript-diarization.png)

### 9.3 Transcription Controls (Doctor Only)

| Control | Action |
|---------|--------|
| ▶️ **Start** | Begin transcription |
| ⏸️ **Pause** | Temporarily pause |
| ⏯️ **Resume** | Continue transcription |
| ⏹️ **Stop** | End transcription |

- Language toggle: Thai ↔ English
- Real-time display in meeting sidebar
- Transcript feeds into AI SOAP summary

---

## 10. Notifications

### 10.1 Notification Types

| Type | When Sent | Recipient |
|------|-----------|-----------|
| 📅 Appointment Requested | Patient books | Doctor/Admin |
| ✅ Appointment Confirmed | Doctor confirms | Patient |
| ❌ Appointment Cancelled | Either party cancels | Both |
| 📹 Meeting Ready | 15 min before meeting | Patient + Doctor |
| 📹 Meeting Started | Doctor starts meeting | Patient |
| 📄 EMR Ready | Doctor signs EMR | Patient |
| 💊 Prescription Ready | Doctor creates Rx | Patient |
| 🔬 Lab Results Ready | Results entered | Patient |
| 👨‍⚕️ Doctor Approved | Admin approves | Doctor |
| 📝 Content Submitted | Doctor submits article | Admin |
| ⏰ Appointment Reminder | 24h & 1h before | Patient + Doctor |
| 🚪 Lobby Request | Guest requests entry | Doctor |

### 10.2 Notification Channels

- 🔔 **In-App** — notification bell with count badge
- 📧 **Email** — Gmail API integration
- 📱 **Browser Push** — if enabled in settings

---

## 11. Content & Resource Management

### 11.1 Content Lifecycle

```
📝 Doctor drafts → 📤 Submit for approval → 👑 Admin reviews → ✅ Published → 👤 Patient reads
                                                             → ❌ Rejected → 📝 Doctor revises
```

### 11.2 Content Types

| Type | Creator | Audience | Approval |
|------|---------|----------|----------|
| **Health Articles** | Doctor | Patients (Health Library) | Admin required |
| **Clinical Resources** | Doctor | Doctors only | Admin required |
| **Medical Guidelines** | Doctor/Admin | Doctors only | Admin required |
| **Reference Materials** | Doctor | Doctors only | Admin required |

### 11.3 Clinical Resources

- Searchable medical knowledge base for doctors
- RAG + Gemini AI-powered search
- Rating system (1-5 stars) with reviews
- Categories: guidelines, research, protocols, references

---

## 12. Security & PDPA

### 12.1 Security Measures

| Measure | Implementation |
|---------|---------------|
| **JWT Authentication** | Signed tokens with 30-min expiration |
| **RBAC** | Role-based access control (patient/doctor/admin) |
| **API Protection** | JWT + role verification on every endpoint |
| **Password Hashing** | bcrypt with salt rounds |
| **Input Validation** | Server-side validation + SQL parameterization |
| **HTTPS** | TLS encryption on all Cloud Run services |
| **Session Management** | Secure cookies + automatic expiration |
| **CORS** | Restricted cross-origin resource sharing |

### 12.2 PDPA Compliance

Thailand's Personal Data Protection Act compliance:

- **Consent Management:** Granular per-data-type consent controls
- **Data Minimization:** Only collect necessary health data
- **Right to Access:** Patients can view all their data
- **Right to Delete:** Patients can request data deletion
- **Right to Withdraw:** Revoke consent at any time
- **Data Portability:** Export health data as needed
- **Per-Doctor Controls:** Different sharing settings per treating doctor

### 12.3 Data Encryption & Storage

- All data stored in PostgreSQL with parameterized queries
- Passwords hashed with bcrypt
- JWT signed with shared secret across services
- Cloud Run services behind Google Cloud infrastructure
- Meeting recordings stored as encrypted BYTEA in database

---

## 13. Troubleshooting & FAQ

**Q: I can't log in as a doctor.**
> New doctor accounts require admin approval. Contact your admin. See [Section 6](#6-doctor-onboarding-workflow).

**Q: My appointment is still "Pending."**
> Waiting for doctor review. You'll receive a notification when confirmed.

**Q: I can't join the video meeting.**
> Make sure you: (1) accepted the meeting agreement, (2) allowed camera/mic access, (3) use Chrome, (4) meeting hasn't ended already.

**Q: Where can I see my lab results?**
> Go to **PHR → Lab & Imaging** tab. Results appear there once your doctor enters them.

**Q: The map doesn't show facilities.**
> Allow location access in browser. Try increasing the distance filter (10 or 20 km).

**Q: How do I change the language?**
> Go to **Settings → Language** and toggle Thai ↔ English.

**Q: AI Doctor chat isn't responding.**
> The AI service may need a moment. Try refreshing and starting a new session.

**Q: How do I share health records with a doctor?**
> Go to **PDPA Consent** and enable sharing for specific data types per doctor.

**Q: Guest can't enter the meeting.**
> Guest must wait in the Lobby for doctor approval. Doctor needs to click "Admit" in the Waiting Room panel.

**Q: How do I invite family to my meeting?**
> Copy the guest join link from the pre-join screen and share it. Guests only need a name — no account required.

**Q: Where is the AI SOAP summary?**
> After doctor approves, it appears in your PHR and Timeline. You'll receive a notification.

**Q: Can I revoke my Living Will?**
> Yes. Go to Living Will page → click "Revoke." The document will be immediately marked as revoked.

**Q: How do I see other doctors in the system?**
> Go to **Doctors Directory** in the sidebar. You can search by name or specialty.

**Q: What is CDS (Clinical Decision Support)?**
> AI automatically checks drug interactions, dosage, and allergy contraindications when prescribing. The doctor sees alerts before finalizing prescriptions.

**Q: How is my data protected?**
> All data is encrypted in transit (HTTPS), passwords are hashed (bcrypt), and you control exactly what data is shared via PDPA consent settings.

**Q: Meeting recording failed or is too large.**
> Maximum recording size is 200MB. For longer meetings, pause/resume recording strategically. The transcript is always available regardless of recording status.

**Q: แพทย์ใหม่ลงทะเบียนแล้วแต่เข้าสู่ระบบไม่ได้?**
> ต้องรอผู้ดูแลระบบอนุมัติก่อน (ดูหัวข้อ 6 กระบวนการลงทะเบียนแพทย์ใหม่)

---

## Appendix: Platform Architecture

| Component | URL | Purpose |
|-----------|-----|---------|
| **Patient Portal** | `izara-patient-portal-dev-testing-*.run.app` | Patient-facing web application |
| **Doctor Portal** | `izara-doctor-portal-dev-testing-*.run.app` | Doctor and Admin web application |
| **Meeting Server** | `izara-meeting-server-dev-testing-*.run.app` | Jitsi video meeting management |
| **Database** | PostgreSQL (Cloud SQL) | All data storage (PHR, EMR, appointments) |
| **AI Engine** | Gemini 2.5 Flash | Medical AI features |

---

**© 2026 IZARA Telemedicine Platform — All Rights Reserved**

*This user guide covers v1.5.10 with 2,013 verified unit tests across 58 test suites + 101 cloud UI tests — all passing 100%.*
