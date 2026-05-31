#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════════════
# IZARA TELEMEDICINE — Local Docker Deployment Script v4.0.0
# ═══════════════════════════════════════════════════════════════════════════════
#
# Consolidated local deployment script (merges deploy-local.ps1 + migrate-docker-data.ps1)
#
# Modes:
#   Default    - Build and start all Docker services
#   -Migrate   - Backup data → rebuild → restore (safe upgrade)
#   -Down      - Stop all services
#   -Logs      - Follow container logs
#
# Usage:
#   .\scripts\deploy\local.ps1               # Full deploy
#   .\scripts\deploy\local.ps1 -NoBuild      # Skip rebuild
#   .\scripts\deploy\local.ps1 -Down         # Stop all services
#   .\scripts\deploy\local.ps1 -Migrate      # Backup → rebuild → restore
#   .\scripts\deploy\local.ps1 -Logs         # Follow logs
#
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$NoBuild,
    [switch]$Down,
    [switch]$Logs,
    [switch]$Migrate,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Continue"
$ROOT = (Resolve-Path "$PSScriptRoot\..\..").Path
Set-Location $ROOT

$DB_CONTAINER = "izara-postgres"
$DB_NAME = "izara_phase1"
$DB_USER = "postgres"
$BACKUP_DIR = $null

# ─── Helper Functions ─────────────────────────────────────────────────────────

function Write-Banner {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  IZARA TELEMEDICINE — Local Docker Deployment v4.0.0" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Wait-ForPostgres {
    param([int]$MaxRetries = 30)
    $retryCount = 0
    $dbReady = $false
    while (-not $dbReady -and $retryCount -lt $MaxRetries) {
        $retryCount++
        try {
            $result = docker compose exec -T postgres pg_isready -U $DB_USER -d $DB_NAME 2>&1
            if ($result -match "accepting connections") { $dbReady = $true }
        } catch { }
        if (-not $dbReady) {
            Write-Host "   ⏳ Waiting for PostgreSQL... ($retryCount/$MaxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    if ($dbReady) {
        Write-Host "   ✅ PostgreSQL is ready" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "   ⚠️  PostgreSQL may not be ready yet" -ForegroundColor Yellow
    }
    return $dbReady
}

function Test-ServiceHealth {
    param([string]$Name, [string]$URL, [int]$MaxRetries = 20)
    $healthy = $false
    $attempt = 0
    while (-not $healthy -and $attempt -lt $MaxRetries) {
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri $URL -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) { $healthy = $true }
        } catch { }
        if (-not $healthy) { Start-Sleep -Seconds 3 }
    }
    if ($healthy) { Write-Host "   ✅ $Name — healthy" -ForegroundColor Green }
    else { Write-Host "   ⚠️  $Name — not responding yet" -ForegroundColor Yellow }
    return $healthy
}

# ─── Stop Services ────────────────────────────────────────────────────────────

if ($Down) {
    Write-Banner
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    docker compose down --remove-orphans
    Write-Host "✅ All services stopped." -ForegroundColor Green
    exit 0
}

# ─── Show Logs ────────────────────────────────────────────────────────────────

if ($Logs) {
    docker compose logs -f --tail 100
    exit 0
}

Write-Banner

# ═══════════════════════════════════════════════════════════════════════════════
# MIGRATE MODE: Backup → Rebuild → Restore
# ═══════════════════════════════════════════════════════════════════════════════

