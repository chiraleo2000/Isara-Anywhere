# 📋 Patient Portal — Timeline Page

**Version:** v1.4.7
**Route:** `/timeline`
**Component:** `src/pages/timeline/TimelinePage.tsx`
**Access:** 🔒 Authenticated patients
**Thai Title:** ประวัติการรักษา / Complete Treatment History

---


## 1. Purpose

Chronological timeline of all medical events — appointments, medications, lab results, procedures, and diagnoses — providing a complete treatment history at a glance.

---


## 2. Page Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📋 ประวัติการรักษา (Complete Treatment History)                      │
│                                                                     │
│  Filter: [ทั้งหมด] [📅 นัดหมาย] [💊 ยา] [🔬 ผลแล็บ]                │
│          [🏥 หัตถการ] [📄 การวินิจฉัย]                                │
│                                                                     │
│  ─── มกราคม 2569 ──────────────────────────────────────────────    │
│                                                                     │
│  │ 🟢 21 ม.ค.                                                      │
│  ├── 📅 นัดหมายกับ นพ. ทดสอบ ระบบ                                    │
│  │   Telehealth · อายุรกรรม                                         │
│  │   ▼ รายละเอียด:                                                  │
│  │   วินิจฉัย: ความดันโลหิตสูง ระยะที่ 1                              │
│  │   การรักษา: ปรับยา Amlodipine                                    │
│  │                                                                  │
│  │ 🔵 18 ม.ค.                                                      │
│  ├── 💊 เริ่มยา Metformin 500mg                                     │
│  │   2 เวลา/วัน · สำหรับเบาหวาน                                     │
│  │                                                                  │
│  │ 🟣 15 ม.ค.                                                      │
│  ├── 🔬 ผลแล็บ CBC                                                  │
│  │   ▼ รายละเอียด: Hb 12.5, WBC 8,000                              │
│  │                                                                  │
│                                                                     │
│  ─── ธันวาคม 2568 ──────────────────────────────────────────────   │
│                                                                     │
│  │ 🟠 28 ธ.ค.                                                      │
│  ├── 🏥 หัตถการ: ตรวจสายตา                                           │
│  │                                                                  │
│  │ 🔴 20 ธ.ค.                                                      │
│  ├── 📄 วินิจฉัย: เบาหวานชนิดที่ 2                                   │
│  │   โดย นพ. ทดสอบ · ICD-10: E11                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. Event Types

| Type | Icon | Color | Thai Name |
| ---- | ---- | ----- | --------- |
| appointment | 📅 | Emerald (green) | นัดหมาย |
| consultation | 📹 | Teal | ผลการปรึกษา (Telehealth) |
| medication | 💊 | Blue | ยา |
| lab | 🔬 | Purple | ผลแล็บ |
| procedure | 🏥 | Orange | หัตถการ |
| diagnosis | 📄 | Red | การวินิจฉัย |
| instruction_sheet | 📝 | Indigo | เอกสารคำแนะนำผู้ป่วย |

---


## 4. Features & Actions

| Feature | Description |
| ------- | ----------- |
| **Type filter** | Button-based filter by event type |
| **Monthly grouping** | Events grouped by month with headers |
| **Visual timeline** | Vertical line with color-coded dots |
| **Expandable details** | Click event to expand details |
| **Reverse chronological** | Newest events first |

---


## 5. Workflows


### Workflow 1: Browse Treatment History

```text
Step 1: Navigate to /timeline
Step 2: GET /api/health/timeline (or combined appointment/PHR data)
Step 3: Events loaded and grouped by month
Step 4: Newest events displayed first
Step 5: Scroll through chronological timeline
```


### Workflow 2: Filter by Event Type

```text
Step 1: Click filter button (e.g., "💊 ยา")
Step 2: Only medication events displayed
Step 3: Click "ทั้งหมด" to show all events again
```


### Workflow 3: View Event Details

```text
Step 1: Click on a timeline event card
Step 2: Card expands to show full details
Step 3: Shows relevant information based on event type:
        - Appointment: doctor, diagnosis, treatment, prescription
        - Consultation: meeting outcome, diagnosis, treatment plan, medications
        - Medication: name, dosage, frequency, purpose
        - Lab: test name, results, normal ranges
        - Procedure: type, doctor, notes
        - Diagnosis: ICD-10 code, description, doctor
        - Instruction Sheet: PDF download, summary of instructions
```


### Workflow 4: View Completed Meeting Results in Timeline

```text
Step 1: After telehealth consultation is completed:
        - Doctor processes AI summary → validates → creates EMR
        - EMR data flows to timeline as new entries
Step 2: Patient navigates to /timeline
Step 3: New timeline entries appear for the completed consultation:

        📹 Consultation Entry (ผลการปรึกษา):
        ├── Doctor name and specialty
        ├── Meeting date and time
        ├── Type: Telehealth (📹)
        ├── Diagnosis (patient-friendly Thai):
        │   "ความดันโลหิตสูง ระยะที่ 1"
        ├── Treatment Plan:
        │   "ปรับยา Amlodipine, ลดอาหารเค็ม, ออกกำลังกาย"
        ├── Medications with Instructions (วิธีกินยา):
        │   "Amlodipine 5mg วันละ 1 เม็ด หลังอาหารเช้า"
        ├── Follow-up: 22 ก.พ. 2569
        └── Warning Signs: ปวดศีรษะรุนแรง, ตาพร่ามัว

        📝 Patient Instruction Sheet Entry (เอกสารคำแนะนำ):
        ├── Generated date
        ├── Associated appointment reference
        ├── Summary of key instructions
        └── [📥 ดาวน์โหลด PDF] button

Step 4: Patient clicks on consultation entry → expands to full details
Step 5: Patient clicks "📥 ดาวน์โหลด PDF" → downloads instruction sheet
```


