# Output Folder - Startup Data Structure

This folder contains structured startup data for the PostgreSQL database.


## Structure

```text
output/
├── startup-data/
│   ├── 01-users.json          # User accounts and profiles
│   ├── 02-medical-content.json # Health articles
│   ├── 03-clinical-resources.json # Doctor resources
│   ├── 04-consultants.json    # Specialist directory
│   └── 05-knowledge-base.json # RAG/AI knowledge
```


## Usage

These JSON files are reference data that can be used for:


- Seeding the database

- Testing API endpoints

- Documentation purposes

- Data migration

For actual database seeding, use:


- **Local Docker**: `scripts/database/seed-local.sql`

- **Cloud SQL**: `scripts/database/seed-cloud.sql`
