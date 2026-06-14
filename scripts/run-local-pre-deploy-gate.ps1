#!/usr/bin/env pwsh
# v5.2 local pre-deploy gate wrapper (PowerShell) — headed E2E, Gemini-lite
$ErrorActionPreference = "Continue"
Write-Host "`n═══ Izara Local Pre-Deploy Gate v5.2 ═══" -ForegroundColor Cyan
Write-Host "Phase 0: env audit | Phase 1: unit+lint+sonar | Phase 1B: docker+gate0 | Phase 2: headed E2E" -ForegroundColor Gray
$env:PW_SKIP_LIVE_GEMINI = "1"
$env:PW_HEADED = "1"
$env:PW_WORKERS = "1"
Remove-Item Env:PW_HEADLESS -ErrorAction SilentlyContinue
Remove-Item Env:BASELINE_VISUAL -ErrorAction SilentlyContinue
node scripts/run-local-pre-deploy-gate.mjs
exit $LASTEXITCODE
