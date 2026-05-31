# การเข้าถึงระบบ (Cloud — dev-testing)

> อัปเดต: 31 พฤษภาคม 2569 | Environment: Google Cloud Run (asia-southeast1) | Project: izara-telemedicine  
> **Defect track:** v1.7.48 · Gates: unit **2736**, Defect-regression **36/36**, cloud full **85/85** headed (2026-05-31)

## บริการที่ให้บริการ (URL ที่ใช้งานจริง)

| Service | URL | Revision | Image |
| ------- | --- | -------- | ----- |
| Patient Portal | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | **00113-psw** (100%) | v1.7.37 |
| Doctor Portal | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | **00138-2k5** (100%) | v1.7.37 |
| Meeting Server | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | latest | v1.7.37 |

**Login**

- ผู้ป่วย: https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login
- แพทย์/แอดมิน: https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login

**ฐานข้อมูล:** Cloud SQL `izara-postgres-server`

> GCP อาจแสดง URL รูปแบบ `*-hvht4obouq-as.a.run.app` ด้วย (alias ของ service เดียวกัน) — โปรเจกต์นี้ใช้ **`724889190329.asia-southeast1.run.app`** เป็นหลัก

## Health check

```bash
curl https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/health
curl https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/health
curl https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app/health
```

## Demo users

> หลัง `npm run cleanup:cloud-test-only` บัญชี demo จะถูกลบจาก cloud DB

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient | demo.test@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |
