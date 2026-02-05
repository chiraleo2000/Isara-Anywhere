# =============================================================================
# IZARA TELEMEDICINE - COMPREHENSIVE UI TESTS (VISIBLE)
# =============================================================================
# Version: 4.0.0
# Updated: February 4, 2026
# Purpose: Run ALL tests with VISIBLE UI browsers
# 
# Usage:
#   .\tests\e2e\run-comprehensive-ui-tests.ps1              # Local tests
#   .\tests\e2e\run-comprehensive-ui-tests.ps1 -Cloud       # Cloud tests
#   .\tests\e2e\run-comprehensive-ui-tests.ps1 -Headed      # Force headed
# =============================================================================

param(
    [switch]$Cloud,
    [switch]$Headed,
    [string]$Spec = "comprehensive-parallel-ui.spec.ts"
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Banner
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   IZARA TELEMEDICINE - COMPREHENSIVE UI TESTS" -ForegroundColor Cyan
Write-Host "   Version 4.0.0 - VISIBLE BROWSER TESTING" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LOCAL_PATIENT = "http://localhost:3005"
$LOCAL_DOCTOR = "http://localhost:3010"
$LOCAL_MEETING = "http://localhost:3020"

$CLOUD_PATIENT = "https://izara-patient-portal-724889190329.asia-southeast1.run.app"
$CLOUD_DOCTOR = "https://izara-doctor-portal-724889190329.asia-southeast1.run.app"
$CLOUD_MEETING = "https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app"

# Set environment
if ($Cloud) {
    $env:TEST_ENV = "cloud"
    $env:CLOUD_PATIENT_URL = $CLOUD_PATIENT
    $env:CLOUD_DOCTOR_URL = $CLOUD_DOCTOR
    $env:CLOUD_MEETING_URL = $CLOUD_MEETING
    Write-Host "[ENV] Testing CLOUD environment" -ForegroundColor Yellow
    Write-Host "  Patient Portal: $CLOUD_PATIENT" -ForegroundColor Gray
    Write-Host "  Doctor Portal:  $CLOUD_DOCTOR" -ForegroundColor Gray
    Write-Host "  Meeting Server: $CLOUD_MEETING" -ForegroundColor Gray
} else {
    $env:TEST_ENV = "local"
    Write-Host "[ENV] Testing LOCAL environment" -ForegroundColor Green
    Write-Host "  Patient Portal: $LOCAL_PATIENT" -ForegroundColor Gray
    Write-Host "  Doctor Portal:  $LOCAL_DOCTOR" -ForegroundColor Gray
    Write-Host "  Meeting Server: $LOCAL_MEETING" -ForegroundColor Gray
}
Write-Host ""

# Check local containers if not cloud
if (-not $Cloud) {
    Write-Host "[CHECK] Verifying local Docker containers..." -ForegroundColor Yellow
    
    $containers = docker ps --format "{{.Names}}" 2>$null
    $required = @("izara-patient-portal", "izara-doctor-portal", "izara-postgres")
    $missing = @()
    
    foreach ($container in $required) {
        if ($containers -match $container) {
            Write-Host "  ✅ $container is running" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $container is NOT running" -ForegroundColor Red
            $missing += $container
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "[ERROR] Missing containers: $($missing -join ', ')" -ForegroundColor Red
        Write-Host "Please start containers first: docker compose up -d" -ForegroundColor Yellow
        exit 1
    }
    Write-Host ""
}

# Check API health
Write-Host "[CHECK] Verifying API health..." -ForegroundColor Yellow

if ($Cloud) {
    $patientApi = $CLOUD_PATIENT
    $doctorApi = $CLOUD_DOCTOR
} else {
    $patientApi = $LOCAL_PATIENT
    $doctorApi = $LOCAL_DOCTOR
}

try {
    $patientHealth = Invoke-RestMethod -Uri "$patientApi/api/health" -Method GET -TimeoutSec 10
    Write-Host "  ✅ Patient Portal API: $($patientHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Patient Portal API: Connection failed" -ForegroundColor Red
    if (-not $Cloud) { exit 1 }
}

try {
    $doctorHealth = Invoke-RestMethod -Uri "$doctorApi/api/health" -Method GET -TimeoutSec 10
    Write-Host "  ✅ Doctor Portal API: $($doctorHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Doctor Portal API: Connection failed" -ForegroundColor Red
    if (-not $Cloud) { exit 1 }
}

Write-Host ""

# Navigate to test directory
$testDir = Join-Path $PSScriptRoot ""
if (-not (Test-Path $testDir)) {
    $testDir = "c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere\tests\e2e"
}

Push-Location $testDir

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "[SETUP] Installing dependencies..." -ForegroundColor Yellow
    npm install
    npx playwright install chromium
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   RUNNING TESTS WITH VISIBLE UI" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Run tests with visible UI
$testCommand = "npx playwright test specs/$Spec --headed"

if ($Cloud) {
    $testCommand = "npx playwright test specs/$Spec --headed --project='Cloud E2E Tests'"
} else {
    $testCommand = "npx playwright test specs/$Spec --headed"
}

Write-Host "[RUN] $testCommand" -ForegroundColor Yellow
Write-Host ""

# Execute tests
Invoke-Expression $testCommand

$exitCode = $LASTEXITCODE

# Show results
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "   ✅ ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "   ❌ SOME TESTS FAILED (Exit Code: $exitCode)" -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan

# Show report
Write-Host ""
Write-Host "To view detailed report, run:" -ForegroundColor Yellow
Write-Host "  npx playwright show-report" -ForegroundColor Gray

Pop-Location

exit $exitCode
