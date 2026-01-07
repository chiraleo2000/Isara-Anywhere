# ============================================================================
# IZARA TELEMEDICINE - Local Development Startup Script
# ============================================================================
#
# Starts all local development servers and runs tests
#
# Usage:
#   .\scripts\start-local-dev.ps1              # Start servers only
#   .\scripts\start-local-dev.ps1 -Test        # Start servers and run tests
#   .\scripts\start-local-dev.ps1 -TestOnly    # Run tests only (servers must be running)
#   .\scripts\start-local-dev.ps1 -Kill        # Kill all running servers
#
# Server Ports:
#   Patient Portal Backend:  3004
#   Patient Portal Frontend: 3005
#   Doctor Portal Main API:  3009
#   Doctor Portal Frontend:  3010
#   Doctor Portal Auth:      3011
#   Doctor Portal GCS API:   3012
#
# ============================================================================

param(
    [switch]$Test,
    [switch]$TestOnly,
    [switch]$Kill,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

# Colors for output
function Write-ColorOutput($color, $message) {
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $color
    Write-Output $message
    $host.UI.RawUI.ForegroundColor = $originalColor
}

function Write-Success($message) { Write-ColorOutput Green "✅ $message" }
function Write-Error($message) { Write-ColorOutput Red "❌ $message" }
function Write-Info($message) { Write-ColorOutput Cyan "ℹ️  $message" }
function Write-Warning($message) { Write-ColorOutput Yellow "⚠️  $message" }

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$PatientPortalDir = Join-Path $RootDir "Isara-patient-portal"
$DoctorPortalDir = Join-Path $RootDir "Isara-doctor-portal"
$TestsDir = Join-Path $RootDir "scripts\tests"

if ($Help) {
    Write-Output ""
    Write-Output "IZARA TELEMEDICINE - Local Development Startup Script"
    Write-Output "====================================================="
    Write-Output ""
    Write-Output "Usage:"
    Write-Output "  .\scripts\start-local-dev.ps1              # Start servers only"
    Write-Output "  .\scripts\start-local-dev.ps1 -Test        # Start servers and run tests"
    Write-Output "  .\scripts\start-local-dev.ps1 -TestOnly    # Run tests only"
    Write-Output "  .\scripts\start-local-dev.ps1 -Kill        # Kill all running servers"
    Write-Output ""
    Write-Output "Server Ports:"
    Write-Output "  Patient Portal Backend:  3004"
    Write-Output "  Patient Portal Frontend: 3005"
    Write-Output "  Doctor Portal Main API:  3009"
    Write-Output "  Doctor Portal Frontend:  3010"
    Write-Output "  Doctor Portal Auth:      3011"
    Write-Output "  Doctor Portal GCS API:   3012"
    Write-Output ""
    exit 0
}

function Kill-Servers {
    Write-Info "Stopping all Node.js processes on development ports..."
    
    $ports = @(3004, 3005, 3009, 3010, 3011, 3012)
    
    foreach ($port in $ports) {
        $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                   Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
        
        if ($process) {
            try {
                Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
                Write-Success "Stopped process on port $port"
            } catch {
                Write-Warning "Could not stop process on port $port"
            }
        }
    }
    
    Write-Success "All development servers stopped"
}

function Check-Port($port) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Wait-ForServer($url, $name, $timeout = 60) {
    Write-Info "Waiting for $name to start..."
    $elapsed = 0
    $interval = 2
    
    while ($elapsed -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
                Write-Success "$name is ready"
                return $true
            }
        } catch {
            # Server not ready yet
        }
        
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }
    
    Write-Warning "$name did not start within $timeout seconds"
    return $false
}

