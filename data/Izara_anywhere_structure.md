# รายงานโครงสร้างและวิถีการพัฒนา IZARA-ANYWHERE TELEMEDICINE
## Platform Telemedicine ที่ใช้ Google Cloud Service + Google Workspace

---

## สารบัญ

1. [บทนำและภาพรวม](#บทนำและภาพรวม)
2. [โครงสร้างระบบทั่วไป](#โครงสร้างระบบทั่วไป)
3. [ฝั่งแพทย์ (Doctor Portal)](#ฝั่งแพทย์-doctor-portal)
4. [ฝั่งผู้ป่วย (Patient Portal)](#ฝั่งผู้ป่วย-patient-portal)
5. [โครงสร้างฐานข้อมูล (Database)](#โครงสร้างฐานข้อมูล-database)
6. [การทำงานกับ Google Cloud Services](#การทำงานกับ-google-cloud-services)
7. [การใช้ Google Workspace](#การใช้-google-workspace)
8. [แนวทางการพัฒนา](#แนวทางการพัฒนา)

---

## บทนำและภาพรวม

### ความหมาย IZARA-Anywhere

IZARA-Anywhere เป็นแพลตฟอร์ม Telemedicine (ยา/เยียวยาทางไกล) แบบ **Virtual Office** ที่เชื่อมต่อ:
- **แพทย์** (หมอที่ลงทะเบียน)
- **ผู้ป่วย** (คนไข้ที่ขอการรักษา)
- **ร้านยา** (เครือข่ายเภสัชกร)
- **สิ่งอำนวยความสะดวก** (โรงพยาบาล/คลินิก)

### วิสัยทัศน์หลัก

✅ สร้างแพลตฟอร์มให้ "ใช้ได้จากที่ใดก็ได้" (Anywhere, Anytime)  
✅ ลดเวลารอคิวและเวลาเอกสารของแพทย์ด้วย AI  
✅ เก็บข้อมูลตามมาตรฐาน FHIR (Healthcare Interoperability)  
✅ ใช้เฉพาะบริการ Google Cloud + Google Workspace  
✅ รองรับภาษาไทยและทำให้ผู้ป่วยทั่วไปใช้ได้ง่าย

### โครงสร้างหลัก (Architecture Overview)

```
┌─────────────────────────────────────┐
│   ผู้ใช้ระบบ (Frontend Tier)        │
│  แพทย์/ผู้ป่วย Browser              │
└────────────┬────────────────────────┘
             │ HTTP/REST API
┌────────────▼────────────────────────┐
│  Backend API Server                 │
│  Node.js + Express (Port 3000/3010) │
│  ├─ Authentication                  │
│  ├─ Business Logic                  │
│  └─ GCS Operations                  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Google Cloud Storage (5 Buckets)   │
│  ├─ Users Credentials               │
│  ├─ Patients Data                   │
│  ├─ Doctors Data                    │
│  ├─ Appointments                    │
│  └─ Metadata                        │
└─────────────────────────────────────┘
```

---

## โครงสร้างระบบทั่วไป

### ทีม 3 Backend Servers

#### 1. **GCS API Server (Port 3012)**
- **หน้าที่**: บริหารจัดการการเข้าถึง Google Cloud Storage โดยตรง
- **ไม่เปิดแบบ Public** (เป็น Internal Service เท่านั้น)
- **ฟังก์ชัน**:
  - อ่านและเขียนข้อมูล JSON ไป GCS
  - อัปโหลด/ดาวน์โหลดไฟล์
  - ลบและระบุรายการไฟล์
  - ดำเนินการแบบ Batch

#### 2. **Auth Server (Port 3011)**
- **หน้าที่**: จัดการการล็อกอิน สมัครสมาชิก และ Session
- **เสิร์ฟ**: ผู้เข้าใช้ (แพทย์/ผู้ป่วย)
- **ฟังก์ชัน**:
  - สมัครสมาชิกและล็อกอิน
  - ตรวจสอบ Session Token
  - ล็อกอาวต์
  - Proxy บริการเก็บข้อมูล

#### 3. **Main API Server (Port 3010)**
- **หน้าที่**: จัดการการทำงานทางคลินิก
- **เสิร์ฟ**: Dashboard ข้อมูลทั่วไป
- **ฟังก์ชัน**:
  - Dashboard แพทย์
  - การจัดการผู้ป่วย
  - Electronic Medical Record (EMR)
  - บรรชาการสั่งยา
  - การสั่งห้องแล็บ
  - คิวผู้ป่วยแบบ Real-time
  - นัดหมายและการประชุม Google Meet

### ชั้น Frontend

#### ฝั่งแพทย์
- **Port**: 3010
- **Framework**: React 18 + TypeScript + Tailwind CSS
- **ประเภท**: Single-Page Application (SPA)

#### ฝั่งผู้ป่วย
- **Port**: 3001
- **Framework**: React 18 + TypeScript + Tailwind CSS
- **ประเภท**: Progressive Web App (PWA)

---

## ฝั่งแพทย์ (Doctor Portal)

### ภาพรวมความสามารถ

#### 1. **Dashboard (แดชบอร์ด)**
```
┌─────────────────────────────────────────┐
│  Dashboard แพทย์                        │
├─────────────────────────────────────────┤
│ ♦ Menu ทางซ้าย       ♦ แผนที่/ปฏิทิน   │
│   - ผู้ป่วย          ♦ Health Studio    │
│   - EMR              ├─ AI Assistant   │
│   - ใบสั่งยา         ├─ Chat Interface │
│   - Lab Orders       └─ Reports        │
│   - คิว              ♦ ประวัติเหตุการณ์│
│   - นัดหมาย          └─ Health Status   │
└─────────────────────────────────────────┘
```

#### 2. **ฟีเจอร์หลัก**

| ฟีเจอร์ | คำอธิบาย | สถานะ |
|--------|---------|------|
| **การจัดการผู้ป่วย** | ค้นหาและดูรายงานผู้ป่วย | ✅ Ready |
| **สร้าง EMR** | บันทึกเวชระเบียนพร้อม AI Draft | ✅ Ready |
| **ใบสั่งยา** | สั่งยา - ยืนยัน - เซ็นดิจิทัล | ✅ Ready |
| **Lab Orders** | สั่งห้องแล็บ - ติดตามผล | ✅ Ready |
| **คิวผู้ป่วย** | Real-time queue update + Skip/Call | ✅ Ready |
| **นัดหมาย** | ตรวจสอบนัดพร้อม Google Meet Link | ✅ Ready |
| **AI Health Studio** | ใช้ Gemini AI สรุปโน้ตแบบอัตโนมัติ | ✅ Ready |
| **Google Meet** | บริหารประชุมวิดีโอ | ✅ Ready |

#### 3. **Workflow: สร้าง EMR**

```
ขั้นที่ 1: เลือกผู้ป่วย
    ↓
ขั้นที่ 2: กรอกข้อมูลทางคลินิก (เลือกวินิจฉัย ICD-10)
    ↓
ขั้นที่ 3: AI Draft → แพทย์ตรวจและแก้ไข
    ↓
ขั้นที่ 4: บันทึกการวินิจฉัยและแผนการรักษา
    ↓
ขั้นที่ 5: ออกใบสั่งยา/ทดสอบห้องแล็บ (ถ้าจำเป็น)
    ↓
ขั้นที่ 6: ลงชื่อดิจิทัลและบันทึกลงฐานข้อมูล (GCS)
```

#### 4. **Data Storage Structure**

```
izara-doctors-data bucket:
├── doctors/
│   ├── doctor_001.json (Profile + License)
│   └── doctor_002.json
├── doctor-availability/ (ตารางเวลาว่าง)
├── doctor-schedule/ (วันแบ่ง Time Slot)
├── doctor-stats/ (สถิติการใช้งาน)
└── queue/ (คิวผู้ป่วยแบบ Real-time)
```

#### 5. **API Endpoints หลัก (Doctor Portal)**

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/api/dashboard/{doctorId}` | ข้อมูล Dashboard |
| GET | `/api/patients` | รายชื่อผู้ป่วยทั้งหมด |
| POST | `/api/emr` | สร้าง EMR ใหม่ |
| POST | `/api/prescriptions` | สั่งยาใหม่ |
| POST | `/api/lab-orders` | สั่งทดสอบห้องแล็บ |
| GET | `/api/queue/doctor/{id}` | ดูคิวปัจจุบัน |
| POST | `/api/queue/call-next` | เรียกผู้ป่วยคนถัดไป |

---

## ฝั่งผู้ป่วย (Patient Portal)

### ภาพรวมความสามารถ

#### 1. **Dashboard ผู้ป่วย**
```
┌────────────────────────────────────┐
│  Dashboard ผู้ป่วย                 │
├────────────────────────────────────┤
│ ♦ สถานะสุขภาพ (Health Status)      │
│ ♦ นัดหมายที่กำลังจะมา              │
│ ♦ ประวัติการพบแพทย์ (Timeline)     │
│ ♦ เวชระเบียนส่วนตัว (PHR)          │
│ ♦ ใบสั่งยา & Lab Results           │
│ ♦ AI Doctor (Gemini Chatbot)       │
│ ♦ ร้านยาใกล้เคียง (Maps)           │
└────────────────────────────────────┘
```

#### 2. **ฟีเจอร์หลัก**

| ฟีเจอร์ | คำอธิบาย | สถานะ |
|--------|---------|------|
| **ลงทะเบียน/ล็อกอิน** | Email/Password + Google Sign-In | ✅ Ready |
| **PHR Management** | เพิ่มข้อมูลสุขภาพส่วนตัว | ✅ Ready |
| **Intake Form** | ฟอร์มซักประวัติอัพโหลดเสียง/รูป | ✅ Ready |
| **AI Triage** | Speech-to-Text → AI Summary | ✅ Ready |
| **Appointment Booking** | จองเวลานัดพร้อม Google Meet Link | ✅ Ready |
| **Medical Timeline** | ดูประวัติการรักษาแบบเส้นเวลา | ✅ Ready |
| **AI Doctor** | Gemini AI สำหรับสอบถามสุขภาพ | ✅ Ready |
| **Symptom Checker** | AI วิเคราะห์อาการเบื้องต้น | ✅ Ready |
| **Living Will** | จัดการพินัยกรรมทางการแพทย์ | ✅ Ready |
| **PDPA Consent** | จัดการการยินยอมข้อมูล | ✅ Ready |
| **Healthcare Map** | ค้นหาแพทย์/ร้านยาใกล้ | ✅ Ready |

#### 3. **Workflow: จองนัดพบแพทย์**

```
ขั้นที่ 1: ผู้ป่วยกรอก Intake Form (เสียง/ข้อความ)
    ↓
ขั้นที่ 2: ระบบ AI ถอดเสียง + สรุปอาการ (Speech-to-Text + Gemini)
    ↓
ขั้นที่ 3: ผู้ป่วยเห็นสรุป AI → อนุมัติหรือแก้ไข
    ↓
ขั้นที่ 4: ระบบสร้าง Appointment + Google Calendar event + Meet link
    ↓
ขั้นที่ 5: ผู้ป่วยได้รับการยืนยันทาง Email/Notification
    ↓
ขั้นที่ 6: ผู้ป่วยกดเข้า Meet ตามเวลา
```

#### 4. **Data Storage Structure**

```
izara-patients-data bucket:
├── patients/
│   ├── patient_001.json (Profile)
│   ├── patient_001_phr/ (PHR - Personal Health Record)
│   ├── patient_001_timeline/ (Timeline events)
│   └── patient_001_pdpa/ (Consent records)
├── emr/ (Electronic Medical Records)
├── prescriptions/ (ใบสั่งยา)
├── lab-orders/ (Lab test orders)
├── imaging-orders/ (CT/MRI orders)
├── vital-signs/ (ข้อมูลชีพจรตามเวลา)
├── documents/ (ไฟล์เอกสารและรูป)
└── consent-records/ (PDPA consent history)
```

#### 5. **API Endpoints หลัก (Patient Portal)**

| Method | Endpoint | คำอธิบาย |
|--------|----------|---------|
| GET | `/api/patient/profile` | ข้อมูลส่วนตัวผู้ป่วย |
| POST | `/api/patient/phr` | เพิ่ม/อัพเดต PHR |
| POST | `/api/appointments` | สั่งจองนัดหมาย |
| GET | `/api/appointments` | ดูรายการนัดหมาย |
| GET | `/api/medical-timeline` | ประวัติการรักษา |
| GET | `/api/pdpa-consents` | สถานะการยินยอม |
| POST | `/api/ai-chat` | สอบถาม Gemini AI |
| GET | `/api/nearby-doctors` | ค้นหาแพทย์ใกล้ |

---

## โครงสร้างฐานข้อมูล (Database)

### ภาพรวม 5 GCS Buckets

```
┌─────────────────────────────────────────────────┐
│         Google Cloud Storage (5 Buckets)        │
├─────────────────────────────────────────────────┤
│ 1. izara-users-credentials                      │
│    └─ Users, Sessions, OAuth, Login History    │
│                                                 │
│ 2. izara-patients-data ⭐ (LARGEST)             │
│    └─ PHR, EMR, Prescriptions, Labs, PDPA      │
│                                                 │
│ 3. izara-doctors-data                          │
│    └─ Doctor Profiles, Schedules, Queue       │
│                                                 │
│ 4. izara-appointments                          │
│    └─ Bookings, Meet Links, Participants      │
│                                                 │
│ 5. izara-meta-data                             │
│    └─ Medications, ICD-10, Lab Tests, etc.     │
└─────────────────────────────────────────────────┘
```

### 1️⃣ **Bucket: izara-users-credentials**

**ฟังก์ชัน**: จัดเก็บข้อมูลผู้ใช้ สิทธิการเข้าถึง และประวัติการล็อกอิน

**Tables/Files**:

```
users/
├── index.json
│   {
│     "users": [
│       {
│         "id": "dr_001",
│         "email": "doctor@example.com",
│         "role": "doctor",
│         "doctor_id": "DOC-2025-001",
│         "password_hash": "bcrypt_hashed",
│         "is_active": true,
│         "created_at": "2025-01-01T10:00:00Z"
│       }
│     ]
│   }
└── {userId}.json (Individual records)

sessions/
└── {sessionToken}.json
    {
      "user_id": "dr_001",
      "created_at": "2025-11-27T10:00:00Z",
      "expires_at": "2025-11-28T10:00:00Z",
      "last_activity": "2025-11-27T14:30:00Z"
    }

login-history/
└── {userId}.json
    {
      "login_events": [
        {
          "timestamp": "2025-11-27T10:15:00Z",
          "ip_address": "203.0.113.45",
          "success": true,
          "user_agent": "Mozilla/5.0..."
        }
      ]
    }
```

### 2️⃣ **Bucket: izara-patients-data** ⭐ (ใหญ่ที่สุด)

**ฟังก์ชัน**: เก็บเวชระเบียนและข้อมูลสุขภาพผู้ป่วย

**Sub-directories & Files**:

```
patients/
├── index.json (รายชื่อผู้ป่วยทั้งหมด)
├── {patientId}.json
│   {
│     "id": "PT-001",
│     "name": "สมชาย ใจดี",
│     "date_of_birth": "1980-05-15",
│     "gender": "male",
│     "blood_type": "O+",
│     "phone": "+66812345678",
│     "email": "patient@example.com",
│     "address": "123 ซ.ตัดใจ ถ.พระราม 4...",
│     "emergency_contact": {...},
│     "insurance_provider": "Thai Health",
│     "created_at": "2025-01-01T09:00:00Z"
│   }
└── {patientId}/ (Patient-specific folder)
    ├── phr.json (Personal Health Record)
    ├── timeline.json (ประวัติการรักษาแบบเส้นเวลา)
    ├── vital-signs.json (ชีพจร/อุณหภูมิ/etc)
    ├── vaccinations.json (ประวัติวัคซีน)
    ├── living-will.json (พินัยกรรมทางการแพทย์)
    ├── documents/ (ไฟล์เอกสาร)
    │   ├── receipt_001.pdf
    │   └── scan_001.jpg
    └── consent-records/ (PDPA/Consent)

emr/ (Electronic Medical Records)
├── index.json
└── {emrId}.json
    {
      "id": "EMR-001",
      "patient_id": "PT-001",
      "doctor_id": "DR-001",
      "doctor_name": "ดร.ประจำ",
      "encounter_date": "2025-11-27T10:30:00Z",
      "encounter_type": "consultation",
      "chief_complaint": "ปวดหัวตั้งแต่ 3 วันที่แล้ว",
      "assessment": "ปวดหัวชนิดความเครียด",
      "vital_signs": {
        "systolic": 120,
        "diastolic": 80,
        "heart_rate": 72,
        "temperature": 36.5,
        "oxygen_saturation": 98
      },
      "diagnoses": [
        {
          "icd10_code": "G89.0",
          "description": "ปวดหัวจากความเครียด"
        }
      ],
      "treatment_plan": "พักอย่างเพียงพอ บันทึกให้มีการผ่อนคลาย",
      "status": "completed",
      "digital_signature": "signature_hash_001",
      "created_at": "2025-11-27T10:30:00Z"
    }

prescriptions/ (ใบสั่งยา)
├── index.json
└── {prescriptionId}.json
    {
      "id": "RX-001",
      "patient_id": "PT-001",
      "doctor_id": "DR-001",
      "encounter_date": "2025-11-27T10:30:00Z",
      "pharmacy_name": "ร้านขายยา ABC",
      "status": "completed",
      "items": [
        {
          "drug_name": "Paracetamol",
          "generic_name": "Paracetamol",
          "brand_name": "Tylenol",
          "dosage": "500mg",
          "route": "oral",
          "frequency": "every 6 hours",
          "duration": "3 days",
          "quantity": 12,
          "refills": 0,
          "instructions": "รับประทับใจกับน้ำอุ่นหลังอาหาร"
        }
      ],
      "digital_signature": "signature_hash_001",
      "valid_until": "2025-12-27"
    }

lab-orders/ (ห้องแล็บ)
├── index.json
└── {labOrderId}.json
    {
      "id": "LAB-001",
      "patient_id": "PT-001",
      "doctor_id": "DR-001",
      "order_date": "2025-11-27T10:30:00Z",
      "clinical_indication": "Full Blood Check",
      "urgency": "routine",
      "status": "results_available",
      "lab_name": "Bangkok Lab Center",
      "collected_at": "2025-11-27T14:00:00Z",
      "completed_at": "2025-11-28T09:00:00Z",
      "tests": [
        {
          "test_code": "CBC",
          "test_name": "Complete Blood Count"
        }
      ],
      "results": [
        {
          "test_name": "White Blood Cell (WBC)",
          "value": "7.5",
          "unit": "x10^3/μL",
          "normal_range": "4.5-11.0",
          "flag": "normal"
        }
      ]
    }

consent-records/ (บันทึกการยินยอม PDPA)
└── {patientId}_consents.json
    {
      "consents": [
        {
          "id": "CONSENT-001",
          "patient_id": "PT-001",
          "doctor_id": "DR-001",
          "doctor_name": "ดร.ประจำ",
          "data_types": ["medical_history", "prescriptions"],
          "status": "granted",
          "granted_at": "2025-11-27T10:00:00Z",
          "expires_at": "2026-11-27T10:00:00Z",
          "digital_signature": "signature_hash_001"
        }
      ]
    }

audit/ (บันทึก Audit สำหรับ PDPA)
└── access-logs/
    └── PT-001_2025-11-27.json
        {
          "access_logs": [
            {
              "user_id": "DR-001",
              "action": "READ_EMR",
              "resource_type": "emr",
              "resource_id": "EMR-001",
              "timestamp": "2025-11-27T10:35:00Z",
              "purpose": "Patient consultation",
              "ip_address": "203.0.113.45",
              "success": true
            }
          ]
        }
```

### 3️⃣ **Bucket: izara-doctors-data**

**ฟังก์ชัน**: ข้อมูลแพทย์ และตารางเวลา

```
doctors/
├── index.json
└── {doctorId}.json
    {
      "id": "DR-001",
      "name": "ดร.ประจำ",
      "specialty": "Internal Medicine",
      "email": "doctor@example.com",
      "phone": "+66812345678",
      "medical_license": "THY12345678",
      "hospital_name": "Bangkok Hospital",
      "is_active": true,
      "rating": 4.8,
      "total_reviews": 245,
      "experience_years": 12,
      "created_at": "2025-01-01T10:00:00Z"
    }

doctor-availability/ (ตารางว่าง)
└── {doctorId}_availability.json
    {
      "availability": [
        {
          "weekday": 1,  // Monday
          "start_time": "09:00",
          "end_time": "17:00",
          "slot_duration_min": 30,
          "is_active": true
        }
      ]
    }

doctor-schedule/ (วันที่และเวลา)
└── {doctorId}_schedule.json
    {
      "schedule": [
        {
          "date": "2025-12-01",
          "slot_start": "2025-12-01T09:00:00Z",
          "slot_end": "2025-12-01T09:30:00Z",
          "is_available": true,
          "is_booked": false
        }
      ]
    }

doctor-stats/ (สถิติ)
└── {doctorId}_stats.json
    {
      "doctor_id": "DR-001",
      "patients_seen_today": 8,
      "patients_seen_week": 42,
      "patients_seen_month": 156,
      "avg_consultation_time_min": 18.5,
      "pending_prescriptions": 3,
      "updated_at": "2025-11-27T14:30:00Z"
    }

queue/
└── {doctorId}_queue.json
    {
      "queue": [
        {
          "id": "QUEUE-001",
          "doctor_id": "DR-001",
          "patient_id": "PT-001",
          "patient_name": "สมชาย ใจดี",
          "status": "called",  // waiting, called, in_consultation, completed
          "position": 1,
          "checked_in_at": "2025-11-27T14:00:00Z",
          "called_at": "2025-11-27T14:25:00Z"
        }
      ]
    }
```

### 4️⃣ **Bucket: izara-appointments**

**ฟังก์ชัน**: การจองนัด

```
appointments/
├── index.json
└── {appointmentId}.json
    {
      "id": "APT-001",
      "patient_id": "PT-001",
      "patient_name": "สมชาย ใจดี",
      "doctor_id": "DR-001",
      "doctor_name": "ดร.ประจำ",
      "appointment_date": "2025-12-01T14:00:00Z",
      "appointment_type": "video",  // video, in_person, telephone
      "status": "confirmed",  // pending, confirmed, completed, cancelled
      "reason": "Routine checkup",
      "meet_link": "https://meet.google.com/xxx-yyyy-zzz",
      "calendar_event_id": "event_id_from_google_calendar",
      "created_at": "2025-11-27T10:00:00Z",
      "confirmed_at": "2025-11-27T10:15:00Z"
    }

meeting-links/
└── {appointmentId}_meeting.json
    {
      "appointment_id": "APT-001",
      "meet_link": "https://meet.google.com/xxx-yyyy-zzz",
      "calendar_event_id": "event_id",
      "created_at": "2025-11-27T10:00:00Z",
      "expires_at": "2025-12-02T14:00:00Z"
    }
```

### 5️⃣ **Bucket: izara-meta-data**

**ฟังก์ชัน**: ข้อมูลอ้างอิง (ยา/โรค/ทดสอบ)

```
medications-ref/ (ยา)
└── medications_index.json
    {
      "medications": [
        {
          "id": "MED-001",
          "name": "Paracetamol",
          "generic_name": "Paracetamol",
          "brand_names": ["Tylenol", "Panadol"],
          "category": "Analgesic",
          "strength_options": ["500mg", "1000mg"],
          "route_options": ["oral", "suppository"],
          "indications": "Pain relief, fever",
          "contraindications": "Liver disease",
          "pregnancy_category": "B"
        }
      ]
    }

icd10-codes-ref/ (รหัส ICD-10)
└── icd10_index.json
    {
      "icd10_codes": [
        {
          "code": "G89.0",
          "description": "Central post-stroke pain (thalamic pain)",
          "category": "Neurological",
          "is_active": true
        },
        {
          "code": "I10",
          "description": "Essential (primary) hypertension",
          "category": "Cardiovascular"
        }
      ]
    }

lab-tests-ref/ (ห้องแล็บ)
└── lab_tests_index.json
    {
      "lab_tests": [
        {
          "code": "CBC",
          "name": "Complete Blood Count",
          "normal_range_male": "4.5-11.0",
          "normal_range_female": "4.5-11.0",
          "unit": "x10^3/μL",
          "critical_low": "2.0",
          "critical_high": "30.0"
        }
      ]
    }

drug-interactions-ref/ (อาการเสริมของยา)
└── drug_interactions_index.json
    {
      "interactions": [
        {
          "drug_a": "Paracetamol",
          "drug_b": "Ibuprofen",
          "severity": "moderate",
          "description": "Increased risk of GI bleeding",
          "recommendation": "Avoid combination if possible"
        }
      ]
    }
```

---

## การทำงานกับ Google Cloud Services

### 1. **Google Cloud Storage (GCS)**

#### ประโยชน์
✅ เก็บข้อมูล JSON, ไฟล์เอกสาร, รูปถ่าย  
✅ ความปลอดภัยสูง (IAM, Encryption)  
✅ Scalable และ Cost-effective  
✅ Version Control บนไฟล์  
✅ Lifecycle Management (TTL อัตโนมัติ)

#### วิธีการใช้งาน

**ตัวอย่าง: บันทึกข้อมูลผู้ป่วย**

```javascript
// Backend Code
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: 'izara-telemedicine',
  keyFilename: 'credentials/service-account.json'
});

const bucket = storage.bucket('izara-patients-data');

// Write patient data
const patientFile = bucket.file(`patients/PT-001.json`);
await patientFile.save(JSON.stringify(patientData), {
  metadata: { contentType: 'application/json' }
});

// Read patient data
const [content] = await patientFile.download();
const patientData = JSON.parse(content.toString());

// List all patients
const [files] = await bucket.getFiles({ prefix: 'patients/' });
files.forEach(file => console.log(file.name));
```

#### Bucket Configuration

| Bucket | Size Limit | TTL | Retention | Encryption |
|--------|-----------|-----|-----------|------------|
| `izara-users-credentials` | 10 GB | - | 30 days (logs) | CMEK |
| `izara-patients-data` | 500 GB | - | 7 years (PHI) | CMEK |
| `izara-doctors-data` | 50 GB | - | 1 year | CMEK |
| `izara-appointments` | 50 GB | 1 year | 1 year | CMEK |
| `izara-meta-data` | 10 GB | - | - | CMEK |

### 2. **Google Calendar API**

#### ประโยชน์
✅ สร้างและจัดการ Event  
✅ ส่งคำเชิญไปยัง Patient/Doctor Email  
✅ สร้าง Google Meet Link อัตโนมัติ  
✅ Webhook สำหรับการเปลี่ยนแปลง

#### วิธีการใช้งาน

**ตัวอย่าง: สร้าง Appointment พร้อม Meet Link**

```javascript
// Backend Code
import { google } from 'googleapis';

const calendar = google.calendar({
  version: 'v3',
  auth: authClient  // OAuth2 token
});

// Create appointment with Meet link
const event = {
  summary: 'Consultation with Dr. Prachak',
  description: 'Online consultation',
  start: {
    dateTime: '2025-12-01T14:00:00+07:00',
    timeZone: 'Asia/Bangkok'
  },
  end: {
    dateTime: '2025-12-01T14:30:00+07:00',
    timeZone: 'Asia/Bangkok'
  },
  conferenceData: {
    createRequest: {
      requestId: 'unique-request-id-123',
      conferenceSolutionKey: {
        key: 'hangoutsMeet'
      }
    }
  },
  attendees: [
    { email: 'patient@example.com' },
    { email: 'doctor@example.com' }
  ]
};

const response = await calendar.events.insert({
  calendarId: 'primary',
  resource: event,
  conferenceDataVersion: 1,
  sendUpdates: 'all'
});

// Extract Meet link
const meetLink = response.data.conferenceData.entryPoints[0].uri;
console.log('Meet Link:', meetLink); // https://meet.google.com/xxx-yyy-zzz
```

### 3. **Google Maps API**

#### ประโยชน์
✅ ค้นหา Healthcare Providers (แพทย์/ร้านยา/โรงพยาบาล)  
✅ ระยะทางและเส้นทาง  
✅ ไม่ส่ง PHI ดิบไปยัง Maps API

#### วิธีการใช้งาน

**ตัวอย่าง: ค้นหาร้านยาใกล้เคียง**

```javascript
// Frontend Code
const mapService = google.maps.places.PlacesService;

const request = {
  location: new google.maps.LatLng(13.7563, 100.5018), // Bangkok
  radius: 5000,  // 5 km
  keyword: 'pharmacy',
  type: 'pharmacy'
};

mapService.nearbySearch(request, (results, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    results.forEach(pharmacy => {
      console.log(`${pharmacy.name} - ${pharmacy.vicinity}`);
    });
  }
});
```

### 4. **Google Meet Integration**

#### ประโยชน์
✅ ประชุมวิดีโอจากภายในแอป  
✅ บันทึก Video & Transcript อัตโนมัติ  
✅ Screen Sharing  
✅ Chat ในการประชุม

#### วิธีการใช้งาน

```javascript
// Frontend - embed Meet in React
import React from 'react';

export const MeetComponent = ({ meetLink }) => {
  return (
    <div className="meet-container">
      <iframe
        src={meetLink}
        allow="microphone; camera"
        style={{ width: '100%', height: '600px' }}
      />
    </div>
  );
};
```

### 5. **Google Cloud Health Check**

#### ประโยชน์
✅ ตรวจสอบการเชื่อมต่อ GCS ตั้งแต่เริ่มต้นแอป  
✅ แจ้งเตือนถ้า Bucket ไม่พร้อมใช้งาน

#### วิธีการใช้งาน

```javascript
// Backend - Health Check Endpoint
app.get('/api/health/gcs', async (req, res) => {
  try {
    const buckets = [
      'izara-users-credentials',
      'izara-patients-data',
      'izara-doctors-data',
      'izara-appointments',
      'izara-meta-data'
    ];

    for (const bucketName of buckets) {
      const bucket = storage.bucket(bucketName);
      await bucket.exists();  // Check if accessible
    }

    res.json({ status: 'ok', message: 'GCS is healthy' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
```

---

## การใช้ Google Workspace

### 1. **Google Workspace Suite**

#### ส่วนประกอบ
```
┌─────────────────────────────────┐
│   Google Workspace for Business  │
├─────────────────────────────────┤
│ ✅ Gmail        - Email          │
│ ✅ Calendar     - นัดหมาย       │
│ ✅ Drive        - Cloud Storage │
│ ✅ Docs/Sheets  - Documents     │
│ ✅ Meet         - Video Call    │
│ ✅ Admin Console - Management   │
└─────────────────────────────────┘
```

### 2. **Gmail Integration**

#### ประโยชน์
✅ ส่ง Email Notification  
✅ Email Templates สำหรับยืนยันนัดหมาย  
✅ ส่วนสนับสนุนลูกค้า

#### วิธีการใช้งาน

```javascript
// Backend - Send appointment confirmation email
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply@izara-clinic.com',
    pass: 'app_password_from_google'
  }
});

const mailOptions = {
  from: 'noreply@izara-clinic.com',
  to: patientEmail,
  subject: 'ยืนยันการนัดหมายกับแพทย์',
  html: `
    <h2>การนัดหมายของคุณได้รับการยืนยัน</h2>
    <p>วันที่และเวลา: ${appointmentDate}</p>
    <p>แพทย์: ${doctorName}</p>
    <a href="${meetLink}">เข้าประชุม Google Meet</a>
  `
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) console.log(error);
  else console.log('Email sent:', info.response);
});
```

### 3. **Google Drive Integration**

#### ประโยชน์
✅ เก็บไฟล์ EMR / ใบสั่งยา  
✅ Sharing แบบปลอดภัยกับผู้ป่วย  
✅ Version Control

#### วิธีการใช้งาน

```javascript
// Backend - Upload EMR to Google Drive
import { google } from 'googleapis';

const drive = google.drive({
  version: 'v3',
  auth: authClient
});

// Create folder for patient
const folderMetadata = {
  name: `Patient_${patientId}`,
  mimeType: 'application/vnd.google-apps.folder'
};

const folder = await drive.files.create({
  resource: folderMetadata,
  fields: 'id'
});

const folderId = folder.data.id;

// Upload EMR file
const fileMetadata = {
  name: `EMR_${emrId}.pdf`,
  parents: [folderId]
};

const media = {
  mimeType: 'application/pdf',
  body: emrPdfStream
};

await drive.files.create({
  resource: fileMetadata,
  media: media,
  fields: 'id, webViewLink'
});

// Share with patient
await drive.permissions.create({
  fileId: folderId,
  resource: {
    kind: 'drive#permission',
    type: 'user',
    role: 'reader',
    emailAddress: patientEmail
  }
});
```

### 4. **Google Sheets Integration**

#### ประโยชน์
✅ ดัชนีเพื่อวัตถุประสงค์ของรายงาน  
✅ Export ข้อมูลสถิติบริหาร

#### วิธีการใช้งาน

```javascript
// Backend - Create Daily Report
import { google } from 'googleapis';

const sheets = google.sheets({
  version: 'v4',
  auth: authClient
});

const spreadsheetId = 'xxx-yyy-zzz';

// Append daily statistics
const request = {
  spreadsheetId,
  range: 'Daily Stats!A1',
  valueInputOption: 'USER_ENTERED',
  resource: {
    values: [
      ['Date', 'Appointments', 'Consultations', 'Prescriptions'],
      [new Date().toISOString(), 15, 12, 8]
    ]
  }
};

await sheets.spreadsheets.values.append(request);
```

### 5. **Admin Console**

#### ฟังก์ชัน
✅ จัดการผู้ใช้และบทบาท  
✅ ตั้งค่าความปลอดภัย  
✅ Monitor การใช้งาน

#### User Groups

```
Workspace Organizational Units:
├── Doctors
│   ├── Specialists
│   └── General Practitioners
├── Patients
└── Admins
```

---

## แนวทางการพัฒนา

### Phase 1: MVP (Minimum Viable Product) - 2 เดือน

#### Deliverables
- ✅ Patient Portal (Intake + AI + Booking)
- ✅ Doctor Portal (EMR + Prescribing + Queue)
- ✅ Google Calendar Integration
- ✅ Basic Reporting

#### Tech Stack
```
Frontend:  React 18 + TypeScript + Tailwind
Backend:   Node.js + Express + TypeScript
Storage:   Google Cloud Storage (5 Buckets)
AI:        Google Gemini API
Auth:      Google OAuth 2.0
```

#### Development Checklist
- [ ] Setup GCP Project & Buckets
- [ ] Configure OAuth 2.0
- [ ] Build Backend API (7 modules)
- [ ] Build Frontend Pages (9 pages)
- [ ] Integrate Gemini AI
- [ ] PDPA Compliance Setup
- [ ] Testing & QA
- [ ] Deploy to Staging

### Phase 2: MVP+ (Enhanced) - 3 เดือน

#### New Features
- ✅ Lab Integration (real-time results)
- ✅ Prescription Delivery Tracking
- ✅ FHIR Compliance
- ✅ Advanced Analytics
- ✅ Mobile App (React Native)

#### Infrastructure Improvements
- [ ] Load Balancing
- [ ] Database Replication
- [ ] Backup & Disaster Recovery
- [ ] Advanced Monitoring

### Phase 3: Scale (Ecosystem) - 6+ เดือน

#### Integration Partners
- 🔗 Pharmacy Network
- 🔗 Insurance Companies
- 🔗 Government Health Systems
- 🔗 Medical Device IoT

#### New Capabilities
- ✅ Remote Monitoring (Wearables)
- ✅ Predictive Health Analytics
- ✅ RAG Knowledge Base
- ✅ Multi-language Support

### Development Team Structure

```
┌─────────────────────────────────────┐
│       Development Leadership         │
│  Project Manager + Tech Lead        │
└──────┬──────────────────────────────┘
       │
       ├─ Frontend Team (2-3 devs)
       │  ├─ UI/Component Dev
       │  └─ Feature Implementation
       │
       ├─ Backend Team (2-3 devs)
       │  ├─ API Development
       │  └─ GCS Integration
       │
       ├─ DevOps Team (1-2 devs)
       │  ├─ Infrastructure
       │  └─ Deployment
       │
       ├─ QA Team (1-2 testers)
       │  ├─ Manual Testing
       │  └─ Automation
       │
       └─ Clinical Advisor (1)
          └─ FHIR/Healthcare Compliance
```

### Deployment Architecture

#### Development Environment
```
http://localhost:3010  - Doctor Frontend
http://localhost:3001  - Patient Frontend
http://localhost:3000  - Backend API
```

#### Staging Environment
```
https://staging-doctor.izara-clinic.com
https://staging-patient.izara-clinic.com
https://api-staging.izara-clinic.com
GCS Staging Buckets (separate project)
```

#### Production Environment
```
https://doctor.izara-clinic.com
https://patient.izara-clinic.com
https://api.izara-clinic.com
GCS Production Buckets (production project)
CDN + SSL + WAF
Load Balancing
```

### Cost Estimation

#### Phase 1 (MVP)
```
Google Cloud:
  - Compute Engine:    $500-800/month
  - Cloud Storage:     $50-100/month
  - Calendar/Maps:     $100-200/month
  - Gemini API:        $50-150/month

Google Workspace:
  - 10 licenses:       $10-15 × 10 = $100-150/month

Development:
  - 5 engineers:       $25,000-35,000/month

Total: ~$26,000-36,000/month × 2 = $52,000-72,000 (MVP Phase)
```

#### Phase 2+ (Scale)
```
Recurring Monthly:
  - GCP Services:      $2,000-5,000/month
  - Workspace:         $500-1,000/month
  - DevOps/Support:    $3,000-5,000/month
  - Infrastructure:    $2,000-4,000/month

Total: ~$7,500-15,000/month for production
```

### Security & Compliance

#### Data Protection
✅ End-to-end Encryption (TLS 1.3)  
✅ Data at Rest: Google CMEK  
✅ IAM Role-based Access Control  
✅ VPC Service Controls

#### Compliance
✅ PDPA (Thailand)  
✅ HIPAA (if expanding internationally)  
✅ FHIR Standard  
✅ Regular Security Audits  
✅ Penetration Testing

#### Monitoring & Logging
✅ Cloud Logging  
✅ Cloud Monitoring  
✅ Audit Logging (all PHI access)  
✅ Alert Management

---

## สรุป

IZARA-Anywhere เป็น Telemedicine Platform ที่ออกแบบสำหรับประเทศไทย โดยใช้:

- **Architecture**: Separated Backend API + Frontend UI
- **Storage**: Google Cloud Storage (5 Buckets)
- **AI**: Google Gemini for Clinical Support
- **Communication**: Google Calendar + Google Meet
- **Compliance**: PDPA + FHIR Standards

**Key Success Factors:**
1. ✅ ใช้งานง่ายสำหรับผู้ป่วยทั่วไป
2. ✅ ลดภาระงานเอกสารของแพทย์ 50%
3. ✅ ปลอดภัยตามกฎหมายไทย
4. ✅ Scalable ไปยัง 1 ล้านผู้ใช้
5. ✅ Cost-effective โดยใช้ Cloud Native

**Next Steps:**
1. ประชุมทีมและยืนยัน Scope
2. Setup GCP Project และ OAuth
3. เริ่ม Development Phase 1
4. Target Go-Live: 6-8 เดือน

---

**Document Version**: 1.0  
**Created**: November 27, 2025  
**Language**: Thai (ภาษาไทย)  
**Status**: ✅ Ready for Review  

---