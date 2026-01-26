# =============================================================================
# IZARA TELEMEDICINE - UNIFIED DEPLOYMENT SCRIPT
# =============================================================================
# Version: 4.0.0
# Updated: 2026-01-23
# 
# Usage:
#   .\scripts\deploy.ps1 -Target local    # Deploy locally with Docker
#   .\scripts\deploy.ps1 -Target cloud    # Deploy to Google Cloud Run
#   .\scripts\deploy.ps1 -Target both     # Deploy to both
#   .\scripts\deploy.ps1 -Target test     # Run tests only
# =============================================================================

param(
    [ValidateSet("local", "cloud", "both", "test")]
    [string]$Target = "local",
    [switch]$CleanData,
    [switch]$SkipTests,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "izara-telemedicine"
$REGION = "asia-southeast1"
$PATIENT_IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/isara-anywhere-portals/isara-patient-portal"
$DOCTOR_IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/isara-anywhere-portals/isara-doctor-portal"

# Colors
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

# =============================================================================
# LOCAL DEPLOYMENT
# =============================================================================

function Deploy-Local {
    Write-Info "Starting local Docker deployment..."
    
    # Ensure Docker is running
    $dockerStatus = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker is not running. Please start Docker Desktop."
        exit 1
    }
    
    # Stop existing containers
    Write-Info "Stopping existing containers..."
    docker-compose down 2>$null
    
    # Remove old volumes if clean data requested
    if ($CleanData) {
        Write-Warning "Removing old data volumes..."
        docker volume rm izara-anywhere_postgres-data 2>$null
    }
    
    # Start containers
    Write-Info "Building and starting containers..."
    docker-compose up -d --build
    
    # Wait for PostgreSQL to be ready
    Write-Info "Waiting for PostgreSQL to be ready..."
    $maxRetries = 30
    $retries = 0
    do {
        Start-Sleep -Seconds 2
        $retries++
        $null = docker exec izara-postgres pg_isready -U postgres 2>$null
    } while ($LASTEXITCODE -ne 0 -and $retries -lt $maxRetries)
    
    if ($retries -ge $maxRetries) {
        Write-Error "PostgreSQL did not start in time"
        exit 1
    }
    Write-Success "PostgreSQL is ready!"
    
    # Initialize database
    Write-Info "Initializing database..."
    docker exec -i izara-postgres psql -U postgres -d izara_phase1 -c "SELECT 1" 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker exec -i izara-postgres psql -U postgres -c "CREATE DATABASE izara_phase1"
    }
    
    # Run init script - using consolidated scripts/database path
    Get-Content ".\scripts\database\init-database.sql" | docker exec -i izara-postgres psql -U postgres -d izara_phase1
    
    Write-Success "Database initialized!"
    
    # Wait for portals to be ready
    Write-Info "Waiting for portals to be ready..."
    Start-Sleep -Seconds 10
    
    # Verify deployment
    $patientHealth = Invoke-WebRequest -Uri "http://localhost:3005" -UseBasicParsing -TimeoutSec 30
    $doctorHealth = Invoke-WebRequest -Uri "http://localhost:3010/api/health" -UseBasicParsing -TimeoutSec 30
    
    if ($patientHealth.StatusCode -eq 200 -and $doctorHealth.StatusCode -eq 200) {
        Write-Success "Local deployment complete!"
        Write-Host ""
        Write-Host "Portal URLs:" -ForegroundColor Cyan
        Write-Host "  Patient Portal: http://localhost:3005"
        Write-Host "  Doctor Portal:  http://localhost:3010"
        Write-Host "  pgAdmin:        http://localhost:5050"
        Write-Host ""
        Write-Host "Test Credentials:" -ForegroundColor Cyan
        Write-Host "  Patient: demo.test@gmail.com / P@ssw0rd"
        Write-Host "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024"
        Write-Host "  Admin:   admin.test@izara.com / IzaraAdmin@2024"
    } else {
        Write-Error "Deployment verification failed"
        exit 1
    }
}

