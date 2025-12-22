# 📊 IZARA Telemedicine Platform - Presentation Materials
# เอกสารนำเสนอระบบ Telemedicine อิสระ

---

## 📁 Folder Structure / โครงสร้างโฟลเดอร์

```
Presentations/
├── README.md                           # This file
├── PRESENTATION_SCRIPT.md              # Complete presentation script
├── diagrams/                           # Mermaid workflow diagrams
│   ├── 01-system-architecture.mmd      # System architecture overview
│   ├── 02-patient-features.mmd         # Patient portal features
│   ├── 03-doctor-features.mmd          # Doctor portal features
│   ├── 04-appointment-workflow.mmd     # Appointment booking process
│   ├── 05-consultation-workflow.mmd    # Video consultation process
│   ├── 06-emr-workflow.mmd             # EMR documentation process
│   ├── 07-prescribing-workflow.mmd     # E-Prescribing with safety checks
│   ├── 08-content-workflow.mmd         # Content management workflow
│   ├── 09-gcs-bucket-architecture.mmd  # GCS bucket structure
│   ├── 10-gcp-services.mmd             # Google Cloud Platform services
│   ├── 11-google-services.mmd          # Google APIs integration
│   ├── 12-lab-imaging-workflow.mmd     # Lab & imaging orders
│   ├── 13-auth-workflow.mmd            # Authentication workflow
│   ├── 14-phr-workflow.mmd             # PHR management workflow
│   ├── 15-healthcare-map-workflow.mmd  # Healthcare map workflow
│   └── 16-data-sync-workflow.mmd       # Data synchronization
└── database/
    └── izara-complete-schema.dbml      # Complete database schema
```

---

## 📋 Contents / เนื้อหา

### 1. Presentation Script 📝
**File:** `PRESENTATION_SCRIPT.md`

Complete presentation guide with:
- 24 slides covering all aspects
- Thai/English script for each slide
- Demo instructions
- Q&A guidance

### 2. Mermaid Diagrams 📊
**Folder:** `diagrams/`

Visual workflow diagrams for:

| File | Description | ภาษาไทย |
|------|-------------|---------|
| `01-system-architecture.mmd` | High-level system architecture | สถาปัตยกรรมระบบ |
| `02-patient-features.mmd` | Patient portal feature map | ฟีเจอร์ระบบผู้ป่วย |
| `03-doctor-features.mmd` | Doctor portal feature map | ฟีเจอร์ระบบแพทย์ |
| `04-appointment-workflow.mmd` | Appointment booking flow | ขั้นตอนการนัดหมาย |
| `05-consultation-workflow.mmd` | Video consultation flow | ขั้นตอนการปรึกษาแพทย์ |
| `06-emr-workflow.mmd` | EMR SOAP documentation | ขั้นตอนบันทึก EMR |
| `07-prescribing-workflow.mmd` | E-Prescribing with safety checks | ขั้นตอนการสั่งยา |
| `08-content-workflow.mmd` | Content management flow | ขั้นตอนจัดการเนื้อหา |
| `09-gcs-bucket-architecture.mmd` | GCS bucket structure | โครงสร้าง Cloud Storage |
| `10-gcp-services.mmd` | GCP services overview | บริการ GCP |
| `11-google-services.mmd` | Google APIs integration | การเชื่อมต่อ Google APIs |
| `12-lab-imaging-workflow.mmd` | Lab & imaging orders | ขั้นตอนสั่งตรวจ |
| `13-auth-workflow.mmd` | Authentication flow | ขั้นตอนยืนยันตัวตน |
| `14-phr-workflow.mmd` | PHR management | ขั้นตอนจัดการ PHR |
| `15-healthcare-map-workflow.mmd` | Healthcare map feature | แผนที่สถานพยาบาล |
| `16-data-sync-workflow.mmd` | Data synchronization | การซิงค์ข้อมูล |

### 3. Database Schema 🗄️
**Folder:** `database/`

- `izara-complete-schema.dbml` - Complete DBML schema covering:
  - 6 GCS buckets
  - 30+ table definitions
  - All relationships
  - Thai & English documentation

---

## 🎨 Diagram Styling / รูปแบบไดอะแกรม

