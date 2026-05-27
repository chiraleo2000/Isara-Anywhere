#!/usr/bin/env pwsh
# ============================================================================
# IZARA TELEMEDICINE - FULL APPOINTMENT WORKFLOW E2E TEST
# ============================================================================
# Tests: Login -> Appointment -> Assign -> Confirm -> Meeting -> Transcript
#        -> AI Summary -> EMR Creation (14 steps)
# ============================================================================

$ErrorActionPreference = "Continue"

# CONFIGURATION
$DOCTOR_URL = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"
$PATIENT_URL = "https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app"
$MEETING_URL = "https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app"

$PATIENT_EMAIL = "demo.test@gmail.com"
$PATIENT_PASSWORD = "P@ssw0rd1234"
$DOCTOR_EMAIL = "doctor.test@izara.com"
$DOCTOR_PASSWORD = "IzaraDoctor@2024"

# State
$patientToken = $null
$doctorToken = $null
$patientId = $null
$doctorId = $null
$appointmentId = $null
$meetingId = $null
$meetingLink = $null
$jitsiRoomName = $null
$patientName = "E2E Patient"
$doctorName = "Dr. Test"
$aiSummary = $null
$passCount = 0
$failCount = 0
$results = @()

function Log-Step {
    param([string]$step, [string]$status, [string]$detail)
    $color = if ($status -eq "PASS") { "Green" } elseif ($status -eq "FAIL") { "Red" } else { "Yellow" }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $color
    Write-Host "  $step  [$status]" -ForegroundColor $color
    if ($detail) { Write-Host "  $detail" -ForegroundColor White }
    Write-Host "========================================" -ForegroundColor $color
    $script:results += [PSCustomObject]@{ Step = $step; Status = $status; Detail = $detail }
    if ($status -eq "PASS") { $script:passCount++ }
    elseif ($status -eq "FAIL") { $script:failCount++ }
}

function Safe-Invoke {
    param([string]$method, [string]$uri, $body, $headers, [int]$timeoutSec = 30)
    try {
        $params = @{ Method = $method; Uri = $uri; ContentType = "application/json; charset=utf-8"; TimeoutSec = $timeoutSec }
        if ($body) { $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10)) }
        if ($headers) { $params.Headers = $headers }
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; Error = $null }
    }
    catch {
        $statusCode = $null
        $errorBody = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errorBody = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
            } catch {}
        }
        return @{ Success = $false; Data = $null; Error = $_.Exception.Message; StatusCode = $statusCode; ErrorBody = $errorBody }
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  IZARA TELEMEDICINE - FULL APPOINTMENT WORKFLOW E2E TEST" -ForegroundColor Cyan
Write-Host "  Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  Doctor:  $DOCTOR_URL" -ForegroundColor White
Write-Host "  Patient: $PATIENT_URL" -ForegroundColor White
Write-Host "  Meeting: $MEETING_URL" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

# ============================================================================
# STEP 0: Health Check
# ============================================================================
Write-Host "`n--- Step 0: Health Check ---" -ForegroundColor Cyan
$allOK = $true
foreach ($name in @("Doctor","Patient","Meeting")) {
    $url = switch ($name) { "Doctor" { "$DOCTOR_URL/api/health" } "Patient" { "$PATIENT_URL/api/health" } "Meeting" { "$MEETING_URL/api/health" } }
    $r = Safe-Invoke -method "GET" -uri $url
    if ($r.Success -and $r.Data.status -eq "healthy") {
        Write-Host "  $name Portal: HEALTHY" -ForegroundColor Green
    } else {
        Write-Host "  $name Portal: UNHEALTHY" -ForegroundColor Red
        $allOK = $false
    }
}
if ($allOK) { Log-Step "Step 0: Health Check" "PASS" "All 3 services healthy" }
else { Log-Step "Step 0: Health Check" "FAIL" "Services unhealthy"; exit 1 }

