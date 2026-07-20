# Documentation index (v1.7.61)

All deliverables under `Documents/docs/` — guides, diagrams, operations markdown, and UI evidence.

**Gates:** local → cloud → docs from cloud UI showup unique PNGs only ([LOCAL_GREEN_CHECKPOINT.md](../../reports/LOCAL_GREEN_CHECKPOINT.md) · [CLOUD_GREEN_CHECKPOINT.md](../../reports/CLOUD_GREEN_CHECKPOINT.md) · published [`docs/screenshots/`](../../docs/screenshots/)).

**Related:** [Documents hub](../README.md) · [Thai technical As-is](../Technical_Documents/) · [Presentations](../Presentations/README.md) · [LAN deploy](../../deploy/nginx/DEPLOYMENT.md) · [Workflow contract](../../Processes/FULL_WORKFLOW_CONTRACT.md)

---

## User guides — Word · PowerPoint · PDF

| Portal | Word | PPT | PDF |
| ------ | ---- | --- | --- |
| **Patient** | [guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx](guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx) | [guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx](guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx) | [Word PDF](guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf) · [Slides PDF](guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf) |
| **Doctor / Admin** | [guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx](guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx) | [guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx](guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx) | [Word PDF](guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf) · [Slides PDF](guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf) |

Build: `python scripts/build-portal-user-guides.py` (cloud-synced `docs/screenshots/` only)

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

- [markdown/operations/INSTALLATION_GUIDE.md](markdown/operations/INSTALLATION_GUIDE.md) — local-first ladder + Docker coverage
- [markdown/operations/PROJECT_GUIDELINES.md](markdown/operations/PROJECT_GUIDELINES.md) — real coverage; cloud PNGs only for docs
- [markdown/operations/URLS_AND_DEFAULT_USERS.md](markdown/operations/URLS_AND_DEFAULT_USERS.md) — cloud, localhost, **LAN** URLs + demo users
- [markdown/operations/LAN_VIDEO_CLIENT_TH.md](markdown/operations/LAN_VIDEO_CLIENT_TH.md) — **วิดีโอ LAN** แพทย์/ผู้ป่วย (กล้องจากเครื่องลูกข่าย)
- [markdown/operations/JITSI_MEETING_DEMOTODAY_API.md](markdown/operations/JITSI_MEETING_DEMOTODAY_API.md) — Ubuntu `*.demotoday.net`: Jitsi + meeting API
- [markdown/operations/CLOUD_ACCESS_TH.md](markdown/operations/CLOUD_ACCESS_TH.md)
- [markdown/operations/APPOINTMENT_USER_GUIDE.md](markdown/operations/APPOINTMENT_USER_GUIDE.md)
- [markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md](markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md)
- [markdown/operations/MARKDOWN_GUIDE.md](markdown/operations/MARKDOWN_GUIDE.md)

## Markdown — testing & quality (v1.7.61)

| Command | Purpose |
|---------|---------|
| `USE_DOCKER_COVERAGE=1` + `test:unit:coverage:gate` / `test:unit:docker:coverage` | Real Istanbul (60/55/50/60); Windows via Docker |
| `npm run test:local:pre-deploy-gate` / `test:local:e2e-full` | Expanded headed E2E (beyond A–J) |
| `npm run test:e2e:ui-showup` / `test:gate:ui-showup` | Local archive vs cloud docs PNG source |
| `npm run docs:sync-screenshots` / `docs:evidence:cloud` | Sync unique cloud PNGs → `docs/screenshots/` |
| `python scripts/build-portal-user-guides.py` | Rebuild Patient/Doctor Word + PPT |
| `npm run cleanup:local-test-only` / `cleanup:cloud-test-only` | Post-phase demo purge (`CLOUD_DB_PASSWORD` for cloud) |

- [markdown/testing/DOCKER_MULTIBROWSER_E2E.md](markdown/testing/DOCKER_MULTIBROWSER_E2E.md)
- [markdown/testing/UNIT_TEST_UI_COVERAGE.md](markdown/testing/UNIT_TEST_UI_COVERAGE.md)
- Process matrix: [../../tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)

## Markdown — ledgers

- [markdown/ledgers/SECURITY_SCANNING_LEDGER.md](markdown/ledgers/SECURITY_SCANNING_LEDGER.md)
- Runtime JSON: `reports/local-error-ledger/*-latest.json` · index: [../../reports/README.md](../../reports/README.md)

---

## Screenshots & templates

- Canonical published shots: [`../../docs/screenshots/`](../../docs/screenshots/) (cloud UI showup unique only — do **not** recreate under `Documents/docs/screenshots/`)
- [templates/](templates/) — Doc templates

---

## Maintenance

| Task | Command |
|------|---------|
| Rebuild portal guides | `python scripts/build-portal-user-guides.py` |
| Prune caches & gate logs | `npm run cleanup:project` |
| Regenerate process appendix | `python scripts/build-appendix-process-steps.py` |
| LAN diagnostic (Ubuntu) | `bash deploy/nginx/diagnose.sh` |

Removes: `test-results/`, `playwright-report/`, `reports/*.log`, timestamped ledgers, root `*_ERROR_LEDGER_ROUND*.md`
