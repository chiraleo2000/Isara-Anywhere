#!/usr/bin/env pwsh
# Export USER_GUIDE_*.docx / *.pptx in docs/ to matching PDF (requires Microsoft Word + PowerPoint).
$ErrorActionPreference = "Stop"
$docs = Join-Path (Split-Path $PSScriptRoot -Parent) "docs"
Set-Location $docs

$wordPairs = @(
    @("USER_GUIDE_PATIENT_WORD_TH.docx", "USER_GUIDE_PATIENT_WORD_TH.pdf"),
    @("USER_GUIDE_DOCTOR_WORD_TH.docx", "USER_GUIDE_DOCTOR_WORD_TH.pdf")
)
$pptPairs = @(
    @("USER_GUIDE_PATIENT_PPT_TH.pptx", "USER_GUIDE_PATIENT_PPT_TH.pdf"),
    @("USER_GUIDE_DOCTOR_PPT_TH.pptx", "USER_GUIDE_DOCTOR_PPT_TH.pdf")
)

Write-Host "=== Export Word guides to PDF ===" -ForegroundColor Cyan
$word = New-Object -ComObject Word.Application
$word.Visible = $false
foreach ($p in $wordPairs) {
    $src = Join-Path $docs $p[0]
    $dst = Join-Path $docs $p[1]
    if (-not (Test-Path $src)) { Write-Warning "Missing $src"; continue }
    Write-Host "  $p[0] -> $p[1]"
    $doc = $word.Documents.Open($src)
    $doc.ExportAsFixedFormat($dst, 17) # wdExportFormatPDF
    $doc.Close()
}
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Host "=== Export PowerPoint guides to PDF ===" -ForegroundColor Cyan
$pp = New-Object -ComObject PowerPoint.Application
$pp.Visible = 0
foreach ($p in $pptPairs) {
    $src = Join-Path $docs $p[0]
    $dst = Join-Path $docs $p[1]
    if (-not (Test-Path $src)) { Write-Warning "Missing $src"; continue }
    Write-Host "  $p[0] -> $p[1]"
    $pres = $pp.Presentations.Open($src, $true, $true, $false)
    $pres.SaveAs($dst, 32) # ppSaveAsPDF
    $pres.Close()
}
$pp.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null

Write-Host "Done. PDF files in docs/" -ForegroundColor Green
