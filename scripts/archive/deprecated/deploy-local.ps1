#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════════════
# IZARA TELEMEDICINE — Local Docker Deployment Script v3.5.0
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script:
#   1. Creates .env.docker from template (if not exists)
#   2. Stops any running containers
#   3. Builds and starts all services via docker-compose
#   4. Waits for database initialization
#   5. Runs health checks on all services
#
# Usage:
#   .\scripts\deploy-local.ps1           # Full deploy
#   .\scripts\deploy-local.ps1 -NoBuild  # Skip rebuild
#   .\scripts\deploy-local.ps1 -Down     # Stop all services
#
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$NoBuild,
    [switch]$Down,
    [switch]$Logs,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $ROOT) { $ROOT = (Get-Location).Path }
Set-Location $ROOT

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE — Local Docker Deployment v3.5.0" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ─── Stop services ───
if ($Down) {
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    docker compose down --remove-orphans
    Write-Host "✅ All services stopped." -ForegroundColor Green
    exit 0
}

# ─── Show logs ───
if ($Logs) {
    docker compose logs -f --tail 100
    exit 0
}

# ─── Step 1: Environment file ───
Write-Host "📋 Step 1: Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env.docker")) {
    if (Test-Path ".env.docker.template") {
        Write-Host "   Creating .env.docker from template..." -ForegroundColor White
        Copy-Item ".env.docker.template" ".env.docker"
        Write-Host "   ⚠️  Please edit .env.docker with your API keys before first run!" -ForegroundColor Yellow
        Write-Host "   Required: GEMINI_API_KEY (for AI features)" -ForegroundColor Yellow
        Write-Host "   Optional: GOOGLE_MAPS_API_KEY (for maps)" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️  No .env.docker.template found. Creating minimal .env.docker..." -ForegroundColor Yellow
        @"
# Izara Telemedicine - Docker Environment
POSTGRES_USER=izara_admin
POSTGRES_PASSWORD=IzaraDB2024!
POSTGRES_DB=izara_phase1
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
JWT_SECRET=izara-jwt-secret-2024-docker-local
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
JITSI_DOMAIN=meet.jit.si
PGADMIN_DEFAULT_EMAIL=admin@izara.com
PGADMIN_DEFAULT_PASSWORD=admin123
"@ | Out-File -FilePath ".env.docker" -Encoding utf8
    }
}
Write-Host "   ✅ .env.docker ready" -ForegroundColor Green

# ─── Step 2: Check Docker ───
Write-Host ""
Write-Host "📋 Step 2: Checking Docker..." -ForegroundColor Yellow

$dockerVersion = docker --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Docker is not installed or not running!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ $dockerVersion" -ForegroundColor Green

$composeVersion = docker compose version 2>&1
Write-Host "   ✅ $composeVersion" -ForegroundColor Green

# ─── Step 3: Stop existing containers ───
Write-Host ""
Write-Host "📋 Step 3: Stopping existing containers..." -ForegroundColor Yellow
docker compose down --remove-orphans 2>$null
Write-Host "   ✅ Clean slate" -ForegroundColor Green

# ─── Step 4: Build and start ───
Write-Host ""
Write-Host "📋 Step 4: Building and starting services..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Services:" -ForegroundColor White
Write-Host "   • PostgreSQL + pgvector  (port 5433)" -ForegroundColor White
Write-Host "   • pgAdmin               (port 5050)" -ForegroundColor White
Write-Host "   • Patient Portal         (port 3005)" -ForegroundColor White
Write-Host "   • Doctor Portal          (port 3010)" -ForegroundColor White
Write-Host "   • Meeting Server         (port 3020)" -ForegroundColor White
Write-Host ""

if ($NoBuild) {
    docker compose up -d
} else {
    docker compose up -d --build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Docker Compose failed!" -ForegroundColor Red
    Write-Host "   Run 'docker compose logs' to see errors." -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ All containers started" -ForegroundColor Green

# ─── Step 5: Wait for database ───
Write-Host ""
Write-Host "📋 Step 5: Waiting for database initialization..." -ForegroundColor Yellow

$maxRetries = 30
$retryCount = 0
$dbReady = $false

while (-not $dbReady -and $retryCount -lt $maxRetries) {
    $retryCount++
    try {
        $result = docker compose exec -T postgres pg_isready -U izara_admin -d izara_phase1 2>&1
        if ($result -match "accepting connections") {
            $dbReady = $true
        }
    } catch { }
    
    if (-not $dbReady) {
        Write-Host "   ⏳ Waiting for PostgreSQL... ($retryCount/$maxRetries)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if ($dbReady) {
    Write-Host "   ✅ PostgreSQL is ready" -ForegroundColor Green
    Start-Sleep -Seconds 5  # Extra time for schema initialization
} else {
    Write-Host "   ⚠️  PostgreSQL may not be ready yet" -ForegroundColor Yellow
}

# ─── Step 6: Health checks ───
if (-not $SkipHealthCheck) {
    Write-Host ""
    Write-Host "📋 Step 6: Running health checks..." -ForegroundColor Yellow
    
    $services = @(
        @{ Name = "Patient Portal"; URL = "http://localhost:3005/api/health" },
        @{ Name = "Doctor Portal";  URL = "http://localhost:3010/api/health" },
        @{ Name = "Meeting Server"; URL = "http://localhost:3020/api/health" },
        @{ Name = "Meeting Health"; URL = "http://localhost:3020/health" }
    )
    
    $maxHealthRetries = 20
    
    foreach ($svc in $services) {
        $healthy = $false
        $attempt = 0
        
        while (-not $healthy -and $attempt -lt $maxHealthRetries) {
            $attempt++
            try {
                $response = Invoke-WebRequest -Uri $svc.URL -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $healthy = $true
                }
            } catch { }
            
            if (-not $healthy) {
                Start-Sleep -Seconds 3
            }
        }
        
        if ($healthy) {
            Write-Host "   ✅ $($svc.Name) — healthy" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $($svc.Name) — not responding yet (may still be starting)" -ForegroundColor Yellow
        }
    }
}

# ─── Summary ───
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Patient Portal:  http://localhost:3005" -ForegroundColor White
Write-Host "  🏥 Doctor Portal:   http://localhost:3010" -ForegroundColor White
Write-Host "  📹 Meeting Server:  http://localhost:3020" -ForegroundColor White
Write-Host "  🗄️  pgAdmin:         http://localhost:5050" -ForegroundColor White
Write-Host "  🐘 PostgreSQL:      localhost:5433" -ForegroundColor White
Write-Host ""
Write-Host "  📊 View logs:       docker compose logs -f" -ForegroundColor Gray
Write-Host "  🛑 Stop services:   .\scripts\deploy-local.ps1 -Down" -ForegroundColor Gray
Write-Host "  🧪 Run E2E tests:   npx playwright test tests/e2e/specs/" -ForegroundColor Gray
Write-Host ""
Write-Host "  Technology Stack (Phase 1 — All FREE/Low-cost):" -ForegroundColor Cyan
Write-Host "    Video:         Jitsi Meet (FREE)" -ForegroundColor White
Write-Host "    Transcription: Web Speech API (browser-native, FREE)" -ForegroundColor White
Write-Host "    AI Summary:    Gemini 2.5 Flash Lite (~$0.001/1K tokens)" -ForegroundColor White
Write-Host "    Database:      PostgreSQL + pgvector" -ForegroundColor White
Write-Host ""
