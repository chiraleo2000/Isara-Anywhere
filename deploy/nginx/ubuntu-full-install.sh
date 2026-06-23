#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
REPO_URL="${REPO_URL:-https://github.com/chiraleo2000/Isara-Anywhere.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/Isara-Anywhere}"
BRANCH="${BRANCH:-}"
USE_HTTPS="${USE_HTTPS:-0}"
ENV_FILE="${ENV_FILE:-.env.docker}"
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi
run_apt() {
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq "$@"
}
run_apt install ca-certificates curl gnupg lsb-release git openssl gettext-base jq apt-transport-https
if ! command -v docker >/dev/null 2>&1; then
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  run_apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  $SUDO systemctl enable --now docker
fi
if ! groups "$USER" 2>/dev/null | grep -q docker; then
  $SUDO usermod -aG docker "$USER" 2>/dev/null || true
fi
if ! command -v node >/dev/null 2>&1 || ! node -v 2>/dev/null | grep -qE '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
  run_apt install nodejs
fi
run_apt install nginx
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  run_apt install docker-compose
fi
compose() {
  if docker compose version >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    docker compose "$@"
  else
    $SUDO docker compose "$@"
  fi
  elif command -v docker-compose >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
      docker-compose "$@"
    else
      $SUDO docker-compose "$@"
    fi
  else
    $SUDO docker-compose "$@"
  fi
}
if [ -d "${INSTALL_DIR}/.git" ]; then
  cd "${INSTALL_DIR}"
  git fetch --all
  if [ -n "${BRANCH}" ]; then
    git checkout "${BRANCH}"
    git pull origin "${BRANCH}"
  else
    git pull
  fi
else
  git clone "${REPO_URL}" "${INSTALL_DIR}"
  cd "${INSTALL_DIR}"
  if [ -n "${BRANCH}" ]; then
    git checkout "${BRANCH}"
  fi
fi
find deploy/nginx -name '*.sh' -type f 2>/dev/null | while read -r f; do
  sed -i 's/\r$//' "$f" 2>/dev/null || true
done
if [ -f /var/log/nginx/access.log ]; then
  $SUDO truncate -s 0 /var/log/nginx/access.log 2>/dev/null || true
fi
if [ -f /var/log/nginx/error.log ]; then
  $SUDO truncate -s 0 /var/log/nginx/error.log 2>/dev/null || true
fi
$SUDO journalctl --vacuum-size=200M 2>/dev/null || true
if [ "${USE_HTTPS}" = "1" ]; then
  run_apt install mkcert libnss3-tools
  mkcert -install 2>/dev/null || true
  $SUDO mkdir -p /etc/nginx/ssl/isara
  mkcert -cert-file /tmp/isara-local.pem -key-file /tmp/isara-local-key.pem patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local
  $SUDO mv -f /tmp/isara-local.pem /etc/nginx/ssl/isara/isara-local.pem
  $SUDO mv -f /tmp/isara-local-key.pem /etc/nginx/ssl/isara/isara-local-key.pem
  $SUDO chmod 644 /etc/nginx/ssl/isara/isara-local.pem
  $SUDO chmod 600 /etc/nginx/ssl/isara/isara-local-key.pem
fi
if [ ! -f "${ENV_FILE}" ]; then
  if [ "${USE_HTTPS}" = "1" ]; then
    cp .env.docker.lan.https.example "${ENV_FILE}"
  else
    cp .env.docker.lan.example "${ENV_FILE}"
  fi
fi
bash scripts/docker/sync-postgres-password.sh "${ENV_FILE}" 2>/dev/null || true
if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" "${ENV_FILE}"
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/izara_phase1|" "${ENV_FILE}"
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${POSTGRES_PASSWORD}/" "${ENV_FILE}" 2>/dev/null || true
fi
if [ -n "${JWT_SECRET:-}" ]; then
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" "${ENV_FILE}"
fi
if [ -n "${GEMINI_API_KEY:-}" ]; then
  sed -i "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=${GEMINI_API_KEY}/" "${ENV_FILE}"
  sed -i "s/^VITE_GEMINI_API_KEY=.*/VITE_GEMINI_API_KEY=${GEMINI_API_KEY}/" "${ENV_FILE}"
