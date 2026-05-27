#!/usr/bin/env pwsh
# Test script: Verify doctor approval fix on cloud
$ErrorActionPreference = "Continue"
$base = "https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Magenta
Write-Host "  DOCTOR APPROVAL FIX - Cloud Verification" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta
Write-Host ""

# === STEP 1: HEALTH CHECK ===
Write-Host "[1/5] Health Check..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$base/api/health" -Method GET -TimeoutSec 60
Write-Host "  OK: $($health.status) - $($health.service)" -ForegroundColor Green

# === STEP 2: ADMIN LOGIN ===
Write-Host ""
Write-Host "[2/5] Admin Login..." -ForegroundColor Cyan
$body = '{"email":"doctor.test@izara.com","password":"IzaraDoctor@2024"}'
$r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
$token = $r.token
$adminId = $r.user.id
Write-Host "  OK: AdminID=$adminId" -ForegroundColor Green

$headers = @{ Authorization = "Bearer $token" }

# === STEP 3: FIND test.example@bkkhs.co.th ===
Write-Host ""
Write-Host "[3/5] Finding test.example@bkkhs.co.th..." -ForegroundColor Cyan
$targetId = $null
$targetEmail = "test.example@bkkhs.co.th"

# Try users list first
$usersRes = $null
try {
    $usersRes = Invoke-RestMethod -Uri "$base/api/admin/users?role=doctor" -Headers $headers -TimeoutSec 30
}
catch {
    Write-Host "  Users list error: $_" -ForegroundColor Yellow
}

if ($usersRes) {
    $allUsers = $usersRes.users
    if (-not $allUsers) { $allUsers = $usersRes }
    foreach ($u in $allUsers) {
        if ($u.email -eq $targetEmail) {
            $targetId = $u.id
            Write-Host "  Found in users: ID=$targetId is_active=$($u.is_active) approval=$($u.approval_status)" -ForegroundColor Yellow
            break
        }
    }
}

# Try pending approvals
if (-not $targetId) {
    $pendingRes = $null
    try {
        $pendingRes = Invoke-RestMethod -Uri "$base/auth/pending-approvals" -Headers $headers -TimeoutSec 30
    }
    catch {
        Write-Host "  Pending endpoint error: $_" -ForegroundColor Yellow
    }
    if ($pendingRes) {
        $pendingList = $pendingRes.pendingApprovals
        if (-not $pendingList) { $pendingList = $pendingRes }
        foreach ($p in $pendingList) {
            if ($p.email -eq $targetEmail) {
                $targetId = $p.userId
                Write-Host "  Found in pending: ID=$targetId" -ForegroundColor Yellow
                break
            }
        }
    }
}

if (-not $targetId) {
    Write-Host "  User $targetEmail not found - registering new test doctor..." -ForegroundColor Yellow
    $regBody = '{"email":"test.example@bkkhs.co.th","password":"BkkhsDoctor@2024","name":"Test Example Doctor","specialty":"General Practice","medicalLicenseNumber":"TH-TEST-99999","status":"pending_approval"}'
    try {
        $regRes = Invoke-RestMethod -Uri "$base/api/auth/register" -Method POST -Body $regBody -ContentType "application/json" -TimeoutSec 30
        $targetId = $regRes.user.id
        Write-Host "  Registered: ID=$targetId" -ForegroundColor Green
    }
    catch {
        Write-Host "  Registration response: $_" -ForegroundColor Yellow
        # Re-check users
        try {
            $usersRes2 = Invoke-RestMethod -Uri "$base/api/admin/users?role=doctor" -Headers $headers -TimeoutSec 30
            $allUsers2 = $usersRes2.users
            if (-not $allUsers2) { $allUsers2 = $usersRes2 }
            foreach ($u2 in $allUsers2) {
                if ($u2.email -eq $targetEmail) {
                    $targetId = $u2.id
                    Write-Host "  Found after retry: ID=$targetId is_active=$($u2.is_active)" -ForegroundColor Yellow
                    break
                }
            }
        }
        catch {
            Write-Host "  Retry error: $_" -ForegroundColor Red
        }
    }
}

if (-not $targetId) {
    Write-Host ""
    Write-Host "  CANNOT FIND OR CREATE $targetEmail - ABORTING" -ForegroundColor Red
    exit 1
}

# === STEP 4: APPROVE THE DOCTOR ===
Write-Host ""
Write-Host "[4/5] Approving Doctor $targetId..." -ForegroundColor Cyan
$approveBody = "{`"userId`":`"$targetId`",`"adminId`":`"$adminId`"}"
try {
    $approveRes = Invoke-RestMethod -Uri "$base/api/admin/approve-doctor" -Method POST -Body $approveBody -ContentType "application/json" -Headers $headers -TimeoutSec 30
    Write-Host "  Approved: $($approveRes.message)" -ForegroundColor Green
    if ($approveRes.doctor) {
        Write-Host "  is_active=$($approveRes.doctor.is_active) approval_status=$($approveRes.doctor.approval_status)" -ForegroundColor Green
    }
}
catch {
    Write-Host "  Approve error: $_" -ForegroundColor Red
}

# Small delay for DB propagation
Start-Sleep -Seconds 2

# === STEP 5: LOGIN AS APPROVED DOCTOR ===
Write-Host ""
Write-Host "[5/5] Login as $targetEmail (should work after approval)..." -ForegroundColor Cyan
$docBody = '{"email":"test.example@bkkhs.co.th","password":"BkkhsDoctor@2024"}'
try {
    $docLogin = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -Body $docBody -ContentType "application/json" -TimeoutSec 30
    Write-Host "  LOGIN SUCCESS!" -ForegroundColor Green
    Write-Host "  User: $($docLogin.user.email) Role: $($docLogin.user.role) Active: $($docLogin.user.isActive)" -ForegroundColor Green
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "  FIX VERIFIED - Doctor can login after approval!" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
}
catch {
    $statusCode = 0
    if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
    Write-Host "  LOGIN FAILED! Status=$statusCode" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Red
    Write-Host "  FIX NOT WORKING - Still getting login error!" -ForegroundColor Red
    Write-Host "===============================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}
