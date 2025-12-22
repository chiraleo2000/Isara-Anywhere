<#
.SYNOPSIS
    IZARA TELEMEDICINE - Project Quick Start Script

.DESCRIPTION
    A guided setup script that walks through the project initialization process.
    This script provides a menu-driven interface for initializing a new project.

.PARAMETER Action
    The action to perform: check, init, seed, clear, test, or all

.EXAMPLE
    .\quickStart.ps1 check    # Check bucket status
    .\quickStart.ps1 init     # Initialize project
    .\quickStart.ps1 seed     # Seed sample data
    .\quickStart.ps1 test     # Run tests
    .\quickStart.ps1 all      # Run full setup

.NOTES
    Version: 1.0.0
    Date: December 2025
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('check', 'init', 'seed', 'clear', 'test', 'all', 'help', '')]
    [string]$Action = ''
)

# Colors
$Host.UI.RawUI.ForegroundColor = "White"

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $($Title.PadRight(58))║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "➡️  $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "📘 $Message" -ForegroundColor Cyan
}

function Show-Menu {
    Write-Header "IZARA TELEMEDICINE - Project Quick Start"
    
    Write-Host "  Available Actions:" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1] check  - Check GCS bucket status" -ForegroundColor White
    Write-Host "  [2] test   - Run initialization tests" -ForegroundColor White
    Write-Host "  [3] init   - Initialize new project" -ForegroundColor White
    Write-Host "  [4] seed   - Seed sample data" -ForegroundColor White
    Write-Host "  [5] clear  - Clear all bucket data (DANGEROUS!)" -ForegroundColor Red
    Write-Host "  [6] all    - Full setup (check → init → seed)" -ForegroundColor White
    Write-Host "  [0] exit   - Exit" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-6 or action name)"
    
    switch ($choice) {
        '1' { return 'check' }
        '2' { return 'test' }
        '3' { return 'init' }
        '4' { return 'seed' }
        '5' { return 'clear' }
        '6' { return 'all' }
        '0' { return 'exit' }
        'exit' { return 'exit' }
        default { return $choice }
    }
}

function Run-BucketCheck {
    Write-Step "Checking GCS bucket status..."
    Write-Host ""
    
    node "$PSScriptRoot\checkBucketStatus.cjs"
    
    return $LASTEXITCODE
}

function Run-Tests {
    Write-Step "Running initialization tests..."
    Write-Host ""
    
    node "$PSScriptRoot\testInitialization.cjs" --verbose
    
    return $LASTEXITCODE
}

function Run-Initialize {
    Write-Step "Initializing project..."
    Write-Host ""
    
    # First check if buckets have data
    $checkResult = Run-BucketCheck
    
    if ($checkResult -ne 0) {
        Write-Host ""
        Write-Error "Cannot initialize - buckets contain data!"
        Write-Info "Run 'clear' first to remove existing data, or use --skip-check (dangerous)"
        return 1
    }
    
    Write-Host ""
    $confirm = Read-Host "Proceed with initialization? (yes/no)"
    
    if ($confirm -eq 'yes' -or $confirm -eq 'y') {
        node "$PSScriptRoot\initializeProject.cjs"
        return $LASTEXITCODE
    } else {
        Write-Info "Initialization cancelled."
        return 0
    }
}

function Run-SeedData {
    Write-Step "Seeding sample data..."
    Write-Host ""
    
    Write-Host "  Select data size:" -ForegroundColor White
    Write-Host "  [1] minimal - 1 doctor, 1 patient" -ForegroundColor White
    Write-Host "  [2] default - 2 doctors, 2 patients" -ForegroundColor White
    Write-Host "  [3] full    - 5 doctors, 3 patients" -ForegroundColor White
    Write-Host ""
    
    $size = Read-Host "Choice (1-3)"
    
    switch ($size) {
        '1' { $sizeArg = '--minimal' }
        '3' { $sizeArg = '--full' }
        default { $sizeArg = '' }
    }
    
    if ($sizeArg) {
        node "$PSScriptRoot\seedSampleData.cjs" $sizeArg
    } else {
        node "$PSScriptRoot\seedSampleData.cjs"
    }
    
    return $LASTEXITCODE
}

