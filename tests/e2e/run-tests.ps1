<#
.SYNOPSIS
    Izara Telemedicine - Unified Test Runner v5.0.0
    Single script to run ALL E2E tests for local and cloud environments.

.DESCRIPTION
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║                    IZARA TELEMEDICINE TEST RUNNER v5.0.0                  ║
    ║              Comprehensive E2E Testing Framework (10 Specs)              ║
    ╚══════════════════════════════════════════════════════════════════════════╝

    10 spec files, 500+ tests across ALL processes:
    - Smoke tests (health endpoints)
    - API exhaustive status checks
    - Appointment workflow (full lifecycle)
    - Meeting workflow (Jitsi, transcript, AI, EMR)
    - Health Records & EMR
    - AI Features (chat, CDS, summarization)
    - UI Navigation (all pages, parallel multi-portal)
    - Content, Consultants, Notifications, Metadata
    - Cloud E2E (Cloud Run deployment validation)

.PARAMETER Suite
    Test suite to run:
    - smoke       : Quick health check (~2 min)            → 01-smoke.spec.ts
    - api         : API endpoint tests (~5 min)            → 02-api-status.spec.ts
    - appointment : Appointment workflow (~5 min)           → 03-appointment-workflow.spec.ts
    - meeting     : Meeting/Transcript/AI/EMR (~5 min)     → 04-meeting-workflow.spec.ts
    - health      : Health Records & EMR (~5 min)          → 05-health-records-emr.spec.ts
    - ai          : AI Features (~3 min)                   → 06-ai-features.spec.ts
    - ui          : UI navigation with visible browser     → 07-ui-navigation.spec.ts
    - content     : Content/Notifications/Metadata (~3 min)→ 08-content-notifications.spec.ts
    - cloud       : Cloud-specific tests                   → 09-cloud-e2e.spec.ts
    - full        : Full comprehensive tests (all local, 01-08)
    - all         : Run everything (01-09)

.PARAMETER Target
    Environment to test: local, cloud

.PARAMETER Headed
    Run with visible browser (default for UI tests)

.PARAMETER Workers
    Number of parallel workers (default: 4)

.EXAMPLE
    .\tests\e2e\run-tests.ps1 smoke
    Quick smoke test (local)

.EXAMPLE
    .\tests\e2e\run-tests.ps1 full -Target cloud
    Full tests against cloud environment

.EXAMPLE
    .\tests\e2e\run-tests.ps1 meeting -Headed
    Meeting workflow tests with visible browser

.NOTES
    Version: 5.0.0
    Author: Izara Telemedicine Team
    Last Updated: February 6, 2026
    
    Test files (9 total, 200+ tests):
    - 01-smoke.spec.ts                  — Portal health checks (14 tests)
    - 02-api-status.spec.ts             — All API endpoints → 200 (40 tests)
    - 03-appointment-workflow.spec.ts   — Full appointment lifecycle (18 tests)
    - 04-meeting-workflow.spec.ts       — Meeting, transcript, AI, EMR (24 tests)
    - 05-health-records-emr.spec.ts     — PHR, EMR, prescriptions (25 tests)
    - 06-ai-features.spec.ts           — AI chat, CDS, summarization (18 tests)
    - 07-ui-navigation.spec.ts         — All pages + parallel (25 tests)
    - 08-content-notifications.spec.ts — Content, consultants, notifications (25 tests)
    - 09-cloud-e2e.spec.ts            — Cloud Run deployment E2E (39 tests)
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("smoke", "api", "appointment", "meeting", "health", "ai", "ui", "content", "cloud", "full", "all", "help")]
    [string]$Suite = "smoke",

    [Parameter(Position=1)]
    [ValidateSet("local", "cloud", "cloud-dev")]
    [string]$Target = "local",

    [Parameter(Mandatory=$false)]
    [switch]$Headed,

    [Parameter(Mandatory=$false)]
    [int]$Workers = 4,

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

# Cloud URLs (production)
$CLOUD_PATIENT = "https://izara-patient-portal-hvht4obouq-as.a.run.app"
$CLOUD_DOCTOR = "https://izara-doctor-portal-hvht4obouq-as.a.run.app"
$CLOUD_MEETING = "https://izara-jitsi-meeting-portal-hvht4obouq-as.a.run.app"

