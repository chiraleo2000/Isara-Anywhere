# เข้า PostgreSQL ผ่าน pgAdmin (Mode B — Ubuntu + Nginx + Windows บน LAN)

คู่มือนี้สำหรับกรณีที่ **Docker รันบน Ubuntu server** (เช่น `192.168.10.107`) และคุณเปิด pgAdmin จาก **PC Windows อื่นในเครือข่าย LAN** ผ่าน Nginx

**See also:** [DEPLOYMENT.md](DEPLOYMENT.md) · [isara-nginx.conf](isara-nginx.conf)

---

## สิ่งที่ต้องพร้อมก่อนเริ่ม

| รายการ | สถานะที่ต้องเป็น |
|--------|------------------|
| Docker Compose บน Ubuntu | `docker compose ps` — `izara-postgres` และ `izara-pgadmin` เป็น **Up** |
| Nginx บน Ubuntu | ติดตั้ง config `deploy/nginx/isara-nginx.conf` แล้ว |
| ไฟล์ `.env.docker` บน Ubuntu | มี `POSTGRES_PASSWORD`, `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` |
| PC Windows | แก้ไฟล์ `hosts` แล้ว |

---

## ขั้นตอนที่ 1 — ตั้งค่า `hosts` บน Windows

pgAdmin ใช้โดเมน **`dbadmin.isara.local`** ไม่ใช่ IP ตรงๆ

1. เปิด **Notepad แบบ Run as administrator**
2. **File → Open** → ไปที่ `C:\Windows\System32\drivers\etc\`
3. เปลี่ยนตัวกรองเป็น **All Files (*.*)**
4. เปิดไฟล์ **`hosts`**
5. เพิ่มบรรทัดนี้ท้ายไฟล์ (แทน IP ด้วย IP จริงของ Ubuntu server):

```text
192.168.10.107   patient.isara.local doctor.isara.local meeting.isara.local dbadmin.isara.local
```

6. บันทึก (`Ctrl+S`)

ทางเลือก — flush DNS:

```powershell
ipconfig /flushdns
```

---

## ขั้นตอนที่ 2 — ตรวจว่า pgAdmin พร้อมบน Ubuntu server

SSH เข้า Ubuntu แล้วรัน:

```bash
cd ~/Isara-Anywhere
docker compose ps
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5050/
```

| ผลลัพธ์ | ความหมาย |
|---------|----------|
| HTTP `200` หรือ `302` | pgAdmin container ทำงาน |
| **Connection refused** | รัน `docker compose up -d` ก่อน |

ตรวจ Nginx:

```bash
sudo nginx -t
curl -s -o /dev/null -w "%{http_code}" -H "Host: dbadmin.isara.local" http://127.0.0.1/
```

---

## ขั้นตอนที่ 3 — เปิด pgAdmin บน Windows

เปิดเบราว์เซอร์แล้วไปที่:

**http://dbadmin.isara.local**

---

## ขั้นตอนที่ 4 — Login เข้า pgAdmin

ใช้ค่าจากไฟล์ **`.env.docker`** บน Ubuntu server (ไม่ใช่รหัส demo ของ portal)

| ช่อง | ค่า |
|------|-----|
| **Email** | `PGADMIN_DEFAULT_EMAIL` — ค่าเริ่มต้น `admin@izara.com` |
| **Password** | `PGADMIN_DEFAULT_PASSWORD` — ค่าที่คุณตั้งใน `.env.docker` |

> รหัส demo เช่น `P@ssw0rd` หรือ `IzaraAdmin@2024` ใช้ login **Doctor Portal** ไม่ใช่ pgAdmin (ยกเว้นคุณตั้ง `PGADMIN_DEFAULT_PASSWORD=IzaraAdmin@2024` เอง)

---

## ขั้นตอนที่ 5 — เพิ่ม PostgreSQL Server ใน pgAdmin (สำคัญ)

หลัง login ครั้งแรก pgAdmin ยังไม่รู้จัก database — ต้อง **Register Server** เอง

### 5.1 คลิก Register → Server…

ในแถบซ้าย: คลิกขวาที่ **Servers** → **Register** → **Server…**

### 5.2 แท็บ General

| ช่อง | ค่า |
|------|-----|
| **Name** | `Izara Local` (ตั้งชื่ออะไรก็ได้) |

### 5.3 แท็บ Connection — ใช้ค่านี้เท่านั้น

| ช่อง | ค่า | หมายเหตุ |
|------|-----|----------|
| **Host name/address** | `postgres` | ชื่อ service ใน Docker — **ไม่ใช่** `localhost` หรือ `192.168.10.107` |
| **Port** | `5432` | พอร์ตภายใน Docker network |
| **Maintenance database** | `izara_phase1` | |
| **Username** | `postgres` | จาก `POSTGRES_USER` |
| **Password** | ค่า `POSTGRES_PASSWORD` ใน `.env.docker` | |
| **Save password?** | เปิด (Optional) | สะดวกเวลา login ครั้งถัดไป |

### 5.4 กด Save

ถ้าสำเร็จ จะเห็น database **`izara_phase1`** ใน tree ซ้ายมือ พร้อมตาราง เช่น `users`, `appointments`, `phr` ฯลฯ

---

## ทำไม Host ต้องเป็น `postgres` ไม่ใช่ `localhost`?

```text
Windows PC  →  Nginx (:80)  →  pgAdmin container (:5050)
                                    ↓
                              postgres container (:5432)
                              (Docker network: izara-network)
