# Phase 1 Test Suite
# Comprehensive tests for Izara Telemedicine Platform

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host " Izara Telemedicine - Phase 1 Test Suite" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BaseUrl = "http://localhost"
$PatientPortalPort = 3005      # UI Frontend
$PatientBackendPort = 3004     # API Backend
$DoctorPortalPort = 3010
$DoctorBackendPort = 3011
$PostgresPort = 5432
$PgAdminPort = 5050

# Test Credentials
$TestUsers = @(
    @{
        email = "Somchai.Mankong@gmail.com"
        password = "P@ssw0rd"
        role = "patient"
        description = "Patient with Hypertension"
    },
    @{
        email = "Anan.Khayanrian@gmail.com"
        password = "P@ssw0rd"
        role = "patient"
        description = "Patient with DM + CKD Stage 3b"
    },
    @{
        email = "admin.test@izara.com"
        password = "IzaraAdmin@2024"
        role = "admin"
        description = "Admin user"
    },
    @{
        email = "doctor.test@izara.com"
        password = "IzaraDoctor@2024"
        role = "doctor"
        description = "Doctor user"
    }
)

# Results tracking
$TestResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

function Write-TestResult {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Message = ""
    )
    
    switch ($Status) {
        "PASS" {
            Write-Host "[✓] $TestName" -ForegroundColor Green
            $script:TestResults.Passed++
        }
        "FAIL" {
            Write-Host "[✗] $TestName" -ForegroundColor Red
            if ($Message) { Write-Host "    $Message" -ForegroundColor Yellow }
            $script:TestResults.Failed++
        }
        "SKIP" {
            Write-Host "[○] $TestName (Skipped)" -ForegroundColor Yellow
            if ($Message) { Write-Host "    $Message" -ForegroundColor Gray }
            $script:TestResults.Skipped++
        }
    }
}

function Test-PortOpen {
    param([int]$Port)
    try {
        $connection = New-Object Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = @{},
        [hashtable]$Headers = @{}
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        if ($Method -ne "GET" -and $Body.Count -gt 0) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

Write-Host ""
Write-Host "=== Infrastructure Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Docker containers running
Write-Host "Testing Docker containers..." -ForegroundColor White

$containers = docker ps --format "{{.Names}}" 2>$null
if ($containers) {
    $expectedContainers = @("izara-postgres", "izara-pgadmin", "izara-patient-portal", "izara-doctor-portal")
    $runningContainers = $containers -split "`n"
    
    foreach ($container in $expectedContainers) {
        if ($runningContainers -contains $container) {
            Write-TestResult "Container: $container" "PASS"
        } else {
            Write-TestResult "Container: $container" "FAIL" "Container not running"
        }
    }
} else {
    Write-TestResult "Docker containers" "SKIP" "Docker not running or no containers found"
}

# Test 2: Port connectivity
Write-Host ""
Write-Host "Testing port connectivity..." -ForegroundColor White

$ports = @(
    @{ Port = $PostgresPort; Name = "PostgreSQL" },
    @{ Port = $PgAdminPort; Name = "pgAdmin" },
    @{ Port = $PatientPortalPort; Name = "Patient Portal Frontend" },
    @{ Port = $PatientBackendPort; Name = "Patient Portal Backend" },
    @{ Port = $DoctorPortalPort; Name = "Doctor Portal Frontend" },
    @{ Port = $DoctorBackendPort; Name = "Doctor Portal Backend" }
)

foreach ($port in $ports) {
    if (Test-PortOpen -Port $port.Port) {
        Write-TestResult "$($port.Name) (Port $($port.Port))" "PASS"
    } else {
        Write-TestResult "$($port.Name) (Port $($port.Port))" "FAIL" "Port not accessible"
    }
}

Write-Host ""
Write-Host "=== Database Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 3: PostgreSQL connection
$pgConnectionString = "postgresql://postgres:P%40ssw0rd@localhost:$PostgresPort/izara_phase1"

Write-Host "Testing PostgreSQL connection..." -ForegroundColor White

try {
    # Using psql if available
    $psqlTest = & psql $pgConnectionString -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-TestResult "PostgreSQL connection" "PASS"
    } else {
        Write-TestResult "PostgreSQL connection" "FAIL" "Connection failed"
    }
} catch {
    Write-TestResult "PostgreSQL connection" "SKIP" "psql not installed"
}

# Test 4: Database tables exist
Write-Host "Testing database tables..." -ForegroundColor White

$tables = @("users", "phr", "vital_signs", "appointments", "emr", "prescriptions", "knowledge_base", "ai_chat_history")

foreach ($table in $tables) {
    try {
        $result = & psql $pgConnectionString -c "SELECT 1 FROM $table LIMIT 1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-TestResult "Table: $table" "PASS"
        } else {
            Write-TestResult "Table: $table" "FAIL" "Table not found"
        }
    } catch {
        Write-TestResult "Table: $table" "SKIP" "psql not available"
    }
}