# Cloud Dev-Testing URLs (isolated dev environment)
$CLOUD_DEV_PATIENT = "https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app"
$CLOUD_DEV_DOCTOR = "https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app"
$CLOUD_DEV_MEETING = "https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    IZARA TELEMEDICINE TEST RUNNER v4.0.0                  ║" -ForegroundColor Cyan
    Write-Host "║               Comprehensive E2E Testing Framework (9 Specs)               ║" -ForegroundColor Cyan
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

function Initialize-Dependencies {
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

function Initialize-Environment {
    param([string]$Target)
    
    if ($Target -eq "cloud") {
        $env:TEST_ENV = "cloud"
        $env:CLOUD_PATIENT_URL = $CLOUD_PATIENT
        $env:CLOUD_DOCTOR_URL = $CLOUD_DOCTOR
        $env:CLOUD_MEETING_URL = $CLOUD_MEETING
        
        Write-Host "  Environment: CLOUD (Production)" -ForegroundColor Yellow
        Write-Host "    Patient: $CLOUD_PATIENT" -ForegroundColor Gray
        Write-Host "    Doctor:  $CLOUD_DOCTOR" -ForegroundColor Gray
        Write-Host "    Meeting: $CLOUD_MEETING" -ForegroundColor Gray
    } elseif ($Target -eq "cloud-dev") {
        $env:TEST_ENV = "cloud-dev"
        $env:CLOUD_DEV_PATIENT_URL = $CLOUD_DEV_PATIENT
        $env:CLOUD_DEV_DOCTOR_URL = $CLOUD_DEV_DOCTOR
        $env:CLOUD_DEV_MEETING_URL = $CLOUD_DEV_MEETING
        
        Write-Host "  Environment: CLOUD-DEV (Dev-Testing)" -ForegroundColor Magenta
        Write-Host "    Patient: $CLOUD_DEV_PATIENT" -ForegroundColor Gray
        Write-Host "    Doctor:  $CLOUD_DEV_DOCTOR" -ForegroundColor Gray
        Write-Host "    Meeting: $CLOUD_DEV_MEETING" -ForegroundColor Gray
    } else {
        $env:TEST_ENV = "local"
        
        Write-Host "  Environment: LOCAL" -ForegroundColor Green
        Write-Host "    Patient: $LOCAL_PATIENT" -ForegroundColor Gray
        Write-Host "    Doctor:  $LOCAL_DOCTOR" -ForegroundColor Gray
        Write-Host "    Meeting: $LOCAL_MEETING" -ForegroundColor Gray
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

function Invoke-SmokeTests {
    param([string]$Target, [switch]$Headed)
    
    Write-Host "RUNNING SMOKE TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "" }
    
    Push-Location $E2EDir
    npx playwright test specs/01-smoke.spec.ts $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Invoke-ApiTests {
    param([string]$Target, [switch]$Headed)
    
    Write-Host "RUNNING API TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "" }
    
    Push-Location $E2EDir
    npx playwright test specs/02-api-status.spec.ts $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Invoke-UiTests {
    param([string]$Target, [switch]$Headed, [int]$Workers)
    
    Write-Host "RUNNING UI TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    # UI tests are always headed by default
    $headedFlag = "--headed"
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud E2E Tests'" } else { "--project='Local E2E Tests'" }
    
    Push-Location $E2EDir
    npx playwright test specs/07-ui-navigation.spec.ts --workers=$Workers $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Invoke-FullTests {
    param([string]$Target, [switch]$Headed, [int]$Workers)
    
    Write-Host "RUNNING FULL COMPREHENSIVE TESTS (8 LOCAL SPECS)" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud'" } else { "--project='Local'" }
    
    # Run all local test files (01-08)
    $testFiles = @(
        "specs/01-smoke.spec.ts",
        "specs/02-api-status.spec.ts",
        "specs/03-appointment-workflow.spec.ts",
        "specs/04-meeting-workflow.spec.ts",
        "specs/05-health-records-emr.spec.ts",
        "specs/06-ai-features.spec.ts",
        "specs/07-ui-navigation.spec.ts",
        "specs/08-content-notifications.spec.ts"
    )
    
    Push-Location $E2EDir
    npx playwright test $testFiles --workers=$Workers $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Invoke-CloudTests {
    Write-Host "RUNNING CLOUD-SPECIFIC TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    Push-Location $E2EDir
    npx playwright test specs/09-cloud-e2e.spec.ts --headed --project='Cloud'
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

function Invoke-AllTests {
    param([string]$Target, [switch]$Headed, [int]$Workers)
    
    Write-Host "RUNNING ALL TESTS" -ForegroundColor Magenta
    Write-Host ""
    
    $headedFlag = if ($Headed) { "--headed" } else { "" }
    $projectFlag = if ($Target -eq "cloud") { "--project='Cloud'" } else { "--project='Local'" }
    
    Push-Location $E2EDir
    npx playwright test --workers=$Workers $headedFlag $projectFlag
    $exitCode = $LASTEXITCODE
    Pop-Location
    
    return $exitCode
}

# ============================================================================
# UI STATUS CHECKING
# ============================================================================

function Test-UiPageStatus {
    <#
    .SYNOPSIS
        Checks HTTP status codes for all UI portal pages and reports results.
    #>
    param([string]$Target)

    Write-Host ""
    Write-Host "UI PAGE STATUS CHECK" -ForegroundColor Magenta
    Write-Host ""

    # Determine base URLs
    if ($Target -eq "cloud") {
        $patientBase = $CLOUD_PATIENT
        $doctorBase  = $CLOUD_DOCTOR
        $meetingBase = $CLOUD_MEETING
    } elseif ($Target -eq "cloud-dev") {
        $patientBase = $CLOUD_DEV_PATIENT
        $doctorBase  = $CLOUD_DEV_DOCTOR
        $meetingBase = $CLOUD_DEV_MEETING
    } else {
        $patientBase = $LOCAL_PATIENT
        $doctorBase  = $LOCAL_DOCTOR
        $meetingBase = $LOCAL_MEETING
    }

    # Patient Portal pages
    $patientPages = @(
        @{ Path = "/";                 Name = "Home" },
        @{ Path = "/login";            Name = "Login" },
        @{ Path = "/register";         Name = "Register" },
        @{ Path = "/dashboard";        Name = "Dashboard" },
        @{ Path = "/appointments";     Name = "Appointments" },
        @{ Path = "/health-records";   Name = "Health Records" },
        @{ Path = "/doctors";          Name = "Find Doctors" },
        @{ Path = "/living-will";      Name = "Living Will" },
        @{ Path = "/profile";          Name = "Profile" },
        @{ Path = "/api/health";       Name = "API Health" }
    )

    # Doctor Portal pages
    $doctorPages = @(
        @{ Path = "/";                 Name = "Home" },
        @{ Path = "/login";            Name = "Login" },
        @{ Path = "/dashboard";        Name = "Dashboard" },
        @{ Path = "/appointments";     Name = "Appointments" },
        @{ Path = "/patients";         Name = "Patients" },
        @{ Path = "/clinical-resources"; Name = "Clinical Resources" },
        @{ Path = "/medical-content";  Name = "Medical Content" },
        @{ Path = "/admin";            Name = "Admin Panel" },
        @{ Path = "/api/health";       Name = "API Health" }
    )

    $results = @()
    $totalPass = 0
    $totalFail = 0

    # Check Patient Portal pages
    Write-Host "  Patient Portal ($patientBase)" -ForegroundColor Yellow
    foreach ($page in $patientPages) {
        $url = "$patientBase$($page.Path)"
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop -MaximumRedirection 5
            $status = $response.StatusCode
            $passed = ($status -ge 200 -and $status -lt 400)
            if ($passed) {
                Write-Success "[$status] $($page.Name) → $($page.Path)"
                $totalPass++
            } else {
                Write-Err "[$status] $($page.Name) → $($page.Path)"
                $totalFail++
            }
            $results += @{ Portal = "Patient"; Page = $page.Name; Path = $page.Path; Status = $status; Result = if ($passed) { "PASS" } else { "FAIL" } }
        } catch {
            $statusCode = 0
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            Write-Err "[$statusCode] $($page.Name) → $($page.Path) — $($_.Exception.Message)"
            $totalFail++
            $results += @{ Portal = "Patient"; Page = $page.Name; Path = $page.Path; Status = $statusCode; Result = "FAIL" }
        }
    }

    Write-Host ""

    # Check Doctor Portal pages
    Write-Host "  Doctor Portal ($doctorBase)" -ForegroundColor Yellow
    foreach ($page in $doctorPages) {
        $url = "$doctorBase$($page.Path)"
        try {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop -MaximumRedirection 5
            $status = $response.StatusCode
            $passed = ($status -ge 200 -and $status -lt 400)
            if ($passed) {
                Write-Success "[$status] $($page.Name) → $($page.Path)"
                $totalPass++
            } else {
                Write-Err "[$status] $($page.Name) → $($page.Path)"
                $totalFail++
            }
            $results += @{ Portal = "Doctor"; Page = $page.Name; Path = $page.Path; Status = $status; Result = if ($passed) { "PASS" } else { "FAIL" } }
        } catch {
            $statusCode = 0
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            Write-Err "[$statusCode] $($page.Name) → $($page.Path) — $($_.Exception.Message)"
            $totalFail++
            $results += @{ Portal = "Doctor"; Page = $page.Name; Path = $page.Path; Status = $statusCode; Result = "FAIL" }
        }
    }

    Write-Host ""

    # Check Meeting Server
    Write-Host "  Meeting Server ($meetingBase)" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$meetingBase/api/health" -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        $status = $response.StatusCode
        if ($status -eq 200) {
            Write-Success "[$status] Meeting Server Health"
            $totalPass++
        } else {
            Write-Err "[$status] Meeting Server Health"
            $totalFail++
        }
        $results += @{ Portal = "Meeting"; Page = "Health"; Path = "/api/health"; Status = $status; Result = if ($status -eq 200) { "PASS" } else { "FAIL" } }
    } catch {
        Write-Err "[0] Meeting Server Health — $($_.Exception.Message)"
        $totalFail++
        $results += @{ Portal = "Meeting"; Page = "Health"; Path = "/api/health"; Status = 0; Result = "FAIL" }
    }

    Write-Host ""

    # Summary
    $totalChecks = $totalPass + $totalFail
    if ($totalFail -eq 0) {
        Write-Success "UI Status: $totalPass/$totalChecks pages responding correctly"
    } else {
        Write-Warn "UI Status: $totalPass/$totalChecks passed, $totalFail FAILED"
    }

    return @{ Results = $results; Passed = $totalPass; Failed = $totalFail; Total = $totalChecks }
}

# ============================================================================
# TEST RESULT REPORTING
# ============================================================================

function Write-TestReport {
    <#
    .SYNOPSIS
        Generates a detailed pass/fail test report with per-suite breakdown.
    #>
    param(
        [hashtable[]]$SuiteResults,
        [hashtable]$UiStatus,
        [string]$Duration,
        [string]$Target,
        [string]$Suite
    )

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                        TEST EXECUTION REPORT                             ║" -ForegroundColor Cyan
    Write-Host "╠══════════════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan

    # Environment info
    Write-Host "║  Environment : $Target                                                    " -ForegroundColor White
    Write-Host "║  Suite       : $Suite                                                     " -ForegroundColor White
    Write-Host "║  Duration    : $Duration                                                  " -ForegroundColor White
    Write-Host "║  Timestamp   : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                  " -ForegroundColor White
    Write-Host "╠══════════════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan

    # Suite results
    if ($SuiteResults -and $SuiteResults.Count -gt 0) {
        Write-Host "║  TEST SUITES                                                           ║" -ForegroundColor Yellow
        Write-Host "║  ────────────────────────────────────────────────────────────────       ║" -ForegroundColor Gray

        foreach ($sr in $SuiteResults) {
            $icon = if ($sr.ExitCode -eq 0) { "PASS" } else { "FAIL" }
            $color = if ($sr.ExitCode -eq 0) { "Green" } else { "Red" }
            Write-Host "║    [$icon] $($sr.Name)" -ForegroundColor $color
        }
        Write-Host "║" -ForegroundColor Cyan
    }

    # UI Status results
    if ($UiStatus -and $UiStatus.Total -gt 0) {
        Write-Host "║  UI PAGE STATUS                                                        ║" -ForegroundColor Yellow
        Write-Host "║  ────────────────────────────────────────────────────────────────       ║" -ForegroundColor Gray
        Write-Host "║    Checked : $($UiStatus.Total) pages" -ForegroundColor White
        Write-Host "║    Passed  : $($UiStatus.Passed)" -ForegroundColor Green
        Write-Host "║    Failed  : $($UiStatus.Failed)" -ForegroundColor $(if ($UiStatus.Failed -gt 0) { "Red" } else { "Green" })
        Write-Host "║" -ForegroundColor Cyan

        # Show failed pages
        if ($UiStatus.Failed -gt 0 -and $UiStatus.Results) {
            Write-Host "║    FAILED PAGES:" -ForegroundColor Red
            foreach ($r in $UiStatus.Results) {
                if ($r.Result -eq "FAIL") {
                    Write-Host "║      [$($r.Status)] $($r.Portal) → $($r.Page) ($($r.Path))" -ForegroundColor Red
                }
            }
            Write-Host "║" -ForegroundColor Cyan
        }
    }

    # Overall verdict
    $overallPass = $true
    if ($SuiteResults) {
        foreach ($sr in $SuiteResults) {
            if ($sr.ExitCode -ne 0) { $overallPass = $false; break }
        }
    }
    if ($UiStatus -and $UiStatus.Failed -gt 0) { $overallPass = $false }

    Write-Host "╠══════════════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    if ($overallPass) {
        Write-Host "║                     OVERALL RESULT:  ✅ PASSED                          ║" -ForegroundColor Green
    } else {
        Write-Host "║                     OVERALL RESULT:  ❌ FAILED                          ║" -ForegroundColor Red
    }
    Write-Host "╚══════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    # Save report to file
    $reportDir = Join-Path $E2EDir "reports"
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
    }
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportFile = Join-Path $reportDir "test-report-$timestamp.txt"

    $reportContent = @(
        "IZARA TELEMEDICINE - TEST REPORT",
        "================================",
        "Date      : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
        "Suite     : $Suite",
        "Target    : $Target",
        "Duration  : $Duration",
        ""
    )

    if ($SuiteResults) {
        $reportContent += "TEST SUITES:"
        foreach ($sr in $SuiteResults) {
            $icon = if ($sr.ExitCode -eq 0) { "PASS" } else { "FAIL" }
            $reportContent += "  [$icon] $($sr.Name)"
        }
        $reportContent += ""
    }

    if ($UiStatus -and $UiStatus.Total -gt 0) {
        $reportContent += "UI PAGE STATUS:"
        $reportContent += "  Checked: $($UiStatus.Total) | Passed: $($UiStatus.Passed) | Failed: $($UiStatus.Failed)"
        foreach ($r in $UiStatus.Results) {
            $reportContent += "  [$($r.Result)] $($r.Portal) → $($r.Page) ($($r.Path)) [HTTP $($r.Status)]"
        }
        $reportContent += ""
    }

    $reportContent += "OVERALL: $(if ($overallPass) { 'PASSED' } else { 'FAILED' })"

    $reportContent | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Host "  Report saved: $reportFile" -ForegroundColor Gray
    Write-Host ""
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
    Write-Host "  smoke        Quick health check tests (~2 min)" -ForegroundColor Gray
    Write-Host "  api          API endpoint verification (~5 min)" -ForegroundColor Gray
    Write-Host "  appointment  Appointment workflow (~5 min)" -ForegroundColor Gray
    Write-Host "  meeting      Meeting/Transcript/AI/EMR (~5 min)" -ForegroundColor Gray
    Write-Host "  health       Health Records & EMR (~5 min)" -ForegroundColor Gray
    Write-Host "  ai           AI Features (~3 min)" -ForegroundColor Gray
    Write-Host "  ui           UI navigation with visible browser (~10 min)" -ForegroundColor Gray
    Write-Host "  content      Content/Notifications/Metadata (~3 min)" -ForegroundColor Gray
    Write-Host "  cloud        Cloud-specific tests" -ForegroundColor Gray
    Write-Host "  full         Full comprehensive tests (~20 min)" -ForegroundColor Gray
    Write-Host "  all          Run all test suites (~25 min)" -ForegroundColor Gray
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
    Write-Host "  .\tests\e2e\run-tests.ps1 full local               # Full local tests (01-08)" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 meeting -Headed          # Meeting workflow with browser" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 cloud                    # Cloud deployment tests" -ForegroundColor Gray
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
Initialize-Environment -Target $Target
Invoke-PreflightChecks -Target $Target
Initialize-Dependencies

# Track start time
$startTime = Get-Date

# Run UI status pre-check
$uiStatus = Test-UiPageStatus -Target $Target

# Run selected suite
$exitCode = 0
$suiteResults = @()

switch ($Suite) {
    "smoke" {
        $exitCode = Invoke-SmokeTests -Target $Target -Headed:$Headed
        $suiteResults += @{ Name = "01-smoke.spec.ts"; ExitCode = $exitCode }
    }
    "api" {
        $exitCode = Invoke-ApiTests -Target $Target -Headed:$Headed
        $suiteResults += @{ Name = "02-api-status.spec.ts"; ExitCode = $exitCode }
    }
    "appointment" {
        Write-Host "RUNNING APPOINTMENT WORKFLOW TESTS" -ForegroundColor Magenta
        Push-Location $E2EDir
        $headedFlag = if ($Headed) { "--headed" } else { "" }
        npx playwright test specs/03-appointment-workflow.spec.ts $headedFlag
        $exitCode = $LASTEXITCODE
        Pop-Location
        $suiteResults += @{ Name = "03-appointment-workflow.spec.ts"; ExitCode = $exitCode }
    }
    "meeting" {
        Write-Host "RUNNING MEETING WORKFLOW TESTS" -ForegroundColor Magenta
        Push-Location $E2EDir
        $headedFlag = if ($Headed) { "--headed" } else { "" }
        npx playwright test specs/04-meeting-workflow.spec.ts $headedFlag
        $exitCode = $LASTEXITCODE
        Pop-Location
        $suiteResults += @{ Name = "04-meeting-workflow.spec.ts"; ExitCode = $exitCode }
    }
    "health" {
        Write-Host "RUNNING HEALTH RECORDS & EMR TESTS" -ForegroundColor Magenta
        Push-Location $E2EDir
        $headedFlag = if ($Headed) { "--headed" } else { "" }
        npx playwright test specs/05-health-records-emr.spec.ts $headedFlag
        $exitCode = $LASTEXITCODE
        Pop-Location
        $suiteResults += @{ Name = "05-health-records-emr.spec.ts"; ExitCode = $exitCode }
    }
    "ai" {
        Write-Host "RUNNING AI FEATURES TESTS" -ForegroundColor Magenta
        Push-Location $E2EDir
        $headedFlag = if ($Headed) { "--headed" } else { "" }
        npx playwright test specs/06-ai-features.spec.ts $headedFlag
        $exitCode = $LASTEXITCODE
        Pop-Location
        $suiteResults += @{ Name = "06-ai-features.spec.ts"; ExitCode = $exitCode }
    }
    "ui" {
        $exitCode = Invoke-UiTests -Target $Target -Headed:$true -Workers $Workers
        $suiteResults += @{ Name = "07-ui-navigation.spec.ts"; ExitCode = $exitCode }
    }
    "content" {
        Write-Host "RUNNING CONTENT & NOTIFICATIONS TESTS" -ForegroundColor Magenta
        Push-Location $E2EDir
        $headedFlag = if ($Headed) { "--headed" } else { "" }
        npx playwright test specs/08-content-notifications.spec.ts $headedFlag
        $exitCode = $LASTEXITCODE
        Pop-Location
        $suiteResults += @{ Name = "08-content-notifications.spec.ts"; ExitCode = $exitCode }
    }
    "full" {
        $exitCode = Invoke-FullTests -Target $Target -Headed:$Headed -Workers $Workers
        $suiteResults += @{ Name = "Full Suite (01-08)"; ExitCode = $exitCode }
    }
    "cloud" {
        Initialize-Environment -Target "cloud"
        $exitCode = Invoke-CloudTests
        $suiteResults += @{ Name = "09-cloud-e2e.spec.ts"; ExitCode = $exitCode }
    }
    "all" {
        $exitCode = Invoke-AllTests -Target $Target -Headed:$Headed -Workers $Workers
        $suiteResults += @{ Name = "All Suites (01-09)"; ExitCode = $exitCode }
    }
}

# Calculate duration
$duration = (Get-Date) - $startTime
$durationStr = "{0:mm}m {0:ss}s" -f $duration

# Generate detailed test report with UI status and pass/fail results
Write-TestReport -SuiteResults $suiteResults -UiStatus $uiStatus -Duration $durationStr -Target $Target -Suite $Suite

# Show how to view Playwright report
Write-Host "  View Playwright report: npx playwright show-report" -ForegroundColor Yellow
Write-Host ""

exit $exitCode
