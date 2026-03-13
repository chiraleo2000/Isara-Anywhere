<#
.SYNOPSIS
    Izara Telemedicine - Unified Test Runner v6.0.0
    Single script to run ALL E2E + Unit tests (local Docker & cloud).

.DESCRIPTION
    All runs are HEADED (UI visible, no headless).
    Auth: global-setup.ts caches 5 users via ONE API login.
    All specs inject tokens from cache - ZERO re-authentication.

    LOCAL (Docker):  Full 20-spec suite, parallel, headed
    CLOUD:           Essential 12-spec workflow, serial, headed

.PARAMETER Suite
    Test suite to run (see help for full list)

.PARAMETER Target
    Environment: local (Docker), cloud, cloud-dev

.PARAMETER Workers
    Parallel workers (default: 4 local, 1 cloud)

.NOTES
    Version: 6.0.0 | March 13, 2026
#>

param(
    [Parameter(Position=0)]
    [ValidateSet(
        "smoke", "auth", "pages", "appointments", "health",
        "meeting", "content", "ai", "multi-user", "lab",
        "admin", "pipeline", "portal-doctor", "portal-patient",
        "workflows", "notifications", "phase2",
        "full", "cloud", "cloud-dev",
        "unit", "unit:auth", "unit:appointments", "unit:clinical",
        "unit:content", "unit:meeting", "unit:ai", "unit:api",
        "unit:notifications", "unit:security", "unit:database", "unit:all",
        "help"
    )]
    [string]$Suite = "full",

    [Parameter(Position=1)]
    [ValidateSet("local", "cloud", "cloud-dev")]
    [string]$Target = "local",

    [Parameter(Mandatory=$false)]
    [int]$Workers = 0,

    [Parameter(Mandatory=$false)]
    [switch]$Debug
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $PSCommandPath
$E2EDir = $ScriptDir
$UnitDir = Join-Path (Split-Path -Parent $ScriptDir) "unit"

$LOCAL_PATIENT = "http://localhost:3005"
$LOCAL_DOCTOR = "http://localhost:3010"
$LOCAL_MEETING = "http://localhost:3020" #noqa PSUseDeclaredVarsMoreThanAssignments

$CLOUD_PATIENT = "https://izara-patient-portal-724889190329.asia-southeast1.run.app"
$CLOUD_DOCTOR = "https://izara-doctor-portal-724889190329.asia-southeast1.run.app"
$CLOUD_MEETING = "https://izara-jitsi-meeting-portal-724889190329.asia-southeast1.run.app"

$CLOUD_DEV_PATIENT = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
$CLOUD_DEV_DOCTOR = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
$CLOUD_DEV_MEETING = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app"

# --- SPEC FILE GROUPS (actual files in tests/e2e/specs/) ---

$SPEC_FULL = @(
    "specs/01-user-accounts-demo-pages.spec.ts",
    "specs/02-auth-health-multiuser.spec.ts",
    "specs/03-appointment-lifecycle.spec.ts",
    "specs/04-health-records-emr.spec.ts",
    "specs/05-video-meeting-transcription.spec.ts",
    "specs/06-content-sync-approval.spec.ts",
    "specs/07-ai-features-cds.spec.ts",
    "specs/08-multi-user-concurrent.spec.ts",
    "specs/09-phase2-ai-his.spec.ts",
    "specs/10-lab-imaging-map-features.spec.ts",
    "specs/11-doctor-portal-workflows.spec.ts",
    "specs/12-patient-portal-workflows.spec.ts",
    "specs/13-multi-user-appointment-workflow.spec.ts",
    "specs/14-admin-management-workflows.spec.ts",
    "specs/15-phr-emr-data-flow.spec.ts",
    "specs/16-medical-content-workflows.spec.ts",
    "specs/17-notification-settings-workflows.spec.ts",
    "specs/24-registration-approval-e2e.spec.ts",
    "specs/25-register-login-doctor.spec.ts",
    "specs/26-register-login-patient.spec.ts"
)

$SPEC_CLOUD = @(
    "specs/02-auth-health-multiuser.spec.ts",
    "specs/25-register-login-doctor.spec.ts",
    "specs/26-register-login-patient.spec.ts",
    "specs/24-registration-approval-e2e.spec.ts",
    "specs/01-user-accounts-demo-pages.spec.ts",
    "specs/03-appointment-lifecycle.spec.ts",
    "specs/04-health-records-emr.spec.ts",
    "specs/10-lab-imaging-map-features.spec.ts",
    "specs/06-content-sync-approval.spec.ts",
    "specs/07-ai-features-cds.spec.ts",
    "specs/14-admin-management-workflows.spec.ts",
    "specs/30-appointment-meeting-ai-pipeline.spec.ts"
)

# --- HELPER FUNCTIONS ---

function Write-Banner {
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "  IZARA TELEMEDICINE TEST RUNNER v6.0.0" -ForegroundColor Cyan
    Write-Host "  All runs HEADED (UI visible) | Auth cached (ONE login)" -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "  [..] $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }

function Test-ServiceHealth {
    param([string]$Url, [string]$Name)
    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 10
        Write-Success "$Name health OK ($($response.status))"
        return $true
    } catch {
        Write-Err "$Name connection failed"
        return $false
    }
}

function Initialize-Dependencies {
    param([string]$Dir)
    Push-Location $Dir
    if (-not (Test-Path "node_modules")) {
        Write-Info "Installing dependencies in $Dir..."
        npm install
        if ($Dir -eq $E2EDir) { npx playwright install chromium }
    }
    Pop-Location
}

function Initialize-Environment {
    param([string]$Target)
    if ($Target -eq "cloud") {
        $env:TEST_ENV = "cloud"
        $env:CLOUD_PATIENT_URL = $CLOUD_PATIENT
        $env:CLOUD_DOCTOR_URL = $CLOUD_DOCTOR
        $env:CLOUD_MEETING_URL = $CLOUD_MEETING
        Write-Host "  Environment: CLOUD" -ForegroundColor Yellow
    } elseif ($Target -eq "cloud-dev") {
        $env:TEST_ENV = "cloud-dev"
        $env:CLOUD_DEV_PATIENT_URL = $CLOUD_DEV_PATIENT
        $env:CLOUD_DEV_DOCTOR_URL = $CLOUD_DEV_DOCTOR
        $env:CLOUD_DEV_MEETING_URL = $CLOUD_DEV_MEETING
        Write-Host "  Environment: CLOUD-DEV" -ForegroundColor Magenta
    } else {
        $env:TEST_ENV = "local"
        Write-Host "  Environment: LOCAL (Docker)" -ForegroundColor Green
    }
    Write-Host ""
}

function Invoke-PreflightChecks {
    param([string]$Target)
    Write-Host "  PRE-FLIGHT CHECKS" -ForegroundColor Magenta
    $allHealthy = $true
    if ($Target -eq "local") {
        $containers = docker ps --format "{{.Names}}" 2>$null
        foreach ($c in @("izara-patient-portal", "izara-doctor-portal", "izara-postgres")) {
            if ($containers -match $c) { Write-Success "$c running" }
            else { Write-Err "$c NOT running"; $allHealthy = $false }
        }
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $LOCAL_PATIENT -Name "Patient Portal")
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $LOCAL_DOCTOR -Name "Doctor Portal")
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $LOCAL_MEETING -Name "Meeting Server")
    } else {
        $pu = if ($Target -eq "cloud-dev") { $CLOUD_DEV_PATIENT } else { $CLOUD_PATIENT }
        $du = if ($Target -eq "cloud-dev") { $CLOUD_DEV_DOCTOR } else { $CLOUD_DOCTOR }
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $pu -Name "Patient Portal")
        $allHealthy = $allHealthy -and (Test-ServiceHealth -Url $du -Name "Doctor Portal")
    }
    if (-not $allHealthy) {
        Write-Err "Pre-flight checks failed!"
        if ($Target -eq "local") { Write-Info "Start: docker compose up -d" }
        exit 1
    }
    Write-Success "All checks passed!"
    Write-Host ""
}

