#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit UI controls: Processes/Pages + TSX data-testid → tests/UI_ELEMENT_COVERAGE_MATRIX.md + .json"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PAGES = REPO / "Processes" / "Pages"
OUT_MD = REPO / "tests" / "UI_ELEMENT_COVERAGE_MATRIX.md"
OUT_JSON = REPO / "tests" / "UI_ELEMENT_COVERAGE.json"

FRONTEND_DIRS = [
    REPO / "Isara-doctor-portal" / "frontend",
    REPO / "Isara-patient-portal" / "frontend",
]

TESTID_RE = re.compile(r'data-testid=["\']([^"\']+)["\']')
QUOTED_TESTID_RE = re.compile(
    r"['\"]((?:phr-tab|queue-|login-|patient-message|lab-report|imaging-report|pdpa-|living-will-)[a-z0-9-]+)['\"]"
)
DOC_TESTID_RE = re.compile(r"`([a-z][a-z0-9-]*)`", re.I)
PAGE_GROUP_MAP = {
    "Doctor-Portal/01": ("A", "U-A"),
    "Doctor-Portal/02": ("A", "U-A"),
    "Doctor-Portal/03": ("C", "U-C"),
    "Doctor-Portal/04": ("C", "U-C"),
    "Doctor-Portal/05": ("E", "U-C"),
    "Doctor-Portal/06": ("D", "U-C"),
    "Doctor-Portal/08": ("E", "U-C"),
    "Doctor-Portal/09": ("E", "U-C"),
    "Doctor-Portal/10": ("L", "U-C"),
    "Doctor-Portal/11": ("F", "U-C"),
    "Doctor-Portal/12": ("H", "U-C"),
    "Doctor-Portal/13": ("H", "U-C"),
    "Doctor-Portal/14": ("H", "U-C"),
    "Doctor-Portal/15": ("J", "U-C"),
    "Doctor-Portal/16": ("C", "U-C"),
    "Doctor-Portal/17": ("I", "U-D"),
    "Doctor-Portal/18": ("I", "U-D"),
    "Doctor-Portal/19": ("I", "U-D"),
    "Doctor-Portal/20": ("D", "U-C"),
    "Doctor-Portal/21": ("D", "U-C"),
    "Patient-Portal/01": ("A", "U-A"),
    "Patient-Portal/02": ("A", "U-A"),
    "Patient-Portal/03": ("A", "U-A"),
    "Patient-Portal/04": ("B", "U-B"),
    "Patient-Portal/05": ("D", "U-B"),
    "Patient-Portal/06": ("F", "U-B"),
    "Patient-Portal/07": ("J", "U-B"),
    "Patient-Portal/08": ("H", "U-B"),
    "Patient-Portal/09": ("J", "U-B"),
    "Patient-Portal/10": ("G", "U-B"),
    "Patient-Portal/11": ("G", "U-B"),
    "Patient-Portal/12": ("B", "U-B"),
    "Patient-Portal/13": ("B", "U-B"),
    "Patient-Portal/14": ("J", "U-B"),
    "Patient-Portal/15": ("I", "U-B"),
    "Meeting-Server/01": ("Q", "U-E"),
    "Meeting-Server/02": ("Q2", "U-E"),
    "Meeting-Server/03": ("E", "U-E"),
}

