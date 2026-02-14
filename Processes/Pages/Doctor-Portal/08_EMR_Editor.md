# 📋 Doctor Portal — EMR Editor (Electronic Medical Record)

**Component:** `src/components/CompleteEMREditor.tsx`  
**Type:** Modal (launched from DoctorPortal)  
**Access:** 🔒 Doctor / Admin  
**Thai Title:** เวชระเบียนอิเล็กทรอนิกส์ / Electronic Medical Record  
**Version:** v1.4.7

---

## 1. Purpose

Create and edit Electronic Medical Records in Thai Ministry of Public Health OPD Card format. SOAP-based documentation with AI-assisted summary, voice dictation, auto-save, and digital signature.

---

## 2. EMR Template: OPD Card (Thailand Standard)

### SOAP Tabs

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 เวชระเบียน - นายสมชาย มั่นคง                                     │
│                                                                     │
│  Encounter: [ตรวจทั่วไป ▼]  Status: 🟡 Draft                        │
│                                                                     │
│  Tabs: [ประวัติ (S)] [ตรวจร่างกาย (O)] [การวินิจฉัย (A)] [การรักษา (P)] │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  (Active Tab Content)                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [🎤 Voice Dictation: ON/OFF]           Auto-save: Every 30 sec    │
│                                                                     │
│  [💾 Save Draft] [🤖 AI Summary] [✍️ Sign & Finalize]              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tab Details

### Tab S: ประวัติ (Subjective/History)

| Field | Thai | Description |
| ----- | ---- | ----------- |
| Chief Complaint | อาการสำคัญ | Primary reason for visit |
| History of Present Illness | ประวัติการเจ็บป่วยปัจจุบัน | Detailed symptom narrative |
| Review of Systems | ระบบอวัยวะ | Systematic body system review |

### Tab O: ตรวจร่างกาย (Objective/Examination)

| Field | Thai | Range |
| ----- | ---- | ----- |
| Temperature | อุณหภูมิ | °C |
| Heart Rate | อัตราหัวใจ | bpm |
| Blood Pressure | ความดันโลหิต | systolic/diastolic mmHg |
| Respiratory Rate | อัตราหายใจ | breaths/min |
| SpO2 | ออกซิเจนในเลือด | % |
| Weight | น้ำหนัก | kg |
| Height | ส่วนสูง | cm |
| BMI | ดัชนีมวลกาย | Auto-calculated |
| Physical Examination | การตรวจร่างกาย | Free text |

### Tab A: การวินิจฉัย (Assessment/Diagnosis)

| Field | Description |
| ----- | ----------- |
| Diagnosis list | Multiple diagnoses with ICD-10 codes |
| Primary/Secondary | Toggle for each diagnosis |
| Status | Active / Resolved / Chronic |
| Assessment notes | Clinical assessment narrative |

### Tab P: การรักษา (Plan/Treatment)

| Field | Description |
| ----- | ----------- |
| Treatment Plan | Detailed treatment plan |
| Follow-up Instructions | Follow-up schedule and instructions |
| Prescriptions | Linked prescription data |

---

## 4. Encounter Types

| Type | Thai | Use Case |
| ---- | ---- | -------- |
| consultation | ตรวจทั่วไป (OPD) | Standard outpatient visit |
| follow-up | นัดติดตาม | Follow-up appointment |
| emergency | ฉุกเฉิน | Emergency consultation |
| procedure | หัตถการ | Medical procedure |

---

## 5. Features

| Feature | Description |
| ------- | ----------- |
| **SOAP format** | 4-tab structured medical record |
| **Auto-save** | Every 30 seconds for drafts |
| **Voice dictation** | Web Speech API toggle for hands-free input |
| **AI Summary** | Gemini generates summary from meeting transcript |
| **Digital signature** | Doctor signs EMR electronically |
| **ICD-10 codes** | Diagnosis coding support |
| **Status tracking** | Draft → Finalized → Amended |
| **Patient instructions** | AI-generated patient-friendly summary |

### 5a. AI-Prefilled SOAP from Meeting Summary

