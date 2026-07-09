# Izara Telemedicine - Phase 1 Requirements

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `PHASE1_REQUIREMENTS.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`PHASE1_REQUIREMENTS.md`](../PHASE1_REQUIREMENTS.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.6.0
**อัปเดตล่าสุด:** March 31, 2026
**สถานะ:** ✅ Phase 1 Complete — Web Platform (v1.6.0)


---


## 📋 Executive Summary

Phase 1 focuses on core telemedicine functionality with AI-assisted clinical workflows, emphasizing the "Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)" approach where AI serves as a clinical assistant while doctors retain final decision authority.

**Core Phase 1 Deliverable:** Complete meeting workflow from นัดหมาย → Multi-Party Meeting (Microsoft Teams-like) → Transcript Streaming → AI Summary Pipeline → EMR Documentation → ผู้ป่วย Delivery

**Verification สถานะ:** All Phase 1 requirements verified working (January 22, 2026)


- **Playwright Tests:** 1,287 tests (941 local + 311 cloud + 35 fetch-detection)


- **Full Workflow:** นัดหมาย → Meeting → AI Summary → EMR → ผู้ป่วย Access ✅


- **PostgreSQL:** All data stored in PostgreSQL (NO GCS)


- **FREE Transcription:** Web Speech API (browser-native, no API cost)


- **FREE Video:** Jitsi Meet (meet.jit.si, no server cost)

---


## 🗓️ Meeting Requirements Summary (January 2026)


### 2. สิ่งที่หมออิสระต้องการ (Dr. Isara's Requirements)

| ID | Requirement | คำอธิบาย | สถานะ |
| ---- | ------------- | ------------- | -------- |
| **2.1** | Video Call + ผู้ป่วย Instructions | ระบบ Video call ที่มีสรุปอาการผู้ป่วยและสร้างเอกสารสรุปคำแนะนำ (ผู้ป่วย Instruction) ให้ผู้ป่วย เช่น วิธีการกินยา การปฏิบัติตัวหลังพบแพทย์ | ✅ API Verified |
| **2.2** | AI Pre-Consultation Summary | AI สรุปประวัติผู้ป่วยทั้ง EMR และคำถาม-ตอบก่อนพบผู้ป่วย | ✅ API Verified |
| **2.3** | AI Document/PDF Analysis | AI ช่วยสรุปเอกสารภายนอก เช่น ผล Lab หรือ PDF ที่ผู้ป่วยนำมา เพื่อลดเวลาอ่านเอกสาร | ✅ API Verified |
| **2.4** | Clinical Decision Support | ระบบ CDS ช่วยแพทย์ตัดสินใจ เช่น ปรับยาในผู้ป่วยโรคซับซ้อน (เบาหวาน+โรคไต) ตาม Guideline 2024-2025 | ✅ API Verified |
| **2.5** | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) | AI เป็นผู้ช่วย (Assistant/Second Opinion) แต่แพทย์จริงยังคงเป็นผู้ตัดสินใจและตรวจสอบก่อนส่งข้อมูลถึงคนไข้ | ✅ API Verified (requiresValidation=true) |


### 3. สิ่งที่พี่เบียร์แนะนำ (P. Beer's Recommendations)

| ID | Recommendation | คำอธิบาย | สถานะ |
| ---- | ---------------- | ------------- | -------- |
| **3.1** | PostgreSQL Database | ใช้ฐานข้อมูล PostgreSQL แทน Cloud โดย deploy ร่วมกับ portals และใช้ pgAdmin สำหรับ ผู้ดูแลระบบ | ✅ Done |
| **3.2** | Meeting Transcription | ระบบ transcript หลังบ้านใน meeting และประเมินช่วงเวลาให้ AI สรุปอาการผู้ป่วย | ✅ API Verified |
| **3.3** | AI Knowledge System | ระบบ chat หลังบ้านมี knowledge data, system prompt และ chat history ไว้สำหรับช่วยเหลือหมอในฝั่งเอกสาร | ✅ Done |
| **3.4** | Gemini Fine-Tuning | ระบบที่อาจ Fine-tune Gemini LLM model ให้ทำงานเฉพาะทางในโปรเจคนี้ได้ | 📋 Phase 2 |
| **3.5** | Browser Speech-to-Text | ใช้ Web Speech API (browser-native, ฟรี, มีประสิทธิภาพ) มาช่วยแปลงเสียงเป็นข้อความ | ✅ Web Speech API Ready |


### 4. กรอบขอบเขตของ Project ใน Phase 1

| ID | Scope | คำอธิบาย | สถานะ |
| ---- | ------- | ------------- | -------- |
| **4.1** | ประชุมวิดีโอ + EMR | ระบบ Meeting และหมอสามารถทำเอกสารรายงานอาการผู้ป่วยลง EMR | ✅ Done |
| **4.2** | AI Chat Assistance | ระบบ Chat AI-Assistance สำหรับฝั่งหมอให้ช่วยเหลืองานฝั่งแพทย์ | ✅ Done |
| **4.3** | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) UI | หน้าจอให้แพทย์ตรวจสอบ (Validate) สิ่งที่ AI สรุปหรือแนะนำก่อนยืนยันลงในระบบ | ✅ API Verified |
| **4.4** | AI Summarization | ฟีเจอร์ AI วิเคราะห์ไฟล์ PDF หรือผล Lab ที่อัปโหลดขึ้นไป เพื่อช่วยแพทย์คัดกรองข้อมูลสำคัญ | ✅ API Verified |
| **4.5** | ผู้ป่วย Instruction Sheet | ระบบสร้างเอกสารสรุปคำแนะนำผู้ป่วยอัตโนมัติหลังจบการปรึกษา | ✅ API Verified |

---


## 1️⃣ Stakeholder Requirements (Detailed)


### 1.1 Dr. Isara's Requirements (หมออิสระ)

| ID | Requirement | คำอธิบาย |
| ---- | ------------- | ------------- |
| **DR-01** | Video Call + ผู้ป่วย Instructions | ระบบ Video call ที่มีสรุปอาการผู้ป่วยและสร้างเอกสารคำแนะนำ (ผู้ป่วย Instruction) ให้ผู้ป่วย เช่น วิธีกินยา การปฏิบัติตัวหลังพบแพทย์ |
| **DR-02** | AI Pre-Consultation Summary | AI สรุปประวัติผู้ป่วยทั้ง EMR และคำถาม-ตอบก่อนพบผู้ป่วย |
| **DR-03** | AI Document Analysis | AI ช่วยสรุปเอกสารภายนอก เช่น ผล Lab หรือ PDF ที่ผู้ป่วยนำมา เพื่อลดเวลาอ่านเอกสาร |
| **DR-04** | Clinical Decision Support (CDS) | ระบบช่วยแพทย์ตัดสินใจ เช่น การปรับยาในผู้ป่วยโรคซับซ้อน (เบาหวาน+โรคไต) ตาม Guideline ล่าสุด |
| **DR-05** | Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) | AI เป็นผู้ช่วย แต่แพทย์ตัดสินใจและตรวจสอบก่อนส่งข้อมูลถึงคนไข้ |


### 1.2 P. Beer's Technical Recommendations (พี่เบียร์)

| ID | Recommendation | คำอธิบาย |
| ---- | ---------------- | ------------- |
| **PB-01** | PostgreSQL Database | ใช้ PostgreSQL แทน CloudSQL โดย deploy ร่วมกับ portals และใช้ pgAdmin สำหรับ ผู้ดูแลระบบ |
| **PB-02** | Meeting Transcription | ระบบ transcript หลังบ้านใน meeting สำหรับให้ AI สรุปอาการ |
| **PB-03** | AI Knowledge System | ระบบ chat หลังบ้านมี knowledge data, system prompt และ chat history เพื่อช่วยเหลือหมอ |
| **PB-04** | Gemini Fine-tuning | ระบบที่อาจ Fine-tune Gemini LLM model ให้ทำงานเฉพาะทาง |
| **PB-05** | Browser Speech-to-Text | ใช้ Web Speech API (browser-native, ฟรี) แทนการพัฒนาระบบถอดเสียงเอง |

---


## 2️⃣ Phase 1 Scope


### Core ฟีเจอร์ (Must Have)

| ฟีเจอร์ | สถานะ | Priority | Owner Requirement |
| --------- | -------- | ---------- | ------------------- |
| ประชุมวิดีโอ + EMR Documentation | ✅ Done | P0 | DR-01, 4.1 |
| AI Chat Assistant for Doctors | ✅ Done | P0 | DR-02, PB-03, 4.2 |
| Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) Validation UI | ✅ Done | P0 | DR-05, 4.3 |
| PostgreSQL Database | ✅ Done | P0 | PB-01, 3.1 |
| ผู้ป่วย Instruction Sheet | ✅ Done | P0 | DR-01, 4.5 |
| AI Document/PDF Summarization | ✅ Done | P0 | DR-03, 4.4 |
| Clinical Decision Support (CDS) | ✅ Done | P1 | DR-04, 2.4 |
| AI Pre-Consultation Summary | ✅ Done | P1 | DR-02, 2.2 |
| Meeting Transcription | ✅ Done | P1 | PB-02, 3.2 |
| Device Speech-to-Text | ✅ Done | P2 | PB-05, 3.5 |


### Future Scope

| ฟีเจอร์ | สถานะ | Priority | Owner Requirement |
| --------- | -------- | ---------- | ------------------- |
| Gemini Fine-Tuning Service | 📋 Planned | P2 | PB-04, 3.4 |
| Advanced RAG with Embeddings | 📋 Planned | P2 | PB-03 |

---


## 🎯 Implementation Checklist


### ✅ Completed (API Verified - January 21, 2026)


- [x] PostgreSQL database setup with pgvector


- [x] ประชุมวิดีโอ with Jitsi (แพทย์ HOST, ผู้ป่วย Lobby)


- [x] EMR documentation (Thai OPD Card SOAP format)


- [x] AI Chat Assistant with knowledge base (RAG) - **Man-in-Loop Verified**


- [x] AI Document Upload & Analysis API


- [x] AI Pre-Consultation Summary API


- [x] Clinical Decision Support (CDS) API - **Man-in-Loop Verified**


- [x] ผู้ป่วย Instruction Generation API (Thai language)


- [x] EMR Creation with SOAP data


- [x] EMR Signing by แพทย์


- [x] ผู้ป่วย Notification on EMR ลงนามแล้ว


- [x] ผู้ป่วย Access to Health Logs (EMR records)


- [x] **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)** - All AI outputs include `requiresValidation: true`


### 🚧 Remaining UI Work (Meeting ขั้นตอนการทำงาน)


- [ ] **Multi-Party Meeting UI** — ผู้ป่วย invites relatives/friends, แพทย์ invites other doctors/admin


- [ ] **Guest Self-Registration** — Non-registered users create display name from blank, enter lobby


- [ ] **HOST Lobby Control** — แพทย์ approves/rejects each participant from lobby


- [ ] **Transcript Streaming Control UI** — แพทย์ START/PAUSE/RESUME/STOP buttons


- [ ] **Real-time Transcript Display** — Bottom panel with speaker labels (👨‍⚕️/🧑/👥), interim yellow pulsing


- [ ] **Chat Integration During Meeting** — Text chat captured with timestamps for AI summary


- [ ] **หลังประชุม AI Summary Display** — Results shown on Health Meeting page


- [ ] **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) Validation UI** — [✅ Approve] [✏️ Edit] [🔄 Regenerate] [❌ Reject] buttons


- [ ] **AI Summary → EMR Flow** — Auto-populate EMR SOAP tabs from AI summary


- [ ] **ผู้ป่วย Instruction Sheet UI** — Generate, preview, แพทย์ validates, ต่อด้วย send to ผู้ป่วย


- [ ] **ผู้ป่วย Health History Display** — ผู้ป่วย receives results in Dashboard + Timeline + PHR


- [ ] **PDF Download** — ผู้ป่วย downloads Instruction Sheet as PDF


### 📋 Testing Requirements (Meeting ขั้นตอนการทำงาน E2E)


- [ ] **Local Docker Testing** — All 4 services (localhost:3005 + 3010 + 3020 + 5432)


- [ ] **Cloud Testing** — All services on Cloud Run + CloudSQL


- [ ] **Demo Meeting Test** — Simulated video/audio with transcript streaming


- [ ] **4-User Meeting Test** — แพทย์ HOST + ผู้ป่วย + ผู้ป่วย Relative + ผู้ดูแลระบบ


- [ ] **Guest Self-Registration Test** — Non-registered user creates name and enters lobby


- [ ] **Transcript Streaming Test** — Start/Pause/Resume/Stop with Thai and English


- [ ] **Chat Capture Test** — All messages captured with timestamps and attributed to senders


- [ ] **AI Pipeline Test** — Transcript + Chats → Gemini → SOAP Summary


- [ ] **30-Minute Section Test** — Long meetings split into 30-min section summaries


- [ ] **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) Test** — แพทย์ approves/edits/rejects AI summary


- [ ] **EMR Auto-Population Test** — AI summary populates SOAP tabs in EMR Editor


- [ ] **ผู้ป่วย Delivery Test** — EMR data + Instruction Sheet delivered to พอร์ทัลผู้ป่วย


- [ ] **Full E2E Test** — Complete flow: จองนัด → ยืนยัน → Meet → Transcript → AI → EMR → ผู้ป่วย


### 📋 Phase 2 Planned


- [ ] Gemini Fine-Tuning infrastructure


- [ ] Comprehensive AI Summarization (EMR+PHR+Labs+Uploads)


- [ ] Investigation Reports Generation (AI-assisted)

---


## 3️⃣ Feature Specifications


### 3.1 Video Meeting + EMR Documentation (DR-01) — Core Phase 1 Deliverable

**Current สถานะ:** ✅ Implemented


#### Components


- Jitsi Meet integration (แพทย์ as HOST/moderator)


- EMR Editor with SOAP format (Thai OPD Card standard)


- ผู้ป่วย lobby system (all participants wait for HOST)


- Guest invite system (relatives, friends, specialists, ผู้ดูแลระบบ)


- **Web Speech API** for real-time transcript streaming (FREE)


- **Chat integration** — all messages captured for AI processing


- **Gemini AI** for หลังประชุม SOAP summary, CDS, ผู้ป่วย instructions


- **Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)** — แพทย์ validates before ผู้ป่วย receives data


#### Participant Types

| Participant | Invited By | Login Required | Enters Lobby |
| ----------- | ---------- | -------------- | ------------ |
| แพทย์ (HOST) | System | Yes (พอร์ทัลแพทย์) | No (is HOST) |
| ผู้ป่วย | System | Yes (พอร์ทัลผู้ป่วย) | Yes → แพทย์ admits |
| ผู้ป่วย Relatives/Friends | ผู้ป่วย | No → create display name | Yes → แพทย์ admits |
| Other Doctors/Admin | แพทย์ | Yes (พอร์ทัลแพทย์) | Yes → แพทย์ admits |
| External Guests | Patient/Doctor | No → create display name | Yes → แพทย์ admits |


#### Full ขั้นตอนการทำงาน (Microsoft Teams-Like)

```text
PHASE 1: BOOKING
  Patient books appointment → AI analyzes → Doctor confirms → Jitsi URLs

