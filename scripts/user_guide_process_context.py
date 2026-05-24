# -*- coding: utf-8 -*-
"""Thai process/workflow context for user guides — aligned with Processes/ and GATE0."""

from __future__ import annotations

VERSION = "1.7.33"
DATE_TH = "24 พฤษภาคม 2569"

# Word: มาตรฐานรายงานภาษาไทย (TH Sarabun New 16 pt — กรมประชาสัมพันธ์ / ราชการ)
WORD_FONT = "TH Sarabun New"
WORD_BODY_PT = 16
WORD_H1_PT = 18
WORD_H2_PT = 16
WORD_TITLE_PT = 22
WORD_LINE_SPACING = 1.15

# PowerPoint: FC Iconic ตามที่ระบุสำหรับสไลด์นำเสนอ
PPT_FONT = "FC Iconic"
PPT_TITLE_PT = 32
PPT_SUBTITLE_PT = 22
PPT_BODY_PT = 18
PPT_NOTES_PT = 16

PATIENT_PROCESS_INTRO = """
คู่มือฉบับนี้จัดทำตาม**มาตรฐานการรายงานภาษาไทย**ของหน่วยงานราชการและสาธารณสุข:

| ประเภทเอกสาร | แบบอักษร | ขนาด |
|---|---|---|
| รายงาน / คู่มือ Word (`.docx`) | **TH Sarabun New** | เนื้อหา **16 pt**, หัวข้อ 18–22 pt, ระยะบรรทัด **1.15** |
| สไลด์นำเสนอ (`.pptx`) | **FC Iconic** | หัวข้อ **32 pt**, เนื้อหา **18 pt**, บันทึกวิทยากร **16 pt** |

ทุกหัวข้อในคู่มือมี **วัตถุประสงค์**, **ลำดับกระบวนการ**, **ขั้นตอนละเอียดต่อภาพ**, **ผลลัพธ์ที่คาดหวัง** และ **อ้างอิง Processes/**

**ขอบเขตกระบวนการ (อ้างอิง Processes/):**
- การเข้าสู่ระบบและ SSO (`Processes/Pages/Patient-Portal/`)
- จองนัดและ Appointment Pool (`Processes/Appointment_Workflows.md`)
- วิดีโอคอล Jitsi + Lobby + Guest (`Processes/VIDEO_MEETING_JITSI_GEMINI.md`)
- PHR / PDPA / Living Will
- การซิงค์ข้อมูล (`Processes/Data_Sync_Documentation.md`)
"""

DOCTOR_PROCESS_INTRO = """
คู่มือฉบับนี้จัดทำตาม**มาตรฐานการรายงานภาษาไทย** สำหรับพอร์ทัลแพทย์และผู้ดูแลระบบ (URL เดียวกัน แยกสิทธิ์ JWT):

| ประเภทเอกสาร | แบบอักษร | ขนาด |
|---|---|---|
| รายงาน / คู่มือ Word | **TH Sarabun New** | เนื้อหา **16 pt**, ระยะบรรทัด **1.15** |
| สไลด์นำเสนอ | **FC Iconic** | หัวข้อ **32 pt**, เนื้อหา **18 pt** |

แพทย์ = **HOST** ของการประชุม (Lobby, Admit, บันทึก, สรุป AI) — ผู้ดูแล = จัดสรร Pool และอนุมัติบัญชี

**ขอบเขตกระบวนการ (อ้างอิง Processes/):**
- ภาพรวมพอร์ทัล (`Processes/Pages/Doctor-Portal/00_Doctor_Portal_Overview.md`)
- GATE0: ผู้ป่วยจอง → Pool → แอดมินจัดสรร → แพทย์ยืนยัน → Health Meeting
- วิดีโอคอล, Guest link, บันทึก, EMR (`Processes/VIDEO_MEETING_JITSI_GEMINI.md`)
"""

