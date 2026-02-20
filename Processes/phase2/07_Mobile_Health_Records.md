# 🏥 Mobile Health Records Process — Izara Dr. Anywhere

**Version:** 2.0.0  
**Date:** February 2026

---

## 1. Health Records Overview

### 1.1 Mobile Health Data Architecture

```text
┌────────────────────────────────────────────┐
│           Patient Mobile App               │
│                                            │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ PHR      │ │ EMR      │ │ Wearable   │ │
│  │ (Patient │ │ (Doctor  │ │ Data       │ │
│  │  Managed)│ │  Created)│ │ (Auto-Sync)│ │
│  └────┬─────┘ └────┬─────┘ └────┬───────┘ │
│       │             │            │          │
│  ┌────▼─────────────▼────────────▼───────┐ │
│  │       Unified Health Timeline         │ │
│  │       (Chronological View)            │ │
│  └───────────────────────────────────────┘ │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │   Izara Server   │
         │                  │
         │  PostgreSQL +    │
         │  pgvector        │
         └──────────────────┘
```

### 1.2 Data Ownership Model

| Data Type | Owner | Who Can Edit? | Mobile Access |
| ----------- | ------- | --------------- | :-------------: |
| PHR Profile | Patient | Patient | ✅ Read/Write |
| Vital Signs | Patient | Patient + Wearable | ✅ Read/Write |
| Medications | Patient | Patient | ✅ Read/Write |
| Allergies | Patient | Patient | ✅ Read/Write |
| EMR Records | Doctor | Doctor only | ✅ Read only |
| Prescriptions | Doctor | Doctor only | ✅ Read only |
| Lab Results | Doctor/Lab | Doctor only | ✅ Read only |
| Living Will | Patient | Patient | ✅ Read/Write |
| Wearable Data | Device | Auto-sync | ✅ Read only (after sync) |

---

## 2. Patient PHR Management (Mobile)

### 2.1 Health Tab Navigation

```text
Health Tab (🏥)
     │
     ├── 📊 Overview Dashboard
     │   ├── Latest Vitals Summary
     │   ├── Medication Reminders
     │   ├── Upcoming Appointments
     │   └── AI Health Risk Score
     │
     ├── ❤️ Vital Signs
     │   ├── 💓 Heart Rate
     │   ├── 🩸 Blood Pressure
     │   ├── 🌡️ Temperature
     │   ├── 🫁 Blood Oxygen (SpO2)
     │   ├── ⚖️ Weight / BMI
     │   └── 🩸 Blood Glucose
     │
     ├── 💊 Medications
     │   ├── Current Medications
     │   ├── Add Medication
     │   └── Medication Reminders
     │
     ├── ⚠️ Allergies
     │   ├── Drug Allergies
     │   ├── Food Allergies
     │   └── Other Allergies
     │
     ├── 📋 Health Logs (EMR/Rx/Lab)
     │   ├── Visit History
     │   ├── Prescriptions
     │   ├── Lab Results
     │   └── Doctor Instructions
     │
     ├── 📱 Timeline
     │   └── Chronological all-in-one view
     │
     ├── 📄 Living Will
     │   ├── View/Create
     │   └── Emergency Contacts
     │
     └── ⌚ Connected Devices
         ├── Apple Watch / Health
         ├── Google Fit
         └── Samsung Health
```

### 2.2 Vital Signs Recording Flow

