# Windows client setup — `*.demotoday.net` on LAN

Use this on every Windows PC that should open the Izara stack at **192.168.10.239** via HTTPS.

## 1. Hosts file (required)

`demotoday.net` may resolve on the public internet to a different IP. For LAN access, override DNS with the Ubuntu server IP.

1. Open **Notepad as Administrator** (Start → type Notepad → right-click → Run as administrator).
2. File → Open → `C:\Windows\System32\drivers\etc\hosts`
3. Add this line (one line):

```text
192.168.10.239   patient.demotoday.net doctor.demotoday.net meeting.demotoday.net meet.demotoday.net dbadmin.demotoday.net
```

4. Save. Flush DNS:

```powershell
ipconfig /flushdns
```

5. Test:

```powershell
ping patient.demotoday.net
```

Expected: replies from **192.168.10.239**.

## 2. Trust TLS certificate (HTTPS)

The server uses **mkcert** (local CA). Without trusting it, Chrome/Edge show “Your connection is not private”.

### Option A — Copy root CA from Ubuntu server

On the server:

```bash
mkcert -CAROOT
# e.g. /home/ubuntu/.local/share/mkcert/rootCA.pem
```

Copy `rootCA.pem` to your Windows PC (USB, `scp`, etc.).

On Windows:

1. Double-click `rootCA.pem` → **Install Certificate**
2. Store: **Local Machine** → **Trusted Root Certification Authorities**
3. Finish → restart browser

### Option B — mkcert on Windows (same CA as server)

Only works if you use the **same** `rootCA.pem` from the server (Option A is simpler).

## 3. Open portals

| Portal | URL |
| ------ | --- |
| Patient | https://patient.demotoday.net/login |
| Doctor | https://doctor.demotoday.net/login |
| Meeting health | https://meeting.demotoday.net/health |
| pgAdmin | https://dbadmin.demotoday.net |

Demo logins: see [DEPLOYMENT.md](DEPLOYMENT.md).

## 4. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Site can’t be reached | Hosts file missing or wrong IP; run `ping patient.demotoday.net` |
| Certificate / NET::ERR_CERT_AUTHORITY_INVALID | Install `rootCA.pem` (step 2) or run `install-mkcert-ca-windows.ps1` |
| **NET::ERR_CERT_DATE_INVALID** / “0 days in the future” | **Clock skew** — sync time on Ubuntu **and** Windows, then regenerate certs on server |
| Wrong portal (patient on doctor URL) | Re-run `bash deploy/nginx/deploy.sh` on server |
| Login fails (CORS) | Server `.env.docker` must list `https://doctor.demotoday.net` in `CORS_ORIGINS`; rebuild containers |
| **Video: cam/mic dead / Start Meeting spins** | **Use your doctor laptop browser** (not Ubuntu desktop). Add `meet.demotoday.net` to hosts (step 1). Trust mkcert CA (step 2). Allow camera/mic when prompted. UDP **10000** must reach server (`sudo ufw allow 10000/udp` on Ubuntu). |
| Jitsi iframe blank | Open `https://meet.demotoday.net/external_api.js` on laptop — must load JS, not fail DNS |
| Firewall | On Ubuntu: `sudo ufw allow 80/tcp`, `443/tcp`, and **`10000/udp`** (WebRTC media) |

### Fix `ERR_CERT_DATE_INVALID` (step by step)

This error means the certificate’s **valid-from / valid-until dates** don’t match your PC’s clock — not that the CA is untrusted.

**On Ubuntu server:**

```bash
cd ~/Isara-Anywhere
bash deploy/nginx/fix-tls.sh
```

This syncs NTP, regenerates mkcert certs, reloads nginx, and writes `deploy/nginx/isara-mkcert-rootCA.pem`.

**On Windows (Administrator PowerShell):**

```powershell
# 1. Sync clock
#    Settings → Time & language → Date & time → Set time automatically ON → Sync now

# 2. Hosts file (replace IP if your server is not 192.168.10.239)
Set-ExecutionPolicy -Scope Process Bypass -Force
.\deploy\nginx\windows-update-hosts.ps1

# 3. Trust mkcert CA (copy isara-mkcert-rootCA.pem from server first)
.\deploy\nginx\install-mkcert-ca-windows.ps1 -RootCaPath C:\path\to\isara-mkcert-rootCA.pem
```

Close all Chrome/Edge windows and reopen `https://patient.demotoday.net/login`.

**Verify hosts points to LAN, not the public internet:**

```powershell
ping patient.demotoday.net
# Expected: replies from 192.168.x.x (your Ubuntu server), not a public IP
```

## 5. Google OAuth (optional)

If using Google Sign-In, add this redirect URI in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

`https://patient.demotoday.net/auth/callback`

## 6. LAN deploy gate (automated)

After server deploy and hosts/TLS setup (steps 1–3), from the monorepo on Windows:

```powershell
# API smoke through nginx
$env:MEETING_URL='https://meeting.demotoday.net'
$env:DOCTOR_URL='https://doctor.demotoday.net'
npm run docker:meeting-api-smoke

# Headed E2E: Q + R + B through LAN URLs (BASELINE_VISUAL=1)
npm run test:lan:deploy-gate
```

See [DEPLOYMENT.md](DEPLOYMENT.md) and [LOCAL_INSTALL.md](../../docs/runbooks/LOCAL_INSTALL.md).

**Prerequisite:** Windows PC must be on the same LAN as `192.168.10.239`. Verify with `ping patient.demotoday.net` (expect replies from 192.168.10.239). If the Ubuntu host is unreachable (ping timeout), deferral is documented in `reports/defect-fix/lan-gate-deferred-2026-06-26.md` — local gates (P3) and cloud gates (P7) remain valid without LAN.
