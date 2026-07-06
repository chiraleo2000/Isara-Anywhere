# การเข้าถึงระบบ (Cloud — dev-testing)

> อัปเดต: 2 กรกฎาคม 2569 | Environment: Google Cloud Run (asia-southeast1) | Project: izara-telemedicine  
> **Release track:** v1.7.60 · deploy `npm run cloud:deploy -- -Tag v1.7.60` · cloud gate `npm run test:cloud:release-gate`

## บริการที่ให้บริการ (URL ที่ใช้งานจริง)

| Service | URL | Revision | Image |
| ------- | --- | -------- | ----- |
| Patient Portal | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | **00130-9qx** (100%) | v1.7.60 |
| Doctor Portal | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | **00162-kkt** (100%) | v1.7.60 |
| Meeting Server | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | **00236-zfs** (100%) | v1.7.60 |

**Login**

- ผู้ป่วย: https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/login
- แพทย์/แอดมิน: https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/login

**ฐานข้อมูล:** GCE VM PostgreSQL `35.240.157.230:5432` (`izara_phase1`) — **ไม่ใช้ Cloud SQL** (ประหยัดค่าใช้จ่าย)

**AI model:** `gemini-3.1-flash-lite` (ตัวเลือกราคาถูกที่ทดสอบแล้ว — อย่าใช้ `gemini-2.5-flash-lite` เพราะ AI ล้มเหลว)

> GCP อาจแสดง URL รูปแบบ `*-hvht4obouq-as.a.run.app` ด้วย (alias ของ service เดียวกัน) — โปรเจกต์นี้ใช้ **`724889190329.asia-southeast1.run.app`** เป็นหลัก

## Health check

```bash
curl https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app/health
curl https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app/health
curl https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app/health
```

## Cloud Run sizing (cost profile)

| Service | CPU | RAM | Scale | Notes |
| ------- | --- | --- | ----- | ----- |
| Patient / Doctor / Meeting | 1 | 1 GiB | min **0**, max **2** | Scale-to-zero dev-testing; `--no-cpu-boost`; portals `--concurrency=80`, meeting `--concurrency=40` |

Apply without rebuild:

```powershell
.\scripts\deploy\patch-cloud-run-cost.ps1 -MinInstances 0 -MaxInstances 2
```

Full deploy:

```powershell
gcloud builds submit . --config=cloudbuild.yaml --substitutions=_TAG=v1.7.xx,_MIN_INSTANCES=0,_MAX_INSTANCES=2
```

**GCE postgres VM (largest idle cost):** stop when not testing:

```powershell
gcloud compute instances stop izara-postgres-dev-testing --zone=asia-southeast1-a
```

**Video:** Jitsi cannot run on Cloud Run — use `meet.jit.si` (cloud smoke) or self-hosted VM (`meet.demotoday.net` / GCE).

## Demo users

> หลัง `npm run cleanup:cloud-test-only` บัญชี demo จะถูกลบจาก cloud DB

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient | demo.test@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |
