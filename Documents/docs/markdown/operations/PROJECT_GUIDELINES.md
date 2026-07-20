# Project Guidelines — Issara Anywhere

## Repo map

| Path | Role |
|------|------|
| `issara-workspace/` | Gates, Playwright UI groups, Vitest unit packs, Processes, Documents |
| `../issara-patient` | Patient portal (Vite + Express) |
| `../issara-doctor` | Doctor / admin portal |
| `../issara-jitsi` | Meeting server (Socket.IO + Jitsi/Gemini) |

## Test ladder (local first → cloud → docs)

1. **Unit packs** — `npm run test:unit:<domain>` (incl. `content`, `admin`)
2. **Contracts** — `test:unit:process-contracts`, `test:unit:v5-contracts`, meeting/post-meeting/security packs
3. **Real Istanbul coverage** — Windows: `USE_DOCKER_COVERAGE=1` → `test:unit:coverage:gate` or `test:unit:docker:coverage` (thresholds **lines 60 / functions 55 / branches 50 / statements 60**). Stub/`USE_DOCKER_COVERAGE=0` is **not** a pass.
4. **Static** — `sonar:lint`, `security:scan`, `test:lint:portals:full`
5. **Stack** — `docker:probe-health`, `verify:gate0:local`
6. **Headed E2E** — `test:local:pre-deploy-gate` (expanded default matrix beyond A–J) + follow-ons as required
7. **Local UI showup** — `test:e2e:ui-showup`
8. **Screenshot uniqueness** — `test:screenshots:all` + `test:screenshots:global`
9. **Local purge** — `cleanup:local-test-only` (post-phase demo purge; no re-seed)
10. **Cloud** — only after local hard gate: deploy (portals + meeting on **GCE VM Postgres** `35.240.157.230`, not Cloud SQL) → smoke → GATE0 → `test:gate:ui-showup` → `test:cloud:full` (zero residuals)
11. **Cloud uniqueness + docs** — uniqueness → `docs:sync-screenshots` → `docs:evidence:cloud` → `python scripts/build-portal-user-guides.py`
12. **GCE VM Postgres purge** — `cleanup:cloud-test-only` targets **GCE VM** `35.240.157.230:5432` / `izara_phase1` (**not Cloud SQL**); Secret Manager `db-password` → `CLOUD_DB_PASSWORD`; `DB_SSL=false`. Cloud Run must use discrete `DB_*` (never mount `DATABASE_URL`). Status: baseline `20260717-1300` — [CLOUD_DEMO_DATA_CLEANUP.md](../../../../reports/CLOUD_DEMO_DATA_CLEANUP.md)

**Hard rule:** local must **fully pass** before cloud. No Documents image refresh until [CLOUD_GREEN_CHECKPOINT.md](../../../../reports/CLOUD_GREEN_CHECKPOINT.md). Published guide images = **cloud UI showup** unique PNGs in [`docs/screenshots/`](../../../docs/screenshots/) only — never local archives. Full local E2E = expanded matrix (not A–J only).

## Default local E2E matrix

Via `test:local:e2e-full` / pre-deploy `e2e-full-headed` (`run-full-coverage.ps1`):

`A B C D D-queue D-host Q E F L G H I J J-prejoin K R S Defect`

**Follow-ons** (explicit / separate): `Q2 M N O P U MEET R1 W-core-chromium|firefox|webkit`.

## UI showup (both environments)

| Env | Command | Screenshots |
|-----|---------|-------------|
| Local | `npm run test:e2e:ui-showup` | Archive under `tests/output/screenshots/local/` (evidence only) |
| Cloud | `npm run test:gate:ui-showup` | **Published** via `docs:sync-screenshots` → `docs/screenshots/` |

Projects: `A-auth`, `B-patient-portal`, `C-doctor-portal` (+ cloud also `S-responsive` / `S-phone-sm`).

## Screenshot uniqueness rule

- Every PNG used in guides must pass per-group uniqueness + global hash audit.
- No duplicate content hashes across the published set.
- Canonical docs path: `docs/screenshots/{group}/` — do **not** recreate `Documents/docs/screenshots/`.

