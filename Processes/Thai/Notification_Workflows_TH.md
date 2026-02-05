# ขั้นตอนการแจ้งเตือน / Notification Workflows

**เวอร์ชัน:** 3.0.0  
**อัปเดตล่าสุด:** 21 มกราคม 2569  
**สถานะ:** ✅ PostgreSQL ใช้งานเสร็จสมบูรณ์

---

## 1. ภาพรวมระบบแจ้งเตือน

### 1.1 ช่องทางการแจ้งเตือน

| ช่องทาง | ชื่อไทย | คำอธิบาย |
| --------- | ------ | ------------- |
| In-App | แจ้งเตือนในแอป | การแจ้งเตือนแบบ Real-time ภายในพอร์ทัล |
| Email | อีเมล | การแจ้งเตือนผ่านอีเมล Gmail API |
| Push | Push Notification | การแจ้งเตือน Browser/Mobile |
| SMS | SMS | การแจ้งเตือน SMS (ฟีเจอร์อนาคต) |

### 1.2 ประเภทการแจ้งเตือน

```text
📅 นัดหมาย (Appointments)
├── appointment_requested    - ผู้ป่วยขอนัดหมายใหม่
├── appointment_confirmed    - แพทย์ยืนยันนัดหมาย + ลิงก์ประชุม
├── appointment_declined     - แพทย์ปฏิเสธ กำลังหาแพทย์ท่านอื่น
├── appointment_cancelled    - นัดหมายถูกยกเลิก
├── appointment_assigned     - ผู้ดูแลมอบหมายนัดหมายให้แพทย์
├── appointment_rescheduled  - นัดหมายถูกเลื่อน
└── appointment_reminder     - แจ้งเตือนก่อนนัด 24 ชม./1 ชม.

📹 การประชุมออนไลน์ (Video Meeting)
├── meeting_link_ready       - ลิงก์ประชุมพร้อมใช้งาน
├── meeting_link_failed      - สร้างลิงก์ไม่สำเร็จ
├── meeting_started          - แพทย์เริ่มห้องประชุม
└── meeting_reminder         - แจ้งเตือน 15 นาทีก่อนประชุม

📄 เวชระเบียน (Medical Records)
├── emr_signed               - แพทย์ลงนามเวชระเบียนแล้ว
├── emr_ready_for_review     - เวชระเบียนพร้อมให้ตรวจสอบ
├── prescription_ready       - ใบสั่งยาพร้อม
└── lab_results_ready        - ผลแล็บพร้อมดู

🔔 ระบบ (System)
├── account_verified         - บัญชีได้รับการยืนยัน
├── password_reset           - รีเซ็ตรหัสผ่าน
└── system_maintenance       - แจ้งการบำรุงรักษาระบบ

👨‍⚕️ สำหรับแพทย์ (Doctor-specific)
├── doctor_approved          - การลงทะเบียนแพทย์ได้รับอนุมัติ
├── doctor_rejected          - การลงทะเบียนแพทย์ถูกปฏิเสธ
├── ai_document_ready        - เอกสาร AI พร้อมตรวจสอบ
└── cds_alert                - แจ้งเตือน Clinical Decision Support
```

---

## 2. โครงสร้างข้อมูลการแจ้งเตือน

### 2.1 ตาราง notifications

```sql
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    
    -- ข้อมูลการแจ้งเตือน
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_thai VARCHAR(255),
    message TEXT NOT NULL,
    message_thai TEXT,
    
    -- ข้อมูลเพิ่มเติม
    data JSONB DEFAULT '{}',
    link TEXT,
    icon VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- สถานะ
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- ช่องทาง
    channels TEXT[] DEFAULT ARRAY['in_app'],
    email_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Index สำหรับค้นหาเร็ว
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 2.2 Interface TypeScript

```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  
  // เนื้อหา
  title: string;
  titleThai?: string;
  message: string;
  messageThai?: string;
  
  // ข้อมูลเพิ่มเติม
  data?: {
    appointmentId?: string;
    patientId?: string;
    doctorId?: string;
    meetingLink?: string;
    emrId?: string;
  };
  link?: string;
  icon?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // สถานะ
  isRead: boolean;
  readAt?: string;
  
  // ช่องทาง
  channels: ('in_app' | 'email' | 'push' | 'sms')[];
  emailSent: boolean;
  pushSent: boolean;
  
  // Timestamps
  createdAt: string;
  expiresAt?: string;
}