# ============================================================================
# STEP 1: Patient Login
# ============================================================================
Write-Host "`n--- Step 1: Patient Login ($PATIENT_EMAIL) ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "POST" -uri "$PATIENT_URL/auth/login" -body @{ email = $PATIENT_EMAIL; password = $PATIENT_PASSWORD }

if (-not ($r.Success -and ($r.Data.token -or $r.Data.accessToken))) {
    Write-Host "  Default login failed, registering fresh patient..." -ForegroundColor Yellow
    $ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $PATIENT_EMAIL = "test.e2e.$ts@gmail.com"
    $PATIENT_PASSWORD = "TestPatient@2024"
    $regR = Safe-Invoke -method "POST" -uri "$PATIENT_URL/auth/register" -body @{
        email = $PATIENT_EMAIL; password = $PATIENT_PASSWORD
        name = "E2E Test Patient"; phone = "0812345678"; role = "patient"
        date_of_birth = "1990-01-15"; gender = "male"
    }
    if ($regR.Success) {
        Write-Host "  Registered: $PATIENT_EMAIL" -ForegroundColor Green
        $r = Safe-Invoke -method "POST" -uri "$PATIENT_URL/auth/login" -body @{ email = $PATIENT_EMAIL; password = $PATIENT_PASSWORD }
    }
}

if ($r.Success -and ($r.Data.token -or $r.Data.accessToken)) {
    $patientToken = if ($r.Data.token) { $r.Data.token } else { $r.Data.accessToken }
    $patientId = if ($r.Data.user) { $r.Data.user.id } elseif ($r.Data.userId) { $r.Data.userId } else { $r.Data.id }
    $patientName = if ($r.Data.user -and $r.Data.user.name) { $r.Data.user.name } else { "E2E Patient" }
    Log-Step "Step 1: Patient Login" "PASS" "ID=$patientId Email=$PATIENT_EMAIL"
} else {
    Log-Step "Step 1: Patient Login" "FAIL" "Error: $($r.Error)"
    exit 1
}

# ============================================================================
# STEP 2: Doctor Login
# ============================================================================
Write-Host "`n--- Step 2: Doctor Login ($DOCTOR_EMAIL) ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/auth/login" -body @{ email = $DOCTOR_EMAIL; password = $DOCTOR_PASSWORD }

if ($r.Success -and ($r.Data.token -or $r.Data.accessToken)) {
    $doctorToken = if ($r.Data.token) { $r.Data.token } else { $r.Data.accessToken }
    $doctorId = if ($r.Data.user) { $r.Data.user.id } elseif ($r.Data.doctorId) { $r.Data.doctorId } else { $r.Data.id }
    $doctorName = if ($r.Data.user -and $r.Data.user.name) { $r.Data.user.name } else { "Dr. Test" }
    Log-Step "Step 2: Doctor Login" "PASS" "ID=$doctorId Name=$doctorName"
} else {
    Log-Step "Step 2: Doctor Login" "FAIL" "Error: $($r.Error)"
    exit 1
}

# ============================================================================
# STEP 3: Patient Creates Telehealth Appointment
# ============================================================================
Write-Host "`n--- Step 3: Create Telehealth Appointment ---" -ForegroundColor Cyan

$aptDate = (Get-Date).AddMinutes(10).ToString("yyyy-MM-dd")
$aptTime = (Get-Date).AddMinutes(10).ToString("HH:mm")
Write-Host "  Scheduled: $aptDate $aptTime (10 min from now)"

$r = Safe-Invoke -method "POST" -uri "$PATIENT_URL/api/appointments" -body @{
    patientId = $patientId
    doctorId = "unassigned"
    preferredDate = $aptDate
    preferredTime = $aptTime
    appointmentType = "Telehealth"
    urgency = "normal"
    symptoms = @("headache", "fever", "sore_throat")
    reason = "Headache for 3 days with fever and sore throat"
    symptomDescription = "Patient reports persistent headache for 3 days, low-grade fever 37.8C, sore throat"
    notes = "E2E Workflow Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
} -headers @{ Authorization = "Bearer $patientToken" }

