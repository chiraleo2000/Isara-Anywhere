#!/usr/bin/env pwsh
# Create a full project zip including gitignored .env files (secrets).
# Excludes: node_modules, .git, test caches, live Postgres data files.
param(
    [string]$Version = '',
    [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not $Version) {
    $pkg = Get-Content package.json -Raw | ConvertFrom-Json
    $Version = $pkg.version
}

if (-not $OutputDir) { $OutputDir = $root }
$zipName = "Isara-Anywhere-v$Version-full.zip"
$zipPath = Join-Path $OutputDir $zipName
$staging = Join-Path $env:TEMP "izara-zip-$Version-$(Get-Random)"

$excludeDirNames = @(
    'node_modules', '.git', 'test-results', 'playwright-report', 'test-logs',
    'coverage', '.cache', 'dist', 'build', '.turbo', '.next'
)
$excludeFilePatterns = @('*.log', '.DS_Store', 'Thumbs.db')

function Should-SkipPath([string]$fullPath) {
    $rel = $fullPath.Substring($root.Length).TrimStart('\', '/')
    if ($rel -match '(^|[\\/])data[\\/]postgres[\\/]' -and $rel -notmatch '\.gitkeep$') { return $true }
    foreach ($d in $excludeDirNames) {
        if ($rel -match "(^|[\\/])$([regex]::Escape($d))([\\/]|$)") { return $true }
    }
    return $false
}

Write-Host "=== Isara release zip v$Version ===" -ForegroundColor Cyan
Write-Host "Staging: $staging"

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

$files = Get-ChildItem -Path $root -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object { -not (Should-SkipPath $_.FullName) }

$copied = 0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length).TrimStart('\', '/')
    $skip = $false
    foreach ($pat in $excludeFilePatterns) {
        if ($f.Name -like $pat) { $skip = $true; break }
    }
    if ($skip) { continue }
    $dest = Join-Path $staging $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item -LiteralPath $f.FullName -Destination $dest -Force
    $copied++
}

Write-Host "Copied $copied files (includes .env secrets)" -ForegroundColor Gray

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $staging -Recurse -Force

$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "Created: $zipPath ($sizeMb MB)" -ForegroundColor Green
