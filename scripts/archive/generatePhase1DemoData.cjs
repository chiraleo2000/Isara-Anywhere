/**
 * ================================================================================
 * IZARA TELEMEDICINE PLATFORM - PHASE 1 COMPREHENSIVE DEMO DATA GENERATOR
 * ================================================================================
 *
 * This script generates comprehensive mock data for Phase 1 features:
 * - AI Assistant chat history
 * - Pre-consultation summaries
 * - Clinical Decision Support (CDS) logs
 * - Meeting transcripts and AI summaries
 * - Document analysis results
 * - Patient instruction sheets
 * - Knowledge base for RAG
 *
 * Based on requirements from Dr. Isara and P. Beer:
 * 2.1 Video call summary + Patient instruction sheets
 * 2.2 AI pre-consultation summary
 * 2.3 AI document/PDF analysis
 * 2.4 Clinical Decision Support (CDS)
 * 2.5 Man-in-the-Loop validation
 *
 * Usage: node scripts/generators/generatePhase1DemoData.cjs
 *
 * @author Izara Development Team
 * @version 1.0.0
 * @date January 2026
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const BUCKETS = {
  AUTH: 'izara-users-credentials',
  DOCTOR: 'izara-doctors-data',
  PATIENT: 'izara-patients-data',
  APPOINTMENTS: 'izara-appointments',
  METADATA: 'izara-meta-data'
};

// Demo User IDs
const USERS = {
  patient001: {
    id: 'PATIENT-001',
    name: 'Demo Test User',
    nameThai: 'นาย ทดสอบ ระบบ',
    email: 'demo.test@gmail.com'
  },
  patientSomchai: {
    id: 'PATIENT-SOMCHAI',
    name: 'Somchai Mankong',
    nameThai: 'นายสมชาย มั่นคง',
    email: 'Somchai.Mankong@gmail.com'
  },
  patientAnan: {
    id: 'PATIENT-ANAN',
    name: 'Anan Khayanrian',
    nameThai: 'นายอนันต์ ขยันเรียน',
    email: 'Anan.Khayanrian@gmail.com'
  },
  doctor: {
    id: 'DOC-001',
    name: 'Dr. Test Doctor',
    nameThai: 'นพ. ทดสอบ แพทย์',
    email: 'doctor.test@izara.com'
  },
  admin: {
    id: 'ADMIN-001',
    name: 'Admin Test',
    nameThai: 'ผู้ดูแลระบบ ทดสอบ',
    email: 'admin.test@izara.com'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJSON(subDir, filename, data) {
  const filePath = path.join(OUTPUT_DIR, subDir, filename);
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✅ Generated: ${subDir}/${filename}`);
}

function getDateString(daysFromNow = 0, hoursFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// AI CHAT HISTORY (Per P.Beer 3.3: knowledge data, system prompt, chat history)
// ============================================================================

function generateAIChatHistory() {
  console.log('\n📝 Generating AI Chat History for Doctor Portal...');
  
  const chatSessions = [
    // Session 1: Pre-consultation summary for complex patient (PATIENT-ANAN)
    {
      sessionId: 'AI-CHAT-SESSION-001',
      doctorId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      appointmentId: 'APT-ANAN-001',
      sessionType: 'pre_consultation',
      createdAt: getDateString(-1, -2),
      messages: [
        {
          id: generateUUID(),
          role: 'system',
          content: `คุณคือผู้ช่วยแพทย์ AI ของระบบ Izara Telemedicine สำหรับการให้คำปรึกษาทางการแพทย์
กรุณาช่วยสรุปข้อมูลผู้ป่วยและให้คำแนะนำทางคลินิกตาม Guidelines ล่าสุด (2024-2025)
ข้อมูลควรเป็นภาษาไทยเป็นหลัก พร้อมคำศัพท์ทางการแพทย์ภาษาอังกฤษกำกับ`,
          timestamp: getDateString(-1, -2)
        },
        {
          id: generateUUID(),
          role: 'user',
          content: `สรุปข้อมูลผู้ป่วยก่อนพบ: นายอนันต์ ขยันเรียน (PATIENT-ANAN)
- ผู้ป่วยอายุ 67 ปี มานัดติดตามโรคเบาหวานและโรคไตเรื้อรัง
- กรุณาสรุปประวัติการรักษา ยาปัจจุบัน และข้อควรระวัง`,
          timestamp: getDateString(-1, -2),
          context: {
            patientId: 'PATIENT-ANAN',
            appointmentId: 'APT-ANAN-001',
            queryType: 'pre_consultation_summary'
          }
        },
        {
          id: generateUUID(),
          role: 'assistant',
          content: `## 📋 สรุปข้อมูลผู้ป่วยก่อนการนัดพบ

### ข้อมูลทั่วไป
- **ชื่อ**: นายอนันต์ ขยันเรียน (PATIENT-ANAN)
- **อายุ**: 67 ปี
- **น้ำหนัก/ส่วนสูง**: 72 kg / 165 cm (BMI: 26.4)

### โรคประจำตัว (Chronic Conditions)
1. **เบาหวานชนิดที่ 2** (Type 2 DM) - วินิจฉัย 12 ปี
   - HbA1c ล่าสุด: 7.8% (เป้าหมาย <7.5% สำหรับผู้สูงอายุ)
   - FBS ล่าสุด: 185 mg/dL (ยังสูงกว่าเป้าหมาย)
   
2. **โรคไตเรื้อรังระยะ 3b** (CKD Stage 3b)
   - eGFR: 38 mL/min/1.73m² (ลดลงจาก 42)
   - ต้องระวังการปรับยาตามการทำงานของไต

3. **ความดันโลหิตสูง** - ควบคุมได้ดี
   - BP ล่าสุด: 142/88 mmHg

### ⚠️ ข้อควรระวังสำคัญ
1. **แพ้ยา Sulfonamides รุนแรง** (ประวัติ Stevens-Johnson Syndrome)
2. **ต้องปรับขนาดยา Metformin** ตาม eGFR
3. **งดใช้ NSAIDs** เพราะอาจทำให้ไตเสื่อมเร็วขึ้น

### 💊 ยาปัจจุบัน
1. Metformin 500mg วันละ 2 ครั้ง (ควรพิจารณาลดขนาด)
2. Glipizide 5mg ก่อนอาหารเช้า
3. Enalapril 10mg วันละครั้ง
4. Amlodipine 5mg วันละครั้ง
5. Atorvastatin 20mg ก่อนนอน

### 📊 ผลตรวจล่าสุด (17 ม.ค. 2026)
- Creatinine: 1.8 mg/dL (↑)
- BUN: 32 mg/dL (↑)
- Potassium: 5.1 mEq/L (ขอบบน)
- HbA1c: 7.8%

### 📝 ข้อเสนอแนะ (Man-in-the-Loop: รอการยืนยันจากแพทย์)
1. พิจารณาลด Metformin เหลือ 500mg วันละ 1 ครั้ง ตาม KDIGO 2024 Guidelines
2. เพิ่มขนาด Enalapril เป็น 20mg หาก BP ยังสูง
3. ติดตาม K+ ใกล้ชิดเนื่องจากใช้ ACE inhibitor

⚕️ *ข้อมูลนี้สร้างโดย AI - กรุณาตรวจสอบและยืนยันก่อนใช้ในการรักษา*`,
          timestamp: getDateString(-1, -1, -55),
          aiMetadata: {
            model: 'gemini-1.5-flash',
            tokensUsed: 1250,
            guidlinesReferenced: ['KDIGO 2024', 'ADA 2025', 'Thai Hypertension Guideline 2024'],
            confidence: 0.92
          }
        },
        {
          id: generateUUID(),
          role: 'user',
          content: 'มี drug interaction ที่ต้องระวังไหม? โดยเฉพาะระหว่าง Metformin กับยาอื่น?',
          timestamp: getDateString(-1, -1, -50)
        },
        {
          id: generateUUID(),
          role: 'assistant',
          content: `## ⚠️ Drug Interactions ที่ต้องระวัง

### 1. Metformin + CKD (eGFR 38)
- **ความเสี่ยง**: Lactic acidosis (ภาวะกรดในเลือด)
- **คำแนะนำ KDIGO 2024**: 
  - eGFR 30-45: ลดขนาดยา 50% (500mg OD แทน BID)
  - eGFR <30: หยุดใช้ Metformin
- **สถานะปัจจุบัน**: eGFR 38 → ควรลดขนาดยา

### 2. Enalapril (ACE-I) + CKD + K+ 5.1
- **ความเสี่ยง**: Hyperkalemia (K+ สูง)
- **คำแนะนำ**: 
  - ติดตาม K+ ทุก 2-4 สัปดาห์หลังปรับยา
  - หยุดยาถ้า K+ >5.5 mEq/L
  - แนะนำอาหาร Low Potassium Diet

### 3. Glipizide + ผู้สูงอายุ + CKD
- **ความเสี่ยง**: Hypoglycemia รุนแรง
- **คำแนะนำ**:
  - ยา Glipizide ขับออกทางไต 80%
  - ควรพิจารณาลดขนาดหรือเปลี่ยนเป็น Linagliptin (ขับออกทางน้ำดี)

### 4. Atorvastatin + CKD
- ✅ ใช้ได้อย่างปลอดภัย ไม่ต้องปรับขนาด
- ช่วยลด CV risk ใน CKD patients

### 📊 Clinical Decision Support Alert
\`\`\`
⚠️ ALERT: Metformin dose adjustment required
   Current: 500mg BID
   Recommended: 500mg OD (50% reduction)
   Reason: eGFR 38 (CKD Stage 3b)
   Guideline: KDIGO 2024
\`\`\`

⚕️ *แพทย์กรุณายืนยันการปรับยาก่อนบันทึกลงระบบ (Man-in-the-Loop)*`,
          timestamp: getDateString(-1, -1, -45),
          aiMetadata: {
            model: 'gemini-1.5-flash',
            tokensUsed: 980,
            cdsAlerts: ['METFORMIN_DOSE_ADJUSTMENT', 'HYPERKALEMIA_RISK'],
            confidence: 0.95
          }
        }
      ]
    },
    
    // Session 2: Lab result analysis
    {
      sessionId: 'AI-CHAT-SESSION-002',
      doctorId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      appointmentId: 'APT-ANAN-001',
      sessionType: 'document_analysis',
      createdAt: getDateString(-1, -1),
      messages: [
        {
          id: generateUUID(),
          role: 'system',
          content: 'คุณคือผู้ช่วยแพทย์ AI สำหรับวิเคราะห์ผลตรวจทางห้องปฏิบัติการ',
          timestamp: getDateString(-1, -1)
        },
        {
          id: generateUUID(),
          role: 'user',
          content: `วิเคราะห์ผล Lab ล่าสุดของผู้ป่วย PATIENT-ANAN:
- HbA1c: 7.8%
- FBS: 185 mg/dL
- Creatinine: 1.8 mg/dL
- BUN: 32 mg/dL
- eGFR: 38
- Potassium: 5.1 mEq/L
- Sodium: 138 mEq/L
- Uric Acid: 7.8 mg/dL
- Albumin: 3.4 g/dL
- UACR: 280 mg/g

วิเคราะห์และให้คำแนะนำตาม Guidelines`,
          timestamp: getDateString(-1, -1),
          context: {
            documentType: 'lab_results',
            patientId: 'PATIENT-ANAN'
          }
        },
        {
          id: generateUUID(),
          role: 'assistant',
          content: `## 🔬 ผลวิเคราะห์ Lab Results - นายอนันต์ ขยันเรียน

### 📊 สรุปผลตรวจแบ่งตามระบบ

#### 1. การควบคุมเบาหวาน (Glycemic Control)
| ตัวชี้วัด | ผลตรวจ | ค่าปกติ | สถานะ |
|----------|--------|--------|-------|
| HbA1c | **7.8%** | <7.0% (ผู้สูงอายุ <7.5%) | ⚠️ สูงกว่าเป้า |
| FBS | **185 mg/dL** | 70-100 mg/dL | ⚠️ สูง |

**📝 การแปลผล**: 
- การควบคุมน้ำตาลยังไม่ดีพอ โดยเฉพาะ FBS
- เป้าหมาย HbA1c ในผู้สูงอายุที่มี CKD: 7.0-8.0%
- ควรพิจารณาปรับยาหรือเพิ่มยา

#### 2. การทำงานของไต (Renal Function)
| ตัวชี้วัด | ผลตรวจ | ค่าปกติ | สถานะ |
|----------|--------|--------|-------|
| Creatinine | **1.8 mg/dL** | 0.7-1.2 | ❌ สูง |
| BUN | **32 mg/dL** | 7-20 | ⚠️ สูง |
| eGFR | **38 mL/min** | >90 | ❌ CKD Stage 3b |
| UACR | **280 mg/g** | <30 | ❌ Moderately increased albuminuria |

**📝 การแปลผล**:
- **CKD Stage 3b** (eGFR 30-44) with Albuminuria A3
- **KDIGO Risk**: Very High Risk for ESKD progression
- ต้องปรับขนาดยา Metformin และติดตามใกล้ชิด

#### 3. Electrolytes
| ตัวชี้วัด | ผลตรวจ | ค่าปกติ | สถานะ |
|----------|--------|--------|-------|
| Potassium | **5.1 mEq/L** | 3.5-5.0 | ⚠️ ขอบสูง |
| Sodium | 138 mEq/L | 136-145 | ✅ ปกติ |

**📝 K+ ขอบบน**: ระวัง ACE-I induced hyperkalemia

#### 4. อื่นๆ
| ตัวชี้วัด | ผลตรวจ | ค่าปกติ | สถานะ |
|----------|--------|--------|-------|
| Uric Acid | **7.8 mg/dL** | <7.0 | ⚠️ สูง |
| Albumin | **3.4 g/dL** | 3.5-5.0 | ⚠️ ต่ำเล็กน้อย |

---

### ⚕️ Clinical Recommendations (ตาม Guidelines 2024-2025)

#### 🔴 High Priority Actions
1. **ปรับยา Metformin** → ลดเหลือ 500mg OD (KDIGO 2024)
2. **ติดตาม K+** ใกล้ชิด (ทุก 2 สัปดาห์)
3. **เพิ่ม SGLT2 inhibitor** พิจารณา Dapagliflozin 10mg OD
   - มี Renoprotective effect ใน CKD-DM (CREDENCE Trial)

#### 🟡 Medium Priority
4. พิจารณาลด Glipizide หรือเปลี่ยนเป็น Linagliptin
5. อาหาร Low Potassium + Low Sodium + Low Protein (0.8 g/kg/day)
6. Referral to Nephrologist ถ้า eGFR <30

### 📋 แผนติดตาม
- **Lab F/U 4 สัปดาห์**: Cr, K+, FBS, HbA1c
- **Urine albumin**: ติดตามทุก 6 เดือน
- **eGFR decline**: ถ้าลดลง >5 mL/min/year → Nephrology referral

⚕️ *ข้อมูลนี้ต้องได้รับการตรวจสอบและยืนยันโดยแพทย์ก่อนนำไปใช้*`,
          timestamp: getDateString(-1, -0, -55),
          aiMetadata: {
            model: 'gemini-1.5-flash',
            tokensUsed: 1580,
            labAbnormalities: ['HbA1c_HIGH', 'CREATININE_HIGH', 'EGFR_LOW', 'K_BORDERLINE', 'UACR_HIGH'],
            cdsAlerts: ['METFORMIN_DOSE_ADJUSTMENT', 'ADD_SGLT2I', 'NEPHROLOGY_REFERRAL'],
            confidence: 0.94
          }
        }
      ]
    },
    
    // Session 3: General EMR query for PATIENT-001
    {
      sessionId: 'AI-CHAT-SESSION-003',
      doctorId: USERS.doctor.id,
      patientId: USERS.patient001.id,
      appointmentId: 'APT-DEMO-001',
      sessionType: 'general_query',
      createdAt: getDateString(-5),
      messages: [
        {
          id: generateUUID(),
          role: 'system',
          content: 'คุณคือผู้ช่วยแพทย์ AI ของระบบ Izara Telemedicine',
          timestamp: getDateString(-5)
        },
        {
          id: generateUUID(),
          role: 'user',
          content: 'สรุปประวัติการรักษาของ PATIENT-001 (Demo Test User) ทั้งหมด',
          timestamp: getDateString(-5),
          context: { patientId: 'PATIENT-001' }
        },
        {
          id: generateUUID(),
          role: 'assistant',
          content: `## 📋 สรุปประวัติการรักษา - Demo Test User (PATIENT-001)

### ข้อมูลทั่วไป
- **ชื่อ**: นาย ทดสอบ ระบบ (Demo Test User)
- **อายุ**: 34 ปี
- **เพศ**: ชาย
- **กรุ๊ปเลือด**: O+

### โรคประจำตัว
1. **ความดันโลหิตสูงปฐมภูมิ (Essential Hypertension - I10)**
   - วินิจฉัยครั้งแรก: กันยายน 2025
   - สถานะ: ควบคุมได้ดี

### ประวัติการรักษา (Encounter History)

#### 📅 ครั้งที่ 1 - 6 ก.ย. 2025 (Initial Consultation)
- **Chief Complaint**: ปวดศีรษะเป็นพักๆ, ตรวจพบความดันสูง
- **Vital Signs**: BP 148/92, HR 78
- **Diagnosis**: Essential hypertension - newly diagnosed
- **Treatment**: เริ่ม Amlodipine 5mg OD
- **Lifestyle counseling**: DASH diet, ลดเกลือ, ออกกำลังกาย

#### 📅 ครั้งที่ 2 - 5 ธ.ค. 2025 (Follow-up)
- **Chief Complaint**: มานัดติดตาม
- **Vital Signs**: BP 135/82, HR 72 ✅ ดีขึ้น
- **Status**: ควบคุมได้ดี, ไม่มีผลข้างเคียงจากยา
- **Plan**: Continue Amlodipine, F/U 3 เดือน

### ยาปัจจุบัน
| ยา | ขนาด | วิธีใช้ |
|----|------|-------|
| Amlodipine | 5mg | วันละ 1 ครั้ง เช้า |

### ข้อแนะนำ
- ✅ การรักษาดำเนินไปได้ดี
- ✅ ไม่มี CDS alerts
- 📅 นัดติดตามครั้งถัดไป: มีนาคม 2026

*สร้างโดย AI Assistant - ข้อมูล ณ วันที่สอบถาม*`,
          timestamp: getDateString(-5),
          aiMetadata: {
            model: 'gemini-1.5-flash',
            tokensUsed: 680,
            confidence: 0.96
          }
        }
      ]
    }
  ];
  
  // Save to izara-doctors-data
  writeJSON(BUCKETS.DOCTOR, 'ai-chat-history/sessions.json', chatSessions);
  
  // Also save individual session files
  chatSessions.forEach(session => {
    writeJSON(BUCKETS.DOCTOR, `ai-chat-history/${session.sessionId}.json`, session);
  });
  
  return chatSessions;
}

// ============================================================================
// CLINICAL DECISION SUPPORT (CDS) LOGS
// ============================================================================

function generateCDSLogs() {
  console.log('\n⚕️ Generating Clinical Decision Support Logs...');
  
  const cdsLogs = [
    {
      id: 'CDS-LOG-001',
      doctorId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      appointmentId: 'APT-ANAN-001',
      cdsType: 'dose_adjustment',
      alertLevel: 'high',
      drugName: 'Metformin',
      currentDose: '500mg BID',
      recommendedDose: '500mg OD',
      recommendation: 'ลดขนาดยา Metformin 50% เนื่องจาก eGFR ลดลงเหลือ 38 mL/min (CKD Stage 3b)',
      recommendationThai: 'แนะนำลดขนาดยา Metformin จาก 500mg วันละ 2 ครั้ง เหลือ 500mg วันละ 1 ครั้ง',
      clinicalRationale: 'eGFR 38 indicates CKD Stage 3b. According to KDIGO 2024 Guidelines, Metformin should be reduced by 50% when eGFR is 30-45. Risk of lactic acidosis increases with declining kidney function.',
      guidelinesReferenced: [
        { name: 'KDIGO 2024 CKD-DM Guidelines', section: '4.2.1', recommendation: 'Reduce Metformin dose by 50% when eGFR 30-45' },
        { name: 'ADA Standards of Care 2025', section: '9', recommendation: 'Review metformin dosing based on renal function' }
      ],
      doctorDecision: 'accepted',
      doctorNotes: 'เห็นด้วยกับคำแนะนำ จะปรับยา Metformin เหลือ 500mg OD และติดตาม Cr ใกล้ชิด',
      decidedAt: getDateString(-1),
      createdAt: getDateString(-1, -2)
    },
    {
      id: 'CDS-LOG-002',
      doctorId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      appointmentId: 'APT-ANAN-001',
      cdsType: 'drug_interaction',
      alertLevel: 'medium',
      drugName: 'Enalapril',
      interactsWith: ['Potassium levels', 'CKD'],
      recommendation: 'ติดตามระดับ Potassium ใกล้ชิด เนื่องจากใช้ ACE inhibitor ในผู้ป่วย CKD',
      recommendationThai: 'แนะนำตรวจติดตามระดับโพแทสเซียมในเลือดทุก 2-4 สัปดาห์',
      clinicalRationale: 'Current K+ is 5.1 mEq/L (upper normal limit). ACE inhibitors can cause hyperkalemia, especially in CKD patients. Risk is higher when eGFR <45.',
      guidelinesReferenced: [
        { name: 'Thai Hypertension Guideline 2024', section: '7.3', recommendation: 'Monitor K+ closely when using RAAS blockers in CKD' }
      ],
      doctorDecision: 'accepted',
      doctorNotes: 'จะ F/U K+ ใน 2 สัปดาห์ และแนะนำให้ผู้ป่วยงดอาหารที่มี K+ สูง',
      decidedAt: getDateString(-1),
      createdAt: getDateString(-1, -2)
    },
    {
      id: 'CDS-LOG-003',
      doctorId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      appointmentId: 'APT-ANAN-001',
      cdsType: 'guideline_alert',
      alertLevel: 'medium',
      recommendation: 'พิจารณาเพิ่ม SGLT2 inhibitor (เช่น Dapagliflozin) สำหรับ CKD-DM patient',
      recommendationThai: 'แนะนำเพิ่มยา SGLT2 inhibitor เพื่อชะลอการเสื่อมของไต',
      clinicalRationale: 'SGLT2 inhibitors have proven renal protective effects in diabetic kidney disease (CREDENCE, DAPA-CKD trials). Indicated when UACR >30 and eGFR >20.',
      guidelinesReferenced: [
        { name: 'KDIGO 2024 DKD Guidelines', section: '3.1', recommendation: 'Use SGLT2i for DKD with eGFR ≥20' },
        { name: 'ADA 2025 Standards of Care', section: '11.5', recommendation: 'SGLT2i preferred for T2DM with CKD' }
      ],
      suggestedMedication: {
        name: 'Dapagliflozin',
        dose: '10mg',
        frequency: 'Once daily',
        route: 'Oral'
      },
      doctorDecision: 'deferred',
      doctorNotes: 'จะพิจารณาเพิ่มหลังจากปรับยาปัจจุบันให้เสถียรก่อน และดูผล eGFR ใน 1 เดือน',
      decidedAt: getDateString(-1),
      createdAt: getDateString(-1, -2)
    }
  ];
  
  writeJSON(BUCKETS.DOCTOR, 'cds-logs/cds-logs.json', cdsLogs);
  
  return cdsLogs;
}

// ============================================================================
// MEETING TRANSCRIPTS & AI SUMMARIES
// ============================================================================

function generateMeetingRecords() {
  console.log('\n📹 Generating Meeting Transcripts & AI Summaries...');
  
  const meetingRecords = [
    {
      id: 'MEETING-RECORD-001',
      appointmentId: 'APT-COMPLETED-001',
      doctorId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      meetingDate: getDateString(-1),
      duration: 25, // minutes
      recordingUrl: 'gs://izara-doctors-data/meetings/MEETING-RECORD-001/recording.webm',
      transcriptStatus: 'completed',
      transcript: `[00:00] แพทย์: สวัสดีครับคุณอนันต์ สบายดีไหมครับ
[00:05] ผู้ป่วย: สวัสดีครับหมอ ก็พอไปได้ครับ แต่เหนื่อยง่ายกว่าเดิม
[00:12] แพทย์: เหนื่อยง่ายแบบไหนครับ ตอนทำอะไรถึงรู้สึกเหนื่อย
[00:18] ผู้ป่วย: ก็แค่เดินขึ้นบันไดก็เหนื่อยแล้วครับ แต่ก่อนไม่เป็นแบบนี้
[00:28] แพทย์: แล้วน้ำตาลเป็นยังไงบ้างครับ วัดที่บ้านได้เท่าไหร่
[00:35] ผู้ป่วย: ตอนเช้าก่อนกินข้าวได้ประมาณ 180-190 ครับ ยังสูงอยู่
[00:45] แพทย์: ครับ ผมดูผล Lab ที่เจาะมาแล้ว HbA1c ได้ 7.8% ยังสูงกว่าเป้าหมายอยู่นิดหน่อย
[01:00] แพทย์: แล้วเรื่องไตด้วยครับ eGFR ลดลงมาอยู่ที่ 38 ต้องระวังเรื่องยานิดนึง
[01:15] ผู้ป่วย: แย่ไหมครับหมอ ไตผมจะพังไหม
[01:20] แพทย์: ไม่ต้องกังวลมากครับ เรายังควบคุมได้ แต่ต้องปรับยา Metformin ลดลงหน่อย
[01:35] แพทย์: จากวันละ 2 เม็ด เหลือวันละ 1 เม็ดครับ เพื่อไม่ให้เป็นภาระกับไต
[01:50] ผู้ป่วย: ครับหมอ แล้วยาลดความดันยังใช้เหมือนเดิมไหมครับ
[02:00] แพทย์: ความดันยังสูงนิดหน่อยครับ 142/88 ยังใช้ยาเดิมไปก่อน แต่ต้องติดตามโพแทสเซียมในเลือด
...
[23:00] แพทย์: สรุปนะครับ ลด Metformin เหลือวันละ 1 เม็ด ยาอื่นใช้เหมือนเดิม กินอาหารจืด งดผลไม้ที่มี K+ สูง
[23:30] แพทย์: นัดเจาะเลือดติดตามใน 2 สัปดาห์ แล้วมาพบหมออีกทีใน 1 เดือนครับ
[24:00] ผู้ป่วย: ขอบคุณครับหมอ
[24:05] แพทย์: ยินดีครับ ดูแลสุขภาพด้วยนะครับ`,
      
      aiSummary: {
        status: 'approved',
        approvedBy: USERS.doctor.id,
        approvedAt: getDateString(-1),
        summary: `## สรุปการนัดพบแพทย์ - นายอนันต์ ขยันเรียน

### อาการสำคัญที่ผู้ป่วยแจ้ง
- เหนื่อยง่ายกว่าเดิม โดยเฉพาะเมื่อเดินขึ้นบันได
- น้ำตาลในเลือดตอนเช้ายังสูง (180-190 mg/dL)

### ผลตรวจที่พิจารณา
- HbA1c: 7.8% (สูงกว่าเป้าหมาย)
- eGFR: 38 mL/min (CKD Stage 3b)
- BP: 142/88 mmHg

### การปรับยา
1. **Metformin**: ลดจาก 500mg วันละ 2 ครั้ง → 500mg วันละ 1 ครั้ง

### คำแนะนำ
- กินอาหารจืด ลดเค็ม
- งดผลไม้ที่มี Potassium สูง (กล้วย ส้ม)
- ออกกำลังกายเบาๆ ตามความสามารถ

### แผนติดตาม
- เจาะเลือดติดตาม K+, Cr ใน 2 สัปดาห์
- นัดพบแพทย์ใน 1 เดือน`,
        summaryThai: `สรุป: ผู้ป่วยเบาหวานร่วมโรคไตเรื้อรังมานัดติดตาม มีอาการเหนื่อยง่าย น้ำตาลยังควบคุมได้ไม่ดี ไตทำงานลดลง จึงปรับลดยา Metformin และนัดติดตามใกล้ชิด`
      },
      
      sections: [
        {
          sectionNumber: 1,
          startTime: '00:00',
          endTime: '10:00',
          summary: 'สอบถามอาการ ผู้ป่วยมีอาการเหนื่อยง่ายกว่าเดิม น้ำตาลที่วัดที่บ้านยังสูง 180-190',
          keyPoints: ['Fatigue increased', 'FBS at home: 180-190']
        },
        {
          sectionNumber: 2,
          startTime: '10:00',
          endTime: '20:00',
          summary: 'ทบทวนผลแล็บ พบ HbA1c 7.8%, eGFR 38 แนะนำปรับยา Metformin',
          keyPoints: ['HbA1c 7.8%', 'eGFR 38 - CKD Stage 3b', 'Reduce Metformin dose']
        },
        {
          sectionNumber: 3,
          startTime: '20:00',
          endTime: '25:00',
          summary: 'สรุปแผนการรักษา นัดเจาะเลือด 2 สัปดาห์ พบแพทย์ 1 เดือน',
          keyPoints: ['Follow-up labs in 2 weeks', 'Next appointment in 1 month']
        }
      ],
      
      aiRecommendations: `### Clinical Recommendations from Meeting

1. **Medication Adjustment**: Reduce Metformin to 500mg OD due to declining renal function
2. **Monitoring**: Follow-up K+ and Creatinine in 2 weeks
3. **Lifestyle**: Low potassium diet, moderate exercise as tolerated
4. **Referral**: Consider nephrology referral if eGFR continues to decline`,
      
      createdAt: getDateString(-1)
    }
  ];
  
  // Save to izara-doctors-data
  writeJSON(BUCKETS.DOCTOR, 'meeting-records/meeting-records.json', meetingRecords);
  
  // Also save individual meeting files
  meetingRecords.forEach(record => {
    writeJSON(BUCKETS.DOCTOR, `meeting-records/${record.id}.json`, record);
  });
  
  return meetingRecords;
}

// ============================================================================
// PATIENT INSTRUCTION SHEETS (Per Dr. Isara 2.1)
// ============================================================================

function generatePatientInstructions() {
  console.log('\n📄 Generating Patient Instruction Sheets...');
  
  const patientInstructions = [
    {
      id: 'PI-ANAN-001',
      appointmentId: 'APT-COMPLETED-001',
      patientId: USERS.patientAnan.id,
      doctorId: USERS.doctor.id,
      createdAt: getDateString(-1),
      status: 'sent',
      sentAt: getDateString(-1),
      language: 'th',
      
      content: {
        header: {
          hospitalName: 'Izara Telemedicine Clinic',
          hospitalNameThai: 'คลินิกไอซาร่า เทเลเมดิซีน',
          doctorName: 'นพ. ทดสอบ แพทย์',
          patientName: 'นายอนันต์ ขยันเรียน',
          visitDate: getDateString(-1).split('T')[0]
        },
        
        diagnosis: {
          primary: 'โรคเบาหวานชนิดที่ 2 ร่วมกับโรคไตเรื้อรังระยะ 3b',
          primaryEnglish: 'Type 2 Diabetes Mellitus with CKD Stage 3b',
          icdCodes: ['E11.65', 'N18.4']
        },
        
        medications: [
          {
            name: 'Metformin 500 mg',
            nameThai: 'เมทฟอร์มิน 500 มก.',
            dose: '1 เม็ด',
            frequency: 'วันละ 1 ครั้ง หลังอาหารเช้า',
            instruction: 'กินหลังอาหารเช้าทันที ห้ามกินตอนท้องว่าง',
            duration: 'ใช้ต่อเนื่อง',
            sideEffects: 'อาจมีอาการท้องไส้ปั่นป่วนช่วงแรก',
            changed: true,
            changeNote: '⚠️ ลดจากวันละ 2 ครั้ง เหลือวันละ 1 ครั้ง'
          },
          {
            name: 'Glipizide 5 mg',
            nameThai: 'กลิพิไซด์ 5 มก.',
            dose: '1 เม็ด',
            frequency: 'วันละ 1 ครั้ง ก่อนอาหารเช้า 30 นาที',
            instruction: 'กินก่อนอาหารเช้า 30 นาที',
            duration: 'ใช้ต่อเนื่อง',
            sideEffects: 'ระวังน้ำตาลต่ำ ถ้ามีอาการใจสั่น เหงื่อออก ให้ดื่มน้ำหวานทันที'
          },
          {
            name: 'Enalapril 10 mg',
            nameThai: 'อีนาลาพริล 10 มก.',
            dose: '1 เม็ด',
            frequency: 'วันละ 1 ครั้ง เช้า',
            instruction: 'กินตอนเช้าพร้อมอาหารหรือหลังอาหาร',
            duration: 'ใช้ต่อเนื่อง'
          },
          {
            name: 'Amlodipine 5 mg',
            nameThai: 'แอมโลดิพีน 5 มก.',
            dose: '1 เม็ด',
            frequency: 'วันละ 1 ครั้ง เช้า',
            instruction: 'กินตอนเช้าพร้อมยาความดันตัวอื่น',
            duration: 'ใช้ต่อเนื่อง'
          },
          {
            name: 'Atorvastatin 20 mg',
            nameThai: 'อะทอร์วาสแตติน 20 มก.',
            dose: '1 เม็ด',
            frequency: 'วันละ 1 ครั้ง ก่อนนอน',
            instruction: 'กินก่อนนอนทุกวัน',
            duration: 'ใช้ต่อเนื่อง'
          }
        ],
        
        lifestyleAdvice: [
          {
            category: 'อาหาร',
            advice: [
              'ลดอาหารเค็ม - ไม่เติมเกลือ/น้ำปลา และหลีกเลี่ยงอาหารหมักดอง',
              'จำกัดโปรตีนต่อวัน - ไม่ควรกินเนื้อสัตว์เกิน 4 ช้อนโต๊ะต่อมื้อ',
              'หลีกเลี่ยงผลไม้ที่มีโพแทสเซียมสูง - งดกล้วย ส้ม มะม่วงสุก ทุเรียน',
              'กินผักใบเขียวได้ แต่ต้มน้ำทิ้งก่อนปรุง',
              'งดน้ำหวาน น้ำอัดลม และขนมหวาน'
            ]
          },
          {
            category: 'การออกกำลังกาย',
            advice: [
              'ออกกำลังกายเบาๆ เช่น เดินช้าๆ วันละ 20-30 นาที',
              'หลีกเลี่ยงการออกกำลังกายหนัก',
              'ถ้าเหนื่อยมากให้หยุดพัก'
            ]
          },
          {
            category: 'การติดตามอาการ',
            advice: [
              'วัดน้ำตาลที่บ้านทุกเช้าก่อนอาหาร จดค่าไว้',
              'วัดความดันโลหิตอย่างน้อยสัปดาห์ละ 2 ครั้ง',
              'ชั่งน้ำหนักทุกสัปดาห์ ถ้าขึ้นเร็วเกิน 2 กก./สัปดาห์ ให้แจ้งแพทย์',
              'สังเกตอาการบวมที่ขาและเท้า'
            ]
          }
        ],
        
        warningSign: [
          'อาการที่ต้องมาพบแพทย์ทันที:',
          '🚨 หายใจลำบาก เหนื่อยหอบมาก นอนราบไม่ได้',
          '🚨 แน่นหน้าอก เจ็บหน้าอก',
          '🚨 บวมทั้งตัว หรือบวมที่หน้าผิดปกติ',
          '🚨 ปัสสาวะออกน้อยมาก หรือไม่ออกเลย',
          '🚨 สับสน ซึมลง ไม่รู้สึกตัว',
          '🚨 อาเจียนหรือท้องเสียรุนแรงจนทานยาไม่ได้'
        ],
        
        followUp: {
          labDate: getDateString(14).split('T')[0],
          labTests: ['Creatinine', 'Potassium (K+)', 'Fasting Blood Sugar'],
          labLocation: 'Lab ใกล้บ้านหรือ รพ.ที่สะดวก',
          nextAppointment: getDateString(30).split('T')[0],
          appointmentNote: 'พบแพทย์ทางออนไลน์ ระบบจะส่งลิงก์ประชุมให้ทางอีเมล'
        },
        
        emergencyContact: {
          clinic: '02-xxx-xxxx',
          emergency: '1669',
          doctorEmail: 'doctor.test@izara.com'
        }
      },
      
      pdfUrl: 'gs://izara-doctors-data/patient-instructions/PI-ANAN-001.pdf',
      
      aiGenerated: true,
      aiMetadata: {
        model: 'gemini-1.5-flash',
        generatedAt: getDateString(-1),
        approvedByDoctor: true,
        approvedAt: getDateString(-1),
        editsBeforeApproval: 1
      }
    }
  ];
  
  writeJSON(BUCKETS.DOCTOR, 'patient-instructions/instructions.json', patientInstructions);
  patientInstructions.forEach(pi => {
    writeJSON(BUCKETS.DOCTOR, `patient-instructions/${pi.id}.json`, pi);
  });
  
  return patientInstructions;
}

// ============================================================================
// KNOWLEDGE BASE FOR RAG (Per P.Beer 3.3)
// ============================================================================

function generateKnowledgeBase() {
  console.log('\n📚 Generating Knowledge Base for RAG...');
  
  const knowledgeBase = [
    // KDIGO Guidelines
    {
      id: 'KB-KDIGO-2024-001',
      contentType: 'guideline',
      source: 'KDIGO 2024 Clinical Practice Guideline for Diabetes Management in CKD',
      title: 'Metformin Dosing in CKD',
      titleThai: 'การปรับขนาด Metformin ในผู้ป่วยโรคไตเรื้อรัง',
      content: `According to KDIGO 2024 Guidelines for Metformin dosing in CKD:
- eGFR ≥45: No dose adjustment needed
- eGFR 30-44: Reduce dose by 50% (e.g., 500mg BID → 500mg OD)
- eGFR <30: Discontinue Metformin due to lactic acidosis risk
- Reassess eGFR 3-6 monthly when using Metformin in CKD

Additional considerations:
- Stop Metformin during acute illness or dehydration
- Hold before contrast studies if eGFR <45
- Monitor for B12 deficiency with long-term use`,
      contentThai: `ตาม KDIGO 2024 Guidelines การปรับขนาด Metformin ในผู้ป่วย CKD:
- eGFR ≥45: ไม่ต้องปรับขนาด
- eGFR 30-44: ลดขนาด 50% (เช่น จาก 500mg วันละ 2 ครั้ง เป็น วันละ 1 ครั้ง)
- eGFR <30: หยุดยา Metformin เพราะเสี่ยง lactic acidosis
- ตรวจ eGFR ทุก 3-6 เดือนเมื่อใช้ Metformin ใน CKD`,
      tags: ['metformin', 'CKD', 'diabetes', 'dose-adjustment', 'KDIGO'],
      specialty: 'Nephrology',
      guidelineYear: 2024,
      createdAt: getDateString(-365)
    },
    {
      id: 'KB-KDIGO-2024-002',
      contentType: 'guideline',
      source: 'KDIGO 2024',
      title: 'SGLT2 Inhibitors in Diabetic Kidney Disease',
      titleThai: 'การใช้ยา SGLT2 inhibitors ในผู้ป่วยเบาหวานที่มีโรคไต',
      content: `KDIGO 2024 strongly recommends SGLT2 inhibitors for patients with T2DM and CKD:
- Indication: eGFR ≥20 mL/min AND UACR ≥30 mg/g
- Preferred agents: Dapagliflozin, Empagliflozin
- Dosing: Can initiate even if eGFR 20-30, can continue to ESKD
- Benefits: Reduces ESKD progression, CV events, and hospitalization for heart failure

Key Evidence:
- CREDENCE Trial: Canagliflozin reduced kidney failure by 30%
- DAPA-CKD Trial: Dapagliflozin reduced kidney disease progression by 39%
- EMPA-KIDNEY: Empagliflozin benefits across CKD spectrum`,
      contentThai: `KDIGO 2024 แนะนำอย่างยิ่งให้ใช้ SGLT2 inhibitors ในผู้ป่วยเบาหวานที่มี CKD:
- ข้อบ่งชี้: eGFR ≥20 และ UACR ≥30 mg/g
- ยาที่แนะนำ: Dapagliflozin, Empagliflozin
- ประโยชน์: ชะลอการเสื่อมของไต ลดเหตุการณ์หัวใจและหลอดเลือด`,
      tags: ['SGLT2i', 'dapagliflozin', 'empagliflozin', 'CKD', 'DKD', 'renoprotection'],
      specialty: 'Nephrology',
      guidelineYear: 2024,
      createdAt: getDateString(-365)
    },
    // ADA Guidelines
    {
      id: 'KB-ADA-2025-001',
      contentType: 'guideline',
      source: 'ADA Standards of Care 2025',
      title: 'HbA1c Targets for Elderly Patients',
      titleThai: 'เป้าหมาย HbA1c ในผู้ป่วยสูงอายุ',
      content: `ADA 2025 recommends individualized HbA1c targets:
- Healthy older adults with few comorbidities: <7.0-7.5%
- Complex/intermediate health: <8.0%
- Very complex/poor health: <8.5% or avoid hypoglycemia focus

For elderly with CKD:
- More relaxed targets appropriate (7.0-8.0%)
- Avoid hypoglycemia-prone medications
- Consider patient life expectancy and preferences
- Prioritize quality of life and symptom management`,
      contentThai: `ADA 2025 แนะนำเป้าหมาย HbA1c เฉพาะบุคคล:
- ผู้สูงอายุสุขภาพดี: <7.0-7.5%
- มีโรคร่วมซับซ้อน: <8.0%
- สุขภาพแย่มาก: <8.5% หรือเน้นหลีกเลี่ยงน้ำตาลต่ำ`,
      tags: ['HbA1c', 'elderly', 'diabetes', 'targets', 'ADA'],
      specialty: 'Endocrinology',
      guidelineYear: 2025,
      createdAt: getDateString(-30)
    },
    // Drug Information
    {
      id: 'KB-DRUG-001',
      contentType: 'drug_info',
      source: 'Thai FDA Drug Database',
      title: 'Enalapril - Drug Information',
      titleThai: 'ข้อมูลยา Enalapril',
      content: `Enalapril (อีนาลาพริล)
Class: ACE Inhibitor

Indications:
- Hypertension
- Heart failure
- Diabetic nephropathy (renoprotection)

Dosing:
- HTN: 5-40 mg daily (in 1-2 doses)
- HF: Start 2.5 mg BID, titrate to 10-20 mg BID
- CKD: Adjust based on eGFR

Monitoring:
- Potassium: Risk of hyperkalemia, especially with CKD
- Creatinine: May increase 20-30% initially (acceptable)
- Blood pressure: Avoid hypotension

Contraindications:
- Pregnancy
- Angioedema history
- Bilateral renal artery stenosis

Drug Interactions:
- NSAIDs: Reduce efficacy, increase renal risk
- Potassium supplements: Risk of hyperkalemia
- Lithium: Increased lithium levels`,
      tags: ['enalapril', 'ACE-inhibitor', 'hypertension', 'CKD', 'hyperkalemia'],
      specialty: 'Cardiology',
      createdAt: getDateString(-180)
    },
    // Lab Interpretation
    {
      id: 'KB-LAB-001',
      contentType: 'protocol',
      source: 'Thai Nephrology Society',
      title: 'CKD Staging and Management',
      titleThai: 'ระยะของโรคไตเรื้อรังและการดูแลรักษา',
      content: `CKD Staging by eGFR (KDIGO):
- Stage 1: eGFR ≥90 (normal or high)
- Stage 2: eGFR 60-89 (mildly decreased)
- Stage 3a: eGFR 45-59 (mildly to moderately decreased)
- Stage 3b: eGFR 30-44 (moderately to severely decreased)
- Stage 4: eGFR 15-29 (severely decreased)
- Stage 5: eGFR <15 (kidney failure)

Stage 3b Management:
- Referral to nephrologist recommended
- Avoid nephrotoxic drugs (NSAIDs, aminoglycosides)
- Adjust renally excreted medications
- Monitor K+, phosphorus, calcium, Hb
- Start preparing for RRT if declining
- Consider erythropoietin if Hb <10

UACR Categories:
- A1: <30 mg/g (normal to mildly increased)
- A2: 30-300 mg/g (moderately increased)
- A3: >300 mg/g (severely increased)`,
      tags: ['CKD', 'staging', 'eGFR', 'UACR', 'nephrology'],
      specialty: 'Nephrology',
      createdAt: getDateString(-90)
    }
  ];
  
  writeJSON(BUCKETS.METADATA, 'knowledge-base/knowledge-base.json', knowledgeBase);
  
  return knowledgeBase;
}

// ============================================================================
// COMPREHENSIVE PHR DATA WITH HEALTH JOURNEY
// ============================================================================

function generateComprehensivePHR() {
  console.log('\n❤️ Generating Comprehensive PHR with Health Journey...');
  
  // Enhanced PHR for PATIENT-ANAN (Complex case)
  const phrAnan = {
    id: 'phr-PATIENT-ANAN',
    patientId: 'PATIENT-ANAN',
    demographics: {
      name: 'Anan Khayanrian',
      nameThai: 'นายอนันต์ ขยันเรียน',
      dateOfBirth: '1958-11-22',
      age: 67,
      gender: 'male',
      bloodType: 'A+',
      height: 165,
      weight: 72,
      ethnicity: 'Thai',
      occupation: 'เกษียณอายุ (อดีตครูโรงเรียนมัธยม)',
      nationalId: '3-5678-90123-45-6',
      phone: '+66-82-345-6789',
      email: 'Anan.Khayanrian@gmail.com',
      address: '456 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
      insuranceType: 'สิทธิข้าราชการ',
      emergencyContact: {
        name: 'นางสมศรี ขยันเรียน',
        relationship: 'ภรรยา',
        phone: '+66-83-456-7890'
      }
    },
    
    // Comprehensive vital signs history
    vitalSignsHistory: [
      {
        bloodPressure: { systolic: 142, diastolic: 88, unit: 'mmHg' },
        heartRate: { value: 76, unit: 'bpm' },
        temperature: { value: 36.4, unit: 'celsius' },
        oxygenSaturation: { value: 96, unit: '%' },
        weight: { value: 72, unit: 'kg' },
        height: { value: 165, unit: 'cm' },
        bmi: 26.4,
        bloodGlucose: { value: 185, unit: 'mg/dL', testType: 'fasting' },
        measuredAt: getDateString(-2),
        source: 'clinic',
        notes: 'FBS ยังสูง - ต้องปรับยา'
      },
      {
        bloodPressure: { systolic: 138, diastolic: 85, unit: 'mmHg' },
        heartRate: { value: 74, unit: 'bpm' },
        temperature: { value: 36.5, unit: 'celsius' },
        oxygenSaturation: { value: 97, unit: '%' },
        weight: { value: 73, unit: 'kg' },
        bmi: 26.8,
        bloodGlucose: { value: 168, unit: 'mg/dL', testType: 'fasting' },
        measuredAt: getDateString(-35),
        source: 'clinic'
      },
      {
        bloodPressure: { systolic: 145, diastolic: 90, unit: 'mmHg' },
        heartRate: { value: 78, unit: 'bpm' },
        weight: { value: 74, unit: 'kg' },
        bmi: 27.2,
        bloodGlucose: { value: 195, unit: 'mg/dL', testType: 'fasting' },
        measuredAt: getDateString(-65),
        source: 'clinic',
        notes: 'BP และ FBS สูงขึ้น - ปรับยา'
      }
    ],
    
    allergies: [
      {
        id: 'allergy-001',
        allergen: 'Sulfonamides',
        type: 'medication',
        severity: 'severe',
        reaction: 'Stevens-Johnson Syndrome (ประวัติรุนแรง)',
        diagnosedDate: '2010-03-15',
        status: 'confirmed',
        notes: '⚠️ ห้ามใช้ยากลุ่ม Sulfa ทุกชนิดโดยเด็ดขาด'
      },
      {
        id: 'allergy-002',
        allergen: 'NSAIDs',
        type: 'medication',
        severity: 'moderate',
        reaction: 'ไตทำงานแย่ลง, บวม',
        diagnosedDate: '2022-08-01',
        status: 'confirmed',
        notes: 'หลีกเลี่ยงยาแก้ปวดกลุ่ม NSAIDs เพราะมีผลต่อไต'
      }
    ],
    
    chronicConditions: [
      {
        id: 'condition-001',
        condition: 'Type 2 Diabetes Mellitus',
        conditionThai: 'โรคเบาหวานชนิดที่ 2',
        icdCode: 'E11.65',
        diagnosedDate: '2014-05-10',
        status: 'active',
        severity: 'moderate',
        treatedBy: 'DOC-001',
        notes: 'DM 12 ปี ปัจจุบันควบคุมได้ไม่ดีนัก HbA1c 7.8%',
        complications: ['Diabetic nephropathy - CKD Stage 3b']
      },
      {
        id: 'condition-002',
        condition: 'Chronic Kidney Disease Stage 3b',
        conditionThai: 'โรคไตเรื้อรังระยะ 3b',
        icdCode: 'N18.4',
        diagnosedDate: '2021-11-20',
        status: 'active',
        severity: 'moderate',
        treatedBy: 'DOC-001',
        notes: 'eGFR 38, secondary to diabetic nephropathy, ต้องปรับยาตามการทำงานของไต',
        monitoring: 'ตรวจ Cr, K+ ทุก 1-3 เดือน'
      },
      {
        id: 'condition-003',
        condition: 'Essential Hypertension',
        conditionThai: 'โรคความดันโลหิตสูงปฐมภูมิ',
        icdCode: 'I10',
        diagnosedDate: '2016-02-28',
        status: 'active',
        severity: 'controlled',
        treatedBy: 'DOC-001',
        notes: 'ควบคุมได้พอใช้ด้วย ACE-I + CCB'
      },
      {
        id: 'condition-004',
        condition: 'Dyslipidemia',
        conditionThai: 'ไขมันในเลือดผิดปกติ',
        icdCode: 'E78.5',
        diagnosedDate: '2015-08-15',
        status: 'active',
        severity: 'controlled',
        treatedBy: 'DOC-001'
      }
    ],
    
    medications: [
      {
        id: 'med-001',
        name: 'Metformin',
        dose: '500mg',
        frequency: 'วันละ 1 ครั้ง',
        route: 'รับประทาน',
        reason: 'เบาหวาน',
        startDate: '2014-05-15',
        prescribedBy: 'DOC-001',
        status: 'active',
        notes: '⚠️ ลดจาก BID เป็น OD เนื่องจาก CKD Stage 3b (ปรับเมื่อ 18 ม.ค. 2026)'
      },
      {
        id: 'med-002',
        name: 'Glipizide',
        dose: '5mg',
        frequency: 'ก่อนอาหารเช้า',
        route: 'รับประทาน',
        reason: 'เบาหวาน',
        startDate: '2018-03-01',
        prescribedBy: 'DOC-001',
        status: 'active'
      },
      {
        id: 'med-003',
        name: 'Enalapril',
        dose: '10mg',
        frequency: 'วันละครั้ง เช้า',
        route: 'รับประทาน',
        reason: 'ความดันสูง + ป้องกันไตเสื่อม',
        startDate: '2016-03-01',
        prescribedBy: 'DOC-001',
        status: 'active',
        notes: 'ACE-I สำหรับ renoprotection'
      },
      {
        id: 'med-004',
        name: 'Amlodipine',
        dose: '5mg',
        frequency: 'วันละครั้ง เช้า',
        route: 'รับประทาน',
        reason: 'ความดันสูง',
        startDate: '2019-06-15',
        prescribedBy: 'DOC-001',
        status: 'active'
      },
      {
        id: 'med-005',
        name: 'Atorvastatin',
        dose: '20mg',
        frequency: 'วันละครั้ง ก่อนนอน',
        route: 'รับประทาน',
        reason: 'ไขมันในเลือดสูง + ป้องกันโรคหัวใจ',
        startDate: '2015-09-01',
        prescribedBy: 'DOC-001',
        status: 'active'
      }
    ],
    
    latestLabResults: [
      {
        id: 'lab-anan-001',
        testDate: getDateString(-2),
        orderedBy: 'DOC-001',
        labName: 'โรงพยาบาลรามาธิบดี',
        results: [
          { test: 'HbA1c', value: 7.8, unit: '%', normalRange: '<7.0', status: 'high' },
          { test: 'FBS', value: 185, unit: 'mg/dL', normalRange: '70-100', status: 'high' },
          { test: 'Creatinine', value: 1.8, unit: 'mg/dL', normalRange: '0.7-1.2', status: 'high' },
          { test: 'BUN', value: 32, unit: 'mg/dL', normalRange: '7-20', status: 'high' },
          { test: 'eGFR', value: 38, unit: 'mL/min/1.73m²', normalRange: '>90', status: 'low', notes: 'CKD Stage 3b' },
          { test: 'Potassium', value: 5.1, unit: 'mEq/L', normalRange: '3.5-5.0', status: 'borderline-high' },
          { test: 'Sodium', value: 138, unit: 'mEq/L', normalRange: '136-145', status: 'normal' },
          { test: 'UACR', value: 280, unit: 'mg/g', normalRange: '<30', status: 'high', notes: 'A3 albuminuria' },
          { test: 'Total Cholesterol', value: 185, unit: 'mg/dL', normalRange: '<200', status: 'normal' },
          { test: 'LDL', value: 98, unit: 'mg/dL', normalRange: '<100', status: 'normal' },
          { test: 'HDL', value: 42, unit: 'mg/dL', normalRange: '>40', status: 'normal' },
          { test: 'Triglycerides', value: 168, unit: 'mg/dL', normalRange: '<150', status: 'high' }
        ]
      }
    ],
    
    // Health Journey Timeline
    healthJourney: [
      {
        id: 'journey-001',
        date: '2014-05-10',
        type: 'diagnosis',
        title: 'วินิจฉัยโรคเบาหวานชนิดที่ 2',
        titleEnglish: 'Type 2 Diabetes Diagnosed',
        description: 'ตรวจพบน้ำตาลในเลือดสูงจากการตรวจสุขภาพประจำปี FBS 180 mg/dL, HbA1c 8.5%',
        outcome: 'เริ่มยา Metformin 500mg วันละ 2 ครั้ง',
        doctor: 'DOC-001'
      },
      {
        id: 'journey-002',
        date: '2016-02-28',
        type: 'diagnosis',
        title: 'วินิจฉัยความดันโลหิตสูง',
        titleEnglish: 'Hypertension Diagnosed',
        description: 'ความดันวัดได้ 155/95 หลายครั้ง',
        outcome: 'เริ่มยา Enalapril 5mg',
        doctor: 'DOC-001'
      },
      {
        id: 'journey-003',
        date: '2021-11-20',
        type: 'complication',
        title: 'พบโรคไตเรื้อรังจากเบาหวาน',
        titleEnglish: 'Diabetic Nephropathy - CKD Diagnosed',
        description: 'eGFR ลดลงเหลือ 52 mL/min (CKD Stage 3a), UACR 150 mg/g',
        outcome: 'เพิ่มการติดตามการทำงานของไตใกล้ชิด',
        doctor: 'DOC-001'
      },
      {
        id: 'journey-004',
        date: '2024-06-15',
        type: 'worsening',
        title: 'โรคไตแย่ลงเป็น Stage 3b',
        titleEnglish: 'CKD progressed to Stage 3b',
        description: 'eGFR ลดลงเหลือ 42 mL/min',
        outcome: 'เริ่มระวังการปรับขนาดยาที่ขับออกทางไต',
        doctor: 'DOC-001'
      },
      {
        id: 'journey-005',
        date: getDateString(-1).split('T')[0],
        type: 'treatment_change',
        title: 'ปรับลดขนาด Metformin',
        titleEnglish: 'Metformin dose reduced',
        description: 'eGFR ลดเหลือ 38 mL/min ปรับ Metformin จาก 500mg BID เป็น 500mg OD ตาม KDIGO 2024',
        outcome: 'นัดติดตาม Cr, K+ ใน 2 สัปดาห์',
        doctor: 'DOC-001',
        aiAssisted: true,
        aiNotes: 'CDS แนะนำลดขนาดยา 50% ตาม KDIGO Guidelines'
      }
    ],
    
    clinicalDecisionSupport: {
      lastUpdated: getDateString(-1),
      activeAlerts: [
        {
          id: 'alert-001',
          type: 'dose_adjustment',
          severity: 'high',
          drug: 'Metformin',
          message: 'ปรับขนาดยาแล้วตาม eGFR 38',
          status: 'resolved',
          resolvedAt: getDateString(-1)
        },
        {
          id: 'alert-002',
          type: 'monitoring',
          severity: 'medium',
          message: 'ติดตาม K+ ใกล้ชิด เนื่องจากใช้ ACE-I ใน CKD',
          status: 'active'
        }
      ],
      recommendations: [
        'พิจารณาเพิ่ม SGLT2i (Dapagliflozin) เพื่อ renoprotection',
        'Nephrology referral ถ้า eGFR <30',
        'ติดตาม Hb สำหรับ anemia of CKD'
      ]
    },
    
    familyHistory: [
      { relation: 'บิดา', condition: 'เบาหวานชนิดที่ 2', notes: 'เสียชีวิตจากภาวะแทรกซ้อนเบาหวาน อายุ 72 ปี' },
      { relation: 'มารดา', condition: 'ความดันโลหิตสูง, หลอดเลือดสมอง', notes: 'มีชีวิต อายุ 88 ปี' },
      { relation: 'พี่ชาย', condition: 'เบาหวานชนิดที่ 2', notes: 'วินิจฉัยเมื่อายุ 55 ปี' }
    ],
    
    socialHistory: {
      smoking: { status: 'อดีตสูบบุหรี่', quitDate: '2014-05-15', packYears: 15 },
      alcohol: { status: 'งด', notes: 'งดเนื่องจากโรคไต' },
      exercise: { frequency: 'เดินเล่นวันละ 20-30 นาที', notes: 'ตามความสามารถ' },
      diet: { type: 'Low sodium, Low potassium, Diabetic diet' },
      occupation: { current: 'เกษียณ', previous: 'ครูมัธยม' }
    },
    
    createdAt: getDateString(-365),
    updatedAt: getDateString(-1),
    lastSyncedAt: getDateString(-1)
  };
  
  // Enhanced PHR for PATIENT-SOMCHAI (Simpler case - new hypertension)
  const phrSomchai = {
    id: 'phr-PATIENT-SOMCHAI',
    patientId: 'PATIENT-SOMCHAI',
    demographics: {
      name: 'Somchai Mankong',
      nameThai: 'นายสมชาย มั่นคง',
      dateOfBirth: '1970-06-15',
      age: 55,
      gender: 'male',
      bloodType: 'B+',
      height: 172,
      weight: 78,
      ethnicity: 'Thai',
      occupation: 'พนักงานบริษัท',
      phone: '+66-81-234-5678',
      email: 'Somchai.Mankong@gmail.com',
      address: '789 ถนนสุขุมวิท เขตวัฒนา กรุงเทพฯ 10110',
      insuranceType: 'ประกันสังคม'
    },
    
    vitalSignsHistory: [
      {
        bloodPressure: { systolic: 148, diastolic: 92, unit: 'mmHg' },
        heartRate: { value: 78, unit: 'bpm' },
        temperature: { value: 36.6, unit: 'celsius' },
        oxygenSaturation: { value: 98, unit: '%' },
        weight: { value: 78, unit: 'kg' },
        bmi: 26.4,
        measuredAt: getDateString(-7),
        source: 'clinic',
        notes: 'ตรวจพบความดันสูงครั้งแรก'
      }
    ],
    
    allergies: [
      {
        id: 'allergy-somchai-001',
        allergen: 'Penicillin',
        type: 'medication',
        severity: 'moderate',
        reaction: 'ผื่นลมพิษ',
        status: 'confirmed'
      }
    ],
    
    chronicConditions: [
      {
        id: 'condition-somchai-001',
        condition: 'Essential Hypertension',
        conditionThai: 'โรคความดันโลหิตสูงปฐมภูมิ',
        icdCode: 'I10',
        diagnosedDate: getDateString(-7).split('T')[0],
        status: 'active',
        severity: 'new',
        treatedBy: 'DOC-001',
        notes: 'วินิจฉัยใหม่ เริ่มรักษาด้วยยาและปรับพฤติกรรม'
      }
    ],
    
    medications: [
      {
        id: 'med-somchai-001',
        name: 'Amlodipine',
        dose: '5mg',
        frequency: 'วันละครั้ง เช้า',
        route: 'รับประทาน',
        reason: 'ความดันโลหิตสูง',
        startDate: getDateString(-7).split('T')[0],
        prescribedBy: 'DOC-001',
        status: 'active'
      }
    ],
    
    healthJourney: [
      {
        id: 'journey-somchai-001',
        date: getDateString(-7).split('T')[0],
        type: 'diagnosis',
        title: 'วินิจฉัยความดันโลหิตสูง',
        titleEnglish: 'Hypertension Diagnosed',
        description: 'ตรวจพบความดันโลหิตสูง 148/92 mmHg จากการตรวจสุขภาพประจำปี มีอาการปวดศีรษะเป็นพักๆ',
        outcome: 'เริ่มยา Amlodipine 5mg และให้คำแนะนำเรื่องอาหารและออกกำลังกาย',
        doctor: 'DOC-001'
      }
    ],
    
    familyHistory: [
      { relation: 'บิดา', condition: 'ความดันโลหิตสูง', notes: 'วินิจฉัยตอนอายุ 50 ปี' }
    ],
    
    socialHistory: {
      smoking: { status: 'ไม่เคยสูบ' },
      alcohol: { status: 'ดื่มเป็นครั้งคราว', frequency: '1-2 ครั้ง/สัปดาห์' },
      exercise: { frequency: 'น้อย', notes: 'ทำงานนั่งโต๊ะ ไม่ค่อยได้ออกกำลังกาย' },
      diet: { type: 'อาหารทั่วไป ชอบอาหารรสจัด' }
    },
    
    createdAt: getDateString(-7),
    updatedAt: getDateString(-7)
  };
  
  writeJSON(BUCKETS.PATIENT, 'users/PATIENT-ANAN/phr.json', phrAnan);
  writeJSON(BUCKETS.PATIENT, 'users/PATIENT-SOMCHAI/phr.json', phrSomchai);
  
  return { phrAnan, phrSomchai };
}

// ============================================================================
// COMPREHENSIVE EMR WITH AI FEATURES
// ============================================================================

function generateComprehensiveEMRs() {
  console.log('\n📋 Generating Comprehensive EMRs with AI Features...');
  
  const emrs = [
    {
      id: 'EMR-ANAN-001',
      appointmentId: 'APT-COMPLETED-001',
      patientId: USERS.patientAnan.id,
      doctorId: USERS.doctor.id,
      doctorName: USERS.doctor.nameThai,
      encounterDate: getDateString(-1),
      encounterType: 'follow-up',
      
      // SOAP Format (Thai Ministry of Health Standard)
      subjective: {
        chiefComplaint: 'มานัดติดตามเบาหวานและโรคไต',
        chiefComplaintEnglish: 'Follow-up for DM and CKD',
        historyOfPresentIllness: 'ผู้ป่วยมาตามนัด มีอาการเหนื่อยง่ายกว่าเดิม โดยเฉพาะเวลาเดินขึ้นบันได น้ำตาลที่วัดที่บ้านยังสูง 180-190 mg/dL ไม่มีอาการบวม ไม่มีปัสสาวะเป็นฟอง ไม่มีอาการหอบ นอนราบได้',
        currentMedications: 'Metformin 500mg BID, Glipizide 5mg OD, Enalapril 10mg OD, Amlodipine 5mg OD, Atorvastatin 20mg HS',
        allergies: 'Sulfonamides - SJS, NSAIDs - ไตแย่ลง',
        reviewOfSystems: {
          constitutional: 'เหนื่อยง่าย',
          cardiovascular: 'ไม่มีเจ็บหน้าอก',
          respiratory: 'ไม่หอบ',
          genitourinary: 'ปัสสาวะปกติ ไม่เป็นฟอง',
          musculoskeletal: 'ไม่มีบวม'
        }
      },
      
      objective: {
        vitalSigns: {
          bloodPressure: '142/88',
          heartRate: 76,
          temperature: 36.4,
          respiratoryRate: 18,
          oxygenSaturation: 96,
          weight: 72,
          height: 165,
          bmi: 26.4
        },
        physicalExamination: {
          general: 'Alert, good consciousness, no acute distress, slightly overweight',
          heent: 'No pallor, no jaundice, no thyroid enlargement',
          cardiovascular: 'Normal S1S2, no murmur, JVP not elevated',
          respiratory: 'Clear breath sounds bilaterally, no crackles',
          abdomen: 'Soft, non-tender, no hepatomegaly',
          extremities: 'No edema, dorsalis pedis pulse palpable bilaterally',
          neurological: 'Alert, oriented, no focal deficit, sensation intact'
        },
        labResults: {
          date: getDateString(-2),
          results: [
            { test: 'HbA1c', value: '7.8%', status: 'high' },
            { test: 'FBS', value: '185 mg/dL', status: 'high' },
            { test: 'Creatinine', value: '1.8 mg/dL', status: 'high' },
            { test: 'eGFR', value: '38 mL/min', status: 'low', notes: 'CKD Stage 3b' },
            { test: 'K+', value: '5.1 mEq/L', status: 'borderline' },
            { test: 'UACR', value: '280 mg/g', status: 'high' }
          ]
        }
      },
      
      assessment: {
        diagnoses: [
          {
            code: 'E11.65',
            description: 'Type 2 diabetes mellitus with hyperglycemia',
            descriptionThai: 'เบาหวานชนิดที่ 2 ที่มีน้ำตาลในเลือดสูง',
            type: 'primary',
            status: 'suboptimally controlled'
          },
          {
            code: 'N18.4',
            description: 'Chronic kidney disease, stage 4 (Stage 3b per GFR)',
            descriptionThai: 'โรคไตเรื้อรังระยะ 3b',
            type: 'secondary',
            status: 'progressive'
          },
          {
            code: 'I10',
            description: 'Essential hypertension',
            descriptionThai: 'โรคความดันโลหิตสูงปฐมภูมิ',
            type: 'secondary',
            status: 'controlled'
          }
        ],
        clinicalImpressions: 'DM-CKD Stage 3b with suboptimal glycemic control. Kidney function declining (eGFR 38, prev 42). Need to adjust medications accordingly.',
        clinicalImpressionsThai: 'เบาหวานร่วมโรคไตเรื้อรังระยะ 3b น้ำตาลควบคุมได้ไม่ดีนัก ไตทำงานลดลง (eGFR 38) ต้องปรับยาให้เหมาะสม'
      },
      
      plan: {
        treatmentPlan: '1. ลด Metformin เหลือ 500mg OD (KDIGO 2024)\n2. Continue Glipizide, Enalapril, Amlodipine, Atorvastatin\n3. Low K+ diet, Low Na diet, Diabetic diet\n4. Moderate exercise as tolerated',
        treatmentPlanThai: '1. ลดยา Metformin จาก 500mg วันละ 2 ครั้ง เป็น วันละ 1 ครั้ง\n2. ยาอื่นใช้ต่อเหมือนเดิม\n3. อาหารจืด งดผลไม้ K+ สูง\n4. ออกกำลังกายเบาๆ',
        
        medications: [
          {
            action: 'modify',
            name: 'Metformin',
            previousDose: '500mg BID',
            newDose: '500mg OD',
            reason: 'CKD Stage 3b - KDIGO 2024 recommendation'
          },
          { action: 'continue', name: 'Glipizide', dose: '5mg OD' },
          { action: 'continue', name: 'Enalapril', dose: '10mg OD' },
          { action: 'continue', name: 'Amlodipine', dose: '5mg OD' },
          { action: 'continue', name: 'Atorvastatin', dose: '20mg HS' }
        ],
        
        labOrders: [
          { test: 'Creatinine + eGFR', timing: '2 สัปดาห์' },
          { test: 'Potassium', timing: '2 สัปดาห์' },
          { test: 'FBS', timing: '2 สัปดาห์' }
        ],
        
        followUp: {
          date: getDateString(30),
          reason: 'ติดตามหลังปรับยา และประเมินผล Lab',
          instructions: 'มาพบแพทย์หลังเจาะ Lab 2 สัปดาห์'
        },
        
        referrals: [
          {
            specialty: 'Nephrology',
            reason: 'CKD Stage 3b - consider if eGFR <30 on follow-up',
            urgency: 'routine'
          }
        ]
      },
      
      // AI-Generated Summary (Man-in-the-Loop approved)
      aiSummary: {
        status: 'approved',
        generatedAt: getDateString(-1),
        approvedBy: USERS.doctor.id,
        approvedAt: getDateString(-1),
        
        summaryForPatient: `## สรุปการพบแพทย์ - วันที่ ${new Date(getDateString(-1)).toLocaleDateString('th-TH')}

### การวินิจฉัย
คุณมีโรคเบาหวานร่วมกับโรคไตเรื้อรังระยะ 3b และความดันโลหิตสูง

### สิ่งที่ตรวจพบ
- น้ำตาลในเลือดยังสูงกว่าเป้าหมาย
- ไตทำงานลดลงเล็กน้อย จึงต้องปรับขนาดยา

### การปรับยา
⚠️ **ยา Metformin**: ลดจากวันละ 2 เม็ด เหลือวันละ 1 เม็ด
ยาอื่นใช้เหมือนเดิม

### สิ่งที่ต้องทำ
1. กินยาตามที่ปรับใหม่
2. มาเจาะเลือดใน 2 สัปดาห์
3. พบแพทย์ใน 1 เดือน

### คำแนะนำ
- กินอาหารจืด ลดเค็ม
- งดผลไม้ที่มี K+ สูง (กล้วย ส้ม มะม่วงสุก)
- ออกกำลังกายเบาๆ เช่น เดินวันละ 20-30 นาที`,
        
        summaryForDoctor: 'DM-CKD Stage 3b F/U. Suboptimal glycemic control (HbA1c 7.8%, FBS 185). eGFR declined to 38 (prev 42). K+ borderline high at 5.1. Adjusted Metformin per KDIGO 2024. F/U labs in 2 weeks.'
      },
      
      // Clinical Decision Support
      cdsAlerts: [
        {
          id: 'cds-emr-001',
          type: 'dose_adjustment',
          severity: 'high',
          drug: 'Metformin',
          message: 'Reduce Metformin dose 50% per KDIGO 2024 (eGFR 30-44)',
          action: 'accepted',
          actionBy: USERS.doctor.id
        },
        {
          id: 'cds-emr-002',
          type: 'monitoring',
          severity: 'medium',
          message: 'Monitor K+ closely with ACE-I + CKD',
          action: 'acknowledged'
        }
      ],
      
      status: 'finalized',
      signedAt: getDateString(-1),
      createdAt: getDateString(-1),
      updatedAt: getDateString(-1)
    },
    
    // EMR for PATIENT-SOMCHAI (New hypertension)
    {
      id: 'EMR-SOMCHAI-001',
      appointmentId: 'APT-SOMCHAI-001',
      patientId: USERS.patientSomchai.id,
      doctorId: USERS.doctor.id,
      doctorName: USERS.doctor.nameThai,
      encounterDate: getDateString(-7),
      encounterType: 'consultation',
      
      subjective: {
        chiefComplaint: 'ปวดศีรษะเป็นพักๆ มา 2 สัปดาห์',
        historyOfPresentIllness: 'ผู้ป่วยมีอาการปวดศีรษะบริเวณท้ายทอยเป็นพักๆ มา 2 สัปดาห์ มักเป็นช่วงเย็นหลังเลิกงาน ไม่มีคลื่นไส้อาเจียน ไม่มีตามัว ไม่มีชาแขนขา ทำงานนั่งโต๊ะ เครียดบ้าง นอนดึก',
        allergies: 'Penicillin - ผื่นลมพิษ'
      },
      
      objective: {
        vitalSigns: {
          bloodPressure: '148/92',
          heartRate: 78,
          temperature: 36.6,
          oxygenSaturation: 98,
          weight: 78,
          height: 172,
          bmi: 26.4
        },
        physicalExamination: {
          general: 'Alert, well-nourished, no acute distress',
          cardiovascular: 'Normal S1S2, no murmur',
          neurological: 'No focal deficit, fundoscopy normal'
        }
      },
      
      assessment: {
        diagnoses: [
          {
            code: 'I10',
            description: 'Essential hypertension - newly diagnosed',
            descriptionThai: 'โรคความดันโลหิตสูงปฐมภูมิ - วินิจฉัยใหม่',
            type: 'primary'
          }
        ],
        clinicalImpressionsThai: 'ความดันโลหิตสูงวินิจฉัยใหม่ในผู้ป่วยวัยทำงาน มีปัจจัยเสี่ยงคือประวัติครอบครัว การทำงานนั่งโต๊ะ และอาหารรสจัด'
      },
      
      plan: {
        treatmentPlanThai: '1. เริ่มยา Amlodipine 5mg วันละ 1 ครั้ง\n2. ปรับพฤติกรรม - ลดเค็ม ออกกำลังกาย ลดน้ำหนัก\n3. ติดตาม BP ที่บ้าน\n4. เจาะเลือดพื้นฐาน',
        medications: [
          { action: 'new', name: 'Amlodipine', dose: '5mg OD' }
        ],
        labOrders: [
          { test: 'CBC, FBS, Lipid profile, Cr, eGFR, UA', timing: 'ก่อนพบแพทย์ครั้งหน้า' }
        ],
        followUp: {
          date: getDateString(30 - 7),
          reason: 'ติดตามความดันหลังเริ่มยา'
        }
      },
      
      aiSummary: {
        status: 'approved',
        approvedBy: USERS.doctor.id,
        summaryForPatient: `## สรุปการพบแพทย์

### การวินิจฉัย
คุณได้รับการวินิจฉัยว่าเป็นโรคความดันโลหิตสูง

### ยาที่สั่ง
💊 Amlodipine 5mg กินวันละ 1 เม็ด ตอนเช้า

### สิ่งที่ต้องทำ
1. กินยาทุกวันไม่ขาด
2. วัดความดันที่บ้านสัปดาห์ละ 2-3 ครั้ง จดค่าไว้
3. ไปเจาะเลือดก่อนพบแพทย์ครั้งหน้า

### ปรับพฤติกรรม
- ลดอาหารเค็ม งดน้ำปลา/ซีอิ๊ว
- ออกกำลังกายอย่างน้อย 30 นาที 5 วัน/สัปดาห์
- พยายามลดน้ำหนัก 2-3 กก.
- พักผ่อนให้เพียงพอ`
      },
      
      status: 'finalized',
      signedAt: getDateString(-7),
      createdAt: getDateString(-7)
    }
  ];
  
  writeJSON(BUCKETS.DOCTOR, 'emrs/emrs.json', emrs);
  emrs.forEach(emr => {
    writeJSON(BUCKETS.DOCTOR, `emrs/${emr.id}.json`, emr);
  });
  
  return emrs;
}

// ============================================================================
// APPOINTMENTS WITH AI PRE-SUMMARIES
// ============================================================================

function generateComprehensiveAppointments() {
  console.log('\n📅 Generating Comprehensive Appointments...');
  
  const appointments = [
    // Completed appointment for PATIENT-ANAN
    {
      id: 'APT-COMPLETED-001',
      patientId: USERS.patientAnan.id,
      patientName: USERS.patientAnan.nameThai,
      patientEmail: USERS.patientAnan.email,
      doctorId: USERS.doctor.id,
      doctorName: USERS.doctor.nameThai,
      doctorSpecialty: 'อายุรศาสตร์',
      appointmentDate: getDateString(-1),
      appointmentTime: '10:00',
      duration: 30,
      type: 'telehealth',
      status: 'completed',
      reason: 'ติดตามเบาหวานและโรคไต',
      symptoms: ['เหนื่อยง่าย', 'น้ำตาลสูง'],
      
      // AI Pre-consultation Summary (Requirement 2.2)
      aiPreSummary: {
        generatedAt: getDateString(-1, -2),
        summary: `## สรุปข้อมูลผู้ป่วยก่อนพบ

### โรคประจำตัว
- เบาหวานชนิดที่ 2 (12 ปี)
- โรคไตเรื้อรังระยะ 3b (eGFR 38)
- ความดันโลหิตสูง

### ⚠️ ข้อควรระวัง
- แพ้ Sulfonamides รุนแรง (SJS)
- ต้องปรับยาตาม eGFR

### Lab ล่าสุด
- HbA1c: 7.8%
- eGFR: 38
- K+: 5.1 (ขอบบน)

### 📝 CDS Alerts
- พิจารณาลด Metformin 50%`,
        reviewed: true,
        reviewedAt: getDateString(-1, -1)
      },
      
      result: {
        emrId: 'EMR-ANAN-001',
        diagnosis: 'DM-CKD Stage 3b',
        prescriptionChanges: 'Metformin reduced to OD',
        followUpDate: getDateString(30)
      },
      
      meetingRecord: {
        recordingId: 'MEETING-RECORD-001',
        duration: 25,
        hasTranscript: true,
        hasAiSummary: true
      },
      
      patientInstruction: {
        instructionId: 'PI-ANAN-001',
        sentAt: getDateString(-1),
        delivered: true
      },
      
      createdAt: getDateString(-3),
      completedAt: getDateString(-1)
    },
    
    // Upcoming appointment for PATIENT-ANAN
    {
      id: 'APT-UPCOMING-ANAN',
      patientId: USERS.patientAnan.id,
      patientName: USERS.patientAnan.nameThai,
      doctorId: USERS.doctor.id,
      doctorName: USERS.doctor.nameThai,
      appointmentDate: getDateString(28),
      appointmentTime: '10:00',
      duration: 30,
      type: 'telehealth',
      status: 'confirmed',
      reason: 'ติดตามหลังปรับยา',
      
      aiPreSummary: {
        status: 'pending',
        scheduledGeneration: getDateString(27)
      },
      
      createdAt: getDateString(-1)
    },
    
    // New patient appointment (PATIENT-SOMCHAI)
    {
      id: 'APT-SOMCHAI-001',
      patientId: USERS.patientSomchai.id,
      patientName: USERS.patientSomchai.nameThai,
      patientEmail: USERS.patientSomchai.email,
      doctorId: USERS.doctor.id,
      doctorName: USERS.doctor.nameThai,
      appointmentDate: getDateString(-7),
      appointmentTime: '14:00',
      duration: 30,
      type: 'telehealth',
      status: 'completed',
      reason: 'ปวดศีรษะ สงสัยความดันสูง',
      
      aiPreSummary: {
        generatedAt: getDateString(-7, -2),
        summary: `## ผู้ป่วยใหม่

### ข้อมูลเบื้องต้น
- ชาย 55 ปี
- อาชีพ: พนักงานบริษัท
- ประวัติครอบครัว: บิดามีความดันสูง

### อาการหลัก
ปวดศีรษะท้ายทอยเป็นพักๆ มา 2 สัปดาห์

### ⚠️ แพ้ยา
Penicillin - ผื่นลมพิษ`,
        reviewed: true
      },
      
      result: {
        emrId: 'EMR-SOMCHAI-001',
        diagnosis: 'Essential hypertension - newly diagnosed',
        newMedications: ['Amlodipine 5mg OD'],
        followUpDate: getDateString(30 - 7)
      },
      
      createdAt: getDateString(-10),
      completedAt: getDateString(-7)
    }
  ];
  
  writeJSON(BUCKETS.APPOINTMENTS, 'appointments/appointments-phase1.json', appointments);
  
  return appointments;
}

// ============================================================================
// DOCUMENT ANALYSIS (Per Dr. Isara 2.3)
// ============================================================================

function generateDocumentAnalysis() {
  console.log('\n📄 Generating AI Document Analysis Records...');
  
  const documentAnalysis = [
    {
      id: 'DOC-ANALYSIS-001',
      userId: USERS.doctor.id,
      patientId: USERS.patientAnan.id,
      documentType: 'lab_result',
      originalFilename: 'Lab_Result_Ramathibodi_20260117.pdf',
      uploadedAt: getDateString(-2),
      fileUrl: 'gs://izara-doctors-data/documents/DOC-ANALYSIS-001/original.pdf',
      
      aiAnalysis: {
        status: 'completed',
        analyzedAt: getDateString(-2),
        model: 'gemini-1.5-flash',
        
        summary: `## สรุปผลตรวจ Lab - นายอนันต์ ขยันเรียน
**วันที่ตรวจ**: 17 มกราคม 2569
**สถานที่**: โรงพยาบาลรามาธิบดี

### 🔴 ค่าผิดปกติที่สำคัญ
1. **eGFR: 38 mL/min** - CKD Stage 3b (ลดลงจาก 42)
2. **HbA1c: 7.8%** - เหนือเป้าหมาย
3. **UACR: 280 mg/g** - A3 Albuminuria
4. **K+: 5.1 mEq/L** - ขอบบน ต้องเฝ้าระวัง

### 🟡 ค่าที่ต้องติดตาม
- Creatinine: 1.8 mg/dL (สูง)
- FBS: 185 mg/dL (สูง)
- Triglycerides: 168 mg/dL (สูงเล็กน้อย)

### ✅ ค่าปกติ
- Lipid profile อื่นๆ ปกติ
- Sodium ปกติ

### 📋 ข้อเสนอแนะทางคลินิก
- ปรับยาตาม eGFR ที่ลดลง
- ติดตาม K+ ใกล้ชิด
- พิจารณา SGLT2i`,
        
        keyFindings: [
          { category: 'renal', finding: 'CKD Stage 3b progression', severity: 'high' },
          { category: 'glycemic', finding: 'Suboptimal control', severity: 'medium' },
          { category: 'electrolyte', finding: 'Borderline hyperkalemia', severity: 'medium' }
        ],
        
        extractedValues: [
          { test: 'eGFR', value: 38, unit: 'mL/min/1.73m²' },
          { test: 'HbA1c', value: 7.8, unit: '%' },
          { test: 'UACR', value: 280, unit: 'mg/g' },
          { test: 'K+', value: 5.1, unit: 'mEq/L' },
          { test: 'Creatinine', value: 1.8, unit: 'mg/dL' }
        ],
        
        cdsTriggered: true,
        cdsAlerts: ['METFORMIN_DOSE_ADJUSTMENT', 'K_MONITORING']
      },
      
      doctorReview: {
        reviewed: true,
        reviewedAt: getDateString(-2),
        reviewedBy: USERS.doctor.id,
        notes: 'AI analysis accurate. Will adjust Metformin and schedule close follow-up.'
      }
    }
  ];
  
  writeJSON(BUCKETS.DOCTOR, 'document-analysis/analyses.json', documentAnalysis);
  
  return documentAnalysis;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

async function main() {
  console.log('=' .repeat(70));
  console.log('🏥 IZARA TELEMEDICINE - PHASE 1 COMPREHENSIVE DATA GENERATOR');
  console.log('=' .repeat(70));
  console.log(`\n📅 Generated: ${new Date().toISOString()}`);
  console.log(`📁 Output Directory: ${OUTPUT_DIR}\n`);
  
  try {
    // Generate all data
    const chatHistory = generateAIChatHistory();
    const cdsLogs = generateCDSLogs();
    const meetingRecords = generateMeetingRecords();
    const patientInstructions = generatePatientInstructions();
    const knowledgeBase = generateKnowledgeBase();
    const phrData = generateComprehensivePHR();
    const emrs = generateComprehensiveEMRs();
    const appointments = generateComprehensiveAppointments();
    const documentAnalysis = generateDocumentAnalysis();
    
    console.log('\n' + '=' .repeat(70));
    console.log('✅ PHASE 1 DATA GENERATION COMPLETE!');
    console.log('=' .repeat(70));
    
    console.log('\n📊 Summary:');
    console.log(`   - AI Chat Sessions: ${chatHistory.length}`);
    console.log(`   - CDS Logs: ${cdsLogs.length}`);
    console.log(`   - Meeting Records: ${meetingRecords.length}`);
    console.log(`   - Patient Instructions: ${patientInstructions.length}`);
    console.log(`   - Knowledge Base Items: ${knowledgeBase.length}`);
    console.log(`   - Comprehensive PHRs: 2`);
    console.log(`   - EMRs with AI: ${emrs.length}`);
    console.log(`   - Appointments: ${appointments.length}`);
    console.log(`   - Document Analyses: ${documentAnalysis.length}`);
    
    console.log('\n📁 Files generated in:');
    console.log(`   ${OUTPUT_DIR}/`);
    console.log('      ├── izara-doctors-data/');
    console.log('      │   ├── ai-chat-history/');
    console.log('      │   ├── cds-logs/');
    console.log('      │   ├── meeting-records/');
    console.log('      │   ├── patient-instructions/');
    console.log('      │   ├── document-analysis/');
    console.log('      │   └── emrs/');
    console.log('      ├── izara-patients-data/');
    console.log('      │   └── users/');
    console.log('      ├── izara-appointments/');
    console.log('      └── izara-meta-data/');
    console.log('          └── knowledge-base/');
    
    console.log('\n🎯 Phase 1 Features Covered:');
    console.log('   ✅ 2.1 Video call summary + Patient instruction sheets');
    console.log('   ✅ 2.2 AI pre-consultation summary');
    console.log('   ✅ 2.3 AI document/PDF analysis');
    console.log('   ✅ 2.4 Clinical Decision Support (CDS)');
    console.log('   ✅ 2.5 Man-in-the-Loop validation');
    console.log('   ✅ 3.3 Knowledge base + Chat history for RAG');
    
  } catch (error) {
    console.error('❌ Error generating data:', error);
    process.exit(1);
  }
}

main();
