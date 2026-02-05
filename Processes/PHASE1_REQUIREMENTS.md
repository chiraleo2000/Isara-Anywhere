# Izara Telemedicine - Phase 1 Requirements

**Version:** 3.4.0  
**Last Updated:** February 4, 2026  
**Status:** ✅ Phase 1 Complete - Full Test Verification

---

## 📋 Executive Summary

Phase 1 focuses on core telemedicine functionality with AI-assisted clinical workflows, emphasizing the "Man-in-the-Loop" approach where AI serves as a clinical assistant while doctors retain final decision authority.

**Verification Status:** All Phase 1 requirements verified working (January 22, 2026)

- **Playwright Tests:** 1,287 tests (941 local + 311 cloud + 35 fetch-detection)
- **Full Workflow:** Appointment → Meeting → AI Summary → EMR → Patient Access ✅
- **PostgreSQL:** All data stored in PostgreSQL (NO GCS)

---

## 🗓️ Meeting Requirements Summary (January 2026)

### 2. สิ่งที่หมออิสระต้องการ (Dr. Isara's Requirements)

| ID | Requirement | Description | Status |
| ---- | ------------- | ------------- | -------- |
| **2.1** | Video Call + Patient Instructions | ระบบ Video call ที่มีสรุปอาการผู้ป่วยและสร้างเอกสารสรุปคำแนะนำ (Patient Instruction) ให้ผู้ป่วย เช่น วิธีการกินยา การปฏิบัติตัวหลังพบแพทย์ | ✅ API Verified |
| **2.2** | AI Pre-Consultation Summary | AI สรุปประวัติผู้ป่วยทั้ง EMR และคำถาม-ตอบก่อนพบผู้ป่วย | ✅ API Verified |
| **2.3** | AI Document/PDF Analysis | AI ช่วยสรุปเอกสารภายนอก เช่น ผล Lab หรือ PDF ที่ผู้ป่วยนำมา เพื่อลดเวลาอ่านเอกสาร | ✅ API Verified |
| **2.4** | Clinical Decision Support | ระบบ CDS ช่วยแพทย์ตัดสินใจ เช่น ปรับยาในผู้ป่วยโรคซับซ้อน (เบาหวาน+โรคไต) ตาม Guideline 2024-2025 | ✅ API Verified |
| **2.5** | Man-in-the-Loop | AI เป็นผู้ช่วย (Assistant/Second Opinion) แต่แพทย์จริงยังคงเป็นผู้ตัดสินใจและตรวจสอบก่อนส่งข้อมูลถึงคนไข้ | ✅ API Verified (requiresValidation=true) |

### 3. สิ่งที่พี่เบียร์แนะนำ (P. Beer's Recommendations)

| ID | Recommendation | Description | Status |
| ---- | ---------------- | ------------- | -------- |
| **3.1** | PostgreSQL Database | ใช้ฐานข้อมูล PostgreSQL แทน Cloud โดย deploy ร่วมกับ portals และใช้ pgAdmin สำหรับ admin | ✅ Done |
| **3.2** | Meeting Transcription | ระบบ transcript หลังบ้านใน meeting และประเมินช่วงเวลาให้ AI สรุปอาการผู้ป่วย | ✅ API Verified |
| **3.3** | AI Knowledge System | ระบบ chat หลังบ้านมี knowledge data, system prompt และ chat history ไว้สำหรับช่วยเหลือหมอในฝั่งเอกสาร | ✅ Done |
| **3.4** | Gemini Fine-Tuning | ระบบที่อาจ Fine-tune Gemini LLM model ให้ทำงานเฉพาะทางในโปรเจคนี้ได้ | 📋 Phase 2 |
| **3.5** | Device Speech-to-Text | ใช้ฟีเจอร์ Speech-to-Text ที่มีอยู่บนอุปกรณ์ Mobile (ฟรี, มีประสิทธิภาพ) มาช่วยแปลงเสียงเป็นข้อความ | ✅ Web Speech API Ready |

### 4. กรอบขอบเขตของ Project ใน Phase 1

