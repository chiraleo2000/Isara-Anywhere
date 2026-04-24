# 🔬 Doctor Portal — Lab & Imaging Orders

**Component:** `src/components/CompleteLabOrders.tsx`
**Type:** Modal (launched from DoctorPortal)
**Access:** 🔒 Doctor / Admin
**Thai Title:** สั่งแล็บและภาพวินิจฉัย / Lab & Imaging Orders

---


## 1. Purpose

Order laboratory tests and imaging studies, view results with normal ranges and flag indicators (high/low/critical).

---


## 2. Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔬 Lab & Imaging Orders — นายสมชาย มั่นคง                          │
│                                                                     │
│  Tabs: [📝 สั่งตรวจ (Order)] [📊 ผลตรวจ (Results)]                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              (Tab Content)                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```


### Order Tab

```text
┌── Order Lab Tests ──────────────────────────────────────────────────┐
│                                                                      │
│  📦 Common Panels:                                                   │
│  [CBC] [CMP] [Lipid Panel] [HbA1c] [Thyroid Function]              │
│                                                                      │
│  🔬 Individual Tests (grid of checkboxes):                          │
│  ☐ FBS   ☐ HbA1c   ☐ BUN   ☐ Creatinine   ☐ eGFR                 │
│  ☐ ALT   ☐ AST     ☐ ALP   ☐ Albumin      ☐ Total Protein        │
│  ☐ TSH   ☐ Free T4 ☐ UA    ☐ Electrolytes  ☐ PT/INR              │
│                                                                      │
│  📋 Clinical Indication: [________________________________]         │
│  🚨 Urgency: [○ Routine] [○ Urgent] [● STAT]                      │
│                                                                      │
│  Selected: CBC, HbA1c, Lipid Panel                                  │
│  [📤 Submit Order]                                                   │
└──────────────────────────────────────────────────────────────────────┘
```


### Results Tab

```text
┌── Lab Results ──────────────────────────────────────────────────────┐
│                                                                      │
│  ┌── CBC (21 ม.ค. 2569) ─── 🟢 Completed ──────────────────────┐  │
│  │  Hemoglobin:    12.5 g/dL    (12.0-16.0)        ✅ Normal    │  │
│  │  WBC:           8,000 /µL    (4,000-11,000)      ✅ Normal    │  │
│  │  Platelets:     250,000 /µL  (150,000-400,000)   ✅ Normal    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌── HbA1c (21 ม.ค. 2569) ─── 🟢 Completed ───────────────────┐  │
│  │  HbA1c:         7.2 %       (< 6.5)              🔴 HIGH     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌── Lipid Panel ─── 🟡 In Progress ───────────────────────────┐  │
│  │  Awaiting results...                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---


## 3. Result Flag Indicators

| Flag | Color | Description |
| ---- | ----- | ----------- |
| ✅ Normal | Green | Within normal range |
| 🔴 HIGH | Red | Above normal range |
| 🔵 LOW | Blue | Below normal range |
| ⚠️ CRITICAL | Red + bold | Critically abnormal |

---


## 4. Order Statuses

| Status | Color | Description |
| ------ | ----- | ----------- |
| ordered | Blue | Order placed |
| in_progress | Yellow | Tests being processed |
| completed | Green | Results available |

---


## 5. Workflows


### Workflow 1: Order Lab Tests

```text
Step 1: Open Lab Orders modal for patient
Step 2: Select common panel(s) or individual tests
Step 3: Enter clinical indication
Step 4: Select urgency (Routine / Urgent / STAT)
Step 5: Click "Submit Order"
Step 6: POST /api/lab-orders → Order created
Step 7: Status: ordered
```


### Workflow 2: View Results

```text
Step 1: Switch to Results tab
Step 2: GET /api/lab-orders/:patientId/results
Step 3: Results displayed with normal ranges
Step 4: Flag indicators highlight abnormal values
Step 5: Doctor reviews and acts on findings
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/lab-orders` | List patient's lab orders |
| POST | `/api/lab-orders` | Create new lab order |
| GET | `/api/lab-orders/:id/results` | Get lab results |

---


## 7. AI Agent Improvement Opportunities


- **Smart panel suggestions**: AI suggest tests based on diagnosis


- **Result interpretation**: AI interpret complex lab panels


- **Trend analysis**: AI identify concerning trends across multiple results


- **Auto-alerting**: AI notify doctor of critical results immediately


- **Cost optimization**: AI suggest most cost-effective test combinations

---


## PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| lab_orders | INSERT/UPDATE | Create lab orders, update with results |
| ai_document_analysis | INSERT/SELECT | AI analysis of uploaded lab result documents |
| emr | SELECT/UPDATE | Link lab orders to EMR record |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/lab-orders | POST | INSERT lab_orders |
| PUT /api/lab-orders/:id/results | PUT | UPDATE lab_orders SET results; INSERT ai_document_analysis |


### Real-time Events


- **NOTIFY:** lab_order_changes channel → Socket.IO lab result notifications


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD
