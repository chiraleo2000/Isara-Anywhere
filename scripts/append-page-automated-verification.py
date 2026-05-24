#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Append ## Automated verification to Processes/Pages/**/*.md from PROCESS_COVERAGE_MATRIX."""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PAGES = REPO / "Processes" / "Pages"
MATRIX = REPO / "tests" / "PROCESS_COVERAGE_MATRIX.md"
MARKER = "## Automated verification"


def parse_matrix_rows() -> dict[str, dict[str, str]]:
    """Map page stem (e.g. 06_Health_Meeting) -> {unit, ui, status}."""
    text = MATRIX.read_text(encoding="utf-8")
    rows: dict[str, dict[str, str]] = {}
    for line in text.splitlines():
        if not line.startswith("|") or "ProcessDoc" in line or "---" in line:
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 7:
            continue
        doc_cell = parts[1]
        if "Portal/" not in doc_cell and "Meeting-Server/" not in doc_cell:
            continue
        stem = doc_cell.split("/")[-1]
        rows[stem] = {
            "unit": parts[3] if len(parts) > 3 else "—",
            "ui": parts[4] if len(parts) > 4 else "—",
            "status": parts[5] if len(parts) > 5 else "partial",
        }
    return rows


def section_for(stem: str, meta: dict[str, str]) -> str:
    ui = meta.get("ui", "—")
    unit = meta.get("unit", "—")
    status = meta.get("status", "partial")
    testids = "See [tests/SELECTORS.md](../../tests/SELECTORS.md)"
    if "Meeting" in stem or "Health_Meeting" in stem or "Virtual_Meeting" in stem:
        testids = "`end-meeting-btn`, `recording-indicator`, `meeting-results`, `recording-player`, `generate-summary-btn` — [tests/SELECTORS.md](../../tests/SELECTORS.md)"
    return f"""

---

{MARKER}

| Field | Value |
|-------|-------|
| **Status** | {status} |
| **Unit tests** | `{unit}` |
| **UI (Playwright)** | Group {ui} |
| **data-testid** | {testids} |
| **Last verified** | 2026-05-22 |

**Run locally**

```bash
npm run test:unit
npm run test:e2e:meeting-lifecycle   # meeting pages only; needs D→D-host first
```

**Matrix row:** `{stem}` in [tests/PROCESS_COVERAGE_MATRIX.md](../../tests/PROCESS_COVERAGE_MATRIX.md)
"""


def main() -> int:
    matrix = parse_matrix_rows()
    updated = 0
    for md in sorted(PAGES.rglob("*.md")):
        if md.name == "README.md":
            continue
        text = md.read_text(encoding="utf-8")
        if MARKER in text:
            continue
        stem = md.stem

        def lookup(s: str) -> dict[str, str] | None:
            if s in matrix:
                return matrix[s]
            base = s.replace("_Page", "")
            if base in matrix:
                return matrix[base]
            for k, v in matrix.items():
                if base.startswith(k) or k in base:
                    return v
            return None

        meta = lookup(stem) or {"unit": "—", "ui": "—", "status": "partial"}
        md.write_text(text.rstrip() + section_for(stem, meta) + "\n", encoding="utf-8")
        updated += 1
    print(f"Updated {updated} page docs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
