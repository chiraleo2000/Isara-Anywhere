# Izara Telemedicine - Phase 1 Requirements & Implementation Plan

**Version:** 2.0.0  
**Last Updated:** January 19, 2026  
**Status:** 🚧 In Development

---

## 📋 Executive Summary

This document outlines the Phase 1 implementation requirements for Izara Telemedicine based on:
- **Dr. Isara's requirements** (หมออิสระ)
- **P. Beer's technical recommendations** (พี่เบียร์)

### Phase 1 Scope

| Feature | Status | Priority |
|---------|--------|----------|
| Video Meeting + EMR Documentation | ✅ Core | P0 |
| AI Chat Assistant for Doctors | 🚧 In Progress | P0 |
| Man-in-the-Loop Validation UI | 📋 Planned | P0 |
| AI Document/PDF Summarization | 📋 Planned | P1 |
| Patient Instruction Sheet Generation | 📋 Planned | P1 |
| Clinical Decision Support (CDS) | 📋 Planned | P1 |
| PostgreSQL Migration | 🚧 In Progress | P0 |

---

## 1️⃣ Dr. Isara's Requirements (สิ่งที่หมออิสระต้องการ)

### 2.1 Video Call Summary + Patient Instructions

**Requirement:** ในระบบ online Video call อยากให้มีสรุปอาการผู้ป่วยผ่านแพทย์พิมพ์ และสามารถสร้างเอกสารสรุปคำแนะนำ (Patient Instruction) ให้ผู้ป่วยนำกลับไปอ่านได้

**Implementation:**

```typescript
interface PatientInstructionSheet {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  
  // Generated content (AI-assisted, doctor-approved)
  diagnosis: string;
  diagnosisThai: string;
  
  // Medication instructions
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    timing: string;        // ก่อนอาหาร, หลังอาหาร, ก่อนนอน
    duration: string;
    specialInstructions: string;
  }[];
  
  // Self-care instructions
  selfCareInstructions: string[];
  selfCareInstructionsThai: string[];
  
  // Warning signs to watch for
  warningSigns: string[];
  warningSignsThai: string[];
  
  // Follow-up
  followUpDate?: string;
  followUpInstructions?: string;
  
  // Lifestyle recommendations
  dietaryAdvice?: string[];
  exerciseAdvice?: string[];
  
  // Doctor signature
  doctorName: string;
  doctorSignature: string;
  generatedAt: string;
  approvedAt: string;
  
  // PDF URL for download
  pdfUrl?: string;
}
```

**UI Component:** `PatientInstructionEditor.tsx`
- Auto-generates from EMR data + AI
- Doctor reviews and approves before sending
- Generates printable PDF in Thai

### 2.2 AI Pre-Consultation Summary

**Requirement:** มีระบบ AI สามารถช่วยสรุปข้อมูลประวัติผู้ป่วยทั้ง EMR และคำถาม-ตอบก่อนพบผู้ป่วย

**Implementation:**

```typescript
interface PreConsultationSummary {
  patientId: string;
  appointmentId: string;
  
  // Patient overview
  patientSnapshot: {
    name: string;
    age: number;
    gender: string;
    bloodType: string;
    primaryConditions: string[];
    drugAllergies: DrugAllergy[];
  };
  
  // Current visit reason
  currentSymptoms: string[];
  symptomDuration: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  
  // AI Analysis
  aiTriage: {
    suggestedDiagnosis: string[];
    relevantHistory: string[];
    alertFlags: string[];  // Drug allergies, CKD, etc.
    suggestedQuestions: string[];
  };
  
  // Previous visits summary
  recentVisits: {
    date: string;
    diagnosis: string;
    treatment: string;
  }[];
  
  // Lab trends
  labTrends: {
    parameter: string;
    values: { date: string; value: number }[];
    trend: 'improving' | 'stable' | 'worsening';
  }[];
  
  generatedAt: string;
}
```

**Workflow:**
1. Patient books appointment → AI generates pre-summary
2. Doctor opens appointment → Pre-summary displayed
3. Doctor can ask AI follow-up questions
4. AI uses chat history + knowledge base for context

### 2.3 AI Document/PDF Analysis