# Section key → (purpose, workflow_steps, cautions, process_ref)
PATIENT_SECTIONS: dict[str, tuple[str, list[str], list[str], str]] = {
    "1. การเข้าสู่ระบบ": (
        "ให้ผู้ป่วยเข้าใช้ระบบอย่างปลอดภัย รองรับรหัสผ่านและ Google SSO ตาม PDPA",
        [
            "เปิด URL พอร์ทัลผู้ป่วย (Cloud dev-testing หรือ localhost:3005)",
            "ตรวจสอบใบรับรอง HTTPS และไม่แชร์รหัสผ่าน",
            "กรอกอีเมล/รหัสผ่าน หรือกด «ลงชื่อเข้าใช้ด้วย Google»",
            "หาก Google ยังไม่มีบัญชี — ระบบนำไปหน้าสมัครสมาชิก",
            "ล็อกอินสำเร็จ → JWT ถูกเก็บใน session → ไปแดชบอร์ด",
            "ตรวจ `dashboard-page` โหลด KPI และรายการนัด",
        ],
        [
            "บัญชี Google ต้องตรงกับอีเมลที่ลงทะเบียนแล้ว",
            "ผู้ใช้ใหม่ต้องสมัครก่อนใช้ SSO",
            "ออกจากระบบเมื่อใช้เครื่องสาธารณะ",
        ],
        "Processes/Pages/Patient-Portal/01_Login_Page.md",
    ),
    "2. สมัครสมาชิกและโปรไฟล์": (
        "สร้างบัญชีผู้ป่วยครั้งแรก พร้อมข้อมูลสุขภาพเบื้องต้น",
        [
            "เลือก «สมัครสมาชิก» จากหน้า login",
            "กรอกข้อมูลส่วนตัว ที่อยู่ และข้อมูลสุขภาพ (หลายขั้น)",
            "ยอมรับนโยบาย PDPA ที่จำเป็น",
            "ยืนยันรหัสผ่าน ≥ 8 ตัวอักษร",
            "ส่งแบบฟอร์ม — ระบบสร้าง `users` + `patient_profiles`",
            "เข้าสู่ระบบและตรวจ PHR ว่าสร้างแล้ว",
        ],
        ["ข้อมูลสุขภาพเป็นความละเอียดอ่อน — กรอกเท่าที่จำเป็น"],
        "Processes/Pages/Patient-Portal/02_Register_Page.md",
    ),
    "4. จองและติดตามนัดหมาย": (
        "กระบวนการจองนัดแบบ Wizard 3 ขั้น ส่งเข้า Appointment Pool เมื่อไม่ระบุแพทย์",
        [
            "ขั้น 1: เลือกประเภทนัด (ออนไลน์/ที่โรงพยาบาล)",
            "ขั้น 2: กรอกอาการ ≥10 ตัวอักษร + ความเร่งด่วน + วันเวลา",
            "ขั้น 3: เลือกแพทย์หรือ «ให้ระบบจัดสรร» → ยืนยัน",
            "สถานะเริ่มต้น: `pending` หรือ `in_pool`",
            "รอแอดมินจัดสรรแพทย์ หรือแพทย์ยืนยัน → `confirmed`",
            "เมื่อ confirmed — ปุ่มเข้าร่วมวิดีโอคอลจะเปิดใช้งาน",
        ],
        ["อาการส่งถึงแพทย์และ Pool — ห้ามกรอกข้อมูลละเอียดอ่อนเกินจำเป็น"],
        "Processes/Appointment_Workflows.md — Patient booking",
    ),
    "5. วิดีโอคอลและ Lobby": (
        "Telehealth ผ่าน meet.jit.si + Izara Lobby แบบ Teams — แพทย์เป็น HOST อนุมัติผู้เข้าร่วม",
        [
            "เปิดนัดที่สถานะ `confirmed` → กดเข้าร่วมประชุม",
            "อ่านและยอมรับข้อตกลง telemedicine (`WF15a`)",
            "หน้า pre-join: ตรวจชื่อ กล้อง ไมค์ → เข้า Lobby",
            "รอในห้อง Lobby (`lobby-waiting-screen`) จนแพทย์กด Admit",
            "หลัง Admit — เข้า Jitsi; อนุญาตกล้อง/ไมค์",
            "ญาติ (Guest): ใช้ลิงก์ `guestJoinUrl` จากแพทย์ → รอ Lobby → รอ host-ready → วิดีโอ",
            "จบการประชุม — ดูสรุป AI (ถ้ามี) บนแดชบอร์ด/ผลการประชุม",
        ],
        [
            "อย่าแชร์ลิงก์ห้องประชุมสาธารณะ",
            "Guest ต้องผ่านการอนุมัติจากแพทย์และรอแพทย์เริ่มห้อง (host-ready)",
            "ลิงก์เชิญมาจาก meeting server เท่านั้น (ไม่ใช่ URL แพทย์)",
        ],
        "Processes/VIDEO_MEETING_JITSI_GEMINI.md",
    ),
    "3. ทุกหน้าในระบบ (Group B)": (
        "สำรวจทุกเมนูผู้ป่วยตามลำดับ UI test Group B",
        [
            "ใช้ Sidebar ไม่ใช้ URL ตรงเพื่อจำลองผู้ใช้จริง",
            "ตรวจ Dashboard, Appointments, PHR, AI Doctor, Map, PDPA, Settings",
            "ทุกหน้าต้องโหลดเนื้อหา > 50 ตัวอักษร",
            "ตรวจ `data-testid` ตาม `tests/SELECTORS.md`",
        ],
        ["อย่าข้าม PDPA ก่อนจองนัดที่ต้องแชร์ข้อมูล"],
        "Processes/Pages/Patient-Portal/",
    ),
    "6. PDPA และหนังสือแสดงเจตนา": (
        "จัดการความยินยอมและ audit log แบบไม่แก้ไขย้อนหลัง",
        [
            "เปิดเมนู PDPA → อ่านคำอธิบายแต่ละประเภท",
            "สลับ `pdpa-consent-toggle-*` ตามต้องการ",
            "ตรวจแท็บ Audit (`pdpa-audit-log`) — บันทึก read-only",
            "บันทึก Living Will พร้อมลายมือชื่อดิจิทัล",
            "เลือกแชร์ให้แพทย์ที่ดูแล",
        ],
        ["การเพิกถอนความยินยอมมีผลทันทีตาม PDPA"],
        "Processes/Pages/Patient-Portal/10_PDPA_Page.md",
    ),
    "7. PHR และข้อมูลสุขภาพ": (
        "Personal Health Record — ผู้ป่วยดูและอัปเดตข้อมูลที่อนุญาต",
        [
            "เปิด PHR จากเมนูหลัก",
            "เลือกแท็บ Vitals, ยา, แพ้ยา, โรคประจำตัว",
            "อัปเดตค่าที่อนุญาต — ระบบซิงค์ไปแพทย์ตาม consent",
            "ตรวจ Timeline หลังการปรึกษา",
        ],
        ["แพทย์เห็นเฉพาะข้อมูลที่ผู้ป่วยยินยอม"],
        "Processes/Pages/Patient-Portal/06_PHR_Page.md",
    ),
    "10. เวิร์กโฟลว์ครบวงจร": (
        "ทดสอบเส้นทาง GATE0 ตั้งแต่จองจนจบการประชุม",
        [
            "จองนัด → in_pool หรือระบุแพทย์",
            "แอดมินจัดสรร (ถ้า in_pool) → แพทย์ confirm",
            "เข้าวิดีโอคอล → Lobby → Jitsi → จบ",
            "ตรวจสถานะ `completed` และสรุป AI",
        ],
        ["ใช้บัญชีทดสอบที่ผ่าน cleanup แล้วเท่านั้น"],
        "Processes/FULL_WORKFLOW_CONTRACT.md",
    ),
}

