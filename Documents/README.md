# Documents

รวมเอกสารทางเทคนิคและคู่มือของโปรเจกต์ Izara Anywhere

| โฟลเดอร์ | เนื้อหา |
|----------|---------|
| [docs/](docs/README.md) | คู่มือผู้ใช้, draw.io, markdown operations, screenshots |
| [Presentations/](Presentations/README.md) | นำเสนอ, Mermaid, HTML diagrams |
| [Technical_Documents/](Technical_Documents/) | เอกสารเทคนิคภาษาไทย (สถาปัตยกรรม, auth, ข้อมูล, Jitsi) |

## Technical Documents (As-is — ภาษาไทย)

เอกสารชุดนี้อธิบายระบบตามที่ implement จริงบน Google Cloud ไม่มีข้อเสนอแนะเพิ่ม

| # | ไฟล์ | เนื้อหาหลัก |
|---|------|-------------|
| 1 | [01_System_Architecture_and_Workflow.md](Technical_Documents/01_System_Architecture_and_Workflow.md) | สถาปัตยกรรม 3 พอร์ทัล, workflow แยกบทบาท, สถานะนัด, sequence + draw.io |
| 2 | [02_Authentication_and_Authorization.md](Technical_Documents/02_Authentication_and_Authorization.md) | RBAC, session/JWT, Google SSO codes, PDPA, state + security boundary |
| 3 | [03_Data_Storage_Architecture.md](Technical_Documents/03_Data_Storage_Architecture.md) | PostgreSQL/Cloud SQL, BYTEA/GCS, NOTIFY, backup, ER + draw.io |
| 4 | [04_Jitsi_Integration_and_Code_Examples.md](Technical_Documents/04_Jitsi_Integration_and_Code_Examples.md) | Lobby, API, โค้ดทีมพี่เบียร์/พี่ต้นชนินทร์, flowchart + topology |
| 5 | [05_Appendix_Full_Process_Steps.md](Technical_Documents/05_Appendix_Full_Process_Steps.md) | **ขั้นตอน + Workflow เต็ม** จาก `Processes/Pages` และ `Processes/*.md` |

ไฟล์ 01–04 มี **§ ภาคผนวก** สรุปสาระ — รายละเอียดขั้นตอนครบอยู่ใน **05** (อัปเดต: `python scripts/build-appendix-process-steps.py`)
