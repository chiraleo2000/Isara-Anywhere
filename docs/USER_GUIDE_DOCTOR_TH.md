# คู่มือผู้ใช้งาน — Isara Anywhere (ฝั่งแพทย์)

> เวอร์ชัน **1.7.21** · อัปเดต 22 พฤษภาคม 2569  
> **Word:** [USER_GUIDE_DOCTOR_WORD_TH.docx](USER_GUIDE_DOCTOR_WORD_TH.docx) — **TH Sarabun New 16 pt**  
> **PowerPoint:** [USER_GUIDE_DOCTOR_PPT_TH.pptx](USER_GUIDE_DOCTOR_PPT_TH.pptx) — **FC Iconic**  
> สร้างด้วย `python scripts/build-portal-user-guides.py` · อ้างอิง `Processes/Pages/Doctor-Portal/` และ UI test 93 ภาพ  
> การเข้าห้องประชุม: แพทย์เป็น HOST · ผู้ป่วย/แขกผ่าน Izara Lobby

---

## หมายเหตุการตรวจสอบล่าสุด (22 พ.ค. 2569)

- ยืนยันเส้นทางหลักฝั่งแพทย์/แอดมิน: คิวนัดหมาย, การมอบหมายแพทย์, Health Meeting, ลอบบี้, การเชิญแขก, การเข้าห้องวิดีโอ, และการติดตามสถานะนัด
- การแสดงสถานะลอบบี้ของผู้ป่วยก่อนแพทย์เข้าห้อง อาจพบได้ทั้ง "waiting" หรือ "admitted" ตามเงื่อนไขเซิร์ฟเวอร์ระหว่างการทดสอบจริง
- ภาพประกอบใน `docs/screenshots/group-D`, `docs/screenshots/group-E`, และ `docs/screenshots/sso` ได้อัปเดตให้ตรงกับพฤติกรรมล่าสุดของระบบ
- Playwright cloud **79/79** กลุ่ม A–P ผ่านครบ (headed) · คู่มือ Word/PPT ฉบับแพทย์ 93 ภาพ (22 พ.ค. 2569)
- รอบทดสอบ Cloud เต็มชุดผ่าน **79/79** ครั้งที่สอง (Playwright `--workers=1 --no-deps`) หลังแก้ regression รอบแรก

---

## สารบัญ

