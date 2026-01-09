# Izara Telehealth - Test Accounts

## Development Test Accounts

Use these accounts for testing in development environment.

---

## 👤 Patient Account

| Field | Value |
|-------|-------|
| Email | `demo.test@gmail.com` |
| Password | `P@ssw0rd` |
| User ID | `PAT-DEMO-001` |
| Portal | http://localhost:3005 |

### Test Patient Profile

```json
{
  "id": "PAT-DEMO-001",
  "email": "demo.test@gmail.com",
  "name": "Demo Patient",
  "nameThai": "ผู้ป่วยทดสอบ",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "bloodType": "A+",
  "phone": "0891234567"
}
```

---

## 👨‍⚕️ Doctor Account

| Field | Value |
|-------|-------|
| Email | `doctor.test@izara.com` |
| Password | `IzaraDoctor@2024` |
| User ID | `DOC-DEMO-001` |
| Portal | http://localhost:3010 |
| Role | Doctor |

### Test Doctor Profile

```json
{
  "id": "DOC-DEMO-001",
  "email": "doctor.test@izara.com",
  "name": "Dr. Test Doctor",
  "nameThai": "หมอทดสอบ",
  "specialty": "Internal Medicine",
  "medicalLicenseNumber": "MD-123456",
  "hospital": "Izara Test Hospital",
  "isApproved": true,
  "isActive": true
}
```

---

## 👑 Admin Account

| Field | Value |
|-------|-------|
| Email | `admin.test@izara.com` |
| Password | `IzaraAdmin@2024` |
| User ID | `ADMIN-001` |
| Portal | http://localhost:3010 |
| Role | Admin |

### Test Admin Profile

```json
{
  "id": "ADMIN-001",
  "email": "admin.test@izara.com",
  "name": "Admin User",
  "role": "admin",
  "isAdmin": true,
  "adminPrivileges": {
    "canManageDoctors": true,
    "canManagePatients": true,
    "canManageAppointments": true,
    "canViewAnalytics": true,
    "canManageSettings": true,
    "canAssignRoles": true,
    "level": "super_admin"
  }
}
```

---

## 👥 Patient Relative (Demo2) Account

| Field | Value |
|-------|-------|
| Email | `demo2.test@gmail.com` |
| Password | `P@ssw0rd` |
| User ID | `PAT-DEMO2-001` |
| Portal | http://localhost:3005 |
| Role | Patient Relative |

### Test Patient Relative Profile

```json
{
  "id": "PAT-DEMO2-001",
  "email": "demo2.test@gmail.com",
  "name": "Demo Patient Relative",
  "nameThai": "ญาติผู้ป่วยทดสอบ",
  "dateOfBirth": "1985-08-20",
  "gender": "female",
  "phone": "0899876543"
}
```

---

## 👨‍⚕️ Unit Test Doctor Account

| Field | Value |
|-------|-------|
| Email | `doctorunit.test@izara.com` |
| Password | `P@ssw0rd` |
| User ID | `DOC-UNIT-001` |
| Portal | http://localhost:3010 |
| Role | Doctor |

### Test Unit Doctor Profile

```json
{
  "id": "DOC-UNIT-001",
  "email": "doctorunit.test@izara.com",
  "name": "Dr. Unit Test",
  "nameThai": "หมอทดสอบยูนิต",
  "specialty": "Family Medicine",
  "medicalLicenseNumber": "MD-UNIT-001",
  "hospital": "Izara Test Hospital",
  "isApproved": true,
  "isActive": true
}
```

---

## 🧪 Testing Scenarios

### Patient Portal Tests

| Test | Steps |
|------|-------|
| Login | Enter patient credentials → Dashboard |
| Book Appointment | Dashboard → Book → Fill form → Submit |
| View Health Records | Dashboard → Health Studio → PHR |
| Update Profile | Settings → Edit → Save |
| AI Chat | Dashboard → AI Chat → Ask question |

### Doctor Portal Tests

