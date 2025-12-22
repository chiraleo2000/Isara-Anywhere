# 16. Detailed Flowcharts & Process Diagrams

**Version:** 1.0.0  
**Last Updated:** December 10, 2025

## 16.1 System Overview Flowchart

```mermaid
flowchart TB
    subgraph USER_LAYER["👤 User Layer"]
        Patient[ผู้ป่วย / Patient]
        Browser[Web Browser / PWA]
    end
    
    subgraph FRONTEND["💻 Frontend Layer (React)"]
        direction TB
        Router[React Router]
        AuthCtx[Auth Context]
        Pages[Page Components]
        UIComp[UI Components]
    end
    
    subgraph BACKEND["⚙️ Backend Layer (Express)"]
        direction TB
        Express[Express Server :3004]
        AuthMW[Auth Middleware]
        Routes[API Routes]
    end
    
    subgraph SERVICES["☁️ External Services"]
        direction TB
        GCS[(Google Cloud Storage)]
        Gemini[Gemini AI]
        GMaps[Google Maps]
        GCal[Google Calendar]
        GMeet[Google Meet]
    end
    
    Patient --> Browser
    Browser --> Router
    Router --> AuthCtx
    AuthCtx --> Pages
    Pages --> UIComp
    
    Pages -->|HTTP/REST| Express
    Express --> AuthMW
    AuthMW --> Routes
    
    Routes --> GCS
    Routes --> Gemini
    Routes --> GMaps
    Routes --> GCal
    Routes --> GMeet
```

---

## 16.2 Complete User Journey Flowchart

```mermaid
flowchart TD
    START([เริ่มต้น]) --> CHECK{มีบัญชีผู้ใช้?}
    
    CHECK -->|ไม่มี| REGISTER[ลงทะเบียน]
    CHECK -->|มีแล้ว| LOGIN[เข้าสู่ระบบ]
    
    REGISTER --> PDPA_ACCEPT{ยอมรับ PDPA?}
    PDPA_ACCEPT -->|ไม่| CANNOT[ไม่สามารถใช้งานได้]
    PDPA_ACCEPT -->|ยอมรับ| LOGIN
    
    LOGIN --> AUTH{ตรวจสอบข้อมูล}
    AUTH -->|ไม่ถูกต้อง| LOGIN
    AUTH -->|ถูกต้อง| DASHBOARD[หน้า Dashboard]
    
    DASHBOARD --> FEATURE{เลือกฟีเจอร์}
    
    FEATURE -->|สุขภาพ| HEALTH[Health Studio]
    FEATURE -->|นัดหมาย| APPT[Appointments]
    FEATURE -->|PHR| PHR[Health Records]
    FEATURE -->|แผนที่| MAP[Map]
    FEATURE -->|PDPA| PDPA_MGT[PDPA Management]
    FEATURE -->|AI| AI[AI Health Chat]
    
    HEALTH --> HEALTH_SUB{เลือก Tab}
    HEALTH_SUB -->|ภาพรวม| OVERVIEW[Vital Signs & Stats]
    HEALTH_SUB -->|ผลการรักษา| RESULTS[Treatment Results]
    HEALTH_SUB -->|เนื้อหา| CONTENT[Medical Content]
    
    APPT --> APPT_SUB{เลือกการทำงาน}
    APPT_SUB -->|จองใหม่| BOOK[Book Appointment]
    APPT_SUB -->|ดูรายการ| LIST[View Appointments]
    APPT_SUB -->|Telehealth| VIDEO[Video Consultation]
    
    BOOK --> SELECT_DOCTOR[เลือกแพทย์]
    SELECT_DOCTOR --> SELECT_TIME[เลือกเวลา]
    SELECT_TIME --> CONFIRM[ยืนยันการจอง]
    CONFIRM --> APPT_CREATED[นัดหมายสำเร็จ]
    
    VIDEO --> JOIN_MEET[เข้าร่วม Google Meet]
    JOIN_MEET --> CONSULTATION[ปรึกษาแพทย์]
    CONSULTATION --> RECEIVE_RESULT[รับผลการรักษา]
    
    PDPA_MGT --> PDPA_SUB{เลือกการจัดการ}
    PDPA_SUB -->|ความยินยอม| CONSENT_LIST[รายการความยินยอม]
    PDPA_SUB -->|Living Will| LIVING_WILL[หนังสือแสดงเจตนา]
    
    LIVING_WILL --> LW_ACTION{เลือกการทำงาน}
    LW_ACTION -->|สร้าง/แก้ไข| LW_EDIT[แก้ไขเอกสาร]
    LW_ACTION -->|ดูประวัติ| LW_HISTORY[ดูเวอร์ชันเก่า]
    LW_ACTION -->|ย้อนกลับ| LW_ROLLBACK[Rollback เวอร์ชัน]
    
    AI --> CHAT[พิมพ์คำถามสุขภาพ]
    CHAT --> AI_RESPONSE[รับคำตอบจาก AI]
    AI_RESPONSE -->|ต้องการถามต่อ| CHAT
    AI_RESPONSE -->|จบการสนทนา| DASHBOARD
    
    OVERVIEW --> DASHBOARD
    RESULTS --> DASHBOARD
    CONTENT --> DASHBOARD
    LIST --> DASHBOARD
    APPT_CREATED --> DASHBOARD
    RECEIVE_RESULT --> DASHBOARD
    CONSENT_LIST --> DASHBOARD
    LW_EDIT --> DASHBOARD
    LW_HISTORY --> DASHBOARD
    LW_ROLLBACK --> DASHBOARD
    MAP --> DASHBOARD
    PHR --> DASHBOARD
```

