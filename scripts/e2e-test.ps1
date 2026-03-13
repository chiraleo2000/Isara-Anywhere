#!/usr/bin/env pwsh
# ============================================================
# IZARA TELEMEDICINE - FULL E2E WORKFLOW TEST
# Single flow: Register → Login → Fetch All Data → Create Apt → Confirm → Meeting → End
# Tests both LOCAL and CLOUD in one continuous run
# ============================================================
param(
    [string]$Env = "local"  # "local" or "cloud"
)

$ErrorActionPreference = "Continue"

if ($Env -eq "local") {
    $docBase  = "http://localhost:3010"
    $ptBase   = "http://localhost:3005"
    $meetBase = "http://localhost:3020"
} else {
    $docBase  = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
    $ptBase   = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
    $meetBase = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app"
}

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$pass = 0; $fail = 0; $total = 0

function Test-API {
    param([string]$Name, [string]$Url, [string]$Method = "GET", $Headers = $null, $Body = $null, [int]$Expected = 200, [int]$Timeout = 20)
    $script:total++
    try {
        $p = @{ Uri = $Url; Method = $Method; TimeoutSec = $Timeout; UseBasicParsing = $true }
        if ($Headers) { $p.Headers = $Headers }
        if ($Body) { $p.Body = $Body; $p.ContentType = "application/json" }
        $r = Invoke-WebRequest @p
        $code = [int]$r.StatusCode
        $content = $r.Content
    } catch {
        $code = [int]$_.Exception.Response.StatusCode.value__
        $content = $null
        try { $content = $_.ErrorDetails.Message } catch {}
    }
    $ok = ($code -eq $Expected)
    if ($ok) { $script:pass++ } else { $script:fail++ }
    $mark = if ($ok) { "PASS" } else { "FAIL" }
    Write-Host "[$mark] $Name => $code" -ForegroundColor $(if($ok){"Green"}else{"Red"})
    return @{ Code = $code; Content = $content; OK = $ok }
}

Write-Host ""
Write-Host "=================================================="
Write-Host "  IZARA E2E TEST - $($Env.ToUpper()) ENVIRONMENT"
Write-Host "=================================================="
Write-Host ""

# ==================== PHASE 1: HEALTH CHECKS ====================
Write-Host "--- PHASE 1: HEALTH CHECKS ---"
Test-API "Patient-Health" "$ptBase/api/health"
Test-API "Doctor-Health" "$docBase/api/health"
Test-API "Meeting-Health" "$meetBase/api/health"
Test-API "Storage-Health" "$docBase/api/storage/health"

# ==================== PHASE 2: REGISTRATION ====================
Write-Host "`n--- PHASE 2: REGISTRATION ---"
$docEmail = "e2e-doc-$ts@izara.com"
$ptEmail = "e2e-pt-$ts@izara.com"

$regBody = @{ email=$docEmail; password="E2eDoc123!@Secure"; name="Dr. E2E Test"; medicalLicenseNumber="ML-E2E-$ts"; specialty="General Medicine"; phone="0891111111" } | ConvertTo-Json
$r = Test-API "Doctor-Register" "$docBase/api/auth/register" "POST" $null $regBody
$docUser = ($r.Content | ConvertFrom-Json).user
Write-Host "  Doctor ID: $($docUser.id)"

$regBody = @{ email=$ptEmail; password="E2ePat123!@Secure"; name="E2E Patient"; dateOfBirth="1990-06-15"; phone="0892222222" } | ConvertTo-Json
$r = Test-API "Patient-Register" "$ptBase/api/auth/register" "POST" $null $regBody
$ptReg = $r.Content | ConvertFrom-Json
$ptToken = $ptReg.token
$ptId = $ptReg.user.patientId
Write-Host "  Patient ID: $ptId"

# ==================== PHASE 3: LOGIN (Single Login Per Role) ====================
Write-Host "`n--- PHASE 3: LOGIN ---"
$loginBody = @{ email=$docEmail; password="E2eDoc123!@Secure" } | ConvertTo-Json
$r = Test-API "Doctor-Login" "$docBase/api/auth/login" "POST" $null $loginBody
$docToken = ($r.Content | ConvertFrom-Json).token
Write-Host "  Doctor Token: $($docToken.Substring(0,20))..."