1. [เข้าสู่ระบบ](#1-เข้าสู่ระบบ)
2. [แดชบอร์ดและเมนูหลัก](#2-แดชบอร์ดและเมนูหลัก)
3. [คิวนัดหมายและ Health Meeting](#3-คิวนัดหมายและ-health-meeting)
4. [การมอบหมายนัด (สำหรับ Admin)](#4-การมอบหมายนัด-สำหรับ-admin)
5. [จัดการผู้ป่วยและข้อมูลคลินิก](#5-จัดการผู้ป่วยและข้อมูลคลินิก)
6. [สร้างและเข้าห้องประชุมวิดีโอ](#6-สร้างและเข้าห้องประชุมวิดีโอ)
7. [เชิญแขกและ Lobby](#7-เชิญแขกและ-lobby)
8. [ดู PHR ผู้ป่วย](#8-ดู-phr-ผู้ป่วย)
9. [คำถามที่พบบ่อย](#9-คำถามที่พบบ่อย)

---

## 1. เข้าสู่ระบบ

### 1.1 ที่อยู่แอปพลิเคชัน

```
https://izara-doctor-portal-dev-testing-724889190329.asia-southeast1.run.app
```

### 1.2 เข้าด้วยอีเมลและรหัสผ่าน

1. กรอก **อีเมล** และ **รหัสผ่าน** ที่ลงทะเบียนกับโรงพยาบาล
2. กด **เข้าสู่ระบบ**

### 1.3 เข้าด้วย Google (SSO)

ใช้ได้เมื่อสมัครด้วยอีเมลเดียวกันและตั้งรหัสผ่านแล้ว

![หน้าเข้าสู่ระบบพร้อม Google](screenshots/sso/doctor-login-with-google.png)

หากบัญชียังรออนุมัติจาก Admin ระบบจะแสดงสถานะรออนุมัติ

![รออนุมัติบัญชี](screenshots/sso/sso-doctor-pending-approval.png)

---

## 2. แดชบอร์ดและเมนูหลัก

หลังเข้าสู่ระบบ คุณจะเห็น **แดชบอร์ดแพทย์** พร้อมตัวเลขสรุปงานวันนี้

![แดชบอร์ดแพทย์](screenshots/group-A/A01-doctor-dashboard.png)

**เมนูด้านซ้าย (ตัวอย่าง):**

| เมนู | หน้าที่ |
|------|--------|
| แดชบอร์ด | ภาพรวมคิวและนัดวันนี้ |
| ตารางนัดหมาย | ตารางเวรและช่วงเวลาว่าง |
| ผู้ป่วย | รายชื่อและประวัติผู้ป่วย |
| นัดหมาย & ประชุม | Health Meeting / คิววิดีโอ |
| กลุ่มนัดหมาย | จัดการคิวกลาง |
| เนื้อหาทางการแพทย์ | บทความสำหรับผู้ป่วย |
| ทรัพยากรทางคลินิก | แนวทางและเอกสารอ้างอิง |

![เมนูแพทย์](screenshots/group-A/A03-doctor-sidebar.png)

### 2.1 ตัวเลขบนแดชบอร์ด (หลังมีนัดในคิว)

เมื่อมีนัดที่มอบหมายแล้ว การ์ดจะแสดงจำนวน **ในคิว** และ **รอยืนยัน**

![แดชบอร์ดพร้อมข้อมูลคิว](screenshots/group-D/D20-dashboard-loaded.png)

![การ์ด KPI](screenshots/group-D/D21-kpi-cards.png)

---

## 3. คิวนัดหมายและ Health Meeting

### 3.1 เปิดหน้า Health Meeting

1. คลิกเมนู **นัดหมาย & ประชุม**
2. ดูคิวผู้ป่วย แท็บผู้ป่วย/แพทย์/ทีม และปุ่มเริ่มวิดีโอคอล

![หน้า Health Meeting](screenshots/group-D/D09-health-meeting.png)

![แท็บในหน้า Meeting](screenshots/group-D/D10-tab-0.png)

### 3.2 คิวกลาง (Appointment Pool)

แพทย์และ Admin ใช้ดูนัดที่ผู้ป่วยจองเข้ามาแต่ยังไม่มีแพทย์ประจำ

![คิวกลาง](screenshots/group-D/D11-appointment-pool.png)

### 3.3 ตารางเวร

เมนู **ตารางนัดหมาย** แสดงช่วงเวลาว่างของแพทย์

![ตารางเวร](screenshots/group-D/D12-schedule.png)

---

## 4. การมอบหมายนัด (สำหรับ Admin)

> ขั้นตอนนี้ทำโดย **ผู้ดูแลระบบ (Admin)** — แพทย์จะเห็นนัดในคิวหลังมอบหมายแล้ว

1. Admin เข้าเมนู **กลุ่มนัดหมาย / Appointment Pool**
2. เลือกนัดสถานะ **in_pool** (ยังไม่มีแพทย์)
3. มอบหมายแพทย์ (เช่น DOC-TEST-001)

![Admin ดูคิว](screenshots/group-D/D15-admin-pool.png)

![หลังมอบหมายแพทย์](screenshots/group-D/D15b-admin-assigned-doctor.png)

![คิวแพทย์หลังมอบหมาย](screenshots/group-D/D16b-doctor-queue-assigned.png)

แพทย์เปิด Health Meeting อีกครั้งจะเห็นนัดในคิวพร้อมดำเนินการ

![คิวหลัง Admin มอบหมาย](screenshots/group-D/D16-pool-after-assignment.png)

---

## 5. จัดการผู้ป่วยและข้อมูลคลินิก

### 5.1 รายชื่อผู้ป่วย

1. คลิกเมนู **ผู้ป่วย**
2. ใช้ช่องค้นหา (เช่น พิมพ์ "demo") เพื่อหาผู้ป่วย

![รายชื่อผู้ป่วย](screenshots/group-E/E04-patients-list.png)

![ค้นหาผู้ป่วย](screenshots/group-E/E05-search-demo.png)

### 5.2 เปิดรายละเอียดผู้ป่วย

คลิกการ์ดผู้ป่วยเพื่อดูข้อมูลและปุ่มดำเนินการทางคลินิก

![รายละเอียดผู้ป่วย](screenshots/group-E/E06-patient-detail.png)

![ปุ่มดำเนินการคลินิก](screenshots/group-E/E07-clinical-actions.png)

### 5.3 ดูนัดจากมุมแพทย์

![Health Meeting อีกมุม](screenshots/group-E/E08-health-meeting.png)

![คิวแพทย์](screenshots/group-E/E18-doctor-queue.png)

---

## 6. สร้างและเข้าห้องประชุมวิดีโอ

### 6.1 สร้างห้องประชุมจากนัด

1. เลือกนัดที่สถานะ **awaiting_doctor_response** (รอแพทย์ตอบรับ)
2. ระบบสร้างห้อง Jitsi ผ่าน Meeting Server — ชื่อห้องผูกกับรหัสนัด
3. ชื่อแสดงใน Jitsi ดึงจากโปรไฟล์ Izara (`requireDisplayName=false`)

![สร้างห้องประชุมแล้ว](screenshots/group-E/E10-meeting-created.png)

### 6.2 เข้าห้องในแอป (ไม่เปิด meet.jit.si แยก)

1. ไปที่ URL: `/doctor/{รหัสแพทย์}/meeting/{รหัสนัด}`
2. รอโหลด → ยอมรับข้อตกลง → หน้าก่อนเข้า (Pre-join) → กด **เข้าร่วมการประชุม**
3. Jitsi แสดงใน iframe ภายใน Izara

![เส้นทางห้องประชุม](screenshots/group-E/E10b-doctor-meeting-route.png)

![อยู่ในห้องวิดีโอ (แพทย์)](screenshots/group-J-meeting-jitsi/E10c-jitsi-doctor-meet.png)

### 6.3 ผู้ป่วยเข้าห้องเดียวกัน

ผู้ป่วยใช้ลิงก์ `/meeting/{รหัสนัด}` บนพอร์ทัลผู้ป่วย — ชื่อแสดงอัตโนมัติเช่นกัน

![ผู้ป่วยในห้อง Jitsi](screenshots/group-J-meeting-jitsi/E10d-patient-jitsi-meet.png)

### 6.4 ตรวจสอบนัดและลิงก์ประชุม (มุมผู้ป่วยในระบบ)

![รายการนัดจริง](screenshots/group-E/E13-appointments-real-data.png)

![รายละเอียดนัด](screenshots/group-E/E14-appointment-detail.png)

![การเข้าถึงห้องประชุมฝั่งผู้ป่วย](screenshots/group-E/E15-patient-meeting-access.png)

---

## 7. เชิญแขกและ Lobby

### 7.1 สร้างลิงก์เชิญแขก

จากหน้าประชุมหรือ API สร้าง **Guest Invite Token** สำหรับญาติ/ผู้ดูแล

![สร้างคำเชิญแขก](screenshots/group-E/E19-guest-invite-created.png)

### 7.2 แขกเข้า Lobby

แขกใช้ลิงก์เชิญ → รอในห้องรอ (Lobby) จนแพทย์ **อนุมัติเข้า**

![เข้า Lobby ด้วย Token](screenshots/group-E/E22-lobby-join-token.png)

![เข้า Lobby แบบพื้นฐาน](screenshots/group-E/E21-lobby-join-basic.png)

### 7.3 มุม Admin ดูคิวหลังเชิญ

![คิว Admin](screenshots/group-E/E23-admin-queue.png)

---

## 8. ดู PHR ผู้ป่วย

1. เปิดเมนู **ผู้ป่วย** → ค้นหาและเลือกผู้ป่วย
2. ดูแท็บข้อมูลสุขภาพ / PHR Overview (ถ้ามีในหน้ารายละเอียด)

![ค้นหาผู้ป่วยจาก PHR workflow](screenshots/group-F/F11-search-patient.png)

![PHR จากมุมแพทย์](screenshots/group-F/F15-doctor-patient-phr.png)

---

## 9. คำถามที่พบบ่อย

**ถาม:** Google SSO แจ้งว่าบัญชีไม่ตรง (`GOOGLE_ACCOUNT_MISMATCH`)  
**ตอบ:** อีเมลนี้เคยผูกกับ Google subject อื่น — ใช้บัญชี Google เดิมหรือรหัสผ่าน หากต้องการเปลี่ยนการผูกให้ติดต่อ Admin


**ถาม:** ทำไมไม่เห็นนัดที่ผู้ป่วยเพิ่งจอง?  
**ตอบ:** นัดอาจยังอยู่ในคิวกลาง — ต้องให้ Admin มอบหมายแพทย์ก่อน

**ถาม:** ห้องประชุมค้างที่ "กำลังเตรียมห้องประชุม..."  
**ตอบ:** รอสักครู่หรือรีเฟรช — ตรวจสอบว่า Meeting Server ทำงานและอนุญาตกล้อง-ไมค์

**ถาม:** Transcript / AI สรุปอยู่ที่ไหน?  
**ตอบ:** ในแถบ **Transcript** และ **AI** บนหน้าประชุม (แพทย์เป็นผู้เริ่มถอดเสียง)

**ถาม:** บัญชี Google เข้าไม่ได้  
**ตอบ:** ต้องสมัครด้วยอีเมลเดียวกัน ตั้งรหัสผ่าน และรอ Admin อนุมัติ (ถ้าเป็นแพทย์ใหม่)

---

## ภาคผนวก — เมนู Admin (ถ้าคุณมีสิทธิ์ Admin)

![แดชบอร์ด Admin](screenshots/group-A/A01-admin-dashboard.png)

![เมนู Admin](screenshots/group-A/A04-admin-sidebar.png)

![Health Meeting มุม Admin](screenshots/group-D/D14-admin-meeting.png)

---

*เอกสารนี้จัดทำจากผลการทดสอบอัตโนมัติบน Cloud Run — Izara Anywhere · โครงการ Izara Telemedicine*
