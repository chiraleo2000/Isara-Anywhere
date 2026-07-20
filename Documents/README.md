# Documents — Izara Anywhere documentation hub

> **Layout version:** July 2026 · **App release:** v1.7.61  
> **Gates:** `npm run phase:0` … `phase:9` · UX showup: `npm run test:gate:ui-showup` · LAN: [deploy/nginx/DEPLOYMENT.md](../deploy/nginx/DEPLOYMENT.md) · Video (TH): [docs/markdown/operations/LAN_VIDEO_CLIENT_TH.md](docs/markdown/operations/LAN_VIDEO_CLIENT_TH.md)

**Start here:** [INSTALLATION_GUIDE.md](docs/markdown/operations/INSTALLATION_GUIDE.md) · [PROJECT_GUIDELINES.md](docs/markdown/operations/PROJECT_GUIDELINES.md)

**Local-first → cloud → docs → purge (required process):** real Istanbul unit coverage + expanded local headed matrix + UI showup must **all pass** before cloud; after cloud UI showup + `test:cloud:full` + uniqueness, run `docs:sync-screenshots` / `docs:evidence:cloud` — **published images** = cloud UI showup unique PNGs only in [`docs/screenshots/`](../docs/screenshots/). Post-phase: `cleanup:local-test-only` / `cleanup:cloud-test-only`.

Evidence paths (re-verify before trusting): [LOCAL_GREEN_CHECKPOINT.md](../reports/LOCAL_GREEN_CHECKPOINT.md) · [CLOUD_GREEN_CHECKPOINT.md](../reports/CLOUD_GREEN_CHECKPOINT.md) · [HEADED_UI_RUN_RESULTS.md](../reports/HEADED_UI_RUN_RESULTS.md) · [LOCAL_UI_SHOWUP_RESULTS.md](../reports/LOCAL_UI_SHOWUP_RESULTS.md) · [CLOUD_FULL_COVERAGE_RESULTS.md](../reports/CLOUD_FULL_COVERAGE_RESULTS.md) · [CLOUD_UI_SHOWUP_RESULTS.md](../reports/CLOUD_UI_SHOWUP_RESULTS.md) · [CLOUD_DEMO_DATA_CLEANUP.md](../reports/CLOUD_DEMO_DATA_CLEANUP.md) · [local-unit-gate-latest.json](../reports/local-unit-gate-latest.json) · [FIX_LOOP_ROUNDS.md](../reports/FIX_LOOP_ROUNDS.md) · published PNGs [`docs/screenshots/`](../docs/screenshots/) (cloud UI showup unique only; ~427 PNGs after sync)

**Showup (cloud, 2026-07-16 baseline `20260716-093250`):** A/B/C headed **15 passed** — [CLOUD_UI_SHOWUP_RESULTS.md](../reports/CLOUD_UI_SHOWUP_RESULTS.md) (`CLOUD_UI_SHOWUP_RUN3.txt`). Full coverage **zero residuals** (Group N after GCE SSO seed) — [CLOUD_FULL_COVERAGE_RESULTS.md](../reports/CLOUD_FULL_COVERAGE_RESULTS.md). Checkpoint — [CLOUD_GREEN_CHECKPOINT.md](../reports/CLOUD_GREEN_CHECKPOINT.md). Cloud purge: **soft-blocked** (TCP `db-password` auth) — [CLOUD_DEMO_DATA_CLEANUP.md](../reports/CLOUD_DEMO_DATA_CLEANUP.md).

User guides (Word/PPT from cloud-synced PNGs): [Patient](docs/guides/patient/) · [Doctor](docs/guides/doctor/) — rebuild: `python scripts/build-portal-user-guides.py`

รวมเอกสารทั้งหมดของโปรเจกต์ภายใต้โฟลเดอร์เดียว `Documents/`

---

## Four-repo documentation map (platform split)

