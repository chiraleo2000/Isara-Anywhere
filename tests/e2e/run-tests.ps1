<#
.SYNOPSIS
    Izara Telemedicine - Unified Test Runner
    Single script to run ALL E2E tests for local and cloud environments.

.DESCRIPTION
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║                    IZARA TELEMEDICINE TEST RUNNER v2.0.0                  ║
    ║                     Unified E2E Testing Framework                          ║
    ╚══════════════════════════════════════════════════════════════════════════╝

    Consolidates all test scripts into ONE command:
    - Smoke tests (quick health check)
    - Full E2E tests (comprehensive workflow)
    - API tests (endpoint verification)
    - UI tests (visual browser testing)
    - Cloud tests (Cloud Run verification)

.PARAMETER Suite
    Test suite to run:
    - smoke     : Quick health check (2-3 min)
    - api       : API endpoint tests (5 min)
    - ui        : UI workflow tests with visible browser (10 min)
    - full      : Full comprehensive tests (15 min)
    - cloud     : Cloud-specific tests
    - all       : Run everything

.PARAMETER Target
    Environment to test: local, cloud

.PARAMETER Headed
    Run with visible browser (default for UI tests)

.PARAMETER Workers
    Number of parallel workers (default: 3)

.EXAMPLE
    .\tests\e2e\run-tests.ps1 smoke
    Quick smoke test (local)

.EXAMPLE
    .\tests\e2e\run-tests.ps1 full -Target cloud
    Full tests against cloud environment

.EXAMPLE
    .\tests\e2e\run-tests.ps1 ui -Headed
    UI tests with visible browser

.NOTES
    Version: 2.0.0
    Author: Izara Telemedicine Team
    Last Updated: February 4, 2026
    
    Replaces:
    - run-local-tests.ps1
    - run-cloud-tests.ps1
    - run-comprehensive-ui-tests.ps1
    - run-phase1-parallel-ui.ps1
    - run-registration-tests.ps1
    - run-complete-local-tests.ps1
    - run-complete-cloud-tests.ps1
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("smoke", "api", "ui", "full", "cloud", "all", "help")]
    [string]$Suite = "smoke",

    [Parameter(Position=1)]
    [ValidateSet("local", "cloud")]
    [string]$Target = "local",

    [Parameter(Mandatory=$false)]
    [switch]$Headed,

    [Parameter(Mandatory=$false)]
    [int]$Workers = 3,

    [Parameter(Mandatory=$false)]
    [switch]$Debug
)

# ============================================================================
# CONFIGURATION
# ============================================================================

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $PSCommandPath
$E2EDir = $ScriptDir

# Local URLs
$LOCAL_PATIENT = "http://localhost:3005"
$LOCAL_DOCTOR = "http://localhost:3010"
$LOCAL_MEETING = "http://localhost:3020"

# Cloud URLs
$CLOUD_PATIENT = "https://izara-patient-portal-724889190329.asia-southeast1.run.app"
$CLOUD_DOCTOR = "https://izara-doctor-portal-724889190329.asia-southeast1.run.app"
$CLOUD_MEETING = "https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    IZARA TELEMEDICINE TEST RUNNER v2.0.0                  ║" -ForegroundColor Cyan
    Write-Host "║                      Unified E2E Testing Framework                         ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  ℹ️  $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }

function Test-ServiceHealth {
    param([string]$Url, [string]$Name)
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 10
        Write-Success "$Name`: $($response.status)"
        return $true
    } catch {
        Write-Err "$Name`: Connection failed"
        return $false
    }
}

function Ensure-Dependencies {
    Push-Location $E2EDir
    
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies..."
        npm install
        npx playwright install chromium
    }
    
    Pop-Location
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

