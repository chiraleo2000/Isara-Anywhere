#!/usr/bin/env bash
# Quick smoke test for Docker localhost meeting stack (3005 / 3010 / 3020)
set -euo pipefail

echo "== Izara meeting smoke =="
curl -sf http://localhost:3020/health | head -c 200
echo ""
curl -sf http://localhost:3005/health | head -c 200
echo ""
curl -sf http://localhost:3010/health | head -c 200
echo ""
echo "OK — all three services healthy"
