# การใช้งานวิดีโอคอลบน LAN (`*.demotoday.net`)

> **ผู้ใช้:** แพทย์และผู้ป่วยที่เข้าระบบผ่าน Ubuntu server บนเครือข่ายภายใน  
> **อัปเดต:** 30 มิถุนายน 2569 · **เวอร์ชัน** v1.7.54

---

## สิ่งสำคัญ

- **กล้องและไมโครโฟนใช้จากคอมพิวเตอร์หรือโน้ตบุ๊กของคุณ** (แพทย์/ผู้ป่วย) — ไม่ใช่จากเซิร์ฟเวอร์ Ubuntu
- เปิดเบราว์เซอร์บน **เครื่องแพทย์/ผู้ป่วย** (Chrome หรือ Edge แนะนำ) — อย่าทดสอบบนเดสก์ท็อปของเซิร์ฟเวอร์
- วิดีโอผ่าน **https://meet.demotoday.net** (Jitsi บนเซิร์ฟเวอร์) แต่สื่อสื่อสาร WebRTC มาจากอุปกรณ์ปลายทาง

---

## URL การเข้าใช้งาน

| บทบาท | URL |
|--------|-----|
| ผู้ป่วย | https://patient.demotoday.net/login |
| แพทย์ / ผู้ดูแล | https://doctor.demotoday.net/login |
| API การประชุม | https://meeting.demotoday.net |
| วิดีโอ Jitsi | https://meet.demotoday.net |

---

## ตั้งค่าบน Windows (ครั้งแรก)

### 1. ไฟล์ hosts (ต้องรัน Notepad แบบ Administrator)

เพิ่มบรรทัดเดียว (แทนที่ IP หากเซิร์ฟเวอร์ไม่ใช่ `192.168.10.239`):

```text
192.168.10.239   patient.demotoday.net doctor.demotoday.net meeting.demotoday.net meet.demotoday.net dbadmin.demotoday.net
```

หรือรันสคริปต์:

```powershell
.\deploy\nginx\windows-update-hosts.ps1
```

### 2. ใบรับรอง HTTPS (mkcert)

คัดลอก `deploy/nginx/isara-mkcert-rootCA.pem` จากเซิร์ฟเวอร์ Ubuntu แล้วติดตั้งใน **Trusted Root Certification Authorities** บน Windows  
รายละเอียด: [deploy/nginx/WINDOWS_CLIENT_SETUP.md](../../../deploy/nginx/WINDOWS_CLIENT_SETUP.md)

### 3. ทดสอบ

```powershell
ping patient.demotoday.net
# ต้องได้ตอบจาก 192.168.x.x (เซิร์ฟเวอร์ LAN)

curl.exe -sk -o NUL -w "%{http_code}" https://meet.demotoday.net/external_api.js
# ต้องได้ 200
```

---

## ขั้นตอนแพทย์ — เริ่มการประชุม

1. เข้าสู่ระบบที่ https://doctor.demotoday.net/login
2. ไปที่ **Health Meeting** (หรือนัดที่ยืนยันแล้ว)
3. คลิก **Start Meeting** / เริ่มการประชุม
4. เมื่อเบราว์เซอร์ถาม — กด **Allow** สำหรับกล้องและไมโครโฟน
5. รอผู้ป่วยใน Lobby แล้วกด **Admit** เมื่อพร้อม

แพทย์เป็น **HOST (moderator)** บน Jitsi — ควบคุมการบันทึกและการยอมรับผู้เข้าร่วม

---

## ขั้นตอนผู้ป่วย — เข้าร่วม

1. เข้าสู่ระบบที่ https://patient.demotoday.net/login
2. เปิดนัดหมาย → **Join Meeting**
3. รอในห้องรอ (Lobby) จนแพทย์ Admit
4. อนุญาตกล้อง/ไมค์เมื่อเบราว์เซอร์ถาม

---

## แก้ปัญหา

| อาการ | วิธีแก้ |
|--------|---------|
| กด Start Meeting แล้วค้าง / ไม่มีวิดีโอ | ตรวจว่า `meet.demotoday.net` อยู่ใน hosts; เปิด https://meet.demotoday.net/external_api.js ต้องโหลดได้ |
| กล้อง/ไมค์ไม่ทำงาน | อนุญาตใน Chrome (ไอคอนกุญแจ) · ใช้เครื่องแพทย์/ผู้ป่วย ไม่ใช่เซิร์ฟเวอร์ · ติดตั้ง mkcert CA |
| ใบรับรองไม่น่าเชื่อถือ | ติดตั้ง root CA จากเซิร์ฟเวอร์ · ซิงค์เวลา Windows และ Ubuntu |
| ไม่มีเสียง/ภาพหลังเข้าห้อง | ตรวจ firewall เซิร์ฟเวอร์: `sudo ufw allow 10000/udp` |

---

## เอกสารเทคนิค (นักพัฒนา)

- [JITSI_MEETING_DEMOTODAY_API.md](JITSI_MEETING_DEMOTODAY_API.md) — API + สถาปัตยกรรม
- [deploy/nginx/DEPLOYMENT.md](../../../../deploy/nginx/DEPLOYMENT.md) — ติดตั้ง Ubuntu
- [Processes/VIDEO_MEETING_JITSI_GEMINI.md](../../../../Processes/VIDEO_MEETING_JITSI_GEMINI.md) — workflow เต็ม
