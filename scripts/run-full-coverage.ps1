#!/usr/bin/env pwsh
<#
═══════════════════════════════════════════════════════════════════════
 IZARA — FULL COVERAGE TEST RUNNER (Groups A → J)
═══════════════════════════════════════════════════════════════════════

 Orchestration:
   Phase 1: Group A (auth & access verification) — gate
   Phase 2: PARALLEL  → B, C, G, H, I, J (independent page tests)
            SEQUENTIAL → D → E → F (appointment → meeting → EMR/lab)
   Phase 3: Summary report

 Usage:
   .\scripts\run-full-coverage.ps1                    # default: 4 workers
   .\scripts\run-full-coverage.ps1 -Workers 6         # 6 parallel workers
   .\scripts\run-full-coverage.ps1 -Sequential        # force all sequential
   .\scripts\run-full-coverage.ps1 -Groups "B,D,E,F"  # run specific groups
   .\scripts\run-full-coverage.ps1 -SkipAuth           # skip Group A (reuse auth)

═══════════════════════════════════════════════════════════════════════
#>
param(
    [int]$Workers = 4,
    [switch]$Sequential,
    [switch]$SkipAuth,
    [string]$Groups = "",
    [switch]$Headed,
    [int]$Timeout = 300000
)

$ErrorActionPreference = "Continue"
$startTime = Get-Date

