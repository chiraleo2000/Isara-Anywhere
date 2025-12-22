# 1. Project Overview

## 🏥 Isara Patient Portal - Complete Guide

**Version:** 1.0.0  
**Release Date:** December 10, 2025  
**Status:** Production Ready

### 1.1 Introduction

Isara Patient Portal เป็นระบบพอร์ทัลสำหรับผู้ป่วยที่ครบวงจร ออกแบบมาเพื่อให้ผู้ป่วยสามารถเข้าถึงบริการสุขภาพได้อย่างสะดวกและปลอดภัย ระบบนี้รองรับการนัดหมายแพทย์ การจัดการข้อมูลสุขภาพส่วนบุคคล การปรึกษาแพทย์ผ่านวิดีโอ และการให้คำแนะนำสุขภาพด้วย AI

### 1.2 System Goals

| Goal | Description |
|------|-------------|
| **Accessibility** | ผู้ป่วยสามารถเข้าถึงบริการสุขภาพได้ทุกที่ทุกเวลา |
| **Security** | ข้อมูลสุขภาพถูกเก็บรักษาอย่างปลอดภัยตามมาตรฐาน PDPA |
| **Integration** | เชื่อมต่อกับ Google Services สำหรับการนัดหมายและวิดีโอคอล |
| **Intelligence** | ใช้ AI ช่วยวิเคราะห์อาการและให้คำแนะนำเบื้องต้น |

---

## 1.3 User Access & Features

### 1.3.1 Patient Portal Access Matrix

| Feature | Description | Access Level | Authentication |
|---------|-------------|--------------|----------------|
| **Dashboard** | หน้าแรกแสดงภาพรวมสุขภาพ | Patient | Required |
| **Appointments** | จองและจัดการนัดหมาย | Patient | Required |
| **PHR** | ข้อมูลสุขภาพส่วนบุคคล | Patient | Required |
| **AI Doctor** | ปรึกษาสุขภาพกับ AI | Patient | Required |
| **Map** | ค้นหาสถานพยาบาลใกล้เคียง | Patient | Required |
| **PDPA Consent** | จัดการความยินยอม PDPA | Patient | Required |
| **Living Will** | หนังสือแสดงเจตนา | Patient | Required |
| **Profile** | จัดการข้อมูลส่วนตัว | Patient | Required |
| **Settings** | ตั้งค่าระบบ | Patient | Required |
| **GCS Status** | ตรวจสอบสถานะ Storage | Admin | Optional |

### 1.3.2 Feature Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    ISARA PATIENT PORTAL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Healthcare  │  │   Health     │  │   Privacy    │          │
│  │   Services   │  │   Records    │  │   & Legal    │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ • Appointments│  │ • PHR        │  │ • PDPA       │          │
│  │ • Telehealth │  │ • Vitals     │  │ • Living Will│          │
│  │ • AI Doctor  │  │ • Lab Results│  │ • Consent    │          │
│  │ • Map Search │  │ • Medications│  │ • Audit Log  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   User       │  │   Health     │                            │
│  │   Account    │  │   Insights   │                            │
│  ├──────────────┤  ├──────────────┤                            │
│  │ • Profile    │  │ • Dashboard  │                            │
│  │ • Settings   │  │ • Timeline   │                            │
│  │ • Auth       │  │ • Treatment  │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1.4 Page Descriptions

### 1.4.1 Dashboard (หน้าแรก)
- **Path:** `/`
- **Component:** `DashboardPage.tsx`
- **Features:**
  - Health Studio - แสดงภาพรวมสุขภาพ
  - Treatment Results - ผลการรักษาล่าสุด (5 รายการ/6 เดือน/1 ปี/ทั้งหมด)
  - Vitals Chart - กราฟแสดงค่าสุขภาพ
  - Medical Content - เนื้อหาสุขภาพแนะนำ
  - AI Health Chat - ช่องแชทสุขภาพ AI

### 1.4.2 Appointments (การนัดหมาย)
- **Path:** `/appointments`
- **Component:** `AppointmentPages.tsx`
- **Features:**
  - รายการนัดหมายทั้งหมด
  - จองนัดหมายใหม่
  - ดูรายละเอียดนัดหมาย
  - เข้าร่วม Telehealth ผ่าน Google Meet

### 1.4.3 PHR (Personal Health Records)
- **Path:** `/phr`
- **Component:** `PHRPage.tsx`
- **Features:**
  - ข้อมูลส่วนบุคคล (ชื่อ, วันเกิด, เพศ)
  - ข้อมูลร่างกาย (ส่วนสูง, น้ำหนัก, หมู่เลือด)
  - ข้อมูลทางการแพทย์ (โรคประจำตัว, ยาที่ใช้, อาการแพ้)
  - Vital Signs History

