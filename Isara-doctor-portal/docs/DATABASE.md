# Doctor Portal Database

> **Generated:** 2026-06-25 · **Schema:** 5.1.0 · **Tables mapped:** 53
> **SSOT:** `scripts/database/izara-database.sql` · **Ownership:** `scripts/docs/table-ownership.json`
> **Reference:** [Processes/DATABASE_TABLES_REFERENCE.md](../../Processes/DATABASE_TABLES_REFERENCE.md)

Standalone Postgres: **127.0.0.1:5435** · App: **http://localhost:3010**

## Primary tables (this service owns writes)

| Table | Category | Notes |
|-------|----------|-------|
| `ai_document_analysis` | ai | owner: doctor |
| `ai_validations` | ai | owner: doctor |
| `cds_logs` | ai | owner: doctor |
| `clinical_resources` | content | owner: doctor |
| `consultants` | doctor | owner: doctor |
| `ctm_assessments` | extended | owner: doctor |
| `doctor_profiles` | doctor | owner: doctor |
| `doctor_schedules` | doctor | owner: doctor |
| `doctors` | doctor | owner: doctor |
| `emr` | clinical | owner: doctor |
| `emr_records` | clinical | owner: doctor |
| `follow_ups` | extended | owner: doctor |
| `geriatric_screenings` | extended | owner: doctor |
| `imaging_orders` | clinical | owner: doctor |
| `knowledge_base` | ai | owner: doctor |
| `lab_orders` | clinical | owner: doctor |
| `nursing_tasks` | extended | owner: doctor |
| `predictive_analytics` | extended | owner: doctor |
| `prescriptions` | clinical | owner: doctor |

## Shared / cross-service read

| Table | Category | Notes |
|-------|----------|-------|
| `ai_chat_history` | ai | owner: shared |
| `ai_chat_memory` | ai | owner: shared |
| `api_connection_audit` | sync | owner: shared |
| `appointments` | appointments | writes: patient |
| `audit_logs` | audit | owner: shared |
| `biometric_credentials` | auth | owner: shared |
| `device_tokens` | auth | owner: shared |
| `doctor_reviews` | doctor | writes: patient |
| `drugs` | reference | owner: shared |
| `icd10_codes` | reference | owner: shared |
| `living_will_versions` | patient | owner: patient |
| `living_wills` | patient | owner: patient |
| `medical_content` | content | writes: doctor |
| `meeting_chats` | meeting | owner: meeting |
| `meeting_invites` | meeting | owner: meeting |
| `meeting_records` | meeting | owner: meeting |
| `meeting_transcripts` | meeting | owner: meeting |
| `notifications` | notifications | writes: doctor |
| `password_resets` | auth | owner: shared |
| `patient_consents` | patient | owner: patient |
| `patient_profiles` | patient | owner: patient |
| `phr` | patient | owner: patient |
| `recording_share_tokens` | meeting | owner: meeting |
| `refresh_tokens` | auth | owner: shared |
| `sessions` | auth | owner: shared |
| `sos_alerts` | extended | owner: patient |
| `transcript_embeddings` | ai | owner: meeting |
| `user_api_connections` | sync | owner: shared |
| `user_settings` | preferences | owner: shared |
| `users` | auth | owner: shared |
| `vital_signs` | patient | owner: patient |

## LISTEN/NOTIFY (this service)

- `appointments`
- `notifications`

Channel `data_changes` — see `scripts/database/v2.2.0-notify-triggers.sql`.

## Standalone init

```bash
docker compose -f docker-compose.standalone.yml up -d postgres
npm run db:init:standalone
npm run db:seed:standalone
```

Bundled SQL: `scripts/database/` via `npm run db:bundle:apps` (read-only; migrations only on platform).