| ID | Scope | Description | Status |
| ---- | ------- | ------------- | -------- |
| **4.1** | Video Meeting + EMR | ระบบ Meeting และหมอสามารถทำเอกสารรายงานอาการผู้ป่วยลง EMR | ✅ Done |
| **4.2** | AI Chat Assistance | ระบบ Chat AI-Assistance สำหรับฝั่งหมอให้ช่วยเหลืองานฝั่งแพทย์ | ✅ Done |
| **4.3** | Man-in-the-Loop UI | หน้าจอให้แพทย์ตรวจสอบ (Validate) สิ่งที่ AI สรุปหรือแนะนำก่อนยืนยันลงในระบบ | ✅ API Verified |
| **4.4** | AI Summarization | ฟีเจอร์ AI วิเคราะห์ไฟล์ PDF หรือผล Lab ที่อัปโหลดขึ้นไป เพื่อช่วยแพทย์คัดกรองข้อมูลสำคัญ | ✅ API Verified |
| **4.5** | Patient Instruction Sheet | ระบบสร้างเอกสารสรุปคำแนะนำผู้ป่วยอัตโนมัติหลังจบการปรึกษา | ✅ API Verified |

---

## 1️⃣ Stakeholder Requirements (Detailed)

### 1.1 Dr. Isara's Requirements (หมออิสระ)

| ID | Requirement | Description |
| ---- | ------------- | ------------- |
| **DR-01** | Video Call + Patient Instructions | ระบบ Video call ที่มีสรุปอาการผู้ป่วยและสร้างเอกสารคำแนะนำ (Patient Instruction) ให้ผู้ป่วย เช่น วิธีกินยา การปฏิบัติตัวหลังพบแพทย์ |
| **DR-02** | AI Pre-Consultation Summary | AI สรุปประวัติผู้ป่วยทั้ง EMR และคำถาม-ตอบก่อนพบผู้ป่วย |
| **DR-03** | AI Document Analysis | AI ช่วยสรุปเอกสารภายนอก เช่น ผล Lab หรือ PDF ที่ผู้ป่วยนำมา เพื่อลดเวลาอ่านเอกสาร |
| **DR-04** | Clinical Decision Support (CDS) | ระบบช่วยแพทย์ตัดสินใจ เช่น การปรับยาในผู้ป่วยโรคซับซ้อน (เบาหวาน+โรคไต) ตาม Guideline ล่าสุด |
| **DR-05** | Man-in-the-Loop | AI เป็นผู้ช่วย แต่แพทย์ตัดสินใจและตรวจสอบก่อนส่งข้อมูลถึงคนไข้ |

### 1.2 P. Beer's Technical Recommendations (พี่เบียร์)

| ID | Recommendation | Description |
| ---- | ---------------- | ------------- |
| **PB-01** | PostgreSQL Database | ใช้ PostgreSQL แทน CloudSQL โดย deploy ร่วมกับ portals และใช้ pgAdmin สำหรับ admin |
| **PB-02** | Meeting Transcription | ระบบ transcript หลังบ้านใน meeting สำหรับให้ AI สรุปอาการ |
| **PB-03** | AI Knowledge System | ระบบ chat หลังบ้านมี knowledge data, system prompt และ chat history เพื่อช่วยเหลือหมอ |
| **PB-04** | Gemini Fine-tuning | ระบบที่อาจ Fine-tune Gemini LLM model ให้ทำงานเฉพาะทาง |
| **PB-05** | Device Speech-to-Text | ใช้ Speech-to-Text บน Mobile device (ฟรี, มีประสิทธิภาพ) แทนการพัฒนาระบบถอดเสียงเอง |

---

## 2️⃣ Phase 1 Scope

### Core Features (Must Have)

| Feature | Status | Priority | Owner Requirement |
| --------- | -------- | ---------- | ------------------- |
| Video Meeting + EMR Documentation | ✅ Done | P0 | DR-01, 4.1 |
| AI Chat Assistant for Doctors | ✅ Done | P0 | DR-02, PB-03, 4.2 |
| Man-in-the-Loop Validation UI | ✅ Done | P0 | DR-05, 4.3 |
| PostgreSQL Database | ✅ Done | P0 | PB-01, 3.1 |
| Patient Instruction Sheet | ✅ Done | P0 | DR-01, 4.5 |
| AI Document/PDF Summarization | ✅ Done | P0 | DR-03, 4.4 |
| Clinical Decision Support (CDS) | ✅ Done | P1 | DR-04, 2.4 |
| AI Pre-Consultation Summary | ✅ Done | P1 | DR-02, 2.2 |
| Meeting Transcription | ✅ Done | P1 | PB-02, 3.2 |
| Device Speech-to-Text | ✅ Done | P2 | PB-05, 3.5 |