---

## 16.3 Authentication Process Detail

```mermaid
flowchart TD
    subgraph LOGIN_FLOW["🔐 Login Process"]
        L1[ผู้ใช้กรอก Email & Password]
        L2[Frontend Validation]
        L3{ข้อมูลครบถ้วน?}
        L4[ส่ง POST /api/auth/login]
        L5[Backend รับ Request]
        L6[ค้นหา User ใน GCS]
        L7{พบ User?}
        L8[เปรียบเทียบ Password]
        L9{Password ถูกต้อง?}
        L10[สร้าง Session Token]
        L11[บันทึก Session ใน GCS]
        L12[ส่ง Token กลับ]
        L13[Frontend เก็บ Token]
        L14[Redirect to Dashboard]
        L_ERR1[แสดง Error: กรอกข้อมูลไม่ครบ]
        L_ERR2[แสดง Error: ไม่พบผู้ใช้]
        L_ERR3[แสดง Error: รหัสผ่านไม่ถูกต้อง]
    end
    
    L1 --> L2
    L2 --> L3
    L3 -->|ไม่| L_ERR1
    L3 -->|ใช่| L4
    L4 --> L5
    L5 --> L6
    L6 --> L7
    L7 -->|ไม่| L_ERR2
    L7 -->|ใช่| L8
    L8 --> L9
    L9 -->|ไม่| L_ERR3
    L9 -->|ใช่| L10
    L10 --> L11
    L11 --> L12
    L12 --> L13
    L13 --> L14
    
    L_ERR1 --> L1
    L_ERR2 --> L1
    L_ERR3 --> L1
```

---

## 16.4 Appointment Booking Complete Flow

