<#
.SYNOPSIS
    IZARA — Run All Tests (Unit + E2E) with Cloud Deploy Gate
.DESCRIPTION
    1. Runs Vitest unit tests (all groups)
    2. If unit tests pass → runs Playwright E2E tests (non-headless, parallel)
    3. Generates snapshot report from E2E screenshots
    4. If all pass → produces gate-pass file for cloud deploy
    5. If any fail → blocks cloud deploy
.EXAMPLE
    .\scripts\run-all-tests.ps1                 # Full run
    .\scripts\run-all-tests.ps1 -UnitOnly       # Only unit tests
    .\scripts\run-all-tests.ps1 -E2EOnly        # Only E2E tests
    .\scripts\run-all-tests.ps1 -SkipGate       # Skip deploy gate
#>
param(
    [switch]$UnitOnly,
    [switch]$E2EOnly,
    [switch]$SkipGate,
    [switch]$WithCoverage
)

$ErrorActionPreference = 'Stop'

# Colors
function Write-Step { param($msg) Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-Pass { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Warn { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }

$startTime = Get-Date
$unitPassed = $false
$e2ePassed = $false
$gateFile = "test-results/deploy-gate.json"

# ── 1. Unit Tests ────────────────────────────────────────────────────
if (-not $E2EOnly) {
    Write-Step "PHASE 1: VITEST UNIT TESTS"

    $unitCmd = "npx vitest run --config tests/unit/vitest.config.ts --reporter=verbose"
    if ($WithCoverage) { $unitCmd += " --coverage" }

    Write-Host "  Running: $unitCmd"
    try {
        Invoke-Expression $unitCmd
        if ($LASTEXITCODE -eq 0) {
            Write-Pass "All unit tests passed"
            $unitPassed = $true
        } else {
            Write-Fail "Unit tests failed (exit code: $LASTEXITCODE)"
        }
    } catch {
        Write-Fail "Unit tests crashed: $_"
    }

    if (-not $unitPassed -and -not $SkipGate) {
        Write-Fail "UNIT TESTS FAILED — Cloud deploy BLOCKED"
        Write-Host ""
        exit 1
    }
}

# ── 2. E2E Tests ────────────────────────────────────────────────────
if (-not $UnitOnly) {
    if (-not $E2EOnly -and -not $unitPassed -and -not $SkipGate) {
        Write-Fail "Skipping E2E — unit tests did not pass"
        exit 1
    }

    Write-Step "PHASE 2: PLAYWRIGHT E2E TESTS (Non-Headless, Parallel)"

    # Check if services are running
    $services = @(
        @{ Name = "Patient Portal"; Url = "http://localhost:3005" },
        @{ Name = "Doctor Portal";  Url = "http://localhost:3010" },
        @{ Name = "Meeting Server"; Url = "http://localhost:3020" }
    )

    foreach ($svc in $services) {
        try {
            $r = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
            Write-Pass "$($svc.Name) is running ($($svc.Url))"
        } catch {
            Write-Warn "$($svc.Name) NOT reachable at $($svc.Url)"
        }
    }

    Write-Host "  Running: npx playwright test --workers=3"
    try {
        npx playwright test --workers=3
        if ($LASTEXITCODE -eq 0) {
            Write-Pass "All E2E tests passed"
            $e2ePassed = $true
        } else {
            Write-Fail "E2E tests had failures (exit code: $LASTEXITCODE)"
        }
    } catch {
        Write-Fail "E2E tests crashed: $_"
    }

    # Generate snapshot report
    Write-Step "Generating Snapshot Report"
    try {
        node tests/helpers/snapshot-report.mjs
    } catch {
        Write-Warn "Snapshot report generation failed: $_"
    }
}

# ── 3. Deploy Gate ──────────────────────────────────────────────────
Write-Step "DEPLOY GATE"

$elapsed = (Get-Date) - $startTime
$gateResult = @{
    timestamp   = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    elapsed     = "$($elapsed.TotalSeconds.ToString('F1'))s"
    unitTests   = if ($E2EOnly) { "skipped" } elseif ($unitPassed) { "passed" } else { "failed" }
    e2eTests    = if ($UnitOnly) { "skipped" } elseif ($e2ePassed) { "passed" } else { "failed" }
    deployOk    = ($unitPassed -or $E2EOnly) -and ($e2ePassed -or $UnitOnly)
}

# Write gate file
New-Item -Path (Split-Path $gateFile) -ItemType Directory -Force | Out-Null
$gateResult | ConvertTo-Json -Depth 3 | Set-Content $gateFile -Encoding UTF8

if ($gateResult.deployOk) {
    Write-Pass "ALL TESTS PASSED — Cloud deploy ALLOWED"
    Write-Host "  Gate file: $gateFile" -ForegroundColor DarkGray
} else {
    Write-Fail "TESTS FAILED — Cloud deploy BLOCKED"
    Write-Host "  Gate file: $gateFile" -ForegroundColor DarkGray
    if (-not $SkipGate) { exit 1 }
}

Write-Host "`n  Total time: $($elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor DarkGray
Write-Host ""
