# =============================================================================
# IZARA TELEMEDICINE - RUN ALL WORKFLOW TESTS (LOCAL)
# =============================================================================
# Version: 1.4.4
# Purpose: Run comprehensive workflow tests on local environment with UI display
# Usage: .\tests\e2e\run-complete-local-tests.ps1
# =============================================================================

param(
    [switch]$Headed = $true,
    [switch]$Debug = $false
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - LOCAL WORKFLOW TESTS" -ForegroundColor Cyan
Write-Host "  Version 1.4.4 (Comprehensive)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LOCAL_PATIENT_PORTAL = "http://localhost:3005"
$LOCAL_DOCTOR_PORTAL = "http://localhost:3010"
$LOCAL_MEETING_SERVER = "http://localhost:3020"

# Set environment
$env:TEST_ENV = "local"

# Check Docker containers
Write-Host "[1/5] Checking Docker containers..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" 2>&1
if ($containers -match "izara-patient-portal" -and $containers -match "izara-doctor-portal") {
    Write-Host "✅ Docker containers running" -ForegroundColor Green
} else {
    Write-Host "❌ Docker containers not running. Please run 'docker-compose up -d' first" -ForegroundColor Red
    exit 1
}

# Health checks
Write-Host "[2/5] Performing health checks..." -ForegroundColor Yellow
try {
    $patientHealth = Invoke-RestMethod -Uri "$LOCAL_PATIENT_PORTAL/health" -Method Get -TimeoutSec 10
    if ($patientHealth.status -eq "healthy") {
        Write-Host "✅ Patient Portal: healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Patient Portal not responding" -ForegroundColor Red
    exit 1
}

try {
    $doctorHealth = Invoke-RestMethod -Uri "$LOCAL_DOCTOR_PORTAL/health" -Method Get -TimeoutSec 10
    if ($doctorHealth.status -eq "healthy") {
        Write-Host "✅ Doctor Portal: healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Doctor Portal not responding" -ForegroundColor Red
    exit 1
}

# Clean previous test results
Write-Host "[3/5] Cleaning previous test results..." -ForegroundColor Yellow
$testResultsPath = Join-Path $PSScriptRoot "test-results"
if (Test-Path $testResultsPath) {
    Remove-Item -Path "$testResultsPath\*" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $testResultsPath -Force | Out-Null
Write-Host "✅ Test results directory prepared" -ForegroundColor Green

# Run tests
Write-Host "[4/5] Running comprehensive workflow tests (UI mode)..." -ForegroundColor Yellow
Write-Host ""

Push-Location $PSScriptRoot

# Run the complete workflows test
$testCommand = "npx playwright test complete-workflows-tests.spec.ts --project='Local Comprehensive'"
if ($Debug) {
    $testCommand += " --debug"
}

Write-Host "Running: $testCommand" -ForegroundColor Gray
Invoke-Expression $testCommand

$exitCode = $LASTEXITCODE

Pop-Location

# Generate report
Write-Host ""
Write-Host "[5/5] Generating test report..." -ForegroundColor Yellow
$reportPath = Join-Path $PSScriptRoot "playwright-report"
if (Test-Path "$reportPath\index.html") {
    Write-Host "✅ Report generated: $reportPath\index.html" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  ✅ ALL LOCAL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "  ❌ SOME TESTS FAILED (Exit code: $exitCode)" -ForegroundColor Red
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Screenshots saved to: $testResultsPath" -ForegroundColor Gray
Write-Host "To view report: npx playwright show-report" -ForegroundColor Gray

exit $exitCode
