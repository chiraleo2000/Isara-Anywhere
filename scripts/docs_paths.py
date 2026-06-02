"""Canonical paths under Documents/docs/ (reorganized by type + content)."""
from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DOCUMENTS = REPO / "Documents"
DOCS = DOCUMENTS / "docs"

# User guides (patient / doctor)
GUIDES = DOCS / "guides"
GUIDES_PATIENT = GUIDES / "patient"
GUIDES_DOCTOR = GUIDES / "doctor"

# Technical architecture deliverables
TECH = DOCS / "technical"
TECH_WORD = TECH / "word"
TECH_PPT = TECH / "ppt"
TECH_PDF = TECH / "pdf"
TECH_SLIDES = TECH / "slides"

# Diagrams
DIAGRAMS = DOCS / "diagrams"
DIAGRAMS_EXPORT = DIAGRAMS / "export"

# Markdown by topic
MD = DOCS / "markdown"
MD_OPERATIONS = MD / "operations"
MD_TESTING = MD / "testing"
MD_LEDGERS = MD / "ledgers"

TEMPLATES = DOCS / "templates"
SCREENSHOTS = DOCS / "screenshots"

# Well-known files
UNIT_TEST_UI_COVERAGE = MD_TESTING / "UNIT_TEST_UI_COVERAGE.md"
DEFECT_DRAWIO_UPDATES = MD_TESTING / "DEFECT_REMEDIATION_DRAWIO_UPDATES.md"
DIAGRAMS_MASTER = DIAGRAMS / "diagrams.drawio"
TECH_DIAGRAM_WORD = TECH_WORD / "TECHNICAL_DIAGRAM_REPORT_TH.docx"
TECH_DIAGRAM_PPT = TECH_PPT / "TECHNICAL_DIAGRAM_REPORT_PPT_TH.pptx"
