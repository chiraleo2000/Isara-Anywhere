#!/bin/bash
set -e

echo "=================================================="
echo "Starting Izara Doctor Portal for Cloud Run"
echo "=================================================="
echo "PORT: ${PORT:-8080}"

# Use Cloud Run's PORT or default to 8080
export NGINX_PORT=${PORT:-8080}
echo "Nginx will listen on port: $NGINX_PORT"

# Generate nginx config with correct port
envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Generate environment config
envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js

# Ensure directories exist
mkdir -p /app/server/logs /var/log /var/run /var/secrets/google

echo "Environment configured"
echo "Starting all services via supervisor..."

exec /usr/bin/supervisord -c /etc/supervisord.conf
