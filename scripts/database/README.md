# Izara Database Scripts

This folder contains all database-related scripts for the Izara Telemedicine platform.

## 📁 Folder Structure

```
scripts/database/
├── README.md                     # This file
├── izara-database.sql            # 🔥 UNIFIED database init (schema + seed data)
├── init-cloud-db.js              # @deprecated - Use cloud-db-tool.cjs
├── init-cloud-sql.js             # @deprecated - Use cloud-db-tool.cjs
├── seed-cloud-sql.js             # @deprecated - Use cloud-db-tool.cjs
├── test-cloud-db.js              # @deprecated - Use cloud-db-tool.cjs --verify
└── migrations/
    └── v1.4.3-fix-categories.sql # Category format fixes
```

## ⚠️ Deprecated Scripts

The following scripts are deprecated and will be removed in a future version.
Use the unified `scripts/cloud-db-tool.cjs` instead:

| Old Script | New Command |
|------------|-------------|
| `init-cloud-db.js` | `node scripts/cloud-db-tool.cjs --all` |
| `init-cloud-sql.js` | `node scripts/cloud-db-tool.cjs --all` |
| `seed-cloud-sql.js` | `node scripts/cloud-db-tool.cjs --all` |
| `test-cloud-db.js` | `node scripts/cloud-db-tool.cjs --verify` |

**Environment Variable Required:**

```powershell
$env:DB_PASSWORD = "your_password"
```

## 🚀 Quick Start

### Local Docker

```bash
# Initialize database (schema + seed data)
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/izara-database.sql

# Run migrations (if needed)
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/migrations/v1.4.3-fix-categories.sql
```

### PowerShell (Windows)

```powershell
# Initialize database
Get-Content scripts\database\izara-database.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1

# Run migrations
Get-Content scripts\database\migrations\v1.4.3-fix-categories.sql | docker exec -i izara-postgres psql -U postgres -d izara_phase1
```

> **Note:** This project uses PostgreSQL as a Docker service. Cloud SQL scripts require DB_PASSWORD environment variable.

## 📋 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Patient | <demo.test@gmail.com> | YOUR_TEST_PASSWORD |
| Patient | <Somchai.Mankong@gmail.com> | YOUR_TEST_PASSWORD |
| Patient | <Anan.Khayanrian@gmail.com> | YOUR_TEST_PASSWORD |
| Doctor | <doctor.test@izara.com> | YOUR_TEST_DOCTOR_PASSWORD |
| Admin | <admin.test@izara.com> | YOUR_TEST_ADMIN_PASSWORD |

## 📊 Database Overview

### Tables (24 total)

| Category | Tables |
|----------|--------|
| **Core Users** | users, sessions, password_resets |
| **Patient Data** | patient_profiles, phr, vital_signs, living_wills, living_will_versions, patient_consents |
| **Doctor Data** | doctor_profiles, doctors, doctor_schedules, doctor_reviews, consultants |
| **Appointments** | appointments, meeting_records, meeting_transcripts |
| **Clinical** | emr, prescriptions, lab_orders |
| **Content** | medical_content, clinical_resources, icd10_codes, drugs |
| **AI/Knowledge** | notifications, knowledge_base, ai_chat_history, ai_document_analysis, cds_logs, ai_validations |
| **Audit** | audit_logs |

### Medical Content Categories

Frontend uses hyphenated format for filters:

- `general-health`, `nutrition`, `exercise`, `mental-health`
- `chronic-disease`, `preventive-care`, `medications`, `first-aid`

## 🔄 Migration Guidelines

1. Create new migration file: `migrations/vX.Y.Z-description.sql`
2. Include rollback instructions as comments
3. Test on local Docker first
4. Apply to PostgreSQL Docker container in production

## ⚠️ Important Notes

- Always backup before running migrations in production
- The `izara-database.sql` file is idempotent (safe to re-run)
- Extensions required: uuid-ossp, pgcrypto, vector (pgvector)
- **NO Cloud SQL used** - PostgreSQL runs as Docker service