DOCTOR_SECTIONS: dict[str, tuple[str, list[str], list[str], str]] = {
    "A0. การเข้าสู่ระบบ": (
        "แพทย์และผู้ดูแลใช้พอร์ทัลเดียวกัน แยกสิทธิ์ด้วย JWT role",
        [
            "เปิด URL พอร์ทัลแพทย์ (Cloud dev-testing หรือ localhost:8080)",
            "แพทย์ใหม่: สมัคร → รอ Admin อนุมัติ → ล็อกอินได้",
            "Admin: ล็อกอินด้วยบัญชี admin — เห็นเมนู Pool และอนุมัติ",
            "Google SSO: ใช้อีเมลที่ลงทะเบียนแล้ว",
            "ตรวจ redirect ไป `/doctor/:id/dashboard`",
        ],
        ["แพทย์ที่ยัง pending จะไม่เห็นเมนูคลินิกเต็มรูปแบบ"],
        "Processes/Pages/Doctor-Portal/01_Login_Page.md",
    ),
    "B4. Appointment Pool และคิว": (
        "GATE0: นัด in_pool → Admin assign แพทย์ → แพทย์ confirm → คิว Health Meeting",
        [
            "ผู้ป่วยจองเข้า Pool (หรือระบุแพทย์ตั้งแต่แรก)",
            "Admin เปิด Appointment Pool Management → เลือกนัด → Assign แพทย์",
            "แพทย์ได้แจ้งเตือน realtime → เปิดคิว → Confirm",
            "สถานะ `confirmed` — แสดงใน Health Meeting",
            "เริ่มวิดีโอคอลจากนัดที่ยืนยัน",
        ],
        ["ตัวเลขคิวต้องซิงค์ระหว่าง Admin และ Doctor (Socket.IO)"],
        "Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md",
    ),
    "A5. วิดีโอคอลและ Lobby": (
        "แพทย์เป็น HOST: สร้างห้อง → notifyHostPresent → Admit → บันทึก → สรุป AI",
        [
            "สร้าง meeting จาก Health Meeting หรือนัด confirmed",
            "ยอมรับข้อตกลง telemedicine → pre-join",
            "เข้า Jitsi ก่อน — ระบบตั้ง host-ready",
            "Lobby panel: รายชื่อรอ — แยก badge Guest/Patient",
            "กด Admit รายคน หรือ `admit-all-btn`",
            "เชิญ Guest: `guest-invite` → คัดลอก `guestJoinUrl` (patient portal)",
            "บันทึกการประชุม → จบ → `save-recording` → `/end` + generateSummary",
            "Meeting Results: playback, `generate-summary-btn`, เปิด EMR",
        ],
        [
            "Guest link จาก API เท่านั้น — ไม่ hardcode doctor-origin",
            "รอ save-recording ก่อน navigate ไปหน้าผล",
        ],
        "Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md",
    ),
    "A2. บทบาทแพทย์ — หน้าหลัก": (
        "เมนูและแดชบอร์ดสำหรับแพทย์ที่ได้รับอนุมัติแล้ว",
        [
            "ล็อกอินด้วย Doctor ที่ approved",
            "เปิด Dashboard — KPI คิว นัดวันนี้",
            "เปิด Health Meeting — รายการรอรับ",
            "เปิด Schedule / Patient Management ตามลำดับงาน",
        ],
        ["แพทย์ pending ไม่เห็นเมนูคลินิกเต็มรูปแบบ"],
        "Processes/Pages/Doctor-Portal/03_Dashboard_Page.md",
    ),
    "A3. ทุกหน้าในระบบ (Group C)": (
        "สำรวจเมนูแพทย์/แอดมิน — ตาราง ผู้ป่วย เนื้อหา ทรัพยากร",
        [
            "ล็อกอินด้วย Doctor vs Admin เพื่อตรวจสิทธิ์เมนู",
            "เปิด Schedule, Patient Management, Medical Content",
            "Admin: Doctors Management, Appointment Pool",
            "ตรวจแต่ละหน้าโหลดเนื้อหาและไม่มี error หลัก",
        ],
        ["Admin เท่านั้นที่จัดสรร Pool ให้แพทย์"],
        "Processes/Pages/Doctor-Portal/",
    ),
    "A4. ผู้ป่วยและการรักษา": (
        "Patient Record, สั่งยา, แล็บ, สร้างนัดประชุม",
        [
            "เลือกผู้ป่วยจากคิวหรือ Patient Management",
            "เปิด Patient Record Viewer — PHR, EMR, แล็บ",
            "สร้างนัด/ห้องประชุมจาก Health Meeting",
            "เลือก Clinical actions: Rx, Lab, Meeting",
        ],
        ["ตรวจ allergy ก่อนสั่งยา"],
        "Processes/Pages/Doctor-Portal/05_Patient_Management_Page.md",
    ),
    "A4. คลินิกและ PHR (Group F)": (
        "EMR หลังประชุม แล็บ และ PHR ฝั่งผู้ป่วย",
        [
            "เปิด Patient Record Viewer",
            "ตรวจ lab results และ PHR sync",
            "ยืนยันผู้ป่วยเห็นเฉพาะข้อมูลที่อนุมัติ",
            "Insert สรุป AI จาก Dashboard → EMR",
        ],
        ["ห้ามแสดง CDS ภายในให้ผู้ป่วย"],
        "Processes/Pages/Doctor-Portal/08_EMR_Editor.md",
    ),
    "B2. บทบาทผู้ดูแล — หน้าหลัก": (
        "ผู้ดูแลระบบ — อนุมัติแพทย์ จัดการ Pool และเนื้อหา",
        [
            "ล็อกอิน Admin",
            "เปิด Doctors Management — อนุมัติแพทย์ใหม่",
            "เปิด Appointment Pool — จัดสรรนัด",
            "เปิด Medical Content — อนุมัติบทความ",
        ],
        ["Admin ไม่ทำหน้าที่วินิจฉัยแทนแพทย์"],
        "Processes/Pages/Doctor-Portal/18_Admin_Doctor_Management.md",
    ),
    "B6. เวิร์กโฟลว์ครบวงจร": (
        "WF ครบวงจรฝั่งแพทย์/แอดมิน",
        [
            "Pool assign → doctor confirm → meeting",
            "Lobby admit → Jitsi → end → AI summary",
            "Validate summary → EMR",
        ],
        ["ใช้ข้อมูลหลัง cleanup E2E"],
        "Processes/FULL_WORKFLOW_CONTRACT.md",
    ),
}


