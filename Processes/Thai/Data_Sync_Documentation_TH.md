# Izara Telemedicine - สถาปัตยกรรมข้อมูลและเอกสาร Sync

**เวอร์ชัน:** 3.1.0
**อัปเดตล่าสุด:** 26 มกราคม 2569
**สถานะ:** ✅ PostgreSQL ใช้งานเสร็จสมบูรณ์ + Meeting Server

---


## 📋 ภาพรวม

Izara Telemedicine ใช้ PostgreSQL เป็นฐานข้อมูลหลัก ติดตั้งคู่กับพอร์ทัลแอปพลิเคชันใน Docker containers เอกสารนี้อธิบายโครงสร้างข้อมูล ตารางฐานข้อมูล และรูปแบบการไหลของข้อมูล

---


## 🗄️ การตั้งค่าฐานข้อมูล


### บริการ Docker

| บริการ | ชื่อ Container | พอร์ต | วัตถุประสงค์ |
| --------- | ---------------- | ------ | --------- |
| PostgreSQL | izara-postgres | 5433 (ภายนอก) / 5432 (ภายใน) | ฐานข้อมูลหลัก |
| พอร์ทัลผู้ป่วย | izara-patient-portal | 3005 | Frontend + Backend ผู้ป่วย |
| พอร์ทัลแพทย์ | izara-doctor-portal | 3010 | Frontend + Backend แพทย์ |
| Meeting Server | izara-meeting-server | 3020 | Jitsi transcription + AI summary |
| pgAdmin | izara-pgadmin | 5050 | จัดการฐานข้อมูล |



### รายละเอียดการเชื่อมต่อ

```text
Host: localhost (Local Docker) / postgres (Docker network)
Port: 5433 (ภายนอก) / 5432 (ภายใน)
User: postgres
Password: YOUR_TEST_PASSWORD
Database: izara_phase1
```


### Extension ฐานข้อมูล


- **pgvector** - สำหรับเก็บ AI embedding และค้นหาความคล้ายคลึง

---


## 📊 สถาปัตยกรรมข้อมูล

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ฐานข้อมูล POSTGRESQL: izara_phase1                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ตารางหลัก                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  users            │ บัญชีผู้ใช้ทั้งหมด (ผู้ป่วย, แพทย์, ผู้ดูแล)       │   │
│  │  doctor_profiles  │ ข้อมูลโปรไฟล์เฉพาะแพทย์                         │   │
│  │  patient_profiles │ ข้อมูลโปรไฟล์เฉพาะผู้ป่วย                        │   │
│  │  sessions         │ Session การยืนยันตัวตน                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       ตารางทางคลินิก                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  appointments     │ ตารางนัดหมาย                                    │   │
│  │  emr              │ Electronic Medical Records (รูปแบบ SOAP)        │   │
│  │  phr              │ Personal Health Records                         │   │
│  │  vital_signs      │ การวัดสัญญาณชีพผู้ป่วย                            │   │
│  │  prescriptions    │ ใบสั่งยา                                        │   │
│  │  lab_orders       │ คำสั่งตรวจแล็บ                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       ตารางเนื้อหา                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  medical_content     │ บทความสุขภาพสำหรับผู้ป่วย                       │   │
│  │  clinical_resources  │ แนวทางทางคลินิกสำหรับแพทย์                       │   │
│  │  consultants         │ ไดเรกทอรีแพทย์ผู้เชี่ยวชาญ                       │   │
│  │  notifications       │ การแจ้งเตือนผู้ใช้                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ตาราง AI/CDS (Phase 1)                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  knowledge_base       │ รายการ RAG พร้อม embeddings                   │   │
│  │  ai_chat_history      │ บันทึกการสนทนา AI ของแพทย์                     │   │
│  │  ai_document_analysis │ ผลวิเคราะห์ PDF/Lab                           │   │
│  │  cds_logs             │ บันทึกตรวจสอบ Clinical Decision Support       │   │
│  │  patient_instructions │ เอกสารคำแนะนำผู้ป่วยที่สร้างอัตโนมัติ             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      ตาราง Meeting (Phase 1)                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  meeting_sessions     │ Metadata การประชุม Jitsi                      │   │
│  │  meeting_transcripts  │ ข้อความถอดเสียง                               │   │
│  │  meeting_summaries    │ สรุปที่สร้างโดย AI                             │   │
│  │  guest_invites        │ Token เชิญแขก                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---


