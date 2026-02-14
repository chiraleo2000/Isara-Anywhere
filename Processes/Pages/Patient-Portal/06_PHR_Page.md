# 💊 Patient Portal — PHR Page (Personal Health Records)

**Route:** `/phr`  
**Component:** `src/pages/health/PHRPage.tsx`  
**Access:** 🔒 Authenticated patients  
**Thai Title:** ระเบียนสุขภาพส่วนบุคคล

---

## 1. Purpose

Central health data management for patients — vital signs tracking, medication management, allergy records, and lifestyle data entry. All data stored in PostgreSQL.

---

## 2. Page Layout (5 Tabs)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💊 ระเบียนสุขภาพ (Personal Health Record)                           │
│                                                                     │
│  Tabs: [ภาพรวม] [สัญญาณชีพ] [ยา] [แพ้ยา] [โปรไฟล์]                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              (Tab Content Area)                              │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tab Details

### Tab 1: ภาพรวม (Overview)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Quick Stats (4 cards):                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                      │
│  │ 🫀 BP   │ │ ❤️ HR   │ │ ⚖️ WT   │ │ 🌡️ Temp │                      │
│  │ 120/80  │ │ 72bpm  │ │ 70kg   │ │ 36.5°C │                      │
│  │ ↑ trend │ │ → same │ │ ↓ down │ │ → same │                      │
│  └────────┘ └────────┘ └────────┘ └────────┘                      │
│                                                                     │
│  📋 Basic Info:                                                     │
│  Blood Type: A+  |  Height: 170cm  |  Weight: 70kg  |  BMI: 24.2  │
│  Chronic Conditions: Hypertension, Type 2 Diabetes                  │
│                                                                     │
│  Quick Actions:                                                     │
│  [บันทึกสัญญาณชีพ] [จัดการยา] [ดูประวัติแพ้ยา]                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab 2: สัญญาณชีพ (Vitals)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📊 บันทึกสัญญาณชีพ (Record New Vitals)                              │
│                                                                     │
│  ┌── Form ──────────────────────────────────────────────────┐      │
│  │  ความดันตัวบน (Systolic): [___] mmHg                      │      │
│  │  ความดันตัวล่าง (Diastolic): [___] mmHg                   │      │
│  │  อัตราหัวใจ (Heart Rate): [___] bpm                       │      │
│  │  น้ำหนัก (Weight): [___] kg                               │      │
│  │  อุณหภูมิ (Temperature): [___] °C (35-42 range)          │      │
│  │  น้ำตาลในเลือด (Blood Glucose): [___] mg/dL              │      │
│  │  ออกซิเจนในเลือด (SpO2): [___] %                         │      │
│  │                                                           │      │
│  │  [   💾 บันทึก   ]                                        │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                     │
│  📜 ประวัติสัญญาณชีพ (Vitals History):                               │
│  ├── 21 ม.ค. 2569 09:00 — BP: 125/82, HR: 74, Temp: 36.6         │
│  ├── 20 ม.ค. 2569 08:30 — BP: 130/85, HR: 78, Temp: 36.5         │
│  └── 19 ม.ค. 2569 09:15 — BP: 120/80, HR: 72, Temp: 36.4         │
│  (Last 10 entries, sorted newest first)                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab 3: ยา (Medications)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  💊 ยาปัจจุบัน (Current Medications)                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Metformin 500mg                                  🟢 Active │   │
│  │  ขนาด: 500mg · ความถี่: 2 เวลา/วัน · เพื่อ: เบาหวาน         │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  Amlodipine 5mg                                   🟢 Active │   │
│  │  ขนาด: 5mg · ความถี่: 1 เวลา/วัน · เพื่อ: ความดันโลหิตสูง    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [+ เพิ่มยา]                                                        │
│  ┌── Add Form ─────────────────────────────┐                       │
│  │  ชื่อยา: [____________]                  │                       │
│  │  ขนาด: [____________]                   │                       │
│  │  ความถี่: [____________]                 │                       │
│  │  วัตถุประสงค์: [____________]             │                       │
│  │  [เพิ่ม]                                 │                       │
│  └──────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab 4: แพ้ยา (Allergies)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ ประวัติแพ้ยา (Allergy Records)                                   │
│                                                                     │
│  Tags: [Penicillin ×] [Aspirin ×] [Sulfa ×]                       │
│                                                                     │
│  [+ เพิ่มประวัติแพ้ยา]                                                │
│  ┌── Add Form ─────────────────────────────┐                       │
│  │  สารที่แพ้: [____________]               │                       │
│  │  [เพิ่ม]                                 │                       │
│  └──────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab 5: โปรไฟล์ (Profile/Lifestyle)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👤 ข้อมูลส่วนตัว (Personal Info)                                    │
│  ├── ส่วนสูง: [170] cm                                              │
│  ├── กรุ๊ปเลือด: [A+]                                               │
│  └── โรคประจำตัว: [Hypertension] [×] [Diabetes] [×] [+ เพิ่ม]     │
│                                                                     │
│  🏃 ข้อมูลสุขภาพ (Lifestyle & Self-Entered Data)                    │
│  ├── อาหาร (Diet): [____________]                                   │
│  ├── ออกกำลังกาย (Exercise): [ความถี่ ▼]                             │
│  ├── การนอน (Sleep): [___] ชั่วโมง/คืน                               │
│  ├── สูบบุหรี่ (Smoking): [สถานะ ▼]                                  │
│  ├── แอลกอฮอล์ (Alcohol): [ระดับ ▼]                                 │
│  ├── อาหารเสริม (Supplements): [____________]                       │
│  └── การรักษาทางเลือก (Alt. Treatments): [____________]             │
│                                                                     │
│  [   💾 บันทึก   ]                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Workflows

