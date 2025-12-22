# =============================================================================
# Isara Anywhere - Deploy to Google Cloud Run
# =============================================================================
# Registry: asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals
# Patient Portal: https://izara-patient-portal-724889190329.asia-southeast1.run.app
# Doctor Portal: https://izara-doctor-portal-724889190329.asia-southeast1.run.app
#
# Usage:
#   .\deploy-to-cloud-run.ps1                    # Deploy both portals
#   .\deploy-to-cloud-run.ps1 -Portal patient    # Deploy only patient portal
#   .\deploy-to-cloud-run.ps1 -Portal doctor     # Deploy only doctor portal
#   .\deploy-to-cloud-run.ps1 -Version "1.0.1"   # Deploy specific version
#   .\deploy-to-cloud-run.ps1 -BuildFirst        # Build and push before deploying
# =============================================================================

param(
    [ValidateSet("all", "patient", "doctor")]
    [string]$Portal = "all",
    
    [string]$Version = "latest",
    
    [switch]$BuildFirst
)

# Configuration
$PROJECT_ID = "izara-telemedicine"
$REGION = "asia-southeast1"
$REGISTRY = "asia-southeast1-docker.pkg.dev/izara-telemedicine/isara-anywhere-portals"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
if (-not $ROOT_DIR) {
    $ROOT_DIR = (Get-Location).Path
}

# Cloud Run service names
$PATIENT_SERVICE = "izara-patient-portal"
$DOCTOR_SERVICE = "izara-doctor-portal"

# Cloud Run URLs
$PATIENT_URL = "https://izara-patient-portal-724889190329.asia-southeast1.run.app"
$DOCTOR_URL = "https://izara-doctor-portal-724889190329.asia-southeast1.run.app"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host "  Isara Anywhere - Deploy to Google Cloud Run" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Project: $PROJECT_ID" -ForegroundColor White
Write-Host "Region: $REGION" -ForegroundColor White
Write-Host "Registry: $REGISTRY" -ForegroundColor White
Write-Host ""

# Check GCP authentication
Write-Host "Checking GCP authentication..." -ForegroundColor Yellow
$gcloudAuth = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: gcloud is not authenticated. Run: gcloud auth login" -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated as: $gcloudAuth" -ForegroundColor Green

# Set project
Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Build first if requested
if ($BuildFirst) {
    Write-Host ""
    Write-Host "Building and pushing images first..." -ForegroundColor Yellow
    $buildScript = Join-Path $PSScriptRoot "build-and-push-gcr.ps1"
    & $buildScript -Portal $Portal -Version $Version
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Build failed. Aborting deployment." -ForegroundColor Red
        exit 1
    }
}

function Deploy-To-CloudRun {
    param(
        [string]$ServiceName,
        [string]$ImageTag,
        [hashtable]$EnvVars
    )
    
    $imagePath = "$REGISTRY/${ServiceName}:${ImageTag}"
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Deploying: $ServiceName" -ForegroundColor Cyan
    Write-Host "Image: $imagePath" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    # Build environment variables string
    $envString = ""
    foreach ($key in $EnvVars.Keys) {
        $value = $EnvVars[$key]
        if ($envString) {
            $envString += ","
        }
        $envString += "${key}=${value}"
    }
    
    # Deploy to Cloud Run
    $deployArgs = @(
        "run", "deploy", $ServiceName,
        "--image", $imagePath,
        "--region", $REGION,
        "--platform", "managed",
        "--allow-unauthenticated",
        "--port", "8080",
        "--cpu", "1",
        "--memory", "512Mi",
        "--min-instances", "0",
        "--max-instances", "10",
        "--timeout", "300s",
        "--concurrency", "80"
    )
    
    if ($envString) {
        $deployArgs += "--set-env-vars"
        $deployArgs += $envString
    }
    
    Write-Host "gcloud $($deployArgs -join ' ')" -ForegroundColor DarkGray
    
    & gcloud @deployArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Deployment failed for $ServiceName" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Deployment successful for $ServiceName!" -ForegroundColor Green
    return $true
}

$results = @()

# Deploy Patient Portal
if ($Portal -eq "all" -or $Portal -eq "patient") {
    $patientEnvVars = @{
        "NODE_ENV" = "production"
        "VITE_API_URL" = $PATIENT_URL
        "VITE_GCP_PROJECT_ID" = $PROJECT_ID
        "VITE_GCP_REGION" = $REGION
        "VITE_JITSI_DOMAIN" = "meet.jit.si"
        "VITE_JITSI_APP_ID" = "izara-telemedicine"
        "VITE_VIDEO_CONSULTATION_ENABLED" = "true"
        "VITE_PDPA_ENABLED" = "true"
        "VITE_CONSENT_REQUIRED" = "true"
    }
    
    $result = Deploy-To-CloudRun `
        -ServiceName $PATIENT_SERVICE `
        -ImageTag $Version `
        -EnvVars $patientEnvVars
    
    $results += @{
        Name = "Patient Portal"
        Success = $result
        URL = $PATIENT_URL
    }
}

# Deploy Doctor Portal
if ($Portal -eq "all" -or $Portal -eq "doctor") {
    $doctorEnvVars = @{
        "NODE_ENV" = "production"
        "VITE_API_URL" = $DOCTOR_URL
        "VITE_GCP_PROJECT_ID" = $PROJECT_ID
        "VITE_GCP_REGION" = $REGION
        "VITE_JITSI_DOMAIN" = "meet.jit.si"
        "VITE_JITSI_APP_ID" = "izara-telemedicine"
        "VITE_VIDEO_CONSULTATION_ENABLED" = "true"
        "VITE_AI_CLINICAL_ASSIST" = "true"
        "VITE_AI_VOICE_TRANSCRIPTION" = "true"
        "VITE_PDPA_ENABLED" = "true"
        "VITE_E_PRESCRIBING_ENABLED" = "true"
    }
    
    $result = Deploy-To-CloudRun `
        -ServiceName $DOCTOR_SERVICE `
        -ImageTag $Version `
        -EnvVars $doctorEnvVars
    
    $results += @{
        Name = "Doctor Portal"
        Success = $result
        URL = $DOCTOR_URL
    }
}

# Summary
Write-Host ""
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host "  Deployment Summary" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor Magenta

foreach ($r in $results) {
    $status = if ($r.Success) { "SUCCESS" } else { "FAILED" }
    $color = if ($r.Success) { "Green" } else { "Red" }
    Write-Host "$($r.Name): " -NoNewline
    Write-Host $status -ForegroundColor $color
    if ($r.Success) {
        Write-Host "  URL: $($r.URL)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host "  Quick Access URLs" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Patient Portal: $PATIENT_URL" -ForegroundColor Cyan
Write-Host "Doctor Portal:  $DOCTOR_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
