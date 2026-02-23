# Isara-Anywhere — Workflows and Processes

## 1. Doctor AI Task Workflows

### Task 1: Patient & Family — Conversational Data Entry

```
Patient (LINE/WhatsApp) → Webhook Gateway → MCP Server
    ↓
MCP parses natural language → Structured medical data
    ↓
Stores in PostgreSQL via Google Services Backend
    ↓
Confirms data entry to patient via same channel
```

**Supported flows:**
- History taking via conversational prompts
- Physical examination data entry (vitals, symptoms)
- Basic medical data input (allergies, medications, conditions)

### Task 2: Healthcare Team — Consults & Conferences

```
Doctor requests patient summary → MCP Server
    ↓
MCP pulls real-time context from Google Services
    ↓
Generates structured summary
    ↓
Posts to designated team channel (Telegram group)
```

### Task 3: Investigation — Radiology, Lab, Pathology

```
Doctor sends investigation request via chat → MCP Server
    ↓
MCP interprets and structures request
    ↓
Logs to Google Services Backend (lab orders, imaging)
    ↓
Confirms order to requesting doctor
```

### Task 4: Treatment — Prescriptions & Follow-ups

```
Doctor initiates prescription via chat → MCP Server
    ↓
MCP drafts prescription from drug database
    ↓
Stores in Google Services Backend
    ↓
Sends follow-up reminders to patient via preferred channel
```

### Task 5: Refer — Medical Record Generation

```
Doctor requests referral → MCP Server
    ↓
MCP compiles chat history + patient context
    ↓
Generates comprehensive referral document
    ↓
Stores in Google Services Backend + notifies receiving facility
```

## 2. Consent Management Workflow (PDPA)

```
New patient onboarding → Consent request sent via chat
    ↓
Patient reviews privacy policy + data usage terms
    ↓
Patient explicitly accepts/declines
    ↓
Consent status stored in database
    ↓
Only proceed with medical services if consent granted
```

## 3. Webhook Message Processing Pipeline

```
1. Receive webhook POST from channel platform
2. Validate webhook signature (HMAC-SHA256)
3. Parse message payload (channel-specific format)
4. Normalize to internal message format
5. Check patient consent status
6. Route to MCP for AI processing
7. Format response for target channel
8. Send response via channel API
9. Log interaction in audit trail
```
