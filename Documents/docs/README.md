# Documentation index (v1.7.48)

All deliverables under `Documents/docs/` — guides, diagrams, operations markdown, and UI evidence.

**Related:** [Documents hub](../README.md) · [Thai technical As-is](../Technical_Documents/) · [Presentations](../Presentations/README.md) · [Processes specs](../../Processes/Pages/README.md)

---

## User guides — Word · PowerPoint · PDF

| Portal | Word | PPT | PDF |
| ------ | ---- | --- | --- |
| **Patient** | [guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx](guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx) | [guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx](guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx) | [Word PDF](guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf) · [Slides PDF](guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf) |
| **Doctor / Admin** | [guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx](guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx) | [guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx](guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx) | [Word PDF](guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf) · [Slides PDF](guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf) |

Build: `npm run guides:all` · Export PDF: `npm run guides:pdf` (Word + PowerPoint on Windows)

---

## Technical architecture (Word / PPT / HTML)

| Format | Path |
| ------ | ---- |
| Word (TH Sarabun New) | [technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx](technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx) |
| **Diagram report (12 pages)** | [technical/word/TECHNICAL_DIAGRAM_REPORT_TH.docx](technical/word/TECHNICAL_DIAGRAM_REPORT_TH.docx) · [technical/ppt/TECHNICAL_DIAGRAM_REPORT_PPT_TH.pptx](technical/ppt/TECHNICAL_DIAGRAM_REPORT_PPT_TH.pptx) |
| PowerPoint (FC Iconic) | [technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx](technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx) |
| PDF exports | [technical/pdf/](technical/pdf/) |
| HTML slides | [technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html](technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html) · [MD](technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.md) |

Build: `npm run guides:technical`

**Thai Markdown As-is (source-aligned):** [../Technical_Documents/01_System_Architecture_and_Workflow.md](../Technical_Documents/01_System_Architecture_and_Workflow.md) — ชุด 01–05 อัปเดตจาก `Processes/` โดยตรง

---

## Diagrams (draw.io)

| File | Purpose |
| ---- | ------- |
| [diagrams/diagrams.drawio](diagrams/diagrams.drawio) | Master deck (**12 report tabs** + extras) |
| [diagrams/Isara_Anywhere_System_Diagram.drawio](diagrams/Isara_Anywhere_System_Diagram.drawio) | System overview |
| [diagrams/Isara_Anywhere_Full_Diagram.drawio](diagrams/Isara_Anywhere_Full_Diagram.drawio) | Full platform |
| [diagrams/Isara_Anywhere_Complete_Diagram.drawio](diagrams/Isara_Anywhere_Complete_Diagram.drawio) | Complete flows |
| [diagrams/export/pages/](diagrams/export/pages/) | PNG exports + [manifest.json](diagrams/export/pages/manifest.json) |

| Task | Command |
|------|---------|
| Diagram report (Word/PPT) | `npm run diagrams:report` |
| Export PNG pages | `npm run diagrams:export` |
| Interactive Mermaid HTML | `.\Documents\Presentations\generate-diagrams.ps1` → open [html-diagrams/index.html](../Presentations/html-diagrams/index.html) |

Defect draw.io handoff: [markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md](markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md)

---

## Markdown — operations

- [markdown/operations/URLS_AND_DEFAULT_USERS.md](markdown/operations/URLS_AND_DEFAULT_USERS.md)
- [markdown/operations/CLOUD_ACCESS_TH.md](markdown/operations/CLOUD_ACCESS_TH.md)
- [markdown/operations/APPOINTMENT_USER_GUIDE.md](markdown/operations/APPOINTMENT_USER_GUIDE.md)
- [markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md](markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md)
- [markdown/operations/TECHNICAL_DIAGRAM_REPORT_TH.md](markdown/operations/TECHNICAL_DIAGRAM_REPORT_TH.md)
- [markdown/operations/MARKDOWN_GUIDE.md](markdown/operations/MARKDOWN_GUIDE.md)

## Markdown — testing & quality

- [markdown/testing/UNIT_TEST_UI_COVERAGE.md](markdown/testing/UNIT_TEST_UI_COVERAGE.md)
- [markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md](markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md)

## Markdown — ledgers

- [markdown/ledgers/PRE_DEBUG_BASELINE_LEDGER.md](markdown/ledgers/PRE_DEBUG_BASELINE_LEDGER.md)
- [markdown/ledgers/SECURITY_SCANNING_LEDGER.md](markdown/ledgers/SECURITY_SCANNING_LEDGER.md)

---

## Screenshots & templates

- [screenshots/](screenshots/) — Playwright UI evidence (groups A–Q, workflow/, sso/)
- [templates/](templates/) — Doc templates

---

## Maintenance

| Task | Command |
|------|---------|
| Reorganize layout (idempotent) | `scripts/reorganize-docs.ps1` |
| Prune caches & doc junk | `npm run cleanup:project` |
| Regenerate process appendix | `python scripts/build-appendix-process-steps.py` |

Removes under `Documents/docs`: `~$*`, `*.bkp`, `*.dtmp`, `*_BUILD.docx|pptx`