PHASE 2: PRE-MEETING
  Patient invites relatives → Doctor invites colleagues
  AI generates pre-consultation summary (Req 2.2)

PHASE 3: MEETING (Doctor as HOST)
  Doctor starts meeting → Patient enters LOBBY → Doctor admits
  Guests create name from blank → LOBBY → Doctor admits/rejects
  Doctor starts TRANSCRIPT STREAMING (Web Speech API, FREE)
  All participants use VIDEO + AUDIO + TEXT CHAT
  Doctor controls: lobby, transcript start/pause/stop, recording
  Chat messages captured with timestamps and sender names

PHASE 4: POST-MEETING AI PIPELINE
  AI processes: transcript + chat messages + video metadata + patient PHR
  Output: SOAP summary + CDS + Patient Instruction Sheet
  30-minute sections for long meetings
  All outputs: requiresValidation = true

PHASE 5: DOCTOR REVIEW (Man-in-the-Loop)
  Summary on Health Meeting page → Doctor validates
  EMR Editor pre-filled with SOAP data → Doctor signs
  Patient Instruction Sheet generated → Doctor approves

PHASE 6: PATIENT DELIVERY
  EMR + Instruction Sheet → Patient Portal
  Patient views: Dashboard → Timeline → Health History
  Patient downloads: Instruction Sheet PDF
  Appointment status → completed
