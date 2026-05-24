#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build Thai user guides (Word .docx + PowerPoint .pptx) per portal from UI test screenshots.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DOCS = REPO / "docs"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from user_guide_catalog import (  # noqa: E402
    DATE_TH,
    DOCTOR_SHOTS,
    DOCTOR_URL,
    PATIENT_SHOTS,
    PATIENT_URL,
    VERSION,
    Shot,
)
from user_guide_process_context import (  # noqa: E402
    DOCTOR_PROCESS_INTRO,
    PATIENT_PROCESS_INTRO,
    PPT_BODY_PT,
    PPT_FONT,
    PPT_NOTES_PT,
    PPT_SUBTITLE_PT,
    PPT_TITLE_PT,
    WORD_BODY_PT,
    WORD_FONT,
    WORD_H1_PT,
    WORD_H2_PT,
    WORD_LINE_SPACING,
    WORD_TITLE_PT,
    section_context,
)

UI_GROUPS_PATIENT = "A, B, D, E, F, G, H, I, J, SSO, Workflows"
UI_GROUPS_DOCTOR = "A, C, D, E, F, G, H, I, SSO, Workflows (Doctor/Admin)"


def existing_shots(shots: list[Shot]) -> list[Shot]:
    out: list[Shot] = []
    for s in shots:
        p = REPO / s.path.replace("/", "\\") if "\\" in str(REPO) else REPO / s.path
        if p.is_file():
            out.append(s)
        else:
            print(f"  skip missing: {s.path}", file=sys.stderr)
    return out


