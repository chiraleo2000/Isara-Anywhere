#!/bin/bash
set -e

echo "Starting Izara Doctor Portal (Unified)"
echo "======================================="

# Inject runtime env vars into frontend config
envsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js
mkdir -p /app/backend/logs /var/log /var/run
echo "Environment configured"

# ---- Start Embedded PostgreSQL (only when no external DB is provided) ----
if [ "${USE_EMBEDDED_PG:-false}" = "true" ] && [ -z "${DATABASE_URL}" ]; then
  echo "Starting embedded PostgreSQL..."
  if [ -z "${DB_PASSWORD}" ]; then
    echo "ERROR: DB_PASSWORD is required when USE_EMBEDDED_PG=true"
    exit 1
  fi
  export DB_HOST=localhost
  export DB_PORT=5432
  export DB_USER=postgres
  export DB_NAME="${DB_NAME:-izara_phase1}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

  # Initialize PostgreSQL data directory if empty
  if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
    echo "Initializing PostgreSQL data directory..."
    su postgres -c "initdb -D /var/lib/postgresql/data --encoding=UTF8 --locale=C"
    echo "listen_addresses = 'localhost'" >> /var/lib/postgresql/data/postgresql.conf
    echo "port = 5432" >> /var/lib/postgresql/data/postgresql.conf
    echo "max_connections = 50" >> /var/lib/postgresql/data/postgresql.conf
    echo "shared_buffers = 64MB" >> /var/lib/postgresql/data/postgresql.conf
    echo "work_mem = 4MB" >> /var/lib/postgresql/data/postgresql.conf
    echo "local all all trust" > /var/lib/postgresql/data/pg_hba.conf
    echo "host all all 127.0.0.1/32 trust" >> /var/lib/postgresql/data/pg_hba.conf
  fi

  # Start PostgreSQL
  su postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql.log start"

  # Wait for PostgreSQL to be ready
  for i in $(seq 1 30); do
    if su postgres -c "pg_isready -q" 2>/dev/null; then
      echo "PostgreSQL is ready!"
      break
    fi
    echo "Waiting for PostgreSQL... attempt $i/30"
    sleep 1
  done

  # Create database if not exists
  DB_EXISTS=$(su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" 2>/dev/null || echo "")
  if [ "$DB_EXISTS" != "1" ]; then
    su postgres -c "createdb ${DB_NAME}"
  fi

  # Run initialization SQL if tables are missing
  TABLE_COUNT=$(su postgres -c "psql -tAc 'SELECT count(*) FROM information_schema.tables WHERE table_schema='"'"'public'"'"'' ${DB_NAME}" 2>/dev/null | tr -d ' \n' || echo "0")
  if [ "${TABLE_COUNT:-0}" -lt "5" ] 2>/dev/null; then
    echo "Running database initialization..."
    if [ -f /app/database/01-init.sql ]; then
      su postgres -c "psql -d ${DB_NAME} -f /app/database/01-init.sql" 2>&1 || true
      echo "Database initialized from SQL file"
    else
      echo "No init SQL found - tables will be created by app migrations"
    fi
  else
    echo "Database already initialized (${TABLE_COUNT} tables)"
  fi
  echo "Embedded PostgreSQL running on localhost:5432"
else
  echo "Using external database: ${DB_HOST:-external}:${DB_PORT:-5432}"
fi

# GCS API server removed — no GCS in this deployment.

# Start Auth server
echo "Starting Auth server (port 3011)..."
cd /app && NODE_ENV=production AUTH_PORT=3011 node /app/backend/authServer.cjs &
sleep 3

# Start Main API server (in background)
echo "Starting Main API server (port 3009)..."
cd /app && MAIN_API_PORT=3009 PORT=3009 node /app/backend/mainApiServer.cjs &
sleep 5

# Wait for Main API to be ready
echo "Waiting for Main API server to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3009/api/health > /dev/null 2>&1; then
    echo "Main API server is ready!"
    break
  fi
  echo "Waiting... attempt $i/30"
  sleep 1
done

# Start nginx last (after all backends are ready)
echo "Starting nginx..."
exec /usr/sbin/nginx -g "daemon off;"
