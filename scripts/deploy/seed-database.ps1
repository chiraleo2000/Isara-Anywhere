<#
.SYNOPSIS
  Seeds the Izara database with development test data.
.DESCRIPTION
  Runs the idempotent seed-dev-data.sql script against the Docker PostgreSQL container.
  Safe to run repeatedly — uses ON CONFLICT DO NOTHING.
#>
param(
    [string]$Container = "izara-postgres",
    [string]$Database  = "izara_phase1",
    [string]$User      = "postgres"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SqlFile   = Join-Path $ScriptDir "..\database\seed-dev-data.sql"

if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
    exit 1
}

Write-Host "`n🌱 Seeding database '$Database' in container '$Container'..." -ForegroundColor Cyan

Get-Content $SqlFile -Raw |
    docker exec -i $Container psql -U $User -d $Database --set ON_ERROR_STOP=1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Seed complete!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Seed failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}
