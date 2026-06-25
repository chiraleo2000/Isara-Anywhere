# Izara Database Scripts

All database-related files for the Izara Telemedicine platform.

> **Table reference:** [Processes/DATABASE_TABLES_REFERENCE.md](../../Processes/DATABASE_TABLES_REFERENCE.md)  
> **Architecture:** [Processes/PostgreSQL_Database_Architecture.md](../../Processes/PostgreSQL_Database_Architecture.md)


## Files

```text
database/
├── db-tool.cjs                   # Unified DB tool (fix, seed, verify, migrate, export/import)
├── izara-database.sql            # Master schema v5.1.0 (single source of truth, 42+ tables)
├── seed-dev-data.sql             # Dev test users and sample data
├── v2.2.0-notify-triggers.sql    # 8 LISTEN/NOTIFY triggers
├── pdpa-access-control-migration.sql
└── migrations/
    ├── v1.4.3-fix-categories.sql
    ├── v1.6.0-fix-content-approval.sql
    ├── v2.0.0-phase2-tables.sql      # Mobile/sync/preferences tables
    ├── v2.1.0-phase2-ai-his.sql      # CTM, geriatric, SOS, nursing, follow-ups
    ├── v2.2.0-ai-specialty-matching.sql
    ├── 2025-add-google-sub.sql
    ├── 2025-ensure-appointment-columns.sql
    ├── add_meeting_url_columns.sql
    └── add_appointment_meeting_columns.sql
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
node scripts/database/db-tool.cjs --target local --export-all   # all 53 tables → scripts/output/local-db-export/
node scripts/database/db-tool.cjs --import-local
node scripts/database/db-tool.cjs --import-dev


# Help
node scripts/database/db-tool.cjs --help
```


## Local Docker Init

Docker Compose loads scripts in order:

```yaml
./scripts/database/izara-database.sql              → 01-init.sql
./scripts/database/migrations/v2.0.0-phase2-tables.sql → 02-phase2.sql
./scripts/database/migrations/v2.1.0-phase2-ai-his.sql → 03-phase2-ai-his.sql
./scripts/database/v2.2.0-notify-triggers.sql    → 04-notify-triggers.sql
./scripts/database/seed-dev-data.sql             → 05-seed-dev.sql
./scripts/database/migrations/2025-add-google-sub.sql → 06-google-sub.sql
./scripts/database/migrations/2025-ensure-appointment-columns.sql → 07-appointment-columns.sql
```

Manual reload:

```powershell
Get-Content scripts\database\izara-database.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```


## Database Overview (53+ tables)

| Category | Tables |
| --- | --- |
| User & Auth | users, sessions, password_resets, device_tokens, biometric_credentials, refresh_tokens |
| Patient Data | patient_profiles, phr, vital_signs, living_wills, living_will_versions, patient_consents, push_subscriptions |
| Doctor Data | doctor_profiles, doctors, doctor_schedules, doctor_reviews, consultants |
| Appointments & Meetings | appointments, meeting_records, meeting_transcripts, meeting_chats, meeting_invites, recording_share_tokens, appointment_ai_suggestions |
| Clinical | emr, emr_records, prescriptions, lab_orders, imaging_orders, patient_instructions, health_timeline |
| Content | medical_content, clinical_resources, icd10_codes, drugs |
| AI/Knowledge | notifications, knowledge_base, ai_chat_history, ai_chat_memory, transcript_embeddings, ai_document_analysis, cds_logs, ai_validations |
| Mobile/Sync | notification_preferences, user_settings, sync_queue, user_api_connections, api_connection_audit |
| Extended Clinical | ctm_assessments, geriatric_screenings, sos_alerts, follow_ups, nursing_tasks, predictive_analytics |
| Audit/Admin | audit_logs, access_audit, admin_actions |

See [DATABASE_TABLES_REFERENCE.md](../../Processes/DATABASE_TABLES_REFERENCE.md) for descriptions and workflow mapping.


## Notes

- Extensions required: uuid-ossp, pgcrypto, vector (pgvector)
- `izara-database.sql` is idempotent (safe to re-run)
- Always backup before running migrations in production
- Medical content categories use hyphenated format: `general-health`, `nutrition`, `exercise`, etc.
