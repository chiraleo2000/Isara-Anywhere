#!/usr/bin/env python3
"""Extract text from Defect PDF for defect register audit."""
from pathlib import Path

from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[1]
pdf_path = REPO / "Defect หมออิสระ.pdf"
out_path = REPO / "reports" / "defect-fix" / "pdf-extract.txt"

reader = PdfReader(str(pdf_path))
parts = []
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    parts.append(f"--- page {i + 1} ---\n{text}")

out_path.write_text("\n".join(parts), encoding="utf-8")
print(f"Wrote {len(reader.pages)} pages to {out_path}")
