# 📁 Doctor Portal — Patient Record Viewer (PHR/EMR/EHR)

**Component:** `src/components/PatientRecordViewer.tsx`
**Type:** Modal (launched from DoctorPortal)
**Access:** 🔒 Doctor / Admin (PDPA consent required)
**Thai Title:** ประวัติผู้ป่วย / Patient Record

---


## 1. Purpose

Comprehensive patient record viewer with 3 tabs (PHR, EMR, EHR) including Living Will display, self-entered health data, treatment history, and lab results.

---


## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📁 ประวัติผู้ป่วย — นายสมชาย มั่นคง (65, Male)                      │
│                                                                     │
│  Tabs: [PHR] [EMR] [EHR]                                           │
│                                                                     │
│  ┌──── Left Nav ──────┬── Main Content ────────────────────────┐   │
│  │  Timeline          │                                        │   │
│  │  ├── 2569          │  (Selected tab/record content)         │   │
│  │  │  ├── ม.ค.       │                                        │   │
│  │  │  └── ก.พ.       │                                        │   │
│  │  └── 2568          │                                        │   │
│  └────────────────────┴────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---


## 3. PHR Tab (Personal Health Record)


### Living Will Card (Prominent at top)

```text
┌── 📜 พินัยกรรมชีวิต (Living Will) ─────────────────────────────────┐
│  Status: 🟢 Active                                                  │
│                                                                      │
│  Treatment Preferences:                                              │
│  ├── CPR (การกู้ชีพ):              ✅ Accept                        │
│  ├── Mechanical Ventilation:        ❌ Refuse                        │
│  ├── Artificial Nutrition:          ✅ Accept (conditional)          │
│  ├── Dialysis:                      ❌ Refuse                        │
│  ├── Antibiotics:                   ✅ Accept                        │
│  ├── Pain Management:               Comfort care                    │
│  └── Organ Donation:                ✅ Yes                           │
│                                                                      │
│  Personal Statement: "ขอให้ดูแลให้สบายที่สุด..."                      │
│  Representative: คุณสมหญิง (แม่) · 082-345-6789                    │
│                                                                      │
│  [▼ Expand Details]                                                  │
└──────────────────────────────────────────────────────────────────────┘
```


### Patient Demographics

| Field | Display |
| ----- | ------- |
| Name | Thai + English |
| Age | Calculated from DOB |
| Gender | Male/Female |
| Weight/Height/BMI | Latest readings |


### Self-Entered Health Data

| Category | Thai | Fields |
| -------- | ---- | ------ |
| Diet | อาหาร | Diet description |
| Exercise | ออกกำลังกาย | Frequency |
| Sleep | การนอน | Hours per night |
| Smoking | สูบบุหรี่ | Status |
| Alcohol | แอลกอฮอล์ | Consumption level |
| Supplements | อาหารเสริม | List |
| Alt. Treatments | การรักษาทางเลือก | Description |


### Device/Wearable Data

| Data | Source |
| ---- | ------ |
| Blood Glucose | Self-entered / device |
| Blood Pressure | Self-entered / device |
| Heart Rate | Self-entered / device |
| Steps | Wearable |
| Sleep Quality | Wearable |

---


## 4. EMR Tab (Electronic Medical Record)


- Timeline of encounters with encounter type and date


- Expandable cards showing SOAP details


- Linked prescriptions and lab orders

---


## 5. EHR Tab (Electronic Health Record)


- Comprehensive timeline including EMR + lab results + imaging


- Cross-provider data aggregation

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/patients/:id/records` | Full patient records |
| GET | `/api/patients/:id/phr` | Personal health records |
| GET | `/api/patients/:id/emr` | Electronic medical records |
| GET | `/api/patients/:id/living-will` | Living will data |
| GET | `/api/patients/:id/health-logs` | Health logs |

---


## 7. AI Agent Improvement Opportunities


- **Smart summarization**: AI generate concise patient summaries


- **Risk scoring**: AI calculate comprehensive risk scores from all data


- **Trend visualization**: AI-generated charts of key metrics over time


- **Cross-reference**: AI link related findings across PHR/EMR/EHR

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| phr | SELECT | Personal Health Records (read-only) |
| vital_signs | SELECT | Vital sign history (read-only) |
| emr | SELECT | EMR records (read-only) |
| prescriptions | SELECT | Prescription history (read-only) |
| lab_orders | SELECT | Lab order results (read-only) |
| living_wills | SELECT | Living will documents (read-only) |
| patient_consents | SELECT | PDPA consent status (read-only) |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| GET /api/patients/:id/phr | GET | SELECT phr, vital_signs WHERE patient_id |
| GET /api/patients/:id/emr | GET | SELECT emr, prescriptions, lab_orders WHERE patient_id |


### Note


- **Read-only aggregated view** — no INSERT/UPDATE operations from this page


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
