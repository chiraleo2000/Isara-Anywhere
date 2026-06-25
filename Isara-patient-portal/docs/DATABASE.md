# Patient Portal Database

> **Generated:** 2026-06-25 · **Schema:** 5.1.0 · **Tables mapped:** 53
> **SSOT:** `scripts/database/izara-database.sql` · **Ownership:** `scripts/docs/table-ownership.json`
> **Reference:** [Processes/DATABASE_TABLES_REFERENCE.md](../../Processes/DATABASE_TABLES_REFERENCE.md)

Standalone Postgres: **127.0.0.1:5434** · App: **http://localhost:3005**

## Primary tables (this service owns writes)

| Table | Category | Notes |
|-------|----------|-------|
| `living_will_versions` | patient | owner: patient |
| `living_wills` | patient | owner: patient |
| `notification_preferences` | preferences | owner: patient |
| `patient_consents` | patient | owner: patient |
| `patient_profiles` | patient | owner: patient |
| `phr` | patient | owner: patient |
| `push_subscriptions` | patient | owner: patient |
| `sos_alerts` | extended | owner: patient |
| `sync_queue` | sync | owner: patient |
| `vital_signs` | patient | owner: patient |

## Shared / cross-service read

| Table | Category | Notes |
|-------|----------|-------|
| `ai_chat_history` | ai | owner: shared |
| `ai_chat_memory` | ai | owner: shared |
| `ai_validations` | ai | owner: doctor |
| `api_connection_audit` | sync | owner: shared |
| `appointments` | appointments | writes: patient |
| `audit_logs` | audit | owner: shared |
| `biometric_credentials` | auth | owner: shared |
| `device_tokens` | auth | owner: shared |
| `doctor_profiles` | doctor | owner: doctor |
| `doctor_reviews` | doctor | writes: patient |
| `doctor_schedules` | doctor | owner: doctor |
| `doctors` | doctor | owner: doctor |
| `drugs` | reference | owner: shared |
| `emr` | clinical | owner: doctor |
| `emr_records` | clinical | owner: doctor |
| `follow_ups` | extended | owner: doctor |
| `icd10_codes` | reference | owner: shared |
| `imaging_orders` | clinical | owner: doctor |
| `lab_orders` | clinical | owner: doctor |
| `medical_content` | content | writes: doctor |
| `meeting_chats` | meeting | owner: meeting |
| `meeting_invites` | meeting | owner: meeting |
| `meeting_records` | meeting | owner: meeting |
| `meeting_transcripts` | meeting | owner: meeting |
| `notifications` | notifications | writes: doctor |
| `password_resets` | auth | owner: shared |
| `prescriptions` | clinical | owner: doctor |
| `recording_share_tokens` | meeting | owner: meeting |
| `refresh_tokens` | auth | owner: shared |
| `sessions` | auth | owner: shared |
| `user_api_connections` | sync | owner: shared |
| `user_settings` | preferences | owner: shared |
| `users` | auth | owner: shared |

## LISTEN/NOTIFY (this service)

- `sync_queue`

Channel `data_changes` — see `scripts/database/v2.2.0-notify-triggers.sql`.

## Standalone init

```bash
docker compose -f docker-compose.standalone.yml up -d postgres
npm run db:init:standalone
npm run db:seed:standalone
```

Bundled SQL: `scripts/database/` via `npm run db:bundle:apps` (read-only; migrations only on platform).
