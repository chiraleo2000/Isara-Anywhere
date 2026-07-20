# Cloud Run helpers

Legacy per-service Cloud Build YAMLs and Dockerfiles were removed. Use the **root** orchestrator instead:

```powershell
npm run cloud:deploy -- -Tag v1.7.60
# or: scripts/deploy-cloud-from-env.ps1 -Tag v1.7.60
```

## Active script

| Script | npm |
| ------ | --- |
| `sync-meeting-ai-secrets.ps1` | `npm run cloud:sync-meeting-secrets` |

Syncs Google Speech / service-account secrets to the meeting server on Cloud Run after deploy.