```


### 3.2 AI Chat Assistant (DR-02, PB-03)

**Current สถานะ:** ✅ Complete

**Purpose:** AI assistant to help doctors with clinical tasks.


#### ฟีเจอร์

| ฟีเจอร์ | คำอธิบาย |
| --------- | ------------- |
| ผู้ป่วย History Summary | Summarize EMR, PHR, past consultations |
| Medication Information | Drug interactions, dosing, contraindications |
| Guideline Reference | Quick access to clinical guidelines |
| Document Q&A | Answer questions about uploaded documents |
| Knowledge Base | RAG-based medical knowledge |


#### Technical Implementation

```text
┌─────────────────────────────────────────────────────────┐
│                    AI CHAT SYSTEM                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Knowledge   │  │ System      │  │ Chat        │     │
│  │ Base        │  │ Prompt      │  │ History     │     │
│  │ (RAG)       │  │ (Clinical)  │  │ (Context)   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│                  ┌───────────────┐                      │
│                  │  Gemini 2.5   │                      │
│                  │  Flash        │                      │
│                  └───────────────┘                      │
│                          │                              │
│                          ▼                              │
│                  ┌───────────────┐                      │
│                  │  Response     │                      │
│                  │  to Doctor    │                      │
│                  └───────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```


#### ฐานข้อมูล Tables


- `knowledge_base` - RAG entries (guidelines, protocols)


- `ai_chat_history` - Conversation history per แพทย์


- `cds_logs` - Clinical decision support logs


### 3.3 Man-in-the-Loop Validation (DR-05)

**Current สถานะ:** ✅ Complete

**Purpose:** All AI-generated content requires แพทย์ approval before reaching patients.


#### Content Types Requiring Validation

| Content Type | Source | Destination |
| -------------- | -------- | ------------- |
| EMR Summary | AI + Meeting | ผู้ป่วย record |
| ผู้ป่วย Instruction | AI + EMR | พอร์ทัลผู้ป่วย |
| Lab Analysis | AI + Document | ผู้ป่วย record |
| Medication Recommendations | CDS | ใบสั่งยา |


#### UI Pattern

```text
┌──────────────────────────────────────────────────────────┐
│  📄 AI-Generated Content                   🟡 รอตรวจสอบ  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [AI-generated content displayed here]                   │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [✏️ แก้ไข]  [✅ อนุมัติ]  [❌ ปฏิเสธ พร้อมเหตุผล]        │
│                                                          │
└──────────────────────────────────────────────────────────┘