fi
if [ -n "${GOOGLE_MAPS_API_KEY:-}" ]; then
  sed -i "s/^GOOGLE_MAPS_API_KEY=.*/GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}/" "${ENV_FILE}"
  sed -i "s/^VITE_GOOGLE_MAPS_API_KEY=.*/VITE_GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}/" "${ENV_FILE}"
fi
if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
  sed -i "s/^GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}/" "${ENV_FILE}"
  sed -i "s/^VITE_GOOGLE_CLIENT_ID=.*/VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}/" "${ENV_FILE}"
fi
if [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
  sed -i "s/^GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}/" "${ENV_FILE}"
fi
if [ -n "${VITE_GOOGLE_MAPS_MAP_ID:-}" ]; then
  sed -i "s/^VITE_GOOGLE_MAPS_MAP_ID=.*/VITE_GOOGLE_MAPS_MAP_ID=${VITE_GOOGLE_MAPS_MAP_ID}/" "${ENV_FILE}"
fi
compose --env-file "${ENV_FILE}" down 2>/dev/null || true
compose --env-file "${ENV_FILE}" build --no-cache patient-portal
compose --env-file "${ENV_FILE}" up -d --build
bash scripts/docker/sync-postgres-password.sh "${ENV_FILE}" || true
compose --env-file "${ENV_FILE}" restart patient-portal doctor-portal meeting-server 2>/dev/null || true
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/database/seed-dev-data.sql 2>/dev/null || true
wait_health() {
  local port="$1"
  local max="${2:-240}"
  local n=0
  local code="000"
  while [ "${n}" -lt "${max}" ]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo 000)"
    if [ "${code}" = "200" ]; then
      return 0
    fi
    sleep 5
    n=$((n + 5))
  done
  return 1
}
wait_health 3005 300 || true
wait_health 3010 300 || true
wait_health 3020 300 || true
if [ "${USE_HTTPS}" = "1" ]; then
  $SUDO cp deploy/nginx/isara-system-https.conf /etc/nginx/sites-available/isara-system
else
  $SUDO cp deploy/nginx/isara-system.conf /etc/nginx/sites-available/isara-system
fi
$SUDO ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
$SUDO rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
$SUDO nginx -t
$SUDO systemctl enable nginx
$SUDO systemctl reload nginx
if command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
  $SUDO ufw allow 80/tcp 2>/dev/null || true
  $SUDO ufw allow 443/tcp 2>/dev/null || true
fi
compose --env-file "${ENV_FILE}" ps
curl -s -o /dev/null -w 'patient_health=%{http_code}\n' http://127.0.0.1:3005/health || true
curl -s -o /dev/null -w 'doctor_health=%{http_code}\n' http://127.0.0.1:3010/health || true
curl -s -o /dev/null -w 'meeting_health=%{http_code}\n' http://127.0.0.1:3020/health || true
if [ "${USE_HTTPS}" = "1" ]; then
  curl -sk -o /dev/null -w 'patient_https=%{http_code}\n' https://patient.isara.local/health || true
  curl -sk -o /dev/null -w 'doctor_https=%{http_code}\n' https://doctor.isara.local/health || true
else
  curl -s -o /dev/null -w 'patient_http=%{http_code}\n' http://patient.isara.local/health 2>/dev/null || true
  curl -s -o /dev/null -w 'doctor_http=%{http_code}\n' http://doctor.isara.local/health 2>/dev/null || true
fi
echo "INSTALL_DIR=${INSTALL_DIR}"
echo "ENV_FILE=${INSTALL_DIR}/${ENV_FILE}"
echo "USE_HTTPS=${USE_HTTPS}"
echo "DONE"
