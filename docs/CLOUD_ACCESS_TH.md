# การเข้าถึงระบบ (Cloud — dev-testing)

> อัปเดต: 22 พฤษภาคม 2569 | Environment: Google Cloud Run (asia-southeast1) | Project: izara-telemedicine

เอกสารนี้สรุปวิธีการเข้าถึงบริการบน Google Cloud (environment: dev-testing)

## บริการที่ให้บริการ

| Service | URL | สถานะ |
| ------- | --- | ------ |
| Meeting Server | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | ✅ healthy, DB connected |
| Patient Portal | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | ✅ healthy |
| Doctor Portal  | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | ✅ healthy |

## Demo Users (สำหรับทดสอบ)

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient 1 | `demo.test@gmail.com` | `P@ssw0rd` |
| Patient 2 | `Somchai.Mankong@gmail.com` | `P@ssw0rd` |
| Patient 3 | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` |
| Doctor | `doctor.test@izara.com` | `IzaraDoctor@2024` |
| Admin | `admin.test@izara.com` | `IzaraAdmin@2024` |



## วิธีการใช้งานด่วน

### 1. เปิดบริการในเบราว์เซอร์

- **Patient Portal:** [izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app](https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app) → คลิก "เข้าสู่ระบบ"
- **Doctor Portal:** [izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app](https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app) → คลิก "เข้าสู่ระบบ"

### 2. เชื่อมต่อด้วย demo user (ตัวอย่าง patient)

```bash
# ตัวอย่างเรียก API เข้าล็อกอิน (ใช้ PowerShell/Terminal)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"demo.test@gmail.com","password":"P@ssw0rd"}' \
  https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/api/auth/login
```

### 3. ตรวจสอบสถานะบริการ / database health

```bash
# Meeting server health
curl -s https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app/health | jq

# Patient portal API health
curl -s https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/api/health | jq

# Doctor portal API health
curl -s https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/api/health | jq
```

## ข้อสังเกต

- หากหน้าเว็บโหลดได้และ `/api/health` ตอบว่า `healthy` หรือ `ok` แสดงว่าบริการเชื่อมต่อฐานข้อมูลได้เรียบร้อย
- หากต้องการตรวจสอบ API ที่ต้องการสิทธิ์ ให้เรียก endpoint ด้วย `Authorization: Bearer <token>` ที่ได้จากการล็อกอิน
- Cloud Run จะ **cold start** ครั้งแรกอาจใช้เวลา 10–30 วินาที ครั้งต่อไปจะเร็วขึ้น
- หาก session หมดอายุให้ล็อกอินใหม่ — token มีอายุ 24 ชั่วโมง

## สถานะล่าสุด (22 พฤษภาคม 2569)

| รายการ | ผล |
| ------ | -- |
| Cloud E2E Tests | ✅ 21/21 PASSED |
| Unit Tests | ✅ 2,524/2,524 PASSED (78 files) |
| UI Tests Group A | ✅ 10/10 PASSED |
| UI Tests Group D | ✅ 5/5 PASSED |
| Docker Containers | ✅ Running (patient:3005, doctor:3010, meeting:3020) |
| PostgreSQL | ✅ pgvector/pg18 — connected |

---

ไฟล์นี้ถูกเพิ่มเข้า repo เพื่อให้ทีมงานสามารถเข้าถึงข้อมูลการทดสอบบน Cloud ได้อย่างรวดเร็ว
