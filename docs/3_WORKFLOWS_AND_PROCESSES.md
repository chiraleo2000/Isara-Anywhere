# 3. Workflows & Processes

## 3.1 Patient Onboarding & Consent (PDPA Compliance)

```
Actor: Patient       Action                    System Response
─────────────────────────────────────────────────────────────
Patient    →  Sends first message to LINE/WhatsApp/Telegram
           ←  Webhook Server checks consentStore(userId)
           ←  [No consent] Sends consent URL + PDPA summary
Patient    →  Clicks consent link, reads PDPA notice
Patient    →  Submits opt-in (name, DOB, channel)
           ←  Webhook Server writes consent record to GCS
              {consentedAt, pdpaVersion, channels[], scope}
           ←  Confirmation message sent back to patient
           ←  Patient session created in OpenClaw MCP context store
```

**Edge Case:** If patient declines consent, no PHI is stored; bot sends
`"ขออภัย เราไม่สามารถให้บริการได้หากไม่ได้รับความยินยอม"` and closes session.

---

## 3.2 Task 1 — History Taking & Physical Exam via Chat

```
Actor: Patient       Action                         System Response
─────────────────────────────────────────────────────────────────────
Patient    →  Sends symptom description in natural language
              (e.g., "มีไข้ 3 วัน ปวดหัว คลื่นไส้" via LINE)
           ←  Webhook Server normalises → OmnichannelMessage
           →  POST /mcp/ingest {message, channel, patientId}
           ←  OpenClaw MCP:
                extractMedicalEntities(text)  → Gemini API
                returns { symptoms[], vitalSigns{}, history{} }
              Structured data written to GCS patient bucket:
                patients/{id}/hpi.json
           ←  Bot replies: "ขอบคุณ ท่านมีอาการปวดศีรษะ คลื่นไส้ มีไข้
                            กรุณาระบุอุณหภูมิร่างกายล่าสุดหรือไม่?"
           ←  Socket.io event emitted → Doctor Portal UI updates patient card
```

**Data persisted:** `HPI`, `symptoms[]`, `physicalExamNotes`, `vitals{}`

---

## 3.3 Task 2 — Care Team Conference via Telegram

```
Actor: Doctor         Action                           System Response
─────────────────────────────────────────────────────────────────────
Doctor     →  Clicks "Request Team Consult" in EMR UI
           →  POST /api/team-consult {patientId, urgency, question}
           ←  Main API Server → OpenClaw MCP:
                GET /mcp/context/{patientId}
                returns full MCP context (HPI, labs, meds, assessments)
           ←  Gemini generates team-brief summary (<500 words)
           ←  Telegram Bot posts to secure group:
                "🔴 CONSULT REQUEST — [Patient ID redacted]
                 Chief Complaint: ...
                 Current Meds: ...
                 Question: ..."
           ←  Doctor Portal UI shows "Consult sent ✓"
```

**Security:** Patient name replaced with ID in Telegram; full name visible
only to authenticated portal users with role `doctor` or `nurse`.

---

## 3.4 Task 3 — Investigation Request via Chat

```
Actor: Patient/Doctor  Action                         System Response
─────────────────────────────────────────────────────────────────────
Patient    →  Reports additional symptoms via WhatsApp
           ←  MCP context updated (Task 1 flow)
Doctor     →  Reviews updated context in portal; types "order CBC, LFT"
              or AI Copilot suggests investigations automatically
           ←  Doctor approves suggested lab orders
           →  POST /api/lab-orders {patientId, orders[], approvedBy}
           ←  Lab order record written to GCS patient bucket
           ←  Patient notified via preferred channel:
                "แพทย์สั่งตรวจ CBC, LFT — กรุณาติดต่อห้องแล็บเพื่อนัดหมาย"
           ←  Audit log entry created
```

---

## 3.5 Task 4 — Prescription & Automated Follow-up

```
Actor: Doctor         Action                           System Response
─────────────────────────────────────────────────────────────────────
Doctor     →  Approves treatment plan in EMR
           ←  DocumentGenerator creates draft prescription (Gemini)
Doctor     →  Reviews and signs prescription
           →  POST /api/prescriptions {patientId, medications[]}
           ←  Prescription persisted to GCS
           ←  Omnichannel Webhook Server dispatches follow-up:
                Channel: patient's registered channel (LINE/WhatsApp)
                Message: "คุณได้รับใบสั่งยา: [ยา] [ขนาด] [ความถี่]
                          หากมีผลข้างเคียงกรุณาติดต่อ..."
           ←  Follow-up reminder scheduled (T+24h, T+72h)
```

---

## 3.6 Task 5 — Referral Package Generation

```
Actor: Doctor         Action                           System Response
─────────────────────────────────────────────────────────────────────
Doctor     →  Clicks "Generate Referral" in EMR UI
           →  POST /api/referrals/generate {patientId, targetFacility}
           ←  OpenClaw MCP:
                GET /mcp/context/{patientId}  (full history)
              Gemini generates referral letter:
                - Demographics (de-identified for external)
                - Summary of HPI, assessment, treatment
                - Investigations performed + results
                - Reason for referral
           ←  PDF-ready JSON referral document written to GCS
           ←  Doctor downloads / sends to receiving facility
           ←  Patient notified: "แพทย์ได้ส่งต่อเวชระเบียนของท่านแล้ว"
```

---

## 3.7 Webhook Message Processing State Machine

```
RECEIVED → SIGNATURE_VALIDATED → CONSENT_CHECKED → NORMALISED
    │               │                   │
    └─ 401 Reject   └─ 400 Bad Sig  └─ CONSENT_REQUESTED
                                            │
                                     CONSENTED → MCP_INGESTED → GCS_WRITTEN → UI_NOTIFIED
```

---

## 3.8 MCP Session Lifecycle

| Event | MCP Action |
|---|---|
| Patient first message (post-consent) | `createSession(patientId, channel)` |
| Each subsequent message | `updateContext(sessionId, entities)` |
| Doctor requests context | `getContext(patientId)` → full snapshot |
| Appointment completed | `archiveSession(patientId)` → move to GCS long-term store |
| Patient revokes consent | `deleteSession(patientId)` → purge all context |