Write-Host ""
Write-Host "=== API Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 5: Health endpoints
Write-Host "Testing health endpoints..." -ForegroundColor White

$healthEndpoints = @(
    @{ Url = "${BaseUrl}:${PatientBackendPort}/health"; Name = "Patient Backend Health" },
    @{ Url = "${BaseUrl}:${DoctorBackendPort}/health"; Name = "Doctor Backend Health" }
)

foreach ($endpoint in $healthEndpoints) {
    $result = Test-ApiEndpoint -Url $endpoint.Url
    if ($result.Success) {
        Write-TestResult $endpoint.Name "PASS"
    } else {
        Write-TestResult $endpoint.Name "FAIL" $result.Error
    }
}

# Test 6: Authentication
Write-Host ""
Write-Host "Testing authentication..." -ForegroundColor White

foreach ($user in $TestUsers) {
    $loginResult = Test-ApiEndpoint -Url "${BaseUrl}:${DoctorBackendPort}/api/auth/login" -Method "POST" -Body @{
        email = $user.email
        password = $user.password
    }
    
    if ($loginResult.Success -and $loginResult.Data.token) {
        Write-TestResult "Login: $($user.email)" "PASS"
        
        # Store token for further tests
        $user.token = $loginResult.Data.token
    } else {
        Write-TestResult "Login: $($user.email)" "FAIL" $loginResult.Error
    }
}

# Test 7: AI Endpoints
Write-Host ""
Write-Host "Testing AI endpoints..." -ForegroundColor White

$doctorToken = ($TestUsers | Where-Object { $_.role -eq "doctor" }).token

if ($doctorToken) {
    $aiEndpoints = @(
        @{ 
            Url = "${BaseUrl}:${DoctorBackendPort}/api/ai/pre-summary/PATIENT-SOMCHAI"
            Name = "Pre-consultation Summary"
            Method = "GET"
        },
        @{ 
            Url = "${BaseUrl}:${DoctorBackendPort}/api/ai/cds/PATIENT-ANAN"
            Name = "CDS Recommendations (DM+CKD patient)"
            Method = "GET"
        },
        @{ 
            Url = "${BaseUrl}:${DoctorBackendPort}/api/ai/knowledge-base/search"
            Name = "Knowledge Base Search"
            Method = "POST"
            Body = @{ query = "KDIGO guidelines CKD management" }
        }
    )
    
    $headers = @{ "Authorization" = "Bearer $doctorToken" }
    
    foreach ($endpoint in $aiEndpoints) {
        $params = @{
            Url = $endpoint.Url
            Method = $endpoint.Method
            Headers = $headers
        }
        if ($endpoint.Body) {
            $params.Body = $endpoint.Body
        }
        
        $result = Test-ApiEndpoint @params
        if ($result.Success) {
            Write-TestResult $endpoint.Name "PASS"
        } else {
            Write-TestResult $endpoint.Name "FAIL" $result.Error
        }
    }
} else {
    Write-TestResult "AI Endpoints" "SKIP" "No doctor token available"
}

Write-Host ""
Write-Host "=== Patient Portal Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 8: Patient registration flow
Write-Host "Testing patient flows..." -ForegroundColor White

$patientToken = ($TestUsers | Where-Object { $_.email -eq "Somchai.Mankong@gmail.com" }).token

if ($patientToken) {
    $patientEndpoints = @(
        @{ 
            Url = "${BaseUrl}:${PatientBackendPort}/api/patients/profile"
            Name = "Get Patient Profile"
            Method = "GET"
        },
        @{ 
            Url = "${BaseUrl}:${PatientBackendPort}/api/patients/phr"
            Name = "Get Patient PHR"
            Method = "GET"
        },
        @{ 
            Url = "${BaseUrl}:${PatientBackendPort}/api/appointments"
            Name = "Get Patient Appointments"
            Method = "GET"
        }
    )
    
    $headers = @{ "Authorization" = "Bearer $patientToken" }
    
    foreach ($endpoint in $patientEndpoints) {
        $result = Test-ApiEndpoint -Url $endpoint.Url -Method $endpoint.Method -Headers $headers
        if ($result.Success) {
            Write-TestResult $endpoint.Name "PASS"
        } else {
            Write-TestResult $endpoint.Name "FAIL" $result.Error
        }
    }
} else {
    Write-TestResult "Patient Portal flows" "SKIP" "No patient token available"
}

Write-Host ""
Write-Host "=== Doctor Portal Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 9: Doctor portal flows
Write-Host "Testing doctor flows..." -ForegroundColor White

