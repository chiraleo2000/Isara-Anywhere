# Deploy — Nginx + Docker

**Main guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

| Script | Command |
| ------ | ------- |
| Deploy (HTTPS) | `bash deploy/nginx/deploy.sh` |
| Deploy (HTTP) | `bash deploy/nginx/deploy.sh --http` |
| Compose only | `bash deploy/nginx/compose.sh --env-file .env.docker up -d --build` |
| Diagnose | `bash deploy/nginx/diagnose.sh` |
| Verify | `bash scripts/docker/verify-stack.sh` |

Nginx configs: `isara-nginx.conf` (HTTPS) · `isara-nginx-http.conf` (HTTP)