function Run-ClearBuckets {
    Write-Header "⚠️  WARNING - DATA DELETION"
    
    Write-Host "  This will DELETE ALL DATA from ALL GCS buckets!" -ForegroundColor Red
    Write-Host "  This action CANNOT be undone!" -ForegroundColor Red
    Write-Host ""
    
    $confirm1 = Read-Host "Type 'DELETE' to confirm"
    
    if ($confirm1 -ne 'DELETE') {
        Write-Info "Cancelled - data preserved."
        return 0
    }
    
    $confirm2 = Read-Host "Are you ABSOLUTELY sure? (yes/no)"
    
    if ($confirm2 -eq 'yes') {
        node "$PSScriptRoot\clearAllBuckets.cjs" --confirm
        return $LASTEXITCODE
    } else {
        Write-Info "Cancelled - data preserved."
        return 0
    }
}

function Run-FullSetup {
    Write-Header "Running Full Project Setup"
    
    # Step 1: Check environment
    Write-Step "Step 1/4: Checking environment..."
    if (-not (Test-Path "$PSScriptRoot\..\..\..\.env")) {
        Write-Info "No .env file found. Please configure before proceeding."
        Write-Info "Copy .env.example to ../../.env and update values."
        return 1
    }
    Write-Success "Environment file found"
    Write-Host ""
    
    # Step 2: Run tests
    Write-Step "Step 2/4: Running tests..."
    $testResult = Run-Tests
    if ($testResult -ne 0) {
        Write-Error "Tests failed. Please fix issues before continuing."
        return 1
    }
    Write-Host ""
    
    # Step 3: Initialize
    Write-Step "Step 3/4: Initializing project..."
    $initResult = Run-Initialize
    if ($initResult -ne 0) {
        Write-Error "Initialization failed."
        return 1
    }
    Write-Host ""
    
    # Step 4: Seed data
    Write-Step "Step 4/4: Seeding sample data..."
    $seedResult = Run-SeedData
    
    # Summary
    Write-Host ""
    Write-Header "Setup Complete!"
    Write-Success "Project has been initialized with sample data."
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "  1. Start Doctor Portal:  cd Isara-doctor-portal && npm run dev" -ForegroundColor Gray
    Write-Host "  2. Start Patient Portal: cd Isara-patient-portal && npm run dev" -ForegroundColor Gray
    Write-Host ""
    
    return 0
}

function Show-Help {
    Write-Header "IZARA TELEMEDICINE - Quick Start Help"
    
    Write-Host "  Usage: .\quickStart.ps1 [action]" -ForegroundColor White
    Write-Host ""
    Write-Host "  Actions:" -ForegroundColor Yellow
    Write-Host "    check  - Check if GCS buckets are empty (safe to init)" -ForegroundColor White
    Write-Host "    test   - Run initialization tests" -ForegroundColor White
    Write-Host "    init   - Initialize new project (creates admin account)" -ForegroundColor White
    Write-Host "    seed   - Seed sample doctors and patients" -ForegroundColor White
    Write-Host "    clear  - Delete all data from buckets (DANGEROUS!)" -ForegroundColor White
    Write-Host "    all    - Run complete setup (check → init → seed)" -ForegroundColor White
    Write-Host "    help   - Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "  Examples:" -ForegroundColor Yellow
    Write-Host "    .\quickStart.ps1 check" -ForegroundColor Gray
    Write-Host "    .\quickStart.ps1 init" -ForegroundColor Gray
    Write-Host "    .\quickStart.ps1 all" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
Write-Host ""
Write-Host "  IZARA TELEMEDICINE - Project Initialization" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Determine action
if (-not $Action) {
    $Action = Show-Menu
}

# Execute action
switch ($Action) {
    'check' { Run-BucketCheck }
    'test' { Run-Tests }
    'init' { Run-Initialize }
    'seed' { Run-SeedData }
    'clear' { Run-ClearBuckets }
    'all' { Run-FullSetup }
    'help' { Show-Help }
    'exit' { Write-Info "Goodbye!"; exit 0 }
    default { 
        Write-Error "Unknown action: $Action"
        Show-Help
        exit 1
    }
}

Write-Host ""