```mermaid
flowchart TD
    subgraph BOOKING["📅 Appointment Booking Process"]
        B1[เลือกประเภทนัดหมาย]
        B2{ประเภท?}
        B3[Telehealth / Online]
        B4[In-Person / พบแพทย์]
        B5[Home Visit / เยี่ยมบ้าน]
        
        B6[เลือกสาขาการแพทย์]
        B7[แสดงรายชื่อแพทย์]
        B8[ผู้ใช้เลือกแพทย์]
        
        B9[ดึง Calendar Availability]
        B10[แสดง Available Slots]
        B11[ผู้ใช้เลือกวันเวลา]
        
        B12[กรอกอาการ/เหตุผล]
        B13[ยืนยันการจอง]
        
        B14[Backend สร้าง Appointment]
        B15{เป็น Telehealth?}
        B16[สร้าง Google Meet Link]
        B17[สร้าง Calendar Event]
        B18[บันทึกลง GCS]
        
        B19[ส่ง Confirmation]
        B20[แสดงรายละเอียดนัดหมาย]
    end
    
    B1 --> B2
    B2 -->|Online| B3
    B2 -->|At Hospital| B4
    B2 -->|Home| B5
    
    B3 --> B6
    B4 --> B6
    B5 --> B6
    
    B6 --> B7
    B7 --> B8
    B8 --> B9
    B9 --> B10
    B10 --> B11
    B11 --> B12
    B12 --> B13
    
    B13 --> B14
    B14 --> B15
    B15 -->|ใช่| B16
    B16 --> B17
    B15 -->|ไม่| B17
    B17 --> B18
    B18 --> B19
    B19 --> B20
```

---

## 16.5 PHR Data Management Flow

```mermaid
flowchart TD
    subgraph PHR_FLOW["📋 PHR Management"]
        direction TB
        
        P1[เข้าหน้า PHR]
        P2[ดึงข้อมูล PHR จาก GCS]
        P3[แสดงข้อมูลปัจจุบัน]
        
        P4{เลือก Section?}
        
        P5[Personal Info]
        P6[Medical History]
        P7[Vital Signs]
        P8[Medications]
        P9[Allergies]
        P10[Lab Results]
        P11[Documents]
        
        P12[แก้ไขข้อมูล]
        P13[Validate ข้อมูล]
        P14{ข้อมูลถูกต้อง?}
        P15[ส่ง Update API]
        P16[Merge กับข้อมูลเดิม]
        P17[บันทึกลง GCS]
        P18[แสดง Success]
        P19[แสดง Error]
    end
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    
    P4 -->|ข้อมูลส่วนตัว| P5
    P4 -->|ประวัติการรักษา| P6
    P4 -->|สัญญาณชีพ| P7
    P4 -->|ยาที่ใช้| P8
    P4 -->|อาการแพ้| P9
    P4 -->|ผลแล็บ| P10
    P4 -->|เอกสาร| P11
    
    P5 --> P12
    P6 --> P12
    P7 --> P12
    P8 --> P12
    P9 --> P12
    P10 --> P12
    P11 --> P12
    
    P12 --> P13
    P13 --> P14
    P14 -->|ไม่| P19
    P14 -->|ใช่| P15
    P15 --> P16
    P16 --> P17
    P17 --> P18
    P19 --> P12
    P18 --> P3
```

---

## 16.6 Vital Signs Recording Flow

```mermaid
flowchart TD
    subgraph VITALS["💓 Vital Signs Recording"]
        V1[เปิด Vitals Input Form]
        V2[กรอกค่า Vital Signs]
        
        V3[Blood Pressure<br>ความดันโลหิต]
        V4[Heart Rate<br>อัตราการเต้นหัวใจ]
        V5[Temperature<br>อุณหภูมิ]
        V6[Weight<br>น้ำหนัก]
        V7[Blood Sugar<br>น้ำตาลในเลือด]
        V8[SpO2<br>ออกซิเจนในเลือด]
        
        V9{ค่าอยู่ในช่วงปกติ?}
        V10[แสดง Warning]
        V11[บันทึกข้อมูล]
        V12[คำนวณ BMI]
        V13[อัพเดท Vital History]
        V14[อัพเดท Chart]
        V15[แสดง Trend Analysis]
    end
    
    V1 --> V2
    V2 --> V3
    V2 --> V4
    V2 --> V5
    V2 --> V6
    V2 --> V7
    V2 --> V8
    
    V3 --> V9
    V4 --> V9
    V5 --> V9
    V6 --> V9
    V7 --> V9
    V8 --> V9
    
    V9 -->|ไม่ปกติ| V10
    V10 --> V11
    V9 -->|ปกติ| V11
    V11 --> V12
    V12 --> V13
    V13 --> V14
    V14 --> V15
```