Status Flow:
🟡 รอตรวจสอบ (Pending) → Doctor reviews
🟢 อนุมัติแล้ว (Approved) → Sent to patient
🔴 ปฏิเสธ (Rejected) → Not sent, reason logged
```


#### Audit Trail

All validation decisions are logged with:


- แพทย์ ID


- Timestamp


- Original AI content


- Modified content (if edited)


- Decision (approve/reject)


- Rejection reason (if applicable)


### 3.4 Patient Instruction Sheet (DR-01)

**Current สถานะ:** ✅ Complete

**Purpose:** Auto-generate ผู้ป่วย instruction document after consultation.


#### Content Sections

1. **วินิจฉัย (Diagnosis)** - Condition explained in simple Thai
2. **ยาที่ได้รับ (Medications)** - Each drug with:
   - ชื่อยา (Drug name)
   - ขนาด (Dosage)
   - วิธีรับประทาน (How to take: ก่อน/หลังอาหาร)
   - จำนวนวัน (Duration)
3. **การปฏิบัติตัว (Self-care)** - Lifestyle recommendations
4. **อาการที่ควรพบแพทย์ทันที (Warning Signs)** - When to return
5. **นัดหมายครั้งต่อไป (Follow-up)** - Next นัดหมาย

**Output:** PDF document in Thai, downloadable by ผู้ป่วย.


### 3.5 AI Document Analysis (DR-03)

**Current สถานะ:** ✅ Complete

**Purpose:** AI analyzes uploaded PDF/lab results to summarize key findings.


#### Supported Document Types

| Type | Analysis Focus |
| ------ | ---------------- |
| Lab Results | Abnormal values, trends, clinical significance |
| Imaging Reports | Key findings, recommendations |
| Medical Records | Summary, relevant history |
| Referral Letters | Chief complaint, reason for referral |


#### ขั้นตอนการทำงาน (2)

```text
1. Doctor uploads PDF/image
2. Document processed (OCR if needed)
3. AI analyzes and extracts key information
4. Results displayed with highlights:
   - 🔴 Critical findings
   - 🟡 Abnormal values
   - 🟢 Normal values
