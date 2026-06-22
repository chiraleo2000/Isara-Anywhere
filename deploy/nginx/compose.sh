#!/usr/bin/env bash
# Unified Docker Compose wrapper — V2 plugin (docker compose) or V1 (docker-compose).
# Usage: source deploy/nginx/compose.sh && compose up -d --build
#    or: bash deploy/nginx/compose.sh up -d --build

set -euo pipefail

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "ERROR: Neither 'docker compose' (plugin) nor 'docker-compose' found." >&2
    echo "  Ubuntu: sudo apt install docker-compose-plugin" >&2
    echo "  Or:     sudo apt install docker-compose" >&2
    return 127
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  compose "$@"
fi