---

## 16.7 Treatment Results Filtering Flow

```mermaid
flowchart TD
    subgraph FILTER["🔍 Treatment Results Filter"]
        F1[โหลด Appointments ทั้งหมด]
        F2[Filter เฉพาะ Completed]
        F3[แสดง Filter Options]
        
        F4{เลือก Filter?}
        F5[5 รายการล่าสุด]
        F6[6 เดือนล่าสุด]
        F7[1 ปีล่าสุด]
        F8[ทั้งหมด]
        
        F9[คำนวณ Date Range]
        F10[Filter by Date]
        F11[Sort by Date DESC]
        
        F12[คำนวณ Statistics]
        F13[จำนวนนัดหมาย]
        F14[แพทย์ที่พบบ่อย]
        F15[สาขาการรักษา]
        
        F16[แสดง Results Cards]
        F17[แสดง Summary Stats]
    end
    
    F1 --> F2
    F2 --> F3
    F3 --> F4
    
    F4 -->|last5| F5
    F4 -->|6months| F6
    F4 -->|1year| F7
    F4 -->|all| F8
    
    F5 --> F11
    F6 --> F9
    F7 --> F9
    F8 --> F11
    
    F9 --> F10
    F10 --> F11
    
    F11 --> F12
    F12 --> F13
    F12 --> F14
    F12 --> F15
    
    F13 --> F16
    F14 --> F16
    F15 --> F16
    F16 --> F17
```

---

## 16.8 Living Will Version Management

```mermaid
flowchart TD
    subgraph LIVING_WILL["📝 Living Will Versioning"]
        LW1[เปิดหน้า Living Will]
        LW2[ดึงข้อมูลปัจจุบัน]
        LW3{มีข้อมูลเดิม?}
        
        LW4[แสดง Form ว่าง]
        LW5[แสดงข้อมูลเดิม + Version Badge]
        
        LW6[ผู้ใช้แก้ไขข้อมูล]
        LW7[เพิ่ม Digital Signature]
        LW8[กด Save]
        
        LW9[สร้าง Version ID ใหม่]
        LW10[สำรองเวอร์ชันเก่า]
        LW11[บันทึกเวอร์ชันใหม่]
        LW12[อัพเดท Current Version]
        
        LW13[แสดง Success + New Version]
        
        LW14[ดูประวัติเวอร์ชัน]
        LW15[ดึงรายการ Versions]
        LW16[แสดง Version Timeline]
        
        LW17[เลือก Rollback]
        LW18[ยืนยัน Rollback]
        LW19[สำรองเวอร์ชันปัจจุบัน]
        LW20[Restore เวอร์ชันที่เลือก]
        LW21[แสดง Restored Data]
    end
    
    LW1 --> LW2
    LW2 --> LW3
    LW3 -->|ไม่มี| LW4
    LW3 -->|มี| LW5
    
    LW4 --> LW6
    LW5 --> LW6
    
    LW6 --> LW7
    LW7 --> LW8
    LW8 --> LW9
    LW9 --> LW10
    LW10 --> LW11
    LW11 --> LW12
    LW12 --> LW13
    
    LW5 --> LW14
    LW14 --> LW15
    LW15 --> LW16
    
    LW16 --> LW17
    LW17 --> LW18
    LW18 --> LW19
    LW19 --> LW20
    LW20 --> LW21
```

---

## 16.9 AI Health Chat Process