| Test | Steps |
|------|-------|
| Login | Enter doctor credentials → Dashboard |
| View Queue | Dashboard → Appointments → Patient Queue |
| Confirm Appointment | Queue → Select → Confirm → Set time |
| Create EMR | Scheduled → Select → Open EMR → Fill SOAP |
| Clinical Resources | Sidebar → Clinical Resources → Browse |

### Admin Portal Tests

| Test | Steps |
|------|-------|
| Login | Enter admin credentials → Dashboard |
| Approve Doctor | Doctor Management → Pending → Approve |
| Change Role | Doctor Management → Find user → Change role |
| View All Appointments | Appointments → All Appointments tab |
| Manage Consultants | Medical Consultants → Add/Edit/Delete |

---

## 🔧 Creating New Test Users

### Create Patient

```powershell
# Via API
curl -X POST http://localhost:3011/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newpatient@test.com",
    "password": "Test@1234",
    "name": "New Patient",
    "phone": "0800000000"
  }'
```

### Create Doctor

```powershell
# Via API
curl -X POST http://localhost:3011/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newdoctor@test.com",
    "password": "Doctor@1234",
    "name": "New Doctor",
    "medicalLicenseNumber": "MD-999999",
    "specialty": "General Practice"
  }'

# Note: Doctor needs admin approval before login
```

---

## 📍 Portal URLs

| Portal | URL | Description |
|--------|-----|-------------|
| Patient Portal | http://localhost:3005 | Vite dev server for patient app |
| Doctor Portal | http://localhost:3010 | Vite dev server for doctor app |
| Auth Server | http://localhost:3011 | Authentication with bcrypt |
| GCS API | http://localhost:3012 | Google Cloud Storage proxy |
| Doctor Main API | http://localhost:3009 | Clinical operations |
| Patient Backend | http://localhost:3004 | Patient portal backend |

---

## ✅ E2E Test Results (January 9, 2026 - v1.2.1)

| Test Suite | Tests | Passed | Duration | Status |
|------------|-------|--------|----------|--------|
| Meeting API Tests (Local) | 52 | 52 | ~60s | ✅ 100% |
| Meeting API Tests (Cloud) | 52 | 52 | ~90s | ✅ 100% |
| Cloud Run E2E Tests | 51 | 51 | ~70s | ✅ 100% |
| Unit Tests | 40 | 40 | ~30s | ✅ 100% |
| 4-User Meeting UI Tests (Local) | 33 | 33 | ~45s | ✅ 100% |
| 4-User Meeting UI Tests (Cloud) | 33 | 33 | ~60s | ✅ 100% |
| External Guest Access Tests (Local) | 105 | 105 | ~120s | ✅ 100% |
| External Guest Access Tests (Cloud) | 105 | 105 | ~180s | ✅ 100% |

**Total Pass Rate: 400+/400+ (100%)**

### Test Features Verified:
- ✅ Patient login with demo.test@gmail.com
- ✅ Doctor login with doctor.test@izara.com
- ✅ Patient Relative login with demo2.test@gmail.com
- ✅ Unit Test Doctor login with doctorunit.test@izara.com
- ✅ Doctor as HOST with moderator controls
- ✅ Patient joins via lobby (doctor approval)
- ✅ External guest invites (non-registered users)
- ✅ All email domains supported (Gmail, Hotmail, Yahoo, Outlook, .co.th, .ac.th)
- ✅ Video/Audio controls (ON by default)
- ✅ Video recording & transcription
- ✅ AI-powered meeting summaries (Gemini 2.5 Flash Lite)
- ✅ EMR SOAP documentation
- ✅ E-Prescribing workflow
- ✅ Health records management
- ✅ Medical content creation

---

## ⚠️ Important Notes

1. **Test accounts are for development only** - Do not use in production

2. **Passwords meet security requirements**:
   - 8+ characters
   - Uppercase + lowercase
   - Numbers
   - Special characters

3. **Sessions expire after 24 hours** - Re-login if testing spans multiple days

4. **Rate limits apply** - 10 login attempts per 15 minutes per IP

5. **Account lockout** - 5 failed attempts = 30 minute lockout

---
**Last Updated:** January 9, 2026
**Version:** 1.2.1
