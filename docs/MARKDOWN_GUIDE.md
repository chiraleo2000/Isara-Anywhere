# Markdown validation guide

**Izara Telemedicine** · Last updated: May 23, 2026

Automated checks keep documentation consistent across `Processes/`, `docs/`, and portal READMEs.

## Thai reporting & presentation standards

| Output | Font | Size |
|--------|------|------|
| Word reports / user guides (`.docx`) | **TH Sarabun New** | Body **16 pt**, headings 18–22 pt, line spacing **1.15** |
| PowerPoint (`.pptx`) | **FC Iconic** | Title **32 pt**, body **18 pt**, speaker notes **16 pt** |

Generate guides: `python scripts/build-portal-user-guides.py`  
Enrich `Processes/Pages/**/*.md` with detailed steps: `python scripts/enrich-process-pages.py --force-steps`

**After cloud / Code Breaker testing:** purge demo data only (no re-seed): `npm run cleanup:cloud-test-only`

**Current doc build:** v1.7.33 · ENRICH-5 · Word tables+TOC · PPT per-slide detail · Word `TH Sarabun New` 16 pt · PPT `FC Iconic` 32/18/16 pt · หลัง `npm run cleanup:cloud-test-only`

---

## Quick start

```bash
# From repo root
npm install

# Check only (CI-safe)
node scripts/markdown-fixer.js --check-only

# Auto-fix all markdown
node scripts/markdown-fixer.js

# Specific folder
node scripts/markdown-fixer.js --path ./Processes
```

**Windows (detailed report):**

```powershell
.\scripts\markdown-validate.ps1 -Path ./Processes -LogPath report.md
```

---

## Tools

| Tool | Location | Use |
| ---- | -------- | --- |
| `markdown-fixer.js` | `scripts/` | Primary fixer; `--check-only` for CI |
| `markdown-fixer-advanced.js` | `scripts/` | Tables, Thai context, stats |
| `markdown-validate.ps1` | `scripts/` | PowerShell reports |
| GitHub Actions | `.github/workflows/markdown-validation.yml` | Runs on `.md` changes in PRs |

---

## Rules enforced by the fixer

| Rule | Issue | Fix |
| ---- | ----- | --- |
| MD009 | Trailing spaces | Strip end-of-line spaces |
| MD012 | Multiple blank lines | Collapse to one blank line |
| MD022 | Heading spacing | Blank line before/after headings |
| MD032 | List spacing | Blank line before/after lists |
| MD036 | Bold as heading | Use `## Heading` not `**Heading**` |
| MD034 | Bare URLs | Wrap URLs in angle brackets where needed |

Style-only rules (MD024, MD026, MD034, MD058, MD060) are relaxed for Thai documentation and wide tables.

---

## QA summary (April 2026 initiative)

| Metric | Value |
| ------ | ----- |
| Files processed | 87+ markdown files |
| Violations fixed | 590+ (≈79% reduction project-wide) |
| Remaining | Mostly `Processes/README.md` table style (MD060 disabled by policy) |

**Top fixed categories:** trailing spaces (45+), extra blank lines (85+), heading spacing (62+), list spacing (48+), emphasis-as-heading (32+).

**Before → after (representative):**

- `Processes/Appointment_Workflows.md`: 18 → ~10 issues
- Portal and workflow docs: typically &lt;5 issues each after pass

---

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| Script not found | Run from repo root: `cd Isara-Anywhere` |
| Module not found | `npm install` |
| PowerShell blocked | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Errors after fix | `node scripts/markdown-fixer.js --check-only` to list remaining |

---

## Tips

1. Run `--check-only` before committing markdown changes.
2. Install the VS Code **markdownlint** extension for live hints (optional).
3. CI fails if `markdown-fixer.js --check-only` reports issues — fix locally and push.

---

## Related docs

- [README.md](../README.md) — platform overview
- [Processes/](../Processes/) — workflow documentation
