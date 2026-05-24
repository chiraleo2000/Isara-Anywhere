# 🤖 Doctor Portal — Gemini AI Studio

**Component:** `src/pages/GeminiAIStudio.tsx`
**Type:** Modal (launched from FAB button on any page)
**Access:** 🔒 Doctor / Admin
**Thai Title:** ผู้ช่วยทางการแพทย์ด้วย AI / Gemini AI Studio
**Version:** v1.4.7


## มาตรฐานเอกสาร (รายงานภาษาไทย)

เอกสารชุดนี้จัดทำให้สอดคล้อง**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข (โครงสร้าง: วัตถุประสงค์ → ขอบเขต → ขั้นตอน → ผลลัพธ์ → ข้อควรระวัง → อ้างอิง)

| รายการ | ค่าที่ใช้ |
|--------|-----------|
| เอกสาร Word / รายงาน PDF | **TH Sarabun New** — เนื้อหา **16 pt**, หัวข้อระดับ 1 **18 pt**, หัวข้อระดับ 2 **16 pt** (ตัวหนา), ชื่อเรื่อง **22 pt**, ระยะบรรทัด **1.15**, จัดชิดซ้าย |
| สไลด์นำเสนอ PowerPoint | **FC Iconic** — หัวข้อสไลด์ **32 pt**, หัวข้อรอง **22 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |
| ตัวเลขและวันที่ | ใช้ พ.ศ. ในข้อความไทย; คั่นหลักพันแบบไทยเมื่อจำเป็น |
| อ้างอิงคู่มือ | `docs/USER_GUIDE_PATIENT_WORD_TH.docx`, `docs/USER_GUIDE_DOCTOR_WORD_TH.docx`, `docs/USER_GUIDE_*_PPT_TH.pptx` |
| เอกสารปฏิบัติการ Production | `docs/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` |
| สร้าง/อัปเดตคู่มือ | `python scripts/build-portal-user-guides.py` |
| อัปเดตหน้ากระบวนการ | `python scripts/enrich-process-pages.py --force-steps` |
| ล้างข้อมูลทดสอบ (ไม่ re-seed demo) | `npm run cleanup:cloud-test-only` |
| การทดสอบอัตโนมัติ | Playwright Groups A–Q + Vitest — `tests/PROCESS_COVERAGE_MATRIX.md` |
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-6** (Word ตาราง+สารบัญ / PPT รายสไลด์+ตารางขั้นตอนครบ) |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน

---


## 1. Purpose

AI-powered medical assistant and clinical calculators accessible from any page via floating action button. Uses Google Gemini 2.5 Flash Lite.

---


## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 Gemini AI Studio              API: 🟢 Connected                 │
│                                                                     │
│  Tabs: [💬 Chat] [🧮 Calculators]                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              (Tab Content)                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  📚 Clinical Resources: ดูทรัพยากรทางคลินิก →                        │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Chat Tab


- Medical Q&A with Gemini AI

- Context-aware medical conversations

- Persistent session history

- Thai and English support

---


## 4. Calculators Tab


### BMI Calculator

| Input | Description |
| ----- | ----------- |
| Weight (kg) | Patient weight |
| Height (cm) | Patient height |
| **Output** | BMI value + category (Underweight/Normal/Overweight/Obese) |




### eGFR Calculator (CKD-EPI Formula)

| Input | Description |
| ----- | ----------- |
| Creatinine (mg/dL) | Serum creatinine |
| Age (years) | Patient age |
| Gender | Male / Female |
| Race | For CKD-EPI adjustment |
| **Output** | eGFR value + CKD stage |




### Coming Soon


- CHADS₂-VASc Score (stroke risk in AFib)

- Framingham Risk Score (cardiovascular risk)

---


## 5. API Status Indicator

| Status | Badge | Meaning |
| ------ | ----- | ------- |
| Connected | 🟢 Green | Gemini API key configured and working |
| Warning | 🟡 Yellow | API key missing (`VITE_GEMINI_API_KEY`) |



---


## 6. Workflows


### Workflow: Clinical AI Query

```text
Step 1: Click AI FAB button (bottom-right, any page)
Step 2: GeminiAIStudio modal opens
Step 3: Type medical question in chat
Step 4: POST /api/ai/chat → Gemini processes
Step 5: AI response with medical context
Step 6: Continue conversation as needed
```


### Workflow: Use Calculator

```text
Step 1: Switch to Calculators tab
Step 2: Select calculator (BMI or eGFR)
Step 3: Enter patient values
Step 4: Click Calculate
Step 5: Results displayed with interpretation
```


### Workflow 3: AI Meeting Summary Generation

