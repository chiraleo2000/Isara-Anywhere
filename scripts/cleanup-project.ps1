#!/usr/bin/env pwsh
# Remove regenerable caches and stale artifacts. Keeps docs/ and latest testing evidence.
param(
    [switch]$DryRun,
    # Test results, Playwright reports, root *.log, auth cache — does NOT remove node_modules or Postgres data.
    [switch]$ArtifactsOnly
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Remove-PathSafe {
    param([string]$Path, [string]$Label = $Path)
    if (-not (Test-Path $Path)) { return }
    if ($DryRun) {
        Write-Host "[dry-run] Would remove: $Label" -ForegroundColor Yellow
        return
    }
    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
        Write-Host "Removed: $Label" -ForegroundColor Gray
    } catch {
        Write-Host "Skipped: $Label ($($_.Exception.Message))" -ForegroundColor Yellow
    }
}

function Remove-FilesSafe {
    param([string[]]$Files)
    foreach ($f in $Files) {
        if (-not (Test-Path $f)) { continue }
        if ($DryRun) {
            Write-Host "[dry-run] Would remove: $f" -ForegroundColor Yellow
            continue
        }
        try {
            Remove-Item -LiteralPath $f -Force -ErrorAction Stop
            Write-Host "Removed: $f" -ForegroundColor Gray
        } catch {
            Write-Host "Skipped (in use): $f" -ForegroundColor Yellow
        }
    }
}

Write-Host "=== Isara Anywhere project cleanup ===" -ForegroundColor Cyan
if ($DryRun) { Write-Host "(dry-run: no files deleted)" -ForegroundColor Yellow }

# --- Regenerable Playwright / test caches (see .gitignore) ---
$cacheDirs = @(
    "test-results",
    "playwright-report",
    "blob-report",
    "test-logs",
    "coverage",
    ".cache",
    "tests\e2e\test-results",
    "tests\e2e\playwright-report",
    "tests\e2e\cloud-test-snapshots",
    "tests\unit\coverage",
    "tests\unit\node_modules\.vite",
    "tests\unit\node_modules\.cache"
)
foreach ($d in $cacheDirs) {
    Remove-PathSafe -Path (Join-Path $root $d) -Label $d
}
# Ephemeral Playwright screenshot dumps (canonical PNGs live under docs/screenshots)
$outSs = Join-Path $root "tests\output\screenshots"
if (Test-Path $outSs) {
    Get-ChildItem $outSs -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-PathSafe -Path $_.FullName -Label "tests\output\screenshots\$($_.Name)"
    }
    Get-ChildItem $outSs -Filter "*.png" -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-FilesSafe @($_.FullName)
    }
}
Remove-FilesSafe @(
    (Join-Path $root "tests\e2e\.auth-cache.json")
)
# Root Tee-Object / gate run logs from full-coverage sessions
Get-ChildItem $root -Filter "*.log" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}

$authStates = Join-Path $root "tests\e2e\.auth-states"
if (Test-Path $authStates) {
    Get-ChildItem $authStates -File -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-FilesSafe @($_.FullName)
    }
}

# --- Docs: editor temp, draw.io autosave, Office locks, build intermediates ---
$docJunk = @()
$docRoots = @(
    (Join-Path $root "Documents\docs"),
    (Join-Path $root "Documents\Presentations")
)
foreach ($docRoot in $docRoots) {
    if (-not (Test-Path $docRoot)) { continue }
    $docJunk += Get-ChildItem -Path $docRoot -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Name -match '^\.\$' -or
        $_.Name -like '~$*' -or
        $_.Extension -in '.bkp', '.dtmp', '.building' -or
        $_.Name -match '_BUILD\.(docx|pptx)$'
    } |
    Select-Object -ExpandProperty FullName
}
Remove-FilesSafe $docJunk

Write-Host "--- Guide intermediates (guides:cleanup-old) ---" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host "[dry-run] Would run: npm run guides:cleanup-old" -ForegroundColor Yellow
} else {
    & npm run guides:cleanup-old 2>&1 | ForEach-Object { Write-Host $_ }
}

# --- Python cache under scripts/ only (not node_modules) ---
$pyCache = Join-Path $root "scripts\__pycache__"
Remove-PathSafe -Path $pyCache -Label "scripts\__pycache__"

# --- Stale report runs: keep newest timestamped JSON per folder; *-latest.json untouched ---
function Prune-TimestampedJson {
    param(
        [string]$Dir,
        [string]$Prefix,
        [int]$Keep = 1
    )
    if (-not (Test-Path $Dir)) { return }
    $parsed = Get-ChildItem $Dir -Filter "${Prefix}-*.json" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch '-latest\.json$' } |
        ForEach-Object {
            if ($_.BaseName -match "${Prefix}-(\d+)$") {
                [PSCustomObject]@{ Path = $_.FullName; Ts = [int64]$Matches[1] }
            }
        }
    if (-not $parsed) { return }
    $toDrop = $parsed | Sort-Object Ts -Descending | Select-Object -Skip $Keep
    foreach ($item in $toDrop) {
        Remove-FilesSafe @($item.Path)
    }
}

