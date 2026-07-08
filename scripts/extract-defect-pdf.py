#!/usr/bin/env python3
"""Extract text from Defect PDF for defect register audit (optional — PDF removed from repo)."""
import sys
from pathlib import Path

from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[1]
pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "Defect หมออิสระ.pdf"
out_path = REPO / "reports" / "defect-fix" / "pdf-extract.txt"

if not pdf_path.is_file():
    print(
        "Defect PDF not in repo (archived). Use reports/defect-fix/DEFECT_REGISTER.md "
        "and pdf-reaudit-v1.7.48.txt, or pass a local PDF path:\n"
        "  python scripts/extract-defect-pdf.py path/to/Defect.pdf",
        file=sys.stderr,
    )
    sys.exit(1)

reader = PdfReader(str(pdf_path))
parts = []
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    parts.append(f"--- page {i + 1} ---\n{text}")

out_path.write_text("\n".join(parts), encoding="utf-8")
print(f"Wrote {len(reader.pages)} pages to {out_path}")
