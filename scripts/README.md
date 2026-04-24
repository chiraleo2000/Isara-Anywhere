# Izara Telemedicine - Scripts & Tooling


## Quick Start

```powershell

# 1. Deploy locally
.\scripts\deploy\local.ps1


# 2. Seed database
node scripts/database/db-tool.cjs --all


# 3. Check status
.\scripts\izara-cli.ps1 status
```

---


## Directory Structure

```text
scripts/
├── izara-cli.ps1              # Main CLI (deploy, db, health, clean, status)
├── README.md
│
├── database/                  # All database files
│   ├── db-tool.cjs            # Unified DB tool (fix, seed, verify, migrate, export/import)
│   ├── izara-database.sql     # Master schema v5.1.0 (single source of truth)
│   └── v2.0.0-phase2-tables.sql  # Phase 2 migration SQL
│
├── deploy/                    # Deployment scripts
│   ├── local.ps1              # Local Docker deploy (build, migrate, logs)
│   └── cloud.ps1              # Cloud Run dev-testing deploy
│
├── docker/                    # Docker & Cloud Build configs
│   ├── Dockerfile.postgres    # PostgreSQL 18 + pgvector
│   ├── Dockerfile.pgadmin     # pgAdmin 4
│   ├── servers.json           # pgAdmin server presets
│   ├── vm-startup.sh          # GCE VM bootstrap
│   ├── cloudbuild-postgres.yaml
│   ├── cloudbuild-pgadmin.yaml
│   └── cloudbuild-meeting-server.yaml
│
├── lib/                       # Shared libraries
│   └── db-config.cjs          # DB connection config & password hashes
│
├── output/                    # Generated exports & seed data
└── startup_data/              # Initial data files
```

---


## Unified CLI: izara-cli.ps1


### Deployment

```powershell
.\scripts\izara-cli.ps1 deploy local          # Local Docker
.\scripts\izara-cli.ps1 deploy cloud          # Cloud Run
.\scripts\izara-cli.ps1 deploy local -Fresh   # Fresh install (wipe data)
```


### Database

```powershell
.\scripts\izara-cli.ps1 db -DbAction verify   # Check connection
.\scripts\izara-cli.ps1 db -DbAction seed     # Seed demo data
.\scripts\izara-cli.ps1 db -DbAction fix      # Fix schema issues
.\scripts\izara-cli.ps1 db -DbAction backup   # Create backup
.\scripts\izara-cli.ps1 db -DbAction reset    # Reset (caution!)
```


### Health & Maintenance

```powershell
.\scripts\izara-cli.ps1 health local          # Check local services
.\scripts\izara-cli.ps1 health cloud          # Check cloud services
.\scripts\izara-cli.ps1 status                # Full system status
.\scripts\izara-cli.ps1 clean                 # Stop containers
.\scripts\izara-cli.ps1 clean -Full           # Remove everything
```

---


## Database Tool: db-tool.cjs

The unified database tool replaces 4 previous scripts. Targets: `local` (default), `cloud`, `dev-cloud`.

```powershell

# Schema & data operations
node scripts/database/db-tool.cjs --fix                           # Fix schema
node scripts/database/db-tool.cjs --seed                          # Seed demo data
node scripts/database/db-tool.cjs --verify                        # Verify data
node scripts/database/db-tool.cjs --all                           # Fix + seed + verify


# Migrations
node scripts/database/db-tool.cjs --migrate-phase2                # Phase 2 tables
node scripts/database/db-tool.cjs --migrate-ai                    # AI tables


# Data transfer (prod -> local/dev)
node scripts/database/db-tool.cjs --export                        # Export from prod
node scripts/database/db-tool.cjs --import-local                  # Import into local
node scripts/database/db-tool.cjs --import-dev                    # Import into dev cloud


# Target a specific environment
node scripts/database/db-tool.cjs --target local --fix            # Local DB
node scripts/database/db-tool.cjs --target cloud --all            # Cloud DB
node scripts/database/db-tool.cjs --target dev-cloud --verify     # Dev cloud DB


# Query & help
node scripts/database/db-tool.cjs --query                         # DB summary
node scripts/database/db-tool.cjs --help                          # Show all commands
```

