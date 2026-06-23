#!/usr/bin/env bash
set -euo pipefail
cd ~/Isara-Anywhere
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi
sed -i 's/\r$//' .env.docker docker-compose.yml scripts/docker/*.sh 2>/dev/null || true
sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=postgres/' .env.docker
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@postgres:5432/izara_phase1|' .env.docker
sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' .env.docker
rm -f Isara-patient-portal/.env Isara-doctor-portal/.env Izara-jitsi-server/.env
# Remove orphan postgres containers (docker-compose v1 prefix bug)
sudo docker ps -a --format '{{.Names}}' | grep -E 'postgres' | while read -r c; do
  if [ "$c" != "izara-postgres" ]; then
    sudo docker stop "$c" 2>/dev/null || true
    sudo docker rm "$c" 2>/dev/null || true
  fi
done
sudo $COMPOSE --env-file .env.docker up -d postgres
sleep 8
PG_CONTAINER="$(sudo docker ps --format '{{.Names}}' | grep -E 'izara-postgres$' | head -1)"
[ -n "$PG_CONTAINER" ] || { echo "postgres container not found"; exit 1; }
sudo docker exec "$PG_CONTAINER" psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"
sudo $COMPOSE --env-file .env.docker stop patient-portal doctor-portal meeting-server 2>/dev/null || true
sudo $COMPOSE --env-file .env.docker rm -f patient-portal doctor-portal meeting-server 2>/dev/null || true
sudo $COMPOSE --env-file .env.docker up -d --build patient-portal doctor-portal meeting-server
sleep 40
sudo docker exec -i "$PG_CONTAINER" psql -U postgres -d izara_phase1 < scripts/database/seed-dev-data.sql
bash scripts/docker/verify-docker-stack.sh
sudo cp deploy/nginx/isara-system.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
curl -s -o /dev/null -w 'nginx_patient=%{http_code}\n' -H 'Host: patient.isara.local' http://127.0.0.1/login
curl -s -o /dev/null -w 'nginx_doctor=%{http_code}\n' -H 'Host: doctor.isara.local' http://127.0.0.1/login
