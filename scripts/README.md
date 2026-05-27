# Scripts — Izara Anywhere

Essential automation for **test**, **cloud gate**, **deploy**, **database**, and **Thai user guides**.  
Legacy one-off scripts live under [`archive/deprecated/`](archive/deprecated/) (not referenced by `package.json`).

## Essential scripts (active)

| Script | npm command | Purpose |
|--------|-------------|---------|
| `cloud-smoke.mjs` | `npm run cloud:smoke` | Post-deploy health on dev-testing Cloud Run |
| `verify-cloud-appointment-sync.mjs` | `npm run verify:gate0` | GATE0 appointment API chain |
| `deploy-cloud-from-env.ps1` | `npm run cloud:deploy` | Cloud Build submit (reads `.env` read-only) |
| `apply-cloud-db-from-env.cjs` | `npm run cloud:migrate` | Apply DB migrations to cloud |
| `run-cloud-tests.ps1` | `npm run test:cloud` | Playwright cloud suite |
| `run-cloud-full-coverage.ps1` | `npm run test:cloud:full` | Full cloud coverage |
| `run-two-round-cloud-hardening.ps1` | `npm run test:cloud:hardening` | Two-round cloud hardening |
| `run-gate-ui-showup.ps1` | `npm run test:gate:ui-showup` | Headed A-auth + S-responsive on cloud |
| `cleanup-cloud-test-data.ps1` | `npm run cleanup:cloud-test-only` | Remove demo test users from cloud DB |
| `aggregate-pre-debug-baseline.mjs` | `npm run ledger:pre-debug` | Pre-debug Playwright ledger |
| `aggregate-cloud-error-ledger.mjs` | `npm run ledger:cloud` | Cloud E2E error ledger |
| `security/app-security-scan.mjs` | `npm run security:app-scan` | App-layer secret/CORS scan |
| `lint/eslint.deep-scan.cjs` | (manual npx eslint) | Deep lint pass |
| `enrich-process-pages.py` | `npm run guides:enrich` | ENRICH-9 Thai process pages (Sarabun/PPT std) |
| `build-portal-user-guides.py` | `npm run guides:build` | Word TH Sarabun 16pt + PPT FC Iconic |
| `build-technical-architecture-docs.py` | `npm run guides:technical` | Technical architecture docs |
| `user_guide_process_context.py` | (imported by builders) | Font/size constants |
| `technical_architecture_content.py` | (imported) | Technical slide content |
| `cleanup-old-user-guides.ps1` | `npm run guides:cleanup-old` | Prune old guide outputs |
| `export-user-guide-pdf.ps1` | `npm run guides:pdf` | Export PDF from Word |
| `database/db-tool.cjs` | `npm run seed` | Local DB seed (repo data only) |
| `lib/db-config.cjs`, `lib/cors-policy.cjs` | — | Shared DB/CORS helpers |
| `audit-process-coverage.py` | `npm run test:audit:process` | Process vs test matrix |

## Thai documentation standards

- **Word / PDF reports:** TH Sarabun New, body **16 pt**, line spacing **1.15**
- **PowerPoint:** FC Iconic, title **32 pt**, body **18 pt**, notes **16 pt**
- Regenerate: `npm run guides:all` (requires fonts installed on Windows)

## Demo data cleanup

```powershell
npm run cleanup:cloud-test-only
```

Removes cloud demo accounts; does not change `scripts/startup_data/` (repo seeds only).

## Archived (deprecated)

Moved to `scripts/archive/deprecated/` — diagnostic loops, old migrate helpers, duplicate guide generators, and one-off test PS1 files. Do not use unless you are replaying a historical run.