function Invoke-E2ETests {
    param([string[]]$Specs, [string]$ProjectName, [int]$WorkerCount, [string]$Label)
    Write-Host "  RUNNING: $Label" -ForegroundColor Magenta
    Write-Host "  Project: $ProjectName | Workers: $WorkerCount | Specs: $($Specs.Count) | HEADED" -ForegroundColor DarkCyan
    Write-Host ""
    Push-Location $E2EDir
    npx playwright test $Specs --project="$ProjectName" --workers=$WorkerCount --headed
    $ec = $LASTEXITCODE
    Pop-Location
    return $ec
}

function Invoke-UnitTests {
    param([string]$Group = "")
    if ($Group) {
        Write-Host "  RUNNING UNIT TESTS: group=$Group" -ForegroundColor Magenta
    } else {
        Write-Host "  RUNNING ALL UNIT TESTS" -ForegroundColor Magenta
    }
    Write-Host ""
    Push-Location $UnitDir
    Initialize-Dependencies -Dir $UnitDir
    if ($Group) {
        $env:TEST_GROUP = $Group
        npx vitest run
        $ec = $LASTEXITCODE
        Remove-Item Env:\TEST_GROUP -ErrorAction SilentlyContinue
    } else {
        npx vitest run
        $ec = $LASTEXITCODE
    }
    Pop-Location
    return $ec
}

