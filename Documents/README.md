# Documents — Izara Anywhere documentation hub

> **Layout version:** June 2026 · **Git tag (docs bundle):** `v1.0-docs`  
> **App release (reference):** v1.7.51 (calendar sync on confirm + 3-party meeting E2E + zero-skip local gate)

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

## การทดสอบ (v1.7.51)

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run test:unit:docker` | **2982** Vitest tests ใน `node:20-alpine` (167+ files) |
| `npm run test:unit:docker:grouped` | ชุดเดียวกัน แบ่ง 4 กลุ่ม (doctor / patient / cross-portal / meeting-server) — ใช้เมื่อ RAM จำกัด |
| `npm run test:unit:docker:deploy` | Rebuild `docker-compose` stack + Vitest ครบ + **78** meeting-server HTTP contracts |
| `npm run test:meeting-server:contract` | Meeting-server contracts บน host (ไม่ rebuild stack) |
| `npm run test:e2e:docker:core-multibrowser` | Group W E2E — Chromium + Firefox + WebKit (18/18) |
| `npm run docs:sync-screenshots` | คัดลอก screenshot จาก E2E ไป `Documents/docs/screenshots/group-W/` |

คู่มือ Docker multi-browser: [docs/markdown/testing/DOCKER_MULTIBROWSER_E2E.md](docs/markdown/testing/DOCKER_MULTIBROWSER_E2E.md)

**Registry:** `tests/unit/cross-portal/processWorkflowRegistry.ts` · gate: `processPageCoverage.test.ts` (49 PCOV) · matrix: [tests/PROCESS_COVERAGE_MATRIX.md](../tests/PROCESS_COVERAGE_MATRIX.md)

Defect PDF (queue/meeting/calendar): `reports/defect-fix/DEFECT_REGISTER.md` — Q1, J1, M3, DPDF-CAL1/CAL2 · Vitest: `queueAcceptTraceability.test.ts`, `defectIsaraPdfMeetingQueue.test.ts`, `calendarEventLinks.test.ts`, `appointmentMapper.test.ts` · Local E2E: **35 passed, 0 skipped** (A→D→Q→E→F→L) + J/R **16/16** (2026-06-08)