# Canonical P0 controls every page must expose (static seed; expanded by code scan)
CANONICAL_CONTROLS: list[dict] = [
    {"page": "Doctor-Portal/01_Login_Page.md", "testid": "login-email", "control": "Email input", "type": "input", "priority": "P0"},
    {"page": "Doctor-Portal/01_Login_Page.md", "testid": "login-password", "control": "Password input", "type": "input", "priority": "P0"},
    {"page": "Doctor-Portal/01_Login_Page.md", "testid": "login-submit", "control": "Login submit", "type": "button", "priority": "P0"},
    {"page": "Patient-Portal/01_Login_Page.md", "testid": "login-email", "control": "Email input", "type": "input", "priority": "P0"},
    {"page": "Patient-Portal/01_Login_Page.md", "testid": "login-password", "control": "Password input", "type": "input", "priority": "P0"},
    {"page": "Patient-Portal/01_Login_Page.md", "testid": "login-submit", "control": "Login submit", "type": "button", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-overview", "control": "Overview tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-vitals", "control": "Vitals tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-medications", "control": "Medications tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-allergies", "control": "Allergies tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-lab-imaging", "control": "Lab tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-prescriptions", "control": "Prescriptions tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-documents", "control": "Documents tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-tab-profile", "control": "Profile tab", "type": "tab", "priority": "P0"},
    {"page": "Patient-Portal/06_PHR_Page.md", "testid": "phr-document-upload", "control": "Document upload", "type": "input", "priority": "P0"},
    {"page": "Doctor-Portal/06_Health_Meeting_Page.md", "testid": "health-meeting-page", "control": "Page root", "type": "container", "priority": "P0"},
    {"page": "Doctor-Portal/06_Health_Meeting_Page.md", "testid": "queue-list", "control": "Queue list", "type": "container", "priority": "P0"},
    {"page": "Doctor-Portal/06_Health_Meeting_Page.md", "testid": "queue-count", "control": "Queue KPI", "type": "display", "priority": "P0"},
    {"page": "Doctor-Portal/06_Health_Meeting_Page.md", "testid": "queue-claim-btn", "control": "Claim appointment", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/06_Health_Meeting_Page.md", "testid": "queue-ai-match-btn", "control": "AI match", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/06_Health_Meeting_Page.md", "testid": "confirm-appointment-btn", "control": "Confirm appointment", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/05_Patient_Management_Page.md", "testid": "patient-message-send-btn", "control": "Send message", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/10_Lab_Orders.md", "testid": "lab-report-upload-btn", "control": "Lab PDF upload", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/10_Lab_Orders.md", "testid": "imaging-report-upload-btn", "control": "Imaging upload", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/09_Prescribing.md", "testid": "prescribe-submit", "control": "Prescribe submit", "type": "button", "priority": "P0"},
    {"page": "Doctor-Portal/08_EMR_Editor.md", "testid": "emr-autosave-status", "control": "EMR autosave", "type": "display", "priority": "P0"},
    {"page": "Meeting-Server/01_Meeting_Room.md", "testid": "end-meeting-btn", "control": "End meeting", "type": "button", "priority": "P0"},
    {"page": "Meeting-Server/01_Meeting_Room.md", "testid": "admit-all-btn", "control": "Admit all lobby", "type": "button", "priority": "P0"},
    {"page": "Meeting-Server/02_Meeting_Results.md", "testid": "generate-summary-btn", "control": "Generate summary", "type": "button", "priority": "P0"},
    {"page": "Meeting-Server/02_Meeting_Results.md", "testid": "meeting-results", "control": "Results modal", "type": "modal", "priority": "P0"},
]


@dataclass
class ControlRow:
    page: str
    route: str
    control: str
    control_type: str
    testid: str
    action: str
    expected: str
    screenshot: str
    playwright_group: str
    group_u_step: str
    priority: str
    status: str  # covered | partial | missing
    in_code: bool
    in_doc: bool


def scan_code_testids() -> dict[str, list[str]]:
    found: dict[str, list[str]] = {}
    for base in FRONTEND_DIRS:
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if path.suffix not in (".tsx", ".ts", ".jsx", ".js"):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for m in TESTID_RE.finditer(text):
                tid = m.group(1)
                if "{" in tid:
                    continue
                rel = str(path.relative_to(REPO)).replace("\\", "/")
                found.setdefault(tid, []).append(rel)
            for m in QUOTED_TESTID_RE.finditer(text):
                tid = m.group(1)
                rel = str(path.relative_to(REPO)).replace("\\", "/")
                if tid not in found:
                    found.setdefault(tid, []).append(rel)
    return found


def page_route_hint(page_rel: str) -> str:
    name = Path(page_rel).stem.lower()
    hints = {
        "01_login": "/login",
        "02_register": "/register",
        "03_reset": "/reset-password",
        "04_dashboard": "/dashboard",
        "05_appointments": "/appointments",
        "06_phr": "/phr",
        "06_health_meeting": "/health-meeting",
        "20_appointment_pool": "/health-meeting?tab=queue (redirect)",
    }
    for key, route in hints.items():
        if key.replace("_", "") in name.replace("_", ""):
            return route
    return "—"


def groups_for_page(page_rel: str) -> tuple[str, str]:
    for prefix, groups in PAGE_GROUP_MAP.items():
        if prefix in page_rel.replace("\\", "/"):
            return groups
    return ("B", "U-B")


def doc_has_testid(doc_path: Path, testid: str) -> bool:
    if not doc_path.is_file():
        return False
    text = doc_path.read_text(encoding="utf-8", errors="ignore")
    return testid in text or f"`{testid}`" in text


def build_rows(code_testids: dict[str, list[str]]) -> list[ControlRow]:
    rows: list[ControlRow] = []
    seen: set[tuple[str, str]] = set()

    def add_row(**kwargs: object) -> None:
        key = (str(kwargs["page"]), str(kwargs["testid"]))
        if key in seen:
            return
        seen.add(key)
        rows.append(ControlRow(**kwargs))  # type: ignore[arg-type]

    for ctrl in CANONICAL_CONTROLS:
        page = ctrl["page"]
        testid = ctrl["testid"]
        doc_path = PAGES / page.split("/", 1)[1] if "/" in page else PAGES / page
        pg, gu = groups_for_page(page)
        in_code = testid in code_testids
        in_doc = doc_has_testid(doc_path, testid)
        status = "covered" if in_code and in_doc else ("partial" if in_code or in_doc else "missing")
        add_row(
            page=page,
            route=page_route_hint(page),
            control=ctrl["control"],
            control_type=ctrl["type"],
            testid=testid,
            action="click" if ctrl["type"] in ("button", "tab") else "type",
            expected="UI responds; API optional",
            screenshot=f"U-{testid}",
            playwright_group=pg,
            group_u_step=gu,
            priority=ctrl["priority"],
            status=status,
            in_code=in_code,
            in_doc=in_doc,
        )

    for page_path in sorted(PAGES.rglob("*.md")):
        if page_path.name == "README.md":
            continue
        rel = str(page_path.relative_to(PAGES)).replace("\\", "/")
        page_key = f"{page_path.parent.name}/{page_path.name}"
        text = page_path.read_text(encoding="utf-8", errors="ignore")
        pg, gu = groups_for_page(page_key)
        for m in DOC_TESTID_RE.finditer(text):
            tid = m.group(1)
            if len(tid) < 4 or tid in ("th", "en", "pdf"):
                continue
            if (page_key, tid) in seen:
                continue
            in_code = tid in code_testids
            add_row(
                page=page_key,
                route=page_route_hint(page_key),
                control=tid.replace("-", " ").title(),
                control_type="control",
                testid=tid,
                action="click",
                expected="Documented control",
                screenshot=f"U-{tid}",
                playwright_group=pg,
                group_u_step=gu,
                priority="P1",
                status="covered" if in_code else "missing",
                in_code=in_code,
                in_doc=True,
            )

    for tid, files in sorted(code_testids.items()):
        if any((r.testid == tid for r in rows)):
            continue
        if tid.startswith("route-error") or tid.startswith("queue-item-"):
            priority = "P2"
        else:
            priority = "P1"
        rows.append(
            ControlRow(
                page="(code-only)",
                route="—",
                control=tid,
                control_type="control",
                testid=tid,
                action="click",
                expected="Present in UI",
                screenshot=f"U-{tid}",
                playwright_group="U",
                group_u_step="U-C",
                priority=priority,
                status="partial",
                in_code=True,
                in_doc=False,
            )
        )
    return rows


def write_outputs(rows: list[ControlRow]) -> None:
    p0_missing = [r for r in rows if r.priority == "P0" and r.status == "missing"]
    covered = sum(1 for r in rows if r.status == "covered")
    partial = sum(1 for r in rows if r.status == "partial")
    missing = sum(1 for r in rows if r.status == "missing")

    OUT_JSON.write_text(json.dumps([asdict(r) for r in rows], indent=2), encoding="utf-8")

    lines = [
        "# UI Element Coverage Matrix",
        "",
        f"**Generated:** auto (`scripts/audit-ui-element-coverage.py`)",
        f"**Controls:** {len(rows)} | **covered:** {covered} | **partial:** {partial} | **missing:** {missing}",
        f"**P0 missing:** {len(p0_missing)}",
        "",
        "| Page | Control | testid | Type | Group | Group U | Priority | Status | Screenshot |",
        "|------|---------|--------|------|-------|---------|----------|--------|------------|",
    ]
    for r in rows:
        if r.priority != "P0" and r.page == "(code-only)":
            continue
        lines.append(
            f"| {r.page} | {r.control} | `{r.testid}` | {r.control_type} | {r.playwright_group} | {r.group_u_step} | {r.priority} | {r.status} | {r.screenshot} |"
        )
    lines.extend(
        [
            "",
            "## Regenerate",
            "",
            "```bash",
            "python scripts/audit-ui-element-coverage.py",
            "python scripts/enrich-process-ui-inventory.py",
            "```",
            "",
        ]
    )
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_MD} ({len(rows)} controls, P0 missing={len(p0_missing)})")


def main() -> int:
    code_testids = scan_code_testids()
    rows = build_rows(code_testids)
    write_outputs(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
