# 📅 Mobile Appointment Workflows — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026  
**Compatible with:** Phase 1 web appointment system

---

## 1. Appointment System Overview

### 1.1 Mobile vs Web Comparison

| Feature | Web (Phase 1) | Mobile (Phase 2) |
| --------- | :-------------: | :----------------: |
| Browse Doctors | ✅ | ✅ |
| Filter by Specialty | ✅ | ✅ |
| View Time Slots | ✅ | ✅ |
| Book Appointment | ✅ | ✅ |
| Cancel Appointment | ✅ | ✅ |
| View History | ✅ | ✅ |
| Push Reminders | ❌ | ✅ NEW |
| Calendar Integration | ❌ | ✅ NEW |
| Payment Integration | ❌ | ✅ NEW |
| Location-based Doctor Search | ❌ | ✅ NEW |
| Walk-in Queue (In-clinic) | ✅ | ✅ Enhanced |

### 1.2 API Reuse

All mobile appointment flows use the **same backend APIs** as Phase 1:

- `GET /api/doctors/` — List doctors
- `GET /api/doctors/:doctorId/slots` — Available time slots
- `POST /api/appointments/` — Create appointment
- `GET /api/appointments/my` — Get my appointments
- `GET /api/appointments/history` — Past appointments
- `PUT /api/appointments/:id/status` — Cancel appointment

**New mobile-only additions:**

- `POST /api/mobile/payments/create-intent` — Payment before confirmation
- Calendar deep link — Add to device calendar

---

## 2. Patient: Book Appointment Flow

### 2.1 Complete Booking Workflow

```text
Home Tab → "นัดหมายแพทย์" Button
              │
              ▼
┌─────────────────────────────┐
│  Step 1: Symptom Input      │
│                             │
│  "อาการของคุณ"              │
│  ┌─────────────────────┐    │
│  │ พิมพ์อาการ...        │    │
│  │ 🎤 Voice Input       │    │
│  └─────────────────────┘    │
│                             │
│  🤖 AI Symptom Checker:     │
│  "จากอาการปวดหัว มึนงง     │
│   แนะนำพบแพทย์อายุรกรรม"   │
│                             │
│  Suggested: อายุรกรรม       │
│                             │
│  [ถัดไป →]                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Step 2: Select Doctor      │
│                             │
│  แผนก: อายุรกรรม ▾          │
│                             │
│  ┌──────────────────────┐   │
│  │ 🔍 ค้นหาแพทย์...     │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 👨‍⚕️ นพ.สมชาย รักษา   │   │
│  │ ⭐ 4.8 (120 reviews) │   │
│  │ อายุรกรรมทั่วไป      │   │
│  │ ✅ Available Today    │   │
│  │ [เลือก]              │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 👩‍⚕️ พญ.สมหญิง ดีใจ   │   │
│  │ ⭐ 4.9 (85 reviews)  │   │
│  │ อายุรกรรมทั่วไป      │   │
│  │ 📅 Next: Tomorrow    │   │
│  │ [เลือก]              │   │
│  └──────────────────────┘   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Step 3: Select Date & Time │
│                             │
│  ┌──────────────────────┐   │
│  │    กุมภาพันธ์ 2026    │   │
│  │ จ อ พ พ ศ ส อ       │   │
│  │  ..17 18 19 [20] 21.. │   │
│  └──────────────────────┘   │
│                             │
│  Available Slots:           │
│  [09:00] [09:30] [10:00]   │
│  [10:30] [14:00] [14:30]   │
│  [15:00] [15:30]           │
│                             │
│  Selected: 20 ก.พ. 14:00   │
│                             │
│  [ถัดไป →]                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Step 4: Confirmation &     │
│  Payment                    │
│                             │
│  📋 สรุปนัดหมาย             │
│  ─────────────────          │
│  👨‍⚕️ นพ.สมชาย รักษา        │
│  📅 20 ก.พ. 2026            │
│  ⏰ 14:00 - 14:30           │
│  🏥 วิดีโอคอล               │
│  📝 อาการ: ปวดหัว มึนงง    │
│                             │
│  💳 ค่าบริการ: ฿500          │
│  ─────────────────          │
│  Payment Method:            │
│  ○ 💳 Credit/Debit Card     │
│  ○ 📱 PromptPay             │
│  ○ 🏦 Mobile Banking        │
│                             │
│  ☑️ ยอมรับเงื่อนไขบริการ    │
│                             │
│  [ยืนยันนัดหมาย ฿500]       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Payment Processing         │
│                             │
│  POST /api/mobile/payments/ │
│  create-intent              │
│  → Stripe / PromptPay QR    │
│                             │
│  ⏳ กำลังดำเนินการ...       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Step 5: Success Screen     │
│                             │
│  ✅ นัดหมายสำเร็จ!           │
│                             │
│  รหัสนัดหมาย: APT-12345    │
│  สถานะ: รอแพทย์ยืนยัน      │
│                             │
│  [📅 เพิ่มในปฏิทิน]        │
│  [🏠 กลับหน้าหลัก]         │
│  [📋 ดูนัดหมายทั้งหมด]     │
│                             │
│  📌 คุณจะได้รับแจ้งเตือน    │
│  เมื่อแพทย์ยืนยันนัดหมาย   │
└─────────────────────────────┘
```

