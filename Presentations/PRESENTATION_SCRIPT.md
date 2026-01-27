# 🏥 IZARA Telemedicine Platform
## Presentation Script & Guide

> **Version:** 1.0 | **Date:** January 2025  
> **Duration:** 30-45 minutes  
> **Audience:** Stakeholders, Technical Team, Medical Staff

---

# 📑 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview) (5 min)
2. [System Architecture](#2-system-architecture) (5 min)
3. [Features & Capabilities](#3-features--capabilities) (8 min)
4. [Workflow Processes](#4-workflow-processes) (8 min)
5. [Data Structure & Database](#5-data-structure--database) (5 min)
6. [Cloud Services & Integration](#6-cloud-services--integration) (5 min)
7. [Security & Compliance](#7-security--compliance) (3 min)
8. [Demo Walkthrough](#8-demo-walkthrough) (5 min)

---

# 1. PROJECT OVERVIEW

## 🎯 Slide 1: Introduction

**Script:**
> "สวัสดีครับ/ค่ะ วันนี้ผมจะนำเสนอแพลตฟอร์ม IZARA Telemedicine ซึ่งเป็นระบบ Telehealth ครบวงจรที่พัฒนาขึ้นมาเพื่อรองรับการให้บริการทางการแพทย์ทางไกลของประเทศไทย"

**Key Points:**
- ✅ **IZARA Anywhere** - ระบบ Telemedicine ครบวงจร
- ✅ **Thai-First Design** - ออกแบบเพื่อคนไทยเป็นหลัก
- ✅ **Cloud Native** - ทำงานบน Google Cloud Platform
- ✅ **PDPA Compliant** - รองรับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล

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
|--------|-------|---------------|
| **Patient Portal** | ผู้ป่วย, ประชาชน | นัดหมาย, ดูผลการรักษา, PHR |
| **Doctor Portal** | แพทย์, Admin | ตรวจรักษา, EMR, จัดการนัดหมาย |

**Live URLs:**
- Patient: https://izara-patient-portal-724889190329.asia-southeast1.run.app
- Doctor: https://izara-doctor-portal-724889190329.asia-southeast1.run.app

---

# 2. SYSTEM ARCHITECTURE

## 🏗️ Slide 4: High-Level Architecture

**Script:**
> "ระบบของเราถูกออกแบบเป็น Microservices Architecture บน Google Cloud Platform โดยใช้ Cloud Run สำหรับ hosting และ Google Cloud Storage สำหรับเก็บข้อมูล"

**📊 See:** `diagrams/01-system-architecture.mmd`

**Architecture Components:**
1. **Frontend** - React + TypeScript + Vite
2. **Backend** - Node.js Express API
3. **Storage** - Google Cloud Storage (6 Buckets)
4. **AI Services** - Google Gemini AI
5. **Integration** - Google Calendar, Meet, Maps

---

## 🏗️ Slide 5: Technology Stack

**Script:**
> "เราใช้เทคโนโลยีที่ทันสมัยและได้รับการพิสูจน์แล้วว่าเสถียรและปลอดภัย"

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Node.js 22, Express.js |
| **Database** | PostgreSQL 16 |
| **Hosting** | Google Cloud Run |
| **AI** | Google Gemini 2.5 Flash |
| **Video** | Jitsi Meet (Self-Hosted) |
| **Maps** | Google Maps Platform |

---

# 3. FEATURES & CAPABILITIES

## ⭐ Slide 6: Patient Portal Features

**Script:**
> "Patient Portal ให้บริการครบวงจรสำหรับผู้ป่วย ตั้งแต่การนัดหมาย ดูประวัติการรักษา ไปจนถึง AI Health Assistant"

**📊 See:** `diagrams/02-patient-features.mmd`

**Core Features:**
- 📅 **Smart Appointment Booking** - นัดหมายอัจฉริยะ
- 📋 **Personal Health Records (PHR)** - ประวัติสุขภาพส่วนตัว
- 💊 **Medication Tracking** - ติดตามการใช้ยา
- 🤖 **AI Health Assistant** - ผู้ช่วยสุขภาพ AI
- 🗺️ **Healthcare Facility Map** - แผนที่สถานพยาบาล
- 📚 **Medical Content Library** - คลังความรู้สุขภาพ

---

## ⭐ Slide 7: Doctor Portal Features

**Script:**
> "Doctor Portal ช่วยให้แพทย์ทำงานได้อย่างมีประสิทธิภาพ ด้วยเครื่องมือ EMR ที่ครบครัน และระบบ AI ช่วยวิเคราะห์"

**📊 See:** `diagrams/03-doctor-features.mmd`

**Core Features:**
- 🩺 **Complete EMR System** - ระบบบันทึกเวชระเบียนอิเล็กทรอนิกส์
- 💊 **E-Prescribing** - สั่งยาอิเล็กทรอนิกส์
- 🧪 **Lab & Imaging Orders** - สั่งตรวจแล็บและภาพถ่ายรังสี
- 📹 **Video Consultation** - ตรวจผ่าน Video Call
- 📅 **Schedule Management** - จัดการตารางนัดหมาย
- 🤖 **AI Clinical Copilot** - AI ช่วยวินิจฉัย

---

## ⭐ Slide 8: Admin Features

**Script:**
> "ระบบ Admin ช่วยให้การจัดการระบบเป็นไปอย่างราบรื่น รวมถึงการอนุมัติแพทย์ใหม่และการจัดการเนื้อหา"

**Admin Capabilities:**
- 👨‍⚕️ **Doctor Approval** - อนุมัติแพทย์ใหม่
- 📊 **Content Management** - จัดการเนื้อหาสุขภาพ
- 📅 **Appointment Pool** - จัดการ Pool นัดหมาย
- 📈 **Analytics Dashboard** - รายงานสถิติ
- 🔐 **Access Control** - จัดการสิทธิ์การเข้าถึง

---

# 4. WORKFLOW PROCESSES

## 🔄 Slide 9: Patient Appointment Flow

**Script:**
> "ขั้นตอนการนัดหมายของผู้ป่วยเริ่มจากการเลือกอาการ ระบบจะแนะนำแพทย์ที่เหมาะสม"

**📊 See:** `diagrams/04-appointment-workflow.mmd`

**Steps:**
1. ผู้ป่วย Login เข้าระบบ
2. เลือก "นัดหมายแพทย์"
3. ระบุอาการ (Symptom Input)
4. AI วิเคราะห์และแนะนำแผนก
5. เลือกแพทย์และเวลา
6. ยืนยันการนัดหมาย
7. รอการยืนยันจากแพทย์
8. รับ Google Meet Link

---

## 🔄 Slide 10: Doctor Consultation Flow

**Script:**
> "เมื่อถึงเวลานัดหมาย แพทย์สามารถเริ่มการตรวจผ่าน Video Call และบันทึก EMR"

**📊 See:** `diagrams/05-consultation-workflow.mmd`

**Steps:**
1. แพทย์ดูรายการนัดหมาย
2. เริ่ม Video Consultation
3. บันทึก EMR (SOAP Notes)
4. สั่งยา (E-Prescribing)
5. สั่งตรวจ Lab/Imaging
6. บันทึกผลและคำแนะนำ
7. ปิดการตรวจ
8. ข้อมูลอัพเดทไปยัง Patient Portal

---

## 🔄 Slide 11: EMR Documentation Flow

**Script:**
> "ระบบ EMR รองรับการบันทึกแบบ SOAP Notes พร้อม AI ช่วยสรุปและเสนอ ICD-10 Codes"

**📊 See:** `diagrams/06-emr-workflow.mmd`

**SOAP Note Structure:**
- **S** - Subjective: อาการที่ผู้ป่วยบอก
- **O** - Objective: ผลตรวจร่างกาย/Lab
- **A** - Assessment: การวินิจฉัย
- **P** - Plan: แผนการรักษา

---

## 🔄 Slide 12: Prescribing Workflow

**Script:**
> "ระบบสั่งยามี Drug Interaction Check และ Drug-Allergy Check อัตโนมัติ"

**📊 See:** `diagrams/07-prescribing-workflow.mmd`

**Safety Features:**
- ✅ Drug-Drug Interaction Check
- ✅ Drug-Allergy Alert
- ✅ Dosage Validation
- ✅ Thai Drug Database
- ✅ Prescription History

---

## 🔄 Slide 13: Content Management Flow

**Script:**
> "การจัดการเนื้อหาสุขภาพมีระบบ Approval Workflow เพื่อตรวจสอบความถูกต้อง"

**📊 See:** `diagrams/08-content-workflow.mmd`

**Status Flow:**
```
Draft → Pending → Published
         ↓
       Rejected → Revise → Pending
```

---

# 5. DATA STRUCTURE & DATABASE

## 💾 Slide 14: Data Storage Overview

**Script:**
> "เราใช้ PostgreSQL เป็น Database หลักในการเก็บข้อมูลทั้งหมด เพื่อความมั่นคงและความรวดเร็วในการเรียกใช้ข้อมูล ขณะที่ไฟล์เอกสารและรูปภาพจะถูกเก็บใน Google Cloud Storage"

**📊 See:** `diagrams/01-system-architecture.mmd`  
**📊 See:** `database/izara-complete-schema-v3.dbml`

**Core Database Tables:**
| Category | Tables |
|----------|--------|
| **Users** | `users`, `sessions`, `roles` |
| **Clinical** | `emr`, `prescriptions`, `lab_orders` |
| **Records** | `patient_profiles`, `phr` |
| **Operations** | `appointments`, `meeting_records` |

---

## 💾 Slide 15: Key Data Models

**Script:**
> "ข้อมูลหลักที่ระบบจัดเก็บ ได้แก่ ข้อมูลผู้ใช้ การนัดหมาย EMR และเนื้อหาสุขภาพ"

**Core Entities:**
- 👤 **User** - ข้อมูลผู้ใช้ (Patient/Doctor/Admin)
- 📅 **Appointment** - การนัดหมาย
- 📋 **EMR Record** - บันทึกเวชระเบียน
- 💊 **Prescription** - ใบสั่งยา
- 📚 **Medical Content** - เนื้อหาสุขภาพ

---

# 6. CLOUD SERVICES & INTEGRATION

## ☁️ Slide 16: Google Cloud Platform

**Script:**
> "ระบบทำงานบน Google Cloud Platform โดยใช้บริการหลักๆ คือ Cloud Run และ Cloud Storage"

**📊 See:** `diagrams/10-gcp-services.mmd`

**GCP Services Used:**
- 🏃 **Cloud Run** - Serverless Container Hosting
- 📦 **Cloud Storage** - Object Storage
- 🔐 **IAM** - Identity & Access Management
- 📈 **Cloud Monitoring** - Performance Monitoring

---

## ☁️ Slide 17: Google Services Integration

**Script:**
> "เราเชื่อมต่อกับ Google Services ต่างๆ เพื่อเพิ่มความสามารถของระบบ"

**📊 See:** `diagrams/11-google-services.mmd`

**Integrated Services:**
| Service | Purpose |
|---------|---------|
| **Google Meet** | Video Consultation |
| **Google Calendar** | Schedule Management |
| **Google Maps** | Healthcare Facility Map |
| **Gemini AI** | AI Health Assistant |
| **Gmail API** | Email Notifications |

---

# 7. SECURITY & COMPLIANCE

## 🔐 Slide 18: Security Measures

**Script:**
> "ความปลอดภัยเป็นสิ่งสำคัญที่สุด เราใช้มาตรฐาน OWASP และรองรับ PDPA"

**Security Features:**
- 🔒 **JWT Authentication** - Token-based auth
- 🛡️ **OWASP Middleware** - Security headers (CSP, HSTS)
- 🔐 **bcrypt Password Hashing** - Secure password storage
- 📝 **Audit Logging** - All actions logged
- 🔑 **Role-Based Access Control** - Patient/Doctor/Admin

---

## 🔐 Slide 19: PDPA Compliance

**Script:**
> "ระบบรองรับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) อย่างเต็มรูปแบบ"

**PDPA Features:**
- ✅ **Consent Management** - ขอความยินยอมก่อนใช้ข้อมูล
- ✅ **Data Portability** - ส่งออกข้อมูลได้
- ✅ **Right to Delete** - ลบข้อมูลได้
- ✅ **Access Control** - ควบคุมการเข้าถึง
- ✅ **Audit Trail** - บันทึกการเข้าถึงข้อมูล

---

# 8. DEMO WALKTHROUGH

## 🖥️ Slide 20: Demo - Patient Journey

**Script:**
> "มาดู Demo การใช้งานจริง เริ่มจากฝั่งผู้ป่วย"

**Demo Steps:**
1. Login ด้วย patient.test@izara.com
2. ดู Dashboard
3. นัดหมายแพทย์ใหม่
4. ดูประวัติการรักษา
5. ใช้ AI Health Chat

---

## 🖥️ Slide 21: Demo - Doctor Journey

**Script:**
> "ต่อมาเป็นฝั่งแพทย์"

**Demo Steps:**
1. Login ด้วย doctor.test@izara.com
2. ดูรายการนัดหมาย
3. เริ่ม Consultation
4. บันทึก EMR
5. สั่งยาและตรวจ Lab

---

## 🖥️ Slide 22: Demo - Admin Functions

**Script:**
> "สุดท้ายเป็นฝั่ง Admin"

**Demo Steps:**
1. Login ด้วย admin.test@izara.com
2. อนุมัติแพทย์ใหม่
3. จัดการเนื้อหาสุขภาพ
4. ดู Analytics

---

# 📞 CLOSING

## Slide 23: Summary & Next Steps

**Script:**
> "สรุป IZARA Anywhere เป็นแพลตฟอร์ม Telemedicine ที่ครบวงจร ใช้งานง่าย และปลอดภัย พร้อมให้บริการแล้ววันนี้"

**Key Takeaways:**
- ✅ ครบวงจร Patient + Doctor Portal
- ✅ AI-Powered Clinical Support
- ✅ Thai-First Design
- ✅ PDPA Compliant
- ✅ Cloud Native & Scalable

---

## Slide 24: Q&A

**Script:**
> "ขอบคุณครับ/ค่ะ มีคำถามอะไรไหมครับ/คะ?"

**Contact:**
- 📧 Email: support@izara.health
- 🌐 Website: https://izara.health
- 📱 Demo: See live URLs

---

# 📎 APPENDIX

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Patient | demo.test@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |

## Development URLs

| Service | URL |
|---------|-----|
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Jitsi Server | http://localhost:3020 |

## Production URLs

| Service | URL |
|---------|-----|
| Patient Portal | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| Doctor Portal | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

## ✅ E2E Test Results (December 15, 2025)

| Test Suite | Pass Rate | Duration |
|------------|-----------|----------|
| Appointment Workflow | 100% | 527.73s |
| Medical Content | 100% | 430.91s |
| Health Records | 100% | 509.62s |
| Dual Portal Video Meeting | 100% | 304.70s |

**All test suites passing at 100%**

---

*End of Presentation Script - Last Updated: December 15, 2025*
