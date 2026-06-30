#!/usr/bin/env bash
# Izara Ubuntu LAN deploy — Docker + Nginx + TLS + verify
#
#   bash deploy/nginx/deploy.sh              # HTTPS (default, recommended)
#   bash deploy/nginx/deploy.sh --http       # HTTP only (no mkcert)
#   bash deploy/nginx/deploy.sh --docker-only
#   bash deploy/nginx/deploy.sh --skip-build
#   bash deploy/nginx/deploy.sh --pull --prune
#   bash deploy/nginx/deploy.sh --diagnose   # run diagnose only
#
# Do NOT: sudo bash deploy/nginx/deploy.sh (use user in docker group)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

# shellcheck source=compose.sh
source "${SCRIPT_DIR}/compose.sh"

ENV_FILE=".env.docker"
LAN_DOMAIN="demotoday.net"
MODE="https"
DOCKER_ONLY=0
SKIP_BUILD=0
DO_PULL=0
DO_PRUNE=0
DIAGNOSE_ONLY=0

usage() {
  cat <<'EOF'
Usage: bash deploy/nginx/deploy.sh [options]

Options:
  --http          HTTP Nginx only (no TLS)
  --docker-only   Skip Nginx / mkcert
  --skip-build    Restart containers without --build
  --pull          git pull before deploy
  --prune         docker system prune before build
  --env-file PATH default .env.docker
  --diagnose      Run diagnose.sh and exit
  -h, --help
EOF
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http) MODE="http"; shift ;;
    --docker-only) DOCKER_ONLY=1; shift ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --pull) DO_PULL=1; shift ;;
    --prune) DO_PRUNE=1; shift ;;
    --diagnose) DIAGNOSE_ONLY=1; shift ;;
    --env-file) ENV_FILE="${2:?}"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown: $1" >&2; usage 1 ;;
  esac
done

