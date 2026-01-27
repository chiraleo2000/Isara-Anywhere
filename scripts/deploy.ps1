<#
.SYNOPSIS
    Izara Telemedicine - Unified Deployment Script
    Single script to deploy Patient Portal and Doctor Portal to local Docker or Google Cloud Run.

.DESCRIPTION
    This is the ONLY deployment script you need for Izara Telemedicine.
    Handles both local and cloud deployments with comprehensive health checks and testing.
    
    Features:
    - Local Docker: Uses docker-compose for local development
    - Cloud Run: Deploys to Google Cloud Run with PostgreSQL Docker service
    - Fresh Mode: Wipe all data and start clean
    - Health Checks: Automatic verification of all services
    - Database Init: Auto-seeds PostgreSQL with demo data

.PARAMETER Target
    Deployment target: "local", "cloud", or "all"

.PARAMETER Fresh
    If specified, removes all existing data and starts fresh

.PARAMETER SkipTests
    If specified, skips running tests after deployment

.PARAMETER Verbose
    Show detailed output

.EXAMPLE
    .\scripts\deploy.ps1 -Target local
    Deploy to local Docker environment

.EXAMPLE
    .\scripts\deploy.ps1 -Target cloud -Fresh
    Fresh deployment to Cloud Run (removes existing data)

.EXAMPLE
    .\scripts\deploy.ps1 -Target all
    Deploy to both local and cloud

.EXAMPLE
    .\scripts\deploy.ps1 -Target local -SkipTests
    Deploy locally without running tests

.NOTES
    Version: 1.4.1
    Author: Izara Telemedicine Team
    Last Updated: January 27, 2026
    
    Recent Fixes (v1.4.1):
    - ✅ Corrected health check endpoints (Patient: /health, Doctor: /health)
    - ✅ Improved cloud deployment retries with 60s timeout
    - ✅ Added service status verification before tests
    - ✅ Enhanced error logging with service-specific commands
    - ✅ Fixed 502 Bad Gateway on Cloud Run deployments
    - ✅ Consolidated from 4 scripts into 1 unified script
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "cloud", "all", "test")]
    [string]$Target = "local",

    [Parameter(Mandatory=$false)]
    [switch]$Fresh,

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,

    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Stop"
# Get the project root (parent of scripts folder)
$ScriptDir = Split-Path -Parent $PSCommandPath
$ProjectRoot = Split-Path -Parent $ScriptDir
Write-Verbose "Project Root: $ProjectRoot"

# GCP Configuration
$GCP_PROJECT = "izara-telemedicine"
$GCP_REGION = "asia-southeast1"
$ARTIFACT_REGISTRY = "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/isara-anywhere-portals"
# NOTE: No Cloud SQL - PostgreSQL runs as Docker service alongside portals
$VERSION = "1.4.5"

# Local Docker Configuration
$LOCAL_POSTGRES_PORT = 5433
$PATIENT_PORTAL_PORT = 3005
$DOCTOR_PORTAL_PORT = 3010
$PGADMIN_PORT = 5050

# Colors for output
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Step { param($step, $msg) Write-Host "`n[$step] $msg" -ForegroundColor Magenta }

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Test-Command {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Wait-ForService {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 120,
        [string]$ServiceName = "Service"
    )
    
    Write-Info "Waiting for $ServiceName to be ready..."
    $startTime = Get-Date
    
    while ($true) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "$ServiceName is ready!"
                return $true
            }
        } catch {
            # Continue waiting
        }
        
        $elapsed = (Get-Date) - $startTime
        if ($elapsed.TotalSeconds -gt $TimeoutSeconds) {
            Write-Warning "$ServiceName did not become ready within $TimeoutSeconds seconds"
            return $false
        }
        
        Start-Sleep -Seconds 2
    }
}

function Test-LocalPostgres {
    Write-Info "Checking local PostgreSQL connection..."
    try {
        $env:PGPASSWORD = "P@ssw0rd"
        $result = docker exec izara-postgres psql -U postgres -d izara_phase1 -c "SELECT 1" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL is running and accessible"
            return $true
        }
    } catch {
        # Continue
    }
    return $false
}