```text
Step 1: Video meeting ends (triggered from Virtual Meeting page)
Step 2: System collects meeting data:
        → Transcript segments (Web Speech API via Socket.IO)
        → Chat messages (Socket.IO captured)
        → Meeting metadata (duration, participants, timestamps)
Step 3: POST /api/ai/generate-meeting-summary
Step 4: Gemini 2.5 Flash Lite processes all inputs
Step 5: For meetings > 30 min: generates 30-minute sectioned summaries
Step 6: Output: SOAP format summary
        S = Subjective (patient statements from transcript)
        O = Objective (doctor observations from transcript)
        A = Assessment (AI-inferred diagnoses from clinical context)
        P = Plan (treatment + follow-up from discussion)
Step 7: Summary stored in PostgreSQL (izara_phase1)
Step 8: Doctor reviews in Health Meeting > Results tab
Step 9: Man-in-the-Loop: Approve / Edit / Regenerate / Reject
Step 10: Approved summary → pre-fills EMR Editor
```


### Workflow 4: Clinical Decision Support (CDS) Alerts

```text
Step 1: AI continuously monitors patient data during consultation
Step 2: Gemini processes:
        → Current symptoms from live transcript
        → Patient medical history (EMR, PHR)
        → Current medications
        → Lab results and vital signs
Step 3: AI generates real-time CDS alerts:
        → ⚠️ Drug Interactions (e.g., Metformin + contrast media)
        → 🚩 Red Flags (e.g., chest pain + diabetes history)
        → 📊 Trend Alerts (e.g., rising HbA1c over 3 visits)
        → 📝 Guideline Reminders (e.g., overdue screening)
Step 4: Alerts displayed in AI Clinical Copilot panel
Step 5: Doctor can acknowledge, dismiss, or act on each alert
```


### Workflow 5: Patient Instruction Sheet Generation

```text
Step 1: Doctor finalizes EMR after meeting
Step 2: Doctor clicks "Generate Patient Instructions"
Step 3: POST /api/ai/generate-instructions
Step 4: Gemini 2.5 Flash Lite generates patient-friendly document:
        → Diagnosis in plain Thai language
        → Medication instructions with dosage/timing
        → Lifestyle recommendations
        → Red flags requiring immediate attention
        → Follow-up schedule
Step 5: Doctor reviews and validates (Man-in-the-Loop)
Step 6: Approved instruction sheet sent to patient
Step 7: Patient accesses via Dashboard > Instruction Sheets
```

---


## 7. AI Meeting Data Integration

Gemini AI Studio processes meeting data from multiple sources for comprehensive clinical intelligence.


### Data Sources for AI Processing

| Source | Technology | Data Type | Integration |
| ------ | ---------- | --------- | ----------- |
| Transcript | Web Speech API (FREE) | Speaker-labeled text segments | Socket.IO → PostgreSQL |
| Chat | Jitsi built-in chat | Text messages with timestamps | Socket.IO → PostgreSQL |
| Meeting Metadata | Jitsi External API | Duration, participants, recordings | Meeting Server (port 3020) |
| Patient History | PostgreSQL (izara_phase1) | EMR, PHR, labs, vitals | Direct DB query |
| Prescription Data | PostgreSQL | Current medications | Direct DB query |




### AI Processing Pipeline

```text
┌──────────────────────────────────────────────────────────────┐
Meeting Data Collection
│                                                              │
│  Transcript (127 segments) + Chat (8 msgs) + Metadata        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
Gemini 2.5 Flash Lite Processing
│                                                              │
│  1. Pre-consultation Summary (before meeting)                │
│  2. Real-time CDS Alerts (during meeting)                    │
│  3. SOAP Meeting Summary (after meeting)                     │
│  4. 30-min Sectioned Summaries (for long meetings)           │
│  5. Patient Instruction Sheet (after EMR finalization)       │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
Man-in-the-Loop Validation
│                                                              │
│  Doctor reviews ALL AI output before patient delivery        │
│  Actions: Approve / Edit / Regenerate / Reject               │
└──────────────────────────────────────────────────────────────┘
```


### AI Output Types

| Output | Trigger | Input Data | Validation |
| ------ | ------- | ---------- | ---------- |
| Pre-consultation Summary | Before meeting | Patient PHR + EMR history | Doctor reviews before meeting |
| CDS Alerts | During meeting (real-time) | Live transcript + patient data | Doctor acknowledges in meeting |
| SOAP Meeting Summary | After meeting ends | Transcript + Chat + Metadata | Man-in-the-Loop (Approve/Edit/Regenerate/Reject) |
| 30-Min Sections | After meeting (> 30 min) | Same as SOAP, segmented | Part of SOAP validation |
| Patient Instruction Sheet | After EMR finalized | Finalized EMR data | Doctor validates before sending |
| Clinical Calculator | On-demand | Patient vitals/labs | Immediate result, no validation needed |



