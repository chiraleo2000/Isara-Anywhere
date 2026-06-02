#!/usr/bin/env python3
"""Generate Documents/Technical_Documents/05_Appendix_Full_Process_Steps.md from Processes/."""
from __future__ import annotations

import glob
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Documents" / "Technical_Documents" / "05_Appendix_Full_Process_Steps.md"
PAGES = ROOT / "Processes" / "Pages"
PROCESSES = ROOT / "Processes"

PORTALS = [
    ("Patient-Portal", "พอร์ทัลผู้ป่วย", "patient-portal"),
    ("Doctor-Portal", "พอร์ทัลแพทย์/แอดมิน", "doctor-portal"),
    ("Meeting-Server", "Meeting Server", "meeting-server"),
]

SYSTEM_DOCS = [
    "Appointment_Workflows.md",
    "VIDEO_MEETING_JITSI_GEMINI.md",
    "FULL_WORKFLOW_CONTRACT.md",
    "Combined_Workflows_And_Actions.md",
    "Separated_Workflows_And_Functions.md",
    "Health_Records_Processes.md",
    "Notification_Workflows.md",
    "User_management_Workflows.md",
    "Data_Sync_Documentation.md",
    "PostgreSQL_Database_Architecture.md",
    "Living_Will_Processes.md",
    "Medicine_Content_Processes.md",
    "Medical_Consultants_Workflows.md",
    "Clinical_Resources_&_Medical_Library_Workflows.md",
    "System_Architecture_Overview.md",
    "PHASE1_REQUIREMENTS.md",
    "PHASE1_BASELINE_WORKFLOW_CONTRACT.md",
    "GATE0_IMPLEMENTATION_STATUS.md",
    "ENV_AND_STACK_CHECK.md",
    "UI_Pages_Workflows.md",
    "FULL_WORKFLOW_HARDENING_COMPLETION_REPORT.md",
    "TWO_ROUND_CLOUD_TESTING.md",
    "Living_Will_Implementation_Plan.md",
]


def rel_link(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def extract_workflows(text: str) -> str | None:
    m = re.search(
        r"(## [0-9]+\. Workflows?.*?(?=\n## (?:PostgreSQL|คำอธิบาย|Automated|ขั้นตอน|API Endpoints|Connections)|\Z))",
        text,
        re.S,
    )
    if not m:
        m = re.search(
            r"(## [0-9]+\. Workflow\b.*?(?=\n## (?:PostgreSQL|คำอธิบาย|Automated|ขั้นตอน)|\Z))",
            text,
            re.S,
        )
    return m.group(1).strip() if m else None


def simplify_detailed_steps(text: str) -> str | None:
    m = re.search(
        r"## ขั้นตอนการใช้งาน \(ละเอียด\)(.*?)(?=\n## |\Z)",
        text,
        re.S,
    )
    if not m:
        return None
    body = m.group(1)
    lines: list[str] = []
    for line in body.splitlines():
        if re.match(r"^\d+\.\s+", line.strip()):
            # first line of numbered step only
            lines.append(line.rstrip())
        elif line.strip().startswith("**เงื่อนไขก่อนเริ่ม"):
            lines.append(line.rstrip())
        elif line.startswith("### ผลลัพธ์") or line.startswith("### ข้อควรระวัง"):
            lines.append("")
            lines.append(line.rstrip())
        elif line.strip().startswith("- ") and lines and lines[-1].startswith("###"):
            lines.append(line.rstrip())
    if not lines:
        return None
    return "## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)\n\n" + "\n".join(lines)


def extract_context(text: str) -> str | None:
    m = re.search(
        r"### วัตถุประสงค์\n\n(.*?)(?=\n### |\n## )",
        text,
        re.S,
    )
    if m:
        return m.group(1).strip()[:800]
    return None


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9\-]+", "-", s.lower()).strip("-")


