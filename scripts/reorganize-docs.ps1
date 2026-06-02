#!/usr/bin/env pwsh
# One-time / idempotent docs/ layout: separate file types and content areas.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root "Documents\docs"

$dirs = @(
    "guides/patient", "guides/doctor",
    "technical/word", "technical/ppt", "technical/pdf", "technical/slides",
    "diagrams/export",
    "markdown/operations", "markdown/testing", "markdown/ledgers"
)
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $docs $d) | Out-Null
}

function Move-IfExists($from, $to) {
    $src = Join-Path $docs $from
    $dst = Join-Path $docs $to
    if (Test-Path $src) {
        New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
        Move-Item -Force $src $dst
        Write-Host "  $from -> $to" -ForegroundColor Gray
    }
}

Write-Host "=== Reorganizing docs/ ===" -ForegroundColor Cyan

# Patient guides
Move-IfExists "USER_GUIDE_PATIENT_WORD_TH.docx" "guides/patient/USER_GUIDE_PATIENT_WORD_TH.docx"
Move-IfExists "USER_GUIDE_PATIENT_PPT_TH.pptx" "guides/patient/USER_GUIDE_PATIENT_PPT_TH.pptx"
Move-IfExists "USER_GUIDE_PATIENT_WORD_TH.pdf" "guides/patient/USER_GUIDE_PATIENT_WORD_TH.pdf"
Move-IfExists "USER_GUIDE_PATIENT_PPT_TH.pdf" "guides/patient/USER_GUIDE_PATIENT_PPT_TH.pdf"
Move-IfExists "USER_GUIDE_PATIENT_WORD_TH_NEW.docx" "guides/patient/USER_GUIDE_PATIENT_WORD_TH_NEW.docx"

# Doctor guides
Move-IfExists "USER_GUIDE_DOCTOR_WORD_TH.docx" "guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.docx"
Move-IfExists "USER_GUIDE_DOCTOR_PPT_TH.pptx" "guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pptx"
Move-IfExists "USER_GUIDE_DOCTOR_WORD_TH.pdf" "guides/doctor/USER_GUIDE_DOCTOR_WORD_TH.pdf"
Move-IfExists "USER_GUIDE_DOCTOR_PPT_TH.pdf" "guides/doctor/USER_GUIDE_DOCTOR_PPT_TH.pdf"

# Technical
Move-IfExists "TECHNICAL_ARCHITECTURE_WORD_TH.docx" "technical/word/TECHNICAL_ARCHITECTURE_WORD_TH.docx"
Move-IfExists "TECHNICAL_ARCHITECTURE_PPT_TH.pptx" "technical/ppt/TECHNICAL_ARCHITECTURE_PPT_TH.pptx"
Move-IfExists "TECHNICAL_ARCHITECTURE_WORD_TH.pdf" "technical/pdf/TECHNICAL_ARCHITECTURE_WORD_TH.pdf"
Move-IfExists "TECHNICAL_ARCHITECTURE_PPT_TH.pdf" "technical/pdf/TECHNICAL_ARCHITECTURE_PPT_TH.pdf"
Move-IfExists "TECHNICAL_ARCHITECTURE_SLIDES.html" "technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.html"
Move-IfExists "TECHNICAL_ARCHITECTURE_SLIDES.md" "technical/slides/TECHNICAL_ARCHITECTURE_SLIDES.md"

# Diagrams
Move-IfExists "diagrams.drawio" "diagrams/diagrams.drawio"
Move-IfExists "Isara_Anywhere_System_Diagram.drawio" "diagrams/Isara_Anywhere_System_Diagram.drawio"
Move-IfExists "Isara_Anywhere_Full_Diagram.drawio" "diagrams/Isara_Anywhere_Full_Diagram.drawio"
Move-IfExists "Isara_Anywhere_Complete_Diagram.drawio" "diagrams/Isara_Anywhere_Complete_Diagram.drawio"
if (Test-Path (Join-Path $docs "diagrams-export")) {
    Get-ChildItem (Join-Path $docs "diagrams-export") -ErrorAction SilentlyContinue | ForEach-Object {
        Move-Item -Force $_.FullName (Join-Path $docs "diagrams/export/$($_.Name)")
    }
    Remove-Item (Join-Path $docs "diagrams-export") -Force -ErrorAction SilentlyContinue
}

# Markdown — operations
Move-IfExists "APPOINTMENT_USER_GUIDE.md" "markdown/operations/APPOINTMENT_USER_GUIDE.md"
Move-IfExists "CLOUD_ACCESS_TH.md" "markdown/operations/CLOUD_ACCESS_TH.md"
Move-IfExists "PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md" "markdown/operations/PRODUCTION_DEPLOYMENT_AND_TECHNICAL_UPDATE.md"
Move-IfExists "URLS_AND_DEFAULT_USERS.md" "markdown/operations/URLS_AND_DEFAULT_USERS.md"
Move-IfExists "MARKDOWN_GUIDE.md" "markdown/operations/MARKDOWN_GUIDE.md"

# Markdown — testing
Move-IfExists "UNIT_TEST_UI_COVERAGE.md" "markdown/testing/UNIT_TEST_UI_COVERAGE.md"
Move-IfExists "DEFECT_REMEDIATION_DRAWIO_UPDATES.md" "markdown/testing/DEFECT_REMEDIATION_DRAWIO_UPDATES.md"

# Markdown — ledgers
Move-IfExists "PRE_DEBUG_BASELINE_LEDGER.md" "markdown/ledgers/PRE_DEBUG_BASELINE_LEDGER.md"
Move-IfExists "SECURITY_SCANNING_LEDGER.md" "markdown/ledgers/SECURITY_SCANNING_LEDGER.md"

Write-Host "Done. See Documents/docs/README.md" -ForegroundColor Green
