# 🏥 IZARA Telemedicine Platform

## Presentation Script & Guide

> **Version:** 1.5.6 | **Date:** March 2026
> **Status:** Phase 1 Complete + Code Quality Hardened — All Tests Passing (v1.5.6)
> **Duration:** 30-45 minutes  
> **Audience:** Stakeholders, Technical Team, Medical Staff

---

## 📑 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview) (5 min)
2. [System Architecture](#2-system-architecture) (5 min)
3. [Features & Capabilities](#3-features--capabilities) (8 min)
4. [Workflow Processes](#4-workflow-processes) (8 min)
5. [Data Structure & Database](#5-data-structure--database) (5 min)
6. [Cloud Services & Integration](#6-cloud-services--integration) (5 min)
7. [Security & Compliance](#7-security--compliance) (3 min)
8. [Demo Walkthrough](#8-demo-walkthrough) (5 min)

---

## 1. PROJECT OVERVIEW

### 🎯 Slide 1: Introduction

**Script:**
> "สวัสดีครับ/ค่ะ วันนี้ผมจะนำเสนอแพลตฟอร์ม IZARA Telemedicine ซึ่งเป็นระบบ Telehealth ครบวงจรที่พัฒนาขึ้นมาเพื่อรองรับการให้บริการทางการแพทย์ทางไกลของประเทศไทย"

**Key Points:**

- ✅ **IZARA Anywhere** - ระบบ Telemedicine ครบวงจร
- ✅ **Thai-First Design** - ออกแบบเพื่อคนไทยเป็นหลัก
- ✅ **Cloud Native** - ทำงานบน Google Cloud Platform
- ✅ **PDPA Compliant** - รองรับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
- ✅ **AI-Powered** - Gemini AI สำหรับการวิเคราะห์และช่วยเหลือ

---

## 🎯 Slide 2: Problem Statement

**Script:**
> "ปัญหาที่เราต้องการแก้ไขคือ ความยากลำบากในการเข้าถึงบริการทางการแพทย์ โดยเฉพาะในพื้นที่ห่างไกล และความต้องการลดความแออัดในโรงพยาบาล"

**Problems Addressed:**

- 🔴 ระยะทางไกลจากสถานพยาบาล
- 🔴 เวลารอพบแพทย์นาน
- 🔴 ข้อจำกัดการเดินทางของผู้ป่วย
- 🔴 การจัดการเอกสารทางการแพทย์ที่ซับซ้อน

---

## 🎯 Slide 3: Solution Overview

**Script:**
> "IZARA Anywhere ประกอบด้วย 2 ส่วนหลัก คือ Patient Portal สำหรับผู้ป่วย และ Doctor Portal สำหรับแพทย์และผู้ดูแลระบบ โดยทั้งสองระบบเชื่อมต่อกันผ่าน Cloud Backend"

**Two-Portal Architecture:**

| Portal | Users | Key Functions |
| -------- | ------- | --------------- |
| **Patient Portal** | ผู้ป่วย, ประชาชน | นัดหมาย, ดูผลการรักษา, PHR, AI Health Assistant |
| **Doctor Portal** | แพทย์, Admin | ตรวจรักษา, EMR, จัดการนัดหมาย, CDS |

**Live URLs:**

- Patient: `https://izara-patient-portal-*.run.app`
- Doctor: `https://izara-doctor-portal-*.run.app`

---

## 2. SYSTEM ARCHITECTURE

### 🏗️ Slide 4: High-Level Architecture

**Script:**
> "ระบบของเราถูกออกแบบเป็น Container-based Architecture บน Docker และ Google Cloud Run โดยใช้ PostgreSQL เป็นฐานข้อมูลหลัก"

**📊 See:** `diagrams/01-system-architecture.mmd`

**Architecture Components:**

1. **Frontend** - React + TypeScript + Vite
2. **Backend** - Node.js Express API
3. **Database** - PostgreSQL 18 + pgvector
4. **Storage** - Google Cloud Storage (5 Buckets)
5. **AI Services** - Google Gemini 2.5 Flash
6. **Video** - Jitsi Meet (Self-Hosted)

---

## 🏗️ Slide 5: Technology Stack

**Script:**
> "เราใช้เทคโนโลยีที่ทันสมัยและได้รับการพิสูจน์แล้วว่าเสถียรและปลอดภัย"

| Layer | Technology |
| ------- | ------------ |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Node.js 22, Express.js |
| **Database** | PostgreSQL 18 + pgvector |
| **Hosting** | Docker, Google Cloud Run |
| **AI** | Google Gemini 2.5 Flash Lite |
| **Video** | Jitsi Meet (Self-Hosted) |
| **Maps** | Google Maps Platform |
| **Testing** | Playwright E2E (1,191 tests) + Vitest Unit (1,419 tests) |

---

## 3. FEATURES & CAPABILITIES

### ⭐ Slide 6: Patient Portal Features

**Script:**
> "Patient Portal ให้บริการครบวงจรสำหรับผู้ป่วย ตั้งแต่การนัดหมาย ดูประวัติการรักษา ไปจนถึง AI Health Assistant"

**📊 See:** `diagrams/02-patient-features.mmd`

**Core Features:**

- 📅 **Smart Appointment Booking** - นัดหมายอัจฉริยะพร้อม AI Triage
- 📋 **Personal Health Records (PHR)** - ประวัติสุขภาพส่วนตัว
- 💊 **Medication Tracking** - ติดตามการใช้ยา
- 🤖 **AI Health Assistant** - ผู้ช่วยสุขภาพ Gemini AI
- 🗺️ **Healthcare Facility Map** - แผนที่สถานพยาบาล
- 📚 **Medical Content Library** - คลังความรู้สุขภาพ
- 📜 **Living Will** - หนังสือแสดงเจตนา

---

## ⭐ Slide 7: Doctor Portal Features

**Script:**
> "Doctor Portal ช่วยให้แพทย์ทำงานได้อย่างมีประสิทธิภาพ ด้วยเครื่องมือ EMR ที่ครบครัน และระบบ AI ช่วยวิเคราะห์"

**📊 See:** `diagrams/03-doctor-features.mmd`

**Core Features:**

- 🩺 **Complete EMR System** - บันทึกเวชระเบียนแบบ SOAP
- 💊 **E-Prescribing** - สั่งยาพร้อม Drug Interaction Check
- 🧪 **Lab & Imaging Orders** - สั่งตรวจแล็บและภาพถ่ายรังสี
- 📹 **Video Consultation** - ตรวจผ่าน Jitsi Video Call
- 📅 **Schedule Management** - จัดการตารางนัดหมาย
- 🤖 **AI Clinical Copilot** - AI ช่วยวินิจฉัยและสรุป

---

## ⭐ Slide 8: Admin Features

**Script:**
> "ระบบ Admin ช่วยให้การจัดการระบบเป็นไปอย่างราบรื่น รวมถึงการอนุมัติแพทย์ใหม่และการจัดการเนื้อหา"

**Admin Capabilities:**

- 👨‍⚕️ **Doctor Approval** - อนุมัติแพทย์ใหม่ (pending → approved)
- 📊 **Content Management** - จัดการเนื้อหาสุขภาพ
- 📅 **Appointment Pool** - จัดการ Pool นัดหมาย
- 📈 **Analytics Dashboard** - รายงานสถิติ
- 🔐 **Access Control** - จัดการสิทธิ์การเข้าถึง

---

## 4. WORKFLOW PROCESSES

### 🔄 Slide 9: Patient Appointment Flow

**Script:**
> "ขั้นตอนการนัดหมายของผู้ป่วยเริ่มจากการเลือกอาการ ระบบ AI จะวิเคราะห์ความเร่งด่วนและแนะนำแพทย์ที่เหมาะสม"

**📊 See:** `diagrams/04-appointment-workflow.mmd`

**Steps:**

1. ผู้ป่วย Login เข้าระบบ
2. เลือก "นัดหมายแพทย์"
3. ระบุอาการ (Symptom Input)
4. **AI วิเคราะห์ความเร่งด่วน (Triage)**
5. เลือกแพทย์และเวลา
6. ยืนยันการนัดหมาย
7. ระบบแจ้งเตือนแพทย์
8. รอการยืนยันจากแพทย์
9. **รับ Jitsi Meet Link**

---

## 🔄 Slide 10: Doctor Consultation Flow

**Script:**
> "เมื่อถึงเวลานัดหมาย แพทย์สามารถเริ่มการตรวจผ่าน Video Call และบันทึก EMR โดยมี AI ช่วยถอดเสียงและสรุป"

**📊 See:** `diagrams/05-consultation-workflow.mmd`

**Steps:**

1. แพทย์ดูรายการนัดหมาย
2. เริ่ม Video Consultation (Jitsi)
3. **AI Transcription** - ถอดเสียงการสนทนา
4. บันทึก EMR (SOAP Notes)
5. สั่งยา (E-Prescribing)
6. สั่งตรวจ Lab/Imaging
7. **AI สรุปการตรวจ**
8. แพทย์ตรวจสอบและลงนาม
9. ข้อมูลอัพเดทไปยัง Patient Portal

---

## 🔄 Slide 11: EMR Documentation Flow

**Script:**
> "ระบบ EMR รองรับการบันทึกแบบ SOAP Notes พร้อม AI ช่วยสรุปและเสนอ ICD-10 Codes"

**📊 See:** `diagrams/06-emr-workflow.mmd`

**SOAP Note Structure:**

| Section | Content | AI Assistance |
| --------- | --------- | --------------- |
| **S** - Subjective | อาการที่ผู้ป่วยบอก | สกัดจาก Transcript |
| **O** - Objective | ผลตรวจร่างกาย/Lab | วิเคราะห์ผล Lab |
| **A** - Assessment | การวินิจฉัย (ICD-10) | แนะนำ Diagnosis |
| **P** - Plan | แผนการรักษา | Drug Interaction Check |

---

## 🔄 Slide 12: Prescribing Workflow

**Script:**
> "ระบบสั่งยามี Clinical Decision Support (CDS) ตรวจสอบ Drug Interaction และ Drug-Allergy อัตโนมัติ"

**📊 See:** `diagrams/07-prescribing-workflow.mmd`

**CDS Features:**

- ✅ Drug-Drug Interaction Check
- ✅ Drug-Allergy Conflict Detection
- ✅ Dosage Appropriateness
- ✅ Renal/Hepatic Adjustment Suggestions
- ✅ **Man-in-the-Loop**: แพทย์ต้องยืนยันทุกคำเตือน

---

## 5. DATA STRUCTURE & DATABASE

### 💾 Slide 13: Database Schema

**Script:**
> "ฐานข้อมูลใช้ PostgreSQL 18 พร้อม pgvector สำหรับ AI Embedding มีการออกแบบให้รองรับ PDPA และ HIPAA"

**Schema Reference:** `database/izara-complete-schema-v4.dbml`

**Table Groups:**

| Group | Tables |
| ------- | -------- |
| **Auth** | users, sessions, password_resets |
| **Patient** | patient_profiles, phr, vital_signs, living_wills |
| **Doctor** | doctor_profiles, doctors, doctor_schedules, consultants |
| **Appointments** | appointments, meeting_records, meeting_transcripts |
| **Clinical** | emr, prescriptions, lab_orders |
| **Content** | medical_content, clinical_resources, icd10_codes, drugs |
| **AI** | knowledge_base, ai_chat_history, cds_logs, ai_validations |
| **Audit** | audit_logs |

---

## 💾 Slide 14: Key Data Relationships

**Script:**
> "ระบบออกแบบให้ users table เป็น unified table รองรับทุก role ลด join complexity"

```text
users (unified)
  ├── patient_profiles (1:1)
  ├── doctor_profiles (1:1)
  ├── phr (1:1)
  ├── appointments (1:N as patient or doctor)
  │     └── meeting_records (1:1)
  │           └── meeting_transcripts (1:N)
  │     └── emr (1:1)
  │           ├── prescriptions (1:N)
  │           └── lab_orders (1:N)
  └── ai_chat_history (1:N)
```

---

## 6. CLOUD SERVICES & INTEGRATION

### ☁️ Slide 15: Google Cloud Services

**Script:**
> "ระบบใช้บริการของ Google Cloud Platform หลายรายการ"

**📊 See:** `diagrams/10-gcp-services.mmd`

| Service | Usage |
| --------- | ------- |
| **Cloud Run** | Container hosting (Patient, Doctor, Meeting) |
| **Cloud SQL** | PostgreSQL 18 (Production) |
| **Cloud Storage** | 5 Buckets for files |
| **Secret Manager** | API Keys & credentials |
| **Cloud Build** | CI/CD Pipeline |

---

## ☁️ Slide 16: External Integrations

**Script:**
> "ระบบเชื่อมต่อกับบริการภายนอกหลายรายการ"

| Service | Purpose |
| --------- | --------- |
| **Gemini AI** | Health Assistant, Transcript Summary, CDS |
| **Jitsi Meet** | Video Consultation |
| **Google Maps** | Healthcare Facility Locator |
| **Speech-to-Text** | Real-time Transcription |

---

## 7. SECURITY & COMPLIANCE

### 🔐 Slide 17: Security Features

**Script:**
> "ระบบมีการรักษาความปลอดภัยหลายชั้น เพื่อปกป้องข้อมูลผู้ป่วย"

**Security Measures:**

- 🔒 **Password Hashing**: bcrypt (10 rounds)
- 🔒 **Password Policy**: Unified 12-character minimum across all portals (uppercase + lowercase + digit + special)
- 🔒 **JWT**: Consistent `JWT_SECRET_FINAL` for sign/verify (mismatch fixed)
- 🔒 **Session Management**: Server-side with JWT (24hr expiry)
- 🔒 **HTTPS**: TLS encryption
- 🔒 **RBAC**: Role-based access control (patient, doctor, admin)
- 🔒 **CORS**: Strict origin validation — no localhost in production
- 🔒 **OWASP Headers**: Helmet.js (CSP, XSS, HSTS, X-Frame)
- 🔒 **TypeScript Strict Safety**: Zero `error: any` in server code — all catch blocks use `error: unknown`
- 🔒 **SonarQube Clean**: No S6551, S4325, or non-null assertion warnings
- 🔒 **Credentials**: Service account keys stored in `credentials/` (not public/)
- 🔒 **Audit Logging**: Complete trail in audit_logs
- 🔒 **Testing**: 2,610 tests (1,419 unit + 1,191 E2E) — 100% pass rate

---

## 🔐 Slide 18: PDPA Compliance

**Script:**
> "ระบบรองรับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)"

**Compliance Features:**

- ✅ **Consent Management**: patient_consents table
- ✅ **Data Access Control**: Role-based permissions
- ✅ **Audit Trail**: Complete logging
- ✅ **Data Portability**: PHR export capability
- ✅ **Right to Erasure**: Data deletion workflow

---

## 8. DEMO WALKTHROUGH

### 🎬 Slide 19: Live Demo

**Demo Accounts:**

| Role | Email | Password |
| ------ | ------- | ---------- |
| Patient | <demo.test@gmail.com> | P@ssw0rd |
| Doctor | <doctor.test@izara.com> | IzaraDoctor@2024 |
| Admin | <admin.test@izara.com> | IzaraAdmin@2024 |

**Demo Flow:**

1. Patient Login → View PHR → Book Appointment
2. Doctor Login → View Queue → Start Consultation
3. Video Call → AI Transcription → Create EMR
4. E-Prescribe → CDS Alert → Sign & Complete
5. Patient sees summary in portal

---

## 🎬 Slide 20: Q&A

**Script:**
> "ขอบคุณครับ/ค่ะ ที่รับฟัง มีคำถามหรือข้อสงสัยอะไรบ้างครับ/ค่ะ?"

**Contact:**

- 📧 Email: <support@izara-health.com>
- 🌐 Website: <https://izara-anywhere.com>

---

### Last Updated: March 13, 2026
