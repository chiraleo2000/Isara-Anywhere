# 🏠 Patient Portal — Dashboard Page

**Version:** v1.4.7
**Route:** `/` (index)
**Component:** `src/pages/dashboard/DashboardPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** สวัสดี, {ชื่อผู้ป่วย} 👋

---


## 1. Purpose

Central hub for patient activities — quick access to key features, upcoming appointments, notifications, health overview, and AI assistant.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🌈 Gradient Welcome Header                                             │
│  "สวัสดี, นายสมชาย 👋"  ·  Avatar                                       │
├────────────────────────────────┬────────────────────────────────────────┤
│  LEFT COLUMN (2/5)             │  RIGHT COLUMN (3/5)                   │
│                                │                                        │
│  ┌──────────────────────┐     │  ┌────────────────────────────────┐   │
│  │  ⚡ Quick Actions      │     │  │  🏥 Health Studio               │   │
│  │  ┌────┐ ┌────┐       │     │  │  [ภาพรวม] [ผลการรักษา] [เนื้อหา] │   │
│  │  │ 📅 │ │ 🤖 │       │     │  │                                │   │
│  │  │Book│ │ AI │       │     │  │  Tab 1: Health Overview         │   │
│  │  └────┘ └────┘       │     │  │  - BP / HR / BMI / Visits      │   │
│  │  ┌────┐ ┌────┐       │     │  │  - AI Insight prompt           │   │
│  │  │ 💊 │ │ 📚 │       │     │  │  - Quick links                 │   │
│  │  │PHR │ │Lib │       │     │  │                                │   │
│  │  └────┘ └────┘       │     │  │  Tab 2: Treatment Results      │   │
│  └──────────────────────┘     │  │  - EMR/Appointment history     │   │
│                                │  │                                │   │
│  ┌──────────────────────┐     │  │  Tab 3: Health Content         │   │
│  │  📅 Upcoming Appts    │     │  │  - Medical articles            │   │
│  │  (max 3 shown)       │     │  └────────────────────────────────┘   │
│  │  ├─ Dr. สมชาย 09:00  │     │                                        │
│  │  │  [Join Meeting]   │     │  ┌────────────────────────────────┐   │
│  │  ├─ Dr. สมศรี 14:00  │     │  │  🤖 AI Health Chat (sticky)     │   │
│  │  └──────────────────  │     │  │  Quick questions + chat        │   │
│  │                       │     │  │  [expand/minimize]             │   │
│  │  📊 Notifications     │     │  └────────────────────────────────┘   │
│  │  Pending: 2           │     │                                        │
│  └──────────────────────┘     │                                        │
└────────────────────────────────┴────────────────────────────────────────┘
```

---


## 3. Features & Actions


### 3.1 Quick Actions (4 cards)

| Card | Icon | Thai Label | Action |
| ---- | ---- | ---------- | ------ |
| Book Appointment | 📅 | นัดหมายแพทย์ | Navigate to `/book-appointment` |
| AI Doctor | 🤖 | ปรึกษา AI | Navigate to `/ai-doctor` |
| Health Records | 💊 | ระเบียนสุขภาพ | Navigate to `/phr` |
| Health Library | 📚 | คลังความรู้ | Navigate to `/health-library` |


### 3.2 Upcoming Appointments


- Shows up to 3 non-cancelled appointments sorted by date


- Each card displays: Doctor name, specialty, date/time, status


- **Join Meeting** button for confirmed telehealth appointments (opens Jitsi)


- **View Details** link to appointment detail page


### 3.3 Notifications Summary


- Count of pending appointment responses


- Quick link to full notification list


### 3.4 Health Studio Widget (HealthStudio component)


#### Tab 1: ภาพรวมสุขภาพ (Health Overview)

| Stat Card | Data Source | Display |
| --------- | ----------- | ------- |
| Blood Pressure | Latest PHR vitals | mmHg value |
| Heart Rate | Latest PHR vitals | bpm value |
| BMI | Height + weight calculation | kg/m² value |
| Treatment Count | Appointment history | Visit count |


- AI Health Insight prompt → navigates to AI Doctor


- Quick links to PHR and AI Doctor pages


#### Tab 2: ผลการรักษา (Treatment Results)


- TreatmentResults component with time filters (5 visits, 6mo, 1yr, all)


- EMR cards with diagnosis, treatment plan, medications


- Appointment cards with expandable details


#### Tab 3: เนื้อหาสุขภาพ (Health Content)


- MedicalContent widget with search, categories, article previews


### 3.5 AI Health Chat (AIHealthChat component — sticky)


- Compact chat widget with expand/minimize


- Quick question buttons (headache, heart-healthy foods, stress reduction)


- Persistent chat history across sessions


- 30-second auto-clear for inactive


### 3.6 Latest Appointment Result Widget (Meeting Outcome)

