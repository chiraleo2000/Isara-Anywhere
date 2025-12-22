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

## ✅ E2E Test Results (December 15, 2025)

| Test Suite | Tests | Passed | Duration | Status |
|------------|-------|--------|----------|--------|
| Appointment Workflow | 27 | 27 | 527.73s | ✅ 100% |
| Medical Content | - | - | 430.91s | ✅ PASSED |
| Health Records | - | - | 509.62s | ✅ PASSED |
| Dual Portal Video Meeting | 24 | 24 | 304.70s | ✅ 100% |

**Total Pass Rate: 100%**

### Test Features Verified:
- ✅ Patient login with demo.test@gmail.com
- ✅ Doctor login with doctor.test@izara.com
- ✅ Admin login with admin.test@izara.com
- ✅ Telehealth video meeting access
- ✅ Microphone and camera permissions
- ✅ Jitsi Meet integration
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
**Last Updated:** December 15, 2025
