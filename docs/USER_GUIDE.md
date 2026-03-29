# 📖 IZARA Telemedicine — คู่มือการใช้งาน (User Guide)

**Version 1.5.10** | **Updated: March 29, 2026**

> คู่มือฉบับสมบูรณ์สำหรับผู้ป่วย แพทย์ และผู้ดูแลระบบ
> Complete User Guide for Patients, Doctors, and Administrators
> ทดสอบอัตโนมัติ 2,013 รายการ + UI ทดสอบ 516 รายการ (351 ผ่าน, 50 ข้าม, 638 ภาพ) จาก 14 ไฟล์ทดสอบ

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

## 5. Telemedicine Consultation Workflow — กระบวนการให้คำปรึกษาทางไกล

### 5.1 End-to-End Lifecycle — ภาพรวมกระบวนการ

The complete consultation lifecycle has 6 phases:

```
📝 Patient Books → ⏳ Pending → 👨‍⚕️ Doctor Reviews → ✅ Confirmed → 📹 Meeting → ✔️ Completed
```

**Phase 1 — Booking & Approval:**
1. Patient books appointment (symptoms + preferred time + doctor selection or auto-match)
2. AI analyzes symptoms → urgency level + specialty suggestion
3. Two approval paths: **Path A** (doctor confirms directly) or **Path B** (admin assigns → doctor confirms)
4. On confirmation: Jitsi meeting URLs auto-generated, patient notified with link

**Phase 2 — Pre-Meeting Preparation:**
5. Patient optionally invites relatives/friends (no account needed)
6. Doctor optionally invites specialists/other doctors (token-based invite)
7. AI generates Pre-Consultation Summary from patient's PHR + EMR history

