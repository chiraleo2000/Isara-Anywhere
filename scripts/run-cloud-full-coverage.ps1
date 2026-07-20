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
    Write-Host "`n=== Cloud DB purge test-only (retain seed) ===" -ForegroundColor Cyan
    npm run cleanup:cloud-test-only
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "cleanup:cloud-test-only returned $LASTEXITCODE (continuing)"
    }
}

# Group N needs SSO fixture users; seed after purge (or when skip-reseed left DB without them).
Write-Host "`n=== Seed SSO fixture users (Group N) ===" -ForegroundColor Cyan
$seedEnv = @{
    CLOUD_DB_HOST = if ($env:CLOUD_DB_HOST) { $env:CLOUD_DB_HOST } else { '35.240.157.230' }
    DB_HOST = if ($env:CLOUD_DB_HOST) { $env:CLOUD_DB_HOST } else { '35.240.157.230' }
    DB_PORT = '5432'
    DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { 'izara_phase1' }
    DB_USER = if ($env:DB_USER) { $env:DB_USER } else { 'postgres' }
    DB_SSL = 'false'
}
foreach ($k in $seedEnv.Keys) { Set-Item -Path "Env:$k" -Value $seedEnv[$k] }
# Always prefer Secret Manager db-password for GCE VM (stale/local CLOUD_DB_PASSWORD must not win).
try {
    $sec = (gcloud secrets versions access latest --secret=db-password --project=izara-telemedicine 2>$null)
    if ($LASTEXITCODE -eq 0 -and $sec) {
        $env:CLOUD_DB_PASSWORD = ([string]$sec).Trim()
    }
} catch { }
if ($env:CLOUD_DB_PASSWORD) { $env:DB_PASSWORD = $env:CLOUD_DB_PASSWORD }
node scripts/database/db-tool.cjs --target cloud --seed-sso
if ($LASTEXITCODE -ne 0) {
    Write-Warning "seed-sso returned $LASTEXITCODE (Group N may 404)"
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
