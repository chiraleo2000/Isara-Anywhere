# Documents — Izara Anywhere documentation hub

> **Layout version:** June 2026 · **App release:** v1.7.53  
> **Gates:** `npm run phase:0` … `phase:9` · LAN: [deploy/nginx/DEPLOYMENT.md](../deploy/nginx/DEPLOYMENT.md)

รวมเอกสารทั้งหมดของโปรเจกต์ภายใต้โฟลเดอร์เดียว `Documents/`

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
| 3 | [03_Data_Storage_Architecture.md](Technical_Documents/03_Data_Storage_Architecture.md) | Cloud SQL, BYTEA/GCS, NOTIFY, backup, ER |
| 4 | [04_Jitsi_Integration_and_Code_Examples.md](Technical_Documents/04_Jitsi_Integration_and_Code_Examples.md) | Lobby, API, โค้ด FE/BE, topology |
| 5 | [05_Appendix_Full_Process_Steps.md](Technical_Documents/05_Appendix_Full_Process_Steps.md) | Workflow + ขั้นตอนเต็มจาก `Processes/` |

ไฟล์ 01–04 มี **§ ภาคผนวก** สรุปจาก `Processes/Pages` — รายละเอียดขั้นตอนครบใน **05**

```bash
python scripts/build-appendix-process-steps.py   # สร้าง/อัปเดต 05
```

---

## แผนภาพ (diagrams)

| ชนิด | ที่อยู่ | คำสั่ง |
|------|--------|--------|
| draw.io master (12 แท็บรายงาน) | [Documents/docs/diagrams/diagrams.drawio](Documents/docs/diagrams/diagrams.drawio) | `npm run diagrams:export` |
| PNG export | [Documents/docs/diagrams/export/pages/](Documents/docs/diagrams/export/pages/) | `npm run diagrams:report` |
| Mermaid → HTML | [Presentations/html-diagrams/](Presentations/html-diagrams/index.html) | `.\Documents\Presentations\generate-diagrams.ps1` |

---

## บำรุงรักษา / ล้างไฟล์ชั่วคราว

```bash
npm run cleanup:project          # Office locks, .bkp, _BUILD.*, test caches
python scripts/build-appendix-process-steps.py
```

สเปกหน้าจอต้นฉบับ (ENRICH): [Processes/Pages/README.md](../Processes/Pages/README.md)

---

## การทดสอบ (v1.7.53)

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run phase:0` … `phase:9` | Phase gates — smoke, unit, headed E2E, screenshots, ledger |
| `npm run test:local:pre-deploy-gate` | Phase 9 full gate (alias `phase:9`) |
| `npm run test:unit:docker` | **~3200** Vitest tests ใน `node:20-alpine` |
| `npm run test:unit:groups-sequential` | 17 unit groups แบบ sequential + fail-fast |
| `npm run test:meeting-server:contract` | Meeting-server HTTP/JWT contracts |
| `npm run test:meeting-server:integration` | Socket.IO lobby + integration (skip ถ้า :3020 ไม่ขึ้น) |
| `npm run test:guards:static` | Legacy-src, credentials-include, dev-env guards |
| `npm run docker:probe-health` / `docker:meeting-api-smoke` | Pre-phase smoke ก่อน E2E |
| `bash deploy/nginx/compose.sh` | Docker Compose wrapper (V2 หรือ `docker-compose` V1) |
| `npm run cleanup:project` | ลบ log/cache/regenerable artifacts |

คู่มือ LAN: [deploy/nginx/DEPLOYMENT.md](../deploy/nginx/DEPLOYMENT.md) · สัญญา workflow: [Processes/FULL_WORKFLOW_CONTRACT.md](../Processes/FULL_WORKFLOW_CONTRACT.md)

**Registry:** `tests/unit/cross-portal/processWorkflowRegistry.ts` · matrix: [tests/PROCESS_COVERAGE_MATRIX.md](../tests/PROCESS_COVERAGE_MATRIX.md)

**Ledgers:** `reports/local-error-ledger/*-latest.json` (ไม่เก็บ round เก่าที่ repo root — รัน `npm run ledger:local`)
