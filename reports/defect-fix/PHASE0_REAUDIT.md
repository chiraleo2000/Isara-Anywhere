# Phase 0 Re-Audit (v1.7.39)

Date: 2026-05-29  
Source PDF: `Defect หมออิสระ.pdf` (44 pages, image-heavy)

## PDF extraction

- Tool: `pypdf` → `reports/defect-fix/pdf-extract.txt`
- Machine text: minimal (section labels `Patient`, `Doctor/Admin`, `Meet` + meeting lobby note on page 44)
- **Conclusion:** Full defect list validated against prior human extraction and [`DEFECT_REGISTER.md`](DEFECT_REGISTER.md) (23 IDs). No additional orphan defects identified from extract.

## Register cross-check (23/23)

| Section | IDs | Count |
|---------|-----|-------|
| Global UI/UX | G1, G2, G3 | 3 |
| Patient portal | P1–P12 | 12 |
| Doctor/Admin | D1–D8 | 8 |
| Meeting | M2 | 1 |
| **Total** | | **23** |

PDF page 44 meeting note maps to **M2** (doctor lobby admit UX).

## Baseline (pre v1.7.39 code changes)

| Gate | Result |
|------|--------|
| `npm run test:unit` | PASS — 127 files, **2659** tests |

Cloud defect Playwright pack deferred to Phase 3 after code + behavioral test additions.

## v1.7.39 focus

1. Doctor `normalizeNotificationRow` parity with patient portal
2. Behavioral Vitest replacing source-only guards where applicable
3. `tests/group-Defect-ai.ui-test.ts` for P1/P2
4. Full gate loop + deploy v1.7.39

---

## v1.7.41 re-audit (2026-05-30)

- PDF re-extracted with `pypdf` → `reports/defect-fix/pdf-extract.txt` (unchanged: image-heavy, section labels only)
- Register cross-check: **23/23** IDs in [`DEFECT_REGISTER.md`](DEFECT_REGISTER.md) — no new orphan defects
- Page 44 meeting lobby note still maps to **M2**
- Baseline: v1.7.40 green (`v1.7.40-final.txt`); this pass closes remaining SonarLint (S4325, S5725) and adds behavioral tests for G1–G3, P7, D7/D8