fix_crlf() {
  sed -i 's/\r$//' .env.docker docker-compose.yml "${SCRIPT_DIR}"/*.sh scripts/docker/*.sh shared/corsPolicy.cjs 2>/dev/null || true
}

if [[ "${DIAGNOSE_ONLY}" -eq 1 ]]; then
  fix_crlf
  exec bash "${SCRIPT_DIR}/diagnose.sh"
fi

fix_crlf
rm -f Isara-patient-portal/.env Isara-doctor-portal/.env Izara-jitsi-server/.env

[[ -f "${ENV_FILE}" ]] || { echo "ERROR: ${ENV_FILE} missing. cp .env.docker.lan.https.example .env.docker"; exit 1; }

if [[ "${DO_PULL}" -eq 1 ]]; then git pull; fi

if [[ "${DO_PRUNE}" -eq 1 ]]; then
  docker system prune -af 2>/dev/null || true
  docker builder prune -af 2>/dev/null || true
fi

patch_env_https() {
  sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=postgres/' "${ENV_FILE}"
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@postgres:5432/izara_phase1|' "${ENV_FILE}"
  sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=postgres/' "${ENV_FILE}"
  sed -i "s|^OAUTH_REDIRECT_URI=.*|OAUTH_REDIRECT_URI=https://patient.${LAN_DOMAIN}/auth/callback|" "${ENV_FILE}"
  sed -i "s|^VITE_AUTH_PORTAL_URL=.*|VITE_AUTH_PORTAL_URL=https://patient.${LAN_DOMAIN}/auth|" "${ENV_FILE}"
  sed -i "s|^VITE_PATIENT_URL=.*|VITE_PATIENT_URL=https://patient.${LAN_DOMAIN}/home|" "${ENV_FILE}"
  sed -i "s|^VITE_WEBSOCKET_URL=.*|VITE_WEBSOCKET_URL=wss://patient.${LAN_DOMAIN}/ws|" "${ENV_FILE}"
  sed -i "s|^VITE_MEETING_SERVER_URL=.*|VITE_MEETING_SERVER_URL=https://meeting.${LAN_DOMAIN}|" "${ENV_FILE}"
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://patient.${LAN_DOMAIN},https://doctor.${LAN_DOMAIN},https://meeting.${LAN_DOMAIN},https://meet.${LAN_DOMAIN},https://dbadmin.${LAN_DOMAIN},http://localhost:3005,http://localhost:3010,http://localhost:3020|" "${ENV_FILE}"
  sed -i "s|^JITSI_DOMAIN=.*|JITSI_DOMAIN=meet.${LAN_DOMAIN}|" "${ENV_FILE}" 2>/dev/null || true
  sed -i "s|^VITE_JITSI_DOMAIN=.*|VITE_JITSI_DOMAIN=meet.${LAN_DOMAIN}|" "${ENV_FILE}" 2>/dev/null || true
}

patch_env_http() {
  sed -i "s|^OAUTH_REDIRECT_URI=.*|OAUTH_REDIRECT_URI=http://patient.${LAN_DOMAIN}/auth/callback|" "${ENV_FILE}"
  sed -i "s|^VITE_AUTH_PORTAL_URL=.*|VITE_AUTH_PORTAL_URL=http://patient.${LAN_DOMAIN}/auth|" "${ENV_FILE}"
  sed -i "s|^VITE_PATIENT_URL=.*|VITE_PATIENT_URL=http://patient.${LAN_DOMAIN}/home|" "${ENV_FILE}"
  sed -i "s|^VITE_WEBSOCKET_URL=.*|VITE_WEBSOCKET_URL=ws://patient.${LAN_DOMAIN}/ws|" "${ENV_FILE}"
  sed -i "s|^VITE_MEETING_SERVER_URL=.*|VITE_MEETING_SERVER_URL=http://meeting.${LAN_DOMAIN}|" "${ENV_FILE}"
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://patient.${LAN_DOMAIN},http://doctor.${LAN_DOMAIN},http://meeting.${LAN_DOMAIN},http://dbadmin.${LAN_DOMAIN},http://localhost:3005,http://localhost:3010,http://localhost:3020|" "${ENV_FILE}"
}

echo "=== Izara deploy (${MODE}) ==="

if [[ "${MODE}" == "https" ]]; then patch_env_https; else patch_env_http; fi

echo "--- Postgres ---"
docker ps -a --format '{{.Names}}' | grep postgres | while read -r c; do
  [[ "$c" == "izara-postgres" ]] || { docker stop "$c" 2>/dev/null || true; docker rm "$c" 2>/dev/null || true; }
done
compose --env-file "${ENV_FILE}" up -d postgres
sleep 6
PG="$(docker ps --format '{{.Names}}' | grep -E 'izara-postgres$' | head -1)"
docker exec "$PG" psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

echo "--- Docker stack ---"
BUILD_FLAG=""
[[ "${SKIP_BUILD}" -eq 0 ]] && BUILD_FLAG="--build"
compose --env-file "${ENV_FILE}" up -d ${BUILD_FLAG} patient-portal doctor-portal meeting-server pgadmin
sleep 35
docker exec -i "$PG" psql -U postgres -d izara_phase1 < scripts/database/seed-dev-data.sql 2>/dev/null || true

echo "--- Self-hosted Jitsi (LAN) ---"
if [[ -d deploy/jitsi/docker-jitsi-meet ]]; then
  node scripts/jitsi/setup-local-jitsi.mjs --sync-docker-env --lan || node scripts/jitsi/setup-local-jitsi.mjs --lan
  compose --env-file "${ENV_FILE}" -f docker-compose.yml -f deploy/jitsi/docker-compose.jitsi.yml --profile jitsi up -d ${BUILD_FLAG}
  sleep 15
fi

if [[ "${DOCKER_ONLY}" -eq 0 ]] && command -v nginx >/dev/null 2>&1; then
  echo "--- Nginx (${MODE}) ---"
  if [[ "${MODE}" == "https" ]]; then
    DOMAINS="patient.${LAN_DOMAIN} doctor.${LAN_DOMAIN} meeting.${LAN_DOMAIN} meet.${LAN_DOMAIN} dbadmin.${LAN_DOMAIN}"
    SSL_DIR="/etc/nginx/ssl/isara"
    sudo mkdir -p "$SSL_DIR"
    if ! command -v mkcert >/dev/null 2>&1; then
      sudo apt-get update -qq
      sudo apt-get install -y -qq mkcert libnss3-tools
    fi
    # Certs embed server clock — sync NTP first or browsers show ERR_CERT_DATE_INVALID.
    if command -v timedatectl >/dev/null 2>&1; then
      sudo timedatectl set-ntp true 2>/dev/null || true
      sleep 2
      timedatectl status 2>/dev/null | sed 's/^/  /' || true
    fi
    mkcert -install 2>/dev/null || true
    mkcert -cert-file /tmp/izara.pem -key-file /tmp/izara-key.pem $DOMAINS
    sudo mv /tmp/izara.pem "${SSL_DIR}/izara.pem"
    sudo mv /tmp/izara-key.pem "${SSL_DIR}/izara-key.pem"
    sudo chmod 644 "${SSL_DIR}/izara.pem"
    sudo chmod 600 "${SSL_DIR}/izara-key.pem"
    sudo cp "${SCRIPT_DIR}/isara-nginx.conf" /etc/nginx/sites-available/isara-system
  else
    sudo cp "${SCRIPT_DIR}/isara-nginx-http.conf" /etc/nginx/sites-available/isara-system
  fi
  sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
  sudo rm -f /etc/nginx/sites-enabled/default
  # Always include meet.* — older hosts lines may omit it and break Jitsi DNS on the server.
  sudo sed -i '/demotoday\.net/d' /etc/hosts 2>/dev/null || true
  echo "127.0.0.1 patient.${LAN_DOMAIN} doctor.${LAN_DOMAIN} meeting.${LAN_DOMAIN} meet.${LAN_DOMAIN} dbadmin.${LAN_DOMAIN}" | sudo tee -a /etc/hosts >/dev/null
  sudo ufw allow 80/tcp 2>/dev/null || true
  sudo ufw allow 443/tcp 2>/dev/null || true
  # JVB RTP/WebRTC — doctor laptop cam/mic media (UDP to server LAN IP)
  sudo ufw allow 10000/udp 2>/dev/null || true
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "--- Verify ---"
bash scripts/docker/verify-stack.sh "${MODE}"

echo ""
echo "Client hosts file on Windows (run Notepad as Administrator, edit C:\\Windows\\System32\\drivers\\etc\\hosts):"
echo "  $(hostname -I 2>/dev/null | awk '{print $1}' || echo 'SERVER_IP')   patient.${LAN_DOMAIN} doctor.${LAN_DOMAIN} meeting.${LAN_DOMAIN} meet.${LAN_DOMAIN} dbadmin.${LAN_DOMAIN}"
if [[ "${MODE}" == "https" ]]; then
  CA_EXPORT="${REPO_ROOT}/deploy/nginx/isara-mkcert-rootCA.pem"
  cp "$(mkcert -CAROOT 2>/dev/null)/rootCA.pem" "${CA_EXPORT}" 2>/dev/null || true
  chmod 644 "${CA_EXPORT}" 2>/dev/null || true
  echo "  https://patient.${LAN_DOMAIN}/login  |  https://doctor.${LAN_DOMAIN}/login"
  echo "  Windows TLS: copy ${CA_EXPORT} → install-mkcert-ca-windows.ps1 (see deploy/nginx/WINDOWS_CLIENT_SETUP.md)"
  echo "  If ERR_CERT_DATE_INVALID: bash deploy/nginx/fix-tls.sh on server + sync Windows clock"
else
  echo "  http://patient.${LAN_DOMAIN}/login  |  http://doctor.${LAN_DOMAIN}/login"
fi
