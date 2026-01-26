#!/bin/bash
set -e

echo "Starting Izara Patient Portal..."

# Inject environment variables into config file
envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js

echo "Environment configuration injected"

# Start nginx
exec "$@"
