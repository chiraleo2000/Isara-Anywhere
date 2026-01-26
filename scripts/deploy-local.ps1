# =============================================================================
# IZARA TELEMEDICINE - LOCAL DOCKER DEPLOYMENT
# =============================================================================
# Version: 1.4.0
# Usage: .\scripts\deploy-local.ps1
# =============================================================================

param(
    [switch]$Build,
    [switch]$Clean,
    [switch]$Seed,
    [switch]$Logs,
    [string]$Service
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " IZARA TELEMEDICINE - LOCAL DOCKER DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Change to project root
Set-Location $ProjectRoot

# Clean up if requested
if ($Clean) {
    Write-Host "[CLEAN] Stopping and removing containers..." -ForegroundColor Yellow
    docker-compose down -v --remove-orphans
    Write-Host "[CLEAN] Cleanup complete." -ForegroundColor Green
    exit 0
}

# Show logs if requested
if ($Logs) {
    if ($Service) {
        docker-compose logs -f $Service
    } else {
        docker-compose logs -f
    }
    exit 0
}

# Build and start services
Write-Host "[1/4] Building Docker images..." -ForegroundColor Yellow
if ($Build) {
    docker-compose build --no-cache
} else {
    docker-compose build
}

Write-Host ""
Write-Host "[2/4] Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "[3/4] Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check PostgreSQL
Write-Host "  Checking PostgreSQL..." -ForegroundColor Gray
$maxRetries = 30
$retryCount = 0
do {
    $retryCount++
    try {
        docker exec izara-postgres pg_isready -U postgres | Out-Null
        Write-Host "  PostgreSQL is ready!" -ForegroundColor Green
        break
    } catch {
        if ($retryCount -ge $maxRetries) {
            Write-Host "  ERROR: PostgreSQL failed to start" -ForegroundColor Red
            exit 1
        }
        Write-Host "  Waiting for PostgreSQL... ($retryCount/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
} while ($true)

# Seed database if requested or if this is first run
if ($Seed) {
    Write-Host ""
    Write-Host "[SEED] Seeding database with startup data..." -ForegroundColor Yellow
    
    # Check if init-database.sql exists
    $sqlFile = Join-Path $ProjectRoot "scripts\db\init-database.sql"
    if (Test-Path $sqlFile) {
        # Create database if it doesn't exist
        docker exec izara-postgres psql -U postgres -c "CREATE DATABASE izara_phase1" 2>$null
        
        # Run SQL script
        Get-Content $sqlFile | docker exec -i izara-postgres psql -U postgres -d izara_phase1
        Write-Host "[SEED] Database seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "[SEED] Using seeder.cjs..." -ForegroundColor Gray
        node scripts\seeder.cjs
    }
}

Write-Host ""
Write-Host "[4/4] Verifying services..." -ForegroundColor Yellow

# Check Patient Portal
$patientResponse = try { Invoke-WebRequest -Uri "http://localhost:3005/health" -UseBasicParsing -TimeoutSec 5 } catch { $null }
if ($patientResponse.StatusCode -eq 200) {
    Write-Host "  Patient Portal: OK (http://localhost:3005)" -ForegroundColor Green
} else {
    Write-Host "  Patient Portal: STARTING..." -ForegroundColor Yellow
}

# Check Doctor Portal
$doctorResponse = try { Invoke-WebRequest -Uri "http://localhost:3010/health" -UseBasicParsing -TimeoutSec 5 } catch { $null }
if ($doctorResponse.StatusCode -eq 200) {
    Write-Host "  Doctor Portal:  OK (http://localhost:3010)" -ForegroundColor Green
} else {
    Write-Host "  Doctor Portal:  STARTING..." -ForegroundColor Yellow
}

# Check Meeting Server
$meetingResponse = try { Invoke-WebRequest -Uri "http://localhost:3020/health" -UseBasicParsing -TimeoutSec 5 } catch { $null }
if ($meetingResponse.StatusCode -eq 200) {
    Write-Host "  Meeting Server: OK (http://localhost:3020)" -ForegroundColor Green
} else {
    Write-Host "  Meeting Server: STARTING..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Services:" -ForegroundColor White
Write-Host "   Patient Portal:  http://localhost:3005" -ForegroundColor Gray
Write-Host "   Doctor Portal:   http://localhost:3010" -ForegroundColor Gray
Write-Host "   Meeting Server:  http://localhost:3020" -ForegroundColor Gray
Write-Host "   PostgreSQL:      localhost:5433" -ForegroundColor Gray
Write-Host ""
Write-Host " Test Credentials:" -ForegroundColor White
Write-Host "   Patient: demo.test@gmail.com / P@ssw0rd" -ForegroundColor Gray
Write-Host "   Doctor:  doctor.test@izara.com / IzaraDoctor@2024" -ForegroundColor Gray
Write-Host "   Admin:   admin.test@izara.com / IzaraAdmin@2024" -ForegroundColor Gray
Write-Host ""
Write-Host " Commands:" -ForegroundColor White
Write-Host "   View logs:    .\scripts\deploy-local.ps1 -Logs" -ForegroundColor Gray
Write-Host "   Clean up:     .\scripts\deploy-local.ps1 -Clean" -ForegroundColor Gray
Write-Host "   Rebuild:      .\scripts\deploy-local.ps1 -Build" -ForegroundColor Gray
Write-Host "   Seed DB:      .\scripts\deploy-local.ps1 -Seed" -ForegroundColor Gray
Write-Host ""