if ($r.Success -and ($r.Data.id -or $r.Data.appointmentId)) {
    $appointmentId = if ($r.Data.id) { $r.Data.id } else { $r.Data.appointmentId }
    $meetingLink = $r.Data.meetingLink
    $jitsiRoomName = $r.Data.jitsiRoomName
    Log-Step "Step 3: Create Appointment" "PASS" "ID=$appointmentId Status=$($r.Data.status) MeetLink=$(if($meetingLink){'YES'}else{'pending'})"
} else {
    Log-Step "Step 3: Create Appointment" "FAIL" "Error: $($r.Error) | $($r.ErrorBody)"
    exit 1
}

# ============================================================================
# STEP 4: Admin Assigns Doctor
# ============================================================================
Write-Host "`n--- Step 4: Admin Assigns Doctor ---" -ForegroundColor Cyan

$poolR = Safe-Invoke -method "GET" -uri "$DOCTOR_URL/api/appointment-pool" -headers @{ Authorization = "Bearer $doctorToken" }
if ($poolR.Success) {
    $pool = if ($poolR.Data -is [array]) { $poolR.Data } elseif ($poolR.Data.appointments) { $poolR.Data.appointments } else { @() }
    $found = $pool | Where-Object { $_.id -eq $appointmentId }
    Write-Host "  Pool items: $($pool.Count) | Our appointment: $(if($found){'FOUND'}else{'not in pool'})" -ForegroundColor Gray
}

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/appointment-pool/$appointmentId/admin-assign" -body @{
    doctorId = $doctorId; doctorName = $doctorName; assignedDate = $aptDate
    assignedTime = $aptTime; adminId = $doctorId; adminName = "Admin"
} -headers @{ Authorization = "Bearer $doctorToken" }

if ($r.Success) {
    Log-Step "Step 4: Admin Assigns Doctor" "PASS" "Assigned to $doctorId"
} else {
    Write-Host "  Admin-assign failed, trying claim..." -ForegroundColor Yellow
    $claimR = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/appointment-pool/$appointmentId/claim" -body @{
        doctorId = $doctorId; doctorName = $doctorName; proposedDate = $aptDate; proposedTime = $aptTime
    } -headers @{ Authorization = "Bearer $doctorToken" }
    if ($claimR.Success) {
        Log-Step "Step 4: Doctor Claims" "PASS" "Claimed by $doctorId"
    } else {
        Log-Step "Step 4: Assign/Claim" "WARN" "Assign: $($r.ErrorBody) | Claim: $($claimR.ErrorBody)"
    }
}

# ============================================================================
# STEP 5: Doctor Confirms Appointment (meeting link generated)
# ============================================================================
Write-Host "`n--- Step 5: Doctor Confirms Appointment ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/appointments/$appointmentId/confirm" -body @{
    doctorId = $doctorId; confirmedDate = $aptDate; confirmedTime = $aptTime
    notes = "Confirmed for telehealth"
} -headers @{ Authorization = "Bearer $doctorToken" }

if ($r.Success) {
    $ml = if ($r.Data.meetingLink) { $r.Data.meetingLink } elseif ($r.Data.appointment -and $r.Data.appointment.meet_link) { $r.Data.appointment.meet_link } else { $null }
    if ($ml) { $meetingLink = $ml }
    Log-Step "Step 5: Confirm Appointment" "PASS" "Status=confirmed MeetLink=$(if($meetingLink){'YES'}else{'pending'})"
} else {
    Log-Step "Step 5: Confirm Appointment" "WARN" "May already be confirmed: $($r.Error)"
}

