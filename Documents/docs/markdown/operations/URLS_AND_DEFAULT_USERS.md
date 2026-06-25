# URLs & default users (quick reference)

> Synced from [README.md](../../README.md) · **v1.7.53** · Cloud region `asia-southeast1` · Project `izara-telemedicine`  
> Verification: **~3200** Vitest · phase gates `npm run phase:0` … `phase:9` · Deploy: [deploy/nginx/DEPLOYMENT.md](../../../deploy/nginx/DEPLOYMENT.md)

---

## Cloud URLs (dev-testing)

| Service | Base URL | Login |
| ------- | -------- | ----- |
| **Patient Portal** | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login |
| **Doctor Portal** | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login |
| **Meeting Server** | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | API / health only (`/health`) |

**Image tag (Cloud Run):** `v1.7.12` (source repo v1.7.33)

**Health check:** `npm run cloud:smoke`

---

## Local URLs (Docker Compose)

### Mode A — localhost

| Service | URL |
| ------- | --- |
| Patient Portal | http://localhost:3005 |
| Patient login | http://localhost:3005/login |
| Doctor Portal | http://localhost:3010 |
| Doctor login | http://localhost:3010/login |
| Meeting Server | http://localhost:3020 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

### Mode B — Ubuntu + Nginx (LAN)

Requires `hosts` entry on each client PC pointing to the server IP.

| Service | URL |
| ------- | --- |
| Patient login | http://patient.isara.local/login |
| Doctor / Admin login | http://doctor.isara.local/login |
| Meeting health | http://meeting.isara.local/health |
| pgAdmin | http://dbadmin.isara.local |

**Deploy:** `bash deploy/nginx/deploy.sh` · **Diagnostic:** `bash deploy/nginx/diagnose.sh`

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

| Role | Cloud login | Local login | LAN login |
| ---- | ----------- | ------------- | --------- |
| Patient | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login | http://localhost:3005/login | http://patient.isara.local/login |
| Doctor / Admin | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login | http://localhost:3010/login | http://doctor.isara.local/login |

**Google SSO:** `GOOGLE_CLIENT_ID` in each portal `.env` — SSO email must match a registered account.

**Do not use demo passwords in production.**

---

## User guidelines — Word · PowerPoint · PDF (v1.7.33)

| Portal | Word (.docx) | Word PDF | PowerPoint (.pptx) | Slides PDF |
| ------ | ------------ | -------- | ------------------ | ---------- |
| **Patient** | [USER_GUIDE_PATIENT_WORD_TH.docx](../../guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx) | [USER_GUIDE_PATIENT_WORD_TH.pdf](../../guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf) · [GitHub](https://github.com/chiraleo2000/Isara-Anywhere/blob/main/Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf) | [USER_GUIDE_PATIENT_PPT_TH.pptx](../../guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx) | [USER_GUIDE_PATIENT_PPT_TH.pdf](../../guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf) · [GitHub](https://github.com/chiraleo2000/Isara-Anywhere/blob/main/Documents/docs/guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf) |
| **Doctor / Admin** | [USER_GUIDE_DOCTOR_WORD_TH.docx](../../guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx) | [USER_GUIDE_DOCTOR_WORD_TH.pdf](../../guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf) · [GitHub](https://github.com/chiraleo2000/Isara-Anywhere/blob/main/Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf) | [USER_GUIDE_DOCTOR_PPT_TH.pptx](../../guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx) | [USER_GUIDE_DOCTOR_PPT_TH.pdf](../../guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf) · [GitHub](https://github.com/chiraleo2000/Isara-Anywhere/blob/main/Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf) |

- **Word:** TH Sarabun New **16 pt** — ตารางจริง + **สารบัญ** (อัปเดต F9 ใน Word)
- **PowerPoint:** **FC Iconic** — หนึ่งสไลด์ต่อขั้นตอน พร้อมตารางขั้นตอน + บันทึกวิทยากร 16 pt

**Build & export**

```bash
npm run guides:all
# or step-by-step:
npm run guides:cleanup-old && npm run guides:enrich && npm run guides:build && npm run guides:pdf
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

# User guides — Word / PPTX / PDF (Documents/docs/guides/)
Patient Word:   Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx
Patient Word PDF: Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf
Patient PPT:    Documents/docs/guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx
Patient PPT PDF:  Documents/docs/guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf
Doctor Word:    Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx
Doctor Word PDF:  Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf
Doctor PPT:     Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx
Doctor PPT PDF:   Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf
```
