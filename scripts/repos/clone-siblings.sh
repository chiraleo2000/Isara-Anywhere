#!/usr/bin/env bash
# Clone sibling repos for split layout (optional — monorepo default).
set -euo pipefail

PARENT="${1:-$(dirname "$(pwd)")}"
ORG="${GITHUB_ORG:-YOUR_ORG}"

repos=(
  "Isara-patient-portal"
  "Isara-doctor-portal"
  "Izara-jitsi-server"
  "Isara-Anywhere"
)

mkdir -p "$PARENT"
cd "$PARENT"

for repo in "${repos[@]}"; do
  if [ -d "$repo/.git" ]; then
    echo "skip $repo (exists)"
    continue
  fi
  echo "clone $repo..."
  git clone "git@github.com:${ORG}/${repo}.git" "$repo" || echo "warn: clone failed for $repo"
done

echo ""
echo "Sibling layout under $PARENT:"
ls -la
