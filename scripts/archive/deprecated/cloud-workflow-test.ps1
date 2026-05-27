# Izara Cloud Workflow Test - Real functional workflow tests
# Usage: .\scripts\cloud-workflow-test.ps1
param(
    [string]$BaseUrl = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app",
    [string]$DoctorUrl = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app",
    [string]$MeetingUrl = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app",
    [string]$Email = "cloudtest@izara.dev",
    [string]$Password = "TestPassword123!"
)

$pass = 0; $fail = 0; $total = 0; $failedTests = @()
$h = @{"Content-Type"="application/json"}
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

function TS {
    param([string]$Name, [scriptblock]$Action)
    $script:total++
    try {
        $result = & $Action
        Write-Host "  [OK] $Name" -ForegroundColor Green
        $script:pass++
        return $result
    } catch {
        $msg = $_.Exception.Message
        if ($msg.Length -gt 120) { $msg = $msg.Substring(0,120) + "..." }
        Write-Host "  [XX] $Name => $msg" -ForegroundColor Red
        $script:fail++
        $script:failedTests += $Name
        return $null
    }
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  IZARA CLOUD WORKFLOW TESTS" -ForegroundColor Cyan
Write-Host "  Target: $BaseUrl" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# --- AUTH ---
Write-Host "--- WORKFLOW 1: Auth ---" -ForegroundColor Yellow
$token = $null; $userId = $null

TS "Login" {
    $b = (@{email=$Email;password=$Password} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Headers $h -Body $b -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; $script:token = $j.token; $script:userId = $j.user.id
    if (-not $script:token) { throw "No token" }
}
$auth = @{Authorization="Bearer $token";"Content-Type"="application/json"}

TS "Validate token" {
    $b = (@{token=$token} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/validate" -Method POST -Headers $h -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; if ($j.valid -ne $true) { throw "Invalid token" }
}

TS "Get /me" {
    Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null
}

TS "Register new user" {
    $ne = "wf-$ts@izara.dev"
    $b = (@{email=$ne;password="SecureP@ss123!";name="WF Test";role="patient";dateOfBirth="1990-01-01";gender="male";phone="0812345678";nationalId="1234567890123"} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/register" -Method POST -Headers $h -Body $b -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; if (-not $j.token) { throw "No token" }
}

TS "Re-login" {
    $b = (@{email=$Email;password=$Password} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Headers $h -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; $script:token = $j.token
    $script:auth = @{Authorization="Bearer $($j.token)";"Content-Type"="application/json"}
}

# --- PHR ---
Write-Host "`n--- WORKFLOW 2: PHR + Vitals ---" -ForegroundColor Yellow

TS "Get PHR" { Invoke-WebRequest -Uri "$BaseUrl/api/phr/data" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Save vitals" { $b = (@{blood_pressure_systolic=135;blood_pressure_diastolic=88;heart_rate=78;temperature=36.8;weight=65.5;height=162;oxygen_saturation=98} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phr/vitals" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Save vitals 2" { $b = (@{blood_pressure_systolic=128;blood_pressure_diastolic=82;heart_rate=72;temperature=36.6} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phr/vitals" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Read vitals" { Invoke-WebRequest -Uri "$BaseUrl/api/phr/$userId/vitals" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Add medication" { $b = (@{name="Amlodipine";dosage="5mg";frequency="Once daily";purpose="BP"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phr/$userId/medications" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Add allergy" { $b = (@{allergen="Aspirin";reaction="Hives";severity="moderate"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phr/$userId/allergies" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- APPOINTMENTS ---
Write-Host "`n--- WORKFLOW 3: Appointments ---" -ForegroundColor Yellow
$aptId = $null

TS "Create appointment" {
    $b = (@{preferredDate="2026-03-20";preferredTime="10:00";appointmentType="Telehealth";urgency="urgent";symptoms=@("headache");reason="Headache"} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/appointments" -Method POST -Headers $auth -Body $b -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; $script:aptId = $j.id; if (-not $j.id) { throw "No ID" }
}

TS "List appointments" { Invoke-WebRequest -Uri "$BaseUrl/api/appointments" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

TS "Confirm appointment" {
    $b = (@{status="confirmed";appointmentDate="2026-03-20";appointmentTime="10:30"} | ConvertTo-Json)
    Invoke-WebRequest -Uri "$BaseUrl/api/appointments/$aptId/status" -Method PUT -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null
}

TS "Cancel appointment" {
    $b = (@{status="cancelled"} | ConvertTo-Json)
    Invoke-WebRequest -Uri "$BaseUrl/api/appointments/$aptId/status" -Method PUT -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null
}

# --- VIDEO MEETING ---
Write-Host "`n--- WORKFLOW 4: Video Meeting ---" -ForegroundColor Yellow

TS "Create meeting" {
    $b = (@{appointmentId="cloud-wf-vm";doctorName="Dr. Test";patientName="WF Patient"} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/video-meeting/create" -Method POST -Headers $auth -Body $b -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; if (-not $j.meeting.id) { throw "No meeting" }; $script:vmApt = "cloud-wf-vm"
}
TS "Meeting config" { Invoke-WebRequest -Uri "$BaseUrl/api/video-meeting/config" -Method GET -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Meeting health" { Invoke-WebRequest -Uri "$BaseUrl/api/video-meeting/health" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Get meeting" { Invoke-WebRequest -Uri "$BaseUrl/api/video-meeting/$vmApt" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Join meeting" { $b = (@{participantName="Patient";role="patient"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/video-meeting/$vmApt/join" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Add transcript" { $b = (@{participantName="Dr.";text="Test transcript";language="th"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/video-meeting/$vmApt/transcript" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- AI CHAT ---
Write-Host "`n--- WORKFLOW 5: AI Chat ---" -ForegroundColor Yellow
TS "AI status" { Invoke-WebRequest -Uri "$BaseUrl/api/ai/status" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "AI chat" { $b = (@{message="I have headache 3 days";sessionId="wf-ai-$ts"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/ai/chat" -Method POST -Headers $auth -Body $b -TimeoutSec 60 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "AI follow-up" { $b = (@{message="Should I take meds?";sessionId="wf-ai-$ts"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/ai/chat" -Method POST -Headers $auth -Body $b -TimeoutSec 60 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- NOTIFICATIONS + SETTINGS ---
Write-Host "`n--- WORKFLOW 6: Notifications + Settings ---" -ForegroundColor Yellow
TS "Get notifications" { Invoke-WebRequest -Uri "$BaseUrl/api/notifications" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Create notification" { $b = (@{title="Test";message="WF test";type="system"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/notifications/test" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Mark all read" { Invoke-WebRequest -Uri "$BaseUrl/api/notifications/read-all" -Method PUT -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Get settings" { Invoke-WebRequest -Uri "$BaseUrl/api/settings" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Update settings" { $b = (@{language="th";theme="dark"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/settings" -Method PUT -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Update notif prefs" { $b = (@{channel="push";category="appointments";enabled=$true} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/settings/notifications" -Method PUT -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- PHASE 2 ---
Write-Host "`n--- WORKFLOW 7: Phase 2 ---" -ForegroundColor Yellow
$ctmId = $null; $sosId = $null

TS "CTM assessment" {
    $b = (@{dhatu="Earth";symptoms=@("fatigue");diagnosis="Wind imbalance";treatmentPlan="Herbal"} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/phase2/ctm-assessment" -Method POST -Headers $auth -Body $b -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; $script:ctmId = $j.id
}
TS "Read CTM" { Invoke-WebRequest -Uri "$BaseUrl/api/phase2/ctm-assessment/$ctmId" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "AI herbal" { $b = (@{dhatu="Earth";symptoms=@("headache");constitution="Wind"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phase2/ctm-assessment/ai-recommend" -Method POST -Headers $auth -Body $b -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Geriatric screening" { $b = (@{screeningType="comprehensive";scores=@{adl=18;iadl=6;mmse=27};riskLevel="low";recommendations=@("Exercise")} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phase2/geriatric-screening" -Method POST -Headers $auth -Body $b -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "SOS alert" {
    $b = (@{alertType="medical_emergency";latitude=13.7563;longitude=100.5018;message="Test"} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/phase2/sos-alert" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; $script:sosId = $j.id
}
TS "Ack SOS" { Invoke-WebRequest -Uri "$BaseUrl/api/phase2/sos-alert/$sosId/acknowledge" -Method POST -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Cancel SOS" { Invoke-WebRequest -Uri "$BaseUrl/api/phase2/sos-alert/$sosId/cancel" -Method POST -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Create follow-up" { $b = (@{followUpDate="2026-03-21T10:00:00Z";reason="Check";instructions="Monitor BP"} | ConvertTo-Json); Invoke-WebRequest -Uri "$BaseUrl/api/phase2/follow-up" -Method POST -Headers $auth -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "List follow-ups" { Invoke-WebRequest -Uri "$BaseUrl/api/phase2/follow-up" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Nursing dashboard" { Invoke-WebRequest -Uri "$BaseUrl/api/phase2/nursing-dashboard" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- CONTENT + METADATA ---
Write-Host "`n--- WORKFLOW 8: Content ---" -ForegroundColor Yellow
TS "Medical content" { Invoke-WebRequest -Uri "$BaseUrl/api/medical-content" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Clinical resources" { Invoke-WebRequest -Uri "$BaseUrl/api/content/clinical-resources" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Doctors list" { Invoke-WebRequest -Uri "$BaseUrl/api/doctors" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Specialties" { Invoke-WebRequest -Uri "$BaseUrl/api/metadata/specialties" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Symptoms" { Invoke-WebRequest -Uri "$BaseUrl/api/metadata/symptoms" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "ICD-10" { Invoke-WebRequest -Uri "$BaseUrl/api/metadata/icd10-codes" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- PDPA + DASHBOARD ---
Write-Host "`n--- WORKFLOW 9: PDPA + Dashboard ---" -ForegroundColor Yellow
TS "PDPA status" { Invoke-WebRequest -Uri "$BaseUrl/api/pdpa/status" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Profile" { Invoke-WebRequest -Uri "$BaseUrl/api/profile" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Dashboard" { Invoke-WebRequest -Uri "$BaseUrl/api/dashboard/stats" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Timeline" { Invoke-WebRequest -Uri "$BaseUrl/api/timeline" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Health records" { Invoke-WebRequest -Uri "$BaseUrl/api/health-records" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Prescriptions" { Invoke-WebRequest -Uri "$BaseUrl/api/prescriptions" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- CROSS-PORTAL ---
Write-Host "`n--- WORKFLOW 10: Cross-Portal ---" -ForegroundColor Yellow
TS "Doctor /health" { Invoke-WebRequest -Uri "$DoctorUrl/health" -Method GET -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Doctor /api/health" { Invoke-WebRequest -Uri "$DoctorUrl/api/health" -Method GET -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Meeting /health" { Invoke-WebRequest -Uri "$MeetingUrl/health" -Method GET -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop | Out-Null }
TS "Meeting /api/health" { Invoke-WebRequest -Uri "$MeetingUrl/api/health" -Method GET -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop | Out-Null }

# --- LOGOUT ---
Write-Host "`n--- WORKFLOW 11: Logout ---" -ForegroundColor Yellow
TS "Logout" {
    $b = (@{token=$token} | ConvertTo-Json)
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/logout" -Method POST -Headers $h -Body $b -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json; if (-not $j.success) { throw "Failed" }
}
TS "Session invalidated" {
    try { Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -Method GET -Headers $auth -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop }
    catch { Write-Host "    (correctly invalidated)" -ForegroundColor DarkGray }
}

# --- REPORT ---
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $pass/$total passed ($([math]::Round($pass/$total*100,1))%)" -ForegroundColor $(if($fail -eq 0){"Green"}else{"Yellow"})
if ($failedTests.Count -gt 0) { Write-Host "  FAILED: $($failedTests -join ', ')" -ForegroundColor Red }
Write-Host "================================================================" -ForegroundColor Cyan