if ($Migrate) {
    Write-Host "🔄 MIGRATION MODE: Backup → Rebuild → Restore" -ForegroundColor Magenta
    Write-Host ""

    # Phase 1: Check existing data
    Write-Host "📋 Phase 1: Checking existing containers..." -ForegroundColor Yellow
    $pgRunning = docker ps --filter "name=$DB_CONTAINER" --format "{{.Names}}" 2>$null
    $hasData = $false

    if ($pgRunning -eq $DB_CONTAINER) {
        Write-Host "  ✅ PostgreSQL container is running" -ForegroundColor Green
        $tableCount = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>$null
        if ($tableCount -and [int]$tableCount.Trim() -gt 0) {
            $hasData = $true
            Write-Host "  ✅ Database has $($tableCount.Trim()) tables" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Database is empty" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  PostgreSQL not running — will do fresh deployment" -ForegroundColor Yellow
    }

    # Phase 2: Extract data
    if ($hasData) {
        Write-Host ""
        Write-Host "📦 Phase 2: Extracting data..." -ForegroundColor Yellow
        $TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
        $BACKUP_DIR = "$ROOT\scripts\output\backup_$TIMESTAMP"
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null

        docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --no-owner --no-privileges > "$BACKUP_DIR\full_dump.sql"
        docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges --disable-triggers > "$BACKUP_DIR\data_only.sql"
        Write-Host "  ✅ Backup saved to $BACKUP_DIR" -ForegroundColor Green

        # Record row counts
        $rowCounts = @{}
        $criticalTables = @("users", "appointments", "medical_content", "clinical_resources", "emr", "prescriptions", "notifications")
        foreach ($table in $criticalTables) {
            try {
                $count = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM $table" 2>$null
                if ($count) { $rowCounts[$table] = [int]$count.Trim() }
            } catch { }
        }
        $rowCounts | ConvertTo-Json | Out-File "$BACKUP_DIR\row_counts.json"
        foreach ($key in $rowCounts.Keys | Sort-Object) { Write-Host "    $key : $($rowCounts[$key]) rows" }
    }

    # Phase 3: Stop and remove
    Write-Host ""
    Write-Host "🛑 Phase 3: Stopping containers..." -ForegroundColor Yellow
    docker compose down 2>$null
    if ($hasData) {
        docker volume rm isara-anywhere_postgres_data 2>$null
        Write-Host "  ✅ Volume removed for clean rebuild" -ForegroundColor Green
    }

    # Phase 4: Rebuild
    Write-Host ""
    Write-Host "🔨 Phase 4: Rebuilding all services..." -ForegroundColor Yellow
    docker compose build --no-cache 2>&1 | ForEach-Object {
        if ($_ -match "Successfully built|Successfully tagged|Building|Step") {
            Write-Host "    $_" -ForegroundColor DarkGray
        }
    }

    # Phase 5: Start PostgreSQL first
    Write-Host ""
    Write-Host "🚀 Phase 5: Starting PostgreSQL..." -ForegroundColor Yellow
    docker compose up -d postgres
    Wait-ForPostgres -MaxRetries 60

    # Phase 6: Restore data
    if ($hasData -and (Test-Path "$BACKUP_DIR\data_only.sql")) {
        Write-Host ""
        Write-Host "📥 Phase 6: Restoring data..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Get-Content "$BACKUP_DIR\data_only.sql" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME 2>&1 | ForEach-Object {
            if ($_ -match "ERROR") { Write-Host "    ⚠️  $_" -ForegroundColor Yellow }
        }

        # Verify
        $verified = $true
        foreach ($table in $rowCounts.Keys) {
            try {
                $newCount = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM $table" 2>$null
                if ($newCount) {
                    $newInt = [int]$newCount.Trim()
                    $oldInt = $rowCounts[$table]
                    if ($newInt -ge $oldInt) { Write-Host "    ✅ $table : $newInt rows (was $oldInt)" -ForegroundColor Green }
                    else { Write-Host "    ⚠️  $table : $newInt rows (expected $oldInt)" -ForegroundColor Yellow; $verified = $false }
                }
            } catch { }
        }
        if ($verified) { Write-Host "  ✅ All data restored!" -ForegroundColor Green }
        else { Write-Host "  ⚠️  Some data may not be fully restored. Backup: $BACKUP_DIR" -ForegroundColor Yellow }
    }

    # Phase 7: Start remaining services
    Write-Host ""
    Write-Host "🚀 Phase 7: Starting all services..." -ForegroundColor Yellow
    docker compose up -d
    Start-Sleep -Seconds 15

    # Fall through to health checks
}

# ═══════════════════════════════════════════════════════════════════════════════
# NORMAL MODE: Standard deployment
# ═══════════════════════════════════════════════════════════════════════════════

if (-not $Migrate) {
    # Step 1: Environment
    Write-Host "📋 Step 1: Checking environment..." -ForegroundColor Yellow
    if (-not (Test-Path ".env.docker")) {
        if (Test-Path ".env.docker.template") {
            Copy-Item ".env.docker.template" ".env.docker"
            Write-Host "   ⚠️  Created .env.docker from template — edit with your API keys!" -ForegroundColor Yellow
        } else {
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

    # Step 2: Docker check
    Write-Host ""
    Write-Host "📋 Step 2: Checking Docker..." -ForegroundColor Yellow
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Docker is not installed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ $dockerVersion" -ForegroundColor Green

    # Step 3: Stop existing
    Write-Host ""
    Write-Host "📋 Step 3: Stopping existing containers..." -ForegroundColor Yellow
    docker compose down --remove-orphans 2>$null
    Write-Host "   ✅ Clean slate" -ForegroundColor Green

    # Step 4: Build and start
    Write-Host ""
    Write-Host "📋 Step 4: Building and starting services..." -ForegroundColor Yellow
    Write-Host "   • PostgreSQL + pgvector  (port 5433)" -ForegroundColor White
    Write-Host "   • pgAdmin               (port 5050)" -ForegroundColor White
    Write-Host "   • Patient Portal         (port 3005)" -ForegroundColor White
    Write-Host "   • Doctor Portal          (port 3010)" -ForegroundColor White
    Write-Host "   • Meeting Server         (port 3020)" -ForegroundColor White

    if ($NoBuild) { docker compose up -d }
    else { docker compose up -d --build }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Docker Compose failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ All containers started" -ForegroundColor Green

    # Step 5: Wait for DB
    Write-Host ""
    Write-Host "📋 Step 5: Waiting for database..." -ForegroundColor Yellow
    Wait-ForPostgres
}

# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECKS (both modes)
# ═══════════════════════════════════════════════════════════════════════════════

if (-not $SkipHealthCheck) {
    Write-Host ""
    Write-Host "📋 Health checks..." -ForegroundColor Yellow

    $services = @(
        @{ Name = "Patient Portal"; URL = "http://localhost:3005/api/health" },
        @{ Name = "Doctor Portal";  URL = "http://localhost:3010/api/health" },
        @{ Name = "Meeting Server"; URL = "http://localhost:3020/api/health" },
        @{ Name = "Meeting Health"; URL = "http://localhost:3020/health" }
    )

    foreach ($svc in $services) {
        Test-ServiceHealth -Name $svc.Name -URL $svc.URL | Out-Null
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

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
if ($BACKUP_DIR) {
    Write-Host ""
    Write-Host "  📁 Data Backup:     $BACKUP_DIR" -ForegroundColor White
}
Write-Host ""
Write-Host "  📊 View logs:       docker compose logs -f" -ForegroundColor Gray
Write-Host "  🛑 Stop services:   .\scripts\deploy\local.ps1 -Down" -ForegroundColor Gray
Write-Host "  🧪 Run E2E tests:   .\tests\e2e\run-tests.ps1" -ForegroundColor Gray
Write-Host ""
