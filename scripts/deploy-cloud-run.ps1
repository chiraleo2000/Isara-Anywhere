<#
.SYNOPSIS
    Deploy all Izara Telemedicine services to Google Cloud Run
.DESCRIPTION
    Comprehensive deployment script that deploys all 5 services:
    - PostgreSQL Database
    - pgAdmin
    - Patient Portal
    - Doctor Portal
    - Meeting Server
    
    Maintains same architecture as local Docker deployment.
.PARAMETER Service
    Specific service to deploy. Options: all, postgres, pgadmin, patient, doctor, meeting
.PARAMETER SkipBuild
    Skip building images (use existing images)
.PARAMETER SkipTests
    Skip running tests after deployment
.EXAMPLE
    .\scripts\deploy-cloud-run.ps1 -Service all
.EXAMPLE
    .\scripts\deploy-cloud-run.ps1 -Service patient
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("all", "postgres", "pgadmin", "patient", "doctor", "meeting")]
    [string]$Service = "all",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================

$GCP_PROJECT = "izara-telemedicine"
$GCP_REGION = "asia-southeast1"
# ARTIFACT_REGISTRY used for docker image paths in deployment commands
$ARTIFACT_REGISTRY = "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/isara-anywhere-portals"
$VERSION = "1.4.5"

# PostgreSQL Configuration (Cloud SQL instance) - Used in DATABASE_URL construction
$DB_HOST = "34.143.228.135"
$DB_PORT = "5432"
$DB_NAME = "izara_phase1"
$DATABASE_URL = "postgresql://postgres@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Service URLs (after deployment)
$PATIENT_PORTAL_URL = "https://izara-patient-portal-hvht4obouq-as.a.run.app"
$DOCTOR_PORTAL_URL = "https://izara-doctor-portal-hvht4obouq-as.a.run.app"
$MEETING_SERVER_URL = "https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app"
$POSTGRES_URL = "https://izara-postgres-hvht4obouq-as.a.run.app"
$PGADMIN_URL = "https://izara-pgadmin-hvht4obouq-as.a.run.app"

# Log configuration for reference
Write-Host "Using Artifact Registry: $ARTIFACT_REGISTRY" -ForegroundColor DarkGray
Write-Host "Database URL: postgresql://postgres@${DB_HOST}:${DB_PORT}/${DB_NAME}" -ForegroundColor DarkGray

# Colors
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Section { param($msg) Write-Host "`n$('='*80)`n$msg`n$('='*80)" -ForegroundColor Magenta }

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

