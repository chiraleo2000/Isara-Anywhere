#!/usr/bin/env python3
"""Promote Group-U-exercised P0 controls to covered and refresh matrix header."""
import json
import re
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
json_path = root / "tests" / "UI_ELEMENT_COVERAGE.json"
md_path = root / "tests" / "UI_ELEMENT_COVERAGE_MATRIX.md"

covered_ids = {
    "login-email", "login-password", "login-submit",
    "phr-tab-overview", "phr-tab-vitals", "phr-tab-medications", "phr-tab-allergies",
    "phr-tab-lab-imaging", "phr-tab-prescriptions", "phr-tab-documents", "phr-tab-profile",
    "phr-document-upload", "health-meeting-page", "queue-list", "queue-count",
    "queue-claim-btn", "queue-ai-match-btn", "confirm-appointment-btn",
    "patient-message-send-btn", "lab-report-upload-btn", "imaging-report-upload-btn",
    "prescribe-submit", "emr-autosave-status", "end-meeting-btn", "admit-all-btn",
    "emr-sign-btn", "emr-editor-modal", "allergy-block-banner",
}

data = json.loads(json_path.read_text(encoding="utf-8"))
for c in data:
    if c.get("priority") == "P0" and c.get("testid") in covered_ids:
        c["status"] = "covered"
        # also fix matrix table cells later via testid
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

ctr = Counter(c.get("status") for c in data)
p0 = Counter(c.get("status") for c in data if c.get("priority") == "P0")
text = md_path.read_text(encoding="utf-8")
text = re.sub(
    r"\*\*Controls:\*\* \d+ \| \*\*covered:\*\* \d+ \| \*\*partial:\*\* \d+ \| \*\*missing:\*\* \d+",
    f"**Controls:** {len(data)} | **covered:** {ctr['covered']} | **partial:** {ctr['partial']} | **missing:** {ctr['missing']}",
    text,
    count=1,
)
# Promote P0 rows in markdown table: | ... | partial | U-... | when testid covered
for tid in covered_ids:
    text = re.sub(
        rf"(\| `{re.escape(tid)}` \|[^|]+\|[^|]+\|[^|]+\| P0 \| )partial( \|)",
        r"\1covered\2",
        text,
    )
md_path.write_text(text, encoding="utf-8")
print(f"all={dict(ctr)} p0={dict(p0)}")
