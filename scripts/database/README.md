# Izara Database Scripts

All database-related files for the Izara Telemedicine platform.

## Files

```text
database/
├── db-tool.cjs                   # Unified DB tool (fix, seed, verify, migrate, export/import)
├── izara-database.sql            # Master schema v5.1.0 (single source of truth)
└── migrations/
    ├── v1.4.3-fix-categories.sql # Category format fixes
    └── v2.0.0-phase2-tables.sql  # Phase 2 tables (living wills, AI, etc.)
```

## Usage

```powershell
# All-in-one: fix schema + seed + verify
node scripts/database/db-tool.cjs --all

# Individual operations
node scripts/database/db-tool.cjs --fix
node scripts/database/db-tool.cjs --seed
node scripts/database/db-tool.cjs --verify

# Migrations
node scripts/database/db-tool.cjs --migrate-phase2
node scripts/database/db-tool.cjs --migrate-ai

# Target specific environment (default: local)
node scripts/database/db-tool.cjs --target cloud --all
node scripts/database/db-tool.cjs --target dev-cloud --verify

# Production data transfer
node scripts/database/db-tool.cjs --export
node scripts/database/db-tool.cjs --import-local
node scripts/database/db-tool.cjs --import-dev

# Help
node scripts/database/db-tool.cjs --help
```

## Local Docker Init

The `izara-database.sql` file is automatically loaded into PostgreSQL via docker-compose:

```yaml
volumes:
  - ./scripts/database/izara-database.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
```

Manual reload:

```powershell
Get-Content scripts\database\izara-database.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

## Database Overview (24+ tables)

| Category | Tables |
| --- | --- |
| Core Users | users, sessions, password_resets |
| Patient Data | patient_profiles, phr, vital_signs, living_wills, living_will_versions, patient_consents |
| Doctor Data | doctor_profiles, doctors, doctor_schedules, doctor_reviews, consultants |
| Appointments | appointments, meeting_records, meeting_transcripts |
| Clinical | emr, prescriptions, lab_orders |
| Content | medical_content, clinical_resources, icd10_codes, drugs |
| AI/Knowledge | notifications, knowledge_base, ai_chat_history, ai_document_analysis, cds_logs, ai_validations |
| Audit | audit_logs |

## Notes

- Extensions required: uuid-ossp, pgcrypto, vector (pgvector)
- `izara-database.sql` is idempotent (safe to re-run)
- Always backup before running migrations in production
- Medical content categories use hyphenated format: `general-health`, `nutrition`, `exercise`, etc.