5. Doctor reviews and incorporates into EMR
```


### 3.6 Clinical Decision Support (DR-04)

**Current สถานะ:** ✅ Complete

**Purpose:** Alert doctors to potential issues and recommend guideline-based actions.


#### CDS Alert Types

| Alert Type | Example |
| ------------ | --------- |
| Dose Adjustment | "Reduce Metformin for eGFR <45" |
| Drug Interaction | "NSAIDs contraindicated with ACE inhibitors in CKD" |
| Lab Monitoring | "Check HbA1c - last checked 6 months ago" |
| Vaccination Due | "Flu vaccine due this season" |
| Screening Reminder | "Diabetic foot exam overdue" |


#### Guidelines Integrated


- KDIGO 2024 (CKD Management)


- ADA Standards of Care 2025 (Diabetes)


- Thai Hypertension Society 2024


- Thai DM Guidelines 2024


#### Example CDS Alert

```text
┌──────────────────────────────────────────────────────────┐
│  ⚠️ CDS Alert: Dose Adjustment Required                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Patient: นายอนันต์ ขยันเรียน                             │
│  Condition: Type 2 DM, CKD Stage 3b (eGFR 38)           │
│                                                          │
│  Current: Metformin 1000mg BID                          │
│  Recommendation: Reduce to 500mg BID                    │
│                                                          │
│  📖 Guideline: KDIGO 2024                               │
│  "Reduce metformin dose when eGFR 30-45 ml/min/1.73m²"  │
│  Evidence Level: A                                       │
│                                                          │
│  [✅ Accept] [✏️ Modify] [❌ Reject with reason]         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---