```text
┌── 📋 ผลการตรวจล่าสุด (Latest Consultation Result) ───────────────┐
│                                                                   │
│  📅 22 ม.ค. 2569 — นพ. ทดสอบ ระบบ (อายุรกรรม)                     │
│  📹 Telehealth · เสร็จสิ้น                                         │
│                                                                   │
│  🏥 วินิจฉัย: ความดันโลหิตสูง ระยะที่ 1                             │
│  💊 ยา: Amlodipine 5mg วันละ 1 เม็ด หลังอาหารเช้า                  │
│  📋 แผนการรักษา: ปรับยา, ลดเค็ม, ออกกำลังกาย                       │
│  📅 นัดติดตาม: 22 ก.พ. 2569                                       │
│  ⚠️ เฝ้าระวัง: ปวดศีรษะรุนแรง, ตาพร่ามัว, เจ็บหน้าอก              │
│                                                                   │
│  [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]  [ดูรายละเอียดทั้งหมด →]       │
└───────────────────────────────────────────────────────────────────┘
```


## Widget Details

| Field | Data Source | Description |
| ----- | ----------- | ----------- |
| วินิจฉัย (Diagnosis) | EMR `diagnosis` | Patient-friendly Thai diagnosis |
| ยา (Medications) | EMR `prescriptions` | Medication name + dosage + instructions (วิธีกินยา) |
| แผนการรักษา (Treatment Plan) | EMR `treatment_plan` | Summary of treatment actions |
| นัดติดตาม (Follow-up) | `appointments` table | Next scheduled follow-up date |
| อาการเฝ้าระวัง (Warning Signs) | EMR `warning_signs` | Red flags patient should watch for |
| เอกสารคำแนะนำ (Instruction Sheet) | Generated PDF | Downloadable Patient Instruction Sheet |


## What Patient SEES in this widget


- ✅ Chief complaint and diagnosis (patient-friendly Thai)


- ✅ Treatment plan summary


- ✅ Medications with instructions (วิธีกินยา)


- ✅ Follow-up schedule


- ✅ Warning signs to watch for


- ✅ PDF download link for Patient Instruction Sheet


## What Patient does NOT see


- ❌ Internal doctor notes


- ❌ Raw AI outputs


- ❌ Doctor-to-doctor communications


- ❌ CDS alerts (internal)


### 3.7 Next Appointment Reminder with Meeting Link

```text
┌── ⏰ นัดหมายถัดไป (Next Appointment) ────────────────────────────┐
│                                                                   │
│  🟢 ยืนยันแล้ว                                                     │
│  👨‍⚕️ นพ. สมชาย แพทย์ · เวชศาสตร์ทั่วไป                             │
│  📅 25 ม.ค. 2569 · ⏰ 14:00                                       │
│  📹 Telehealth                                                    │
│                                                                   │
│  📹 ลิงก์ประชุม: พร้อมใช้งาน                                       │
│  ⏰ ห้องประชุมจะเปิดก่อนเวลานัด 10 นาที                            │
│                                                                   │
│  [📹 เข้าร่วมประชุม]  [📋 คัดลอกลิงก์]  [👥 เชิญญาติ]             │
│  [📆 Add to Calendar]  [ดูรายละเอียด →]                            │
└───────────────────────────────────────────────────────────────────┘
```


## Features


- Shows the nearest confirmed appointment prominently on dashboard


- Meeting link available for confirmed telehealth appointments


- Copy link button for easy sharing with relatives/friends


- Guest invite button → share link via LINE, email, or SMS


- Guests join via link without needing Isara account


- Countdown timer appears when appointment is within 1 hour


- "เข้าร่วมประชุม" button activates 10 minutes before scheduled time


### 3.8 Health Notifications Banner (New Results from Doctor)

```text
┌── 🔔 แจ้งเตือนสุขภาพ (Health Notifications) ────────────────────┐
│                                                                   │
│  🆕 แพทย์ส่งผลการตรวจสำหรับนัดหมาย 22 ม.ค. 2569                  │
│     [ดูผลการตรวจ] [📥 ดาวน์โหลด PDF]                              │
│                                                                   │
│  🆕 เอกสารคำแนะนำผู้ป่วยพร้อมดาวน์โหลด                            │
│     [📥 ดาวน์โหลดเอกสารคำแนะนำ]                                   │
│                                                                   │
│  📋 นัดติดตามผล 22 ก.พ. 2569 กับ นพ. ทดสอบ ระบบ                  │
│     [ดูนัดหมาย]                                                    │
└───────────────────────────────────────────────────────────────────┘
```


## Notification Types Shown on Dashboard