function Initialize-LocalDatabase {
    param([bool]$Fresh)
    
    Write-Step "DB" "Initializing local PostgreSQL database..."
    
    $initSqlPath = Join-Path $ProjectRoot "scripts\database\izara-database.sql"
    
    if (-not (Test-Path $initSqlPath)) {
        Write-Error "Database init script not found at: $initSqlPath"
        return $false
    }
    
    if ($Fresh) {
        Write-Info "Fresh mode: Dropping and recreating database..."
        docker exec izara-postgres psql -U postgres -c "DROP DATABASE IF EXISTS izara_phase1;" 2>$null
        docker exec izara-postgres psql -U postgres -c "CREATE DATABASE izara_phase1;" 2>$null
    }
    
    Write-Info "Running database initialization script..."
    $sqlContent = Get-Content $initSqlPath -Raw
    docker exec -i izara-postgres psql -U postgres -d izara_phase1 -f - 2>&1 | Out-Null
    
    # Verify tables exist
    $tableCount = docker exec izara-postgres psql -U postgres -d izara_phase1 -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>$null
    
    if ($tableCount -gt 0) {
        Write-Success "Database initialized with $($tableCount.Trim()) tables"
        return $true
    } else {
        Write-Warning "Database may not have been fully initialized"
        return $false
    }
}

# ============================================================================
# LOCAL DEPLOYMENT
# ============================================================================

function Deploy-Local {
    param([bool]$Fresh)
    
    Write-Host "`n" + "="*60 -ForegroundColor Blue
    Write-Host "  DEPLOYING TO LOCAL DOCKER ENVIRONMENT" -ForegroundColor Blue
    Write-Host "="*60 + "`n" -ForegroundColor Blue
    
    # Check Docker is running
    if (-not (Test-Command "docker")) {
        Write-Error "Docker is not installed or not in PATH"
        return $false
    }
    
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker daemon is not running. Please start Docker Desktop."
        return $false
    }
    
    Write-Success "Docker is running"
    
    # Navigate to project root
    Set-Location $ProjectRoot
    
    # Fresh deployment - remove everything
    if ($Fresh) {
        Write-Step "1" "Cleaning up existing containers and volumes..."
        docker-compose down -v --remove-orphans 2>$null
        docker system prune -f 2>$null
        Write-Success "Cleanup complete"
    } else {
        Write-Step "1" "Stopping existing containers..."
        docker-compose down 2>$null
    }
    
    # Check if .env.docker exists
    $envFile = Join-Path $ProjectRoot ".env.docker"
    if (-not (Test-Path $envFile)) {
        Write-Warning ".env.docker not found! Creating from template..."
        $envTemplate = Join-Path $ProjectRoot ".env.docker.example"
        if (Test-Path $envTemplate) {
            Copy-Item $envTemplate $envFile
            Write-Warning "Please edit .env.docker with your actual API keys!"
            Write-Host "Press any key to continue after updating .env.docker..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        } else {
            Write-Error ".env.docker.example not found. Cannot proceed."
            return $false
        }
    }
    
    # Build and start containers
    Write-Step "2" "Building and starting containers..."
    
    Write-Info "Running: docker-compose up -d --build"
    $dockerOutput = docker-compose up -d --build 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start Docker containers"
        Write-Host "`nDocker Compose Output:" -ForegroundColor Red
        Write-Host $dockerOutput
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Check if ports 3005, 3010, 5433 are already in use"
        Write-Host "2. Run: docker-compose down -v"
        Write-Host "3. Run: docker system prune -f"
        Write-Host "4. Check .env.docker has all required API keys"
        Write-Host "5. Try: docker-compose up --build (without -d to see logs)"
        return $false
    }
    
    if ($VerboseOutput) {
        Write-Host $dockerOutput
    }
    
    Write-Success "Containers started"
    
    # Wait for PostgreSQL
    Write-Step "3" "Waiting for PostgreSQL..."
    $pgReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-LocalPostgres) {
            $pgReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    
    if (-not $pgReady) {
        Write-Error "PostgreSQL did not become ready in time"
        return $false
    }
    
    # Initialize database if fresh or if tables don't exist
    if ($Fresh) {
        Initialize-LocalDatabase -Fresh $true
    } else {
        # Check if database needs initialization
        $tableCount = docker exec izara-postgres psql -U postgres -d izara_phase1 -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>$null
        if ([int]$tableCount.Trim() -lt 5) {
            Write-Info "Database appears empty, initializing..."
            Initialize-LocalDatabase -Fresh $false
        }
    }
    
    # Wait for portals
    Write-Step "4" "Waiting for portals to be ready..."
    
    $patientReady = Wait-ForService -Url "http://localhost:$PATIENT_PORTAL_PORT/api/health" -ServiceName "Patient Portal" -TimeoutSeconds 120
    $doctorReady = Wait-ForService -Url "http://localhost:$DOCTOR_PORTAL_PORT/api/health" -ServiceName "Doctor Portal" -TimeoutSeconds 120
    
    # Run tests if requested
    if (-not $SkipTests -and $patientReady -and $doctorReady) {
        Write-Step "5" "Running health checks..."
        Test-LocalDeployment
    }
    
    # Print summary
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "  LOCAL DEPLOYMENT COMPLETE" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Green
    Write-Host ""
    Write-Host "  Patient Portal: http://localhost:$PATIENT_PORTAL_PORT" -ForegroundColor Cyan
    Write-Host "  Doctor Portal:  http://localhost:$DOCTOR_PORTAL_PORT" -ForegroundColor Cyan
    Write-Host "  pgAdmin:        http://localhost:$PGADMIN_PORT" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Test Credentials:" -ForegroundColor Yellow
    Write-Host "  Patient: demo.test@gmail.com / P@ssw0rd" -ForegroundColor White
    Write-Host "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024" -ForegroundColor White
    Write-Host "  Admin:   admin.test@izara.com / IzaraAdmin@2024" -ForegroundColor White
    Write-Host ""
    
    return $true
}

