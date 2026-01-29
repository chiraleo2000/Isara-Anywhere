# Izara Telemedicine - Scripts Directory

## Directory Structure

```
scripts/
├── lib/                      # Shared libraries and utilities
│   └── db-config.cjs         # Database configuration (passwords from env)
│
├── cloud-run/                # Cloud Run deployment files
│   ├── Dockerfile.pgadmin    # pgAdmin container (uses ARG for password)
│   ├── Dockerfile.postgres   # PostgreSQL container (uses ARG for password)
│   └── init-scripts/         # Database initialization SQL
│
├── database/                 # Database schema and migrations
│   ├── izara-database.sql    # Main schema file
│   └── migrations/           # Version migration scripts
│
├── startup_data/             # Seed data JSON files
│   ├── users.json
│   ├── doctors.json
│   ├── medical_content.json
│   └── phr_records.json
│
├── output/                   # Generated data (gitignored in production)
│
├── cloud-db-tool.cjs         # MAIN: Unified cloud database maintenance tool
├── seeder.cjs                # MAIN: Local database seeder
├── seed-cloud-db.cjs         # Cloud database seeder (uses Cloud Run)
├── push-to-cloud-db.cjs      # Push local data to cloud
├── deploy.ps1                # Unified deployment script
└── deploy-cloud-run.ps1      # Cloud Run specific deployment

## Deprecated Files (To Be Removed)

The following files have been consolidated into `cloud-db-tool.cjs`:
- check-cloud-password.cjs    → Use: cloud-db-tool.cjs --verify
- create-cloud-profiles.cjs   → Use: cloud-db-tool.cjs --fix-profiles
- fix-cloud-all.cjs           → Use: cloud-db-tool.cjs --all
- fix-cloud-schema.cjs        → Use: cloud-db-tool.cjs --fix-schema
- fix-hospital-name.cjs       → Use: cloud-db-tool.cjs --fix-profiles
- update-cloud-passwords.cjs  → Use: cloud-db-tool.cjs --fix-passwords
```

## Security Best Practices

### Environment Variables

**NEVER hardcode passwords in scripts!** Use environment variables:

```powershell
# PowerShell
$env:DB_PASSWORD = "your_password"
node scripts/cloud-db-tool.cjs --all

# Or inline
$env:DB_PASSWORD = "your_password"; node scripts/seeder.cjs
```

### Required Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | Database password | Required for cloud |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5433 (local), 5432 (cloud) |
| `DB_USER` | Database user | postgres |
| `DB_NAME` | Database name | izara_phase1 |
| `CLOUD_DB_HOST` | Cloud database host | CLOUD_SQL_HOST |

## Usage Examples

### Local Development

```bash
# Seed local database
node scripts/seeder.cjs

# Verify local database
node scripts/seeder.cjs --verify
```

### Cloud Database

```powershell
# Set password first
$env:DB_PASSWORD = "your_cloud_password"

# Run all fixes
node scripts/cloud-db-tool.cjs --all

# Or specific operations
node scripts/cloud-db-tool.cjs --fix-schema
node scripts/cloud-db-tool.cjs --fix-passwords
node scripts/cloud-db-tool.cjs --verify
```

### Deployment

```powershell
# Deploy locally
.\scripts\deploy.ps1 -Target local

# Deploy to cloud
.\scripts\deploy.ps1 -Target cloud
```

## Version History

- **v1.0.0** (2026-01-29): Reorganized scripts, added shared config, security improvements


