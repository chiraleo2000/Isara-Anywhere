# 🤖 Patient Portal — AI Doctor Page

**Route:** `/ai-doctor`
**Component:** `src/pages/health/AIDoctorPage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** AI สุขภาพ / AI Health Assistant

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
