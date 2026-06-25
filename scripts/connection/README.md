# Database connection guide

## Local standalone (multitask)

| Stream | pgAdmin host | Port | Database |
|--------|--------------|------|----------|
| Patient | localhost | **5434** | izara_phase1 |
| Doctor | localhost | **5435** | izara_phase1 |
| Meeting | localhost | **5436** | izara_phase1 |
| Platform full | localhost | **5433** | izara_phase1 |

Start only the stack you need:

```bash
cd Isara-patient-portal && docker compose -f docker-compose.standalone.yml up -d postgres
```

## Platform full compose

```bash
docker compose --env-file .env.docker --profile full up -d postgres
```

Default bind: `127.0.0.1:5433` (set `POSTGRES_PUBLISH=5433` in `.env.docker` for LAN pgAdmin).

## pgAdmin desktop

1. Add server → Host `localhost`, Port from table above
2. User `postgres`, password from `.env.docker` or standalone compose (`postgres`)

## SSH tunnel (production VM)

```bash
ssh -L 5432:127.0.0.1:5432 user@35.240.157.230
# pgAdmin → localhost:5432
```

## POSTGRES_PUBLISH

In `.env.docker`:

```env
POSTGRES_PUBLISH=5433   # listen 0.0.0.0:5433 for LAN pgAdmin
```

See `deploy/nginx/DEPLOYMENT.md` for Nginx + LAN hostnames.