function Write-TestReport {
    param([string]$SuiteName, [int]$ExitCode, [string]$Duration, [string]$Target)
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "  TEST REPORT" -ForegroundColor Cyan
    Write-Host "  Suite    : $SuiteName" -ForegroundColor White
    Write-Host "  Target   : $Target" -ForegroundColor White
    Write-Host "  Duration : $Duration" -ForegroundColor White
    Write-Host "  Time     : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
    Write-Host "  Mode     : HEADED (UI visible)" -ForegroundColor White
    if ($ExitCode -eq 0) {
        Write-Host "  Result   : PASSED" -ForegroundColor Green
    } else {
        Write-Host "  Result   : FAILED" -ForegroundColor Red
    }
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Banner
    Write-Host "USAGE:  .\tests\e2e\run-tests.ps1 <suite> [target] [-Workers N]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "E2E SUITES (all headed):" -ForegroundColor Yellow
    Write-Host "  smoke          API health + auth (02)" -ForegroundColor Gray
    Write-Host "  auth           Registration + login (24+25+26)" -ForegroundColor Gray
    Write-Host "  pages          All pages (01)" -ForegroundColor Gray
    Write-Host "  appointments   Appointment lifecycle (03)" -ForegroundColor Gray
    Write-Host "  health         Health records & EMR (04)" -ForegroundColor Gray
    Write-Host "  meeting        Video meeting (05)" -ForegroundColor Gray
    Write-Host "  content        Content sync (06)" -ForegroundColor Gray
    Write-Host "  ai             AI & CDS (07)" -ForegroundColor Gray
    Write-Host "  multi-user     5-browser concurrent (08)" -ForegroundColor Gray
    Write-Host "  lab            Lab/imaging/map (10)" -ForegroundColor Gray
    Write-Host "  admin          Admin management (14)" -ForegroundColor Gray
    Write-Host "  pipeline       Full pipeline (30)" -ForegroundColor Gray
    Write-Host "  portal-doctor  Doctor workflows (11)" -ForegroundColor Gray
    Write-Host "  portal-patient Patient workflows (12)" -ForegroundColor Gray
    Write-Host "  workflows      PHR+content+notifications (15+16+17)" -ForegroundColor Gray
    Write-Host "  phase2         Phase 2 (09)" -ForegroundColor Gray
    Write-Host "  full           ALL 20 local specs (parallel)" -ForegroundColor White
    Write-Host "  cloud          12-spec workflow (serial)" -ForegroundColor White
    Write-Host ""
    Write-Host "UNIT SUITES:" -ForegroundColor Yellow
    Write-Host "  unit  unit:auth  unit:appointments  unit:clinical" -ForegroundColor Gray
    Write-Host "  unit:content  unit:meeting  unit:ai  unit:api" -ForegroundColor Gray
    Write-Host "  unit:notifications  unit:security  unit:database" -ForegroundColor Gray
    Write-Host ""
    Write-Host "TARGETS:  local (default) | cloud | cloud-dev" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\tests\e2e\run-tests.ps1 full" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 cloud" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 appointments" -ForegroundColor Gray
    Write-Host "  .\tests\e2e\run-tests.ps1 unit:clinical" -ForegroundColor Gray
    Write-Host ""
}

# --- MAIN ---

Write-Banner

if ($Suite -eq "help") { Show-Help; exit 0 }

if ($Suite -eq "cloud" -and $Target -eq "local") { $Target = "cloud" }
if ($Suite -eq "cloud-dev") { $Target = "cloud-dev"; $Suite = "full" }
if ($Workers -eq 0) { $Workers = if ($Target -eq "cloud") { 1 } else { 4 } }

Initialize-Environment -Target $Target

if (-not $Suite.StartsWith("unit")) {
    Invoke-PreflightChecks -Target $Target
    Initialize-Dependencies -Dir $E2EDir
}

$startTime = Get-Date
$exitCode = 0
$suiteName = $Suite
$projectName = switch ($Target) { "cloud" { "Cloud" }; "cloud-dev" { "Cloud-Dev" }; default { "Local" } }