def word_md(portal: str, shots: list[Shot], url: str, groups: str) -> str:
    title = (
        "พอร์ทัลผู้ป่วย (Patient Portal)"
        if portal == "patient"
        else "พอร์ทัลแพทย์และผู้ดูแลระบบ (Doctor & Admin Portal)"
    )
    lines = [
        f"# คู่มือการใช้งาน — {title}",
        "## ระบบ Isara Anywhere — เอกสารอธิบายการใช้งาน (ฉบับภาษาไทย)",
        "",
        "| รายละเอียดเอกสาร | ข้อมูล |",
        "|---|---|",
        "| ชื่อระบบ | Isara Anywhere — ระบบแพทย์ทางไกล |",
        f"| เวอร์ชัน | {VERSION} |",
        f"| URL (Cloud Dev-Testing) | {url} |",
        f"| วันที่จัดทำ | {DATE_TH} |",
        f"| กลุ่มทดสอบ UI | {groups} |",
        "| สถานะ | ใช้เฉพาะภาพจากการทดสอบ UI ที่ผ่าน (Passing Screenshots) |",
        f"| แบบอักษร Word | {WORD_FONT} {WORD_BODY_PT} pt (มาตรฐานรายงานภาษาไทย) |",
        f"| แบบอักษร PowerPoint | {PPT_FONT} |",
        "",
        "---",
        "",
        "## บทนำ",
        "",
        (PATIENT_PROCESS_INTRO if portal == "patient" else DOCTOR_PROCESS_INTRO).strip(),
        "",
    ]
    if portal == "patient":
        lines += [
            "**Patient Portal** ออกแบบสำหรับผู้ป่วย ครอบคลุมการจองนัดหมาย ติดตามสถานะ "
            "เข้าร่วมวิดีโอคอล บันทึก PHR ปรึกษา AI ค้นหาแพทย์และสถานพยาบาล "
            "รวมถึงการจัดการความยินยอม PDPA และหนังสือแสดงเจตนา",
            "",
            "### ข้อกำหนดเบื้องต้น",
            "",
            "| รายการ | ข้อกำหนด |",
            "|---|---|",
            "| เบราว์เซอร์ | Google Chrome หรือ Microsoft Edge เวอร์ชันล่าสุด |",
            "| อินเทอร์เน็ต | ≥ 5 Mbps (วิดีโอคอลแนะนำ 10 Mbps) |",
            "| อุปกรณ์ | กล้องและไมโครโฟนสำหรับ telehealth |",
            "| เอกสารอ้างอิง | `Processes/Appointment_Workflows.md`, `Processes/VIDEO_MEETING_JITSI_GEMINI.md` |",
            "",
        ]
    else:
        lines += [
            "**Doctor & Admin Portal** ใช้ URL เดียวกัน แต่แสดงเมนูตามบทบาท:",
            "",
            "| บทบาท | ขอบเขต | หน้าที่หลัก |",
            "|---|---|---|",
            "| **แพทย์ (Doctor)** | ผู้ป่วยของตนเอง | คิว, Health Meeting, EMR, วิดีโอคอล, เนื้อหา |",
            "| **ผู้ดูแล (Admin)** | ทั้งองค์กร | จัดสรรแพทย์, Pool, อนุมัติบัญชี/เนื้อหา |",
            "",
            "### เอกสารกระบวนการที่เกี่ยวข้อง",
            "",
            "- `Processes/Pages/Doctor-Portal/00_Doctor_Portal_Overview.md` — เส้นทางและเมนู",
            "- `Processes/Appointment_Workflows.md` — Pool, จัดสรร, ยืนยันนัด",
            "- `Processes/VIDEO_MEETING_JITSI_GEMINI.md` — Lobby, HOST, Guest",
            "",
        ]

    current_section = ""
    for i, s in enumerate(shots, 1):
        if s.section != current_section:
            current_section = s.section
            lines += ["", f"## {current_section}", ""]
            ctx = section_context(portal, current_section)
            if ctx:
                purpose, wf_steps, cautions, pref = ctx
                lines += [
                    "**วัตถุประสงค์ของหมวดนี้:**",
                    "",
                    purpose,
                    "",
                    "**ลำดับกระบวนการในระบบ (สรุป):**",
                    "",
                ]
                for ws in wf_steps:
                    lines.append(f"- {ws}")
                lines += ["", "**ข้อควรระวัง:**", ""]
                for c in cautions:
                    lines.append(f"- {c}")
                lines += ["", f"**อ้างอิง:** `{pref}`", ""]
        lines += [
            f"### {i}. {s.title}",
            "",
            "**วัตถุประสงค์ของขั้นตอน:**",
            "",
            s.script,
            "",
            "**ขั้นตอนการใช้งาน (ละเอียด):**",
            "",
        ]
        for j, step in enumerate(s.steps, 1):
            lines.append(f"{j}. {step}")
            lines.append(f"   - **ตรวจบนหน้าจอ:** {s.screen}")
            lines.append(f"   - **บทบาท:** {'ผู้ป่วย' if portal == 'patient' else 'แพทย์/ผู้ดูแล'}")
        ctx = section_context(portal, s.section)
        if ctx:
            _, _, cautions, pref = ctx
            lines += [
                "",
                "**ข้อควรปฏิบัติในขั้นนี้:**",
                "",
            ]
            for c in cautions[:2]:
                lines.append(f"- {c}")
            lines.append(f"- อ้างอิงกระบวนการ: `{pref}`")
        lines += [
            "",
            "**ผลลัพธ์ที่คาดหวัง:**",
            "",
            f"- {s.screen}",
            "- ดำเนินการต่อได้โดยไม่มีข้อผิดพลาด (HTTP 4xx/5xx) บนฟังก์ชันหลัก",
            "- สอดคล้อง `tests/SELECTORS.md` และ Playwright group ที่เกี่ยวข้อง",
            "",
            "**คำอธิบายเพิ่มเติม / บริบทกระบวนการ:**",
            "",
            f"กลุ่มทดสอบ UI: `{s.section}` — ภาพนี้ยืนยันว่าขั้นตอน «{s.title}» ทำงานครบตามที่ออกแบบใน Processes/Pages "
            f"และผ่านการทดสอบอัตโนมัติบน Cloud dev-testing (v{VERSION})",
            f"เอกสาร Word ใช้ {WORD_FONT} {WORD_BODY_PT} pt; สไลด์ใช้ {PPT_FONT}.",
            "",
            f"**ลักษณะหน้าจอที่สำเร็จ:** {s.screen}",
            "",
            f"> **ภาพหน้าจอ:** `{s.path}`",
            f"> *{s.title} — จากการทดสอบ UI*",
            "",
            f"![{s.title}]({s.path})",
            "",
        ]

    lines += [
        "---",
        "",
        "## ภาคผนวก — สรุปกลุ่มทดสอบ UI",
        "",
        f"| จำนวนภาพในคู่มือ | {len(shots)} |",
        f"| กลุ่มทดสอบ | {groups} |",
        "",
        f"*จัดทำ {DATE_TH} — Isara Anywhere v{VERSION}*",
        "",
    ]
    return "\n".join(lines)