## 📋 โครงสร้างตาราง


### 1. ตาราง users

```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('doctor', 'admin', 'patient')),
    name VARCHAR(255) NOT NULL,
    name_thai VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    national_id VARCHAR(20),

    -- ฟิลด์เฉพาะแพทย์
    doctor_id VARCHAR(50),
    medical_license_number VARCHAR(50),
    specialty VARCHAR(100),
    hospital_name VARCHAR(255),

    -- ฟิลด์เฉพาะผู้ป่วย
    patient_id VARCHAR(50),

    -- สถานะ
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approval_status VARCHAR(20) DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
```


### 2. ตาราง appointments

```sql
CREATE TABLE appointments (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),

    -- ข้อมูลนัดหมาย
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    appointment_type VARCHAR(50) NOT NULL,

    -- สถานะ
    status VARCHAR(20) DEFAULT 'pending',
    chief_complaint TEXT,
    notes TEXT,

    -- ข้อมูลประชุม
    meeting_link TEXT,
    meeting_room_id VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```


### 3. ตาราง emr

```sql
CREATE TABLE emr (
    id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    patient_id VARCHAR(50) REFERENCES users(id),
    doctor_id VARCHAR(50) REFERENCES users(id),

    -- รูปแบบ SOAP
    subjective TEXT,      -- S: อาการสำคัญ, ประวัติปัจจุบัน
    objective TEXT,       -- O: การตรวจร่างกาย, สัญญาณชีพ
    assessment TEXT,      -- A: การวินิจฉัย
    plan TEXT,            -- P: แผนการรักษา

    -- สรุป AI
    ai_summary TEXT,
    ai_validated BOOLEAN DEFAULT false,
    validated_by VARCHAR(50),
    validated_at TIMESTAMP WITH TIME ZONE,

    -- สถานะ
    status VARCHAR(20) DEFAULT 'draft',
    signed_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```


### 4. ตาราง meeting_transcripts

```sql
CREATE TABLE meeting_transcripts (
    id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) REFERENCES appointments(id),
    meeting_room_id VARCHAR(100),

    -- เนื้อหา Transcript
    segment_number INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    speaker VARCHAR(100),
    text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'th',
    confidence DECIMAL(3,2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```


### 5. ตาราง knowledge_base (สำหรับ RAG)

```sql
CREATE TABLE knowledge_base (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    source VARCHAR(255),

    -- Vector embedding (pgvector)
    embedding vector(768),

    -- Metadata
    tags TEXT[],
    language VARCHAR(10) DEFAULT 'th',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index สำหรับค้นหาความคล้ายคลึง
CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
```

---


## 🔄 การไหลของข้อมูล


### 1. ขั้นตอนการลงทะเบียน

```text
┌─────────────────────────────────────────────────────────────┐
│                    การไหลข้อมูลลงทะเบียน                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [ผู้ใช้กรอกแบบฟอร์ม]                                         │
│           ↓                                                  │
│  [Backend ตรวจสอบข้อมูล]                                      │
│           ↓                                                  │
│  [เข้ารหัสรหัสผ่าน bcrypt]                                    │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ INSERT INTO users           │                            │
│  │ (id, email, password_hash,  │                            │
│  │  role, name, ...)           │                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [สร้าง patient_profiles หรือ doctor_profiles]               │
│           ↓                                                  │
│  [สร้าง Session Token]                                       │
│           ↓                                                  │
│  [ส่ง Response + Cookie]                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```


### 2. ขั้นตอนการนัดหมาย

```text
┌─────────────────────────────────────────────────────────────┐
│                    การไหลข้อมูลนัดหมาย                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [ผู้ป่วยสร้างนัดหมาย]                                        │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ INSERT INTO appointments    │                            │
│  │ status = 'pending'          │                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [แจ้งเตือนแพทย์/ผู้ดูแล]                                      │
│           ↓                                                  │
│  [แพทย์ยืนยัน]                                                │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ UPDATE appointments         │                            │
│  │ status = 'confirmed',       │                            │
│  │ meeting_link = 'jitsi://...'│                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [แจ้งเตือนผู้ป่วย + ส่งอีเมล]                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```


