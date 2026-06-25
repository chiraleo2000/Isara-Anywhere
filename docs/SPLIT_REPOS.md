# Splitting into separate Git repositories

The monorepo works well for full gate testing. For **day-to-day dev on one portal**, you can publish three app repos and keep a thin **platform** repo.

## Recommended layout

| Repo | Contents | Who clones |
|------|----------|------------|
| `Isara-patient-portal` | `Isara-patient-portal/` only | Patient FE/BE devs |
| `Isara-doctor-portal` | `Isara-doctor-portal/` only | Doctor FE/BE devs |
| `Izara-jitsi-server` | `Izara-jitsi-server/` only | Meeting / video devs |
| `Isara-platform` (optional) | `docker-compose.yml`, `scripts/database/`, `tests/`, `deploy/` | DevOps / QA |

Each app repo includes:

- Its own `package.json`, `Dockerfile.unified`, `cloudbuild.yaml`
- `.env.example` + run `env:sync` from copied `.env.docker` snippet or manual `.env`

## What breaks when split

| Item | Mitigation |
|------|------------|
| Shared `JWT_SECRET` | Copy same value to all three `.env` files |
| DB schema | Publish `izara-database.sql` as npm package or git submodule `isara-db-schema` |
| Cross-portal E2E | Stay in platform monorepo CI; apps run unit tests only in split repos |
| `docker-compose.yml` | Lives in platform repo; clones as sibling folders or uses published images |

## Option A — Git subtree split (preserve history)

**Prerequisite:** Part B P5B green (`test:local:pre-deploy-gate` + `test:standalone:all`).

From monorepo root, one-time per app (do **not** push without explicit approval):

```bash
# Patient portal
git subtree split --prefix=Isara-patient-portal -b split/patient-portal
git push git@github.com:YOUR_ORG/Isara-patient-portal.git split/patient-portal:main

# Doctor portal
git subtree split --prefix=Isara-doctor-portal -b split/doctor-portal
git push git@github.com:YOUR_ORG/Isara-doctor-portal.git split/doctor-portal:main

# Meeting server
git subtree split --prefix=Izara-jitsi-server -b split/meeting-server
git push git@github.com:YOUR_ORG/Izara-jitsi-server.git split/meeting-server:main

# Platform hub (slim tree or submodules)
git subtree split --prefix=scripts -b split/platform-scripts
# Or keep monorepo as Isara-Anywhere with git submodules pointing at split remotes
```

Tags after split: `platform-v1.8.0`, `patient-v1.7.x`, `doctor-v1.7.x`, `meeting-v1.7.x`.

Sibling clone layout: `bash scripts/repos/clone-siblings.sh ../izara-siblings`

Create empty GitHub repos first (`gh repo create ... --private`).

## Option B — Fresh export (no history)

```bash
cp -r Isara-patient-portal ../Isara-patient-portal-standalone
cd ../Isara-patient-portal-standalone
git init && git add . && git commit -m "Initial patient portal export"
git remote add origin git@github.com:YOUR_ORG/Isara-patient-portal.git
git push -u origin main
```

Repeat for doctor and meeting.

## Option C — Stay monorepo, dev one folder (simplest)

No split required:

```powershell
npm run env:sync
docker compose up -d postgres
cd Isara-doctor-portal && npm run dev
```

Use **git sparse-checkout** if clone size matters:

```bash
git clone --filter=blob:none --sparse https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere
git sparse-checkout set Isara-doctor-portal scripts/database docker-compose.yml .env.docker.example
```

## Shared env without monorepo

1. Keep a private `isara-env` repo or 1Password item with `JWT_SECRET`, DB password, API keys.
2. Each app `.env.example` documents required keys.
3. CI injects secrets via GitHub Actions `secrets.*`.

## Suggested workflow

1. **Develop** in split app repo (or monorepo subfolder).
2. **Integrate** via platform monorepo PR before release.
3. **Deploy** from monorepo `cloudbuild.yaml` (repo-root context) until each app repo has its own pipeline.

## Do not commit

- `.env`, `.env.docker`, portal `.env` files
- API keys, `GOOGLE_CLIENT_SECRET`, service account JSON

Use `npm run env:sync` locally only.