type NotificationType = 
  | 'appointment_requested'
  | 'appointment_confirmed'
  | 'appointment_declined'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'meeting_link_ready'
  | 'meeting_started'
  | 'meeting_reminder'
  | 'emr_signed'
  | 'prescription_ready'
  | 'lab_results_ready'
  | 'doctor_approved'
  | 'doctor_rejected'
  | 'ai_document_ready'
  | 'cds_alert';
```

---

## 3. ขั้นตอนการแจ้งเตือนหลัก

### 3.1 การยืนยันนัดหมาย

```text
┌─────────────────────────────────────────────────────────────────┐
│                  การแจ้งเตือนยืนยันนัดหมาย                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [แพทย์คลิก "ยืนยัน" นัดหมาย]                                     │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ สร้าง Jitsi Meeting Link    │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ INSERT INTO notifications   │                                │
│  │ (user_id = patient_id,      │                                │
│  │  type = 'appointment_confirmed', │                           │
│  │  title = 'นัดหมายได้รับการยืนยัน', │                           │
│  │  data = {                   │                                │
│  │    appointmentId,           │                                │
│  │    meetingLink,             │                                │
│  │    doctorName               │                                │
│  │  })                         │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────────────────┐                    │
│  │ ส่งอีเมล:                                │                    │
│  │                                         │                    │
│  │ Subject: ✅ นัดหมายได้รับการยืนยัน       │                    │
│  │                                         │                    │
│  │ สวัสดีคุณ [ชื่อผู้ป่วย],                  │                    │
│  │                                         │                    │
│  │ นัดหมายของคุณได้รับการยืนยันจาก          │                    │
│  │ [ชื่อแพทย์] แล้ว                         │                    │
│  │                                         │                    │
│  │ 📅 วันที่: [วันที่]                       │                    │
│  │ 🕐 เวลา: [เวลา]                          │                    │
│  │ 👨‍⚕️ แพทย์: [ชื่อแพทย์]                   │                    │
│  │                                         │                    │
│  │ 🔗 ลิงก์เข้าประชุม:                       │                    │
│  │ [MEETING_LINK]                          │                    │
│  │                                         │                    │
│  │ [➕ เพิ่มในปฏิทิน] [📋 ดูนัดหมาย]          │                    │
│  └─────────────────────────────────────────┘                    │
│               ↓                                                  │
│  [UPDATE notifications SET email_sent = true]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 การแจ้งเตือนก่อนนัดหมาย

