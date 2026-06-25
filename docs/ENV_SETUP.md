# Environment setup — all portals

One canonical file drives local secrets: **`.env.docker`** (gitignored).  
Portal `.env` files are generated from it.

## Quick setup

```powershell
# 1. Canonical Docker env (if not already)
cp .env.docker.example .env.docker
# Edit API keys, JWT_SECRET, POSTGRES_PASSWORD

# 2. Sync all portal .env files
npm run env:sync

# 3. Postgres (Docker) — only DB required for npm dev
docker compose --env-file .env.docker up -d postgres

# 4. Run each portal (separate terminals)
cd Isara-patient-portal && npm run dev:all    # :3005 UI, :3004 API
cd Isara-doctor-portal && npm run dev         # :3010 UI, :3011 auth, :3009 API
cd Izara-jitsi-server && npm run dev          # :3020
```

## Files

| File | Purpose |
|------|---------|
| `.env.docker` | Docker Compose + single source of truth for secrets |
| `.env.docker.example` | Localhost Docker template |
| `.env.docker.lan.example` | Ubuntu LAN template |
| `Isara-patient-portal/.env` | npm dev patient (generated) |
| `Isara-doctor-portal/.env` | npm dev doctor (generated) |
| `Izara-jitsi-server/.env` | npm dev meeting (generated) |
| `.env` | Root Vitest / Playwright (generated) |

## Must match across all services

| Variable | Notes |
|----------|--------|
| `JWT_SECRET` | Same on patient, doctor, meeting — or sessions break |
| `DB_PASSWORD` / `POSTGRES_PASSWORD` | Same value; npm dev uses `localhost:5433` |
| `GEMINI_API_KEY` | Shared for AI features |
| `GOOGLE_CLIENT_ID` | SSO (optional) |

## Patient npm dev port trap

| Service | Port |
|---------|------|
| Vite UI | **3005** |
| Express API | **3004** (`PORT=3004` in patient `.env`) |

Do **not** set patient `PORT=3005` when using `npm run dev:all`.

## Ubuntu LAN (optional)

Use `.env.docker.lan.example` → `.env.docker` on the server.  
Browser URLs use `*.isara.local`; npm dev on a laptop still uses `npm run env:sync` with localhost ports.

## Re-sync after changing secrets

```powershell
npm run env:sync
```

Dry-run:

```powershell
npm run env:sync:dry
```

## Audit doctor portal keys

```powershell
npm run env:audit
```