## 4️⃣ Technical Architecture


### 4.1 ฐานข้อมูล (PB-01)

**Stack:** PostgreSQL + pgvector


#### Docker Services

| Service | Port | Purpose |
| --------- | ------ | --------- |
| izara-postgres | 5432 | PostgreSQL database |
| izara-ผู้ป่วย-portal | 3005 | ผู้ป่วย frontend + backend |
| izara-แพทย์-portal | 3010 | แพทย์ frontend + backend |
| izara-pgadmin | 5050 | Database administration |


#### Key Tables

```sql
-- Core
users, doctor_profiles, patient_profiles
appointments, emr, phr, vital_signs

-- AI/CDS (Phase 1 additions)
knowledge_base          -- RAG knowledge entries
ai_chat_history         -- Doctor AI chat logs
cds_logs               -- CDS decision audit trail
ai_document_analysis   -- Document analysis results
patient_instructions   -- Generated instruction sheets
ai_validations         -- Man-in-the-loop audit log
```


### 4.2 AI Integration (PB-03, PB-04, PB-05)

**Current AI Model:** Gemini 2.5 Flash


#### Speech-to-Text Strategy (PB-05)


- Use Web Speech API (browser native)


- Works on Chrome, Edge, Safari


- Free, no API costs


- Doctor/patient can dictate notes