$pruneDirs = @(
    @{ Path = "reports\round2-chaos"; Prefix = "round2" },
    @{ Path = "reports\round3-stability"; Prefix = "round3" },
    @{ Path = "reports\code-breaker"; Prefix = "code-breaker" },
    @{ Path = "reports\cycle2-live"; Prefix = "cycle2" }
)
foreach ($p in $pruneDirs) {
    Prune-TimestampedJson -Dir (Join-Path $root $p.Path) -Prefix $p.Prefix -Keep 1
}

$pmDir = Join-Path $root "reports\post-meeting-pipeline"
$pmOld = Join-Path $pmDir "round-1-report.json"
if (Test-Path (Join-Path $pmDir "round-2-report.json")) {
    Remove-FilesSafe @($pmOld)
}

# cloud-error-ledger: keep *-latest.json only
$ledger = Join-Path $root "reports\cloud-error-ledger"
if (Test-Path $ledger) {
    Get-ChildItem $ledger -Filter "round-*-20*.json" -File -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-FilesSafe @($_.FullName)
    }
}

# Temp meeting artifacts and one-off dated UI snapshots
Remove-PathSafe -Path (Join-Path $root "reports\cycle2-tmp") -Label "reports\cycle2-tmp"
$datedShowup = Join-Path $root "reports\cloud-unit-gate\ui-showup\20260527-2338"
Remove-PathSafe -Path $datedShowup -Label "reports\cloud-unit-gate\ui-showup\20260527-2338 (dated snapshot)"

# Old rev extract superseded by cloud-unit-gate / defect-fix
Remove-PathSafe -Path (Join-Path $root "reports\doctor-rev104-extract") -Label "reports\doctor-rev104-extract"

# cloud-unit-gate: duplicate UI PNGs (canonical copies live under docs/screenshots + docs/screenshots)
Remove-PathSafe -Path (Join-Path $root "reports\cloud-unit-gate\ui-showup") -Label "reports\cloud-unit-gate\ui-showup"
# cloud-unit-gate: old run logs (regenerated by gate if needed)
Get-ChildItem (Join-Path $root "reports\cloud-unit-gate") -Filter "*.log" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}

# Stale diagnostic report folders (regenerated by gate scripts if needed)
$staleReportDirs = @(
    "reports\round2-chaos",
    "reports\round3-stability",
    "reports\code-breaker",
    "reports\cycle2-live",
    "reports\triple-verification",
    "reports\forensic-gate",
    "reports\post-meeting-pipeline"
)
foreach ($d in $staleReportDirs) {
    Remove-PathSafe -Path (Join-Path $root $d) -Label $d
}

# scripts/output: old DB dumps and migration artifacts (keep startup-data + local-db-export)
$outputDir = Join-Path $root "scripts\output"
if (Test-Path $outputDir) {
    Get-ChildItem $outputDir -Directory -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match '^backup_' -or $_.Name -match '^izara-'
    } | ForEach-Object {
        Remove-PathSafe -Path $_.FullName -Label "scripts\output\$($_.Name)"
    }
    Get-ChildItem $outputDir -File -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match '^backup_' -or $_.Name -like 'izara-*.zip' -or $_.Name -like 'izara-*.sql'
    } | ForEach-Object {
        Remove-FilesSafe @($_.FullName)
    }
    Remove-FilesSafe @(
        (Join-Path $outputDir "prod-data-export.json"),
        (Join-Path $outputDir "prod-data-export.sql")
    )
}

# Deprecated scripts (superseded by db-tool.cjs, gates/, guides:*)
Remove-PathSafe -Path (Join-Path $root "scripts\archive") -Label "scripts\archive"

# Unpacked Office media cache (not referenced; images live in .pptx)
Remove-PathSafe -Path (Join-Path $root "Documents\Presentations\media") -Label "Documents\Presentations\media"
Remove-PathSafe -Path (Join-Path $root "Presentations\media") -Label "Presentations\media"

Write-Host "--- Screenshot tree consolidation (canonical: docs/screenshots) ---" -ForegroundColor Cyan
# Stale mirror + root duplicate of workflow/SSO PNGs
Remove-PathSafe -Path (Join-Path $root "Documents\docs\screenshots") -Label "Documents\docs\screenshots (use docs/screenshots)"
Remove-PathSafe -Path (Join-Path $root "screenshots") -Label "screenshots/ (use docs/screenshots)"
# Per-browser twins — flat group PNGs are enough; sync regenerates if needed
Get-ChildItem (Join-Path $root "docs\screenshots") -Directory -Recurse -Filter "browsers" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-PathSafe -Path $_.FullName -Label ("docs\screenshots\…\browsers\" + $_.Parent.Name)
}

Write-Host "--- Regenerable guide PDFs + intermediate markdown ---" -ForegroundColor Cyan
Get-ChildItem (Join-Path $root "Documents\docs") -Recurse -Filter "*.pdf" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}
Get-ChildItem (Join-Path $root "Documents\docs\guides") -Recurse -Filter "USER_GUIDE_*_TH.md" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}

