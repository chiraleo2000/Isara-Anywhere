#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${1:-.env.docker}"
fail=0
check() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 "$url" 2>/dev/null || echo 000)"
  echo "${name}=${code}"
  [ "$code" = "200" ] || fail=1
}
check patient_health http://127.0.0.1:3005/health
check doctor_health http://127.0.0.1:3010/health
check meeting_health http://127.0.0.1:3020/health
code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 -X POST http://127.0.0.1:3010/auth/login -H 'Content-Type: application/json' -H 'Origin: https://doctor.isara.local' -d '{"email":"admin.test@izara.com","password":"IzaraAdmin@2024","deviceId":"verify-1"}' 2>/dev/null || echo 000)"
echo "doctor_login=${code}"
[ "$code" = "200" ] || fail=1
code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 -X POST http://127.0.0.1:3005/api/auth/login -H 'Content-Type: application/json' -H 'Origin: https://patient.isara.local' -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd","deviceId":"verify-1"}' 2>/dev/null || echo 000)"
echo "patient_login=${code}"
[ "$code" = "200" ] || fail=1
exit "$fail"
