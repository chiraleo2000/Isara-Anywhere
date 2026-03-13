# 📊 IZARA Telemedicine Platform - Presentation Materials

> **Version:** 1.5.6 | **Updated:** March 14, 2026
> **Status:** Phase 1 Complete + Code Quality Hardened — All Tests Passing (v1.5.6)
> **Tests:** 1,419 Unit Tests (Vitest) + 1,191 E2E Tests (Playwright) = **2,610 total — 100% Pass Rate**  
> **Code Quality:** SonarQube clean — zero `error: any`, strict TypeScript safety

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
6. **Testing** (2,610 tests: 1,419 unit across 46 files + 1,191 E2E across 24 specs)

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
| Patient Portal | <https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Doctor Portal | <https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app> |
| Meeting Server | <https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app> |
| pgAdmin | <https://izara-pgadmin-dev-testing-724889190329.asia-southeast1.run.app> |
| PostgreSQL VM | 35.240.157.230:5432 |

---

## 📁 Folder Structure

```text
Presentations/
├── TECHNICAL_DOCUMENTATION.md    # 🌟 MAIN TECHNICAL REFERENCE
├── PRESENTATION_SCRIPT.md        # Presentation script & guide
├── README.md                     # This file
├── database/
│   └── izara-complete-schema-v4.dbml  # Database schema (DBML)
├── diagrams/                     # 12 Mermaid workflow diagrams (.mmd)
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
│   └── 12-prescription-workflow.mmd
└── html-diagrams/                # 🌐 24 Interactive HTML Diagrams
    ├── index.html                # Start here — gallery of all diagrams
    ├── 01–12 *.html              # Core diagrams (from .mmd sources)
    └── 13–24 *.html              # Extended workflow diagrams
```

---

## 🛠️ Quick Usage

### View Diagrams

Open **[html-diagrams/index.html](html-diagrams/index.html)** in your browser.

### Technical Overview

Read **[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md)**

### Database Schema

View **[database/izara-complete-schema-v4.dbml](database/izara-complete-schema-v4.dbml)**  
(Visualize with [dbdiagram.io](https://dbdiagram.io) or VS Code DBML extension)

### Regenerate HTML Diagrams

```powershell
.\generate-diagrams.ps1
```

### Run All Tests

```powershell
# Unit tests (1,419 tests, ~4.3s)
cd tests/unit && npx vitest run

# E2E tests (1,191 tests, ~5.9 min, requires Docker)
cd tests/e2e && $env:CI="true"; npx playwright test --project=Local
```

---

## 🎯 Key Diagrams

| # | Diagram | Description |
| --- | --------- | ------------- |
| 01 | System Architecture | High-level platform overview |
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
| PostgreSQL | localhost:5433 | GCE VM (35.240.157.230) |

---

### Last Updated: March 13, 2026
