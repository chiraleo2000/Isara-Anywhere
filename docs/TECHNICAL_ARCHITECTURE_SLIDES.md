# รายงานโครงสร้างทางเทคนิค — Izara Anywhere (บันทึกวิทยากร)

**เวอร์ชัน:** v1.7.33 · **วันที่:** 27 พฤษภาคม 2569  
**มาตรฐานเอกสาร:** Word **TH Sarabun New** เนื้อหา **16 pt** ระยะบรรทัด **1.15** · PowerPoint **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt** บันทึกวิทยากร **16 pt**  
**ไฟล์:** [diagrams.drawio](diagrams.drawio) · [สไลด์ HTML](TECHNICAL_ARCHITECTURE_SLIDES.html) · [Word](TECHNICAL_ARCHITECTURE_WORD_TH.docx) · [PowerPoint](TECHNICAL_ARCHITECTURE_PPT_TH.pptx)

สร้าง/อัปเดต: `python scripts/build-technical-architecture-docs.py`  
ล้างข้อมูลทดสอบ (ไม่ re-seed demo): `npm run cleanup:cloud-test-only` (ต้องมี `DB_PASSWORD` ถูกต้องใน `.env`)

---

## มาตรฐานการรายงานภาษาไทย

| ประเภท | แบบอักษร | ขนาด | หมายเหตุ |
|--------|----------|------|----------|
| รายงาน Word / PDF | TH Sarabun New | เนื้อหา 16 pt, หัวข้อ 1 ระดับ 18 pt, ชื่อเรื่อง 22 pt | จัดชิดซ้าย ระยะบรรทัด 1.15 |
| สไลด์ PowerPoint | FC Iconic | หัวข้อ 32 pt, รอง 22 pt, เนื้อหา 18 pt, notes 16 pt | หนึ่งหัวข้อหลักต่อสไลด์ |
| ตัวเลขวันที่ | พ.ศ. ในข้อความไทย | — | คั่นหลักพันแบบไทยเมื่อจำเป็น |

---

## สไลด์ 1 — ชื่อเรื่อง

**Izara Anywhere (อิสระ เทเลเมดิซิน)** เป็นแพลตฟอร์มแพทย์ทางไกลสำหรับประเทศไทย Phase 1 ครบวงจรบนเว็บ: จองนัด วิดีโอคอล PHR/EMR ใบสั่งยา คำสั่งตรวจ และ AI ช่วยคลินิกภายใต้หลัก **Man-in-the-Loop** (แพทย์อนุมัติทุกผลลัพธ์ทางคลินิกก่อนถึงผู้ป่วย)

**draw.io:** หน้า 1 System Architecture

---

## สไลด์ 2 — วัตถุประสงค์และหลักการ

1. **ความปลอดภัยข้อมูลสุขภาพ** — PDPA, ความยินยอม, audit trail  
2. **แพทย์เป็นผู้ตัดสินใจสุดท้าย** — AI เป็นผู้ช่วย ไม่แทนแพทย์  
3. **ข้อมูลคลินิกรวมศูนย์** — PostgreSQL เดียว (`izara_phase1`) ไม่กระจายไฟล์ GCS สำหรับ EMR หลัก  
4. **พร้อม deploy บน Cloud Run** — สเกลตามโหลด dev-testing  

---

## สไลด์ 3 — สามพอร์ทัล

| พอร์ทัล | เทคโนโลยี | พอร์ต (local) | หน้าที่หลัก |
|---------|-----------|---------------|-------------|
| Patient | React 18 + Vite + Express | 3005 | จองนัด PHR AI แผนที่ PDPA |
| Doctor | React + nginx + Node (unified) | 3010 / Cloud 8080 | EMR คิว Pool แอดมิน |
| Meeting | Express + Socket.IO | 3020 | Jitsi lobby STT pipeline |

**ขั้นตรวจสอบ:** แต่ละพอร์ทัลมี `/health` หรือ composite health บน Cloud Run

---

## สไลด์ 4 — ชั้นงานสถาปัตยกรรม

