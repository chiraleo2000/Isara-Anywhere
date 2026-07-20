#!/usr/bin/env pwsh
<#
=======================================================================
 IZARA - FULL COVERAGE TEST RUNNER (expanded matrix beyond A–J)
=======================================================================

 Orchestration:
   Phase 1: Group A (auth & access verification) - gate
   Phase 2: PARALLEL  -> B, C, G, H, I, J, J-prejoin, K, R, S, Defect
            SEQUENTIAL -> D -> D-queue -> D-host -> Q -> E -> F -> L
   Phase 3: Summary report

 Usage:
   .\scripts\run-full-coverage.ps1                    # default: 4 workers
   .\scripts\run-full-coverage.ps1 -Workers 6         # 6 parallel workers
   .\scripts\run-full-coverage.ps1 -Sequential        # force all sequential
   .\scripts\run-full-coverage.ps1 -Groups "B,D,E,F"  # run specific groups
   .\scripts\run-full-coverage.ps1 -SkipAuth           # skip Group A (reuse auth)

=======================================================================
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

function Write-Phase($msg)  { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Pass($msg)   { Write-Host "  PASS $msg" -ForegroundColor Green }
function Write-Fail($msg)   { Write-Host "  FAIL $msg" -ForegroundColor Red }
function Write-Info($msg)   { Write-Host "  INFO $msg" -ForegroundColor Yellow }
function Write-Separator()  { Write-Host ("-" * 70) -ForegroundColor DarkGray }

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

$selectedGroups = if ($Groups) {
    # Preserve hyphenated keys (D-queue, J-prejoin); match allGroups case-insensitively
    $Groups -split "," | ForEach-Object {
        $raw = $_.Trim()
        if (-not $raw) { return }
        $match = $allGroups.Keys | Where-Object { $_ -ieq $raw } | Select-Object -First 1
        if ($match) { $match } else { Write-Fail "Unknown group: $raw"; $raw }
    }
} else {
    # Full orchestrated matrix (beyond legacy A–J default)
    @("A","B","C","D","D-queue","D-host","Q","E","F","L","G","H","I","J","J-prejoin","K","R","S","Defect")
}

if ($SkipAuth) {
    $selectedGroups = $selectedGroups | Where-Object { $_ -ne "A" }
}

$parallelGroups   = @($selectedGroups | Where-Object { $allGroups[$_].Type -eq "parallel" })
$sequentialGroups = @($selectedGroups | Where-Object { $allGroups[$_].Type -eq "sequential" })
$hasGate          = $selectedGroups -contains "A"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - FULL COVERAGE TEST SUITE" -ForegroundColor Cyan
Write-Host "  Expanded matrix  |  Parallel + Sequential Pipeline" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Workers:     $Workers"
Write-Info "Mode:        $(if ($Sequential) { 'ALL SEQUENTIAL' } else { 'Parallel B,C,G,H,I,J + Sequential D->E->F' })"
Write-Info "Groups:      $($selectedGroups -join ', ')"
Write-Info "Browsers:    Patient=Chrome, Doctor=Chrome, Admin=Firefox (parallel fixture)"
Write-Info "Timeout:     $($Timeout / 1000)s per test"
Write-Separator

$results = @{}

function Save-GroupFailureLog {
    param([string]$GroupKey, [string]$Output)
    $dir = Join-Path (Get-Location) 'reports'
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $path = Join-Path $dir "full-coverage-$GroupKey-fail.txt"
    $Output | Set-Content -Path $path -Encoding utf8
    Write-Info "Failure log: $path"
}

function Run-PlaywrightProject {
    param(
        [string]$ProjectName,
        [string]$GroupKey,
        [int]$ProjectWorkers = 1,
        [int]$MaxAttempts = 2
    )
    $groupInfo = $allGroups[$GroupKey]
    $label = "[$GroupKey] $($groupInfo.Name)"

    $env:PW_WORKERS = "$ProjectWorkers"
    if (-not $env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH = '0' }
    if ($Headed) { $env:PW_HEADED = '1' }
    if (-not $env:ALLOW_API_FALLBACK) { $env:ALLOW_API_FALLBACK = '1' }

    $pwArgs = @('playwright', 'test', "--project=$ProjectName", "--workers=$ProjectWorkers", "--timeout=$Timeout")
    if ($Headed) { $pwArgs += '--headed' }

    $exitCode = 1
    $output = ''
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if ($attempt -gt 1) {
            Write-Info "Retry $attempt/$MaxAttempts for $label (prior exit=$exitCode)"
            Start-Sleep -Seconds 3
        } else {
            Write-Info "Starting: $label (project: $ProjectName, workers: $ProjectWorkers)"
        }

        $output = & npx @pwArgs 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        if ($null -eq $exitCode) { $exitCode = 1 }
        if ($exitCode -eq 0) { break }
        Save-GroupFailureLog -GroupKey $GroupKey -Output $output
    }

    if ($exitCode -eq 0) {
        Write-Pass "$label - PASSED"
        $results[$GroupKey] = @{ Status = "PASSED"; Time = ""; Output = $output }
    } else {
        Write-Fail "$label - FAILED (exit code: $exitCode)"
        $results[$GroupKey] = @{ Status = "FAILED"; Time = ""; Output = $output }
        # Surface a short tail so gate logs are actionable without opening HTML.
        $tail = ($output -split "`n" | Select-Object -Last 40) -join "`n"
        Write-Host $tail -ForegroundColor DarkGray
    }
    return $exitCode
}