function Setup-Environment {
    param([string]$Target)
    
    if ($Target -eq "cloud") {
        $env:TEST_ENV = "cloud"
        $env:CLOUD_PATIENT_URL = $CLOUD_PATIENT
        $env:CLOUD_DOCTOR_URL = $CLOUD_DOCTOR
        $env:CLOUD_MEETING_URL = $CLOUD_MEETING
        
        Write-Host "  Environment: CLOUD" -ForegroundColor Yellow
        Write-Host "    Patient: $CLOUD_PATIENT" -ForegroundColor Gray
        Write-Host "    Doctor:  $CLOUD_DOCTOR" -ForegroundColor Gray
    } else {
        $env:TEST_ENV = "local"
        
        Write-Host "  Environment: LOCAL" -ForegroundColor Green
        Write-Host "    Patient: $LOCAL_PATIENT" -ForegroundColor Gray
        Write-Host "    Doctor:  $LOCAL_DOCTOR" -ForegroundColor Gray
    }
    Write-Host ""
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

function Invoke-PreflightChecks {
    param([string]$Target)
    
    Write-Host "PRE-FLIGHT CHECKS" -ForegroundColor Magenta
    Write-Host ""
    
    $allHealthy = $true
    
    if ($Target -eq "local") {
        # Check Docker containers
        Write-Host "  Checking Docker containers..." -ForegroundColor Yellow
        $containers = docker ps --format "{{.Names}}" 2>$null
        
        $required = @("izara-patient-portal", "izara-doctor-portal", "izara-postgres")
        foreach ($container in $required) {
            if ($containers -match $container) {
                Write-Success "$container is running"
            } else {
                Write-Err "$container is NOT running"
                $allHealthy = $false
            }
        }
        Write-Host ""
        
        # Check service health
        Write-Host "  Checking API health..." -ForegroundColor Yellow
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $LOCAL_PATIENT -Name "Patient Portal")
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $LOCAL_DOCTOR -Name "Doctor Portal")
        
    } else {
        # Check cloud services
        Write-Host "  Checking Cloud Run services..." -ForegroundColor Yellow
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $CLOUD_PATIENT -Name "Patient Portal")
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $CLOUD_DOCTOR -Name "Doctor Portal")
    }
    
    Write-Host ""
    
    if (-not $allHealthy) {
        Write-Err "Pre-flight checks failed!"
        if ($Target -eq "local") {
            Write-Info "Start containers with: docker compose up -d"
        }
        exit 1
    }
    
    Write-Success "All pre-flight checks passed!"
    Write-Host ""
}

# ============================================================================
# TEST SUITES
# ============================================================================

