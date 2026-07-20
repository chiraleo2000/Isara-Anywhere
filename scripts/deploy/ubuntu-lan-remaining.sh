#!/usr/bin/env bash
# Ubuntu LAN — remaining plan steps (d7 + j8): Postgres dir, Jitsi, Nginx meet vhost, verify.
# Run ON the Ubuntu server from repo root:
#   bash scripts/deploy/ubuntu-lan-remaining.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

export LAN_SERVER_IP="${LAN_SERVER_IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"

echo "=== Ubuntu LAN remaining (IP=${LAN_SERVER_IP}) ==="

sudo mkdir -p /var/lib/izara/postgres
sudo chown 999:999 /var/lib/izara/postgres

if [[ ! -f .env.docker ]]; then
  cp .env.docker.lan.https.example .env.docker
  echo "Created .env.docker from lan.https.example — edit secrets if needed"
fi

if [[ ! -d deploy/jitsi/docker-jitsi-meet ]]; then
  echo "Cloning docker-jitsi-meet..."
  git clone --depth 1 --branch stable-9646 \
    https://github.com/jitsi/docker-jitsi-meet.git deploy/jitsi/docker-jitsi-meet
fi

sed -i 's/\r$//' deploy/nginx/*.sh scripts/deploy/*.sh scripts/docker/*.sh 2>/dev/null || true

bash deploy/nginx/deploy.sh "$@"

echo "--- Post-deploy verify ---"
bash scripts/docker/verify-stack.sh https
bash deploy/nginx/diagnose.sh

echo ""
echo "On Windows (Admin): .\\deploy\\nginx\\windows-update-hosts.ps1"
echo "Then from dev PC:"
echo "  MEETING_URL=https://meeting.demotoday.net DOCTOR_URL=https://doctor.demotoday.net npm run docker:meeting-api-smoke"
echo "  npm run test:lan:deploy-gate"
