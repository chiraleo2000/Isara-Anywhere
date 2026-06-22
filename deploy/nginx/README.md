# Deploy — Nginx + local Docker

| File | Description |
| ---- | ----------- |
| [LOCAL_DOCKER_DEPLOYMENT.md](LOCAL_DOCKER_DEPLOYMENT.md) | **Main guide** — Docker Compose, URLs, demo users, hosts file, Nginx LAN setup |
| [PGADMIN_LAN_ACCESS_TH.md](PGADMIN_LAN_ACCESS_TH.md) | **TH** — เข้า PostgreSQL ผ่าน pgAdmin (Mode B, Windows บน LAN) |
| [isara-system.conf](isara-system.conf) | Nginx site config (`patient.isara.local`, etc.) |
| [diagnose-502.sh](diagnose-502.sh) | Diagnose 502 Bad Gateway on Ubuntu |
| [compose.sh](compose.sh) | Docker Compose wrapper (V2 plugin or `docker-compose` V1) |

**Quick install (Ubuntu server):**

```bash
sudo cp deploy/nginx/isara-system.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Use `bash deploy/nginx/compose.sh` for Docker (not `sudo docker compose`). See [Redeploy section](LOCAL_DOCKER_DEPLOYMENT.md#redeploy-existing-ubuntu-server).
