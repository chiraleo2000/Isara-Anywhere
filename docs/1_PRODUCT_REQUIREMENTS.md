# 1. Product Requirements Document (PRD)

## Overview

**Product:** Isara Anywhere — Doctor AI Service (v2.0)
**Scope:** Omnichannel AI-assisted clinical workflows with dual AI/backend architecture
**Compliance:** Thailand PDPA, HIPAA-aligned data-handling practices

---

## 1.1 Problem Statement

The current Doctor AI service relies solely on Google Gemini and Google Cloud Services (GCS) for AI reasoning and data persistence. It lacks:

- A dedicated context-management (MCP) layer for stateful, multi-turn clinical reasoning
- Mobile-first patient engagement through common social messaging apps (LINE, WhatsApp, native Messages, Telegram)
- Omnichannel monitoring tools for the healthcare team
- Automated clinical workflow triggers from conversational inputs

---

## 1.2 User Roles & Permissions

| Role | Description | Access Level |
|---|---|---|
| `patient` | Registers via social chat, provides symptoms/history | Omnichannel chat only |
| `doctor` | Reviews parsed data, approves AI drafts, prescribes | Full EMR read/write |
| `nurse` / `care_team` | Joins team conferences, views parsed chat | Read EMR, write notes |
| `admin` | Manages users, RBAC, consent records | System-wide admin |
| `system` | Internal service account for backend jobs | Service-to-service only |

---

## 1.3 Feature List

### MVP (Must-Have)

| # | Feature | Doctor AI Task |
|---|---|---|
| 1 | OpenClaw MCP server integration as primary chat context engine | All |
| 2 | Google Services backend maintained synchronously | All |
| 3 | LINE & WhatsApp webhook ingestion with signature validation | Task 1, 4 |
| 4 | Telegram secure group for care-team conferences | Task 2 |
| 5 | NLP parsing of patient chat into structured medical data (HPI, PE) | Task 1 |
| 6 | AI-driven investigation request drafting (Lab, Radiology, Pathology) | Task 3 |
| 7 | Automated prescription drafting & follow-up message dispatch | Task 4 |
| 8 | Auto-generated referral package from MCP context + chat history | Task 5 |
| 9 | PDPA consent workflow at patient onboarding | All |
| 10 | RBAC enforcement on frontend omnichannel monitor | All |
| 11 | AES-256 encrypted payload routing between OpenClaw and GCS | All |
| 12 | Webhook HMAC-SHA256 signature validation | Task 1, 4 |

### Nice-to-Have (V2)

- Apple Messages (iMessage Business) integration
- WhatsApp voice-note transcription via Speech-to-Text API
- Automated ICD-10 coding from MCP context
- Patient mobile app (React Native) with direct MCP connection
- AI-generated x-ray / lab-result summaries from image uploads

---

## 1.4 Acceptance Criteria

### AC-001 — Patient onboarding via LINE
- **Given** a patient sends any message to the LINE Official Account
- **When** they are not yet consented
- **Then** the bot sends a PDPA consent form link and awaits explicit opt-in before processing any data

### AC-002 — Structured history from chat
- **Given** a patient describes symptoms in natural language via WhatsApp
- **When** the OpenClaw MCP server processes the message
- **Then** structured `HPI`, `symptoms[]`, and `vitalSigns{}` fields are persisted to GCS patient bucket

### AC-003 — Care-team conference
- **Given** a doctor requests a team consult on a patient
- **When** OpenClaw pulls MCP context from GCS
- **Then** a formatted summary is posted to the designated secure Telegram group within 10 seconds

### AC-004 — Prescription automation
- **Given** the doctor approves a treatment plan in the EMR
- **When** the treatment contains medications
- **Then** a draft prescription is created in GCS and a follow-up message is dispatched to the patient's preferred channel

### AC-005 — Webhook security
- **Given** an incoming LINE or WhatsApp webhook
- **When** the HMAC-SHA256 signature does not match
- **Then** the server responds 401 and logs the rejection to the audit log

---

## 1.5 Non-Functional Requirements

| NFR | Requirement |
|---|---|
| Latency | MCP context retrieval ≤ 2 s P95 |
| Availability | 99.9 % uptime for webhook ingestion |
| Security | All PHI encrypted at rest (AES-256) and in transit (TLS 1.3) |
| Compliance | Thailand PDPA full consent lifecycle; audit trail ≥ 1 year retention |
| Scalability | Webhook server handles ≥ 500 concurrent connections |
