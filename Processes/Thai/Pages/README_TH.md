# Izara Telemedicine — Page-by-Page Documentation

> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `Pages/README.md`  
> **ต้นฉบับภาษาอังกฤษ:** [`Pages/README.md`](../Pages/README.md)  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

**เวอร์ชัน:** 1.7.54
**อัปเดตล่าสุด:** June 25, 2026
**สถานะ:** ✅ Phase 1 Complete — Web Platform Documentation + Full DB Schema

## มาตรฐานเอกสาร (ภาษาไทย)

| ประเภท | แบบอักษร | ขนาด |
|--------|----------|------|
| รายงาน / คู่มือ Word | **TH Sarabun New** | เนื้อหา **16 pt**, หัวข้อ 18–22 pt, ระยะบรรทัด 1.15 |
| สไลด์ PowerPoint | **FC Iconic** | หัวข้อ 32 pt, เนื้อหา 18 pt |

ทุกหน้าในโฟลเดอร์นี้มี **§ มาตรฐานเอกสาร**, **§ คำอธิบายและบริบท (รายงานภาษาไทย)** และ **§ ขั้นตอนการใช้งาน (ละเอียด)** — อัปเดตด้วย `python scripts/enrich-process-pages.py --force-steps`

คู่มือผู้ใช้: `Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx` · `Documents/docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx` — `python scripts/build-portal-user-guides.py`

โครงสร้างเทคนิค: `Documents/docs/technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx` · `Documents/docs/technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx` · `Documents/docs/diagrams/diagrams.drawio` · `Documents/docs/technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html` — `npm run guides:technical`

**ล้างข้อมูลทดสอบ (ไม่ re-seed demo):** `npm run cleanup:cloud-test-only` — ต้องมี `DB_PASSWORD` ถูกต้องใน `.env`

---