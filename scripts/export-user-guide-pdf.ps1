#!/usr/bin/env pwsh
# Export canonical USER_GUIDE_*.docx / *.pptx to PDF (Word + PowerPoint required).
$ErrorActionPreference = "Stop"
$docs = Join-Path (Split-Path $PSScriptRoot -Parent) "docs"
Set-Location $docs

function Resolve-SourceFile([string]$name) {
    $path = Join-Path $docs $name
    if (Test-Path $path) { return $path }
    if ($name -match '^(.+)\.(docx|pptx)$') {
        $alt = Join-Path $docs ($Matches[1] + "_NEW." + $Matches[2])
        if (Test-Path $alt) {
            Write-Host "  using $([IO.Path]::GetFileName($alt)) (canonical locked)" -ForegroundColor Yellow
            return $alt
        }
    }
    throw "Missing source: $name (and no _NEW fallback)"
}

$pairs = @(
    @("USER_GUIDE_PATIENT_WORD_TH.docx", "USER_GUIDE_PATIENT_WORD_TH.pdf"),
    @("USER_GUIDE_DOCTOR_WORD_TH.docx", "USER_GUIDE_DOCTOR_WORD_TH.pdf"),
    @("TECHNICAL_ARCHITECTURE_WORD_TH.docx", "TECHNICAL_ARCHITECTURE_WORD_TH.pdf"),
    @("USER_GUIDE_PATIENT_PPT_TH.pptx", "USER_GUIDE_PATIENT_PPT_TH.pdf"),
    @("USER_GUIDE_DOCTOR_PPT_TH.pptx", "USER_GUIDE_DOCTOR_PPT_TH.pdf"),
    @("TECHNICAL_ARCHITECTURE_PPT_TH.pptx", "TECHNICAL_ARCHITECTURE_PPT_TH.pdf")
)

Write-Host "=== Export Word guides to PDF (TH Sarabun New) ===" -ForegroundColor Cyan
$word = New-Object -ComObject Word.Application
$word.Visible = $false
foreach ($p in $pairs[0..2]) {
    $src = Resolve-SourceFile $p[0]
    $dst = Join-Path $docs $p[1]
    Write-Host "  $([IO.Path]::GetFileName($src)) -> $($p[1])"
    $doc = $word.Documents.Open($src)
    $doc.ExportAsFixedFormat($dst, 17)
    $doc.Close()
}
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Host "=== Export PowerPoint guides to PDF (FC Iconic) ===" -ForegroundColor Cyan
$pp = New-Object -ComObject PowerPoint.Application
$pp.Visible = 0
foreach ($p in $pairs[3..5]) {
    $src = Resolve-SourceFile $p[0]
    $dst = Join-Path $docs $p[1]
    Write-Host "  $([IO.Path]::GetFileName($src)) -> $($p[1])"
    $pres = $pp.Presentations.Open($src, $true, $true, $false)
    $pres.SaveAs($dst, 32)
    $pres.Close()
}
$pp.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null

Write-Host "Done. PDF files:" -ForegroundColor Green
Get-ChildItem *_TH.pdf, TECHNICAL_ARCHITECTURE_*.pdf -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.Name) ($([math]::Round($_.Length/1MB,1)) MB)" }
