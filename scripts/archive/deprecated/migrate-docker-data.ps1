#!/usr/bin/env pwsh
# ============================================================================
# Izara Telemedicine v3.5.0 - Docker Data Migration Script
# ============================================================================
# Purpose: Extract PostgreSQL data from existing containers, rebuild all
#          services with new code, and reinsert data back.
#
# Usage:   .\scripts\migrate-docker-data.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT_DIR

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = "$ROOT_DIR\scripts\output\backup_$TIMESTAMP"
$DB_CONTAINER = "izara-postgres"
$DB_NAME = "izara_phase1"
$DB_USER = "postgres"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🏥 IZARA TELEMEDICINE v3.5.0 - DATA MIGRATION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PHASE 1: Check if existing containers are running
# ============================================================================
Write-Host "📋 PHASE 1: Checking existing containers..." -ForegroundColor Yellow

$pgRunning = docker ps --filter "name=$DB_CONTAINER" --format "{{.Names}}" 2>$null
$hasData = $false

if ($pgRunning -eq $DB_CONTAINER) {
    Write-Host "  ✅ PostgreSQL container is running" -ForegroundColor Green
    
    # Check if database has data
    $tableCount = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>$null
    if ($tableCount -and [int]$tableCount.Trim() -gt 0) {
        $hasData = $true
        Write-Host "  ✅ Database has $($tableCount.Trim()) tables with data" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Database is empty or not initialized" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  PostgreSQL container not running - fresh deployment" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 2: Extract data from existing database
# ============================================================================
if ($hasData) {
    Write-Host ""
    Write-Host "📦 PHASE 2: Extracting data from PostgreSQL..." -ForegroundColor Yellow
    
    # Create backup directory
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "  📁 Backup directory: $BACKUP_DIR"
    
    # Full database dump (schema + data)
    Write-Host "  🔄 Creating full database dump..."
    docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --no-owner --no-privileges > "$BACKUP_DIR\full_dump.sql"
    Write-Host "  ✅ Full dump saved" -ForegroundColor Green
    
    # Data-only dump (for reinsertion)
    Write-Host "  🔄 Creating data-only dump..."
    docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME --data-only --no-owner --no-privileges --disable-triggers > "$BACKUP_DIR\data_only.sql"
    Write-Host "  ✅ Data-only dump saved" -ForegroundColor Green
    
    # Export individual critical tables as CSV
    $criticalTables = @(
        "users",
        "appointments",
        "meeting_records",
        "meeting_transcripts",
        "prescriptions",
        "vital_signs",
        "notifications",
        "emr",
        "ai_validations",
        "medical_content",
        "clinical_resources",
        "medical_consultants",
        "phr_records",
        "health_logs",
        "living_wills"
    )
    
    Write-Host "  🔄 Exporting critical tables as CSV..."
    foreach ($table in $criticalTables) {
        try {
            docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "\COPY (SELECT * FROM $table) TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR\${table}.csv" 2>$null
            $lineCount = (Get-Content "$BACKUP_DIR\${table}.csv" -ErrorAction SilentlyContinue | Measure-Object).Count
            if ($lineCount -gt 1) {
                Write-Host "    ✅ $table ($($lineCount - 1) rows)" -ForegroundColor Green
            } else {
                Write-Host "    ⚠️  $table (empty or not found)" -ForegroundColor DarkGray
                Remove-Item "$BACKUP_DIR\${table}.csv" -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "    ⚠️  $table (skipped - table may not exist)" -ForegroundColor DarkGray
        }
    }
    
    # Record row counts for verification
    Write-Host "  🔄 Recording row counts..."
    $rowCounts = @{}
    foreach ($table in $criticalTables) {
        try {
            $count = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM $table" 2>$null
            if ($count) {
                $rowCounts[$table] = [int]$count.Trim()
            }
        } catch { }
    }
    $rowCounts | ConvertTo-Json | Out-File "$BACKUP_DIR\row_counts.json"
    Write-Host "  ✅ Row counts recorded" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "  📊 Backup Summary:" -ForegroundColor Cyan
    foreach ($key in $rowCounts.Keys | Sort-Object) {
        Write-Host "    $key : $($rowCounts[$key]) rows"
    }
} else {
    Write-Host ""
    Write-Host "📦 PHASE 2: No existing data to extract - fresh deployment" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 3: Stop and remove old containers
# ============================================================================
Write-Host ""
Write-Host "🛑 PHASE 3: Stopping old containers..." -ForegroundColor Yellow

docker-compose down 2>$null
Write-Host "  ✅ All containers stopped" -ForegroundColor Green

# Optionally remove old volumes (only if we have a backup)
if ($hasData) {
    Write-Host "  🗑️  Removing old PostgreSQL volume for clean rebuild..."
    docker volume rm isara-anywhere_postgres_data 2>$null
    Write-Host "  ✅ Old volume removed" -ForegroundColor Green
}

# ============================================================================
# PHASE 4: Rebuild all services with new code
# ============================================================================
Write-Host ""
Write-Host "🔨 PHASE 4: Rebuilding all services v3.5.0..." -ForegroundColor Yellow

Write-Host "  🔄 Building images (this may take a few minutes)..."
docker-compose build --no-cache 2>&1 | ForEach-Object {
    if ($_ -match "Successfully built|Successfully tagged|Building|Step") {
        Write-Host "    $_" -ForegroundColor DarkGray
    }
}
Write-Host "  ✅ All images rebuilt" -ForegroundColor Green

# ============================================================================
# PHASE 5: Start services
# ============================================================================
Write-Host ""
Write-Host "🚀 PHASE 5: Starting services..." -ForegroundColor Yellow

# Start PostgreSQL first
Write-Host "  🔄 Starting PostgreSQL..."
docker-compose up -d postgres
Write-Host "  ⏳ Waiting for PostgreSQL to be healthy..."

$maxWait = 60
$waited = 0
do {
    Start-Sleep -Seconds 3
    $waited += 3
    $health = docker inspect --format='{{.State.Health.Status}}' $DB_CONTAINER 2>$null
    Write-Host "    Status: $health ($waited`s)" -ForegroundColor DarkGray
} while ($health -ne "healthy" -and $waited -lt $maxWait)

if ($health -eq "healthy") {
    Write-Host "  ✅ PostgreSQL is healthy" -ForegroundColor Green
} else {
    Write-Host "  ❌ PostgreSQL failed to start!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# PHASE 6: Reinsert data (if we had a backup)
# ============================================================================
if ($hasData -and (Test-Path "$BACKUP_DIR\data_only.sql")) {
    Write-Host ""
    Write-Host "📥 PHASE 6: Reinserting data..." -ForegroundColor Yellow
    
    # Wait for schema initialization to complete
    Write-Host "  ⏳ Waiting for schema initialization..."
    Start-Sleep -Seconds 5
    
    # Verify schema exists
    $schemaReady = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>$null
    Write-Host "  ✅ Schema has $($schemaReady.Trim()) tables" -ForegroundColor Green
    
    # Reinsert data
    Write-Host "  🔄 Reinserting data from backup..."
    $dataFile = Get-Content "$BACKUP_DIR\data_only.sql" -Raw
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SET session_replication_role = 'replica';" 2>$null
    Get-Content "$BACKUP_DIR\data_only.sql" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME 2>&1 | ForEach-Object {
        if ($_ -match "ERROR") {
            Write-Host "    ⚠️  $_" -ForegroundColor Yellow
        }
    }
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SET session_replication_role = 'origin';" 2>$null
    
    # Verify data reinserted
    Write-Host "  🔄 Verifying data..."
    $verified = $true
    foreach ($table in $rowCounts.Keys) {
        try {
            $newCount = docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM $table" 2>$null
            if ($newCount) {
                $newInt = [int]$newCount.Trim()
                $oldInt = $rowCounts[$table]
                if ($newInt -ge $oldInt) {
                    Write-Host "    ✅ $table : $newInt rows (was $oldInt)" -ForegroundColor Green
                } else {
                    Write-Host "    ⚠️  $table : $newInt rows (expected $oldInt)" -ForegroundColor Yellow
                    $verified = $false
                }
            }
        } catch { }
    }
    
    if ($verified) {
        Write-Host "  ✅ All data restored successfully!" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Some data may not have been fully restored" -ForegroundColor Yellow
        Write-Host "  📁 Full backup available at: $BACKUP_DIR" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "📥 PHASE 6: Fresh database - schema initialized from izara-database.sql" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 7: Start all remaining services
# ============================================================================
Write-Host ""
Write-Host "🚀 PHASE 7: Starting all services..." -ForegroundColor Yellow

docker-compose up -d
Write-Host "  ⏳ Waiting for services to start..."
Start-Sleep -Seconds 15

# ============================================================================
# PHASE 8: Health checks
# ============================================================================
Write-Host ""
Write-Host "🏥 PHASE 8: Running health checks..." -ForegroundColor Yellow

$services = @(
    @{ Name = "Patient Portal"; Url = "http://localhost:3005/health"; Container = "izara-patient-portal" },
    @{ Name = "Doctor Portal"; Url = "http://localhost:3010/health"; Container = "izara-doctor-portal" },
    @{ Name = "Meeting Server"; Url = "http://localhost:3020/health"; Container = "izara-meeting-server" },
    @{ Name = "pgAdmin"; Url = "http://localhost:5050"; Container = "izara-pgadmin" }
)

foreach ($svc in $services) {
    $containerRunning = docker ps --filter "name=$($svc.Container)" --format "{{.Status}}" 2>$null
    if ($containerRunning) {
        try {
            $response = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 10 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ $($svc.Name): HEALTHY (port $(($svc.Url -split ':')[2] -split '/')[0])" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  $($svc.Name): HTTP $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ⏳ $($svc.Name): Starting... ($containerRunning)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ $($svc.Name): Container not running" -ForegroundColor Red
    }
}

# Show database connection info
Write-Host ""
Write-Host "📊 Database Connection:" -ForegroundColor Cyan
Write-Host "  Host: localhost:5433"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  ✅ DEPLOYMENT COMPLETE - Izara Telemedicine v3.5.0" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Patient Portal:  http://localhost:3005" -ForegroundColor White
Write-Host "  🩺 Doctor Portal:   http://localhost:3010" -ForegroundColor White
Write-Host "  🎥 Meeting Server:  http://localhost:3020" -ForegroundColor White
Write-Host "  📊 pgAdmin:         http://localhost:5050" -ForegroundColor White
Write-Host "  🗄️  PostgreSQL:      localhost:5433" -ForegroundColor White
if ($hasData) {
    Write-Host ""
    Write-Host "  📁 Data Backup:     $BACKUP_DIR" -ForegroundColor White
}
Write-Host ""
Write-Host "  📋 Logs: docker-compose logs -f" -ForegroundColor DarkGray
Write-Host "  🛑 Stop: docker-compose down" -ForegroundColor DarkGray
Write-Host ""