### 2.2 Calendar Integration

```typescript
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export async function addAppointmentToCalendar(appointment: Appointment): Promise<string | null> {
  // 1. Request calendar permission
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  // 2. Get default calendar
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];
  if (!defaultCalendar) return null;

  // 3. Create calendar event
  const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
    title: `📹 นัดหมาย ${appointment.doctor_name}`,
    startDate: new Date(appointment.date),
    endDate: new Date(new Date(appointment.date).getTime() + 30 * 60 * 1000),
    location: 'Izara Dr. Anywhere - วิดีโอคอล',
    notes: `อาการ: ${appointment.symptoms}\nรหัส: ${appointment.id}`,
    alarms: [
      { relativeOffset: -60 },    // 1 hour before
      { relativeOffset: -15 },    // 15 minutes before
    ],
    url: `izara-patient://appointments/${appointment.id}`,
  });

  return eventId;
}
```

---

## 3. Doctor: Manage Appointments Flow

### 3.1 Appointment Management Dashboard

```text
Doctor Appointments Tab
         │
         ▼
┌─────────────────────────────┐
│  📅 Today's Schedule        │
│                             │
│  ┌───────────────────────┐  │
│  │ [วันนี้] [พรุ่งนี้]    │  │
│  │ [สัปดาห์] [รอยืนยัน]  │  │
│  └───────────────────────┘  │
│                             │
│  ⏰ 09:00 สมหญิง แม็ค      │
│  ├─ อายุรกรรม | ปวดหัว     │
│  ├─ Status: ✅ ยืนยันแล้ว   │
│  └─ [📹 เริ่มประชุม]       │
│                             │
│  ⏰ 10:00 สมชาย ดีใจ       │
│  ├─ อายุรกรรม | ไข้หวัด    │
│  ├─ Status: ✅ ยืนยันแล้ว   │
│  └─ [📹 เริ่มประชุม]       │
│                             │
│  ⏰ 14:00 รักษ์ สุขใจ       │
│  ├─ อายุรกรรม | ปวดท้อง    │
│  ├─ Status: 🔴 รอยืนยัน    │
│  └─ [✅ ยืนยัน] [❌ ปฏิเสธ] │
│                             │
└─────────────────────────────┘
```

### 3.2 Confirm/Decline Flow

```text
Pending Appointment Card → [✅ ยืนยัน]
              │
              ▼
┌─────────────────────────────┐
│  ยืนยันนัดหมาย?             │
│                             │
│  คนไข้: รักษ์ สุขใจ          │
│  วันที่: 20 ก.พ. 14:00     │
│  อาการ: ปวดท้อง             │
│                             │
│  [ยืนยัน] [ยกเลิก]         │
└──────────┬──────────────────┘
           │ ยืนยัน
           ▼
    POST /api/appointments/:id/confirm
           │
           ▼
    Push notification to patient:
    "✅ นัดหมายได้รับการยืนยัน"
           │
           ▼
    Schedule reminders (24h, 1h)
```

---

## 4. Appointment Status State Machine

```text
┌──────────┐
│ PENDING  │ ──────── Patient books
└────┬─────┘
     │
     ├──── Doctor confirms ────► ┌───────────┐
     │                           │ CONFIRMED │
     │                           └─────┬─────┘
     │                                 │
     │                    ┌────────────┤
     │                    │            │
     │                    ▼            ▼
     │              ┌──────────┐ ┌───────────┐
     │              │ MEETING  │ │ CANCELLED │
     │              │ STARTED  │ │           │
     │              └────┬─────┘ └───────────┘
     │                   │
     │                   ▼
     │              ┌──────────┐
     │              │COMPLETED │
     │              └──────────┘
     │
     └──── Doctor declines ───► ┌───────────┐
                                │ DECLINED  │
                                └───────────┘
```

---

## 5. Appointment Pool System (Walk-in Queue)

### 5.1 Walk-in Patient Flow (Mobile)

```text
Patient at Clinic → Opens App → "Walk-in Queue"
              │
              ▼
┌─────────────────────────────┐
│  เข้าคิว Walk-in             │
│                             │
│  แผนก: [อายุรกรรม ▾]       │
│  อาการ: [พิมพ์อาการ...]    │
│                             │
│  Available Doctors:         │
│  👨‍⚕️ นพ.สมชาย (5 in queue)  │
│  👩‍⚕️ พญ.สมหญิง (3 in queue) │
│                             │
│  [เข้าคิว]                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Waiting Screen             │
│                             │
│  📍 คุณอยู่ลำดับที่ 4       │
│  ⏱️ เวลารอโดยประมาณ: ~20 นาที│
│                             │
│  ┌─────────────────────┐    │
│  │ ████████░░░░░░░░░░  │    │
│  │ 4/10 in queue       │    │
│  └─────────────────────┘    │
│                             │
│  Push notification when:    │
│  - You're #2 in queue       │
│  - Doctor calls you         │
│                             │
│  [ยกเลิกคิว]               │
└─────────────────────────────┘
```

### 5.2 Doctor Queue Management (Mobile)

```text
Queue Tab (Doctor App)
         │
         ▼
