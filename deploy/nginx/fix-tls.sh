#!/usr/bin/env bash
# Repair LAN TLS: sync clock, regenerate mkcert, reload nginx.
# Run on Ubuntu from repo root:
#   bash deploy/nginx/fix-tls.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

LAN_DOMAIN="${LAN_DOMAIN:-demotoday.net}"
SSL_DIR="/etc/nginx/ssl/isara"
DOMAINS="patient.${LAN_DOMAIN} doctor.${LAN_DOMAIN} meeting.${LAN_DOMAIN} meet.${LAN_DOMAIN} dbadmin.${LAN_DOMAIN}"

echo "=== Izara TLS repair (${LAN_DOMAIN}) ==="
echo ""

echo "--- 1. System clock (must be correct for valid cert dates) ---"
if command -v timedatectl >/dev/null 2>&1; then
  sudo timedatectl set-ntp true 2>/dev/null || true
  sleep 2
  timedatectl status || true
else
  date -u
  echo "WARN: timedatectl not found — verify server time manually"
fi
echo ""

echo "--- 2. mkcert ---"
if ! command -v mkcert >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq mkcert libnss3-tools
fi
mkcert -install 2>/dev/null || true

if [[ -f "${SSL_DIR}/izara.pem" ]]; then
  echo "Current certificate:"
  openssl x509 -in "${SSL_DIR}/izara.pem" -noout -dates -subject 2>/dev/null || true
  echo ""
fi

echo "Regenerating certificate for: ${DOMAINS}"
mkcert -cert-file /tmp/izara.pem -key-file /tmp/izara-key.pem ${DOMAINS}
sudo mkdir -p "${SSL_DIR}"
sudo mv /tmp/izara.pem "${SSL_DIR}/izara.pem"
sudo mv /tmp/izara-key.pem "${SSL_DIR}/izara-key.pem"
sudo chmod 644 "${SSL_DIR}/izara.pem"
sudo chmod 600 "${SSL_DIR}/izara-key.pem"
echo ""

echo "New certificate:"
openssl x509 -in "${SSL_DIR}/izara.pem" -noout -dates -subject
echo ""

echo "--- 3. Nginx ---"
sudo cp "${SCRIPT_DIR}/isara-nginx.conf" /etc/nginx/sites-available/isara-system
sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx reloaded."
echo ""

CA_ROOT="$(mkcert -CAROOT)/rootCA.pem"
EXPORT="${REPO_ROOT}/deploy/nginx/isara-mkcert-rootCA.pem"
cp "${CA_ROOT}" "${EXPORT}"
chmod 644 "${EXPORT}"

SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'SERVER_IP')"
echo "=== Done ==="
echo ""
echo "On Windows (Administrator PowerShell):"
echo "  1. Copy ${EXPORT} to your PC (or scp ubuntu@${SERVER_IP}:${EXPORT})"
echo "  2. .\\deploy\\nginx\\install-mkcert-ca-windows.ps1 -RootCaPath C:\\path\\to\\isara-mkcert-rootCA.pem"
echo "  3. .\\deploy\\nginx\\windows-update-hosts.ps1   # set \$ServerIp if not 192.168.10.239"
echo ""
echo "Verify server clock matches Windows (Settings → Time & language → Sync now)."
echo "Then open: https://patient.${LAN_DOMAIN}/login"