if ($doctorToken) {
    $doctorEndpoints = @(
        @{ 
            Url = "${BaseUrl}:${DoctorBackendPort}/api/doctors/dashboard"
            Name = "Doctor Dashboard"
            Method = "GET"
        },
        @{ 
            Url = "${BaseUrl}:${DoctorBackendPort}/api/appointments/today"
            Name = "Today's Appointments"
            Method = "GET"
        },
        @{ 
            Url = "${BaseUrl}:${DoctorBackendPort}/api/patients"
            Name = "Patient List"
            Method = "GET"
        }
    )
    
    $headers = @{ "Authorization" = "Bearer $doctorToken" }
    
    foreach ($endpoint in $doctorEndpoints) {
        $result = Test-ApiEndpoint -Url $endpoint.Url -Method $endpoint.Method -Headers $headers
        if ($result.Success) {
            Write-TestResult $endpoint.Name "PASS"
        } else {
            Write-TestResult $endpoint.Name "FAIL" $result.Error
        }
    }
} else {
    Write-TestResult "Doctor Portal flows" "SKIP" "No doctor token available"
}

Write-Host ""
Write-Host "=== CDS Validation Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 10: CDS for complex patient (Anan - DM + CKD)
Write-Host "Testing CDS for complex patient..." -ForegroundColor White

if ($doctorToken) {
    $cdsResult = Test-ApiEndpoint -Url "${BaseUrl}:${DoctorBackendPort}/api/ai/cds/PATIENT-ANAN" -Method "GET" -Headers @{ "Authorization" = "Bearer $doctorToken" }
    
    if ($cdsResult.Success -and $cdsResult.Data.data) {
        $recommendations = $cdsResult.Data.data
        
        # Check for expected CDS alerts
        $hasDoseAdjustment = $recommendations | Where-Object { $_.type -eq "dose_adjustment" }
        $hasContraindication = $recommendations | Where-Object { $_.type -eq "contraindication" }
        
        if ($hasDoseAdjustment) {
            Write-TestResult "CDS: Dose Adjustment Alert" "PASS"
        } else {
            Write-TestResult "CDS: Dose Adjustment Alert" "FAIL" "Expected dose adjustment for CKD patient"
        }
        
        if ($hasContraindication) {
            Write-TestResult "CDS: Contraindication Alert" "PASS"
        } else {
            Write-TestResult "CDS: Contraindication Alert" "SKIP" "No contraindications found (may be expected)"
        }
    } else {
        Write-TestResult "CDS Validation" "FAIL" $cdsResult.Error
    }
} else {
    Write-TestResult "CDS Validation" "SKIP" "No doctor token available"
}

Write-Host ""
Write-Host "=== Man-in-the-Loop Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 11: CDS Decision logging
Write-Host "Testing Man-in-the-Loop decision logging..." -ForegroundColor White

if ($doctorToken) {
    $decisionResult = Test-ApiEndpoint -Url "${BaseUrl}:${DoctorBackendPort}/api/ai/cds/decision" -Method "POST" -Headers @{ 
        "Authorization" = "Bearer $doctorToken"
    } -Body @{
        recommendationId = "test-recommendation-1"
        decision = "accepted"
        notes = "Test decision from automated test"
        patientId = "PATIENT-ANAN"
        doctorId = "DOCTOR-TEST"
    }
    
    if ($decisionResult.Success) {
        Write-TestResult "Man-in-the-Loop: Decision Logging" "PASS"
    } else {
        Write-TestResult "Man-in-the-Loop: Decision Logging" "FAIL" $decisionResult.Error
    }
} else {
    Write-TestResult "Man-in-the-Loop" "SKIP" "No doctor token available"
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host " Test Summary" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Passed:  $($TestResults.Passed)" -ForegroundColor Green
Write-Host "Failed:  $($TestResults.Failed)" -ForegroundColor Red
Write-Host "Skipped: $($TestResults.Skipped)" -ForegroundColor Yellow
Write-Host ""

$totalTests = $TestResults.Passed + $TestResults.Failed + $TestResults.Skipped
$passRate = if ($totalTests -gt 0) { [math]::Round(($TestResults.Passed / $totalTests) * 100, 1) } else { 0 }

Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })
Write-Host ""

# Generate test report
$reportPath = "scripts\test-results\phase1-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$report = @{
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
    summary = $TestResults
    passRate = $passRate
    environment = @{
        patientPortal = "${BaseUrl}:${PatientPortalPort}"
        doctorPortal = "${BaseUrl}:${DoctorPortalPort}"
        database = "PostgreSQL"
    }
}

$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "Test report saved to: $reportPath" -ForegroundColor Gray
