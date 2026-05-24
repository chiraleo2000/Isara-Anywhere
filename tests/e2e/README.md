# Izara E2E — Canonical suite location

> **Updated:** May 2026. Use **root** Playwright (`tests/group-*.ui-test.ts`), not this folder's legacy `specs/`.

## Run cloud gate (primary)

```powershell
$env:TEST_ENV='cloud'
$env:GEMINI_API_KEY='your-key'
npm run test:cloud:pipeline
```

Serial pipeline: **D → D-host → Q → E → F → L**

## Run local (docker-compose)

```powershell
docker compose up -d --build
npx playwright test --project=A-auth --project=D-appointments --workers=1
```

## Documentation

- [tests/E2E_COVERAGE_REPORT.md](../E2E_COVERAGE_REPORT.md)
- [tests/SELECTORS.md](../SELECTORS.md)
- [tests/PROCESS_COVERAGE_MATRIX.md](../PROCESS_COVERAGE_MATRIX.md)
- [Processes/TWO_ROUND_CLOUD_TESTING.md](../../Processes/TWO_ROUND_CLOUD_TESTING.md)

## Legacy

The former `tests/e2e/specs/*.spec.ts` tree was removed. Global setup remains at `tests/e2e/global-setup.ts`.