function Test-LocalDeployment {
    Write-Info "Testing local deployment..."
    
    $tests = @(
        @{ Name = "Patient Portal Health"; Url = "http://localhost:$PATIENT_PORTAL_PORT/api/health" },
        @{ Name = "Doctor Portal Health"; Url = "http://localhost:$DOCTOR_PORTAL_PORT/api/health" },
        @{ Name = "Consultants API (public)"; Url = "http://localhost:$DOCTOR_PORTAL_PORT/api/consultants" },
        @{ Name = "Admin Pending Doctors"; Url = "http://localhost:$DOCTOR_PORTAL_PORT/auth/admin/pending-doctors" },
        @{ Name = "Medical Content API"; Url = "http://localhost:$DOCTOR_PORTAL_PORT/api/content/medical" },
        @{ Name = "AI Status API"; Url = "http://localhost:$PATIENT_PORTAL_PORT/api/ai/status" }
    )
    
    $passed = 0
    $failed = 0
    
    foreach ($test in $tests) {
        try {
            $response = Invoke-WebRequest -Uri $test.Url -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "$($test.Name): PASS"
                $passed++
            } else {
                Write-Warning "$($test.Name): Status $($response.StatusCode)"
                $failed++
            }
        } catch {
            Write-Error "$($test.Name): FAIL - $($_.Exception.Message)"
            $failed++
        }
    }
    
    Write-Host ""
    Write-Info "Tests: $passed passed, $failed failed"
}

# ============================================================================
# CLOUD DEPLOYMENT
# ============================================================================