function Run-SmokeTests {
    param([string]$Target, [switch]$Headed)
    
    Write-Host "RUNNING SMOKE TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "" }
    
    Push-Location $E2EDir
    npx playwright test specs/smoke-test.spec.ts $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Run-ApiTests {
    param([string]$Target, [switch]$Headed)
    
    Write-Host "RUNNING API TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "" }
    
    Push-Location $E2EDir
    npx playwright test specs/api-status.spec.ts specs/health-records-api.spec.ts $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Run-UiTests {
    param([string]$Target, [switch]$Headed, [int]$Workers)
    
    Write-Host "RUNNING UI TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    # UI tests are always headed by default
    $headedFlag = "--headed"
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "--project='Local E2E Tests'" }
    
    Push-Location $E2EDir
    npx playwright test specs/comprehensive-parallel-ui.spec.ts specs/ui-pages-workflow.spec.ts --workers=$Workers $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Run-FullTests {
    param([string]$Target, [switch]$Headed, [int]$Workers)
    
    Write-Host "RUNNING FULL COMPREHENSIVE TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "--project='Local E2E Tests'" }
    
    # Run comprehensive test files
    $testFiles = @(
        "specs/smoke-test.spec.ts",
        "specs/api-status.spec.ts",
        "specs/comprehensive-parallel-ui.spec.ts",
        "specs/appointment-workflow.spec.ts",
        "specs/meeting-workflow.spec.ts",
        "specs/health-records-workflow.spec.ts"
    )
    
    Push-Location $E2EDir
    npx playwright test $testFiles --workers=$Workers $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Run-CloudTests {
    Write-Host "RUNNING CLOUD-SPECIFIC TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    Push-Location $E2EDir
    npx playwright test specs/cloud-*.spec.ts --headed --project='Cloud E2E Tests'
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Run-AllTests {
    param([string]$Target, [switch]$Headed, [int]$Workers)
    
    Write-Host "RUNNING ALL TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "--project='Local E2E Tests'" }
    
    Push-Location $E2EDir
    npx playwright test --workers=$Workers $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

# ============================================================================
# HELP FUNCTION
# ============================================================================

function Show-Help {
    Write-Banner
    
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\tests\e2e\run-tests.ps1 <suite> [target] [options]" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "SUITES:" -ForegroundColor Yellow
    Write-Host "  smoke     Quick health check tests (~2 min)" -ForegroundColor Gray
    Write-Host "  api       API endpoint verification (~5 min)" -ForegroundColor Gray
    Write-Host "  ui        UI workflow tests with visible browser (~10 min)" -ForegroundColor Gray
    Write-Host "  full      Full comprehensive tests (~15 min)" -ForegroundColor Gray
    Write-Host "  cloud     Cloud-specific tests" -ForegroundColor Gray
    Write-Host "  all       Run all test suites" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "TARGETS:" -ForegroundColor Yellow
    Write-Host "  local     Test local Docker environment (default)" -ForegroundColor Gray
    Write-Host "  cloud     Test Cloud Run deployment" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "OPTIONS:" -ForegroundColor Yellow
    Write-Host "  -Headed       Run with visible browser" -ForegroundColor Gray
    Write-Host "  -Workers N    Number of parallel workers (default: 3)" -ForegroundColor Gray
    Write-Host "  -Debug        Enable debug output" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\tests\e2e\run-tests.ps1 smoke                    # Quick local smoke test" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 full local               # Full local tests" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 ui -Headed               # UI tests with browser" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 full cloud               # Full cloud tests" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 all -Workers 4           # All tests, 4 workers" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "QUICK COMMANDS:" -ForegroundColor Yellow
    Write-Host "  Smoke test:    .\tests\e2e\run-tests.ps1 smoke" -ForegroundColor Gray
    Write-Host "  Full test:     .\tests\e2e\run-tests.ps1 full" -ForegroundColor Gray
    Write-Host "  Show report:   npx playwright show-report" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Banner

if ($Suite -eq "help") {
    Show-Help
    exit 0
}

# Setup
Setup-Environment -Target $Target
Invoke-PreflightChecks -Target $Target
Ensure-Dependencies

# Track start time
$startTime = Get-Date

# Run selected suite
$exitCode = 0

switch ($Suite) {
    "smoke" {
        $exitCode = Run-SmokeTests -Target $Target -Headed:$Headed
    }
    "api" {
        $exitCode = Run-ApiTests -Target $Target -Headed:$Headed
    }
    "ui" {
        $exitCode = Run-UiTests -Target $Target -Headed:$true -Workers $Workers
    }
    "full" {
        $exitCode = Run-FullTests -Target $Target -Headed:$Headed -Workers $Workers
    }
    "cloud" {
        Setup-Environment -Target "cloud"
        $exitCode = Run-CloudTests
    }
    "all" {
        $exitCode = Run-AllTests -Target $Target -Headed:$Headed -Workers $Workers
    }
}

# Calculate duration
$duration = (Get-Date) - $startTime
$durationStr = "{0:mm}m {0:ss}s" -f $duration

# Results summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "  ✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "     Duration: $durationStr" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "  ❌ SOME TESTS FAILED (Exit Code: $exitCode)" -ForegroundColor Red
    Write-Host "     Duration: $durationStr" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Show how to view report
Write-Host "  View detailed report: npx playwright show-report" -ForegroundColor Yellow
Write-Host ""

exit $exitCode
