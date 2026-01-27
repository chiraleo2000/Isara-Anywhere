# =============================================================================
# IZARA TELEMEDICINE - COMPREHENSIVE API TEST SUITE
# =============================================================================
# Version: 2.0.0
# Updated: 2026-01-27
# Purpose: Test all API endpoints for Patient Portal and Doctor Portal
# 
# Usage:
#   .\tests\izara-api-tests.ps1                   # Test local endpoints
#   .\tests\izara-api-tests.ps1 -Target cloud     # Test cloud endpoints
#   .\tests\izara-api-tests.ps1 -Verbose          # Show detailed output
# =============================================================================

param(
    [ValidateSet('local', 'cloud')]
    [string]$Target = 'local',
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

# Configuration
$Config = @{
    local = @{
        PatientUrl = "http://localhost:3005"
        DoctorUrl = "http://localhost:3010"
    }
    cloud = @{
        PatientUrl = "https://izara-patient-portal-6agq6mztaq-as.a.run.app"
        DoctorUrl = "https://izara-doctor-portal-6agq6mztaq-as.a.run.app"
    }
}

$Urls = $Config[$Target]

# Test credentials
$TestUsers = @{
    Patient = @{ Email = "demo.test@gmail.com"; Password = "P@ssw0rd" }
    Patient2 = @{ Email = "Somchai.Mankong@gmail.com"; Password = "P@ssw0rd" }
    Patient3 = @{ Email = "Anan.Khayanrian@gmail.com"; Password = "P@ssw0rd" }
    Doctor = @{ Email = "doctor.test@izara.com"; Password = "IzaraDoctor@2024" }
    Admin = @{ Email = "admin.test@izara.com"; Password = "IzaraAdmin@2024" }
}

# Test results tracking
$Results = @{
    Passed = 0
    Failed = 0
    Total = 0
    Details = @()
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Write-TestHeader($title) {
    Write-Host "`n" -NoNewline
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host " $title" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Write-TestResult($name, $passed, $message = "", $details = $null) {
    $Results.Total++
    if ($passed) {
        $Results.Passed++
        Write-Host "  ✅ PASS: $name" -ForegroundColor Green
        if ($message -and $Verbose) { Write-Host "     $message" -ForegroundColor Gray }
    } else {
        $Results.Failed++
        Write-Host "  ❌ FAIL: $name" -ForegroundColor Red
        if ($message) { Write-Host "     $message" -ForegroundColor Yellow }
    }
    $Results.Details += @{
        Name = $name
        Passed = $passed
        Message = $message
        Details = $details
    }
}

function Get-AuthToken($portal, $email, $password) {
    try {
        $url = if ($portal -eq "patient") { $Urls.PatientUrl } else { $Urls.DoctorUrl }
        $endpoint = if ($portal -eq "patient") { "/api/auth/login" } else { "/auth/login" }
        
        $body = @{ email = $email; password = $password } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$url$endpoint" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
        
        return @{
            Token = $response.token
            User = $response.user
        }
    } catch {
        if ($Verbose) { Write-Host "     Login failed: $_" -ForegroundColor Yellow }
        return $null
    }
}

function Test-Endpoint($url, $method = "GET", $headers = @{}, $body = $null, $expectedStatus = 200) {
    try {
        $params = @{
            Uri = $url
            Method = $method
            Headers = $headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($body) {
            $params.Body = if ($body -is [string]) { $body } else { $body | ConvertTo-Json -Depth 10 }
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Response = $response; Status = 200 }
    } catch {
        $status = if ($_.Exception.Response) { 
            [int]$_.Exception.Response.StatusCode 
        } else { 
            0 
        }
        return @{ Success = ($status -eq $expectedStatus); Response = $null; Status = $status; Error = $_.Exception.Message }
    }
}

# =============================================================================
# SECTION 1: HEALTH CHECKS
# =============================================================================
Write-TestHeader "1. HEALTH CHECKS"

$healthTests = @(
    @{ Name = "Patient Portal Health"; Url = "$($Urls.PatientUrl)/health" },
    @{ Name = "Doctor Portal Health"; Url = "$($Urls.DoctorUrl)/health" }
)

foreach ($test in $healthTests) {
    $result = Test-Endpoint -url $test.Url
    Write-TestResult $test.Name $result.Success "Status: $($result.Status)"
}

# =============================================================================
# SECTION 2: PATIENT AUTHENTICATION
# =============================================================================
Write-TestHeader "2. PATIENT AUTHENTICATION"

# Test all 3 patient logins
$patientAuth = Get-AuthToken -portal "patient" -email $TestUsers.Patient.Email -password $TestUsers.Patient.Password
Write-TestResult "Patient 1 Login (demo.test)" ($null -ne $patientAuth) "User: $($patientAuth.User.name)"

$patient2Auth = Get-AuthToken -portal "patient" -email $TestUsers.Patient2.Email -password $TestUsers.Patient2.Password
Write-TestResult "Patient 2 Login (Somchai)" ($null -ne $patient2Auth) "User: $($patient2Auth.User.name)"

$patient3Auth = Get-AuthToken -portal "patient" -email $TestUsers.Patient3.Email -password $TestUsers.Patient3.Password
Write-TestResult "Patient 3 Login (Anan)" ($null -ne $patient3Auth) "User: $($patient3Auth.User.name)"

# =============================================================================
# SECTION 3: DOCTOR/ADMIN AUTHENTICATION
# =============================================================================
Write-TestHeader "3. DOCTOR/ADMIN AUTHENTICATION"

$doctorAuth = Get-AuthToken -portal "doctor" -email $TestUsers.Doctor.Email -password $TestUsers.Doctor.Password
Write-TestResult "Doctor Login" ($null -ne $doctorAuth) "User: $($doctorAuth.User.name)"

$adminAuth = Get-AuthToken -portal "doctor" -email $TestUsers.Admin.Email -password $TestUsers.Admin.Password
Write-TestResult "Admin Login" ($null -ne $adminAuth) "User: $($adminAuth.User.name)"

# =============================================================================
# SECTION 4: PATIENT PORTAL APIs
# =============================================================================
Write-TestHeader "4. PATIENT PORTAL APIs"

if ($patientAuth) {
    $patientHeaders = @{ Authorization = "Bearer $($patientAuth.Token)" }
    $patientId = $patientAuth.User.id

    # PHR
    $phrResult = Test-Endpoint "$($Urls.PatientUrl)/api/phr/$patientId" -headers $patientHeaders
    Write-TestResult "PHR Data" $phrResult.Success "Has demographics: $($null -ne $phrResult.Response.demographics)"

    # PHR Vitals
    $vitalsResult = Test-Endpoint "$($Urls.PatientUrl)/api/phr/$patientId/vitals" -headers $patientHeaders
    Write-TestResult "PHR Vitals" $vitalsResult.Success "Count: $($vitalsResult.Response.Count)"

    # Appointments
    $apptResult = Test-Endpoint "$($Urls.PatientUrl)/api/appointments/patient/$patientId" -headers $patientHeaders
    Write-TestResult "Appointments" $apptResult.Success "Count: $($apptResult.Response.Count)"

    # Medical Content
    $contentResult = Test-Endpoint "$($Urls.PatientUrl)/api/content/medical" -headers $patientHeaders
    Write-TestResult "Medical Content" $contentResult.Success "Articles: $($contentResult.Response.articles.Count)"

    # Clinical Resources
    $resourcesResult = Test-Endpoint "$($Urls.PatientUrl)/api/content/clinical-resources" -headers $patientHeaders
    Write-TestResult "Clinical Resources" $resourcesResult.Success

    # Doctors List
    $doctorsResult = Test-Endpoint "$($Urls.PatientUrl)/api/doctors" -headers $patientHeaders
    Write-TestResult "Doctors List" $doctorsResult.Success

    # AI Chat History (sessions list)
    $aiSessionsResult = Test-Endpoint "$($Urls.PatientUrl)/api/ai/chat/history" -headers $patientHeaders
    Write-TestResult "AI Chat History" $aiSessionsResult.Success "Retention: $($aiSessionsResult.Response.retention_days) days"
} else {
    Write-Host "  ⚠️  Skipping Patient Portal API tests - no auth token" -ForegroundColor Yellow
}

# =============================================================================
# SECTION 5: DOCTOR PORTAL APIs
# =============================================================================
Write-TestHeader "5. DOCTOR PORTAL APIs"

if ($doctorAuth) {
    $doctorHeaders = @{ Authorization = "Bearer $($doctorAuth.Token)" }
    $doctorId = $doctorAuth.User.id

    # Appointments
    $docApptResult = Test-Endpoint "$($Urls.DoctorUrl)/api/appointments/doctor/$doctorId" -headers $doctorHeaders
    Write-TestResult "Doctor Appointments" $docApptResult.Success

    # Patients List
    $patientsResult = Test-Endpoint "$($Urls.DoctorUrl)/api/patients" -headers $doctorHeaders
    Write-TestResult "Patients List" $patientsResult.Success

    # Medical Content
    $docContentResult = Test-Endpoint "$($Urls.DoctorUrl)/api/content/medical" -headers $doctorHeaders
    Write-TestResult "Medical Content (Doctor)" $docContentResult.Success

    # Clinical Resources
    $docResourcesResult = Test-Endpoint "$($Urls.DoctorUrl)/api/clinical-resources" -headers $doctorHeaders
    Write-TestResult "Clinical Resources (Doctor)" $docResourcesResult.Success

    # Consultants
    $consultantsResult = Test-Endpoint "$($Urls.DoctorUrl)/api/consultants" -headers $doctorHeaders
    Write-TestResult "Medical Consultants" $consultantsResult.Success
} else {
    Write-Host "  ⚠️  Skipping Doctor Portal API tests - no auth token" -ForegroundColor Yellow
}

# =============================================================================
# SECTION 6: ADMIN APIs
# =============================================================================
Write-TestHeader "6. ADMIN APIs"

if ($adminAuth) {
    $adminHeaders = @{ Authorization = "Bearer $($adminAuth.Token)" }

    # Doctor Management (via admin/users?role=doctor)
    $doctorMgmtResult = Test-Endpoint "$($Urls.DoctorUrl)/api/admin/users?role=doctor" -headers $adminHeaders
    Write-TestResult "Doctor Management" $doctorMgmtResult.Success "Doctors: $($doctorMgmtResult.Response.users.Count)"

    # Pending Approvals
    $pendingResult = Test-Endpoint "$($Urls.DoctorUrl)/api/admin/pending-doctors" -headers $adminHeaders
    Write-TestResult "Pending Doctor Approvals" $pendingResult.Success "Pending: $($pendingResult.Response.count)"
} else {
    Write-Host "  ⚠️  Skipping Admin API tests - no auth token" -ForegroundColor Yellow
}

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n" -NoNewline
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host " TEST SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""
Write-Host "  Target Environment: $Target" -ForegroundColor White
Write-Host "  Patient Portal:     $($Urls.PatientUrl)" -ForegroundColor White
Write-Host "  Doctor Portal:      $($Urls.DoctorUrl)" -ForegroundColor White
Write-Host ""
Write-Host "  Total Tests:  $($Results.Total)" -ForegroundColor White
Write-Host "  Passed:       $($Results.Passed)" -ForegroundColor Green
Write-Host "  Failed:       $($Results.Failed)" -ForegroundColor $(if ($Results.Failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

$passRate = if ($Results.Total -gt 0) { [math]::Round(($Results.Passed / $Results.Total) * 100, 1) } else { 0 }
if ($passRate -eq 100) {
    Write-Host "  🎉 ALL TESTS PASSED! ($passRate%)" -ForegroundColor Green
} elseif ($passRate -ge 80) {
    Write-Host "  ⚠️  MOSTLY PASSING ($passRate%)" -ForegroundColor Yellow
} else {
    Write-Host "  ❌ TESTS FAILING ($passRate%)" -ForegroundColor Red
}

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""

# Return exit code based on results
exit $Results.Failed
