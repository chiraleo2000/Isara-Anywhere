# การเข้าถึงระบบ (Cloud — dev-testing)

> อัปเดต: 27 พฤษภาคม 2569 | Environment: Google Cloud Run (asia-southeast1) | Project: izara-telemedicine  
> **Source repo:** v1.7.33 · **Cloud Run image tag:** v1.7.12 (deployed 2026-05-27)

เอกสารนี้สรุปวิธีการเข้าถึงบริการบน Google Cloud (environment: dev-testing)

## บริการที่ให้บริการ

| Service | URL | Revision | Image | สถานะ |
| ------- | --- | -------- | ----- | ------ |
| Patient Portal | https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app | 00107-nmv | v1.7.12 | ✅ healthy (port 3005) |
| Doctor Portal | https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app | 00132-ts6 | v1.7.12 | ✅ healthy (port 8080) |
| Meeting Server | https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app | latest | v1.7.12 | ✅ healthy |

**ฐานข้อมูล:** Cloud SQL `izara-telemedicine:asia-southeast1:izara-postgres-server` (unix socket `/cloudsql/...`) — ไม่ใช่ GCE VM

## Demo Users (สำหรับทดสอบ)

> หลัง `npm run cleanup:cloud-test-only` บัญชี demo จะถูกลบจาก cloud DB

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient 1 | `demo.test@gmail.com` | `P@ssw0rd` |
| Patient 2 | `Somchai.Mankong@gmail.com` | `P@ssw0rd` |
| Patient 3 | `Anan.Khayanrian@gmail.com` | `P@ssw0rd` |
| Doctor | `doctor.test@izara.com` | `IzaraDoctor@2024` |
| Admin | `admin.test@izara.com` | `IzaraAdmin@2024` |

## วิธีการใช้งานด่วน

### 1. เปิดบริการในเบราว์เซอร์

- **ผู้ป่วย:** [Patient login](https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app/login)
- **แพทย์/แอดมิน:** [Doctor login](https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app/login)

### 2. ตรวจสอบสุขภาพบริการ

```bash
curl https://izara-patient-portal-dev-testing-hvht4obouq-as.a.run.app/health
curl https://izara-doctor-portal-dev-testing-hvht4obouq-as.a.run.app/health
curl https://izara-meeting-server-dev-testing-hvht4obouq-as.a.run.app/health
```

### 3. Deploy ให้ตรงกับ cloud

```bash
# Patient
cd Isara-patient-portal && gcloud builds submit --config=cloudbuild.yaml --project=izara-telemedicine

# Doctor
cd Isara-doctor-portal && gcloud builds submit --config=cloudbuild.yaml --project=izara-telemedicine
```

`cloudbuild.yaml` ทั้งสองพอร์ทัลตั้งค่า `_TAG=v1.7.12`, Cloud SQL, min-instances=1 ให้ตรง revision ปัจจุบัน

## หมายเหตุ

- URL แบบ `*-724889190329.asia-southeast1.run.app` เป็น generation เก่า — ใช้ `*-hvht4obouq-as.a.run.app` แทน
- Patient `/health` รายงาน `"version": "1.7.3"` (ใน container); image tag คือ `v1.7.12`
- Doctor unified image: nginx :8080 → auth :3011, API :3009, WebSocket `/ws` → :3011