---


## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/ai/chat` | AI medical chat |
| GET | `/api/ai/status` | Check Gemini API status |
| POST | `/api/ai/generate-meeting-summary` | Generate SOAP summary from meeting data |
| POST | `/api/ai/generate-instructions` | Generate Patient Instruction Sheet |
| POST | `/api/ai/pre-consultation-summary` | Generate pre-consultation summary |
| POST | `/api/ai/clinical-decision-support` | Generate CDS alerts from patient data |
| POST | `/api/ai/regenerate-summary` | Regenerate summary with doctor feedback |
| POST | `/api/ai/validation` | Validate AI-generated content |
| GET | `/api/ai/meeting-sections/:id` | Get 30-min sectioned summaries |
| POST | `/api/ai/calculate/bmi` | BMI calculation |
| POST | `/api/ai/calculate/egfr` | eGFR calculation |



---


## 9. AI Agent Improvement Opportunities


- **More calculators**: Add CHADS₂-VASc, Framingham, APACHE II, Wells Score

- **Calculator auto-fill**: AI pull patient data to pre-fill calculators

- **Contextual suggestions**: AI suggest relevant calculators based on patient condition

- **Drug dosing**: AI calculate weight-based and renal-adjusted drug doses

- **Clinical decision trees**: AI-guided diagnostic pathways

- **Meeting summary quality**: AI self-assess confidence per SOAP section

- **Multi-language support**: AI generate summaries in both Thai and English

- **Instruction readability**: AI adapt instruction sheet complexity to patient literacy

- **Longitudinal analysis**: AI identify health trends across multiple meeting summaries

- **Evidence linking**: AI cite clinical guidelines in CDS alerts

---


## PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| ai_chat_history | SELECT/INSERT | AI conversation logs per session |
| ai_chat_memory | SELECT/INSERT/UPDATE | Contextual memory per patient for continuity |
| knowledge_base | SELECT | RAG retrieval for medical knowledge |
| ai_document_analysis | INSERT/SELECT | Document analysis results (lab reports, images) |
| emr | SELECT | EMR context for AI consultations |
| transcriptions_embeddings | SELECT | Transcript embeddings for semantic search |




### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/ai/chat | POST | SELECT knowledge_base (RAG); INSERT ai_chat_history; UPDATE ai_chat_memory |
| POST /api/ai/document-analysis | POST | INSERT ai_document_analysis |
| POST /api/ai/meeting-summary | POST | SELECT transcriptions_embeddings; INSERT ai_chat_history |




### AI Engine

- **Model:** Gemini 2.5 Flash Lite (Google AI)


### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **15 Gemini AI Studio** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

### ขอบเขตและบทบาท

แพทย์เป็น **HOST** ของวิดีโอคอล: Admit lobby, บันทึก, จบประชุม, ตรวจสอบ AI Summary ก่อนลง EMR
ผู้ดูแลระบบ (admin) จัดการ Pool นัด อนุมัติบัญชี และเนื้อหา — ไม่แทนแพทย์ในการลงนาม EMR

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
- `docs/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook
- `docs/USER_GUIDE_*_WORD_TH.docx` / `docs/USER_GUIDE_*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์

### องค์ประกอบ UI หลัก (data-testid)

- ดู `tests/SELECTORS.md` สำหรับหน้านี้

*(รุ่นเอกสารหน้านี้: ENRICH-6 — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*


## ขั้นตอนการใช้งาน (ละเอียด)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)

1. เปิด AI Doctor / Gemini Studio
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 1 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **UI หลัก:** ดู `tests/SELECTORS.md` สำหรับหน้านี้
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
2. กรอกอาการหรือคำถาม — ไม่ใส่ข้อมูลระบุตัวบุคคลเกินจำเป็น
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 2 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
3. อ่านคำเตือน: ไม่ใช่การวินิจฉัย
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 3 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
4. ใช้ปุ่ม handoff จองนัดหากแนะนำ
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 4 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
   - **รายละเอียด:** จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย
   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก
   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง
5. แพทย์ตรวจสอบผลลัพธ์ก่อนส่งต่อผู้ป่วย
   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้
   - **รายละเอียด:** ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)
   - **รายละเอียด:** บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน
   - **รายละเอียด:** ลำดับขั้นที่ 5 ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging
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
| **Status** | covered |
| **Unit tests** | `geminiService` |
| **UI (Playwright)** | Group J |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `15_Gemini_AI_Studio` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

