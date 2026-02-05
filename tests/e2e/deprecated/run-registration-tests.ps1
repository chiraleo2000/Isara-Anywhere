# ============================================================================
# IZARA TELEMEDICINE - RUN ALL LOCAL TESTS
# ============================================================================
# Version: 1.0.0
# Updated: February 4, 2026
# 
# This script:
# 1. Checks Docker containers are running
# 2. Runs comprehensive E2E tests with visible UI
# 3. Tests Registration, Workflows, and API endpoints
# ============================================================================

param(
    [switch]$SkipDockerCheck,
    [switch]$HeadlessMode,
    [string]$TestFile = ""
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - LOCAL E2E TESTS" -ForegroundColor Cyan
Write-Host "  Version 1.4.5" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Navigate to test directory
$testDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $testDir

# ============================================================================
# STEP 1: Check Docker containers
# ============================================================================
if (-not $SkipDockerCheck) {
    Write-Host "[1/4] Checking Docker containers..." -ForegroundColor Yellow
    
    try {
        $containers = docker ps --format "{{.Names}}" 2>&1
        
        if ($containers -match "izara-patient-portal") {
            Write-Host "  ✅ Patient Portal container running" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Patient Portal container NOT running" -ForegroundColor Red
            Write-Host "  Run: docker-compose up -d" -ForegroundColor Yellow
        }
        
        if ($containers -match "izara-doctor-portal") {
            Write-Host "  ✅ Doctor Portal container running" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Doctor Portal container NOT running" -ForegroundColor Red
        }
        
        if ($containers -match "izara-postgres") {
            Write-Host "  ✅ PostgreSQL container running" -ForegroundColor Green
        } else {
            Write-Host "  ❌ PostgreSQL container NOT running" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ⚠️ Docker check failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  Continuing anyway..." -ForegroundColor Yellow
    }
}

# ============================================================================
# STEP 2: Check portal health
# ============================================================================
Write-Host ""
Write-Host "[2/4] Checking portal health..." -ForegroundColor Yellow

$patientPortal = "http://localhost:3005"
$doctorPortal = "http://localhost:3010"

try {
    $patientHealth = Invoke-WebRequest -Uri "$patientPortal/api/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Patient Portal: $($patientHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Patient Portal not responding: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $doctorHealth = Invoke-WebRequest -Uri "$doctorPortal/api/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "  ✅ Doctor Portal: $($doctorHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Doctor Portal not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# STEP 3: Install dependencies if needed
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
# STEP 4: Run tests
# ============================================================================
Write-Host ""
Write-Host "[4/4] Running E2E tests..." -ForegroundColor Yellow
Write-Host ""

$env:TEST_ENV = "local"

# Build test command
$testCommand = "npx playwright test"

if ($TestFile) {
    $testCommand += " $TestFile"
} else {
    # Run specific test projects
    $testCommand += " --project='Registration & Workflow'"
}

if (-not $HeadlessMode) {
    $testCommand += " --headed"
}

Write-Host "Executing: $testCommand" -ForegroundColor Cyan
Write-Host ""

# Execute tests
Invoke-Expression $testCommand

$exitCode = $LASTEXITCODE

# ============================================================================
# STEP 5: Show results
# ============================================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host "  ✅ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "  ❌ SOME TESTS FAILED (Exit code: $exitCode)" -ForegroundColor Red
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "View report: npx playwright show-report" -ForegroundColor Yellow
Write-Host ""

exit $exitCode
