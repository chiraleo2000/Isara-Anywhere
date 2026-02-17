#!/usr/bin/env pwsh
# ============================================================================
# IZARA TELEMEDICINE — Phase 2 Database Migration for Dev-Testing
# Version: 2.0.0
# ============================================================================
#
# Runs Phase 2 migration SQL against the cloud dev-testing PostgreSQL instance.
# This creates the 8 new tables and inserts Phase 2 seed data.
#
# Usage:
#   .\migrate-dev-phase2.ps1               # Run migration
#   .\migrate-dev-phase2.ps1 -DryRun       # Show what would run without executing
#
# ============================================================================

param(
    [switch]$DryRun
)

$PG_HOST     = "35.240.162.227"
$PG_PORT     = "5432"
$PG_DB       = "izara_phase1"
$PG_USER     = "postgres"
$PG_PASSWORD = "IzaraDb2024"

$ROOT_DIR    = (Resolve-Path "$PSScriptRoot\..\..").Path
$MIGRATION   = "$ROOT_DIR\scripts\database\migrations\v2.0.0-phase2-tables.sql"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  IZARA — Phase 2 Database Migration (Dev-Testing)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Host:      $PG_HOST" -ForegroundColor White
Write-Host "  Database:  $PG_DB" -ForegroundColor White
Write-Host "  Migration: v2.0.0-phase2-tables.sql" -ForegroundColor White
Write-Host ""

if (-not (Test-Path $MIGRATION)) {
    Write-Host "  ❌ Migration file not found: $MIGRATION" -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "  [DRY RUN] Would execute:" -ForegroundColor Yellow
    Write-Host "  psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DB -f $MIGRATION" -ForegroundColor White
    Write-Host ""
    Write-Host "  Migration file contents:" -ForegroundColor Yellow
    Get-Content $MIGRATION | Select-Object -First 30
    Write-Host "  ... (truncated)" -ForegroundColor Gray
    exit 0
}

Write-Host "  ▶ Running Phase 2 migration..." -ForegroundColor Cyan

$env:PGPASSWORD = $PG_PASSWORD

# Try psql first
$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DB -f $MIGRATION
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Phase 2 migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Migration failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
} else {
    # Fallback: use node pg client
    Write-Host "  psql not found. Using Node.js pg client..." -ForegroundColor Yellow
    
    $nodeScript = @"
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
    const client = new Client({
        host: '$PG_HOST',
        port: $PG_PORT,
        database: '$PG_DB',
        user: '$PG_USER',
        password: '$PG_PASSWORD',
        ssl: false
    });
    
    try {
        await client.connect();
        console.log('Connected to database');
        
        const sql = fs.readFileSync('$($MIGRATION -replace '\\', '/')', 'utf8');
        
        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('\\\\'));
        
        for (const stmt of statements) {
            if (stmt.toLowerCase().startsWith('create') || stmt.toLowerCase().startsWith('insert') || stmt.toLowerCase().startsWith('do')) {
                try {
                    await client.query(stmt);
                    console.log('  OK:', stmt.substring(0, 60) + '...');
                } catch (e) {
                    console.log('  SKIP:', e.message.substring(0, 80));
                }
            }
        }
        
        // Verify tables
        const result = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('device_tokens', 'biometric_credentials', 'refresh_tokens', 
                             'push_subscriptions', 'notification_preferences', 'user_api_connections',
                             'api_connection_audit', 'sync_queue', 'user_settings')
            ORDER BY table_name
        `);
        
        console.log('\\nPhase 2 tables found:', result.rows.length);
        result.rows.forEach(r => console.log('  ✅', r.table_name));
        
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
"@
    
    $tempFile = [System.IO.Path]::GetTempFileName() + ".cjs"
    $nodeScript | Out-File -FilePath $tempFile -Encoding utf8
    
    Push-Location $ROOT_DIR
    node $tempFile
    Pop-Location
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Phase 2 migration completed!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Migration failed" -ForegroundColor Red
    }
}

$env:PGPASSWORD = ""

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Phase 2 tables: device_tokens, biometric_credentials," -ForegroundColor White
Write-Host "  refresh_tokens, push_subscriptions, notification_preferences," -ForegroundColor White
Write-Host "  user_api_connections, api_connection_audit, sync_queue," -ForegroundColor White
Write-Host "  user_settings" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