```mermaid
flowchart TD
    subgraph AI_CHAT["🤖 AI Health Chat Process"]
        A1[ผู้ใช้พิมพ์คำถาม]
        A2{ประเภทคำถาม?}
        
        A3[คำถามทั่วไป]
        A4[คำถามเกี่ยวกับอาการ]
        A5[คำถามเกี่ยวกับยา]
        A6[ขอคำแนะนำสุขภาพ]
        
        A7[สร้าง AI Context]
        A8[ดึง User PHR Data]
        A9[รวม Medical Context]
        
        A10[ส่งไป Gemini API]
        A11[รับ Response]
        
        A12{Response ปลอดภัย?}
        A13[Filter Content]
        A14[เพิ่ม Disclaimer]
        
        A15[แสดงคำตอบ]
        A16{ต้องพบแพทย์?}
        A17[แสดง Warning + Book Button]
        A18[แสดง Self-care Tips]
        
        A19[บันทึก Chat History]
    end
    
    A1 --> A2
    A2 -->|ทั่วไป| A3
    A2 -->|อาการ| A4
    A2 -->|ยา| A5
    A2 -->|คำแนะนำ| A6
    
    A3 --> A7
    A4 --> A7
    A5 --> A7
    A6 --> A7
    
    A7 --> A8
    A8 --> A9
    A9 --> A10
    A10 --> A11
    A11 --> A12
    
    A12 -->|ไม่ปลอดภัย| A13
    A13 --> A14
    A12 -->|ปลอดภัย| A14
    
    A14 --> A15
    A15 --> A16
    A16 -->|ใช่| A17
    A16 -->|ไม่| A18
    
    A17 --> A19
    A18 --> A19
```

---

## 16.10 PDPA Consent Management

```mermaid
flowchart TD
    subgraph PDPA["🔒 PDPA Consent Flow"]
        P1[เปิดหน้า PDPA]
        P2[ดึงรายการ Consents]
        P3[แสดง Consent Categories]
        
        P4{ประเภท Consent?}
        P5[Data Collection<br>เก็บข้อมูล]
        P6[Data Processing<br>ประมวลผล]
        P7[Data Sharing<br>แชร์ข้อมูล]
        P8[Marketing<br>การตลาด]
        
        P9[แสดงรายละเอียด]
        P10{ผู้ใช้ตัดสินใจ?}
        
        P11[Accept / ยินยอม]
        P12[Decline / ปฏิเสธ]
        P13[Withdraw / ถอนยินยอม]
        
        P14[อัพเดท Consent Status]
        P15[บันทึก Audit Log]
        P16[บันทึก Timestamp]
        
        P17[แสดง Updated Status]
        P18{ส่งผลต่อการใช้งาน?}
        P19[แสดง Feature Limitation]
        P20[ใช้งานได้ตามปกติ]
    end
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    
    P4 --> P5
    P4 --> P6
    P4 --> P7
    P4 --> P8
    
    P5 --> P9
    P6 --> P9
    P7 --> P9
    P8 --> P9
    
    P9 --> P10
    P10 -->|ยินยอม| P11
    P10 -->|ไม่ยินยอม| P12
    P10 -->|ถอน| P13
    
    P11 --> P14
    P12 --> P14
    P13 --> P14
    
    P14 --> P15
    P15 --> P16
    P16 --> P17
    
    P17 --> P18
    P18 -->|ใช่| P19
    P18 -->|ไม่| P20
```

---

## 16.11 Map & Location Services

```mermaid
flowchart TD
    subgraph MAP["📍 Map Services Flow"]
        M1[เปิดหน้า Map]
        M2[Request Geolocation]
        M3{Permission?}
        
        M4[Access Denied]
        M5[แสดง Request UI]
        M6[ใช้ Default Location]
        
        M7[Get High Accuracy Position]
        M8[แสดง User Marker]
        M9[Start Position Watch]
        
        M10{ค้นหาอะไร?}
        M11[โรงพยาบาล]
        M12[คลินิก]
        M13[ร้านขายยา]
        M14[ฉุกเฉิน]
        
        M15[ส่ง Places API Request]
        M16[รับ Search Results]
        M17[แสดง Markers บนแผนที่]
        
        M18[ผู้ใช้เลือกสถานที่]
        M19[แสดง Place Details]
        M20[คำนวณ Distance & Time]
        M21[แสดง Directions]
        
        M22[Open in Google Maps]
    end
    
    M1 --> M2
    M2 --> M3
    M3 -->|Denied| M4
    M4 --> M5
    M5 --> M2
    M3 -->|Timeout| M6
    
    M3 -->|Granted| M7
    M7 --> M8
    M8 --> M9
    
    M9 --> M10
    M10 --> M11
    M10 --> M12
    M10 --> M13
    M10 --> M14
    
    M11 --> M15
    M12 --> M15
    M13 --> M15
    M14 --> M15
    
    M15 --> M16
    M16 --> M17
    
    M17 --> M18
    M18 --> M19
    M19 --> M20
    M20 --> M21
    M21 --> M22
```