def ppt_md(portal: str, shots: list[Shot], url: str) -> str:
    title = (
        "คู่มือการใช้งาน — พอร์ทัลผู้ป่วย"
        if portal == "patient"
        else "คู่มือการใช้งาน — พอร์ทัลแพทย์และผู้ดูแลระบบ"
    )
    lines = [
        f"# สคริปต์นำเสนอสไลด์ — {title}",
        "## ระบบ Isara Anywhere — หนึ่งภาพต่อหนึ่งสไลด์ (ภาษาไทย)",
        "",
        f"> URL: {url} | เวอร์ชัน {VERSION} | {DATE_TH}",
        "",
    ]
    slide = 1

    # Slide 1 — Title
    lines += [
        f"## สไลด์ที่ {slide}",
        "",
        "**ชื่อสไลด์:** ชื่อเรื่อง — Isara Anywhere",
        "",
        "**สคริปต์บรรยาย:**",
        f'> "สวัสดีครับ/ค่ะ วันนี้นำเสนอคู่มือการใช้งาน {title} '
        f'เวอร์ชัน {VERSION} ทุกภาพหน้าจอมาจากการทดสอบ UI ที่ผ่านทั้งหมด"',
        "",
        "---",
        "",
    ]
    slide += 1

    # Slide 2 — Overview table
    if portal == "patient":
        overview_script = (
            "Patient Portal มี 10 เมนูหลัก ครอบคลุมจองนัด PHR วิดีโอคอล AI "
            "แผนที่ PDPA และคลังความรู้"
        )
        overview_body = (
            "| หัวข้อ | รายละเอียด |\n|---|---|\n"
            f"| URL | {url} |\n"
            "| บทบาท | ผู้ป่วย |\n"
            "| เมนูหลัก | 10 รายการ |\n"
            f"| กลุ่มทดสอบ | {UI_GROUPS_PATIENT} |"
        )
    else:
        overview_script = (
            "Portal เดียวรองรับแพทย์และผู้ดูแล แพทย์ดูเฉพาะผู้ป่วยของตน "
            "ผู้ดูแลจัดสรรแพทย์และอนุมัติระบบ"
        )
        overview_body = (
            "| หัวข้อ | แพทย์ | ผู้ดูแล |\n|---|---|---|\n"
            f"| URL | {url} | เดียวกัน |\n"
            "| Pool | รับเอง | จัดสรรให้แพทย์ |\n"
            f"| กลุ่มทดสอบ | {UI_GROUPS_DOCTOR} |"
        )

    lines += [
        f"## สไลด์ที่ {slide}",
        "",
        "**ชื่อสไลด์:** ตารางภาพรวมระบบ",
        "",
        overview_body,
        "",
        "**สคริปต์บรรยาย:**",
        f'> "{overview_script}"',
        "",
        "---",
        "",
    ]
    slide += 1

    for s in shots:
        steps_text = "\n".join(f"{n}. {st}" for n, st in enumerate(s.steps, 1))
        lines += [
            f"## สไลด์ที่ {slide}",
            "",
            f"**ชื่อสไลด์:** {s.title}",
            "",
            f"**กลุ่ม:** {s.section}",
            "",
            f"[ภาพ: {s.path}]",
            "",
            "**วัตถุประสงค์:**",
            "",
            s.script,
            "",
            "**ขั้นตอนบนสไลด์:**",
            "",
            steps_text,
            "",
            "**รายละเอียดเพิ่มเติม (บันทึกวิทยากร — FC Iconic 16 pt):**",
            "",
            f"- วัตถุประสงค์: {s.script}",
            f"- ตรวจบนหน้าจอ: {s.screen}",
            "- ปฏิบัติทีละขั้น — อย่าข้าม modal ยืนยัน",
            "- อ้างอิง: Processes/Pages + `tests/SELECTORS.md`",
            "",
            "**สคริปต์บรรยาย:**",
            f'> "ต่อไปคือ {s.title} ในกลุ่ม {s.section}. {s.script} '
            f'ขั้นตอนคือ: {" ".join(s.steps)} '
            f'เมื่อทำสำเร็จบนหน้าจอจะเห็น{s.screen} '
            f'เอกสาร Word ใช้ {WORD_FONT} {WORD_BODY_PT} pt สไลด์ใช้ {PPT_FONT} '
            f'อ้างอิงกระบวนการใน Processes/Pages และ UI test ที่ผ่านแล้ว"',
            "",
            "---",
            "",
        ]
        slide += 1

    # Closing slide
    lines += [
        f"## สไลด์ที่ {slide}",
        "",
        "**ชื่อสไลด์:** สรุปและ Q&A",
        "",
        "**สคริปต์บรรยาย:**",
        f'> "สรุปคู่มือ {title} ครบ {len(shots)} ขั้นตอนพร้อมภาพจาก UI tests '
        f'ขอบคุณครับ/ค่ะ มีคำถามเพิ่มเติมไหมครับ/คะ"',
        "",
    ]
    return "\n".join(lines)


