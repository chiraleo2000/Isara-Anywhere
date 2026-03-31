# Cloud Run Database Scripts

This folder contains Docker configurations for PostgreSQL deployments.

## 📁 Structure

```text
scripts/cloud-run/
├── README.md                    # This file
├── Dockerfile.pgadmin          # pgAdmin container config
├── Dockerfile.postgres         # PostgreSQL container config
├── servers.json                # pgAdmin server connections
└── init-scripts/
    └── 00-schema.sql           # ⚠️ Deprecated - references main file
```

## 🚀 Database Initialization

The database schema is now centralized in `scripts/database/izara-database.sql`.

### For Cloud SQL Deployment

```bash
# Connect and initialize
gcloud sql connect izara-instance --user=postgres --database=izara_phase1 < scripts/database/izara-database.sql
```

### For Docker (Cloud Run Emulation)

```bash
# Build and run PostgreSQL
docker build -f scripts/cloud-run/Dockerfile.postgres -t izara-postgres .

# Initialize database
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/izara-database.sql
```

## 📝 Notes

- The `init-scripts/00-schema.sql` is kept for backward compatibility
- All new changes should be made to `scripts/database/izara-database.sql`
- See `scripts/database/README.md` for complete documentation