function Start-PatientPortal {
    Write-Info "Starting Patient Portal..."
    
    # Check if already running
    if (Check-Port 3004) {
        Write-Warning "Patient Portal backend already running on port 3004"
    } else {
        # Start backend
        $backendJob = Start-Process -FilePath "npm" -ArgumentList "run", "backend" -WorkingDirectory $PatientPortalDir -PassThru -WindowStyle Minimized
        Write-Success "Patient Portal backend starting (PID: $($backendJob.Id))"
    }
    
    if (Check-Port 3005) {
        Write-Warning "Patient Portal frontend already running on port 3005"
    } else {
        # Start frontend
        $frontendJob = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $PatientPortalDir -PassThru -WindowStyle Minimized
        Write-Success "Patient Portal frontend starting (PID: $($frontendJob.Id))"
    }
}

function Start-DoctorPortal {
    Write-Info "Starting Doctor Portal (all 4 servers)..."
    
    # Check if already running
    $portsInUse = @()
    if (Check-Port 3009) { $portsInUse += 3009 }
    if (Check-Port 3010) { $portsInUse += 3010 }
    if (Check-Port 3011) { $portsInUse += 3011 }
    if (Check-Port 3012) { $portsInUse += 3012 }
    
    if ($portsInUse.Count -eq 4) {
        Write-Warning "Doctor Portal already running on all ports"
        return
    }
    
    if ($portsInUse.Count -gt 0) {
        Write-Warning "Some Doctor Portal ports in use: $($portsInUse -join ', ')"
    }
    
    # Start all doctor portal servers using concurrently
    $doctorJob = Start-Process -FilePath "npx" -ArgumentList "concurrently", "`"npm run backend`"", "`"npm run frontend`"" -WorkingDirectory $DoctorPortalDir -PassThru -WindowStyle Minimized
    Write-Success "Doctor Portal servers starting (PID: $($doctorJob.Id))"
}

function Run-LocalTests {
    Write-Info "Running local development tests..."
    
    Set-Location $TestsDir
    
    try {
        $result = & node localDevTests.cjs
        Write-Output $result
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All local tests passed!"
            return $true
        } else {
            Write-Error "Some tests failed. Check output above."
            return $false
        }
    } catch {
        Write-Error "Failed to run tests: $_"
        return $false
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Output ""
Write-Output "╔══════════════════════════════════════════════════════════════╗"
Write-Output "║     IZARA TELEMEDICINE - Local Development Environment       ║"
Write-Output "╚══════════════════════════════════════════════════════════════╝"
Write-Output ""

if ($Kill) {
    Kill-Servers
    exit 0
}

if ($TestOnly) {
    Run-LocalTests
    exit $LASTEXITCODE
}

# Start servers
Write-Info "Starting development servers..."
Write-Output ""

Start-PatientPortal
Start-DoctorPortal

Write-Output ""
Write-Info "Waiting for servers to initialize..."
Start-Sleep -Seconds 10

# Wait for servers to be ready
$patientReady = Wait-ForServer "http://localhost:3004/api/health" "Patient Portal Backend"
$doctorMainReady = Wait-ForServer "http://localhost:3009/health" "Doctor Portal Main API"
$doctorGcsReady = Wait-ForServer "http://localhost:3012/api/health" "Doctor Portal GCS API"
$doctorAuthReady = Wait-ForServer "http://localhost:3011/auth/health" "Doctor Portal Auth"

Write-Output ""

if ($patientReady -and $doctorMainReady -and $doctorGcsReady -and $doctorAuthReady) {
    Write-Success "All servers are ready!"
    Write-Output ""
    Write-Output "Access the portals:"
    Write-Output "  Patient Portal: http://localhost:3005"
    Write-Output "  Doctor Portal:  http://localhost:3010"
    Write-Output ""
    
    if ($Test) {
        Write-Output ""
        Run-LocalTests
    }
} else {
    Write-Warning "Some servers may not be ready. Check the terminal windows."
}

Write-Output ""
Write-Output "To run tests: .\scripts\start-local-dev.ps1 -TestOnly"
Write-Output "To stop all:  .\scripts\start-local-dev.ps1 -Kill"
Write-Output ""