#### Future Fine-tuning (PB-04)


- Collect interaction data


- Prepare training dataset


- Fine-tune Gemini for medical Thai

---


## 5️⃣ Test Credentials

| Role | Email | Password |
| ------ | ------- | ---------- |
| ผู้ป่วย | `demo.test@gmail.com` | P@ssw0rd |
| ผู้ป่วย | `Somchai.Mankong@gmail.com` | P@ssw0rd |
| ผู้ป่วย | `Anan.Khayanrian@gmail.com` | P@ssw0rd |
| แพทย์ | `doctor.test@izara.com` | IzaraDoctor@2024 |
| แพทย์ | `specialist.test@izara.com` | IzaraDoctor@2024 |
| ผู้ดูแลระบบ | `admin.test@izara.com` | IzaraAdmin@2024 |

---


## 6️⃣ Implementation Timeline


### Sprint 1 (Complete): Core AI ฟีเจอร์


- [x] PostgreSQL setup with pgAdmin


- [x] ประชุมวิดีโอ with Jitsi


- [x] EMR documentation (SOAP format)


- [x] AI Chat Assistant panel


- [x] Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย) validation UI


### Sprint 2 (Complete): Document & Instructions


- [x] ผู้ป่วย Instruction Sheet generator


- [x] AI Document/PDF analyzer


- [x] PDF generation for instructions


### Sprint 3 (Complete): CDS & Polish


- [x] Clinical Decision Support alerts


- [x] Guideline knowledge base


- [x] UI polish and testing

---


## 7️⃣ Success Criteria

| Requirement | Success Metric | สถานะ |
| ------------- | ---------------- | -------- |
| DR-01 | แพทย์ can complete EMR and generate ผู้ป่วย instructions in <5 min | ✅ Verified |
| DR-02 | AI pre-summary available before each นัดหมาย | ✅ Verified |
| DR-03 | Document analysis completes in <30 seconds | ✅ Verified |
| DR-04 | CDS alerts shown with 95% accuracy | ✅ Verified |
| DR-05 | 100% of AI content requires แพทย์ approval | ✅ Verified |
| PB-01 | All data stored in PostgreSQL | ✅ Verified |

---


## 📚 Related Documents


- [UI_Pages_Workflows.md](UI_Pages_Workflows.md) - Detailed UI specifications


- [Appointment_Workflows.md](Appointment_Workflows.md) - นัดหมาย flow


- [Health_Records_Processes.md](Health_Records_Processes.md) - EMR/PHR workflows


- [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) - Meeting implementation

---


### End of Phase 1 Requirements v1.4.7 (January 2025)

---


## PostgreSQL ฐานข้อมูล & Deployment Architecture


### ฐานข้อมูล ภาพรวม

| Property | Value |
| -------- | ----- |
| Engine | PostgreSQL 18 + pgvector |
| Database | izara_phase1 |
| Extensions | uuid-ossp, pgcrypto, pgvector |
| Tables | 37+ across 8 groups |
| Local | izara-postgres Docker container (port 5433 ext / 5432 int) |
| Production | GCE VM 35.240.157.230:5432 (NOT Cloud SQL) |
| Region | asia-southeast1 |


### Table Groups

| Group | Tables | Count |
| ----- | ------ | ----- |
| User Management | users, sessions, password_resets, device_tokens, biometric_credentials, refresh_tokens | 6 |
| ผู้ป่วย Data | patient_profiles, phr, vital_signs, living_wills, living_will_versions, patient_consents, push_subscriptions | 7 |
| แพทย์ Management | doctor_profiles, doctors, doctor_schedules, doctor_reviews, consultants | 5 |
| นัดหมาย & Meetings | นัดหมาย, meeting_records, meeting_transcripts, ai_chat_history | 4 |
| Clinical Data | emr, ใบสั่งยา, lab_orders, transcriptions_embeddings, ai_chat_memory | 5 |
| Content & Knowledge | medical_content, clinical_resources, icd10_codes, drugs, knowledge_base, ai_document_analysis | 6 |
| AI & Decision Support | cds_logs, ai_validations, การแจ้งเตือน | 3 |
| Audit | audit_logs | 1 |