| Repository | Path | `docs/` deliverables | Standalone PG |
|------------|------|----------------------|---------------|
| **Platform** | `Isara-Anywhere` | `Processes/`, `Documents/`, [docs/APP_DOCS_SYNC.md](../docs/APP_DOCS_SYNC.md) | **5433** |
| **Patient** | `Isara-patient-portal/` | 16 pages, `DATABASE.md`, `TEST_COVERAGE.md` | **5434** |
| **Doctor** | `Isara-doctor-portal/` | 22 pages, `DATABASE.md`, `TEST_COVERAGE.md` | **5435** |
| **Meeting** | `Izara-jitsi-server/` | 4 pages, `DATABASE.md`, `TEST_COVERAGE.md` | **5436** |

Refresh from platform root: `npm run docs:sync-to-apps` · table map: `scripts/docs/table-ownership.json` · ports: `npm run multitask:ports`

---

## Platform split (4-repo map)

| Repo path | Standalone PG | Docs | CI |
|-----------|---------------|------|-----|
| `Isara-patient-portal/` | 5434 | `docs/` (16 pages) | `.github/workflows/standalone-ci.yml` |
| `Isara-doctor-portal/` | 5435 | `docs/` (22 pages) | `.github/workflows/standalone-ci.yml` |
| `Izara-jitsi-server/` | 5436 | `docs/` (4 pages) | `.github/workflows/standalone-ci.yml` |
| `Isara-Anywhere` (platform) | 5433 | `Processes/`, `docs/COMBINED_*` | `.github/workflows/platform-combined-gate.yml` |

Refresh app docs: `npm run docs:sync-to-apps` · Split procedure: [docs/SPLIT_REPOS.md](../docs/SPLIT_REPOS.md)

---

## โครงสร้าง

```text
Documents/
├── README.md                 ← ไฟล์นี้
├── docs/                     ← คู่มือ Word/PPT/PDF, draw.io, screenshots, operations
├── Presentations/            ← ภาษาอังกฤษ, Mermaid/HTML diagrams, สคริปต์นำเสนอ
└── Technical_Documents/      ← เอกสารเทคนิคภาษาไทย As-is (GCP) 01–05
```

| โฟลเดอร์ | ดัชนี | ใช้เมื่อ |
|----------|-------|---------|
| [docs/](docs/README.md) | คู่มือผู้ใช้, แผนภาพ draw.io, markdown ops/testing | ส่งมอบ Word/PPT, export PNG, cloud URLs |
| [Presentations/](Presentations/README.md) | TECHNICAL_DOCUMENTATION.md, html-diagrams | นำเสนอ stakeholder, diagram gallery |
| [Technical_Documents/](Technical_Documents/) | 01–05 ภาษาไทย | สถาปัตยกรรม As-is, audit, onboarding ทีมไทย |

---

## Technical Documents (ภาษาไทย — As-is)

อธิบายระบบตามที่ implement บน **Google Cloud** (`izara-telemedicine`, `asia-southeast1`) — **ไม่มีข้อเสนอแนะเพิ่ม**

| # | ไฟล์ | เนื้อหาหลัก |
|---|------|-------------|
| 1 | [01_System_Architecture_and_Workflow.md](Technical_Documents/01_System_Architecture_and_Workflow.md) | 3 พอร์ทัล, routes, workflow, appointment lifecycle, draw.io |
| 2 | [02_Authentication_and_Authorization.md](Technical_Documents/02_Authentication_and_Authorization.md) | Session/JWT, RBAC, Google SSO, PDPA |
| 3 | [03_Data_Storage_Architecture.md](Technical_Documents/03_Data_Storage_Architecture.md) | GCE VM Postgres, BYTEA/GCS, NOTIFY, backup, ER |
| 4 | [04_Jitsi_Integration_and_Code_Examples.md](Technical_Documents/04_Jitsi_Integration_and_Code_Examples.md) | Lobby, API, โค้ด FE/BE, topology |
| 5 | [05_Appendix_Full_Process_Steps.md](Technical_Documents/05_Appendix_Full_Process_Steps.md) | Workflow + ขั้นตอนเต็มจาก `Processes/` |