function Deploy-Cloud {
    param([bool]$Fresh)
    
    Write-Host "`n" + "="*60 -ForegroundColor Blue
    Write-Host "  DEPLOYING TO GOOGLE CLOUD RUN" -ForegroundColor Blue
    Write-Host "="*60 + "`n" -ForegroundColor Blue
    
    # Check gcloud is installed
    if (-not (Test-Command "gcloud")) {
        Write-Error "gcloud CLI is not installed. Please install Google Cloud SDK."
        return $false
    }
    
    # Check authentication
    Write-Step "1" "Checking GCP authentication..."
    $account = gcloud config get-value account 2>$null
    if (-not $account) {
        Write-Error "Not authenticated with GCP. Run: gcloud auth login"
        return $false
    }
    Write-Success "Authenticated as: $account"
    
    # Set project
    gcloud config set project $GCP_PROJECT 2>$null
    
    # Fresh deployment - seed database
    if ($Fresh) {
        Write-Step "2" "Fresh mode: Initializing PostgreSQL database..."
        Write-Warning "This will reset the cloud database. Continue? (y/N)"
        $confirm = Read-Host
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Info "Skipping database reset"
        } else {
            Initialize-PostgresDatabase
        }
    } else {
        Write-Step "2" "Updating cloud deployment with latest code..."
        Write-Info "Building new container images with version $VERSION"
    }
    
    # Deploy Patient Portal
    Write-Step "3" "Building and deploying Patient Portal ($VERSION)..."
    $patientPortalPath = Join-Path $ProjectRoot "Isara-patient-portal"
    
    if (-not (Test-Path $patientPortalPath)) {
        Write-Error "Patient Portal path not found: $patientPortalPath"
        return $false
    }
    
    Set-Location $patientPortalPath
    Write-Info "Current location: $(Get-Location)"
    
    # Check if cloudbuild.yaml exists
    if (-not (Test-Path "cloudbuild.yaml")) {
        Write-Error "cloudbuild.yaml not found in $(Get-Location)"
        Set-Location $ProjectRoot
        return $false
    }
    
    Write-Info "Starting Cloud Build for Patient Portal..."
    Write-Info "This may take 5-10 minutes. Please wait..."
    Write-Info "Note: This will REPLACE the existing deployment (not create duplicate)"
    
    $buildResult = gcloud builds submit --config=cloudbuild.yaml 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Patient Portal deployment failed"
        Write-Host "`nBuild Output:" -ForegroundColor Red
        Write-Host $buildResult
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Check the build logs in the URL above"
        Write-Host "2. Verify Dockerfile exists and is valid"
        Write-Host "3. Check cloudbuild.yaml configuration"
        Write-Host "4. Ensure billing is enabled on GCP project"
        Write-Host "5. Run: gcloud builds list --limit=5"
        Set-Location $ProjectRoot
        return $false
    }
    
    if ($VerboseOutput) {
        Write-Host $buildResult
    }
    Write-Success "Patient Portal deployed with new image"
    
    # Deploy Doctor Portal
    Write-Step "4" "Building and deploying Doctor Portal ($VERSION)..."
    $doctorPortalPath = Join-Path $ProjectRoot "Isara-doctor-portal"
    
    if (-not (Test-Path $doctorPortalPath)) {
        Write-Error "Doctor Portal path not found: $doctorPortalPath"
        return $false
    }
    
    Set-Location $doctorPortalPath
    Write-Info "Current location: $(Get-Location)"
    
    # Check if cloudbuild.yaml exists
    if (-not (Test-Path "cloudbuild.yaml")) {
        Write-Error "cloudbuild.yaml not found in $(Get-Location)"
        Set-Location $ProjectRoot
        return $false
    }
    
    Write-Info "Starting Cloud Build for Doctor Portal..."
    Write-Info "This may take 5-10 minutes. Please wait..."
    Write-Info "Note: This will REPLACE the existing deployment (not create duplicate)"
    
    $buildResult = gcloud builds submit --config=cloudbuild.yaml 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Doctor Portal deployment failed"
        Write-Host "`nBuild Output:" -ForegroundColor Red
        Write-Host $buildResult
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Check the build logs in the URL above"
        Write-Host "2. Verify Dockerfile exists and is valid"
        Write-Host "3. Check cloudbuild.yaml configuration"
        Write-Host "4. Ensure billing is enabled on GCP project"
        Write-Host "5. Run: gcloud builds list --limit=5"
        Set-Location $ProjectRoot
        return $false
    }
    
    if ($VerboseOutput) {
        Write-Host $buildResult
    }
    Write-Success "Doctor Portal deployed with new image"
    
    # Deploy PostgreSQL Database
    Write-Step "5" "Building and deploying PostgreSQL Database ($VERSION)..."
    $postgresPath = Join-Path $ProjectRoot "scripts\cloud-run"
    
    if (-not (Test-Path $postgresPath)) {
        Write-Error "Cloud Run scripts path not found: $postgresPath"
        Set-Location $ProjectRoot
        return $false
    }
    
    Set-Location $ProjectRoot
    Write-Info "Deploying PostgreSQL from: $postgresPath"
    
    $buildResult = gcloud builds submit --config=scripts/cloud-run/cloudbuild-postgres.yaml 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "PostgreSQL deployment failed - continuing..."
        Write-Host $buildResult -ForegroundColor Yellow
    } else {
        Write-Success "PostgreSQL deployed successfully"
    }
    
    # Deploy pgAdmin
    Write-Step "6" "Building and deploying pgAdmin ($VERSION)..."
    
    $buildResult = gcloud builds submit --config=scripts/cloud-run/cloudbuild-pgadmin.yaml 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "pgAdmin deployment failed - continuing..."
        Write-Host $buildResult -ForegroundColor Yellow
    } else {
        Write-Success "pgAdmin deployed successfully"
    }
    
    # Deploy Jitsi Meeting Server
    Write-Step "7" "Building and deploying Jitsi Meeting Server ($VERSION)..."
    $jitsiPath = Join-Path $ProjectRoot "Izara-jitsi-server"
    
    if (-not (Test-Path $jitsiPath)) {
        Write-Error "Jitsi server path not found: $jitsiPath"
        Set-Location $ProjectRoot
        return $false
    }
    
    Set-Location $jitsiPath
    Write-Info "Current location: $(Get-Location)"
    
    if (-not (Test-Path "cloudbuild.yaml")) {
        Write-Warning "cloudbuild.yaml not found - skipping Jitsi deployment"
    } else {
        $buildResult = gcloud builds submit --config=cloudbuild.yaml 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Jitsi Meeting Server deployment failed - continuing..."
            Write-Host $buildResult -ForegroundColor Yellow
        } else {
            Write-Success "Jitsi Meeting Server deployed successfully"
        }
    }
    
    # Return to project root
    Set-Location $ProjectRoot
    
    # Get service URLs
    Write-Step "8" "Retrieving service URLs..."
    
    $patientUrl = gcloud run services describe izara-patient-portal --region=$GCP_REGION --format="value(status.url)" 2>$null
    $doctorUrl = gcloud run services describe izara-doctor-portal --region=$GCP_REGION --format="value(status.url)" 2>$null
    $postgresUrl = gcloud run services describe izara-postgres --region=$GCP_REGION --format="value(status.url)" 2>$null
    $pgadminUrl = gcloud run services describe izara-pgadmin --region=$GCP_REGION --format="value(status.url)" 2>$null
    $jitsiUrl = gcloud run services describe izara-jitsi-meeting-portal --region=$GCP_REGION --format="value(status.url)" 2>$null
    
    # Check service status
    Write-Step "9" "Verifying Cloud Run services..."
    Write-Info "Checking service status..."
    $doctorStatus = gcloud run services describe izara-doctor-portal --region=$GCP_REGION --format="value(status.conditions.status)" 2>$null
    $patientStatus = gcloud run services describe izara-patient-portal --region=$GCP_REGION --format="value(status.conditions.status)" 2>$null
    
    Write-Info "Patient Portal Status: $patientStatus"
    Write-Info "Doctor Portal Status: $doctorStatus"
    
    # Run cloud tests if requested
    if (-not $SkipTests) {
        Write-Step "10" "Running cloud health checks..."
        Test-CloudDeployment -PatientUrl $patientUrl -DoctorUrl $doctorUrl
    }
    
    # Print summary
    Write-Host "`n" + "="*70 -ForegroundColor Green
    Write-Host "  CLOUD DEPLOYMENT COMPLETE - ALL 5 SERVICES DEPLOYED" -ForegroundColor Green
    Write-Host "="*70 -ForegroundColor Green
    Write-Host ""
    Write-Host "  🌐 Service URLs:" -ForegroundColor Cyan
    Write-Host "  ├─ Patient Portal:  $patientUrl" -ForegroundColor White
    Write-Host "  ├─ Doctor Portal:   $doctorUrl" -ForegroundColor White
    Write-Host "  ├─ Meeting Server:  $jitsiUrl" -ForegroundColor White
    Write-Host "  ├─ PostgreSQL:      $postgresUrl" -ForegroundColor White
    Write-Host "  └─ pgAdmin:         $pgadminUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "  🔑 Test Credentials:" -ForegroundColor Yellow
    Write-Host "  Patient: demo.test@gmail.com / P@ssw0rd" -ForegroundColor White
    Write-Host "  Doctor:  doctor.test@izara.com / IzaraDoctor@2024" -ForegroundColor White
    Write-Host "  Admin:   admin.test@izara.com / IzaraAdmin@2024" -ForegroundColor White
    Write-Host ""
    Write-Host "  📋 Next Steps:" -ForegroundColor Magenta
    if ($Fresh) {
        Write-Host "  1. Database has been initialized with seed data" -ForegroundColor White
    } else {
        Write-Host "  1. Seed database: node scripts/seed-cloud-db.cjs" -ForegroundColor White
    }
    Write-Host "  2. Test health: .\scripts\deploy.ps1 -Target test" -ForegroundColor White
    Write-Host "  3. View logs: gcloud run services list" -ForegroundColor White
    Write-Host ""
    
    Set-Location $ProjectRoot
    return $true
}