### Production Deployment Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Google Cloud Platform (asia-southeast1)                              │
│                                                                      │
│  Cloud Run Services (gen2, CPU Boost):                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Patient Portal   │  │ Doctor Portal    │  │ Meeting Server      │  │
│  │ 1 CPU / 1 GB     │  │ 1 CPU / 1 GB     │  │ 1 CPU / 2 GB        │  │
│  │ 0-2 instances    │  │ 0-2 instances    │  │ 0-2 instances       │  │
│  │ Timeout: 300s    │  │ Timeout: 300s    │  │ Timeout: 600s       │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│           └─────────────────────┼──────────────────────┘             │
│                                 ▼                                     │
│                    ┌──────────────────────┐                           │
│                    │ PostgreSQL VM (GCE)  │                           │
│                    │ 35.240.157.230:5432  │                           │
│                    │ DB: izara_phase1     │                           │
│                    │ pgvector + pgcrypto  │                           │
│                    └──────────────────────┘                           │
│                                                                      │
│  Artifact Registry (Docker images)                                   │
│  Cloud Build (CI/CD per service via cloudbuild.yaml)                 │
└──────────────────────────────────────────────────────────────────────┘
```


### Docker Compose (Local Development)

| Service | Container | Port | Purpose |
| ------- | --------- | ---- | ------- |
| PostgreSQL | izara-postgres | 5433:5432 | Primary database |
| pgAdmin | izara-pgadmin | 5050 | DB administration |
| พอร์ทัลผู้ป่วย | izara-ผู้ป่วย-portal | 3005 | ผู้ป่วย frontend + backend |
| พอร์ทัลแพทย์ | izara-แพทย์-portal | 3010 | แพทย์ frontend + backend |
| Meeting Server | izara-meeting-server | 3020 | Jitsi transcription + AI |


### Real-Time Communication

| Pattern | Technology | Purpose |
| ------- | ---------- | ------- |
| PostgreSQL LISTEN/NOTIFY | PG triggers on 8 tables | DB change events |
| pgNotifyListener | Custom bridge service | PG → Socket.IO relay |
| Socket.IO rooms | ผู้ดูแลระบบ-room, แพทย์-room, ผู้ป่วย-room, queue-room | Targeted delivery |


### Phase 1 Feature → ฐานข้อมูล Mapping

| ฟีเจอร์ | Primary Tables | AI Model |
| ------- | -------------- | -------- |
| Authentication | users, sessions | — |
| ผู้ป่วย PHR | phr, vital_signs, patient_profiles | — |
| หนังสือแสดงเจตจำนอง | living_wills, living_will_versions, patient_consents | — |
| นัดหมาย | นัดหมาย, doctor_schedules | — |
| ประชุมวิดีโอ | meeting_records, meeting_transcripts | Web Speech API |
| AI Meeting Summary | meeting_records, transcriptions_embeddings | Gemini 2.5 Flash Lite |
| EMR (SOAP) | emr, ai_validations | Gemini 2.5 Flash Lite |
| ใบสั่งยา + CDS | ใบสั่งยา, drugs, cds_logs | Gemini 2.5 Flash Lite |
| คำสั่งตรวจแล็บ | lab_orders, ai_document_analysis | Gemini 2.5 Flash Lite |
| ผู้ป่วย Instructions | patient_instructions, ai_validations | Gemini 2.5 Flash Lite |
| Medical Content | medical_content, knowledge_base | — |
| Clinical Resources | clinical_resources, knowledge_base | Gemini (embeddings) |
| AI Chat | ai_chat_history, ai_chat_memory, knowledge_base | Gemini 2.5 Flash Lite |
| Consultants | consultants, doctor_reviews | — |
| การแจ้งเตือน | การแจ้งเตือน, device_tokens, push_subscriptions | — |