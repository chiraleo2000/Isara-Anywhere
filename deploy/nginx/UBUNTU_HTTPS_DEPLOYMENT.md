# Ubuntu + Nginx + HTTPS (LAN Mode B with TLS)

Deploy Izara on an **Ubuntu server** with Docker behind **Nginx TLS** so LAN clients open:

| Service | HTTPS URL |
| ------- | --------- |
| Patient | https://patient.isara.local/login |
| Doctor  | https://doctor.isara.local/login |
| Meeting | https://meeting.isara.local |
| pgAdmin | https://dbadmin.isara.local |

Docker containers stay on **HTTP** at `127.0.0.1:3005/3010/3020/5050`. Nginx terminates TLS on port **443** and sets `X-Forwarded-Proto: https`.

**Related:** [LOCAL_DOCKER_DEPLOYMENT.md](LOCAL_DOCKER_DEPLOYMENT.md) (HTTP Mode B) · [UBUNTU_MANUAL_REDEPLOY.txt](UBUNTU_MANUAL_REDEPLOY.txt) · [isara-system-https.conf](isara-system-https.conf)

---

## Prerequisites

- Ubuntu server with Docker (same host as Nginx)
- LAN DNS or `hosts` file on each client PC
- Ports **80** and **443** open on the server (UFW if enabled)
- **mkcert** (recommended for LAN) or your own internal CA

> **Note:** Let's Encrypt requires a **public domain**. For `*.isara.local` on a private LAN, use **mkcert** or a self-signed cert trusted on client PCs.

---

## 1. Hosts file (every client PC)

Replace `192.168.x.x` with your Ubuntu server IP:

```text
192.168.x.x   patient.isara.local
192.168.x.x   doctor.isara.local
192.168.x.x   meeting.isara.local
192.168.x.x   dbadmin.isara.local
```

---

## 2. TLS certificates (mkcert — recommended)

On the **Ubuntu server**:

```bash
sudo apt update
sudo apt install -y mkcert libnss3-tools
mkcert -install

sudo mkdir -p /etc/nginx/ssl/isara
cd /etc/nginx/ssl/isara

mkcert -cert-file isara-local.pem -key-file isara-local-key.pem \
  patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local

sudo chmod 644 isara-local.pem
sudo chmod 600 isara-local-key.pem
```

On **Windows clients** (trust the same CA):

1. Copy the mkcert root CA from the server: `mkcert -CAROOT` on Ubuntu shows the path (e.g. `~/.local/share/mkcert/rootCA.pem`).
2. Install `mkcert` on Windows, or import `rootCA.pem` into **Trusted Root Certification Authorities**.

---

## 3. Environment file (HTTPS URLs)

On the server:

```bash
cd ~/Isara-Anywhere
cp .env.docker.lan.https.example .env.docker
nano .env.docker
```

**Required edits:**

| Variable | Example (HTTPS) |
| -------- | ---------------- |
| `POSTGRES_PASSWORD` | strong password |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `GEMINI_API_KEY` | your key (or `xxxxx`) |
| `VITE_MEETING_SERVER_URL` | `https://meeting.isara.local` |
| `CORS_ORIGINS` | `https://patient.isara.local,https://doctor.isara.local,https://meeting.isara.local` |
| `VITE_WEBSOCKET_URL` | `wss://patient.isara.local/ws` |
| `GOOGLE_CLIENT_ID` / `SECRET` | from Google Cloud Console |

**Google OAuth:** add authorized redirect URI:

`https://patient.isara.local/auth/callback`

Copy `.env.docker` to the server with `scp` if you edit on Windows — it is **gitignored**.

---

## 4. Docker stack

```bash
cd ~/Isara-Anywhere
git pull
sed -i 's/\r$//' deploy/nginx/*.sh

sudo docker-compose --env-file .env.docker down
sudo docker-compose --env-file .env.docker build --no-cache patient-portal
sudo docker-compose --env-file .env.docker up -d --build
```

Health checks:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3005/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3010/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3020/health
```

All should return **200**.

**Runtime URL changes** (no image rebuild): edit `VITE_MEETING_SERVER_URL` in `.env.docker`, then:

```bash
sudo docker-compose --env-file .env.docker restart patient-portal doctor-portal
```

---

## 5. Nginx HTTPS config

```bash
sudo cp deploy/nginx/isara-system-https.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system

# Disable default site if it conflicts
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

Open firewall (if UFW enabled):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 6. Verify HTTPS

On the server:

```bash
curl -sk -o /dev/null -w "patient %{http_code}\n" https://patient.isara.local/health
curl -sk -o /dev/null -w "doctor  %{http_code}\n" https://doctor.isara.local/health

curl -sk -o /dev/null -w "doctor login %{http_code}\n" \
  -X POST https://doctor.isara.local/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://doctor.isara.local" \
  -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"LAN-1"}'
```

In a browser on a LAN PC:

- https://patient.isara.local/login  
- https://doctor.isara.local/login  

Camera/microphone for Jitsi require **HTTPS** (or localhost) — another reason to use this mode.

---

## 7. HTTP → HTTPS redirect

`isara-system-https.conf` redirects port **80** to **443** for all four hostnames. If you need HTTP and HTTPS side by side, use [isara-system.conf](isara-system.conf) instead (HTTP only).

---

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| Browser certificate warning | Install mkcert root CA on the client PC |
| 502 Bad Gateway | Docker not up — fix health curls on `127.0.0.1` first |
| Login 500 with Origin | `CORS_ORIGINS` must include `https://*.isara.local` |
| Mixed content errors | Ensure `VITE_MEETING_SERVER_URL=https://meeting.isara.local` |
| WebSocket fails | Nginx must pass `Upgrade` / `Connection` (config included) |
| OAuth redirect mismatch | Google Console URI must be `https://patient.isara.local/auth/callback` |

Optional diagnostic:

```bash
bash deploy/nginx/diagnose-502.sh
```

---

## File reference

| File | Purpose |
| ---- | ------- |
| `.env.docker.lan.https.example` | HTTPS env template |
| `isara-system-https.conf` | Nginx TLS + reverse proxy |
| `shared/corsPolicy.cjs` | Allows `https://*.isara.local` |

*Last updated: 2026-06-22 · Izara v1.7.53*