def _default_section(portal: str, section: str) -> tuple[str, list[str], list[str], str]:
    if portal == "patient":
        return (
            f"หมวด «{section}» ครอบคลุมฟังก์ชันผู้ป่วยตามเมนูและ UI test ที่ผ่าน",
            [
                "เข้าสู่ระบบด้วยบัญชีผู้ป่วยที่ลงทะเบียนแล้ว",
                "เปิดเมนูที่เกี่ยวข้องกับหมวดนี้จาก Sidebar",
                "ดำเนินการตามขั้นตอนในแต่ละภาพหน้าจอทีละขั้น",
                "ตรวจสอบข้อความแจ้งเตือน สถานะ API และ `data-testid`",
                "ยืนยันผลลัพธ์กับ Processes/Pages ที่อ้างอิง",
                "บันทึกหรือดำเนินขั้นถัดไปตาม workflow",
            ],
            [
                "ข้อมูลสุขภาพเป็นความลับ — อย่าแชร์รหัสผ่าน",
                "AI ให้คำแนะนำเบื้องต้น ไม่ใช่การวินิจฉัย",
            ],
            "Processes/Pages/Patient-Portal/",
        )
    return (
        f"หมวด «{section}» สำหรับแพทย์หรือผู้ดูแล ตามสิทธิ์ JWT",
        [
            "ล็อกอินด้วยบทบาทที่ถูกต้อง (Doctor / Admin)",
            "เปิดเมนูตามหมวดและตรวจ KPI/คิว",
            "ดำเนินการคลินิกหรือการจัดการตามภาพ",
            "ตรวจสอบ realtime sync และสถานะนัด",
            "ยืนยันผลลัพธ์กับ Processes/Pages",
            "ส่งต่อ EMR/สรุป AI หลังประชุม (ถ้าเกี่ยวข้อง)",
        ],
        ["Admin เท่านั้นที่จัดสรร Pool ให้แพทย์", "แพทย์ยืนยันนัด — ไม่ใช่ Admin"],
        "Processes/Pages/Doctor-Portal/",
    )


def section_context(portal: str, section: str) -> tuple[str, list[str], list[str], str]:
    table = PATIENT_SECTIONS if portal == "patient" else DOCTOR_SECTIONS
    return table.get(section) or _default_section(portal, section)