```text
Health → Vital Signs → Blood Pressure
              │
              ▼
┌─────────────────────────────┐
│  🩸 ความดันโลหิต             │
│                             │
│  ┌─────────────────────┐    │
│  │    📈 Chart (7 days) │    │
│  │    ┌─────────────┐   │    │
│  │    │ 130 ───╲──── │   │    │
│  │    │ 120 ─── ──── │   │    │
│  │    │  80 ────╲─── │   │    │
│  │    │  70 ─────── │   │    │
│  │    └─────────────┘   │    │
│  └─────────────────────┘    │
│                             │
│  Latest: 125/82 mmHg       │
│  Status: ⚠️ สูงเล็กน้อย    │
│                             │
│  History:                   │
│  📊 Today 08:00  125/82    │
│  📊 Yesterday    120/80    │
│  📊 2 days ago   130/85    │
│                             │
│  [+ บันทึกค่าใหม่]         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  บันทึกความดันโลหิต          │
│                             │
│  Systolic:  [125] mmHg     │
│  Diastolic: [ 82] mmHg     │
│  Pulse:     [ 72] bpm      │
│                             │
│  ⏰ Time: [Now ▾]           │
│  📝 Note: [หลังทานยา]      │
│                             │
│  Source:                    │
│  ○ วัดเอง                  │
│  ○ ⌚ Apple Watch           │
│  ○ 🩺 จากคลินิก            │
│                             │
│  [บันทึก]                   │
└──────────┬──────────────────┘
           │
           ▼
    POST /api/phr/:patientId/vitals
    { type: 'blood_pressure',
      value: { systolic: 125, diastolic: 82 },
      pulse: 72, note: '...' }
```

### 2.3 Vital Signs Chart Component

```typescript
// Using victory-native for charts
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';

function VitalSignChart({ data, type }: { data: VitalSign[], type: string }) {
  const chartData = data.map(v => ({
    x: new Date(v.recorded_at),
    y: type === 'blood_pressure' ? v.value.systolic : v.value,
  }));

  const normalRange = VITAL_RANGES[type];

  return (
    <VictoryChart theme={VictoryTheme.material} height={200}>
      <VictoryAxis 
        tickFormat={(t) => format(t, 'MM/dd')}
        style={{ tickLabels: { fontSize: 10 } }}
      />
      <VictoryAxis dependentAxis />
      
      {/* Normal range band */}
      <VictoryArea
        data={[
          { x: chartData[0]?.x, y: normalRange.max, y0: normalRange.min },
          { x: chartData[chartData.length - 1]?.x, y: normalRange.max, y0: normalRange.min },
        ]}
        style={{ data: { fill: '#10B98120' } }}
      />
      
      {/* Data line */}
      <VictoryLine
        data={chartData}
        style={{ data: { stroke: '#2563EB', strokeWidth: 2 } }}
      />
    </VictoryChart>
  );
}
```

---

## 3. Wearable Device Integration

### 3.1 Supported Platforms

| Platform | Data Types | SDK |
| ---------- | ----------- | ----- |
| Apple Health (iOS) | HR, BP, SpO2, Steps, Sleep, Weight | `react-native-health` |
| Google Fit (Android) | HR, BP, Steps, Sleep, Weight | `react-native-google-fit` |
| Samsung Health | HR, SpO2, Steps, Sleep | `react-native-samsung-health` |

### 3.2 Connection Flow

```text
Health → Connected Devices → [+ เชื่อมต่ออุปกรณ์]
              │
              ▼
┌─────────────────────────────┐
│  เลือกแหล่งข้อมูลสุขภาพ     │
│                             │
│  ┌──────────────────────┐   │
│  │ ❤️ Apple Health       │   │
│  │ ซิงค์ข้อมูลจาก        │   │
│  │ Apple Watch, iPhone   │   │
│  │ [เชื่อมต่อ]           │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 🟢 Google Fit         │   │
│  │ ซิงค์ข้อมูลจาก        │   │
│  │ Wear OS, Fitbit       │   │
│  │ [เชื่อมต่อ]           │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │ 🔵 Samsung Health     │   │
│  │ ซิงค์ข้อมูลจาก        │   │
│  │ Galaxy Watch          │   │
│  │ [เชื่อมต่อ]           │   │
│  └──────────────────────┘   │
└──────────┬──────────────────┘
           │ เชื่อมต่อ Apple Health
           ▼
┌─────────────────────────────┐
│  ขออนุญาตเข้าถึงข้อมูล      │
│                             │
│  ☑️ Heart Rate              │
│  ☑️ Blood Pressure          │
│  ☑️ Blood Oxygen            │
│  ☑️ Steps                   │
│  ☑️ Sleep Analysis          │
│  ☑️ Weight                  │
│  ☐ Reproductive Health      │
│                             │
│  [อนุญาต]                  │
└──────────┬──────────────────┘
           │
           ▼
    System Health permission dialog
           │
           ▼
    Background sync configured
    (Every 30 minutes)
```

### 3.3 Background Sync Implementation

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const SYNC_TASK = 'izara-health-sync';

