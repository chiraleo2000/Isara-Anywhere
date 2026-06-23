#!/usr/bin/env bash
set -euo pipefail
cd ~/Isara-Anywhere
sudo docker ps -a --format '{{.Names}}' | grep postgres | while read -r c; do
  if [ "$c" != "izara-postgres" ]; then
    sudo docker stop "$c" || true
    sudo docker rm "$c" || true
  fi
done
sudo docker compose --env-file .env.docker up -d postgres
sleep 8
sudo docker exec izara-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
sudo docker compose --env-file .env.docker restart patient-portal doctor-portal meeting-server
sleep 25
bash scripts/docker/verify-docker-stack.sh
