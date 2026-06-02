#!/usr/bin/env pwsh
# Export canonical USER_GUIDE_*.docx / *.pptx to PDF (Word + PowerPoint required).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root "docs"

function Resolve-SourceFile([string]$relativePath) {
    $path = Join-Path $docs $relativePath
    if (Test-Path $path) { return $path }
    if ($relativePath -match '^(.+)\.(docx|pptx)$') {
        $alt = Join-Path $docs ($Matches[1] + "_NEW." + $Matches[2])
        if (Test-Path $alt) {
            Write-Host "  using $([IO.Path]::GetFileName($alt)) (canonical locked)" -ForegroundColor Yellow
            return $alt
        }
    }
    throw "Missing source: $relativePath (and no _NEW fallback)"
}

$pairs = @(
    @("guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx", "guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf"),
    @("guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx", "guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf"),
    @("technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx", "technical/pdf/TECHNICAL_ARCHITECTURE_WORD_TH.pdf"),
    @("guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx", "guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf"),
    @("guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx", "guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf"),
    @("technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx", "technical/pdf/TECHNICAL_ARCHITECTURE_PPT_TH.pdf")
)

Write-Host "=== Export Word guides to PDF (TH Sarabun New) ===" -ForegroundColor Cyan
$word = New-Object -ComObject Word.Application
$word.Visible = $false
foreach ($p in $pairs[0..2]) {
    $src = Resolve-SourceFile $p[0]
    $dst = Join-Path $docs $p[1]
    New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
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
    New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
    Write-Host "  $([IO.Path]::GetFileName($src)) -> $($p[1])"
    $pres = $pp.Presentations.Open($src, $true, $true, $false)
    $pres.SaveAs($dst, 32)
    $pres.Close()
}
$pp.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($pp) | Out-Null

Write-Host "Done. PDF files:" -ForegroundColor Green
Get-ChildItem (Join-Path $docs "guides"), (Join-Path $docs "technical/pdf") -Recurse -Filter "*.pdf" -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "  $($_.FullName.Replace($docs + '\', 'docs/')) ($([math]::Round($_.Length/1MB,1)) MB)" }