| ชั้น | องค์ประกอบ | รายละเอียดขั้นตอน |
|------|------------|-------------------|
| 1 Client | Browser, Jitsi, Web Speech | ผู้ใช้เปิด HTTPS → โหลด SPA |
| 2 Portal | Express APIs | JWT/session → เรียก `/api/*` |
| 3 Real-time | NOTIFY → Socket.IO | DB trigger → pgNotifyListener → room |
| 4 Data | PostgreSQL 18 + pgvector | CRUD ผ่าน postgresDataService |
| 5 External | Gemini, Maps, OAuth | เรียกเมื่อฟีเจอร์ต้องการ |

Doctor บน Cloud: nginx `:8080` → `/auth` และ `/ws` ไป **3011**, `/api` ไป **3009**

---

## สไลด์ 5 — เครือข่ายคลาวด์

**โครงการ:** `izara-telemedicine` · **ภูมิภาค:** `asia-southeast1`

| บริการ Cloud Run | การเชื่อมต่อ |
|------------------|--------------|
| izara-patient-portal-dev-testing | PG VM, Meeting, Gemini, Maps |
| izara-doctor-portal-dev-testing | PG VM, Secret Manager, Meeting |
| izara-meeting-server-dev-testing | PG VM, Jitsi, Gemini pipeline |

**ฐานข้อมูล:** GCE `35.240.157.230:5432` — **ไม่ใช้ Cloud SQL**  
**Firewall:** TCP 5432 จาก Cloud Run egress เท่านั้น  

**draw.io:** หน้า 9 Cloud Network

---

## สไลด์ 6 — การเชื่อมต่อบริการ

1. **HTTPS** — Client → Cloud Run (TLS บังคับ)  
2. **TCP 5432** — ทุกพอร์ทัล → PostgreSQL  
3. **WebRTC** — Client ↔ `meet.jit.si` (สื่อวิดีโอ)  
4. **REST** — Patient/Doctor → Meeting Server (`/api/meetings`, lobby, guest)  
5. **WebSocket** — Socket.IO คิวและการแจ้งเตือน  
6. **HTTPS API** — Gemini สำหรับสรุป EMR และแชตสุขภาพ  

**จุดตรวจ deploy:** `MEETING_SERVER_URL` และ `VITE_MEETING_SERVER_URL` ต้องชี้ URL Meeting Server ชุดเดียวกัน

---

## สไลด์ 7 — โครงสร้างฐานข้อมูล (กลุ่มตาราง)

| กลุ่ม | ตาราง | หน้าที่ |
|-------|-------|---------|
| ตัวตน | users, sessions, password_resets | ล็อกอิน บทบาท อนุมัติ |
| ผู้ป่วย | patient_profiles, phr, vital_signs, living_wills, patient_consents | PHR PDPA |
| แพทย์ | doctor_profiles, doctors, doctor_schedules, consultants | โปรไฟล์ ตาราง |
| นัดหมาย | appointments | สถานะ pool |
| คลินิก | emr, prescriptions, lab_orders | SOAP ใบสั่งยา |
| ประชุม | meeting_records, meeting_transcripts | วิดีโอ STT |
| เนื้อหา/AI | medical_content, clinical_resources, knowledge_base, ai_chat_history | RAG แชต |
| ปฏิบัติการ | notifications, audit_logs | แจ้งเตือน audit |

**Schema:** `scripts/database/izara-database.sql` · **draw.io:** หน้า 8 Database ERD

---

## สไลด์ 8 — ความสัมพันธ์ข้อมูลหลัก

```
users ──► patient_profiles | doctor_profiles
users ──► appointments ──► meeting_records ──► meeting_transcripts
appointments ──► emr | prescriptions | lab_orders
```

- `appointments.doctor_id` — แพทย์ที่รับผิดชอบ (หลัง Pool/จัดสรร)  
- `emr.requires_validation` — บล็อกการแสดงผลผู้ป่วยจนแพทย์ลงนาม  
- Trigger `NOTIFY` — อัปเดตคิวแบบ real-time  

---

## สไลด์ 9–10 — กระบวนการจองนัดและวิดีโอ (12 ขั้น)

### ขั้น 1–6 (ก่อนพบ)