# Patient already has token from registration - just verify login works
$loginBody = @{ email=$ptEmail; password="E2ePat123!@Secure" } | ConvertTo-Json
$r = Test-API "Patient-Login" "$ptBase/api/auth/login" "POST" $null $loginBody
$ptLoginToken = ($r.Content | ConvertFrom-Json).token
Write-Host "  Patient Token: $($ptLoginToken.Substring(0,20))..."
# Use login token going forward
$ptToken = $ptLoginToken

$dh = @{ Authorization = "Bearer $docToken" }
$ph = @{ Authorization = "Bearer $ptToken" }

# ==================== PHASE 4: DATA LOAD VERIFICATION ====================
Write-Host "`n--- PHASE 4: DATA LOAD VERIFICATION (Doctor) ---"
$r = Test-API "Doctor-Appointments" "$docBase/api/appointments" "GET" $dh
$aptData = $r.Content | ConvertFrom-Json
Write-Host "  Appointments loaded: $($aptData.count) records"
if ($aptData.count -eq 0 -and $aptData.appointments.Length -eq 0) { Write-Host "  [WARN] No appointments data" }

$r = Test-API "Doctor-AptPool" "$docBase/api/appointment-pool" "GET" $dh
$r = Test-API "Doctor-Notifications" "$docBase/api/notifications" "GET" $dh
$notifData = $r.Content | ConvertFrom-Json
Write-Host "  Notifications: success=$($notifData.success)"

$r = Test-API "Doctor-Consultants" "$docBase/api/consultants" "GET" $dh
$consData = $r.Content | ConvertFrom-Json
Write-Host "  Consultants loaded: $($consData.consultants.Length) entries"

$r = Test-API "Doctor-DoctorsList" "$docBase/api/doctors" "GET" $dh

$r = Test-API "Medical-Content" "$docBase/api/content/medical" "GET" $dh
$medData = $r.Content | ConvertFrom-Json
Write-Host "  Medical articles: $($medData.articles.Length)"

$r = Test-API "Clinical-Content" "$docBase/api/content/clinical" "GET" $dh
$clinData = $r.Content | ConvertFrom-Json
Write-Host "  Clinical resources: $($clinData.resources.Length)"

$r = Test-API "Pending-Doctors" "$docBase/api/admin/pending-doctors" "GET" $dh
$r = Test-API "Dashboard-Stats" "$docBase/api/admin/dashboard-stats" "GET" $dh
$statsData = $r.Content | ConvertFrom-Json
Write-Host "  Stats: patients=$($statsData.stats.usersByRole.patient) doctors=$($statsData.stats.usersByRole.doctor)"

Write-Host "`n--- PHASE 4b: DATA LOAD VERIFICATION (Patient) ---"
$r = Test-API "Patient-Appointments" "$ptBase/api/appointments" "GET" $ph
$r = Test-API "Patient-Notifications" "$ptBase/api/notifications" "GET" $ph
$r = Test-API "Patient-NotifPrefs" "$ptBase/api/notifications/preferences" "GET" $ph
$prefsData = $r.Content | ConvertFrom-Json
Write-Host "  Prefs: appointments=$($prefsData.preferences.appointments)"

Write-Host "`n--- PHASE 4c: DATA LOAD VERIFICATION (Meeting) ---"
$r = Test-API "Meetings-List" "$meetBase/api/meetings" "GET"
$meetListData = $r.Content | ConvertFrom-Json
Write-Host "  Total meetings: $($meetListData.meetings.Length)"
$r = Test-API "Active-Meetings" "$meetBase/api/meetings/active" "GET"

# ==================== PHASE 5: APPOINTMENT WORKFLOW ====================
Write-Host "`n--- PHASE 5: APPOINTMENT WORKFLOW ---"
$aptBody = @{ appointmentType="telemedicine"; symptoms="E2E test symptoms"; symptomDescription="Persistent headache for E2E testing"; urgencyLevel="normal" } | ConvertTo-Json
$r = Test-API "Create-Appointment" "$ptBase/api/appointments" "POST" $ph $aptBody
$newApt = $r.Content | ConvertFrom-Json
$aptId = $newApt.id
Write-Host "  Appointment ID: $aptId Status: $($newApt.status)"

# Doctor confirms the appointment
$confirmBody = @{ status="confirmed"; notes="E2E test confirmed by doctor" } | ConvertTo-Json
$r = Test-API "Confirm-Appointment" "$docBase/api/appointments/$aptId/status" "PUT" $dh $confirmBody
$confirmData = $r.Content | ConvertFrom-Json
Write-Host "  Confirmed status: $($confirmData.appointment.status)"

