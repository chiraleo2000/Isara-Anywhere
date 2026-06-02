#!/usr/bin/env pwsh
# Remove legacy / duplicate user-guide artifacts under docs/guides/
$ErrorActionPreference = "SilentlyContinue"
$docs = Join-Path (Split-Path $PSScriptRoot -Parent) "docs"

$patterns = @(
    "*_NEW.docx", "*_NEW.pptx",
    "*.docx.building", "*.pptx.building",
    "USER_GUIDE_PPT_SCRIPT_TH.*",
    "USER_GUIDE_WORD_REPORT_TH.*",
    "*Portal_Report_Sample*",
    "*Portal_PowerPoint_Sample*",
    "USER_GUIDE_PATIENT_TH.md",
    "USER_GUIDE_DOCTOR_TH.md"
)

foreach ($sub in @("patient", "doctor")) {
    $dir = Join-Path $docs "guides/$sub"
    if (-not (Test-Path $dir)) { continue }
    foreach ($pat in $patterns) {
        Get-ChildItem -Path $dir -Filter $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "Removed guides/$sub/$($_.Name)" -ForegroundColor Gray
        }
    }
    $prefix = if ($sub -eq "patient") { "USER_GUIDE_PATIENT" } else { "USER_GUIDE_DOCTOR" }
    foreach ($kind in @(@("WORD", "docx"), @("PPT", "pptx"))) {
        $label = $kind[0]; $ext = $kind[1]
        $can = Join-Path $dir "${prefix}_${label}_TH.$ext"
        $new = Join-Path $dir "${prefix}_${label}_TH_NEW.$ext"
        if ((Test-Path $new) -and (Test-Path $can)) {
            try {
                Remove-Item $can -Force
                Rename-Item $new (Split-Path $can -Leaf)
                Write-Host "Promoted $(Split-Path $new -Leaf) -> $(Split-Path $can -Leaf)" -ForegroundColor Cyan
            } catch {
                Write-Host "Keep $(Split-Path $new -Leaf) (close $(Split-Path $can -Leaf) first)" -ForegroundColor Yellow
            }
        } elseif ((Test-Path $new) -and -not (Test-Path $can)) {
            Rename-Item $new (Split-Path $can -Leaf)
            Write-Host "Renamed $(Split-Path $new -Leaf) -> $(Split-Path $can -Leaf)" -ForegroundColor Cyan
        }
    }
}

Write-Host "Canonical: docs/guides/patient|doctor/*.docx|pptx|pdf" -ForegroundColor Green
