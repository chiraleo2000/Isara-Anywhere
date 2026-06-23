#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${1:-.env.docker}"
if [ ! -f "$ENV_FILE" ]; then
  echo "missing $ENV_FILE" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
PW="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD missing}"
USER="${POSTGRES_USER:-postgres}"
DB="${POSTGRES_DB:-izara_phase1}"
if ! docker ps --format '{{.Names}}' | grep -qx izara-postgres; then
  echo "izara-postgres not running" >&2
  exit 1
fi
docker exec izara-postgres psql -U "$USER" -d postgres -c "ALTER USER ${USER} PASSWORD '${PW}';"
ENC_PW="$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${PW}''', safe=''))")"
if grep -q '^DATABASE_URL=' "$ENV_FILE"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${USER}:${ENC_PW}@postgres:5432/${DB}|" "$ENV_FILE"
fi
if grep -q '^DB_PASSWORD=' "$ENV_FILE"; then
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${PW}|" "$ENV_FILE"
fi
echo "synced postgres password for ${USER}"