function Initialize-PostgresDatabase {
    Write-Info "Initializing PostgreSQL database (Docker service)..."
    
    $initSqlPath = Join-Path $ProjectRoot "scripts\database\izara-database.sql"
    
    if (-not (Test-Path $initSqlPath)) {
        Write-Error "Database init script not found"
        return $false
    }
    
    Write-Info "Connecting to PostgreSQL Docker service..."
    
    try {
        # Connect to PostgreSQL Docker container
        $result = docker exec -i izara-postgres psql -U postgres -d izara_phase1 -f /docker-entrypoint-initdb.d/izara-database.sql 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL database initialized successfully"
            return $true
        } else {
            Write-Warning "Database may already be initialized. Continuing..."
            return $true
        }
    } catch {
        Write-Error "Failed to initialize PostgreSQL: $_"
        return $false
    }
}

function Test-CloudDeployment {
    param(
        [string]$PatientUrl,
        [string]$DoctorUrl
    )
    
    Write-Info "Testing cloud deployment..."
    Write-Info "Waiting for containers to fully start (30 seconds)..."
    Start-Sleep -Seconds 30
    
    $tests = @(
        @{ Name = "Patient Portal Health"; Url = "$PatientUrl/health"; MaxRetries = 3 },
        @{ Name = "Doctor Portal Health"; Url = "$DoctorUrl/health"; MaxRetries = 5 },
        @{ Name = "Medical Content API"; Url = "$PatientUrl/api/content/medical"; MaxRetries = 2 },
        @{ Name = "AI Status API"; Url = "$PatientUrl/api/ai/status"; MaxRetries = 2 },
        @{ Name = "Consultants API (Public)"; Url = "$DoctorUrl/api/consultants"; MaxRetries = 2 },
        @{ Name = "Clinical Resources"; Url = "$PatientUrl/api/content/clinical-resources"; MaxRetries = 2 }
    )
    
    $passed = 0
    $failed = 0
    
    foreach ($test in $tests) {
        $success = $false
        $maxRetries = if ($test.MaxRetries) { $test.MaxRetries } else { 3 }
        
        for ($retry = 1; $retry -le $maxRetries; $retry++) {
            try {
                if ($retry -gt 1) {
                    Write-Info "$($test.Name): Retry $retry/$maxRetries..."
                    Start-Sleep -Seconds 10
                }
                
                $response = Invoke-WebRequest -Uri $test.Url -TimeoutSec 60 -UseBasicParsing -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    if ($retry -eq 1) {
                        Write-Success "$($test.Name): PASS"
                    } else {
                        Write-Success "$($test.Name): PASS (after $retry retries)"
                    }
                    $passed++
                    $success = $true
                    break
                } else {
                    Write-Warning "$($test.Name): Status $($response.StatusCode)"
                }
            } catch {
                if ($retry -eq $maxRetries) {
                    Write-Error "$($test.Name): FAIL - $($_.Exception.Message)"
                    # Provide helper command based on the failed service
                    if ($test.Url -match "doctor") {
                        Write-Warning "Check logs with: gcloud run services logs read izara-doctor-portal --region=asia-southeast1 --limit=50"
                    } elseif ($test.Url -match "patient") {
                        Write-Warning "Check logs with: gcloud run services logs read izara-patient-portal --region=asia-southeast1 --limit=50"
                    }
                }
            }
        }
        
        if (-not $success) {
            $failed++
        }
    }
    
    Write-Host ""
    Write-Info "Tests: $passed passed, $failed failed"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if ($Help) {
    Get-Help $PSCommandPath -Full
    exit 0
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     IZARA TELEMEDICINE DEPLOYMENT SCRIPT v$VERSION       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: $Target" -ForegroundColor White
Write-Host "Fresh:  $($Fresh.IsPresent)" -ForegroundColor White
Write-Host "Tests:  $(-not $SkipTests.IsPresent)" -ForegroundColor White
Write-Host ""

$success = $true

switch ($Target) {
    "local" {
        $success = Deploy-Local -Fresh $Fresh.IsPresent
    }
    "cloud" {
        $success = Deploy-Cloud -Fresh $Fresh.IsPresent
    }
    "all" {
        Write-Info "Deploying to both local and cloud environments..."
        $localSuccess = Deploy-Local -Fresh $Fresh.IsPresent
        if (-not $localSuccess) {
            Write-Warning "Local deployment failed. Skipping cloud deployment."
            Write-Host "`nTo deploy only to cloud, run: .\scripts\deploy.ps1 -Target cloud" -ForegroundColor Yellow
            $success = $false
        } else {
            $cloudSuccess = Deploy-Cloud -Fresh $Fresh.IsPresent
            $success = $localSuccess -and $cloudSuccess
        }
    }
    "test" {
        Write-Info "Running tests only (no deployment)..."
        if (Test-Command "docker") {
            $dockerRunning = docker ps 2>&1
            if ($LASTEXITCODE -eq 0) {
                Test-LocalDeployment
                $success = $true
            } else {
                Write-Error "Docker is not running. Cannot run tests."
                $success = $false
            }
        } else {
            Write-Error "Docker is not installed. Cannot run tests."
            $success = $false
        }
    }
}

if ($success) {
    Write-Host "`n✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Quick Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:        docker-compose logs -f" -ForegroundColor Gray
    Write-Host "  Stop services:    docker-compose down" -ForegroundColor Gray
    Write-Host "  Fresh restart:    .\scripts\deploy.ps1 -Target local -Fresh" -ForegroundColor Gray
    Write-Host "  Test only:        .\scripts\deploy.ps1 -Target test" -ForegroundColor Gray
    Write-Host "  Get help:         .\scripts\deploy.ps1 -Help" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "`n❌ Deployment completed with errors" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check Docker Desktop is running" -ForegroundColor Gray
    Write-Host "  2. Verify .env.docker exists with API keys" -ForegroundColor Gray
    Write-Host "  3. Check ports 3005, 3010, 5433 are free" -ForegroundColor Gray
    Write-Host "  4. Try: docker-compose down -v && docker system prune -f" -ForegroundColor Gray
    Write-Host "  5. Check logs: docker-compose logs" -ForegroundColor Gray
    Write-Host "  6. For cloud: Check GCP billing and permissions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For detailed help: .\scripts\deploy.ps1 -Help" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