---

## 16.12 Telehealth Video Session

```mermaid
flowchart TD
    subgraph TELEHEALTH["🎥 Telehealth Session"]
        T1[เปิดหน้านัดหมาย]
        T2[ตรวจสอบเวลานัด]
        T3{ถึงเวลา?}
        
        T4[แสดง Waiting Message]
        T5[แสดง Join Button]
        
        T6[คลิก Join Meeting]
        T7[ตรวจสอบ Meet Link]
        T8{Link Valid?}
        
        T9[แสดง Error]
        T10[เปิด Google Meet]
        
        T11[ตรวจสอบ Camera/Mic]
        T12{พร้อมใช้งาน?}
        T13[แสดง Permission Guide]
        T14[เข้าร่วม Video Call]
        
        T15[รอแพทย์เข้าร่วม]
        T16[เริ่มการปรึกษา]
        T17[บันทึก Session Start]
        
        T18[สิ้นสุดการปรึกษา]
        T19[แพทย์บันทึกผล]
        T20[บันทึก Session End]
        
        T21[ผู้ป่วยดูผลการรักษา]
        T22[แสดงใน Treatment Results]
    end
    
    T1 --> T2
    T2 --> T3
    T3 -->|ยังไม่ถึง| T4
    T4 -->|รอ| T2
    T3 -->|ถึงแล้ว| T5
    
    T5 --> T6
    T6 --> T7
    T7 --> T8
    T8 -->|Invalid| T9
    T8 -->|Valid| T10
    
    T10 --> T11
    T11 --> T12
    T12 -->|ไม่พร้อม| T13
    T13 --> T11
    T12 -->|พร้อม| T14
    
    T14 --> T15
    T15 --> T16
    T16 --> T17
    
    T17 --> T18
    T18 --> T19
    T19 --> T20
    
    T20 --> T21
    T21 --> T22
```

---

## 16.13 Data Backup & Recovery Flow

```mermaid
flowchart TD
    subgraph BACKUP["💾 Data Backup & Recovery"]
        B1[Schedule Trigger]
        B2[List Source Buckets]
        
        B3[AUTH Bucket]
        B4[PATIENT Bucket]
        B5[APPOINTMENTS Bucket]
        
        B6[Create Date Folder]
        B7[Copy Files to Backup]
        B8[Verify Integrity]
        
        B9{Success?}
        B10[Log Success]
        B11[Log Error]
        B12[Alert Admin]
        
        B13[Cleanup Old Backups]
        B14[Keep Last 30 Days]
    end
    
    subgraph RECOVERY["🔄 Recovery Process"]
        R1[Admin Request Recovery]
        R2[Select Backup Date]
        R3[List Available Backups]
        
        R4[Preview Backup Content]
        R5[Confirm Recovery]
        
        R6{Recovery Type?}
        R7[Full Recovery]
        R8[Selective Recovery]
        
        R9[Stop Current Operations]
        R10[Restore from Backup]
        R11[Verify Restored Data]
        R12[Resume Operations]
    end
    
    B1 --> B2
    B2 --> B3
    B2 --> B4
    B2 --> B5
    
    B3 --> B6
    B4 --> B6
    B5 --> B6
    
    B6 --> B7
    B7 --> B8
    B8 --> B9
    
    B9 -->|Yes| B10
    B9 -->|No| B11
    B11 --> B12
    
    B10 --> B13
    B13 --> B14
    
    R1 --> R2
    R2 --> R3
    R3 --> R4
    R4 --> R5
    R5 --> R6
    
    R6 -->|Full| R7
    R6 -->|Selective| R8
    
    R7 --> R9
    R8 --> R9
    R9 --> R10
    R10 --> R11
    R11 --> R12
```