# ── Colors ────────────────────────────────────────────────────────────
function Write-Phase($msg)  { Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-Pass($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Fail($msg)   { Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info($msg)   { Write-Host "  ℹ️  $msg" -ForegroundColor Yellow }
function Write-Separator()  { Write-Host ("─" * 70) -ForegroundColor DarkGray }

# ── Group definitions ─────────────────────────────────────────────────
$allGroups = @{
    A = @{ Name = "Auth & Access";            Project = "A-auth";              Type = "gate" }
    B = @{ Name = "Patient Portal";           Project = "B-patient-portal";    Type = "parallel" }
    C = @{ Name = "Doctor & Admin Portal";    Project = "C-doctor-portal";     Type = "parallel" }
    D = @{ Name = "Appointment Workflows";    Project = "D-appointments";      Type = "sequential" }
    "D-queue" = @{ Name = "Queue Traceability"; Project = "D-queue-traceability"; Type = "sequential" }
    "D-host" = @{ Name = "Doctor Host";       Project = "D-doctor-host";       Type = "sequential" }
    Q = @{ Name = "Meeting Lifecycle";        Project = "Q-meeting-lifecycle"; Type = "sequential" }
    E = @{ Name = "Meeting & Clinical";       Project = "E-meeting-clinical";  Type = "sequential" }
    F = @{ Name = "PHR & Health Records";     Project = "F-phr-health-records"; Type = "sequential" }
    L = @{ Name = "Lab Ordering";             Project = "L-lab-ordering";      Type = "sequential" }
    G = @{ Name = "Living Will & PDPA";       Project = "G-livingwill-pdpa";   Type = "parallel" }
    H = @{ Name = "Content & Resources";      Project = "H-content-resources"; Type = "parallel" }
    I = @{ Name = "Admin & Notifications";    Project = "I-admin-notifications"; Type = "parallel" }
    J = @{ Name = "AI, Timeline, Map";        Project = "J-ai-timeline-map";  Type = "parallel" }
    "J-prejoin" = @{ Name = "Patient Jitsi Prejoin"; Project = "J-patient-jitsi-prejoin"; Type = "parallel" }
    R = @{ Name = "Jitsi Role Permissions";   Project = "R-jitsi-role-permissions"; Type = "parallel" }
    Defect = @{ Name = "Defect Regression";    Project = "Defect-regression";   Type = "parallel" }
    S = @{ Name = "Responsive Layout";        Project = "S-phone-sm"; Type = "parallel" }
    K = @{ Name = "Accessibility";             Project = "K-accessibility";     Type = "parallel" }
}

# ── Determine which groups to run ─────────────────────────────────────
$selectedGroups = if ($Groups) {
    $Groups.ToUpper() -split "," | ForEach-Object { $_.Trim() }
} else {
    @("A","B","C","D","E","F","G","H","I","J")
}

if ($SkipAuth) {
    $selectedGroups = $selectedGroups | Where-Object { $_ -ne "A" }
}

$parallelGroups   = $selectedGroups | Where-Object { $allGroups[$_].Type -eq "parallel" }
$sequentialGroups = $selectedGroups | Where-Object { $allGroups[$_].Type -eq "sequential" }
$hasGate          = $selectedGroups -contains "A"

# ── Banner ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     IZARA TELEMEDICINE — FULL COVERAGE TEST SUITE          ║" -ForegroundColor Cyan
Write-Host "║     Groups A → J  |  Parallel + Sequential Pipeline       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Info "Workers:     $Workers"
Write-Info "Mode:        $(if ($Sequential) { 'ALL SEQUENTIAL' } else { 'Parallel B,C,G,H,I,J + Sequential D→E→F' })"
 Write-Info "Groups:      $($selectedGroups -join ', ')"
 Write-Info "Browsers:    Patient=Chrome, Doctor=Chrome, Admin=Firefox (parallel fixture)"
Write-Info "Timeout:     $($Timeout / 1000)s per test"
Write-Separator

# ── Results tracking ──────────────────────────────────────────────────
$results = @{}

function Run-PlaywrightProject {
    param(
        [string]$ProjectName,
        [string]$GroupKey,
        [int]$ProjectWorkers = 1
    )
    $groupInfo = $allGroups[$GroupKey]
    $label = "[$GroupKey] $($groupInfo.Name)"
    Write-Info "Starting: $label (project: $ProjectName, workers: $ProjectWorkers)"

    $env:PW_WORKERS = $ProjectWorkers
    $output = npx playwright test --project="$ProjectName" --workers=$ProjectWorkers --timeout=$Timeout 2>&1 | Out-String
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Pass "$label — PASSED"
        $results[$GroupKey] = @{ Status = "PASSED"; Time = ""; Output = $output }
    } else {
        Write-Fail "$label — FAILED (exit code: $exitCode)"
        $results[$GroupKey] = @{ Status = "FAILED"; Time = ""; Output = $output }
    }
    return $exitCode
}

# ══════════════════════════════════════════════════════════════════════
# PHASE 1: AUTH GATE (Group A)
# ══════════════════════════════════════════════════════════════════════
if ($hasGate) {
    Write-Phase "PHASE 1: Auth & Access Gate (Group A)"
    $authResult = Run-PlaywrightProject -ProjectName "A-auth" -GroupKey "A" -ProjectWorkers 1
    if ($authResult -ne 0) {
        Write-Fail "Group A FAILED — cannot proceed without authentication"
        Write-Host "`n$($results['A'].Output)" -ForegroundColor DarkGray
        exit 1
    }
    Write-Separator
}

# ══════════════════════════════════════════════════════════════════════
# PHASE 2: PARALLEL + SEQUENTIAL (concurrent execution)
# ══════════════════════════════════════════════════════════════════════
Write-Phase "PHASE 2: Full Coverage Execution"

if ($Sequential) {
    # ── ALL SEQUENTIAL MODE ───────────────────────────────────────────
    Write-Info "Running ALL groups sequentially..."
    $allRunGroups = @($parallelGroups) + @($sequentialGroups) | Sort-Object
    foreach ($g in $allRunGroups) {
        $info = $allGroups[$g]
        Run-PlaywrightProject -ProjectName $info.Project -GroupKey $g -ProjectWorkers 1
    }
} else {
    # ── PARALLEL + SEQUENTIAL CONCURRENT MODE ─────────────────────────
    # Run parallel groups via Playwright's built-in dependency resolution
    # and sequential D→E→F chain simultaneously

    $jobs = @()

    # Launch parallel groups as background jobs
    if ($parallelGroups.Count -gt 0) {
        $parallelProjectList = ($parallelGroups | ForEach-Object { "--project=$($allGroups[$_].Project)" }) -join " "
        Write-Info "Launching PARALLEL: $($parallelGroups -join ', ') (workers: $Workers)"

        $parallelJob = Start-Job -ScriptBlock {
            param($projectArgs, $w, $t, $workDir)
            Set-Location $workDir
            $env:PW_WORKERS = $w
            # Build project args array
            $argList = @("playwright", "test") + ($projectArgs -split " ") + @("--workers=$w", "--timeout=$t")
            & npx @argList 2>&1 | Out-String
        } -ArgumentList $parallelProjectList, $Workers, $Timeout, (Get-Location).Path

        $jobs += @{ Job = $parallelJob; Type = "parallel"; Groups = $parallelGroups }
    }

    # Launch sequential D→E→F chain as background job
    if ($sequentialGroups.Count -gt 0) {
        $seqProjectList = ($sequentialGroups | Sort-Object | ForEach-Object { "--project=$($allGroups[$_].Project)" }) -join " "
        Write-Info "Launching SEQUENTIAL: $($sequentialGroups -join ' → ') (workers: 1)"

        $seqJob = Start-Job -ScriptBlock {
            param($projectArgs, $t, $workDir)
            Set-Location $workDir
            $env:PW_WORKERS = 1
            $argList = @("playwright", "test") + ($projectArgs -split " ") + @("--workers=1", "--timeout=$t")
            & npx @argList 2>&1 | Out-String
        } -ArgumentList $seqProjectList, $Timeout, (Get-Location).Path

        $jobs += @{ Job = $seqJob; Type = "sequential"; Groups = $sequentialGroups }
    }

    # Wait for all jobs to complete
    Write-Info "Waiting for all jobs to complete..."
    foreach ($entry in $jobs) {
        $job = $entry.Job
        $output = Receive-Job -Job $job -Wait
        $state = $job.State

        foreach ($g in $entry.Groups) {
            if ($state -eq "Completed" -and $output -notmatch "failed|error.*test") {
                $results[$g] = @{ Status = "PASSED"; Output = $output }
            } else {
                $results[$g] = @{ Status = "FAILED"; Output = $output }
            }
        }

        if ($state -eq "Completed") {
            Write-Pass "$($entry.Type.ToUpper()) batch ($($entry.Groups -join ', '))"
        } else {
            Write-Fail "$($entry.Type.ToUpper()) batch ($($entry.Groups -join ', '))"
        }
        Remove-Job -Job $job -Force
    }
}

Write-Separator

# ══════════════════════════════════════════════════════════════════════
# PHASE 3: SUMMARY REPORT
# ══════════════════════════════════════════════════════════════════════
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Phase "FULL COVERAGE SUMMARY"
Write-Host ""

$passed = 0
$failed = 0

foreach ($g in @("A","B","C","D","E","F","G","H","I","J")) {
    if (-not $results.ContainsKey($g)) { continue }
    $r = $results[$g]
    $info = $allGroups[$g]
    $icon = if ($r.Status -eq "PASSED") { "✅" } else { "❌" }
    $color = if ($r.Status -eq "PASSED") { "Green" } else { "Red" }
    $type = if ($info.Type -eq "parallel") { "∥" } elseif ($info.Type -eq "sequential") { "→" } else { "⊙" }
    Write-Host "  $icon [$g] $($info.Name.PadRight(30)) $type  $($r.Status)" -ForegroundColor $color

    if ($r.Status -eq "PASSED") { $passed++ } else { $failed++ }
}

$total = $passed + $failed
Write-Host ""
Write-Separator
Write-Host "  Total: $total groups | ✅ Passed: $passed | ❌ Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  Duration: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Cyan
Write-Host "  Report:   test-results/html-report/index.html" -ForegroundColor DarkGray
Write-Separator

# Pipeline legend
Write-Host ""
Write-Host "  Legend:  ∥ = parallel group  |  → = sequential pipeline  |  ⊙ = auth gate" -ForegroundColor DarkGray
Write-Host "  Pipeline: [D] Appointment → [E] Meeting → [F] EMR/Lab Records" -ForegroundColor DarkGray
Write-Host ""

if ($failed -gt 0) { exit 1 } else { exit 0 }
