# Izara Telemedicine - Scripts

Utility scripts for development, deployment, testing, and data management.

## Quick Start

### Local Docker Deployment
```powershell
# Windows
.\deploy\deploy-local.ps1 -SeedData

# Linux/macOS
./deploy/deploy-local.sh --seed
```

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

## Folder Structure

```
scripts/
├── database/                   # SQL seed files
│   ├── seed-local.sql          # Local Docker (with TRUNCATE)
│   ├── seed-cloud.sql          # Cloud SQL (with UPSERT)
│   └── postgresql-schema.sql   # Database schema reference
│
├── deploy/                     # Deployment scripts
│   ├── deploy-local.ps1/sh     # Local Docker Compose
│   └── deploy-cloud.ps1/sh     # Google Cloud Run
│
├── output/                     # Reference data files
│   └── startup-data/           # Structured JSON seed data
│
├── tests/                      # Test suites
│   ├── full-coverage.spec.ts   # Main Playwright tests (26 tests)
│   ├── e2e/                    # End-to-end tests
│   └── unit/                   # Unit tests
│
├── generators/                 # Data generation scripts
├── seeders/                    # Database seeder scripts
├── utilities/                  # Helper utilities
├── archive/                    # Old/deprecated scripts
│
├── DEPLOYMENT_GUIDE.md         # Full deployment documentation
└── MOCK_DATA_REFERENCE.md      # Test data documentation
```

---

## Key Files

| File | Purpose |
|------|---------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Complete deployment instructions |
| [MOCK_DATA_REFERENCE.md](MOCK_DATA_REFERENCE.md) | Test data and mock data reference |
| [database/seed-local.sql](database/seed-local.sql) | Local development seed data |
| [database/seed-cloud.sql](database/seed-cloud.sql) | Cloud production seed data |
| [tests/full-coverage.spec.ts](tests/full-coverage.spec.ts) | Main test suite (26 tests) |

---

## Running Tests

```powershell
cd tests
npm install
npx playwright test full-coverage.spec.ts --reporter=list
```

Expected: **26 passed**

---

## Cloud Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for full instructions.

```powershell
# Build and deploy to staging
.\deploy\deploy-cloud.ps1 -ProjectId "your-project-id" -Environment staging
```