if ($hasGate) {
    Write-Phase "PHASE 1: Auth & Access Gate (Group A)"
    $authResult = Run-PlaywrightProject -ProjectName "A-auth" -GroupKey "A" -ProjectWorkers 1
    if ($authResult -ne 0) {
        Write-Fail "Group A FAILED - cannot proceed without authentication"
        Write-Host "`n$($results['A'].Output)" -ForegroundColor DarkGray
        exit 1
    }
    Write-Separator
}

Write-Phase "PHASE 2: Full Coverage Execution"

# Workers=1 (gate default): run in-process. Start-Job drops env and headed flags on Windows.
$forceInProcess = $Sequential -or $Workers -le 1 -or $env:GATE_E2E_SEQUENTIAL -eq '1'

if ($forceInProcess) {
    Write-Info "Running groups in-process (sequential) - workers=$Workers"
    # Dependency order (not alphabetical): D chain -> Q -> E -> F -> L, then page groups.
    # Alphabetical Sort-Object put Q after F/L and raced workflow-state consumers.
    $sequentialPreferred = @('D', 'D-queue', 'D-host', 'Q', 'E', 'F', 'L')
    $seqOrdered = @()
    foreach ($pref in $sequentialPreferred) {
        if ($sequentialGroups -contains $pref) { $seqOrdered += $pref }
    }
    foreach ($g in ($sequentialGroups | Sort-Object)) {
        if ($seqOrdered -notcontains $g) { $seqOrdered += $g }
    }
    $parallelPreferred = @('B', 'C', 'G', 'H', 'I', 'J', 'J-prejoin', 'K', 'R', 'S', 'Defect')
    $parOrdered = @()
    foreach ($pref in $parallelPreferred) {
        if ($parallelGroups -contains $pref) { $parOrdered += $pref }
    }
    foreach ($g in ($parallelGroups | Sort-Object)) {
        if ($parOrdered -notcontains $g) { $parOrdered += $g }
    }
    $allRunGroups = @($seqOrdered) + @($parOrdered)
    Write-Info "Run order: $($allRunGroups -join ' -> ')"
    foreach ($g in $allRunGroups) {
        if (-not $g) { continue }
        $info = $allGroups[$g]
        Run-PlaywrightProject -ProjectName $info.Project -GroupKey $g -ProjectWorkers 1
    }
} else {
    $jobs = @()
    $browserPath = if ($env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH } else { '0' }
    $headedFlag = if ($Headed) { '1' } else { '' }
    $apiFallback = if ($env:ALLOW_API_FALLBACK) { $env:ALLOW_API_FALLBACK } else { '1' }

    if ($parallelGroups.Count -gt 0) {
        $parallelProjectList = ($parallelGroups | ForEach-Object { "--project=$($allGroups[$_].Project)" }) -join " "
        Write-Info "Launching PARALLEL: $($parallelGroups -join ', ') (workers: $Workers)"

        $parallelJob = Start-Job -ScriptBlock {
            param($projectArgs, $w, $t, $workDir, $browserPath, $headedFlag, $apiFallback)
            Set-Location $workDir
            $env:PW_WORKERS = "$w"
            $env:PLAYWRIGHT_BROWSERS_PATH = $browserPath
            $env:ALLOW_API_FALLBACK = $apiFallback
            if ($headedFlag) { $env:PW_HEADED = $headedFlag }
            $argList = @('playwright', 'test') + ($projectArgs -split ' ') + @("--workers=$w", "--timeout=$t")
            if ($headedFlag) { $argList += '--headed' }
            $out = & npx @argList 2>&1 | Out-String
            [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $out }
        } -ArgumentList $parallelProjectList, $Workers, $Timeout, (Get-Location).Path, $browserPath, $headedFlag, $apiFallback

        $jobs += @{ Job = $parallelJob; Type = 'parallel'; Groups = $parallelGroups }
    }

    if ($sequentialGroups.Count -gt 0) {
        $seqProjectList = ($sequentialGroups | Sort-Object | ForEach-Object { "--project=$($allGroups[$_].Project)" }) -join " "
        Write-Info "Launching SEQUENTIAL: $($sequentialGroups -join ' -> ') (workers: 1)"

        $seqJob = Start-Job -ScriptBlock {
            param($projectArgs, $t, $workDir, $browserPath, $headedFlag, $apiFallback)
            Set-Location $workDir
            $env:PW_WORKERS = '1'
            $env:PLAYWRIGHT_BROWSERS_PATH = $browserPath
            $env:ALLOW_API_FALLBACK = $apiFallback
            if ($headedFlag) { $env:PW_HEADED = $headedFlag }
            $argList = @('playwright', 'test') + ($projectArgs -split ' ') + @('--workers=1', "--timeout=$t")
            if ($headedFlag) { $argList += '--headed' }
            $out = & npx @argList 2>&1 | Out-String
            [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $out }
        } -ArgumentList $seqProjectList, $Timeout, (Get-Location).Path, $browserPath, $headedFlag, $apiFallback

        $jobs += @{ Job = $seqJob; Type = 'sequential'; Groups = $sequentialGroups }
    }

    Write-Info "Waiting for all jobs to complete..."
    foreach ($entry in $jobs) {
        $job = $entry.Job
        $payload = Receive-Job -Job $job -Wait
        $exitCode = 1
        $output = ''
        if ($payload -is [System.Array]) { $payload = $payload | Select-Object -Last 1 }
        if ($null -ne $payload.ExitCode) {
            $exitCode = [int]$payload.ExitCode
            $output = [string]$payload.Output
        } else {
            $output = [string]$payload
        }
        $ok = ($job.State -eq 'Completed' -and $exitCode -eq 0)

        foreach ($g in $entry.Groups) {
            $results[$g] = @{
                Status = if ($ok) { 'PASSED' } else { 'FAILED' }
                Output = $output
            }
        }

        if ($ok) {
            Write-Pass "$($entry.Type.ToUpper()) batch ($($entry.Groups -join ', '))"
        } else {
            Write-Fail "$($entry.Type.ToUpper()) batch ($($entry.Groups -join ', ')) exit=$exitCode"
        }
        Remove-Job -Job $job -Force
    }
}

Write-Separator

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
    $icon = if ($r.Status -eq "PASSED") { "[OK]" } else { "[X]" }
    $color = if ($r.Status -eq "PASSED") { "Green" } else { "Red" }
    $type = if ($info.Type -eq "parallel") { "P" } elseif ($info.Type -eq "sequential") { "S" } else { "G" }
    Write-Host "  $icon [$g] $($info.Name.PadRight(30)) $type  $($r.Status)" -ForegroundColor $color

    if ($r.Status -eq "PASSED") { $passed++ } else { $failed++ }
}

$total = $passed + $failed
Write-Host ""
Write-Separator
Write-Host "  Total: $total groups | Passed: $passed | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  Duration: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Cyan
Write-Host "  Report:   test-results/html-report/index.html" -ForegroundColor DarkGray
Write-Separator

Write-Host ""
Write-Host "  Legend:  P = parallel group  |  S = sequential pipeline  |  G = auth gate" -ForegroundColor DarkGray
Write-Host "  Pipeline: [D] Appointment -> [E] Meeting -> [F] EMR/Lab Records" -ForegroundColor DarkGray
Write-Host ""

if ($failed -gt 0) { exit 1 } else { exit 0 }
