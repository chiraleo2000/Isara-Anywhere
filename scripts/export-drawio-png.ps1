#!/usr/bin/env pwsh
# Export draw.io diagrams to PNG/PDF (requires draw.io Desktop or drawio CLI on PATH).
param(
    [string]$DrawIoExe = "",
    [string]$OutDir = "Documents/docs/diagrams/export"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$diagrams = @(
    "Documents/docs/diagrams/Isara_Anywhere_System_Diagram.drawio",
    "Documents/docs/diagrams/Isara_Anywhere_Full_Diagram.drawio",
    "Documents/docs/diagrams/Isara_Anywhere_Complete_Diagram.drawio",
    "Documents/docs/diagrams/diagrams.drawio"
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Find-DrawIo {
    param([string]$Hint)
    if ($Hint -and (Test-Path $Hint)) { return $Hint }
    $candidates = @(
        "${env:ProgramFiles}\draw.io\draw.io.exe",
        "${env:LocalAppData}\Programs\draw.io\draw.io.exe",
        "${env:ProgramFiles}\Draw.io\draw.io.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { return $c }
    }
    $cli = Get-Command drawio -ErrorAction SilentlyContinue
    if ($cli) { return $cli.Source }
    return $null
}

$exe = Find-DrawIo -Hint $DrawIoExe
if (-not $exe) {
    Write-Host "draw.io not found. Install draw.io Desktop or add drawio CLI to PATH." -ForegroundColor Yellow
    Write-Host "Manual: open docs/*.drawio, apply DEFECT_REMEDIATION_DRAWIO_UPDATES.md sections 1-10, export PNG/PDF." -ForegroundColor Yellow
    exit 1
}

foreach ($src in $diagrams) {
    if (-not (Test-Path $src)) {
        Write-Host "Skip missing: $src" -ForegroundColor Yellow
        continue
    }
    $base = [System.IO.Path]::GetFileNameWithoutExtension($src)
    $png = Join-Path $OutDir "$base.png"
    $pdf = Join-Path $OutDir "$base.pdf"
    Write-Host "Exporting $src ..." -ForegroundColor Cyan
    & $exe --export --format png --output $png $src
    & $exe --export --format pdf --output $pdf $src
    Write-Host "  -> $png" -ForegroundColor Green
    Write-Host "  -> $pdf" -ForegroundColor Green
}

Write-Host "Done. See docs/markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md section 10 checklist." -ForegroundColor Green
