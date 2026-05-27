#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Add Thai reporting standards + detailed usage steps to Processes/Pages/**/*.md
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PAGES = REPO / "Processes" / "Pages"

DOC_STD = """## มาตรฐานเอกสาร (รายงานภาษาไทย)

เอกสารชุดนี้จัดทำให้สอดคล้อง**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข (โครงสร้าง: วัตถุประสงค์ → ขอบเขต → ขั้นตอน → ผลลัพธ์ → ข้อควรระวัง → อ้างอิง)

| รายการ | ค่าที่ใช้ |
|--------|-----------|
| เอกสาร Word / รายงาน PDF | **TH Sarabun New** — เนื้อหา **16 pt**, หัวข้อระดับ 1 **18 pt**, หัวข้อระดับ 2 **16 pt** (ตัวหนา), ชื่อเรื่อง **22 pt**, ระยะบรรทัด **1.15**, จัดชิดซ้าย |
| สไลด์นำเสนอ PowerPoint | **FC Iconic** — หัวข้อสไลด์ **32 pt**, หัวข้อรอง **22 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |
| ตัวเลขและวันที่ | ใช้ พ.ศ. ในข้อความไทย; คั่นหลักพันแบบไทยเมื่อจำเป็น |
| อ้างอิงคู่มือ | `docs/USER_GUIDE_PATIENT_WORD_TH.docx`, `docs/USER_GUIDE_DOCTOR_WORD_TH.docx`, `docs/USER_GUIDE_*_PPT_TH.pptx` |
| เอกสารปฏิบัติการ Production | `docs/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` |
| สร้าง/อัปเดตคู่มือ | `python scripts/build-portal-user-guides.py` |
| อัปเดตหน้ากระบวนการ | `python scripts/enrich-process-pages.py --force-steps` |
| ล้างข้อมูลทดสอบ (ไม่ re-seed demo) | `npm run cleanup:cloud-test-only` |
| การทดสอบอัตโนมัติ | Playwright Groups A–Q + Vitest — `tests/PROCESS_COVERAGE_MATRIX.md` |
| รุ่นเอกสารหน้ากระบวนการ | **ENRICH-7** (Word TH Sarabun New 16 pt / PPT FC Iconic / โครงสร้างเทคนิค docs/) |
| โครงสร้างเทคนิค (สถาปัตยกรรม) | `docs/TECHNICAL_ARCHITECTURE_WORD_TH.docx`, `docs/TECHNICAL_ARCHITECTURE_PPT_TH.pptx`, `docs/diagrams.drawio` |
| สร้างเอกสารโครงสร้างเทคนิค | `python scripts/build-technical-architecture-docs.py` |

**โครงสร้างบังคับในแต่ละหน้า Processes/Pages:**

1. **คำอธิบายและบริบท (รายงานภาษาไทย)** — บทบาทผู้ใช้ ขอบเขตข้อมูล และลิงก์ workflow  
2. **ขั้นตอนการใช้งาน (ละเอียด)** — ลำดับปฏิบัติ พร้อมจุดตรวจสอบและ `data-testid`  
3. **ผลลัพธ์ที่คาดหวัง** — สถานะระบบ / API / ฐานข้อมูลหลังจบขั้นตอน  

"""

STEPS_MARKER = "## ขั้นตอนการใช้งาน (ละเอียด)"
EXPLAIN_MARKER = "## คำอธิบายและบริบท (รายงานภาษาไทย)"
DOC_STD_MARKER = "## มาตรฐานเอกสาร"
ENRICH_REV = "ENRICH-7"


def sync_doc_standard(text: str) -> str:
    """Replace any document-standard block with the current DOC_STD."""
    if DOC_STD_MARKER not in text:
        return text
    pattern = re.compile(
        rf"{re.escape(DOC_STD_MARKER)}.*?(?=\n---\n|\n## [^#]|\Z)",
        re.DOTALL,
    )
    return pattern.sub(DOC_STD.rstrip() + "\n", text, count=1)


