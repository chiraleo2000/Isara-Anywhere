# 📄 Izara Telemedicine — ขั้นตอนการทำงาน กระบวนการ และสถาปัตยกรรม

**เวอร์ชัน:** 1.7.55  
**อัปเดตล่าสุด:** 9 กรกฎาคม 2569  
**ขอบเขต:** เว็บแอป (พอร์ทัลผู้ป่วย + พอร์ทัลแพทย์ + Meeting Server)  
**สถานะ:** ✅ Phase 1 เสร็จสมบูรณ์ — ดู [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md)

> **ศูนย์กลาง:** [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md) · [Combined_Workflows_TH](Combined_Workflows_And_Actions_TH.md) · [Pages/](Pages/)

---

## สารบัญด่วน

| หัวข้อ | เอกสารภาษาไทย | ต้นฉบับ EN |
| ------ | ------------- | ---------- |
| แผนที่แพลตฟอร์ม + แผนภาพ | [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md) | [WORKFLOW_CONNECTIONS.md](../WORKFLOW_CONNECTIONS.md) |
| นัดหมาย → ประชุม → EMR | [Appointment_Workflows_TH.md](Appointment_Workflows_TH.md) | [Appointment_Workflows.md](../Appointment_Workflows.md) |
| ประชุมวิดีโอ + AI | [Video_Meeting_TH.md](Video_Meeting_TH.md) | [VIDEO_MEETING_JITSI_GEMINI.md](../VIDEO_MEETING_JITSI_GEMINI.md) |
| หลังประชุม | [POST_MEETING_WORKFLOW_TH.md](POST_MEETING_WORKFLOW_TH.md) | [POST_MEETING_WORKFLOW.md](../POST_MEETING_WORKFLOW.md) |
| เวชระเบียน PHR/EMR | [Health_Records_Processes_TH.md](Health_Records_Processes_TH.md) | [Health_Records_Processes.md](../Health_Records_Processes.md) |
| ส่งมอบเอกสารคลินิก | [Clinical_Document_Delivery_Workflows_TH.md](Clinical_Document_Delivery_Workflows_TH.md) | [Clinical_Document_Delivery_Workflows.md](../Clinical_Document_Delivery_Workflows.md) |
| ผู้ใช้และสิทธิ์ | [User_management_Workflows_TH.md](User_management_Workflows_TH.md) | [User_management_Workflows.md](../User_management_Workflows.md) |
| แจ้งเตือน | [Notification_Workflows_TH.md](Notification_Workflows_TH.md) | [Notification_Workflows.md](../Notification_Workflows.md) |
| ซิงค์ข้อมูล | [Data_Sync_Documentation_TH.md](Data_Sync_Documentation_TH.md) | [Data_Sync_Documentation.md](../Data_Sync_Documentation.md) |
| หนังสือแสดงเจตจำนอง | [Living_Will_Processes_TH.md](Living_Will_Processes_TH.md) | [Living_Will_Processes.md](../Living_Will_Processes.md) |
| คลังความรู้ / แหล่งคลินิก | [Medicine_Content_Processes_TH.md](Medicine_Content_Processes_TH.md) | [Medicine_Content_Processes.md](../Medicine_Content_Processes.md) |
| สเปกหน้าจอ | [Pages/](Pages/) | [Pages/](../Pages/) |

---

## ลำดับการทำงานหลัก (12 ขั้นตอน)

```text
 1. ผู้ป่วยจองนัด          → appointments (pending / in_pool)
 2. แอดมินมอบหมาย / แพทย์ยืนยัน → confirmed + ลิงก์ Jitsi
 3. แพทย์เริ่มประชุม (HOST) → meeting_records
 4. ผู้ป่วย/แขก lobby → เข้าห้อง → ถอดเสียง + แชท
 5. แพทย์จบประชุม
 6. Gemini สรุป SOAP
 7. แพทย์ตรวจสอบ AI (Man-in-the-Loop)
 8. ลงนาม EMR
 9. สั่งยา / แล็บ / ภาพรวม (ถ้ามี)
10. DocumentDeliveryService → patient_documents
11. แจ้งเตือนผู้ป่วย
12. ผู้ป่วยดูผลใน PHR
```

รายละเอียดแผนภาพ: [WORKFLOW_CONNECTIONS_TH.md](WORKFLOW_CONNECTIONS_TH.md)

---

## บริการและพอร์ต

| บริการ | พอร์ต (Local) | บทบาท |
| ------ | ------------- | ----- |
| พอร์ทัลผู้ป่วย | 3005 | UI + API ผู้ป่วย |
| พอร์ทัลแพทย์ | 3010 | UI + API แพทย์/แอดมิน |
| Meeting Server | 3020 | Jitsi, ถอดเสียง, AI |
| PostgreSQL | 5433 | ฐานข้อมูล izara_phase1 |

---

## เอกสารที่เลิกใช้ (อย่าต่อยอด)

| แทนที่ด้วย | ไฟล์เดิม |
| ---------- | -------- |
| `Pages/` | UI_Pages_Workflows.md |
| `Living_Will_Processes.md` | *(removed)* `Living_Will_Implementation_Plan.md` |
| FULL_WORKFLOW_CONTRACT.md | PHASE1_BASELINE_WORKFLOW_CONTRACT.md |
| Meeting-Server/01_Meeting_Room | 07_Virtual_Meeting.md |

---

## การสร้างเอกสารใหม่

```bash
python scripts/enrich-process-pages.py --force-steps
python scripts/sync-processes-thai.py
```

**ต้นฉบับภาษาอังกฤษ:** [Processes/README.md](../README.md)
