# ⚡ Markdown Validation - Quick Reference Guide

**Quick Link to Full Documentation:** [MARKDOWN_VALIDATION_README.md](./MARKDOWN_VALIDATION_README.md)

---

## 🚀 60-Second Setup

### 1. Install (First Time Only)
```bash
npm install
npm install -g markdownlint-cli
```

### 2. Check Files
```bash

# Windows PowerShell
.\scripts\markdown-validate.ps1 -Path ./Processes


# macOS/Linux/Windows
node scripts/markdown-fixer.js --check-only
```

### 3. Fix Issues
```bash
node scripts/markdown-fixer.js
```

---

## 📋 Common Commands

| Task | Command |
| --- | --- |
| **Check markdown (no changes)** | `node scripts/markdown-fixer.js --check-only` |
| **Auto-fix all issues** | `node scripts/markdown-fixer.js` |
| **Validate specific folder** | `node scripts/markdown-fixer-advanced.js --path ./docs` |
| **Generate detailed report** | `.\scripts\markdown-validate.ps1 -Path ./Processes -LogPath report.md` |
| **GitHub Actions validation** | Push to repo (automatic) |
| **Check via markdownlint** | `markdownlint "**/*.md" --config .markdownlintrc.json` |

---

## 🔑 Key Rules

| Rule | Issue | Example |
| --- | --- | --- |
| **MD022** | Missing blank line before/after heading | Add blank line around `# Heading` |
| **MD032** | Missing blank line before/after list | Add blank line around `- Item` |
| **MD036** | Using `**Text**` instead of heading | Use `## Heading` not `**Heading**` |
| **MD009** | Trailing whitespace | Remove spaces at end of lines |
| **MD012** | Multiple consecutive blank lines | Max 1 blank line between sections |

---

## 🆘 Quick Troubleshooting

### Issue: No such file or directory
**Solution:** Ensure you're in project root: `cd Isara-Anywhere`

### Issue: Module not found
**Solution:** Install dependencies: `npm install`

### Issue: PowerShell execution error
**Solution:** Enable scripts: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Issue: Still seeing errors after fix
**Solution:** Run check to find remaining issues: `node scripts/markdown-fixer.js --check-only`

---

## 📊 Files Cleaned

✅ **87 total files processed**

- 65 in Processes/ directory

- 10 Portal pages

- 12 Workflow documentation

✅ **590+ violations fixed**

---

## 🔗 Resources

| Document | Purpose |
| --- | --- |
| [MARKDOWN_VALIDATION_README.md](./MARKDOWN_VALIDATION_README.md) | Complete guide with all options |
| [MARKDOWN_QA_SUMMARY.md](./MARKDOWN_QA_SUMMARY.md) | Project completion report |
| [MARKDOWN_BEFORE_AFTER_REPORT.md](./MARKDOWN_BEFORE_AFTER_REPORT.md) | Detailed before/after comparison |
| [.markdownlintrc.json](./.markdownlintrc.json) | Linting configuration |
| [.github/workflows/markdown-validation.yml](./.github/workflows/markdown-validation.yml) | CI/CD workflow |

---

## ✨ Pro Tips

1. **Before committing:** Always run `node scripts/markdown-fixer.js --check-only`
2. **Auto-fix:** Run `node scripts/markdown-fixer.js` to fix all issues at once
3. **IDE Setup:** Install markdownlint extension for real-time feedback
4. **Pre-commit:** Set up git hook to prevent bad markdown commits
5. **CI/CD:** GitHub Actions automatically validates all PRs

---

## 📞 Need Help?

1. **Check full documentation:** [MARKDOWN_VALIDATION_README.md](./MARKDOWN_VALIDATION_README.md)
2. **Review before/after:** [MARKDOWN_BEFORE_AFTER_REPORT.md](./MARKDOWN_BEFORE_AFTER_REPORT.md)
3. **Understand project:** [MARKDOWN_QA_SUMMARY.md](./MARKDOWN_QA_SUMMARY.md)

---

**Status:** ✅ Ready to use
**Last Updated:** April 2, 2026