---


## Deploy Scripts


### Local Docker

```powershell
.\scripts\deploy\local.ps1                    # Build & start all containers
.\scripts\deploy\local.ps1 -Migrate           # Backup -> rebuild -> restore
.\scripts\deploy\local.ps1 -NoBuild           # Start without rebuilding
.\scripts\deploy\local.ps1 -Down              # Stop all containers
.\scripts\deploy\local.ps1 -Logs              # Follow container logs
```


### Cloud Run (Dev-Testing)

```powershell
.\scripts\deploy\cloud.ps1                    # Deploy all 5 services
.\scripts\deploy\cloud.ps1 -SkipBuild         # Deploy without rebuilding
.\scripts\deploy\cloud.ps1 -OnlyPostgres      # Just PostgreSQL VM
.\scripts\deploy\cloud.ps1 -StatusOnly        # Show deployed services
.\scripts\deploy\cloud.ps1 -Teardown          # Delete all services
```

---


## Service URLs

| Service | Local | Cloud Dev-Testing |
| --- | --- | --- |
| Patient Portal | <http://localhost:3005> | Cloud Run (auto-assigned) |
| Doctor Portal | <http://localhost:3010> | Cloud Run (auto-assigned) |
| Meeting Server | <http://localhost:3020> | Cloud Run (auto-assigned) |
| PostgreSQL | localhost:5433 | 35.240.162.227:5432 (GCE VM) |
| pgAdmin | <http://localhost:5050> | Cloud Run (auto-assigned) |



---


## Cloud Build

All cloud builds use repo root as build context:

```powershell

# PostgreSQL image
gcloud builds submit --config=scripts/docker/cloudbuild-postgres.yaml .


# pgAdmin image
gcloud builds submit --config=scripts/docker/cloudbuild-pgadmin.yaml .


# Meeting server (from Izara-jitsi-server/)
cd Izara-jitsi-server
gcloud builds submit --config=../scripts/docker/cloudbuild-meeting-server.yaml .
```

---


## Files Consolidated in v3.0.0

| Old Files (removed) | New Replacement |
| --- | --- |
| `cloud-db-tool.cjs` + `migrate-prod-to-dev.cjs` + `migrate-cloud-dev.cjs` + `cloud-run/run-phase2-migration.cjs` | `database/db-tool.cjs` |
| `deploy-local.ps1` + `migrate-docker-data.ps1` | `deploy/local.ps1` |
| `cloud-run/deploy-dev-testing.ps1` | `deploy/cloud.ps1` |
| `cloud-run/Dockerfile.*` + `cloudbuild-*.yaml` + `servers.json` + `vm-startup.sh` | `docker/` directory |
| `cloud-run/init-scripts/` (duplicate SQL) | Removed (uses `database/izara-database.sql`) |
| `cloud-run/migrate-dev-phase2.ps1` | `database/db-tool.cjs --migrate-phase2` |



---


## Test Suites

```powershell
.\tests\e2e\run-tests.ps1 smoke               # Quick test (~2 min)
.\tests\e2e\run-tests.ps1 api                 # API tests (~5 min)
.\tests\e2e\run-tests.ps1 ui                  # UI tests (~10 min)
.\tests\e2e\run-tests.ps1 full                # Full tests (~15 min)
.\tests\e2e\run-tests.ps1 full cloud          # Test cloud
.\tests\e2e\run-tests.ps1 all                 # Everything
```

---


## Version History


- **v3.0.0** (2026-02): Major reorganization - consolidated 12+ scripts into 3 (db-tool, local deploy, cloud deploy)

- **v2.0.0** (2026-02-04): Added izara-cli.ps1, streamlined structure

- **v1.0.0** (2026-01-29): Initial reorganization, shared config, security improvements
