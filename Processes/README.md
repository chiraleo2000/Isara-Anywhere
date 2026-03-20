# 📄 Izara Telemedicine — Workflows & Processes

**Version:** 1.5.8  
**Focus:** Web Application Only (Patient Portal + Doctor Portal + Meeting Server)

---

## 📋 Overview

This folder contains all workflow documentation for the Izara Telemedicine platform. Each document describes end-to-end processes, data flows, API interactions, and user journeys.

> **📖 For the complete specification (features, database, API endpoints), see [specs/SPEC_KIT.md](../specs/SPEC_KIT.md)**

---

## 🗂️ Document Index

### Core Workflows

| Document | Description |
|----------|-------------|
| [Appointment_Workflows.md](Appointment_Workflows.md) | Booking → assignment → confirmation → meeting → follow-up |
| [User_management_Workflows.md](User_management_Workflows.md) | Registration, login, roles, admin approval, password reset |
| [Health_Records_Processes.md](Health_Records_Processes.md) | PHR (vitals, medications, allergies), EMR, prescriptions, lab orders |
| [VIDEO_MEETING_JITSI_GEMINI.md](VIDEO_MEETING_JITSI_GEMINI.md) | Video meeting, Jitsi integration, transcription, AI summary pipeline |
| [Medicine_Content_Processes.md](Medicine_Content_Processes.md) | Medical content CRUD, approval workflow, patient library |
| [Clinical_Resources_&_Medical_Library_Workflows.md](Clinical_Resources_&_Medical_Library_Workflows.md) | Clinical guidelines, protocols, RAG knowledge base |
| [Medical_Consultants_Workflows.md](Medical_Consultants_Workflows.md) | Specialist directory, consultant management |
| [Notification_Workflows.md](Notification_Workflows.md) | In-app notifications, read/unread, preferences |
| [Data_Sync_Documentation.md](Data_Sync_Documentation.md) | Database sync, data consistency, audit trail |

### Living Will & PDPA

| Document | Description |
|----------|-------------|
| [Living_Will_Processes.md](Living_Will_Processes.md) | 4-step wizard, healthcare proxy, sharing controls |
| [Living_Will_Implementation_Plan.md](Living_Will_Implementation_Plan.md) | TypeScript interfaces, API design, database schema |

### UI & Pages

| Document | Description |
|----------|-------------|
| [UI_Pages_Workflows.md](UI_Pages_Workflows.md) | Cross-page navigation flows and UI patterns |
| [PHASE1_REQUIREMENTS.md](PHASE1_REQUIREMENTS.md) | Original Phase 1 stakeholder requirements |

### Page-by-Page Documentation

| Folder | Pages | Description |
|--------|-------|-------------|
| [Pages/Patient-Portal/](Pages/Patient-Portal/) | 15 pages | Complete patient portal documentation |
| [Pages/Doctor-Portal/](Pages/Doctor-Portal/) | 21 pages | Complete doctor portal documentation |
| [Pages/Meeting-Server/](Pages/Meeting-Server/) | 1 page | Meeting server API documentation |

### Thai Translations

| Document | Description |
|----------|-------------|
| [Thai/](Thai/) | Thai-language versions of core workflow documents |

---

## 🔄 Core Workflow: Appointment → Meeting → EMR

```text
Patient Books Appointment → AI Symptom Analysis
    → Admin Assigns Doctor → Doctor Confirms
    → Meeting Link Generated (Jitsi)
    → Video Consultation + Live Transcription (Web Speech API)
    → AI SOAP Summary (Gemini) → Doctor Man-in-Loop Review
    → EMR Created + Prescriptions + Lab Orders + Imaging Orders
    → Patient Receives Instructions → Follow-up Scheduled
```

---

## 🆕 v1.5.2 Changes

- **Lab Orders**: Now stored in PostgreSQL (was broken GCS mock)
- **Prescriptions**: Now stored in PostgreSQL (was broken GCS mock)
- **Imaging Orders**: New feature — full CRUD with result upload
- **Doctor Approval**: Fixed SQL filter for admin doctor management
- **Embedded PG**: Cloud Run uses embedded PostgreSQL (no Cloud SQL)
- **Mobile Removed**: Project scope is web-only; mobile docs archived
