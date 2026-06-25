# pgAdmin 4 desktop on Windows → PostgreSQL on Ubuntu Docker

Use the **installed pgAdmin 4 Windows app** (not the browser at `dbadmin.isara.local`).

---

## Overview

```text
Windows PC (pgAdmin 4 app)  →  192.168.10.239:5433  →  Docker postgres container
```

---

## Step 1 — Ubuntu server: expose Postgres on the LAN

In `.env.docker` on the Ubuntu server add:

```env
POSTGRES_PUBLISH=5433
```

Default without this line is `127.0.0.1:5433` (localhost only — other PCs cannot connect).

Restart Postgres:

```bash
cd ~/Isara-Anywhere
docker compose --env-file .env.docker up -d postgres
```

Verify it listens on all interfaces:

```bash
ss -tlnp | grep 5433
# expect 0.0.0.0:5433  (not only 127.0.0.1:5433)
```

### Firewall (if UFW is enabled)

Replace subnet with your LAN:

```bash
sudo ufw allow from 192.168.10.0/24 to any port 5433 proto tcp
sudo ufw status
```

---

## Step 2 — Windows: install pgAdmin 4

1. Download from [https://www.pgadmin.org/download/pgadmin-4-windows/](https://www.pgadmin.org/download/pgadmin-4-windows/)
2. Install and open **pgAdmin 4**

You do **not** need to change the Windows `hosts` file for this method.

---

## Step 3 — Register server in pgAdmin 4

Right-click **Servers** → **Register** → **Server…**

### General tab

| Field | Value |
|-------|--------|
| Name | `Izara Ubuntu` |

### Connection tab

| Field | Value |
|-------|--------|
| Host name/address | `192.168.10.239` (your Ubuntu server IP) |
| Port | `5433` |
| Maintenance database | `izara_phase1` |
| Username | `postgres` |
| Password | value of `POSTGRES_PASSWORD` in `.env.docker` |
| Save password | ✓ (optional) |

Click **Save**.

### SSL tab (LAN lab)

| Field | Value |
|-------|--------|
| SSL mode | **Prefer** or **Disable** |

---

## Step 4 — Test

Query Tool:

```sql
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
SELECT email, role FROM users LIMIT 5;
```

---

## Credentials (from `.env.docker` on Ubuntu)

| Item | Typical value |
|------|----------------|
| Host | Ubuntu LAN IP (e.g. `192.168.10.239`) |
| Port | `5433` |
| Database | `izara_phase1` |
| User | `postgres` |
| Password | `POSTGRES_PASSWORD` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Connection timeout** | `POSTGRES_PUBLISH=5433` set? `docker compose up -d postgres`? UFW allows 5433? Same Wi‑Fi/LAN? |
| **Connection refused** | On Ubuntu: `ss -tlnp \| grep 5433` — must show `0.0.0.0:5433` |
| **Password authentication failed** | Match `POSTGRES_PASSWORD` in server `.env.docker` |
| **Works on Ubuntu SSH but not Windows** | Postgres still bound to `127.0.0.1` — add `POSTGRES_PUBLISH=5433` |

### Quick connectivity test from Windows (PowerShell)

```powershell
Test-NetConnection -ComputerName 192.168.10.239 -Port 5433
```

`TcpTestSucceeded : True` means the port is reachable.

---

## More secure alternative (no open port 5433)

Use SSH tunnel instead of `POSTGRES_PUBLISH`:

```powershell
ssh -L 5434:127.0.0.1:5433 ubuntu@192.168.10.239
```

In pgAdmin 4: Host = `localhost`, Port = `5434` (leave `POSTGRES_PUBLISH` unset on server).

> **Windows:** If you see `bind [127.0.0.1]:5433: Permission denied`, local Docker is already using port 5433 (`izara-postgres`). Use local port **5434** (or 15433) in `-L` as above — or run `docker compose stop postgres` on Windows first.

---

## Security note

`POSTGRES_PUBLISH=5433` exposes the database on your LAN. Use only on trusted networks; use strong `POSTGRES_PASSWORD`; prefer SSH tunnel for production.