def page_testids(stem: str, rel: str) -> list[str]:
    """Primary data-testid hints for this page (from tests/SELECTORS.md)."""
    name = stem.lower()
    if "login" in name:
        return ["`login-email`", "`login-password`", "`login-submit`", "`google-sign-in-btn`"]
    if "register" in name:
        return ["`register-step-*`", "`register-submit`"]
    if "dashboard" in name:
        return ["`dashboard-page`", "`dashboard-kpi-*`"]
    if "appointment" in name:
        return ["`appointment-wizard-*`", "`appointment-join-meeting-btn`"]
    if "meeting" in name or "health_meeting" in name or "virtual" in name:
        return [
            "`lobby-waiting-screen`",
            "`admit-all-btn`",
            "`jitsi-doctor-container`",
            "`jitsi-guest-container`",
            "`insert-meeting-summary-emr-btn`",
        ]
    if "emr" in name:
        return ["`emr-editor-modal`", "`emr-autosave-status`", "`emr-sign-btn`"]
    if "phr" in name:
        return ["`phr-page`", "`phr-tab-*`"]
    if "pdpa" in name:
        return ["`pdpa-consent-toggle-*`", "`pdpa-audit-log`"]
    return ["ดู `tests/SELECTORS.md` สำหรับหน้านี้"]


