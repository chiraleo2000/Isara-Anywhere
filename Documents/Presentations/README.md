# IZARA Telemedicine — Presentation Materials

> **Version:** 1.7.48 · **Updated:** 2 June 2026  
> **Status:** Defect PDF — 23/23 verified · **2938** unit tests · Docker gate green  
> **Documents hub:** [../README.md](../README.md) · **Thai As-is:** [../Technical_Documents/](../Technical_Documents/)

---

## Primary references

| Document | Language | Audience |
|----------|----------|----------|
| [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) | English | Architecture, testing, deployment overview |
| [../Technical_Documents/](../Technical_Documents/) | Thai | As-is GCP architecture (01–05) |
| [../docs/README.md](../docs/README.md) | TH/EN | Word/PPT guides, draw.io, screenshots |
| [PRESENTATION_SCRIPT.md](PRESENTATION_SCRIPT.md) | Thai | 30–45 min stakeholder script |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | English | Archived v1.7.38–v1.7.47 notes |

---

## Live URLs

### Local (Docker)

| Service | URL |
|---------|-----|
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Meeting Server | http://localhost:3020 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

### Cloud (dev-testing)

| Service | URL |
|---------|-----|
| Patient Portal | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app |
| Doctor Portal | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app |
| Meeting Server | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app |

Details: [../Documents/docs/markdown/operations/CLOUD_ACCESS_TH.md](../Documents/docs/markdown/operations/CLOUD_ACCESS_TH.md)

---

## Folder structure

```text
Presentations/
├── TECHNICAL_DOCUMENTATION.md
├── PRESENTATION_SCRIPT.md
├── RELEASE_NOTES.md
├── README.md
├── generate-diagrams.ps1
├── compact_template.html
├── database/
│   └── izara-complete-schema-v4.dbml
├── diagrams/              # 12 core .mmd sources
└── html-diagrams/         # 01–23 interactive HTML (+ index.html)
```

---

## Quick usage

| Task | Action |
|------|--------|
| View diagrams | Open [html-diagrams/index.html](html-diagrams/index.html) |
| Regenerate HTML from Mermaid | `.\Documents\Presentations\generate-diagrams.ps1` |
| draw.io PNG (12 pages) | `npm run diagrams:export` (from repo root) |
| Technical overview | Read [TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md) |
| DB schema (DBML) | [database/izara-complete-schema-v4.dbml](database/izara-complete-schema-v4.dbml) |
| Full process steps (TH) | [../Technical_Documents/05_Appendix_Full_Process_Steps.md](../Technical_Documents/05_Appendix_Full_Process_Steps.md) |

---

## Testing cross-reference

- Docker multi-browser E2E: [../docs/markdown/testing/DOCKER_MULTIBROWSER_E2E.md](../docs/markdown/testing/DOCKER_MULTIBROWSER_E2E.md)
- UI screenshots (Group W): [../docs/screenshots/group-W/](../../docs/screenshots/group-W/)
- Coverage: [../docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md](../docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md)
- Diagram: [html-diagrams/17-testing-quality-gate.html](html-diagrams/17-testing-quality-gate.html)
- Latest defect diagram: [html-diagrams/23-defect-remediation-v1748.html](html-diagrams/23-defect-remediation-v1748.html)

```bash
npm run test:e2e:docker:core-multibrowser
npm run docs:sync-screenshots
npm run test:quality:gate
npm run cleanup:project    # prune doc junk + caches
```