**Requirement:** อยากให้ AI สามารถช่วยสรุป เอกสารภายนอก เช่น ผลตรวจทางห้องปฏิบัติการ (Lab Results) หรือไฟล์ PDF ที่ผู้ป่วยนำมา

**Implementation:**

```typescript
interface DocumentAnalysisRequest {
  documentType: 'lab_result' | 'medical_record' | 'imaging' | 'other';
  file: File;  // PDF, image
  patientId: string;
  context?: string;  // Doctor's specific questions
}

interface DocumentAnalysisResult {
  id: string;
  documentType: string;
  filename: string;
  
  // AI Extraction
  extractedData: {
    labResults?: LabResult[];
    diagnoses?: string[];
    medications?: string[];
    procedures?: string[];
    vitals?: VitalSigns;
    dates?: string[];
  };
  
  // AI Summary
  summary: string;
  summaryThai: string;
  keyFindings: string[];
  abnormalValues: string[];
  
  // Clinical relevance
  clinicalRelevance: string;
  suggestedActions: string[];
  
  // For CDS
  drugInteractionAlerts?: string[];
  doseAdjustmentAlerts?: string[];
  
  processedAt: string;
}
```

**UI Component:** `DocumentAnalyzer.tsx`
- Drag-and-drop PDF upload
- Real-time AI analysis
- Highlights abnormal values
- Integrates with CDS

### 2.4 Clinical Decision Support (CDS)

**Requirement:** ต้องการระบบ Clinical Decision Support (CDS) ที่ช่วยแพทย์ตัดสินใจ เช่น การปรับยาในผู้ป่วยที่มีโรคซับซ้อน (เช่น เบาหวานร่วมกับโรคไต) โดยอ้างอิงตาม Guideline ทางการแพทย์ล่าสุด (เช่น ปี 2025)

**Implementation:**

```typescript
interface CDSRecommendation {
  id: string;
  type: 'drug_interaction' | 'dose_adjustment' | 'contraindication' | 'guideline_alert';
  severity: 'info' | 'warning' | 'critical';
  
  // Context
  patientId: string;
  conditions: string[];  // e.g., ["Diabetes", "CKD Stage 3b"]
  currentMedications: string[];
  proposedMedication?: string;
  
  // Recommendation
  title: string;
  titleThai: string;
  description: string;
  descriptionThai: string;
  
  // Evidence
  guideline: string;      // e.g., "KDIGO 2024"
  guidelineYear: number;
  evidenceLevel: string;  // A, B, C
  reference: string;
  
  // Action
  suggestedAction: string;
  alternatives?: string[];
  
  // Doctor response (Man-in-the-Loop)
  doctorDecision?: 'accepted' | 'rejected' | 'modified';
  doctorNotes?: string;
  decidedAt?: string;
}
```

**Knowledge Base (2025 Guidelines):**
- KDIGO 2024 CKD-DM Guidelines
- ADA Standards of Care 2025
- Thai Hypertension Society 2024
- Thai DM Guidelines 2024

**Example CDS for PATIENT-ANAN:**
```
⚠️ DOSE ADJUSTMENT ALERT

Patient: นายอนันต์ ขยันเรียน
Conditions: Type 2 DM, CKD Stage 3b (eGFR 38)

Current: Metformin 1000mg BID
Recommendation: Reduce to 500mg BID

Guideline: KDIGO 2024 - "Reduce metformin dose when eGFR 30-45"
Evidence Level: A

[Accept] [Modify] [Reject with reason]
```

### 2.5 Man-in-the-Loop Workflow

**Requirement:** ต้องการรูปแบบการทำงานแบบ "Man in the Loop" คือให้ AI ทำหน้าที่เป็นผู้ช่วย (Assistant/Second Opinion) ในการประมวลผล แต่แพทย์จริงยังคงเป็นผู้ตัดสินใจและตรวจสอบความถูกต้องก่อนส่งข้อมูลถึงคนไข้

**Implementation:**

```typescript
interface ManInTheLoopValidation {
  id: string;
  type: 'emr_summary' | 'patient_instruction' | 'cds_recommendation' | 'diagnosis_suggestion';
  
  // AI Output
  aiGeneratedContent: string;
  aiConfidence: number;  // 0-100%
  
  // Doctor Review
  status: 'pending_review' | 'approved' | 'rejected' | 'modified';
  doctorId: string;
  doctorModifications?: string;
  doctorNotes?: string;
  reviewedAt?: string;
  
  // Final Output
  finalContent: string;
  sentToPatient: boolean;
  sentAt?: string;
}
```