```

- **pgAdmin** รันใน Docker เครือข่ายเดียวกับ **PostgreSQL**
- ภายใน Docker เรียก DB ด้วยชื่อ service: **`postgres`**
- **`localhost:5433`** ใช้ได้เฉพาะบน **Ubuntu host** (SSH เข้า server) ไม่ใช่ใน pgAdmin container
- **`192.168.10.107:5433`** ใช้ไม่ได้จาก pgAdmin เพราะ Postgres bind ที่ `127.0.0.1:5433` บน Ubuntu เท่านั้น

---

## ขั้นตอนที่ 6 — ทดสอบว่าเชื่อมต่อได้

ใน pgAdmin เปิด **Query Tool** แล้วรัน:

```sql
SELECT COUNT(*) FROM users;
SELECT id, email, role FROM users LIMIT 10;
```

ถ้า seed data โหลดแล้ว ควรเห็น user demo เช่น `demo.test@gmail.com`, `doctor.test@izara.com`

---

## สรุป URL และรหัส

| รายการ | ค่า |
|--------|-----|
| URL pgAdmin (จาก Windows) | http://dbadmin.isara.local |
| Login pgAdmin | `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` |
| Host ใน Register Server | `postgres` |
| Port | `5432` |
| Database | `izara_phase1` |
| DB User | `postgres` |
| DB Password | `POSTGRES_PASSWORD` จาก `.env.docker` |

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| **502 Bad Gateway** | pgAdmin container ไม่รัน | บน Ubuntu: `docker compose up -d` แล้ว `curl http://127.0.0.1:5050` |
| **This site can't be reached** | ยังไม่แก้ `hosts` บน Windows | แก้ `hosts` ให้ชี้ `dbadmin.isara.local` → IP Ubuntu |
| **Unable to connect to server** (Host = localhost) | Host ผิด | เปลี่ยนเป็น **`postgres`** port **`5432`** |
| **password authentication failed** | รหัส DB ผิด | ดู `POSTGRES_PASSWORD` ใน `.env.docker` บน Ubuntu |
| **could not translate host name "postgres"** | pgAdmin ไม่ได้อยู่ network เดียวกับ postgres | `docker compose ps` — ตรวจว่า `izara-pgadmin` Up; `docker compose restart pgadmin postgres` |
| Login pgAdmin ไม่ได้ | สับสนรหัส portal กับ pgAdmin | ใช้ `PGADMIN_DEFAULT_*` จาก `.env.docker` |

---

## ทางเลือกอื่น — เข้า PostgreSQL โดยไม่ใช้ pgAdmin

### บน Ubuntu server (SSH)

```bash
docker exec -it izara-postgres psql -U postgres -d izara_phase1
```

### จาก Windows ด้วย DBeaver (SSH tunnel)

```powershell
ssh -L 5433:127.0.0.1:5433 user@192.168.10.107
```

จากนั้นใน DBeaver ตั้ง Host = `localhost`, Port = `5433`, Database = `izara_phase1`

---

## หมายเหตุด้านความปลอดภัย

- pgAdmin เปิดผ่าน HTTP (port 80) — เหมาะสำหรับ **lab / LAN ภายใน** เท่านั้น
- อย่า expose `dbadmin.isara.local` ออก internet โดยไม่มี HTTPS และ authentication เพิ่ม
- รหัสใน `.env.docker` ไม่ควรใช้รหัส demo ของ portal ใน production

---

*Last updated: 2026-06-18 · Izara Telemedicine*