def steps_for_stem(stem: str, rel: str) -> list[str]:
    """Generate 6–8 operational steps from page file name."""
    name = stem.replace("_Page", "").replace("_", " ").lower()
    portal = "patient" if "Patient-Portal" in rel else "doctor" if "Doctor-Portal" in rel else "meeting"

    if "login" in name:
        portal_url = (
            "Patient Portal (localhost:3005 หรือ izara-patient-*-dev-testing)"
            if portal == "patient"
            else "Doctor Portal (localhost:8080 หรือ izara-doctor-*-dev-testing)"
        )
        return [
            f"เปิด URL {portal_url} — ตรวจ HTTPS และใบรับรองถูกต้อง",
            "กรอกอีเมลใน `login-email` และรหัสผ่านใน `login-password` (หรือกด `google-sign-in-btn` สำหรับ SSO)",
            "อ่านข้อความแจ้งเตือน: บัญชีแพทย์ที่ยัง `pending` จะไม่เข้าแดชบอร์ดคลินิก",
            "กด `login-submit` — เรียก `POST /api/auth/login` (หรือ Google token exchange)",
            "ตรวจ Network: HTTP 200 และ response มี JWT; ไม่มี 401/403",
            "ยืนยัน redirect ไปแดชบอร์ด (`dashboard-page`) — ไม่กลับ `/login`",
            "ทดสอบ «ลืมรหัสผ่าน» หากจำเป็น — ลิงก์ reset หมดอายุตามนโยบาย",
            "ออกจากระบบเมื่อใช้เครื่องสาธารณะ — ล้าง session/localStorage",
        ]
    if "register" in name:
        return [
            "เลือก «สมัครสมาชิก» จากหน้าเข้าสู่ระบบ",
            "กรอกข้อมูลส่วนตัวและข้อมูลสุขภาพตามฟอร์ม (ขั้นที่ 1–2)",
            "ยอมรับนโยบาย PDPA ที่เกี่ยวข้อง",
            "ยืนยันรหัสผ่านให้ตรงกัน (≥ 8 ตัวอักษร)",
            "ส่งแบบฟอร์ม — ระบบสร้างบัญชีผู้ป่วย",
            "เข้าสู่ระบบด้วยบัญชีใหม่",
        ]
    if "reset" in name or "password" in name:
        return [
            "คลิก «ลืมรหัสผ่าน» จากหน้า login",
            "กรอกอีเมลที่ลงทะเบียน",
            "ตรวจสอบกล่องจดหมาย (ลิงก์หมดอายุตามนโยบาย)",
            "เปิดลิงก์ reset — กรอกรหัสผ่านใหม่",
            "ยืนยันรหัสผ่านซ้ำ",
            "เข้าสู่ระบบด้วยรหัสผ่านใหม่",
        ]
    if "appointment" in name or "pool" in name or "queue" in name:
        return [
            "ตรวจสอบสถานะนัดปัจจุบัน (pending / in_pool / awaiting_doctor_response / confirmed)",
            "ดำเนินการตามบทบาท: ผู้ป่วยจอง | แอดมินจัดสรร | แพทย์ยืนยัน",
            "ตรวจ KPI คิว (`queue-count`) และรายการใน `queue-list`",
            "อัปเดต realtime ผ่าน Socket.IO / รีเฟรช",
            "เริ่มวิดีโอคอลเมื่อสถานะ confirmed",
            "บันทึก EMR/สั่งยา/แล็บหลังจบการพบ",
        ]
    if "meeting" in name or "health_meeting" in name or "virtual" in name:
        return [
            "แพทย์ (HOST) สร้าง/เปิดห้องประชุมก่อน — ระบบตั้ง `host-ready` ผ่าน Socket.IO (`notifyHostPresent`)",
            "คัดลอก `guestJoinUrl` จาก Patient Portal API (`share-link` / `guest-invite`) — ห้ามแชร์ URL พอร์ทัลแพทย์",
            "ผู้ป่วยและ Guest รอใน Izara Lobby (`lobby-waiting-screen` / `guest-lobby-waiting`) — ไม่ใช้ Jitsi lobby บน meet.jit.si",
            "แพทย์กด Admit รายคน หรือ `admit-all-btn` — ตรวจ badge Guest/Patient บน Meeting Room",
            "Guest: รอ overlay host-ready แล้ว mount Jitsi (`jitsi-guest-container` เต็มจอ ไม่ซ่อนด้วย h-0)",
            "ทุกฝ่ายเข้า Jitsi บน `meet.jit.si` — เปิดกล้อง/ไมค์; ตรวจ CSP `frame-src` / `connect-src`",
            "ระหว่างประชุม: ส่ง transcript segment (`/transcript`, `guest-transcript-segment`)",
            "จบประชุม: MediaRecorder → `POST /api/meetings/:id/save-recording` (≤50MB) → path `meetings/{doctorId}/{meetingId}/video.webm`",
            "เรียก `POST /api/meetings/:id/end` — pipeline สรุป AI (Gemini) + Socket `meeting-summary-ready`",
            "แดชบอร์ดแพทย์: `GET /api/video-meeting/:appointmentId/files` → แท็บ AI Summary / `insert-meeting-summary-emr-btn`",
            "ตรวจ `GET /api/meetings/:id/pipeline-status` หากสรุปยังไม่ขึ้น (stage: completed)",
        ]
    if "emr" in name:
        return [
            "เปิด EMR จากนัดหรือผู้ป่วยที่เลือก",
            "กรอก SOAP / ใช้ AI pre-fill จากการประชุม",
            "รอ autosave 30 วินาที — ดู `emr-autosave-status`",
            "ตรวจความถูกต้องก่อนลงนาม",
            "ลงนาม EMR — ส่งสำเนาให้ผู้ป่วยตามนโยบาย",
            "ปิด modal — ยืนยันบน Timeline/PHR ฝั่งผู้ป่วย",
        ]
    if "prescrib" in name:
        return [
            "เปิดหน้าสั่งยาจากผู้ป่วย/นัด",
            "ค้นหายา — ระบบตรวจ allergy (`allergy-block-banner`)",
            "เพิ่มรายการยาและขนาด",
            "ตรวจ CDS warnings",
            "ลงนามอิเล็กทรอนิกส์ — กด `prescribe-submit`",
            "ยืนยันผู้ป่วยเห็นใน PHR",
        ]
    if "phr" in name or "record" in name:
        return [
            "เลือกผู้ป่วย (แพทย์) หรือเปิดเมนู PHR (ผู้ป่วย)",
            "เลือกแท็บ Vitals / Meds / Allergies / EMR",
            "ตรวจข้อมูลล่าสุดจากการซิงค์",
            "ไม่แก้ไขข้อมูลที่แพทย์ล็อกแล้ว",
            "ดาวน์โหลด/พิมพ์ตามสิทธิ์",
        ]
    if "pdpa" in name:
        return [
            "เปิดเมนู PDPA",
            "อ่านคำอธิบายแต่ละประเภทความยินยอม",
            "สลับ `pdpa-consent-toggle-*` ตามต้องการ",
            "ตรวจแท็บ Audit — `pdpa-audit-log` (ไม่แก้ไขย้อนหลัง)",
            "จัดการสิทธิ์แพทย์ที่เข้าถึงข้อมูล",
        ]
    if "living" in name or "will" in name:
        return [
            "เปิดหนังสือแสดงเจตนา (4 ขั้นตอน)",
            "กรอกผู้รับมอบฉันทะและความต้องการการรักษา",
            "ลงลายมือชื่อบน `living-will-signature`",
            "บันทึกและเลือกแชร์ให้แพทย์",
            "ตรวจว่าแพทย์เห็นใน Patient Record Viewer",
        ]
    if "ai" in name or "gemini" in name:
        return [
            "เปิด AI Doctor / Gemini Studio",
            "กรอกอาการหรือคำถาม — ไม่ใส่ข้อมูลระบุตัวบุคคลเกินจำเป็น",
            "อ่านคำเตือน: ไม่ใช่การวินิจฉัย",
            "ใช้ปุ่ม handoff จองนัดหากแนะนำ",
            "แพทย์ตรวจสอบผลลัพธ์ก่อนส่งต่อผู้ป่วย",
        ]
    if portal == "meeting":
        return [
            "ตรวจ `GET /health` และ `GEMINI_API_KEY` บน Cloud",
            "สร้าง meeting — doctor JWT",
            "Lobby admit — patient + guest",
            "บันทึก WebM ลง `RECORDINGS_DIR`",
            "สรุป SOAP ผ่าน Gemini",
            "ซิงค์ผลลัพธ์ไปพอร์ทัล",
        ]
    return [
        f"เข้าสู่ระบบพอร์ทัล{'ผู้ป่วย' if portal == 'patient' else 'แพทย์/ผู้ดูแล'}",
        f"เปิดหน้า «{stem.replace('_', ' ')}» จากเมนูหลัก",
        "ดำเนินการตามฟอร์มบนหน้าจอทีละขั้น",
        "ตรวจข้อความแจ้งเตือนและสถานะ API",
        "ยืนยันผลลัพธ์กับข้อมูลใน PostgreSQL (เมื่อเกี่ยวข้อง)",
        "บันทึกหรือส่งต่อขั้นตอนถัดไปตาม workflow",
    ]


