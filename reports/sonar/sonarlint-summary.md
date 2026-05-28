# SonarLint / SonarQube IDE Summary

**Project:** izara-telemedicine · **Version:** 1.7.37  
**Config:** [`sonar-project.properties`](../../sonar-project.properties) (includes `server/` paths)

## IDE setup

1. Install **SonarLint** in VS Code / Cursor.
2. Open workspace root `Isara-Anywhere`.
3. SonarLint binds to `sonar-project.properties` automatically.
4. Optional Connected Mode: link to SonarCloud/SonarQube server for rule sync.

## Executable local gate (CI-aligned)

```powershell
npm run sonar:lint
npm run test:quality:gate
```

## Known accepted findings

See [`docs/SECURITY_SCANNING_LEDGER.md`](../../docs/SECURITY_SCANNING_LEDGER.md) — CORS dev fallbacks, Dockerfile.unified S7020, LoginPage false positives.

## Regression guarded by unit tests

- `doctor-portal/sanitizeRequestBody.middleware.test.ts` — `sanitizeRequestBody()` must be invoked as factory (`app.use(sanitizeRequestBody())`).
