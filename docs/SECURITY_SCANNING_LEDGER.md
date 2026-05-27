# Security Scanning Ledger

| ID | Date | Scanner | Codebase | Severity | OWASP | Location | Status |
|----|------|---------|----------|----------|-------|----------|--------|
| SEC-001 | 2026-05-27 | app-security-scan | doctor/patient/jitsi | Low | A05 | CORS `callback(null, true)` dev fallbacks (15 warn, 0 error) | Accepted risk (dev-testing) |
| SEC-002 | 2026-05-27 | npm audit:prod | all portals | — | A06 | Run `npm run audit:prod` | Open — triage per portal lockfile |

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
