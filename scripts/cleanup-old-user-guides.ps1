#!/usr/bin/env pwsh
# Remove legacy / duplicate user-guide artifacts under docs/
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

foreach ($pat in $patterns) {
    Get-ChildItem -Path $docs -Filter $pat -File | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Removed $($_.Name)" -ForegroundColor Gray
    }
}

foreach ($base in @("USER_GUIDE_PATIENT_WORD_TH", "USER_GUIDE_PATIENT_PPT_TH")) {
    foreach ($ext in @("docx", "pptx")) {
        $can = Join-Path $docs "$base.$ext"
        $new = Join-Path $docs "${base}_NEW.$ext"
        if ((Test-Path $new) -and (Test-Path $can)) {
            try {
                Remove-Item $can -Force
                Rename-Item $new $can
                Write-Host "Promoted ${base}_NEW.$ext -> $base.$ext" -ForegroundColor Cyan
            } catch {
                Write-Host "Keep ${base}_NEW.$ext (close $base.$ext first)" -ForegroundColor Yellow
            }
        } elseif ((Test-Path $new) -and -not (Test-Path $can)) {
            Rename-Item $new $can
            Write-Host "Renamed ${base}_NEW.$ext -> $base.$ext" -ForegroundColor Cyan
        }
    }
}

Write-Host "Canonical: USER_GUIDE_*_WORD_TH.docx, USER_GUIDE_*_PPT_TH.pptx, *_TH.pdf" -ForegroundColor Green
