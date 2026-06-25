# Izara Telemedicine Platform (อิสระ เทเลเมดิซิน)

![Version](https://img.shields.io/badge/release-v1.7.53-blue.svg)
![Tests](https://img.shields.io/badge/unit%20tests-3200%2B%20passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-deployed-blue.svg)

Full-stack telemedicine for Thailand: video consultations (Jitsi), PHR/EMR, e-prescribing, AI clinical tools, appointment pool, and PDPA-aware data handling.

**Quick links:** [Docker + Nginx deployment](deploy/nginx/DEPLOYMENT.md) · [Documents hub](Documents/README.md) · [Thai technical 01–05](Documents/Technical_Documents/01_System_Architecture_and_Workflow.md) · [Docs index](Documents/docs/README.md) · [Diagram report — Word](Documents/docs/technical/word/TECHNICAL_DIAGRAM_REPORT_TH.docx) · [Diagram report — PPT](Documents/docs/technical/ppt/TECHNICAL_DIAGRAM_REPORT_PPT_TH.pptx) · [URLs & demo users](Documents/docs/markdown/operations/URLS_AND_DEFAULT_USERS.md) · [Technical diagrams (draw.io)](Documents/docs/diagrams/diagrams.drawio) · [Architecture slides (Sarabun 16pt)](Documents/docs/technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html) · [Architecture Word TH](Documents/docs/technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx) · [Architecture PPT TH (FC Iconic)](Documents/docs/technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx) · [Patient Word (TH)](Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx) · [Doctor Word (TH)](Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx) · [Patient PPT (TH)](Documents/docs/guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx) · [Doctor PPT (TH)](Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx) · [Cloud access (TH)](Documents/docs/markdown/operations/CLOUD_ACCESS_TH.md) · [Process pages](Processes/Pages/README.md) · [Markdown guide](Documents/docs/markdown/operations/MARKDOWN_GUIDE.md)

---

## What you get

| Portal | Who | Main capabilities |
| ------ | --- | ----------------- |
| **Patient** (`Isara-patient-portal`) | Patients, caregivers | Book appointments, PHR, video visit, AI health chat, map, living will, PDPA |
| **Doctor** (`Isara-doctor-portal`) | Doctors, nurses, admins | EMR/SOAP, queue & pool, prescriptions, lab orders, content approval, AI copilot |
| **Meeting** (`Izara-jitsi-server`) | Consultations | Jitsi embed, transcription, recording → STT, AI SOAP summary, guest join |

---

## Access URLs

### Cloud (dev-testing) — source **v1.7.33** · deployed image **v1.7.12** (2026-05-27)

| Service | URL | Login |
| ------- | --- | ----- |
| **Patient Portal** | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | [Open](https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login) |
| **Doctor Portal** | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | [Open](https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login) |
| **Meeting Server** | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | API / health only |

| Service | Cloud Run revision | Image tag | DB |
| ------- | ------------------ | --------- | -- |
| Patient | `00107-nmv` | `v1.7.12` | Cloud SQL `izara-postgres-server` |
| Doctor | `00132-ts6` | `v1.7.12` | Cloud SQL · port **8080** (nginx unified) |
| Meeting | latest | `v1.7.12` | Cloud SQL |

Region: `asia-southeast1` · Project: `izara-telemedicine`. Health: `npm run cloud:smoke`. Details: [Documents/docs/markdown/operations/CLOUD_ACCESS_TH.md](Documents/docs/markdown/operations/CLOUD_ACCESS_TH.md).

### Local (Docker Compose)

Full guide: **[deploy/nginx/DEPLOYMENT.md](deploy/nginx/DEPLOYMENT.md)** — localhost, LAN HTTP, LAN HTTPS.

| Mode | Patient | Doctor | Meeting |
| ---- | ------- | ------ | ------- |
| **A — localhost** | http://localhost:3005 | http://localhost:3010 | http://localhost:3020 |
| **B — LAN** | http://patient.isara.local | http://doctor.isara.local | http://meeting.isara.local |

| Service | Port (host) |
| ------- | ----------- |
| PostgreSQL | 5433 |
| pgAdmin | 5050 |

**Ubuntu redeploy:** `bash deploy/nginx/compose.sh --env-file .env.docker up -d --build` (works with `docker compose` V2 or `docker-compose` V1).

### Demo accounts (default startup / testing)

After `npm run cleanup:cloud-test-only`, demo users are **removed** from the cloud DB. Restore them with:

```bash
npm run cleanup:cloud-test          # purge + re-seed demo users (cloud)
# or locally:
node scripts/database/db-tool.cjs --seed
```

| Role | Portal | Email | Password | Notes |
| ---- | ------ | ----- | -------- | ----- |
| Patient (primary) | Patient | `demo.test@gmail.com` | `P@ssw0rd` | `PATIENT-DEMO` — main E2E / GATE0 patient |
| Patient | Patient | `Somchai.Mankong@gmail.com` | `P@ssw0rd` | `PATIENT-SOMCHAI` |
| Patient | Patient | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` | `PATIENT-ANAN` |
| Doctor (HOST) | Doctor | `doctor.test@izara.com` | `IzaraDoctor@2024` | `DOC-TEST-001` — video meetings, EMR, queue |
| Admin | Doctor | `admin.test@izara.com` | `IzaraAdmin@2024` | Pool management, doctor approval |
| Doctor (extra) | Doctor | `somchai.prasert@izara.com` | `IzaraDoctor@2024` | Cardiology demo profile |

**Where to log in**

| Role | Cloud URL | Local URL | LAN URL |
| ---- | --------- | --------- | ------- |
| Patient | [Patient login](https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login) | http://localhost:3005/login | http://patient.isara.local/login |
| Doctor / Admin | [Doctor login](https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login) | http://localhost:3010/login | http://doctor.isara.local/login |

**Google SSO:** Set `GOOGLE_CLIENT_ID` in each portal `.env` (see `.env.example`). SSO accounts must match a registered email.

**Do not use demo passwords in production.**

---

## Quick start (developers)

### Prerequisites

- Node.js **≥ 22**
- Docker & Docker Compose
- Git

### Run locally

```bash
git clone https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere

cp .env.docker.example .env.docker
# Add API keys (see table below)

bash deploy/nginx/compose.sh up -d --build
# or: docker compose up -d --build  /  docker-compose up -d --build
```

Open patient portal at http://localhost:3005 and doctor portal at http://localhost:3010.

Copy `.env.example` → `.env` (or use `.env.test` for Vitest). Required keys are validated at boot via `scripts/env/schema.js` (`JWT_SECRET` ≥ 32 chars, `GEMINI_API_KEY` including placeholder `xxxxx`).

**Sync all portal `.env` from `.env.docker`:**

```bash
cp .env.docker.example .env.docker   # once
npm run env:sync                     # writes patient/doctor/meeting/.env + root .env
```

See [docs/ENV_SETUP.md](docs/ENV_SETUP.md) · [docs/SPLIT_REPOS.md](docs/SPLIT_REPOS.md) for npm-only dev and splitting into separate Git repos.

### Required environment keys (`.env.docker`)

| Variable | Purpose |
| -------- | ------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Healthcare map |
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | AI features (dev placeholder: `xxxxx` in `.env.example`) |
| `GOOGLE_SPEECH_API_KEY` | Meeting transcription |
| `GOOGLE_CLIENT_ID` | Google Sign-In |

### Docker commands

```bash
bash deploy/nginx/compose.sh logs -f    # follow logs
bash deploy/nginx/compose.sh down       # stop
bash deploy/nginx/compose.sh down -v && bash deploy/nginx/compose.sh up -d --build   # full DB reset
bash deploy/nginx/deploy.sh                 # full LAN HTTPS deploy (Ubuntu)
bash deploy/nginx/diagnose.sh               # LAN health + login smoke (Ubuntu)
npm run cleanup:project                 # prune logs, caches, stale ledgers
```

| Service | Port |
| ------- | ---- |
| Patient Portal | 3005 |
| Doctor Portal | 3010 |
| Meeting Server | 3020 |
| PostgreSQL | 5433 |
| pgAdmin | 5050 |

---

## Release highlights — v1.7.18 (May 2026)

Current cloud focus: **GATE 0** appointment sync and Jitsi meeting reliability before broader Phase 1 sign-off.

- **Patient portal (v1.7.18):** Latest Cloud Run image; appointment pool, PHR, meeting join UX
- **Doctor portal (v1.7.16):** Queue/pool realtime, assigned-doctor confirm, HealthMeeting host flow
- **Meeting server (v1.7.11):** Jitsi identity, `join-config`, recording → STT; meeting create JWT fix (Round 2)
- **Jitsi:** Display names from Izara registration; Izara lobby; patient `/meeting/:id` and guest `/guest-join/:id`; doctor is **HOST** (`moderator`) on confirmed visits
- **Appointments:** Single PostgreSQL pool; statuses `in_pool` → `awaiting_doctor_response` → `confirmed`; realtime via `pg_notify` + Socket.IO (+ optional Redis adapter)
- **Tests:** **2938** Vitest + **78** meeting-server contracts (Docker verified); cloud smoke + `verify:gate0` — see [UNIT_TEST_UI_COVERAGE.md](Documents/docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md)

Details: [Processes/GATE0_IMPLEMENTATION_STATUS.md](Processes/GATE0_IMPLEMENTATION_STATUS.md), [Processes/TWO_ROUND_CLOUD_TESTING.md](Processes/TWO_ROUND_CLOUD_TESTING.md), [CLOUD_E2E_BUG_REPORT.md](CLOUD_E2E_BUG_REPORT.md).

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                 IZARA TELEMEDICINE v1.7.18                   │
├─────────────────────────────────────────────────────────────┤
│  Patient Portal (3005)   Doctor Portal (3010)   Meeting (3020) │
│         React + Vite          React + Vite      Express + IO   │
│              └──────────────────┼──────────────────┘           │
│                                 ▼                              │
│              PostgreSQL 18 + pgvector (primary DB)             │
│         Local :5433  |  Cloud VM :5432 (when configured)       │
├─────────────────────────────────────────────────────────────┤
│  Jitsi Meet · Google Gemini · Google Maps · Cloud Run        │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Stack |
| ----- | ----- |
| Frontend | React 18, TypeScript, Vite 7, Tailwind |
| Backend | Node.js 22, Express |
| Data | PostgreSQL 18, pgvector |
| Realtime | Socket.IO, PostgreSQL NOTIFY |
| AI | Google Gemini |
| Video | Jitsi (meet.jit.si or custom domain) |
| Deploy | Google Cloud Build → Cloud Run |

---

## Testing

| Layer | Tool | Scope |
| ----- | ---- | ----- |
| Unit | Vitest (`tests/unit/`) | **~3200** tests · 219 files · auth, workflows, meeting BFF |
| Meeting contracts | `npm run test:meeting-server:contract` | HTTP + JWT + pipeline contracts |
| Meeting integration | `npm run test:meeting-server:integration` | Socket.IO lobby (live :3020, skip if down) |
| Phase gates | `npm run phase:0` … `phase:9` | Pre-phase smoke → unit → headed E2E → screenshots → ledger |
| Cloud UI | Playwright (`tests/group-*.ui-test.ts`) | Groups A–P + **Q** (meeting lifecycle P0) |
| Static guards | `npm run test:guards:static` | No legacy `src/`, credentials-include, dev env |

**Local release gate:** `npm run test:local:pre-deploy-gate` (alias `npm run phase:9`)

Canonical contract: [Processes/FULL_WORKFLOW_CONTRACT.md](Processes/FULL_WORKFLOW_CONTRACT.md) · test gates: [Processes/PROCESS_TO_TEST_GATE.md](Processes/PROCESS_TO_TEST_GATE.md)

### Local Docker (recommended for full suite)

Requires Docker Desktop and `.env` (or `.env.docker`) with placeholders — **never commit real secrets**.

```bash
# Full Vitest in node:20-alpine (2938 tests)
npm run test:unit:docker

# Memory-safe grouped run (same tests, 4 shards)
npm run test:unit:docker:grouped

# Rebuild docker-compose stack + unit + meeting-server contracts (3016 total)
npm run test:unit:docker:deploy

# Browser E2E in Docker (headless Playwright)
npm run test:e2e:docker:queue-traceability
npm run test:e2e:docker:patient-jitsi-prejoin
```

On Windows PowerShell, run from repo root. The grouped runner uses `npx cross-env` internally for Vitest env flags.

### Other test commands

```powershell
# Unit (host — requires tests/unit/node_modules)
cd tests/unit && npx vitest run

# Cloud serial pipeline (appointments → host → meeting Q → clinical → PHR)
$env:TEST_ENV="cloud"
npm run test:e2e:pipeline

# Meeting lifecycle only (after D + D-host)
npm run test:e2e:meeting-lifecycle

# Wave unit packs
npm run test:unit:wave2
npm run test:unit:wave3
npm run test:unit:wave4

# Process coverage audit
npm run test:audit:process
python scripts/append-page-automated-verification.py

# Meeting server HTTP contracts + JWT role tests
npm run test:meeting-server:contract
npm run test:unit:meeting-acceptance

# Queue lifecycle + env schema + Jitsi roles
cd tests/unit && npx vitest run doctor-portal/queueLifecycle.integration.test.ts doctor-portal/queueAcceptTraceability.test.ts config/envSchema.test.ts meeting-server/jitsiRoleJwt.test.ts
```

Canonical contract: [Processes/FULL_WORKFLOW_CONTRACT.md](Processes/FULL_WORKFLOW_CONTRACT.md).  
E2E notes: [tests/e2e/README.md](tests/e2e/README.md) (legacy `tests/e2e/specs/` may differ from root groups).

---

## Cloud deployment

```bash
cd Isara-patient-portal && gcloud builds submit --config=cloudbuild.yaml
cd Isara-doctor-portal  && gcloud builds submit --config=cloudbuild.yaml
cd Izara-jitsi-server    && gcloud builds submit --config=cloudbuild.yaml
```

Or use repo scripts:

```powershell
.\scripts\deploy-cloud-from-env.ps1 -Tag v1.7.18   # patient default in cloudbuild
# Per-service: Isara-patient-portal/cloudbuild.yaml (_TAG v1.7.18)
#              Isara-doctor-portal/cloudbuild.yaml (v1.7.16)
#              Izara-jitsi-server/cloudbuild.yaml (v1.7.11)
```

---

## Project layout

```text
Isara-Anywhere/
├── Isara-patient-portal/    # Patient app + unified Express API
├── Isara-doctor-portal/     # Doctor/admin app + APIs (auth, main, GCS)
├── Izara-jitsi-server/      # Meetings, transcription, AI summary
├── tests/
│   ├── unit/               # Vitest
│   └── e2e/                # Playwright specs 01–31
├── Processes/              # Workflow & GATE docs
├── Documents/docs/                   # User guides (TH), cloud access, markdown guide
├── specs/                  # Spec kit
├── scripts/                # Deploy, markdown-fixer, validation
└── docker-compose.yml
```

---

## Documentation

| Document | Audience |
| -------- | -------- |
| [Docs index](Documents/docs/README.md) | Full layout by type + content |
| [URLs & demo users + user guides](Documents/docs/markdown/operations/URLS_AND_DEFAULT_USERS.md) | Cloud/local URLs, demo accounts, **Word / PPT / PDF** links |
| [Patient Word guide](Documents/docs/guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx) | Patients — Word (**TH Sarabun New 16 pt**) |
| [Patient PPT guide](Documents/docs/guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx) | Patients — slides (**FC Iconic**) |
| [Doctor Word guide](Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx) | Doctor/Admin — Word (**TH Sarabun New 16 pt**) |
| [Doctor PPT guide](Documents/docs/guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx) | Doctor/Admin — slides (**FC Iconic**) |
| [CLOUD_ACCESS_TH.md](Documents/docs/markdown/operations/CLOUD_ACCESS_TH.md) | Cloud URLs & health checks |
| [APPOINTMENT_USER_GUIDE.md](Documents/docs/markdown/operations/APPOINTMENT_USER_GUIDE.md) | Appointment flows |
| [PROCESS_TO_TEST_GATE.md](Processes/PROCESS_TO_TEST_GATE.md) | Process doc → test command mapping |
| [DEPLOYMENT.md](deploy/nginx/DEPLOYMENT.md) | Docker + Nginx (localhost / LAN HTTP / HTTPS) |
| [DATABASE_TABLES_REFERENCE.md](Processes/DATABASE_TABLES_REFERENCE.md) | All 53+ PostgreSQL tables with workflow mapping |
| [WORKFLOW_CONNECTIONS.md](Processes/WORKFLOW_CONNECTIONS.md) | Platform topology, pipeline & feature diagrams |
| [FULL_WORKFLOW_CONTRACT.md](Processes/FULL_WORKFLOW_CONTRACT.md) | End-to-end contracts |
| [MARKDOWN_GUIDE.md](Documents/docs/markdown/operations/MARKDOWN_GUIDE.md) | Doc linting & auto-fix |
| [VIDEO_MEETING_JITSI_GEMINI.md](Processes/VIDEO_MEETING_JITSI_GEMINI.md) | Video + AI pipeline |
| [SPEC_KIT.md](specs/SPEC_KIT.md) | Full specification |

Regenerate Word/PPT from passing UI screenshots:

```bash
python scripts/build-portal-user-guides.py
powershell -ExecutionPolicy Bypass -File scripts/export-user-guide-pdf.ps1
```

Requires `python-docx`, `python-pptx`, and Microsoft Word/PowerPoint (for PDF export). Install **TH Sarabun New** and **FC Iconic** on the machine that opens the files.

```powershell
python scripts/enrich-process-pages.py --force-steps
python scripts/build-portal-user-guides.py
powershell -File scripts/export-user-guide-pdf.ps1
npm run cleanup:cloud-test   # after E2E — purge test rows + re-seed baseline demo
```

---

## Security & compliance

- bcrypt + JWT (doctor) / session tokens (patient); 12-char password policy
- OWASP headers (Helmet), rate limiting, CORS restricted on Cloud Run
- Permissions-Policy scoped for Jitsi (`camera`, `microphone`)
- IDOR-safe, scoped APIs; sanitized production errors
- **Man-in-the-loop:** clinicians approve AI outputs before patient delivery
- PDPA-oriented consent and audit patterns

---

## Quality gates (v1.7.53)

```powershell
npm run phase:0                  # lint, typecheck, meeting-server contract
npm run test:unit:groups-sequential -- --fail-fast
npm run docker:probe-health
npm run docker:meeting-api-smoke
npm run phase:2                  # … through phase:9
npm run test:local:pre-deploy-gate   # full pre-deploy (phase 9)
npm run test:guards:static
npm run test:cloud:deploy-gate   # smoke + GATE0 (after local gate green)
npm run test:cloud:release-gate  # full cloud chain → ledger:cloud --round final
npm run ledger:local -- --round N
npm run cleanup:project          # prune stale logs & caches
```

CI tiers: [.github/workflows/ci.yml](.github/workflows/ci.yml) — PR fast / `run-docker-e2e` label / nightly `phase:9`.

**Defect remediation:** [`reports/defect-fix/DEFECT_REGISTER.md`](reports/defect-fix/DEFECT_REGISTER.md) · draw.io: [Documents/docs/markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md](Documents/docs/markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md)

Error ledgers: `reports/local-error-ledger/*-latest.json` (run `npm run ledger:local`; root `*_ERROR_LEDGER_ROUND*.md` are not kept).

---

## Changelog (recent)

### v1.7.53 (June 2026)

- **Phase gates 0–9** with pre-phase smoke (`docker:probe-health`, `meeting-api-smoke`, DB reset), failure archive, `PW_WORKERS=1`
- **LAN Mode B:** `*.isara.local` CORS, `deploy/nginx/compose.sh`, patient runtime `env-config.js`, redeploy docs
- **CI restored:** PR fast / docker-e2e label / nightly phase 9
- **Static guards:** `npm run test:guards:static` · Socket.IO integration tests
- **~3200** Vitest unit tests · cleanup: `npm run cleanup:project` prunes logs & stale ledgers

### v1.7.50 (June 5, 2026)

- Queue accept traceability: `includeAccepted=true`, 7-day accepted window, `derivePoolStatus` → `accepted`
- Jitsi JWT roles: doctor `owner`/moderator, patient `member`, guest invite token required
- Process test registry: **2938** Vitest + **78** meeting-server contracts; Docker grouped runner

### v1.7.41 (May 30, 2026)

- Sonar IDE: S4325 type assertions removed; S5725 Mermaid SRI on html-diagrams 10/17/18/19
- Behavioral Vitest: G2/G3/P7/D7–D8; 2698 unit tests; Defect-regression cloud 19 passed

### v1.7.40 (May 30, 2026)

- Sonar/static pass: tsconfig deprecations, Maps AdvancedMarker, NotificationsPage hook, appointment PUT helper
- Deploy tag v1.7.40; draw.io update instructions in `Documents/docs/markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md`

### v1.7.39 (May 29, 2026)

- Defect PDF full closure: doctor notification `isRead` parity, behavioral Vitest, `Defect-regression` Playwright (15 tests), deploy tag v1.7.39
- Diagram: [`Documents/Presentations/html-diagrams/19-defect-remediation-v1739.html`](Documents/Presentations/html-diagrams/19-defect-remediation-v1739.html)

### v1.7.37 (May 28, 2026)

- Sonar-aligned quality gate (`npm run sonar:lint`, `test:quality:gate`); server paths in Sonar sources
- Unit tests: sanitize middleware regression, PHR timeline degraded mode, responsive breakpoints
- Patient `/api/phr/:id/timeline` returns 200 `[]` for demo patients on DB errors (fixes cloud S03 500)
- Responsive UI: doctor login/dashboard padding, ResponsiveLayout mobile gutters, patient 44px touch nav
- **Docs:** [Documents/docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md](Documents/docs/markdown/testing/UNIT_TEST_UI_COVERAGE.md) (2646 unit + UI screenshots), diagram [Documents/Presentations/html-diagrams/17-testing-quality-gate.html](Documents/Presentations/html-diagrams/17-testing-quality-gate.html), TH Word/PPT via `npm run guides:technical`

### v1.7.18 (May 22, 2026)

- Patient portal Cloud Run image `v1.7.18` (latest deploy tag)
- Doctor `v1.7.16`, meeting `v1.7.11`; monorepo `cloudbuild.yaml` default `v1.7.12`
- GATE 0: G1–G6 API checks largely green; Round 2 unit **2563/2563**; residual Playwright items in [CLOUD_E2E_BUG_REPORT.md](CLOUD_E2E_BUG_REPORT.md)
- User guides **v1.7.15** content (TH); npm `package.json` baseline **1.7.3** until next semver bump

### v1.7.15 (May 2026)

- GATE 0: appointment pool sync, assigned-doctor confirm, Jitsi host-ready gating, guest join
- `socketRedisAdapter.cjs`, `appointmentQueueMapper.cjs`, cloud meeting URL fallback

### v1.7.12 / v1.7.3

- Unified deploy script default tag; SonarQube clean; native PostgreSQL 5432 option

### v1.5.x

- Meeting recording → STT → AI SOAP pipeline (spec 31)
- Cloud UI screenshot suites; camera/mic Permissions-Policy fixes
- 3,300+ combined unit + E2E + UI tests at full pass targets

Older entries: git history and [Documents/Presentations/TECHNICAL_DOCUMENTATION.md](Documents/Presentations/TECHNICAL_DOCUMENTATION.md).

---

## Contributing

1. Fork → feature branch → commit → push → pull request
2. For markdown changes: `node scripts/markdown-fixer.js --check-only` (see [Documents/docs/markdown/operations/MARKDOWN_GUIDE.md](Documents/docs/markdown/operations/MARKDOWN_GUIDE.md))

---

## License & support

**License:** MIT

**Support:** chirapathleo.saeliM@gmail.com · [GitHub Issues](https://github.com/chiraleo2000/Isara-Anywhere/issues)

© 2024–2026 Izara Telemedicine — built for Thailand's healthcare ecosystem.