When a meeting summary has been validated (Man-in-the-Loop approved), the EMR Editor opens with AI-generated content pre-filled into SOAP tabs.

```text
┌── AI-Prefilled EMR Editor ───────────────────────────────────┐
│                                                              │
│  🤖 AI Pre-filled from Meeting Summary                       │
│  Source: Gemini 2.5 Flash Lite                              │
│  Meeting: 22 ม.ค. 2569, 09:00-09:45                         │
│  Confidence: 92%                                             │
│                                                              │
│  Tab S (ประวัติ):                                           │
│  ┌─ Pre-filled from patient statements in transcript ───┐    │
│  │ Chief Complaint: ปวดหัว 3 วัน                         │    │
│  │ HPI: ปวดตื้อๆ บริเวณขมับทั้ง 2 ข้าง               │    │
│  │ ⚠️ AI-generated — Doctor review required            │    │
│  └───────────────────────────────────────────────────┘    │
│                                                              │
│  Tab O (ตรวจร่างกาย):                                     │
│  ┌─ Pre-filled from doctor observations in transcript ─┐    │
│  │ Vitals: BP 130/85, HR 78, Temp 36.5°C              │    │
│  │ PE: ไม่พบความผิดปกติ คอแข็ง                     │    │
│  └───────────────────────────────────────────────────┘    │
│                                                              │
│  Tab A (การวินิจฉัย):                                     │
│  ┌─ AI-suggested diagnoses from clinical context ─────┐    │
│  │ Primary: Tension headache (G44.2) ★ 89%           │    │
│  │ DDx: Migraine (G43.9), Cluster (G44.0)           │    │
│  └───────────────────────────────────────────────────┘    │
│                                                              │
│  Tab P (การรักษา):                                         │
│  ┌─ Treatment plan from meeting discussion ──────────┐    │
│  │ Rx: Paracetamol 500mg prn                         │    │
│  │ Lifestyle: ลดความเครียด, พักผ่อนเพียงพอ                │    │
│  │ Follow-up: 2 สัปดาห์                              │    │
│  └───────────────────────────────────────────────────┘    │
│                                                              │
│  [👁️ View Original Transcript] [💬 View Chat Log]            │
│  Each field shows: 🤖 AI-generated badge with confidence %   │
└──────────────────────────────────────────────────────────────┘
```

#### AI Pre-fill Data Sources

| SOAP Tab | AI Source | Data Origin |
| -------- | --------- | ----------- |
| S (Subjective) | Patient statements | Transcript segments tagged 🧑 Patient |
| O (Objective) | Doctor observations | Transcript segments tagged 👨‍⚕️ Doctor + vitals mentioned |
| A (Assessment) | Clinical reasoning | AI analysis of symptoms + medical history |
| P (Plan) | Treatment discussion | Transcript discussion of treatment + follow-up |

### 5b. Voice Dictation (Web Speech API)

Hands-free EMR input using browser-native speech recognition (FREE).

| Feature | Details |
| ------- | ------- |
| Technology | Web Speech API (browser-native, Chrome recommended) |
| Cost | FREE (no API key required) |
| Languages | Thai (th-TH) / English (en-US), switchable |
| Mode | Toggle ON/OFF per SOAP tab field |
| Real-time | Text appears as doctor speaks |
| Punctuation | Automatic punctuation insertion |
| Medical Terms | Trained on medical vocabulary via browser model |
| Error Handling | Edit/correct recognized text inline |
| Confidence | Low-confidence words highlighted for review |

```text
┌── Voice Dictation ─────────────────────────────────────────┐
│                                                              │
│  🎙️ Voice Dictation: [🟢 Active]   Language: [TH ▼]          │
│                                                              │
│  Current field: Chief Complaint (อาการสำคัญ)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ผู้ป่วยมาด้วยอาการปวดหัว 3 วัน... |▋          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [🔴 Stop] [⏸️ Pause] [🗑️ Clear]                              │
└──────────────────────────────────────────────────────────────┘
```

### 5c. Patient Instruction Sheet Generation

AI auto-generates a patient-friendly instruction sheet from the finalized EMR.

