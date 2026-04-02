# 📋 เอกสารขั้นตอนการทำงาน Izara Telemedicine (ภาษาไทย)

**เวอร์ชัน:** 3.2.0
**อัปเดตล่าสุด:** 4 กุมภาพันธ์ 2569
**สถานะ:** ✅ Phase 1 เสร็จสมบูรณ์

---


## 📁 รายการเอกสาร

โฟลเดอร์นี้ประกอบด้วยเอกสารภาษาไทยสำหรับระบบ Izara Telemedicine:

| เอกสาร | คำอธิบาย | สถานะ |
| ------ | -------- | ------ |
| [User_management_Workflows_TH.md](User_management_Workflows_TH.md) | ขั้นตอนการจัดการผู้ใช้งาน | ✅ |
| [Appointment_Workflows_TH.md](Appointment_Workflows_TH.md) | ขั้นตอนการนัดหมาย | ✅ |
| [Data_Sync_Documentation_TH.md](Data_Sync_Documentation_TH.md) | โครงสร้างข้อมูลและฐานข้อมูล | ✅ |
| [Health_Records_Processes_TH.md](Health_Records_Processes_TH.md) | ขั้นตอน PHR และ EMR | ✅ |
| [Video_Meeting_TH.md](Video_Meeting_TH.md) | การประชุมวิดีโอ Jitsi + AI | ✅ |
| [Notification_Workflows_TH.md](Notification_Workflows_TH.md) | ระบบแจ้งเตือน | ✅ |


---


## 🏥 ภาพรวมระบบ


### พอร์ทัล

| พอร์ทัล | URL | ผู้ใช้ |
| ------- | --- | ----- |
| พอร์ทัลผู้ป่วย | localhost:3005 | ผู้ป่วย |
| พอร์ทัลแพทย์ | localhost:3010 | แพทย์, ผู้ดูแลระบบ |



### บริการ Docker

| บริการ | พอร์ต | วัตถุประสงค์ |
| ------ | ---- | ---------- |
| PostgreSQL | 5433 | ฐานข้อมูลหลัก |
| พอร์ทัลผู้ป่วย | 3005 | Frontend + Backend ผู้ป่วย |
| พอร์ทัลแพทย์ | 3010 | Frontend + Backend แพทย์ |
| Meeting Server | 3020 | Jitsi + AI |
| pgAdmin | 5050 | จัดการฐานข้อมูล |


---


## 👥 บทบาทผู้ใช้


### ผู้ป่วย


- ลงทะเบียนและเข้าสู่ระบบ

- จองนัดหมาย

- เข้าร่วมประชุมวิดีโอ

- ดูประวัติสุขภาพ (PHR)

- ดูคำแนะนำจากแพทย์


### แพทย์


- เข้าสู่ระบบ (ต้องได้รับการอนุมัติ)

- ยืนยัน/ปฏิเสธนัดหมาย

- เริ่มและควบคุมประชุมวิดีโอ

- สร้างและลงนาม EMR

- ใช้ AI ช่วยเหลือ

- ตรวจสอบและอนุมัติเนื้อหา AI


### ผู้ดูแลระบบ


- สิทธิ์ทั้งหมดของแพทย์

- อนุมัติ/ปฏิเสธการลงทะเบียนแพทย์

- จัดการบทบาทผู้ใช้

- ดูสถิติและรายงาน

- จัดการเนื้อหาทางการแพทย์

---


## 🔄 ขั้นตอนหลัก


### 1. การลงทะเบียน

```text
ผู้ป่วย → ลงทะเบียน → ใช้งานได้ทันที
แพทย์ → ลงทะเบียน → รอการอนุมัติ → ผู้ดูแลอนุมัติ → ใช้งานได้
```


### 2. การนัดหมาย

```text
ผู้ป่วยจอง → แพทย์ยืนยัน → สร้างลิงก์ประชุม → แจ้งเตือน
```


### 3. การประชุมวิดีโอ

```text
แพทย์เริ่ม → ผู้ป่วยเข้าห้องรอ → แพทย์อนุมัติ → ประชุม → ถอดเสียง
```


### 4. EMR และ AI

```text
ประชุมจบ → AI สรุป → แพทย์ตรวจสอบ (Man-in-the-Loop) → อนุมัติ → ส่งผู้ป่วย
```

---


## 📧 บัญชีทดสอบ

| บทบาท | อีเมล | รหัสผ่าน |
| ----- | ----- | ------- |
| ผู้ดูแลระบบ | <admin.test@izara.com> | YOUR_TEST_ADMIN_PASSWORD |
| แพทย์ | <doctor.test@izara.com> | YOUR_TEST_DOCTOR_PASSWORD |
| ผู้ป่วย | <demo.test@gmail.com> | YOUR_TEST_PASSWORD |


---


## 🛠️ เทคโนโลยี


- **Frontend**: React + TypeScript + Vite

- **Backend**: Node.js + Express

- **Database**: PostgreSQL + pgvector

- **Video**: Jitsi Meet

- **AI**: Gemini 2.5 Flash

- **Speech-to-Text**: Web Speech API

- **Container**: Docker + Docker Compose

---


## 📞 ติดต่อ

สำหรับคำถามหรือปัญหาเกี่ยวกับเอกสารนี้ กรุณาติดต่อทีมพัฒนา Izara Telemedicine

---

เอกสารเหล่านี้สะท้อนการใช้งานปัจจุบันของ Izara Telemedicine (Phase 1 เสร็จสมบูรณ์)
