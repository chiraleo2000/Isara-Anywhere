#!/usr/bin/env pwsh
<#
  Deploy all services via root cloudbuild.yaml + apply DB migrations.
  Reads `.env` for DB_PASSWORD only (read-only). Does not modify `.env`.
#>
param(
    [string]$Tag = "v1.7.12",
    [switch]$Async,
    [switch]$MigrationsOnly,
    [switch]$SmokeOnly
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $root

if (Test-Path (Join-Path $root ".env")) {
    Get-Content (Join-Path $root ".env") | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (-not (Test-Path -LiteralPath "Env:$key")) { Set-Item "Env:$key" $val }
    }
}

if ($SmokeOnly) {
    node scripts/cloud-smoke.mjs
    exit $LASTEXITCODE
}

if ($MigrationsOnly) {
    node scripts/apply-cloud-db-from-env.cjs
    exit $LASTEXITCODE
}

Write-Host "Submitting Cloud Build (tag=$Tag)..." -ForegroundColor Cyan
$args = @("builds", "submit", ".", "--config=cloudbuild.yaml", "--substitutions=_TAG=$Tag", "--project=izara-telemedicine")
if ($Async) { $args += "--async" }
gcloud @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $Async) {
    Write-Host "Shifting traffic to latest revisions..." -ForegroundColor Cyan
    & "$PSScriptRoot\shift-cloud-traffic.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Running post-deploy smoke..." -ForegroundColor Cyan
    node scripts/cloud-smoke.mjs
}
