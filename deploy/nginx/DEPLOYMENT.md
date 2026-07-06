# Izara LAN deployment (Docker + Nginx)

Single guide for **localhost**, **LAN HTTP**, and **LAN HTTPS**.

## Files

| File | Purpose |
| ---- | ------- |
| [deploy.sh](deploy.sh) | Full deploy: Docker + Nginx + TLS + verify |
| [compose.sh](compose.sh) | Docker Compose wrapper (V2 or V1) |
| [diagnose.sh](diagnose.sh) | Troubleshoot 502 / wrong portal / login |
| [isara-nginx.conf](isara-nginx.conf) | HTTPS reverse proxy |
| [isara-nginx-http.conf](isara-nginx-http.conf) | HTTP reverse proxy (`--http`) |
| [PGADMIN_LAN_ACCESS_TH.md](PGADMIN_LAN_ACCESS_TH.md) | pgAdmin LAN (Thai) |
| [PGADMIN_DESKTOP_WINDOWS.md](PGADMIN_DESKTOP_WINDOWS.md) | **pgAdmin 4 Windows app** → Postgres on Ubuntu (no browser) |
| [WINDOWS_CLIENT_SETUP.md](WINDOWS_CLIENT_SETUP.md) | **Windows PC** — hosts file + trust mkcert for `*.demotoday.net` |

Env templates (repo root): `.env.docker.example` · `.env.docker.lan.example` · `.env.docker.lan.https.example`

---

## Mode A — Localhost (Windows / dev)

```bash
cp .env.docker.example .env.docker
bash deploy/nginx/compose.sh --env-file .env.docker up -d --build
```

- Patient: http://localhost:3005/login  
- Doctor: http://localhost:3010/login  

### PostgreSQL data volume

Set **`POSTGRES_DATA_DIR`** in `.env.docker` to persist the database on the host instead of an opaque Docker named volume.

| Environment | Typical `POSTGRES_DATA_DIR` |
| ----------- | --------------------------- |
| Windows / dev | `./data/postgres` |
| Ubuntu LAN (`192.168.x.x`) | `/var/lib/izara/postgres` |
| Default (omit variable) | Docker named volume `postgres_data` |

**Windows (your PC):**

```powershell
# In .env.docker:
POSTGRES_DATA_DIR=./data/postgres

mkdir data\postgres
docker compose --env-file .env.docker up -d postgres
```

Data files appear under `Isara-Anywhere\data\postgres\`.

**Ubuntu server (e.g. 192.168.10.239):**

```bash
sudo mkdir -p /var/lib/izara/postgres
sudo chown 999:999 /var/lib/izara/postgres   # postgres image runs as uid 999

# In .env.docker:
POSTGRES_DATA_DIR=/var/lib/izara/postgres

docker compose --env-file .env.docker up -d postgres
```

**Migrate from old named volume** (if you already had `postgres_data`):

```bash
docker compose --env-file .env.docker down
mkdir -p ./data/postgres   # or /var/lib/izara/postgres on Ubuntu
docker run --rm \
  -v isara-anywhere_postgres_data:/from \
  -v "$(pwd)/data/postgres:/to" \
  alpine sh -c "cp -a /from/. /to/"
