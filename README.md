# 🏥 Izara Telemedicine Platform

![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-web-lightgrey.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Local Tests](https://img.shields.io/badge/local%20tests-123%20passing-brightgreen.svg)
![Cloud Tests](https://img.shields.io/badge/cloud%20tests-123%20passing-brightgreen.svg)
![Skipped Tests](https://img.shields.io/badge/skipped%20tests-0-brightgreen.svg)
![SonarQube](https://img.shields.io/badge/SonarQube-passed-brightgreen.svg)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-deployed-blue.svg)

## A comprehensive telemedicine platform built for Thailand's healthcare system

[Demo](#-portal-urls) • [Features](#-key-features) • [Installation](#-installation--setup) • [Cloud Deployment](#-cloud-deployment)

---

## 📖 Overview

**Izara Telemedicine** (อิสระ เทเลเมดิซิน) is a full-stack telemedicine platform designed specifically for Thailand's healthcare ecosystem. It provides seamless video consultations, electronic medical records (EMR), e-prescribing, and AI-powered health assistance.

The platform consists of three main services:

| Service | Description | Port | Target Users |
| -------- | ------------- | ---- | -------------- |
| **Patient Portal** | Book appointments, manage health records, video consultations | 3005 | Patients, Caregivers |
| **Doctor Portal** | Clinical workflows, EMR/EHR management, prescriptions, admin tools | 3010 | Doctors, Nurses, Admins |
| **Meeting Server** | Jitsi integration with live transcription & AI summaries | 3020 | Video Consultations |

---

## 🔧 v1.5.0 Updates (Latest - February 5, 2026)

### 🧪 Comprehensive Phase 1 Test Coverage - ZERO SKIPPED TESTS ✅

Complete end-to-end testing verified on both local Docker and Google Cloud Run with **100% pass rate**.

#### 📊 Test Summary

| Environment | Tests | Skipped | Failed | Status |
| ----------- | ----- | ------- | ------ | ------ |
| **LOCAL** | 92 | 0 | 0 | ✅ 100% Passing |
| **CLOUD** | 92 | 0 | 0 | ✅ 100% Passing |
| **TOTAL** | 184 | 0 | 0 | ✅ All Passing |

#### 🧪 Test Categories (20 Categories, 92 Tests)

| # | Category | Tests | Description |
| - | -------- | ----- | ----------- |
| 1 | API Health & Database | 6 | Health endpoints, DB connection |
| 2 | User Management | 8 | Login (5 users), profiles, sessions |
| 3 | Appointment Workflow | 7 | Book, list, pool, history |
| 4 | Video Meeting (Jitsi) | 8 | Transcription, AI summary |
| 5 | Health Records (PHR) | 7 | Vitals, medications, allergies |
| 6 | EMR Workflow | 4 | SOAP format, AI summary |
| 7 | Patient Instructions | 2 | Generate & list |
| 8 | AI Features | 4 | Chat, CDS, Document Analysis |
| 9 | PDPA & Living Will | 3 | Consent management |
| 10 | Clinical Resources | 4 | Medical content |
| 11 | Notifications | 3 | Patient/Doctor alerts |
| 12 | Patient Portal UI | 6 | Dashboard, appointments |
| 13 | Doctor Portal UI | 5 | Dashboard, patients |
| 14 | Admin Portal UI | 3 | Admin features |
| 15 | Theme & Language | 2 | Dark mode, Thai/English |
| 16 | Doctor Data Services | 3 | Doctors list, specialties |
| 17 | Multi-Portal Parallel | 3 | Simultaneous multi-user |
| 18 | Full Workflow E2E | 2 | Appointment→Meeting→EMR |
| 19 | Error Handling | 4 | Invalid credentials |
| 20 | Phase 1 Requirements | 8 | Stakeholder verification |

#### 🔐 Authentication Verified (5 Users - Status 200)

| User | Email | Role | Local | Cloud |
| ---- | ----- | ---- | ----- | ----- |
| Patient 1 | `demo.test@gmail.com` | patient | ✅ 200 | ✅ 200 |
| Patient 2 | `Somchai.Mankong@gmail.com` | patient | ✅ 200 | ✅ 200 |
| Patient 3 | `Anan.Khayanrian@gmail.com` | patient | ✅ 200 | ✅ 200 |
| Doctor | `doctor.test@izara.com` | doctor | ✅ 200 | ✅ 200 |
| Admin | `admin.test@izara.com` | admin | ✅ 200 | ✅ 200 |

#### 🌐 Portal URLs

**Local Environment (Docker)**

| Service | URL |
| ------- | --- |
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Meeting Server | http://localhost:3020 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

**Cloud Environment (Google Cloud Run)**

| Service | URL |
| ------- | --- |
| Patient Portal | https://izara-patient-portal-hvht4obouq-as.a.run.app |
| Doctor Portal | https://izara-doctor-portal-hvht4obouq-as.a.run.app |
| Meeting Server | https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app |
| pgAdmin | https://izara-pgadmin-hvht4obouq-as.a.run.app |
| Cloud SQL | 34.143.228.135:5432 |

> **Note:** Cloud Run URLs use the format `{service}-{project-hash}-{region}.a.run.app`. The hash `hvht4obouq` is auto-generated for project `izara-telemedicine` (project number: 724889190329).

#### 🛠️ Cloud Run Configuration

| Setting | Value |
| ------- | ----- |
| Memory | 2Gi |
| CPU | 2 vCPU |
| Min Instances | 1 (no cold start) |
| Timeout | 300s |
| Region | asia-southeast1 |

---

## 📋 Run Tests Commands

```powershell
# Navigate to test directory
cd tests/e2e

# Run LOCAL tests (92 tests, 0 skipped)
$env:TEST_ENV="local"
npx playwright test specs/phase1-full-coverage.spec.ts --timeout=180000 --workers=4

# Run CLOUD tests (92 tests, 0 skipped)
$env:TEST_ENV="cloud"
npx playwright test specs/phase1-full-coverage.spec.ts --timeout=180000 --workers=4

# Run with visible browser (headed mode)
npx playwright test specs/phase1-full-coverage.spec.ts --headed

# Run specific test category
npx playwright test specs/phase1-full-coverage.spec.ts --grep "Video Meeting"

# Run multi-portal parallel tests
npx playwright test specs/phase1-full-coverage.spec.ts --grep "Multi-Portal" --headed

# View HTML Report
npx playwright show-report
```

---

| Test File | Description | Tests | Status |
| ----------- | ------------- | ------- | -------- |
| `cloud-e2e-workflow.spec.ts` | Complete cloud portal workflow tests (5 users, 27 pages, APIs) | 48 | ✅ |
| `cloud-health-tests.spec.ts` | Cloud health checks and infrastructure | 17 | ✅ |

### Total Cloud: 65 tests passing (100%)

---

## 🔧 v1.4.8 Updates (January 28, 2026)

### 📊 Run Tests

```powershell
# Run ALL local tests (463 tests)
cd tests/e2e
npx playwright test --project="Local E2E Tests"

# Run ALL cloud tests (65 tests)
npx playwright test --project="Cloud E2E Tests"

# Run with visible browser (headed mode)
npx playwright test --project="Local E2E Tests" --headed

# Run specific test file
npx playwright test comprehensive-local-tests.spec.ts --project="Local E2E Tests"

# Run meeting workflow tests (requires meeting server on port 3020)
cd Izara-jitsi-server && npm run dev  # First, start meeting server
cd tests/e2e && npx playwright test meeting-workflow.spec.ts --project="Local E2E Tests"
```

### ✅ Test Coverage Summary

### 1. API Login Tests (5 users verified on both Local & Cloud)

- Patient 1: `demo.test@gmail.com` ✅
- Patient 2: `Somchai.Mankong@gmail.com` ✅
- Patient 3: `Anan.Khayanrian@gmail.com` ✅
- Doctor: `doctor.test@izara.com` (role=doctor) ✅
- Admin: `admin.test@izara.com` (role=admin, isAdmin=true) ✅

### 2. Patient Portal UI Pages (9 pages)

- Login, Dashboard, Appointments, AI Doctor, Health Library, Health Records, Timeline, PDPA, Settings

### 3. Doctor Portal UI Pages (8 pages)

- Login, Dashboard, Schedule, Patients, Health Meeting, Medical Consultants, Medical Content, Clinical Resources

### 4. Admin Portal UI Pages (10 pages)

- Dashboard, Schedule, Patients, Health Meeting, Medical Consultants, Medical Content, Clinical Resources, Doctor Management, Appointment Management, Doctors List

### 5. Video Meeting Workflow (Jitsi Integration)

- Meeting server health check (port 3020) ✅
- Meeting creation with guest invites ✅
- Start/stop transcription streaming ✅
- AI summary generation (Gemini) ✅
- EMR generation with Man-in-the-Loop validation ✅
- Patient meeting results access ✅

### 6. Cloud Portal URLs (Updated February 4, 2026)

- Patient Portal: <https://izara-patient-portal-724889190329.asia-southeast1.run.app>
- Doctor Portal: <https://izara-doctor-portal-724889190329.asia-southeast1.run.app>
- Meeting Server: <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app>

---

## 🔧 v1.4.6 Updates

### 🧪 Previous Test Suite - 178 TESTS PASSING ✅

Validated core platform functionality with comprehensive Playwright E2E test suite.

- ✅ **Cloud Run uses DATABASE_URL secret** - Direct TCP connection to PostgreSQL service

### 🧪 Comprehensive E2E Test Suite (198 Tests Passing)

| Test File | Description | Tests |
| ----------- | ------------- | ------- |
| `api-status.spec.ts` | API health checks and status 200 validation | 19 |
| `full-appointment-workflow.spec.ts` | Complete appointment booking to completion | 16 |
| `meeting-workflow-ui.spec.ts` | Video meeting workflows with Jitsi | 14 |
| `guest-invite-system.spec.ts` | Patient invites relatives, Doctor invites consultants | 10 |
| `transcript-control.spec.ts` | Start/stop transcription controls | 10 |
| `ai-summary-workflow.spec.ts` | AI summary generation from meeting | 8 |
| `emr-man-in-loop.spec.ts` | Doctor confirmation for AI recommendations | 8 |
| `health-history-display.spec.ts` | Patient health records display | 12 |
| `process-docs-unit-tests.spec.ts` | Tests from Process documentation | 31 |
| `cloud-health-tests.spec.ts` | Cloud deployment health checks | 17 |

### Total: 167 local tests + 17 cloud tests = 184+ tests passing

### 📊 Run Tests (2)

```powershell
# Run ALL local tests
npx playwright test --project="Local E2E Tests"

# Run specific test file
npx playwright test api-status.spec.ts --project="Local E2E Tests"

# Run cloud health tests
npx playwright test cloud-health-tests.spec.ts --project="Cloud E2E Tests"

# Run with visible browser
npx playwright test --project="Local E2E Tests" --headed
```

### 🔧 Database Configuration

- **Port**: 5433 (external), 5432 (internal Docker)
- **Database**: izara_phase1
- **No Cloud SQL**: All references removed from codebase
- **Docker service**: `postgres` container with pgvector extension

### 🏗️ Architecture Changes

- Removed `--add-cloudsql-instances` from Cloud Run deployment
- Removed Unix socket connection logic from all services
- Default port changed from 5432 to 5433 for Docker external access
- Cloud deployment uses `DATABASE_URL` secret instead of Cloud SQL socket

---

## 🔧 v1.4.4 Updates

### 🆕 New Features & Improvements

- ✅ **Comprehensive API Test Suite** - Added `tests/izara-api-tests.ps1` with 21 test cases
- ✅ **Doctor Approval Workflow** - Fixed Admin Doctor Management page with proper API endpoints
- ✅ **Pending Doctor Data** - Added test data for approval workflow demonstration

### 🐛 Bug Fixes

- ✅ **Database Connection** - Fixed URL encoding issue with `@` character in password
- ✅ **Admin API Endpoints** - Fixed `/api/admin/users` and `/api/admin/pending-doctors` routing
- ✅ **Doctor Management Page** - Fixed API URL references from AUTH_API_URL to API_URL
- ✅ **Test Script Corrections** - Fixed AI Chat History and Admin API test endpoints

### 📊 Test Coverage

All 21 API tests passing (100%):

- Health checks (2 tests)
- Patient authentication - 3 users (3 tests)
- Doctor/Admin authentication (2 tests)
- Patient Portal APIs - PHR, Vitals, Appointments, Content, Resources (7 tests)
- Doctor Portal APIs - Appointments, Patients, Content, Consultants (5 tests)
- Admin APIs - Doctor Management, Pending Approvals (2 tests)

### 🧪 Test Credentials

```text
# Patients
demo.test@gmail.com          / YOUR_TEST_PASSWORD
Somchai.Mankong@gmail.com    / YOUR_TEST_PASSWORD
Anan.Khayanrian@gmail.com    / YOUR_TEST_PASSWORD

# Doctor
doctor.test@izara.com        / YOUR_TEST_DOCTOR_PASSWORD

# Admin
admin.test@izara.com         / YOUR_TEST_ADMIN_PASSWORD

# Pending Doctor (for approval workflow)
pending.doctor@izara.com     / YOUR_TEST_PASSWORD
```

---

## 🔧 v1.4.3 Updates

### 🆕 New Features & Improvements (2)

- ✅ **Removed Map Page** - Removed unreliable Google Maps integration from Patient Portal
- ✅ **Enabled AI Doctor Page** - Re-enabled AI health assistant with chat history sidebar
- ✅ **Improved Appointment Filters** - Added "รอการยืนยัน", "ยืนยันแล้ว", "ที่ผ่านมา" tabs
- ✅ **Meeting Transcript & Summary** - Gemini AI integration for post-meeting transcription

### 🐛 Bug Fixes (2)

- ✅ **Appointment Creation** - Fixed field name mismatch (appointmentDate → preferredDate)
- ✅ **PHR Medications Display** - Fixed `medications` vs `currentMedications` field binding
- ✅ **PHR Allergies Display** - Now fetches from both `phr.allergies` and `user.allergies`
- ✅ **PHR Update Service** - Fixed COALESCE handling for undefined values
- ✅ **Medical Content Categories** - Fixed category values (underscore → hyphen format)

### 📊 Database Updates

- ✅ Fixed medical content categories: `chronic_disease` → `chronic-disease`, `prevention` → `preventive-care`
- ✅ Added `lifestyle` and `demographics` fields to PHR upsert
- ✅ Migration script: `scripts/database/fix-medical-content-categories.sql`

---

## 🔧 v1.4.2 Updates

### 🆕 New Features

- ✅ **Profile Image Upload** - Upload and change profile picture in Settings
- ✅ **AI Chat History Sidebar** - ChatGPT-style session history with session management
- ✅ **Fresh Deployment Mode** - `.\scripts\deploy.ps1 -Fresh` for clean database setup

### 🐛 Bug Fixes (3)

- ✅ **Medical Content Categories** - Fixed category mismatch between database and frontend
- ✅ **PHR Data Display** - Fixed snake_case to camelCase transformation for vital signs
- ✅ **Medical Consultants Page** - Fixed data mapping causing page freeze
- ✅ **Clinical Resources Author** - Fixed "By Unknown" display with proper author data

### 📊 Database Updates (2)

- ✅ Updated medical content categories to match frontend filters (8 categories)
- ✅ Added MC-007, MC-008, MC-009 for complete category coverage
- ✅ Added Thai content entries with proper categorization
- ✅ Added author_id and author_name to clinical_resources

---

## 🔧 v1.4.1 Bug Fixes & Improvements

### 🚀 Cloud Deployment - FULLY WORKING ✅

### Doctor Portal 502 Bad Gateway Issue - RESOLVED

The Doctor Portal was returning 502 Bad Gateway on Google Cloud Run despite successful deployment. This has been completely fixed.

**Root Causes**:

1. ❌ Deployment script checked wrong endpoint (`/api/health` instead of `/health`)
2. ❌ Cold start timeout too short for multi-service container
3. ❌ No service status verification before tests

**Fixes Applied**:

- ✅ **Corrected Health Endpoints**: Patient Portal `/health`, Doctor Portal `/health`
- ✅ **Enhanced Retry Logic**: 5 retries with 10-second delays, 60-second timeout
- ✅ **Service Status Check**: Pre-test validation with gcloud status commands
- ✅ **Better Error Logging**: Service-specific log commands for debugging

**Live Deployment URLs (Updated February 4, 2026)**:

- **Patient Portal**: <https://izara-patient-portal-724889190329.asia-southeast1.run.app> ✅
- **Doctor Portal**: <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> ✅
- **Meeting Server**: <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> ✅

**Test Results**: ✅ **10/10 UI Tests Passing** - All workflows validated with visible UI

### 🚀 Deployment Automation

- ✅ **Unified Deployment Script** - `scripts/deploy.ps1` for local/cloud
- ✅ **Fresh Mode** - `--Fresh` option to reset all data and start clean
- ✅ **Health Checks** - Automatic verification of all services
- ✅ **Database Initialization** - Auto-seeds PostgreSQL with demo data

### API & Routing Fixes (Critical)

- ✅ **Consultants API** - Removed auth requirement for public GET endpoints
- ✅ **Admin Pending Doctors** - Added missing database columns (approved_at, rejected_at)
- ✅ **Medical Content API** - Fixed thumbnail field mapping (imageUrl → thumbnail)
- ✅ **Clinical Resources** - Added author_id and author_name columns
- ✅ **All Public APIs** - Return status 200 (no more 401 for public endpoints)
- ✅ Fixed Medical Content API routing - proper nginx proxy to mainApiServer
- ✅ Fixed Notification routes - migrated from GCS to PostgreSQL

### Database Schema Updates

- ✅ Added `approved_at`, `approved_by`, `rejected_at`, `rejected_by` to users table
- ✅ Added `author_id`, `author_name` to clinical_resources table
- ✅ Updated seed data with Thai doctor author information

### Meeting Server Enhancements

- ✅ Gemini AI properly configured for meeting summaries
- ✅ Google Speech-to-Text integration for transcription
- ✅ PostgreSQL storage for meeting records and transcripts
- ✅ Health check endpoint returning correct status
- ✅ Man-in-the-Loop confirmation for AI recommendations

### Map & Location Features

- ✅ **Google Maps Integration** - Fixed MapPage component with working old version
- ✅ Proper API key configuration (VITE_GOOGLE_MAPS_API_KEY)
- ✅ Fallback handling for API errors

### PHR Improvements

- ✅ Temperature input uses number type with step=0.1 (35-42°C)
- ✅ Proper validation range
- ✅ Improved vitals data entry UX
- ✅ Save functionality with PostgreSQL persistence

### Profile & Settings

- ✅ Password change modal for both portals
- ✅ Avatar/image upload functionality
- ✅ Profile editing with PostgreSQL persistence
- ✅ Password validation with strength requirements

### AI Features

- ✅ AI Chat history with 60-day retention policy
- ✅ Session management and persistence
- ✅ Gemini AI for health assistant and meeting summaries
- ✅ Clear chat history endpoint (`/api/ai/chat/clear`)

### Code Fixes

- ✅ Fixed `api.delete` function signature to accept optional data parameter
- ✅ Fixed `clearChatHistory` using POST method instead of DELETE with body
- ✅ Added SpeechRecognition type declarations for Web Speech API
- ✅ Added `/api/ai/chat/clear` POST endpoint for chat history management

---

## ✨ Key Features

### For Patients 👤

- 📅 **Appointment Booking** - Multi-step booking with AI symptom analysis
- 📹 **Video Consultations** - Jitsi Meet integration (FREE, no account required)
- 🎙️ **Live Transcription** - Real-time speech-to-text during consultations
- 👥 **Invite Family Members** - External guests can join meetings via invite links
- 📋 **Personal Health Records (PHR)** - Vitals, allergies, medications, lifestyle data
- 🔔 **Real-time Notifications** - Appointment updates, meeting reminders
- 🤖 **AI Health Assistant** - Powered by Google Gemini with chat history
- 🗺️ **Healthcare Map** - Find nearby clinics and hospitals
- 📚 **Medical Content Library** - Health education articles with images
- 🌐 **Multi-language** - Thai (primary) and English

### For Healthcare Providers 👨‍⚕️

- 📝 **Electronic Medical Records (EMR)** - Thai OPD card format with SOAP notes
- 📹 **Video Meeting HOST Controls** - Doctor as moderator with lobby management
- 🎥 **Meeting Recording** - Save consultations to cloud storage
- 🎙️ **AI Transcription & Summary** - Automatic SOAP notes from meeting transcripts
- 👥 **Invite Specialists** - External consultants can join via invite links
- 💊 **E-Prescribing** - Drug interaction checks, medication management
- 🧪 **Lab & Imaging Orders** - Complete diagnostic workflow
- 📊 **Patient Queue Management** - Priority-based scheduling
- 📚 **Clinical Resources** - Medical library and references
- 🔒 **PDPA Compliance** - Thailand's data protection standards

### For Administrators 🔧

- 👥 **User Management** - Doctor, patient, and staff accounts
- 📊 **Analytics Dashboard** - Appointment statistics and insights
- ⚙️ **System Configuration** - Specialties, appointment pools
- 📋 **Medical Consultant Management** - Specialist directory

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                   IZARA TELEMEDICINE v1.4.2                              │
├──────────────────────────────────────────────────────────────────────────┤
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│   │  Patient Portal │  │  Doctor Portal  │  │  Meeting Server        │   │
│   │  (React + Vite) │  │  (React + Vite) │  │  (Express + Socket.IO) │   │
│   │  localhost:3005 │  │  localhost:3010 │  │  localhost:3020        │   │
│   └────────┬────────┘  └────────┬────────┘  └─────────┬──────────────┘   │
│            │                    │                     │                   │
│            └────────────────────┼─────────────────────┘                   │
│                                 ▼                                         │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │         PostgreSQL 16 + pgvector (Primary Database)               │  │
│   │           Port: 5433 (Docker service on local and cloud)         │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │                     EXTERNAL SERVICES                            │    │
│   │  • Jitsi Meet (meet.jit.si) - Video Conferencing (FREE)         │    │
│   │  • Google Gemini AI - Chat, CDS, SOAP Summaries                 │    │
│   │  • Web Speech API - FREE Live Transcription                     │    │
│   │  • Google Maps - Healthcare Facilities Map                       │    │
│   │  • Cloud Run - Container hosting (Production)                    │    │
│   │  • PostgreSQL Docker - Database (NO Cloud SQL)                   │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
| ------------ | --------- |
| React 18 | UI Framework |
| TypeScript | Type-safe JavaScript |
| Vite 7 | Build tool & dev server |
| Tailwind CSS | Styling |
| React Router | Navigation |
| Socket.io Client | Real-time updates |

### Backend

| Technology | Purpose |
| ------------ | --------- |
| Node.js 22 | Runtime |
| Express.js | API Framework |
| PostgreSQL 16 | Primary database with pgvector |
| bcrypt | Password hashing |
| Socket.io | WebSocket server |

### Google Cloud Services

| Service | Purpose |
| --------- | --------- |
| Cloud Storage | JSON-based database |
| Cloud Run | Container hosting (Production) |
| Gemini AI | Health assistant, EMR summarization |
| Maps API | Healthcare facility locator |
| Speech-to-Text | Voice symptom input |

---

## 📦 Installation & Setup

### Quick Start (5 Minutes)

### Option A: Using PowerShell Deployment Script (Recommended)

```powershell
# Fresh install - wipes database and starts clean
.\scripts\deploy.ps1 -Fresh

# Normal local deployment
.\scripts\deploy.ps1 -Target local

# Cloud deployment
.\scripts\deploy.ps1 -Target cloud

# Skip tests
.\scripts\deploy.ps1 -SkipTests

# Skip rebuilding containers
.\scripts\deploy.ps1 -SkipBuild
```

### Option B: Manual Docker Setup

### 1. Copy Environment Template

```bash
# Windows PowerShell
Copy-Item .env.docker.example .env.docker

# Linux/Mac  
cp .env.docker.example .env.docker
```

### 2. Get Your API Keys

| API Key | Get From | Purpose |
| --------- | ---------- | --------- |
| **Google Maps** | [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials) | Patient portal maps |
| **Gemini AI** | [Google AI Studio](https://aistudio.google.com/app/apikey) | AI chat & clinical assistant |
| **Speech-to-Text** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Meeting transcription |
| **OAuth Client** | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | Google Sign-In |

### 3. Add API Keys to `.env.docker`

Open `.env.docker` in your editor and replace these placeholders:

```env
# Google Maps API (REQUIRED for patient portal map features)
VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_KEY_HERE
VITE_GOOGLE_MAPS_MAP_ID=YOUR_ACTUAL_MAP_ID_HERE

# Gemini AI API (REQUIRED for AI features)
GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE
VITE_GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE

# Google Speech-to-Text (REQUIRED for transcription)
GOOGLE_SPEECH_API_KEY=YOUR_ACTUAL_KEY_HERE

# Google OAuth (REQUIRED for Google Sign-In)
VITE_GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID
VITE_GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET
```

### 4. Start Docker Services

```bash
# Build and start all services
docker-compose up --build

# Or start in background
docker-compose up -d --build
```

### 5. Access Applications

| Service | URL | Credentials |
| --------- | ----- | ------------- |
| **Patient Portal** | <http://localhost:3005> | See test credentials below |
| **Doctor Portal** | <http://localhost:3010> | See test credentials below |
| **pgAdmin** | <http://localhost:5050> | `admin@izara.com` / (from .env.docker) |

### Prerequisites

- Node.js >= 22.0.0
- npm >= 9.0.0
- Docker & Docker Compose
- PostgreSQL 16 (if not using Docker)

### Clone the Repository

```bash
git clone https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere
```

---

## ⚙️ Configuration

### Environment Variables

### File Structure

```text
Isara-Anywhere/
├── .env.docker              # Main environment file for Docker Compose (DO NOT commit)
├── .env.docker.example      # Template file (safe to commit)
├── docker-compose.yml       # Docker Compose configuration
├── Isara-patient-portal/
│   └── .env                 # Patient portal specific variables
├── Isara-doctor-portal/
│   └── .env                 # Doctor portal specific variables
└── Izara-jitsi-server/
    └── .env                 # Meeting server specific variables
```

### Environment Loading Order

Docker Compose loads environment variables in this order (later values override earlier ones):

1. `.env.docker` (root - shared variables)
2. Service-specific `.env` files
3. `environment` section in `docker-compose.yml`

### Required API Keys

| Variable | Description | Get From |
| ---------- | ------------- | --------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API Key | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GOOGLE_MAPS_MAP_ID` | Google Maps Map ID | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GEMINI_API_KEY` | Gemini AI API Key | [Google AI Studio](https://aistudio.google.com) |
| `GEMINI_API_KEY` | Gemini AI API Key (backend) | [Google AI Studio](https://aistudio.google.com) |
| `GOOGLE_SPEECH_API_KEY` | Speech-to-Text API | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com) |
| `VITE_GOOGLE_CLIENT_SECRET` | OAuth Client Secret | [Google Cloud Console](https://console.cloud.google.com) |

### Optional Configuration (change for production)

```env
# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_POSTGRES_PASSWORD
POSTGRES_DB=izara_phase1

# Security Keys (generate new ones for production)
JWT_SECRET=YOUR_JWT_SECRET
PGADMIN_DEFAULT_PASSWORD=YOUR_PGADMIN_PASSWORD

# GCP Project Configuration
GCP_PROJECT_ID=your-actual-project-id
VITE_GCP_PROJECT_ID=your-actual-project-id
```

See `.env.docker.example` for complete configuration template.

---

## 🌐 Portal URLs (Updated February 4, 2026)

| Environment | Patient Portal | Doctor Portal | Meeting Server |
| ------------- | ---------------- | --------------- | ---------------- |
| **Local** | <http://localhost:3005> | <http://localhost:3010> | <http://localhost:3020> |
| **Cloud** | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> |

---

## 🧪 Demo Accounts & Test Data

**Note:** Passwords shown here are placeholders. Set real values via environment variables or local seed data and never reuse them in production.

### Patient Portal Accounts (<http://localhost:3005>)

| Email | Password | Thai Name | Notes |
| ------- | ---------- | ----------- | ----- |
| `demo.test@gmail.com` | `YOUR_TEST_PASSWORD` | นาย ทดสอบ ระบบ | Primary test patient |
| `Somchai.Mankong@gmail.com` | `YOUR_TEST_PASSWORD` | นายสมชาย มั่นคง | Age: 45, HN-2024-001234, Hypertension |
| `Anan.Khayanrian@gmail.com` | `YOUR_TEST_PASSWORD` | นายอนันต์ ขยันเรียน | Age: 58, HN-2018-005678, Diabetes + CKD |

### Patient Data Summary

### Patient 1: นายสมชาย มั่นคง (Somchai Mankong)

- **HN**: HN-2024-001234
- **Age**: 45 years old
- **Blood Type**: O+
- **Conditions**: Essential Hypertension (I10)
- **Medications**: Amlodipine 5mg QD
- **Allergies**: None

### Patient 2: นายอนันต์ ขยันเรียน (Anan Khayanrian)

- **HN**: HN-2018-005678
- **Age**: 58 years old
- **Blood Type**: A+
- **Conditions**:
  - Type 2 Diabetes Mellitus (E11.9) - HbA1c 7.2%
  - Chronic Kidney Disease Stage 3b (N18.4) - eGFR 38
  - Essential Hypertension (I10)
- **Medications**:
  - Metformin 500mg BID (dose adjustment needed for CKD)
  - Lisinopril 10mg QD
  - Atorvastatin 20mg QD
- **Allergies**:
  - ⚠️ Penicillin (Severe - Anaphylaxis)
  - ⚠️ Sulfa drugs (Moderate - Rash)

### Doctor Portal Accounts (<http://localhost:3010>)

| Email | Password | Thai Name | Role |
| ------- | ---------- | ----------- | ------ |
| `doctor.test@izara.com` | `YOUR_TEST_DOCTOR_PASSWORD` | นพ. ทดสอบ แพทย์ดี | Doctor |
| `somchai.prasert@izara.com` | `YOUR_TEST_PASSWORD` | นพ. สมชาย ประเสริฐ | Doctor |
| `siriporn.thongchai@izara.com` | `YOUR_TEST_PASSWORD` | พญ. ศิริพร ธงชัย | Doctor |
| `admin.test@izara.com` | `YOUR_TEST_ADMIN_PASSWORD` | นพ. ผู้ดูแลระบบ ใจดี | Admin |

### pgAdmin Access

| Email | Password | URL |
| ------- | ---------- | -------- |
| `admin@izara.com` | `YOUR_TEST_ADMIN_PASSWORD` | <http://localhost:5050> |

### Meeting Server (<http://localhost:3020>)

The Meeting Server provides video consultation features:

- **Live Transcription**: Real-time speech-to-text using Web Speech API
- **AI Summaries**: Automatic SOAP notes generation with Google Gemini
- **Meeting Records**: PostgreSQL storage for consultation history
- **API Endpoints**: `/health`, `/api/meeting/start`, `/api/meeting/summary`

**Note**: Meeting Server is available for local development only. Cloud deployments use Jitsi Meet directly.

---

## 🚀 Running the Application

### Daily Development Workflow

```bash
# Start all services (recommended)
docker-compose up -d

# View logs for debugging
docker-compose logs -f

# Stop services
docker-compose down

# Restart a specific service
docker-compose restart patient-portal

# Rebuild after code changes
docker-compose up --build -d
```

### Database Management

### Automatic Initialization

The database is automatically initialized on first run using `scripts/database/izara-database.sql`.

### Manual Reinitialization

```bash
# Stop all services
docker-compose down -v

# Start PostgreSQL only
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
Start-Sleep -Seconds 10

# Import schema
Get-Content "scripts\database\izara-database.sql" | docker exec -i izara-postgres psql -U postgres -d izara_phase1

# Start all services
docker-compose up -d
```

### Verification

Test that environment variables are loaded correctly:

```bash
# Check if variables are loaded
docker-compose config

# Verify patient portal environment
docker-compose exec patient-portal env | grep GEMINI_API_KEY

# Verify doctor portal environment
docker-compose exec doctor-portal env | grep GEMINI_API_KEY
```

### Development Mode (without Docker)

### Patient Portal

```bash
cd Isara-patient-portal
npm run dev:all        # Frontend + Backend
```

Access at: <http://localhost:3005>

### Doctor Portal

```bash
cd Isara-doctor-portal
npm run dev            # Frontend + Backend (concurrent)
```

Access at: <http://localhost:3010>

### Production Build

```bash
# Patient Portal
cd Isara-patient-portal
npm run build

# Doctor Portal
cd Isara-doctor-portal
npm run build:prod
```

---

## 🚢 Cloud Deployment

### Automated Deployment Script (Recommended)

Use the unified PowerShell deployment script:

```powershell
# Deploy locally with Docker Compose
.\scripts\deploy.ps1 -Target local

# Deploy to Google Cloud Run (REPLACES existing deployment - no duplicates)
.\scripts\deploy.ps1 -Target cloud

# Deploy everything (local + cloud)
.\scripts\deploy.ps1 -Target all

# Fresh deployment (reset all data)
.\scripts\deploy.ps1 -Target local -Fresh

# Skip health checks for faster deployment
.\scripts\deploy.ps1 -Target local -SkipTests

# Show help
.\scripts\deploy.ps1 -Help
```

### Important: Cloud Deployment Behavior

- ✅ **Replaces Existing Services**: Updates in-place with zero downtime
- ✅ **Same URL**: Service URLs remain unchanged
- ✅ **No Duplicates**: Old containers are automatically removed
- ✅ **Gradual Rollout**: Cloud Run manages traffic shifting

### Script Features

- 🔄 Detects existing data and preserves it (unless `-Fresh`)
- 🏥 Health checks for all services
- 🗃️ Automatic database initialization with demo data
- 📊 Deployment status report
- ⚠️ Error handling and rollback

### Manual Cloud Deployment

### Prerequisites (2)

1. Google Cloud SDK installed and configured
2. Project with billing enabled
3. Cloud Run API enabled
4. PostgreSQL deployed as Docker service (NOT Cloud SQL)

### Deploy to Google Cloud Run

```powershell
# Deploy Patient Portal
cd Isara-patient-portal
gcloud builds submit --config=cloudbuild.yaml

# Deploy Doctor Portal
cd Isara-doctor-portal
gcloud builds submit --config=cloudbuild.yaml
```

### PostgreSQL Database (Docker Service)

```powershell
# Connect to PostgreSQL container
docker exec -it izara-postgres psql -U postgres -d izara_phase1

# Import schema (from project root)
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/izara-database.sql
```

### 🌐 Production URLs (LIVE - Updated February 4, 2026)

| Portal | URL | Status |
| -------- | ----- | ------ |
| **Patient Portal** | <https://izara-patient-portal-724889190329.asia-southeast1.run.app> | ✅ Online |
| **Doctor Portal** | <https://izara-doctor-portal-724889190329.asia-southeast1.run.app> | ✅ Online |
| **Meeting Server** | <https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app> | ✅ Online |
| **pgAdmin** | <https://izara-pgadmin-724889190329.asia-southeast1.run.app> | ✅ Online |

> **📝 Note:** Use the same test credentials listed in [Demo Accounts](#-demo-accounts--test-data) section above.

---

## 🛠️ Troubleshooting

### ❌ "variable not set" error

**Fix**: Make sure `.env.docker` exists and contains all variables from `.env.docker.example`

### ❌ Maps not loading

**Fix**:

1. Verify `VITE_GOOGLE_MAPS_API_KEY` is set correctly in `.env.docker`
2. Check Google Cloud Console for API restrictions
3. Add `<http://localhost:3005>` to HTTP referrer restrictions
4. Enable required APIs (Maps JavaScript, Places, Geocoding)

### ❌ AI features not working

**Fix**:

1. Verify `GEMINI_API_KEY` is set correctly in `.env.docker`
2. Check API quota in Google AI Studio
3. Restart services after changing .env.docker

### ❌ Can't connect to database

**Fix**:

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### ❌ Port already in use

**Fix**: Change ports in `docker-compose.yml`:

```yaml
ports:
  - "3006:3005"  # Change 3005 to 3006 on host
```

### ❌ Google Maps "For development purposes only" watermark

**Cause**: Billing not enabled or API restrictions too strict
**Fix**:

1. Enable billing in Google Cloud Console
2. Temporarily remove all API key restrictions
3. Test if it works
4. Add restrictions back gradually

### ❌ "RefererNotAllowedMapError"

**Cause**: HTTP referrer restrictions blocking localhost
**Fix**: Add to API key referrers:

```text
http://localhost:3005/*
http://localhost:3010/*
```

---

## 🔒 Security Best Practices

### ✅ DO

- Keep `.env.docker` with real API keys out of version control
- Use `.env.docker.example` as a template
- Generate strong, unique passwords for production
- Rotate API keys regularly
- Use different credentials for development and production

### ❌ DON'T

- Commit `.env.docker` with real API keys to Git
- Share API keys in public repositories
- Use default passwords in production
- Hardcode credentials in `docker-compose.yml`

**Remember**: `.env.docker` contains your API keys and should NEVER be committed to Git!

---

## 🌐 Services & Ports

| Service | Port | Description |
| --------- | ------ | ------------- |
| Patient Portal | 3005 | Unified patient web application + API |
| Doctor Portal | 3010 | Unified doctor/admin web application + API |
| Meeting Server | 3020 | Jitsi integration with transcription |
| PostgreSQL | 5433 | Primary database |
| pgAdmin | 5050 | Database management UI |

---

## 📁 Project Structure

```text
Isara-anywhere-V0.0.3/
├── Isara-patient-portal/          # Patient-facing application
│   ├── src/                       # React components & pages
│   ├── server/                    # Express.js backend
│   ├── public/                    # Static assets
│   └── doc/                       # Portal documentation
│
├── Isara-doctor-portal/           # Doctor/Admin application
│   ├── src/                       # React components & pages
│   ├── server/                    # Express.js backend servers
│   ├── scripts/                   # Seed data & utilities
│   └── doc/                       # Portal documentation
│
├── Explains/                      # Project documentation
│   ├── Isara-Patient-Portal/      # Patient portal docs
│   ├── Isara-Doctor-Portal/       # Doctor portal docs
│   └── Whole-Project/             # System-wide docs
│
├── Processes/                     # Workflow documentation
│   ├── Appointment_Workflows.md
│   ├── Notification_Workflows.md
│   └── ...
│
├── Presentations/                 # Project presentations
├── scripts/                       # Utility scripts
├── data/                          # Data schemas & structures
└── README.md                      # This file
```

---

## 📚 Documentation

Detailed documentation is available in the `Explains/` directory:

| Document | Description |
| ---------- | ------------- |
| [Architecture](Explains/Whole-Project/architecture.md) | System architecture & data flow |
| [API Reference](Explains/Whole-Project/api-reference.md) | API endpoints documentation |
| [Database Schema](Explains/Whole-Project/database-schema.dbml) | Data models (DBML format) |
| [Security](Explains/Whole-Project/security.md) | Security implementation |
| [Patient Features](Explains/Isara-Patient-Portal/features.md) | Patient portal features |
| [Doctor Features](Explains/Isara-Doctor-Portal/features.md) | Doctor portal features |

---

## 🔒 Security

The platform implements security best practices:

- **Authentication**: bcrypt password hashing (10 rounds)
- **Session Management**: Secure token-based sessions (24hr expiry)
- **Rate Limiting**: 10 login attempts per 15 minutes
- **Security Headers**: Helmet.js (CSP, XSS protection, HSTS)
- **Input Validation**: XSS prevention, SQL injection protection
- **CORS**: Strict origin validation
- **PDPA Compliance**: Thailand's data protection standards

---

## 🧪 Testing

### Seed Demo Data

```bash
# Doctor Portal - Generate demo data
cd Isara-doctor-portal
npm run generate:demo
npm run upload:gcs

# Complete setup
npm run setup:complete
```

### Run Tests

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

---

## 📊 Demo Results & API Tests

### Patient Portal API Tests

| Endpoint | Method | Status | Response Time | Description |
| -------- | ------ | ------ | ------------- | ----------- |
| `/api/health` | GET | ✅ 200 | <50ms | Health check |
| `/api/auth/login` | POST | ✅ 200 | <200ms | User authentication |
| `/api/phr` | GET | ✅ 200 | <100ms | Get PHR data |
| `/api/phr/vitals` | POST | ✅ 200 | <150ms | Save vital signs |
| `/api/appointments` | GET | ✅ 200 | <100ms | List appointments |
| `/api/appointments` | POST | ✅ 200 | <200ms | Create appointment |
| `/api/content` | GET | ✅ 200 | <100ms | Medical content list |
| `/api/ai/chat` | POST | ✅ 200 | <2000ms | AI health assistant |
| `/api/ai/chat/history` | GET | ✅ 200 | <100ms | Chat history |
| `/api/notifications` | GET | ✅ 200 | <100ms | User notifications |

### Doctor Portal API Tests

| Endpoint | Method | Status | Response Time | Description |
| -------- | ------ | ------ | ------------- | ----------- |
| `/api/health` | GET | ✅ 200 | <50ms | Health check |
| `/api/auth/login` | POST | ✅ 200 | <200ms | Doctor authentication |
| `/api/patients` | GET | ✅ 200 | <100ms | Patient list |
| `/api/appointments` | GET | ✅ 200 | <100ms | Doctor appointments |
| `/api/consultants` | GET | ✅ 200 | <100ms | Medical consultants |
| `/api/content` | GET | ✅ 200 | <100ms | Medical content CRUD |
| `/api/emr` | GET | ✅ 200 | <100ms | EMR records |
| `/admin/doctors` | GET | ✅ 200 | <100ms | Doctor management |
| `/admin/pending-doctors` | GET | ✅ 200 | <100ms | Pending approvals |

### Demo Workflow Examples

#### 1. Patient Appointment Booking

### Input

```json
{
  "doctorId": "dr-001",
  "specialty": "อายุรกรรม",
  "date": "2025-01-20",
  "time": "10:00",
  "type": "video",
  "symptoms": "มีไข้ ปวดศีรษะ 2 วัน"
}
```

### Output

```json
{
  "success": true,
  "appointment": {
    "id": "apt-12345",
    "status": "pending",
    "meetingLink": "https://meet.jit.si/izara-apt-12345",
    "confirmationRequired": true
  }
}
```

#### 2. AI Health Assistant Chat

### Input (2)

```json
{
  "message": "ผมมีอาการปวดหัวมา 2 วันแล้ว ควรทำอย่างไร?",
  "sessionId": "session-abc123"
}
```

### Output (2)

```json
{
  "success": true,
  "response": "อาการปวดหัวที่เกิดขึ้น 2 วันอาจมีสาเหตุหลายประการ...",
  "suggestions": [
    "พักผ่อนให้เพียงพอ",
    "ดื่มน้ำให้เพียงพอ",
    "หากอาการไม่ดีขึ้นควรปรึกษาแพทย์"
  ],
  "disclaimer": "ข้อมูลนี้เป็นเพียงคำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัยโรค"
}
```

#### 3. PHR Vitals Save

### Input (3)

```json
{
  "temperature": 37.2,
  "bloodPressure": { "systolic": 120, "diastolic": 80 },
  "heartRate": 72,
  "weight": 65.5,
  "height": 170,
  "recordedAt": "2025-01-15T10:30:00Z"
}
```

### Output (3)

```json
{
  "success": true,
  "message": "Vital signs saved successfully",
  "record": {
    "id": "vital-67890",
    "patientId": "pat-001",
    "bmi": 22.7
  }
}
```

#### 4. Video Meeting Summary (AI Generated)

### Meeting Transcript Input

```text
Patient: สวัสดีครับคุณหมอ ผมมีอาการไข้มา 3 วันแล้ว
Doctor: อุณหภูมิเท่าไหร่ครับ?
Patient: ประมาณ 38.5 องศาครับ
Doctor: มีอาการอื่นไหม เช่น ไอ หรือ เจ็บคอ?
Patient: มีไอแห้งๆ บ้างครับ
```

### AI Summary Output

```json
{
  "success": true,
  "summary": {
    "chiefComplaint": "ไข้มา 3 วัน",
    "presentIllness": "อุณหภูมิ 38.5°C ร่วมกับอาการไอแห้ง",
    "assessment": "สงสัยติดเชื้อทางเดินหายใจส่วนบน",
    "plan": [
      "ให้ยาลดไข้ Paracetamol 500mg",
      "นัดติดตามอาการ 3 วัน"
    ],
    "manInTheLoopRequired": true
  }
}
```

---

## 🚢 Deployment

### Automated Deployment Script (Recommended) (2)

Use the unified PowerShell deployment script for easy local and cloud deployment:

```powershell
# Deploy locally with Docker Compose
.\scripts\deploy.ps1 -Target local

# Deploy to Google Cloud Run
.\scripts\deploy.ps1 -Target cloud

# Deploy everything (local + cloud)
.\scripts\deploy.ps1 -Target all

# Fresh deployment (reset all data)
.\scripts\deploy.ps1 -Target local -Fresh

# Skip health checks for faster deployment
.\scripts\deploy.ps1 -Target local -SkipTests

# Show help
.\scripts\deploy.ps1 -Help
```

### Script Features (2)

- 🔄 Detects existing data and preserves it (unless `-Fresh`)
- 🏥 Health checks for all services
- 🗃️ Automatic database initialization with demo data
- 📊 Deployment status report
- ⚠️ Error handling and rollback

### Local Deployment (Docker Compose)

```bash
# Start all services
docker-compose up -d --build

# Check status
docker ps

# Stop services
docker-compose down
```

### Local URLs

| Service | URL |
| --------- | ----- |
| Patient Portal | <http://localhost:3005> |
| Doctor Portal | <http://localhost:3010> |
| pgAdmin | <http://localhost:5050> |

### Google Cloud Run Deployment

```bash
# Deploy Patient Portal to Cloud Run
cd Isara-patient-portal
gcloud builds submit --config=cloudbuild.yaml

# Deploy Doctor Portal to Cloud Run
cd Isara-doctor-portal
gcloud builds submit --config=cloudbuild.yaml
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

### Izara Telemedicine Development Team

- Healthcare technology innovation for Thailand
- Focused on accessibility and user experience
- PDPA-compliant data handling

---

## 📞 Support

For support and inquiries:

- 📧 Email: <chirapathleo.saeliM@gmail.com> / <chirapath.s@betimes.biz>
- � **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- 🐛 Issues: GitHub Issues

---

### Made with ❤️ for Thailand's Healthcare

© 2024-2026 Izara Telemedicine. All rights reserved.
