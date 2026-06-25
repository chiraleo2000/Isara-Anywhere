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
    └── 01-init.sql             # Copy of master schema (optional)
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


- Schema source of truth: `scripts/database/izara-database.sql`

- All new changes should be made to `scripts/database/izara-database.sql`

- See `scripts/database/README.md` and `Processes/DATABASE_TABLES_REFERENCE.md` for complete documentation