switch ($Suite) {
    "smoke"          { $exitCode = Invoke-E2ETests -Specs @("specs/02-auth-health-multiuser.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Smoke: Health & Auth" }
    "auth"           { $exitCode = Invoke-E2ETests -Specs @("specs/24-registration-approval-e2e.spec.ts","specs/25-register-login-doctor.spec.ts","specs/26-register-login-patient.spec.ts") -ProjectName $projectName -WorkerCount $Workers -Label "Auth: Registration & Login" }
    "pages"          { $exitCode = Invoke-E2ETests -Specs @("specs/01-user-accounts-demo-pages.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Pages: All Navigation" }
    "appointments"   { $exitCode = Invoke-E2ETests -Specs @("specs/03-appointment-lifecycle.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Appointments" }
    "health"         { $exitCode = Invoke-E2ETests -Specs @("specs/04-health-records-emr.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Health Records & EMR" }
    "meeting"        { $exitCode = Invoke-E2ETests -Specs @("specs/05-video-meeting-transcription.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Video Meeting" }
    "content"        { $exitCode = Invoke-E2ETests -Specs @("specs/06-content-sync-approval.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Content Sync" }
    "ai"             { $exitCode = Invoke-E2ETests -Specs @("specs/07-ai-features-cds.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "AI & CDS" }
    "multi-user"     { $exitCode = Invoke-E2ETests -Specs @("specs/08-multi-user-concurrent.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Multi-User (5 browsers)" }
    "lab"            { $exitCode = Invoke-E2ETests -Specs @("specs/10-lab-imaging-map-features.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Lab/Imaging/Map" }
    "admin"          { $exitCode = Invoke-E2ETests -Specs @("specs/14-admin-management-workflows.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Admin Management" }
    "pipeline"       { $exitCode = Invoke-E2ETests -Specs @("specs/30-appointment-meeting-ai-pipeline.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Full Pipeline" }
    "portal-doctor"  { $exitCode = Invoke-E2ETests -Specs @("specs/11-doctor-portal-workflows.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Doctor Portal" }
    "portal-patient" { $exitCode = Invoke-E2ETests -Specs @("specs/12-patient-portal-workflows.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Patient Portal" }
    "workflows"      { $exitCode = Invoke-E2ETests -Specs @("specs/15-phr-emr-data-flow.spec.ts","specs/16-medical-content-workflows.spec.ts","specs/17-notification-settings-workflows.spec.ts") -ProjectName $projectName -WorkerCount $Workers -Label "Workflows: PHR+Content+Notifications" }
    "phase2"         { $exitCode = Invoke-E2ETests -Specs @("specs/09-phase2-ai-his.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Phase 2" }
    "notifications"  { $exitCode = Invoke-E2ETests -Specs @("specs/17-notification-settings-workflows.spec.ts") -ProjectName $projectName -WorkerCount 1 -Label "Notifications" }
    "full"           { $suiteName = "Full ($($SPEC_FULL.Count) specs)"; $exitCode = Invoke-E2ETests -Specs $SPEC_FULL -ProjectName $projectName -WorkerCount $Workers -Label $suiteName }
    "cloud"          { $suiteName = "Cloud ($($SPEC_CLOUD.Count) specs, serial)"; $exitCode = Invoke-E2ETests -Specs $SPEC_CLOUD -ProjectName "Cloud" -WorkerCount 1 -Label $suiteName }
    "unit"               { $exitCode = Invoke-UnitTests }
    "unit:auth"          { $exitCode = Invoke-UnitTests -Group "auth" }
    "unit:appointments"  { $exitCode = Invoke-UnitTests -Group "appointments" }
    "unit:clinical"      { $exitCode = Invoke-UnitTests -Group "clinical" }
    "unit:content"       { $exitCode = Invoke-UnitTests -Group "content" }
    "unit:meeting"       { $exitCode = Invoke-UnitTests -Group "meeting" }
    "unit:ai"            { $exitCode = Invoke-UnitTests -Group "ai" }
    "unit:api"           { $exitCode = Invoke-UnitTests -Group "api" }
    "unit:notifications" { $exitCode = Invoke-UnitTests -Group "notifications" }
    "unit:security"      { $exitCode = Invoke-UnitTests -Group "security" }
    "unit:database"      { $exitCode = Invoke-UnitTests -Group "database" }
    "unit:all"           { $exitCode = Invoke-UnitTests }
}

$duration = (Get-Date) - $startTime
$durationStr = "{0:mm}m {0:ss}s" -f $duration
Write-TestReport -SuiteName $suiteName -ExitCode $exitCode -Duration $durationStr -Target $Target
if (-not $Suite.StartsWith("unit")) { Write-Host "  View report: npx playwright show-report" -ForegroundColor Yellow }
Write-Host ""
exit $exitCode
