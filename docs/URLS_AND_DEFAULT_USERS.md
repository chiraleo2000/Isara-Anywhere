# URLs & default users (quick reference)

> Synced from [README.md](../README.md) · Release **v1.7.33** · Cloud region `asia-southeast1` · Project `izara-telemedicine`

---

## Cloud URLs (dev-testing)

| Service | Base URL | Login |
| ------- | -------- | ----- |
| **Patient Portal** | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login |
| **Doctor Portal** | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login |
| **Meeting Server** | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | API / health only (`/health`) |

**Image tag (Cloud Run):** `v1.7.33`

**Health check:** `npm run cloud:smoke`

---

## Local URLs (Docker Compose)

| Service | URL |
| ------- | --- |
| Patient Portal | http://localhost:3005 |
| Patient login | http://localhost:3005/login |
| Doctor Portal | http://localhost:3010 |
| Doctor login | http://localhost:3010/login |
| Meeting Server | http://localhost:3020 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

---

## Default / demo users

> After `npm run cleanup:cloud-test-only`, demo users are **removed** from cloud DB.  
> Restore: `npm run cleanup:cloud-test` (cloud) or `node scripts/database/db-tool.cjs --seed` (local).

| Role | Portal | Email | Password | Notes |
| ---- | ------ | ----- | -------- | ----- |
| Patient (primary) | Patient | demo.test@gmail.com | P@ssw0rd | PATIENT-DEMO — main E2E / GATE0 |
| Patient | Patient | Somchai.Mankong@gmail.com | P@ssw0rd | PATIENT-SOMCHAI |
| Patient | Patient | Anan.Khayanrian@gmail.com | P@ssw0rd | PATIENT-ANAN |
| Doctor (HOST) | Doctor | doctor.test@izara.com | IzaraDoctor@2024 | DOC-TEST-001 — meetings, EMR, queue |
| Admin | Doctor | admin.test@izara.com | IzaraAdmin@2024 | Pool, doctor approval |
| Doctor (extra) | Doctor | somchai.prasert@izara.com | IzaraDoctor@2024 | Cardiology demo profile |

### Where to log in

| Role | Cloud login | Local login |
| ---- | ----------- | ------------- |
| Patient | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login | http://localhost:3005/login |
| Doctor / Admin | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login | http://localhost:3010/login |

**Google SSO:** `VITE_GOOGLE_CLIENT_ID` in each portal `.env` — SSO email must match a registered account.

**Do not use demo passwords in production.**

---

## User guidelines — Word · PowerPoint · PDF (v1.7.33)

| Portal | Word (.docx) | Word PDF | PowerPoint (.pptx) | Slides PDF |
| ------ | ------------ | -------- | ------------------ | ---------- |
| **Patient** | [USER_GUIDE_PATIENT_WORD_TH.docx](USER_GUIDE_PATIENT_WORD_TH.docx) | [USER_GUIDE_PATIENT_WORD_TH.pdf](USER_GUIDE_PATIENT_WORD_TH.pdf) | [USER_GUIDE_PATIENT_PPT_TH.pptx](USER_GUIDE_PATIENT_PPT_TH.pptx) | [USER_GUIDE_PATIENT_PPT_TH.pdf](USER_GUIDE_PATIENT_PPT_TH.pdf) |
| **Doctor / Admin** | [USER_GUIDE_DOCTOR_WORD_TH.docx](USER_GUIDE_DOCTOR_WORD_TH.docx) | [USER_GUIDE_DOCTOR_WORD_TH.pdf](USER_GUIDE_DOCTOR_WORD_TH.pdf) | [USER_GUIDE_DOCTOR_PPT_TH.pptx](USER_GUIDE_DOCTOR_PPT_TH.pptx) | [USER_GUIDE_DOCTOR_PPT_TH.pdf](USER_GUIDE_DOCTOR_PPT_TH.pdf) |

- **Word:** TH Sarabun New **16 pt** (มาตรฐานรายงานภาษาไทย)
- **PowerPoint:** **FC Iconic** (หัวข้อ 32 pt · เนื้อหา 18 pt · บันทึกวิทยากร 16 pt)

**Build & export**

```bash
python scripts/build-portal-user-guides.py
powershell -ExecutionPolicy Bypass -File scripts/export-user-guide-pdf.ps1
```

Requires Microsoft Word and PowerPoint on Windows to create the PDF files. Install **TH Sarabun New** and **FC Iconic** before opening `.docx` / `.pptx`.

---

## Plain-text copy list

```
# Cloud
Patient:  https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login
Doctor:   https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login
Meeting:  https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app

# Local
Patient:  http://localhost:3005/login
Doctor:   http://localhost:3010/login
Meeting:  http://localhost:3020

# Users
demo.test@gmail.com / P@ssw0rd (patient)
Somchai.Mankong@gmail.com / P@ssw0rd (patient)
Anan.Khayanrian@gmail.com / P@ssw0rd (patient)
doctor.test@izara.com / IzaraDoctor@2024 (doctor)
admin.test@izara.com / IzaraAdmin@2024 (admin)
somchai.prasert@izara.com / IzaraDoctor@2024 (doctor)

# User guides — Word / PPTX / PDF (docs/)
Patient Word:   docs/USER_GUIDE_PATIENT_WORD_TH.docx
Patient Word PDF: docs/USER_GUIDE_PATIENT_WORD_TH.pdf
Patient PPT:    docs/USER_GUIDE_PATIENT_PPT_TH.pptx
Patient PPT PDF:  docs/USER_GUIDE_PATIENT_PPT_TH.pdf
Doctor Word:    docs/USER_GUIDE_DOCTOR_WORD_TH.docx
Doctor Word PDF:  docs/USER_GUIDE_DOCTOR_WORD_TH.pdf
Doctor PPT:     docs/USER_GUIDE_DOCTOR_PPT_TH.pptx
Doctor PPT PDF:   docs/USER_GUIDE_DOCTOR_PPT_TH.pdf
```