All mermaid diagrams use consistent styling:

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#E8F5E9',       // Light green background
    'fontSize': '16px',               // Large readable text
    'fontFamily': 'Arial, sans-serif'
  }
}}%%
```

**Features:**
- ✅ Light color backgrounds for readability
- ✅ Large bold text (16-20px)
- ✅ Emoji icons for visual clarity
- ✅ Thai translations in all labels
- ✅ Consistent color coding per category

---

## 🛠️ How to Use / วิธีใช้งาน

### Viewing Mermaid Diagrams

**Option 1: VS Code Extension**
1. Install "Mermaid Preview" extension
2. Open `.mmd` file
3. Press `Ctrl+Shift+V` to preview

**Option 2: Mermaid Live Editor**
1. Go to https://mermaid.live
2. Copy diagram content
3. View rendered diagram
4. Export as PNG/SVG

**Option 3: GitHub/GitLab**
- Rename `.mmd` to `.md`
- Wrap content in ```mermaid code block
- View directly on GitHub/GitLab

### Viewing DBML Schema

**Option 1: dbdiagram.io**
1. Go to https://dbdiagram.io
2. Paste DBML content
3. View ER diagram

**Option 2: VS Code Extension**
1. Install "DBML" extension
2. Open `.dbml` file
3. View with syntax highlighting

---

## 📊 Diagram Categories / หมวดหมู่ไดอะแกรม

### 🏗️ Architecture Diagrams
- System architecture (01)
- GCS bucket architecture (09)
- GCP services (10)
- Google services integration (11)
- Data sync architecture (16)

### 📱 Feature Maps
- Patient features (02)
- Doctor features (03)

### 🔄 Workflow Diagrams
- Appointment booking (04)
- Video consultation (05)
- EMR documentation (06)
- E-Prescribing (07)
- Content management (08)
- Lab & imaging orders (12)
- Authentication (13)
- PHR management (14)
- Healthcare map (15)

---

## 🎯 Presentation Topics / หัวข้อนำเสนอ

| Topic | Thai | Diagrams | Script Section |
|-------|------|----------|----------------|
| Project Overview | ภาพรวมโปรเจค | 01 | Slides 1-5 |
| Architecture | สถาปัตยกรรม | 01, 09, 10 | Slides 6-8 |
| Patient Portal | ระบบผู้ป่วย | 02, 04, 14, 15 | Slides 9-12 |
| Doctor Portal | ระบบแพทย์ | 03, 05-08, 12 | Slides 13-17 |
| Data Structure | โครงสร้างข้อมูล | 09, DBML | Slides 18-19 |
| Google Services | บริการ Google | 10, 11 | Slides 20-21 |
| Security | ความปลอดภัย | 13, 16 | Slide 22 |
| Demo | สาธิต | All | Slides 23-24 |

---

## 📝 Export Options / ตัวเลือกส่งออก

### For PowerPoint/Keynote
1. Render diagrams to PNG/SVG
2. Import into slides
3. Add titles and descriptions

### For PDF Documentation
1. Use Markdown to PDF converter
2. Include rendered diagrams
3. Add DBML as appendix

### For Web Presentation
1. Use reveal.js or similar
2. Embed mermaid diagrams directly
3. Add interactivity

---

## 🔗 Live URLs / ลิงก์ระบบ

### Development
| Service | URL |
|---------|-----|
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Auth Server | http://localhost:3011 |
| GCS API | http://localhost:3012 |

### Production
| Portal | URL |
|--------|-----|
| Patient Portal | https://izara-patient-portal-724889190329.asia-southeast1.run.app |
| Doctor Portal | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

---

## ✅ Test Results (December 15, 2025)

| Test Suite | Status | Pass Rate |
|------------|--------|-----------|
| Appointment Workflow | ✅ | 100% |
| Medical Content | ✅ | 100% |
| Health Records | ✅ | 100% |
| Dual Portal Video Meeting | ✅ | 100% |

**All E2E tests passing with video meeting, camera & microphone access verified**

---

## 📞 Contact / ติดต่อ

For questions about these presentation materials, contact the development team.

---

*Last Updated: December 15, 2025*
*Version: 1.1.0*
