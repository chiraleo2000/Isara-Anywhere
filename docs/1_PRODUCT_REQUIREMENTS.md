# Isara-Anywhere — Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** Isara-Anywhere Doctor AI Omnichannel Service  
**Version:** 2.0.0  
**Last Updated:** 2026-02-23

Isara-Anywhere upgrades the existing Doctor AI telemedicine platform to support omnichannel mobile access via LINE, WhatsApp, native Messages, and Telegram. The system integrates OpenClaw as a Model Context Protocol (MCP) chat server while maintaining the existing Google Services backend.

## 2. Objectives

1. Integrate OpenClaw as the primary MCP chat server for contextual AI reasoning and state management.
2. Maintain synchronous operation with the existing Google Services backend.
3. Implement omnichannel access via LINE, WhatsApp, Messages, and Telegram.
4. Ensure strict medical data privacy compliance (Thailand PDPA).

## 3. User Roles

| Role | Description |
|------|-------------|
| Patient | End users accessing health services via social chat apps |
| Doctor | Healthcare professionals monitoring and responding via the doctor portal |
| Healthcare Team | Nurses, pharmacists, lab technicians collaborating on patient care |
| Admin | System administrators managing configurations and access |

## 4. Functional Requirements

### FR-1: Omnichannel Messaging
- Accept incoming messages from LINE, WhatsApp, Telegram, and native Messages
- Route messages through OpenClaw MCP for AI processing
- Return structured responses to patients via their preferred channel

### FR-2: AI Context Management (MCP)
- Maintain conversation state per patient across channels
- Parse natural language into structured medical data
- Support contextual reasoning for clinical workflows (Tasks 1–5)

### FR-3: Clinical Task Workflows
- **Task 1 (Patient & Family):** Conversational history taking and physical exam data entry
- **Task 2 (Healthcare Team):** Real-time patient context summaries for team consults
- **Task 3 (Investigation):** AI-suggested radiology, lab, and pathology requests
- **Task 4 (Treatment):** Automated prescription drafts and follow-up messages
- **Task 5 (Refer):** Auto-generated referral documents from chat history

### FR-4: Security & Compliance
- Webhook signature validation for all incoming messages
- PDPA consent management during patient onboarding
- Role-based access control (RBAC) for frontend UI
- Encrypted message routing between OpenClaw and Google Services

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99.9% uptime |
| Response Time | < 2s for webhook processing |
| Data Encryption | AES-256 at rest, TLS 1.3 in transit |
| Compliance | Thailand PDPA, medical data privacy standards |
| Scalability | Support 10,000 concurrent chat sessions |
