# =============================================================================
# IZARA TELEMEDICINE - GOOGLE CLOUD RUN DEPLOYMENT
# =============================================================================
# Version: 1.4.0
# Usage: .\scripts\deploy-cloud.ps1 [-PatientPortal] [-DoctorPortal] [-All]
# =============================================================================

param(
    [switch]$PatientPortal,
    [switch]$DoctorPortal,
    [switch]$All,
    [switch]$SeedDatabase,
    [switch]$Status,
    [string]$Region = "asia-southeast1"
)

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "izara-telemedicine"
$CLOUD_SQL_INSTANCE = "izara-telemedicine:asia-southeast1:izara-db-instance"
$DB_NAME = "izara_phase1"

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " IZARA TELEMEDICINE - GOOGLE CLOUD RUN DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
try {
    gcloud --version | Out-Null
} catch {
    Write-Host "ERROR: gcloud CLI is not installed. Please install Google Cloud SDK." -ForegroundColor Red
    exit 1
}

# Check authentication
$account = gcloud config get-value account 2>$null
if (-not $account) {
    Write-Host "ERROR: Not authenticated. Please run 'gcloud auth login'" -ForegroundColor Red
    exit 1
}

Write-Host "  Project:  $PROJECT_ID" -ForegroundColor Gray
Write-Host "  Region:   $Region" -ForegroundColor Gray
Write-Host "  Account:  $account" -ForegroundColor Gray
Write-Host ""

# Set project
gcloud config set project $PROJECT_ID

# Show status if requested
if ($Status) {
    Write-Host "[STATUS] Cloud Run Services:" -ForegroundColor Yellow
    gcloud run services list --region=$Region
    
    Write-Host ""
    Write-Host "[STATUS] Cloud SQL Instance:" -ForegroundColor Yellow
    gcloud sql instances describe izara-db-instance --format="table(name,state,ipAddresses.ipAddress)"
    
    exit 0
}

# Seed database if requested
if ($SeedDatabase) {
    Write-Host "[SEED] Connecting to Cloud SQL and seeding database..." -ForegroundColor Yellow
    
    # Get Cloud SQL IP
    $sqlIP = gcloud sql instances describe izara-db-instance --format="value(ipAddresses.ipAddress)" 2>$null
    Write-Host "  Cloud SQL IP: $sqlIP" -ForegroundColor Gray
    
    # Get password from Secret Manager
    $dbPassword = gcloud secrets versions access latest --secret=db-password 2>$null
    
    if (-not $dbPassword) {
        Write-Host "ERROR: Could not retrieve database password from Secret Manager" -ForegroundColor Red
        exit 1
    }
    
    $env:CLOUD_SQL_PASSWORD = $dbPassword
    $env:CLOUD_SQL_HOST = $sqlIP
    $env:DB_HOST = $sqlIP
    $env:DB_PASSWORD = $dbPassword
    
    Write-Host "  Running seeder..." -ForegroundColor Gray
    node scripts\seeder.cjs --cloud
    
    Write-Host "[SEED] Database seeded successfully!" -ForegroundColor Green
    exit 0
}

# Deploy if no specific flag, deploy all
if (-not $PatientPortal -and -not $DoctorPortal) {
    $All = $true
}

if ($All) {
    $PatientPortal = $true
    $DoctorPortal = $true
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Deploy Patient Portal
if ($PatientPortal) {
    Write-Host "[PATIENT PORTAL] Starting Cloud Build..." -ForegroundColor Yellow
    
    Set-Location (Join-Path $ProjectRoot "Isara-patient-portal")
    
    gcloud builds submit --config=cloudbuild.yaml `
        --substitutions="_REGION=$Region"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PATIENT PORTAL] Deployed successfully!" -ForegroundColor Green
        
        # Get service URL
        $patientUrl = gcloud run services describe isara-patient-portal `
            --region=$Region `
            --format="value(status.url)" 2>$null
        Write-Host "  URL: $patientUrl" -ForegroundColor Gray
    } else {
        Write-Host "[PATIENT PORTAL] Deployment failed!" -ForegroundColor Red
    }
    
    Set-Location $ProjectRoot
}

# Deploy Doctor Portal
if ($DoctorPortal) {
    Write-Host ""
    Write-Host "[DOCTOR PORTAL] Starting Cloud Build..." -ForegroundColor Yellow
    
    Set-Location (Join-Path $ProjectRoot "Isara-doctor-portal")
    
    gcloud builds submit --config=cloudbuild.yaml `
        --substitutions="_REGION=$Region"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[DOCTOR PORTAL] Deployed successfully!" -ForegroundColor Green
        
        # Get service URL
        $doctorUrl = gcloud run services describe isara-doctor-portal `
            --region=$Region `
            --format="value(status.url)" 2>$null
        Write-Host "  URL: $doctorUrl" -ForegroundColor Gray
    } else {
        Write-Host "[DOCTOR PORTAL] Deployment failed!" -ForegroundColor Red
    }
    
    Set-Location $ProjectRoot
}

Write-Host ""
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host " CLOUD DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Deployed Services:" -ForegroundColor White

if ($PatientPortal) {
    $patientUrl = gcloud run services describe isara-patient-portal `
        --region=$Region `
        --format="value(status.url)" 2>$null
    Write-Host "   Patient Portal: $patientUrl" -ForegroundColor Gray
}

if ($DoctorPortal) {
    $doctorUrl = gcloud run services describe isara-doctor-portal `
        --region=$Region `
        --format="value(status.url)" 2>$null
    Write-Host "   Doctor Portal:  $doctorUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host " Test Credentials:" -ForegroundColor White
Write-Host "   Patient: demo.test@gmail.com / P@ssw0rd" -ForegroundColor Gray
Write-Host "   Doctor:  doctor.test@izara.com / IzaraDoctor@2024" -ForegroundColor Gray
Write-Host "   Admin:   admin.test@izara.com / IzaraAdmin@2024" -ForegroundColor Gray
Write-Host ""
Write-Host " Commands:" -ForegroundColor White
Write-Host "   Check status:   .\scripts\deploy-cloud.ps1 -Status" -ForegroundColor Gray
Write-Host "   Seed database:  .\scripts\deploy-cloud.ps1 -SeedDatabase" -ForegroundColor Gray
Write-Host "   Deploy patient: .\scripts\deploy-cloud.ps1 -PatientPortal" -ForegroundColor Gray
Write-Host "   Deploy doctor:  .\scripts\deploy-cloud.ps1 -DoctorPortal" -ForegroundColor Gray
Write-Host "   Deploy all:     .\scripts\deploy-cloud.ps1 -All" -ForegroundColor Gray
Write-Host ""
