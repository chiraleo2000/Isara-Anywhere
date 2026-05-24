#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit Processes/Pages vs tests/PROCESS_COVERAGE_MATRIX.md — write tests/PROCESS_COVERAGE_GAPS.md"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PAGES = REPO / "Processes" / "Pages"
PROCESSES = REPO / "Processes"
MATRIX = REPO / "tests" / "PROCESS_COVERAGE_MATRIX.md"
OUT = REPO / "tests" / "PROCESS_COVERAGE_GAPS.md"

WORKFLOW_DOCS = [
    "Appointment_Workflows.md",
    "VIDEO_MEETING_JITSI_GEMINI.md",
    "FULL_WORKFLOW_CONTRACT.md",
    "Data_Sync_Documentation.md",
    "Combined_Workflows_And_Actions.md",
    "Separated_Workflows_And_Functions.md",
    "Notification_Workflows.md",
    "User_management_Workflows.md",
    "Health_Records_Processes.md",
]


def list_page_docs() -> list[Path]:
    return sorted(PAGES.rglob("*.md"))


def matrix_doc_paths() -> set[str]:
    """ProcessDoc paths from matrix tables, e.g. Doctor-Portal/06_Health_Meeting."""
    if not MATRIX.is_file():
        return set()
    paths: set[str] = set()
    for line in MATRIX.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or "ProcessDoc" in line or "---" in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 3:
            continue
        doc = parts[1]
        if "Portal/" in doc or "Meeting-Server/" in doc:
            paths.add(doc)
    return paths


def doc_in_matrix(rel: str, paths: set[str]) -> bool:
    rel_norm = rel.replace("\\", "/")
    stem = Path(rel).stem
    for p in paths:
        if p in rel_norm:
            return True
        tail = p.split("/")[-1]
        base = stem.replace("_Page", "")
        if tail == base or tail in stem or base.startswith(tail) or tail.startswith(base):
            return True
    return False


def main() -> int:
    docs = [p for p in list_page_docs() if p.name != "README.md"]
    paths = matrix_doc_paths()
    missing_matrix: list[str] = []
    for p in docs:
        rel = str(p.relative_to(REPO)).replace("\\", "/")
        if not doc_in_matrix(rel, paths):
            missing_matrix.append(rel)

    lines = [
        "# Process coverage gaps (auto-generated)",
        "",
        f"Scanned **{len(docs)}** page specs under `Processes/Pages/`.",
        "",
        "## Missing from PROCESS_COVERAGE_MATRIX.md",
        "",
    ]
    if missing_matrix:
        lines.extend(f"- `{r}`" for r in missing_matrix)
    else:
        lines.append("- None — all page files referenced in matrix.")
    lines += [
        "",
        "## Workflow documents (must map to Playwright/Vitest)",
        "",
    ]
    for name in WORKFLOW_DOCS:
        p = PROCESSES / name
        status = "present" if p.is_file() else "MISSING"
        lines.append(f"- `{name}` — {status}")
    lines += [
        "",
        "## Regenerate",
        "",
        "```bash",
        "python scripts/audit-process-coverage.py",
        "```",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(missing_matrix)} gaps)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
