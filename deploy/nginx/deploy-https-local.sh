#!/usr/bin/env bash
set -euo pipefail
cd ~/Isara-Anywhere

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

DOMAINS="patient.local doctor.local meeting.local dbadmin.local"
SSL_DIR="/etc/nginx/ssl/isara"
CERT_PEM="${SSL_DIR}/local.pem"
KEY_PEM="${SSL_DIR}/local-key.pem"

echo "=== 1. Fix line endings ==="
sed -i 's/\r$//' .env.docker docker-compose.yml deploy/nginx/*.sh scripts/docker/*.sh shared/corsPolicy.cjs 2>/dev/null || true
rm -f Isara-patient-portal/.env Isara-doctor-portal/.env Izara-jitsi-server/.env

echo "=== 2. TLS certificates ==="
sudo mkdir -p "$SSL_DIR"
if [ ! -f "$CERT_PEM" ]; then
  if command -v mkcert >/dev/null 2>&1; then
    mkcert -install 2>/dev/null || true
    mkcert -cert-file /tmp/local.pem -key-file /tmp/local-key.pem $DOMAINS
    sudo mv /tmp/local.pem "$CERT_PEM"
    sudo mv /tmp/local-key.pem "$KEY_PEM"
  else
    echo "Installing mkcert..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq mkcert libnss3-tools
    mkcert -install
    mkcert -cert-file /tmp/local.pem -key-file /tmp/local-key.pem $DOMAINS
    sudo mv /tmp/local.pem "$CERT_PEM"
    sudo mv /tmp/local-key.pem "$KEY_PEM"
  fi
  sudo chmod 644 "$CERT_PEM"
  sudo chmod 600 "$KEY_PEM"
  echo "Certificates created at $SSL_DIR"
else
  echo "Certificates already exist"
fi

echo "=== 3. Patch .env.docker for HTTPS patient.local ==="
sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=postgres/' .env.docker
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@postgres:5432/izara_phase1|' .env.docker
sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' .env.docker
sed -i 's|^VITE_OAUTH_REDIRECT_URI=.*|VITE_OAUTH_REDIRECT_URI=https://patient.local/auth/callback|' .env.docker
sed -i 's|^VITE_AUTH_PORTAL_URL=.*|VITE_AUTH_PORTAL_URL=https://patient.local/auth|' .env.docker
sed -i 's|^VITE_PATIENT_URL=.*|VITE_PATIENT_URL=https://patient.local/home|' .env.docker
sed -i 's|^VITE_WEBSOCKET_URL=.*|VITE_WEBSOCKET_URL=wss://patient.local/ws|' .env.docker
sed -i 's|^VITE_MEETING_SERVER_URL=.*|VITE_MEETING_SERVER_URL=https://meeting.local|' .env.docker
sed -i 's|^CORS_ORIGINS=.*|CORS_ORIGINS=https://patient.local,https://doctor.local,https://meeting.local,https://dbadmin.local,http://localhost:3005,http://localhost:3010,http://localhost:3020|' .env.docker

echo "=== 4. Docker stack ==="
sudo docker ps -a --format '{{.Names}}' | grep postgres | while read -r c; do
  if [ "$c" != "izara-postgres" ]; then
    sudo docker stop "$c" 2>/dev/null || true
    sudo docker rm "$c" 2>/dev/null || true
  fi
done
sudo $COMPOSE --env-file .env.docker up -d postgres
sleep 8
PG="$(sudo docker ps --format '{{.Names}}' | grep -E 'izara-postgres$' | head -1)"
sudo docker exec "$PG" psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true
sudo $COMPOSE --env-file .env.docker up -d --build patient-portal doctor-portal meeting-server pgadmin
sleep 45
sudo docker exec -i "$PG" psql -U postgres -d izara_phase1 < scripts/database/seed-dev-data.sql 2>/dev/null || true

echo "=== 5. Nginx HTTPS ==="
sudo cp deploy/nginx/isara-local-https.conf /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true

echo "=== 6. Verify ==="
bash scripts/docker/verify-docker-stack.sh
bash scripts/docker/verify-https-local.sh

echo ""
echo "DONE. Add to client hosts file (replace IP):"
echo "  $(hostname -I | awk '{print $1}')   patient.local doctor.local meeting.local dbadmin.local"
echo ""
echo "Browser:"
echo "  https://patient.local/login"
echo "  https://doctor.local/login"
echo ""
echo "Trust CA on Windows: copy $(mkcert -CAROOT 2>/dev/null || echo '~/.local/share/mkcert')/rootCA.pem"
