# Cloud cost baseline — dev-testing (2026-06-30)

## Cloud Run profile (all three services)

| Service | CPU | Memory | min | max | cpu-boost |
|---------|-----|--------|-----|-----|-----------|
| izara-patient-portal-dev-testing | 1 | 1Gi | **0** | **2** | off |
| izara-doctor-portal-dev-testing | 1 | 1Gi | **0** | **2** | off |
| izara-meeting-server-dev-testing | 1 | 1Gi | **0** | **2** | off |

**Source:** root `cloudbuild.yaml` + per-portal `Isara-*-portal/cloudbuild.yaml` + `Izara-jitsi-server/cloudbuild.yaml` — substitutions `_MIN_INSTANCES=0`, `_MAX_INSTANCES=2`.

## Post-deploy patch (no image rebuild)

```powershell
.\scripts\deploy\patch-cloud-run-cost.ps1 -MinInstances 0 -MaxInstances 2
```

Default params updated to min=0, max=2 (2026-06-30).

## GCE Postgres VM idle stop

When not running cloud E2E for several days:

```powershell
gcloud compute instances stop izara-postgres-dev-testing --zone=asia-southeast1-b --project=izara-telemedicine
# Resume before deploy/smoke:
gcloud compute instances start izara-postgres-dev-testing --zone=asia-southeast1-b --project=izara-telemedicine
```

## Teardown optional services

- **pgAdmin Cloud Run:** if deployed, remove with `gcloud run services delete <pgadmin-service> --region=asia-southeast1` to avoid stray min-instance charges.
- **Artifact Registry:** prune old tags periodically (`gcloud artifacts docker images list`).

## Deploy command (requires user approval)

```powershell
gcloud builds submit --config=cloudbuild.yaml --substitutions=_MIN_INSTANCES=0,_MAX_INSTANCES=2
```

**Status:** config committed locally; **deploy not run** in Round 6 (local gate green first).