# =============================================================================
# CLOUD DEPLOYMENT
# =============================================================================

function Deploy-Cloud {
    Write-Info "Starting Cloud Run deployment..."
    
    # Authenticate with GCP
    gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
    
    # Get current version
    $version = "1.3.0"
    
    # Build and push Patient Portal
    Write-Info "Building Patient Portal..."
    Set-Location "Isara-patient-portal"
    docker build -t "${PATIENT_IMAGE}:${version}" -f Dockerfile.unified .
    docker push "${PATIENT_IMAGE}:${version}"
    Set-Location ..
    
    # Build and push Doctor Portal
    Write-Info "Building Doctor Portal..."
    Set-Location "Isara-doctor-portal"
    docker build -t "${DOCTOR_IMAGE}:${version}" -f Dockerfile.unified .
    docker push "${DOCTOR_IMAGE}:${version}"
    Set-Location ..
    
    # Deploy to Cloud Run - Patient Portal
    Write-Info "Deploying Patient Portal to Cloud Run..."
    gcloud run deploy izara-patient-portal `
        --image "${PATIENT_IMAGE}:${version}" `
        --region $REGION `
        --platform managed `
        --allow-unauthenticated `
        --memory 1Gi `
        --cpu 1 `
        --min-instances 0 `
        --max-instances 10 `
        --set-env-vars "NODE_ENV=production"
    
    # Deploy to Cloud Run - Doctor Portal
    Write-Info "Deploying Doctor Portal to Cloud Run..."
    gcloud run deploy izara-doctor-portal `
        --image "${DOCTOR_IMAGE}:${version}" `
        --region $REGION `
        --platform managed `
        --allow-unauthenticated `
        --memory 1Gi `
        --cpu 1 `
        --min-instances 0 `
        --max-instances 10 `
        --set-env-vars "NODE_ENV=production"
    
    Write-Success "Cloud deployment complete!"
    Write-Host ""
    Write-Host "Cloud URLs:" -ForegroundColor Cyan
    Write-Host "  Patient Portal: https://izara-patient-portal-724889190329.$REGION.run.app"
    Write-Host "  Doctor Portal:  https://izara-doctor-portal-724889190329.$REGION.run.app"
}

# =============================================================================
# RUN TESTS
# =============================================================================

function Invoke-Tests {
    param(
        [string]$Environment = "local"
    )
    
    Write-Info "Running $Environment tests..."
    
    if ($Environment -eq "local") {
        # Run local tests
        npx playwright test scripts/tests/e2e/comprehensive-tests.spec.js --reporter=list
        npx playwright test scripts/tests/e2e/fetch-failure-detection.spec.js --reporter=list
    } else {
        # Run cloud tests
        $env:TEST_ENV = "cloud"
        npx playwright test scripts/tests/e2e/cloud-run-tests.spec.js --config=playwright.cloud.config.js --reporter=list
        npx playwright test scripts/tests/e2e/cloud-comprehensive-tests.spec.js --config=playwright.cloud.config.js --reporter=list
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All tests passed!"
    } else {
        Write-Error "Some tests failed"
        exit 1
    }
}

# =============================================================================
# MAIN
# =============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          IZARA TELEMEDICINE - DEPLOYMENT SCRIPT               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

switch ($Target) {
    "local" {
        Deploy-Local
        if (-not $SkipTests) {
            Run-Tests -Environment "local"
        }
    }
    "cloud" {
        Deploy-Cloud
        if (-not $SkipTests) {
            Run-Tests -Environment "cloud"
        }
    }
    "both" {
        Deploy-Local
        if (-not $SkipTests) {
            Run-Tests -Environment "local"
        }
        Deploy-Cloud
        if (-not $SkipTests) {
            Run-Tests -Environment "cloud"
        }
    }
    "test" {
        Run-Tests -Environment "local"
    }
}

Write-Host ""
Write-Success "Deployment complete!"
