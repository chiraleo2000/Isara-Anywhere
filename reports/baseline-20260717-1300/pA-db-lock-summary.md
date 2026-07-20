# Phase A DB lock summary
Baseline: 20260717-1300
- Removed DATABASE_URL from all Cloud Run --set-secrets
- Runtime prefers DB_HOST over DATABASE_URL
- database-url secret host = 35.240.157.230 (unused on Cloud Run)
- db-password synced to GCE password (Secret Manager v11+)
- Meeting --clear-cloudsql-instances added; live attachment cleared
