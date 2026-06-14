# Security Scanning Plan (SonarQube + OWASP CVE Lite)

Izara uses a **defense-in-depth** model: static code quality (SonarQube rules), dependency CVEs ([OWASP CVE Lite CLI](https://owasp.org/cve-lite-cli/)), npm advisory audit, application-layer pattern scans, and targeted security Vitest packs. Nothing replaces manual review for auth flows, PHI handling, and cloud IAM — these gates catch regressions before deploy.

## Scan layers

| Layer | Tool | What it finds | Blocks deploy? |
|-------|------|---------------|--------------|
| **1 — Code quality / SAST-style rules** | `npm run sonar:lint` | ESLint/Sonar rule violations (bugs, smells, security hotspots in TS/JS) | Local gate + CI `quality-gate` |
| **2 — Dependency CVEs (OSV)** | `npm run security:cve-lite` | Lockfile advisories with parent-aware fix commands, usage hints | Local gate (`security:scan`) + CI `cve-lite-scan` |
| **3 — npm advisory audit** | `npm run audit:prod` | npm registry advisories on production deps (3 apps) | Local gate (`security:scan`) + CI `security-audit` |
| **4 — App-layer patterns** | `npm run security:app-scan` | Hardcoded secrets, `eval`, permissive CORS in portal/jitsi source | Local gate (`security:scan`) |
| **5 — Security contracts** | `npm run test:security-hardening` | JWT policy, recording access, webhook secrets, malformed bodies | Local gate + CI |
| **6 — Secret reintroduction** | CI `secret-scan` | Known bad fallback strings in repo | CI only (PR gate) |
| **7 — Env hygiene** | `npm run env:audit` | Missing/forbidden `.env` keys, CORS parity | Local gate + CI `quality-gate` |

**Unified local command (layers 2–5):**

```bash
npm run security:scan
```

**Full quality gate (deps + units + security + Sonar):**

```bash
npm run test:quality:gate
```

**Pre-deploy gate** (`npm run test:local:pre-deploy-gate`) runs `sonar:lint` then `security:scan` before portal lint and E2E.

---

## OWASP CVE Lite CLI

Installed as a dev dependency (`cve-lite-cli@^1.21.0`). Wrapper: `scripts/security/run-cve-lite-scan.mjs`.

### Production targets (fail on **HIGH+**)

| App | Directory | Lockfile |
|-----|-----------|----------|
| Doctor portal | `Isara-doctor-portal/` | `package-lock.json` |
| Patient portal | `Isara-patient-portal/` | `package-lock.json` |
| Jitsi / meeting server | `Izara-jitsi-server/` | `package-lock.json` |

### Secondary targets (report-only, never block)

- `tests/unit/` — Vitest tooling
- Repository root — Playwright / gate tooling

### Commands

```bash
# Gate scan (fail on HIGH+ in production apps)
npm run security:cve-lite

# HTML dashboard (production apps)
npm run security:cve-lite:report

# Report-only (no exit 1)
node scripts/security/run-cve-lite-scan.mjs --report-only

# Stricter threshold
node scripts/security/run-cve-lite-scan.mjs --fail-on moderate
```

Reports land in `reports/security/cve-lite/`:

- `summary.json` — merged counts, fix commands, pass/fail
- `{doctor,patient,jitsi}-portal.json` — per-app normalized findings
- `dashboard.html` — when `--report` is used

CI uploads `reports/security/cve-lite/` as artifact `cve-lite-reports` (30-day retention).

### Offline / air-gapped (optional)

CVE Lite supports a local OSV advisory DB ([offline guide](https://owasp.org/cve-lite-cli/)). For restricted networks:

```bash
npm install -g cve-lite-cli
cve-lite sync-advisories   # once, or on a schedule
cve-lite /path/to/app --offline --prod-only --verbose
```

Wire `CVE_LITE_OFFLINE=1` into the wrapper when needed (future enhancement).

---

## SonarQube / SonarLint gate

`npm run sonar:lint` → `scripts/sonar/run-quality-gate.mjs`

- Runs portal ESLint with Sonar-oriented rules
- Summary: `reports/sonar/quality-gate-summary.json`
- Complements CVE Lite: Sonar catches **your code**; CVE Lite catches **third-party versions**

---

## CI pipeline (GitHub Actions)

From `.github/workflows/ci.yml`:

```
unit-tests
security-audit (npm audit, prod deps)
cve-lite-scan   (OWASP CVE Lite)
secret-scan
    ↓
quality-gate (process contracts, lint/tsc, env:audit, sonar:lint, security contracts)
```

E2E Docker job depends on `cve-lite-scan` passing.

---

## Remediation workflow (developer loop)

1. Run `npm run security:cve-lite` locally (seconds after first sync).
2. Read `reports/security/cve-lite/summary.json` → `fixCommands` and per-app `suggestedFixCommand`.
3. Apply the **parent-aware** command CVE Lite prints (prefer `npm update parent` over direct child installs for transitive issues).
4. Re-run unit + affected E2E smoke for the touched portal.
5. Re-scan: `npm run security:cve-lite` until `passed: true`.
6. Run `npm run sonar:lint` for any code changes from upgrades.
7. Full sign-off: `npm run test:local:pre-deploy-gate` (or `GATE_FROM_STEP=security-scan` to iterate faster).

CVE Lite `--fix` auto-remediation is available upstream; this repo uses explicit commands first to keep lockfile changes reviewable.

---

## Current baseline (2026-06-11)

Last scan: **FAIL** on doctor-portal (HIGH+ policy).

| App | HIGH | MEDIUM | Suggested fix |
|-----|------|--------|---------------|
| doctor-portal | 2 | 0 | `npm install multer@2.1.1 react-router-dom@7.15.0` (in `Isara-doctor-portal/`) |
| patient-portal | 0 | 1 | `npm install react-router-dom@6.30.4` (medium only — does not block) |
| jitsi-server | 0 | 1 | `npm install @google-cloud/speech@7.0.0` (medium only) |

**Phase 1 (P0 — unblock gates):**

- [ ] Upgrade `multer` 1.x → 2.1.1 in doctor portal (API/upload regression test)
- [ ] Upgrade `react-router-dom` to ≥7.15.0 in doctor portal (transitive `react-router` CVE-2026-42211)
- [ ] Re-run `npm run security:scan` and `npm run test:local:pre-deploy-gate`

**Phase 2 (P1 — hygiene):**

- [ ] Patient portal `react-router-dom@6.30.4` (medium)
- [ ] Jitsi `@google-cloud/speech@7.0.0` (medium)
- [ ] Root tooling `socket.io-client` update (report-only today)

**Phase 3 (P2 — hardening):**

- [ ] Add `security:cve-lite:report` to release checklist; attach HTML to deploy ledger
- [ ] Weekly scheduled CI workflow (`workflow_dispatch` + cron) for CVE Lite + audit
- [ ] Document multer 2.x migration in doctor portal upload routes if API changed
- [ ] Evaluate `cve-lite --usage` reachability flags for “unused transitive” noise

**Phase 4 (P3 — future):**

- [ ] Container image scan (Trivy/Grype) for Docker images built by `docker compose`
- [ ] SBOM export per portal lockfile
- [ ] DAST smoke against staging Cloud Run URLs

---

## Quick reference

| Goal | Command |
|------|---------|
| CVE scan only | `npm run security:cve-lite` |
| CVE + HTML report | `npm run security:cve-lite:report` |
| All security layers | `npm run security:scan` |
| Sonar only | `npm run sonar:lint` |
| Sonar + security + units | `npm run test:quality:gate` |
| Full local gate | `npm run test:local:pre-deploy-gate` |

---

## Related process docs

- `PROCESS_TO_TEST_GATE.md` — gate step mapping
- `ENV_AND_STACK_CHECK.md` — stack health before gate
- `GATE0_IMPLEMENTATION_STATUS.md` — cloud smoke / Gemini probe
- `System_Architecture_Overview.md` — security architecture section