Write-Host "--- Root stray artifacts ---" -ForegroundColor Cyan
Remove-FilesSafe @(
    (Join-Path $root "DEFAULT")
)
Get-ChildItem $root -File -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like 'CLOUD_E2E_ERROR_LEDGER_ROUND*.md' -or
    $_.Name -like 'LOCAL_E2E_ERROR_LEDGER_ROUND*.md' -or
    $_.Name -like 'Defect*.pdf' -or
    $_.Name -like 'Isara Anywhere*Prototype*'
} | ForEach-Object { Remove-FilesSafe @($_.FullName) }
Remove-FilesSafe @(
    (Join-Path $root "scripts\_tmp-patch-clinical.mjs"),
    (Join-Path $root "tests\e2e\.workflow-state.json")
)
Remove-PathSafe -Path (Join-Path $root "deploy\jitsi\config") -Label "deploy\jitsi\config (runtime certs/session)"
Remove-PathSafe -Path (Join-Path $root "deploy\jitsi\docker-jitsi-meet") -Label "deploy\jitsi\docker-jitsi-meet (vendor clone)"

Write-Host "--- Gate / E2E run logs & stale ledgers ---" -ForegroundColor Cyan
Remove-PathSafe -Path (Join-Path $root "reports\local-failures") -Label "reports\local-failures"
# All regenerable gate/unit run logs under reports/ (incl. reports/unit/*.log)
Get-ChildItem (Join-Path $root "reports") -Filter "*.log" -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}
# Dated one-off gate text dumps (keep *-latest.json)
Get-ChildItem (Join-Path $root "reports") -Filter "*-20*.txt" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}
Get-ChildItem (Join-Path $root "reports") -Filter "local-unit-gate-*.log" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}
$localLedger = Join-Path $root "reports\local-error-ledger"
if (Test-Path $localLedger) {
    Get-ChildItem $localLedger -Filter "round-*-20*.json" -File -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-FilesSafe @($_.FullName)
    }
}
Get-ChildItem $root -Filter "LOCAL_E2E_ERROR_LEDGER_ROUND*.md" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}
Get-ChildItem $root -Filter "CLOUD_E2E_ERROR_LEDGER_ROUND*.md" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-FilesSafe @($_.FullName)
}
Remove-PathSafe -Path (Join-Path $root "tests\unit\coverage") -Label "tests\unit\coverage"
Remove-FilesSafe @(
    (Join-Path $root "reports\eslint-deep-doctor.txt"),
    (Join-Path $root "reports\eslint-deep-patient.txt"),
    (Join-Path $root "reports\eslint-deep-jitsi.txt")
)

if (-not $ArtifactsOnly) {
    # --- node_modules (gitignored — safe to delete; reinstall with npm install) ---
    Write-Host "--- node_modules ---" -ForegroundColor Cyan
    Get-ChildItem -Path $root -Recurse -Directory -Filter "node_modules" -Force -ErrorAction SilentlyContinue |
        Sort-Object { $_.FullName.Length } -Descending |
        ForEach-Object {
            $label = $_.FullName.Substring($root.Length).TrimStart('\')
            Remove-PathSafe -Path $_.FullName -Label $label
        }

    # --- Live Postgres bind-mount data (gitignored; keeps data/postgres/.gitkeep) ---
    Write-Host "--- data/postgres (platform + standalone) ---" -ForegroundColor Cyan
    $pgDataRoots = @(
        "data\postgres",
        "data\postgres-patient",
        "data\postgres-doctor",
        "data\postgres-meeting",
        "Isara-patient-portal\data\postgres-patient",
        "Isara-doctor-portal\data\postgres-doctor",
        "Izara-jitsi-server\data\postgres-meeting"
    )
    foreach ($pgRel in $pgDataRoots) {
        $pgData = Join-Path $root $pgRel
        if (-not (Test-Path $pgData)) { continue }
        Get-ChildItem -LiteralPath $pgData -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ne '.gitkeep' } |
            ForEach-Object {
                Remove-PathSafe -Path $_.FullName -Label "$pgRel\$($_.Name)"
            }
    }
} else {
    Write-Host "--- ArtifactsOnly: skipped node_modules + data/postgres ---" -ForegroundColor DarkCyan
}

Write-Host ""
Write-Host "Kept: Documents/docs/ (guides docx/pptx + markdown), Processes/, docs/screenshots/ (canonical PNGs), reports/defect-fix/, *-latest.json ledgers, scripts/output/startup-data, scripts/output/local-db-export" -ForegroundColor Green
Write-Host "Regenerate PDFs: npm run guides:pdf (or guides:all)" -ForegroundColor DarkGray
if (-not $ArtifactsOnly) {
    Write-Host "Reinstall deps: npm install (root + each portal + tests/unit)" -ForegroundColor DarkGray
}
if (-not $DryRun) { Write-Host "Done." -ForegroundColor Green }
