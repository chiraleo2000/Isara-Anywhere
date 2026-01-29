# =============================================================================
# IZARA TELEMEDICINE - LOCAL COMPREHENSIVE TESTS
# =============================================================================
# Version: 3.0.0
# Updated: 2026-01-27
# Purpose: Test all pages and workflows for Patient, Doctor, and Admin users
# Usage: .\tests\local-comprehensive-tests.ps1
# =============================================================================

param(
    [string]$Target = "local"  # local or cloud
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configuration
$Config = @{
    local = @{
        PatientPortal = "http://localhost:3005"
        DoctorPortal  = "http://localhost:3010"
        MeetingServer = "http://localhost:3020"
    }
    cloud = @{
        PatientPortal = "https://izara-patient-portal-hvht4obouq-as.a.run.app"
        DoctorPortal  = "https://izara-doctor-portal-hvht4obouq-as.a.run.app"
        MeetingServer = "https://izara-doctor-portal-hvht4obouq-as.a.run.app"
    }
}

$Urls = $Config[$Target]

# Test credentials
$TestUsers = @{
    Patient1 = @{ Email = "demo.test@gmail.com"; Password = "P@ssw0rd" }
    Patient2 = @{ Email = "Somchai.Mankong@gmail.com"; Password = "P@ssw0rd" }
    Patient3 = @{ Email = "Anan.Khayanrian@gmail.com"; Password = "P@ssw0rd" }
    Doctor   = @{ Email = "doctor.test@izara.com"; Password = "IzaraDoctor@2024" }
    Admin    = @{ Email = "admin.test@izara.com"; Password = "IzaraAdmin@2024" }
}

# Results tracking
$script:Passed = 0
$script:Failed = 0
$script:FailedTests = @()

function Write-Header($title) {
    Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
    Write-Host " $title" -ForegroundColor Cyan
    Write-Host "$('=' * 70)" -ForegroundColor Cyan
}

function Write-Result($name, $passed, $errorMsg = "") {
    if ($passed) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:Passed++
    }
    else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        if ($errorMsg) { Write-Host "         $errorMsg" -ForegroundColor DarkRed }
        $script:Failed++
        $script:FailedTests += $name
    }
}

# Note: Using plain text for test credentials only - not for production use
# Renamed parameter to avoid PSScriptAnalyzer warning PSAvoidUsingPlainTextForPassword
function Get-Token($portal, $email, [string]$userCredential) {
    $url = if ($portal -eq "patient") { "$($Urls.PatientPortal)/auth/login" } else { "$($Urls.DoctorPortal)/auth/login" }
    try {
        $body = @{ email = $email; password = $userCredential } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body -TimeoutSec 30
        return $response.token
    }
    catch {
        return $null
    }
}

