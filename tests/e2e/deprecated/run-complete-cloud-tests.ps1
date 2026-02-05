# =============================================================================
# IZARA TELEMEDICINE - RUN ALL WORKFLOW TESTS (CLOUD)
# =============================================================================
# Version: 1.4.4
# Purpose: Run comprehensive workflow tests on Cloud Run with UI display
# Usage: .\tests\e2e\run-complete-cloud-tests.ps1
# =============================================================================

param(
    [switch]$Headed = $true,
    [switch]$Debug = $false
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - CLOUD WORKFLOW TESTS" -ForegroundColor Cyan
Write-Host "  Version 1.4.4 (Comprehensive)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration - Cloud Run URLs
$CLOUD_PATIENT_PORTAL = "https://izara-patient-portal-hvht4obouq-as.a.run.app"
$CLOUD_DOCTOR_PORTAL = "https://izara-doctor-portal-hvht4obouq-as.a.run.app"
$CLOUD_MEETING_SERVER = "https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app"

# Set environment
$env:TEST_ENV = "cloud"

# Health checks
Write-Host "[1/4] Performing Cloud Run health checks..." -ForegroundColor Yellow
try {
    $patientHealth = Invoke-RestMethod -Uri "$CLOUD_PATIENT_PORTAL/health" -Method Get -TimeoutSec 30
    if ($patientHealth.status -eq "healthy") {
        Write-Host "✅ Cloud Patient Portal: healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Cloud Patient Portal not responding: $_" -ForegroundColor Red
    exit 1
}

try {
    $doctorHealth = Invoke-RestMethod -Uri "$CLOUD_DOCTOR_PORTAL/health" -Method Get -TimeoutSec 30
    if ($doctorHealth.status -eq "healthy") {
        Write-Host "✅ Cloud Doctor Portal: healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Cloud Doctor Portal not responding: $_" -ForegroundColor Red
    exit 1
}

# Clean previous test results
Write-Host "[2/4] Cleaning previous cloud test results..." -ForegroundColor Yellow
$testResultsPath = Join-Path $PSScriptRoot "test-results"
$cloudResultsPath = Join-Path $testResultsPath "cloud"
if (Test-Path $cloudResultsPath) {
    Remove-Item -Path "$cloudResultsPath\*" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $cloudResultsPath -Force | Out-Null
Write-Host "✅ Cloud test results directory prepared" -ForegroundColor Green

# Run tests
Write-Host "[3/4] Running comprehensive workflow tests on Cloud (UI mode)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Cloud URLs:" -ForegroundColor Gray
Write-Host "  Patient Portal: $CLOUD_PATIENT_PORTAL" -ForegroundColor Gray
Write-Host "  Doctor Portal:  $CLOUD_DOCTOR_PORTAL" -ForegroundColor Gray
Write-Host ""

Push-Location $PSScriptRoot

# Run the complete workflows test with cloud project
$testCommand = "npx playwright test complete-workflows-tests.spec.ts --project='Cloud Comprehensive'"
if ($Debug) {
    $testCommand += " --debug"
}

Write-Host "Running: $testCommand" -ForegroundColor Gray
Invoke-Expression $testCommand

$exitCode = $LASTEXITCODE

Pop-Location

# Generate report
Write-Host ""
Write-Host "[4/4] Generating test report..." -ForegroundColor Yellow
$reportPath = Join-Path $PSScriptRoot "playwright-report"
if (Test-Path "$reportPath\index.html") {
    Write-Host "✅ Report generated: $reportPath\index.html" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  ✅ ALL CLOUD TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "  ❌ SOME TESTS FAILED (Exit code: $exitCode)" -ForegroundColor Red
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Screenshots saved to: $cloudResultsPath" -ForegroundColor Gray
Write-Host "To view report: npx playwright show-report" -ForegroundColor Gray

exit $exitCode
