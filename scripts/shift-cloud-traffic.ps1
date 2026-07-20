#!/usr/bin/env pwsh
<#
  Shift 100% Cloud Run traffic to the latest revision for dev-testing app services.
  Prevents gate failures when new builds do not auto-receive traffic.
#>
$ErrorActionPreference = "Stop"
$REGION = "asia-southeast1"
$PROJECT = "izara-telemedicine"

function Shift-LatestTraffic {
    param([string]$ServiceName)
    $revs = gcloud run revisions list `
        --service=$ServiceName `
        --region=$REGION `
        --project=$PROJECT `
        --sort-by="~metadata.creationTimestamp" `
        --limit=1 `
        --format="value(metadata.name)" 2>$null
    if (-not $revs) {
        Write-Warning "No revisions found for $ServiceName"
        return
    }
    $latest = $revs.Trim()
    Write-Host "Shifting $ServiceName traffic to $latest (100%)" -ForegroundColor Cyan
    gcloud run services update-traffic $ServiceName `
        --region=$REGION `
        --project=$PROJECT `
        --to-revisions="${latest}=100" `
        --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Traffic shift failed for $ServiceName"
        exit 1
    }
}

Shift-LatestTraffic "izara-doctor-portal-dev-testing"
Shift-LatestTraffic "izara-patient-portal-dev-testing"
Shift-LatestTraffic "izara-meeting-server-dev-testing"
Write-Host "Traffic shift complete." -ForegroundColor Green
