#!/usr/bin/env pwsh
<#
  Headed cloud UI showup for gate phases (A-auth + S-responsive viewports).
  Screenshots: test-results/pre-debug/ when BASELINE_VISUAL=1
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:TEST_ENV = "cloud"
$env:BASELINE_VISUAL = "1"
$env:PW_HEADED = "1"
$env:PW_WORKERS = "1"
Remove-Item Env:PW_HEADLESS -ErrorAction SilentlyContinue

if (-not $env:CLOUD_PATIENT_URL) {
  $env:CLOUD_PATIENT_URL = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
}
if (-not $env:CLOUD_DOCTOR_URL) {
  $env:CLOUD_DOCTOR_URL = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
}
if (-not $env:CLOUD_MEETING_URL) {
  $env:CLOUD_MEETING_URL = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app"
}

Write-Host "Gate UI showup (headed, cloud) - screenshots -> test-results/pre-debug/" -ForegroundColor Cyan
npx playwright test `
  --project=A-auth `
  --project=S-responsive-mobile `
  --project=S-responsive-tablet `
  --project=S-responsive-desktop `
  --headed `
  --workers=1
exit $LASTEXITCODE
