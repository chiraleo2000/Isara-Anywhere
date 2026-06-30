# Round 6 Signoff — Local + LAN + Jitsi + Cloud prep (2026-06-30)

## Executive summary

| Track | Status | Notes |
|-------|--------|-------|
| **Local Docker + self-hosted Jitsi** | **PASS** | `test:local:pre-deploy-gate` exit 0; ledger round 9 **P0=0** |
| **Unit deep packs (ut-01..ut-20)** | **PASS** | `test:unit:groups-sequential` **17/17**; `test:audit:process` 0 gaps |
| **Jitsi local (jl-01..jl-10)** | **PASS** | `meet.localhost:8443` JWT moderator; ledger `jitsi-local` **P0=0** |
| **Ubuntu LAN + Nginx (d7, j8)** | **DEPLOYED** | `192.168.10.239` — `*.demotoday.net` + `meet.demotoday.net` Jitsi; meeting-api-smoke PASS |
| **LAN headed gate** | **PARTIAL** | Infrastructure + API PASS; full `test:lan:deploy-gate` needs Windows hosts/mkcert on doctor PC |
| **Cloud cost-opt deploy (c9-09+)** | **BLOCKED** | Config ready (`min=0,max=2`); needs user `gcloud` approval |
| **Git release (git-02..05)** | **CANCELLED** | No commit/push without explicit user approval |

## Local gate evidence

| Gate | Result | Ledger |
|------|--------|--------|
| `test:unit:groups-sequential` | **17/17 PASS** | 2026-06-30 |
| `phase:0` through `phase:8` | PASS | rounds 1–7 P0=0 |
| `test:local:pre-deploy-gate` | **PASS** | round 9 P0=0 |
| `test:screenshots:group-q/d/e` + global | PASS | ss-05 |
| `ledger:local --round jitsi-local` | **P0=0** | Q+R headed |
| `ledger:local --round lan` / `jitsi-lan` | **P0=0** | API + config evidence |

## LAN deploy evidence (Ubuntu 192.168.10.239)

| Check | Result |
|-------|--------|
| `bash deploy/nginx/deploy.sh` | Portals + Jitsi + Nginx TLS |
| `verify-stack.sh https` | patient/doctor/meeting login **200** |
| `meet.demotoday.net/external_api.js` | **200** |
| `docker:meeting-api-smoke` (LAN URLs) | **PASS** — `jitsiDomain=meet.demotoday.net` |
| Doctor CSP `meet.demotoday.net` | Camera/mic Permissions-Policy fixed |
| JVB `JVB_ADVERTISE_IPS=192.168.10.239` | WebRTC to doctor laptop |

**Windows client:** [deploy/nginx/WINDOWS_CLIENT_SETUP.md](../../deploy/nginx/WINDOWS_CLIENT_SETUP.md) · [LAN_VIDEO_CLIENT_TH.md](../../Documents/docs/markdown/operations/LAN_VIDEO_CLIENT_TH.md)

## Meeting role contract (verified)

- Doctor = Jitsi moderator (`moderator: true`, JWT on private domain)
- Patient = participant (`moderator: false`)
- Guest = non-moderator (invite token required)
- Recording = manual doctor toggle only (no auto-record on join)
- Camera/mic = **doctor/patient device** via WebRTC (not Ubuntu server)

## Zero-defect checklist (git-01)

| Item | Status |
|------|--------|
| `test:unit:groups-sequential` 17/17 | **PASS** |
| `test:meeting-server:contract` 85/85 | **PASS** |
| `test:local:pre-deploy-gate` | **PASS** |
| `test:audit:process` 0 gaps | **PASS** |
| `ledger` rounds 1–9 + jitsi-local + lan + jitsi-lan P0=0 | **PASS** |
| `test:lan:deploy-gate` (full headed) | **PARTIAL** — run after Windows hosts + mkcert |
| Cloud deploy + smoke | **BLOCKED** (no gcloud approval) |

## Cloud — cost-opt config (ready, deploy blocked)

| Item | Status |
|------|--------|
| `_MIN_INSTANCES=0` `_MAX_INSTANCES=2` (all cloudbuild) | **DONE** |
| [cost-baseline-cloud-2026-06-30.md](../cost-baseline-cloud-2026-06-30.md) | **DONE** |
| `cloud:deploy` / `test:cloud:deploy-gate` | **BLOCKED** |

---

*Reports index: [reports/README.md](../README.md)*
