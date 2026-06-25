#!/usr/bin/env bash
# One-shot redeploy on Ubuntu for *.demotoday.net (run from repo root as ubuntu user)
#   cd ~/Isara-Anywhere && bash deploy/nginx/redeploy-demotoday.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

echo "=== Izara redeploy → demotoday.net ==="

if [[ ! -f .env.docker ]]; then
  cp .env.docker.lan.https.example .env.docker
  echo "Created .env.docker from HTTPS example — edit secrets if needed."
fi

# Remove old isara.local hosts entries (optional cleanup)
sudo sed -i '/isara\.local/d' /etc/hosts 2>/dev/null || true

bash deploy/nginx/deploy.sh "$@"

echo ""
echo "=== Done. On Windows, update hosts file — see deploy/nginx/WINDOWS_CLIENT_SETUP.md ==="