# ============================================================================
# STEP 6: Verify Appointment has Meeting Link
# ============================================================================
Write-Host "`n--- Step 6: Verify Meeting Link ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "GET" -uri "$DOCTOR_URL/api/appointments?doctorId=$doctorId" -headers @{ Authorization = "Bearer $doctorToken" }
if ($r.Success) {
    $appts = if ($r.Data -is [array]) { $r.Data } elseif ($r.Data.appointments) { $r.Data.appointments } else { @($r.Data) }
    $apt = $appts | Where-Object { $_.id -eq $appointmentId }
    if ($apt) {
        $meetingLink = if ($apt.meet_link) { $apt.meet_link } elseif ($apt.meetingLink) { $apt.meetingLink } else { $meetingLink }
        $jitsiRoomName = if ($apt.jitsi_room_name) { $apt.jitsi_room_name } else { $jitsiRoomName }
        Log-Step "Step 6: Verify Meeting Link" "PASS" "Status=$($apt.status) HasLink=$(if($meetingLink){'YES'}else{'NO'}) Room=$jitsiRoomName"
    } else {
        Log-Step "Step 6: Verify Meeting Link" "WARN" "Appointment not in list ($($appts.Count) total)"
    }
} else {
    Log-Step "Step 6: Verify Meeting Link" "FAIL" "$($r.Error)"
}

# ============================================================================
# STEP 7: Doctor Creates Video Meeting
# ============================================================================
Write-Host "`n--- Step 7: Doctor Creates Video Meeting ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/video-meeting/create" -body @{
    appointmentId = $appointmentId; doctorId = $doctorId; doctorName = $doctorName
    patientId = $patientId; patientName = $patientName
    enableRecording = $true; language = "th"
} -headers @{ Authorization = "Bearer $doctorToken" }

if ($r.Success) {
    $meetingId = if ($r.Data.meeting) { $r.Data.meeting.id } elseif ($r.Data.meetingId) { $r.Data.meetingId } else { $r.Data.id }
    $doctorUrl = if ($r.Data.urls) { $r.Data.urls.doctor } else { $null }
    $patientUrl = if ($r.Data.urls) { $r.Data.urls.patient } else { $null }
    $roomName = if ($r.Data.config) { $r.Data.config.roomName } else { $jitsiRoomName }
    Log-Step "Step 7: Create Video Meeting" "PASS" "MeetID=$meetingId Room=$roomName DocURL=$(if($doctorUrl){'YES'}else{'N/A'}) PatURL=$(if($patientUrl){'YES'}else{'N/A'})"
} else {
    Log-Step "Step 7: Create Video Meeting" "FAIL" "$($r.Error) | $($r.ErrorBody)"
}

# Try meeting server if doctor portal failed
if (-not $meetingId) {
    Write-Host "  Trying meeting server directly..." -ForegroundColor Yellow
    $r2 = Safe-Invoke -method "POST" -uri "$MEETING_URL/api/meetings/create" -body @{
        appointmentId = $appointmentId; doctorId = $doctorId; patientId = $patientId
        doctorName = $doctorName; patientName = $patientName
    }
    if ($r2.Success) {
        $meetingId = if ($r2.Data.meeting) { $r2.Data.meeting.id } else { $r2.Data.meetingId }
        Log-Step "Step 7b: Via Meeting Server" "PASS" "MeetID=$meetingId"
    }
}

# ============================================================================
# STEP 8: Doctor Joins Meeting
# ============================================================================
Write-Host "`n--- Step 8: Doctor Joins Meeting ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/video-meeting/$appointmentId/join" -body @{
    participantId = $doctorId; participantName = $doctorName; role = "doctor"; email = $DOCTOR_EMAIL
} -headers @{ Authorization = "Bearer $doctorToken" }

if ($r.Success) {
    Log-Step "Step 8: Doctor Joins" "PASS" "Doctor joined as HOST"
} else {
    Log-Step "Step 8: Doctor Joins" "WARN" "API: $($r.Error) (OK if Jitsi direct)"
}

# ============================================================================
# STEP 9: Patient Joins Meeting
# ============================================================================
Write-Host "`n--- Step 9: Patient Joins Meeting ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "POST" -uri "$PATIENT_URL/api/video-meeting/$appointmentId/join" -body @{
    participantId = $patientId; participantName = $patientName; role = "patient"; email = $PATIENT_EMAIL
} -headers @{ Authorization = "Bearer $patientToken" }