**UI Pattern:**
1. AI generates content → Yellow "Pending Review" badge
2. Doctor reviews → Can edit inline
3. Doctor clicks "Approve" → Green "Approved" badge
4. Only approved content sent to patient

---

## 2️⃣ P. Beer's Technical Recommendations (สิ่งที่พี่เบียร์แนะนำ)

### 3.1 PostgreSQL Database

**Recommendation:** ให้ฐานข้อมูลใช้ postgres แทนใช้บน cloud

**Implementation:**
- 5 PostgreSQL databases matching GCS bucket structure
- Local: PostgreSQL 18 + pgAdmin4
- Cloud: Google CloudSQL

| Database | Purpose | Tables |
|----------|---------|--------|
| izara-users-credentials | Auth | users, sessions |
| izara-patients-data | PHR | patient_profiles, phr, vital_signs, living_wills |
| izara-doctors-data | Doctors | doctor_profiles, consultants, meeting_records |
| izara-appointments | Clinical | appointments, emr, prescriptions, lab_orders |
| izara-meta-data | Reference | medical_content, clinical_resources, icd10_codes, drugs |

### 3.2 Meeting Transcription Backend

**Recommendation:** ควรมีระบบ transcript หลังบ้านใน meeting และสามารถหาแนวทางประเมินช่วงเวลาและสคริปให้ AI สรุป อาการของผู้ป่วย

**Implementation:**
- Primary: Web Speech API (FREE, browser-native)
- Fallback: Google Cloud Speech-to-Text (paid, higher accuracy)
- 30-minute section summaries for long consultations

```typescript
interface MeetingTranscription {
  appointmentId: string;
  
  // Real-time transcription
  segments: {
    speaker: 'doctor' | 'patient' | 'guest';
    text: string;
    timestamp: string;
    confidence: number;
  }[];
  
  // Section summaries (every 30 minutes)
  sectionSummaries: {
    sectionNumber: number;
    startTime: string;
    endTime: string;
    summary: string;
    keyPoints: string[];
  }[];
  
  // Final summary
  finalSummary: string;
  clinicalNotes: string;
  
  // Status
  status: 'recording' | 'processing' | 'completed';
}
```

### 3.3 AI Assistant with Knowledge Base

**Recommendation:** ระบบ chat หลังบ้านสำหรับ AI-Assistance ควรมี knowledge data, system prompt และ chat history ไว้สำหรับเสริมความฉลาดและช่วยเหลือหมอในฝั่งเอกสารได้

**Implementation:**

```typescript
// System prompt for Doctor AI Assistant
const DOCTOR_AI_SYSTEM_PROMPT = `
คุณเป็นผู้ช่วยแพทย์ AI ของระบบ Izara Telemedicine
หน้าที่: ช่วยเหลือแพทย์ในการวิเคราะห์ข้อมูลผู้ป่วย

กฎสำคัญ:
1. คุณเป็น "ผู้ช่วย" เท่านั้น ไม่ใช่ผู้ตัดสินใจ
2. แพทย์เป็นผู้ตัดสินใจสุดท้ายเสมอ
3. อ้างอิง Guidelines ล่าสุด (ปี 2024-2025)
4. แจ้งเตือนเมื่อพบ Drug Interaction หรือ Dose Adjustment
5. ใช้ภาษาทางการแพทย์ที่ถูกต้อง

Knowledge Base:
- KDIGO 2024 Guidelines (CKD-DM)
- ADA Standards of Care 2025
- Thai Hypertension Guidelines 2024
- Thai DM Guidelines 2024
- Drug Database with interactions
`;

interface AIAssistantContext {
  systemPrompt: string;
  knowledgeBase: string[];  // Retrieved from vector store
  chatHistory: ChatMessage[];
  patientContext?: PatientSummary;
  appointmentContext?: AppointmentSummary;
}
```

**RAG Pipeline:**
1. User query → Generate embedding
2. Search knowledge base (pgvector)
3. Retrieve relevant guidelines
4. Augment prompt with context
5. Generate response
6. Save to chat history

### 3.4 Model Fine-tuning (Future)

