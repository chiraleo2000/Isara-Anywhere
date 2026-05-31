#!/usr/bin/env pwsh
# Create google-speech-api-key (+ optional gcp-service-account-key) in Secret Manager from repo .env
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$envPath = Join-Path $root '.env'
$project = 'izara-telemedicine'
$sa = '724889190329-compute@developer.gserviceaccount.com'

function Get-EnvValue([string]$key) {
  if (-not (Test-Path $envPath)) { return $null }
  foreach ($line in Get-Content $envPath) {
    if ($line -match "^\s*$([regex]::Escape($key))=(.*)$") {
      $raw = $matches[1].Trim()
      if ($raw.StartsWith('"') -and $raw.EndsWith('"')) { return $raw.Substring(1, $raw.Length - 2) }
      if ($raw.StartsWith("'") -and $raw.EndsWith("'")) { return $raw.Substring(1, $raw.Length - 2) }
      return $raw
    }
  }
  return $null
}

function Ensure-Secret([string]$name, [string]$value) {
  if (-not $value) {
    Write-Host "Skip $name - no value in .env" -ForegroundColor Yellow
    return $false
  }
  $describeOk = $true
  try {
    gcloud secrets describe $name --project=$project 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { $describeOk = $false }
  } catch {
    $describeOk = $false
  }
  if (-not $describeOk) {
    Write-Host "Creating secret $name ..." -ForegroundColor Cyan
    $value | gcloud secrets create $name --project=$project --data-file=-
    if ($LASTEXITCODE -ne 0) { throw "Failed to create secret $name" }
  } else {
    Write-Host "Updating secret $name ..." -ForegroundColor Cyan
    $value | gcloud secrets versions add $name --project=$project --data-file=-
    if ($LASTEXITCODE -ne 0) { throw "Failed to update secret $name" }
  }
  gcloud secrets add-iam-policy-binding $name `
    --project=$project `
    --member="serviceAccount:$sa" `
    --role="roles/secretmanager.secretAccessor" `
    --quiet | Out-Null
  Write-Host "OK $name" -ForegroundColor Green
  return $true
}

$speech = Get-EnvValue 'GOOGLE_SPEECH_API_KEY'
if (-not $speech) { $speech = Get-EnvValue 'VITE_GOOGLE_SPEECH_API_KEY' }
$gcpB64 = Get-EnvValue 'GCP_SERVICE_ACCOUNT_KEY'

$speechOk = Ensure-Secret 'google-speech-api-key' $speech
$gcpOk = Ensure-Secret 'gcp-service-account-key' $gcpB64

if (-not $speechOk -and -not $gcpOk) {
  Write-Error 'No speech credentials in .env - set GOOGLE_SPEECH_API_KEY or GCP_SERVICE_ACCOUNT_KEY'
  exit 1
}

$secrets = @()
if ($speechOk) { $secrets += 'GOOGLE_SPEECH_API_KEY=google-speech-api-key:latest' }
if ($gcpOk) { $secrets += 'GCP_SERVICE_ACCOUNT_KEY=gcp-service-account-key:latest' }
$secretArg = ($secrets -join ',')

Write-Host "Patching Cloud Run services with: $secretArg" -ForegroundColor Cyan
$services = @(
  'izara-meeting-server-dev-testing',
  'izara-doctor-portal-dev-testing'
)
foreach ($svc in $services) {
  if (-not $gcpOk) {
    gcloud run services update $svc `
      --region=asia-southeast1 `
      --project=$project `
      --remove-secrets=GCP_SERVICE_ACCOUNT_KEY `
      --quiet 2>$null | Out-Null
  }
  if ($secrets.Count -eq 0) { continue }
  gcloud run services update $svc `
    --region=asia-southeast1 `
    --project=$project `
    --update-secrets=$secretArg `
    --quiet
  if ($LASTEXITCODE -ne 0) { Write-Warning "Update failed for $svc" }
  else { Write-Host "Deployed secrets to $svc" -ForegroundColor Green }
}

Write-Host ''
Write-Host 'Run: npm run verify:cloud-meeting-ai' -ForegroundColor Green
