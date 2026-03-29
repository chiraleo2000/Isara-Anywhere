#!/usr/bin/env pwsh
# generate-docs.ps1 — Generate PDF and DOCX from user guide Markdown files
# Requires: pandoc (https://pandoc.org)
# Usage: .\scripts\generate-docs.ps1 [-Format pdf|docx|all] [-Guide full|compact|all]

param(
    [ValidateSet('pdf', 'docx', 'all')]
    [string]$Format = 'all',

    [ValidateSet('full', 'compact', 'all')]
    [string]$Guide = 'all'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$root\Presentations")) { $root = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path "$root\Presentations")) { $root = $PSScriptRoot | Split-Path }

# Resolve workspace root
$workspace = (Get-Item "$PSScriptRoot\..").FullName

$outputDir = Join-Path $workspace 'Presentations'
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Check pandoc
$pandoc = Get-Command pandoc -ErrorAction SilentlyContinue
if (-not $pandoc) {
    Write-Error "pandoc not found. Install from https://pandoc.org/installing.html"
    exit 1
}
Write-Host "Using pandoc: $($pandoc.Source)" -ForegroundColor Cyan

# Source files
$guides = @{
    full    = @{
        src   = Join-Path $workspace 'Presentations\USER_GUIDE.md'
        title = 'IZARA Telemedicine User Guide'
        base  = 'IZARA_User_Guide'
    }
    compact = @{
        src   = Join-Path $workspace 'Presentations\USER_GUIDE_COMPACT.md'
        title = 'IZARA Telemedicine User Guide (Compact)'
        base  = 'IZARA_User_Guide_Compact'
    }
}

# Determine which guides to process
$selectedGuides = if ($Guide -eq 'all') { @('full', 'compact') } else { @($Guide) }
$selectedFormats = if ($Format -eq 'all') { @('pdf', 'docx') } else { @($Format) }

$generated = @()
$failed = @()

foreach ($g in $selectedGuides) {
    $info = $guides[$g]
    if (-not (Test-Path $info.src)) {
        Write-Warning "Source not found: $($info.src)"
        $failed += "$g source missing"
        continue
    }

    foreach ($fmt in $selectedFormats) {
        $outFile = Join-Path $outputDir "$($info.base).$fmt"
        Write-Host "`nGenerating $fmt from $g guide..." -ForegroundColor Yellow

        $pandocArgs = @(
            $info.src
            '-o', $outFile
            '--metadata', "title=$($info.title)"
            '--metadata', 'author=IZARA Telemedicine Team'
            '--metadata', "date=$(Get-Date -Format 'yyyy-MM-dd')"
            '--toc'
            '--toc-depth=3'
            '-s'
            '--resource-path', (Join-Path $workspace 'Presentations')
        )

        if ($fmt -eq 'pdf') {
            # Use default PDF engine; fall back to docx if no LaTeX
            $latexCheck = Get-Command xelatex -ErrorAction SilentlyContinue
            if (-not $latexCheck) {
                $latexCheck = Get-Command pdflatex -ErrorAction SilentlyContinue
            }
            $wkhtml = Get-Command wkhtmltopdf -ErrorAction SilentlyContinue
            if ($latexCheck) {
                $pandocArgs += '--pdf-engine=xelatex'
                $pandocArgs += '-V', 'mainfont=TH Sarabun New'
                $pandocArgs += '-V', 'geometry:margin=2.5cm'
            }
            elseif ($wkhtml) {
                Write-Host "  Using wkhtmltopdf as PDF engine" -ForegroundColor DarkYellow
                $pandocArgs += '--pdf-engine=wkhtmltopdf'
                $pandocArgs += '--pdf-engine-opt=--enable-local-file-access'
                $pandocArgs += '--embed-resources'
                $pandocArgs += '--resource-path', "$workspace${[IO.Path]::PathSeparator}$(Join-Path $workspace 'Presentations')${[IO.Path]::PathSeparator}$(Join-Path $workspace 'screenshots')"
            }
            else {
                Write-Warning "No PDF engine found. Generating DOCX instead of PDF for $g."
                Write-Warning "Install MiKTeX, TeX Live, or wkhtmltopdf for PDF support."
                $fmt = 'docx'
                $outFile = Join-Path $outputDir "$($info.base).docx"
                $pandocArgs[2] = $outFile
            }
        }

        if ($fmt -eq 'docx') {
            # Use pandoc default reference doc
        }

        try {
            Write-Host "  pandoc $($info.src | Split-Path -Leaf) -> $($outFile | Split-Path -Leaf)" -ForegroundColor Gray
            $pandocOutput = & pandoc @pandocArgs 2>&1
            $pandocOutput | ForEach-Object {
                if ($_ -match '^\[WARNING\]') {
                    Write-Host "  $_" -ForegroundColor DarkYellow
                } else {
                    Write-Host "  $_"
                }
            }
            if (Test-Path $outFile) {
                $size = (Get-Item $outFile).Length
                $sizeKB = [math]::Round($size / 1024, 1)
                Write-Host "  OK: $outFile ($sizeKB KB)" -ForegroundColor Green
                $generated += $outFile
            }
            else {
                Write-Warning "  Output file not created"
                $failed += "$g.$fmt"
            }
        }
        catch {
            Write-Warning "  Failed: $_"
            $failed += "$g.$fmt"
        }
    }
}

# Summary
Write-Host "`n=== Generation Summary ===" -ForegroundColor Cyan
Write-Host "Generated: $($generated.Count) file(s)" -ForegroundColor Green
foreach ($f in $generated) {
    Write-Host "  - $(Split-Path -Leaf $f)" -ForegroundColor Green
}
if ($failed.Count -gt 0) {
    Write-Host "Failed: $($failed.Count)" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "  - $f" -ForegroundColor Red
    }
}
Write-Host "Output directory: $outputDir" -ForegroundColor Cyan
