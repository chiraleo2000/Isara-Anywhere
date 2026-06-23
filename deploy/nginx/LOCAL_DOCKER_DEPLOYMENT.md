# Izara — Local Docker Compose Deployment

![Docker](https://img.shields.io/badge/docker-compose-ready-blue.svg)
![Nginx](https://img.shields.io/badge/nginx-LAN%20optional-green.svg)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue.svg)

Run the full Izara stack with **default demo users and sample data** pre-loaded.

This guide covers **two access modes**:

| Mode | Best for | How you open portals |
| ---- | -------- | -------------------- |
| **A — Direct (localhost)** | Dev on one PC (Windows/Mac/Linux) | `http://localhost:3005` |
| **B — Ubuntu + Nginx (LAN HTTP)** | Server on network; many PCs connect | `http://patient.isara.local` |
| **C — Ubuntu + Nginx (LAN HTTPS)** | LAN + camera/mic / OAuth / no mixed content | `https://patient.isara.local` |

**Files in this folder**

| File | Purpose |
| ---- | ------- |
| [LOCAL_DOCKER_DEPLOYMENT.md](LOCAL_DOCKER_DEPLOYMENT.md) | This guide (Modes A & B) |
| [UBUNTU_HTTPS_DEPLOYMENT.md](UBUNTU_HTTPS_DEPLOYMENT.md) | **Mode C — TLS on Ubuntu** |
| [UBUNTU_MANUAL_REDEPLOY.txt](UBUNTU_MANUAL_REDEPLOY.txt) | Copy-paste redeploy (HTTP) |
| [isara-system.conf](isara-system.conf) | Nginx HTTP reverse-proxy (Mode B) |
| [isara-system-https.conf](isara-system-https.conf) | Nginx HTTPS reverse-proxy (Mode C) |
| [diagnose-502.sh](diagnose-502.sh) | 502 troubleshooting script (Mode B) |

**See also:** [README.md](../../README.md) · [URLs & demo users](../../Documents/docs/markdown/operations/URLS_AND_DEFAULT_USERS.md) · [.env.docker.lan.example](../../.env.docker.lan.example) · [.env.docker.lan.https.example](../../.env.docker.lan.https.example)

---

## What you get

| Component | Port (host) | Description |
| --------- | ----------- | ----------- |
| **Patient Portal** | 3005 | React + Express — booking, PHR, video |
| **Doctor Portal** | 3010 | React + Express — EMR, queue, admin |
| **Meeting Server** | 3020 | Jitsi, transcription, AI summaries |
| **PostgreSQL 18** | 5433 | Primary DB (pgvector) |
| **pgAdmin** | 5050 | Database UI |
| **Demo data** | — | Auto-seeded on first database start |

In **Mode B**, app ports bind to `127.0.0.1` only; LAN clients use Nginx on port **80**.

---

## Prerequisites

- **Docker** — [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Ubuntu)
- **Git**
- **Mode B only:** Ubuntu server + [Nginx](https://nginx.org/)
- Node.js **≥ 22** (optional — for `npm run seed` only)

---

# Mode A — Direct localhost (single PC)

Use when Docker runs on the same machine as your browser.

## Quick start

```bash
git clone https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere

cp .env.docker.example .env.docker
# Edit .env.docker — see Required environment keys below

docker compose up -d --build
```

**Windows (PowerShell):**

```powershell
copy .env.docker.example .env.docker
docker compose up -d --build
```

First run may take **5–15 minutes** (build + DB init).

## Access URLs (Mode A)

| Service | URL |
| ------- | --- |
| **Patient login** | http://localhost:3005/login |
| **Patient app** | http://localhost:3005 |
| **Doctor / Admin login** | http://localhost:3010/login |
| **Doctor app** | http://localhost:3010 |
| **Meeting server** | http://localhost:3020 |
| **Meeting health** | http://localhost:3020/health |
| **PostgreSQL** | `localhost:5433` |
| **pgAdmin** | http://localhost:5050 |

No `hosts` file changes needed.

---

# Mode B — Ubuntu server + Nginx (LAN / multiple PCs)

Use when Docker runs on an **Ubuntu server** (e.g. `192.168.10.107`) and browsers on **other PCs** (Windows, Mac, Linux) connect over the network.

## Architecture

```text
  Client PC (browser)                 Ubuntu server
  ───────────────────                 ───────────────
  hosts file maps:              ──►   Nginx :80
    patient.isara.local               ├── patient.isara.local  → 127.0.0.1:3005
    doctor.isara.local                ├── doctor.isara.local   → 127.0.0.1:3010
    meeting.isara.local               ├── meeting.isara.local  → 127.0.0.1:3020
    dbadmin.isara.local               └── dbadmin.isara.local  → 127.0.0.1:5050

                                      Docker network: izara-postgres :5432
```

## Access URLs (Mode B)

Replace `192.168.10.107` with your server IP when editing `hosts`.

| Service | URL | Demo login |
| ------- | --- | ---------- |
| **Patient** | http://patient.isara.local/login | `demo.test@gmail.com` / `P@ssw0rd` |
| **Doctor** | http://doctor.isara.local/login | `doctor.test@izara.com` / `IzaraDoctor@2024` |
| **Admin** | http://doctor.isara.local/login | `admin.test@izara.com` / `IzaraAdmin@2024` |
| **Meeting** | http://meeting.isara.local/health | API / health |
| **pgAdmin** | http://dbadmin.isara.local | `admin@izara.com` / see `.env.docker` |

**On the Ubuntu server itself** (SSH), backends are also reachable at:

```bash
curl http://127.0.0.1:3005/health
curl http://127.0.0.1:3010/health
curl http://127.0.0.1:3020/health
```

---

## Step 1 — Ubuntu: install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in for docker group
```

```bash
git clone https://github.com/chiraleo2000/Isara-Anywhere.git
cd Isara-Anywhere
```

---

## Step 2 — Configure `.env.docker` (LAN)

```bash
cp .env.docker.lan.example .env.docker
nano .env.docker
```

| Variable | Example (Mode B) |
| -------- | ---------------- |
| `POSTGRES_PASSWORD` | Strong password |
| `JWT_SECRET` | Output of `openssl rand -hex 32` (≥ 32 chars) |
| `GEMINI_API_KEY` | `xxxxx` (boot without AI) |
| `VITE_GEMINI_API_KEY` | `xxxxx` |
| `VITE_MEETING_SERVER_URL` | `http://meeting.isara.local` |
| `CORS_ORIGINS` | `http://patient.isara.local,http://doctor.isara.local,http://meeting.isara.local` |

> `VITE_MEETING_SERVER_URL` is baked in at **build** time. After changing it: `docker compose up -d --build`.

---

## Step 3 — Start Docker Compose

```bash
docker compose up -d --build
docker compose ps
```

All services should show **Up**. Wait 2–5 minutes on first build, then verify:

```bash
curl -s http://127.0.0.1:3005/health
curl -s http://127.0.0.1:3010/health
curl -s http://127.0.0.1:3020/health
```

If any `curl` returns **Connection refused**, fix Docker before Nginx (see [502 troubleshooting](#502-bad-gateway-nginx)).

---

## Step 4 — Install Nginx (Ubuntu server)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx

sudo cp deploy/nginx/isara-system.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx

# If UFW firewall is enabled:
sudo ufw allow 80/tcp
```

Config includes **WebSocket** headers for Socket.IO on patient, doctor, and meeting servers.

---

## Step 5 — Configure `hosts` on each client PC

The domain `isara.local` is **not** on the public internet. Every PC that opens the portals needs a `hosts` entry pointing to your **Ubuntu server IP**.

### Windows

1. Open **Notepad as Administrator**
2. **File → Open** → `C:\Windows\System32\drivers\etc\`
3. Set file filter to **All Files (*.*)**
4. Open `hosts`
5. Add at the bottom (use your server IP):

```text
192.168.10.107   patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local
```

6. **Save** (`Ctrl+S`) and close
7. Optional: `ipconfig /flushdns` in PowerShell

### macOS / Linux client

```bash
sudo nano /etc/hosts
```

Add the same line:

```text
192.168.10.107   patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local
```

Save and exit.

### Multiple PCs on the LAN

Repeat the `hosts` step on **every** machine that will browse the portals. The entry is **per computer**, not on the server.

### Test from client PC

- http://patient.isara.local/login
- http://doctor.isara.local/login
- http://meeting.isara.local/health

---

## How services connect (Mode B)

| Connection | Address |
| ---------- | ------- |
| Browser → Patient/Doctor API | Same origin (`patient.isara.local` / `doctor.isara.local`) |
| Browser → Meeting Server | `http://meeting.isara.local` |
| Portal container → Postgres | `postgres:5432` (Docker network) |
| Portal container → Meeting Server | `http://meeting-server:3020` |
| Nginx → Docker apps | `127.0.0.1:3005`, `:3010`, `:3020`, `:5050` |

Docker and Nginx must run on the **same Ubuntu host**.

---

# Default login accounts

| Role | Mode A URL | Mode B URL | Email | Password |
| ---- | ---------- | ---------- | ----- | -------- |
| Patient (primary) | http://localhost:3005/login | http://patient.isara.local/login | `demo.test@gmail.com` | `P@ssw0rd` |
| Patient | ↑ | ↑ | `Somchai.Mankong@gmail.com` | `P@ssw0rd` |
| Patient | ↑ | ↑ | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` |
| Doctor (HOST) | http://localhost:3010/login | http://doctor.isara.local/login | `doctor.test@izara.com` | `IzaraDoctor@2024` |
| Admin | ↑ | ↑ | `admin.test@izara.com` | `IzaraAdmin@2024` |
| Doctor (cardiology) | ↑ | ↑ | `somchai.prasert@izara.com` | `IzaraDoctor@2024` |
| Doctor (endocrinology) | ↑ | ↑ | `siriporn.thongchai@izara.com` | `IzaraDoctor@2024` |
| Doctor (pending) | ↑ | ↑ | `pending.doctor@izara.com` | `IzaraDoctor@2024` |

**Google SSO:** set `VITE_GOOGLE_CLIENT_ID` in `.env.docker`. SSO email must match a registered account.

**Do not use demo passwords in production.**

---

# Default seeded data

On **first** PostgreSQL startup, Docker runs:

1. `scripts/database/izara-database.sql` — schema  
2. Migration SQL files  
3. `scripts/database/seed-dev-data.sql` — demo users and sample data  

Seed is idempotent but only auto-runs on a **new** database volume.

### Users and profiles

- **3 patients** with profiles (demographics, emergency contact, insurance)
- **4 doctors** (3 approved + 1 pending admin approval)
- **1 admin** (super-admin)

### Clinical data

- **PHR records** for all 3 patients
- **Vital signs** for each patient
- **Doctor schedules** for `DOC-TEST-001` (Mon–Fri 09:00–17:00)

### Sample appointments

| ID | Patient | Doctor | Status |
| -- | ------- | ------ | ------ |
| `APT-SEED-001` | Somchai | Dr. Test | `confirmed` (today, Jitsi room) |
| `APT-SEED-002` | Anan | Dr. Test | `confirmed` (today) |
| `APT-SEED-003` | Demo | Dr. Test | `pending` (tomorrow) |
| `APT-SEED-004` | Somchai | Dr. Somchai | `awaiting_doctor_response` |

### Other

- Notifications (appointments, pending doctor)
- 3 consultants (nephrology, oncology, cardiology)

---

# Required environment keys (`.env.docker`)

| Variable | Purpose | Required |
| -------- | ------- | -------- |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Auth — **≥ 32 chars** (`openssl rand -hex 32`) | Yes |
| `GEMINI_API_KEY` | Meeting AI — `xxxxx` to disable | Yes |
| `VITE_GEMINI_API_KEY` | Portal AI UI — `xxxxx` to disable | Yes |
| `VITE_MEETING_SERVER_URL` | Browser meeting URL (Mode B: `http://meeting.isara.local`) | Mode B |
| `CORS_ORIGINS` | Comma-separated portal origins (Mode B) | Mode B |
| `VITE_GOOGLE_MAPS_API_KEY` | Healthcare map | Optional |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In | Optional |

**Templates**

- Mode A: `.env.docker.example`
- Mode B: `.env.docker.lan.example`

---

# Database connection

| Setting | Mode A | Mode B (จาก Windows บน LAN) |
| ------- | ------ | --------------------------- |
| Host | `localhost` | ใช้ **pgAdmin** → [PGADMIN_LAN_ACCESS_TH.md](PGADMIN_LAN_ACCESS_TH.md) หรือ SSH tunnel |
| Port | `5433` | SSH tunnel: `5433` → `127.0.0.1:5433` |
| Database | `izara_phase1` | `izara_phase1` |
| User | `postgres` | `postgres` |
| Password | `.env.docker` → `POSTGRES_PASSWORD` | same |

> Postgres bind ที่ `127.0.0.1:5433` บน Ubuntu — PC อื่นใน LAN เข้าตรงด้วย IP ไม่ได้ (ใช้ pgAdmin หรือ SSH tunnel)

### pgAdmin

| Setting | Default |
| ------- | ------- |
| Mode A URL | http://localhost:5050 |
| Mode B URL | http://dbadmin.isara.local |
| Login email | `admin@izara.com` |
| Login password | `PGADMIN_DEFAULT_PASSWORD` in `.env.docker` |

**Mode B (Windows บน LAN):** คู่มือภาษาไทยฉบับเต็ม → [PGADMIN_LAN_ACCESS_TH.md](PGADMIN_LAN_ACCESS_TH.md)  
Register Server ใน pgAdmin: Host **`postgres`**, Port **`5432`** (ไม่ใช่ `localhost` หรือ IP server)

---

# Docker commands

```bash
docker compose up -d --build    # build and start
docker compose logs -f          # follow all logs
docker compose logs -f patient-portal
docker compose ps               # status
docker compose down             # stop (keep data)
docker compose down -v          # stop + wipe DB (re-seed on next up)
```

### Health checks

```bash
npm run docker:probe-health
npm run verify:gate0:local
```

### Re-seed without wiping

```bash
npm run seed
npm run seed:all
```

---

# Redeploy (existing Ubuntu server)

Use this when Mode B is **already running** and you need to pull code, rebuild images, or refresh config **without** wiping the database volume.

## On the Ubuntu server (SSH)

```bash
cd ~/Isara-Anywhere

# 1. Pull latest code
git pull

# 2. Review env — do NOT blindly overwrite .env.docker
diff -u .env.docker .env.docker.lan.example || true

# 3. Rebuild and restart (keeps postgres volume)
#    Use compose.sh — works with both "docker compose" (V2) and "docker-compose" (V1)
bash deploy/nginx/compose.sh --env-file .env.docker down
bash deploy/nginx/compose.sh --env-file .env.docker up -d --build
bash deploy/nginx/compose.sh ps

# 4. Wait for health
sleep 30
curl -s http://127.0.0.1:3005/health
curl -s http://127.0.0.1:3010/health
curl -s http://127.0.0.1:3020/health

# 5. Run LAN diagnostic (login smokes + Socket.IO) — use bash, NOT sudo bash
bash deploy/nginx/diagnose-502.sh

# 6. Reload Nginx only if isara-system.conf changed
sudo cp deploy/nginx/isara-system.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo nginx -t && sudo systemctl reload nginx
```

> **Do not** run `sudo docker compose` — many Ubuntu installs only have `docker-compose` (hyphen), and `sudo` can hide the compose plugin from your user PATH. Use `bash deploy/nginx/compose.sh` as your normal user (in the `docker` group).

### If `docker compose` is not installed

```bash
# Option A — Docker Compose V2 plugin (recommended)
sudo apt update
sudo apt install -y docker-compose-plugin
docker compose version

# Option B — standalone docker-compose (V1)
sudo apt install -y docker-compose
docker-compose --version
```

After install, retry step 3 with `bash deploy/nginx/compose.sh`.

### If `diagnose-502.sh` fails with `set: pipefail: invalid option`

The script was saved with Windows line endings (CRLF). On the server:

```bash
cd ~/Isara-Anywhere
git pull
sed -i 's/\r$//' deploy/nginx/diagnose-502.sh deploy/nginx/compose.sh
bash deploy/nginx/diagnose-502.sh
```

## On each LAN client PC

No change needed unless the **server IP** changed — update `hosts` entries only then.

Test from a **second machine** on the same subnet (not localhost on the server):

- http://patient.isara.local/login
- http://doctor.isara.local/login
- http://meeting.isara.local/health

## Optional — headed E2E subset on LAN

After `npm run test:local:pre-deploy-gate` passes on localhost, validate the critical meeting path on LAN hostnames:

```bash
export PATIENT_URL=http://patient.isara.local
export DOCTOR_URL=http://doctor.isara.local
export MEETING_URL=http://meeting.isara.local
npx playwright test --headed --workers=1 \
  --project=Q-meeting-lifecycle \
  --project=R-jitsi-role-permissions \
  --project=B-patient-portal
npm run ledger:local -- --round lan
```

**LAN-specific checks:** mixed content (HTTPS page → HTTP meeting), Private Network Access blocks, `VITE_MEETING_SERVER_URL=http://meeting.isara.local` (patient `env-config.js` runtime injection avoids rebuild when only URL changes).

---

# Troubleshooting

## 502 Bad Gateway (Nginx)

Log example:

```text
connect() failed (111: Connection refused) while connecting to upstream
upstream: "http://127.0.0.1:3005/..."
```

**Meaning:** Nginx is fine; Docker is not listening on that port on the Ubuntu server.

**On the Ubuntu server (SSH):**

```bash
cd ~/Isara-Anywhere
bash deploy/nginx/diagnose-502.sh
```

Or manually:

```bash
docker compose ps
ss -tlnp | grep -E '3005|3010|3020|5050'
curl -v http://127.0.0.1:3005/health
sudo tail -20 /var/log/nginx/error.log
```

| Cause | Fix |
| ----- | --- |
| Docker not started | `bash deploy/nginx/compose.sh --env-file .env.docker up -d --build` |
| **Build failed** (`vite: Permission denied`) | `git pull` (root `.dockerignore` + Dockerfile fix), then rebuild — see below |
| **Disk full** (`No space left on device`) | Free disk first — see below |
| Missing `.env.docker` / bad `JWT_SECRET` | Fix `.env.docker`, then rebuild |
| Docker on Windows, Nginx on Ubuntu | Run Docker on the **same** machine as Nginx |
| First build still running | Wait; `docker compose logs -f patient-portal` |

## Docker build: `vite: Permission denied` (exit 126)

**Cause:** Host `node_modules` (from Windows) was copied into the image because the repo-root `.dockerignore` was missing. Linux cannot execute `node_modules/.bin/vite`.

**Fix (on Ubuntu):**

```bash
cd ~/Isara-Anywhere
git pull
sed -i 's/\r$//' deploy/nginx/*.sh
bash deploy/nginx/redeploy-full.sh --prune-docker --pull
```

## Disk full (`No space left on device`)

Nginx and Docker builds fail when `/` is full. On the Ubuntu server:

```bash
df -h /
docker system df
docker system prune -af
docker builder prune -af
sudo truncate -s 0 /var/log/nginx/access.log /var/log/nginx/error.log
sudo journalctl --vacuum-size=200M
```

Then redeploy:

```bash
bash deploy/nginx/redeploy-full.sh --prune-docker --pull
```

## Other issues

| Problem | Fix |
| ------- | --- |
| Login fails / no demo users | `docker compose down -v && docker compose up -d --build` |
| Port already in use | Free 3005, 3010, 3020, 5433, 5050 |
| Page loads but API/CORS errors (Mode B) | Add LAN URLs to `CORS_ORIGINS`, rebuild |
| Video/meeting errors (Mode B) | `VITE_MEETING_SERVER_URL=http://meeting.isara.local`, rebuild |
| Domain not found on client | Fix `hosts` file (Admin Notepad on Windows) |
| Works on server, not other PCs | Each client needs its own `hosts` entry |

## Login returns 500 / "An error occurred" (Mode B)

**Symptom:** Browser login at `http://doctor.isara.local/login` fails with HTTP 500 and `{"code":"INTERNAL_ERROR",...}`, but direct curl on the server works:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://127.0.0.1:3010/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"LAN-1"}'
# → 200
```

**Cause:** Browsers send an `Origin` header (`http://doctor.isara.local`). If the backend CORS policy does not allow that origin, the request is rejected before login runs — surfaced as a generic 500.

**Verify on the Ubuntu server:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST http://127.0.0.1:3010/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://doctor.isara.local" \
  -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"LAN-1"}'
```

If this returns **500** but curl without `Origin` returns **200**, rebuild after pulling the latest code (CORS now allows `*.isara.local` by default):

```bash
cd ~/Isara-Anywhere
git pull
docker compose up -d --build doctor-portal patient-portal meeting-server
```

Or set in `.env.docker`:

```env
CORS_ORIGINS=http://patient.isara.local,http://doctor.isara.local,http://meeting.isara.local,http://localhost:3005,http://localhost:3010,http://localhost:3020
```

**Patient portal** uses `POST /api/auth/login` — test the same way with `Origin: http://patient.isara.local` on port **3005**.

Run `bash deploy/nginx/diagnose-502.sh` — section 6 runs both login smokes with Origin headers.

---

# Ubuntu redeploy (Mode B LAN) {#redeploy-existing-ubuntu-server}

After code or env changes on the Ubuntu server, redeploy without wiping data:

```bash
cd ~/Isara-Anywhere
sed -i 's/\r$//' deploy/nginx/*.sh   # once, if scripts came from Windows (CRLF)
bash deploy/nginx/redeploy-full.sh --background --pull
# tail -f reports/redeploy-YYYYMMDD-HHMMSS.log   # path printed by script
```

Or step by step:

```bash
cd ~/Isara-Anywhere
git pull

# LAN env (browser URLs via Nginx subdomains)
cp -n .env.docker.lan.example .env.docker   # first time only
# Edit .env.docker: JWT_SECRET, CORS_ORIGINS, VITE_MEETING_SERVER_URL=http://meeting.isara.local

bash deploy/nginx/compose.sh --env-file .env.docker down
bash deploy/nginx/compose.sh --env-file .env.docker up -d --build
curl -s http://127.0.0.1:3010/health

sudo cp deploy/nginx/isara-system.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo nginx -t && sudo systemctl reload nginx

bash deploy/nginx/diagnose-502.sh   # NOT sudo bash
```

**Runtime ENV (patient + doctor):** both portals inject `env-config.js` at container start via `envsubst`. Change `VITE_MEETING_SERVER_URL` / `VITE_API_URL` in `.env.docker`, then `docker compose restart` — no `docker compose build` required for URL-only LAN moves.

**Headed E2E LAN subset** (from a dev machine pointing at LAN hosts):

```powershell
$env:PATIENT_URL='http://patient.isara.local'
$env:DOCTOR_URL='http://doctor.isara.local'
$env:MEETING_URL='http://meeting.isara.local'
npx playwright test --headed --workers=1 --project=Q-meeting-lifecycle --project=R-jitsi-role-permissions --project=B-patient-portal
npm run ledger:local -- --round lan
```

Expect: mixed-content if Nginx HTTPS is added later; extend `CORS_ORIGINS` with all `*.isara.local` origins; verify Socket.IO WebSocket upgrade through Nginx (`proxy_set_header Upgrade` in `deploy/nginx/isara-system.conf`).

---

# Quick test flow

1. **Patient** — login with `demo.test@gmail.com` / `P@ssw0rd`
2. **Doctor** — `doctor.test@izara.com` / `IzaraDoctor@2024`
3. **Admin** — `admin.test@izara.com` / `IzaraAdmin@2024`
4. **Appointments** — log in as Somchai or Anan to see seeded visits

---

# Mode B checklist

- [ ] Ubuntu: Docker installed
- [ ] `.env.docker` from `.env.docker.lan.example` with `JWT_SECRET`, `CORS_ORIGINS`, `VITE_MEETING_SERVER_URL`
- [ ] `docker compose up -d --build` — `curl http://127.0.0.1:3005/health` OK
- [ ] Nginx config installed — `sudo nginx -t` passes
- [ ] UFW allows port 80 (if enabled)
- [ ] Each client PC: `hosts` → server IP
- [ ] Browser: http://patient.isara.local/login works

---

*Last updated: 2026-06-22 · Izara Telemedicine v1.7.53*