# Then set POSTGRES_DATA_DIR and docker compose up -d
```

> Init SQL under `scripts/database/` runs only on **first** empty data directory. Existing data is kept on restart.

---

## Mode B/C — Ubuntu LAN (HTTP or HTTPS)

### 1. Server prerequisites

- Ubuntu with Docker (user in `docker` group)
- Nginx: `sudo apt install nginx`
- Git clone: `~/Isara-Anywhere`

### 2. Environment

```bash
cd ~/Isara-Anywhere
cp .env.docker.lan.https.example .env.docker
nano .env.docker   # JWT_SECRET, API keys
```

**pgAdmin 4 on Windows (desktop app, not browser):** set `POSTGRES_PUBLISH=5433` in `.env.docker`, restart postgres, connect to `192.168.x.x:5433`. See [PGADMIN_DESKTOP_WINDOWS.md](PGADMIN_DESKTOP_WINDOWS.md).

### 3. Deploy (HTTPS — recommended)

```bash
bash deploy/nginx/deploy.sh
```

HTTP only (no camera/OAuth TLS):

```bash
bash deploy/nginx/deploy.sh --http
```

Options: `--skip-build` · `--docker-only` · `--pull` · `--prune` · `--diagnose`

### 4. Client hosts file (Windows)

On every Windows PC on the LAN, add to `C:\Windows\System32\drivers\etc\hosts` (Notepad **as Administrator**):

```text
192.168.10.239   patient.demotoday.net doctor.demotoday.net meeting.demotoday.net meet.demotoday.net dbadmin.demotoday.net
```

Full steps: [WINDOWS_CLIENT_SETUP.md](WINDOWS_CLIENT_SETUP.md)

### 5. URLs & demo users

| Portal | HTTPS URL | Login |
| ------ | --------- | ----- |
| Patient | https://patient.demotoday.net/login | `demo.test@gmail.com` / `P@ssw0rd` |
| Doctor | https://doctor.demotoday.net/login | `admin.test@izara.com` / `IzaraAdmin@2024` |
| Meeting | https://meeting.demotoday.net/health | API |
| Jitsi | https://meet.demotoday.net | Video (via join-config) |
| pgAdmin | https://dbadmin.demotoday.net | see `.env.docker` |

**Jitsi + meeting API:** [Documents/docs/markdown/operations/JITSI_MEETING_DEMOTODAY_API.md](../../Documents/docs/markdown/operations/JITSI_MEETING_DEMOTODAY_API.md)

### 6. Trust TLS on client PCs

Copy mkcert root CA from server (`mkcert -CAROOT` → `rootCA.pem`) and install on Windows/macOS, or run `mkcert -install` on each client.

### 7. Verify

```bash
bash scripts/docker/verify-stack.sh
bash deploy/nginx/diagnose.sh
```

**Windows dev — parallel pre-deploy gate (before promoting LAN):**

```powershell
cd Isara-Anywhere
$env:GATE_SKIP_DOCKER_BUILD='1'
$env:PW_HEADED='1'
$env:BASELINE_VISUAL='1'
npm run phase:9:parallel
npm run docs:evidence:local
```

Uses `PW_WORKERS=2` for headed E2E (groups B/C/G/H/I/J in parallel; D→Q→E→F serial). `PW_NO_CHROME=1` — your daily Chrome is not used.

**`diagnose.sh` expectations (Ubuntu LAN):**

| Section | Check | PASS |
| ------- | ----- | ---- |
| 5–6 | Login smokes (doctor + patient) | HTTP 200 |
| 7 | Nginx error log tail | Recent lines or empty (no repeating upstream errors) |
| 8 | Socket.IO via `meeting.demotoday.net` | `PASS meeting Socket.IO polling → HTTP 200` or `400` (400 = handshake without sid is OK) |

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| 502 Bad Gateway | `bash deploy/nginx/diagnose.sh` — Docker not on :3005/:3010 |
| Doctor URL shows patient login | Wrong nginx `server_name` — run `bash deploy/nginx/deploy.sh` |
| **ERR_CERT_DATE_INVALID** (Chrome/Edge) | `bash deploy/nginx/fix-tls.sh` on Ubuntu; sync Windows clock; install mkcert CA — [WINDOWS_CLIENT_SETUP.md](WINDOWS_CLIENT_SETUP.md) |
| ERR_CERT_AUTHORITY_INVALID | Install `deploy/nginx/isara-mkcert-rootCA.pem` on Windows (`install-mkcert-ca-windows.ps1`) |
| Login 401/500 CORS | `CORS_ORIGINS` must include `https://doctor.demotoday.net` |
| `vite: Permission denied` on build | Use root `.dockerignore`; do not copy Windows `node_modules` |
| Postgres auth failed | `POSTGRES_PASSWORD=postgres` in `.env.docker`; redeploy |
| CRLF on scripts | `sed -i 's/\r$//' deploy/nginx/*.sh` |

---

## Manual compose (without full deploy)

```bash
bash deploy/nginx/compose.sh --env-file .env.docker up -d --build
sudo cp deploy/nginx/isara-nginx.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

*Izara v1.7.53*