## Playwright group naming

| Project | Spec |
|---------|------|
| `A-auth` | `group-A-auth-access.ui-test.ts` |
| `B-patient-portal` / `C-doctor-portal` | portal page coverage |
| `D-*` / `Q-*` / `E-*` / `F-*` / `L-*` | appointment → meeting → clinical → PHR / lab |
| `G`–`K` / `R` / `S` / `Defect` | PDPA, content, admin, AI, a11y, Jitsi roles, responsive, defects |
| `W-core-chromium\|firefox\|webkit` | `group-W-core-multibrowser` |
| Follow-ons | `Q2`, `M`–`P`, `U`, `MEET`, `R1` |

Config: root `playwright.config.ts`. Headed: `PW_HEADED=1`. Use `PLAYWRIGHT_BROWSERS_PATH=0` on Windows/Cursor.

## Local → cloud deploy rules

1. Local coverage + pre-deploy + expanded headed matrix + UI showup + uniqueness must be green.
2. Deploy: `npm run cloud:deploy` (tag e.g. `v1.7.62`) with cloudbuild `_DB_HOST=35.240.157.230` / `DB_SSL=false` / `--clear-cloudsql-instances` for portals + meeting; no `DATABASE_URL` secret mount; then `scripts/shift-cloud-traffic.ps1`.
3. Post-deploy: `cloud:smoke` → `verify:gate0` → UI showup → `test:cloud:full`.
4. Prefer product fixes in sibling apps over weakening selectors/contracts.
5. Set `CLOUD_MEETING_URL` explicitly for cloud Playwright — do not rely on docker `MEETING_SERVER_URL=http://meeting-server:3020`.
6. After each phase (local/cloud): run the matching **demo purge** (`cleanup:local-test-only` / `cleanup:cloud-test-only` on GCE VM only).

## Evidence paths

| Item | Path |
|------|------|
| Unit coverage | `reports/local-unit-gate-latest.json`, `tests/unit/coverage/` (reverify **68.24%** lines) |
| Fix loop rounds | `reports/FIX_LOOP_ROUNDS.md` |
| Local headed matrix | `reports/HEADED_UI_RUN_RESULTS.md` (W0–W6) |
| Local UI showup | `reports/LOCAL_UI_SHOWUP_RESULTS.md` |
| Local green checkpoint | [LOCAL_GREEN_CHECKPOINT.md](../../../../reports/LOCAL_GREEN_CHECKPOINT.md) |
| Local pre-deploy gate | `reports/pre-deploy-gate-phase2-complete.txt` |
| Cloud green checkpoint | [CLOUD_GREEN_CHECKPOINT.md](../../../../reports/CLOUD_GREEN_CHECKPOINT.md) · [CLOUD_GREEN_CHECKPOINT_REVERIFY.md](../../../../reports/CLOUD_GREEN_CHECKPOINT_REVERIFY.md) |
| Cloud UI showup | [CLOUD_UI_SHOWUP_RESULTS.md](../../../../reports/CLOUD_UI_SHOWUP_RESULTS.md) (baseline `20260716-1318`: **15 passed**) |
| Cloud full matrix | [CLOUD_FULL_COVERAGE_RESULTS.md](../../../../reports/CLOUD_FULL_COVERAGE_RESULTS.md) (**88 passed / zero residual**; DB = GCE VM Postgres) |
| Cloud demo purge | [CLOUD_DEMO_DATA_CLEANUP.md](../../../../reports/CLOUD_DEMO_DATA_CLEANUP.md) |
| Uniqueness | `reports/screenshot-global-audit-latest.json` |
| Published shots | [`docs/screenshots/`](../../../docs/screenshots/) |
| Reverify audit | [FULL_COVERAGE_REVERIFY_AUDIT.md](../../../../reports/FULL_COVERAGE_REVERIFY_AUDIT.md) |

Re-run and refresh these before treating any environment as green.

### Sample published UI (cloud)

![Auth — patient dashboard](../../../docs/screenshots/group-A/A01-patient-dashboard.png)

![Auth — doctor dashboard](../../../docs/screenshots/group-A/A01-doctor-dashboard.png)