**Recommendation:** มีระบบที่อาจมา Fine-tune Gemini LLM model ได้ให้ทำงานเฉพาะทางในโปรเจคนี้ได้

**Implementation (Phase 2):**
- Collect anonymized doctor-approved outputs
- Create training dataset
- Fine-tune Gemini for Thai medical domain
- Improve: ICD coding, drug dosing, Thai medical terminology

### 3.5 Web Speech API for Mobile

**Recommendation:** แนะนำให้ใช้ฟีเจอร์ Speech-to-Text ที่มีอยู่แล้วบนอุปกรณ์ Mobile (ซึ่งใช้งานได้ฟรีและมีประสิทธิภาพดี)

**Implementation:**

```typescript
const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const startListening = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'th-TH';  // Thai
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      setTranscript(result[0].transcript);
    };
    
    recognition.start();
    setIsListening(true);
  };
  
  return { transcript, isListening, startListening, stopListening };
};
```

---

## 3️⃣ Phase 1 Deliverables

### 4.1 Video Meeting + EMR (P0)

- [x] Jitsi Meet integration with lobby
- [x] Doctor as HOST control
- [x] Guest invite system
- [ ] Real-time transcription (Web Speech API)
- [ ] EMR documentation during call
- [ ] AI meeting summary (post-call)

### 4.2 AI Chat Assistant (P0)

- [ ] Doctor-facing AI chat panel
- [ ] Knowledge base with 2024-2025 guidelines
- [ ] Chat history persistence
- [ ] Context-aware responses
- [ ] Man-in-the-Loop validation UI

### 4.3 Patient Instruction Sheet (P1)

- [ ] Auto-generation from EMR
- [ ] Thai language support
- [ ] Medication instruction formatting
- [ ] PDF export
- [ ] Doctor approval workflow

### 4.4 Document Analysis (P1)

- [ ] PDF upload and processing
- [ ] Lab result extraction
- [ ] AI summarization
- [ ] Integration with CDS

### 4.5 Clinical Decision Support (P1)

- [ ] Drug interaction checking
- [ ] Dose adjustment for CKD/elderly
- [ ] Guideline-based alerts
- [ ] Doctor decision logging

---

## 4️⃣ Test Users

### Patient Portal

| Email | Password | Thai Name | Conditions |
|-------|----------|-----------|------------|
| Somchai.Mankong@gmail.com | P@ssw0rd | นายสมชาย มั่นคง | Hypertension (new patient) |
| Anan.Khayanrian@gmail.com | P@ssw0rd | นายอนันต์ ขยันเรียน | DM + CKD Stage 3b (complex) |

### Doctor Portal

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin.test@izara.com | IzaraAdmin@2024 | Admin | Full system |
| doctor.test@izara.com | IzaraDoctor@2024 | Doctor | Clinical workflows |

---

## 5️⃣ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IZARA TELEMEDICINE PHASE 1                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  PATIENT PORTAL  │    │  DOCTOR PORTAL   │    │   AI SERVICES    │  │
│  │  (Port 3004/5)   │    │  (Port 3010-12)  │    │                  │  │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤  │
│  │ • Appointments   │    │ • EMR Editor     │    │ • Gemini 3 Flash │  │
│  │ • PHR Access     │    │ • AI Assistant   │◀───│ • RAG Pipeline   │  │
│  │ • Video Meeting  │◀──▶│ • CDS Alerts     │    │ • Knowledge Base │  │
│  │ • Instructions   │    │ • Doc Analysis   │    │ • Embeddings     │  │
│  └────────┬─────────┘    └────────┬─────────┘    └──────────────────┘  │
│           │                       │                                      │
│           └───────────┬───────────┘                                      │
│                       │                                                  │
│           ┌───────────▼───────────┐                                      │
│           │   POSTGRESQL + pgvector                                      │
│           ├───────────────────────┤                                      │
│           │ izara-users-credentials                                      │
│           │ izara-patients-data   │◀── PHR, Vitals, Living Will          │
│           │ izara-doctors-data    │◀── Profiles, Meeting Records         │
│           │ izara-appointments    │◀── EMR, Prescriptions, Labs          │
│           │ izara-meta-data       │◀── Guidelines, Drug DB, ICD-10       │
│           └───────────────────────┘                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**End of Phase 1 Requirements Document**
