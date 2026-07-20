# Cloud Demo Data Cleanup

**Date:** 2026-07-17  
**Baseline:** `20260717-1300`  
**Command:** `npm run cleanup:cloud-test-only`  
**Status:** PASS (exit 0)  
**Reseed:** NO

## Target (mandatory)

| Field | Value |
|-------|-------|
| Host | `35.240.157.230` |
| Port | `5432` |
| Database | `izara_phase1` |
| SSL | `DB_SSL=false` |
| Kind | **GCE VM PostgreSQL — not Cloud SQL** |
| Password | Secret Manager `db-password` → `CLOUD_DB_PASSWORD` |

## Evidence

- Log: `reports/baseline-20260717-1300/p3-cleanup-cloud.txt`
- Console printed: `Target: GCE VM PostgreSQL 35.240.157.230:5432/izara_phase1 (not Cloud SQL)`
- `cleanup-test-data.sql` applied; seed users/doctors/MC/CR retained