def inject_word_images(md: str) -> str:
    pattern = re.compile(
        r"(> \*\*ภาพหน้าจอ:\*\* `([^`]+)`\n> \*([^\*]+)\*)\n(?!\!\[)",
        re.MULTILINE,
    )

    def repl(m: re.Match) -> str:
        path, caption = m.group(2), m.group(3)
        return f"{m.group(1)}\n\n![{caption}]({path})\n"

    return pattern.sub(repl, md)


def _set_run_font(run, font_name: str, size_pt: int, bold: bool = False) -> None:
    from docx.shared import Pt

    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    try:
        from docx.oxml.ns import qn

        r = run._element
        rPr = r.get_or_add_rPr()
        rFonts = rPr.get_or_add_rFonts()
        rFonts.set(qn("w:eastAsia"), font_name)
    except Exception:
        pass


def _add_para(doc, text: str, *, font=WORD_FONT, size=WORD_BODY_PT, bold=False, style=None):
    from docx.enum.text import WD_LINE_SPACING
    from docx.shared import Pt

    p = doc.add_paragraph(text, style=style)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = WORD_LINE_SPACING
    p.paragraph_format.space_after = Pt(6)
    if p.runs:
        _set_run_font(p.runs[0], font, size, bold)
    return p


def build_docx_python(
    portal: str,
    shots: list[Shot],
    url: str,
    groups: str,
    docx_path: Path,
    doc_title: str,
) -> bool:
    try:
        from docx import Document
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.shared import Inches, Pt
    except ImportError:
        print("  python-docx not installed — falling back to pandoc", file=sys.stderr)
        return False

    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = WORD_FONT
    normal.font.size = Pt(WORD_BODY_PT)

    title_p = doc.add_paragraph(doc_title)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _set_run_font(title_p.runs[0], WORD_FONT, WORD_TITLE_PT, bold=True)

    _add_para(doc, f"เวอร์ชัน {VERSION} | {DATE_TH} | {url}", size=WORD_BODY_PT)
    _add_para(
        doc,
        f"แบบอักษร {WORD_FONT} {WORD_BODY_PT} pt — มาตรฐานรายงานภาษาไทย | กลุ่มทดสอบ: {groups}",
    )
    doc.add_page_break()

    intro = PATIENT_PROCESS_INTRO if portal == "patient" else DOCTOR_PROCESS_INTRO
    _add_para(doc, "บทนำ", font=WORD_FONT, size=WORD_H1_PT, bold=True)
    for block in intro.strip().split("\n"):
        if block.strip():
            _add_para(doc, block.strip())

    current_section = ""
    for i, s in enumerate(shots, 1):
        if s.section != current_section:
            current_section = s.section
            doc.add_page_break()
            _add_para(doc, current_section, font=WORD_FONT, size=WORD_H1_PT, bold=True)
            ctx = section_context(portal, current_section)
            if ctx:
                purpose, wf_steps, cautions, pref = ctx
                _add_para(doc, "วัตถุประสงค์ของหมวด", bold=True)
                _add_para(doc, purpose)
                _add_para(doc, "ลำดับกระบวนการ", bold=True)
                for ws in wf_steps:
                    _add_para(doc, f"• {ws}")
                _add_para(doc, "ข้อควรระวัง", bold=True)
                for c in cautions:
                    _add_para(doc, f"• {c}")
                _add_para(doc, f"อ้างอิง: {pref}")

        _add_para(doc, f"{i}. {s.title}", font=WORD_FONT, size=WORD_H2_PT, bold=True)
        _add_para(doc, "วัตถุประสงค์ของขั้นตอน", bold=True)
        _add_para(doc, s.script)
        _add_para(doc, "ขั้นตอนการใช้งาน (ละเอียด)", bold=True)
        for j, step in enumerate(s.steps, 1):
            _add_para(doc, f"{j}. {step}")
            _add_para(doc, "   ปฏิบัติ: ดำเนินการบนหน้าจอจนจบขั้นนี้")
            _add_para(doc, f"   ตรวจสอบ: {s.screen} — ไม่มีข้อผิดพลาด HTTP 4xx/5xx")
            _add_para(doc, f"   บทบาท: {'ผู้ป่วย' if portal == 'patient' else 'แพทย์/ผู้ดูแล'}")
        _add_para(doc, "คำอธิบายเพิ่มเติม", bold=True)
        _add_para(
            doc,
            f"ขั้นตอน «{s.title}» สอดคล้อง Processes/Pages และกลุ่มทดสอบ {s.section}. "
            f"เอกสารจัดทำด้วย {WORD_FONT} {WORD_BODY_PT} pt (มาตรฐานรายงานภาษาไทย).",
        )
        _add_para(doc, "ผลลัพธ์ที่คาดหวัง", bold=True)
        _add_para(doc, s.screen)
        _add_para(doc, "บริบทกระบวนการ", bold=True)
        _add_para(
            doc,
            f"กลุ่ม {s.section} — ยืนยันด้วย UI test บน Cloud; ภาพ: {s.path}",
        )
        img = REPO / s.path.replace("/", "\\") if "\\" in str(REPO) else REPO / s.path
        if img.is_file():
            try:
                doc.add_picture(str(img), width=Inches(6.2))
            except Exception as ex:
                _add_para(doc, f"(ไม่สามารถแนบภาพ: {ex})")

    doc.save(str(docx_path))
    print(
        f"  DOCX: {docx_path} ({docx_path.stat().st_size // 1024} KB, {WORD_FONT} {WORD_BODY_PT}pt)"
    )
    return True