| ขั้น | ผู้ปฏิบัติ | การปฏิบัติ | ผลลัพธ์ระบบ |
|------|-----------|------------|-------------|
| 1 | ผู้ป่วย | ล็อกอิน / สมัคร + PDPA | session, users |
| 2 | ผู้ป่วย | จองนัด กรอกอาการ | appointments INSERT |
| 3 | แพทย์/แอดมิน | รับ Pool หรือจัดสรร | doctor_id, in_pool=false |
| 4 | แพทย์ | ยืนยันนัด | status=confirmed |
| 5 | แพลตฟอร์ม | NOTIFY + Socket.IO | แดชบอร์ดอัปเดต |
| 6 | แพทย์ | อ่านสรุป AI ก่อนพบ | Gemini + อ่าน phr/emr |

### ขั้น 7–10 (ระหว่างและหลังพบ)

| ขั้น | ผู้ปฏิบัติ | การปฏิบัติ | ผลลัพธ์ระบบ |
|------|-----------|------------|-------------|
| 7 | ผู้ป่วย | เข้า Jitsi lobby | meeting room |
| 8 | แพทย์ HOST | เริ่มประชุม อนุมัติแขก | lobby admitted |
| 9 | ทั้งคู่ | วิดีโอ + STT + แชท | meeting_transcripts |
| 10 | แพลตฟอร์ม | postMeetingPipeline | emr draft (AI) |

### ขั้น 11–12 (ปิดการรักษา)

| ขั้น | ผู้ปฏิบัติ | การปฏิบัติ | ผลลัพธ์ระบบ |
|------|-----------|------------|-------------|
| 11 | แพทย์ | ตรวจ EMR/Rx/lab ลงนาม | validated EMR |
| 12 | ผู้ป่วย | ดู timeline คำแนะนำ | notifications |

**สถานะนัด:** `pending` → `in_pool` → `assigned` → `confirmed` → `in_meeting` → `completed`

**draw.io:** หน้า 3 Appointment · หน้า 4 Video · **หน้า 10 E2E Workflow Steps**

**อ้างอิง:** `Processes/Appointment_Workflows.md`, `Processes/VIDEO_MEETING_JITSI_GEMINI.md`

---

## สไลด์ 11 — PHR · EMR · Man-in-the-Loop

1. **PHR** — ผู้ป่วยจัดการข้อมูลสุขภาพส่วนตน (แพ้ยา ยา สัญญาณชีพ)  
2. **EMR** — แพทย์บันทึก SOAP ระหว่าง/หลังพบ  
3. **AI ร่าง EMR** — จาก transcript; `requires_validation=true` จนลงนาม  
4. **RAG** — ค้นหาแนวทางคลินิกด้วย pgvector  

**draw.io:** หน้า 5 Health Records

---

## สไลด์ 12 — ความปลอดภัย · Real-time · Deploy

**ความปลอดภัย:** RBAC, JWT/session, bcrypt, OWASP middleware, audit_logs  

**Real-time:** ช่อง `appointment_*` NOTIFY → Socket.IO rooms  

**Deploy local:** `docker-compose up`  
**Deploy cloud:** `cloudbuild.yaml` / `scripts/deploy/cloud.ps1`  

**เอกสารกระบวนการรายหน้า:** `Processes/Pages/**/*.md` (ENRICH-7 — ขั้นตอนละเอียด)  
**อัปเดตหน้ากระบวนการ:** `python scripts/enrich-process-pages.py --force-steps`

---

## แผนที่ draw.io (10 หน้า)

| หน้า | หัวข้อ |
|------|--------|
| 1 | System Architecture |
| 2 | User Management |
| 3 | Appointment Workflow |
| 4 | Video Meeting |
| 5 | Health Records (PHR-EMR) |
| 6 | Living Will |
| 7 | Notification System |
| 8 | Database ERD |
| 9 | Cloud Network |
| 10 | E2E Workflow Steps |

---

*จัดทำ 27 พฤษภาคม 2569 — Isara Anywhere v1.7.33 — หลังรอบทดสอบให้รัน `npm run cleanup:cloud-test-only` เมื่อ DB credentials พร้อม*