def process_page(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")
    title_m = re.search(r"^# (.+)$", text, re.M)
    title = title_m.group(1) if title_m else path.stem
    anchor = slug(path.stem)
    parts = [
        f"### {path.name}",
        "",
        f"**ต้นฉบับ:** [`{rel_link(path)}`](../../{rel_link(path)})",
        "",
    ]
    ctx = extract_context(text)
    if ctx:
        parts += ["**วัตถุประสงค์ (ย่อ):**", "", ctx, ""]
    wf = extract_workflows(text)
    if wf:
        parts += [wf, ""]
    steps = simplify_detailed_steps(text)
    if steps:
        parts += [steps, ""]
    if not wf and not steps:
        # overview: try navigation section
        nav = re.search(r"(## [0-9]+\. Route Map.*?(?=\n## [0-9]+\. |\n## คำ|\Z))", text, re.S)
        if nav:
            parts += [nav.group(1).strip()[:4000], ""]
    return "\n".join(parts), anchor


def extract_system_doc(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")
    title_m = re.search(r"^# (.+)$", text, re.M)
    title = title_m.group(1) if title_m else path.name
    parts = [
        f"### {path.name}",
        "",
        f"**ต้นฉบับ:** [`{rel_link(path)}`](../../{rel_link(path)})",
        "",
    ]
    # H2 sections (skip toc, code blocks heavy)
    sections = re.findall(r"^## ([^\n]+)\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    kept = 0
    for heading, body in sections:
        h = heading.strip()
        if h.lower().startswith("table of contents") or "```" in body[:200] and body.count("```") > 4:
            continue
        # workflow-like: has Step N: or numbered workflow
        if re.search(r"Step \d+:|^### Workflow|^\d+\.\s+", body, re.M) or "Must-Pass" in h or "Invariant" in h:
            snippet = body.strip()
            if len(snippet) > 6000:
                snippet = snippet[:6000] + "\n\n… *(ตัด — ดูต้นฉบับ)*"
            parts += [f"#### {h}", "", snippet, ""]
            kept += 1
            if kept >= 8:
                break
    if kept == 0:
        parts.append("*ดูขั้นตอนเต็มในไฟล์ต้นฉบับ — เอกสารนี้ยาวเกินกว่าจะคัดลอกทั้งหมดอัตโนมัติ*")
        parts.append("")
    return "\n".join(parts)


def main() -> None:
    lines = [
        "# ภาคผนวก — ขั้นตอนกระบวนการเต็ม (Full Process Steps)",
        "",
        "> **อัปเดต:** สร้างอัตโนมัติจาก `Processes/Pages` และ `Processes/*.md`",
        "> **ขอบเขต:** As-is — ไม่มีข้อเสนอแนะเพิ่ม",
        "> **เอกสารหลัก:** [01 Architecture](01_System_Architecture_and_Workflow.md) · [02 Auth](02_Authentication_and_Authorization.md) · [03 Storage](03_Data_Storage_Architecture.md) · [04 Jitsi](04_Jitsi_Integration_and_Code_Examples.md)",
        "",
        "เอกสารนี้รวบรวม **Workflow** และ **ขั้นตอนการใช้งาน (สรุป)** จากสเปก Processes — รายละเอียด `data-testid` และ boilerplate ENRICH เต็มอยู่ในไฟล์ต้นฉบับแต่ละหน้า",
        "",
        "---",
        "",
        "## สารบัญ",
        "",
    ]

    for _, portal_th, anchor in PORTALS:
        lines.append(f"- [{portal_th}](#{anchor})")

    lines.append("- [เอกสาร Workflow ระดับระบบ](#system-workflows)")
    lines.append("")
    lines.append("---")
    lines.append("")

    for portal_dir, portal_th, anchor in PORTALS:
        lines.append(f'<a id="{anchor}"></a>')
        lines.append("")
        lines.append(f"## {portal_th}")
        lines.append("")
        pattern = str(PAGES / portal_dir / "*.md")
        for fpath in sorted(glob.glob(pattern)):
            path = Path(fpath)
            block, _ = process_page(path)
            lines.append(block)
            lines.append("---")
            lines.append("")

    lines.append('<a id="system-workflows"></a>')
    lines.append("")
    lines.append("## เอกสาร Workflow ระดับระบบ")
    lines.append("")
    for name in SYSTEM_DOCS:
        path = PROCESSES / name
        if path.exists():
            lines.append(extract_system_doc(path))
            lines.append("---")
            lines.append("")

    lines += [
        "## การสร้างเอกสารใหม่",
        "",
        "```bash",
        "python scripts/build-appendix-process-steps.py",
        "```",
        "",
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
