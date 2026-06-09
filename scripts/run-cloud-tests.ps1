#!/usr/bin/env pwsh
<#
  Run Playwright cloud suite. Loads `.env` read-only into session; sets dev-testing URLs when unset.
#>
param(
    [switch]$Headed,
    [switch]$Headless,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PlaywrightArgs
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { return }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        if (-not (Test-Path -LiteralPath "Env:$key")) {
            Set-Item -Path "Env:$key" -Value $val
        }
    }
}

if (-not $env:CLOUD_PATIENT_URL) {
    $env:CLOUD_PATIENT_URL = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
}
if (-not $env:CLOUD_DOCTOR_URL) {
    $env:CLOUD_DOCTOR_URL = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
}
if (-not $env:CLOUD_MEETING_URL) {
    $env:CLOUD_MEETING_URL = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app"
}

$env:TEST_ENV = "cloud"
if (-not $env:CLOUD_PATIENT_URL) {
    $env:CLOUD_PATIENT_URL = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
}
if (-not $env:CLOUD_DOCTOR_URL) {
    $env:CLOUD_DOCTOR_URL = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
}
if (-not $env:CLOUD_MEETING_URL) {
    $env:CLOUD_MEETING_URL = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app"
}
$env:PATIENT_URL = $env:CLOUD_PATIENT_URL
$env:DOCTOR_URL = $env:CLOUD_DOCTOR_URL
$env:MEETING_URL = $env:CLOUD_MEETING_URL
# CLI --headed / -Headed wins over .env PW_HEADLESS (user must see browsers for debug)
$cliHeaded = $Headed -or ($PlaywrightArgs -contains '--headed')
$cliHeadless = $Headless -or ($PlaywrightArgs -contains '--headless')

if ($cliHeadless -and -not $cliHeaded) {
    $env:PW_HEADLESS = '1'
    $env:PW_HEADED = '0'
    $PlaywrightArgs = @($PlaywrightArgs | Where-Object { $_ -ne '--headed' })
    Write-Host 'HEADLESS MODE (no visible browsers)' -ForegroundColor Yellow
} else {
    $env:PW_HEADED = '1'
    $env:PW_NO_CHROME = '1'
    Remove-Item Env:PW_HEADLESS -ErrorAction SilentlyContinue
    if ($PlaywrightArgs -notcontains '--headed') {
        $PlaywrightArgs = @('--headed') + $PlaywrightArgs
    }
    if ($PlaywrightArgs -notcontains '--workers') {
        $PlaywrightArgs = @('--workers', '1') + $PlaywrightArgs
    }
    Write-Host 'HEADED MODE: Patient (Firefox) + Doctor (Edge) + Admin (Firefox) — no Google Chrome' -ForegroundColor Green
}

if (-not $env:GEMINI_API_KEY -and -not $env:CLOUD_GEMINI_API_KEY) {
    Write-Host "ERROR: GEMINI_API_KEY (or CLOUD_GEMINI_API_KEY) is required for cloud gate (Group Q02)." -ForegroundColor Red
    exit 1
}

Write-Host "TEST_ENV=cloud  PW_HEADED=$($env:PW_HEADED)" -ForegroundColor Cyan
Write-Host "Patient: $($env:CLOUD_PATIENT_URL)" -ForegroundColor Cyan
Write-Host "Doctor:  $($env:CLOUD_DOCTOR_URL)" -ForegroundColor Cyan
Write-Host "Meeting: $($env:CLOUD_MEETING_URL)" -ForegroundColor Cyan

npx playwright test @PlaywrightArgs
exit $LASTEXITCODE
