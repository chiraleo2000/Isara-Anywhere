#!/bin/bash
# =============================================================================
# IZARA TELEMEDICINE - LOCAL DOCKER DEPLOYMENT
# =============================================================================
# Deploys the full stack locally using Docker Compose
# Usage: ./deploy-local.sh [--clean] [--seed] [--rebuild]
# =============================================================================

set -e

# Parse arguments
CLEAN=false
SEED_DATA=false
REBUILD_ALL=false

for arg in "$@"; do
    case $arg in
        --clean) CLEAN=true ;;
        --seed) SEED_DATA=true ;;
        --rebuild) REBUILD_ALL=true ;;
    esac
done

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

status() { echo -e "\n${CYAN}[INFO] $1${NC}"; }
success() { echo -e "${GREEN}[OK] $1${NC}"; }
warning() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=============================================="
echo "  IZARA TELEMEDICINE - LOCAL DEPLOYMENT"
echo "=============================================="
echo "Project Root: $ROOT_DIR"

# Check Docker
status "Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker first."
fi
success "Docker is running"

cd "$ROOT_DIR"

# Clean if requested
if [ "$CLEAN" = true ]; then
    status "Cleaning up existing containers and volumes..."
    docker-compose down -v --remove-orphans 2>/dev/null || true
    success "Cleanup complete"
fi

# Build
if [ "$REBUILD_ALL" = true ]; then
    status "Rebuilding all containers from scratch..."
    docker-compose build --no-cache
else
    status "Building containers..."
    docker-compose build
fi
success "Build complete"

# Start
status "Starting containers..."
docker-compose up -d
success "Containers started"

# Wait for PostgreSQL
status "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec izara-postgres pg_isready -U postgres > /dev/null 2>&1; then
        success "PostgreSQL is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "PostgreSQL did not become ready in time"
fi

# Seed if requested
if [ "$SEED_DATA" = true ]; then
    status "Seeding database with test data..."
    SEED_FILE="$SCRIPT_DIR/database/seed-local.sql"
    if [ -f "$SEED_FILE" ]; then
        cat "$SEED_FILE" | docker exec -i izara-postgres psql -U postgres -d izara_phase1
        success "Database seeded successfully"
    else
        warning "Seed file not found: $SEED_FILE"
    fi
fi

# Show status
status "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -6

echo ""
echo "=============================================="
echo "  DEPLOYMENT COMPLETE"
echo "=============================================="
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
echo "  Patient Portal: http://localhost:3005"
echo "  Doctor Portal:  http://localhost:3010"
echo "  PgAdmin:        http://localhost:5050"
echo ""
echo -e "${YELLOW}Test Credentials:${NC}"
echo "  Patient: demo.test@gmail.com / P@ssw0rd"
echo "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024"
echo "  Admin:   admin.test@izara.com / IzaraAdmin@2024"
echo ""
echo -e "${YELLOW}Commands:${NC}"
echo "  View logs:      docker-compose logs -f"
echo "  Stop:           docker-compose down"
echo "  Reset:          ./deploy-local.sh --clean --seed"
echo ""