### 3. ขั้นตอนการประชุมและ AI

```text
┌─────────────────────────────────────────────────────────────┐
│                    การไหลข้อมูลประชุม + AI                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [เริ่มประชุม Jitsi]                                          │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ INSERT INTO meeting_sessions │                           │
│  │ room_id, start_time         │                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [Web Speech API ถอดเสียง Realtime]                          │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ INSERT INTO meeting_transcripts │                        │
│  │ (แต่ละ segment)              │                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [จบการประชุม]                                               │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ Meeting Server:             │                            │
│  │ 1. รวม transcripts          │                            │
│  │ 2. ส่งไป Gemini AI          │                            │
│  │ 3. สร้าง EMR Draft          │                            │
│  │ 4. สร้างคำแนะนำผู้ป่วย        │                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ INSERT INTO emr             │                            │
│  │ (ai_summary, status='draft')│                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [แพทย์ตรวจสอบ Man-in-the-Loop]                              │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ UPDATE emr                  │                            │
│  │ ai_validated = true,        │                            │
│  │ status = 'signed'           │                            │
│  └─────────────────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---


## 🔍 การค้นหา AI (RAG)


### ขั้นตอนการค้นหาความรู้

```text
┌─────────────────────────────────────────────────────────────┐
│                    การค้นหา RAG                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [แพทย์ถามคำถามใน AI Chat]                                    │
│           ↓                                                  │
│  [สร้าง Embedding จากคำถาม]                                   │
│           ↓                                                  │
│  ┌─────────────────────────────┐                            │
│  │ SELECT * FROM knowledge_base │                           │
│  │ ORDER BY embedding <=>       │  ← pgvector cosine search │
│  │   $query_embedding           │                            │
│  │ LIMIT 5                      │                            │
│  └─────────────────────────────┘                            │
│           ↓                                                  │
│  [รวมเอกสารที่เกี่ยวข้อง]                                      │
│           ↓                                                  │
│  [ส่งไป Gemini พร้อม Context]                                 │
│           ↓                                                  │
│  [แสดงคำตอบให้แพทย์]                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---


## 🛡️ ความปลอดภัยข้อมูล


### การเข้ารหัส

| ประเภทข้อมูล | วิธีการ |
| ----------- | ------- |
| รหัสผ่าน | bcrypt (10 rounds) |
| Session Token | Crypto random hex |
| การสื่อสาร | HTTPS/TLS |



### การควบคุมการเข้าถึง

| บทบาท | ข้อมูลที่เข้าถึงได้ |
| ----- | ----------------- |
| ผู้ป่วย | ข้อมูลของตนเองเท่านั้น |
| แพทย์ | ผู้ป่วยที่ได้รับมอบหมาย |
| ผู้ดูแลระบบ | ข้อมูลทั้งหมด |



### การบันทึกตรวจสอบ

```sql
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---


## 📁 การ Backup และ Recovery


### Backup อัตโนมัติ

```bash

# Backup รายวัน
pg_dump -h localhost -p 5433 -U postgres izara_phase1 > backup_$(date +%Y%m%d).sql


# Restore
psql -h localhost -p 5433 -U postgres izara_phase1 < backup_20260204.sql
```


### Docker Volume

```yaml
volumes:
  postgres_data:
    driver: local
```

---


## สรุป

| ส่วนประกอบ | เทคโนโลยี | วัตถุประสงค์ |
| --------- | --------- | ---------- |
| ฐานข้อมูลหลัก | PostgreSQL | เก็บข้อมูลทั้งหมด |
| Vector Search | pgvector | AI knowledge search |
| Session | PostgreSQL sessions | การยืนยันตัวตน |
| Backup | pg_dump | การสำรองข้อมูล |


---

เอกสารนี้สะท้อนการใช้งาน PostgreSQL ปัจจุบันของ Izara Telemedicine (Phase 1 เสร็จสมบูรณ์)