# Verify patient can see confirmed appointment
$r = Test-API "Verify-Apt-Patient" "$ptBase/api/appointments" "GET" $ph

# ==================== PHASE 6: MEETING WORKFLOW ====================
Write-Host "`n--- PHASE 6: MEETING WORKFLOW ---"
$meetBody = @{ appointmentId=$aptId; title="E2E Consultation"; participants=@(@{id=$docUser.id;name="Dr. E2E";role="doctor"},@{id=$ptId;name="E2E Patient";role="patient"}) } | ConvertTo-Json
$r = Test-API "Create-Meeting" "$meetBase/api/meeting/create" "POST" $null $meetBody
$meetData = $r.Content | ConvertFrom-Json
$meetingId = $meetData.meetingId
Write-Host "  Meeting ID: $meetingId"
Write-Host "  Room: $($meetData.roomName)"

# Get meeting status
$r = Test-API "Get-Meeting" "$meetBase/api/meetings/$meetingId" "GET"
$r = Test-API "Meeting-Status" "$meetBase/api/meetings/$meetingId/status" "GET"

# End meeting
$endBody = @{ endedBy="doctor"; reason="E2E consultation complete" } | ConvertTo-Json
$r = Test-API "End-Meeting" "$meetBase/api/meetings/$meetingId/end" "POST" $null $endBody
$endData = $r.Content | ConvertFrom-Json
Write-Host "  Meeting ended: status=$($endData.status) aiSummary=$($endData.aiSummary.available)"

# ==================== PHASE 7: UNAUTH PROTECTION ====================
Write-Host "`n--- PHASE 7: AUTH PROTECTION ---"
Test-API "Unauth-DoctorApts" "$docBase/api/appointments" "GET" $null $null 401
Test-API "Unauth-PatientNotif" "$ptBase/api/notifications" "GET" $null $null 401

# ==================== PHASE 8: CLEANUP TEST DATA ====================
Write-Host "`n--- PHASE 8: CLEANUP TEST DATA ---"
Write-Host "  Removing E2E-generated data to keep DB clean..."

$cleanupSql = @"
BEGIN;
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM meeting_records WHERE appointment_id = '$aptId';
DELETE FROM prescriptions WHERE appointment_id = '$aptId';
DELETE FROM appointments WHERE id = '$aptId';
DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM vital_signs WHERE patient_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM phr WHERE patient_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM living_wills WHERE patient_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM doctor_profiles WHERE doctor_id IN (SELECT id FROM users WHERE email LIKE 'e2e-%');
DELETE FROM doctors WHERE id NOT IN ('DOC-SOMCHAI-001','DOC-SIRIPORN-001','DOC-TEST-001','DOC-PIYAWAT-001','DOC-KANNIKA-001') AND id LIKE 'DOC-%';
DELETE FROM users WHERE email LIKE 'e2e-%';
COMMIT;
"@

try {
    # Read cloud DB password from environment or .env.docker (avoid hardcoding secrets)
    $cloudDbPass = $env:CLOUD_DB_PASSWORD
    if (-not $cloudDbPass) {
        $envDockerFile = Join-Path $PSScriptRoot ".." ".env.docker"
        if (Test-Path $envDockerFile) {
            $match = Select-String -Path $envDockerFile -Pattern '^CLOUD_DB_PASSWORD=(.+)' | Select-Object -First 1
            if ($match) { $cloudDbPass = $match.Matches[0].Groups[1].Value.Trim() }
        }
    }

    if ($Env -eq "local") {
        $result = $cleanupSql | docker exec -i izara-postgres psql -U postgres -d izara_phase1 2>&1
    } else {
        if (-not $cloudDbPass) {
            Write-Host "  [WARN] CLOUD_DB_PASSWORD not set in env or .env.docker, skipping cloud cleanup" -ForegroundColor Yellow
        } else {
            $result = $cleanupSql | docker exec -e "PGPASSWORD=$cloudDbPass" -i izara-postgres psql -h 35.240.157.230 -p 5432 -U postgres -d izara_phase1 2>&1
        }
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Test data cleaned up successfully" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Cleanup returned code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "  $result"
    }
} catch {
    Write-Host "  [WARN] Cleanup skipped: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ==================== RESULTS ====================
Write-Host ""
Write-Host "=================================================="
Write-Host "  $($Env.ToUpper()) RESULTS: $pass PASS / $fail FAIL / $total TOTAL"
if ($fail -eq 0) {
    Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "  FAILURES DETECTED!" -ForegroundColor Red
}
Write-Host "=================================================="

exit $fail
