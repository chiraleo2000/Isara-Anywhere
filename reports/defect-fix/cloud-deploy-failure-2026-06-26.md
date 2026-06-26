# P7 Cloud deploy failure — 2026-06-26

## Build

| Field | Value |
|-------|-------|
| Tag | `v1.7.55` |
| Build ID | `989fac6d-f4d4-4acd-b46b-0ce60adbb484` |
| Status | **FAILURE** |
| Failed step | `build-doctor-portal` (docker build `Dockerfile.unified`) |

## Root cause

Cloud Build used monorepo root (`.`) as Docker context for portal images. `COPY package*.json` pulled the **platform** `package.json` (86 packages, no `vite`) instead of `Isara-doctor-portal/package.json`.

Secondary: `NODE_ENV=production` in the build env can omit devDependencies — fixed with `ENV NODE_ENV=development` in frontend builder stages.

## Fix applied (uncommitted)

1. `cloudbuild.yaml` — per-app `dir` + context `.` for `Izara-jitsi-server`, `Isara-patient-portal`, `Isara-doctor-portal`
2. `Dockerfile.unified` — `ENV NODE_ENV=development` in frontend builder stage (both portals)

## Retry build `1b8315d9-c4b3-4c1a-8da3-62eb68afa82b`

**SUCCESS** after `cloudbuild.yaml` per-app `dir` fix. Local proof: `docker build --target frontend-builder Isara-doctor-portal` exit 0.

Post-deploy (async submit — run manually after SUCCESS):

```powershell
powershell -File scripts/shift-cloud-traffic.ps1
npm run cloud:smoke
```
