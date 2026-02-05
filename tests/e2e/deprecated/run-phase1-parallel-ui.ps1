# ============================================================================
# IZARA TELEMEDICINE - RUN PHASE 1 PARALLEL UI TESTS
# ============================================================================
# Version: 2.0.0
# Updated: February 4, 2026
# 
# This script runs comprehensive parallel UI tests with VISIBLE BROWSERS
# 5 browser windows will open simultaneously for all user types
# ============================================================================

param(
    [ValidateSet('local', 'cloud')]
    [string]$Environment = 'local',
    [switch]$SkipDockerCheck
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IZARA PHASE 1 - PARALLEL UI TESTS" -ForegroundColor Cyan
Write-Host "  Version 2.0.0" -ForegroundColor Cyan
Write-Host "  Environment: $Environment" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  5 BROWSER WINDOWS WILL OPEN:" -ForegroundColor Green
Write-Host "  - Patient 1 (top-left)" -ForegroundColor White
Write-Host "  - Patient 2 (top-center)" -ForegroundColor White
Write-Host "  - Patient 3 (top-right)" -ForegroundColor White
Write-Host "  - Doctor (bottom-left)" -ForegroundColor White
Write-Host "  - Admin (bottom-right)" -ForegroundColor White
Write-Host ""

$ErrorActionPreference = "Continue"

# Navigate to test directory
$testDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $testDir

# ============================================================================
# STEP 1: Check Docker containers (for local)
# ============================================================================
if ($Environment -eq 'local' -and -not $SkipDockerCheck) {
    Write-Host "[1/4] Checking Docker containers..." -ForegroundColor Yellow
    
    try {
        $containers = docker ps --format "{{.Names}}" 2>&1
        
        $services = @("izara-patient-portal", "izara-doctor-portal", "izara-postgres")
        foreach ($service in $services) {
            if ($containers -match $service) {
                Write-Host "  ✅ $service running" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $service NOT running" -ForegroundColor Red
                Write-Host "  Run: docker-compose up -d" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  ⚠️ Docker check failed" -ForegroundColor Yellow
    }
}

# ============================================================================
# STEP 2: Check portal health
# ============================================================================
Write-Host ""
Write-Host "[2/4] Checking portal health..." -ForegroundColor Yellow

if ($Environment -eq 'local') {
    $patientPortal = "http://localhost:3005"
    $doctorPortal = "http://localhost:3010"
} else {
    $patientPortal = $env:CLOUD_PATIENT_URL
    if (-not $patientPortal) { $patientPortal = "https://izara-patient-portal-hvht4obouq-as.a.run.app" }
    $doctorPortal = $env:CLOUD_DOCTOR_URL
    if (-not $doctorPortal) { $doctorPortal = "https://izara-doctor-portal-hvht4obouq-as.a.run.app" }
}

try {
    $patientHealth = Invoke-WebRequest -Uri "$patientPortal/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "  ✅ Patient Portal: $($patientHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Patient Portal not responding" -ForegroundColor Red
}

try {
    $doctorHealth = Invoke-WebRequest -Uri "$doctorPortal/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "  ✅ Doctor Portal: $($doctorHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Doctor Portal not responding" -ForegroundColor Red
}

# ============================================================================
# STEP 3: Install dependencies
# ============================================================================
Write-Host ""
Write-Host "[3/4] Checking Playwright installation..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm dependencies..." -ForegroundColor Yellow
    npm install
}

# Ensure Playwright browsers are installed
npx playwright install chromium 2>&1 | Out-Null
Write-Host "  ✅ Playwright ready" -ForegroundColor Green

# ============================================================================
# STEP 4: Run Phase 1 Parallel UI Tests
# ============================================================================
Write-Host ""
Write-Host "[4/4] Starting Parallel UI Tests..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  ⚠️  5 BROWSER WINDOWS WILL OPEN NOW" -ForegroundColor Yellow
Write-Host "  Tests run with VISIBLE UI (not headless)" -ForegroundColor Yellow
Write-Host ""

# Set environment variable
$env:TEST_ENV = $Environment

# Run the parallel UI test
npx playwright test specs/phase1-parallel-ui-workflow.spec.ts --project="Phase1-Parallel-UI" --reporter=list

$testExitCode = $LASTEXITCODE

# ============================================================================
# RESULTS
# ============================================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

if ($testExitCode -eq 0) {
    Write-Host "  ✅ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "  ❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "  Exit code: $testExitCode" -ForegroundColor Yellow
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  View HTML Report:" -ForegroundColor White
Write-Host "  npx playwright show-report" -ForegroundColor Yellow
Write-Host ""

exit $testExitCode
