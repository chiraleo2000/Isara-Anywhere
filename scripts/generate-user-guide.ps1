<#
.SYNOPSIS
    Generate User Guide with embedded E2E screenshots as DOCX and PDF
.DESCRIPTION
    1. Collects all E2E screenshots from test-results/snapshots/
    2. Generates a Markdown file with embedded screenshots
    3. Converts to DOCX via pandoc
    4. Converts to PDF via pandoc (if LaTeX or wkhtmltopdf available)
.EXAMPLE
    .\scripts\generate-user-guide.ps1
    .\scripts\generate-user-guide.ps1 -Format docx
    .\scripts\generate-user-guide.ps1 -IncludeScreenshots
#>
param(
    [ValidateSet('pdf', 'docx', 'all')]
    [string]$Format = 'all',
    [switch]$IncludeScreenshots = $true
)

$ErrorActionPreference = 'Stop'

# Resolve workspace root
$workspace = (Get-Item "$PSScriptRoot\..").FullName
$outputDir = Join-Path $workspace 'Presentations'
$snapshotDir = Join-Path $workspace 'test-results\snapshots'
$guideMarkdown = Join-Path $outputDir 'USER_GUIDE_GENERATED.md'

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

# ── Collect screenshots ──────────────────────────────────────────────
function Get-Screenshots {
    param([string]$Dir)
    $results = @()
    if (-not (Test-Path $Dir)) { return $results }
    Get-ChildItem -Path $Dir -Recurse -Include '*.png','*.jpg' | ForEach-Object {
        $category = $_.Directory.Name
        if ($category -eq 'snapshots') { $category = 'General' }
        $results += @{
            Path = $_.FullName
            Name = $_.BaseName
            Category = $category
            RelativePath = $_.FullName.Replace($workspace, '').TrimStart('\', '/')
        }
    }
    return $results
}

# ── Generate Markdown content ────────────────────────────────────────
function Generate-GuideMarkdown {
    param($screenshots)

    $md = @"
---
title: "IZARA Telemedicine — User Guide"
subtitle: "Generated from E2E Test Screenshots"
author: "IZARA Telemedicine Team"
date: "$(Get-Date -Format 'yyyy-MM-dd')"
lang: "th"
---

# คู่มือการใช้งาน IZARA Telemedicine

## ภาพรวมระบบ

ระบบ IZARA Telemedicine ประกอบด้วย 3 ส่วนหลัก:

1. **Patient Portal** (พอร์ทัลผู้ป่วย) — สำหรับผู้ป่วยจองนัดหมาย, ดูประวัติสุขภาพ, เข้าห้องตรวจออนไลน์
2. **Doctor Portal** (พอร์ทัลแพทย์) — สำหรับแพทย์ตรวจรักษา, จัดการตาราง, เขียน EMR
3. **Meeting Server** (เซิร์ฟเวอร์ห้องตรวจ) — สำหรับวิดีโอคอล, บันทึกการตรวจ, สรุป AI

---

"@

    if ($screenshots.Count -gt 0) {
        # Group by category
        $grouped = $screenshots | Group-Object -Property { $_.Category }

        $categoryTitles = @{
            'patient'      = 'Patient Portal — หน้าเพจผู้ป่วย'
            'doctor'       = 'Doctor Portal — หน้าเพจแพทย์'
            'admin'        = 'Admin Portal — หน้าเพจผู้ดูแลระบบ'
            'data-sync'    = 'Data Sync — การซิงค์ข้อมูลข้ามพอร์ทัล'
            'meeting'      = 'Meeting Room — ห้องตรวจออนไลน์'
            'gate-test'    = 'Gate Test — ทดสอบก่อน Deploy'
            'General'      = 'Screenshots ทั่วไป'
        }

        foreach ($group in ($grouped | Sort-Object Name)) {
            $title = $categoryTitles[$group.Name]
            if (-not $title) { $title = "Section: $($group.Name)" }

            $md += "`n## $title`n`n"

            foreach ($s in $group.Group) {
                $caption = $s.Name -replace '-', ' ' -replace '_', ' '
                $caption = (Get-Culture).TextInfo.ToTitleCase($caption.ToLower())
                $imgPath = $s.RelativePath -replace '\\', '/'
                $md += "### $caption`n`n"
                $md += "![$caption]($imgPath)`n`n"
            }
        }
    } else {
        $md += @"

> **หมายเหตุ**: ยังไม่มี screenshots จาก E2E tests
> กรุณารัน `npx playwright test` ก่อนเพื่อสร้าง screenshots

"@
    }

    # Add appendix
    $md += @"

---

## ภาคผนวก

### ข้อกำหนดระบบ

| รายการ | ข้อกำหนด |
|--------|----------|
| เว็บบราวเซอร์ | Chrome 120+, Edge 120+, Firefox 120+ |
| ความเร็วอินเทอร์เน็ต | ≥ 2 Mbps (สำหรับวิดีโอคอล) |
| กล้องและไมค์ | จำเป็นสำหรับห้องตรวจออนไลน์ |
| ระบบปฏิบัติการ | Windows 10+, macOS 12+, Ubuntu 20.04+ |

### การรับรองความปลอดภัย

- การเข้ารหัสข้อมูล: TLS 1.3
- การจัดเก็บข้อมูลผู้ป่วย: ตาม PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)
- การยืนยันตัวตน: JWT Token + bcrypt password hashing
- ระบบ OWASP: ป้องกัน XSS, CSRF, SQL Injection

### ติดต่อสอบถาม

- อีเมล: support@izara-telemed.com
- โทร: 02-XXX-XXXX
- Line: @izara-telemed

"@

    return $md
}