def explanation_for_stem(stem: str, rel: str) -> str:
    portal = "ผู้ป่วย" if "Patient-Portal" in rel else "แพทย์/ผู้ดูแล" if "Doctor-Portal" in rel else "Meeting Server"
    title = stem.replace("_Page", "").replace("_", " ")
    parts = [
        f"### วัตถุประสงค์",
        f"",
        f"หน้า **{title}** อธิบายการทำงานของพอร์ทัล{portal} ในระบบ Isara Anywhere "
        f"ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ",
        f"",
        f"### มาตรฐานการจัดทำเอกสาร",
        f"",
        f"- **รายงาน / Word:** แบบอักษร **TH Sarabun New** ขนาดเนื้อหา **16 pt** ระยะบรรทัด **1.15** (มาตรฐานรายงานภาษาไทย)",
        f"- **PowerPoint:** แบบอักษร **FC Iconic** หัวข้อ **32 pt** เนื้อหา **18 pt**",
        f"- สร้างไฟล์จริง: `python scripts/build-portal-user-guides.py` → `docs/USER_GUIDE_*_WORD_TH.docx` และ `*_PPT_TH.pptx`",
        f"",
        f"### ขอบเขตและบทบาท",
        f"",
    ]
    if "Patient" in rel:
        parts += [
            "ผู้ป่วยดำเนินการบนข้อมูลของตนเองเท่านั้น (JWT `role=patient`) — จองนัด เข้าร่วมประชุม ดู PHR/EMR ที่แพทย์เผยแพร่แล้ว",
            "ลิงก์ Guest ต้องออกจาก **Patient Portal** เท่านั้น",
        ]
    elif "Doctor" in rel:
        parts += [
            "แพทย์เป็น **HOST** ของวิดีโอคอล: Admit lobby, บันทึก, จบประชุม, ตรวจสอบ AI Summary ก่อนลง EMR",
            "ผู้ดูแลระบบ (admin) จัดการ Pool นัด อนุมัติบัญชี และเนื้อหา — ไม่แทนแพทย์ในการลงนาม EMR",
        ]
    else:
        parts += [
            "Meeting Server รับ lobby, บันทึก, transcription, post-meeting pipeline (`postMeetingPipeline.js`)",
            "Production ใช้ `meet.jit.si` — บันทึกจากเบราว์เซอร์แพทย์ ไม่ใช่ Jibri",
        ]
    parts += [
        "",
        "### ลำดับความสัมพันธ์กับ workflow อื่น",
        "",
        "1. **นัดหมาย** — สถานะ `confirmed` ก่อนเปิดวิดีโอ (`Processes/Appointment_Workflows.md`)",
        "2. **ประชุม** — Izara Lobby → Jitsi → บันทึก → สรุป AI (`Processes/VIDEO_MEETING_JITSI_GEMINI.md`)",
        "3. **บันทึกทางการแพทย์** — EMR / สั่งยา / แล็บ หลังแพทย์ตรวจสอบ AI",
        "",
        "### การตรวจสอบคุณภาพ (QA)",
        "",
        "| ลำดับ | รายการตรวจ | วิธี |",
        "|------|------------|------|",
        "| 1 | UI แจ้งเตือน | ไม่มี toast error / banner แดง |",
        "| 2 | API | DevTools Network — status 2xx |",
        "| 3 | ทดสอบอัตโนมัติ | Playwright + data-testid ใน tests/SELECTORS.md |",
        "| 4 | เอกสาร | Word TH Sarabun New 16 pt / PPT FC Iconic จาก build-portal-user-guides.py |",
        "",
        "### ผลลัพธ์ที่คาดหวังหลังใช้งานหน้านี้",
        "",
        "- ผู้ใช้บรรลุวัตถุประสงค์ของหน้าโดยไม่ต้องขอความช่วยเหลือจากทีม IT",
        "- ข้อมูลที่บันทึกปรากฏบนแดชบอร์ด/PHR/EMR ตามสิทธิ์",
        "- เหตุการณ์สำคัญ (login, จองนัด, admit, จบประชุม) มี log ตรวจสอบได้ใน Cloud Logging",
        "",
        "**เอกสารอ้างอิงหลัก:**",
        "",
        "- `Processes/VIDEO_MEETING_JITSI_GEMINI.md` — วิดีโอ, lobby, บันทึก, AI",
        "- `Processes/Appointment_Workflows.md` — Pool และสถานะนัด",
        "- `docs/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md` — deploy และ runbook",
        "- `docs/USER_GUIDE_*_WORD_TH.docx` / `docs/USER_GUIDE_*_PPT_TH.pptx` — คู่มือผู้ใช้ฉบับสมบูรณ์",
        "",
        "### องค์ประกอบ UI หลัก (data-testid)",
        "",
    ]
    for tid in page_testids(stem, rel):
        parts.append(f"- {tid}")
    parts += [
        "",
        f"*(รุ่นเอกสารหน้านี้: {ENRICH_REV} — คู่มือ Word ตาราง+สารบัญ / PPT FC Iconic รายหน้าละเอียด v1.7.33)*",
    ]
    return "\n".join(parts)


