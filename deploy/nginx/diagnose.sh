#!/usr/bin/env bash
# Run on Ubuntu server: bash deploy/nginx/diagnose.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=compose.sh
source "${SCRIPT_DIR}/compose.sh"

ORIGIN_DOCTOR="${ORIGIN_DOCTOR:-https://doctor.isara.local}"
ORIGIN_PATIENT="${ORIGIN_PATIENT:-https://patient.isara.local}"

echo "=== Izara diagnostic ==="
echo ""

echo "--- Disk ---"
df -h / 2>/dev/null || true
_avail="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}' || echo 0)"
if [[ "${_avail}" -lt 3145728 ]]; then
  echo "WARN: less than 3 GiB free on /"
fi
docker system df 2>/dev/null || true
echo ""

echo "--- Nginx ---"
systemctl is-active nginx 2>/dev/null || echo "nginx not active"
sudo nginx -t 2>&1 || true
echo ""

echo "--- Docker ---"
compose ps 2>/dev/null || echo "Run from repo root"
echo ""

echo "--- Backend ports ---"
for port in 3005 3010 3020 5050; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "OK  :${port}"
  else
    echo "FAIL :${port} not listening"
  fi
done
echo ""

echo "--- Health ---"
for spec in "3005 Patient" "3010 Doctor" "3020 Meeting"; do
  port="${spec%% *}"
  name="${spec#* }"
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")
  echo "  ${name} :${port} → ${code}"
done
echo ""

echo "--- Login (direct + Origin) ---"
doctor_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://127.0.0.1:3010/auth/login" \
  -H "Content-Type: application/json" -H "Origin: ${ORIGIN_DOCTOR}" \
  -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"diag-1"}' 2>/dev/null || echo "000")
patient_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "http://127.0.0.1:3005/api/auth/login" \
  -H "Content-Type: application/json" -H "Origin: ${ORIGIN_PATIENT}" \
  -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd","deviceId":"diag-1"}' 2>/dev/null || echo "000")
echo "  doctor login: ${doctor_code}"
echo "  patient login: ${patient_code}"
echo ""

echo "--- Nginx routing ---"
if curl -sk --connect-timeout 3 https://doctor.isara.local/login 2>/dev/null | grep -q "Izara Anywhere"; then
  echo "  doctor.isara.local → doctor portal OK"
else
  echo "  doctor.isara.local → WRONG (may show patient if nginx server_name missing)"
fi
if curl -sk --connect-timeout 3 https://patient.isara.local/login 2>/dev/null | grep -q Patient; then
  echo "  patient.isara.local → patient portal OK"
else
  echo "  patient.isara.local → FAIL"
fi
echo ""

echo "--- Container logs (tail 10) ---"
for c in izara-patient-portal izara-doctor-portal izara-meeting-server izara-postgres; do
  docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$c" && docker logs "$c" --tail 10 2>&1 | sed "s/^/  [$c] /"
done
echo ""

echo "--- Nginx error log (tail 20) ---"
if sudo test -r /var/log/nginx/error.log 2>/dev/null; then
  sudo tail -20 /var/log/nginx/error.log 2>/dev/null | sed 's/^/  /' || echo "  (unable to read error.log)"
elif [[ -r /var/log/nginx/error.log ]]; then
  tail -20 /var/log/nginx/error.log 2>/dev/null | sed 's/^/  /' || echo "  (unable to read error.log)"
else
  echo "  SKIP: /var/log/nginx/error.log not found (localhost dev — use docker logs izara-nginx if present)"
fi
echo ""

echo "--- Socket.IO (meeting.isara.local) ---"
MEETING_ORIGIN="${MEETING_ORIGIN:-https://meeting.isara.local}"
socket_code=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 5 \
  "${MEETING_ORIGIN}/socket.io/?EIO=4&transport=polling" 2>/dev/null || echo "000")
if [[ "${socket_code}" == "200" || "${socket_code}" == "400" ]]; then
  echo "  PASS meeting Socket.IO polling → HTTP ${socket_code} (400 = handshake without sid is OK)"
else
  echo "  FAIL meeting Socket.IO polling → HTTP ${socket_code} (expected 200 or 400)"
  echo "  Hint: check nginx proxy_pass for /socket.io/ on meeting.isara.local"
fi
echo ""

echo "Fix: bash deploy/nginx/deploy.sh"
echo "Verify: bash scripts/docker/verify-stack.sh"
