# Windows client setup — `*.demotoday.net` on LAN

Use this on every Windows PC that should open the Izara stack at **192.168.10.239** via HTTPS.

## 1. Hosts file (required)

`demotoday.net` may resolve on the public internet to a different IP. For LAN access, override DNS with the Ubuntu server IP.

1. Open **Notepad as Administrator** (Start → type Notepad → right-click → Run as administrator).
2. File → Open → `C:\Windows\System32\drivers\etc\hosts`
3. Add this line (one line):

```text
192.168.10.239   patient.demotoday.net doctor.demotoday.net meeting.demotoday.net dbadmin.demotoday.net
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
| Certificate / NET::ERR_CERT_AUTHORITY_INVALID | Install `rootCA.pem` (step 2) |
| Wrong portal (patient on doctor URL) | Re-run `bash deploy/nginx/deploy.sh` on server |
| Login fails (CORS) | Server `.env.docker` must list `https://doctor.demotoday.net` in `CORS_ORIGINS`; rebuild containers |
| Firewall | On Ubuntu: `sudo ufw allow 80/tcp` and `sudo ufw allow 443/tcp` |

## 5. Google OAuth (optional)

If using Google Sign-In, add this redirect URI in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

`https://patient.demotoday.net/auth/callback`
