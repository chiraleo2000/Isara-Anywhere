# 🏥 Patient Portal — Architecture & Navigation Overview

**Version:** 3.2.0
**Last Updated:** February 10, 2026
**Portal URL:** `localhost:3005`
**Component:** `App.tsx` → `MainLayout.tsx`

> **BMS Smart Hospital parity (v1.7.53).** Inspired by the
> [BMS AI & Telemedicine demo](https://www.youtube.com/watch?v=ftivZGZsm5k) (functional parity, not a UI clone).
> Patients join consultations only via the in-app real Jitsi room at `/meeting/:appointmentId`
> (`PatientMeetingRoom.tsx`) — full-screen `100dvh`, responsive on phone/tablet/desktop. The doctor
> hosts; the patient waits in the Izara lobby and is admitted by the doctor (no external `meet.jit.si`
> tabs, no lobby bypass). Live transcript is view-only; the AI SOAP summary appears after the doctor approves it.


## มาตรฐานเอกสาร (รายงานภาษาไทย)

เอกสารชุดนี้จัดทำให้สอดคล้อง**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข (โครงสร้าง: วัตถุประสงค์ → ขอบเขต → ขั้นตอน → ผลลัพธ์ → ข้อควรระวัง → อ้างอิง)

| รายการ | ค่าที่ใช้ |
|--------|-----------|
| เอกสาร Word / รายงาน PDF | **TH Sarabun New** — เนื้อหา **16 pt**, หัวข้อระดับ 1 **18 pt**, หัวข้อระดับ 2 **16 pt** (ตัวหนา), ชื่อเรื่อง **22 pt**, ระยะบรรทัด **1.15**, จัดชิดซ้าย |
| สไลด์นำเสนอ PowerPoint | **FC Iconic** — หัวข้อสไลด์ **32 pt**, หัวข้อรอง **22 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |
| ตัวเลขและวันที่ | ใช้ พ.ศ. ในข้อความไทย; คั่นหลักพันแบบไทยเมื่อจำเป็น |
| อ้างอิงคู่มือ | `docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx`, `docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx`, `docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx` |
| เอกสารปฏิบัติการ Production | `docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` |
| สร้าง/อัปเดตคู่มือ | `python scripts/build-portal-user-guides.py` |
| อัปเดตหน้ากระบวนการ | `python scripts/enrich-process-pages.py --force-steps` |
| ล้างข้อมูลทดสอบ (ไม่ re-seed demo) | `npm run cleanup:cloud-test-only` |
| การทดสอบอัตโนมัติ | Playwright Groups A–Q + Vitest — `tests/PROCESS_COVERAGE_MATRIX.md` |
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-9** (Word TH Sarabun New 16 pt / PPT FC Iconic — ขั้นตอน 8–12 รายการ + คำอธิบายเชิงรายงานทุกหน้า) |
| โครงสร้างเทคนิค (สถาปัตยกรรม) | `docs/technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx`, `docs/technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx`, `docs/diagrams/diagrams.drawio` |
| สร้างเอกสารโครงสร้างเทคนิค | `python scripts/build-technical-architecture-docs.py` |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

---
## UI Controls Inventory

| # | Control | testid | Action | Expected | Screenshot |
|---|---------|--------|--------|----------|------------|
| 1 | Data Testid | `data-testid` | click | Documented control | U-data-testid |
| 2 | Confirmed | `confirmed` | click | Documented control | U-confirmed |
| 3 | Appointmentid | `appointmentId` | click | Documented control | U-appointmentId |
| 4 | Meetingid | `meetingId` | click | Documented control | U-meetingId |
| 5 | Success | `success` | click | Documented control | U-success |
| 6 | Message | `message` | click | Documented control | U-message |
| 7 | Code | `code` | click | Documented control | U-code |

## 1. Technology Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS (dark/light mode) |
| Routing | React Router v6 |
| Icons | Lucide React |
| Language | Bilingual Thai (primary) / English |
| State | React Context (AuthContext, SettingsContext) |
| Backend | Express.js + PostgreSQL |
| AI | Google Gemini 2.5 Flash Lite |

---


## 2. Route Map

| Route | Page Component | Thai Title | Access |
| ----- | -------------- | ---------- | ------ |
| `/login` | LoginPage | เข้าสู่ระบบ | Public |
| `/register` | RegisterPage | สมัครสมาชิก | Public |
| `/reset-password` | ResetPasswordPage | รีเซ็ตรหัสผ่าน | Public |
| `/` | DashboardPage | แดชบอร์ด | 🔒 Auth |
| `/appointments` | AppointmentListPage | นัดหมายของฉัน | 🔒 Auth |
| `/book-appointment` | BookAppointmentPage | ขอนัดหมายแพทย์ | 🔒 Auth |
| `/appointments/:id` | AppointmentDetailPage | รายละเอียดนัดหมาย | 🔒 Auth |
| `/phr` | PHRPage | ระเบียนสุขภาพ | 🔒 Auth |
| `/ai-doctor` | AIDoctorPage | AI สุขภาพ | 🔒 Auth |
| `/health-library` | MedicalContentLibrary | คลังความรู้สุขภาพ | 🔒 Auth |
| `/map` | MapPage | สถานพยาบาลใกล้เคียง | 🔒 Auth |
| `/pdpa` | PDPAPage | ความเป็นส่วนตัว | 🔒 Auth |
| `/living-will` | LivingWillPage | พินัยกรรมชีวิต | 🔒 Auth |
| `/profile` | ProfilePage | โปรไฟล์ | 🔒 Auth |
| `/settings` | SettingsPage | ตั้งค่า | 🔒 Auth |
| `/timeline` | TimelinePage | ประวัติการรักษา | 🔒 Auth |

---


## 3. Layout Structure

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          MAIN LAYOUT                                     │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │  Header: NotificationBell · Theme · Language · Avatar    │
│   Sidebar    ├──────────────────────────────────────────────────────────┤
│   (64px)     │                                                          │
│              │                                                          │
│  🏠 Home     │              Page Content (Outlet)                       │
│  📅 Appts    │                                                          │
│  🤖 AI Doc   │                                                          │
│  📚 Library  │                                                          │
│  💊 PHR      │                                                          │
│  📋 Timeline │                                                          │
│  🗺️ Map      │                                                          │
│  🔒 PDPA     │                                                          │
│  ⚙️ Settings │                                                          │
│              │                                                          │
│  MiniMap     │                                                          │
│  Calendar    │                                                          │
│  User Info   │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```


### Mobile Layout


- Sidebar hidden behind hamburger menu


- Header: Hamburger · Logo · NotificationBell · Language · Avatar


- Full-width content area

---


## 4. Sidebar Components


### Navigation Items (9 items)

1. **🏠 หน้าหลัก** (Home) → `/`
2. **📅 นัดหมาย** (Appointments) → `/appointments`
3. **🤖 AI สุขภาพ** (AI Doctor) → `/ai-doctor`
4. **📚 คลังความรู้** (Health Library) → `/health-library`
5. **💊 ระเบียนสุขภาพ** (Health Records) → `/phr`
6. **📋 ประวัติการรักษา** (Timeline) → `/timeline`
7. **🗺️ สถานพยาบาล** (Nearby Healthcare) → `/map`
8. **🔒 PDPA & Living Will** → `/pdpa`
9. **⚙️ ตั้งค่า** (Settings) → `/settings`


### MiniMapWidget


- Compact healthcare facility types display (Hospital, Clinic, Pharmacy, Health Center)


- Click → navigates to full Map page


### MiniCalendar


- Monthly calendar with Thai/English month names


- Buddhist/Gregorian year support


- Today highlighted


- Previous/next month navigation


### User Info


- Avatar, name, email


- Link to Profile page


- Logout button

---


## 5. Authentication Flow

```text
[Unauthenticated] → /login → Enter email + password
                          → AuthContext.login() → POST /api/auth/login
                          → Success → Redirect to /
                          → Failure → Show error message

[Register] → /register → 2-step wizard → AuthContext.register()
                       → POST /api/auth/register → Immediate access

[Password Reset] → /login → "Forgot password" → Enter email
                 → POST /api/auth/request-password-reset
                 → Email with token → /reset-password?token=xxx
                 → POST /api/auth/reset-password
```

---


## 6. Global Features

| Feature | Implementation |
| ------- | -------------- |
| **Dark Mode** | SettingsContext toggle, Tailwind dark: classes |
| **Language** | Thai (default) / English toggle via SettingsContext |
| **Notifications** | NotificationBell with 30-second polling |
| **Scroll Restore** | ScrollToTop component on route change |
| **PWA** | Service worker registration, manifest.json |
| **PDPA Compliance** | Consent management on login, data access audit |

---


## 7. Cross-Page Navigation Map

```text
Dashboard ──→ Book Appointment ──→ Appointment List
    │              │                      │
    ├──→ AI Doctor │                      ├──→ Appointment Detail
    ├──→ PHR       │                      │       ├──→ Join Meeting (Jitsi)
    ├──→ Library   │                      │       └──→ Google Calendar
    │              │                      │
    └──→ Health Studio                    └──→ Book Another

Profile ←──→ Settings
PDPA ←──→ Living Will
Sidebar Map Widget ──→ Full Map Page
NotificationBell ──→ Appointment Detail / Meeting Join
```

---


## 8. AI Agent Improvement Opportunities

| Area | Current | Future Improvement |
| ---- | ------- | ------------------ |
| Navigation | Manual sidebar clicks | AI-guided navigation based on user intent |
| Appointment Booking | 3-step wizard | AI auto-fill from symptom description |
| Health Records | Manual data entry | AI extraction from uploaded documents |
| Notifications | Simple list | AI-prioritized smart notifications |
| Content | Manual browsing | AI-recommended content based on conditions |

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| users | SELECT/INSERT/UPDATE | Patient user accounts |
| sessions | INSERT/DELETE | Authentication session tokens |
| patient_profiles | SELECT/INSERT/UPDATE | Patient demographic and health profile |
| appointments | SELECT/INSERT/UPDATE | Appointment booking and management |
| doctors | SELECT | Available doctor list |
| doctor_schedules | SELECT | Doctor availability for booking |
| phr | SELECT/INSERT/UPDATE | Personal Health Records |
| vital_signs | SELECT/INSERT | Vital sign measurements |
| emr | SELECT | Electronic Medical Records (read-only for patients) |
| prescriptions | SELECT | Prescription history (read-only) |
| lab_orders | SELECT | Lab results (read-only) |
| ai_chat_history | SELECT/INSERT | AI health chat conversation logs |
| knowledge_base | SELECT | Medical knowledge base for RAG |
| medical_content | SELECT | Published health articles |
| notifications | SELECT/UPDATE | Notification records |
| push_subscriptions | SELECT/INSERT | Web push subscription endpoints |
| patient_consents | SELECT/INSERT/UPDATE | PDPA consent management |
| living_wills | SELECT/INSERT/UPDATE | Living will documents |
| living_will_versions | SELECT/INSERT | Living will version history |
| password_resets | INSERT/UPDATE | Password reset token management |


### Backend Server


- **Runtime:** Express.js TypeScript (index.ts, 16 route modules)


- **Port:** 3005


- **Database:** PostgreSQL izara_phase1


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| /api/auth/* | POST | users, sessions CRUD |
| /api/dashboard/* | GET | appointments, notifications, medical_content SELECT |
| /api/appointments/* | GET/POST | appointments CRUD |
| /api/phr/* | GET/POST | phr, vital_signs CRUD |
| /api/vital-signs/* | POST | vital_signs INSERT |
| /api/ai/health-chat | POST | ai_chat_history, knowledge_base |
| /api/content/articles | GET | medical_content SELECT |
| /api/consents/* | GET/POST/PUT | patient_consents CRUD |
| /api/phr/:id/living-will | GET/POST/PUT | living_wills, living_will_versions CRUD |
| /api/profile/* | GET/PUT | users, patient_profiles SELECT/UPDATE |
| /api/settings/* | GET/PUT | users preferences JSONB UPDATE |
| /api/timeline/* | GET | appointments, emr, prescriptions, lab_orders, vital_signs SELECT |
| /api/notifications/* | GET/PUT | notifications SELECT/UPDATE |


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **00 Patient Portal Overview** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

### ขอบเขตและบทบาท

ผู้ป่วยดำเนินการบนข้อมูลของตนเองเท่านั้น (JWT `role=patient`) — จองนัด เข้าร่วมประชุม ดู PHR/EMR ที่แพทย์เผยแพร่แล้ว
ลิงก์ Guest ต้องออกจาก **Patient Portal** เท่านั้น

### ลำดับความสัมพันธ์กับ workflow อื่น

1. **นัดหมาย** — สถานะ `confirmed` ก่อนเปิดวิดีโอ (`Processes/Appointment_Workflows.md`)
2. **ประชุม** — Izara Lobby → Jitsi → บันทึก → สรุป AI (`Processes/VIDEO_MEETING_JITSI_GEMINI.md`)
3. **บันทึกทางการแพทย์** — EMR / สั่งยา / แล็บ หลังแพทย์ตรวจสอบ AI

### การตรวจสอบคุณภาพ (QA)

| ลำดับ | รายการตรวจ | วิธี |
|------|------------|------|
| 1 | UI แจ้งเตือน | ไม่มี toast error / banner แดง |
| 2 | API | DevTools Network — status 2xx |
| 3 | ทดสอบอัตโนมัติ | Playwright + data-testid ใน tests/SELECTORS.md |
| 4 | เอกสาร | Word TH Sarabun New 16 pt / PPT FC Iconic จาก build-portal-user-guides.py |

### ผลลัพธ์ที่คาดหวังหลังใช้งานหน้านี้

- ผู้ใช้บรรลุวัตถุประสงค์ของหน้าโดยไม่ต้องขอความช่วยเหลือจากทีม IT
- ข้อมูลที่บันทึกปรากฏบนแดชบอร์ด/PHR/EMR ตามสิทธิ์
- เหตุการณ์สำคัญ (login, จองนัด, admit, จบประชุม) มี log ตรวจสอบได้ใน Cloud Logging

**เอกสารอ้างอิงหลัก:**

- `Processes/VIDEO_MEETING_JITSI_GEMINI.md` — วิดีโอ, lobby, บันทึก, AI
- `Processes/Appointment_Workflows.md` — Pool และสถานะนัด
- `docs/markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook
- `docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` / `*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์

### องค์ประกอบ UI หลัก (data-testid)

- ดู `tests/SELECTORS.md` สำหรับหน้านี้

*(รุ่นเอกสารหน้านี้: ENRICH-9 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** ตรวจว่า session มี JWT และไม่ถูก redirect กลับหน้า login
   - **UI หลัก:** ดู `tests/SELECTORS.md` สำหรับหน้านี้
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. เปิดหน้า «00 Patient Portal Overview» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **รายละเอียด:** การเปลี่ยนความยินยอมต้องปรากฏใน audit log — ห้ามแก้ย้อนหลัง
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 6 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 7 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 8 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 9 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 10 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง

### ผลลัพธ์ที่คาดหวัง (สรุป)

- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)
- ไม่มี HTTP 4xx/5xx บนฟังก์ชันหลักของหน้านี้
- ข้อมูลใน PostgreSQL สอดคล้อง UI (เมื่อมีนัด/ประชุม/EMR)
- `data-testid` ตรงกับ `tests/SELECTORS.md`

### ข้อควรระวัง

- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล
- อย่าแชร์ลิงก์ประชุมหรือ JWT ทางช่องทางไม่ปลอดภัย
- ผลลัพธ์ AI ไม่ใช่การวินิจฉัย — แพทย์ต้องตรวจก่อนลง EMR


---

## Automated verification

| Field | Value |
|-------|-------|
| **Status** | partial |
| **Unit tests** | `—` |
| **UI (Playwright)** | Group — |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `00_Patient_Portal_Overview` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