```text
┌─────────────────────────────────────────────────────────────────┐
│                  การแจ้งเตือนก่อนนัดหมาย                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Scheduler ตรวจสอบนัดหมายที่ใกล้ถึง]                              │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ SELECT * FROM appointments  │                                │
│  │ WHERE scheduled_date = TODAY │                               │
│  │ AND scheduled_time BETWEEN   │                               │
│  │     NOW() AND NOW() + 1 hour │                               │
│  │ AND status = 'confirmed'     │                               │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  [สำหรับแต่ละนัดหมาย]                                             │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ แจ้งเตือนผู้ป่วย:            │                                │
│  │ "นัดหมายของคุณจะเริ่มในอีก   │                                │
│  │  1 ชั่วโมง"                  │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ แจ้งเตือนแพทย์:             │                                │
│  │ "มีนัดหมายในอีก 1 ชั่วโมง    │                                │
│  │  กับ [ชื่อผู้ป่วย]"          │                                │
│  └─────────────────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 การแจ้งเตือนแพทย์เริ่มประชุม

```text
┌─────────────────────────────────────────────────────────────────┐
│                  การแจ้งเตือนแพทย์เริ่มประชุม                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [แพทย์คลิก "เริ่มประชุม"]                                        │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ เปิด Jitsi Room             │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ INSERT INTO notifications   │                                │
│  │ (user_id = patient_id,      │                                │
│  │  type = 'meeting_started',  │                                │
│  │  title = 'แพทย์เริ่มห้องประชุมแล้ว', │                         │
│  │  message = 'คลิกเพื่อเข้าร่วมประชุม', │                        │
│  │  link = meeting_link,       │                                │
│  │  priority = 'high')         │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  [แสดง Toast Notification บนหน้าจอผู้ป่วย]                        │
│               ↓                                                  │
│  ┌─────────────────────────────────────────┐                    │
│  │  🔔 แพทย์เริ่มห้องประชุมแล้ว              │                    │
│  │                                         │                    │
│  │  นพ.ทดสอบ ระบบ รอคุณอยู่                 │                    │
│  │                                         │                    │
│  │  [เข้าร่วมประชุม]                        │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 การแจ้งเตือน EMR พร้อม

```text
┌─────────────────────────────────────────────────────────────────┐
│                  การแจ้งเตือน EMR พร้อม                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [แพทย์ลงนาม EMR]                                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ UPDATE emr                  │                                │
│  │ SET signed_at = NOW(),      │                                │
│  │     signed_by = doctor_id,  │                                │
│  │     status = 'signed'       │                                │
│  │ WHERE id = ?                │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ INSERT INTO notifications   │                                │
│  │ (user_id = patient_id,      │                                │
│  │  type = 'emr_signed',       │                                │
│  │  title = 'สรุปการพบแพทย์พร้อมแล้ว', │                          │
│  │  link = '/health-records/[appointmentId]') │                 │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  [ส่งอีเมลพร้อมสรุปย่อ]                                           │
│               ↓                                                  │
│  ┌─────────────────────────────────────────┐                    │
│  │ Subject: 📋 สรุปการพบแพทย์ - [วันที่]     │                    │
│  │                                         │                    │
│  │ สวัสดีคุณ [ชื่อผู้ป่วย],                  │                    │
│  │                                         │                    │
│  │ สรุปการพบแพทย์ของคุณพร้อมดูแล้ว         │                    │
│  │                                         │                    │
│  │ 📅 วันที่พบแพทย์: [วันที่]                │                    │
│  │ 👨‍⚕️ แพทย์: [ชื่อแพทย์]                   │                    │
│  │                                         │                    │
│  │ คลิกที่นี่เพื่อดูรายละเอียด:             │                    │
│  │ [ดูสรุปการพบแพทย์]                       │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 การแจ้งเตือน AI รอตรวจสอบ (สำหรับแพทย์)

```text
┌─────────────────────────────────────────────────────────────────┐
│                การแจ้งเตือน AI รอตรวจสอบ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [AI สร้างเอกสารเสร็จหลังประชุม]                                  │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ INSERT INTO meeting_summaries │                              │
│  │ (validated = false)         │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  ┌─────────────────────────────┐                                │
│  │ INSERT INTO notifications   │                                │
│  │ (user_id = doctor_id,       │                                │
│  │  type = 'ai_document_ready',│                                │
│  │  title = 'เอกสาร AI พร้อมตรวจสอบ', │                           │
│  │  message = 'EMR Draft และคำแนะนำ │                            │
│  │            ผู้ป่วยพร้อมให้ตรวจสอบ', │                           │
│  │  link = '/ai-review/[meetingId]', │                          │
│  │  priority = 'high')         │                                │
│  └─────────────────────────────┘                                │
│               ↓                                                  │
│  [แสดง Badge บนเมนู "เอกสารรอตรวจสอบ"]                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. UI Components

