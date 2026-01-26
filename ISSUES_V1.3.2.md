# Izara Telemedicine v1.3.2 - Issue Tracking & Fix Plan


**Created:** January 26, 2026  
**Status:** 🔧 IN PROGRESS  
**Tested By:** Manual Testing

---

## 📋 Executive Summary


This document tracks all issues found during manual testing of v1.3.2 and provides a fix plan for each issue.

---

## 🔴 Critical Issues (Must Fix)


### Patient Portal Issues


| ID | Issue | Description | Status | Priority |
| ---- | ------- | ------------- | -------- | ---------- |
| **P-01** | Google Maps Not Working | "ไม่พบ API Key" error - Maps JavaScript API needs proper configuration | 🔴 Open | Critical |
| **P-02** | Appointments Not Fully Working | 2.1) Remove AI ช่วยแนะนำ → Change to Help/ความช่วยเหลือ | 🔴 Open | Critical |
| **P-03** | No Doctor Confirmation | Appointments don't notify doctors, no confirmation flow | 🔴 Open | Critical |
| **P-04** | No Jitsi Meeting Server | No deployed Jitsi server for video meetings | 🔴 Open | Critical |
| **P-05** | No AI Transcript | Google Speech-to-Text API not implemented | 🔴 Open | Critical |
| **P-06** | No AI Summary | Video transcript summary with Gemini not working | 🔴 Open | Critical |
| **P-07** | PHR Temperature Input | Temperature field needs proper number input (not +/- buttons) | 🔴 Open | High |
| **P-08** | PHR Save Error | "เกิดข้อผิดพลาดในการบันทึกข้อมูล" - Backend save fails | 🔴 Open | Critical |
| **P-09** | Medical Content No Images | No images display in คลังความรู้สุขภาพ | 🔴 Open | High |
| **P-10** | AI Chat No History | Chat history not persisted in PostgreSQL | 🔴 Open | High |

### Doctor Portal Issues


| ID | Issue | Description | Status | Priority |
| ---- | ------- | ------------- | -------- | ---------- |
| **D-01** | Consultants Fetch Failed | "Failed to fetch consultants" - API not working | 🔴 Open | Critical |
| **D-02** | Medical Content No Startup Data | Patient has data but Doctor portal empty | 🔴 Open | High |
| **D-03** | Clinical Resources Empty | No startup data | 🔴 Open | High |
| **D-04** | Doctor Profile Settings Missing | Can't change profile image, password, or theme | 🔴 Open | High |

---

## 🟡 Missing Features (Phase 1 Requirements)


| ID | Feature | Per Requirements | Status |
| ---- | --------- | ------------------ | -------- |
| **F-01** | Man-in-the-Loop | AI as assistant, doctor validates before sending to patient | 🔴 Not Implemented |
| **F-02** | Patient Instruction Sheet | Auto-generated post-consultation instructions | 🔴 Not Implemented |
| **F-03** | Pre-Consultation AI Summary | AI summarizes patient EMR + Q&A before meeting | 🔴 Not Implemented |
| **F-04** | PDF/Lab Document Analysis | AI analyzes uploaded documents | 🔴 Not Implemented |
| **F-05** | Clinical Decision Support | Drug interactions & dose adjustments | 🔴 Not Implemented |
| **F-06** | Meeting Transcription | Real-time transcription during meeting | 🔴 Not Implemented |

---

## 📊 Required Startup Data


### Demo Users (Must Work)


| Role | Email | Password | Thai Name | Portal |
| ------ | ------- | ---------- | ----------- | -------- |
| Patient 0 | demo.test@gmail.com | P@ssw0rd | นายอนันต์ ขยันเรียน | localhost:3005 |
| Patient 1 | Somchai.Mankong@gmail.com | P@ssw0rd | นายสมชาย มั่นคง | localhost:3005 |
| Patient 2 | Anan.Khayanrian@gmail.com | P@ssw0rd | นายอนันต์ ขยันเรียน | localhost:3005 |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 | นพ. ทดสอบ แพทย์ดี | localhost:3010 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 | นพ. ผู้ดูแลระบบ ใจดี | localhost:3010 |

### Patient Data Requirements


#### Patient 1: นายสมชาย มั่นคง

- **HN**: HN-2024-001234
- **Age**: 45 years old
- **Blood Type**: O+
- **Conditions**: Essential Hypertension (I10)
- **Medications**: Amlodipine 5mg QD
- **Allergies**: None


#### Patient 2: นายอนันต์ ขยันเรียน

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


---

## 🗂️ Pages Requiring Startup Data


### Doctor Portal - Admin View

1. แดชบอร์ด (Dashboard)
2. ตารางนัดหมาย (Appointment Schedule)
3. เวลาว่างของฉัน (My Availability)
4. ผู้ป่วย (Patients)
5. นัดหมาย & ประชุม (Appointments & Meetings)
6. ที่ปรึกษาแพทย์ (Medical Consultants)
7. เนื้อหาทางการแพทย์ (Medical Content)
8. ทรัพยากรทางคลินิก (Clinical Resources)
9. จัดการแพทย์ (Manage Doctors) - Admin Only
10. อนุมัติแพทย์ใหม่ (Approve New Doctors) - Admin Only


### Doctor Portal - Doctor View

1. แดชบอร์ด (Dashboard)
2. ตารางนัดหมาย (Appointment Schedule)
3. เวลาว่างของฉัน (My Availability)
4. ผู้ป่วย (Patients)
5. นัดหมาย & ประชุม (Appointments & Meetings)
6. ที่ปรึกษาแพทย์ (Medical Consultants)
7. เนื้อหาทางการแพทย์ (Medical Content)
8. ทรัพยากรทางคลินิก (Clinical Resources)


### Patient Portal

1. หน้าหลัก (Home)
2. นัดหมาย (Appointments)
3. ปรึกษา AI (AI Consultation)
4. คลังความรู้สุขภาพ (Medical Content Library)
5. ประวัติสุขภาพ (Health Records/PHR)
6. เส้นทางสุขภาพ (Health Timeline)
7. PDPA & Living Will
8. แผนที่ (Map)
9. ตั้งค่า (Settings)


---

## 🔧 Configuration Requirements


### Local Development

```text
Patient Portal: http://localhost:3005
Doctor Portal: http://localhost:3010
PostgreSQL: localhost:5433 (container: izara-postgres)
Database: izara_phase1
```


### Cloud Deployment

```text
Patient Portal: https://izara-patient-portal-724889190329.asia-southeast1.run.app
Doctor Portal: https://izara-doctor-portal-724889190329.asia-southeast1.run.app
PostgreSQL: Cloud SQL or Cloud Run PostgreSQL service
```


---

## 🚀 Fix Priority Order


1. **Database & Seed Data** - Ensure PostgreSQL has all required startup data
2. **Authentication** - Make sure all demo users can login
3. **PHR Backend** - Fix save errors
4. **Consultants API** - Fix fetch failure
5. **Medical Content** - Fix image display & data sync
6. **Maps** - Fix Google Maps API configuration
7. **Appointments** - Complete workflow with notifications
8. **AI Features** - Chat history, summaries
9. **Video Meeting** - Jitsi integration
10. **Doctor Settings** - Profile management


---

## 📝 Notes


- All test files have been removed
- Focus on manual testing
- Deploy to local first, then cloud
- Follow workflow documents in /Processes folder


---

*Last Updated: January 26, 2026*

