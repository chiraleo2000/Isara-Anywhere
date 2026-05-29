# Security Scanning Ledger

| ID | Date | Scanner | Codebase | Severity | OWASP | Location | Status |
|----|------|---------|----------|----------|-------|----------|--------|
| SEC-001 | 2026-05-27 | app-security-scan | doctor/patient/jitsi | Low | A05 | CORS `callback(null, true)` dev fallbacks (15 warn, 0 error) | Accepted risk (dev-testing) |
| SEC-002 | 2026-05-27 | npm audit:prod | all portals | Moderate | A06 | 7 moderate (google-cloud deps); no high | Accepted — monitor |
| SEC-003 | 2026-05-28 | fix auth | doctor | High | A07 | `sanitizeRequestBody()` mount — login 504 | Fixed in v1.7.36-doctor-sanitize-fix |
| SEC-004 | 2026-05-28 | sonar:lint | all | — | — | `npm run sonar:lint` + IDE SonarLint; 15 CORS warns | Accepted dev-testing |
| SEC-005 | 2026-05-28 | phr timeline | patient | Med | A10 | PATIENT-DEMO timeline 500 | Fixed v1.7.37; verified cloud rev `00112-mrm` (traffic shift 2026-05-28) |
| SEC-006 | 2026-05-29 | baseline v1.7.37 | all | — | — | Re-scan: 2646 unit pass, app-scan 15 CORS warn, audit:prod 7 moderate (jitsi uuid) | Accepted — see SEC-001/002 |

## Commands (local)

```powershell
cd c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere

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
npm run security:app-scan
npm run test:security-hardening
npm run test:unit:meeting-acceptance
```