### 4.1 พอร์ทัลผู้ป่วย

| Component | ตำแหน่ง | ชื่อภาษาไทย |
| ----------- | ---------- | ------------ |
| NotificationBell | MainLayout Header | 🔔 การแจ้งเตือน |
| NotificationDropdown | Header Dropdown | รายการแจ้งเตือน |
| NotificationPage | /notifications | ประวัติการแจ้งเตือน |
| ToastNotification | Global | แจ้งเตือนแบบ popup |

### 4.2 พอร์ทัลแพทย์

| Component | ตำแหน่ง | ชื่อภาษาไทย |
| ----------- | ---------- | ------------ |
| NotificationBell | ResponsiveLayout | 🔔 การแจ้งเตือน |
| AppointmentAlert | Dashboard | นัดหมายรอดำเนินการ |
| PatientRequestBadge | Queue | คำขอนัดหมายใหม่ |
| AIReviewBadge | Sidebar | เอกสารรอตรวจสอบ |

### 4.3 Toast Notification

```text
┌─────────────────────────────────────────┐
│  🔔 [ชื่อเรื่อง]                         │
│                                         │
│  [ข้อความ]                               │
│                                         │
│  [ปิด]              [ดูรายละเอียด]       │
└─────────────────────────────────────────┘
```

### 4.4 Notification Bell

```text
┌──────────────────────────────────────────────────────────────┐
│  🔔 การแจ้งเตือน                                    (5 ใหม่) │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🟢 นัดหมายได้รับการยืนยัน                    5 นาทีที่แล้ว │   │
│  │    นัดหมายวันที่ 21 ม.ค. เวลา 10:00 กับ นพ.ทดสอบ     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📋 สรุปการพบแพทย์พร้อมแล้ว                    2 ชม.ที่แล้ว │   │
│  │    คลิกเพื่อดูสรุปการพบแพทย์                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 💊 ใบสั่งยาพร้อม                              1 วันที่แล้ว │   │
│  │    มีใบสั่งยาใหม่จากการพบแพทย์ครั้งล่าสุด             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                          [ดูทั้งหมด] [อ่านทั้งหมดแล้ว]         │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. API Endpoints

### 5.1 Notification APIs

| Method | Endpoint | คำอธิบาย |
| ------ | -------- | -------- |
| GET | `/api/notifications` | ดูรายการแจ้งเตือน |
| GET | `/api/notifications/unread-count` | จำนวนที่ยังไม่อ่าน |
| PUT | `/api/notifications/:id/read` | อ่านแล้ว |
| PUT | `/api/notifications/read-all` | อ่านทั้งหมดแล้ว |
| DELETE | `/api/notifications/:id` | ลบการแจ้งเตือน |
| GET | `/api/notifications/settings` | ดูการตั้งค่า |
| PUT | `/api/notifications/settings` | อัปเดตการตั้งค่า |

### 5.2 การตั้งค่าการแจ้งเตือน

```typescript
interface NotificationSettings {
  email: {
    enabled: boolean;
    appointmentConfirmed: boolean;
    appointmentReminder: boolean;
    emrReady: boolean;
    prescriptionReady: boolean;
  };
  push: {
    enabled: boolean;
    meetingStarted: boolean;
    appointmentReminder: boolean;
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
  };
}
```

---

## 6. Email Templates

### 6.1 การยืนยันนัดหมาย

```text
Subject: ✅ นัดหมายได้รับการยืนยัน - [วันที่]

สวัสดีคุณ [ชื่อผู้ป่วย],

นัดหมายของคุณได้รับการยืนยันจาก [ชื่อแพทย์] แล้ว

📅 วันที่: [วันที่]
🕐 เวลา: [เวลา]
👨‍⚕️ แพทย์: [ชื่อแพทย์]
📍 รูปแบบ: [ออนไลน์/ที่โรงพยาบาล]

