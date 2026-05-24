# -*- coding: utf-8 -*-
"""Thai metadata catalog for UI test screenshots — patient vs doctor/admin portals."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Portal = Literal["patient", "doctor"]

PATIENT_URL = (
    "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
)
DOCTOR_URL = (
    "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
)
VERSION = "1.7.32"
DATE_TH = "23 พฤษภาคม 2569"


@dataclass
class Shot:
    path: str  # relative to repo root, e.g. docs/screenshots/group-A/...
    title: str
    section: str
    steps: list[str]
    screen: str
    script: str
    portal: Portal = "patient"


def _s(
    path: str,
    title: str,
    section: str,
    steps: list[str],
    screen: str,
    script: str,
    portal: Portal = "patient",
) -> Shot:
    return Shot(path, title, section, steps, screen, script, portal)


# ─── Patient Portal (ordered by user journey + UI test groups) ───────────────

PATIENT_SHOTS: list[Shot] = [
    # Group A — Auth & access
    _s(
        "docs/screenshots/workflows/auth-login/WF01-patient-login-page.png",
        "หน้าเข้าสู่ระบบผู้ป่วย",
        "1. การเข้าสู่ระบบ",
        [
            "เปิด URL พอร์ทัลผู้ป่วยในเบราว์เซอร์ Chrome หรือ Edge",
            "กรอกอีเมลและรหัสผ่าน หรือเลือกลงชื่อเข้าใช้ด้วย Google",
            "กดปุ่ม «เข้าสู่ระบบ»",
        ],
        "แสดงฟอร์มอีเมล/รหัสผ่าน ลิงก์สมัครสมาชิก และปุ่ม Google Sign-In",
        "เริ่มต้นที่หน้าเข้าสู่ระบบ ผู้ป่วยกรอกข้อมูลหรือใช้ Google ตามที่ลงทะเบียนไว้",
    ),
    _s(
        "docs/screenshots/sso/patient-login-with-google.png",
        "ลงชื่อเข้าใช้ด้วย Google (ผู้ป่วย)",
        "1. การเข้าสู่ระบบ",
        [
            "รอให้ปุ่ม Google โหลดเสร็จ",
            "กด «ลงชื่อเข้าใช้ด้วย Google» และเลือกบัญชี",
            "อนุญาตการเข้าถึงชื่อและอีเมล",
        ],
        "ปุ่ม Google แสดงใต้ฟอร์มอีเมล/รหัสผ่าน",
        "SSO ช่วยลดขั้นตอนล็อกอิน แต่ต้องสมัครด้วยอีเมลเดียวกันก่อน",
    ),
    _s(
        "docs/screenshots/sso/sso-redirect-to-register.png",
        "กรณี Google ยังไม่มีบัญชี — ไปหน้าสมัคร",
        "1. การเข้าสู่ระบบ",
        [
            "ลองล็อกอินด้วย Google ที่ยังไม่เคยสมัคร",
            "อ่านข้อความแจ้งบนหน้าจอ",
            "กรอกแบบฟอร์มสมัครสมาชิกให้ครบ",
        ],
        "ระบบนำทางไปหน้าสมัครพร้อมข้อความแจ้ง",
        "ป้องกันบัญชีคนแปลกปลอม — ต้องลงทะเบียนก่อนใช้ Google",
    ),
    _s(
        "docs/screenshots/group-A/A01-patient-dashboard.png",
        "แดชบอร์ดหลักหลังเข้าสู่ระบบ",
        "2. แดชบอร์ดและเมนู",
        [
            "เข้าสู่ระบบสำเร็จ — ระบบเปิดหน้า «หน้าหลัก»",
            "ตรวจสอบข้อความต้อนรับและนัดหมายที่กำลังจะมาถึง",
            "ใช้ปุ่มดำเนินการด่วนจองนัดหรือดู PHR",
        ],
        "แสดงชื่อผู้ป่วย นัดใกล้ถึง และปุ่มลัด",
        "นี่คือศูนย์กลางการใช้งานประจำวันของผู้ป่วย",
    ),
    _s(
        "docs/screenshots/group-A/A09-patient-stats.png",
        "การ์ดสถิติสุขภาพบนแดชบอร์ด",
        "2. แดชบอร์ดและเมนู",
        [
            "เลื่อนดูการ์ดสรุปบนแดชบอร์ด",
            "ตรวจจำนวนนัดรอ/เสร็จ และข้อมูลสุขภาพล่าสุด",
        ],
        "การ์ด KPI สุขภาพและนัดหมายอัปเดตจากฐานข้อมูลจริง",
        "ช่วยให้ผู้ป่วยเห็นภาพรวมโดยไม่ต้องเปิดหลายเมนู",
    ),
    _s(
        "docs/screenshots/group-A/A02-patient-sidebar.png",
        "เมนูนำทาง 10 รายการ (Sidebar)",
        "2. แดชบอร์ดและเมนู",
        [
            "ดูแถบเมนูด้านซ้ายครบทุกรายการ",
            "คลิกเมนูเพื่อไปหน้าที่ต้องการ — รายการปัจจุบันไฮไลต์",
        ],
        "Home, นัดหมาย, AI, คลังความรู้, PHR, Timeline, แผนที่, ค้นหาแพทย์, PDPA, ตั้งค่า",
        "การนำทางต่อเนื่องทดสอบใน Group B — ไม่ต้องกลับหน้าหลักทุกครั้ง",
    ),
    # Group B — All pages
    _s("docs/screenshots/group-B/B01-dashboard.png", "หน้าหลัก (Dashboard)", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «หน้าหลัก»"], "สรุปนัดและทางลัด", "ยืนยันหน้าโหลดครบถ้วน"),
    _s("docs/screenshots/group-B/B02-appointments.png", "หน้านัดหมาย", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «นัดหมาย»"], "รายการนัดและปุ่มจอง", "จุดเริ่มจองและติดตามนัด"),
    _s("docs/screenshots/group-B/B03-ai-doctor.png", "ปรึกษา AI Doctor", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «ปรึกษา AI»"], "ช่องกรอกอาการและพื้นที่สนทนา", "ประเมินอาการเบื้องต้นก่อนพบแพทย์"),
    _s("docs/screenshots/group-B/B04-health-library.png", "คลังความรู้สุขภาพ", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «คลังความรู้»"], "บทความและหมวดหมู่", "เนื้อหาที่แพทย์และผู้ดูแลอนุมัติ"),
    _s("docs/screenshots/group-B/B05-phr.png", "ประวัติสุขภาพ PHR", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «ประวัติสุขภาพ»"], "แท็บภาพรวม สัญญาณชีพ ยา แพ้", "บันทึกข้อมูลส่วนตัวตาม PDPA"),
    _s("docs/screenshots/group-B/B06-timeline.png", "เส้นทางสุขภาพ (Timeline)", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «เส้นทางสุขภาพ»"], "ไทม์ไลน์เหตุการณ์รักษา", "ดูประวัติย้อนหลังตามเวลา"),
    _s("docs/screenshots/group-B/B07-map.png", "แผนที่สถานพยาบาล", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «แผนที่»"], "แผนที่และรายการสถานพยาบาล", "ค้นหาสถานพยาบาลใกล้ตัว"),
    _s("docs/screenshots/group-B/B08-find-doctors.png", "ค้นหาแพทย์", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «ค้นหาแพทย์»"], "รายการแพทย์และตัวกรอง", "เลือกแพทย์ก่อนจองนัด"),
    _s("docs/screenshots/group-B/B09-pdpa.png", "PDPA และหนังสือแสดงเจตนา", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «PDPA»"], "แท็บความยินยอมและ Living Will", "ควบคุมความเป็นส่วนตัวตามกฎหมาย"),
    _s("docs/screenshots/group-B/B10-settings.png", "ตั้งค่า", "3. ทุกหน้าในระบบ (Group B)", ["คลิกเมนู «ตั้งค่า»"], "ภาษา ธีม การแจ้งเตือน", "ปรับประสบการณ์ใช้งาน"),
    _s("docs/screenshots/group-B/B11-profile.png", "โปรไฟล์ผู้ป่วย", "3. ทุกหน้าในระบบ (Group B)", ["เปิดหน้าโปรไฟล์จากตั้งค่าหรือเมนูผู้ใช้"], "ชื่อ อีเมล โทรศัพท์", "ตรวจสอบข้อมูลติดต่อ"),
    # Group D — Booking
    _s("docs/screenshots/group-D/D01-appointments-list.png", "รายการนัดหมาย — แท็บกรอง", "4. จองและติดตามนัดหมาย", ["เปิดเมนูนัดหมาย", "เลือกแท็บ Pending / All / Confirmed / Completed"], "รายการนัดพร้อมป้ายสถานะ", "กรองตามสถานะได้ทันที"),
    _s("docs/screenshots/group-D/D02-all-appointments.png", "แท็บ «ทั้งหมด»", "4. จองและติดตามนัดหมาย", ["คลิกแท็บ All"], "แสดงนัดทุกสถานะรวมกัน", "ภาพรวมนัดทั้งหมด"),
    _s("docs/screenshots/group-D/D03-booking-wizard.png", "ตัวช่วยจองนัด — ขั้นที่ 1", "4. จองและติดตามนัดหมาย", ["กด «จองนัดหมายใหม่»", "เลือกประเภทออนไลน์หรือที่โรงพยาบาล"], "ตัวบอกขั้นตอน 3 ขั้น", "Wizard ช่วยไม่พลาดขั้นตอน"),
    _s("docs/screenshots/group-D/D04-symptoms-filled.png", "กรอกอาการและความเร่งด่วน", "4. จองและติดตามนัดหมาย", ["กรอกอาการอย่างน้อย 10 ตัวอักษร", "เลือกระดับความเร่งด่วนและวันเวลา", "กดถัดไป"], "ฟอร์มอาการครบ", "ข้อมูลนี้ส่งให้แพทย์และ Pool"),
    _s("docs/screenshots/group-D/D05-doctor-selection.png", "เลือกแพทย์", "4. จองและติดตามนัดหมาย", ["ดูการ์ดแพทย์", "เลือกแพทย์หรือ «ให้ระบบจัดสรร»"], "รายการแพทย์พร้อมเวลาว่าง", "ไม่ระบุแพทย์จะเข้า Appointment Pool"),
    _s("docs/screenshots/group-D/D06-doctor-selected.png", "ยืนยันแพทย์ที่เลือก", "4. จองและติดตามนัดหมาย", ["คลิกการ์ดแพทย์ — มีกรอบเน้น", "กดถัดไป"], "แพทย์ที่เลือกชัดเจน", "ลดความผิดพลาดก่อนส่งคำขอ"),
    _s("docs/screenshots/group-D/D07-submitted.png", "ส่งคำขอนัดสำเร็จ", "4. จองและติดตามนัดหมาย", ["ตรวจสอบสรุป", "กดยืนยันและส่ง"], "ข้อความสำเร็จและรหัสนัด", "สถานะเริ่ม pending หรือ in_pool"),
    _s("docs/screenshots/group-D/D08-appointments-after-book.png", "รายการนัดหลังจอง", "4. จองและติดตามนัดหมาย", ["กลับหน้านัดหมาย"], "นัดใหม่ปรากฏในรายการ", "ติดตามสถานะแบบเรียลไทม์"),
    _s("docs/screenshots/group-E/E13-appointments-real-data.png", "นัดหมายข้อมูลจริงจากระบบ", "4. จองและติดตามนัดหมาย", ["รีเฟรชหน้านัดหมาย"], "ข้อมูลจาก PostgreSQL จริง", "ไม่ใช่ข้อมูลจำลอง"),
    _s("docs/screenshots/group-E/E14-appointment-list.png", "รายละเอียดรายการนัด", "4. จองและติดตามนัดหมาย", ["คลิกนัดที่ต้องการ"], "รายละเอียดและปุ่มเข้าร่วม", "ใช้เมื่อนัด confirmed"),
    _s("docs/screenshots/group-E/E15-patient-meeting-access.png", "ปุ่มเข้าร่วมวิดีโอคอล", "5. วิดีโอคอลและ Lobby", ["เปิดนัดที่ยืนยันแล้ว", "กดเข้าร่วมประชุม"], "ปุ่ม Join สีเขียว", "ต้องอนุญาตกล้อง/ไมค์"),
    _s("docs/screenshots/group-E/E10c0-patient-waiting-before-host.png", "รอแพทย์ในห้อง Lobby", "5. วิดีโอคอลและ Lobby", ["เข้าห้องก่อนแพทย์"], "สถานะ waiting to be admitted", "ความปลอดภัยแบบ Teams Lobby"),
    _s("docs/screenshots/group-E/E10d-patient-meeting-lobby.png", "ห้อง Lobby ผู้ป่วย", "5. วิดีโอคอลและ Lobby", ["รอจนแพทย์กด Admit"], "หน้าจอรออนุมัติ", "แพทย์ควบคุมการเข้าห้อง"),
    _s("docs/screenshots/group-J-meeting-jitsi/E10d-patient-jitsi-meet.png", "ห้องประชุม Jitsi (ผู้ป่วย)", "5. วิดีโอคอลและ Lobby", ["หลังได้รับอนุมัติจาก Lobby"], "วิดีโอ แชท แชร์หน้าจอ", "ปรึกษาแพทย์แบบเรียลไทม์"),
    _s("docs/screenshots/workflows/video-meeting/WF15a-patient-agreement.png", "ข้อตกลงก่อนเข้าห้อง (ผู้ป่วย)", "5. วิดีโอคอลและ Lobby", ["อ่านข้อตกลง", "กดยอมรับ"], "หน้าตกลงการใช้บริการ", "ตามมาตรฐาน telemedicine"),
    _s("docs/screenshots/workflows/video-meeting/WF15b-patient-pre-join-invite.png", "หน้าก่อนเข้าห้อง — ลิงก์เชิญ", "5. วิดีโอคอลและ Lobby", ["ตรวจชื่อแสดงและอุปกรณ์", "กดเข้าร่วม"], "พรี-จอยน์พร้อมลิงก์", "รองรับ guest invite"),
    _s("docs/screenshots/workflows/video-meeting/WF16-meeting-ended-ai-summary.png", "สรุปหลังจบการประชุม + AI", "5. วิดีโอคอลและ Lobby", ["จบการประชุม"], "สรุป AI และบันทึก", "ช่วยผู้ป่วยทบทวนคำแนะนำ"),
    _s("docs/screenshots/group-E/E29-guests-before-host.png", "ผู้เชิญรอในห้อง (มุมผู้ป่วย)", "5. วิดีโอคอลและ Lobby", ["มี guest ใน lobby"], "รายชื่อผู้รอ", "ญาติเข้าร่วมได้เมื่อแพทย์อนุมัติ"),
    # Group F — PHR
    _s("docs/screenshots/group-F/F01-phr-page.png", "หน้า PHR ภาพรวม", "6. ประวัติสุขภาพ (PHR)", ["เปิดเมนู PHR"], "แท็บและสรุปข้อมูล", "ศูนย์กลางข้อมูลสุขภาพส่วนตัว"),
    _s("docs/screenshots/group-F/F02-phr-tabs-explored.png", "สำรวจทุกแท็บ PHR", "6. ประวัติสุขภาพ (PHR)", ["คลิกแต่ละแท็บ"], "สัญญาณชีพ ยา แพ้ แล็บ", "ข้อมูลครบในที่เดียว"),
    _s("docs/screenshots/group-F/F03-vital-signs-tab.png", "แท็บสัญญาณชีพ", "6. ประวัติสุขภาพ (PHR)", ["เลือกแท็บสัญญาณชีพ"], "ตารางค่าสุขภาพ", "ติดตามความดัน ชีพจร ฯลฯ"),
    _s("docs/screenshots/group-F/F04-vital-form-open.png", "เปิดฟอร์มบันทึกสัญญาณชีพ", "6. ประวัติสุขภาพ (PHR)", ["กดเพิ่ม/บันทึกค่าใหม่"], "ฟอร์มกรอกค่า", "บันทึกด้วยตนเอง"),
    _s("docs/screenshots/group-F/F05-vitals-filled.png", "กรอกค่าสัญญาณชีพ", "6. ประวัติสุขภาพ (PHR)", ["กรอกตัวเลขครบ", "กดบันทึก"], "ฟอร์มก่อนบันทึก", "ตรวจสอบความถูกต้อง"),
    _s("docs/screenshots/group-F/F06-vitals-saved.png", "บันทึกสัญญาณชีพสำเร็จ", "6. ประวัติสุขภาพ (PHR)", ["ยืนยันการบันทึก"], "ค่าใหม่ในรายการ", "แพทย์เห็นเมื่อเปิดเวชระเบียน"),
    _s("docs/screenshots/group-F/F07-medications-tab.png", "แท็บยา", "6. ประวัติสุขภาพ (PHR)", ["เปิดแท็บยา"], "รายการยาประจำ", "แจ้งแพทย์ก่อนจ่ายยาใหม่"),
    _s("docs/screenshots/group-F/F08-allergies-tab.png", "แท็บแพ้ยา/สาร", "6. ประวัติสุขภาพ (PHR)", ["เปิดแท็บแพ้"], "รายการสิ่งที่แพ้", "สำคัญต่อความปลอดภัย"),
    _s("docs/screenshots/group-F/F09-lab-results-tab.png", "แท็บผลแล็บ", "6. ประวัติสุขภาพ (PHR)", ["เปิดแท็บผลแล็บ"], "ผลตรวจย้อนหลัง", "อ้างอิงก่อนพบแพทย์"),
    _s("docs/screenshots/group-F/F14-phr-overview-data.png", "ภาพรวม PHR พร้อมข้อมูล", "6. ประวัติสุขภาพ (PHR)", ["กลับแท็บภาพรวม"], "สรุปรวมทุกหมวด", "ข้อมูล sync กับแพทย์"),
    # Group G — PDPA / Living Will
    _s("docs/screenshots/group-G/G01-pdpa-page.png", "หน้า PDPA", "7. PDPA และหนังสือแสดงเจตนา", ["เปิดเมนู PDPA"], "นโยบายและสิทธิ", "ตาม พ.ร.บ. คุ้มครองข้อมูล"),
    _s("docs/screenshots/group-G/G02-pdpa-tabs.png", "แท็บความยินยอม PDPA", "7. PDPA และหนังสือแสดงเจตนา", ["สลับแท็บยินยอม"], "รายการ consent", "ควบคุมการแชร์ข้อมูล"),
    _s("docs/screenshots/group-G/G03-privacy-toggles.png", "สวิตช์ความเป็นส่วนตัว", "7. PDPA และหนังสือแสดงเจตนา", ["เปิด/ปิดการแชร์"], "toggle ต่อหัวข้อ", "เปลี่ยนได้ตลอด"),
    _s("docs/screenshots/group-G/G04-living-will.png", "หนังสือแสดงเจตนา — เริ่มต้น", "7. PDPA และหนังสือแสดงเจตนา", ["เลือกทำ Living Will"], "ตัวช่วย 3 ขั้น", "บันทึกเจตจำนงการรักษา"),
    _s("docs/screenshots/group-G/G05-step1-representatives.png", "ขั้น 1 — ผู้แทน", "7. PDPA และหนังสือแสดงเจตนา", ["กรอกผู้แทนโดยชอบธรรม"], "รายชื่อผู้ติดต่อ", "ใช้เมื่อไม่สามารถตัดสินใจเอง"),
    _s("docs/screenshots/group-G/G06-step2-treatments.png", "ขั้น 2 — การรักษา", "7. PDPA และหนังสือแสดงเจตนา", ["เลือกแนวทางการรักษา"], "ตัวเลือกการรักษา", "ชัดเจนตามความต้องการ"),
    _s("docs/screenshots/group-G/G07-treatment-prefs.png", "ความชอบการรักษา", "7. PDPA และหนังสือแสดงเจตนา", ["ระบุรายละเอียด"], "ค่าที่เลือกแล้ว", "ลดความคลุมเครือ"),
    _s("docs/screenshots/group-G/G08-step3-signature.png", "ขั้น 3 — ลายเซ็น", "7. PDPA และหนังสือแสดงเจตนา", ["ลงลายเซ็นดิจิทัล"], "พื้นที่เซ็น", "ยืนยันความถูกต้อง"),
    _s("docs/screenshots/group-G/G09-living-will-saved.png", "บันทึก Living Will สำเร็จ", "7. PDPA และหนังสือแสดงเจตนา", ["กดบันทึก"], "ข้อความยืนยัน", "เก็บในฐานข้อมูลปลอดภัย"),
    _s("docs/screenshots/group-G/G13-patient-appointments.png", "นัดหมายจากมุม PDPA flow", "7. PDPA และหนังสือแสดงเจตนา", ["กลับตรวจนัด"], "เชื่อมโยงกับเมนูนัด", "workflow ต่อเนื่อง"),
    # Group J — AI, Timeline, Map, Doctors
    _s("docs/screenshots/group-J/J01-ai-doctor.png", "AI Doctor — หน้าแรก", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เปิดปรึกษา AI"], "ช่องแชท", "ไม่ใช่การวินิจฉัย — คำแนะนำเบื้องต้น"),
    _s("docs/screenshots/group-J/J02-symptom-typed.png", "กรอกอาการใน AI", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["พิมพ์อาการ"], "ข้อความในช่อง", "Gemini วิเคราะห์อาการ"),
    _s("docs/screenshots/group-J/J03-ai-response.png", "คำตอบจาก AI", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["รอคำตอบ"], "คำแนะนำและคำเตือน", "ควรพบแพทย์หากรุนแรง"),
    _s("docs/screenshots/group-J/J04-response-check.png", "ตรวจสอบคำตอบ AI", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["อ่านคำเตือน"], "ข้อความครบ", "บันทึกหรือจองนัดต่อ"),
    _s("docs/screenshots/group-J/J05-timeline.png", "เส้นทางสุขภาพ", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เปิด Timeline"], "เหตุการณ์เรียงเวลา", "นัด ยา แล็บ รวมกัน"),
    _s("docs/screenshots/group-J/J06-timeline-filtered.png", "กรอง Timeline", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เลือกประเภทกรอง"], "เฉพาะประเภทที่เลือก", "ค้นหาเร็ว"),
    _s("docs/screenshots/group-J/J07-timeline-scrolled.png", "เลื่อนดู Timeline", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เลื่อนลง"], "เหตุการณ์เก่า", "ประวัติยาว"),
    _s("docs/screenshots/group-J/J08-map.png", "แผนที่สถานพยาบาล", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เปิดแผนที่"], "แผนที่และรายการ", "หาโรงพยาบาลใกล้"),
    _s("docs/screenshots/group-J/J09-map-search.png", "ค้นหาบนแผนที่", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["พิมพ์คำค้น"], "ผลค้นหา", "เช่น โรงพยาบาล + เขต"),
    _s("docs/screenshots/group-J/J10-map-results.png", "ผลค้นหาแผนที่", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เลือกสถานที่"], "หมุดบนแผนที่", "นำทางหรือโทร"),
    _s("docs/screenshots/group-J/J11-find-doctors.png", "ค้นหาแพทย์ — รายการ", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เปิดค้นหาแพทย์"], "การ์ดแพทย์", "ดูความเชี่ยวชาญ"),
    _s("docs/screenshots/group-J/J12-specialty-filter.png", "กรองความเชี่ยวชาญ", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["เลือกสาขา"], "รายการกรองแล้ว", "จำกัดผลลัพธ์"),
    _s("docs/screenshots/group-J/J13-doctor-detail.png", "รายละเอียดแพทย์", "8. AI, Timeline, แผนที่, ค้นหาแพทย์", ["คลิกการ์ดแพทย์"], "โปรไฟล์แพทย์", "ก่อนจองนัด"),
    # Group H — Health library (patient)
    _s("docs/screenshots/group-H/H10-health-library.png", "คลังความรู้ — รายการ", "9. คลังความรู้และการแจ้งเตือน", ["เปิดคลังความรู้"], "บทความ", "เนื้อหาอนุมัติแล้ว"),
    _s("docs/screenshots/group-H/H11-article-detail.png", "อ่านบทความ", "9. คลังความรู้และการแจ้งเตือน", ["คลิกบทความ"], "เนื้อหาเต็ม", "อ่านก่อนพบแพทย์"),
    _s("docs/screenshots/group-H/H12-ai-doctor.png", "AI จาก Group H", "9. คลังความรู้และการแจ้งเตือน", ["ทดสอบ AI อีกครั้ง"], "หน้า AI สมบูรณ์", "ยืนยัน cross-page"),
    _s("docs/screenshots/group-I/I11-patient-notifications.png", "การแจ้งเตือนผู้ป่วย", "9. คลังความรู้และการแจ้งเตือน", ["คลิกกระดิ่ง"], "รายการแจ้งเตือน", "นัดใหม่ แพทย์รับเรื่อง"),
    # Workflows
    _s("docs/screenshots/workflows/appointment-lifecycle/WF04-patient-appointments-empty.png", "นัดหมายว่าง (เริ่มต้น)", "10. เวิร์กโฟลว์ครบวงจร", ["ผู้ใช้ใหม่"], "ยังไม่มีนัด", "จุดเริ่ม lifecycle"),
    _s("docs/screenshots/workflows/appointment-lifecycle/WF05-book-appointment-step1.png", "จองนัด — workflow", "10. เวิร์กโฟลว์ครบวงจร", ["WF05 จองขั้น 1"], "ตัวช่วยจอง", "ทดสอบ end-to-end"),
    _s("docs/screenshots/workflows/appointment-lifecycle/WF13-patient-appointment-confirmed.png", "นัดยืนยันแล้ว", "10. เวิร์กโฟลว์ครบวงจร", ["หลังแพทย์/แอดมินยืนยัน"], "สถานะ confirmed", "พร้อมวิดีโอคอล"),
    _s("docs/screenshots/group-A/A07-role-isolation.png", "ความปลอดภัย — แยกบทบาท", "10. เวิร์กโฟลว์ครบวงจร", ["ผู้ป่วยไม่เห็นเมนูแพทย์"], "ข้อความปฏิเสธสิทธิ์", "OWASP / JWT role"),
]

# ─── Doctor + Admin Portal ───────────────────────────────────────────────────

DOCTOR_SHOTS: list[Shot] = [
    _s(
        "docs/screenshots/workflows/auth-login/WF08-doctor-login-page.png",
        "หน้าเข้าสู่ระบบแพทย์/ผู้ดูแล",
        "A0. การเข้าสู่ระบบ",
        ["เปิด URL พอร์ทัลแพทย์", "กรอกบัญชีที่ผู้ดูแลสร้างให้"],
        "ฟอร์มล็อกอิน Doctor Portal",
        "บัญชีแพทย์ต้องได้รับอนุมัติก่อน",
        "doctor",
    ),
    _s(
        "docs/screenshots/sso/doctor-login-with-google.png",
        "ลงชื่อเข้าใช้ด้วย Google (แพทย์)",
        "A0. การเข้าสู่ระบบ",
        ["ใช้ Google หลังมีบัญชีในระบบ"],
        "ปุ่ม Google บนหน้าแพทย์",
        "สะดวกสำหรับแพทย์ที่ใช้ Gmail",
        "doctor",
    ),
    _s(
        "docs/screenshots/sso/sso-doctor-pending-approval.png",
        "แพทย์รออนุมัติจากผู้ดูแล",
        "A0. การเข้าสู่ระบบ",
        ["สมัครแพทย์ใหม่", "ล็อกอินก่อนอนุมัติ"],
        "ข้อความรอการอนุมัติ",
        "แอดมินต้องกดอนุมัติในเมนูจัดการแพทย์",
        "doctor",
    ),
    _s(
        "docs/screenshots/group-A/A01-doctor-dashboard.png",
        "แดชบอร์ดแพทย์",
        "A1. บทบาทแพทย์ — แดชบอร์ดและเมนู",
        ["ล็อกอินบทบาท Doctor"],
        "KPI คิว นัดวันนี้",
        "ศูนย์กลางงานประจำวันของแพทย์",
        "doctor",
    ),
    _s(
        "docs/screenshots/group-A/A09-doctor-stats.png",
        "สถิติแดชบอร์ดแพทย์",
        "A1. บทบาทแพทย์ — แดชบอร์ดและเมนู",
        ["ตรวจการ์ด KPI"],
        "ตัวเลขคิวและนัด",
        "อัปเดตแบบเรียลไทม์",
        "doctor",
    ),
    _s(
        "docs/screenshots/group-A/A03-doctor-sidebar.png",
        "เมนูแพทย์ (Sidebar)",
        "A1. บทบาทแพทย์ — แดชบอร์ดและเมนู",
        ["ดูเมนูซ้าย"],
        "Health Meeting, Pool, Patients ฯลฯ",
        "เมนูตามสิทธิ์ Doctor",
        "doctor",
    ),
    _s("docs/screenshots/group-C/C01-dashboard.png", "แดชบอร์ด (Group C)", "A2. บทบาทแพทย์ — หน้าหลัก", ["นำทาง Dashboard"], "ภาพรวมวันนี้", "Group C continuous flow", "doctor"),
    _s("docs/screenshots/group-C/C02-schedule.png", "ตารางเวลาแพทย์", "A2. บทบาทแพทย์ — หน้าหลัก", ["เปิด Schedule"], "ช่วงเวลาว่าง", "จัดการเวลารับผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-C/C03-patients.png", "รายชื่อผู้ป่วย", "A2. บทบาทแพทย์ — หน้าหลัก", ["เปิด Patients"], "ค้นหาและรายการ", "เข้าเวชระเบียน", "doctor"),
    _s("docs/screenshots/group-C/C04-health-meeting.png", "Health Meeting", "A2. บทบาทแพทย์ — หน้าหลัก", ["เปิด Health Meeting"], "คิวและนัดวันนี้", "เริ่มวิดีโอคอลจากที่นี่", "doctor"),
    _s("docs/screenshots/group-C/C05-appointment-pool.png", "Appointment Pool (แพทย์)", "A2. บทบาทแพทย์ — หน้าหลัก", ["เปิด Pool"], "นัดรอรับ", "รับผู้ป่วยจาก Pool", "doctor"),
    _s("docs/screenshots/group-C/C07-medical-content.png", "เนื้อหาทางการแพทย์", "A2. บทบาทแพทย์ — หน้าหลัก", ["เปิด Medical Content"], "บทความของแพทย์", "เผยแพร่ให้ผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-C/C08-clinical-resources.png", "ทรัพยากรคลินิก", "A2. บทบาทแพทย์ — หน้าหลัก", ["เปิด Clinical Resources"], "ไฟล์และแนวทาง", "อ้างอิงระหว่างรักษา", "doctor"),
    _s("docs/screenshots/group-D/D09-health-meeting.png", "Health Meeting — มุมจองนัด", "A3. นัดหมายและคิว", ["หลังมีนัดใหม่"], "แท็บคิว", "ติดตามนัดที่จอง", "doctor"),
    _s("docs/screenshots/group-D/D11-appointment-pool.png", "Pool หลังจองผู้ป่วย", "A3. นัดหมายและคิว", ["ตรวจ Pool"], "นัด in_pool", "รับหรือรอแอดมินจัดสรร", "doctor"),
    _s("docs/screenshots/group-D/D12-schedule.png", "ตารางเวลา — ช่วงรับ", "A3. นัดหมายและคิว", ["เปิด Schedule"], "Time slots", "กำหนดเวลาว่าง", "doctor"),
    _s("docs/screenshots/group-D/D13-time-slots.png", "แก้ไขช่วงเวลา", "A3. นัดหมายและคิว", ["เพิ่ม/ลบ slot"], "ปฏิทินรายสัปดาห์", "ผู้ป่วยเห็นเวลาว่าง", "doctor"),
    _s("docs/screenshots/group-D/D15c-doctor-assigned-notification.png", "แจ้งเตือนได้รับมอบหมายนัด", "A3. นัดหมายและคิว", ["หลังแอดมินจัดสรร"], "การแจ้งเตือน", "แพทย์รับผู้ป่วยทันที", "doctor"),
    _s("docs/screenshots/group-D/D16b-doctor-queue-assigned.png", "คิวหลังรับนัด", "A3. นัดหมายและคิว", ["เปิดคิว"], "ผู้ป่วยในคิว", "พร้อมเริ่มประชุม", "doctor"),
    _s("docs/screenshots/group-D/D16d-doctor-queue-count-sync.png", "ซิงค์จำนวนคิว", "A3. นัดหมายและคิว", ["ตรวจตัวเลข KPI"], "ตรงกับแอดมิน", "real-time sync", "doctor"),
    _s("docs/screenshots/group-D/D19-doctor-appointments.png", "รายการนัดของแพทย์", "A3. นัดหมายและคิว", ["ดูนัดทั้งหมด"], "รายการนัด", "จัดการรายวัน", "doctor"),
    _s("docs/screenshots/group-D/D20-dashboard-loaded.png", "แดชบอร์ดโหลดครบ", "A3. นัดหมายและคิว", ["รีเฟรช"], "KPI โหลดแล้ว", "ยืนยัน performance", "doctor"),
    _s("docs/screenshots/group-D/D21-kpi-cards.png", "การ์ด KPI", "A3. นัดหมายและคิว", ["ดู KPI 4 ใบ"], "Queue Pending Today Completed", "ตัดสินใจรับผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-D/D22-kpi-top.png", "KPI ส่วนบน", "A3. นัดหมายและคิว", ["เลื่อนดู"], "ตัวเลขบน", "รายละเอียด KPI", "doctor"),
    _s("docs/screenshots/group-D/D22-kpi-middle.png", "KPI ส่วนกลาง", "A3. นัดหมายและคิว", ["เลื่อนดู"], "ตัวเลขกลาง", "รายละเอียด KPI", "doctor"),
    _s("docs/screenshots/group-D/D22-kpi-bottom.png", "KPI ส่วนล่าง", "A3. นัดหมายและคิว", ["เลื่อนดู"], "ตัวเลขล่าง", "รายละเอียด KPI", "doctor"),
    _s("docs/screenshots/group-E/E04-patients-list.png", "รายชื่อผู้ป่วย (คลินิก)", "A4. ผู้ป่วยและการรักษา", ["เปิด Patients"], "รายการ EMR", "ค้นหาผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-E/E05-search-demo.png", "ค้นหาผู้ป่วย", "A4. ผู้ป่วยและการรักษา", ["พิมพ์ชื่อ/รหัส"], "ผลค้นหา", "หาเร็วในคลินิก", "doctor"),
    _s("docs/screenshots/group-E/E06-patient-detail.png", "รายละเอียดผู้ป่วย", "A4. ผู้ป่วยและการรักษา", ["คลิกผู้ป่วย"], "ข้อมูลประวัติ", "ก่อน clinical action", "doctor"),
    _s("docs/screenshots/group-E/E07-clinical-actions.png", "การดำเนินการทางคลินิก", "A4. ผู้ป่วยและการรักษา", ["เลือก action"], "Rx, Lab, Meeting", "จุดตัดสินใจรักษา", "doctor"),
    _s("docs/screenshots/group-E/E08-health-meeting.png", "Health Meeting — สร้างนัด", "A4. ผู้ป่วยและการรักษา", ["สร้างห้องประชุม"], "ฟอร์มนัด", "เชื่อมวิดีโอคอล", "doctor"),
    _s("docs/screenshots/group-E/E10-meeting-created.png", "สร้างห้องประชุมสำเร็จ", "A5. วิดีโอคอลและ Lobby", ["ยืนยันสร้างห้อง"], "ลิงก์ประชุม", "แชร์ให้ผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-E/E10b-doctor-meeting-route.png", "เส้นทางห้องประชุมแพทย์", "A5. วิดีโอคอลและ Lobby", ["เข้าห้อง"], "หน้า pre-join", "เตรียมเข้าห้องประชุม", "doctor"),
    _s("docs/screenshots/workflows/video-meeting/WF14a-doctor-agreement.png", "ข้อตกลงก่อนเข้าห้อง (แพทย์)", "A5. วิดีโอคอลและ Lobby", ["ยอมรับข้อตกลง"], "หน้า agreement", "มาตรฐาน telemedicine", "doctor"),
    _s("docs/screenshots/workflows/video-meeting/WF14b-doctor-pre-join.png", "พรี-จอยน์แพทย์", "A5. วิดีโอคอลและ Lobby", ["ตรวจอุปกรณ์"], "กล้อง/ไมค์", "ก่อนเปิด lobby", "doctor"),
    _s("docs/screenshots/group-E/E10c3-doctor-lobby-admit.png", "Lobby — Admit ผู้ป่วย", "A5. วิดีโอคอลและ Lobby", ["กด Admit"], "รายชื่อรอ", "ควบคุมการเข้าห้อง", "doctor"),
    _s("docs/screenshots/group-J-meeting-jitsi/E10c-jitsi-doctor-meet.png", "ห้อง Jitsi (แพทย์)", "A5. วิดีโอคอลและ Lobby", ["หลัง admit"], "วิดีโอคอลจริง", "ปรึกษาผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-E/E18-doctor-queue.png", "คิวแพทย์", "A5. วิดีโอคอลและ Lobby", ["ดูคิววันนี้"], "รายการรอ", "ลำดับการรับ", "doctor"),
    _s("docs/screenshots/group-E/E19-guest-invite-created.png", "สร้างลิงก์เชิญ Guest", "A5. วิดีโอคอลและ Lobby", ["สร้าง invite"], "ลิงก์ basic/token", "ญาติเข้าร่วมได้", "doctor"),
    _s("docs/screenshots/group-E/E21-lobby-join-basic.png", "Guest — Lobby Basic", "A5. วิดีโอคอลและ Lobby", ["ทดสอบลิงก์ basic"], "หน้า join", "ลิงก์ทั่วไป", "doctor"),
    _s("docs/screenshots/group-E/E22-lobby-join-token.png", "Guest — Lobby Token", "A5. วิดีโอคอลและ Lobby", ["ทดสอบลิงก์ token"], "หน้า join ปลอดภัย", "token ป้องกันคนแปลก", "doctor"),
    _s("docs/screenshots/group-E/E22b-guest-admitted.png", "Guest ได้รับอนุมัติ", "A5. วิดีโอคอลและ Lobby", ["Admit guest"], "ในห้องแล้ว", "หลายผู้เข้าร่วม", "doctor"),
    _s("docs/screenshots/group-E/E31-lobby-all-admitted.png", "Admit ทุกคนในห้อง", "A5. วิดีโอคอลและ Lobby", ["Admit all"], "ทุกคนในประชุม", "จบขั้นตอน lobby", "doctor"),
    _s("docs/screenshots/group-F/F10-patients.png", "ผู้ป่วย — มุม PHR", "A6. PHR และเวชระเบียน", ["เปิด Patients"], "รายการ", "เข้า PHR", "doctor"),
    _s("docs/screenshots/group-F/F11-search-patient.png", "ค้นหาเพื่อเปิด PHR", "A6. PHR และเวชระเบียน", ["ค้นหา"], "ผลค้นหา", "เลือกผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-F/F12-patient-detail.png", "รายละเอียด + PHR", "A6. PHR และเวชระเบียน", ["เปิด detail"], "แท็บข้อมูล", "อ่านก่อนรักษา", "doctor"),
    _s("docs/screenshots/group-F/F13-patient-health-data.png", "ข้อมูลสุขภาพผู้ป่วย", "A6. PHR และเวชระเบียน", ["ดู vitals/ยา"], "ข้อมูลครบ", "sync จากผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-F/F15-doctor-patient-phr.png", "PHR มุมแพทย์", "A6. PHR และเวชระเบียน", ["เปิด PHR tab"], "มุมมองแพทย์", "บันทึกเพิ่มได้", "doctor"),
    _s("docs/screenshots/group-G/G10-doctor-patients.png", "ผู้ป่วย (Group G)", "A6. PHR และเวชระเบียน", ["ตรวจรายชื่อ"], "รายการ", "cross-test", "doctor"),
    _s("docs/screenshots/group-G/G11-patient-record.png", "เวชระเบียนผู้ป่วย", "A6. PHR และเวชระเบียน", ["เปิด record"], "EMR", "ข้อมูลรักษา", "doctor"),
    _s("docs/screenshots/group-G/G12-meetings.png", "รายการประชุมแพทย์", "A6. PHR และเวชระเบียน", ["ดู meetings"], "นัดออนไลน์", "ย้อนกลับประชุม", "doctor"),
    _s("docs/screenshots/group-H/H01-medical-content.png", "สร้างเนื้อหา — รายการ", "A7. เนื้อหาและทรัพยากร", ["Medical Content"], "รายการบทความ", "แพทย์เขียน", "doctor"),
    _s("docs/screenshots/group-H/H02-create-form.png", "ฟอร์มสร้างบทความ", "A7. เนื้อหาและทรัพยากร", ["กดสร้างใหม่"], "ฟอร์มว่าง", "กรอกหัวข้อ", "doctor"),
    _s("docs/screenshots/group-H/H03-form-filled.png", "กรอกบทความครบ", "A7. เนื้อหาและทรัพยากร", ["กรอกเนื้อหา"], "พร้อมเผยแพร่", "ส่งให้แอดมินอนุมัติ", "doctor"),
    _s("docs/screenshots/group-H/H04-back-to-list.png", "กลับรายการบทความ", "A7. เนื้อหาและทรัพยากร", ["บันทึก/ยกเลิก"], "รายการอัปเดต", "จัดการเนื้อหา", "doctor"),
    _s("docs/screenshots/group-H/H05-article-detail.png", "อ่านบทความ (แพทย์)", "A7. เนื้อหาและทรัพยากร", ["เปิดบทความ"], "ตัวอย่าง", "ตรวจก่อนเผยแพร่", "doctor"),
    _s("docs/screenshots/group-H/H06-clinical-resources.png", "ทรัพยากรคลินิก", "A7. เนื้อหาและทรัพยากร", ["Clinical Resources"], "รายการไฟล์", "แนวทางรักษา", "doctor"),
    _s("docs/screenshots/group-H/H07-resource-detail.png", "รายละเอียดทรัพยากร", "A7. เนื้อหาและทรัพยากร", ["คลิกไฟล์"], "เนื้อหา/ลิงก์", "อ้างอิงระหว่างรักษา", "doctor"),
    _s("docs/screenshots/group-H/H09-pool.png", "Pool จาก Group H", "A7. เนื้อหาและทรัพยากร", ["ตรวจ Pool"], "นัดรอ", "รับผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-I/I12-doctor-profile.png", "โปรไฟล์แพทย์", "A8. โปรไฟล์และแจ้งเตือน", ["เปิดโปรไฟล์"], "ข้อมูลแพทย์", "แก้ไขตามสิทธิ์", "doctor"),
    _s("docs/screenshots/workflows/appointment-lifecycle/WF12b-doctor-notifications.png", "แจ้งเตือนแพทย์", "A8. โปรไฟล์และแจ้งเตือน", ["กระดิ่งแจ้งเตือน"], "นัดใหม่", "ตอบสนองเร็ว", "doctor"),
    # Admin role
    _s("docs/screenshots/group-A/A01-admin-dashboard.png", "แดชบอร์ดผู้ดูแลระบบ", "B1. บทบาทผู้ดูแล — ภาพรวม", ["ล็อกอิน Admin"], "KPI ทั้งองค์กร", "มองภาพรวมระบบ", "doctor"),
    _s("docs/screenshots/group-A/A04-admin-sidebar.png", "เมนูผู้ดูแลระบบ", "B1. บทบาทผู้ดูแล — ภาพรวม", ["ดูเมนู Admin"], "จัดการแพทย์ Pool", "สิทธิ์สูงกว่าแพทย์", "doctor"),
    _s("docs/screenshots/group-C/C09-admin-dashboard.png", "แดชบอร์ด Admin (C)", "B2. บทบาทผู้ดูแล — หน้าหลัก", ["Dashboard admin"], "สถิติรวม", "Group C flow", "doctor"),
    _s("docs/screenshots/group-C/C10-admin-patients.png", "ผู้ป่วยทั้งหมด (Admin)", "B2. บทบาทผู้ดูแล — หน้าหลัก", ["Admin Patients"], "ทุกผู้ป่วย", "ไม่จำกัดเฉพาะแพทย์", "doctor"),
    _s("docs/screenshots/group-C/C11-admin-schedule.png", "ตารางองค์กร", "B2. บทบาทผู้ดูแล — หน้าหลัก", ["Admin Schedule"], "ตารางรวม", "จัดการภาพรวม", "doctor"),
    _s("docs/screenshots/group-C/C12-admin-meeting.png", "Health Meeting (Admin)", "B2. บทบาทผู้ดูแล — หน้าหลัก", ["Admin Meeting"], "คิวทั้งระบบ", "ดูทุกแพทย์", "doctor"),
    _s("docs/screenshots/group-C/C13-manage-doctors.png", "จัดการแพทย์", "B3. จัดการบุคลากร", ["Manage Doctors"], "รายชื่อแพทย์", "เพิ่ม/แก้ไข", "doctor"),
    _s("docs/screenshots/group-C/C14-doctor-approval.png", "อนุมัติแพทย์ใหม่", "B3. จัดการบุคลากร", ["อนุมัติ/ปฏิเสธ"], "สถานะ pending", "เปิดใช้บัญชี", "doctor"),
    _s("docs/screenshots/group-C/C15-admin-content.png", "อนุมัติเนื้อหา", "B3. จัดการบุคลากร", ["Admin Content"], "บทความรออนุมัติ", "เผยแพร่สู่ผู้ป่วย", "doctor"),
    _s("docs/screenshots/group-C/C16-admin-resources.png", "ทรัพยากร (Admin)", "B3. จัดการบุคลากร", ["Admin Resources"], "ไฟล์องค์กร", "มาตรฐานคลินิก", "doctor"),
    _s("docs/screenshots/group-I/I01-admin-dashboard.png", "แดชบอร์ด (Group I)", "B3. จัดการบุคลากร", ["I01 dashboard"], "ภาพรวม", "Group I tests", "doctor"),
    _s("docs/screenshots/group-I/I02-manage-doctors.png", "จัดการแพทย์ (I)", "B3. จัดการบุคลากร", ["ค้นหาแพทย์"], "รายการ", "บำรุงรักษาบัญชี", "doctor"),
    _s("docs/screenshots/group-I/I03-search-doctor.png", "ค้นหาแพทย์", "B3. จัดการบุคลากร", ["พิมพ์ชื่อ"], "ผลค้นหา", "หาเร็ว", "doctor"),
    _s("docs/screenshots/group-I/I05-approval-buttons.png", "ปุ่มอนุมัติ", "B3. จัดการบุคลากร", ["เลือกแพทย์"], "Approve/Reject", "ควบคุมคุณภาพ", "doctor"),
    _s("docs/screenshots/group-I/I06-doctor-approval.png", "หน้าอนุมัติแพทย์", "B3. จัดการบุคลากร", ["ยืนยันอนุมัติ"], "สถานะ active", "แพทย์ล็อกอินได้", "doctor"),
    _s("docs/screenshots/group-I/I07-pending-list.png", "รายการรออนุมัติ", "B3. จัดการบุคลากร", ["ดู pending"], "คิวรอ", "ดำเนินการทีละราย", "doctor"),
    _s("docs/screenshots/group-D/D07b-admin-pool-notification.png", "แจ้งเตือน Pool (Admin)", "B4. Appointment Pool และคิว", ["นัดใหม่เข้า Pool"], "การแจ้งเตือน", "แอดมินรู้ทันที", "doctor"),
    _s("docs/screenshots/group-D/D14-admin-meeting.png", "Health Meeting Admin", "B4. Appointment Pool และคิว", ["Admin meeting"], "ภาพรวมคิว", "จัดสรรแพทย์", "doctor"),
    _s("docs/screenshots/group-D/D15-admin-pool.png", "Appointment Pool (Admin)", "B4. Appointment Pool และคิว", ["เปิด Pool"], "นัดรอจัดสรร", "เลือกแพทย์", "doctor"),
    _s("docs/screenshots/group-D/D15b-admin-assigned-doctor.png", "จัดสรรแพทย์แล้ว", "B4. Appointment Pool และคิว", ["เลือกแพทย์", "กด Assign"], "แพทย์ที่มอบหมาย", "แพทย์ได้แจ้งเตือน", "doctor"),
    _s("docs/screenshots/group-D/D16-pool-after-assignment.png", "Pool หลังจัดสรร", "B4. Appointment Pool และคิว", ["รีเฟรช Pool"], "สถานะอัปเดต", "ติดตาม", "doctor"),
    _s("docs/screenshots/group-D/D16d-admin-queue-count-sync.png", "ซิงค์คิว Admin", "B4. Appointment Pool และคิว", ["ตรวจตัวเลข"], "ตรงกับแพทย์", "data sync", "doctor"),
    _s("docs/screenshots/group-D/D17-admin-queue-post-assign.png", "คิวหลังจัดสรร (Admin)", "B4. Appointment Pool และคิว", ["ดูคิว"], "ผู้ป่วยในคิวแพทย์", "พร้อมประชุม", "doctor"),
    _s("docs/screenshots/group-E/E23-admin-queue.png", "คิวองค์กร (E)", "B4. Appointment Pool และคิว", ["Admin queue E23"], "ทุกแพทย์", "มุมมองรวม", "doctor"),
    _s("docs/screenshots/group-I/I08-admin-schedule.png", "ตาราง Admin", "B4. Appointment Pool และคิว", ["Schedule admin"], "ตารางรวม", "วางแผน", "doctor"),
    _s("docs/screenshots/group-I/I09-admin-pool.png", "Pool Admin (I)", "B4. Appointment Pool และคิว", ["I09 pool"], "นัดรอ", "จัดสรร", "doctor"),
    _s("docs/screenshots/group-H/H13-admin-content.png", "เนื้อหา Admin", "B5. เนื้อหาและทรัพยากร (Admin)", ["อนุมัติบทความ"], "รายการรอ", "เผยแพร่", "doctor"),
    _s("docs/screenshots/group-H/H14-admin-resources.png", "ทรัพยากร Admin", "B5. เนื้อหาและทรัพยากร (Admin)", ["จัดการไฟล์"], "ทรัพยากรองค์กร", "มาตรฐาน", "doctor"),
    _s("docs/screenshots/workflows/appointment-lifecycle/WF10-appointment-management-pool.png", "จัดการ Pool — workflow", "B6. เวิร์กโฟลว์ครบวงจร", ["WF10"], "หน้าจัดการ Pool", "lifecycle นัด", "doctor"),
    _s("docs/screenshots/workflows/appointment-lifecycle/WF11-appointment-confirmed.png", "นัดยืนยัน — workflow", "B6. เวิร์กโฟลว์ครบวงจร", ["WF11"], "confirmed", "พร้อมประชุม", "doctor"),
    _s("docs/screenshots/workflows/appointment-lifecycle/WF12-health-meeting-queue.png", "คิว Health Meeting", "B6. เวิร์กโฟลว์ครบวงจร", ["WF12"], "คิวประชุม", "เริ่มวิดีโอ", "doctor"),
    _s("docs/screenshots/workflows/auth-login/WF09-doctor-dashboard.png", "แดชบอร์ดหลังล็อกอิน (WF)", "B6. เวิร์กโฟลว์ครบวงจร", ["WF09"], "เข้าสู่ระบบสำเร็จ", "เริ่มงาน", "doctor"),
]