# ── Main ─────────────────────────────────────────────────────────────
Write-Host "`n═══ Generating IZARA User Guide ═══" -ForegroundColor Cyan

$screenshots = @()
if ($IncludeScreenshots -and (Test-Path $snapshotDir)) {
    $screenshots = Get-Screenshots -Dir $snapshotDir
    Write-Host "  Found $($screenshots.Count) screenshots in $snapshotDir" -ForegroundColor Gray
} else {
    Write-Host "  No screenshots directory found (run E2E tests first)" -ForegroundColor Yellow
}

# Generate markdown
$markdownContent = Generate-GuideMarkdown -screenshots $screenshots
Set-Content -Path $guideMarkdown -Value $markdownContent -Encoding UTF8
Write-Host "  Generated: $guideMarkdown" -ForegroundColor Green

# Determine formats
$formats = if ($Format -eq 'all') { @('docx', 'pdf') } else { @($Format) }
$generated = @()

foreach ($fmt in $formats) {
    $outFile = Join-Path $outputDir "IZARA_User_Guide.$fmt"
    Write-Host "`n  Converting to $($fmt.ToUpper())..." -ForegroundColor Yellow

    $pandocArgs = @(
        $guideMarkdown
        '-o', $outFile
        '--metadata', 'title=IZARA Telemedicine User Guide'
        '--metadata', 'author=IZARA Telemedicine Team'
        '--metadata', "date=$(Get-Date -Format 'yyyy-MM-dd')"
        '--toc'
        '--toc-depth=3'
        '-s'
        '--resource-path', "$workspace"
    )

    if ($fmt -eq 'pdf') {
        $xelatex = Get-Command xelatex -ErrorAction SilentlyContinue
        $wkhtml = Get-Command wkhtmltopdf -ErrorAction SilentlyContinue
        if ($xelatex) {
            $pandocArgs += '--pdf-engine=xelatex'
            $pandocArgs += '-V', 'mainfont=TH Sarabun New'
            $pandocArgs += '-V', 'geometry:margin=2.5cm'
        } elseif ($wkhtml) {
            $pandocArgs += '--pdf-engine=wkhtmltopdf'
            $pandocArgs += '--pdf-engine-opt=--enable-local-file-access'
        } else {
            Write-Host "  No PDF engine found. Skipping PDF (install MiKTeX or wkhtmltopdf)" -ForegroundColor Yellow
            continue
        }
    }

    try {
        $result = & pandoc @pandocArgs 2>&1
        $result | ForEach-Object {
            if ($_ -match 'WARNING') { Write-Host "  $_" -ForegroundColor DarkYellow }
        }
        if (Test-Path $outFile) {
            $sizeKB = [math]::Round((Get-Item $outFile).Length / 1024, 1)
            Write-Host "  ✅ $outFile ($sizeKB KB)" -ForegroundColor Green
            $generated += $outFile
        } else {
            Write-Host "  ❌ Output file not created" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n═══ User Guide Generation Complete ═══" -ForegroundColor Cyan
Write-Host "  Generated $($generated.Count) files:" -ForegroundColor Gray
foreach ($f in $generated) {
    Write-Host "    - $f" -ForegroundColor Gray
}
Write-Host ""