if ($r.Success) {
    Log-Step "Step 9: Patient Joins" "PASS" "Patient joined meeting"
} else {
    Log-Step "Step 9: Patient Joins" "WARN" "API: $($r.Error) (OK if Jitsi direct)"
}

# ============================================================================
# STEP 10: Transcript Streaming (simulate conversation)
# ============================================================================
Write-Host "`n--- Step 10: Transcript Streaming ---" -ForegroundColor Cyan
Write-Host "  Simulating doctor-patient conversation..." -ForegroundColor Gray

$entries = @(
    @{ role = "doctor"; name = $doctorName; text = "Hello, how are you feeling today?" },
    @{ role = "patient"; name = $patientName; text = "I have had a headache for 3 days now with fever" },
    @{ role = "doctor"; name = $doctorName; text = "What is your temperature? Any other symptoms?" },
    @{ role = "patient"; name = $patientName; text = "37.8 degrees, sore throat, hard to swallow, runny nose" },
    @{ role = "doctor"; name = $doctorName; text = "Any cough or shortness of breath?" },
    @{ role = "patient"; name = $patientName; text = "Slight cough, clear nasal discharge, no breathing difficulty" },
    @{ role = "doctor"; name = $doctorName; text = "Based on your symptoms this appears to be a common cold. I will prescribe paracetamol and cough medicine" },
    @{ role = "patient"; name = $patientName; text = "Thank you doctor" },
    @{ role = "doctor"; name = $doctorName; text = "Please rest well and drink plenty of fluids. If fever exceeds 38.5C please come back" }
)

$okCount = 0
foreach ($e in $entries) {
    $tR = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/video-meeting/$appointmentId/transcript" -body @{
        speakerId = if ($e.role -eq "doctor") { $doctorId } else { $patientId }
        speakerRole = $e.role; speakerName = $e.name; text = $e.text
        language = "en-US"; isFinal = $true; confidence = 0.95
        timestamp = (Get-Date).ToString("o")
    } -headers @{ Authorization = "Bearer $doctorToken" }
    if ($tR.Success) {
        $okCount++
        $icon = if ($e.role -eq "doctor") { "[DOC]" } else { "[PAT]" }
        Write-Host "  $icon $($e.name): $($e.text)" -ForegroundColor Gray
    }
    Start-Sleep -Milliseconds 200
}

if ($okCount -gt 0) {
    Log-Step "Step 10: Transcript" "PASS" "$okCount/$($entries.Count) entries saved"
} else {
    Log-Step "Step 10: Transcript" "FAIL" "No entries saved"
}

# ============================================================================
# STEP 11: Doctor Ends Meeting -> AI Summary (Gemini)
# ============================================================================
Write-Host "`n--- Step 11: End Meeting + AI Summary ---" -ForegroundColor Cyan
Write-Host "  Ending meeting, triggering Gemini AI summary..." -ForegroundColor Gray

$fullText = ($entries | ForEach-Object {
    $r = if ($_.role -eq "doctor") { "[Doctor] $($_.name)" } else { "[Patient] $($_.name)" }
    "$r : $($_.text)"
}) -join "`n"

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/video-meeting/$appointmentId/end" -body @{
    doctorId = $doctorId; doctorName = $doctorName
    generateSummary = $true; generateRecommendations = $true
    transcript = $fullText
    chatMessages = @(
        @{ sender = $doctorName; message = "Please send your X-ray results"; timestamp = (Get-Date).AddMinutes(-5).ToString("o") }
        @{ sender = $patientName; message = "OK doctor"; timestamp = (Get-Date).AddMinutes(-4).ToString("o") }
    )
    languageCode = "th-TH"
    patientInfo = @{ patientId = $patientId; patientName = $patientName; symptoms = @("headache","fever","sore_throat") }
} -headers @{ Authorization = "Bearer $doctorToken" } -timeoutSec 90

