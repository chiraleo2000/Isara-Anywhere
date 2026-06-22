# todo-1779895499317 — Documentation & demo cleanup (completed)

| Item | Status |
|------|--------|
| Remove demo mocks from prod UI | Done — `DoctorsManagement` no mock fallback; deleted `pages/timeline/TimelinePage.tsx`; main `TimelinePage` API-only |
| TestHarness | DEV-only route in `DoctorPortal.tsx` |
| Process pages ENRICH-9 | `python scripts/enrich-process-pages.py --force-steps` — 39 files |
| Word TH Sarabun New 16 pt | `Documents/docs/guides/patient|doctor/USER_GUIDE_*_WORD_TH.docx`, `TECHNICAL_ARCHITECTURE_WORD_TH.docx` |
| PPT FC Iconic | `Documents/docs/guides/patient|doctor/USER_GUIDE_*_PPT_TH.pptx`, `TECHNICAL_ARCHITECTURE_PPT_TH.pptx` |
| Scripts cleanup | 32 files → `scripts/archive/deprecated/`; index `scripts/README.md` |
| Cloud demo DB purge | `npm run cleanup:cloud-test-only` — run locally when `.env` DB_PASSWORD is valid |

Regenerate full doc set: `npm run guides:all`
