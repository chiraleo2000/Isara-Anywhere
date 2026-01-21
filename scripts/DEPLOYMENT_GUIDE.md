# Izara Telemedicine - Deployment Guide

## Overview

This guide covers deploying the Izara Telemedicine platform for both local development and cloud production environments.

---

## Quick Start (Local Docker)

### Prerequisites
- Docker Desktop installed and running
- Git
- PowerShell (Windows) or Bash (Linux/macOS)

### One-Command Deployment

**Windows (PowerShell):**
```powershell
.\scripts\deploy\deploy-local.ps1 -SeedData
```

**Linux/macOS (Bash):**
```bash
chmod +x scripts/deploy/deploy-local.sh
./scripts/deploy/deploy-local.sh --seed
```

### Options
| Option | Description |
|--------|-------------|
| `-Clean` / `--clean` | Remove all containers and volumes before deploying |
| `-SeedData` / `--seed` | Seed database with test data after deployment |
| `-RebuildAll` / `--rebuild` | Rebuild all Docker images from scratch |

### Access URLs
| Service | URL |
|---------|-----|
| Patient Portal | http://localhost:3005 |
| Doctor Portal | http://localhost:3010 |
| PgAdmin | http://localhost:5050 |

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Patient | demo.test@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |

---

## Cloud Deployment (Google Compute Engine - Recommended)

Uses Docker Compose on a GCE instance, similar to local deployment but in the cloud.
**No CloudSQL required** - PostgreSQL runs in a container alongside the portals.

### Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated
- GCP Project with Compute Engine API enabled

### Deployment Steps

**Windows (PowerShell):**
```powershell
# First time - creates the instance
.\scripts\deploy\deploy-gce.ps1 -ProjectId "your-project-id" -CreateInstance

# Updates only - redeploys to existing instance
.\scripts\deploy\deploy-gce.ps1 -ProjectId "your-project-id" -UpdateOnly
```

### Options
| Option | Description |
|--------|-------------|
| `-ProjectId` | **Required.** GCP Project ID |
| `-Environment` | `staging` or `production` (default: staging) |
| `-CreateInstance` | Create a new GCE instance |
| `-UpdateOnly` | Update existing instance |
| `-Zone` | GCE zone (default: asia-southeast1-a) |

### Access URLs (Replace IP with your instance IP)
| Service | URL |
|---------|-----|
| Patient Portal | http://<INSTANCE_IP>:3005 |
| Doctor Portal | http://<INSTANCE_IP>:3010 |
| PgAdmin | http://<INSTANCE_IP>:5050 |

### Syncing Data to CloudSQL (Optional)

pgAdmin provides a way to export data from the container PostgreSQL and import to CloudSQL:

1. **Access pgAdmin** at http://<INSTANCE_IP>:5050
2. **Login** with admin@izara.com / IzaraAdmin@2024
3. **Register the container PostgreSQL** server:
   - Host: postgres (Docker network name)
   - Port: 5432
   - Username: postgres
   - Password: P@ssw0rd
4. **Export data**: Right-click database → Backup → Plain format
5. **Register CloudSQL** server:
   - Host: <CloudSQL public IP or private IP>
   - Port: 5432
   - Username: postgres
   - Password: <CloudSQL password>
6. **Import data**: Right-click database → Restore → Select backup file

---

## Cloud Deployment (Cloud Run + CloudSQL - Legacy)

### Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated
- GCP Project with Cloud Run and Cloud SQL enabled
- Service account with appropriate permissions

### Deployment Steps

**Windows (PowerShell):**
```powershell
.\scripts\deploy\deploy-cloud.ps1 -ProjectId "your-project-id" -Environment staging
```

**Linux/macOS (Bash):**
```bash
chmod +x scripts/deploy/deploy-cloud.sh
./scripts/deploy/deploy-cloud.sh --project your-project-id --env staging
```

### Options
| Option | Description |
|--------|-------------|
| `-ProjectId` / `--project` | **Required.** GCP Project ID |
| `-Environment` / `--env` | `staging` or `production` (default: staging) |
| `-SeedData` / `--seed` | Show instructions for seeding Cloud SQL |
| `-BuildOnly` / `--build-only` | Only build and push images, don't deploy |

### Environment Configuration
| Setting | Staging | Production |
|---------|---------|------------|
| Min Instances | 0 | 1 |
| Max Instances | 2 | 10 |
| Cloud SQL Instance | izara-sql-staging | izara-sql-production |

### Seeding Cloud SQL
After deployment, seed the database:
```bash
gcloud sql connect izara-sql-staging --user=postgres --database=izara_phase1 < scripts/database/seed-cloud.sql
```

---

## Folder Structure

```
scripts/
├── database/
│   ├── seed-local.sql          # Local Docker seed data (with TRUNCATE)
│   └── seed-cloud.sql          # Cloud SQL seed data (with UPSERT)
│
├── deploy/
│   ├── deploy-local.ps1        # Local Docker deployment (Windows)
│   ├── deploy-local.sh         # Local Docker deployment (Linux/macOS)
│   ├── deploy-cloud.ps1        # Cloud Run deployment (Windows)
│   └── deploy-cloud.sh         # Cloud Run deployment (Linux/macOS)
│
├── output/
│   └── startup-data/           # Reference JSON data files
│       ├── 01-users.json
│       ├── 02-medical-content.json
│       ├── 03-clinical-resources.json
│       ├── 04-consultants.json
│       └── 05-knowledge-base.json
│
├── tests/                      # Playwright tests
├── generators/                 # Data generation scripts
├── seeders/                    # Database seeders
└── utilities/                  # Helper utilities
```

---

## Database Schema

The platform uses PostgreSQL with pgvector extension. Main tables:

| Table | Description |
|-------|-------------|
| `users` | All user accounts (patients, doctors, admins) |
| `doctor_profiles` | Doctor-specific profile data |
| `patient_profiles` | Patient-specific profile data |
| `phr` | Personal Health Records |
| `vital_signs` | Patient vital sign measurements |
| `appointments` | Appointment scheduling |
| `emr` | Electronic Medical Records (SOAP format) |
| `medical_content` | Health articles for patients |
| `clinical_resources` | Resources for healthcare professionals |
| `consultants` | Specialist directory |
| `knowledge_base` | RAG/AI knowledge content |
| `notifications` | User notifications |

---

## Troubleshooting

### Docker Issues
```powershell
# Check container status
docker ps -a

# View container logs
docker-compose logs -f

# Restart all containers
docker-compose restart

# Full reset
.\scripts\deploy\deploy-local.ps1 -Clean -SeedData
```

### Database Issues
```powershell
# Connect to PostgreSQL
docker exec -it izara-postgres psql -U postgres -d izara_phase1

# Check user count
SELECT role, count(*) FROM users GROUP BY role;

# Re-seed database
Get-Content scripts\database\seed-local.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

### Port Conflicts
If ports are in use:
```powershell
# Find process using port 3005
netstat -ano | findstr :3005

# Kill process (replace PID)
taskkill /F /PID <PID>
```

---

## Running Tests

```powershell
cd scripts\tests
npm install
npx playwright test full-coverage.spec.ts --reporter=list
```

All 26 tests should pass, covering:
- Patient Portal (8 tests)
- Doctor Portal (9 tests)
- Admin Portal (4 tests)
- API Endpoints (5 tests)

---

## Support

For issues or questions, refer to:
- [MOCK_DATA_REFERENCE.md](MOCK_DATA_REFERENCE.md) - Test data documentation
- [README.md](../README.md) - Project overview