### 1.4.4 AI Doctor (ปรึกษาสุขภาพ AI)
- **Path:** `/ai-doctor`
- **Component:** `AIDoctorPage.tsx`
- **Features:**
  - แชทปรึกษาปัญหาสุขภาพ
  - วิเคราะห์อาการเบื้องต้น
  - แนะนำการดูแลตัวเอง
  - แนะนำการพบแพทย์เมื่อจำเป็น

### 1.4.5 Map (แผนที่)
- **Path:** `/map`
- **Component:** `MapPage.tsx`
- **Features:**
  - ค้นหาโรงพยาบาลใกล้เคียง
  - ค้นหาคลินิก
  - ค้นหาร้านขายยา
  - แสดงระยะทางและเวลาเดินทาง
  - High-accuracy location tracking

### 1.4.6 PDPA Consent (ความยินยอม PDPA)
- **Path:** `/pdpa`
- **Component:** `PDPAPage.tsx`
- **Features:**
  - จัดการความยินยอมการเข้าถึงข้อมูล
  - ดูประวัติการเข้าถึงข้อมูล
  - เพิกถอนความยินยอม
  - Audit Log

### 1.4.7 Living Will (หนังสือแสดงเจตนา)
- **Path:** `/living-will`
- **Component:** `LivingWillPage.tsx`
- **Features:**
  - กรอกข้อมูลผู้รับมอบอำนาจ
  - ระบุความต้องการทางการแพทย์
  - Version History & Rollback
  - Digital Signature

### 1.4.8 Profile (โปรไฟล์)
- **Path:** `/profile`
- **Component:** `ProfilePage.tsx`
- **Features:**
  - แก้ไขข้อมูลส่วนตัว
  - อัพโหลดรูปโปรไฟล์
  - ข้อมูลติดต่อฉุกเฉิน

### 1.4.9 Settings (ตั้งค่า)
- **Path:** `/settings`
- **Component:** `SettingsPage.tsx`
- **Features:**
  - การแจ้งเตือน
  - ภาษา
  - ธีม

---

## 1.5 User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                      PATIENT USER JOURNEY                       │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ Register│────▶│  Login  │────▶│Dashboard│────▶│ Explore │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
         ▼                                ▼                                ▼
    ┌─────────┐                    ┌─────────┐                      ┌─────────┐
    │Book Appt│                    │View PHR │                      │AI Doctor│
    └─────────┘                    └─────────┘                      └─────────┘
         │                                │                                │
         ▼                                ▼                                ▼
    ┌─────────┐                    ┌─────────┐                      ┌─────────┐
    │Telehealth│                   │Update   │                      │Get Advice│
    │ Session │                    │ Vitals  │                      │         │
    └─────────┘                    └─────────┘                      └─────────┘
         │                                                                 │
         ▼                                                                 │
    ┌─────────┐                                                           │
    │View     │◀──────────────────────────────────────────────────────────┘
    │Results  │
    └─────────┘
```

---

## 1.6 Security & Compliance

### 1.6.1 PDPA Compliance (Thailand)
- ผู้ป่วยต้องให้ความยินยอมก่อนแพทย์เข้าถึงข้อมูล
- สามารถเพิกถอนความยินยอมได้ทุกเมื่อ
- บันทึก Audit Log ทุกการเข้าถึงข้อมูล
- เข้ารหัสข้อมูลส่วนบุคคล

### 1.6.2 Authentication
- Session-based authentication
- Token validation
- Secure password storage (base64 encoded - recommend bcrypt for production)

### 1.6.3 Data Storage
- Google Cloud Storage (GCS) for all data
- Structured JSON files
- Bucket separation by data type:
  - `izara-users-credentials` - Authentication data
  - `izara-patients-data` - Patient PHR and PDPA
  - `izara-doctors-data` - Doctor information
  - `izara-appointments` - Appointment data
  - `izara-meta-data` - System metadata

---

## 1.7 Integration Points

| Service | Purpose | API Used |
|---------|---------|----------|
| **Google Cloud Storage** | Data persistence | GCS Node.js Client |
| **Google Calendar** | Appointment scheduling | Calendar API v3 |
| **Google Meet** | Video consultations | Meet API |
| **Google Maps** | Location services | Places API, Directions API |
| **Gemini AI** | Health assistant | Gemini API |

---

## 1.8 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 11, 2025 | Production release, Unified Docker Image, Google Cloud Run deployment |
| 0.0.2 | Dec 7, 2025 | Added Living Will versioning, AI Health Chat, Treatment Results filtering |
| 0.0.1 | Nov 2025 | Initial release |

---

[Next: Architecture →](./02-architecture.md)
