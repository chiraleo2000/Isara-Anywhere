#!/bin/bash
set -e

echo "Starting Izara Patient Portal (Unified)"
echo "======================================="

# Inject runtime env vars into frontend config (LAN URL changes without image rebuild)
if [ -f /app/dist/env-config.template.js ]; then
  envsubst < /app/dist/env-config.template.js > /app/dist/env-config.js
  echo "Environment configured (env-config.js)"
else
  echo "WARN: /app/dist/env-config.template.js missing — runtime ENV injection skipped"
fi

# ---- Start Embedded PostgreSQL (only when no external DB is provided) ----
if [ "${USE_EMBEDDED_PG:-true}" = "true" ] && [ -z "${DATABASE_URL}" ]; then
  echo "Starting embedded PostgreSQL..."
  export DB_HOST=localhost
  export DB_PORT=5432
  export DB_USER=postgres
  export DB_PASSWORD="${DB_PASSWORD:-IzaraDb2024}"
  export DB_NAME="${DB_NAME:-izara_phase1}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

  if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
    echo "Initializing PostgreSQL data directory..."
    su postgres -c "initdb -D /var/lib/postgresql/data --encoding=UTF8 --locale=C"
    echo "listen_addresses = 'localhost'" >> /var/lib/postgresql/data/postgresql.conf
    echo "port = 5432" >> /var/lib/postgresql/data/postgresql.conf
    echo "max_connections = 50" >> /var/lib/postgresql/data/postgresql.conf
    echo "shared_buffers = 64MB" >> /var/lib/postgresql/data/postgresql.conf
    echo "local all all trust" > /var/lib/postgresql/data/pg_hba.conf
    echo "host all all 127.0.0.1/32 trust" >> /var/lib/postgresql/data/pg_hba.conf
  fi

  su postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql.log start"

  for i in $(seq 1 30); do
    if su postgres -c "pg_isready -q" 2>/dev/null; then
      echo "PostgreSQL is ready!"
      break
    fi
    echo "Waiting for PostgreSQL... attempt $i/30"
    sleep 1
  done

  su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'\"" | grep -q 1 || \
    su postgres -c "createdb ${DB_NAME}"

  TABLE_COUNT=$(su postgres -c "psql -t -c \
    \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\" ${DB_NAME}" | tr -d " ")
  if [ "${TABLE_COUNT:-0}" -lt "5" ] 2>/dev/null; then
    echo "Running database initialization..."
    if [ -f /app/database/01-init.sql ]; then
      su postgres -c "psql -d ${DB_NAME} -f /app/database/01-init.sql" 2>&1 || true
    fi
  else
    echo "Database already initialized (${TABLE_COUNT} tables)"
  fi
  echo "Embedded PostgreSQL running on localhost:5432"
else
  echo "Using external database: ${DB_HOST:-external}:${DB_PORT:-5432}"
fi

echo "Starting Izara Patient Portal server..."
exec npx tsx backend/index.ts
