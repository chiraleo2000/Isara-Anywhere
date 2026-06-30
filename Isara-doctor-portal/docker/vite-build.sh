#!/bin/sh
# Optional BuildKit secret vite_build_env (KEY=value lines) for Vite embed — not stored in image layers.
set -e
if [ -f /run/secrets/vite_build_env ]; then
  set -a
  # shellcheck disable=SC1091
  . /run/secrets/vite_build_env
  set +a
fi
chmod -R a+x node_modules/.bin 2>/dev/null || true
exec node ./node_modules/vite/bin/vite.js build
