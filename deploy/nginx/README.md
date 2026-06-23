# Deploy — Nginx + local Docker

| File | Description |
| ---- | ----------- |
| [LOCAL_DOCKER_DEPLOYMENT.md](LOCAL_DOCKER_DEPLOYMENT.md) | **Main guide** — Docker Compose, Mode A/B |
| [UBUNTU_HTTPS_DEPLOYMENT.md](UBUNTU_HTTPS_DEPLOYMENT.md) | **Mode C — HTTPS** on Ubuntu + Nginx |
| [UBUNTU_MANUAL_REDEPLOY.txt](UBUNTU_MANUAL_REDEPLOY.txt) | Manual copy-paste redeploy (HTTP, no scripts) |
| [PGADMIN_LAN_ACCESS_TH.md](PGADMIN_LAN_ACCESS_TH.md) | **TH** — pgAdmin on LAN |
| [isara-system.conf](isara-system.conf) | Nginx HTTP (`patient.isara.local`, …) |
| [isara-system-https.conf](isara-system-https.conf) | Nginx HTTPS + HTTP→HTTPS redirect |
| [diagnose-502.sh](diagnose-502.sh) | Diagnose 502 Bad Gateway |
| [compose.sh](compose.sh) | Docker Compose wrapper (V2 or V1) |
| [ubuntu-full-install.sh](ubuntu-full-install.sh) | **One-shot install** from git clone (Docker, Node 22, Nginx) |

**Env templates (repo root):**

| File | Use |
| ---- | --- |
| `.env.docker.example` | Mode A — localhost |
| `.env.docker.lan.example` | Mode B — LAN HTTP |
| `.env.docker.lan.https.example` | Mode C — LAN HTTPS |

**Quick HTTPS install (Ubuntu):**

```bash
cp .env.docker.lan.https.example .env.docker
# edit secrets → docker compose up -d --build
# mkcert + isara-system-https.conf — see UBUNTU_HTTPS_DEPLOYMENT.md
```
