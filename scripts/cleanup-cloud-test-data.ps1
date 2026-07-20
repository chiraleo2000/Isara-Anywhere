#!/usr/bin/env pwsh
<#
  Remove Playwright/E2E-generated rows from GCE VM PostgreSQL
  (35.240.157.230:5432 / izara_phase1) - NOT Cloud SQL.
  Default: purge only (no re-seed). Pass -Reseed to run baseline demo seed after purge.
  Reads `.env` for DB_PASSWORD / CLOUD_DB_PASSWORD (read-only). Prefer Secret Manager
  `db-password` exported as CLOUD_DB_PASSWORD before invoking.
#>
param(
    [switch]$Reseed
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        if (-not (Test-Path -LiteralPath "Env:$key")) {
            Set-Item -Path "Env:$key" -Value $val
        }
    }
}

# GCE VM Postgres only. Do not use Cloud SQL.
if (-not $env:CLOUD_DB_HOST) { $env:CLOUD_DB_HOST = '35.240.157.230' }
$env:DB_HOST = $env:CLOUD_DB_HOST
if (-not $env:CLOUD_DB_PORT) { $env:CLOUD_DB_PORT = '5432' }
$env:DB_PORT = $env:CLOUD_DB_PORT
if (-not $env:DB_NAME) { $env:DB_NAME = 'izara_phase1' }
if (-not $env:DB_USER) { $env:DB_USER = 'postgres' }
# VM Postgres is plain TCP
$env:DB_SSL = 'false'

if (-not $env:DB_PASSWORD -and $env:CLOUD_DB_PASSWORD) {
    $env:DB_PASSWORD = $env:CLOUD_DB_PASSWORD
}
if (-not $env:DB_PASSWORD -and $env:DEV_DB_PASSWORD) {
    $env:DB_PASSWORD = $env:DEV_DB_PASSWORD
}

# Always prefer Secret Manager db-password for GCE VM (local .env DB_PASSWORD is Docker-only).
try {
    $sec = gcloud secrets versions access latest --secret=db-password --project=izara-telemedicine 2>$null
    if ($LASTEXITCODE -eq 0 -and $sec) {
        $env:CLOUD_DB_PASSWORD = [string]$sec
        $env:CLOUD_DB_PASSWORD = $env:CLOUD_DB_PASSWORD.Trim()
    }
} catch { }
if ($env:CLOUD_DB_PASSWORD) {
    $env:DB_PASSWORD = $env:CLOUD_DB_PASSWORD
}

if (-not $env:DB_PASSWORD) {
    Write-Error "CLOUD_DB_PASSWORD (or DB_PASSWORD) required - use GCE VM secret db-password, not local Docker postgres password"
}

Write-Host "Target: GCE VM PostgreSQL $($env:DB_HOST):$($env:DB_PORT)/$($env:DB_NAME) (not Cloud SQL)" -ForegroundColor Gray

$wf = Join-Path $root "tests\e2e\.workflow-state.json"
if (Test-Path $wf) {
    Remove-Item $wf -Force
    Write-Host "Removed tests/e2e/.workflow-state.json" -ForegroundColor Gray
}

if ($Reseed) {
    Write-Host "=== GCE VM test data cleanup + re-seed baseline demo ===" -ForegroundColor Cyan
    node scripts/database/db-tool.cjs --target cloud --cleanup-test
} else {
    Write-Host "=== GCE VM test data cleanup (purge only, no demo re-seed) ===" -ForegroundColor Cyan
    node scripts/database/db-tool.cjs --target cloud --cleanup-test-only
}
exit $LASTEXITCODE