### Phase 2 Scope (Future)

| Feature | Status | Priority | Owner Requirement |
| --------- | -------- | ---------- | ------------------- |
| Gemini Fine-Tuning Service | 📋 Planned | P2 | PB-04, 3.4 |
| Advanced RAG with Embeddings | 📋 Planned | P2 | PB-03 |
| Mobile App Development | 📋 Planned | P3 | - |

---

## 🎯 Implementation Checklist

### ✅ Completed (API Verified - January 21, 2026)

- [x] PostgreSQL database setup with pgvector
- [x] Video meeting with Jitsi (Doctor HOST, Patient Lobby)
- [x] EMR documentation (Thai OPD Card SOAP format)
- [x] AI Chat Assistant with knowledge base (RAG) - **Man-in-Loop Verified**
- [x] AI Document Upload & Analysis API
- [x] AI Pre-Consultation Summary API
- [x] Clinical Decision Support (CDS) API - **Man-in-Loop Verified**
- [x] Patient Instruction Generation API (Thai language)
- [x] EMR Creation with SOAP data
- [x] EMR Signing by Doctor
- [x] Patient Notification on EMR Signed
- [x] Patient Access to Health Logs (EMR records)
- [x] **Man-in-the-Loop** - All AI outputs include `requiresValidation: true`

### 🚧 Remaining UI Work

- [ ] **Man-in-the-Loop UI in Dashboard** - Show AI results in Health Meeting panel
- [ ] **Doctor Validation Actions** - Approve/Edit/Reject buttons for AI outputs
- [ ] **AI Summary → EMR Flow** - Use AI results to populate EMR sections
- [ ] **Patient Instruction Sheet UI** - Generate and preview before sending
- [ ] **Meeting Transcription UI** - Start/Stop transcript during meeting

### 📋 Phase 2 Planned

- [ ] Gemini Fine-Tuning infrastructure
- [ ] Comprehensive AI Summarization (EMR+PHR+Labs+Uploads)
- [ ] Investigation Reports Generation (AI-assisted)

---

## 3️⃣ Feature Specifications

### 3.1 Video Meeting + EMR Documentation (DR-01)

**Current Status:** ✅ Implemented

#### Components

- Jitsi Meet integration (doctor as HOST)
- EMR Editor with SOAP format (Thai/English)
- Patient lobby system
- Guest invite system (relatives, specialists)

#### Workflow

```text
1. Doctor confirms appointment → Meeting link generated
2. Patient enters lobby → Waits for doctor
3. Doctor joins → Admits patient from lobby
4. During meeting:
   - Video/audio consultation
   - EMR documentation in real-time
   - AI chat assistant available
5. Post-meeting:
   - AI generates EMR summary (pending review)
   - AI generates patient instructions (pending review)
   - Doctor approves/edits before sending to patient
```

### 3.2 AI Chat Assistant (DR-02, PB-03)

**Current Status:** ✅ Complete

**Purpose:** AI assistant to help doctors with clinical tasks.

#### Features

| Feature | Description |
| --------- | ------------- |
| Patient History Summary | Summarize EMR, PHR, past consultations |
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

#### Database Tables

- `knowledge_base` - RAG entries (guidelines, protocols)
- `ai_chat_history` - Conversation history per doctor
- `cds_logs` - Clinical decision support logs

### 3.3 Man-in-the-Loop Validation (DR-05)

**Current Status:** ✅ Complete

**Purpose:** All AI-generated content requires doctor approval before reaching patients.

#### Content Types Requiring Validation

| Content Type | Source | Destination |
| -------------- | -------- | ------------- |
| EMR Summary | AI + Meeting | Patient record |
| Patient Instruction | AI + EMR | Patient portal |
| Lab Analysis | AI + Document | Patient record |
| Medication Recommendations | CDS | Prescription |

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