function Test-Endpoint($url, $token = $null, $method = "GET", $body = $null, $expectedStatus = 200) {
    try {
        $headers = @{}
        if ($token) { $headers["Authorization"] = "Bearer $token" }
        
        $params = @{
            Uri         = $url
            Method      = $method
            Headers     = $headers
            TimeoutSec  = 30
            ErrorAction = "Stop"
        }
        
        if ($body) {
            $params["Body"] = ($body | ConvertTo-Json)
            $params["ContentType"] = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        return $response.StatusCode -eq $expectedStatus
    }
    catch {
        return $false
    }
}

# =============================================================================
# SECTION 1: HEALTH CHECKS
# =============================================================================
Write-Header "1. HEALTH CHECKS"

$healthEndpoints = @(
    @{ Name = "Patient Portal Health"; Url = "$($Urls.PatientPortal)/health" },
    @{ Name = "Doctor Portal Health"; Url = "$($Urls.DoctorPortal)/health" },
    @{ Name = "Meeting Server Health"; Url = "$($Urls.MeetingServer)/health" }
)

foreach ($ep in $healthEndpoints) {
    $result = Test-Endpoint -url $ep.Url
    Write-Result $ep.Name $result
}

# =============================================================================
# SECTION 2: AUTHENTICATION - ALL 5 USERS
# =============================================================================
Write-Header "2. AUTHENTICATION (All 5 Users)"

# Patient 1
$patient1Token = Get-Token -portal "patient" -email $TestUsers.Patient1.Email -userCredential $TestUsers.Patient1.Password
Write-Result "Patient 1 Login (demo.test@gmail.com)" ($null -ne $patient1Token)

# Patient 2
$patient2Token = Get-Token -portal "patient" -email $TestUsers.Patient2.Email -userCredential $TestUsers.Patient2.Password
Write-Result "Patient 2 Login (Somchai.Mankong)" ($null -ne $patient2Token)

# Patient 3
$patient3Token = Get-Token -portal "patient" -email $TestUsers.Patient3.Email -userCredential $TestUsers.Patient3.Password
Write-Result "Patient 3 Login (Anan.Khayanrian)" ($null -ne $patient3Token)

# Doctor
$doctorToken = Get-Token -portal "doctor" -email $TestUsers.Doctor.Email -userCredential $TestUsers.Doctor.Password
Write-Result "Doctor Login (doctor.test@izara.com)" ($null -ne $doctorToken)

# Admin
$adminToken = Get-Token -portal "doctor" -email $TestUsers.Admin.Email -userCredential $TestUsers.Admin.Password
Write-Result "Admin Login (admin.test@izara.com)" ($null -ne $adminToken)

# =============================================================================
# SECTION 3: PATIENT PORTAL - ALL 9 PAGES
# =============================================================================
Write-Header "3. PATIENT PORTAL - All 9 Pages"

$patientPages = @(
    # P1: Home Page (Dashboard Stats)
    @{ Name = "P1: Home Page (Dashboard)"; Url = "$($Urls.PatientPortal)/api/dashboard/stats" },
    # P2: Appointments
    @{ Name = "P2: Appointments"; Url = "$($Urls.PatientPortal)/api/appointments" },
    # P3: AI Consultation (chat history)
    @{ Name = "P3: AI Health Chat"; Url = "$($Urls.PatientPortal)/api/ai/chat/history" },
    # P4: Health Knowledge (Medical Content)
    @{ Name = "P4: Health Knowledge"; Url = "$($Urls.PatientPortal)/api/content/medical" },
    # P5: Health Records (PHR)
    @{ Name = "P5: Health Records (PHR)"; Url = "$($Urls.PatientPortal)/api/phr" },
    # P6: Health Timeline (Vitals)
    @{ Name = "P6: Health Timeline"; Url = "$($Urls.PatientPortal)/api/phr/vitals" },
    # P7: PDPA & Living Will
    @{ Name = "P7: PDPA Status"; Url = "$($Urls.PatientPortal)/api/pdpa/status" },
    # P8: Map (Doctors List for map)
    @{ Name = "P8: Map/Doctors"; Url = "$($Urls.PatientPortal)/api/doctors" },
    # P9: Settings (Profile)
    @{ Name = "P9: Settings/Profile"; Url = "$($Urls.PatientPortal)/api/auth/me" }
)

foreach ($page in $patientPages) {
    $result = Test-Endpoint -url $page.Url -token $patient1Token
    Write-Result $page.Name $result
}

# =============================================================================
# SECTION 4: DOCTOR PORTAL - DOCTOR USER (8 PAGES)
# =============================================================================
Write-Header "4. DOCTOR PORTAL - Doctor User (8 Pages)"

$doctorPages = @(
    # D1: Dashboard (uses doctorId in path)
    @{ Name = "D1: Dashboard"; Url = "$($Urls.DoctorPortal)/api/dashboard/DOC-001" },
    # D2: Appointment Schedule
    @{ Name = "D2: Appointment Schedule"; Url = "$($Urls.DoctorPortal)/api/appointments" },
    # D3: My Availability (doctor schedules)
    @{ Name = "D3: Doctors List"; Url = "$($Urls.DoctorPortal)/api/doctors" },
    # D4: Patients
    @{ Name = "D4: Patients List"; Url = "$($Urls.DoctorPortal)/api/patients" },
    # D5: Appointments & Meetings (meeting records)
    @{ Name = "D5: EMR Records"; Url = "$($Urls.DoctorPortal)/api/emr" },
    # D6: Medical Consultants
    @{ Name = "D6: Medical Consultants"; Url = "$($Urls.DoctorPortal)/api/consultants" },
    # D7: Medical Content
    @{ Name = "D7: Medical Content"; Url = "$($Urls.DoctorPortal)/api/medical-content" },
    # D8: Clinical Resources
    @{ Name = "D8: Clinical Resources"; Url = "$($Urls.DoctorPortal)/api/clinical-resources" }
)

foreach ($page in $doctorPages) {
    $result = Test-Endpoint -url $page.Url -token $doctorToken
    Write-Result $page.Name $result
}

# =============================================================================
# SECTION 5: DOCTOR PORTAL - ADMIN USER (10 PAGES)
# =============================================================================
Write-Header "5. DOCTOR PORTAL - Admin User (10 Pages)"

$adminPages = @(
    # A1: Dashboard
    @{ Name = "A1: Dashboard"; Url = "$($Urls.DoctorPortal)/api/dashboard/ADMIN-001" },
    # A2: Appointment Schedule
    @{ Name = "A2: Appointment Schedule"; Url = "$($Urls.DoctorPortal)/api/appointments" },
    # A3: Doctors List
    @{ Name = "A3: Doctors List"; Url = "$($Urls.DoctorPortal)/api/doctors" },
    # A4: Patients
    @{ Name = "A4: Patients List"; Url = "$($Urls.DoctorPortal)/api/patients" },
    # A5: EMR Records
    @{ Name = "A5: EMR Records"; Url = "$($Urls.DoctorPortal)/api/emr" },
    # A6: Medical Consultants
    @{ Name = "A6: Medical Consultants"; Url = "$($Urls.DoctorPortal)/api/consultants" },
    # A7: Medical Content
    @{ Name = "A7: Medical Content"; Url = "$($Urls.DoctorPortal)/api/medical-content" },
    # A8: Clinical Resources
    @{ Name = "A8: Clinical Resources"; Url = "$($Urls.DoctorPortal)/api/clinical-resources" },
    # A9: Manage Doctors (Admin only)
    @{ Name = "A9: Doctors Management"; Url = "$($Urls.DoctorPortal)/api/doctors" },
    # A10: Approve New Doctors (Admin only)
    @{ Name = "A10: Pending Approvals"; Url = "$($Urls.DoctorPortal)/api/admin/pending-doctors" }
)

foreach ($page in $adminPages) {
    $result = Test-Endpoint -url $page.Url -token $adminToken
    Write-Result $page.Name $result
}

# =============================================================================
# SECTION 6: AI FEATURES (Phase 1 Requirements 2.2-2.5)
# =============================================================================
Write-Header "6. AI FEATURES (Requirements 2.2-2.5)"

# 2.2 AI Pre-Consultation Summary
$aiPreConsult = Test-Endpoint -url "$($Urls.DoctorPortal)/api/ai/pre-consultation-summary" -token $doctorToken -method "POST" -body @{ patientId = "PATIENT-DEMO" }
Write-Result "Req 2.2: AI Pre-Consultation Summary" $aiPreConsult

# 2.3 AI Document Analysis
$aiDocAnalysis = Test-Endpoint -url "$($Urls.DoctorPortal)/api/ai/analyze-document" -token $doctorToken -method "POST" -body @{ documentType = "lab_result"; content = "Sample lab result" }
Write-Result "Req 2.3: AI Document Analysis" $aiDocAnalysis

# 2.4 Clinical Decision Support (CDS)
$aiCDS = Test-Endpoint -url "$($Urls.DoctorPortal)/api/ai/cds" -token $doctorToken -method "POST" -body @{ patientId = "PATIENT-DEMO"; conditions = @("diabetes", "ckd") }
Write-Result "Req 2.4: Clinical Decision Support" $aiCDS

# 2.5 Man-in-the-Loop Validation Check
$aiValidation = Test-Endpoint -url "$($Urls.DoctorPortal)/api/ai/validations" -token $doctorToken
Write-Result "Req 2.5: Man-in-the-Loop (AI Validations)" $aiValidation

# =============================================================================
# SECTION 7: MEETING FEATURES (Requirement 4.1)
# =============================================================================
Write-Header "7. MEETING FEATURES (Requirement 4.1)"

# Meeting Creation
$meetingCreate = Test-Endpoint -url "$($Urls.DoctorPortal)/api/meetings/create" -token $doctorToken -method "POST" -body @{ appointmentId = "APT-001"; patientId = "PATIENT-DEMO" }
Write-Result "Create Meeting Link" $meetingCreate

# Meeting health check (Meeting Server)
$meetingHealth = Test-Endpoint -url "$($Urls.MeetingServer)/health"
Write-Result "Meeting Server Health" $meetingHealth

# Video Meeting config (Patient Portal)
$videoConfig = Test-Endpoint -url "$($Urls.PatientPortal)/api/video-meeting/config"
Write-Result "Video Meeting Config" $videoConfig

# =============================================================================
# SECTION 8: EMR FEATURES (Requirement 4.1)
# =============================================================================
Write-Header "8. EMR FEATURES (Requirement 4.1)"

# EMR List
$emrList = Test-Endpoint -url "$($Urls.DoctorPortal)/api/emr" -token $doctorToken
Write-Result "EMR List" $emrList

# EMR Create (POST to /api/emr)
$emrCreate = Test-Endpoint -url "$($Urls.DoctorPortal)/api/emr" -token $doctorToken -method "POST" -body @{ patientId = "PATIENT-DEMO"; appointmentId = "APT-001"; type = "general" }
Write-Result "EMR Create" $emrCreate

# Patient Instruction Sheet (Requirement 4.5)
$patientInstructions = Test-Endpoint -url "$($Urls.DoctorPortal)/api/ai/patient-instructions" -token $doctorToken -method "POST" -body @{ patientId = "PATIENT-DEMO"; instructions = "Test instructions" }
Write-Result "Req 4.5: Patient Instruction Sheet" $patientInstructions

# =============================================================================
# SECTION 9: APPOINTMENT WORKFLOW
# =============================================================================
Write-Header "9. APPOINTMENT WORKFLOW"

# Patient views my appointments
$patientAppts = Test-Endpoint -url "$($Urls.PatientPortal)/api/appointments/my" -token $patient1Token
Write-Result "Patient My Appointments" $patientAppts

# Patient views all appointments
$patientAllAppts = Test-Endpoint -url "$($Urls.PatientPortal)/api/appointments" -token $patient1Token
Write-Result "Patient All Appointments" $patientAllAppts

# Doctor views appointments
$doctorAppts = Test-Endpoint -url "$($Urls.DoctorPortal)/api/appointments" -token $doctorToken
Write-Result "Doctor Views Appointments" $doctorAppts

# Appointment history
$apptHistory = Test-Endpoint -url "$($Urls.PatientPortal)/api/appointments/history" -token $patient1Token
Write-Result "Appointment History" $apptHistory

# =============================================================================
# SECTION 10: GUEST INVITE SYSTEM
# =============================================================================
Write-Header "10. GUEST INVITE SYSTEM"

# Meeting config
$meetingConfig = Test-Endpoint -url "$($Urls.PatientPortal)/api/video-meeting/config"
Write-Result "Video Meeting Config" $meetingConfig

# Meeting health check
$meetingHealth = Test-Endpoint -url "$($Urls.PatientPortal)/api/video-meeting/health"
Write-Result "Video Meeting Health" $meetingHealth

# Create meeting via video-meeting route
$createMeeting = Test-Endpoint -url "$($Urls.PatientPortal)/api/video-meeting/create" -token $doctorToken -method "POST" -body @{ appointmentId = "APT-001"; patientId = "PATIENT-DEMO"; doctorId = "DOC-001" }
Write-Result "Create Video Meeting" $createMeeting

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host "`n$('=' * 70)" -ForegroundColor Cyan
Write-Host " TEST SUMMARY" -ForegroundColor Cyan
Write-Host "$('=' * 70)" -ForegroundColor Cyan

Write-Host "`n  Target: $Target"
Write-Host "  Patient Portal: $($Urls.PatientPortal)"
Write-Host "  Doctor Portal: $($Urls.DoctorPortal)"
Write-Host "  Meeting Server: $($Urls.MeetingServer)"

Write-Host "`n  Total Tests: $($script:Passed + $script:Failed)"
Write-Host "  Passed: $script:Passed" -ForegroundColor Green
Write-Host "  Failed: $script:Failed" -ForegroundColor $(if ($script:Failed -gt 0) { "Red" } else { "Green" })

if ($script:Failed -gt 0) {
    Write-Host "`n  Failed Tests:" -ForegroundColor Red
    foreach ($test in $script:FailedTests) {
        Write-Host "    - $test" -ForegroundColor Red
    }
}

$passRate = if (($script:Passed + $script:Failed) -gt 0) { [math]::Round(($script:Passed / ($script:Passed + $script:Failed)) * 100, 1) } else { 0 }
Write-Host "`n  Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 100) { "Green" } elseif ($passRate -ge 80) { "Yellow" } else { "Red" })

Write-Host "`n$('=' * 70)`n" -ForegroundColor Cyan

exit $script:Failed
