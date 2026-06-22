# Documentation index (v1.7.53)

All deliverables under `Documents/docs/` — guides, diagrams, operations markdown, and UI evidence.

**Related:** [Documents hub](../README.md) · [Thai technical As-is](../Technical_Documents/) · [Presentations](../Presentations/README.md) · [LAN deploy](../../deploy/nginx/LOCAL_DOCKER_DEPLOYMENT.md) · [Hardening report](../../Processes/FULL_WORKFLOW_HARDENING_COMPLETION_REPORT.md)

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
| HTML slides | [technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html](technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html) |

Build: `npm run guides:technical`

---

## Diagrams (draw.io)

| File | Purpose |
| ---- | ------- |
| [diagrams/diagrams.drawio](diagrams/diagrams.drawio) | Master deck (**12 report tabs** + extras) |
| [diagrams/export/pages/](diagrams/export/pages/) | PNG exports |

| Task | Command |
|------|---------|
| Diagram report (Word/PPT) | `npm run diagrams:report` |
| Export PNG pages | `npm run diagrams:export` |

---

## Markdown — operations

- [markdown/operations/URLS_AND_DEFAULT_USERS.md](markdown/operations/URLS_AND_DEFAULT_USERS.md) — cloud, localhost, **LAN** URLs + demo users
- [markdown/operations/CLOUD_ACCESS_TH.md](markdown/operations/CLOUD_ACCESS_TH.md)
- [markdown/operations/APPOINTMENT_USER_GUIDE.md](markdown/operations/APPOINTMENT_USER_GUIDE.md)
- [markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md](markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md)
- [markdown/operations/MARKDOWN_GUIDE.md](markdown/operations/MARKDOWN_GUIDE.md)

## Markdown — testing & quality (v1.7.53)

| Command | Purpose |
|---------|---------|
| `npm run phase:0` … `phase:9` | Phase gates with pre-phase smoke + ledger |
| `npm run test:unit:docker` | ~3200 Vitest in Docker |
| `npm run test:meeting-server:integration` | Socket.IO lobby (live :3020) |
| `npm run test:guards:static` | Regression guards (phase 8) |
| `npm run test:screenshots:all` | Groups A,B,D,E,Q,Q2,S |
| `npm run cleanup:project` | Prune logs, caches, stale ledgers |

- [markdown/testing/DOCKER_MULTIBROWSER_E2E.md](markdown/testing/DOCKER_MULTIBROWSER_E2E.md)
- [markdown/testing/UNIT_TEST_UI_COVERAGE.md](markdown/testing/UNIT_TEST_UI_COVERAGE.md)
- Process matrix: [../../tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

## Markdown — ledgers

- [markdown/ledgers/SECURITY_SCANNING_LEDGER.md](markdown/ledgers/SECURITY_SCANNING_LEDGER.md)
- Runtime JSON: `reports/local-error-ledger/*-latest.json` · `npm run ledger:local`

---

## Screenshots & templates

- [screenshots/](screenshots/) — Playwright UI evidence (groups A–S, workflow/)
- [templates/](templates/) — Doc templates

---

## Maintenance

| Task | Command |
|------|---------|
| Prune caches & gate logs | `npm run cleanup:project` |
| Regenerate process appendix | `python scripts/build-appendix-process-steps.py` |
| LAN diagnostic (Ubuntu) | `bash deploy/nginx/diagnose-502.sh` |

Removes: `test-results/`, `playwright-report/`, `reports/*.log`, timestamped ledgers, root `*_ERROR_LEDGER_ROUND*.md`
