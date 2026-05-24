#!/usr/bin/env pwsh
<#
  Two-round cloud hardening: deploy → test → immutable ledger → (Round 2 after fixes).
  Usage:
    .\scripts\run-two-round-cloud-hardening.ps1 -Round 1
    .\scripts\run-two-round-cloud-hardening.ps1 -Round 2
    .\scripts\run-two-round-cloud-hardening.ps1 -Round All
#>
param(
    [ValidateSet('1', '2', 'All')]
    [string]$Round = '1',
    [string]$BaseTag = 'v1.7.23',
    [switch]$SkipDeploy,
    [switch]$SkipUnit,
    [int]$Workers = 1,
    [switch]$Headed
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $root

function Load-DotEnv {
    $envFile = Join-Path $root '.env'
    if (-not (Test-Path $envFile)) { return }
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (-not (Test-Path -LiteralPath "Env:$key")) { Set-Item "Env:$key" $val }
    }
}

function Set-CloudEnvAliases {
    if (-not $env:CLOUD_PATIENT_URL) {
        $env:CLOUD_PATIENT_URL = 'https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app'
    }
    if (-not $env:CLOUD_DOCTOR_URL) {
        $env:CLOUD_DOCTOR_URL = 'https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app'
    }
    if (-not $env:CLOUD_MEETING_URL) {
        $env:CLOUD_MEETING_URL = 'https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app'
    }
    $env:TEST_ENV = 'cloud'
    $env:PATIENT_URL = $env:CLOUD_PATIENT_URL
    $env:DOCTOR_URL = $env:CLOUD_DOCTOR_URL
    $env:MEETING_URL = $env:CLOUD_MEETING_URL
    $env:E2E_SKIP_HEALTH_GATE = '1'
    $env:E2E_SKIP_DB_MIGRATE = '1'
    if ($Headed) {
        $env:PW_HEADED = '1'
        Remove-Item Env:PW_HEADLESS -ErrorAction SilentlyContinue
    } else {
        $env:PW_HEADLESS = '1'
        $env:PW_HEADED = '0'
    }
    $env:PW_WORKERS = "$Workers"
    if (-not $env:GEMINI_API_KEY -and $env:CLOUD_GEMINI_API_KEY) {
        $env:GEMINI_API_KEY = $env:CLOUD_GEMINI_API_KEY
    }
}

function Invoke-CloudRound([int]$roundNum) {
    $tag = "${BaseTag}-r${roundNum}"
    Write-Host "`n========== CLOUD HARDENING ROUND $roundNum (tag=$tag) ==========" -ForegroundColor Magenta

    Set-CloudEnvAliases

    if (-not $env:GEMINI_API_KEY) {
        Write-Error 'GEMINI_API_KEY or CLOUD_GEMINI_API_KEY required in .env'
    }

    if (-not $SkipUnit) {
        Write-Host '--- Unit + contract gates ---' -ForegroundColor Cyan
        npm run test:unit
        if ($LASTEXITCODE -ne 0) { throw 'Unit tests failed' }
        npm run test:meeting-server:contract
        if ($LASTEXITCODE -ne 0) { throw 'Meeting contract tests failed' }
    }

    Write-Host '--- Pre-round cleanup ---' -ForegroundColor Cyan
    npm run cleanup:cloud-test
    if ($LASTEXITCODE -ne 0) { Write-Warning 'cleanup:cloud-test returned non-zero (continuing)' }

    if (-not $SkipDeploy) {
        Write-Host "--- Deploy ($tag) ---" -ForegroundColor Cyan
        & "$root/scripts/deploy-cloud-from-env.ps1" -Tag $tag
        if ($LASTEXITCODE -ne 0) { throw 'Deploy failed' }
    }

    Write-Host '--- Smoke + GATE0 API ---' -ForegroundColor Cyan
    & "$root/scripts/deploy-cloud-from-env.ps1" -SmokeOnly
    if ($LASTEXITCODE -ne 0) { throw 'Smoke failed' }
    npm run verify:gate0
    if ($LASTEXITCODE -ne 0) { Write-Warning 'verify:gate0 failed — ledger will capture UI gaps' }

    Write-Host '--- Full Playwright A–P (single run, project deps) ---' -ForegroundColor Cyan
    $projects = @(
        'A-auth',
        'B-patient-portal', 'C-doctor-portal',
        'G-livingwill-pdpa', 'H-content-resources', 'I-admin-notifications', 'J-ai-timeline-map',
        'D-appointments', 'D-doctor-host', 'Q-meeting-lifecycle', 'E-meeting-clinical',
        'F-phr-health-records', 'L-lab-ordering',
        'K-accessibility', 'M-hardening', 'N-google-sso', 'O-sso-screenshots', 'P-workflow-screenshots'
    )
    $pwArgs = @('--workers', $Workers) + ($projects | ForEach-Object { "--project=$_" })
    if ($Headed -or $env:PW_HEADED -eq '1') {
        $pwArgs += '--headed'
    }
    & "$root/scripts/run-cloud-tests.ps1" @pwArgs
    $testCode = $LASTEXITCODE

    Write-Host '--- Immutable error ledger ---' -ForegroundColor Cyan
    node "$root/scripts/aggregate-cloud-error-ledger.mjs" --round $roundNum

    if ($testCode -ne 0) {
        Write-Host "Round $roundNum tests had failures — see CLOUD_E2E_ERROR_LEDGER_ROUND$roundNum.md" -ForegroundColor Yellow
        return 1
    }
    Write-Host "Round $roundNum completed with no Playwright failures." -ForegroundColor Green
    return 0
}

Load-DotEnv

$rounds = if ($Round -eq 'All') { @(1, 2) } else { @([int]$Round) }
$exitCode = 0
foreach ($r in $rounds) {
    $code = Invoke-CloudRound $r
    if ($code -ne 0) {
        $exitCode = $code
        if ($Round -eq 'All' -and $r -eq 1) {
            Write-Host 'Round 1 had failures — apply ledger fixes, then Round 2 redeploys and re-runs A–P.' -ForegroundColor Yellow
        } else {
            break
        }
    }
}

if ($exitCode -eq 0 -and ($Round -eq '2' -or ($Round -eq 'All' -and $rounds.Count -eq 2))) {
    Write-Host '--- Post-verification cleanup (purge only) ---' -ForegroundColor Cyan
    npm run cleanup:cloud-test-only
    $wf = Join-Path $root 'tests\e2e\.workflow-state.json'
    if (Test-Path $wf) { Remove-Item $wf -Force }
}

exit $exitCode