def step_detail_bullets(step_text: str, rel: str, step_index: int = 0) -> list[str]:
    """Extra Thai operational detail per step (reporting standard)."""
    bullets = [
        "ดำเนินการบนหน้าจอจนจบขั้นนี้ — อย่าข้ามขั้นที่มีการยืนยัน (confirm/modal)",
        "บันทึก `appointmentId` / `meetingId` จาก URL หรือ Network tab หากต้องส่งต่อทีมสนับสนุน",
        f"ลำดับขั้นที่ {step_index} ต้องสำเร็จก่อนขั้นถัดไป — หากล้มเหลวให้จับภาพหน้าจอและ requestId จาก Cloud Logging",
        "จัดทำรายงาน/คู่มืออ้างอิง: Word ใช้ TH Sarabun New 16 pt (ระยะบรรทัด 1.15) — สไลด์ใช้ FC Iconic ตามมาตรฐานรายงานภาษาไทย",
    ]
    low = step_text.lower()
    if "jwt" in low or "login" in low or "เข้าสู่ระบบ" in step_text:
        bullets.append("ตรวจว่า session มี JWT และไม่ถูก redirect กลับหน้า login")
    if "lobby" in low or "admit" in low or "host-ready" in low:
        bullets.append("รอ Socket `host-ready` ก่อน mount Jitsi (Guest/Patient) — ป้องกันหน้าจอว่าง")
    if "save-recording" in low or "บันทึก" in step_text and "webm" in low:
        bullets.append("Response ต้องมี `recordingUrl` และ `postMeetingPipeline: queued`")
    if "emr" in low or "soap" in low:
        bullets.append("EMR จาก AI ต้อง `ai_summary_approved = false` จนแพทย์ตรวจและลงนาม")
    if "pdpa" in low or "consent" in low:
        bullets.append("การเปลี่ยนความยินยอมต้องปรากฏใน audit log — ห้ามแก้ย้อนหลัง")
    if "Patient-Portal" in rel and "guest" in low:
        bullets.append("ลิงก์ Guest ต้องมาจาก Patient Portal เท่านั้น — ไม่ใช่ URL แพทย์")
    return bullets