- Doctor ID
- Timestamp
- Original AI content
- Modified content (if edited)
- Decision (approve/reject)
- Rejection reason (if applicable)

### 3.4 Patient Instruction Sheet (DR-01)

**Current Status:** ✅ Complete

**Purpose:** Auto-generate patient instruction document after consultation.

#### Content Sections

1. **วินิจฉัย (Diagnosis)** - Condition explained in simple Thai
2. **ยาที่ได้รับ (Medications)** - Each drug with:
   - ชื่อยา (Drug name)
   - ขนาด (Dosage)
   - วิธีรับประทาน (How to take: ก่อน/หลังอาหาร)
   - จำนวนวัน (Duration)
3. **การปฏิบัติตัว (Self-care)** - Lifestyle recommendations
4. **อาการที่ควรพบแพทย์ทันที (Warning Signs)** - When to return
5. **นัดหมายครั้งต่อไป (Follow-up)** - Next appointment

**Output:** PDF document in Thai, downloadable by patient.

### 3.5 AI Document Analysis (DR-03)

**Current Status:** ✅ Complete

**Purpose:** AI analyzes uploaded PDF/lab results to summarize key findings.

#### Supported Document Types

| Type | Analysis Focus |
| ------ | ---------------- |
| Lab Results | Abnormal values, trends, clinical significance |
| Imaging Reports | Key findings, recommendations |
| Medical Records | Summary, relevant history |
| Referral Letters | Chief complaint, reason for referral |

#### Workflow (2)

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

**Current Status:** ✅ Complete

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

### 4.1 Database (PB-01)

**Stack:** PostgreSQL + pgvector

#### Docker Services

| Service | Port | Purpose |
| --------- | ------ | --------- |
| izara-postgres | 5432 | PostgreSQL database |
| izara-patient-portal | 3005 | Patient frontend + backend |
| izara-doctor-portal | 3010 | Doctor frontend + backend |
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
| Patient | `demo.test@gmail.com` | P@ssw0rd |
| Patient | `Somchai.Mankong@gmail.com` | P@ssw0rd |
| Patient | `Anan.Khayanrian@gmail.com` | P@ssw0rd |
| Doctor | `doctor.test@izara.com` | IzaraDoctor@2024 |
| Doctor | `specialist.test@izara.com` | IzaraDoctor@2024 |
| Admin | `admin.test@izara.com` | IzaraAdmin@2024 |

---

## 6️⃣ Implementation Timeline

### Sprint 1 (Complete): Core AI Features

- [x] PostgreSQL setup with pgAdmin
- [x] Video meeting with Jitsi
- [x] EMR documentation (SOAP format)
- [x] AI Chat Assistant panel
- [x] Man-in-the-Loop validation UI

### Sprint 2 (Complete): Document & Instructions

- [x] Patient Instruction Sheet generator
- [x] AI Document/PDF analyzer
- [x] PDF generation for instructions

### Sprint 3 (Complete): CDS & Polish

- [x] Clinical Decision Support alerts
- [x] Guideline knowledge base
- [x] UI polish and testing

---

## 7️⃣ Success Criteria

| Requirement | Success Metric | Status |
| ------------- | ---------------- | -------- |
| DR-01 | Doctor can complete EMR and generate patient instructions in <5 min | ✅ Verified |
| DR-02 | AI pre-summary available before each appointment | ✅ Verified |
| DR-03 | Document analysis completes in <30 seconds | ✅ Verified |
| DR-04 | CDS alerts shown with 95% accuracy | ✅ Verified |
| DR-05 | 100% of AI content requires doctor approval | ✅ Verified |
| PB-01 | All data stored in PostgreSQL | ✅ Verified |

---

## 📚 Related Documents

- [UI_Pages_Workflows.md](UI_Pages_Workflows.md) - Detailed UI specifications
- [Appointment_Workflows.md](Appointment_Workflows.md) - Appointment flow
- [Health_Records_Processes.md](Health_Records_Processes.md) - EMR/PHR workflows
- [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) - Meeting implementation

---

### End of Phase 1 Requirements v3.4.0 (February 4, 2026)
