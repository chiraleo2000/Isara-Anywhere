# Izara Telemedicine Platform (อิสระ เทเลเมดิซิน)

![Version](https://img.shields.io/badge/release-v1.7.33-blue.svg)
![Tests](https://img.shields.io/badge/unit%20tests-2597%20passing-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Cloud Run](https://img.shields.io/badge/Cloud%20Run-deployed-blue.svg)

Full-stack telemedicine for Thailand: video consultations (Jitsi), PHR/EMR, e-prescribing, AI clinical tools, appointment pool, and PDPA-aware data handling.

**Quick links:** [Patient Word (TH)](docs/USER_GUIDE_PATIENT_WORD_TH.docx) · [Doctor Word (TH)](docs/USER_GUIDE_DOCTOR_WORD_TH.docx) · [Patient PPT (TH)](docs/USER_GUIDE_PATIENT_PPT_TH.pptx) · [Doctor PPT (TH)](docs/USER_GUIDE_DOCTOR_PPT_TH.pptx) · [Cloud access (TH)](docs/CLOUD_ACCESS_TH.md) · [Process pages](Processes/Pages/README.md) · [Markdown guide](docs/MARKDOWN_GUIDE.md)

---

## What you get

| Portal | Who | Main capabilities |
| ------ | --- | ----------------- |
| **Patient** (`Isara-patient-portal`) | Patients, caregivers | Book appointments, PHR, video visit, AI health chat, map, living will, PDPA |
| **Doctor** (`Isara-doctor-portal`) | Doctors, nurses, admins | EMR/SOAP, queue & pool, prescriptions, lab orders, content approval, AI copilot |
| **Meeting** (`Izara-jitsi-server`) | Consultations | Jitsi embed, transcription, recording → STT, AI SOAP summary, guest join |

---

## Access URLs

### Cloud (dev-testing) — release **v1.7.33**

| Service | URL | Login |
| ------- | --- | ----- |
| **Patient Portal** | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | [Open](https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login) |
| **Doctor Portal** | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | [Open](https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login) |
| **Meeting Server** | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | API / health only |

| Service | Image tag |
| ------- | --------- |
| All three Cloud Run services | `v1.7.33` (or latest `v1.7.32-security-hardening` until redeploy) |

Region: `asia-southeast1` · Project: `izara-telemedicine`. Health: `npm run cloud:smoke`. Details: [docs/CLOUD_ACCESS_TH.md](docs/CLOUD_ACCESS_TH.md).

### Local (Docker Compose)

| Service | URL |
| ------- | --- |
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| Meeting Server | http://localhost:3020 |
| PostgreSQL | localhost:5433 |
| pgAdmin | http://localhost:5050 |

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

| Role | Cloud URL | Local URL |
| ---- | --------- | --------- |
| Patient | [Patient login](https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login) | http://localhost:3005/login |
| Doctor / Admin | [Doctor login](https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login) | http://localhost:3010/login |

**Google SSO:** Set `VITE_GOOGLE_CLIENT_ID` in each portal `.env` (see `.env.example`). SSO accounts must match a registered email.

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

docker-compose up -d --build
```

Open patient portal at http://localhost:3005 and doctor portal at http://localhost:3010.

### Required environment keys (`.env.docker`)

| Variable | Purpose |
| -------- | ------- |
| `VITE_GOOGLE_MAPS_API_KEY` | Healthcare map |
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | AI features |
| `GOOGLE_SPEECH_API_KEY` | Meeting transcription |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In |

### Docker commands

```bash
docker-compose logs -f          # follow logs
docker-compose down             # stop
docker-compose down -v && docker-compose up -d --build   # full DB reset
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
- **Tests:** **2,563** unit tests passing (Vitest); cloud smoke + `verify:gate0` — see bug report for residual E2E items

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
| Unit | Vitest (`tests/unit/`) | API, auth, workflows, security, meeting contracts |
| Cloud UI | Playwright (`tests/group-*.ui-test.ts`) | Groups A–P + **Q** (meeting lifecycle P0) |
| Coverage | [tests/PROCESS_COVERAGE_MATRIX.md](tests/PROCESS_COVERAGE_MATRIX.md) | 40 page specs + workflow docs |

**Expanded program (Waves 0–5):** meeting P0 (Group Q), doctor/patient unit packs, process audit, per-page § Automated verification under `Processes/Pages/`.

```powershell
# Unit (all)
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

# Meeting server HTTP contracts
npm run test:meeting-server:contract
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
├── docs/                   # User guides (TH), cloud access, markdown guide
├── specs/                  # Spec kit
├── scripts/                # Deploy, markdown-fixer, validation
└── docker-compose.yml
```

---

## Documentation

| Document | Audience |
| -------- | -------- |
| [USER_GUIDE_PATIENT_TH.md](docs/USER_GUIDE_PATIENT_TH.md) | Patients (Thai) — summary |
| [USER_GUIDE_PATIENT_WORD_TH.docx](docs/USER_GUIDE_PATIENT_WORD_TH.docx) | Patients — Word (**TH Sarabun New 16 pt**) |
| [USER_GUIDE_PATIENT_PPT_TH.pptx](docs/USER_GUIDE_PATIENT_PPT_TH.pptx) | Patients — slides (**FC Iconic**) |
| [USER_GUIDE_DOCTOR_TH.md](docs/USER_GUIDE_DOCTOR_TH.md) | Clinicians (Thai) — summary |
| [USER_GUIDE_DOCTOR_WORD_TH.docx](docs/USER_GUIDE_DOCTOR_WORD_TH.docx) | Doctor/Admin — Word (**TH Sarabun New 16 pt**) |
| [USER_GUIDE_DOCTOR_PPT_TH.pptx](docs/USER_GUIDE_DOCTOR_PPT_TH.pptx) | Doctor/Admin — slides (**FC Iconic**) |
| [CLOUD_ACCESS_TH.md](docs/CLOUD_ACCESS_TH.md) | Cloud URLs & health checks |
| [APPOINTMENT_USER_GUIDE.md](docs/APPOINTMENT_USER_GUIDE.md) | Appointment flows |
| [GATE0_IMPLEMENTATION_STATUS.md](Processes/GATE0_IMPLEMENTATION_STATUS.md) | Release gate status |
| [FULL_WORKFLOW_CONTRACT.md](Processes/FULL_WORKFLOW_CONTRACT.md) | End-to-end contracts |
| [VIDEO_MEETING_JITSI_GEMINI.md](Processes/VIDEO_MEETING_JITSI_GEMINI.md) | Video + AI pipeline |
| [MARKDOWN_GUIDE.md](docs/MARKDOWN_GUIDE.md) | Doc linting & auto-fix |
| [SPEC_KIT.md](specs/SPEC_KIT.md) | Full specification |

Regenerate Word/PPT from passing UI screenshots:

```bash
python scripts/build-portal-user-guides.py
```

Requires `python-docx` and `python-pptx`. Install **TH Sarabun New** and **FC Iconic** on the machine that opens the files for correct rendering.

```powershell
python scripts/enrich-process-pages.py
python scripts/build-portal-user-guides.py
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

## Changelog (recent)

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

Older entries: git history and [Presentations/TECHNICAL_DOCUMENTATION.md](Presentations/TECHNICAL_DOCUMENTATION.md).

---

## Contributing

1. Fork → feature branch → commit → push → pull request
2. For markdown changes: `node scripts/markdown-fixer.js --check-only` (see [docs/MARKDOWN_GUIDE.md](docs/MARKDOWN_GUIDE.md))

---

## License & support

**License:** MIT

**Support:** chirapathleo.saeliM@gmail.com · [GitHub Issues](https://github.com/chiraleo2000/Isara-Anywhere/issues)

© 2024–2026 Izara Telemedicine — built for Thailand's healthcare ecosystem.
