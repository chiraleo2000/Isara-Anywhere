#!/usr/bin/env bash
# Unified stack verification. Run on Ubuntu server after deploy.
#
#   bash scripts/docker/verify-stack.sh          # direct ports + HTTPS nginx
#   bash scripts/docker/verify-stack.sh http     # direct ports + HTTP nginx
#   bash scripts/docker/verify-stack.sh direct   # Docker ports only

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-https}"
fail=0

check_code() {
  local name="$1" url="$2" expect="${3:-200}"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 8 "$url" 2>/dev/null || echo 000)"
  echo "${name}=${code}"
  [[ "$code" == "$expect" ]] || fail=1
}

check_page() {
  local name="$1" host="$2" scheme="$3" marker="$4"
  local body code curl_flags=()
  [[ "$scheme" == "https" ]] && curl_flags=(-sk)
  body="$(curl "${curl_flags[@]}" --connect-timeout 10 -H "Host: $host" "${scheme}://127.0.0.1/login" 2>/dev/null || true)"
  code="$(curl "${curl_flags[@]}" -o /dev/null -w '%{http_code}' --connect-timeout 10 -H "Host: $host" "${scheme}://127.0.0.1/login" 2>/dev/null || echo 000)"
  if [[ "$code" == "200" ]] && echo "$body" | grep -q "$marker"; then
    echo "${name}=200"
  else
    echo "${name}=${code}_FAIL"
    fail=1
  fi
}

DOCTOR_ORIGIN="https://doctor.isara.local"
PATIENT_ORIGIN="https://patient.isara.local"
NGINX_SCHEME="https"
if [[ "$MODE" == "http" ]]; then
  DOCTOR_ORIGIN="http://doctor.isara.local"
  PATIENT_ORIGIN="http://patient.isara.local"
  NGINX_SCHEME="http"
fi

echo "=== verify-stack (${MODE}) ==="

check_code patient_health http://127.0.0.1:3005/health
check_code doctor_health  http://127.0.0.1:3010/health
check_code meeting_health http://127.0.0.1:3020/health

code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 8 \
  -X POST http://127.0.0.1:3010/auth/login \
  -H "Content-Type: application/json" -H "Origin: ${DOCTOR_ORIGIN}" \
  -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"v1"}' 2>/dev/null || echo 000)"
echo "doctor_login_direct=${code}"
[[ "$code" == "200" ]] || fail=1

code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 8 \
  -X POST http://127.0.0.1:3005/api/auth/login \
  -H "Content-Type: application/json" -H "Origin: ${PATIENT_ORIGIN}" \
  -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd","deviceId":"v1"}' 2>/dev/null || echo 000)"
echo "patient_login_direct=${code}"
[[ "$code" == "200" ]] || fail=1

if [[ "$MODE" != "direct" ]] && command -v nginx >/dev/null 2>&1; then
  CURL_NG=()
  [[ "$NGINX_SCHEME" == "https" ]] && CURL_NG=(-sk)
  check_page patient_nginx patient.isara.local "$NGINX_SCHEME" Patient
  check_page doctor_nginx  doctor.isara.local  "$NGINX_SCHEME" "Izara Anywhere"
  dcode="$(curl "${CURL_NG[@]}" -o /dev/null -w '%{http_code}' --connect-timeout 10 \
    -X POST "${NGINX_SCHEME}://doctor.isara.local/auth/login" \
    -H "Content-Type: application/json" -H "Origin: ${DOCTOR_ORIGIN}" \
    -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"v1"}' 2>/dev/null || echo 000)"
  echo "doctor_login_nginx=${dcode}"
  [[ "$dcode" == "200" ]] || fail=1
  pcode="$(curl "${CURL_NG[@]}" -o /dev/null -w '%{http_code}' --connect-timeout 10 \
    -X POST "${NGINX_SCHEME}://patient.isara.local/api/auth/login" \
    -H "Content-Type: application/json" -H "Origin: ${PATIENT_ORIGIN}" \
    -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd","deviceId":"v1"}' 2>/dev/null || echo 000)"
  echo "patient_login_nginx=${pcode}"
  [[ "$pcode" == "200" ]] || fail=1
fi

exit "$fail"
