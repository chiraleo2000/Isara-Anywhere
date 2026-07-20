#!/usr/bin/env python3
"""Promote Group-U-exercised P0/P1 real controls to covered and refresh matrix header."""
import json
import re
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[1]
json_path = root / "tests" / "UI_ELEMENT_COVERAGE.json"
md_path = root / "tests" / "UI_ELEMENT_COVERAGE_MATRIX.md"

# Real actionable controls deep-exercised by tests/group-U-ui-element-audit.ui-test.ts
# (click/type/assert). Exclude inventory noise (CSP tokens, raw status words, API field names).
covered_ids = {
    # Auth
    "login-email", "login-password", "login-submit",
    "google-sign-in-btn", "google-sso-container", "register-submit",
    # Dashboards
    "doctor-dashboard-kpi", "doctor-dashboard-queue",
    "dashboard-search-treatment-history", "dashboard-meeting-ai-summary",
    "dashboard-join-meeting",
    # PHR
    "phr-tab-overview", "phr-tab-vitals", "phr-tab-medications", "phr-tab-allergies",
    "phr-tab-lab-imaging", "phr-tab-prescriptions", "phr-tab-documents", "phr-tab-profile",
    "phr-document-upload", "phr-tab-bar",
    # Schedule + Health Meeting queue
    "doctor-schedule-page", "schedule-meeting-link", "mini-calendar-appointment-day",
    "health-meeting-page", "queue-list", "queue-count",
    "queue-claim-btn", "queue-ai-match-btn", "queue-confirm-btn", "queue-decline-btn",
    "queue-assign-btn", "queue-contact-btn",
    "confirm-appointment-btn", "assign-appointment-btn",
    # Clinical
    "patient-message-send-btn", "lab-report-upload-btn", "imaging-report-upload-btn",
    "prescribe-submit", "emr-autosave-status", "emr-sign-btn", "emr-editor-modal",
    "allergy-block-banner", "cds-allergy-conflict-banner",
    "patient-record-tab-summary", "patient-record-tab-emr", "patient-record-tab-labs",
    "patient-record-tab-rx", "patient-record-tab-docs", "patient-record-tab-meetings",
    "patient-record-tab-pdpa",
    # Appointments (patient)
    "book-appointment-btn", "appointment-join-meeting-btn", "appointment-join-meeting",
    "appointment-detail-join-meeting", "appointment-cancel-btn",
    "appointment-calendar-link", "appointment-confirmed-badge", "confirmed-tab-hint",
    # Meeting room / results
    "end-meeting-btn", "admit-all-btn", "admit-btn", "reject-btn",
    "host-starting-screen", "guest-join-url-hint", "guest-token-url-hint",
    "generate-summary-btn", "meeting-results",
    "validate-summary-btn", "apply-summary-emr-btn", "apply-ai-summary-emr-btn",
    "summary-degraded-badge", "summary-structured", "transcript-panel",
    # PDPA / Living Will
    "pdpa-grant-doctor-access-btn", "pdpa-grant-doctor-modal", "pdpa-grant-doctor-search",
    "pdpa-revoke-all-access-btn", "pdpa-current-consent-snapshot", "pdpa-audit-log",
    "living-will-stepper", "living-will-step-1", "living-will-step-2",
    "living-will-next-btn", "living-will-signature",
    # Patient secondary
    "health-library-page", "content-item", "health-studio-ready",
    "health-studio-medical-content",
    "timeline-page", "timeline-consultation-link", "timeline-download",
    "notifications-page", "mark-all-read-btn", "notifications-view-all-link",
    "settings-button", "settings-dropdown", "theme-light", "lang-thai", "lang-english",
    # Admin / content / AI
    "doctor-item", "admin-doctor-pending-tab", "admin-doctor-pending-panel",
    "gemini-ai-studio", "gemini-ai-studio-modal",
}

data = json.loads(json_path.read_text(encoding="utf-8"))
promoted = 0
for c in data:
    tid = c.get("testid")
    if tid in covered_ids and c.get("priority") in ("P0", "P1") and c.get("status") != "covered":
        c["status"] = "covered"
        promoted += 1
json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

ctr = Counter(c.get("status") for c in data)
p0 = Counter(c.get("status") for c in data if c.get("priority") == "P0")
p1 = Counter(c.get("status") for c in data if c.get("priority") == "P1")
text = md_path.read_text(encoding="utf-8")
text = re.sub(
    r"\*\*Controls:\*\* \d+ \| \*\*covered:\*\* \d+ \| \*\*partial:\*\* \d+ \| \*\*missing:\*\* \d+",
    f"**Controls:** {len(data)} | **covered:** {ctr['covered']} | **partial:** {ctr['partial']} | **missing:** {ctr['missing']}",
    text,
    count=1,
)
# Promote rows in markdown table for covered testids (P0 and P1)
for tid in covered_ids:
    text = re.sub(
        rf"(\| `{re.escape(tid)}` \|[^|]+\|[^|]+\|[^|]+\| P[01] \| )(?:partial|missing)( \|)",
        r"\1covered\2",
        text,
    )
md_path.write_text(text, encoding="utf-8")
print(f"promoted={promoted} all={dict(ctr)} p0={dict(p0)} p1={dict(p1)}")
print(f"covered_ids={len(covered_ids)}")