---

## 16.14 Error Handling Flow

```mermaid
flowchart TD
    subgraph ERROR["⚠️ Error Handling"]
        E1[Request เข้ามา]
        E2[Process Request]
        E3{เกิด Error?}
        
        E4[ดำเนินการต่อ]
        E5{ประเภท Error?}
        
        E6[Validation Error]
        E7[Authentication Error]
        E8[Authorization Error]
        E9[Not Found Error]
        E10[Server Error]
        E11[External API Error]
        
        E12[400 Bad Request]
        E13[401 Unauthorized]
        E14[403 Forbidden]
        E15[404 Not Found]
        E16[500 Internal Error]
        E17[503 Service Unavailable]
        
        E18[Log Error Details]
        E19[Send Error Response]
        E20[Show User-friendly Message]
        
        E21{Retry ได้?}
        E22[แสดง Retry Button]
        E23[แสดง Contact Support]
    end
    
    E1 --> E2
    E2 --> E3
    E3 -->|ไม่| E4
    E3 -->|ใช่| E5
    
    E5 -->|Validation| E6
    E5 -->|Auth| E7
    E5 -->|Authz| E8
    E5 -->|NotFound| E9
    E5 -->|Server| E10
    E5 -->|External| E11
    
    E6 --> E12
    E7 --> E13
    E8 --> E14
    E9 --> E15
    E10 --> E16
    E11 --> E17
    
    E12 --> E18
    E13 --> E18
    E14 --> E18
    E15 --> E18
    E16 --> E18
    E17 --> E18
    
    E18 --> E19
    E19 --> E20
    E20 --> E21
    
    E21 -->|ได้| E22
    E21 -->|ไม่ได้| E23
```

---

## 16.15 Complete System State Diagram

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> LoginPage: Open App
    LoginPage --> Authenticating: Submit Login
    Authenticating --> Authenticated: Success
    Authenticating --> LoginPage: Failed
    
    Unauthenticated --> RegisterPage: Click Register
    RegisterPage --> Registering: Submit
    Registering --> PDPAConsent: Success
    Registering --> RegisterPage: Failed
    PDPAConsent --> Authenticated: Accept
    PDPAConsent --> Unauthenticated: Decline
    
    Authenticated --> Dashboard: Default Route
    
    state Dashboard {
        [*] --> HealthStudio
        HealthStudio --> TreatmentResults
        TreatmentResults --> MedicalContent
        MedicalContent --> AIChat
        AIChat --> HealthStudio
    }
    
    Authenticated --> Appointments
    state Appointments {
        [*] --> AppointmentList
        AppointmentList --> BookNew
        BookNew --> SelectDoctor
        SelectDoctor --> SelectTime
        SelectTime --> Confirm
        Confirm --> AppointmentList
        AppointmentList --> ViewDetails
        ViewDetails --> JoinMeeting
    }
    
    Authenticated --> PHRPage
    state PHRPage {
        [*] --> Overview
        Overview --> EditSection
        EditSection --> Saving
        Saving --> Overview
    }
    
    Authenticated --> MapPage
    state MapPage {
        [*] --> LoadingLocation
        LoadingLocation --> MapReady
        MapReady --> Searching
        Searching --> ShowResults
        ShowResults --> ViewDetails
    }
    
    Authenticated --> PDPAManagement
    state PDPAManagement {
        [*] --> ConsentList
        ConsentList --> LivingWillEditor
        LivingWillEditor --> VersionHistory
        VersionHistory --> Rollback
    }
    
    Authenticated --> Settings
    Authenticated --> Profile
    
    Authenticated --> Unauthenticated: Logout
    
    [*] --> Authenticated: Valid Session
```

---

[← Previous: Glossary](./15-glossary.md) | [Back to README →](./README.md)
