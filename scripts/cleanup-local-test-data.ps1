#!/usr/bin/env pwsh
<#
  Remove Playwright/E2E-generated rows from local PostgreSQL.
  Default: purge only (no re-seed). Pass -Reseed to run baseline demo seed after purge.
  Reads `.env` for DB_PASSWORD / POSTGRES_PASSWORD (read-only).
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

if (-not $env:DB_PASSWORD -and $env:POSTGRES_PASSWORD) {
    $env:DB_PASSWORD = $env:POSTGRES_PASSWORD
}

# Clear local Playwright workflow + auth artifacts
$wf = Join-Path $root "tests\e2e\.workflow-state.json"
if (Test-Path $wf) {
    Remove-Item $wf -Force
    Write-Host "Removed tests/e2e/.workflow-state.json" -ForegroundColor Gray
}

$authCache = Join-Path $root "tests\e2e\.auth-cache.json"
if (Test-Path $authCache) {
    Remove-Item $authCache -Force
    Write-Host "Removed tests/e2e/.auth-cache.json" -ForegroundColor Gray
}

$authStates = Join-Path $root "tests\e2e\.auth-states"
if (Test-Path $authStates) {
    Get-ChildItem $authStates -File -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Removed tests/e2e/.auth-states/$($_.Name)" -ForegroundColor Gray
    }
}

if ($Reseed) {
    Write-Host "=== Local test data cleanup + re-seed baseline demo ===" -ForegroundColor Cyan
    node scripts/database/db-tool.cjs --target local --cleanup-test
} else {
    Write-Host "=== Local test data cleanup (purge only, no demo re-seed) ===" -ForegroundColor Cyan
    node scripts/database/db-tool.cjs --target local --cleanup-test-only
}
exit $LASTEXITCODE
