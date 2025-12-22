# Documentation File Index

**Version:** 1.0.0  
**Last Updated:** December 11, 2025

## Overview

This document provides a comprehensive index of all documentation files in the `doc/` folder, explaining the purpose and contents of each file.

---

## File Structure

```
doc/
├── README.md                    # Main documentation entry point
├── 01-overview.md              # Project overview (Thai/English)
├── 02-architecture.md          # System architecture diagrams
├── 03-data-structures.md       # JSON schemas for all data types
├── 04-database-schema.dbml     # Database schema in DBML format
├── 05-api-reference.md         # Complete API endpoint documentation
├── 06-workflows.md             # Feature workflow sequence diagrams
├── 07-authentication.md        # Authentication system details
├── 08-pdpa-consent.md          # PDPA consent management
├── 09-appointments.md          # Appointment booking system
├── 10-phr.md                   # Personal Health Records
├── 11-ai-assistant.md          # AI Health Assistant (Gemini)
├── 12-google-services.md       # Google Cloud integrations
├── 13-deployment.md            # Docker & Cloud Run deployment
├── 14-frontend-components.md   # React component reference
├── 15-glossary.md              # Thai-English glossary
├── 16-detailed-flowcharts.md   # Comprehensive process flowcharts
├── diagrams.md                 # All Mermaid diagrams collection
└── FILE-INDEX.md               # This file
```

---

## File Descriptions

### README.md
- **Purpose:** Main entry point for documentation
- **Contents:** Table of contents, version history, quick start guide, feature overview
- **Language:** English with some Thai
- **Updated:** December 11, 2025

### 01-overview.md
- **Purpose:** Comprehensive project overview
- **Contents:** 
  - System goals
  - User access matrix
  - Feature descriptions
  - Page-by-page breakdown
- **Language:** Thai with English technical terms
- **Target Audience:** New developers, stakeholders

### 02-architecture.md
- **Purpose:** Technical architecture documentation
- **Contents:**
  - High-level system architecture
  - Frontend/Backend structure
  - GCS bucket organization
  - Technology stack details
- **Format:** ASCII diagrams, component lists

### 03-data-structures.md
- **Purpose:** Complete JSON schema reference
- **Contents:**
  - User/Auth types
  - Appointment types
  - PHR (Personal Health Record) types
  - PDPA consent types
  - All interface definitions
- **Format:** JSON examples with descriptions

### 04-database-schema.dbml
- **Purpose:** Database relationship documentation
- **Contents:**
  - Table definitions
  - Relationships (foreign keys)
  - Data types
- **Format:** DBML (Database Markup Language)
- **Note:** For visualization, use https://dbdiagram.io

### 05-api-reference.md
- **Purpose:** Complete REST API documentation
- **Contents:**
  - All endpoints (Auth, Appointments, PHR, PDPA, AI, etc.)
  - Request/Response examples
  - Error codes
  - Authentication requirements
- **Format:** Markdown with code blocks

### 06-workflows.md
- **Purpose:** Feature workflow documentation
- **Contents:**
  - Registration flow
  - Login flow
  - Appointment booking
  - PHR updates
  - Living Will management
  - AI chat flow
- **Format:** Mermaid sequence diagrams

### 07-authentication.md
- **Purpose:** Authentication system details
- **Contents:**
  - Login/Register process
  - Session management
  - Token handling
  - Security measures
- **Format:** Mermaid diagrams, code examples

### 08-pdpa-consent.md
- **Purpose:** PDPA compliance documentation
- **Contents:**
  - Consent types
  - Data access permissions
  - Audit logging
  - Thai PDPA compliance details
- **Language:** Thai with English technical terms

### 09-appointments.md
- **Purpose:** Appointment system documentation
- **Contents:**
  - Appointment types
  - Booking workflow
  - Google Calendar integration
  - Google Meet setup
  - Treatment results
- **Format:** Diagrams, API examples

### 10-phr.md
- **Purpose:** Personal Health Records documentation
- **Contents:**
  - PHR data structure
  - Vital signs tracking
  - Medications
  - Allergies
  - Lab results
  - Medical documents
- **Format:** JSON schemas, field descriptions

