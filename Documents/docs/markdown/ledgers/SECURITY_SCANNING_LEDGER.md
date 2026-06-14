# Security Scanning Ledger

| ID | Date | Scanner | Codebase | Severity | OWASP | Location | Status |
|----|------|---------|----------|----------|-------|----------|--------|
| SEC-001 | 2026-05-27 | app-security-scan | doctor/patient/jitsi | Low | A05 | CORS `callback(null, true)` dev fallbacks (15 warn, 0 error) | Accepted risk (dev-testing) |
| SEC-002 | 2026-05-27 | npm audit:prod | all portals | Moderate | A06 | 7 moderate (google-cloud deps); no high | Accepted — monitor |
| SEC-003 | 2026-05-28 | fix auth | doctor | High | A07 | `sanitizeRequestBody()` mount — login 504 | Fixed in v1.7.36-doctor-sanitize-fix |
| SEC-004 | 2026-05-28 | sonar:lint | all | — | — | `npm run sonar:lint` + IDE SonarLint; 15 CORS warns | Accepted dev-testing |
| SEC-005 | 2026-05-28 | phr timeline | patient | Med | A10 | PATIENT-DEMO timeline 500 | Fixed v1.7.37; verified cloud rev `00112-mrm` (traffic shift 2026-05-28) |
| SEC-006 | 2026-05-29 | baseline v1.7.37 | all | — | — | Re-scan: 2646 unit pass, app-scan 15 CORS warn, audit:prod 7 moderate (jitsi uuid) | Accepted — see SEC-001/002 |
| SEC-008 | 2026-06-05 | v1.7.50 gates | all | — | — | Docker: 2938 Vitest + 78 meeting contracts PASS; `test:unit:docker:grouped` | Verified |
| SEC-007 | 2026-05-31 | v1.7.48 gates | all | — | — | `test:quality:gate` 2736 unit PASS; sonar:lint 0 errors; cloud full 85/85 headed | Verified |
| SEC-009 | 2026-06-11 | cve-lite-cli | doctor-portal | High | A06 | multer@1.4.5-lts.2 + react-router@7.14.1 | **Fixed 2026-06-11** — multer@2.1.1, react-router-dom@7.15.0; CVE Lite doctor-portal 0 HIGH |
| SEC-010 | 2026-06-11 | cve-lite-cli | patient-portal | Medium | A06 | react-router transitive | **Fixed 2026-06-11** — react-router-dom@6.30.4; below HIGH gate |
| SEC-011 | 2026-06-11 | cve-lite-cli | jitsi-server | Medium/High | A06 | @grpc/grpc-js via speech SDK | **Fixed 2026-06-11** — @google-cloud/speech@7.0.0 + npm update @grpc/grpc-js; CVE Lite passed |
| SEC-012 | 2026-06-11 | cve-lite-cli | root-tooling | High | A06 | socket.io-parser@4.2.5 transitive (dev/Playwright only); fix: `npm update socket.io-client` | Monitor — secondary lockfile, not gated |

## Commands (local)

```powershell
cd c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere

# Unified security scan (app-scan + CVE Lite + audit:prod + hardening tests)
npm run security:scan

# OWASP CVE Lite — production lockfiles (fail-on HIGH+ by default)
npm run security:cve-lite
npm run security:cve-lite:report

# Baseline / triage only (never fails)
node scripts/security/run-cve-lite-scan.mjs --report-only

# Production dependency audit (CI-aligned)
npm run audit:prod

# Application-layer patterns (secrets, eval, CORS)
npm run security:app-scan
node scripts/security/app-security-scan.mjs --json > reports/security/app-scan.json

# Full tree audit (triage only)
npm audit --prefix Isara-doctor-portal
npm audit --prefix Isara-patient-portal
npm audit --prefix Izara-jitsi-server

# Optional OSV-Scanner
osv-scanner scan -r Isara-doctor-portal/package-lock.json
osv-scanner scan -r Isara-patient-portal/package-lock.json
osv-scanner scan -r Izara-jitsi-server/package-lock.json

# CVE Lite triage playbook
# 1. npm run security:cve-lite -- --report-only   (baseline, no fail)
# 2. Apply suggested fix commands per app
# 3. npm run security:cve-lite                   (verify HIGH+ clear)
# 4. Log accepted risks in this ledger (SEC-xxx)

# Optional Semgrep OWASP
npx semgrep --config p/owasp-top-ten --error Isara-doctor-portal/src Isara-doctor-portal/server Isara-patient-portal/src Isara-patient-portal/server Izara-jitsi-server/server

# Application security unit tests
npm run test:security-hardening
```

## Deep ESLint (no --fix)

```powershell
node scripts/lint/eslint.deep-scan.cjs --portal doctor > reports/eslint-deep-doctor.txt
node scripts/lint/eslint.deep-scan.cjs --portal patient > reports/eslint-deep-patient.txt
node scripts/lint/eslint.deep-scan.jitsi.cjs > reports/eslint-deep-jitsi.txt
```

## Retest after fix

```powershell
npm run security:scan
npm run security:cve-lite
npm run security:app-scan
npm run test:security-hardening
npm run test:unit:meeting-acceptance
```

## Scanner roles

| Tool | Purpose |
|------|---------|
| SonarLint / `sonar:lint` | Code quality, complexity, eslint sonarjs rules |
| `security:app-scan` | Secrets, eval, CORS patterns in source |
| **CVE Lite CLI** | OSV lockfile CVEs with parent-aware fix commands |
| `audit:prod` | npm advisory audit (HIGH+ gate) |
| `test:security-hardening` | Behavioral auth/JWT/webhook contract tests |
