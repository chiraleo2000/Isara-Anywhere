# Run Izara UI Tests - Local Environment
# This script runs the full workflow UI tests against local Docker containers

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - LOCAL UI TESTS" -ForegroundColor Cyan
Write-Host "  Version 1.4.5" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if local Docker containers are running
Write-Host "[1/4] Checking local Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}"
if ($containers -notmatch "izara-patient-portal") {
    Write-Host "ERROR: izara-patient-portal container not running!" -ForegroundColor Red
    Write-Host "Start with: docker compose up -d" -ForegroundColor Yellow
    exit 1
}
if ($containers -notmatch "izara-doctor-portal") {
    Write-Host "ERROR: izara-doctor-portal container not running!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker containers running" -ForegroundColor Green

# Check portals are responding
Write-Host "[2/4] Checking portal health..." -ForegroundColor Yellow
try {
    $patientHealth = Invoke-WebRequest -Uri "http://localhost:3005" -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Patient Portal: $($patientHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Patient Portal not responding!" -ForegroundColor Red
    exit 1
}

try {
    $doctorHealth = Invoke-WebRequest -Uri "http://localhost:3010" -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Doctor Portal: $($doctorHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Doctor Portal not responding!" -ForegroundColor Red
    exit 1
}

# Set environment variables
Write-Host "[3/4] Setting test environment..." -ForegroundColor Yellow
$env:TEST_ENV = "LOCAL"
$env:PATIENT_PORTAL_URL = "http://localhost:3005"
$env:DOCTOR_PORTAL_URL = "http://localhost:3010"
Write-Host "✅ Environment configured" -ForegroundColor Green

# Run tests
Write-Host "[4/4] Running Playwright UI tests..." -ForegroundColor Yellow
Write-Host ""

Set-Location "c:\Users\chira\Documents\Isara-telemed\Isara-Anywhere"

# Run only the local workflow tests
npx playwright test tests/e2e/specs/workflow-ui-tests.spec.ts --headed --project="Local E2E Tests"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LOCAL UI TESTS COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
