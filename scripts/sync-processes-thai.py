#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sync Processes/Thai from English Processes/ sources.

Usage:
  python scripts/sync-processes-thai.py           # full sync (clears Thai/ first)
  python scripts/sync-processes-thai.py --dry-run

Removes old Thai/*.md, mirrors root workflows + Pages/ with Thai content.
"""
from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROCESSES = ROOT / "Processes"
THAI = PROCESSES / "Thai"
PAGES = PROCESSES / "Pages"

# Redirect stubs — skip full translation (generate minimal TH redirect)
SKIP_FULL = {
    "UI_Pages_Workflows.md",
    "PHASE1_BASELINE_WORKFLOW_CONTRACT.md",
}

# Filename mapping (EN → TH basename without _TH)
NAME_MAP = {
    "VIDEO_MEETING_JITSI_GEMINI.md": "Video_Meeting_TH.md",
    "README.md": "README_TH.md",
    "WORKFLOW_CONNECTIONS.md": "WORKFLOW_CONNECTIONS_TH.md",
}

HEADER_TH: dict[str, str] = {
    "Table of Contents": "สารบัญ",
    "Overview": "ภาพรวม",
    "Purpose": "วัตถุประสงค์",
    "Features": "ฟีเจอร์",
    "Features & Functions": "ฟีเจอร์และฟังก์ชัน",
    "Scenarios": "สถานการณ์",
    "Workflow": "ขั้นตอนการทำงาน",
    "Workflows": "ขั้นตอนการทำงาน",
    "API Endpoints": "API Endpoints",
    "Database": "ฐานข้อมูล",
    "Database Tables Used": "ตารางฐานข้อมูลที่ใช้",
    "Security": "ความปลอดภัย",
    "Cross-references": "เอกสารอ้างอิง",
    "Cross-Reference Matrix": "ตารางอ้างอิงข้ามระบบ",
    "Document Index": "ดัชนีเอกสาร",
    "Version History": "ประวัติเวอร์ชัน",
    "Test Credentials & Verification": "ข้อมูลทดสอบและการตรวจสอบ",
    "End-to-end delivery pipeline": "ลำดับการส่งมอบเอกสารแบบครบวงจร",
    "Document types": "ประเภทเอกสาร",
    "Platform topology": "โทโพโลยีแพลตฟอร์ม",
    "Full working order (numbered)": "ลำดับการทำงานเต็ม (เรียงตามขั้นตอน)",
    "Core appointment → delivery pipeline": "ไปป์ไลน์นัดหมาย → ส่งมอบเอกสาร",
    "Realtime sync chain": "ห่วงโซ่ซิงค์แบบเรียลไทม์",
    "Feature & function matrix": "ตารางฟีเจอร์และฟังก์ชัน",
    "Database ↔ workflow map": "แผนที่ฐานข้อมูล ↔ workflow",
    "Document map (what to read)": "แผนที่เอกสาร (อ่านอะไรก่อน)",
    "Superseded (do not extend)": "เลิกใช้แล้ว (ไม่ต่อยอด)",
}

GLOSSARY: list[tuple[str, str]] = [
    ("Patient Portal", "พอร์ทัลผู้ป่วย"),
    ("Doctor Portal", "พอร์ทัลแพทย์"),
    ("Meeting Server", "Meeting Server"),
    ("Man-in-the-Loop", "Man-in-the-Loop (แพทย์ตรวจสอบก่อนส่งถึงผู้ป่วย)"),
    ("appointment", "นัดหมาย"),
    ("appointments", "นัดหมาย"),
    ("confirmed", "ยืนยันแล้ว"),
    ("pending", "รอดำเนินการ"),
    ("in_pool", "รอจัดสรร"),
    ("in_progress", "กำลังดำเนินการ"),
    ("signed", "ลงนามแล้ว"),
    ("notifications", "การแจ้งเตือน"),
    ("prescription", "ใบสั่งยา"),
    ("prescriptions", "ใบสั่งยา"),
    ("lab orders", "คำสั่งตรวจแล็บ"),
    ("Health Records", "เวชระเบียน"),
    ("Living Will", "หนังสือแสดงเจตจำนอง"),
    ("PostgreSQL", "PostgreSQL"),
    ("Single source of truth", "แหล่งข้อมูลเดียว (Single source of truth)"),
    ("Last Updated", "อัปเดตล่าสุด"),
    ("Status", "สถานะ"),
    ("Version", "เวอร์ชัน"),
    ("Description", "คำอธิบาย"),
    ("Feature", "ฟีเจอร์"),
    ("Step", "ขั้นตอน"),
    ("Actor", "ผู้ดำเนินการ"),
    ("Action", "การกระทำ"),
    ("Primary doc", "เอกสารหลัก"),
    ("Read first", "อ่านก่อน"),
    ("Then", "ต่อด้วย"),
    ("Need", "ความต้องการ"),
    ("Book", "จองนัด"),
    ("Confirm", "ยืนยัน"),
    ("Assign", "มอบหมาย"),
    ("Notify patient", "แจ้งผู้ป่วย"),
    ("Sign EMR", "ลงนาม EMR"),
    ("Video meeting", "ประชุมวิดีโอ"),
    ("Post-meeting", "หลังประชุม"),
    ("Document delivery", "ส่งมอบเอกสาร"),
    ("Realtime", "เรียลไทม์"),
    ("Admin", "ผู้ดูแลระบบ"),
    ("Doctor", "แพทย์"),
    ("Patient", "ผู้ป่วย"),
]

THAI_SECTION_MARKERS = [
    "## มาตรฐานเอกสาร",
    "## คำอธิบายและบริบท (รายงานภาษาไทย)",
    "## ขั้นตอนการใช้งาน (ละเอียด)",
    "## ผลลัพธ์ที่คาดหวัง",
]

META_TH = """> **เอกสารภาษาไทย** — สร้างอัตโนมัติจาก `{src}`  
> **ต้นฉบับภาษาอังกฤษ:** [`{src}`](../{src})  
> **อัปเดต:** 9 กรกฎาคม 2569 · รัน `python scripts/sync-processes-thai.py` เพื่อสร้างใหม่

"""


def thai_basename(en_name: str) -> str:
    if en_name in NAME_MAP:
        return NAME_MAP[en_name]
    stem = en_name.replace(".md", "")
    if stem.endswith("_TH"):
        return en_name
    return f"{stem}_TH.md"


def translate_line(line: str) -> str:
    stripped = line.strip()
    if stripped.startswith("```") or stripped.startswith("| `"):
        return line
    # Preserve routes, API paths, file paths
    if re.search(r"`[/\\]", line) or re.search(r"^\*\*Route:\*\*", line):
        return line
    if "`" in line:
        # Only translate outside backticks
        parts = re.split(r"(`[^`]*`)", line)
        return "".join(p if p.startswith("`") else _translate_plain(p) for p in parts)
    if line.startswith("#"):
        for en, th in HEADER_TH.items():
            if en in line:
                line = line.replace(en, th)
        return line
    return _translate_plain(line)


def _translate_plain(text: str) -> str:
    out = text
    for en, th in GLOSSARY:
        # Avoid breaking paths and identifiers
        if en.lower() in ("appointment", "appointments", "patient", "doctor", "admin", "book", "confirm", "assign", "step"):
            out = re.sub(rf"(?<![/`\w]){re.escape(en)}(?![/`\w])", th, out, flags=re.IGNORECASE)
        else:
            out = re.sub(rf"\b{re.escape(en)}\b", th, out, flags=re.IGNORECASE)
    return out


def extract_thai_blocks(text: str) -> str:
    parts: list[str] = []
    for marker in THAI_SECTION_MARKERS:
        if marker not in text:
            continue
        m = re.search(
            rf"({re.escape(marker)}.*?)(?=\n## (?!#)|\Z)",
            text,
            re.S,
        )
        if m:
            parts.append(m.group(1).strip())
    return "\n\n---\n\n".join(parts)


def translate_body(text: str, is_page: bool = False) -> str:
    if is_page:
        thai_blocks = extract_thai_blocks(text)
        if thai_blocks:
            return thai_blocks

    lines = text.splitlines()
    out: list[str] = []
    in_fence = False
    for line in lines:
        if line.strip().startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue
        if line.startswith("## ") and not any(m in line for m in ["ภาษาไทย", "มาตรฐานเอกสาร"]):
            # skip duplicate EN sections when page already has Thai blocks
            if is_page and line in (
                "## 1. Purpose",
                "## 2. Three Sub-Pages",
            ):
                continue
        out.append(translate_line(line))
    return "\n".join(out)


def translate_title(text: str) -> str:
    m = re.search(r"^# (.+)$", text, re.M)
    if not m:
        return "เอกสารกระบวนการ Izara"
    title = m.group(1)
    title = re.sub(r"^📄\s*", "", title)
    title = re.sub(r"^📋\s*", "", title)
    title = re.sub(r"^🏗️\s*", "", title)
    replacements = [
        ("Izara Telemedicine — Comprehensive Workflows, Processes & Architecture",
         "Izara Telemedicine — ขั้นตอนการทำงาน กระบวนการ และสถาปัตยกรรม (ฉบับสมบูรณ์)"),
        ("Workflow Connections — Features, Functions & Diagrams",
         "การเชื่อมต่อ Workflow — ฟีเจอร์ ฟังก์ชัน และแผนภาพ"),
        ("Clinical Document Delivery Workflows", "ขั้นตอนส่งมอบเอกสารทางคลินิก"),
        ("Patient Portal —", "พอร์ทัลผู้ป่วย —"),
        ("Doctor Portal —", "พอร์ทัลแพทย์ —"),
        ("Meeting Server —", "Meeting Server —"),
        ("Virtual Meeting Page — Removed", "หน้า Virtual Meeting — เลิกใช้แล้ว"),
    ]
    for en, th in replacements:
        if en in title:
            return th + title.split(en, 1)[-1] if en.endswith("—") else th
    return translate_line(title)


def build_th_doc(src_rel: str, text: str, is_page: bool = False) -> str:
    if Path(src_rel).name in SKIP_FULL:
        return (
            f"# {translate_title(text)}\n\n"
            f"**สถานะ:** รวมเข้าเอกสารหลักแล้ว — ดูต้นฉบับภาษาอังกฤษ [`{src_rel}`](../{src_rel})\n"
        )

    title_th = translate_title(text)
    meta = META_TH.format(src=src_rel.replace("\\", "/"))

    # Preserve mermaid + ascii diagrams from source (after title)
    body = text
    title_m = re.match(r"^# .+\n", body)
    if title_m:
        body = body[title_m.end() :]

    # Version block (once)
    ver_m = re.search(
        r"(\*\*Version:\*\*[^\n]+\n(?:\*\*[^\n]+\*\*[^\n]+\n)*)",
        body,
    )
    header_extra = ""
    if ver_m:
        header_extra = translate_body(ver_m.group(1)) + "\n\n"
        body = body[ver_m.end() :]

    translated = translate_body(body, is_page=is_page)

    return f"# {title_th}\n\n{meta}{header_extra}{translated}"


def clear_thai_dir() -> None:
    if THAI.exists():
        shutil.rmtree(THAI)
    THAI.mkdir(parents=True)


def sync_root_docs(dry_run: bool) -> list[Path]:
    written: list[Path] = []
    for path in sorted(PROCESSES.glob("*.md")):
        rel = path.name
        if path.name.startswith("."):
            continue
        dest = THAI / thai_basename(path.name)
        content = build_th_doc(rel, path.read_text(encoding="utf-8"), is_page=False)
        if not dry_run:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding="utf-8")
        written.append(dest)
    return written


def sync_pages(dry_run: bool) -> list[Path]:
    written: list[Path] = []
    for path in sorted(PAGES.rglob("*.md")):
        rel = path.relative_to(PROCESSES).as_posix()
        dest = THAI / "Pages" / path.relative_to(PAGES)
        dest = dest.parent / thai_basename(dest.name)
        content = build_th_doc(rel, path.read_text(encoding="utf-8"), is_page=True)
        if not dry_run:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content, encoding="utf-8")
        written.append(dest)
    return written


def write_hub_readme_th(dry_run: bool) -> None:
    """Curated Thai hub — overrides auto-generated README_TH."""
    content = """# 📄 Izara Telemedicine — ขั้นตอนการทำงาน กระบวนการ และสถาปัตยกรรม

**เวอร์ชัน:** 1.7.55  
**อัปเดตล่าสุด:** 9 กรกฎาคม 2569  
**ขอบเขต:** เว็บแอป (พอร์ทัลผู้ป่วย + พอร์ทัลแพทย์ + Meeting Server)  
**สถานะ:** ✅ Phase 1 เสร็จสมบูรณ์ — ดู [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md)

> **ศูนย์กลาง:** [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md) · [Combined_Workflows_TH](Combined_Workflows_And_Actions_TH.md) · [Pages/](Pages/)

---

## สารบัญด่วน

| หัวข้อ | เอกสารภาษาไทย | ต้นฉบับ EN |
| ------ | ------------- | ---------- |
| แผนที่แพลตฟอร์ม + แผนภาพ | [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md) | [WORKFLOW_CONNECTIONS.md](../WORKFLOW_CONNECTIONS.md) |
| นัดหมาย → ประชุม → EMR | [Appointment_Workflows_TH.md](Appointment_Workflows_TH.md) | [Appointment_Workflows.md](../Appointment_Workflows.md) |
| ประชุมวิดีโอ + AI | [Video_Meeting_TH.md](Video_Meeting_TH.md) | [VIDEO_MEETING_JITSI_GEMINI.md](../VIDEO_MEETING_JITSI_GEMINI.md) |
| หลังประชุม | [POST_MEETING_WORKFLOW_TH.md](POST_MEETING_WORKFLOW_TH.md) | [POST_MEETING_WORKFLOW.md](../POST_MEETING_WORKFLOW.md) |
| เวชระเบียน PHR/EMR | [Health_Records_Processes_TH.md](Health_Records_Processes_TH.md) | [Health_Records_Processes.md](../Health_Records_Processes.md) |
| ส่งมอบเอกสารคลินิก | [Clinical_Document_Delivery_Workflows_TH.md](Clinical_Document_Delivery_Workflows_TH.md) | [Clinical_Document_Delivery_Workflows.md](../Clinical_Document_Delivery_Workflows.md) |
| ผู้ใช้และสิทธิ์ | [User_management_Workflows_TH.md](User_management_Workflows_TH.md) | [User_management_Workflows.md](../User_management_Workflows.md) |
| แจ้งเตือน | [Notification_Workflows_TH.md](Notification_Workflows_TH.md) | [Notification_Workflows.md](../Notification_Workflows.md) |
| ซิงค์ข้อมูล | [Data_Sync_Documentation_TH.md](Data_Sync_Documentation_TH.md) | [Data_Sync_Documentation.md](../Data_Sync_Documentation.md) |
| หนังสือแสดงเจตจำนอง | [Living_Will_Processes_TH.md](Living_Will_Processes_TH.md) | [Living_Will_Processes.md](../Living_Will_Processes.md) |
| คลังความรู้ / แหล่งคลินิก | [Medicine_Content_Processes_TH.md](Medicine_Content_Processes_TH.md) | [Medicine_Content_Processes.md](../Medicine_Content_Processes.md) |
| สเปกหน้าจอ | [Pages/](Pages/) | [Pages/](../Pages/) |

---

## ลำดับการทำงานหลัก (12 ขั้นตอน)

```text
 1. ผู้ป่วยจองนัด          → appointments (pending / in_pool)
 2. แอดมินมอบหมาย / แพทย์ยืนยัน → confirmed + ลิงก์ Jitsi
 3. แพทย์เริ่มประชุม (HOST) → meeting_records
 4. ผู้ป่วย/แขก lobby → เข้าห้อง → ถอดเสียง + แชท
 5. แพทย์จบประชุม
 6. Gemini สรุป SOAP
 7. แพทย์ตรวจสอบ AI (Man-in-the-Loop)
 8. ลงนาม EMR
 9. สั่งยา / แล็บ / ภาพรวม (ถ้ามี)
10. DocumentDeliveryService → patient_documents
11. แจ้งเตือนผู้ป่วย
12. ผู้ป่วยดูผลใน PHR
```

รายละเอียดแผนภาพ: [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md)

---

## บริการและพอร์ต

| บริการ | พอร์ต (Local) | บทบาท |
| ------ | ------------- | ----- |
| พอร์ทัลผู้ป่วย | 3005 | UI + API ผู้ป่วย |
| พอร์ทัลแพทย์ | 3010 | UI + API แพทย์/แอดมิน |
| Meeting Server | 3020 | Jitsi, ถอดเสียง, AI |
| PostgreSQL | 5433 | ฐานข้อมูล izara_phase1 |

---

## เอกสารที่เลิกใช้ (อย่าต่อยอด)

| แทนที่ด้วย | ไฟล์เดิม |
| ---------- | -------- |
| `Pages/` | UI_Pages_Workflows.md |
| `Living_Will_Processes.md` | *(removed)* `Living_Will_Implementation_Plan.md` |
| FULL_WORKFLOW_CONTRACT.md | PHASE1_BASELINE_WORKFLOW_CONTRACT.md |
| Meeting-Server/01_Meeting_Room | 07_Virtual_Meeting.md |

---

## การสร้างเอกสารใหม่

```bash
python scripts/enrich-process-pages.py --force-steps
python scripts/sync-processes-thai.py
```

**ต้นฉบับภาษาอังกฤษ:** [Processes/README.md](../README.md)
"""
    dest = THAI / "README_TH.md"
    if not dry_run:
        dest.write_text(content, encoding="utf-8")


def write_workflow_connections_th(dry_run: bool) -> None:
    src = (PROCESSES / "WORKFLOW_CONNECTIONS.md").read_text(encoding="utf-8")
    # Curated title + intro, keep mermaid blocks from source
    intro = """# การเชื่อมต่อ Workflow — ฟีเจอร์ ฟังก์ชัน และแผนภาพ

**เวอร์ชัน:** 1.1.0  
**อัปเดตล่าสุด:** 9 กรกฎาคม 2569  
**วัตถุประสงค์:** แผนที่เดียวที่แสดงการเชื่อมต่อพอร์ทัล บริการ ฐานข้อมูล และเรียลไทม์  
**รายละเอียด:** เอกสาร workflow โดเมนในลิงก์; สเปกหน้าใน [Pages/](Pages/)

> **ต้นฉบับ EN:** [WORKFLOW_CONNECTIONS.md](../WORKFLOW_CONNECTIONS.md)

---

## สารบัญ

1. [โทโพโลยีแพลตฟอร์ม](#1-โทโพโลยีแพลตฟอร์ม)
2. [แผนที่บริการข้ามพอร์ทัล](#2-แผนที่บริการข้ามพอร์ทัล)
3. [ไปป์ไลน์นัดหมาย → ส่งมอบเอกสาร](#3-ไปป์ไลน์นัดหมาย--ส่งมอบเอกสาร)
4. [ห่วงโซ่ซิงค์เรียลไทม์](#4-ห่วงโซ่ซิงค์เรียลไทม์)
5. [ตารางฟีเจอร์และฟังก์ชัน](#5-ตารางฟีเจอร์และฟังก์ชัน)
6. [แผนที่ฐานข้อมูล ↔ workflow](#6-แผนที่ฐานข้อมูล--workflow)
7. [แผนที่เอกสาร](#7-แผนที่เอกสาร)

---

## 1. โทโพโลยีแพลตฟอร์ม

"""
    # Extract mermaid and tables from English after "## 1. Platform topology"
    m = re.search(r"(```mermaid.*?```\s*\n\| Layer \|.*?\n\n---)", src, re.S)
    topology = m.group(1) if m else ""
    topology = topology.replace("| Layer | Technology | Role |", "| ชั้น | เทคโนโลยี | บทบาท |")
    topology = topology.replace("Patient UI", "UI ผู้ป่วย")
    topology = topology.replace("Doctor UI", "UI แพทย์")
    topology = topology.replace("Single source of truth", "แหล่งข้อมูลเดียว")

    section2 = """
---

## 2. แผนที่บริการข้ามพอร์ทัล

| พอร์ต | บริการ | npm dev | Docker | เส้นทางหลัก |
| ---- | ------- | ------- | ------ | ----------- |
| 3005 | UI + API ผู้ป่วย | Vite + proxy | คอนเทนเนอร์เดียว | `/home`, `/appointments`, `/api/*` |
| 3010 | UI แพทย์ | Vite | Nginx :8080 | `/dashboard`, `/health-meeting`, `/meeting/:id` |
| 3020 | Meeting Server | Express | คอนเทนเนอร์ | `/api/meetings/*`, Socket.IO |
| 5433 | PostgreSQL | Docker host | `postgres:5432` | ทุกพอร์ทัลใช้ `izara_phase1` |

**สัญญา Auth:** `JWT_SECRET` / session ร่วมกันทุกพอร์ทัล

---

## 3. ไปป์ไลน์นัดหมาย → ส่งมอบเอกสาร

"""
    m2 = re.search(r"(```mermaid\nsequenceDiagram.*?```)", src, re.S)
    pipeline_diagram = m2.group(1) if m2 else ""

    working_order = """
### ลำดับการทำงานเต็ม (เรียงตามขั้นตอน)

```text
 1. ผู้ป่วยจองนัด          → appointments (pending / in_pool)
 2. แอดมินมอบหมาย / แพทย์ยืนยัน → confirmed + Jitsi URLs + calendarEventUrl
 3. แพทย์เริ่มประชุม (HOST)     → meeting_records (in_progress)
 4. ผู้ป่วย/แขก lobby → เข้าห้อง   → Jitsi + transcript + chat
 5. แพทย์จบประชุม              → meeting_records (ended)
 6. Gemini SOAP pipeline             → meeting_records.ai_summary
 7. แพทย์ตรวจสอบ AI (Man-in-the-Loop)   → ai_validations
 8. แพทย์ลงนาม EMR               → emr (signed) → patient_documents
 9. สั่งยา / แล็บ / ภาพรวม        → prescriptions, lab_orders, imaging_orders
10. DocumentDeliveryService publish  → patient_documents
11. แจ้งเตือน + NOTIFY           → กระดิ่งผู้ป่วย + แท็บ PHR
12. ผู้ป่วยดูผล            → PHR เอกสาร / ผลการรักษา
```

```mermaid
flowchart TD
  A[1 จอง] --> B[2 ยืนยัน/มอบหมาย]
  B --> C[3–5 ประชุมวิดีโอ]
  C --> D[6–7 AI + แพทย์ตรวจ]
  D --> E[8 ลงนาม EMR]
  E --> F[9 คำสั่งคลินิก]
  F --> G[10 เผยแพร่เอกสาร]
  G --> H[11 แจ้งผู้ป่วย]
  H --> I[12 ส่งมอบ PHR]
```

| ขั้น | สถานะ / สิ่งประกอบ | ตารางหลัก | เอกสาร |
| ----- | ----------------- | -------------- | ----------- |
| จอง | `pending` / `in_pool` | `appointments` | Appointment_Workflows |
| มอบหมาย/ยืนยัน | `confirmed` | `appointments`, `notifications` | Appointment §pool |
| ประชุม | `in_progress` | `meeting_records`, `meeting_transcripts` | Video_Meeting |
| ร่าง AI | processing | `meeting_records.ai_summary` | POST_MEETING |
| แพทย์ตรวจ | `ai_validations` | `ai_validations` | หลังประชุม |
| ลงนามคลินิก | EMR `signed` | `emr`, `prescriptions`, `lab_orders` | Health_Records |
| ส่งมอบผู้ป่วย | `ready_for_patient` | `patient_documents`, `notifications` | Clinical_Document_Delivery |

---

## 4. ห่วงโซ่ซิงค์เรียลไทม์

"""
    m3 = re.search(r"(```mermaid\nflowchart LR.*?```)", src, re.S)
    realtime = m3.group(1) if m3 else ""

    footer = """
| Trigger | ตาราง | อัปเดต UI ทั่วไป |
| ------- | ----- | ----------------- |
| `trg_appointments_notify` | `appointments` | คิว, pool, รายการผู้ป่วย |
| `trg_emr_notify` | `emr` | Timeline, ดูเวชระเบียน |
| `trg_prescriptions_notify` | `prescriptions` | ยาใน PHR |
| `trg_lab_orders_notify` | `lab_orders` | ผลแล็บ |
| `trg_notifications_notify` | `notifications` | กระดิ่งแจ้งเตือน |
| `trg_vital_signs_notify` | `vital_signs` | กราฟสัญญาณชีพ |
| `trg_phr_notify` | `phr` | ภาพรวม PHR |
| `trg_doctor_schedules_notify` | `doctor_schedules` | ช่องจอง |

รายละเอียดเต็ม: [Data_Sync_Documentation_TH.md](Data_Sync_Documentation_TH.md)

---

## 5. ตารางฟีเจอร์และฟังก์ชัน

| โดเมน | ฟีเจอร์หลัก | การกระทำของผู้ใช้ | เอกสารหลัก |
| ------ | ------------ | ------------------------ | ----------- |
| **Auth** | ลงทะเบียน, เข้าสู่ระบบ, รีเซ็ตรหัส | สร้างบัญชี, อนุมัติแพทย์ | User_management |
| **นัดหมาย** | จอง, pool, AI triage, ปฏิทิน | จอง, มอบหมาย, ยืนยัน | Appointment |
| **ประชุมวิดีโอ** | Jitsi, lobby, แขก | Host, อนุมัติ, ถอดเสียง | Video_Meeting |
| **หลังประชุม** | Gemini SOAP, Man-in-the-Loop | ตรวจ/อนุมัติ AI | POST_MEETING |
| **EMR** | SOAP, e-Rx, แล็บ | บันทึกการรักษา | Health_Records |
| **ส่งมอบเอกสาร** | EMR, Rx, PDF แล็บ | ลงนาม, เผยแพร่ | Clinical_Document_Delivery |
| **แจ้งเตือน** | In-app + realtime | กระดิ่ง, อ่านแล้ว | Notification |

---

## 6. แผนที่ฐานข้อมูล ↔ workflow

| Workflow | ตารางอ่าน/เขียน |
| -------- | ----------------- |
| เข้าสู่ระบบ | `users`, `sessions` |
| จองนัด | `appointments`, `notifications`, `doctor_schedules` |
| ประชุม | `meeting_records`, `meeting_transcripts`, `meeting_chats` |
| AI หลังประชุม | `ai_validations`, `meeting_records` |
| ลงนามการรักษา | `emr`, `prescriptions`, `lab_orders`, `imaging_orders` |
| ส่งมอบผู้ป่วย | `patient_documents`, `patient_instructions`, `notifications` |

---

## 7. แผนที่เอกสาร

| ความต้องการ | อ่านก่อน | ต่อด้วย |
| ---- | ---------- | ---- |
| ศูนย์กลาง | [README_TH.md](README_TH.md) | เอกสารนี้ |
| ทดสอบยอมรับ | FULL_WORKFLOW_CONTRACT_TH | PROCESS_TO_TEST_GATE_TH |
| สเปกหน้า | [Pages/README_TH.md](Pages/README_TH.md) | ไฟล์ใน Pages/ |
| สถาปัตยกรรม | System_Architecture_Overview_TH | ENV_AND_STACK_CHECK_TH |
"""
    content = intro + topology + section2 + pipeline_diagram + working_order + realtime + footer
    dest = THAI / "WORKFLOW_CONNECTIONS_TH.md"
    if not dry_run:
        dest.write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Processes/Thai from English sources")
    parser.add_argument("--dry-run", action="store_true", help="List files only")
    args = parser.parse_args()

    if not args.dry_run:
        clear_thai_dir()
        THAI.mkdir(parents=True, exist_ok=True)

    root_files = sync_root_docs(args.dry_run)
    page_files = sync_pages(args.dry_run)
    write_hub_readme_th(args.dry_run)
    write_workflow_connections_th(args.dry_run)

    print(f"Thai sync: {len(root_files)} root + {len(page_files)} pages -> {THAI}")
    if args.dry_run:
        print("(dry-run — no files written)")


if __name__ == "__main__":
    main()