### 11-ai-assistant.md
- **Purpose:** AI Health Assistant documentation
- **Contents:**
  - Gemini AI integration
  - Prompt engineering
  - Safety guardrails
  - Response filtering
  - Chat context management
- **Format:** Code examples, system prompts

### 12-google-services.md
- **Purpose:** Google Cloud integrations
- **Contents:**
  - Google Cloud Storage (GCS) buckets
  - Google Calendar API
  - Google Meet API
  - Google Maps API
  - Places API
- **Format:** API examples, configuration

### 13-deployment.md
- **Purpose:** Deployment guide
- **Contents:**
  - Local development setup
  - **Unified Docker Image** (recommended)
  - Google Cloud Run deployment
  - Environment variables
  - Health checks
  - Troubleshooting
- **Updated:** December 11, 2025 with Cloud Run instructions

### 14-frontend-components.md
- **Purpose:** React component reference
- **Contents:**
  - UI components (Button, Input, Modal, etc.)
  - Health components (VitalsChart, MedicalContent)
  - Page components
  - Custom hooks
  - Styling patterns
- **Format:** TypeScript interfaces, usage examples

### 15-glossary.md
- **Purpose:** Reference glossary
- **Contents:**
  - Thai-English medical terms
  - Abbreviations
  - Status codes
  - Error codes
  - API quick reference
- **Language:** Bilingual (Thai/English)

### 16-detailed-flowcharts.md
- **Purpose:** Comprehensive process flowcharts
- **Contents:**
  - Complete user journey
  - Authentication process detail
  - Appointment booking flow
  - PHR management flow
  - Vital signs recording
  - Treatment results filtering
  - Living Will versioning
  - AI chat process
  - PDPA consent flow
  - Map services flow
  - Telehealth session
  - Error handling
  - System state diagram
- **Format:** Mermaid flowcharts with Thai/English labels

### diagrams.md
- **Purpose:** All diagrams in one file
- **Contents:**
  - System architecture
  - Authentication flow
  - Appointment booking
  - PHR data flow
  - AI assistant flow
  - GCS bucket structure
  - Component tree
  - Entity relationships
- **Format:** Mermaid diagrams

---

## File Relationships

```
README.md (Entry Point)
    │
    ├── 01-overview.md ─────── General understanding
    │
    ├── 02-architecture.md ─── Technical foundation
    │   └── 03-data-structures.md ─── Data definitions
    │       └── 04-database-schema.dbml
    │
    ├── 05-api-reference.md ── API usage
    │   ├── 07-authentication.md
    │   ├── 08-pdpa-consent.md
    │   ├── 09-appointments.md
    │   ├── 10-phr.md
    │   └── 11-ai-assistant.md
    │
    ├── 06-workflows.md ────── Process flows
    │   └── 16-detailed-flowcharts.md (Extended)
    │
    ├── 12-google-services.md ─ Cloud integrations
    │
    ├── 13-deployment.md ───── Deployment guide
    │
    ├── 14-frontend-components.md ─ React reference
    │
    ├── 15-glossary.md ──────── Quick reference
    │
    └── diagrams.md ─────────── Visual summary
```

---

## Usage Guide

### For New Developers
1. Start with `README.md`
2. Read `01-overview.md` for context
3. Review `02-architecture.md` for structure
4. Use `05-api-reference.md` for API work

### For Deployment
1. Read `13-deployment.md` (updated for Cloud Run)
2. Check `12-google-services.md` for GCP setup

### For Understanding Workflows
1. See `06-workflows.md` for basic flows
2. See `16-detailed-flowcharts.md` for detailed processes

### For Frontend Development
1. Use `14-frontend-components.md` for component reference
2. Check `03-data-structures.md` for TypeScript types

### For Thai/English Translation
1. Use `15-glossary.md` for medical terms

---

## Maintenance Notes

- All files use Mermaid for diagrams (compatible with GitHub, VS Code)
- DBML file can be visualized at https://dbdiagram.io
- Version numbers should be updated when making significant changes
- Thai language is used for patient-facing descriptions
- English is used for technical documentation

---

[Back to README →](./README.md)
