# Documentation index (v1.7.48)

All deliverables under `Documents/docs/` are grouped by **file type** and **content area**.

## User guides — Word · PowerPoint · PDF

| Portal | Word | PPT | PDF |
| ------ | ---- | --- | --- |
| **Patient** | [guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx](guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx) | [guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx](guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx) | [Word PDF](guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf) · [Slides PDF](guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf) |
| **Doctor / Admin** | [guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx](guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx) | [guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx](guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx) | [Word PDF](guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf) · [Slides PDF](guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf) |

Build: `npm run guides:all` · Export PDF: `npm run guides:pdf` (Word + PowerPoint on Windows)

## Technical architecture

| Format | Path |
| ------ | ---- |
| Word (TH Sarabun New) | [technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx](technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx) |
| **Diagram report (12 pages, Word + PPT)** | [technical/word/TECHNICAL_DIAGRAM_REPORT_TH.docx](technical/word/TECHNICAL_DIAGRAM_REPORT_TH.docx) · [technical/ppt/TECHNICAL_DIAGRAM_REPORT_PPT_TH.pptx](technical/ppt/TECHNICAL_DIAGRAM_REPORT_PPT_TH.pptx) |
| PowerPoint (FC Iconic) | [technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx](technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx) |
| PDF exports | [technical/pdf/](technical/pdf/) |
| HTML slides + speaker notes | [technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html](technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html) · [technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.md](technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.md) |

Build: `npm run guides:technical`

## Diagrams (draw.io)

| File | Purpose |
| ---- | ------- |
| [diagrams/diagrams.drawio](diagrams/diagrams.drawio) | Master deck (**13 tabs**, v1.7.48 — deduplicated) |
| [diagrams/Isara_Anywhere_System_Diagram.drawio](diagrams/Isara_Anywhere_System_Diagram.drawio) | System overview |
| [diagrams/Isara_Anywhere_Full_Diagram.drawio](diagrams/Isara_Anywhere_Full_Diagram.drawio) | Full platform |
| [diagrams/Isara_Anywhere_Complete_Diagram.drawio](diagrams/Isara_Anywhere_Complete_Diagram.drawio) | Complete flows (6 tabs) |
| [diagrams/export/](diagrams/export/) | PNG exports |

**Report (12 แท็บแรกเท่านั้น, ไม่แก้ drawio):** `npm run diagrams:report` · Export PNG: `npm run diagrams:export` · (ถ้าต้อง rebuild master เอง: `node scripts/merge-drawio-diagrams.mjs`)

## Markdown — operations

- [markdown/operations/URLS_AND_DEFAULT_USERS.md](markdown/operations/URLS_AND_DEFAULT_USERS.md) — Cloud/local URLs, demo users, guide links
- [markdown/operations/CLOUD_ACCESS_TH.md](markdown/operations/CLOUD_ACCESS_TH.md) — Cloud Run access (TH)
- [markdown/operations/APPOINTMENT_USER_GUIDE.md](markdown/operations/APPOINTMENT_USER_GUIDE.md) — Appointment flows
- [markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md](markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md) — Deploy runbook
- [markdown/operations/MARKDOWN_GUIDE.md](markdown/operations/MARKDOWN_GUIDE.md) — Doc linting

## Markdown — testing & quality

- [markdown/testing/UNIT_TEST_UI_COVERAGE.md](markdown/testing/UNIT_TEST_UI_COVERAGE.md) — Unit + UI screenshot evidence
- [markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md](markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md) — draw.io defect handoff

## Markdown — ledgers

- [markdown/ledgers/PRE_DEBUG_BASELINE_LEDGER.md](markdown/ledgers/PRE_DEBUG_BASELINE_LEDGER.md)
- [markdown/ledgers/SECURITY_SCANNING_LEDGER.md](markdown/ledgers/SECURITY_SCANNING_LEDGER.md)

## Other

- [screenshots/](screenshots/) — Playwright UI evidence (212 PNG, v1.7.48 cloud full)
- [templates/](templates/) — Doc templates

Reorganize layout: `scripts/reorganize-docs.ps1` (idempotent)

Prune caches and stale artifacts (keeps this tree + latest `reports/`): `npm run cleanup:project`
