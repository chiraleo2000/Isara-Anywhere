#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inject ## UI Controls Inventory into Processes/Pages from UI_ELEMENT_COVERAGE.json"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
JSON_PATH = REPO / "tests" / "UI_ELEMENT_COVERAGE.json"
PAGES = REPO / "Processes" / "Pages"
MARKER = "## UI Controls Inventory"
DEPRECATED_PAGES = {"20_Appointment_Pool_Management.md"}


def main() -> int:
    if not JSON_PATH.is_file():
        print("Run audit-ui-element-coverage.py first")
        return 1
    rows = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    by_page: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        page = r.get("page", "")
        if page == "(code-only)" or not page.endswith(".md"):
            continue
        by_page[page].append(r)

    updated = 0
    for page_rel, controls in sorted(by_page.items()):
        path = PAGES / page_rel.replace("\\", "/")
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if MARKER in text:
            continue
        table_lines = [
            "",
            MARKER,
            "",
            "| # | Control | testid | Action | Expected | Screenshot |",
            "|---|---------|--------|--------|----------|------------|",
        ]
        for i, c in enumerate(controls[:40], 1):
            if c.get("priority") not in ("P0", "P1"):
                continue
            table_lines.append(
                f"| {i} | {c.get('control', '')} | `{c.get('testid', '')}` | {c.get('action', 'click')} | {c.get('expected', '')} | {c.get('screenshot', '')} |"
            )
        table_lines.append("")
        insert = "\n".join(table_lines)

        if path.name in DEPRECATED_PAGES and "**Status: DEPRECATED**" not in text:
            text = "**Status: DEPRECATED** — redirects to `/health-meeting?tab=queue`. See `06_Health_Meeting_Page.md`.\n\n" + text

        if "---\n\n\n## 1." in text:
            text = text.replace("---\n\n\n## 1.", f"---{insert}\n## 1.", 1)
        elif "---\n\n## 1." in text:
            text = text.replace("---\n\n## 1.", f"---{insert}\n## 1.", 1)
        else:
            text = text + insert
        path.write_text(text, encoding="utf-8")
        updated += 1
    print(f"Updated {updated} page docs with UI Controls Inventory")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