```text
┌── Patient Instruction Sheet (ใบแนะนำผู้ป่วย) ───────────────┐
│                                                              │
│  📄 ใบแนะนำผู้ป่วย                                       │
│  Generated by: Gemini 2.5 Flash Lite                        │
│                                                              │
│  🏥 การวินิจฉัย: ปวดศีรษะจากความตึงเครียด                  │
│                                                              │
│  💊 ยาที่สั่ง:                                              │
│  - Paracetamol 500mg เมื่อมีอาการ (ไม่เกิน 3 ครั้ง/วัน)        │
│                                                              │
│  🏠 คำแนะนำการปฏิบัติตัว:                                  │
│  - พักผ่อนให้เพียงพอ                                      │
│  - ลดความเครียดและความกังวล                             │
│  - ออกกำลังกายเบาๆ                                       │
│                                                              │
│  🚩 อาการที่ต้องมาพบแพทย์ทันที:                         │
│  - ปวดหัวรุนแรงขึ้น, ตาพร่า, มีไข้                       │
│                                                              │
│  📅 นัดติดตาม: 2 สัปดาห์                                  │
│                                                              │
│  [✅ อนุมัติ (Approve)] [✏️ แก้ไข (Edit)] [🔄 สร้างใหม่ (Regenerate)]  │
└──────────────────────────────────────────────────────────────┘
```

#### Patient Instruction Sheet Fields

| Field | Thai | Source |
| ----- | ---- | ------ |
| Diagnosis | การวินิจฉัย | EMR Tab A |
| Medications | ยาที่สั่ง | EMR Tab P + Prescriptions |
| Lifestyle Advice | คำแนะนำการปฏิบัติตัว | AI-generated from meeting discussion |
| Red Flags | อาการที่ต้องมาพบแพทย์ | AI-extracted from clinical context |
| Follow-up | นัดติดตาม | EMR Tab P |
| Language | ภาษา | Written in patient-friendly Thai (Plain Language) |

### 5d. Sign & Finalize Flow

Complete flow from doctor signature to patient delivery.

```text
Sign & Finalize Flow:

Step 1: Doctor reviews all SOAP tabs (AI-prefilled or manual)
Step 2: Doctor reviews Patient Instruction Sheet (AI-generated)
Step 3: Doctor validates all content (Man-in-the-Loop)
Step 4: Click "✍️ Sign & Finalize"
Step 5: Digital signature dialog:
        ┌──────────────────────────────────────────────┐
        │ ✍️ Digital Signature                           │
        │ Doctor: พญ.สมเกียรติ รักษาดี                  │
        │ License: ว.12345                              │
        │ Date: 22 ม.ค. 2569, 10:15                     │
        │                                                │
        │ ☑️ I confirm this record is accurate           │
        │ [✍️ Sign] [❌ Cancel]                          │
        └──────────────────────────────────────────────┘
Step 6: EMR status changes: Draft → Finalized
Step 7: System sends to patient:
        → POST /api/patients/:id/health-logs (EMR summary)
        → POST /api/patients/:id/instruction-sheet (Patient Instructions)
        → POST /api/notifications/emr-signed (Notification)
Step 8: Patient receives in their portal:
        → Dashboard: Latest consultation summary card
        → Timeline: New entry with date/doctor/diagnosis
        → Health History: Full EMR record accessible
        → Instruction Sheet: Downloadable PDF
Step 9: Appointment marked as completed
        → PATCH /api/appointments/:id → status: completed
```

---

## 6. Workflows

### Workflow 1: Create EMR After Consultation

```text
Step 1:  Doctor opens EMR Editor for a patient/appointment
Step 2:  Select encounter type (consultation/follow-up/emergency/procedure)
Step 3:  Tab S: Enter chief complaint and history
Step 4:  (Optional) Toggle voice dictation for hands-free input
Step 5:  Tab O: Enter vital signs and physical examination
Step 6:  Tab A: Add diagnoses with ICD-10 codes
Step 7:  Tab P: Enter treatment plan and follow-up instructions
Step 8:  Auto-save runs every 30 seconds
Step 9:  Click "AI Summary" → POST /api/ai/generate-emr-summary
Step 10: Review AI-generated summary (Man-in-the-Loop)
Step 11: Edit as needed
Step 12: Click "Sign & Finalize"
Step 13: Digital signature applied
Step 14: EMR status: Draft → Finalized
Step 15: POST /api/patients/:id/health-logs → Patient health records updated
Step 16: POST /api/notifications/emr-signed → Patient notified
Step 17: PATCH /api/appointments/:id → Appointment marked completed
```

