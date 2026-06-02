#!/usr/bin/env pwsh
<#
  Full cloud Playwright coverage — all groups A–P, headed UI + screenshots.
  Orchestration: Playwright project dependencies (A first, D→E→F serial chain).
#>
param(
    [int]$Workers = 1,
    [switch]$SkipHealthGate,
    [switch]$SkipReseed
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# After cloud:smoke passes, skip duplicate fixture health gate (avoids cold-start flake)
if ($SkipHealthGate -or -not $env:E2E_SKIP_HEALTH_GATE) { $env:E2E_SKIP_HEALTH_GATE = '1' }
$env:PW_HEADED = '1'

$projects = @(
    'A-auth',
    'B-patient-portal', 'C-doctor-portal',
    'G-livingwill-pdpa', 'H-content-resources', 'I-admin-notifications', 'J-ai-timeline-map',
    'D-appointments', 'D-doctor-host', 'Q-meeting-lifecycle', 'E-meeting-clinical', 'F-phr-health-records', 'L-lab-ordering',
    'K-accessibility',
    'M-hardening', 'N-google-sso', 'O-sso-screenshots', 'P-workflow-screenshots'
)

$args = @('--workers', $Workers, '--headed') + ($projects | ForEach-Object { "--project=$_" })

Write-Host "=== Cloud full coverage (headed) ===" -ForegroundColor Cyan
Write-Host "Projects: $($projects -join ', ')" -ForegroundColor Gray

if (-not $SkipReseed -and $env:CLOUD_SKIP_RESEED -ne '1') {
    Write-Host "`n=== Cloud DB reseed (demo + SSO fixture users for Group N) ===" -ForegroundColor Cyan
    npm run cleanup:cloud-test
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "cleanup:cloud-test returned $LASTEXITCODE (continuing - SSO tests may 404)"
    }
}

& "$root/scripts/run-cloud-tests.ps1" @args
$code = $LASTEXITCODE

if ($code -eq 0) {
    Write-Host "`n=== Regenerating portal user guides ===" -ForegroundColor Cyan
    & "$root/scripts/reorganize-docs.ps1"
    python "$root/scripts/build-portal-user-guides.py"
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "build-portal-user-guides.py failed (exit $LASTEXITCODE); E2E passed"
    }
}

exit $code