def build_docx(md_path: Path, docx_path: Path, doc_title: str, portal: str, shots: list[Shot], url: str, groups: str) -> bool:
    if build_docx_python(portal, shots, url, groups, docx_path, doc_title):
        return True
    raw = md_path.read_text(encoding="utf-8")
    enriched = inject_word_images(raw)
    tmp = md_path.parent / f"_pandoc_{md_path.name}"
    tmp.write_text(enriched, encoding="utf-8")
    cmd = [
        "pandoc",
        str(tmp),
        "-o",
        str(docx_path),
        "--resource-path",
        str(REPO),
        "-s",
        "--toc",
        "--toc-depth=3",
        "--metadata",
        "lang=th",
        "--metadata",
        f"title={doc_title}",
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"  DOCX (pandoc fallback): {docx_path} ({docx_path.stat().st_size // 1024} KB)")
        return True
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print(f"  DOCX failed: {e}", file=sys.stderr)
        return False
    finally:
        tmp.unlink(missing_ok=True)


def parse_ppt_slides(md: str) -> list[dict]:
    slides: list[dict] = []
    blocks = re.split(r"(?=## สไลด์ที่ \d+)", md)
    for block in blocks:
        m_num = re.search(r"## สไลด์ที่ (\d+)", block)
        if not m_num:
            continue
        num = int(m_num.group(1))
        m_title = re.search(r"\*\*ชื่อสไลด์:\*\* (.+)", block)
        title = m_title.group(1).strip() if m_title else f"สไลด์ {num}"
        m_img = re.search(r"\[ภาพ:\s*([^\]\n]+)\]", block)
        image = None
        if m_img:
            raw = m_img.group(1).strip()
            image = REPO / raw.replace("/", "\\") if "\\" in str(REPO) else REPO / raw
        m_notes = re.search(
            r"\*\*สคริปต์บรรยาย:\*\*\s*\n>\s*\"(.+?)\"",
            block,
            re.DOTALL,
        )
        notes = m_notes.group(1).strip() if m_notes else ""
        steps_lines: list[str] = []
        m_steps = re.search(
            r"\*\*ขั้นตอนบนสไลด์:\*\*\s*\n((?:\d+\. .+\n?)+)",
            block,
        )
        if m_steps:
            steps_lines = [
                ln.strip()
                for ln in m_steps.group(1).strip().splitlines()
                if ln.strip()
            ]
        slides.append(
            {
                "num": num,
                "title": title,
                "image": image,
                "notes": notes,
                "steps_lines": steps_lines,
            }
        )
    return sorted(slides, key=lambda s: s["num"])


