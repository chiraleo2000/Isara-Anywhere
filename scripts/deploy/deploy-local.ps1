# =============================================================================
# IZARA TELEMEDICINE - LOCAL DOCKER DEPLOYMENT
# =============================================================================
# Deploys the full stack locally using Docker Compose
# Usage: .\deploy-local.ps1 [-Clean] [-SeedData] [-RebuildAll]
# =============================================================================

param(
    [switch]$Clean,        # Remove all containers and volumes first
    [switch]$SeedData,     # Run seed data after deployment
    [switch]$RebuildAll    # Rebuild all containers from scratch
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Status { param($msg) Write-Host "`n[INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Get script and project directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "=============================================="
Write-Host "  IZARA TELEMEDICINE - LOCAL DEPLOYMENT"
Write-Host "=============================================="
Write-Host "Project Root: $RootDir"

# Check Docker is running
Write-Status "Checking Docker status..."
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running. Please start Docker Desktop first."
    exit 1
}
Write-Success "Docker is running"

# Navigate to project root
Set-Location $RootDir

# Clean if requested
if ($Clean) {
    Write-Status "Cleaning up existing containers and volumes..."
    docker-compose down -v --remove-orphans 2>$null
    Write-Success "Cleanup complete"
}

# Build containers
if ($RebuildAll) {
    Write-Status "Rebuilding all containers from scratch..."
    docker-compose build --no-cache
} else {
    Write-Status "Building containers..."
    docker-compose build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed"
    exit 1
}
Write-Success "Build complete"

# Start containers
Write-Status "Starting containers..."
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start containers"
    exit 1
}
Write-Success "Containers started"

# Wait for PostgreSQL to be ready
Write-Status "Waiting for PostgreSQL to be ready..."
$maxRetries = 30
$retryCount = 0
while ($retryCount -lt $maxRetries) {
    $pgReady = docker exec izara-postgres pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "PostgreSQL is ready"
        break
    }
    $retryCount++
    Start-Sleep -Seconds 2
}

if ($retryCount -eq $maxRetries) {
    Write-Error "PostgreSQL did not become ready in time"
    exit 1
}

# Seed data if requested
if ($SeedData) {
    Write-Status "Seeding database with test data..."
    $seedFile = Join-Path $ScriptDir "database\seed-local.sql"
    if (Test-Path $seedFile) {
        Get-Content $seedFile | docker exec -i izara-postgres psql -U postgres -d izara_phase1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database seeded successfully"
        } else {
            Write-Warning "Seed data may have partial errors - check output above"
        }
    } else {
        Write-Warning "Seed file not found: $seedFile"
    }
}

# Show container status
Write-Status "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-Object -First 6

# Show access URLs
Write-Host "`n=============================================="
Write-Host "  DEPLOYMENT COMPLETE"
Write-Host "=============================================="
Write-Host "`nAccess URLs:" -ForegroundColor Yellow
Write-Host "  Patient Portal: http://localhost:3005"
Write-Host "  Doctor Portal:  http://localhost:3010"
Write-Host "  PgAdmin:        http://localhost:5050"
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Patient: demo.test@gmail.com / P@ssw0rd"
Write-Host "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024"
Write-Host "  Admin:   admin.test@izara.com / IzaraAdmin@2024"
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  View logs:      docker-compose logs -f"
Write-Host "  Stop:           docker-compose down"
Write-Host "  Reset:          .\deploy-local.ps1 -Clean -SeedData"
Write-Host ""
