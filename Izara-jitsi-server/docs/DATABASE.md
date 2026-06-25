# Meeting Server Database

> **Generated:** 2026-06-25 · **Schema:** 5.1.0 · **Tables mapped:** 53
> **SSOT:** `scripts/database/izara-database.sql` · **Ownership:** `scripts/docs/table-ownership.json`
> **Reference:** [Processes/DATABASE_TABLES_REFERENCE.md](../../Processes/DATABASE_TABLES_REFERENCE.md)

Standalone Postgres: **127.0.0.1:5436** · App: **http://localhost:3020**

## Primary tables (this service owns writes)

| Table | Category | Notes |
|-------|----------|-------|
| `meeting_chats` | meeting | owner: meeting |
| `meeting_invites` | meeting | owner: meeting |
| `meeting_records` | meeting | owner: meeting |
| `meeting_transcripts` | meeting | owner: meeting |
| `recording_share_tokens` | meeting | owner: meeting |
| `transcript_embeddings` | ai | owner: meeting |

## Shared / cross-service read

| Table | Category | Notes |
|-------|----------|-------|
| `ai_chat_history` | ai | owner: shared |
| `ai_validations` | ai | owner: doctor |
| `appointments` | appointments | writes: patient |
| `audit_logs` | audit | owner: shared |
| `device_tokens` | auth | owner: shared |
| `emr` | clinical | owner: doctor |
| `icd10_codes` | reference | owner: shared |
| `notifications` | notifications | writes: doctor |
| `sessions` | auth | owner: shared |
| `users` | auth | owner: shared |

## LISTEN/NOTIFY (this service)

- `meeting_records`

Channel `data_changes` — see `scripts/database/v2.2.0-notify-triggers.sql`.

## Standalone init

```bash
docker compose -f docker-compose.standalone.yml up -d postgres
npm run db:init:standalone
npm run db:seed:standalone
```

Bundled SQL: `scripts/database/` via `npm run db:bundle:apps` (read-only; migrations only on platform).
