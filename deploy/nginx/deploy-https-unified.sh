#!/usr/bin/env bash
set -euo pipefail
cd ~/Isara-Anywhere

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

DOMAINS="patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local patient.local doctor.local meeting.local dbadmin.local"
SSL_DIR="/etc/nginx/ssl/isara"
CERT_PEM="${SSL_DIR}/izara.pem"
KEY_PEM="${SSL_DIR}/izara-key.pem"

sed -i 's/\r$//' .env.docker docker-compose.yml deploy/nginx/*.sh scripts/docker/*.sh shared/corsPolicy.cjs 2>/dev/null || true
rm -f Isara-patient-portal/.env Isara-doctor-portal/.env Izara-jitsi-server/.env

echo "=== TLS (all hostnames) ==="
sudo mkdir -p "$SSL_DIR"
if ! command -v mkcert >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq mkcert libnss3-tools
fi
mkcert -install 2>/dev/null || true
mkcert -cert-file /tmp/izara.pem -key-file /tmp/izara-key.pem $DOMAINS
sudo mv /tmp/izara.pem "$CERT_PEM"
sudo mv /tmp/izara-key.pem "$KEY_PEM"
sudo chmod 644 "$CERT_PEM"
sudo chmod 600 "$KEY_PEM"

echo "=== .env.docker (isara.local HTTPS) ==="
sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=postgres/' .env.docker
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@postgres:5432/izara_phase1|' .env.docker
sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' .env.docker
sed -i 's|^VITE_OAUTH_REDIRECT_URI=.*|VITE_OAUTH_REDIRECT_URI=https://patient.isara.local/auth/callback|' .env.docker
sed -i 's|^VITE_AUTH_PORTAL_URL=.*|VITE_AUTH_PORTAL_URL=https://patient.isara.local/auth|' .env.docker
sed -i 's|^VITE_PATIENT_URL=.*|VITE_PATIENT_URL=https://patient.isara.local/home|' .env.docker
sed -i 's|^VITE_WEBSOCKET_URL=.*|VITE_WEBSOCKET_URL=wss://patient.isara.local/ws|' .env.docker
sed -i 's|^VITE_MEETING_SERVER_URL=.*|VITE_MEETING_SERVER_URL=https://meeting.isara.local|' .env.docker
sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://patient.isara.local,https://doctor.isara.local,https://meeting.isara.local,https://dbadmin.isara.local,https://patient.local,https://doctor.local,https://meeting.local,http://localhost:3005,http://localhost:3010,http://localhost:3020|' .env.docker

echo "=== Docker ==="
sudo docker ps -a --format '{{.Names}}' | grep postgres | while read -r c; do
  [ "$c" = "izara-postgres" ] || { sudo docker stop "$c" 2>/dev/null || true; sudo docker rm "$c" 2>/dev/null || true; }
done
sudo $COMPOSE --env-file .env.docker up -d postgres
sleep 6
PG="$(sudo docker ps --format '{{.Names}}' | grep -E 'izara-postgres$' | head -1)"
sudo docker exec "$PG" psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
sudo $COMPOSE --env-file .env.docker up -d --build patient-portal doctor-portal meeting-server
sleep 35
sudo docker exec -i "$PG" psql -U postgres -d izara_phase1 < scripts/database/seed-dev-data.sql 2>/dev/null || true

echo "=== Nginx ==="
sudo cp deploy/nginx/isara-https-unified.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo rm -f /etc/nginx/sites-enabled/default
grep -q 'doctor.isara.local' /etc/hosts || echo "127.0.0.1 patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local patient.local doctor.local meeting.local dbadmin.local" | sudo tee -a /etc/hosts >/dev/null
sudo nginx -t
sudo systemctl reload nginx

echo "=== Verify routing ==="
curl -sk -H 'Host: doctor.isara.local' https://127.0.0.1/login | grep -q 'Izara Anywhere' && echo "doctor.isara.local=DOCTOR_OK" || echo "doctor.isara.local=FAIL"
curl -sk -H 'Host: patient.isara.local' https://127.0.0.1/login | grep -q 'Patient' && echo "patient.isara.local=PATIENT_OK" || echo "patient.isara.local=FAIL"
bash scripts/docker/verify-docker-stack.sh
bash scripts/docker/verify-https-isara.sh