🔗 ลิงก์เข้าประชุม (สำหรับนัดหมายออนไลน์):
[MEETING_LINK]

💡 หมายเหตุ: 
- คุณสามารถเข้าร่วมได้ 15 นาทีก่อนเวลานัด
- กรุณารอให้แพทย์เริ่มห้องประชุมก่อน

[➕ เพิ่มในปฏิทิน] [📋 ดูนัดหมาย]

---
ทีมงาน Izara Telemedicine
```

### 6.2 แพทย์เริ่มประชุม

```text
Subject: 📹 แพทย์รอคุณในห้องประชุมแล้ว

สวัสดีคุณ [ชื่อผู้ป่วย],

[ชื่อแพทย์] เริ่มห้องประชุมแล้ว กรุณาคลิกลิงก์ด้านล่างเพื่อเข้าร่วม

🔗 เข้าร่วมประชุม:
[MEETING_LINK]

💡 หมายเหตุ: 
- ตรวจสอบให้แน่ใจว่ากล้องและไมโครโฟนทำงานปกติ
- คุณจะเข้าสู่ห้องรอก่อน แพทย์จะอนุมัติให้เข้าร่วม

[เข้าร่วมประชุม]

---
ทีมงาน Izara Telemedicine
```

### 6.3 สรุปการพบแพทย์พร้อม

```text
Subject: 📋 สรุปการพบแพทย์ - [วันที่]

สวัสดีคุณ [ชื่อผู้ป่วย],

สรุปการพบแพทย์ของคุณพร้อมดูแล้ว

📅 วันที่พบแพทย์: [วันที่]
👨‍⚕️ แพทย์: [ชื่อแพทย์]

สรุปสั้นๆ:
-----------------
🩺 การวินิจฉัย: [การวินิจฉัย]
💊 ยาที่ได้รับ: [รายการยา]
📅 นัดครั้งหน้า: [วันที่นัดหมาย]

คลิกที่นี่เพื่อดูรายละเอียดทั้งหมด:
[ดูสรุปการพบแพทย์]

หากมีคำถามหรือข้อสงสัย กรุณาติดต่อเราได้ตลอดเวลา

---
ทีมงาน Izara Telemedicine
```

---

## 7. การจัดการ Real-time Notifications

### 7.1 WebSocket Connection

```typescript
// เชื่อมต่อ WebSocket
const socket = io('wss://api.izara.com/notifications', {
  auth: { token: sessionToken }
});

// รับการแจ้งเตือนใหม่
socket.on('notification', (notification) => {
  // แสดง Toast
  showToast(notification);
  
  // อัปเดต Badge
  updateNotificationCount();
  
  // เล่นเสียง (ถ้าเปิดใช้งาน)
  if (settings.inApp.sound) {
    playNotificationSound();
  }
});
```

### 7.2 การแสดง Toast

```typescript
function showToast(notification: Notification) {
  toast({
    title: notification.titleThai || notification.title,
    description: notification.messageThai || notification.message,
    action: notification.link ? (
      <Button onClick={() => navigate(notification.link)}>
        ดูรายละเอียด
      </Button>
    ) : undefined,
    duration: notification.priority === 'urgent' ? 0 : 5000
  });
}
```

---

## สรุป

| ฟีเจอร์ | สถานะ | คำอธิบาย |
| ------ | ----- | -------- |
| In-App Notifications | ✅ | การแจ้งเตือนภายในพอร์ทัล |
| Email Notifications | ✅ | ส่งอีเมลอัตโนมัติ |
| Real-time Updates | ✅ | WebSocket |
| Toast Notifications | ✅ | แจ้งเตือนแบบ popup |
| Notification Settings | ✅ | ผู้ใช้ปรับแต่งได้ |

---

เอกสารนี้สะท้อนการใช้งานปัจจุบันของ Izara Telemedicine (Phase 1 เสร็จสมบูรณ์)
