# Local Install Runbook

Quick path to run Izara on **Windows localhost** before full gates.

## Prerequisites

- Docker Desktop (WSL2 backend recommended)
- Node.js 22+
- Git clone: `Isara-Anywhere`

## 1. Environment

```powershell
cd Isara-Anywhere
copy .env.docker.example .env.docker
# Add GEMINI_API_KEY, JWT_SECRET, DB_PASSWORD in .env.docker
npm run env:sync
```

Portal copies: `Isara-doctor-portal/.env`, `Isara-patient-portal/.env`, `Izara-jitsi-server/.env` (from sync script).

## 2. Start stack

```powershell
docker compose --env-file .env.docker --profile full up -d --build
npm run docker:probe-health
npm run docker:meeting-api-smoke
```

| Service | URL |
|---------|-----|
| Patient portal | http://localhost:3005/login |
| Doctor portal | http://localhost:3010/login |
| Meeting server | http://127.0.0.1:3020 |
| Postgres | localhost:5433 |

## 3. Fast quality checks

```powershell
npm run phase:0
npm run test:guards:static
npm run test:unit:process-contracts
npm run sonar:lint
```

## 4. Full local gate (headed E2E + screenshots)

```powershell
$env:PW_HEADED='1'
$env:BASELINE_VISUAL='1'
$env:PW_SKIP_LIVE_GEMINI='1'
npm run test:local:pre-deploy-gate
npm run test:screenshots:global
```

## 5. Ubuntu LAN + Nginx

See [deploy/nginx/DEPLOYMENT.md](../../deploy/nginx/DEPLOYMENT.md) and [WINDOWS_CLIENT_SETUP.md](../../deploy/nginx/WINDOWS_CLIENT_SETUP.md).

After LAN deploy:

```powershell
npm run test:lan:deploy-gate
```

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| probe-health fails | `docker compose logs patient-portal doctor-portal meeting-server` |
| Meeting 502 | Check `VITE_MEETING_SERVER_URL=http://127.0.0.1:3020` in portal builds |
| E2E auth loop | `node -e "import('./scripts/docker/e2eDockerCommon.mjs').then(m=>m.resetDatabaseBaseline())"` |
| Identical screenshots | Jitsi did not mount — fix meeting host gate, re-run group-Q |

## Related

- [Processes/ENV_AND_STACK_CHECK.md](../../Processes/ENV_AND_STACK_CHECK.md)
- [Processes/PROCESS_TO_TEST_GATE.md](../../Processes/PROCESS_TO_TEST_GATE.md)
- [docs/SPLIT_REPOS.md](../SPLIT_REPOS.md)