function Deploy-PostgreSQL {
    Write-Section "DEPLOYING POSTGRESQL DATABASE"
    
    try {
        Push-Location "$PSScriptRoot\cloud-run"
        
        if (-not $SkipBuild) {
            Write-Info "Building PostgreSQL image..."
            gcloud builds submit `
                --project=$GCP_PROJECT `
                --config=cloudbuild-postgres.yaml `
                --timeout=900s `
                .
        }
        
        Write-Success "PostgreSQL deployed to Cloud Run"
        Write-Info "PostgreSQL URL: $POSTGRES_URL"
    }
    catch {
        Write-Error "Failed to deploy PostgreSQL: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

function Deploy-PgAdmin {
    Write-Section "DEPLOYING PGADMIN"
    
    try {
        Push-Location "$PSScriptRoot\cloud-run"
        
        if (-not $SkipBuild) {
            Write-Info "Building pgAdmin image..."
            gcloud builds submit `
                --project=$GCP_PROJECT `
                --config=cloudbuild-pgadmin.yaml `
                --timeout=600s `
                .
        }
        
        Write-Success "pgAdmin deployed to Cloud Run"
        Write-Info "pgAdmin URL: $PGADMIN_URL"
    }
    catch {
        Write-Error "Failed to deploy pgAdmin: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

function Deploy-PatientPortal {
    Write-Section "DEPLOYING PATIENT PORTAL"
    
    try {
        $portalPath = Join-Path (Split-Path $PSScriptRoot -Parent) "Isara-patient-portal"
        Push-Location $portalPath
        
        if (-not $SkipBuild) {
            Write-Info "Building Patient Portal image..."
            gcloud builds submit `
                --project=$GCP_PROJECT `
                --config=cloudbuild.yaml `
                --timeout=1200s `
                .
        }
        
        Write-Success "Patient Portal deployed to Cloud Run"
        Write-Info "Patient Portal URL: $PATIENT_PORTAL_URL"
    }
    catch {
        Write-Error "Failed to deploy Patient Portal: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

function Deploy-DoctorPortal {
    Write-Section "DEPLOYING DOCTOR PORTAL"
    
    try {
        $portalPath = Join-Path (Split-Path $PSScriptRoot -Parent) "Isara-doctor-portal"
        Push-Location $portalPath
        
        if (-not $SkipBuild) {
            Write-Info "Building Doctor Portal image..."
            gcloud builds submit `
                --project=$GCP_PROJECT `
                --config=cloudbuild.yaml `
                --timeout=1200s `
                .
        }
        
        Write-Success "Doctor Portal deployed to Cloud Run"
        Write-Info "Doctor Portal URL: $DOCTOR_PORTAL_URL"
    }
    catch {
        Write-Error "Failed to deploy Doctor Portal: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

function Deploy-MeetingServer {
    Write-Section "DEPLOYING MEETING SERVER"
    
    try {
        $meetingPath = Join-Path (Split-Path $PSScriptRoot -Parent) "Izara-jitsi-server"
        Push-Location $meetingPath
        
        if (-not $SkipBuild) {
            Write-Info "Building Meeting Server image..."
            gcloud builds submit `
                --project=$GCP_PROJECT `
                --config=cloudbuild.yaml `
                --timeout=900s `
                .
        }
        
        Write-Success "Meeting Server deployed to Cloud Run"
        Write-Info "Meeting Server URL: $MEETING_SERVER_URL"
    }
    catch {
        Write-Error "Failed to deploy Meeting Server: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

function Test-Deployments {
    Write-Section "TESTING CLOUD DEPLOYMENTS"
    
    $testScript = Join-Path (Split-Path $PSScriptRoot -Parent) "tests\izara-api-tests.ps1"
    
    if (Test-Path $testScript) {
        Write-Info "Running comprehensive API tests on cloud..."
        & $testScript -Target cloud -Verbose
    }
    else {
        Write-Warning "Test script not found: $testScript"
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Section "IZARA TELEMEDICINE - CLOUD RUN DEPLOYMENT"
Write-Info "Project: $GCP_PROJECT"
Write-Info "Region: $GCP_REGION"
Write-Info "Version: $VERSION"
Write-Info "Service: $Service"
Write-Info ""

# Verify gcloud authentication
Write-Info "Verifying GCP authentication..."
$account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $account) {
    Write-Error "Not authenticated to GCP. Run: gcloud auth login"
    exit 1
}
Write-Success "Authenticated as: $account"

# Set project
gcloud config set project $GCP_PROJECT 2>$null

# Deploy services based on selection
try {
    switch ($Service) {
        "all" {
            Deploy-PostgreSQL
            Start-Sleep -Seconds 10  # Wait for PostgreSQL to be ready
            
            Deploy-PgAdmin
            Deploy-PatientPortal
            Deploy-DoctorPortal
            Deploy-MeetingServer
        }
        "postgres" {
            Deploy-PostgreSQL
        }
        "pgadmin" {
            Deploy-PgAdmin
        }
        "patient" {
            Deploy-PatientPortal
        }
        "doctor" {
            Deploy-DoctorPortal
        }
        "meeting" {
            Deploy-MeetingServer
        }
    }
    
    Write-Section "DEPLOYMENT SUMMARY"
    Write-Success "Deployment completed successfully!"
    
    Write-Info "`nCloud Run Service URLs:"
    Write-Host "  Patient Portal:  $PATIENT_PORTAL_URL" -ForegroundColor Cyan
    Write-Host "  Doctor Portal:   $DOCTOR_PORTAL_URL" -ForegroundColor Cyan
    Write-Host "  Meeting Server:  $MEETING_SERVER_URL" -ForegroundColor Cyan
    Write-Host "  PostgreSQL:      $POSTGRES_URL" -ForegroundColor Cyan
    Write-Host "  pgAdmin:         $PGADMIN_URL" -ForegroundColor Cyan
    
    # Run tests if not skipped
    if (-not $SkipTests -and $Service -eq "all") {
        Test-Deployments
    }
}
catch {
    Write-Error "Deployment failed: $_"
    exit 1
}

Write-Success "`nAll deployments completed successfully! 🎉"
