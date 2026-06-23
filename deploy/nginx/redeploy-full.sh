#!/usr/bin/env bash
# Full Docker rebuild + Nginx reload + diagnose (Ubuntu Mode B LAN).
#
# Run from repo root:
#   bash deploy/nginx/redeploy-full.sh
#
# Background (logs to reports/redeploy-*.log):
#   bash deploy/nginx/redeploy-full.sh --background --pull
#   tail -f reports/redeploy-YYYYMMDD-HHMMSS.log
#
# Do NOT use: sudo bash ... (permission issues). Add your user to the docker group.
# If you see "$'\r': command not found", run once:
#   sed -i 's/\r$//' deploy/nginx/*.sh

# --- Background must run before "set -euo pipefail" (CRLF-safe bootstrap) ---
_self="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "${_self}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ "${1:-}" == "--background" ]]; then
  shift
  mkdir -p "${REPO_ROOT}/reports"
  LOG="${REPO_ROOT}/reports/redeploy-$(date +%Y%m%d-%H%M%S).log"
  # Strip CRLF from deploy scripts before nohup (Windows checkout → Ubuntu)
  for _f in "${SCRIPT_DIR}"/*.sh; do
    [[ -f "${_f}" ]] || continue
    if grep -q $'\r' "${_f}" 2>/dev/null; then
      sed -i 's/\r$//' "${_f}"
    fi
  done
  nohup bash "${SCRIPT_DIR}/redeploy-full.sh" "$@" >"${LOG}" 2>&1 &
  pid=$!
  echo "Redeploy started in background (PID ${pid})"
  echo "Log: ${LOG}"
  echo "Tail: tail -f ${LOG}"
  exit 0
fi

set -euo pipefail

usage() {
  cat <<'EOF'
Full Docker rebuild + Nginx reload + diagnose (Ubuntu Mode B LAN).

Usage:
  bash deploy/nginx/redeploy-full.sh [options]

Options:
  --background     detach via nohup; prints PID and log path
  --env-file PATH  default: .env.docker
  --pull           git pull before rebuild
  --skip-nginx     Docker only (no Nginx copy/reload/diagnose)
  --no-down        skip compose down (rebuild in place)
  --prune-docker   prune unused Docker images/build cache before build (frees disk)
  -h, --help       show this help
EOF
  exit "${1:-0}"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage 0
fi

ENV_FILE=".env.docker"
DO_GIT_PULL=0
SKIP_NGINX=0
DO_DOWN=1
PRUNE_DOCKER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:?missing path after --env-file}"
      shift 2
      ;;
    --pull)
      DO_GIT_PULL=1
      shift
      ;;
    --skip-nginx)
      SKIP_NGINX=1
      shift
      ;;
    --no-down)
      DO_DOWN=0
      shift
      ;;
    --prune-docker)
      PRUNE_DOCKER=1
      shift
      ;;
    -h | --help)
      usage 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage 1
      ;;
  esac
done

cd "${REPO_ROOT}"
echo "=== Izara full redeploy ==="
echo "Repo:    ${REPO_ROOT}"
echo "Env:     ${ENV_FILE}"
echo "Started: $(date -Is 2>/dev/null || date)"
echo ""

echo "--- Disk space ---"
df -h / 2>/dev/null || true
if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null || true
fi
_avail_kb="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}' || echo 9999999)"
if [[ "${_avail_kb}" -lt 3145728 ]]; then
  echo "WARN: root filesystem has less than 3 GiB free — builds often fail (vite, npm, layers)." >&2
  echo "  docker system prune -af && docker builder prune -af" >&2
  echo "  sudo truncate -s 0 /var/log/nginx/access.log /var/log/nginx/error.log" >&2
  echo "  sudo journalctl --vacuum-size=200M" >&2
  if [[ "${PRUNE_DOCKER:-0}" -ne 1 ]]; then
    echo "  Re-run with --prune-docker to prune unused Docker data before build." >&2
  fi
fi
echo ""

# shellcheck source=compose.sh
source "${SCRIPT_DIR}/compose.sh"

for f in "${SCRIPT_DIR}"/*.sh; do
  if [[ -f "$f" ]] && grep -q $'\r' "$f" 2>/dev/null; then
    sed -i 's/\r$//' "$f"
    echo "Fixed CRLF: $f"
  fi
done

if [[ "${DO_GIT_PULL}" -eq 1 ]]; then
  echo "--- git pull ---"
  git pull
  echo ""
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found in ${REPO_ROOT}" >&2
  echo "  cp .env.docker.lan.example .env.docker   # Mode B LAN" >&2
  echo "  cp .env.docker.example .env.docker       # Mode A localhost" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not in PATH. Install Docker and add your user to group 'docker'." >&2
  exit 1
fi

if docker info >/dev/null 2>&1; then
  :
elif groups 2>/dev/null | grep -q docker; then
  echo "ERROR: docker daemon not reachable. Try: sudo systemctl start docker" >&2
  exit 1
else
  echo "ERROR: cannot run docker (permission denied). Do not use sudo docker-compose." >&2
  echo "  sudo usermod -aG docker \$USER && newgrp docker" >&2
  exit 1
fi

if [[ "${PRUNE_DOCKER}" -eq 1 ]]; then
  echo "--- Docker prune (unused images + build cache) ---"
  docker system prune -af 2>/dev/null || true
  docker builder prune -af 2>/dev/null || true
  echo ""
fi

echo "--- Docker compose down ---"
if [[ "${DO_DOWN}" -eq 1 ]]; then
  compose --env-file "${ENV_FILE}" down
else
  echo "(skipped --no-down)"
fi
echo ""

echo "--- Docker compose up -d --build (full stack) ---"
compose --env-file "${ENV_FILE}" up -d --build
echo ""

wait_health() {
  local port="$1"
  local name="$2"
  local max="${3:-180}"
  local elapsed=0
  local code="000"
  while [[ "${elapsed}" -lt "${max}" ]]; do
    code="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1:${port}/health" 2>/dev/null || echo "000")"
    if [[ "${code}" == "200" ]]; then
      echo "OK  ${name} http://127.0.0.1:${port}/health → HTTP 200 (${elapsed}s)"
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    echo "…   ${name} :${port} waiting (${elapsed}s, last HTTP ${code})"
  done
  echo "WARN ${name} :${port}/health not ready after ${max}s (last HTTP ${code})" >&2
  return 1
}

echo "--- Health checks ---"
health_ok=1
wait_health 3005 "Patient" 180 || health_ok=0
wait_health 3010 "Doctor"  180 || health_ok=0
wait_health 3020 "Meeting" 180 || health_ok=0
echo ""

if [[ "${SKIP_NGINX}" -eq 0 ]]; then
  if command -v nginx >/dev/null 2>&1; then
    echo "--- Nginx config ---"
    sudo cp "${SCRIPT_DIR}/isara-system.conf" /etc/nginx/sites-available/isara-system
    sudo ln -sf /etc/nginx/sites-available/isara-system /etc/nginx/sites-enabled/isara-system
    sudo nginx -t
    sudo systemctl reload nginx
    echo "Nginx reloaded."
    echo ""
  else
    echo "--- Nginx (skipped: nginx not installed) ---"
    echo "Use --skip-nginx on hosts without Nginx (Mode A localhost only)."
    echo ""
  fi

  echo "--- diagnose-502.sh ---"
  bash "${SCRIPT_DIR}/diagnose-502.sh"
else
  echo "--- Nginx + diagnose skipped (--skip-nginx) ---"
  echo "Doctor health: $(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 http://127.0.0.1:3010/health 2>/dev/null || echo 000)"
fi

echo ""
echo "=== Redeploy finished: $(date -Is 2>/dev/null || date) ==="
if [[ "${health_ok}" -eq 0 ]]; then
  echo "One or more health checks failed — see logs above or: docker compose --env-file ${ENV_FILE} logs --tail 50"
  exit 1
fi