┌─────────────────────────────┐
│  📋 คิวคนไข้วันนี้          │
│                             │
│  คิวปัจจุบัน: 8 คน          │
│  กำลังตรวจ: สมหญิง แม็ค    │
│                             │
│  ┌───────────────────────┐  │
│  │ 1. ✅ สมชาย ดีใจ       │  │
│  │    ไข้หวัด | 09:15     │  │
│  │    [เสร็จแล้ว]         │  │
│  ├───────────────────────┤  │
│  │ 2. 🔵 สมหญิง แม็ค     │  │
│  │    ปวดหัว | 09:30      │  │
│  │    [กำลังตรวจ]         │  │
│  ├───────────────────────┤  │
│  │ 3. 🔴 รักษ์ สุขใจ      │  │
│  │    ปวดท้อง | 09:45     │  │
│  │    [เรียกคนไข้ ▶]      │  │
│  └───────────────────────┘  │
│                             │
│  [📞 เรียกคนไข้ถัดไป]      │
└─────────────────────────────┘
```

---

## 6. Appointment Reminders (Mobile)

### 6.1 Reminder Schedule

| Timing | Method | Message |
| -------- | -------- | --------- |
| 24 hours before | Push notification | "พรุ่งนี้มีนัดหมายกับ {doctor} เวลา {time}" |
| 1 hour before | Push notification | "อีก 1 ชั่วโมงจะถึงเวลานัดหมาย" |
| 15 minutes before | Push notification | "เตรียมตัว! อีก 15 นาทีจะถึงเวลานัดหมาย" |
| At appointment time | Push notification | "{doctor} พร้อมแล้ว กดเพื่อเข้าร่วมประชุม" |
| Meeting started | Push (critical) | "แพทย์เริ่มการประชุมแล้ว กดเพื่อเข้าร่วม" |

### 6.2 Reminder Management

```typescript
// Patient can customize reminders per appointment
interface AppointmentReminder {
  appointmentId: string;
  reminders: {
    time_24h: boolean;    // Default: ON
    time_1h: boolean;     // Default: ON
    time_15min: boolean;  // Default: ON
    custom?: number;      // Custom minutes before
  };
}
```

---

## 7. Cancellation & Rescheduling

### 7.1 Cancellation Policy

```text
Cancellation Rules:
├── > 24h before  → Full refund  → No penalty
├── 12-24h before → 50% refund   → Warning
├── 2-12h before  → No refund    → Strike 1
├── < 2h before   → No refund    → Strike 2
└── No-show       → No refund    → Strike 3 → Account review
```

### 7.2 Cancellation Flow

```text
Appointment Detail → [ยกเลิกนัดหมาย]
              │
              ▼
┌─────────────────────────────┐
│  ยกเลิกนัดหมาย?             │
│                             │
│  ⚠️ การยกเลิกล่วงหน้า      │
│  มากกว่า 24 ชั่วโมง:        │
│  คืนเงินเต็มจำนวน           │
│                             │
│  เหตุผลการยกเลิก:           │
│  ○ มีเหตุฉุกเฉิน           │
│  ○ ไม่สะดวกเวลานี้         │
│  ○ ต้องการเปลี่ยนแพทย์     │
│  ○ อาการดีขึ้นแล้ว         │
│  ○ อื่นๆ                   │
│                             │
│  [ยืนยันยกเลิก] [กลับ]     │
└──────────┬──────────────────┘
           │ ยืนยัน
           ▼
    PUT /api/appointments/:id/status
    { status: 'cancelled', reason: '...' }
           │
           ▼
    Push to doctor: "คนไข้ยกเลิกนัดหมาย"
    Process refund if applicable
```

---

## 8. Offline Appointment Viewing

```typescript
// Appointments are cached for offline viewing
const CACHE_CONFIG = {
  my_appointments: {
    table: 'cached_appointments',
    ttl: 24 * 60 * 60 * 1000,  // 24 hours
    refreshOn: ['app_foreground', 'push_received'],
  },
};

// When offline, show cached appointments with warning
function AppointmentsTab() {
  const { isConnected } = useNetInfo();
  const { data: appointments, isFromCache } = useCachedQuery(
    'appointments',
    () => patientApi.getMyAppointments(),
    { cacheKey: 'my_appointments' }
  );

  return (
    <View>
      {!isConnected && (
        <Banner variant="warning">
          📡 ออฟไลน์ — แสดงข้อมูลล่าสุดที่บันทึกไว้
        </Banner>
      )}
      <AppointmentList appointments={appointments} />
    </View>
  );
}
```

---

### End of Mobile Appointment Workflows — February 2026
