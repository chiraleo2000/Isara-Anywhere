# 🤖 Patient Portal — AI Doctor Page

**Route:** `/ai-doctor`
**Component:** `src/pages/health/AIDoctorPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** AI สุขภาพ / AI Health Assistant


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

AI-powered health assistant providing preliminary health advice, symptom assessment, and wellness guidance. Uses Google Gemini 2.5 Flash Lite with medical context.

**⚠️ Disclaimer:** "AI provides preliminary advice only, not medical diagnosis. Always consult a healthcare professional."

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 AI Health Assistant                                             │
├──────────────┬──────────────────────────────────────────────────────┤
│  Sidebar     │  Chat Area                                           │
│  (toggleable)│                                                      │
│              │  ┌──────────────────────────────────────────────┐   │
│  [+ New Chat]│  │  🤖 สวัสดีค่ะ! ฉันคือผู้ช่วย AI ด้านสุขภาพ      │   │
│              │  │  ถามคำถามเกี่ยวกับสุขภาพได้เลยค่ะ              │   │
│  Sessions:   │  └──────────────────────────────────────────────┘   │
│  ├─ Chat 1   │                                                      │
│  ├─ Chat 2   │  Quick Suggestions (when empty):                     │
│  └─ Chat 3   │  [ปวดหัว ควรทำอย่างไร]                                │
│  [🗑️ delete] │  [อาหารที่ดีต่อหัวใจ]                                  │
│              │  [วิธีลดความเครียด]                                    │
│  [Toggle ◀]  │  [ออกกำลังกายที่เหมาะสม]                               │
│              │                                                      │
│              │  ┌──────────────────────────────────────────────┐   │
│              │  │  👤 ปวดหัวมา 3 วัน ทำอย่างไรดี                 │   │
│              │  └──────────────────────────────────────────────┘   │
│              │  ┌──────────────────────────────────────────────┐   │
│              │  │  🤖 อาการปวดหัวเป็นเวลา 3 วัน...               │   │
│              │  │  📌 คำแนะนำเบื้องต้น:                          │   │
│              │  │  1. พักผ่อนให้เพียงพอ...                       │   │
│              │  │  2. ดื่มน้ำมากๆ...                             │   │
│              │  │  ⚠️ ควรพบแพทย์ถ้า...                          │   │
│              │  │  ...  [typing indicator ...]                  │   │
│              │  └──────────────────────────────────────────────┘   │
│              │                                                      │
│              │  ┌──────────────────────────┐ [ส่ง]                 │
│              │  │ พิมพ์คำถามที่นี่...         │                      │
│              │  └──────────────────────────┘                       │
│              │                                                      │
│              │  ⚠️ AI ให้คำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัยโรค       │
└──────────────┴──────────────────────────────────────────────────────┘
```

---


## 3. Features & Actions


### 3.1 Chat Management

| Action | Description |
| ------ | ----------- |
| New Chat | Creates fresh chat session |
| Session List | Shows all past chat sessions in sidebar |
| Delete Session | Removes chat session permanently |
| Toggle Sidebar | Show/hide sidebar for more chat space |


### 3.2 Chat Interaction

| Feature | Description |
| ------- | ----------- |
| Text Input | Type health questions in Thai or English |
| Quick Suggestions | 4 pre-built questions for common health topics |
| AI Response | Streaming response with medical advice |
| Typing Indicator | Animated dots while AI processes |
| Message History | Persistent across sessions |


### 3.3 Quick Suggestion Topics

| Thai | English |
| ---- | ------- |
| ปวดหัว ควรทำอย่างไร | What to do about headaches |
| อาหารที่ดีต่อหัวใจ | Heart-healthy foods |
| วิธีลดความเครียด | How to reduce stress |
| ออกกำลังกายที่เหมาะสม | Appropriate exercise |

---


## 4. Workflows


### Workflow 1: Ask Health Question

```text
Step 1: Patient navigates to /ai-doctor
Step 2: Types question or clicks quick suggestion
Step 3: POST /api/ai/chat with message + session context
Step 4: Typing indicator shown while AI processes
Step 5: Gemini 2.5 Flash Lite generates medical response
Step 6: Response displayed in chat bubble
Step 7: Session saved for future reference
Step 8: Patient can continue asking follow-up questions
```


### Workflow 2: Start New Session

```text
Step 1: Click "New Chat" button in sidebar
Step 2: POST /api/ai/chat/sessions (create new session)
Step 3: Chat area cleared with welcome message
Step 4: Quick suggestions displayed
Step 5: Previous session preserved in sidebar list
```


### Workflow 3: Review Past Conversations

```text
Step 1: Click session in sidebar list
Step 2: GET /api/ai/chat/sessions/:id/messages
Step 3: Full conversation history loaded
Step 4: Can continue conversation from where it left off
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/ai/chat` | Send message + get AI response |
| GET | `/api/ai/chat/sessions` | List all chat sessions |
| POST | `/api/ai/chat/sessions` | Create new session |
| GET | `/api/ai/chat/sessions/:id/messages` | Get session history |
| DELETE | `/api/ai/chat/sessions/:id` | Delete session |

---


## 6. AI Response Format

Responses typically include:

| Section | Description |
| ------- | ----------- |
| 📌 คำแนะนำเบื้องต้น | Preliminary recommendations |
| ⚠️ ควรพบแพทย์ถ้า | When to see a doctor |
| 🏠 การดูแลตัวเอง | Self-care instructions |
| 💊 ข้อมูลยา | Medication information (general) |
| 🔍 ข้อมูลเพิ่มเติม | Additional information |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Dashboard AI widget | ← Same AI service, compact view |
| Dashboard quick action | → This page |
| Symptom triage (booking) | Uses same AI engine |
| Health Studio AI Insight | → This page |

---


## 8. AI Agent Improvement Opportunities


- **Context-aware**: AI reads patient's PHR for personalized advice


- **Image analysis**: AI analyze skin conditions, rashes from photos


- **Medication queries**: AI check specific drug interactions for patient's medications


- **Follow-up prompts**: AI proactively ask clarifying questions


- **Escalation**: AI recommend booking appointment when symptoms are concerning


- **Multilingual**: AI handle conversations in multiple languages simultaneously


- **Voice input**: AI accept voice questions with speech-to-text

---


## 9. PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| ai_chat_history | SELECT/INSERT | Patient AI health chat conversation logs |
| knowledge_base | SELECT | RAG retrieval for medical knowledge responses |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/ai/health-chat | POST | SELECT knowledge_base (RAG); INSERT ai_chat_history |


### AI Engine


- **Model:** Gemini 2.5 Flash Lite (Google AI)


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## คำอธิบายและบริบท (รายงานภาษาไทย)

### วัตถุประสงค์

หน้า **07 AI Doctor** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

### มาตรฐานการจัดทำเอกสาร

- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**
- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`

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
| **Unit tests** | `aiRoute, aiTriage.test.ts` |
| **UI (Playwright)** | Group J |
| **data-testid** | See [tests/SELECTORS.md](../../tests/SELECTORS.md) |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `07_AI_Doctor_Page` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