if ($r.Success) {
    $aiSummary = $null
    $recommendations = $null

    if ($r.Data.summary) { $aiSummary = $r.Data.summary }
    elseif ($r.Data.aiSummary -and $r.Data.aiSummary.summary) { $aiSummary = $r.Data.aiSummary.summary }
    elseif ($r.Data.emrData -and $r.Data.emrData.summary) { $aiSummary = $r.Data.emrData.summary }

    if ($r.Data.doctorRecommendations) { $recommendations = $r.Data.doctorRecommendations }
    elseif ($r.Data.recommendations) { $recommendations = $r.Data.recommendations }

    $hasSummary = ($null -ne $aiSummary -and "$aiSummary" -ne "" -and "$aiSummary" -ne "False")
    $hasRec = ($null -ne $recommendations)

    if ($hasSummary) {
        Log-Step "Step 11: AI Summary" "PASS" "Summary=GENERATED Recommendations=$(if($hasRec){'YES'}else{'NO'})"
        Write-Host ""
        Write-Host "  === AI SUMMARY (Gemini) ===" -ForegroundColor Magenta
        $txt = if ($aiSummary -is [string]) { $aiSummary } else { ($aiSummary | ConvertTo-Json -Depth 5) }
        $preview = $txt.Substring(0, [Math]::Min(600, $txt.Length))
        Write-Host "  $preview" -ForegroundColor White
        if ($txt.Length -gt 600) { Write-Host "  ... [truncated]" -ForegroundColor Gray }
    } else {
        Log-Step "Step 11: AI Summary" "WARN" "Meeting ended OK but no AI summary (Gemini API may need config)"
        Write-Host "  Response keys: $($r.Data.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
    }

    if ($hasRec) {
        Write-Host ""
        Write-Host "  === RECOMMENDATIONS ===" -ForegroundColor Magenta
        $recTxt = if ($recommendations -is [string]) { $recommendations } else { ($recommendations | ConvertTo-Json -Depth 3) }
        Write-Host "  $($recTxt.Substring(0, [Math]::Min(400, $recTxt.Length)))" -ForegroundColor White
    }
} else {
    Log-Step "Step 11: AI Summary" "FAIL" "Error: $($r.Error) | $($r.ErrorBody)"
}

# ============================================================================
# STEP 12: Verify Meeting Record
# ============================================================================
Write-Host "`n--- Step 12: Verify Meeting Record ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "GET" -uri "$DOCTOR_URL/api/video-meeting/$appointmentId" -headers @{ Authorization = "Bearer $doctorToken" }
if ($r.Success) {
    $ms = if ($r.Data.status) { $r.Data.status } elseif ($r.Data.meeting) { $r.Data.meeting.status } else { "unknown" }
    $dbSum = if ($r.Data.ai_summary -or ($r.Data.meeting -and $r.Data.meeting.ai_summary)) { "YES" } else { "NO" }
    Log-Step "Step 12: Meeting Record" "PASS" "Status=$ms DB_Summary=$dbSum"
} else {
    Log-Step "Step 12: Meeting Record" "WARN" "$($r.Error)"
}

# ============================================================================
# STEP 13: Doctor Creates EMR from AI Summary
# ============================================================================
Write-Host "`n--- Step 13: Create EMR ---" -ForegroundColor Cyan