// Define background task
TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    // 1. Read latest data from HealthKit/Google Fit
    const lastSync = await SecureStore.getItemAsync('last_health_sync');
    const since = lastSync ? new Date(lastSync) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const vitals = await readHealthData(since);
    
    if (vitals.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // 2. Sync to Izara server
    await mobileApi.syncWearableVitals({
      source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
      device_name: await getConnectedDeviceName(),
      vitals,
    });
    
    // 3. Update last sync time
    await SecureStore.setItemAsync('last_health_sync', new Date().toISOString());
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background task
export async function registerHealthSync() {
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 30 * 60,          // 30 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

---

## 4. EMR Viewing (Patient — Read Only)

### 4.1 Health Logs Screen

```text
Health → Health Logs
         │
         ▼
┌─────────────────────────────┐
│  📋 ประวัติการรักษา          │
│                             │
│  Filter: [ทั้งหมด ▾]       │
│  ○ ทั้งหมด                 │
│  ○ เวชระเบียน (EMR)        │
│  ○ ใบสั่งยา                │
│  ○ ผลตรวจ                  │
│  ○ คำแนะนำ                 │
│                             │
│  ── กุมภาพันธ์ 2026 ──     │
│                             │
│  📋 20 ก.พ. — EMR #12345   │
│  ├─ 👨‍⚕️ นพ.สมชาย รักษา    │
│  ├─ อาการ: ปวดหัว มึนงง    │
│  ├─ วินิจฉัย: Tension HA   │
│  └─ [ดูรายละเอียด ▶]       │
│                             │
│  💊 20 ก.พ. — Rx #67890    │
│  ├─ Paracetamol 500mg      │
│  ├─ Amitriptyline 10mg     │
│  └─ [ดูรายละเอียด ▶]       │
│                             │
│  🧪 18 ก.พ. — Lab CBC      │
│  ├─ ผลปกติ                 │
│  └─ [ดูรายละเอียด ▶]       │
│                             │
│  ── มกราคม 2026 ──         │
│  ...                        │
└─────────────────────────────┘
```

### 4.2 EMR Detail View

```text
EMR Detail #12345
         │
         ▼
┌─────────────────────────────┐
│  📋 เวชระเบียน              │
│  EMR-2026-02-20-12345       │
│                             │
│  👨‍⚕️ แพทย์: นพ.สมชาย รักษา │
│  📅 วันที่: 20 ก.พ. 2026    │
│  ✅ สถานะ: ลงนามแล้ว        │
│                             │
│  ── อาการสำคัญ ──           │
│  ปวดหัวบริเวณขมับทั้ง 2 ข้าง│
│  มา 3 วัน มีอาการมึนงงร่วม │
│                             │
│  ── ประวัติปัจจุบัน ──      │
│  ...detailed history...     │
│                             │
│  ── การตรวจร่างกาย ──       │
│  BP: 125/82  HR: 72        │
│  ...                        │
│                             │
│  ── การวินิจฉัย ──          │
│  Tension-type headache      │
│                             │
│  ── แผนการรักษา ──          │
│  1. Paracetamol 500mg q6h  │
│  2. Amitriptyline 10mg hs  │
│  3. Follow-up 2 weeks      │
│                             │
│  ── คำแนะนำ ──              │
│  - พักผ่อนให้เพียงพอ        │
│  - หลีกเลี่ยงหน้าจอ        │
│  - ทานยาตามที่สั่ง          │
│                             │
│  ── AI Summary ──           │
│  🤖 สรุปโดย AI (ตรวจสอบ    │
│  โดยแพทย์แล้ว)               │
│                             │
│  Actions:                   │
│  [📥 ดาวน์โหลด PDF]        │
│  [📤 แชร์กับแพทย์อื่น]     │
└─────────────────────────────┘
```

---

## 5. Doctor EMR Creation (Mobile)

### 5.1 Create EMR Flow

```text
Post-Meeting → EMR Creation
         │
         ▼
┌─────────────────────────────┐
│  📝 สร้างเวชระเบียน         │
│                             │
│  AI Pre-fill: ✅             │
│  (จากการประชุมวิดีโอ)       │
│                             │
│  ── Chief Complaint ──      │
│  ┌─────────────────────┐    │
│  │ ปวดหัวบริเวณขมับ    │    │
│  │ ทั้ง 2 ข้าง มา 3 วัน│    │
│  │       🤖 AI-filled   │    │
│  └─────────────────────┘    │
│                             │
│  ── Present Illness ──      │
│  ┌─────────────────────┐    │
│  │ [AI-generated text]  │    │
│  │ ✏️ Edit              │    │
│  └─────────────────────┘    │
│                             │
│  ── Physical Exam ──        │
│  BP: [125/82] HR: [72]     │
│  Temp: [36.5] RR: [18]     │
│                             │
│  ── Diagnosis (ICD-10) ──   │
│  ┌─────────────────────┐    │
│  │ 🔍 Search ICD-10... │    │
│  │ G44.2 Tension-type  │    │
│  │ headache ✅          │    │
│  └─────────────────────┘    │
│                             │
│  ── Treatment Plan ──       │
│  ┌─────────────────────┐    │
│  │ [AI-suggested plan]  │    │
│  │ ✏️ Edit              │    │
│  └─────────────────────┘    │
│                             │
│  ── CDS Alerts ──           │
│  ⚠️ Drug interaction:      │
│  Amitriptyline + SSRIs     │
│  [ดูรายละเอียด]            │
│                             │
│  ── Actions ──              │
│  [💊 สั่งยา]               │
│  [🧪 สั่งตรวจ Lab]         │
│  [📄 คำแนะนำผู้ป่วย]       │
│                             │
│  [✅ ลงนามและบันทึก]        │
│  [📥 บันทึกร่าง]            │
└─────────────────────────────┘
```

### 5.2 Quick Prescription (Mobile)

```text
EMR Screen → [💊 สั่งยา]
         │
         ▼
┌─────────────────────────────┐
│  💊 สั่งยา                  │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔍 ค้นหายา...       │    │
│  │ "para"               │    │
│  │                      │    │
│  │ Paracetamol 500mg    │    │
│  │ Paracetamol 650mg    │    │
│  │ Paracetamol Syrup    │    │
│  └─────────────────────┘    │
│                             │
│  Selected: Paracetamol 500  │
│  ┌─────────────────────┐    │
│  │ Dose:  [500 mg]      │    │
│  │ Route: [Oral ▾]      │    │
│  │ Freq:  [q6h prn ▾]   │    │
│  │ Duration: [7 days]   │    │
│  │ Qty:   [28 tablets]  │    │
│  │ Note:  [เมื่อปวดหัว] │    │
│  └─────────────────────┘    │
│                             │
│  🤖 AI Drug Check:          │
│  ✅ ไม่พบปฏิกิริยาระหว่างยา │
│  ✅ ไม่พบแพ้ยา              │
│                             │
│  [+ เพิ่มยาอีกรายการ]      │
│  [✅ ยืนยันใบสั่งยา]        │
└─────────────────────────────┘
```

---

## 6. Document Scanner & OCR

### 6.1 Scan Flow

```text
Health Logs → [📷 สแกนเอกสาร]
              │
              ▼
┌─────────────────────────────┐
│  📷 Camera Preview          │
│                             │
│  ┌────────────────────────┐ │
│  │                        │ │
│  │   Document Area        │ │
│  │   (Auto-detect edges)  │ │
│  │                        │ │
│  │   ┌──────────────┐     │ │
│  │   │  Lab Result   │     │ │
│  │   │  Document     │     │ │
│  │   └──────────────┘     │ │
│  │                        │ │
│  └────────────────────────┘ │
│                             │
│  Document Type:             │
│  [ผลตรวจ] [ใบสั่งยา]       │
│  [เวชระเบียน] [อื่นๆ]      │
│                             │
│  [📸 ถ่ายรูป]               │
│  [🖼️ เลือกจากอัลบั้ม]       │
└──────────┬──────────────────┘
           │ ถ่ายรูป
           ▼
┌─────────────────────────────┐
│  ✂️ Crop & Enhance          │
│                             │
│  ┌────────────────────────┐ │
│  │  Cropped document      │ │
│  │  (Enhanced contrast)   │ │
│  └────────────────────────┘ │
│                             │
│  [🔄 ถ่ายใหม่] [✅ ใช้รูปนี้]│
└──────────┬──────────────────┘
           │ ใช้รูปนี้
           ▼
┌─────────────────────────────┐
│  🤖 AI Processing...       │
│                             │
│  1. ✅ OCR Text Extraction  │
│  2. ✅ Language Detection    │
│  3. ⏳ AI Document Analysis │
│  4. ⏳ Structured Data      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  📄 ผลการวิเคราะห์เอกสาร    │
│                             │
│  Document Type: ผลตรวจเลือด │
│  Confidence: 95%            │
│                             │
│  Extracted Data:            │
│  ── CBC Results ──          │
│  Hemoglobin: 14.2 g/dL ✅   │
│  WBC: 7,500 /μL ✅          │
│  Platelets: 250,000 /μL ✅  │
│  RBC: 4.8 M/μL ✅           │
│                             │
│  🤖 AI Analysis:            │
│  "ผลตรวจเลือดอยู่ในเกณฑ์   │
│   ปกติทั้งหมด"              │
│                             │
│  [📥 บันทึกในสุขภาพของฉัน] │
│  [📤 แชร์กับแพทย์]          │
│  [🗑️ ไม่บันทึก]             │
└─────────────────────────────┘
```

---

## 7. Living Will (Mobile)

### 7.1 Living Will Management

```text
Health → Living Will
         │
         ▼
┌─────────────────────────────┐
│  📄 หนังสือแสดงเจตนา        │
│  (Living Will)              │
│                             │
│  Status: ✅ Active           │
│  Last Updated: 15 ก.พ. 2026│
│                             │
│  ── Preferences ──          │
│  CPR: ❌ ไม่ต้องการ          │
│  Ventilator: ❌ ไม่ต้องการ   │
│  Tube Feeding: ⚠️ ชั่วคราว  │
│  Pain Management: ✅ ต้องการ  │
│                             │
│  ── Emergency Contacts ──   │
│  👤 สมหญิง (ลูกสาว)        │
│     📞 081-234-5678         │
│  👤 สมชาย (พี่ชาย)          │
│     📞 089-876-5432         │
│                             │
│  ── Witness ──              │
│  ✅ Digitally signed        │
│  Witness: นางสาวรักษ์       │
│                             │
│  [✏️ แก้ไข] [📥 PDF]       │
│  [📤 แชร์กับคนในครอบครัว]   │
└─────────────────────────────┘
```

---

## 8. Offline Health Data Cache

### 8.1 Cached Data Strategy

| Data Type | Cache Duration | Sync Direction | Priority |
| ----------- | :-------------: | :--------------: | :--------: |
| PHR Profile | 7 days | Bidirectional | High |
| Vital Signs | 30 days | Upload only | High |
| Medications | 30 days | Bidirectional | High |
| Allergies | 30 days | Bidirectional | Critical |
| EMR Records | 90 days | Download only | Medium |
| Prescriptions | 90 days | Download only | Medium |
| Lab Results | 90 days | Download only | Medium |
| Living Will | Always | Bidirectional | Critical |

### 8.2 SQLite Cache Schema

```sql
-- Cached vital signs for offline display
CREATE TABLE cached_vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT,                    -- Server record ID (null if not synced)
  patient_id TEXT NOT NULL,
  vital_type TEXT NOT NULL,
  value TEXT NOT NULL,               -- JSON encoded value
  unit TEXT,
  recorded_at TEXT NOT NULL,         -- ISO 8601
  source TEXT,                       -- 'manual' | 'apple_health' | 'google_fit'
  is_synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Cached medications
CREATE TABLE cached_medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  reminder_times TEXT,               -- JSON array of times
  is_synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cached EMR records (read-only download)
CREATE TABLE cached_emr (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  doctor_name TEXT,
  visit_date TEXT,
  chief_complaint TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  full_data TEXT,                     -- Encrypted JSON
  downloaded_at TEXT DEFAULT (datetime('now'))
);

-- Sync queue for offline changes
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,           -- 'create' | 'update' | 'delete'
  record_data TEXT NOT NULL,         -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);
```

---

### End of Mobile Health Records Process — February 2026
