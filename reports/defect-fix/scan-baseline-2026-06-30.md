# Scan Baseline — 7-Day Local Nginx Gate (Day 1 / Phase 1)

Date: 2026-06-30  
Coordinator: COORD (Day 1 baseline)  
Branch: working tree (uncommitted)  
Version: 1.7.54

Maps each gate check to Process doc ID. FAIL rows include Day 2–5 agent assignment.

## Day 1 gate results (d1-01 … d1-11)

| ID | Process doc | Agent | Step | Status | Proof |
|----|-------------|-------|------|--------|-------|
| d1-01 | Processes/ENV_AND_STACK_CHECK.md | COORD | docker compose `--profile full` up --build | **PASS** | exit 0; doctor/patient/meeting recreated healthy |
| d1-02 | Processes/ENV_AND_STACK_CHECK.md | COORD | `npm run docker:probe-health` | **PASS** | 3010/3005/3020 OK; `izara-postgres` pg_isready OK (host :5433 not in probe defaults) |
| d1-03 | Processes/VIDEO_MEETING_JITSI_GEMINI.md | COORD | `npm run docker:meeting-api-smoke` | **PASS** | create→host-present→lobby→save-recording |
| d1-04 | Processes/PROCESS_TO_TEST_GATE.md | COORD | `resetDatabaseBaseline()` | **PASS** | cleanup+seed via `scripts/docker/e2eDockerCommon.mjs` |
| d1-05 | Processes/ENV_AND_STACK_CHECK.md | SCAN-C | `npm run env:audit` | **PASS** | 8 required, 0 forbidden; `env:sync` not needed |
| d1-06 | Processes/SECURITY_SCANNING.md | SCAN-A | `npm run test:guards:static` | **PASS** | no-legacy-src, credentials-include, dev-testing env |
| d1-07 | Documents/docs/markdown/ledgers/SECURITY_SCANNING_LEDGER.md | SCAN-A | `npm run security:scan` | **PASS** | 4/4 (app-scan, cve-lite, audit:prod, hardening); SEC-018 ledger row |
| d1-08 | Processes/SECURITY_SCANNING.md | SCAN-B | `npm run sonar:lint` + eslint-deep | **PASS** | `reports/sonar/quality-gate-summary.json` passed=true; inventory `reports/eslint-deep-*.txt` |
| d1-09 | Processes/PROCESS_TO_TEST_GATE.md | SCAN-B | audit-process + test:audit:process | **PASS** | 0 gaps (`tests/PROCESS_COVERAGE_GAPS.md`) |
| d1-10 | Processes/PROCESS_TO_TEST_GATE.md | COORD | `npm run phase:0` | **PASS** | lint-portals-full + meeting-server-contract 85/85 (after Day-1 TS fixes) |
| d1-11 | Processes/FULL_WORKFLOW_CONTRACT.md | SCAN-B | `npm run test:unit:coverage:gate` | **PASS** | process-contracts 141/141; Windows skips monolithic coverage (known) |

## Day 1 fixes applied (blocking → cleared)

| ID | Process doc | Fix | Status |
|----|-------------|-----|--------|
| D1-BLOCK-01 | Processes/PDPA_Consent.md (G-group) | `PDPAPage.tsx` remove dead doctor-consent handlers/state (TS6133) | **FIXED** |
| D1-BLOCK-02 | Processes/VIDEO_MEETING_JITSI_GEMINI.md | `jitsiMeetingConfig.ts` add `storedJwt` to `PatientJitsiMountInput` | **FIXED** |

## Open inventory (non-blocking Day 1; assigned Day 2–5)

| ID | Process doc | Agent | Finding | Severity | Target day |
|----|-------------|-------|---------|----------|------------|
| D1-NB-01 | Processes/SECURITY_SCANNING.md | AUTH-P | eslint-deep: `promise/catch-or-return` — patient `useGoogleClientId.ts`, `registerSW.ts` (×2) | Low | Day 2 (d2-06 sonar on auth-touched) |
| D1-NB-02 | Processes/SECURITY_SCANNING.md | AUTH-D | eslint-deep: `promise/catch-or-return` — doctor `mainApiServer.cjs`, `useGoogleClientId.ts` | Low | Day 2 (d2-06) |
| D1-NB-03 | Processes/PROCESS_TO_TEST_GATE.md | UNIT | Windows: `test:unit:coverage:gate` skips monolithic `test:unit:coverage` (vitest v8 flake) | Info | Day 6 regression ladder |
| D1-NB-04 | Processes/ENV_AND_STACK_CHECK.md | COORD | `docker:probe-health` defaults omit explicit `:5433` TCP probe | Info | Day 2 (optional probe script tweak) |
| D1-NB-05 | Processes/SECURITY_SCANNING.md | SCAN-A | CVE Lite subprocess UV_HANDLE_CLOSING assertion on Windows (scan still PASS) | Info | Monitor |

## COORD assignment table (FAIL / inventory → Day 2–5)

| Baseline ID | Assigned agent | Day | Primary tasks | Exit proof |
|-------------|----------------|-----|---------------|------------|
| D1-NB-01, D1-NB-02 | AUTH-P + AUTH-D | Day 2 | d2-01..d2-09 auth parity; d2-06 `sonar:lint` on touched auth files | `npm run phase:2` |
| — | APPT | Day 2 | d2-10..d2-15 pool/queue/schedule unit + headed | phase:2 + ledger round 1 |
| — | MEET + JITSI | Day 3 | jl-01..jl-10 local Jitsi; d3 meeting lifecycle | phase:3 / meeting smoke |
| D1-NB-03 (coverage depth) | POST + CLIN | Day 4 | d4-01..d4-12 post-meeting + EMR/PHR | ledger round 2 |
| D1-BLOCK-01 follow-up | PAT | Day 5 | d5-01..d5-05 PDPA/living will/content visibility headed G | ledger round 5 |
| D1-NB-04 | NGINX | Day 2 | N1–N4 docs-only (plan); optional health probe doc | docs parity |

## Artifact paths

- Baseline: `reports/defect-fix/scan-baseline-2026-06-30.md`
- eslint-deep: `reports/eslint-deep-doctor.txt`, `reports/eslint-deep-patient.txt`, `reports/eslint-deep-jitsi.txt`
- Sonar summary: `reports/sonar/quality-gate-summary.json`
- Security: `reports/security-scan-d1-2026-06-30.txt`, `reports/security/cve-lite/`
- phase:0 log: `reports/phase-0-d1-2026-06-30-rerun.txt`

## Day 1 merge gate (d1-14)

| Check | Status |
|-------|--------|
| `npm run docker:probe-health` | **PASS** |
| `npm run phase:0` | **PASS** |
| `npm run test:guards:static` | **PASS** |

**Day 1 COORD merge: PASS**

## Blockers for Day 2

None P0. Day 2 may proceed with AUTH-D / AUTH-P / APPT parallel work; clear **D1-NB-01** and **D1-NB-02** during d2-06 sonar pass on auth-touched files.