def replace_steps_block(text: str, steps: list[str], rel: str = "", stem: str = "") -> str:
    block_lines = [
        STEPS_MARKER,
        "",
        "**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)",
        "",
    ]
    for i, st in enumerate(steps, 1):
        block_lines.append(f"{i}. {st}")
        block_lines.append("   - **ปฏิบัติ:** ดำเนินการตาม UI/API จนเสร็จขั้นนี้")
        for b in step_detail_bullets(st, rel, i):
            block_lines.append(f"   - **รายละเอียด:** {b}")
        if "`" in st:
            block_lines.append("   - **UI:** ใช้ `data-testid` ที่ระบุในข้อความขั้นตอน")
        elif stem and i == 1:
            tids = page_testids(stem, rel)
            if tids:
                block_lines.append(f"   - **UI หลัก:** {', '.join(tids[:4])}")
        block_lines.append("   - **ตรวจสอบ:** ไม่มี error แดง / toast ล้มเหลว; HTTP 2xx บน API หลัก")
        block_lines.append("   - **อ้างอิงทดสอบ:** `tests/SELECTORS.md` + Playwright group ที่เกี่ยวข้อง")
    block_lines += [
        "",
        "### ผลลัพธ์ที่คาดหวัง (สรุป)",
        "",
        "- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)",
        "- ไม่มี HTTP 4xx/5xx บนฟังก์ชันหลักของหน้านี้",
        "- ข้อมูลใน PostgreSQL สอดคล้อง UI (เมื่อมีนัด/ประชุม/EMR)",
        "- `data-testid` ตรงกับ `tests/SELECTORS.md`",
        "",
        "### ข้อควรระวัง",
        "",
        "- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล",
        "- อย่าแชร์ลิงก์ประชุมหรือ JWT ทางช่องทางไม่ปลอดภัย",
        "- ผลลัพธ์ AI ไม่ใช่การวินิจฉัย — แพทย์ต้องตรวจก่อนลง EMR",
        "",
    ]
    new_block = "\n".join(block_lines)
    if STEPS_MARKER in text:
        pattern = re.compile(
            rf"{re.escape(STEPS_MARKER)}.*?(?=\n---\n|\n## Automated verification|\n## [^#]|\Z)",
            re.DOTALL,
        )
        return pattern.sub(new_block + "\n", text, count=1)
    if "## Automated verification" in text:
        return text.replace("---\n\n## Automated verification", new_block + "---\n\n## Automated verification")
    return text.rstrip() + "\n\n" + new_block