ไฟล์ 01–04 มี **§ ภาคผนวก** สรุปจาก `Processes/Pages` — รายละเอียดขั้นตอนครบใน **05**

```bash
python scripts/build-appendix-process-steps.py   # สร้าง/อัปเดต 05
```

---

## แผนภาพ (diagrams)

| ชนิด | ที่อยู่ | หมายเหตุ |
|------|--------|----------|
| draw.io master | [docs/diagrams/diagrams.drawio](docs/diagrams/diagrams.drawio) | Edit in draw.io |
| PNG export | [docs/diagrams/export/pages/](docs/diagrams/export/pages/) | Export from draw.io as needed |
| Mermaid → HTML | [Presentations/html-diagrams/](Presentations/html-diagrams/index.html) | `.\Documents\Presentations\generate-diagrams.ps1` |

---

## บำรุงรักษา / ล้างไฟล์ชั่วคราว

```bash
npm run cleanup:project          # Office locks, .bkp, _BUILD.*, test caches
python scripts/build-appendix-process-steps.py
```

สเปกหน้าจอต้นฉบับ (ENRICH): [Processes/Pages/README.md](../Processes/Pages/README.md)

---

## การทดสอบ (v1.7.61)

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run phase:0` … `phase:9` | Phase gates — smoke, unit, headed E2E, screenshots, ledger |
| `USE_DOCKER_COVERAGE=1` + `test:unit:coverage:gate` / `test:unit:docker:coverage` | Real Istanbul coverage (Windows via Docker); thresholds **60/55/50/60** |
| `npm run test:local:pre-deploy-gate` | Full local gate — expanded E2E default beyond A–J |
| `npm run test:local:e2e-full` | Headed default: A…J + D-queue/D-host/Q/L/J-prejoin/K/R/S/Defect |
| `npm run test:e2e:ui-showup` | Local headed A/B/C (archive only) |
| `npm run test:gate:ui-showup` | Cloud headed A/B/C + S — **docs screenshot source** |
| `npm run docs:sync-screenshots` | Copy cloud-pass unique PNGs → `docs/screenshots/` |
| `npm run docs:evidence:cloud` | Sync PNGs + refresh LOCAL_INSTALL evidence from cloud shots |
| `python scripts/build-portal-user-guides.py` | Rebuild Patient/Doctor Word + PPT guides under `docs/guides/` |
| `npm run test:unit:docker` | Vitest in `node:20-alpine` (no coverage unless `:coverage`) |
| `npm run test:unit:groups-sequential` | Unit groups sequential + fail-fast |
| `npm run test:meeting-server:contract` | Meeting-server HTTP/JWT contracts |
| `npm run test:guards:static` | Legacy-src, credentials-include, dev-env guards |
| `npm run docker:probe-health` / `docker:meeting-api-smoke` | Pre-phase smoke ก่อน E2E |
| `npm run cleanup:local-test-only` / `cleanup:cloud-test-only` | Post-phase demo purge |
| `npm run cleanup:project` | ลบ log/cache/regenerable artifacts |

คู่มือ LAN: [deploy/nginx/DEPLOYMENT.md](../deploy/nginx/DEPLOYMENT.md) · วิดีโอ LAN: [docs/markdown/operations/LAN_VIDEO_CLIENT_TH.md](docs/markdown/operations/LAN_VIDEO_CLIENT_TH.md) · รายงาน: [reports/README.md](../reports/README.md) · reverify: [FULL_COVERAGE_REVERIFY_AUDIT.md](../reports/FULL_COVERAGE_REVERIFY_AUDIT.md)

**Registry:** `tests/unit/cross-portal/processWorkflowRegistry.ts` · matrix: [tests/PROCESS_COVERAGE_MATRIX.md](../tests/PROCESS_COVERAGE_MATRIX.md)

**Ledgers:** `reports/local-error-ledger/*-latest.json` (ไม่เก็บ round เก่าที่ repo root — รัน `npm run ledger:local`)
