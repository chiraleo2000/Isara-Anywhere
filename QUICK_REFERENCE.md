# 🏥 Izara Telemedicine - Quick Reference

**Version:** 4.0.0  
**Storage:** PostgreSQL Only (**NO GCS**)  
**Last Updated:** January 23, 2026

---

## Portal URLs (ลิงก์เข้าใช้งาน)

| Environment | Patient Portal | Doctor Portal |
|-------------|----------------|---------------|
| **Local** | http://localhost:3005 | http://localhost:3010 |
| **Cloud** | https://izara-patient-portal-724889190329.asia-southeast1.run.app | https://izara-doctor-portal-724889190329.asia-southeast1.run.app |

## Test Credentials (บัญชีทดสอบ)

| Role | Email | Password | Thai Name |
|------|-------|----------|-----------|
| **Patient 0** | demo.test@gmail.com | P@ssw0rd | นาย ทดสอบ ระบบ |
| **Patient 1** | Somchai.Mankong@gmail.com | P@ssw0rd | นายสมชาย มั่นคง |
| **Patient 2** | Anan.Khayanrian@gmail.com | P@ssw0rd | นายอนันต์ ขยันเรียน |
| **Doctor** | doctor.test@izara.com | IzaraDoctor@2024 | นพ. ทดสอบ แพทย์ดี |
| **Admin** | admin.test@izara.com | IzaraAdmin@2024 | นพ. ผู้ดูแลระบบ ใจดี |

## Patient Data Summary (ข้อมูลผู้ป่วย)

### Patient 1: นายสมชาย มั่นคง (Somchai Mankong)
- **HN**: HN-2024-001234
- **Age**: 45 years old
- **Blood Type**: O+
- **Conditions**: Essential Hypertension (I10)
- **Medications**: Amlodipine 5mg QD
- **Allergies**: None

### Patient 2: นายอนันต์ ขยันเรียน (Anan Khayanrian)
- **HN**: HN-2018-005678
- **Age**: 58 years old
- **Blood Type**: A+
- **Conditions**: 
  - Type 2 Diabetes Mellitus (E11.9) - HbA1c 7.2%
  - Chronic Kidney Disease Stage 3b (N18.4) - eGFR 38
  - Essential Hypertension (I10)
- **Medications**: 
  - Metformin 500mg BID (dose adjustment needed for CKD)
  - Lisinopril 10mg QD
  - Atorvastatin 20mg QD
- **Allergies**: 
  - ⚠️ Penicillin (Severe - Anaphylaxis)
  - ⚠️ Sulfa drugs (Moderate - Rash)

## Quick Commands

```powershell
# Local Deployment
docker-compose up -d
docker exec -i izara-postgres psql -U postgres -d izara_phase1 < scripts/db/init-database.sql
npx playwright test scripts/tests/e2e/comprehensive-tests.spec.js

# Cloud Deployment
.\scripts\deploy.ps1 -Target cloud

# Run Tests with UI (headed mode)
npx playwright test --headed
```
