#!/bin/bash
# =============================================================================
# IZARA DEV-TESTING — GCE VM PostgreSQL Startup Script
# Installs PostgreSQL 16 + pgvector, configures remote access
# =============================================================================
set -e

echo "=== IZARA: Installing PostgreSQL 16 ==="

# Install PostgreSQL 16
apt-get update
apt-get install -y gnupg2 lsb-release curl ca-certificates

# Add PostgreSQL APT repo
echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update
apt-get install -y postgresql-16 postgresql-16-pgvector

echo "=== IZARA: Configuring PostgreSQL ==="

# Configure PostgreSQL for remote access
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
PG_CONF="/etc/postgresql/16/main/postgresql.conf"

# Listen on all interfaces
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONF

# Allow password auth from any IP (dev-testing only)
echo "host all all 0.0.0.0/0 scram-sha-256" >> $PG_HBA

# Increase shared buffers for pgvector
sed -i "s/shared_buffers = 128MB/shared_buffers = 256MB/" $PG_CONF

# Restart PostgreSQL
systemctl restart postgresql

echo "=== IZARA: Creating database and user ==="

# Create database and load extensions
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD:?POSTGRES_PASSWORD environment variable is required}';"
sudo -u postgres psql -c "CREATE DATABASE izara_phase1 OWNER postgres;"
sudo -u postgres psql -d izara_phase1 -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d izara_phase1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -d izara_phase1 -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "=== IZARA: PostgreSQL ready on port 5432 ==="
echo "=== Database: izara_phase1, User: postgres ==="
echo "=== Schema will be loaded after VM is ready ==="
