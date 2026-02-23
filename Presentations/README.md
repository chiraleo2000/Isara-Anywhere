# 📊 IZARA Telemedicine Platform - Presentation Materials

> **Version:** 1.5.1 | **Updated:** February 23, 2026  
> **Status:** Phase 1 Complete | Phase 2 + Phase 2.1 AI-HIS (v1.5.1)  
> **Tests:** 311 Unit Tests (Vitest) + 808 E2E Tests (Playwright) = 1,119 total × 5 Playwright Projects

---

## 🎉 What's New in v1.5.1

### Omnichannel & MCP Integration
- **Omnichannel Webhook Server** (Port 3015): Handles LINE, WhatsApp, and Telegram webhooks with HMAC-SHA256 validation
- **OpenClaw MCP Server** (Port 3016): AI context management with 5 Doctor AI Tasks
- **PDPA Consent Gate**: All patient messaging requires explicit consent
- **5 Doctor AI Tasks**: History Taking, Team Conference, Investigation, Prescription, Referral
- **Phase 2.1 AI-HIS Tables**: CTM assessments, geriatric screening, SOS alerts, follow-ups, nursing tasks, predictive analytics

### Database Schema Update
- **v5.1**: Added 7 new AI-HIS tables (CTM, geriatric, SOS, follow-ups, nursing, predictive analytics, emr_records)
- **Total: 40 tables** (Phase 1: 25 + Phase 2: 8 + Phase 2.1: 7)

---

## 📘 Documentation

The primary technical reference is located at:  
**[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md)**

This document covers:

1. System Architecture
2. Database Schema (v4.0)
3. User Management & RBAC
4. Core Workflows
5. DevOps & Deployment
6. **Testing** (1,119 tests: 311 unit + 808 E2E, 10 specs, 18 coverage areas, mobile viewport)

---

## 🌐 Live URLs

### Local Environment (Docker)

| Service | URL |
| --------- | ----- |
| Patient Portal | <http://localhost:3005> |
| Doctor Portal | <http://localhost:3010> |
| Meeting Server | <http://localhost:3020> |
| PostgreSQL | localhost:5433 |
| pgAdmin | <http://localhost:5050> |

### Cloud Environment (Google Cloud Run)

| Service | URL |
| --------- | ----- |
| Patient Portal | <https://izara-patient-portal-hvht4obouq-as.a.run.app> |
| Doctor Portal | <https://izara-doctor-portal-hvht4obouq-as.a.run.app> |
| Meeting Server | <https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app> |
| pgAdmin | <https://izara-pgadmin-hvht4obouq-as.a.run.app> |
| Cloud SQL | 34.143.228.135:5432 |

---

## 📁 Folder Structure

```text
Presentations/
├── TECHNICAL_DOCUMENTATION.md    # 🌟 MAIN TECHNICAL REFERENCE
├── PRESENTATION_SCRIPT.md        # Presentation script & guide
├── README.md                     # This file
├── CHANGELOG.md                  # 🆕 Version history & changes
├── database/
│   ├── izara-complete-schema-v4.dbml  # Database schema v4
│   └── izara-complete-schema-v5.dbml  # 🆕 Database schema v5.1 (AI-HIS)
├── diagrams/                     # Mermaid workflow diagrams (.mmd)
│   ├── 01-system-architecture.mmd
│   ├── 02-patient-features.mmd
│   ├── 03-doctor-features.mmd
│   ├── 04-appointment-workflow.mmd
│   ├── 05-database-schema.mmd
│   ├── 06-emr-workflow.mmd
│   ├── 07-ai-integration.mmd
│   ├── 08-security-rbac.mmd
│   ├── 09-deployment-architecture.mmd
│   ├── 10-video-meeting-flow.mmd
│   ├── 11-phr-management.mmd
│   ├── 12-prescription-workflow.mmd
│   ├── 13-omnichannel-workflow.mmd       # 🆕 Omnichannel messaging
│   └── 14-mcp-session-lifecycle.mmd      # 🆕 MCP & 5 Doctor AI Tasks
└── html-diagrams/                # 🌐 Interactive HTML Diagrams
    ├── index.html                # Start here to view all diagrams
    └── *.html                    # Individual diagram files
```

---

## 🛠️ Quick Usage

### View Diagrams

Open **[html-diagrams/index.html](html-diagrams/index.html)** in your browser.

### Technical Overview

Read **[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md)**

### Database Schema

View **[database/izara-complete-schema-v5.dbml](database/izara-complete-schema-v5.dbml)**  
(Visualize with [dbdiagram.io](https://dbdiagram.io) or VS Code DBML extension)

### Regenerate HTML Diagrams

```powershell
.\generate-diagrams.ps1
```

---

## 🎯 Key Diagrams

| # | Diagram | Description |
| --- | --------- | ------------- |
| 01 | System Architecture | High-level platform overview (updated with omnichannel) |
| 02 | Patient Features | Patient portal capabilities |
| 03 | Doctor Features | Doctor portal capabilities |
| 04 | Appointment Workflow | Booking & confirmation flow |
| 05 | Database Schema | PostgreSQL schema overview |
| 06 | EMR Workflow | SOAP notes & AI summary |
| 07 | AI Integration | Gemini AI features (Chat, CDS) |
| 08 | Security & RBAC | Roles & permissions |
| 09 | Deployment Architecture | Docker & Cloud Run |
| 10 | Video Meeting Flow | Jitsi + transcription + AI |
| 11 | PHR Management | Personal health records |
| 12 | Prescription Workflow | E-prescribe with CDS |
| 13 | **🆕 Omnichannel Workflow** | LINE/WhatsApp/Telegram → MCP → Doctor Portal |
| 14 | **🆕 MCP Session Lifecycle** | 5 Doctor AI Tasks & session management |

---

## 📋 Test Credentials (5 Demo Accounts)

| Role | Email | Password | Portal |
| ------ | ------- | ---------- | ------- |
| Patient 1 (Demo) | `demo.test@gmail.com` | P@ssw0rd | Patient |
| Patient 2 (Somchai) | `Somchai.Mankong@gmail.com` | P@ssw0rd | Patient |
| Patient 3 (Anan) | `Anan.Khayanrian@gmail.com` | P@ssw0rd | Patient |
| Doctor | `doctor.test@izara.com` | IzaraDoctor@2024 | Doctor |
| Admin | `admin.test@izara.com` | IzaraAdmin@2024 | Doctor |

---

## 🔗 Service URLs

| Service | Local | Cloud |
| --------- | ------- | ------- |
| Patient Portal | <http://localhost:3005> | <https://izara-patient-portal-*.run.app> |
| Doctor Portal | <http://localhost:3010> | <https://izara-doctor-portal-*.run.app> |
| PostgreSQL | localhost:5433 | Cloud SQL |

---

### Last Updated: February 23, 2026