### Workflow 5: Download Patient Instruction Sheet from Timeline

```text
Step 1: Patient scrolls to consultation entry with 📝 icon
Step 2: Clicks the entry to expand
Step 3: Sees instruction sheet summary:
        - Diagnosis in patient-friendly Thai
        - Medication list with dosage and instructions
        - Follow-up appointment date
        - Warning signs to watch for
        - Doctor's name and contact info
Step 4: Clicks [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]
Step 5: PDF downloads with Thai content:
        - เอกสารคำแนะนำผู้ป่วย (Patient Instruction Sheet)
        - Date and doctor information
        - Diagnosis and treatment plan
        - Medications with วิธีกินยา (how to take)
        - Warning signs (อาการที่ต้องเฝ้าระวัง)
        - Follow-up date and instructions
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/health/timeline` | Get complete treatment timeline |
| GET | `/api/health/timeline?type=consultation` | Filter timeline by consultation events |
| GET | `/api/appointments/:id/results` | Get patient-friendly consultation results |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/emr-summary` | Get patient-visible EMR summary |

---


## 7. Data Sources

| Event Type | Data Source |
| ---------- | ----------- |
| Appointments | `appointments` table |
| Consultations | `appointments` (completed telehealth) + `emr_records` |
| Medications | PHR medications + prescriptions |
| Lab Results | `lab_orders` table |
| Procedures | EMR records |
| Diagnoses | EMR diagnosis entries |
| Instruction Sheets | `patient_instruction_sheets` table (generated PDFs) |

---


## 8. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Dashboard | → | Quick link from treatment results |
| Appointments | ← | Completed appointments feed into timeline |
| PHR | ← | Medications appear in timeline |
| Doctor EMR | ← | EMR data feeds diagnosis/procedure events |

---


## 9. Consultation Result Display (Patient-Friendly Format)

When a telehealth consultation is completed, the timeline shows results in patient-friendly Thai format:

```text
┌── 📹 ผลการปรึกษา — 22 ม.ค. 2569 ──────────────────────────────┐
│                                                                 │
│  👨‍⚕️ นพ. ทดสอบ ระบบ · อายุรกรรม                                  │
│  📹 Telehealth · ⏱️ 25 นาที                                     │
│                                                                 │
│  🏥 การวินิจฉัย (Diagnosis):                                     │
│  ความดันโลหิตสูง ระยะที่ 1                                       │
│                                                                 │
│  📋 แผนการรักษา (Treatment Plan):                                │
│  • ปรับยา Amlodipine จาก 2.5mg เป็น 5mg                        │
│  • ลดอาหารเค็ม                                                   │
│  • ออกกำลังกายอย่างน้อย 30 นาที/วัน                              │
│                                                                 │
│  💊 ยาที่สั่ง (Medications):                                      │
│  ├── Amlodipine 5mg — วันละ 1 เม็ด หลังอาหารเช้า                │
│  └── Aspirin 81mg — วันละ 1 เม็ด หลังอาหารเย็น                  │
│                                                                 │
│  📅 นัดติดตาม: 22 ก.พ. 2569                                     │
│                                                                 │
│  ⚠️ อาการที่ต้องเฝ้าระวัง:                                        │
│  • ปวดศีรษะรุนแรง                                                │
│  • ตาพร่ามัว                                                     │
│  • เจ็บหน้าอก หายใจลำบาก                                        │
│  → หากมีอาการเหล่านี้ ให้พบแพทย์ทันที                            │
│                                                                 │
│  [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]                              │
└─────────────────────────────────────────────────────────────────┘
```


## Patient Data Privacy in Timeline

| Visible to Patient | NOT Visible to Patient |
| ------------------- | ---------------------- |
| ✅ Diagnosis (patient-friendly Thai) | ❌ Internal doctor notes |
| ✅ Treatment plan summary | ❌ Raw AI outputs / transcription |
| ✅ Medications + instructions (วิธีกินยา) | ❌ Doctor-to-doctor communications |
| ✅ Patient Instruction Sheet (PDF) | ❌ CDS alerts (clinical decision support) |
| ✅ Follow-up schedule | ❌ AI confidence scores |
| ✅ Warning signs | ❌ Internal billing codes |

---


## 10. AI Agent Improvement Opportunities


- **Smart summary**: AI generate overall health trajectory summary


- **Trend analysis**: AI identify patterns in treatment history


- **Predictive timeline**: AI forecast upcoming needed appointments/tests


- **Export/Print**: AI format timeline for sharing with other providers


- **Comparison view**: AI compare current vs past health metrics


- **Event correlation**: AI link related events (diagnosis → medication → lab)

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| appointments | SELECT | Appointment history for timeline events |
| emr | SELECT | EMR records as timeline entries |
| prescriptions | SELECT | Prescription events in timeline |
| lab_orders | SELECT | Lab order events in timeline |
| vital_signs | SELECT | Vital sign entries in timeline |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/timeline | GET | SELECT appointments, emr, prescriptions, lab_orders, vital_signs WHERE patient_id ORDER BY date |


### Note


- **Aggregated read-only timeline** combining data from 5 tables sorted chronologically


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
