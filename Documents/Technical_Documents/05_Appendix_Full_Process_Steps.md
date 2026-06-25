# ภาคผนวก — ขั้นตอนกระบวนการเต็ม (Full Process Steps)

> **อัปเดต:** 2 มิถุนายน 2569 — สร้างอัตโนมัติจาก `Processes/Pages` และ `Processes/*.md`  
> **ชุด:** `Documents/Technical_Documents` · [ดัชนี](../README.md) · **สร้างซ้ำ:** `python scripts/build-appendix-process-steps.py`  
> **เอกสารหลัก:** [01](01_System_Architecture_and_Workflow.md) · [02](02_Authentication_and_Authorization.md) · [03](03_Data_Storage_Architecture.md) · [04](04_Jitsi_Integration_and_Code_Examples.md)

เอกสารนี้รวบรวม **Workflow** และ **ขั้นตอนการใช้งาน (สรุป)** จากสเปก Processes — รายละเอียด `data-testid` และ boilerplate ENRICH เต็มอยู่ในไฟล์ต้นฉบับแต่ละหน้า

---

## สารบัญ

- [พอร์ทัลผู้ป่วย](#patient-portal)
- [พอร์ทัลแพทย์/แอดมิน](#doctor-portal)
- [Meeting Server](#meeting-server)
- [เอกสาร Workflow ระดับระบบ](#system-workflows)

---

<a id="patient-portal"></a>

## พอร์ทัลผู้ป่วย

### 00_Patient_Portal_Overview.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/00_Patient_Portal_Overview.md`](../../Processes/Pages/Patient-Portal/00_Patient_Portal_Overview.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **00 Patient Portal Overview** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «00 Patient Portal Overview» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 01_Login_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/01_Login_Page.md`](../../Processes/Pages/Patient-Portal/01_Login_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **01 Login** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Standard Login

```text
Step 1: Patient enters email and password
Step 2: Clicks "เข้าสู่ระบบ" (Login) button
Step 3: System calls AuthContext.login(email, password)
Step 4: POST /api/auth/login → Backend validates credentials
Step 5: Success → Session created → Redirect to Dashboard (/)
Step 6: Failure → Error message displayed ("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
```


### Workflow 2: Forgot Password

```text
Step 1: Patient clicks "ลืมรหัสผ่าน?" (Forgot password)
Step 2: View switches to forgot password form
Step 3: Patient enters registered email
Step 4: Clicks "ส่งลิงก์รีเซ็ต" (Send reset link)
Step 5: POST /api/auth/request-password-reset
Step 6: Success → Shows confirmation with 1-hour expiry
Step 7: Patient receives email with reset link
Step 8: Clicks link → Redirects to /reset-password?token=xxx
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/login` | Authenticate with email + password |
| POST | `/api/auth/request-password-reset` | Send password reset email |

---


## 6. Validation Rules

| Field | Rule |
| ----- | ---- |
| Email | Required, valid email format |
| Password | Required, minimum length enforced |

---


## 7. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Successful login | → Dashboard (`/`) |
| Register link | → Register Page (`/register`) |
| Reset password email | → Reset Password Page (`/reset-password`) |

---


## 8. AI Agent Improvement Opportunities


- **Biometric login**: Face/fingerprint authentication


- **Smart login**: Remember device, auto-fill


- **Suspicious activity detection**: Alert on unusual login patterns


- **Multi-factor authentication**: SMS/TOTP second factor

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิด URL Patient Portal (localhost:3005 หรือ izara-patient-*-dev-testing) — ตรวจ HTTPS และใบรับรองถูกต้อง
2. กรอกอีเมลใน `login-email` และรหัสผ่านใน `login-password` (หรือกด `google-sign-in-btn` สำหรับ SSO)
3. อ่านข้อความแจ้งเตือน: บัญชีแพทย์ที่ยัง `pending` จะไม่เข้าแดชบอร์ดคลินิก
4. กด `login-submit` — เรียก `POST /api/auth/login` (หรือ Google token exchange)
5. ตรวจ Network: HTTP 200 และ response มี JWT; ไม่มี 401/403
6. ยืนยัน redirect ไปแดชบอร์ด (`dashboard-page`) — ไม่กลับ `/login`
7. ทดสอบ «ลืมรหัสผ่าน» หากจำเป็น — ลิงก์ reset หมดอายุตามนโยบาย
8. ออกจากระบบเมื่อใช้เครื่องสาธารณะ — ล้าง session/localStorage

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 02_Register_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/02_Register_Page.md`](../../Processes/Pages/Patient-Portal/02_Register_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **02 Register** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflow


### Registration Flow

```text
Step 1: Patient clicks "สมัครสมาชิก" from login page
Step 2: Fills basic info (name, email, phone, DOB, gender, password)
Step 3: Clicks "ถัดไป" (Next) → validates Step 1 fields
Step 4: Fills optional health info (height, weight, blood type, allergies, etc.)
Step 5: Fills optional emergency contact
Step 6: Clicks "สมัครสมาชิก" (Register)
Step 7: AuthContext.register() → POST /api/auth/register
Step 8: Success → Auto-login → Redirect to Dashboard (/)
Step 9: Failure → Error message (e.g., "Email already registered")
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/register` | Create new patient account |




### Request Payload

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "dateOfBirth": "string",
  "gender": "male|female|other",
  "password": "string",
  "height": "number?",
  "weight": "number?",
  "bloodType": "string?",
  "allergies": "string?",
  "chronicConditions": "string?",
  "currentMedications": "string?",
  "emergencyContact": {
    "name": "string?",
    "phone": "string?",
    "relationship": "string?"
  }
}
```

---


## 7. Validation Rules

| Rule | Details |
| ---- | ------- |
| All Step 1 fields required | Cannot proceed without completing |
| Password min 6 chars | Enforced before next step |
| Password match | Confirm must equal password |
| Email format | Standard email validation |
| Step 2 optional | Can skip health info entirely |



---


## 8. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Successful registration | → Dashboard (`/`) |
| "Already have account" link | → Login Page (`/login`) |



---


## 9. AI Agent Improvement Opportunities


- **Smart health profile**: AI pre-fill chronic conditions from description

- **Medication auto-complete**: Drug database lookup during registration

- **Health risk assessment**: AI initial risk screening from health data

- **Document OCR**: Upload existing health card for auto-extraction

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เลือก «สมัครสมาชิก» จากหน้าเข้าสู่ระบบ
2. กรอกข้อมูลส่วนตัวและข้อมูลสุขภาพตามฟอร์ม (ขั้นที่ 1–2)
3. ยอมรับนโยบาย PDPA ที่เกี่ยวข้อง
4. ยืนยันรหัสผ่านให้ตรงกัน (≥ 8 ตัวอักษร)
5. ส่งแบบฟอร์ม — ระบบสร้างบัญชีผู้ป่วย
6. เข้าสู่ระบบด้วยบัญชีใหม่

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 03_Reset_Password_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/03_Reset_Password_Page.md`](../../Processes/Pages/Patient-Portal/03_Reset_Password_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **03 Reset Password** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflow

```text
Step 1: Patient clicks reset link from email
Step 2: Page extracts token from URL query parameter
Step 3: GET /api/auth/verify-reset-token?token=xxx
Step 4: Token valid → Shows reset form
Step 5: Patient enters new password (with strength indicators)
Step 6: Patient confirms password (must match)
Step 7: Clicks "รีเซ็ตรหัสผ่าน" (Reset Password)
Step 8: POST /api/auth/reset-password { token, newPassword }
Step 9: Success → Shows success message → Link to login
Step 10: Invalid token → Shows error → Link to login
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/auth/verify-reset-token` | Validate reset token |
| POST | `/api/auth/reset-password` | Submit new password |

---


## 6. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Success → Login link | → Login Page (`/login`) |
| Invalid token → Login link | → Login Page (`/login`) |

---


## 7. AI Agent Improvement Opportunities


- **Breach detection**: Check if new password appears in known breaches


- **Password suggestions**: AI-generated secure password suggestions


- **Activity verification**: Additional identity verification before reset

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. คลิก «ลืมรหัสผ่าน» จากหน้า login
2. กรอกอีเมลที่ลงทะเบียน
3. ตรวจสอบกล่องจดหมาย (ลิงก์หมดอายุตามนโยบาย)
4. เปิดลิงก์ reset — กรอกรหัสผ่านใหม่
5. ยืนยันรหัสผ่านซ้ำ
6. เข้าสู่ระบบด้วยรหัสผ่านใหม่

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 04_Dashboard_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/04_Dashboard_Page.md`](../../Processes/Pages/Patient-Portal/04_Dashboard_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **04 Dashboard** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: View Dashboard on Login

```text
Step 1: Patient logs in successfully
Step 2: Redirected to Dashboard (/)
Step 3: System fetches dashboard data:
        - GET /api/appointments (for upcoming)
        - GET /api/phr/{userId}/vitals (for health stats)
        - GET /api/notifications/{userId} (for alerts)
Step 4: Quick Actions, upcoming appointments, health stats render
Step 5: HealthStudio loads with default Overview tab
Step 6: AIHealthChat loads latest session
```


### Workflow 2: Join Upcoming Meeting

```text
Step 1: Patient sees confirmed telehealth appointment on dashboard
Step 2: Clicks "Join Meeting" button
Step 3: Opens Jitsi Meet URL in new tab
Step 4: Patient enters lobby and waits for doctor admission
```


### Workflow 3: View Latest Meeting Results on Dashboard

```text
Step 1: Doctor completes consultation and creates EMR
Step 2: Patient receives notification: "แพทย์ส่งผลการตรวจ"
Step 3: Dashboard auto-refreshes or patient navigates to dashboard
Step 4: Latest Appointment Result widget shows:
        - Diagnosis (patient-friendly Thai)
        - Treatment plan summary
        - Medications with instructions (วิธีกินยา)
        - Follow-up date
        - Warning signs to watch for
Step 5: Patient clicks "ดาวน์โหลดเอกสารคำแนะนำ" → Downloads PDF
        - PDF contains: diagnosis, medications, instructions,
          follow-up date, warning signs (all in Thai)
Step 6: Patient clicks "ดูรายละเอียดทั้งหมด" → navigates to /appointments/:id
```


### Workflow 4: Share Meeting Link from Dashboard

```text
Step 1: Patient sees upcoming confirmed appointment on dashboard
Step 2: Clicks "👥 เชิญญาติ" (Invite Relatives)
Step 3: Share dialog with options:
        - 📋 Copy link to clipboard
        - 📱 Share via LINE
        - ✉️ Share via email
Step 4: Relative/friend receives Jitsi meeting link
Step 5: Guest clicks link → enters LOBBY → doctor admits
Step 6: No Isara account needed for guests
```


### Workflow 5: Quick AI Consultation

```text
Step 1: Patient sees AI Health Chat widget (bottom-right)
Step 2: Clicks quick question or types own question
Step 3: POST /api/ai/chat → Gemini processes with medical context
Step 4: AI response displayed in chat bubble
Step 5: Patient can continue conversation or close
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Fetch upcoming appointments |
| GET | `/api/phr/{userId}/vitals` | Fetch latest vital signs |
| GET | `/api/notifications/{userId}` | Fetch notifications |
| POST | `/api/ai/chat` | AI health chat message |
| GET | `/api/ai/chat/sessions` | Load chat session list |
| GET | `/api/content/medical` | Load health content |
| GET | `/api/appointments/latest-result` | Get latest completed appointment result |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/meeting-link` | Get meeting link for upcoming appointment |
| POST | `/api/appointments/:id/share-link` | Generate shareable guest invite link |

---


## 6. Sub-Components

| Component | Purpose |
| --------- | ------- |
| `HealthStudio` | 3-tab health overview widget |
| `AIHealthChat` | Compact AI chat widget |
| `LatestAppointmentResult` | Most recent completed appointment |
| `TreatmentResults` | Treatment history with filters |
| `MedicalContent` | Health article browser |
| `VitalsChart` | Sparkline vital signs chart |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Quick Action: Book | `/book-appointment` |
| Quick Action: AI | `/ai-doctor` |
| Quick Action: PHR | `/phr` |
| Quick Action: Library | `/health-library` |
| Upcoming appointment card | `/appointments/:id` |
| Join Meeting button | Jitsi Meet (external) |
| AI Insight link | `/ai-doctor` |
| Health Overview links | `/phr`, `/ai-doctor` |

---


## 8. AI Agent Improvement Opportunities


- **Personalized dashboard**: AI-curated content based on patient conditions


- **Proactive alerts**: AI detect anomalies in vital trends and surface warnings


- **Smart scheduling**: AI suggest optimal follow-up timing


- **Health goal tracking**: AI-driven health improvement plans on dashboard


- **Medication reminders**: AI-timed medication alerts integrated into dashboard

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «04 Dashboard Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 05_Appointments_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/05_Appointments_Page.md`](../../Processes/Pages/Patient-Portal/05_Appointments_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **05 Appointments** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 6. Workflows


### Workflow 1: Book New Appointment

```text
Step 1:  Patient clicks "นัดหมายใหม่" from list or dashboard
Step 2:  Step 1 - Enter symptoms via text/voice/image
Step 3:  (Optional) Click "วิเคราะห์ด้วย AI" → POST /api/ai/symptom-triage
Step 4:  AI returns triage level + specialty recommendation
Step 5:  Fill medical info (duration, severity, fever, meds, allergies)
Step 6:  Click "ถัดไป" → Step 2
Step 7:  Select appointment type (telehealth/in-person)
Step 8:  Select urgency level
Step 9:  Select date from 14-day grid
Step 10: Select time slot
Step 11: Select doctor from list OR check "let system assign"
Step 12: Click "ถัดไป" → Step 3
Step 13: Review all details
Step 14: Click "ส่งคำขอนัดหมาย"
Step 15: If doctor selected → POST /api/appointments
Step 16: If no doctor → POST /api/appointment-pool (pool assignment)
Step 17: Success → Redirect to appointment list
Step 18: Notification sent to doctor/admin
```


### Workflow 2: Join Video Meeting (Full Jitsi Lobby Flow)

```text
Step 1:  Patient sees confirmed appointment with 🟢 ยืนยันแล้ว status
Step 2:  Appointment card shows:
         - [📋 คัดลอกลิงก์] (Copy Meeting Link)
         - [📹 เข้าร่วมประชุม] (Join Meeting)
         - [👥 เชิญญาติ/เพื่อน] (Invite Relatives/Friends)
Step 3:  Patient clicks "เข้าร่วมประชุม" → Opens Jitsi Meet in new tab
Step 4:  Jitsi URL format: <https://meet.jit.si/{roomName}#{config}>
Step 5:  Patient enters LOBBY (ห้องรอ) automatically
         - Shows: "กรุณารอแพทย์อนุมัติเข้าห้องประชุม..."
         - Patient sees own video preview
         - Patient can toggle mic/camera while waiting
Step 6:  Doctor sees patient in lobby → clicks "Admit"
Step 7:  Patient enters meeting room → video consultation begins
Step 8:  During meeting, patient has:
         - ✅ Video (camera on/off toggle)
         - ✅ Audio (microphone on/off toggle)
         - ✅ Text chat (in-meeting chat panel)
         - ✅ Screen share (if needed)
Step 9:  Real-time transcription runs (if enabled by doctor)
Step 10: Doctor ends meeting → Patient sees "การประชุมสิ้นสุดแล้ว"
Step 11: Appointment status changes: in_progress → completed
Step 12: Doctor processes AI summary → validates → creates EMR
Step 13: Patient receives notification: "แพทย์ส่งผลการตรวจ"
```


### Workflow 3: Share Meeting Link with Relatives/Friends (Guest Invite)

```text
Step 1:  Patient views confirmed appointment with meeting link
Step 2:  Clicks "👥 เชิญญาติ/เพื่อน" (Invite Relatives/Friends)
Step 3:  Share dialog appears with options:
         - 📋 Copy link to clipboard
         - 📱 Share via LINE
         - ✉️ Share via email
         - 📲 Share via SMS
Step 4:  Guest receives meeting link (no login required)
Step 5:  Guest clicks link → Enters Jitsi LOBBY
Step 6:  Doctor sees guest in lobby → admits them
Step 7:  Guest joins meeting as observer (video + audio + chat)

Note: Guests do NOT need an Isara account.
      Guests do NOT have access to medical records.
      The meeting link is valid only for the scheduled appointment time.
      Maximum 5 guests per meeting.
```


### Workflow 4: Post-Meeting Results (What Patient Receives)

```text
Step 1:  After meeting ends, doctor completes consultation:
         - AI generates meeting summary from transcription
         - Doctor validates and edits summary
         - Doctor creates EMR record
Step 2:  Patient receives the following (patient-friendly Thai format):
         ✅ Chief complaint and diagnosis (ภาษาไทยที่เข้าใจง่าย)
         ✅ Treatment plan summary (แผนการรักษา)
         ✅ Medications with instructions (ยาและวิธีกินยา)
         ✅ Patient Instruction Sheet PDF (เอกสารคำแนะนำผู้ป่วย)
         ✅ Follow-up schedule (กำหนดนัดติดตาม)
         ✅ Warning signs to watch for (อาการที่ต้องเฝ้าระวัง)
Step 3:  Patient does NOT receive:
         ❌ Internal doctor notes (บันทึกภายในของแพทย์)
         ❌ Raw AI outputs (ข้อมูลดิบจาก AI)
         ❌ Doctor-to-doctor communications
         ❌ CDS alerts (การแจ้งเตือนสนับสนุนการตัดสินใจทางคลินิก)
Step 4:  Results appear in:
         - 📊 Dashboard → Latest Result widget
         - 📋 Timeline → Treatment History entry
         - 💊 PHR → Health Logs
Step 5:  Patient can download Patient Instruction Sheet as PDF:
         - Click "📥 ดาวน์โหลดเอกสารคำแนะนำ"
         - PDF in Thai with: diagnosis, medications, instructions,
           follow-up date, warning signs
Step 6:  Appointment card status updates to 🔵 เสร็จสิ้น (Completed)
         with link: [ดูผลการรักษา] (View Results)
```


### Workflow 5: Cancel Appointment

```text
Step 1: Patient views appointment detail
Step 2: Clicks "ยกเลิกนัดหมาย" (Cancel)
Step 3: Confirmation dialog appears
Step 4: Patient confirms → PATCH /api/appointments/:id
Step 5: Status changes to "cancelled"
Step 6: Notification sent to doctor
```

---


## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List patient's appointments |
| GET | `/api/appointments/:id` | Get appointment details |
| POST | `/api/appointments` | Create new appointment |
| PATCH | `/api/appointments/:id` | Update/cancel appointment |
| POST | `/api/appointment-pool` | Submit to unassigned pool |
| GET | `/api/doctors` | List available doctors |
| GET | `/api/appointments/:id/meeting-link` | Get meeting link for confirmed appointment |
| POST | `/api/appointments/:id/share-link` | Generate shareable guest link |
| GET | `/api/appointments/:id/results` | Get post-meeting consultation results |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/emr-summary` | Get patient-friendly EMR summary |

---


## 8. Meeting Technology

| Component | Detail |
| --------- | ------ |
| **Video Platform** | Jitsi Meet (FREE, meet.jit.si) |
| **Lobby** | Enabled — patient waits until doctor admits |
| **Guest Access** | Via shared link, no login required |
| **Max Guests** | 5 per meeting (relatives/friends) |
| **Features** | Video, audio, text chat, screen share |
| **Recording** | Not recorded (privacy) |
| **Transcription** | Real-time AI transcription (doctor-side) |
| **Patient Portal** | Port 3005 |
| **Data Storage** | PostgreSQL |

---


## 9. Patient Data Privacy in Meetings

| What Patient RECEIVES | What Patient Does NOT Receive |
| --------------------- | ----------------------------- |
| ✅ Chief complaint & diagnosis (patient-friendly Thai) | ❌ Internal doctor notes |
| ✅ Treatment plan summary | ❌ Raw AI outputs |
| ✅ Medications with instructions (วิธีกินยา) | ❌ Doctor-to-doctor communications |
| ✅ Patient Instruction Sheet (PDF, Thai) | ❌ CDS alerts (internal clinical decision support) |
| ✅ Follow-up schedule | ❌ AI confidence scores |
| ✅ Warning signs to watch for | ❌ Billing/insurance internal codes |

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/ai/symptom-triage` | AI symptom analysis |
| POST | `/api/ai/symptom-suggest` | AI description improvement |

---


## 8. Connections to Other Pages

| From | Action | Destination |
| ---- | ------ | ----------- |
| Dashboard | Quick Action | → Book Appointment |
| Appointment List | Click card | → Appointment Detail |
| Appointment Detail | Join Meeting | → Jitsi Meet (external) |
| Appointment Detail | Add to Calendar | → Google Calendar (external) |
| Notification | Click notification | → Appointment Detail |

---


## 9. AI Agent Improvement Opportunities


- **Smart symptom interview**: AI conversational symptom gathering


- **Auto-schedule optimization**: AI find optimal time based on urgency + doctor availability


- **Waiting time prediction**: AI estimate wait time for each doctor


- **Follow-up booking**: AI auto-suggest follow-up appointments after consultation


- **Multilingual symptom input**: AI translate symptoms from any language


- **Image diagnosis**: AI preliminary analysis of uploaded medical images

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. ตรวจสอบสถานะนัดปัจจุบัน (pending / in_pool / awaiting_doctor_response / confirmed)
2. ดำเนินการตามบทบาท: ผู้ป่วยจอง | แอดมินจัดสรร | แพทย์ยืนยัน
3. ตรวจ KPI คิว (`queue-count`) และรายการใน `queue-list`
4. อัปเดต realtime ผ่าน Socket.IO / รีเฟรช
5. เริ่มวิดีโอคอลเมื่อสถานะ confirmed
6. บันทึก EMR/สั่งยา/แล็บหลังจบการพบ

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 06_PHR_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/06_PHR_Page.md`](../../Processes/Pages/Patient-Portal/06_PHR_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **06 PHR** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Record Vital Signs

```text
Step 1: Navigate to PHR page → Vitals tab
Step 2: Enter vital readings (any combination of fields)
Step 3: Click "บันทึก" (Save)
Step 4: POST /api/phr/{userId}/vitals
Step 5: New entry appears at top of history list
Step 6: Overview tab stats update with new readings
Step 7: Trend arrows update (↑ up / ↓ down / → same vs previous)
```


### Workflow 2: Manage Medications

```text
Step 1: Navigate to PHR page → Medications tab
Step 2: View current medications list
Step 3: Click "เพิ่มยา" (Add Medication)
Step 4: Fill in name, dosage, frequency, purpose
Step 5: Click "เพิ่ม" (Add)
Step 6: POST /api/phr/{userId}/medications
Step 7: New medication appears in list as "Active"
Step 8: Can mark medication as "Stopped" if discontinued
```


### Workflow 3: Update Lifestyle Data

```text
Step 1: Navigate to PHR page → Profile tab
Step 2: Edit lifestyle fields (diet, exercise, sleep, etc.)
Step 3: Click "บันทึก" (Save)
Step 4: PUT /api/phr/{userId}/profile
Step 5: Data saved and visible to authorized doctors
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/phr/{userId}` | Get full PHR data |
| GET | `/api/phr/{userId}/vitals` | Get vital signs history |
| POST | `/api/phr/{userId}/vitals` | Record new vitals |
| GET | `/api/phr/{userId}/medications` | Get medications list |
| POST | `/api/phr/{userId}/medications` | Add medication |
| PUT | `/api/phr/{userId}/profile` | Update profile/lifestyle |

---


## 6. Data Visible to Doctors

When PDPA consent is granted, doctors can see:

| Data Type | Doctor Access |
| --------- | ------------- |
| Vital signs history | ✅ Full history |
| Current medications | ✅ Active + stopped |
| Allergies | ✅ Full list |
| Chronic conditions | ✅ Full list |
| Lifestyle data | ✅ If shared |
| Blood type, height, weight | ✅ Always |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Overview quick actions | → Vitals tab, Medications tab, Allergies tab |
| Dashboard health stats | ← Pulls from PHR data |
| Doctor's PatientRecordViewer | ← Reads PHR data |
| AI Doctor chat | ← References PHR for context |

---


## 8. AI Agent Improvement Opportunities


- **Smart vital interpretation**: AI analyze vital trends and alert on concerning patterns


- **Medication interaction check**: AI cross-check all medications for interactions


- **Auto-import**: AI extract vitals from wearable devices (Apple Health, Google Fit)


- **Predictive health**: AI predict health risks from PHR trends


- **Medication reminders**: AI generate personalized medication schedules


- **Allergy severity classification**: AI categorize allergy severity automatically

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เลือกผู้ป่วย (แพทย์) หรือเปิดเมนู PHR (ผู้ป่วย)
2. เลือกแท็บ Vitals / Meds / Allergies / EMR
3. ตรวจข้อมูลล่าสุดจากการซิงค์
4. ไม่แก้ไขข้อมูลที่แพทย์ล็อกแล้ว
5. ดาวน์โหลด/พิมพ์ตามสิทธิ์

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 07_AI_Doctor_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/07_AI_Doctor_Page.md`](../../Processes/Pages/Patient-Portal/07_AI_Doctor_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **07 AI Doctor** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Ask Health Question

```text
Step 1: Patient navigates to /ai-doctor
Step 2: Types question or clicks quick suggestion
Step 3: POST /api/ai/chat with message + session context
Step 4: Typing indicator shown while AI processes
Step 5: Gemini 2.5 Flash Lite generates medical response
Step 6: Response displayed in chat bubble
Step 7: Session saved for future reference
Step 8: Patient can continue asking follow-up questions
```


### Workflow 2: Start New Session

```text
Step 1: Click "New Chat" button in sidebar
Step 2: POST /api/ai/chat/sessions (create new session)
Step 3: Chat area cleared with welcome message
Step 4: Quick suggestions displayed
Step 5: Previous session preserved in sidebar list
```


### Workflow 3: Review Past Conversations

```text
Step 1: Click session in sidebar list
Step 2: GET /api/ai/chat/sessions/:id/messages
Step 3: Full conversation history loaded
Step 4: Can continue conversation from where it left off
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/ai/chat` | Send message + get AI response |
| GET | `/api/ai/chat/sessions` | List all chat sessions |
| POST | `/api/ai/chat/sessions` | Create new session |
| GET | `/api/ai/chat/sessions/:id/messages` | Get session history |
| DELETE | `/api/ai/chat/sessions/:id` | Delete session |

---


## 6. AI Response Format

Responses typically include:

| Section | Description |
| ------- | ----------- |
| 📌 คำแนะนำเบื้องต้น | Preliminary recommendations |
| ⚠️ ควรพบแพทย์ถ้า | When to see a doctor |
| 🏠 การดูแลตัวเอง | Self-care instructions |
| 💊 ข้อมูลยา | Medication information (general) |
| 🔍 ข้อมูลเพิ่มเติม | Additional information |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Dashboard AI widget | ← Same AI service, compact view |
| Dashboard quick action | → This page |
| Symptom triage (booking) | Uses same AI engine |
| Health Studio AI Insight | → This page |

---


## 8. AI Agent Improvement Opportunities


- **Context-aware**: AI reads patient's PHR for personalized advice


- **Image analysis**: AI analyze skin conditions, rashes from photos


- **Medication queries**: AI check specific drug interactions for patient's medications


- **Follow-up prompts**: AI proactively ask clarifying questions


- **Escalation**: AI recommend booking appointment when symptoms are concerning


- **Multilingual**: AI handle conversations in multiple languages simultaneously


- **Voice input**: AI accept voice questions with speech-to-text

---


## 9. PostgreSQL Database Integration


### Tables Used

| Table | Operation | Description |
| ----- | --------- | ----------- |
| ai_chat_history | SELECT/INSERT | Patient AI health chat conversation logs |
| knowledge_base | SELECT | RAG retrieval for medical knowledge responses |


### API Endpoints

| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/ai/health-chat | POST | SELECT knowledge_base (RAG); INSERT ai_chat_history |


### AI Engine


- **Model:** Gemini 2.5 Flash Lite (Google AI)


### Deployment


- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1


- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)


- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิด AI Doctor / Gemini Studio
2. กรอกอาการหรือคำถาม — ไม่ใส่ข้อมูลระบุตัวบุคคลเกินจำเป็น
3. อ่านคำเตือน: ไม่ใช่การวินิจฉัย
4. ใช้ปุ่ม handoff จองนัดหากแนะนำ
5. แพทย์ตรวจสอบผลลัพธ์ก่อนส่งต่อผู้ป่วย

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 08_Medical_Content_Library.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/08_Medical_Content_Library.md`](../../Processes/Pages/Patient-Portal/08_Medical_Content_Library.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **08 Medical Content Library** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Browse Health Content

```text
Step 1: Navigate to /health-library
Step 2: GET /api/content/medical → loads all published content
Step 3: GET /api/content/tags/medical → loads available tags
Step 4: Browse featured content and article grid
Step 5: Use search bar or category pills to filter
Step 6: Click article card to view full content
```


### Workflow 2: Read Article

```text
Step 1: Click on article card from grid
Step 2: Article detail view opens
Step 3: POST /api/content/medical/:id/view (track view count)
Step 4: Read article with rendered markdown content
Step 5: Watch embedded video if available
Step 6: View related tags
Step 7: Click "Back" to return to list
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/content/medical` | List published health content |
| GET | `/api/content/tags/medical` | Get content tags |
| POST | `/api/content/medical/:id/view` | Track article view |



---


## 7. Content Types

| Type | Description | Icon |
| ---- | ----------- | ---- |
| article | Written health article | 📄 |
| video | Video content (YouTube/native) | 🎥 |
| guide | Step-by-step health guide | 📋 |
| infographic | Visual health information | 📊 |



---


## 8. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Dashboard Health Studio | → | Content tab shows articles |
| Doctor Portal Medical Content | ← | Doctors create content here |
| Admin approval | ← | Only approved content visible |



---


## 9. AI Agent Improvement Opportunities


- **Personalized recommendations**: AI suggest articles based on patient's conditions

- **Content summarization**: AI provide quick summaries of long articles

- **Translation**: AI translate articles for multilingual patients

- **Accessibility**: AI read articles aloud for visually impaired

- **Interactive content**: AI-powered quizzes about health topics

- **Related content**: AI suggest related articles based on reading history

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «08 Medical Content Library» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 09_Map_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/09_Map_Page.md`](../../Processes/Pages/Patient-Portal/09_Map_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **09 Map** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 6. Workflows


### Workflow 1: Find Nearby Facilities

```text
Step 1: Navigate to /map
Step 2: Browser requests geolocation permission
Step 3: If granted → Gets GPS coordinates → Shows accuracy badge
Step 4: If denied → Falls back to Bangkok default location
Step 5: Map loads with markers for nearby facilities
Step 6: Range circle drawn at default 5km radius
Step 7: Facility list populated sorted by distance
```


### Workflow 2: Filter by Type

```text
Step 1: Click facility type filter button (e.g., "Hospital")
Step 2: Only hospital markers remain on map
Step 3: Facility list filters to show only hospitals
Step 4: Click again to deselect / show all
```


### Workflow 3: Change Range

```text
Step 1: Select different range (e.g., 10km)
Step 2: Range circle expands on map
Step 3: Map auto-zooms to fit new radius
Step 4: More/fewer facilities shown based on range
Step 5: Facility list updates
```


### Workflow 4: Navigate to Facility

```text
Step 1: Click facility marker or list item
Step 2: Info window opens with details
Step 3: Click "นำทาง" (Navigate) button
Step 4: Google Maps opens with directions from current location
```


### Workflow 5: Search Facilities

```text
Step 1: Type facility name or address in search box
Step 2: Facility list filters in real-time
Step 3: Matching facilities highlighted
```

---


## 7. MiniMapWidget (Sidebar Component)

```text
┌─────────────────────┐
│  🗺️ สถานพยาบาลใกล้ │
│  🏥 🏪 💊 🏢        │
│  Tap to open map →  │
└─────────────────────┘
```


- Compact widget in sidebar showing 4 facility type icons

- Gradient background, dark mode support

- Clicking navigates to full Map page (`/map`)

---


## 8. Technical Details

| Feature | Implementation |
| ------- | -------------- |
| Map Provider | Google Maps via `@react-google-maps/api` |
| Geolocation | Browser Geolocation API |
| GPS Accuracy | High accuracy → low accuracy fallback |
| Default Location | Bangkok: 13.7563°N, 100.5018°E |
| Distance Calculation | Haversine formula |
| Marker Clustering | For dense areas |



---


## 9. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Sidebar MiniMapWidget | → | Navigates to full Map page |
| Dashboard | → | Via sidebar navigation |



---


## 10. AI Agent Improvement Opportunities


- **Smart recommendations**: AI suggest nearest facility based on patient's condition

- **Wait time predictions**: AI estimate current wait times at facilities

- **Specialty matching**: AI find facilities with specific specialists nearby

- **Emergency routing**: AI optimize route to nearest ER

- **Facility reviews**: AI summarize patient reviews/ratings

- **Operating hours**: AI-enhanced real-time open/closed status

- **Insurance matching**: AI filter by patient's insurance coverage

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «09 Map Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 10_PDPA_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/10_PDPA_Page.md`](../../Processes/Pages/Patient-Portal/10_PDPA_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **10 PDPA** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Manage Consent Settings

```text
Step 1: Navigate to /pdpa → Privacy Settings tab
Step 2: View current consent status for each category
Step 3: Toggle consent switches as desired
Step 4: POST /api/pdpa/consent with updated preferences
Step 5: Audit log entry created for each change
Step 6: Doctors' access updated immediately
```


### Workflow 2: Review Access History

```text
Step 1: Navigate to /pdpa → Access History tab
Step 2: GET /api/pdpa/audit-log
Step 3: View chronological list of all data access events
Step 4: Each entry shows: event type, who accessed, when, what data
```


### Workflow 3: Revoke All Consent

```text
Step 1: Turn off all optional consent toggles
Step 2: Confirmation dialog appears
Step 3: Confirm → POST /api/pdpa/consent (all false)
Step 4: All doctor access immediately revoked
Step 5: Audit log records CONSENT_REVOKED events
Step 6: Essential data consent remains (cannot be revoked)
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/pdpa/consent` | Get current consent settings |
| POST | `/api/pdpa/consent` | Update consent settings |
| GET | `/api/pdpa/audit-log` | Get access history |
| GET | `/api/pdpa/doctors` | Get doctors with access |
| POST | `/api/pdpa/doctors/:id/revoke` | Revoke specific doctor access |
| GET | `/api/pdpa/status` | Get overall PDPA status |
| POST | `/api/pdpa/accept` | Accept PDPA terms |

---


## 6. Consent Categories

| Category | Required | Description |
| -------- | -------- | ----------- |
| essential | ✅ Yes | Core medical data for treatment |
| health_data | ❌ No | Share health records with doctors |
| data_sharing | ❌ No | Share with healthcare professionals |
| analytics | ❌ No | Anonymous data for service improvement |
| marketing | ❌ No | Health news and updates |

---


## 7. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| Living Will link | → Living Will Page (`/living-will`) |
| Doctor access management | ↔ Doctor portal patient records |
| Consent affects | → PHR visibility to doctors |
| Consent affects | → EMR access by doctors |
| Audit log | ← Records from all doctor access events |

---


## 8. AI Agent Improvement Opportunities


- **Consent recommendations**: AI explain impact of each consent choice


- **Privacy dashboard**: AI-generated privacy health score


- **Anomaly detection**: AI flag unusual data access patterns


- **Auto-notifications**: AI alert when new doctor accesses data


- **Consent expiry**: AI manage time-limited consent periods


- **PDPA compliance report**: AI generate downloadable compliance report

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิดเมนู PDPA
2. อ่านคำอธิบายแต่ละประเภทความยินยอม
3. สลับ `pdpa-consent-toggle-*` ตามต้องการ
4. ตรวจแท็บ Audit — `pdpa-audit-log` (ไม่แก้ไขย้อนหลัง)
5. จัดการสิทธิ์แพทย์ที่เข้าถึงข้อมูล

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 11_Living_Will_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/11_Living_Will_Page.md`](../../Processes/Pages/Patient-Portal/11_Living_Will_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **11 Living Will** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Create Living Will

```text
Step 1:  Navigate to /living-will
Step 2:  System checks for existing Living Will → GET /api/phr/{userId}/living-will
Step 3:  If none exists → Shows 4-step wizard
Step 4:  Step 1: Enter primary healthcare proxy (name*, relationship*, phone*)
Step 5:  (Optional) Add alternate proxy
Step 6:  Click "Next" → Step 2
Step 7:  Set treatment preferences (CPR, ventilation, nutrition, dialysis)
Step 8:  Set organ donation preference
Step 9:  Select pain management level
Step 10: Add religious preferences / additional wishes
Step 11: Click "Next" → Step 3
Step 12: Draw digital signature on canvas
Step 13: Click "Next" → Step 4
Step 14: Add doctors to share with (search + add)
Step 15: Review summary of all selections
Step 16: Click "บันทึก" → POST /api/phr/{userId}/living-will
Step 17: Living Will saved → Audit log entry created
Step 18: Shared doctors can now view in PatientRecordViewer
```


### Workflow 2: Edit Existing Living Will

```text
Step 1: Navigate to /living-will
Step 2: Existing Living Will loaded
Step 3: Click "Edit" → Wizard opens with pre-filled data
Step 4: Modify any step
Step 5: Save → Creates new version (old version preserved)
Step 6: Audit log: LIVING_WILL_UPDATED
```


### Workflow 3: View Version History

```text
Step 1: Click "Version History" button
Step 2: Modal shows all versions with dates
Step 3: Click "View" to preview a version
Step 4: Click "Rollback" to revert to a previous version
Step 5: Rollback creates new version (non-destructive)
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/phr/{userId}/living-will` | Get current Living Will |
| POST | `/api/phr/{userId}/living-will` | Create Living Will |
| PUT | `/api/phr/{userId}/living-will` | Update Living Will |
| GET | `/api/phr/{userId}/living-will/versions` | Get version history |
| POST | `/api/phr/{userId}/living-will/rollback` | Rollback to version |
| GET | `/api/doctors` | Search doctors for sharing |

---


## 7. Doctor Portal Visibility

When shared, the Living Will appears in the PatientRecordViewer's PHR tab showing:

| Field | Display |
| ----- | ------- |
| Treatment preferences | CPR, Ventilation, Nutrition, Dialysis with ✅/❌ badges |
| Organ donation | ✅/❌ status |
| Pain management | Level display |
| Personal statement | Full text |
| Representative | Name + relationship |
| Signature status | Signed / Not signed |

---


## 8. Connections to Other Pages

| Element | Destination |
| ------- | ----------- |
| PDPA page link | ← Accessible from PDPA page |
| Doctor PatientRecordViewer | → Living Will card shown in PHR tab |
| Audit log | → Entries in PDPA access history |

---


## 9. AI Agent Improvement Opportunities


- **Guided creation**: AI walk patient through choices with explanations


- **Legal compliance check**: AI verify document completeness


- **Translation**: AI translate Living Will for multilingual families


- **Reminder**: AI prompt periodic review of Living Will


- **Template suggestions**: AI suggest common treatment preference combinations


- **Family notification**: AI automated notification when Living Will is updated

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิดหนังสือแสดงเจตนา (4 ขั้นตอน)
2. กรอกผู้รับมอบฉันทะและความต้องการการรักษา
3. ลงลายมือชื่อบน `living-will-signature`
4. บันทึกและเลือกแชร์ให้แพทย์
5. ตรวจว่าแพทย์เห็นใน Patient Record Viewer

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 12_Profile_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/12_Profile_Page.md`](../../Processes/Pages/Patient-Portal/12_Profile_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **12 Profile** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: View Profile

```text
Step 1: Navigate to /profile
Step 2: Profile data loaded from AuthContext
Step 3: All fields displayed in read-only mode
```


### Workflow 2: Edit Profile

```text
Step 1: Click "แก้ไข" (Edit) button
Step 2: Fields become editable input fields
Step 3: Modify desired fields
Step 4: Click "บันทึก" (Save)
Step 5: PUT /api/auth/profile → Updates user record
Step 6: AuthContext.updateUser() refreshes local state
Step 7: Success notification shown
```


### Workflow 3: Change Avatar

```text
Step 1: Click "เปลี่ยนรูป" (Change Photo) button
Step 2: File picker opens (JPG/PNG/WebP only)
Step 3: Select image (max 5MB)
Step 4: Image converted to base64
Step 5: POST /api/phr/profile/{userId}/avatar
Step 6: Avatar updates in header and sidebar
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/auth/profile` | Get profile data |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/phr/profile/{userId}/avatar` | Upload avatar image |

---


## 7. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Settings page | ↔ | Avatar change also accessible from Settings |
| Sidebar user info | ← | Shows profile name + avatar |
| Header avatar | ← | Shows profile avatar |
| PHR page | ↔ | Blood type + health info shared |

---


## 8. AI Agent Improvement Opportunities


- **Profile completeness**: AI score profile completion and suggest missing fields


- **Smart address**: AI auto-complete Thai addresses


- **Photo validation**: AI verify avatar is appropriate


- **Emergency contact verification**: AI verify emergency contact phone is reachable

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «12 Profile Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 13_Settings_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/13_Settings_Page.md`](../../Processes/Pages/Patient-Portal/13_Settings_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **13 Settings** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Change Password

```text
Step 1: Click "เปลี่ยนรหัสผ่าน" row
Step 2: PasswordChangeModal opens
Step 3: Enter current password
Step 4: Enter new password + confirm
Step 5: Click "เปลี่ยนรหัสผ่าน"
Step 6: POST /api/auth/change-password
Step 7: Success → Modal closes + success toast
Step 8: Failure → Error message in modal
```


### Workflow 2: Change Profile Image

```text
Step 1: Click "เปลี่ยนรูปโปรไฟล์"
Step 2: ProfileImageModal opens
Step 3: Select file (JPG/PNG/WebP, max 5MB)
Step 4: Preview shown
Step 5: Click "อัปโหลด"
Step 6: POST /api/phr/profile/{userId}/avatar
Step 7: Avatar updates across all pages
```


### Workflow 3: Toggle Settings

```text
Step 1: Toggle any switch (notifications, dark mode, language)
Step 2: Setting saved immediately (localStorage or Context)
Step 3: UI updates in real-time
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/phr/profile/{userId}/avatar` | Upload avatar |

---


## 7. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Profile page | ↔ | Avatar shared between Profile and Settings |
| All pages | ← | Dark mode and language affect entire portal |
| Login page | ← | Logout redirects to login |

---


## 8. AI Agent Improvement Opportunities


- **Smart notifications**: AI learn preferred notification timing


- **Accessibility settings**: AI auto-adjust for user capabilities


- **Data export**: AI generate complete data export (PDPA right)


- **Account insights**: AI show account activity summary

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «13 Settings Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 14_Timeline_Page.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/14_Timeline_Page.md`](../../Processes/Pages/Patient-Portal/14_Timeline_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **14 Timeline** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Browse Treatment History

```text
Step 1: Navigate to /timeline
Step 2: GET /api/health/timeline (or combined appointment/PHR data)
Step 3: Events loaded and grouped by month
Step 4: Newest events displayed first
Step 5: Scroll through chronological timeline
```


### Workflow 2: Filter by Event Type

```text
Step 1: Click filter button (e.g., "💊 ยา")
Step 2: Only medication events displayed
Step 3: Click "ทั้งหมด" to show all events again
```


### Workflow 3: View Event Details

```text
Step 1: Click on a timeline event card
Step 2: Card expands to show full details
Step 3: Shows relevant information based on event type:
        - Appointment: doctor, diagnosis, treatment, prescription
        - Consultation: meeting outcome, diagnosis, treatment plan, medications
        - Medication: name, dosage, frequency, purpose
        - Lab: test name, results, normal ranges
        - Procedure: type, doctor, notes
        - Diagnosis: ICD-10 code, description, doctor
        - Instruction Sheet: PDF download, summary of instructions
```


### Workflow 4: View Completed Meeting Results in Timeline

```text
Step 1: After telehealth consultation is completed:
        - Doctor processes AI summary → validates → creates EMR
        - EMR data flows to timeline as new entries
Step 2: Patient navigates to /timeline
Step 3: New timeline entries appear for the completed consultation:

        📹 Consultation Entry (ผลการปรึกษา):
        ├── Doctor name and specialty
        ├── Meeting date and time
        ├── Type: Telehealth (📹)
        ├── Diagnosis (patient-friendly Thai):
        │   "ความดันโลหิตสูง ระยะที่ 1"
        ├── Treatment Plan:
        │   "ปรับยา Amlodipine, ลดอาหารเค็ม, ออกกำลังกาย"
        ├── Medications with Instructions (วิธีกินยา):
        │   "Amlodipine 5mg วันละ 1 เม็ด หลังอาหารเช้า"
        ├── Follow-up: 22 ก.พ. 2569
        └── Warning Signs: ปวดศีรษะรุนแรง, ตาพร่ามัว

        📝 Patient Instruction Sheet Entry (เอกสารคำแนะนำ):
        ├── Generated date
        ├── Associated appointment reference
        ├── Summary of key instructions
        └── [📥 ดาวน์โหลด PDF] button

Step 4: Patient clicks on consultation entry → expands to full details
Step 5: Patient clicks "📥 ดาวน์โหลด PDF" → downloads instruction sheet
```


### Workflow 5: Download Patient Instruction Sheet from Timeline

```text
Step 1: Patient scrolls to consultation entry with 📝 icon
Step 2: Clicks the entry to expand
Step 3: Sees instruction sheet summary:
        - Diagnosis in patient-friendly Thai
        - Medication list with dosage and instructions
        - Follow-up appointment date
        - Warning signs to watch for
        - Doctor's name and contact info
Step 4: Clicks [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]
Step 5: PDF downloads with Thai content:
        - เอกสารคำแนะนำผู้ป่วย (Patient Instruction Sheet)
        - Date and doctor information
        - Diagnosis and treatment plan
        - Medications with วิธีกินยา (how to take)
        - Warning signs (อาการที่ต้องเฝ้าระวัง)
        - Follow-up date and instructions
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/health/timeline` | Get complete treatment timeline |
| GET | `/api/health/timeline?type=consultation` | Filter timeline by consultation events |
| GET | `/api/appointments/:id/results` | Get patient-friendly consultation results |
| GET | `/api/appointments/:id/instruction-sheet` | Download Patient Instruction Sheet (PDF) |
| GET | `/api/appointments/:id/emr-summary` | Get patient-visible EMR summary |

---


## 7. Data Sources

| Event Type | Data Source |
| ---------- | ----------- |
| Appointments | `appointments` table |
| Consultations | `appointments` (completed telehealth) + `emr_records` |
| Medications | PHR medications + prescriptions |
| Lab Results | `lab_orders` table |
| Procedures | EMR records |
| Diagnoses | EMR diagnosis entries |
| Instruction Sheets | `patient_instruction_sheets` table (generated PDFs) |

---


## 8. Connections to Other Pages

| From/To | Direction | Description |
| ------- | --------- | ----------- |
| Dashboard | → | Quick link from treatment results |
| Appointments | ← | Completed appointments feed into timeline |
| PHR | ← | Medications appear in timeline |
| Doctor EMR | ← | EMR data feeds diagnosis/procedure events |

---


## 9. Consultation Result Display (Patient-Friendly Format)

When a telehealth consultation is completed, the timeline shows results in patient-friendly Thai format:

```text
┌── 📹 ผลการปรึกษา — 22 ม.ค. 2569 ──────────────────────────────┐
│                                                                 │
│  👨‍⚕️ นพ. ทดสอบ ระบบ · อายุรกรรม                                  │
│  📹 Telehealth · ⏱️ 25 นาที                                     │
│                                                                 │
│  🏥 การวินิจฉัย (Diagnosis):                                     │
│  ความดันโลหิตสูง ระยะที่ 1                                       │
│                                                                 │
│  📋 แผนการรักษา (Treatment Plan):                                │
│  • ปรับยา Amlodipine จาก 2.5mg เป็น 5mg                        │
│  • ลดอาหารเค็ม                                                   │
│  • ออกกำลังกายอย่างน้อย 30 นาที/วัน                              │
│                                                                 │
│  💊 ยาที่สั่ง (Medications):                                      │
│  ├── Amlodipine 5mg — วันละ 1 เม็ด หลังอาหารเช้า                │
│  └── Aspirin 81mg — วันละ 1 เม็ด หลังอาหารเย็น                  │
│                                                                 │
│  📅 นัดติดตาม: 22 ก.พ. 2569                                     │
│                                                                 │
│  ⚠️ อาการที่ต้องเฝ้าระวัง:                                        │
│  • ปวดศีรษะรุนแรง                                                │
│  • ตาพร่ามัว                                                     │
│  • เจ็บหน้าอก หายใจลำบาก                                        │
│  → หากมีอาการเหล่านี้ ให้พบแพทย์ทันที                            │
│                                                                 │
│  [📥 ดาวน์โหลดเอกสารคำแนะนำ (PDF)]                              │
└─────────────────────────────────────────────────────────────────┘
```


## Patient Data Privacy in Timeline

| Visible to Patient | NOT Visible to Patient |
| ------------------- | ---------------------- |
| ✅ Diagnosis (patient-friendly Thai) | ❌ Internal doctor notes |
| ✅ Treatment plan summary | ❌ Raw AI outputs / transcription |
| ✅ Medications + instructions (วิธีกินยา) | ❌ Doctor-to-doctor communications |
| ✅ Patient Instruction Sheet (PDF) | ❌ CDS alerts (clinical decision support) |
| ✅ Follow-up schedule | ❌ AI confidence scores |
| ✅ Warning signs | ❌ Internal billing codes |

---


## 10. AI Agent Improvement Opportunities


- **Smart summary**: AI generate overall health trajectory summary


- **Trend analysis**: AI identify patterns in treatment history


- **Predictive timeline**: AI forecast upcoming needed appointments/tests


- **Export/Print**: AI format timeline for sharing with other providers


- **Comparison view**: AI compare current vs past health metrics


- **Event correlation**: AI link related events (diagnosis → medication → lab)

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «14 Timeline Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 15_Notification_System.md

**ต้นฉบับ:** [`Processes/Pages/Patient-Portal/15_Notification_System.md`](../../Processes/Pages/Patient-Portal/15_Notification_System.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **15 Notification System** อธิบายการทำงานของพอร์ทัลผู้ป่วย ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Receive Notification

```text
Step 1: Event occurs (e.g., doctor confirms appointment)
Step 2: Notification created in PostgreSQL
Step 3: Next polling cycle (30 seconds) picks up new notification
Step 4: Bell badge count increments
Step 5: Patient clicks bell → Panel shows new notification at top
Step 6: Notification shows with green unread indicator
```


### Workflow 2: Act on Notification

```text
Step 1: Click notification in panel
Step 2: Notification marked as read
Step 3: Action link activated:
        - "ดูรายละเอียด" → Navigate to appointment detail
        - "เข้าร่วม" → Open Jitsi Meet in new tab
        - "Calendar" → Open Google Calendar add URL
Step 4: Panel closes
Step 5: Badge count decreases
```


### Workflow 3: Mark All as Read

```text
Step 1: Click "อ่านทั้งหมด" (Mark All Read)
Step 2: PATCH /api/notifications/{userId}/read-all
Step 3: All notifications lose unread indicator
Step 4: Badge count resets to 0
```


### Workflow 4: Complete Meeting Notification Flow (End-to-End)

```text
──── BOOKING PHASE ────
Step 1:  Patient books appointment → status: pending
         (No notification to patient yet)

Step 2:  Doctor confirms appointment → status: confirmed
         🔔 Notification: "แพทย์ยืนยันนัดหมาย"
         Thai: "นพ. ทดสอบ ระบบ ยืนยันนัดหมาย 22 ม.ค. 2569 เวลา 09:00"
         Actions: [ดูรายละเอียด] [📹 เข้าร่วมประชุม] [📆 Calendar]
         Meeting link included in notification

──── PRE-MEETING PHASE ────
Step 3:  60 minutes before meeting
         🔔 Notification: "การนัดหมายจะเริ่มใน 1 ชั่วโมง"
         Actions: [ดูรายละเอียด]

Step 4:  15 minutes before meeting
         🔔 Notification: "การนัดหมายจะเริ่มใน 15 นาที — เข้าร่วมได้เลย"
         Actions: [📹 เข้าร่วมประชุม] (direct Jitsi link)
         Note: Meeting room lobby opens 10 minutes before scheduled time

──── MEETING PHASE ────
Step 5:  Doctor opens meeting room
         🔔 Notification: "แพทย์เปิดห้องประชุมแล้ว — เข้าร่วมเลย"
         Actions: [📹 เข้าร่วมเลย] (high priority, teal highlight)
         Patient clicks → enters Jitsi LOBBY → waits for doctor admit

Step 6:  Meeting in progress → status: in_progress
         (No notification — patient is in meeting)

Step 7:  Meeting ends → status: completed
         🔔 Notification: "การประชุมสิ้นสุดแล้ว — รอผลการตรวจจากแพทย์"
         Actions: [ดูนัดหมาย]

──── POST-MEETING PHASE ────
Step 8:  Doctor processes AI summary → validates → creates EMR
         🔔 Notification: "แพทย์ส่งผลการตรวจ"
         Thai: "ผลการตรวจสำหรับนัดหมาย 22 ม.ค. 2569 พร้อมแล้ว"
         Actions: [ดูผลการตรวจ]

Step 9:  Patient Instruction Sheet PDF generated
         🔔 Notification: "เอกสารคำแนะนำพร้อมดาวน์โหลด"
         Thai: "เอกสารคำแนะนำผู้ป่วยสำหรับนัดหมาย 22 ม.ค. พร้อมดาวน์โหลด"
         Actions: [📥 ดาวน์โหลด PDF]

Step 10: Follow-up appointment created by doctor
         🔔 Notification: "นัดติดตามผลวันที่ 22 ก.พ. 2569"
         Actions: [ดูนัดหมาย] [📆 Calendar]

Step 11: New prescription issued
         🔔 Notification: "แพทย์สั่งยาใหม่ — ดูรายละเอียดยาและวิธีกินยา"
         Actions: [ดูรายละเอียดยา]
```


### Workflow 5: Meeting Status Change Notifications

```text
Status changes that trigger notifications:

  pending → confirmed
  🔔 "แพทย์ยืนยันนัดหมาย" + meeting link

  confirmed → in_progress
  🔔 "แพทย์เปิดห้องประชุมแล้ว"

  in_progress → completed
  🔔 "การประชุมสิ้นสุดแล้ว"

  completed → results_ready (EMR created)
  🔔 "แพทย์ส่งผลการตรวจ"

  confirmed → cancelled
  🔔 "นัดหมายถูกยกเลิก"

  confirmed → rescheduled
  🔔 "นัดหมายถูกเลื่อน" + new date/time

  patient no-show
  🔔 "คุณพลาดนัดหมาย — กรุณาติดต่อเพื่อนัดหมายใหม่"
```

---


## 6. Relative Time Display (Thai)

| Time Range | Display |
| ---------- | ------- |
| < 1 minute | เมื่อสักครู่ |
| 1-59 minutes | X นาทีที่แล้ว |
| 1-23 hours | X ชั่วโมงที่แล้ว |
| 1+ days | X วันที่แล้ว |

---


## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/notifications/{userId}` | Fetch all notifications |
| GET | `/api/notifications/{userId}?type=meeting` | Fetch meeting-related notifications only |
| PATCH | `/api/notifications/:id/read` | Mark single as read |
| PATCH | `/api/notifications/{userId}/read-all` | Mark all as read |
| POST | `/api/notifications/meeting-reminder` | Trigger meeting reminder (server-side cron) |
| POST | `/api/notifications/results-ready` | Notify patient of available results (triggered by doctor) |

---


## 8. Notification Delivery Channels

| Channel | Used For | Technology |
| ------- | -------- | ---------- |
| **In-App** | All notifications | PostgreSQL + 30-second polling |
| **Email** | Appointment confirmed, results ready, instruction sheet | SMTP / SendGrid |
| **Dashboard Banner** | New results, upcoming meeting reminders | Real-time dashboard widget |

> **Note:** Push notifications (mobile/browser) planned for Phase 2. Phase 1 uses in-app + email only.

---


## 9. Connections to Other Pages

| Action | Destination |
| ------ | ----------- |
| Click appointment notification | → `/appointments/:id` |
| Click meeting join | → Jitsi Meet (external) |
| Click calendar | → Google Calendar (external) |
| View all | → Notifications list page |

---


## 10. AI Agent Improvement Opportunities


- **Priority sorting**: AI rank notifications by importance (meeting starting > results ready > general)


- **Smart batching**: AI group related notifications (e.g., results + instruction sheet + follow-up)


- **Push notifications**: AI determine when to use push vs in-app


- **Predictive alerts**: AI notify before appointment (24h, 1h, 15min) — implemented in Phase 1


- **Natural language summaries**: AI summarize notification clusters


- **Action suggestions**: AI recommend next action based on notification


- **Meeting prep reminders**: AI remind patient to prepare questions before telehealth meeting


- **Result comprehension**: AI explain medical terms in notifications using patient-friendly language


- **Follow-up compliance**: AI track if patient acknowledges results and follows up as scheduled

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลผู้ป่วย — ตรวจ URL และ HTTPS
2. เปิดหน้า «15 Notification System» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

<a id="doctor-portal"></a>

## พอร์ทัลแพทย์/แอดมิน

### 00_Doctor_Portal_Overview.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/00_Doctor_Portal_Overview.md`](../../Processes/Pages/Doctor-Portal/00_Doctor_Portal_Overview.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **00 Doctor Portal Overview** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «00 Doctor Portal Overview» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 01_Login_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/01_Login_Page.md`](../../Processes/Pages/Doctor-Portal/01_Login_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **01 Login** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Doctor Login

```text
Step 1: Doctor navigates to localhost:3010/login
Step 2: Enters email and password
Step 3: Clicks "เข้าสู่ระบบ" (Login)
Step 4: POST /auth/login → validates credentials
Step 5: Checks user role (doctor/admin) and approval status
Step 6: If approved → Redirect to /dashboard
Step 7: If pending → Shows "Pending Approval" screen
Step 8: If rejected → Error message
```


### Workflow 2: Doctor Registration

```text
Step 1: Click "Register" tab on login page
Step 2: Fill all required fields (name, email, specialty, license, etc.)
Step 3: Click "สมัครสมาชิก" (Register)
Step 4: POST /auth/register → Creates user with 'pending' status
Step 5: Email notification sent to admin
Step 6: "Pending Approval" screen shown
Step 7: Admin reviews → Approve/Reject via Admin Doctor Management
Step 8: Doctor receives email notification of decision
Step 9: If approved → Can login normally
```


### Workflow 3: Password Reset

```text
Step 1: Click "ลืมรหัสผ่าน?" (Forgot password)
Step 2: Enter registered email
Step 3: POST /auth/request-password-reset
Step 4: Email sent with reset link
Step 5: Click link → /reset-password?token=xxx
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/auth/login` | Authenticate doctor/admin |
| POST | `/auth/register` | Register new doctor (pending approval) |
| POST | `/auth/request-password-reset` | Send password reset email |

---


## 6. Key Difference from Patient Login

| Feature | Patient Portal | Doctor Portal |
| ------- | -------------- | ------------- |
| Registration access | Immediate | Requires admin approval |
| Roles | patient only | doctor, admin |
| Specialty field | ❌ | ✅ Required |
| License number | ❌ | ✅ Required |
| Branding | Patient-focused | Clinical features |

---


## 7. AI Agent Improvement Opportunities


- **License verification**: AI auto-verify medical license numbers


- **Specialty matching**: AI suggest specialty based on background


- **Fraud detection**: AI detect suspicious registration patterns


- **SSO integration**: AI-managed single sign-on with hospital systems

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิด URL Doctor Portal (localhost:8080 หรือ izara-doctor-*-dev-testing) — ตรวจ HTTPS และใบรับรองถูกต้อง
2. กรอกอีเมลใน `login-email` และรหัสผ่านใน `login-password` (หรือกด `google-sign-in-btn` สำหรับ SSO)
3. อ่านข้อความแจ้งเตือน: บัญชีแพทย์ที่ยัง `pending` จะไม่เข้าแดชบอร์ดคลินิก
4. กด `login-submit` — เรียก `POST /api/auth/login` (หรือ Google token exchange)
5. ตรวจ Network: HTTP 200 และ response มี JWT; ไม่มี 401/403
6. ยืนยัน redirect ไปแดชบอร์ด (`dashboard-page`) — ไม่กลับ `/login`
7. ทดสอบ «ลืมรหัสผ่าน» หากจำเป็น — ลิงก์ reset หมดอายุตามนโยบาย
8. ออกจากระบบเมื่อใช้เครื่องสาธารณะ — ล้าง session/localStorage

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 02_Reset_Password_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/02_Reset_Password_Page.md`](../../Processes/Pages/Doctor-Portal/02_Reset_Password_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **02 Reset Password** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. คลิก «ลืมรหัสผ่าน» จากหน้า login
2. กรอกอีเมลที่ลงทะเบียน
3. ตรวจสอบกล่องจดหมาย (ลิงก์หมดอายุตามนโยบาย)
4. เปิดลิงก์ reset — กรอกรหัสผ่านใหม่
5. ยืนยันรหัสผ่านซ้ำ
6. เข้าสู่ระบบด้วยรหัสผ่านใหม่

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 03_Dashboard_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/03_Dashboard_Page.md`](../../Processes/Pages/Doctor-Portal/03_Dashboard_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **03 Dashboard** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 8. Workflows


### Workflow 1: Morning Dashboard Review

```text
Step 1: Doctor logs in → Dashboard loads
Step 2: Stats bar shows today's appointments, pending tasks
Step 3: Column 1 displays today's patient queue
Step 4: Doctor clicks first patient
Step 5: Column 2 loads AI pre-consultation summary
Step 6: Doctor reviews patient history and AI suggestions
Step 7: Doctor prepares for consultation
```


### Workflow 2: Start Video Consultation

```text
Step 1: Select patient in Column 1
Step 2: Review AI summary in Column 2 (Investigation tab)
Step 3: Click "เริ่มประชุม" (Start Meeting)
Step 4: Jitsi opens in new tab (doctor as HOST)
Step 5: Patient joins from their portal via meeting link
Step 6: Patient enters lobby → Doctor admits
Step 7: Consultation begins with live transcription
```


### Workflow 3: Post-Consultation Documentation

```text
Step 1: Meeting ends
Step 2: AI generates SOAP summary from transcript
Step 3: Doctor reviews summary (Man-in-the-Loop)
Step 4: Opens EMR Editor → Approves/edits AI content
Step 5: Opens Prescribing → Writes prescription
Step 6: Opens Lab Orders → Orders follow-up tests
Step 7: Signs EMR → Patient notified
```

---


## 9. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Today's appointments |
| GET | `/api/prescriptions/pending/count/:doctorId` | Pending prescription count |
| GET | `/api/notifications/:id/unread-count` | Unread notification count |
| GET | `/api/patients` | Patient list |
| POST | `/api/ai/pre-consultation-summary` | AI pre-consultation summary |
| POST | `/api/ai/validation` | Man-in-the-Loop validation |
| POST | `/api/meetings/create` | Create Jitsi meeting |
| GET | `/api/meetings/pending-validation` | Meetings awaiting validation |
| GET | `/api/meetings/:id/results` | Get meeting results with AI summary |
| GET | `/api/emr/drafts/:doctorId` | Get pending EMR drafts |
| GET | `/api/patients/:id/instruction-sheets/pending` | Pending instruction sheets |

---


## 10. AI Agent Improvement Opportunities


- **Smart patient prioritization**: AI sort queue by clinical urgency


- **Auto-documentation**: AI draft full SOAP note from meeting transcript


- **Decision support alerts**: AI surface critical drug interactions proactively


- **Workflow optimization**: AI suggest optimal patient order for the day


- **Real-time clinical copilot**: AI provide suggestions during consultation


- **Pending action aggregation**: AI prioritize validation queue by urgency


- **Pre-consultation insights**: AI surface relevant lab results and trends before meeting


- **Meeting readiness check**: AI verify all prerequisites before meeting start

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «03 Dashboard Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 04_Schedule_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/04_Schedule_Page.md`](../../Processes/Pages/Doctor-Portal/04_Schedule_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **04 Schedule** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow: View Daily Schedule (v1.7.51 — calendar sync on confirm)

```text
Step 1: Doctor confirms telehealth appointment (Health Meeting queue or POST /api/appointments/:id/confirm)
Step 2: API sets confirmed_date/time, meeting_link, calendarEventUrl; inserts schedule_entry_ready notification
Step 3: Navigate to /schedule (data-testid=doctor-schedule-page)
Step 4: GET /api/appointments → mapAppointmentForClient → filter doctor_id + status confirmed|scheduled
Step 5: resolveAppointmentSchedule(apt) picks confirmed_date over requested_date
Step 6: Today's list: data-testid=schedule-appointment-{id}; Join: data-testid=schedule-meeting-link
Step 7: Month view: emerald dot on days with appointments (schedule-month-appointment-day)
Step 8: Upcoming section lists dates strictly after today (no duplicate of today)
Step 9: Optional: open calendarEventUrl from schedule_entry_ready notification → Google Calendar TEMPLATE
```

**E2E:** Playwright D4cal (group-D) · Vitest: `appointmentMapper.test.ts`, `calendarEventLinks.test.ts`

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Fetch appointments (`mapAppointmentForClient`; optional `?doctorId=`) |
| GET | `/api/schedule/:doctorId` | Schedule alias — date from confirmed_date, meetingLink |
| POST | `/api/appointments/:id/confirm` | Confirm + Jitsi URLs + calendarEventUrl + notifications |

---


## 6. AI Agent Improvement Opportunities


- **Smart scheduling**: AI optimize appointment spacing


- **No-show prediction**: AI predict likelihood of patient no-shows


- **Buffer management**: AI suggest break times based on appointment complexity


- **Calendar sync**: AI sync with external calendars (Google, Apple)

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «04 Schedule Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 05_Patient_Management_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/05_Patient_Management_Page.md`](../../Processes/Pages/Doctor-Portal/05_Patient_Management_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **05 Patient Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Search for Patient

```text
Step 1: Navigate to /patients
Step 2: GET /api/patients (filtered by role)
Step 3: Type in search box → filters in real-time
Step 4: Apply additional filters (gender, risk, age, consent)
Step 5: Click patient card → Opens PatientRecordViewer modal
```


### Workflow 2: View Patient Records

```text
Step 1: Click "ดู" (View) on patient card
Step 2: GET /api/patients/:id with PDPA consent check
Step 3: PatientRecordViewer modal opens with PHR/EMR/EHR tabs
Step 4: View patient data according to consent level
```


### Workflow 3: Request PDPA Consent

```text
Step 1: Click consent badge on patient card
Step 2: ConsentDialog opens showing current permissions
Step 3: Click "ขอความยินยอม" (Request Consent)
Step 4: System sends consent request to patient
Step 5: Patient receives notification to grant/deny
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/patients` | List patients (role-filtered) |
| GET | `/api/patients/:id` | Get patient details |
| GET | `/api/patients/:id/consent` | Check PDPA consent status |
| POST | `/api/patients/:id/consent/request` | Request data consent |

---


## 7. AI Agent Improvement Opportunities


- **Risk stratification**: AI auto-classify patient risk levels


- **Smart search**: AI understand natural language patient queries


- **Patient matching**: AI suggest patients needing follow-up


- **Consent automation**: AI manage consent expiry and renewals

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «05 Patient Management Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 06_Health_Meeting_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md`](../../Processes/Pages/Doctor-Portal/06_Health_Meeting_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **06 Health Meeting** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 7. Workflows


### Workflow 1: Confirm Pending Appointment

```text
Step 1: View pending appointment in Queue tab
Step 2: Click "ยืนยัน" (Confirm)
Step 3: Select date/time in confirmation dialog
Step 4: Select email recipients
Step 5: Click "ยืนยันนัดหมาย"
Step 6: PATCH /api/appointments/:id → status: confirmed (row retained — UI label accepted)
Step 7: POST /api/meetings/create → generates Jitsi URLs
Step 8: Confirmation email sent to patient
Step 9: Appointment stays in pool/accepted tab (includeAccepted=true, 7-day window)
```


### Workflow 2: Start Video Meeting

```text
Step 1: Find confirmed appointment in Meetings tab
Step 2: Click "เริ่มประชุม" (Start Meeting)
Step 3: Jitsi opens in new tab (doctor as HOST)
Step 4: Doctor waits for patient to join lobby
Step 5: Doctor admits patient from lobby
Step 6: Consultation begins with live transcription
```


### Workflow 3: Admin — Assign from Pool

```text
Step 1: Admin views in_pool appointments
Step 2: Click "Auto-Assign" → AI matches specialty
Step 3: Or manually select doctor from dropdown
Step 4: PATCH /api/appointments/:id → assigned to doctor
Step 5: Doctor receives notification
Step 6: Appointment status: awaiting_doctor_response
```


### Workflow 4: Queue Management

```text
Step 1: Click "เรียกคนถัดไป" (Call Next Patient)
Step 2: Next patient by priority called
Step 3: Or click "ข้าม" (Skip) → Skip reason modal
Step 4: Patient skipped with reason logged
Step 5: Next patient in queue called
```


### Workflow 5: Review Meeting Results (Man-in-the-Loop)

```text
Step 1: Meeting ends → AI pipeline triggered automatically
Step 2: Gemini 2.5 Flash Lite processes: transcript + chat + video metadata
Step 3: AI generates SOAP summary (30-min sections for long meetings)
Step 4: Summary appears in Meeting Results tab with 🟡 Pending status
Step 5: Doctor reviews AI summary content
Step 6: Doctor selects action:
        → ✅ Approve: Summary ready for EMR Editor
        → ✏️ Edit: Modify specific fields inline
        → 🔄 Regenerate: Re-run AI with feedback notes
        → ❌ Reject: Discard, proceed with manual EMR entry
Step 7: POST /api/meetings/:id/validate → Updates validation status
Step 8: Approved content available in EMR Editor pre-filled
```


### Workflow 6: Invite Multi-Party Participants

```text
Step 1: Doctor opens confirmed appointment in Meetings tab
Step 2: Clicks "เชิญผู้เข้าร่วม" (Invite Participants)
Step 3: Search and add other doctors/admin by name or specialty
Step 4: POST /api/meetings/:id/invite → Sends invitation + meeting URL
Step 5: Patient separately shares Guest URL with relatives/friends (scoped guest-invite token)
Step 6: Guests open invite link — anonymous join-config denied without token
Step 7: All guests enter Izara lobby on meeting day
Step 8: Doctor (HOST) approves/rejects each lobby participant
Step 9: Admitted participants join multi-party video meeting
```


### Workflow 7: Post-Meeting → EMR Editor Flow

```text
Step 1: Doctor approves AI meeting summary (Workflow 5)
Step 2: Clicks "Open EMR Editor" from Meeting Results
Step 3: EMR Editor opens with AI SOAP data pre-filled in tabs:
        → Tab S (Subjective): Chief complaint + HPI from transcript
        → Tab O (Objective): Vital signs + examination findings
        → Tab A (Assessment): AI-suggested diagnoses with ICD-10
        → Tab P (Plan): Treatment plan + follow-up instructions
Step 4: Doctor reviews and edits each tab as needed
Step 5: AI generates Patient Instruction Sheet (ใบแนะนำผู้ป่วย)
Step 6: Doctor validates Patient Instruction Sheet
Step 7: Doctor signs & finalizes EMR
Step 8: Patient receives: EMR summary + Instruction Sheet + Meeting recording
Step 9: Data appears in Patient Dashboard + Timeline + Health History
```

---


## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List queue appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |
| POST | `/api/meetings/create` | Create Jitsi meeting room |
| POST | `/api/appointments/:id/confirm` | Confirm with meeting link |
| GET | `/api/doctors` | List all doctors (admin) |
| POST | `/api/appointments/:id/assign` | Assign doctor (admin) |
| GET | `/api/meetings/:id/results` | Get meeting results with AI summary |
| POST | `/api/meetings/:id/validate` | Validate AI summary (approve/edit/reject) |
| POST | `/api/meetings/:id/regenerate` | Regenerate AI summary with feedback |
| POST | `/api/meetings/:id/invite` | Invite participants to meeting |
| GET | `/api/meetings/:id/participants` | List meeting participants and roles |
| POST | `/api/meetings/:id/lobby` | Approve/reject lobby participants |
| GET | `/api/meetings/pending-validation` | List meetings awaiting validation |
| POST | `/api/meetings/:id/patient-instruction` | Generate Patient Instruction Sheet |



---


## 9. Meeting Technology Stack

| Component | Technology | Cost |
| --------- | ---------- | ---- |
| Video Meeting | Jitsi Meet (meet.jit.si) with lobby | FREE |
| Transcription | Web Speech API (browser-native) | FREE |
| AI Summary | Gemini 2.5 Flash Lite | FREE tier |
| Real-time Streaming | Socket.IO on Meeting Server (port 3020) | Self-hosted |
| Database | PostgreSQL (izara_phase1) | Self-hosted |
| Chat | Jitsi built-in + Socket.IO capture | FREE |



---


## 10. AI Agent Improvement Opportunities


- **Smart queue prioritization**: AI dynamically reprioritize based on clinical urgency

- **Auto-confirmation**: AI auto-confirm standard follow-ups

- **Meeting preparation**: AI prepare room with patient context

- **Wait time notifications**: AI notify patients of estimated wait

- **No-show detection**: AI identify and handle potential no-shows

- **Multi-party scheduling**: AI coordinate availability across multiple doctors

- **Post-meeting auto-routing**: AI auto-route validated summaries to EMR Editor

- **Summary quality scoring**: AI self-assess confidence and flag low-confidence sections

- **Patient instruction personalization**: AI tailor instruction sheets to patient literacy level

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. แพทย์ (HOST) สร้าง/เปิดห้องประชุมก่อน — ระบบตั้ง `host-ready` ผ่าน Socket.IO (`notifyHostPresent`)
2. คัดลอก `guestJoinUrl` จาก Patient Portal API (`share-link` / `guest-invite`) — ห้ามแชร์ URL พอร์ทัลแพทย์
3. ผู้ป่วยและ Guest รอใน Izara Lobby (`lobby-waiting-screen` / `guest-lobby-waiting`) — ไม่ใช้ Jitsi lobby บน meet.jit.si
4. แพทย์กด Admit รายคน หรือ `admit-all-btn` — ตรวจ badge Guest/Patient บน Meeting Room
5. Guest: รอ overlay host-ready แล้ว mount Jitsi (`jitsi-guest-container` เต็มจอ ไม่ซ่อนด้วย h-0)
6. ทุกฝ่ายเข้า Jitsi บน `meet.jit.si` — เปิดกล้อง/ไมค์; ตรวจ CSP `frame-src` / `connect-src`
7. ระหว่างประชุม: ส่ง transcript segment (`/transcript`, `guest-transcript-segment`)
8. จบประชุม: MediaRecorder → `POST /api/meetings/:id/save-recording` (≤50MB) → path `meetings/{doctorId}/{meetingId}/video.webm`
9. เรียก `POST /api/meetings/:id/end` — pipeline สรุป AI (Gemini) + Socket `meeting-summary-ready`
10. แดชบอร์ดแพทย์: `GET /api/video-meeting/:appointmentId/files` → แท็บ AI Summary / `insert-meeting-summary-emr-btn`
11. ตรวจ `GET /api/meetings/:id/pipeline-status` หากสรุปยังไม่ขึ้น (stage: completed)

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 07_Virtual_Meeting.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md`](../../Processes/Pages/Doctor-Portal/07_Virtual_Meeting.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **07 Virtual Meeting** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Complete Video Consultation

```text
Step 1:  Doctor clicks "Start Meeting" from Health Meeting page
Step 2:  Time check validates meeting window
Step 3:  Consent screen shown → Doctor accepts recording terms
Step 4:  Jitsi video loads in iframe (doctor as moderator)
Step 5:  Patient joins lobby → Doctor admits
Step 6:  Doctor starts live transcription
Step 7:  AI Copilot panel provides real-time suggestions
Step 8:  Doctor conducts consultation
Step 9:  Doctor clicks "End Meeting"
Step 10: Recording stops and uploads
Step 11: AI generates consultation report (SOAP format)
Step 12: Doctor reviews AI report (Man-in-the-Loop)
Step 13: Approves → Content available for EMR
```


### Workflow 2: Live Transcription During Meeting

```text
Step 1: Doctor clicks "Start Transcription"
Step 2: POST /api/meetings/:id/start-transcription
Step 3: Web Speech API begins listening
Step 4: Real-time transcript displays with speaker labels
Step 5: Segments saved to PostgreSQL periodically
Step 6: Doctor can pause/resume transcription
Step 7: Switch language (TH ↔ EN) as needed
Step 8: On meeting end → POST /api/meetings/:id/stop-transcription
Step 9: Full transcript compiled for AI summary
```


### Workflow 3: Multi-Party Meeting Management

```text
Step 1:  Doctor starts meeting as HOST/moderator
Step 2:  Patient joins via Patient URL → enters lobby
Step 3:  Doctor admits patient from lobby panel
Step 4:  Patient's relatives join via Guest URL → enter lobby
Step 5:  Non-registered guests enter display name → enter lobby
Step 6:  Doctor reviews each lobby participant → Admit or Reject
Step 7:  Invited doctors join via Doctor URL → auto-admitted (moderator role)
Step 8:  All admitted participants visible in Participants Panel
Step 9:  Doctor controls: mute individual/all, remove participant
Step 10: All participants can use text chat (captured for AI summary)
```


### Workflow 4: Meeting End → AI Summary Pipeline

```text
Step 1:  Doctor clicks "End Meeting for All" (HOST control)
Step 2:  Jitsi meeting room closes for all participants
Step 3:  Backend triggers: POST /api/meetings/:id/end
Step 4:  System compiles:
         → Full transcript (Web Speech API segments via Socket.IO)
         → All chat messages (Socket.IO captured)
         → Meeting metadata (duration, participants, recording URL)
Step 5:  POST /api/meetings/:id/generate-summary
Step 6:  Gemini 2.5 Flash Lite processes all meeting data
Step 7:  For meetings > 30 min: generates sectioned summaries (30-min intervals)
Step 8:  AI generates SOAP format summary:
         S = Subjective (from patient statements in transcript)
         O = Objective (from doctor observations in transcript)
         A = Assessment (AI-suggested diagnoses from clinical context)
         P = Plan (treatment discussion + follow-up from transcript)
Step 9:  Summary saved to PostgreSQL with status: pending_validation
Step 10: Doctor notified → Meeting Results tab shows new pending item
Step 11: Doctor reviews via Man-in-the-Loop validation (see Health Meeting page)
Step 12: Approved summary → pre-fills EMR Editor for finalization
```


### Workflow 5: Real-Time Transcript Display

```text
Step 1:  Doctor presses [▶️ START] transcript streaming
Step 2:  Web Speech API activates in browser (FREE, Chrome recommended)
Step 3:  Socket.IO streams transcript segments to Meeting Server (port 3020)
Step 4:  Live transcript panel displays with speaker identification:
         👨‍⚕️ Doctor: สวัสดีครับ คุณสมชาย วันนี้เป็นอย่างไรบ้าง...
         🧑 Patient: สวัสดีครับหมอ ปวดหัวมา 3 วัน...
         👥 Guest: (wife) หมอคะ สามีนอนไม่หลับด้วย...
Step 5:  Interim text shown with yellow background + pulsing cursor
Step 6:  Confidence < 0.8 shows ⚠️ indicator
Step 7:  Doctor can [⏸️ PAUSE] during breaks
Step 8:  Doctor can [▶️ RESUME] to continue
Step 9:  Language switchable: Thai (th-TH) ↔ English (en-US)
Step 10: Segments auto-saved to PostgreSQL periodically
Step 11: Doctor presses [⏹️ STOP] at meeting end
Step 12: Full transcript compiled and stored
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/meetings/:id/start-transcription` | Start transcription session |
| POST | `/api/meetings/:id/transcript` | Add transcript segment |
| POST | `/api/meetings/:id/stop-transcription` | Stop and compile transcript |
| POST | `/api/meetings/:id/generate-summary` | Generate AI SOAP summary |
| GET | `/api/meetings/:id/summary` | Get stored AI summary |
| GET | `/api/meetings/:id/transcript` | Get full transcript |
| POST | `/api/meetings/:id/end` | End meeting and trigger AI pipeline |
| POST | `/api/meetings/:id/lobby` | Approve/reject lobby participant |
| GET | `/api/meetings/:id/participants` | List all meeting participants |
| POST | `/api/meetings/:id/mute-all` | Mute all participants (HOST only) |
| POST | `/api/meetings/:id/remove-participant` | Remove participant from meeting |
| POST | `/api/meetings/:id/chat` | Send/capture chat message |
| GET | `/api/meetings/:id/chat` | Get all chat messages |
| POST | `/api/meetings/:id/screen-share` | Start/stop screen sharing |
| POST | `/api/meetings/:id/recording/start` | Start meeting recording |
| POST | `/api/meetings/:id/recording/stop` | Stop meeting recording |

---


## 6. Meeting Technology Stack

| Component | Technology | Cost | Details |
| --------- | ---------- | ---- | ------- |
| Video Platform | Jitsi Meet (meet.jit.si) | FREE | With lobby, moderator controls |
| Transcription | Web Speech API (browser-native) | FREE | Chrome recommended, TH/EN support |
| AI Processing | Gemini 2.5 Flash Lite | FREE tier | SOAP summary generation |
| Real-time Transport | Socket.IO | FREE | Transcript streaming to port 3020 |
| Meeting Server | Express.js (port 3020) | Self-hosted | Manages meeting state |
| Database | PostgreSQL (izara_phase1) | Self-hosted | Stores transcripts, summaries, chat |

---


## 7. AI Agent Improvement Opportunities


- **Auto-dictation**: AI transcribe doctor's verbal notes directly to EMR fields


- **Real-time diagnosis support**: AI suggest differential diagnosis during conversation


- **Auto-summary**: AI generate meeting summary in real-time as conversation progresses


- **Sentiment analysis**: AI detect patient distress or confusion


- **Follow-up extraction**: AI automatically identify follow-up items from conversation


- **Speaker diarization enhancement**: AI improve speaker identification accuracy


- **Multi-language real-time translation**: AI translate between Thai and English in real-time


- **Clinical keyword highlighting**: AI highlight medical terms in transcript for quick review


- **Automatic section markers**: AI detect topic changes and mark 30-min summary boundaries

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. แพทย์ (HOST) สร้าง/เปิดห้องประชุมก่อน — ระบบตั้ง `host-ready` ผ่าน Socket.IO (`notifyHostPresent`)
2. คัดลอก `guestJoinUrl` จาก Patient Portal API (`share-link` / `guest-invite`) — ห้ามแชร์ URL พอร์ทัลแพทย์
3. ผู้ป่วยและ Guest รอใน Izara Lobby (`lobby-waiting-screen` / `guest-lobby-waiting`) — ไม่ใช้ Jitsi lobby บน meet.jit.si
4. แพทย์กด Admit รายคน หรือ `admit-all-btn` — ตรวจ badge Guest/Patient บน Meeting Room
5. Guest: รอ overlay host-ready แล้ว mount Jitsi (`jitsi-guest-container` เต็มจอ ไม่ซ่อนด้วย h-0)
6. ทุกฝ่ายเข้า Jitsi บน `meet.jit.si` — เปิดกล้อง/ไมค์; ตรวจ CSP `frame-src` / `connect-src`
7. ระหว่างประชุม: ส่ง transcript segment (`/transcript`, `guest-transcript-segment`)
8. จบประชุม: MediaRecorder → `POST /api/meetings/:id/save-recording` (≤50MB) → path `meetings/{doctorId}/{meetingId}/video.webm`
9. เรียก `POST /api/meetings/:id/end` — pipeline สรุป AI (Gemini) + Socket `meeting-summary-ready`
10. แดชบอร์ดแพทย์: `GET /api/video-meeting/:appointmentId/files` → แท็บ AI Summary / `insert-meeting-summary-emr-btn`
11. ตรวจ `GET /api/meetings/:id/pipeline-status` หากสรุปยังไม่ขึ้น (stage: completed)

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 08_EMR_Editor.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/08_EMR_Editor.md`](../../Processes/Pages/Doctor-Portal/08_EMR_Editor.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **08 EMR Editor** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 6. Workflows


### Workflow 1: Create EMR After Consultation

```text
Step 1:  Doctor opens EMR Editor for a patient/appointment
Step 2:  Select encounter type (consultation/follow-up/emergency/procedure)
Step 3:  Tab S: Enter chief complaint and history
Step 4:  (Optional) Toggle voice dictation for hands-free input
Step 5:  Tab O: Enter vital signs and physical examination
Step 6:  Tab A: Add diagnoses with ICD-10 codes
Step 7:  Tab P: Enter treatment plan and follow-up instructions
Step 8:  Auto-save runs every 30 seconds
Step 9:  Click "AI Summary" → POST /api/ai/generate-emr-summary
Step 10: Review AI-generated summary (Man-in-the-Loop)
Step 11: Edit as needed
Step 12: Click "Sign & Finalize"
Step 13: Digital signature applied
Step 14: EMR status: Draft → Finalized
Step 15: POST /api/patients/:id/health-logs → Patient health records updated
Step 16: POST /api/notifications/emr-signed → Patient notified
Step 17: PATCH /api/appointments/:id → Appointment marked completed
```


### Workflow 2: AI-Assisted EMR from Meeting Transcript

```text
Step 1: After video meeting ends, AI generates SOAP summary
Step 2: Doctor opens EMR Editor
Step 3: AI content pre-filled into respective SOAP tabs
Step 4: Doctor reviews, edits, and approves each section
Step 5: Man-in-the-Loop: Doctor validates all AI content
Step 6: Final review and sign
```

---


## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/emr` | Create new EMR |
| PUT | `/api/emr/:id` | Update EMR |
| POST | `/api/ai/generate-emr-summary` | AI summary generation from meeting data |
| POST | `/api/patients/:id/health-logs` | Send to patient health logs |
| POST | `/api/notifications/emr-signed` | Notify patient of signed EMR |
| PATCH | `/api/appointments/:id` | Mark appointment completed |
| GET | `/api/meetings/:id/summary` | Get AI meeting summary for pre-fill |
| GET | `/api/meetings/:id/transcript` | Get meeting transcript for reference |
| GET | `/api/meetings/:id/chat` | Get meeting chat messages for reference |
| POST | `/api/patients/:id/instruction-sheet` | Generate Patient Instruction Sheet |
| PUT | `/api/patients/:id/instruction-sheet/:id` | Update Patient Instruction Sheet |
| POST | `/api/emr/:id/sign` | Apply digital signature to EMR |
| POST | `/api/emr/:id/voice-dictation` | Save voice dictation segment |

---


## 8. Meeting-to-EMR Data Flow

```text
Video Meeting (Jitsi)
    │
    ├── Web Speech API → Transcript Segments (Socket.IO → port 3020)
    ├── Chat Messages → Captured via Socket.IO
    └── Meeting Recording → Cloud Storage
    │
    ▼
AI Pipeline (Gemini 2.5 Flash Lite)
    │
    ├── Input: Transcript + Chat + Meeting Metadata
    ├── Output: SOAP Summary (30-min sections for long meetings)
    └── Stored: PostgreSQL (izara_phase1)
    │
    ▼
Man-in-the-Loop Validation (Health Meeting Page)
    │
    ├── ✅ Approve → Pre-fill EMR Editor
    ├── ✏️ Edit → Modify then Pre-fill
    ├── 🔄 Regenerate → Re-run AI Pipeline
    └── ❌ Reject → Manual EMR Entry
    │
    ▼
EMR Editor (AI-Prefilled SOAP Tabs)
    │
    ├── Doctor Reviews & Edits
    ├── Voice Dictation (Web Speech API, FREE)
    ├── Patient Instruction Sheet (AI-generated)
    └── Sign & Finalize
    │
    ▼
Patient Delivery
    │
    ├── Dashboard: Latest consultation card
    ├── Timeline: New health event entry
    ├── Health History: Full EMR record
    └── Instruction Sheet: Downloadable PDF
```

---


## 9. AI Agent Improvement Opportunities


- **Auto-populate**: AI fill SOAP fields from meeting transcript automatically

- **ICD-10 suggestion**: AI suggest diagnosis codes from clinical text

- **Template library**: AI-curated EMR templates by specialty/condition

- **Quality check**: AI verify EMR completeness before finalization

- **Cross-reference**: AI link EMR findings with patient history automatically

- **Smart dictation**: AI auto-correct medical terminology during voice input

- **Instruction personalization**: AI tailor instruction sheets to patient literacy level

- **Multi-section summaries**: AI handle meetings > 30 min with sectioned SOAP notes

- **Confidence visualization**: AI show per-field confidence scores for pre-filled content

---


## 10. PostgreSQL Database Integration


### Tables Used
| Table | Operation | Description |
| ----- | --------- | ----------- |
| emr | INSERT/UPDATE | SOAP notes stored as JSONB (subjective, objective, assessment, plan) |
| ai_validations | INSERT/SELECT | AI validation results for EMR content |
| prescriptions | INSERT | Prescriptions linked to EMR |
| lab_orders | INSERT | Lab orders linked to EMR |


### API Endpoints
| Endpoint | Method | DB Operation |
| -------- | ------ | ------------ |
| POST /api/emr | POST | INSERT INTO emr (SOAP JSONB) |
| PUT /api/emr/:id | PUT | UPDATE emr SET soap_data WHERE id |
| POST /api/ai/validate | POST | AI Gemini validates EMR → INSERT ai_validations |


### AI Integration

- **Gemini 2.5 Flash Lite:** Generates SOAP draft from meeting transcript

- **Man-in-the-Loop:** Doctor reviews and approves AI-generated content before saving


### Deployment

- **Local Docker:** izara-postgres container (localhost:5433 external / 5432 internal) → database: izara_phase1

- **Production:** GCE VM at 35.240.157.230:5432 → database: izara_phase1 (asia-southeast1)

- **Service deployed via:** Cloud Run (gen2, CPU Boost) + Cloud Build CI/CD

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิด EMR จากนัดหรือผู้ป่วยที่เลือก
2. กรอก SOAP / ใช้ AI pre-fill จากการประชุม
3. รอ autosave 30 วินาที — ดู `emr-autosave-status`
4. ตรวจความถูกต้องก่อนลงนาม
5. ลงนาม EMR — ส่งสำเนาให้ผู้ป่วยตามนโยบาย
6. ปิด modal — ยืนยันบน Timeline/PHR ฝั่งผู้ป่วย

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 09_Prescribing.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/09_Prescribing.md`](../../Processes/Pages/Doctor-Portal/09_Prescribing.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **09 Prescribing** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow: Create Prescription

```text
Step 1: Open Prescribing modal for patient
Step 2: System loads patient's allergies and current medications
Step 3: Search for drug in database
Step 4: Click "Add" → Drug added to prescription list
Step 5: System checks for allergy conflicts → Alert if found
Step 6: System checks for drug interactions → Warning if found
Step 7: Fill dosage, route, frequency, duration, quantity, instructions
Step 8: Add more drugs as needed
Step 9: Click "Save Prescription"
Step 10: Digital signature applied
Step 11: POST /api/patients/:id/health-logs → Prescription saved
Step 12: Patient notified of new prescription
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/medications/search` | Search drug database |
| POST | `/api/prescriptions` | Create prescription |
| GET | `/api/patients/:id/allergies` | Get patient allergies |
| GET | `/api/patients/:id/medications` | Get current medications |
| POST | `/api/patients/:id/health-logs` | Save to patient health logs |

---


## 7. AI Agent Improvement Opportunities


- **AI dose calculation**: Adjust doses based on renal/hepatic function


- **Smart drug selection**: AI suggest drugs based on diagnosis


- **Formulary integration**: AI check insurance formulary coverage


- **Adherence prediction**: AI predict medication adherence likelihood


- **Alternative suggestions**: AI suggest equally effective lower-cost alternatives

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิดหน้าสั่งยาจากผู้ป่วย/นัด
2. ค้นหายา — ระบบตรวจ allergy (`allergy-block-banner`)
3. เพิ่มรายการยาและขนาด
4. ตรวจ CDS warnings
5. ลงนามอิเล็กทรอนิกส์ — กด `prescribe-submit`
6. ยืนยันผู้ป่วยเห็นใน PHR

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 10_Lab_Orders.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/10_Lab_Orders.md`](../../Processes/Pages/Doctor-Portal/10_Lab_Orders.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **10 Lab Orders** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Order Lab Tests

```text
Step 1: Open Lab Orders modal for patient
Step 2: Select common panel(s) or individual tests
Step 3: Enter clinical indication
Step 4: Select urgency (Routine / Urgent / STAT)
Step 5: Click "Submit Order"
Step 6: POST /api/lab-orders → Order created
Step 7: Status: ordered
```


### Workflow 2: View Results

```text
Step 1: Switch to Results tab
Step 2: GET /api/lab-orders/:patientId/results
Step 3: Results displayed with normal ranges
Step 4: Flag indicators highlight abnormal values
Step 5: Doctor reviews and acts on findings
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/lab-orders` | List patient's lab orders |
| POST | `/api/lab-orders` | Create new lab order |
| GET | `/api/lab-orders/:id/results` | Get lab results |

---


## 7. AI Agent Improvement Opportunities


- **Smart panel suggestions**: AI suggest tests based on diagnosis


- **Result interpretation**: AI interpret complex lab panels


- **Trend analysis**: AI identify concerning trends across multiple results


- **Auto-alerting**: AI notify doctor of critical results immediately


- **Cost optimization**: AI suggest most cost-effective test combinations

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «10 Lab Orders» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 11_Patient_Record_Viewer.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/11_Patient_Record_Viewer.md`](../../Processes/Pages/Doctor-Portal/11_Patient_Record_Viewer.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **11 Patient Record Viewer** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เลือกผู้ป่วย (แพทย์) หรือเปิดเมนู PHR (ผู้ป่วย)
2. เลือกแท็บ Vitals / Meds / Allergies / EMR
3. ตรวจข้อมูลล่าสุดจากการซิงค์
4. ไม่แก้ไขข้อมูลที่แพทย์ล็อกแล้ว
5. ดาวน์โหลด/พิมพ์ตามสิทธิ์

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 12_Medical_Consultants_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/12_Medical_Consultants_Page.md`](../../Processes/Pages/Doctor-Portal/12_Medical_Consultants_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **12 Medical Consultants** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows

### Admin: Add Consultant → Edit → Toggle → Delete

### Doctor: View → Rate → Contact (email/phone)

See [Medical_Consultants_Workflows.md](../../Processes/Medical_Consultants_Workflows.md) for detailed workflows.

---

## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/consultants` | List all consultants |
| POST | `/api/consultants` | Add consultant (admin) |
| PUT | `/api/consultants/:id` | Edit consultant (admin) |
| DELETE | `/api/consultants/:id` | Delete consultant (admin) |
| POST | `/api/consultants/:id/review` | Add rating/review |
| POST | `/api/consultants/:id/availability` | Toggle availability |


---

## 6. AI Agent Improvement Opportunities

- **Smart matching**: AI match patient condition to best specialist

- **Availability prediction**: AI predict consultant availability

- **Referral letter generation**: AI draft referral letters

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «12 Medical Consultants Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 13_Medical_Content_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/13_Medical_Content_Page.md`](../../Processes/Pages/Doctor-Portal/13_Medical_Content_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **13 Medical Content** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 6. Workflow

See [Medicine_Content_Processes.md](../../Processes/Medicine_Content_Processes.md) for complete workflow details.

---


## 7. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/content/medical` | List all content |
| POST | `/api/content/medical` | Create content |
| PUT | `/api/content/medical/:id` | Update content |
| DELETE | `/api/content/medical/:id` | Delete content |
| POST | `/api/content/medical/:id/review` | Approve/reject |
| GET | `/api/content/tags/medical` | Get tags |
| POST | `/api/content/tags/medical` | Create tags |

---


## 8. AI Agent Improvement Opportunities


- **Content generation**: AI draft health articles from medical topics


- **Translation**: AI auto-translate between Thai and English


- **Quality scoring**: AI rate content readability and accuracy


- **SEO optimization**: AI improve content discoverability


- **Image generation**: AI create medical illustrations

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «13 Medical Content Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 14_Clinical_Resources_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/14_Clinical_Resources_Page.md`](../../Processes/Pages/Doctor-Portal/14_Clinical_Resources_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **14 Clinical Resources** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «14 Clinical Resources Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 15_Gemini_AI_Studio.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/15_Gemini_AI_Studio.md`](../../Processes/Pages/Doctor-Portal/15_Gemini_AI_Studio.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **15 Gemini AI Studio** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 6. Workflows


### Workflow: Clinical AI Query

```text
Step 1: Click AI FAB button (bottom-right, any page)
Step 2: GeminiAIStudio modal opens
Step 3: Type medical question in chat
Step 4: POST /api/ai/chat → Gemini processes
Step 5: AI response with medical context
Step 6: Continue conversation as needed
```


### Workflow: Use Calculator

```text
Step 1: Switch to Calculators tab
Step 2: Select calculator (BMI or eGFR)
Step 3: Enter patient values
Step 4: Click Calculate
Step 5: Results displayed with interpretation
```


### Workflow 3: AI Meeting Summary Generation

```text
Step 1: Video meeting ends (triggered from Virtual Meeting page)
Step 2: System collects meeting data:
        → Transcript segments (Web Speech API via Socket.IO)
        → Chat messages (Socket.IO captured)
        → Meeting metadata (duration, participants, timestamps)
Step 3: POST /api/ai/generate-meeting-summary
Step 4: Gemini 2.5 Flash Lite processes all inputs
Step 5: For meetings > 30 min: generates 30-minute sectioned summaries
Step 6: Output: SOAP format summary
        S = Subjective (patient statements from transcript)
        O = Objective (doctor observations from transcript)
        A = Assessment (AI-inferred diagnoses from clinical context)
        P = Plan (treatment + follow-up from discussion)
Step 7: Summary stored in PostgreSQL (izara_phase1)
Step 8: Doctor reviews in Health Meeting > Results tab
Step 9: Man-in-the-Loop: Approve / Edit / Regenerate / Reject
Step 10: Approved summary → pre-fills EMR Editor
```


### Workflow 4: Clinical Decision Support (CDS) Alerts

```text
Step 1: AI continuously monitors patient data during consultation
Step 2: Gemini processes:
        → Current symptoms from live transcript
        → Patient medical history (EMR, PHR)
        → Current medications
        → Lab results and vital signs
Step 3: AI generates real-time CDS alerts:
        → ⚠️ Drug Interactions (e.g., Metformin + contrast media)
        → 🚩 Red Flags (e.g., chest pain + diabetes history)
        → 📊 Trend Alerts (e.g., rising HbA1c over 3 visits)
        → 📝 Guideline Reminders (e.g., overdue screening)
Step 4: Alerts displayed in AI Clinical Copilot panel
Step 5: Doctor can acknowledge, dismiss, or act on each alert
```


### Workflow 5: Patient Instruction Sheet Generation

```text
Step 1: Doctor finalizes EMR after meeting
Step 2: Doctor clicks "Generate Patient Instructions"
Step 3: POST /api/ai/generate-instructions
Step 4: Gemini 2.5 Flash Lite generates patient-friendly document:
        → Diagnosis in plain Thai language
        → Medication instructions with dosage/timing
        → Lifestyle recommendations
        → Red flags requiring immediate attention
        → Follow-up schedule
Step 5: Doctor reviews and validates (Man-in-the-Loop)
Step 6: Approved instruction sheet sent to patient
Step 7: Patient accesses via Dashboard > Instruction Sheets
```

---


## 7. AI Meeting Data Integration

Gemini AI Studio processes meeting data from multiple sources for comprehensive clinical intelligence.


### Data Sources for AI Processing

| Source | Technology | Data Type | Integration |
| ------ | ---------- | --------- | ----------- |
| Transcript | Web Speech API (FREE) | Speaker-labeled text segments | Socket.IO → PostgreSQL |
| Chat | Jitsi built-in chat | Text messages with timestamps | Socket.IO → PostgreSQL |
| Meeting Metadata | Jitsi External API | Duration, participants, recordings | Meeting Server (port 3020) |
| Patient History | PostgreSQL (izara_phase1) | EMR, PHR, labs, vitals | Direct DB query |
| Prescription Data | PostgreSQL | Current medications | Direct DB query |




### AI Processing Pipeline

```text
┌──────────────────────────────────────────────────────────────┐
Meeting Data Collection
│                                                              │
│  Transcript (127 segments) + Chat (8 msgs) + Metadata        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
Gemini 2.5 Flash Lite Processing
│                                                              │
│  1. Pre-consultation Summary (before meeting)                │
│  2. Real-time CDS Alerts (during meeting)                    │
│  3. SOAP Meeting Summary (after meeting)                     │
│  4. 30-min Sectioned Summaries (for long meetings)           │
│  5. Patient Instruction Sheet (after EMR finalization)       │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
Man-in-the-Loop Validation
│                                                              │
│  Doctor reviews ALL AI output before patient delivery        │
│  Actions: Approve / Edit / Regenerate / Reject               │
└──────────────────────────────────────────────────────────────┘
```


### AI Output Types

| Output | Trigger | Input Data | Validation |
| ------ | ------- | ---------- | ---------- |
| Pre-consultation Summary | Before meeting | Patient PHR + EMR history | Doctor reviews before meeting |
| CDS Alerts | During meeting (real-time) | Live transcript + patient data | Doctor acknowledges in meeting |
| SOAP Meeting Summary | After meeting ends | Transcript + Chat + Metadata | Man-in-the-Loop (Approve/Edit/Regenerate/Reject) |
| 30-Min Sections | After meeting (> 30 min) | Same as SOAP, segmented | Part of SOAP validation |
| Patient Instruction Sheet | After EMR finalized | Finalized EMR data | Doctor validates before sending |
| Clinical Calculator | On-demand | Patient vitals/labs | Immediate result, no validation needed |



---


## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/ai/chat` | AI medical chat |
| GET | `/api/ai/status` | Check Gemini API status |
| POST | `/api/ai/generate-meeting-summary` | Generate SOAP summary from meeting data |
| POST | `/api/ai/generate-instructions` | Generate Patient Instruction Sheet |
| POST | `/api/ai/pre-consultation-summary` | Generate pre-consultation summary |
| POST | `/api/ai/clinical-decision-support` | Generate CDS alerts from patient data |
| POST | `/api/ai/regenerate-summary` | Regenerate summary with doctor feedback |
| POST | `/api/ai/validation` | Validate AI-generated content |
| GET | `/api/ai/meeting-sections/:id` | Get 30-min sectioned summaries |
| POST | `/api/ai/calculate/bmi` | BMI calculation |
| POST | `/api/ai/calculate/egfr` | eGFR calculation |



---


## 9. AI Agent Improvement Opportunities


- **More calculators**: Add CHADS₂-VASc, Framingham, APACHE II, Wells Score

- **Calculator auto-fill**: AI pull patient data to pre-fill calculators

- **Contextual suggestions**: AI suggest relevant calculators based on patient condition

- **Drug dosing**: AI calculate weight-based and renal-adjusted drug doses

- **Clinical decision trees**: AI-guided diagnostic pathways

- **Meeting summary quality**: AI self-assess confidence per SOAP section

- **Multi-language support**: AI generate summaries in both Thai and English

- **Instruction readability**: AI adapt instruction sheet complexity to patient literacy

- **Longitudinal analysis**: AI identify health trends across multiple meeting summaries

- **Evidence linking**: AI cite clinical guidelines in CDS alerts

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เปิด AI Doctor / Gemini Studio
2. กรอกอาการหรือคำถาม — ไม่ใส่ข้อมูลระบุตัวบุคคลเกินจำเป็น
3. อ่านคำเตือน: ไม่ใช่การวินิจฉัย
4. ใช้ปุ่ม handoff จองนัดหากแนะนำ
5. แพทย์ตรวจสอบผลลัพธ์ก่อนส่งต่อผู้ป่วย

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 16_Doctor_Profile_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/16_Doctor_Profile_Page.md`](../../Processes/Pages/Doctor-Portal/16_Doctor_Profile_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **16 Doctor Profile** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «16 Doctor Profile Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 17_Admin_Appointment_Management.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/17_Admin_Appointment_Management.md`](../../Processes/Pages/Doctor-Portal/17_Admin_Appointment_Management.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **17 Admin Appointment Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: AI Auto-Assign

```text
Step 1: Admin views pending appointments
Step 2: Clicks "Auto-Assign" on specific appointment
Step 3: AI analyzes symptoms/reason with keyword matching
Step 4: Finds available doctor matching specialty
Step 5: PATCH /api/appointments/:id → assigned to matched doctor
Step 6: Doctor notified of assignment
```


### Workflow 2: Batch Auto-Assign

```text
Step 1: Admin clicks "Auto-Assign All Pending"
Step 2: AI processes all pending appointments in sequence
Step 3: Each assigned to best-matching available doctor
Step 4: Results summary shown
```


### Workflow 3: Manual Assign

```text
Step 1: Admin clicks "Assign Doctor" on appointment
Step 2: Modal opens with doctor dropdown, date, time, notes
Step 3: Select doctor and schedule
Step 4: Click "Assign"
Step 5: PATCH /api/appointments/:id → assigned
Step 6: Doctor and patient notified
```


### Workflow 4: Reject

```text
Step 1: Admin clicks "Reject" on appointment
Step 2: Reason prompt appears
Step 3: Admin enters rejection reason
Step 4: PATCH /api/appointments/:id → rejected
Step 5: Patient notified with reason
```


### Workflow 5: Pool Appointment → Doctor Assignment → Meeting Lifecycle

```text
Step 1:  Patient creates appointment (from Patient Portal)
Step 2:  Appointment enters pool with status: in_pool
Step 3:  AI analyzes symptoms → matches specialty (11 categories)
Step 4:  Admin reviews AI recommendation (confidence %)
Step 5:  Admin clicks "Auto-Assign" or manually assigns doctor
Step 6:  Doctor notified → status: awaiting_doctor_response
Step 7:  Doctor confirms → status: confirmed
Step 8:  Jitsi meeting URLs generated (Doctor, Patient, Guest)
Step 9:  Patient notified with meeting link
Step 10: Meeting day: Doctor starts meeting as HOST
Step 11: Participants join via lobby → Doctor admits
Step 12: Meeting conducted with transcript streaming
Step 13: Meeting ends → AI pipeline generates SOAP summary
Step 14: Doctor validates summary (Man-in-the-Loop)
Step 15: Doctor finalizes EMR → status: completed
Step 16: Admin can track full lifecycle in "All" tab
```

---


## 6. Appointment Status Lifecycle

Complete tracking through the meeting lifecycle.

```text
Appointment Lifecycle Flow:

[Patient Creates] → pending
       │
       ▼
[Enter Pool] → in_pool
       │
       ├── AI Auto-Assign → assigned
       └── Manual Assign → assigned
       │
       ▼
[Doctor Notified] → awaiting_doctor_response
       │
       ├── Doctor Accepts → confirmed
       └── Doctor Declines → back to in_pool
       │
       ▼
[Meeting Created] → meeting_scheduled
       │
       ▼
[Meeting Active] → in_progress
       │
       ▼
[Meeting Ended] → meeting_completed
       │
       ▼
[AI Summary Generated] → pending_validation
       │
       ▼
[Doctor Validates] → emr_pending
       │
       ▼
[EMR Finalized] → completed
       │
       └── Patient receives results
```


### Status Tracking Table

| Status | Thai | Phase | Admin Visible |
| ------ | ---- | ----- | ------------- |
| pending | รอดำเนินการ | Pre-assignment | ✅ |
| in_pool | รอจัดสรร | Pool | ✅ |
| assigned | มอบหมายแล้ว | Assignment | ✅ |
| awaiting_doctor_response | รอแพทย์ตอบรับ | Confirmation | ✅ |
| confirmed | ยืนยันแล้ว | Pre-meeting | ✅ |
| meeting_scheduled | นัดประชุมแล้ว | Scheduled | ✅ |
| in_progress | กำลังประชุม | Active meeting | ✅ |
| meeting_completed | ประชุมเสร็จ | Post-meeting | ✅ |
| pending_validation | รอตรวจสอบ | AI summary review | ✅ |
| emr_pending | รอบันทึก EMR | EMR finalization | ✅ |
| completed | เสร็จสิ้น | Done | ✅ |
| rejected | ปฏิเสธ | Rejected | ✅ |
| cancelled | ยกเลิก | Cancelled | ✅ |
| no_show | ไม่มา | No-show | ✅ |



---


## 7. AI Auto-Assign Specialty Matching Details

The AI matching system analyzes patient symptoms using keyword matching across 11 medical specialties.

```text
AI Matching Flow:

Step 1: Patient submits appointment with symptoms/reason (Thai or English)
Step 2: AI tokenizes and analyzes symptom text
Step 3: Keyword matching against 11 specialty categories
Step 4: Confidence score calculated (0-100%)
Step 5: Available doctors filtered by:
        → Matching specialty
        → Schedule availability
        → Current workload (load balancing)
Step 6: Best match presented to admin with confidence %
Step 7: Admin approves or overrides assignment
```

| Confidence | Action | Description |
| ---------- | ------ | ----------- |
| ≥ 85% | Auto-assignable | High confidence, admin can approve directly |
| 60-84% | Review recommended | Moderate confidence, admin should review |
| < 60% | Manual assignment | Low confidence, admin should assign manually |



---


## 8. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | List all appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |
| GET | `/api/doctors` | List available doctors |
| POST | `/api/appointments/:id/assign` | Assign to doctor |
| POST | `/api/appointments/auto-assign-all` | Batch auto-assign all pending |
| GET | `/api/appointments/lifecycle/:id` | Get full appointment lifecycle history |
| GET | `/api/appointments/stats` | Get appointment statistics by status |
| GET | `/api/meetings/:id/status` | Get meeting status for appointment |
| GET | `/api/doctors/availability` | Check doctor schedule availability |
| GET | `/api/doctors/workload` | Get doctor workload for load balancing |



---


## 9. AI Agent Improvement Opportunities


- **Smart load balancing**: AI distribute appointments evenly across doctors

- **Priority scheduling**: AI factor in urgency for assignment order

- **Availability optimization**: AI consider doctor schedules and workload

- **Patient preferences**: AI match based on language, gender preferences

- **Lifecycle analytics**: AI identify bottlenecks in appointment-to-completion flow

- **No-show prediction**: AI predict and flag high-risk no-show appointments

- **Auto-escalation**: AI escalate stalled appointments (e.g., awaiting_doctor_response > 24h)

- **Meeting preparation alerts**: AI notify admin when meeting prerequisites not met

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. ตรวจสอบสถานะนัดปัจจุบัน (pending / in_pool / awaiting_doctor_response / confirmed)
2. ดำเนินการตามบทบาท: ผู้ป่วยจอง | แอดมินจัดสรร | แพทย์ยืนยัน
3. ตรวจ KPI คิว (`queue-count`) และรายการใน `queue-list`
4. อัปเดต realtime ผ่าน Socket.IO / รีเฟรช
5. เริ่มวิดีโอคอลเมื่อสถานะ confirmed
6. บันทึก EMR/สั่งยา/แล็บหลังจบการพบ

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 18_Admin_Doctor_Management.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/18_Admin_Doctor_Management.md`](../../Processes/Pages/Doctor-Portal/18_Admin_Doctor_Management.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **18 Admin Doctor Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 4. Workflows


### Workflow 1: Approve New Doctor

```text
Step 1: Admin sees pending registration in "รอ" tab
Step 2: Reviews doctor details (name, specialty, license)
Step 3: Clicks "Approve"
Step 4: PATCH /api/admin/doctors/:id/approve
Step 5: Doctor receives approval email notification
Step 6: Doctor can now log in to the portal
```


### Workflow 2: Reject Registration

```text
Step 1: Admin reviews pending doctor
Step 2: Clicks "Reject"
Step 3: Enters rejection reason
Step 4: PATCH /api/admin/doctors/:id/reject
Step 5: Doctor receives rejection email with reason
```


### Workflow 3: Change Role

```text
Step 1: Admin clicks "Change Role" on approved doctor
Step 2: Role modal opens (doctor → admin or admin → doctor)
Step 3: Select new role
Step 4: PATCH /api/admin/doctors/:id/role
Step 5: Role updated immediately
```

---


## 5. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/admin/doctors` | List all doctors |
| PATCH | `/api/admin/doctors/:id/approve` | Approve registration |
| PATCH | `/api/admin/doctors/:id/reject` | Reject registration |
| PATCH | `/api/admin/doctors/:id/role` | Change role |
| DELETE | `/api/admin/doctors/:id` | Remove doctor |
| POST | `/api/admin/doctors/:id/notification` | Send notification |



---


## 6. AI Agent Improvement Opportunities


- **License verification**: AI auto-verify Thai medical license numbers

- **Background screening**: AI cross-reference with medical boards

- **Activity monitoring**: AI flag inactive or underperforming accounts

- **Onboarding automation**: AI guide new doctors through portal setup

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «18 Admin Doctor Management» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 19_Doctors_Management_Page.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/19_Doctors_Management_Page.md`](../../Processes/Pages/Doctor-Portal/19_Doctors_Management_Page.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **19 Doctors Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. เข้าสู่ระบบพอร์ทัลแพทย์/ผู้ดูแล — ตรวจ URL และ HTTPS
2. เปิดหน้า «19 Doctors Management Page» จากเมนูหลัก — รอโหลด SPA จนไม่มี spinner ค้าง
3. อ่านคำอธิบายบนหน้าจอและข้อความ PDPA/คำเตือนที่เกี่ยวข้อง
4. กรอกหรือเลือกข้อมูลตามฟอร์ม — ใช้ `data-testid` ใน tests/SELECTORS.md เป็นจุดอ้างอิง
5. กดปุ่มบันทึก/ยืนยัน — ตรวจ Network tab: HTTP 2xx และ JSON `success`
6. หากได้ข้อความผิดพลาด: อ่าน `message` / `code` จาก API ไม่รีเฟรชซ้ำโดยไม่จำเป็น
7. ยืนยันผลลัพธ์บน UI (รายการ/สถานะ/KPI) ตรงกับที่คาดหวังใน § ผลลัพธ์ที่คาดหวัง
8. ตรวจข้อมูลใน PostgreSQL หรือแดชบอร์ดฝั่งตรงข้าม (เมื่อ workflow ข้ามพอร์ทัล)
9. จับภาพหน้าจอหรือรัน Playwright headed (`BASELINE_VISUAL=1`) สำหรับ baseline
10. บันทึกหรือส่งต่อขั้นตอนถัดไปตาม Processes/ ที่อ้างอิง

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 20_Appointment_Pool_Management.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md`](../../Processes/Pages/Doctor-Portal/20_Appointment_Pool_Management.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **20 Appointment Pool Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow 1: Claim from Pool

```text
Step 1: Doctor views pool appointments matching their specialty
Step 2: Reviews patient symptoms and urgency
Step 3: Clicks "Claim" → Proposes date/time
Step 4: POST /api/appointment-pool/:id/claim
Step 5: Status: doctor_claimed
Step 6: Awaits admin confirmation or direct confirmation
```


### Workflow 2: Respond to Patient Selection

```text
Step 1: Patient selected this doctor
Step 2: Doctor sees in "Awaiting Response" tab
Step 3: Click "Accept" → propose time → appointment confirmed
Step 4: Or "Reject" → appointment returns to pool
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointment-pool` | List pool appointments |
| POST | `/api/appointment-pool/:id/claim` | Claim appointment |
| PATCH | `/api/appointment-pool/:id/respond` | Accept/reject |
| POST | `/api/appointment-pool/:id/ai-match` | Trigger AI matching |

---


## 7. AI Agent Improvement Opportunities


- **Smart matching**: AI improve specialty matching accuracy


- **Workload balancing**: AI distribute pool assignments evenly


- **Predictive claiming**: AI suggest best-fit appointments for each doctor

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. ตรวจสอบสถานะนัดปัจจุบัน (pending / in_pool / awaiting_doctor_response / confirmed)
2. ดำเนินการตามบทบาท: ผู้ป่วยจอง | แอดมินจัดสรร | แพทย์ยืนยัน
3. ตรวจ KPI คิว (`queue-count`) และรายการใน `queue-list`
4. อัปเดต realtime ผ่าน Socket.IO / รีเฟรช
5. เริ่มวิดีโอคอลเมื่อสถานะ confirmed
6. บันทึก EMR/สั่งยา/แล็บหลังจบการพบ

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

### 21_Queue_Management.md

**ต้นฉบับ:** [`Processes/Pages/Doctor-Portal/21_Queue_Management.md`](../../Processes/Pages/Doctor-Portal/21_Queue_Management.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **21 Queue Management** อธิบายการทำงานของพอร์ทัลแพทย์/ผู้ดูแล ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## 5. Workflows


### Workflow: Process Patient Queue

```text
Step 1: Queue loads today's confirmed appointments
Step 2: Auto-polling refreshes every 30 seconds
Step 3: Doctor clicks "Call Next Patient"
Step 4: Top waiting patient marked as in-progress
Step 5: Doctor conducts consultation
Step 6: After meeting → Patient marked completed
Step 7: Next patient automatically highlighted
Step 8: Skip with reason if patient unavailable
```

---


## 6. API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/appointments` | Today's confirmed appointments |
| PATCH | `/api/appointments/:id` | Update appointment status |



---


## 7. AI Agent Improvement Opportunities


- **Dynamic wait times**: AI calculate realistic per-patient estimates

- **No-show prediction**: AI identify likely no-shows early

- **Queue optimization**: AI suggest reordering based on urgency changes

- **Patient notifications**: AI send wait time updates to patients

---

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. ตรวจสอบสถานะนัดปัจจุบัน (pending / in_pool / awaiting_doctor_response / confirmed)
2. ดำเนินการตามบทบาท: ผู้ป่วยจอง | แอดมินจัดสรร | แพทย์ยืนยัน
3. ตรวจ KPI คิว (`queue-count`) และรายการใน `queue-list`
4. อัปเดต realtime ผ่าน Socket.IO / รีเฟรช
5. เริ่มวิดีโอคอลเมื่อสถานะ confirmed
6. บันทึก EMR/สั่งยา/แล็บหลังจบการพบ

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

<a id="meeting-server"></a>

## Meeting Server

### 00_Meeting_Server_Overview.md

**ต้นฉบับ:** [`Processes/Pages/Meeting-Server/00_Meeting_Server_Overview.md`](../../Processes/Pages/Meeting-Server/00_Meeting_Server_Overview.md)

**วัตถุประสงค์ (ย่อ):**

หน้า **00 Meeting Server Overview** อธิบายการทำงานของพอร์ทัลMeeting Server ในระบบ Isara Anywhere ให้เจ้าหน้าที่ปฏิบัติการและทีมสนับสนุนใช้เป็นแนวทางเดียวกันกับคู่มือผู้ใช้และการทดสอบอัตโนมัติ

## ขั้นตอนการใช้งาน (สรุปจาก ENRICH-9)

**เงื่อนไขก่อนเริ่ม:** เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ถูกต้อง, ใช้ HTTPS, เบราว์เซอร์ Chrome/Edge ล่าสุด, อินเทอร์เน็ตเสถียร (วิดีโอ ≥10 Mbps)
1. แพทย์ (HOST) สร้าง/เปิดห้องประชุมก่อน — ระบบตั้ง `host-ready` ผ่าน Socket.IO (`notifyHostPresent`)
2. คัดลอก `guestJoinUrl` จาก Patient Portal API (`share-link` / `guest-invite`) — ห้ามแชร์ URL พอร์ทัลแพทย์
3. ผู้ป่วยและ Guest รอใน Izara Lobby (`lobby-waiting-screen` / `guest-lobby-waiting`) — ไม่ใช้ Jitsi lobby บน meet.jit.si
4. แพทย์กด Admit รายคน หรือ `admit-all-btn` — ตรวจ badge Guest/Patient บน Meeting Room
5. Guest: รอ overlay host-ready แล้ว mount Jitsi (`jitsi-guest-container` เต็มจอ ไม่ซ่อนด้วย h-0)
6. ทุกฝ่ายเข้า Jitsi บน `meet.jit.si` — เปิดกล้อง/ไมค์; ตรวจ CSP `frame-src` / `connect-src`
7. ระหว่างประชุม: ส่ง transcript segment (`/transcript`, `guest-transcript-segment`)
8. จบประชุม: MediaRecorder → `POST /api/meetings/:id/save-recording` (≤50MB) → path `meetings/{doctorId}/{meetingId}/video.webm`
9. เรียก `POST /api/meetings/:id/end` — pipeline สรุป AI (Gemini) + Socket `meeting-summary-ready`
10. แดชบอร์ดแพทย์: `GET /api/video-meeting/:appointmentId/files` → แท็บ AI Summary / `insert-meeting-summary-emr-btn`
11. ตรวจ `GET /api/meetings/:id/pipeline-status` หากสรุปยังไม่ขึ้น (stage: completed)

### ผลลัพธ์ที่คาดหวัง (สรุป)
- หน้าจอแสดงสถานะสำเร็จตามบทบาท (patient / doctor / guest)

### ข้อควรระวัง
- ข้อมูลสุขภาพเป็นความละเอียดอ่อน — ปฏิบัติตาม PDPA และนโยบายโรงพยาบาล

---

<a id="system-workflows"></a>

## เอกสาร Workflow ระดับระบบ

### Appointment_Workflows.md

**ต้นฉบับ:** [`Processes/Appointment_Workflows.md`](../../Processes/Appointment_Workflows.md)

#### How External Guests Join

1. Doctor/Patient creates invite → System generates secure token
2. Guest receives invite URL (via email or shared link)
3. Guest clicks link → No login required
4. Guest enters lobby → Doctor approves
5. Guest joins meeting with video/audio ON

---

#### 7a. Video Meeting Execution

### Meeting Flow (Jitsi Meet with Host Controls)

1. **Doctor starts meeting** (acts as HOST/MODERATOR - ONLY DOCTOR CAN START)
   - Doctor opens Scheduled Meetings tab
   - Clicks "Join Meeting" / "🎥 เข้าร่วมประชุม"
   - Uses `doctorMeetingUrl` which grants moderator privileges
   - Jitsi pre-join screen shows camera/mic preview
   - **Default: Camera ON, Microphone ON**
   - Doctor clicks "Join" to enter room AS HOST
   - **HOST CONTROLS AVAILABLE**:
     - Enable/disable lobby (default: enabled)
     - Kick participants
     - Mute all
     - Start/stop recording
     - Invite additional participants (guests)
     - Approve/reject participants from lobby

2. **Patient joins meeting (WAITS IN LOBBY)**
   - Patient sees meeting link in "นัดหมายของฉัน" page
   - Clicks "เข้าห้องประชุมเลย" button
   - Uses `patientMeetingUrl` with pre-filled display name
   - **Patient enters LOBBY automatically**
   - **Waits for doctor approval**
   - Doctor sees "Patient waiting in lobby" notification
   - Doctor clicks "Admit" to allow patient in
   - **Default: Camera ON, Microphone ON**
   - Enters Jitsi room as participant (not moderator)

3. **Guest/Family joins meeting** (LOBBY REQUIRED)
   - Doctor sends invite via "Invite Guest" button
   - Guest receives email with unique invite token
   - Guest clicks invite link
   - **Guest enters LOBBY automatically**
   - **Waits for doctor approval**
   - Doctor sees "Guest waiting in lobby" notification
   - Doctor can see guest name and type (relative/consultant)
   - Doctor clicks "Admit" or "Reject"
   - **Default: Camera ON, Microphone ON**
   - Joins as participant (not moderator)

4. **During meeting**
   - Video/audio consultation (all participants)
   - **Text chat available** for all participants — ALL chat messages are captured and included in AI summary
   - **Screen sharing** for medical images
   - **Local recording** (if enabled by doctor)
   - Users can mute/unmute their camera/mic at any time
   - **Doctor controls transcript streaming**: START / PAUSE / STOP
   - Transcript runs in real-time alongside the meeting
   - Chat messages timestamped and attributed to speakers

5. **Meeting ends**
   - Doctor ends the meeting (host control)
   - Recording saved locally on doctor's device
   - **Comprehensive post-meeting AI processing**:
     - Video uploaded to PostgreSQL/storage
     - Full transcript compiled from real-time streaming segments
     - All chat messages collected and merged with transcript
     - AI (Gemini) processes: video + transcript + chats
     - AI generates structured summary:
       - 🎯 Chief Complaint / อาการสำคัญ
       - 🔍 Investigation findings / ข้อค้นพบ
       - 📋 Recommendations / คำแนะนำ
       - 💊 Treatment suggestions / แนวทางการรักษา
       - ⚠️ Red flags / อาการที่ต้องเฝ้าระวัง
     - 30-minute sections for long meetings
     - Summary delivered to Doctor Portal → Health Meeting page
     - Doctor reviews (Man-in-the-Loop) → Approves → EMR generated
     - EMR report stored in PostgreSQL
     - Relevant parts sent to Patient Portal → Health History page

---

#### 7b. COMPREHENSIVE END-TO-END MEETING WORKFLOW (Microsoft Teams-Like Experience)

### Overview

The meeting experience is designed to work like **Microsoft Teams** — the doctor acts as HOST who controls all aspects of the meeting including admitting participants, starting/stopping transcript streaming, managing recording, and processing the AI summary afterward.

### Participant Types & Invitation Flow

```text
┌── WHO CAN JOIN THE MEETING ─────────────────────────────────────────────┐
│                                                                          │
│  👨‍⚕️ DOCTOR (HOST/MODERATOR)                                            │
│  ├── The doctor who confirmed the appointment                           │
│  ├── Joins with doctorMeetingUrl (moderator privileges)                 │
│  ├── Controls: lobby admission, recording, transcript, mute all        │
│  └── Can invite: other doctors, admin, specialists                     │
│                                                                          │
│  🧑 PATIENT                                                              │
│  ├── The patient who booked the appointment                             │
│  ├── Joins with patientMeetingUrl (waits in lobby)                     │
│  ├── Can invite: relatives, friends (via Patient Portal)               │
│  └── Admitted by doctor from lobby                                     │
│                                                                          │
│  👥 PATIENT'S RELATIVES/FRIENDS (Invited by Patient)                    │
│  ├── Patient sends meeting link to relatives/friends                    │
│  ├── Guest clicks link → Creates display name from BLANK               │
│  ├── Guest enters lobby → Waits for doctor approval                    │
│  └── Doctor sees guest name and admits/rejects from lobby              │
│                                                                          │
│  👨‍⚕️ OTHER DOCTORS/ADMIN (Invited by Doctor)                            │
│  ├── Doctor sends meeting link to colleagues/specialists               │
│  ├── Invited doctor/admin clicks link → Enters lobby                   │
│  ├── HOST doctor approves from lobby                                    │
│  └── Joins as participant (not moderator)                              │
│                                                                          │
│  🌐 EXTERNAL GUESTS (Non-registered users)                              │
│  ├── Receive meeting link (via email or direct share)                  │
│  ├── Click link → No login required                                     │
│  ├── Create username/display name from blank                           │
│  ├── Enter lobby → Wait for doctor approval                            │
│  └── Doctor approves based on guest name                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Test User Mapping for E2E Testing

| Role | Test Email | Test Password | Portal | Meeting Role |
| ---- | ---------- | ------------- | ------ | ------------ |
| Doctor (HOST) | `doctor.test@izara.com` | IzaraDoctor@2024 | Doctor Portal | Moderator |
| Patient | `demo.test@gmail.com` | P@ssw0rd | Patient Portal | Participant (lobby) |
| Patient Relative | `demo2.test@gmail.com` | P@ssw0rd | Patient Portal | Guest (lobby) |
| Admin/2nd Doctor | `admin.test@izara.com` | IzaraAdmin@2024 | Doctor Portal | Participant (lobby) |
| External Guest | (any email) | (none) | Direct link | Guest (create name + lobby) |


### Full Meeting Lifecycle (Step-by-Step)

```text
╔══════════════════════════════════════════════════════════════════════════╗
║  PHASE 1: APPOINTMENT BOOKING & APPROVAL                                ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Step 1:  Patient logs in → Patient Portal (localhost:3005)              ║
║  Step 2:  Patient books appointment (symptoms + preferred time)          ║
║           - AI analyzes symptoms → urgency level + specialty             ║
║           - Patient can optionally select a specific doctor              ║
║           - Status: pending (specific doctor) or in_pool (unassigned)   ║
║                                                                          ║
║  Step 3:  APPROVAL PATH A — Doctor confirms directly                    ║
║           - Doctor sees pending appointment in Health Meeting → Queue    ║
║           - Reviews patient symptoms and AI analysis                     ║
║           - Clicks "Confirm" → Sets date/time                           ║
║           - System generates Jitsi meeting URLs (doctor/patient/guest)  ║
║           - Status: confirmed                                           ║
║                                                                          ║
║  Step 3:  APPROVAL PATH B — Admin assigns then doctor confirms          ║
║           - Admin sees in_pool appointments in Admin Appointment Mgmt   ║
║           - AI auto-matches specialty (11 categories)                   ║
║           - Admin assigns to specific doctor (manual or AI)             ║
║           - Status: awaiting_doctor_response                            ║
║           - Doctor confirms → Jitsi URLs generated → Status: confirmed  ║
║                                                                          ║
║  Step 4:  NOTIFICATIONS SENT                                             ║
║           - Patient: in-app notification + email with meeting link       ║
║           - Doctor: appointment appears in Scheduled Meetings tab        ║
║           - Calendar event created for both parties                      ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PHASE 2: PRE-MEETING PREPARATION                                       ║
╠════════════════════════════════════════

… *(ตัด — ดูต้นฉบับ)*

#### 9. Meeting Execution & Recording

### Online Telehealth (Jitsi Meet)

1. **All participants join via Jitsi meeting link at scheduled time**
2. **Doctor acts as HOST** with recording permissions
3. **During meeting:**
   - Video/audio medical consultation
   - Screen sharing for medical images/reports
   - Local recording enabled
4. **Meeting ends:**
   - Doctor ends meeting
   - Recording uploaded to GCS via API

### Recording & Transcription Flow

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  POST-MEETING AI PROCESSING                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Video Upload                                                          │
│     └─→ POST /api/video-meeting/:id/end                                  │
│     └─→ Video → GCS: izara-doctors-data/doctors/{doctorId}/meetings/     │
│                                                                           │
│  2. Speech-to-Text Transcription                                          │
│     └─→ Audio extracted → Google Cloud Speech-to-Text API                │
│     └─→ Thai/English medical speech recognition                          │
│     └─→ Output: transcript.txt                                           │
│                                                                           │
│  3. AI Summary Generation (Gemini)                                        │
│     └─→ Transcript → Gemini AI                                           │
│     └─→ Thai SOAP format: อาการสำคัญ, ประวัติ, การตรวจ, การวินิจฉัย      │
│     └─→ Output: summary.txt                                              │
│                                                                           │
│  4. Doctor Recommendations (Gemini)                                       │
│     └─→ Clinical decision support                                        │
│     └─→ Differential diagnosis suggestions                               │
│     └─→ Output: recommendations.txt                                      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Onsite Appointments

- Patient arrives at clinic

- Doctor refers to calendar and email for symptoms/details

- No recording or transcription needed

---

#### 10. Post-Meeting Actions (Doctor Side)

### 10.1 EMR Documentation Flow

1. **Doctor opens EMR Editor** (`CompleteEMREditor.tsx`)
   - Uses Thai OPD Card format (มาตรฐานกระทรวงสาธารณสุข)
   - Tabs: ประวัติ (S), ตรวจร่างกาย (O), การวินิจฉัย (A), การรักษา (P), สรุป AI
   - **NEW: AI-generated content from meeting transcript available**

2. **Doctor fills EMR sections:**
   - Chief complaint and history (auto-populated from AI if meeting)
   - Physical examination and vital signs
   - Diagnosis (ICD-10 codes)
   - Treatment plan and follow-up instructions

3. **AI Summary Generation:**
   - AI (Gemini) generates patient-friendly summary
   - AI generates meeting transcript (if telemedicine)
   - **NEW: Doctor reviews AI recommendations panel**
   - Doctor reviews and may edit AI content

4. **Doctor signs EMR:**
   - Clicks "ลงนามและส่งให้ผู้ป่วย" (Sign and Send to Patient)
   - Digital signature applied
   - Status changes to `finalized`

### 10.2 Prescription Documentation

1. **Doctor opens E-Prescribing** (`CompletePrescribing.tsx`)
   - Searches for medications
   - System checks for allergies and drug interactions
   - Doctor adds medications with dosage and instructions

2. **Prescription saved:**
   - Prescription saved to `prescriptions.json`
   - **Prescription sent to patient health logs** (`health-logs.json`)
   - Patient can view prescribed medications in Health Studio

### 10.3 EMR Delivery to Patient

#### Delivery Flow

1. EMR signed → POST to `/api/patients/{patientId}/health-logs`
2. Data saved to GCS: `patients/{patientId}/health-logs.json`
3. Patient notification sent
4. Patient views in Health Studio → ผลการรักษา (Treatment Results)
5. Patient views in Latest Appointment Result on dashboard

### 10.4 If EMR Not Signed

- Patient cannot access EMR in health logs

- Status: `awaiting signature`

- Notification sent to doctor to complete signature

---

#### Additional Fixes for Cache Issues (2025-12-11 Evening)

1. **`gcsDataService.ts`**: Modified `fetchAllAppointments()` to accept options parameter for cache bypass
2. **`HealthMeeting.tsx`**: All `fetchAllAppointments()` calls now use `{ cache: false }` option
3. **`DoctorDashboard.tsx`**: Same cache bypass applied
4. **Added verification step**: After saving, system verifies the appointment was actually updated
5. **Added delays**: Small delays (300-500ms → 1000ms) after GCS writes to allow propagation

#### 16. E2E Testing — Comprehensive Meeting Workflow

### Testing Environments

| Environment | Patient Portal | Doctor Portal | Meeting Server | Database |
| ----------- | ------------- | ------------- | -------------- | -------- |
| **Local (Docker)** | localhost:3005 | localhost:3010 | localhost:3020 | localhost:5432 (izara_phase1) |
| **Cloud (GCP)** | patient-portal-xxxxx.run.app | doctor-portal-xxxxx.run.app | meeting-server-xxxxx.run.app | CloudSQL (izara_phase1) |


### Test Credentials (Deployment)

| Role | Email | Password | Portal |
| ---- | ----- | -------- | ------ |
| Doctor (HOST) | `doctor.test@izara.com` | IzaraDoctor@2024 | Doctor Portal |
| Patient | `demo.test@gmail.com` | P@ssw0rd | Patient Portal |
| Admin | `admin.test@izara.com` | IzaraAdmin@2024 | Doctor Portal |
| External Guest | (no login required) | (none) | Direct meeting link |


### Dual Portal Testing

The appointment workflow is tested end-to-end using the Selenium test suite that runs both Patient and Doctor portals simultaneously:

```bash

# Run full dual-portal meeting workflow test (local)
node scripts/tests/e2e/dualPortalMeetingTests.cjs

# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless

# Run standard appointment workflow tests
node scripts/tests/e2e/appointmentWorkflowTests.cjs

# Run cloud environment tests
node scripts/tests/e2e/dualPortalMeetingTests.cjs --env=cloud
```

### Comprehensive Test Coverage Matrix

| # | Phase | Test Scenario | Portal(s) | Validates |
| - | ----- | ------------- | --------- | --------- |
| 1 | **Pre-Meeting** | Patient logs in and books appointment | Patient | Auth + booking flow |
| 2 | **Pre-Meeting** | AI analyzes symptoms and sets urgency | System | Gemini integration |
| 3 | **Pre-Meeting** | Doctor sees pending appointment in queue | Doctor | Health Meeting queue |
| 4 | **Pre-Meeting** | Doctor confirms appointment with date/time | Doctor | Status → confirmed |
| 5 | **Pre-Meeting** | System generates Jitsi meeting URLs | System | 3 URLs: doctor/patient/guest |
| 6 | **Pre-Meeting** | Patient receives notification with link | Patient | Notification system |
| 7 | **Pre-Meeting** | AI generates pre-consultation summary | System | Requirement 2.2 |
| 8 | **Pre-Meeting** | Patient invites relatives/friends (share link) | Patient | Guest invite flow |
| 9 | **Pre-Meeting** | Doctor invites other doctors (token invite) | Doctor | Multi-party invite |
| 10 | **Meeting** | Doctor starts meeting (HOST/moderator) | Doctor | Jitsi HOST controls |
| 11 | **Meeting** | Patient enters LOBBY → Doctor admits | Both | Lobby admission |
| 12 | **Meeting** | Guest creates display name from BLANK → LOBBY | Guest | Guest self-registration |
| 13 | **Meeting** | Doctor admits/rejects guests from lobby | Doctor | Selective admission |
| 14 | **Meeting** | Doctor starts transcript streaming | Doctor | Web Speech API activation |
| 15 | **Meeting** | Real-time transcript appears with speaker labels | Both | Socket.IO streaming |
| 16 | **Meeting** | All participants can send text chat | All | Chat capture system |
| 17 | **Meeting** | Doctor pauses/resumes transcript | Doctor | HOST transcript control |
| 18 | **Meeting** | Doctor stops transcript | Doctor | Transcript finalization |
| 19 | **Meeting** | Screen sharing for medical images | Doctor | Jitsi screen share |
| 20 | **Meeting** | Demo meeting with simulated video/audio | Both | Local testing |
| 21 | **Post-Meeting** | Doctor ends meeting | Doctor | HOST end control |
| 22 | **Post-Meeting** | Recording uploaded to PostgreSQL | System | Storage pipeline |
| 23 | **Post-Meeting** | AI processes transcript + chats + video | System | Gemini summary pipeline |
| 24 | **Post-Meeting** | AI generates SOAP summary (Thai) | System | Requirement 2.1, 3.2 |
| 25 | **Post-Meeting** | 30-min sectioned summaries for long meetings | System | Section splitting |
| 26 | **Post-Meeting** | Summary displayed on Doctor's Health Meeting | Doctor | Results display |
| 27 | **Post-Meeting** | Doctor reviews AI summary (Man-in-the-Loop) | Doctor | Requirement 2.5 |
| 28 | **Post-Meeting** | Doctor approves/edits/rejects summary | Doctor | Validation UI |
| 29 | **EMR** | EMR Editor pre-filled with AI SOAP data | Doctor | Auto-population |
| 30 | **EMR** | Doctor edits and finalizes EMR | Doctor | EMR workflow |
| 31 | **EMR** | Doctor signs EMR (digital signature) | Doctor | Sign & finalize |
| 32 | **EMR** | Patient Instruction Sheet auto-generated | System | Requirement 4.5 |
| 33 | **EMR** | Doctor reviews instruction sheet | Doctor | Man-in-the-Loop |
| 34 | **Delivery** | EMR data sent to patient | System | POST health-logs |
| 35 | **Delivery** | Patient views results in Dashboard | Patient | Latest Result widget |
| 36 | **Delivery** | Patient views results in Timeline | Patient | Treatment history |
| 37 | **Delivery** | Patient downloads Instruction Sheet (PDF) | Patient | PDF generation |
| 38 | **Delivery** | Appointment status → completed | Both | Final status |


### Demo Meeting Test Procedure

For testing on local environment with simulated video/audio:

```text
Step 1:  Start Docker → docker-compose up -d (all 4 services)
Step 2:  Open Patient Portal (localhost:3005) → Login as patient
Step 3:  Book appointment with Thai symptoms (ปวดหัว ไข้สูง 2 วัน)
Step 4:  Open Doctor Portal (localhost:3010) → Login as doctor
Step 5:  See appointment in Health Meeting → Queue tab
Step 6:  Confirm appointment → Set time → Jitsi URLs generated
Step 7:  Patient gets notification → Sees meeting link in Appointments
Step 8:  (Optional) Patient shares guest link with test email
Step 9:  Doctor clicks "Join Meeting" → Enters as HOST
Step 10: Patient clicks "Join Meeting" → Enters LOBBY
Step 11: Doctor admits patient from lobby
Step 12: (Optional) Guest opens link → Creates name → LOBBY → Doctor admits
Step 13: Doctor clicks "Start Transcription" → Speak test phrases
Step 14: Verify: real-time transcript appears with speaker labels
Step 15: Use chat to send tex

… *(ตัด — ดูต้นฉบับ)*

---

### VIDEO_MEETING_JITSI_GEMINI.md

**ต้นฉบับ:** [`Processes/VIDEO_MEETING_JITSI_GEMINI.md`](../../Processes/VIDEO_MEETING_JITSI_GEMINI.md)

#### Web Speech API Integration (FREE — Browser-Native)

### Configuration

```typescript
// Web Speech API - FREE, no API key required
const SPEECH_CONFIG = {
  api: 'Web Speech API (SpeechRecognition)',
  cost: 'FREE',
  languages: ['th-TH', 'en-US'],
  continuous: true,
  interimResults: true,
  maxAlternatives: 1
};

// Initialize Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'th-TH';  // or 'en-US'
recognition.continuous = true;
recognition.interimResults = true;
```


### HOST Transcript Control Flow

```typescript
// Doctor (HOST) controls transcript streaming
// Step 1: Doctor clicks [Start Transcription]
POST /api/meetings/:id/start-transcription
// → Activates Web Speech API on doctor's browser
// → Socket.IO broadcasts transcript segments to all participants

// Step 2: Real-time streaming
// → recognition.onresult fires with interim and final results
// → Final results saved to PostgreSQL meeting_transcripts table
// → Interim results shown with yellow pulsing background

// Step 3: Doctor clicks [Pause] / [Resume]
POST /api/meetings/:id/pause-transcription
// → recognition.stop() / recognition.start()

// Step 4: Doctor clicks [Stop Transcription]
POST /api/meetings/:id/stop-transcription
// → recognition.stop()
// → Full transcript compiled from all segments
```


### Speaker Label Assignment


- 👨‍⚕️ **Doctor**: Speaker detected from doctor's audio stream


- 🧑 **Patient**: Speaker detected from patient's audio stream


- 👥 **Guest**: Speaker detected from guest audio streams (by display name)


- Timestamps: Each segment includes `start_time_seconds` and `end_time_seconds`


- Language: Each segment tagged with detected language (th/en)


### Medical Speech Recognition Features


- **Continuous Mode**: Uninterrupted transcription during consultation


- **Interim Results**: Real-time display of partial recognition (pulsing yellow)


- **Thai + English**: Primary Thai with English switching by HOST


- **No Cost**: Browser-native API, zero API charges


- **Browser Support**: Chrome, Edge, Safari (WebKit)

#### Security Considerations

1. **Room Name Hashing**: Room names include secure hash to prevent guessing
2. **Pre-join Verification**: Users must click "Join" button, can't auto-join
3. **No Persistent Storage**: Meeting URLs expire after meeting ends
4. **PDPA Compliance**: Transcripts stored according to PDPA guidelines
5. **End-to-End Encryption**: Jitsi supports E2EE for sensitive consultations
6. **PostgreSQL Storage**: All meeting data stored in PostgreSQL (not public cloud buckets)
7. **File Size Limits**: 200MB max for video uploads
8. **Man-in-the-Loop**: All AI outputs require doctor validation before patient delivery
9. **Guest Lobby Control**: Non-registered users cannot enter meeting without HOST approval
10. **Chat Privacy**: Meeting chat messages are private to the consultation and stored securely
11. **Permissions-Policy**: `camera=(self "<https://meet.jit.si")`,> `microphone=(self "<https://meet.jit.si")`> — scoped to Jitsi iframe only (v1.5.9 fix)
12. **CSP for Video**: `frame-src meet.jit.si 8x8.vc`, `media-src mediastream:`, `worker-src blob:`, `connect-src *.run.app wss://*.run.app`
13. **Iframe Allow Attribute**: Explicit `allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *"` on Jitsi iframe

#### Testing

### Test Environments

| Environment | Patient Portal | Doctor Portal | Meeting Server | Database |
| ----------- | ------------- | ------------- | -------------- | -------- |
| **Local** | localhost:3005 | localhost:3010 | localhost:3020 | localhost:5432 |
| **Cloud** | patient-portal-xxxxx.run.app | doctor-portal-xxxxx.run.app | meeting-server-xxxxx.run.app | CloudSQL |


### E2E Test Suite

```bash


# Run dual-portal meeting workflow tests
node scripts/tests/e2e/dualPortalMeetingTests.cjs



# Run with headless browsers
node scripts/tests/e2e/dualPortalMeetingTests.cjs --headless
```


### 4-User Meeting UI Test

```bash


# Test with 4 visible browser windows (Doctor, Patient, Relative, Admin)
node scripts/tests/fourUserMeetingUITest.cjs



# Run against cloud deployments
node scripts/tests/fourUserMeetingUITest.cjs --cloud



# Test users:


# - Doctor HOST: doctor.test@izara.com (IzaraDoctor@2024)


# - Patient: demo.test@gmail.com (P@ssw0rd)


# - Patient Relative: (no login - creates display name from blank)


# - Admin: admin.test@izara.com (IzaraAdmin@2024)
```


### Comprehensive Meeting Test Scenarios

| # | Test | Validates |
| - | ---- | --------- |
| 1 | Doctor creates meeting as HOST | Jitsi URL generation, moderator flag |
| 2 | Patient enters lobby, doctor admits | Lobby system, admission control |
| 3 | Guest creates display name from blank, enters lobby | Guest self-registration |
| 4 | Doctor selectively admits/rejects guests | HOST lobby control |
| 5 | Doctor starts transcript streaming | Web Speech API activation |
| 6 | Real-time transcript with speaker labels | Socket.IO streaming + speaker ID |
| 7 | Doctor pauses/resumes transcript | HOST transcript control |
| 8 | All participants send chat messages | Chat capture with timestamps |
| 9 | Doctor stops transcript | Transcript finalization |
| 10 | Doctor ends meeting | All disconnected, data compiled |
| 11 | AI processes transcript + chats | Gemini summary pipeline |
| 12 | 30-min sectioned summaries for long meetings | Section splitting |
| 13 | Doctor reviews AI summary (Man-in-the-Loop) | Validation UI |
| 14 | EMR Editor pre-filled with AI SOAP data | Auto-population |
| 15 | Patient Instruction Sheet generated | AI + doctor validation |
| 16 | Patient receives results in Health History | Patient delivery pipeline |


### Demo Meeting Test Procedure (Local)

```text
1. docker-compose up -d (start all 4 services)
2. Login as doctor (localhost:3010) and patient (localhost:3005)
3. Patient books appointment with Thai symptoms
4. Doctor confirms appointment → Jitsi URLs generated
5. Doctor clicks "Join Meeting" → enters as HOST
6. Patient clicks meeting link → enters LOBBY → Doctor admits
7. (Optional) Open incognito window → Guest link → Create name → LOBBY
8. Doctor clicks "Start Transcription" → Speak test phrases
9. Verify real-time transcript with speaker labels
10. Send chat messages → Verify captured
11. Doctor clicks "Stop Transcription" then "End Meeting"
12. Verify AI summary generated → Doctor reviews on Health Meeting page
13. Doctor opens EMR Editor → Verify AI pre-filled SOAP tabs
14. Doctor signs EMR → Patient sees results in Dashboard + Timeline
```


### Generate Test Audio

```bash


# Generate test audio files for transcription testing
node scripts/generators/generateTestAudio.cjs
```


### Test Files Generated


- `thai-headache-consultation-transcript.txt` - Reference Thai transcript


- `thai-fever-consultation-transcript.txt` - Reference Thai transcript


- `english-general-consultation-transcript.txt` - Reference English transcript


- `*-ssml.xml` - SSML for Google TTS API


- `*-metadata.json` - Test metadata


### API Testing

```bash


# Test meeting creation
curl -X POST <http://localhost:3009/api/video-meeting/create> \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "APT-TEST-001", "doctorId": "DOC-001"}'



# Test video upload
curl -X POST <http://localhost:3009/api/video-meeting/APT-TEST-001/upload-recording> \
  -H "Content-Type: application/json" \
  -d '{"videoBase64": "<base64>", "doctorId": "DOC-001"}'



# Test get meeting files
curl <http://localhost:3009/api/video-meeting/APT-TEST-001/files?doctorId=DOC-001>
```

#### Troubleshooting

### Meeting Won't Start

1. Check browser permissions for camera/microphone
2. Ensure HTTPS is enabled (required for WebRTC)
3. Try a different browser (Chrome/Edge recommended)


### Transcription Not Working

1. Verify GOOGLE_SPEECH_API_KEY is set correctly
2. Check audio format is supported (webm, mp3, wav)
3. Ensure audio quality is sufficient
4. Check API quota limits


### Video Upload Failed

1. Check file size (max 200MB)
2. Verify content type (video/webm, video/mp4)
3. Check GCS API server is running
4. Verify bucket permissions


### Meeting Link Invalid

1. Meetings expire 30 minutes after scheduled end time
2. Check appointment status is not cancelled
3. Verify appointmentId is correct

#### Future Improvements (Phase 2)

1. **Self-hosted Jitsi**: For complete control, deploy own Jitsi server
2. **Gemini LLM Fine-Tuning**: Fine-tune on Thai medical data (Requirement 3.4)
3. **Multi-language Support**: Automatic language detection during transcription
4. **Chunked Upload**: Support for large video files via chunked upload
5. **Video Playback**: In-portal video playback for doctor review
6. **Waiting Room UI**: Enhanced lobby with estimated wait time
7. **AI Chat History**: Long-term AI knowledge base from meeting data (Requirement 3.3)

#### PostgreSQL Database Architecture for Video Meetings

### Database Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **meeting_records** | Video session metadata + AI output | id (UUID), appointment_id, doctor_id, patient_id, room_name, jitsi_domain, status (waiting/active/completed/ended), meeting_config (JSONB), transcript (text), ai_summary (text), ai_recommendations (text), section_summaries (JSONB), doctor_validation_status (pending/approved/rejected), patient_instructions (text), recording_data (BYTEA), duration_minutes |
| **meeting_transcripts** | Speech-to-Text segments | id (UUID), meeting_record_id (FK), speaker_id, speaker_role (doctor/patient/guest), speaker_name, content (text), language (th/en), confidence (decimal), start_time_seconds (decimal), is_final (boolean) |
| **transcriptions_embeddings** | Vectorized transcript chunks for RAG | meeting_record_id, chunk_text, speaker_role, start_time_seconds, end_time_seconds, embedding (vector), metadata (JSONB) |
| **appointments** | Meeting scheduling context | id, patient_id, doctor_id, status, meet_link, jitsi_room_name, confirmed_date_time |
| **emr** | AI-generated SOAP from meeting | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, ai_summary_approved, status |
| **ai_validations** | Man-in-the-Loop approvals | id, type ('meeting_summary'/'emr'), patient_id, doctor_id, decision, content_snapshot (JSONB) |
| **ai_chat_history** | Meeting-context AI conversations | id, user_id, session_id, role, content, context (JSONB), embedding (vector) |
| **ai_chat_memory** | Long-term AI knowledge from meetings | id, user_id, memory_type, title, content, source_session_id, embedding (vector), relevance_score, is_active |


### Complete Meeting Data Flow (End-to-End)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MEETING LIFECYCLE DATA FLOW                                │
│                                                                              │
│  1. APPOINTMENT SCHEDULING                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Patient Portal (3005): POST /api/appointments                          │  │
│  │ → INSERT INTO appointments (patient_id, doctor_id, status='pending')   │  │
│  │                                                                        │  │
│  │ Doctor Portal (3010): PUT /api/appointments/:id/confirm               │  │
│  │ → UPDATE appointments SET status='confirmed',                         │  │
│  │     jitsi_room_name='izara-{aptId}-{ts}', meet_link=$jitsiUrl         │  │
│  │ → NOTIFY appointment_changes → Socket.IO: appointment:updated         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  2. MEETING START (Doctor as Host)                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Meeting Server (3020): POST /api/meetings/start                        │  │
│  │ → INSERT INTO meeting_records (appointment_id, doctor_id, patient_id,  │  │
│  │     room_name, jitsi_domain='meet.jit.si', status='waiting',           │  │
│  │     meeting_config=$json)                                              │  │
│  │ → UPDATE appointments SET status='in_progress'                        │  │
│  │ → Jitsi iframe loads with lobby enabled                               │  │
│  │ → NOTIFY meeting_changes → Socket.IO: meeting:updated                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  3. REAL-TIME TRANSCRIPTION (Web Speech API — FREE)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Browser: SpeechRecognition API captures audio → text                   │  │
│  │ → Socket.IO emit: 'transcript:segment' (speaker, content, confidence)  │  │
│  │ → Meeting Server: INSERT INTO meeting_transcripts (meeting_record_id,  │  │
│  │     speaker_id, speaker_role, speaker_name, content, language,         │  │
│  │     confidence, start_time_seconds, is_final)                          │  │
│  │ → Broadcast to all participants via Socket.IO: 'transcript:update'     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  4. MEETING END + AI SUMMARY PIPELINE                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Doctor ends meeting → Meeting Server: POST /api/meetings/:id/end       │  │
│  │                                                                        │  │
│  │ Step 1: Gather full transcript                                        │  │
│  │ SELECT content, speaker_role FROM meeting_transcripts                 │  │
│  │   WHERE meeting_record_id = $1 ORDER BY start_time_seconds            │  │
│  │                                                                        │  │
│  │ Step 2: Send to Gemini 2.5 Flash Lite                                 │  │
│  │ → AI generates: ai_summary, ai_recommendations, section_summaries     │  │
│  │ → AI generates: SOAP format EMR draft (subjective, objective,         │  │
│  │     assessment, plan)                                                  │  │
│  │ → AI generates: patient_instructions (lay-term summary)               │  │
│  │                                                                        │  │
│  │ Step 3: Store AI output                                               │  │
│  │ UPDATE meeting_records SET ai_summary=$1, ai_recommendations=$2,      │  │
│  │   section_summaries=$3, patient_instructions=$4, status='completed',   │  │
│  │   duration_min

… *(ตัด — ดูต้นฉบับ)*

---

### FULL_WORKFLOW_CONTRACT.md

**ต้นฉบับ:** [`Processes/FULL_WORKFLOW_CONTRACT.md`](../../Processes/FULL_WORKFLOW_CONTRACT.md)

#### Global Invariants (Must Always Hold)

- Authentication and role guards block cross-role or unauthenticated access.
- Appointment lifecycle follows allowed statuses only and preserves ownership integrity.
- Assigned doctor is the only meeting host/moderator; patient/guest/admin are non-host participants.
- Meeting lobby admission is doctor-controlled and enforced for non-host joiners.
- Real-time updates propagate from PostgreSQL NOTIFY to Socket.IO and render once (no missed/duplicate UI state transitions).
- Clinical AI outputs are treated as draft until doctor validation (man-in-the-loop).
- Patient-visible outputs exclude internal doctor-only notes.

#### Must-Pass Behaviors by Domain

### 1) Auth and Access

- Patient login/register/reset-password flows succeed and produce valid session state.
- Doctor/admin login works with role-specific routes and UI.
- Google SSO button/config loads and handles known success/redirect/fallback scenarios.
- Protected APIs reject missing/invalid JWT.
- Route guards prevent patient access to doctor/admin routes and vice versa.

### 2) Appointment Lifecycle

- Patient booking creates appointment with valid initial state (`pending` or `in_pool`).
- Admin assignment transitions unassigned appointments to `awaiting_doctor_response`.
- Assigned doctor confirmation transitions to `confirmed` with stable meeting metadata.
- Decline/cancel transitions are reflected to all relevant users and notifications.
- Ownership fields (`doctorId`, `assignedDoctorId`, `confirmedBy`, fallback identifiers) remain consistent for queue/dashboard filtering.

### 3) Meeting Host/Lobby and Room Resolution

- Doctor join URL resolves as host and host controls appear.
- Patient/guest/admin join flows resolve to lobby-gated access where required.
- Invite and guest join links resolve to expected room identity and role.
- Transcript start/pause/resume/stop controls are host-scoped and persist meeting transcript state.
- Meeting room routes for doctor/patient/guest remain deterministic for the same appointment.

### 4) Realtime Sync (PG NOTIFY -> Socket.IO -> UI)

- Appointment updates emit to expected rooms/channels.
- Doctor dashboard, appointment queue/pool, and patient appointment views update without manual refresh.
- Notification streams appear once per event and avoid duplicate rendering.
- Listener wiring remains healthy under Cloud Run baseline settings (warm instance constraints).

### 5) Clinical Workflows (PHR/EMR/Prescribing/Lab)

- Doctor can open and submit EMR flows with appointment context.
- Prescribing and lab-order actions persist with correct appointment/patient linkage.
- PHR and health-record views display finalized patient-safe data.
- Clinical permissions prevent unauthorized edits/reads across patients/roles.

### 6) Secondary Workflows

- PDPA consent and living will flows are navigable, saveable, and retrievable.
- Notifications, timeline, settings, profile, AI/content/resources pages load and perform core actions.
- Major integrations degrade gracefully when optional providers are unavailable.

---

### Combined_Workflows_And_Actions.md

**ต้นฉบับ:** [`Processes/Combined_Workflows_And_Actions.md`](../../Processes/Combined_Workflows_And_Actions.md)

#### 📋 Table of Contents

1. [End-to-End Patient Journey](#1-end-to-end-patient-journey)
2. [End-to-End Doctor Workflow](#2-end-to-end-doctor-workflow)
3. [End-to-End Admin Workflow](#3-end-to-end-admin-workflow)
4. [Complete Appointment-to-Delivery Pipeline](#4-complete-appointment-to-delivery-pipeline)
5. [Cross-Portal Data Synchronization](#5-cross-portal-data-synchronization)
6. [AI-Assisted Clinical Pipeline](#6-ai-assisted-clinical-pipeline)
7. [Complete Feature Matrix](#7-complete-feature-matrix)
8. [All System Actions by Category](#8-all-system-actions-by-category)
9. [Notification Flow Across System](#9-notification-flow-across-system)
10. [Content Lifecycle (Create → Approve → Publish)](#10-content-lifecycle)

---

#### 6. AI-Assisted Clinical Pipeline

### Complete AI Feature Chain

```text
1. APPOINTMENT BOOKING                    2. PRE-CONSULTATION
   ──────────────────                        ──────────────────
   Patient symptoms → Gemini                 Patient PHR + History → Gemini
   ├ Analyze urgency (1-10)                  ├ Generate summary
   ├ Match specialty                         ├ Flag drug allergies
   ├ Suggest doctor                          ├ Highlight chronic conditions
   └ Save to ai_triage JSONB                 └ Present to doctor before meeting

3. DURING MEETING                         4. POST-MEETING AI
   ────────────────                          ─────────────────
   Web Speech API (browser)                  Full transcript → Gemini
   ├ Real-time speech-to-text                ├ SOAP EMR draft
   ├ Thai + English support                  ├ Key clinical decisions
   ├ Save segments to DB                     ├ Recommended follow-up
   └ Display live transcript                 └ Save as meeting_records.ai_summary

5. MAN-IN-THE-LOOP                       6. PATIENT DELIVERY
   ─────────────────                         ──────────────────
   Doctor reviews ALL AI output              Approved EMR → Gemini
   ├ ✅ Approve as-is                        ├ Generate patient-friendly summary
   ├ ✏️ Edit then approve                    ├ Medication instructions
   ├ ❌ Reject & regenerate                  ├ Lifestyle recommendations
   └ All decisions logged                    ├ Warning signs
                                             └ Follow-up information

7. AI CHAT (ONGOING)                      8. CDS (CLINICAL DECISION SUPPORT)
   ─────────────────                         ────────────────────────────────
   Doctor asks clinical question             During prescribing/orders
   ├ Query → embedding                       ├ Drug interaction check
   ├ RAG search knowledge_base               ├ Allergy cross-reference
   ├ Top-K context + query → Gemini          ├ Dose adjustment (renal)
   └ Response with citations                 ├ Guideline alerts
                                             └ All logged in cds_logs
```

---

---

### Separated_Workflows_And_Functions.md

**ต้นฉบับ:** [`Processes/Separated_Workflows_And_Functions.md`](../../Processes/Separated_Workflows_And_Functions.md)

#### A. Authentication & User Management

### A1. Patient Registration

**Pages:** `RegisterPage.tsx`
**API:** `POST /api/auth/register`
**Tables:** `users`, `patient_profiles`, `phr`

```text
Process:
1. Patient fills Step 1: name, email, password, phone, DOB, gender
2. Patient fills Step 2: blood type, allergies, chronic conditions, medications
3. Frontend validates all fields
4. POST /api/auth/register with all data
5. Server checks email uniqueness
6. Server hashes password (bcrypt)
7. INSERT INTO users (role='patient')
8. INSERT INTO patient_profiles
9. INSERT INTO phr (initial health data)
10. Return JWT token → auto-login
```

#### Features

- 2-step wizard with progress indicator


- Thai/English bilingual form


- Client-side validation (email format, password strength)


- Server-side validation (email uniqueness)


- Auto-login after registration

---


### A2. Patient Login

**Pages:** `LoginPage.tsx`
**API:** `POST /api/auth/login`
**Tables:** `users`, `sessions`

```text
Process:
1. Patient enters email + password
2. POST /api/auth/login
3. Server SELECT user by email
4. Check account locked (login_attempts >= 5)
5. Verify password with bcrypt
6. If fail: INCREMENT login_attempts, check lockout
7. If success: RESET login_attempts
8. INSERT INTO sessions (token, ip, user_agent, expires_at)
9. UPDATE users SET last_login = NOW()
10. Return JWT + user profile
```

#### Features

- Email/password login


- Account lockout after 5 failures (15-min cooldown)


- Session tracking with IP + user-agent


- 3-hour session timeout


- "Forgot Password" link → email flow

---


### A3. Doctor/Admin Login

**Pages:** `LoginPage.tsx` (Doctor Portal)
**API:** `POST /api/auth/login`
**Tables:** `users`, `sessions`

```text
Process:
1. Same as patient login
2. Additional check: is_approved must be true
3. Additional check: approval_status = 'approved'
4. If not approved: return "Account pending approval" error
5. Role determines available features (doctor vs admin)
```

#### Features

- Same login flow as patient


- Approval gate (admin must approve first)


- Role-based redirect (doctor dashboard vs admin dashboard)

---


### A4. Password Reset

**Pages:** `ResetPasswordPage.tsx`
**API:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
**Tables:** `users`, `password_resets`

```text
Process:
1. User enters email on forgot-password form
2. POST /api/auth/forgot-password
3. Server generates secure token (crypto.randomBytes)
4. INSERT INTO password_resets (token, expires_at = +1 hour)
5. Send email via Gmail API with reset link
6. User clicks link → /reset-password?token=xxx
7. Frontend shows new password form
8. POST /api/auth/reset-password (token + new password)
9. Server validates token (not expired, not used)
10. UPDATE users SET password_hash = new hash
11. UPDATE password_resets SET used = true
```

---

#### B. Appointment Workflow

### B1. Patient Booking

**Pages:** `AppointmentPages.tsx` → Book Appointment
**API:** `POST /api/appointments`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Patient navigates to /book-appointment
2. Step 1: Select specialty category
3. Step 2: Optionally select specific doctor
4. Step 3: Describe symptoms (text + structured)
5. AI Triage: Gemini analyzes symptoms
   → Urgency level (1-10)
   → Recommended specialty
   → Suggested doctor match
6. Step 4: Choose date and time slot
7. Submit booking
8. INSERT INTO appointments (status: 'pending')
9. INSERT INTO notifications (admin/doctor)
10. pg_notify → Socket.IO broadcast
```

#### Features

- Multi-step booking wizard


- AI-assisted symptom analysis


- Doctor selection (optional — can be pool)


- Urgency triage


- Thai/English symptom input

---


### B2. Admin Appointment Assignment

**Pages:** `AdminAppointmentManagement.tsx`
**API:** `PUT /api/admin/appointments/:id/assign`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Admin views all pending appointments
2. Options:
   a. AI Auto-Assign: Gemini matches specialty → doctor
   b. Manual Assign: Admin picks doctor from dropdown
   c. Reject: Admin rejects with reason
3. UPDATE appointments SET doctor_id, status = 'confirmed'
4. Generate Jitsi room name and meeting links
5. INSERT notifications (patient: confirmed + link)
6. INSERT notifications (doctor: new patient assigned)
```

#### Features

- AI specialty-to-doctor matching


- Manual override


- Reject with reason


- Stats dashboard (pending/assigned/total)


- Tab-based filtering

---


### B3. Doctor Appointment Claim (Pool)

**Pages:** `AppointmentPoolManagement.tsx`
**API:** `PUT /api/appointments/:id/claim`
**Tables:** `appointments`, `notifications`

```text
Process:
1. Doctor views pool of unassigned appointments
2. Filter by matching specialty
3. Doctor clicks "Claim" on appointment
4. UPDATE appointments SET doctor_id = claiming doctor
5. Status: pending → doctor_claimed → confirmed
6. Generate meeting links
7. Notify patient of assignment
```

---


### B4. Appointment Status State Machine

```text
pending ──→ in_pool ──→ ai_matched ──→ doctor_claimed ──→ confirmed
   │                                                          │
   └──→ declined                                      in_progress
                                                          │
                                                      completed
                                                          │
                                                      (or cancelled at any stage)
```

---

#### C. Video Meeting Workflow

### C1. Doctor Opens Meeting Room

**Pages:** `HealthMeetingPage.tsx`, `VirtualMeeting.tsx` (modal)
**API:** `POST /api/meetings/create`
**Tables:** `meeting_records`

```text
Process:
1. Doctor clicks "Start Meeting" for a confirmed appointment
2. POST to Meeting Server (:3020) → create room
3. INSERT INTO meeting_records (status: 'waiting')
4. Generate URLs:
   - Doctor URL: full host controls
   - Patient URL: lobby entry
   - Guest URL: view-only link
5. Doctor sees Jitsi iframe embedded in modal
6. Doctor is HOST with full controls
```

---

### Health_Records_Processes.md

**ต้นฉบับ:** [`Processes/Health_Records_Processes.md`](../../Processes/Health_Records_Processes.md)

#### 5. Cross-Portal Data Sync

### 5.1 Sync Flow Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT PORTAL                                      │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ PHRPage.tsx │    │phrService.ts│    │Server Routes│                      │
│  │             │───>│             │───>│  /api/phr   │                      │
│  │ Add Vitals  │    │ addVitals() │    │             │                      │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                      │
│                                               │                              │
└───────────────────────────────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │          GCS BUCKETS            │
                              │                                 │
                              │  izara-patients-data/           │
                              │    patients/{patientId}/        │
                              │      ├── phr.json              │
                              │      ├── vital-signs.json      │
                              │      └── health-logs.json      │
                              │                                 │
                              └─────────────────┬───────────────┘
                                                │
┌───────────────────────────────────────────────┼──────────────────────────────┐
│                           DOCTOR PORTAL                                       │
│                                                │                              │
│  ┌─────────────────┐    ┌────────────────────┐│    ┌──────────────────────┐ │
│  │PatientRecord    │    │patientRecordService││    │  gcsDataService.ts   │ │
│  │   Viewer.tsx    │<───│    .getPHR()       │<────│ fetchPatientPHR()    │ │
│  │                 │    │                    ││    │ fetchPatientVitals() │ │
│  │ PHR Tab Display │    │ Data Transformation││    │                      │ │
│  └─────────────────┘    └────────────────────┘│    └──────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```


### 5.2 Data Consistency Guarantees

1. **Patient ID Association**: All records include `patientId` field
2. **Timestamp Tracking**: `measuredAt`, `createdAt`, `updatedAt` fields
3. **Source Tracking**: `source` field indicates data origin (patient_input, device, clinic)
4. **Version Control**: PHR records include `version` field for schema compatibility

---

#### 6. Workflow Steps

### 6.1 Patient Creates PHR Data

1. Patient logs in to Patient Portal with their credentials
2. Navigates to PHR page (`/phr`)
3. Adds vital signs, medications, or allergies
4. Data is validated and saved to PostgreSQL tables (`phr`, `vital_signs`)
5. Confirmation shown to patient


### 6.2 Patient Edits Lifestyle Data

1. Patient logs in to Patient Portal
2. Navigates to PHR page → "ข้อมูลส่วนตัว" (Profile) tab
3. Clicks "แก้ไข" (Edit) button in "ข้อมูลสุขภาพส่วนตัว" section
4. Fills in lifestyle information:
   - **การกินอาหาร** (Diet): regular/vegetarian/vegan/keto/low-carb/other
   - **การออกกำลังกาย** (Exercise): none/light/moderate/active
   - **การนอน** (Sleep): 5-9+ hours/night
   - **การสูบบุหรี่** (Smoking): never/former/current
   - **การดื่มแอลกอฮอล์** (Alcohol): never/occasional/moderate/frequent
   - **การใช้อาหารเสริม** (Supplements): free text
   - **การรักษาอื่นๆ** (Other treatments): free text
5. Clicks "บันทึก" (Save) button
6. Data saved to PostgreSQL `phr` table in lifestyle JSONB column
7. Doctor can immediately view updated data in PatientRecordViewer


### 6.3 Doctor Views Patient PHR

1. Doctor logs in to Doctor Portal with their credentials
2. Searches for patient or selects from appointment list
3. Opens Patient Record Viewer
4. Clicks PHR tab to view patient's self-entered data
5. PHR data is fetched from PostgreSQL and transformed for display
6. Doctor sees formatted vital signs, allergies, medications, lifestyle (including supplements and other treatments)


### 6.4 Doctor Creates and Signs EMR (Thai OPD Card Format)

1. Doctor opens patient record during/after appointment
2. Clicks "สร้าง EMR" (Create EMR) button
3. EMR editor opens with Thai OPD Card format:
   - **ประเภทการเข้าพบ** (Encounter type): Select from dropdown
   - **ประวัติ (S)** tab: Enter chief complaint, HPI, medications, allergies
   - **ตรวจร่างกาย (O)** tab: Enter vital signs, physical examination
   - **การวินิจฉัย (A)** tab: Add diagnosis with ICD-10 codes
   - **การรักษา (P)** tab: Enter treatment plan, prescriptions, follow-up instructions
   - **สรุป AI** tab: Review Gemini-generated summary
4. Doctor clicks "ลงนามและส่งให้ผู้ป่วย" (Sign and Send to Patient)
5. System:
   - Sets EMR status to `signed`
   - Generates AI summary if not already present
   - **Includes medications/prescriptions in health log entry**
   - POSTs EMR summary to patient's health-logs.json
6. Patient receives notification and can view AI summary in Treatment Results


### 6.5 Doctor Creates Prescription (E-Prescribing)

1. Doctor opens E-Prescribing (`CompletePrescribing.tsx`)
2. Searches for medications in drug database
3. System automatically checks:
   - Patient allergies
   - Drug-drug interactions
   - Contraindications
4. Doctor adds medications with:
   - Drug name and generic name
   - Dosage and frequency
   - Duration and quantity
   - Special instructions
5. Doctor saves prescription
6. System:
   - Saves prescription to `prescriptions.json`
   - **Sends prescription to patient's health-logs.json**
   - Type: `prescription`
7. Patient can view medications in Health Studio → ผลการรักษา (Treatment Results)


### 6.6 What Patient Sees (Health Log Entry)

When doctor signs EMR or creates prescription, patient receives:


#### Visible to Patient

| Field | Description |
| ------- | ------------- |
| `chiefComplaint` | Main reason for visit |
| `diagnosis` | Diagnosis descriptions (not ICD codes) |
| `treatmentPlan` | Treatment instructions |
| `medications` | Prescribed drugs with dosage, frequency, instructions |
| `aiSummary` | Patient-friendly AI-generated summary |
| `followUpDate` | Next appointment date |
| `followUpInstructions` | What to do before next visit |
| `signedBy` | Doctor who signed |
| `signedAt` | Signature timestamp |


#### NOT Visible to Patient

| Field | Reason |
| ------- | -------- |
| Internal comments | Doctor-to-doctor notes |
| Clinical assessment raw text | Too technical |
| Drug warnings marked "internal" | Not patient-relevant |
| ICD-10 codes | Technical medical codes |
| Doctor's private notes | Confidential |


### 6.7 EMR & PHR Integration (Legacy)

1. Doctor completes appointment
2. Doctor fills out EMR in `CompleteEMREditor.tsx`
3. EMR is signed and status set to `signed`
4. Summary section is pushed to patient's health-logs.json
5. Patient sees EMR summary in Health Studio / Treatment Results

---

#### 12. Testing PHR Data Sync

### Selenium Test: `phrDataSyncSeleniumTests.cjs`


#### Test Flow

1. Login as patient to Patient Portal
2. Navigate to PHR page
3. Add vital signs (BP: 120/80, HR: 72, Temp: 36.5°C)
4. Add medication (Test Medication, 500mg, twice daily)
5. Add allergy (Selenium Test Allergy)
6. Wait for GCS sync
7. Login as doctor to Doctor Portal
8. Search for patient and open record
9. Verify vital signs match patient-entered values
10. Verify medication appears in list

---

#### 13. PostgreSQL Database Architecture for Health Records

### Database Tables

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **phr** | Personal Health Records (aggregated) | id, patient_id, demographics (JSONB), vital_signs_history (JSONB), allergies (JSONB), chronic_conditions (JSONB), medications (JSONB), vaccinations (JSONB), lifestyle (JSONB), family_history (JSONB), blood_type, height_cm, weight_kg, bmi |
| **vital_signs** | Individual measurements | id (UUID), patient_id, blood_pressure_systolic/diastolic, heart_rate, temperature, respiratory_rate, oxygen_saturation, blood_glucose, weight, height, measured_at, source |
| **emr** | Electronic Medical Records (SOAP) | id, appointment_id, patient_id, doctor_id, subjective/objective/assessment/plan (JSONB), ai_summary, ai_summary_approved, patient_instructions, status (draft/signed), doctor_signature, signed_at |
| **prescriptions** | E-Prescribing | id, emr_id, appointment_id, patient_id, doctor_id, medications (JSONB), pharmacy_instructions, cds_warnings (JSONB), status |
| **lab_orders** | Laboratory test orders | id, emr_id, appointment_id, patient_id, doctor_id, tests (JSONB), priority, results (JSONB), ai_analysis, status |
| **ai_validations** | Man-in-the-Loop records | id, type, patient_id, doctor_id, decision, content_snapshot (JSONB), validated_at |
| **patient_instructions** | AI-generated instruction sheets | id, appointment_id, patient_id, doctor_id, content (JSONB), validation_status |
| **patient_consents** | PDPA consent management | id, patient_id, consent_type, granted, doctor_id, data_types (JSONB), status |


### PHR Data Flow (Patient → DB → Doctor)

```text
Patient Portal (port 3005)                     Doctor Portal (port 3010)
┌──────────────────────────┐                   ┌──────────────────────────┐
│ PHRPage.tsx              │                   │ PatientDetailPage.tsx     │
│ POST /api/phr            │                   │ GET /api/patients/:id/phr│
│ POST /api/vital-signs    │                   │ GET /api/emr/:patientId  │
└──────────┬───────────────┘                   └──────────┬───────────────┘
           │                                              │
           ▼                                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL - izara_phase1                          │
│                                                                      │
│  Patient writes PHR:                                                 │
│  UPDATE phr SET vital_signs_history = $1, allergies = $2,           │
│    chronic_conditions = $3, medications = $4                         │
│  WHERE patient_id = $5                                               │
│                                                                      │
│  Patient records vital signs:                                        │
│  INSERT INTO vital_signs (patient_id, blood_pressure_systolic,      │
│    blood_pressure_diastolic, heart_rate, temperature, measured_at)   │
│  VALUES ($1, $2, $3, $4, $5, NOW())                                 │
│                                                                      │
│  Doctor reads patient history:                                       │
│  SELECT * FROM phr WHERE patient_id = $1                            │
│  SELECT * FROM vital_signs WHERE patient_id = $1                    │
│    ORDER BY measured_at DESC                                         │
│  SELECT * FROM emr WHERE patient_id = $1                            │
│    ORDER BY created_at DESC                                          │
│                                                                      │
│  LISTEN/NOTIFY: phr changes trigger notify_phr_change               │
│  → Socket.IO emits phr:updated to doctor-room                       │
└──────────────────────────────────────────────────────────────────────┘
```


### EMR Creation Flow (Meeting → AI → Doctor Validation → DB)

```text
Meeting Server (port 3020)          Doctor Portal (port 3010)
┌─────────────────────┐            ┌──────────────────────────────┐
│ Transcript capture   │            │ Man-in-the-Loop Validation   │
│ → meeting_transcripts│            │ Doctor reviews AI-generated  │
│ → ai_summary via     │            │ SOAP EMR draft               │
│   Gemini 2.5 Flash   │            │                              │
└────────┬────────────┘            │ [✓ Approve] [✏️ Edit] [✗]   │
         │                         └──────────┬───────────────────┘
         ▼                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│  INSERT INTO emr (appointment_id, patient_id, doctor_id,        │
│    subjective, objective, assessment, plan, ai_summary,          │
│    ai_summary_approved, status)                                  │
│  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'signed')       │
│                                                                  │
│  INSERT INTO ai_validations (type='emr', patient_id, doctor_id, │
│    decision='approved', content_snapshot=$json)                   │
│                                                                  │
│  LISTEN/NOTIFY: emr INSERT triggers notify_emr_change            │
│  → Socket.IO emits emr:updated to patient-room & doctor-room    │
└──────────────────────────────────────────────────────────────────┘
```


### Prescription & Lab Order Data Flow

```text
Doctor creates prescription after EMR
┌──────────────────────────────────────────────────────────────────┐
│  INSERT INTO prescriptions (emr_id, appointment_id, patient_id, │
│    doctor_id, medications=$json, cds_warnings=$warnings)         │
│                                                                  │
│  CDS check performed:                                            │
│  SELECT contraindications FROM drugs WHERE generic_name = $1     │
│  → If interaction found: INSERT INTO cds_logs                    │
│  → WARNING displayed to doctor before prescribing             

… *(ตัด — ดูต้นฉบับ)*

---

### Notification_Workflows.md

**ต้นฉบับ:** [`Processes/Notification_Workflows.md`](../../Processes/Notification_Workflows.md)

#### 5. Email Templates (Thai)

### 5.1 การยืนยันนัดหมาย (Appointment Confirmed)

```text
Subject: ✅ นัดหมายได้รับการยืนยัน - [วันที่]

สวัสดีคุณ [ชื่อผู้ป่วย],

นัดหมายของคุณได้รับการยืนยันจาก [ชื่อแพทย์] แล้ว

📅 วันที่: [วันที่]
🕐 เวลา: [เวลา]
👨‍⚕️ แพทย์: [ชื่อแพทย์]
📍 รูปแบบ: [ออนไลน์/ที่โรงพยาบาล]

🔗 ลิงก์เข้าประชุม (สำหรับนัดหมายออนไลน์):
[MEETING_LINK]

💡 หมายเหตุ:

- คุณสามารถเข้าร่วมได้ 15 นาทีก่อนเวลานัด

- กรุณารอให้แพทย์เริ่มห้องประชุมก่อน

[➕ เพิ่มในปฏิทิน] [📋 ดูนัดหมาย]
```

### 5.2 การแจ้งเตือนลิงก์ประชุม (Meeting Link Ready)

```text
Subject: 🔗 ลิงก์ประชุมพร้อมแล้ว - นัดหมาย [วันที่]

สวัสดีคุณ [ชื่อผู้ป่วย],

ลิงก์สำหรับพบแพทย์ออนไลน์พร้อมแล้ว

📹 ลิงก์เข้าประชุม:
[MEETING_LINK]

⏰ วันที่นัดหมาย: [วันที่] เวลา [เวลา]
👨‍⚕️ พบแพทย์: [ชื่อแพทย์]

📱 วิธีเข้าร่วม:
1. คลิกลิงก์ด้านบน
2. อนุญาตการเข้าถึงกล้องและไมโครโฟน
3. กรอกชื่อของคุณ
4. รอแพทย์อนุมัติให้เข้าห้อง

หากมีข้อสงสัย กรุณาติดต่อ support@izara-telemedicine.com
```

---

#### 8. Error Handling

### 8.1 Notification Failures

```typescript
try {
  await notificationService.sendNotification(data);
} catch (error) {
  // Log error but don't fail the main operation
  console.error('Notification failed:', error);

  // Queue for retry
  await notificationQueue.add({
    ...data,
    retryCount: (data.retryCount || 0) + 1,
    lastError: error.message
  });
}
```

### 8.2 Meeting Link Fallback

```text
ถ้าสร้างลิงก์ไม่สำเร็จ:
1. แจ้งเตือน Admin
2. สร้างลิงก์ใหม่อัตโนมัติ
3. แจ้งผู้ป่วยเมื่อพร้อม
```

---

#### 11. Implementation Status (January 2025)

### 11.1 Completed Features

| Feature | Status | Notes |
| --------- | -------- | ------- |
| NotificationBell (Patient) | ✅ Done | Real-time in-app notifications |
| DoctorNotificationBell | ✅ Done | Fixed: uses real API, no mock data |
| Jitsi Meeting Links | ✅ Done | Format: meet.jit.si/izara-{id}-{ts} |
| Meeting Link on Confirm | ✅ Done | Auto-generated on confirmation |
| GCS Notification Storage | ✅ Done | Path: notifications/{role}/{id}/ |
| Notification API (Patient) | ✅ Done | Port 3004 |
| Notification API (Doctor) | ✅ Done | Port 3012 (GCS Server) |
| Email Templates | ✅ Done | Thai templates ready |
| E2E Test Coverage | ✅ Done | 100% pass rate |


### 11.2 Pending Enhancements

| Feature | Status | Priority |
| --------- | -------- | ---------- |
| Gmail API Integration | 🔄 Planned | High |
| SMS Notifications | 📋 Future | Medium |
| WebSocket Real-time | 📋 Future | Medium |
| Line Official Account | 📋 Future | Low |
| Push Notifications | 📋 Future | Low |


### 11.3 Recent Changes (January 2025)

1. **DoctorNotificationBell.tsx** - Removed mock data fallback, now uses real API only
2. **Notification API** - Verified working on ports 3004 (patient) and 3012 (doctor)
3. **Jitsi Integration** - Meeting links successfully generated and accessible
4. **E2E Tests** - All test suites passing with 100% rate

---

#### 12. Future Enhancements

1. **WebSocket Real-time** - แจ้งเตือนแบบ Real-time ไม่ต้อง Poll
2. **SMS Integration** - แจ้งเตือนทาง SMS สำหรับนัดหมายสำคัญ
3. **Line Notification** - เชื่อมต่อ Line Official Account
4. **Notification Analytics** - วิเคราะห์การเปิดอ่าน/คลิก
5. **Smart Scheduling** - แจ้งเตือนตามพฤติกรรมผู้ใช้

---

---

### User_management_Workflows.md

**ต้นฉบับ:** [`Processes/User_management_Workflows.md`](../../Processes/User_management_Workflows.md)

#### 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [User Workflows](#4-user-workflows)
5. [Security Features](#5-security-features)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Test Accounts](#7-test-accounts)
8. [Frontend Components](#8-frontend-components)
9. [Error Codes](#9-error-codes)

---

---

### Data_Sync_Documentation.md

**ต้นฉบับ:** [`Processes/Data_Sync_Documentation.md`](../../Processes/Data_Sync_Documentation.md)

*ดูขั้นตอนเต็มในไฟล์ต้นฉบับ — เอกสารนี้ยาวเกินกว่าจะคัดลอกทั้งหมดอัตโนมัติ*

---

### PostgreSQL_Database_Architecture.md

**ต้นฉบับ:** [`Processes/PostgreSQL_Database_Architecture.md`](../../Processes/PostgreSQL_Database_Architecture.md)

#### 📋 Table of Contents

1. [Database Overview](#1-database-overview)
2. [Extensions & Configuration](#2-extensions--configuration)
3. [Deployment Architecture](#3-deployment-architecture)
4. [Complete Table Schema](#4-complete-table-schema)
5. [Entity-Relationship Diagram](#5-entity-relationship-diagram)
6. [Data Flow Patterns](#6-data-flow-patterns)
7. [LISTEN/NOTIFY Real-Time Triggers](#7-listennotify-real-time-triggers)
8. [Indexes & Performance](#8-indexes--performance)
9. [Migration Scripts](#9-migration-scripts)
10. [Access Control Matrix](#10-access-control-matrix)
11. [Backup & Recovery](#11-backup--recovery)

---

---

### Living_Will_Processes.md

**ต้นฉบับ:** [`Processes/Living_Will_Processes.md`](../../Processes/Living_Will_Processes.md)

#### 2. User Roles & Access Matrix

| Role | Create | View | Update | Delete | Share Settings |
| ---------------- | -------- | ------ | -------- | -------- | ---------------- |
| Patient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Doctor | ❌ | ✅* | ❌ | ❌ | ❌ |
| Admin (Doctor) | ❌ | ✅* | ❌ | ❌ | ❌ |


### ✅* = Only if patient has shared Living Will (PDPA consent granted)


### Doctor/Admin Access Rules

1. **If `isSharedWithDoctors: true`** → All doctors AND admins with ANY history/logs with the patient can view
2. **If `isSharedWithDoctors: false`** → Living Will is hidden (private)
3. Access is logged for audit compliance

---

#### 4. Patient Portal Workflow

### 4.1. Page & Navigation


- **Page:** `src/pages/health/PHRPage.tsx`


- **Tab:** "Living Will" / "พินัยกรรมชีวิต"


- **Component:** `src/components/health/LivingWillForm.tsx`


### 4.2. Step-by-Step Process


#### Step 1: Access Living Will Tab

1. Patient logs into Patient Portal
2. Navigates to **Health Studio** → **PHR** → **Living Will** tab
3. If no Living Will exists, shows "Create Living Will" button
4. If Living Will exists, shows current document with Edit/Revoke options


#### Step 2: Create/Edit Living Will

1. Patient clicks "Create Living Will" or "Edit"
2. Form displays with sections:
   - **Statement of Wishes** (free text)
   - **Treatment Preferences** (checkboxes with notes)
   - **Legal Representative** (contact details)
   - **Alternative Representative** (optional)


#### Step 3: PDPA Consent & Sharing Settings

1. Patient must accept PDPA consent checkbox
2. Patient chooses sharing preference:
   - **🔒 Keep Private** - Only patient can view
   - **🌐 Share with Doctors** - All authorized doctors & admins can view
3. System explains: "If you share, ALL doctors who have treated you and hospital administrators will be able to see your Living Will"


#### Step 4: Digital Signature

1. Patient signs digitally (canvas signature)
2. Optional: Witness signature
3. System records timestamp and IP


#### Step 5: Save & Confirm

1. Patient reviews summary
2. Clicks "Save Living Will"
3. System stores to GCS: `patients/{patientId}/living-will.json`
4. Confirmation message with share status displayed


### 4.3. UI Mockup (Patient Portal)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  📋 PHR  │  💊 Medications  │  🩺 Vitals  │  📜 Living Will          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📜 พินัยกรรมชีวิต (Living Will)                                     │
│  ─────────────────────────────────────────────────                   │
│                                                                      │
│  Status: ● ACTIVE                    Effective: 12/12/2025           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ คำแถลงความประสงค์:                                              │ │
│  │ ข้าพเจ้าประสงค์ที่จะไม่รับการรักษาที่ยืดชีวิต...                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  การรักษาที่ไม่ประสงค์:                                              │
│  ❌ CPR / การกู้ชีพ                                                  │
│  ❌ เครื่องช่วยหายใจ                                                 │
│  ❌ ให้อาหารทางสาย                                                   │
│  ❌ ฟอกไต                                                           │
│  ✅ ยาปฏิชีวนะ (เพื่อความสบาย)                                       │
│  ✅ การจัดการความเจ็บปวด                                             │
│                                                                      │
│  ผู้แทนทางกฎหมาย: นางสาวสมหญิง ใจดี (คู่สมรส)                         │
│  โทร: 081-234-5678                                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 🔐 PDPA Sharing Settings                                        │ │
│  │                                                                 │ │
│  │ ◉ Share with Doctors - แพทย์และผู้ดูแลระบบสามารถดูได้           │ │
│  │ ○ Keep Private - เฉพาะคุณเท่านั้นที่เห็น                        │ │
│  │                                                                 │ │
│  │ ℹ️ หากแชร์ แพทย์ทุกคนที่เคยรักษาคุณและผู้ดูแลระบบจะเห็น          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [✏️ Edit]  [🗑️ Revoke]  [📤 Share Settings]                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

#### 11. Component Implementation Details

### 11.1. Patient Portal Components

**`Isara-patient-portal/src/components/health/LivingWillForm.tsx`** — Key sections:
1. Statement of wishes (textarea)
2. Treatment preferences (checkboxes with notes)
3. Representative information (form fields)
4. PDPA consent and sharing toggle
5. Digital signature canvas
6. Save/Cancel buttons

**`Isara-patient-portal/src/components/health/LivingWillView.tsx`** — Display existing Living Will with:


- Status badge (Active/Revoked)


- Statement display


- Treatment preferences list


- Representative contact


- Share settings status


- Edit/Revoke buttons

**`Isara-patient-portal/src/pages/health/PHRPage.tsx`** — Tab integration:

```tsx
<Tab id="living-will" label="พินัยกรรมชีวิต">
  <LivingWillTab patientId={patientId} />
</Tab>
```

**`Isara-patient-portal/server/routes/phr.ts`** — API route stubs:

```typescript
// GET /api/phr/:patientId/living-will
// POST /api/phr/:patientId/living-will
// PUT /api/phr/:patientId/living-will
// PUT /api/phr/:patientId/living-will/share
// DELETE /api/phr/:patientId/living-will
```

---


### 11.2. Doctor Portal Components

**`Isara-doctor-portal/src/services/patientRecordService.ts`** — Service methods:

```typescript
async getLivingWill(patientId: string): Promise<LivingWillForDoctor>
async checkLivingWillAccess(patientId: string, doctorId: string): Promise<boolean>
```

**`Isara-doctor-portal/src/components/PatientRecordViewer.tsx`** — Living Will at top of PHR tab:

```tsx
const PHRView = ({ phrData, patient }) => {
  const [livingWill, setLivingWill] = useState<LivingWillForDoctor | null>(null);

  useEffect(() => {
    loadLivingWill(patient.id);
  }, [patient.id]);

  return (
    <>
      {/* Living Will - FIRST SECTION */}
      <LivingWillCard livingWill={livingWill} />

      {/* Existing PHR sections... */}
      <PatientDemographicsCard />
      <MedicalHistoryCard />
    </>
  );
};
```

**`Isara-doctor-portal/server/mainApiServer.cjs`** — Doctor API endpoint:

```javascript
// GET /api/patients/:patientId/living-will
app.get('/api/patients/:patientId/living-will', authMiddleware, async (req, res) => {
  const { patientId } = req.params;
  const doctorId = req.user.id;

  const hasAccess = await checkDoctorAccess(doctorId, patientId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this patient' });
  }

  const livingWill = await loadLivingWill(patientId);

  if (!livingWill) {
    return res.json({ exists: false, isShared: false });
  }

  if (!livingWill.pdpaConsent.isSharedWithDoctors) {
    return res.json({ exists: true, isShared: false });
  }

  await logLivingWillAccess(patientId, doctorId);

  return res.json({
    exists: true,
    isShared: true,
    status: livingWill.status,
    effectiveDate: livingWill.effectiveDate,
    statement: livingWill.statement,
    treatments: livingWill.treatments,
    representative: livingWill.representative,
    signedAt: livingWill.signature?.signedAt
  });
});
```

---

#### 12. Testing Plan

### 12.1. Unit Tests

| Test Case | Expected Result |
| ----------- | ----------------- |
| Create Living Will | Success, saved to PostgreSQL |
| Update Living Will | Success, version incremented |
| Revoke Living Will | Status changed to revoked |
| Share Living Will | `isSharedWithDoctors = true` |
| Unshare Living Will | `isSharedWithDoctors = false` |
| Doctor access (shared) | Returns full Living Will |
| Doctor access (not shared) | Returns `{ exists: true, isShared: false }` |
| Doctor access (no history) | Returns 403 error |
| Admin access (shared) | Returns full Living Will |


### 12.2. E2E Tests

**File:** `scripts/tests/e2e/livingWillTests.cjs`

Scenarios:
1. Patient creates Living Will with sharing enabled
2. Patient updates Living Will
3. Patient revokes sharing
4. Doctor views shared Living Will
5. Doctor cannot view unshared Living Will
6. Admin views shared Living Will

---

---

### Medicine_Content_Processes.md

**ต้นฉบับ:** [`Processes/Medicine_Content_Processes.md`](../../Processes/Medicine_Content_Processes.md)

#### 📋 Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Workflow Steps](#4-workflow-steps)
5. [Data Structures](#5-data-structures)
6. [GCS Storage Structure](#6-gcs-storage-structure)
7. [Cross-Portal Data Synchronization](#7-cross-portal-data-synchronization)
8. [API Endpoints](#8-api-endpoints)
9. [Content Categories](#9-content-categories)
10. [Implementation Guidelines](#10-implementation-guidelines)
11. [Patient Portal Access](#11-patient-portal-access)
12. [Developer Notes](#12-developer-notes)
13. [Future Enhancements](#13-future-enhancements)

---

#### 12. Developer Notes

### Critical Implementation Notes

1. **Authentication Required**: All write operations must verify user authentication and role
2. **GCS Path Convention**: Use consistent paths `izara-meta-data/{content-type}/{file}.json`
3. **Audit Logging**: Log ALL status changes for compliance
4. **Version Control**: Always save previous version to history before updates
5. **Thai Language**: All content should support bilingual fields (`title`, `titleTh`)


### File Locations

```text
Doctor Portal:
├── src/pages/MedicalContent.tsx          # Medical content management
├── src/pages/ClinicalResources.tsx       # Clinical resources with approval
├── src/types/contentTypes.ts             # Type definitions
└── src/services/contentService.ts        # API service layer

Patient Portal:
├── src/pages/health/MedicalContentLibrary.tsx  # Read-only library
├── src/components/health/MedicalContent.tsx    # Content display component
└── src/lib/services.ts                         # API calls

Backend:
└── server/gcsApiServer.cjs               # GCS API handling
```


### UI Components (MedicalContent.tsx)

The following UI components have been implemented to support the approval workflow:

1. **Status Options** (line ~78)

    ```tsx
    const statusOptions = [
      { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
      { value: 'pending', label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
      { value: 'published', label: 'Published', color: 'bg-green-100 text-green-700' },
      { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
      { value: 'archived', label: 'Archived', color: 'bg-gray-200 text-gray-600' },
    ];
    ```

1. **Admin Detection** (line ~93)

    ```tsx
    const isAdmin = user?.email?.includes('admin') || user?.role === 'admin';
    ```

1. **Pending Approvals Button** (Header - visible to Admin only when pendingCount > 0)
   - Shows notification badge with count
   - Opens pending list modal on click

1. **Submit for Approval Button** (View Modal)
   - Visible for draft/rejected articles
   - Calls `handleSubmitForApproval()` to change status to 'pending'

1. **Review Button** (View Modal)
   - Visible to Admin only for pending articles
   - Opens approval modal

1. **Approval Modal** (Admin only)
   - Preview of article content
   - Approval comment field
   - Reject with reason field
   - Approve/Reject action buttons

1. **Pending List Modal** (Admin only)
   - Lists all pending articles
   - Quick access to review each article


### Key Functions

```tsx
// Submit content for approval (Doctor)
handleSubmitForApproval(article: MedicalContentArticle): Promise<void>

// Approve or reject content (Admin)
handleApprovalAction(action: 'approve' | 'reject'): Promise<void>

// Fetch pending approvals count
fetchPendingApprovals(): Promise<void>

// Open approval modal with specific article
openApprovalModal(article: MedicalContentArticle): void
```


### Testing Checklist


- [ ] Doctor can create draft content


- [ ] Doctor can submit content for approval


- [ ] Admin sees pending approvals


- [ ] Admin can approve/reject with feedback


- [ ] Published content appears in Patient Portal


- [ ] Rejected content returns to draft with feedback


- [ ] Audit log captures all actions


- [ ] Version history preserved on updates

---

#### 13. Future Enhancements

### Planned Features

1. **Rich Text Editor** (WYSIWYG)
   - Replace Markdown with visual editor
   - Inline image upload
   - Table support

2. **Real-time Notifications**
   - Push notifications for approval status
   - Email alerts for content submissions
   - In-app notification center

3. **Analytics Dashboard**
   - Content engagement metrics
   - Author performance tracking
   - Category popularity trends

4. **AI-Assisted Content**
   - Content suggestions
   - Auto-translation Thai ↔ English
   - Quality scoring

5. **Scheduled Publishing**
   - Set future publish date
   - Auto-archive after expiry

6. **Content Templates**
   - Pre-defined article structures
   - Category-specific templates

---

---

### Medical_Consultants_Workflows.md

**ต้นฉบับ:** [`Processes/Medical_Consultants_Workflows.md`](../../Processes/Medical_Consultants_Workflows.md)

#### Correlation with Admin Users

1. **Audit Trail**: All changes tracked with `createdBy`, `updatedBy` fields
2. **Admin Notes**: Private notes visible only to admin users
3. **Review System**: Doctor reviews visible to all, aggregated into rating
4. **Availability Control**: Only admins can toggle consultant availability

---

---

### Clinical_Resources_&_Medical_Library_Workflows.md

**ต้นฉบับ:** [`Processes/Clinical_Resources_&_Medical_Library_Workflows.md`](../../Processes/Clinical_Resources_&_Medical_Library_Workflows.md)

#### PostgreSQL Database Architecture

### Database Tables for Clinical Resources

| Table | Purpose | Key Columns |
| ----- | ------- | ----------- |
| **clinical_resources** | Main content storage | id, title_thai, title_english, content_thai, content_english, category, specialty, guideline_year, source, tags (JSONB), status (pending/approved), image_url, author_id, author_name, approved_by, approved_at |
| **knowledge_base** | RAG-indexed content for AI search | id, title, content, source, category, guideline_year, language, embedding (vector), is_active |
| **ai_chat_history** | Doctor AI queries about clinical resources | user_id, session_id, role, content, context (JSONB), embedding (vector) |
| **audit_logs** | All create/update/approve/reject actions | user_id, action, entity_type='clinical_resource', entity_id, details (JSONB) |
| **users** | Author and reviewer identity | id, name, name_thai, role (doctor/admin) |


### Data Flow: Create → Approve → AI Index

```text
Doctor creates resource
  → INSERT INTO clinical_resources (status='draft' or 'pending')
  → INSERT INTO audit_logs (action='create')

Admin reviews resource
  → UPDATE clinical_resources SET status='approved', approved_by=$1, approved_at=NOW()
  → INSERT INTO audit_logs (action='approve')

Published content indexed for AI
  → INSERT INTO knowledge_base (title, content, embedding=vector_from_gemini)
  → AI Chat can now reference this resource via vector similarity search

Doctor queries AI about clinical guideline
  → SELECT FROM knowledge_base WHERE is_active=true ORDER BY embedding <-> $query LIMIT 5
  → INSERT INTO ai_chat_history (role='user', content=$query)
  → Gemini generates response with knowledge_base context
  → INSERT INTO ai_chat_history (role='assistant', content=$response)
```

### Cross-Service Data Flow

```text
┌──────────────────────────────────────────────────────────────────┐
│                 CLINICAL RESOURCES DATA FLOW                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DOCTOR PORTAL (port 3010)                                        │
│  ├── POST /api/content/clinical → INSERT clinical_resources       │
│  ├── PUT /api/content/clinical/:id → UPDATE clinical_resources    │
│  ├── POST /api/content/clinical/:id/review → UPDATE status        │
│  ├── POST /api/ai/chat → query knowledge_base via embeddings     │
│  └── Approval triggers: INSERT knowledge_base (AI indexing)       │
│                                                                   │
│  PATIENT PORTAL (port 3005)                                       │
│  ├── GET /api/content/clinical-resources → SELECT published only  │
│  └── Read-only access to approved clinical content                │
│                                                                   │
│  MEETING SERVER (port 3020)                                       │
│  ├── POST /api/ai/cds-check → queries knowledge_base for CDS     │
│  └── Clinical resources inform AI recommendations during meeting  │
│                                                                   │
│  ALL → PostgreSQL izara_phase1                                    │
│  ├── Local: izara-postgres:5432 (Docker)                          │
│  └── Cloud: 35.240.157.230:5432 (GCE VM)                         │
└──────────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

| Environment | Service | URL | Database |
| ----------- | ------- | --- | -------- |
| Local Docker | Doctor Portal | localhost:3010 | izara-postgres:5432 |
| Local Docker | Patient Portal | localhost:3005 | izara-postgres:5432 |
| Production | Doctor Portal | Cloud Run (asia-southeast1) | 35.240.157.230:5432 |
| Production | Patient Portal | Cloud Run (asia-southeast1) | 35.240.157.230:5432 |


### pgvector Integration for RAG

Clinical resources are embedded into vectors using Google Gemini for semantic search:

```sql
-- Insert resource with vector embedding
INSERT INTO knowledge_base (title, content, source, category, guideline_year, language, embedding, is_active)
VALUES ($1, $2, 'clinical_resource', $3, $4, 'th', $5::vector, true);

-- AI search by semantic similarity
SELECT title, content, source, category
FROM knowledge_base
WHERE is_active = true AND category = $1
ORDER BY embedding <-> $2::vector
LIMIT 5;
```

### Scenario Coverage

| # | Scenario | Actor | Status Flow | DB Tables |
| - | -------- | ----- | ----------- | --------- |
| 1 | Create draft | Doctor | → draft | clinical_resources, audit_logs |
| 2 | Submit for approval | Doctor | draft → pending | clinical_resources, audit_logs |
| 3 | Admin approves | Admin | pending → approved | clinical_resources, knowledge_base, audit_logs |
| 4 | Admin rejects | Admin | pending → rejected | clinical_resources, audit_logs |
| 5 | Edit published | Doctor | approved → pending | clinical_resources, audit_logs |
| 6 | AI chat queries resource | Doctor | — (read) | knowledge_base, ai_chat_history |
| 7 | Patient views resource | Patient | — (read) | clinical_resources |
| 8 | CDS references guideline | Meeting Server | — (read) | knowledge_base |
| 9 | Delete resource | Doctor (owner) | any → deleted | clinical_resources, knowledge_base, audit_logs |


### 7. Filter and Search

```text
1. Use search bar for keyword search
2. Filter by status dropdown
3. Filter by category tabs
4. Toggle "My Content" to see own resources only
```

#### Correlation with Admin Users

1. **Approval Workflow**: Admins see pending badge, review content
2. **Feedback System**: Admin comments visible to content creator
3. **Audit Trail**: All changes tracked with user info
4. **Status Control**: Only admin approval changes pending → published
5. **Re-approval**: Published content changes require re-approval

#### Best Practices

1. **Bilingual Support**: Always provide both English and Thai content when possible
2. **References**: Include credible sources for clinical guidelines
3. **Version Notes**: Add meaningful change notes when editing
4. **Tags**: Use existing tags before creating new ones
5. **Categories**: Choose most appropriate category for discoverability

---

### System_Architecture_Overview.md

**ต้นฉบับ:** [`Processes/System_Architecture_Overview.md`](../../Processes/System_Architecture_Overview.md)

#### 📋 Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Three-Portal Architecture](#3-three-portal-architecture)
4. [Network Architecture](#4-network-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Database Architecture](#7-database-architecture)
8. [AI Integration Architecture](#8-ai-integration-architecture)
9. [Real-Time Communication](#9-real-time-communication)
10. [Security Architecture](#10-security-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Directory Structure](#12-directory-structure)

---

---

### PHASE1_REQUIREMENTS.md

**ต้นฉบับ:** [`Processes/PHASE1_REQUIREMENTS.md`](../../Processes/PHASE1_REQUIREMENTS.md)

#### 3️⃣ Feature Specifications

### 3.1 Video Meeting + EMR Documentation (DR-01) — Core Phase 1 Deliverable

**Current Status:** ✅ Implemented


#### Components


- Jitsi Meet integration (doctor as HOST/moderator)


- EMR Editor with SOAP format (Thai OPD Card standard)


- Patient lobby system (all participants wait for HOST)


- Guest invite system (relatives, friends, specialists, admin)


- **Web Speech API** for real-time transcript streaming (FREE)


- **Chat integration** — all messages captured for AI processing


- **Gemini AI** for post-meeting SOAP summary, CDS, patient instructions


- **Man-in-the-Loop** — doctor validates before patient receives data


#### Participant Types

| Participant | Invited By | Login Required | Enters Lobby |
| ----------- | ---------- | -------------- | ------------ |
| Doctor (HOST) | System | Yes (Doctor Portal) | No (is HOST) |
| Patient | System | Yes (Patient Portal) | Yes → Doctor admits |
| Patient Relatives/Friends | Patient | No → create display name | Yes → Doctor admits |
| Other Doctors/Admin | Doctor | Yes (Doctor Portal) | Yes → Doctor admits |
| External Guests | Patient/Doctor | No → create display name | Yes → Doctor admits |


#### Full Workflow (Microsoft Teams-Like)

```text
PHASE 1: BOOKING
  Patient books appointment → AI analyzes → Doctor confirms → Jitsi URLs

PHASE 2: PRE-MEETING
  Patient invites relatives → Doctor invites colleagues
  AI generates pre-consultation summary (Req 2.2)

PHASE 3: MEETING (Doctor as HOST)
  Doctor starts meeting → Patient enters LOBBY → Doctor admits
  Guests create name from blank → LOBBY → Doctor admits/rejects
  Doctor starts TRANSCRIPT STREAMING (Web Speech API, FREE)
  All participants use VIDEO + AUDIO + TEXT CHAT
  Doctor controls: lobby, transcript start/pause/stop, recording
  Chat messages captured with timestamps and sender names

PHASE 4: POST-MEETING AI PIPELINE
  AI processes: transcript + chat messages + video metadata + patient PHR
  Output: SOAP summary + CDS + Patient Instruction Sheet
  30-minute sections for long meetings
  All outputs: requiresValidation = true

PHASE 5: DOCTOR REVIEW (Man-in-the-Loop)
  Summary on Health Meeting page → Doctor validates
  EMR Editor pre-filled with SOAP data → Doctor signs
  Patient Instruction Sheet generated → Doctor approves

PHASE 6: PATIENT DELIVERY
  EMR + Instruction Sheet → Patient Portal
  Patient views: Dashboard → Timeline → Health History
  Patient downloads: Instruction Sheet PDF
  Appointment status → completed
```


### 3.2 AI Chat Assistant (DR-02, PB-03)

**Current Status:** ✅ Complete

**Purpose:** AI assistant to help doctors with clinical tasks.


#### Features

| Feature | Description |
| --------- | ------------- |
| Patient History Summary | Summarize EMR, PHR, past consultations |
| Medication Information | Drug interactions, dosing, contraindications |
| Guideline Reference | Quick access to clinical guidelines |
| Document Q&A | Answer questions about uploaded documents |
| Knowledge Base | RAG-based medical knowledge |


#### Technical Implementation

```text
┌─────────────────────────────────────────────────────────┐
│                    AI CHAT SYSTEM                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Knowledge   │  │ System      │  │ Chat        │     │
│  │ Base        │  │ Prompt      │  │ History     │     │
│  │ (RAG)       │  │ (Clinical)  │  │ (Context)   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│                  ┌───────────────┐                      │
│                  │  Gemini 2.5   │                      │
│                  │  Flash        │                      │
│                  └───────────────┘                      │
│                          │                              │
│                          ▼                              │
│                  ┌───────────────┐                      │
│                  │  Response     │                      │
│                  │  to Doctor    │                      │
│                  └───────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```


#### Database Tables


- `knowledge_base` - RAG entries (guidelines, protocols)


- `ai_chat_history` - Conversation history per doctor


- `cds_logs` - Clinical decision support logs


### 3.3 Man-in-the-Loop Validation (DR-05)

**Current Status:** ✅ Complete

**Purpose:** All AI-generated content requires doctor approval before reaching patients.


#### Content Types Requiring Validation

| Content Type | Source | Destination |
| -------------- | -------- | ------------- |
| EMR Summary | AI + Meeting | Patient record |
| Patient Instruction | AI + EMR | Patient portal |
| Lab Analysis | AI + Document | Patient record |
| Medication Recommendations | CDS | Prescription |


#### UI Pattern

```text
┌──────────────────────────────────────────────────────────┐
│  📄 AI-Generated Content                   🟡 รอตรวจสอบ  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [AI-generated content displayed here]                   │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  [✏️ แก้ไข]  [✅ อนุมัติ]  [❌ ปฏิเสธ พร้อมเหตุผล]        │
│                                                          │
└──────────────────────────────────────────────────────────┘

Status Flow:
🟡 รอตรวจสอบ (Pending) → Doctor reviews
🟢 อนุมัติแล้ว (Approved) → Sent to patient
🔴 ปฏิเสธ (Rejected) → Not

… *(ตัด — ดูต้นฉบับ)*

---

### PHASE1_BASELINE_WORKFLOW_CONTRACT.md

**ต้นฉบับ:** [`Processes/PHASE1_BASELINE_WORKFLOW_CONTRACT.md`](../../Processes/PHASE1_BASELINE_WORKFLOW_CONTRACT.md)

#### Must-Pass Workflow Contract

1. **Auth + access control**
   - Patient/doctor/admin login succeeds with JWT and role-scoped route access.
   - Doctor/admin pages are protected from patient tokens and vice versa.

2. **Appointment lifecycle**
   - Booking creates `pending` (doctor selected) or `in_pool` (system assigned).
   - Admin can assign pool requests to doctor -> `awaiting_doctor_response`.
   - Assigned doctor confirms -> `confirmed` with generated meeting URLs.
   - Decline and cancel flows set terminal statuses and trigger notifications.

3. **Meeting role and lobby contract**
   - Assigned doctor is HOST/moderator for confirmed appointment meeting.
   - Patient and guests join lobby and require host admission.
   - Guest join (including non-registered) requires token/display-name path and host approval.

4. **Realtime sync contract**
   - Appointment updates propagate to doctor/admin/patient rooms without manual refresh.
   - Queue/pool/dashboard updates arrive from DB-triggered events (not file polling).

5. **Post-meeting clinical contract**
   - Meeting transcript/chat can be persisted and used for AI summary generation.
   - AI output requires doctor validation (approve/edit/reject) before patient delivery.
   - Signed EMR/instruction output is visible to patient history flows.

---

### GATE0_IMPLEMENTATION_STATUS.md

**ต้นฉบับ:** [`Processes/GATE0_IMPLEMENTATION_STATUS.md`](../../Processes/GATE0_IMPLEMENTATION_STATUS.md)

*ดูขั้นตอนเต็มในไฟล์ต้นฉบับ — เอกสารนี้ยาวเกินกว่าจะคัดลอกทั้งหมดอัตโนมัติ*

---

### ENV_AND_STACK_CHECK.md

**ต้นฉบับ:** [`Processes/ENV_AND_STACK_CHECK.md`](../../Processes/ENV_AND_STACK_CHECK.md)

*ดูขั้นตอนเต็มในไฟล์ต้นฉบับ — เอกสารนี้ยาวเกินกว่าจะคัดลอกทั้งหมดอัตโนมัติ*

---

### UI_Pages_Workflows.md

**ต้นฉบับ:** [`Processes/UI_Pages_Workflows.md`](../../Processes/UI_Pages_Workflows.md)

#### 1. แดชบอร์ด (Dashboard)

**Route:** `/dashboard`
**Access:** Doctor, Admin
**Component:** `DoctorDashboard.tsx`


### Purpose

Central hub displaying today's appointments, pending tasks, notifications, and quick access to AI assistance.


### UI Layout

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🏥 Izara Doctor Portal                    🔔(3)  👤 Dr. Test  ⚙️      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  สวัสดี, นพ. ทดสอบ ระบบ                              วันอังคารที่ 21 ม.ค. │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  📅 นัดหมายวันนี้  │  │  ⏳ รอดำเนินการ  │  │  ✅ เสร็จสิ้นแล้ว │          │
│  │       5         │  │       2         │  │       12        │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📋 นัดหมายถัดไป                                                   │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  🟢 09:00  นายสมชาย มั่นคง - เบาหวาน Follow-up                    │   │
│  │           [ดูประวัติ] [AI สรุปก่อนพบ] [เริ่มประชุม]                  │   │
│  │                                                                    │   │
│  │  🟡 10:30  นายอนันต์ ขยันเรียน - เบาหวาน + CKD                     │   │
│  │           [ดูประวัติ] [AI สรุปก่อนพบ] [เริ่มประชุม]                  │   │
│  │           ⚠️ CDS Alert: ปรับยา Metformin สำหรับ eGFR 38           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  🤖 AI Assistant            │  │  📄 เอกสารรอตรวจสอบ              │   │
│  │  ─────────────────────────  │  │  ─────────────────────────────  │   │
│  │  💬 "มีอะไรให้ช่วยครับ?"     │  │  • EMR สรุป AI (2)              │   │
│  │  [เริ่มสนทนา]               │  │  • คำแนะนำผู้ป่วย (1)            │   │
│  │                             │  │  • ผลวิเคราะห์เอกสาร (3)         │   │
│  │  📊 วิเคราะห์เอกสาร         │  │  [ดูทั้งหมด]                     │   │
│  │  [อัปโหลด PDF/Lab]          │  │                                  │   │
│  └─────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```


### Actions & Buttons

| Button | Action | Backend API |
| -------- | -------- | ------------- |
| **ดูประวัติ** (View History) | Opens patient record viewer modal | `GET /api/patients/:id` |
| **AI สรุปก่อนพบ** (AI Pre-Summary) | Generates AI pre-consultation summary | `POST /api/ai/pre-consultation-summary` |
| **เริ่มประชุม** (Start Meeting) | Opens Jitsi meeting as HOST | `POST /api/meetings/start` |
| **เริ่มสนทนา** (Start Chat) | Opens AI Chat Assistant panel | Opens sidebar |
| **อัปโหลด PDF/Lab** | Opens document upload modal | `POST /api/ai/analyze-document` |
| **ดูทั้งหมด** (View All) | Navigate to pending validations | `/validations` |


### Workflows


#### WF-DASH-001: View AI Pre-Consultation Summary

```text
1. Doctor clicks [AI สรุปก่อนพบ] on appointment card
2. System fetches patient EMR history, PHR, past Q&A
3. AI generates summary with key points
4. Modal displays:
   - Patient demographics
   - Current medications & allergies
   - Recent vital signs
   - Past consultations summary
   - AI-identified concerns/alerts
5. Doctor reviews and closes modal or proceeds to meeting
```


#### WF-DASH-002: CDS Alert Interaction

```text
1. Appointment card shows ⚠️ CDS Alert badge
2. Doctor clicks alert to expand
3. System shows:
   - Alert type (dose adjustment, drug interaction, etc.)
   - Current prescription vs recommended
   - Guideline reference (e.g., KDIGO 2024)
   - Evidence level
4. Actions: [Accept] [Modify] [Reject with reason]
5. Decision logged to cds_logs table
```

---

#### 4. นัดหมาย & ประชุม (Appointments & Meetings)

**Route:** `/appointments`
**Access:** Doctor, Admin
**Component:** `AppointmentManagement.tsx`, `MeetingRoom.tsx`


### Purpose (4)

Manage appointment queue, conduct video meetings, document EMR, and generate patient instructions.


### UI Layout - Meeting Room

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  🎥 ห้องประชุม - นายสมชาย มั่นคง                    🔴 REC  [ออกจากห้อง]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────┐  │
│  │                                     │  │  📋 EMR Editor (SOAP)    │  │
│  │                                     │  │  ─────────────────────── │  │
│  │         🎥 VIDEO FEED               │  │  [S] ประวัติ (Subjective)│  │
│  │         Jitsi Meet                  │  │  CC: เบาหวาน follow-up   │  │
│  │                                     │  │  HPI: _______________   │  │
│  │                                     │  │                          │  │
│  │  ┌─────────┐  ┌─────────┐           │  │  [O] ตรวจร่างกาย         │  │
│  │  │ 🎤 Mute │  │ 📹 Cam  │  💬 Chat  │  │  VS: BP ___  HR ___     │  │
│  │  └─────────┘  └─────────┘           │  │  PE: _______________    │  │
│  └─────────────────────────────────────┘  │                          │  │
│                                           │  [A] วินิจฉัย            │  │
│  ┌─────────────────────────────────────┐  │  Dx: E11.9 DM Type 2    │  │
│  │  🤖 AI Assistant                    │  │                          │  │
│  │  ─────────────────────────────────  │  │  [P] แผนการรักษา         │  │
│  │  💬 "มีอะไรให้ช่วยครับ?"             │  │  • Continue Metformin   │  │
│  │  ┌─────────────────────────────┐   │  │  • Diet control         │  │
│  │  │ พิมพ์ข้อความ...        [ส่ง]│   │  │  • F/U 3 months         │  │
│  │  └─────────────────────────────┘   │  │                          │  │
│  │                                     │  │  [🤖 AI สรุป EMR]        │  │
│  │  📎 แนบไฟล์ Lab/PDF                 │  │  [💾 บันทึก] [✅ ลงนาม]   │  │
│  └─────────────────────────────────────┘  └──────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```


### Meeting Features (Phase 1)

| Feature | Status | Description |
| --------- | -------- | ------------- |
| Video Call (Jitsi) | ✅ | Doctor as HOST, patient in lobby |
| Audio/Video Controls | ✅ | Mute, camera toggle |
| Text Chat | ✅ | In-meeting chat |
| Screen Share | ✅ | Share screen for education |
| Recording | 🚧 | Record to GCS |
| Transcription | 🚧 | Device Speech-to-Text |
| EMR Editor | ✅ | SOAP format documentation |
| AI Chat Assistant | ✅ | Side panel AI help |
| Document Upload | ✅ | Lab/PDF for AI analysis |


### Post-Meeting Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ สิ้นสุดการประชุม                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📋 สรุป EMR                                    🟡 รอตรวจสอบ       │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  AI สรุป:                                                         │   │
│  │  "ผู้ป่วยเบาหวาน type 2 มาติดตามผล HbA1c ดีขึ้น (7.1%)             │   │
│  │   ควบคุมอาหารได้ดี ไม่มีอาการ hypoglycemia..."                     │   │
│  │                                                                    │   │
│  │  [✏️ แก้ไข]  [✅ อนุมัติ]  [❌ ปฏิเสธ]                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📄 คำแนะนำผู้ป่วย (Patient Instruction)        🟡 รอตรวจสอบ       │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  AI สร้าง:                                                        │   │
│  │  "คำแนะนำหลังพบแพทย์                                               │   │
│  │   1. รับประทานยา Metformin 500mg วันละ 2 ครั้ง หลังอาหาร          │   │
│  │   2. ควบคุมอาหาร ลดแป้ง น้ำตาล                                    │   │
│  │   3. ออกกำลังกาย 30 นาที/วัน..."                                  │   │
│  │                                                                    │   │
│  │  [✏️ แก้ไข]  [✅ อนุมัติ & ส่ง]  [❌ ไม่ส่ง]                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  💊 ใบสั่งยา (Prescription)                                       │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  • Metformin 500mg #60 - 1x2 หลังอาหาร                           │   │
│  │  • Losartan 50mg #30 - 1x1 เช้า                                  │   │
│  │                                                                    │   │
│  │  [✏️ แก้ไขยา]  [🖨️ พิมพ์]  [✅ ยืนยัน]                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [📅 นัดหมายถัดไป]  [เสร็จสิ้น]                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```


### Man-in-the-Loop Validation Flow

```text
1. AI generates content (EMR summary, patient instructions)
2. Content shows 

… *(ตัด — ดูต้นฉบับ)*

#### 6. เนื้อหาทางการแพทย์ (Medical Content)

**Route:** `/medical-content`
**Access:** Doctor, Admin
**Component:** `MedicalContent.tsx`


### Purpose (6)

Health education articles for patients. Doctors create, admin approves before publishing.


### UI Layout (4)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📚 เนื้อหาทางการแพทย์                               [+ สร้างบทความใหม่]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ทั้งหมด] [เผยแพร่แล้ว] [รอตรวจสอบ (3)] [แบบร่าง] [ปฏิเสธ]             │
│                                                                          │
│  🔍 ค้นหา...                    [หมวดหมู่ ▼] [เรียงตาม ▼]                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📄 การดูแลสุขภาพหัวใจ                                 🟢 เผยแพร่  │   │
│  │  Heart Health Care                                                │   │
│  │  หมวด: cardiovascular | 👁️ 150 views | ✍️ DOC-SPECIALIST-001     │   │
│  │  [👁️ ดู] [✏️ แก้ไข] [🗑️ ลบ]                                       │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  📄 การจัดการโรคเบาหวาน                               🟡 รอตรวจสอบ │   │
│  │  Diabetes Management                                              │   │
│  │  หมวด: endocrinology | ✍️ DOC-TEST-001                           │   │
│  │  [👁️ ดู] [✏️ แก้ไข] [Admin: ✅/❌]                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```


### Content Workflow

```text
1. Doctor creates article (Draft)
2. Doctor submits for review → Status: Pending
3. Admin reviews content
4. Admin: Approve → Status: Published (visible to patients)
   Admin: Reject → Status: Rejected (with feedback)
5. Published content syncs to Patient Portal health library
```

---

#### 9. อนุมัติแพทย์ใหม่ (Approve New Doctors) - Admin Only

**Route:** `/admin/pending-doctors`
**Access:** Admin only
**Component:** `PendingDoctorApproval.tsx`


### Purpose (9)

Review and approve/reject new doctor registration requests.


### UI Layout (6)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ✅ อนุมัติแพทย์ใหม่                                      🔴 รอดำเนินการ: 2│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  👤 นพ. ใหม่ ลงทะเบียน                              📅 20/01/2026   │   │
│  │  ───────────────────────────────────────────────────────────────  │   │
│  │  📧 new.doctor@hospital.com                                       │   │
│  │  🏥 โรงพยาบาลรัฐ                                                  │   │
│  │  🔬 อายุรศาสตร์                                                   │   │
│  │  📜 ใบอนุญาต: กว. 12345                                          │   │
│  │  📄 เอกสารแนบ: [ใบปริญญา.pdf] [ใบอนุญาต.pdf]                      │   │
│  │                                                                    │   │
│  │  [👁️ ดูรายละเอียด]  [✅ อนุมัติ]  [❌ ปฏิเสธ]                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```


### Approval Workflow

```text
1. New doctor registers via Doctor Portal
2. Status: Pending → appears in admin queue
3. Admin reviews:
   - Credentials
   - License documents
   - Hospital affiliation
4. Admin decides:
   a. [✅ อนุมัติ] → Status: Approved, doctor can login
   b. [❌ ปฏิเสธ] → Status: Rejected, with reason
5. Doctor receives email notification
```

---

#### 2. นัดหมาย (Appointments)

**Route:** `/appointments`
**Access:** Patient
**Component:** `PatientAppointments.tsx`


### Purpose (11)

View, book, and manage appointments.


### UI Layout (8)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  📅 นัดหมาย                                           [+ นัดหมายใหม่]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [ทั้งหมด] [ที่จะถึง] [เสร็จสิ้น] [ยกเลิก]                               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📅 21 ม.ค. 2026 | 09:00                           🟢 ยืนยันแล้ว   │   │
│  │  ──────────────────────────────────────────────────────────────  │   │
│  │  👨‍⚕️ นพ. ทดสอบ ระบบ                                               │   │
│  │  🏥 Izara Medical Center | อายุรศาสตร์                            │   │
│  │  📍 Telehealth                                                    │   │
│  │  📝 อาการ: ปวดหัว ไข้ต่ำ                                           │   │
│  │                                                                    │   │
│  │  [ดูรายละเอียด]  [เข้าห้องประชุม]  [เลื่อนนัด]  [ยกเลิก]             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  📅 14 ม.ค. 2026 | 10:00                           ✅ เสร็จสิ้น    │   │
│  │  ──────────────────────────────────────────────────────────────  │   │
│  │  👨‍⚕️ นพ. ทดสอบ ระบบ                                               │   │
│  │  วินิจฉัย: J00 หวัด                                               │   │
│  │                                                                    │   │
│  │  [ดู EMR สรุป]  [ดูคำแนะนำ]  [นัดติดตาม]                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```


### Book New Appointment Flow

```text
1. Patient clicks [+ นัดหมายใหม่]
2. Step 1: Select specialty/doctor
3. Step 2: Select date/time from available slots
4. Step 3: Describe symptoms
5. Step 4: Select appointment type (Telehealth/In-person)
6. Step 5: Confirm & submit
7. Status: Pending → waiting for doctor confirmation
8. When confirmed: Patient receives notification + meeting link
```

---

#### Dark Mode Implementation

### How It Works

1. **Settings Storage:** Theme preference is stored in `localStorage` as `patient-portal-theme` with values `'light'` or `'dark'`
2. **CSS Class Toggle:** When dark mode is enabled, the `html` element receives the class `dark`
3. **Tailwind Dark Mode:** Uses Tailwind's `class` strategy for dark mode with CSS overrides in `index.css`


### Dark Mode Requirements

All UI components MUST support dark mode. This includes:

| Component Type | Light Mode | Dark Mode |
| ---------------- | ------------ | ----------- |
| **Cards/Boxes** | `bg-white border-gray-100` | `bg-slate-800 border-slate-700` |
| **Text - Primary** | `text-slate-900` | `text-slate-100` |
| **Text - Secondary** | `text-gray-600` | `text-slate-400` |
| **Input Fields** | `bg-white border-gray-300` | `bg-slate-700 border-slate-600` |
| **Buttons (Primary)** | Standard teal/blue | Same with adjusted hover |
| **Modals/Popups** | White background | `bg-slate-800` |
| **Navigation** | Light sidebar | Dark sidebar |


### Implementation Pattern

```tsx
// Use the useSettings hook to get dark mode state
const { isDarkMode } = useSettings();

// Apply conditional classes
<div className={`rounded-xl border ${
  isDarkMode
    ? 'bg-slate-800 border-slate-700 text-slate-100'
    : 'bg-white border-gray-100 text-slate-900'
}`}>
  Content here
```


### CSS Override Rules (index.css)

The `index.css` file contains comprehensive dark mode overrides using the `html.dark` selector:

```css
/* Force dark backgrounds on dynamically styled elements */
html.dark .bg-white {
  background-color: rgb(30 41 59) !important; /* slate-800 */
}

html.dark [class*="bg-gradient-to-"] {
  background: linear-gradient(to br, rgb(30 41 59), rgb(51 65 85)) !important;
}
```

#### Language/Internationalization (i18n)

### Supported Languages

| Language | Code | Storage Key |
| ---------- | ------ | ------------- |
| Thai | `th` | Default |
| English | `en` | Option |


### How It Works (2)

1. **Settings Storage:** Language preference is stored in `localStorage` as `patient-portal-language`
2. **Translation Function:** The `t(key)` function from `SettingsContext` returns the translated string
3. **Fallback:** If a translation key is missing, the key name is returned


### Translation Keys Structure

```tsx
const translations = {
  th: {
    'dashboard.hello': 'สวัสดี',
    'dashboard.upcomingAppointments': 'นัดหมายที่จะถึง',
    'booking.title': 'นัดหมายปรึกษาแพทย์',
    'phr.vitalSigns': 'สัญญาณชีพ',
    // ... more keys
  },
  en: {
    'dashboard.hello': 'Hello',
    'dashboard.upcomingAppointments': 'Upcoming Appointments',
    'booking.title': 'Book Medical Consultation',
    'phr.vitalSigns': 'Vital Signs',
    // ... more keys
  }
};
```


### Implementation Pattern (2)

```tsx
// Use the useSettings hook to get translation function
const { t, language } = useSettings();

// Use t() function for all user-facing text
<h2 className="text-xl font-bold">
  {t('dashboard.hello')}, {userName}
</h2>

<button>
  {t('booking.next')}
</button>
```


### Required Translation Keys by Page

| Page | Required Keys |
| ------ | --------------- |
| **Dashboard** | `dashboard.hello`, `dashboard.upcomingAppointments`, `dashboard.quickActions` |
| **Booking** | `booking.title`, `booking.symptoms`, `booking.next`, `booking.confirm` |
| **PHR** | `phr.vitalSigns`, `phr.medications`, `phr.allergies`, `phr.conditions` |
| **Library** | `library.title`, `library.search`, `library.categories` |
| **Timeline** | `timeline.title`, `timeline.year`, `timeline.appointment` |
| **PDPA/Living Will** | `pdpa.consent`, `livingWill.title`, `livingWill.signature` |
| **Map** | `map.title`, `map.search`, `map.nearbyHospitals` |
| **Settings** | `settings.title`, `settings.theme`, `settings.language` |

---

### FULL_WORKFLOW_CONTRACT.md

**ต้นฉบับ:** [`Processes/FULL_WORKFLOW_CONTRACT.md`](../../Processes/FULL_WORKFLOW_CONTRACT.md)

#### Residual notes

1. **Deploy** — Meeting BYTEA + portal recording-order fixes require `npm run cloud:deploy` before cloud Q02 passes against live code.
2. **Headed browsers** — Default `Workers=1` in hardening script avoids parallel headed launch failures on Windows.
3. **gate0** — API chain may fail while UI pipeline passes; both are logged in the ledger.

---

### TWO_ROUND_CLOUD_TESTING.md

**ต้นฉบับ:** [`Processes/TWO_ROUND_CLOUD_TESTING.md`](../../Processes/TWO_ROUND_CLOUD_TESTING.md)

#### Round 1 — Deploy + API / smoke

1. Deploy all services:
   ```powershell
   cd Isara-Anywhere
   .\scripts\deploy-cloud-from-env.ps1 -Tag v1.7.12
   ```
2. Post-deploy smoke:
   ```powershell
   .\scripts\deploy-cloud-from-env.ps1 -SmokeOnly
   node scripts/verify-cloud-appointment-sync.mjs
   ```
3. Meeting API checks:
   - `GET /health` — meeting server
   - `GET /api/meetings/{appointmentId}/join-config?role=doctor` (with doctor JWT)
   - `GET /api/meetings/{appointmentId}/host-ready`
   - URLs must include `requireDisplayName=false`, `enableLobby=false`

---

### Living_Will_Implementation_Plan.md

**ต้นฉบับ:** [`Processes/Living_Will_Implementation_Plan.md`](../../Processes/Living_Will_Implementation_Plan.md)

#### 3. Testing Plan

### 3.1. Unit Tests

| Test Case | Expected Result |
| ----------- | ----------------- |
| Create Living Will | Success, saved to GCS |
| Update Living Will | Success, version incremented |
| Revoke Living Will | Status changed to revoked |
| Share Living Will | isSharedWithDoctors = true |
| Unshare Living Will | isSharedWithDoctors = false |
| Doctor access (shared) | Returns full Living Will |
| Doctor access (not shared) | Returns { exists: true, isShared: false } |
| Doctor access (no history) | Returns 403 error |
| Admin access (shared) | Returns full Living Will |


### 3.2. E2E Tests

**File:** `scripts/tests/e2e/livingWillTests.cjs`

Scenarios:

1. Patient creates Living Will with sharing enabled
2. Patient updates Living Will
3. Patient revokes sharing
4. Doctor views shared Living Will
5. Doctor cannot view unshared Living Will
6. Admin views shared Living Will

---

---

## การสร้างเอกสารใหม่

```bash
python scripts/build-appendix-process-steps.py
```