### Workflow 1: Record Vital Signs

```text
Step 1: Navigate to PHR page → Vitals tab
Step 2: Enter vital readings (any combination of fields)
Step 3: Click "บันทึก" (Save)
Step 4: POST /api/phr/{userId}/vitals
Step 5: New entry appears at top of history list
Step 6: Overview tab stats update with new readings
Step 7: Trend arrows update (↑ up / ↓ down / → same vs previous)
```

### Workflow 2: Manage Medications

```text
Step 1: Navigate to PHR page → Medications tab
Step 2: View current medications list
Step 3: Click "เพิ่มยา" (Add Medication)
Step 4: Fill in name, dosage, frequency, purpose
Step 5: Click "เพิ่ม" (Add)
Step 6: POST /api/phr/{userId}/medications
Step 7: New medication appears in list as "Active"
Step 8: Can mark medication as "Stopped" if discontinued
```

### Workflow 3: Update Lifestyle Data

```text
Step 1: Navigate to PHR page → Profile tab
Step 2: Edit lifestyle fields (diet, exercise, sleep, etc.)
Step 3: Click "บันทึก" (Save)
Step 4: PUT /api/phr/{userId}/profile
Step 5: Data saved and visible to authorized doctors
```

---

## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/phr/{userId}` | Get full PHR data |
| GET | `/api/phr/{userId}/vitals` | Get vital signs history |
| POST | `/api/phr/{userId}/vitals` | Record new vitals |
| GET | `/api/phr/{userId}/medications` | Get medications list |
| POST | `/api/phr/{userId}/medications` | Add medication |
| PUT | `/api/phr/{userId}/profile` | Update profile/lifestyle |

---

## 6. Data Visible to Doctors

When PDPA consent is granted, doctors can see:

| Data Type | Doctor Access |
| --------- | ------------- |
| Vital signs history | ✅ Full history |
| Current medications | ✅ Active + stopped |
| Allergies | ✅ Full list |
| Chronic conditions | ✅ Full list |
| Lifestyle data | ✅ If shared |
| Blood type, height, weight | ✅ Always |

---

## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Overview quick actions | → Vitals tab, Medications tab, Allergies tab |
| Dashboard health stats | ← Pulls from PHR data |
| Doctor's PatientRecordViewer | ← Reads PHR data |
| AI Doctor chat | ← References PHR for context |

---

## 8. AI Agent Improvement Opportunities

- **Smart vital interpretation**: AI analyze vital trends and alert on concerning patterns
- **Medication interaction check**: AI cross-check all medications for interactions
- **Auto-import**: AI extract vitals from wearable devices (Apple Health, Google Fit)
- **Predictive health**: AI predict health risks from PHR trends
- **Medication reminders**: AI generate personalized medication schedules
- **Allergy severity classification**: AI categorize allergy severity automatically
