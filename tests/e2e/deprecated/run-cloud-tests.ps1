# Run Izara UI Tests - Cloud Environment
# This script runs the full workflow UI tests against Cloud Run deployments

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - CLOUD UI TESTS" -ForegroundColor Cyan
Write-Host "  Version 1.4.5" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Cloud Run URLs
$PATIENT_PORTAL = "https://izara-patient-portal-hvht4obouq-as.a.run.app"
$DOCTOR_PORTAL = "https://izara-doctor-portal-hvht4obouq-as.a.run.app"

# Check Cloud Run services
Write-Host "[1/3] Checking Cloud Run deployments..." -ForegroundColor Yellow
try {
    $patientHealth = Invoke-WebRequest -Uri $PATIENT_PORTAL -Method GET -UseBasicParsing -TimeoutSec 30
    Write-Host "✅ Patient Portal: $($patientHealth.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Cloud Patient Portal not responding!" -ForegroundColor Red
    Write-Host "URL: $PATIENT_PORTAL" -ForegroundColor Yellow
    exit 1
}

try {
    $doctorHealth = Invoke-WebRequest -Uri $DOCTOR_PORTAL -Method GET -UseBasicParsing -TimeoutSec 30
    Write-Host "✅ Doctor Portal: $($doctorHealth.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Cloud Doctor Portal not responding!" -ForegroundColor Red
    Write-Host "URL: $DOCTOR_PORTAL" -ForegroundColor Yellow
    exit 1
}

# Set environment variables
Write-Host "[2/3] Setting test environment..." -ForegroundColor Yellow
$env:TEST_ENV = "CLOUD"
$env:PATIENT_PORTAL_URL = $PATIENT_PORTAL
$env:DOCTOR_PORTAL_URL = $DOCTOR_PORTAL
Write-Host "✅ Environment configured" -ForegroundColor Green

# Run tests
Write-Host "[3/3] Running Playwright UI tests against Cloud Run..." -ForegroundColor Yellow
Write-Host ""

Set-Location "c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere"

# Run cloud-specific tests
npx playwright test tests/e2e/specs/cloud-workflow-ui-tests.spec.ts --headed --project="Cloud E2E Tests"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CLOUD UI TESTS COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