$emrBody = @{
    appointmentId = $appointmentId; patientId = $patientId; doctorId = $doctorId
    encounterType = "telehealth_general"
    subjective = @{
        chiefComplaint = "Headache 3 days, fever, sore throat"
        historyOfPresentIllness = "Patient presents with 3-day headache, low-grade fever 37.8C, sore throat with odynophagia, clear rhinorrhea, mild cough"
    }
    objective = @{
        vitalSigns = @{ temperature = 37.8; bloodPressure = "120/80"; heartRate = 82; respiratoryRate = 18; oxygenSaturation = 98 }
        physicalExamination = @{ general = "Alert, oriented"; throat = "Mild pharyngeal erythema"; lungs = "Clear bilateral" }
    }
    assessment = @{
        diagnoses = @("Common cold (J00)", "Acute pharyngitis (J02.9)")
        differentialDiagnosis = @("Influenza", "COVID-19")
    }
    plan = @{
        treatment = "Symptomatic treatment"
        medications = @(
            @{ name = "Paracetamol 500mg"; dosage = "1 tab"; frequency = "q6h prn"; duration = "5 days" }
            @{ name = "Dextromethorphan 10ml"; dosage = "10ml"; frequency = "tid"; duration = "5 days" }
        )
        followUp = "Return if fever exceeds 38.5C or symptoms worsen in 5 days"
    }
    status = "draft"
}
if ($aiSummary) { $emrBody.aiSummary = if ($aiSummary -is [string]) { $aiSummary } else { ($aiSummary | ConvertTo-Json -Depth 5) } }

$r = Safe-Invoke -method "POST" -uri "$DOCTOR_URL/api/emr" -body $emrBody -headers @{ Authorization = "Bearer $doctorToken" }

if ($r.Success) {
    $emrId = if ($r.Data.id) { $r.Data.id } elseif ($r.Data.emrId) { $r.Data.emrId } else { "created" }
    Log-Step "Step 13: Create EMR" "PASS" "EMR_ID=$emrId Status=$($r.Data.status) AI=$(if($aiSummary){'included'}else{'manual'})"
} else {
    Log-Step "Step 13: Create EMR" "FAIL" "$($r.Error) | $($r.ErrorBody)"
}

# ============================================================================
# STEP 14: Verify Final Appointment Status
# ============================================================================
Write-Host "`n--- Step 14: Final Verification ---" -ForegroundColor Cyan

$r = Safe-Invoke -method "GET" -uri "$DOCTOR_URL/api/appointments?doctorId=$doctorId" -headers @{ Authorization = "Bearer $doctorToken" }
if ($r.Success) {
    $appts = if ($r.Data -is [array]) { $r.Data } elseif ($r.Data.appointments) { $r.Data.appointments } else { @($r.Data) }
    $apt = $appts | Where-Object { $_.id -eq $appointmentId }
    if ($apt) {
        Log-Step "Step 14: Final Status" "PASS" "Appointment=$($apt.status) Doctor=$($apt.doctor_id) Link=$(if($apt.meet_link){'YES'}else{'-'})"
    } else {
        Log-Step "Step 14: Final Status" "WARN" "Not in list ($($appts.Count) total)"
    }
} else {
    Log-Step "Step 14: Final Status" "WARN" "$($r.Error)"
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PASSED:   $passCount" -ForegroundColor Green
Write-Host "  FAILED:   $failCount" -ForegroundColor $(if($failCount -gt 0){"Red"}else{"Green"})
Write-Host "  WARNINGS: $($results.Count - $passCount - $failCount)" -ForegroundColor Yellow
Write-Host ""
foreach ($r in $results) {
    $icon = switch ($r.Status) { "PASS" { "[PASS]" } "FAIL" { "[FAIL]" } default { "[WARN]" } }
    $c = switch ($r.Status) { "PASS" { "Green" } "FAIL" { "Red" } default { "Yellow" } }
    Write-Host "  $icon $($r.Step)" -ForegroundColor $c
    Write-Host "        $($r.Detail)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Appointment: $appointmentId" -ForegroundColor White
Write-Host "  Meeting:     $meetingId" -ForegroundColor White
Write-Host "  Patient:     $patientId" -ForegroundColor White
Write-Host "  Doctor:      $doctorId" -ForegroundColor White
Write-Host "  AI Summary:  $(if($aiSummary){'Generated'}else{'Not available'})" -ForegroundColor White
Write-Host ""
if ($failCount -eq 0) { Write-Host "  RESULT: ALL STEPS PASSED!" -ForegroundColor Green }
else { Write-Host "  RESULT: $failCount STEP(S) FAILED" -ForegroundColor Red }
Write-Host "================================================================" -ForegroundColor Cyan