### Workflow 2: AI-Assisted EMR from Meeting Transcript

```text
Step 1: After video meeting ends, AI generates SOAP summary
Step 2: Doctor opens EMR Editor
Step 3: AI content pre-filled into respective SOAP tabs
Step 4: Doctor reviews, edits, and approves each section
Step 5: Man-in-the-Loop: Doctor validates all AI content
Step 6: Final review and sign
```

---

## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/emr` | Create new EMR |
| PUT | `/api/emr/:id` | Update EMR |
| POST | `/api/ai/generate-emr-summary` | AI summary generation from meeting data |
| POST | `/api/patients/:id/health-logs` | Send to patient health logs |
| POST | `/api/notifications/emr-signed` | Notify patient of signed EMR |
| PATCH | `/api/appointments/:id` | Mark appointment completed |
| GET | `/api/meetings/:id/summary` | Get AI meeting summary for pre-fill |
| GET | `/api/meetings/:id/transcript` | Get meeting transcript for reference |
| GET | `/api/meetings/:id/chat` | Get meeting chat messages for reference |
| POST | `/api/patients/:id/instruction-sheet` | Generate Patient Instruction Sheet |
| PUT | `/api/patients/:id/instruction-sheet/:id` | Update Patient Instruction Sheet |
| POST | `/api/emr/:id/sign` | Apply digital signature to EMR |
| POST | `/api/emr/:id/voice-dictation` | Save voice dictation segment |

---

## 8. Meeting-to-EMR Data Flow

```text
Video Meeting (Jitsi)
    │
    ├── Web Speech API → Transcript Segments (Socket.IO → port 3020)
    ├── Chat Messages → Captured via Socket.IO
    └── Meeting Recording → Cloud Storage
    │
    ▼
AI Pipeline (Gemini 2.5 Flash Lite)
    │
    ├── Input: Transcript + Chat + Meeting Metadata
    ├── Output: SOAP Summary (30-min sections for long meetings)
    └── Stored: PostgreSQL (izara_phase1)
    │
    ▼
Man-in-the-Loop Validation (Health Meeting Page)
    │
    ├── ✅ Approve → Pre-fill EMR Editor
    ├── ✏️ Edit → Modify then Pre-fill
    ├── 🔄 Regenerate → Re-run AI Pipeline
    └── ❌ Reject → Manual EMR Entry
    │
    ▼
EMR Editor (AI-Prefilled SOAP Tabs)
    │
    ├── Doctor Reviews & Edits
    ├── Voice Dictation (Web Speech API, FREE)
    ├── Patient Instruction Sheet (AI-generated)
    └── Sign & Finalize
    │
    ▼
Patient Delivery
    │
    ├── Dashboard: Latest consultation card
    ├── Timeline: New health event entry
    ├── Health History: Full EMR record
    └── Instruction Sheet: Downloadable PDF
```

---

## 9. AI Agent Improvement Opportunities

- **Auto-populate**: AI fill SOAP fields from meeting transcript automatically
- **ICD-10 suggestion**: AI suggest diagnosis codes from clinical text
- **Template library**: AI-curated EMR templates by specialty/condition
- **Quality check**: AI verify EMR completeness before finalization
- **Cross-reference**: AI link EMR findings with patient history automatically
- **Smart dictation**: AI auto-correct medical terminology during voice input
- **Instruction personalization**: AI tailor instruction sheets to patient literacy level
- **Multi-section summaries**: AI handle meetings > 30 min with sectioned SOAP notes
- **Confidence visualization**: AI show per-field confidence scores for pre-filled content
