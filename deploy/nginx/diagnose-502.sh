#!/usr/bin/env bash
# Run on the Ubuntu server (where Nginx + Docker live):
#   bash deploy/nginx/diagnose-502.sh
# Do NOT use: sudo bash ... (breaks on CRLF; use plain bash from repo root)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=compose.sh
source "${SCRIPT_DIR}/compose.sh"

echo "=== Izara 502 diagnostic ==="
echo ""

echo "--- 0. Disk space (build fails if full) ---"
df -h / 2>/dev/null || true
_avail="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}' || echo 0)"
if [[ "${_avail}" -lt 3145728 ]]; then
  echo "FAIL less than 3 GiB free on / — fix before docker build:"
  echo "  docker system prune -af && docker builder prune -af"
  echo "  sudo truncate -s 0 /var/log/nginx/access.log /var/log/nginx/error.log"
fi
if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null || true
fi
echo ""

echo "--- 1. Nginx ---"
systemctl is-active nginx 2>/dev/null || echo "nginx not active"
nginx -t 2>&1 || true
echo ""

echo "--- 2. Docker compose status ---"
if command -v docker >/dev/null 2>&1; then
  compose ps 2>/dev/null || echo "Run from Isara-Anywhere repo root (cd ~/Isara-Anywhere)"
else
  echo "ERROR: docker not installed or not in PATH"
fi
echo ""

echo "--- 3. Ports Nginx proxies to (must show LISTEN on 127.0.0.1) ---"
for port in 3005 3010 3020 5050; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "OK  port ${port} is listening:"
    ss -tlnp | grep ":${port} " || true
  else
    echo "FAIL port ${port} NOT listening — Nginx will return 502"
  fi
done
echo ""

echo "--- 4. Curl backends (on this server only) ---"
for spec in "3005 Patient" "3010 Doctor" "3020 Meeting" "5050 pgAdmin"; do
  port="${spec%% *}"
  name="${spec#* }"
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  if [ "$code" = "000" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1:${port}/" 2>/dev/null || echo "000")
  fi
  echo "  ${name} (:${port}): HTTP ${code}"
done
echo ""

echo "--- 5. Recent container errors (last 30 lines each) ---"
for c in izara-patient-portal izara-doctor-portal izara-meeting-server izara-postgres; do
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
    echo ">> $c"
    docker logs "$c" --tail 15 2>&1 | tail -15
    echo ""
  fi
done

echo "--- 6. Login smoke (with Origin — mimics browser through Nginx) ---"
doctor_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://127.0.0.1:3010/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: http://doctor.isara.local" \
  -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"LAN-1"}' 2>/dev/null || echo "000")
patient_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://127.0.0.1:3005/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: http://patient.isara.local" \
  -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd","deviceId":"LAN-1"}' 2>/dev/null || echo "000")
echo "  Doctor /auth/login (Origin doctor.isara.local): HTTP ${doctor_code}"
echo "  Patient /api/auth/login (Origin patient.isara.local): HTTP ${patient_code}"
if [ "$doctor_code" != "200" ] || [ "$patient_code" != "200" ]; then
  echo "  HINT: 500 + INTERNAL_ERROR often means CORS blocked the Origin header."
  echo "        Rebuild: bash deploy/nginx/compose.sh --env-file .env.docker up -d --build"
  echo "        Or set CORS_ORIGINS in .env.docker to include *.isara.local hosts."
fi
echo ""

echo "--- 7. Nginx error log (last 10 lines) ---"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "(need sudo for nginx error log)"
echo ""

echo "--- 8. Socket.IO upgrade smoke (meeting server via Nginx host) ---"
if command -v curl >/dev/null 2>&1; then
  ws_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout 3 \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Host: meeting.isara.local" \
    "http://127.0.0.1/socket.io/?EIO=4&transport=polling" 2>/dev/null || echo "000")
  echo "  meeting.isara.local Socket.IO polling: HTTP ${ws_code} (expect 200 via Nginx on :80)"
  if [ "$ws_code" = "000" ] || [ "$ws_code" = "502" ]; then
    echo "  HINT: ensure Nginx is running and meeting-server container is healthy on :3020"
  fi
fi
echo ""
echo "=== Done ==="
echo "If ports FAIL: cd ~/Isara-Anywhere && bash deploy/nginx/compose.sh --env-file .env.docker up -d --build"
echo "If JWT_SECRET / POSTGRES_PASSWORD errors in logs: fix .env.docker and rebuild"
