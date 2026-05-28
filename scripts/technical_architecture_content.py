# -*- coding: utf-8 -*-
"""Thai content for technical architecture Word/PPT — v1.7.33."""

from __future__ import annotations

VERSION = "1.7.37"
DATE_TH = "28 พฤษภาคม 2569"

# Each slide: title, body lines (bullet strings), notes (speaker), optional table (headers, rows)
SLIDES: list[dict] = [
    {
        "title": "โครงสร้างทางเทคนิค — Izara Anywhere",
        "body": [
            "ระบบแพทย์ทางไกล (Telemedicine) สำหรับประเทศไทย",
            f"เวอร์ชัน {VERSION} | จัดทำ {DATE_TH}",
            "มาตรฐานรายงาน: Word TH Sarabun New 16 pt | สไลด์ FC Iconic",
            "แผนภาพ: docs/diagrams.drawio (10 หน้า)",
        ],
        "notes": "แนะนำภาพรวม Phase 1 — สามพอร์ทัล หนึ่งฐานข้อมูล PostgreSQL บน GCE",
    },
    {
        "title": "วัตถุประสงค์และหลักการ",
        "body": [
            "หลัก Man-in-the-Loop: แพทย์อนุมัติทุกผลลัพธ์ทางคลินิกจาก AI ก่อนส่งถึงผู้ป่วย",
            "รองรับ PDPA — ความยินยอม บันทึก audit และการแยกสิทธิ์ patient / doctor / admin",
            "Phase 1: เว็บแอปเท่านั้น — จองนัด วิดีโอคอล PHR/EMR ใบสั่งยา คำสั่ง lab",
        ],
        "notes": "อ้างอิง Processes/PHASE1_REQUIREMENTS.md และ GATE0",
    },
    {
        "title": "ภาพรวมสามพอร์ทัล",
        "table": (
            ["พอร์ทัล", "เทคโนโลยี", "พอร์ต (local)", "บทบาท"],
            [
                ["Patient", "React+Vite+Express", "3005", "ผู้ป่วย — จองนัด PHR AI แผนที่"],
                ["Doctor", "React+Vite+nginx+Node", "3010 / Cloud 8080", "แพทย์/แอดมิน — EMR คิว Pool"],
                ["Meeting", "Express+Socket.IO", "3020", "Jitsi lobby STT pipeline AI SOAP"],
            ],
        ),
        "notes": "draw.io หน้า 1 — System Architecture",
    },
    {
        "title": "ชั้นงานสถาปัตยกรรม (Layers)",
        "body": [
            "1. Client — เบราว์เซอร์, Jitsi WebRTC, Web Speech API",
            "2. Portal — REST /api/, auth :3011, ไฟล์ static ผ่าน nginx",
            "3. Real-time — PostgreSQL NOTIFY → pgNotifyListener → Socket.IO",
            "4. Data — izara_phase1 บน PostgreSQL 18 + pgvector",
            "5. External — Gemini 2.5 Flash Lite, Maps, OAuth, อีเมล",
        ],
        "notes": "อธิบายทิศทางข้อมูล: ลงบน → ขึ้นบน ไม่มี GCS สำหรับข้อมูลคลินิกหลัก",
    },
    {
        "title": "เครือข่ายคลาวด์ (Cloud Network)",
        "body": [
            "โครงการ GCP: izara-telemedicine | ภูมิภาค asia-southeast1",
            "Cloud Run: izara-patient-portal-dev-testing, izara-doctor-portal-dev-testing, izara-meeting-server-dev-testing",
            "ฐานข้อมูล: GCE VM 35.240.157.230:5432 (ไม่ใช้ Cloud SQL)",
            "Secret Manager: jwt-secret, database-url, gemini-api-key, google-client-id",
            "Artifact Registry + cloudbuild.yaml → deploy อัตโนมัติ",
        ],
        "notes": "draw.io หน้า 9 — แพทย์ unified image nginx→3011 auth/ws, 3009 API",
    },
    {
        "title": "การเชื่อมต่อบริการ (Service Connections)",
        "body": [
            "HTTPS: เบราว์เซอร์ → Cloud Run แต่ละพอร์ทัล",
            "TCP 5432: ทุก Run service → PostgreSQL บน GCE (firewall จำกัด egress)",
            "WebRTC: Client ↔ meet.jit.si — สื่อวิดีโอไม่ผ่านเซิร์ฟเวอร์ Izara",
            "REST: Patient/Doctor → Meeting Server (/api/meetings, lobby, guest)",
            "WebSocket: Socket.IO สำหรับคิว การแจ้งเตือน อัปเดตนัด",
        ],
        "notes": "เน้นจุดตรวจสอบเมื่อ deploy: MEETING_SERVER_URL ต้องตรงกันทุกพอร์ทัล",
    },
    {
        "title": "โครงสร้างฐานข้อมูล (กลุ่มตาราง)",
        "table": (
            ["กลุ่ม", "ตารางตัวอย่าง", "หน้าที่"],
            [
                ["ตัวตน", "users, sessions", "ล็อกอิน บทบาท อนุมัติแพทย์"],
                ["ผู้ป่วย", "phr, vital_signs, living_wills", "PHR PDPA หนังสือเจตนา"],
                ["แพทย์", "doctor_profiles, doctor_schedules", "โปรไฟล์ ตารางเวร"],
                ["นัดหมาย", "appointments", "สถานะ in_pool doctor_id"],
                ["คลินิก", "emr, prescriptions, lab_orders", "SOAP ใบสั่งยา lab"],
                ["ประชุม", "meeting_records, meeting_transcripts", "วิดีโอ STT สรุป"],
            ],
        ),
        "notes": "Schema: scripts/database/izara-database.sql — draw.io หน้า 8 ERD",
    },
    {
        "title": "ความสัมพันธ์ข้อมูลหลัก",
        "body": [
            "users → patient_profiles | doctor_profiles",
            "users → appointments → meeting_records → meeting_transcripts",
            "appointments → emr, prescriptions, lab_orders",
            "emr.requires_validation = true จนกว่าแพทย์ลงนาม",
            "Trigger NOTIFY เมื่อ appointments เปลี่ยน → อัปเดตคิวแบบ real-time",
        ],
        "notes": "อธิบาย foreign key แบบ logical — patient_id / doctor_id เป็น VARCHAR อ้าง users.id",
    },
    {
        "title": "กระบวนการจองนัด (ขั้นที่ 1–6)",
        "table": (
            ["ขั้น", "ผู้ปฏิบัติ", "การกระทำ", "ระบบ/ตาราง"],
            [
                ["1", "ผู้ป่วย", "ล็อกอิน + PDPA", "users, patient_consents"],
                ["2", "ผู้ป่วย", "จองนัด กรอกอาการ", "appointments INSERT"],
                ["3", "แพทย์/แอดมิน", "รับจาก Pool หรือจัดสรร doctor_id", "in_pool, doctor_id"],
                ["4", "แพทย์", "ยืนยันนัด", "status=confirmed"],
                ["5", "แพลตฟอร์ม", "NOTIFY + Socket.IO", "แดชบอร์ดอัปเดต"],
                ["6", "แพทย์", "อ่านสรุป AI ก่อนพบ", "Gemini + phr/emr"],
            ],
        ),
        "notes": "Processes/Appointment_Workflows.md — draw.io หน้า 3 และ 10",
    },
    {
        "title": "กระบวนการวิดีโอคอล (ขั้นที่ 7–10)",
        "table": (
            ["ขั้น", "ผู้ปฏิบัติ", "การกระทำ", "ระบบ"],
            [
                ["7", "ผู้ป่วย", "เข้า Jitsi lobby", "Meeting Server + meet.jit.si"],
                ["8", "แพทย์ (HOST)", "เริ่มประชุม อนุมัติแขก", "lobby API"],
                ["9", "ทั้งคู่", "วิดีโอ + STT + แชท", "meeting_transcripts"],
                ["10", "แพลตฟอร์ม", "postMeetingPipeline", "Gemini → emr draft"],
            ],
        ),
        "notes": "Processes/VIDEO_MEETING_JITSI_GEMINI.md — แพทย์เท่านั้นที่เป็น HOST",
    },
    {
        "title": "กระบวนการหลังพบ (ขั้นที่ 11–12)",
        "body": [
            "11. แพทย์ตรวจสอบ EMR / ใบสั่งยา / lab — Man-in-the-Loop",
            "11a. ลงนาม validated_by, signed_at",
            "12. ผู้ป่วยเห็น timeline, คำแนะนำ, PHR ที่อนุมัติแล้ว",
            "12a. การแจ้งเตือนผ่าน notifications + Socket.IO",
        ],
        "notes": "อย่าส่งผล AI ถึงผู้ป่วยก่อน validated — ข้อกำหนด DR Man-in-the-Loop",
    },
    {
        "title": "สถานะนัดหมาย (Status Machine)",
        "body": [
            "pending → in_pool → assigned → confirmed → in_meeting → completed",
            "ยกเลิก: cancelled (ทุกฝ่ายตามสิทธิ์)",
            "in_pool=true: แสดงใน Appointment Pool ให้แพทย์รับหรือแอดมินจัดสรร",
            "ตรวจ doctor_id ก่อนสร้าง meeting — GATE0",
        ],
        "notes": "อ้างอิง GATE0_IMPLEMENTATION_STATUS.md",
    },
    {
        "title": "PHR · EMR · AI",
        "body": [
            "PHR: ผู้ป่วยเป็นเจ้าของ — แพ้ยา ยา สัญญาณชีพ หนังสือเจตนา",
            "EMR: SOAP JSONB — subjective, objective, assessment, plan",
            "AI: Gemini สรุป transcript → ร่าง EMR — แพทย์แก้และลงนาม",
            "RAG: pgvector บน knowledge_base / clinical_resources",
        ],
        "notes": "draw.io หน้า 5 Health Records",
    },
    {
        "title": "ความปลอดภัยและ Real-time",
        "body": [
            "RBAC: แยก route patient / doctor / admin",
            "Auth: JWT/session, bcrypt, rate limit ล็อกอิน",
            "OWASP middleware: CSP, security headers",
            "Real-time: ช่อง NOTIFY appointment_* → Socket.IO room",
            "audit_logs: บันทึกการกระทำสำคัญ",
        ],
        "notes": "draw.io หน้า 2 User Management, หน้า 7 Notification",
    },
    {
        "title": "การทดสอบและคุณภาพ (v1.7.37)",
        "table": (
            ["ชั้น", "เครื่องมือ", "ผลลัพธ์"],
            [
                ["Unit", "Vitest 114 ไฟล์", "2645 tests ผ่าน"],
                ["Sonar", "SonarLint + sonar:lint", "server/ รวมใน Sonar sources"],
                ["Cloud API", "verify:gate0", "G1–G5 นัดหมาย"],
                ["Cloud UI", "Playwright A + 7 viewports", "41 tests + screenshots"],
                ["เอกสาร", "UNIT_TEST_UI_COVERAGE.md", "แมป unit → ภาพ UI"],
            ],
        ),
        "body": [
            "แผนภาพ: Presentations/html-diagrams/17-testing-quality-gate.html",
            "ภาพหน้าจอ: docs/screenshots/group-A, group-S, workflows/*",
        ],
        "notes": "npm run test:unit:report และ test:gate:ui-showup",
    },
    {
        "title": "การ deploy และเอกสารอ้างอิง",
        "body": [
            "Local: docker-compose up — Patient :3005 Doctor :3010 Meeting :3020",
            "Cloud: npm run cloud:deploy -- -Tag v1.7.37 + traffic shift",
            "ล้างข้อมูลทดสอบ: npm run cleanup:cloud-test-only",
            "Processes/Pages/** — ขั้นตอนละเอียดต่อหน้าจอ",
            "สร้างคู่มือ: npm run guides:technical (TH Sarabun 16pt, FC Iconic PPT)",
        ],
        "notes": "README.md, docs/CLOUD_ACCESS_TH.md, docs/diagrams.drawio",
    },
]