| Notification | Thai Message | Action |
| ------------ | ------------ | ------ |
| Results Ready | แพทย์ส่งผลการตรวจ | Navigate to appointment results |
| PDF Ready | เอกสารคำแนะนำพร้อมดาวน์โหลด | Download Patient Instruction Sheet |
| Follow-up Reminder | นัดติดตามผลวันที่... | Navigate to appointment detail |
| Meeting Soon | การนัดหมายจะเริ่มใน 15 นาที | Show join meeting button |

---


## 4. Workflows


### Workflow 1: View Dashboard on Login

```text
Step 1: Patient logs in successfully
Step 2: Redirected to Dashboard (/)
Step 3: System fetches dashboard data:
        - GET /api/appointments (for upcoming)
        - GET /api/phr/{userId}/vitals (for health stats)
        - GET /api/notifications/{userId} (for alerts)
Step 4: Quick Actions, upcoming appointments, health stats render
Step 5: HealthStudio loads with default Overview tab
Step 6: AIHealthChat loads latest session
```


### Workflow 2: Join Upcoming Meeting

```text
Step 1: Patient sees confirmed telehealth appointment on dashboard
Step 2: Clicks "Join Meeting" button
Step 3: Opens Jitsi Meet URL in new tab
Step 4: Patient enters lobby and waits for doctor admission
```


### Workflow 3: View Latest Meeting Results on Dashboard

```text
Step 1: Doctor completes consultation and creates EMR
Step 2: Patient receives notification: "แพทย์ส่งผลการตรวจ"
Step 3: Dashboard auto-refreshes or patient navigates to dashboard
Step 4: Latest Appointment Result widget shows:
        - Diagnosis (patient-friendly Thai)
        - Treatment plan summary
        - Medications with instructions (วิธีกินยา)
        - Follow-up date
        - Warning signs to watch for
Step 5: Patient clicks "ดาวน์โหลดเอกสารคำแนะนำ" → Downloads PDF
        - PDF contains: diagnosis, medications, instructions,
          follow-up date, warning signs (all in Thai)
Step 6: Patient clicks "ดูรายละเอียดทั้งหมด" → navigates to /appointments/:id
```


### Workflow 4: Share Meeting Link from Dashboard

```text
Step 1: Patient sees upcoming confirmed appointment on dashboard
Step 2: Clicks "👥 เชิญญาติ" (Invite Relatives)
Step 3: Share dialog with options:
        - 📋 Copy link to clipboard
        - 📱 Share via LINE
        - ✉️ Share via email
Step 4: Relative/friend receives Jitsi meeting link
Step 5: Guest clicks link → enters LOBBY → doctor admits
Step 6: No Isara account needed for guests
```


### Workflow 5: Quick AI Consultation

```text
Step 1: Patient sees AI Health Chat widget (bottom-right)
Step 2: Clicks quick question or types own question
Step 3: POST /api/ai/chat → Gemini processes with medical context
Step 4: AI response displayed in chat bubble
Step 5: Patient can continue conversation or close
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Fetch upcoming appointments |
| GET | `/api/phr/{userId}/vitals` | Fetch latest vital signs |
| GET | `/api/notifications/{userId}` | Fetch notifications |
| POST | `/api/ai/chat` | AI health chat message |
| GET | `/api/ai/chat/sessions` | Load chat session list |
| GET | `/api/content/medical` | Load health content |
| GET | `/api/appointments/latest-result` | Get latest completed appointment result |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/meeting-link` | Get meeting link for upcoming appointment |
| POST | `/api/appointments/:id/share-link` | Generate shareable guest invite link |

---


## 6. Sub-Components

| Component | Purpose |
| --------- | ------- |
| `HealthStudio` | 3-tab health overview widget |
| `AIHealthChat` | Compact AI chat widget |
| `LatestAppointmentResult` | Most recent completed appointment |
| `TreatmentResults` | Treatment history with filters |
| `MedicalContent` | Health article browser |
| `VitalsChart` | Sparkline vital signs chart |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Quick Action: Book | `/book-appointment` |
| Quick Action: AI | `/ai-doctor` |
| Quick Action: PHR | `/phr` |
| Quick Action: Library | `/health-library` |
| Upcoming appointment card | `/appointments/:id` |
| Join Meeting button | Jitsi Meet (external) |
| AI Insight link | `/ai-doctor` |
| Health Overview links | `/phr`, `/ai-doctor` |

---


## 8. AI Agent Improvement Opportunities


- **Personalized dashboard**: AI-curated content based on patient conditions


- **Proactive alerts**: AI detect anomalies in vital trends and surface warnings


- **Smart scheduling**: AI suggest optimal follow-up timing


- **Health goal tracking**: AI-driven health improvement plans on dashboard


- **Medication reminders**: AI-timed medication alerts integrated into dashboard

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT | Upcoming appointments for patient |
| notifications | SELECT | Unread notification count |
| medical_content | SELECT | Recent published health articles |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/dashboard | GET | SELECT appointments, notifications, medical_content for patient |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