def _ppt_set_font(paragraph, size_pt: int, bold: bool = False) -> None:
    from pptx.util import Pt

    paragraph.font.name = PPT_FONT
    paragraph.font.size = Pt(size_pt)
    paragraph.font.bold = bold


def build_pptx(slides: list[dict], out_path: Path, portal: str) -> None:
    from pptx import Presentation
    from pptx.util import Inches, Pt

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    subtitle = "Patient Portal" if portal == "patient" else "Doctor & Admin Portal"

    for slide_def in slides:
        slide = prs.slides.add_slide(blank)
        title_box = slide.shapes.add_textbox(Inches(0.4), Inches(0.15), Inches(12.5), Inches(0.9))
        p = title_box.text_frame.paragraphs[0]
        p.text = slide_def["title"]
        _ppt_set_font(p, PPT_SUBTITLE_PT if len(slide_def["title"]) > 42 else PPT_TITLE_PT, bold=True)

        img_path = slide_def.get("image")
        has_image = img_path and Path(img_path).is_file()
        steps_lines = slide_def.get("steps_lines") or []

        if has_image:
            slide.shapes.add_picture(str(img_path), Inches(0.45), Inches(1.0), width=Inches(12.4))
            if steps_lines:
                foot = slide.shapes.add_textbox(Inches(0.45), Inches(6.55), Inches(12.4), Inches(0.75))
                tf = foot.text_frame
                tf.word_wrap = True
                for j, line in enumerate(steps_lines[:4]):
                    para = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
                    para.text = line
                    _ppt_set_font(para, PPT_BODY_PT - 2)
        elif slide_def["num"] == 1:
            sub = slide.shapes.add_textbox(Inches(0.6), Inches(2.0), Inches(12), Inches(3.5))
            t = sub.text_frame.paragraphs[0]
            t.text = f"Isara Anywhere\n{subtitle}\nv{VERSION} | {DATE_TH}\nแบบอักษร {PPT_FONT}"
            _ppt_set_font(t, PPT_TITLE_PT, bold=True)
        elif slide_def["num"] == 2:
            body = slide.shapes.add_textbox(Inches(0.6), Inches(1.4), Inches(12), Inches(5.5))
            url = PATIENT_URL if portal == "patient" else DOCTOR_URL
            for j, line in enumerate(
                [
                    f"URL: {url}",
                    f"สไลด์มีภาพจาก UI tests: {len(slides) - 3} รายการ",
                    "รูปแบบ: หนึ่งภาพต่อหนึ่งสไลด์ + คำอธิบายขั้นตอน",
                    "อ้างอิง Processes/ และ GATE0 workflows",
                ]
            ):
                para = body.text_frame.paragraphs[0] if j == 0 else body.text_frame.add_paragraph()
                para.text = line
                _ppt_set_font(para, PPT_BODY_PT)
        elif steps_lines:
            body = slide.shapes.add_textbox(Inches(0.6), Inches(1.2), Inches(12), Inches(5.8))
            for j, line in enumerate(steps_lines):
                para = body.text_frame.paragraphs[0] if j == 0 else body.text_frame.add_paragraph()
                para.text = line
                _ppt_set_font(para, PPT_BODY_PT)

        if slide_def.get("notes"):
            notes_tf = slide.notes_slide.notes_text_frame
            notes_tf.text = slide_def["notes"]
            for para in notes_tf.paragraphs:
                _ppt_set_font(para, PPT_NOTES_PT)

    prs.save(str(out_path))
    img_count = sum(1 for s in slides if s.get("image") and Path(s["image"]).is_file())
    print(
        f"  PPTX: {out_path} ({len(slides)} slides, {img_count} images, "
        f"{PPT_FONT}, {out_path.stat().st_size // 1024} KB)"
    )