**Phase 3 — Meeting Execution** (see [Section 7](#7-video-meeting-system--jitsi--ระบบวิดีโอประชุม))

**Phase 4 — Post-Meeting AI Processing** (see [Section 8](#8-ai-features--gemini--ฟีเจอร์-ai) and [Section 9](#9-meeting-recording--transcription--ระบบบันทึกและถอดเสียง))

**Phase 5 — Doctor Review & EMR Documentation:**
8. AI summary appears in Doctor Portal → Health Meeting page
9. Doctor validates: [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject]
10. EMR editor opens with AI-prefilled SOAP tabs (S/O/A/P)
11. Doctor signs EMR → AI generates Patient Instruction Sheet
12. Optional: E-prescribing + lab orders

**Phase 6 — Patient Delivery:**
13. Patient receives: diagnosis, treatment plan, medications, instruction sheet (PDF), follow-up schedule, warning signs
14. Patient does NOT receive: internal notes, raw AI outputs, CDS alerts
15. Visible in: Dashboard (latest result), Timeline (history entry), PHR (health logs)
16. Appointment status → **completed**

![Appointments List](../screenshots/workflow/appointment-lifecycle/WF04-patient-appointments-empty.png)
![Appointment Confirmed](../screenshots/cloud-workflows/appointment-lifecycle/WC12-appointment-confirmed.png)

> 📌 **Tip:** ผู้ป่วยจะได้รับลิงก์การประชุมทันทีเมื่อแพทย์ยืนยันนัดหมาย — ส่งทั้งอีเมลและแจ้งเตือนในแอป

---

### 5.2 Appointment Status Flow — สถานะการนัดหมาย

| Status | Thai | Color | Description |
|--------|------|-------|-------------|
| **Pending** | รอดำเนินการ | 🟡 Yellow | Request sent, awaiting doctor review |
| **Finding Doctor** | กำลังจัดหาแพทย์ | 🟠 Orange | Admin searching for available doctor |
| **Assigned** | มอบหมายแล้ว | 🔵 Blue | Admin assigned a doctor |
| **Confirmed** | ยืนยันแล้ว | 🟢 Green | Doctor confirmed — meeting link ready |
| **In Progress** | กำลังดำเนินการ | 🔴 Red | Video consultation in progress |
| **Completed** | เสร็จสิ้น | ⚪ Gray | Consultation done — view summary/EMR |
| **Cancelled** | ยกเลิก | ⬛ Black | Cancelled by patient, doctor, or admin |

---

## 6. Doctor Onboarding Workflow — กระบวนการลงทะเบียนแพทย์ใหม่

### 6.1 Doctor Registration — การลงทะเบียนแพทย์

New doctors must register and wait for admin approval before accessing the system.

**Steps:**
1. Open Doctor Portal → click **"Register"**
2. Fill in: Name, Email, Phone, Medical License Number, Specialty, Password
3. Submit → see **"Pending Approval"** message
4. Doctor **cannot log in** until admin approves

![Doctor Registration](../screenshots/admin-registration/AR03-doctor-register.png)

> ⚠️ **Note:** แพทย์ใหม่จะไม่สามารถเข้าสู่ระบบได้จนกว่าผู้ดูแลระบบจะอนุมัติ

---

### 6.2 Admin Approval Process — กระบวนการอนุมัติ

1. Admin navigates to **"จัดการแพทย์" (Doctor Management)** page
2. Views **Pending** tab (badge shows count of waiting doctors)
3. Reviews doctor details: name, email, license, specialty, registration date
4. Clicks **"Approve"** → doctor account activated → notification email sent
5. Or clicks **"Reject"** → enters rejection reason → doctor notified

![Admin Approval](../screenshots/admin-registration/AR04-admin-approve-doctor.png)
![Doctor Management](../screenshots/cloud-workflows/user-management/WC05-admin-doctor-mgmt.png)

---

### 6.3 Doctor Approval States — สถานะการอนุมัติ

| State | Can Login? | is_active | is_approved |
|-------|-----------|-----------|-------------|
| **Pending** | ❌ | false | false |
| **Approved** | ✅ | true | true |
| **Rejected** | ❌ | false | false |

> 📌 **Tip:** Admins can also promote approved doctors to admin role or demote admins back to doctor

---

## 7. Video Meeting System & Jitsi — ระบบวิดีโอประชุม

### 7.1 Meeting Participants & Roles — ผู้เข้าร่วมประชุม

| Role | How They Join | Lobby? |
|------|--------------|--------|
| **Doctor (HOST)** | "Join Meeting" from Scheduled tab | No (moderator) |
| **Patient** | Meeting link from appointments page | Yes (waits for doctor) |
| **Patient's Relatives** | Shared link from patient | Yes (create name + lobby) |
| **Other Doctors/Admin** | Token-based invite from doctor | Yes (lobby) |
| **External Guests** | Direct link (no account needed) | Yes (create name + lobby) |

---

### 7.2 Doctor (HOST) Meeting Flow — การเข้าประชุมของแพทย์

1. Open **"ตารางประชุม" (Scheduled Meetings)** → click **"🎥 เข้าร่วมประชุม" (Join Meeting)**
2. Pre-join screen: camera/mic preview (both ON by default)
3. Enter room as HOST/Moderator — the meeting room is created and synchronized so the patient sees the same room
4. **Host Controls:** Lobby admission (individual or **"อนุญาตทั้งหมด" Admit All**), kick, mute all, start/stop recording, invite guests

![Doctor Pre-Join](../screenshots/workflow/video-meeting/WF14b-doctor-pre-join.png)

---

### 7.3 Patient Meeting Flow — การเข้าประชุมของผู้ป่วย

1. See meeting link in **"นัดหมายของฉัน" (My Appointments)** page
2. Accept 3-consent agreement (video recording, transcription, PDPA)
3. Pre-join screen: test camera/mic
4. Click **"เข้าร่วม" (Join)** → enter Lobby → wait for doctor
5. Doctor approves → enters meeting room

![Patient Agreement](../screenshots/workflow/video-meeting/WF15a-patient-agreement.png)

> 🔒 **Security:** ผู้ป่วยต้องยอมรับข้อตกลง 3 ข้อก่อนเข้าร่วมประชุม (การบันทึกวิดีโอ, ถอดเสียง, PDPA)

---

### 7.4 Guest Join Flow — การเข้าร่วมแบบผู้เยี่ยม (ไม่ต้องสร้างบัญชี)

1. Receive invite link (email or shared by patient/doctor)
2. Click link → Guest Join page (`/guest-join/:meetingId`)
3. Enter display name and **email address** (no login required)
4. Click **"ขอเข้าร่วม" (Request to Join)** → enter Lobby
5. Doctor approves → enters meeting
6. If rejected: red screen with **"แพทย์ไม่อนุญาตให้เข้าร่วม" (Doctor denied access)**

> ⏱️ **Lobby Timeout:** After 5 minutes waiting in the lobby without doctor approval, a yellow warning banner appears: *"คุณรออยู่ใน Lobby นานกว่า 5 นาที"* with a **"กลับหน้าแรก" (Return Home)** button. The guest may continue waiting or return to the home page.

---

### 7.5 During Meeting Features — ฟีเจอร์ระหว่างประชุม

- 📹 Video/audio for all participants (camera/mic ON by default, toggleable)
- 💬 Text chat (always available, all messages captured)
- 📱 Screen sharing for medical images
- 🎙️ Transcript streaming (doctor-controlled — see [Section 9](#9-meeting-recording--transcription--ระบบบันทึกและถอดเสียง))
- Up to 8 participants recommended

![Meeting Controls](../screenshots/meeting-recording/MR04-meeting-room-controls.png)

---

### 7.6 Meeting End — จบการประชุม

1. Doctor clicks **"วางสาย" (Hang Up)**
2. All participants disconnected
3. AI processing begins automatically (see [Section 8](#8-ai-features--gemini--ฟีเจอร์-ai))

![Meeting Ended](../screenshots/workflow/video-meeting/WF16-meeting-ended-ai-summary.png)

---

## 8. AI Features & Gemini — ฟีเจอร์ AI

### 8.1 Post-Meeting AI Pipeline — AI สรุปหลังประชุม (อัตโนมัติ)

After a meeting ends, the AI pipeline runs automatically:
- **Input:** Full transcript + all chat messages + video metadata + patient PHR/EMR
- **Output:** SOAP summary (Thai), CDS recommendations, Patient Instruction Sheet draft
- For meetings > 30 min: split into 30-minute sections with separate summaries
- All outputs marked `requiresValidation: true` — doctor must approve

---

### 8.2 AI SOAP Summary — สรุป SOAP

The AI generates a structured Thai-language SOAP note:

- 🎯 อาการสำคัญ (Chief Complaint)
- 📝 อาการที่พบ (Presenting Symptoms)
- 🔍 การสืบค้น/ตรวจเพิ่มเติม (Investigation)
- 📋 การประเมินเบื้องต้น (Assessment)
- 💊 คำแนะนำการรักษา (Treatment Recommendations)
- 📅 นัดติดตาม (Follow-up Schedule)
- 🚩 อาการเตือน (Red Flags)
- 🏠 คำแนะนำไลฟ์สไตล์ (Lifestyle Recommendations)

![AI SOAP Summary](../screenshots/meeting-recording/MR06-ai-summary-soap.png)

---

### 8.3 Doctor Validation (Man-in-the-Loop) — แพทย์ตรวจสอบ

Doctor reviews AI output with 4 actions:

| Action | Description |
|--------|-------------|
| ✅ **Approve** | Accept → locks EMR → sends to patient |
| ✏️ **Edit** | Modify sections before approval |
| 🔄 **Regenerate** | AI regenerates with refined context |
| ❌ **Reject** | Discard AI → write manually |

![Post-Meeting Actions](../screenshots/meeting-recording/MR07-post-meeting-actions.png)

> 🔒 **Security:** ผู้ป่วยจะไม่ได้รับผลสรุป AI โดยตรง — แพทย์ต้องตรวจสอบและอนุมัติทุกครั้ง

---

### 8.4 Patient Instruction Sheet — ใบคำแนะนำผู้ป่วย

Auto-generated after doctor approves AI summary:

- วินิจฉัย (Diagnosis in simple Thai)
- ยาที่ได้รับ (Medications with dosage)
- การปฏิบัติตัว (Self-care instructions)
- อาการเตือน (Warning signs to watch for)
- นัดติดตาม (Follow-up schedule)

Doctor validates before sending → patient downloads as PDF.

---

### 8.5 Clinical Decision Support (CDS) — ระบบสนับสนุนการตัดสินใจ

| Feature | Description |
|---------|-------------|
| Differential Diagnosis | AI suggests possible diagnoses |
| Lab Tests | Suggested lab tests and imaging |
| Drug Interactions | Drug interaction alerts |
| Dosage Alerts | Dosage/allergy contraindication checks |
| Guidelines | Clinical guideline references (2024-2025) |

---

### 8.6 AI Doctor (Patient Portal) — หมอ AI

- Chat with Gemini AI for general health advice
- References your PHR data for personalized answers
- Multi-turn conversation, save/browse sessions
- NOT a medical diagnosis — always consult a real doctor

![AI Doctor](../screenshots/cloud/patient-portal/patient-07-ai-doctor.png)

---

### 8.7 Gemini AI Studio (Doctor Portal) — AI Studio สำหรับแพทย์

Doctors access advanced AI tools:
- Diagnosis / differential diagnosis
- Treatment plan generation
- Document analysis (PDF lab reports, images)
- Patient history summary

---

### 8.8 Cost — ต้นทุน

| Service | Cost |
|---------|------|
| Jitsi Meet | **$0** (FREE) |
| Web Speech API | **$0** (FREE) |
| Gemini AI | ~$0.001/1K tokens |
| **Total per 15-min consultation** | **~$0.01-0.05** |

---

## 9. Meeting Recording & Transcription — ระบบบันทึกและถอดเสียง

### 9.1 Recording — การบันทึก

- Browser-based local recording (Jitsi built-in, FREE)
- Doctor (HOST) starts/stops recording
- Format: WebM, max 200MB
- Recording uploaded to storage after meeting ends

---

### 9.2 Real-Time Transcription — การถอดเสียงแบบเรียลไทม์

Doctor controls transcription during the meeting:

1. Doctor clicks **"▶ Start Transcription"**
2. Web Speech API begins listening (FREE, browser-based)
3. Real-time transcript appears in bottom panel
4. Speaker labels: 👨‍⚕️ Doctor / 🧑 Patient / 👥 Guest
5. Interim text shown with yellow pulsing background
6. Doctor can **⏸ Pause** / **▶ Resume** / **⏹ Stop** anytime
7. Language toggle: Thai (th-TH) ↔ English (en-US)
8. Transcript segments saved to database continuously

![Transcript Diarization](../screenshots/meeting-recording/MR05-transcript-diarization.png)

> 📌 **Note:** เฉพาะแพทย์ (HOST) เท่านั้นที่ควบคุมการถอดเสียงและการบันทึก — ผู้ป่วยไม่สามารถเริ่ม/หยุดได้

---

### 9.3 Post-Meeting Processing — การประมวลผลหลังประชุม

1. Full transcript compiled from all segments
2. All chat messages merged with transcript
3. Combined input sent to Gemini AI for SOAP summary generation
4. For long meetings (>30 min): 30-minute sectioned summaries

![Meeting History](../screenshots/meeting-recording/MR08-meeting-history.png)

---

## 10. Notifications — ระบบแจ้งเตือน

### 10.1 Notification Channels — ช่องทางแจ้งเตือน

| Channel | Description |
|---------|-------------|
| **In-App** | 🔔 Bell icon in header — dropdown list |
| **Email** | Thai-language email with action details |
| **Push** | Browser push notifications (real-time) |

---

### 10.2 Notification Types — ประเภทการแจ้งเตือน

| Category | Events |
|----------|--------|
| **Appointments** | Requested, confirmed (+ meeting link), declined, cancelled, assigned, rescheduled, reminders (24h, 1h) |
| **Video Meeting** | Link ready, link failed, meeting started, reminder (15 min) |
| **Medical Records** | EMR signed, EMR ready for review, prescription ready, lab results ready |
| **System** | Account verified, password reset, system maintenance |

---

### 10.3 Automatic Reminder Schedule — ตารางแจ้งเตือนอัตโนมัติ

| Timing | Channel | Thai Message |
|--------|---------|-------------|
| 24 hours before | Email + In-App | พรุ่งนี้คุณมีนัดพบแพทย์ |
| 1 hour before | Push + In-App | อีก 1 ชั่วโมง ถึงเวลานัดหมาย |
| 15 min before | Push + In-App | เตรียมพร้อม! ลิงก์ประชุมพร้อมแล้ว |
| Real-time | Push | แพทย์เริ่มห้องประชุมแล้ว คลิกเข้าร่วม |

> 📌 **Tip:** ตั้งค่าการแจ้งเตือนได้ที่ Settings → Notifications — เปิด/ปิดได้ตามประเภทและช่องทาง

---

## 11. Content & Resource Management — การจัดการเนื้อหา

### 11.1 Medical Content (Health Library) — คลังความรู้สุขภาพ

| Role | Can Do |
|------|--------|
| **Patient** | Read published articles only |
| **Doctor** | Create, edit, delete own articles, publish (direct or via approval) |
| **Admin** | Full CRUD + approve/reject submissions + audit log |

**Content Lifecycle:**
```
📝 Draft → 📤 Pending → 👑 Admin Reviews → ✅ Published (visible in Health Library)
                                          → ❌ Rejected → Doctor revises → resubmit
```

![Patient Health Library](../screenshots/cloud/patient-portal/patient-08-health-library.png)

---

### 11.2 Doctor: Create Article — แพทย์: สร้างบทความ

1. Click **"สร้างบทความ" (Create Article)**
2. Enter: Title (Thai required), Content (Thai required), Category, Tags
3. Choose: **Save as Draft** or **Submit for Approval**
4. If submitted → enters Admin approval queue

![Doctor Medical Content](../screenshots/cloud-workflows/content-management/WC21-doctor-medical-content.png)

---

### 11.3 Clinical Resources (Doctor-Only) — ทรัพยากรทางคลินิก

| Role | Can Do |
|------|--------|
| **Doctor** | Create, edit own, submit for approval |
| **Admin** | Approve/reject, view all including pending |
| **Patient** | ❌ No access |

**Categories:** Diagnosis Guidelines, Treatment Protocols, Pharmacology, Radiology, Laboratory, Pathology, Emergency Medicine, Nursing Guidelines, Research Papers, Case Studies

**Resource Types:** guideline, protocol, research, template, reference

![Clinical Resources](../screenshots/cloud/doctor-portal/doctor-09-clinical-resources.png)

> 🔒 **Note:** Clinical resources ALWAYS require admin approval before being published

---

## 12. Security & PDPA — ความปลอดภัยและ PDPA

### 12.1 PDPA Consent Management — การจัดการความยินยอม PDPA

Navigate to **"PDPA & หนังสือแสดงเจตนา"** → **"PDPA"** tab:

- Toggle ON/OFF per data type: Demographics, Medical History, Medications, Allergies, Lab Results, Prescriptions, Vital Signs, PHR, EMR, Living Will
- Set different sharing per doctor
- Revoke consent at any time

![PDPA Consent](../screenshots/cloud/patient-portal/patient-11-pdpa.png)

---

### 12.2 Living Will — พินัยกรรมชีวิต

Navigate to **"PDPA & หนังสือแสดงเจตนา"** → **"พินัยกรรมชีวิต"** tab:

**4-step wizard:**
1. **Step 1:** Primary Proxy (name, relationship, contact)
2. **Step 2:** Alternate Proxy (optional)
3. **Step 3:** Treatment Preferences (CPR, ventilator, tube feeding, dialysis, antibiotics, pain management, organ donation)
4. **Step 4:** Digital Signature + toggle doctor sharing

**Sharing Options:**
- 🔒 Keep Private — only you can see
- 🌐 Share with authorized doctors — doctors with treatment history or admins

**Status:** Draft → Active (signed) → Revoked

![Living Will](../screenshots/cloud-workflows/living-will/WC31-patient-living-will.png)

---

### 12.3 Security Features — ความปลอดภัย

| Feature | Detail |
|---------|--------|
| Password Hashing | bcrypt (all portals) |
| Account Lockout | 5 failed attempts → locked 30 minutes |
| Rate Limiting | Login: 10/15min, Password Reset: 5/hr, API: 500/15min |
| Session Security | 64-char crypto token, IP binding, user-agent tracking |
| JWT Authentication | Cross-service JWT with role verification |
| Man-in-the-Loop | Doctor validates ALL AI outputs before patient delivery |
| Audit Logging | All access to Living Will + PHR + EMR logged |
| OWASP Headers | Helmet.js (CSP, XSS protection, HSTS, X-Frame) |
| TypeScript Safety | Zero `error: any` — strict type narrowing |
| SonarQube | Clean — no security vulnerabilities |

---

### 12.4 Role-Based Access Control (RBAC) — การควบคุมสิทธิ์

| Role | Portal | Access |
|------|--------|--------|
| **Patient** | Patient Portal | Own data only — PHR, appointments, AI, health library |
| **Doctor** | Doctor Portal | Treated patients' data (per PDPA), EMR, prescriptions |
| **Admin** | Doctor Portal + Admin | System-wide — doctor management, content approval, all appointments |

> 🔒 ผู้ป่วยไม่สามารถเข้า Doctor Portal ได้ — API ตอบ 401 ทุกครั้ง

---

## 13. Troubleshooting & FAQ — คำถามที่พบบ่อย

### 13.1 Login Issues — ปัญหาการเข้าสู่ระบบ

| Problem | Solution |
|---------|----------|
| Cannot log in as doctor | Check if your account has been approved by admin ([Section 6](#6-doctor-onboarding-workflow--กระบวนการลงทะเบียนแพทย์ใหม่)) |
| Account locked | Wait 30 minutes after 5 failed login attempts |
| Session expired | Re-login — sessions expire after 30 minutes |
| Forgot password | Use "Forgot Password" link → reset via email (link expires in 15 min) |

---

### 13.2 Appointment Issues — ปัญหาการนัดหมาย

| Problem | Solution |
|---------|----------|
| No meeting link | Meeting link is generated when doctor confirms — check appointment status |
| Meeting link failed | Fallback notification sent — contact admin |
| Can't book appointment | Ensure profile is complete — fill symptoms and select date/time |
| Doctor declined | Appointment returns to pool — admin will re-assign another doctor |

---

### 13.3 Video Meeting Issues — ปัญหาการประชุมวิดีโอ

| Problem | Solution |
|---------|----------|
| Camera/mic not working | Allow browser permissions — test on pre-join screen |
| Stuck in lobby | Doctor must be in the meeting to admit you — wait for doctor |
| Guest can't join | Ensure correct invite link and enter a display name |
| Video quality poor | Check internet speed — reduce camera resolution if needed |

---

### 13.4 AI & Summary Issues — ปัญหา AI

| Problem | Solution |
|---------|----------|
| AI summary not generated | Requires transcript + chat data — ensure transcription was started during meeting |
| Summary in wrong language | Doctor can toggle Thai ↔ English during transcription |
| AI Doctor not responding | Check internet connection — Gemini API must be reachable |

---

### 13.5 Notification Issues — ปัญหาการแจ้งเตือน

| Problem | Solution |
|---------|----------|
| Not receiving notifications | Check Settings → Notifications — ensure toggle is ON |
| No email received | Check spam folder — verify registered email is correct |
| Push notifications blocked | Allow browser notifications in browser settings |

---

## Appendix — ภาคผนวก

### Platform Architecture — สถาปัตยกรรมระบบ

| Service | Technology | Port |
|---------|-----------|------|
| **Patient Portal** | React + TypeScript + Vite | 3005 |
| **Doctor Portal** | React + TypeScript + Vite | 3010 |
| **Meeting Server** | Express + Socket.IO | 3020 |
| **Database** | PostgreSQL 18 + pgvector | 5433 |

**External Services:**
- Jitsi Meet — Video Conferencing (FREE)
- Google Gemini AI — Chat, CDS, SOAP Summaries
- Web Speech API — FREE Live Transcription
- Google Maps — Healthcare Facilities Map
- Google Cloud Run — Container Hosting (Production)

### Test Coverage — ความครอบคลุมการทดสอบ

| Category | Tests | Files |
|----------|-------|-------|
| Unit Tests (Vitest) | 2,013 | 58 |
| E2E Tests (Playwright) | 1,149 | 33 |
| UI Tests (Playwright) | 516 | 14 |
| **Total** | **3,678** | **105** |

**Test Run Results (March 29, 2026):**
- Unit: 2,013 passed (100%)
- E2E: 1,149 passed (100%)
- UI: 351 passed, 50 skipped, 9 failed (pre-existing infra), 106 did not run
- **638 screenshots** captured across all portal pages and workflows

---

*User Guide Version 1.5.10 • 2,013 Unit Tests + 1,149 E2E Tests + 516 UI Tests from 105 test files • 638 screenshots*

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
Guest/Patient enters link → Enter name + email → Wait in Lobby → Doctor admits/rejects → Enter/Exit room
```

**For Doctors:**
- See list of waiting participants (name, email, type: patient/guest/admin)
- ✓ **Admit** — Participant enters meeting immediately
- ✓ **Admit All (อนุญาตทั้งหมด)** — Admit all waiting participants at once
- ✗ **Reject** — Participant sees red screen in Thai + exit button

### 7.4 Guest Join — No Account Required

Patients can send `/guest-join/:meetingId` link to family/caregivers:

1. Open link → Guest Join page shows meeting name
2. Enter name and **email address** (no login required)
3. Test camera/mic → click Join → enter Lobby
4. ⏱️ After **5 minutes** waiting — yellow warning banner appears with "กลับหน้าแรก" (Return Home) button
5. When admitted → enter Jitsi room with settings:
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

*This user guide covers v1.5.10 with 2,013 unit tests + 1,149 E2E + 516 UI tests (638 screenshots) from 105 test files.*