def enrich_file(md: Path, *, force_steps: bool = False) -> bool:
    text = md.read_text(encoding="utf-8")
    rel = str(md.relative_to(REPO)).replace("\\", "/")
    changed = False

    if DOC_STD_MARKER not in text:
        insert_at = text.find("\n---\n")
        if insert_at < 0:
            text = text.rstrip() + "\n\n" + DOC_STD
        else:
            text = text[:insert_at] + "\n\n" + DOC_STD + text[insert_at:]
        changed = True
    elif force_steps or ENRICH_REV not in text:
        synced = sync_doc_standard(text)
        if synced != text:
            text = synced
            changed = True

    if STEPS_MARKER not in text or force_steps:
        steps = steps_for_stem(md.stem, rel)
        new_text = replace_steps_block(text, steps, rel, md.stem)
        if new_text != text:
            text = new_text
            changed = True

    if EXPLAIN_MARKER not in text or force_steps:
        expl = explanation_for_stem(md.stem, rel)
        expl_block = f"{EXPLAIN_MARKER}\n\n{expl}\n\n"
        if EXPLAIN_MARKER in text:
            pattern = re.compile(
                rf"{re.escape(EXPLAIN_MARKER)}.*?(?=\n---\n|\n## Automated verification|\n## ขั้นตอน|\Z)",
                re.DOTALL,
            )
            new_text = pattern.sub(expl_block, text, count=1)
        elif STEPS_MARKER in text:
            new_text = text.replace(STEPS_MARKER, expl_block + STEPS_MARKER, 1)
        else:
            new_text = text.rstrip() + "\n\n" + expl_block
        if new_text != text:
            text = new_text
            changed = True

    if force_steps and not changed:
        # Content may match prior run — still bump revision marker in explanation
        if ENRICH_REV not in text and EXPLAIN_MARKER in text:
            text = text.replace(
                EXPLAIN_MARKER,
                f"{EXPLAIN_MARKER}\n\n> รุ่น {ENRICH_REV}\n",
                1,
            )
            changed = True

    if changed:
        md.write_text(text, encoding="utf-8")
    return changed


def main() -> int:
    import sys

    force_all = "--force-steps" in sys.argv
    n = 0
    for md in sorted(PAGES.rglob("*.md")):
        if md.name == "README.md":
            continue
        rel = str(md.relative_to(REPO)).replace("\\", "/")
        force = force_all  # --force-steps refreshes every page spec
        if enrich_file(md, force_steps=force):
            n += 1
            print(f"  enriched: {md.relative_to(REPO)}")
    print(f"Done — {n} files updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