def build_portal(portal: str) -> None:
    if portal == "patient":
        shots = existing_shots(PATIENT_SHOTS)
        url = PATIENT_URL
        groups = UI_GROUPS_PATIENT
        word_out = DOCS / "USER_GUIDE_PATIENT_WORD_TH.md"
        docx_out = DOCS / "USER_GUIDE_PATIENT_WORD_TH.docx"
        ppt_md_out = DOCS / "USER_GUIDE_PATIENT_PPT_TH.md"
        pptx_out = DOCS / "USER_GUIDE_PATIENT_PPT_TH.pptx"
        doc_title = "คู่มือผู้ป่วย Isara Anywhere"
    else:
        shots = existing_shots(DOCTOR_SHOTS)
        url = DOCTOR_URL
        groups = UI_GROUPS_DOCTOR
        word_out = DOCS / "USER_GUIDE_DOCTOR_WORD_TH.md"
        docx_out = DOCS / "USER_GUIDE_DOCTOR_WORD_TH.docx"
        ppt_md_out = DOCS / "USER_GUIDE_DOCTOR_PPT_TH.md"
        pptx_out = DOCS / "USER_GUIDE_DOCTOR_PPT_TH.pptx"
        doc_title = "คู่มือแพทย์และผู้ดูแล Isara Anywhere"

    print(f"\n=== {portal.upper()} ({len(shots)} screenshots) ===")

    word_out.write_text(word_md(portal, shots, url, groups), encoding="utf-8")
    print(f"  MD Word: {word_out}")

    ppt_md_out.write_text(ppt_md(portal, shots, url), encoding="utf-8")
    print(f"  MD PPT:  {ppt_md_out}")

    build_docx(word_out, docx_out, doc_title, portal, shots, url, groups)
    slides = parse_ppt_slides(ppt_md_out.read_text(encoding="utf-8"))
    build_pptx(slides, pptx_out, portal)


def main() -> int:
    print("=== Build Isara Anywhere Portal User Guides (TH) ===")
    build_portal("patient")
    build_portal("doctor")
    print("\nDone. Output files in docs/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
