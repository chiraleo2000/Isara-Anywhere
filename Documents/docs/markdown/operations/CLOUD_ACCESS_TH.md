# การเข้าถึงระบบ (Cloud — dev-testing)

> อัปเดต: 16 กรกฎาคม 2569 | Environment: Google Cloud Run (asia-southeast1) | Project: izara-telemedicine  
> **Docs/package track:** v1.7.61 · deploy `npm run cloud:deploy -- -Tag v1.7.61` · UX showup `npm run test:gate:ui-showup` · evidence `npm run docs:evidence:cloud` · green: [CLOUD_GREEN_CHECKPOINT.md](../../../../reports/CLOUD_GREEN_CHECKPOINT.md)  
> **Cloud demo purge:** needs `CLOUD_DB_PASSWORD` in `.env` — currently blocked ([CLOUD_DEMO_DATA_CLEANUP.md](../../../../reports/CLOUD_DEMO_DATA_CLEANUP.md))

## บริการที่ให้บริการ (URL ที่ใช้งานจริง)

| Service | URL | Revision | Image |
| ------- | --- | -------- | ----- |
| Patient Portal | https://izara-patient-portal-dev-testing-724889190329.asia-southeast1.run.app | **00145-njt** (100%) | v1.7.60\* |
| Doctor Portal | https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app | **00177-pgm** (100%) | v1.7.60\* |
| Meeting Server | https://izara-meeting-server-dev-testing-724889190329.asia-southeast1.run.app | (latest traffic) | v1.7.60\* |

\*Last reverify deploy log (`reports/cloud-deploy-reverify2.txt`) submitted tag **v1.7.60** while workspace package is **1.7.61** — prefer `-Tag v1.7.61` on next deploy.

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

**Video:** Jitsi cannot run on Cloud Run. Set `JITSI_DOMAIN=meet.jit.si` on **meeting-server** and **doctor portal** Cloud Run services (already in `cloudbuild.yaml`). Do **not** point cloud at `meet.demotoday.net` — that hostname is LAN-only (Windows/Ubuntu hosts file; no public DNS) and causes E2 `noJitsiLoginRequired=false` + Q01 `ERR_NAME_NOT_RESOLVED` on `external_api.js`.

| Mode | `JITSI_DOMAIN` | `JITSI_JWT_SECRET` / Prosody |
|------|----------------|------------------------------|
| Cloud Run (dev-testing) | `meet.jit.si` | Not used (public SaaS; join-config returns `noJitsiLoginRequired=true`, `jwt=null`) |
| Local Docker / LAN demo | `meet.demotoday.net` | Required — same value as Jitsi Docker `JWT_APP_SECRET` (see `issara-jitsi/docker/jitsi-host/README.md`) |
| Self-hosted public VM | Your public FQDN | Required Secret Manager key `jitsi-jwt-secret` → mount as `JITSI_JWT_SECRET` on meeting-server |

## Demo users

> หลัง `npm run cleanup:cloud-test-only` บัญชี demo จะถูกลบจาก cloud DB

| Role | Email | Password |
| ---- | ----- | -------- |
| Patient | demo.test@gmail.com | P@ssw0rd |
| Doctor | doctor.test@izara.com | IzaraDoctor@2024 |
| Admin | admin.test@izara.com | IzaraAdmin@2024 |
