<#
.SYNOPSIS
    Izara Telemedicine - Unified CLI Tool
    Single script for ALL deployment, database, and maintenance operations.

.DESCRIPTION
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║                    IZARA TELEMEDICINE CLI v2.0.0                          ║
    ║                     Unified Deployment & Management                        ║
    ╚══════════════════════════════════════════════════════════════════════════╝

    Consolidates all scripts into ONE command-line interface:
    - Deploy to Local Docker or Cloud Run
    - Database operations (seed, migrate, verify, backup)
    - Service health checks
    - Cleanup and maintenance

.PARAMETER Action
    Main action to perform:
    - deploy      : Deploy services (local/cloud)
    - db          : Database operations
    - health      : Check service health
    - clean       : Cleanup containers/images
    - status      : Show current status

.PARAMETER Target
    Deployment target: local, cloud, or all

.PARAMETER Fresh
    Wipe all data and start fresh (for deploy)

.PARAMETER DbAction
    Database sub-action: seed, migrate, verify, fix, backup

.EXAMPLE
    .\scripts\izara-cli.ps1 deploy local
    Deploy all services to local Docker

.EXAMPLE
    .\scripts\izara-cli.ps1 deploy cloud -Fresh
    Fresh deployment to Cloud Run

.EXAMPLE
    .\scripts\izara-cli.ps1 db seed
    Seed the database with demo data

.EXAMPLE
    .\scripts\izara-cli.ps1 health
    Check all services health

.EXAMPLE
    .\scripts\izara-cli.ps1 clean -Full
    Full cleanup of containers and images

.NOTES
    Version: 2.0.0
    Author: Izara Telemedicine Team
    Last Updated: February 4, 2026
    
    Replaces:
    - deploy.ps1
    - deploy-cloud-run.ps1
    - Various database scripts
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "db", "health", "clean", "status", "help")]
    [string]$Action = "help",

    [Parameter(Position=1)]
    [ValidateSet("local", "cloud", "all")]
    [string]$Target = "local",

    [Parameter(Mandatory=$false)]
    [switch]$Fresh,

    [Parameter(Mandatory=$false)]
    [ValidateSet("seed", "migrate", "verify", "fix", "backup", "reset")]
    [string]$DbAction = "verify",

    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,

    [Parameter(Mandatory=$false)]
    [switch]$Full,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $PSCommandPath
$ProjectRoot = Split-Path -Parent $ScriptDir

# GCP Configuration
$GCP_PROJECT = "izara-telemedicine"
$GCP_REGION = "asia-southeast1"
$VERSION = "2.0.0"

# Local Docker Configuration
$PATIENT_PORTAL_PORT = 3005
$DOCTOR_PORTAL_PORT = 3010
$MEETING_SERVER_PORT = 3020
$POSTGRES_PORT = 5433
$PGADMIN_PORT = 5050

# Cloud URLs
$CLOUD_URLS = @{
    patient = "https://izara-patient-portal-724889190329.asia-southeast1.run.app"
    doctor = "https://izara-doctor-portal-724889190329.asia-southeast1.run.app"
    meeting = "https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app"
}

# Cloud Database
$CLOUD_DB_HOST = "34.143.228.135"
$CLOUD_DB_PORT = "5432"
$CLOUD_DB_NAME = "izara_phase1"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                     IZARA TELEMEDICINE CLI v$VERSION                        ║" -ForegroundColor Cyan
    Write-Host "║                      Unified Deployment & Management                       ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Step { param($step, $total, $msg) Write-Host "`n[$step/$total] $msg" -ForegroundColor Magenta }

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
    
    Write-Info "Waiting for $ServiceName..."
    $startTime = Get-Date
    
    while ($true) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "$ServiceName is ready!"
                return $true
            }
        } catch { }
        
        $elapsed = (Get-Date) - $startTime
        if ($elapsed.TotalSeconds -gt $TimeoutSeconds) {
            Write-Warn "$ServiceName did not respond within $TimeoutSeconds seconds"
            return $false
        }
        Start-Sleep -Seconds 2
    }
}

# ============================================================================
# DEPLOY FUNCTIONS
# ============================================================================

function Deploy-Local {
    param([switch]$Fresh)
    
    Write-Step 1 5 "DEPLOYING TO LOCAL DOCKER"
    
    # Check Docker
    if (-not (Test-Command "docker")) {
        Write-Err "Docker is not installed. Please install Docker Desktop."
        exit 1
    }
    
    $isRunning = docker info 2>&1 | Select-String "Server"
    if (-not $isRunning) {
        Write-Err "Docker is not running. Please start Docker Desktop."
        exit 1
    }
    Write-Success "Docker is running"
    
    # Fresh install - remove containers and volumes
    if ($Fresh) {
        Write-Step 2 5 "Removing existing containers and volumes..."
        Push-Location $ProjectRoot
        docker compose down -v 2>$null
        Pop-Location
        Write-Success "Cleaned up existing data"
    }
    
    # Build and start containers
    Write-Step 3 5 "Building and starting containers..."
    Push-Location $ProjectRoot
    
    if ($Fresh) {
        docker compose build --no-cache
    }
    docker compose up -d
    
    Pop-Location
    Write-Success "Containers started"
    
    # Wait for services
    Write-Step 4 5 "Waiting for services to be ready..."
    
    $services = @(
        @{ Name = "Patient Portal"; Url = "http://localhost:$PATIENT_PORTAL_PORT/api/health" },
        @{ Name = "Doctor Portal"; Url = "http://localhost:$DOCTOR_PORTAL_PORT/api/health" }
    )
    
    foreach ($svc in $services) {
        Wait-ForService -Url $svc.Url -ServiceName $svc.Name -TimeoutSeconds 120
    }
    
    # Health check
    Write-Step 5 5 "Running health checks..."
    Invoke-HealthCheck -Target "local"
    
    Write-Host ""
    Write-Success "LOCAL DEPLOYMENT COMPLETE!"
    Write-Host ""
    Write-Host "  Services:" -ForegroundColor Yellow
    Write-Host "    Patient Portal: http://localhost:$PATIENT_PORTAL_PORT" -ForegroundColor Gray
    Write-Host "    Doctor Portal:  http://localhost:$DOCTOR_PORTAL_PORT" -ForegroundColor Gray
    Write-Host "    pgAdmin:        http://localhost:$PGADMIN_PORT" -ForegroundColor Gray
    Write-Host ""
}

function Deploy-Cloud {
    param([switch]$Fresh)
    
    Write-Step 1 6 "DEPLOYING TO GOOGLE CLOUD RUN"
    
    # Check gcloud
    if (-not (Test-Command "gcloud")) {
        Write-Err "gcloud CLI is not installed. Please install Google Cloud SDK."
        exit 1
    }
    
    # Authenticate
    Write-Step 2 6 "Authenticating with GCP..."
    gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet
    Write-Success "Authenticated with GCP"
    
    # Deploy Patient Portal
    Write-Step 3 6 "Deploying Patient Portal..."
    Push-Location "$ProjectRoot\Isara-patient-portal"
    gcloud builds submit --project=$GCP_PROJECT --config=cloudbuild.yaml --timeout=1200s .
    Pop-Location
    Write-Success "Patient Portal deployed"
    
    # Deploy Doctor Portal
    Write-Step 4 6 "Deploying Doctor Portal..."
    Push-Location "$ProjectRoot\Isara-doctor-portal"
    gcloud builds submit --project=$GCP_PROJECT --config=cloudbuild.yaml --timeout=1200s .
    Pop-Location
    Write-Success "Doctor Portal deployed"
    
    # Deploy Meeting Server
    Write-Step 5 6 "Deploying Meeting Server..."
    Push-Location "$ProjectRoot\Izara-jitsi-server"
    gcloud builds submit --project=$GCP_PROJECT --config=cloudbuild.yaml --timeout=900s .
    Pop-Location
    Write-Success "Meeting Server deployed"
    
    # Health check
    Write-Step 6 6 "Running health checks..."
    Start-Sleep -Seconds 30  # Wait for Cloud Run to stabilize
    Invoke-HealthCheck -Target "cloud"
    
    Write-Host ""
    Write-Success "CLOUD DEPLOYMENT COMPLETE!"
    Write-Host ""
    Write-Host "  Services:" -ForegroundColor Yellow
    Write-Host "    Patient Portal: $($CLOUD_URLS.patient)" -ForegroundColor Gray
    Write-Host "    Doctor Portal:  $($CLOUD_URLS.doctor)" -ForegroundColor Gray
    Write-Host "    Meeting Server: $($CLOUD_URLS.meeting)" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# DATABASE FUNCTIONS
# ============================================================================

function Invoke-DbAction {
    param([string]$SubAction)
    
    Write-Host ""
    Write-Host "DATABASE OPERATION: $SubAction" -ForegroundColor Magenta
    Write-Host ""
    
    switch ($SubAction) {
        "seed" {
            Write-Info "Seeding database with demo data..."
            node "$ScriptDir\cloud-db-tool.cjs" --all
        }
        "migrate" {
            Write-Info "Running database migrations..."
            node "$ScriptDir\cloud-db-tool.cjs" --fix-schema
        }
        "verify" {
            Write-Info "Verifying database..."
            node "$ScriptDir\cloud-db-tool.cjs" --verify
        }
        "fix" {
            Write-Info "Fixing database issues..."
            node "$ScriptDir\cloud-db-tool.cjs" --fix-schema --fix-passwords --fix-profiles
        }
        "backup" {
            Write-Info "Creating database backup..."
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $backupFile = "$ProjectRoot\backups\izara_backup_$timestamp.sql"
            New-Item -ItemType Directory -Force -Path "$ProjectRoot\backups" | Out-Null
            
            $env:PGPASSWORD = $env:DB_PASSWORD
            pg_dump -h $CLOUD_DB_HOST -p $CLOUD_DB_PORT -U postgres -d $CLOUD_DB_NAME -f $backupFile
            
            Write-Success "Backup created: $backupFile"
        }
        "reset" {
            Write-Warn "This will DELETE ALL DATA. Are you sure? (y/N)"
            $confirm = Read-Host
            if ($confirm -eq "y") {
                node "$ScriptDir\cloud-db-tool.cjs" --reset --all
                Write-Success "Database reset complete"
            } else {
                Write-Info "Reset cancelled"
            }
        }
    }
}

# ============================================================================
# HEALTH CHECK FUNCTION
# ============================================================================

function Invoke-HealthCheck {
    param([string]$Target = "local")
    
    Write-Host ""
    Write-Host "HEALTH CHECK: $Target" -ForegroundColor Magenta
    Write-Host ""
    
    $endpoints = @()
    
    if ($Target -eq "local") {
        $endpoints = @(
            @{ Name = "Patient Portal"; Url = "http://localhost:$PATIENT_PORTAL_PORT/api/health" },
            @{ Name = "Doctor Portal"; Url = "http://localhost:$DOCTOR_PORTAL_PORT/api/health" },
            @{ Name = "PostgreSQL"; Url = "http://localhost:$POSTGRES_PORT"; Type = "tcp" }
        )
    } else {
        $endpoints = @(
            @{ Name = "Patient Portal"; Url = "$($CLOUD_URLS.patient)/api/health" },
            @{ Name = "Doctor Portal"; Url = "$($CLOUD_URLS.doctor)/api/health" },
            @{ Name = "Meeting Server"; Url = "$($CLOUD_URLS.meeting)/api/health" }
        )
    }
    
    $results = @()
    
    foreach ($ep in $endpoints) {
        try {
            if ($ep.Type -eq "tcp") {
                $port = [regex]::Match($ep.Url, ':(\d+)').Groups[1].Value
                $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
                if ($connection.TcpTestSucceeded) {
                    Write-Success "$($ep.Name): Connected"
                    $results += @{ Name = $ep.Name; Status = "OK" }
                } else {
                    throw "Connection failed"
                }
            } else {
                $response = Invoke-RestMethod -Uri $ep.Url -Method GET -TimeoutSec 10
                Write-Success "$($ep.Name): $($response.status)"
                $results += @{ Name = $ep.Name; Status = "OK" }
            }
        } catch {
            Write-Err "$($ep.Name): Failed - $_"
            $results += @{ Name = $ep.Name; Status = "FAILED" }
        }
    }
    
    # Summary
    $passed = ($results | Where-Object { $_.Status -eq "OK" }).Count
    $total = $results.Count
    
    Write-Host ""
    if ($passed -eq $total) {
        Write-Success "All $total services healthy!"
    } else {
        Write-Warn "$passed/$total services healthy"
    }
}

# ============================================================================
# CLEANUP FUNCTION
# ============================================================================

function Invoke-Cleanup {
    param([switch]$Full)
    
    Write-Host ""
    Write-Host "CLEANUP OPERATION" -ForegroundColor Magenta
    Write-Host ""
    
    # Stop containers
    Write-Info "Stopping all Izara containers..."
    docker compose -f "$ProjectRoot\docker-compose.yml" down 2>$null
    Write-Success "Containers stopped"
    
    if ($Full) {
        # Remove volumes
        Write-Info "Removing Docker volumes..."
        docker volume rm izara-postgres-data 2>$null
        docker volume rm izara-pgadmin-data 2>$null
        Write-Success "Volumes removed"
        
        # Remove images
        Write-Info "Removing Docker images..."
        docker rmi $(docker images "izara-*" -q) 2>$null
        Write-Success "Images removed"
        
        # Prune system
        Write-Info "Pruning Docker system..."
        docker system prune -f
        Write-Success "Docker cleaned up"
    }
    
    Write-Host ""
    Write-Success "Cleanup complete!"
}

# ============================================================================
# STATUS FUNCTION
# ============================================================================

function Show-Status {
    Write-Host ""
    Write-Host "SYSTEM STATUS" -ForegroundColor Magenta
    Write-Host ""
    
    # Docker containers
    Write-Host "Docker Containers:" -ForegroundColor Yellow
    $containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>$null | Where-Object { $_ -match "izara" }
    if ($containers) {
        $containers | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "  No Izara containers running" -ForegroundColor Gray
    }
    
    Write-Host ""
    
    # Health check both environments
    Write-Host "Local Services:" -ForegroundColor Yellow
    Invoke-HealthCheck -Target "local"
    
    Write-Host ""
    Write-Host "Cloud Services:" -ForegroundColor Yellow
    Invoke-HealthCheck -Target "cloud"
}

# ============================================================================
# HELP FUNCTION
# ============================================================================

function Show-Help {
    Write-Banner
    
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\scripts\izara-cli.ps1 <action> [target] [options]" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "ACTIONS:" -ForegroundColor Yellow
    Write-Host "  deploy    Deploy services to local Docker or Cloud Run" -ForegroundColor Gray
    Write-Host "  db        Database operations (seed, migrate, verify, fix, backup)" -ForegroundColor Gray
    Write-Host "  health    Check service health" -ForegroundColor Gray
    Write-Host "  clean     Cleanup containers and images" -ForegroundColor Gray
    Write-Host "  status    Show current system status" -ForegroundColor Gray
    Write-Host "  help      Show this help message" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  Deploy locally:              .\scripts\izara-cli.ps1 deploy local" -ForegroundColor Gray
    Write-Host "  Fresh local deploy:          .\scripts\izara-cli.ps1 deploy local -Fresh" -ForegroundColor Gray
    Write-Host "  Deploy to cloud:             .\scripts\izara-cli.ps1 deploy cloud" -ForegroundColor Gray
    Write-Host "  Seed database:               .\scripts\izara-cli.ps1 db -DbAction seed" -ForegroundColor Gray
    Write-Host "  Verify database:             .\scripts\izara-cli.ps1 db -DbAction verify" -ForegroundColor Gray
    Write-Host "  Health check (local):        .\scripts\izara-cli.ps1 health local" -ForegroundColor Gray
    Write-Host "  Health check (cloud):        .\scripts\izara-cli.ps1 health cloud" -ForegroundColor Gray
    Write-Host "  Cleanup containers:          .\scripts\izara-cli.ps1 clean" -ForegroundColor Gray
    Write-Host "  Full cleanup:                .\scripts\izara-cli.ps1 clean -Full" -ForegroundColor Gray
    Write-Host "  Show status:                 .\scripts\izara-cli.ps1 status" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -Fresh        Wipe all data and start fresh" -ForegroundColor Gray
    Write-Host "  -SkipTests    Skip running tests after deployment" -ForegroundColor Gray
    Write-Host "  -Full         Full cleanup (includes images and volumes)" -ForegroundColor Gray
    Write-Host "  -Verbose      Show detailed output" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Banner

switch ($Action) {
    "deploy" {
        switch ($Target) {
            "local" { Deploy-Local -Fresh:$Fresh }
            "cloud" { Deploy-Cloud -Fresh:$Fresh }
            "all" {
                Deploy-Local -Fresh:$Fresh
                Deploy-Cloud -Fresh:$Fresh
            }
        }
        
        if (-not $SkipTests) {
            Write-Host ""
            Write-Info "Run tests with: .\tests\e2e\run-tests.ps1 -Target $Target"
        }
    }
    "db" {
        Invoke-DbAction -SubAction $DbAction
    }
    "health" {
        Invoke-HealthCheck -Target $Target
    }
    "clean" {
        Invoke-Cleanup -Full:$Full
    }
    "status" {
        Show-Status
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}

Write-Host ""
